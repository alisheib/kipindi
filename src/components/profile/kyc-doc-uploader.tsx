"use client";

/**
 * KYC document uploader slot. Pick a photo → resize client-side to a legible
 * but bounded JPEG (max 1400px, stepped quality to stay under the 3 MB cap) →
 * post as a base64 data URL to attachDocumentAction. Shows a live thumbnail +
 * "attached" state. One slot per document type (front / back / selfie).
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { attachDocumentAction, attachExtraDocumentAction } from "@/app/profile/kyc/actions";
import { fileToDataUrl, MAX_DOC_BYTES as MAX_BYTES } from "@/lib/client/kyc-image";

export function KycDocUploader({
  docType, label, attached, locked,
}: {
  docType: "NIDA_FRONT" | "NIDA_BACK" | "SELFIE";
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

  const working = busy || pending;

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast({ title: "Not an image", description: "Pick a JPG, PNG, or WebP photo.", variant: "danger" }); return; }
    setBusy(true); // spinner on from the instant a file is picked
    let dataUrl: string;
    try { dataUrl = await fileToDataUrl(f); }
    catch (err) { setBusy(false); toast({ title: "Couldn't read image", description: (err as Error).message, variant: "danger" }); return; }
    if (dataUrl.length * 0.75 > MAX_BYTES) { setBusy(false); toast({ title: "Image too large", description: "Try a smaller photo.", variant: "danger" }); return; }
    setPreview(dataUrl);
    start(async () => {
      const fd = new FormData();
      fd.set("docType", docType);
      fd.set("image", dataUrl);
      const r = await attachDocumentAction(fd);
      if (!r.ok) { setPreview(null); setBusy(false); toast({ title: "Upload failed", description: r.error, variant: "danger" }); return; }
      setDone(true);
      setBusy(false);
      toast({ title: `${label.split(" ·")[0]} attached`, variant: "success" });
      router.refresh();
    });
  };

  const showThumb = preview;

  return (
    <div className="relative">
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
        aria-label={done ? `${label} attached — tap to replace` : `Attach ${label}`}
        className={`w-full overflow-hidden rounded-md border-2 border-dashed p-3.5 text-center transition-colors ${
          locked ? "border-border bg-bg-overlay/30 cursor-not-allowed opacity-70"
          : working ? "border-gold-700 bg-gold-500/[0.06] cursor-wait"
          : done ? "border-yes-700 bg-yes-500/[0.07] cursor-pointer hover:border-yes-500"
          : "border-border bg-bg-overlay/40 hover:border-gold-700 hover:bg-gold-500/[0.06] cursor-pointer"
        }`}
      >
        {showThumb ? (
          <img src={showThumb} alt="" className="mx-auto mb-1.5 h-16 w-auto rounded object-contain" />
        ) : (
          <span className={`mx-auto mb-1.5 h-6 w-6 inline-flex items-center justify-center rounded-pill ${
            done ? "bg-yes-500 text-yes-950" : "bg-bg-overlay text-text-subtle border border-border"
          }`}>
            {working ? <Spinner size={12} /> : done ? <I.check s={11} /> : "+"}
          </span>
        )}
        <span className="block font-display text-[12px] font-semibold text-text">{label}</span>
        <span className="mt-0.5 block font-mono text-[10.5px] text-text-subtle">
          {locked ? "Locked" : pending ? "Uploading…" : busy ? "Preparing…" : done ? "Attached · tap to replace" : "Tap to attach"}
        </span>
      </button>
    </div>
  );
}

/**
 * Uploader for an officer-requested extra document. Same pick → resize →
 * upload → done UX as KycDocUploader, but keyed by request id and labelled
 * with the officer's written description so the player knows exactly what to
 * provide. Renders the description as a full-width row (it can be long).
 */
export function KycExtraDocUploader({
  requestId, description, attached,
}: {
  requestId: string;
  description: string;
  attached: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(attached);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const working = busy || pending;

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast({ title: "Not an image", description: "Pick a JPG, PNG, or WebP photo.", variant: "danger" }); return; }
    setBusy(true);
    let dataUrl: string;
    try { dataUrl = await fileToDataUrl(f); }
    catch (err) { setBusy(false); toast({ title: "Couldn't read image", description: (err as Error).message, variant: "danger" }); return; }
    if (dataUrl.length * 0.75 > MAX_BYTES) { setBusy(false); toast({ title: "Image too large", description: "Try a smaller photo.", variant: "danger" }); return; }
    setPreview(dataUrl);
    start(async () => {
      const fd = new FormData();
      fd.set("requestId", requestId);
      fd.set("image", dataUrl);
      const r = await attachExtraDocumentAction(fd);
      if (!r.ok) { setPreview(null); setBusy(false); toast({ title: "Upload failed", description: r.error, variant: "danger" }); return; }
      setDone(true);
      setBusy(false);
      toast({ title: "Document attached", variant: "success" });
      router.refresh();
    });
  };

  return (
    <div className="rounded-md border border-gold-700/40 bg-gold-500/[0.04] p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label={description}
        title={description}
        onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
      <div className="flex items-center gap-3">
        <span className={`shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-pill ${
          done ? "bg-yes-500 text-yes-950" : "bg-bg-overlay text-text-subtle border border-border"
        }`}>
          {working ? <Spinner size={14} /> : done ? <I.check s={14} /> : <I.plus s={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-text leading-snug">{description}</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-text-subtle">
            {pending ? "Uploading…" : busy ? "Preparing…" : done ? "Attached · tap to replace" : "Tap to attach a photo"}
          </p>
        </div>
        {preview && <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded object-cover border border-border" />}
        <button
          type="button"
          onClick={() => !working && inputRef.current?.click()}
          disabled={working}
          aria-busy={working ? "true" : "false"}
          className={`btn btn-sm shrink-0 ${done ? "btn-ghost" : "btn-gold"}`}
          style={{ borderRadius: 999, minHeight: 40 }}
        >
          {done ? "Replace" : "Upload"}
        </button>
      </div>
    </div>
  );
}
