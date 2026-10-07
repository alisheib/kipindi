import { SkBar } from "@/components/admin/admin-skeletons";
import { COMPOSE_CONFIRM_HONESTY } from "./composer-copy";

/**
 * U40b · THE CONFIRM CARD'S BOXES — one set for the card (`campaign-confirm.tsx`) and the route's ghost (`loading.tsx`).
 *
 * ⭐ SERVER-SAFE, DELIBERATELY (no "use client", no hooks): the route's ghost draws it on the server, so the ghost never waits
 * on the card's client chunk (the dialog, the toasts and the actions) — it is up the moment the navigation starts, and a
 * drive that holds the composer's chunks still sees it. The card, a client component, imports the same boxes.
 * ⭐ ONE HEIGHT AT REST: the line under the trigger is ONE grid cell holding an invisible copy of the honesty line and
 * whatever the card says there — the honesty line, a reason or the confirmed line — so the box is as tall as the honesty
 * line at every width, and the ghost (the same box, a bar in it) is the card's height. A reason LONGER than the honesty
 * line (a long audience problem) grows the card — said, not hidden. `qa:marketing-confirm` asserts the two heights at
 * 1280 and 360 (within 2px), for a new composer and a saved draft.
 */

/** The line under the trigger: one grid cell for the sizer and what the card says. */
export const CONFIRM_LINE_BOX = "grid";
export const CONFIRM_LINE_CELL = "col-start-1 row-start-1 text-body-sm";

/** The box's sizer: the honesty line, laid out and never seen. */
export function ConfirmLineSizer() {
  return <p aria-hidden className={`invisible ${CONFIRM_LINE_CELL}`}>{COMPOSE_CONFIRM_HONESTY}</p>;
}

/** ⭐ THE CARD'S GHOST — the trigger's box (a `btn-md`, 44px) and the line's box, sized by the same invisible honesty line,
 *  so the swap does not move the card. */
export function ConfirmCardGhost() {
  return (
    <div className="space-y-2" aria-hidden data-confirm-card="loading">
      <SkBar className="h-[44px] w-[176px]" />
      <div className={CONFIRM_LINE_BOX}>
        <ConfirmLineSizer />
        <SkBar className={`${CONFIRM_LINE_CELL} h-[18px] w-full`} />
      </div>
    </div>
  );
}
