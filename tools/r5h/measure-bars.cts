/* R5-H · G-2b · do the money books' bars wrap at lg? The kit pill's width from the repo's own fonts (fontkit): 2px border
 * + 2×16px padding + the 13px semibold label (Inter 600 ≈ the mean of Medium 500 and Bold 700) + 8px gap + an 11px mono
 * bold count ("00", two digits). Row 1 at lg: the strip beside the count phrase (16px apart); row 2 at lg: the state and
 * window groups (each: the 10px mono bold uppercase key, its 2px, 4px, then five chips 4px apart), 29px apart.
 * Run from the worktree:  npx tsx <this file> */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5h/package.json");
const fontkit = req("fontkit");
const { dict } = req("F:/kipindi-r5h/src/lib/i18n-dict.ts");
const F = (n: string) => fontkit.openSync(`F:/kipindi-r5h/src/lib/server/reports/fonts/${n}`);
const interM = F("Inter-Medium.ttf"), interB = F("Inter-Bold.ttf"), monoB = F("JetBrainsMono-Bold.ttf"), monoR = F("JetBrainsMono-Regular.ttf");
const w = (font: any, s: string, px: number, track = 0) => font.layout(s).glyphs.reduce((a: number, g: any) => a + g.advanceWidth, 0) / font.unitsPerEm * px + track * px * [...s].length;
// CJK falls back to a system face; an ideograph is 1em wide in every CJK face.
const text = (s: string, px: number) => [...s].reduce((a, ch) => a + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? px : (w(interM, ch, px) + w(interB, ch, px)) / 2), 0);
const pill = (label: string) => 2 + 32 + text(label, 13) + 8 + w(monoB, "00", 11);
const key = (s: string) => [...s.toUpperCase()].reduce((a, ch) => a + (/[\u3000-\u9fff]/.test(ch) ? 10 : w(monoB, ch, 10)), 0) + 0.14 * 10 * [...s].length + 2;
const COLUMN = { "1024": 1024 - 64, "1280": 1080 - 64 };
/** How many lines a wrapping flex row of these widths takes in `room`, items `gap` apart. */
const lines = (items: number[], room: number, gap: number) => { let n = 1, x = 0; for (const it of items) { if (x > 0 && x + gap + it > room) { n++; x = it; } else x = x === 0 ? it : x + gap + it; } return n; };
for (const l of ["sw", "en", "zh"] as const) {
  const t = dict[l];
  const walletLenses = [t.common.all, t.wallet.typeIn, t.wallet.typeOut, t.wallet.typeBet, t.wallet.typePayout, t.wallet.typeRefund, t.wallet.typeBonus, t.wallet.typeAdjust];
  const receiptLenses = [t.common.all, t.receipts.lensDeposits, t.receipts.lensWithdrawals];
  const states = [t.market.oddsAny, t.wallet.stateFlight, t.wallet.txnStatusConfirmed, t.wallet.txnStatusFailed, t.wallet.txnStatusReversed];
  const whens = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll];
  const group = (k: string, chips: string[]) => key(k) + 4 + chips.map(pill).reduce((a, b) => a + b + 4, -4);
  const g1 = group(t.wallet.stateKey, states), g2 = group(t.common.when, whens);
  for (const [vw, col] of Object.entries(COLUMN)) {
    const row1 = (lenses: string[], noun: string) => {
      const count = [...noun.replace("{n}", "12")].reduce((a, ch) => a + (/[\u3000-\u9fff]/.test(ch) ? 11.5 : w(monoR, ch, 11.5)), 0);
      const strip = col - count - 16;
      const ws = lenses.map(pill);
      return `${lines(ws, strip, 4)} line(s) [pills ${ws.reduce((a, b) => a + b + 4, -4).toFixed(0)}px in ${strip.toFixed(0)}px]`;
    };
    const row2 = lines([g1, g2], col, 29);
    console.log(`${l} ${vw}: wallet row1 ${row1(walletLenses, t.wallet.nResults)} · receipts row1 ${row1(receiptLenses, t.receipts.nResults)} · row2 ${row2} line(s) [groups ${g1.toFixed(0)} + 29 + ${g2.toFixed(0)} = ${(g1 + 29 + g2).toFixed(0)}px in ${col}px]`);
  }
}
