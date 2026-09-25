/**
 * Logo sync proof. Does NOT write into the repo.
 *  1) Regenerate the master SVGs from src/lib/brand-mark.ts and TEXT-compare
 *     them with what is committed in public/brand/.
 *  2) Re-rasterise mark-color at 512 and compare RAW PIXELS with the committed
 *     public/icons/mark-color-512.png (byte-compare is not safe across libvips
 *     versions; pixel-compare is the honest test of "same image").
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { markSvg, maskableSvg, tileSvg } from "../src/lib/brand-mark.ts";

const ROOT = process.cwd();
let bad = 0;

console.log("== 1. master SVGs: generated vs committed ==");
for (const [name, svg] of [
  ["mark-color.svg", markSvg({ variant: "color" })],
  ["mark-white.svg", markSvg({ variant: "white" })],
  ["mark-dark.svg", markSvg({ variant: "dark" })],
  ["mark-simplified.svg", markSvg({ variant: "color", simplified: true })],
] as Array<[string, string]>) {
  /* ⛔ LINE ENDINGS ARE NORMALISED, AND THE FIRST RUN OF THIS CHECK PROVED WHY IT MATTERS.
     `core.autocrlf` is true on this machine, so git rewrites text files LF→CRLF ON CHECKOUT:
     the working tree's mark-color.svg is 449 bytes where the committed blob is 442 — exactly
     seven extra bytes for its seven lines. A raw string compare therefore reported all four
     master SVGs as DRIFTED while the generator's output was character-for-character identical,
     which is a check that lies in the most expensive direction: it would have sent a session
     hunting a brand regression that does not exist. The bytes on disk are an artefact of the
     checkout, not of the mark. */
  const norm = (x: string) => x.split("\r\n").join("\n").replace(/\s+$/, "");
  const committed = readFileSync(resolve(ROOT, "public/brand", name), "utf8");
  const ok = norm(committed) === norm(svg);
  if (!ok) bad++;
  console.log(`  ${ok ? "IN SYNC " : "DRIFTED "} public/brand/${name}`);
  if (!ok) {
    console.log("   --- committed ---\n" + committed);
    console.log("   --- generated ---\n" + svg + "\n");
  }
}

console.log("\n== 2. report logo PNG: re-rasterised vs committed (pixels) ==");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 } as const;
for (const [svg, size, out] of [
  [markSvg({ variant: "color" }), 512, "mark-color-512.png"],
  [markSvg({ variant: "white" }), 512, "mark-white-512.png"],
  [markSvg({ variant: "dark" }), 512, "mark-dark-512.png"],
  [maskableSvg(), 512, "maskable-512.png"],
  [tileSvg(), 512, "tile-512.png"],
] as Array<[string, number, string]>) {
  const fresh = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: "contain", background: transparent })
    .png().toBuffer();
  const committedPath = resolve(ROOT, "public/icons", out);
  const freshPx = await sharp(fresh).raw().toBuffer({ resolveWithObject: true });
  const oldPx = await sharp(readFileSync(committedPath)).raw().toBuffer({ resolveWithObject: true });
  const sameDims = freshPx.info.width === oldPx.info.width
    && freshPx.info.height === oldPx.info.height
    && freshPx.info.channels === oldPx.info.channels;
  let maxDiff = -1, nDiff = 0;
  if (sameDims) {
    maxDiff = 0;
    for (let i = 0; i < freshPx.data.length; i++) {
      const d = Math.abs(freshPx.data[i] - oldPx.data[i]);
      if (d > 0) { nDiff++; if (d > maxDiff) maxDiff = d; }
    }
  }
  const ok = sameDims && maxDiff <= 1;
  if (!ok) bad++;
  console.log(
    `  ${ok ? "IN SYNC " : "DRIFTED "} public/icons/${out}` +
    `  dims=${oldPx.info.width}x${oldPx.info.height}x${oldPx.info.channels}` +
    (sameDims ? `  maxChannelDelta=${maxDiff}  differingSamples=${nDiff}/${freshPx.data.length}` : "  DIMENSION MISMATCH"),
  );
}

console.log(`\nVERDICT: ${bad === 0 ? "every report/brand asset is in sync with src/lib/brand-mark.ts" : bad + " asset(s) DRIFTED from the source of truth"}`);
process.exitCode = bad === 0 ? 0 : 1;
