/**
 * Referral reward tests (in-memory store; no DATABASE_URL).
 *
 * THE PLAYER PROMO's rules (Management Bonus Rules §4, 2026-07-01):
 *   - Signup bonus: DISABLED by default (was SIGNUP, now off)
 *   - Prize: ENABLED, milestone FIRST_BET — recruit must register + deposit +
 *     place at least one position >= TZS 20,000 before referrer is rewarded
 *   - Self-referral blocked, unknown codes rejected
 *   - Idempotency: a recruit can only be bound once, prize paid once per recruit
 *
 * 🔴 WHY §1–§5 RUN UNDER `FEATURE_INVITEREWARDS=ACTIVE` (2026-09-25). The SURFACE is ACTIVE now —
 * a player binds with no override at all — and what sleeps is the MONEY: since 2026-09-26 invites
 * are Not payable until the Owner's switch on `/admin/affiliate` says otherwise, and no suite stores
 * that record, so the override is the FORCED ceiling (payable, the switch not consulted). ⛔ NOT A RENAME of the
 * old `FEATURE_INVITE` line: that one would leave `policyFor` refusing every accrual with
 * `player_rewards_withdrawn`, and §1–§5 would assert TZS 0 everywhere while looking like they had
 * tested the promo. The paragraph below is the original reasoning, kept because it is still why
 * the population is a PLAYER and not a role-only "agent".
 *
 * (2026-09-07) Invite was WITHDRAWN from the
 * player product, so a PLAYER referrer is refused at the bind and none of the mechanics above
 * can execute. This suite used to work around that by fixturing every referrer as
 * `role: "AGENT"` — and then asserted that an "agent" earned the PLAYER PRIZE into the BONUS
 * wallet, which is two things the agent programme forbids (commission only; cash only). A role
 * with no approval is not an agent, so once `approvedAt` became the discriminator the suite
 * went red on exactly the assertions that were wrong.
 *
 * ⭐ The honest population for player-promo mechanics is a PLAYER referrer with the promo ON —
 * the same env override `withdrawn-features` §4 uses to keep the dormant ON path executable,
 * restored in a `finally`. §6 then measures the SHIPPED state with the override OFF (the bind lands and
 * pays NOTHING), and §7 proves an
 * approved AGENT on the identical path earns NO prize at all.
 */
// ⚠️ THE BONUS WALLET IS WITHDRAWN FROM THE PRODUCT (`src/lib/feature-state.ts`), and since
// 2026-09-06 `creditBonus` enforces that: the product state outranks the operator config, so no
// grant is minted while the feature sleeps. This suite exercises the bonus machinery a
// re-enablement depends on, so it drives the ON path — Law 2, one home, see the module header.
import "./lib/bonus-feature-on.mts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { bindRecruit, ensureAffiliateAccount, onRecruitBet } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { approveFixtureAgent } from "./lib/agent-fixtures.mts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string, role: "PLAYER" | "AGENT" = "PLAYER"): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25577${String(++seq).padStart(7, "0")}`, email: `${id}@t.tz`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
const cash = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
async function confirmedDeposit(uid: string, ref: string) {
  await db.txn.create({
    id: `txn_${ref}_dep`, walletId: `wal_${uid}`, userId: uid,
    type: "DEPOSIT", status: "CONFIRMED", amount: 50_000, fee: 0, taxWithheld: 0,
    balanceAfter: 50_000, currency: "TZS", provider: "MPESA", providerRef: null,
    msisdn: null, description: "test deposit", betId: null, amlReason: null,
    createdAt: now(), updatedAt: now(), completedAt: now(),
  } as never);
}

// ── config: bonus disabled, prize enabled on FIRST_BET ───────────────────────
{
  const c = getAffiliateConfig();
  ok("program enabled", c.enabled);
  ok("signup bonus disabled (default)", !c.bonus.enabled, `enabled=${c.bonus.enabled}`);
  ok("prize enabled, milestone FIRST_BET", c.prize.enabled && c.prize.milestone === "FIRST_BET", `prize=${c.prize.enabled} milestone=${c.prize.milestone}`);
  ok("minBetAmountTzs = 20,000", c.prize.minBetAmountTzs === 20_000, `min=${c.prize.minBetAmountTzs}`);
  ok("requireDeposit = true", c.prize.requireDeposit === true);
}

const PRIZE = getAffiliateConfig().prize.amountTzs;

// ── §1–§5 · THE PLAYER PROMO, WITH THE PROMO ON ───────────────────────────────
process.env.FEATURE_INVITEREWARDS = "ACTIVE";
try {
  // ── §1 · bind recruit → no immediate reward (FIRST_BET, not SIGNUP) ──────────
  await mkUser("ref_alice");                              // ⭐ a PLAYER — the promo's own population
  const aliceAcct = await ensureAffiliateAccount("ref_alice");
  ok("§1 referrer has a referral code", !!aliceAcct.code);

  await mkUser("rec_bob");
  const r1 = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
  ok("§1 recruit bound to referrer", r1.bound === true, JSON.stringify(r1));
  ok("§1 ⭐ the attribution is stamped PLAYER", (await db.user.findById("rec_bob"))?.recruitedProgramme === "PLAYER");
  ok("§1 no reward on signup (FIRST_BET trigger)", (await bonus("ref_alice")) === 0, `bonus=${await bonus("ref_alice")}`);
  ok("§1 recruit balance untouched", (await cash("rec_bob")) === 0 && (await bonus("rec_bob")) === 0);

  // ── §2 · recruit places qualifying bet → referrer gets prize ─────────────────
  await confirmedDeposit("rec_bob", "bob");
  await onRecruitBet("rec_bob", { stake: 25_000 });
  // Prize routes to bonus wallet when affiliateToBonus=true (default)
  ok("§2 referrer rewarded after recruit's first bet", (await bonus("ref_alice")) === PRIZE, `bonus=${await bonus("ref_alice")} expected=${PRIZE}`);
  ok("§2 …and the row is stamped PLAYER", (await db.referralReward.listByReferrer("ref_alice")).every((r) => r.programme === "PLAYER"));

  // ── §3 · idempotency: recruit can't be bound twice (no double reward) ────────
  const r1again = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
  ok("§3 re-bind same recruit rejected", r1again.bound === false);

  // ── §4 · second recruit also rewards ─────────────────────────────────────────
  await mkUser("rec_carol");
  await bindRecruit({ recruitUserId: "rec_carol", code: aliceAcct.code });
  await confirmedDeposit("rec_carol", "carol");
  await onRecruitBet("rec_carol", { stake: 20_000 });
  // Sequential enforcement: second prize grant is QUEUED, bonusBalance = PRIZE (only active)
  const aliceGrants = await db.bonusGrant.listByUser("ref_alice");
  ok("§4 second recruit bet → two grants total", aliceGrants.length === 2, `grants=${aliceGrants.length}`);

  // ── §5 · anti-fraud: self-referral blocked, unknown code rejected ────────────
  await mkUser("ref_dave");
  const dave = await ensureAffiliateAccount("ref_dave");
  const self = await bindRecruit({ recruitUserId: "ref_dave", code: dave.code });
  ok("§5 self-referral blocked", self.bound === false);
  const bad = await bindRecruit({ recruitUserId: "ref_dave", code: "NOPE9999" });
  ok("§5 unknown code rejected", bad.bound === false);
  // ⛔ REFUSED, NEVER TRUNCATED. A 33-character code is not shortened to a prefix that might
  // match somebody else's — a permanent mis-bind is worse than a lost attribution.
  const tooLong = await bindRecruit({ recruitUserId: "ref_dave", code: "A".repeat(33) });
  ok("§5 an over-length code is refused, not truncated", tooLong.bound === false && tooLong.reason === "no_code", JSON.stringify(tooLong));
  ok("§5 blocked binds paid nothing", (await bonus("ref_dave")) === 0 && (await cash("ref_dave")) === 0);
} finally {
  delete process.env.FEATURE_INVITEREWARDS;
}
ok("§5 the override is restored, not leaked", process.env.FEATURE_INVITEREWARDS === undefined);

// ── §6 · THE SHIPPED STATE — the code RECRUITS, and it PAYS NOTHING ──────────
// 🔴 REPLACES THE 2026-09-06 RULE ("an ordinary player's code does not recruit"), which was the
// product until 2026-09-25 and is not any more. The two halves that replaced it are both asserted
// here, because either one alone is a false description of the feature: a bind that pays would be
// the promo nobody approved, and a refusal to bind would be the withdrawn surface we just opened.
// ⭐ Note the pairing: §1–§5 above are the CONTROL — the same population, with the MONEY switched
// on, pays all the way to a real grant — so the zero below cannot be a machine that is simply
// broken. And the override is OFF here: this section measures production.
{
  await mkUser("ref_erin");                       // deliberately a PLAYER
  await mkUser("rec_frank");
  const erin = await ensureAffiliateAccount("ref_erin");
  const viaPlayer = await bindRecruit({ recruitUserId: "rec_frank", code: erin.code });
  ok("§6 a PLAYER's code DOES recruit", viaPlayer.bound === true, JSON.stringify(viaPlayer));
  const frank = await db.user.findById("rec_frank");
  ok("§6 …and the attribution is stamped PLAYER", frank?.recruitedBy === "ref_erin" && frank?.recruitedProgramme === "PLAYER",
     JSON.stringify({ by: frank?.recruitedBy, programme: frank?.recruitedProgramme }));
  // ⛔ THE MONEY HALF, THROUGH THE REAL HOOK. §1 pays a TZS 10,000 prize on this exact call; here
  // it must pay nothing at all — no balance, and no reward ROW either (a TZS 0 row would be a
  // payable the operator could later be asked to settle).
  await onRecruitBet("rec_frank", { stake: 25_000 });
  ok("§6 ⛔ …and the referrer is paid NOTHING", (await bonus("ref_erin")) === 0, `bonus=${await bonus("ref_erin")}`);
  ok("§6 ⛔ …with no reward row written at all", (await db.referralReward.listByReferrer("ref_erin")).length === 0,
     JSON.stringify((await db.referralReward.listByReferrer("ref_erin")).map((r) => [r.type, r.status])));
  // ⛔ AND A ROLE IS NOT AN APPROVAL. `role: "AGENT"` with no `approvedAt` is exactly what this
  // suite used to fixture as an agent. They recruit as the ordinary player they are — what must
  // never happen is the AGENT stamp, which is what would put them on the commission path.
  await mkUser("ref_gina", "AGENT");
  await mkUser("rec_hal");
  const gina = await ensureAffiliateAccount("ref_gina");
  const viaRoleOnly = await bindRecruit({ recruitUserId: "rec_hal", code: gina.code });
  ok("§6 role AGENT with NO approval recruits as a player", viaRoleOnly.bound === true, JSON.stringify(viaRoleOnly));
  ok("§6 ⛔ …stamped PLAYER, never AGENT", (await db.user.findById("rec_hal"))?.recruitedProgramme === "PLAYER");
}

// ── §7 · AN APPROVED AGENT ON THE IDENTICAL PATH EARNS NO PRIZE ───────────────
// 🔴 On the shipped config the prize is ON and commission is OFF, so an approved agent would
// have earned TZS 200,000 of flat prizes as withdrawable cash and zero commission — the exact
// inverse of what they were vetted and charged for. The agent programme is commission-only BY
// CONSTRUCTION: `payPrize` is reached only under a PLAYER policy.
{
  await mkUser("ref_ivy");
  const ivyCode = await approveFixtureAgent("ref_ivy", { commissionPct: 20 });
  await mkUser("rec_jon");
  const bound = await bindRecruit({ recruitUserId: "rec_jon", code: ivyCode });
  ok("§7 CONTROL · an approved agent's code recruits with the promo OFF", bound.bound === true, JSON.stringify(bound));
  ok("§7 …and the attribution is stamped AGENT", (await db.user.findById("rec_jon"))?.recruitedProgramme === "AGENT");
  await confirmedDeposit("rec_jon", "jon");
  await onRecruitBet("rec_jon", { stake: 25_000 });            // the same qualifying bet §2 paid on
  ok("§7 ⛔ the agent earns NO prize — not in bonus", (await bonus("ref_ivy")) === 0, `bonus=${await bonus("ref_ivy")}`);
  ok("§7 ⛔ …and not in cash", (await cash("ref_ivy")) === 0, `cash=${await cash("ref_ivy")}`);
  ok("§7 ⛔ …and no PRIZE row and no grant exist",
     (await db.referralReward.listByReferrer("ref_ivy")).filter((r) => r.type === "PRIZE").length === 0
     && (await db.bonusGrant.listByUser("ref_ivy")).length === 0);
}

// ── §8 · THE CODE SURVIVES THE DOORS (route audit B3, 2026-10-06) ─────────────
// 🔴 §1–§7 prove the bind pays (or does not) once a code ARRIVES at sign-up. It did not always arrive: an invited
// player who tapped "Sign in", failed, and then tapped "Create one" reached sign-up with the code gone, and the
// header's bare Sign in / Sign up doors dropped it too. `recruitedBy` is written once, so each of those was a credit
// lost for good, with no error anywhere. ⭐ One rule normalises a code (src/lib/referral-code.ts), and every door
// between the invite link and the sign-up form carries it. Read as source, comments stripped.
{
  const ROOT = fileURLToPath(new URL("..", import.meta.url));
  const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).replace(/\r\n/g, "\n");
  const relOf = (full: string) => relative(ROOT, full).split(sep).join("/");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
  const srcFiles = walk(join(ROOT, "src"));
  const DEF = "function normalizeReferralCode(";
  const defines = srcFiles
    .filter((f) => readFileSync(f, "utf8").includes(DEF) && decomment(readFileSync(f, "utf8")).includes(DEF))
    .map(relOf);
  ok("§8.1 control: the walker read the source tree and finds the definition where it lives",
     srcFiles.length > 500 && defines.includes("src/lib/referral-code.ts"), `${srcFiles.length} files · ${defines.join(", ")}`);
  ok("§8.1 ONE referral rule — `function normalizeReferralCode(` is defined in exactly one file, src/lib/referral-code.ts",
     defines.length === 1 && defines[0] === "src/lib/referral-code.ts", defines.join(", "));
  ok("§8.2 affiliate-service re-exports it from that one home, so its importers compile unchanged",
     /export \{[^}]*normalizeReferralCode[^}]*\} from "@\/lib\/referral-code"/.test(read("src/lib/server/affiliate-service.ts")));

  const LOGIN = read("src/app/auth/login/page.tsx");
  const loginDefects = [
    !LOGIN.includes("normalizeReferralCode(sp.ref)") && "it does not read ?ref= through the one rule",
    !LOGIN.includes('<input type="hidden" name="ref" value={refCode} />') && "no hidden ref field for the action's failure hop to read",
    !LOGIN.includes('if (refCode) keepQs.set("ref", refCode);') && "registerHref does not carry the code",
    !/<Link\s+href=\{registerHref as never\}/.test(LOGIN) && "'Create one' does not use registerHref",
    !LOGIN.includes("cta: { href: registerHref, label: t.auth.createOne }") && "the no_account panel's CTA does not use registerHref",
    LOGIN.includes("/auth/register${nextSafe") && "a sign-up link is still built from nextSafe alone, which drops the code",
  ].filter(Boolean) as string[];
  ok("§8.3 the sign-in page reads the code, posts it back in a hidden field, and both of its ways to sign-up carry it (registerHref)",
     loginDefects.length === 0, loginDefects.join(" · "));
  ok("§8.3 control: the old sign-up link shape is caught",
     "href={`/auth/register${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : \"\"}` as never}".includes("/auth/register${nextSafe"));

  const LOGIN_ACTIONS = read("src/app/auth/login/actions.ts");
  const at = LOGIN_ACTIONS.indexOf("export async function startLoginAction(");
  const end = at < 0 ? -1 : LOGIN_ACTIONS.indexOf("\nexport ", at + 10);
  const loginDoor = at < 0 ? "" : LOGIN_ACTIONS.slice(at, end < 0 ? undefined : end);
  ok("§8.4 the sign-in action's failure hop puts the code back on the page it returns to, normalised",
     loginDoor.length > 400 && loginDoor.includes('normalizeReferralCode(String(formData.get("ref") ?? ""))')
       && loginDoor.includes('params.set("ref", ref)'), `${loginDoor.length} chars`);

  const REG = read("src/app/auth/register/page.tsx");
  ok("§8.5 the sign-up page's 'Sign in' link keeps the code and where they were going",
     REG.includes('signInQs.set("ref", refCode)') && REG.includes('signInQs.set("next", nextOk)')
       && REG.includes("`/auth/login?${signInQs.toString()}`") && REG.includes('import { normalizeReferralCode } from "@/lib/referral-code";'));

  const BAR = read("src/components/layout/top-app-bar.tsx");
  ok("§8.6 the header's guest doors come from authDoorHrefs (this page as next, the code kept) — never a bare sign-up door",
     BAR.includes("authDoorHrefs(") && !BAR.includes('href={"/auth/register" as never}') && !BAR.includes('href={"/auth/login" as never}'));
}

console.log(`\nreferral-signup: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
