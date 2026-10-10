// 2026-10-10 (round 6's read): /results' spotlight flag takes `whitespace-nowrap` (page and drawing); re-sign the two pins.
const fs = require("fs");
const R = "F:/kipindi-vis/";
const OLD = "ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold";
const NEW = "ml-auto inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-micro uppercase tracking-[0.16em] font-bold";
for (const [p, want] of [["scripts/visual-pass-r5l.test.mts", 2], ["scripts/design-gate/eyebrow-roles.mjs", 2]]) {
  let s = fs.readFileSync(R + p, "utf8");
  const n = s.split(OLD).length - 1;
  if (n !== want) throw new Error(`${p}: ${n} (want ${want})`);
  s = s.split(OLD).join(NEW);
  if (p.endsWith("r5l.test.mts")) {
    const a = '  { band: "its flag", page:';
    if (s.split(a).length !== 2) throw new Error("r5l anchor");
    s = s.replace(a, '  // 2026-10-10: the flag is one unbreakable unit on the page and in the drawing (`whitespace-nowrap`, round 6\'s read).\n' + a);
  }
  fs.writeFileSync(R + p, s);
  console.log("ok", p);
}
