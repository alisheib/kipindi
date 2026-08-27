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
import { selfExclusionStanding, checkSessionTimeLimit } from "../src/lib/server/responsible-gambling.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

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

console.log(`\nrg-doors: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
