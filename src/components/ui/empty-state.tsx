"use client";

/**
 * EmptyState — kit-faithful: 360px (or full-width) boxed, dashed border,
 * line-art SVG illustration in brand-teal stroke with gold accent.
 * Title (display 16/600), body (13), optional ghost CTA.
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
  body,
  action,
  className,
}: {
  kind?: Kind;
  illustration?: ReactNode;
  title: string;
  body?: string;
  /** Accepted for back-compat; no longer rendered (single-language UI). */
  titleSw?: string;
  bodySw?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center max-w-[360px] mx-auto",
        className,
      )}
    >
      {/* Kit shows the line-art illustration bare and centered (no ring badge). */}
      <div className="mx-auto mb-4 inline-flex items-center justify-center text-text-faint" aria-hidden>
        {illustration ?? <DefaultIllustration kind={kind} />}
      </div>
      <p className="font-display text-[15.5px] font-semibold text-text">{title}</p>
      {body && <p className="mt-2 text-[12.5px] leading-relaxed text-text-subtle">{body}</p>}
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

/** Line-art illustrations — gilt-line etching on dark glass; one gold accent per scene. */
function DefaultIllustration({ kind }: { kind: Kind }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const g = "oklch(78% 0.14 86)";
  switch (kind) {
    case "markets":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Tilted scales — the tipping metaphor; gilt pivot diamond. */}
          <line x1="28" y1="47" x2="28" y2="17" />
          <path d="M23 49 L25 45 H31 L33 49" />
          <line x1="19" y1="49" x2="37" y2="49" />
          <line x1="11" y1="23" x2="45" y2="15" />
          <line x1="13" y1="23.5" x2="9" y2="31" />
          <line x1="13" y1="23.5" x2="17" y2="31" />
          <path d="M8 31 A6.5 6.5 0 0 0 18 31" />
          <line x1="43" y1="15.5" x2="39" y2="23" />
          <line x1="43" y1="15.5" x2="47" y2="23" />
          <path d="M38 23 A6.5 6.5 0 0 0 48 23" />
          <path d="M28 15.8 L31 19 L28 22.2 L25 19 Z" fill={g} stroke="none" />
        </svg>
      );
    case "positions":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Closed briefcase, gilt latch. */}
          <rect x="10" y="21" width="36" height="25" rx="3" />
          <path d="M22 21 V17.5 Q22 15 24.5 15 H31.5 Q34 15 34 17.5 V21" />
          <line x1="10" y1="31" x2="23" y2="31" />
          <line x1="33" y1="31" x2="46" y2="31" />
          <rect x="26" y="29" width="4" height="4" rx="1" fill={g} stroke="none" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Empty podium, gilt spark above first place. */}
          <rect x="21" y="26" width="14" height="20" />
          <rect x="7" y="33" width="14" height="13" />
          <rect x="35" y="37" width="14" height="9" />
          <line x1="28" y1="31" x2="28" y2="37" />
          <path d="M28 12 Q29 16.5 33 17.5 Q29 18.5 28 23 Q27 18.5 23 17.5 Q27 16.5 28 12 Z" fill={g} stroke="none" />
        </svg>
      );
    case "notifications":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Bell at rest — gilt clapper; ground line. */}
          <path d="M19 36 V27 A9 9 0 0 1 37 27 V36 L40.5 41 H15.5 L19 36 Z" />
          <path d="M26 16 a2 2 0 0 1 4 0" />
          <circle cx="28" cy="45.5" r="2" fill={g} stroke="none" />
          <line x1="20" y1="50" x2="36" y2="50" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Document under a lens, gilt glint. */}
          <path d="M14 8 H32 L38 14 V38 H14 Z" />
          <path d="M32 8 V14 H38" />
          <line x1="19" y1="20" x2="31" y2="20" />
          <line x1="19" y1="26" x2="27" y2="26" />
          <circle cx="34" cy="36" r="7.5" />
          <line x1="39.5" y1="41.5" x2="46" y2="48" />
          <path d="M30 33 A4.5 4.5 0 0 1 34 31" stroke={g} />
        </svg>
      );
    case "sources":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Globe with meridians — gilt dot on Tanzania. */}
          <circle cx="28" cy="28" r="17" />
          <ellipse cx="28" cy="28" rx="7.5" ry="17" />
          <line x1="11" y1="28" x2="45" y2="28" />
          <path d="M13.5 19.5 Q28 14 42.5 19.5" />
          <path d="M13.5 36.5 Q28 42 42.5 36.5" />
          <circle cx="34" cy="34" r="2.2" fill={g} stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Compass rose, gilt north point. */}
          <circle cx="28" cy="28" r="19" />
          <path d="M28 9 L31 25 L47 28 L31 31 L28 47 L25 31 L9 28 L25 25 Z" />
          <line x1="37" y1="19" x2="40" y2="16" />
          <line x1="37" y1="37" x2="40" y2="40" />
          <line x1="19" y1="37" x2="16" y2="40" />
          <line x1="19" y1="19" x2="16" y2="16" />
          <path d="M28 9 L30.6 24.6 L28 28 L25.4 24.6 Z" fill={g} stroke="none" />
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
