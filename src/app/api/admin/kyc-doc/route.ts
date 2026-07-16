/**
 * /api/admin/kyc-doc?user=<userId>&type=<NIDA_FRONT|NIDA_BACK|SELFIE>
 *
 * Streams a player's KYC document image to a compliance officer for review.
 * Same gate as every /admin/* surface: ADMIN/COMPLIANCE/MODERATOR only (role
 * re-checked here — middleware can't see roles). Sensitive ID imagery, so:
 *   - never cached (private, no-store)
 *   - the document is fetched by (userId, docType) — no client-supplied path,
 *     so there's no traversal / IDOR beyond what an officer may already see
 *   - each view is audited (who looked at whose document)
 *
 * Documents are read through the storage seam (`readKycDocument`, audit H8):
 * INLINE base64 data URLs today, Cloudflare R2 objects once configured — this
 * route is unchanged either way.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { readKycDocument } from "@/lib/server/storage";

const ADMIN_ROLES = COMPLIANCE_ROLES; // role tier — see @/lib/server/roles
const DOC_TYPES = new Set(["NIDA_FRONT", "NIDA_BACK", "SELFIE"]);

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  const me = await db.user.findById(session.userId);
  if (!me || !ADMIN_ROLES.has(me.role)) {
    audit({ category: "SECURITY", action: "kyc_doc.forbidden", actorId: session.userId, targetType: "Action", targetId: "kyc-doc", payload: { role: me?.role ?? "unknown" } });
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  // Step-up 2FA (audit finding B3): the admin layout enforces TOTP on page
  // render, but a direct GET to this URL skips the layout. Raw NIDA/selfie
  // imagery must require a satisfied TOTP cookie here too — 403 (not a redirect,
  // which would corrupt the image response).
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    audit({ category: "SECURITY", action: "kyc_doc.totp_required", actorId: session.userId, targetType: "Action", targetId: "kyc-doc", payload: {} });
    return NextResponse.json({ ok: false, error: "2FA required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = (url.searchParams.get("user") ?? "").trim();
  const docType = (url.searchParams.get("type") ?? "").trim();
  const reqId = (url.searchParams.get("req") ?? "").trim();
  // Either a fixed doc slot (?type=) or an officer-requested extra doc (?req=).
  if (!userId || (!reqId && !DOC_TYPES.has(docType))) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const kyc = await db.kyc.findByUserId(userId);
  const storageKey = reqId
    ? (kyc?.extraRequests ?? []).find((r: { id: string; storageKey: string | null }) => r.id === reqId)?.storageKey ?? null
    : kyc?.documents.find((d: { docType: string }) => d.docType === docType)?.storageKey ?? null;
  if (!storageKey) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Resolve via the storage seam — inline data URL or R2 object (H8).
  const doc = await readKycDocument(storageKey).catch(() => null);
  if (!doc) {
    // Legacy placeholder key (pre-image-upload) or an unreadable store reference.
    return NextResponse.json({ ok: false, error: "No image on file" }, { status: 404 });
  }
  const { mime, bytes } = doc;

  audit({ category: "KYC", action: "kyc_doc.viewed", actorId: session.userId, targetType: "User", targetId: userId, payload: reqId ? { req: reqId } : { docType } });

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="kyc-${reqId ? "extra" : docType.toLowerCase()}"`,
    },
  });
}
