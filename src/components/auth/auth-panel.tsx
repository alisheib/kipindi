import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AuthPanel + AuthHeader — THE one glass card and THE one header stack for the
 * seven /auth/* screens.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9b, 2026-08-21). `rounded-xl glass-panel p-6
 * space-y-5` was retyped on seven pages (eight sections — reset-password has
 * two), and the eyebrow/H1/subtitle stack inside it on nine. Nothing forced them
 * to agree, and they had already begun to differ: the subtitle is `mt-1.5` on
 * five sections and `mt-2 … leading-relaxed` on two, and the eyebrow takes four
 * different tones (gold, brand, no, and a `good ? yes : no` ternary on
 * verify-email). Those are PROPS here, so the variants are declared instead of
 * re-typed and a new one cannot arrive by accident.
 *
 * ⛔ WHY THIS IS NOT `ui/page-header.tsx`, and what it would take to merge them.
 * The kit's <PageHeader> is the same IDEA at different metrics, and the gap is
 * real, not cosmetic:
 *
 *                       PageHeader                    the auth stack
 *   eyebrow→H1 gap      `mb-1` on the eyebrow (4px)   `mt-1.5` on the H1 (6px)
 *   subtitle            `mt-1 text-[13px] italic      `mt-1.5 text-[13.5px]
 *                        text-text-subtle`             text-text-muted`, upright
 *   eyebrow row         always `flex items-center     flex ONLY when an icon
 *                        gap-2`                        rides in front
 *   tones               subtle · gold · info · yes    gold · brand · no · yes
 *
 * A migration that repaints seven live sign-in screens is a redesign, not a
 * consolidation, so this file reproduces the auth metrics EXACTLY and the two
 * stacks stay separate for now. Collapsing them is a one-line change once
 * <PageHeader> grows a `gap`/`subtitle` variant and Ali has signed off on which
 * subtitle treatment wins — that decision belongs to whoever owns
 * `src/components/ui/`, and this note is the request.
 *
 * Colour discipline is inherited from <AuthShell>: gold here is the EYEBROW of a
 * sign-in/sign-up screen (chrome), never a figure — nothing is earned on the
 * auth surface.
 */

/** Eyebrow colours actually in use across /auth/*. Add to the map, not at a call site. */
export type AuthEyebrowTone = "gold" | "brand" | "no" | "yes";

const EYEBROW_TONE: Record<AuthEyebrowTone, string> = {
  gold: "text-gold-300",
  brand: "text-brand-300",
  no: "text-no-300",
  yes: "text-yes-300",
};

/** The glass card every auth screen sits in. */
export function AuthPanel({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLElement>, "children">) {
  return (
    <section className={cn("rounded-xl glass-panel p-6 space-y-5", className)} {...rest}>
      {children}
    </section>
  );
}

export function AuthHeader({
  eyebrow,
  tone = "gold",
  icon,
  title,
  subtitle,
  subtitleLead = "tight",
  children,
  className,
}: {
  eyebrow: ReactNode;
  tone?: AuthEyebrowTone;
  /** A kit glyph in front of the eyebrow. Its presence is what turns the eyebrow
   *  row into a flex row — matching the /auth/2fa original, where the other six
   *  pages render a plain block. */
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /**
   * `tight` (default) = `mt-1.5` — the five short one-line subtitles.
   * `relaxed` = `mt-2 … leading-relaxed` — the two paragraph-length ones
   * (reset-password's expired branch, verify-email's result copy).
   */
  subtitleLead?: "tight" | "relaxed";
  /** Anything that belongs INSIDE the header block under the subtitle — e.g.
   *  reset-password's "this link expires" line. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* ⛔ A template literal, NOT `cn()`. `cn` is tailwind-merge, and this one
          string mixes a font-SIZE (`text-[11px]`) with a text-COLOUR
          (`text-gold-300`) — the one pairing where a merge has to classify an
          arbitrary value correctly to keep both. The class list here is a
          verbatim copy of what the seven pages shipped, and it must stay one. */}
      <p
        className={`${icon ? "flex items-center gap-2 " : ""}font-mono text-caption uppercase tracking-[0.16em] font-bold ${EYEBROW_TONE[tone]}`}
      >
        {icon}
        {eyebrow}
      </p>
      <h1 className="mt-1.5 font-display text-title-lg font-bold leading-tight text-text tracking-[-0.02em]">
        {title}
      </h1>
      {subtitle != null && (
        <p
          className={
            subtitleLead === "relaxed"
              ? "mt-2 text-[13.5px] text-text-muted leading-relaxed"
              : "mt-1.5 text-[13.5px] text-text-muted"
          }
        >
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
