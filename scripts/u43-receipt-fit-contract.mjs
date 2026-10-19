/** U43 receipt: all facts and both actions fit a short phone without shrinking taps. */
export function receiptFitIssues(receipt, modal, css) {
  const issues = [];
  const need = (ok, label) => { if (!ok) issues.push(label); };
  need(receipt.includes('compactOnPhone')
    && receipt.includes('details={details}')
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
  need(/@media \(max-width: 639px\) \{\s*\.orm-phone-compact \{ padding: var\(--sp-4\); \}/.test(css)
    && css.includes('.orm-phone-compact .orm-crest { width: var(--sp-12); height: var(--sp-12); }')
    && css.includes('.orm-phone-compact .orm-eyebrow { margin-top: var(--sp-2); }')
    && css.includes('.orm-phone-compact .orm-details { margin-top: var(--sp-2); gap: var(--sp-1); }')
    && css.includes('.orm-phone-compact .orm-detail { padding: var(--sp-1) var(--sp-3); }')
    && css.includes('.orm-phone-compact .orm-actions { margin-top: var(--sp-3); }')
    && !css.includes('.orm-phone-compact .orm-detail { display: none; }'),
    "phone density reduces only whitespace, preserving every detail row");
  return issues;
}
