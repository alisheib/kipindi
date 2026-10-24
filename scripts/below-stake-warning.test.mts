/**
 * test:below-stake-warning — EVERY STAKE-SHARE BET SCREEN SAYS IT BEFORE THE BET (programme FEE-TAX-2026-10, release R2c;
 * `docs/FEE-TAX-PLAN.md` §2, Ali's ruling 1 of 2026-10-24: "a winner can get back less than their stake — the bet screen
 * warns before the bet").
 *
 *   npm run test:below-stake-warning     (in predeploy)
 *
 * Under `stake-share` the fee comes out of every stake, so a correct call on a lopsided market IS paid back less than it
 * staked. Every bet screen draws one view model for that (`src/lib/stake-share-notice.ts`), and this suite holds it:
 *
 *   §1 THE VIEW MODEL — `stakeShareNotice` carries the AMBER warning exactly when the engine's projected payout is under the
 *      stake (and with the engine's own figures), the standing line ALWAYS (a non-null notice is what draws it), the refund
 *      line on a book with no taker (never the warning there), this stake's fee at the frozen rate, and NOTHING for a market
 *      frozen under an older model. It never throws — a corrupt snapshot, a stake-share set with no tax, a fractional stake.
 *   §2 EACH SCREEN'S OWN VIEW MODEL, with that screen's inputs — the polls dial and its confirm (`stakeShareNotice`), the
 *      journey bet sheet (a seed through `parseSheetSeed`, then the notice and the sheet's estimate), Up & Down's round
 *      confirm and two-way control (`upDownNotice` / `upDownNoticeEitherSide`, never gated by the display switch), and the
 *      journey arm (`judNotice` / `judNoticeEitherSide`).
 *   §3 EACH SCREEN'S SOURCE DRAWS IT — the call, the `below` warning, the standing line, the warning ABOVE the control that
 *      places; and the two-way controls state no figure (the owner's ruling of 2026-10-14).
 *   §4 THE WORDS, RENDERED — the warning with its figures as amounts, in the amber box; the thin note's never-paid-less
 *      promise NEVER under stake-share, and still under the older models (the review of R2a, finding 1).
 * Every section carries its control: a fair book does not warn, a legacy market draws nothing, a plant is seen.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment } from "./lib/decomment.mts";
import { stakeShareNotice, stakeShareNoticeEitherSide, isStakeShareRates } from "../src/lib/stake-share-notice.ts";
import { payoutFor, roundHalfUpBp, PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "../src/lib/payout.ts";
import { upDownNotice, upDownNoticeEitherSide, type UpDownPricing } from "../src/lib/updown-pricing.ts";
import { judNotice, judNoticeEitherSide } from "../src/lib/journey/updown-arm.ts";
import { parseSheetSeed } from "../src/lib/journey/sheet-seed.ts";
import { estimateFor } from "../src/lib/markets/estimate.ts";
import { HouseLeanWarning } from "../src/components/markets/house-lean-warning.tsx";
import { dict, DEFAULT_LOCALE } from "../src/lib/i18n-dict.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);
const j = (v: unknown) => JSON.stringify(v);
const read = (p: string) => decomment(readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n"));
/** A call that must not throw: its value, or the error's words. */
const safe = <T,>(f: () => T): T | { threw: string } => { try { return f(); } catch (e) { return { threw: String((e as Error)?.message ?? e) }; } };
const threw = (v: unknown): v is { threw: string } => !!v && typeof v === "object" && "threw" in (v as object);

/** The decided law (not in force until R5), written out so a change to a shipped default cannot redefine this file. */
const SS = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, commissionRate: 0.13, feeCeilingRate: 1 / 3, showEstimatedWinnings: true };
const LS = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.13, feeCeilingRate: 1 / 3, showEstimatedWinnings: true };
const CAP = { feeModel: "capped-commission" as const, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
/** A snapshot from before 2026-07-23: no model at all — capped-commission by the no-mix rule, never stake-share. */
const BARE = { commissionRate: 0.10, feeCeilingRate: 1 / 3 };

/** A lopsided book BEFORE the bet: YES 90,000 / NO 10,000 — a 10,000 YES stake makes it 100,000 / 10,000. */
const LOP = { yesPool: 90_000, noPool: 10_000 };
const BAL = { yesPool: 50_000, noPool: 50_000 };

// ═══ §1 · THE VIEW MODEL ═══════════════════════════════════════════════════════════════════════════════════════════════
section("§1 · stakeShareNotice — the warning exactly when a win pays back less than the stake");
{
  const n = stakeShareNotice({ ...LOP, side: "YES", stake: 10_000, rates: SS });
  const want = payoutFor({ ...LOP, side: "YES", stake: 10_000 }, SS).payout;
  ok("1.1 · ★ the big side on a lopsided book WARNS, with the engine's own projected payout and the stake",
    !!n && !!n.below && n.below.payout === want && n.below.stake === 10_000 && want < 10_000, j({ below: n?.below, want }));
  ok("1.2 · …and the quote carries this stake's fee at the frozen rate (13% of 10,000 = 1,300, whole basis points) and its net",
    !!n?.quote && n.quote.fee === roundHalfUpBp(10_000, 1_300) && n.quote.fee === 1_300 && n.quote.net === 8_700 && n.quote.payout === want,
    j(n?.quote));
  ok("1.3 · …the tax this stake would carry is its share of the market's winnings tax (> 0), and {fee}/{tax} are the frozen 13/15",
    !!n?.quote && n.quote.tax > 0 && n.feePct === 13 && n.taxPct === 15, j({ q: n?.quote, fee: n?.feePct, tax: n?.taxPct }));

  const small = stakeShareNotice({ ...LOP, side: "NO", stake: 10_000, rates: SS });
  ok("1.4 · CONTROL · the SMALL side of the same book does not warn (its prize is the big side's stakes)",
    !!small && small.below === null && !!small.quote && small.quote.payout > 10_000, j(small?.quote));
  const fair = stakeShareNotice({ ...BAL, side: "YES", stake: 1_000, rates: SS });
  ok("1.5 · CONTROL · a balanced book does not warn — but the notice is there, so the standing line is drawn",
    !!fair && fair.below === null && !!fair.quote && fair.quote.payout > 1_000 && fair.quote.fee === 130 && fair.quote.net === 870, j(fair));

  const empty = stakeShareNotice({ yesPool: 10_000, noPool: 0, side: "YES", stake: 1_000, rates: SS });
  ok("1.6 · ★ nobody on the other side yet: the refund line (noTaker), the stake quoted back (the one-sided mirror), no tax, NO warning",
    !!empty && empty.noTaker === true && empty.below === null && empty.quote?.payout === 1_000 && empty.quote.tax === 0, j(empty));
  const first = stakeShareNotice({ yesPool: 10_000, noPool: 0, side: "NO", stake: 1_000, rates: SS });
  ok("1.7 · …and the bet that FILLS the empty side has a taker, so it is priced, not refunded", !!first && first.noTaker === false && !!first.quote, j(first));

  for (const [name, rates] of [["loser-share", LS], ["capped-commission", CAP], ["a bare legacy snapshot", BARE], ["no rates", null]] as const) {
    const legacy = safe(() => stakeShareNotice({ ...LOP, side: "YES", stake: 10_000, rates }));
    ok(`1.8 · ★ ${name}: NOTHING — no warning, no standing line, no figure (legacy markets keep their words byte for byte)`, legacy === null, j(legacy));
  }
  ok("1.9 · isStakeShareRates reads the frozen model alone — an absent model is never stake-share",
    isStakeShareRates(SS) && !isStakeShareRates(LS) && !isStakeShareRates(CAP) && !isStakeShareRates(BARE) && !isStakeShareRates(null));

  // ⛔ TOTAL: a projection must never take a screen down (the review of R2a, finding 2).
  const noTax = safe(() => stakeShareNotice({ ...LOP, side: "YES", stake: 10_000, rates: { feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 } }));
  ok("1.10 · ★ a stake-share set with NO tax does not throw: the standing line, the fee figure, no payout and no warning",
    !threw(noTax) && !!noTax && noTax.quote === null && noTax.below === null && noTax.feePct === 13 && noTax.taxPct === null, j(noTax));
  const corrupt = safe(() => stakeShareNotice({ ...LOP, side: "YES", stake: 10_000, rates: { feeModel: "stake-share", platformFeeRate: Number.NaN, operatorFeeRate: 0.10, winningsTaxRate: 0.15 } }));
  ok("1.11 · ★ a corrupt stake-share snapshot does not throw: the standing line alone",
    !threw(corrupt) && !!corrupt && corrupt.quote === null && corrupt.below === null, j(corrupt));
  const odd = [1_000.5, 0, -500, Number.NaN, null, undefined].map((stake) => safe(() => stakeShareNotice({ ...LOP, side: "YES", stake, rates: SS })));
  ok("1.12 · a fractional, zero, negative, NaN or absent stake prices nothing and throws nothing — the notice (and its standing line) stays",
    odd.every((o) => !threw(o) && !!o && o.quote === null && o.below === null), j(odd));
  const pools = safe(() => stakeShareNotice({ yesPool: 90_000.5, noPool: 10_000, side: "YES", stake: 10_000, rates: SS }));
  ok("1.13 · a fractional pool (the engine refuses one) is no figure, never a throw", !threw(pools) && !!pools && pools.quote === null, j(pools));

  const either = stakeShareNoticeEitherSide({ ...LOP, stake: 10_000, rates: SS });
  ok("1.14 · ★ the two-way form names the side whose win pays back less (YES here), with that side's figures",
    !!either && either.belowSide === "YES" && either.below?.payout === want, j(either));
  const eitherFair = stakeShareNoticeEitherSide({ ...BAL, stake: 1_000, rates: SS });
  ok("1.15 · CONTROL · …and on a balanced book it names none, yet is there (the standing line)", !!eitherFair && eitherFair.belowSide === null && eitherFair.below === null, j(eitherFair));
  ok("1.16 · …and is null on a legacy market", stakeShareNoticeEitherSide({ ...LOP, stake: 10_000, rates: LS }) === null);
}

// ═══ §2 · EACH SCREEN'S OWN VIEW MODEL ═════════════════════════════════════════════════════════════════════════════════
section("§2 · each bet screen's view model, from that screen's own inputs");
{
  // The polls dial passes its pools, the side it points at and its stake; its confirm gets the same call for the quote.
  const dial = stakeShareNotice({ ...LOP, side: "YES", stake: 10_000, rates: SS });
  ok("2.1 · the polls dial + confirm: the warning and the quote", !!dial?.below && !!dial.quote, j(dial));

  // The journey bet sheet: the server-rendered seed, parsed as the client parses it, then the box's own call.
  const seedRaw = j({
    v: 1, id: "mkt_stakeShare1", yesPool: LOP.yesPool, noPool: LOP.noPool, serverNow: Date.now(), min: PLATFORM_MIN_STAKE, max: PLATFORM_MAX_STAKE,
    bettable: true, closesAt: null, feePct: 13, taxPct: 15, rates: SS,
  });
  const seed = parseSheetSeed(seedRaw);
  ok("2.2 · ★ the journey sheet READS a stake-share seed (it used to navigate away from one) and keeps its {tax}",
    !!seed && seed.rates?.feeModel === "stake-share" && seed.taxPct === 15, j(seed));
  if (seed) {
    const box = stakeShareNotice({ yesPool: seed.yesPool, noPool: seed.noPool, side: "YES", stake: 10_000, rates: seed.rates });
    ok("2.3 · …the sheet's box warns on the seed's own pools and frozen rates", !!box?.below && box.below.payout === dial?.below?.payout, j(box));
    const est = estimateFor({ yesPool: seed.yesPool, noPool: seed.noPool, side: "YES", stake: 10_000, rates: seed.rates, bettable: true, bounds: { min: seed.min, max: seed.max } });
    ok("2.4 · …and the sheet's estimate prices the same figure, with the `below` lean and the frozen {fee}/{tax}",
      est?.state === "priced" && est.payout === dial?.below?.payout && est.lean === "below" && est.feePct === 13 && est.taxPct === 15, j(est));
    const card = estimateFor({ yesPool: seed.yesPool, noPool: seed.noPool, side: "YES", stake: 0, rates: seed.rates, bettable: true });
    // (1 − 13%) + (1 − 13%)(1 − 15%)·10,000/90,000 = 0.952… — under 1×, printed ≈1.0× (half-up tenths), leaning `below`.
    ok("2.5 · …the card's zero-stake multiple on that side is under 1× and leans `below`",
      card?.state === "priced" && card.lean === "below" && card.multTenths !== null && card.multTenths <= 10, j(card));
  }
  const unknown = parseSheetSeed(j({ v: 1, id: "mkt_jackpot1", yesPool: 1, noPool: 1, serverNow: 1, min: 1, max: 2, bettable: true, closesAt: null, feePct: null, rates: { feeModel: "jackpot-payout" } }));
  ok("2.6 · CONTROL · a model the sheet does not speak is still NOT read (the link navigates instead)", unknown === null);
  const legacySeed = parseSheetSeed(j({ v: 1, id: "mkt_loser1", yesPool: LOP.yesPool, noPool: LOP.noPool, serverNow: 1, min: PLATFORM_MIN_STAKE, max: PLATFORM_MAX_STAKE, bettable: true, closesAt: null, feePct: 13, rates: LS }));
  ok("2.7 · CONTROL · a loser-share seed (rendered before {tax} existed) still parses, and its box draws nothing new",
    !!legacySeed && legacySeed.taxPct === undefined && stakeShareNotice({ ...LOP, side: "YES", stake: 10_000, rates: legacySeed.rates }) === null, j(legacySeed));

  // Up & Down: UP is YES and DOWN is NO, on the round's raw pools and frozen rates.
  const pricing = (rates: UpDownPricing["rates"], show = true): UpDownPricing => ({ upPool: LOP.yesPool, downPool: LOP.noPool, rates, show });
  const ssRates = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.13, feeCeilingRate: 1 / 3, winningsTaxRate: 0.15 };
  const lsRates = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
  const up = upDownNotice(pricing(ssRates), "UP", 10_000);
  ok("2.8 · ★ the Up & Down round confirm: UP on the big side warns, with the same figure as a poll's", !!up?.below && up.below.payout === dial?.below?.payout, j(up));
  ok("2.9 · CONTROL · …DOWN (the small side) does not", upDownNotice(pricing(ssRates), "DOWN", 10_000)?.below === null);
  ok("2.10 · ★ the display switch hides an ESTIMATE, never the warning: show=false still warns",
    !!upDownNotice(pricing(ssRates, false), "UP", 10_000)?.below);
  const two = upDownNoticeEitherSide(pricing(ssRates), 10_000);
  ok("2.11 · ★ the two-way control (board card, round page with no side) names UP as the side that would pay back less", two?.belowSide === "UP", j(two));
  ok("2.12 · CONTROL · a loser-share round: nothing on either control", upDownNotice(pricing(lsRates), "UP", 10_000) === null && upDownNoticeEitherSide(pricing(lsRates), 10_000) === null);
  ok("2.13 · the journey arm's confirm and two-way control read the very same notices",
    j(judNotice(pricing(ssRates), "UP", 10_000)) === j(up) && j(judNoticeEitherSide(pricing(ssRates), 10_000)) === j(two)
    && judNotice(pricing(lsRates), "UP", 10_000) === null);
  ok("2.14 · null pricing is no notice and no throw", upDownNotice(null, "UP", 10_000) === null && upDownNoticeEitherSide(undefined, 10_000) === null);
}

// ═══ §3 · EACH SCREEN'S SOURCE DRAWS IT ════════════════════════════════════════════════════════════════════════════════
section("§3 · every bet screen's source calls the view model and draws the warning and the standing line");
{
  const BELOW = /<HouseLeanWarning level="below" stakeShare/;
  const SCREENS: Array<{ name: string; file: string; call: RegExp; warn: RegExp; commit?: string }> = [
    // The dial draws its lean (`leanFor` over the same `payoutFor`, `below` under 1×) with the notice's figures.
    { name: "the polls dial", file: "src/components/markets/conviction-dial.tsx", call: /stakeShareNotice\(/, warn: /<HouseLeanWarning level=\{lean\} stakeShare below=\{notice\?\.below/ },
    { name: "the polls confirm", file: "src/components/markets/bet-confirm-modal.tsx", call: /notice\.below/, warn: BELOW },
    { name: "the journey bet sheet", file: "src/components/journey/bet-sheet/sheet-parts.tsx", call: /stakeShareNotice\(\{ yesPool: seed\.yesPool, noPool: seed\.noPool/, warn: BELOW },
    { name: "the Up & Down round confirm", file: "src/components/updown/round-stake-panel.tsx", call: /upDownNotice\(pricing, lockedSide/, warn: BELOW, commit: "onClick={() => bet.place(lockedSide)}" },
    { name: "the Up & Down two-way control", file: "src/components/updown/updown-stake-controls.tsx", call: /upDownNoticeEitherSide\(pricing/, warn: BELOW, commit: "<UpDownSidePair" },
    { name: "the journey arm's two-way control", file: "src/components/journey/updown/jud-arm.tsx", call: /judNoticeEitherSide\(round\.pricing/, warn: BELOW, commit: '<div className="kp-jud__sides">' },
    { name: "the journey arm's confirm", file: "src/components/journey/updown/jud-arm.tsx", call: /judNotice\(round\.pricing, side/, warn: BELOW, commit: 'data-testid="jud-place"' },
  ];
  ok("3.0 · PLANT · the warning reader sees the tag, and does not see an older lean's", BELOW.test('<HouseLeanWarning level="below" stakeShare below={x} />') && !BELOW.test("<HouseLeanWarning level={lean} />"));
  for (const s of SCREENS) {
    const src = read(s.file);
    ok(`3.1 · ${s.name} asks the view model`, s.call.test(src), s.file);
    ok(`3.2 · ${s.name} draws the below-stake warning`, s.warn.test(src), s.file);
    ok(`3.3 · ${s.name} draws the standing line`, src.includes("t.market.ssStanding"), s.file);
    if (s.commit) {
      const at = src.indexOf(s.commit);
      const warn = s.commit === 'data-testid="jud-place"'
        ? src.lastIndexOf('<HouseLeanWarning level="below" stakeShare', at)
        : src.indexOf('<HouseLeanWarning level="below" stakeShare', s.commit === '<div className="kp-jud__sides">' ? src.indexOf("export function JudTwoWay") : 0);
      ok(`3.4 · ★ ${s.name}: the warning stands ABOVE the control that places (read before the tap, never after)`, at > 0 && warn > 0 && warn < at, `${warn} < ${at}`);
    }
  }
  // ⛔ The owner's ruling of 2026-10-14: a two-way Up & Down control quotes no figure before the commit.
  const controls = read("src/components/updown/updown-stake-controls.tsx");
  const arm = read("src/components/journey/updown/jud-arm.tsx");
  const twoWay = arm.slice(arm.indexOf("export function JudTwoWay"), arm.indexOf("export function JudConfirm"));
  ok("3.5 · ★ the two-way controls' warning names the side only — no payout, no stake figure handed in",
    /below=\{\{ side: sideWord\(t, notice\.belowSide, "UPDOWN"\) \}\}/.test(controls) && /below=\{\{ side: sideWord\(t, notice\.belowSide, "UPDOWN"\) \}\}/.test(twoWay),
    "the two-way warning must carry { side } alone");
  ok("3.6 · CONTROL · the confirm-side warnings DO hand in the notice's figures",
    /below=\{\{ side: pickWord, \.\.\.notice\.below \}\}/.test(read("src/components/updown/round-stake-panel.tsx"))
    && /below=\{\{ side: word, \.\.\.notice\.below \}\}/.test(arm));
  // The confirm modal's receipt: the stake, OUR fee, what enters the pool, and — if it wins — the payout and the tax.
  const modal = read("src/components/markets/bet-confirm-modal.tsx");
  ok("3.7 · ★ the polls confirm's receipt states the stake, our fee, the net stake, the payout if it wins and the tax withheld",
    ["t.dialog.stakeLabel", "t.market.ssOurFee", "t.market.ssNetStake", "t.market.ssIfWins", "t.market.ssTaxWithheld", "t.market.ssNoTaker"].every((k) => modal.includes(k)));
  ok("3.8 · ★ the three other commit screens state this stake's fee and what enters the pool (market.ssFeeLine)",
    ["src/components/journey/bet-sheet/sheet-parts.tsx", "src/components/updown/round-stake-panel.tsx", "src/components/journey/updown/jud-arm.tsx"].every((f) => read(f).includes("t.market.ssFeeLine")));
}

// ═══ §4 · THE WORDS, RENDERED ══════════════════════════════════════════════════════════════════════════════════════════
section("§4 · the warning's words — amber, exact, the figures as amounts; the never-paid-less promise never under stake-share");
{
  // The words as RENDERED: outside a provider `useT` speaks the default locale (Swahili), so §4 reads that dictionary.
  const shown = dict[DEFAULT_LOCALE].market;
  const render = (props: Parameters<typeof HouseLeanWarning>[0]) => safe(() => renderToStaticMarkup(createElement(HouseLeanWarning, props)));
  const below = render({ level: "below", stakeShare: true, below: { side: "NDIYO", payout: 9_440, stake: 10_000 } });
  ok("4.1 · ★ the below warning renders its title and BOTH figures as amounts",
    typeof below === "string" && below.includes("TZS 9,440") && below.includes("TZS 10,000") && /class="amount"/.test(below) && below.includes("NDIYO"),
    typeof below === "string" ? below.slice(0, 200) : j(below));
  const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/[ ⁠]/g, " ");
  ok("4.2 · …in the warning family's box, under the dictionary's own title", typeof below === "string" && /warning/.test(below) && plain(below).includes(shown.ssBelowTitle.split(" ")[0]),
    typeof below === "string" ? plain(below).slice(0, 120) : "");
  const sideOnly = render({ level: "below", stakeShare: true, below: { side: "UP" } });
  ok("4.3 · with the side alone (the two-way controls) it names the side and states no figure",
    typeof sideOnly === "string" && sideOnly.includes("UP") && !/TZS/.test(sideOnly), typeof sideOnly === "string" ? plain(sideOnly).slice(0, 160) : j(sideOnly));
  const promise = shown.thinUpsideNote.split(" — ")[0].split(". ")[1] ?? "never be paid less";
  const thinSS = render({ level: "thin", stakeShare: true });
  const thinLegacy = render({ level: "thin" });
  ok("4.4 · ★ a stake-share `thin` lean draws the title alone — never \"you will never be paid less than you staked\"",
    typeof thinSS === "string" && !plain(thinSS).includes(promise) && plain(thinSS).length > 0, typeof thinSS === "string" ? plain(thinSS) : j(thinSS));
  ok("4.5 · CONTROL · the older models' thin note still makes its promise (it is true there)",
    typeof thinLegacy === "string" && plain(thinLegacy).includes(promise), `looked for "${promise}"`);
  ok("4.6 · a fair lean draws nothing", render({ level: "fair", stakeShare: true }) === "");
  // Every language carries the words, with the placeholders the screens fill.
  for (const loc of ["en", "sw", "zh"] as const) {
    const m = dict[loc].market as Record<string, string>;
    ok(`4.7 · ${loc}: the standing line, the refund line, the title and both bodies exist, with their placeholders`,
      !!m.ssStanding && !!m.ssNoTaker && !!m.ssBelowTitle
      && ["{side}", "{payout}", "{stake}"].every((p) => m.ssBelowBody?.includes(p)) && m.ssBelowSide?.includes("{side}") && !m.ssBelowSide.includes("{payout}"));
  }
}

console.log(`\nbelow-stake-warning: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
