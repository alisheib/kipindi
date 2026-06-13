/**
 * Client-side KYC image prep — shared by the document uploaders.
 * Resizes a picked photo to a legible but bounded JPEG (max 1400px, stepped
 * quality to stay under the 3 MB decoded cap the server enforces) and returns
 * it as a base64 data URL. Browser-only (uses Image/canvas) — import from
 * client components.
 */
export const MAX_DOC_DIM = 1400;
export const MAX_DOC_BYTES = 3 * 1024 * 1024;

export async function fileToDataUrl(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not read image."));
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, MAX_DOC_DIM / Math.max(img.naturalWidth, img.naturalHeight));
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
  while (url.length * 0.75 > MAX_DOC_BYTES && q > 0.4) { q -= 0.12; url = c.toDataURL("image/jpeg", q); }
  return url;
}
