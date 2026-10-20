/** U43 B5 receipt in-memory mutation proof; no source file is written. */
import { readFileSync } from "node:fs";
import { bandBeforeBetIssues, receiptCommitTruthIssues, receiptEstimateTruthIssues, receiptFormatIssues, receiptRoundCloseIssues } from "./u43-receipt-format-contract.mjs";

const original = readFileSync("src/components/updown/updown-bet-receipt-modal.tsx", "utf8");
if (receiptFormatIssues(original).length) throw new Error("Baseline receipt format guard failed");
const cases = [
  ["ungrouped price returns", "value: usd(info.openPrice, info.decimals)", "value: `$${info.openPrice.toFixed(info.decimals)}`"],
  ["device clock returns", "const clock = fmtEATClock(ms);", 'const clock = new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });'],
  ["EAT zone vanishes", 'return clock == null ? null : `${clock} EAT`;', "return clock;"],
  ["betting deadline drops", "const betsClose = clockOf(info.selectionClosedAt);", "const betsClose = null;"],
  ["round close drops", "const roundClose = clockOf(info.closesAt);", "const roundClose = null;"],
];
for (const [name, from, to] of cases) {
  if (original.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  if (!receiptFormatIssues(original.replace(from, to)).length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 receipt format red proof: ${cases.length} reversions caught`);

const dictionary = readFileSync("src/lib/i18n-dict.ts", "utf8");
if (receiptRoundCloseIssues(dictionary, original).length) throw new Error("Baseline round-close guard failed");
const closeCases = [
  ["English promises the result at the close", "dict", 'udRcRoundCloses: "Round closes"', 'udRcRoundCloses: "Result expected"'],
  ["Swahili promises the result at the close", "dict", 'udRcRoundCloses: "Raundi inafungwa"', 'udRcRoundCloses: "Matokeo yanatarajiwa"'],
  ["Chinese promises the result at the close", "dict", 'udRcRoundCloses: "回合结束"', 'udRcRoundCloses: "预计结果时间"'],
  ["receipt borrows the betting-close label", "modal", 'if (roundClose) details.push({ label: t.market.udRcRoundCloses, value: roundClose });', 'if (roundClose) details.push({ label: t.market.udRcBetsClose, value: roundClose });'],
  ["round close reads the betting-close instant", "modal", "const roundClose = clockOf(info.closesAt);", "const roundClose = clockOf(info.selectionClosedAt);"],
  ["retired result-due key returns", "dict", 'udRcRoundCloses: "Round closes"', 'udRcResultDue: "Result expected"'],
];
for (const [name, target, from, to] of closeCases) {
  const source = target === "dict" ? dictionary : original;
  if (source.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  const mutated = source.replace(from, to);
  const issues = receiptRoundCloseIssues(target === "dict" ? mutated : dictionary, target === "modal" ? mutated : original);
  if (!issues.length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 receipt round-close red proof: ${closeCases.length} reversions caught`);

const legal = readFileSync("src/app/legal/rules/_content-up-down.tsx", "utf8");
const meta = readFileSync("src/app/legal/rules/up-down/page.tsx", "utf8");
const panel = readFileSync("src/components/updown/round-stake-panel.tsx", "utf8");
const estimateSources = { dict: dictionary, legal, meta, modal: original, panel };
if (receiptEstimateTruthIssues(dictionary, legal, meta, original, panel).length) {
  throw new Error("Baseline conditional-return guard failed");
}
const estimateCases = [
  ["English promises payout merely at lock", "dict", "Winning return then fixes; paid only if you win. A void refunds your stake.", "Then it becomes your exact payout."],
  ["Swahili promises payout merely at lock", "dict", "Kiasi cha ushindi huwa thabiti; hulipwa ukishinda tu. Dau hurudi raundi ikiwa batili.", "Yanakuwa malipo yako kamili."],
  ["Chinese promises payout merely at lock", "dict", "届时获胜金额固定，仅在押中时支付。回合无效则退还本金。", "投注截止时，它将变为您的确切派彩。"],
  ["English Rules imply a promise at lock", "legal", "Betting close fixes the return for a winning pick; you receive it only if your pick wins. A voided round returns your stake.", "It is not a promise until betting closes."],
  ["Swahili Rules imply a promise at lock", "legal", "Madau yakifungwa, kiasi utakachopata ukishinda kinakuwa thabiti; utakipata tu ukishinda. Raundi ikibatilishwa, dau linarudishwa.", "Si ahadi hadi madau yatakapofungwa."],
  ["Chinese Rules imply a promise at lock", "legal", "下注截止时，获胜可得的金额固定；只有您的选择获胜才会收到。回合无效则退还本金。", "在下注截止前它不构成承诺。"],
  ["Rules version hides the correction", "meta", "Version 2026-10-20", "Version 2026-10-14"],
];
for (const [name, target, from, to] of estimateCases) {
  const source = estimateSources[target];
  if (source.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  const changed = { ...estimateSources, [target]: source.replace(from, to) };
  if (!receiptEstimateTruthIssues(changed.dict, changed.legal, changed.meta, changed.modal, changed.panel).length) {
    throw new Error(`RED MISSED: ${name}`);
  }
}
console.log(`U43 receipt conditional-return red proof: ${estimateCases.length} reversions caught`);

const timerMutant = original.replace("      compactOnPhone", "      compactOnPhone\n      autoCloseMs={15_000}");
if (timerMutant === original || !receiptEstimateTruthIssues(dictionary, legal, meta, timerMutant, panel).length) {
  throw new Error("RED MISSED: receipt overrides the shared success timer");
}
console.log("U43 shared receipt timer red proof: 1 override caught");

const roundPage = readFileSync("src/app/updown/[roundId]/page.tsx", "utf8");
const actionPanel = readFileSync("src/components/updown/round-action-panel.tsx", "utf8");
const stakePanel = readFileSync("src/components/updown/round-stake-panel.tsx", "utf8");
const bandSources = { dict: dictionary, page: roundPage, action: actionPanel, panel: stakePanel };
if (bandBeforeBetIssues(dictionary, roundPage, actionPanel, stakePanel).length) {
  throw new Error("Baseline before-bet band guard failed");
}
const bandCases = [
  ["English claims every small move wins", "dict", "Small moves may refund", "Any small move wins"],
  ["Swahili claims every small move wins", "dict", "Mabadiliko madogo yanaweza kurudisha dau", "Mabadiliko madogo hushinda"],
  ["Chinese claims every small move wins", "dict", "小幅变动可退还本金", "小幅变动即可获胜"],
  ["false one-tick rule returns", "dict", 'udBandBeforeBet: "Small moves may refund', 'udTickNote: "Any one tick wins",\n      udBandBeforeBet: "Small moves may refund'],
  ["one-sided pool gets the band note", "panel", "pricing.upPool > 0 && pricing.downPool > 0", "pricing.upPool >= 0 && pricing.downPool >= 0"],
  ["unpriced round gets the band note", "panel", 'typeof props.upTarget === "number" && Number.isFinite(props.upTarget)', 'props.upTarget != null'],
  ["reversed targets get the band note", "panel", "props.upTarget > props.downTarget", "props.upTarget < props.downTarget"],
  ["detail page drops the down target", "page", "downTarget: round.downTarget,", "downTarget: null,"],
  ["locked confirm hides the note", "panel", '{bandBeforeBet && <p className="mt-2 text-body-sm text-text-faint">{noticeBody(t.market.udBandBeforeBet)}</p>}', ""],
];
for (const [name, target, from, to] of bandCases) {
  const source = bandSources[target];
  if (source.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  const changed = { ...bandSources, [target]: source.replace(from, to) };
  if (!bandBeforeBetIssues(changed.dict, changed.page, changed.action, changed.panel).length) {
    throw new Error(`RED MISSED: ${name}`);
  }
}
console.log(`U43 before-bet void-band red proof: ${bandCases.length} reversions caught`);

const hook = readFileSync("src/components/updown/use-quick-bet.ts", "utf8");
const receipt = readFileSync("src/lib/updown-receipt.ts", "utf8");
if (receiptCommitTruthIssues(hook, original, receipt).length) throw new Error("Baseline receipt commit-truth guard failed");
const truthCases = [
  ["committed value is dropped", "hook", "payoutIfWin: placed.payoutIfWin,", "payoutIfWin: amount,"],
  ["stale board reprices receipt", "modal", "const projected = receiptProjectedPayout(pricing.show, placed);", "const projected = projectedReturn(pricing, placed.side, placed.amount);"],
  ["projection qualifier is dropped", "modal", "footnote={projected != null ? t.market.udEstimateNote : undefined}", "footnote={undefined}"],
  ["display switch is bypassed", "receipt", "return show && Number.isSafeInteger(placed.payoutIfWin) && placed.payoutIfWin > 0", "return true && Number.isSafeInteger(placed.payoutIfWin) && placed.payoutIfWin > 0"],
  ["committed value is replaced", "receipt", "? placed.payoutIfWin : null;", "? 0 : null;"],
];
for (const [name, target, from, to] of truthCases) {
  const source = target === "hook" ? hook : target === "modal" ? original : receipt;
  if (source.split(from).length !== 2) throw new Error(`Mutation anchor not unique: ${name}`);
  const changed = source.replace(from, to);
  const issues = receiptCommitTruthIssues(
    target === "hook" ? changed : hook,
    target === "modal" ? changed : original,
    target === "receipt" ? changed : receipt,
  );
  if (!issues.length) throw new Error(`RED MISSED: ${name}`);
}
console.log(`U43 receipt commit-truth red proof: ${truthCases.length} reversions caught`);
