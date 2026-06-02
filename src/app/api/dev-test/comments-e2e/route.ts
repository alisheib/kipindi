/**
 * /api/dev-test/comments-e2e — in-process end-to-end test of the market
 * discussion engine against the real store: post + validation, viewer-relative
 * flags (mine / canDelete / mod), report dedup + auto-hide at threshold,
 * hidden-visibility rules (author + mod see, public doesn't), and soft-delete.
 *
 * 404 in production. POST, no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { addComment, listComments, reportComment, deleteComment, countComments, listForModeration, restoreComment, moderationCount } from "@/lib/server/comments-store";

function mkUser(role: StoredUser["role"] = "PLAYER"): StoredUser {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  return db.user.create({
    id, phoneE164: `+25573${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "SW", displayName: null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
}

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

  try {
    const MK = `mkt_cmt_${randomId(8)}`;
    const author = mkUser();
    const mod = mkUser("MODERATOR");
    const viewer = mkUser();
    const r1 = mkUser(), r2 = mkUser(), r3 = mkUser();

    // 1 · post + validation
    const a = addComment(author.id, MK, "  Simba take this one.  ", "YES");
    ok("post succeeds", a.ok === true);
    if (!a.ok) throw new Error("post failed: " + a.error);
    ok("body trimmed", a.comment.body === "Simba take this one.", a.comment.body);
    ok("side recorded", a.comment.side === "YES");
    ok("empty body rejected", addComment(author.id, MK, "   ", null).ok === false);
    ok("over-long body rejected", addComment(author.id, MK, "x".repeat(501), null).ok === false);
    ok("unknown user rejected", addComment("usr_nope", MK, "hi", null).ok === false);

    const cid = a.comment.id;

    // 2 · viewer-relative flags
    const asViewer = listComments(MK, viewer.id).find((c) => c.id === cid)!;
    ok("viewer: not mine", asViewer.mine === false);
    ok("viewer: cannot delete", asViewer.canDelete === false);
    const asAuthor = listComments(MK, author.id).find((c) => c.id === cid)!;
    ok("author: mine + canDelete", asAuthor.mine === true && asAuthor.canDelete === true);
    const asMod = listComments(MK, mod.id).find((c) => c.id === cid)!;
    ok("moderator: canDelete", asMod.canDelete === true);

    // 3 · report dedup + auto-hide at threshold (3)
    ok("author cannot report own", reportComment(author.id, cid).ok === false);
    reportComment(r1.id, cid);
    reportComment(r1.id, cid); // duplicate — must not double count
    const afterDup = listComments(MK, mod.id).find((c) => c.id === cid)!;
    ok("report dedup (still 1)", afterDup.reports === 1, `reports=${afterDup.reports}`);
    ok("not hidden under threshold", afterDup.hidden === false);
    reportComment(r2.id, cid);
    const rr = reportComment(r3.id, cid);
    ok("auto-hidden at 3 reports", rr.ok === true && "hidden" in rr && rr.hidden === true);

    // 4 · hidden visibility — public hidden, author + mod still see
    ok("public can't see hidden", listComments(MK, viewer.id).some((c) => c.id === cid) === false);
    ok("author still sees own hidden", listComments(MK, author.id).some((c) => c.id === cid) === true);
    ok("mod still sees hidden", listComments(MK, mod.id).some((c) => c.id === cid) === true);
    ok("hidden excluded from count", countComments(MK) === 0, `count=${countComments(MK)}`);

    // 4b · moderation queue (admin) — hidden comment shows up; mod can restore
    ok("moderation queue includes the hidden comment", listForModeration().some((m) => m.id === cid));
    ok("moderationCount ≥ 1", moderationCount() >= 1);
    ok("non-mod cannot restore", restoreComment(viewer.id, cid).ok === false);
    ok("mod restores (clears hide + reports)", restoreComment(mod.id, cid).ok === true);
    ok("restored comment public again", listComments(MK, viewer.id).some((c) => c.id === cid) === true);
    ok("restored comment left the queue", listForModeration().some((m) => m.id === cid) === false);

    // 5 · soft delete
    ok("non-owner non-mod can't delete", deleteComment(viewer.id, cid).ok === false);
    ok("author can delete own", deleteComment(author.id, cid).ok === true);
    ok("deleted gone for public", listComments(MK, viewer.id).some((c) => c.id === cid) === false);

    // 6 · mod delete on a fresh comment
    const b = addComment(viewer.id, MK, "Second opinion here.", "NO");
    ok("second post ok", b.ok === true);
    if (b.ok) ok("mod deletes any comment", deleteComment(mod.id, b.comment.id).ok === true);
    ok("count back to 0", countComments(MK) === 0);
  } catch (e) {
    ok("no exception", false, String(e));
  }

  const passed = checks.filter((c) => c.pass).length;
  return NextResponse.json({ ok: passed === checks.length, passed, total: checks.length, checks });
}
