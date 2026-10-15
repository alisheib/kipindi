"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";

type Format = "pdf" | "xlsx" | "csv";
const LABEL: Record<Format, string> = { pdf: "PDF", xlsx: "Excel", csv: "CSV" };

/** Read-only downloads; the server verifies role, 2FA, origin and the audit row. */
export function MeasuresExportButtons({ query, title }: { query: string; title: string }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [last, setLast] = useState<Format | null>(null);
  const overlay = useActionOverlay();

  const run = async (format: Format) => {
    if (busy) return;
    setBusy(format);
    setLast(format);
    const label = LABEL[format];
    overlay.run(`Generating the ${label} file…`, `Building ${title} from the measures. This may take a few seconds.`);
    try {
      const res = await fetch(`/api/admin/journey-measures/export?format=${format}&${query}`, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try { const body = await res.json(); msg = body.error || msg; } catch { /* no JSON */ }
        overlay.fail(`${label} download failed`, msg);
        return;
      }
      const blob = await res.blob();
      const match = res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `50pick-simplified-journey-measures.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      overlay.succeed(`${label} downloaded`, filename);
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      overlay.fail(timedOut ? `${label} download timed out` : "Download failed", timedOut
        ? "The server did not answer within 60 seconds. Try again."
        : "Network error — check your connection, then try again.");
    } finally { setBusy(null); }
  };

  const button = (format: Format, glyph: React.ReactNode) => <Button
    key={format} type="button" variant="ghost" size="xs" className="rounded-pill"
    leading={glyph} loading={busy === format} disabled={busy !== null && busy !== format}
    title={`${title} — ${LABEL[format]}`} aria-label={`Download the Simplified Journey measures as ${LABEL[format]}`}
    data-testid={`journey-measures-export-${format}`} onClick={() => { void run(format); }}
  ><span className="font-mono text-micro font-bold uppercase eyebrow">{LABEL[format]}</span></Button>;

  return <><div className="mt-2 inline-flex flex-wrap items-center gap-1.5">
    {button("pdf", <I.fileText s={13} aria-hidden />)}
    {button("xlsx", <I.fileSpreadsheet s={13} aria-hidden />)}
    {button("csv", <I.download s={13} aria-hidden />)}
  </div><ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} onRetry={last ? () => { void run(last); } : undefined} /></>;
}
