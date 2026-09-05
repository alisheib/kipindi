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
/* ⛔ ONE definition of the exit beat, and of the three reduced-motion gates behind it. */
import { exitBeatMs } from "@/components/ui/modal";

/** The same list `Modal` traps against — kept identical so the two cannot drift apart. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function FilterSheet({
  label,
  value,
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
  /**
   * ⭐ THE ACTIVE SELECTION, WHEN THE HOST HAS ONE — and passing it switches the trigger from
   * the hug PILL to the full-width FIELD. Measured complaint, /updown at 390 (2026-09-05):
   * players did not realise the control was a control. The pill read `⚙ Bitcoin · 5 min`,
   * which is a *caption* — and the board directly beneath it says "Bitcoin Up & Down / 5 MIN"
   * and the tape above it says "BITCOIN $79,811.94", so a bordered pill carrying the same two
   * words is read as a third label rather than as the thing that changes them.
   *
   * ⭐ THE FIX IS AFFORDANCE, NOT COPY. Naming the selection is right and stays (it is what
   * `test:updown-filter-sheet` §2 exists to protect). What was missing is every signal that
   * says "this opens": a caret, a field shape, and a quiet KEY naming the axis so the value
   * reads as a value. `label` becomes the key, `value` the answer.
   *
   * ⛔ OPTIONAL, so `/markets` — whose trigger is the word "Filters" plus a count badge, in a
   * row beside other controls — keeps the hug pill it needs. One component, two shapes, and
   * the caret is added to BOTH: the desktop sort/topic menus have always had one and this
   * control never did.
   */
  value?: string;
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

  /**
   * 🔴 UD-13e (2026-09-05) · THE SHEET ROSE AND THEN VANISHED. It arrives on `.m-sheet-in`
   * (`m-sheet-rise`, `--t-move`, `--m-settle`) and left by having its `display` set to `none`
   * in the same frame the attribute was removed — no exit at all, on the one dialog a phone
   * player uses most. The shared `<Modal>` this component copies its CONTRACT from has had a
   * real exit for months (`useExitPhase` + `.m-out`); only the exit was never copied.
   *
   * ⛔ AND IT CANNOT USE `useExitPhase`, which is why this is written out. That hook gates a
   * RENDER on `present`; this `<details>` is uncontrolled on purpose — React never writes
   * `open` — so the attribute itself has to be held for one beat.
   * ⭐ The beat comes from `exitBeatMs`, the shared function, so the three reduced-motion gates
   * are decided once. When it returns 0 the close is instant, which is the correct behaviour
   * for someone who asked for no motion — an exit that still runs then is worse than none,
   * because it DELAYS the dismissal.
   */
  const closingTimer = React.useRef<number | null>(null);
  const close = React.useCallback(() => {
    const el = ref.current;
    if (!el?.open || el.hasAttribute("data-closing")) return;
    // `toggle` fires asynchronously, and the focus-return cleanup below reads `open`. Setting
    // it here keeps the two in step even if the event is coalesced away by a fast re-render.
    const finish = () => {
      closingTimer.current = null;
      el.removeAttribute("data-closing");
      el.removeAttribute("open");
      setOpen(false);
    };
    const ms = exitBeatMs("--t-quick");
    if (ms <= 0) { finish(); return; }
    el.setAttribute("data-closing", "");
    closingTimer.current = window.setTimeout(finish, ms);
  }, []);

  /** ⚠️ Re-opening mid-exit must CANCEL the hold, or the pending timeout closes the sheet the
   *  player has just re-opened — `useExitPhase`'s "rising edge cancels any hold", by hand. */
  const cancelClosing = React.useCallback(() => {
    if (closingTimer.current == null) return;
    clearTimeout(closingTimer.current);
    closingTimer.current = null;
    ref.current?.removeAttribute("data-closing");
  }, []);
  React.useEffect(() => () => { if (closingTimer.current != null) clearTimeout(closingTimer.current); }, []);

  /**
   * 🔴 E-288 · THE SHEET IS HIDDEN BY A MEDIA QUERY, AND REACT'S `open` DID NOT KNOW.
   * Each host hides this control at its OWN breakpoint — `/updown` wraps it in `sm:hidden`,
   * `/markets` relies on the `lg:hidden` on the `<details>` itself. Rotating a 390×844 phone to
   * landscape (852×393) crosses BOTH: the whole disclosure is `display: none`, so the panel,
   * the scrim and the trigger all disappear — while React still holds `open === true`, so
   * `useModalLock` keeps `<html>`/`<body>` at `overflow: hidden`.
   * ⛔ THE RESULT IS AN UNSCROLLABLE BOARD WITH NOTHING ON SCREEN TO DISMISS: no scrim to tap,
   * no ✕, and on a phone no keyboard to press Escape. The only way out is to rotate back or
   * reload. Same shape as every other finding in this file — correct markup, correct styling,
   * and a state the player cannot escape.
   *
   * ⚠️ IT ASKS THE DOM, IT DOES NOT HARD-CODE A WIDTH. A `matchMedia("(min-width: 640px)")`
   * here would be right for `/updown` and wrong for `/markets`, and wrong again for the next
   * host. "Am I still rendered?" is the question that actually matters, and it is the same
   * question at every breakpoint.
   * ⛔ It closes SYNCHRONOUSLY rather than through `close()`: there is nothing on screen left
   * to animate, and the scroll lock must lift in the same frame the control vanishes.
   */
  React.useEffect(() => {
    if (!open) return;
    const onViewportChange = () => {
      const el = ref.current;
      /* ⛔ `getClientRects()`, NOT `getComputedStyle(el).display`. The first version of this
         effect asked the ELEMENT for its own display and never fired, because `/updown` hides
         the sheet by putting `sm:hidden` on the WRAPPER — and `display: none` on an ancestor
         does not change the child's computed display, which stays `block`. Measured live at
         852×393: `detailsDisplay: "block"`, `open: true`, `htmlOverflow: "hidden"` — the lock
         was still on. An element hidden by any ancestor has NO layout boxes, so this is the
         one question that is true for both spellings of "hidden".
         ⚠️ The check that exposed it also lied: `window.scrollTo()` still moves the page under
         `overflow: hidden`, so a scroll test "passed" over a locked document. The honest
         assertion is the lock itself. */
      if (!el || el.getClientRects().length > 0) return;
      if (closingTimer.current != null) { clearTimeout(closingTimer.current); closingTimer.current = null; }
      el.removeAttribute("data-closing");
      el.removeAttribute("open");
      setOpen(false);
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, [open]);

  /**
   * ⚠️ E-289 · AND THE STATE MUST BE SYNCED FROM THE DOM ON MOUNT, because the `<details>` can
   * be opened BEFORE React attaches. That is not a hypothetical — it is the whole point of the
   * no-JS design: the disclosure works natively. On a slow phone a player who taps the trigger
   * during hydration got a sheet that looked right and had no scroll lock, no Escape, no focus
   * trap and no focus move, because `open` had never been anything but `false`.
   * ⛔ Deliberately not `defaultValue`-style init: the attribute is the browser's to own, so
   * this reads it once on mount rather than trying to control it.
   */
  React.useEffect(() => {
    if (ref.current?.open) setOpen(true);
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
        /* ⛔ THE SHAPE IS AN ATTRIBUTE, NOT A CLASS STRING AT THE CALL SITE (law 82). The two
           variants differ in geometry only, and both live in `.kp-fsheet-trigger*` in
           globals.css so neither can be re-typed slightly differently by the next host. */
        data-shape={value ? "field" : "pill"}
        /* ⚠️ CLOSING VIA THE TRIGGER MUST ALSO PLAY THE EXIT. The browser toggles a
           `<details>` shut in the same frame, which would skip the leave animation on the one
           control a player is most likely to use to dismiss it. Taking the click over only
           when it is ALREADY OPEN leaves the no-JS opening path exactly as it was. */
        onClick={(e) => {
          const el = ref.current;
          if (!el) return;
          if (el.hasAttribute("data-closing")) { e.preventDefault(); cancelClosing(); return; }
          if (el.open) { e.preventDefault(); close(); }
        }}
        className="kp-fsheet-trigger cursor-pointer list-none items-center border border-border-control bg-bg-inset font-semibold text-text-muted hover:text-text"
      >
        <I.sliders s={15} aria-hidden className="shrink-0 opacity-80" />
        {/* In the FIELD shape this is the quiet key over on the left; in the PILL shape it is
            the control's whole visible word. One element, because it is one thing: the name of
            what the control does. */}
        <span className="kp-fsheet-trigger-label">{label}</span>
        {/* ⭐ The answer to "what am I looking at?", at full text strength — the key is muted so
            the VALUE is the loudest thing in the control. `ml-auto` is what pushes it to the
            far side of the field; in the pill shape there is no free space, so it is inert. */}
        {value != null && <span className="kp-fsheet-trigger-value ml-auto">{value}</span>}
        {/* ⛔ Rendered only when something is on. A badge reading `0` is a control announcing
            its own irrelevance, and it would sit there on the default board for ever. */}
        {count > 0 && (
          <span aria-hidden className="kp-fsheet-badge font-mono text-[11px] font-bold tabular-nums">
            {count}
          </span>
        )}
        {/* 🔴 THE MISSING AFFORDANCE. Every other disclosure in the product carries a caret that
            rotates on open — the language menu in the top bar, both desktop sort/topic menus —
            and this one, the only disclosure a phone player ever sees, carried none.
            ⛔ The class is NOT `kp-menu-caret`: `test:filter-language` §5.3 asserts the string
            `kp-menu` never appears in this file, so that the desktop row's two menus stay
            countable by `qa:discovery-board`. The two carets share ONE pair of declarations in
            globals.css (a selector list), so there is no second definition to drift. */}
        <I.chevronDown s={14} aria-hidden className="kp-fsheet-caret shrink-0 opacity-70" />
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
            /* ⚠️ `-mr-3` IS OPTICAL ALIGNMENT, NOT A NUDGE, and it only became correct once the
               panel had real padding. The 48px target holds a 16px glyph, so 16px of the box
               is slack on each side. Pulling the BOX 16px past the 20px content edge puts the
               GLYPH's right edge exactly on that edge — so the ✕ lines up with the 20px gutter
               the heading starts at, instead of floating 24px in. It was `-mr-1` against a
               padding of zero, which is how it came to overflow the viewport by 3px. */
            className="-mr-3 -mt-1 inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-bg-overlay hover:text-text"
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
      <span className="kp-fsheet-key font-mono text-micro font-bold uppercase eyebrow text-text-subtle">
        {label}
      </span>
      {/* ⚠️ 12px, NOT 8. `gap-1.5` is 8px on this repo's overridden scale, and between 44px-tall
          chips it read as one continuous bar rather than as separable choices — the wrapped
          duration row in particular. `gap-2` is 12px here (NOT Tailwind's stock 8px). */}
      <div className={className ?? "flex flex-wrap items-center gap-2"}>{children}</div>
    </section>
  );
}
