/**
 * test:glyph-sync — the generated glyph files are exactly what the codegen builds now, every drawing the family asks for
 * is where the family looks for it, and Phosphor's notice travels with every copy we ship (PHOSPHOR-MIGRATION;
 * docs/PHOSPHOR-MIGRATION.md §5).
 *
 *   npx tsx scripts/glyph-sync.test.mts               (npm run test:glyph-sync)
 *   npx tsx scripts/glyph-sync.test.mts --prove-red   (npm run red:glyph-sync — in-process plants, no file is written)
 *
 *   §1 no drift: the registry, the inline chrome symbols, the offline glyphs, both sprites and THIRD_PARTY_NOTICES.md
 *      equal a fresh build from the pinned package, and no stale sprite sits beside the current ones — except the ones
 *      production served before this release, named in map.ts PREVIOUS_SPRITES (deploy skew, W3), which must be there
 *   §2 every shipped (key, variant) of the registry has its symbol where the engine will look: the chrome's Bold and Fill
 *      in the inline symbols, everything else in the app or the admin sprite that GLYPH_SPRITES names
 *   §3 the notice: THIRD_PARTY_NOTICES.md carries the package's LICENSE verbatim; both sprites and the inline symbols open
 *      with the package, its version, the licence and the copyright; the registry's header names all three
 */
import { readFileSync } from "node:fs";
import {
  build, drift, realDisk, NOTICES_PATH, REGISTRY_PATH, SHELL_PATH, SPRITE_DIR, VARIANTS, type Disk,
} from "./glyphs/codegen.mts";
import { PHOSPHOR_PACKAGE, PHOSPHOR_VERSION, PREVIOUS_SPRITES } from "./glyphs/map.ts";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const LICENCE = readFileSync(new URL(`../node_modules/${PHOSPHOR_PACKAGE}/LICENSE`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
const NOTICE = `<!-- Phosphor Icons \\(${esc(PHOSPHOR_PACKAGE)} ${esc(PHOSPHOR_VERSION)}\\), MIT License, Copyright \\(c\\) 2023 Phosphor Icons\\.`;
const SPRITE_NOTICE = new RegExp(`^<svg [^>]*>${NOTICE}`);
const SHELL_NOTICE = new RegExp(`GLYPH_SHELL_SYMBOLS = "${NOTICE}`);
const REGISTRY_NOTICE = new RegExp(`${esc(PHOSPHOR_PACKAGE)} ${esc(PHOSPHOR_VERSION)} \\(MIT License`);
const built = build();

function check(disk: Disk, previous: readonly string[] = PREVIOUS_SPRITES): string[] {
  const f: string[] = [];
  for (const d of drift(built, disk, previous)) f.push(`§1 ${d}`);
  const reg = disk.read(REGISTRY_PATH) ?? "";
  const shell = disk.read(SHELL_PATH) ?? "";
  const urls = { app: reg.match(/app: "\/([^"]+)"/)?.[1], admin: reg.match(/admin: "\/([^"]+)"/)?.[1] };
  const sprites: Record<string, string | null> = {};
  for (const g of ["app", "admin"] as const) {
    const u = urls[g];
    sprites[g] = u ? disk.read(`public/${u}`) : null;
    if (!u || sprites[g] === null) f.push(`§2 GLYPH_SPRITES.${g} names no sprite that exists`);
    else if (!SPRITE_NOTICE.test(sprites[g]!)) f.push(`§3 the ${g} sprite does not open with Phosphor's notice`);
  }
  const ids = (text: string | null) => new Set([...(text ?? "").matchAll(/<symbol id=\\?"([^"\\]+)\\?"/g)].map((m) => m[1]));
  const inline = ids(shell), app = ids(sprites.app ?? null), admin = ids(sprites.admin ?? null);
  for (const m of reg.matchAll(/^ {2}"([^"]+)": \{ s: "([^"]+)", g: "([a-z]+)", i: \{ ([^}]*) \}/gm)) {
    const [, key, stem, group, inks] = m;
    for (const v of VARIANTS) {
      if (!new RegExp(`(^|, )${v}: \\[`).test(inks)) continue;
      const id = `${stem}-${v}`;
      const where = group === "shell" && (v === "bold" || v === "fill") ? inline : group === "admin" ? admin : app;
      const place = where === inline ? "the inline chrome symbols" : where === admin ? "the admin sprite" : "the app sprite";
      if (!where.has(id)) f.push(`§2 ${key} draws ${v}, but ${id} is not in ${place}`);
    }
  }
  if (!SHELL_NOTICE.test(shell)) f.push("§3 the inline chrome symbols do not open with Phosphor's notice");
  if (!(disk.read(NOTICES_PATH) ?? "").includes(LICENCE)) f.push(`§3 ${NOTICES_PATH} does not carry the package's LICENSE verbatim`);
  if (!REGISTRY_NOTICE.test(reg)) f.push("§3 the registry's header does not name the package, its version and its licence");
  return f;
}

if (!process.argv.includes("--prove-red")) {
  const fails = check(realDisk);
  for (const x of fails) console.log(`FAIL ${x}`);
  console.log(`\nglyphs: ${built.symbols} symbols · ${built.sprites.app} · ${built.sprites.admin} · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

// ── --prove-red: plants live on an in-memory overlay of the repository. ──
const overlay = (edit: (rel: string, text: string | null) => string | null, extra: string[] = []): Disk => ({
  read: (rel) => edit(rel, realDisk.read(rel)),
  list: (dir) => [...realDisk.list(dir), ...(dir === SPRITE_DIR ? extra : [])],
});
const app = built.sprites.app;
const firstAppSymbol = [...(built.files.get(app) ?? "").matchAll(/<symbol id="[^"]+"[^]*?<\/symbol>/g)][0]?.[0] ?? "";
const firstShellId = (built.files.get(SHELL_PATH) ?? "").match(/<symbol id=\\"([^"\\]+)\\"/)?.[1] ?? "";
const plants: [string, RegExp, Disk, (readonly string[])?][] = [
  ["a hand edit to the registry", /§1 .*glyph-registry\.generated\.ts differs/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace("i: {", "i:  {") : t))],
  ["a stale sprite left behind", /§1 .*app\.deadbeef\.svg is a stale sprite/, overlay((_, t) => t, ["app.deadbeef.svg"])],
  ["a kept previous sprite that is not there", /§1 .*app\.cafebabe\.svg is kept for one release \(PREVIOUS_SPRITES\) but is not there/,
    realDisk, ["app.cafebabe.svg"]],
  ["a symbol gone from the app sprite", /§2 .* is not in the app sprite/, overlay((rel, t) => (rel === app && t ? t.replace(firstAppSymbol, "") : t))],
  ["a symbol gone from the inline chrome", /§2 .* is not in the inline chrome symbols/, overlay((rel, t) => (rel === SHELL_PATH && t ? t.split(`id=\\"${firstShellId}\\"`).join('id=\\"zz\\"') : t))],
  ["a sprite loses its notice", /§3 the app sprite does not open/, overlay((rel, t) => (rel === app && t ? t.replace(/<!--[^]*?-->/, "") : t))],
  ["the inline chrome loses its notice", /§3 the inline chrome symbols do not open/, overlay((rel, t) => (rel === SHELL_PATH && t ? t.replace(/<!--[^]*?-->/, "") : t))],
  ["the notices lose the licence", /§3 THIRD_PARTY_NOTICES\.md does not carry/, overlay((rel, t) => (rel === NOTICES_PATH && t ? t.replace("MIT License", "Licence") : t))],
  ["the registry loses its notice", /§3 the registry's header/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace("(MIT License", "(licence") : t))],
  ["the registry points at no sprite", /§2 GLYPH_SPRITES\.app names no sprite/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace(/app: "\/[^"]+"/, 'app: "/icons/g/none.svg"') : t))],
];
const clean = check(realDisk);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean repository already fails (${clean[0]})`);
  process.exit(1);
}
let proved = 0;
for (const [name, want, disk, previous] of plants) {
  const fired = check(disk, previous).some((x) => want.test(x));
  if (fired) proved++;
  console.log(`${fired ? "PROVED" : "BLIND"}`.padEnd(8) + ` ${name}`);
}
console.log(`\n${proved}/${plants.length} caught`);
process.exit(proved === plants.length ? 0 : 1);
