import type { AnalyticsKind, EventInput } from "../../shared/site-api.ts";
export type TrackerEnvironment = {
  storage: Pick<Storage, "getItem" | "setItem">;
  now: () => number;
  uuid: () => string;
  allowed: () => boolean;
  pathname: () => string;
  referrer: () => string;
  origin: string;
  send: (event: EventInput) => Promise<void>;
};
const visitorKey = "shelfsmart:analytics:visitor:v1",
  sessionKey = "shelfsmart:analytics:session:v1";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stored(value: string | null): Record<string, unknown> | null {
  try {
    const result = JSON.parse(value ?? "null");
    return result && typeof result === "object" ? result : null;
  } catch {
    return null;
  }
}
function externalHost(referrer: string, origin: string): string | null {
  try {
    const url = new URL(referrer),
      own = new URL(origin).hostname,
      host = url.hostname;
    if (
      !["http:", "https:"].includes(url.protocol) ||
      host === own ||
      host === `www.${own}` ||
      /^[\d.]+$/.test(host) ||
      host.includes(":")
    )
      return null;
    return host.replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}
export function createTracker(env: TrackerEnvironment) {
  let ephemeral: { id: string; lastSeen: number } | undefined;
  return {
    track(kind: AnalyticsKind): void {
      try {
        if (!env.allowed() || /^\/admin(?:\/|$)/.test(env.pathname())) return;
        const now = env.now();
        let visitorId: string | null = null,
          sessionId: string;
        try {
          const visitor = stored(env.storage.getItem(visitorKey));
          const fresh =
            visitor &&
            typeof visitor.id === "string" &&
            uuidPattern.test(visitor.id) &&
            typeof visitor.createdAt === "number" &&
            visitor.createdAt <= now &&
            now - visitor.createdAt < 30 * 86400000;
          visitorId = fresh ? (visitor.id as string) : env.uuid();
          if (!fresh)
            env.storage.setItem(
              visitorKey,
              JSON.stringify({ id: visitorId, createdAt: now }),
            );
          // Reading for every event also observes changes made by another tab.
          const session = stored(env.storage.getItem(sessionKey));
          const active =
            fresh &&
            session &&
            typeof session.id === "string" &&
            uuidPattern.test(session.id) &&
            typeof session.lastSeen === "number" &&
            session.lastSeen <= now &&
            now - session.lastSeen < 30 * 60000;
          sessionId = active ? (session.id as string) : env.uuid();
          env.storage.setItem(
            sessionKey,
            JSON.stringify({ id: sessionId, lastSeen: now }),
          );
        } catch {
          visitorId = null;
          if (!ephemeral || now - ephemeral.lastSeen >= 30 * 60000)
            ephemeral = { id: env.uuid(), lastSeen: now };
          ephemeral.lastSeen = now;
          sessionId = ephemeral.id;
        }
        const event: EventInput = {
          id: env.uuid(),
          kind,
          visitorId,
          sessionId,
          referrerHost: externalHost(env.referrer(), env.origin),
        };
        void env
          .send(event)
          .catch(() => env.send(event))
          .catch(() => {});
      } catch {
        /* Metrics must never interrupt the textbook or an external link. */
      }
    },
  };
}
