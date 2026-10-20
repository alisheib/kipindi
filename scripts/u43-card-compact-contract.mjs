/** U43 B1/B5: the measured phone card's compact, side-neutral surfaces. */
export function compactCardIssues({ card, css, line, controls, dict }) {
  const issues = [];
  const need = (yes, label) => { if (!yes) issues.push(label); };
  const tokens = css.slice(css.indexOf("/* UP & DOWN CARD RHYTHM"), css.indexOf("/* THE JOURNEY CARD'S OWN GEOMETRY"));
  const compact = css.slice(css.indexOf("/* The Up & Down card, one rung down each."), css.indexOf("/* ─────────────────────────────────────────────", css.indexOf("/* The Up & Down card, one rung down each.")));
  const pulse = css.slice(css.indexOf("@keyframes ud-place-pulse"), css.indexOf(".ud-place-pulse", css.indexOf("@keyframes ud-place-pulse")));
  const footer = card.slice(card.indexOf('<div className="ud-foot'), card.indexOf("</article>"));
  const refund = card.slice(card.indexOf(') : refundReason ? ('), card.indexOf(') : state === "resolved" ? null'));
  const absentLine = line.slice(line.indexOf("if (!points || !last)"), line.indexOf("const prices = real.map"));

  need(tokens.includes('--ud-gap: var(--sp-1);') && compact.includes('--ud-gap: var(--sp-1);')
    && css.includes('.ud-foot { margin-top: 0; padding-top: var(--sp-1); }'),
    "open and locked card use the same compact spacing rung");
  need(card.match(/TippingBar className="mt-0\.5"/g)?.length === 2
    && controls.includes('compact ? "mb-1 flex-nowrap"')
    && controls.includes('compact ? "mb-1 text-[10px]"')
    && controls.match(/compact \? "mt-1" : "mt-1\.5"/g)?.length === 3,
    "stake controls and split use compact spacing without shrinking money taps");
  need(pulse.includes('var(--text) 40%, transparent') && !/var\(--(?:yes|no|success|brand|gold|gilt)-/.test(pulse)
    && css.includes('@keyframes ud-side-flash'), "placed ring is neutral and the chosen side still flashes");
  need(card.includes('{bettable && <Dot tone="neutral" size={6} pulse />}'),
    "breathing bettable pip uses neutral ink");
  need(card.includes('const clock = displayedQuotedAt ? fmtEATClock(Date.parse(displayedQuotedAt)) : null;')
    && footer.includes('text={quoted ? `${sourceLabel} · ${quoted}` : sourceLabel}')
    && footer.includes('dateTime={displayedQuotedAt ?? undefined}')
    && !footer.includes('t.market.udQuoted'), "one source and minute line retains the exact instant");
  need(refund.includes('!refundCopy?.claimsRefund && (')
    && !refund.includes('<Chip>{t.market.udRefundTitle}</Chip>')
    && refund.includes('{cardRefundCopyText}</p>')
    && card.includes('myResults.every((r) => r.status === "VOID")')
    && card.includes('refundReason === "unmatched" ? t.market.udRefundUnmatchedReason')
    && card.includes('VOID_NOTE_KEY[refundReason]')
    && (dict.match(/udRefundUnmatchedReason:/g) ?? []).length === 3,
    "refund card pairs one reason with the exact returned amount");
  need(card.includes('myResults.every((result) => result.status === "VOID") ? t.market.udRefundTitle : t.market.udPaidOut'),
    "two refunded sides are named returned, not paid out");
  need(absentLine.includes('if (status === "loading") return null;')
    && absentLine.includes('if (confirmedAbove)')
    && line.includes('|| (settled && confirmedAbove)))')
    && line.includes('cardPriceRead({ opensAtMs, closesAtMs, readQuotedAt: readQuotedAt ?? null, openPrice, readPrice }) === "newer"')
    && (absentLine.match(/data-testid="round-live-line-unavailable">\{words\.confirmedFallback\}<\/p>/g) ?? []).length === 2
    && (absentLine.match(/data-testid="round-live-line-empty">\{words\.unavailable\}<\/span>/g) ?? []).length === 2
    && line.includes('unavailable: "Minute price history unavailable for this round", confirmedFallback: "Minute history unavailable · confirmed price shown above"')
    && line.includes('unavailable: "Historia ya bei za dakika haipatikani kwa raundi hii", confirmedFallback: "Historia ya dakika haipatikani · bei iliyothibitishwa iko juu"')
    && line.includes('unavailable: "本回合分钟价格历史暂不可用", confirmedFallback: "分钟历史暂不可用 · 上方显示已确认价格"'),
    "missing minute history is explained beside a confirmed read in all languages");
  return issues;
}
