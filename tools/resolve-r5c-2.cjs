// Step 2 and 4 of resolve-r5c.cjs, rewritten: the ratchet notes share their history (write it ONCE), and the
// primer keeps R5-C's exact wording + R5-B's note. Steps 1 and 3 unchanged.
const fs = require("fs");
const R = "F:/kipindi-vis/";
const rd = (p) => fs.readFileSync(R + p, "utf8");
const wr = (p, s) => fs.writeFileSync(R + p, s);
const RE = /<<<<<<< ours\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> theirs\r?\n/;
const need = (s, p) => { if (!RE.test(s)) throw new Error("no conflict in " + p); };

{ const p = "package.json"; let s = rd(p); need(s, p);
  s = s.replace(RE, (_, a, b) => a + b); JSON.parse(s); wr(p, s); }

{ const p = "scripts/spacing-scale.test.mts"; let s = rd(p); need(s, p);
  s = s.replace(RE, (_, a, b) => {
    const HIST = " // -2, 2026-10-09 (round 4 of the visual pass, R4-K c15b3b61)";
    const head = (x) => { const i = x.indexOf(HIST); if (i < 0) throw new Error("history anchor"); return x.slice(0, i).replace(/^const CEILING = 454;\s+/, ""); };
    const tail = (x) => x.slice(x.indexOf(HIST));
    if (tail(a) !== tail(b)) throw new Error("the two histories differ");
    const r5b = head(a), r5c = head(b);
    const r5cMerged = r5c.replace("— measured 454 across 165 files.", "— measured on the merged tree with R5-B's -1 below: __MEASURED__.");
    if (r5cMerged === r5c) throw new Error("r5c measure anchor");
    return "const CEILING = __CEILING__;   " + r5cMerged + " " + r5b.replace(/^\/\/ /, "// ") + tail(a).replace(/^ /, "");
  });
  wr(p, s); }

{ const p = "src/app/wallet/deposit/loading.tsx"; let s = rd(p); need(s, p);
  s = s.replace(RE, (_, a) => a); wr(p, s);
  const g = "src/app/wallet/deposit/deposit-ghost.tsx"; let t = rd(g);
  for (const [x, y] of [
    ["{/* Gold confirm CTA */}", "{/* The confirm CTA — brand, as the button it stands for (D1: a deposit commit is brand, never gold; R5-C, 2026-10-09). */}"],
    ["— the gold confirm is a", "— the confirm is a"],
    ["rounded-md bg-gold-500/25 kp-shimmer-track", "rounded-md bg-brand-500/25 kp-shimmer-track"],
  ]) { if (t.split(x).length !== 2) throw new Error("deposit-ghost anchor (not exactly once): " + x); t = t.replace(x, y); }
  wr(g, t); }

{ const p = "src/components/onboarding/first-visit-primer.tsx"; let s = rd(p); need(s, p);
  s = s.replace(RE, (_, a, b) => {
    const theirsNote = b.split(/\r?\n/)[0] + "\r\n" + b.split(/\r?\n/)[1].replace(/ \*\/$/, "") + "\r\n";
    const oursRest = a.split(/\r?\n/).slice(1).join("\r\n");
    return theirsNote + oursRest;
  });
  wr(p, s); }

for (const p of ["package.json", "scripts/spacing-scale.test.mts", "src/app/wallet/deposit/loading.tsx", "src/components/onboarding/first-visit-primer.tsx"])
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(rd(p))) throw new Error("markers left in " + p);
console.log("resolved");
