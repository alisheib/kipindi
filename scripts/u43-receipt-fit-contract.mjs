/** U43 receipt: all facts and both actions fit a short phone without shrinking taps. */
export function receiptFitIssues(receipt, modal, css) {
  const issues = [];
  const need = (ok, label) => { if (!ok) issues.push(label); };
  need(receipt.includes('compactOnPhone')
    && receipt.includes('details={details}')
    && receipt.includes('footnote={projected != null ? t.market.udEstimateNote : undefined}')
    && receipt.includes('primaryLabel={t.market.udRcKeepPlaying}')
    && receipt.includes('secondaryLabel={onWatchRound ? t.market.udRcWatchRound : undefined}'),
    "placed-bet receipt keeps every disclosure and both follow-up actions");
  need(modal.includes('compactOnPhone?: boolean;')
    && modal.includes('compactOnPhone = false')
    && modal.includes('compactOnPhone ? " orm-phone-compact" : ""')
    && modal.includes('className="orm-details mt-4 grid grid-cols-1 gap-2 text-left"')
    && modal.includes('className="orm-detail rounded-md')
    && modal.includes('className="orm-actions mt-5 flex flex-col gap-2"')
    && modal.includes('className={`btn ${effectiveBtn} btn-lg w-full`}')
    && modal.includes('className="btn btn-ghost btn-md w-full"'),
    "shared modal opts this receipt into a compact phone rhythm without shrinking buttons");
  // 2026-10-21 · u43-hc · the block now opens on its `density: general` reason (test:density-contract §2: a phone-only
  // rule says why it is not card spacing, as the first node of its block), so the base padding is the first RULE after
  // that one comment. Same rule, same block; the reason is required too.
  need(/@media \(max-width: 639px\) \{\s*\/\* density: general — [^*]*\*\/\s*\.orm-phone-compact \{ padding: var\(--sp-4\); \}/.test(css)
    && css.includes('.orm-phone-compact .orm-crest { width: var(--sp-12); height: var(--sp-12); }')
    && css.includes('.orm-phone-compact .orm-eyebrow { margin-top: var(--sp-2); }')
    && css.includes('.orm-phone-compact .orm-details { margin-top: var(--sp-2); gap: var(--sp-1); }')
    && css.includes('.orm-phone-compact .orm-detail { padding: var(--sp-1) var(--sp-3); }')
    && css.includes('.orm-phone-compact .orm-actions { margin-top: var(--sp-3); }')
    && !css.includes('.orm-phone-compact .orm-detail { display: none; }'),
    "phone density reduces only whitespace, preserving every detail row");
  const shortPhoneCss = css.match(/@media \(max-width: 639px\) and \(max-height: 679px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  need(shortPhoneCss.includes('.orm-phone-compact { padding-block: var(--sp-2); }')
    && shortPhoneCss.includes('.orm-phone-compact .orm-crest { width: var(--sp-10); height: var(--sp-10); }')
    && shortPhoneCss.includes('.orm-phone-compact .orm-eyebrow { margin-top: var(--sp-1); }')
    && shortPhoneCss.includes('.orm-phone-compact .orm-details { margin-top: var(--sp-1); gap: 2px; }')
    && shortPhoneCss.includes('.orm-phone-compact .orm-detail { padding-block: 2px; }')
    && shortPhoneCss.includes('.orm-phone-compact .orm-actions { margin-top: var(--sp-2); gap: var(--sp-1); }')
    && shortPhoneCss.includes('.orm-phone-compact .orm-actions + p { margin-top: var(--sp-1); }')
    && !/display\s*:\s*none|font-size\s*:|min-height\s*:/.test(shortPhoneCss),
    "short phone receipt compresses vertical whitespace and shows its qualifier with full-size text and actions");
  return issues;
}
