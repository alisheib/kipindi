// I-1 (second part) · the bell (journey only), /updown/history's net, the /wallet history row, the leaderboard's rate,
// the payout notice's edge, the language-change loader, and two stylesheet rules.
module.exports = [
  // ── the bell: the journey's count badge and "Clear all" (the classic bell is frozen chrome — owner item) ────────────
  { file: "src/components/layout/notifications-panel.tsx",
    from: `  const unreadWash = journey ? "bg-brand-500/[0.04]" : "bg-gold-500/[0.04]";
`,
    to: `  const unreadWash = journey ? "bg-brand-500/[0.04]" : "bg-gold-500/[0.04]";
  // ⭐ R5-I (the visual pass's round 5, 2026-10-09; DESIGN_AUTHORITY §B2a) — the betting pair is not the bell's. In the
  // journey the count badge is the brand pip the Arifa row already counts the same unread in (\`unread-row.tsx\`,
  // \`CountBadge tone="brand"\`), and "Clear all" answers a hover in the danger ink every destructive control wears (a
  // comment's Delete, the menu's Sign out) — both were the NO side's rose. The classic bell keeps its rose badge and hover
  // until the owner rules (frozen chrome): the change for it is these two values with the prop dropped.
  const countTone = journey ? "brand" : "rose";
  const clearAllHover = journey ? "hover:text-danger-fg" : "hover:text-no-300";
` },
  { file: "src/components/layout/notifications-panel.tsx",
    from: `          className="notif-badge-pulse"
          tone="rose"`,
    to: `          className="notif-badge-pulse"
          tone={countTone}` },
  { file: "src/components/layout/notifications-panel.tsx",
    from: '                      className="h-7 px-1.5 rounded-md font-mono text-micro font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors whitespace-nowrap"',
    to: '                      className={`h-7 px-1.5 rounded-md font-mono text-micro font-bold uppercase tracking-[0.10em] text-text-subtle ${clearAllHover} hover:bg-bg-overlay transition-colors whitespace-nowrap`}' },
  // ── /updown/history: a net in the player's own rounds reads as every other net (performance, the P&L strip) ─────────
  { file: "src/app/updown/history/page.tsx",
    from: `              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums"
                   style={{ color: net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>`,
    to: `              {/* ⭐ A NET READS AS EVERY NET ON THE PLATFORM (R5-I, 2026-10-09): money earned is gilt, a loss the betting rose
                  (Ali's LOSS ruling: "a lost bet is betting semantics"), zero the text's ink — /positions/performance's and the
                  P&L strip's own rule (R5-C). A positive net was the YES side's green here: an Up & Down round's return is not
                  the Up side (§B2a), and the same money read gold on one page and green on the next. */}
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums"
                   style={{ color: net > 0 ? "var(--gilt)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>` },
  { file: "src/app/updown/history/page.tsx",
    from: '                           style={{ color: g.anyOpen ? "var(--text-subtle)" : net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>',
    to: '                           style={{ color: g.anyOpen ? "var(--text-subtle)" : net > 0 ? "var(--gilt)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>' },
  // ── /wallet's history row: the Receipts row's one neutral plate and neutral amount (decided 2026-10-07) ───────────────
  { file: "src/app/wallet/wallet-client.tsx",
    from: `  // A pending DEBIT keeps its rose plate: a withdrawal on hold has already left Available.
  const arrowBg =
    settledCredit ? "bg-yes-500/10 text-yes-300"
    : isCredit || movedNothing ? "bg-bg-overlay text-text-subtle"
    : "bg-no-500/10 text-no-300";`,
    to: `  // ⭐ THE RECEIPTS ROW'S PLATE, AND ITS AMOUNT INK (R5-I, the visual pass's round 5, 2026-10-09). \`receipt-list-row.tsx\`
  // decided this row on 2026-10-07 — "NO BETTING INK AND NO GOLD. Deposit and withdrawal share ONE neutral brand plate;
  // the glyph gives the direction (§B2a)" — and named this one "the drift, not a second design". Money that moved (a
  // settled credit, or a debit, which has left Available even while it is held) takes that brand plate; money that has
  // not landed, or moved nothing, keeps the muted one. Direction is the arrow's, and the "+" the amount's.
  const arrowBg =
    settledCredit || !(isCredit || movedNothing) ? "bg-brand-500/10 text-brand-300"
    : "bg-bg-overlay text-text-subtle";` },
  { file: "src/app/wallet/wallet-client.tsx",
    from: '          <p className={`font-mono text-[14px] font-bold tabular-nums ${settledCredit ? "text-yes-300" : movedNothing ? "text-text-muted" : "text-text"}`}>',
    to: '          <p className={`font-mono text-[14px] font-bold tabular-nums ${movedNothing ? "text-text-muted" : "text-text"}`}>' },
  { file: "src/app/wallet/wallet-client.tsx",
    from: "bg-bg-overlay font-mono text-[11.5px] font-semibold text-text-muted hover:text-text hover:border-no-700 transition-colors\"",
    to: "bg-bg-overlay font-mono text-[11.5px] font-semibold text-text-muted hover:text-text hover:border-border-strong transition-colors\"" },
  { file: "src/app/wallet/wallet-client.tsx",
    from: `                  /* ⚠️ LITERAL, not \`h-8\` — the spacing scale is overridden
                     (tailwind.config.ts:200-215) so \`h-8\` is 48px, 8px above the
                     40px chip language every other rail speaks. */`,
    to: `                  /* ⚠️ LITERAL, not \`h-8\` — the spacing scale is overridden
                     (tailwind.config.ts:200-215) so \`h-8\` is 48px, 8px above the
                     40px chip language every other rail speaks.
                     The hover edge is the "Set personal limits" row's above (\`--border-strong\`): a door to a protective
                     tool, never the NO side's rose (§B2a; R5-I, 2026-10-09). */` },
  // ── the leaderboard: a player's rate of return is a statistic, in the text's own ink ────────────────────────────────
  { file: "src/components/layout/page-ribbon.tsx",
    from: `export type RibbonStat = {
  label: string;
  sw?: string;
  value: string;
  accent?: "yes" | "no" | "default";
};`,
    to: `/* ⛔ NO ACCENT AT ALL (R5-I, the visual pass's round 5, 2026-10-09). Its last option was the betting pair: the best rate
   of return in the YES side's green (DESIGN_AUTHORITY §B2a — a rate is not a side), and the ribbon's every other figure
   is the text's ink. A rank, a count, a rate: one ink. */
export type RibbonStat = {
  label: string;
  sw?: string;
  value: string;
};` },
  { file: "src/components/layout/page-ribbon.tsx",
    from: `            className={cn(
              "font-mono text-body-lg font-bold tabular-nums whitespace-nowrap leading-none",
              s.accent === "yes" && "text-yes-300",
              s.accent === "no" && "text-no-300",
              (!s.accent || s.accent === "default") && "text-text",
            )}`,
    to: `            className="font-mono text-body-lg font-bold tabular-nums whitespace-nowrap leading-none text-text"` },
  { file: "src/app/leaderboard/page.tsx",
    from: '          { label: t.leaderboard.bestRoi, value: `${rows[0]?.roi.toFixed(1) ?? "0"}%`, accent: "yes" },',
    to: '          { label: t.leaderboard.bestRoi, value: `${rows[0]?.roi.toFixed(1) ?? "0"}%` },' },
  { file: "src/app/leaderboard/page.tsx",
    from: `                <td
                  className={\`p-3 text-right font-mono tabular-nums font-bold \${
                    r.roi >= 0 ? "text-yes-300" : "text-no-300"
                  }\`}
                >`,
    to: `                {/* ⭐ A RATE OF RETURN IN THE TEXT'S INK, its sign its own (R5-I, 2026-10-09). It was the YES green from 0% up
                    and the NO rose below: §B2a keeps the pair for a stake's side, and a move of someone's money is read the
                    way a price move is — one neutral ink, the sign carried by the figure (§B2a's 2026-09-27 ruling). The
                    gold that "money earned" would ask for is the IDENTITY page's to refuse (Q5: \`test:gold-is-money\`
                    holds this page). The podium's rate below, the same. */}
                <td className="p-3 text-right font-mono tabular-nums font-bold text-text">` },
  { file: "src/app/leaderboard/page.tsx",
    from: '              <span className={`mt-0.5 font-mono text-[13px] font-bold tabular-nums ${r.roi >= 0 ? "text-yes-300" : "text-no-300"}`}>',
    to: '              <span className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-text">' },
  // ── the payout notice: its unavailable edge is the danger edge of the failure box above it ──────────────────────────
  { file: "src/components/wallet/payout-status-notice.tsx",
    from: '      className={unavailable ? "border-no-700/60" : undefined}',
    to: '      className={unavailable ? "border-danger-border" : undefined}' },
  { file: "src/components/wallet/payout-status-notice.tsx",
    from: "  // ⛔ Never put a `/NN` modifier back on `--warning-bg`: it is already",
    to: "  // ⭐ R5-I (2026-10-09): THAT EDGE MOVED, SO THIS ONE FOLLOWS IT. The failure boxes this notice sits under on both pages\n  // (wallet/deposit/page.tsx · wallet/withdraw/page.tsx) are `border-danger-border` now — the app-state family, never the\n  // NO side's rose (§B2a) — so the pin's own reason (one edge for two red alerts on one screen) asks for that edge here.\n  // ⛔ Never put a `/NN` modifier back on `--warning-bg`: it is already" },
  // ── the language-change loader: the brand family, the one non-money accent ──────────────────────────────────────────
  { file: "src/lib/i18n.tsx",
    from: `const GLYPHS = [
  { char: "Hi",  color: "oklch(78% 0.16 152)" },    // yes-green
  { char: "\\u8BED", color: "oklch(78% 0.16 22)" },  // no-red — 语
  { char: "Ha",  color: "oklch(78% 0.16 152)" },    // yes-green
  { char: "\\u597D", color: "oklch(78% 0.16 22)" },  // no-red — 好
  { char: "Sw",  color: "oklch(78% 0.16 152)" },    // yes-green
  { char: "En",  color: "oklch(78% 0.16 22)" },     // no-red
] as const;`,
    to: `/* ⭐ THE BRAND FAMILY, NOT THE BETTING PAIR (R5-I, the visual pass's round 5, 2026-10-09). The glyphs alternated the YES
   green and the NO rose — a decoration in the two sides' inks while a language changes (DESIGN_AUTHORITY §B2a); they
   alternate the brand family's two text steps now, the one non-money accent (R5-C), around the brand pulse at the centre. */
const GLYPHS = [
  { char: "Hi",  color: "var(--brand-300)" },
  { char: "\\u8BED", color: "var(--brand-200)" },  // 语
  { char: "Ha",  color: "var(--brand-300)" },
  { char: "\\u597D", color: "var(--brand-200)" },  // 好
  { char: "Sw",  color: "var(--brand-300)" },
  { char: "En",  color: "var(--brand-200)" },
] as const;` },
  // ── the stylesheet: the quick bet's placed pulse, and the journey balance's ±delta ─────────────────────────────────
  { file: "src/app/globals.css",
    from: `@keyframes ud-place-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--yes-500) 55%, transparent); }
  100% { box-shadow: 0 0 0 8px color-mix(in oklab, var(--yes-500) 0%, transparent); }
}`,
    to: `/* ⭐ The SUCCESS green (R5-I, 2026-10-09; §B2a): "your bet is placed" is an app state — the toast it replaces is
   \`success\` — and it pulsed the YES side's green on a Down bet too. The side tapped has its own flash (\`ud-side-flash\`). */
@keyframes ud-place-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--success-500) 55%, transparent); }
  100% { box-shadow: 0 0 0 8px color-mix(in oklab, var(--success-500) 0%, transparent); }
}` },
  { file: "src/app/globals.css",
    from: `.kp-jbal__delta[data-sign="up"] { color: var(--yes-300); }
.kp-jbal__delta[data-sign="down"] { color: var(--no-300); }`,
    to: `/* ⭐ ONE INK, THE SIGN ITS OWN (R5-I, 2026-10-09; DESIGN_AUTHORITY §B2a). A balance that moved is not a side: up was the YES
   green and down the NO rose, so a stake just placed read as a loss and a deposit as a winning side. The delta takes the
   text's ink, as a price move does (§B2a, 2026-09-27); its "+" or "−" says which way. (The classic capsule's own delta,
   \`.wbp-delta\` in wallet-balance-pill.tsx, is frozen chrome — owner item.) */
.kp-jbal__delta[data-sign] { color: var(--text); }` },
];
