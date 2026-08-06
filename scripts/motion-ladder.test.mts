/**
 * E-113 · NO COMPONENT MAY HARDCODE A CSS DURATION — the ladder is the only source.
 *
 *   npm run test:motion-ladder
 *
 * `motion.css` defines six rungs (`--t-flick` 90ms → `--t-max` 620ms) and five easings, and the
 * material audit found **16 components carrying raw `150ms` / `200ms` / inline `cubic-bezier()`
 * in `transition:` and `animation:` strings**. A ladder half the product ignores is not a
 * system; it is a suggestion, and every hardcoded value is a place the next tuning pass will
 * silently miss.
 *
 * ⛔ THIS IS A RATCHET, LIKE `test:design-frozen`. The allowlist below may only SHRINK. Adding
 * an entry is re-opening the hole — put the value on the ladder instead.
 *
 * ⚠️ SCOPED TO CSS STRINGS. A `setTimeout(…, 300)`, a `durationMs` prop or a number in prose is
 * not a hardcoded transition, and flagging those would make the guard noise that gets muted.
 * Only lines carrying `transition:` or `animation:` are read.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Files still holding raw timings, as measured 2026-08-06. THIS LIST MAY ONLY SHRINK.
 */
const ALLOWLIST = new Set<string>([
  // ⭐ EMPTY, AND IT GOT THERE THE WAY A RATCHET IS SUPPOSED TO — 5 → 2 → 0 in one day.
  //
  // 📌 Started at 5. `needle.tsx`, `reward-burst.tsx` and `win-celebration.tsx` were listed on
  // the assumption they carried raw timings and §1.2 proved they do not — a ratchet that
  // catches its own author's guesses is doing its job.
  //
  // 📌 The last two, `updown-card.tsx` and `round-countdown.tsx`, were a **SCHEDULING**
  // exemption and never a design one: another session was live in `src/components/updown/` on
  // 2026-08-06, so they were left alone to avoid a collision. That session finished its Up &
  // Down work the same day and cleared them itself — both held the identical literal
  // `color 240ms ease`, now `var(--t-base) var(--m-glide)`.
  // ⚠️ `--t-base` (220ms) is the nearest rung and was chosen to PRESERVE the behaviour. The
  // ladder's semantics would argue for `--t-flick` (a colour change travels nowhere), but
  // 240 → 90 is a feel change on the clock counting out a player's last seconds to bet — a
  // deliberate design call, not a side effect of a token migration.
  //
  // ⛔ THIS LIST MAY ONLY SHRINK, AND IT IS NOW AT ZERO. Adding an entry re-opens the hole; put
  // the value on the ladder instead.
]);

const RAW_MS = /\b\d{2,4}ms\b/;
const RAW_BEZIER = /cubic-bezier\(/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith(".tsx")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

let pass = 0; const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const files = walk("src/components");
const offenders: string[] = [];
const usedExemptions = new Set<string>();

for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  const hits: string[] = [];
  lines.forEach((line, i) => {
    if (!/transition\s*:|animation\s*:/.test(line)) return;
    if (/^\s*(\/\/|\*|\/\*)/.test(line.trim())) return;   // a comment explaining one is not one
    if (RAW_MS.test(line) || RAW_BEZIER.test(line)) hits.push(`${f}:${i + 1}`);
  });
  if (!hits.length) continue;
  if (ALLOWLIST.has(f)) { usedExemptions.add(f); continue; }
  offenders.push(hits[0] + (hits.length > 1 ? ` (+${hits.length - 1} more)` : ""));
}

console.log(`\n── ${files.length} components scanned ──\n`);
ok("1.0 the probe actually read components (never measure an empty list)", files.length > 50, `${files.length}`);
ok("1.1 ⭐ no component outside the allowlist hardcodes a CSS duration or easing",
  offenders.length === 0, offenders.slice(0, 6).join(" · "));

// ⛔ A stale exemption is how a ratchet quietly stops ratcheting: the file gets cleaned, the
// entry stays, and the next offender hides behind it.
const stale = [...ALLOWLIST].filter((f) => !usedExemptions.has(f));
ok("1.2 the ratchet holds no stale exemptions", stale.length === 0, stale.join(", "));

console.log(`\n  (ratchet holds ${ALLOWLIST.size} file(s) — the list may only shrink)`);
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
