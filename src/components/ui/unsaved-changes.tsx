"use client";

/**
 * UnsavedChangesGuard — DG-S-04 (DESIGN-GATE-2026-08-28 step 5), §K rule 7d.
 *
 * ⭐ Ali's commission read "of course keep applying the unsaved-changes detection per page
 * professionally". ⛔ IT IS A BUILD, NOT A CONTINUATION, and that was re-derived rather than
 * assumed: `grep -rn beforeunload src/` returns ZERO, and the four `dirty` booleans that exist
 * (`payout-status-control.tsx:77`, `proposal-actions.tsx:310`, `updown-controls.tsx:1059`,
 * `password-pair.tsx:22`) only disable their own Save button. Nothing anywhere has ever stopped
 * an operator leaving a half-typed form. §K5: it lands ONCE, in the kit, not per page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔ A FORM HAS THREE EXITS, AND A GUARD THAT COVERS ONE IS NOT A GUARD.
 *
 * ① THE TAB CLOSES or the page reloads → `beforeunload`. The browser owns this dialog; its
 *   text cannot be set (every engine ignores the string and shows its own) and it only fires
 *   after a real user gesture on the page. ⚠️ So it is a backstop, never the primary answer.
 * ② AN IN-APP LINK is followed — including a SECTION-RAIL TAB, which §K rule 7d names
 *   explicitly: "a tab switch is an EXIT. A page whose tabs unmount their panels must treat the
 *   switch as it treats an unload." A `?tab=` option is an `<a href>`, so it is exactly case ②
 *   and needs no separate handling. That is the payoff of DG-S-03 putting tab state in the URL.
 * ③ THE BROWSER BACK BUTTON → `popstate`. ⚠️ NOT COVERED, and it is named here rather than
 *   left for someone to discover: App Router gives no cancellable navigation event, and the
 *   `history.pushState` trick that fakes one corrupts the history stack in ways that are worse
 *   than the problem. ⛔ A guard that silently misses an exit is the shape this programme keeps
 *   paying for, so the miss is written down instead of implied.
 *
 * ⛔ AND THE PROMPT IS THE KIT MODAL, NOT `window.confirm`. §B10 — the system is complete and
 * frozen; a native confirm is a second dialog language, unstyleable, and it cannot carry the
 * §A3 focus ring or the kit's motion rungs.
 *
 * ⚠️ THE CLICK IS INTERCEPTED IN THE CAPTURE PHASE, on purpose: `next/link` attaches its own
 * bubble-phase handler, so a bubble-phase guard runs AFTER the router has already been told to
 * go. Capture is the only phase where `preventDefault()` still stops the navigation.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/modal";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Install the guard. `dirty` is the caller's own answer to "would leaving lose work?" — the
 * kit does not guess it, because only the form knows what its saved state was.
 */
/**
 * `PendingChangesBar` — the PROACTIVE half of unsaved-change tracking.
 *                                                    (ADMIN-TABS-2026-09-01, §K rule 7d)
 *
 * ⭐ WHY A BAR AND NOT ONLY A DIALOG. `UnsavedChangesGuard` is REACTIVE: it speaks only once
 * the operator is already leaving, and its answer is a question. A console page that is now a
 * SECTION RAIL makes that worse — an officer edits on one tab, switches to another, and the
 * only thing that ever mentioned the edit is a modal they must read under time pressure. A
 * persistent bar states the condition continuously and puts Save and Discard in reach, so the
 * dialog becomes the backstop it was always meant to be rather than the whole mechanism.
 *
 * ⛔ IT INTRODUCES NO NEW DESIGN. Every part is a surface this platform already paints, which
 * is §B9/§B10 — the system is complete; new design MERGES IN, it never sits beside:
 *   · the surface is `.kp-rail` — the SAME recipe the player's bottom navigation uses
 *     (`globals.css:4730`): `--panel`, a top border, `--shadow-overlay-up`, and the
 *     `env(safe-area-inset-bottom)` padding that keeps it off an iOS home indicator;
 *   · the motion is `.kp-rise`, an EXISTING registered keyframe (`test:keyframes` rule 1.1
 *     forbids a second name for a motion that already exists) — and it is already listed in
 *     the reduced-motion block at `globals.css:2728`, so §M6 is satisfied without a new rule;
 *   · the rung is `z-nav` (40), which already paints. It sits BELOW `menu`, `drawer` and
 *     `modal`, so a dialog — including this file's own confirm — always covers it, and an
 *     officer can never be asked to answer a question they cannot see;
 *   · the tone is `--warning-*`, the APP-STATE caution family. ⛔ Never the betting ramp: an
 *     unsaved form is not a losing bet (§B2a).
 *
 * ⚠️ IT RESERVES ITS OWN SPACE. A `position: fixed` bar covers whatever is under it, and the
 * admin body reserves no bottom padding — so the last card on a 4,000px page would sit beneath
 * it, which is exactly the "rendered is not visible" defect this lineage keeps paying for. The
 * spacer below is a sibling in the page flow and is why the bar can never hide content.
 */
export function PendingChangesBar({
  dirty,
  onSave,
  onDiscard,
  saving = false,
  label = "Unsaved changes",
  detail,
  saveLabel = "Save changes",
  discardLabel = "Discard",
}: {
  dirty: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saving?: boolean;
  label?: string;
  detail?: React.ReactNode;
  saveLabel?: string;
  discardLabel?: string;
}) {
  /* ⛔ SSR: `createPortal` needs a DOM. Mount-gate it so the server renders the SPACER only —
     which is right, because the spacer belongs to the page and the bar belongs to the window. */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  /**
   * ⚠️ THE PAGE RESERVES THE BAR'S MEASURED HEIGHT, AND BOTH HALVES OF THAT WERE LEARNED THE
   * HARD WAY BY `qa:pending-bar` DRIVING PRODUCTION.
   *
   * ① WHERE. An in-flow sibling spacer reserves space where THIS COMPONENT sits. Rendered
   *   mid-form, that leaves the page's LAST card still running under the bar — measured at 49px
   *   of overlap on 1440 and **102px on 390**. A kit primitive cannot require its callers to
   *   render it last, so the reserve goes on the SCROLL CONTAINER instead, the same way the
   *   kit's modal owns the scroll lock. Cleared on unmount, always.
   * ② HOW MUCH. `--h-pending-bar` is the bar's MINIMUM, not its height: at 390 the row wraps —
   *   label, detail and two buttons do not fit on one line — so a constant would under-reserve
   *   at exactly the width where the overlap is worst. The height is READ from the rendered
   *   element and re-read whenever it changes.
   */
  const barRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const apply = () => {
      document.body.style.paddingBottom = `${Math.ceil(el.getBoundingClientRect().height)}px`;
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [mounted, dirty]);

  if (!dirty) return null;

  /**
   * 🔴 IT PORTALS, AND THAT IS NOT OPTIONAL — `test:stacking` §5 names the mechanism.
   * `.route-enter` is `animation: m-settle-in … both`, and a `both` fill keeps the final
   * keyframe's `transform` applied FOR EVER. A transformed element is the containing block for
   * every `position: fixed` descendant, so a bar rendered from a route file anchors to the
   * page-transition wrapper instead of the window — it would sit at the bottom of the PAGE,
   * scrolling away, on a console page that is 4,000px tall. That is the "rendered is not
   * visible" defect, and no screenshot of the top of the page would show it.
   * ⚠️ §5.2's sweep did NOT catch this: its predicate is `fixed` + `inset-0`, i.e. a
   * FULL-VIEWPORT overlay, and this bar is edge-anchored (`inset-x-0 bottom-0`). The gate was
   * one level too shallow for this shape and has been widened in the same commit — but the
   * portal is the fix, not the gate.
   */
  const bar = (
    <div
        ref={barRef}
        /* ⭐ `status` + `polite`, not `alert`: the condition is important and is NOT an
           emergency, and an assertive live region would interrupt whatever the officer is
           typing — on the very form the message is about. */
        role="status"
        aria-live="polite"
        className="kp-rail kp-rise fixed inset-x-0 bottom-0 z-nav"
      >
        <div
          /* ⛔ NO `max-w-…` HERE — §B7, "every page states its width, once", and `test:measure`
             refused the first draft's `max-w-[1400px]` as a NEW hand-typed page width. It was
             also simply wrong: `AdminBody` states no measure at all and runs full-width at
             `px-4 lg:px-6`, so a bar that centred itself inside 1400px would not line up with
             the content it belongs to. The padding below is AdminBody's own, so the bar's
             contents sit on the same left edge as the form above them. */
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6"
          style={{ minHeight: "var(--h-pending-bar)" }}
        >
          <span className="inline-flex items-center gap-2 font-mono text-micro uppercase eyebrow text-warning-fg">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-pill bg-warning-fg" />
            {label}
          </span>
          {detail && <span className="min-w-0 text-caption text-text-secondary">{detail}</span>}
          {/* ⭐ The actions sit at the END on one line and WRAP as a pair at 390 — the same
              `flex-wrap` + `ml-auto` shape the admin card header uses, so a narrow screen
              never puts Save on its own orphan row. */}
          <span className="ml-auto flex items-center gap-2">
            {onDiscard && (
              <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
                {discardLabel}
              </Button>
            )}
            {onSave && (
              <Button type="button" variant="primary" size="sm" onClick={onSave} loading={saving}>
                {saveLabel}
              </Button>
            )}
          </span>
        </div>
      </div>
  );

  return (
    <>
      {/* 🔴 THE SPACER IS GONE, AND ITS FAILURE IS WORTH KEEPING. The first version rendered an
          in-flow sibling of the bar's own height — which reserves space WHERE THE COMPONENT
          SITS, not at the end of the page. This component is rendered mid-form, so the page's
          LAST card still ran underneath the bar: `qa:pending-bar` measured the overlap at 49px
          on 1440 and **102px on 390**, where the bar wraps to two rows.
          ⭐ A spacer only works if the component is the last thing in the flow, and a kit
          primitive cannot require that of its callers. The reserve therefore goes on the
          SCROLL CONTAINER — `document.body`'s padding-bottom, set from the bar's MEASURED
          height and cleared on unmount, the same way the kit's modal owns the scroll lock.
          ⚠️ Measured, not assumed: at 390 the row legitimately wraps, so a constant would
          under-reserve at exactly the width where it matters most. */}
      {mounted ? createPortal(bar, document.body) : null}
    </>
  );
}

/**
 * `useFormDirty` — the honest answer to *"would leaving lose work?"* for an UNCONTROLLED form.
 *                                                    (ADMIN-TABS-2026-09-01, §K5, §K rule 7d)
 *
 * ⭐ WHY IT EXISTS. `UnsavedChangesGuard` takes a `dirty` boolean and the caller owns it. That
 * is easy where state is controlled (`updown-controls.tsx` compares `method !== observationMethod`
 * and is exact). But most admin forms are UNCONTROLLED — `config-form.tsx` alone renders 11
 * `<Input defaultValue={…}>` — and React state never sees those edits at all, so there is
 * nothing to compare and every such form would otherwise ship without a guard.
 *
 * ⛔ AND THE OBVIOUS SHORTCUT IS WRONG. A `touched` flag set by the first keystroke reports
 * dirty forever after — including once the operator has typed a value back to what it was. That
 * is a prompt over nothing, and a dialog that fires when nothing would be lost is how operators
 * learn to dismiss the dialog that matters. This SNAPSHOTS the form on mount and COMPARES, so
 * typing `40` over `40` is not dirty and typing it back to `40` stops being dirty.
 *
 * ⚠️ WHAT IT COMPARES, STATED: the form's own `FormData`, serialised in DOM order. That means
 *   · a field the form renders CONDITIONALLY (a fee model that reveals two more inputs) changes
 *     the serialisation and therefore reads dirty — which is correct, the operator changed it;
 *   · a checkbox that posts nothing when unchecked is handled, because both sides of the
 *     comparison are built the same way;
 *   · ⛔ a FILE input is skipped by name. `FormData` holds a `File` object whose stringification
 *     is the filename alone, so two different files with one name would compare equal — a
 *     silent false negative, which is the failure direction this repo does not accept. No admin
 *     form uploads today; if one does, it must own its own `dirty`.
 *
 * ⛔ `markSaved()` IS NOT OPTIONAL. After a successful save the CURRENT values are the new
 * baseline; without the call the form stays dirty forever and the guard fires on a form that
 * holds nothing unsaved.
 */
export function useFormDirty(formRef: React.RefObject<HTMLFormElement | null>) {
  const [dirty, setDirty] = React.useState(false);
  const baseline = React.useRef<string | null>(null);

  const snapshot = React.useCallback(() => {
    const form = formRef.current;
    if (!form) return null;
    const fd = new FormData(form);
    const parts: string[] = [];
    for (const [k, v] of fd.entries()) {
      if (typeof v !== "string") continue; // see the FILE note above
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
    return parts.join("&");
  }, [formRef]);

  /* The baseline is taken AFTER the first paint, not during render: a `defaultValue` is only on
     the DOM node once it exists, and a snapshot taken too early is an empty string that makes
     every field read as a change. */
  React.useEffect(() => {
    baseline.current = snapshot();
  }, [snapshot]);

  const check = React.useCallback(() => {
    const now = snapshot();
    if (now === null || baseline.current === null) return;
    setDirty(now !== baseline.current);
  }, [snapshot]);

  const markSaved = React.useCallback(() => {
    baseline.current = snapshot();
    setDirty(false);
  }, [snapshot]);

  /* ⚠️ BOTH EVENTS, ON PURPOSE. `input` covers typing; `change` covers a `<select>` and a
     checkbox, which do not fire `input` in every engine. They are cheap and idempotent. */
  return { dirty, markSaved, formProps: { onInput: check, onChange: check } };
}

export function UnsavedChangesGuard({
  dirty,
  title = "Leave without saving?",
  body = "This form has changes that have not been saved. Leaving now discards them.",
  confirmLabel = "Discard changes",
  cancelLabel = "Stay on this page",
}: {
  dirty: boolean;
  title?: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  /* ⚠️ `dirty` is read through a ref inside both listeners. They are installed once; reading
     the prop directly would close over the value at install time and the guard would answer
     with whatever `dirty` was on first render — permanently. */
  const dirtyRef = React.useRef(dirty);
  React.useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  // ① The tab closes.
  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // ⚠️ Legacy engines require `returnValue` to be SET, not merely truthy-returned. The
      // string itself is ignored by every current browser, which shows its own wording.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ② An in-app link — including a section-rail tab.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      // ⛔ Let the browser have the clicks that are NOT a same-tab navigation: a modified
      // click opens a new tab and loses nothing, and a non-primary button is not a follow.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;                 // in-page anchor: no exit
      if (a.hasAttribute("download") || a.getAttribute("target") === "_blank") return;
      // Same-origin only — an outbound link leaves the app entirely and ① covers it.
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // ⛔ Same URL is not an exit. A rail's ACTIVE tab links to where you already are, and
      // prompting there would make the current tab unclickable while the form is dirty.
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      setPending(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);           // ⛔ capture — see the header
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  /* ⭐ THE KIT'S OWN `ConfirmModal`, not a hand-built panel. It is already controlled
     (`open`/`onClose`/`onConfirm`), so nothing had to be forked to open it programmatically —
     §K5, and §B10: a second dialog composed out of `Modal` + two `Button`s would be a fourth
     spelling of a decided thing.
     ⚠️ `tier="medium"` deliberately, NOT `"hard"`: a hard gate makes the operator TYPE a word,
     and this is a reversible loss of a draft, not an irreversible act on money or a person.
     Reaching for the strongest ceremony everywhere is how a type-to-confirm stops meaning
     anything on the screens that genuinely need one. */
  return (
    <ConfirmModal
      open={pending !== null}
      onClose={() => setPending(null)}
      onConfirm={() => {
        const to = pending;
        setPending(null);
        /* ⚠️ Cleared FIRST, then pushed: the click that started this was cancelled, so the
           push below is the only navigation still travelling and it must not re-arm the
           guard on its way out. */
        if (to) router.push(to as never);
      }}
      title={title}
      body={body}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tier="medium"
    />
  );
}
