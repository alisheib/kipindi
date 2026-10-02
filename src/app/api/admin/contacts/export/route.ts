/**
 * GET /api/admin/contacts/export — the contact book as a CSV file (U34a, S10 2026-10-02).
 *
 * ⛔ THIN ON PURPOSE. Three questions, in this order, and every failure is the SAME answer — the identical 404 that
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
import { contactsExportViewer, exportContactsCsv, exportParamsOf } from "@/lib/server/contacts/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await currentSession();
  const viewer = await contactsExportViewer(session);
  if (!session || !viewer) return new NextResponse("Not Found", { status: 404 });
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") return new NextResponse("Not Found", { status: 404 });
  return exportContactsCsv({ viewer, params: exportParamsOf(new URL(req.url)), now: Date.now() });
}
