"use client";

/**
 * ADM3 — KYC document viewer. ID front/back/selfie tabs, zoom (100/200/fit) and
 * rotate over the admin-gated /api/admin/kyc-doc route. The meta strip shows the
 * REAL document metadata; liveness/EXIF are honestly marked "not captured at
 * upload" rather than fabricating a score for a feed that doesn't exist yet.
 */
import { useState } from "react";
import { I } from "@/components/ui/glyphs";

type Slot = { type: "NIDA_FRONT" | "NIDA_BACK" | "SELFIE"; label: string; uploadedAt: string | null };

export function KycDocViewer({ userId, slots }: { userId: string; slots: Slot[] }) {
  const firstPresent = slots.find((s) => s.uploadedAt) ?? slots[0];
  const [active, setActive] = useState(firstPresent?.type ?? "NIDA_FRONT");
  const [zoom, setZoom] = useState<"fit" | "100" | "200">("fit");
  const [rot, setRot] = useState(0);

  const current = slots.find((s) => s.type === active);
  const present = !!current?.uploadedAt;
  const src = `/api/admin/kyc-doc?user=${encodeURIComponent(userId)}&type=${active}`;

  const scale = zoom === "fit" ? "100%" : zoom === "100" ? "100%" : "200%";
  const objectFit = zoom === "fit" ? "contain" : "none";

  return (
    <div className="space-y-2.5">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((s) => {
          const on = s.type === active;
          const has = !!s.uploadedAt;
          return (
            <button
              key={s.type}
              type="button"
              onClick={() => { setActive(s.type); setRot(0); }}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 h-8 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors"
              style={on
                ? { borderColor: "var(--brand-500)", background: "color-mix(in oklab, var(--brand-500) 14%, transparent)", color: "var(--brand-200)" }
                : { borderColor: "var(--border)", color: has ? "var(--text-muted)" : "var(--text-subtle)" }}
            >
              {s.label}{has ? "" : " ·—"}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          {(["fit", "100", "200"] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className="rounded-md border px-2 h-8 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors"
              style={zoom === z ? { borderColor: "var(--brand-500)", color: "var(--brand-200)" } : { borderColor: "var(--border)", color: "var(--text-subtle)" }}
            >
              {z === "fit" ? "Fit" : `${z}%`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRot((r) => (r + 90) % 360)}
            title="Rotate"
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-subtle hover:text-text transition-colors"
          >
            <I.rotateCcw s={14} />
          </button>
        </div>
      </div>

      {/* Viewer — the one legitimately light-framed surface in admin (documents
          are photographed on paper), inset 12px on a panel-dark backdrop. */}
      <div className="rounded-lg bg-bg-sunken" style={{ padding: 12 }}>
        <div className="relative flex h-[340px] w-full items-center justify-center overflow-auto rounded-md" style={{ background: "#0b0e1a" }}>
          {present ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={current?.label}
              className="select-none"
              style={{ maxWidth: scale, maxHeight: zoom === "fit" ? "100%" : "none", width: objectFit === "none" ? scale : "auto", objectFit, transform: `rotate(${rot}deg)`, transition: "transform 0.2s" }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-subtle">
              <I.idCard s={28} />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Not uploaded</span>
            </div>
          )}
        </div>
      </div>

      {/* Meta strip — real metadata; liveness/EXIF honestly marked unavailable. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-text-tertiary">
        <span>{current?.label}</span>
        <span>· {present ? `uploaded ${current?.uploadedAt?.slice(0, 19).replace("T", " ")}` : "no file"}</span>
        <span className="text-text-subtle">· liveness/EXIF: not captured at upload</span>
        {present && (
          <a href={src} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-royal-300 hover:underline">
            <I.externalLink s={11} /> open full size
          </a>
        )}
      </div>
    </div>
  );
}
