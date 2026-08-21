"use client";

import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { exportPlayerDataAction } from "./actions";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

/** Officer-triggered GDPR Art. 15 export — downloads the player's data bundle. */
export function ExportPlayerButton({ userId }: { userId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

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
      className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated text-text-secondary hover:text-text hover:border-[var(--brand-500)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <I.download s={12} /> {loading ? "Exporting…" : "Export user data · GDPR Art 15"}
    </button>
  );
}
