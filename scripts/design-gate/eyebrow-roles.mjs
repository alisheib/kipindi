/**
 * eyebrow-roles.mjs — THE READ, and it is the whole of `qa:dg-eyebrow --tracking`.
 * DESIGN-GATE-2026-08-28, step 2 (DG-A-11 / DG-P-06).
 *
 * `DESIGN_AUTHORITY` §T3 rules ONE role — the SECTION EYEBROW, "the label over a block" — at
 * 0.14em, and leaves the others alone. ⛔ Nothing a regex can see separates them: a <span>
 * inside a <button> is a control label whatever it looks like, and a bare <div> can be a
 * caption. So every one of the 586 uppercase-and-tracked sites in `src/` was READ, in three
 * passes — classify, then a reader briefed to REFUTE it, then a third pass over every
 * CONTROL_LABEL once the enclosure test had to be sharpened (below). **23 calls were overturned
 * on the second pass and 12 more on the third.**
 *
 * ⭐ THE ENCLOSURE TEST, SHARPENED — the reason the third pass existed.
 * §T3's shorthand is "a <span> inside a <button> is a control label". Read as *any interactive
 * ancestor wins*, that COLLAPSES on this tree: `markets/market-card.tsx:493` wraps an entire
 * market card in a <Link> and the card's own <h3> question sits inside it; `position-card.tsx`
 * and `home/trust-band.tsx` do the same. Under the blunt reading a card's HEADING is a control
 * label. So:
 *   · CONTROL            — the control's accessible name IS this string: a button, tab, filter
 *                          or sort chip, menu item, or a link whose visible text is its whole
 *                          label. One target, one name; a glyph beside the word is still one
 *                          name. → it keeps its own tracking.
 *   · NAVIGATION WRAPPER — a whole card, row or tile made clickable: a surface with contents,
 *                          holding a heading, several fields, or its own aria-label. → the
 *                          captions inside it KEEP THEIR OWN ROLES.
 *
 * ⛔ AND THE CENSUS'S OWN FIRST COUNT WAS WRONG, WHICH IS THIS PROGRAMME'S SIGNATURE FAILURE.
 * The first scan matched the word "uppercase" inside JSDoc and JSX comments and reported 19
 * sites that render nothing. Comments are stripped — line-preservingly — before anything here
 * is believed.
 *
 * 📐 WHAT THE READ FOUND, against §T3's table, which was written from a narrower scan.
 * ⚠️ THE POPULATION IS NOW 556, NOT 586 — DG-A-14 lifted 30 sentences out of the sub-micro
 * tier entirely, so they stopped being uppercase and left it. Right column is the read as it
 * stood; left is HEAD:
 *                     HEAD   the read
 *   section eyebrow    319       308     (+9 labels freed by a split, +2 adjudicated)
 *   control label      102       102
 *   status chip         58        57
 *   other               61        55
 *   prose                0        48     ✅ CLOSED — 39 fixed, 9 adjudicated as real labels
 *   celebration         11        11
 *   type to confirm      5         5
 * ⚠️ §T3's table named FOUR roles and got two of its three small counts wrong. TYPE_TO_CONFIRM
 * is 5, not 3 — `resolver/[id]/resolution-ceremony.tsx` holds two more, the SEAL fields on the
 * settlement ceremony, which the table filed under mark/celebration because they sit at 0.3em:
 * it grouped by VALUE where it claims to group by ROLE. CELEBRATION is 11, not 5, once the
 * OG-image routes and `lib/server/email.ts` are counted — both render the product's face and
 * neither is a page, so a scan of pages could not see them. And two families the table never
 * named at all: a non-interactive STATUS CHIP is not the label over a block, and neither is a
 * DATA VALUE, an in-flight readout ("Recording…") or a count annotation.
 * §T3 is corrected from this file, not the other way round.
 *
 * ✅ `PROSE` WAS A WORK ORDER, NOT A CATEGORY, AND IT IS DISCHARGED (DG-A-14, 2026-08-30).
 * 48 sites were sentences, or a label with a hint welded on, wearing an eyebrow's clothes below
 * the 12.5px reading floor §T4 sets. **27 had the dressing dropped onto `text-body-sm`; 9 were
 * SPLIT** — the label keeps the eyebrow recipe and takes `.eyebrow`, the hint moves to its own
 * legible line; **3 more were lifted after a third reader overturned the fixer's refusal**; and
 * **9 were adjudicated as genuine labels and reclassified**, which is the honest half of the
 * number: those nine left `type-scale` §3 WITHOUT a glyph moving, and it is written down here
 * rather than folded into the total.
 * ⛔ The refusals were checked BECAUSE accepting one deletes a site from a ratchet for free.
 * A third reader, briefed that upholding is the costly answer, upheld 8, overturned 3 and
 * called 1 a different defect — e.g. "All figures final" is not a noun phrase but a verbless
 * clause, and TWO of the three locales write the copula out (sw "Takwimu zote **ni** za
 * mwisho"), so §A5's longest population reads a five-word sentence in 10px caps.
 *
 * ⛔ WHY THE KEY IS A SIGNATURE AND NOT `path:line`. A line number is correct for exactly one
 * commit — the next edit ANYWHERE above a declared site shifts it, and the whole read then
 * reports itself stale. A signature drifts only when somebody edits THAT element, which is
 * exactly when a re-read is warranted. The count is part of the declaration because several
 * files render the same recipe twice; a duplicate appearing or vanishing is itself a change.
 */

/** ⭐ The section eyebrows need no list: they CARRY `.eyebrow`, whose one definition site is
 *  `globals.css`. 312 of them do. */

/** ⚠️ …and 7 cannot, because their tracking is written INLINE and an inline declaration
 *  beats every selector — a class would be inert there, which is the §B8 defect, not a
 *  tidy-up. Their value is written in place and asserted to read 0.14em. */
export const INLINE_EYEBROWS = new Map([
  ["components/admin/admin-shell.tsx :: <span className=\"font-mono uppercase text-text-tertiary truncate\" style={{ fontSize: 9.5, letterSpacing: \"0.14em\", lineHeight: 1.3 }}>{label}</span> ↵ <div className=\"fon", 1],
  ["components/admin/admin-shell.tsx :: className=\"font-mono uppercase text-text-tertiary truncate\" ↵ title={typeof label === \"string\" ? label : undefined}", 1],
  ["components/brand.tsx :: textTransform: \"uppercase\", ↵ }}", 1],
  ["components/charts/probability-chart.tsx :: <span style={{ fontFamily: \"var(--font-mono)\", fontSize: 10, letterSpacing: \"0.14em\", textTransform: \"uppercase\", color: \"var(--text-subtle)\" }}>{t.market.probOverTime}</", 1],
  ["lib/server/email.ts :: <p style=\"margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:${TEXT_MUTED};line-height:1.55\"><span style=\"font-family:'JetBrains Mono','C", 1],
  ["lib/server/email.ts :: let html = `<p style=\"margin:0 0 6px;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;co", 1],
  ["lib/server/email.ts :: return `<tr><td class=\"sp-row-label\" style=\"padding:11px 0;border-bottom:1px solid ${BRAND_BORDER};font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;tex", 1],
]);

/** Everything else, with the role it plays. ⛔ A site in NEITHER list is a site nobody has
 *  read: the tool refuses it rather than guessing. */
export const NOT_EYEBROW = new Map([
  ["app/admin/ai-polls/[id]/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle\">{poll.category}</span> ↵ <span className=\"font-mono text-[10.5px] tabular-nums text-te", "OTHER"],
  ["app/admin/ai-polls/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle\">{poll.category}</span> ↵ <span className=\"font-mono text-[10.5px] tabular-nums text-te", "OTHER"],
  ["app/admin/ai-polls/page.tsx :: <td className=\"p-3 font-mono uppercase tracking-[0.12em] text-micro\">{p.category || \"\\u2014\"}</td> ↵ <td className=\"p-3 text-text max-w-[360px]\">", "OTHER"],
  // ⛔ DELETED 2026-08-30 (DG-A-06): `CardSortControl`'s hand-rolled chip. It was hoisted out
  // of BOTH pages into `components/admin/card-sort-control.tsx` and converted to `FilterPill`,
  // which is neither uppercase nor tracked — so it leaves this population entirely rather than
  // moving within it. ⭐ This gate is what told me: it exits 4 the moment a declaration matches
  // nothing, so a deleted element cannot leave a stale read behind.
  // ⚠ LINE COMMENTS, NOT A BLOCK, AND THAT IS NOT A STYLE CHOICE. This file's DATA contains a
  // `//` inside a string literal (the `control-locked.tsx` entry), and `test:decomment` §5
  // measures how much a naive line-comments-first stripper would lose here. Writing these three
  // notes as `/* */` took that loss from 5,803 characters to 43,604 and moved the gate's
  // worst-case file into a subdirectory its own control excludes — red, correctly.
  ["app/admin/ai-polls/poll-actions.tsx :: className={`inline-flex min-h-[var(--tap-min)] items-center justify-center px-3 py-1.5 rounded-pill text-label font-mono uppercase tracking-[0.1em] border transition-colo", "CONTROL_LABEL"],
  ["app/admin/ai-usage/page.tsx :: action={<span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\">${cyc.config.sizeUsd.toLocaleString()} per cycle · rates {cyc.priceRev}</spa", "OTHER"],
  ["app/admin/ai-usage/page.tsx :: action={<span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\">Anthropic Cost API · USD</span>} ↵ >", "OTHER"],
  ["app/admin/approvals/page.tsx :: action={<a href=\"/admin/aml\" className=\"font-mono text-micro tracking-[0.10em] uppercase text-royal-300\">go to AML →</a>} ↵ >", "CONTROL_LABEL"],
  ["app/admin/approvals/page.tsx :: className=\"font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border\" ↵ style={{ borderColor: \"var(--aqua-400)\", back", "STATUS_CHIP"],
  ["app/admin/audit/page.tsx :: <span className=\"ml-auto font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ {allFiltered.length.toLocaleString()} entries", "OTHER"],
  ["app/admin/bonuses/bonus-admin-client.tsx :: className=\"shrink-0 inline-flex h-[40px] items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 font-mono text-caption font-bold uppercase tracking-[0.0", "CONTROL_LABEL"],
  ["app/admin/candidates/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle\">{CATEGORY_LABEL[c.category] ?? c.category}</span> ↵ <span className=\"font-mono text-[1", "OTHER"],
  ["app/admin/candidates/page.tsx :: <td className=\"p-3 font-mono uppercase tracking-[0.12em] text-micro\">{CATEGORY_LABEL[c.category] ?? c.category}</td> ↵ <td className=\"p-3 text-text max-w-[420px] truncate", "OTHER"],
  // ⛔ DELETED 2026-08-30 (DG-A-06) — the byte-identical twin of the ai-polls entry above.
  ["app/admin/compliance/page.tsx :: <p className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\"> ↵ {continued} continued · {tookBreak} break · {sxd} self-excluded{\" \"}", "OTHER"],
  ["app/admin/compliance/page.tsx :: <p className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\"> ↵ HMAC-SHA256 · last verify {formatClock(new Date().toISOString())}", "OTHER"],
  ["app/admin/compliance/page.tsx :: <span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\">LCCP §3.4.1</span> ↵ </div>", "OTHER"],
  ["app/admin/compliance/page.tsx :: <td className=\"py-2 pr-3\"><span className=\"font-mono text-micro tracking-wider uppercase\">{a.action.replace(\"integrity.alert.\", \"\")}</span></td> ↵ <td className=\"py-2 pl-", "STATUS_CHIP"],
  ["app/admin/compliance/page.tsx :: className=\"font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-brand-500 bg-brand-500/10 text-brand-300 ", "CONTROL_LABEL"],
  ["app/admin/compliance/page.tsx :: className=\"font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-royal-300\" ↵ >", "CONTROL_LABEL"],
  ["app/admin/config/page.tsx :: <span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\"> ↵ {overrides.length} active", "OTHER"],
  ["app/admin/config/page.tsx :: action={<span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\">{recent.length} entries</span>} ↵ padding=\"p-0\"", "OTHER"],
  ["app/admin/finance/page.tsx :: <span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\"> ↵ loser-share {pollFees.byModel[\"loser-share\"].count} · {formatTzsCompact(pollFees.", "OTHER"],
  ["app/admin/finance/page.tsx :: <span className={[\"font-mono text-micro tracking-[0.10em] uppercase\", tb.ok ? \"text-success\" : \"text-danger-fg\"].join(\" \")}> ↵ {tb.ok ? \"✓ reconciles\" : \"✗ drift detected", "STATUS_CHIP"],
  ["app/admin/finance/page.tsx :: className={`inline-block rounded px-1.5 py-0.5 font-mono text-micro uppercase tracking-[0.08em] ${ ↵ r.feeModel === \"loser-share\" ? \"bg-brand-500/15 text-brand-300\" : \"bg", "STATUS_CHIP"],
  ["app/admin/kyc/[id]/kyc-decision-rail.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.16em] text-text-muted\">Recording decision…</span> ↵ </div>", "OTHER"],
  ["app/admin/kyc/[id]/kyc-decision-rail.tsx :: <span className=\"ml-auto font-mono text-micro uppercase tracking-[0.12em] text-text-subtle\"> ↵ {judg[c.key] === \"pending\" ? \"tap to verify\" : judg[c.key]}", "CONTROL_LABEL"],
  ["app/admin/kyc/[id]/kyc-doc-viewer.tsx :: <p className=\"font-mono text-caption uppercase tracking-[0.14em] text-text-muted\">Document failed to load</p> ↵ <p className=\"text-body-sm leading-snug text-text-subtle\">", "CELEBRATION"],
  ["app/admin/kyc/[id]/kyc-doc-viewer.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.14em]\">Not uploaded</span> ↵ </div>", "OTHER"],
  ["app/admin/kyc/[id]/kyc-doc-viewer.tsx :: className=\"inline-flex items-center gap-1.5 rounded-md border px-2.5 h-[40px] font-mono text-caption uppercase tracking-[0.08em] transition-colors\" ↵ style={on", "CONTROL_LABEL"],
  ["app/admin/kyc/[id]/kyc-doc-viewer.tsx :: className=\"rounded-md border px-2 h-[40px] font-mono text-caption uppercase tracking-[0.08em] transition-colors\" ↵ style={zoom === z ? { borderColor: \"var(--brand-500)\", ", "CONTROL_LABEL"],
  ["app/admin/kyc/[id]/page.tsx :: <Link href={\"/admin/approvals\" as Route} className=\"inline-flex items-center gap-1.5 h-[40px] px-3 rounded-md border border-border bg-bg-inset font-mono text-caption trac", "CONTROL_LABEL"],
  ["app/admin/kyc/[id]/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.12em] text-text-subtle\"> ↵ #{queuePos + 1} of {pending.length} · oldest {ageLabel(oldest)}", "OTHER"],
  ["app/admin/live/page.tsx :: <AdminCard title={`Live bet feed · last ${BET_FEED}`} sw=\"Madau ya moja kwa moja\" action={<a href=\"/admin/audit?category=BET\" className=\"font-mono text-micro tracking-[0.", "CONTROL_LABEL"],
  ["app/admin/live/page.tsx :: <AdminCard title={`Wallet activity · last ${WALLET_FEED}`} sw=\"Shughuli za pochi\" action={<a href=\"/admin/audit?category=WALLET\" className=\"font-mono text-micro tracking-", "CONTROL_LABEL"],
  ["app/admin/live/page.tsx :: className=\"font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border\" ↵ style={{ borderColor: \"var(--aqua-400)\", back", "STATUS_CHIP"],
  ["app/admin/live/page.tsx :: className=\"inline-flex items-center rounded-pill font-bold uppercase border\" ↵ style={{ height: 20, padding: \"0 7px\", fontSize: 10, letterSpacing: \"0.06em\", lineHeight: 1", "STATUS_CHIP"],
  ["app/admin/markets/[id]/page.tsx :: <p className=\"mt-2 font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ {filtered.length} of {allPositions.length} {allPositions.length === 1 ? \"position", "OTHER"],
  ["app/admin/markets/[id]/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle\">{m.category}</span> ↵ {/* ⭐ Jay (Gaming Board) item #14 — the category is editable her", "OTHER"],
  ["app/admin/markets/page.tsx :: <p className=\"mt-2 font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ {filtered.length} of {all.length} {all.length === 1 ? \"market\" : \"markets\"}", "OTHER"],
  ["app/admin/markets/page.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.08em] text-text-tertiary\">Settled</span> ↵ ) : (", "STATUS_CHIP"],
  ["app/admin/markets/page.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.08em] text-text-tertiary\">Void · refunded</span> ↵ ) : m.status === \"RESOLVED\" ? (", "STATUS_CHIP"],
  ["app/admin/markets/page.tsx :: <span className={`inline-flex items-center gap-1.5 font-mono text-caption font-bold uppercase tracking-[0.08em] ${m.resolvedOutcome === \"YES\" ? \"text-yes-300\" : \"text-no-", "STATUS_CHIP"],
  ["app/admin/markets/page.tsx :: <td className=\"font-mono text-caption uppercase tracking-[0.14em] text-text-muted\">{m.category}</td> ↵ {/* B6: a settled market shows its VERDICT (read from resolvedOutco", "OTHER"],
  ["app/admin/objections/objection-decision.tsx :: className=\"inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.08em] text-text-tertiary\" ↵ title=\"Upholding or rejecting an objection is a complia", "OTHER"],
  ["app/admin/objections/objection-decision.tsx :: className=\"inline-flex min-h-[40px] items-center gap-1 rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 font-mono text-micro font-bold uppercase tracking-[0.08", "CONTROL_LABEL"],
  ["app/admin/objections/objection-decision.tsx :: className=\"inline-flex min-h-[40px] items-center gap-1 rounded-md border border-warning-border bg-warning-bg px-2.5 py-1.5 font-mono text-micro font-bold uppercase tracki", ["CONTROL_LABEL",2]],
  ["app/admin/page.tsx :: <span className=\"font-mono text-micro text-text-tertiary tracking-wider uppercase\">not yet live</span> ↵ </div>", "STATUS_CHIP"],
  ["app/admin/page.tsx :: action={<a href=\"/admin/audit\" className=\"font-mono text-micro tracking-[0.10em] uppercase text-royal-300\">audit →</a>} ↵ >", "CONTROL_LABEL"],
  ["app/admin/payments/control-plane.tsx :: className=\"inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 font-mono text-label font-bold uppercase tracking-[0.08em] transition-color", "CONTROL_LABEL"],
  ["app/admin/payments/kill-switch-toggle.tsx :: <input value={word} onChange={(e) => setWord(e.target.value)} placeholder=\"PAUSE\" autoComplete=\"off\" className=\"h-7 w-full rounded-sm border border-claret-edge bg-bg-over", "TYPE_TO_CONFIRM"],
  ["app/admin/payments/kill-switch-toggle.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.1em]\">{flowLabel}</span> ↵ <span className=\"inline-flex items-center gap-1 font-mono text-[10px] font-bold\">", "CONTROL_LABEL"],
  ["app/admin/payments/page.tsx :: <Link href={\"/admin/audit?category=WALLET\" as Route} className=\"ml-auto inline-flex items-center gap-1 font-mono text-caption uppercase tracking-[0.08em] text-claret-300 ", "CONTROL_LABEL"],
  ["app/admin/payments/page.tsx :: <p className=\"font-mono text-micro uppercase tracking-[0.1em] text-claret-300\"> ↵ PAUSED{k.by ? ` BY ${k.by.slice(0, 10)}` : \"\"} · {formatDateTime(k.at)}", "STATUS_CHIP"],
  ["app/admin/payments/page.tsx :: <p className=\"font-mono text-micro uppercase tracking-[0.1em] text-text-subtle\">Live · malipo</p> ↵ )}", "STATUS_CHIP"],
  ["app/admin/payments/page.tsx :: <span className={`font-mono text-micro uppercase tracking-[0.12em] ${tone}`}> ↵ {p.verdict === \"ENABLED\" ? \"enabled\" : p.verdict === \"NOT_ENABLED\" ? \"not enabled\" : \"unkn", "STATUS_CHIP"],
  ["app/admin/payments/payout-status-control.tsx :: <span className=\"block font-mono text-micro uppercase tracking-[0.1em] font-bold\">{o.label}</span> ↵ <span className=\"block mt-0.5 text-[10px] leading-tight text-text-sub", "CONTROL_LABEL"],
  ["app/admin/payments/payout-status-control.tsx :: <span className=\"inline-flex items-center gap-1 rounded-sm border px-2 h-6 font-mono text-micro font-bold uppercase tracking-[0.1em]\" style={style}> ↵ {status === \"operat", "STATUS_CHIP"],
  ["app/admin/players/[id]/balance-adjust-controls.tsx :: \"min-h-[44px] rounded-md border font-mono text-caption uppercase tracking-[0.12em] transition-colors \" + ↵ (direction === d", "CONTROL_LABEL"],
  ["app/admin/players/[id]/balance-adjust-controls.tsx :: className=\"mt-1 w-full rounded-md border border-border-strong bg-bg-overlay px-2.5 py-2 font-mono text-body-sm tracking-[0.2em] uppercase text-text outline-none admin-foc", "TYPE_TO_CONFIRM"],
  ["app/admin/players/[id]/export-player-button.tsx :: className=\"font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated text-text-secondary", "CONTROL_LABEL"],
  // ⛔ RETIRED 2026-08-31 (DG-S-07). The `· review` annotation lived in `/admin/players/[id]`'s
  // hand-rolled tab rail, as a SECOND statement of a KYC state the `:229` chip above the rail
  // already makes through the §B11 dictionary. §K rule 7d puts a state above the rail, not in
  // a tab, so the rail was deleted into the kit primitive and this site went with it. The
  // declaration is removed rather than left to match nothing — a stale key is how this gate
  // starts reporting on itself instead of on the product.
  ["app/admin/players/[id]/page.tsx :: <td className=\"py-2 pr-3\"><span className=\"font-mono text-micro tracking-wider uppercase\">{txnStatusLabel(t.status)}</span></td> ↵ <td className={[\"py-2 pl-3 font-mono ta", "STATUS_CHIP"],
  ["app/admin/players/[id]/suspend-controls.tsx :: \"font-mono text-micro tracking-[0.10em] uppercase min-h-[var(--tap-min)] px-2.5 py-1.5 rounded-sm border inline-flex items-center gap-1.5\"; ↵ return (", "CONTROL_LABEL"],
  ["app/admin/privacy/dsar-controls.tsx :: <label key={v} className=\"inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.10em] text-text-secondary\"> ↵ <input type=\"radio\" name=\"dsar-type\" v", "CONTROL_LABEL"],
  ["app/admin/privacy/page.tsx :: <span className=\"font-mono text-micro text-text-tertiary uppercase tracking-[0.10em]\">{r.fulfilledAt?.slice(0, 10) ?? \"—\"}</span> ↵ )}", "OTHER"],
  ["app/admin/privacy/page.tsx :: action={<span className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\">{recentFailed ? \"—\" : `${recentUsers.length} recent users`}</span>} ↵ >", "OTHER"],
  ["app/admin/proposals/admin-proposals-client.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.1em]\" style={{ color: meta.fg }}>{meta.label}</span> ↵ {canSaveConfig", "STATUS_CHIP"],
  ["app/admin/reports/generate-button.tsx :: <span className=\"ml-1.5 font-mono text-micro font-bold uppercase tracking-[0.12em]\"> ↵ {busy === \"pdf\" ? \"…\" : \"PDF\"}", "CONTROL_LABEL"],
  ["app/admin/reports/generate-button.tsx :: <span className=\"ml-1.5 font-mono text-micro font-bold uppercase tracking-[0.12em]\"> ↵ {busy === \"xlsx\" ? \"…\" : \"Excel\"}", "CONTROL_LABEL"],
  ["app/admin/reports/report-pack-controls.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.16em] text-text-muted\">Recording…</span> ↵ </div>", "OTHER"],
  ["app/admin/resolver-queue/page.tsx :: <div className=\"flex items-center gap-2.5 font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ <span>{pending.length} pending</span>", "OTHER"],
  ["app/admin/resolver-queue/page.tsx :: <p className=\"mt-0.5 font-mono text-micro uppercase tracking-[0.12em] text-text-subtle\"> ↵ staged <span className={`font-bold ${m.resolvedOutcome === \"YES\" ? \"text-yes-30", "STATUS_CHIP"],
  ["app/admin/resolver-queue/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle\">{m.category}</span> ↵ <a href={m.sourceUrl} target=\"_blank\" rel=\"noopener noreferrer\" ", "OTHER"],
  ["app/admin/resolver-queue/page.tsx :: className=\"min-h-[var(--tap-min)] flex items-center justify-center gap-1.5 rounded-md border border-border bg-bg-overlay py-2 font-mono text-caption tracking-[0.08em] upp", "CONTROL_LABEL"],
  ["app/admin/resolver-queue/recheck-button.tsx :: className=\"inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md border border-border bg-bg-overlay px-3 font-mono text-caption tracking-[0.08em]", "CONTROL_LABEL"],
  ["app/admin/resolver-queue/resolve-controls.tsx :: <span className=\"font-mono text-label uppercase tracking-[0.16em] text-text-muted\"> ↵ Recording {submittedSide} · {stage}", "OTHER"],
  ["app/admin/resolver-queue/two-admin-toggle.tsx :: className=\"inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.12em]\" ↵ style={{ color: enabled ? \"var(--text-subtle)\" : \"var(--warning-fg)\" }}", "STATUS_CHIP"],
  ["app/admin/resolver/[id]/page.tsx :: <p className=\"mt-0.5 font-mono text-micro uppercase tracking-[0.12em]\"> ↵ <span className=\"text-text-subtle\">attested </span>", "OTHER"],
  ["app/admin/resolver/[id]/page.tsx :: className=\"inline-flex items-center gap-1.5 h-[40px] px-3 rounded-md border border-border bg-bg-inset font-mono text-caption tracking-[0.08em] uppercase text-text-muted h", "CONTROL_LABEL"],
  ["app/admin/resolver/[id]/resolution-ceremony.tsx :: <div className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle\">{v.sw}</div> ↵ </button>", "CONTROL_LABEL"],
  ["app/admin/resolver/[id]/resolution-ceremony.tsx :: <span className=\"font-mono text-label uppercase tracking-[0.16em] text-text-muted\"> ↵ Recording attestation…", "OTHER"],
  ["app/admin/resolver/[id]/resolution-ceremony.tsx :: className=\"h-[44px] w-full rounded-md border border-claret-edge bg-bg-overlay px-3 font-mono text-body tracking-[0.3em] uppercase text-text admin-focus placeholder:tracki", ["TYPE_TO_CONFIRM",2]],
  ["app/admin/retention/page.tsx :: <p className=\"font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary\">{row.swahili}</p> ↵ </td>", "OTHER"],
  ["app/admin/retention/page.tsx :: <td className=\"p-3 font-mono text-micro tracking-[0.10em] uppercase text-text-secondary\">{row.legalBasis}</td> ↵ <td className=\"p-3 text-text-tertiary\">{row.storage}</td>", "OTHER"],
  ["app/admin/retention/purge-chain-card.tsx :: <p className=\"font-mono text-micro uppercase tracking-widest text-text-tertiary\"> ↵ {job.phase === \"exporting\" && \"Writing the evidence pack…\"}", "OTHER"],
  ["app/admin/settlement/page.tsx :: className=\"inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg px-3 py-2 font-mono text-micro font-bold uppercase tracking", "CONTROL_LABEL"],
  ["app/admin/settlement/settle-button.tsx :: className=\"inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-brand-500 bg-brand-500/10 px-3 py-2 font-mono text-micro font-bold uppercase tracking-[0", "CONTROL_LABEL"],
  ["app/admin/sources/page.tsx :: <span className={`font-mono text-micro tracking-[0.12em] uppercase px-2 py-0.5 rounded-pill border ${ ↵ isGeneratable", "STATUS_CHIP"],
  ["app/admin/sources/source-controls.tsx :: className={`inline-flex h-7 items-center gap-1.5 rounded-pill border px-3 font-mono text-caption uppercase tracking-[0.14em] transition-colors ${ ↵ enabled", "CONTROL_LABEL"],
  ["app/admin/totp-verify/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.18em] font-bold text-brand-300 whitespace-nowrap\"> ↵ Step 2 of 2 · Authenticator", "STATUS_CHIP"],
  ["app/admin/transactions/page.tsx :: <span className=\"ml-1.5 text-micro uppercase tracking-[0.1em] text-[var(--gold-300)]\"> ↵ {t.payoutRail === \"SELCOM_PESA\" ? \"pesa\" : \"agent\"}", "OTHER"],
  // ⛔ RETIRED 2026-08-31 (DG-A-08). This was the proposals row's 22px hand-rolled "View chain"
  // link. It is NAVIGATION, so it took `.row-link` (globals.css:1683), which supplies the case and
  // the 0.10em itself — so the site now counts in the `.row-link` bucket above and no longer needs
  // a hand-written role here. Deleted rather than left: a declaration that matches nothing is a
  // stale read, and this gate fails until it goes.
  ["app/admin/updown/proposals/page.tsx :: <span className=\"ml-auto font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ {filtered.length.toLocaleString()} of {allProposals.length.toLocaleString()", "OTHER"],
  // ⛔ RETIRED 2026-08-31 (DG-A-08). The proposals row's "Reject" and "Delete" levers were 22px
  // bare-text buttons sitting beside a 40px <Button size="sm">Review</Button> in the SAME cell.
  // Both are the kit at size="sm" now, which carries neither uppercase nor tracking, so they
  // leave this census entirely.
  ["app/admin/updown/rounds/page.tsx :: <span className=\"ml-auto font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ {total.toLocaleString()} rounds", "OTHER"],
  ["app/api/og/market/[id]/route.tsx :: <div style={{ fontSize: 14, fontFamily: \"JetBrains Mono, monospace\", letterSpacing: \"0.16em\", textTransform: \"uppercase\", opacity: 0.7 }}> ↵ {m.category}", "OTHER"],
  ["app/api/og/market/[id]/route.tsx :: <span style={{ color: C.tipLabel, opacity: 0.6, fontStyle: \"italic\", textTransform: \"uppercase\", fontSize: 14 }}> ↵ {Math.abs(yes - 50) < 4 ? \"tipping\" : yes > 50 ? \"lean", "STATUS_CHIP"],
  ["app/api/og/market/[id]/route.tsx :: letterSpacing: \"0.18em\", textTransform: \"uppercase\", color: C.gilt, ↵ }}>", "CELEBRATION"],
  ["app/api/og/page/route.tsx :: <div style={{ position: \"absolute\", bottom: 46, fontSize: 15, letterSpacing: \"0.16em\", textTransform: \"uppercase\", opacity: 0.5 }}> ↵ The wisdom of YES &amp; NO", "CELEBRATION"],
  ["app/auth/2fa/page.tsx :: className=\"font-mono text-label uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors\" ↵ >", "CONTROL_LABEL"],
  ["app/auth/2fa/page.tsx :: className=\"font-mono text-label uppercase tracking-[0.14em] text-text-subtle hover:text-text transition-colors\" ↵ >", "CONTROL_LABEL"],
  ["app/auth/admin/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.18em] font-bold text-brand-300 whitespace-nowrap\"> ↵ Staff · Confidential", "STATUS_CHIP"],
  ["app/auth/forgot-password/page.tsx :: className=\"inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.16em] text-text-subtle hover:text-text\" ↵ >", "CONTROL_LABEL"],
  ["app/auth/login/page.tsx :: className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle hover:text-text\" ↵ >", "CONTROL_LABEL"],
  ["app/auth/otp/page.tsx :: className=\"font-mono text-label uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors\" ↵ >", "CONTROL_LABEL"],
  ["app/auth/otp/page.tsx :: className=\"font-mono text-label uppercase tracking-[0.14em] text-text-subtle hover:text-text transition-colors\" ↵ >", "CONTROL_LABEL"],
  ["app/auth/reset-password/page.tsx :: className=\"inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.16em] text-text-subtle hover:text-text\" ↵ >", "CONTROL_LABEL"],
  ["app/global-error.tsx :: textTransform: \"uppercase\", ↵ letterSpacing: \"0.20em\",", "CELEBRATION"],
  ["app/leaderboard/loading.tsx :: <p className=\"font-mono text-caption uppercase tracking-[0.18em] text-text-muted\"> ↵ {t.common.loading}", "OTHER"],
  ["app/leaderboard/page.tsx :: <span className=\"inline-flex items-center rounded-pill border border-border bg-bg-overlay px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.10em] text-text", "STATUS_CHIP"],
  ["app/live/pulse-grid.tsx :: <p className=\"font-mono text-micro uppercase tracking-[0.16em] text-text-subtle\"> ↵ {t.common.loadingMore}", "OTHER"],
  ["app/markets/[id]/not-found.tsx :: <p className=\"font-mono text-micro font-bold uppercase tracking-[0.20em] text-gold-300\"> ↵ {t.error.notFoundCode}", "CELEBRATION"],
  ["app/markets/[id]/not-found.tsx :: className=\"mt-6 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200\" ↵ >", "CONTROL_LABEL"],
  ["app/markets/[id]/page.tsx :: <span className=\"closing-pill inline-flex items-center gap-1.5 rounded-full border h-[26px] px-2.5 font-mono text-caption font-bold uppercase tracking-[0.10em] tabular-nu", "STATUS_CHIP"],
  ["app/markets/[id]/page.tsx :: <span className={`inline-flex items-center gap-1.5 rounded-full border h-[26px] px-2.5 font-mono text-caption font-bold uppercase tracking-[0.10em] ${ ↵ settling ? \"borde", "STATUS_CHIP"],
  ["app/markets/[id]/page.tsx :: <span className={`text-micro uppercase tracking-[0.10em] font-semibold ${ ↵ p.status === \"OPEN\" ? \"text-info-fg\" : p.status === \"WIN\" ? \"text-gold-300\" : p.status === \"LO", "STATUS_CHIP"],
  ["app/not-found.tsx :: <p className=\"font-mono text-micro font-bold uppercase tracking-[0.20em] text-text-subtle\"> ↵ {d.notFoundCode} · {d.notFound}", "CELEBRATION"],
  ["app/not-found.tsx :: className=\"mt-6 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200\" ↵ >", "CONTROL_LABEL"],
  ["app/notifications/bulk-bar.tsx :: <span className=\"font-mono text-micro font-bold uppercase text-text-subtle truncate\"> ↵ {countLabel}", "STATUS_CHIP"],
  ["app/notifications/row-actions.tsx :: className=\"shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-accent-400 hover:text-text hover:bg-bg-overl", "CONTROL_LABEL"],
  ["app/positions/page.tsx :: <div className=\"mb-1.5 flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-[0.12em] tabular-nums\"> ↵ <span className=\"font-bold text-yes-300\">", "OTHER"],
  ["app/positions/performance/page.tsx :: <p className=\"font-mono text-micro uppercase tracking-[0.08em] text-text-muted\">{r.statusLabel}</p> ↵ </div>", "STATUS_CHIP"],
  ["app/positions/performance/page.tsx :: <p className=\"font-mono text-micro uppercase tracking-[0.12em] text-text-subtle tabular-nums\">{t.performance.longestStreak} {longestStreak}</p> ↵ </div>", "OTHER"],
  ["app/positions/performance/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.08em] text-text-subtle\">{t.performance.cumulativePerSettlement}</span> ↵ </div>", "OTHER"],
  ["app/profile/kyc/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.1em] text-text-subtle\">{idLabel}</span> ↵ </div>", "OTHER"],
  ["app/profile/kyc/page.tsx :: <span className=\"inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2.5 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.1em] t", "STATUS_CHIP"],
  ["app/profile/kyc/page.tsx :: className=\"font-mono text-label uppercase tracking-[0.14em] text-text-subtle hover:text-text\" ↵ >", "CONTROL_LABEL"],
  ["app/profile/page.tsx :: <span className=\"inline-flex items-center rounded-pill border border-gold-700/50 bg-gold-500/15 px-1.5 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.08em] t", "STATUS_CHIP"],
  ["app/proposals/[id]/not-found.tsx :: <Link href=\"/proposals\" className=\"mt-6 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200\"> ↵ <I.globe s", "CONTROL_LABEL"],
  ["app/proposals/[id]/not-found.tsx :: <p className=\"font-mono text-micro font-bold uppercase tracking-[0.20em] text-gold-300\"> ↵ {t.error.notFoundCode}", "CELEBRATION"],
  ["app/proposals/[id]/page.tsx :: <p className=\"mb-3 font-mono text-micro uppercase tracking-[0.16em] font-bold text-gold-300\">{t.common.yourProposalApproved}</p> ↵ <RewardBurst", "CELEBRATION"],
  ["app/results/page.tsx :: <span className=\"ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold text-gold-300\"> ↵ <I.crown s={13} /> {t.results.notab", "STATUS_CHIP"],
  ["app/updown/[roundId]/page.tsx :: <p className=\"mt-1 flex items-center gap-1.5 font-mono text-micro font-semibold uppercase tracking-[0.10em] text-text-subtle\"> ↵ {isOpen && <span className=\"live-dot\" />}", "STATUS_CHIP"],
  ["app/updown/[roundId]/page.tsx :: className=\"inline-flex items-center gap-0.5 font-mono text-micro font-semibold uppercase tracking-[0.08em]\" ↵ style={{ color: \"var(--brand-300)\" }}>", "CONTROL_LABEL"],
  ["app/updown/history/page.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.10em] text-text-faint\"> ↵ {g.bets.length} {t.market.udBets}", "OTHER"],
  ["app/updown/page.tsx :: <span className=\"ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.10em] text-text-faint\"> ↵ <span className=\"live-dot\" /> {t.market.udS", "STATUS_CHIP"],
  ["app/updown/page.tsx :: className=\"mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 py-2 font-mono text-caption uppercase tracking-[0.10em] te", "CONTROL_LABEL"],
  ["app/wallet/wallet-client.tsx :: <p className={`mt-0.5 font-mono text-micro uppercase tracking-[0.14em] font-semibold ${statusTone}`}> ↵ {statusLabel[tx.status]}", "STATUS_CHIP"],
  ["app/wallet/wallet-client.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.1em] text-gold-200/80 flex items-center gap-1.5\"> ↵ {BONUS_SOURCE_LABEL[g.source] ?? g.source}", "OTHER"],
  ["app/wallet/wallet-client.tsx :: <span className=\"ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200\">", "STATUS_CHIP"],
  ["app/wallet/wallet-client.tsx :: className=\"mt-3 inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200 transition-colors\" ↵ >", "CONTROL_LABEL"],
  ["components/admin/act-gate.tsx :: <span className=\"mt-[1px] font-mono text-micro uppercase tracking-[0.14em] text-text-tertiary shrink-0\"> ↵ read-only", "STATUS_CHIP"],
  ["components/admin/act-gate.tsx :: className=\"inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-sunken px-2 py-1 font-mono text-micro uppercase tracking-[0.1em] text-text-tertia", "STATUS_CHIP"],
  ["components/admin/admin-mobile-nav.tsx :: <span className=\"font-mono text-micro tracking-[0.14em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-inset text-text-secondary\"> ↵ ", "STATUS_CHIP"],
  ["components/admin/admin-shell.tsx :: <div className=\"bg-bg-sunken text-text border-b border-border-strong flex items-center justify-between px-4 lg:px-6 h-7 text-micro font-mono uppercase tracking-[0.18em]\">", "OTHER"],
  ["components/admin/admin-shell.tsx :: <span className=\"font-mono uppercase tracking-wider text-warning-fg\" style={{ fontSize: 9.5 }}>couldn&apos;t compute</span> ↵ </div>", "STATUS_CHIP"],
  ["components/admin/admin-shell.tsx :: <span className=\"inline-flex items-center gap-1 text-micro font-mono uppercase tracking-wider\" style={{ color: \"var(--aqua-400)\" }}> ↵ <span className=\"h-1.5 w-1.5 rounde", "STATUS_CHIP"],
  ["components/admin/admin-shell.tsx :: className=\"hidden sm:inline-flex font-mono text-micro tracking-[0.14em] uppercase px-2.5 h-7 items-center rounded-md border border-border bg-bg-inset text-text-secondary\"", "STATUS_CHIP"],
  ["components/admin/admin-shell.tsx :: className=\"inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-bg-inset text-text-secondary hover:text-text hover:border-border-strong hover:bg", "CONTROL_LABEL"],
  ["components/admin/admin-shell.tsx :: className=\"rounded-sm border border-dashed border-border-subtle flex items-center justify-center font-mono text-micro uppercase text-text-tertiary\" ↵ style={{ minHeight: ", "OTHER"],
  ["components/admin/admin-sort.tsx :: <button type=\"button\" onClick={() => onSort(field)} className={`inline-flex min-h-[44px] items-center gap-1 font-mono text-micro uppercase tracking-[0.1em] hover:text-tex", "CONTROL_LABEL"],
  ["components/admin/ai-toolkit.tsx :: className=\"min-h-[var(--tap-min)] mt-3 flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-micro uppercase tracking-[", "CONTROL_LABEL"],
  ["components/admin/ai-toolkit.tsx :: className={`font-mono text-micro tracking-[0.12em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border transition-colors ${ ↵ !hasKey", "CONTROL_LABEL"],
  ["components/admin/ai-toolkit.tsx :: className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-micro uppercase tracking-[0.12em] ${ ↵ on ? \"border-border-strong bg-bg-elevated text-text-secondary\" ", "STATUS_CHIP"],
  ["components/admin/control-locked.tsx :: className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-inset px-2.5 font-mono text-micro uppercase tracking-[0.10em] text-text-subtle ${ ↵ // ", "STATUS_CHIP"],
  ["components/admin/controlled-elsewhere.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.12em] text-text-subtle\"> ↵ Display only", "STATUS_CHIP"],
  ["components/admin/kyc-review-controls.tsx :: No action needed — this submission is <span className=\"font-mono uppercase\">{status}</span>. ↵ </p>", "STATUS_CHIP"],
  ["components/auth/auth-shell.tsx :: <div className=\"mb-2 flex items-center justify-between font-mono text-micro uppercase tracking-[0.14em]\"> ↵ <span className=\"text-yes-300\">{t.common.yes} 64%</span>", "OTHER"],
  ["components/auth/auth-shell.tsx :: <div className=\"relative font-mono text-micro uppercase tracking-[0.16em] text-text-subtle\"> ↵ {t.auth.licensedByGbt} {HELPLINE()} · EN · SW · 中文", "OTHER"],
  ["components/auth/auth-shell.tsx :: <p className=\"mt-6 text-center font-mono text-micro uppercase tracking-[0.16em] text-text-subtle lg:hidden\"> ↵ {t.auth.licensedByGbt} {HELPLINE()}", "OTHER"],
  ["components/auth/resend-otp-button.tsx :: className=\"inline-flex items-center gap-1.5 font-mono text-label uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors disabled:opacity-60 dis", "CONTROL_LABEL"],
  ["components/layout/avatar-menu.tsx :: <span className=\"block font-mono text-micro uppercase tracking-[0.14em] text-gold-300/80 leading-tight mt-0.5\">Staff · Internal</span> ↵ </span>", "CONTROL_LABEL"],
  ["components/layout/live-ticker.tsx :: <span className=\"font-mono text-micro font-semibold uppercase tracking-[0.1em] text-[var(--live-400)]\"> ↵ {t.common.live}", "STATUS_CHIP"],
  ["components/layout/needle-drawer.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.12em] text-text-subtle\">{shownLabel}</span> ↵ <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" aria-hidden=\"tru", "OTHER"],
  ["components/layout/notifications-panel.tsx :: <span className=\"font-mono text-micro font-bold uppercase text-text-subtle truncate\"> ↵ {unread === 1 ? t.notif.unreadOne : t.notif.unreadN.replace(\"{n}\", String(unread))", "STATUS_CHIP"],
  ["components/layout/notifications-panel.tsx :: className=\"h-7 px-1.5 rounded-md font-mono text-micro font-bold uppercase tracking-[0.10em] text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors white", "CONTROL_LABEL"],
  ["components/layout/notifications-panel.tsx :: className=\"inline-flex items-center gap-0.5 min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-accent-400 hover:text-text hover:bg-bg-overlay tran", "CONTROL_LABEL"],
  ["components/layout/notifications-panel.tsx :: className=\"inline-flex items-center min-h-[44px] px-2 rounded-md font-mono text-micro font-bold uppercase text-text-subtle hover:text-text hover:bg-bg-overlay transition-", "CONTROL_LABEL"],
  ["components/markets/comments-thread.tsx :: className=\"mt-3 w-full rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-caption uppercase tracking-[0.12em] text-text-subtle hover:text-text hover:b", "CONTROL_LABEL"],
  ["components/markets/conviction-dial.tsx :: className={`absolute right-3 top-3 z-20 inline-flex min-h-[44px] items-center gap-1.5 rounded-pill border font-mono font-bold uppercase tracking-[0.12em] transition-all $", "CONTROL_LABEL"],
  ["components/markets/sell-button.tsx :: <span className=\"font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]\">{t.common.freeExitLabel}</span> ↵ <span className=\"font-mono text-[10px] text-", "STATUS_CHIP"],
  ["components/markets/share-button.tsx :: : \"inline-flex h-[40px] items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 text-label font-mono uppercase tracking-[0.14em] text-text-muted hover:", "CONTROL_LABEL"],
  ["components/markets/side-picker.tsx :: className=\"inline-flex items-center gap-1 min-h-[44px] px-2 -mx-2 -my-2 font-mono text-micro uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-color", "CONTROL_LABEL"],
  ["components/markets/win-celebration.tsx :: className=\"g-settle font-mono text-micro uppercase tracking-[0.2em] font-bold text-gold-300\" ↵ style={{ \"--i\": 0 } as CSSProperties}", "CELEBRATION"],
  ["components/onboarding/first-visit-primer.tsx :: <div className=\"flex items-center justify-between px-2 font-mono text-micro tracking-[0.12em] uppercase text-text-subtle\"> ↵ <span>{minLabel}</span>", "OTHER"],
  ["components/onboarding/first-visit-primer.tsx :: <span className=\"font-mono text-micro uppercase tracking-[0.14em]\" style={{ color: \"var(--gilt)\" }}>{share}</span> ↵ <span className=\"inline-block h-[2px] w-5 rounded-pil", "OTHER"],
  ["components/positions/pnl-summary-strip.tsx :: <span className=\"inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.08em] text-text-subtle\"> ↵ <span", "STATUS_CHIP"],
  ["components/profile/email-editor.tsx :: <span className=\"inline-flex items-center gap-1 rounded-pill border border-gold-700 bg-gold-500/10 px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.1em] t", "STATUS_CHIP"],
  ["components/profile/email-editor.tsx :: <span className=\"inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.1em] tex", "STATUS_CHIP"],
  ["components/settings/push-settings.tsx :: <span className=\"shrink-0 font-mono text-micro uppercase tracking-[0.12em] text-text-faint\"> ↵ {state === \"loading\" ? \"…\" : t.push.na}", "STATUS_CHIP"],
  ["components/ui/back-link.tsx :: className=\"min-h-[44px] inline-flex items-center gap-1.5 text-label font-mono uppercase tracking-[0.16em] text-text-subtle hover:text-text transition-all hover:-translate", "CONTROL_LABEL"],
  ["components/ui/callout.tsx :: ? <p className=\"mt-1.5 font-mono text-micro uppercase tracking-[0.12em] text-text-subtle\">{meta}</p> ↵ : null;", "OTHER"],
  ["components/ui/cashback-promo.tsx :: <span className=\"ml-auto inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] font-bold bg-gold-500/15 text-gold-200\">", "STATUS_CHIP"],
  ["components/ui/chip.tsx :: \"inline-flex items-center rounded-pill font-bold border uppercase max-w-full\", ↵ selected && \"ring-1 ring-[var(--brand-400)] ring-offset-1 ring-offset-bg-elevated\",", "STATUS_CHIP"],
  ["components/ui/countdown-pill.tsx :: <span className=\"font-mono text-caption uppercase tracking-[0.14em] text-text-muted\" aria-hidden> ↵ {t.common.ready}", "OTHER"],
  ["components/ui/date-select.tsx :: className=\"font-mono text-label uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-colors\"> ↵ {t.common.cancel}", "CONTROL_LABEL"],
  // ⛔ DELETED 2026-08-30 (DG-A-06): the window filter's hand-rolled preset chip — 54 of them
  // over 7 admin call sites. The presets are `FilterPill`s now and the non-navigating "Custom"
  // chip wears `filterPillClass`; neither is uppercase or tracked.
  ["components/ui/duration-input.tsx :: \"font-mono uppercase tracking-[0.06em] text-text-subtle group-hover:text-text transition-colors leading-none\", ↵ size === \"sm\" ? \"text-[9px]\" : \"text-[10px]\",", "CONTROL_LABEL"],
  ["components/ui/modal.tsx :: className=\"mt-1 w-full rounded-lg border border-border-strong bg-bg-overlay px-3 py-2.5 font-mono text-body-lg tracking-[0.2em] uppercase text-text outline-none focus:bor", "TYPE_TO_CONFIRM"],
  ["components/ui/page-loader.tsx :: <p className=\"font-mono text-caption uppercase tracking-[0.18em] text-text-muted\"> ↵ {t.common.loading}", "STATUS_CHIP"],
  ["components/ui/pagination.tsx :: <p className=\"font-mono text-micro tracking-[0.14em] uppercase text-text-subtle\"> ↵ {((safePage - 1) * perPage + 1).toLocaleString()}–{Math.min(safePage * perPage, total)", "OTHER"],
  ["components/ui/password-input.tsx :: <p className={cn(\"mt-1 font-mono text-label sm:text-micro uppercase tracking-[0.14em] font-bold\", fgCls)}> ↵ {label}", "STATUS_CHIP"],
  ["components/ui/progress-bar.tsx :: <p className=\"font-mono text-micro uppercase tracking-widest text-text-tertiary tabular-nums\"> ↵ {value.toLocaleString()} of {safeMax.toLocaleString()} · {pct.toFixed(0)}", "OTHER"],
  ["components/ui/route-error.tsx :: <p className=\"font-mono text-micro font-bold uppercase tracking-[0.20em] text-danger-fg\"> ↵ {eyebrow ?? t.error.somethingWentWrong}", "CELEBRATION"],
  ["components/ui/stat.tsx :: \"font-mono uppercase\", ↵ LABEL[labelStyle],", "OTHER"],
  ["components/ui/status-flag.tsx :: \"inline-flex items-center rounded-pill font-mono font-bold uppercase whitespace-nowrap leading-none align-middle\", ↵ className,", "STATUS_CHIP"],
  // ⚠️ RE-KEYED 2026-08-31 (DG-S-02). The role is unchanged — DESIGN_AUTHORITY §T3's enclosure
  // test names "a button, tab, filter or sort chip" in the CONTROL bullet — but the line's TEXT
  // moved when the variant took `inline-flex items-center gap-1.5` (for the kit `<CountBadge>`)
  // and its off-rung `duration-100` became `duration-quick ease-linear`. ⭐ This gate went RED on
  // that edit, exactly as designed: the key is line CONTENT, not `:line`, so a class-string change
  // reads as an undeclared site until a human re-reads it. That is the ⛔ named in the door.
  ["components/ui/tabs.tsx :: \"h-[40px] px-3.5 rounded-pill text-label font-mono font-semibold uppercase tracking-[0.14em] border transition-colors duration-quick ease-linear\", ↵ active", "CONTROL_LABEL"],
  ["components/ui/time-select.tsx :: className=\"inline-flex items-center px-2 bg-bg-elevated border-l border-border font-mono text-micro uppercase tracking-[0.08em] text-text-subtle shrink-0 select-none\" ↵ a", "OTHER"],
  ["components/updown/price-hero.tsx :: <span className=\"font-mono font-semibold uppercase tracking-[0.10em]\" style={{ fontSize: 9, color: \"var(--text-faint)\" }}>{copy.awaitingRead}</span> ↵ </>", "STATUS_CHIP"],
  ["components/updown/updown-card.tsx :: <div className=\"font-mono text-micro uppercase tracking-[0.10em] text-text-faint\">{t.market.udAwaitingRead}</div> ↵ </>", "OTHER"],
  ["components/updown/updown-card.tsx :: <div className=\"mt-1 flex items-center gap-1.5 font-mono text-micro font-semibold uppercase tracking-[0.10em] text-text-subtle\"> ↵ {/* Stage 9b — kit <Dot pulse>. It IS `", "OTHER"],
  ["components/updown/updown-card.tsx :: className=\"font-mono uppercase tracking-[0.08em]\" ↵ style={{ color: \"var(--brand-300)\", fontSize: 10.5 }}", "CONTROL_LABEL"],
  ["components/updown/updown-handover.tsx :: className=\"btn btn-ghost btn-sm inline-flex items-center gap-1 font-mono uppercase tracking-[0.08em]\" ↵ style={{ color: \"var(--brand-300)\", fontSize: 10.5 }}", "CONTROL_LABEL"],
  ["lib/server/email.ts :: <p style=\"margin:0;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${TEXT_SUBTLE}\"> ↵ 50pick.tz <", "CELEBRATION"],
]);
