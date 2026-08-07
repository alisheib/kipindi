/**
 * D2 — THE HONEST MULTIPLIER AND THE EMPTY-SIDE STATE.
 *
 * 🔴 WHAT THIS GUARDS. The Up & Down card printed a flat `× 1.5 est.` on BOTH buttons.
 * `estimatedWinningsRate` is a config constant, so the figure read **identically when the other
 * side held TZS 36,000 and when it held nothing** — and the disclaimer beneath it already
 * claimed it was pool-derived. On a pari-mutuel game that conceals the single strongest reason
 * to take the thin side, and the thin side is **43% of every stake this product has refunded**.
 *
 * Measured on the real rates: a round holding UP 36,000 / DOWN 0 pays **16.66×** to a DOWN
 * backer and **exactly 1.00×** to an UP backer. Both buttons said 1.5.
 *
 * ⛔ HALF THIS SUITE EXECUTES THE MATH RATHER THAN READING THE SOURCE, on purpose. A
 * source-shape check can only prove a symbol is present; §1–§3 import the module and assert
 * real numbers, including that every figure the player is shown equals what `payoutFor` — the
 * function settlement itself pays with — would return for the same inputs. §4–§7 then check the
 * wiring, which is the only part no arithmetic can reach.
 *
 * ⚠️ Every source check is scoped to a resolved slice and §0 REFUSES TO RUN if one is empty
 * (session 29 shipped six checks that could not fail, session 30 shipped two more).
 *
 *   npm run test:updown-pricing
 */
import { readFileSync } from "node:fs";
import {
  impliedMultiplier, emptySideOf, refundWarningFor, formatMultiplier, projectedReturn,
  type UpDownPricing, type UpDownRates,
} from "../src/lib/updown-pricing.ts";
import { payoutFor } from "../src/lib/payout.ts";

const PRICING = "src/lib/updown-pricing.ts";
const BOARD = "src/lib/server/updown-board.ts";
const CARD = "src/components/updown/updown-card.tsx";
const CONTROLS = "src/components/updown/updown-stake-controls.tsx";
const PANEL = "src/components/updown/round-stake-panel.tsx";
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

console.log("\nUp & Down · D2 — the multiplier is the pool's, and an empty side says so\n");

// ── §0. THE SLICES ────────────────────────────────────────────────────────────────────────
console.log("§0 · the slices this suite reasons over (refuse to measure an empty one)");
const board = read(BOARD);
const cardCode = stripComments(read(CARD));
const controlsCode = stripComments(read(CONTROLS));
const panelCode = stripComments(read(PANEL));
const dict = read(DICT);
const toBoardRound = sliceBraces(board, "async function toBoardRound(");
ok("0.1 `toBoardRound`'s body is locatable", toBoardRound != null);
ok("0.2 …and is substantial", (toBoardRound?.length ?? 0) > 800, `${toBoardRound?.length ?? 0} chars`);
ok("0.3 the card's code survives comment-stripping", cardCode.length > 4000, `${cardCode.length} chars`);
ok("0.4 the controls' code survives comment-stripping", controlsCode.length > 2000, `${controlsCode.length} chars`);
ok("0.5 the panel's code survives comment-stripping", panelCode.length > 2000, `${panelCode.length} chars`);
if (!toBoardRound || cardCode.length < 4000 || controlsCode.length < 2000 || panelCode.length < 2000) {
  console.log(`\nupdown-pricing: ${pass} passed, ${fails.length} failed`);
  console.error("\n✗ THE SLICES DID NOT RESOLVE — every later check would have passed over an empty string.\n");
  process.exit(1);
}

// ── §1. THE NUMBER IS THE POOL'S, AND IT IS THE MONEY PATH'S OWN ─────────────────────────
console.log("\n§1 · the multiplier is computed, not configured — and it equals what settlement pays");

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
  ok("1.9 …and `projectedReturn` is the same call, so the panel and the button cannot differ",
     projectedReturn(P(90_000, 10_000), "DOWN", 2_000) ===
       Math.round(2_000 * (impliedMultiplier(P(90_000, 10_000), "DOWN", 2_000) as number)));
}

// The operator's display switch, and the honest-nothing cases.
ok("1.10 `show: false` hides the multiplier entirely rather than printing a default",
   impliedMultiplier(P(90_000, 10_000, LIVE, false), "UP", 2_000) === null);
ok("1.11 a zero / non-finite stake yields null, never `× 0` or `× Infinity`",
   impliedMultiplier(P(90_000, 10_000), "UP", 0) === null &&
   impliedMultiplier(P(90_000, 10_000), "UP", Number.NaN) === null);
// ⛔ THE FUNCTION MUST BE TOTAL. It runs inside a client render, where a throw blanks the card
// and a `NaN` prints as `× NaN` on a money surface.
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

// ── §3. THE PRINTED FIGURE UNDERSTATES, NEVER OVERSTATES ─────────────────────────────────
console.log("\n§3 · the printed figure floors — a payout estimate is never rounded UP");
ok("3.1 1.996 prints 1.99, not 2.00", formatMultiplier(1.996) === "1.99");
ok("3.2 16.66 prints 16.6 (one decimal past ten)", formatMultiplier(16.666) === "16.6");
ok("3.3 187.9 prints 187 (whole numbers past a hundred)", formatMultiplier(187.9) === "187");
ok("3.4 1.03 prints 1.03 — binary float does not steal the last shilling", formatMultiplier(1.03) === "1.03");
ok("3.5 exactly 1 prints 1.00, so 'your stake back' is legible as a number", formatMultiplier(1) === "1.00");
ok("3.6 a non-finite figure prints an em-dash, never NaN", formatMultiplier(Number.NaN) === "—");
{
  let over = 0;
  for (let i = 0; i < 4_000; i++) {
    const m = 1 + i / 137;
    if (Number(formatMultiplier(m)) > m + 1e-9) over++;
  }
  ok("3.7 …and over 4,000 values not one printed figure exceeds the real one", over === 0, `${over} overstated`);
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

// ── §5. EVERY PLAYER SURFACE READS IT — AND NONE STILL PRINTS A CONSTANT ─────────────────
console.log("\n§5 · card, quick-bet controls and round panel all read the same one function");
for (const [name, code] of [["card", cardCode], ["controls", controlsCode], ["panel", panelCode]] as const) {
  ok(`5.${name === "card" ? 1 : name === "controls" ? 2 : name === "panel" ? 3 : 4}a the ${name} carries no \`estMultiplier\` any more`,
     !/estMultiplier/.test(code));
}
ok("5.5 the card computes a multiplier PER SIDE (the two buttons can now differ)",
   (controlsCode.match(/impliedMultiplier\(/g) ?? []).length >= 2 ||
   /impliedMultiplier\([^)]*side/.test(controlsCode));
ok("5.6 the shared controls render both buttons from it", /impliedMultiplier\(/.test(controlsCode));
ok("5.7 the card's signed-out buttons render from it too", /impliedMultiplier\(/.test(cardCode));
ok("5.8 the round page's stake panel projects the return from the POOL, not a rate",
   /projectedReturn\(/.test(panelCode) && !/bet\.stake\s*\*\s*est/.test(panelCode));
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
   !/payoutFor\(|poolFee\(/.test(cardCode + controlsCode + panelCode));

// ── §6. THE COPY EXISTS IN ALL THREE LANGUAGES ───────────────────────────────────────────
console.log("\n§6 · trilingual, and the disclaimer stops claiming something that was not true");
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

// ── §7. RG — INFORMATION, NOT PROMOTION ──────────────────────────────────────────────────
console.log("\n§7 · G5 — a large multiplier means the other side is THIN; nothing may celebrate it");
{
  // The multiplier spans on the buttons and the empty-side line must not reach for the
  // celebration ink or grow. Gold is earned money on this platform (DESIGN_AUTHORITY).
  const multiplierMarkup = [cardCode, controlsCode, panelCode].join("\n");
  const goldNearMultiplier = /formatMultiplier\([^)]*\)[^<]{0,200}(gold|--gold)/.test(multiplierMarkup)
    || /(gold|--gold)[^<]{0,200}formatMultiplier\(/.test(multiplierMarkup);
  ok("7.1 no gold anywhere near the multiplier", !goldNearMultiplier);
  ok("7.2 the multiplier keeps the muted 12.5px it always had — no size escalation",
     /text-\[12\.5px\][^\n]*opacity-85/.test(controlsCode) || /opacity-85[^\n]*text-\[12\.5px\]/.test(controlsCode));
  ok("7.3 the empty-side line is faint informational ink, not an alarm and not a celebration",
     /text-text-faint[\s\S]{0,400}(udNobodyBacked|emptyCopy|warnCopy)|(udNobodyBacked|emptyCopy|warnCopy)[\s\S]{0,400}text-text-faint/.test(controlsCode));
  ok("7.4 no surface brands a big multiplier — no 'big win', 'jackpot' or 'boost' copy",
     !/bigWin|jackpot|udBoost|🔥/i.test(multiplierMarkup));
}

console.log(`\nupdown-pricing: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error(`\n✗ ${fails.length} failed:\n${fails.map((f) => `   · ${f}`).join("\n")}\n`);
  process.exit(1);
}
console.log("✓ the multiplier a player is shown is the one the money path would pay.\n");
