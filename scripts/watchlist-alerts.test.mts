/**
 * F3 — watchlist + smart alerts (in-memory store).
 *
 * Locks the invariants that matter:
 *  - follow/unfollow persists and is idempotent
 *  - the closing-soon sweep fires ONCE per market (one-shot stamp), even when run
 *    repeatedly / concurrently — a follower is never spammed
 *  - it only fires INSIDE the 1h window (not for far-off or already-closed markets)
 *  - a SETTLED market alerts watchers but NOT bettors (who get their own receipt)
 *  - a self-excluded / cooling-off watcher is NEVER alerted (RG suppression)
 *
 * Run: npx tsx scripts/watchlist-alerts.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { notifyClosingSoonMarkets, createMarket, buyPosition, resolveMarket, settleMarket } from "../src/lib/server/market-service.ts";
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

  const r1 = await notifyClosingSoonMarkets();
  ok("sweep alerted exactly 1 market", r1.notified === 1, `notified=${r1.notified}`);
  ok("both watchers alerted", r1.watchers === 2, `watchers=${r1.watchers}`);
  ok("wl_a got a watchlist alert", (await watchNotes("wl_a")).length === 1);
  ok("wl_b got a watchlist alert", (await watchNotes("wl_b")).length === 1);

  // The far-off market must not have been touched.
  ok("far market NOT stamped", !(await marketStore.get(far))?.closingSoonNotifiedAt);

  // Re-running the sweep must NOT re-alert (one-shot stamp).
  const r2 = await notifyClosingSoonMarkets();
  ok("second sweep alerts nobody (idempotent)", r2.notified === 0 && r2.watchers === 0, `${JSON.stringify(r2)}`);
  ok("wl_a still has exactly 1 alert (no spam)", (await watchNotes("wl_a")).length === 1);

  // Concurrent sweeps must also not double-fire.
  const [c1, c2, c3] = await Promise.all([notifyClosingSoonMarkets(), notifyClosingSoonMarkets(), notifyClosingSoonMarkets()]);
  ok("concurrent sweeps alert nobody", c1.notified + c2.notified + c3.notified === 0);
  ok("still exactly 1 alert after concurrency", (await watchNotes("wl_a")).length === 1);
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
  const r = await notifyClosingSoonMarkets();
  ok("sweep ran for the RG market", r.notified === 1, `notified=${r.notified}`);
  ok("only the active watcher was alerted", r.watchers === 1, `watchers=${r.watchers}`);
  ok("self-excluded got NO new alert", (await watchNotes("wl_excluded")).length === before);
  ok("cooling-off got NO alert", (await watchNotes("wl_cooled")).length === 0);
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
