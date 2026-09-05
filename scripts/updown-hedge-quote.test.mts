/**
 * UD-20 · A HEDGED HOLDER IS QUOTED **BOTH** OUTCOMES — Ali's decision, 2026-08-14.
 *
 *   npx tsx scripts/updown-hedge-quote.test.mts     (npm run test:updown-hedge-quote)
 *
 * 🔴 THE HISTORY, BECAUSE IT DECIDES THE SHAPE OF THIS SUITE.
 *
 *   ① `myExactPayout` priced `myUpStake + myDownStake` as if ALL of it sat on the UP side, so
 *      a hedger's locked card read "You win X if UP" with an X computed partly from their DOWN
 *      money — a confident WRONG figure on a money surface (A-5).
 *   ② The fix suppressed the line for a hedged holder. Correct: one number cannot state a
 *      two-sided position, and a half-truth about money is worse than silence.
 *   ③ The state was then documented as UNREACHABLE, because a guard forbade holding both
 *      sides. `docs/RULES.md` §2.4 removed that guard on 2026-08-14, so a hedged holder became
 *      ORDINARY — and ordinary players were seeing nothing at all where a figure belongs.
 *   ④ Ali, 2026-08-14: **quote both outcomes.** ⛔ Not by resurrecting the single number.
 *
 * ⭐ SO THIS SUITE PINS BOTH DIRECTIONS AT ONCE, and that is the whole point:
 *      · the PAIR is present and each figure is priced from ITS OWN SIDE's stake; and
 *      · `myExactPayout` is STILL NULL for a hedge — the one-number field must never learn to
 *        answer for a two-sided position, or defect ① comes back through the same door.
 *
 * ⛔ AND THE NUMBERS ARE COMPARED AGAINST `projectedPayout`, THE MONEY PATH'S OWN FUNCTION —
 * never against a second arithmetic written here. A suite that recomputes the fee is a suite
 * that agrees with itself.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { db } from "../src/lib/server/store.ts";
import { buyPosition, projectedPayout, listPositionsForMarket } from "../src/lib/server/market-service.ts";
import { getBoard, getRoundDetail } from "../src/lib/server/updown-board.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
import { chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";
import { dict as DICT } from "../src/lib/i18n-dict.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
// ⛔ A crash must be COUNTED, or the RED harness reads an exploding product as an absent test.
function crashIsAFailure(kind: string, e: unknown): never {
  fail++;
  console.log(`FAIL ${kind} — the suite threw before finishing: ${e instanceof Error ? e.message : String(e)}`);
  console.log(`\nFAILURES — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
process.on("uncaughtException", (e) => crashIsAFailure("uncaught exception", e));
process.on("unhandledRejection", (e) => crashIsAFailure("unhandled rejection", e));

__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); } catch { /* present */ }

let seq = 0;
async function funded(id: string, bal: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25595${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: bal, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  return id;
}

const hedger = await funded("hq_hedger", 1_000_000);   // holds BOTH sides
const oneSided = await funded("hq_one", 1_000_000);    // holds UP only
const opponent = await funded("hq_opp", 1_000_000);    // makes the other pool real

const asset = await createAsset({
  key: "HQBTC", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, "off");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5 }, "off");
if (!chainR.ok) throw new Error(chainR.error);
await setChainState(chainR.data.id, "RUNNING", "off");
const chain = (await chainStore.get(chainR.data.id))!;

const nowMs = Date.now();
const openIso = new Date(nowMs - 2 * 60_000).toISOString();
const o = await observationStore.ensure(asset.data.id, openIso);
await observationStore.confirm(o.id, { price: 2400, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: openIso, evidence: "q", confidence: 95, model: "t", rawHash: "h1" });
const r = await openRound(chain, openIso, o.id, 2400);
if (!r.ok) throw new Error(r.error);
const marketId = r.data.marketId;

// ── The position: DELIBERATELY LOPSIDED AND NON-DIVIDING ─────────────────────
// The hedger's two legs are UNEQUAL (7,000 up · 3,000 down) so a figure computed from
// `up + down` cannot coincidentally equal a figure computed from one side.
for (const [uid, side, stake] of [
  [hedger, "YES", 7_000], [hedger, "NO", 3_000],
  [oneSided, "YES", 5_000],
  [opponent, "NO", 11_000],
] as Array<[string, "YES" | "NO", number]>) {
  const res = await buyPosition(uid, { marketId, side, stake, idempotencyKey: `hq-${uid}-${side}-${stake}` });
  if (!res.ok) throw new Error(`fixture bet failed: ${uid} ${side} ${stake} — ${(res as { error: string }).error}`);
}

const board0 = await getBoard({ assetKey: "HQBTC", durationMinutes: 5, userId: hedger });
const openRow = board0.rounds.find((x) => x.marketId === marketId);
ok("0.1 · fixture · the round is on the board and OPEN", openRow?.state === "open", String(openRow?.state));
ok("0.2 · fixture · the hedger really holds BOTH sides",
   (openRow?.myUpStake ?? 0) === 7_000 && (openRow?.myDownStake ?? 0) === 3_000,
   `${openRow?.myUpStake} / ${openRow?.myDownStake}`);

// ⛔ WHILE THE ROUND IS OPEN THERE IS NO FIGURE, and that is deliberate: the pool can still
// move, so any number would be an estimate dressed as exact.
ok("0.3 · an OPEN round quotes no exact figure at all",
   openRow?.myPayoutIfUp == null && openRow?.myPayoutIfDown == null && openRow?.myExactPayout == null);

// ── Lock the round: selections closed, pool frozen ───────────────────────────
// The board derives `locked` from the market's own `selectionClosedAt`, the same field
// `buyPosition` enforces — never a second rule.
await marketStore.stamp(marketId, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });

// ⛔ THE ROUND PAGE, NOT THE BOARD — and that is a fact about the product, not a convenience.
// `getBoard` keeps ONE CURRENT round per chain and its `started` filter is
//     state === "open" || state === "confirming"
// so a LOCKED round is deliberately not on the board at all; the next round takes its place.
// The locked presentation UD-20 is about lives on the round page, which is exactly where
// `round-action-panel.tsx` renders it. Pointing this suite at `getBoard` returned an EMPTY
// round list and looked like the feature was broken.
const detail = await getRoundDetail(r.data.id, hedger);
const row = detail!.round;
ok("0.4 · fixture · the round is LOCKED", row.state === "locked", row.state);

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE HEDGED HOLDER — both outcomes, each priced from its OWN side
// ═══════════════════════════════════════════════════════════════════════════
{
  const m = (await marketStore.get(marketId))!;
  // ⛔ THE OWN STAKE COMES OUT OF ITS OWN POOL FIRST, and these three lines used to not do
  // that. `projectedPayout` answers "what if I bet X MORE", so it ADDS the stake — handing
  // it an already-placed stake counts that money twice and understates the payout. It quoted
  // 9,685 on a production round that PAID 12,612. §5 is what caught it: these assertions
  // compared the board against the same misuse and were green throughout.
  const held = (side: "YES" | "NO", stake: number) => projectedPayout(
    side === "YES" ? { ...m, yesPool: m.yesPool - stake } : { ...m, noPool: m.noPool - stake },
    side, stake);
  const expUp = await held("YES", 7_000);
  const expDown = await held("NO", 3_000);
  // The half-truth this whole finding is about: the whole position priced as if on one side.
  const halfTruth = await projectedPayout({ ...m, yesPool: m.yesPool - 7_000 }, "YES", 10_000);

  ok("1.1 · ★ a hedged holder is quoted a figure for EACH outcome",
     row.myPayoutIfUp != null && row.myPayoutIfDown != null,
     `${row.myPayoutIfUp} / ${row.myPayoutIfDown}`);
  ok("1.2 · …the UP figure is priced from the UP stake alone",
     row.myPayoutIfUp === expUp, `${row.myPayoutIfUp} vs ${expUp}`);
  ok("1.3 · …the DOWN figure is priced from the DOWN stake alone",
     row.myPayoutIfDown === expDown, `${row.myPayoutIfDown} vs ${expDown}`);
  // 🔴 THE ORIGINAL DEFECT, ASSERTED AGAINST DIRECTLY.
  ok("1.4 · 🔴 …and NEITHER is `up + down` priced as if it all sat on one side",
     row.myPayoutIfUp !== halfTruth && row.myPayoutIfDown !== halfTruth,
     `half-truth would be ${halfTruth}`);
  // ⛔ THE ANTI-REGRESSION. The one-number field must stay null for a hedge forever.
  ok("1.5 · ⛔ `myExactPayout` is STILL NULL for a hedge — one number cannot state two sides",
     row.myExactPayout === null, String(row.myExactPayout));
  // ⭐ And the two figures are genuinely different, or the pair says nothing a single number
  // could not have said. With 7,000 up against 3,000 down they must diverge.
  ok("1.6 · ⭐ the two outcomes really are different numbers",
     row.myPayoutIfUp !== row.myPayoutIfDown, `${row.myPayoutIfUp} / ${row.myPayoutIfDown}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE ONE-SIDED HOLDER — the same two rows, and the losing one is 0
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Ali's decision covers them too: "a one-sided holder is unchanged — their losing outcome
// is simply 0". Saying so is more honest than leaving it unsaid, and it means a surface can
// render the pair without first asking whether the viewer is hedged.
{
  const x = (await getRoundDetail(r.data.id, oneSided))!.round;
  const m = (await marketStore.get(marketId))!;
  // Own stake removed first — see §1.
  const expUp = await projectedPayout({ ...m, yesPool: m.yesPool - 5_000 }, "YES", 5_000);
  ok("2.1 · a one-sided holder gets the pair as well", x.myPayoutIfUp != null && x.myPayoutIfDown != null);
  ok("2.2 · …their winning outcome is their real payout", x.myPayoutIfUp === expUp, `${x.myPayoutIfUp} vs ${expUp}`);
  ok("2.3 · ★ …and their LOSING outcome is exactly 0, not null and not blank",
     x.myPayoutIfDown === 0, String(x.myPayoutIfDown));
  // The one-number field still answers for them — that is what it is for.
  ok("2.4 · …and `myExactPayout` still answers for a one-sided holder",
     x.myExactPayout === expUp, `${x.myExactPayout} vs ${expUp}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · NOBODY ELSE IS QUOTED ANYTHING — the pair is per-viewer
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ A payout figure is one player's money. Leaking it to a signed-out board, or showing a
// figure to somebody with no stake, is the same class of defect as leaking their stake.
{
  const a = (await getRoundDetail(r.data.id))!.round;
  ok("3.1 · a signed-out board quotes no payout at all",
     a.myPayoutIfUp === null && a.myPayoutIfDown === null && a.myExactPayout === null);
  const stranger = await funded("hq_stranger", 50_000);
  const s = (await getRoundDetail(r.data.id, stranger))!.round;
  ok("3.2 · a signed-in player with NO stake is quoted nothing either",
     s.myPayoutIfUp === null && s.myPayoutIfDown === null, `${s.myPayoutIfUp} / ${s.myPayoutIfDown}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · AND SOMETHING ACTUALLY PAINTS IT — a payload nobody renders is not a fix
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ EVERY SECTION ABOVE ASSERTS ABOUT A NUMBER IN A PAYLOAD. All of them stay green if the
// surface quietly drops the pair, which is the whole shape of "the data was right and the
// screen said nothing" — the state UD-20 was re-opened about in the first place.
// ⚠️ A source-shape assertion, so a red here means the markup was renamed or reshaped:
// RE-ANCHOR it, never delete it.
{
  const panel = readFileSync("src/components/updown/round-action-panel.tsx", "utf8");
  const card = readFileSync("src/components/updown/updown-card.tsx", "utf8");

  // ⚠️ THE WHOLE GATE, FROM ITS OPENING BRACE. A substring match on
  // `payoutIfUp != null && payoutIfDown != null` still matched after the RED harness prefixed
  // the condition with `false &&` — so the mutation that stops the surface painting anything
  // scored as a MISS. Anchoring on `{<condition> && (` is what makes the assertion about the
  // rendered branch rather than about a phrase that happens to appear in it.
  ok("4.1 · the round page renders BOTH rows, gated on BOTH figures being present",
     /\{payoutIfUp != null && payoutIfDown != null && \(/.test(panel) &&
     /udIfClosesUp/.test(panel) && /udIfClosesDown/.test(panel));
  ok("4.2 · the card renders BOTH rows too",
     /\{ifUp != null && ifDown != null && \(/.test(card) &&
     /udIfClosesUp/.test(card) && /udIfClosesDown/.test(card));
  // ⛔ AND NEITHER SURFACE PAINTS THE RETIRED SINGLE-NUMBER LINE. `udYouWin … udIfUp` is the
  // form that told a hedger "You win X if UP" with an X computed from their DOWN money.
  const retired = (s: string) => /\{t\.market\.udYouWin\}[\s\S]{0,120}?udIfUp/.test(s);
  ok("4.3 · ⛔ …and the retired single-number line is painted by NEITHER",
     !retired(panel) && !retired(card), `panel=${retired(panel)} card=${retired(card)}`);
  // The copy exists in all three languages — the same standard `test:failure-reasons` §2 holds.
  for (const loc of ["en", "sw", "zh"] as const) {
    const m = DICT[loc].market as unknown as Record<string, string>;
    ok(`4.4.${loc} · the two-outcome copy exists`,
       !!m.udIfClosesUp && !!m.udIfClosesDown && !!m.udYouGet && !!m.udBothSidesHeld,
       `${m.udIfClosesUp} / ${m.udIfClosesDown}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · ⭐ THE QUOTE IS WHAT SETTLEMENT ACTUALLY PAYS — driven, not asserted
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 THIS SECTION EXISTS BECAUSE EVERYTHING ABOVE PASSED WHILE THE FIGURE WAS WRONG.
// §1 and §2 compare the quote against `projectedPayout` — the same function the board calls —
// so they are self-consistent by construction and cannot see a MISUSE of it. And it was being
// misused: `projectedPayout` answers *"what if I bet X MORE"*, so it adds the stake to the
// pool, and handing it an already-placed stake counted that money twice.
//
// Measured on production, gold round #267 (YES 8,000 / NO 14,000, YES won), QA Fleet 11
// holding 5,000 of the winning side:
//     the locked card quoted   9,685
//     settlement PAID         12,612      ← 23% more than the player was told
//
// ⛔ SO THE ONLY HONEST CHECK IS AGAINST THE MONEY. Close the round, settle it, and compare
// the quote to `finalPayout` on the position. That is the one comparison the product cannot
// satisfy by agreeing with itself.
console.log("\n§5 · the quoted figure is what the player is actually paid");
{
  const before = (await getRoundDetail(r.data.id, hedger))!.round;
  const quotedIfUp = before.myPayoutIfUp;
  const oneSidedQuote = (await getRoundDetail(r.data.id, oneSided))!.round.myPayoutIfUp;
  ok("5.0 · fixture · both holders are quoted before settlement",
     quotedIfUp != null && oneSidedQuote != null, `${quotedIfUp} / ${oneSidedQuote}`);

  // Settle the round UP through the real engine, on the real close path.
  const closeIso = new Date(Date.parse(openIso) + 6 * 60_000).toISOString();
  const co = await observationStore.ensure(asset.data.id, closeIso);
  await observationStore.confirm(co.id, {
    price: 2600, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: closeIso,
    evidence: "close", confidence: 95, model: "t", rawHash: "h2",
  });
  const closed = await closeRound(r.data.id, co.id, 2600);
  ok("5.1 · fixture · the round closed UP", closed.ok && closed.data.outcome === "UP",
     closed.ok ? closed.data.outcome : (closed as { error: string }).error);

  const paid = async (uid: string) => {
    const ps = await listPositionsForMarket(marketId);
    return ps.filter((p) => p.userId === uid).reduce((n, p) => n + (p.finalPayout ?? 0), 0);
  };
  const hedgerPaid = await paid(hedger);
  const onePaid = await paid(oneSided);

  // ⭐ THE ASSERTION. ⚠️ A ONE-SHILLING TOLERANCE, and only one: settlement allocates across
  // ALL winners by largest remainder, while the quote prices one position on its own, so the
  // dust can land a shilling either way. The defect this catches was 2,927 shillings.
  ok("5.2 · ★ the hedged holder's UP quote is what they were PAID",
     Math.abs(hedgerPaid - (quotedIfUp ?? -1)) <= 1,
     `quoted ${quotedIfUp}, paid ${hedgerPaid}`);
  ok("5.3 · ★ …and the one-sided holder's quote is what THEY were paid",
     Math.abs(onePaid - (oneSidedQuote ?? -1)) <= 1,
     `quoted ${oneSidedQuote}, paid ${onePaid}`);
  // ⛔ And the hedger's DOWN leg paid nothing, which is what the other row was quoting against.
  // ⚠️ THE LOSING LEG SPECIFICALLY. The first spelling of this asserted the hedger's TOTAL
  // payout was under their total stake — which is simply not what a hedge does: they staked
  // 10,000 and were paid 14,105, because the winning leg more than covers the losing one.
  // A wrong assertion about a correct product is still a red, and it was mine.
  const legs = (await listPositionsForMarket(marketId)).filter((p) => p.userId === hedger);
  const downLeg = legs.find((p) => p.side === "NO");
  const upLeg = legs.find((p) => p.side === "YES");
  ok("5.4 · …the LOSING leg paid nothing, as the DOWN row implied it would",
     (downLeg?.finalPayout ?? -1) === 0, `down leg paid ${downLeg?.finalPayout}`);
  ok("5.5 · …and the winning leg alone carried the whole payout",
     (upLeg?.finalPayout ?? 0) === hedgerPaid, `up leg ${upLeg?.finalPayout} of ${hedgerPaid}`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
