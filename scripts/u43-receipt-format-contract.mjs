/** U43 B5 receipt: one price/clock format and the money action's committed projection. */
export function receiptFormatIssues(source) {
  const issues = [];
  const need = (yes, label) => { if (!yes) issues.push(label); };
  const clock = source.slice(source.indexOf("function clockOf("), source.indexOf("export function UpDownBetReceiptModal"));
  const details = source.slice(source.indexOf("const betsClose ="), source.indexOf("const sideWord ="));

  need(source.includes('import { usd } from "@/lib/usd-price";')
    && details.includes("value: usd(info.openPrice, info.decimals)")
    && !details.includes("info.openPrice.toFixed("),
  "receipt open price uses the shared grouped USD formatter");
  need(clock.includes("const clock = fmtEATClock(ms);")
    && clock.includes('return clock == null ? null : `${clock} EAT`;')
    && !clock.includes("toLocaleTimeString("),
  "receipt clock is a 24-hour EAT minute with its zone stated");
  need(details.includes("const betsClose = clockOf(info.selectionClosedAt);")
    && details.includes("const resultDue = clockOf(info.closesAt);")
    && details.includes("if (betsClose) details.push(")
    && details.includes("if (resultDue) details.push("),
  "both receipt deadlines use that clock and omit missing instants");
  return issues;
}

/** The receipt must display the projection returned by the committed bet, not reprice a board snapshot. */
export function receiptCommitTruthIssues(hook, modal, receipt) {
  const issues = [];
  const need = (yes, label) => { if (!yes) issues.push(label); };
  const placedType = hook.slice(hook.indexOf("export type PlacedReceipt = {"), hook.indexOf("const [", hook.indexOf("export type PlacedReceipt = {")));
  const committedBranch = hook.slice(hook.indexOf("const placed = r.data;"), hook.indexOf("setLiveMessage(", hook.indexOf("const placed = r.data;")));
  const displayedDetails = modal.slice(modal.indexOf("const projected ="), modal.indexOf("const sideWord ="));

  need(placedType.includes("payoutIfWin: number;")
    && committedBranch.includes("payoutIfWin: placed.payoutIfWin,")
    && !committedBranch.includes("payoutIfWin: amount,"),
  "placed receipt carries the money action's committed projection");
  need(modal.includes('import { freeExitMinutesFor, receiptProjectedPayout, type UpDownReceiptInfo } from "@/lib/updown-receipt";')
    && displayedDetails.includes("const projected = receiptProjectedPayout(pricing.show, placed);")
    && !displayedDetails.includes("impliedMultiplier(")
    && !displayedDetails.includes("projectedReturn("),
  "receipt displays committed projection instead of pricing a stale board");
  need(displayedDetails.includes("if (projected != null) {")
    && displayedDetails.includes("label: t.market.udRcProjected, value: formatTzs(projected)")
    && modal.includes("footnote={projected != null ? t.market.udEstimateNote : undefined}"),
  "committed projection and its qualifier appear together");
  need(receipt.includes("export function receiptProjectedPayout(")
    && receipt.includes("return show && Number.isSafeInteger(placed.payoutIfWin) && placed.payoutIfWin > 0")
    && receipt.includes("? placed.payoutIfWin : null;"),
  "receipt helper gates and returns only the committed positive whole amount");
  return issues;
}
