// C12 after (the shipped variant: the 16px on the side word): per width, which rows keep the stake beside the side and
// which move it under, whole — en/sw × YES/NO × 1,000…1,000,000 at 320–412 (phones) and 1024.
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r6c/src/lib/i18n-dict.ts";
import { formatNumber } from "file:///F:/kipindi-r6c/src/lib/utils.ts";
const req = createRequire("F:/kipindi-r6c/package.json");
const fontkit = req("fontkit");
const f = fontkit.openSync("C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5e/sora-latin-var.woff2"); f.variationCoords = [700];
const adv = (ch: string) => { const gid = f._cmapProcessor.lookup(ch.codePointAt(0)); const vp = f._variationProcessor; return (f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0)) / f.unitsPerEm; };
const sora = (s: string, px: number, track = 0) => [...s].reduce((w, c) => w + adv(c) * px + track * px, 0);
const mono = (s: string, px: number, track = 0) => [...s].length * (0.6 + track) * px;
for (const vw of [320, 360, 390, 412, 1024]) {
  const W = vw >= 1024 ? 440 - 64 - 42 : Math.min(vw - 32, 440) - 48 - 42;
  const cells: string[] = [];
  for (const loc of ["sw", "en"] as const) {
    const t = (dict as any)[loc];
    for (const side of ["yes", "no"] as const) {
      const under: string[] = [];
      for (const stake of [1_000, 10_000, 100_000, 1_000_000]) {
        const eye = mono(t.common.youArePicking.toUpperCase(), 10, 0.14);
        const sideW = sora(t.common[side], 26, -0.025);
        const fig = mono(`TZS ${formatNumber(stake)}`, 22);
        const rest = Math.max(mono(t.dialog.stakeLabel.toUpperCase(), 10, 0.14) - 1.4, mono(`1.00× ${t.dialog.conviction}`, 10));
        if (Math.max(eye, sideW + 16) + Math.max(fig, rest) > W) under.push(formatNumber(stake));
      }
      cells.push(`${loc} ${t.common[side]}: ${under.length ? `under from ${under[0]}` : "beside"}`);
    }
  }
  console.log(`${vw} (box ${W}px) · ${cells.join(" · ")}`);
}
