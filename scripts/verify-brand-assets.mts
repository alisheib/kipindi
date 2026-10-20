/**
 * Logo sync proof. Does NOT write into the repo.
 *  1) Regenerate the master SVGs from src/lib/brand-mark.ts and TEXT-compare
 *     them with what is committed in public/brand/.
 *  2) Re-rasterise mark-color at 512 and compare RAW PIXELS with the committed
 *     public/icons/mark-color-512.png (byte-compare is not safe across libvips
 *     versions; pixel-compare is the honest test of "same image").
 *  3) THE X CARD IS THE 1200×630 SHARE PICTURE'S MIDDLE, PIXEL FOR PIXEL (Vodacom S11 WP1). public/og/twitter-1200x600.png
 *     must be exactly 1200×600 and equal, row y and column x, to row y+15 and column x of the held
 *     public/og/og-1200x630.png — a lossless cut, so the tolerance is ZERO. The window is re-derived here by its own
 *     arithmetic (never imported from the generator), so a generator that cut the wrong rows cannot agree with its own
 *     check. Controls, each of which this comparison must REFUSE: the X card this repository served until 2026-10-14
 *     (captured from a development page — the Next.js dev badge bottom-left and the chat bubble bottom-right; read from
 *     git by its blob id, reported as unavailable rather than passed if the history is not there), the right cut one
 *     row off, and the right cut with a badge-sized block painted into its bottom-left corner.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import sharp from "sharp";
import { markSvg, lockupSvg, maskableSvg, tileSvg } from "../src/lib/brand-mark.ts";
import { ogLines, renderOgPicture } from "./build-og-picture.mts";
import { dict } from "../src/lib/i18n-dict.ts";
import { GLYPH_MAP } from "./glyphs/map.ts";
import { phosphorFile } from "./glyphs/codegen.mts";

const ROOT = process.cwd();
let bad = 0;

console.log("== 1. master SVGs: generated vs committed ==");
for (const [name, svg] of [
  ["mark-color.svg", markSvg({ variant: "color" })],
  ["mark-white.svg", markSvg({ variant: "white" })],
  ["mark-dark.svg", markSvg({ variant: "dark" })],
  ["mark-simplified.svg", markSvg({ variant: "color", simplified: true })],
  ["lockup-horizontal.svg", lockupSvg("horizontal")],
  ["lockup-stacked.svg", lockupSvg("stacked")],
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
{
  const norm = (x: string) => x.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  const ok = norm(readFileSync(resolve(ROOT, "public/favicon.svg"), "utf8"))
    === norm(markSvg({ variant: "color", simplified: true }));
  if (!ok) bad++;
  console.log(`  ${ok ? "IN SYNC " : "DRIFTED "} public/favicon.svg`);
}

console.log("\n== 2. report logo PNG: re-rasterised vs committed (pixels) ==");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 } as const;
for (const [svg, size, out] of [
  [markSvg({ variant: "color" }), 512, "mark-color-512.png"],
  [markSvg({ variant: "white" }), 512, "mark-white-512.png"],
  [markSvg({ variant: "dark" }), 512, "mark-dark-512.png"],
  [maskableSvg(), 512, "maskable-512.png"],
  [tileSvg(), 512, "tile-512.png"],
  [markSvg({ variant: "color", simplified: true }), 16, "favicon-16.png"],
  [markSvg({ variant: "color", simplified: true }), 32, "favicon-32.png"],
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
{
  const ico = readFileSync(resolve(ROOT, "public/favicon.ico"));
  let ok = ico.length >= 38 && ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1
    && ico.readUInt16LE(4) === 2;
  for (const [i, size] of [16, 32].entries()) {
    if (!ok) break;
    const at = 6 + i * 16;
    const length = ico.readUInt32LE(at + 8);
    const offset = ico.readUInt32LE(at + 12);
    const png = readFileSync(resolve(ROOT, `public/icons/favicon-${size}.png`));
    ok = ico.readUInt8(at) === size && ico.readUInt8(at + 1) === size
      && offset + length <= ico.length && ico.subarray(offset, offset + length).equals(png);
  }
  if (!ok) bad++;
  console.log(`  ${ok ? "IN SYNC " : "DRIFTED "} public/favicon.ico = 16px + 32px generated PNG payloads`);
}

console.log("\n== 2a. installed-app shortcuts: the family's Fill drawings ==");
for (const [key, ink, out] of [
  ["markets", "#ffffff", "shortcut-markets.png"],
  ["wallet", "#ffffff", "shortcut-wallet.png"],
  ["arrowDownToLine", "#e3bc66", "shortcut-deposit.png"],
] as const) {
  const entry = GLYPH_MAP[key];
  if (!("ph" in entry)) throw new Error(`shortcut ${key} needs a Phosphor source`);
  // Read the pinned Phosphor Fill asset itself; the builder uses drawingOf.
  const source = readFileSync(phosphorFile(entry.ph, "fill"), "utf8");
  const paths = [...source.matchAll(/<path d="([^"]+)"\s*\/>/g)].map((m) => `<path d="${m[1]}"/>`);
  if (!paths.length) throw new Error(`shortcut ${key} has no Fill path`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" fill="#141a3d"/>` +
    `<svg x="24" y="24" width="48" height="48" viewBox="0 0 256 256" fill="${ink}">${paths.join("")}</svg></svg>`;
  const fresh = await sharp(Buffer.from(svg), { density: 384 }).resize(96, 96).raw().toBuffer();
  const committed = await sharp(readFileSync(resolve(ROOT, "public/icons", out))).raw().toBuffer();
  const ok = fresh.equals(committed);
  if (!ok) bad++;
  console.log(`  ${ok ? "IN SYNC " : "DRIFTED "} public/icons/${out} = ${key} Fill`);
  // Mutation control: a single changed pixel must be seen by the same equality used above.
  const planted = Buffer.from(committed);
  planted[0] ^= 1;
  if (fresh.equals(planted)) { bad++; console.log(`  ACCEPTED control: ${out} changed by one channel value`); }
}

console.log("\n== 3. the X card: the share picture's middle 1200×600, pixel for pixel ==");
type Raw = { data: Buffer; width: number; height: number; channels: number };
const rawOf = async (png: Buffer): Promise<Raw> => {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
};
const X_W = 1200, X_H = 600, OG_H = 630;
const X_TOP = (OG_H - X_H) / 2; // 15: the centred window, by arithmetic
/** Every way `card` fails to be the centred 1200×600 window of `og`, or none. ⭐ ONE comparison: the real check and every
 *  control below call it. */
function xCardDefects(og: Raw, card: Raw): string[] {
  const out: string[] = [];
  if (og.width !== X_W || og.height !== OG_H) out.push(`the share picture is ${og.width}×${og.height}, not ${X_W}×${OG_H}`);
  if (card.width !== X_W || card.height !== X_H) out.push(`the X card is ${card.width}×${card.height}, not ${X_W}×${X_H}`);
  if (card.channels !== og.channels) out.push(`the X card has ${card.channels} channels, the share picture ${og.channels}`);
  if (out.length > 0) return out;
  const row = X_W * og.channels;
  let rows = 0, first = -1, maxDelta = 0;
  for (let y = 0; y < X_H; y++) {
    const a = card.data.subarray(y * row, (y + 1) * row);
    const b = og.data.subarray((y + X_TOP) * row, (y + X_TOP + 1) * row);
    if (a.equals(b)) continue;
    rows++;
    if (first < 0) first = y;
    for (let i = 0; i < row; i++) maxDelta = Math.max(maxDelta, Math.abs(a[i] - b[i]));
  }
  if (rows > 0) out.push(`${rows} of ${X_H} rows differ from the share picture's rows ${X_TOP}–${X_TOP + X_H - 1} (first at y=${first}, max channel delta ${maxDelta})`);
  return out;
}
const ogRaw = await rawOf(readFileSync(resolve(ROOT, "public/og/og-1200x630.png")));
const cardRaw = await rawOf(readFileSync(resolve(ROOT, "public/og/twitter-1200x600.png")));
{
  const defects = xCardDefects(ogRaw, cardRaw);
  const ok = defects.length === 0;
  if (!ok) bad++;
  console.log(`  ${ok ? "IN SYNC " : "DRIFTED "} public/og/twitter-1200x600.png = public/og/og-1200x630.png rows ${X_TOP}–${X_TOP + X_H - 1}${ok ? "" : ` — ${defects.join("; ")}`}`);
}
// Controls: the comparison must refuse each of these, or it has not been shown able to fail.
{
  const refuse = (label: string, card: Raw | null, why = "") => {
    if (card === null) { console.log(`  UNAVAILABLE ${label}${why ? ` — ${why}` : ""}`); return; }
    const defects = xCardDefects(ogRaw, card);
    const ok = defects.length > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "REFUSED " : "ACCEPTED"} control: ${label}${ok ? ` — ${defects[0]}` : " — the check cannot see this defect"}`);
  };
  /** The X card served until 2026-10-14, by its git blob id (the history holds it forever; a shallow clone may not). */
  const OLD_X_CARD_BLOB = "164a03cf268dcd526f5aaab90918faddae10fac7";
  let old: Raw | null = null, oldWhy = "";
  try {
    old = await rawOf(execFileSync("git", ["cat-file", "blob", OLD_X_CARD_BLOB], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }));
  } catch { oldWhy = `git holds no blob ${OLD_X_CARD_BLOB} here (a shallow clone?) — the two controls below still run`; }
  refuse("the X card captured from a development page (dev badge bottom-left, chat bubble bottom-right)", old, oldWhy);
  const cut = (top: number): Raw => {
    const row = X_W * ogRaw.channels;
    return { ...ogRaw, height: X_H, data: Buffer.from(ogRaw.data.subarray(top * row, (top + X_H) * row)) };
  };
  refuse("the right window one row low (rows 16–615)", cut(X_TOP + 1));
  const badged = cut(X_TOP);
  for (let y = X_H - 56; y < X_H - 20; y++) {
    for (let x = 20; x < 56; x++) badged.data.fill(0, (y * X_W + x) * ogRaw.channels, (y * X_W + x + 1) * ogRaw.channels);
  }
  refuse("the right window with a 36px badge painted in its bottom-left corner", badged);
}

console.log("\n== 4. the unpublished share-picture generator (S11 WP8) ==");
{
  const lines = ogLines("auth.railTagline");
  const fromKey = lines.en === dict.en.auth.railTagline && lines.sw === dict.sw.auth.railTagline;
  const first = await renderOgPicture(lines);
  const second = await renderOgPicture(lines);
  const firstPx = await rawOf(first), secondPx = await rawOf(second);
  const same = firstPx.width === X_W && firstPx.height === OG_H && firstPx.channels === secondPx.channels
    && firstPx.data.equals(secondPx.data);
  const published = await rawOf(readFileSync(resolve(ROOT, "public/og/og-1200x630.png")));
  const publishedMatches = published.width === firstPx.width && published.height === firstPx.height
    && published.channels === firstPx.channels && published.data.equals(firstPx.data);
  const generator = readFileSync(resolve(ROOT, "scripts/build-og-picture.mts"), "utf8");
  const fromMark = generator.includes('import { markSvg } from "../src/lib/brand-mark.ts";')
    && generator.includes('markSvg({ variant: "color" })');
  if (!fromKey || !same || !fromMark) bad++;
  console.log(`  ${fromKey && same && fromMark ? "IN SYNC " : "DRIFTED "} two renders are pixel-identical, the lines read the named dictionary key, and the mark reads brand-mark.ts`);
  if (!publishedMatches) bad++;
  console.log(`  ${publishedMatches ? "IN SYNC " : "DRIFTED "} public/og/og-1200x630.png matches the reviewed current-mark render pixel for pixel`);
}

console.log(`\nVERDICT: ${bad === 0 ? "every report/brand asset is in sync with src/lib/brand-mark.ts, the X card is the share picture's middle, and the unpublished picture generator is deterministic" : bad + " asset(s) DRIFTED from the source of truth"}`);
process.exitCode = bad === 0 ? 0 : 1;
