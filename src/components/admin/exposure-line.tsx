/**
 * ExposureLine — the house stake beside a money decision, rendered on the SERVER (C5-SPEC rulings 192–196; 03 S6).
 *
 * ⭐ ONE RENDERER FOR EVERY SURFACE. The words and the per-surface clauses come from `@/lib/house-bot/exposure-copy`; this
 * file only paints them: body-small muted text in the body face that wraps (a table cell's mono face or nowrap is not inherited),
 * each side word in its side's colour, each "SIDE TZS x" group kept on one line so the sentence wraps between groups at 360
 * and never inside one, every shilling figure inside a clause kept whole, sentence case, and nothing truncated or clamped.
 *
 * ⛔ SERVER ONLY, AND ONLY A SERVER PAGE IMPORTS IT. No client directive, no hook, no handler. A decision control that sits
 * in a client component receives what this renders through a neutral `exposureSlot` prop from its server page, so no
 * client module ever holds a house word, a house identifier or an officer id (owner ruling D19; ruling 174).
 * ⛔ DISPLAY ONLY. It returns nothing for a market with no house stake, and nothing it renders may decide whether a control
 * is shown, locked or enabled (TGT-38, ruling 191).
 */
import { Fragment } from "react";
import { exposureParts, exposureQualifier, type ExposureRead, type ExposureSurface } from "@/lib/house-bot/exposure-copy";
import type { LabelProductLine } from "@/lib/side-label";
import { formatTzs } from "@/lib/utils";

/** The separator between clauses, in the subtle ink its neighbours use; the space before it cannot break, so a wrapped line never starts with it. */
const Dot = () => <span className="text-text-subtle">&nbsp;· </span>;

/** "— couldn't read" held on one line, so the dash never hangs at a line's end with its words below. */
const UNREAD_TAIL = /(— .*)$/;

/** A shilling figure as `formatTzs` writes it ("TZS 9,000", "TZS −9,000"): the part of a clause that must never break. */
const MONEY = /(TZS\s\S+)/;

/** A clause whose words may wrap, with each figure in it held on one line. */
function Clause({ text }: { text: string }) {
  return <>{text.split(MONEY).map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : part))}</>;
}

export function ExposureLine({
  surface,
  read,
  viewerId,
  productLine = "MARKET",
  className,
}: {
  /** Where the line renders — decides the clauses it carries (`EXPOSURE_SURFACES`). */
  surface: ExposureSurface;
  /** This market's part of the page's one read: the figures, "unread" when the read threw, or null. */
  read: ExposureRead | undefined;
  /** The signed-in officer, for "of which chosen by you" on the surfaces that carry it. */
  viewerId?: string | null;
  productLine?: LabelProductLine;
  /** Spacing and width from the caller's layout only (a margin, a table cell's measure); type, colour and wrapping are this component's. */
  className?: string;
}) {
  const parts = exposureParts(read, { surface, viewerId, productLine, money: formatTzs });
  if (!parts) return null;
  const qualifier = exposureQualifier(surface);
  return (
    <p data-exposure={surface} className={className ? `font-sans text-body-sm text-text-muted whitespace-normal ${className}` : "font-sans text-body-sm text-text-muted whitespace-normal"}>
      {parts.unread ? parts.label.split(UNREAD_TAIL).map((part, i) => (i === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : part)) : parts.label}
      {parts.groups.map((g, i) => (
        <Fragment key={g.side}>
          {i === 0 ? " " : <Dot />}
          <span className="whitespace-nowrap">
            <span className={g.side === "YES" ? "text-yes-300" : "text-no-300"}>{g.sideWord}</span> {g.amountText}
          </span>
        </Fragment>
      ))}
      {parts.staffClause ? <><Dot /><Clause text={parts.staffClause} /></> : null}
      {parts.viewerClause ? <><Dot /><Clause text={parts.viewerClause} /></> : null}
      {qualifier ? <><Dot /><Clause text={qualifier} /></> : null}
    </p>
  );
}
