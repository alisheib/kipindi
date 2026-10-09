// Builds the EXPECTED_DIFFS block for the /positions empty state from the two capture files (measured, never typed),
// and splices it into scripts/qa-classic-shell-parity.mjs right after the EXPECTED_DIFFS literal. CRLF kept.
const fs = require("fs");
const path = require("path");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const FILE = "F:/kipindi-r4f/scripts/qa-classic-shell-parity.mjs";
const base = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json"), "utf8"));
const cur = JSON.parse(fs.readFileSync(path.join(S, "visual/parity-main-d9b7a5b6.json.current.json"), "utf8"));
const NL = "\n";
const WIDTHS = [360, 768, 1024, 1280];
const lay = (c, store) => store[c.regions.main.layout].split(NL);
const pairsOf = (k) => {
  const a = lay(base.cells[k], base.blobs), b = lay(cur.cells[k], cur.blobs);
  return a.map((x, i) => [x, b[i]]).filter(([x, y]) => x !== y);
};
const shared = [], own = { en: [], sw: [] };
for (const w of WIDTHS) {
  const en = pairsOf(`player|en|${w}|/positions`), sw = pairsOf(`player|sw|${w}|/positions`);
  const swSet = new Set(sw.map((p) => JSON.stringify(p))), enSet = new Set(en.map((p) => JSON.stringify(p)));
  shared.push({ w, pairs: en.filter((p) => swSet.has(JSON.stringify(p))) });
  own.en.push(...en.filter((p) => !swSet.has(JSON.stringify(p))));
  own.sw.push(...sw.filter((p) => !enSet.has(JSON.stringify(p))));
}
const lit = (p) => `[${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}]`;
const sharedText = shared.map(({ w, pairs }) => `  // ${w}${NL}${pairs.map((p) => `  ${lit(p)},`).join(NL)}`).join(NL);
const ownText = (l) => own[l].map((p) => `    ${lit(p)},`).join(NL);

// The three markup pairs, read from the two captures' /positions body (en; sw carries the same three strings).
const html = (c, store) => store[c.regions.main.html];
const hb = html(base.cells["player|en|360|/positions"], base.blobs), hc = html(cur.cells["player|en|360|/positions"], cur.blobs);
const ta = hb.split("<"), tc = hc.split("<");
const htmlPairs = [];
for (let i = 0; i < ta.length; i++) if (ta[i] !== tc[i]) {
  // Each differing tag, up to its closing ">" (the text after it is untouched).
  const a = "<" + ta[i].slice(0, ta[i].indexOf(">") + 1), c = "<" + tc[i].slice(0, tc[i].indexOf(">") + 1);
  if (ta[i].slice(ta[i].indexOf(">") + 1) !== tc[i].slice(tc[i].indexOf(">") + 1)) throw new Error("a text moved: " + ta[i]);
  htmlPairs.push([a, c]);
}
if (htmlPairs.length !== 3) throw new Error(`expected 3 markup pairs, got ${htmlPairs.length}`);
const htmlText = htmlPairs.map((p) => `      ${lit(p)},`).join(NL);

const block = `
/**
 * ⭐ THE VISUAL PASS (VODACOM-PLAN, 2026-10-08 and 09) — AND THE CLASSIC /positions EMPTY STATE, NAMED. Pushed after the
 * list's literal, as A8f's Sell entries are. The pass fixes the shared EmptyState for every player, so the one page body
 * this harness captures (the signed-in viewers' /positions, an empty demo portfolio) changes on purpose: its markup in
 * all 24 of those cells (positions-empty-state) and the boxes it draws, which differ by language in one line only, so each
 * language has its entry (positions-empty-state-layout-en and -sw). The lines below are MEASURED: the first compare after
 * the change (the visual-pass branch 90cb52ea against main d9b7a5b6's baseline) recorded each one, its .current.json was
 * read, and every pair is a line of the baseline and the line that compare drew in its place (A3: named, never
 * re-baselined). Each layout entry is \`alongside\` the markup entry, and 4.2b holds that pairing as 4.6 holds the Sell
 * cells'. The footer's proposals link, which the pass balanced too, is the journey's alone (AppShell's footer arms,
 * \`test:simple-journey-flag\` 10.shell.chrome.footer), so the footer fields need no entry: they compare equal.
 */
/** Every element line of the /positions body the new frame moves, at each width, the same in both languages. */
const POSITIONS_EMPTY_LINES = [
${sharedText}
];
EXPECTED_DIFFS.push(
  {
    id: "positions-empty-state",
    field: "regions.main.html",
    routes: [BODY_ROUTE],
    replace: [
${htmlText}
    ],
    cells: VIEWERS.filter((v) => v.door).length * LOCALES.length * WIDTHS.length,
    reason: "The visual pass, in the shared EmptyState, for every player — and so in the signed-in viewers' classic /positions body, the one page body this harness captures. Three strings move and no word does: the briefcase drawing's frame starts at its ink (R3-C b8277778, INK_TOP in empty-state.tsx: viewBox 0 14 56 42 at 56x42 where it was 0 0 56 56 at 56x56, one unit to one pixel as before; React now writes the frame's three attributes first), so the content sits as far under the dashed box's top as over its bottom (48px of padding each way, measured from the ink); the title takes G3's whole-word classes ([word-break:keep-all] [overflow-wrap:break-word]: Chinese breaks between words, never inside one); and the body takes them too, balanced (G3 95a8e2a5: text-balance, so a centred body never leaves one word under a full line). In all 24 signed-in /positions cells, en and sw alike. Served but captured by no field: where the body's two lines break at 360 (balancing moves the break, not the box), and the same frame and classes on every other EmptyState a classic player meets.",
  },
  {
    id: "positions-empty-state-layout-en",
    field: "regions.main.layout",
    routes: [BODY_ROUTE],
    replace: [
      ...POSITIONS_EMPTY_LINES,
${ownText("en")}
    ],
    cells: VIEWERS.filter((v) => v.door).length * WIDTHS.length,
    alongside: "positions-empty-state",
    reason: "The boxes the drawing's new frame draws in the 12 English /positions cells (the 3 signed-in viewers at 4 widths), measured (above): the drawing's wrapper and its svg 14px shorter (56x56 to 56x42); the five shapes inside 14px higher, since the frame now starts 14 units down; the title, the body, the call to action's row and its link 14px higher; and the empty state's dashed box, the page container and the wrapper above it 14px shorter (that wrapper, main>div0, 504.5 to 490.5 at 360 and 464 to 450 from 768; <main> itself, which fills the window, keeps its box). No x, no width and no computed style moves — the harness records no text-wrap, word-break or overflow-wrap, so G3's classes draw no signature, and the title and body keep their boxes (one line each from 768; at 360 the body's two). The call to action's link is the one line that differs by language — 142.5px wide here, 143 in Swahili — so Swahili has its own entry.",
  },
  {
    id: "positions-empty-state-layout-sw",
    field: "regions.main.layout",
    routes: [BODY_ROUTE],
    replace: [
      ...POSITIONS_EMPTY_LINES,
${ownText("sw")}
    ],
    cells: VIEWERS.filter((v) => v.door).length * WIDTHS.length,
    alongside: "positions-empty-state",
    reason: "The boxes the drawing's new frame draws in the 12 Swahili /positions cells (the 3 signed-in viewers at 4 widths), measured (above): the same 13 lines at each width as in English — the drawing 14px shorter, its shapes and everything under it 14px higher, the dashed box, the page container and the wrapper above it 14px shorter — and the call to action's link, 143px wide in Swahili (142.5 in English), 14px higher. No x, no width and no computed style moves.",
  },
);
`;

const src = fs.readFileSync(FILE, "utf8");
if (!src.includes("\r\n")) throw new Error("expected CRLF");
const anchor = "    reason: \"S6 WP11: the footer's rail reserve names the token --rail-h";
const at = src.indexOf(anchor);
if (at < 0 || src.indexOf(anchor, at + 1) >= 0) throw new Error("anchor not unique");
const close = "\r\n];\r\n";
const end = src.indexOf(close, at);
if (end < 0) throw new Error("no literal end");
const insertAt = end + close.length;
if (src.includes("positions-empty-state")) throw new Error("already inserted");
const out = src.slice(0, insertAt) + block.replace(/^\n/, "").split("\n").join("\r\n") + src.slice(insertAt);
fs.writeFileSync(FILE, out, "utf8");
console.log("inserted at", insertAt, "lines:", block.split("\n").length);
