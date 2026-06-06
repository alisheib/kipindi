"use client";

import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";

/**
 * Two kit-faithful action buttons per report — Excel + PDF.
 *
 * Excel button = `btn btn-yes` tonal (matches the spreadsheet green
 * convention every operator already recognises from Excel + Sheets).
 * PDF button   = `btn btn-claret` tonal (red association from Acrobat).
 *
 * Both use btn-sm height so two CTAs fit cleanly in a report-row's
 * action column without crowding the description. Generation is a
 * fire-and-forget — the browser navigates to /api/admin/reports/<id>
 * and the server streams the file with a Content-Disposition header
 * that triggers the native download.
 */

type Format = "xlsx" | "pdf";

function downloadReport(id: string, format: Format) {
  const url = `/api/admin/reports/${id}?format=${format}`;
  // Use a temporary iframe rather than window.open so the download
  // doesn't briefly flash a tab. Anchor-with-download also works but
  // some browsers ignore the attribute for cross-origin responses;
  // the iframe approach is more consistent.
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  // Clean up after 30s; the browser holds onto the response stream.
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 30_000);
}

export function GenerateButton({ id }: { id: string }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const { toast } = useToast();

  const handle = (format: Format) => {
    if (busy) return;
    setBusy(format);
    try {
      downloadReport(id, format);
      toast({
        title: format === "xlsx" ? "Excel report generating" : "PDF report generating",
        description: "Your branded file will download in a moment.",
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Could not start download",
        description: String((e as Error)?.message ?? e),
        variant: "danger",
      });
    } finally {
      // Re-enable buttons after a short cooldown so a misclick doesn't
      // double-download. The server is idempotent but the UX is better.
      setTimeout(() => setBusy(null), 1500);
    }
  };

  return (
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
  );
}
