export type Period = "today" | "7d" | "30d";
export type FeedbackStatus = "new" | "read" | "archived";
export type AnalyticsKind = "page_view" | "book_open" | "boosty_click";
export type EventInput = {
  id: string;
  kind: AnalyticsKind;
  visitorId: string | null;
  sessionId: string;
  referrerHost: string | null;
};
export type FeedbackInput = {
  id: string;
  message: string;
  name?: string;
  email?: string;
  website?: string;
};
export type FeedbackMessage = {
  id: string;
  message: string;
  name: string | null;
  email: string | null;
  status: FeedbackStatus;
  createdAt: string;
};
export type FeedbackPage = {
  items: FeedbackMessage[];
  nextCursor: string | null;
};
export type Counts = {
  visitors: number;
  visits: number;
  bookOpens: number;
  boostyClicks: number;
  boostyVisitors: number;
  boostyConversion: number | null;
};
export type DashboardData = {
  period: Period;
  timezone: "Asia/Makassar";
  totals: Counts;
  days: ({ date: string } & Counts)[];
  sources: { host: string; visits: number }[];
};
export type AdminSession = {
  username: string;
  csrfToken: string;
  expiresAt: string;
};
export type ApiFailure = {
  error:
    | "invalid_input"
    | "unauthorized"
    | "forbidden"
    | "rate_limited"
    | "unavailable"
    | "conflict";
};
