// Which line breaks fall INSIDE a Chinese word, per surface and wrap mode, over the seeded Chinese titles?
// The reference words are Node's ICU dictionary segmentation (Intl.Segmenter "zh", word) — an analysis aid only.
import { pieces, greedy, pretty, balanceScore, balanceBisect, render, type Box, type Piece } from "./wrapmodel.mts";
import { segments } from "./segs.mts";

const MODE = process.env.MODE ?? "new";
const kw = await import(MODE === "orig" ? "./orig/keep-words.tsx" : "file:///F:/kipindi-r5e/src/components/ui/keep-words.tsx");
const keepFigures = kw.keepFigures as (s: string) => unknown;

const ZH = [
  "辛巴俱乐部赢得2026-27赛季NBC超级联赛", "扬加晋级非洲冠军联赛小组赛", "美元兑坦桑尼亚先令二季度末收于2,650以下", "坦桑尼亚央行下次会议维持利率",
  "达累斯萨拉姆七月降雨超过200毫米", "比特币8月1日收于10万美元以上",
  "Simba SC能否赢得2026年坦桑尼亚超级联赛？", "Young Africans SC能否晋级非洲冠军联赛小组赛？", "坦桑尼亚2026年第三季度GDP增长能否超过6%？",
  "达累斯萨拉姆2026年7月降雨量能否超过200毫米？", "比特币价格能否在2026年8月底前超过15万美元？", "Diamond Platnumz能否在2026年10月前发行新专辑？",
  "SGR多多马-辛吉达段能否在2026年12月前投入运营？", "比特币能否在2026年8月底前超过15万美元？", "Simba SC 会赢得 2027/28 赛季 NBC 超级联赛冠军吗？",
];
const seg = new Intl.Segmenter("zh", { granularity: "word" });
/** Character offsets that are NOT word boundaries (inside an ICU word of two or more characters). */
function inside(t: string): Set<number> {
  const s = new Set<number>();
  for (const w of seg.segment(t)) { const n = Array.from(w.segment).length; if (n > 1 && w.isWordLike) { const at = Array.from(t.slice(0, w.index)).length; for (let k = 1; k < n; k++) s.add(at + k); } }
  return s;
}
/** Character offsets where each line after the first starts. */
function starts(ps: Piece[], ends: number[]): number[] {
  const lines = render(ps, ends);
  const out: number[] = [];
  let at = 0;
  for (let i = 0; i < lines.length - 1; i++) { at += Array.from(lines[i].text.replace(/ $/, "")).length; out.push(at); }
  return out;
}

type Surface = { name: string; box: Box; col: (vw: number) => number; widths: number[] };
const DASH = 22 * (0.6 - 0.02);
const SURFACES: Surface[] = [
  { name: "featured", box: { size: 15, wght: 600, ls: -0.015 }, col: (vw) => vw - 32 - 46 - DASH, widths: [320, 360, 390, 412] },
  { name: "board-row", box: { size: 17, wght: 700, ls: -0.01 }, col: (vw) => vw - 32, widths: [320, 360, 390, 412] },
  { name: "grid-card", box: { size: 15, wght: 600, ls: -0.015 }, col: (vw) => vw - 32 - 46 - DASH, widths: [320, 360, 390] },
  { name: "live-carousel", box: { size: 19, wght: 600, ls: 0 }, col: (vw) => vw - 32 - 2 - 2 * 20, widths: [320, 360, 390] },
];
const tally: Record<string, Record<string, number>> = {};
for (const sf of SURFACES) {
  tally[sf.name] = { greedy: 0, pretty: 0, balance: 0, bisect: 0, cases: 0 };
  for (const t of ZH) {
    const bad = inside(t);
    const ps = pieces(segments(keepFigures(t)), sf.box);
    for (const vw of sf.widths) {
      const W = sf.col(vw);
      const r: Record<string, number[]> = { greedy: greedy(ps, W), pretty: pretty(ps, W, sf.box), balance: balanceScore(ps, W, sf.box), bisect: balanceBisect(ps, W) };
      if (r.greedy.length < 2) continue;
      tally[sf.name].cases++;
      const line: string[] = [];
      for (const [k, ends] of Object.entries(r)) {
        const cut = starts(ps, ends).filter((x) => bad.has(x));
        if (cut.length) { tally[sf.name][k]++; }
        line.push(`${k}${cut.length ? "✗" : "✓"} ${render(ps, ends).map((l) => l.text).join(" / ")}`);
      }
      if (process.env.V || line.some((l) => l.includes("✗"))) console.log(`${sf.name} ${vw} ${t}\n   ${line.join("\n   ")}`);
    }
  }
}
console.log("\nsplits inside an ICU word (cases with 2+ lines):");
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(14)} ${JSON.stringify(v)}`);
