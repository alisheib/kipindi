// F1 / F4: the featured title's lines at each tile width, greedy / Chromium pretty / balance (score and bisection),
// from the real Sora (latin, variable) and 1em ideographs, with keepFigures' runs as the page renders them.
import { segments } from "./segs.mts";
import { pieces, greedy, pretty, balanceScore, balanceBisect, render, type Box } from "./wrapmodel.mts";

const MODE = process.env.MODE ?? "new";
const kw = await import(MODE === "orig" ? "./orig/keep-words.tsx" : "file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const keepFigures = kw.keepFigures as (s: string) => unknown;


// The featured card's question column (px): card = viewport - 32; - 2 border - 30 padding; - 14 gap - the 22px mono dash
// (0.6em advance - 0.02em tracking = 12.76). 1024: the hero's card is 456px wide (tile 026: x536-991).
const DASH = 22 * (0.6 - 0.02);
const col = (vw: number) => (vw === 1024 ? 456 : vw - 32) - 2 - 30 - 14 - DASH;
const box = (vw: number): Box => (vw >= 1024 ? { size: 20, wght: 700, ls: -0.015 } : vw >= 640 ? { size: 17, wght: 700, ls: -0.015 } : { size: 15, wght: 600, ls: -0.015 });

const show = (ls: Array<{ text: string; w: number }>) => ls.map((l) => `${l.text} (${l.w.toFixed(1)})`).join("  /  ");
const TITLES = (process.env.TITLES ?? "达累斯萨拉姆七月降雨超过200毫米|Dar es Salaam rainfall exceeds 200mm in July|Mvua Dar es Salaam yazidi 200mm Julai").split("|");
for (const t of TITLES) {
  console.log(`\n== ${t}  [${MODE}]`);
  for (const vw of [320, 360, 390, 412, 1024]) {
    const b = box(vw), W = col(vw);
    const ps = pieces(segments(keepFigures(t)), b);
    const g = render(ps, greedy(ps, W)), p = render(ps, pretty(ps, W, b)), bs = render(ps, balanceScore(ps, W, b)), bb = render(ps, balanceBisect(ps, W));
    console.log(`  ${vw} col ${W.toFixed(2)} (1/3 = ${(W / 3).toFixed(1)})`);
    console.log(`     greedy  : ${show(g)}`);
    console.log(`     pretty  : ${show(p)}`);
    console.log(`     balance : ${show(bs)}${show(bs) === show(bb) ? "   (bisection agrees)" : `\n     bisect  : ${show(bb)}`}`);
  }
}
