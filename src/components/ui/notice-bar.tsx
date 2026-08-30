"use client";

/**
 * NoticeBar — the kit's full-bleed, edge-to-edge notice strip.
 *
 * The kit already had `Callout` (an inline, boxed, `role="note"` block that sits
 * INSIDE page content) but nothing for the other shape: a full-width bar pinned
 * under the app bar that speaks about the whole session rather than about the
 * paragraph next to it. Every such bar in the product was therefore hand-rolled,
 * and they had already drifted — different paddings, different tone tables,
 * different max-widths, one with a dot and one with a glyph.
 *
 * So this is the single definition. `AnnouncementBanner` (operator broadcast /
 * maintenance) and `EmailVerifyBanner` (unconfirmed address) both render through
 * it, which is what keeps them looking like one system.
 *
 * Use `Callout` for something about a specific piece of content on the page.
 * Use `NoticeBar` for a standing condition affecting the whole account or site.
 */
import { I } from "@/components/ui/glyphs";
import type { GlyphKey } from "@/components/ui/glyphs";

export type NoticeBarTone = "info" | "warning" | "success" | "maintenance";

// The fills carry no `/NN` (2026-08-21). `--claret-soft`, `--warning-bg` and
// `--info-bg` are already mixed against `transparent` in globals.css (22% / 18% /
// 18%), so a modifier multiplied that down — a `/60` on warning meant 10.8%, not
// 60%. `maintenance` was always written bare and was the only tone on this bar
// that painted at all; warning and info now match it and render their designed
// tint. ⛔ Do not re-add a modifier to a pre-mixed token.
const TONE: Record<NoticeBarTone, { bar: string; accent: string }> = {
  maintenance: { bar: "border-claret-edge bg-claret-soft text-claret-100",       accent: "var(--claret-400)" },
  warning:     { bar: "border-warning-border bg-warning-bg text-warning-fg",     accent: "var(--warning-fg)" },
  info:        { bar: "border-info-border bg-info-bg text-info-fg",              accent: "var(--info-fg)" },
  // ⭐ DG-A-21 (2026-08-30) — THE TONE NAMED `success` NOW READS THE SUCCESS FAMILY.
  // It was `border-yes-700 bg-yes-500/[0.12] text-yes-200` with `accent: --yes-400`: a tone
  // whose own key says *app state* painted from the BETTING ramp, which is precisely what D2
  // (globals.css, `--success-500`) minted this family to stop. §B2a — the YES/NO pair names the
  // side a stake is on and is never borrowed for saved/healthy/failed.
  // ⭐ It also removes the odd one out. `--success-bg` and `--success-border` are pre-mixed in
  // globals.css exactly like `--warning-*` and `--info-*`, so this row now has the SAME SHAPE as
  // its three siblings — and the note ABOVE ("`--yes-500` is opaque, so unlike the three above it
  // DOES want a modifier") described the one tone that no longer needs one. ⛔ Its rule still
  // stands for every tone here: do not re-add a modifier to a pre-mixed token.
  success:     { bar: "border-success-border bg-success-bg text-success-fg",     accent: "var(--success-fg)" },
};

export function NoticeBar({
  tone = "info",
  glyph,
  children,
  action,
  onDismiss,
  dismissLabel = "Dismiss",
  testId,
}: {
  tone?: NoticeBarTone;
  /** Leading glyph. Omit for the plain tone dot (the broadcast-bar look). */
  glyph?: GlyphKey;
  children: React.ReactNode;
  /** Trailing control — the thing that RESOLVES the condition, if there is one. */
  action?: React.ReactNode;
  /** Provide to render a dismiss button. Omit for a bar that must not be hidden. */
  onDismiss?: () => void;
  dismissLabel?: string;
  testId?: string;
}) {
  const t = TONE[tone];
  const Glyph = glyph ? I[glyph] : null;
  return (
    <div
      // `status`/`polite`, never `alert`: these describe a standing condition, so
      // they must not interrupt a screen-reader mid-sentence on every page load.
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={`border-b ${t.bar}`}
    >
      {/* DESIGN_AUTHORITY B7 — was max-w-[1480px], the only 1480 in the repo,
          against 1280 chrome (top-app-bar.tsx / public-footer.tsx). Because this
          bar renders ONLY when there is an announcement, an unconfirmed email or
          an offline state, the page appeared 200px wider some visits and not
          others — which is precisely the "sometimes the pages are too wide" in
          the original user report. */}
      <div className="mx-auto flex max-w-board flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 lg:px-6">
        {Glyph
          ? <Glyph s={15} className="shrink-0" aria-hidden />
          : <span className="shrink-0 inline-block h-2 w-2 rounded-full" style={{ background: t.accent }} aria-hidden />}
        <p className="min-w-0 flex-1 text-body-sm leading-snug font-medium">{children}</p>
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            /* ⭐ 40×40 HIT BOX, ZERO LAYOUT COST — and the two halves of that are the point.
               This was `h-6 w-6`, which on THIS project's overridden spacing scale is 32px,
               not the 24 the class name suggests (tailwind.config.ts remaps 0.5–12; read it
               before trusting any numeric spacing class here). 32 is still under the §A2
               floor, on an icon-only control that is the only way to close a site-wide
               banner — and `NoticeBarAction` below already documents itself as keeping "the
               ≥40px tap target the responsiveness matrix requires", so the file stated the
               standard and this button did not meet it.
               `-my-1` (4px on that scale) gives back the 8px the box grew, so the button's
               MARGIN box stays 32px — the height the row was built around — while its BORDER
               box, which is what a finger and `getBoundingClientRect()` both see, is 40. The
               bar does not get taller and the X does not get bigger; the target simply reaches
               into padding the bar already owned. ⛔ Do not drop the negative margin without
               re-measuring the bar. */
            className="shrink-0 -my-1 inline-flex h-[40px] w-[40px] items-center justify-center rounded-md opacity-70 hover:opacity-100 transition-opacity"
          >
            <I.x s={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** The bar's trailing control. Keeps the ≥40px tap target the responsiveness
 *  matrix requires.
 *
 *  ⚠️ Tone (2026-08-21). This was written `border-current/40` +
 *  `hover:bg-current/10` so it would inherit whatever tone the bar set. Neither
 *  class ever rendered: Tailwind owns the `current` keyword, and its
 *  `parseColor("currentColor", { loose: true })` returns null exactly as it does
 *  for a `var(--x)`, so `withAlphaValue` falls through to its undefined default
 *  and the utility is dropped entirely. So the control has always shipped with
 *  NO border and NO hover feedback — a 40px tap target with nothing to say it is
 *  a control. The alpha bridge in tailwind.config.ts cannot reach these; only a
 *  real token can.
 *
 *  `--warning-fg` is what `currentColor` actually resolved to here, because the
 *  bar's one consumer is `EmailVerifyBanner` on `tone="warning"` (which sets
 *  `text-warning-fg`), and it is what the two weights below are matched to: a
 *  40% outline and a 10% hover wash, unchanged from the author's intent.
 *  ⛔ A future bar on another tone must key this off the tone the way `TONE`
 *  above does — do NOT reach back for `current/NN`, which cannot ever render. */
export function NoticeBarAction({
  children,
  onClick,
  href,
  disabled,
  glyph,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  glyph?: GlyphKey;
}) {
  const Glyph = glyph ? I[glyph] : null;
  // 44, not 40 — §A2's "44px preferred on mobile", and this control is the mobile case by
  // construction: the standing notice bar sits app-wide above the content, and its action is
  // how a player clears the blocker it announces (confirm the email that gates the first
  // deposit, resend the code). 40 is the absolute floor, not the target, for a button a
  // thumb reaches for on a bar that is deliberately never in the reading flow.
  const cls =
    "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-pill border border-warning-fg/40 px-3.5 text-body-sm font-semibold transition-colors hover:bg-warning-fg/10 disabled:opacity-50";
  if (href) {
    return (
      <a href={href} className={cls}>
        {Glyph && <Glyph s={13} />}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {Glyph && <Glyph s={13} />}
      {children}
    </button>
  );
}
