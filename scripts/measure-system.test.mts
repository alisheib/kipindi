/**
 * Measure-system guard.                                  DESIGN_AUTHORITY B7
 *
 * The defect this locks shut (user report, 2026-07-28: "sometimes the pages are
 * too wide, and the input fields as well"):
 *
 *   - No width rule existed anywhere. DESIGN_AUTHORITY had B1-B6 and the
 *     design-system RULES.md had 12 laws; NEITHER mentioned width. The only
 *     statement in the repo was a stale line in CLAUDE.md the code did not match.
 *   - So width was a hand-typed string repeated ~60 times, drifted into EIGHT
 *     page tiers where three were documented, and `src/app/admin/layout.tsx` had
 *     no cap at all — all 43 admin pages rendered at 100vw-216px (2,344px at
 *     2560) while the player chrome above them was capped at 1280.
 *   - `scripts/responsive-audit.mjs` asserted only `scrollWidth <= clientWidth`
 *     — a LOWER bound, stopping at 1920. A 2,400px form passed with a green tick.
 *
 * This is a RATCHET, not a wall. The pages still carrying a hand-typed width are
 * listed below — **12 as of 2026-08-22, down from 59** — and the list may only
 * ever SHRINK. That way enforcement lands before the migration finishes instead
 * of waiting for it, and no NEW raw width can appear in the meantime.
 *
 * ⭐ §7 (added 2026-08-22) guards a SECOND thing this file did not used to know
 * about: no page may render its own `<main>`. It is here rather than in a file of
 * its own because it is the same defect — see the note above RAW_WIDTH_ALLOWLIST.
 *
 * Run: npm run test:measure
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { decomment } from "./lib/decomment.mts";

/**
 * `MEASURE_ROOT` lets `scripts/measure-red.mjs` aim this gate at a COPY of the
 * tree in the OS temp dir, so a red proof never writes to `src/` — two sessions
 * share this working tree. The root is printed on every run, so pointing it
 * somewhere else can never be silent.
 */
const ROOT = process.env.MEASURE_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const GLOBALS = join(SRC, "app", "globals.css");

/** The tier scale. Defined ONCE in globals.css; asserted here so a silent
 *  retune (say --w-console to 2000) fails rather than quietly widening 43 pages. */
const TIERS: Record<string, string> = {
  "--w-console": "1600px",
  "--w-board": "1280px",
  "--w-reading": "1080px",
  "--w-form": "640px",
  "--w-receipt": "560px",
  "--w-auth": "1152px",
  "--w-field": "460px",
};

/**
 * Files that still hand-type a page width. MAY ONLY SHRINK.
 * Adding to this list is a regression; the fix is <PageContainer tier="…">.
 *
 * ⭐ 2026-08-22 — **59 → 12**, in the pass that removed the nested `<main>`
 * landmarks. Those turned out to be the same population: a page that hand-typed
 * `mx-auto max-w-[1080px] px-3 lg:px-6 py-6` on a `<main>` was simultaneously a
 * nested landmark, a hand-typed width, and a page whose `loading.tsx` tier parity
 * nothing could check — so one `<PageContainer tier>` edit closed all three.
 *
 * ⛔ EVERY ONE OF THE 12 SURVIVORS IS HELD BACK BY **PADDING, NOT WIDTH**, and
 * each is named with its reason below. They all state a width that IS exactly a
 * tier token; what they do not state is the house padding `px-3 lg:px-6 py-6`.
 * Migrating them would silently restyle the page, and a padding change is a
 * design decision, not width hygiene — so they were recorded and left, which is
 * what `SESSION-PROMPT-LANDMARK-AND-MEASURE.md` §4.2 asks for. Whoever finishes
 * these should do it as a DESIGN pass with the frames open, not a rename.
 */
const RAW_WIDTH_ALLOWLIST = new Set<string>([
  // ── Extra vertical padding at lg (house is a flat `py-6`) ─────────────────
  "src/app/fairness/page.tsx",            // py-6 lg:py-8
  "src/app/legal/layout.tsx",             // py-6 lg:py-8, and it is a 240px+1fr grid
  // ── A deliberately airier empty/loading state ─────────────────────────────
  "src/app/loading.tsx",                  // py-10
  "src/app/proposals/page.tsx",           // py-12, on the DISABLED state only —
                                          //   the board itself IS migrated
  // ── Full-height centring compositions, not measure containers ─────────────
  "src/app/not-found.tsx",                // min-h-[80svh] px-5 py-10, centred
  "src/app/markets/[id]/not-found.tsx",   // min-h-[80svh] px-5 py-10, centred
  "src/app/proposals/[id]/not-found.tsx", // min-h-[80svh] px-5 py-10, centred
  "src/components/ui/route-error.tsx",    // min-h-[60svh] px-5 py-12, centred
  // ── Up & Down states a flat px-4, not px-3 lg:px-6 ────────────────────────
  "src/app/updown/page.tsx",
  "src/app/updown/loading.tsx",
  "src/app/updown/history/page.tsx",
  "src/app/updown/history/loading.tsx",
]);


/** Atoms that MUST carry `.field-measure`, and the three that must NOT. */
const MEASURED_ATOMS = [
  "input.tsx", "select.tsx", "textarea.tsx", "date-select.tsx",
  "duration-input.tsx", "password-input.tsx",
];
const EXEMPT_ATOMS = ["otp-input.tsx", "datetime-range-filter.tsx", "time-select.tsx"];

/**
 * ⛔ THE COMMENT STRIPPER IS SHARED, AND IT IS A SCANNER — `scripts/lib/decomment.mts`.
 *
 * This file used to carry its own copy. On 2026-08-22 that copy was found to strip
 * BLOCK comments before LINE comments, so a `/*` written inside a `//` comment opened
 * a block nobody wrote: 5 files, 7,581 characters of `src` invisible to §2's ratchet,
 * §3's tier parity and §6's call-site check, all reporting PASS over the hole (`E-186`).
 *
 * ⛔ THE REPAIR APPLIED THAT DAY — FLIP THE TWO REPLACES — WAS NOT THE FIX, AND THE
 * MEASUREMENT THAT SHOWED IT IS RECORDED IN THE SHARED MODULE. Line-comments-first is
 * blind in the OTHER direction: a `//` inside a block comment eats that block's own
 * terminator, the opener runs on to the next one, and everything between vanishes.
 * Measured across `scripts`: 5 sites, the worst costing ~7.7k characters of
 * `criterion-i18n.test.mts` — which `pii-in-logs.test.mts` §3 really does read.
 * `test:decomment` §5.2 re-derives that number and prints it; do not quote it.
 *
 * ⭐ So there is no safe ORDER; a pair of regexes cannot know it is standing inside a
 * comment. The shared helper walks the text once and lets whichever delimiter it meets
 * first win. It is byte-identical to the flipped version across all 770 files of `src`,
 * so adopting it changed no verdict here — `test:decomment` re-derives that rather than
 * quoting it, and `red:decomment` proves both blindnesses on fixtures.
 */

function walk(dir: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, re));
    else if (re.test(e)) out.push(p);
  }
  return out;
}

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Measure-system guard (DESIGN_AUTHORITY B7)");
log(`  root: ${ROOT}${process.env.MEASURE_ROOT ? "   (MEASURE_ROOT override)" : ""}\n`);

// ── 1. The tokens exist, exactly once, with the expected values ──────────────
const css = readFileSync(GLOBALS, "utf8");
for (const [name, value] of Object.entries(TIERS)) {
  const hits = [...css.matchAll(new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, "gm"))];
  check(`${name} defined exactly once`, hits.length === 1, `${hits.length} definition(s)`);
  if (hits.length === 1) {
    check(`${name} = ${value}`, hits[0][1].trim() === value, `found ${hits[0][1].trim()}`);
  }
}
check("--field-max defaults to none", /--field-max:\s*none;/.test(css));
check(".field-measure reads --field-max", /\.field-measure\s*\{[^}]*max-width:\s*var\(--field-max/.test(css));

// ── 2. No NEW hand-typed page width ─────────────────────────────────────────
// >= 500px only: the ~18 `max-w-[420px]` modal/prose sites and every
// modal.tsx `maxWidth` dialog prop are a different concern and stay untouched.
const tsx = walk(SRC, /\.tsx$/);
const raw: string[] = [];
for (const f of tsx) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (RAW_WIDTH_ALLOWLIST.has(rel)) continue;
  if (rel.startsWith("src/app/api/")) continue;              // Satori OG images, not layout
  if (rel === "src/components/layout/page-container.tsx") continue;
  const src = decomment(readFileSync(f, "utf8"));
  for (const m of src.matchAll(/max-w-\[(\d+)px\]/g)) {
    if (Number(m[1]) >= 500) { raw.push(`${rel} (${m[0]})`); break; }
  }
}
check("no NEW hand-typed page width (>=500px) outside the ratchet list",
  raw.length === 0, raw.join(", "));
log(`  (ratchet holds ${RAW_WIDTH_ALLOWLIST.size} file(s) — the list may only shrink)`);

// ── 3. A page and its loading.tsx must agree on the tier ────────────────────
// This is the guard for the class of bug nothing could see: /updown/[roundId]
// rendered its skeleton at 1080 and its page at 1232 — a 152px jump on EVERY load.
const tierIn = (file: string): string | null => {
  if (!existsSync(file)) return null;
  const s = decomment(readFileSync(file, "utf8"));
  const m = s.match(/tier=["'](\w+)["']/) ?? s.match(/max-w-(console|board|reading|form|receipt|auth)\b/);
  return m ? m[1] : null;
};
/**
 * ⭐ ONE HOP THROUGH A LOCAL DELEGATE. A route often states no measure itself and
 * hands its whole body to a sibling client component — `/wallet/page.tsx` is two
 * imports and a `<WalletPageClient/>`, and the `<PageContainer tier="reading">`
 * lives in `./wallet-client.tsx`.
 *
 * ⛔ Before 2026-08-22 that returned null and the pair was SKIPPED IN SILENCE, so
 * /wallet's page and skeleton could disagree by any amount and this check still
 * printed PASS. It was found by a red-harness mutation that this check MISSED
 * (`scripts/measure-red.mjs` #4) — which is the entire argument for red harnesses.
 * Same-directory relative imports only: predictable, and it is where this pattern
 * actually lives.
 */
const tierOf = (file: string): string | null => {
  const direct = tierIn(file);
  if (direct) return direct;
  if (!existsSync(file)) return null;
  for (const m of decomment(readFileSync(file, "utf8")).matchAll(/from\s+["']\.\/([\w.-]+)["']/g)) {
    const t = tierIn(join(dirname(file), `${m[1]}.tsx`));
    if (t) return t;
  }
  return null;
};
const mismatched: string[] = [];
const unverifiable: string[] = [];
let comparedPairs = 0;
for (const f of tsx) {
  if (basename(f) !== "page.tsx") continue;
  const load = join(dirname(f), "loading.tsx");
  if (!existsSync(load)) continue;
  const route = relative(ROOT, dirname(f)).replace(/\\/g, "/").replace(/^src\/app/, "") || "/";
  const a = tierOf(f), b = tierOf(load);
  if (a && b) {
    comparedPairs++;
    if (a !== b) mismatched.push(`${route} (page=${a} loading=${b})`);
  } else if (!route.startsWith("/admin")) {
    // ⛔ Admin routes are excluded BY DESIGN — the console's cap lives once on
    // `admin/layout.tsx`, so an admin page stating no tier is correct, not a gap.
    unverifiable.push(`${route} (page=${a ?? "—"} loading=${b ?? "—"})`);
  }
}
check("every page and its loading.tsx state the same tier",
  mismatched.length === 0, mismatched.join(", "));
// ⛔ NOT A PASS/FAIL — a COVERAGE line, so this check can never again quietly
// claim more than it measured. It compared 29 of 80 pairs before the delegate hop
// was added and said nothing about the other 51. Every name below is a page whose
// skeleton parity is genuinely unproven; the ones still hand-typing a literal
// resolve themselves when they leave RAW_WIDTH_ALLOWLIST.
log(`  (tier parity compared ${comparedPairs} page/loading pair(s); ${unverifiable.length} unverifiable outside /admin${unverifiable.length ? `: ${unverifiable.join(", ")}` : ""})`);

// ── 4. The admin console is capped ──────────────────────────────────────────
const adminLayout = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
check("admin/layout.tsx caps the content column",
  /max-w-console/.test(adminLayout) && /data-measure="console"/.test(adminLayout));

// ── 5. Field atoms carry the measure — and the three exempt ones do not ─────
for (const a of MEASURED_ATOMS) {
  const p = join(SRC, "components", "ui", a);
  check(`${a} carries .field-measure`, existsSync(p) && /field-measure/.test(readFileSync(p, "utf8")));
}
for (const a of EXEMPT_ATOMS) {
  const p = join(SRC, "components", "ui", a);
  // Guarded in BOTH directions: these are documented exemptions (a fixed OTP cell
  // group, an inline chip row, an intrinsically-sized inline-flex), so "completing
  // the set" later would be a regression, not a tidy-up.
  check(`${a} stays exempt from .field-measure`,
    existsSync(p) && !/field-measure/.test(readFileSync(p, "utf8")));
}

// ── 6. PageContainer call sites carry no width or padding of their own ──────
const polluted: string[] = [];
for (const f of tsx) {
  const src = decomment(readFileSync(f, "utf8"));
  for (const m of src.matchAll(/<PageContainer[^>]*className=["']([^"']*)["']/g)) {
    if (/\b(px-|py-|mx-auto|max-w-)/.test(m[1])) {
      polluted.push(relative(ROOT, f).replace(/\\/g, "/"));
      break;
    }
  }
}
check("no padding/width on a <PageContainer> call site", polluted.length === 0, polluted.join(", "));

// ── 7. Exactly ONE source of <main> on the platform: the app shell ──────────
// `AppShell` renders <main id="main-content"> in the ROOT layout, so every route
// already has its landmark. Measured on production 2026-08-22: SIX of eight
// sampled routes rendered TWO <main> elements, one nested in the other — invalid
// HTML, two "main content" landmarks for a screen reader, and a skip-link that
// resolves to the outer one while the content starts inside the inner one.
//
// ⛔ THE THREE EXEMPTIONS ARE NOT TIDY-UP CANDIDATES:
//   · app-shell.tsx        — this IS the landmark. Deleting it removes the only one.
//   · app/global-error.tsx — renders its own <html>/<body> because the root layout
//                            never ran, so there is NO shell above it. Its <main>
//                            is that page's only landmark and must stay.
//   · app/admin/layout.tsx — 🔴 THE CONSOLE IS A SECOND SHELL, and missing it is what
//                            made this rule do harm. The admin console does NOT use
//                            `AppShell`, so when the 2026-08-22 cleanup removed 44
//                            nested `<main>`s on the rule "the shell owns the
//                            landmark", the console was left under a shell that owned
//                            nothing: ZERO `<main>` and no skip link on all 43 admin
//                            routes, for six days. Measured in a real browser —
//                            `document.querySelectorAll("main").length === 0` — and it
//                            was ~700 of `test:responsive`'s 727 failures.
//                            ⚠️ A rule phrased "no PAGE renders its own" quietly
//                            became "no FILE may", and the file it caught was a shell.
// `PageContainer` cannot render one at all — `"main"` is not in its `as` union, so
// tsc is the guard for its call sites and none is needed here.
const MAIN_EXEMPT = new Set([
  "src/components/layout/app-shell.tsx",
  "src/app/global-error.tsx",
  "src/app/admin/layout.tsx",
]);
const strings = (s: string) => s.replace(/`[^`]*`/g, "");   // drop template literals
const rogueMain: string[] = [];
for (const f of tsx) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (MAIN_EXEMPT.has(rel)) continue;
  // decomment() first so the many prose mentions of `<main>` in this repo's
  // comments do not read as tags — the header explains why the ORDER matters.
  if (/<main[\s>]/.test(strings(decomment(readFileSync(f, "utf8"))))) rogueMain.push(rel);
}
check("no page renders its own <main> — the shell owns that landmark",
  rogueMain.length === 0, rogueMain.join(", "));
check("the shell still renders the skip-link target",
  /<main id="main-content"/.test(readFileSync(join(SRC, "components", "layout", "app-shell.tsx"), "utf8")));

/* ⛔ AND SO DOES THE OTHER SHELL — an exemption without an assertion is a hole exactly
   the size of the defect it was added for. `src/app/admin/layout.tsx` is now permitted
   to render `<main>`; without the two checks below, deleting it again would be silent
   at source level, which is precisely how the console lost its landmark for six days.
   ⚠️ The skip link is asserted too: the console never had one at all, so "the landmark
   exists" alone would restore only half of what was missing. */
const adminShell = readFileSync(join(SRC, "app", "admin", "layout.tsx"), "utf8");
check("the ADMIN shell renders the landmark too — the console does not use AppShell",
  /<main id="main-content"/.test(adminShell),
  "zero <main> on all 43 admin routes was ~700 of test:responsive's failures");
check("…and the admin shell carries its own skip-to-content link",
  /href="#main-content"/.test(adminShell));

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`} — ${tsx.length} tsx files`);
process.exit(fail ? 1 : 0);
