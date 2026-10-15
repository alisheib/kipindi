/**
 * Anchors for red:journey-updown — each puts back, on the real file, a defect Juu/Chini's journey arm (Vodacom S12,
 * WP8–WP11) was built to make impossible. DATA, so `test:red-anchors` §3 audits that every `from` still resolves exactly
 * once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE: editing one of these lines must be paired with re-anchoring here, or the harness reports
 * ANCHOR FAIL — loudly, by design.
 * ⭐ EVERY `expect` IS THE LABEL `test:journey-updown` MUST PRINT AS `FAIL` (the text before its first " — "): a defect
 * caught for the wrong reason does not count as caught.
 */
export const MUTATIONS = [
  {
    // The money: a tap that places without the frame's and the hook's agreement.
    name: "jud-arm.tsx — the two-way buttons place without `ready` (a tap could send a figure the player is not looking at)",
    file: "src/components/journey/updown/jud-arm.tsx",
    from: `onClick={() => { if (ready) bet.place(side); }} disabled={!ready}`,
    to: `onClick={() => { bet.place(side); }} disabled={!ready}`,
    expect: "1.2 every `bet.place(` in the arm sits behind `if (ready)`",
  },
  {
    name: "updown-arm.ts — judCommitReady stops asking that the hook would place the stake on screen",
    file: "src/lib/journey/updown-arm.ts",
    from: `hook.stakeReady && hook.stake === frame.stake && !hook.locallyLocked;`,
    to: `hook.stakeReady && !hook.locallyLocked;`,
    expect: "1.4 judCommitReady: enabled frame + the hook's stake equal to the frame's → ready; a different hook stake, an unready stake or the lock → not",
  },
  {
    // The ruling: a seed with rates lets the YES/NO engine price a multiple for a round.
    name: "updown-arm.ts — the round's seed carries rates (the frame could price a multiple)",
    file: "src/lib/journey/updown-arm.ts",
    from: `    rates: null,
    feePct: null,`,
    to: `    rates: { feeModel: "loser-share", commissionRate: 0.1, feeCeilingRate: 1 / 3, loserShareRate: 0.13, platformFeeRate: 0, operatorFeeRate: 0 } as never,
    feePct: null,`,
    expect: "2.1 the seed carries the round's pools and bounds and NO rates (the frame's estimate can never price a multiple)",
  },
  {
    name: "journey-updown.ts — the spendable figure leaves the bonus out (F1 again, on the journey arm)",
    file: "src/lib/server/journey-updown.ts",
    from: `    ? Math.max(0, wallet.balance) + Math.max(0, wallet.bonusBalance ?? 0)`,
    to: `    ? Math.max(0, wallet.balance)`,
    expect: "7.4 the viewer half reads the sheet's own viewerFacts and counts the bonus as spendable; a failed read is unknown (null), never zero",
  },
  {
    name: "updown-arm.ts — a burst's spend comes off the bonus first (the balance a stale read shows stays too high)",
    file: "src/lib/journey/updown-arm.ts",
    from: `  const fromBalance = Math.min(balance, spent);`,
    to: `  const fromBalance = Math.max(0, spent - Math.max(0, wallet.bonusBalance ?? 0));`,
    expect: "2.11 a burst's spend comes off a stale read: the balance first, then the bonus, floored at zero (2,000 + 3,000 less 4,000 → 0 + 1,000)",
  },
  {
    name: "updown-arm.ts — the deposit door drops the round's bet (the way back cannot find the round)",
    file: "src/lib/journey/updown-arm.ts",
    from: `  const query = new URLSearchParams({ amount: String(amount), bet: formatBetParam(judBet(roundId, side, stake)), from: "low-balance" });`,
    to: `  const query = new URLSearchParams({ amount: String(amount), from: "low-balance" });`,
    expect: "3.1 the deposit door: /wallet/deposit with the offered amount, from=low-balance and the round's bet (the sheet's query shape)",
  },
  {
    name: "updown-arm.ts — the notice says when a round that is already live \"starts\"",
    file: "src/lib/journey/updown-arm.ts",
    from: `Number.isFinite(opens) && opens > input.nowMs ? opens : null,`,
    to: `Number.isFinite(opens) ? opens : null,`,
    expect: "4.2 a future opening instant says when the next round starts; a past one says nothing (that round is live)",
  },
  {
    name: "round page — the paid line read from the address (a forwarded link could tell a player money arrived)",
    file: "src/app/updown/[roundId]/page.tsx",
    from: `judClosedNotice({ successor: round.successor, confirmedDepositTzs: null, nowMs: round.serverNowMs })`,
    to: `judClosedNotice({ successor: round.successor, confirmedDepositTzs: Number(sp?.bet?.split(".")[2] ?? 0) || null, nowMs: round.serverNowMs })`,
    expect: "4.5 the round page never reads the paid amount from the address: it passes `confirmedDepositTzs: null` until S9's owned status exists",
  },
  {
    // ⭐ The owner's ruling of 2026-10-14: an Up & Down choice says Up or Down and nothing else.
    name: "jud-arm.tsx — a multiple put back on the arm's side buttons",
    file: "src/components/journey/updown/jud-arm.tsx",
    from: `className={GLYPH_NO_SHRINK} />} {sideWord(t, side, "UPDOWN")}`,
    to: `className={GLYPH_NO_SHRINK} />} {sideWord(t, side, "UPDOWN")}<span className="amount">≈1.50×</span>`,
    expect: "5.1 every journey render obeys the ruling and the boards: word-only sides, no \"×\", chips in full, the commit and the prompt name the stake, the projection is the pool's with its qualifier, the empty side iff true",
  },
  {
    name: "jud-arm.tsx — the confirm panel's projection from a rate instead of the pool",
    file: "src/components/journey/updown/jud-arm.tsx",
    from: `  const projected = judProjection(round.pricing, side, frame.breaks === null ? frame.stake : null);`,
    to: `  const projected = frame.breaks === null && frame.stake !== null ? Math.round(frame.stake * 1.5) : null;`,
    expect: "5.1 every journey render obeys the ruling and the boards: word-only sides, no \"×\", chips in full, the commit and the prompt name the stake, the projection is the pool's with its qualifier, the empty side iff true",
  },
  {
    name: "jud-arm.tsx — the chips go back to the classic short labels (\"1K\")",
    file: "src/components/journey/updown/jud-arm.tsx",
    from: `onClick={() => setText(String(amount))}>{formatNumber(amount)}</Button>)}`,
    to: `onClick={() => setText(String(amount))}>{amount >= 1000 ? \`\${amount / 1000}K\` : formatNumber(amount)}</Button>)}`,
    expect: "5.1 every journey render obeys the ruling and the boards: word-only sides, no \"×\", chips in full, the commit and the prompt name the stake, the projection is the pool's with its qualifier, the empty side iff true",
  },
  {
    name: "updown-card.tsx — a line of the classic control edited (a classic reader would be served a different card)",
    file: "src/components/updown/updown-card.tsx",
    from: `                bet={bet} pricing={pricing} assetName={assetName} size="card" stopPropagation`,
    to: `                bet={bet} pricing={pricing} assetName={assetName} size="detail" stopPropagation`,
    expect: "6.1 every base line of the five classic files is still there, in order, but for the named swaps",
  },
  {
    name: "board page — the journey prop handed to every card (a classic card's props and flight data gain a key)",
    file: "src/app/updown/page.tsx",
    from: `                {...(judViewer ? { journey: judViewer } : {})}`,
    to: `                journey={judViewer}`,
    expect: "7.2 …and hand them on by a spread a classic reader's props never see (no `journey` key, not even null)",
  },
  {
    name: "updown-arm.ts — the tab marker written before the privacy notice names a round",
    file: "src/lib/journey/updown-arm.ts",
    from: `export const JUD_TAB_MARKER = false;`,
    to: `export const JUD_TAB_MARKER = true;`,
    expect: "3.4 ⛔ the tab marker that carries a stake is written only once the privacy notice names a round (S12-PLAN Risk 14): JUD_TAB_MARKER is false, or §7 holds the round sentence",
  },
  {
    name: "i18n-dict.ts — the Chinese How-to says winners split the pool equally again (false)",
    file: "src/lib/i18n-dict.ts",
    from: `      howStep3Body: "赢家按投注比例分享奖池。奖金进入您的余额，可通过手机钱包提现。",`,
    to: `      howStep3Body: "赢家平分奖池。奖金进入您的余额，可通过手机钱包提现。",`,
    expect: "8.4 the Chinese How-to says winners share the pool in proportion to their bets (赢家按投注比例分享奖池), never \"equally\" (平分)",
  },
  {
    // DA T5: every numeral is the mono figure face, a time inside a sentence included (the visual audit's F18/F55 class).
    name: "globals.css — the round-closed notice's start time falls back to the body face",
    file: "src/app/globals.css",
    from: `.kp-jud__time { white-space: nowrap; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }`,
    to: `.kp-jud__time { white-space: nowrap; font-variant-numeric: tabular-nums; }`,
    expect: "5.6 the round-closed notice in en/sw/zh: the title alone while nothing is known; then the paid line (its figure the mono money span), the next start (a 24-hour time in the mono face) and the button carrying the side",
  },
];
