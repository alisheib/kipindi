/**
 * THE ROUND BOUNDARY MUST BE A WHOLE MINUTE — because market data is 1-minute bars.
 *
 *   npx tsx scripts/updown-grid.test.mts     (npm run test:updown-grid)
 *
 * ⛔ THE DEFECT THIS PINS, MEASURED 2026-08-04. `generateRoundNow` computed its boundary as
 * `Math.floor(Date.now() / 1000) * 1000` — which zeroes the MILLISECONDS and keeps the
 * SECONDS. A round generated at 21:22:37 carried the boundary `21:27:37`.
 *
 * Against a quote endpoint that is invisible: `/quote` only ever answers "the price now" and
 * never cares which instant you claim to be asking about. Against market data it is fatal —
 * prices are published as bars labelled by the minute, and **there is no bar labelled
 * 21:27:37**. Every boundary this platform has ever created is unnamable in the data meant to
 * settle it. The paragraph above that line even claimed "seconds and milliseconds are zeroed",
 * which was untrue, and is why nobody noticed for the life of the feature.
 *
 * Measured against the live provider the same day (`ops-updown-probe-bars.mts`): the bar
 * labelled T exists **5 seconds** after T and its `open` never changed across seven polls out
 * to +180s. So a minute-aligned boundary has an immutable, re-checkable price — and a boundary
 * with seconds on it has none at all.
 */
import { minuteFloor, isMinuteAligned, MINUTE_MS, ALLOWED_DURATIONS } from "../src/lib/updown-durations";
import { readFileSync } from "node:fs";

let pass = 0; const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// ── §1 · minuteFloor — the rule itself ─────────────────────────────────────
const at = (s: string) => Date.parse(s);
ok("§1 a mid-minute instant floors to its own minute",
  minuteFloor(at("2026-08-04T21:22:37.412Z")) === at("2026-08-04T21:22:00.000Z"));
ok("§1 an exact minute is returned unchanged (idempotent)",
  minuteFloor(at("2026-08-04T21:22:00.000Z")) === at("2026-08-04T21:22:00.000Z"));
ok("§1 one millisecond before the next minute still floors DOWN",
  minuteFloor(at("2026-08-04T21:22:59.999Z")) === at("2026-08-04T21:22:00.000Z"));
ok("§1 ⛔ it never rounds UP — a round must never open on a minute that has not begun",
  minuteFloor(at("2026-08-04T21:22:59.999Z")) < at("2026-08-04T21:23:00.000Z"),
  "opening on a future minute means taking stakes for a price that does not exist yet (E-67)");
// Exhaustive over a full minute, one second at a time — the arithmetic decides real money.
{
  const base = at("2026-08-04T21:22:00.000Z");
  let allFloor = true;
  for (let s = 0; s < 60; s++) if (minuteFloor(base + s * 1000) !== base) allFloor = false;
  ok("§1 every second of a minute floors to that minute (60/60)", allFloor);
}
ok("§1 minuteFloor is idempotent", minuteFloor(minuteFloor(at("2026-08-04T21:22:37.412Z"))) === at("2026-08-04T21:22:00.000Z"));
ok("§1 MINUTE_MS is a minute", MINUTE_MS === 60_000);

// ── §2 · isMinuteAligned — the property every boundary must hold ───────────
ok("§2 a whole minute is aligned", isMinuteAligned("2026-08-04T21:22:00.000Z"));
ok("§2 ⛔ a boundary carrying SECONDS is not — verbatim the shape that shipped",
  !isMinuteAligned("2026-08-04T21:27:37.000Z"),
  "21:27:37 is what a round generated at 21:22:37 actually carried");
ok("§2 a boundary carrying milliseconds is not", !isMinuteAligned("2026-08-04T21:22:00.500Z"));
ok("§2 an unparseable instant is not aligned", !isMinuteAligned("not-a-date"));

// ── §3 · the round's CLOSE inherits the property ───────────────────────────
// `openRound` derives `closeMs = openMs + durationMinutes * 60_000`. If the open is aligned
// and every allowed duration is a whole number of minutes, the close is aligned too — so the
// round is namable in bars at BOTH ends, which is the entire point.
{
  const open = at("2026-08-04T21:22:00.000Z");
  let allAligned = true;
  for (const d of ALLOWED_DURATIONS) {
    if (!isMinuteAligned(new Date(open + d * MINUTE_MS).toISOString())) allAligned = false;
  }
  ok(`§3 every allowed duration closes on a whole minute (${ALLOWED_DURATIONS.join("/")})`, allAligned,
    "a fractional duration would make the close unnamable even with an aligned open");
  ok("§3 every allowed duration is a whole number of minutes",
    ALLOWED_DURATIONS.every((d) => Number.isInteger(d) && d > 0));
}

// ── §4 · THE CALL SITE — the helper is worthless if the money path skips it ──
// E-4 and E-56 both shipped because an assertion checked a symbol rather than its reachability.
const service = read("../src/lib/server/updown-service.ts");
ok("§4 generateRoundNow floors its boundary through the shared rule",
  /const openMs = minuteFloor\(Date\.now\(\)\)/.test(service),
  "the call site is the assertion; a correct helper nobody calls is the defect");
// ⚠️ STRIP COMMENTS BEFORE ASSERTING A DEFECT IS GONE. This assertion failed on a correct
// file twice before it was written this way: the comment *explaining* the fix necessarily
// quotes the expression it removed, so a naive grep matches the documentation and reports the
// bug as still present. Same shape as the tracker-hygiene guards that matched their own prose,
// and as `const voids =` in `test:updown-chain-stats`. **Assert against CODE, not the file.**
const serviceCode = service
  .split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join("\n");
ok("§4 ⛔ the seconds-preserving expression is GONE from the money path",
  !/Math\.floor\(Date\.now\(\) \/ 1000\) \* 1000/.test(serviceCode),
  "that expression is verbatim what shipped and what produced 21:27:37");
ok("§4 the shared rule is imported, not re-implemented",
  /import \{ minuteFloor \} from "@\/lib\/updown-durations"/.test(service));

// §4b · and the module it lives in must stay import-free, or a client console cannot read it
// (the reason ALLOWED_DURATIONS was moved there: both admin consoles had hand-copied it).
const durations = read("../src/lib/updown-durations.ts");
ok("§4b updown-durations.ts still has no imports",
  !/^\s*import\s/m.test(durations),
  "an import here makes the module unusable from a client component and the copies come back");

console.log(`\nUP & DOWN GRID — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
