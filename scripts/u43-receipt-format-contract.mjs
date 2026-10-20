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

/** The close is the expected result time, not a promise that settlement has finished. */
export function receiptResultTimeIssues(dictionarySource, modalSource) {
  const issues = [];
  const labels = [...dictionarySource.matchAll(/\budRcResultDue:\s*"([^"]*)"/g)].map((match) => match[1]);
  if (labels.length !== 3 || labels[0] !== "Result expected" || labels[1] !== "Matokeo yanatarajiwa"
    || labels[2] !== "预计结果时间") {
    issues.push("receipt result time is explicitly expected in English, Swahili and Chinese");
  }
  if (!modalSource.includes("const resultDue = clockOf(info.closesAt);")
    || !modalSource.includes("if (resultDue) details.push({ label: t.market.udRcResultDue, value: resultDue });")) {
    issues.push("the expected-result label belongs to the round close clock");
  }
  return issues;
}

export const ESTIMATE_NOTES = {
  en: "Projected return changes until betting closes. Winning return then fixes; paid only if you win. A void refunds your stake.",
  sw: "Makisio hubadilika hadi madau yafungwe. Kiasi cha ushindi huwa thabiti; hulipwa ukishinda tu. Dau hurudi raundi ikiwa batili.",
  zh: "预计回报在下注截止前会变动。届时获胜金额固定，仅在押中时支付。回合无效则退还本金。",
};

export const BAND_NOTES = {
  en: "Small moves may refund · winning targets in round details",
  sw: "Mabadiliko madogo yanaweza kurudisha dau · malengo ya ushindi kwenye maelezo",
  zh: "小幅变动可退还本金 · 获胜目标价见回合详情",
};

/** A pre-bet line explains the void band, and every detail commit path receives the frozen targets. */
export function bandBeforeBetIssues(dictionarySource, roundPage, actionPanel, stakePanel) {
  const issues = [];
  const notes = [...dictionarySource.matchAll(/\budBandBeforeBet:\s*"([^"]*)"/g)].map((match) => match[1]);
  if (notes.length !== 3 || notes.some((note, index) => note !== Object.values(BAND_NOTES)[index])) {
    issues.push("the brief void-band disclosure is truthful in all three languages");
  }
  if (/\budWinTarget:\s*"|\budTickNote:\s*"/.test(dictionarySource)) {
    issues.push("retired opening-price and one-tick win claims stay absent");
  }
  if (!roundPage.includes("upTarget: round.upTarget,") || !roundPage.includes("downTarget: round.downTarget,")
    || !actionPanel.includes("upTarget: number | null;") || !actionPanel.includes("downTarget: number | null;")
    || !stakePanel.includes("upTarget: number | null;") || !stakePanel.includes("downTarget: number | null;")) {
    issues.push("frozen winning targets reach the stake panel from the round");
  }
  if (!stakePanel.includes("pricing.upPool > 0 && pricing.downPool > 0")
    || !stakePanel.includes('typeof props.upTarget === "number" && Number.isFinite(props.upTarget)')
    || !stakePanel.includes('typeof props.downTarget === "number" && Number.isFinite(props.downTarget)')
    || !stakePanel.includes("props.upTarget > props.downTarget")) {
    issues.push("the band note requires two funded pools and an ordered finite target pair");
  }
  if ((stakePanel.match(/bandBeforeBet && <p[^>]+>\{noticeBody\(t\.market\.udBandBeforeBet\)\}<\/p>/g) ?? []).length !== 4
    || stakePanel.indexOf("{bandBeforeBet && <p", stakePanel.indexOf("{/* The one money commit")) > stakePanel.indexOf("<button", stakePanel.indexOf("{/* The one money commit"))) {
    issues.push("all four detail bet paths disclose the band before a commit");
  }
  return issues;
}

/** Lock fixes a possible winning amount; result and void still decide what is paid. */
export function receiptEstimateTruthIssues(dictionarySource, rulesSource, rulesMetaSource, modalSource, panelSource) {
  const issues = [];
  const notes = [...dictionarySource.matchAll(/\budEstimateNote:\s*"([^"]*)"/g)].map((match) => match[1]);
  if (notes.length !== 3 || notes.some((note, index) => note !== Object.values(ESTIMATE_NOTES)[index])) {
    issues.push("receipt qualifier conditions winning return and void refund in all three languages");
  }
  const legalClauses = [
    "Betting close fixes the return for a winning pick; you receive it only if your pick wins. A voided round returns your stake.",
    "Madau yakifungwa, kiasi utakachopata ukishinda kinakuwa thabiti; utakipata tu ukishinda. Raundi ikibatilishwa, dau linarudishwa.",
    "下注截止时，获胜可得的金额固定；只有您的选择获胜才会收到。回合无效则退还本金。",
  ];
  if (legalClauses.some((clause) => !rulesSource.includes(clause))) {
    issues.push("binding Rules condition the locked winning return and void refund in all three languages");
  }
  const versions = [...rulesMetaSource.matchAll(/(?:Version|Toleo|版本) (\d{4}-\d{2}-\d{2})/g)].map((match) => match[1]);
  if (versions.length !== 3 || versions.some((version) => version !== "2026-10-20")) {
    issues.push("binding Rules version follows the money-copy correction in all three languages");
  }
  if (!modalSource.includes("footnote={projected != null ? t.market.udEstimateNote : undefined}")
    || !panelSource.includes("{noticeBody(t.market.udEstimateNote)}")) {
    issues.push("receipt and confirmation panel show the same conditional qualifier beside a projection");
  }
  if (/\bautoCloseMs=/.test(modalSource)) {
    issues.push("the bet receipt keeps the shared success timer");
  }
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
