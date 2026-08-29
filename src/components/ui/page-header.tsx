import type { ReactNode } from "react";

/**
 * PageHeader — the eyebrow + H1 pair used at the top of form-hero pages
 * (deposit, withdraw, help, profile/*). Normalizes the two drifting bits:
 *   - eyebrow: font-mono text-[11px] tracking-[0.16em] (was 10px on ~8 pages)
 *   - title:   font-display text-[28px] tracking-[-0.02em]
 *
 * `tone` colors the eyebrow to the page's accent (gold = money, info =
 * account/security, yes = protection). Longer descriptive paragraphs stay
 * in the page as a sibling; `subtitle` is only for the short italic tagline.
 */
type Tone = "subtle" | "gold" | "info" | "yes";

const EYEBROW_TONE: Record<Tone, string> = {
  subtle: "text-text-subtle",
  gold: "text-gold-300",
  info: "text-info-fg",
  yes: "text-yes-300",
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  tone = "subtle",
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className={`flex items-center gap-2 mb-1 font-mono text-caption uppercase tracking-[0.16em] font-bold ${EYEBROW_TONE[tone]}`}
      >
        {icon}
        {eyebrow}
      </p>
      {/* ⭐ DG-P-03 · §T1/§T7 — ONE LINE, 31 CALL SITES, AND NOT ONE PIXEL MOVES.
          This was `text-[28px]`, an arbitrary — and it is the arbitrary every page title in the
          product inherits, so it was the highest-leverage one in the tree. `text-title-lg` IS
          28px; its tuple also carries `lineHeight: 34px` and `letterSpacing: -0.85px`, and BOTH
          are already overridden on this very element by `leading-tight` (1.25 → 35px) and
          `tracking-[-0.02em]` (−0.56px at 28px), which are emitted after the fontSize rungs in
          the served sheet. So the computed style is byte-for-byte what it was. */}
      <h1 className="font-display text-title-lg font-bold text-text leading-tight tracking-[-0.02em]">
        {title}
      </h1>
      {subtitle != null && (
        <p className="mt-1 text-[13px] italic text-text-subtle">{subtitle}</p>
      )}
    </div>
  );
}
