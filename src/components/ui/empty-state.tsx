"use client";

/**
 * EmptyState — kit-faithful: 360px (or full-width) boxed, dashed border,
 * line-art SVG illustration in brand-teal stroke with gold accent.
 * Title (display 16/600), body (13, EN + SW), optional ghost CTA.
 *
 * The kit explicitly forbids mascots / full-color cartoons.
 *
 * Kinds map to a built-in line-art icon:
 *   markets · positions · leaderboard · notifications · audit · sources · default
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Kind = "markets" | "positions" | "leaderboard" | "notifications" | "audit" | "sources" | "default";

export function EmptyState({
  kind = "default",
  illustration,
  title,
  titleSw,
  body,
  bodySw,
  action,
  className,
}: {
  kind?: Kind;
  illustration?: ReactNode;
  title: string;
  titleSw?: string;
  body?: string;
  bodySw?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border-strong bg-bg-elevated px-6 py-6 text-center max-w-[300px] mx-auto",
        className,
      )}
    >
      <div className="mx-auto mb-4 inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-border bg-bg-inset text-text-faint" aria-hidden>
        {illustration ?? <DefaultIllustration kind={kind} />}
      </div>
      <p className="font-display text-[15.5px] font-semibold text-text">{title}</p>
      {titleSw && <p className="mt-0.5 text-[12px] italic text-text-subtle">{titleSw}</p>}
      {body && <p className="mt-2 text-[12.5px] leading-relaxed text-text-subtle">{body}</p>}
      {bodySw && <p className="mt-1 text-[12px] italic text-text-subtle">{bodySw}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Compact error-state — same chrome, no-rose accent. */
export function ErrorState({
  title,
  detail,
  action,
  className,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
}) {
  const { t } = useT();
  const resolvedTitle = title ?? t.error.somethingDidntWork;

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-no-700 bg-no-500/[0.06] px-6 py-10 text-center max-w-[420px] mx-auto",
        className,
      )}
    >
      <div className="mx-auto mb-4 w-12 h-12 grid place-items-center text-no-300" aria-hidden>
        <ErrorMark />
      </div>
      <p className="font-display text-[15px] font-semibold text-text">{resolvedTitle}</p>
      {detail && <p className="mt-2 font-mono text-[11px] text-text-subtle">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Line-art illustrations — brand-teal stroke + gold accent; no fills. */
function DefaultIllustration({ kind }: { kind: Kind }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "markets":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Scales of justice — markets/proposals */}
          <line x1="28" y1="8" x2="28" y2="44" />
          <line x1="14" y1="16" x2="42" y2="16" />
          <path d="M14 16 L10 28 a8 4 0 0 0 8 0 Z" />
          <path d="M42 16 L38 28 a8 4 0 0 0 8 0 Z" stroke="var(--gold-400)" />
          <line x1="20" y1="44" x2="36" y2="44" />
        </svg>
      );
    case "positions":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          <rect x="10" y="10" width="36" height="36" rx="6" />
          <line x1="10" y1="22" x2="46" y2="22" />
          <line x1="22" y1="22" x2="22" y2="46" />
          <circle cx="38" cy="34" r="4" stroke="var(--gold-400)" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          <rect x="22" y="22" width="12" height="22" rx="2" />
          <rect x="6" y="32" width="12" height="12" rx="2" />
          <rect x="38" y="28" width="12" height="16" rx="2" />
          <path d="M22 14 L28 8 L34 14 Z" stroke="var(--gold-400)" />
        </svg>
      );
    case "notifications":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          <path d="M14 38 V24 a14 14 0 0 1 28 0 V38 l4 4 H10 Z" />
          <path d="M22 44 a6 6 0 0 0 12 0" />
          <circle cx="42" cy="14" r="4" fill="var(--gold-400)" stroke="none" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          <rect x="12" y="8" width="32" height="40" rx="3" />
          <line x1="18" y1="18" x2="38" y2="18" />
          <line x1="18" y1="26" x2="38" y2="26" />
          <line x1="18" y1="34" x2="30" y2="34" />
          <circle cx="38" cy="40" r="5" stroke="var(--gold-400)" />
          <line x1="42" y1="44" x2="46" y2="48" stroke="var(--gold-400)" />
        </svg>
      );
    case "sources":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          <circle cx="28" cy="28" r="18" />
          <path d="M10 28 H 46" />
          <path d="M28 10 a26 18 0 0 1 0 36" />
          <path d="M28 10 a26 18 0 0 0 0 36" />
          <circle cx="28" cy="28" r="3" fill="var(--gold-400)" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          <circle cx="28" cy="28" r="20" />
          <path d="M22 24 q6 -8 12 0" />
          <line x1="22" y1="34" x2="34" y2="34" />
          <circle cx="38" cy="20" r="2" fill="var(--gold-400)" stroke="none" />
        </svg>
      );
  }
}

function ErrorMark() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="24" cy="24" r="18" />
      <line x1="17" y1="17" x2="31" y2="31" />
      <line x1="31" y1="17" x2="17" y2="31" />
    </svg>
  );
}
