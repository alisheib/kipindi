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

const TONE: Record<NoticeBarTone, { bar: string; accent: string }> = {
  maintenance: { bar: "border-claret-edge bg-claret-soft text-claret-100",       accent: "var(--claret-400)" },
  warning:     { bar: "border-warning-border bg-warning-bg/60 text-warning-fg",  accent: "var(--warning-fg)" },
  info:        { bar: "border-info-border bg-info-bg/50 text-info-fg",           accent: "var(--info-fg)" },
  success:     { bar: "border-yes-700 bg-yes-500/12 text-yes-200",               accent: "var(--yes-400)" },
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
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 lg:px-6">
        {Glyph
          ? <Glyph s={15} className="shrink-0" aria-hidden />
          : <span className="shrink-0 inline-block h-2 w-2 rounded-full" style={{ background: t.accent }} aria-hidden />}
        <p className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium">{children}</p>
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md opacity-70 hover:opacity-100 transition-opacity"
          >
            <I.x s={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** The bar's trailing control, styled to sit on any NoticeBar tone. Keeps the
 *  ≥40px tap target the responsiveness matrix requires. */
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
  const cls =
    "inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill border border-current/40 px-3.5 text-[12px] font-semibold transition-colors hover:bg-current/10 disabled:opacity-50";
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
