// R5-J G-6: the four empty-slot placeholders render nothing and wear `kp-keep-line`. Exact, counted replacements; CRLF kept.
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-r5j/";
const NBSP = String.fromCharCode(0xa0);
const edits = [
  ["src/components/analytics/analytics-choice.tsx", [
    [`<p className="min-w-0 text-body-sm text-text" aria-live="polite">`, `<p className="kp-keep-line min-w-0 text-body-sm text-text" aria-live="polite">`],
    [`{!mounted ? "${NBSP}" : consent`, `{!mounted ? null : consent`],
  ]],
  ["src/components/ui/search-box.tsx", [
    ["className={`mt-1.5 min-h-[17px] text-[11px] ${invalidReason", "className={`kp-keep-line mt-1.5 min-h-[17px] text-[11px] ${invalidReason"],
    [`{invalidReason || described || echo || "${NBSP}"}`, `{invalidReason || described || echo || null}`],
  ]],
  ["src/components/ui/time-select.tsx", [
    [`className="mt-0.5 font-mono text-[10px] text-text-subtle tabular-nums"`, `className="kp-keep-line mt-0.5 font-mono text-[10px] text-text-subtle tabular-nums"`],
    ["{preview && !errored ? `= ${preview}` : \"" + NBSP + "\"}", "{preview && !errored ? `= ${preview}` : null}"],
    [`          ⚠️ The placeholder is a non-breaking space, hidden from the accessibility tree — an
          empty slot must reserve space without announcing a blank label. */}`,
     `          ⚠️ The empty slot holds its line with no character in the page — \`kp-keep-line\` (globals.css) draws its
          space (R5-J) — and it stays hidden from the accessibility tree: it must reserve space without announcing a
          blank label. */}`],
  ]],
  ["src/components/home/trust-band.tsx", [
    [`           item and collapsed the row; an empty span has height 0 and held nothing. A non-breaking
           space gives the cell one line box at its own line-height, so the silent row keeps its
           tracks (measured on production 2026-09-24). \`aria-hidden\`: there is no figure to announce. */
        <span className="kp-settled__amt" aria-hidden>{"\\u00a0"}</span>`,
     `           item and collapsed the row; an empty span has height 0 and held nothing. The cell keeps one
           line box at its own line-height, so the silent row keeps its tracks (measured on production
           2026-09-24) — drawn by \`kp-keep-line\` (globals.css, R5-J), no character in the page; it used
           to be a typed no-break space. \`aria-hidden\`: there is no figure to announce. */
        <span className="kp-settled__amt kp-keep-line" aria-hidden />`],
  ]],
];
for (const [rel, pairs] of edits) {
  const p = ROOT + rel;
  const raw = readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  let s = raw.replace(/\r\n/g, "\n");
  for (const [from, to] of pairs) {
    const n = s.split(from).length - 1;
    if (n !== 1) { console.error(`${rel}: expected 1 occurrence, found ${n}: ${JSON.stringify(from.slice(0, 80))}`); process.exit(1); }
    s = s.split(from).join(to);
  }
  writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${rel}: ${pairs.length} replacement(s)`);
}
