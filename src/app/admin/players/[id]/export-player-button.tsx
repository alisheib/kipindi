"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { exportPlayerDataAction } from "./actions";

/** Officer-triggered GDPR Art. 15 export — downloads the player's data bundle. */
export function ExportPlayerButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const click = async () => {
    setLoading(true);
    try {
      const result = await exportPlayerDataAction(userId);
      if (!result.ok) {
        toast({ title: "Export failed", description: result.error, variant: "danger" });
        return;
      }
      const blob = new Blob([result.payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Data exported", description: result.filename, variant: "success" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={click}
      disabled={loading}
      aria-busy={loading}
      className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated text-text-secondary hover:text-text hover:border-aqua-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download size={12} aria-hidden /> {loading ? "Exporting…" : "Export user data · GDPR Art 15"}
    </button>
  );
}
