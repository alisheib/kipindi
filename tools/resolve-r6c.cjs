// R6-C onto R5-J + R6-B + R6-A (temp tree F:/kipindi-wip). CRLF kept.
const fs = require("fs");
const cp = require("child_process");
const R = "F:/kipindi-wip/";
const RE = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/g;
const rd = (p) => fs.readFileSync(R + p, "utf8"), wr = (p, s) => fs.writeFileSync(R + p, s);
const NL = "\r\n";

// 1 · package.json: every suite line
{ let s = rd("package.json"); s = s.replace(RE, (_, a, b) => a + b); JSON.parse(s); wr("package.json", s); }

// 2 · performance/page.tsx: R6-A's break gate AND R6-C's journey words
{ const p = "src/app/positions/performance/page.tsx"; let s = rd(p); let n = 0;
  s = s.replace(RE, (_, a, b) => {
    n++;
    if (a.includes("const breakEnd = totalBets === 0")) return a + b;          // both blocks, R6-A's first
    if (a.includes("body={breakBody ?? t.performance.noPerformanceBody}")) {
      return "          title={journey ? t.journey.ticketsEmptySettled : t.performance.noPerformance}" + NL +
             "          body={breakBody ?? t.performance.noPerformanceBody}" + NL +
             "          action={breakBody ? null : <Link href={\"/markets\" as never} className=\"btn btn-primary btn-sm\">{t.positions.browseMarkets}</Link>}" + NL;
    }
    throw new Error("unexpected performance hunk");
  });
  if (n !== 2) throw new Error("performance hunks: " + n);
  wr(p, s); }

// 3 · performance/loading.tsx: R6-C's server file; the drawing (R5-K's rebuild, ours) moves into performance-ghost.tsx
{ const p = "src/app/positions/performance/loading.tsx"; let s = rd(p);
  const m = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/.exec(s);
  if (!m) throw new Error("no loading conflict");
  // The ours side is R5-K's whole drawing file only if the conflict spans it; take R5-K's file from the commit instead.
  const r5k = cp.execSync("git -C F:/kipindi-wip show HEAD:src/app/positions/performance/loading.tsx", { encoding: "utf8" });
  const theirsLoading = cp.execSync("git -C F:/kipindi-wip show fd5e50433:src/app/positions/performance/loading.tsx", { encoding: "utf8" });
  wr(p, theirsLoading.split(/\r?\n/).join(NL));
  let g = r5k.replace(/\r\n/g, "\n");
  const head = "export default function PerformanceLoading() {";
  if (g.split(head).length !== 2) throw new Error("R5-K drawing head");
  g = g.replace(head, "export function PerformanceGhost({ journey }: { journey: boolean }) {");
  const eb = "<PageHeader eyebrow={t.common.positions} title={t.performance.title} />";
  if (g.split(eb).length !== 2) throw new Error("R5-K eyebrow");
  g = g.replace(eb, "<PageHeader eyebrow={journey ? t.journey.tabTickets : t.common.positions} title={t.performance.title} />");
  const doc = "/**\n * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2)";
  if (g.split(doc).length !== 2) throw new Error("R5-K doc anchor");
  g = g.replace(doc, "/**\n * /positions/performance loading skeleton — the drawing, moved here from `loading.tsx` (this folder) with its name, its prop\n" +
    " * and the eyebrow's journey arm (round 6, 2026-10-09, review C14): the page calls its section \"Tiketi zangu\" in the journey,\n" +
    " * so the drawing lands on the same words; `loading.tsx` is the server file that asks the journey answer and hands it over\n" +
    " * (R5-H's convention, as `wallet/withdraw/loading.tsx`). Merged 2026-10-09: R5-K's rebuilt drawing, R6-C's move.\n" +
    " * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2)");
  wr("src/app/positions/performance/performance-ghost.tsx", g.split("\n").join(NL)); }

// 4 · eyebrow-roles: R5-K's entries (performance's two re-pathed to the ghost), R6-C's re-signed status, R5-J's streak
{ const p = "scripts/design-gate/eyebrow-roles.mjs"; let s = rd(p); let n = 0;
  s = s.replace(RE, (_, a, b) => {
    n++;
    const aLines = a.split(/\r?\n/).filter(Boolean), bLines = b.split(/\r?\n/).filter(Boolean);
    const out = [];
    for (const l of aLines) {
      if (l.includes("app/positions/performance/loading.tsx ::")) out.push(l.replace("app/positions/performance/loading.tsx ::", "app/positions/performance/performance-ghost.tsx ::"));
      else if (l.includes("app/positions/performance/page.tsx :: <p className=\\\"font-mono text-micro uppercase tracking-[0.08em] text-text-muted\\\">{r.statusLabel}")) continue; // R6-C re-signed it
      else out.push(l);
    }
    for (const l of bLines) {
      if (l.includes("{t.performance.longestStreak} {longestStreak}")) continue;                     // R5-J's formatNumber line kept
      out.push(l);
    }
    return out.join(NL) + NL;
  });
  if (n !== 1) throw new Error("eyebrow hunks: " + n);
  wr(p, s); }

// 5 · ui-consistency baseline: R6-C's key (the number is re-measured after)
{ const p = "scripts/ui-consistency-baseline.json"; let s = rd(p); s = s.replace(RE, (_, a, b) => a + b); JSON.parse(s); wr(p, s); }

// 6 · spacing-scale: both notes; the number is re-measured after (placeholder 0)
{ const p = "scripts/spacing-scale.test.mts"; let s = rd(p); let n = 0;
  s = s.replace(RE, (_, a, b) => {
    n++;
    const strip = (x) => x.replace(/^const CEILING = \d+;\s*/, "").replace(/\r?\n$/, "");
    const oursNote = strip(a), theirsNote = strip(b);
    const tailAt = oursNote.indexOf(" // -2, 2026-10-09 (round 4 of the visual pass, R4-K");
    const theirsHead = theirsNote.slice(0, theirsNote.indexOf(" // "));
    return "const CEILING = 0;   " + theirsHead + " " + oursNote + NL;
  });
  if (n !== 1) throw new Error("spacing hunks: " + n);
  wr(p, s); }

for (const p of ["package.json", "src/app/positions/performance/page.tsx", "src/app/positions/performance/loading.tsx", "scripts/design-gate/eyebrow-roles.mjs", "scripts/ui-consistency-baseline.json", "scripts/spacing-scale.test.mts"])
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(rd(p))) throw new Error("markers left in " + p);
console.log("ok");
