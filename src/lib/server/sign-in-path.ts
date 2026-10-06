import { headers } from "next/headers";
import { isAdminPath, returnPathFrom } from "@/lib/safe-next";

/**
 * Route audit B2 (2026-10-06): a Server Action is POSTed to its page's address, and proxy.ts stamps that address (path + query)
 * on every request as `x-href`, so the sign-in door can name the page. A console page gets the staff door, as at the edge.
 * With no request scope the door is bare, as before. Call it ONLY on a no-session branch.
 */
export async function signInPathForAction(): Promise<string> {
  let back = "";
  try { back = returnPathFrom((await headers()).get("x-href") ?? ""); } catch { /* no request scope */ }
  if (!back || back === "/") return "/auth/login";
  return `${isAdminPath(back) ? "/auth/admin" : "/auth/login"}?next=${encodeURIComponent(back)}`;
}
