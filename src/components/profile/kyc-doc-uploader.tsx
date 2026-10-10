"use client";

/**
 * KYC document uploader slot. Pick a photo → resize client-side to a legible
 * but bounded JPEG (max 1400px, stepped quality to stay under the 3 MB cap) →
 * post as a base64 data URL to attachDocumentAction. Shows a live thumbnail +
 * "attached" state. One slot per document type (front / back / selfie).
 *
 * ⭐ THE AGENT PHOTO TRACK ONLY, FROM 2026-10-10 (owner ruling: players verify with typed details; agent
 * applicants keep photo identity reviewed by an officer). /profile/kyc mounts it in agent mode alone.
 * ⛔ `KycExtraDocUploader` (an officer's extra-document request) is DELETED with `attachExtraDocument`: officers
 * ask only for corrections of typed details now, and requests already on file render as text on the page.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { attachDocumentAction } from "@/app/profile/kyc/actions";
import { fileToDataUrl, MAX_DOC_BYTES as MAX_BYTES } from "@/lib/client/kyc-image";
import type { KycDocSlot } from "@/lib/id-documents";
import { errorCopy } from "@/lib/error-copy";
import { refusalReason, refusalVariant } from "@/lib/failure-reasons";

export function KycDocUploader({
  docType, label, attached, locked,
}: {
  // ⛔ THE SLOT UNION IS THE CATALOGUE’S, not this file’s. A literal here is
  // what kept PASSPORT / DRIVER_LICENSE / VOTER_CARD unreachable from the product
  // while they sat in the database enum.
  docType: KycDocSlot;
  label: string;
  attached: boolean;
  locked?: boolean; // submission under review / approved → no changes
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(attached);
  // `busy` covers the client-side resize (fileToDataUrl) BEFORE the transition
  // starts — on a big phone photo that's a 1–2s dead zone the old code showed
  // no spinner. `pending` then covers the server action. The slot shows a
  // spinner + label for the whole pick → resize → upload → done span.
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  const working = busy || pending;

  const onFile = async (f: File | null) => {
    if (!f) return;
    // §F2/§F3 (R5-I): the three checks of the picked file are slips the player can fix — the calm `factual` toast.
    if (!f.type.startsWith("image/")) { toast({ title: t.toast.notAnImage, description: t.toast.pickJpgPng, variant: "factual" }); return; }
    setBusy(true); // spinner on from the instant a file is picked
    let dataUrl: string;
    try { dataUrl = await fileToDataUrl(f); }
    catch { setBusy(false); toast({ title: t.toast.couldntReadImage, description: t.toast.pickJpgPng, variant: "factual" }); return; }
    if (dataUrl.length * 0.75 > MAX_BYTES) { setBusy(false); toast({ title: t.toast.imageTooLarge, description: t.toast.trySmallerPhoto, variant: "factual" }); return; }
    setPreview(dataUrl);
    start(async () => {
      const fd = new FormData();
      fd.set("docType", docType);
      fd.set("image", dataUrl);
      // B-12 — a KYC upload on a dropping connection throws mid-transition;
      // uncaught, the whole KYC page (and the player's progress) becomes error.tsx.
      let r: Awaited<ReturnType<typeof attachDocumentAction>>;
      try {
        r = await attachDocumentAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (!r.ok) { setPreview(null); setBusy(false); toast({ title: t.toast.uploadFailed, description: errorCopy(t, r), variant: refusalVariant(refusalReason(r)), durationMs: 0 }); return; } // DS-26 — an identity-document failure stays until read; §F2/§F3 (R5-I) at the registry's rank
      setDone(true);
      setBusy(false);
      toast({ title: t.toast.documentAttached, variant: "success" });
      router.refresh();
    });
  };

  const showThumb = preview;

  return (
    // 2026-09-13 — the slot FILLS its grid cell (the cell stretches to the row), so a label that wraps to
    // two lines in one slot no longer leaves its neighbours shorter: one row, one card height.
    // 2026-09-14 — and its content is TOP-aligned (a flex column): a button centres by default, so a one-line
    // label sat ~9px lower than its two-line neighbours in sw. Done state is the app-state success family
    // (§B2a), never the betting YES ink.
    <div className="relative h-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        aria-label={label}
        title={label}
        onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
      <button
        type="button"
        onClick={() => !locked && !working && inputRef.current?.click()}
        disabled={working || locked}
        aria-busy={working ? "true" : "false"}
        aria-label={done ? t.profile.docAttachedReplace.replace("{label}", label) : t.profile.docAttach.replace("{label}", label)}
        /* ⛔ NO GOLD ON AN UPLOAD TILE (R5-C, the second gold audit, 2026-10-09). An identity document is not money (Q5):
           the idle tile's hover was a brand edge over a GOLD wash, and the working tile gold. Both are the brand family
           now — the hover's edge and wash, and the working tile HOLDS that look (it is the tile the player just tapped). */
        className={`flex h-full w-full flex-col items-center justify-start overflow-hidden rounded-md border-2 border-dashed p-[14px] text-center transition-colors ${
          locked ? "border-border bg-bg-overlay/30 cursor-not-allowed opacity-70"
          : working ? "border-brand-400 bg-brand-500/[0.06] cursor-wait"
          : done ? "border-success-border bg-success-500/[0.07] cursor-pointer hover:border-success-500"
          : "border-border bg-bg-overlay/40 hover:border-brand-400 hover:bg-brand-500/[0.06] cursor-pointer"
        }`}
      >
        {showThumb ? (
          // Dim the preview while the resize/upload is in flight so the spinner
          // below reads as "working on this photo", not "done".
          <img src={showThumb} alt={label} className={`mx-auto mb-1.5 h-16 w-auto rounded object-contain transition-opacity ${working ? "opacity-40" : ""}`} />
        ) : (
          // ⛔ LITERAL, NOT `h-8 w-8` — `theme.extend.spacing` is overridden
          // (tailwind.config.ts:200-215), so that pair renders 48×48px. 40px is the
          // kit's badge disc (= --tap-min) around a 14px glyph.
          <span className={`mx-auto mb-1.5 h-[40px] w-[40px] inline-flex items-center justify-center rounded-full ${
            done ? "border border-success-border bg-success-bg text-success-fg" : "bg-bg-overlay text-text-subtle border border-border"
          }`}>
            {/* C1b — per-slot silhouette line-art: ID card for NIDA front/back,
                person for the selfie slot. */}
            {/* M5 — the done-check ARRIVES on the state change via the settle primitive. */}
            {working ? <Spinner size={14} /> : done ? <I.check s={14} className="g-settle" /> : (docType === "SELFIE" ? <I.user s={14} /> : <I.idCard s={14} />)}
          </span>
        )}
        <span className="block font-display text-[12px] font-semibold text-text">{label}</span>
        {/* Spinner sits NEXT TO the status text so a slow resize/upload always
            shows live motion — the static "Uploading…" alone felt stuck. */}
        {/* 2026-09-14 — the caption breaks only at its " · ", each half kept whole: in three side-by-side cards
            "Attached · tap to replace" left "replace" alone on a second line (visual pass 2). */}
        <span className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1.5 font-mono text-[10.5px] text-text-subtle">
          {working && <Spinner size={11} />}
          {(locked ? t.profile.docLocked : pending ? t.common.uploading : busy ? t.common.preparing : done ? t.profile.docTapReplace : t.profile.docTapAttach)
            .split(" · ")
            .map((part, i) => <span key={i} className="whitespace-nowrap">{i > 0 ? "· " : ""}{part}</span>)}
        </span>
      </button>
    </div>
  );
}
