"use client";

/**
 * FilterSheet — the phone-width home for the /markets filters (kit
 * `05-markets-discovery-mobile.html`, PLAN-OF-RECORD §8.8, batch 6).
 *
 * ⭐ WHY IT EXISTS. Batch 1 chose horizontally-scrolling strips because they need no
 * JavaScript, and §8.7c then spent 104px of sticky height making every control readable and
 * operable. That was the right trade for a defect fix and the wrong end state: measured at
 * 360×780, the bar was eating **~214px before a single market was visible**. The kit's own
 * answer puts every filter behind ONE button and takes the bar back under 120px.
 *
 * ⭐ BUILT ON `<details>`, AND THAT IS NOT A STYLE CHOICE. The board is a server component and
 * every option inside is a real `<Link>`, so the control's MARKUP needs no JavaScript: the
 * disclosure opens natively and each option navigates natively. The client code below is pure
 * enhancement — Escape, the focus trap, focus return, the scroll lock — and the sheet is
 * operable without any of it.
 *
 * 🔴 THE PAGE AROUND IT IS A DIFFERENT MATTER, AND THE CLAIM THIS FILE INHERITED WAS FALSE.
 * `discovery-bar.tsx` and `menu-shell.tsx` have said since batch 1 that "the board still works
 * with no JavaScript" — it was the stated reason batch 1 chose scrolling strips OVER this sheet.
 * Measured 2026-08-15 with scripts disabled, on **production** as well as locally: `/markets`
 * streams its board through a Suspense boundary, and React only relocates streamed content out
 * of its hidden holder with an inline `<script>`. With scripts off that never runs, so
 * `.kp-discovery-bar` measures **0px inside a `display: none` `div#S:3`** and the cards sit in
 * `<template>` elements. Nothing on the board is reachable — the strips no more than this sheet.
 * ⛔ So this sheet costs nothing that was not already gone, and the premise of batch 1's trade
 * did not hold. `qa:discovery-board` asserts the markup is native and PRINTS what a scripts-off
 * browser actually sees, so the claim cannot go quiet again.
 *
 * ⛔ THE `<details>` IS UNCONTROLLED ON PURPOSE. React never writes the `open` attribute — it
 * only listens to `toggle`. Controlling it would (a) put the no-JS path behind hydration and
 * (b) slam the sheet shut on every filter press, because each option is a real navigation and
 * the re-render would re-assert React's idea of `open`. Leaving the attribute to the browser
 * is what keeps the sheet open while a player sets three filters in a row.
 *
 * ⛔ NEVER NEST A `<details>` INSIDE THIS ONE. §8.7c: a sheet that scrolls clips an
 * absolutely-positioned panel, and a 362px topic menu was clipped to **4px — 1%, zero of eight
 * topics reachable** — while every automated check passed and the closed control photographed
 * perfectly. Sort and topic render as FLAT LISTS in here for exactly that reason.
 * ⛔ AND NOTHING IN HERE MAY BE RE-PARENTED INTO `.kp-thin-scroll` / `.kp-strip-fade`: a
 * `mask-image` clips an absolutely-positioned child exactly as `overflow` does.
 *
 * ─── The behaviour contract, taken from the SHIPPED `<Modal>` (src/components/ui/modal.tsx),
 * not from the kit's spec drawing ───────────────────────────────────────────────────────────
 * Escape closes · focus is trapped while open · focus RETURNS to the trigger on close · the
 * body is scroll/zoom locked (`useModalLock`, the same hook) · the scrim is inert and closes.
 *
 * ⚠️ WHY THIS IS NOT LITERALLY `<Modal sheet>`, which already implements all five. `Modal` is
 * a portal mounted from React state: correct, and it does not exist until JavaScript runs. The
 * sheet must open without it. So the CONTRACT is reused and the mechanism is not, and the two
 * are held together by `test:filter-language` §5 rather than by a comment asking politely.
 *
 * 🔴 AND THE ONE BUG THE MODAL PAID FOR IS REPRODUCED HERE AS A FIX, NOT AS AN OVERSIGHT.
 * `Modal`'s focus effect once depended on `[open, onClose, initialFocus]`; every caller passed
 * a fresh inline arrow, so the effect tore down and re-ran on EVERY render, dragging focus onto
 * the primary button — once a second on the bet-confirm dialog, whose countdown ticks. A
 * keyboard user who tabbed to Cancel had focus pulled onto Confirm inside the second, on a
 * money dialog. The effect below therefore depends on `[open]` and nothing else, and the
 * callback is held in a ref.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";

/** The same list `Modal` traps against — kept identical so the two cannot drift apart. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function FilterSheet({
  label,
  title,
  ariaLabel,
  closeLabel,
  applyLabel,
  count,
  children,
  footer,
}: {
  /** The trigger's visible word — "Filters". */
  label: string;
  /** The sheet's own heading. It labels the dialog through `aria-labelledby`. */
  title: string;
  /** Accessible name for the trigger, which carries a count a sighted user reads as a badge. */
  ariaLabel: string;
  closeLabel: string;
  /** "Show 40 markets" — dismisses; the filters are already applied (every option navigates). */
  applyLabel: string;
  /** Non-default axes INSIDE this sheet. 0 renders no badge — never a `0` chip. */
  count: number;
  children: React.ReactNode;
  /** `Clear all`, when the board is narrowed. Rendered beside the apply button. */
  footer?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDetailsElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const titleId = React.useId();

  useModalLock(open);

  const close = React.useCallback(() => {
    const el = ref.current;
    if (!el?.open) return;
    el.removeAttribute("open");
    // `toggle` fires asynchronously, and the focus-return cleanup below reads `open`. Setting
    // it here keeps the two in step even if the event is coalesced away by a fast re-render.
    setOpen(false);
  }, []);
  const closeRef = React.useRef(close);
  React.useEffect(() => { closeRef.current = close; }, [close]);

  /**
   * ⚠️ `[open]` IS THE ONLY DEPENDENCY. See the header — this is the shape of the defect that
   * dragged focus onto a money dialog's confirm button once a second.
   */
  React.useEffect(() => {
    if (!open) return;
    // Captured at open, not read at cleanup: by then the DOM may have moved on. This is the
    // element that actually had focus when the sheet opened — the trigger, for a keyboard user.
    const restoreTo = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    /* Two things in `globals.css` key off this, and BOTH are load-bearing:
       · the bar is z-20 and the bottom nav z-40, so the bar is lifted to the dialog rung;
       · 🔴 `.route-enter` retains a `both`-filled transform, which makes it the containing block
         for `position: fixed` — measured, this put the panel at `top: -32px` with its bottom
         172px clear of the window. Its animation is dropped while the sheet is open.
       ⛔ ONE ATTRIBUTE, ON THE ROOT, because the two rules apply to elements at different depths
       and a per-element flag would need the component to know the page's structure.
       ⚠️ It is the FALLBACK, not the mechanism: `:has()` does both with no JavaScript, which is
       the whole point of a `<details>` sheet. This only covers a browser without `:has()`. */
    document.documentElement.setAttribute("data-sheet-open", "");

    const timer = setTimeout(() => {
      (focusables()[0] ?? panelRef.current)?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.documentElement.removeAttribute("data-sheet-open");
      // Guard: the trigger may have unmounted under a navigation.
      restoreTo?.focus?.();
    };
  }, [open]);

  return (
    <details
      ref={ref}
      /* ⛔ NOT `kp-menu`. That class names the two sort/topic disclosures on the desktop row,
         and `qa:discovery-board` asserts there are EXACTLY TWO of them under the bar. A sheet
         wearing the same class would read as a third menu and fail a guard that is right. */
      className="kp-fsheet lg:hidden"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        aria-label={ariaLabel}
        /* Wears the selected language when filters are on — `.kp-fsheet-trigger[data-on]` in
           globals.css, the same `--pill-active` + halo a selected pill uses. At this width it
           IS those pills, so it must read as they do. */
        data-on={count > 0 || undefined}
        className="kp-fsheet-trigger inline-flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-pill border border-border-control bg-bg-inset px-3.5 text-[13px] font-semibold text-text-muted hover:text-text"
      >
        <I.sliders s={15} aria-hidden className="shrink-0 opacity-80" />
        {label}
        {/* ⛔ Rendered only when something is on. A badge reading `0` is a control announcing
            its own irrelevance, and it would sit there on the default board for ever. */}
        {count > 0 && (
          <span aria-hidden className="kp-fsheet-badge font-mono text-[11px] font-bold tabular-nums">
            {count}
          </span>
        )}
      </summary>

      {/* The scrim — byte-for-byte the shared `<Modal>`'s: an inert click target that is never
          focusable (so the trap above cannot land on it), carrying `.m-scrim` and the SAME
          `bg-black/60`. ⛔ The wash is a utility here rather than a rule in `globals.css`
          precisely so there is ONE definition of "a dialog's scrim" in the product instead of
          two that can drift; `.kp-fsheet-scrim` owns geometry only. */}
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={close}
        className="m-scrim kp-fsheet-scrim bg-black/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        /* ⭐ RUNG 3 — "sheet with a scrim" is already defined in the elevation ladder, so this
           PICKS the rung rather than composing one: `.mat-modal` carries the wash, the border
           and `--elev-modal` together, and `.m-sheet-in` is the kit keyframe the shared
           `<Modal sheet>` rises on. ⛔ No new material and no new motion vocabulary here.
           `data-rung` is the adoption ledger — it lets the set of rung-adopting surfaces be
           ENUMERATED rather than grepped for whichever class the merge is using this week. */
        data-rung="modal"
        className="m-sheet-in mat-modal kp-fsheet-panel"
      >
        <span aria-hidden className="kp-fsheet-grab" />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-[16px] font-bold leading-tight text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            /* ⚠️ 48px AS AN ARBITRARY LITERAL — the ONE close-✕ size in the kit
               (modal.tsx, toast.tsx and bet-confirm-modal.tsx all render 48×48).
               This said `h-9 w-9`, which is 64×64px on the OVERRIDDEN spacing
               scale (tailwind.config.ts:200-215), so the product's close
               affordance shipped in two sizes. ⛔ Never a scale token here. */
            className="-mr-1 -mt-1 inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-bg-overlay hover:text-text"
          >
            <I.x s={16} />
          </button>
        </div>

        <div className="kp-fsheet-body">{children}</div>

        <div className="kp-fsheet-foot">
          {footer}
          {/* Every option in here has ALREADY applied — each is a real link that navigates with
              `replace scroll={false}`. So this button commits nothing; it dismisses. It says
              what the board now holds so the number a player leaves with is the number they
              arrive at, and it is the SAME variable the bar's count and the pager total read. */}
          <Button type="button" onClick={close} variant="primary" size="md" className="flex-1 justify-center">
            {applyLabel}
          </Button>
        </div>
      </div>
    </details>
  );
}

/**
 * One labelled group inside the sheet. The kit's `.sheetgrp` — a quiet mono key over a flat
 * row of controls. ⛔ The key is a `<span>`, not a heading: the sheet already has one `<h2>`,
 * and four `<h3>`s under it would announce a document structure this is not.
 */
export function FilterSheetGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={label} className="kp-fsheet-grp">
      <span className="kp-fsheet-key font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </span>
      <div className={className ?? "flex flex-wrap items-center gap-1.5"}>{children}</div>
    </section>
  );
}
