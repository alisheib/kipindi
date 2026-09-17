/**
 * THE HOUSE STAKE IN AN OFFICER'S WORDS — every R2 phrase an admin reads beside a money decision (C5-SPEC rulings 192–196).
 *
 * ⭐ ONE HOME FOR THE WORDS. The platform's admin emitters and templates never spell a house-share phrase themselves: they
 * ask this module, the way house-bot alerts ask `alert-copy.ts` (C4 ruling 141). This file now holds the emergency-void
 * notice's house share (ruling 195); the resolver, ceremony, market, objection and rounds lines join it with their display
 * slots (ruling 192, C5 step 5).
 *
 * ⛔ STAFF ONLY. Nothing here reaches a player, a holder or a client module (owner ruling D19). The player's cancellation
 * notice and letter never call it; `test:house-bot-reports` §4 proves them byte-identical with and without house stakes.
 * ⛔ PURE, AND IT STAYS PURE. No store, no server import; the money formatter is injected by the caller (the house module
 * law, `test:house-bot-rules` §0).
 *
 * ⚠️ Swahili and Chinese reuse the admin vocabulary already shipped in `alert-copy.ts` ("dau la nyumba", 平台投注) and are
 * marked for native review with every other house-bot string.
 */

/** Formats a whole-shilling amount the platform's way (the caller passes `formatTzs`). */
export type MoneyFormat = (tzs: number) => string;

/** What an emergency void refunded to house-marked positions, counted in its refund loop (ruling 195). */
export type VoidHouseShare = { houseRefundedTzs?: number | null; houseRefundedCount?: number | null };

const positionsEn = (n: number) => `${n} ${n === 1 ? "position" : "positions"}`;

/** The share's figures, or null when the void refunded no house stake — the notice and the letter then say exactly what they said before. */
function shareOf(share: VoidHouseShare | null | undefined): { tzs: number; count: number } | null {
  const tzs = Number(share?.houseRefundedTzs ?? 0);
  const count = Number(share?.houseRefundedCount ?? 0);
  return Number.isFinite(tzs) && tzs > 0 ? { tzs, count } : null;
}

/**
 * Ruling 195 · the one clause the emergency-void ADMIN bell adds after "… refunded to N players": the house share in the
 * bell's three languages, or null. English: ", of which house stakes TZS 8,000 on 2 positions".
 */
export function voidNoticeHouseClause(share: VoidHouseShare | null | undefined, money: MoneyFormat): { en: string; sw: string; zh: string } | null {
  const s = shareOf(share);
  if (!s) return null;
  const amount = money(s.tzs);
  return {
    en: `, of which house stakes ${amount} on ${positionsEn(s.count)}`,
    sw: `, ikiwemo dau la nyumba ${amount} kwenye nafasi ${s.count}`,
    zh: `，其中平台投注 ${amount}（${s.count} 笔）`,
  };
}

/** Ruling 195 · the one detail row the emergency-void ADMIN letter adds after "Total refunded", or null. */
export function voidEmailHouseRow(share: VoidHouseShare | null | undefined, money: MoneyFormat): { label: string; value: string } | null {
  const s = shareOf(share);
  return s ? { label: "Of which house stakes", value: `${money(s.tzs)} on ${positionsEn(s.count)}` } : null;
}
