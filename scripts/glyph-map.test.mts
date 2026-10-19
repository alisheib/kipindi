/**
 * test:glyph-map — every glyph of the family has its Phosphor answer, and every answer exists (PHOSPHOR-MIGRATION;
 * docs/PHOSPHOR-MIGRATION.md §3–§4).
 *
 *   npx tsx scripts/glyph-map.test.mts               (npm run test:glyph-map)
 *   npx tsx scripts/glyph-map.test.mts --prove-red   (npm run red:glyph-map — in-process plants, no file is written)
 *
 *   §1 the family draws exactly the map's live keys: the generated registry holds every live key and nothing else, and
 *      no retired key is drawn anywhere in src/ (`I.<key>`, or a glyph table's quoted key)
 *   §2 every Phosphor name exists in the pinned package, in all four variants
 *   §3 every house extra has all four drawings, and every drawing in extras.ts belongs to a mapped extra
 *   §4 one meaning, one glyph: two live keys share a Phosphor name only when ALIASES pairs them
 *   §5 every retired key says why, and no reserved key is retired
 *   §6 the bounds reader is right on shapes whose bounds are known by construction
 *   §7 the package is pinned exactly, as a devDependency, and the lockfile resolves that version
 *   §8 every mark that stands among words is Phosphor's own glyph: its key is live and maps to the mark's Phosphor name,
 *      and its centreline stroked at Regular's 16 units reaches exactly the Regular outline's bounds
 *   §9 the chrome never waits for a file: every key the two tab bars and the two headers draw before a tap is a shell key
 *      (inlined in the root layout); a key drawn only once a tap opens a menu or panel is named, with where, as `tap`;
 *      every chrome file exists, every `tap` key is one its file draws, and every shell key is drawn by the chrome
 *  §9b every destination the two tab bars hand to NavGlyph ships a Fill (FILL_KEYS): the current one is drawn in it, and
 *      without one the engine would fall back to Bold in silence (W3's review). And the Fills inlined beside the chrome's
 *      Bold are exactly the ones the chrome draws (map.ts CHROME_FILLS, W4): each a shell key that ships a Fill; every
 *      tab-bar destination among them (else the current tab's Fill would wait for the sprite file); each drawn in Fill by
 *      a chrome file (else every page inlines it for nothing)
 *  §10 the console's own keys stay in the console (W3, when the admin sidebar's destinations joined ADMIN_KEYS): the admin
 *      sprite is the one a player never downloads, so every admin key is drawn by a console file (src/app/admin/,
 *      src/components/admin/) and by no other file, is drawn somewhere (or it ships for nothing), and is not a shell key
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADMIN_KEYS, ALIASES, CHROME_FILLS, FILL_KEYS, GLYPH_MAP, NEW_KEYS, PHOSPHOR_PACKAGE, PHOSPHOR_VERSION, SHELL_KEYS, type MapEntry,
} from "./glyphs/map.ts";
import { EXTRAS, type Variant } from "./glyphs/extras.ts";
import { TEXT_MARKS, type Mark } from "./glyphs/marks.ts";
import { pathBounds, type Box } from "./glyphs/reach.mts";
import { phosphorFile, REGISTRY_PATH, VARIANTS } from "./glyphs/codegen.mts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Keys a later wave or another lane depends on: never retired. */
const RESERVED = ["live", "clockPending", "wifiOff"];
/**
 * The always-visible chrome (§9): the files the two tab bars and the two headers are drawn from, and in each the keys it
 * draws only once a tap has opened something — those may wait for the sprite file, as page content does.
 */
const CHROME: Record<string, { tap?: Record<string, string> }> = {
  "src/components/layout/top-app-bar.tsx": {},
  "src/components/layout/bottom-nav.tsx": {},
  "src/components/layout/nav-more.tsx": {},
  "src/components/layout/wallet-balance-pill.tsx": {},
  "src/components/ui/cash.tsx": {}, // CashEye: the balance pill's eye
  "src/components/layout/notifications-panel.tsx": { tap: { x: "the open panel's close and a row's dismiss", chevronRight: "a row's door, in the open panel" } },
  "src/components/ui/language-menu.tsx": { tap: { check: "the chosen language, in the open menu" } },
  "src/components/layout/avatar-menu.tsx": { tap: {
    staffConsole: "the staff console's row", arrowRight: "a menu row's door", logOut: "the menu's sign-out row",
    portfolio: "a menu row", profile: "a menu row", resolved: "a menu row", wallet: "a menu row", podium: "a menu row",
    idea: "a menu row (Propose & earn)", users: "a menu row (Invite & Earn)", idCard: "a menu row (Verify ID)",
  } },
  "src/components/journey/journey-top-bar.tsx": {},
  "src/components/journey/journey-tabs.tsx": {},
  "src/lib/nav/active-tab.ts": {}, // JOURNEY_TABS: the journey's four tabs
};

type World = {
  registryKeys: string[];
  srcFiles: Map<string, string>;
  map: Record<string, MapEntry>;
  newKeys: Record<string, MapEntry>;
  extras: Record<string, Partial<Record<Variant, unknown>>>;
  aliases: Array<[string, string]>;
  marks: Record<string, Mark>;
  has: (name: string, v: Variant) => boolean;
  bounds: (d: string) => Box;
  pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  lockVersion: string | undefined;
  readAsset: (name: string, v: Variant) => string;
  shell: readonly string[];
  chrome: typeof CHROME;
  admin: readonly string[];
  fill: readonly string[];
  chromeFills: readonly string[];
};

/** The console's own files (§10): a key drawn here, and nowhere else, belongs in the admin sprite. */
const CONSOLE_FILE = /^src\/(?:app|components)\/admin\//;

/** A source text with its comments out — once per text, however many sections and plants read it (§1, §9, §10). */
const DECOMMENTED = new Map<string, string>();
const codeOf = (text: string) => {
  let code = DECOMMENTED.get(text);
  if (code === undefined) { code = decomment(text); DECOMMENTED.set(text, code); }
  return code;
};

/** The keys a source text draws: `I.<key>`, and a glyph table's quoted key (§1's reading). */
// A key is drawn as `I.key`, named in a table (`glyph: "key"`), or — since W3 — handed to NavGlyph (`glyph="key"`).
const drawnKeys = (text: string, keys: string[]) => {
  const code = codeOf(text);
  return keys.filter((k) => new RegExp("\\bI\\." + k + "(?![A-Za-z0-9_])").test(code) || new RegExp("glyph[A-Za-z]*\\s*[:=]\\s*\\{?\\s*[\"']" + k + "[\"']").test(code));
};
/** Only the named form: a table's `glyph: "key"` or NavGlyph's `glyph="key"` — what a tab bar hands to NavGlyph (§9b). */
const namedKeys = (text: string, keys: string[]) => {
  const code = codeOf(text);
  return keys.filter((k) => new RegExp("glyph[A-Za-z]*\\s*[:=]\\s*\\{?\\s*[\"']" + k + "[\"']").test(code));
};
/**
 * §9b (W3's review) · the files whose named glyphs are the two tab bars' destinations, every one drawn by NavGlyph — and
 * the current one in Fill. A key there that ships no Fill would not fail anywhere else: `variantOf` falls back to Bold,
 * so the current tab would quietly draw Line. (The console's destinations are `test:admin-nav` §8's.)
 */
const NAV_GLYPH_FILES = ["src/components/layout/bottom-nav.tsx", "src/components/layout/nav-more.tsx", "src/lib/nav/active-tab.ts"];

const near = (a: Box, b: Box, tol = 0.05) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
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
  const all = { ...w.map, ...w.newKeys };
  const live = Object.keys(all).filter((k) => !("retire" in all[k]));
  // §1
  const reg = new Set(w.registryKeys);
  for (const k of live) if (!reg.has(k)) f.push(`§1 live key ${k} is missing from the generated registry — run npm run glyphs:gen`);
  for (const k of w.registryKeys) if (!live.includes(k)) f.push(`§1 the registry draws ${k}, which the map does not keep live`);
  for (const k of Object.keys(w.newKeys)) if (k in w.map) f.push(`§1 new key ${k} collides with an existing key`);
  const retired = Object.keys(all).filter((k) => "retire" in all[k]);
  for (const [rel, text] of w.srcFiles) {
    const code = codeOf(text);
    for (const k of retired) {
      if (new RegExp("\\bI\\." + k + "(?![A-Za-z0-9_])").test(code) || new RegExp("glyph[A-Za-z]*:\\s*[\"']" + k + "[\"']").test(code)) {
        f.push(`§1 ${rel} draws the retired key ${k}`);
      }
    }
  }
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
  for (const k of live) { const e = all[k]; if ("ph" in e) byName.set(e.ph, [...(byName.get(e.ph) ?? []), k]); }
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
  for (const k of retired) { const e = all[k]; if ("retire" in e && !e.retire.trim()) f.push(`§5 retired key ${k} gives no reason`); }
  for (const k of RESERVED) { const e = all[k]; if (!e || "retire" in e) f.push(`§5 reserved key ${k} is retired or missing`); }
  // §6
  const caret = boxOfAsset(w, "caret-right", "regular");
  if (!near(caret, [88, 184, 40, 216])) f.push(`§6 caret-right (regular) reads ${caret.join(",")}, not 88,184,40,216 — the bounds reader is wrong`);
  const ring = boxOfAsset(w, "check-circle", "regular");
  if (!near(ring, [24, 232, 24, 232])) f.push(`§6 check-circle (regular) reads ${ring.join(",")}, not 24,232,24,232 — the bounds reader is wrong`);
  // §7
  if (w.pkg.dependencies?.[PHOSPHOR_PACKAGE]) f.push(`§7 ${PHOSPHOR_PACKAGE} is a runtime dependency — it belongs in devDependencies only`);
  if (w.pkg.devDependencies?.[PHOSPHOR_PACKAGE] !== PHOSPHOR_VERSION) f.push(`§7 devDependencies pins ${PHOSPHOR_PACKAGE} as "${w.pkg.devDependencies?.[PHOSPHOR_PACKAGE]}", not exactly "${PHOSPHOR_VERSION}"`);
  if (w.lockVersion !== PHOSPHOR_VERSION) f.push(`§7 package-lock.json resolves ${PHOSPHOR_PACKAGE} to ${w.lockVersion}, not ${PHOSPHOR_VERSION}`);
  // §8
  for (const [k, m] of Object.entries(w.marks)) {
    const e = all[k];
    if (!e || "retire" in e) { f.push(`§8 mark ${k} is not a live key`); continue; }
    if (!("ph" in e) || e.ph !== m.ph) f.push(`§8 mark ${k} draws ${m.ph}, but the map draws ${"ph" in e ? e.ph : "an extra"}`);
    const s = w.bounds(m.stroke);
    let b: Box = [s[0] - 8, s[1] + 8, s[2] - 8, s[3] + 8];
    if (m.fill) { const p = w.bounds(m.fill); b = [Math.min(b[0], p[0]), Math.max(b[1], p[1]), Math.min(b[2], p[2]), Math.max(b[3], p[3])]; }
    const o = boxOfAsset(w, m.ph, "regular");
    if (!near(b, o, 0.5)) f.push(`§8 mark ${k}: its centreline at 16 units reaches ${b.map((v) => Math.round(v)).join(",")}, Phosphor's ${m.ph} reaches ${o.map((v) => Math.round(v)).join(",")}`);
  }
  // §9
  const keys = Object.keys(all), byChrome = new Set<string>();
  for (const [rel, c] of Object.entries(w.chrome)) {
    const text = w.srcFiles.get(rel);
    if (text === undefined) { f.push(`§9 the chrome file ${rel} is not a source file — the chrome's list is stale`); continue; }
    const drawn = drawnKeys(text, keys);
    for (const k of drawn) {
      if (c.tap && k in c.tap) { if (!c.tap[k].trim()) f.push(`§9 ${rel} exempts ${k} with no reason`); continue; }
      byChrome.add(k);
      if (!w.shell.includes(k)) f.push(`§9 ${rel} draws ${k} before a tap, and ${k} is not a shell key — on a slow first visit it waits for the sprite file`);
    }
    for (const k of Object.keys(c.tap ?? {})) if (!drawn.includes(k)) f.push(`§9 ${rel} exempts ${k}, which it does not draw`);
  }
  for (const k of w.shell) if (!byChrome.has(k)) f.push(`§9 shell key ${k} is drawn by no chrome file — every page inlines it for nothing`);
  for (const rel of NAV_GLYPH_FILES) {
    const text = w.srcFiles.get(rel);
    if (text === undefined) { f.push(`§9b the tab-bar file ${rel} is not a source file — the list is stale`); continue; }
    const named = namedKeys(text, keys);
    if (!named.length) f.push(`§9b ${rel} names no destination glyph — the list is stale`);
    for (const k of named) {
      if (!w.fill.includes(k)) f.push(`§9b ${rel} hands ${k} to NavGlyph, and ${k} ships no Fill — the current tab would draw Line`);
      else if (!w.chromeFills.includes(k)) f.push(`§9b ${rel} hands ${k} to NavGlyph, and ${k}'s Fill is not in CHROME_FILLS — the current tab would wait for the sprite file`);
    }
  }
  for (const k of w.chromeFills) {
    if (!w.shell.includes(k) || !w.fill.includes(k)) { f.push(`§9b CHROME_FILLS names ${k}, which is not a shell key that ships a Fill`); continue; }
    const tab = NAV_GLYPH_FILES.some((rel) => namedKeys(w.srcFiles.get(rel) ?? "", [k]).length > 0);
    const filled = Object.keys(w.chrome).some((rel) => new RegExp(`<I\\.${k}\\b[^>]*\\btier=[^>]*fill`).test(codeOf(w.srcFiles.get(rel) ?? "")));
    if (!tab && !filled) f.push(`§9b CHROME_FILLS names ${k}, which no chrome file draws in Fill — every page inlines it for nothing`);
  }
  // §10
  const byConsole = new Set<string>();
  for (const [rel, text] of w.srcFiles) {
    for (const k of drawnKeys(text, [...w.admin])) {
      if (CONSOLE_FILE.test(rel)) byConsole.add(k);
      else f.push(`§10 ${rel} draws the admin key ${k} — a player page would fetch the admin sprite; make ${k} an app key, or draw another`);
    }
  }
  for (const k of w.admin) {
    if (!byConsole.has(k)) f.push(`§10 admin key ${k} is drawn by no console file — the admin sprite ships it for nothing`);
    if (w.shell.includes(k)) f.push(`§10 ${k} is both a shell key and an admin key — one group per key`);
  }
  return f;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(e) && !e.includes(".generated.")) out.push(p);
  }
  return out;
}
const srcFiles = new Map<string, string>();
for (const p of walk(join(ROOT, "src"))) srcFiles.set(relative(ROOT, p).split(sep).join("/"), readFileSync(p, "utf8"));
const lock = JSON.parse(read("package-lock.json")) as { packages?: Record<string, { version?: string }> };
const world: World = {
  registryKeys: [...read(REGISTRY_PATH).matchAll(/^ {2}"([^"]+)": \{ s:/gm)].map((m) => m[1]),
  srcFiles,
  map: GLYPH_MAP,
  newKeys: NEW_KEYS,
  extras: EXTRAS,
  aliases: ALIASES,
  marks: TEXT_MARKS,
  has: (name, v) => existsSync(phosphorFile(name, v)),
  bounds: pathBounds,
  pkg: JSON.parse(read("package.json")),
  lockVersion: lock.packages?.[`node_modules/${PHOSPHOR_PACKAGE}`]?.version,
  readAsset: (name, v) => readFileSync(phosphorFile(name, v), "utf8"),
  shell: SHELL_KEYS,
  chrome: CHROME,
  admin: ADMIN_KEYS,
  fill: FILL_KEYS,
  chromeFills: CHROME_FILLS,
};

if (!process.argv.includes("--prove-red")) {
  const fails = check(world);
  for (const x of fails) console.log(`FAIL ${x}`);
  console.log(`\n${world.registryKeys.length} glyphs · ${Object.keys(TEXT_MARKS).length} marks · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

// ── --prove-red: every rule must be able to fail. Plants live on in-memory copies. ──
const W = (patch: Partial<World>): World => ({ ...world, ...patch });
const withSrc = (rel: string, text: string) => W({ srcFiles: new Map([...world.srcFiles, [rel, text]]) });
const plants: [string, RegExp, World][] = [
  ["a live key missing from the registry", /§1 live key bell is missing/, W({ registryKeys: world.registryKeys.filter((k) => k !== "bell") })],
  ["the registry draws a key the map does not keep", /§1 the registry draws zzGhost/, W({ registryKeys: [...world.registryKeys, "zzGhost"] })],
  ["a new key collides", /§1 new key bell collides/, W({ newKeys: { ...world.newKeys, bell: { ph: "bell" } } })],
  ["a page draws a retired key", /§1 src\/app\/zz\/page\.tsx draws the retired key sortAsc/, withSrc("src/app/zz/page.tsx", "export const P = () => <I.sortAsc s={14} />;")],
  ["a glyph table names a retired key", /§1 src\/lib\/zz\.ts draws the retired key radio/, withSrc("src/lib/zz.ts", 'export const ROW = { glyph: "radio" };')],
  ["a Phosphor name that does not exist", /§2 bell → no-such-glyph has no regular drawing/, W({ map: { ...world.map, bell: { ph: "no-such-glyph" } } })],
  ["an extra missing a variant", /§3 extra needle has no fill drawing/, W({ extras: { ...world.extras, needle: { ...world.extras.needle, fill: undefined } } })],
  ["a drawing nobody maps", /§3 extras\.ts draws zzOrphan/, W({ extras: { ...world.extras, zzOrphan: {} } })],
  ["two meanings share a glyph", /§4 bell and trophy both draw bell without being declared aliases/, W({ map: { ...world.map, trophy: { ph: "bell" } } })],
  ["an alias that is not one", /§4 ALIASES pairs bell and trophy/, W({ aliases: [...world.aliases, ["bell", "trophy"]] })],
  ["a retirement with no reason", /§5 retired key sortAsc gives no reason/, W({ map: { ...world.map, sortAsc: { retire: " " } } })],
  ["a reserved key retired", /§5 reserved key clockPending is retired/, W({ map: { ...world.map, clockPending: { retire: "gone" } } })],
  ["the bounds reader breaks", /§6 caret-right \(regular\) reads/, W({ bounds: () => [0, 0, 0, 0] })],
  ["the package becomes a runtime dependency", /§7 .* is a runtime dependency/, W({ pkg: { ...world.pkg, dependencies: { [PHOSPHOR_PACKAGE]: PHOSPHOR_VERSION } } })],
  ["a range instead of a pin", /§7 devDependencies pins .* as "\^/, W({ pkg: { ...world.pkg, devDependencies: { ...world.pkg.devDependencies, [PHOSPHOR_PACKAGE]: `^${PHOSPHOR_VERSION}` } } })],
  ["the lockfile resolves another version", /§7 package-lock\.json resolves .* to 9\.9\.9/, W({ lockVersion: "9.9.9" })],
  ["a mark drifts off Phosphor's drawing", /§8 mark chevronRight: its centreline/, W({ marks: { ...world.marks, chevronRight: { ...world.marks.chevronRight, stroke: "M96 48L190 128L96 208" } } })],
  ["a mark on a retired key", /§8 mark sortAsc is not a live key/, W({ marks: { ...world.marks, sortAsc: { ph: "sort-ascending", stroke: "M40 40H216" } } })],
  ["a mark that names another glyph", /§8 mark chevronLeft draws caret-right/, W({ marks: { ...world.marks, chevronLeft: { ...world.marks.chevronLeft, ph: "caret-right" } } })],
  ["the balance pill's eye leaves the shell", /§9 src\/components\/ui\/cash\.tsx draws eye before a tap/, W({ shell: world.shell.filter((k) => k !== "eye") })],
  ["a tab bar gains a glyph the shell does not hold", /§9 src\/components\/layout\/bottom-nav\.tsx draws coins before a tap/,
    withSrc("src/components/layout/bottom-nav.tsx", `${world.srcFiles.get("src/components/layout/bottom-nav.tsx")}\nexport const Zz = () => <I.coins s={20} />;\n`)],
  ["a tab bar hands NavGlyph a glyph the shell does not hold", /§9 src\/components\/layout\/nav-more\.tsx draws coins before a tap/,
    withSrc("src/components/layout/nav-more.tsx", `${world.srcFiles.get("src/components/layout/nav-more.tsx")}\nexport const Zz = () => <NavGlyph glyph="coins" on={false} s={24} />;\n`)],
  ["an exemption for a glyph the file does not draw", /§9 src\/components\/ui\/language-menu\.tsx exempts zzGone, which it does not draw/,
    W({ chrome: { ...CHROME, "src/components/ui/language-menu.tsx": { tap: { ...CHROME["src/components/ui/language-menu.tsx"].tap, zzGone: "nothing" } } } })],
  ["an exemption with no reason", /§9 src\/components\/layout\/avatar-menu\.tsx exempts logOut with no reason/,
    W({ chrome: { ...CHROME, "src/components/layout/avatar-menu.tsx": { tap: { ...CHROME["src/components/layout/avatar-menu.tsx"].tap, logOut: " " } } } })],
  ["a chrome file moved away", /§9 the chrome file src\/components\/layout\/zz-bar\.tsx is not a source file/, W({ chrome: { ...CHROME, "src/components/layout/zz-bar.tsx": {} } })],
  ["a shell key nothing in the chrome draws", /§9 shell key coins is drawn by no chrome file/, W({ shell: [...world.shell, "coins"] })],
  ["a tab-bar destination that ships no Fill", /§9b src\/components\/layout\/bottom-nav\.tsx hands live to NavGlyph, and live ships no Fill/, W({ fill: world.fill.filter((k) => k !== "live") })],
  ["the journey's tab table loses a Fill", /§9b src\/lib\/nav\/active-tab\.ts hands ticket to NavGlyph, and ticket ships no Fill/, W({ fill: world.fill.filter((k) => k !== "ticket") })],
  ["a tab-bar destination's Fill leaves the inline symbols", /§9b src\/components\/layout\/bottom-nav\.tsx hands live to NavGlyph, and live's Fill is not in CHROME_FILLS/,
    W({ chromeFills: world.chromeFills.filter((k) => k !== "live") })],
  ["an inlined Fill the chrome never draws", /§9b CHROME_FILLS names lock, which no chrome file draws in Fill/, W({ chromeFills: [...world.chromeFills, "lock"] })],
  ["an inlined Fill that is no shell key", /§9b CHROME_FILLS names coins, which is not a shell key that ships a Fill/, W({ chromeFills: [...world.chromeFills, "coins"] })],
  ["a player page draws an admin key", /§10 src\/app\/zz\/page\.tsx draws the admin key brain/, withSrc("src/app/zz/page.tsx", "export const P = () => <I.brain s={14} />;")],
  ["a player table names an admin key", /§10 src\/lib\/zz\.ts draws the admin key dashboard/, withSrc("src/lib/zz.ts", 'export const ROW = { glyph: "dashboard" };')],
  ["an admin key no console file draws", /§10 admin key wifiOff is drawn by no console file/, W({ admin: [...world.admin, "wifiOff"] })],
  ["a key in two groups", /§10 bell is both a shell key and an admin key/, W({ admin: [...world.admin, "bell"] })],
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
