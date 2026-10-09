const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/components/markets/bet-confirm-modal.tsx", [
  [`import { formatTzs, formatNumber } from "@/lib/utils";`,
   `import { formatTzs, formatNumber } from "@/lib/utils";
import { keepText } from "@/components/ui/keep-run";`],
  [`  const exitLabel = t.dialog.freeExitLabel.replace(/\\{mins\\}/g, String(graceMins));`,
   `  const exitLabel = t.dialog.freeExitLabel.replace(/\\{mins\\}/g, String(graceMins));
  // R4-I · the free window's number keeps the words either side of it ("Sell within 5 / minutes" split it at en 360,
  // tile 068; Swahili writes the unit first, "dakika 5").
  const exitMinsRun = new RegExp(\`\\\\S+\\\\s+\${graceMins}\\\\s+\\\\S+\`).exec(freeExitBody)?.[0];`],
  [`      closeOnScrim={!pending}
      showClose={false}
      initialFocus={confirmRef}
      safeFocus={cancelRef}
      panelClassName="overflow-hidden !p-0"
    >`,
   `      closeOnScrim={!pending}
      showClose={false}
      initialFocus={confirmRef}
      safeFocus={cancelRef}
      /* ⭐ THE DIALOG FITS THE SCREEN, AND ITS ANSWERS ARE ALWAYS ON IT (R4-I, 2026-10-09; edges E18, tiles 035 039 043
         068 072 076 101 105 109). The panel grew with its disclosures — about 950px on a 360×780 phone, 825px of a 900px
         screen at 1280 — so Ghairi, the footnote and the panel's own bottom edge sat under the fold, and a phone player had
         to scroll the page behind the scrim to find the way out. The panel is now at most the screen less Modal's 16px
         margins (\`100dvh − 32px\`), a column of two parts: the disclosures scroll inside it, and the quote clock, the two
         buttons and the footnote stand under them, always in view. Nothing is hidden or shortened; a dialog that fits
         draws as before but for the hairline over its footer. */
      panelClassName="overflow-hidden !p-0 flex flex-col max-h-[calc(100dvh-32px)]"
    >`],
  [`      <div className="p-5 lg:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
        <div className="flex items-start justify-between gap-3 mb-4">`,
   `      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-4 lg:px-6 lg:pt-6" data-testid="bet-confirm-body">
        <div className="flex items-start justify-between gap-3 mb-4">`],
  [`              <p className="mt-1 font-display text-[15px] font-semibold text-text leading-snug">
                {marketTitle}
              </p>`,
   `              <p className="mt-1 font-display text-[15px] font-semibold text-text leading-snug">
                {/* R4-I · never one word alone on its last line ("2026-27" stood alone at 1280, tile 076). */}
                {keepText(marketTitle)}
              </p>`],
  [`          <button
            type="button"
            onClick={onCancel}
            aria-label={t.common.cancel}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >`,
   `          {/* ⭐ ON THE TITLE'S CAPITALS (R4-I, 2026-10-09; edges E54, tiles 068 072 076 101 109): the 48px box sat on the
              row's top, so the ✕ centred 24px down while the title's first line — under the 14px eyebrow line and 4px —
              centres its capitals 18 + 0.6625 × 15 = 27.9px down (Sora: caps 0.2975–1.0275em in a 1.375 line). Measured on
              068: ✕ ink y64–73, the title's first line y66–78 — 3.5px above. \`mt-1\` lowers it 4px: 28 against 27.9. */}
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.common.cancel}
            className="mt-1 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >`],
  [`            <p className="text-[18px] font-bold tabular-nums text-text leading-none">
              TZS {formatNumber(Math.round(stake * (1 + (rates?.estimatedWinningsRate ?? 0))))}
            </p>
            <p className="mt-1.5 text-body-sm leading-relaxed text-text-muted">
              {t.dialog.estimateDisclaimer}
            </p>`,
   `            {/* R4-I · a money figure is an amount (\`.amount\`: mono, tabular, never split) — the stake above it is mono,
                and this one was set in the sentence face (tiles 068 072 076). */}
            <p className="amount text-[18px] font-bold tabular-nums text-text leading-none">
              TZS {formatNumber(Math.round(stake * (1 + (rates?.estimatedWinningsRate ?? 0))))}
            </p>
            <p className="mt-1.5 text-body-sm leading-relaxed text-text-muted">
              {keepText(t.dialog.estimateDisclaimer)}
            </p>`],
  [`            <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
              {t.dialog.payoutCalcBody}
            </p>`,
   `            <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
              {keepText(t.dialog.payoutCalcBody)}
            </p>`],
  [`            {hasExitRunway ? freeExitBody : t.dialog.noExitWindowBody}`,
   `            {hasExitRunway ? keepText(freeExitBody, exitMinsRun ? [exitMinsRun] : []) : keepText(t.dialog.noExitWindowBody)}`],
  [`        {lean !== "fair" && !isOneSided && <HouseLeanWarning level={lean} />}

        {/* Quote-hold caption */}
        <div className="mt-4 flex items-center gap-2 text-[12px] text-text-subtle">`,
   `        {lean !== "fair" && !isOneSided && <HouseLeanWarning level={lean} />}
      </div>

      {/* The footer — what the player answers with, always on the screen (see \`panelClassName\` above). */}
      <div className="shrink-0 border-t border-border px-5 pt-3 lg:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]" data-testid="bet-confirm-actions">
        {/* Quote-hold caption */}
        <div className="flex items-center gap-2 text-[12px] text-text-subtle">`],
  [`        <p className="mt-2.5 text-center text-body-sm text-text-subtle">
          {t.dialog.poolSharePayout}
        </p>`,
   `        <p className="mt-2.5 text-center text-body-sm text-text-subtle">
          {/* R4-I · "closes." stood alone on its last line at 1280 (tile 076). */}
          {keepText(t.dialog.poolSharePayout)}
        </p>`],
]);
edit("src/components/markets/house-lean-warning.tsx", [
  [`import { useT } from "@/lib/i18n";`, `import { useT } from "@/lib/i18n";
import { keepText } from "@/components/ui/keep-run";`],
  [`    <Callout tone="warning" className="mt-3" title={t.market.crowdedWarning}>
      <p className="mt-1 text-body-sm leading-snug text-text-muted">{t.market.thinUpsideNote}</p>
    </Callout>`,
   `    /* R4-I (2026-10-09, tiles 035 039 068 072 076) · neither line ends on one word ("mdogo.", "small.") and no line opens
       on the title's dash (\`keepText\`); the words are unchanged. */
    <Callout tone="warning" className="mt-3" title={keepText(t.market.crowdedWarning)}>
      <p className="mt-1 text-body-sm leading-snug text-text-muted">{keepText(t.market.thinUpsideNote)}</p>
    </Callout>`],
]);
