/**
 * GET /api/admin/contacts/export — the contact book as a CSV file (U34a, S10 2026-10-02).
 *
 * ⛔ THIN ON PURPOSE. Every decision is `contactsExportDoor` in `src/lib/server/contacts/export.ts`, where
 * `test:contacts-export` drives it in-process: GET only and never a cross-site request — asked before the session is read
 * — then a session, then the viewer decided on the STORED role row (`contactsExportViewer`; ⛔ never the cookie's role —
 * a demotion never reaches an already-minted cookie, W25), then the second factor (`checkAdminTotp`: a direct GET skips
 * the admin layout's TOTP gate, so the door asks itself, as every sibling under /api/admin does). ⛔ A stranger's every
 * failure is the SAME answer — the identical 404 that serves nothing (Next renders its own page for an unrouted path, so
 * the shape is not a secret; the protection is that nothing is served).
 * ⭐ vb7 · AN OFFICER IS NEVER LEFT ON A BARE TEXT PAGE. The export control is a plain link, so a refusal used to replace
 * the console with one line of text, and a lapsed 2-step sign-in read "Not Found". Now a lapsed second factor goes to the
 * step-up page (which returns to the list for this filter), and a refused download comes back to the list with its reason
 * (`?export=`), each as a 303 to the PUBLIC host — on Railway `req.url` is the container's (see `auth/session-ended`).
 * This file turns the door's answer into a response and reads no store of its own.
 * ⭐ vb7 (review m8) · the door's dependencies — the session, the viewer, the REAL second factor, the export — are ONE
 * frozen object (`CONTACTS_EXPORT_DOOR_DEPS`, `export-door-deps.ts`) that the suite drives as the route runs it (V9).
 *
 * Guard: `npm run test:contacts-export` (the door is its V6–V9, executed; this file's shape is V6).
 */
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { contactsExportDoor } from "@/lib/server/contacts/export";
import { CONTACTS_EXPORT_DOOR_DEPS } from "@/lib/server/contacts/export-door-deps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The ONE answer to a stranger — identical, serving nothing. */
const notFound = () => new NextResponse("Not Found", { status: 404 });

/** The public origin the officer's browser is on — never the host in `req.url`. */
async function publicBase(req: NextRequest): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = h.get("host") ?? h.get("x-forwarded-host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const door = await contactsExportDoor({ method: req.method, url: req.url, secFetchSite: req.headers.get("sec-fetch-site") }, CONTACTS_EXPORT_DOOR_DEPS);
  if (door.kind === "response") return door.response;
  // ⛔ A 303 only ever to this console's own pages: the door builds every address from constants — this is the belt.
  if (door.kind === "not_found" || !door.to.startsWith("/admin/")) return notFound();
  const res = NextResponse.redirect(`${await publicBase(req)}${door.to}`, 303);
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}
