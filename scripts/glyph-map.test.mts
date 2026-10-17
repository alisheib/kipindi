/**
 * test:glyph-map — every house glyph has its Phosphor answer, and every answer exists (PHOSPHOR-MIGRATION W1;
 * docs/PHOSPHOR-MIGRATION.md §3–§4).
 *
 *   npx tsx scripts/glyph-map.test.mts               (npm run test:glyph-map)
 *   npx tsx scripts/glyph-map.test.mts --prove-red   (npm run red:glyph-map — in-process plants, no file is written)
 *
 *   §1 every key of src/components/ui/glyphs.tsx has one entry in scripts/glyphs/map.ts, and the map names no key the
 *      family lacks; a new key collides with no existing one
 *   §2 every Phosphor name exists in the pinned package, in all four variants
 *   §3 every house extra has all four drawings, and every drawing in extras.ts belongs to a mapped extra
 *   §4 one meaning, one glyph: two live keys share a Phosphor name only when ALIASES pairs them
 *   §5 every retired key says why, and no reserved key is retired
 *   §6 the bounds reader is right on shapes whose bounds are known by construction
 *   §7 the package is pinned exactly, as a devDependency, and the lockfile resolves that version
 */
import { existsSync, readFileSync } from "node:fs";
import { ALIASES, GLYPH_MAP, NEW_KEYS, PHOSPHOR_PACKAGE, PHOSPHOR_VERSION, type MapEntry } from "./glyphs/map";
import { EXTRAS, type Variant } from "./glyphs/extras";
import { pathBounds, type Box } from "./glyphs/reach.mts";
import { phosphorFile, VARIANTS } from "./glyphs/codegen.mts";

const ROOT = new URL("..", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
/** Keys a later wave or another lane depends on: never retired. */
const RESERVED = ["live", "clockPending", "voidX", "wifiOff"];

type World = {
  houseKeys: string[];
  map: Record<string, MapEntry>;
  newKeys: Record<string, MapEntry>;
  extras: Record<string, Partial<Record<Variant, unknown>>>;
  aliases: Array<[string, string]>;
  has: (name: string, v: Variant) => boolean;
  bounds: (d: string) => Box;
  pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  lockVersion: string | undefined;
  readAsset: (name: string, v: Variant) => string;
};

const near = (a: Box, b: Box) => a.every((v, i) => Math.abs(v - b[i]) <= 0.05);
const boxOfAsset = (w: World, name: string, v: Variant): Box => {
  let b: Box = [Infinity, -Infinity, Infinity, -Infinity];
  for (const m of w.readAsset(name, v).matchAll(/ d="([^"]+)"/g)) {
    const p = w.bounds(m[1]);
    b = [Math.min(b[0], p[0]), Math.max(b[1], p[1]), Math.min(b[2], p[2]), Math.max(b[3], p[3])];
  }
  return b;
};

function check(w: World): string[] {
  const f: string[] = [];
  // §1
  const house = new Set(w.houseKeys);
  for (const k of w.houseKeys) if (!(k in w.map)) f.push(`§1 house key ${k} has no entry in scripts/glyphs/map.ts`);
  for (const k of Object.keys(w.map)) if (!house.has(k)) f.push(`§1 map.ts names ${k}, which the family does not draw`);
  for (const k of Object.keys(w.newKeys)) if (house.has(k) || k in w.map) f.push(`§1 new key ${k} collides with an existing key`);
  const all = { ...w.map, ...w.newKeys };
  // §2
  for (const [k, e] of Object.entries(all)) {
    if (!("ph" in e)) continue;
    for (const v of VARIANTS) if (!w.has(e.ph, v)) f.push(`§2 ${k} → ${e.ph} has no ${v} drawing in ${PHOSPHOR_PACKAGE} ${PHOSPHOR_VERSION}`);
  }
  // §3
  for (const [k, e] of Object.entries(all)) {
    if (!("extra" in e)) continue;
    if (!e.extra.trim()) f.push(`§3 extra ${k} gives no reason`);
    for (const v of VARIANTS) if (!w.extras[k]?.[v]) f.push(`§3 extra ${k} has no ${v} drawing in scripts/glyphs/extras.ts`);
  }
  for (const k of Object.keys(w.extras)) {
    const e = all[k];
    if (!e || !("extra" in e)) f.push(`§3 extras.ts draws ${k}, which the map does not name as an extra`);
  }
  // §4
  const byName = new Map<string, string[]>();
  for (const [k, e] of Object.entries(all)) if ("ph" in e) byName.set(e.ph, [...(byName.get(e.ph) ?? []), k]);
  const paired = new Set(w.aliases.map(([a, b]) => [a, b].sort().join("|")));
  for (const [name, keys] of byName) {
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      if (!paired.has([keys[i], keys[j]].sort().join("|"))) f.push(`§4 ${keys[i]} and ${keys[j]} both draw ${name} without being declared aliases`);
    }
  }
  for (const [a, b] of w.aliases) {
    const ea = all[a], eb = all[b];
    if (!ea || !eb || !("ph" in ea) || !("ph" in eb) || ea.ph !== eb.ph) f.push(`§4 ALIASES pairs ${a} and ${b}, which do not draw the same name`);
  }
  // §5
  for (const [k, e] of Object.entries(all)) if ("retire" in e && !e.retire.trim()) f.push(`§5 retired key ${k} gives no reason`);
  for (const k of RESERVED) {
    const e = all[k];
    if (!e || "retire" in e) f.push(`§5 reserved key ${k} is retired or missing`);
  }
  // §6
  const caret = boxOfAsset(w, "caret-right", "regular");
  if (!near(caret, [88, 184, 40, 216])) f.push(`§6 caret-right (regular) reads ${caret.join(",")}, not 88,184,40,216 — the bounds reader is wrong`);
  const ring = boxOfAsset(w, "check-circle", "regular");
  if (!near(ring, [24, 232, 24, 232])) f.push(`§6 check-circle (regular) reads ${ring.join(",")}, not 24,232,24,232 — the bounds reader is wrong`);
  // §7
  if (w.pkg.dependencies?.[PHOSPHOR_PACKAGE]) f.push(`§7 ${PHOSPHOR_PACKAGE} is a runtime dependency — it belongs in devDependencies only`);
  if (w.pkg.devDependencies?.[PHOSPHOR_PACKAGE] !== PHOSPHOR_VERSION) f.push(`§7 devDependencies pins ${PHOSPHOR_PACKAGE} as "${w.pkg.devDependencies?.[PHOSPHOR_PACKAGE]}", not exactly "${PHOSPHOR_VERSION}"`);
  if (w.lockVersion !== PHOSPHOR_VERSION) f.push(`§7 package-lock.json resolves ${PHOSPHOR_PACKAGE} to ${w.lockVersion}, not ${PHOSPHOR_VERSION}`);
  return f;
}

const glyphsSrc = read("src/components/ui/glyphs.tsx");
const lock = JSON.parse(read("package-lock.json")) as { packages?: Record<string, { version?: string }> };
const world: World = {
  houseKeys: [...glyphsSrc.matchAll(/^\s+(\w+): \(p: GlyphProps\) =>/gm)].map((m) => m[1]),
  map: GLYPH_MAP,
  newKeys: NEW_KEYS,
  extras: EXTRAS,
  aliases: ALIASES,
  has: (name, v) => existsSync(phosphorFile(name, v)),
  bounds: pathBounds,
  pkg: JSON.parse(read("package.json")),
  lockVersion: lock.packages?.[`node_modules/${PHOSPHOR_PACKAGE}`]?.version,
  readAsset: (name, v) => readFileSync(phosphorFile(name, v), "utf8"),
};

if (!process.argv.includes("--prove-red")) {
  const fails = check(world);
  for (const x of fails) console.log(`FAIL ${x}`);
  const live = Object.values({ ...GLYPH_MAP, ...NEW_KEYS }).filter((e) => !("retire" in e)).length;
  console.log(`\n${world.houseKeys.length} house keys · ${live} live · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

// ── --prove-red: every rule must be able to fail. Plants live on in-memory copies. ──
const W = (patch: Partial<World>): World => ({ ...world, ...patch });
const plants: [string, RegExp, World][] = [
  ["a house key left unmapped", /§1 house key zzNew has no entry/, W({ houseKeys: [...world.houseKeys, "zzNew"] })],
  ["the map names a key the family lacks", /§1 map\.ts names zzGhost/, W({ map: { ...world.map, zzGhost: { ph: "bell" } } })],
  ["a new key collides", /§1 new key bell collides/, W({ newKeys: { ...world.newKeys, bell: { ph: "bell" } } })],
  ["a Phosphor name that does not exist", /§2 bell → no-such-glyph has no regular drawing/, W({ map: { ...world.map, bell: { ph: "no-such-glyph" } } })],
  ["an extra missing a variant", /§3 extra needle has no fill drawing/, W({ extras: { ...world.extras, needle: { ...world.extras.needle, fill: undefined } } })],
  ["a drawing nobody maps", /§3 extras\.ts draws zzOrphan/, W({ extras: { ...world.extras, zzOrphan: {} } })],
  ["two meanings share a glyph", /§4 bell and trophy both draw bell without being declared aliases/, W({ map: { ...world.map, trophy: { ph: "bell" } } })],
  ["an alias that is not one", /§4 ALIASES pairs bell and trophy/, W({ aliases: [...world.aliases, ["bell", "trophy"]] })],
  ["a retirement with no reason", /§5 retired key sortAsc gives no reason/, W({ map: { ...world.map, sortAsc: { retire: " " } } })],
  ["a reserved key retired", /§5 reserved key voidX is retired/, W({ map: { ...world.map, voidX: { retire: "gone" } } })],
  ["the bounds reader breaks", /§6 caret-right \(regular\) reads/, W({ bounds: () => [0, 0, 0, 0] })],
  ["the package becomes a runtime dependency", /§7 .* is a runtime dependency/, W({ pkg: { ...world.pkg, dependencies: { [PHOSPHOR_PACKAGE]: PHOSPHOR_VERSION } } })],
  ["a range instead of a pin", /§7 devDependencies pins .* as "\^/, W({ pkg: { ...world.pkg, devDependencies: { ...world.pkg.devDependencies, [PHOSPHOR_PACKAGE]: `^${PHOSPHOR_VERSION}` } } })],
  ["the lockfile resolves another version", /§7 package-lock\.json resolves .* to 9\.9\.9/, W({ lockVersion: "9.9.9" })],
];
const clean = check(world);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean world already fails (${clean[0]})`);
  process.exit(1);
}
let proved = 0;
for (const [name, want, w] of plants) {
  const fired = check(w).some((x) => want.test(x));
  if (fired) proved++;
  console.log(`${fired ? "PROVED" : "BLIND"}`.padEnd(8) + ` ${name}`);
}
console.log(`\n${proved}/${plants.length} caught`);
process.exit(proved === plants.length ? 0 : 1);
