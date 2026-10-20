/** Source-side companion to the real settled-money fixture in u43-hedged-result.test.mts. */
function section(source, start, end) {
  const a = source.indexOf(start);
  if (a < 0) return null;
  const b = source.indexOf(end, a + start.length);
  return b < 0 ? null : source.slice(a, b);
}

export function hedgedResultIssues({ detail, card }) {
  const issues = [];
  const labels = section(detail, "  const resultLabel =", "  const resultVariant =");
  const tone = section(detail, "  const resultVariant =", "  const resultAmountLabel =");
  const amount = section(detail, "  const resultAmountLabel =", "  // Proof geometry.");
  const announcement = section(detail, "      <UpDownResultAnnouncer rounds={[{", "      <HashFocus />");
  const cardResult = section(card, "        {settledNow && myResults && myResults.length > 0 && (", "        {/* ── ⭐ E-166 · THE HANDOVER LINE");
  const perLeg = cardResult && section(cardResult, "{myResults.map((result) => (", "                ))}");

  if (!labels || !/result === "MIXED"\s*\?\s*\(myPosition\?\.hedged\s*\?\s*t\.market\.udBothSides\s*:\s*t\.market\.udPositionsOnRound\)/.test(labels))
    issues.push("mixed detail headline names both sides or multiple positions, never a WIN");
  if (!tone || !/result === "MIXED"\s*\|\|\s*result === "CASHED_OUT"\s*\?\s*"neutral"/.test(tone))
    issues.push("mixed detail chip is neutral");
  if (!amount || !/result === "VOID"\s*\?\s*t\.market\.udRefundTitle\s*:\s*t\.market\.udPaidOut/.test(amount)
      || !/const resultAmount = result === "LOSS"\s*\?\s*myPosition\?\.stake\s*\?\?\s*0\s*:\s*myPosition\?\.payout\s*\?\?\s*0/.test(amount)
      || !/const payoutStruck = result === "WIN";/.test(amount))
    issues.push("mixed detail displays actual paid total in normal ink");
  if (!announcement || !/myPosition\s*&&\s*!myPosition\.hedged\s*&&/.test(announcement)
      || !/myPosition\.result === "WIN"\s*\|\|\s*myPosition\.result === "LOSS"\s*\|\|\s*myPosition\.result === "VOID"/.test(announcement))
    issues.push("hedged aggregate cannot trigger a WIN or LOSS announcement");
  if (!cardResult || !/myResults\.reduce\(\(sum, result\) => sum \+ result\.payout, 0\)/.test(cardResult)
      || !/myResults\.some\(\(result\) => result\.side === "UP"\)/.test(cardResult)
      || !/myResults\.some\(\(result\) => result\.side === "DOWN"\)/.test(cardResult))
    issues.push("settled card retains the actual total payout and two-sided heading");
  if (!perLeg || !/result\.side === "UP"\s*\?\s*t\.market\.udUp\s*:\s*t\.market\.udDown/.test(perLeg)
      || !/result\.status === "WIN"\s*\?\s*t\.market\.udWon/.test(perLeg)
      || !/result\.status === "LOSS"\s*\?\s*t\.market\.udLost/.test(perLeg)
      || !/formatTzs\(result\.status === "LOSS"\s*\?\s*result\.stake\s*:\s*result\.payout\)/.test(perLeg)
      || !/className="amount font-semibold text-text"/.test(perLeg))
    issues.push("settled card shows each side, stored status and its amount in normal ink");
  return issues;
}
