const fs = require("fs");
const R = "F:/kipindi-vis/";
// 1 · visual-pass-r3c 9.4 follows DotSeq's one part-shaping prop (renderPart; R4-E's `keep` merged into it).
{
  const p = R + "scripts/visual-pass-r3c.test.mts";
  let s = fs.readFileSync(p, "utf8");
  const a = "(?: keep=\\{keepYears\\})?";
  if (!s.includes(a)) throw new Error("r3c 9.4 anchor");
  s = s.split(a).join("(?: renderPart=\\{keepYears\\})?");
  fs.writeFileSync(p, s);
}
// 2 · eyebrow-roles: the restore control's signature as eyebrow-sweep computes it (this line + the next, 170 chars),
//     after R4-C's -mt-1 — the same site, the same role (CONTROL_LABEL).
{
  const src = fs.readFileSync(R + "src/app/notifications/row-actions.tsx", "utf8").split(/\r?\n/);
  const i = src.findIndex((l) => l.includes('className="-mt-1 shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase'));
  if (i < 0) throw new Error("row-actions line");
  const head = src[i].replace(/\s+/g, " ").trim();
  let tail = "";
  for (let j = i + 1; j < Math.min(i + 3, src.length); j++) { const t = src[j].replace(/\s+/g, " ").trim(); if (t) { tail = t; break; } }
  const sig = (head + " ↵ " + tail).slice(0, 170);
  const p = R + "scripts/design-gate/eyebrow-roles.mjs";
  let s = fs.readFileSync(p, "utf8");
  const old = 'app/notifications/row-actions.tsx :: className=\\"shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-accent-400 hover:text-text hover:bg-bg-overl"';
  if (!s.includes(old)) throw new Error("registry anchor");
  const neu = "app/notifications/row-actions.tsx :: " + JSON.stringify(sig).slice(1, -1);
  s = s.split(old).join(neu + '"');
  fs.writeFileSync(p, s);
  console.log("new key:", neu);
}
