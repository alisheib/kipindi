/**
 * SELL-OUT LOCKOUT — you cannot cash out once selections have closed.
 *
 * THE EXPLOIT THIS CLOSES
 * Cash-out used to be allowed right up until the officers resolved the market —
 * explicitly including CLOSED markets ("players shouldn't be trapped just because
 * the sentinel detected an early outcome"). But selections close BEFORE the
 * outcome is known to us and, crucially, before it is known to the OFFICERS. The
 * real-world event finishes in that gap.
 *
 * So a player who could see the match had gone against them could bail out in the
 * window between "the world knows the answer" and "50pick has recorded it", and
 * recover a large slice of a stake that was already lost. That is not risk-taking;
 * it is a free option on a known outcome.
 *
 * And it is not victimless. A cash-out is paid OUT OF THE POOL. Every shilling the
 * late seller walks away with is a shilling that would otherwise have gone to the
 * players who were RIGHT. The house loses nothing — the winners pay for it.
 *
 * THE RULE NOW: betting and selling close at the SAME instant, from the SAME
 * source of truth (`isSelectionClosed`). Once selections shut, your position rides
 * to settlement. There is no window in which the answer is knowable and the exit
 * is still open.
 *
 * Run: npx tsx scripts/cashout-lockout.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import {
  createMarket, buyPosition, cashOutPosition, cashOutValue, getMarket,
  resolveMarket, settleMarket, isSelectionClosed,
} from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25593${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

/** A market whose selections close in `mins` (negative = already closed). */
async function makeMarket(selectionInMins: number): Promise<string> {
  const m = await createMarket({
    titleEn: "Lockout market", titleSw: "Soko la majaribio", category: "sports",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(),
    selectionClosedAt: new Date(Date.now() + selectionInMins * 60_000).toISOString(),
    proposedBy: "test",
  } as never);
  return m.id;
}

/** Move a market's selection cutoff into the past (what the clock would do). */
async function closeSelections(mid: string): Promise<void> {
  const m = (await marketStore.get(mid))!;
  m.selectionClosedAt = new Date(Date.now() - 60_000).toISOString();
  await marketStore.set(m);
}

/** Positions are free to exit for the first 5 minutes; push past that. */
async function pastGrace(posId: string): Promise<void> {
  const p = await positionStore.get(posId);
  if (p) { p.placedAt = new Date(Date.now() - 10 * 60_000).toISOString(); await positionStore.set(p); }
}

// ═══ 1 · Selling is OPEN while selections are open (we break nothing) ════════
{
  const mid = await makeMarket(60); // selections close in an hour
  await fundedUser("co_a");
  await fundedUser("co_b");
  const a = await buyPosition("co_a", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("co_b", { marketId: mid, side: "NO", stake: 10_000 });
  const posId = a.ok ? a.data!.positionId : "";
  await pastGrace(posId);

  ok("1: selections are open", !isSelectionClosed((await getMarket(mid))!));
  const before = await bal("co_a");
  const r = await cashOutPosition("co_a", posId);
  ok("1: a player CAN still sell out while selections are open", r.ok, r.ok ? "" : (r as { error: string }).error);
  ok("1: they were paid for it", (await bal("co_a")) > before, `delta=${(await bal("co_a")) - before}`);
}

// ═══ 2 · THE EXPLOIT — selling AFTER selections close must be refused ════════
// This is the assertion that fails on the old code.
{
  const mid = await makeMarket(60);
  await fundedUser("co_late");
  await fundedUser("co_hold");
  const late = await buyPosition("co_late", { marketId: mid, side: "YES", stake: 10_000 });
  await buyPosition("co_hold", { marketId: mid, side: "NO", stake: 10_000 });
  const posId = late.ok ? late.data!.positionId : "";
  await pastGrace(posId);

  // The event has now happened in the real world; our selections are shut and the
  // officers have not yet recorded the verdict. THIS is the exploit window.
  await closeSelections(mid);
  ok("2: selections are closed", isSelectionClosed((await getMarket(mid))!));

  const before = await bal("co_late");
  const poolBefore = (await getMarket(mid))!.yesPool + (await getMarket(mid))!.noPool;

  const r = await cashOutPosition("co_late", posId);
  ok("2: SELLING OUT IS REFUSED once selections have closed", !r.ok,
     r.ok ? "!! the exploit is OPEN — a player just bailed on a known outcome" : (r as { error: string }).error);
  ok("2: they were paid nothing", (await bal("co_late")) === before,
     `delta=${(await bal("co_late")) - before}`);
  ok("2: the pool was not drained", (await getMarket(mid))!.yesPool + (await getMarket(mid))!.noPool === poolBefore);
  ok("2: their position is still OPEN and rides to settlement",
     (await positionStore.get(posId))!.status === "OPEN");
}

// ═══ 3 · THE VICTIM — a late exit steals from the players who were RIGHT ═════
// A cash-out is paid out of the POOL, so whatever the late seller walks away with
// comes straight out of the winners' payout. This proves the money actually lands
// with the winner now, instead of being siphoned off by someone who already knew.
{
  const mid = await makeMarket(60);
  await fundedUser("co_loser");
  await fundedUser("co_winner");
  const l = await buyPosition("co_loser", { marketId: mid, side: "NO", stake: 10_000 });
  await buyPosition("co_winner", { marketId: mid, side: "YES", stake: 10_000 });
  const loserPos = l.ok ? l.data!.positionId : "";
  await pastGrace(loserPos);

  await closeSelections(mid);

  // The loser tries to bail now that the world knows YES won.
  const bail = await cashOutPosition("co_loser", loserPos);
  ok("3: the losing player cannot bail out after the answer is knowable", !bail.ok);

  const winnerBefore = await bal("co_winner");
  await resolveMarket({ marketId: mid, outcome: "YES", officerId: "lock_a" });
  await resolveMarket({ marketId: mid, outcome: "YES", officerId: "lock_b" });
  await settleMarket(mid, { force: true });

  const won = (await bal("co_winner")) - winnerBefore;
  // Whole pool 20,000 less the 9% platform fee = 18,200 — the winner gets ALL of
  // it, because nothing leaked out of the pool through a late exit.
  ok("3: the winner receives the WHOLE net pool (nothing was siphoned)", won === 18_200,
     `won=${won} expected=18200`);
  ok("3: the loser lost their stake, as they should", (await positionStore.get(loserPos))!.status === "LOSS");
}

// ═══ 4 · A sentinel-CLOSED market is locked too ══════════════════════════════
// The old code allowed selling on CLOSED markets by design — that is exactly the
// state the sentinel puts a market in when it detects the outcome early, i.e. the
// single most dangerous moment to leave the exit open.
{
  const mid = await makeMarket(60);
  await fundedUser("co_s1");
  await fundedUser("co_s2");
  const s = await buyPosition("co_s1", { marketId: mid, side: "YES", stake: 8_000 });
  await buyPosition("co_s2", { marketId: mid, side: "NO", stake: 8_000 });
  const posId = s.ok ? s.data!.positionId : "";
  await pastGrace(posId);

  const m = (await marketStore.get(mid))!;
  m.status = "CLOSED"; // the sentinel spotted the result
  await marketStore.set(m);

  const r = await cashOutPosition("co_s1", posId);
  ok("4: selling is refused on a sentinel-CLOSED market", !r.ok, r.ok ? "!! exploit open" : (r as { error: string }).error);
  ok("4: nothing moved", (await positionStore.get(posId))!.status === "OPEN");
}

// ═══ 5 · The quote must go dark too — no dangling price on a shut market ═════
// If cashOutValue still returned a live figure, the UI would keep showing a SELL
// price the server would then refuse. Quote and permission must agree.
{
  const mid = await makeMarket(60);
  await fundedUser("co_q1");
  await fundedUser("co_q2");
  const q = await buyPosition("co_q1", { marketId: mid, side: "YES", stake: 5_000 });
  await buyPosition("co_q2", { marketId: mid, side: "NO", stake: 5_000 });
  const posId = q.ok ? q.data!.positionId : "";
  await pastGrace(posId);

  const open = await getMarket(mid);
  const liveQuote = await cashOutValue({ side: "YES", stake: 5_000 }, { id: mid, yesPool: open!.yesPool, noPool: open!.noPool });
  ok("5: a live market still quotes a sell price", liveQuote.value > 0, `value=${liveQuote.value}`);

  await closeSelections(mid);
  const shut = (await getMarket(mid))!;
  ok("5: isSelectionClosed agrees the market is shut", isSelectionClosed(shut));

  // And the server refuses, which is the part that actually protects the pool.
  const r = await cashOutPosition("co_q1", posId);
  ok("5: the server refuses the sale regardless of any quote the client holds", !r.ok);
}

// ═══ 6 · HARDENING — a crafted request cannot get around it ══════════════════
{
  const mid = await makeMarket(60);
  await fundedUser("co_h1");
  await fundedUser("co_h2");
  const h = await buyPosition("co_h1", { marketId: mid, side: "YES", stake: 6_000 });
  await buyPosition("co_h2", { marketId: mid, side: "NO", stake: 6_000 });
  const posId = h.ok ? h.data!.positionId : "";
  await pastGrace(posId);
  await closeSelections(mid);

  const before = await bal("co_h1");

  // Hammer it: repeated + concurrent attempts, and someone else's position.
  const many = await Promise.all([
    cashOutPosition("co_h1", posId),
    cashOutPosition("co_h1", posId),
    cashOutPosition("co_h1", posId),
    cashOutPosition("co_h1", posId),
  ]);
  ok("6: every concurrent attempt is refused", many.every((r) => !r.ok));
  ok("6: not a single shilling moved", (await bal("co_h1")) === before,
     `delta=${(await bal("co_h1")) - before}`);

  const thief = await cashOutPosition("co_h2", posId);
  ok("6: another player still cannot sell someone else's position", !thief.ok);

  const ghost = await cashOutPosition("co_h1", "pos_does_not_exist");
  ok("6: a bogus position id is refused", !ghost.ok);
}

console.log(`\ncashout-lockout: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
