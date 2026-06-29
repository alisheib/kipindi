"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { emergencyVoidMarketAction } from "@/app/markets/actions";

/**
 * Emergency "kill switch" for one market — voids it and refunds every open
 * stake in full, in a single atomic action. Gated behind a confirm dialog that
 * REQUIRES a reason (≥5 chars), because it's irreversible and moves money.
 */
export function EmergencyVoidControl({ marketId, title }: { marketId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ variant: "success" | "danger"; title: string; subtitle: string; detail?: string } | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fire = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("reason", reason.trim());
      const r = await emergencyVoidMarketAction(fd);
      setOpen(false);
      if (!r.ok) {
        toast({ title: "Could not void", description: r.error, variant: "danger" });
        setResult({ variant: "danger", title: "Could not void", subtitle: r.error ?? "Try again." });
      } else {
        const detail = `Refunded TZS ${r.data!.refundedTzs.toLocaleString()} to ${r.data!.refundedCount} ${r.data!.refundedCount === 1 ? "player" : "players"}`;
        toast({ title: "Market voided", description: detail, variant: "success" });
        setResult({ variant: "success", title: "Market voided & refunded", subtitle: "Every open stake was returned in full and the market is closed. Audit entry recorded.", detail });
        setReason("");
        router.refresh();
      }
      setResultOpen(true);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-claret-700 bg-claret-500/10 px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-claret-300 hover:bg-claret-500/20 transition-colors whitespace-nowrap"
        title="Emergency void — cancel this market and refund every stake"
      >
        <I.warning s={12} />
        Cancel &amp; refund
      </button>

      <ConfirmVoid
        open={open}
        title={title}
        reason={reason}
        setReason={setReason}
        pending={pending}
        onCancel={() => { if (!pending) { setOpen(false); setReason(""); } }}
        onConfirm={fire}
      />

      {result && (
        <OperationResultModal
          open={resultOpen}
          variant={result.variant}
          eyebrow={result.variant === "success" ? "Emergency void" : "Void failed"}
          title={result.title}
          subtitle={result.subtitle}
          details={result.detail ? [{ label: "Detail", value: result.detail }] : undefined}
          primaryLabel="Done · Sawa"
          onClose={() => setResultOpen(false)}
          stripTone="gold"
        />
      )}
    </>
  );
}

function ConfirmVoid({
  open, title, reason, setReason, pending, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  reason: string;
  setReason: (v: string) => void;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) { e.preventDefault(); onCancel(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);
  if (!mounted || !open) return null;
  const canConfirm = reason.trim().length >= 5 && !pending;
  return createPortal(
    <div role="alertdialog" aria-modal="true" aria-label="Confirm emergency void" className="fixed inset-0 z-[100] flex justify-center px-3 py-4 overflow-y-auto overscroll-contain">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative my-auto w-full max-w-[480px] rounded-xl border border-border bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] p-5 lg:p-6">
        <div className="mb-3 flex items-start gap-2.5">
          <I.warning s={20} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-claret-300">
              Irreversible · Hatua ya dharura
            </p>
            <h2 className="mt-0.5 font-display text-[18px] font-bold text-text leading-tight">
              Cancel this market & refund everyone?
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-text-muted leading-relaxed mb-1.5 line-clamp-2">
          <span className="text-text-subtle">Market:</span> {title}
        </p>
        <div className="text-[13px] text-text-muted leading-relaxed mb-3">
          <p><strong>This is final.</strong> Every open stake is refunded in full, the live pool closes, and an immutable compliance entry is recorded. No payouts, no fees.</p>
        </div>
        <label className="block mb-4">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-1.5">
            Reason (required) · Sababu
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            autoFocus
            placeholder="e.g. Suspended by directive of the Gaming Board"
            className="w-full rounded-md border border-border bg-bg-inset px-3 py-2 text-[16px] text-text outline-none admin-focus"
          />
          <span className="mt-1 block font-mono text-[10px] text-text-subtle">{reason.trim().length}/500 — minimum 5 characters</span>
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onConfirm} disabled={!canConfirm} className="btn btn-claret btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {pending ? "Voiding…" : "Yes, cancel & refund all"}
          </button>
          <button type="button" onClick={onCancel} disabled={pending} className="btn btn-ghost btn-md w-full">
            Not now · Bado
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
