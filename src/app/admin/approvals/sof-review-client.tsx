"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { I } from "@/components/ui/glyphs";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { useRouter } from "next/navigation";
import { reviewSofAction } from "./actions";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

type SofDecision = "ACCEPT" | "REJECT" | "MORE_INFO";

export function SofReviewRow({ userId }: { userId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [busy, setBusy] = useState<SofDecision | null>(null);
  const [expanded, setExpanded] = useState<"REJECT" | "MORE_INFO" | false>(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();
  const router = useRouter();

  /* ⭐ DG-S-06 — THE CONTAINER IS THIS ROW, NOT `document.body`.
     `SofReviewRow` is rendered ONCE PER PENDING DECLARATION (`page.tsx` — `sof.map(...)`), so a
     queue of eight players paints EIGHT inputs all carrying `data-field="sof-reason"`.
     `focusFirstInvalid` takes the first match in DOCUMENT order, so handing it `document.body`
     would drop the cursor in the TOP row's box no matter which row the officer was working in —
     "it tells you the form is wrong *there*, and it is not", the defect the helper's own header
     calls ①. Scoping to this row's root makes "first in document order" mean "the only one". */
  const rowRef = useRef<HTMLDivElement>(null);

  /* The address a refusal carried, held until there is somewhere to put the cursor — see the
     effect below for why it cannot be used the moment it arrives. */
  const [invalidField, setInvalidField] = useState<string | null>(null);

  /* ⛔ DG-S-06 — FOCUS AFTER THE FAILURE MODAL IS GONE, NOT WHEN THE REFUSAL ARRIVES.
     This row reports failures through `overlay.fail(...)`, which is not a toast: it is
     `OperationResultModal` → the kit `<Modal>`, and that modal (a) pulls focus onto its own
     first button 30 ms after opening and (b) restores focus to whatever was focused when it
     opened, on close. Focusing the input at `overlay.fail()` time is therefore overwritten
     twice, and the operator cannot reach the box behind the scrim anyway. Waiting for the
     overlay to return to `idle` puts the cursor exactly where the sentence they just read
     pointed. A passive effect is the right instrument and not a `setTimeout` guess: React
     flushes every effect CLEANUP in a commit (including the modal's focus-return) before any
     effect BODY, so this runs last by construction rather than by racing it (§M6). */
  const overlayPhase = overlay.state.phase;
  useEffect(() => {
    if (!invalidField || overlayPhase !== "idle") return;
    // One-shot: clear it either way. `focusFirstInvalid` reports `not-rendered` rather than
    // refusing in silence if the panel is somehow closed, so a miss degrades to today's
    // behaviour (the sentence, and no movement) instead of a jump somewhere wrong.
    focusFirstInvalid(rowRef.current, [invalidField]);
    setInvalidField(null);
  }, [invalidField, overlayPhase]);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const LABELS: Record<SofDecision, { running: string; detail: string; done: string; doneDetail: string }> = {
    ACCEPT: { running: "Accepting declaration…", detail: "Clearing the deposit gate for this player.", done: "Source of funds accepted", doneDetail: "Player can deposit normally." },
    REJECT: { running: "Rejecting declaration…", detail: "Player will be asked to re-declare.", done: "Declaration rejected", doneDetail: "Player asked to re-declare." },
    MORE_INFO: { running: "Requesting more info…", detail: "Player will be notified to update their declaration.", done: "More info requested", doneDetail: "Player notified to update." },
  };

  const submit = (decision: SofDecision) => {
    if ((decision === "REJECT" || decision === "MORE_INFO") && reason.trim().length < 5) {
      toast({ title: "Reason required", description: `${decision === "REJECT" ? "Reject" : "More info"} needs a reason of at least 5 characters.`, variant: "warning" });
      return;
    }
    const l = LABELS[decision];
    setBusy(decision);
    overlay.run(l.running, l.detail);
    startTransition(async () => {
      // DG-S-06 — a local, not state: the resets below have to see it in this same pass.
      let refusedField: string | null = null;
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("decision", decision);
        fd.set("reason", reason);
        const result = await reviewSofAction(fd);
        if (result?.ok) {
          router.refresh();
          overlay.succeed(l.done, l.doneDetail);
        } else {
          overlay.fail("SOF review failed", result?.error ?? "Try again.");
          // The address `reviewSofAction` returned, if this refusal was field-shaped.
          refusedField = result?.field ?? null;
        }
      } catch {
        overlay.fail("SOF review failed", "Server error — please try again.");
      }
      setBusy(null);
      setInvalidField(refusedField);
      /* ⛔ DG-S-06 — DON'T DEMOLISH THE THING YOU ARE ABOUT TO POINT AT. These two resets ran
         unconditionally, on success AND on failure: the panel collapsed and the typed reason
         was thrown away. That is fine for a refusal nobody can act on, but for one that names
         `sof-reason` it unmounts the very input the address refers to — the focus would land
         on nothing and the officer would have to re-type the note they were told to fix.
         ⭐ THIS IS STILL ADDITIVE. No refusal in this repo carried `field` before DG-S-05, so
         `refusedField` is `null` on every path that exists today and the two resets fire
         exactly as they always have; the guard only opens on the new shape. */
      if (!refusedField) {
        setExpanded(false);
        setReason("");
      }
    });
  };

  return (
    // DG-S-06 — the row is the search scope for `focusFirstInvalid`; see `rowRef` above.
    <div className="space-y-1.5" ref={rowRef}>
      <div className="flex items-center gap-1.5">
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="primary" disabled={busy !== null} loading={busy === "ACCEPT"} leading={<I.check s={12} />} aria-label="Accept declaration">
              Accept
            </Button>
          }
          title="Accept source of funds"
          body="This clears the deposit gate for this player. They will be able to deposit normally. Make sure the declared source is plausible and documented."
          confirmLabel="Yes, accept"

          onConfirm={() => submit("ACCEPT")}
        />
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => v === "MORE_INFO" ? false : "MORE_INFO")} aria-label="Request more info" leading={<I.info s={12} />}>
          More info
        </Button>
        <Button size="sm" variant="danger" onClick={() => setExpanded((v) => v === "REJECT" ? false : "REJECT")} aria-label="Reject declaration" aria-expanded={expanded === "REJECT" ? "true" : "false"} leading={<I.x s={12} />}>
          Reject
        </Button>
      </div>
      {expanded && (
        <div className="flex items-start gap-1.5">
          <input
            /* ⭐ DG-S-05/06 — the ADDRESS `reviewSofAction` names when it refuses "A reason/note
               (≥ 5 characters) is required." It sits ON the control, not on a sibling label:
               `focusFirstInvalid` focuses the wrapper itself when the wrapper IS an input, so
               there is no wrapper to scroll to and then find nothing in. ⛔ The two strings
               must match; a typo degrades to today's behaviour (the sentence, no focus). */
            data-field="sof-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={expanded === "MORE_INFO" ? "What info is needed? (required)" : "Rejection reason (required)"}
            aria-label={expanded === "MORE_INFO" ? "More info request" : "Rejection reason"}
            /* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — 40px = --tap-min and the
               height of the `Button size="sm"` beside it. Twin of aml-actions-client.tsx;
               §A2 — money-ops controls are never the tap-floor exception. */
            className="flex-1 h-[40px] px-2 rounded-md border border-border bg-bg-inset text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant={expanded === "MORE_INFO" ? "ghost" : "danger"} onClick={() => submit(expanded as SofDecision)} loading={busy === expanded} disabled={busy !== null}>
            Send
          </Button>
        </div>
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
