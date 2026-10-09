// R5-G · G-5 measurements: the regulator's name and the lines that carry it, in the repo's own Inter (fontkit).
// Run from F:\kipindi-r5g:  npx tsx <this file>
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r5g/src/lib/i18n-dict.ts";

const req = createRequire("file:///F:/kipindi-r5g/package.json");
const fontkit = req("fontkit") as { openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number } };
const F = (n: string) => fontkit.openSync(`F:/kipindi-r5g/src/lib/server/reports/fonts/${n}.ttf`);
const inter = F("Inter-Regular"), mono = F("JetBrainsMono-Regular");
const IDEO = /[㐀-鿿豈-﫿　-〿＀-￯]/;
const w = (f: ReturnType<typeof F>, s: string, size: number, track = 0) => {
  const chars = [...s].filter((c) => !/\p{Cf}/u.test(c));
  const ideo = chars.filter((c) => IDEO.test(c)).length;
  const latin = chars.filter((c) => !IDEO.test(c)).join("");
  const adv = latin ? f.layout(latin).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * size : 0;
  return adv + ideo * size + track * chars.length;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

const NAME = { en: "Gaming Board of Tanzania", sw: "Bodi ya Michezo ya Kubahatisha Tanzania", zh: "坦桑尼亚博彩委员会" } as const;
console.log("── the name in Inter 13px (text-body-sm, −0.05px tracking) — R5-A's thresholds are this + 3, the full stop included in en/sw");
for (const l of ["en", "sw", "zh"] as const) {
  const n = w(inter, NAME[l] + (l === "zh" ? "" : "."), 13, -0.05);
  const s = dict[l].footer.licensedByGbt;
  console.log(`  ${l}: name ${r1(n)} → threshold ${Math.ceil(n + 3)} · sentence ${r1(w(inter, s, 13, -0.05))}px`);
}

console.log("\n── the opt-out shell's footer line and the offline document's: viewport − 2×16 (2×32 from 1024) − 28 roundel − 10 gap");
for (const vw of [320, 330, 333, 340, 360, 375, 390, 412, 768, 1024, 1280]) {
  const row = Math.min(vw, 1280) - (vw >= 1024 ? 64 : 32);
  const p = row - 38;
  const cells = (["en", "sw", "zh"] as const).map((l) => {
    const sent = w(inter, dict[l].footer.licensedByGbt, 13, -0.05);
    const need = w(inter, NAME[l] + (l === "zh" ? "" : "."), 13, -0.05) + 3;
    return `${l} ${sent <= p ? "one line" : p >= need ? "2 lines, name WHOLE (rule)" : "2 lines, line < name"}`;
  });
  console.log(`  ${String(vw).padStart(4)}: line ${p}px · ${cells.join(" · ")}`);
}

console.log("\n── global-error's licence line: 11px, centred, column = min(420, viewport − 48)");
const GE = {
  en: "18+ · Licensed by the Gaming Board of Tanzania",
  sw: "18+ · Imepewa leseni na Bodi ya Michezo ya Kubahatisha Tanzania",
  zh: "18+ · 由坦桑尼亚博彩委员会发照",
};
for (const l of ["en", "sw", "zh"] as const) {
  const line = w(inter, GE[l], 11), name = w(inter, NAME[l], 11);
  const firstFits = [320, 360, 375, 390, 412].map((vw) => `${vw}:${line <= Math.min(420, vw - 48) ? "1 line" : "wraps"}`).join(" ");
  console.log(`  ${l}: line ${r1(line)}px, name ${r1(name)}px — ${firstFits}`);
}

console.log("\n── the email footer: 11px Inter (Helvetica/Arial fall-backs are narrower), column = viewport − 2×10 under 600px");
const EM = "18+ · Licensed by Gaming Board of Tanzania";
console.log(`  ${r1(w(inter, EM, 11))}px against 300px at a 320 phone`);

console.log("\n── the OG image's footer row: 14px JetBrains Mono, a 1080px row (1200 − 2×60)");
const OG1 = "Predict events. Not chance.", OG2 = "Licensed by the Gaming Board of Tanzania · 18+";
console.log(`  ${r1(w(mono, OG1, 14))} + ${r1(w(mono, OG2, 14))} = ${r1(w(mono, OG1, 14) + w(mono, OG2, 14))}px of 1080`);

console.log("\n── the agent waterfall's GBT label (a deduction row: the name starts the label after the · marker)");
for (const l of ["en", "sw", "zh"] as const) {
  const label = String((dict[l].agent as Record<string, string>).wfGbt).replace("{pct}", "5");
  console.log(`  ${l}: "${label}" ${r1(w(inter, label, 13, -0.05))}px`);
}
