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
 *
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 🔴 TWO HOLES CLOSED 2026-08-21, AND BOTH WERE IN THE SCAN RATHER THAN IN THE RULE — which
 * is the shape of every blind spot this campaign has found. A gate reporting `0 offenders`
 * over the wrong corpus reads exactly like a gate reporting `0 offenders`.
 *
 *   1 · IT ONLY EVER WALKED `src/components`. A component is not the only place a CSS string
 *       is written: `src/lib/i18n.tsx` carries a whole `<style>` block for the locale-switch
 *       overlay, and `src/app/admin/kyc/[id]/kyc-doc-viewer.tsx` sets `transition` inline on
 *       the document image. Both held raw timings for the guard's entire life. It now walks
 *       ALL of `src/**` and §1.3 pins that widening so it cannot silently revert.
 *
 *   2 · IT ONLY RECOGNISED `ms`. `transition: "stroke-dashoffset 0.5s linear"` is 500ms — a
 *       ladder-range duration written in the other unit — and `\d{2,4}ms` cannot see it. It
 *       was sitting in `src/components/positions/countdown-ring.tsx`, INSIDE the directory
 *       the guard did walk, for its entire life. Sub-second `s` values now count.
 *       ⚠️ Deliberately SUB-SECOND ONLY. `2.4s`, `3.6s` and `64s` are ambient-loop periods;
 *       the ladder's top rung is `--t-max` at 620ms, so it has no rung to offer them and
 *       flagging them would make this guard noise that gets muted. That is a scope decision,
 *       written down, not an oversight.
 *
 * ⭐ AND THE MEASURED COST OF FIXING THE SCAN IS FOUR ENTRIES ON A RATCHET THAT HAD REACHED
 * ZERO. Say that plainly rather than quietly: the list below going 0 → 4 is not a regression
 * in the product, it is the first honest count.
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
  // ⛔ THIS LIST MAY ONLY SHRINK. Adding an entry re-opens the hole; put the value on the
  // ladder instead.
  //
  // ⚠️ 2026-08-21 — 0 → 4, AND NOT ONE OF THE FOUR IS NEW CODE. All four predate the ratchet
  // and were invisible to it: three sat outside `src/components`, and the fourth wrote its
  // duration in seconds. Each is a real defect, filed rather than fixed because every one of
  // these files is outside this session's ownership.
  //
  // 📌 `src/lib/i18n.tsx` — `.lcl-scrim { animation: lcl-fade 180ms ease-out }` in the
  //    locale-switch overlay's <style> block. 180 → `--t-quick` (160) or `--t-base` (220).
  // 📌 `src/app/admin/kyc/[id]/kyc-doc-viewer.tsx` — `transition: "transform 0.2s"` on the
  //    KYC document image. 200ms is `--t-base` (220) within a rounding the eye cannot hold.
  // 📌 `src/components/positions/countdown-ring.tsx` — `transition: "stroke-dashoffset 0.5s
  //    linear"`. A ring that redraws once a second; `--t-stage` (520) is the rung.
  // 📌 `src/components/ui/spinner.tsx` — `animation: "spin 0.7s linear infinite"`. ⚠️ THE ONE
  //    THAT IS NOT A SIMPLE MIGRATION: 700ms is a LOOP PERIOD, and the ladder deliberately
  //    stops at `--t-max` (620) because it describes one-shot motion. Moving this to a rung
  //    would change the spinner's feel to satisfy a guard, which is the wrong way round.
  //    It stays listed — visible, not silently exempt — until the ladder gains a period rung
  //    or someone decides 620 is the right spin. See `test:reduce-motion` §2.5 for the other
  //    reason this atom is special-cased.
  "src/lib/i18n.tsx",
  "src/app/admin/kyc/[id]/kyc-doc-viewer.tsx",
  "src/components/positions/countdown-ring.tsx",
  "src/components/ui/spinner.tsx",
]);

const RAW_MS = /\b\d{2,4}ms\b/;
/* Sub-second only — see hole 2 in the header. `0.5s` is 500ms wearing the other unit; `2.4s`
   is a loop period the ladder has no rung for and is deliberately NOT matched.
   ⛔ THE LEADING LOOKBEHIND IS LOAD-BEARING and cost this rule a red run. `\b0?\.\d+s\b`
   looks sub-second and is not: in `2.2s` there is a word boundary between the `2` and the
   `.`, so it happily matched `.2s` and condemned every ambient loop in the product — three
   files the paragraph above explicitly says are out of scope. A guard whose first act is to
   contradict its own written scope is the guard nobody will trust the next time. */
const RAW_SUBSEC = /(?<![\d.])0?\.\d+s\b/;
const RAW_BEZIER = /cubic-bezier\(/;

/** `ML_ROOT` re-aims the whole gate at a scratch tree, so a RED harness never mutates `src/`. */
const ROOT = (process.env.ML_ROOT ?? ".").replace(/\\/g, "/").replace(/\/$/, "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith(".tsx") || e.endsWith(".ts")) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

let pass = 0; const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

/* `SRC` is the real directory on disk; `rel` is the repo-relative key the allowlist and every
   printed line use, so a run under `ML_ROOT` names the same paths as a run in the repo. */
const SRC = join(ROOT, "src").replace(/\\/g, "/");
const files = walk(SRC).map((p) => `src/${p.slice(SRC.length + 1)}`);
const offenders: string[] = [];
const usedExemptions = new Set<string>();

for (const f of files) {
  /* ⛔ BLOCK COMMENTS ARE BLANKED, NOT SKIPPED LINE-BY-LINE. Half this repo's motion files
     open with a long `/** … *\/` explaining which rung replaced which raw value, and those
     explanations name the raw values. The old line-start test caught the `*` continuation
     lines but not the FIRST line of such a block, nor a wrapped sentence that happens to
     start with a word. Blanking preserves newlines so `i + 1` still points at the real line. */
  const raw = readFileSync(`${SRC}/${f.slice(4)}`, "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const hits: string[] = [];
  src.split("\n").forEach((line, i) => {
    if (!/transition\s*:|animation\s*:/.test(line)) return;
    if (/^\s*\/\//.test(line)) return;   // a `//` comment explaining one is not one
    if (RAW_MS.test(line) || RAW_SUBSEC.test(line) || RAW_BEZIER.test(line)) hits.push(`${f}:${i + 1}`);
  });
  if (!hits.length) continue;
  if (ALLOWLIST.has(f)) { usedExemptions.add(f); continue; }
  offenders.push(hits[0] + (hits.length > 1 ? ` (+${hits.length - 1} more)` : ""));
}

console.log(`\n── ${files.length} source files scanned under ${ROOT}/src ──\n`);
ok("1.0 the probe actually read source (never measure an empty list)", files.length > 50, `${files.length}`);
ok("1.1 ⭐ no file outside the allowlist hardcodes a CSS duration or easing",
  offenders.length === 0, offenders.slice(0, 6).join(" · "));

// ⛔ A stale exemption is how a ratchet quietly stops ratcheting: the file gets cleaned, the
// entry stays, and the next offender hides behind it.
const stale = [...ALLOWLIST].filter((f) => !usedExemptions.has(f));
ok("1.2 the ratchet holds no stale exemptions", stale.length === 0, stale.join(", "));

/**
 * 1.3 — ⭐ THE SCAN STILL REACHES PAST `src/components`, PINNED BY DIRECTORY.
 *
 * ⛔ This is the E-108 rule applied to a corpus rather than to a locator: a gate that walks
 * the wrong tree reports `0 offenders` in the same words as a gate that walks the right one,
 * and its red harness — mutating a file inside the tree it DOES walk — agrees with it. For
 * the whole life of this guard, everything under `src/app/` and `src/lib/` was invisible, and
 * nothing about its output said so.
 *
 * Both directories are pinned because both hold a REAL raw timing today (see the entries in
 * the allowlist). If one of them ever stops being scanned — a reverted glob, a `walk()` root
 * put back to `src/components` — this line goes red and names the directory, instead of the
 * ratchet quietly reporting a clean sweep over two thirds of the corpus.
 */
const REACHED = ["src/app/", "src/lib/", "src/components/"];
const unreached = REACHED.filter((d) => !files.some((f) => f.startsWith(d)));
ok("1.3 ⭐ the scan reaches src/app, src/lib AND src/components (a narrowed walk reports 0 in the same words)",
  unreached.length === 0, unreached.join(", "));

console.log(`\n  (ratchet holds ${ALLOWLIST.size} file(s) — the list may only shrink)`);
for (const f of [...ALLOWLIST].sort()) console.log(`      · ${f}`);
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
