import { readFileSync, writeFileSync } from "node:fs";
const edit = (f, pairs) => {
  let s = readFileSync(f, "utf8");
  const E = (x) => (s.includes("\r\n") ? x.split("\n").join("\r\n") : x);
  for (const [a, b] of pairs) {
    if (!s.includes(E(a))) { console.error("MISSING in", f, ":", a.slice(0, 100)); process.exit(1); }
    s = s.replace(E(a), E(b));
  }
  writeFileSync(f, s);
  console.log("edited", f);
};
edit("F:/kipindi-r5e/src/app/updown/[roundId]/page.tsx", [
  [
    "  // No-break spaces: \"imenukuliwa 18:55:02 EAT\" is one unit and never splits at a line end.\n" +
    "  const quotedAt = asset.sourceQuotedAt ? fmtEAT(asset.sourceQuotedAt) : null;\n" +
    "  const stamp = quotedAt ? `${t.market.udQuoted}\\u00A0${quotedAt.replace(/ /g, \"\\u00A0\")}` : null;",
    "  // \"imenukuliwa 18:55:02 EAT\" is one unit and never splits at a line end: one nowrap run. Round 5 (2026-10-09, review 3\n" +
    "  // H4's sweep): it was no-break spaces — characters in the page's text, travelling into a copy and a find-in-page — and\n" +
    "  // is now a span, the keep helpers' convention (keep-words.tsx); the words are the dictionary's and the formatter's.\n" +
    "  const quotedAt = asset.sourceQuotedAt ? fmtEAT(asset.sourceQuotedAt) : null;\n" +
    "  const stamp = quotedAt ? <span className=\"whitespace-nowrap\">{t.market.udQuoted} {quotedAt}</span> : null;",
  ],
  [
    "  const source = decided\n" +
    "    ? `${t.market[SOURCE_CLASS_KEY[asset.sourceClass]]}${stamp ? ` · ${stamp}` : \"\"}`\n" +
    "    : t.market[SOURCE_CLASS_KEY[asset.sourceClass]];",
    "  const source = decided\n" +
    "    ? <>{t.market[SOURCE_CLASS_KEY[asset.sourceClass]]}{stamp && <>{\" · \"}{stamp}</>}</>\n" +
    "    : t.market[SOURCE_CLASS_KEY[asset.sourceClass]];",
  ],
]);
edit("F:/kipindi-r5e/src/components/updown/price-hero.tsx", [
  [
    "    source: string | null;  // \"Source: Kitco · quoted 14:34:58\" — null when unknown",
    "    source: ReactNode | null; // \"Source: Kitco · quoted 14:34:58\" (its stamp one nowrap run) — null when unknown",
  ],
]);
