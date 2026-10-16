/**
 * test:fast-deposit — THE DEPOSIT FAST LANE MEETS THE STALE SWEEP (2026-10-16).
 *
 * The lane re-queries in-flight deposits every 15 s and can only CONFIRM. Its window was 10 minutes while
 * `reconcileStalePayments` owns only deposits older than 30, so a deposit 10–30 minutes old was re-queried by nobody: a
 * player whose provider confirmed at minute 12 waited until the 30-minute sweep for the credit. The payout lane has
 * always been 30 minutes (`test:fast-payout`).
 *
 *   §1 the selection (`isFastDepositCandidate`) at its edges · §2 the defaults: the lane's window reaches the sweep's
 *   cutoff · §3 plants: each check fails on the defect it guards.
 *
 *   npm run test:fast-deposit
 */
import { readFileSync } from "node:fs";
import { isFastDepositCandidate } from "../src/lib/server/wallet-service.ts";

let failed = 0;
const ok = (m: string) => console.log(`  ok   ${m}`);
const bad = (m: string) => { console.log(`  FAIL ${m}`); failed++; };
const check = (cond: boolean, m: string) => (cond ? ok(m) : bad(m));

const OLDER = 8_000;
const WINDOW = 30 * 60_000;
const NOW = Date.parse("2026-10-16T12:00:00.000Z");
const dep = (msAgo: number, over: Partial<{ type: string; providerRef: string | null; createdAt: string }> = {}) =>
  ({ type: "DEPOSIT", providerRef: "dep_ref", createdAt: new Date(NOW - msAgo).toISOString(), ...over });

console.log("\n§1 · which deposits the fast lane re-queries");
check(isFastDepositCandidate(dep(20 * 60_000), NOW, OLDER, WINDOW), "1.1 · a deposit 20 minutes old IS re-queried — the gap that existed");
check(isFastDepositCandidate(dep(12 * 60_000), NOW, OLDER, WINDOW), "1.2 · a deposit 12 minutes old IS re-queried");
check(isFastDepositCandidate(dep(60_000), NOW, OLDER, WINDOW), "1.3 · a deposit 1 minute old IS re-queried");
check(!isFastDepositCandidate(dep(2_000), NOW, OLDER, WINDOW), "1.4 · a deposit 2 seconds old is SKIPPED (the dispatch may still be returning)");
check(!isFastDepositCandidate(dep(OLDER), NOW, OLDER, WINDOW) && isFastDepositCandidate(dep(OLDER + 1), NOW, OLDER, WINDOW),
  "1.5 · the young edge is exclusive: exactly 8 s skipped, 8 s + 1 ms re-queried");
check(isFastDepositCandidate(dep(WINDOW), NOW, OLDER, WINDOW) && !isFastDepositCandidate(dep(WINDOW + 1), NOW, OLDER, WINDOW),
  "1.6 · the old edge is inclusive, so the lane meets the sweep: exactly 30 min re-queried, 30 min + 1 ms left to the sweep");
check(!isFastDepositCandidate(dep(60_000, { type: "WITHDRAWAL" }), NOW, OLDER, WINDOW), "1.7 · a withdrawal is not this lane's");
check(!isFastDepositCandidate(dep(60_000, { providerRef: null }), NOW, OLDER, WINDOW), "1.8 · a deposit with no provider reference is not re-queried");
check(!isFastDepositCandidate(dep(60_000, { createdAt: "not a date" }), NOW, OLDER, WINDOW), "1.9 · an unreadable time is not re-queried");

console.log("\n§2 · the defaults — the lane's window reaches the sweep's cutoff");
const src = readFileSync("src/lib/server/wallet-service.ts", "utf8");
const laneWindow = (s: string) => {
  const m = s.match(/export async function creditConfirmedDeposits\(\s*olderThanMs = [\d_]+,\s*fastWindowMs = ([^,)]+),/);
  return m ? Function(`return (${m[1]});`)() as number : NaN;
};
const sweepCutoff = (s: string) => {
  const m = s.match(/export async function reconcileStalePayments\(olderThanMs = ([^)]+)\)/);
  return m ? Function(`return (${m[1]});`)() as number : NaN;
};
const usesSelector = (s: string) => /listByStatus\("PROCESSING"\)\)\.filter\(\(t\) => isFastDepositCandidate\(t, now, olderThanMs, fastWindowMs\)\)/.test(s);
check(Number.isFinite(laneWindow(src)) && laneWindow(src) >= sweepCutoff(src), `2.1 · the lane's default window (${laneWindow(src) / 60_000} min) reaches the sweep's cutoff (${sweepCutoff(src) / 60_000} min)`);
check(usesSelector(src), "2.2 · `creditConfirmedDeposits` selects through `isFastDepositCandidate` (one rule, tested here)");

console.log("\n§3 · plants — each check reports its defect");
check(!isFastDepositCandidate(dep(20 * 60_000), NOW, OLDER, 10 * 60_000), "3.1 PLANT · the old 10-minute window skips the 20-minute deposit (the defect 1.1 catches)");
const oldSrc = src.replace(/(export async function creditConfirmedDeposits\(\s*olderThanMs = [\d_]+,\s*fastWindowMs = )[^,)]+,/, "$110 * 60 * 1000,");
check(laneWindow(oldSrc) < sweepCutoff(oldSrc), "3.2 PLANT · a 10-minute default no longer reaches the 30-minute sweep (2.1 reports it)");
check(!usesSelector(src.replace("isFastDepositCandidate(t, now, olderThanMs, fastWindowMs)", "t.type === \"DEPOSIT\"")), "3.3 PLANT · an inline filter that bypasses the tested rule is reported");

console.log(failed === 0 ? "\nALL PASS — test:fast-deposit" : `\n${failed} FAILED — test:fast-deposit`);
process.exit(failed === 0 ? 0 : 1);
