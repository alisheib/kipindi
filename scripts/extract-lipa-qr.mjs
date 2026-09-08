/**
 * extract-lipa-qr — turn the Selcom Lipa poster PDF into the shipped QR asset.
 *
 * ── WHY THIS SCRIPT EXISTS ───────────────────────────────────────────────────
 * `public/pay/selcom-lipa-qr.png` is a picture that MOVES REAL MONEY. If it is
 * ever wrong — a re-crop that clips a finder pattern, a "helpful" recompression,
 * the wrong merchant's QR pasted in — an applicant pays a stranger and we find out
 * from them, not from a test. So the asset is not hand-exported from a PDF viewer
 * and dropped in the tree as folklore. It is extracted by this script, and the
 * script PROVES what it extracted before it writes anything:
 *
 *   1. the QR decodes at all,
 *   2. its EMVCo CRC-16 checks out (so the bytes are intact, not merely readable),
 *   3. it names the merchant id we expect,
 *   4. the PNG it writes decodes to the SAME payload the PDF did.
 *
 * Step 4 is the one people skip. Padding and rescaling are image edits; an edit
 * that silently broke the code would otherwise ship looking perfect.
 *
 * ── THE QUIET ZONE IS NOT DECORATION ─────────────────────────────────────────
 * The 300×300 image inside the PDF has NO quiet zone — the modules run to the
 * edge. The QR spec requires four modules of light margin, and without it real
 * scanners are flaky and `jsQR` cannot find the symbol at all (it fails on the raw
 * extract and succeeds the moment a margin is added). The poster gets away with it
 * because the page around it is white. A `<img>` on a dark surface does not, so the
 * margin is baked into the asset rather than left to CSS, where a later layout
 * change could quietly take it away.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *   node scripts/extract-lipa-qr.mjs <path-to-poster.pdf> [--write]
 *
 * Without `--write` it reports and writes nothing (the safe default — you can run
 * it against a new poster to see what the QR says before committing to it).
 * The poster PDF is deliberately NOT in the repo: it is a Selcom-issued document,
 * and the artifact we ship is the verified PNG plus the payload pinned in
 * `src/lib/server/lipa-config.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const jsQRmod = require("jsqr");
const jsQR = jsQRmod.default ?? jsQRmod;

const ROOT = path.resolve(import.meta.dirname, "..");
const PAY_DIR = path.join(ROOT, "public", "pay");

/**
 * ⭐ THE FILENAME CARRIES A HASH OF THE PAYLOAD, AND THAT IS A MONEY GUARD.
 *
 * `public/sw.js` serves everything matching `\.png$` **cache-first, forever**, until
 * someone remembers to bump `CACHE_NAME` — its own comment records that the mixx and
 * halopesa marks needed exactly that bump and says so in a warning. For a payment
 * provider's logo a stale cache is cosmetic. For a QR it is not: if this merchant's
 * Lipa number is ever reissued and we drop a new image at the same path, every
 * returning player keeps the OLD QR in their browser cache and keeps paying an
 * account that is no longer ours — silently, indefinitely, and invisibly to whoever
 * tests it in a fresh browser.
 *
 * Naming the file after its own content removes the trap instead of documenting it:
 * a different QR is a different payload is a different filename is a different URL,
 * so there is nothing to remember and nothing to bump.
 */
const assetName = (payload) =>
  `selcom-lipa-qr.${crypto.createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 8)}.png`;

/** The merchant id this poster must name. A poster that does not is the wrong poster. */
const EXPECT_MERCHANT_ID = "70063747";
/** Light margin added around the symbol, in source pixels (≫ the 4-module minimum). */
const QUIET_ZONE_PX = 40;
/** Integer upscale, so module edges stay crisp on a 2–3× DPR handset. */
const SCALE = 2;

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const PDF = args.find((a) => !a.startsWith("--"));
if (!PDF) {
  console.error("usage: node scripts/extract-lipa-qr.mjs <poster.pdf> [--write]");
  process.exit(2);
}

// ── 1. Find the QR image object inside the PDF ────────────────────────────────
const buf = fs.readFileSync(PDF);
const s = buf.toString("latin1");

/** Every `N 0 obj` whose dictionary is an /Image, with its stream slice. */
function imageObjects() {
  const out = [];
  const re = /(\d+)\s+0\s+obj\b/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const dictStart = re.lastIndex;
    const endobj = s.indexOf("endobj", dictStart);
    if (endobj < 0) continue;
    const streamKw = s.indexOf("stream", dictStart);
    if (streamKw < 0 || streamKw > endobj) continue;
    const dict = s.slice(dictStart, streamKw);
    if (!/\/Subtype\s*\/Image/.test(dict)) continue;
    let dataStart = streamKw + "stream".length;
    if (s[dataStart] === "\r") dataStart++;
    if (s[dataStart] === "\n") dataStart++;
    const dataEnd = s.indexOf("endstream", dataStart);
    out.push({
      num: Number(m[1]),
      dict,
      width: Number(/\/Width\s+(\d+)/.exec(dict)?.[1] ?? 0),
      height: Number(/\/Height\s+(\d+)/.exec(dict)?.[1] ?? 0),
      isSMaskFor: null,
      raw: buf.subarray(dataStart, dataEnd),
    });
  }
  return out;
}

/** Undo a PDF /DecodeParms PNG predictor (each row carries a leading filter byte). */
function unpredict(data, dict, width) {
  const predictor = Number(/\/Predictor\s+(\d+)/.exec(dict)?.[1] ?? 1);
  if (predictor < 10) return data;
  const colors = Number(/\/Colors\s+(\d+)/.exec(dict)?.[1] ?? 1);
  const bpc = Number(/\/DecodeParms[\s\S]*?\/BitsPerComponent\s+(\d+)/.exec(dict)?.[1] ?? 8);
  const columns = Number(/\/Columns\s+(\d+)/.exec(dict)?.[1] ?? width);
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const rowLen = Math.ceil((colors * bpc * columns) / 8);
  const rows = data.length / (rowLen + 1);
  if (!Number.isInteger(rows)) throw new Error("predicted stream is not a whole number of rows");

  const out = Buffer.alloc(rowLen * rows);
  let prev = Buffer.alloc(rowLen);
  for (let r = 0; r < rows; r++) {
    const ft = data[r * (rowLen + 1)];
    const src = data.subarray(r * (rowLen + 1) + 1, (r + 1) * (rowLen + 1));
    const cur = Buffer.alloc(rowLen);
    for (let i = 0; i < rowLen; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const x = src[i];
      let v;
      switch (ft) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`unknown PNG filter type ${ft} on row ${r}`);
      }
      cur[i] = v & 0xff;
    }
    cur.copy(out, r * rowLen);
    prev = cur;
  }
  return out;
}

/**
 * Decode a raw RGB(A)/grey buffer as a QR. Returns the payload string or null.
 *
 * ⚠️ TWO PASSES, AND THE SECOND ONE IS NOT REDUNDANT. `jsQR`'s own
 * `inversionAttempts: "attemptBoth"` does not rescue this symbol — the logo
 * overlay in the middle shifts its binarisation, and the code is only found when
 * the pixels are inverted BEFORE jsQR sees them. Dropping the second pass makes
 * this script (and the guard that shares it) report "not a QR" for a QR that
 * every phone on the desk reads fine.
 */
export function decodeRaw(pixels, width, height, channels) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * channels];
    const g = channels > 1 ? pixels[i * channels + 1] : r;
    const b = channels > 2 ? pixels[i * channels + 2] : r;
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
  }
  for (const invert of [false, true]) {
    const view = invert
      ? Buffer.from(rgba.map((v, i) => (i % 4 === 3 ? v : 255 - v)))
      : rgba;
    const code = jsQR(new Uint8ClampedArray(view), width, height, { inversionAttempts: "attemptBoth" });
    if (code?.data) return code.data;
  }
  return null;
}

/** EMVCo CRC-16/CCITT-FALSE over everything up to and including the "6304" tag. */
export function emvCrc(body) {
  let crc = 0xffff;
  for (let i = 0; i < body.length; i++) {
    crc ^= body.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ── 2. Pick the QR: the image that actually decodes as one ────────────────────
const candidates = imageObjects().filter((o) => o.width > 0 && o.height > 0);
console.log(`${candidates.length} image objects in ${path.basename(PDF)}`);

let hit = null;
for (const o of candidates) {
  let pixels;
  try {
    pixels = unpredict(zlib.inflateSync(o.raw), o.dict, o.width);
  } catch {
    continue; // not a flate/predicted raster — not our QR
  }
  const channels = pixels.length / (o.width * o.height);
  if (!Number.isInteger(channels)) continue;
  // Pad before decoding: without a quiet zone even the real QR will not be found.
  const padded = await sharp(pixels, { raw: { width: o.width, height: o.height, channels } })
    .extend({ top: QUIET_ZONE_PX, bottom: QUIET_ZONE_PX, left: QUIET_ZONE_PX, right: QUIET_ZONE_PX, background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const payload = decodeRaw(padded.data, padded.info.width, padded.info.height, padded.info.channels);
  if (payload) {
    hit = { obj: o, pixels, channels, payload };
    break;
  }
}

if (!hit) {
  console.error("❌ no image object in this PDF decodes as a QR code");
  process.exit(1);
}

console.log(`QR found in object ${hit.obj.num} — ${hit.obj.width}×${hit.obj.height}, ${hit.channels}ch`);

// ── 3. Prove the payload before trusting it ───────────────────────────────────
const payload = hit.payload;
const stated = payload.slice(-4);
const computed = emvCrc(payload.slice(0, -4));
const crcOk = stated === computed;
const namesMerchant = payload.includes(EXPECT_MERCHANT_ID);
// EMVCo tag 01 "Point of Initiation Method": 11 = static, 12 = dynamic.
const poi = /^0002\d{2}0102(\d{2})/.exec(payload)?.[1] ?? "??";

console.log("");
console.log("payload:", payload);
console.log("");
console.log(`  CRC-16            ${stated} vs computed ${computed}  ${crcOk ? "✅" : "❌"}`);
console.log(`  merchant ${EXPECT_MERCHANT_ID}  ${namesMerchant ? "present ✅" : "ABSENT ❌"}`);
console.log(`  point of init     ${poi} → ${poi === "11" ? "STATIC" : poi === "12" ? "DYNAMIC" : "unknown"}`);

if (!crcOk || !namesMerchant) {
  console.error("\n❌ refusing to write — this QR did not pass verification");
  process.exit(1);
}

// ── 4. Build the asset, then re-verify what we actually wrote ─────────────────
const outW = (hit.obj.width + QUIET_ZONE_PX * 2) * SCALE;
const png = await sharp(hit.pixels, { raw: { width: hit.obj.width, height: hit.obj.height, channels: hit.channels } })
  .extend({ top: QUIET_ZONE_PX, bottom: QUIET_ZONE_PX, left: QUIET_ZONE_PX, right: QUIET_ZONE_PX, background: "#ffffff" })
  .resize(outW, outW, { kernel: "nearest" })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();

const back = await sharp(png).raw().toBuffer({ resolveWithObject: true });
const roundTrip = decodeRaw(back.data, back.info.width, back.info.height, back.info.channels);
const identical = roundTrip === payload;
console.log("");
console.log(`  written asset     ${outW}×${outW}, ${(png.length / 1024).toFixed(1)} KiB`);
console.log(`  round-trip decode ${identical ? "IDENTICAL ✅" : "DIFFERS ❌"}`);
if (!identical) {
  console.error("\n❌ refusing to write — the PNG does not decode to the payload the PDF carried");
  process.exit(1);
}

const OUT = path.join(PAY_DIR, assetName(payload));
const publicPath = "/pay/" + path.basename(OUT);

if (!WRITE) {
  console.log(`\n(dry run — pass --write to write ${publicPath})`);
  process.exit(0);
}
fs.mkdirSync(PAY_DIR, { recursive: true });
fs.writeFileSync(OUT, png);

// Any previously-extracted QR is now dead weight: the config names exactly one
// asset, and leaving strays invites someone to point at the wrong one later.
for (const f of fs.readdirSync(PAY_DIR)) {
  if (/^selcom-lipa-qr\..*\.png$/.test(f) && f !== path.basename(OUT)) {
    fs.unlinkSync(path.join(PAY_DIR, f));
    console.log(`   removed superseded ${f}`);
  }
}

console.log(`\n✅ wrote ${path.relative(ROOT, OUT)}`);
console.log("\n   Pin BOTH of these in src/lib/server/lipa-config.ts:");
console.log(`     qrAssetPath: ${JSON.stringify(publicPath)}`);
console.log(`     qrPayload:   ${JSON.stringify(payload)}`);
