/** Structural reach checks for the slim Up & Down card. Value checks live in its test. */
export function roundCardIssues(card, controls, mark, detailPage, action, countdown, dictionary) {
  const issues = [];
  const need = (ok, what) => { if (!ok) issues.push(what); };
  const nowStart = card.indexOf('className="ud-now"');
  const statsStart = card.indexOf('className="ud-stats', nowStart);
  const nowSource = nowStart >= 0 && statsStart > nowStart ? card.slice(nowStart, statsStart) : "";
  need(card.includes('className={cn("mcardp ud-card group"'), "slim card shell");
  need(card.includes('size={32}'), "32px asset identity mark");
  need(card.includes('fmtEATClock(opensAtMs)') && card.includes('fmtEATClock(closesAtMs)'), "real EAT round window");
  need(card.includes('const durationWords = roundDuration(t, durationMinutes);')
    && !card.includes('durationMinutes} ${t.market.udMin}'), "card duration follows each language's grammar");
  need(card.includes('className="ud-clock"') && card.includes('aria-live="polite"'), "one accessible clock row");
  need(card.includes('className="m-tick shrink-0 whitespace-nowrap font-mono font-bold tabular-nums leading-none"'),
    "the 28px clock never splits its digits at 320px");
  need(card.includes('const clockWithoutTarget = (awaitingResult && !resultRunning) || !running;')
    && card.includes('digits={clockWithoutTarget ? "—:—" : null}')
    && card.includes('aria-hidden={!counting}')
    && card.includes('visibility: counting ? undefined : "hidden"'),
    "closed round names its pending state without painting a false clock, while reserving the slot");
  need(card.includes('urgent ? t.market.udLastSeconds'), "last seconds named in words");
  need(card.includes('urgent ? "m-urgent" : undefined') && !card.includes('ud-count-pulse'),
    "urgent digits use the kit motion tier");
  need(card.includes('className="ud-beat') && (card.match(/t\.market\.udOpenPrice/g) ?? []).length === 1
    && !card.includes('t.market.udWinTarget'),
    "the opening price is named once as a reference, never as either winning boundary");
  const beat = card.slice(card.indexOf('className="ud-beat'), card.indexOf('{openPrice == null', card.indexOf('className="ud-beat')));
  need(beat.length > 0 && !beat.includes("±") && !card.includes("priceText.margin"),
    "price to beat has no unexplained margin");
  need(!nowSource.includes('ud-now-delta') && !card.includes('move: shownPrice'),
    "confirmed price has no second unlabeled difference");
  need(!card.includes('className="ud-prices"') && !card.includes('>≥ {priceText.up}')
    && !card.includes('>≤ {priceText.down}'), "no target tiles");
  need(card.includes('const readKind = cardPriceRead({ opensAtMs, closesAtMs, readQuotedAt, openPrice, readPrice });')
    && card.includes('readKind === "newer"') && !card.includes('sourceQuotedAt'),
    "newer price requires this round's timed observation, never asset latest");
  need(card.includes('const displayedQuotedAt = settledNow')
    && card.includes('closePrice != null ? closeQuotedAt : openPrice != null ? openQuotedAt : null')
    && card.includes('hasNewerRead ? readQuotedAt : openPrice != null ? openQuotedAt : null'),
    "source stamp follows the displayed open, newer or close price");
  need(card.includes('readUnavailable ? t.market.udReadUnavailable'),
    "a failed round observation read is named, not called no newer price");
  need(card.includes('const priceColor = "var(--text)";')
    && nowSource.includes('style={{ color: priceColor }}')
    && !/var\(--(?:yes-300|no-300|gilt)\)/.test(nowSource),
    "confirmed price and arrow wear neutral ink; side colours belong to choices and outcomes");
  need(card.includes('<RoundLiveLine assetKey={assetKey} opensAtMs={opensAtMs}'), "live-line slot");
  need(card.includes('const quoteVisible = locked || awaitingResult || state === "confirming"'),
    "frozen payout rows survive confirming");
  need(card.includes('{settledNow && settled && cardResults.length > 0 && ('), "viewer result from settled rows");
  need(card.includes('outcome === "UP" ? <><I.arrowUp s={14} edge="start" text="body-700" />{settled && price.kind === "priced" ? t.market.udUpWins : t.market.udUp}</>')
    && card.includes('outcome === "DOWN" ? <><I.arrowDown s={14} edge="start" text="body-700" />{settled && price.kind === "priced" ? t.market.udDownWins : t.market.udDown}</>'),
    "only a two-sided result claims a win; one-sided and empty results name direction");
  need(card.includes('settled && state === "resolved" && price.kind === "oneSided" ? (')
    && card.includes('<p className="m-0 text-body-sm text-text-muted">{t.market.udRefundUnmatchedReason}</p>')
    && card.includes('state === "resolved" && price.kind === "none" ? (')
    && card.includes('players > 0 ? t.market.udNoActiveStakes : t.market.udNoBetsPlaced'),
    "settled guest card explains an unmatched refund or an empty pool without claiming a viewer refund");
  need(card.includes('cardResults[0].status === "LOSS" ? t.market.udLost')
    && card.includes('cardResults[0].payout == null ? t.market.udPayoutUnavailable')
    && card.includes('cardResults[0].payout != null && <>')
    && card.includes('cardResults[0].status !== "VOID" && <span>{t.market.udPaidOut}</span>')
    && card.includes('formatTzs(cardResults[0].payout)'),
    "single result labels the actual realized payout, including zero for a loss, or withholds an unknown amount");
  need(!card.includes('btn btn-ghost btn-lg pointer-events-none'), "no fake awaiting-result button");
  need(card.includes('<UpDownSidePair assetName={assetName} onPick={go} />'), "signed-out choices use shared pair");
  need(!card.includes('ml-auto whitespace-nowrap">{t.market.udOpenPrice}'), "no repeated open-price footer");
  need(controls.includes('role="radiogroup" aria-label={t.market.udStake}')
    && controls.includes('className={compact ? "ud-custom-word" : undefined}'), "accessible one-row stake chips");
  need(controls.includes('bet.pendingSlow ? t.market.udStillPlacing : t.market.udPlacing')
    && !controls.includes('<span className="live-dot" />'), "placing helper has words without live dot");
  need(mark.includes('<I.crypto') && !mark.includes('crypto: "₿"'), "BTC icon uses the glyph family");
  need(detailPage.includes('lastSecondsLabel={isOpen ? t.market.udLastSeconds : undefined}')
    && countdown.includes('const shownCaption = urgent ? lastSecondsLabel! : handCaption ?? caption;'),
    "detail clock names final betting seconds even when motion is reduced");
  need(detailPage.includes('result === "LOSS" ? t.market.udStake')
    && detailPage.includes('result === "VOID" ? t.market.udRefundTitle : t.market.udPaidOut')
    && detailPage.includes('result === "LOSS" ? myPosition?.stake ?? null : myPosition?.payout ?? null')
    && detailPage.includes('resultAmount == null ? t.market.udPayoutUnavailable : formatTzs(resultAmount)'),
    "detail receipt labels earned payout, lost stake and returned stake by their real meaning");
  need(detailPage.includes('<Chip>{roundDuration(t, round.durationMinutes)}</Chip>'),
    "detail duration follows each language's grammar");
  need(detailPage.includes('livePrice: round.readPrice')
    && detailPage.includes('round.closePrice != null ? round.closeQuotedAt : round.openQuotedAt')
    && detailPage.includes('heroLive != null ? round.readQuotedAt : round.openQuotedAt'),
    "detail price and source time belong to this round, not the asset's latest quote");
  need(detailPage.includes('const openClock = fmtEATClock(Date.parse(round.opensAt));')
    && detailPage.includes('round.readUnavailable ? t.market.udReadUnavailable')
    && detailPage.includes('(round.state === "open" || round.state === "locked") && round.openPrice != null && openClock')
    && detailPage.includes('t.home.udMatchNoNewPrice.replace("{time}", openClock)')
    && detailPage.includes(': t.market.udAwaitingRead,'),
    "detail names no newer price since the verified open, and separates a failed read from an absent open");
  need(detailPage.includes('{usd(Math.abs(move), dec)}')
    && detailPage.includes('`${sgn(pMove)}${usd(Math.abs(pMove), dec)}`')
    && !detailPage.includes('${Math.abs(move).toFixed(dec)}')
    && !detailPage.includes('${Math.abs(pMove).toFixed(dec)}'),
    "hero and proof both group a four-digit USD move through the shared formatter");
  need(detailPage.includes('round.state === "resolved" && price.kind !== "priced" && (')
    && detailPage.includes('round.players > 0 ? t.market.udNoActiveStakes : t.market.udNoBetsPlaced'),
    "settlement proof explains a resolved round without a two-sided pool");
  need(detailPage.includes('{isOpen || locked || awaitingResult ? (')
    && action.includes('if (locked || confirming)')
    && action.includes('const payoutIfUp = myPayoutIfUp ?? null;')
    && action.includes('const payoutIfDown = myPayoutIfDown ?? null;'),
    "detail confirming state keeps the frozen payout pair");
  need(detailPage.includes('nextRoundWords={round.successor.chainRunning ? t.market.udNextAfterResult : t.market.udNextMatchNoneBody}')
    && action.includes('{nextRoundWords && <p className="mt-3 mb-0 text-body-sm text-text-subtle">{nextRoundWords}</p>}'),
    "detail next-round words are grounded in successor state");
  need(!detailPage.includes('>{t.market.udVolume}</p>')
    && detailPage.includes('className="mt-1 font-mono text-micro uppercase eyebrow text-text-subtle">{t.market.udPool}</p>'),
    "detail pool figure uses the same pool word as the card");
  need(dictionary.includes('udNextAfterResult: "The next round appears when scheduled."')
    && dictionary.includes('udNextAfterResult: "Raundi ijayo itaonekana ikipangwa."')
    && dictionary.includes('udNextAfterResult: "下一回合安排好后会显示。"'),
    "next-round wording makes no unscheduled opening promise");
  need(dictionary.includes('udNoBetsPlaced: "No bets were placed."')
    && dictionary.includes('udNoBetsPlaced: "Hakuna dau lililowekwa."')
    && dictionary.includes('udNoBetsPlaced: "本轮无人投注。"'),
    "settled empty-round explanation exists in all three languages");
  return issues;
}

/** U43 handover pod: settled phases without a target show a compact label and real next step. */
export function handoverPodIssues(countdown, css, handover) {
  const issues = [];
  const need = (ok, what) => { if (!ok) issues.push(what); };
  need(countdown.includes('const inHandover = hand != null && hand.phase !== "none" && hand.phase !== "hold";')
    && countdown.includes('settled ? resultLabels.settled')
    && countdown.includes('const textOnlyPod = paymentPending || (settled && (!inHandover || !hand!.counting));')
    && countdown.includes('const podPhase = paymentPending ? "payment-pending"')
    && countdown.includes('data-text-only={textOnlyPod ? "true" : undefined}')
    && countdown.includes('{!textOnlyPod && <span')
    && countdown.includes('"m-tick font-mono text-body-sm font-semibold uppercase eyebrow text-text-subtle"'),
    "settled hold and live successor show translated labels without false digits");
  need(css.includes('.ud-round-pod[data-text-only="true"] { min-height: var(--tap-min); justify-content: center; }')
    && css.includes('.ud-round-pod[data-text-only="true"] { min-height: var(--tap-min); width: fit-content; max-width: 100%; border-radius: var(--r-pill); }')
    && !css.includes('min-height: calc(var(--type-h2) + var(--sp-4) + 3 * var(--sp-2) + 2px);'),
    "text-only pod is a compact status capsule on desktop and phone");
  need(handover.includes('style={{ color: "var(--brand-300)", fontSize: "var(--type-small)", minHeight: "var(--tap-min)" }}'),
    "the separate next-round link is legible and a full 40px tap");
  return issues;
}
