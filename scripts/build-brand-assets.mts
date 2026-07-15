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
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { markSvg, maskableSvg, tileSvg } from "../src/lib/brand-mark.ts";

const ROOT = process.cwd();
const BRAND = resolve(ROOT, "public/brand");
const ICONS = resolve(ROOT, "public/icons");
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

  console.log("brand assets rebuilt from src/lib/brand-mark.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
