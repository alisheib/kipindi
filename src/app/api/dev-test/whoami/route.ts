/**
 * /api/dev-test/whoami — dev-only diagnostic that reports the current
 * session's user, role, status, and whether their phone matches the
 * ADMIN_BOOTSTRAP_PHONES env list. Lets the operator confirm in one
 * call whether their bootstrap-admin setup actually wired up.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   GET → { ok, session, user, isInBootstrapList, bootstrapList }
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const session = await currentSession();
  const bootstrapList = (process.env.ADMIN_BOOTSTRAP_PHONES ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);

  if (!session) {
    return NextResponse.json({
      ok: false,
      reason: "no_session",
      message: "You're not signed in. Sign in first, then hit this endpoint.",
      bootstrapList,
      bootstrapListCount: bootstrapList.length,
    });
  }

  const user = db.user.findById(session.userId);
  const phone = session.phoneE164;
  const isInBootstrapList = bootstrapList.includes(phone);

  return NextResponse.json({
    ok: true,
    session: {
      userId: session.userId,
      phoneE164: session.phoneE164,
      sessionRole: session.role,
    },
    user: user
      ? {
          id: user.id,
          phoneE164: user.phoneE164,
          dbRole: user.role,
          status: user.status,
          createdAt: user.createdAt,
        }
      : null,
    isInBootstrapList,
    bootstrapList,
    bootstrapListCount: bootstrapList.length,
    diagnosis:
      !user
        ? "Session exists but user not found in store. Sign out and back in."
        : isInBootstrapList && user.role === "ADMIN"
          ? "OK — phone is in ADMIN_BOOTSTRAP_PHONES and user is ADMIN."
          : isInBootstrapList && user.role !== "ADMIN"
            ? "Phone IS in ADMIN_BOOTSTRAP_PHONES but role is " + user.role +
              ". Bootstrap only fires at REGISTRATION time — you registered " +
              "before the env var was set. Hit POST /api/dev-test/promote-admin " +
              "with this phone to fix it (no re-register needed)."
            : !isInBootstrapList
              ? "Phone NOT in ADMIN_BOOTSTRAP_PHONES. Add '" + phone +
                "' (exact E.164 with the +) to that env var, restart the dev " +
                "server, then either re-register OR hit POST /api/dev-test/promote-admin."
              : "Unknown state",
  });
}
