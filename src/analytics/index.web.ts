import type { AnalyticsKind } from "../../shared/site-api";
import { createTracker } from "./core";
import { apiBase, apiRequest } from "../api/client";
let tracker: ReturnType<typeof createTracker> | undefined;
export function track(kind: AnalyticsKind): void {
  if (!apiBase || typeof window === "undefined") return;
  try {
    tracker ??= createTracker({
      storage: {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      },
      now: Date.now,
      uuid: () => window.crypto.randomUUID(),
      allowed: () =>
        navigator.doNotTrack !== "1" &&
        !(navigator as Navigator & { globalPrivacyControl?: boolean })
          .globalPrivacyControl,
      pathname: () => window.location.pathname,
      referrer: () => document.referrer,
      origin: window.location.origin,
      send: (event) =>
        apiRequest<void>("/v1/events", {
          method: "POST",
          body: event,
          keepalive: true,
        }),
    });
    tracker.track(kind);
  } catch {}
}
