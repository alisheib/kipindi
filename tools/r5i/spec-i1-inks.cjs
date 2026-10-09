// I-1 · the betting pair (--yes-* / --no-*) only for the two sides of a bet; an app state wears the app-state family.
module.exports = [
  // ── OperationResultModal: the success and failure crests, the failure's way out, the detail rows ──────────────────────
  { file: "src/components/markets/operation-result-modal.tsx",
    from: ` * DS-3 (2026-08-07) — the crest consumes the SYSTEM, not hand-typed oklch.
 * Each variant's disc is the \`.mat-tint-*\` recipe (colour as LIT GLASS: an even
 * tinted ring + an 18% fill composed off the semantic ramp with color-mix),
 * anchored on the same four families the toast tints use — yes / no / warning /
 * brand. A token retune now moves the crest, the toast ring and the buttons
 * together instead of leaving a re-typed copy behind (the one-fact rule).
 */`,
    to: ` * DS-3 (2026-08-07) — the crest consumes the SYSTEM, not hand-typed oklch.
 * Each variant's disc is the \`.mat-tint-*\` recipe (colour as LIT GLASS: an even
 * tinted ring + an 18% fill composed off the semantic ramp with color-mix),
 * anchored on the same families the toast tints use — success / danger / warning /
 * brand. A token retune now moves the crest, the toast ring and the buttons
 * together instead of leaving a re-typed copy behind (the one-fact rule).
 * ⭐ R5-I (the visual pass's round 5, 2026-10-09; DESIGN_AUTHORITY §B2a): "success" and "failed" are APP STATES, and
 * the betting pair is never borrowed for them. The crests were still the YES green and the NO rose — the toast they sit
 * beside moved to \`--success\` / \`--danger\` on 2026-08-30 (toast.tsx, D2) and this file kept the betting ramps, so a
 * deposit's tick wore the colour of a YES stake and a refused NO bet's ✗ the colour of its own side. A bet's SIDE stays
 * where it is the side: the strip and the primary button of a placed bet (\`stripTone\` yes/no).
 */` },
  { file: "src/components/markets/operation-result-modal.tsx",
    from: '    ...crest("var(--yes-400)", "var(--yes-300)"),',
    to: '    ...crest("var(--success)", "var(--success-fg)"),' },
  { file: "src/components/markets/operation-result-modal.tsx",
    from: `  danger: {
    ...crest("var(--no-400)", "var(--no-300)"),
    primaryBtn: "btn-no",
  },`,
    to: `  danger: {
    ...crest("var(--danger)", "var(--danger-fg)"),
    // ⛔ NOT \`btn-no\` (R5-I, 2026-10-09; §B2a): that is the NO side's stake button — its fill, its weight, its tracking
    // (§B2a: ".btn-yes is not .btn-primary with a different fill") — on "Close" and "Retry". The way on from a refusal is
    // the primary action, as \`warning\`'s, \`info\`'s and \`neutral\`'s is; the crest and the eyebrow say it failed.
    primaryBtn: "btn-primary",
  },` },
  { file: "src/components/markets/operation-result-modal.tsx",
    from: `                      d.tone === "good" ? "var(--yes-300)" :
                      d.tone === "bad"  ? "var(--no-300)"  :`,
    to: `                      d.tone === "good" ? "var(--success-fg)" :
                      d.tone === "bad"  ? "var(--danger-fg)"  :`  },
  // ── global-error: the "!" mark ─────────────────────────────────────────────────────────────────────────────────────
  { file: "src/app/global-error.tsx",
    from: `  const NO_BORDER = "oklch(44% 0.17 22)";
  const NO_TEXT = "oklch(80% 0.14 22)";`,
    to: `  // ⭐ The error mark is the app-state DANGER family, written out as every value here is (no stylesheet): \`--danger-500\`
  // at the \`--danger-border\` 36% and \`--danger-bg\` 18% mixes, and \`--danger-fg\` — hue 25. It was the NO side's rose (hue
  // 22): an error is not a side (DESIGN_AUTHORITY §B2a; R5-I, 2026-10-09).
  const DANGER_BORDER = "oklch(57% 0.22 25 / 0.36)";
  const DANGER_TEXT = "oklch(82% 0.16 25)";` },
  { file: "src/app/global-error.tsx",
    from: `              border: \`1px solid \${NO_BORDER}\`,
              background: "oklch(40% 0.13 22 / 0.15)",
              color: NO_TEXT,`,
    to: `              border: \`1px solid \${DANGER_BORDER}\`,
              background: "oklch(57% 0.22 25 / 0.18)",
              color: DANGER_TEXT,` },
  // ── destructive controls: the danger ink, as the avatar menu's Sign out and a comment's Delete already wear it ───────
  { file: "src/components/profile/avatar-uploader.tsx",
    from: "shadow-e2 transition-colors group-hover:border-no-700 group-hover:text-no-300\">",
    to: "shadow-e2 transition-colors group-hover:border-danger-border group-hover:text-danger-fg\">" },
  { file: "src/components/profile/avatar-uploader.tsx",
    from: "      {/* Clear button — only when an avatar exists. Same geometry as the camera, on the top-right rim. */}",
    to: "      {/* Clear button — only when an avatar exists. Same geometry as the camera, on the top-right rim. Its hover is the\n          danger ink every destructive control wears (a comment's Delete, the menu's Sign out) — not the NO side's rose\n          (§B2a; R5-I, 2026-10-09). */}" },
  { file: "src/app/notifications/row-actions.tsx",
    from: "rounded-md text-text-subtle hover:text-no-300 hover:bg-bg-overlay transition-colors disabled:opacity-50\"",
    to: "rounded-md text-text-subtle hover:text-danger-fg hover:bg-bg-overlay transition-colors disabled:opacity-50\"" },
  { file: "src/app/profile/sessions/page.tsx",
    from: `          {/* Destructive: ends this (the only) session → ghost button with claret
              text. Inline colour beats .btn-ghost's own \`color: var(--text)\`. */}`,
    to: `          {/* Destructive: ends this (the only) session → ghost button with the danger
              ink (\`--danger-fg\`, as the avatar menu's Sign out; it read "claret" here and painted the NO side's
              rose — §B2a, R5-I 2026-10-09). Inline colour beats .btn-ghost's own \`color: var(--text)\`. */}` },
  { file: "src/app/profile/sessions/page.tsx",
    from: '              style={{ color: "var(--no-300)" }}',
    to: '              style={{ color: "var(--danger-fg)" }}' },
  { file: "src/app/profile/page.tsx",
    from: "      {/* ── Sign out (POST to prevent CSRF — GET logout is neutered) */}",
    to: "      {/* ── Sign out (POST to prevent CSRF — GET logout is neutered). The danger ink, as the avatar menu's Sign out and\n          the sessions page's: a destructive door, never the NO side's rose (§B2a; R5-I, 2026-10-09). */}" },
  { file: "src/app/profile/page.tsx",
    from: "rounded-xl glass-panel px-4 py-3.5 hover:border-no-700 transition-colors\"",
    to: "rounded-xl glass-panel px-4 py-3.5 hover:border-danger-border transition-colors\"" },
  { file: "src/app/profile/page.tsx",
    from: "rounded-md bg-no-500/10 text-no-300 group-hover:bg-no-500/20 transition-colors\">",
    to: "rounded-md bg-danger-500/10 text-danger-fg group-hover:bg-danger-500/20 transition-colors\">" },
  // ── /profile's hero and its open-count glyph ───────────────────────────────────────────────────────────────────────
  { file: "src/app/profile/page.tsx",
    from: `        {/* Layered background — emerald → rose tilt + mark watermark */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 360px at 0% 0%, oklch(40% 0.10 152 / 0.30), transparent 60%), " +
              "radial-gradient(900px 320px at 100% 100%, oklch(45% 0.13 22 / 0.25), transparent 60%), " +
              "var(--hero-panel-grad)",
          }}
        />`,
    to: `        {/* Background — the page hero every /profile page wears (\`PageHero\`'s \`info\` glow over \`--hero-panel-grad\`) + mark
            watermark. ⭐ It was an emerald → rose tilt: the YES and NO inks as a wash on the player's own page, where neither
            is a side (§B2a; R5-I, 2026-10-09) — and the one hero of the eight /profile pages that differed. */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "var(--hero-panel-grad)",
          }}
        />` },
  { file: "src/app/profile/page.tsx",
    from: '            icon={<I.sparkle s={14} className="text-yes-300" />}',
    to: '            icon={<I.sparkle s={14} />}' },
  // ── an app state that went well: the success family ────────────────────────────────────────────────────────────────
  { file: "src/app/profile/security/security-client.tsx",
    from: '${enabled ? "bg-yes-500/10 text-yes-300" : "bg-brand-500/10 text-brand-300"}',
    to: '${enabled ? "bg-success-500/10 text-success-fg" : "bg-brand-500/10 text-brand-300"}' },
  { file: "src/components/markets/resolution-panel.tsx", count: 2,
    from: '            <I.sealCheck s={14} className="mt-[1px] shrink-0 text-yes-300" />',
    to: '            <I.sealCheck s={14} className="mt-[1px] shrink-0 text-success-fg" />' },
  { file: "src/components/markets/resolution-panel.tsx",
    from: '          <I.check s={13} className="text-yes-300" />',
    to: '          <I.check s={13} className="text-success-fg" />' },
  { file: "src/components/markets/resolution-panel.tsx",
    from: "      {/* Attestation (only when genuinely two-officer) + timestamp + source */}",
    to: "      {/* Attestation (only when genuinely two-officer) + timestamp + source. The attestation's seal and the paid-out tick\n          are app states — the success ink, never the YES side's green, whatever the outcome (§B2a; R5-I, 2026-10-09). */}" },
  { file: "src/components/markets/sell-confirm-modal.tsx",
    from: `      {/* DS-6 — composed from the semantic families (YES green for the free
          window, royal for the fee'd exit), not hand-typed oklch. */}
      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: isFree ? "color-mix(in oklab, var(--yes-500) 62%, transparent)" : "color-mix(in oklab, var(--royal-500) 62%, transparent)",
          background:  isFree ? "color-mix(in oklab, var(--yes-500) 18%, transparent)" : "color-mix(in oklab, var(--royal-500) 16%, transparent)",
        }}
      >`,
    to: `      {/* DS-6 — composed from the semantic families (the success green for the free
          window, royal for the fee'd exit), not hand-typed oklch. ⭐ \`--success-*\`, not \`--yes-*\` (R5-I, 2026-10-09;
          §B2a): "no fee" is good news about a sale, not the YES side — and the ticket being sold may be a NO one. */}
      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: isFree ? "color-mix(in oklab, var(--success-500) 62%, transparent)" : "color-mix(in oklab, var(--royal-500) 62%, transparent)",
          background:  isFree ? "color-mix(in oklab, var(--success-500) 18%, transparent)" : "color-mix(in oklab, var(--royal-500) 16%, transparent)",
        }}
      >` },
  { file: "src/components/markets/sell-confirm-modal.tsx",
    from: '              style={{ color: isFree ? "var(--yes-300)" : "var(--text)" }}',
    to: '              style={{ color: isFree ? "var(--success-fg)" : "var(--text)" }}' },
  { file: "src/app/agent/apply/apply-client.tsx",
    from: '          : done ? "border-yes-700 bg-yes-500/[0.07] cursor-pointer hover:border-yes-500"',
    to: '          // An uploaded slot is the KYC uploader\'s done tile, the success family (§B2a; R5-I, 2026-10-09).\n          : done ? "border-success-border bg-success-500/[0.07] cursor-pointer hover:border-success-500"' },
  { file: "src/app/agent/apply/apply-client.tsx",
    from: '${rejected ? "text-warning-500" : done ? "text-yes-300" : "text-text-subtle"}',
    to: '${rejected ? "text-warning-500" : done ? "text-success-fg" : "text-text-subtle"}' },
  { file: "src/components/auth/password-pair.tsx",
    from: `              ? <span className="text-yes-300">{t.common.passwordsMatch}</span>
              : <span className="text-no-300">{t.toast.passwordsDontMatch}</span>`,
    to: `              // A form's verdict on its own field: the app-state pair, never the betting one (§B2a; R5-I, 2026-10-09).
              ? <span className="text-success-fg">{t.common.passwordsMatch}</span>
              : <span className="text-danger-fg">{t.toast.passwordsDontMatch}</span>` },
  // ── form errors at the field: the danger ink (betting-ink §6's rule) ──────────────────────────────────────────────
  { file: "src/app/proposals/new/create-form.tsx",
    from: '<span className={titleEn.length > 120 ? "text-no-300" : undefined}>{titleEn.length}/120</span>',
    to: '<span className={titleEn.length > 120 ? "text-danger-fg" : undefined}>{titleEn.length}/120</span>' },
  { file: "src/app/proposals/new/create-form.tsx",
    from: '          <p className="mt-1 text-body-sm leading-snug text-no-300">{t.proposals.sourceLinkInvalid}</p>',
    to: '          <p className="mt-1 text-body-sm leading-snug text-danger-fg">{t.proposals.sourceLinkInvalid}</p>' },
  { file: "src/app/proposals/new/create-form.tsx",
    from: '          <p className="mt-1 text-body-sm leading-snug text-no-300">{t.common.selectionCloseError}</p>',
    to: '          <p className="mt-1 text-body-sm leading-snug text-danger-fg">{t.common.selectionCloseError}</p>' },
  { file: "src/components/updown/round-stake-panel.tsx",
    from: '          <p className={cn("mt-1 text-micro amount", customInvalid ? "text-no-300" : "text-text-subtle")}>',
    to: '          {/* An amount outside its bounds is a form error at the field: the danger ink, never the Down side\'s rose (§B2a). */}\n          <p className={cn("mt-1 text-micro amount", customInvalid ? "text-danger-fg" : "text-text-subtle")}>' },
  { file: "src/components/updown/updown-stake-controls.tsx",
    from: '          <p className={cn("mt-1 text-micro amount", customInvalid ? "text-no-300" : "text-text-subtle")}>',
    to: '          {/* An amount outside its bounds is a form error at the field: the danger ink, never the Down side\'s rose (§B2a). */}\n          <p className={cn("mt-1 text-micro amount", customInvalid ? "text-danger-fg" : "text-text-subtle")}>' },
  // ── a stale feed is an app state too ───────────────────────────────────────────────────────────────────────────────
  { file: "src/components/charts/terminal-chart.tsx",
    from: 'style={{ color: feed.liveStale ? "var(--no-300)" : "var(--text-faint)" }}>',
    to: 'style={{ color: feed.liveStale ? "var(--danger-fg)" : "var(--text-faint)" }}>' },
  // ── the auth eyebrow: success and danger, not YES and NO ───────────────────────────────────────────────────────────
  { file: "src/components/auth/auth-panel.tsx",
    from: `/** Eyebrow colours actually in use across /auth/*. Add to the map, not at a call site. */
export type AuthEyebrowTone = "brand" | "no" | "yes";

const EYEBROW_TONE: Record<AuthEyebrowTone, string> = {
  brand: "text-brand-300",
  no: "text-no-300",
  yes: "text-yes-300",
};`,
    to: `/** Eyebrow colours actually in use across /auth/*. Add to the map, not at a call site.
 *  ⭐ R5-I (2026-10-09; DESIGN_AUTHORITY §B2a): a confirmed address and an expired link are APP STATES — the success and
 *  danger family their medallions already wear (verify-email, reset-password) — so the eyebrow says them in the same ink.
 *  It was \`yes\` / \`no\`: the betting pair, the two sides of a stake, on a page where nothing is staked. */
export type AuthEyebrowTone = "brand" | "danger" | "success";

const EYEBROW_TONE: Record<AuthEyebrowTone, string> = {
  brand: "text-brand-300",
  danger: "text-danger-fg",
  success: "text-success-fg",
};` },
  { file: "src/app/auth/reset-password/page.tsx",
    from: `            <AuthHeader
              tone="no"`,
    to: `            <AuthHeader
              tone="danger"` },
  { file: "src/app/auth/verify-email/page.tsx",
    from: '            tone={good ? "yes" : "no"}',
    to: '            tone={good ? "success" : "danger"}' },
  // ── the RG page's hero: the page accent every /profile page wears, not the YES side ─────────────────────────────────
  { file: "src/app/profile/responsible-gambling/page.tsx",
    from: `      <PageHero glow="yes">
        <PageHeader
          tone="yes"`,
    to: `      {/* ⭐ The account pages' accent (\`info\`), as /profile/account, /kyc, /sessions and /source-of-funds wear it. It was
          the YES green — glow and eyebrow — on the page a player opens when gambling is hurting them: §B2a names the RG
          support panel as the betting pair's misuse, and this hero was its last trace (R5-I, 2026-10-09). The words, the
          glyph and every RG notice below are unchanged. */}
      <PageHero glow="info">
        <PageHeader
          tone="info"` },
  { file: "src/components/ui/page-header.tsx",
    from: ` * \`tone\` colors the eyebrow to the page's accent (info = account/security, yes = protection). Longer descriptive
 * paragraphs stay in the page as a sibling; \`subtitle\` is only for the short italic tagline.`,
    to: ` * \`tone\` colors the eyebrow to the page's accent (info = account/security/protection). Longer descriptive
 * paragraphs stay in the page as a sibling; \`subtitle\` is only for the short italic tagline.
 * ⛔ NO \`yes\` (R5-I, 2026-10-09; DESIGN_AUTHORITY §B2a): its one caller was the responsible-gambling page — "protection"
 * in the YES side's green. It takes \`info\` with the other account pages, and the option is gone, as \`gold\` went below.`},
  { file: "src/components/ui/page-header.tsx",
    from: `type Tone = "subtle" | "info" | "yes";

const EYEBROW_TONE: Record<Tone, string> = {
  subtle: "text-text-subtle",
  info: "text-info-fg",
  yes: "text-yes-300",
};`,
    to: `type Tone = "subtle" | "info";

const EYEBROW_TONE: Record<Tone, string> = {
  subtle: "text-text-subtle",
  info: "text-info-fg",
};` },
  { file: "src/components/ui/page-hero.tsx",
    from: ` * ⛔ NO \`gold\` (R5-C, 2026-10-09; Q5): a page's hero is never money. Its only callers, /proposals and /proposals/new,
 * take the default \`info\`, the glow seven other page heroes wear.
 */
type Glow = "info" | "yes" | "rose" | "aqua";

const GLOW: Record<Glow, string> = {
  info: "oklch(45% 0.10 240 / 0.18)",
  yes: "oklch(45% 0.10 152 / 0.18)",
  rose: "oklch(45% 0.13 22 / 0.18)",`,
    to: ` * ⛔ NO \`gold\` (R5-C, 2026-10-09; Q5): a page's hero is never money. Its only callers, /proposals and /proposals/new,
 * take the default \`info\`, the glow seven other page heroes wear.
 * ⛔ NO \`yes\` AND NO \`rose\` EITHER (R5-I, 2026-10-09; DESIGN_AUTHORITY §B2a): the betting pair names the two sides of a
 * stake, and a page's hero names a page. \`yes\` had one caller — the responsible-gambling page, now \`info\` with the other
 * account pages — and \`rose\` none.
 */
type Glow = "info" | "aqua";

const GLOW: Record<Glow, string> = {
  info: "oklch(45% 0.10 240 / 0.18)",` },
  // ── the RG page's art: its one accent in the panel's own ink ───────────────────────────────────────────────────────
  { file: "src/components/rg/self-care-art.tsx",
    from: '      <circle cx="28" cy="40" r="2.4" fill="var(--yes-300)" stroke="none" />',
    to: '      {/* The sun\'s point in the art\'s own ink (the support panel\'s success family) — it was the YES side\'s green, the last\n          betting ink in the panel §B2a names (R5-I, 2026-10-09). */}\n      <circle cx="28" cy="40" r="2.4" fill="currentColor" stroke="none" />' },
  // ── the activity page's tiles: one neutral label for every figure ──────────────────────────────────────────────────
  { file: "src/app/profile/activity/page.tsx",
    from: '              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.won}         value={formatTzs(summary.won)}         icon={<I.trophy s={14} />} labelTone="yes" />',
    to: '              <Stat size="lg" labelStyle="wide" boxed="tile" money label={t.activity.won}         value={formatTzs(summary.won)}         icon={<I.trophy s={14} />} />' },
  { file: "src/app/profile/activity/page.tsx",
    from: ' icon={<I.activity s={14} />} labelTone={summary.net >= 0 ? "yes" : "no"} />',
    to: ' icon={<I.activity s={14} />} />' },
  { file: "src/app/profile/activity/page.tsx",
    from: `                  semibold 0.12em). Box, label, icon row and the yes/no label tint are
                  carried across unchanged.`,
    to: `                  semibold 0.12em). Box, label and icon row are carried across unchanged.
                  ⭐ ONE LABEL INK FOR EVERY TILE (R5-I, 2026-10-09). Won and Net wore the YES green (Net the NO rose
                  below zero, and the green AT zero): the betting pair on the inflow/outflow of a period, on the
                  page that states a player's money honestly — §B2a keeps it for a stake's side, and §C4 asks a
                  loss to be stated as calmly as a win. The figures carry their own sign.`},
  { file: "src/components/ui/stat.tsx",
    from: `  /**
   * Recolour the whole label ROW (label + icon) — the treatment \`MoneyTile\` used
   * to flag an inflow green and an outflow rose. Overrides the label style's own
   * colour; leave unset for the dictionary's.
   */
  labelTone?: "yes" | "no";
`,
    to: `  /* ⛔ \`labelTone\` IS GONE (R5-I, 2026-10-09; DESIGN_AUTHORITY §B2a). It recoloured the label row in the betting pair
     to flag an inflow green and an outflow rose — the treatment of the old \`MoneyTile\`; an inflow is not the YES side.
     Its one caller (/profile/activity) reads every tile in the label's own ink now. */
` },
  { file: "src/components/ui/stat.tsx",
    from: "  labelStyle = \"micro\",\n  labelTone,\n",
    to: "  labelStyle = \"micro\",\n" },
  { file: "src/components/ui/stat.tsx",
    from: "        labelTone === \"yes\" ? \"text-yes-300\" : labelTone === \"no\" ? \"text-no-300\" : null,\n",
    to: "" },
  { file: "src/components/ui/stat.tsx",
    from: "            labelTone === \"yes\" ? \"text-yes-300\" : labelTone === \"no\" ? \"text-no-300\" : \"text-text-subtle\",",
    to: "            \"text-text-subtle\"," },
];
