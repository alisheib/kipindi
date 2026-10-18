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
 *  §1b the sprites production serves are kept (W3's review): PREVIOUS_SPRITES is a hand-kept list that nothing else ties
 *      to production, and a release that changed a sprite without naming the live ones there would delete them — a page
 *      open across its deploy would lose its icons, as the Maswali release (601af279) deleted W2's app.0d3c6857.svg. So
 *      the registry `origin/main` holds (production's, as this repo releases) is read from git, and every sprite it names
 *      must be one this tree keeps: current, or named in PREVIOUS_SPRITES. With no git or no origin/main, "not measured".
 *   §2 every shipped (key, variant) of the registry has its symbol where the engine will look: the chrome's Bold and Fill
 *      in the inline symbols, everything else in the app or the admin sprite that GLYPH_SPRITES names
 *   §3 the notice: THIRD_PARTY_NOTICES.md carries the package's LICENSE verbatim; both sprites and the inline symbols open
 *      with the package, its version, the licence and the copyright; the registry's header names all three
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  build, drift, realDisk, NOTICES_PATH, REGISTRY_PATH, ROOT, SHELL_PATH, SPRITE_DIR, VARIANTS, type Disk,
} from "./glyphs/codegen.mts";
import { PHOSPHOR_PACKAGE, PHOSPHOR_VERSION, PREVIOUS_SPRITES } from "./glyphs/map.ts";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const LICENCE = readFileSync(new URL(`../node_modules/${PHOSPHOR_PACKAGE}/LICENSE`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
const NOTICE = `<!-- Phosphor Icons \\(${esc(PHOSPHOR_PACKAGE)} ${esc(PHOSPHOR_VERSION)}\\), MIT License, Copyright \\(c\\) 2023 Phosphor Icons\\.`;
const SPRITE_NOTICE = new RegExp(`^<svg [^>]*>${NOTICE}`);
const SHELL_NOTICE = new RegExp(`GLYPH_SHELL_SYMBOLS = "${NOTICE}`);
const REGISTRY_NOTICE = new RegExp(`${esc(PHOSPHOR_PACKAGE)} ${esc(PHOSPHOR_VERSION)} \\(MIT License`);
const built = build();

/** §1b · the sprite files origin/main's registry names — what production serves — or why they could not be read. */
type Live = { files: string[] } | { why: string };
function liveSprites(): Live {
  const r = spawnSync("git", ["show", `origin/main:${REGISTRY_PATH}`], { cwd: fileURLToPath(ROOT), encoding: "utf8" });
  if (r.status !== 0) return { why: `git show origin/main:${REGISTRY_PATH} answered ${r.status ?? "nothing"}: ${(r.stderr ?? "").trim().split("\n")[0]}` };
  const m = /GLYPH_SPRITES = \{ app: "\/icons\/g\/([^"]+)", admin: "\/icons\/g\/([^"]+)" \}/.exec(r.stdout);
  return m ? { files: [m[1], m[2]] } : { why: "origin/main's registry names no sprite files" };
}
const LIVE = liveSprites();
const keeps = (file: string, previous: readonly string[]) =>
  built.sprites.app === `${SPRITE_DIR}/${file}` || built.sprites.admin === `${SPRITE_DIR}/${file}` || previous.includes(file);

function check(disk: Disk, previous: readonly string[] = PREVIOUS_SPRITES, live: Live = LIVE): string[] {
  const f: string[] = [];
  for (const d of drift(built, disk, previous)) f.push(`§1 ${d}`);
  if ("files" in live) {
    for (const file of live.files) {
      if (!keeps(file, previous)) f.push(`§1b ${SPRITE_DIR}/${file} is what origin/main serves, and this tree neither builds nor keeps it — name it in PREVIOUS_SPRITES`);
    }
  }
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
  const live = "files" in LIVE ? `origin/main serves ${LIVE.files.join(" and ")}` : `not measured (${LIVE.why})`;
  console.log("");
  console.log(`glyphs: ${built.symbols} symbols · ${built.sprites.app} · ${built.sprites.admin} · §1b ${live} · ${fails.length} failure(s)`);
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
const plants: [string, RegExp, Disk, (readonly string[])?, Live?][] = [
  ["a hand edit to the registry", /§1 .*glyph-registry\.generated\.ts differs/, overlay((rel, t) => (rel === REGISTRY_PATH && t ? t.replace("i: {", "i:  {") : t))],
  ["a stale sprite left behind", /§1 .*app\.deadbeef\.svg is a stale sprite/, overlay((_, t) => t, ["app.deadbeef.svg"])],
  ["production's sprite neither built nor kept", /§1b public\/icons\/g\/app\.feedface\.svg is what origin\/main serves, and this tree neither builds nor keeps it/,
    realDisk, PREVIOUS_SPRITES, { files: ["app.feedface.svg", "admin.feedface.svg"] }],
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
for (const [name, want, disk, previous, live] of plants) {
  const fired = check(disk, previous, live).some((x) => want.test(x));
  if (fired) proved++;
  console.log(`${fired ? "PROVED" : "BLIND"}`.padEnd(8) + ` ${name}`);
}
console.log(`\n${proved}/${plants.length} caught`);
process.exit(proved === plants.length ? 0 : 1);
