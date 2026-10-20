/** Source-side companion to the real memory/PostgreSQL settlement fixture. */
function section(source, start, end) {
  const a = source.indexOf(start);
  if (a < 0) return null;
  const b = source.indexOf(end, a + start.length);
  return b < 0 ? null : source.slice(a, b);
}

export function hedgedResultIssues({ detail, card, boardPage, announcer, countdown, dictionary, marketCard, resolutionPanel }) {
  const issues = [];
  const labels = section(detail, "  const resultLabel =", "  const resultVariant =");
  const tone = section(detail, "  const resultVariant =", "  const resultAmountLabel =");
  const amount = section(detail, "  const resultAmountLabel =", "  // Proof geometry.");
  const detailAnnouncement = section(detail, "      <UpDownResultAnnouncer rounds={[{", "      <HashFocus />");
  const poll = section(detail, "      <RefreshPoller {...refreshCadence({", "      {/* ⭐ THE RESULT MOMENT");
  const cardResult = section(card, "        {settledNow && settled && cardResults.length > 0 && (", "        {/* ── ⭐ E-166 · THE HANDOVER LINE");
  const perLeg = cardResult && section(cardResult, "{cardResults.map((result) => (", "                ))}");
  const boardAnnouncement = section(boardPage, "        <UpDownResultAnnouncer rounds={rounds.map((r) => ({", "        }))} />");
  const mixedToast = section(announcer, "res.status === \"MIXED\") {", "res.status === \"VOID\") {");
  const paidDetail = section(detail, ") : decided && myPosition && (result || myPosition.incompletePayout) ? (", ") : round.settled && refundReason ? (");
  const pendingPanel = section(detail,
    ") : decided && !round.settled && pendingItems.length > 0 ? (",
    ") : decided && myPosition && (result || myPosition.incompletePayout) ? (");
  const pendingCopy = [...dictionary.matchAll(/udPaymentPending:\s*"([^"]+)"/g)].map((match) => match[1]);

  if (!labels || !/result === "MIXED"\s*\?\s*\(myPosition\?\.hedged\s*\?\s*t\.market\.udBothSides\s*:\s*t\.market\.udPositionsOnRound\)/.test(labels))
    issues.push("mixed detail headline names both sides or multiple positions, never a WIN");
  if (!tone || !/result === "MIXED"\s*\|\|\s*result === "CASHED_OUT"\s*\?\s*"neutral"/.test(tone))
    issues.push("mixed detail chip is neutral");
  if (!amount || !/result === "VOID"\s*\?\s*t\.market\.udRefundTitle\s*:\s*t\.market\.udPaidOut/.test(amount)
      || !/const resultAmount = myPosition\?\.incompletePayout \? null/.test(amount)
      || !/result === "LOSS" \? myPosition\?\.stake \?\? null : myPosition\?\.payout \?\? null/.test(amount)
      || !/const payoutStruck = result === "WIN";/.test(amount))
    issues.push("mixed detail displays actual paid total in normal ink");
  if (!/myPosition\?\.incompletePayout \? t\.market\.udPayoutUnavailable/.test(labels)
      || !/myPosition\?\.incompletePayout \? "neutral"/.test(tone)
      || !/result \|\| myPosition\.incompletePayout/.test(detail)
      || !/resultAmount == null \? t\.market\.udPayoutUnavailable : formatTzs\(resultAmount\)/.test(detail)
      || !/p\.payout == null \? "neutral" : positionStatusChip\(p\.status\)/.test(paidDetail)
      || !/p\.payout != null && <StateGlyph/.test(paidDetail)
      || !/p\.payout == null \? t\.market\.udPayoutUnavailable : POSITION_STATUS_LABEL\(t, p\.status\)/.test(paidDetail)
      || !/p\.payout == null \? t\.market\.udPayoutUnavailable : formatTzs\(p\.payout\)/.test(paidDetail))
    issues.push("incomplete detail suppresses aggregate money and WIN seal but keeps item status");
  if (!detailAnnouncement || !/settledAtMs: round\.settledAtMs/.test(detailAnnouncement)
      || !/roundAnnouncementFor\(round\.myResults, round\.settled\)/.test(detailAnnouncement))
    issues.push("detail announces only actual paid aggregate at actual payment time");
  if (!boardAnnouncement || !/settledAtMs: r\.settledAtMs/.test(boardAnnouncement)
      || !/roundAnnouncementFor\(r\.myResults, r\.settled\)/.test(boardAnnouncement))
    issues.push("board announces the same actual paid aggregate");
  if (!poll || !/settled: round\.settled/.test(poll)
      || !/paymentPending: decided && !round\.settled/.test(poll))
    issues.push("decided-but-unpaid detail keeps polling at its payment cadence");
  if (!/decided && !round\.settled && \(\s*<p role="status"/.test(detail)
      || !/settled=\{round\.settled\}/.test(detail)
      || !/paymentPending=\{decided && !round\.settled\}/.test(detail))
    issues.push("detail names pending settlement and withholds handover");
  if (!/myPosition\?\.items\.filter\(\(item\) => item\.status === "OPEN"\)/.test(detail)
      || !/const pendingStake = pendingItems\.reduce\(\(sum, item\) => sum \+ item\.stake, 0\)/.test(detail)
      || !/myPosition\?\.items\.filter\(\(item\) => item\.status === "CASHED_OUT"\)/.test(detail)
      || !/earlierCashouts\.every\(\(item\) => item\.payout != null && Number\.isFinite\(item\.payout\)\)/.test(detail)
      || !pendingPanel
      || !/formatTzs\(pendingStake\)/.test(pendingPanel)
      || !/earlierCashouts\.length > 0/.test(pendingPanel)
      || !/earlierCashoutPayout == null \? t\.market\.udPayoutUnavailable : formatTzs\(earlierCashoutPayout\)/.test(pendingPanel)
      || !/pendingUp && pendingDown \? t\.market\.udBothSides : pendingUp \? t\.market\.udUp : t\.market\.udDown/.test(pendingPanel)
      || !/t\.market\.udSettlementPending/.test(pendingPanel)
      || /t\.market\.(?:udYourResult|resolvedWin)/.test(pendingPanel))
    issues.push("unpaid holder sees only OPEN stake and side, never a paid result");
  if (!paidDetail || !/\{round\.settled && refundReason && \(/.test(paidDetail)
      || !/\) : round\.settled && refundReason \? \(/.test(detail))
    issues.push("detail withholds refund claims until actual payment, including a cashed-out viewer");
  if (!/myPosition\.incompletePayout \? \(\s*<p[^>]*>\s*\{refundReason === "unmatched" \? t\.market\.udRefundUnmatchedReason/.test(paidDetail)
      || !/VOID_NOTE_KEY\[refundReason\]/.test(paidDetail))
    issues.push("incomplete detail never claims the remaining stake was fully refunded");
  if (pendingCopy.length !== 3
      || pendingCopy[0] !== "Round outcome recorded. Settlement is pending."
      || pendingCopy[1] !== "Matokeo ya raundi yamerekodiwa. Malipo yanasubiri."
      || pendingCopy[2] !== "本轮结果已记录，款项仍待结算。")
    issues.push("unpaid outcome copy is neutral when a VOID has no confirmed price");
  if (!cardResult || !/cardPayoutTotal == null \? t\.market\.udPayoutUnavailable : formatTzs\(cardPayoutTotal\)/.test(cardResult)
      || !/cardResults\.some\(\(result\) => result\.side === "UP"\)/.test(cardResult)
      || !/cardResults\.some\(\(result\) => result\.side === "DOWN"\)/.test(cardResult)
      || !/cardResults\[0\]\.payout == null \? t\.market\.udPaidOut/.test(cardResult))
    issues.push("paid card retains the actual total payout and two-sided heading");
  if (!perLeg || !/result\.side === "UP"\s*\?\s*t\.market\.udUp\s*:\s*t\.market\.udDown/.test(perLeg)
      || !/result\.status === "WIN"\s*\?\s*t\.market\.udWon/.test(perLeg)
      || !/result\.status === "LOSS"\s*\?\s*t\.market\.udLost/.test(perLeg)
      || !/result\.status === "CASHED_OUT"\s*\?\s*t\.market\.udPosCashedOut/.test(perLeg)
      || !/result\.payout == null \? t\.market\.udPaidOut/.test(perLeg)
      || !/result\.status === "LOSS" \? t\.market\.udStake : t\.market\.udPaidOut/.test(perLeg)
      || !/result\.payout == null \? t\.market\.udPayoutUnavailable/.test(perLeg)
      || !/formatTzs\(result\.status === "LOSS"\s*\?\s*result\.stake\s*:\s*result\.payout\)/.test(perLeg))
    issues.push("paid card names every leg, including cash-outs, with its own amount");
  if (!cardResult || !/cardResults\[0\]\.payout == null \? t\.market\.udPayoutUnavailable/.test(cardResult)
      || !/cardResults\.every\(\(result\) => result\.status === "VOID" && result\.payout === result\.stake\)/.test(cardResult)
      || !/cardResults\[0\]\.status === "WIN" && cardResults\[0\]\.payout != null/.test(cardResult)
      || !/result\.payout == null \? t\.market\.udPayoutUnavailable/.test(cardResult)
      || !/const cardResults = myResults\?\.map\(\(r\) => \(\{ \.\.\.r, payout: validRealizedPayout\(r\) \? r\.payout : null \}\)\)/.test(card)
      || !/const cardPayoutSum = cardResults\.reduce\(\(sum, result\) => sum \+ \(result\.payout \?\? 0\), 0\)/.test(card)
      || !/const cardPayoutTotal = !incompleteCardResult && Number\.isSafeInteger\(cardPayoutSum\)/.test(card)
      || !/const cardRefundCopyText = incompleteCardResult && refundReason/.test(card)
      || !/const ownRefundAmountShown = settledNow && settled && cardResults\.length > 0\s*&& cardResults\.every\(\(r\) => r\.status === "VOID" && r\.payout === r\.stake\)/.test(card))
    issues.push("incomplete card shows unavailable payout instead of a partial total");
  if (!/players > 0 \? t\.market\.udNoActiveStakes : t\.market\.udNoBetsPlaced/.test(card)
      || !/round\.players > 0 \? t\.market\.udNoActiveStakes : t\.market\.udNoBetsPlaced/.test(detail))
    issues.push("a zero active pool after real cash-outs is never called no bets placed");
  for (const [label, noActive, unavailable, band, proof] of [
    ["English", "No stake remained when the round closed.", "Payout unavailable", "stakes still held at settlement", "Earlier cash-outs keep the amount already paid"],
    ["Swahili", "Hakuna dau lililobaki raundi ilipofungwa.", "Malipo hayapatikani", "dau yaliyobaki hadi malipo", "Malipo ya kuuza dau mapema hayabadiliki"],
    ["Chinese", "本轮收盘时没有剩余投注。", "派彩金额暂不可用", "结算时仍持有的投注金额", "此前兑现的金额保持不变"],
  ]) {
    if (!dictionary.includes(`udNoActiveStakes: "${noActive}"`)
        || !dictionary.includes(`udPayoutUnavailable: "${unavailable}"`)
        || !dictionary.includes(band) || !dictionary.includes(proof))
      issues.push(`${label} names remaining stakes and unknown payout without denying earlier cash-outs`);
  }
  if (!dictionary.includes('resolvedOutcome: "已判定"') || dictionary.includes('resolvedOutcome: "已结算"'))
    issues.push("Chinese price verdict does not claim money was settled");
  if (!/settledNow && !settled && \(\s*<p role="status"/.test(card)
      || !/state: p\.paymentSettled \? state : "confirming"/.test(card))
    issues.push("card names pending settlement and withholds handover");
  if (!/settled && price\.kind === "priced" \? t\.market\.udUpWins : t\.market\.udUp/.test(card)
      || !/settled && price\.kind === "priced" \? t\.market\.udDownWins : t\.market\.udDown/.test(card)
      || !/resolved=\{state === "resolved" && settled\}/.test(card)
      || !/resolved=\{round\.state === "resolved" && round\.settled\}/.test(detail))
    issues.push("unpaid price verdict has no wins wording or resolved shimmer");
  if (!/<section aria-label=\{round\.settled && !round\.correctionKind \? t\.market\.udSettlementProof : t\.market\.udPriceVerdictProof\}/.test(detail)
      || !/<span className=\{eyebrow\}>\{round\.settled && !round\.correctionKind \? t\.market\.udSettlementProof : t\.market\.udPriceVerdictProof\}<\/span>/.test(detail)
      || !/<div className="border-t border-border-subtle\/60"/.test(detail)
      || /<div className="gilt-rule"/.test(detail))
    issues.push("unpaid evidence is labelled price verdict proof, not settlement proof");
  if (!/correctionKind=\{r\.correctionKind\}/.test(boardPage)
      || !/correctionKind === "objection" \? t\.market\.resCorrectedOnObjection : t\.market\.udVerdictChanged/.test(card)
      || !/round\.correctionKind === "objection" \? t\.market\.resCorrectedOnObjection : t\.market\.udVerdictChanged/.test(detail)
      || !/t\.market\.udPriceRecordOriginal/.test(detail))
    issues.push("officer-corrected verdict is explained beside original price evidence");
  for (const [label, voidWord, voidBody, proof] of [
    ["English", "Void", "Remaining held stakes are returned in full when settlement completes. Earlier cash-outs keep their paid amount.", "Price verdict proof"],
    ["Swahili", "Batili", "Dau yaliyobaki hurejeshwa kikamilifu malipo yakikamilika. Malipo ya kuuza dau mapema hayabadiliki.", "Uthibitisho wa matokeo ya bei"],
    ["Chinese", "作废", "仍持有的投注金额将在结算完成时全额退回。此前兑现的金额保持不变。", "价格判定依据"],
  ]) {
    if (!dictionary.includes(`udVoided: "${voidWord}"`)
        || !dictionary.includes(voidBody)
        || !dictionary.includes(`udPriceVerdictProof: "${proof}"`))
      issues.push(`${label} void chip and pending proof do not claim paid refunds`);
  }
  for (const [label, changed, original] of [
    ["English", "Final outcome changed after review.", "The prices shown are the original recorded readings."],
    ["Swahili", "Matokeo ya mwisho yalibadilishwa baada ya ukaguzi.", "Bei zinazoonyeshwa ni usomaji wa awali uliorekodiwa."],
    ["Chinese", "最终结果经复核后已更改。", "所示价格为最初记录的读数。"],
  ]) {
    if (!dictionary.includes(`udVerdictChanged: "${changed}"`) || !dictionary.includes(`udPriceRecordOriginal: "${original}"`))
      issues.push(`${label} explains legacy corrected verdict without asserting price crossed the new side`);
  }
  if (!/statusWord === "VOID" \? \(settledAt \? t\.market\.resVoidRefund : t\.market\.resVoidPending\)/.test(marketCard)
      || !/\{settledAt \? t\.market\.resVoidRefund : isVoid \? t\.market\.resVoidPending : t\.market\.resOneSidedPending\}/.test(resolutionPanel))
    issues.push("market card and resolution panel gate VOID refund wording on committed settlement");
  for (const [label, paid, pending, oneSided] of [
    ["English", "Any stake still held was refunded in full. Earlier cash-outs keep their paid amount. No settlement fee was taken.", "Any stake still held will be refunded in full when settlement completes. Earlier cash-outs keep their paid amount. No settlement fee will be taken.", "Only one side holds stakes, so remaining held stakes will be refunded in full when settlement completes. Earlier cash-outs keep their paid amount. No settlement fee will be taken."],
    ["Swahili", "Dau lolote lililobaki lilirejeshwa kikamilifu. Malipo ya kuuza dau mapema hayabadiliki. Hakuna ada ya malipo iliyokatwa.", "Dau lolote lililobaki litarejeshwa kikamilifu malipo yakikamilika. Malipo ya kuuza dau mapema hayabadiliki. Hakuna ada ya malipo itakayokatwa.", "Upande mmoja tu una madau, hivyo madau yaliyobaki yatarejeshwa kikamilifu malipo yakikamilika. Malipo ya kuuza dau mapema hayabadiliki. Hakuna ada ya malipo itakayokatwa."],
    ["Chinese", "如有仍持有的投注金额，已全额退回。此前兑现的金额保持不变。未收取结算费用。", "如有仍持有的投注金额，将在结算完成时全额退回。此前兑现的金额保持不变。不会收取结算费用。", "只有一方仍持有投注，因此剩余投注金额将在结算完成时全额退回。此前兑现的金额保持不变。不会收取结算费用。"],
  ]) {
    if (!dictionary.includes(`resVoidRefund: "${paid}"`)
        || !dictionary.includes(`resVoidPending: "${pending}"`)
        || !dictionary.includes(`resOneSidedPending: "${oneSided}"`))
      issues.push(`${label} generic VOID and one-sided copy distinguishes paid from pending and prior cash-outs`);
  }
  if (!/\) : settled && refundReason \? \(/.test(card)
      || !/\) : settled && state === "resolved" && price\.kind === "oneSided" \? \(/.test(card)
      || !/const ownRefundAmountShown = settledNow && settled &&/.test(card)
      || !/\) : settledNow \? null : \(\s*<p[^>]*>\{t\.market\.udAwaitingResult\}/.test(card))
    issues.push("unpaid VOID and one-sided card never claim a returned stake before payment");
  if (!mixedToast || !/variant: "factual"/.test(mixedToast)
      || !/formatTzs\(res\.stake\)/.test(mixedToast)
      || !/formatTzs\(res\.payout\)/.test(mixedToast)
      || /dispatchWinCelebration/.test(mixedToast))
    issues.push("mixed live result is a neutral factual stake/payout toast, not a seal");
  if (!/recordHref: "\/updown\/history"/.test(announcer))
    issues.push("away Up & Down result opens its own durable record");
  if (!/const textOnlyPod = paymentPending \|\|/.test(countdown)
      || !/const podPhase = paymentPending \? "payment-pending"/.test(countdown))
    issues.push("detail clock presents payment pending without a dead countdown");
  return issues;
}
