/** U43 B5: one grouped USD spelling and one 24-hour EAT clock on the placed-bet receipt. */
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
