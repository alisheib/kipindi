"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { exportGbtMonthly, exportTraTax, exportFiuSar, exportSxRegister, exportIsoAudit } from "./export-actions";

const ACTIONS: Record<string, () => Promise<{ ok: true; filename: string; mime: string; payload: string } | { ok: false; error: string }>> = {
  "gbt-monthly":  exportGbtMonthly,
  "tra-tax":      exportTraTax,
  "fiu-sar":      exportFiuSar,
  "sx-register":  exportSxRegister,
  "iso-audit":    exportIsoAudit,
};

export function GenerateButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const action = ACTIONS[id];

  const click = async () => {
    if (!action) {
      toast({ title: "Coming soon", description: "Generation wired in next iteration.", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      const r = await action();
      if (!r.ok) {
        toast({ title: "Generation failed", description: r.error, variant: "danger" });
        return;
      }
      const blob = new Blob([r.payload], { type: r.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Report generated", description: r.filename, variant: "success" });
    } finally {
      setBusy(false);
    }
  };

  const enabled = !!action;
  return (
    <button
      type="button"
      onClick={click}
      disabled={!enabled || busy}
      title={enabled ? "Download CSV" : "Generation wired in next iteration"}
      className={[
        "font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md transition-colors",
        enabled
          ? "border border-gold bg-gold/10 text-gold hover:bg-gold/20"
          : "border border-border bg-bg-elevated text-text-tertiary cursor-not-allowed",
        busy && "opacity-60 cursor-progress",
      ].join(" ")}
    >
      <Download size={11} aria-hidden /> {busy ? "Generating…" : "Generate"}
    </button>
  );
}
