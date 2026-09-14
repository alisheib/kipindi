/**
 * The side badge a comment carries — which side its author holds on the market.
 *
 * Pure, so the rule can be driven directly (`test:house-bot-seam` §6.m) rather than matched by regex.
 * `positions` is the author's positions as `listPositionsForUser` returns them (newest first); the badge
 * is the side of the last OPEN one in that list, exactly as `postCommentAction` always chose it.
 *
 * ⛔ SANCTIONED CHANGE (m) (house bots, 04 A18): a liquidity stake 50pick placed from the author's account
 * never gives them a side — a public badge would reveal a house stake. Only their own OPEN stakes count.
 */
export type CommentSideInput = { marketId: string; status: string; side: string; houseBotId?: string | null };

export function commentSideFor(positions: readonly CommentSideInput[], marketId: string): "YES" | "NO" | null {
  const open = positions.filter((p) => p.marketId === marketId && p.status === "OPEN" && p.houseBotId == null);
  return open.length ? (open[open.length - 1].side as "YES" | "NO") : null;
}
