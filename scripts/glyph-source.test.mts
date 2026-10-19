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
 *   §7 a typed character used as an icon (▲ ▼ ★ ✓ ✗ ⚠ ⛔ ↑ ↓ ● ☰ ⓘ, an arrow, an emoji) is a ratchet too (W4): each
 *      remaining one is named in TEXT_ICONS with its reason (an arrow that is punctuation, text that is not an
 *      interface), the console's and the server's are two frozen totals, and every count may only fall
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
import { decomment, decommentCss } from "./lib/decomment.mts";
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
  // PHOSPHOR-MIGRATION release 2: 2 → 1 — the two-tone `NeedleMark` is the family's `needle` in Duotone (§8a).
  "src/components/layout/needle-drawer.tsx": [1, "the Needle's theme swatches' disc (brand object, round 4 of 2026-10-09)"],
  "src/components/layout/needle.tsx": [1, "the Needle (brand object)"],
  "src/components/layout/notifications-panel.tsx": [1, "W6 (release 2): empty-state art outside the family"],
  "src/components/maswali/maswali-unbroken-line.tsx": [1, "Millionea's hairline (MASWALI-BUILD S5): M5's Unbroken Line and M6's closing rule, drawn on by `.m-draw` — a rule, not an icon"],
  "src/components/markets/conviction-dial.tsx": [1, "the conviction dial (an instrument)"],
  "src/components/onboarding/first-visit-primer.tsx": [1, "W7 (release 3): primer art outside the family"],
  "src/components/positions/countdown-ring.tsx": [1, "the countdown ring (an instrument)"],
  "src/components/positions/pnl-summary-strip.tsx": [1, "a chart"],
  "src/components/rg/self-care-art.tsx": [1, "W7 (release 3): responsible-gambling art outside the family"],
  "src/components/ui/button.tsx": [1, "the button's pending spinner"],
  "src/components/ui/duration-input.tsx": [1, "W7 (release 3): a hand-drawn chevron, on one console page only"],
  "src/components/ui/empty-state.tsx": [13, "W6 (release 2): the private empty-state drawings, retired for Duotone glyphs on plates"],
  "src/components/ui/glyph-shell-sprite.tsx": [1, "the glyph family's inline chrome symbols"],
  "src/components/ui/glyphs.tsx": [2, "the glyph family itself"],
  "src/components/ui/identity-avatar.tsx": [4, "the player's heraldic crest (a second system, DESIGN_AUTHORITY B1a)"],
  "src/components/ui/social-marks.tsx": [3, "vendor marks (Instagram, TikTok, WhatsApp) in their own colours"],
  "src/components/ui/spinner.tsx": [1, "the spinner"],
  "src/components/updown/price-hero.tsx": [1, "a chart"],
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

/**
 * §7 · A TYPED CHARACTER USED AS AN ICON (PHOSPHOR-MIGRATION W4; the audit of 2026-10-19, §8a) — the fourth door. A typed
 * ▲ ▼ ★ ✓ ✗ ⚠ ⛔ ↑ ↓ ↗ ● ☰ ⓘ, an arrow, or an emoji in code is an icon the family does not draw. Counted per file with the
 * comments out; a count may only fall, and a file that reaches 0 leaves the list (so the progress stays won). Two kinds stay,
 * each named: an arrow that is punctuation, read "to" ("Wallet → Withdraw", open → close), and text that is not an
 * interface (a prompt to the model). The console's typed marks and the server's own text are counted as two totals until
 * release 3 replaces the console's (`×` the multiplier and `•` the mask are not icons, and are not counted).
 * ⭐ W4's review: a character is read as the player gets it, so an escape (`←`, `\u{1F525}`) or an HTML entity
 * (`&larr;`, `&#8592;`) is decoded first, and a stylesheet's `content:` value is read too (CSS escapes decoded). The
 * class holds the single guillemets (‹ ›, a chevron's stand-in), ≡ ⋮ ⋯ (menus), ⇅ (a sort), ◆ ■ □ ✦ ⌄ and the flags.
 */
const TEXT_ICON_RE = /[▲▼△▽▶◀►◄▸▾▴◂★☆✓✔✗✘✕✖⚠⛔↑↓↗↘↖↙→←●○◉☰ⓘℹ‹›≡⋮⋯⇅◆■□✦⌄]|\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/gu;
const NOT_ICON = new Set(["©", "®", "™"]);
const ENTITY: Record<string, string> = { larr: "←", rarr: "→", uarr: "↑", darr: "↓", check: "✓", cross: "✗", star: "☆", starf: "★", lsaquo: "‹", rsaquo: "›" };
/** The text as the player reads it: JS escapes and HTML entities decoded (W4's review). */
const asRead = (code: string) => code
  .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
  .replace(/&([a-zA-Z]+);/g, (m: string, n: string) => ENTITY[n] ?? m);
/** A stylesheet's `content:` values, CSS escapes decoded (`\2192` → →). */
const CSS_CONTENT = /content:\s*(["'])((?:\\.|(?!\1).)*)\1/g;
const contentOf = (css: string) => [...css.matchAll(CSS_CONTENT)]
  .map((m) => m[2].replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))).join(" ");
const TYPOGRAPHY = "a → that reads \"to\": a path in a sentence, or between two values — punctuation, not an icon";
const TEMPLATE_COMMENT = "inside a CSS comment in a template literal (the comment stripper keeps literals whole) — not text a player reads";
const CONSOLE_TEXT = "the console's own text (its typed marks go in release 3)";
const TEXT_ICONS: Record<string, [count: number, why: string]> = {
  "src/app/_actions/chat.ts": [3, "the support chatbot's instructions to the model — not an interface"],
  "src/app/millionea/how/page.tsx": [1, `${TYPOGRAPHY} (the example's voided question → standing reserve)`],
  "src/app/legal/privacy/page.tsx": [3, TYPOGRAPHY],
  "src/app/s/optout-refusal.tsx": [1, TYPOGRAPHY],
  "src/app/updown/history/page.tsx": [3, TYPOGRAPHY],
  "src/components/brand.tsx": [3, TEMPLATE_COMMENT],
  "src/components/layout/wallet-balance-pill.tsx": [1, TEMPLATE_COMMENT],
  "src/components/updown/updown-card.tsx": [1, TYPOGRAPHY],
  "src/lib/affiliate-rules.ts": [1, TYPOGRAPHY],
  "src/lib/ai-cycle-rules.ts": [2, `${TYPOGRAPHY} ("USD→TZS", a rate's two currencies)`],
  "src/lib/chat/send-message.ts": [10, "the support chatbot's instructions and answers about paths — not an interface"],
  "src/lib/house-bot/alert-copy.ts": [1, CONSOLE_TEXT],
  "src/lib/house-bot/pause-reasons.ts": [3, CONSOLE_TEXT],
  "src/lib/house-bot/rules.ts": [7, CONSOLE_TEXT],
  "src/lib/i18n-dict.ts": [29, `${TYPOGRAPHY}: the FAQ's and the failure messages' paths ("Wallet → Withdraw", nine written as an escape), Up & Down's "oldest → newest" and its worked example's figures, in three languages`],
  "src/lib/i18n.tsx": [1, TEMPLATE_COMMENT],
  "src/lib/journey/measures.ts": [10, `${TYPOGRAPHY}: a funnel step's name ("Home → bet sheet"), read on the console`],
  "src/lib/legal/policy-lines.ts": [6, TYPOGRAPHY],
  "src/lib/marketing/campaign-status.ts": [7, CONSOLE_TEXT],
  "src/lib/marketing/consent-basis.ts": [2, TYPOGRAPHY],
  "src/lib/marketing/outreach-open-checks.ts": [2, CONSOLE_TEXT],
  "src/lib/operator-refusal.ts": [3, `${TYPOGRAPHY} ("Admin → AI usage")`],
  "src/lib/tax-report.ts": [1, TYPOGRAPHY],
};
/** The console's files (`src/app/admin/`, `src/components/admin/`) and the server's (`src/lib/server/`, `src/app/api/`). */
const CONSOLE_SRC = /^src\/(?:app|components)\/admin\//;
const SERVER_SRC = /^src\/(?:lib\/server|app\/api)\//;
const CONSOLE_TEXT_ICONS = 128; // release 3 brings it to the console's punctuation alone (W4's review: +1, the affiliate page's "tap the ‹")
const SERVER_TEXT_ICONS = 140; // log lines, alerts and the console's messages built on the server

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
  const typed = new Map<string, number>();
  let consoleTyped = 0, serverTyped = 0;
  for (const [rel, text] of w.files) {
    const code = decomment(text);
    // §1
    if (IMPORTS_PHOSPHOR.test(code) && !rel.startsWith("scripts/glyphs/")) f.push(`§1 ${rel} imports @phosphor-icons — icons come from the glyph family (src/components/ui/glyphs)`);
    if (!rel.startsWith("src/")) continue;
    // §7 (counted here, judged below)
    if (!/\.generated\./.test(rel)) {
      const t = [...asRead(code).matchAll(TEXT_ICON_RE)].filter((m) => !NOT_ICON.has(m[0])).length;
      if (t && CONSOLE_SRC.test(rel)) consoleTyped += t;
      else if (t && SERVER_SRC.test(rel)) serverTyped += t;
      else if (t) typed.set(rel, t);
    }
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
  // §7 (counted here, judged below) — a stylesheet's `content:` values, read as the player gets them.
  for (const [rel, css] of w.css) {
    const t = [...contentOf(decommentCss(css)).matchAll(TEXT_ICON_RE)].filter((m) => !NOT_ICON.has(m[0])).length;
    if (t) typed.set(rel, (typed.get(rel) ?? 0) + t);
  }
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
  // §7 — the typed-character door.
  for (const [rel, n] of typed) {
    const listed = TEXT_ICONS[rel];
    if (!listed) f.push(`§7 ${rel} types ${n} icon character(s) — draw the icon with the glyph family (AGENTS.md §7); an arrow that is punctuation is named in TEXT_ICONS with its reason`);
    else if (n > listed[0]) f.push(`§7 ${rel} types ${n} icon character(s), more than its ${listed[0]}`);
    else if (n < listed[0]) f.push(`§7 ${rel} now types ${n} icon character(s) — lower its count from ${listed[0]} in TEXT_ICONS so the progress stays won`);
  }
  for (const rel of Object.keys(TEXT_ICONS)) if (!typed.has(rel)) f.push(`§7 ${rel} no longer types an icon character — remove it from TEXT_ICONS`);
  for (const [area, n, frozen] of [["the console", consoleTyped, CONSOLE_TEXT_ICONS], ["the server", serverTyped, SERVER_TEXT_ICONS]] as const) {
    if (n > frozen) f.push(`§7 ${area} types ${n} icon character(s), more than its ${frozen} — a new typed mark is a family glyph`);
    else if (n < frozen) f.push(`§7 ${area} now types ${n} icon character(s) — lower its total from ${frozen} so the progress stays won`);
  }
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
  const typedN = Object.values(TEXT_ICONS).reduce((a, [n]) => a + n, 0);
  console.log(`\n${files.size} files read · ${Object.keys(SVG_RATCHET).length} files may draw ${svg} inline <svg> · ${Object.keys(DATA_SVG).length} file a data-URI SVG · ${images.length} images under public/, each named · typed marks: ${Object.keys(TEXT_ICONS).length} named files (${typedN}), the console ${CONSOLE_TEXT_ICONS}, the server ${SERVER_TEXT_ICONS} · ${fails.length} failure(s)`);
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
  ["a listed file draws one more", /§3 src\/components\/ui\/button\.tsx draws 2 inline <svg>, more than its 1/, edit("src/components/ui/button.tsx", (t) => t + "\nexport const Z = () => <svg><path d=\"M1 1\"/></svg>;\n")],
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
  // §7 (W4) — the typed-character door.
  ["a new page types a ▲ as an icon", new RegExp("§7 src/app/zz-new/page[.]tsx types 1 icon character"),
    withFile("src/app/zz-new/page.tsx", "export default function P() { return <span>▲ 5</span>; }\n")],
  ["an emoji in a player string", new RegExp("§7 src/components/zz[.]tsx types 1 icon character"),
    withFile("src/components/zz.tsx", 'export const HOT = "\u{1F525} hot";\n')],
  ["a named file types one more", new RegExp("§7 src/app/updown/history/page[.]tsx types 4 icon character[(]s[)], more than its 3"),
    edit("src/app/updown/history/page.tsx", (t) => t + '\nexport const Z = "↑";\n')],
  ["the Millionea example gains a second typed arrow", new RegExp("§7 src/app/millionea/how/page[.]tsx types 2 icon character[(]s[)], more than its 1"),
    edit("src/app/millionea/how/page.tsx", (t) => {
      const site = '${EXAMPLE_VOIDED_MAIN} → ${reserveLabel(1)}';
      if (t.split(site).length !== 2) throw new Error("The Millionea example's one arrow site is absent or duplicated");
      return t.replace(site, '${EXAMPLE_VOIDED_MAIN} → ${reserveLabel(1)} →');
    })],
  ["a named file reaches zero and stays named", new RegExp("§7 src/app/s/optout-refusal[.]tsx no longer types an icon character"),
    edit("src/app/s/optout-refusal.tsx", (t) => t.split("→").join("-"))],
  ["the console gains a typed mark", new RegExp("§7 the console types 129 icon character[(]s[)], more than its 128"),
    withFile("src/app/admin/zz/page.tsx", "export default function P() { return <span>✓</span>; }\n")],
  ["the server's text loses its marks and the total is not lowered", new RegExp("§7 the server now types 1[0-3][0-9] icon character"),
    edit("src/lib/server/marketing/owner-save.ts", (t) => t.split("✓").join("ok"))],
  // W4's review: the census reads what the player gets — an escape, an entity, a stylesheet's content, a wider class.
  ["a back arrow written as an escape", new RegExp("§7 src/app/zz-esc/page[.]tsx types 1 icon character"),
    withFile("src/app/zz-esc/page.tsx", "export const B = () => <a>{`\\u2190 back`}</a>;\n")],
  ["an arrow written as an HTML entity", new RegExp("§7 src/app/zz-ent/page[.]tsx types 1 icon character"),
    withFile("src/app/zz-ent/page.tsx", 'export const B = () => <a dangerouslySetInnerHTML={{ __html: "&rarr; next" }} />;\n')],
  ["a stylesheet draws an arrow through content", new RegExp("§7 src/app/zz-new/arrow[.]css types 1 icon character"),
    { ...world, css: new Map([...world.css, ["src/app/zz-new/arrow.css", '.x::after { content: "\\2192"; }']]) }],
  ["a single guillemet typed as a chevron", new RegExp("§7 src/app/zz-chev/page[.]tsx types 1 icon character"),
    withFile("src/app/zz-chev/page.tsx", "export const N = () => <a>Next ›</a>;\n")],
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
