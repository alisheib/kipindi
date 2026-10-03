"use client";

import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";

/**
 * The tax report's three downloads — PDF, Excel, CSV — for EXACTLY the period and product on
 * screen: `query` is built by the page from the same `taxQueryString` its own links use, so the
 * file and the screen name one period by construction (`docs/TAX-REPORT.md` §7).
 *
 * ⛔ NOT `GenerateButton`. That control is pinned — by `test:report-formats` — to the shared reports
 * route and to exactly two formats; this report has its own route and a third format. The
 * behaviour is the same on purpose: fetch, catch a server refusal and SAY it, download the blob
 * under the server's filename, and never hang (60-second ceiling).
 * Read-only: a download writes nothing but its own audit row, so it needs no act gate.
 */

type Format = "pdf" | "xlsx" | "csv";
const LABEL: Record<Format, string> = { pdf: "PDF", xlsx: "Excel", csv: "CSV" };

export function TaxExportButtons({ query, title, disabledReason }: {
  query: string;
  /** What the files cover — the tooltip states the period and product. */
  title: string;
  /** Set when there is nothing to download (a period that has not started). */
  disabledReason?: string;
}) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [last, setLast] = useState<Format | null>(null);
  const overlay = useActionOverlay();

  const run = async (format: Format) => {
    if (busy) return;
    setBusy(format);
    setLast(format);
    const label = LABEL[format];
    overlay.run(`Generating the ${label} file…`, "Building the Government Tax Report from the books. This may take a few seconds.");
    try {
      const res = await fetch(`/api/admin/tax/export?format=${format}&${query}`, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try { const j = await res.json(); msg = j.error || msg; } catch { /* not JSON */ }
        overlay.fail(`${label} download failed`, msg);
        return;
      }
      const blob = await res.blob();
      const match = res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `50pick-government-tax-report.${format}`;
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
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      overlay.fail(
        timedOut ? `${label} download timed out` : "Download failed",
        timedOut
          ? "The server did not answer within 60 seconds, so the download was abandoned. Try again."
          : "Network error — check your connection, then try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const btn = (format: Format, glyph: React.ReactNode) => (
    <Button
      key={format}
      type="button"
      variant="ghost"
      size="xs"
      className="rounded-pill"
      loading={busy === format}
      disabled={(busy !== null && busy !== format) || !!disabledReason}
      onClick={() => run(format)}
      title={disabledReason ?? `${title} — ${LABEL[format]}`}
      aria-label={`Download the tax report as ${LABEL[format]}`}
      data-testid={`tax-export-${format}`}
      leading={glyph}
    >
      <span className="font-mono text-micro font-bold uppercase eyebrow">{LABEL[format]}</span>
    </Button>
  );

  return (
    <>
      <div className="inline-flex flex-wrap items-center gap-1.5">
        {btn("pdf", <I.fileText s={13} aria-hidden />)}
        {btn("xlsx", <I.fileSpreadsheet s={13} aria-hidden />)}
        {btn("csv", <I.download s={13} aria-hidden />)}
      </div>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} onRetry={last ? () => { void run(last); } : undefined} />
    </>
  );
}
