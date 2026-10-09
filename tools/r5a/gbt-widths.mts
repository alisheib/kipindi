import { createRequire } from "node:module";
const fontkit = createRequire("file:///F:/kipindi-r5a/package.json")("fontkit") as any;
const inter = fontkit.openSync("F:/kipindi-r5a/src/lib/server/reports/fonts/Inter-Regular.ttf");
const w = (s: string, size = 13, track = -0.05) => inter.layout(s).positions.reduce((a: number, p: any) => a + p.xAdvance, 0) / inter.unitsPerEm * size + track * [...s].length;
const IDEO = /[\u3400-\u9fff]/;
const wm = (s: string) => [...s].filter((c) => IDEO.test(c)).length * 13 + w([...s].filter((c) => !IDEO.test(c) && c !== "\u200B").join(""));
for (const s of ["Licensed by the Gaming Board of Tanzania.", "Gaming Board of Tanzania.", "Licensed by the", "Licensed by the Gaming", "Board of Tanzania.", "Gaming Board", "of Tanzania.",
  "Leseni ya Bodi ya Michezo ya Kubahatisha Tanzania.", "Bodi ya Michezo ya Kubahatisha Tanzania.", "Leseni ya", "Leseni ya Bodi ya Michezo", "ya Kubahatisha Tanzania.", "Michezo ya Kubahatisha Tanzania.", "Leseni ya Bodi ya", "Bodi ya Michezo", "Leseni ya Bodi", "ya Michezo ya Kubahatisha Tanzania."])
  console.log(w(s).toFixed(1).padStart(7), s);
for (const s of ["获得坦桑尼亚\u200B博彩委员会\u200B许可。", "坦桑尼亚博彩委员会", "获得坦桑尼亚", "博彩委员会许可。"]) console.log(wm(s).toFixed(1).padStart(7), s);
// columns: <768 one column vw-32; 768..1023 (vw-32-96)/4; >=1024 (min(vw,1280)-64-96)/4
for (const vw of [320, 360, 390, 412, 768, 800, 900, 1023, 1024, 1150, 1168, 1280]) {
  const col = vw < 768 ? vw - 32 : vw < 1024 ? (vw - 32 - 96) / 4 : (Math.min(vw, 1280) - 64 - 96) / 4;
  console.log(`vw ${vw}: column ${col.toFixed(1)}`);
}
