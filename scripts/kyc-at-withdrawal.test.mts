/**
 * KYC AT WITHDRAWAL — the ladder, driven; and THE QUIET RULE, as a population guard.   `npm run test:kyc-at-withdrawal`
 *
 *   Run: npx tsx scripts/kyc-at-withdrawal.test.mts
 *
 * ⭐ THE RULING (Ali, 2026-09-13 — the top 2026-09-13 entries of docs/COMPLIANCE-DECISIONS.md): identity is required
 * ONLY before WITHDRAWAL. The ladder: register → deposit and play → verify identity → confirm email → withdraw
 * (2026-10-07, owner ruling: a deposit asks no email; a confirmed address is asked after identity, before money leaves).
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
import { confirmEmailWithProof } from "../src/lib/server/email-verification.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket, cashOutPosition } from "../src/lib/server/market-service.ts";
import { startKyc, submitIdentityStep, attachDocument, submitForReview, reviewKyc, forceReverifyKyc } from "../src/lib/server/kyc-service.ts";
import { notifyKyc } from "../src/lib/server/notification-service.ts";
import { firstDepositNotice, firstDepositNoticeDue, kycNoticeDismissValue } from "../src/lib/server/kyc-notice.ts";
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
section("§A · register → deposit and play → verify identity → confirm email → withdraw");
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

  // ⭐ 2026-10-07 (owner ruling): a deposit asks NO email question. The account was created seconds ago — its address
  // unconfirmed, no identity row — and its first deposit goes straight through. Until that day this step asserted the
  // opposite (refused for the email, never for identity); the email moved to WITHDRAWAL, which A.15b drives.
  const d0 = await deposit(id, { provider: "MPESA", amount: 50_000, msisdn: LOCAL });
  ok("A.5 ★ the first deposit goes through with an UNCONFIRMED email and no identity row",
    d0.ok && d0.code === undefined && (await db.kyc.findByUserId(id)) === null && !(await db.user.findById(id))?.emailVerifiedAt, J(d0));
  // ⚠️ The audit rows are fire-and-forget — settle before reading them, or the check measures a race.
  await settle();
  const depositTxns = (await db.txn.listForUser(id)).filter((t) => t.type === "DEPOSIT").length;
  const emailBlocked = getAuditForTarget("User", id).some((e) => e.action === "deposit.email_unverified_blocked");
  const d0Row = auditRow("deposit.initiated", d0.ok ? d0.data?.txnId : null);
  ok("A.5b …a transaction was written, no deposit was ever refused for the email, and the row records the address as unconfirmed",
    depositTxns === 1 && !emailBlocked && d0Row?.payload?.hasEmail === true && d0Row?.payload?.emailConfirmed === false,
    `deposit txns ${depositTxns} · email_unverified_blocked row ${emailBlocked} · ${J(d0Row?.payload ?? null)}`);
  const mail = emailOutbox().find((m) => m.to === EMAIL && /Confirm your email/i.test(m.subject));
  const token = mail ? decodeURIComponent((/token=([^"'&\s<]+)/.exec(mail.html) ?? [])[1] ?? "") : "";
  ok("A.6 fixture · registration sent the confirmation link (it is opened at A.15c, when a withdrawal needs it)", !!mail && token.length > 20, mail?.subject ?? "no mail");

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

  // ⭐ THE SECOND HALF OF THE WITHDRAWAL GATE (owner ruling 2026-10-07). Identity is answered; the address is still
  // unconfirmed, so the same withdrawal is refused — on the EMAIL now, with nothing moved, and on record. A.11 proved
  // identity is asked FIRST (that refusal came while the email was unconfirmed too).
  const wE = await withdraw(id, { provider: "MPESA", amount: 20_000, msisdn: LOCAL } as never);
  await settle();
  const afterE = (await db.wallet.findByUserId(id))!;
  const emailRow = getAuditForTarget("User", id).find((e) => e.action === "withdraw.email_unverified_blocked");
  ok("A.15b ★ approved, but the email is unconfirmed: the withdrawal is refused on the EMAIL",
    !wE.ok && wE.code === "EMAIL_UNVERIFIED" && (wE as { reason?: string }).reason === "email_unverified", J(wE));
  ok("A.15b2 …nothing moved, and the refusal is recorded citing the 2026-10-07 ruling",
    afterE.balance === before.balance && afterE.hold === before.hold && !!emailRow && /2026-10-07/.test(String(emailRow.payload?.instruction)),
    `${before.balance}→${afterE.balance} · hold ${afterE.hold} · ${J(emailRow?.payload ?? null)}`);
  // The link opened in the account's own session (route audit 2026-10-06, A3: anywhere else it asks for the password).
  const v = await confirmEmailWithProof(token, { sessionUserId: id, password: null });
  ok("A.15c confirming the email through the real token", v.status === "verified" && !!(await db.user.findById(id))?.emailVerifiedAt, J(v));

  const w1 = await withdraw(id, { provider: "MPESA", amount: 20_000, msisdn: LOCAL } as never);
  ok("A.16 ★ the same withdrawal now goes through", w1.ok && (await db.wallet.findByUserId(id))!.balance === before.balance - 20_000, J(w1));

  const rv = await forceReverifyKyc(OFFICER, id, "Document photo unclear — please resubmit.");
  const w2 = await withdraw(id, { provider: "MPESA", amount: 5_000, msisdn: LOCAL } as never);
  ok("A.17 ★ a force-reverified account that was approved still withdraws",
    rv.ok && (await db.kyc.findByUserId(id))?.status === "ADDITIONAL_INFO_REQUIRED" && w2.ok, `${J(rv)} · ${J(w2)}`);

  // ⭐ ONE LANDING RULE (route audit 2026-10-06). Every sign-in and sign-up door lands through `landingAfterAuth`
  // (src/lib/auth-landing.ts); the doors are pinned to CALL it, and the rule itself is executed below (A.20, A.30).
  const REG = decomment(read("src/app/auth/register/actions.ts"));
  /** A function's text: from `export async function <name>(` to the next top-level export, or the end of the file. */
  const fnOf = (src: string, name: string) => {
    const from = src.indexOf(`export async function ${name}(`);
    if (from < 0) return "";
    const to = src.indexOf("\nexport ", from + 10);
    return src.slice(from, to < 0 ? undefined : to);
  };
  const body = fnOf(REG, "startRegisterAction");
  const redirects = (src: string) => [...src.matchAll(/redirect\(\s*(`[^`]*`|"[^"]*")/g)].map((m) => m[1]);
  const targets = redirects(body);
  const landingCalls = (body.match(/landingAfterAuth\(/g) ?? []).length;
  console.log(`     sign-up literal redirect targets: ${targets.join(" · ") || "(none)"} · landingAfterAuth calls: ${landingCalls}`);
  // ⚠️ No literal-redirect floor here: the failure hop need not stay a literal redirect, and this control must hold either way.
  ok("A.18 control · the sign-up action was found, and it lands through the one rule exactly once", body.length > 300 && landingCalls === 1,
    `${body.length} chars · ${landingCalls} landingAfterAuth call(s)`);
  // ⭐ OWNER RULING 2026-10-06: home, not the deposit page. For an account created seconds ago that page renders no
  // form — its email door stands in the form's place — so it made a locked door the first screen of a new account.
  ok("A.19 a new account lands by the ONE rule — landingAfterAuth, kind new", body.includes('landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "new" })'));
  ok("A.19b ⛔ …and no literal sign-up redirect target names /wallet/deposit and its email door", !targets.some((t) => /\/wallet\/deposit/.test(t)), targets.join(" · "));
  const { landingAfterAuth } = await import("../src/lib/auth-landing.ts");
  type LandingRow = [[string | undefined, string, "new" | "back"], string];
  const landingWrong = (rows: LandingRow[]) => rows.filter(([[role, next, kind], want]) => landingAfterAuth({ role, next, kind }) !== want)
    .map(([[role, next, kind], want]) => `${String(role)} ${next || "-"} ${kind} → ${landingAfterAuth({ role, next, kind })} (want ${want})`);
  const PLAYER_ROWS: LandingRow[] = [
    [["PLAYER", "", "new"], "/?welcome=new"], [["PLAYER", "", "back"], "/?welcome=back"],
    [["PLAYER", "/markets/mkt_a1?side=YES", "back"], "/markets/mkt_a1?side=YES&welcome=back"],
    [["PLAYER", "/positions#pos_q1", "back"], "/positions?welcome=back#pos_q1"],
    [["AGENT", "/agent", "new"], "/agent?welcome=new"],
    [[undefined, "/wallet/deposit?from=low-balance", "new"], "/wallet/deposit?from=low-balance&welcome=new"],
  ];
  const playerWrong = landingWrong(PLAYER_ROWS);
  ok("A.20 ⭐ EXECUTED · the one rule: a new or returning player lands where they were going, greeted before any #fragment, or on the market board — and a next that IS the deposit page still lands there", playerWrong.length === 0, playerWrong.join(" | "));
  ok("A.21 ⛔ no sign-up redirect sends a new player to identity verification", !targets.some((t) => /\/profile\/kyc/.test(t)));
  ok("A.21b control · the extractor catches the old destination", redirects(`redirect("/profile/kyc?welcome=new");`).some((t) => /\/profile\/kyc/.test(t)));
  ok("A.21c control · …and the 2026-09-13 one", redirects(`redirect("/wallet/deposit?welcome=new" as never);`).some((t) => /\/wallet\/deposit/.test(t)));

  // The one-time-code door signs EXISTING accounts in only (the code sign-up was deleted 2026-10-06), and lands by the
  // same rule as the password door.
  const LOGIN = decomment(read("src/app/auth/login/actions.ts"));
  const OTP_DOOR = fnOf(LOGIN, "verifyLoginOtpAction");
  const codeTargets = redirects(OTP_DOOR);
  console.log(`     one-time-code door literal redirect targets: ${codeTargets.join(" · ") || "(none)"}`);
  ok("A.22 control · the one-time-code sign-in action was found", OTP_DOOR.length > 400, `${OTP_DOOR.length} chars`);
  ok("A.23 the code door lands by the one rule (kind back — it signs existing accounts in only), and no isNew branch survives in the sign-in actions",
    OTP_DOOR.includes('landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "back" })') && !LOGIN.includes("isNew"));
  ok("A.24 ⛔ the one-time-code SIGN-UP is gone (no startRegisterOtpAction), and no literal target of the code door names /wallet/deposit or the identity form",
    !REG.includes("startRegisterOtpAction") && !codeTargets.some((t) => /\/wallet\/deposit|\/profile\/kyc/.test(t)), codeTargets.join(" · "));

  // ⭐ THE GREETING MUST FIRE ON THE LANDING (2026-10-06). `AuthFlash` is mounted on the /auth form too, and both
  // doors land by a server-action redirect — a soft navigation that keeps it mounted — so an effect keyed on mount
  // (`[]`) ran on the form and never on the landing: no greeting, and `welcome=` left in the address bar.
  const FLASH = decomment(read("src/components/layout/auth-flash.tsx"));
  const effectDeps = [...FLASH.matchAll(/useEffect\([\s\S]*?\},\s*(\[[^\]]*\])\s*\)/g)].map((m) => m[1]);
  const mountOnly = (deps: string[]) => deps.some((d) => /^\[\s*\]$/.test(d));
  console.log(`     AuthFlash effect deps: ${effectDeps.join(" · ") || "(none found)"}`);
  ok("A.25 control · AuthFlash's effect and its dependency list were found", effectDeps.length > 0, `${effectDeps.length} effect(s)`);
  ok("A.26 the greeting runs when the landing's `welcome` arrives, not once on mount", effectDeps.some((d) => /\bwelcome\b/.test(d)) && !mountOnly(effectDeps), effectDeps.join(" · "));
  ok("A.26b control · the matcher catches the mount-only shape", mountOnly(["[]"]) && mountOnly(["[ ]"]));
  ok("A.27 the param is cleared in place (history.replaceState) — never by a router navigation that re-requests the landing",
    /window\.history\.replaceState\(/.test(FLASH) && !/router\.(replace|push)\(/.test(FLASH));

  // ⭐ EVERY DOOR, ONE RULE. Four doors had four landing copies: a #pos_ fragment got the greeting appended INSIDE it, a
  // player with an /admin next looped to the staff form, and a sign-in with a destination was never greeted.
  const signInDoors = ["startLoginAction", "verifyLogin2faAction", "verifyLoginOtpAction"].map((n) => ({ n, b: fnOf(LOGIN, n) }));
  const offRule = signInDoors.filter((d) => d.b.length < 300 || !d.b.includes("landingAfterAuth(")).map((d) => `${d.n} (${d.b.length} chars)`);
  ok("A.28 every sign-in door — password, two-step and code — lands through landingAfterAuth", offRule.length === 0, offRule.join(", ") || "all three");
  const privateLanding = (src: string) => src.includes('safeNext || "/?welcome=back"') || src.includes('qs.set("welcome"');
  ok("A.28b ⛔ no door keeps a private landing copy: neither `safeNext || \"/?welcome=back\"` nor `qs.set(\"welcome\"` in the sign-in or sign-up actions",
    !privateLanding(LOGIN) && !privateLanding(REG));
  ok("A.28c control · the matcher fires on both retired shapes",
    privateLanding('redirect((safeNext || "/?welcome=back") as never);') && privateLanding('qs.set("welcome", "new");'));
  const staffWrong = landingWrong([
    [["PLAYER", "/admin/kyc", "back"], "/?welcome=back"], [["ADMIN", "/admin/kyc", "back"], "/admin/kyc"],
    [["COMPLIANCE", "/markets/mkt_a1", "back"], "/admin"], [["SUPPORT", "", "new"], "/admin"],
  ]);
  ok("A.30 ⭐ EXECUTED · staff land on an /admin next, else /admin; a player's /admin next is dropped (home, greeted) — never a loop to the staff form",
    staffWrong.length === 0, staffWrong.join(" | "));

  // C-X1 · a refused sign-up names its reason as a registry token (the form translates it; the service's English
  // sentence is not shown). EXECUTED against the real service — each refusal returns before any write.
  const signUp = async (phone: string, email: string, password: string, passwordConfirm: string) => {
    try {
      return (await registerWithPassword({ phone, email, password, passwordConfirm, dob: "1990-01-01", acceptTerms: true, acceptAge: true })) as
        { ok: boolean; code?: string; reason?: string };
    } catch (e) {
      return { ok: false, threw: (e as Error)?.message ?? String(e) } as { ok: boolean; code?: string; reason?: string; threw?: string };
    }
  };
  const REFUSED = ["+255745551001", "+255745551002", "+255745551003"];
  const weak = await signUp(REFUSED[0], "weak.pw@t.tz", "12345678", "12345678");
  const mismatch = await signUp(REFUSED[1], "mismatch.pw@t.tz", "Ladder-climb-2026-strong", "Ladder-climb-2026-strongX");
  const badEmail = await signUp(REFUSED[2], "abc@def", "Ladder-climb-2026-strong", "Ladder-climb-2026-strong");
  const refusedAs = (r: { ok: boolean; code?: string; reason?: string }, reason: string) => r.ok === false && r.code === "INVALID" && r.reason === reason;
  ok("A.31 C-X1 · a refused sign-up carries its registry reason — a breach-list password_weak, password_mismatch, email_invalid — code INVALID unchanged",
    refusedAs(weak, "password_weak") && refusedAs(mismatch, "password_mismatch") && refusedAs(badEmail, "email_invalid"), J([weak, mismatch, badEmail]));
  const made: string[] = [];
  for (const ph of REFUSED) if ((await db.user.findByPhone(ph)) !== null) made.push(ph);
  ok("A.31b …and none of the three refused sign-ups created an account", made.length === 0, made.join(", "));
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
  // ⭐ 2026-10-07: the pages ask `firstDepositNotice` (WHICH notice — identity, email or both); `firstDepositNoticeDue`
  // is its yes/no wrapper. Either name counts as asking the one predicate.
  const callers = files.filter((f) => f !== "src/lib/server/kyc-notice.ts" && /\bfirstDepositNotice(?:Due)?\s*\(/.test(code.get(f)!));
  ok("B2.4 the one predicate decides for both pages, and nobody else asks it",
    J(callers.sort()) === J(["src/app/wallet/deposit/return/page.tsx", "src/app/wallet/page.tsx"]), callers.join(", "));
  const rederives = (s: string) => /\b(kycGateState|kycNoticeStateDue)\s*\(/.test(s);
  ok("B2.5 ⛔ neither page re-derives who is due", !rederives(code.get("src/app/wallet/page.tsx")!) && !rederives(code.get("src/app/wallet/deposit/return/page.tsx")!));
  ok("B2.6 control · a page that re-derives it is caught", rederives("const due = kycNoticeStateDue(kycGateState(k));"));

  // 🔴 THE DISMISSAL IS BOUND TO THE PLAYER (2026-09-14, audit session 95, U2). A bare `dismissed` was read
  // with no user binding, so on a shared phone one player's X hid the notice from the next.
  const WALLET = code.get("src/app/wallet/page.tsx") ?? "", RETURN = code.get("src/app/wallet/deposit/return/page.tsx") ?? "";
  const handsRawCookie = (s: string) => /firstDepositNotice(?:Due)?\(\s*session\.userId,\s*\{\s*dismissCookie:\s*\(await cookies\(\)\)\.get\(KYC_NOTICE_COOKIE\)\?\.value\b/.test(s);
  ok("B2.7 both pages hand the RAW cookie to the one predicate — neither decides whose dismissal it is",
    handsRawCookie(WALLET) && (!existsSync(join(ROOT, "src/app/wallet/deposit/return/page.tsx")) || handsRawCookie(RETURN)));
  ok("B2.7c control · the matcher rejects the old unbound comparison",
    !handsRawCookie("firstDepositNoticeDue(session.userId, { dismissed: (await cookies()).get(KYC_NOTICE_COOKIE)?.value === KYC_NOTICE_DISMISSED })"));
  ok("B2.8 ★ the return page hands its notice the per-player value",
    !existsSync(join(ROOT, "src/app/wallet/deposit/return/page.tsx"))
      || /kycFirstDepositNotice\s*&&\s*<KycFirstDepositNotice\s+(?:variant=\{kycFirstDepositNotice\}\s+)?dismissValue=\{kycNoticeDismissValue\(session\.userId\)\}/.test(RETURN));
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
  // `email` is decided AT CREATE (never by a later `db.user.update`, which would join test:house-bot-holder-lifecycle's
  // shrink-only population of account-fact writers).
  const fixture = async (tag: string, kyc: K, deposits: string[], email: "confirmed" | "unconfirmed" | "none" = "confirmed") => {
    const id = `usr_kaw_notice_${tag}`;
    await db.user.create({
      id, phoneE164: `+25571${String(++s7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
      acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      email: email === "none" ? null : `${id}@t.tz`, emailVerifiedAt: email === "confirmed" ? now() : null,
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

  // ⭐ WHICH WORDING (owner ruling 2026-10-07: the confirmed email is asked quietly before a withdrawal, in this same note).
  // Every fixture above has a CONFIRMED address, so until the tests-and-records review these three wordings — and the two
  // "owes nothing" answers — were stated in the records and tested nowhere.
  const emailAs = (tag: string, kyc: K, email: "confirmed" | "unconfirmed" | "none", deposits = ["CONFIRMED"]) =>
    fixture(`e_${tag}`, kyc, deposits, email);
  const APPROVED: K = { status: "APPROVED", approvedAt: now(), documents: 3 };
  const WORDING: Array<[string, K, "confirmed" | "unconfirmed" | "none", string[], string | null]> = [
    ["identity_only", null, "confirmed", ["CONFIRMED"], "identity"],
    ["email_only", APPROVED, "unconfirmed", ["CONFIRMED"], "email"],
    ["no_address", APPROVED, "none", ["CONFIRMED"], "email"],
    ["both", null, "unconfirmed", ["CONFIRMED"], "both"],
    ["email_under_review", { status: "PENDING_REVIEW", documents: 3 }, "unconfirmed", ["CONFIRMED"], "email"],
    ["email_no_deposit", APPROVED, "unconfirmed", [], null],
    ["nothing_owed", APPROVED, "confirmed", ["CONFIRMED"], null],
  ];
  for (const [tag, kyc, email, deposits, want] of WORDING) {
    const got = await firstDepositNotice(await emailAs(tag, kyc, email, deposits), { dismissCookie: null });
    ok(`B7.w.${tag} → ${want ?? "none"}`, got === want, `got ${got}`);
  }
  ok("B7.w.missing · a missing account row owes NO email (nothing says it is unconfirmed) — identity alone",
    (await firstDepositNotice("usr_kaw_notice_missing_row", { dismissCookie: null, depositInHand: true })) === "identity");
  {
    const real = db.user.findById;
    (db.user as { findById: unknown }).findById = async () => { throw new Error("injected read failure"); };
    let got: unknown = "unset";
    try { got = await firstDepositNotice(await emailAs("read_fails", null, "unconfirmed"), { dismissCookie: null }); }
    finally { (db.user as { findById: unknown }).findById = real; }
    ok("B7.w.read-fails · ⛔ a failed account read is NO notice — never an identity or email prompt on a failed query", got === null, String(got));
  }

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
  // ⭐ THE EMAIL STEP RIDES THE SAME PANEL (2026-10-07, tests-and-records review). Unpinned, a page that stopped choosing
  // it would hand an unconfirmed player the form, and the action's EMAIL_UNVERIFIED hop would bounce them back to it.
  const emailBranch = (init: string, src: string) => /\?\?\s*\(\s*emailOwed\s*\?\s*"email"\s*:\s*null\s*\)/.test(init)
    && src.includes("const emailOwed = !account?.emailVerifiedAt;")
    && src.includes("const emailStanding = emailOwed ? { address: account?.email ?? null } : null;")
    && /<KycGatePanel\b[^>]*?\bemail=\{emailStanding\}/.test(src);
  ok("B10.2e ★ …identity settled and the address unconfirmed, the panel IS the email step; on an identity state it carries it",
    emailBranch(real.init, PAGE), flat(real.init));
  const noEmailPanel = PAGE.replace(/\?\?\s*\(\s*emailOwed\s*\?\s*"email"\s*:\s*null\s*\)/, "");
  ok("B10.2f control · a page that never chooses the email panel is caught",
    noEmailPanel !== PAGE && !emailBranch(formHeldBack(noEmailPanel).init, noEmailPanel));

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
