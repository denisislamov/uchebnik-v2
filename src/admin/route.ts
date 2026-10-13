export function adminRoute(pathname: string): "login" | "reset" | null {
  if (/^\/admin\/?$/.test(pathname)) return "login";
  if (/^\/admin\/reset\/?$/.test(pathname)) return "reset";
  return null;
}
