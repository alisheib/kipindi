// C12 before/after: the bet confirm's side | stake row (bet-confirm-modal.tsx). Widths: Sora 700 (fontkit, HVAR at 700),
// JetBrains Mono 0.6em per glyph. Before: `flex items-baseline justify-between` (no wrap; both items shrink; the stake is
// mono but may break at its space). After (A8f's shape): `flex flex-wrap items-baseline justify-between gap-y-2`, the
// right column `grow text-right`, the stake `.amount` (nowrap) with `pl-3` (16px) — the row wraps when the two columns'
// max-content widths do not fit, and the stake moves under the side whole.
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r6c/src/lib/i18n-dict.ts";
import { formatNumber } from "file:///F:/kipindi-r6c/src/lib/utils.ts";
const req = createRequire("F:/kipindi-r6c/package.json");
const fontkit = req("fontkit");
const SORA = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5e/sora-latin-var.woff2";
const f = fontkit.openSync(SORA); f.variationCoords = [700];
const adv = (ch: string) => {
  const gid = f._cmapProcessor.lookup(ch.codePointAt(0));
  const vp = f._variationProcessor;
  return (f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0)) / f.unitsPerEm;
};
const sora = (s: string, px: number, track = 0) => [...s].reduce((w, c) => w + adv(c) * px + track * px, 0);
const mono = (s: string, px: number, track = 0) => [...s].length * (0.6 + track) * px;
const words = (s: string) => s.split(" ");
let beforeSplits = 0, afterSplits = 0, afterWraps = 0, overflow = 0;
const rows: string[] = [];
for (const vw of [320, 360, 390, 412, 1024]) {
  const W = vw >= 1024 ? 440 - 64 - 42 : Math.min(vw - 32, 440) - 48 - 42;
  for (const loc of ["sw", "en"] as const) {
    const t = (dict as any)[loc];
    for (const side of ["yes", "no"] as const) {
      for (const stake of [1_000, 10_000, 100_000, 1_000_000]) {
        const eyebrow = t.common.youArePicking.toUpperCase();
        const sideWord = t.common[side];
        const fig = `TZS ${formatNumber(stake)}`;
        const conv = `1.00× ${t.dialog.conviction}`;
        const stakeEye = t.dialog.stakeLabel.toUpperCase();
        // BEFORE (the reviewer's model): proportional shrink, the figure breakable at its space.
        const Lmax = Math.max(mono(eyebrow, 10, 0.14), sora(sideWord, 26, -0.025));
        const Lmin = Math.max(...words(eyebrow).map((w: string) => mono(w, 10, 0.14)), sora(sideWord, 26, -0.025));
        const Rmax = Math.max(mono(stakeEye, 10, 0.14), mono(fig, 22), mono(conv, 10));
        const Rmin = Math.max(...words(fig).map((w) => mono(w, 22)), ...words(conv).map((w) => mono(w, 10)));
        let L = Lmax, R = Rmax;
        if (L + R > W) {
          const over = L + R - W;
          L = Lmax - over * Lmax / (Lmax + Rmax); R = Rmax - over * Rmax / (Lmax + Rmax);
          if (L < Lmin) { L = Lmin; R = W - L; } else if (R < Rmin) { R = Rmin; L = W - R; }
        }
        const splitBefore = mono(fig, 22) > R + 0.01;
        // AFTER: the right column's max-content (the stake whole, with its 16px lead; the eyebrow's trailing tracking taken back).
        const RmaxAfter = Math.max(mono(stakeEye, 10, 0.14) - 1.4, 16 + mono(fig, 22), mono(conv, 10));
        const wraps = Lmax + RmaxAfter > W;
        const rightBox = wraps ? W : W - Lmax;
        const fits = 16 + mono(fig, 22) <= rightBox + 0.01;
        if (splitBefore) beforeSplits++;
        if (wraps) afterWraps++;
        if (!fits) overflow++;
        rows.push(`${String(vw).padStart(4)} ${loc} ${sideWord.padEnd(6)} ${fig.padEnd(14)} box ${W}px | before: ${splitBefore ? `SPLIT ("TZS" / "${formatNumber(stake)}")` : "whole"} | after: ${wraps ? "stake under the side, whole" : "beside, whole"}${fits ? "" : " OVERFLOW"}`);
      }
    }
  }
}
console.log(rows.join("\n"));
console.log(`\nbefore: ${beforeSplits} cases split the stake; after: 0 can split (.amount nowrap), ${afterWraps} wrap the stake under the side whole, ${overflow} overflow`);
