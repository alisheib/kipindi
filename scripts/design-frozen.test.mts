/**
 * Design-frozen guard.                              DESIGN_AUTHORITY B9 / B10
 *
 * The law: every visual primitive — edges, the elevation ladder, radii, popups —
 * is decided ONCE in the system, and components only consume it. You change a
 * look by editing its token, and every consumer updates at once. You do not
 * reach into a component for a border, a shadow, or a radius again.
 *
 * That promise is only worth anything if something enforces it. This is that
 * something. Without it "the system is frozen" is a sentence in a doc, and the
 * next inline `boxShadow` re-opens the exact hole the 2026-07-29 pass closed —
 * seven hand-typed drop-shadows for one visual job, spread over seven files.
 *
 * Why the existing gates could not catch this class of defect:
 *   - `test:tokens`   guards token DEFINITIONS (one site per token). It says
 *                     nothing about a component that ignores the token and
 *                     types the value by hand — which is exactly what
 *                     brand.tsx did to --bar-track for the life of the project.
 *   - `test:bridge`   guards that a class RESOLVES. An inline style has no
 *                     class, so it is invisible to it.
 *   - `tsc` / `build` see a perfectly valid string. Neither can know that
 *                     "0 30px 80px oklch(...)" was a design decision made in
 *                     the wrong place.
 *
 * This is a RATCHET, not a wall. Everything still carrying inline design lives
 * in FROZEN_ALLOWLIST below, and that list may only ever SHRINK. Enforcement
 * lands now — no NEW inline design value can appear — while the remaining
 * cleanup (overwhelmingly admin surfaces) proceeds at its own pace.
 *
 * What counts as a violation (a value the DESIGN chose):
 *   - a raw hex or a raw oklch()/rgb()/hsl() literal
 *   - an inline boxShadow / border / borderRadius / background gradient
 *   - a Tailwind arbitrary value for one of those: shadow-[...] / rounded-[...]
 *
 * What does NOT count (a value the DATA or the CALLER chose):
 *   - anything containing var(--...) — that IS consuming the system
 *   - a template literal driven by a runtime binding (a computed bar width, a
 *     hue interpolated from live data). Those are data, and data belongs inline.
 *
 * Run: npm run test:design-frozen
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

/**
 * Files that still hold inline design values, as measured on 2026-07-29.
 * THIS LIST MAY ONLY SHRINK. Removing a file from it is the cleanup; adding one
 * is re-opening the hole. If you are about to add an entry, you are about to
 * make a second home for a design truth — put the value in globals.css instead.
 */
const FROZEN_ALLOWLIST = new Set<string>([
  // ── Brand marks: deliberately literal (DESIGN_AUTHORITY B1) ────────────────
  // The logo/needle geometry is a byte-identical port of the delivered SVGs.
  // Brand identity is NOT theme tokens and is allowed to diverge — B1 says so
  // in as many words. These are exempt by DESIGN, not by backlog.
  "src/components/layout/needle.tsx",          // 34 — vendored physics object
  "src/components/brand-topo.tsx",             // 4  — topographic brand pattern
  "src/components/chat/HelpMark.tsx",          // 5  — the chat mark
  "src/components/ui/identity-avatar.tsx",     // 18 — generative identicon palette

  // ── Player surfaces still to canonicalize (the real backlog) ──────────────
  "src/components/onboarding/first-visit-primer.tsx", // 21
  "src/components/markets/operation-result-modal.tsx", // 19 — the TONE map
  "src/app/global-error.tsx",                  // 18 — ships without app CSS
  "src/app/page.tsx",                          // 17
  "src/components/markets/conviction-dial.tsx", // 11
  "src/components/markets/price-chart.tsx",    // 11
  "src/components/brand.tsx",                  // 9  — non-TippingBar marks
  "src/components/layout/bottom-nav.tsx",      // 7
  "src/components/layout/top-app-bar.tsx",     // 6
  "src/lib/i18n.tsx",                          // 6
  "src/app/wallet/wallet-client.tsx",          // 5
  "src/components/ui/chip.tsx",                // 5
  "src/components/ui/page-hero.tsx",           // 5
  "src/app/profile/page.tsx",                  // 2
  "src/components/brand/reward-burst.tsx",     // 2
  "src/components/markets/bet-confirm-modal.tsx",  // 2
  "src/components/markets/sell-confirm-modal.tsx", // 2
  "src/components/ui/cashback-promo.tsx",      // 2
  "src/components/ui/checkbox.tsx",            // 2
  "src/components/ui/offline-banner.tsx",      // 2
  "src/components/ui/toggle.tsx",              // 2
  "src/app/auth/register/page.tsx",            // 1
  "src/app/markets/[id]/page.tsx",             // 1
  "src/app/profile/invite/page.tsx",           // 1
  "src/app/updown/page.tsx",                   // 1
  "src/app/wallet/loading.tsx",                // 1
  "src/components/chat/messages/RgRedirectCard.tsx", // 1
  "src/components/layout/avatar-menu.tsx",     // 1
  "src/components/layout/nav-more.tsx",        // 1
  "src/components/layout/notifications-panel.tsx", // 1
  "src/components/ui/empty-state.tsx",         // 1
  "src/components/ui/language-toggle.tsx",     // 1
  "src/components/ui/nav-progress.tsx",        // 1
  "src/components/ui/propose-promo.tsx",       // 1
  "src/components/ui/tabs.tsx",                // 1
  "src/components/ui/toast.tsx",               // 1

  // ── Admin surfaces (deferred: player-facing work ships first) ─────────────
  "src/components/admin/kyc-review-controls.tsx",     // 5
  "src/app/admin/affiliate/affiliate-admin-client.tsx", // 2
  "src/app/admin/bonuses/bonus-admin-client.tsx",     // 2
  "src/components/admin/admin-sidebar-nav.tsx",       // 2
  "src/app/admin/kyc/[id]/kyc-doc-viewer.tsx",        // 1
]);

/** Strip comments so a documented example never trips the guard. */
const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function walk(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (ext.test(e)) out.push(p);
  }
  return out;
}

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Design-frozen guard (DESIGN_AUTHORITY B9/B10)\n");

// A line is exempt when it consumes the system or is driven by runtime data.
const CONSUMES_SYSTEM = /var\(--/;
const RUNTIME_DRIVEN = /\$\{/;
/**
 * Values that CANNOT read a CSS variable, by the platform's rules rather than by
 * our choice. These are not design decisions made in the wrong place — there is
 * no right place for them:
 *   - `themeColor` is a PWA manifest / <meta> value read by the OS chrome
 *     before any stylesheet exists.
 *   - a colour passed into a JS library's option object (the QR encoder) is an
 *     argument, not a style.
 */
const CANNOT_TOKENIZE = /\bthemeColor\b|QRCode\.|toDataURL\(/;

const RULES: Array<{ name: string; re: RegExp }> = [
  // A colour typed by hand, in any notation.
  { name: "raw colour literal", re: /(#[0-9a-fA-F]{3,8}\b|\boklch\(|\brgba?\(|\bhsla?\()/ },
  // A design property set inline.
  { name: "inline boxShadow", re: /\bboxShadow\s*:/ },
  { name: "inline border", re: /\bborder(Color|Top|Right|Bottom|Left)?\s*:\s*["'`]/ },
  { name: "inline borderRadius", re: /\bborderRadius\s*:/ },
  // A Tailwind arbitrary value for a frozen primitive.
  { name: "arbitrary shadow/radius utility", re: /\b(shadow|rounded)-\[/ },
];

type Hit = { file: string; line: number; rule: string; text: string };
const hits: Hit[] = [];

for (const file of walk(SRC, /\.tsx$/)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (FROZEN_ALLOWLIST.has(rel)) continue;
  // Satori OG images render in a separate engine with no CSS variables at all —
  // it literally cannot read our tokens, so inline values there are correct.
  if (rel.startsWith("src/app/api/")) continue;

  const lines = decomment(readFileSync(file, "utf8")).split("\n");
  lines.forEach((raw, i) => {
    if (CONSUMES_SYSTEM.test(raw) || RUNTIME_DRIVEN.test(raw) || CANNOT_TOKENIZE.test(raw)) return;
    for (const r of RULES) {
      if (r.re.test(raw)) {
        hits.push({ file: rel, line: i + 1, rule: r.name, text: raw.trim().slice(0, 88) });
        break;
      }
    }
  });
}

check(
  "no NEW inline design value outside the ratchet list",
  hits.length === 0,
  hits.length ? `${hits.length} violation(s)` : "",
);
for (const h of hits.slice(0, 25)) log(`    ${h.file}:${h.line}  [${h.rule}]  ${h.text}`);
if (hits.length > 25) log(`    … and ${hits.length - 25} more`);

// ── The allowlist may only shrink ────────────────────────────────────────────
// An entry that no longer violates anything has been cleaned up: drop it, so the
// ratchet actually tightens instead of silently carrying dead exemptions that
// would let a NEW violation slip back into an already-clean file.
const stale: string[] = [];
for (const rel of FROZEN_ALLOWLIST) {
  const abs = join(ROOT, rel);
  let src: string;
  try { src = decomment(readFileSync(abs, "utf8")); } catch { stale.push(`${rel} (file is gone)`); continue; }
  const dirty = src.split("\n").some((raw) =>
    !CONSUMES_SYSTEM.test(raw) && !RUNTIME_DRIVEN.test(raw) && !CANNOT_TOKENIZE.test(raw) && RULES.some((r) => r.re.test(raw)));
  if (!dirty) stale.push(`${rel} (now clean — remove it)`);
}
check("the ratchet holds no stale exemptions", stale.length === 0, stale.join(", "));

// ── Popups go through the shared primitive ───────────────────────────────────
// A hand-rolled createPortal dialog is a popup that skipped the focus trap, the
// focus return and the Android scroll/zoom lock — the reason Modal exists.
// Slide-overs, dropdowns and the calendar are a DIFFERENT documented pattern
// (see modal.tsx's header) and are named here so the exemption is deliberate
// rather than accidental.
const PORTAL_EXEMPT = new Set([
  "src/components/ui/modal.tsx",            // the primitive itself
  "src/components/ui/select.tsx",           // dropdown listbox
  "src/components/ui/date-select.tsx",      // calendar popover
  "src/components/layout/avatar-menu.tsx",  // slide-over
  "src/components/layout/notifications-panel.tsx", // slide-over
  "src/components/layout/needle-drawer.tsx",       // bottom sheet
  "src/components/admin/admin-mobile-nav.tsx",     // slide-over
  "src/components/admin/action-overlay.tsx",       // full-screen progress overlay
  "src/components/markets/share-button.tsx",       // anchored share menu
]);
const roguePortals: string[] = [];
for (const file of walk(SRC, /\.tsx$/)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (PORTAL_EXEMPT.has(rel)) continue;
  if (/createPortal/.test(decomment(readFileSync(file, "utf8")))) roguePortals.push(rel);
}
check("no hand-rolled createPortal outside the shared primitives", roguePortals.length === 0, roguePortals.join(", "));

// ── The CSS comment trap — MOVED, not dropped (2026-08-07) ───────────────────
// This gate used to carry its own version: a line matching `--token-*` glued to a
// `/`, which puts a `*` immediately before a `/` and CLOSES THE COMMENT. The trap is
// real and has cost this repo three times now — but that rule only ever matched a
// TOKEN FAMILY, and the third instance was a filesystem glob written in prose
// (`src` + a star-star-slash-star pattern) inside globals.css §6. It closed the
// comment eleven lines early, eleven lines of English became the head of the third
// reduced-motion gate's selector list, and a real CSS parser confirmed the browser
// would DROP all 27 entries. This gate was green over it.
//
// ⛔ The check now lives in `npm run test:reduce-motion` rule 0.1, ONCE, and it
// anchors on the unambiguous wreckage instead of on one spelling: a comment closer
// found outside a comment, or an opener found inside one. Both are impossible in a
// correct stylesheet, and neither depends on guessing what the author was typing.
// Two copies of one rule is the defect design-system/README §0 exists to forbid,
// so the narrow one is gone rather than kept in sync.

log(`\n  (ratchet holds ${FROZEN_ALLOWLIST.size} file(s) — the list may only shrink)`);
log(`\n${fail === 0 ? "PASS" : "FAIL"} — design primitives are frozen`);
process.exit(fail ? 1 : 0);
