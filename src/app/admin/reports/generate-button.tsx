"use client";

import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";

/**
 * Two kit-faithful action buttons per report — Excel + PDF.
 *
 * Uses fetch + blob to download so we can catch server errors and show
 * them in the ActionOverlay instead of silently failing.
 */

type Format = "xlsx" | "pdf";

export function GenerateButton({ id }: { id: string }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const overlay = useActionOverlay();
  const { toast } = useToast();

  const handle = async (format: Format) => {
    if (busy) return;
    setBusy(format);
    const label = format === "xlsx" ? "Excel" : "PDF";
    overlay.run(`Generating ${label} report…`, "Building the branded document from live data. This may take a few seconds.");
    try {
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}?format=${format}`);
      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try { const j = await res.json(); msg = j.error || msg; } catch { /* body isn't JSON */ }
        overlay.fail(`${label} report failed`, msg);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `50pick-report.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      overlay.succeed(`${label} downloaded`, filename);
    } catch (e) {
      overlay.fail("Download failed", String((e as Error)?.message ?? "Network error — check your connection."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handle("xlsx")}
          disabled={busy !== null}
          title="Download as Excel (.xlsx)"
          aria-label="Download Excel report"
          className="btn btn-yes btn-sm rounded-pill"
        >
          <I.fileSpreadsheet size={13} aria-hidden />
          <span className="ml-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]">
            {busy === "xlsx" ? "…" : "Excel"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handle("pdf")}
          disabled={busy !== null}
          title="Download as PDF"
          aria-label="Download PDF report"
          className="btn btn-claret btn-sm rounded-pill"
        >
          <I.fileText size={13} aria-hidden />
          <span className="ml-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]">
            {busy === "pdf" ? "…" : "PDF"}
          </span>
        </button>
      </div>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </>
  );
}
