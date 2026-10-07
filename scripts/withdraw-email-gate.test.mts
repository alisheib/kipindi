/**
 * A CONFIRMED EMAIL BEFORE MONEY LEAVES — AND NOT BEFORE IT ARRIVES (owner ruling, Ali, 2026-10-07).
 *
 *   npm run test:withdraw-email-gate            RED: npm run red:withdraw-email-gate
 *
 * Ali: *"for deposits — even if no mail was there — remove the input to verify mail to deposit. It's fine, only
 * withdrawals are enforced to verify mail."* docs/COMPLIANCE-DECISIONS.md, § "2026-10-07 · A deposit asks no email; a
 * confirmed email is required to withdraw; receipts in the app (owner ruling)".
 *
 * The ladder: register → deposit and play → verify identity + confirm email → withdraw.
 *
 * SECTIONS
 *   §1  deposits ask no email — no address, an unconfirmed one, staff alike
 *   §2  a withdrawal with an unconfirmed address is REFUSED before anything moves, and the refusal is on record
 *   §3  no address at all: refused, told to ADD one
 *   §4  staff are not exempt, and neither is an officer's retry of a player's withdrawal
 *   §5  ORDER: identity is asked first — an unverified, unconfirmed account is refused on identity
 *   §6  confirming through the real link opens the withdrawal; changing the address closes it again
 *   §7  the officer's refused-funds return is exempt (its forfeit has already committed)
 *   §8  money email goes only to a confirmed address; the confirmation mail itself always goes
 *   §9  a card deposit with no address sends Selcom the per-player placeholder, never a refusal
 *   §10 the source has the shape the behaviour proves (a second net for the red harness)
 *
 * ⛔ Runs on the IN-MEMORY store (no DATABASE_URL). Every money call goes through `run()`, which turns a throw into a
 * result, so `red:withdraw-email-gate` always sees a FAIL line on its own named check, never a crash.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";
import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { setUserEmail, confirmEmailWithProof } from "../src/lib/server/email-verification.ts";
import { setPaymentControls } from "../src/lib/server/payment-control.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { emailOutbox, sendEmailToUser, depositConfirmedHtml, emailVerifyHtml, CANNOT_SIGN_IN } from "../src/lib/server/email.ts";
import { readBlockedEmailCashOuts, tallyBlockedCashOuts } from "../src/lib/server/kyc-risk.ts";
import { selcomCardCheckout, selcomPlaceholderEmail, type SelcomEnv } from "../src/lib/server/selcom.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);
const J = (v: unknown) => JSON.stringify(v);
const now = () => new Date().toISOString();
const settle = async () => { await auditFlush().catch(() => {}); await new Promise((r) => setTimeout(r, 30)); };

type R = { ok: boolean; code?: string; reason?: string; error?: string; data?: { txnId?: string; status?: string }; threw?: string };
async function run(f: () => Promise<unknown>): Promise<R> {
  try { return (await f()) as R; } catch (e) { return { ok: false, threw: (e as Error)?.message ?? String(e) }; }
}

await setPaymentControls({ provider: "mock" }, "test").catch(() => {});

let seq = 0;
const local = new Map<string, string>();
/** A funded account. `kyc` APPROVED by default (identity is the OTHER half, asked first). */
// `status` is set AT CREATE (never by a later `db.user.update`): a script that updates a user's status joins
// test:house-bot-holder-lifecycle's shrink-only population of account-fact writers.
async function account(id: string, opts: { email?: string | null; confirmed?: boolean; role?: string; kyc?: "APPROVED" | "NOT_STARTED" | "REJECTED_FINAL"; balance?: number; status?: string } = {}) {
  const digits = `76${String(++seq).padStart(7, "0")}`;
  local.set(id, digits);
  const email = opts.email === undefined ? `${id}@t.tz` : opts.email;
  await db.user.create({
    id, phoneE164: `+255${digits}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: opts.role ?? "PLAYER", status: opts.status ?? "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email, emailVerifiedAt: opts.confirmed ? now() : null,
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: opts.balance ?? 100_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
  const kyc = opts.kyc ?? "APPROVED";
  if (kyc !== "NOT_STARTED") {
    await db.kyc.upsert({
      id: `kyc_${id}`, userId: id, status: kyc === "APPROVED" ? "APPROVED" : "REJECTED",
      rejectReason: kyc === "REJECTED_FINAL" ? "UNDERAGE" : null, rejectNote: null,
      idType: "NIDA", idNumber: `199001014${String(seq).padStart(11, "0")}`, idExpiry: null, idVerifiedAt: now(),
      fullName: "Test Player", dob: "1990-01-01", documents: [], reviewerId: null, reviewedAt: now(), submittedAt: now(),
      approvedAt: kyc === "APPROVED" ? now() : null, createdAt: now(), updatedAt: now(),
    });
  }
}
const W = (id: string, amount = 20_000) => ({ provider: "MPESA" as const, amount, msisdn: local.get(id)! });
const wallet = async (id: string) => (await db.wallet.findByUserId(id))!;
const withdrawalRows = async (id: string) => (await db.txn.listForUser(id)).filter((t) => t.type === "WITHDRAWAL").length;
const blockedRows = (id: string) => getAuditForTarget("User", id).filter((e) => e.action === "withdraw.email_unverified_blocked");

// ── §1 ────────────────────────────────────────────────────────────────────────────────────────────
section("§1 · a deposit asks no email — no address, an unconfirmed one, staff alike");
for (const [id, opts] of [
  ["weg_dep_none", { email: null }], ["weg_dep_unconfirmed", { confirmed: false }], ["weg_dep_admin", { confirmed: false, role: "ADMIN" }],
] as const) {
  await account(id, { ...opts, balance: 0 });
  const r = await run(() => deposit(id, { provider: "MPESA", amount: 5_000, msisdn: local.get(id)! }));
  ok(`1.${id} · the deposit goes through`, r.ok, J(r));
}

// ── §2 ────────────────────────────────────────────────────────────────────────────────────────────
section("§2 · an unconfirmed address: the withdrawal is refused before anything moves, and recorded");
{
  const id = "weg_unconfirmed";
  await account(id, { confirmed: false });
  const before = await wallet(id);
  const r = await run(() => withdraw(id, W(id)));
  await settle();
  const after = await wallet(id);
  ok("2.1 ★ refused with EMAIL_UNVERIFIED / email_unverified", !r.ok && r.code === "EMAIL_UNVERIFIED" && r.reason === "email_unverified", J(r));
  ok("2.2 the sentence tells the player to CONFIRM the address and when", !r.ok && /confirm your email address before you withdraw/i.test(r.error ?? ""), r.error);
  ok("2.3 nothing moved — no hold, no WITHDRAWAL row", after.balance === before.balance && after.hold === 0 && (await withdrawalRows(id)) === 0,
    `${before.balance}→${after.balance} · hold ${after.hold}`);
  const row = blockedRows(id)[0];
  ok("2.4 ⭐ one COMPLIANCE row withdraw.email_unverified_blocked, citing the 2026-10-07 ruling",
    blockedRows(id).length === 1 && row?.category === "COMPLIANCE" && /2026-10-07/.test(String(row?.payload?.instruction)), J(row?.payload ?? null));
  ok("2.5 …carrying hasEmail, the amount, the provider and who asked", row?.payload?.hasEmail === true && row?.payload?.amount === 20_000
    && row?.payload?.provider === "MPESA" && row?.payload?.operatorInitiated === false && row?.payload?.onBehalfOf === id, J(row?.payload ?? null));
  const bell = await db.notification.findByUser(id, 50);
  const mail = emailOutbox().filter((m) => m.to === `${id}@t.tz`);
  ok("2.6 ⛔ the refusal notifies, mails and prompts nobody — the withdraw screen is its only voice", bell.length === 0 && mail.length === 0,
    `bell ${bell.length} · mail ${mail.length}`);
}

// ── §3 ────────────────────────────────────────────────────────────────────────────────────────────
section("§3 · no address at all: refused, and told to ADD one");
{
  const id = "weg_noemail";
  await account(id, { email: null });
  const r = await run(() => withdraw(id, W(id)));
  await settle();
  ok("3.1 refused with EMAIL_UNVERIFIED", !r.ok && r.code === "EMAIL_UNVERIFIED", J(r));
  ok("3.2 …and asked to ADD an address, not to confirm a missing one", !r.ok && /add an email address/i.test(r.error ?? ""), r.error);
  ok("3.3 the record says there was no address", blockedRows(id)[0]?.payload?.hasEmail === false, J(blockedRows(id)[0]?.payload ?? null));
}

// ── §4 ────────────────────────────────────────────────────────────────────────────────────────────
section("§4 · staff are not exempt, and neither is an officer's retry of a player's withdrawal");
for (const role of ["ADMIN", "COMPLIANCE"]) {
  const id = `weg_staff_${role.toLowerCase()}`;
  await account(id, { confirmed: false, role });
  const r = await run(() => withdraw(id, W(id)));
  ok(`4.${role} · a ${role} account with an unconfirmed email is refused too`, !r.ok && r.code === "EMAIL_UNVERIFIED", J(r));
}
{
  const id = "weg_retry";
  await account(id, { confirmed: false });
  const r = await run(() => withdraw(id, W(id), undefined, "officer_retry"));
  await settle();
  ok("4.retry · ★ an officer re-sending a player's withdrawal meets the same rule", !r.ok && r.code === "EMAIL_UNVERIFIED", J(r));
  ok("4.retry · …recorded as operator-initiated, kept apart from the player's own attempts",
    blockedRows(id)[0]?.payload?.operatorInitiated === true && blockedRows(id)[0]?.actorId === "officer_retry", J(blockedRows(id)[0] ?? null));
  // The officer's /admin/kyc line reads THESE rows (`readBlockedEmailCashOuts` → `tallyBlockedCashOuts`): untested until the
  // tests-and-records review. The player's refusals are the count; the officer's retry stands beside it, never inside.
  const read = await readBlockedEmailCashOuts();
  const week = tallyBlockedCashOuts(read, Date.now() - 7 * 86_400_000);
  ok("4.count · ★ the officer page's count reads these refusals: the player's own (§2) counted, the officer's retry apart",
    read.rows.some((x) => x.userId === "weg_unconfirmed" && !x.operatorInitiated) && read.rows.some((x) => x.userId === id && x.operatorInitiated)
      && week.attempts >= 1 && week.operatorRetries >= 1 && week.players >= 1, J(week));
}

// ── §5 ────────────────────────────────────────────────────────────────────────────────────────────
section("§5 · ORDER: identity first, then the email");
{
  const id = "weg_order";
  await account(id, { confirmed: false, kyc: "NOT_STARTED" });
  const r = await run(() => withdraw(id, W(id)));
  await settle();
  ok("5.1 ★ unverified AND unconfirmed: refused on IDENTITY — the step the screen shows first",
    !r.ok && r.reason === "kyc_not_verified" && r.code !== "EMAIL_UNVERIFIED", J(r));
  ok("5.2 …and the email refusal was not recorded for that attempt", blockedRows(id).length === 0, `${blockedRows(id).length} row(s)`);
}

// ── §6 ────────────────────────────────────────────────────────────────────────────────────────────
section("§6 · confirming through the real link opens the withdrawal; changing the address closes it again");
{
  const id = "weg_confirm";
  await account(id, { email: null });
  const set = await setUserEmail(id, "weg.confirm@t.tz");
  ok("6.0 fixture · the address is set through the single writer", set.ok, J(set));
  const mail = emailOutbox().find((m) => m.to === "weg.confirm@t.tz" && /Confirm your email/i.test(m.subject));
  const token = mail ? decodeURIComponent((/token=([^"'&\s<]+)/.exec(mail.html) ?? [])[1] ?? "") : "";
  ok("6.1 the confirmation mail went to the new, unconfirmed address", !!mail && token.length > 20, mail?.subject ?? "no mail");
  const refused = await run(() => withdraw(id, W(id)));
  ok("6.2 before the link is opened: refused", !refused.ok && refused.code === "EMAIL_UNVERIFIED", J(refused));
  const v = await confirmEmailWithProof(token, { sessionUserId: id, password: null });
  ok("6.3 the link, opened in the account's own session, confirms it", v.status === "verified", J(v));
  const before = await wallet(id);
  const paid = await run(() => withdraw(id, W(id)));
  ok("6.4 ★ …and the same withdrawal now goes through", paid.ok && (await wallet(id)).balance === before.balance - 20_000, J(paid));
  const moved = await setUserEmail(id, "weg.moved@t.tz");
  ok("6.5 a new address clears the confirmation", moved.ok && !(await db.user.findById(id))?.emailVerifiedAt, J(moved));
  const again = await run(() => withdraw(id, W(id)));
  ok("6.6 ★ …and the next withdrawal is refused until the NEW address is confirmed", !again.ok && again.code === "EMAIL_UNVERIFIED", J(again));
}

// ── §7 ────────────────────────────────────────────────────────────────────────────────────────────
section("§7 · the officer's refused-funds return is exempt");
{
  const id = "weg_refund";
  await account(id, { confirmed: false, kyc: "REJECTED_FINAL", balance: 30_000 });
  const r = await run(() => withdraw(id, W(id, 20_000), undefined, "officer_refund", { refusedFundsReturn: { decisionId: "rfd_weg_1" } }));
  await settle();
  ok("7.1 ★ a return to a finally refused player with an UNCONFIRMED email still leaves", r.ok, J(r));
  ok("7.2 …and no email refusal was recorded for it", blockedRows(id).length === 0, `${blockedRows(id).length} row(s)`);
}

// ── §8 ────────────────────────────────────────────────────────────────────────────────────────────
section("§8 · money email goes only to a confirmed address; the confirmation mail always goes");
{
  await account("weg_mail_unconfirmed", { email: "weg.mail.u@t.tz", confirmed: false, balance: 0 });
  await account("weg_mail_confirmed", { email: "weg.mail.c@t.tz", confirmed: true, balance: 0 });
  const build = (to: string) => ({ to, subject: "Deposit confirmed · test", html: depositConfirmedHtml({ amount: 5_000, reference: "txn_weg", method: "M-Pesa" } as never), tag: "deposit" });
  const u = await sendEmailToUser("weg_mail_unconfirmed", build, { confirmedOnly: true });
  ok("8.1 ★ a money mail to an UNCONFIRMED address is withheld, with its own reason", !u.ok && u.reason === "unconfirmed", J(u));
  ok("8.2 …and nothing reached the outbox for it", !emailOutbox().some((m) => m.to === "weg.mail.u@t.tz" && /Deposit confirmed/.test(m.subject)));
  const c = await sendEmailToUser("weg_mail_confirmed", build, { confirmedOnly: true });
  ok("8.3 a confirmed address receives it", c.reason !== "unconfirmed" && emailOutbox().some((m) => m.to === "weg.mail.c@t.tz" && /Deposit confirmed/.test(m.subject)), J(c));
  const v = await sendEmailToUser("weg_mail_unconfirmed", (to) => ({ to, subject: "Confirm your email · test", html: emailVerifyHtml({ verifyUrl: "https://50pick.tz/auth/verify-email?token=x" }), tag: "email-verify" }));
  ok("8.4 ⛔ the confirmation mail (no flag) still reaches the unconfirmed address — it is how it gets confirmed",
    v.reason !== "unconfirmed" && emailOutbox().some((m) => m.to === "weg.mail.u@t.tz" && /Confirm your email/.test(m.subject)), J(v));
  // The operator override map is never a money-mail destination.
  await account("weg_mail_mapped", { email: null, balance: 0 });
  const phone = (await db.user.findById("weg_mail_mapped"))!.phoneE164;
  const prev = process.env.PHONE_EMAIL_MAP;
  process.env.PHONE_EMAIL_MAP = `${phone}:weg.mapped@t.tz`;
  const m = await sendEmailToUser("weg_mail_mapped", build, { confirmedOnly: true });
  const plain = await sendEmailToUser("weg_mail_mapped", (to) => ({ to, subject: "Plain notice · test", html: "<p>x</p>", tag: "notice" }));
  if (prev === undefined) delete process.env.PHONE_EMAIL_MAP; else process.env.PHONE_EMAIL_MAP = prev;
  ok("8.5 ⛔ PHONE_EMAIL_MAP is never used for money mail", !m.ok && !emailOutbox().some((x) => x.to === "weg.mapped@t.tz" && /Deposit confirmed/.test(x.subject)), J(m));
  ok("8.6 control · …while a non-money mail still resolves through it", emailOutbox().some((x) => x.to === "weg.mapped@t.tz" && /Plain notice/.test(x.subject)), J(plain));

  // ⭐ A PLAYER WHO CANNOT SIGN IN (money-and-compliance review, 2026-10-07): the bell and the receipts are out of reach,
  // so the letter goes to the address on file even unconfirmed — otherwise a deposit reversed during an exclusion is
  // told to nobody. A break is NOT such a status: that player signs in and reads the bell.
  const locked: string[] = [];
  for (const status of ["SELF_EXCLUDED", "CLOSED", "SUSPENDED"]) {
    const id = `weg_mail_${status.toLowerCase()}`;
    await account(id, { email: `${id}@t.tz`, confirmed: false, balance: 0, status });
    const r = await sendEmailToUser(id, build, { confirmedOnly: true });
    if (r.reason !== "unconfirmed" && emailOutbox().some((m) => m.to === `${id}@t.tz` && /Deposit confirmed/.test(m.subject))) locked.push(status);
  }
  ok("8.7 ★ an account that cannot sign in (self-excluded, closed, suspended) IS mailed at its unconfirmed address — the letter is the only notice it can read",
    locked.length === 3, J(locked));
  await account("weg_mail_break", { email: "weg.mail.break@t.tz", confirmed: false, balance: 0, status: "COOLED_OFF" });
  const brk = await sendEmailToUser("weg_mail_break", build, { confirmedOnly: true });
  ok("8.8 control · a player on a BREAK signs in and reads the bell, so the rule holds for them: withheld",
    !brk.ok && brk.reason === "unconfirmed", J(brk));
  const auth = readFileSync(new URL("../src/lib/server/auth-service.ts", import.meta.url), "utf8");
  ok("8.9 the list is the sign-in gate's own: SUSPENDED and CLOSED refused outright, SELF_EXCLUDED after it, COOLED_OFF absent",
    J([...CANNOT_SIGN_IN].sort()) === J(["CLOSED", "SELF_EXCLUDED", "SUSPENDED"])
      && auth.includes('if (user.status === "SUSPENDED" || user.status === "CLOSED") {') && auth.includes('if (user.status !== "SELF_EXCLUDED") return null;'));
}

// ── §9 ────────────────────────────────────────────────────────────────────────────────────────────
section("§9 · a card deposit with no address sends Selcom the per-player placeholder");
{
  const ENV: SelcomEnv = { baseUrl: "https://apigw.example.test/v1", apiKey: "k", apiSecret: "s", vendor: "SW00000000", webhookUrl: "https://www.50pick.tz/api/webhooks/payments", timeoutMs: 5_000 };
  const bodies: Record<string, unknown>[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(init?.body ? JSON.parse(String(init.body)) : {});
    return new Response(JSON.stringify({ reference: "r", resultcode: "000", result: "SUCCESS", message: "ok",
      data: [{ gateway_buyer_uuid: "1", payment_token: "2", payment_gateway_url: Buffer.from("https://checkout.example/x").toString("base64") }] }),
      { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const base = { orderId: "dep_weg", amount: 10_000, buyerName: "Asha Mrisho", buyerPhone: "0712345678",
    billing: { firstName: "Asha", lastName: "Mrisho", address1: "1 Road", city: "Dar", stateOrRegion: "Dar", postcodeOrPobox: "1", country: "TZ", phone: "+255712345678" },
    redirectUrl: "https://www.50pick.tz/wallet/deposit/return", cancelUrl: "https://www.50pick.tz/wallet/deposit/return?cancelled=1" };
  const none = await run(() => selcomCardCheckout(ENV, { ...base, buyerEmail: null, userId: "usr_weg_card" }));
  const own = await run(() => selcomCardCheckout(ENV, { ...base, buyerEmail: "asha@example.com", userId: "usr_weg_card" }));
  globalThis.fetch = real;
  ok("9.1 ★ no address on file: the order still goes, carrying the placeholder", none.ok && bodies[0]?.buyer_email === selcomPlaceholderEmail("usr_weg_card")
    && selcomPlaceholderEmail("usr_weg_card") === "usr_weg_card@users.50pick.tz", J(bodies[0]?.buyer_email));
  ok("9.2 an address on file is sent as it is", own.ok && bodies[1]?.buyer_email === "asha@example.com", J(bodies[1]?.buyer_email));
  const action = decomment(readFileSync(new URL("../src/app/wallet/deposit/actions.ts", import.meta.url), "utf8"));
  ok("9.3 ⛔ the deposit action no longer refuses a card deposit for a missing address", !/emailForCard|EMAIL_UNVERIFIED/.test(action));
}

// ── §10 ───────────────────────────────────────────────────────────────────────────────────────────
section("§10 · the source has the shape the behaviour proves");
{
  const WALLET = decomment(readFileSync(new URL("../src/lib/server/wallet-service.ts", import.meta.url), "utf8"));
  const fnBody = (head: string) => { const i = WALLET.indexOf(head); const j = WALLET.indexOf("\nexport ", i + head.length); return i < 0 ? "" : WALLET.slice(i, j < 0 ? undefined : j); };
  const DEP = fnBody("export async function deposit(");
  const WD = fnBody("export async function withdraw(");
  ok("10.1 deposit() asks no email question", DEP.length > 2_000 && !/emailVerifiedAt\s*\)|email_unverified_blocked|EMAIL_UNVERIFIED/.test(DEP.replace(/emailConfirmed:\s*!!depositor\?\.emailVerifiedAt/, "")));
  const iIdentity = WD.indexOf("assertIdentityForPayout(userId)");
  const iEmail = WD.indexOf("withdraw.email_unverified_blocked");
  const iFee = WD.indexOf("computeWithdrawalFee(");
  ok("10.2 withdraw() asks identity, THEN the email, THEN works out the fee", iIdentity > 0 && iEmail > iIdentity && iFee > iEmail,
    `identity@${iIdentity} email@${iEmail} fee@${iFee}`);
}

// ── §11 ───────────────────────────────────────────────────────────────────────────────────────────
// ⭐ THE CLAIM, NOT THE PHRASE. The deleted door is the easy regression to see; the hard one is a SENTENCE that teaches it
// — "confirm your email to add money", in any of three languages, in the dictionary, the legal pages or the chat
// assistant. A sentence is a hit when it names an email, names money coming IN, and states a requirement or a sequence —
// unless it denies it ("a deposit asks for no email"). Shown the sentences it must reject and accept, per language.
section("§11 · no surface teaches that a deposit needs an email (the claim, in three languages)");
{
  type L = "en" | "sw" | "zh";
  /**
   * ⭐ STRENGTHENED 2026-10-07 (tests-and-records review): the first version missed 7 of the 11 English strings this change
   * deleted. Its deny list exempted ANY sentence with no/not/n't — so "Email not confirmed — deposits locked." passed —
   * its requirement words had no "until" / "as soon as" / "locked", `\bemail\b` did not match "emailed", and a claim
   * split across two sentences ("…the email address below. Open it, then come back here to add money.") was never seen.
   * So: the exemption is SCOPED to a negated requirement ("asks for no email", "need not", 无需邮箱), never a bare "not";
   * the lock and wait words are requirement words; and each string is read per sentence AND as a whole for the
   * email → then → money sequence. Every deleted string is a reject fixture below, so the guard is measured against the
   * exact sentences it exists to keep out.
   */
  const RULE: Record<L, { email: RegExp; entrance: RegExp; req: RegExp; accept: RegExp; seq: RegExp }> = {
    en: { email: /\be-?mail\w*|\binbox\b/i,
      entrance: /\b(?:deposit(?:s|ed|ing)?|add(?:s|ed|ing)? (?:money|funds)|adding money|top(?:s|ped|ping)?[- ]?ups?|fund your|pay(?:ing)? by card)\b/i,
      req: /\b(?:before|then|first|once|unlock\w*|locked|needs?|needed|requires?|required|must|have to|until|as soon as|to (?:deposit|add money|add funds))\b|\bcan(?:no|['’])t (?:deposit|add)/i,
      accept: /\basks? (?:for )?no e-?mail|\bno e-?mail (?:is )?(?:needed|required|asked)|\bwithout an? e-?mail|\bneeds? no e-?mail|\bneed not\b|\bdo(?:es)?(?:n['’]t| not) need an? e-?mail|\bnever (?:ask|tell)\w*/i,
      seq: /\be-?mail\w*[^]*?\b(?:then|and then)\b[^]*?\b(?:add money|add funds|deposit\w*|start playing)\b/i },
    sw: { email: /barua pepe/i,
      entrance: /\b(?:kuweka (?:pesa|fedha)|amana|weka (?:pesa|fedha)|uweke (?:pesa|fedha)|kuongeza (?:pesa|fedha)|kulipa kwa kadi)\b/i,
      req: /\b(?:kabla|kisha|kwanza|ili|lazima|inahitajika|unahitaji|ihitajika|mara|hadi|mpaka|huwezi|hufunguka|imefungwa|zimefungwa)\b/i,
      accept: /\b(?:haihitaji|haiulizi|haiombi|bila) barua pepe|\bamana haihitaji\b/i,
      seq: /barua pepe[^]*?\bkisha\b[^]*?\b(?:weka|uweke|kuweka) (?:pesa|fedha)/i },
    zh: { email: /邮箱|电子邮件|邮件/,
      entrance: /充值|存款|入金|银行卡支付/,
      req: /前|然后|后即可|即可|才能|才可|需要|必须|先|暂无法|无法充值|确认后/,
      accept: /无需邮箱|无须邮箱|不需要邮箱|不用邮箱|充值无需|不要求邮箱|无需提供邮箱/,
      seq: /邮箱[^]*?然后[^]*?充值/ },
  };
  const flat = (t: string) => t.replace(/\s+/g, " ");
  const sentences = (t: string, loc: L) => (loc === "zh" ? flat(t).split(/[。！？；]/) : flat(t).split(/(?<=[.!?])\s+/)).map((x) => x.trim()).filter(Boolean);
  /**
   * ⛔ EXEMPT BY NAME, WITH THE REASON — never by loosening the rule. The Privacy notice's Selcom line DISCLOSES what a
   * card deposit shares with the gateway ("for a card deposit, also your email address…"): a statement of data flow, not
   * a requirement, and still true for every account that has an address (one with none sends a per-player placeholder,
   * which is no personal data). Privacy is versioned text this change deliberately left as it is (2026-10-07).
   */
  const EXEMPT = [/^Selcom, our payment gateway, which processes deposits and withdrawals/, /^Selcom, lango letu la malipo, linaloshughulikia kuweka na kutoa fedha/];
  const hit = (loc: L, t: string) => {
    const r = RULE[loc];
    const out = sentences(t, loc).filter((s) =>
      r.email.test(s) && r.entrance.test(s) && r.req.test(s) && !r.accept.test(s) && !EXEMPT.some((e) => e.test(s)));
    // The whole string, for the claim that spans sentences: email → then → money.
    const whole = flat(t);
    if (!out.length && r.seq.test(whole) && !r.accept.test(whole) && !EXEMPT.some((e) => e.test(whole))) out.push(whole);
    return out;
  };
  const reject: [L, string][] = [
    ["en", "Confirm your email to add money and play."], ["en", "Verify your email first to deposit."],
    ["en", "Once your email is confirmed you can deposit."], ["sw", "Thibitisha barua pepe yako ili kuweka pesa na kucheza."],
    ["sw", "Kabla ya kuweka pesa, thibitisha barua pepe yako."], ["zh", "验证邮箱后即可充值和投注。"], ["zh", "充值前请先确认邮箱。"],
    ["en", "You can't deposit until your email is confirmed."], ["en", "Deposits stay locked until you confirm your email."],
    // Every string this change DELETED, verbatim from c9b17053 (the guard is measured against what it keeps out).
    ["en", "You\u2019re in. Open the link we emailed you, then add money and start playing."],
    ["en", "Add and confirm your email address before paying by card."],
    ["en", "Confirm your email to deposit"],
    ["en", "We sent a confirmation link to the email address below. Open it, then come back here to add money."],
    ["en", "Browsing stays open. Adding money opens as soon as your email is confirmed."],
    ["en", "Email not confirmed — deposits locked."], ["en", "No email on file — deposits locked."],
    ["sw", "Umeingia. Fungua kiungo tulichokutumia kwa barua pepe, kisha weka pesa uanze kucheza."],
    ["sw", "Weka na uthibitishe barua pepe yako kabla ya kulipa kwa kadi."],
    ["sw", "Thibitisha barua pepe yako ili kuweka fedha"],
    ["sw", "Tumetuma kiungo cha uthibitisho kwenye anwani ya barua pepe iliyo hapa chini. Kifungue, kisha rudi hapa uweke pesa."],
    ["sw", "Kuvinjari kunaendelea. Kuweka pesa hufunguka mara barua pepe yako inapothibitishwa."],
    ["sw", "Barua pepe haijathibitishwa — huwezi kuweka fedha."], ["sw", "Hakuna barua pepe — huwezi kuweka fedha."],
    ["zh", "您已注册。请打开我们发送到您邮箱的链接，然后即可充值开始游戏。"], ["zh", "使用银行卡支付前，请添加并确认您的电子邮箱。"],
    ["zh", "确认邮箱后即可充值"], ["zh", "我们已向下方显示的邮箱发送确认链接。请您打开该链接，然后返回此页面即可充值。"],
    ["zh", "浏览不受限制。邮箱确认后即可充值。"], ["zh", "邮箱未确认——暂无法充值。"], ["zh", "未绑定邮箱——暂无法充值。"],
  ];
  const accept: [L, string][] = [
    ["en", "A deposit asks for no email."], ["en", "Before you withdraw, confirm your email address."],
    ["en", "Never tell a player they must add or confirm an email to deposit — they need not."],
    ["sw", "Kabla ya kutoa pesa, thibitisha barua pepe yako."], ["sw", "Amana haihitaji barua pepe."],
    ["zh", "提现前请确认您的邮箱。"], ["zh", "充值无需邮箱。"],
  ];
  for (const [loc, t] of reject) ok(`11.c.${loc} · REJECTS "${t.slice(0, 44)}"`, hit(loc, t).length > 0);
  for (const [loc, t] of accept) ok(`11.c.${loc} · accepts "${t.slice(0, 44)}"`, hit(loc, t).length === 0, hit(loc, t).join(" | "));

  // The population: every string leaf of the dictionary per locale, the legal pages, the live prompt and the offline answers.
  const leaves = (o: unknown, out: string[] = []): string[] => {
    if (typeof o === "string") out.push(o);
    else if (o && typeof o === "object") for (const v of Object.values(o as Record<string, unknown>)) leaves(v, out);
    return out;
  };
  const { dict } = await import("../src/lib/i18n-dict.ts");
  const found: string[] = [];
  for (const loc of ["en", "sw", "zh"] as const) {
    const all = leaves((dict as unknown as Record<string, unknown>)[loc]);
    ok(`11.0.${loc} · the dictionary was read (${all.length} strings)`, all.length > 2_000);
    for (const t of all) for (const s of hit(loc, t)) found.push(`dict.${loc}: ${s.slice(0, 120)}`);
  }
  const LEGAL = ["terms/page.tsx", "privacy/page.tsx", "aml/page.tsx", "responsible-gambling/page.tsx", "agent-terms/page.tsx",
    "rules/_content-yes-no.tsx", "rules/_content-up-down.tsx", "rules/page.tsx"];
  let legalChars = 0;
  for (const f of LEGAL) {
    // A BLOCK tag (list item, paragraph, heading, cell, a component) ends a sentence — list items carry no full stop, and
    // run together they make one "sentence" naming email and deposits in different items. An INLINE tag (a, strong, em,
    // span, code) is a space, and whitespace is collapsed (in `sentences`), so a sentence wrapping across JSX lines is whole.
    const text = decomment(readFileSync(new URL(`../src/app/legal/${f}`, import.meta.url), "utf8"))
      .replace(/<\/?(?:a|strong|em|b|i|span|code|abbr|small|sup|sub)\b[^>]*>/g, " ")
      .replace(/<[^>]+>/g, ". ")
      .replace(/\{[^}]*\}/g, " ");
    legalChars += text.length;
    // Per sentence only: a whole legal page would make the cross-sentence reading meaningless.
    for (const loc of ["en", "sw", "zh"] as const) for (const s of sentences(text, loc)) for (const h of hit(loc, s)) found.push(`legal/${f} (${loc}): ${h.slice(0, 120)}`);
  }
  ok("11.0.legal · the legal pages were read (non-vacuous)", legalChars > 20_000, String(legalChars));
  for (const f of ["src/app/_actions/chat.ts", "src/lib/chat/send-message.ts"]) {
    const text = decomment(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));
    for (const s of sentences(text, "en")) for (const h of hit("en", s)) found.push(`${f}: ${h.slice(0, 120)}`);
  }
  ok("11.1 ★ no sentence anywhere teaches that a deposit needs an email (owner ruling 2026-10-07)", found.length === 0, found.join(" | "));
}

console.log(`\nwithdraw-email-gate: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
