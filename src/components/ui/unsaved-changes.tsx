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

/**
 * Install the guard. `dirty` is the caller's own answer to "would leaving lose work?" — the
 * kit does not guess it, because only the form knows what its saved state was.
 */
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
