// The featured title at every viewport 320–1280: where do greedy / pretty / balance break, and is 超过 ever split?
import { segments } from "./segs.mts";
import { pieces, greedy, pretty, balanceScore, balanceBisect, render, type Box } from "./wrapmodel.mts";
const kw = await import("file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const DASH = 22 * (0.6 - 0.02);
// Column: < 1024 the card spans the viewport less the gutters; ≥ 1024 the hero's card is 456px at 1024 — scale it with the
// hero column (the tiles: 456 at 1024). Here only < 1024 is swept exactly; 1024 and 1280 use the measured card widths.
const col = (vw: number) => (vw >= 1024 ? (vw === 1024 ? 456 : 456) : vw - 32) - 2 - 30 - 14 - DASH;
const box = (vw: number): Box => (vw >= 1024 ? { size: 20, wght: 700, ls: -0.015 } : vw >= 640 ? { size: 17, wght: 700, ls: -0.015 } : { size: 15, wght: 600, ls: -0.015 });
for (const t of ["达累斯萨拉姆七月降雨超过200毫米", "Dar es Salaam rainfall exceeds 200mm in July", "Mvua Dar es Salaam yazidi 200mm Julai"]) {
  const tally: Record<string, number[]> = { greedySplit: [], prettySplit: [], balanceSplit: [], balanceShortLast: [], greedyShortLast: [] };
  for (let vw = 320; vw <= 1024; vw++) {
    const b = box(vw), W = col(vw);
    const ps = pieces(segments(kw.keepFigures(t)), b);
    for (const [k, ends] of [["greedy", greedy(ps, W)], ["pretty", pretty(ps, W, b)], ["balance", balanceScore(ps, W, b)]] as const) {
      const lines = render(ps, ends);
      if (lines.some((l, i) => i < lines.length - 1 && l.text.endsWith("超"))) tally[`${k}Split`]?.push(vw);
      if (lines.length > 1 && lines[lines.length - 1].w < W / 3 && (k === "balance" || k === "greedy")) tally[`${k}ShortLast`]?.push(vw);
    }
    const bb = render(ps, balanceBisect(ps, W)).map((l) => l.text).join("/"), bs = render(ps, balanceScore(ps, W, b)).map((l) => l.text).join("/");
    if (bb !== bs) console.log(`  ${t.slice(0, 12)} vw ${vw}: score ${bs}  ≠  bisect ${bb}`);
  }
  const span = (a: number[]) => (a.length ? `${a.length} widths (${a[0]}–${a[a.length - 1]})` : "none");
  console.log(`${t}\n  超|过 split: greedy ${span(tally.greedySplit)}, pretty ${span(tally.prettySplit)}, balance ${span(tally.balanceSplit)}\n  last line < 1/3: greedy ${span(tally.greedyShortLast)}, balance ${span(tally.balanceShortLast)}`);
}
