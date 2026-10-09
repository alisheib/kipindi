// C12: compare where the 16px clearance sits. A: pl-3 on the stake (A8f literal). B: pr-3 on the side word. C: none.
// "needless" = a row that wraps although, side by side, the side word and the stake would keep >= 16px apart.
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r6c/src/lib/i18n-dict.ts";
import { formatNumber } from "file:///F:/kipindi-r6c/src/lib/utils.ts";
const req = createRequire("F:/kipindi-r6c/package.json");
const fontkit = req("fontkit");
const f = fontkit.openSync("C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5e/sora-latin-var.woff2"); f.variationCoords = [700];
const adv = (ch: string) => { const gid = f._cmapProcessor.lookup(ch.codePointAt(0)); const vp = f._variationProcessor; return (f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0)) / f.unitsPerEm; };
const sora = (s: string, px: number, track = 0) => [...s].reduce((w, c) => w + adv(c) * px + track * px, 0);
const mono = (s: string, px: number, track = 0) => [...s].length * (0.6 + track) * px;
const tally = { A: { wrap: 0, needless: 0, tight: 0 }, B: { wrap: 0, needless: 0, tight: 0 }, C: { wrap: 0, needless: 0, tight: 0 } };
const lines: string[] = [];
for (const vw of [320, 360, 390, 412, 1024]) {
  const W = vw >= 1024 ? 440 - 64 - 42 : Math.min(vw - 32, 440) - 48 - 42;
  for (const loc of ["sw", "en", "zh"] as const) {
    const t = (dict as any)[loc];
    for (const side of ["yes", "no"] as const) for (const stake of [1_000, 10_000, 100_000, 1_000_000]) {
      const eye = mono(t.common.youArePicking.toUpperCase(), 10, 0.14);
      const sideW = sora(t.common[side], 26, -0.025);
      const fig = mono(`TZS ${formatNumber(stake)}`, 22);
      const rest = Math.max(mono(t.dialog.stakeLabel.toUpperCase(), 10, 0.14) - 1.4, mono(`1.00× ${t.dialog.conviction}`, 10));
      const fitsWithRoom = sideW + 16 + fig <= W && eye + Math.max(fig, rest) <= W;
      const v = {
        A: Math.max(eye, sideW) + Math.max(16 + fig, rest) > W,
        B: Math.max(eye, sideW + 16) + Math.max(fig, rest) > W,
        C: Math.max(eye, sideW) + Math.max(fig, rest) > W,
      };
      for (const k of ["A", "B", "C"] as const) {
        if (v[k]) tally[k].wrap++;
        if (v[k] && fitsWithRoom) tally[k].needless++;
        if (!v[k] && W - sideW - fig < 16) tally[k].tight++;
      }
      if (v.A !== v.B) lines.push(`${vw} ${loc} ${t.common[side]} ${formatNumber(stake)}: A ${v.A ? "wraps" : "beside"} · B ${v.B ? "wraps" : "beside"} (eyebrow ${eye.toFixed(0)} side ${sideW.toFixed(0)} fig ${fig.toFixed(0)} W ${W})`);
    }
  }
}
console.log(lines.join("\n"));
console.log(JSON.stringify(tally));
