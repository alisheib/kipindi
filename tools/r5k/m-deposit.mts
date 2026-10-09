/* /wallet/deposit — the page (mobile money chosen, no notice, no promo, money in open: the common case) against today's
   ghost. Run: npx tsx m-deposit.mts */
import { width, lines, linesSeg, moneySegs, dict, column, WIDTHS, LOCALES } from "./lib-measure.mts";
const body13 = { face: "inter" as const, px: 13 };
const fmt = (n: number) => n.toLocaleString("en-US");
export const DEP_NAMES = (t: any) => ["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas", t.wallet.methodCard];
/** One provider tile: py-3.5 · the 48px logo · gap-2 (12) · the name's lines (13px leading-tight, 16.25) · 1px border. */
export function tileH(name: string, tileW: number): number {
  const room = tileW - 2 - 24;
  return 2 + 14 + 48 + 12 + 16.25 * lines(name, { face: "inter", px: 13, weight: 500 }, room) + 14;
}
/** The provider grid (`kp-provgrid`): 2 columns on a phone (a lone last tile spans the row); from 640, thirds (3 + 2). */
export function gridH(names: string[], inner: number, sm: boolean, quarters = false, md = false): { h: number; rows: number } {
  const gap = 12;
  if (quarters) {
    const cols = md ? 4 : 2; const w = (inner - gap * (cols - 1)) / cols;
    const rows: number[][] = []; names.forEach((n, i) => { (rows[Math.floor(i / cols)] ??= []).push(tileH(n, w)); });
    return { h: rows.reduce((a, r) => a + Math.max(...r), 0) + gap * (rows.length - 1), rows: rows.length };
  }
  if (!sm) {
    const w2 = (inner - gap) / 2;
    const rows: number[] = [];
    for (let i = 0; i < names.length; i += 2) {
      const pair = names.slice(i, i + 2);
      rows.push(pair.length === 2 ? Math.max(tileH(pair[0], w2), tileH(pair[1], w2)) : tileH(pair[0], inner));
    }
    return { h: rows.reduce((a, b) => a + b, 0) + gap * (rows.length - 1), rows: rows.length };
  }
  const track = (inner - gap * 5) / 6;
  const w2 = track * 2 + gap, w3 = track * 3 + gap * 2;
  const r1 = Math.max(...names.slice(0, 3).map((n) => tileH(n, w2)));
  const r2 = Math.max(...names.slice(3).map((n) => tileH(n, w3)));
  return { h: r1 + gap + r2, rows: 2 };
}
export function depositPage(vw: number, l: string) {
  const t = dict[l], col = column("form", vw), lg = vw >= 1024, sm = vw >= 640;
  const hero = 2 + (lg ? 64 : 48) + 15 + 4 + 35 + 4 + 19.5;
  const pad = lg ? 32 : 24, inner = col - 2 - 2 * pad;
  const legend = 14 + 12;
  const grid = gridH(DEP_NAMES(t), inner, sm);
  const providers = legend + grid.h;
  const hint = (t.common.depositAmountHint as string).replace("{min}", fmt(1000)).replace("{max}", fmt(2_000_000));
  const hintLines = linesSeg(moneySegs(hint, body13), inner, { keepAll: true });
  const amount = legend + 48 + 12 + (sm ? 44 : 44 * 2 + 8) + 12 + 18 * hintLines;
  const phoneHint = lines(t.wallet.mobileMoneyNumberHint, body13, inner);
  const phone = legend + 44 + 8 + 18 * phoneHint + 12 + 40;
  const form = 2 + 2 * pad + providers + 24 + amount + 24 + phone + 24 + 48;
  const trustRoom = col - 2 - 40 - 40 - 16;
  const trustLines = lines(t.wallet.securedDepositBody, body13, trustRoom);
  const trust = 2 + 32 + Math.max(40, 21.125 * trustLines);
  const formTop = 44 + 24 + hero + 24;
  return { formTop, providersTop: formTop + 1 + pad + legend, tile: tileH(DEP_NAMES(t)[0], 0 + (sm ? ((inner - 60) / 6) * 2 + 12 : (inner - 12) / 2)), grid, amountTop: formTop + 1 + pad + providers + 24, providers, amount, phone, form, trust, hintLines, phoneHint, trustLines, total: formTop + form + 24 + trust };
}
export function depositGhostBefore(vw: number) {
  const sm = vw >= 640;
  const hero = 2 + (vw >= 1024 ? 64 : 48) + 15 + 4 + 35 + 4 + 19.5;
  const amount = 16 + 12 + 44 + 12 + 10;
  const providers = 16 + 12 + (sm ? 86 * 2 + 12 : 86 * 3 + 24);
  const phone = 16 + 12 + 44;
  const top = 44 + 24 + hero + 24;
  return { formTop: top, amountTop: top, providersTop: top + amount + 24 + 16 + 12, total: top + amount + 24 + providers + 24 + phone + 24 + 48 };
}
if (import.meta.url.endsWith("m-deposit.mts")) {
  for (const l of LOCALES) for (const vw of WIDTHS) {
    const p = depositPage(vw, l), g = depositGhostBefore(vw);
    console.log(`${l} ${vw}: page tiles@${p.providersTop.toFixed(1)} (${p.grid.rows}×${p.tile.toFixed(2)}) amount@${p.amountTop.toFixed(1)} end ${p.total.toFixed(1)} [hint ${p.hintLines}L, phone hint ${p.phoneHint}L, trust ${p.trustLines}L] | ghost tiles@${g.providersTop.toFixed(1)} amount@${g.amountTop.toFixed(1)} end ${g.total.toFixed(1)} | end ${(p.total - g.total).toFixed(1)}px apart`);
  }
}
