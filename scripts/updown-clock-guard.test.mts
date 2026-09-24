/**
 * AN INSTANT THAT IS NOT AN INSTANT — the guard for the Up & Down board crash reported by
 * Ali on 2026-09-18: *"this page has encountered a problem"*, on ONE player's phone, right
 * after a bet that had SUCCEEDED, with the board on Rounds (so the chart was not even mounted).
 *
 *   npx tsx scripts/updown-clock-guard.test.mts   (npm run test:updown-clock-guard)
 *
 * ── THE DEFECT, IN ONE LINE ─────────────────────────────────────────────────────────────────
 * `selectionClosesAtMs={r.selectionClosedAt ? Date.parse(r.selectionClosedAt) : null}`
 *
 * That reads as total and is not. `Date.parse` answers **NaN** for any string it cannot read,
 * NaN is a number, and `NaN != null` is `true` — so every downstream `!= null` guard waves it
 * through. What that cost, and what this change does and does NOT repair:
 *
 *   · ✅ FIXED — `formatClock(NaN)` → `Intl.DateTimeFormat.format(new Date(NaN))` → `RangeError:
 *     Invalid time value`, thrown during RENDER, which escapes to the route error boundary and
 *     paints *"Ukurasa huu umekumbana na tatizo"* over the whole board. §1 measures the trap
 *     that hid this: `toLocaleTimeString` on the same value returns the harmless STRING
 *     `"Invalid Date"`, and the formatter's own header claimed the two were identical.
 *   · ⛔ NOT FIXED — `roundPhase` compares `now >= selectionClosesAtMs`; every comparison with
 *     NaN is false, so `pastLock` collapses and a locked round keeps its bet buttons. **`null`
 *     collapses it in exactly the same way**, so this change leaves that behaviour untouched.
 *     §3 asserts that identity on purpose, so nobody reads this fix as broader than it is; what
 *     actually holds such a round shut is the server's own `state === "locked"` (§3g).
 *
 * ⚠️ AND THE ROOT CAUSE OF ALI'S REPORT IS STILL UNCONFIRMED. This file fixes a REAL and
 * REACHABLE crash on the surface he described, found while hunting his; it is not proof that it
 * is the one he saw. His phone's actual exception was never captured. See
 * `docs/UPDOWN-PHONE-CRASH-2026-09-18.md`.
 *
 * ⭐ WHY A CLIENT-SIDE THROW NEEDED A UNIT GUARD AND NOT A LIVE DRIVE. It is served as HTTP
 * **200** and carries no `error.digest`, so Railway's logs hold nothing at all and a browser is
 * the only witness. A live sweep over production was green while the bug was real — and the
 * signed-out sweep could never have seen it, because the branch needs a viewer WITH a stake.
 * §3 poses the question deterministically instead.
 *
 * No network, no database, no build: pure functions plus a source read. Belongs in `predeploy`.
 */
import { roundPhase, msOrNull, heroPrice, heroMovePct, type RoundPhaseState } from "../src/lib/updown-card-phase.ts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && why ? ` — ${why}` : ""}`);
};

/* ── §1 · the premise, MEASURED — the two formatters are not interchangeable ──────────────── */
console.log("\n§1 · an invalid date: one formatter degrades, the other THROWS");
{
  const bad = new Date(NaN);
  let localeOut = "", localeThrew = false;
  try { localeOut = bad.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); }
  catch { localeThrew = true; }
  ok("§1a `toLocaleTimeString` does NOT throw on an invalid date", !localeThrew);
  ok("§1b …it returns a harmless string instead", /invalid/i.test(localeOut),
    `got ${JSON.stringify(localeOut)}`);

  let intlThrew = false, kind = "";
  try { new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(bad); }
  catch (e) { intlThrew = true; kind = (e as Error).constructor.name; }
  // 🔴 THE WHOLE DEFECT. Swapping one for the other "for performance" changed a cosmetic
  // degradation into a thrown RangeError on a money surface.
  ok("§1c 🔴 `Intl.DateTimeFormat.format` DOES throw on the same value", intlThrew);
  ok("§1d …and it is a RangeError", kind === "RangeError", `got ${kind}`);
}

/* ── §2 · why the old guard could not hold ────────────────────────────────────────────────── */
console.log("\n§2 · `Date.parse` returns NaN, and NaN is not null");
{
  const v = Date.parse("not-a-date");
  ok("§2a an unreadable string parses to NaN", Number.isNaN(v));
  // ⭐ THE EXACT REASON `!= null` WAS NOT ENOUGH.
  ok("§2b ⭐ NaN passes a `!= null` guard", (v as number) != null);
  ok("§2c …and `Number.isFinite` is the test that holds", !Number.isFinite(v));
  ok("§2d ⚠️ `!Number.isNaN` would NOT hold — it lets Infinity through", !Number.isNaN(Infinity));
}

/* ── §3 · what NaN costs the PHASE — and, honestly, what this change does NOT fix ────────── */
console.log("\n§3 · an unreadable lock instant silently un-locks the round");
{
  const nowMs = 1_000_000;
  const lockedAt = 900_000;      // the lock has passed
  const closesAt = 1_100_000;    // the round has not closed
  const honest = roundPhase({ state: "open", selectionClosesAtMs: lockedAt, closesAtMs: closesAt, nowMs });
  ok("§3a with a real lock instant the round is locked", honest.locked);
  ok("§3b …and is NOT bettable", !honest.bettable);

  // 🔴 The cost of an unreadable instant: the lock disappears and the card keeps its buttons.
  const withNaN = roundPhase({ state: "open", selectionClosesAtMs: NaN, closesAtMs: closesAt, nowMs });
  ok("§3c 🔴 NaN loses the lock entirely", withNaN.locked === false);
  ok("§3d 🔴 …and the card would still offer the bet", withNaN.bettable === true);

  /**
   * ⛔ AND HERE IS THE HONEST PART, WHICH THIS FILE MUST STATE RATHER THAN FLATTER ITSELF.
   * `msOrNull` does **NOT** repair §3c/§3d. `pastLock` is `selectionClosesAtMs != null &&
   * now >= selectionClosesAtMs`, and BOTH spellings collapse it to false:
   *   · NaN  — `NaN != null` is true, but `now >= NaN` is false;
   *   · null — the `!= null` test is false outright.
   * So the phase answer is byte-identical before and after. Asserted, not assumed, below.
   *
   * ⭐ WHAT THE CHANGE ACTUALLY BUYS is §5: NaN can no longer reach `formatClock`, which is
   * the throw that took the board off a player's phone. The phase behaviour is UNCHANGED, and
   * what protects a locked round is the SERVER's own `state === "locked"` (§3g) — not this.
   * ⚠️ A round whose lock instant is unreadable is therefore still indistinguishable, to the
   * client, from a legacy round that never had a betting window. That is a REAL remaining gap
   * and it is not fixed here; it is filed in the doc, not papered over by this guard.
   */
  const viaHelper = roundPhase({ state: "open", selectionClosesAtMs: msOrNull("not-a-date"), closesAtMs: closesAt, nowMs });
  ok("§3e ⭐ `msOrNull` yields null, not NaN", msOrNull("not-a-date") === null);
  ok("§3f 🔴 …and the phase answer is IDENTICAL — this change does not fix the lock",
    viaHelper.locked === withNaN.locked && viaHelper.bettable === withNaN.bettable,
    "if these ever diverge, re-read the claim above before believing the nicer one");
  // ⭐ What DOES hold a locked round shut, with no dependence on any parsed instant.
  const byServer = roundPhase({ state: "locked", selectionClosesAtMs: null, closesAtMs: closesAt, nowMs });
  ok("§3g ⭐ the SERVER's verdict locks it regardless", byServer.locked && !byServer.bettable);
}

/* ── §4 · `msOrNull` itself ───────────────────────────────────────────────────────────────── */
console.log("\n§4 · the one spelling for crossing the boundary");
{
  const iso = "2026-09-18T07:14:55.869Z";
  ok("§4a a real ISO instant survives", msOrNull(iso) === Date.parse(iso));
  ok("§4b an unreadable string is null", msOrNull("nope") === null);
  ok("§4c null is null", msOrNull(null) === null);
  ok("§4d undefined is null", msOrNull(undefined) === null);
  ok("§4e the empty string is null", msOrNull("") === null);
  ok("§4f the result is always finite or null",
    [iso, "nope", null, undefined, ""].every((v) => { const m = msOrNull(v); return m === null || Number.isFinite(m); }));
}

/* ── §5 · the call sites, so a revert cannot pass ─────────────────────────────────────────── */
console.log("\n§5 · the sites that produced and consumed the NaN");
{
  const card = read("src/components/updown/updown-card.tsx");
  const page = read("src/app/updown/page.tsx");
  const phase = read("src/lib/updown-card-phase.ts");

  // ⛔ Asserted on the FORMATTER's body, not on the file: the words "Number.isFinite" appear in
  // prose elsewhere, and a guard that matches a comment is a guard that cannot fail.
  const i = card.indexOf("function formatClock");
  const body = i >= 0 ? card.slice(i, i + 400) : "";
  ok("§5a `formatClock` exists", i >= 0);
  ok("§5b 🔴 …and it refuses a non-finite ms before formatting",
    /Number\.isFinite\(ms\)/.test(body) && body.indexOf("Number.isFinite(ms)") < body.indexOf(".format("),
    "without this the RangeError in §1c is thrown during render");
  ok("§5c …and it may answer null", /string \| null/.test(body));

  ok("§5d the board no longer hands `Date.parse` straight to the card",
    !/selectionClosesAtMs=\{[^}]*\?\s*Date\.parse/.test(page),
    "the `x ? Date.parse(x) : null` spelling is the defect");
  ok("§5e …it goes through `msOrNull`", /selectionClosesAtMs=\{msOrNull\(/.test(page));
  ok("§5f `msOrNull` is exported from the phase module", /export function msOrNull/.test(phase));
  ok("§5g the `?d=` filter refuses a non-integer",
    /Number\.isInteger\(Number\(sp\.d\)\)/.test(page),
    "`?d=abc` reached the board query as NaN");
}

/* ── §6 · controls — every matcher above must be able to FAIL ─────────────────────────────── */
console.log("\n§6 · controls");
{
  ok("§6a control · the unsafe prop spelling IS detected",
    /selectionClosesAtMs=\{[^}]*\?\s*Date\.parse/.test(
      'selectionClosesAtMs={r.selectionClosedAt ? Date.parse(r.selectionClosedAt) : null}'));
  ok("§6b control · an unguarded formatClock body IS detected",
    !/Number\.isFinite\(ms\)/.test('function formatClock(ms: number): string {\n  return F.format(new Date(ms));\n}'));
  ok("§6c control · a bare `Number(sp.d)` IS detected",
    !/Number\.isInteger\(Number\(sp\.d\)\)/.test("durationMinutes: sp.d ? Number(sp.d) : undefined,"));
  ok("§6d control · `msOrNull` would fail if it returned NaN",
    !Number.isFinite(NaN));
}

/* ── §7 · D36 · WHICH PRICE DOES A SURFACE PRINT FOR A DECIDED ROUND? ─────────────────────── */
/* 🔴 THE DEFECT THIS REPLACES. `/updown` handed `activeAsset!.livePrice` to every card whatever
   its state, so a RESOLVED card ticked today's quote in its big bold figure — while its own
   settled pod, six rows below, printed the honest `open → close`. One card, one round, two
   prices, and the loud one was the wrong one. Four things were wrong, not one: the price, the
   percentage, the DIRECTION GLYPH and the win/lose INK — so a round that resolved DOWN wore a
   green ▲ beside its own "Down wins" pill whenever the market had since risen past the open.

   ⭐ WHY THIS IS A UNIT GUARD AND NOT A LIVE DRIVE — the population is the point (§0 trap 3).
   A board driver sees only the rounds the market happens to be running: a `resolved` card is on
   screen for one window before the chain rolls, and a **void** card — the ONLY state where
   `closePrice` can be null, and so the only state that can produce a NaN — may not appear for
   days. A sweep over such a board returns a confident zero about THIS BOARD and says nothing
   about the code. Here every state is constructed, so the population is total and fixed. */
console.log("\n§7 · the price a surface prints for a decided round (D36)");
{
  const LIVE = 100, OPEN = 80, CLOSE = 60;
  const at = (state: RoundPhaseState, closePrice: number | null = CLOSE) =>
    heroPrice({ state, closePrice, livePrice: LIVE });
  const move = (state: RoundPhaseState, closePrice: number | null = CLOSE, openPrice: number | null = OPEN) =>
    heroMovePct({ state, openPrice, closePrice, livePrice: LIVE });

  // ⛔ VALUES, NOT SYMBOLS. Every figure below is computed here by hand: from 80, a close of 60
  // is −25% and a live read of 100 is +25%. A helper returning a constant cannot satisfy both.
  ok("§7a a RUNNING round prints the live read",
    (["open", "locked", "closing", "confirming"] as RoundPhaseState[]).every((s) => at(s) === LIVE),
    "one of the four running states is taking the close price");
  ok("§7b a SETTLED round prints its own close",
    at("resolved") === CLOSE && at("void") === CLOSE,
    "this is the defect: a settled round showing today's quote");
  ok("§7c ⛔ a void round with NO close price prints NOTHING — it does not fall back to live",
    at("void", null) === null && at("resolved", null) === null,
    "`?? livePrice` here is the defect wearing a null-check's face");
  ok("§7d `confirming` deliberately keeps the live read",
    at("confirming", null) === LIVE,
    "its closePrice is null for the whole settlement window; treating it as settled blanks the price on every round");

  ok("§7e the move is derived from the price that is PRINTED: −25% from the close, not +25% from live",
    move("resolved") === -25 && move("open") === 25,
    "a percentage off the live quote under a figure off the close is a card contradicting itself");
  ok("§7f 🔴 …so a DOWN round stays negative however far the market has since risen",
    move("resolved", 60) < 0 && move("open", 60) > 0,
    "this is the green ▲ beside 'Down wins'");
  ok("§7g the move is null — never NaN, never Infinity — where it cannot be computed",
    move("void", null) === null && move("resolved", CLOSE, 0) === null && move("open", CLOSE, null) === null
      && [move("void", null), move("resolved", CLOSE, 0)].every((v) => v === null || Number.isFinite(v)),
    "a zero open divides by zero and Infinity formats as a string rather than throwing");

  // ⭐ ANTI-CONSTANT. Same round, same prices, two states — a hardcoded return cannot pass both.
  ok("§7h the same round answers DIFFERENTLY either side of settlement",
    at("open") !== at("resolved") && move("open") !== move("resolved"));
}

/* ── §7i–§7r · the call sites, so the helper cannot become a writer with no reader ────────── */
console.log("\n§7i · both surfaces call the one function");
{
  // ⛔ COMMENTS STRIPPED FIRST, and §7p is why. This section's own fix comment QUOTES the
  // spelling it counts, so a guard reading raw text counted the prose and reported two. Same
  // rule §5 states above: a guard that matches a comment is a guard that cannot fail.
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
  const board = strip(read("src/app/updown/page.tsx"));
  const detail = strip(read("src/app/updown/[roundId]/page.tsx"));
  const phase = strip(read("src/lib/updown-card-phase.ts"));

  /* ⛔ THE PROP'S VALUE IS EXTRACTED AND ASSERTED POSITIVELY, never tested with a bare negative.
     `!/livePrice=\{activeAsset!\.livePrice\}/` looks like a guard and is not one: it passes if
     the prop is renamed, if the call site is deleted, if the whole file is gone — and a revert
     spelled `livePrice={ activeAsset!.livePrice }` walks straight through on one space. So the
     value is brace-matched out and must START WITH the chooser. ⭐ And a failed extraction FAILS
     (§7i, §7k): a read that did not land is not a zero. */
  const propValue = (src: string, prop: string): string | null => {
    const at = src.indexOf(`${prop}={`);
    if (at < 0) return null;
    let depth = 0;
    for (let k = at + prop.length + 1; k < src.length; k++) {
      if (src[k] === "{") depth++;
      else if (src[k] === "}") { depth--; if (depth === 0) return src.slice(at + prop.length + 2, k); }
    }
    return null;
  };
  const bLive = propValue(board, "livePrice");
  const bMove = propValue(board, "movePct");

  ok("§7i the board's `livePrice` prop is still there to read", bLive !== null,
    "a failed extraction must fail loudly, or every assertion below it is a confident zero");
  ok("§7j …and its value is CHOSEN by `heroPrice`, not taken from the asset",
    bLive !== null && /^heroPrice\(/.test(bLive.trim()),
    "`livePrice={activeAsset!.livePrice}` is D36 verbatim — what shipped until 2026-09-24");
  ok("§7k the board's `movePct` prop is still there to read", bMove !== null);
  ok("§7l …and its value is CHOSEN by `heroMovePct`, with no arithmetic left on the board",
    bMove !== null && /^heroMovePct\(/.test(bMove.trim()) && !/\/ r\.openPrice\) \* 100/.test(board),
    "the half-fix: `livePrice=` corrected while the percentage below it still ticks every 20s");
  // ⛔ AND BOTH MUST BE HANDED THE ROUND'S OWN STATE AND CLOSE. Calling the chooser with only the
  // asset's live read would satisfy §7j and §7l and still tick on a settled card.
  ok("§7m …and both are handed the ROUND's state and close, not just the asset's price",
    [bLive, bMove].every((v) => v !== null && /state:\s*r\.state/.test(v) && /closePrice:\s*r\.closePrice/.test(v)),
    "a chooser that is never told the state cannot choose");
  ok("§7n …and there is still exactly ONE <UpDownCard> call site for all of this to govern",
    (board.match(/<UpDownCard/g) ?? []).length === 1,
    "a second board would need the same rule and nothing above would notice it");

  ok("§7o ⭐ the ROUND PAGE chooses with the SAME function, so the two cannot disagree about the PRICE",
    /const heroLive = heroPrice\(/.test(detail),
    "a rule written on one of two surfaces is a coincidence, not a rule");
  ok("§7p the phase module holds exactly ONE spelling of `settled`",
    (phase.match(/state === "resolved" \|\| state === "void"/g) ?? []).length === 1,
    "three functions here each carried their own copy; the board carried none, and that missing copy was D36");

  /* ⚠️ THE REST OF THE TREE STILL SPELLS IT BY HAND — seven copies, and this counts them so an
     EIGHTH cannot arrive unnoticed. They are correct today and are left alone rather than folded
     into an unrelated commit; the number is the point, not the spelling. Raise it deliberately,
     or better, replace a copy with `roundIsSettled` and lower it. */
  const HAND_SPELT = [
    ["src/components/updown/updown-card.tsx", 2],
    ["src/app/updown/[roundId]/page.tsx", 1],
    ["src/lib/server/updown-board.ts", 3],
  ] as const;
  for (const [rel, expected] of HAND_SPELT) {
    const hits = (strip(read(rel)).match(/=== "resolved" \|\| [\w.]+ === "void"/g) ?? []).length;
    ok(`§7q ${rel} still hand-spells the settled test exactly ${expected}×`, hits === expected,
      `found ${hits} — if this grew, route it through \`roundIsSettled\`; if it shrank, lower the number here`);
  }

  /* ⭐ §7r · THE POPULATION PROOF. The six states §7a–§7b exercise are not a list somebody
     remembered — they are the whole union, read out of the source and compared. Add a seventh
     state to `RoundPhaseState` and this fails until someone decides which price it prints;
     without it, a new state would silently inherit whichever branch it happened to fall into. */
  const UNION = (phase.match(/export type RoundPhaseState = ([^;]+);/)?.[1] ?? "")
    .split("|").map((x) => x.trim().replace(/"/g, "")).filter(Boolean);
  const EXERCISED = ["open", "locked", "closing", "confirming", "resolved", "void"];
  ok("§7r every state in the RoundPhaseState union has a price rule exercised above",
    UNION.length === EXERCISED.length && UNION.every((x) => EXERCISED.includes(x)),
    `union reads [${UNION.join(", ")}] — a state nobody tested is a state nobody chose a price for`);
}

/* ── §7s · controls — every §7 matcher shown able to say no ───────────────────────────────── */
console.log("\n§7s · controls");
{
  ok("§7s control · the reverted prop spelling IS detected",
    /livePrice=\{activeAsset!\.livePrice\}/.test("                livePrice={activeAsset!.livePrice}"));
  ok("§7t control · the board doing its own move arithmetic IS detected",
    /\/ r\.openPrice\) \* 100/.test("                movePct={ ((activeAsset!.livePrice - r.openPrice) / r.openPrice) * 100 }"));
  // ⭐ THE MIRROR-CONTROL THAT MATTERS: the plausible wrong helper, written out, and §7c's own
  // assertion run against it. If §7c could pass for `?? livePrice`, it would pass for the defect.
  {
    const withFallback = (closePrice: number | null, livePrice: number | null) => closePrice ?? livePrice;
    ok("§7u control · §7c's assertion REJECTS a `?? livePrice` helper",
      withFallback(null, 100) === 100 && heroPrice({ state: "void", closePrice: null, livePrice: 100 }) === null,
      "the tempting null-check is the defect wearing a null-check's face");
  }
  ok("§7v control · a second copy of the settled spelling IS counted",
    ('const settled = state === "resolved" || state === "void";\nconst s2 = state === "resolved" || state === "void";'
      .match(/state === "resolved" \|\| state === "void"/g) ?? []).length === 2);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
// ⛔ A suite that silently stops running is a suite that cannot fail (see `chart-series`).
// ⛔ RAISE THIS WITH EVERY SECTION ADDED. Left at 28 while §7 added 17, the whole of §7 could be
//    deleted and this suite would still report ALL PASS over the 32 that remained.
if (pass + fail < 56) { console.error(`!! only ${pass + fail} assertions ran — treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
