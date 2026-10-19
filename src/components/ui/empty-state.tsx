"use client";

/**
 * EmptyState — kit-faithful: 360px (or full-width, via `fill`) boxed, dashed border,
 * a large Phosphor Duotone glyph on the shared empty-state plate. The plate's one
 * metal-gold accent belongs to identity art, never to a money outcome (W6).
 * Title (display 16/600), body (13), optional ghost CTA.
 *
 * The kit explicitly forbids mascots / full-color cartoons.
 *
 * Kinds map to the same glyph as their page:
 *   markets · positions · leaderboard · notifications · audit · sources · default
 */
import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { EMPTY_STATE_BOX, EMPTY_STATE_TITLE, EMPTY_STATE_BODY } from "./empty-state-classes";
import { emptyStateBody, type EmptyStateBody } from "./empty-state-text";
import { keepConnectives } from "./keep-run";
import { hangCjkMarks } from "@/lib/cjk-marks";
import { I, plateGlyph, type DuoGlyphKey } from "./glyphs";
import { IconPlate } from "./icon-plate";

type Kind =
  | "markets" | "positions" | "leaderboard" | "notifications" | "audit" | "sources"
  | "proposals" | "kyc" | "fairness" | "rg" | "admin" | "default";

const EMPTY_GLYPH: Record<Kind, DuoGlyphKey> = {
  markets: "markets", positions: "portfolio", leaderboard: "podium", notifications: "bell",
  audit: "audit", sources: "sources", proposals: "idea", kyc: "idCard",
  fairness: "attestation", rg: "limits", admin: "reports", default: "compass",
};

/**
 * ⭐ A TITLED SECTION SAYS ONCE THAT ITS EMPTY STATE FILLS IT (S8, 2026-10-14) — the call sites stopped having to remember.
 * PV-03 made `fill` opt-in per call site (the ruling on the prop below), and the opt-in is exactly what failed: a pass on
 * 2026-10-14 added `fill` to nine admin call sites, and CI then failed 90 cells on fifteen more admin routes — 78 of them,
 * on thirteen routes, an EmptyState inside a TITLED `AdminCard`, centred 299px from the card title over it at 1280 and
 * 567px at 1920 (the evaluator, `scripts/live/empty-state-alignment.mjs`, pairs an empty state with the title of the card
 * that holds it). The other twelve were table rows in untitled cards — `AdminTableEmpty` answers for those.
 * The section is the one thing that knows it has a title, so it declares the relationship: `AdminCard` mounts this provider
 * around a titled body, and every EmptyState inside it fills. It renders no element, so the DOM is unchanged.
 * ⛔ THE DEFAULT IS STILL BOXED. Outside a section that mounts this, nothing changes (the 45-call-site ruling stands), and a
 * call site's own `fill` — `true` or `false` — always wins over the section's.
 * Same shape as `AdminActProvider` (admin/act-gate.tsx): one boolean every instance needs, set once where it is known.
 */
const SectionFill = createContext(false);

/** Wraps the body of a section that owns a heading; each EmptyState in that body fills it. */
export function EmptyStateSection({ children }: { children: ReactNode }) {
  return <SectionFill.Provider value>{children}</SectionFill.Provider>;
}
export function EmptyState({
  kind = "default",
  title,
  body,
  action,
  fill,
  className,
}: {
  kind?: Kind;
  title: string;
  /** The words, or the words with the runs the caller put into them that must stay whole (a date: `breakSentence`). */
  body?: EmptyStateBody;
  /** Accepted for back-compat; no longer rendered (single-language UI). */
  titleSw?: string;
  bodySw?: string;
  action?: ReactNode;
  /**
   * ⭐ PV-03 (2026-09-03) — THE VARIANT THIS FILE'S OWN HEADER HAS PROMISED SINCE IT WAS
   * WRITTEN ("360px **or full-width** boxed") AND NEVER HAD.
   *
   * The default centres a 360px box with `mx-auto`, which is right inside a narrow column and
   * wrong under a full-width section heading. Measured on `/positions` at 1280: the page
   * correctly declares `tier="reading"` and gets a 1016px container, the headings "Open" and
   * "Settled" sit left at x=132 — and each empty card floated centred at 460–820, **328px
   * away from the heading that names it.** The filed finding called that a narrow *measure*;
   * the measure was never wrong, the alignment was.
   *
   * ⛔ OPT-IN, NEVER A CHANGED DEFAULT. 45 call sites across 33 files inherit `mx-auto`, most
   * of them genuinely inside narrow columns where centring is correct. Flipping the default
   * would silently restyle 44 surfaces to fix one — the opposite of a system-level fix.
   * ⭐ Left unset inside a titled section (`EmptyStateSection`, above), it follows the section and fills.
   */
  fill?: boolean;
  className?: string;
}) {
  // The call site's own word wins, either way; unset, a titled section's declaration decides (boxed outside one).
  const sectionFill = useContext(SectionFill);
  const filled = fill ?? sectionFill;
  const Glyph = I[EMPTY_GLYPH[kind]];
  return (
    <div
      /* ⭐ A CONTRACT FOR THE INSTRUMENTS, exactly like `<PageContainer>`'s `data-measure`.
         `responsive-audit.mjs` asserts an empty state aligns with the heading that introduces
         it; without a stamp it would have to guess at `border-dashed`, and a guard that matches
         a CLASS NAME stops working the day someone restyles the box. The value says which
         variant shipped, so the sweep can report "boxed, 328px from its heading" rather than a
         bare failure. */
      data-empty-state={filled ? "fill" : "boxed"}
      className={cn(
        EMPTY_STATE_BOX,
        filled ? "w-full" : "max-w-[360px] mx-auto",
        className,
      )}
    >
      {/* W6: the kind's own Duotone glyph, on the family's one empty plate. */}
      <div className="mx-auto mb-3 flex justify-center" aria-hidden>
        <IconPlate size={56} variant="empty">
          <Glyph s={plateGlyph(56)} tier="duo" />
        </IconPlate>
      </div>
      {/* ⭐ Both lines are centred, so a Chinese mark that ends one hangs its empty half (`hangCjkMarks`, 2026-10-09,
          round 4, E50: "…显示在这里。" stood 4.5px left of the box's centre on tiles 427 428). Latin text is untouched.
          The body's held runs (its dash, its YES/NO pair, a caller's date) are nowrap spans and its marks hang inside
          `emptyStateBody` — round 5 (H4): nothing is inserted into the words. Round 7 (the owner's item 37): the balanced
          title never ends a line on a connective — each one keeps the space after it (`keepConnectives`, keep-run.tsx). */}
      <p className={cn(EMPTY_STATE_TITLE, "text-text")}>{keepConnectives(title, [], hangCjkMarks)}</p>
      {body && <p className={cn(EMPTY_STATE_BODY, "text-text-subtle")}>{emptyStateBody(body)}</p>}
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
        "rounded-lg border border-dashed border-danger-border bg-danger-500/[0.06] px-6 py-10 text-center max-w-[420px] mx-auto",
        className,
      )}
    >
      {/* A failure is a status: the family's filled circled cross on its danger plate. */}
      <div className="mx-auto mb-4 flex justify-center" aria-hidden>
        <IconPlate size={48} variant="danger">
          <I.xCircle s={plateGlyph(48)} tier="fill" />
        </IconPlate>
      </div>
      <p className="font-display text-[15px] font-semibold text-text">{resolvedTitle}</p>
      {detail && <p className="mt-2 font-mono text-[11px] text-text-subtle">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
