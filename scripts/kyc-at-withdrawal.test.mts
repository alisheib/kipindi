/**
 * KYC AT WITHDRAWAL — the ladder, driven; and THE QUIET RULE, as a population guard.   `npm run test:kyc-at-withdrawal`
 *
 *   Run: npx tsx scripts/kyc-at-withdrawal.test.mts
 *
 * ⭐ THE RULING (Ali, 2026-09-13 — the top 2026-09-13 entries of docs/COMPLIANCE-DECISIONS.md): identity is required
 * ONLY before WITHDRAWAL. The ladder: register → confirm email → deposit and play → verify identity → withdraw.
 *
 * ⭐ THE QUIET RULE (Ali, the same day): "we don't have to over-tell the user to verify before he withdraws … when he
 * goes to withdraw, say nicely: verify before you withdraw. Maybe on first deposit show a small notice … in a nice
 * undisturbing way. Nothing in the wrong place, everything functional, never explaining things in annoying ways."
 * So a player meets identity, unasked, in exactly two places: the withdraw screen's panel and ONE dismissible notice
 * from the first confirmed deposit. Everything else is a place they went to look, or a response to something that
 * happened in their verification.
 *
 * SECTIONS
 *   §A  the ladder through the real services, one account from registration to a withdrawal under re-verification,
 *       plus the audit stamps and where sign-up sends a new player
 *   §B  the quiet rule, discovered from `src/` and printed:
 *        1 the withdraw panel is mounted only on /wallet/withdraw and in the agent application
 *        2 the first-deposit notice is mounted only on /wallet and the deposit return page
 *        3 the app-wide identity bar is gone, file and references
 *        4 the removed nudges (receipt sentence, reminder chore, blocked-withdrawal prompt) are defined nowhere
 *        5 the notice's dictionary keys are read by the notice alone
 *        6 a never-approved player's deposit, win, cash-out and refused withdrawal add ZERO identity-worded rows/emails
 *        7 who the notice is shown to — the one server predicate, every identity state, a failed read, and the
 *          dismissal bound to the PLAYER, not the browser (2026-09-14)
 *        8 the deposit screen says nothing about identity
 *        9 a FINAL refusal outranks an earlier approval in `kycGateState` (2026-09-14)
 *       10 a wallet that is not ACTIVE is never given the withdraw form — the panel's `frozen` variant (2026-09-14)
 *
 * ⛔ EVERY §B CHECK HAS A CONTROL THAT PROVES IT CAN FAIL: a population that is printed and must be non-empty, a
 * matcher shown to fire on the shape it forbids, or an instrument shown to move on the positive case.
 * ⛔ NO `verified-fixtures` IMPORT — an unverified account is the population this suite measures.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../src/lib/server/store.ts";
import { registerWithPassword } from "../src/lib/server/auth-service.ts";
import { verifyEmailToken } from "../src/lib/server/email-verification.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket, cashOutPosition } from "../src/lib/server/market-service.ts";
import { startKyc, submitIdentityStep, attachDocument, submitForReview, reviewKyc, forceReverifyKyc } from "../src/lib/server/kyc-service.ts";
import { notifyKyc } from "../src/lib/server/notification-service.ts";
import { firstDepositNoticeDue, kycNoticeDismissValue } from "../src/lib/server/kyc-notice.ts";
import { kycGateState } from "../src/lib/kyc-gate-state.ts";
import { kycNoticeStateDue } from "../src/lib/kyc-notice.ts";
import { getAuditPage, getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { emailOutbox } from "../src/lib/server/email.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const now = () => new Date().toISOString();
const J = (x: unknown) => JSON.stringify(x);
const settle = async () => { await new Promise((r) => setTimeout(r, 300)); await auditFlush(); };
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const auditRow = (action: string, targetId: unknown) =>
  getAuditPage({ limit: 100_000 }).find((e) => e.action === action && e.targetId === targetId);
/** A real 1×1 PNG — `attachDocument` sniffs the bytes, so a fake data URL would be refused. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const OFFICER = "usr_kaw_officer";
await db.user.create({
  id: OFFICER, phoneE164: "+255745550999", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: null, region: null,
  acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);
const newMarket = (title: string) => createMarket({
  titleEn: title, titleSw: "Soko la majaribio", category: "macro", sourceUrl: "https://bot.go.tz",
  resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

// ═══ §A · THE LADDER ═════════════════════════════════════════════════════════════════════════════
section("§A · register → confirm email → deposit and play → verify identity → withdraw");
{
  const PHONE = "+255745550101", LOCAL = "745550101", EMAIL = "ladder.player@t.tz";
  let reg: unknown = null, regThrew: string | null = null;
  try {
    reg = await registerWithPassword({
      phone: PHONE, email: EMAIL, password: "Ladder-climb-2026-strong", passwordConfirm: "Ladder-climb-2026-strong",
      dob: "1990-01-01", acceptTerms: true, acceptAge: true,
    });
  } catch (e) {
    regThrew = (e as Error)?.message ?? String(e);
  }
  const user = await db.user.findByPhone(PHONE);
  const id = user?.id ?? "";
  // ⚠️ Registration's LAST step sets the session cookie, which needs a request. Everything asserted here is written
  // before that line; A.1b proves that is the only thing a script run could not do.
  ok("A.1 registration creates the account", !!user, reg ? J(reg) : `ended at: ${String(regThrew)}`);
  ok("A.1b …and the only step it could not take outside a request is the session cookie",
    regThrew === null || /cookies|request scope|outside a request/i.test(regThrew), String(regThrew));
  ok("A.2 the new account is ACTIVE — not PENDING_KYC", user?.status === "ACTIVE" && user?.role === "PLAYER", `${String(user?.status)} · ${String(user?.role)}`);
  ok("A.3 …with NO identity row at all", (await db.kyc.findByUserId(id)) === null);
  ok("A.4 …and an ACTIVE wallet", (await db.wallet.findByUserId(id))?.status === "ACTIVE");

  const d0 = await deposit(id, { provider: "MPESA", amount: 50_000, msisdn: LOCAL });
  ok("A.5 the first deposit is refused ONLY for the unconfirmed email — never for identity",
    !d0.ok && d0.code === "EMAIL_UNVERIFIED" && !/^kyc_/.test((d0 as { reason?: string }).reason ?? ""), J(d0));
  // ⚠️ The email gate's audit row is fire-and-forget — settle before reading it, or the check measures a race.
  await settle();
  const depositTxns = (await db.txn.listForUser(id)).filter((t) => t.type === "DEPOSIT").length;
  const emailBlocked = getAuditForTarget("User", id).some((e) => e.action === "deposit.email_unverified_blocked");
  ok("A.5b …no transaction was written, and the refusal is on record", depositTxns === 0 && emailBlocked,
    `deposit txns ${depositTxns} · email_unverified_blocked row ${emailBlocked}`);

  const mail = emailOutbox().find((m) => m.to === EMAIL && /Confirm your email/i.test(m.subject));
  const token = mail ? decodeURIComponent((/token=([^"'&\s<]+)/.exec(mail.html) ?? [])[1] ?? "") : "";
  ok("A.6 fixture · registration sent the confirmation link", !!mail && token.length > 20, mail?.subject ?? "no mail");
  const v = await verifyEmailToken(token);
  ok("A.6b confirming the email through the real token", v.status === "verified" && !!(await db.user.findById(id))?.emailVerifiedAt, J(v));

  const walletBefore = (await db.wallet.findByUserId(id))!.balance;
  const d1 = await deposit(id, { provider: "MPESA", amount: 50_000, msisdn: LOCAL });
  ok("A.7 ★ the deposit goes through with no identity row", d1.ok && d1.data?.status === "CONFIRMED"
    && (await db.wallet.findByUserId(id))!.balance === walletBefore + 50_000 && (await db.kyc.findByUserId(id)) === null, J(d1));
  await settle();
  const depRow = auditRow("deposit.initiated", d1.ok ? d1.data?.txnId : null);
  ok("A.8 deposit.initiated carries the identity standing as a record (NOT_STARTED / never approved)",
    depRow?.payload?.kycStatus === "NOT_STARTED" && depRow?.payload?.everApproved === false, J(depRow?.payload ?? null));

  const market = await newMarket("Ladder market");
  const bet = await buyPosition(id, { marketId: market.id, side: "YES", stake: 5_000 });
  ok("A.9 ★ the bet is accepted with no identity row", bet.ok, J(bet));
  await settle();
  const betRow = auditRow("market.position.opened", bet.ok ? bet.data?.positionId : null);
  ok("A.10 market.position.opened carries the same record", betRow?.payload?.kycStatus === "NOT_STARTED" && betRow?.payload?.everApproved === false, J(betRow?.payload ?? null));

  const before = (await db.wallet.findByUserId(id))!;
  const w0 = await withdraw(id, { provider: "MPESA", amount: 20_000, msisdn: LOCAL } as never);
  await settle();
  const blocked = getAuditForTarget("User", id).find((e) => e.action === "withdraw.kyc_blocked");
  const after0 = (await db.wallet.findByUserId(id))!;
  ok("A.11 ★ the withdrawal is refused as kyc_not_verified", !w0.ok && (w0 as { reason?: string }).reason === "kyc_not_verified", J(w0));
  ok("A.12 …recorded as withdraw.kyc_blocked, citing the 2026-09-13 ruling",
    !!blocked && /2026-09-13/.test(String(blocked.payload?.instruction)) && blocked.payload?.everApproved === false, J(blocked?.payload ?? null));
  ok("A.13 …and nothing moved", after0.balance === before.balance && after0.hold === before.hold, `${before.balance}→${after0.balance} · hold ${after0.hold}`);

  const s = await startKyc(id);
  const idStep = await submitIdentityStep(id, { idType: "NIDA", idNumber: "19900101123451234512", fullName: "Asha Ladder Mwakalinga", dob: "1990-01-01" });
  const docs = [];
  for (const slot of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"] as const) docs.push(await attachDocument(id, slot, PNG));
  const sub = await submitForReview(id);
  ok("A.14 the player verifies through the real steps: start, identity, three documents, submit",
    s.ok && idStep.ok && (idStep as { data?: { verified?: boolean } }).data?.verified === true && docs.every((x) => x.ok) && sub.ok
      && (await db.kyc.findByUserId(id))?.status === "PENDING_REVIEW", `${J(s)} · ${J(idStep)} · ${J(docs)} · ${J(sub)}`);

  await db.user.update(id, { displayName: "LadderFox" });
  const appr = await reviewKyc({ officerId: OFFICER, userId: id, decision: "APPROVE" });
  const approvedUser = await db.user.findById(id);
  ok("A.15 the officer approves — and the player's chosen handle is NOT replaced by the legal name",
    appr.ok && (await db.kyc.findByUserId(id))?.status === "APPROVED" && approvedUser?.displayName === "LadderFox"
      && (await db.kyc.findByUserId(id))?.fullName === "Asha Ladder Mwakalinga", `${J(appr)} · ${String(approvedUser?.displayName)}`);

  const w1 = await withdraw(id, { provider: "MPESA", amount: 20_000, msisdn: LOCAL } as never);
  ok("A.16 ★ the same withdrawal now goes through", w1.ok && (await db.wallet.findByUserId(id))!.balance === before.balance - 20_000, J(w1));

  const rv = await forceReverifyKyc(OFFICER, id, "Document photo unclear — please resubmit.");
  const w2 = await withdraw(id, { provider: "MPESA", amount: 5_000, msisdn: LOCAL } as never);
  ok("A.17 ★ a force-reverified account that was approved still withdraws",
    rv.ok && (await db.kyc.findByUserId(id))?.status === "ADDITIONAL_INFO_REQUIRED" && w2.ok, `${J(rv)} · ${J(w2)}`);

  const REG = decomment(read("src/app/auth/register/actions.ts"));
  const at = REG.indexOf("export async function startRegisterAction");
  const body = at < 0 ? "" : REG.slice(at, REG.indexOf("\nexport ", at + 10));
  const redirects = (src: string) => [...src.matchAll(/redirect\(\s*(`[^`]*`|"[^"]*")/g)].map((m) => m[1]);
  const targets = redirects(body);
  console.log(`     sign-up redirect targets: ${targets.join(" · ")}`);
  ok("A.18 control · the sign-up action and its redirects were found", body.length > 500 && targets.length >= 3, `${targets.length} redirect(s)`);
  ok("A.19 a new player with nowhere to go lands on /wallet/deposit?welcome=new", targets.includes('"/wallet/deposit?welcome=new"'));
  ok("A.20 a new player with a safe destination lands THERE, greeted", /qs\.set\(\s*"welcome",\s*"new"\s*\)/.test(body) && targets.some((t) => t.startsWith("`${path}?")));
  ok("A.21 ⛔ no sign-up redirect sends a new player to identity verification", !targets.some((t) => /\/profile\/kyc/.test(t)));
  ok("A.21b control · the extractor catches the old destination", redirects(`redirect("/profile/kyc?welcome=new");`).some((t) => /\/profile\/kyc/.test(t)));
}

// ═══ §B · THE QUIET RULE ════════════════════════════════════════════════════════════════════════
const SRC = join(ROOT, "src");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
});
const files = walk(SRC).map((f) => relative(ROOT, f).replace(/\\/g, "/"));
const code = new Map(files.map((f) => [f, decomment(read(f)).replace(/\r\n/g, "\n")]));
/** A whole-token mention — never a substring of a longer identifier. */
const mentions = (src: string, token: string) =>
  new RegExp(`(^|[^\\w$])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w$])`).test(src);
const mountsOf = (tag: string, pop: Map<string, string>) => [...pop.keys()].filter((f) => new RegExp(`<${tag}\\b`).test(pop.get(f)!));
console.log(`\n     population: ${files.length} source files under src/`);

section("§B1 · the withdraw panel appears only where money leaves (and in the agent application)");
{
  ok("B1.0 control · the walk covered the tree", files.length > 300, `${files.length}`);
  const ALLOWED = new Set(["src/app/wallet/withdraw/page.tsx", "src/app/agent/apply/apply-client.tsx"]);
  const mounts = mountsOf("KycGatePanel", code);
  console.log(`     <KycGatePanel mounted in: ${mounts.join(", ") || "nowhere"}`);
  ok("B1.1 ⛔ <KycGatePanel is mounted nowhere else", mounts.every((f) => ALLOWED.has(f)), mounts.filter((f) => !ALLOWED.has(f)).join(", "));
  ok("B1.2 control · both allowed places really mount it", [...ALLOWED].every((f) => mounts.includes(f)));
  const purposes = (f: string) => [...(code.get(f) ?? "").matchAll(/<KycGatePanel\b[^>]*?purpose="(\w+)"/g)].map((m) => m[1]);
  ok("B1.3 the withdraw screen's panel speaks for the payout, the application's for the agent",
    J(purposes("src/app/wallet/withdraw/page.tsx")) === J(["payout"]) && purposes("src/app/agent/apply/apply-client.tsx").every((p) => p === "agent")
      && purposes("src/app/agent/apply/apply-client.tsx").length >= 1, `${J(purposes("src/app/wallet/withdraw/page.tsx"))} · ${J(purposes("src/app/agent/apply/apply-client.tsx"))}`);
  const planted = new Map([["src/app/markets/page.tsx", "return <KycGatePanel state={s} purpose=\"payout\" />;"], ["src/app/x.tsx", "{/* <KycGatePanel purpose=\"payout\" /> */}"]]);
  const plantedCode = new Map([...planted].map(([f, s]) => [f, decomment(s)]));
  ok("B1.4 control · a planted mount is found, and a mention inside a JSX comment is not",
    J(mountsOf("KycGatePanel", plantedCode)) === J(["src/app/markets/page.tsx"]));
}

section("§B2 · the first-deposit notice appears only on /wallet and the deposit return page");
{
  const ALLOWED = new Set(["src/app/wallet/page.tsx", "src/app/wallet/wallet-client.tsx", "src/app/wallet/deposit/return/page.tsx"]);
  const mounts = mountsOf("KycFirstDepositNotice", code);
  console.log(`     <KycFirstDepositNotice mounted in: ${mounts.join(", ") || "nowhere"}`);
  ok("B2.1 ⛔ <KycFirstDepositNotice is mounted nowhere else", mounts.every((f) => ALLOWED.has(f)), mounts.filter((f) => !ALLOWED.has(f)).join(", "));
  ok("B2.2 control · it IS mounted on /wallet and on the deposit return page",
    (mounts.includes("src/app/wallet/page.tsx") || mounts.includes("src/app/wallet/wallet-client.tsx"))
      && (!existsSync(join(ROOT, "src/app/wallet/deposit/return/page.tsx")) || mounts.includes("src/app/wallet/deposit/return/page.tsx")), mounts.join(", "));
  ok("B2.3 every mount renders only on the server's decision", mounts.every((f) => /kycFirstDepositNotice\s*&&\s*<KycFirstDepositNotice\b/.test(code.get(f)!)));
  const callers = files.filter((f) => f !== "src/lib/server/kyc-notice.ts" && /\bfirstDepositNoticeDue\s*\(/.test(code.get(f)!));
  ok("B2.4 the one predicate decides for both pages, and nobody else asks it",
    J(callers.sort()) === J(["src/app/wallet/deposit/return/page.tsx", "src/app/wallet/page.tsx"]), callers.join(", "));
  const rederives = (s: string) => /\b(kycGateState|kycNoticeStateDue)\s*\(/.test(s);
  ok("B2.5 ⛔ neither page re-derives who is due", !rederives(code.get("src/app/wallet/page.tsx")!) && !rederives(code.get("src/app/wallet/deposit/return/page.tsx")!));
  ok("B2.6 control · a page that re-derives it is caught", rederives("const due = kycNoticeStateDue(kycGateState(k));"));

  // 🔴 THE DISMISSAL IS BOUND TO THE PLAYER (2026-09-14, audit session 95, U2). A bare `dismissed` was read
  // with no user binding, so on a shared phone one player's X hid the notice from the next.
  const WALLET = code.get("src/app/wallet/page.tsx") ?? "", RETURN = code.get("src/app/wallet/deposit/return/page.tsx") ?? "";
  const handsRawCookie = (s: string) => /firstDepositNoticeDue\(\s*session\.userId,\s*\{\s*dismissCookie:\s*\(await cookies\(\)\)\.get\(KYC_NOTICE_COOKIE\)\?\.value\b/.test(s);
  ok("B2.7 both pages hand the RAW cookie to the one predicate — neither decides whose dismissal it is",
    handsRawCookie(WALLET) && (!existsSync(join(ROOT, "src/app/wallet/deposit/return/page.tsx")) || handsRawCookie(RETURN)));
  ok("B2.7c control · the matcher rejects the old unbound comparison",
    !handsRawCookie("firstDepositNoticeDue(session.userId, { dismissed: (await cookies()).get(KYC_NOTICE_COOKIE)?.value === KYC_NOTICE_DISMISSED })"));
  ok("B2.8 ★ the return page hands its notice the per-player value",
    !existsSync(join(ROOT, "src/app/wallet/deposit/return/page.tsx"))
      || /kycFirstDepositNotice\s*&&\s*<KycFirstDepositNotice\s+dismissValue=\{kycNoticeDismissValue\(session\.userId\)\}/.test(RETURN));
  ok("B2.9 ★ /wallet scopes the per-player value around the client tree that mounts the notice",
    /<KycNoticeDismissScope\s+value=\{kycFirstDepositNotice\s*\?\s*kycNoticeDismissValue\(session\.userId\)\s*:\s*null\}\s*>\s*<WalletPageClient\b/.test(WALLET), "");
  const NOTICE = code.get("src/components/wallet/kyc-first-deposit-notice.tsx") ?? "";
  const writes = [...NOTICE.matchAll(/\$\{KYC_NOTICE_COOKIE\}=\$\{(\w+)\}/g)].map((m) => m[1]);
  ok("B2.10 the notice writes exactly one value — the one it was handed — and never without it",
    J(writes) === J(["value"]) && /const value = dismissValue \?\? scoped;/.test(NOTICE) && /if \(value\)\s*\{/.test(NOTICE), J(writes));
  const legacy = files.filter((f) => /\bKYC_NOTICE_DISMISSED\b|["'`]dismissed["'`]/.test(code.get(f)!));
  ok("B2.11 ⛔ nothing under src/ compares to or writes the unbound legacy value", legacy.length === 0, legacy.join(", "));
  ok("B2.11c control · the matcher catches the old constant and the old literal",
    /\bKYC_NOTICE_DISMISSED\b|["'`]dismissed["'`]/.test(`dismissed: cookie === KYC_NOTICE_DISMISSED`)
      && /\bKYC_NOTICE_DISMISSED\b|["'`]dismissed["'`]/.test(`export const X = "dismissed";`));
}

section("§B3 · no app-wide identity bar");
{
  const BANNER = /kyc-verify-banner|KycVerifyBanner/;
  const refs = files.filter((f) => BANNER.test(code.get(f)!));
  const prose = files.filter((f) => BANNER.test(read(f))).length;
  console.log(`     prose mentions (comments, not asserted): ${prose}`);
  ok("B3.1 ⛔ the banner file does not exist", !existsSync(join(ROOT, "src/components/layout/kyc-verify-banner.tsx")));
  ok("B3.2 ⛔ no source references it", refs.length === 0, refs.join(", "));
  ok("B3.3 control · the matcher catches the import it forbids", BANNER.test(decomment(`import { KycVerifyBanner } from "@/components/layout/kyc-verify-banner";`)));
}

section("§B4 · the removed nudges are defined nowhere in the comms layer");
{
  const REMOVED = [
    "identityExitNudgeDue", "identityExitClause", "notifyKycFundedReminder", "runFundedUnverifiedReminders",
    "notifyKycWithdrawalBlocked", "promptIdentityAfterBlockedWithdrawal", "kycFundedReminderHtml",
    "kycWithdrawalBlockedHtml", "maybeRemindFundedUnverified",
  ];
  for (const [file, kept] of [
    ["src/lib/server/notification-service.ts", "runKycReviewSlaAlerts"],
    ["src/lib/server/email.ts", "kycReviewOverdueAdminHtml"],
    ["src/lib/server/lifecycle.ts", "maybeWatchKycReviewSla"],
  ] as const) {
    const src = code.get(file) ?? "";
    ok(`B4.${file.split("/").pop()} control · the file is real and the matcher finds \`${kept}\` in it`, src.length > 3_000 && mentions(src, kept));
    const found = REMOVED.filter((t) => mentions(src, t));
    ok(`B4.${file.split("/").pop()} ⛔ defines and references none of the removed nudges`, found.length === 0, found.join(", "));
  }
  ok("B4.c control · the matcher catches a definition, and not a longer name",
    mentions("export async function notifyKycFundedReminder(userId: string) {", "notifyKycFundedReminder") && !mentions("const notifyKycFundedReminderLater = 1;", "notifyKycFundedReminder"));
}

section("§B5 · the notice's words are read by the notice alone");
{
  const DICT = "src/lib/i18n-dict.ts";
  const readers = files.filter((f) => f !== DICT && mentions(code.get(f)!, "kycNotice"));
  console.log(`     kycNotice read by: ${readers.join(", ") || "nobody"}`);
  ok("B5.1 ⛔ only the notice component reads kycNotice.*", J(readers) === J(["src/components/wallet/kyc-first-deposit-notice.tsx"]), readers.join(", "));
  ok("B5.2 control · the dictionary defines the block in all three languages", ((code.get(DICT) ?? "").match(/\bkycNotice:\s*\{/g) ?? []).length === 3);
  ok("B5.3 control · the matcher sees `t.kycNotice.body` and ignores `kycNoticeStateDue`",
    mentions("{t.kycNotice.body}", "kycNotice") && !mentions("kycNoticeStateDue(state)", "kycNotice"));
}

section("§B6 · a never-approved player's deposit, win, cash-out and refused withdrawal say nothing about identity");
{
  // The matcher `test:cert-c1` §5b / `test:cert-c3` §7 use, so the three guards mean the same words.
  const IDENTITY = /verif|identit|utambulisho|uthibitisho|身份|验证/i;
  const plain = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  type Row = { id: string; titleEn: string; bodyEn: string; titleSw: string; bodySw: string; titleZh?: string | null; bodyZh?: string | null };
  const textOf = (n: Row) => [n.titleEn, n.bodyEn, n.titleSw, n.bodySw, n.titleZh ?? "", n.bodyZh ?? ""].join("\n");
  let s6 = 0;
  const acct = async (id: string, balance: number) => {
    const local = `72${String(++s6).padStart(7, "0")}`;
    await db.user.create({
      id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: `Quiet ${s6}`, dob: "1990-01-01", region: "TZ",
      acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      email: `${id}@t.tz`, emailVerifiedAt: now(), createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
    return local;
  };

  const ctrl = "usr_kaw_matcher_ctrl";
  await acct(ctrl, 0);
  const kycRow = await notifyKyc(ctrl, "PENDING_REVIEW");
  ok("B6.0 control · the matcher catches a real verification row, and the removed receipt sentence",
    !!kycRow && IDENTITY.test(textOf(kycRow as Row)) && IDENTITY.test("Before you withdraw, verify your identity once"));

  const q = "usr_kaw_quiet";
  const qLocal = await acct(q, 0);
  await acct("usr_kaw_co_yes", 500_000);
  await acct("usr_kaw_co_no", 500_000);
  const snap = async (u: string) => ({ bell: (await db.notification.findByUser(u, 1000)) as Row[], mail: [...emailOutbox()].filter((m) => m.to === `${u}@t.tz`) });
  async function measure<T>(what: string, fn: () => Promise<T>, expectReceipt: boolean): Promise<T> {
    const before = await snap(q);
    const r = await fn();
    await settle();
    const after = await snap(q);
    const newBell = after.bell.filter((n) => !before.bell.some((x) => x.id === n.id));
    const newMail = after.mail.filter((m) => !before.mail.includes(m));
    console.log(`     ${what}: bell [${newBell.map((n) => n.titleEn).join(" | ")}] · email [${newMail.map((m) => m.subject).join(" | ")}]`);
    if (expectReceipt) {
      ok(`B6.${what} control · the instruments see the event's own receipt (bell AND email)`, newBell.length > 0 && newMail.length > 0, `${newBell.length} row(s) · ${newMail.length} email(s)`);
    }
    const idBell = newBell.filter((n) => IDENTITY.test(textOf(n)));
    const idMail = newMail.filter((m) => IDENTITY.test(`${m.subject}\n${plain(m.html)}`));
    ok(`B6.${what} ⛔ ZERO identity-worded notification rows`, idBell.length === 0, idBell.map((n) => textOf(n).slice(0, 160)).join(" | "));
    ok(`B6.${what} ⛔ ZERO identity-worded emails`, idMail.length === 0, idMail.map((m) => m.subject).join(" | "));
    return r;
  }

  const d = await measure("deposit", () => deposit(q, { provider: "MPESA", amount: 100_000, msisdn: qLocal }), true);
  ok("B6.deposit fixture · the deposit was confirmed", d.ok && d.data?.status === "CONFIRMED", J(d));

  const mw = await newMarket("Quiet win market");
  const qb = await buyPosition(q, { marketId: mw.id, side: "YES", stake: 10_000 });
  const nb = await buyPosition("usr_kaw_co_no", { marketId: mw.id, side: "NO", stake: 10_000 });
  ok("B6.win fixture · both sides staked", qb.ok && nb.ok, `${J(qb)} · ${J(nb)}`);
  const balBeforeWin = (await db.wallet.findByUserId(q))!.balance;
  const won = await measure("win", async () => {
    let r = await resolveMarket({ marketId: mw.id, outcome: "YES", officerId: OFFICER });
    if (r.ok && r.data?.stage === "stage1") r = await resolveMarket({ marketId: mw.id, outcome: "YES", officerId: "usr_kaw_officer_2" });
    const s = await settleMarket(mw.id, { force: true });
    return { r, s };
  }, true);
  ok("B6.win fixture · the market settled and the player was paid", won.r.ok && won.s.ok && (await db.wallet.findByUserId(q))!.balance > balBeforeWin,
    `${J(won)} · ${balBeforeWin}→${(await db.wallet.findByUserId(q))!.balance}`);

  const mc = await newMarket("Quiet cash-out market");
  const cp = await buyPosition(q, { marketId: mc.id, side: "YES", stake: 5_000 });
  await buyPosition("usr_kaw_co_yes", { marketId: mc.id, side: "YES", stake: 5_000 });
  await buyPosition("usr_kaw_co_no", { marketId: mc.id, side: "NO", stake: 5_000 });
  const co = await measure("cash-out", () => cashOutPosition(q, cp.ok ? cp.data!.positionId : ""), true);
  ok("B6.cash-out fixture · the position was cashed out", co.ok, J(co));

  const w = await measure("refused withdrawal", () => withdraw(q, { provider: "MPESA", amount: 20_000, msisdn: qLocal } as never), false);
  ok("B6.refused withdrawal fixture · refused for identity", !w.ok && (w as { reason?: string }).reason === "kyc_not_verified", J(w));
  ok("B6.fixture · the player was never approved throughout", (await db.kyc.findByUserId(q)) === null);
}

section("§B7 · who sees the first-deposit notice — the one server predicate, over every identity state");
{
  type K = { status: string; rejectReason?: string | null; approvedAt?: string | null; documents?: number } | null;
  const SLOTS = ["NIDA_FRONT", "NIDA_BACK", "SELFIE"];
  let s7 = 0;
  const fixture = async (tag: string, kyc: K, deposits: string[]) => {
    const id = `usr_kaw_notice_${tag}`;
    await db.user.create({
      id, phoneE164: `+25571${String(++s7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
      acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now(),
      createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 10_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
    for (const [i, status] of deposits.entries()) {
      await db.txn.create({
        id: `txn_kaw_${tag}_${i}`, walletId: `wal_${id}`, userId: id, type: "DEPOSIT", status, amount: 10_000, fee: 0, taxWithheld: 0,
        balanceAfter: 10_000, currency: "TZS", provider: "MPESA", providerRef: `dep_${tag}_${i}`, msisdn: null, description: "fixture deposit",
        positionId: null, amlReason: null, createdAt: now(), updatedAt: now(), completedAt: status === "CONFIRMED" ? now() : null,
      } as never);
    }
    if (kyc) {
      await db.kyc.upsert({
        id: `kyc_${id}`, userId: id, status: kyc.status, rejectReason: kyc.rejectReason ?? null, rejectNote: null,
        idType: "NIDA", idNumber: null, idExpiry: null, idVerifiedAt: null, fullName: null, dob: null,
        documents: SLOTS.slice(0, kyc.documents ?? 0).map((docType) => ({ docType, storageKey: PNG, uploadedAt: now() })),
        reviewerId: null, reviewedAt: null, submittedAt: null, approvedAt: kyc.approvedAt ?? null, createdAt: now(), updatedAt: now(),
      } as never);
    }
    return id;
  };
  const CASES: Array<[string, K, string[], boolean]> = [
    ["no_row_funded", null, ["CONFIRMED"], true],
    ["started_no_docs_funded", { status: "IN_PROGRESS" }, ["CONFIRMED"], true],
    ["uploaded_funded", { status: "IN_PROGRESS", documents: 2 }, ["CONFIRMED"], true],
    ["no_row_no_deposit", null, [], false],
    ["uploaded_no_deposit", { status: "IN_PROGRESS", documents: 2 }, [], false],
    ["no_row_only_unconfirmed_deposits", null, ["PROCESSING", "FAILED"], false],
    ["pending_review", { status: "PENDING_REVIEW", documents: 3 }, ["CONFIRMED"], false],
    ["more_info", { status: "ADDITIONAL_INFO_REQUIRED", documents: 3 }, ["CONFIRMED"], false],
    ["rejected", { status: "REJECTED", rejectReason: "BLURRY_DOC", documents: 3 }, ["CONFIRMED"], false],
    ["refused_final", { status: "REJECTED", rejectReason: "UNDERAGE", documents: 3 }, ["CONFIRMED"], false],
    // 2026-09-14 · a final refusal now outranks an earlier approval in `kycGateState` — still not due.
    ["refused_final_after_approval", { status: "REJECTED", rejectReason: "DUPLICATE_IDENTITY", approvedAt: "2026-01-01T00:00:00.000Z", documents: 3 }, ["CONFIRMED"], false],
    ["approved", { status: "APPROVED", approvedAt: now(), documents: 3 }, ["CONFIRMED"], false],
    ["reverifying_after_approval", { status: "ADDITIONAL_INFO_REQUIRED", approvedAt: "2026-01-01T00:00:00.000Z", documents: 3 }, ["CONFIRMED"], false],
  ];
  const ids = new Map<string, string>();
  for (const [tag, kyc, deposits, want] of CASES) {
    const id = await fixture(tag, kyc, deposits);
    ids.set(tag, id);
    const due = await firstDepositNoticeDue(id, { dismissCookie: null });
    ok(`B7.${tag} → ${want ? "SHOWN" : "hidden"}`, due === want, `got ${due}`);
  }
  ok("B7.c control · the cases include both answers, so neither can be a constant", CASES.some((c) => c[3]) && CASES.some((c) => !c[3]));

  // 🔴 THE DISMISSAL IS PER PLAYER (2026-09-14, audit session 95, U2): the cookie counts only when it holds
  // the value for THIS player, so on a shared phone one player's X cannot hide the notice from the next.
  const due = ids.get("no_row_funded")!;
  const other = ids.get("started_no_docs_funded")!;
  const mine = kycNoticeDismissValue(due), theirs = kycNoticeDismissValue(other);
  ok("B7.value · ★ two players get two different dismiss values, each stable and in the documented shape",
    mine !== theirs && mine === kycNoticeDismissValue(due) && /^d:[0-9a-f]{16}$/.test(mine) && /^d:[0-9a-f]{16}$/.test(theirs), `${mine} · ${theirs}`);
  ok("B7.dismissed · this player's own dismissal hides it", (await firstDepositNoticeDue(due, { dismissCookie: mine })) === false);
  ok("B7.shared-phone · ⛔ ANOTHER player's dismissal in the same browser does not hide it",
    (await firstDepositNoticeDue(due, { dismissCookie: theirs })) === true);
  ok("B7.legacy · ⛔ the old unbound `dismissed` is NOT a dismissal (that browser sees it once more)",
    (await firstDepositNoticeDue(due, { dismissCookie: "dismissed" })) === true);
  ok("B7.empty · control · an empty cookie is not a dismissal either", (await firstDepositNoticeDue(due, { dismissCookie: "" })) === true);
  ok("B7.in-hand · the caller's own rows answer the deposit question both ways",
    (await firstDepositNoticeDue(ids.get("uploaded_no_deposit")!, { dismissCookie: null, depositInHand: true })) === true
      && (await firstDepositNoticeDue(due, { dismissCookie: null, depositInHand: false })) === false);

  const realFind = db.kyc.findByUserId;
  (db.kyc as { findByUserId: unknown }).findByUserId = async (userId: string) => {
    if (userId === due) throw new Error("simulated KYC read failure");
    return realFind.call(db.kyc, userId);
  };
  let probe = "", failedKyc: boolean | null = null;
  try {
    probe = await Promise.resolve(db.kyc.findByUserId(due)).then(() => "read", (e: Error) => e.message);
    failedKyc = await firstDepositNoticeDue(due, { dismissCookie: null });
  } finally {
    (db.kyc as { findByUserId: unknown }).findByUserId = realFind;
  }
  ok("B7.failed-kyc-read · control · the read really fails for this account", /simulated/.test(probe), probe);
  ok("B7.failed-kyc-read · ⛔ a failed identity read shows nothing", failedKyc === false, String(failedKyc));

  const realSum = db.txn.sumDepositsSince;
  (db.txn as { sumDepositsSince: unknown }).sumDepositsSince = (userId: string, since: number, pending?: boolean) => {
    if (userId === due) throw new Error("simulated deposit read failure");
    return realSum.call(db.txn, userId, since, pending);
  };
  let failedSum: boolean | null = null;
  try {
    failedSum = await firstDepositNoticeDue(due, { dismissCookie: null });
  } finally {
    (db.txn as { sumDepositsSince: unknown }).sumDepositsSince = realSum;
  }
  ok("B7.failed-deposit-read · ⛔ a failed deposit read shows nothing", failedSum === false, String(failedSum));
  ok("B7.failed-read control · with the reads restored the same account is shown again", (await firstDepositNoticeDue(due, { dismissCookie: null })) === true);
}

section("B8 · ⛔ THE DEPOSIT SCREEN SAYS NOTHING ABOUT IDENTITY — the quiet rule, on the page it is easiest to break");
{
  // Found by the 2026-09-13 visual pass, not by any guard: /wallet/deposit's reassurance footer rendered the
  // WITHDRAW page's `wallet.securedBody`, whose middle sentence is about identity documents. Every copy guard
  // read it as true (it is true) and none asked WHERE it was shown. The first-deposit notice lives on /wallet
  // and on the return page, so `deposit/return/` is outside this population on purpose.
  const { dict } = await import("../src/lib/i18n-dict.ts");
  const IDENTITY: Record<string, RegExp> = {
    en: /identity|\bKYC\b|\bID\b|documents?\b|selfie/i,
    sw: /utambulisho|kitambulisho|nyaraka|KYC/i,
    zh: /身份|证件|自拍|实名|KYC/,
  };
  const walkDeposit = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((e) => {
    const rel = `${dir}/${e}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return e === "return" ? [] : walkDeposit(rel);
    return /\.tsx?$/.test(e) ? [rel] : [];
  });
  const files = walkDeposit("src/app/wallet/deposit");
  const keys = new Set<string>();
  for (const f of files) for (const m of decomment(read(f)).matchAll(/\bt\.(\w+)\.(\w+)\b/g)) keys.add(`${m[1]}.${m[2]}`);
  const strings = (v: unknown): string[] => typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
  const valueOf = (loc: "en" | "sw" | "zh", key: string) => {
    const [a, b] = key.split(".");
    return strings((dict[loc] as Record<string, Record<string, unknown> | undefined>)[a]?.[b]);
  };
  ok("B8.population · the deposit screen's files and dictionary keys were read", files.length >= 1 && keys.size >= 5, `${files.length} files · ${keys.size} keys`);
  for (const loc of ["en", "sw", "zh"] as const) {
    const hits = [...keys].filter((k) => valueOf(loc, k).some((s) => IDENTITY[loc].test(s)));
    ok(`B8.${loc} · ★ no string the deposit screen renders mentions identity`, hits.length === 0, hits.join(", ") || `${keys.size} keys clean`);
    ok(`B8.${loc} control · the matcher fires on the withdraw page's line that used to be shown here`, valueOf(loc, "wallet.securedBody").some((s) => IDENTITY[loc].test(s)));
  }
  ok("B8.wiring · the deposit footer reads its own line", /t\.wallet\.securedDepositBody/.test(read("src/app/wallet/deposit/page.tsx")));
}

section("§B9 · a FINAL refusal outranks an earlier approval — the precedence `kycGateState` answers with");
{
  // 🔴 2026-09-14 (audit session 95, U1). The approved-ever check ran first, so an account approved once and then
  // refused on a FINAL code answered null — and /wallet/withdraw drew the payout form over the wallet the refusal froze.
  const APPROVED_ONCE = "2026-09-01T00:00:00Z";
  const s = kycGateState({ status: "REJECTED", rejectReason: "SANCTIONED", approvedAt: APPROVED_ONCE });
  ok("B9.1 ★ approved once, then refused SANCTIONED → refused_final, not null", s === "refused_final", String(s));
  for (const reason of ["UNDERAGE", "DUPLICATE_IDENTITY"]) {
    const x = kycGateState({ status: "REJECTED", rejectReason: reason, approvedAt: APPROVED_ONCE });
    ok(`B9.2 …and the same for ${reason}`, x === "refused_final", String(x));
  }
  const recoverable = kycGateState({ status: "REJECTED", rejectReason: "BLURRY_DOC", approvedAt: APPROVED_ONCE });
  const reverifying = kycGateState({ status: "ADDITIONAL_INFO_REQUIRED", approvedAt: APPROVED_ONCE });
  const approved = kycGateState({ status: "APPROVED", approvedAt: APPROVED_ONCE });
  ok("B9.3 control · approved once, refused on a RECOVERABLE code → null: the form stays", recoverable === null, String(recoverable));
  ok("B9.4 control · approved once, re-verifying → null: money already earned stays reachable", reverifying === null, String(reverifying));
  ok("B9.5 control · APPROVED → null, and a never-approved final refusal → refused_final",
    approved === null && kycGateState({ status: "REJECTED", rejectReason: "SANCTIONED" }) === "refused_final", String(approved));
  ok("B9.6 the first-deposit notice is still not due for a final refusal after approval", kycNoticeStateDue(s) === false);
  ok("B9.6c control · …while it IS due for an account that has sent nothing", kycNoticeStateDue(kycGateState(null)) === true);
}

section("§B10 · a wallet that is not ACTIVE is never given the withdraw form");
{
  // 🔴 2026-09-14 (audit session 95, U1). An approved-once account whose wallet was FROZEN (an officer hold, a
  // self-exclusion, a final refusal after re-verification) was shown the full form and refused only at confirm.
  // The shape pinned: `{P ? <KycGatePanel state={P} …/> : <form action={withdrawAction}>}`, ONE form bound to the
  // action, and P becomes "frozen" from the wallet row's status — directly, or through one named local.
  const esc = (id: string) => id.replace(/\$/g, "\\$");
  const declOf = (src: string, name: string) => new RegExp(`(?:const|let)\\s+${esc(name)}\\b[^=;]*=\\s*([^;]+);`).exec(src)?.[1] ?? null;
  const readsWalletStatus = (s: string) => /\bwallet\??\.status\s*!==\s*"ACTIVE"/.test(s);
  const flat = (s: string) => s.replace(/\s+/g, " ").trim();
  const formHeldBack = (src: string): { ok: boolean; why: string; init: string } => {
    const forms = [...src.matchAll(/<form\b[^>]*?\baction=\{withdrawAction\}/g)].length;
    if (forms !== 1) return { ok: false, why: `${forms} form(s) bound to withdrawAction`, init: "" };
    const m = /\{\s*(\w+)\s*\?\s*\(?\s*<KycGatePanel\b[^>]*?\bstate=\{\s*(\w+)\s*\}[\s\S]*?\/>\s*\)?\s*:\s*\(?\s*<form\b[^>]*?\baction=\{withdrawAction\}/.exec(src);
    if (!m) return { ok: false, why: "the form is not the other branch of the panel's conditional", init: "" };
    const [, cond, state] = m;
    if (cond !== state) return { ok: false, why: `the branch tests ${cond} but the panel draws ${state}`, init: "" };
    const init = declOf(src, cond);
    if (!init) return { ok: false, why: `no declaration for ${cond}`, init: "" };
    if (!/"frozen"/.test(init)) return { ok: false, why: `${cond} never becomes "frozen": ${flat(init)}`, init };
    const via = [...init.matchAll(/[A-Za-z_$][\w$]*/g)].map((x) => x[0]).filter((id) => readsWalletStatus(declOf(src, id) ?? ""));
    if (!readsWalletStatus(init) && via.length === 0) return { ok: false, why: `${cond} does not read the wallet's status: ${flat(init)}`, init };
    return { ok: true, why: `${cond} = ${flat(init)}${via.length ? ` · ${via[0]} = ${flat(declOf(src, via[0])!)}` : ""}`, init };
  };

  const PAGE = code.get("src/app/wallet/withdraw/page.tsx") ?? "";
  const real = formHeldBack(PAGE);
  console.log(`     withdraw page: ${real.why}`);
  ok("B10.0 control · the withdraw page was read and still holds the form and the panel",
    PAGE.length > 3_000 && /<form\b/.test(PAGE) && /<KycGatePanel\b/.test(PAGE));
  ok("B10.1 ★ the form bound to withdrawAction is not rendered when the wallet is not ACTIVE", real.ok, real.why);
  ok("B10.2 …and a FINAL refusal keeps its own panel: `frozen` is not chosen over refused_final",
    /withdrawGateState\s*!==\s*"refused_final"/.test(real.init), flat(real.init));

  // ⛔ PLANTED CONTROLS — the matcher must go red on each shape it forbids, and green on a correct one.
  const SHIPPED = `
    let withdrawGateState: ReturnType<typeof kycGateState> = "not_started";
    const wallet = await db.wallet.findByUserId(session.userId);
    return (<>{withdrawGateState ? (
      <KycGatePanel state={withdrawGateState} purpose="payout" returnTo="/wallet/withdraw" />
    ) : (
    <form action={withdrawAction}><input name="amount" /></form>
    )}</>);`;
  const IGNORES_WALLET = `
    const withdrawPanel = withdrawGateState ?? "frozen";
    return (<>{withdrawPanel ? (<KycGatePanel state={withdrawPanel} purpose="payout" />) : (<form action={withdrawAction}></form>)}</>);`;
  const GOOD = `
    const wallet = await db.wallet.findByUserId(id);
    const held = !!wallet && wallet.status !== "ACTIVE";
    const panel = held ? "frozen" : gate;
    return (<>{panel ? (<KycGatePanel state={panel} purpose="payout" />) : (<form action={withdrawAction}></form>)}</>);`;
  const shipped = formHeldBack(SHIPPED), ignores = formHeldBack(IGNORES_WALLET), second = formHeldBack(`${GOOD}\n<form action={withdrawAction}></form>`), good = formHeldBack(GOOD);
  ok("B10.c1 control · the page as shipped before the fix (form over any wallet) is caught", !shipped.ok, shipped.why);
  ok("B10.c2 control · a `frozen` that never reads the wallet's status is caught", !ignores.ok, ignores.why);
  ok("B10.c3 control · a second, unguarded form bound to withdrawAction is caught", !second.ok, second.why);
  ok("B10.c4 control · a correct planted page passes, so the matcher is not constant", good.ok, good.why);

  const PANEL = code.get("src/components/kyc/kyc-gate-panel.tsx") ?? "";
  ok("B10.3 the panel's frozen variant: support is its only step, and it reads its own four words",
    /frozen:\s*\{\s*tone:\s*"held",\s*glyph:\s*"\w+",\s*cta:\s*"support"\s*\}/.test(PANEL)
      && ["frozenEyebrow", "frozenTitle", "frozenBody", "frozenCta"].every((k) => new RegExp(`\\bt\\.kycGate\\.${k}\\b`).test(PANEL))
      && /spec\.cta === "support" \? "\/help"/.test(PANEL));
  const { dict } = await import("../src/lib/i18n-dict.ts");
  const kg = (loc: "en" | "sw" | "zh", k: string) => (dict[loc] as unknown as { kycGate?: Record<string, unknown> }).kycGate?.[k];
  for (const k of ["frozenEyebrow", "frozenTitle", "frozenBody", "frozenCta"]) {
    const [en, sw, zh] = (["en", "sw", "zh"] as const).map((loc) => kg(loc, k));
    ok(`B10.4 kycGate.${k} is written in en, sw and zh — never English inside sw or zh`,
      [en, sw, zh].every((v) => typeof v === "string" && v.trim().length > 0) && sw !== en && zh !== en, J([en, sw, zh]));
  }
}

console.log(`\nkyc-at-withdrawal: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
