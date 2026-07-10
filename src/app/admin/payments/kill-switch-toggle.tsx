"use client";

/**
 * ADM4 — per-MNO kill-switch. Pausing a flow is the hard confirm tier: the
 * officer types PAUSE to arm it. Resuming is a direct toggle. Paused flows are
 * enforced in the deposit/withdrawal money path and audited.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { toggleKillSwitchAction } from "./payment-actions";

export function KillSwitch({
  provider,
  label,
  deposits,
  withdrawals,
}: {
  provider: string;
  label: string;
  deposits: boolean;
  withdrawals: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <FlowToggle provider={provider} providerLabel={label} kind="deposits" paused={deposits} />
      <FlowToggle provider={provider} providerLabel={label} kind="withdrawals" paused={withdrawals} />
    </div>
  );
}

function FlowToggle({ provider, providerLabel, kind, paused }: { provider: string; providerLabel: string; kind: "deposits" | "withdrawals"; paused: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [word, setWord] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const apply = (next: boolean) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("provider", provider);
      fd.set("kind", kind);
      fd.set("paused", String(next));
      const r = await toggleKillSwitchAction(fd);
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      toast({ title: next ? `${providerLabel} ${kind} PAUSED` : `${providerLabel} ${kind} resumed`, variant: next ? "warning" : "success" });
      setConfirm(false); setWord("");
      router.refresh();
    });
  };

  const flowLabel = kind === "deposits" ? "Deposits" : "Withdrawals";

  if (confirm) {
    const armed = word.trim().toUpperCase() === "PAUSE";
    return (
      <div className="rounded-md border border-claret-edge bg-claret-soft/50 p-2 space-y-1.5">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] font-bold text-claret-300">Type PAUSE to stop {flowLabel.toLowerCase()}</p>
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="PAUSE" autoComplete="off" className="h-7 w-full rounded-sm border border-claret-edge bg-bg-overlay px-2 font-mono text-[12px] uppercase tracking-[0.2em] text-text admin-focus placeholder:text-text-subtle" />
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" disabled={!armed || pending} onClick={() => apply(true)} className="btn btn-claret btn-sm disabled:opacity-40">Pause</button>
          <button type="button" onClick={() => { setConfirm(false); setWord(""); }} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (paused ? apply(false) : setConfirm(true))}
      className="flex items-center justify-between gap-1.5 rounded-md border px-2.5 h-9 transition-colors disabled:opacity-50"
      style={paused
        ? { borderColor: "var(--claret-edge)", background: "var(--claret-soft)", color: "var(--claret-200)" }
        : { borderColor: "var(--border)", color: "var(--text-muted)" }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.1em]">{flowLabel}</span>
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold">
        {paused ? <><I.pause s={11} /> PAUSED</> : <><I.check s={11} className="text-yes-300" /> LIVE</>}
      </span>
    </button>
  );
}
