"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { buildDsarBundleAction, fulfillDsarAction, fileDsarAction } from "./actions";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";

// A1 — /admin/privacy is the `compliance` domain, and an AUDITOR holds compliance VIEW with
// no ACT. Both controls below were rendered fully enabled to them: eight `Export bundle`
// buttons for a player's entire personal-data file. The server always refused, so nothing
// leaked — but the officer was offered a control that could not work, and the refused click
// wrote `privilege_escalation_blocked` against them on the PDPA surface.

export function ExportDsarBundleButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();
  const onClick = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await buildDsarBundleAction(fd);
      if (!r.ok) {
        toast({ title: "Export failed", description: r.error, variant: "danger" });
        return;
      }
      const blob = new Blob([JSON.stringify(r.bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsar-${userId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "DSAR bundle generated", variant: "success" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick} loading={busy}
      disabled={!mayAct} title={disabledReason}>
      Export bundle
    </Button>
  );
}

/**
 * ⛔ THIS BUTTON STOPPED BEING BOOKKEEPING ON 2026-08-21 AND ITS COPY HAD TO FOLLOW.
 *
 * It used to be a status flip: *"records the completion date and closes this request."* On an
 * ERASURE it now RUNS `anonymizeClosedAccount` — it destroys columns. A destructive control
 * described as a bookkeeping one is the same class of defect as a retention schedule no code
 * enforces, pointing the other way: the operator is not told what they are about to do.
 *
 * ⚠️ AND TWO CLAIMS IN THE OLD COPY WERE SIMPLY FALSE, MEASURED. *"The player will be
 * notified"* — nothing in `fulfillDsarRequest` notifies anybody, and for an erasure it CANNOT:
 * the routine nulls the email, tombstones the phone and deletes the account's notifications,
 * so the confirmation channel is destroyed by the very act being confirmed. **The officer must
 * answer the player BEFORE pressing this.** The dialog says so now instead of promising a
 * message the platform cannot send. *"Cannot be undone"* was true and stays.
 */
export function FulfillDsarButton({ id, type, status }: { id: string; type?: string; status?: string }) {
  const [pending, startTransition] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();
  const isErasure = type === "ERASURE";
  const isResume = status === "PARTIAL";
  const onClick = () => {
    overlay.run(
      isErasure ? "Erasing personal data…" : "Marking fulfilled…",
      isErasure
        ? "Running the erasure routine. Money, ledger and audit records are not touched."
        : "Recording completion date for this DSAR.",
    );
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        const r = await fulfillDsarAction(fd);
        if (!r.ok) {
          overlay.fail("Could not fulfill", r.error ?? "Unknown error.");
        } else {
          router.refresh();
          // ⭐ The PARTIAL notice is the server's own sentence, carrying the release date.
          // A generic "done" here would hide the one fact that matters about a partial
          // fulfilment — that it is not finished.
          overlay.succeed(
            r.notice ? "Partly done · documents held" : "DSAR fulfilled",
            r.notice ?? "Completion date recorded.",
          );
        }
      } catch {
        overlay.fail("Could not fulfill", "Server error — please try again.");
      }
    });
  };
  return (
    <>
      <ConfirmDialog
        trigger={
          <Button type="button" size="sm" variant={isErasure ? "danger" : "primary"} loading={pending}
            disabled={!mayAct} title={disabledReason}>
            {isErasure ? (isResume ? "Destroy held docs" : "Erase data") : "Mark fulfilled"}
          </Button>
        }
        title={isErasure ? "Erase this player's personal data" : "Mark DSAR fulfilled"}
        body={isErasure
          ? "This RUNS the erasure routine: contact details, password, profile, in-app messages, "
            + "push registrations, and the name and number on the identity record are destroyed. "
            + "Identity document images are held until 7 years after account closure (POCA Cap 423 §16) "
            + "and the request stays in the queue until then. Money, ledger, positions and the audit "
            + "chain are NOT touched. The account must already be CLOSED. "
            + "⚠️ Answer the player FIRST — this destroys the email address and phone number you "
            + "would reply to. This cannot be undone."
          : "This records the completion date and closes this data subject access request. "
            + "It does not message the player — reply to them through the channel they used. "
            + "This action cannot be undone."}
        confirmLabel={isErasure ? "Yes, erase the data" : "Yes, mark fulfilled"}
        tone={isErasure ? "claret" : "warning"}
        onConfirm={onClick}
      />
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}

/**
 * 🔴 THE OFFICER'S SIDE OF E-33 — `fileDsarAction`'s first caller.
 *
 * The action has existed, RBAC-gated and audited, since the DSAR queue shipped, and nothing
 * called it: `/admin/privacy` rendered "No data-subject access requests are on file"
 * permanently, because there was no way to put one in. Ali's decision 2026-08-21 covers the
 * player's own door (`/profile/account`); this is the walk-in, letter and telephone case the
 * decision also names — *"an officer may also file on a player's behalf, which is what
 * /admin/privacy is for."*
 *
 * ⭐ ERASURE AND CORRECTION ONLY, the same two the player is offered. Access and portability
 * are served by the Export bundle button in this very card, immediately; filing one here would
 * open a 30-day statutory obligation for work the officer has just finished doing.
 */
export function FileDsarOnBehalfButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<"ERASURE" | "CORRECTION">("CORRECTION");
  const overlay = useActionOverlay();
  const router = useRouter();
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();
  const onConfirm = () => {
    overlay.run("Filing request…", "Starting the 30-day statutory clock.");
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("type", type);
        fd.set("reason", "Filed on the player's behalf by a compliance officer.");
        const r = await fileDsarAction(fd);
        if (!r.ok) overlay.fail("Could not file", r.error ?? "Unknown error.");
        else { router.refresh(); overlay.succeed("Request filed", "It is in the queue with a 30-day SLA."); }
      } catch {
        overlay.fail("Could not file", "Server error — please try again.");
      }
    });
  };
  return (
    <>
      <ConfirmDialog
        trigger={
          <Button type="button" size="sm" variant="ghost" loading={pending}
            disabled={!mayAct} title={disabledReason}>
            File request
          </Button>
        }
        title="File a request on this player's behalf"
        body={
          <div className="space-y-2">
            <p className="text-caption text-text-secondary">
              For a walk-in, a letter or a telephone request. This starts the 30-day statutory
              clock (PDPA 2022 §31 / GDPR Art. 17) and records that the player ASKED — which is
              the half a regulator asks about.
            </p>
            <p className="text-caption text-text-tertiary">
              Access and portability need no request: use <em>Export bundle</em> beside this.
            </p>
            {/* ⛔ DG-S-05 — NO `data-field` HERE, ON PURPOSE, AND DO NOT ADD ONE.
                This radio pair is the only input control in the whole `/admin/privacy` route,
                so it looks like the obvious place to hang the address for `fileDsarAction`'s
                "Type must be ERASURE or CORRECTION" refusal. It is not, and an attribute here
                would be a wire with nothing on the other end: this ConfirmDialog passes no
                `pending`, so it takes the classic branch in `confirm-dialog.tsx` — close
                FIRST, then run `onConfirm`. `Modal` returns null once closed, so this whole
                subtree is unmounted before the server answers, and a `focusFirstInvalid` aimed
                at it would report `not-rendered` on every failure rather than taking anyone
                anywhere. The server keeps the refusal plain for the same reason; the argument
                is written out in full at the `type` check in `actions.ts`.
                ⚠️ If this dialog is ever given `pending` (hold-open), the control survives the
                round-trip and BOTH halves become wireable — that is the remainder, and it is a
                control-flow change, not this row's. */}
            <div className="flex gap-2 pt-1">
              {(["CORRECTION", "ERASURE"] as const).map((v) => (
                <label key={v} className="inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.10em] text-text-secondary">
                  <input type="radio" name="dsar-type" value={v} checked={type === v} onChange={() => setType(v)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
        }
        confirmLabel="File it"
        tone="warning"
        onConfirm={onConfirm}
      />
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}
