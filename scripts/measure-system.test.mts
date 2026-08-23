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
 * ⛔ LINE COMMENTS FIRST, THEN BLOCK COMMENTS. THE ORDER IS THE WHOLE POINT.
 *
 * This used to strip block comments first, and that made the guard BLIND over
 * arbitrary stretches of real source. `src/app/proposals/page.tsx` carries the
 * line comment:
 *
 *     // an honest, guided "not available" state — deep links to /proposals/* are
 *
 * `/proposals/*` contains a literal `/*`, so a block-comment stripper run first
 * treats it as the START of a comment and eats everything up to the next `*​/`
 * — 2,359 characters of that file, including the `max-w-[1080px]` on the very
 * next line. So §2's hand-typed-width ratchet, §3's page/loading tier parity and
 * §6's call-site padding check all silently skipped that region and reported PASS.
 *
 * Measured across `src` on 2026-08-22: FIVE files, **7,581 characters of source
 * invisible to every check in this file**. Stripping line comments first removes
 * the `/*` before it can be mistaken for an opener.
 *
 * ⚠️ **22 OTHER SCRIPTS CARRY THE OLD ORDER AND ARE BLIND OVER THE SAME FIVE
 * FILES.** Count them with a FIXED-STRING search for the ordering itself, not by
 * grepping the NAME `decomment` — several spell it differently or inline it, and
 * a name-based grep undercounts (it said 18 on 2026-08-22, and 18 is wrong):
 *
 *     grep -rlF 's.replace(/\/\*[\s\S]*?\*\//g, "").replace(' scripts/
 *
 * ⚠️ That grep returns **23** — it matches THIS FILE on the comment you are
 * reading. Discount this one; the other 22 are the real population.
 *
 * They include `type-scale`, `ui-consistency`, `tailwind-bridge`,
 * `settle-atomicity`, `id-documents`, `pii-in-logs` and six `kyc-cert-*` suites.
 *
 * ⭐ MEASURED 2026-08-23, BEFORE ASSUMING THE WORST: flipping the order in a
 * temp copy and re-running each gate changes NOTHING for the six that could be
 * compared cleanly — **`type-scale` and `ui-consistency` included**, which are the
 * two whose ratchets sit at their floor and were the reason to worry. So the blind
 * spot is currently hiding **no** violation those gates would flag. The other 17
 * could not be compared: 11 error in both states (they need env/args, or derive
 * their own ROOT with no override), and 6 spell the statement in a shape a
 * mechanical rewrite could not flip.
 *
 * ⛔ That is a reason to do the work CALMLY, not to skip it — "hides nothing
 * today" is a fact about today's source, and the next `/*` inside a `//` comment
 * silently re-opens the hole. The real obstacle is that most of those gates cannot
 * be aimed at a mutated tree at all, which is exactly what `MEASURE_ROOT` above
 * fixes for this one. Left unchanged here deliberately and filed rather than
 * half-done — same shape as E-108: one helper, copy-pasted, repaired one place at
 * a time.
 */
const decomment = (s: string) =>
  s.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");

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
// ⛔ THE TWO EXEMPTIONS ARE NOT TIDY-UP CANDIDATES:
//   · app-shell.tsx        — this IS the landmark. Deleting it removes the only one.
//   · app/global-error.tsx — renders its own <html>/<body> because the root layout
//                            never ran, so there is NO shell above it. Its <main>
//                            is that page's only landmark and must stay.
// `PageContainer` cannot render one at all — `"main"` is not in its `as` union, so
// tsc is the guard for its call sites and none is needed here.
const MAIN_EXEMPT = new Set([
  "src/components/layout/app-shell.tsx",
  "src/app/global-error.tsx",
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

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`} — ${tsx.length} tsx files`);
process.exit(fail ? 1 : 0);
