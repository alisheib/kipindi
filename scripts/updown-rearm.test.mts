/**
 * Up & Down · THE CHAIN RE-ARM CONTRACT — a chain must never be able to stop itself.
 *
 *   npx tsx scripts/updown-rearm.test.mts     (npm run test:updown-rearm)
 *
 * 🔴 THE FINDING (production, 2026-08-14 — `docs/FINDING-GOLD-CHAINS-STALLED.md`). All three
 * XAU chains read `RUNNING` and had opened **no round for 19.9 hours / 3.8 days**. Measured
 * from the live database and from the player board independently. Gold was a dead asset on a
 * live product and could not restart itself, ever.
 *
 * THE MECHANISM, which is a deadlock by construction and not a race:
 *
 *   ① Gold's session closes (Saturday, or its measured 21:00–22:00 UTC settlement break).
 *      `advanceChain` fires on a boundary inside that closed session.
 *   ② The market-hours gate returns EARLY — above step 4's re-arm — so `nextBoundaryAt`
 *      is left pinned at that boundary.
 *   ③ Every later tick re-evaluates the gate at `boundaryIso`, the STALE PINNED instant,
 *      not at now. That instant is still inside the closed session. Forever.
 *
 * Only crypto is immune, because `sessionKindFor("crypto")` is `"always"` and the branch is
 * never reached — which is exactly what production showed: every crypto chain current, every
 * gold chain stopped, two of them since Monday.
 *
 * ⭐ THE INVARIANT THIS SUITE PINS:
 *
 *      A RUNNING chain's `nextBoundaryAt` always advances. Whatever the calendar, the price
 *      feed or the clock does, a tick either acts on the boundary or moves past it — and
 *      after one tick the boundary is never still in the distant past.
 *
 * ⛔ AND THE OPPOSITE ERROR, WHICH IS WORSE. A "fix" that re-armed unconditionally would
 * SKIP LIVE BOUNDARIES — the game would silently drop rounds during trading hours, and a
 * suite that only checked "the boundary moved" would be green on it. Every closed-session
 * case below is therefore paired with an OPEN-session case in the same section, asserting
 * that an open boundary is retried and never skipped. §1.4, §1.6 and §1.7 are those pairs;
 * they are not padding.
 *
 * ⛔ NOR MAY THE RE-ARM WRITE BACK WHAT IT READ. If the next boundary is also inside the
 * closed session, arming it and waiting is correct and costs one tick per boundary. Arming
 * the SAME instant reproduces the deadlock while looking busy — §1.3.
 *
 * HOW IT TESTS. The clock is INJECTED (`advanceChain(id, { now })`), never patched, so every
 * case below is decided by the instant the test chooses and not by the day the suite runs on.
 * The closed-session fixture is a SATURDAY, whose closure is hardcoded in `market-calendar`
 * and needs no playbook row; that keeps the suite honest on a machine with no measured
 * history. Rounds, when one is required, are opened through the real `advanceChain` on a real
 * future boundary, because `createMarket` refuses a past resolution date.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY; // the oracle must refuse locally, never dial out

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig,
  getUpDownConfig, abandonAfterSeconds, boundaryAfter,
} from "../src/lib/server/updown-config.ts";
import { roundSpanMinutes } from "../src/lib/updown-durations.ts";
import { advanceChain } from "../src/lib/server/updown-service.ts";
import { marketSessionAt, sessionKindFor } from "../src/lib/server/market-calendar.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

/**
 * ⛔ A SUITE THAT CRASHES MUST STILL SAY SO IN ITS OWN SUMMARY LINE.
 *
 * Found by the RED harness on 2026-08-14, and it is the sharpest lesson in this file. The
 * `gate-always-closed` mutation stops any round opening, §6 then dereferenced a round that was
 * not there, and the suite died BEFORE printing `FAILURES — n passed, m failed`. The harness
 * reads that line to decide whether the guard fired, so a mutation that made the product
 * explode was scored as **MISS — the guard did NOT catch this**: the loudest possible failure,
 * reported as an absent test. Exactly `docs/` shape ③, an assertion the fix invalidates, wearing
 * the opposite coat.
 *
 * A crash IS a red — it is the guard noticing — but only if it is counted. So any uncaught
 * throw or rejection lands here, is counted as a failure, and the summary is still emitted.
 */
function crashIsAFailure(kind: string, e: unknown): never {
  fail++;
  console.log(`FAIL ${kind} — the suite threw before finishing: ${e instanceof Error ? e.message : String(e)}`);
  console.log(`\nFAILURES — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
process.on("uncaughtException", (e) => crashIsAFailure("uncaught exception", e));
process.on("unhandledRejection", (e) => crashIsAFailure("unhandled rejection", e));

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot metals", addedBy: "system" });
await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" });

// ── Two chains: one on a market-hours asset, one on a 24/7 asset ─────────────
// ⛔ THE PAIR IS THE POINT. Gold stalled and Bitcoin did not, on the same code, at the same
// instant. A suite with only the macro chain could not tell "the gate is wrong" from "the
// scheduler is down", which is precisely the ambiguity the production finding had to rule out.
async function chainFor(key: string, symbol: string, category: "macro" | "crypto", durationMinutes: number) {
  const a = await createAsset({
    key, symbol, nameEn: key, nameSw: key, iconKey: category,
    priceSourceUrl: "https://www.kitco.com/price/precious-metals", category,
    decimals: 2, minMoveTicks: 2,
  }, OFFICER);
  if (!a.ok) throw new Error(`fixture asset ${key}: ${a.error}`);
  await setAssetEnabled(a.data.id, true, OFFICER);
  const c = await createChain({ assetId: a.data.id, durationMinutes }, OFFICER);
  if (!c.ok) throw new Error(`fixture chain ${key}: ${c.error}`);
  await setChainState(c.data.id, "RUNNING", OFFICER);
  const chain = (await chainStore.get(c.data.id))!;
  return { assetId: a.data.id, chainId: c.data.id, anchorMs: Date.parse(chain.gridAnchorAt), durationMinutes };
}

// XAU/USD at 15m — the exact pairing that stalled on production. The catalogue refuses gold
// below 15 minutes, so this is also the shortest gold chain that can legally exist.
const gold = await chainFor("XAUREARM", "XAU/USD", "macro", 15);
const coin = await chainFor("BTCREARM", "BTC/USD", "crypto", 15);

const CFG = await getUpDownConfig();
const ABANDON_MS = abandonAfterSeconds(CFG) * 1000;

/** The chain's lattice boundary strictly after `fromMs` — the same function the engine uses. */
const gridAfter = (c: { anchorMs: number; durationMinutes: number }, fromMs: number) =>
  boundaryAfter(c.anchorMs, c.durationMinutes, fromMs);

/** Pin a chain to a chosen boundary, exactly as a previous tick would have left it. */
async function pin(chainId: string, iso: string) { await chainStore.patch(chainId, { nextBoundaryAt: iso }); }
const boundaryOf = async (chainId: string) => (await chainStore.get(chainId))!.nextBoundaryAt;

// ── The instants, chosen so the calendar decides them and the clock cannot ───
// A Saturday: `market-calendar` shuts the FX/metals week all day, hardcoded, no playbook row
// needed. 2026-08-08 is a Saturday; 2026-08-05 is a Wednesday.
const SATURDAY_MS = Date.parse("2026-08-08T12:00:00.000Z");
const WEDNESDAY_MS = Date.parse("2026-08-05T12:00:00.000Z");

// ═══════════════════════════════════════════════════════════════════════════
// 0 · THE FIXTURE ITSELF — or every assertion below is vacuous
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ A calendar fixture that silently stopped being closed would make this whole suite pass
// by proving nothing, which is the failure mode §7 of the work order is a list of.
{
  ok("0.1 · the macro fixture follows the FX/metals week", sessionKindFor("macro") === "fx-metals");
  ok("0.2 · the crypto fixture trades always", sessionKindFor("crypto") === "always");
  ok("0.3 · ⭐ the Saturday instant really IS a closed session",
     marketSessionAt("macro", new Date(SATURDAY_MS).toISOString()).open === false,
     new Date(SATURDAY_MS).toISOString());
  ok("0.4 · ⭐ the Wednesday instant really IS an open session",
     marketSessionAt("macro", new Date(WEDNESDAY_MS).toISOString()).open === true,
     new Date(WEDNESDAY_MS).toISOString());
  ok("0.5 · …and the same Saturday is OPEN for crypto — the control that proves it is the calendar",
     marketSessionAt("crypto", new Date(SATURDAY_MS).toISOString()).open === true);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE DEADLOCK — a closed session must not pin the chain
// ═══════════════════════════════════════════════════════════════════════════
{
  // ① The exact production shape: pinned to a boundary inside a closed session, and ticked
  //    long afterwards. On production this state had persisted for 3.8 days.
  const pinned = new Date(gridAfter(gold, SATURDAY_MS - 60_000)).toISOString();
  const nowMs = SATURDAY_MS + 4 * 24 * 3600_000;   // the following Wednesday — market OPEN
  ok("1.0 · fixture · the pinned boundary is inside the closed Saturday session",
     marketSessionAt("macro", pinned).open === false, pinned);
  ok("1.0b · fixture · …and 'now' is four days later, in an OPEN session",
     marketSessionAt("macro", new Date(nowMs).toISOString()).open === true);

  await pin(gold.chainId, pinned);
  const r1 = await advanceChain(gold.chainId, { now: nowMs });
  const after1 = await boundaryOf(gold.chainId);

  ok("1.1 · 🔴 one tick moves the chain past the closed boundary",
     after1 !== pinned, `pinned ${pinned} → ${after1}`);
  // ⛔ NOT MERELY "IT MOVED". A re-arm derived from `boundaryIso` instead of `now` crawls one
  // span per tick, so from 3.8 days back it would need ~365 ticks to catch up — and every one
  // of those ticks fires instantly, because the boundary is still in the past. "Moved" is
  // green on that; "at or after now" is not.
  ok("1.2 · ⭐ …and lands AT OR AFTER now, not one span later",
     after1 != null && Date.parse(after1) >= nowMs,
     `${after1} vs now ${new Date(nowMs).toISOString()}`);
  ok("1.3 · ⛔ the re-arm never writes back the instant it read",
     after1 !== pinned);
  ok("1.4 · …and it still refuses to OPEN a round into the closed session",
     r1.opened === false && /market closed/i.test(r1.detail ?? ""), r1.detail?.slice(0, 60));

  // ② A second tick must keep it moving — the deadlock was that tick N+1 saw tick N's instant.
  const r2 = await advanceChain(gold.chainId, { now: nowMs + 1000 });
  const after2 = await boundaryOf(gold.chainId);
  ok("1.5 · a second tick is not pinned by the first",
     after2 != null && Date.parse(after2) >= nowMs, `${after1} → ${after2}`);
  void r2;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE OPPOSITE ERROR — an OPEN boundary must never be skipped
// ═══════════════════════════════════════════════════════════════════════════
// ⭐ THE POSITIVE CONTROL THAT MATTERS. A patch that re-armed unconditionally would walk the
// grid forward during trading hours, dropping rounds nobody could see were missing. Every
// assertion in §1 stays green under that patch; these do not.
{
  const openBoundary = new Date(gridAfter(gold, WEDNESDAY_MS - 60_000)).toISOString();
  ok("2.0 · fixture · the boundary is inside an OPEN session", marketSessionAt("macro", openBoundary).open === true, openBoundary);

  // Ticked one second after its own boundary: too young to abandon, no confirmed price yet.
  // The engine's contract for that case is "retry THIS boundary", i.e. leave it alone.
  await pin(gold.chainId, openBoundary);
  const r = await advanceChain(gold.chainId, { now: Date.parse(openBoundary) + 1000 });
  const after = await boundaryOf(gold.chainId);
  ok("2.1 · ⭐ an open boundary awaiting its price is RETRIED, never skipped",
     after === openBoundary, `${openBoundary} → ${after}`);
  ok("2.2 · …and the refusal names the price, not the calendar",
     r.opened === false && !/market closed/i.test(r.detail ?? "") && /not published yet/i.test(r.detail ?? ""),
     r.detail?.slice(0, 70));

  // ⛔ AND THE ABANDON DEADLINE IS UNTOUCHED. Past it, an open boundary that can never be
  // priced IS skipped — deliberately, and by a different rule. A fix to the calendar branch
  // that changed this would be moving money-relevant behaviour it was never asked to touch.
  await pin(gold.chainId, openBoundary);
  const late = await advanceChain(gold.chainId, { now: Date.parse(openBoundary) + ABANDON_MS + 1000 });
  const afterLate = await boundaryOf(gold.chainId);
  ok("2.3 · …but past the abandon deadline an unpriceable OPEN boundary is still given up",
     afterLate !== openBoundary && /abandoned/i.test(late.detail ?? ""), late.detail?.slice(0, 70));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · CRYPTO IS UNAFFECTED, IN BOTH DIRECTIONS
// ═══════════════════════════════════════════════════════════════════════════
// A 24/7 asset never reaches the calendar branch, so nothing here may change for it —
// neither a new skip nor a new stall. This is the control that says the fix is confined
// to the gate it names.
{
  const sat = new Date(gridAfter(coin, SATURDAY_MS - 60_000)).toISOString();
  await pin(coin.chainId, sat);
  const r = await advanceChain(coin.chainId, { now: Date.parse(sat) + 1000 });
  const after = await boundaryOf(coin.chainId);
  ok("3.1 · a crypto chain on a Saturday is not closed, and is not skipped",
     after === sat && !/market closed/i.test(r.detail ?? ""), `${after} · ${r.detail?.slice(0, 50)}`);

  await pin(coin.chainId, sat);
  const late = await advanceChain(coin.chainId, { now: Date.parse(sat) + ABANDON_MS + 1000 });
  ok("3.2 · …and it abandons an unpriceable boundary by the deadline, exactly as before",
     /abandoned/i.test(late.detail ?? ""), late.detail?.slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE OPEN PATH STILL OPENS — end to end, through the real engine
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ Sections 1–3 all assert about a NUMBER IN A COLUMN. None of them would notice a change
// that stopped the product working, which is how "the boundary moved" becomes a green suite
// over a dead board. This one takes a real future boundary, gives it a confirmed price
// through the observation ledger, and requires a ROUND to exist afterwards.
{
  const realNow = Date.now();
  const b = new Date(gridAfter(coin, realNow + 60_000)).toISOString();   // a genuinely future boundary
  const obs = await observationStore.ensure(coin.assetId, b);
  const won = await observationStore.confirm(obs.id, {
    price: 65_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: b,
    evidence: null, confidence: 1, model: null, rawHash: null,
  });
  ok("4.0 · fixture · the boundary has a confirmed price", won === true);

  await pin(coin.chainId, b);
  const before = await roundStore.latestForChain(coin.chainId);
  const r = await advanceChain(coin.chainId, { now: Date.parse(b) });
  const after = await roundStore.latestForChain(coin.chainId);
  ok("4.1 · ⭐ a priced, open boundary OPENS A ROUND", r.opened === true, r.detail ?? "");
  ok("4.2 · …a round row that did not exist before",
     after != null && after.id !== before?.id && after.opensAt === b, after?.opensAt);
  ok("4.3 · …and the chain re-arms from the BOUNDARY, one span on — not from the clock",
     (await boundaryOf(coin.chainId)) ===
       new Date(Date.parse(b) + roundSpanMinutes(coin.durationMinutes) * 60_000).toISOString(),
     await boundaryOf(coin.chainId));
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · A FUTURE BOUNDARY IS NEVER DRAGGED BACKWARDS
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ The obvious spelling of the fix — `boundaryAfter(anchor, dur, Date.now())` — is wrong
// when the pinned boundary is still in the FUTURE and its session is shut, which is the
// ordinary state of every gold chain all weekend. It would rewind the chain to a boundary
// BEFORE the one it was holding, and a rewound chain can re-open a boundary it has already
// passed. The re-arm must be taken from `max(boundaryIso, now)`.
{
  const future = new Date(gridAfter(gold, SATURDAY_MS)).toISOString();     // shut, and ahead of `now`
  const nowMs = SATURDAY_MS - 3 * 3600_000;                                // three hours earlier
  ok("5.0 · fixture · the boundary is ahead of now, and its session is shut",
     Date.parse(future) > nowMs && marketSessionAt("macro", future).open === false);

  await pin(gold.chainId, future);
  await advanceChain(gold.chainId, { now: nowMs });
  const after = await boundaryOf(gold.chainId);
  ok("5.1 · ⛔ the re-arm never moves a chain BACKWARDS",
     after != null && Date.parse(after) > Date.parse(future), `${future} → ${after}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · THE MONEY QUESTION — does moving the boundary on STRAND A ROUND?
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ THIS IS THE ONE THE OTHER FIVE SECTIONS CANNOT SEE. `advanceChain` closes a round only
// when `chain.currentRoundId` still points at it AND its `boundaryAt` equals the instant being
// ticked. So a fix that moves the boundary FORWARD past an unresolved round is, on the face of
// it, doing exactly what E-24 did — leaving a stake with no path out. 1,398 rounds and real
// player money once sat behind precisely that reasoning.
//
// It is safe, and it is safe for a reason that has to be checked rather than assumed:
//   ① step 2 runs ABOVE the calendar gate, so the round ending at the pinned boundary still
//      gets its close attempt on the very tick that re-arms past it; and
//   ② whatever step 2 could not close is reachable by `roundStore.unresolvedBefore`, the
//      healer's read, which is deliberately NOT filtered by chain state or by the grid.
// The abandon branch has skipped boundaries this same way since E-83 — this asserts the
// property both branches depend on, instead of inheriting it by resemblance.
{
  const realNow = Date.now();
  const b = new Date(gridAfter(coin, realNow + 60_000)).toISOString();
  const obs = await observationStore.ensure(coin.assetId, b);
  await observationStore.confirm(obs.id, {
    price: 65_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: b,
    evidence: null, confidence: 1, model: null, rawHash: null,
  });
  await pin(coin.chainId, b);
  await advanceChain(coin.chainId, { now: Date.parse(b) });
  const live = await roundStore.latestForChain(coin.chainId);
  const haveRound = live != null && live.resolvedAt == null;
  ok("6.0 · fixture · there is an unresolved round on the chain", haveRound, live?.id);

  // Now force the calendar branch to skip past that round's own closing boundary, exactly as
  // a shut market does — by pinning the GOLD chain, which shares nothing but the code path.
  const goldPinned = new Date(gridAfter(gold, SATURDAY_MS - 60_000)).toISOString();
  await pin(gold.chainId, goldPinned);
  await advanceChain(gold.chainId, { now: SATURDAY_MS + 4 * 24 * 3600_000 });

  // The healer's read is the safety net, and it must see the round whatever the grid did.
  // ⚠️ Guarded, not asserted with `!`. A mutation that stops rounds opening at all must make
  // 6.1 FAIL and say why — dereferencing a missing round instead kills the process before the
  // summary line, and the RED harness scores that as the guard having missed. See the crash
  // handler at the top of this file.
  const strandable = haveRound
    ? await roundStore.unresolvedBefore(new Date(Date.parse(live!.boundaryAt) + 1000).toISOString(), 50)
    : [];
  ok("6.1 · ⭐ an unresolved round past its boundary is reachable by the healer's read",
     haveRound && strandable.some((r) => r.id === live!.id),
     haveRound ? `${strandable.length} unresolved rows` : "no round was opened — see 6.0");
  ok("6.2 · …and that read is not filtered by the chain's grid or state — E-24's own lesson",
     haveRound && strandable.every((r) => r.resolvedAt == null));
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · A BOUNDARY THAT OUTLIVED ITS OWN ROUND — THE THIRD WAY TO PIN A CHAIN
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 THE SECOND PRODUCTION OUTAGE OF THIS EXACT INVARIANT (`docs/FAILURE-INVENTORY.md` §7.4,
// filed 2026-08-15 as `50c3a282`, mechanism reproduced and closed 2026-08-19). BTC/USD 3m
// (`udc_5820850ef13f34e5`) and ETH/USD 3m (`udc_f8d666a0d781b8d6`) logged
//
//     [updown] fire udc_… failed: Error: Cannot create a market with a past or invalid resolution date.
//
// on every tick and produced nothing. They were eventually STOPPED BY HAND, which silences
// `fireChain` — it returns unless the chain is RUNNING — and left this code untouched. ⛔ The
// logs going quiet was the remedy being applied, not the defect being fixed.
//
// ⭐ WHY THIS SUITE IS THE RIGHT HOME, AND WHY IT WAS GREEN THROUGHOUT. The invariant at the
// top of this file already claims the property that broke: *"whatever the calendar, the price
// feed or the clock does, a tick either acts on the boundary or moves past it"*. §1-§3 test
// the CALENDAR pinning a chain and §2.3 tests an UNPRICEABLE boundary being given up. Nothing
// tested the third way in: a boundary that is perfectly priceable and simply too OLD to host
// a round any more. 27 assertions, a stated universal, and one branch of three.
//
// THE MECHANISM. `openRound` derives the close as `boundary + roundSpanMinutes`, and
// `createMarket` refuses a resolution at or before now BY THROWING rather than returning a
// refusal. The throw escapes `advanceChain` entirely — so it never reaches step 4, the only
// line that moves `nextBoundaryAt` — and `fireChain`'s `finally` re-arms on the same instant.
// A 30-second loop with no exit, and `console.error` its only trace.
//
// ⛔ WHY A WIDENED `ageMs > abandonMs` IS NOT THE FIX, which is the whole reason §7.2 exists.
// The abandon branch is gated on the reading NOT being confirmed, and a boundary hours old
// HAS a dated bar — so it is never entered. Reaching it unconditionally still would not be
// enough: its deadline is `abandonAfterSeconds` (390s on the defaults) and that is LONGER
// than the span of a 3-minute round (240s) or a 5-minute one (360s). Both stalled chains were
// 3-minute chains. The question "can this boundary still become a round?" is answered by the
// round's own SPAN, and by nothing else.
{
  // ⛔ CRYPTO, DELIBERATELY. A 24/7 asset can never reach the calendar branch, so a chain that
  // still stalls here cannot be blamed on market hours — the ambiguity the gold finding had to
  // rule out, in the opposite direction.
  const CFG7 = await getUpDownConfig();
  const ABANDON_S = abandonAfterSeconds(CFG7);

  /**
   * Pin a chain to a boundary exactly `ageSeconds` before the REAL clock, with a CONFIRMED
   * reading, and tick it at that same real instant.
   *
   * ⛔ THE CLOCK MUST BE THE REAL ONE, AND THIS COST A FALSE REPRODUCTION TO LEARN.
   * `advanceChain` takes an injected `now`, but `createMarket` reads `Date.now()` directly.
   * A fixture dated in the past therefore has a past resolution date whatever the injected
   * clock says, so EVERY case throws — including the healthy control — and the probe proves
   * only that the fixture is stale. Injected and real must agree, which is production's own
   * condition: the scheduler passes no clock at all.
   */
  let staleSeq = 0;
  async function stale(durationMinutes: number, ageSeconds: number, confirmed: boolean) {
    // A fresh asset per call: one chain per asset per length is a real rule, and each case
    // below wants its own chain rather than a boundary inherited from the previous one.
    const c = await chainFor(`OLD${++staleSeq}`, "BTC/USD", "crypto", durationMinutes);
    const nowMs = Date.now();
    const boundaryIso = new Date(nowMs - ageSeconds * 1000).toISOString();
    // The anchor IS the boundary, so the grid contains it exactly and the re-arm maths below
    // is measured rather than approximated.
    await chainStore.patch(c.chainId, { gridAnchorAt: boundaryIso, nextBoundaryAt: boundaryIso });
    if (confirmed) {
      const o = await observationStore.ensure(c.assetId, boundaryIso);
      await observationStore.confirm(o.id, {
        price: 65_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundaryIso,
        evidence: null, confidence: 1, model: null, rawHash: null,
      });
    }
    let threw: string | null = null;
    let detail = "";
    let opened = false;
    try {
      const r = await advanceChain(c.chainId, { now: nowMs });
      detail = r.detail ?? "";
      opened = r.opened;
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }
    const after = (await chainStore.get(c.chainId))!.nextBoundaryAt;
    const obs = await observationStore.find(c.assetId, boundaryIso);
    return {
      chainId: c.chainId, boundaryIso, nowMs, after, threw, detail, opened,
      spanMs: roundSpanMinutes(durationMinutes) * 60_000,
      readingConfirmed: obs?.state === "CONFIRMED",
      round: await roundStore.latestForChain(c.chainId),
    };
  }

  // ── 7.1 · the production shape, on the production duration ────────────────
  const prod = await stale(3, 28 * 3600, true);
  ok("7.0 · fixture · the boundary really is 28h old and its reading really IS confirmed",
     prod.readingConfirmed && prod.nowMs - Date.parse(prod.boundaryIso) === 28 * 3600_000,
     `confirmed=${prod.readingConfirmed} age=${Math.round((prod.nowMs - Date.parse(prod.boundaryIso)) / 1000)}s`);
  ok("7.0b · fixture · …and that boundary's own close is already in the past",
     Date.parse(prod.boundaryIso) + prod.spanMs <= prod.nowMs,
     `close ${new Date(Date.parse(prod.boundaryIso) + prod.spanMs).toISOString()} vs now ${new Date(prod.nowMs).toISOString()}`);
  ok("7.1 · 🔴 the tick does not THROW — a throw skips the re-arm and pins the chain for ever",
     prod.threw === null, prod.threw ?? "returned normally");
  ok("7.1b · 🔴 …and one tick moves the boundary off the instant it could never play",
     prod.after !== prod.boundaryIso, `${prod.boundaryIso} → ${prod.after}`);
  ok("7.1c · …and no round was opened for a window that had already shut",
     prod.opened === false && prod.round === null, `opened=${prod.opened}`);
  ok("7.1d · …and it says WHY, naming the round's own close rather than the price or the calendar",
     /outlived its own round/i.test(prod.detail) && !/market closed/i.test(prod.detail),
     prod.detail.slice(0, 80));

  // ── 7.2 · the window a widened abandon deadline would still miss ──────────
  // ⭐ THE ASSERTION THAT DISTINGUISHES THE REAL FIX FROM THE PLAUSIBLE ONE. Both durations
  // below are pinned an age that is PAST their own span but INSIDE the 390s abandon deadline,
  // so a fix spelled `ageMs > abandonMs` — reached unconditionally or not — is still red here
  // while §7.1 goes green. These are the only two lengths on the catalogue with that gap, and
  // production stalled on the shorter of them.
  for (const [dur, age] of [[3, 300], [5, 370]] as Array<[number, number]>) {
    const spanS = roundSpanMinutes(dur) * 60;
    ok(`7.2 · fixture · a ${dur}m round spans ${spanS}s — inside the ${ABANDON_S}s deadline`,
       spanS < ABANDON_S && age > spanS && age < ABANDON_S,
       `age ${age}s · span ${spanS}s · deadline ${ABANDON_S}s`);
    const r = await stale(dur, age, true);
    ok(`7.2b · ⭐ a ${dur}m chain ${age}s past its boundary advances — the deadline has NOT elapsed`,
       r.threw === null && r.after !== r.boundaryIso,
       r.threw ?? `${r.boundaryIso} → ${r.after}`);
  }

  // ── 7.3 · at or after NOW, not one span on ────────────────────────────────
  // ⛔ "The boundary moved" is green on a chain that crawls. 28 hours on a 4-minute grid is
  // 420 boundaries; one span per tick would grind through every one of them, each tick firing
  // instantly because the boundary is still in the past. Same lesson as §1.2, different branch.
  ok("7.3 · ⭐ the new boundary is at or after NOW — one tick catches up, not 420",
     prod.after != null && Date.parse(prod.after) >= prod.nowMs,
     `${prod.after} vs now ${new Date(prod.nowMs).toISOString()}`);
  ok("7.3b · ⛔ …and it is emphatically not merely one span on from where it was pinned",
     prod.after != null && Date.parse(prod.after) > Date.parse(prod.boundaryIso) + prod.spanMs,
     `${prod.after} vs one-span-on ${new Date(Date.parse(prod.boundaryIso) + prod.spanMs).toISOString()}`);

  // ── 7.4 · the over-correction, which is the worse defect ──────────────────
  // ⛔ A rule that skipped whenever it declined to open would consume LIVE boundaries and the
  // game would silently stop producing rounds — §2's lesson, one branch along. A boundary
  // inside its own span must still open, and must still be RETRIED while it waits for a price.
  const live = await stale(3, 60, true);
  ok("7.4 · fixture · a 60s-old boundary on a 3m chain still has 180s before its close",
     Date.parse(live.boundaryIso) + live.spanMs > live.nowMs,
     `close ${new Date(Date.parse(live.boundaryIso) + live.spanMs).toISOString()}`);
  ok("7.4b · ⭐ …and it OPENS A ROUND — the positive control, in this section, in this run",
     live.threw === null && live.opened === true && live.round != null,
     live.threw ?? `opened=${live.opened} round=${live.round?.id ?? "none"}`);
  // ⛔ AND THE NEW RULE MUST NOT FIRE INSIDE THE SPAN — stated as what must NOT be in the
  // detail, because that is the only thing this branch uniquely controls.
  //
  // ⚠️ This assertion was first written as "an unpriced boundary is RETRIED, never consumed"
  // and it FAILED against correct code: the fixture asked for an unconfirmed reading, the real
  // oracle read the price anyway (`updown.observation.confirmed` in this suite's own audit
  // trail), a round opened, and the boundary moved for the RIGHT reason. The retry property
  // is already pinned where it can be controlled — §2.1 here, and E83.5 in `test:updown-heal`.
  // What §7 owes is narrower and is this: a boundary still inside its own span is never
  // abandoned by §7's rule, whatever the feed happens to do on the day.
  ok("7.4c · ⛔ …and a boundary inside its span is NEVER abandoned by this rule",
     live.threw === null && !/outlived its own round/i.test(live.detail),
     live.detail === "" ? "(opened, no detail)" : live.detail.slice(0, 80));

  // ── 7.5 · the old abandon branch is still reachable, and still needed ─────
  // ⚠️ A fix that made the price-deadline branch DEAD CODE would look green everywhere and
  // quietly delete E-83's bound. It survives for every length whose span outlasts the
  // deadline — 10m and up — which is where it was always the binding rule.
  const longUnpriced = await stale(15, ABANDON_S + 10, false);
  ok("7.5 · fixture · a 15m round's span outlasts the deadline, so the deadline binds first",
     roundSpanMinutes(15) * 60 > ABANDON_S, `${roundSpanMinutes(15) * 60}s vs ${ABANDON_S}s`);
  ok("7.5b · ⭐ …and an unpriceable boundary there is still given up by the PRICE deadline",
     /no open price/i.test(longUnpriced.detail) && longUnpriced.after !== longUnpriced.boundaryIso,
     longUnpriced.detail.slice(0, 80));

  // ── 7.6 · EVERY duration is exposed, not just the two with the short span ──
  // ⛔ THE FRAMING THAT HAD TO BE CORRECTED, AND IT WAS CORRECTED BY MEASUREMENT. §7.2's
  // arithmetic (span vs the 390s deadline) singles out 3m and 5m, and it is easy to read that
  // as "only short chains stall". It is not: the deadline only bounds the case where the
  // reading is PENDING. With a CONFIRMED reading the abandon check was skipped at EVERY
  // length, so a 60-minute chain a day behind threw exactly as hard as a 3-minute one.
  // §7.2 is about which chains a HALF-FIX still leaves broken; this is about which chains the
  // defect reached. Both stalled chains on production were 3m, and that is a fact about the
  // feed's timing, not about the blast radius.
  const longStale = await stale(60, 28 * 3600, true);
  ok("7.6 · 🔴 a 60-minute chain a day stale is abandoned too — the defect was never length-bound",
     longStale.threw === null && longStale.after != null && Date.parse(longStale.after) >= longStale.nowMs,
     longStale.threw ?? `${longStale.boundaryIso} → ${longStale.after}`);

  // ── 7.7 · THE MONEY QUESTION, ASKED OF THIS BRANCH SPECIFICALLY ───────────
  // ⛔ §6 asks it of the CALENDAR branch and the answer is not transferable by resemblance —
  // that is this file's own rule, and E-24 is why (1,398 rounds and real player money sat
  // behind exactly the reasoning "the other branch is safe, so this one is").
  //
  // The worry is precise: `advanceChain` closes a round only when `chain.currentRoundId` still
  // points at it AND its `boundaryAt` equals the instant being ticked. So a branch that moves
  // the boundary PAST an unresolved round is, on the face of it, doing what E-24 did.
  //
  // ⭐ IT IS SAFE, AND THE REASON IS THAT `advanceChain` DOES NOT OWN THE CLOSE RETRY —
  // `healStuckRounds` does, on the lifecycle ticker. `healOneRound` reads
  // `roundStore.unresolvedBefore`, which is filtered by neither the grid nor the chain's
  // state; inside the deadline it climbs the observation ladder itself, and past the deadline
  // it performs the late DATED re-read and settles the round properly rather than voiding it.
  // Moving the boundary therefore costs the round nothing except one opportunistic close
  // attempt per tick, which the healer repeats on its own cadence.
  //
  // ⚠️ THE ALTERNATIVE WAS WEIGHED AND REJECTED, and it is recorded here so it is not
  // re-litigated blindly: the check could sit INSIDE the not-confirmed branch instead, which
  // would also stop the throw and would leave `test:updown-heal` E83.5 and
  // `test:updown-tick-cadence` §3.3 untouched at their original fixtures. It was rejected
  // because it leaves a 3-minute chain retrying a boundary that can never open for a further
  // 150s — futile by construction, since the retry exists to OPEN a round and the window to do
  // so has shut. The two suites were re-fixtured onto lengths where their own assertions are
  // satisfiable, and each gained a fixture guard (E83.0b, §0.0) so they cannot drift back.
  {
    const c = await chainFor("OLDMONEY", "BTC/USD", "crypto", 3);
    const nowMs = Date.now();
    // A live boundary first, so a REAL round exists — opened through the engine, not stitched.
    const openIso = new Date(nowMs - 60_000).toISOString();
    await chainStore.patch(c.chainId, { gridAnchorAt: openIso, nextBoundaryAt: openIso });
    const oo = await observationStore.ensure(c.assetId, openIso);
    await observationStore.confirm(oo.id, {
      price: 65_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: openIso,
      evidence: null, confidence: 1, model: null, rawHash: null,
    });
    await advanceChain(c.chainId, { now: nowMs });
    const round = await roundStore.latestForChain(c.chainId);
    ok("7.7 · fixture · a real round exists, unresolved, with a close of its own",
       round != null && round.resolvedAt == null, round?.id ?? "no round");

    // Now tick the chain far past that round's close with a CONFIRMED reading at the round's
    // own boundary — the §7.4 shape, arriving while a round is still unresolved.
    const late = nowMs + 28 * 3600_000;
    const co = await observationStore.ensure(c.assetId, round!.boundaryAt);
    void co;
    let lateThrew: string | null = null;
    try { await advanceChain(c.chainId, { now: late }); }
    catch (e) { lateThrew = e instanceof Error ? e.message : String(e); }
    const afterBoundary = (await chainStore.get(c.chainId))!.nextBoundaryAt;
    ok("7.7b · the boundary still advances past a round that has not resolved, without throwing",
       lateThrew === null && afterBoundary !== round!.boundaryAt,
       lateThrew ?? `${round!.boundaryAt} → ${afterBoundary}`);

    // ⭐ AND THE ROUND IS STILL REACHABLE BY THE ONE READ THAT MUST NEVER MISS IT.
    const reachable = await roundStore.unresolvedBefore(
      new Date(Date.parse(round!.boundaryAt) + 1000).toISOString(), 50);
    const stillThere = await roundStore.get(round!.id);
    ok("7.7c · ⭐ …and an unresolved round left behind stays visible to the healer's read",
       stillThere?.resolvedAt != null || reachable.some((x) => x.id === round!.id),
       stillThere?.resolvedAt != null
         ? `the tick closed it outright (resolvedAt ${stillThere.resolvedAt})`
         : `${reachable.length} unresolved rows, round present`);
  }
}
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
