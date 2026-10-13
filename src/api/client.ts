import type { ApiFailure } from "../../shared/site-api.ts";
export class ApiError extends Error {
  status: number;
  code: ApiFailure["error"];
  constructor(status: number, code: ApiFailure["error"]) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
type Options = {
  method?: string;
  body?: unknown;
  csrfToken?: string;
  keepalive?: boolean;
};
const codes = new Set<ApiFailure["error"]>([
  "invalid_input",
  "unauthorized",
  "forbidden",
  "rate_limited",
  "unavailable",
  "conflict",
]);
export function createApiClient(base: string, fetcher: typeof fetch = fetch) {
  return async function request<T>(
    path: string,
    options: Options = {},
  ): Promise<T> {
    if (!base || !path.startsWith("/v1/"))
      throw new ApiError(503, "unavailable");
    const headers: Record<string, string> = {};
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    if (options.csrfToken) headers["X-CSRF-Token"] = options.csrfToken;
    let response: Response;
    try {
      response = await fetcher(`${base.replace(/\/$/, "")}${path}`, {
        method: options.method ?? "GET",
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: /^\/v1\/(auth|admin)\//.test(path) ? "include" : "omit",
        signal: AbortSignal.timeout(10000),
        keepalive: options.keepalive,
      });
    } catch {
      throw new ApiError(503, "unavailable");
    }
    if (!response.ok) {
      let code: ApiFailure["error"] = "unavailable";
      try {
        const data = await response.json();
        if (codes.has(data.error)) code = data.error;
      } catch {}
      throw new ApiError(response.status, code);
    }
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(503, "unavailable");
    }
  };
}
export const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
export const apiRequest = createApiClient(apiBase);
