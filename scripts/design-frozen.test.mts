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
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 REBUILT 2026-08-21 — THE OLD SHAPE OF THIS GUARD HAD A HOLE THE SIZE OF THE
 *    RULE IT WAS ENFORCING, AND ONE LINE PUT IT THERE.
 *
 *    Every check was LINE-level, and a line was skipped whole if it contained
 *    `var(--`. Almost every real inline style contains a var — that is the point
 *    of the system — so almost every real inline style was **exempt from the
 *    guard by virtue of being partly correct**. Proven, not theorised:
 *
 *      · `admin/live/page.tsx:112` carries `borderColor: "oklch(70% 0.12 195 / 0.5)"`
 *        — hue 195 is AQUA, the superseded kit's colour, which the June-2026
 *        rebuild records as eliminated — beside three `var(--…)` values on the
 *        same line. The guard read the line, saw a var, and moved on.
 *      · a `rounded-[10px]` in a file that has never been on the allowlist was
 *        confirmed to pass for the same reason.
 *
 *    And the whole-line exemption was doing a SECOND job nobody had noticed: the
 *    old `inline border` rule fired on the *property name plus a quote*, so
 *    `border: "1px solid var(--border)"` — perfectly correct, token-consuming
 *    code — only escaped because the line was skipped. Removing the skip without
 *    changing the rule would have flagged dozens of correct files. That is why
 *    this is a rebuild and not a patch.
 *
 *    THREE CHANGES:
 *
 *    1. **Per-PROPERTY, value-judged.** The style object is parsed into its
 *       `key: value` pairs and each pair is judged on its OWN value. A literal
 *       beside a var is now seen; a var-consuming border is now correct by rule
 *       rather than by accident. Four files left the ratchet immediately —
 *       `operation-result-modal.tsx` (listed at 19), `RgRedirectCard.tsx`,
 *       `avatar-menu.tsx` and `kyc-review-controls.tsx` were never violating
 *       anything; the old rule was wrong about them.
 *    2. **The geometry properties are judged too** — `fontSize`, `letterSpacing`
 *       and `padding`, which the old rule set did not name at all. A hand-typed
 *       tracking value is the same defect as a hand-typed shadow: the type scale
 *       and the spacing scale are system decisions (B2/B4).
 *    3. **`.css` files are walked.** They were outside EVERY visual-value guard
 *       in this repo. `chat-styles.css` — imported by `globals.css`, so it ships
 *       on every page — hand-types **hue 195 aqua ten times**, in a file whose
 *       own header says it is a "royal-indigo extension … No orphan colors".
 *
 * What counts as a violation (a value the DESIGN chose):
 *   - a raw hex or a raw oklch()/rgb()/hsl() literal
 *   - a style-object property (shadow / border / radius / colour / geometry)
 *     whose value is a hand-typed literal
 *   - a Tailwind arbitrary value for a frozen primitive whose brackets hold a
 *     literal: `shadow-[0 2px 8px #000]`, `rounded-[10px]`
 *   - in a component stylesheet, a normal declaration that hand-types a colour
 *     or a radius/shadow/size instead of reading a token
 *
 * What does NOT count (a value the DATA, the CALLER or the PLATFORM chose):
 *   - a value containing var(--...) — that IS consuming the system
 *   - a value driven by a runtime binding (a computed bar width, a hue
 *     interpolated from live data). Those are data, and data belongs inline.
 *   - a CSS keyword: `none`, `transparent`, `currentColor`, `inherit`, `auto`, `0`
 *   - `env(...)`, `themeColor`, a colour argument handed to a JS library
 *
 * This is a RATCHET, not a wall. Everything still carrying inline design lives
 * in FROZEN_RATCHET below **with a count**, and both the list and every count
 * may only ever SHRINK. Counts are new: under the old Set, a file already on the
 * list could accumulate unlimited new violations forever.
 *
 * Run: npm run test:design-frozen
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

/**
 * ⛔ EXEMPT BY DESIGN, NOT BY BACKLOG — and therefore with no count.
 * The logo/needle geometry is a byte-identical port of the delivered SVGs. Brand
 * identity is NOT theme tokens and is allowed to diverge — DESIGN_AUTHORITY B1
 * says so in as many words. A count here would imply debt that is not debt.
 */
const BY_DESIGN = new Set<string>([
  "src/components/layout/needle.tsx",          // vendored physics object
  "src/components/layout/needle.css",          // …and its stylesheet, same object
  "src/components/brand-topo.tsx",             // topographic brand pattern
  "src/components/chat/HelpMark.tsx",          // the chat mark
  "src/components/ui/identity-avatar.tsx",     // generative identicon palette
]);

/**
 * Files that still hold inline design values, with the count measured 2026-08-21.
 * THIS LIST MAY ONLY SHRINK, AND SO MAY EVERY NUMBER IN IT. Removing a file is the
 * cleanup; adding one — or raising a number — is re-opening the hole. If you are
 * about to add an entry, you are about to make a second home for a design truth:
 * put the value in globals.css instead.
 *
 * ⚠️ The counts moved when the rules were rebuilt (see the header). They are not
 * comparable to the old comment-counts: the old ones included the `border:
 * "1px solid var(--border)"` false positives and excluded everything that shared
 * a line with a var. Nothing here regressed; the measurement got honest.
 */
const FROZEN_RATCHET = new Map<string, number>([
  // ── Player surfaces still to canonicalize (the real backlog) ──────────────
  ["src/app/global-error.tsx", 24],                          // ships without app CSS
  ["src/components/onboarding/first-visit-primer.tsx", 19],
  ["src/components/markets/conviction-dial.tsx", 15],
  ["src/components/ui/chip.tsx", 13],                       // −1, PV-13c 2026-09-03: the `signal` variant stopped hand-typing its aqua oklch and now reads the brand ramp through `color-mix()` — see the drift note in chip.tsx
  // ⚠️ 15, not the 13 the first pass of the rebuild measured. Two of them sit on lines
  // carrying a `${…}` binding — `fill="oklch(50% 0.14 152)"` beside a computed SVG path —
  // and every previous rule skipped a line the moment it saw a binding anywhere on it.
  ["src/components/brand.tsx", 15],                          // non-TippingBar marks
  ["src/app/wallet/wallet-client.tsx", 4],
  // ⭐ `price-chart.tsx` LEFT THIS LIST on 2026-08-21 and the list may only shrink. It held
  // 11 exemptions, ALL of them inside the dead `PriceChart` component — which was unmounted,
  // still carried the BANNED teal 215 in a gradient, and whose file-wide exemption was
  // meanwhile letting the LIVE `VolumeSparkline` beside it re-type a token unguarded. Deleting
  // the dead half made the file clean and the sparkline guarded in one move.
  ["src/lib/i18n.tsx", 6],
  // `cashback-promo.tsx` LEFT THIS LIST on 2026-08-21 (D5): its 5 inline values WERE the
  // gold costume — the gradient, the gilt border, the jackpot glow and the bloom. The
  // panel picks the `.mat-raised` rung now and holds no design value of its own.
  ["src/components/ui/page-hero.tsx", 5],
  ["src/app/profile/invite/page.tsx", 3],
  ["src/app/profile/page.tsx", 3],
  ["src/app/markets/[id]/page.tsx", 2],
  ["src/app/wallet/loading.tsx", 1],
  ["src/components/ui/nav-progress.tsx", 2],
  ["src/components/ui/toggle.tsx", 2],
  ["src/app/auth/register/page.tsx", 1],
  ["src/app/updown/page.tsx", 1],
  ["src/components/ui/checkbox.tsx", 1],
  ["src/components/ui/empty-state.tsx", 1],
  ["src/components/ui/propose-promo.tsx", 1],
  // `tabs.tsx` LEFT THIS LIST on 2026-08-31 (DG-S-02, DESIGN-GATE-2026-08-28 step 5, 43 files /
  // 160 → 159 values). Its one budgeted literal was the `segmented` variant's inline
  // `oklch(40% 0.08 264 / 0.55)` — the FOURTH home of `--pill-active`, and a different chroma,
  // hue AND alpha rather than a copy, so `ui-consistency`'s `hardcoded-pill-active` could never
  // see it: that rule matches the token's literal TEXT. It is `var(--pill-active)` now, exactly
  // as `nav-more.tsx`'s near-identical `oklch(40% 0.08 264 / 0.4)` became on 2026-08-13.
  ["src/components/ui/toast.tsx", 1],
  // reward-burst.tsx CLEARED 2026-08-08 — its two borderRadius literals were the
  // heraldic corner brackets, which died with the rays (INTAKE §3b, 45 → 44).
  // bet-confirm-modal + sell-confirm-modal + offline-banner CLEARED 2026-08-08
  // (session 37, DS-5/DS-6/DS-16): side-chip tones, exit-value panel and the
  // offline strip now compose from the semantic families (44 → 41).
  // page.tsx + top-app-bar + bottom-nav + nav-more CLEARED 2026-08-13 (batch 3, the
  // round-2 landing/header/rail): the landing's inline oklch gradients and hand-typed sizes moved
  // into the .kp-band / .kp-rail blocks in globals.css, the header dropped its bespoke accent
  // gradient + glow for a 5px gilt dot, the rail dropped its aqua-literal active pill and 78%
  // backdrop-blur capsule for --pill-active on --panel, and nav-more's hand-typed
  // oklch(40% 0.08 264 / 0.4) became --pill-active. language-toggle.tsx is DELETED — one 44x44
  // language menu replaced the 3-pill capsule (41 -> 36).
  // `notifications-panel.tsx` LEFT THIS LIST on 2026-08-21 — its one inline literal was the
  // hand-styled unread pip, which is now the kit <CountBadge>.
  // operation-result-modal.tsx (19) + RgRedirectCard.tsx + avatar-menu.tsx +
  // kyc-review-controls.tsx LEFT on 2026-08-21 with the rebuild: they were never
  // violating anything. Every "violation" was the old rule firing on a *correct*
  // `border: "1px solid var(--border)"`, which is the system being consumed.

  // ── Newly VISIBLE 2026-08-21 (the rebuild's own findings) ─────────────────
  // ⛔ These are not new defects. They are old defects the guard could not see:
  // a literal sharing a line with a var, or a geometry property nothing judged.
  // Every one was measured on this tree; none was invented to pad the list.
  ["src/app/updown/[roundId]/page.tsx", 7],                  // padding + letterSpacing on the round page. −1, PV-13c 2026-09-03: a raw `.chip` span became <Chip>
  ["src/components/admin/admin-shell.tsx", 3],               // 3× hand-typed letterSpacing. −1 recorded 2026-09-03 (PV-13c): the entry was already STALE at HEAD — this file is untouched by that row, the ratchet had simply not been lowered when one value was fixed earlier
  ["src/components/updown/round-countdown.tsx", 3],
  ["src/app/positions/performance/page.tsx", 2],             // raw-oklch radial gradients
  ["src/components/layout/live-ticker.tsx", 2],              // oklch fade beside var(--bg-inset)
  // ⬇️ 2 → 1 on 2026-08-25. The capsule rebuild added a hairline seam and an eye hover
  // tint, and this gate caught them as RAW colours — correctly. Both now read
  // `color-mix(in oklab, var(--gold-300) N%, transparent)`, i.e. they CONSUME the token
  // rather than restating a colour, which is exactly what B10 asks for. Re-measuring
  // afterwards showed the file needs only one, so the budget follows the code down.
  ["src/components/layout/wallet-balance-pill.tsx", 1],
  ["src/components/updown/price-hero.tsx", 2],
  ["src/app/admin/live/page.tsx", 1],
  ["src/app/admin/payments/control-plane.tsx", 1],
  ["src/app/admin/proposals/admin-proposals-client.tsx", 1], // rounded-[10px]
  ["src/app/results/page.tsx", 1],
  ["src/components/admin/admin-charts.tsx", 1],
  ["src/components/markets/bet-confirm-modal.tsx", 1],
  ["src/components/markets/countdown.tsx", 1],
  ["src/components/charts/probability-chart.tsx", 1],
  ["src/components/updown/round-action-panel.tsx", 1],
  ["src/components/updown/round-stake-panel.tsx", 1],
  ["src/components/updown/updown-card.tsx", 1],
  // `payment-logo.tsx` is NOT here, and its absence is a result: its
  // `linear-gradient(135deg, oklch(45% 0.10 ${hue}), …)` is one colour computed from the
  // provider's own hue. Per-colour binding analysis exonerates it; a value-level
  // "contains a literal" test would have put it on this list wrongly.
  // ✅ CLEARED 2026-08-30 (DG-A-21) — "ONE VALUE, FIVE COPIES" IS NOW ONE VALUE, ONE HOME.
  // This block used to list `date-select` · `duration-input` · `input` · `password-input` ·
  // `time-select`, each at 1, under the note: *"the kit's error tint. `oklch(58% 0.2 25 / 0.08)`
  // is typed out identically in five form controls and exists as no token anywhere. It is the
  // cheapest entry on this list to clear: define it once, delete five lines."* That is exactly
  // what happened — the token is `--danger-wash` in `globals.css`, beside `--danger-bg`.
  // ⭐ AND IT WAS A NAME FIX, NOT A REPAINT: the literal's hue is **25**, which is `--danger`'s,
  // not `--no-*`'s 22. Five files had been hand-typing the danger colour without the danger
  // token. §B2a is satisfied and not one pixel moves.
  // ⛔ The five entries are DELETED rather than set to 0: this list's own contract is that an
  // entry which no longer matches is STALE, and the suite says so by name ("now clean — delete
  // the entry"). A zero would be a permanent placeholder for a defect that no longer exists.

  // ── Admin surfaces (deferred: player-facing work ships first) ─────────────
  ["src/app/admin/affiliate/affiliate-admin-client.tsx", 2],
  ["src/app/admin/bonuses/bonus-admin-client.tsx", 2],
  // ⭐ `admin-sidebar-nav.tsx` LEFT THIS LIST on 2026-08-29 (DG-A-18), 2 → 0. Its two entries were
  // the active-row fill and the badge pip. The fill was `oklch(40% 0.12 268 / 0.5)` typed inline —
  // and it had already DIVERGED from `--pill-active` (`oklch(40% 0.12 262 / 0.35)`), the token
  // whose own comment claims "one active filter/tab fill everywhere": a different hue AND a
  // different alpha for one job, which is B9's argument in a single line. The pip's `padding` +
  // `borderRadius: 4` went to the kit `<CountBadge tone="brand" size="sm">`, whose header had
  // named this exact call site as one of four it was written to consolidate and never reached.
  ["src/app/admin/kyc/[id]/kyc-doc-viewer.tsx", 1],
]);

/**
 * ⛔ THE SYSTEM'S OWN STYLESHEETS. These are the DEFINITION SITE — the files
 * DESIGN_AUTHORITY names as outranking every document — so a literal in them is
 * the design decision, made in the right place. Judging them would be asking the
 * dictionary to look words up in itself.
 */
const CSS_SYSTEM = new Set<string>([
  "src/app/globals.css",
  "src/app/motion.css",
  "src/app/state-tokens.css",
]);

/**
 * Component stylesheets that still hold raw design values, measured 2026-08-21.
 * Same law as FROZEN_RATCHET: the list and every count may only shrink.
 *
 * ⭐ `chat-styles.css` is the find that justified walking `.css` at all. It is
 * `@import`ed by globals.css, so it ships on every page, and it hand-types
 * `oklch(72% 0.11 195)` — **hue 195, aqua** — in ten places: the composer edge,
 * the streaming shimmer, the typing dots and their keyframes, and the source-pip.
 * Its own header calls the file a "royal-indigo extension … No orphan colors",
 * and the June-2026 kit rebuild records aqua as eliminated platform-wide. Both
 * statements were true of every file a guard was looking at.
 */
const CSS_RATCHET = new Map<string, number>([
  ["src/styles/chat/chat-styles.css", 78],
]);

/**
 * Strip comments so a documented example never trips the guard.
 *
 * ⛔ OFFSETS ARE PRESERVED — the comment is blanked, not deleted. The old version
 * removed block comments outright, which swallowed their newlines, so every line
 * number this guard printed after the first `/* … *\/` was WRONG. A guard that
 * names the wrong line is a guard the reader stops believing.
 */
const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\r\n]/g, " "))
   .replace(/(^|[^:])\/\/[^\r\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));

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

// ── The vocabulary ───────────────────────────────────────────────────────────
const COLOUR = /(#[0-9a-fA-F]{3,8}\b|\boklch\(|\brgba?\(|\bhsla?\()/;
/** A value that reads a token IS the system being consumed, wherever it sits. */
const CONSUMES_SYSTEM = /var\(--/;
/**
 * Values that CANNOT read a CSS variable, by the platform's rules rather than by
 * our choice. These are not design decisions made in the wrong place — there is
 * no right place for them:
 *   - `themeColor` is a PWA manifest / <meta> value read by the OS chrome
 *     before any stylesheet exists.
 *   - a colour passed into a JS library's option object (the QR encoder) is an
 *     argument, not a style.
 *   - `env(safe-area-inset-*)` is the DEVICE's number, not ours. `offline-banner`
 *     computes its top padding from the notch; no token can express that.
 */
const CANNOT_TOKENIZE = /\bthemeColor\b|QRCode\.|toDataURL\(|\benv\(/;
/** A keyword is not a design value — it is the absence of one. */
const KEYWORD = /^["'`]\s*(none|transparent|inherit|initial|unset|revert|currentColor|auto|normal|0)\s*["'`]$/i;
/**
 * The properties whose value is a SYSTEM decision. The last five are new in the
 * 2026-08-21 rebuild: the type scale (B2) and the spacing scale (B4) are frozen
 * exactly as the elevation ladder is, and nothing was judging them.
 */
const JUDGED_PROPERTY =
  /^(boxShadow|border|borderColor|borderTop|borderRight|borderBottom|borderLeft|borderRadius|background|backgroundColor|backgroundImage|color|fill|stroke|outline|textShadow|fontSize|letterSpacing|padding|paddingTop|paddingRight|paddingBottom|paddingLeft)$/;

/** Remove `var(--x)` spans (nesting one level, for `var(--a, var(--b))`). */
const stripVar = (s: string) => s.replace(/var\(--[^()]*(?:\([^()]*\)[^()]*)*\)/g, " ");

/**
 * Is there a colour in here that a PERSON typed, as opposed to one the data computed?
 *
 * ⛔ "CONTAINS `${`" IS TOO BLUNT IN BOTH DIRECTIONS, and the first draft of the rebuild
 * got it wrong both ways in one expression. `linear-gradient(${dir}, #fff, #000)` is a
 * hand-typed pair of colours with a runtime *direction* — a violation. `oklch(${l}% 0.1 268)`
 * is one colour computed from live data — not a violation, and the header of this file has
 * always said so. A line-level or value-level "has a binding → skip" rule passes the first;
 * a "strip the bindings then look for a colour" rule fails the second, because `oklch(` is
 * still sitting there after the strip.
 *
 * ⭐ The question is per-COLOUR, not per-value: each binding becomes a sentinel, and a colour
 * counts as hand-typed only when NO sentinel falls inside it. A hex cannot contain a binding
 * at all, so it always counts.
 */
const BINDING = "\u0000";
function hasHandTypedColour(text: string): boolean {
  const s = text.replace(/\$\{[^}]*\}/g, BINDING);
  if (/#[0-9a-fA-F]{3,8}\b/.test(s)) return true;
  for (const m of s.matchAll(/\b(?:oklch|rgba?|hsla?)\(([^()]*)\)/g)) {
    if (!m[1].includes(BINDING)) return true;
  }
  return false;
}

// ── Parsing a style object into properties ───────────────────────────────────
/**
 * Every `style={{ … }}` body, plus every object annotated `CSSProperties`.
 * ⛔ The second one is not optional: `chip.tsx` declares its tone map as
 * `const SLATE: React.CSSProperties = { background: "oklch(…)" }` and spreads it
 * at the call site, so a `style={{` scan alone would miss fourteen literals.
 */
function styleObjects(src: string): Array<{ body: string; at: number }> {
  const out: Array<{ body: string; at: number }> = [];
  const scan = (re: RegExp, openDepth: number) => {
    for (const m of src.matchAll(re)) {
      let depth = openDepth, i = m.index + m[0].length;
      const start = i;
      while (i < src.length && depth > 0) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") depth--;
        i++;
      }
      out.push({ body: src.slice(start, i - openDepth), at: start });
    }
  };
  scan(/style=\{\{/g, 2);
  scan(/(?:React\.)?CSSProperties\s*=\s*\{/g, 1);
  return out;
}

/** Split an object body into its TOP-LEVEL `key: value` pairs. */
function objectPairs(body: string): Array<{ key: string; val: string; off: number }> {
  const out: Array<{ key: string; val: string; off: number }> = [];
  let depth = 0, start = 0;
  const flush = (end: number) => {
    const seg = body.slice(start, end);
    const c = seg.indexOf(":");
    if (c > 0) out.push({ key: seg.slice(0, c).trim().replace(/["']/g, ""), val: seg.slice(c + 1).trim(), off: start });
  };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if ("{[(".includes(ch)) depth++;
    else if ("}])".includes(ch)) depth--;
    else if (ch === "," && depth === 0) { flush(i); start = i + 1; }
  }
  flush(body.length);
  return out;
}

/** Is ONE property's value a design decision typed by hand? */
function propertyOffends(key: string, val: string): boolean {
  if (!JUDGED_PROPERTY.test(key)) return false;
  if (CONSUMES_SYSTEM.test(val) || CANNOT_TOKENIZE.test(val) || KEYWORD.test(val)) return false;
  if (!/^["'`]/.test(val)) return false;              // an expression, not a literal
  // A template with a runtime binding is DATA — unless a colour inside it was still
  // typed by hand, in which case that half is a design decision wearing a binding.
  if (/\$\{/.test(val)) return hasHandTypedColour(val);
  return true;
}

// ── The .tsx scan ────────────────────────────────────────────────────────────
type Hit = { line: number; what: string };
function scanTsx(src: string): Hit[] {
  const found = new Map<number, string>();          // one hit per line — the property
  const at = (i: number) => src.slice(0, i).split("\n").length;    // and the line rule
  const put = (line: number, what: string) => { if (!found.has(line)) found.set(line, what); };

  for (const o of styleObjects(src)) {
    for (const p of objectPairs(o.body)) {
      if (propertyOffends(p.key, p.val)) put(at(o.at + p.off), `${p.key}: ${p.val.slice(0, 60)}`);
    }
  }
  src.split("\n").forEach((raw, i) => {
    if (CANNOT_TOKENIZE.test(raw)) return;
    // ⛔ THE VAR SPANS ARE STRIPPED, THE LINE IS NOT SKIPPED. This is the hole the
    // rebuild closed: `borderColor: "oklch(70% 0.12 195 / 0.5)"` sat on a line with
    // three vars and was invisible for the life of the old guard.
    if (hasHandTypedColour(stripVar(raw))) { put(i + 1, `raw colour · ${raw.trim().slice(0, 60)}`); return; }
    // An arbitrary utility is judged on its BRACKETS: `shadow-[var(--shadow-3)]`
    // consumes the ladder; `rounded-[10px]` re-decides the radius scale.
    for (const m of raw.matchAll(/\b(shadow|rounded)-\[([^\]]*)\]/g)) {
      if (!CONSUMES_SYSTEM.test(m[2])) put(i + 1, `arbitrary utility · ${m[0]}`);
    }
  });
  return [...found.entries()].map(([line, what]) => ({ line, what })).sort((a, b) => a.line - b.line);
}

// ── The .css scan ────────────────────────────────────────────────────────────
/** Geometry properties whose value is a system decision (B2/B4/B10). */
const CSS_GEOMETRY = /^(border-radius|box-shadow|font-size|letter-spacing)$/;
function scanCss(src: string): Hit[] {
  const out: Hit[] = [];
  src.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(/(^|[;{])\s*(-{0,2}[a-zA-Z][-a-zA-Z0-9]*)\s*:\s*([^;{}]*)/g)) {
      const prop = m[2], val = m[3];
      // ⛔ A CUSTOM PROPERTY IS A DEFINITION, NOT A CONSUMPTION. `--chat-canvas:
      // oklch(15% 0.130 268)` is the token being declared, which is the correct
      // place for a literal; `background: oklch(…)` beside it is not.
      if (prop.startsWith("--")) continue;
      if (CONSUMES_SYSTEM.test(val) || CANNOT_TOKENIZE.test(val)) continue;
      if (!COLOUR.test(val) && !CSS_GEOMETRY.test(prop)) continue;
      if (/^\s*(none|inherit|initial|unset|revert|transparent|currentColor|auto|normal|0)\s*$/i.test(val)) continue;
      out.push({ line: i + 1, what: `${prop}: ${val.trim().slice(0, 60)}` });
    }
  });
  return out;
}

// ── Run it ───────────────────────────────────────────────────────────────────
type Report = { over: string[]; stale: string[]; shrunk: string[]; total: number; seen: number };
function judge(files: string[], ratchet: Map<string, number>, scan: (s: string) => Hit[]): Report {
  const over: string[] = [], stale: string[] = [], shrunk: string[] = [];
  const counts = new Map<string, number>();
  let total = 0;
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (BY_DESIGN.has(rel)) continue;
    // Satori OG images render in a separate engine with no CSS variables at all —
    // it literally cannot read our tokens, so inline values there are correct.
    if (rel.startsWith("src/app/api/")) continue;
    const hits = scan(decomment(readFileSync(file, "utf8")));
    if (hits.length === 0) continue;
    counts.set(rel, hits.length);
    total += hits.length;
    const allowed = ratchet.get(rel) ?? 0;
    if (hits.length > allowed) {
      over.push(`${rel} — ${hits.length} > ${allowed}`);
      for (const h of hits.slice(0, 6)) over.push(`      :${h.line}  ${h.what}`);
    }
  }
  for (const [rel, n] of ratchet) {
    const now = counts.get(rel) ?? 0;
    if (now === 0) stale.push(`${rel} (now clean — delete the entry)`);
    else if (now < n) shrunk.push(`${rel} ${n} → ${now}`);
  }
  return { over, stale, shrunk, total, seen: counts.size };
}

const tsx = judge(walk(SRC, /\.tsx$/), FROZEN_RATCHET, scanTsx);
check("no NEW inline design value beyond the ratchet", tsx.over.length === 0,
  tsx.over.length ? `${tsx.over.filter((l) => !l.startsWith("   ")).length} file(s) over budget` : "");
for (const l of tsx.over.slice(0, 40)) log(`    ${l}`);

const cssFiles = walk(SRC, /\.css$/).filter((f) => !CSS_SYSTEM.has(relative(ROOT, f).replace(/\\/g, "/")));
const css = judge(cssFiles, CSS_RATCHET, scanCss);
check("no NEW raw design value in a component stylesheet", css.over.length === 0,
  css.over.length ? `${css.over.filter((l) => !l.startsWith("   ")).length} stylesheet(s) over budget` : "");
for (const l of css.over.slice(0, 40)) log(`    ${l}`);

// ⛔ AND THE SCANNERS MUST HAVE REACHED SOMETHING. A walk that silently covered
// nothing prints the same green as a clean tree — the failure mode every other
// guard in this repo has been bitten by at least once.
check("the .tsx scanner reached the files it is ratcheting",
  tsx.seen >= FROZEN_RATCHET.size - 2, `only ${tsx.seen} file(s) produced any hit at all`);
check("the .css scanner reached a component stylesheet at all",
  css.seen >= 1 && cssFiles.length >= 2, `${cssFiles.length} non-system stylesheet(s), ${css.seen} with hits`);

// ── The ratchets may only shrink ─────────────────────────────────────────────
// An entry that no longer violates anything has been cleaned up: drop it, so the
// ratchet actually tightens instead of silently carrying dead exemptions that
// would let a NEW violation slip back into an already-clean file.
check("the ratchets hold no stale exemptions", tsx.stale.length + css.stale.length === 0,
  [...tsx.stale, ...css.stale].join(", "));
for (const s of [...tsx.shrunk, ...css.shrunk]) log(`  NOTE ${s} — lower the number in this file.`);

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
  /* ⭐ ADDED 2026-09-01 (ADMIN-TABS-2026-09-01) — `PendingChangesBar`, and it is the OPPOSITE
     of the shape this rule exists to catch. The reason above is *"a hand-rolled createPortal
     DIALOG is a popup that skipped the focus trap, the focus return and the scroll lock"*.
     This is not a dialog: it is a persistent, non-modal `role="status"` bar that must NEVER
     trap focus, never return it, and never lock scrolling — an officer has to keep typing in
     the form underneath it while it is on screen. Adopting `<Modal>` would give it all four
     behaviours it must not have.
     ⛔ AND IT PORTALS BECAUSE ANOTHER GATE REQUIRES IT: `test:stacking` §5 — `.route-enter`
     retains a transform for ever, and a transformed ancestor is the containing block for every
     fixed descendant, so a bar rendered from a route file would anchor to the page wrapper and
     scroll away instead of holding the window's bottom edge. Not portalling is the defect here;
     portalling is the fix. */
  "src/components/ui/unsaved-changes.tsx",         // pending-changes bar — non-modal status, must not trap focus
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

// ── POSITIVE CONTROLS — show every scanner input it MUST reject ──────────────
/**
 * ⛔ THIS GUARD SHIPPED FOR THREE WEEKS WITH NO POSITIVE CONTROL AT ALL, and that
 * is how it stayed green over a `rounded-[10px]` and an aqua literal. A scanner
 * that has gone blind reports "0 violations" in exactly the same words as a clean
 * tree. Both directions are proved, because a rule that also fails correct code is
 * worse than no rule: it teaches the next session to weaken it.
 */
log("");
check("PC1 a literal BESIDE a var on the same line is seen",
  scanTsx('<div style={{ color: "var(--text)", borderColor: "oklch(70% 0.12 195 / 0.5)" }} />').length === 1,
  "this exact shape (admin/live/page.tsx:112) passed for the life of the old guard");
check("PC2 a token-consuming border is NOT a violation",
  scanTsx('<div style={{ border: "1px solid var(--border)" }} />').length === 0,
  "the old line rule flagged this correct code, and only the line-skip hid it");
check("PC3 a hand-typed radius is seen",
  scanTsx('<div style={{ borderRadius: "10px" }} />').length === 1);
check("PC4 a hand-typed tracking is seen — the type scale is frozen too",
  scanTsx('<span style={{ letterSpacing: "0.08em" }} />').length === 1);
check("PC5 `rounded-[10px]` is seen …",
  scanTsx('<div className="rounded-[10px] border" />').length === 1);
check("PC6 … and `shadow-[var(--shadow-3)]` is NOT — the brackets read a token",
  scanTsx('<div className="hover:shadow-[var(--shadow-3)]" />').length === 0);
check("PC7 a runtime-driven value is data, not design",
  scanTsx("<div style={{ width: `${pct}%`, background: `oklch(${l}% 0.1 268)` }} />").length === 0);
check("PC8 … but a literal colour beside a runtime binding still is",
  scanTsx("<div style={{ background: `linear-gradient(${dir}, #fff, #000)` }} />").length === 1);
check("PC9 a CSS keyword is the absence of a design value",
  scanTsx('<div style={{ border: "none", background: "transparent" }} />').length === 0);
check("PC10 a `CSSProperties` constant is scanned like a style prop",
  scanTsx('const SLATE: React.CSSProperties = { background: "oklch(34% 0.09 268 / 0.5)" };').length === 1,
  "chip.tsx holds fourteen literals in exactly this shape, outside any style={{ }}");
check("PC11 css: a normal declaration hand-typing a colour is seen",
  scanCss(".cm-dot { background: oklch(72% 0.11 195); }").length === 1,
  "chat-styles.css does this ten times, in aqua, on every page");
check("PC12 css: a custom-property DEFINITION is not",
  scanCss(":root { --chat-canvas: oklch(15% 0.130 268); }").length === 0,
  "the token being declared is the one place the literal belongs");
check("PC13 css: a declaration reading a token is not",
  scanCss(".cm-dot { background: var(--pearl); }").length === 0);
check("PC14 css: a hand-typed radius is seen",
  scanCss(".cm-bubble { border-radius: 14px; }").length === 1);

log(`\n  (ratchet holds ${FROZEN_RATCHET.size} tsx file(s) / ${tsx.total} value(s), ${CSS_RATCHET.size} stylesheet(s) / ${css.total} value(s) — every number may only shrink)`);
log(`\n${fail === 0 ? "PASS" : "FAIL"} — design primitives are frozen`);
process.exit(fail ? 1 : 0);
