// Proves test:visual-pass-r4d catches each real regression on ITS OWN assertion: plant the shipped defect into the
// real source, run the suite, require exit ≠ 0 with a FAIL line starting with the expected label, restore, and finally
// require the tree byte-identical and the suite green again. Run from F:\kipindi-r4d.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CSS = "src/app/globals.css";
const M = [
  ["terminal-chart: the engine's grouping-free price format", "src/components/charts/terminal-chart.tsx",
    `const priceFormat = { type: "custom" as const, minMove: 1 / 10 ** data.decimals, formatter: (p: number) => usd(p, data.decimals) };`,
    `const priceFormat = { type: "price" as const, precision: data.decimals, minMove: 1 / 10 ** data.decimals };`, "1.1 ·"],
  ["chart-lab: 8px between the rails", "src/components/charts/updown-chart-lab.tsx",
    `justify-between gap-x-3 gap-y-2">`, `justify-between gap-x-3 gap-y-1.5">`, "2.1 ·"],
  ["chart-lab: the key back on the strut", "src/components/charts/updown-chart-lab.tsx",
    `<span aria-hidden="true" className="flex mb-[calc(var(--sp-3)_-_3.4px)] sm:mb-0">`, `<span aria-hidden="true">`, "2.2 ·"],
  ["stake hint: the figure in the sentence's face", "src/components/updown/updown-stake-controls.tsx",
    `? <span>{t.market.udTapToBet} · <span className="amount">{formatTzs(bet.stake)}</span></span>`, `? <>{t.market.udTapToBet} · {formatTzs(bet.stake)}</>`, "3.1 ·"],
  ["board card: the flush × note", "src/components/updown/updown-card.tsx",
    `{(outMultUp != null || outMultDown != null) && <EstimateNote className="mt-1" text={t.market.udEstimateNote} />}`,
    `{(outMultUp != null || outMultDown != null) && <p className="mt-1 text-body-sm leading-[1.45] text-text-faint break-keep [overflow-wrap:anywhere]">{t.market.udEstimateNote}</p>}`,
    "3.6 · the board card"],
  ["locked-side panel: the 10px × note", "src/components/updown/round-stake-panel.tsx",
    `<EstimateNote className="mt-2" text={t.market.udEstimateNote} />`, `<p className="mt-2 text-[10px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>`,
    "3.6 · the locked-side panel"],
  ["price hero: the detail line without its class", "src/components/updown/price-hero.tsx",
    `<p className="ud-cap-first mt-1.5 mb-0 text-body-sm text-text-muted">`, `<p className="mt-1.5 mb-0 text-body-sm text-text-muted">`, "3.10 ·"],
  ["css: the stamp's capital rule gone", CSS,
    `.ud-cap-first::first-letter { text-transform: uppercase; }`, `.ud-cap-first::first-letter { color: inherit; }`, "3.11 ·"],
  ["proof: the label back in lower case", "src/app/updown/[roundId]/page.tsx",
    `<dt className="ud-cap-first text-text-faint">{t.market.udQuoted}</dt>`, `<dt className="text-text-faint">{t.market.udQuoted}</dt>`, "3.12 ·"],
  ["proof: the capital by the all-caps utility", "src/app/updown/[roundId]/page.tsx",
    `<dt className="ud-cap-first text-text-faint">{t.market.udQuoted}</dt>`, `<dt className="text-text-faint first-letter:uppercase">{t.market.udQuoted}</dt>`, "3.13 ·"],
  ["/live: the bare 14px category", "src/app/live/pulse-grid.tsx",
    "<span className={`inline-flex items-center gap-1.5 ${TAG_BOX_Y} border-transparent`}>", `<span className="inline-flex items-center gap-1.5">`, "4.3 ·"],
  ["css: the 14px gutter", CSS, `  gap: var(--sp-4);\n  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));`,
    `  gap: 14px;\n  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));`, "4.5 ·"],
  ["css: the caption's three parts allowed to touch", CSS, `  column-gap: var(--sp-1);
  margin-top: 8px;`, `  margin-top: 8px;`, "5.2b ·"],
  ["css: the caption between its neighbours", CSS, `  grid-template-columns: 1fr auto 1fr;`, `  justify-content: space-between;`, "5.1 ·"],
  ["market page: the source glyph's bearing kept", "src/app/markets/[id]/page.tsx", `gap-1 -mr-[2px] min-h-[var(--tap-min)]`, `gap-1 min-h-[var(--tap-min)]`, "6.1 ·"],
  ["market page: no set-back", "src/app/markets/[id]/page.tsx", ` data-[stem]:indent-[-0.075em]"`, `"`, "6.3 ·"],
  ["market page: the set-back decided by locale", "src/app/markets/[id]/page.tsx",
    `data-stem={QUESTION_STEM.test(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)) ? "" : undefined}`,
    `data-stem={locale === "sw" ? "" : undefined}`, "6.3 ·"],
  ["/results: the tab label in the tally", "src/app/results/page.tsx",
    `{formatTzsCompact(totalVolume)} {t.market.tickerSettled}`, `{formatTzsCompact(totalVolume)} {t.common.settled}`, "7.1 ·"],
  ["/positions: the tab label in the win-rate hint", "src/app/positions/page.tsx",
    "ofSettled: `${settled.length} ${t.market.tickerSettled}`,", "ofSettled: `${settled.length} ${t.common.settled}`,", "7.3b ·"],
  ["css: the cramped count line", CSS, `    row-gap: var(--sp-2);`, `    row-gap: 2px;`, "8.1 ·"],
  ["css: the sheared lean word", CSS, `.tipbar-lean {\n  color: var(--bar-label-tipping);`, `.tipbar-lean {\n  font-style: italic;\n  color: var(--bar-label-tipping);`, "9.1 ·"],
];

const run = () => {
  try { execFileSync("npx", ["tsx", "scripts/visual-pass-r4d.test.mts"], { encoding: "utf8", stdio: "pipe", shell: true }); return { code: 0, out: "" }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
const base = run();
if (base.code !== 0) { console.error("REFUSING: the suite is red on the untouched tree"); process.exit(1); }
const originals = new Map();
for (const [, f] of M) if (!originals.has(f)) originals.set(f, readFileSync(f, "utf8"));
let caught = 0; const problems = [];
for (const [i, [name, file, from, to, expect]] of M.entries()) {
  const orig = originals.get(file);
  const crlf = orig.includes("\r\n");
  const F = crlf ? from.replace(/\n/g, "\r\n") : from, T = crlf ? to.replace(/\n/g, "\r\n") : to;
  const n = orig.split(F).length - 1;
  if (n !== 1) { problems.push(`${name}: anchor found ${n}×`); console.log(`  ${i + 1}. ANCHOR ${n}×  ${name}`); continue; }
  writeFileSync(file, orig.replace(F, T), "utf8");
  const r = run();
  writeFileSync(file, orig, "utf8");
  const failLines = r.out.split("\n").filter((l) => l.includes("FAIL "));
  if (r.code === 0) { problems.push(`${name}: stayed GREEN`); console.log(`  ${i + 1}. NOT CAUGHT  ${name}`); }
  else if (!failLines.some((l) => l.includes(`FAIL ${expect}`))) { problems.push(`${name}: red, not on ${expect} — ${failLines.slice(0, 2).join(" | ")}`); console.log(`  ${i + 1}. WRONG REASON ${name}`); }
  else { caught++; console.log(`  ${i + 1}. caught  ${name}  →  ${failLines.filter((l) => l.includes("FAIL ")).map((l) => l.trim().slice(5, 60)).join(" + ")}`); }
}
const dirty = [...originals].filter(([f, o]) => readFileSync(f, "utf8") !== o).map(([f]) => f);
const after = run();
console.log(`\n${caught}/${M.length} caught · restored: ${dirty.length === 0} · green after: ${after.code === 0}`);
for (const p of problems) console.log(`  · ${p}`);
process.exit(caught === M.length && dirty.length === 0 && after.code === 0 ? 0 : 1);
