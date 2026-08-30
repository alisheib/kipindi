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
  // Which format the failure card offers to retry — the last one attempted.
  const [lastFormat, setLastFormat] = useState<Format | null>(null);
  const overlay = useActionOverlay();
  const { toast } = useToast();

  const handle = async (format: Format) => {
    if (busy) return;
    setBusy(format);
    setLastFormat(format);
    const label = format === "xlsx" ? "Excel" : "PDF";
    overlay.run(`Generating ${label} report…`, "Building the branded document from live data. This may take a few seconds.");
    try {
      // A report build is a live DB read plus a full document render. Un-signalled, a
      // black-holed response never settles — and the running overlay is DELIBERATELY
      // non-dismissible (no Esc, no scrim, no ✕, and both buttons stay disabled by
      // `busy` because `finally` never runs), so the officer's only exit was a page
      // reload. 60s is generous against the slowest catalogue entry and still finite.
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}?format=${format}`, {
        signal: AbortSignal.timeout(60_000),
      });
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
      // A timeout is a DIFFERENT fact from a dropped connection, and the raw DOMException
      // message ("signal timed out", "Failed to fetch") is transport prose, not operator
      // copy. Same discriminator the payout adapter uses — `selcom.ts` isAbort().
      // ⛔ The timeout copy says what WE know and no more. Giving up on the response tells
      // us nothing about what the server did with the request — it may still be building
      // the document, and this route audits every attempt — so it claims only that the
      // download did not arrive, never that nothing happened.
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      overlay.fail(
        timedOut ? `${label} report timed out` : "Download failed",
        timedOut
          ? "The server did not answer within 60 seconds, so the download was abandoned. Try again — and tell an engineer if it keeps timing out."
          : "Network error — check your connection, then try again.",
      );
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
          className="btn btn-ghost btn-sm rounded-pill"
        >
          <I.fileSpreadsheet s={13} aria-hidden />
          <span className="ml-1.5 font-mono text-micro font-bold uppercase tracking-[0.12em]">
            {busy === "xlsx" ? "…" : "Excel"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handle("pdf")}
          disabled={busy !== null}
          title="Download as PDF"
          aria-label="Download PDF report"
          className="btn btn-ghost btn-sm rounded-pill"
        >
          <I.fileText s={13} aria-hidden />
          <span className="ml-1.5 font-mono text-micro font-bold uppercase tracking-[0.12em]">
            {busy === "pdf" ? "…" : "PDF"}
          </span>
        </button>
      </div>
      {/* A report build writes nothing and charges nothing, so a failed one is safely
          repeatable — the failure card offers the same format straight back. */}
      <ActionOverlay
        state={overlay.state}
        onDismiss={overlay.dismiss}
        onRetry={lastFormat ? () => { void handle(lastFormat); } : undefined}
      />
    </>
  );
}
