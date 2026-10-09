// R5-C onto R5-B + R5-D. CRLF kept.
const fs = require("fs");
const R = "F:/kipindi-vis/";
const rd = (p) => fs.readFileSync(R + p, "utf8");
const wr = (p, s) => fs.writeFileSync(R + p, s);
const one = (s, p) => {
  const re = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/;
  const m = re.exec(s);
  if (!m) throw new Error("no conflict in " + p);
  return { m, re };
};

// 1 · package.json: both suite lines
{
  const p = "package.json"; let s = rd(p);
  const { re } = one(s, p);
  s = s.replace(re, (_, a, b) => a + b);
  if (/<<<<<<<|>>>>>>>/.test(s)) throw new Error("package.json still conflicted");
  JSON.parse(s); wr(p, s);
}

// 2 · spacing-scale: both removals; the measured count is set after the merge (CEILING_MERGED below, then re-measured)
{
  const p = "scripts/spacing-scale.test.mts"; let s = rd(p);
  const { re } = one(s, p);
  s = s.replace(re, (_, a, b) => {
    const oursNote = a.replace(/^const CEILING = \d+;\s*/, "").replace(/\r?\n$/, "");
    const theirsNote = b.replace(/^const CEILING = \d+;\s*/, "").replace(/\r?\n$/, "");
    return `const CEILING = 453;   // -2, 2026-10-09 (round 5, merged): both removals below, measured on the merged tree. ${oursNote} ${theirsNote}\r\n`;
  });
  if (/<<<<<<<|>>>>>>>/.test(s)) throw new Error("spacing-scale still conflicted");
  wr(p, s);
}

// 3 · deposit/loading.tsx: OURS (R5-D moved the drawing into DepositGhost); R5-C's brand CTA goes into deposit-ghost.tsx
{
  const p = "src/app/wallet/deposit/loading.tsx"; let s = rd(p);
  const { re } = one(s, p);
  s = s.replace(re, (_, a) => a);
  if (/<<<<<<<|>>>>>>>/.test(s)) throw new Error("deposit loading still conflicted");
  wr(p, s);
  const g = "src/app/wallet/deposit/deposit-ghost.tsx"; let t = rd(g);
  const pairs = [
    ["{/* Gold confirm CTA */}", "{/* The confirm CTA — brand, as the button it stands for (D1: a deposit commit is brand, never gold; R5-C, 2026-10-09). */}"],
    ["— the gold confirm is a", "— the confirm is a"],
    ["rounded-md bg-gold-500/25 kp-shimmer-track", "rounded-md bg-brand-500/25 kp-shimmer-track"],
  ];
  for (const [x, y] of pairs) { if (!t.includes(x)) throw new Error("deposit-ghost anchor: " + x); t = t.split(x).join(y); }
  wr(g, t);
}

// 4 · first-visit-primer: OURS' className (R5-B's dock padding) with both notes
{
  const p = "src/components/onboarding/first-visit-primer.tsx"; let s = rd(p);
  const { re } = one(s, p);
  s = s.replace(re, (_, a) => a.replace(
    "`overflow-hidden` was really buying: the gilt corners clipped to the rounded edge.",
    "`overflow-hidden` was really buying (the gilt corners clipped to the rounded edge — gone since R5-C's gold audit; the\r\n         progress strip still runs to the sheet's edge).",
  ));
  if (/<<<<<<<|>>>>>>>/.test(s)) throw new Error("primer still conflicted");
  wr(p, s);
}
console.log("resolved");
