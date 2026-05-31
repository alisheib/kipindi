"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { resolveMarketAction } from "@/app/markets/actions";
import { BrandSpinner } from "@/components/brand";
import { OperationResultModal } from "@/components/markets/operation-result-modal";

export function ResolveControls({ marketId, stage }: { marketId: string; stage: "stage1" | "stage2" }) {
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
        const detail = r.data?.winnersPaid
          ? `Paid TZS ${r.data.winnersPaid.toLocaleString()} to winners`
          : "All voided · refunds issued";
        toast({ title: `Resolved ${outcome}`, description: detail, variant: "success" });
        setResultData({
          variant: "success",
          title: `Settled · ${outcome}`,
          subtitle: "Payouts credited and positions closed. Audit entry recorded.",
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

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => submit("YES")}
          disabled={pending}
          className="h-10 rounded-md bg-yes-500 font-bold text-yes-950 transition-colors hover:bg-yes-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resolve YES
        </button>
        <button
          type="button"
          onClick={() => submit("NO")}
          disabled={pending}
          className="h-10 rounded-md bg-no-500 font-bold text-white transition-colors hover:bg-no-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resolve NO
        </button>
        <button
          type="button"
          onClick={() => submit("VOID")}
          disabled={pending}
          className="h-10 rounded-md border border-border bg-bg-overlay font-bold text-text-muted transition-colors hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Void
        </button>
      </div>

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!mounted || !open || !outcome) return null;
  const verb = outcome === "VOID" ? "Void" : `Settle ${outcome}`;
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm settlement"
      className="fixed inset-0 z-modal flex items-center justify-center px-3"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[460px] rounded-2xl border border-border bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] p-5 lg:p-6">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
        >
          <X size={16} aria-hidden />
        </button>
        <div className="mb-3 flex items-start gap-2.5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-claret-300" aria-hidden />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-claret-300">
              Irreversible · Hatua ya mwisho
            </p>
            <h2 className="mt-0.5 font-display text-[18px] font-bold text-text leading-tight">
              {verb} now?
            </h2>
          </div>
        </div>
        <div className="text-[13px] text-text-muted leading-relaxed mb-4">
          <p>
            <strong>This is final.</strong> {outcome === "VOID"
              ? "Every stake will be refunded and the market closes — no payouts, no margin, no undo."
              : "Payouts credit to every winning wallet, every losing position closes, and an immutable entry lands in the audit log."}
          </p>
          <p className="text-text-subtle italic text-[12px] mt-1.5">
            Hatua hii haiwezi kubatilishwa.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-md w-full">
            Not yet · Bado
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-claret btn-md w-full" autoFocus>
            Yes, {verb.toLowerCase()}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
