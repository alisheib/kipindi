// Resolves R4-E onto R4-C: DotSeq's two part-shaping props (R4-C's renderPart, R4-E's keep) become ONE, renderPart;
// R4-E's stack stays. package.json keeps both suite lines. CRLF kept.
const fs = require("fs");
const root = "F:/kipindi-vis/";
const rd = (p) => fs.readFileSync(root + p, "utf8");
const wr = (p, s) => fs.writeFileSync(root + p, s);
const must = (s, a, label) => { if (!s.includes(a)) throw new Error("anchor missing: " + label); };

// package.json
{
  let s = rd("package.json");
  const re = /<<<<<<< ours\r?\n(\s*"test:visual-pass-r4d"[^\n]*\n)=======\r?\n(\s*"test:visual-pass-r4e"[^\n]*\n)>>>>>>> theirs\r?\n/;
  if (!re.test(s)) throw new Error("package.json conflict shape");
  s = s.replace(re, (_, a, b) => a + b);
  wr("package.json", s);
}

// dot-seq.tsx
{
  let s = rd("src/components/ui/dot-seq.tsx");
  const doc = /<<<<<<< ours\r?\n \* ⭐ `renderPart`[\s\S]*?>>>>>>> theirs\r?\n/;
  if (!doc.test(s)) throw new Error("dot-seq doc conflict");
  const docNew = [
    " * ⭐ `renderPart` (round 4, 2026-10-09) dresses or shapes the words INSIDE each part, the words unchanged: `moneyRuns`",
    " * on the notifications' titles (tiles 193 194 — \"Soko limefutwa · TZS 4,200 imerejeshwa\" sets its figure whole, in",
    " * the mono face), `keepYears` on the legal version line (\"Act 2022\" on one line, tile 210), `keepLastWords` on the",
    " * badge names (never \"Kwanza\" alone, tiles 186 188) — so a part that wraps inside itself still breaks well. Without it",
    " * each part is its own text, byte for byte as before.",
    " * ⭐ `stack` (round 4) is for a CENTRED line: one part per line, centred. The left-edge clip that hides a line-opening",
    " * dot cannot work when lines are centred — a centred second line has free room on its left, so its dot would show",
    " * there (\"· Ushindi wa Kwanza\"), and CSS cannot ask which item opens a line. So a stacked sequence never shares a",
    " * line: every part opens its own, and the dot is drawn transparent (still in a copy, still `aria-hidden`). The",
    " * badge shelf's bilingual names read \"First Win\" over \"Ushindi wa Kwanza\", and no line ends or opens on \"·\".",
    "",
  ].join("\r\n");
  s = s.replace(doc, () => docNew);
  const sig = /<<<<<<< ours\r?\nexport function DotSeq[\s\S]*?>>>>>>> theirs\r?\n/;
  if (!sig.test(s)) throw new Error("dot-seq signature conflict");
  const sigNew = [
    "export function DotSeq({ text, className, mono = false, stack = false, renderPart }: {",
    "  text: string;",
    "  className?: string;",
    "  mono?: boolean;",
    "  stack?: boolean;",
    "  renderPart?: (part: string) => ReactNode;",
    "}) {",
    "  const parts = text.split(\" · \");",
    "  const draw = (part: string) => (renderPart ? renderPart(part) : part);",
    "  if (parts.length < 2) return <span className={className}>{draw(text)}</span>;",
    "",
  ].join("\r\n");
  s = s.replace(sig, () => sigNew);
  const body = /<<<<<<< ours\r?\n(\s*\{draw\(part\)\}\r?\n)=======\r?\n\s*\{keep \? keep\(part\) : part\}\r?\n>>>>>>> theirs\r?\n/;
  if (!body.test(s)) throw new Error("dot-seq body conflict");
  s = s.replace(body, (_, a) => a);
  if (/<<<<<<<|>>>>>>>|=======/.test(s)) throw new Error("dot-seq still conflicted");
  wr("src/components/ui/dot-seq.tsx", s);
}

// call sites
for (const [p, a, b] of [
  ["src/app/legal/_components.tsx", "<DotSeq text={meta} mono keep={keepYears} />", "<DotSeq text={meta} mono renderPart={keepYears} />"],
  ["src/components/badges/Badge.tsx", "<DotSeq text={it.title} stack keep={keepLastWords} />", "<DotSeq text={it.title} stack renderPart={keepLastWords} />"],
]) { let s = rd(p); must(s, a, p); s = s.split(a).join(b); wr(p, s); }

// R4-E's suite: its pins follow the one prop
{
  const p = "scripts/visual-pass-r4e.test.mts";
  let s = rd(p);
  const pairs = [
    ["stack keep=\\{keepLastWords\\}", "stack renderPart=\\{keepLastWords\\}"],
    ["<DotSeq text={it.title} stack keep={keepLastWords} />", "<DotSeq text={it.title} stack renderPart={keepLastWords} />"],
    ["mono keep=\\{keepYears\\}", "mono renderPart=\\{keepYears\\}"],
    ["keep: keepLastWords", "renderPart: keepLastWords"],
    ["keep: keepYears", "renderPart: keepYears"],
    ["without `keep` and `stack`", "without `renderPart` and `stack`"],
  ];
  for (const [a, b] of pairs) { must(s, a, p + ": " + a); s = s.split(a).join(b); }
  if (/\bkeep[=:]\s*\\?\{?keep/.test(s)) throw new Error("a keep pin is left in " + p);
  wr(p, s);
}
console.log("resolved");
