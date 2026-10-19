/**
 * GET /api/admin/maswali/evidence/[weekId]?part=pack|tickets — one final Millionea week's evidence (MASWALI-BUILD S6,
 * MB-92): the pack (JSON) or its ticket CSV, whose SHA-256 the pack names.
 *
 * ⛔ A THIN ROUTE (S6 review R2-5): every decision — the export gate, the viewer on the STORED role by the evidence page's
 *    own domain, the second factor, a final week only, the record before the file — is the door's
 *    (`maswali-evidence-door.ts`), driven by behaviour in `test:maswali-evidence`. This maps its answer to a response.
 */
import { NextResponse } from "next/server";
import { maswaliEvidenceDoor, MASWALI_EVIDENCE_DOOR_DEPS } from "@/lib/server/maswali-evidence-door";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params;
  const r = await maswaliEvidenceDoor({ method: req.method, url: req.url, secFetchSite: req.headers.get("sec-fetch-site"), weekId }, MASWALI_EVIDENCE_DOOR_DEPS);
  if (r.kind === "not_found") return new NextResponse("Not Found", { status: 404 });
  if (r.kind === "not_final") {
    return new NextResponse(r.error, { status: 409, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  // ⛔ The record of this export could not be written: nothing is handed over.
  if (r.kind === "unrecorded") return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(r.body, {
    status: 200,
    headers: {
      "Content-Type": r.contentType,
      "Content-Disposition": `attachment; filename="${r.fileName}"`,
      "Cache-Control": "no-store",
      "X-Evidence-Sha256": r.sha256,
    },
  });
}
