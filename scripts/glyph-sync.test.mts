/**
 * test:glyph-sync — the generated glyph files are exactly what the codegen builds now, and Phosphor's notice travels
 * with every copy we ship (PHOSPHOR-MIGRATION W1; docs/PHOSPHOR-MIGRATION.md §5).
 *
 *   npx tsx scripts/glyph-sync.test.mts               (npm run test:glyph-sync)
 *   npx tsx scripts/glyph-sync.test.mts --prove-red   (npm run red:glyph-sync — in-process plants, no file is written)
 *
 *   §1 no drift: the registry, the sprite and THIRD_PARTY_NOTICES.md equal a fresh build from the pinned package, and
 *      no stale sprite sits beside the current one (a hand edit to a generated file is caught here)
 *   §2 the registry's GLYPH_SPRITE names the sprite that exists, and every registry key resolves to its four symbols
 *   §3 the notice: THIRD_PARTY_NOTICES.md carries the package's LICENSE verbatim; the sprite opens with the package, its
 *      version, the licence and the copyright; the registry's header names the package, its version and the licence
 */
import { readFileSync } from "node:fs";
import { build, drift, realDisk, NOTICES_PATH, REGISTRY_PATH, SPRITE_DIR, VARIANTS, type Disk } from "./glyphs/codegen.mts";
import { PHOSPHOR_PACKAGE, PHOSPHOR_VERSION } from "./glyphs/map";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const LICENCE = readFileSync(new URL(`../node_modules/${PHOSPHOR_PACKAGE}/LICENSE`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
const SPRITE_NOTICE = new RegExp(
  `^<svg [^>]*><!-- Phosphor Icons \\(${esc(PHOSPHOR_PACKAGE)} ${esc(PHOSPHOR_VERSION)}\\), MIT License, Copyright \\(c\\) 2023 Phosphor Icons\\.`,
);
const REGISTRY_NOTICE = new RegExp(`${esc(PHOSPHOR_PACKAGE)} ${esc(PHOSPHOR_VERSION)} \\(MIT License`);
const built = build();

function check(disk: Disk): string[] {
  const f: string[] = [];
  for (const d of drift(built, disk)) f.push(`§1 ${d}`);
  const reg = disk.read(REGISTRY_PATH) ?? "";
  const url = reg.match(/GLYPH_SPRITE = "\/([^"]+)"/)?.[1];
  const sprite = url ? disk.read(`public/${url}`) : null;
  if (!url || sprite === null) f.push("§2 GLYPH_SPRITE names no sprite that exists");
  else {
    const ids = new Set([...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of reg.matchAll(/^ {2}"([^"]+)": \{ s: "([^"]+)"/gm)) {
      for (const v of VARIANTS) if (!ids.has(`${m[2]}-${v}`)) f.push(`§2 ${m[1]} has no ${v} symbol (${m[2]}-${v}) in the sprite`);
    }
    if (!SPRITE_NOTICE.test(sprite)) f.push("§3 the sprite does not open with Phosphor's notice");
  }
  if (!(disk.read(NOTICES_PATH) ?? "").includes(LICENCE)) f.push(`§3 ${NOTICES_PATH} does not carry the package's LICENSE verbatim`);
  if (!REGISTRY_NOTICE.test(reg)) f.push("§3 the registry's header does not name the package, its version and its licence");
  return f;
}

if (!process.argv.includes("--prove-red")) {
  const fails = check(realDisk);
  for (const x of fails) console.log(`FAIL ${x}`);
  console.log(`\nglyphs: ${built.symbols.size} symbols · ${built.spritePath} · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

// ── --prove-red: plants live on an in-memory overlay of the repository. ──
const overlay = (edit: (rel: string, text: string | null) => string | null, extra: string[] = []): Disk => ({
  read: (rel) => edit(rel, realDisk.read(rel)),
  list: (dir) => [...realDisk.list(dir), ...(dir === SPRITE_DIR ? extra : [])],
});
const sprite = built.spritePath;
const firstSymbol = [...(built.files.get(sprite) ?? "").matchAll(/<symbol id="[^"]+"[^]*?<\/symbol>/g)][0]?.[0] ?? "";
const plants: [string, RegExp, Disk][] = [
  ["a hand edit to the registry", /§1 .*glyph-registry\.generated\.ts differs/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace("i: {", "i:  {") : t))],
  ["a stale sprite left behind", /§1 .*glyphs\.deadbeef\.svg is a stale sprite/, overlay((_, t) => t, ["glyphs.deadbeef.svg"])],
  ["a symbol gone from the sprite", /§2 .* has no .* symbol/, overlay((rel, t) => (rel === sprite && t ? t.replace(firstSymbol, "") : t))],
  ["the sprite loses its notice", /§3 the sprite does not open/, overlay((rel, t) => (rel === sprite && t ? t.replace(/<!--[^]*?-->/, "") : t))],
  ["the notices lose the licence", /§3 THIRD_PARTY_NOTICES\.md does not carry/, overlay((rel, t) => (rel === NOTICES_PATH && t ? t.replace("MIT License", "Licence") : t))],
  ["the registry loses its notice", /§3 the registry's header/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace("(MIT License", "(licence") : t))],
  ["the registry points at no sprite", /§2 GLYPH_SPRITE names no sprite/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace(/GLYPH_SPRITE = "[^"]+"/, 'GLYPH_SPRITE = "/icons/g/none.svg"') : t))],
];
const clean = check(realDisk);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean repository already fails (${clean[0]})`);
  process.exit(1);
}
let proved = 0;
for (const [name, want, disk] of plants) {
  const fired = check(disk).some((x) => want.test(x));
  if (fired) proved++;
  console.log(`${fired ? "PROVED" : "BLIND"}`.padEnd(8) + ` ${name}`);
}
console.log(`\n${proved}/${plants.length} caught`);
process.exit(proved === plants.length ? 0 : 1);
