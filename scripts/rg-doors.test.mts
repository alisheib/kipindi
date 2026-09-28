/**
 * THE DOORS — the sign-in gate, and the session limit that was never enforced.
 *
 * Covers three findings that arrived together on 2026-08-27:
 *
 *   E-240  Four places mint a session and they carried THREE different hand-copied
 *                account-status gates. `verifyOtpAndAuth` carried NONE, so the OTP door
 *                readmitted a self-excluded player that the password door refused.
 *   E-238 (login half)  A self-exclusion's period is a MINIMUM, not an expiry. Ali's ruling,
 *                2026-08-27: the account never reinstates itself; the player asks, an officer
 *                reopens.
 *   E-235        `sessionTimeLimitMin` was settable, shown to officers, and COUNTED AS A LIMIT
 *                by the Board-facing RG report — and enforced nowhere.
 *
 * ⭐ §2 IS A STRUCTURAL CHECK ON PURPOSE, AND IT IS THE ONE THAT MATTERS MOST. E-240 was not a
 * wrong gate; it was a MISSING CALL. A behavioural test of the gate function would have been
 * green throughout, because the gate itself was fine — nobody called it. So §2 asks the only
 * question that could have caught it: does every site that mints a session consult the gate?
 */
import { db, type StoredWallet, type StoredResponsibleGambling } from "../src/lib/server/store.ts";
import { buyPosition, createMarket } from "../src/lib/server/market-service.ts";
import { selfExclusionStanding, checkSessionTimeLimit, setLimits } from "../src/lib/server/responsible-gambling.ts";
import type { HarmFlag } from "../src/lib/server/responsible-gambling.ts";
import { marketingRgStanding, sixMonthFloor, MARKETING_RG_DEPS } from "../src/lib/server/marketing/rg.ts";
import type { MarketingRgDeps, MarketingRgStanding } from "../src/lib/server/marketing/rg.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function player(id: string, balance = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+2557${String(++seq).padStart(8, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(),
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

async function rg(userId: string, patch: Partial<StoredResponsibleGambling>): Promise<void> {
  await db.responsible.upsert({
    userId,
    dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null,
    sessionTimeLimitMin: null, realityCheckIntervalMin: 30,
    selfExclusionUntil: null, coolingOffUntil: null,
    pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
    pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
    pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
    ...patch,
  } as StoredResponsibleGambling);
}

const mkMarket = (title: string) => createMarket({
  titleEn: title, titleSw: title, category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

console.log("\n§1 · what a self-exclusion means once its period has run out\n");
{
  await player("se_none");
  ok("1.1 no exclusion at all → none", (await selfExclusionStanding("se_none")).state === "none");

  await player("se_live");
  await rg("se_live", { selfExclusionUntil: new Date(Date.now() + 3_600_000).toISOString() } as never);
  const live = await selfExclusionStanding("se_live");
  ok("1.2 a running exclusion → serving", live.state === "serving", live.state);
  ok("1.3 …and a one-hour one is NOT reported permanent",
    live.state === "serving" && live.permanent === false);

  await player("se_perm");
  await rg("se_perm", { selfExclusionUntil: new Date(Date.now() + 100 * 365 * 864e5).toISOString() } as never);
  const perm = await selfExclusionStanding("se_perm");
  ok("1.4 'perm' is stored as +100 years, and IS reported permanent",
    perm.state === "serving" && perm.permanent === true, perm.state);

  await player("se_served");
  await rg("se_served", { selfExclusionUntil: new Date(Date.now() - 60_000).toISOString() } as never);
  const served = await selfExclusionStanding("se_served");
  ok("1.5 ⭐ a period that has RUN OUT is minimum_served — NOT 'none', and never an auto-lift",
    served.state === "minimum_served", served.state);

  // ⭐ CONTROL — the three states must actually DISCRIMINATE. If every input returned the same
  // state the assertions above would all pass while measuring nothing.
  ok("1.6 control: the three inputs produce three DIFFERENT states",
    new Set([
      (await selfExclusionStanding("se_none")).state,
      (await selfExclusionStanding("se_live")).state,
      (await selfExclusionStanding("se_served")).state,
    ]).size === 3);
}

console.log("\n§2 · every door that mints a session consults ONE gate (E-240)\n");
{
  const SRC = decomment(readFileSync("src/lib/server/auth-service.ts", "utf8").replace(/\r\n/g, "\n"));

  ok("2.0 control: the gate exists, by name", /async function assertSignInAllowed\s*\(/.test(SRC));

  // Split the file into top-level functions and ask, of each one that mints a session, whether
  // it also calls the gate. This is the exact shape of the E-240 defect: a real gate, a real
  // door, and no line joining the two.
  const fnRe = /(?:export\s+)?async function (\w+)\s*\(/g;
  const bounds: { name: string; at: number }[] = [];
  for (let m = fnRe.exec(SRC); m; m = fnRe.exec(SRC)) bounds.push({ name: m[1], at: m.index });
  bounds.push({ name: "<eof>", at: SRC.length });

  /**
   * ⛔ DECLARED, WITH ITS REASON — not an allowlist to grow whenever a door is inconvenient.
   * `registerWithPassword` refuses an existing phone with ALREADY_EXISTS before it writes
   * anything, so the only account it can ever mint for is one created microseconds earlier,
   * which cannot be self-excluded, suspended or closed.
   */
  const DECLARED = new Set(["registerWithPassword"]);

  let minters = 0, accounted = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const body = SRC.slice(bounds[i].at, bounds[i + 1].at);
    if (!/\bcreateSession\s*\(/.test(body)) continue;
    minters++;
    const name = bounds[i].name;
    if (DECLARED.has(name)) { accounted++; continue; }
    const callsGate = /assertSignInAllowed\s*\(/.test(body);
    ok(`2.1 ${name}() mints a session AND consults the gate`, callsGate,
      callsGate ? "" : "this door mints a session without reading account status — the E-240 defect");
    if (callsGate) accounted++;
  }

  // ⭐ REACH FLOOR. If a refactor renamed createSession, `minters` would fall to 0 and every
  // assertion above would silently vanish — a suite that passes because it stopped looking.
  ok("2.2 control: the scan actually found the doors (at least 4 session minters)",
    minters >= 4, `found ${minters}`);
  ok("2.3 every door found is accounted for", accounted === minters, `${accounted}/${minters}`);

  // ⛔ THE ASYMMETRY THAT MUST NOT DRIFT. Adding COOLED_OFF to the sign-in gate would lock a
  // player out of their own account for the length of a break they took to protect themselves
  // — unable to read the end date, see their balance, or withdraw.
  const gateAt = SRC.indexOf("async function assertSignInAllowed");
  const afterGate = SRC.indexOf("function fmtExclusionDate", gateAt);
  const gateOnly = SRC.slice(gateAt, afterGate > gateAt ? afterGate : undefined);
  ok("2.4 control: the gate body was actually isolated", gateOnly.length > 200 && gateOnly.length < 4000,
    `${gateOnly.length} chars`);
  ok("2.5 ⛔ the sign-in gate does NOT block COOLED_OFF — a break stops betting, not access",
    !/COOLED_OFF/.test(gateOnly), "a cool-off must never bar sign-in");
  ok("2.6 the gate asks selfExclusionStanding() rather than comparing a date itself",
    /selfExclusionStanding\s*\(/.test(gateOnly));
}

console.log("\n§3 · the session time limit, measured (E-235)\n");
{
  await player("sl_nolimit");
  ok("3.1 no limit set → no opinion (null), whatever the clock says",
    (await checkSessionTimeLimit("sl_nolimit", Date.now() - 999 * 60_000)) === null);

  await player("sl_noclock");
  await rg("sl_noclock", { sessionTimeLimitMin: 30 } as never);
  ok("3.2 ⛔ a limit but NO play clock → null, never 'exceeded' — a script with no request context must not be refused",
    (await checkSessionTimeLimit("sl_noclock", undefined)) === null);

  await player("sl_under");
  await rg("sl_under", { sessionTimeLimitMin: 30 } as never);
  const under = await checkSessionTimeLimit("sl_under", Date.now() - 10 * 60_000);
  ok("3.3 ten minutes into a thirty-minute limit → not exceeded", under?.exceeded === false, JSON.stringify(under));

  await player("sl_over");
  await rg("sl_over", { sessionTimeLimitMin: 30 } as never);
  const over = await checkSessionTimeLimit("sl_over", Date.now() - 31 * 60_000);
  ok("3.4 thirty-one minutes into a thirty-minute limit → exceeded", over?.exceeded === true, JSON.stringify(over));
  ok("3.5 …and it reports the figures as DATA, not prose",
    over?.limitMin === 30 && over.playedMin === 31, JSON.stringify(over));
}

console.log("\n§4 · and the money path actually refuses (E-235)\n");
{
  // ⭐ CONTROL FIRST. Without a bet that SUCCEEDS under the same machinery, a refusal below
  // proves only that something is broken.
  await player("sl_bet_under", 500_000);
  await rg("sl_bet_under", { sessionTimeLimitMin: 60 } as never);
  const mA = await mkMarket("E-235 control");
  const rA = await buyPosition("sl_bet_under", {
    marketId: mA.id, side: "YES", stake: 2_000, playStartedAt: Date.now() - 5 * 60_000,
  });
  ok("4.0 control: five minutes into a sixty-minute limit, the bet is ACCEPTED",
    rA.ok, rA.ok ? "" : `refused: ${(rA as { reason?: string }).reason}`);

  await player("sl_bet_over", 500_000);
  await rg("sl_bet_over", { sessionTimeLimitMin: 30 } as never);
  const mB = await mkMarket("E-235 enforced");
  const rB = await buyPosition("sl_bet_over", {
    marketId: mB.id, side: "YES", stake: 2_000, playStartedAt: Date.now() - 45 * 60_000,
  });
  ok("4.1 ⭐ forty-five minutes into a thirty-minute limit, the bet is REFUSED — the report finally states something true",
    !rB.ok, rB.ok ? "the player's own session limit still does not stop a bet" : "");
  ok("4.2 …with reason session_limit_reached, not a generic block",
    !rB.ok && (rB as { reason?: string }).reason === "session_limit_reached",
    !rB.ok ? String((rB as { reason?: string }).reason) : "");
  ok("4.3 …and the limit rides as DATA so the copy can name it",
    !rB.ok && (rB as { detail?: { limitMin?: number } }).detail?.limitMin === 30);

  // ⛔ A limit nobody set must not refuse anybody.
  await player("sl_bet_free", 500_000);
  const mC = await mkMarket("E-235 unaffected");
  const rC = await buyPosition("sl_bet_free", {
    marketId: mC.id, side: "YES", stake: 2_000, playStartedAt: Date.now() - 600 * 60_000,
  });
  ok("4.4 control: a player who set NO limit bets freely after ten hours", rC.ok,
    rC.ok ? "" : `refused: ${(rC as { reason?: string }).reason}`);
}

console.log("\n§5 · the limit a player may set is bounded (E-235, and the schema nobody wired)\n");
{
  // `validators.ts:219` has declared min(15).max(480) for this field since ResponsibleLimitsSchema
  // was written, and nothing has ever used that schema — the RG form goes straight to setLimits,
  // whose only check was "a non-negative integer". Harmless while nothing enforced the value;
  // not harmless now that it refuses bets.
  const setAndRead = async (id: string, v: number | null) => {
    await player(id);
    await setLimits(id, { sessionTimeLimitMin: v });
    return (await db.responsible.get(id))?.sessionTimeLimitMin ?? null;
  };
  ok("5.1 a 1-minute limit is raised to the platform's stated floor of 15",
    (await setAndRead("lim_tiny", 1)) === 15);
  ok("5.2 a 600-minute limit is lowered to the stated ceiling of 480",
    (await setAndRead("lim_huge", 600)) === 480);
  // ⛔ REMOVING A LIMIT MUST STAY POSSIBLE. Clamping 0 up to 15 would trap a player inside a
  // control they had just switched off — the opposite of what the control is for.
  ok("5.3 ⛔ zero means NO LIMIT and is not clamped up to 15",
    (await setAndRead("lim_zero", 0)) === null);
  ok("5.4 ⛔ null means NO LIMIT too", (await setAndRead("lim_null", null)) === null);
  // ⭐ CONTROL — without this, a clamp that flattened every input to 15 would pass 5.1 and prove
  // nothing. An in-range value must survive untouched.
  ok("5.5 control: an in-range value is stored exactly as the player typed it",
    (await setAndRead("lim_ok", 45)) === 45);
}

console.log("\n§6 · the screen shows the refusal the server computed (E-240, measured on production)\n");
{
  const ACTION = decomment(readFileSync("src/app/auth/login/actions.ts", "utf8").replace(/\r\n/g, "\n"));
  const PAGE = decomment(readFileSync("src/app/auth/login/page.tsx", "utf8").replace(/\r\n/g, "\n"));
  const GATE = decomment(readFileSync("src/lib/server/auth-service.ts", "utf8").replace(/\r\n/g, "\n"));

  // 🔴 MEASURED ON PRODUCTION 2026-08-28, and it is why this section exists. The login action
  // chose its banner by running /self-exclusion/i over the refusal's ENGLISH PROSE. A player
  // whose period had ENDED matched, and was shown "you will not be able to sign in until the
  // period ends" — about a period that ended an hour earlier. A player still SERVING did NOT
  // match, because their sentence says "self-excluded", and fell through to a generic blocked
  // screen. One regex, two wrong answers, in opposite directions.
  /**
   * ⛔ SLICE THE FILE BY FUNCTION. THE FIRST DRAFT OF §6 DID NOT, AND `red:rg-doors` CAUGHT IT.
   *
   * Both of this section's password-door checks were file-wide greps, and this file has TWO
   * doors in it. When the harness mutated the PASSWORD hop back to a prose match, the checks
   * stayed green — because the OTP hop below still contained `detail?.standing` and still
   * contained `result.code === "SUSPENDED"`. **A guard satisfied by a call site other than the
   * one it is about is the exact defect this whole session keeps finding**, and it appeared in
   * the check written to prevent it. Two mutations reported MISS; that is the harness earning
   * its keep, and the misses were correct.
   */
  const fnBody = (name: string) => {
    const at = ACTION.indexOf(`export async function ${name}(`);
    if (at < 0) return "";
    const next = ACTION.indexOf("export async function ", at + 10);
    return ACTION.slice(at, next < 0 ? undefined : next);
  };
  const PASSWORD_DOOR = fnBody("startLoginAction");
  const OTP_DOOR = fnBody("verifyLoginOtpAction");
  // ⭐ REACH FLOOR — if either function is renamed the slices go empty and every check below
  // would pass against nothing.
  ok("6.0 control: both door functions were located in the file",
    PASSWORD_DOOR.length > 400 && OTP_DOOR.length > 400,
    `password=${PASSWORD_DOOR.length} otp=${OTP_DOOR.length}`);

  ok("6.1 ⛔ the password door does NOT phrase-match the refusal's prose to pick a banner",
    !/\/self-exclusion\/i\.test|\/exclusion\/i\.test/.test(PASSWORD_DOOR),
    "matching English prose is the thing failure-reasons.ts exists to retire");
  ok("6.2 …it switches on the machine token instead", /detail\?\.standing/.test(PASSWORD_DOOR));
  ok("6.3 the gate actually EMITS that token, or 6.2 reads a field nobody sets",
    /standing: "serving"/.test(GATE) && /standing: "minimum_served"/.test(GATE) && /standing: "permanent"/.test(GATE));

  // ⛔ A SERVED EXCLUSION MUST NOT BE TOLD TO WAIT FOR A DATE THAT HAS PASSED. Ali ruled the
  // period is a MINIMUM, so "until the period ends" is false for two of the three states.
  ok("6.4 the screen has a distinct panel for a period that has ENDED",
    /excluded === "minimum_served"/.test(PAGE) && /selfExclusionEndedBody/.test(PAGE));
  ok("6.5 …and one for a PERMANENT exclusion, which never reopens",
    /excluded === "permanent"/.test(PAGE) && /selfExclusionPermanentBody/.test(PAGE));
  // ⚠️ A bookmarked or stale link must keep working rather than silently showing nothing.
  ok("6.6 the old `?excluded=1` link still renders the serving panel",
    /excluded === "1"/.test(PAGE));
  // ⭐ …BUT THE COMMON PATH MUST NOT BE THE COMPATIBILITY SHIM. A player who self-excludes lands
  // on this screen immediately, so that redirect is the route real people take; leaving it on
  // `=1` meant the named branch was reached only from a FAILED sign-in — the rarest route
  // exercising the code and the commonest one on the fallback. It carries the end date too,
  // because this is the moment the player is told how long the break they chose actually lasts.
  {
    const RG_ACTION = decomment(readFileSync("src/app/profile/responsible-gambling/actions.ts", "utf8").replace(/\r\n/g, "\n"));
    ok("6.9 self-excluding sends the player to the NAMED serving panel, with the end date",
      /excluded=serving/.test(RG_ACTION) && /until=/.test(RG_ACTION),
      "the real path must not ride the stale-link alias");
  }

  // 🔴 AND THE COOL-OFF BANNER WAS TELLING THE OPPOSITE LIE. `?cooled=1` is set right after a
  // player takes a break (profile/responsible-gambling/actions.ts) and its copy said "you will
  // not be able to sign in until it ends" — but a cool-off has NEVER blocked sign-in. It stops
  // BETTING. The banner was turning a working protection into a lockout the player then feared.
  const EN = readFileSync("src/lib/i18n-dict.ts", "utf8");
  // ⛔ AND THE OTP DOOR MUST REACH THE SAME PANELS. E-240 moved the exclusion check off the OTP
  // REQUEST onto the VERIFY — correct, because the code is the proof of ownership — but the
  // verify hop mapped every unrecognised code to `error=failed`, so the player who had just
  // proved the number was theirs was told only "that didn't work". Fixing one screen must not
  // darken the one beside it.
  ok("6.8 a SUSPENDED refusal on the OTP door routes to the exclusion panels, not `error=failed`",
    /result\.code === "SUSPENDED"/.test(OTP_DOOR) && /excluded=\$\{standing\}/.test(OTP_DOOR),
    "an account-status refusal is not an OTP error");
  ok("6.7 ⛔ the cooling-off banner no longer claims the player cannot sign in",
    !/coolingOffBody: "Your cooling-off period is now active\. You will not be able to sign in/.test(EN),
    "a cool-off stops betting, not access — saying otherwise scares a player off their own money");
  // ⛔ 6.7 PINNED ONE KEY BY NAME AND THE CLAIM SIMPLY MOVED. It matched the literal
  // `coolingOffBody: "Your cooling-off period is now active. You will not be able to sign in…"`,
  // so it stayed GREEN while `breakDescription` — the body of the CONFIRMATION DIALOG, the last
  // thing a player reads before deciding — said "You cannot bet, deposit, or sign in until it
  // ends" in all three locales. A guard whose population is one string is only ever as current as
  // the string it was written against.
  // ⭐ So the population is now every RG copy line, and the test is the CLAIM rather than the key.
  // ⚠️ Scoped to sign-in verbs deliberately: "cannot bet" and "cannot deposit" are TRUE of a
  // cool-off and must keep being said.
  {
    // ⛔ SCOPED TO COOL-OFF / BREAK KEYS ONLY. `selfExclusionBody` and friends DO say a player
    // cannot sign in, and that is TRUE: `SELF_EXCLUDED` is refused at the sign-in gate
    // (auth-service.ts). `COOLED_OFF` deliberately is not. Flagging both would make this guard
    // demand that a correct statutory string be made false.
    const breakKeys = EN.split(/\n/).filter((l) => /^\s{6}(break|coolingOff)[A-Za-z]*:/.test(l));
    // ⚠️ TEMPERED, because a plain prohibition pattern cannot read a negation and flagged the FIX
    // as the defect: "you cannot bet or deposit … but you can still sign in" contains both
    // "cannot" and "sign in". The `(?!still|bado|仍)` tempering is what separates a prohibition
    // from a permission — the same trap that caught my own reworded chatbot prompt earlier today.
    const BLOCKS_SIGNIN = /(?:cannot|can't|will not be able to|unable to|hutaweza|huwezi|无法)(?:(?!still|bado|仍)[^"])*?(?:sign in|log in|kuingia|登录)/i;
    const liars = breakKeys.filter((l) => BLOCKS_SIGNIN.test(l));
    ok("6.7b ⛔ NO break / cooling-off copy claims it blocks sign-in, in any locale",
      liars.length === 0,
      liars.map((l) => l.trim().slice(0, 90)).join(" | "));
    // ⭐ CONTROL — the population must be non-empty, or this passes by scanning nothing, and the
    // pattern must still CATCH the pre-fix sentence. Both, or 6.7b proves only that it ran.
    ok("6.7c ⚠️ CONTROL — break/cool-off copy was actually found", breakKeys.length >= 6, `found ${breakKeys.length}`);
    ok("6.7d ⚠️ CONTROL — the pattern still catches the pre-fix sentence",
      BLOCKS_SIGNIN.test('breakDescription: "A short, one-way pause. You cannot bet, deposit, or sign in until it ends.",'));
  }
}

// ── §5 · A BREAK IS ONE-WAY UNTIL EXPIRY — INCLUDING AGAINST THE PLAYER ──────
//
// 🔴 `coolOff()` wrote `coolingOffUntil` UNCONDITIONALLY — never `max(existing, new)`. Its own
// docblock says *"shorter, also one-way until expiry"*, and the policy says the same in all three
// locales. It was not true: **a one-week break was cancelled by starting a one-hour one.**
//
// ⛔ AND THE REACHABILITY IS THE WHOLE POINT, WHICH IS WHY THIS IS COOLING-OFF AND NOT
// SELF-EXCLUSION. `SELF_EXCLUDED` is refused at the sign-in gate, so an excluded player cannot
// reach the form that would shorten their exclusion — it is protected by an accident of routing.
// `COOLED_OFF` is DELIBERATELY ABSENT from that gate (auth-service.ts:133-136, and it must stay
// absent — a cool-off stops betting, not access to your own money), so the form stays reachable
// for the whole break. The one a player can reach is the one that could be undone.
//
// ⭐ A person on day two of a week-long break, feeling the pull, could open the same form that
// helped them and — by choosing the SMALLEST option on it — be betting again within the hour,
// with the product reporting success. That is the failure mode the feature exists to prevent.
{
  const { coolOff, selfExclude } = await import("../src/lib/server/responsible-gambling.ts");
  const hour = 60 * 60 * 1000;

  await player("cool_shorten");
  await rg("cool_shorten", {});
  await coolOff("cool_shorten", "1w");
  const afterWeek = await db.responsible.get("cool_shorten");
  const weekUntil = afterWeek?.coolingOffUntil ?? "";
  const weekStarted = (afterWeek as { coolingOffStartedAt?: string } | null)?.coolingOffStartedAt ?? "";
  ok("§5 a 1w cool-off is stored", !!weekUntil && Date.parse(weekUntil) - Date.now() > 6 * 24 * hour, weekUntil);

  // ⚠️ PIN THE START STAMP TO A KNOWN PAST VALUE FIRST, OR THE NEXT ASSERTION IS VACUOUS.
  // Both `coolOff` calls run in the same millisecond here, so their `new Date().toISOString()`
  // stamps are byte-identical and "the stamp did not change" would pass whether the code
  // preserved it or overwrote it. Giving the first one a distinct value makes the difference
  // observable. (`weekStarted` above is read only to prove the field is written at all.)
  ok("§5 the start stamp is written at all", !!weekStarted, weekStarted);
  const PINNED_START = "2026-09-01T00:00:00.000Z";
  const cur = await db.responsible.get("cool_shorten");
  await db.responsible.upsert({ ...cur, coolingOffStartedAt: PINNED_START } as never);

  await coolOff("cool_shorten", "1h");
  const afterHour = await db.responsible.get("cool_shorten");
  ok("§5 ⛔ a SHORTER break cannot overwrite a longer one — the week survives",
    afterHour?.coolingOffUntil === weekUntil,
    `week=${weekUntil} now=${afterHour?.coolingOffUntil}`);
  // ⚠️ The start stamp was overwritten too, which destroys the record of when the break BEGAN —
  // the sibling comment in `selfExclude` says that stamp exists precisely because the register
  // has to state when it started, and without it the row falls back to the registration date.
  ok("§5 ⛔ …and the ORIGINAL start stamp is not destroyed",
    (afterHour as { coolingOffStartedAt?: string } | null)?.coolingOffStartedAt === PINNED_START,
    `was=${PINNED_START} now=${(afterHour as { coolingOffStartedAt?: string } | null)?.coolingOffStartedAt}`);

  // ⭐ CONTROL — extending must still work, or the fix is just "cooling-off is broken the other
  // way". A player choosing a LONGER break is the case the feature is for.
  await player("cool_extend");
  await rg("cool_extend", {});
  await coolOff("cool_extend", "1h");
  const short = (await db.responsible.get("cool_extend"))?.coolingOffUntil ?? "";
  await coolOff("cool_extend", "1w");
  const long = (await db.responsible.get("cool_extend"))?.coolingOffUntil ?? "";
  ok("§5 ⚠️ CONTROL — a LONGER break still extends", Date.parse(long) > Date.parse(short), `${short} → ${long}`);

  // Self-exclusion is unreachable today, but the writer must enforce what its docblock promises
  // rather than relying on the sign-in gate staying as it is.
  await player("excl_shorten");
  await rg("excl_shorten", {});
  await selfExclude("excl_shorten", "1m");
  const monthUntil = (await db.responsible.get("excl_shorten"))?.selfExclusionUntil ?? "";
  await selfExclude("excl_shorten", "24h");
  ok("§5 ⛔ a shorter SELF-EXCLUSION cannot overwrite a longer one either",
    (await db.responsible.get("excl_shorten"))?.selfExclusionUntil === monthUntil,
    `month=${monthUntil} now=${(await db.responsible.get("excl_shorten"))?.selfExclusionUntil}`);
}

// ────────────────────────────────────────────────────────────────────────────
// §7 — a harm detector may not DESCRIBE an outcome it cannot OBSERVE  (Unit 10.8)
// ────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 `CHASING_LOSSES` told compliance officers it counted deposits "within 30 min of a
 * LOSING bet". Its filter is `BET_PLACED && CONFIRMED` — every bet, won or lost — and its
 * local was even named `lostBets`. Nothing in it has ever known whether a bet lost.
 *
 * ⛔ AND IT CANNOT, AT THAT ANCHOR, EVEN IN PRINCIPLE: the window opens when the bet is
 * PLACED, and the outcome is not decided until the market SETTLES, hours or days later.
 * ⭐ The false NEGATIVE is the dangerous half — a player who really chases, depositing
 * right after a bet settles against them, is never caught, because settlement is nowhere
 * near placement.
 *
 * ⭐ THE RULE IS THE CLASS, NOT THE INSTANCE. Fixing one sentence leaves the next
 * detector free to make the same overreach, and there is no suite over this file at all
 * — `grep -rln CHASING_LOSSES scripts/` returned nothing before this section existed. So:
 * a detector that never reads an outcome-bearing signal may not use outcome vocabulary in
 * the string an officer reads.
 *
 * ⚠️ The MARKER ID is exempt by rule, not by oversight. Officers have acted on flags by the
 * name `CHASING_LOSSES`, and renaming an id to fix a sentence would break that record. The id
 * may lie about the past; the sentence may not lie to the reader today. (Corrected 2026-09-25:
 * this said the id is "persisted on existing flags and on the Board-facing RG report" — nothing
 * persists a harm flag; every flag is recomputed per call. §8 builds on that fact.)
 */
{
  const rgSrc = readFileSync("src/lib/server/responsible-gambling.ts", "utf8");
  const start = rgSrc.indexOf("const DETECTORS");
  const body = start === -1 ? "" : rgSrc.slice(start);
  ok("7.1 ⚠️ CONTROL — the DETECTORS array was located", start !== -1);

  // Population DISCOVERED: every `flag(ctx, "MARKER", severity, detail)` call in the file.
  const calls = [...body.matchAll(/flag\(\s*ctx,\s*"([A-Z_]+)",\s*"(\w+)",\s*([\s\S]*?)\);/g)];
  ok(`7.2 ⚠️ CONTROL — harm-marker emissions were found (${calls.length})`, calls.length >= 5, `found ${calls.length}`);

  // An outcome-bearing signal: anything that could tell a win from a loss.
  const OUTCOME_SIGNAL = /BET_PAYOUT|CASHOUT|settl|resolved|payout|won|profit/i;
  // Outcome vocabulary in the sentence an officer reads. ⚠️ "placing a bet" and
  // "placed" are NOT here: describing the anchor truthfully must stay legal, or the
  // guard would demand the fix be reverted.
  const OUTCOME_CLAIM = /\blos(e|t|ing|s)\b|\bwin(ning|s)?\b|\bwon\b/i;

  const overreach: string[] = [];
  for (const [, marker, , detail] of calls) {
    // The detector that emits this marker = the arrow function containing the call.
    const at = body.indexOf(`"${marker}"`);
    const from = body.lastIndexOf("(ctx) => {", at);
    const scope = from === -1 ? body : body.slice(from, at + 400);
    if (OUTCOME_CLAIM.test(detail) && !OUTCOME_SIGNAL.test(scope)) {
      overreach.push(`${marker} claims an outcome its filter cannot observe — ${detail.replace(/\s+/g, " ").slice(0, 90)}`);
    }
  }
  ok("7.3 ★ no harm-marker detail claims an outcome the detector cannot observe",
    overreach.length === 0, overreach.join(" | "));

  // ⭐ CONTROL — the pattern must still catch the exact sentence this row retired, or 7.3
  // proves only that it ran. Kept as a fixture rather than trusted.
  ok("7.4 ⚠️ CONTROL — the detector still fires on the retired sentence",
    OUTCOME_CLAIM.test("`${chases} deposits within 30 min of a losing bet over the last 7 days`"));
  // ⭐ CONTROL — and it must NOT fire on the replacement, or it would demand the fix back.
  ok("7.5 ⚠️ CONTROL — …and does NOT fire on the corrected sentence",
    !OUTCOME_CLAIM.test("`${chases} deposits within 30 min of placing a bet over the last 7 days`"));
}

// ────────────────────────────────────────────────────────────────────────────
// §8 — the MARKETING predicate is a STANDING, never a lockout  (marketing U10 · D9 · OD12 · OD13)
// ────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 `isLockedOut` answers "may they bet NOW?" and lifts itself when the period elapses. A marketing
 * gate built on it would text a 24-hour self-excluder 25 hours later and a player on a one-hour break
 * the minute it ended. `marketingRgStanding` (`src/lib/server/marketing/rg.ts`) is the answer, and the
 * rule it is held to here is one sentence: THE PERIOD ENDING IS NOT THE PERSON ASKING.
 *
 * ⭐ Each lift is proven to EXIST as well as to be refused without its conditions (8.6, 8.9) — a
 * predicate that refuses everybody passes every "is refused" line in this section and is wrong.
 * ⛔ And deciding must not WRITE (8.1b, 8.13): the predicate is asked once per recipient.
 */
console.log("\n§8 · the marketing predicate is a STANDING, never a lockout (marketing U10, D9)\n");
{
  const DAY = 864e5;
  const T = Date.now();
  const at = (days: number) => new Date(T + days * DAY).toISOString();
  let mseq = 0;
  /** A player stored the way registration stores one (`+255…`); returns the bare marketing key. */
  async function mplayer(id: string, status: string = "ACTIVE"): Promise<string> {
    const phone = `+2556${String(++mseq).padStart(8, "0")}`;
    await db.user.create({
      id, phoneE164: phone, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status, locale: "SW",
      displayName: null, dob: "1990-01-01", region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
      email: `${id}@t.tz`, emailVerifiedAt: now(),
      createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
    } as never);
    return phone.slice(1);
  }
  const said = async (identifier: string, status: "GIVEN" | "WITHDRAWN", days: number) =>
    Promise.resolve(db.messagingConsent.create({
      id: `mc_${identifier}_${status}_${days}`, channel: "SMS", identifier, category: "MARKETING",
      status, source: "PROFILE", wording: "Ninakubali kupokea matangazo kwa SMS.", locale: "SW",
      evidence: "rg-doors §8", recordedBy: null, createdAt: at(days),
    }));
  const deps = (restoredDays: number | null, activatedDays: number | null, harm: HarmFlag[] = []): MarketingRgDeps => ({
    harmFlags: async () => harm,
    exclusionRecord: async () => ({
      restoredAt: restoredDays === null ? null : at(restoredDays),
      lastActivatedAt: activatedDays === null ? null : at(activatedDays),
    }),
  });
  const NONE = deps(null, null);
  const verdict = (s: MarketingRgStanding) => (s.ok ? "ALLOWED" : s.skipReason);
  const ask = async (id: string, identifier: string, d: MarketingRgDeps = NONE, status = "ACTIVE") =>
    marketingRgStanding({ id, status: status as never }, identifier, T, d);
  const seen = new Set<string>();
  const expect = async (label: string, s: Promise<MarketingRgStanding>, want: string) => {
    const v = await s;
    seen.add(verdict(v));
    ok(label, verdict(v) === want, `got ${verdict(v)}${v.ok ? "" : ` — ${v.detail}`}`);
    return v;
  };

  // ── self-exclusion ─────────────────────────────────────────────────────────────────────
  const idNone = await mplayer("mk_none");
  await expect("8.1 a player with no RG row at all is ALLOWED", ask("mk_none", idNone), "ALLOWED");
  ok("8.1b 🔴 …and asking created NO ResponsibleGambling row — deciding must not write (150k recipients = 150k rows)",
    (await db.responsible.get("mk_none")) === null);

  const idServing = await mplayer("mk_serving");
  await rg("mk_serving", { selfExclusionUntil: at(30) });
  await expect("8.2 a player SERVING a self-exclusion is refused", ask("mk_serving", idServing), "rg_self_excluded");

  const idServed = await mplayer("mk_served");
  await rg("mk_served", { selfExclusionUntil: at(-365) });
  await expect("8.3 ⭐ a 24-hour exclusion that ELAPSED A YEAR AGO, never reopened by an officer, is still refused (D9 — minimum_served is not over)",
    ask("mk_served", idServed), "rg_self_excluded");

  const idStillSe = await mplayer("mk_still_se", "SELF_EXCLUDED");
  await rg("mk_still_se", { selfExclusionUntil: at(-10) });
  await expect("8.3b a SELF_EXCLUDED status refuses whatever the timer says — the status is standing evidence",
    ask("mk_still_se", idStillSe, deps(-5, -20), "SELF_EXCLUDED"), "rg_self_excluded");
  // ⭐ The case that ONLY the status can refuse: no RG row at all, so every timer reads "none". Without
  // it, deleting the status check would be caught by nothing — 8.3b is also refused by the six-month floor.
  const idSeNoRow = await mplayer("mk_se_norow", "SELF_EXCLUDED");
  await expect("8.3c a SELF_EXCLUDED account with NO RG row (diverged) is refused — the status alone decides",
    ask("mk_se_norow", idSeNoRow, NONE, "SELF_EXCLUDED"), "rg_self_excluded");

  const idNoFresh = await mplayer("mk_nofresh");
  await rg("mk_nofresh", { selfExclusionUntil: at(-399) });
  await said(idNoFresh, "GIVEN", -500);
  await expect("8.4 reopened by an officer, but the only consent PREDATES the exclusion — refused (OD12: a fresh consent after restoration)",
    ask("mk_nofresh", idNoFresh, deps(-300, -400)), "rg_self_excluded");

  const idInside = await mplayer("mk_inside");
  await rg("mk_inside", { selfExclusionUntil: at(-29) });
  await said(idInside, "GIVEN", -10);
  await expect("8.5 ⭐ reopened and re-consented, but INSIDE six months of the exclusion starting — refused (GN 478T reg 48(3))",
    ask("mk_inside", idInside, deps(-20, -30)), "rg_self_excluded");

  const idLifted = await mplayer("mk_lifted");
  await rg("mk_lifted", { selfExclusionUntil: at(-399) });
  await said(idLifted, "GIVEN", -100);
  await expect("8.6 ⭐ CONTROL — reopened, re-consented AFTER the restore, more than six months on: ALLOWED (the lift must exist)",
    ask("mk_lifted", idLifted, deps(-300, -400)), "ALLOWED");

  const idOldYes = await mplayer("mk_oldyes");
  await rg("mk_oldyes", { selfExclusionUntil: at(-399) });
  await said(idOldYes, "GIVEN", -200);
  await expect("8.6b ⛔ a consent given BEFORE the restore (an old opt-out link tapped while still excluded) does not count",
    ask("mk_oldyes", idOldYes, deps(-100, -400)), "rg_self_excluded");

  const idReexcl = await mplayer("mk_reexcl");
  await rg("mk_reexcl", { selfExclusionUntil: at(-50) });
  await said(idReexcl, "GIVEN", -10);
  await expect("8.6c a restore OLDER than the latest exclusion does not reopen it — status reads open with no restore after it = divergence, refused",
    ask("mk_reexcl", idReexcl, deps(-300, -60)), "rg_self_excluded");

  const idNoStart = await mplayer("mk_nostart");
  await rg("mk_nostart", { selfExclusionUntil: at(-100) });
  await said(idNoStart, "GIVEN", -10);
  await expect("8.6d with no activation on record the six months count from the END date — the safe direction, refused at day 100",
    ask("mk_nostart", idNoStart, deps(-50, null)), "rg_self_excluded");

  // ── cooling-off ────────────────────────────────────────────────────────────────────────
  const idBreak = await mplayer("mk_break", "COOLED_OFF");
  await rg("mk_break", { coolingOffUntil: at(2) });
  await expect("8.7 a player ON a break is refused, with its own reason", ask("mk_break", idBreak, NONE, "COOLED_OFF"), "rg_cooling_off");

  const idBreakOver = await mplayer("mk_breakover", "COOLED_OFF");
  await rg("mk_breakover", { coolingOffUntil: at(-1) });
  await said(idBreakOver, "GIVEN", -30);
  await expect("8.8 ⭐ a break that ENDED yesterday does not reopen marketing by itself — the consent on file predates it (D9's shape, for breaks)",
    ask("mk_breakover", idBreakOver, NONE, "COOLED_OFF"), "rg_cooling_off");

  const idBack = await mplayer("mk_back", "COOLED_OFF");
  await rg("mk_back", { coolingOffUntil: at(-10) });
  await said(idBack, "GIVEN", -5);
  const back = await expect("8.9 ⭐ CONTROL — a break that ended, then a consent given AFTER it: ALLOWED (the lift must exist)",
    ask("mk_back", idBack, NONE, "COOLED_OFF"), "ALLOWED");
  ok("8.9a …and it says so, so the gate may admit the COOLED_OFF status nothing ever clears", back.ok && back.coolingOffEnded === true);

  const idYesNo = await mplayer("mk_yesno", "COOLED_OFF");
  await rg("mk_yesno", { coolingOffUntil: at(-10) });
  await said(idYesNo, "GIVEN", -5);
  await said(idYesNo, "WITHDRAWN", -2);
  await expect("8.9b a yes after the break followed by a NO is a no — the LATEST ledger row decides",
    ask("mk_yesno", idYesNo, NONE, "COOLED_OFF"), "rg_cooling_off");

  const idDiverged = await mplayer("mk_diverged", "COOLED_OFF");
  await expect("8.10 a COOLED_OFF status with no break on record is a divergence, and a divergence refuses",
    ask("mk_diverged", idDiverged, NONE, "COOLED_OFF"), "rg_cooling_off");

  // ── harm markers ───────────────────────────────────────────────────────────────────────
  const idHarm = await mplayer("mk_harm");
  const flagged: HarmFlag[] = [{ userId: "mk_harm", marker: "RAPID_DEPOSIT_ESCALATION", detectedAt: now(), severity: "warn", detail: "fixture" }];
  await expect("8.11 a player carrying a harm marker is refused, with its own reason",
    ask("mk_harm", idHarm, deps(null, null, flagged)), "rg_harm_marker");

  const idHarmReal = await mplayer("mk_harm_real");
  await db.wallet.create({ id: "wal_mk_harm_real", userId: "mk_harm_real", balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
  for (let i = 0; i < 3; i++) {
    await db.txn.create({
      id: `tx_mk_harm_${i}`, walletId: "wal_mk_harm_real", userId: "mk_harm_real", type: "DEPOSIT", status: "CONFIRMED",
      amount: 10_000, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null,
      createdAt: new Date(T - (i + 1) * 60_000).toISOString(), updatedAt: now(),
    } as never);
  }
  await expect("8.11b the DEFAULT dependency is the real detector — three deposits inside an hour refuse through it",
    marketingRgStanding({ id: "mk_harm_real", status: "ACTIVE" }, idHarmReal, T), "rg_harm_marker");

  const idHarmDown = await mplayer("mk_harm_down");
  const broken: MarketingRgDeps = { ...NONE, harmFlags: async () => { throw new Error("db down"); } };
  await expect("8.12 ⛔ a harm check that cannot be READ refuses — never the `.catch(() => [])` of the compliance panel",
    ask("mk_harm_down", idHarmDown, broken), "rg_harm_marker");

  // ── deciding must not write ────────────────────────────────────────────────────────────
  const matured = { dailyDepositLimit: 1_000, pendingIncreaseTo: 5_000, pendingIncreaseEffectiveAt: at(-1) };
  const idMatured = await mplayer("mk_matured");
  await rg("mk_matured", { ...matured });
  await ask("mk_matured", idMatured);
  const after = await db.responsible.get("mk_matured");
  ok("8.13 🔴 a row whose pending limit change has come due is NOT rewritten by the marketing predicate (the write U7's fix missed)",
    after?.pendingIncreaseTo === 5_000 && after?.dailyDepositLimit === 1_000,
    `pending=${after?.pendingIncreaseTo} daily=${after?.dailyDepositLimit}`);
  await player("mk_matured_twin");
  await rg("mk_matured_twin", { ...matured });
  await selfExclusionStanding("mk_matured_twin");
  const twin = await db.responsible.get("mk_matured_twin");
  ok("8.13b ⚠️ CONTROL — the same row IS rewritten by `selfExclusionStanding`, so 8.13's fixture really exercises the write path",
    twin?.pendingIncreaseTo === null && twin?.dailyDepositLimit === 5_000,
    `pending=${twin?.pendingIncreaseTo} daily=${twin?.dailyDepositLimit}`);

  // ── the default restore reader, end to end through the audit chain ────────────────────
  const { audit } = await import("../src/lib/server/audit.ts");
  const idChain = await mplayer("mk_chain");
  await rg("mk_chain", { selfExclusionUntil: at(-1) });
  await audit({ category: "COMPLIANCE", action: "rg.self_exclusion.activated", actorId: "mk_chain", targetType: "User", targetId: "mk_chain", payload: { period: "24h" } });
  // ⚠️ MEASURED: written back to back, the two rows carried the SAME millisecond, and a restore that is
  // not strictly after the exclusion refuses — the safe reading of a tie, and one reality never produces
  // (a restore follows an activation by at least the 24-hour minimum). So the fixture spaces them.
  await new Promise((r) => setTimeout(r, 5));
  await audit({ category: "COMPLIANCE", action: "rg.self_exclusion.reopened", actorId: "officer", targetType: "User", targetId: "mk_chain", payload: { reason: "fixture" } });
  // ⚠️ Stamped from the moment AFTER the audit rows exist, not from T: the chain stamps its own
  // `createdAt` at write time, and a consent dated before the restore is exactly what 8.6b refuses.
  const tRestored = Date.now();
  await Promise.resolve(db.messagingConsent.create({
    id: "mc_chain", channel: "SMS", identifier: idChain, category: "MARKETING", status: "GIVEN", source: "PROFILE",
    wording: "Ninakubali kupokea matangazo kwa SMS.", locale: "SW", evidence: "rg-doors §8", recordedBy: null,
    createdAt: new Date(tRestored + 1_000).toISOString(),
  }));
  const chainNow = await marketingRgStanding({ id: "mk_chain", status: "ACTIVE" }, idChain, tRestored + 2_000);
  const chainRec = await MARKETING_RG_DEPS.exclusionRecord("mk_chain");
  ok("8.14 the default reader FINDS the restore in the audit chain — the refusal is the six-month floor, not \"no restore on record\"",
    !chainNow.ok && /six-month/.test(chainNow.detail),
    `${chainNow.ok ? "ALLOWED" : chainNow.detail} · record ${JSON.stringify(chainRec)}`);
  const chainLater = await marketingRgStanding({ id: "mk_chain", status: "ACTIVE" }, idChain, tRestored + 200 * DAY);
  ok("8.14b …and 200 days on, the same record lifts it: ALLOWED", chainLater.ok, chainLater.ok ? "" : chainLater.detail);

  // ── the arithmetic and the property ────────────────────────────────────────────────────
  const mar1 = "2026-03-01T00:00:00.000Z";
  ok("8.15 the six-month floor is six CALENDAR months (1 Mar → 1 Sep) — 182 days alone would release on 30 Aug",
    sixMonthFloor(mar1) >= Date.parse("2026-09-01T00:00:00.000Z"));
  ok("8.15b …and never fewer than 182 days", sixMonthFloor(mar1) >= Date.parse(mar1) + 182 * DAY);
  ok(`8.16 ⭐ PROPERTY — four mutually exclusive outcomes in this section (${[...seen].sort().join(", ")})`,
    ["ALLOWED", "rg_self_excluded", "rg_cooling_off", "rg_harm_marker"].every((r) => seen.has(r)));

  // ── structural: the file cannot reach a predicate that lifts itself or writes ──────────
  const rgSrc = decomment(readFileSync("src/lib/server/marketing/rg.ts", "utf8"));
  ok("8.17 ⚠️ CONTROL — marketing/rg.ts was found and is not empty", rgSrc.length > 1_000, `${rgSrc.length} chars`);
  ok("8.17a ⛔ marketing/rg.ts never calls isLockedOut (it lifts itself — D9)", !/\bisLockedOut\s*\(/.test(rgSrc));
  ok("8.17b ⛔ …nor getRgSettings or selfExclusionStanding (they WRITE — create or effectivize)",
    !/\bgetRgSettings\s*\(/.test(rgSrc) && !/\bselfExclusionStanding\s*\(/.test(rgSrc));
  ok("8.17c ⛔ …nor audit() — a refusal is returned, and the loop writes the line when it acts on it", !/\baudit\s*\(/.test(rgSrc));
  ok("8.17d it reads the raw row (db.responsible.get) and the ONE standing definition (selfExclusionStandingOf)",
    /db\.responsible\.get\s*\(/.test(rgSrc) && /selfExclusionStandingOf\s*\(/.test(rgSrc));
  ok("8.17e detectHarmMarkers is asked with NO options — `sessionStartedAt` switches on the detector that writes",
    /detectHarmMarkers\(\s*\w+\s*\)/.test(rgSrc) && !/detectHarmMarkers\([^)]*,/.test(rgSrc));
  const gateSrc = decomment(readFileSync("src/lib/server/marketing/consent.ts", "utf8"));
  const iConsent = gateSrc.indexOf("user.marketingOptIn !== true");
  const iRg = gateSrc.search(/\bmarketingRgStanding\s*\(/);
  ok("8.18 ⭐ the gate CALLS marketingRgStanding — a missing call is the E-240 defect, invisible to every test of the predicate",
    iRg !== -1, "no call found");
  ok("8.18a …and asks it AFTER consent (§5.6 order — and the harm scan must not run on non-consenting players)",
    iConsent !== -1 && iRg !== -1 && iConsent < iRg, `consent@${iConsent} rg@${iRg}`);
  ok("8.18b ⛔ the gate calls neither isLockedOut nor selfExclusionStanding directly",
    !/\bisLockedOut\s*\(/.test(gateSrc) && !/\bselfExclusionStanding\s*\(/.test(gateSrc));
  void MARKETING_RG_DEPS;
}

// ────────────────────────────────────────────────────────────────────────────
// §9 — PUSH and WATCHLIST ALERTS respect the ruling too  (D10, marketing S7)
// ────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 D10. `push-service` and `watchlist-service` gated on `isLockedOut` alone, which lifts the moment the
 * chosen period elapses — so a 24-hour self-excluder was pushed at, and sent "a market you follow closes
 * soon", from hour 25, while sign-in and betting still refused them. Ali's 2026-08-27 ruling (the period
 * is a MINIMUM; the account is not reinstated by itself) is enforced on those two doors the way the bet
 * path enforces it: the STATUS decides. Closed on Ali's delegation of 2026-09-26.
 * ⭐ A push in stub mode returns 0 whether it was suppressed or delivered, so "returned 0" proves nothing;
 * the discriminator is the `[push-stub]` delivery line, caught with a console spy. Each suppression is
 * paired with a DELIVERED control (restored; a cooled-off player whose break is over), or a door that
 * pushed nobody would pass.
 */
console.log("\n§9 · push and watchlist alerts: the STATUS decides, not the timer (D10)\n");
{
  const { sendPushToUser, savePushSubscription } = await import("../src/lib/server/push-service.ts");
  const { alertableWatcherIds } = await import("../src/lib/server/watchlist-service.ts");
  const { getAuditForTargetsDurable } = await import("../src/lib/server/audit.ts");
  const DAY = 864e5;
  const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const lines: string[] = [];
  const realLog = console.log;
  const delivered = async (userId: string): Promise<boolean> => {
    lines.length = 0;
    console.log = (...a: unknown[]) => { lines.push(a.map(String).join(" ")); };
    try { await sendPushToUser(userId, { title: "t", body: "b" }); } finally { console.log = realLog; }
    return lines.some((l) => l.startsWith(`[push-stub] To: ${userId} `));
  };
  const mk = async (id: string, status: string, patch?: Partial<StoredResponsibleGambling>) => {
    await player(id);
    await db.user.update(id, { status } as never);
    if (patch) await rg(id, patch);
    await savePushSubscription(id, { endpoint: `https://push.example/${id}`, p256dh: "k", auth: "a" });
  };

  await mk("d10_served", "SELF_EXCLUDED", { selfExclusionUntil: ago(365) });
  ok("9.1 ⭐ a self-excluder whose 24 h ELAPSED A YEAR AGO, never reopened, is NOT pushed at (D10)", !(await delivered("d10_served")),
    "a [push-stub] delivery line was printed");
  // `push-service` fires its audit without awaiting it (the push must never wait on the chain), so the
  // row lands a moment later — poll for it rather than sleep a guess.
  let rows: Awaited<ReturnType<typeof getAuditForTargetsDurable>>["entries"] = [];
  for (let i = 0; i < 40 && rows.length === 0; i++) {
    rows = (await getAuditForTargetsDurable({ targetType: "User", targetIds: ["d10_served"], actions: ["push.suppressed.rg_lockout"], sinceIso: ago(1) })).entries;
    if (rows.length === 0) await new Promise((r) => setTimeout(r, 50));
  }
  ok("9.1b …and the suppression is audited with the standing it rests on (minimum_served)",
    rows.some((r) => (r.payload as { standing?: string } | undefined)?.standing === "minimum_served"), JSON.stringify(rows.map((r) => r.payload)));

  await mk("d10_diverged", "SELF_EXCLUDED");
  ok("9.2 a SELF_EXCLUDED account with no timer at all (diverged) is not pushed at", !(await delivered("d10_diverged")));

  await mk("d10_restored", "ACTIVE", { selfExclusionUntil: ago(365) });
  ok("9.3 ⚠️ CONTROL — a player an officer REOPENED (ACTIVE, the same past end date) IS pushed at", await delivered("d10_restored"),
    "no [push-stub] line — the door pushes nobody");
  await mk("d10_cooled", "COOLED_OFF", { coolingOffUntil: ago(2) });
  ok("9.4 ⚠️ CONTROL — a cooled-off player whose break is OVER is pushed at: cooling-off keeps its timer (nothing clears COOLED_OFF)",
    await delivered("d10_cooled"));

  await db.watchlist.add("mkt_d10", "d10_served");
  await db.watchlist.add("mkt_d10", "d10_restored");
  const watchers = await alertableWatcherIds("mkt_d10");
  ok("9.5 ⭐ the watchlist alert set drops the self-excluder whose period elapsed — \"a market you follow closes soon\" is engagement",
    !watchers.includes("d10_served"), watchers.join(","));
  ok("9.6 ⚠️ CONTROL — …and keeps the reopened player", watchers.includes("d10_restored"), watchers.join(","));
}

console.log(`\nrg-doors: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
