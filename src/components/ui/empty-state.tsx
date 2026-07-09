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

type Kind =
  | "markets" | "positions" | "leaderboard" | "notifications" | "audit" | "sources"
  | "proposals" | "kyc" | "fairness" | "rg" | "admin" | "default";

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
        "rounded-xl border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center max-w-[360px] mx-auto",
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
          {/* Tilted scales weighing a YES/NO pip pair — the tipping metaphor;
              gilt pivot diamond. Left pan holds a filled YES pip, right pan a
              hollow NO ring, so the pair reads without relying on colour. */}
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
          {/* YES pip (filled) in the left pan · NO pip (hollow) in the right pan */}
          <circle cx="13" cy="28.5" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="43" cy="20.5" r="2.1" />
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
    case "proposals":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Ballot box receiving a folded paper + quill — "propose & earn";
              gilt nib. */}
          <path d="M11 30 L15 24 H41 L45 30" />
          <rect x="11" y="30" width="34" height="17" rx="3" />
          <line x1="24" y1="27.5" x2="32" y2="27.5" />
          <path d="M22 24 V13 H33 L38 18 V24" />
          <line x1="26" y1="17" x2="34" y2="17" />
          <line x1="26" y1="20.5" x2="31" y2="20.5" />
          <line x1="43" y1="9" x2="33" y2="21" />
          <path d="M33 21 L31.5 25 L35 23.5 Z" fill={g} stroke="none" />
        </svg>
      );
    case "kyc":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* ID card above a progress rail — two steps done, one live (gilt),
              one to go. */}
          <rect x="13" y="13" width="30" height="19" rx="3" />
          <circle cx="21" cy="21" r="3" />
          <path d="M17 27.5 a4 4 0 0 1 8 0" />
          <line x1="30" y1="19" x2="38" y2="19" />
          <line x1="30" y1="23.5" x2="36" y2="23.5" />
          <line x1="13" y1="43" x2="43" y2="43" />
          <circle cx="17" cy="43" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="27" cy="43" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="37" cy="43" r="2.6" fill={g} stroke="none" />
          <circle cx="45" cy="43" r="2.4" />
        </svg>
      );
    case "fairness":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Provably-fair chain: commit → reveal → attest (gilt node + check). */}
          <circle cx="15" cy="30" r="7" />
          <circle cx="28" cy="30" r="7" />
          <circle cx="41" cy="30" r="7" />
          <line x1="22.5" y1="30" x2="21" y2="30" />
          <line x1="35" y1="30" x2="33.5" y2="30" />
          <path d="M25 30 l2 2 l4-4.5" />
          <line x1="28" y1="19" x2="28" y2="15" />
          <circle cx="41" cy="30" r="2.4" fill={g} stroke="none" />
        </svg>
      );
    case "rg":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Calm sunrise over a horizon — self-care, never gambling imagery;
              gilt sun core. */}
          <line x1="10" y1="40" x2="46" y2="40" />
          <path d="M19 40 a9 9 0 0 1 18 0" />
          <line x1="28" y1="18" x2="28" y2="13" />
          <line x1="14.5" y1="25.5" x2="11" y2="22" />
          <line x1="41.5" y1="25.5" x2="45" y2="22" />
          <line x1="12" y1="40" x2="7" y2="40" />
          <line x1="44" y1="40" x2="49" y2="40" />
          <circle cx="28" cy="40" r="2.4" fill={g} stroke="none" />
        </svg>
      );
    case "admin":
      return (
        <svg viewBox="0 0 56 56" {...s} width="56" height="56">
          {/* Clipboard under a lens — a generic admin console at rest;
              gilt glint. */}
          <rect x="14" y="12" width="24" height="32" rx="3" />
          <rect x="22" y="9" width="8" height="6" rx="2" />
          <line x1="19" y1="22" x2="33" y2="22" />
          <line x1="19" y1="28" x2="33" y2="28" />
          <line x1="19" y1="34" x2="27" y2="34" />
          <circle cx="37" cy="37" r="7" />
          <line x1="42" y1="42" x2="47" y2="47" />
          <path d="M33.5 34 A4 4 0 0 1 37 32" stroke={g} />
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
