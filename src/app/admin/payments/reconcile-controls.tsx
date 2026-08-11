"use client";

/** A3 — per-unmatched-item PSP reconciliation: MATCH to a settlement ref, or
 *  WRITE OFF with a reason. Both guarded + COMPLIANCE-audited server-side; no
 *  money moves (the movement already settled — this records its PSP correlation).
 *
 *  The action now happens in the kit <Modal> (portal + focus-trap + scroll-lock +
 *  Esc) with a clear confirm, instead of an inline text-link "Save" — a financial
 *  correction deserves a deliberate confirm surface, not a one-tap inline link. */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { reconcileMatchAction, reconcileWriteOffAction } from "./payment-actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function ReconcileControls({ txnId }: { txnId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();
  if (!mayAct) return <ActReadOnly />;

  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"match" | "writeoff" | null>(null);
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);
  const firstFieldRef = useRef<HTMLElement | null>(null);

  const valid = mode === "match" ? ref.trim().length > 0 : reason.trim().length >= 3;

  const close = () => { if (!pending) { setMode(null); setRef(""); setReason(""); } };

  const submit = () => {
    if (!valid) return;
    start(async () => {
      const fd = new FormData();
      fd.set("txnId", txnId);
      fd.set("reason", reason.trim());
      let r: { ok: boolean; error?: string };
      if (mode === "match") { fd.set("providerRef", ref.trim()); r = await runAdminAction(() => reconcileMatchAction(fd)); }
      else { r = await runAdminAction(() => reconcileWriteOffAction(fd)); }
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      deferToast({ title: mode === "match" ? "Matched" : "Written off", variant: "success" });
      setMode(null); setRef(""); setReason("");
      router.refresh();
    });
  };

  return (
    <>
      <span className="inline-flex items-center gap-2">
        <button type="button" disabled={pending} onClick={() => { setMode("match"); setRef(""); setReason(""); }} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">
          <I.check s={11} /> Match
        </button>
        <button type="button" disabled={pending} onClick={() => { setMode("writeoff"); setRef(""); setReason(""); }} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-claret-300 disabled:opacity-40">
          <I.x s={11} /> Write off
        </button>
      </span>

      <Modal
        open={!!mode}
        onClose={close}
        role="alertdialog"
        ariaLabel={mode === "match" ? "Match settlement reference" : "Write off unmatched item"}
        maxWidth={420}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={firstFieldRef}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text mb-1">
          {mode === "match" ? "Reconcile · Match" : "Reconcile · Write off"}
        </p>
        <h3 className="font-display text-[18px] font-bold text-text leading-tight">
          {mode === "match" ? "Match to a PSP settlement ref" : "Write off this unmatched item"}
        </h3>
        <p className="mt-1 text-[12.5px] italic text-text-subtle">
          No money moves — this records the PSP correlation for an already-settled movement. COMPLIANCE-audited.
        </p>

        {mode === "match" && (
          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">PSP settlement ref (required)</span>
            <input
              ref={(el) => { firstFieldRef.current = el; }}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. SLC-2026-..."
              className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 font-mono text-[13px] text-text outline-none admin-focus transition-colors"
            />
          </label>
        )}

        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">
            {mode === "match" ? "Note (optional)" : "Reason · Sababu (required, audit-logged)"}
          </span>
          <textarea
            ref={mode === "writeoff" ? (el) => { firstFieldRef.current = el; } : undefined}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "match" ? "Optional note" : "Why is this being written off?"}
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={300}
          />
        </label>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant={mode === "writeoff" ? "claret" : "primary"}
            size="lg"
            fullWidth
            loading={pending}
            disabled={!valid}
            onClick={submit}
          >
            {mode === "match" ? "Match" : "Write off"}
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={close}>
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
