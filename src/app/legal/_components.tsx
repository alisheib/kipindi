/**
 * Shared chrome for /legal/* pages — kit-faithful header + Section helper.
 *
 * Every legal page is mostly numbered prose, so we lift the header strip
 * + numbered Section into one place. Drop-in replacement for the per-page
 * <Breadcrumbs> + <h1> + <Section> triplet that previously lived in each
 * file with Kipindi tokens.
 */
import { type ReactNode } from "react";

export function LegalHeader({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  /** Mono one-liner — version, effective date, etc. */
  meta?: string;
}) {
  return (
    <header className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
        Legal
      </p>
      <h1 className="font-display text-[28px] lg:text-[32px] font-bold text-text leading-tight tracking-[-0.02em]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14px] italic text-text-subtle">{subtitle}</p>
      )}
      {meta && (
        <p className="font-mono text-[11px] tabular-nums text-text-subtle">{meta}</p>
      )}
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
