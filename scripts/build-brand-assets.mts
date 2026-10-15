/**
 * Brand asset generator (audit C11). The mark is defined ONCE in
 * `src/lib/brand-mark.ts`; this script is the only thing that writes the SVG/PNG
 * assets from it. Run whenever the mark changes:
 *
 *   npm run build:brand
 *
 * Outputs (all derived from the single source — never hand-edit them):
 *   public/brand/mark-{color,white,dark,simplified}.svg
 *   public/icons/{mark-color,mark-white,mark-dark,maskable,tile}-512.png
 *   public/icons/icon-192.png · public/icons/apple-touch-180.png
 *   public/og/twitter-1200x600.png — the X card, CUT from the held share picture public/og/og-1200x630.png
 *     (the centred 1200×600 window, X_CARD_CROP below). Not drawn from brand-mark.ts: the 1200×630 picture is a held
 *     file this script reads and never writes (DESIGN_AUTHORITY §B1a).
 *
 * ⭐ Why the X card is derived (Vodacom S11 WP1, 2026-10-14): it used to be a SEPARATE capture of a development page,
 * and the capture kept what that page drew over itself — the Next.js dev-tools "N" badge in the bottom-left corner and
 * the chat bubble in the bottom-right — so every X preview of 50pick showed both. A picture cut from the clean 1200×630
 * one cannot carry anything that one does not, and `npm run test:brand-assets` §3 holds the two together pixel for pixel.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { markSvg, maskableSvg, tileSvg } from "../src/lib/brand-mark.ts";

const ROOT = process.cwd();
const BRAND = resolve(ROOT, "public/brand");
const ICONS = resolve(ROOT, "public/icons");
const OG = resolve(ROOT, "public/og");

/** The X card's window on the 1200×630 picture: the full width, the 600 middle rows (15 cut from the top and the bottom).
 *  `test:brand-assets` §3 re-derives this window by its own arithmetic, row by row, rather than importing it. */
const X_CARD_CROP = { left: 0, top: 15, width: 1200, height: 600 } as const;
mkdirSync(BRAND, { recursive: true });
mkdirSync(ICONS, { recursive: true });

const transparent = { r: 0, g: 0, b: 0, alpha: 0 } as const;

async function png(svg: string, size: number, out: string) {
  // density high enough that the vector rasterises crisply before the resize.
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: "contain", background: transparent })
    .png()
    .toFile(resolve(ICONS, out));
  console.log(`  icons/${out}  (${size}px)`);
}

async function main() {
  // 1) Flat SVGs — the master vectors.
  const svgs: Array<[string, string]> = [
    ["mark-color.svg", markSvg({ variant: "color" })],
    ["mark-white.svg", markSvg({ variant: "white" })],
    ["mark-dark.svg", markSvg({ variant: "dark" })],
    ["mark-simplified.svg", markSvg({ variant: "color", simplified: true })],
  ];
  for (const [name, svg] of svgs) {
    writeFileSync(resolve(BRAND, name), svg + "\n", "utf8");
    console.log(`  brand/${name}`);
  }

  // 2) PNGs. Flat marks stay transparent (email/report sit on light bg); the
  //    installed-app icons (icon-192, apple-touch) and maskable/tile are the
  //    opaque royal treatments.
  await png(markSvg({ variant: "color" }), 512, "mark-color-512.png");
  await png(markSvg({ variant: "white" }), 512, "mark-white-512.png");
  await png(markSvg({ variant: "dark" }), 512, "mark-dark-512.png");
  await png(maskableSvg(), 512, "maskable-512.png");
  await png(tileSvg(), 512, "tile-512.png");
  await png(tileSvg(), 192, "icon-192.png");
  await png(tileSvg(), 180, "apple-touch-180.png");

  // 3) The X card: the centred 1200×600 cut of the held 1200×630 share picture, lossless (PNG to PNG, no resize).
  await sharp(readFileSync(resolve(OG, "og-1200x630.png")))
    .extract(X_CARD_CROP)
    .png()
    .toFile(resolve(OG, "twitter-1200x600.png"));
  console.log(`  og/twitter-1200x600.png  (${X_CARD_CROP.width}×${X_CARD_CROP.height}, cut from og/og-1200x630.png)`);

  console.log("brand assets rebuilt from src/lib/brand-mark.ts (and the X card from the held share picture)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
