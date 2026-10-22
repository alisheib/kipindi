/**
 * Render the 1200×630 share picture from a reviewed dictionary key.
 *
 * This tool has no default output. S11 uses a scratch directory to review the
 * S15 picture; the S15 copy commit alone publishes it to public/og. The X card
 * is then the centred crop made by build:brand.
 *
 *   npm run build:og -- --key auth.railTagline --out C:/path/to/scratch
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement as h, type ReactElement } from "react";
import { ImageResponse } from "next/og";
import { dict, type Locale } from "../src/lib/i18n-dict.ts";
import { markSvg } from "../src/lib/brand-mark.ts";

const ROOT = resolve(import.meta.dirname, "..");
const FONT_DIR = join(ROOT, "src/lib/server/reports/fonts");
const SIZE = { width: 1200, height: 630 } as const;

function lineFor(locale: Locale, key: string): string {
  let value: unknown = dict[locale];
  for (const segment of key.split(".")) {
    if (!value || typeof value !== "object" || !(segment in value)) throw new Error(`Unknown ${locale} dictionary key: ${key}`);
    value = (value as Record<string, unknown>)[segment];
  }
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Not a nonempty ${locale} text key: ${key}`);
  return value;
}

export function ogLines(key: string): { en: string; sw: string } {
  return { en: lineFor("en", key), sw: lineFor("sw", key) };
}

/** A fresh ImageResponse each time, with embedded tracked fonts and no network requests. */
export async function renderOgPicture(lines: { en: string; sw: string }): Promise<Buffer> {
  if (!lines.en.trim() || !lines.sw.trim()) throw new Error("Both share-picture lines are required");
  const svg = `data:image/svg+xml;base64,${Buffer.from(markSvg({ variant: "color" })).toString("base64")}`;
  const element = h("div", {
    style: {
      position: "relative", display: "flex", width: SIZE.width, height: SIZE.height,
      background: "linear-gradient(180deg, #182459 0%, #0d1547 100%)", color: "#f7f8fc",
    },
  },
  h("img", { src: svg, width: 140, height: 140, style: { position: "absolute", top: 102, left: 530 } }),
  h("div", { style: { position: "absolute", top: 284, left: 0, width: 1200, display: "flex", justifyContent: "center", alignItems: "baseline" } },
    h("span", { style: { fontFamily: "Sora", fontWeight: 700, fontSize: 68, letterSpacing: -3 } }, "50pick"),
    h("span", { style: { fontFamily: "Inter", fontWeight: 400, fontSize: 33, color: "#a7afd3", marginLeft: 8 } }, ".tz")),
  h("div", { style: { position: "absolute", top: 407, left: 520, width: 160, height: 1, backgroundColor: "#A7AFD3", opacity: 0.75 } }),
  h("div", { style: { position: "absolute", top: 441, left: 35, width: 1130, display: "flex", justifyContent: "center", fontFamily: "Sora", fontWeight: 700, fontSize: 32, letterSpacing: -0.8, textAlign: "center", whiteSpace: "nowrap" } }, lines.en),
  h("div", { style: { position: "absolute", top: 498, left: 35, width: 1130, display: "flex", justifyContent: "center", fontFamily: "Inter", fontWeight: 400, fontSize: 24, color: "#aab2d6", textAlign: "center", whiteSpace: "nowrap" } }, lines.sw),
  h("div", { style: { position: "absolute", top: 563, left: 0, width: 1200, display: "flex", justifyContent: "center", fontFamily: "JetBrains Mono", fontSize: 15, letterSpacing: 3, color: "#929ec9" } }, "LICENSED BY THE GAMING BOARD OF TANZANIA · 18+"),
  ) as ReactElement;
  const image = new ImageResponse(element, {
    ...SIZE,
    fonts: [
      { name: "Sora", data: readFileSync(join(FONT_DIR, "Sora-Bold.ttf")), weight: 700, style: "normal" },
      { name: "Inter", data: readFileSync(join(FONT_DIR, "Inter-Regular.ttf")), weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: readFileSync(join(FONT_DIR, "JetBrainsMono-Regular.ttf")), weight: 400, style: "normal" },
    ],
  });
  return Buffer.from(await image.arrayBuffer());
}

async function main() {
  let out = "", key = "";
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--out") out = process.argv[++i] ?? "";
    else if (process.argv[i] === "--key") key = process.argv[++i] ?? "";
    else throw new Error(`Unknown argument: ${process.argv[i]}`);
  }
  if (!out || !key) throw new Error("Usage: npm run build:og -- --key auth.railTagline --out <scratch-directory>");
  const lines = ogLines(key);
  const bytes = await renderOgPicture(lines);
  const abs = resolve(out);
  mkdirSync(abs, { recursive: true });
  const file = join(abs, "og-1200x630.png");
  writeFileSync(file, bytes);
  console.log(`${file} (${SIZE.width}×${SIZE.height}; ${key}: ${lines.en} / ${lines.sw})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
