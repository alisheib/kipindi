// Moves the hero's static intro (Claim, STEM_START + Ask, TrustLines) out of landing-hero.tsx into hero-intro.tsx,
// verbatim, keeping CRLF. Run once from F:\kipindi-r4j.
const fs = require("fs");
const HERO = "src/components/home/landing-hero.tsx";
const INTRO = "src/components/home/hero-intro.tsx";
const s = fs.readFileSync(HERO, "utf8");
if (!s.includes("\r\n")) throw new Error("expected CRLF");
const a = s.indexOf("/**\r\n * The claim — ");
const b = s.indexOf("/**\r\n * ONE ROW OF THE CLOSING-SOONEST BOARD");
if (a < 0 || b < a) throw new Error("boundaries");
let block = s.slice(a, b);
for (const name of ["Claim", "Ask", "TrustLines"]) {
  const from = `\r\nfunction ${name}(`;
  if (block.split(from).length !== 2) throw new Error(`function ${name} not once`);
  block = block.replace(from, `\r\nexport function ${name}(`);
}
block = block.replace(/(\r\n)+$/, "\r\n");
const header = [
  "/**",
  " * THE HERO'S STATIC INTRO — the claim, the question (the h1) and the trust rows, the part of the landing hero that",
  " * reads no market and no session: only the words, the locale and the wallets that pay out. Moved here VERBATIM from",
  " * `landing-hero.tsx` (2026-10-09, the visual pass round 4, R4-J) so that the journey's loading ghost for `/`",
  " * (`components/journey/route-ghost.tsx`) can draw the very same claim, h1 and rows the page lands with, and so lands",
  " * where it promised in every language: the h1 is two lines in sw and en and one in zh, the claim one line or two.",
  " * ⛔ WHY A MODULE OF ITS OWN. The ghost is drawn by the ROOT loading file, and every client module a root-segment",
  " * server file reaches joins the scripts EVERY page loads first (VODACOM-PLAN §0h point 20, the WP6c lesson).",
  " * `landing-hero.tsx` imports the market card, the filter pill and the tipping bar; this file imports only what the",
  " * three parts draw with (the wordmark from `brand.tsx`, already in every page's first load, and two glyphs).",
  " * `landing-hero.tsx` renders all three exactly where it did, with the same props. `test:hero-copy` reads the two files",
  " * as one hero (§1 `heroClaimFirst` is read in this file alone), and `test:visual-pass-r4j` §3 holds the imports.",
  " */",
  'import { I } from "@/components/ui/glyphs";',
  'import { FiftyWordmark } from "@/components/brand";',
  'import { fill } from "@/lib/utils";',
  'import { FIRST_LICENSED_EVIDENCE } from "@/lib/support-config";',
  'import { railListParts } from "@/lib/rail-list";',
  'import type { Dict, Locale } from "@/lib/i18n-dict";',
  'import { sideWord } from "@/lib/side-label";',
  "",
  "",
].join("\r\n");
fs.writeFileSync(INTRO, header + block, "utf8");
// landing-hero: cut the block, import the three parts, drop the imports only they used.
let h = s.slice(0, a) + s.slice(b);
const drop = [
  ['import { FiftyMark, FiftyWordmark, TippingBar } from "@/components/brand";', 'import { FiftyMark, TippingBar } from "@/components/brand";'],
  ['import { FIRST_LICENSED_EVIDENCE } from "@/lib/support-config";\r\n', ""],
  ['import { railListParts } from "@/lib/rail-list";\r\n', ""],
];
for (const [from, to] of drop) {
  if (h.split(from).length !== 2) throw new Error(`import not once: ${from}`);
  h = h.replace(from, to);
}
const anchor = 'import { Cash } from "@/components/ui/cash";\r\n';
if (h.split(anchor).length !== 2) throw new Error("anchor");
h = h.replace(anchor, anchor + '// The claim, the h1 and the trust rows: the hero\'s static intro, a module of its own so the loading ghost for `/` can draw\r\n// it too without loading this file\'s market card (R4-J, 2026-10-09; `hero-intro.tsx` says why).\r\nimport { Ask, Claim, TrustLines } from "./hero-intro";\r\n');
fs.writeFileSync(HERO, h, "utf8");
console.log("moved", block.length, "chars;", "intro", (header + block).length);
