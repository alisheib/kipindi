const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/components/markets/conviction-dial.tsx", [
  // ── the lock-mode label on the pill's line ──
  [`        <div className="mb-4">
          <p className="mb-2 text-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
            {t.common.yourPick}
          </p>`,
   `        <div className="mb-4">
          {/* ⭐ ON THE PILL'S LINE, NOT UNDER THE PILL (R4-I, 2026-10-09; edges E18, tile 042). The label stood centred at
              the top of the content while the Lock / Use-dial pill is pinned 16px under the panel's top edge at the right
              (\`absolute right-3 top-3\`, 44px tall): on a 294px panel at 1280 "TUMIA KIDHIBITI" covered "UAMUZI WAKO".
              The label now opens the pill's own 44px line — risen to the panel's 16px (\`-mt-1.5\` from the phone's 24px
              padding, \`lg:-mt-3\` from 32) and centred on it — at the left, where the pill never reaches: the widest pair,
              "UAMUZI WAKO" (81px) and "TUMIA KIDHIBITI" (162px), leaves 2.6px between them at 320 (\`test:visual-pass-r4i\`). */}
          <p className="-mt-1.5 mb-2 flex min-h-[44px] items-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle lg:-mt-3">
            {t.common.yourPick}
          </p>`],
  // ── the readout: both eyebrows on one line, the side word level with the stake box ──
  [`      <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 mt-5 items-center">
        <div className="min-w-0">
          <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">
            {effectiveSide === "NEUTRAL" ? t.common.noConviction : t.common.youArePicking}
          </p>
          <p
            className="font-display font-bold text-[15px] sm:text-[22px] leading-[1.05] break-words"
            style={{ color: sideText, letterSpacing: "-0.025em" }}
          >`,
   `      {/* ⭐ R4-I (2026-10-09; edges E53, tiles 067 071 075 104 108) · "YOU ARE / PICKING" BROKE IN TWO: the left column is
          what the 172px stake box leaves — 94px at 360, 104px at 1280 — and the eyebrow is 111px. The column now starts at
          the row's top (\`items-start\`), so its eyebrow stands on the stake label's line, one line (\`whitespace-nowrap\`),
          reaching into the right column's empty left half (its "Stake ⓘ" is right-aligned, ≥ 67px clear at 320); and the
          side word fills a 44px box under it, 8px down like the stake box under its label — so the word is centred on the
          box, where it was centred on the box, its label and its range line together. */}
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 mt-5 items-start">
        <div className="min-w-0">
          <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1.5 whitespace-nowrap">
            {effectiveSide === "NEUTRAL" ? t.common.noConviction : t.common.youArePicking}
          </p>
          <p
            className="flex min-h-[44px] items-center font-display font-bold text-[15px] sm:text-[22px] leading-[1.05] break-words"
            style={{ color: sideText, letterSpacing: "-0.025em" }}
          >`],
  // ── the multiplier label on its box's centre ──
  [`      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-center">
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">
          <InfoHint panelId={hintId("mult")}`,
   `      {/* R4-I (2026-10-09; edges E53, tiles 067 071 075 100) · the label centred on its 44px box, not on the box AND the
          range line under it — it stood ~11px under the box's centre (067: label y369, box centre y358). */}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-start">
        <p className="flex min-h-[44px] items-center font-mono text-micro uppercase eyebrow text-text-subtle">
          <InfoHint panelId={hintId("mult")}`],
  // ── the estimate in the money face ──
  [`                <p className="text-[18px] font-bold tabular-nums text-text leading-none">
                  TZS {formatNumber(estimate)}
                </p>
                <p className="mt-1 text-body-sm leading-relaxed text-text-subtle">
                  {t.dialog.estimateDisclaimer}
                </p>`,
   `                {/* R4-I · an amount (\`.amount\`: mono, tabular, never split), as the stake box beside it is (tiles 067 071 075). */}
                <p className="amount text-[18px] font-bold tabular-nums text-text leading-none">
                  TZS {formatNumber(estimate)}
                </p>
                <p className="mt-1 text-body-sm leading-relaxed text-text-subtle">
                  {keepText(t.dialog.estimateDisclaimer)}
                </p>`],
  // ── the caption over the place button ──
  [`      <div className="mt-4 flex items-center gap-3">
        <p className="flex-1 min-w-0 text-body-sm text-text-subtle leading-snug">`,
   `      {/* ⭐ THE CAPTION TAKES A LINE OF ITS OWN WHEN IT CANNOT HAVE 12REM BESIDE THE BUTTON (R4-I, 2026-10-09; edges E18,
          tiles 034 038 042 067 071 075). It shared the row with the place button and got what the button left — 41–99px —
          so "Mgao wa bwawa. Thibitisha kwenye popup." stood one word a line (six lines at sw 360; zh split 赔付 and 弹窗).
          It now asks for 12rem (192px) or a line of its own (\`flex-wrap\`, \`flex-[1_1_12rem]\`); the button keeps its compact
          size and its place at the right (\`ml-auto\`). On every phone and at 1280 the panel is too narrow for both, so the
          caption reads on one or two whole lines above the button. */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-[1_1_12rem] text-body-sm text-text-subtle leading-snug">`],
  [`          className={\`\${closedNow ? "btn btn-ghost btn-md" : (effectiveSide === "NEUTRAL" ? "btn btn-ghost btn-md" : effectiveSide === "YES" ? "btn btn-yes btn-md" : "btn btn-no btn-md")} whitespace-normal\`}`,
   `          className={\`\${closedNow ? "btn btn-ghost btn-md" : (effectiveSide === "NEUTRAL" ? "btn btn-ghost btn-md" : effectiveSide === "YES" ? "btn btn-yes btn-md" : "btn btn-no btn-md")} ml-auto whitespace-normal\`}`],
]);
