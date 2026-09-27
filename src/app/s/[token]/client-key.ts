import { headers } from "next/headers";

/**
 * The address `/s/`'s budget is charged to — the page's GET and both acts share it, so a walker cannot
 * spend its guesses on one and its acts on the other.
 *
 * ⚠️ The FIRST `x-forwarded-for` entry, the same reading every other per-IP bucket on this platform uses
 * (`api/pv`, `api/client-error`). Whether Railway's edge REPLACES that header or APPENDS to one the client
 * sent is unverified; if it appends, the first entry is client-chosen and this bucket can be sidestepped —
 * which is why the service also caps each link's acts on its own key.
 *
 * ⛔ Not in `actions.ts`: every export of a `"use server"` file is a callable server action, and this is
 * a read of the request, not something a browser should be able to invoke.
 */
export async function optOutClientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
