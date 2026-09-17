/**
 * ExposureLine — the house stake beside a money decision, rendered on the SERVER (C5-SPEC rulings 192–196; 03 S6).
 *
 * ⭐ ONE RENDERER FOR EVERY SURFACE. The words and the per-surface clauses come from `@/lib/house-bot/exposure-copy`; this
 * file only paints them: body-small muted text, each side word in its side's colour, each "SIDE TZS x" group kept on one
 * line so the sentence wraps between groups at 360 and never inside one, sentence case, and nothing truncated or clamped.
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

const Dot = () => <span className="text-border"> · </span>;

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
  /** Spacing from the caller's layout only (a margin); the type, colour and wrapping are this component's. */
  className?: string;
}) {
  const parts = exposureParts(read, { surface, viewerId, productLine, money: formatTzs });
  if (!parts) return null;
  const qualifier = exposureQualifier(surface);
  return (
    <p data-exposure={surface} className={className ? `text-body-sm text-text-muted ${className}` : "text-body-sm text-text-muted"}>
      {parts.label}
      {parts.groups.map((g, i) => (
        <Fragment key={g.side}>
          {i === 0 ? " " : <Dot />}
          <span className="whitespace-nowrap">
            <span className={g.side === "YES" ? "text-yes-300" : "text-no-300"}>{g.sideWord}</span> {g.amountText}
          </span>
        </Fragment>
      ))}
      {parts.staffClause ? <><Dot /><span className="whitespace-nowrap">{parts.staffClause}</span></> : null}
      {parts.viewerClause ? <><Dot /><span className="whitespace-nowrap">{parts.viewerClause}</span></> : null}
      {qualifier ? <><Dot /><span className="whitespace-nowrap">{qualifier}</span></> : null}
    </p>
  );
}
