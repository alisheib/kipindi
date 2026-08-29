import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconPlate } from "@/components/ui/icon-plate";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * Player-facing views for the non-ACTIVE proposals states. Presentational only
 * (no hooks) so they render inside the server page trees; every string is passed
 * in already-localized. The aesthetic split is the whole point:
 *   COMING_SOON → gilt  (aspirational — it's on its way)
 *   MAINTENANCE → amber `--warning` (temporary — back shortly, never NO-rose)
 *   DISABLED    → muted neutral (honest "not available", guided elsewhere)
 *
 * ⭐ CONSOLIDATION (stage 9b, 2026-08-21). This file's header used to claim the
 * local `toneFor()` table was "the only place the two live states' colours are
 * chosen". It was not — it was a THIRD amber. "Temporarily unavailable" was
 * painted in three: maintenance-badge 16%/42%, this file 14%/38%, and
 * `Callout`'s warning tokens 18%/36%. `toneFor` is DELETED and both live states
 * now name a `<Callout>` tone, so the amber has exactly one definition site
 * (`MAINTENANCE_AMBER` in callout.tsx → `--warning-*` in globals.css).
 * ⚠️ That is a rendered change on MAINTENANCE only: fill 14% → 18%, edge
 * 38% → 36%. It matches the move `MaintenanceBadge` already made and exists so a
 * third value can never be reintroduced. COMING_SOON's gilt is unchanged — its
 * 10%/30% pair is byte-identical to the kit's `gold` panel.
 */

/**
 * Inline board banner — sits at the top of the (read-only) proposals board when
 * the feature is COMING_SOON or MAINTENANCE. Renders nothing for ACTIVE/DISABLED
 * (ACTIVE has no banner; DISABLED renders its own full page instead).
 *
 * ⚠️ TITLE + BODY ARE CHILDREN, NOT `title`, AND THAT IS DELIBERATE. This banner's
 * lead line is 13px bold in the BODY face; `Callout`'s `md` title rung is 13.5px
 * semibold in `font-display`. Passing `title` would swap the typeface on a live
 * player surface, which is a design decision and not a refactor's to take — so the
 * box, the tone, the glyph and the role come from the primitive and the two lines
 * keep the metrics they ship with today. `leading-normal` on the title restates the
 * 1.5 it used to inherit from `body`, since inside the Callout it would otherwise
 * inherit the `md` rung's `leading-snug`.
 */
export function ProposalsStateBanner({
  state,
  title,
  body,
}: {
  state: ProposalsState;
  title: string;
  body: string;
}) {
  if (state !== "COMING_SOON" && state !== "MAINTENANCE") return null;
  const comingSoon = state === "COMING_SOON";
  return (
    <Callout
      role="status"
      size="md"
      surface="panel"
      tone={comingSoon ? "gold" : "maintenance"}
      glyph={comingSoon ? "clock" : "pause"}
      /* The banner's box is a uniform 14px inset; the `md` rung is 20px/14px. */
      className="p-3.5"
    >
      <p className="text-[13px] font-bold leading-normal text-text">{title}</p>
      <p className="mt-1 text-body-sm leading-relaxed text-text-muted">{body}</p>
    </Callout>
  );
}

/**
 * Blocked composer — replaces the create form on /proposals/new when the feature
 * is COMING_SOON or MAINTENANCE. Guides the player (state badge + icon + reason)
 * and always offers a live way forward (back to the board). Never a dead end.
 *
 * ⭐ This IS `<Callout layout="stack" surface="panel">`, to the pixel — the plate at
 * 56px/`rounded-control` over `bg-base 55%`, the `mt-3.5` badge, the `mt-3` 18px
 * display title, the `mt-2 max-w-[42ch]` body and the `mt-5` action are the stack
 * rung's own metrics, because the rung was written FROM this shape. The only
 * rendered difference is the MAINTENANCE amber described in the header; the only
 * other change is that the box now announces itself as `role="note"`.
 */
export function ProposalsBlockedComposer({
  state,
  title,
  body,
  comingSoonLabel,
  maintenanceLabel,
  backHref,
  backLabel,
}: {
  state: ProposalsState;
  title: string;
  body: string;
  comingSoonLabel: string;
  maintenanceLabel: string;
  backHref: string;
  backLabel: string;
}) {
  const comingSoon = state === "COMING_SOON";
  return (
    <Callout
      layout="stack"
      surface="panel"
      titleAs="h2"
      tone={comingSoon ? "gold" : "maintenance"}
      glyph={comingSoon ? "clock" : "pause"}
      title={title}
      badge={<ProposalsStateBadge state={state} comingSoonLabel={comingSoonLabel} maintenanceLabel={maintenanceLabel} />}
      action={
        <Link href={backHref as never}>
          <Button variant="ghost" size="md" leading={<I.chevronLeft s={15} />}>{backLabel}</Button>
        </Link>
      }
    >
      {body}
    </Callout>
  );
}

/**
 * Unavailable board — the whole /proposals surface when the feature is DISABLED.
 * Honest, guided, and never a 404: the entry points are removed from the app, so
 * a player who reached here by a direct link gets a clear message + a live way on
 * (browse markets). Deep links to /proposals/* are redirected here.
 *
 * ⛔ NOT MIGRATED TO `<Callout layout="stack">`, AND HELD HERE ON PURPOSE (stage 9b).
 * Its sibling above IS the stack rung to the pixel; this one is not, and no prop on
 * the primitive reproduces the five places it differs:
 *   • box      `px-6 py-12` (32/128) vs the rung's `p-6 sm:p-8` (32 → 48)
 *   • title    `mt-4` 19px          vs `mt-3` 18px
 *   • body     `max-w-[38ch]`       vs `max-w-[42ch]`
 *   • plate fill   `var(--bg-overlay)` (opaque) vs `bg-base 55%` (composited)
 *   • plate edge   `var(--border)`  vs the tint's `currentColor` (= `--text-subtle`)
 * Folding it in would repaint a live player page, which is a design decision and not
 * a refactor's to take. It is named here so the next session does not have to
 * rediscover the list; the box/edge/`border-dashed` treatment ALREADY matches the
 * `neutral` tone exactly, so the decision is only about the five metrics above.
 * ⭐ What DID move: the plate is now `<IconPlate>` rather than a ninth hand-typed
 * `grid h-14 w-14 … rounded-[…]` — pixel-identical, because 56px on the family
 * radius is exactly what that primitive renders by default.
 */
export function ProposalsUnavailable({
  title,
  body,
  browseHref,
  browseLabel,
}: {
  title: string;
  body: string;
  browseHref: string;
  browseLabel: string;
}) {
  return (
    <div className="mx-auto flex max-w-[440px] flex-col items-center rounded-card border border-dashed border-border bg-bg-elevated/40 px-6 py-12 text-center">
      <IconPlate size={56} bg="var(--bg-overlay)" border="1px solid var(--border)" className="text-text-subtle" aria-hidden>
        <I.info s={26} />
      </IconPlate>
      {/* 🔴 DG-P-03 — `<p>`, NOT `<h1>`: THIS CARD IS RENDERED INSIDE A PAGE THAT ALREADY HAS ONE.
          `proposals/page.tsx`'s DISABLED early-return renders an `sr-only` h1 and then this
          component, so the page shipped TWO h1s — the same defect as its ACTIVE branch, one
          level further away and therefore missed by a census that only looks WITHIN a file.
          ⛔ That is the lesson worth keeping: a page's h1 count is not a property of the page's
          own source. It is the page PLUS every component it renders, and a scanner that stops
          at the file boundary is one level too shallow.
          ⭐ `<p>` is the kit's own answer for an empty-state title — `ui/empty-state.tsx:53`
          renders `<p className="font-display …">` for exactly this shape — so this adopts a
          precedent rather than inventing one. The class list is untouched; nothing moves. */}
      <p className="mt-4 font-display text-[19px] font-bold leading-snug text-text">{title}</p>
      <p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-text-muted">{body}</p>
      <Link href={browseHref as never} className="mt-5">
        <Button variant="primary" size="md" trailing={<I.arrowRight s={15} />}>{browseLabel}</Button>
      </Link>
    </div>
  );
}
