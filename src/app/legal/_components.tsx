/**
 * Shared chrome for /legal/* pages — kit-faithful header + Section helper.
 *
 * Every legal page is mostly numbered prose, so we lift the header strip
 * + numbered Section into one place. Drop-in replacement for the per-page
 * <Breadcrumbs> + <h1> + <Section> triplet that previously lived in each
 * file with 50pick tokens.
 */
import { type ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { GiltCorner } from "@/components/brand";

export function LegalHeader({
  title,
  subtitle,
  meta,
  eyebrow = "Legal",
  glyph,
}: {
  title: string;
  subtitle?: string;
  /** Mono one-liner — version, effective date, etc. */
  meta?: string;
  /** Localized eyebrow word — "Legal" / "Kisheria" / "法律". */
  eyebrow?: string;
  /** Per-document sigil key (scrollText / lock / shield / shieldcheck). */
  glyph?: keyof typeof I;
}) {
  const Glyph = glyph ? I[glyph] : null;
  return (
    // Framed like an official regulator letter — the GiltCorner is the kit's
    // sanctioned "seal" (its documented use is framing regulator letters), the
    // single gilt note; glyph + eyebrow stay neutral chrome (gold = money only).
    <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated/50 px-5 py-4 lg:px-6 lg:py-5">
      <GiltCorner size={54} rotate={0} className="absolute left-1 top-1" />
      <GiltCorner size={54} rotate={180} className="absolute right-1 bottom-1" />
      <div className="relative z-10 flex items-start gap-3.5">
        {Glyph && (
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-bg-overlay text-text-muted">
            <Glyph s={20} />
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
            {eyebrow}
          </p>
          <h1 className="font-display text-[26px] lg:text-[30px] font-bold text-text leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] italic text-text-subtle">{subtitle}</p>
          )}
          {meta && (
            <p className="font-mono text-[11px] tabular-nums text-text-subtle">{meta}</p>
          )}
        </div>
      </div>
    </header>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 pt-2">
      <h2 className="font-display text-[17px] font-semibold text-text leading-tight">
        <span className="font-mono text-[12px] text-text-subtle mr-2 tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="text-[13.5px] text-text-muted leading-relaxed space-y-2.5">
        {children}
      </div>
    </section>
  );
}
