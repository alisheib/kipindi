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
        className={`flex items-center gap-2 mb-1 font-mono text-[11px] uppercase tracking-[0.16em] font-bold ${EYEBROW_TONE[tone]}`}
      >
        {icon}
        {eyebrow}
      </p>
      <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
        {title}
      </h1>
      {subtitle != null && (
        <p className="mt-1 text-[13px] italic text-text-subtle">{subtitle}</p>
      )}
    </div>
  );
}
