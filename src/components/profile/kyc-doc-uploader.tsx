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
import { attachDocumentAction } from "@/app/profile/kyc/actions";

const MAX_DIM = 1400;
const MAX_BYTES = 3 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not read image."));
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  let q = 0.82;
  let url = c.toDataURL("image/jpeg", q);
  // Step quality down if the encoded image is over the cap.
  while (url.length * 0.75 > MAX_BYTES && q > 0.4) { q -= 0.12; url = c.toDataURL("image/jpeg", q); }
  return url;
}

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
