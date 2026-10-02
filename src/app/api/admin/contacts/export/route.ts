/**
 * GET /api/admin/contacts/export — the contact book as a CSV file (U34a, S10 2026-10-02).
 *
 * ⛔ THIN ON PURPOSE. A gate, then three questions, in this order, and every failure is the SAME answer — the identical
 * 404 that
 * serves nothing (Next renders its own page for an unrouted path, so the shape is not a secret; the protection is
 * that nothing is served):
 *   1. a session at all;
 *   2. the viewer, decided on the STORED role row (`contactsExportViewer`): a staff role that may view the contacts
 *      page's own domain, and that role's `identity.contact` cell. ⛔ Never the cookie's role — a demotion never
 *      reaches an already-minted cookie (W25), which is the transactions export's residual and is not copied here;
 *   3. the second factor (`checkAdminTotp`): a direct GET skips the admin layout's TOTP gate, so the route asks itself,
 *      as every sibling under /api/admin does.
 * Everything after that — the filter, the role rule, the ceiling, the audit rows written BEFORE the first byte, the
 * stream — is `exportContactsCsv` in `src/lib/server/contacts/export.ts`, where the suite runs it. This file reads no
 * store of its own.
 *
 * Guard: `npm run test:contacts-export` (the route's shape is its §V6).
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { contactsExportViewer, exportContactsCsv, exportParamsOf, exportRequestAllowed } from "@/lib/server/contacts/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The ONE answer to every refusal — identical, serving nothing. */
const notFound = () => new NextResponse("Not Found", { status: 404 });

export async function GET(req: Request) {
  // ⛔ THE GATE, before anything is read (U34a review): GET only — Next answers HEAD by running this handler and dropping
  // the body, so a probe would write the reveal rows for a file that never left — and never a cross-site request: a link
  // on any site could otherwise make a signed-in officer's browser write a bulk-reveal row in their name.
  if (req.method !== "GET" || !exportRequestAllowed(req.headers.get("sec-fetch-site"))) return notFound();
  const session = await currentSession();
  const viewer = await contactsExportViewer(session);
  if (!session || !viewer) return notFound();
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") return notFound();
  return exportContactsCsv({ viewer, params: exportParamsOf(new URL(req.url)), now: Date.now() });
}
