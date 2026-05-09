/**
 * /api/dev-test/promote-admin — dev-only endpoint to mark a registered
 * user as ADMIN. Used by the demo-admin-functional test so we can
 * exercise admin-only pages without needing ADMIN_BOOTSTRAP_PHONES set.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 * POST body: { phone: "+255712345678" }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = await req.json().catch(() => null) as { phone?: string } | null;
  if (!body?.phone) {
    return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });
  }
  const user = db.user.findByPhone(body.phone);
  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }
  db.user.update(user.id, { role: "ADMIN", status: "ACTIVE" });
  audit({
    category: "SECURITY",
    action: "dev_test.admin_promotion",
    actorId: null,
    targetType: "User",
    targetId: user.id,
    payload: { phone: body.phone, by: "dev-test-endpoint" },
  });
  return NextResponse.json({ ok: true, userId: user.id, role: "ADMIN" });
}
