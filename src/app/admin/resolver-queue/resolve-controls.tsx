"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { resolveMarketAction } from "@/app/markets/actions";
import { BrandSpinner } from "@/components/brand";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { ConfirmModal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/utils";

export function ResolveControls({ marketId, stage, stagedOutcome }: { marketId: string; stage: "stage1" | "stage2"; stagedOutcome?: "YES" | "NO" | "VOID" | null }) {
  const [pending, startTransition] = useTransition();
  const [submittedSide, setSubmittedSide] = useState<"YES" | "NO" | "VOID" | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<"YES" | "NO" | "VOID" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    variant: "success" | "danger";
    title: string;
    subtitle: string;
    detail?: string;
  } | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fire = (outcome: "YES" | "NO" | "VOID") => {
    setSubmittedSide(outcome);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("outcome", outcome);
      const r = await resolveMarketAction(fd);
      if (!r.ok) {
        toast({ title: "Could not resolve", description: r.error, variant: "danger" });
        setResultData({ variant: "danger", title: "Could not resolve", subtitle: r.error ?? "Try again." });
        setResultOpen(true);
        setSubmittedSide(null);
        return;
      } else if (r.data?.stage === "stage1") {
        toast({ title: "Stage 1 recorded", description: "Awaiting second officer to release.", variant: "warning" });
        setResultData({
          variant: "success",
          title: `Stage 1 · ${outcome} staged`,
          subtitle: "Awaiting a second officer to confirm and settle. The same officer cannot confirm twice.",
        });
        setResultOpen(true);
      } else {
        // Stage-2 records the VERDICT — it does not pay. The money stays in the
        // pool until the objection window closes with no objection standing, so
        // saying "paid" here would be a lie to the officer.
        const detail = r.data?.settlesAt
          ? `Pays out ${formatDateTime(r.data.settlesAt)}, unless a player objects`
          : "Pays out on the next settlement sweep";
        toast({ title: `Verdict recorded · ${outcome}`, description: detail, variant: "success" });
        setResultData({
          variant: "success",
          title: `Verdict recorded · ${outcome}`,
          subtitle: "No money has moved. Players who staked can object while the window is open; an objection freezes settlement until an officer rules.",
          detail,
        });
        setResultOpen(true);
      }
      setSubmittedSide(null);
      router.refresh();
    });
  };

  // Stage-1 fires straight through — it only stages a side, no money
  // moves yet. Stage-2 is irreversible (payouts credit, positions
  // close), so it's gated behind an explicit confirm dialog. This is
  // the LCCP / GBT "informed-consent" pattern for irreversible writes.
  const submit = (outcome: "YES" | "NO" | "VOID") => {
    if (stage === "stage2") {
      setPendingOutcome(outcome);
      setConfirmOpen(true);
      return;
    }
    fire(outcome);
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <BrandSpinner size={36} />
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">
          Recording {submittedSide} · {stage}
        </span>
      </div>
    );
  }

  const toneClass = (o: "YES" | "NO" | "VOID") => (o === "YES" ? "btn-yes" : o === "NO" ? "btn-no" : "btn-claret");
  const toneText = (o: "YES" | "NO" | "VOID") => (o === "YES" ? "text-yes-300" : o === "NO" ? "text-no-300" : "text-claret-300");

  return (
    <>
      {stage === "stage2" && stagedOutcome ? (
        // Stage 2 must MATCH the Stage-1 decision — so guide the second officer to
        // confirm exactly that outcome instead of offering all three (which would
        // error on a mismatch). Changing it means reopening the market.
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-bg-overlay px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Stage 1 staged</span>
            <span className={`font-mono text-[12px] font-bold ${toneText(stagedOutcome)}`}>{stagedOutcome}</span>
            <span className="ml-auto font-mono text-[10px] text-text-subtle">confirm to settle</span>
          </div>
          <button type="button" onClick={() => submit(stagedOutcome)} disabled={pending} className={`btn ${toneClass(stagedOutcome)} btn-md w-full`}>
            Confirm {stagedOutcome} · settle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => submit("YES")} disabled={pending} className="btn btn-yes btn-md w-full">
            Resolve YES
          </button>
          <button type="button" onClick={() => submit("NO")} disabled={pending} className="btn btn-no btn-md w-full">
            Resolve NO
          </button>
          <button type="button" onClick={() => submit("VOID")} disabled={pending} className="btn btn-ghost btn-md w-full">
            Void
          </button>
        </div>
      )}

      {/* Stage-2 irreversible-action gate — kit-faithful inline portal.
          Self-contained so we can drive it from submit() without
          refactoring ConfirmDialog (which is trigger-driven). Same
          chrome (scrim, raised card, claret CTA) as the rest of the
          confirm surface. */}
      <SettleConfirm
        open={confirmOpen}
        outcome={pendingOutcome}
        onCancel={() => { setConfirmOpen(false); setPendingOutcome(null); }}
        onConfirm={() => {
          if (!pendingOutcome) return;
          const o = pendingOutcome;
          setConfirmOpen(false);
          setPendingOutcome(null);
          fire(o);
        }}
      />

      {/* Officer settlement is operational, not an earned-money moment — the
          gold burst is the PLAYER's (ADM2 §2: "the gold burst is the player's
          moment, not the officer's"). So the result strip is royal, not gold. */}
      {resultData && (
        <OperationResultModal
          open={resultOpen}
          variant={resultData.variant}
          eyebrow={resultData.variant === "success" ? "Settlement" : "Settlement failed"}
          title={resultData.title}
          subtitle={resultData.subtitle}
          details={resultData.detail ? [{ label: "Detail", value: resultData.detail }] : undefined}
          primaryLabel="Done · Sawa"
          onClose={() => setResultOpen(false)}
          stripTone="brand"
        />
      )}
    </>
  );
}

function SettleConfirm({
  open,
  outcome,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  outcome: "YES" | "NO" | "VOID" | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!outcome) return null;
  const verb = outcome === "VOID" ? "Void" : `Settle ${outcome}`;
  return (
    <ConfirmModal
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      tone="claret"
      eyebrow="Irreversible · Hatua ya mwisho"
      title={`${verb} now?`}
      confirmLabel={`Yes, ${verb.toLowerCase()}`}
      cancelLabel="Not yet · Bado"
      body={
        <>
          <p>
            <strong>This is final.</strong> {outcome === "VOID"
              ? "Every stake will be refunded and the market closes — no payouts, no margin, no undo."
              : "Payouts credit to every winning wallet, every losing position closes, and an immutable entry lands in the audit log."}
          </p>
          <p className="text-text-subtle italic text-[12px] mt-1.5">
            Hatua hii haiwezi kubatilishwa.
          </p>
        </>
      }
    />
  );
}
