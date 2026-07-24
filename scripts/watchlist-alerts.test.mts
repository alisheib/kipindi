/**
 * F3 — watchlist + smart alerts (in-memory store).
 *
 * Locks the invariants that matter:
 *  - follow/unfollow persists and is idempotent
 *  - the closing-soon TRIGGER fires ONCE per market (one-shot stamp), even when run
 *    repeatedly / concurrently — a follower is never spammed
 *  - it only fires INSIDE the 1h window (not for far-off or already-closed markets)
 *  - a SETTLED market alerts watchers but NOT bettors (who get their own receipt)
 *  - a self-excluded / cooling-off watcher is NEVER alerted (RG suppression)
 *
 * Run: npx tsx scripts/watchlist-alerts.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
// The closing-soon transition is now driven by a PER-MARKET timer that createMarket
// arms automatically. A market born inside the 1h window has an already-past
// closing-soon deadline, so its ambient timer would fire (and consume the one-shot
// stamp) while this file is asserting on it. Disable the timers so THIS test drives
// the transition itself, deterministically — the timer/arming path is covered by
// scripts/scheduler.test.mts. (Read at call time by market-scheduler.schedulerEnabled.)
process.env.MARKET_SCHEDULER = "false";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { notifyClosingSoonForMarket, createMarket, buyPosition, resolveMarket, settleMarket } from "../src/lib/server/market-service.ts";
import { toggleWatch, isWatching, listWatchedMarketIds, alertableWatcherIds } from "../src/lib/server/watchlist-service.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { selfExclude, coolOff } from "../src/lib/server/responsible-gambling.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const iso = (ms: number) => new Date(ms).toISOString();
const now = Date.now();
let seq = 0;

async function mkUser(id: string, balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25594${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: iso(now), updatedAt: iso(now), lastLoginAt: null, closedAt: null,
  } as never);
  if (balance > 0) {
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(now), updatedAt: iso(now) } as StoredWallet);
  }
}

/** A LIVE market whose selections close in `minutes`. */
async function mkMarket(id: string, minutes: number): Promise<string> {
  const at = iso(now + minutes * 60_000);
  const m = await createMarket({
    titleEn: `Watch market ${id}`, titleSw: "Soko", titleZh: "市场",
    descriptionEn: "T", descriptionSw: "T", descriptionZh: "T",
    category: "FINANCE", resolutionAt: at,
    resolutionCriterion: "crit", sourceUrl: "https://example.com",
    createdById: "wl_officer1",
  } as never);
  return (m as { id: string }).id;
}

const watchNotes = async (userId: string) =>
  (await listForUser(userId, 50)).filter((n) => n.kind === "WATCHLIST");

await mkUser("wl_officer1", 0);
await mkUser("wl_officer2", 0);
await mkUser("wl_a");
await mkUser("wl_b");
await mkUser("wl_excluded");
await mkUser("wl_cooled");

// ── 1. Follow / unfollow ──────────────────────────────────────────────────
{
  const mkt = await mkMarket("m1", 24 * 60); // far off — outside the window
  ok("not watching initially", (await isWatching(mkt, "wl_a")) === false);
  ok("toggle → watching", (await toggleWatch(mkt, "wl_a")) === true);
  ok("isWatching true", (await isWatching(mkt, "wl_a")) === true);
  ok("appears in the user's list", (await listWatchedMarketIds("wl_a")).includes(mkt));
  ok("toggle again → unwatched", (await toggleWatch(mkt, "wl_a")) === false);
  ok("isWatching false", (await isWatching(mkt, "wl_a")) === false);
  ok("gone from the list", !(await listWatchedMarketIds("wl_a")).includes(mkt));
}

// ── 2. Closing-soon fires ONCE, only inside the window ────────────────────
{
  const soon = await mkMarket("m_soon", 30);       // inside 1h → should alert
  const far = await mkMarket("m_far", 5 * 60);     // 5h away → must NOT alert
  await toggleWatch(soon, "wl_a");
  await toggleWatch(soon, "wl_b");
  await toggleWatch(far, "wl_a");

  const r1 = await notifyClosingSoonForMarket(soon);
  ok("trigger alerted the closing-soon market", r1.notified === true, `notified=${r1.notified}`);
  ok("both watchers alerted", r1.watchers === 2, `watchers=${r1.watchers}`);
  ok("wl_a got a watchlist alert", (await watchNotes("wl_a")).length === 1);
  ok("wl_b got a watchlist alert", (await watchNotes("wl_b")).length === 1);

  // The far-off market must refuse the trigger outright (outside the 1h window).
  const rFar = await notifyClosingSoonForMarket(far);
  ok("far market refuses the trigger", rFar.notified === false && rFar.watchers === 0, JSON.stringify(rFar));
  ok("far market NOT stamped", !(await marketStore.get(far))?.closingSoonNotifiedAt);
  ok("far market's watcher got NO extra alert", (await watchNotes("wl_a")).length === 1);

  // Store-wide: exactly ONE market carries the stamp — the old sweep's
  // "notified === 1" assertion, now checked against the store itself so a stray
  // alert on any other market (m1 included) still fails the test.
  const stampedAll = (await marketStore.values()).filter((m) => m.closingSoonNotifiedAt);
  ok("exactly 1 market stamped closing-soon store-wide", stampedAll.length === 1 && stampedAll[0]?.id === soon, `stamped=${stampedAll.length}`);

  // Re-running the trigger must NOT re-alert (one-shot stamp).
  const r2 = await notifyClosingSoonForMarket(soon);
  ok("second trigger alerts nobody (idempotent)", r2.notified === false && r2.watchers === 0, `${JSON.stringify(r2)}`);
  ok("wl_a still has exactly 1 alert (no spam)", (await watchNotes("wl_a")).length === 1);

  // Concurrent triggers on an ALREADY-stamped market must also not double-fire.
  const [c1, c2, c3] = await Promise.all([notifyClosingSoonForMarket(soon), notifyClosingSoonForMarket(soon), notifyClosingSoonForMarket(soon)]);
  ok("concurrent triggers alert nobody", [c1, c2, c3].filter((r) => r.notified).length === 0 && c1.watchers + c2.watchers + c3.watchers === 0);
  ok("still exactly 1 alert after concurrency", (await watchNotes("wl_a")).length === 1);
}

// ── 2b. Three CONCURRENT triggers on a FRESH market alert EXACTLY ONCE ────
// The real race: the scheduler timer, the reconciler and a re-fire can all hit the
// same un-stamped market at once. Only one may win — a follower is never spammed.
{
  const race = await mkMarket("m_race", 25);
  await toggleWatch(race, "wl_a");
  await toggleWatch(race, "wl_b");
  const aBefore = (await watchNotes("wl_a")).length;
  const bBefore = (await watchNotes("wl_b")).length;

  const rs = await Promise.all([
    notifyClosingSoonForMarket(race),
    notifyClosingSoonForMarket(race),
    notifyClosingSoonForMarket(race),
  ]);
  ok("exactly ONE concurrent trigger won", rs.filter((r) => r.notified).length === 1, JSON.stringify(rs));
  ok("watchers alerted exactly once in total", rs.reduce((s, r) => s + r.watchers, 0) === 2, `sum=${rs.reduce((s, r) => s + r.watchers, 0)}`);
  ok("wl_a got exactly 1 new alert", (await watchNotes("wl_a")).length === aBefore + 1);
  ok("wl_b got exactly 1 new alert", (await watchNotes("wl_b")).length === bBefore + 1);
  ok("race market stamped once", !!(await marketStore.get(race))?.closingSoonNotifiedAt);
}

// ── 2c. A market already PAST its cutoff is never nudged ──────────────────
// "Closes within the hour" is a lie once selections have closed — that market
// belongs to the selection-closed transition, not this one.
{
  const late = await mkMarket("m_late", 20);
  await toggleWatch(late, "wl_b");
  const bBefore = (await watchNotes("wl_b")).length;
  await marketStore.stamp(late, { resolutionAt: iso(now - 5 * 60_000) }); // cutoff now in the past

  const rLate = await notifyClosingSoonForMarket(late);
  ok("past-cutoff market refuses the trigger", rLate.notified === false && rLate.watchers === 0, JSON.stringify(rLate));
  ok("past-cutoff market NOT stamped", !(await marketStore.get(late))?.closingSoonNotifiedAt);
  ok("its watcher got NO alert", (await watchNotes("wl_b")).length === bBefore);
}

// ── 3. RG suppression — excluded / cooled-off watchers are never alerted ──
{
  const mkt = await mkMarket("m_rg", 20);
  await toggleWatch(mkt, "wl_excluded");
  await toggleWatch(mkt, "wl_cooled");
  await toggleWatch(mkt, "wl_b");
  await selfExclude("wl_excluded", "1m");
  await coolOff("wl_cooled", "24h");

  const alertable = await alertableWatcherIds(mkt);
  ok("self-excluded watcher filtered out", !alertable.includes("wl_excluded"));
  ok("cooling-off watcher filtered out", !alertable.includes("wl_cooled"));
  ok("active watcher retained", alertable.includes("wl_b"));

  const before = (await watchNotes("wl_excluded")).length;
  const bBefore = (await watchNotes("wl_b")).length;
  const r = await notifyClosingSoonForMarket(mkt);
  ok("trigger ran for the RG market", r.notified === true, `notified=${r.notified}`);
  ok("only the active watcher was alerted", r.watchers === 1, `watchers=${r.watchers}`);
  ok("self-excluded got NO new alert", (await watchNotes("wl_excluded")).length === before);
  ok("cooling-off got NO alert", (await watchNotes("wl_cooled")).length === 0);
  ok("active watcher DID get the alert", (await watchNotes("wl_b")).length === bBefore + 1);
  // The star itself survives the break — taking a break must not destroy state.
  ok("excluded user's star is preserved", (await isWatching(mkt, "wl_excluded")) === true);
}

// ── 4. Settled → watchers alerted, bettors NOT (they get win/loss instead) ─
{
  const mkt = await mkMarket("m_settle", 60);
  // wl_a WATCHES but never bets; wl_b BETS (and also watches).
  await toggleWatch(mkt, "wl_a");
  await toggleWatch(mkt, "wl_b");
  await buyPosition("wl_b", { marketId: mkt, side: "YES", stake: 1000 });
  await buyPosition("wl_a2_dummy_skip", { marketId: mkt, side: "NO", stake: 1000 }).catch(() => {});
  await mkUser("wl_c");
  await buyPosition("wl_c", { marketId: mkt, side: "NO", stake: 1000 });

  const aBefore = (await watchNotes("wl_a")).length;
  const bBefore = (await watchNotes("wl_b")).length;

  await resolveMarket({ marketId: mkt, outcome: "YES", officerId: "wl_officer1", evidence: "src" });
  await resolveMarket({ marketId: mkt, outcome: "YES", officerId: "wl_officer2" });
  // Watchers are told a market SETTLED, so the alert fires at settlement, not at
  // the verdict — force it here rather than waiting out the objection window.
  await settleMarket(mkt, { force: true });

  ok("watcher who did NOT bet got a settled alert", (await watchNotes("wl_a")).length === aBefore + 1);
  ok("watcher who DID bet got NO duplicate watchlist alert", (await watchNotes("wl_b")).length === bBefore, "bettor gets win/loss instead");
}

console.log(`\nwatchlist-alerts: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
