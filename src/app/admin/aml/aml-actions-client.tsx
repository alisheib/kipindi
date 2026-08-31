"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { approveAmlAction, rejectAmlAction } from "./actions";
import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { useRouter } from "next/navigation";
import { formatTzs } from "@/lib/utils";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function AmlActionRow({ txnId, amount }: { txnId: string; amount: number }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [, startTransition] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();
  const router = useRouter();

  /* ⭐ DG-S-05/06 — the address the server named, held until it can actually be honoured.
     ⛔ SCOPED TO THIS ROW, NOT `document.body`. The queue renders one `AmlActionRow` per
     pending transaction and every row owns an input with the SAME `data-field`, each
     expandable independently — so a body-wide search would hand the caret to whichever
     expanded row comes first in the table, i.e. a DIFFERENT officer's decision about a
     DIFFERENT person's money. The ref is the only container that means "this transaction". */
  const rowRef = useRef<HTMLDivElement>(null);
  const [pendingField, setPendingField] = useState<string | null>(null);

  /* ⛔ FOCUS ONLY ONCE THE FAILURE CARD IS GONE. `overlay.fail` opens a <Modal>: scrim, focus
     trap, and a focus RETURN that fires on unmount and pulls the caret back to whatever was
     focused when it opened (the Submit button). Focusing in the same tick as `dismiss()` loses
     that race twice over — the caret would sit behind a scrim, then be taken back by the
     modal's cleanup. A passive effect keyed on the overlay returning to `idle` runs AFTER that
     cleanup within the same commit, so this needs no timer racing an animation (the fourth
     defect `focusFirstInvalid` was written to kill). */
  useEffect(() => {
    if (!pendingField || overlay.state.phase !== "idle") return;
    focusFirstInvalid(rowRef.current, [pendingField]);
    setPendingField(null);
  }, [pendingField, overlay.state.phase]);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const submit = (kind: "approve" | "reject") => {
    // Both approve (releasing funds) and reject (returning funds) require a recorded
    // justification — the server enforces ≥ 5 chars; mirror it here for a fast message.
    if (reason.trim().length < 5) {
      toast({ title: "Reason required", description: `${kind === "approve" ? "Approval" : "Reject"} needs a reason of at least 5 characters.`, variant: "warning" });
      /* ⭐ DG-S-06 — and then TAKE THEM THERE. This mirror is the branch an operator actually
         reaches (the server's identical rule is the defence behind it), and here the input is
         mounted with nothing over it, so the caret goes in immediately — no overlay to wait
         for. The name matches the `data-field` below AND the two `fieldError` calls in
         `actions.ts`; one control, one address, whichever side refuses. */
      focusFirstInvalid(rowRef.current, ["aml-reason"]);
      return;
    }
    setBusy(kind);
    overlay.run(
      kind === "approve" ? `Approving ${formatTzs(amount)}…` : "Rejecting transaction…",
      kind === "approve"
        ? "Recording your approval. Large payouts need a second, different officer; the final approval dispatches the payout to the gateway."
        : "Returning funds to player wallet.",
    );
    startTransition(async () => {
      /* Declared out here because the RESET below has to see it — see the comment there. */
      let invalidField: string | undefined;
      try {
        const fd = new FormData();
        fd.set("txnId", txnId);
        fd.set("reason", reason);
        const fn = kind === "approve" ? approveAmlAction : rejectAmlAction;
        const result = await fn(fd);
        if (result?.ok) {
          const stage = (result as { stage?: "stage1" | "complete" }).stage;
          const message = (result as { message?: string }).message;
          router.refresh();
          if (stage === "stage1") {
            overlay.succeed("Stage 1 recorded", message ?? "A second, different officer must approve to release the funds.");
          } else if (kind === "approve") {
            overlay.succeed(`Approved · ${formatTzs(amount)}`, message ?? "Payout dispatched to the gateway.");
          } else {
            overlay.succeed("Rejected", "Funds returned to wallet.");
          }
        } else {
          /* ⭐ DG-S-05 — read the address, if the refusal carries one. `"field" in result` is
             the narrowing this surface is built for: every OTHER refusal (not in AML_REVIEW,
             self-review, a deposit awaiting a refund, the two-person rule, a gateway fault)
             returns a plain `{ ok, error }`, lands here with no address, and behaves exactly
             as it does today. */
          if (result && "field" in result && result.field) invalidField = result.field;
          overlay.fail("AML action failed", result?.error ?? "Try again.");
        }
      } catch {
        overlay.fail("AML action failed", "Server error — please try again.");
      }
      setBusy(null);
      if (invalidField) {
        /* ⛔ AN ADDRESSED REFUSAL MUST NOT CLOSE THE PANEL. The reset in the `else` unmounts the
           reason input and throws away what was typed; "go to the control you must fix" is a
           lie if that control — and the text being corrected — is gone in the same tick, and
           `focusFirstInvalid` would truthfully report `not-rendered` into the void. So a
           refusal that NAMES a field keeps the panel open with the wording intact and hands
           the address to the effect above; every other outcome resets exactly as before. */
        setPendingField(invalidField);
      } else {
        setMode(null);
        setReason("");
      }
    });
  };

  const toggle = (kind: "approve" | "reject") => {
    setMode((m) => (m === kind ? null : kind));
    setReason("");
  };

  return (
    /* `rowRef` is the search scope for `focusFirstInvalid` — this row and nothing else. */
    <div ref={rowRef} className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {/* Approve DISPATCHES the payout to the gateway (dispatchApprovedWithdrawal):
            AML_REVIEW → PROCESSING with a real provider ref, settled exactly-once by
            the webhook/reconcile path — the hold is kept until the provider confirms.
            Large payouts (≥ 1M) require two different officers. Reject returns the held
            funds to the player. */}
        <Button
          size="sm"
          variant="primary"
          disabled={busy !== null}
          onClick={() => toggle("approve")}
          aria-label="Approve transaction"
          aria-expanded={mode === "approve" ? "true" : "false"}
          leading={<I.check s={12} />}
          trailing={<I.chevronDown s={11} />}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy !== null}
          onClick={() => toggle("reject")}
          aria-label="Reject transaction"
          aria-expanded={mode === "reject" ? "true" : "false"}
          leading={<I.x s={12} />}
          trailing={<I.chevronDown s={11} />}
        >
          Reject
        </Button>
      </div>
      <p className="text-body-sm text-text-tertiary">
        Large payouts (≥ {formatTzs(TWO_PERSON_THRESHOLD_TZS)}) need <span className="text-text-secondary">two different officers</span>; approval dispatches the payout. <span className="text-text-secondary">Reject</span> returns the held funds.
      </p>
      {mode && (
        <div className="flex items-start gap-1.5">
          {/* ⭐ DG-S-05/06 — `data-field` is the ADDRESS the refusals name, and it sits ON the
              input rather than on a wrapper: there is no wrapper here, and putting it on a
              sibling label would make `focusFirstInvalid` scroll and then focus nothing.
              ⛔ The string must match `fieldError("aml-reason", …)` in `actions.ts` exactly; a
              typo degrades to today's behaviour (a message, no focus), never to a wrong jump. */}
          <input
            data-field="aml-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "approve" ? "Approval reason (required)" : "Rejection reason (required)"}
            aria-label={mode === "approve" ? "Approval reason" : "Rejection reason"}
            /* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so `h-8`
               was 48px. 40px = --tap-min and the height of the `Button size="sm"` beside it;
               §A2 — money controls are never the tap-floor exception, so this does NOT drop to
               the 32px dense-admin height the filter rails use. */
            className="flex-1 h-[40px] px-2 rounded-md border border-border bg-bg-inset text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant={mode === "approve" ? "yes" : "danger"} onClick={() => submit(mode)} loading={busy === mode} disabled={busy !== null}>
            Submit
          </Button>
        </div>
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
