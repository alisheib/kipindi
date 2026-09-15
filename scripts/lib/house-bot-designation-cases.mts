/**
 * The case list behind `test:house-bot-designation`. Run by that suite in two child processes — one on Postgres,
 * one on the memory store — never on its own. Source pins run in the memory child only (they read files, not a
 * store).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadWorld, OFFICER } from "./house-bot-world.mts";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const j = (v: unknown) => JSON.stringify(v)?.slice(0, 220) ?? String(v);

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

const w = await loadWorld();
const D: Any = await import("../../src/lib/server/house-bot/designation.ts");
const E: Any = await import("../../src/lib/server/house-bot/eligibility.ts");
const A: Any = await import("../../src/lib/server/house-bot/alerts.ts");
const C: Any = await import("../../src/lib/house-bot/consent.ts");
const R: Any = await import("../../src/lib/house-bot/rules.ts");
const { withLock }: Any = await import("../../src/lib/server/locks.ts");
const { hashPassword, randomId, signSession }: Any = await import("../../src/lib/server/crypto.ts");
const PR: Any = await import("../../src/lib/server/password-reset.ts");
const { setUserEmail }: Any = await import("../../src/lib/server/email-verification.ts");
const { auditFlush, getAuditPage }: Any = await import("../../src/lib/server/audit.ts");
const { getActiveSessionId, setActiveSessionId }: Any = await import("../../src/lib/server/session-registry.ts");
const RG: Any = await import("../../src/lib/server/responsible-gambling.ts");
const { removeWalletFreeze }: Any = await import("../../src/lib/server/wallet-freeze.ts");
const { fileDsarRequest, fulfillDsarRequest, listDsarRequests }: Any = await import("../../src/lib/server/privacy.ts");
const N: Any = await import("../../src/lib/server/notification-service.ts");
const { MONEY_KINDS, NOTIFICATION_KINDS }: Any = await import("../../src/lib/server/comms-registry.ts");
const { MARKET_CATEGORIES }: Any = await import("../../src/lib/markets/categories.ts");
const { ALLOWED_DURATIONS }: Any = await import("../../src/lib/updown-durations.ts");
const { LOCKOUT_MAX_FAILS }: Any = await import("../../src/lib/server/auth-service.ts");
const rlReset = () => (globalThis as Any).__50PICK_RL_RESET_HOOK?.();

ok(`0.store · the stores run on ${STORE}`, w.onPostgres === (STORE === "postgres"));
await w.user({ id: OFFICER, role: "ADMIN" });
await w.limits();

const PW = "Tembo-Kubwa-2026!";
const PW2 = "Simba-Ndogo-2027?";
const PW3 = "Twiga-Mrefu-2028#";
const RATES = { freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 };
const CTX = {
  stakeBounds: { minTzs: 1_000, maxTzs: 1_000_000 }, betPlaceRefillPerMin: 10,
  chains: [{ key: "BTC:3", label: "BTC 3-min", durationMinutes: 3 }], categories: MARKET_CATEGORIES, durations: ALLOWED_DURATIONS,
  exitRates: { polls: RATES, updown: { "BTC:3": RATES } }, pollMinLifetimeMin: 120, limits: null, bots: [],
};

/** A player with a REAL password (salted scrypt) and a written history. */
async function holder(o: { balance?: number; via?: string | null; password?: string; role?: string } = {}): Promise<string> {
  const id = await w.user({ balance: o.balance ?? 5_000_000, role: o.role });
  const salt = randomId(16);
  await w.setUserFields(id, {
    passwordHash: await hashPassword(o.password ?? PW, salt), passwordSalt: salt,
    passwordSetAt: new Date().toISOString(), passwordSetVia: o.via === undefined ? "SELF_CHANGE" : o.via,
    email: `${id}@test.tz`, emailVerifiedAt: new Date().toISOString(),
  });
  return id;
}
const user = (id: string) => w.db.user.findById(id) as Promise<Any>;
const bot = (id: string) => w.dal.houseBotStore.get(id) as Promise<Any>;
const events = async (botId: string) => (await w.dal.houseBotEventStore.listByBot(botId, { limit: 100 })).rows as Any[];
const houseRows = async (uid: string) => ((await w.db.notification.findByUser(uid, 500)) as Any[]).filter((n) => n.kind === "HOUSE_BOT");
const audits = async (pred: (e: Any) => boolean) => { await auditFlush(); return (getAuditPage({ limit: 10_000 }) as Any[]).filter(pred); };

async function clearRoster(): Promise<void> {
  for (const b of await w.dal.houseBotStore.listNonRemoved()) {
    await w.dal.houseBotStore.setStatus(b.id, { from: [b.status], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: OFFICER, reason: "fixture", cause: "MANUAL" } });
  }
}
let labelSeq = 0;
const desig = (userId: string, o: Any = {}) => D.designateHouseBot({ officerId: OFFICER, userId, label: o.label ?? `Desk ${STORE.slice(0, 2)} ${++labelSeq}`, note: o.note ?? null, password: o.password ?? PW, submitId: o.submitId ?? null });
const verify = (userId: string, password: string, o: Any = {}) => D.verifyHouseBotPassword({ officerId: o.officerId ?? OFFICER, userId, password, botId: o.botId ?? null, submitId: o.submitId ?? null });
const reverify = (botId: string, password: string, o: Any = {}) => D.reverifyHouseBot({ officerId: OFFICER, botId, password, submitId: o.submitId ?? null });
const start = (botId: string) => D.startHouseBot({ officerId: OFFICER, botId, rulesContext: CTX });

/** Saved rules and caps a Start accepts: polls, one category, FILL on, the 20 s min-gap floor. */
async function makeStartable(botId: string): Promise<void> {
  const b = await bot(botId);
  const r = structuredClone(R.DEFAULT_RULES_V1(CTX));
  r.scope.products.polls = true;
  r.scope.categories = ["sports"];
  r.modes.polls.fill = true;
  const s = await w.dal.houseBotStore.saveRules(botId, b.rulesVersion, { rules: r, ...w.OPEN_CAPS, freqMinGapSec: 20 });
  if (!s.ok) throw new Error("makeStartable: CAS failed");
}
/** Designate + startable + started. */
async function runningBot(o: Any = {}): Promise<{ botId: string; userId: string }> {
  await clearRoster();
  const userId = await holder(o);
  const d = await desig(userId, o);
  if (!d.ok) throw new Error(`runningBot: designate refused ${j(d)}`);
  await makeStartable(d.bot.id);
  rlReset();
  const s = await start(d.bot.id);
  if (!s.ok) throw new Error(`runningBot: start refused ${j(s)}`);
  return { botId: d.bot.id, userId };
}
async function target(botId: string, marketId: string): Promise<Any> {
  return w.dal.targetStore.insert({
    id: w.dal.newHouseId("target"), houseBotId: botId, marketId, delayMinSec: 5, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "FIRST",
    createdById: OFFICER, snapshot: { titleEn: "Target poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
  });
}
/** Hold `wallet:<userId>` while `run` passes its password check, change the password meanwhile, then release. */
async function interleave(userId: string, run: () => Promise<Any>, meanwhile: () => Promise<void>): Promise<Any> {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let entered!: () => void;
  const holding = new Promise<void>((r) => { entered = r; });
  const held = withLock(`wallet:${userId}`, async () => { entered(); await gate; });
  await holding;
  const since = Date.now() - 5;
  const p = run();
  let seen = false;
  for (let i = 0; i < 600 && !seen; i++) {
    seen = (await audits((e) => e.action === "house_bot.password_verified" && e.payload?.holderUserId === userId && Date.parse(e.createdAt) >= since)).length > 0;
    if (!seen) await sleep(25);
  }
  await meanwhile();
  release();
  await held;
  return { result: await p, sawVerify: seen };
}
/** An officer's restore of a served self-exclusion, as `players/[id]/actions.ts` does it: status, the timer ended, the hold lifted. */
async function restoreSelfExclusion(uid: string): Promise<void> {
  const cur = await RG.getRgSettings(uid);
  await w.db.responsible.upsert({ ...cur, selfExclusionUntil: new Date(Date.now() - 60_000).toISOString() });
  await w.setUserFields(uid, { status: "ACTIVE" });
  await removeWalletFreeze(uid, "SELF_EXCLUSION", { actorId: OFFICER, note: "fixture restore" });
}

// ═══ §1 · the password check (04 C4, 02 §2.6) ══════════════════════════════════════════════════════
section("§1 · verifyHouseBotPassword — reserve, never lockedUntil, never a session");
{
  rlReset();
  const h = await holder();
  await setActiveSessionId(h, "sess_holder_c3");
  const before = await user(h);
  const since = Date.now() - 5;

  const empty = await verify(h, "");
  ok("1.1 · an empty password is refused, uncounted", empty.ok === false && empty.code === "EMPTY" && (await user(h)).failedLoginCount === 0, j(empty));
  const spaced = await verify(h, ` ${PW}`);
  ok("1.1b · the password is never trimmed: a leading space is a wrong password", spaced.ok === false && spaced.code === "WRONG_PASSWORD", j(spaced));
  await w.setUserFields(h, { failedLoginCount: 0 });

  const w1 = await verify(h, "not-the-password");
  const u1 = await user(h);
  ok("1.2 · wrong → count 1, attemptsBeforeLock 2, lockedUntil stays null",
    w1.code === "WRONG_PASSWORD" && u1.failedLoginCount === 1 && w1.attemptsBeforeLock === 2 && u1.lockedUntil == null, j(w1));
  ok("1.2b · the C4 sentence: not their current password, when it changed and how, attempts left",
    /^That isn't their current password\. It was changed on .+ EAT via Account settings\. 2 attempts left\.$/.test(w1.message), w1.message);
  rlReset();
  const w2 = await verify(h, "still-not-it");
  ok("1.3 · two wrong tries → 0 holder notices so far", w2.attemptsBeforeLock === 1 && (await houseRows(h)).length === 0);
  rlReset();
  const w3 = await verify(h, "third-wrong-one");
  const rows3 = await houseRows(h);
  ok("1.3b · the third wrong try reaches the reserve: attempts 0, and exactly 1 holder notice (verify_reserved)",
    w3.attemptsBeforeLock === 0 && (await user(h)).failedLoginCount === 3 && rows3.length === 1 && rows3[0].titleEn === "A wrong password was tried", j(rows3.map((r: Any) => r.titleEn)));
  rlReset();
  const r4 = await verify(h, PW);
  const u4 = await user(h);
  ok("1.4 · at the reserve even the RIGHT password is refused without being checked: RESERVED, count unchanged, lockedUntil null",
    r4.code === "RESERVED" && u4.failedLoginCount === 3 && u4.lockedUntil == null, j(r4));
  ok("1.4b · …and no holder notice is added by the refusal", (await houseRows(h)).length === 1);
  ok("1.4c · the reserve leaves the holder their own attempts: count + 2 < LOCKOUT_MAX_FAILS + 1", u4.failedLoginCount + D.RESERVED_ATTEMPTS === LOCKOUT_MAX_FAILS);

  await w.setUserFields(h, { failedLoginCount: 0 }); // the holder signed in once (sign-in resets the count)
  rlReset();
  const good = await verify(h, PW);
  const after = await user(h);
  ok("1.5 · right → the fingerprint of the stored hash, count 0", good.ok === true && good.fingerprint === PR.passwordFingerprint(after.passwordHash) && after.failedLoginCount === 0, j(good));
  ok("1.6 · no session: lastLoginAt identical, the holder's active session unchanged",
    after.lastLoginAt === before.lastLoginAt && (await getActiveSessionId(h)) === "sess_holder_c3", `${after.lastLoginAt} ${await getActiveSessionId(h)}`);
  const leaked = await audits((e) => Date.parse(e.createdAt) >= since && (e.actorId === h || e.targetId === h) && /^(auth\.login|session\.)/.test(e.action));
  ok("1.6b · no auth.login.* or session.* audit for the holder", leaked.length === 0, j(leaked.map((e: Any) => e.action)));
  const secrets = await audits((e) => Date.parse(e.createdAt) >= since && JSON.stringify(e).includes(PW));
  ok("1.7 · the password is in no audit row", secrets.length === 0);
  const cats = await audits((e) => Date.parse(e.createdAt) >= since && e.payload?.holderUserId === h && e.action.startsWith("house_bot."));
  ok("1.7b · every audit row it wrote is in its HOUSE_AUDIT category",
    cats.length >= 5 && cats.every((e: Any) => e.category === ({ "house_bot.password_rejected": "SECURITY", "house_bot.verify_reserved": "SECURITY", "house_bot.password_verified": "SECURITY" } as Any)[e.action]), j(cats.map((e: Any) => `${e.action}:${e.category}`)));

  // Rate bucket: the console's own, and it never touches the holder's counter.
  rlReset();
  const hr = await holder();
  for (let i = 0; i < 3; i++) await verify(hr, PW);
  const limited = await verify(hr, "wrong-but-limited");
  ok("1.8 · the 4th check in the bucket → RATE_LIMITED with a wait, the holder's count untouched",
    limited.code === "RATE_LIMITED" && limited.retryAfterSec > 0 && (await user(hr)).failedLoginCount === 0, j(limited));
  ok("1.8b · …and a SECURITY verify_rate_limited row", (await audits((e) => e.action === "house_bot.verify_rate_limited" && e.payload?.holderUserId === hr)).length === 1);

  // Double submit: same submitId twice at once adds 1; two different presses at once add exactly 2.
  rlReset();
  const hd = await holder();
  const sid = crypto.randomUUID();
  const [d1, d2] = await Promise.all([verify(hd, "wrong-a", { submitId: sid }), verify(hd, "wrong-a", { submitId: sid })]);
  ok("1.9 · a concurrent double submit (one submitId) adds exactly 1 and refuses the copy as DUPLICATE_SUBMIT",
    (await user(hd)).failedLoginCount === 1 && [d1.code, d2.code].sort().join() === "DUPLICATE_SUBMIT,WRONG_PASSWORD", `${d1.code} ${d2.code}`);
  await Promise.all([verify(hd, "wrong-b", { submitId: crypto.randomUUID() }), verify(hd, "wrong-c", { submitId: crypto.randomUUID() })]);
  ok("1.9b · two different presses at once add exactly 2 — no lost update inside login:<id>", (await user(hd)).failedLoginCount === 3);

  rlReset();
  const hl = await holder();
  await w.setUserFields(hl, { lockedUntil: new Date(Date.now() + 600_000).toISOString(), failedLoginCount: 0 });
  const locked = await verify(hl, "wrong-while-locked");
  ok("1.10 · the holder's sign-in is locked → BLOCKED{SIGN_IN_LOCKED}, uncounted", locked.code === "BLOCKED" && locked.row?.code === "SIGN_IN_LOCKED" && (await user(hl)).failedLoginCount === 0, j(locked));
  await w.setUserFields(hl, { lockedUntil: new Date(Date.now() - 1_000).toISOString(), failedLoginCount: 4 });
  rlReset();
  const expired = await verify(hl, PW);
  const ul = await user(hl);
  ok("1.11 · an expired lock is cleared as sign-in clears it, then the right password verifies", expired.ok === true && ul.lockedUntil == null && ul.failedLoginCount === 0, j(expired));
  const hn = await w.user({ balance: 1_000 });
  const nopw = await verify(hn, PW);
  ok("1.12 · no password on the account → BLOCKED{NO_PASSWORD}", nopw.code === "BLOCKED" && nopw.row?.code === "NO_PASSWORD", j(nopw));
  ok("1.13 · CONTROL · attemptsBeforeLock is the tries before the reserve", D.attemptsBeforeLock(0) === 3 && D.attemptsBeforeLock(3) === 0 && D.attemptsBeforeLock(9) === 0);
}

// ═══ §2 · password history (04 A4) ════════════════════════════════════════════════════════════════
section("§2 · password history — the columns, in the same update as the hash");
{
  const h = await holder({ via: "REGISTRATION" });
  const ch = await PR.changePassword(h, PW, PW2);
  const u1 = await user(h);
  ok("2.1 · settings change writes SELF_CHANGE with the new hash", ch.ok === true && u1.passwordSetVia === "SELF_CHANGE" && !!u1.passwordSetAt, j(ch));
  const temp = await PR.adminResetPassword(OFFICER, h);
  const u2 = await user(h);
  ok("2.2 · an officer's temporary password writes OFFICER_TEMP", temp.ok === true && u2.passwordSetVia === "OFFICER_TEMP" && u2.passwordHash !== u1.passwordHash);
  const token = signSession({ purpose: "password-reset", userId: h, email: u2.email, pwh: PR.passwordFingerprint(u2.passwordHash), exp: Date.now() + 600_000 });
  const reset = await PR.consumeResetToken(token, PW3);
  const u3 = await user(h);
  ok("2.3 · a reset link writes RESET_LINK", reset.ok === true && u3.passwordSetVia === "RESET_LINK" && u3.passwordHash !== u2.passwordHash, j(reset));

  // The column decides, not the audit log: OFFICER_TEMP with NO officer audit row still refuses.
  const noAudit = await holder({ via: "OFFICER_TEMP" });
  const e1 = await E.houseBotEligibility(noAudit, { context: "designate", actorId: OFFICER });
  ok("2.4 · OFFICER_TEMP in the column (no officer audit row exists) → PASSWORD_SET_BY_SUPPORT, with the C9 copy",
    e1.blocking.some((r: Any) => r.code === "PASSWORD_SET_BY_SUPPORT" && /^Their password was last set through support \(a temporary password, .+\)\. Ask them to change it themselves in Account settings, then verify\.$/.test(r.message)), j(e1.blocking));
  const e1r = await verify(noAudit, PW);
  ok("2.4b · …and the password check refuses it uncounted", e1r.code === "BLOCKED" && (await user(noAudit)).failedLoginCount === 0);

  // An officer-set email, then a reset link → refused; the holder's own email, then a reset → allowed.
  const ho = await holder({ via: "REGISTRATION" });
  await setUserEmail(ho, `${ho}.officer@test.tz`, { byOfficer: true });
  const uo = await user(ho);
  ok("2.5 · the officer email writer stamps emailSetByOfficerAt with the address", !!uo.emailSetByOfficerAt && uo.email === `${ho}.officer@test.tz`);
  const t2 = signSession({ purpose: "password-reset", userId: ho, email: uo.email, pwh: PR.passwordFingerprint(uo.passwordHash), exp: Date.now() + 600_000 });
  await PR.consumeResetToken(t2, PW2);
  const e2 = await E.houseBotEligibility(ho, { context: "designate", actorId: OFFICER });
  ok("2.5b · officer-set email, then a reset link → PASSWORD_SET_BY_SUPPORT", e2.blocking.some((r: Any) => r.code === "PASSWORD_SET_BY_SUPPORT" && r.message.includes("a reset link to an address support set")), j(e2.blocking));
  const hs = await holder({ via: "REGISTRATION" });
  await setUserEmail(hs, `${hs}.own@test.tz`);
  const us = await user(hs);
  const t3 = signSession({ purpose: "password-reset", userId: hs, email: us.email, pwh: PR.passwordFingerprint(us.passwordHash), exp: Date.now() + 600_000 });
  await PR.consumeResetToken(t3, PW2);
  const e3 = await E.houseBotEligibility(hs, { context: "designate", actorId: OFFICER });
  ok("2.5c · CONTROL · the holder's own email, then a reset link → no support row", !(await user(hs)).emailSetByOfficerAt && !e3.blocking.some((r: Any) => r.code === "PASSWORD_SET_BY_SUPPORT"), j(e3.blocking));
  const hw = await holder({ via: "RESET_LINK" });
  await w.setUserFields(hw, { emailSetByOfficerAt: new Date(Date.now() - 31 * 86_400_000).toISOString() });
  const e4 = await E.houseBotEligibility(hw, { context: "designate", actorId: OFFICER });
  ok("2.5d · an officer-set email 31 days before the reset is outside the window → allowed", !e4.blocking.some((r: Any) => r.code === "PASSWORD_SET_BY_SUPPORT"), j(e4.blocking));

  // Legacy rows (no history in the columns) read the audit log, awaited.
  const hl = await holder({ via: null });
  const el0 = await E.houseBotEligibility(hl, { context: "designate", actorId: OFFICER });
  ok("2.6 · legacy NULL history with no password write in the log → allowed", !el0.blocking.some((r: Any) => /PASSWORD_(SET_BY_SUPPORT|HISTORY)/.test(r.code)), j(el0.blocking));
  await PR.adminResetPassword(OFFICER, hl);
  await w.setUserFields(hl, { passwordSetVia: null, passwordSetAt: null });
  await auditFlush();
  const el1 = await E.houseBotEligibility(hl, { context: "designate", actorId: OFFICER });
  ok("2.6b · legacy NULL history whose newest write is the officer reset → PASSWORD_SET_BY_SUPPORT", el1.blocking.some((r: Any) => r.code === "PASSWORD_SET_BY_SUPPORT"), j(el1.blocking));
}

// ═══ §3 · eligibility rows per context (PLAN §6, C9) ═══════════════════════════════════════════════
section("§3 · houseBotEligibility — every blocking row in its contexts");
{
  await clearRoster();
  const codes = async (uid: string, context: string, botId?: string) => (await E.houseBotEligibility(uid, { context, botId, actorId: OFFICER })).blocking.map((r: Any) => r.code);
  const clean = await holder();
  const cl = await E.houseBotEligibility(clean, { context: "designate", actorId: OFFICER });
  ok("3.0 · CONTROL · a clean player is eligible to designate, with a readable balance", cl.eligible === true && cl.balanceTzs === 5_000_000, j(cl.blocking));
  ok("3.0b · …and carries the live warnings (identity never approved)", cl.warnings.some((r: Any) => r.code === "IDENTITY_NOT_APPROVED"));

  const staff = await holder({ role: "COMPLIANCE" });
  ok("3.1 · staff → STAFF_ACCOUNT (picker: \"Staff account\")", (await E.houseBotEligibility(staff, { context: "designate" })).blocking.some((r: Any) => r.code === "STAFF_ACCOUNT" && r.short === "Staff account"));
  const agent = await holder({ role: "AGENT" });
  ok("3.2 · agent → AGENT_ACCOUNT", (await codes(agent, "designate")).includes("AGENT_ACCOUNT"));
  const closed = await holder();
  await w.setUserFields(closed, { status: "CLOSED", closedAt: new Date().toISOString() });
  const clr = (await E.houseBotEligibility(closed, { context: "designate" })).blocking.find((r: Any) => r.code === "ACCOUNT_CLOSED");
  ok("3.3 · closed → ACCOUNT_CLOSED with the C9 float line", !!clr && /^Account closed on .+ — it can't be reopened\. TZS 5,000,000 and TZS 0 of open house stakes stay in the closed wallet; recover the float out of band\. Remove the bot\.$/.test(clr.message), clr?.message);
  const susp = await holder();
  await w.setUserFields(susp, { status: "SUSPENDED" });
  ok("3.4 · suspended → NOT_ACTIVE (picker: \"Not active (SUSPENDED)\")", (await E.houseBotEligibility(susp, { context: "designate" })).blocking.some((r: Any) => r.code === "NOT_ACTIVE" && r.short === "Not active (SUSPENDED)"));
  const nopw = await w.user({ balance: 10 });
  ok("3.5 · no password → NO_PASSWORD", (await codes(nopw, "designate")).includes("NO_PASSWORD"));
  // An account with no wallet row at all: created through the user store only.
  const nowallet = w.uid("usr_hb_nowallet");
  const nowIso = new Date().toISOString();
  await w.db.user.create({
    id: nowallet, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: null, passwordHash: "h", passwordSalt: "s",
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null, passwordSetVia: "SELF_CHANGE", passwordSetAt: nowIso,
  } as never);
  const nwr = (await E.houseBotEligibility(nowallet, { context: "designate" })).blocking.find((r: Any) => r.code === "WALLET_MISSING");
  ok("3.6 · no wallet → WALLET_MISSING with its copy", nwr?.message === "This account has no wallet — it cannot be designated.", j(nwr));
  const frozen = await holder();
  const { freezeWalletByOfficer }: Any = await import("../../src/lib/server/wallet-freeze.ts");
  await freezeWalletByOfficer(OFFICER, frozen, "fixture hold");
  ok("3.7 · a frozen wallet → WALLET_NOT_ACTIVE", (await codes(frozen, "designate")).includes("WALLET_NOT_ACTIVE"));
  const excl = await holder();
  await RG.selfExclude(excl, "24h");
  const exr = (await E.houseBotEligibility(excl, { context: "designate" })).blocking.find((r: Any) => r.code === "RG_LOCKED");
  ok("3.8 · self-excluded → RG_LOCKED with the C8 copy", !!exr && /^Can't ask for their password while they are self-excluded \(until .+\)\. Their permission can be confirmed again only after it has ended\.$/.test(exr.message), exr?.message);

  const own = await codes(OFFICER, "designate");
  ok("3.9 · the owner's own account → OWN_ACCOUNT", own.includes("OWN_ACCOUNT"), own.join());
  const d = await desig(clean);
  ok("3.10 · fixture · the clean player is designated", d.ok === true, j(d));
  const again = (await E.houseBotEligibility(clean, { context: "designate", actorId: OFFICER })).blocking.find((r: Any) => r.code === "ALREADY_LIVE_BOT");
  ok("3.10b · designate again → ALREADY_LIVE_BOT naming the label", !!again && again.short === `Already house bot “${d.bot.label}”`, again?.short);
  ok("3.10c · a designated bot is NOT blocked by \"already a live bot\" in the start or reverify context",
    !(await codes(clean, "start", d.bot.id)).includes("ALREADY_LIVE_BOT") && !(await codes(clean, "reverify", d.bot.id)).includes("ALREADY_LIVE_BOT"));

  await w.limits({ maxDesignatedBots: 1 });
  const other = await holder();
  const full = (await E.houseBotEligibility(other, { context: "designate", actorId: OFFICER })).blocking.find((r: Any) => r.code === "ROSTER_FULL");
  ok("3.11 · roster full → ROSTER_FULL (\"Roster full (1 of 1)\") linking to Limits", full?.short === "Roster full (1 of 1)" && full?.href === "/admin/house-bots?tab=limits", j(full));
  await w.limits({ maxDesignatedBots: 20 });

  const req = fileDsarRequest({ userId: clean, type: "ERASURE" });
  for (const ctx of ["designate", "reverify", "start"]) {
    const rs = await E.houseBotEligibility(clean, { context: ctx, botId: ctx === "designate" ? undefined : d.bot.id, actorId: OFFICER });
    ok(`3.12.${ctx} · an open erasure request → ERASURE_REQUEST in ${ctx}`, rs.blocking.some((r: Any) => r.code === "ERASURE_REQUEST" && r.message.includes(req.id)), j(rs.blocking.map((r: Any) => r.code)));
  }
  req.status = "REJECTED";

  await w.setUserFields(clean, { lockedUntil: new Date(Date.now() + 600_000).toISOString() });
  ok("3.13 · sign-in locked → SIGN_IN_LOCKED in designate and reverify", (await codes(clean, "designate")).includes("SIGN_IN_LOCKED") && (await codes(clean, "reverify", d.bot.id)).includes("SIGN_IN_LOCKED"));
  const st = await E.houseBotEligibility(clean, { context: "start", botId: d.bot.id });
  ok("3.13b · …and in start it is a warning, not a block (the bot continues)", !st.blocking.some((r: Any) => r.code === "SIGN_IN_LOCKED") && st.warnings.some((r: Any) => r.code === "SIGN_IN_LOCKED_WARNING"));
  await w.setUserFields(clean, { lockedUntil: null, passwordSetVia: "OFFICER_TEMP" });
  ok("3.14 · password set by support blocks designate and reverify, not start",
    (await codes(clean, "reverify", d.bot.id)).includes("PASSWORD_SET_BY_SUPPORT") && !(await codes(clean, "start", d.bot.id)).includes("PASSWORD_SET_BY_SUPPORT"));
  // `recruitedBy` is a foreign key to an AffiliateAgent row on Postgres; the memory store has no such key, so the
  // recruited warning is asserted there only (eligibility reads the column the same way on both).
  await w.setUserFields(clean, { passwordSetVia: "SELF_CHANGE", displayName: "50pick House Desk", ...(w.onPostgres ? {} : { recruitedBy: OFFICER }) });
  const warns = (await E.houseBotEligibility(clean, { context: "start", botId: d.bot.id })).warnings.map((r: Any) => r.code);
  ok("3.15 · warnings: public name, name risk", ["PUBLIC_NAME", "NAME_RISK"].every((c) => warns.includes(c)), warns.join());
  if (!w.onPostgres) ok("3.15b · warning: recruited by an agent (memory store; an FK to AffiliateAgent on Postgres)", warns.includes("RECRUITED"), warns.join());
  await w.setUserFields(clean, { displayName: null, ...(w.onPostgres ? {} : { recruitedBy: null }) });

  // Start-only rows.
  await makeStartable(d.bot.id);
  const cur = await RG.getRgSettings(clean);
  await w.db.responsible.upsert({ ...cur, dailyLossLimit: 500 });
  const ol = (await E.houseBotEligibility(clean, { context: "start", botId: d.bot.id })).blocking.find((r: Any) => r.code === "OWNER_LOSS_LIMIT");
  ok("3.16 · the holder's own loss limit below the stake minimum → OWNER_LOSS_LIMIT (start)", !!ol && ol.message.startsWith("Can't start: their own daily loss limit (TZS 500)"), ol?.message);
  const sr = await start(d.bot.id);
  ok("3.16b · …and Start refuses with it", sr.ok === false && sr.code === "OWNER_LOSS_LIMIT", j(sr));
  await w.db.responsible.upsert({ ...(await RG.getRgSettings(clean)), dailyLossLimit: null });

  const realDayRows = w.dal.houseBookStore.dayRows;
  w.dal.houseBookStore.dayRows = async (input: Any) => (input.houseBotId === d.bot.id ? [{ houseBotId: d.bot.id, bets: 3, staked: 90_000, openStake: 0, settledStake: 90_000, returned: 0 }] : realDayRows(input));
  try {
    await w.setCaps(d.bot.id, { capDailyLossTzs: 90_000 });
    const ls2 = await start(d.bot.id);
    ok("3.17 · settled loss 90,000 ≥ cap 90,000 → LOSS_CAP with the 02 §3.3 copy",
      ls2.ok === false && ls2.code === "LOSS_CAP" && ls2.message === "Can't start: today's settled loss TZS 90,000 has reached the daily loss cap TZS 90,000. Raise the cap or wait until 00:00 EAT.", j(ls2));
    await w.setCaps(d.bot.id, { capDailyLossTzs: 90_001 });
    const ls = (await E.houseBotEligibility(clean, { context: "start", botId: d.bot.id })).blocking.map((r: Any) => r.code);
    ok("3.17b · CONTROL · one shilling under the cap the same bot has no loss row", !ls.includes("DAILY_LOSS_STOP"), ls.join());
  } finally {
    w.dal.houseBookStore.dayRows = realDayRows;
  }
  const kycOk = await Promise.resolve().then(() => w.db.kyc.upsert({
    id: `kyc_${clean}`, userId: clean, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null, fullName: "Fixture", dob: "2010-01-01",
    documents: [], reviewerId: OFFICER, reviewedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })).then(() => true, (e: Any) => { console.log(`   (kyc fixture: ${e?.message?.slice(0, 120)})`); return false; });
  if (kycOk) {
    const ir = await E.houseBotEligibility(clean, { context: "start", botId: d.bot.id });
    ok("3.18 · a FINAL identity refusal → the IDENTITY_REFUSED cause and Start row", ir.causes.some((c: Any) => c.code === "IDENTITY_REFUSED") && ir.blocking.some((r: Any) => r.code === "IDENTITY_REFUSED"), j(ir.blocking.map((r: Any) => r.code)));
  } else {
    ok("3.18 · NOT MEASURED on this store — the KYC fixture row could not be written (see line above)", STORE === "postgres");
  }
}

// ═══ §4 · designate (02 §3.2, 04 C4, C2, A3, C9) ═════════════════════════════════════════════════
section("§4 · designateHouseBot");
{
  await clearRoster();
  await w.limits({ maxDesignatedBots: 20 });
  const h = await holder();
  const since = Date.now() - 5;
  const d = await desig(h, { label: "  Asha   Desk ", note: "fixture note" });
  const b = d.ok ? await bot(d.bot.id) : null;
  ok("4.1 · PAUSED(NEW), normalised label, fingerprint of the stored hash, no void, rules version 1",
    !!b && b.status === "PAUSED" && b.pauseReason === "NEW" && b.label === "Asha Desk" && b.passwordFingerprint === PR.passwordFingerprint((await user(h)).passwordHash) && b.consentVoidAt == null && b.rulesVersion === 1, j(d));
  const ev = b ? await events(b.id) : [];
  ok("4.1b · one DESIGNATED event and the bot's runtime row", ev.filter((e: Any) => e.kind === "DESIGNATED").length === 1 && !!(await w.dal.houseBotRuntimeStore.get(`bot:${b?.id}`)));
  const des = await audits((e) => e.action === "house_bot.designated" && e.targetId === b?.id);
  ok("4.1c · one COMPLIANCE house_bot.designated, with no label, note or fingerprint in the payload (R7)",
    des.length === 1 && des[0].category === "COMPLIANCE" && !JSON.stringify(des[0].payload).includes("Asha") && !JSON.stringify(des[0].payload).includes(b?.passwordFingerprint), j(des[0]?.payload));
  const hn = await houseRows(h);
  ok("4.1d · the holder is told once: \"Your account now provides liquidity\", with the way to stop it", hn.length === 1 && hn[0].bodyEn.includes("You can stop this at any time by changing your password or contacting 50pick.") && hn[0].href === "/positions");
  ok("4.1e · the successful check wrote password_verified exactly once", (await audits((e) => e.action === "house_bot.password_verified" && e.payload?.holderUserId === h && Date.parse(e.createdAt) >= since)).length === 1);

  const h2 = await holder();
  const clash = await desig(h2, { label: "asha desk" });
  ok("4.2 · the same label in another case → field label with the C2 copy, and no attempt spent",
    clash.ok === false && clash.field === "label" && clash.message === "Another bot is already called “Asha Desk” (Paused). Choose a different label." && (await user(h2)).failedLoginCount === 0, j(clash));

  // A password change between the check and the insert: no row.
  const h3 = await holder();
  const inter = await interleave(h3, () => desig(h3), async () => { await PR.changePassword(h3, PW, PW2); });
  ok("4.3 · password changed between verify and insert → PASSWORD_CHANGED on field password, 0 bots",
    inter.sawVerify && inter.result.ok === false && inter.result.code === "PASSWORD_CHANGED" && inter.result.field === "password" && !(await w.dal.houseBotStore.findLiveByUserId(h3)), j(inter.result));

  // Roster full before the check: no attempt spent.
  await clearRoster();
  await w.limits({ maxDesignatedBots: 1 });
  const hf1 = await holder();
  await desig(hf1);
  const hf2 = await holder();
  rlReset();
  const fullRes = await desig(hf2, { password: "a-wrong-password" });
  ok("4.4 · roster already full → ROSTER_FULL before the password check: the holder's count stays 0",
    fullRes.ok === false && fullRes.code === "ROSTER_FULL" && (await user(hf2)).failedLoginCount === 0, j(fullRes));

  // Two designates at max − 1: one bot, one ROSTER_FULL.
  await clearRoster();
  await w.limits({ maxDesignatedBots: 5 });
  for (let i = 0; i < 4; i++) { rlReset(); const r = await desig(await holder()); if (!r.ok) throw new Error(`4.5 fixture ${j(r)}`); }
  const [ra, rb] = await Promise.all([holder(), holder()]);
  rlReset();
  const [pa, pb] = await Promise.all([desig(ra), desig(rb)]);
  ok("4.5 · two designates at 4 of 5 → exactly one bot and one ROSTER_FULL",
    [pa.ok, pb.ok].filter(Boolean).length === 1 && [pa, pb].some((r: Any) => r.code === "ROSTER_FULL") && (await w.dal.houseBotStore.countLive()) === 5, `${j(pa)} | ${j(pb)}`);

  // Two designates with one label at once: one bot, one label error.
  await clearRoster();
  const [la, lb] = await Promise.all([holder(), holder()]);
  rlReset();
  const [qa, qb] = await Promise.all([desig(la, { label: "Twin Label" }), desig(lb, { label: "TWIN label" })]);
  ok("4.6 · a concurrent same-label designate → one bot and one field label error",
    [qa.ok, qb.ok].filter(Boolean).length === 1 && [qa, qb].some((r: Any) => r.field === "label"), `${j(qa)} | ${j(qb)}`);

  // ⛔ The unique index, not the pre-check: A passes every check, B takes the label while A waits on its wallet
  // lock, then A's insert meets `HouseBot_labelKey_live_key`.
  {
    const [ia, ib] = [await holder(), await holder()];
    rlReset();
    const raced = await interleave(ia, () => desig(ia, { label: "Race Label" }), async () => { const rb2 = await desig(ib, { label: "race LABEL" }); if (!rb2.ok) throw new Error(`4.6b fixture ${j(rb2)}`); });
    ok("4.6b · the label taken between A's checks and A's insert → the unique index names it: field label, A has no bot",
      raced.sawVerify && raced.result.ok === false && raced.result.field === "label" && raced.result.message === "Another bot is already called “race LABEL” (Paused). Choose a different label." && !(await w.dal.houseBotStore.findLiveByUserId(ia)), j(raced.result));
  }
  // …and the same account twice, both past every check before either inserts → `HouseBot_userId_live_key`.
  {
    const iu = await holder();
    rlReset();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let entered!: () => void;
    const holding = new Promise<void>((r) => { entered = r; });
    const held = withLock(`wallet:${iu}`, async () => { entered(); await gate; });
    await holding;
    const since = Date.now() - 5;
    const both = [desig(iu, { label: "Twice One" }), desig(iu, { label: "Twice Two" })];
    for (let i = 0; i < 600; i++) {
      if ((await audits((e) => e.action === "house_bot.password_verified" && e.payload?.holderUserId === iu && Date.parse(e.createdAt) >= since)).length >= 2) break;
      await sleep(25);
    }
    release();
    await held;
    const [t1, t2] = await Promise.all(both);
    ok("4.6c · one account designated twice at once, both past the checks → one bot and one ALREADY_BOT naming it",
      [t1.ok, t2.ok].filter(Boolean).length === 1 && [t1, t2].some((r: Any) => r.code === "ALREADY_BOT" && r.data?.botId === (t1.ok ? t1 : t2).bot?.id), `${j(t1)} | ${j(t2)}`);
  }

  // Re-designate after removal: a new row; the removed label is free.
  const first = qa.ok ? qa : qb;
  const firstUser = qa.ok ? la : lb;
  await clearRoster();
  rlReset();
  const re = await desig(firstUser, { label: "Twin Label" });
  ok("4.7 · a removed account designates again as a NEW row, reusing the removed bot's label",
    re.ok === true && re.bot.id !== first.bot.id && (await bot(first.bot.id)).status === "REMOVED", j(re));
  const hdup = await holder();
  const sid = crypto.randomUUID();
  rlReset();
  const [s1, s2] = await Promise.all([desig(hdup, { submitId: sid }), desig(hdup, { submitId: sid })]);
  ok("4.8 · a double-tapped Designate (one submitId) → one bot; the copy is refused",
    [s1.ok, s2.ok].filter(Boolean).length === 1 && (await w.dal.houseBotStore.listByUserId(hdup)).length === 1, `${j(s1)} | ${j(s2)}`);
}

// ═══ §5 · the consent void (04 A3, N2 §4 step 10) ═══════════════════════════════════════════════════
section("§5 · voidHouseConsent — every cause ends every ACTIVE target, in the wallet transaction");
{
  await w.switchOn();
  for (const cause of ["SELF_EXCLUDED", "COOLING_OFF", "IDENTITY_REFUSED", "HOLDER_ERASURE_REQUEST", "HOLDER_WITHDREW"]) {
    const { botId, userId } = await runningBot();
    const [m1, m2] = [await w.poll(), await w.poll()];
    await target(botId, m1.id);
    await target(botId, m2.id);
    const live = await w.intent({ botId, userId }, (await w.poll()).id, { kind: "FILL" });
    const res = await D.voidHouseConsent({ userId, cause, actorId: "system_house_bot" });
    const b = await bot(botId);
    const ts = (await w.dal.targetStore.listForBot(botId, "all", null)).rows;
    const ev = await events(botId);
    ok(`5.1.${cause} · ACTIVE → AUTO_PAUSED(${cause}), pausedFromStatus ACTIVE, the void stamped`,
      res.voided === true && b.status === "AUTO_PAUSED" && b.pauseReason === cause && b.pausedFromStatus === "ACTIVE" && b.consentVoidCause === cause && !!b.consentVoidAt, j(res));
    ok(`5.2.${cause} · both ACTIVE targets → ENDED(CONSENT_VOID), one TARGET_ENDED event each`,
      ts.length === 2 && ts.every((t: Any) => t.status === "ENDED" && t.endCause === "CONSENT_VOID") && ev.filter((e: Any) => e.kind === "TARGET_ENDED").length === 2 && res.targetsEnded === 2, j(ts.map((t: Any) => `${t.status}:${t.endCause}`)));
    ok(`5.3.${cause} · CONSENT_VOIDED and AUTO_PAUSED events; the live intent cancelled`,
      ev.some((e: Any) => e.kind === "CONSENT_VOIDED") && ev.some((e: Any) => e.kind === "AUTO_PAUSED") && (await w.dal.houseBotIntentStore.get(live.id)).status === "CANCELLED");
    const again = await D.voidHouseConsent({ userId, cause, actorId: "system_house_bot" });
    ok(`5.4.${cause} · a second pass changes nothing`, again.voided === false && again.reason === "ALREADY_VOID" && (await events(botId)).length === ev.length);
    const holderNotices = (await houseRows(userId)).filter((n: Any) => n.titleEn !== "Your account now provides liquidity" && n.titleEn !== "Liquidity stakes started");
    if (cause === "HOLDER_WITHDREW") {
      ok("5.5.HOLDER_WITHDREW · the holder's confirmation, and COMPLIANCE holder_withdrew_consent",
        holderNotices.length === 1 && holderNotices[0].titleEn === "Liquidity stakes stopped" && (await audits((e) => e.action === "house_bot.holder_withdrew_consent" && e.targetId === botId)).length === 1);
    } else {
      ok(`5.5.${cause} · no holder notice, and COMPLIANCE house_bot.auto_paused`,
        holderNotices.length === 0 && (await audits((e) => e.action === "house_bot.auto_paused" && e.targetId === botId && e.payload?.cause === cause)).length === 1, j(holderNotices.map((n: Any) => n.titleEn)));
    }
  }

  // A paused bot keeps its status.
  {
    await clearRoster();
    const h = await holder();
    const d = await desig(h);
    const [m] = [await w.poll()];
    await target(d.bot.id, m.id);
    await w.dal.houseBotStore.setStatus(d.bot.id, { from: ["PAUSED"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
    const rowsBefore = (await houseRows(h)).length;
    await RG.selfExclude(h, "24h");
    const res = await D.voidHouseConsent({ userId: h, cause: "SELF_EXCLUDED", actorId: "system_house_bot" });
    const b = await bot(d.bot.id);
    ok("5.6 · PAUSED(MANUAL) + self-exclusion → status unchanged, consentVoidAt set, HOLDER_CAUSE_ADDED, 0 holder rows",
      res.voided && b.status === "PAUSED" && b.pauseReason === "MANUAL" && !!b.consentVoidAt && (await events(d.bot.id)).some((e: Any) => e.kind === "HOLDER_CAUSE_ADDED") && (await houseRows(h)).length === rowsBefore, j(res));
    ok("5.6b · …its target still ends as CONSENT_VOID", (await w.dal.targetStore.listForBot(d.bot.id, "all", null)).rows.every((t: Any) => t.endCause === "CONSENT_VOID"));
  }

  // An injected rollback leaves everything as it was.
  {
    const { botId, userId } = await runningBot();
    const m = await w.poll();
    await target(botId, m.id);
    const realSetStatus = w.dal.houseBotStore.setStatus;
    w.dal.houseBotStore.setStatus = async () => { throw new Error("injected failure after the targets ended"); };
    let threw = false;
    try { await D.voidHouseConsent({ userId, cause: "COOLING_OFF", actorId: "system_house_bot" }); } catch { threw = true; } finally { w.dal.houseBotStore.setStatus = realSetStatus; }
    const b = await bot(botId);
    const ts = (await w.dal.targetStore.listForBot(botId, "all", null)).rows;
    ok("5.7 · an injected failure after the targets ended rolls every write back: target ACTIVE, no void, no CONSENT_VOIDED, still ACTIVE",
      threw && ts.every((t: Any) => t.status === "ACTIVE") && b.consentVoidAt == null && b.status === "ACTIVE" && !(await events(botId)).some((e: Any) => e.kind === "CONSENT_VOIDED" || e.kind === "TARGET_ENDED"), j({ threw, ts: ts.map((t: Any) => t.status), void: b.consentVoidAt, status: b.status }));

    // Suspension is not a void: targets stay ACTIVE and consent stays valid.
    await w.setUserFields(userId, { status: "SUSPENDED" });
    const el = await E.houseBotEligibility(userId, { context: "start", botId });
    ok("5.8 · a suspension is not a void: ACCOUNT_SUSPENDED is a cause, consent still valid, target still ACTIVE",
      el.causes.some((c: Any) => c.code === "ACCOUNT_SUSPENDED") && C.consentValid(b, PR.passwordFingerprint((await user(userId)).passwordHash)) && (await w.dal.targetStore.listForBot(botId, "all", null)).rows.every((t: Any) => t.status === "ACTIVE"));
    await w.setUserFields(userId, { status: "ACTIVE" });
  }
}

// ═══ §6 · a responsible-gambling pause voids consent (04 C8) ═════════════════════════════════════════
section("§6 · C8 — same password after a self-exclusion still needs a fresh confirmation");
{
  await w.switchOn();
  const { botId, userId } = await runningBot();
  const m = await w.poll();
  await target(botId, m.id);
  await RG.selfExclude(userId, "24h");
  await D.voidHouseConsent({ userId, cause: "SELF_EXCLUDED", actorId: "system_house_bot" });

  rlReset();
  const during = await reverify(botId, PW);
  ok("6.1 · re-verify during the lock → refused RG_LOCKED, uncounted", during.ok === false && during.row?.code === "RG_LOCKED" && (await user(userId)).failedLoginCount === 0, j(during));

  await restoreSelfExclusion(userId);
  const b = await bot(botId);
  const fpNow = PR.passwordFingerprint((await user(userId)).passwordHash);
  ok("6.2 · after the officer's restore, SAME password: consentValid is false (the void stands)", C.consentValid(b, fpNow) === false);
  const fingerprintOnly = (row: Any, fp: string) => fp === row.passwordFingerprint;
  ok("6.2b · CONTROL · the planted fingerprint-only predicate calls the same bot valid — it would have let it bet", fingerprintOnly(b, fpNow) === true);

  const s1 = await start(botId);
  ok("6.3 · Start before re-verify → CONSENT with the C8 copy and a ?reverify=1 fix",
    s1.ok === false && s1.code === "CONSENT" && /^Can't start: their self-exclusion on .+ ended their permission\. Enter their password to confirm it again\.$/.test(s1.message) && s1.href === `/admin/house-bots/${botId}?reverify=1`, j(s1));

  // H2 refuses on its own: force the bot ACTIVE as a Start that skipped the check would.
  await w.dal.houseBotStore.setStatus(botId, { from: ["AUTO_PAUSED"], to: "ACTIVE", pauseReason: null, pausedFromStatus: null });
  const pm = await w.poll();
  const i1 = await w.intent({ botId, userId }, pm.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
  const r1 = await w.place({ botId, userId }, i1);
  ok("6.4 · H2 → house_consent_stale while the void stands (same password)", r1.ok === false && r1.reason === "house_consent_stale", j(r1));
  await w.dal.houseBotStore.setStatus(botId, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "SELF_EXCLUDED", pausedFromStatus: "ACTIVE" });

  rlReset();
  await sleep(5);
  const rv = await reverify(botId, PW);
  const b2 = await bot(botId);
  ok("6.5 · re-verify after the restore runs normally (never NOTHING_TO_VERIFY) → PAUSED(MANUAL), wasActive, VERIFIED",
    rv.ok === true && b2.status === "PAUSED" && b2.pauseReason === "MANUAL" && rv.wasActive === true && Date.parse(b2.verifiedAt) > Date.parse(b2.consentVoidAt) && (await events(botId)).some((e: Any) => e.kind === "VERIFIED"), j(rv));
  ok("6.5b · the holder is told \"Your permission was confirmed\"", (await houseRows(userId)).some((n: Any) => n.titleEn === "Your permission was confirmed"));
  rlReset();
  const s2 = await start(botId);
  ok("6.6 · Start now succeeds → ACTIVE with STARTED and a fresh scope", s2.ok === true && (await bot(botId)).status === "ACTIVE" && !!(await w.dal.houseBotRuntimeStore.get(`bot:${botId}`)).scopeFrom, j(s2));
  ok("6.6b · re-verify and Start never revive the target the void ended", (await w.dal.targetStore.listForBot(botId, "all", null)).rows.every((t: Any) => t.status === "ENDED" && t.endCause === "CONSENT_VOID"));
  const pm2 = await w.poll();
  const i2 = await w.intent({ botId, userId }, pm2.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
  const r2 = await w.place({ botId, userId }, i2);
  ok("6.6c · …and a house bet now passes H2's consent check", r2.ok === true || r2.reason !== "house_consent_stale", j(r2));

  await RG.coolOff(userId, "1h");
  const v2 = await D.voidHouseConsent({ userId, cause: "COOLING_OFF", actorId: "system_house_bot" });
  ok("6.7 · a second RG episode after a re-verify voids again", v2.voided === true && (await bot(botId)).consentVoidCause === "COOLING_OFF", j(v2));
  // The break ends by its own timer; the COOLED_OFF status stays.
  const cur = await RG.getRgSettings(userId);
  await w.db.responsible.upsert({ ...cur, coolingOffUntil: new Date(Date.now() - 1_000).toISOString() });
  rlReset();
  const s3 = await start(botId);
  ok("6.8 · the break ended by its timer (status still COOLED_OFF): Start refused on consent, not blocked for good", s3.ok === false && s3.code === "CONSENT", j(s3));
  rlReset();
  await sleep(5);
  const rv2 = await reverify(botId, PW);
  rlReset();
  const s4 = await start(botId);
  ok("6.8b · …re-verify, then Start succeeds", rv2.ok === true && s4.ok === true && (await bot(botId)).status === "ACTIVE", `${j(rv2)} | ${j(s4)}`);

  // The backstop: a self-exclusion began after the last verification, and no detector wrote the void.
  const bb = await runningBot();
  await w.dal.houseBotStore.setStatus(bb.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
  await sleep(5);
  await RG.selfExclude(bb.userId, "24h");
  await restoreSelfExclusion(bb.userId);
  rlReset();
  const sb = await start(bb.botId);
  ok("6.9 · no void written, but a self-exclusion began after verifiedAt → Start refused (RG backstop)", sb.ok === false && sb.row?.code === "RG_SINCE_VERIFIED", j(sb));
}

// ═══ §7 · re-verify and Start, the other states (02 §2.6, §3.3; 04 C9, C10) ═════════════════════════
section("§7 · reverifyHouseBot and startHouseBot");
{
  // Suspension: re-verify is allowed (C8, PLAN §18), Start waits for the restore, and needs no re-verify after it.
  const s = await runningBot();
  await w.dal.houseBotStore.setStatus(s.botId, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "ACCOUNT_SUSPENDED", pausedFromStatus: "ACTIVE" });
  await w.setUserFields(s.userId, { status: "SUSPENDED" });
  rlReset();
  const st1 = await start(s.botId);
  ok("7.1 · suspended → Start refused INELIGIBLE", st1.ok === false && st1.code === "INELIGIBLE", j(st1));
  rlReset();
  const rv = await reverify(s.botId, PW);
  ok("7.1b · …while re-verify is allowed (consent survives a suspension)", rv.ok === true, j(rv));
  await w.setUserFields(s.userId, { status: "ACTIVE" });
  rlReset();
  const st2 = await start(s.botId);
  ok("7.1c · restored → Start succeeds with no further re-verify", st2.ok === true && (await bot(s.botId)).status === "ACTIVE", j(st2));
  const st3 = await start(s.botId);
  ok("7.2 · Start again → no-op \"already running\"", st3.ok === true && st3.alreadyRunning === true);

  // Password changed on a running bot (the hook is commit 4): AUTO_PAUSED(PASSWORD_CHANGED), then re-verify with the new one.
  const p = await runningBot();
  await PR.changePassword(p.userId, PW, PW2);
  await w.dal.houseBotStore.setStatus(p.botId, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "PASSWORD_CHANGED", pausedFromStatus: "ACTIVE" });
  rlReset();
  const sp = await start(p.botId);
  ok("7.3 · password changed → Start refused CONSENT: \"Enter the new password first\"", sp.ok === false && sp.code === "CONSENT" && sp.message.endsWith("Enter the new password first."), j(sp));
  rlReset();
  const old = await reverify(p.botId, PW);
  ok("7.3b · the OLD password → WRONG_PASSWORD with its change history", old.ok === false && old.code === "WRONG_PASSWORD" && old.message.includes("via Account settings"), j(old));
  rlReset();
  const inter = await interleave(p.userId, () => reverify(p.botId, PW2), async () => { await PR.changePassword(p.userId, PW2, PW3); });
  ok("7.4 · changed again while the owner typed → CHANGED_AGAIN, bot untouched, the right password's reset of the count not undone",
    inter.sawVerify && inter.result.ok === false && inter.result.code === "CHANGED_AGAIN" && (await bot(p.botId)).status === "AUTO_PAUSED" && (await user(p.userId)).failedLoginCount === 0, j(inter.result));
  rlReset();
  const rv3 = await reverify(p.botId, PW3);
  const pb = await bot(p.botId);
  ok("7.5 · the newest password → PAUSED(MANUAL), wasActive true, credential fields cleared", rv3.ok === true && pb.status === "PAUSED" && pb.pauseReason === "MANUAL" && rv3.wasActive === true && pb.pausedFromStatus == null, j(rv3));

  // Officer temp password: re-verify refused, uncounted.
  await w.setUserFields(p.userId, { passwordSetVia: "OFFICER_TEMP" });
  rlReset();
  const ot = await reverify(p.botId, PW3);
  ok("7.6 · support's temporary password → re-verify BLOCKED{PASSWORD_SET_BY_SUPPORT}, uncounted", ot.ok === false && ot.row?.code === "PASSWORD_SET_BY_SUPPORT" && (await user(p.userId)).failedLoginCount === 0, j(ot));
  await w.setUserFields(p.userId, { passwordSetVia: "SELF_CHANGE" });

  // Master OFF: Start still starts, and says so (C10).
  await w.switchOff();
  rlReset();
  const off = await start(p.botId);
  ok("7.7 · master switch OFF → Start succeeds with masterOn false (C10)", off.ok === true && off.masterOn === false && (await bot(p.botId)).status === "ACTIVE", j(off));
  await w.switchOn();
  const running = await reverify(p.botId, PW3);
  ok("7.8 · re-verify on a running bot with valid consent → NOTHING_TO_VERIFY", running.ok === false && running.code === "NOTHING_TO_VERIFY", j(running));

  // Rules the Start refuses, before any money read.
  const r = await runningBot();
  await w.dal.houseBotStore.setStatus(r.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
  await w.setCaps(r.botId, { stakeMaxTzs: null });
  const unset = await start(r.botId);
  ok("7.9 · an unset cap → RULES with the field and a ?tab=rules link", unset.ok === false && unset.code === "RULES" && unset.field === "stakeMaxTzs" && unset.href === `/admin/house-bots/${r.botId}?tab=rules`, j(unset));
  const removed = await w.dal.houseBotStore.setStatus(r.botId, { from: ["PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: OFFICER, reason: "fixture", cause: "MANUAL" } });
  ok("7.10 · a removed bot → Start and re-verify both refuse", !!removed && (await start(r.botId)).code === "REMOVED" && (await reverify(r.botId, PW)).code === "BOT_REMOVED");
}

// ═══ §8 · erasure (04 A5, R6) ════════════════════════════════════════════════════════════════════
section("§8 · erasure refuses a live bot, then pseudonymises it");
{
  await clearRoster();
  const h = await holder();
  rlReset();
  const d = await desig(h, { label: "Rehema Desk", note: "Rehema's account" });
  await w.dal.houseBotEventStore.append({ houseBotId: d.bot.id, userId: h, marketId: null, kind: "PAUSED", fromStatus: "PAUSED", toStatus: "PAUSED", reason: "asked by Rehema", actorId: OFFICER, payload: null });
  await N.notify({ userId: OFFICER, kind: "HOUSE_BOT", titleEn: `House bot "Rehema Desk" paused`, titleSw: `Boti "Rehema Desk" imesimamishwa`, titleZh: `机器人 "Rehema Desk" 已暂停`, bodyEn: "fixture", bodySw: "fixture sw", bodyZh: "固定", href: `/admin/house-bots/${d.bot.id}` });
  await w.setUserFields(h, { status: "CLOSED", closedAt: new Date().toISOString() });
  const req = fileDsarRequest({ userId: h, type: "ERASURE" });
  const blocked = (a: Any) => a.kind === "HOUSE_BOT" && a.titleEn.startsWith("Erasure blocked");
  const alertsBefore = ((await w.db.notification.findByUser(OFFICER, 500)) as Any[]).filter(blocked).length;
  const f1 = await fulfillDsarRequest({ id: req.id, officerId: OFFICER });
  const f2 = await fulfillDsarRequest({ id: req.id, officerId: OFFICER });
  const alerts = ((await w.db.notification.findByUser(OFFICER, 500)) as Any[]).filter(blocked).length - alertsBefore;
  ok("8.1 · a live bot → the erasure refuses with the R6 copy naming the bot", f1.ok === false && f1.error === `This account is still house bot ${d.bot.id}. The owner must remove it at /admin/house-bots/${d.bot.id} before it can be erased.`, j(f1));
  ok("8.1b · the request stays PENDING, and nothing was erased (label, phone kept)",
    listDsarRequests().find((r: Any) => r.id === req.id)?.status === "PENDING" && (await bot(d.bot.id)).label === "Rehema Desk" && !String((await user(h)).phoneE164).startsWith("erased:"));
  ok("8.1c · exactly one owner alert across two refused attempts", f2.ok === false && alerts === 1, `alerts=${alerts}`);

  await w.dal.houseBotStore.setStatus(d.bot.id, { from: ["PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: OFFICER, reason: "holder left Rehema", cause: "MANUAL" } });
  const f3 = await fulfillDsarRequest({ id: req.id, officerId: OFFICER });
  const tail = d.bot.id.slice(-6).toUpperCase();
  const b = await bot(d.bot.id);
  ok("8.2 · after Remove the erasure runs and counts one house bot", f3.ok === true && f3.erasure?.counts?.houseBots === 1, j(f3.erasure?.counts));
  ok("8.2b · label → \"Erased <TAIL6>\", note and removedReason → [erased], event reasons → [erased]",
    b.label === `Erased ${tail}` && b.note === "[erased]" && b.removedReason === "[erased]" && (await events(d.bot.id)).every((e: Any) => e.reason == null || e.reason === "[erased]"), j({ label: b.label, note: b.note }));
  const inbox = ((await w.db.notification.findByUser(OFFICER, 500)) as Any[]).filter((n) => n.titleEn.includes("paused") && n.href === `/admin/house-bots/${d.bot.id}`);
  ok("8.2c · the quoted label in an admin's inbox → \"Erased bot <TAIL6>\" in every language, counted",
    inbox.length === 1 && inbox[0].titleEn === `House bot "Erased bot ${tail}" paused` && !JSON.stringify(inbox[0]).includes("Rehema Desk") && f3.erasure.counts.houseBotNotificationsRedacted >= 1, j(inbox[0]));
  const { anonymizeClosedAccount }: Any = await import("../../src/lib/server/erasure.ts");
  const rerun = await anonymizeClosedAccount(h);
  ok("8.3 · a re-run reports zero house bots and zero redactions", rerun.ok === true && rerun.counts.houseBots === 0 && rerun.counts.houseBotNotificationsRedacted === 0, j(rerun.counts));
}

// ═══ §9 · recipients, the kind, the RG gate (04 A22, C13, W17) ════════════════════════════════════
section("§9 · who is told, and the HOUSE_BOT kind");
{
  const second = await w.user({ role: "ADMIN" });
  const compliance = await w.user({ role: "COMPLIANCE" });
  const ids = (await A.houseBotAlertRecipients()).map((u: Any) => u.id);
  ok("9.1 · recipients = every ADMIN, and no other role", ids.includes(OFFICER) && ids.includes(second) && !ids.includes(compliance), ids.join());
  ok("9.2 · the holder is named by handle only", A.playerHandle("usr_abcdef123456") === "Player #123456");
  ok("9.3 · HOUSE_BOT is a notification kind and NOT a money kind (W17)", NOTIFICATION_KINDS.includes("HOUSE_BOT") && !MONEY_KINDS.includes("HOUSE_BOT"));
  const rg = await holder();
  await RG.coolOff(rg, "1h");
  const before = (await houseRows(rg)).length;
  const r = await N.notifyHouseBotOwner(rg, "started");
  ok("9.4 · a holder on a break gets no HOUSE_BOT notice (the RG gate)", r === null && (await houseRows(rg)).length === before);
}

// ═══ §10 · source pins (memory child only) ════════════════════════════════════════════════════════
if (STORE === "memory") {
  section("§10 · source pins — the password writers, the officer email, the owner guard");
  const ROOT = join(import.meta.dirname, "..", "..");
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f)) files.push(p); } };
  walk(join(ROOT, "src"));
  /** A write of a password hash VALUE: not a type, not null, not the DAL mappers' `u.passwordHash`, not a dev fixture's "x". */
  const WRITE = /\bpasswordHash\s*:\s*(?!null\b|string\b|"x"|u\.passwordHash\b|\s*$)[A-Za-z_$][\w$.]*/;
  const writersIn = (text: string) => {
    const lines = text.split(/\r?\n/);
    const out: { line: number; hasVia: boolean }[] = [];
    lines.forEach((l, i) => { if (WRITE.test(l)) out.push({ line: i + 1, hasVia: lines.slice(Math.max(0, i - 6), i + 7).some((x) => /passwordSetVia\s*:/.test(x)) }); });
    return out;
  };
  /** Writers that set no history, each with its reason. A new one fails until it writes the history or is listed here. */
  const EXEMPT: Record<string, string> = { "src/app/api/dev-test/seed-admin/route.ts": "dev-only seed route; 404 in production" };
  const found: Record<string, { line: number; hasVia: boolean }[]> = {};
  for (const f of files) {
    const rel = f.slice(ROOT.length + 1).replaceAll("\\", "/");
    const ws = writersIn(readFileSync(f, "utf8"));
    if (ws.length) found[rel] = ws;
  }
  const missing = Object.entries(found).flatMap(([f, ws]) => ws.filter((x) => !x.hasVia && !EXEMPT[f]).map((x) => `${f}:${x.line}`));
  ok("10.1 · every password-hash writer in src/ writes passwordSetVia beside it (or is a listed dev exemption)", missing.length === 0, missing.join(", "));
  ok("10.1b · population · the writers are exactly auth-service (1), password-reset (3) and the dev seed route",
    (found["src/lib/server/auth-service.ts"]?.length ?? 0) === 1 && (found["src/lib/server/password-reset.ts"]?.length ?? 0) === 3 && Object.keys(found).length === 3, j(Object.fromEntries(Object.entries(found).map(([f, ws]) => [f, ws.length]))));
  ok("10.1c · CONTROL · a planted writer with no history is caught", writersIn("await db.user.update(id, {\n  passwordHash: hash, passwordSalt: salt });").some((x) => !x.hasVia));
  ok("10.1d · CONTROL · …and one with the history is not", writersIn("db.user.update(id, { passwordHash: hash, passwordSalt: salt, passwordSetVia: \"SELF_CHANGE\" });").every((x) => x.hasVia));
  const actions = readFileSync(join(ROOT, "src/app/admin/players/[id]/actions.ts"), "utf8");
  ok("10.2 · the officer email writer passes byOfficer: true", /setUserEmail\(userId, email, \{ byOfficer: true \}\)/.test(actions));
  const guard = readFileSync(join(ROOT, "src/lib/server/rbac-guard.ts"), "utf8");
  const ownerBody = guard.slice(guard.indexOf("export async function requireOwner"), guard.indexOf("export async function requireOwner") + 700);
  ok("10.3 · the owner guard still admits exactly role ADMIN — the rule houseBotAlertRecipients copies (A22)", ownerBody.includes(`me.role !== "ADMIN"`), ownerBody.slice(0, 200));
  const seam = readFileSync(join(ROOT, "src/lib/server/house-bot/seam.ts"), "utf8");
  ok("10.4 · seam H2 asks the one consent predicate, with no inline void comparison", seam.includes("consentValid(bot, passwordFingerprint(u.passwordHash))") && !/consentVoidAt\s*==\s*null/.test(seam));
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
