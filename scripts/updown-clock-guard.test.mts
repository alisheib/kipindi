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
import { roundPhase, msOrNull } from "../src/lib/updown-card-phase.ts";
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

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
// ⛔ A suite that silently stops running is a suite that cannot fail (see `chart-series`).
if (pass + fail < 28) { console.error(`!! only ${pass + fail} assertions ran — treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
