/**
 * Up & Down — ADVERSARIAL. Try to make the new surfaces misbehave, server-side, where
 * a real attacker operates (a crafted POST, not the UI).
 *
 *   npx tsx scripts/updown-adversarial.test.mts   (npm run test:updown-adversarial)
 *
 * The UI hides a control; the SERVICE must refuse the action. Everything here goes
 * straight at the service, bypassing the client, because that is what a manipulator
 * does.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig, cleanGridAnchor,
} from "../src/lib/server/updown-config.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { buyPosition, getSimilarMarkets, isClosedByTime, isSelectionClosed } from "../src/lib/server/market-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_adv_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot", addedBy: "system" });

let seq = 0;
async function funded(id: string, bal: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25598${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: bal, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  return id;
}
const mallory = await funded("adv_mallory", 1_000_000);

const asset = await createAsset({ key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金", iconKey: "gold", priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro", decimals: 2, minMoveTicks: 1 }, OFFICER);
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, OFFICER);
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5 }, OFFICER);
if (!chainR.ok) throw new Error(chainR.error);
await setChainState(chainR.data.id, "RUNNING", OFFICER);
const chain = (await chainStore.get(chainR.data.id))!;

const anchorMs = cleanGridAnchor(Date.now() + 60_000);
const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();
async function confirmObs(iso: string, price: number) {
  const o = await observationStore.ensure(asset.id, iso);
  await observationStore.confirm(o.id, { price, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: iso, evidence: `q ${price}`, confidence: 95, model: "t", rawHash: `h${price}${iso}` });
  return o.id;
}

// ── 1 · Bet on a round whose window has CLOSED (boundary passed) ─────────────
{
  // Open a round that closes in the PAST relative to a manipulated clock: create it
  // normally, then resolve it, then try to bet.
  const openObs = await confirmObs(B(0), 2400);
  const r = await openRound(chain, B(0), openObs, 2400);
  if (!r.ok) throw new Error(r.error);
  // A legit bet works while open.
  const good = await buyPosition(mallory, { marketId: r.data.marketId, side: "YES", stake: 10_000 });
  ok("1.1 · a legit bet on an OPEN round works", good.ok, good.ok ? "" : good.error);

  // Now resolve/close the round, then try to bet on it.
  const closeObs = await confirmObs(B(1), 2410);
  await closeRound(r.data.id, closeObs, 2410);
  const late = await buyPosition(mallory, { marketId: r.data.marketId, side: "NO", stake: 10_000 });
  ok("1.2 · ⛔ a bet on a RESOLVED round is REFUSED", !late.ok, late.ok ? "accepted!" : (late as { error: string }).error.slice(0, 50));
}

// ── 2 · Stake manipulation on an Up & Down round ────────────────────────────
{
  const openObs = await confirmObs(B(2), 2410);
  const r = await openRound(chain, B(2), openObs, 2410);
  if (!r.ok) throw new Error(r.error);
  const mId = r.data.marketId;

  const neg = await buyPosition(mallory, { marketId: mId, side: "YES", stake: -50_000 });
  ok("2.1 · ⛔ a NEGATIVE stake is refused (no wallet inflation)", !neg.ok);

  const zero = await buyPosition(mallory, { marketId: mId, side: "YES", stake: 0 });
  ok("2.2 · ⛔ a ZERO stake is refused", !zero.ok);

  const huge = await buyPosition(mallory, { marketId: mId, side: "YES", stake: 999_999_999 });
  ok("2.3 · ⛔ a stake above the max is refused", !huge.ok, huge.ok ? "accepted!" : (huge as { error: string }).error.slice(0, 40));

  const nan = await buyPosition(mallory, { marketId: mId, side: "YES", stake: Number.NaN });
  ok("2.4 · ⛔ a NaN stake is refused (never a NaN debit)", !nan.ok);

  const overBalance = await buyPosition(mallory, { marketId: mId, side: "YES", stake: 5_000_000 });
  ok("2.5 · ⛔ a stake above the wallet balance is refused", !overBalance.ok);
}

// ── 3 · Double-submit with the SAME idempotency key pays once ───────────────
{
  const openObs = await confirmObs(B(3), 2410);
  const r = await openRound(chain, B(3), openObs, 2410);
  if (!r.ok) throw new Error(r.error);
  const mId = r.data.marketId;
  const before = (await db.wallet.findByUserId(mallory))?.balance ?? 0;
  const key = "adv-idem-key-1";
  const [a, b, c] = await Promise.all([
    buyPosition(mallory, { marketId: mId, side: "YES", stake: 15_000, idempotencyKey: key }),
    buyPosition(mallory, { marketId: mId, side: "YES", stake: 15_000, idempotencyKey: key }),
    buyPosition(mallory, { marketId: mId, side: "YES", stake: 15_000, idempotencyKey: key }),
  ]);
  const after = (await db.wallet.findByUserId(mallory))?.balance ?? 0;
  const okCount = [a, b, c].filter((x) => x.ok).length;
  ok("3.1 · triple double-submit (same key) does not error out", okCount >= 1);
  ok("3.2 · ⛔ and DEBITS EXACTLY ONCE — 15,000, not 45,000", before - after === 15_000, `debited ${before - after}`);
}

// ── 4 · Similar markets never recommends a non-bettable row ─────────────────
{
  // Resolve one of the earlier rounds; it must NOT appear in a similar rail.
  const all = await marketStore.listBoard({ productLine: "ALL" });
  const anyUpdown = all.find((m) => m.productLine === "UPDOWN");
  if (anyUpdown) {
    const sim = await getSimilarMarkets(anyUpdown, 10);
    const bad = sim.filter((m) => isClosedByTime(m) || isSelectionClosed(m) || m.status !== "LIVE" || m.id === anyUpdown.id);
    ok("4.1 · ⛔ similar rail contains ONLY live, open, other markets", bad.length === 0,
       bad.length ? `${bad.length} non-bettable leaked` : "");
    ok("4.2 · similar rail never includes the anchor itself", !sim.some((m) => m.id === anyUpdown.id));
    // Same product line only.
    ok("4.3 · similar rail stays within the anchor's product line",
       sim.every((m) => (m.productLine ?? "MARKET") === (anyUpdown.productLine ?? "MARKET")));
  } else {
    ok("4.1 · (no updown market to test similar rail)", true);
  }
}

// ── 5 · A stopped chain cannot silently keep taking bets on a new round ─────
{
  // Stopping a chain must not open further rounds; the existing open round settles
  // normally but no NEW bettable market appears.
  await setChainState(chain.id, "STOPPED", OFFICER);
  const roundsBefore = (await roundStore.list({ chainId: chain.id })).length;
  // Advancing a stopped chain is a no-op.
  const { advanceChain } = await import("../src/lib/server/updown-service.ts");
  const adv = await advanceChain(chain.id);
  const roundsAfter = (await roundStore.list({ chainId: chain.id })).length;
  ok("5.1 · ⛔ a STOPPED chain opens no new round", roundsAfter === roundsBefore && adv.observation === "skipped",
     `${roundsBefore}→${roundsAfter}, obs=${adv.observation}`);
}

console.log(`\nupdown-adversarial: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\n✗ ADVERSARIAL FAILURE — a manipulation the SERVICE should have refused got through. Fix before shipping.\n");
  process.exit(1);
}
console.log("updown-adversarial: OK — closed rounds refuse bets, stake manipulation refused, double-submit pays once, similar rail is clean, stopped chains stay stopped");
