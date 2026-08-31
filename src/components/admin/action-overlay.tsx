"use client";

/**
 * ActionOverlay — full-page blocking overlay for admin async operations.
 *
 * Prevents double-clicks, shows clear progress, and gives an unambiguous
 * success/failure result. Critical for non-technical operators who might
 * otherwise click away mid-action.
 *
 * Usage:
 *   const overlay = useActionOverlay();
 *   overlay.run("Approving…", "Please wait.");
 *   // after async:
 *   overlay.succeed("Approved", "Ready to publish.");
 *   // or:
 *   overlay.fail("Could not approve", "Server error.");
 *
 *   return <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />;
 *
 * States: idle (hidden) → running (spinner) → success/error (result card)
 * Success auto-dismisses; error stays until dismissed.
 *
 * DS-12 (2026-08-08) — REBUILT ON THE KIT PRIMITIVES. This file used to carry
 * its own portal, scrim (`bg-black/40`, no --wash token), Escape handler and a
 * verbatim re-implementation of the result card — with NO focus trap and NO
 * scroll/zoom lock, on the surfaces where admins move real money. Now:
 *   • running  → <Modal> (scrim/portal/focus-trap/scroll-lock inherited;
 *                scrim + ✕ disabled — a money op in flight must not be
 *                dismissed into ambiguity)
 *   • success  → <OperationResultModal variant="success"> (auto-dismisses)
 *   • error    → <OperationResultModal variant="danger"> (stays until read)
 * The useActionOverlay() hook API is unchanged — no call site moved.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { OperationResultModal, type OperationDetail } from "@/components/markets/operation-result-modal";
import { DWELL_ADMIN_RESULT_MS } from "@/lib/feedback-timing";
import { isKnownRefusal, refusalFigures, ADMIN_REFUSALS, type OperatorRefusal } from "@/lib/operator-refusal";

export type OverlayState =
  | { phase: "idle" }
  | { phase: "running"; label: string; sublabel?: string }
  | { phase: "success"; title: string; subtitle?: string }
  /** `refusal` is the STRUCTURED half — see the note on `fail` below. */
  | { phase: "error"; title: string; message: string; refusal?: OperatorRefusal };

export function useActionOverlay() {
  const [state, setState] = useState<OverlayState>({ phase: "idle" });
  const dismiss = useCallback(() => setState({ phase: "idle" }), []);
  const run = useCallback((label: string, sublabel?: string) =>
    setState({ phase: "running", label, sublabel }), []);
  const succeed = useCallback((title: string, subtitle?: string) =>
    setState({ phase: "success", title, subtitle }), []);
  /**
   * Report a failure. `refusal` is OPTIONAL and additive: pass an action's `r.refusal`
   * straight through and the card gains the figures and a button to the screen that lifts it.
   *
   * ⛔ IT IS FIXED HERE, IN THE SHARED HOOK, NOT IN THE POLL CONSOLE. Fourteen admin surfaces
   * use this overlay for operations that move real money; teaching one of them to render a
   * refusal and leaving the rest printing a sentence is the `E-108` shape this repo already
   * has a name for — one helper, many copies, repaired one at a time. Every existing call site
   * passes two arguments and is untouched.
   */
  const fail = useCallback((title: string, message: string, refusal?: OperatorRefusal) =>
    setState({ phase: "error", title, message, refusal }), []);
  return { state, dismiss, run, succeed, fail };
}

export function ActionOverlay({ state, onDismiss, onRetry, retryLabel }: {
  state: OverlayState;
  onDismiss: () => void;
  /**
   * Optional "try that again" on the FAILURE card — the ghost CTA the result modal
   * already carries, surfaced here rather than re-implemented. Both props are optional
   * and absent they render EXACTLY today's single-button error card, so no existing
   * call site moves. Only a caller whose operation is safely repeatable should pass it.
   */
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const router = useRouter();

  // ── The structured refusal, resolved once ────────────────────────────────────────────────
  // ⛔ `isKnownRefusal` GATES THIS, so a reason shipped by a newer server than this client
  // renders as today's plain sentence rather than as a card with an empty figure grid and a
  // button to nowhere. The `error` sentence is always present for exactly that case.
  const refusal = state.phase === "error" ? state.refusal : undefined;
  const known = isKnownRefusal(refusal) ? refusal : undefined;
  const figures: OperationDetail[] = known
    // ⚠️ TONE `default`, NOT `bad`. Rendering BOTH figures in danger red says the LIMIT is at
    // fault as loudly as the spend, and the limit is the thing the operator is about to raise.
    // The card's variant already carries the alarm.
    ? refusalFigures(known).map((f) => ({ label: f.label, value: f.value }))
    : [];
  const fix = known?.fix;

  /**
   * ⛔ THE FIX OUTRANKS THE RETRY, AND THAT IS THE WHOLE POINT OF THIS COMPONENT.
   * Both want the one secondary slot. A refusal that names its own remedy must offer the
   * remedy — offering "Try again" against a spend ceiling is precisely what the 2026-08-31
   * incident did to the owner, repeatedly, and it can never succeed until something else
   * changes. A retry is only honest when nobody knows why it failed.
   */
  const secondaryLabel = fix ? fix.label : (onRetry ? (retryLabel ?? "Try again · Jaribu tena") : undefined);
  const onSecondary = fix
    // Dismiss FIRST, then navigate — same ordering rule as the retry below.
    ? () => { onDismiss(); router.push(fix.href); }
    : (onRetry ? () => { onDismiss(); onRetry(); } : undefined);

  return (
    <>
      {/* Running — a blocking, non-dismissible progress dialog. */}
      <Modal
        open={state.phase === "running"}
        onClose={() => { /* deliberately non-dismissible while in flight */ }}
        ariaLabel={state.phase === "running" ? state.label : "Working"}
        maxWidth={380}
        closeOnScrim={false}
        showClose={false}
      >
        {state.phase === "running" && (
          <div className="space-y-3" aria-busy>
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin shrink-0" />
              <p className="font-display text-[15px] font-semibold text-text">{state.label}</p>
            </div>
            {state.sublabel && (
              <p className="text-body-sm text-text-subtle leading-relaxed">{state.sublabel}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Success — the canonical result popup; auto-dismisses like every
          success on the platform. Admin copy is EN·SW by convention. */}
      <OperationResultModal
        open={state.phase === "success"}
        variant="success"
        eyebrow="Done · Imekamilika"
        title={state.phase === "success" ? state.title : ""}
        subtitle={state.phase === "success" ? state.subtitle : undefined}
        primaryLabel="Done · Sawa"
        onClose={onDismiss}
        // §F8 · the dwell is a NAMED constant, not a literal. `2000` at a call site
        // says nothing about the 3s bet toast or the 5s modal default it has to be
        // read against; `@/lib/feedback-timing` files all four together and states
        // the intrusion rule that orders them.
        autoCloseMs={DWELL_ADMIN_RESULT_MS}
      />

      {/* Error — persists until the officer has read it (LCCP pattern). */}
      <OperationResultModal
        open={state.phase === "error"}
        variant="danger"
        eyebrow="Failed · Imeshindikana"
        // ⭐ A KNOWN REFUSAL NAMES ITSELF. "Generation failed" describes what did not happen;
        // "AI credit limit reached" describes what DID, which is the only one an operator can
        // act on. The action's own title stays for everything this client does not recognise.
        title={known ? ADMIN_REFUSALS[known.reason].title : (state.phase === "error" ? state.title : "")}
        // ⭐ THE BODY IS THE NEXT STEP, NOT THE WHOLE SENTENCE. With a known reason the title
        // and the figure grid already carry the fact; the server's `message` restates both, so
        // showing it here printed one fact three times. Unknown reasons still get the sentence,
        // which is the only thing they have.
        subtitle={known ? ADMIN_REFUSALS[known.reason].body : (state.phase === "error" ? state.message : undefined)}
        details={figures.length > 0 ? figures : undefined}
        primaryLabel="Dismiss · Funga"
        secondaryLabel={secondaryLabel}
        // ⚠️ Dismiss FIRST, then retry/navigate. A retry re-enters `overlay.run(...)`, so the
        // other order would set `running` and then let the queued `idle` land on top of it,
        // leaving a live operation with no overlay over it. Same reason the dial's
        // secondary closes before it navigates (conviction-dial.tsx).
        onSecondary={onSecondary}
        onClose={onDismiss}
      />
    </>
  );
}
