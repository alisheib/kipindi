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
 * This is a RATCHET, not a wall. The ~46 pages still carrying a hand-typed width
 * are listed below; the list may only ever SHRINK. That way enforcement lands
 * before the migration finishes instead of waiting for it, and no NEW raw width
 * can appear in the meantime.
 *
 * Run: npm run test:measure
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
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
 */
const RAW_WIDTH_ALLOWLIST = new Set<string>([
  // Player pages — already correctly capped, pending the mechanical rename.
  "src/app/page.tsx", "src/app/loading.tsx",
  "src/app/markets/page.tsx", "src/app/markets/loading.tsx",
  "src/app/markets/[id]/page.tsx", "src/app/markets/[id]/loading.tsx", "src/app/markets/[id]/not-found.tsx",
  "src/app/live/page.tsx", "src/app/live/loading.tsx",
  "src/app/results/page.tsx", "src/app/results/loading.tsx",
  "src/app/watchlist/page.tsx",
  "src/app/updown/page.tsx", "src/app/updown/loading.tsx",
  "src/app/updown/history/page.tsx", "src/app/updown/history/loading.tsx",
  "src/app/updown/[roundId]/page.tsx", "src/app/updown/[roundId]/loading.tsx",
  "src/app/leaderboard/page.tsx", "src/app/leaderboard/loading.tsx",
  "src/app/help/page.tsx", "src/app/fairness/page.tsx",
  "src/app/wallet/wallet-client.tsx", "src/app/wallet/loading.tsx",
  "src/app/wallet/withdraw/page.tsx", "src/app/wallet/withdraw/loading.tsx",
  "src/app/wallet/deposit/page.tsx", "src/app/wallet/deposit/loading.tsx",
  "src/app/wallet/deposit/return/page.tsx", "src/app/wallet/receipt/[id]/page.tsx",
  "src/app/positions/page.tsx", "src/app/positions/loading.tsx",
  "src/app/positions/performance/page.tsx", "src/app/positions/performance/loading.tsx",
  "src/app/profile/page.tsx", "src/app/profile/loading.tsx",
  "src/app/profile/activity/page.tsx", "src/app/profile/account/page.tsx",
  "src/app/profile/responsible-gambling/page.tsx", "src/app/profile/source-of-funds/page.tsx",
  "src/app/profile/notifications/page.tsx", "src/app/profile/security/page.tsx",
  "src/app/profile/sessions/page.tsx", "src/app/profile/kyc/page.tsx",
  "src/app/profile/invite/page.tsx",
  "src/app/proposals/page.tsx", "src/app/proposals/new/page.tsx",
  "src/app/proposals/[id]/page.tsx", "src/app/proposals/[id]/not-found.tsx",
  "src/app/legal/layout.tsx", "src/app/not-found.tsx", "src/app/offline/page.tsx",
  "src/app/auth/admin/page.tsx", "src/app/admin/totp-verify/page.tsx",
  "src/app/admin/totp-verify/loading.tsx",
  "src/components/auth/auth-shell.tsx",
  "src/components/ui/route-error.tsx", "src/components/ui/page-loader.tsx",
]);

/** Atoms that MUST carry `.field-measure`, and the three that must NOT. */
const MEASURED_ATOMS = [
  "input.tsx", "select.tsx", "textarea.tsx", "date-select.tsx",
  "duration-input.tsx", "password-input.tsx",
];
const EXEMPT_ATOMS = ["otp-input.tsx", "datetime-range-filter.tsx", "time-select.tsx"];

const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

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

log("Measure-system guard (DESIGN_AUTHORITY B7)\n");

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
const tierOf = (file: string): string | null => {
  if (!existsSync(file)) return null;
  const s = decomment(readFileSync(file, "utf8"));
  const m = s.match(/tier=["'](\w+)["']/) ?? s.match(/max-w-(console|board|reading|form|receipt|auth)\b/);
  return m ? m[1] : null;
};
const mismatched: string[] = [];
for (const f of tsx) {
  if (basename(f) !== "page.tsx") continue;
  const load = join(dirname(f), "loading.tsx");
  if (!existsSync(load)) continue;
  const a = tierOf(f), b = tierOf(load);
  if (a && b && a !== b) {
    mismatched.push(`${relative(ROOT, dirname(f)).replace(/\\/g, "/")} (page=${a} loading=${b})`);
  }
}
check("every page and its loading.tsx state the same tier",
  mismatched.length === 0, mismatched.join(", "));

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

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`} — ${tsx.length} tsx files`);
process.exit(fail ? 1 : 0);
