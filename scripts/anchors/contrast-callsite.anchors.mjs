/**
 * RED anchors for `npm run red:contrast-callsite` — the control for `test:contrast` §P-u2
 * (PV-10, 2026-09-03).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE, for the same reason every `*.anchors.mjs` beside it exists:
 * `red-anchors.test.mts` audits every declared anchor without running the harness that injects
 * it, and a harness that hides its anchors from that fleet auditor is one whose anchors rot in
 * silence.
 *
 * Every fixed PV-10 site, so a regression on ANY of the nine call sites is provable — not just
 * the one this file happens to pick. Values are exactly what shipped before the fix (the `git
 * diff` this commit reverts, one span at a time).
 */

export const MUTATIONS = [
  // ⚠️ RE-AIMED 2026-10-19 (MOBILE-VISUAL U43), as the Up & Down pair below was on 2026-10-14: Ali's ruling took the
  // "@ n%" suffix off every market-card choice, so its anchor was gone. The call site is not — the YES button is still a
  // solid `btn-yes` money button whose label §P-u2 reads — so the fade is planted on the side's WORD, its one label now.
  {
    name: "market-card.tsx — a faded opacity-85 YES label inside the YES button (where the @pct% suffix stood)",
    file: "src/components/markets/market-card.tsx",
    // One line on purpose: this harness matches with a plain `includes` on the file as checked out (CRLF on Windows), so a
    // two-line anchor could never resolve here. The twelve-space indent makes it the button's own line (exactly once).
    from: `            {sideWord(t, "YES", productLine)}`,
    to: `            <span className="opacity-85">{sideWord(t, "YES", productLine)}</span>`,
  },
  {
    name: "side-picker.tsx — restore the YES @pct% suffix's opacity-85",
    file: "src/components/markets/side-picker.tsx",
    from: `<span className="font-mono text-[12.5px]">@ {yesPct}%</span>`,
    to: `<span className="font-mono text-[12.5px] opacity-85">@ {yesPct}%</span>`,
  },
  // U43 B1 gives signed-out and quick-bet cards one shared UpDownSidePair. Plant
  // the fade on that pair's visible word; the guard reads its solid button.
  {
    name: "updown-stake-controls.tsx — a faded side word inside the shared Up/Down pair",
    file: "src/components/updown/updown-stake-controls.tsx",
    from: `          {sideWord(t, side, "UPDOWN")}`,
    to: `          <span className="opacity-85">{sideWord(t, side, "UPDOWN")}</span>`,
  },
  {
    name: "conviction-dial.tsx — restore the commit button's stake opacity-90 (the site §P-u2 itself found)",
    file: "src/components/markets/conviction-dial.tsx",
    from: `<span className="font-mono">TZS {formatNumber(stake)}</span>`,
    to: `<span className="font-mono opacity-90">TZS {formatNumber(stake)}</span>`,
  },
];
