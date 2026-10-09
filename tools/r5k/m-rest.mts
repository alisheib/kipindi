/* /wallet/deposit/return, /wallet/withdraw, /profile, /positions/performance — each page (its common case) against today's
   ghost, from the classes on the overridden scale and the fonts. Run: npx tsx m-rest.mts */
import { width, lines, linesSeg, moneySegs, dict, column, WIDTHS, LOCALES } from "./lib-measure.mts";
import { gridH } from "./m-deposit.mts";
const body13 = { face: "inter" as const, px: 13 };
const ital13 = { face: "inter" as const, px: 13 };
const sora28 = { face: "sora" as const, px: 28, weight: 700, track: -0.02 };
const fmt = (n: number) => n.toLocaleString("en-US");
function idLines(len: number, room: number): number {
  const rw = width("0000", { face: "mono", px: 13 });
  let n = 1, x = 0; for (let i = 0; i < len / 4; i++) { if (x > 0 && x + rw > room + 0.01) { n++; x = rw; } else x += rw; } return n;
}
/* ── the provider's return (PAID by card, the common case: 6 rows) ── */
function returnPage(vw: number, l: string) {
  const t = dict[l], col = column("receipt", vw), lg = vw >= 1024, sm = vw >= 640, inner = col - 2 - (lg ? 64 : 48);
  const hero = 2 + (lg ? 64 : 48) + 15 + 4 + 35 * lines(t.wallet.returnPaidTitle, sora28, inner) + 4 + 19.5 * lines(t.wallet.returnPaidBody, ital13, inner);
  const rowIn = col - 2 - 40;
  const row = (label: string, dd: (r: number) => number) => 32 + 18 * Math.max(1, dd(rowIn - width(label, body13) - 16));
  const one = () => 1;
  const rows = [row(t.wallet.amount, one), row(t.wallet.method, one), row(t.wallet.transactionId, (r) => idLines(28, r)), row(t.wallet.gatewayReference, (r) => idLines(24, r)), row(t.wallet.date, one), row(t.wallet.newBalance, one)];
  const dl = 2 + rows.reduce((a, b) => a + b, 0) + rows.length - 1;
  const buttons = sm ? 48 : 48 + 10 + 48;
  const foot = 21.125 * lines(t.wallet.returnFootnote, body13, col);
  return { hero, dl, buttons, foot, total: hero + 24 + dl + 24 + buttons + 24 + foot };
}
function returnGhost(vw: number) {
  return { total: (2 + 64 + 48 + 20 + 24 + 20 + 16) + 24 + (2 + 48 + 4 * 16 + 3 * 16) + 24 + 44 };
}
/* ── withdraw (verified, payouts open, a balance of 100,000 or more: six chips; the common verified case) ── */
function withdrawPage(vw: number, l: string) {
  const t = dict[l], col = column("form", vw), lg = vw >= 1024, sm = vw >= 640, md = vw >= 768, pad = lg ? 32 : 24;
  const heroInner = col - 2 - 2 * pad;
  const head = 15 + 4 + 35 * lines(t.wallet.moveFundsOut, sora28, heroInner) + 4 + 19.5;
  const bal = 15 + 22; // micro label line (text-micro inherits? 14) + 22px figure leading-none
  const hero = 2 + 2 * pad + (sm ? Math.max(head, bal) : head + 12 + bal);
  const inner = col - 2 - 2 * pad;
  const grid = gridH(["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas"], inner, sm, true, md).h;
  const providers = 26 + grid;
  const hint = (t.wallet.amountHint as string).replace("{min}", fmt(1100)).replace("{max}", fmt(5_000_000));
  const amount = 26 + 48 + 12 + (sm ? 44 : 96) + 12 + 18 * linesSeg(moneySegs(hint, body13), inner, { keepAll: true });
  const destRoom = inner - 2 - 28;
  const destRow = width(t.wallet.destinationPhone, { face: "mono", px: 10, weight: 700, track: 0.14, upper: true }) + 12 + 2 + 12 + width(t.wallet.destinationRegistered, { face: "inter", px: 9.5, weight: 700, track: 0.06, upper: true }) > destRoom ? 14 + 4 + 18 : 18;
  const dest = 2 + 24 + destRow + 8 + 24 + 8 + 17.875 * lines(t.wallet.destinationLockedBody, body13, destRoom);
  const nRoom = inner - 2 - 28 - 15 - 10;
  const notice = (title: string, body: string) => 24 + 17.875 * lines(title, { face: "sora", px: 13, weight: 600 }, nRoom) + 2 + 17.875 * lines(body, body13, nRoom);
  const notices = 2 + notice(t.wallet.securedByKyc, t.wallet.securedBody) + 1 + notice(t.wallet.taxNotice, (t.wallet.taxBody as string).replace("{pct}", "2"));
  const form = 2 + 2 * pad + providers + 24 + amount + 24 + dest + 24 + notices + 24 + 48;
  return { hero, form, total: 44 + 24 + hero + 24 + form };
}
function withdrawGhost(vw: number, l: string) {
  const t = dict[l], col = column("form", vw), lg = vw >= 1024, pad = lg ? 32 : 24;
  const head = 15 + 4 + 35 * lines(t.wallet.moveFundsOut, sora28, col - 2 - 2 * pad) + 4 + 19.5;
  const hero = 2 + 2 * pad + head;
  return { hero, total: 44 + 24 + hero + 24 + (2 + 80 + 56) };
}
/* ── /profile (a PLAYER with no display name yet, not verified, no email, the invite programme live: 6 badges, 12 rows) ── */
function profilePage(vw: number, l: string) {
  const t = dict[l], col = column("reading", vw), lg = vw >= 1024, sm = vw >= 640, md = vw >= 768, pad = lg ? 32 : 24;
  const colW = col - 2 - 2 * pad - 80 - (lg ? 20 : 16);
  const name = 8 + Math.max(40, 30 * lines(t.profile.setYourName, { face: "sora", px: md ? 28 : 24, weight: 700, track: -0.02 }, colW - 21));
  const phone = 8 + 18 * lines(`+255••••21 · ${t.profile.tanzania}`, { face: "mono", px: 12 }, colW);
  const chip = (s: string, glyph: boolean) => 18 + (glyph ? 14 : 0) + width(s, { face: "inter", px: 10.5, weight: 700, track: 0.06, upper: true });
  const pills: Array<[number, number]> = [[chip(t.profile.playerRole, false), 21], [chip(t.profile.kycPillStart, true), 40], [chip({ sw: "Kiswahili", en: "English", zh: "中文" }[l]!, false), 21], [chip(t.profile.addEmailPill, true), 40]];
  let rowsH = 0, x = 0, lineH = 0;
  for (const [w, h] of pills) { if (x > 0 && x + 8 + w > colW) { rowsH += lineH + 8; x = w; lineH = h; } else { x = x === 0 ? w : x + 8 + w; lineH = Math.max(lineH, h); } }
  rowsH += lineH;
  const column1 = 4 + 15 + name + phone + 16 + rowsH;
  const top = 2 + 2 * pad + Math.max(80, column1);
  const stat = 28 + 15 + 4 + 22.5;
  const strip = 1 + (sm ? stat : stat + 1 + stat);
  const hero = top + strip;
  const shelfInner = col - 2 - 48;
  const cols = Math.max(1, Math.floor((shelfInner + 24) / 120));
  const titles = ["First Prediction · Ubashiri wa Kwanza", "First Win · Ushindi wa Kwanza", "Verified · Umethibitishwa", "Market Maker · Mtengeneza Soko", "Connector · Mwunganishi", "Sharp · Mahiri"];
  const cellW = (shelfInner - 24 * (Math.min(cols, 6) - 1)) / Math.min(cols, 6);
  const fig = (ti: string) => 64 + 12 + 16.25 * ti.split(" · ").reduce((a, p) => a + lines(p, body13, cellW), 0);
  const shelfRows: number[] = []; titles.forEach((ti, i) => { const r = Math.floor(i / cols); shelfRows[r] = Math.max(shelfRows[r] ?? 0, fig(ti)); });
  const shelf = shelfRows.reduce((a, b) => a + b, 0) + 24 * (shelfRows.length - 1);
  const achievements = 14 + 16 + 2 + 48 + shelf + 20 + 18 * lines(t.profile.badgesHint, body13, shelfInner);
  const rows = 12, perRow = md ? 2 : 1, gridRows = Math.ceil(rows / perRow);
  const settings = 14 + 16 + gridRows * 70 + (gridRows - 1) * 16;
  const signOut = 67.5;
  return { hero, achievements, settings, total: hero + 32 + achievements + 32 + settings + 32 + signOut };
}
function profileGhost(vw: number) {
  const md = vw >= 768, lg = vw >= 1024;
  const hero = 2 + (lg ? 64 : 48) + 114 + 1 + 72;
  const settings = 16 + 16 + (md ? 3 * 70 + 2 * 16 : 6 * 70 + 5 * 16);
  return { hero, settings, total: hero + 32 + settings };
}
/* ── /positions/performance (settled positions, a best win, one product: no rail) ── */
function perfPage(vw: number, l: string) {
  const t = dict[l], col = column("reading", vw), sm = vw >= 640, md = vw >= 768, lg = vw >= 1024;
  const inner = col - 2 - 48;
  const pnlHead = Math.max(15, 19.5 * lines(t.performance.allFiguresFinal, body13, inner - 12 - width(`${t.performance.netPnl} · ${t.common.settled}`, { face: "mono", px: 10, weight: 600, track: 0.14, upper: true })));
  const big = 34 + 12 + 19.5 * lines(t.performance.netProfitCaption, body13, Math.max(220, inner));
  const stats = 43.25;
  const fitsOne = inner >= 220 + 40 + 3 * 100 + 2 * 32;
  const pnl = 2 + 48 + pnlHead + 25 + (fitsOne ? Math.max(big, stats) : big + 20 + stats);
  const chart = 2 + 40 + 16 + 15 + inner / 3 + (sm ? 0 : 26);
  const best = 2 + 48 + 15 + 16 + Math.max(48, (lg ? 30 : 26) + 8 + 36);
  const streak = 2 + 48 + 15 + 16 + 30;
  const highlights = md ? Math.max(best, streak) : best + 16 + streak;
  const kpiCols = Math.max(1, Math.floor((col + 16) / 174));
  const kpi = kpiCols >= 2 ? 70.75 : 70.75 * 2 + 16;
  const recent = 30 + 16 + 2 + 5 * 60.5 + 4;
  return { order: "pnl → chart → highlights → kpi → recent", total: 44 + 32 + 54 + 32 + pnl + 32 + chart + 32 + highlights + 32 + kpi + 32 + recent, pnlTop: 44 + 32 + 54 + 32 };
}
function perfGhost(vw: number) {
  const lg = vw >= 1024;
  const heroCard = 2 + 48 + 16 + 12 + 36; // px-5 py-5 · h-3 · mt-2 · h-[36px]
  const grid = lg ? 2 + 28 + 16 + 12 + 24 : 2 * (2 + 28 + 16 + 12 + 24) + 16;
  const chart = 2 + 32 + 16 + 16 + 200;
  const recent = 32 + 16 + 2 + 3 * (24 + 20 + 8 + 16) + 2;
  return { order: "hero card → 4 stat boxes → streak bar → chart → recent", total: 44 + 32 + 54 + 32 + heroCard + 32 + grid + 32 + 20 + 32 + chart + 32 + recent };
}
for (const l of LOCALES) for (const vw of WIDTHS) {
  const r = returnPage(vw, l), rg = returnGhost(vw);
  const w = withdrawPage(vw, l), wg = withdrawGhost(vw, l);
  const p = profilePage(vw, l), pg = profileGhost(vw);
  const f = perfPage(vw, l), fg = perfGhost(vw);
  console.log(`${l} ${vw}: return page ${r.total.toFixed(0)} ghost ${rg.total} (Δ${(r.total - rg.total).toFixed(0)}) · withdraw hero ${w.hero.toFixed(1)}/${wg.hero.toFixed(1)} end ${w.total.toFixed(0)}/${wg.total.toFixed(0)} (Δ${(w.total - wg.total).toFixed(0)}) · profile hero ${p.hero.toFixed(1)}/${pg.hero} end ${p.total.toFixed(0)}/${pg.total} (Δ${(p.total - pg.total).toFixed(0)}) · performance end ${f.total.toFixed(0)}/${fg.total} (Δ${(f.total - fg.total).toFixed(0)})`);
}
