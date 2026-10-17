/**
 * test:glyph-source — every icon comes from the glyph family, and nothing else draws one (AGENTS.md §7; Ali, 2026-10-17,
 * PHOSPHOR-MIGRATION R-NEW-PAGES: "if ay new pages are cretaed we tlel them impelemtn on any new pages rth ephosphor
 * plan"). It runs in predeploy, so a page that hand-draws an icon or imports an icon library does not ship.
 *
 *   npx tsx scripts/glyph-source.test.mts               (npm run test:glyph-source)
 *   npx tsx scripts/glyph-source.test.mts --prove-red   (npm run red:glyph-source — in-process plants, no file is written)
 *
 *   §1 nothing in src/ or scripts/ imports @phosphor-icons/* except the codegen in scripts/glyphs/
 *   §2 no icon package in dependencies or devDependencies, apart from the pinned codegen source as a devDependency
 *   §3 inline <svg> in src/ is a ratchet: each listed file draws exactly its listed count, and no other file draws one.
 *      A listed count that falls must be lowered here in the same commit, so the progress stays won.
 *   §4 a 256-grid viewBox appears in src/ only in a generated file or in one of the two places that frame the generated
 *      drawings (the family's engine, and the offline page that cannot load it) — so no page hand-draws a Phosphor glyph
 *   §5 no SVG is drawn as a data URI in src/ (a stylesheet's `url("data:image/svg+xml…")`, or the same in code) but the
 *      ones named in DATA_SVG with their reason — an icon by another door
 *   §6 every image file under public/ is named in PUBLIC_IMAGES with what it is (the brand, the app's icons, vendors'
 *      marks, share images): an icon is a family key, never an image file — so no icon set arrives with a design
 *
 * ⭐ ONE SOURCE (Ali, 2026-10-17, R-ONE-SOURCE: "we need to have 1 source of glyphs and icons so mark tsi as rule and let
 * na fuutre deins gor pages tkae fomr our new souerce clenaly perfclet loically"). An icon a page needs and the family
 * lacks becomes a KEY — its Phosphor name in scripts/glyphs/map.ts (or a house extra in extras.ts, with its reason), then
 * `npm run glyphs:gen` — and is drawn `<I.key>`. A design delivered for a page is built from the keys, never from its own
 * SVG, image or icon font. §3, §5 and §6 are the three doors an icon could still walk in by; each is a census.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { PHOSPHOR_PACKAGE } from "./glyphs/map.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CODE = /\.(tsx?|mts|mjs|cjs|jsx?)$/;
const ICON_PACKAGE =
  /^(lucide|lucide-react|lucide-static|@heroicons\/.*|react-icons|@phosphor-icons\/.*|phosphor-react|@tabler\/icons.*|@radix-ui\/react-icons|iconoir|iconoir-react|@fortawesome\/.*|@mui\/icons-material|remixicon|@remixicon\/.*|@iconify\/.*|@iconify-json\/.*|hugeicons-react|@hugeicons\/.*|iconsax-react|@fluentui\/react-icons|@material-symbols\/.*|material-symbols|react-feather|feather-icons|@ant-design\/icons|bootstrap-icons|ionicons|@primer\/octicons-react|boxicons)$/;
/** An import of a Phosphor package in any form: `from "…"`, a bare `import "…"`, `import("…")`, `require("…")`. */
const IMPORTS_PHOSPHOR = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']@phosphor-icons\//;

/**
 * The files that may draw an inline <svg>, and how many — the 2026-10-17 census. Each says why. "W7" entries are icons
 * drawn outside the family and fall to 0 in the migration's consolidation wave; the rest are not icons (charts, the brand
 * mark, vendor marks, generated images) or are the family itself.
 */
const SVG_RATCHET: Record<string, [count: number, why: string]> = {
  "src/app/api/og/market/[id]/route.tsx": [2, "the share image, rendered to PNG on the server"],
  "src/app/api/og/page/route.tsx": [1, "the share image, rendered to PNG on the server"],
  "src/app/global-error.tsx": [1, "the brand mark on the last-resort error page, which cannot import components"],
  "src/app/updown/[roundId]/page.tsx": [2, "W7: hand-drawn user and arrow icons"],
  "src/components/admin/admin-charts.tsx": [4, "charts"],
  "src/components/badges/Badge.tsx": [1, "the badge medallion's ring (R-BADGES: identity art)"],
  "src/components/badges/icons.tsx": [1, "the badge medallion art (R-BADGES: identity art)"],
  "src/components/brand-topo.tsx": [1, "brand artwork"],
  "src/components/brand.tsx": [3, "the brand mark"],
  "src/components/charts/micro-spark.tsx": [1, "a chart"],
  "src/components/charts/pnl-chart.tsx": [1, "a chart"],
  "src/components/charts/ring.tsx": [1, "a chart"],
  "src/components/charts/updown-match-track.tsx": [2, "a chart"],
  "src/components/charts/volume-spark.tsx": [1, "a chart"],
  "src/components/chat/ChatPanel.tsx": [1, "W7: a hand-drawn arrow icon"],
  "src/components/chat/HelpMark.tsx": [1, "the chat bubble's own mark"],
  "src/components/layout/bottom-nav.tsx": [1, "the deposit coin's plus (a drawn control, W3 reviews it)"],
  "src/components/layout/needle-drawer.tsx": [5, "the Needle's mark and W7: hand-drawn chevron and check icons"],
  "src/components/layout/needle.tsx": [1, "the Needle (brand object)"],
  "src/components/layout/notifications-panel.tsx": [1, "W7: empty-state art outside the family"],
  "src/components/markets/conviction-dial.tsx": [1, "the conviction dial (an instrument)"],
  "src/components/markets/share-button.tsx": [1, "W7: a hand-drawn link icon"],
  "src/components/onboarding/first-visit-primer.tsx": [1, "W7: primer art outside the family"],
  "src/components/positions/countdown-ring.tsx": [1, "the countdown ring (an instrument)"],
  "src/components/positions/pnl-summary-strip.tsx": [1, "a chart"],
  "src/components/rg/self-care-art.tsx": [1, "W7: responsible-gambling art outside the family"],
  "src/components/settings/feedback-settings.tsx": [1, "W7: a copy of the Needle's mark"],
  "src/components/ui/button.tsx": [1, "the button's pending spinner"],
  "src/components/ui/date-select.tsx": [1, "W7: a hand-drawn chevron"],
  "src/components/ui/duration-input.tsx": [1, "W7: a hand-drawn chevron"],
  "src/components/ui/empty-state.tsx": [13, "W6: the private empty-state drawings, retired for Duotone glyphs on plates"],
  "src/components/ui/glyph-shell-sprite.tsx": [1, "the glyph family's inline chrome symbols"],
  "src/components/ui/glyphs.tsx": [2, "the glyph family itself"],
  "src/components/ui/identity-avatar.tsx": [4, "the player's heraldic crest (a second system, DESIGN_AUTHORITY B1a)"],
  "src/components/ui/select.tsx": [2, "W7: hand-drawn chevron and check icons"],
  "src/components/ui/social-marks.tsx": [3, "vendor marks (Instagram, TikTok, WhatsApp) in their own colours"],
  "src/components/ui/spinner.tsx": [1, "the spinner"],
  "src/components/updown/price-hero.tsx": [1, "a chart"],
  "src/components/updown/round-stake-panel.tsx": [1, "W7: a hand-drawn icon"],
  "src/lib/brand-mark.ts": [3, "the brand mark's source drawings"],
  "src/lib/offline-document.ts": [3, "the offline page, which cannot load the app's components"],
};

/** The two places that frame the generated drawings on Phosphor's 256 grid; neither draws one by hand. */
const FRAMES_256 = new Set(["src/components/ui/glyphs.tsx", "src/lib/offline-document.ts"]);

/** SVG drawn as a data URI in src/ — the 2026-10-17 census, each file and how many, each with its reason. */
const DATA_SVG: Record<string, [count: number, why: string]> = {
  "src/components/layout/needle.css": [1, "the Needle's drag cursor: a CSS cursor takes an image, never an element (W7 draws it from the family's rotateCcw)"],
};
const DATA_SVG_RE = new RegExp("data:image[/]svg[+]xml", "g");

/** Every image file under public/ (the family's sprites, public/icons/g/, are test:glyph-sync's) — what each one is. */
const BRAND = "the brand mark or lockup (DESIGN_AUTHORITY §B1a) — the brand, not an icon";
const APP_ICON = "the app's own icon at a size a platform asks for (the brand mark, build:brand) — not an icon of the interface";
const PUBLIC_IMAGES: Record<string, string> = {
  "public/brand/email-signature.png": "the email signature's brand art",
  "public/brand/lockup-horizontal.svg": BRAND, "public/brand/lockup-stacked.svg": BRAND, "public/brand/mark-color.svg": BRAND,
  "public/brand/mark-dark.svg": BRAND, "public/brand/mark-simplified.svg": BRAND, "public/brand/mark-white.svg": BRAND,
  "public/email-signatures/ali-blue.png": "a staff email signature", "public/email-signatures/ali-white.png": "a staff email signature",
  "public/email-signatures/jay-blue.png": "a staff email signature", "public/email-signatures/jay-white.png": "a staff email signature",
  "public/favicon.ico": APP_ICON, "public/favicon.svg": APP_ICON,
  "public/icons/apple-touch-180.png": APP_ICON, "public/icons/favicon-16.png": APP_ICON, "public/icons/favicon-32.png": APP_ICON,
  "public/icons/icon-192.png": APP_ICON, "public/icons/mark-color-512.png": APP_ICON, "public/icons/mark-dark-512.png": APP_ICON,
  "public/icons/mark-white-512.png": APP_ICON, "public/icons/maskable-512.png": APP_ICON, "public/icons/tile-512.png": APP_ICON,
  "public/icons/shortcut-deposit.png": "the installed app's Deposit shortcut (manifest.json) — W7 redraws it from the family's Fill glyph (build:brand)",
  "public/icons/shortcut-markets.png": "the installed app's Markets shortcut (manifest.json) — W7 redraws it from the family's Fill glyph (build:brand)",
  "public/icons/shortcut-wallet.png": "the installed app's Wallet shortcut (manifest.json) — W7 redraws it from the family's Fill glyph (build:brand)",
  "public/og/og-1200x630.png": "the share image", "public/og/twitter-1200x600.png": "the share image",
  "public/pay/airtel.png": "a payment vendor's mark, in its own colours", "public/pay/halopesa.png": "a payment vendor's mark, in its own colours",
  "public/pay/mixx.png": "a payment vendor's mark, in its own colours", "public/pay/mpesa.svg": "a payment vendor's mark, in its own colours",
  "public/pay/selcom-lipa-qr.d997c1d2.svg": "a payment vendor's mark, in its own colours",
  "public/screenshots/markets-narrow.png": "the installed app's screenshot (manifest.json)",
};
const IMAGE = new RegExp("[.](svg|png|ico|webp|jpe?g|gif|avif|bmp)$", "i");

type World = {
  files: Map<string, string>;
  /** src/'s stylesheets, by repo path. */
  css: Map<string, string>;
  /** Every image file under public/ but the family's sprites, by repo path. */
  images: string[];
  pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
};

function walk(dir: string, out: string[] = [], keep: RegExp = CODE): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out, keep);
    else if (keep.test(e)) out.push(p);
  }
  return out;
}

function check(w: World): string[] {
  const f: string[] = [];
  const counts = new Map<string, number>();
  for (const [rel, text] of w.files) {
    const code = decomment(text);
    // §1
    if (IMPORTS_PHOSPHOR.test(code) && !rel.startsWith("scripts/glyphs/")) f.push(`§1 ${rel} imports @phosphor-icons — icons come from the glyph family (src/components/ui/glyphs)`);
    if (!rel.startsWith("src/")) continue;
    // §3
    const n = (code.match(/<svg[\s>]/g) ?? []).length;
    if (n) counts.set(rel, n);
    // §4
    if (/viewBox="0 0 256 256"/.test(code) && !/\.generated\./.test(rel) && !FRAMES_256.has(rel)) {
      f.push(`§4 ${rel} draws on the 256 grid by hand — Phosphor drawings come only from the codegen`);
    }
  }
  // §2
  for (const [section, deps] of [["dependencies", w.pkg.dependencies], ["devDependencies", w.pkg.devDependencies]] as const) {
    for (const name of Object.keys(deps ?? {})) {
      if (!ICON_PACKAGE.test(name)) continue;
      if (name === PHOSPHOR_PACKAGE && section === "devDependencies") continue;
      f.push(`§2 ${section} carries the icon package ${name} — icons come from the glyph family`);
    }
  }
  // §3
  for (const [rel, n] of counts) {
    const listed = SVG_RATCHET[rel];
    if (!listed) f.push(`§3 ${rel} draws ${n} inline <svg> — draw icons with the glyph family (AGENTS.md §7); a chart or a brand mark is listed here with its reason`);
    else if (n > listed[0]) f.push(`§3 ${rel} draws ${n} inline <svg>, more than its ${listed[0]}`);
    else if (n < listed[0]) f.push(`§3 ${rel} now draws ${n} inline <svg> — lower its count from ${listed[0]} in SVG_RATCHET so the progress stays won`);
  }
  for (const rel of Object.keys(SVG_RATCHET)) if (!counts.has(rel)) f.push(`§3 ${rel} no longer draws an inline <svg> — remove it from SVG_RATCHET`);
  // §5 — the data URI door: in src/'s code and its stylesheets.
  const uris = new Map<string, number>();
  for (const [rel, text] of [...w.files].filter(([r]) => r.startsWith("src/")).concat([...w.css])) {
    const n = (text.match(DATA_SVG_RE) ?? []).length;
    if (n) uris.set(rel, n);
  }
  for (const [rel, n] of uris) {
    const listed = DATA_SVG[rel];
    if (!listed) f.push(`§5 ${rel} draws ${n} SVG as a data URI — an icon is a family glyph (AGENTS.md §7, R-ONE-SOURCE); anything else is named in DATA_SVG with its reason`);
    else if (n !== listed[0]) f.push(`§5 ${rel} draws ${n} SVG as a data URI where DATA_SVG names ${listed[0]}`);
  }
  for (const rel of Object.keys(DATA_SVG)) if (!uris.has(rel)) f.push(`§5 ${rel} no longer draws an SVG data URI — remove it from DATA_SVG`);
  // §6 — the image-file door: every image under public/ is named.
  for (const rel of w.images) {
    if (!(rel in PUBLIC_IMAGES)) f.push(`§6 ${rel} is an image under public/ that is not named — an icon is a family key (AGENTS.md §7, R-ONE-SOURCE); any other image is named in PUBLIC_IMAGES with what it is`);
  }
  for (const rel of Object.keys(PUBLIC_IMAGES)) if (!w.images.includes(rel)) f.push(`§6 ${rel} is gone — remove it from PUBLIC_IMAGES`);
  return f;
}

const files = new Map<string, string>();
for (const dir of ["src", "scripts"]) {
  for (const p of walk(join(ROOT, dir))) files.set(relative(ROOT, p).split(sep).join("/"), readFileSync(p, "utf8"));
}
const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
const css = new Map(walk(join(ROOT, "src"), [], new RegExp("[.]css$")).map((p): [string, string] => [rel(p), readFileSync(p, "utf8")]));
const images = walk(join(ROOT, "public"), [], IMAGE).map(rel).filter((r) => !r.startsWith("public/icons/g/")).sort();
const world: World = { files, css, images, pkg: JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) };

if (!process.argv.includes("--prove-red")) {
  const fails = check(world);
  for (const x of fails) console.log(`FAIL ${x}`);
  const svg = Object.values(SVG_RATCHET).reduce((a, [n]) => a + n, 0);
  console.log(`\n${files.size} files read · ${Object.keys(SVG_RATCHET).length} files may draw ${svg} inline <svg> · ${Object.keys(DATA_SVG).length} file a data-URI SVG · ${images.length} images under public/, each named · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

// ── --prove-red: plants live on in-memory copies. The package name is assembled, so this file never matches §1 itself. ──
const PH = "@phosphor" + "-icons/";
const withFile = (rel: string, text: string): World => ({ ...world, files: new Map([...world.files, [rel, text]]) });
const edit = (rel: string, fn: (t: string) => string): World => withFile(rel, fn(world.files.get(rel) ?? ""));
const plants: [string, RegExp, World][] = [
  ["a page imports a Phosphor package", /§1 src\/app\/zz-new\/page\.tsx imports @phosphor-icons/, withFile("src/app/zz-new/page.tsx", 'import { Bell } from "' + PH + 'react";\nexport default function P() { return <Bell />; }\n')],
  ["a script outside the codegen imports it", /§1 scripts\/zz-tool\.mts imports @phosphor-icons/, withFile("scripts/zz-tool.mts", 'import "' + PH + 'core";\n')],
  ["an icon library joins the dependencies", /§2 dependencies carries the icon package lucide-react/, { ...world, pkg: { ...world.pkg, dependencies: { ...world.pkg.dependencies, "lucide-react": "1.0.0" } } }],
  ["the codegen source becomes a runtime dependency", /§2 dependencies carries the icon package @phosphor-icons\/core/, { ...world, pkg: { ...world.pkg, dependencies: { ...world.pkg.dependencies, [PHOSPHOR_PACKAGE]: "2.1.1" } } }],
  ["a new page hand-draws an icon", /§3 src\/app\/zz-new\/page\.tsx draws 1 inline <svg>/, withFile("src/app/zz-new/page.tsx", "export default function P() { return <svg viewBox=\"0 0 24 24\"><path d=\"M1 1\"/></svg>; }\n")],
  ["a listed file draws one more", /§3 src\/components\/ui\/select\.tsx draws 3 inline <svg>, more than its 2/, edit("src/components/ui/select.tsx", (t) => t + "\nexport const Z = () => <svg><path d=\"M1 1\"/></svg>;\n")],
  ["a listed file draws fewer and the list is not lowered", /§3 src\/components\/ui\/spinner\.tsx no longer draws/, edit("src/components/ui/spinner.tsx", (t) => t.split("<svg").join("<span"))],
  ["a hand-drawn 256-grid glyph", /§4 src\/app\/zz-new\/icon\.tsx draws on the 256 grid by hand/, withFile("src/app/zz-new/icon.tsx", 'export const V = "x"; const a = <path />; const vb = <g viewBox="0 0 256 256" />;\n')],
  ["a stylesheet draws an icon as a data URI", new RegExp("§5 src/app/zz-new/page[.]css draws 1 SVG as a data URI"),
    { ...world, css: new Map([...world.css, ["src/app/zz-new/page.css", ".x { background: url(\"data:image/svg+xml;utf8,<svg/>\"); }"]]) }],
  ["a page's code draws an icon as a data URI", new RegExp("§5 src/app/zz-new/page[.]tsx draws 1 SVG as a data URI"),
    withFile("src/app/zz-new/page.tsx", 'export const ICON = "data:image/svg+xml;utf8,<svg/>";\n')],
  ["the Needle's cursor gains a second data URI", new RegExp("§5 src/components/layout/needle[.]css draws 2 SVG"),
    { ...world, css: new Map([...world.css].map(([r, t]): [string, string] => [r, r === "src/components/layout/needle.css" ? `${t}\n.y { cursor: url("data:image/svg+xml;utf8,<svg/>"); }` : t])) }],
  ["a design drops an icon file into public/", new RegExp("§6 public/icons/zz-bell[.]svg is an image under public/ that is not named"),
    { ...world, images: [...world.images, "public/icons/zz-bell.svg"] }],
  ["a named image is removed and the census keeps it", new RegExp("§6 public/pay/mixx[.]png is gone"),
    { ...world, images: world.images.filter((r) => r !== "public/pay/mixx.png") }],
];
const clean = check(world);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean repository already fails (${clean[0]})`);
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
