/**
 * THE MUTATION PROOF FOR R5-E — each plant writes a real defect into a real file of the worktree, runs the suites that
 * must catch it, and puts the file back BYTE FOR BYTE (sha-256 compared after every plant; a mismatch stops the run).
 * Run from the worktree:  node <this file>   (cwd F:\kipindi-r5e)
 *
 * A plant is caught when every suite named for it exits non-zero AND prints its expected check as a FAIL line.
 * ⛔ Never run while anything else reads the worktree (the suites would read the plant).
 * Anchors are written with \n; each is matched in the file's own line endings (CRLF here). No string in this file holds
 * an escape sequence the tools could decode: every backslash in a plant is written doubled.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const R5E = ["npx", ["tsx", "scripts/visual-pass-r5e.test.mts"]];
const R4I = ["npx", ["tsx", "scripts/visual-pass-r4i.test.mts"]];
const SPG = ["npx", ["tsx", "scripts/sell-price-guard.test.mts"]];
const KW = "src/components/ui/keep-words.tsx";

const PLANTS = [
  { id: "M1", note: "H1 · the Chinese unit back to \"any one or two ideographs\" (7月降雨量 keeps 降, 15万美元 cuts 美元)", file: KW,
    edits: [["+ `(?:(\\\\s?(?:${ZH_UNIT}))|", "+ `(?:(\\\\s?[㐀-䶿一-鿿豈-﫿]{1,2})|"]], expect: [[R5E, "1.1"]] },
  { id: "M2", note: "H1 · the currency code left out again when a unit follows (\"TZS\" alone before \"1 bilioni\")", file: KW,
    edits: [["(tail === \"\" || CURRENCY.test(before))", "tail === \"\""]], expect: [[R5E, "1.2"]] },
  { id: "M3", note: "a month holds any number again (\"December 2026\", 225px, wider than the h1's line at 320)", file: KW,
    edits: [["    const day = DAY.test(num);", "    const day = true;"]], expect: [[R5E, "1.3″"], [R5E, "9.1′"]] },
  { id: "M4", note: "H3 · a name's character back to a code point (the cut inside the technologist emoji)", file: KW,
    edits: [["  for (const m of name.matchAll(CHARACTER))", "  for (const m of name.matchAll(/\\S/gu))"]], expect: [[R5E, "4.1"], [R5E, "4.3"]] },
  { id: "M4b", note: "H3 · `characterSpans` back to code points (the pattern ICU is held against)", file: KW,
    edits: [["  return [...text.matchAll(CHARACTER)]", "  return [...text.matchAll(/\\S/gu)]"]], expect: [[R5E, "4.2"]] },
  { id: "M5", note: "H2 · the name's gap unbounded again (37 ideographic spaces in one unbreakable run)", file: KW,
    edits: [["const NAME_GAP = new RegExp(`^${KEPT_GAP}$`);", "const NAME_GAP = /^\\s*$/;"]], expect: [[R5E, "4.1"]] },
  { id: "M6", note: "H3 · the joiners and vowels that are not marks dropped (Thai AM, ZWNJ, a trailing ZWJ cut off)", file: KW,
    edits: [["const EXTEND = \"\\\\p{M}\\\\u200C\\\\u200D\\\\u0E33\\\\u0EB3\\\\uFF9E\\\\uFF9F", "const EXTEND = \"\\\\p{M}"]], expect: [[R5E, "4.1"], [R5E, "4.2"]] },
  { id: "M7", note: "H2's rule dropped from every keep helper (KEPT_SPACE back to \\s+)", file: KW,
    edits: [["export const KEPT_SPACE = `(?=\\\\s)${KEPT_GAP}`;", "export const KEPT_SPACE = \"\\\\s+\";"]], expect: [[R5E, "5.3"]] },
  { id: "M8", note: "H2's rule dropped from the dash alone", file: "src/components/ui/keep-run.tsx",
    edits: [["const DASH = new RegExp(`${KEPT_SPACE}[—–](?=\\\\s|$)|—+`, \"gu\");", "const DASH = new RegExp(`\\\\s+[—–](?=\\\\s|$)|—+`, \"gu\");"]], expect: [[R5E, "5.1"], [R5E, "5.3"]] },
  { id: "M24", note: "keepLastWords back to the \"word, space, word, end\" pattern (quadratic on a long word)", file: KW,
    edits: [["  const at = lastTwo(text, \"kept\")?.[0] ?? -1;", "  const at = text.search(new RegExp(`\\\\S+${KEPT_SPACE}\\\\S+(?:${KEPT_SPACE})?$`));"]], expect: [[R5E, "5.5"], [R5E, "5.1"]] },
  { id: "M25", note: "keepYears tries a space at every place again (quadratic on a long run of spaces)", file: KW,
    edits: [["const SPACE_YEAR = new RegExp(`\\\\S(${KEPT_SPACE}", "const SPACE_YEAR = new RegExp(`(${KEPT_SPACE}"], ["    const space = (m.index ?? 0) + 1;", "    const space = m.index ?? 0;"]],
    expect: [[R5E, "5.5"], [R5E, "5.1"]] },
  { id: "M26", note: "digitChoice tried at every digit again (quadratic on a long run of digits)", file: "src/components/ui/keep-run.tsx",
    edits: [["const DIGIT_CHOICE = new RegExp(`(^|\\\\D)(\\\\d+", "const DIGIT_CHOICE = new RegExp(`()(\\\\d+"]], expect: [[R5E, "5.5"], [R5E, "5.1"]] },
  { id: "M23", note: "the dash rule back to a \"unit, then a dash\" pattern (quadratic: '。' × 10,000 in half a second)", file: "src/components/ui/keep-run.tsx",
    edits: [["  ranges.push(...dashRanges(text));", "  for (const m of text.matchAll(new RegExp(`(?:[^\\\\s\\\\-–—/${IDEO}]+|\\\\S)(?:${KEPT_SPACE}[—–](?=\\\\s|$)|—+)`, \"gu\"))) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);"]],
    expect: [[R5E, "6.9"]] },
  { id: "M9", note: "H4 · the empty state's body inserts a no-break space before its dash again", file: "src/components/ui/empty-state-text.ts",
    edits: [["  return keepRanges(text, emptyStateRanges(text, keep), hangCjkMarks);", "  return text.replace(/ (?=—)/g, String.fromCharCode(160));"]], expect: [[R5E, "6.1"], [R5E, "6.5′"]] },
  { id: "M10", note: "F1 · the featured question back on text-wrap: pretty (\"…降雨超 / 过200毫米\")", file: "src/app/globals.css",
    edits: [[".mcardp--featured .mcardp-q { -webkit-line-clamp: 3; min-height: 0; overflow-wrap: break-word; }", ".mcardp--featured .mcardp-q { -webkit-line-clamp: 3; min-height: 0; overflow-wrap: break-word; text-wrap: pretty; }"]],
    expect: [[R5E, "2.1"], [R5E, "2.2"]] },
  { id: "M11", note: "F1 · the board's rows back on text-wrap: pretty", file: "src/app/globals.css",
    edits: [["  max-inline-size: 44ch;\n  text-wrap: balance;", "  max-inline-size: 44ch;\n  text-wrap: pretty;"]], expect: [[R5E, "2.1"], [R5E, "2.2"]] },
  { id: "M12", note: "F4 · /live's carousel greedy again", file: "src/app/live/featured-contest.tsx",
    edits: [["leading-tight text-text text-balance group-hover:text-aqua-100", "leading-tight text-text group-hover:text-aqua-100"]], expect: [[R5E, "2.1"]] },
  { id: "M13", note: "H1's sibling · /results' notable title without keepFigures", file: "src/app/results/page.tsx",
    edits: [["{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}", "{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}"]], expect: [[R5E, "2.1"]] },
  { id: "M14", note: "H1's sibling · the bet dialog's title without its figure runs", file: "src/components/markets/bet-confirm-modal.tsx",
    edits: [["{keepText(marketTitle, figureRuns(marketTitle))}", "{keepText(marketTitle)}"]], expect: [[R5E, "2.1"], [R4I, "5.5"]] },
  { id: "M15", note: "H1's sibling · the classic ticket's title without keepFigures", file: "src/components/markets/position-card.tsx",
    edits: [["          {keepFigures(marketTitle)}", "          {marketTitle}"]], expect: [[R5E, "2.1"]] },
  { id: "M16", note: "H1's sibling · the bet result's subtitle without keepFigures", file: "src/components/markets/conviction-dial.tsx",
    edits: [["? (marketTitle != null ? keepFigures(marketTitle) : t.common.positionOpenNotify)", "? (marketTitle ?? t.common.positionOpenNotify)"]], expect: [[R5E, "2.6"]] },
  { id: "M17", note: "doubt · the CJK gap's real space back in the text (find-in-page for \"，点击\" misses)", file: "src/lib/cjk-marks.tsx",
    edits: [["className={cls.endsWith(\"--q\") ? \"kp-cjk-gap kp-cjk-gap--q\" : \"kp-cjk-gap\"} />", "className={cls.endsWith(\"--q\") ? \"kp-cjk-gap kp-cjk-gap--q\" : \"kp-cjk-gap\"}>{\" \"}</span>"]],
    expect: [[R5E, "6.8"]] },
  { id: "M18", note: "doubt · moneyRuns no longer reads formatTzs' negative (\"TZS −4,200\")", file: "src/lib/fill-nodes.tsx",
    edits: [["const MONEY_RUN = /[+\\u2212]?TZS[\\u00a0 ]\\u2212?\\d", "const MONEY_RUN = /[+\\u2212]?TZS[\\u00a0 ]\\d"]], expect: [[R5E, "7.1"]] },
  { id: "M19", note: "H4's sweep · the toaster draws its title raw (\"Bet placed · YES TZS 1,000\" not mono, splittable)", file: "src/components/ui/toast.tsx",
    edits: [["{moneyRuns(toast.title)}", "{toast.title}"]], expect: [[R5E, "6.6"]] },
  { id: "M20", note: "H4's sweep · the refused sale's sentence joined with a no-break space again", file: "src/components/markets/sell-button.tsx",
    edits: [["description: msg, variant: fault ?", "description: msg.split(\"TZS \").join(\"TZS\" + String.fromCharCode(160)), variant: fault ?"]],
    expect: [[R5E, "6.6"], [R5E, "6.5′"], [SPG, "7.whole"]] },
  { id: "M21", note: "H4's sweep · the Up & Down stamp in no-break spaces again", file: "src/app/updown/[roundId]/page.tsx",
    edits: [["const stamp = quotedAt ? <span className=\"whitespace-nowrap\">{t.market.udQuoted} {quotedAt}</span> : null;", "const stamp = quotedAt ? `${t.market.udQuoted}\\u00A0${quotedAt}` : null;"]],
    expect: [[R5E, "6.7"], [R5E, "6.5′"]] },
];
/** A file that must NOT exist: written, proved, removed. */
const NEW_FILES = [
  { id: "M22", note: "H5 · keep-units.tsx back, imported by a card", file: "src/components/ui/keep-units.tsx",
    body: "export function keepUnits(text: string) { return text; }\r\n", alsoEdit: ["src/components/markets/position-card.tsx", "import { keepFigures } from \"@/components/ui/keep-words\";", "import { keepFigures } from \"@/components/ui/keep-words\";\r\nimport { keepUnits } from \"@/components/ui/keep-units\";"],
    expect: [[R5E, "8.1"]] },
];

const run = ([cmd, args]) => spawnSync(cmd, args, { encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
// The check's own line: "FAIL <id> · …", "FAIL <id> CONTROL · …" or "FAIL <id> PLANT · …".
const caughtBy = (out, status, id) => status !== 0 && out.split("\n").some((l) => /\bFAIL\b/.test(l) && (l.includes(` ${id} ·`) || l.includes(` ${id} CONTROL`) || l.includes(` ${id} PLANT`)));
// node mutation-r5e.mjs [M3 M7 …] runs only the plants named.
const only = new Set(process.argv.slice(2));
const pick = (p) => only.size === 0 || only.has(p.id);
let held = 0;
const total = PLANTS.filter(pick).length + NEW_FILES.filter(pick).length;
for (const p of PLANTS.filter(pick)) {
  const original = readFileSync(p.file);
  const before = sha(original);
  let text = original.toString("utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  for (const [from0, to0] of p.edits) {
    const from = from0.replace(/\n/g, eol), to = to0.replace(/\n/g, eol);
    const n = text.split(from).length - 1;
    if (n !== 1) { console.error(`REFUSED ${p.id}: ${JSON.stringify(from).slice(0, 100)} found ${n}× in ${p.file}`); process.exit(2); }
    text = text.replace(from, () => to);
  }
  const results = [];
  try {
    writeFileSync(p.file, text);
    const cache = new Map();
    for (const [suite, id] of p.expect) {
      const key = suite[1][1];
      if (!cache.has(key)) { const r = run(suite); cache.set(key, { out: `${r.stdout}\n${r.stderr}`, status: r.status }); }
      const { out, status } = cache.get(key);
      results.push({ suite: key, id, ok: caughtBy(out, status, id), status });
    }
  } finally {
    writeFileSync(p.file, original);
  }
  const after = sha(readFileSync(p.file));
  if (after !== before) { console.error(`RESTORE MISMATCH ${p.id} ${p.file}`); process.exit(3); }
  const all = results.every((r) => r.ok);
  if (all) held++;
  console.log(`${all ? "CAUGHT" : "MISSED"} ${p.id} · ${p.note} — ${results.map((r) => `${r.suite.replace("scripts/", "")} ${r.id}${r.ok ? "" : ` NOT (exit ${r.status})`}`).join("; ")} — ${p.file} restored ${after.slice(0, 12)}`);
}
for (const p of NEW_FILES.filter(pick)) {
  if (existsSync(p.file)) { console.error(`REFUSED ${p.id}: ${p.file} exists`); process.exit(2); }
  const [editFile, from, to] = p.alsoEdit;
  const original = readFileSync(editFile);
  const before = sha(original);
  const text = original.toString("utf8");
  if (text.split(from).length !== 2) { console.error(`REFUSED ${p.id}: anchor in ${editFile}`); process.exit(2); }
  const results = [];
  try {
    writeFileSync(p.file, p.body);
    writeFileSync(editFile, text.replace(from, () => to));
    for (const [suite, id] of p.expect) { const r = run(suite); results.push({ suite: suite[1][1], id, ok: caughtBy(`${r.stdout}\n${r.stderr}`, r.status, id), status: r.status }); }
  } finally {
    if (existsSync(p.file)) unlinkSync(p.file);
    writeFileSync(editFile, original);
  }
  const after = sha(readFileSync(editFile));
  if (after !== before || existsSync(p.file)) { console.error(`RESTORE MISMATCH ${p.id}`); process.exit(3); }
  const all = results.every((r) => r.ok);
  if (all) held++;
  console.log(`${all ? "CAUGHT" : "MISSED"} ${p.id} · ${p.note} — ${results.map((r) => `${r.suite.replace("scripts/", "")} ${r.id}${r.ok ? "" : ` NOT (exit ${r.status})`}`).join("; ")} — ${p.file} removed, ${editFile} restored ${after.slice(0, 12)}`);
}
console.log(`\nmutation-r5e: ${held}/${total} plants caught, every file restored byte-identical (sha-256)`);
process.exit(held === total ? 0 : 1);
