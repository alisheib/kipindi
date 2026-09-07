/**
 * /api/admin/agent-doc?app=<applicationId>&type=<AgentDocType>
 *
 * Streams one agent-application document to a compliance officer. Same gate as the KYC
 * document route it mirrors: compliance domain re-checked HERE (middleware cannot see roles),
 * step-up 2FA re-checked HERE (a direct GET skips the admin layout), never cached, fetched by
 * (applicationId, docType) so there is no client-supplied path, and every view is AUDITED —
 * two of the eight slots are a third party's national ID.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { canAct } from "@/lib/server/rbac";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { readKycDocument } from "@/lib/server/storage";
import { ALL_DOC_SLOTS } from "@/lib/server/agent-application-service";
import type { AgentDocType } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  const me = await db.user.findById(session.userId);
  if (!me || !(me.role === "ADMIN" || (await canAct(me.role, "compliance")))) {
    audit({ category: "SECURITY", action: "agent_doc.forbidden", actorId: session.userId, targetType: "Action", targetId: "agent-doc", payload: { role: me?.role ?? "unknown", domain: "compliance" } });
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") {
    return NextResponse.json({ ok: false, error: "Two-factor verification required" }, { status: 403 });
  }
  const url = new URL(req.url);
  const appId = (url.searchParams.get("app") ?? "").trim();
  const type = (url.searchParams.get("type") ?? "").trim() as AgentDocType;
  if (!appId || !(ALL_DOC_SLOTS as readonly string[]).includes(type)) return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  const doc = await db.agentApplicationDoc.findSlot(appId, type);
  if (!doc || doc.purgedAt) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const img = await readKycDocument(doc.storageKey);
  if (!img) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  audit({ category: "COMPLIANCE", action: "agent_doc.viewed", actorId: session.userId, targetType: "AgentApplication", targetId: appId, payload: { docType: type, thirdParty: doc.thirdParty, bytes: img.bytes.length } });
  return new NextResponse(new Uint8Array(img.bytes), {
    status: 200,
    headers: { "Content-Type": img.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
