/**
 * `npm run qa:dg-money` — the §M4 sweep. DESIGN-GATE-2026-08-28, DG-A-12 / DG-P-05.
 *
 * Moves an AMOUNT off an arbitrary `text-[Npx]` and onto the ladder: the size becomes the
 * Tailwind rung of the SAME value, and `font-mono` + `tabular`/`tabular-nums` become the
 * `.amount` role class. Per `DESIGN_AUTHORITY` §M4's new subsection and §T7.
 *
 * 🔴 THE FIRST VERSION OF THIS TOOL WAS WRONG, AND THE REASON IS THE POINT.
 * It decided "is this an amount?" from a ±4-LINE WINDOW — the same window used earlier to
 * COUNT the population. Counting tolerated it; editing did not. Applied, it rewrote:
 *   · `"A confirmed movement reconciles … Drift must be TZS 0."` — a SENTENCE, into `.amount`
 *   · `{yes}% YES` — a percentage · `{r.outcome ?? "—"}` — a word
 *   · `{POSITION_STATUS_LABEL(…)}` — a status label
 * — every one of them merely NEAR a money call. ⛔ **A population good enough to size a
 * problem is not automatically good enough to act on it.** It also flattened the indentation
 * of 20 files (a `/ {2,}/g` collapse that ate the leading whitespace too), and it would have
 * put `.amount` beside `font-display` on the win celebration, where `.amount.amount` (0,2,0)
 * silently wins and changes the typeface. All of it was reverted.
 *
 * ⭐ SO THE POPULATION IS NOW THE GUARD'S OWN. It matches a single element whose ENTIRE
 * content is text and whose OWN content calls a money formatter — the same shape
 * `type-scale.test.mts`'s `scanMoneyElements` uses for §1/§2, including the `(?<!=)>(?!=)`
 * closing delimiter that stops a JSX `>=` from truncating the attributes. One definition of
 * "a money element", shared between the guard that judges and the tool that edits.
 *
 * ⛔ IT ONLY TOUCHES SITES WHERE NO PIXEL MOVES — the size must be EXACTLY a Tailwind rung.
 * 10.5 · 11.5 · 12.5 · 9.5 · 15 · 17 · 19 · 24 · 26 · 30 · 34 · 38 are SIZE CHANGES, i.e.
 * per-site design calls, and this tool refuses them by design. Measured with `qa:dg-type`:
 * `.amount` restores the untracked width byte for byte, so a qualifying rewrite is invisible.
 *
 * 🔴 AND IT MUST NOT ZERO A RATCHET WITHOUT MOVING A GLYPH. That is why the size goes onto a
 * TAILWIND RUNG and never onto a `--type-*` reference: §3's population is `text-[Npx]` ∪
 * {`text-micro`,`text-caption`,`text-label`}, so a sub-floor amount stays counted afterwards.
 * ⚠️ §4 should fall by EXACTLY the number of sites rewritten — more means something else was
 * swept, less means the edit did not land.
 *
 * Usage:
 *   node scripts/design-gate/money-sweep.mjs            # DRY RUN — prints every before/after
 *   node scripts/design-gate/money-sweep.mjs --apply
 *   node scripts/design-gate/money-sweep.mjs --file src/app/wallet/wallet-client.tsx
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const APPLY = process.argv.includes("--apply");
const ONE = (() => { const i = process.argv.indexOf("--file"); return i > -1 ? process.argv[i + 1] : null; })();

/** px → class. `tailwind.config.ts:190-202`; `test:type-scale` §7 pins these to the config. */
const RUNG = {
  10: "text-micro", 11: "text-caption", 12: "text-label", 13: "text-body-sm", 14: "text-body",
  16: "text-body-lg", 18: "text-title-sm", 22: "text-title-md", 28: "text-title-lg",
};

/** ⛔ The guard's own money predicate and element shape — see the header. */
const MONEY_CALL = /\bformatTzs(?:Compact|Signed|Abs)?\s*\(|\bformatBalancePill\s*\(/;
const TAGS = "span|p|div|dd|dt|td|th|li|strong|em|b|h1|h2|h3|h4|h5|h6|label|small";
const EL = new RegExp(`<(${TAGS})\\b((?:[^>]|=>|>=)*?)(?<!=)>(?!=)([^<]*?)</\\1>`, "g");

const walk = (d) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  return statSync(p).isDirectory() ? walk(p) : (/\.tsx$/.test(e) ? [p] : []);
});

const files = ONE ? [join(ROOT, ONE)] : walk(SRC);
let changed = 0;
const skips = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const rel = relative(SRC, f).split(/[\\/]/).join("/");
  let out = src, touched = false;

  for (const m of [...src.matchAll(EL)]) {
    const [whole, , attrs, content] = m;
    if (!MONEY_CALL.test(content)) continue;          // ⛔ the ELEMENT's own text, never a window
    const size = attrs.match(/text-\[([0-9.]+)px\]/);
    if (!size) continue;
    const line = src.slice(0, m.index).split("\n").length;
    const px = Number(size[1]);
    const note = (why) => skips.push(`${rel}:${line}  ${px}px  ${why}`);

    if (/\buppercase\b/.test(attrs)) { note("§T3 blessed eyebrow — its tracking is CORRECT"); continue; }
    /* ⛔ `.amount` sets font-mono and is (0,2,0), so beside `font-display` it would silently
       change the typeface. Those sites are §T5 violations already RECORDED in the guard's
       RATCHET_MONEY, to be fixed deliberately with a screenshot — never swept. */
    if (/\bfont-display\b/.test(attrs)) { note("⛔ carries font-display — a §T5 case, recorded, not swept"); continue; }
    if (!/\bfont-mono\b|\btabular(-nums)?\b/.test(attrs)) { note("no mono/tabular signal on the element"); continue; }
    if (!RUNG[px]) { note("⛔ OFF-LADDER — a size change, so a per-site design call"); continue; }

    /* The rewrite. ⚠️ Token-surgical: only the three tokens change, and NO whitespace is
       normalised — the first version collapsed every run of 2+ spaces and flattened the
       indentation of 20 files. */
    let a = attrs.replace(`text-[${size[1]}px]`, RUNG[px]);
    const hasMono = /\bfont-mono\b/.test(a), hasTab = /\btabular-nums\b|\btabular\b/.test(a);
    if (hasMono && hasTab) a = a.replace(/\bfont-mono\b ?/, "").replace(/\btabular-nums\b|\btabular\b/, "amount");
    else if (hasMono) a = a.replace(/\bfont-mono\b/, "amount");
    else a = a.replace(/\btabular-nums\b|\btabular\b/, "amount");

    const rebuilt = whole.replace(attrs, a);
    if (rebuilt === whole) { note("rewrite was a no-op — skipped rather than guessed"); continue; }
    out = out.replace(whole, rebuilt);
    touched = true; changed++;
    console.log(`  ${rel}:${line}   ${px}px → ${RUNG[px]} + .amount`);
    console.log(`    ─ ${whole.trim().replace(/\s+/g, " ").slice(0, 150)}`);
    console.log(`    + ${rebuilt.trim().replace(/\s+/g, " ").slice(0, 150)}`);
  }
  if (APPLY && touched) writeFileSync(f, out);
}

console.log(`\n${changed} amount element(s) ${APPLY ? "REWRITTEN" : "would change"} · ${skips.length} skipped`);
const by = (s) => skips.filter((x) => x.includes(s)).length;
console.log(`skipped: ${by("eyebrow")} §T3 eyebrows · ${by("font-display")} font-display · ` +
  `${by("no mono")} without a mono signal · ${by("OFF-LADDER")} OFF-LADDER amounts (each needs a size decision)`);
const off = skips.filter((s) => s.includes("OFF-LADDER"));
if (!APPLY && off.length) console.log(`\n⛔ the off-ladder amounts, which this tool will never touch:\n${off.map((s) => "   " + s).join("\n")}`);
if (!changed && !skips.length) { console.error("🔴 ZERO elements examined — a skipped run, not a clean tree."); process.exit(3); }
