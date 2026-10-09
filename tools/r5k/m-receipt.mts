/* /wallet/receipt/[id] — the page (a CONFIRMED M-Pesa deposit, the common case: 8 rows) against today's ghost.
   Heights from the classes on the overridden scale; wrapped text from the fonts. Run: npx tsx m-receipt.mts */
import { width, lines, dict, column, WIDTHS, LOCALES } from "./lib-measure.mts";
const body13 = { face: "inter" as const, px: 13 };
const mono13 = { face: "mono" as const, px: 13 };
/** An id in runs of four (`keepIdRuns`): breaks only between runs; a short tail joins the run before it. */
function idLines(len: number, room: number): number {
  const runs = Math.floor(len / 4) + (len % 4 ? 0 : 0); const tail = len % 4;
  const rw = width("0000", mono13), tw = width("0".repeat(4 + tail), mono13);
  const ws = Array.from({ length: runs }, (_, i) => (i === runs - 1 && tail ? tw : rw));
  let n = 1, x = 0; for (const w of ws) { if (x > 0 && x + w > room + 0.01) { n++; x = w; } else x += w; } return n;
}
export function receiptPage(vw: number, l: string) {
  const t = dict[l], col = column("receipt", vw), lg = vw >= 1024, sm = vw >= 640;
  const hero = 2 + (lg ? 64 : 48) + 15 + 4 + 35 + 4 + 19.5;
  const rowIn = col - 2 - 40;
  const row = (label: string, ddLines: (room: number) => number) => {
    const dtW = width(label, body13); const room = rowIn - dtW - 16;
    return 32 + 18 * Math.max(1, ddLines(room));
  };
  const one = () => 1;
  const rows = [
    row(t.wallet.receiptType, one), row(t.wallet.amount, one), row(t.wallet.method, one),
    row(t.wallet.transactionId, (r) => idLines(28, r)), row(t.wallet.gatewayReference, (r) => idLines(24, r)),
    row(t.wallet.date, one), row(t.wallet.receiptCompletedAt, one), row(t.wallet.balanceAfter, one),
  ];
  const dl = 2 + rows.reduce((a, b) => a + b, 0) + (rows.length - 1);
  const buttons = sm ? 48 : 48 + 12 + 48;
  const foot = 21.125 * lines(t.wallet.receiptFootnote, body13, col);
  const bands = { back: 44, hero, chip: 21, dl, buttons, foot };
  return { bands, total: Object.values(bands).reduce((a, b) => a + b, 0) + 24 * 5, buttonsTop: 44 + 24 + hero + 24 + 21 + 24 + dl + 24 };
}
export function receiptGhostBefore(vw: number, l: string) {
  const sm = vw >= 640;
  const card = 2 + 48 + 16 + 28 + 1 + 16 * 5 + 7 * 20;
  const buttons = sm ? 48 : 108;
  const bands = { back: 44, eyebrow: 15, card, buttons };
  return { bands, total: 44 + 24 + 15 + 24 + card + 24 + buttons, buttonsTop: 44 + 24 + 15 + 24 + card + 24 };
}
if (import.meta.url.endsWith("m-receipt.mts")) {
  for (const l of LOCALES) for (const vw of WIDTHS) {
    const p = receiptPage(vw, l), g = receiptGhostBefore(vw, l);
    console.log(`${l} ${vw}: page buttons@${p.buttonsTop.toFixed(1)} end ${p.total.toFixed(1)} | ghost buttons@${g.buttonsTop.toFixed(1)} end ${g.total.toFixed(1)} | buttons land ${(p.buttonsTop - g.buttonsTop).toFixed(1)}px lower · rows ${JSON.stringify(Object.fromEntries(Object.entries(p.bands).map(([k, v]) => [k, +v.toFixed(2)])))}`);
  }
}
