const fs = require("fs");
const p = "F:/kipindi-r3c/src/lib/server/notification-service.ts";
let s = fs.readFileSync(p, "utf8");
const N = "\r\n";
const rep = (from, to) => {
  const a = from.join(N), b = to.join(N);
  const i = s.indexOf(a);
  if (i < 0) throw new Error("not found: " + from[0]);
  if (s.indexOf(a, i + 1) >= 0) throw new Error("ambiguous: " + from[0]);
  s = s.slice(0, i) + b + s.slice(i + a.length);
};

// notifyProposalDeclined — the officer's reason ends where the template ends it.
rep([
  '    bodyEn: `"${opts.titleEn.slice(0, 50)}" — reason: ${opts.reason}.`,',
  '    bodySw: `Sababu: ${opts.reason}.`,',
  '    bodyZh: `"${opts.titleEn.slice(0, 50)}" — 原因：${opts.reason}。`,',
], [
  '    // `endClause`: the reason\'s own closing stop gives way to the template\'s, so it never reads ".." (round 3).',
  '    bodyEn: `"${opts.titleEn.slice(0, 50)}" — reason: ${endClause(opts.reason, ".")}`,',
  '    bodySw: `Sababu: ${endClause(opts.reason, ".")}`,',
  '    bodyZh: `"${opts.titleEn.slice(0, 50)}" — 原因：${endClause(opts.reason, "。")}`,',
]);

// notifyRefund
rep([
  ' *  platform allows repeat bets by design. `notifyCashout` and `notifyOneSidedRefund`',
  ' *  already carry the reference for exactly this reason; these two did not. */',
  'export function notifyRefund(userId: string, opts: { stake: number; marketTitle: LocalizedText; marketId: string; positionId?: string }) {',
  '  const ref = opts.positionId ? ` · ${opts.positionId}` : "";',
  '  return notify({',
], [
  ' *  platform allows repeat bets by design. `notifyCashout` and `notifyOneSidedRefund`',
  ' *  already carry the reference for exactly this reason; these two did not.',
  ' *  ⭐ Since round 3 of the visual pass (2026-10-09) the reference rides the LINK — the notice opens that ticket',
  ' *  (`ticketHref`, notification-text.ts) — and never the sentence, where " · pos_…" told the reader nothing. */',
  'export function notifyRefund(userId: string, opts: { stake: number; marketTitle: LocalizedText; marketId: string; positionId?: string }) {',
  '  return notify({',
]);
rep([
  '    bodyEn: `${opts.marketTitle.en.slice(0, 70)} was voided. Your stake has been returned.${ref}`,',
  '    bodySw: `${opts.marketTitle.sw.slice(0, 70)} limebatilishwa. Dau lako limerudishwa.${ref}`,',
  '    bodyZh: `${opts.marketTitle.zh.slice(0, 50)} 已作废。您的本金已全额退回。${ref}`,',
  '    href: `/markets/${opts.marketId}`,',
], [
  '    bodyEn: `${opts.marketTitle.en.slice(0, 70)} was voided. Your stake has been returned.`,',
  '    bodySw: `${opts.marketTitle.sw.slice(0, 70)} limebatilishwa. Dau lako limerudishwa.`,',
  '    bodyZh: `${opts.marketTitle.zh.slice(0, 50)} 已作废。您的本金已全额退回。`,',
  '    href: ticketHref(opts.marketId, opts.positionId, `/markets/${opts.marketId}`),',
]);

// notifyMarketCancelled
rep([
  '/** Player notice: a market they had a stake in was cancelled (emergency void).',
  ' *  Carries the admin\'s reason and confirms the full refund. */',
  'export function notifyMarketCancelled(userId: string, opts: { stake: number; marketTitle: LocalizedText; marketId: string; reason: string; positionId?: string }) {',
  '  const ref = opts.positionId ? ` · ${opts.positionId}` : "";',
  '  return notify({',
], [
  '/** Player notice: a market they had a stake in was cancelled (emergency void).',
  ' *  Carries the admin\'s reason and confirms the full refund.',
  ' *  🔴 ROUND 3 (2026-10-09, tile 192): it read "…before settlement.. Dau lako lote limerejeshwa kwenye pochi yako.',
  ' *  · pos_34d10350dfa7510cfad5" — the officer\'s reason kept its own full stop under the template\'s, and the position',
  ' *  id was appended to the sentence. `endClause` ends the reason once, in the reader\'s own stop; the id rides the',
  ' *  link, which opens the refunded ticket on its market\'s page (it opened /wallet, and one link for every refund of a',
  ' *  market is why the id had to be in the words). The wallet is still where the sentence says the money went. */',
  'export function notifyMarketCancelled(userId: string, opts: { stake: number; marketTitle: LocalizedText; marketId: string; reason: string; positionId?: string }) {',
  '  return notify({',
]);
rep([
  '    bodyEn: `"${opts.marketTitle.en.slice(0, 60)}" was cancelled: ${opts.reason.slice(0, 120)}. Your full stake has been returned to your wallet.${ref}`,',
  '    bodySw: `"${opts.marketTitle.sw.slice(0, 60)}" limefutwa: ${opts.reason.slice(0, 120)}. Dau lako lote limerejeshwa kwenye pochi yako.${ref}`,',
  '    bodyZh: `"${opts.marketTitle.zh.slice(0, 60)}" 已取消：${opts.reason.slice(0, 120)}。您的本金已全额退回钱包。${ref}`,',
  '    href: "/wallet",',
], [
  '    bodyEn: `"${opts.marketTitle.en.slice(0, 60)}" was cancelled: ${endClause(opts.reason.slice(0, 120), ".")} Your full stake has been returned to your wallet.`,',
  '    bodySw: `"${opts.marketTitle.sw.slice(0, 60)}" limefutwa: ${endClause(opts.reason.slice(0, 120), ".")} Dau lako lote limerejeshwa kwenye pochi yako.`,',
  '    bodyZh: `"${opts.marketTitle.zh.slice(0, 60)}" 已取消：${endClause(opts.reason.slice(0, 120), "。")}您的本金已全额退回钱包。`,',
  '    href: ticketHref(opts.marketId, opts.positionId, "/wallet"),',
]);

// notifyCashout
rep([
  '  freeExitGraceMinutes: number;',
  '}) {',
  '  const ref = opts.positionId ? ` · ${opts.positionId}` : "";',
  '  const mins = opts.freeExitGraceMinutes;',
], [
  '  freeExitGraceMinutes: number;',
  '}) {',
  '  // The position rides the link, not the sentence (round 3, 2026-10-09; `ticketHref`, notification-text.ts).',
  '  const mins = opts.freeExitGraceMinutes;',
]);
rep([
  '      ? `Full stake returned — sold within the ${mins}-min grace window, no fee.${ref}`',
  '      : `Early exit from ${opts.marketTitle.en.slice(0, 60)}. Funds in wallet.${ref}`,',
  '    bodySw: opts.inGracePeriod',
  '      ? `Pesa yote imerudishwa — umetoka ndani ya dakika ${mins}.${ref}`',
  '      : `Umetoka mapema. Pesa imo kwenye pochi yako.${ref}`,',
  '    bodyZh: opts.inGracePeriod',
  '      ? `本金已全额退回 — 在 ${mins} 分钟免费窗口内卖出，不收取手续费。${ref}`',
  '      : `已从 ${opts.marketTitle.zh.slice(0, 50)} 提前退出。款项已存入钱包。${ref}`,',
  '    href: `/markets/${opts.marketId}`,',
], [
  '      ? `Full stake returned — sold within the ${mins}-min grace window, no fee.`',
  '      : `Early exit from ${opts.marketTitle.en.slice(0, 60)}. Funds in wallet.`,',
  '    bodySw: opts.inGracePeriod',
  '      ? `Pesa yote imerudishwa — umetoka ndani ya dakika ${mins}.`',
  '      : `Umetoka mapema. Pesa imo kwenye pochi yako.`,',
  '    bodyZh: opts.inGracePeriod',
  '      ? `本金已全额退回 — 在 ${mins} 分钟免费窗口内卖出，不收取手续费。`',
  '      : `已从 ${opts.marketTitle.zh.slice(0, 50)} 提前退出。款项已存入钱包。`,',
  '    href: ticketHref(opts.marketId, opts.positionId, `/markets/${opts.marketId}`),',
]);

// notifyOneSidedRefund
rep([
  'export function notifyOneSidedRefund(userId: string, opts: { stake: number; marketTitle: LocalizedText; marketId: string; positionId?: string }) {',
  '  const ref = opts.positionId ? ` · ${opts.positionId}` : "";',
  '  return notify({',
], [
  'export function notifyOneSidedRefund(userId: string, opts: { stake: number; marketTitle: LocalizedText; marketId: string; positionId?: string }) {',
  '  // The position rides the link, not the sentence (round 3, 2026-10-09; `ticketHref`, notification-text.ts).',
  '  return notify({',
]);
rep([
  '    bodyEn: `${opts.marketTitle.en.slice(0, 60)} — all bets were on one side. Full stake returned, no fee.${ref}`,',
  '    bodySw: `${opts.marketTitle.sw.slice(0, 60)} — wote walibetia upande mmoja. Dau lako lote limerudishwa bila gharama.${ref}`,',
  '    bodyZh: `${opts.marketTitle.zh.slice(0, 50)} — 所有投注都在同一方。本金全额退回，不收取手续费。${ref}`,',
  '    href: `/markets/${opts.marketId}`,',
], [
  '    bodyEn: `${opts.marketTitle.en.slice(0, 60)} — all bets were on one side. Full stake returned, no fee.`,',
  '    bodySw: `${opts.marketTitle.sw.slice(0, 60)} — wote walibetia upande mmoja. Dau lako lote limerudishwa bila gharama.`,',
  '    bodyZh: `${opts.marketTitle.zh.slice(0, 50)} — 所有投注都在同一方。本金全额退回，不收取手续费。`,',
  '    href: ticketHref(opts.marketId, opts.positionId, `/markets/${opts.marketId}`),',
]);

fs.writeFileSync(p, s, "utf8");
const left = (s.match(/\$\{ref\}/g) || []).length;
const defs = (s.match(/const ref = opts\.positionId/g) || []).length;
console.log("ok; remaining ${ref}:", left, "remaining ref defs:", defs);
