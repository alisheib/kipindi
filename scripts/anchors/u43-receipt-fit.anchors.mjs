/** Physical receipt-fit mutations consumed by the red runner. */
export const MUTATIONS = [
  { name: "receipt opts out of compact layout", file: "src/components/updown/updown-bet-receipt-modal.tsx", from: "      compactOnPhone", to: "" },
  { name: "projection qualifier disappears", file: "src/components/updown/updown-bet-receipt-modal.tsx", from: "footnote={projected != null ? t.market.udEstimateNote : undefined}", to: "footnote={undefined}" },
  { name: "second action disappears", file: "src/components/updown/updown-bet-receipt-modal.tsx", from: "secondaryLabel={onWatchRound ? t.market.udRcWatchRound : undefined}", to: "secondaryLabel={undefined}" },
  { name: "base phone padding regains height", file: "src/app/globals.css", from: ".orm-phone-compact { padding: var(--sp-4); }", to: ".orm-phone-compact { padding: var(--sp-6); }" },
  { name: "detail row hidden to gain room", file: "src/app/globals.css", from: ".orm-phone-compact .orm-detail { padding: var(--sp-1) var(--sp-3); }", to: ".orm-phone-compact .orm-detail { display: none; }" },
  { name: "short phone rule no longer applies", file: "src/app/globals.css", from: "@media (max-width: 639px) and (max-height: 679px)", to: "@media (max-width: 639px) and (max-height: 639px)" },
  { name: "short phone vertical padding returns", file: "src/app/globals.css", from: ".orm-phone-compact { padding-block: var(--sp-2); }", to: ".orm-phone-compact { padding-block: var(--sp-4); }" },
  { name: "short phone row padding returns", file: "src/app/globals.css", from: ".orm-phone-compact .orm-detail { padding-block: 2px; }", to: ".orm-phone-compact .orm-detail { padding-block: var(--sp-1); }" },
  { name: "short phone action gap returns", file: "src/app/globals.css", from: ".orm-phone-compact .orm-actions { margin-top: var(--sp-2); gap: var(--sp-1); }", to: ".orm-phone-compact .orm-actions { margin-top: var(--sp-3); gap: var(--sp-2); }" },
  { name: "projection qualifier gap returns", file: "src/app/globals.css", from: ".orm-phone-compact .orm-actions + p { margin-top: var(--sp-1); }", to: ".orm-phone-compact .orm-actions + p { margin-top: var(--sp-3); }" },
];
