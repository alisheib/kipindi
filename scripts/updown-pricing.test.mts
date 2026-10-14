/**
 * D2 — THE HONEST ESTIMATE AND THE EMPTY-SIDE STATE, AS AMENDED BY THE OWNER ON 2026-10-14.
 *
 * ⭐ THE RULING (Ali, 2026-10-14): *"remove odds from up and down market cards please and wherever this should be
 * reflected as well. mark this as decision, keep up and down only"* — DESIGN_AUTHORITY §C3, COMPLIANCE-DECISIONS
 * § "2026-10-14 · Up & Down cards show Up and Down only". So this suite now holds three things:
 *   · NO MULTIPLE ON ANY UP & DOWN CHOICE. The board card's two buttons (signed in and out), the one-tap stake control
 *     and the round page's two-way control say the side's word and nothing else (§3, §5, §8 — rendered, en/sw/zh).
 *   · THE MONEY AT THE COMMIT STAYS, AND IT IS STILL THE POOL'S. The round page's confirm panel states the projected
 *     return in shillings and the receipt repeats it — computed by `payoutFor`, the function settlement pays with
 *     (§1, §5.8, §5.14, §8.4). Informed consent at the money commit is a UX commitment (CLAUDE.md).
 *   · THE EMPTY SIDE IS STILL SAID BEFORE ANY STAKE, AND ITS TRUTH IS THE POOL'S. With no multiple on the card the
 *     standards' old signature for an empty counterparty (a side quoted at exactly 1.00×) has nothing to read; the
 *     sentence must appear iff the round's RAW pools leave a side empty (`emptySideOf`), which on the card is iff its
 *     split row is not a two-sided price (§2, §8.2, §8.3).
 *
 * 🔴 WHAT D2 GUARDED FIRST, AND STILL DOES (§1, §4). The card once printed a flat `× 1.5 est.` on BOTH buttons —
 * `estimatedWinningsRate` is a config constant, so the figure read **identically when the other side held TZS 36,000
 * and when it held nothing**. Measured on the real rates: a round holding UP 36,000 / DOWN 0 pays **16.66×** to a
 * DOWN backer and **exactly 1.00×** to an UP backer. The figures a player IS shown — the projected return at the
 * commit — must be that arithmetic, never a constant.
 *
 * ⛔ HALF THIS SUITE EXECUTES THE MATH AND RENDERS THE COMPONENTS rather than reading the source, on purpose. A
 * source-shape check can only prove a symbol is present; §1–§3 import the module and assert real numbers, and §8 renders
 * the card and the round page's panels in three languages and reads what a player would read. §4–§7 then check the
 * wiring, which is the only part neither can reach.
 *
 * ⚠️ Every source check is scoped to a resolved slice and §0 REFUSES TO RUN if one is empty
 * (session 29 shipped six checks that could not fail, session 30 shipped two more).
 *
 *   npm run test:updown-pricing        (its RED proof: npm run red:updown-pricing)
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as pricingModule from "../src/lib/updown-pricing.ts";
import {
  impliedMultiplier, emptySideOf, refundWarningFor, projectedReturn,
  type UpDownPricing, type UpDownRates,
} from "../src/lib/updown-pricing.ts";
import { payoutFor } from "../src/lib/payout.ts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { formatTzs } from "../src/lib/utils.ts";

const PRICING = "src/lib/updown-pricing.ts";
const BOARD = "src/lib/server/updown-board.ts";
const CARD = "src/components/updown/updown-card.tsx";
const CONTROLS = "src/components/updown/updown-stake-controls.tsx";
const PANEL = "src/components/updown/round-stake-panel.tsx";
const RECEIPT = "src/components/updown/updown-bet-receipt-modal.tsx";
// ⚠️ 2026-08-07 · `updown-bet-box.tsx` is GONE (deleted with Session B Stage 1 — zero
// call sites; RoundStakePanel is the round page's one bet surface). The BOX slice went
// with it; three surfaces remain.
const BOARD_PAGE = "src/app/updown/page.tsx";
const ROUND_PAGE = "src/app/updown/[roundId]/page.tsx";
const DICT = "src/lib/i18n-dict.ts";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** The same source with every comment removed — §4–§7 assert ABSENCES, so they must read CODE.
 *  A guard tripped by the very comment that explains it is §0.1a's mistake exactly. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
}

/** Brace-matched slice from `open` to the brace that closes it. Null, never "", when absent. */
function sliceBraces(text: string, open: string): string | null {
  const at = text.indexOf(open);
  if (at < 0) return null;
  let i = at + open.length - 1;
  if (text[i] !== "{") { const j = text.indexOf("{", i); if (j < 0) return null; i = j; }
  let depth = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}") { depth--; if (depth === 0) return text.slice(at, k + 1); }
  }
  return null;
}

/** The live production rates: loser-share, 3% platform + 10% operator of the LOSING pool. */
const LIVE: UpDownRates = {
  feeModel: "loser-share",
  commissionRate: 0.1,
  feeCeilingRate: 1 / 3,
  platformFeeRate: 0.03,
  operatorFeeRate: 0.1,
};
/** The other model a legacy round may have frozen — the maths must hold under both. */
const CAPPED: UpDownRates = { ...LIVE, feeModel: "capped-commission" };

const P = (up: number, down: number, rates: UpDownRates = LIVE, show = true): UpDownPricing =>
  ({ upPool: up, downPool: down, rates, show });

const near = (a: number | null, b: number, eps = 0.005) => a != null && Math.abs(a - b) <= eps;

console.log("\nUp & Down · D2 as amended 2026-10-14 — Up and Down only on the choices, the pool's money at the commit, the empty side said\n");

// ── §0. THE SLICES ────────────────────────────────────────────────────────────────────────
console.log("§0 · the slices this suite reasons over (refuse to measure an empty one)");
const board = read(BOARD);
const cardCode = stripComments(read(CARD));
const controlsCode = stripComments(read(CONTROLS));
const panelCode = stripComments(read(PANEL));
const receiptCode = stripComments(read(RECEIPT));
const dict = read(DICT);
const toBoardRound = sliceBraces(board, "async function toBoardRound(");
ok("0.1 `toBoardRound`'s body is locatable", toBoardRound != null);
ok("0.2 …and is substantial", (toBoardRound?.length ?? 0) > 800, `${toBoardRound?.length ?? 0} chars`);
ok("0.3 the card's code survives comment-stripping", cardCode.length > 4000, `${cardCode.length} chars`);
ok("0.4 the controls' code survives comment-stripping", controlsCode.length > 2000, `${controlsCode.length} chars`);
ok("0.5 the panel's code survives comment-stripping", panelCode.length > 2000, `${panelCode.length} chars`);
ok("0.6 the receipt's code survives comment-stripping", receiptCode.length > 1000, `${receiptCode.length} chars`);
if (!toBoardRound || cardCode.length < 4000 || controlsCode.length < 2000 || panelCode.length < 2000 || receiptCode.length < 1000) {
  console.log(`\nupdown-pricing: ${pass} passed, ${fails.length} failed`);
  console.error("\n✗ THE SLICES DID NOT RESOLVE — every later check would have passed over an empty string.\n");
  process.exit(1);
}

// ── §1. THE NUMBER IS THE POOL'S, AND IT IS THE MONEY PATH'S OWN ─────────────────────────
console.log("\n§1 · the estimate is computed, not configured — and it equals what settlement pays");

// ⭐ THE DEFECT, AS A NUMBER. The old card printed 1.5 for both of these.
const oneSidedUp = impliedMultiplier(P(36_000, 0), "UP", 2_000);
const oneSidedDown = impliedMultiplier(P(36_000, 0), "DOWN", 2_000);
ok("1.1 backing the FAT side of a one-sided round returns EXACTLY the stake (× 1.00)",
   near(oneSidedUp, 1, 1e-9), `got ${oneSidedUp}`);
ok("1.2 …while the EMPTY side of the same round pays 16.66×",
   near(oneSidedDown, 16.66, 0.01), `got ${oneSidedDown}`);
ok("1.3 …so the two sides of one round DISAGREE, which the flat constant could never do",
   oneSidedUp != null && oneSidedDown != null && oneSidedDown / oneSidedUp > 10);

// A 90/10 pool — the design document's worked example.
const thin = impliedMultiplier(P(90_000, 10_000), "DOWN", 2_000);
const fat = impliedMultiplier(P(90_000, 10_000), "UP", 2_000);
ok("1.4 a 90/10 pool pays the thin side 7.52× and the fat side 1.09×",
   near(thin, 7.52, 0.01) && near(fat, 1.09, 0.01), `thin ${thin} fat ${fat}`);
ok("1.5 …and NEITHER is the flat 1.5 the card used to print",
   !near(thin, 1.5, 0.02) && !near(fat, 1.5, 0.02));

// An EMPTY round: whatever you stake, you get exactly it back if nobody joins.
ok("1.6 an untouched round is 1.00× on BOTH sides — the honest 'your stake comes back'",
   near(impliedMultiplier(P(0, 0), "UP", 5_000), 1, 1e-9) &&
   near(impliedMultiplier(P(0, 0), "DOWN", 5_000), 1, 1e-9));

// ⛔ THE EQUIVALENCE CHECK. Every figure a player is shown must be `payoutFor` — the same call
// `projectedPayout` and settlement make — or the screen and the wallet can disagree.
{
  let mismatches = 0, checked = 0, floorBreaches = 0;
  for (const rates of [LIVE, CAPPED]) {
    for (const up of [0, 1_000, 12_500, 90_000, 1_000_000]) {
      for (const down of [0, 1_000, 12_500, 90_000, 1_000_000]) {
        for (const stake of [1_000, 2_000, 47_500, 1_000_000]) {
          for (const side of ["UP", "DOWN"] as const) {
            checked++;
            const m = impliedMultiplier(P(up, down, rates), side, stake);
            const truth = payoutFor(
              { yesPool: up, noPool: down, side: side === "UP" ? "YES" : "NO", stake },
              rates,
            ).payout;
            if (m == null || Math.abs(m * stake - truth) > 1) mismatches++;
            // Invariant 1: a winner is never quoted below stake, under either model.
            if (m != null && m < 1) floorBreaches++;
          }
        }
      }
    }
  }
  ok(`1.7 across ${checked} pool/stake/side/model combinations the shown figure IS payoutFor's`,
     mismatches === 0, `${mismatches} disagreed`);
  ok("1.8 …and not one of them quotes a winner below their own stake", floorBreaches === 0,
     `${floorBreaches} below 1.00×`);
  ok("1.9 …and `projectedReturn` is the same call, so the confirm panel and the receipt cannot differ",
     projectedReturn(P(90_000, 10_000), "DOWN", 2_000) ===
       Math.round(2_000 * (impliedMultiplier(P(90_000, 10_000), "DOWN", 2_000) as number)));
}

// The operator's display switch, and the honest-nothing cases.
ok("1.10 `show: false` hides the estimate entirely rather than printing a default",
   impliedMultiplier(P(90_000, 10_000, LIVE, false), "UP", 2_000) === null &&
   projectedReturn(P(90_000, 10_000, LIVE, false), "UP", 2_000) === null);
ok("1.11 a zero / non-finite stake yields null, never `0` or `Infinity`",
   impliedMultiplier(P(90_000, 10_000), "UP", 0) === null &&
   impliedMultiplier(P(90_000, 10_000), "UP", Number.NaN) === null);
// ⛔ THE FUNCTION MUST BE TOTAL. It runs inside a client render, where a throw blanks the card
// and a `NaN` prints as `TZS NaN` on a money surface.
// ⚠️ AND THIS CHECK WAS WRITTEN WRONG FIRST, WHICH IS WORTH KEEPING. It tried to construct a
// rate set that makes `assertWinnerFloor` throw — and there isn't one: `readRates` clamps both
// `feeCeilingRate` and the loser-share rate to 1.0, and the floor holds at or below that. It was
// asserting an unreachable branch and therefore proving nothing. What IS reachable, and what a
// player could actually meet, is hostile DATA — so that is what is driven.
{
  const hostile: Array<[number, number]> = [
    [-1, -1], [Number.NaN, 1_000], [1_000, Number.NaN], [Infinity, 1_000], [1_000, Infinity],
    [0, Number.MAX_SAFE_INTEGER], [Number.MAX_SAFE_INTEGER, 0],
  ];
  const rateSets: UpDownRates[] = [
    LIVE, CAPPED,
    { ...LIVE, platformFeeRate: Number.NaN, operatorFeeRate: Number.NaN },
    { ...CAPPED, commissionRate: 99, feeCeilingRate: 99 },
    { ...CAPPED, commissionRate: -5, feeCeilingRate: -5 },
  ];
  let threw = 0, bad = 0, checked = 0;
  for (const [up, down] of hostile) {
    for (const rates of rateSets) {
      for (const stake of [1_000, 1_000_000, Number.MAX_SAFE_INTEGER]) {
        for (const side of ["UP", "DOWN"] as const) {
          checked++;
          try {
            const m = impliedMultiplier(P(up, down, rates), side, stake);
            if (m != null && (!Number.isFinite(m) || m <= 0)) bad++;
          } catch { threw++; }
        }
      }
    }
  }
  ok(`1.12 over ${checked} hostile pool/rate/stake combinations it never throws`, threw === 0, `${threw} threw`);
  ok("1.13 …and never returns NaN, Infinity or a non-positive multiple", bad === 0, `${bad} unusable`);
}

// ── §2. THE EMPTY SIDE, AND WHOSE WARNING IT IS ──────────────────────────────────────────
console.log("\n§2 · an empty side is named — and the player FILLING it is not warned about it");
ok("2.1 UP 36,000 / DOWN 0 ⇒ the empty side is DOWN", emptySideOf(P(36_000, 0)) === "DOWN");
ok("2.2 UP 0 / DOWN 36,000 ⇒ the empty side is UP", emptySideOf(P(0, 36_000)) === "UP");
ok("2.3 an untouched round ⇒ BOTH", emptySideOf(P(0, 0)) === "BOTH");
ok("2.4 a two-sided round ⇒ no empty side at all", emptySideOf(P(1, 1)) === null);
// ⭐ The distinction the whole D2 copy rests on.
ok("2.5 on UP 36,000 / DOWN 0 the UP backer IS warned that DOWN must fill",
   refundWarningFor(P(36_000, 0), "UP") === "DOWN");
ok("2.6 …and the DOWN backer — who is filling it — is NOT warned",
   refundWarningFor(P(36_000, 0), "DOWN") === null);
ok("2.7 an untouched round warns whichever side you take",
   refundWarningFor(P(0, 0), "UP") === "BOTH" && refundWarningFor(P(0, 0), "DOWN") === "BOTH");
ok("2.8 a two-sided round warns nobody",
   refundWarningFor(P(5_000, 5_000), "UP") === null && refundWarningFor(P(5_000, 5_000), "DOWN") === null);
// ⛔ The display switch must NOT be able to suppress a fact about the round.
ok("2.9 `show: false` still names the empty side — it gates the estimate, not the truth",
   emptySideOf(P(36_000, 0, LIVE, false)) === "DOWN" &&
   refundWarningFor(P(36_000, 0, LIVE, false), "UP") === "DOWN");

// ── §3. NO MULTIPLE IS PRINTED — THE PRINTER ITSELF IS GONE ──────────────────────────────
// ⛔ RESTATED 2026-10-14. This section held `formatMultiplier`'s floor (a printed `× N` was never rounded UP). The
// owner's ruling took every printed multiple off Up & Down, and the printer went with the last surface that called it,
// so the truth to hold is that it stays gone: no export to call, and no Up & Down component spelling a `×` in its code.
console.log("\n§3 · the ruling of 2026-10-14 — nothing prints a multiple, and nothing CAN without a new ruling");
ok("3.1 the pricing module exports no multiple-printer (`formatMultiplier` was deleted with its last caller)",
   !("formatMultiplier" in pricingModule), Object.keys(pricingModule).join(", "));
{
  const SURFACES: Array<[string, string]> = [["card", cardCode], ["controls", controlsCode], ["panel", panelCode], ["receipt", receiptCode]];
  for (const [name, code] of SURFACES) {
    ok(`3.2 the ${name} spells no "×" anywhere in its code — no \`× {figure}\`, no "×" literal`,
       !code.includes("×"), (code.match(/.{0,50}×.{0,30}/) ?? [""])[0]);
    ok(`3.3 …and calls no multiple-printer`, !/formatMultiplier\s*\(/.test(code));
  }
}

// ── §4. THE SERVER SENDS THE POOL, NOT A CONSTANT ────────────────────────────────────────
console.log("\n§4 · the board ships the RAW pools and the round's FROZEN rates");
ok("4.1 `BoardRound` declares `pricing`", /\n\s*pricing:\s*UpDownPricing/.test(board));
ok("4.2 `toBoardRound` fills it from the market's own pools",
   /upPool:\s*m\.yesPool/.test(toBoardRound) && /downPool:\s*m\.noPool/.test(toBoardRound),
   "raw shillings — `upPct` is rounded to an integer and cannot tell 0 from 400");
ok("4.3 …with the round's FROZEN snapshot, never live config",
   /rates:\s*\{[\s\S]{0,400}?feeModel:\s*rates\.feeModel/.test(toBoardRound));
ok("4.4 …and the operator's display switch is carried through, not assumed",
   /show:\s*rates\.showEstimatedWinnings\s*===\s*true/.test(toBoardRound));
// ⛔ THE DEFECT ITSELF: the flat headline must no longer reach a player surface.
// ⚠️ READ THE STRIPPED SOURCE. This check FAILED on its first green run — on the field comment
// that explains what `estMultiplier` was and why it went. §0.1a's rule, met for the second time
// in one session: never match on words the code's own documentation will contain.
ok("4.5 the board no longer derives a multiplier from `estimatedWinningsRate`",
   !/estMultiplier/.test(stripComments(board)) &&
   !/1\s*\+\s*rates\.estimatedWinningsRate/.test(stripComments(board)));

// ── §5. THE CHOICES SAY UP AND DOWN; THE COMMIT STATES THE POOL'S MONEY ──────────────────
console.log("\n§5 · the card and the controls quote nothing; the confirm panel and the receipt keep the pool's projection");
for (const [name, code] of [["card", cardCode], ["controls", controlsCode], ["panel", panelCode]] as const) {
  ok(`5.${name === "card" ? 1 : name === "controls" ? 2 : 3}a the ${name} carries no \`estMultiplier\` any more`,
     !/estMultiplier/.test(code));
}
// ⛔ RESTATED 2026-10-14 · 5.5–5.7 required each button to be priced (`impliedMultiplier` per side). The ruling inverts
// them: a choice that computes a multiple is one render away from printing it, so neither file may compute one.
ok("5.5 the card computes NO multiple — no `impliedMultiplier(` on the board card (the owner's ruling of 2026-10-14)",
   !/impliedMultiplier\s*\(/.test(cardCode));
ok("5.6 …nor do the shared quick-bet controls (the board's authed card and the round page's two-way control)",
   !/impliedMultiplier\s*\(/.test(controlsCode));
/**
 * Each solid side button's CHILDREN, as written: the leading glyph (or the in-flight spinner) and the side's word,
 * and nothing else. The button's open tag is read with a small balanced reader rather than `[^>]*`, because an inline
 * handler (`onClick={() => bet.place("UP")}`) carries a `>` before the class (the lesson `test:contrast` §P-u2 and
 * `test:tap-target` §0 each paid for).
 */
function sideButtonBodies(code: string): Array<{ side: "yes" | "no"; body: string }> {
  const out: Array<{ side: "yes" | "no"; body: string }> = [];
  for (const m of code.matchAll(/<button(?=[\s/>])/g)) {
    let i = (m.index ?? 0) + 7, depth = 0, quote = "";
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) { if (c === quote) quote = ""; continue; }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const open = code.slice(m.index ?? 0, i);
    const fam = /\bbtn-(yes|no)\b/.exec(open)?.[1] as "yes" | "no" | undefined;
    if (!fam) continue;
    const close = code.indexOf("</button>", i);
    if (close > i) out.push({ side: fam, body: code.slice(i + 1, close) });
  }
  return out;
}
const GLYPH_OR_SPINNER = /\{bet\.pendingSide === "(?:UP|DOWN)" \? <Spinner size=\{12\} \/> : <I\.trending(?:Up|Down) [^}]*\}[^}]*\} \/>\}|<I\.trending(?:Up|Down) [^>]*\/>/g;
// `{ }` is what a stripped JSX comment (`{/* … */}`) leaves behind; `{" "}` is an explicit space.
const wordOnly = (b: { side: "yes" | "no"; body: string }) =>
  b.body.replace(GLYPH_OR_SPINNER, "").replace(/\{\s*\}/g, "").replace(/\{"\s*"\}/g, "").replace(/\s+/g, "") ===
  (b.side === "yes" ? "{t.market.udUp}" : "{t.market.udDown}");
{
  const cardButtons = sideButtonBodies(cardCode);
  const controlButtons = sideButtonBodies(controlsCode);
  ok("5.7 the card's two signed-out buttons hold the glyph and the side's word and NOTHING else",
     cardButtons.length === 2 && cardButtons.every(wordOnly), JSON.stringify(cardButtons.map((b) => b.body.trim().slice(0, 140))));
  ok("5.7b …and so do the two buttons of the shared controls",
     controlButtons.length === 2 && controlButtons.every(wordOnly), JSON.stringify(controlButtons.map((b) => b.body.trim().slice(0, 160))));
  // ⛔ The population: 2 + 2 or the checks above pass over nothing.
  ok("5.7c CONTROL · the reader finds exactly the four side buttons (2 on the card, 2 in the controls)",
     cardButtons.length === 2 && controlButtons.length === 2, `${cardButtons.length} + ${controlButtons.length}`);
  ok("5.7d CONTROL · a button carrying a multiple is NOT word-only (the reader can fail)",
     !wordOnly({ side: "yes", body: ` <I.trendingUp s={14} edge="start" className={GLYPH_NO_SHRINK} /> {t.market.udUp}\n<span className="font-mono text-[12.5px]">× 1.26</span>` }));
}
ok("5.8 the round page's confirm panel projects the return from the POOL, not a rate",
   /projectedReturn\(/.test(panelCode) && !/bet\.stake\s*\*\s*est/.test(panelCode));
ok("5.8b …and states it in shillings only: no multiple computed or printed beside it",
   !/impliedMultiplier\s*\(/.test(panelCode) && !panelCode.includes("×"));
// ⭐ The qualifier travels with the FIGURE — the receipt's own gate — so it never stands under a panel that states none
// (the display switch off, or a custom amount not yet usable: the field reads "—"). §8.4 renders the switch-off half;
// the not-yet-usable half is hook state a server render cannot reach, so the gate itself is read here.
ok("5.8c …and its qualifier line is gated on the figure itself (`projected != null`), as the receipt's footnote is",
   /\{projected != null && \(\s*<p className="mt-2 flex items-start gap-1 text-body-sm leading-\[1\.45\] text-text-faint">\s*<I\.info s=\{11\} className="mt-\[2px\] shrink-0" \/>\s*<span>\{noticeBody\(t\.market\.udEstimateNote\)\}<\/span>/.test(panelCode));
ok("5.9 the empty-side sentence is on the board card", /emptySideOf\(|refundWarningFor\(/.test(cardCode));
ok("5.10 …and on the shared quick-bet controls", /emptySideOf\(|refundWarningFor\(/.test(controlsCode));
ok("5.11 …and on the round page's stake panel, scoped to the side the player locked",
   /refundWarningFor\(\s*pricing\s*,\s*lockedSide/.test(panelCode),
   "the panel knows the side, so it must use the side-aware rule, not the round-wide one");
// ⚠️ 2026-08-07 · the round page now routes the stake surface through UD-2's
// `RoundActionPanel`, so its pricing rides the `stakePanel` object (`pricing:
// round.pricing`) instead of a direct JSX prop. Same server object, new plumbing.
ok("5.12 both pages hand the surfaces the server's pricing object",
   /pricing=\{r\.pricing\}/.test(read(BOARD_PAGE)) && /pricing:\s*round\.pricing/.test(read(ROUND_PAGE)));
// ⛔ The client must never re-derive the money. One rule, one answer (this is how `myExactPayout`
// was nearly shipped wrong).
ok("5.13 no surface re-implements the fee — they all call the shared module",
   !/payoutFor\(|poolFee\(/.test(cardCode + controlsCode + panelCode + receiptCode));
// ⭐ What the ruling deliberately KEEPS: the money at the commit (CLAUDE.md "UX commitments").
ok("5.14 the bet receipt keeps its projected return — the shared function at the amount actually staked, labelled, qualified",
   /impliedMultiplier\(pricing, placed\.side, placed\.amount\)/.test(receiptCode)
   && /label: t\.market\.udRcProjected/.test(receiptCode)
   && /footnote=\{projected != null \? t\.market\.udEstimateNote : undefined\}/.test(receiptCode));

// ── §6. THE COPY EXISTS IN ALL THREE LANGUAGES ───────────────────────────────────────────
console.log("\n§6 · trilingual, and the qualifier names the figure it qualifies");
for (const key of ["udNobodyBacked", "udNobodyBackedEither"]) {
  const n = (dict.match(new RegExp(`${key}:\\s*"`, "g")) ?? []).length;
  ok(`6.${key === "udNobodyBacked" ? 1 : 2} \`${key}\` is defined in EN, SW and ZH`, n === 3, `${n} definitions`);
}
ok("6.3 the empty-side sentence names the side through a placeholder, so grammar survives SW/ZH",
   /udNobodyBacked:\s*"[^"]*\{side\}/.test(dict));
ok("6.4 …and it states the consequence, not merely the fact",
   /udNobodyBacked:\s*"[^"]*stake comes back/.test(dict));
// ⚠️ The old note said "× figures are pool estimates" underneath a config constant. Now that it
// IS the pool, the note has to own the other half: it MOVES.
ok("6.5 the estimate note tells the player the figure moves with every later bet",
   /udEstimateNote:\s*"[^"]*moves with every bet/i.test(dict));
ok("6.6 …and that the lock replaces it with the exact payout",
   /udEstimateNote:\s*"[^"]*exact payout/i.test(dict));
// ⭐ 2026-10-14 · the note opened on "×", the multiple the buttons printed. Nothing prints one now, so it must name what
// it qualifies — the projected return, in the very words the receipt's row uses — in every language.
for (const loc of ["en", "sw", "zh"] as const) {
  const note = DICTS[loc].market.udEstimateNote;
  const name = DICTS[loc].market.udRcProjected;
  ok(`6.7.${loc} the note no longer opens on "×" and names the projected return as its row does ("${name}")`,
     !note.includes("×") && note.toLowerCase().includes(name.toLowerCase()), note);
}
// ⭐ "…and wherever this should be reflected as well": the BINDING Up & Down rules said "The displayed multiplier reflects
// the live pools". Nothing displays one now, so §2 names the projected return — and the document's version moved with it.
{
  const rules = stripComments(read("src/app/legal/rules/_content-up-down.tsx"));
  const RULE: Record<"en" | "sw" | "zh", [string, RegExp]> = {
    en: ["The projected return moves.", /multiplier/i],
    sw: ["Marejesho yanayotarajiwa hubadilika.", /kizidishi/i],
    zh: ["预计回报会变动。", /倍数/],
  };
  for (const loc of ["en", "sw", "zh"] as const) {
    ok(`6.8.${loc} the binding Up & Down rules describe no displayed multiplier and name the projected return ("${RULE[loc][0]}")`,
       rules.includes(RULE[loc][0]) && !RULE[loc][1].test(rules), (rules.match(RULE[loc][1]) ?? [""])[0]);
  }
  const meta = read("src/app/legal/rules/up-down/page.tsx");
  const versions = [...meta.matchAll(/(?:Version|Toleo|版本) (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  ok("6.9 …and the document's version moved with its words: en/sw/zh each at 2026-10-14 or later",
     versions.length === 3 && versions.every((v) => v >= "2026-10-14"), versions.join(" · "));
  // ⭐ 2026-10-14, the same day · the ruling's Swahili carried S4-COPY-AUDIT's class-10 agreement error forward. "Dau" is
  // ma-class in the plural ("madau"), so the clause agrees in ya-: "Madau yakifungwa" (the qualifier) and "…hadi madau
  // yatakapofungwa" (Rules §2). Read on the dictionary value and the comment-free rulebook, both directions.
  const swNote = DICTS.sw.market.udEstimateNote;
  ok("6.10 the Swahili qualifier says \"Madau yakifungwa\" (class 6), never the class-10 \"Dau zikifungwa\"",
     swNote.includes("Madau yakifungwa, yanakuwa malipo yako kamili.") && !/\bdau zikifungwa\b/i.test(swNote), swNote);
  ok("6.11 …and the binding Rules §2 in Swahili says \"Si ahadi hadi madau yatakapofungwa.\", never \"dau zitakapofungwa\"",
     rules.includes("Si ahadi hadi madau yatakapofungwa.") && !/\bdau zitakapofungwa\b/i.test(rules),
     (rules.match(/Si ahadi hadi[^.<]*\./) ?? ["(no §2 sentence)"])[0]);
}

// ── §7. RG — INFORMATION, NOT PROMOTION ──────────────────────────────────────────────────
console.log("\n§7 · G5 — a big projection means the other side is THIN; nothing may celebrate it");
{
  // The projected return and the empty-side line must not reach for the celebration ink or grow.
  // Gold is earned money on this platform (DESIGN_AUTHORITY §M3).
  // ⛔ RESTATED 2026-10-14 · 7.1/7.2 read the `× N` spans on the buttons; the ruling removed them, so the figure left to
  // hold is the confirm panel's projected return.
  const goldNearProjection = /formatTzs\(projected\)[^<]{0,200}(gold|--gold)/.test(panelCode)
    || /(gold|--gold)[^<]{0,200}formatTzs\(projected\)/.test(panelCode);
  ok("7.1 no gold anywhere near the projected return", !goldNearProjection);
  const muted = panelCode.match(/<span className="amount text-body-sm font-semibold text-text-muted">\{formatTzs\(projected\)\}<\/span>/g) ?? [];
  ok("7.2 the projection keeps the muted 13px it always had — no size escalation, no bold, no gold on the span itself",
     muted.length === 1, `found ${muted.length}, want 1`);
  ok("7.3 the empty-side line is faint informational ink, not an alarm and not a celebration",
     /text-text-faint[\s\S]{0,400}(udNobodyBacked|emptyCopy|warnCopy)|(udNobodyBacked|emptyCopy|warnCopy)[\s\S]{0,400}text-text-faint/.test(controlsCode));
  ok("7.4 no surface brands a big figure — no 'big win', 'jackpot' or 'boost' copy",
     !/bigWin|jackpot|udBoost|🔥/i.test([cardCode, controlsCode, panelCode].join("\n")));
}

// ── §8. RENDERED — WHAT A PLAYER READS, IN THREE LANGUAGES ───────────────────────────────
// ⭐ The standards' §5b rule 9 used to locate the empty side by its pari-mutuel signature on the card: a side quoted at
// exactly 1.00×. The ruling took the quotes away, so that signature is gone from the screen. The INVARIANT is unchanged
// and is now read from the pools themselves: the sentence appears iff `emptySideOf(pricing)` names a side — and on the
// card that is iff its split row states no two-sided price. Both directions are checked: absent on a one-sided round is
// a refund nobody was told about; present on a two-sided round is a lie.
console.log("\n§8 · rendered: the choices read Up and Down only, the commit keeps its money, the empty side is said iff it is true");
{
  const { UpDownCard } = await import("../src/components/updown/updown-card.tsx");
  const { RoundStakePanel } = await import("../src/components/updown/round-stake-panel.tsx");
  const { I18nProvider } = await import("../src/lib/i18n.tsx");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
  const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
  const NOW = Date.UTC(2026, 9, 14, 9, 0);
  const MIN = 60_000;
  const LOCALES = ["en", "sw", "zh"] as const;
  type Loc = (typeof LOCALES)[number];
  const POOLS: Array<[string, number, number]> = [["two-sided", 6_000, 2_000], ["down-empty", 3_000, 0], ["up-empty", 0, 3_000], ["empty", 0, 0]];
  const wrap = (loc: Loc, el: ReturnType<typeof createElement>) => renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router as never }, createElement(I18nProvider, { initial: loc }, el)));
  const cardProps = (pricing: UpDownPricing, authed: boolean) => ({
    roundId: "udr_rule", assetName: "Bitcoin", assetTicker: "BTC", assetIcon: "crypto", durationMinutes: 30, decimals: 2,
    livePrice: 85_010, openPrice: 85_000, upTarget: 85_000.02, downTarget: 84_999.98, movePct: 0.01,
    closesAtMs: NOW + 36 * MIN, selectionClosesAtMs: NOW + 30 * MIN, serverNowMs: NOW,
    volumeTzs: pricing.upPool + pricing.downPool, players: (pricing.upPool > 0 ? 3 : 0) + (pricing.downPool > 0 ? 2 : 0),
    pricing, state: "open", sourceClass: "crypto", sourceQuotedAt: new Date(NOW - 30_000).toISOString(),
    ...(authed ? { isAuthed: true, marketId: "mkt_rule", minStake: 500, maxStake: 1_000_000, walletBalance: 50_000 } : {}),
  });
  const panelProps = (pricing: UpDownPricing, lockedSide: "UP" | "DOWN" | null) => ({
    marketId: "mkt_rule", isAuthed: true, minStake: 500, maxStake: 1_000_000, myUpStake: 0, myDownStake: 0,
    pricing, assetName: "Bitcoin", signInHref: "/auth/login", lockedSide, walletBalance: 50_000,
    selectionClosesAtMs: NOW + 30 * MIN, serverNowMs: NOW,
  });
  // ⚠️ A tag becomes NOTHING, not a space: the notice body holds its phrases in nowrap spans (`noticeBody`), and in
  // Chinese a span boundary sits between two characters — a space there would split the sentence the check looks for.
  const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  /** The HTML without every paragraph whose text holds `sentence` — the empty-side note, as a plant removes it. */
  const dropParagraphsWith = (html: string, sentence: string) =>
    html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, (p) => (text(p).includes(sentence) ? "" : p));
  const sides = (html: string) => [...html.matchAll(/<button[^>]*class="btn btn-(yes|no)\b[^"]*"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ side: m[1] as "yes" | "no", text: text(m[2]) }));
  /** The sentence the rule expects for these pools in this language, or null. */
  const expectedSentence = (loc: Loc, empty: ReturnType<typeof emptySideOf>) => {
    const t = DICTS[loc].market;
    return empty === "BOTH" ? t.udNobodyBackedEither
      : empty === "UP" ? t.udNobodyBacked.replace("{side}", t.udUp)
      : empty === "DOWN" ? t.udNobodyBacked.replace("{side}", t.udDown)
      : null;
  };
  const allSentences = (loc: Loc) => [expectedSentence(loc, "BOTH"), expectedSentence(loc, "UP"), expectedSentence(loc, "DOWN")] as string[];
  // The old note's core, in each language — present in the old sentence and in the new one, so a card carrying EITHER fails.
  const NOTE_CORE: Record<Loc, string> = { en: "moves with every bet", sw: "hubadilika kwa kila dau jipya", zh: "随每一笔新投注变动" };

  /** Every defect of one rendered CHOICE surface (a card or the two-way control) against the rule. */
  function choiceDefects(loc: Loc, html: string, pricing: UpDownPricing, isCard: boolean): string[] {
    const d: string[] = [];
    const t = DICTS[loc].market;
    const all = text(html);
    const btns = sides(html);
    if (btns.length !== 2) d.push(`${btns.length} side buttons, want 2`);
    for (const b of btns) {
      const want = b.side === "yes" ? t.udUp : t.udDown;
      if (b.text !== want) d.push(`the ${b.side === "yes" ? "Up" : "Down"} button reads "${b.text}", want "${want}" only`);
    }
    if (/×/.test(all)) d.push(`a "×" is printed: …${(all.match(/.{0,30}×.{0,20}/) ?? [""])[0]}…`);
    if (all.includes(NOTE_CORE[loc]) || all.includes(t.udEstimateNote)) d.push("the estimate note is on a choice surface");
    const want = expectedSentence(loc, emptySideOf(pricing));
    if (want != null && !all.includes(want)) d.push(`the empty-side sentence is missing: "${want}"`);
    for (const s of allSentences(loc)) if (s !== want && all.includes(s)) d.push(`a false empty-side sentence is shown: "${s}"`);
    if (isCard) {
      // The card's own split row must agree: a two-sided price iff no side is empty.
      const split = html.slice(html.indexOf('<div class="ud-split">'), html.indexOf('<div class="ud-prices">'));
      const twoSidedPrice = /\d%/.test(text(split));
      const sentenceShown = allSentences(loc).some((s) => all.includes(s));
      if (twoSidedPrice === sentenceShown) d.push(`the split row (${twoSidedPrice ? "a two-sided price" : "no price"}) and the empty-side sentence (${sentenceShown ? "shown" : "absent"}) disagree`);
    }
    return d;
  }

  /** Every defect of the locked-side confirm panel: the pool's money, in shillings only, qualified, side-aware. */
  function panelDefects(loc: Loc, html: string, pricing: UpDownPricing, side: "UP" | "DOWN"): string[] {
    const d: string[] = [];
    const t = DICTS[loc].market;
    const all = text(html);
    if (/×/.test(all)) d.push(`a "×" is printed beside the projection: …${(all.match(/.{0,30}×.{0,20}/) ?? [""])[0]}…`);
    const stakeShown = Number((html.match(/<span class="font-mono text-\[16px\] font-bold tabular-nums text-text">([\d,]+)<\/span>/)?.[1] ?? "").replace(/,/g, ""));
    const projectedShown = html.match(/<span class="amount text-body-sm font-semibold text-text-muted">([^<]+)<\/span>/)?.[1] ?? null;
    if (!(stakeShown > 0)) d.push("no stake is shown");
    const want = projectedReturn(pricing, side, stakeShown);
    if (pricing.show) {
      if (projectedShown !== (want == null ? null : formatTzs(want))) d.push(`the projection reads ${projectedShown}, the pool says ${want == null ? "none" : formatTzs(want)}`);
      if (!all.includes(t.udEstimateNote)) d.push("the projection's qualifier is missing");
    } else {
      if (projectedShown != null) d.push(`a projection is shown with the display switch off: ${projectedShown}`);
      if (all.includes(t.udEstimateNote)) d.push("the qualifier is shown under a panel that states no projection");
    }
    const warn = expectedSentence(loc, refundWarningFor(pricing, side));
    if (warn != null && !all.includes(warn)) d.push(`the side-aware warning is missing: "${warn}"`);
    for (const s of allSentences(loc)) if (s !== warn && all.includes(s)) d.push(`a false warning is shown: "${s}"`);
    return d;
  }

  const renders: Array<{ what: string; loc: Loc; pricing: UpDownPricing; html: string; kind: "card" | "choice" | "panel"; side?: "UP" | "DOWN" }> = [];
  let renderError = "";
  try {
    for (const loc of LOCALES) {
      for (const [shape, up, down] of POOLS) {
        for (const show of [true, false]) {
          const pricing = P(up, down, LIVE, show);
          const tag = `${loc}/${shape}/show=${show}`;
          renders.push({ what: `card signed out ${tag}`, loc, pricing, kind: "card", html: wrap(loc, createElement(UpDownCard, cardProps(pricing, false) as never)) });
          renders.push({ what: `card signed in ${tag}`, loc, pricing, kind: "card", html: wrap(loc, createElement(UpDownCard, cardProps(pricing, true) as never)) });
          renders.push({ what: `two-way control ${tag}`, loc, pricing, kind: "choice", html: wrap(loc, createElement(RoundStakePanel, panelProps(pricing, null) as never)) });
          for (const side of ["UP", "DOWN"] as const) {
            renders.push({ what: `confirm panel ${side} ${tag}`, loc, pricing, kind: "panel", side, html: wrap(loc, createElement(RoundStakePanel, panelProps(pricing, side) as never)) });
          }
        }
      }
    }
  } catch (e) {
    renderError = String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ");
  }
  ok(`8.0 the card, the two-way control and the confirm panel render on the server (${renders.length} renders)`,
     renderError === "" && renders.length === LOCALES.length * POOLS.length * 2 * 5, renderError || `${renders.length}`);

  const defectsOf = (r: (typeof renders)[number], html = r.html) =>
    r.kind === "panel" ? panelDefects(r.loc, html, r.pricing, r.side!) : choiceDefects(r.loc, html, r.pricing, r.kind === "card");
  const bad = renders.flatMap((r) => defectsOf(r).map((x) => `${r.what}: ${x}`));
  const choices = renders.filter((r) => r.kind !== "panel");
  const panels = renders.filter((r) => r.kind === "panel");
  ok(`8.1 every choice surface reads "${DICTS.en.market.udUp}"/"${DICTS.en.market.udDown}" (and "${DICTS.sw.market.udUp}"/"${DICTS.sw.market.udDown}", "${DICTS.zh.market.udUp}"/"${DICTS.zh.market.udDown}") and nothing else — no "×", no estimate note (${choices.length} renders)`,
     choices.every((r) => !choiceDefects(r.loc, r.html, r.pricing, r.kind === "card").some((x) => /button|×|estimate note|side buttons/.test(x))),
     bad.filter((x) => /button|×|estimate note|side buttons/.test(x)).slice(0, 4).join(" · "));
  ok("8.2 the empty-side sentence appears iff the pools leave a side empty — and names that side — on every card and control",
     choices.every((r) => !choiceDefects(r.loc, r.html, r.pricing, r.kind === "card").some((x) => /empty-side sentence/.test(x))),
     bad.filter((x) => /empty-side sentence/.test(x)).slice(0, 4).join(" · "));
  ok("8.3 …and on the card it agrees with the split row: a two-sided price iff no sentence",
     choices.every((r) => !choiceDefects(r.loc, r.html, r.pricing, r.kind === "card").some((x) => /split row/.test(x))),
     bad.filter((x) => /split row/.test(x)).slice(0, 4).join(" · "));
  ok(`8.4 the confirm panel states the pool's projected return in shillings, qualified, with no multiple, side-aware (${panels.length} renders)`,
     panels.every((r) => defectsOf(r).length === 0),
     bad.filter((x) => /confirm panel/.test(x)).slice(0, 4).join(" · "));
  // ⛔ THE POPULATION — each state the rule distinguishes was actually rendered, or 8.2 passes over nothing.
  const shownOnce = (pred: (r: (typeof renders)[number]) => boolean) => renders.filter(pred).length;
  ok("8.5 CONTROL · the renders cover a sentence shown (one-sided, empty) AND withheld (two-sided), in every language",
     LOCALES.every((loc) =>
       shownOnce((r) => r.loc === loc && r.kind === "card" && allSentences(loc).some((s) => text(r.html).includes(s))) >= 6
       && shownOnce((r) => r.loc === loc && r.kind === "card" && !allSentences(loc).some((s) => text(r.html).includes(s))) >= 2));

  // ⭐ PLANTED DEFECTS — each must be REPORTED by the same reader, or 8.1–8.4 cannot fail.
  const pick = (what: string) => renders.find((r) => r.what === what)!;
  const twoOut = pick("card signed out en/two-sided/show=true");
  const oneIn = pick("card signed in sw/down-empty/show=true");
  const panelUp = pick("confirm panel UP zh/two-sided/show=true");
  const plantMultiple = twoOut.html.replace(/(<button[^>]*class="btn btn-yes[^"]*"[^>]*>[\s\S]*?)(<\/button>)/, `$1<span class="font-mono text-[12.5px]">× 1.26</span>$2`);
  ok("8.1′ PLANT · a multiple put back on the signed-out Up button is reported",
     plantMultiple !== twoOut.html && defectsOf(twoOut, plantMultiple).some((x) => /Up button reads|×/.test(x)), defectsOf(twoOut, plantMultiple).join(" · "));
  const oldNote = `<p class="flex items-start gap-1">× ${DICTS.en.market.udEstimateNote.slice(DICTS.en.market.udEstimateNote.indexOf("moves"))}</p>`;
  const plantNote = twoOut.html.replace("</article>", `${oldNote}</article>`);
  ok("8.1″ PLANT · the old estimate note under the buttons is reported", defectsOf(twoOut, plantNote).some((x) => /estimate note|×/.test(x)));
  const sw = DICTS.sw.market;
  const swDownEmpty = sw.udNobodyBacked.replace("{side}", sw.udDown);
  const plantDropped = dropParagraphsWith(oneIn.html, swDownEmpty);
  ok("8.2′ PLANT · the sentence dropped from a one-sided card is reported",
     plantDropped !== oneIn.html && defectsOf(oneIn, plantDropped).some((x) => /missing/.test(x)), defectsOf(oneIn, plantDropped).join(" · "));
  const plantFalse = twoOut.html.replace("</article>", `<p>${DICTS.en.market.udNobodyBacked.replace("{side}", DICTS.en.market.udDown)}</p></article>`);
  ok("8.2″ PLANT · the sentence shown on a two-sided card is reported (the lie a presence check never sees)",
     defectsOf(twoOut, plantFalse).some((x) => /false empty-side sentence|disagree/.test(x)), defectsOf(twoOut, plantFalse).join(" · "));
  const plantPanelMult = panelUp.html.replace(/(<span class="amount text-body-sm font-semibold text-text-muted">[^<]+<\/span>)/, `$1<span class="font-mono text-[11px] tabular-nums text-text-faint">× 1.26</span>`);
  ok("8.4′ PLANT · the card's multiple put back beside the confirm panel's projection is reported",
     plantPanelMult !== panelUp.html && defectsOf(panelUp, plantPanelMult).some((x) => /×/.test(x)));
  const plantPanelRate = panelUp.html.replace(/(<span class="amount text-body-sm font-semibold text-text-muted">)[^<]+(<\/span>)/, `$1${formatTzs(750)}$2`);
  ok("8.4″ PLANT · a projection that is not the pool's (stake × 1.5) is reported",
     plantPanelRate !== panelUp.html && defectsOf(panelUp, plantPanelRate).some((x) => /pool says/.test(x)), defectsOf(panelUp, plantPanelRate).join(" · "));
}

console.log(`\nupdown-pricing: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error(`\n✗ ${fails.length} failed:\n${fails.map((f) => `   · ${f}`).join("\n")}\n`);
  process.exit(1);
}
console.log("✓ the choices say Up and Down only; what a player is shown at the commit is what the money path would pay.\n");
