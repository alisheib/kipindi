// C12: the bet confirm's side | stake row (bet-confirm-modal.tsx 299-318) — does "TZS <stake>" (mono 22px, NOT `.amount`,
// so it may break at its space) keep whole at phone widths? Flex row, justify-between, no gap, both items shrinkable.
// Widths: Sora 700 from next/font's Sora latin variable (S\r5e\sora-latin-var.woff2, fontkit, HVAR at wght 700);
// JetBrains Mono is monospaced at 0.6em for every glyph used here (digits, comma, ×, ., Latin capitals).
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
for (const vw of [320, 360, 390, 412]) {
  const W = Math.min(vw - 32, 440) - 48 - 42; // Modal px-3 (16+16) · body px-5 (24+24) · box border 1+1 + p-4 (20+20)
  for (const loc of ["sw", "en"] as const) {
    const t = (dict as any)[loc];
    for (const side of ["yes", "no"] as const) {
      for (const stake of [1_000, 10_000, 100_000, 1_000_000]) {
        const eyebrow = t.common.youArePicking.toUpperCase();
        const sideWord = t.common[side];
        const Lmax = Math.max(mono(eyebrow, 10, 0.14), sora(sideWord, 26, -0.025));
        const Lmin = Math.max(...words(eyebrow).map((w: string) => mono(w, 10, 0.14)), sora(sideWord, 26, -0.025));
        const fig = `TZS ${formatNumber(stake)}`;
        const conv = `1.00× ${t.dialog.conviction}`;
        const Rmax = Math.max(mono(t.dialog.stakeLabel.toUpperCase(), 10, 0.14), mono(fig, 22), mono(conv, 10));
        const Rmin = Math.max(...words(fig).map((w) => mono(w, 22)), ...words(conv).map((w) => mono(w, 10)));
        let L = Lmax, R = Rmax;
        if (L + R > W) {
          const over = L + R - W;
          L = Lmax - over * Lmax / (Lmax + Rmax); R = Rmax - over * Rmax / (Lmax + Rmax);
          if (L < Lmin) { L = Lmin; R = W - L; } else if (R < Rmin) { R = Rmin; L = W - R; }
        }
        const figW = mono(fig, 22);
        if (figW > R + 0.01) console.log(`${vw} ${loc} ${sideWord.padEnd(6)} ${fig.padEnd(14)} box ${W}px: left ${L.toFixed(1)} | right ${R.toFixed(1)} < "${fig}" ${figW.toFixed(1)} → "TZS" / "${formatNumber(stake)}" on two lines`);
      }
    }
  }
}
console.log("(lines printed only where the figure breaks)");
