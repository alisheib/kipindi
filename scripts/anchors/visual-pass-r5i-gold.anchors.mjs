/** Physical gold-restoration plants for the R5-I guard; read by red-anchors. */
export const MUTATIONS = [
  {
    name: "a placed bet's Continue follows its side",
    file: "src/components/markets/operation-result-modal.tsx",
    from: 'stripTone === "yes" ? "btn-yes"',
    to: 'stripTone === "yes" ? "btn-primary"',
    expect: "FAIL 2.1″",
  },
  {
    name: "the fee-free exit is a success, without changing the fee",
    file: "src/components/markets/sell-confirm-modal.tsx",
    from: 'color: isFree ? "var(--success-fg)"',
    to: 'color: isFree ? "var(--text)"',
    expect: "FAIL 2.5u",
  },
  {
    name: "the classic bell's unread dot is gold",
    file: "src/components/layout/notifications-panel.tsx",
    from: 'const unreadDot = journey ? "brand" : "gold";',
    to: 'const unreadDot = journey ? "brand" : "brand";',
    expect: "FAIL 6.5",
  },
  {
    name: "the classic capsule's positive move has its original ink",
    file: "src/components/layout/wallet-balance-pill.tsx",
    from: 'delta > 0 ? "var(--yes-300)" : "var(--no-300)"',
    to: 'delta > 0 ? "var(--text)" : "var(--no-300)"',
    expect: "FAIL 6.6",
  },
  {
    name: "the observed price follows the UP target",
    file: "src/components/updown/price-hero.tsx",
    from: 'tone === "up" ? "var(--yes-300)"',
    to: 'tone === "up" ? "var(--text)"',
    expect: "FAIL 6.6′",
  },
  {
    name: "the opening reference remains gilt",
    file: "src/components/updown/price-hero.tsx",
    from: 'y1={openY} x2="606" y2={openY} stroke="var(--gilt)"',
    to: 'y1={openY} x2="606" y2={openY} stroke="var(--text)"',
    expect: "FAIL 6.6′",
  },
  {
    name: "the raised betting-pair census catches an extra use",
    file: "src/components/updown/price-hero.tsx",
    from: "const ink = tone",
    to: 'const __r5iCensusPlant = "var(--yes-300)";\n  const ink = tone',
    expect: "FAIL 1.2",
  },
];
