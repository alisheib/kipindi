"use client";

/**
 * AvatarUploader — pick a photo from the file picker, square-crop it,
 * resize to 256×256, encode as ~80% JPEG, and POST as a base64 data URL
 * to the server action. Stays well under the 96 KB cap.
 *
 * Drag-to-replace via the camera badge in the bottom-right of the avatar.
 * The avatar in the parent header is the canonical preview — we don't
 * render a second one here.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { updateAvatarAction } from "@/app/profile/actions";

const TARGET_PX = 256;
const JPEG_QUALITY = 0.82;

async function fileToSquareDataUrl(file: File): Promise<string> {
  // Read into an Image, then square-crop + resize via a canvas.
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not read image."));
    i.src = URL.createObjectURL(file);
  });
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const c = document.createElement("canvas");
  c.width = TARGET_PX;
  c.height = TARGET_PX;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_PX, TARGET_PX);
  URL.revokeObjectURL(img.src);
  return c.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function AvatarUploader({
  initials,
  seed,
  currentSrc,
  size = "xl",
}: {
  initials: string;
  seed?: string;
  currentSrc?: string | null;
  size?: "lg" | "xl" | "2xl";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentSrc ?? null);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const { t } = useT();
  const router = useRouter();

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: t.toast.notAnImage, description: t.toast.pickJpgPng, variant: "danger" });
      return;
    }
    try {
      const dataUrl = await fileToSquareDataUrl(f);
      setPreview(dataUrl);
      start(async () => {
        const fd = new FormData();
        fd.set("dataUrl", dataUrl);
        const r = await updateAvatarAction(fd);
        if (!r.ok) {
          toast({ title: t.toast.nameFailed, description: r.error, variant: "danger" });
          return;
        }
        toast({ title: t.toast.photoUpdated, variant: "success" });
        router.refresh();
      });
    } catch (err) {
      toast({ title: t.toast.couldntReadImage, description: (err as Error).message, variant: "danger" });
    }
  };

  const clear = () => {
    setPreview(null);
    start(async () => {
      const fd = new FormData();
      fd.set("dataUrl", "");
      const r = await updateAvatarAction(fd);
      if (!r.ok) {
        toast({ title: t.toast.nameFailed, description: r.error, variant: "danger" });
        return;
      }
      toast({ title: t.toast.photoRemoved, variant: "default" });
      router.refresh();
    });
  };

  return (
    <div className="relative inline-block">
      <Avatar
        initials={initials}
        seed={seed}
        size={size}
        src={preview ?? undefined}
        className="ring-2 ring-bg-elevated/80 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]"
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Profile photo"
        title="Profile photo"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {/* Camera button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label="Change profile photo"
        className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-pill border border-border bg-bg-elevated text-text-muted hover:text-text hover:border-gold-500 transition-colors disabled:opacity-50 shadow-e2"
      >
        {pending ? <Spinner size={13} /> : <I.camera s={13} />}
      </button>

      {/* Clear button — only when an avatar exists */}
      {preview && !pending && (
        <button
          type="button"
          onClick={clear}
          aria-label="Remove profile photo"
          className="absolute -top-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-pill border border-border bg-bg-elevated text-text-subtle hover:text-no-300 hover:border-no-700 transition-colors shadow-e2"
        >
          <I.trash s={11} />
        </button>
      )}
    </div>
  );
}
