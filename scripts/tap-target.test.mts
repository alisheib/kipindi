/**
 * ⭐ THE TAP FLOOR, AS A GATE THAT FAILS — not a warning nobody reads.
 *
 *   npx tsx scripts/tap-target.test.mts     (npm run test:tap-target)
 *
 * 🔴 WHY THIS EXISTS. The platform had exactly one tap-size instrument:
 * `scripts/responsive-audit.mjs`. It is a good instrument and it CANNOT FAIL A BUILD —
 * its tap check calls `soft()`, which increments `warn`, and the process exit code
 * reads `fail` alone. Its own comment says so in as many words: *"Soft-only — never a
 * hard fail … so raising the bar records the debt without ever blocking a deploy."*
 * It also needs a live server on `:3000`, so on a normal `npm run test:all` it does
 * not run at all. The result is a floor that is documented in four places, cited by
 * DESIGN_AUTHORITY §A2 and Law 9, and enforced by nothing.
 *
 * ⭐ THE TWO EXCEPTIONS ARE STATED HERE, AS LAW, WITH THEIR REASONS — never as
 * baseline rows. An exception with a reason is a rule; an exception in a baseline is
 * debt wearing a rule's clothes.
 *
 *   1. `--h-control-xs` (32px) is the DENSE, MOUSE-ONLY ADMIN rung. `globals.css`
 *      says so beside the token, and adds the claim that "all 8 of its call sites are
 *      under src/app/admin/ — not one is a finger, primary or money control". That was
 *      PROSE with nothing behind it. §2 turns it into a check: `btn-xs`,
 *      `<Button size="xs">`, `<Select size="xs">` and `var(--h-control-xs)` may appear
 *      only on an admin surface (plus the three kit files that DEFINE the rung).
 *      A 32px control on a phone is not a dense console row; it is a missed tap on a
 *      money product.
 *
 *   2. `--tap-min` is **40**, and 44 is preferred. WCAG 2.5.5 (AAA) asks 44; 2.5.8
 *      (AA, the level this product commits to) asks 24. Ali's ruling on 2026-08-14
 *      took 44 for the filter rails specifically for consistency. So the gate FAILS
 *      below 44 with exactly ONE legal step down — the `--tap-min` rung itself, read
 *      out of `globals.css` rather than typed here. 41, 42 and 43 are not "nearly 44";
 *      they are a number nobody decided.
 *
 * ⚠️ WHAT THIS GATE CAN AND CANNOT SEE, stated plainly so nobody reads it as more than
 * it is. It is a SOURCE contract: it reads the height a control DECLARES. A control
 * whose height comes from padding and line-height declares nothing and is invisible
 * here — that is the rendered half's job (`responsive-audit.mjs`, and the hit-probe
 * `qa:tap-hit`, which walks real coordinates because an absolutely-positioned `::after`
 * target does not show up in `getBoundingClientRect` at all). The two halves are
 * complementary, and neither is sufficient. What THIS half buys is that it runs in
 * `test:all`, with no server, and it fails.
 *
 * ⛔ §0 EXISTS BECAUSE THE OBVIOUS REGEX IS WRONG TWICE OVER, and both failures are
 * recorded in this repo's own scar tissue:
 *   · `<button\b([^>]*)>` stops at the FIRST `>` — and `onClick={() => …}` contains
 *     one. `ui-consistency.test.mts` had been under-reporting for its whole life
 *     because of it (found 2026-08-21).
 *   · a naive quote-aware reader still breaks on a template literal with `${}` in it,
 *     because the interpolation contains its own backtick strings — the first draft of
 *     this file read `aria-label={`${t.common.notifications}${unread > 0 ? ` (${unread})` : ""}`}`
 *     and ran to the end of the file, dragging nine unrelated heights onto one button.
 * So the reader is a small lexer, and §0 proves it on three fixtures before a single
 * finding is believed. A detector nobody tested is a finding count nobody can trust.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const rd = (p: string) => readFileSync(join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "", why = "") => {
  cond ? pass++ : fail++;
  const tail = cond ? why : detail;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail ? ` — ${tail}` : ""}`);
};
/** Refuse to continue when a premise is missing, rather than reporting green over a hole. */
const must = <T,>(v: T | null | undefined, what: string): T => {
  if (v === null || v === undefined) {
    console.log(`FAIL 0.0 premise missing: ${what} — this gate cannot resolve heights without it`);
    console.log("\n0 passed, 1 failed");
    process.exit(1);
  }
  return v;
};

// ---------------------------------------------------------------------------
// Comment stripping (same shape as scripts/stacking-contract.test.mts, and for the
// same reason: `/admin/**` in prose contains `/*`, so a block comment must start at a
// boundary). Comments are blanked, not removed, so offsets and line numbers survive.
// ---------------------------------------------------------------------------
const decomment = (s: string) =>
  s.replace(/(^|[\s{(,;=])\/\*[\s\S]*?\*\//g, (m, p1: string) => p1 + m.slice(p1.length).replace(/[^\n]/g, " "))
   .replace(/(^|[^:"'`\w/])\/\/[^\n]*/g, "$1");

// ===========================================================================
// THE READER — a JSX open-tag lexer.
// ===========================================================================
/**
 * Given the index of a tag's `<`, return the index of the `>` that closes the OPEN
 * tag. Tracks a stack of `"`, `'`, `` ` `` and `{`, and — the part every naive version
 * misses — treats `${` inside a template literal as pushing a new expression scope, so
 * a backtick nested inside an interpolation cannot close the outer template.
 */
function endOfOpenTag(s: string, from: number): number {
  let i = from + 1;
  while (i < s.length && !/[\s/>]/.test(s[i])) i++;   // skip the tag name
  const stack: string[] = [];
  for (; i < s.length; i++) {
    const c = s[i];
    const top = stack[stack.length - 1];
    if (top === '"' || top === "'") {
      if (c === "\\") { i++; continue; }
      if (c === top) stack.pop();
      continue;
    }
    if (top === "`") {
      if (c === "\\") { i++; continue; }
      if (c === "`") { stack.pop(); continue; }
      if (c === "$" && s[i + 1] === "{") { stack.push("{"); i++; }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { stack.push(c); continue; }
    if (c === "{") { stack.push("{"); continue; }
    if (c === "}") { if (top === "{") stack.pop(); continue; }
    if (c === ">" && stack.length === 0) return i;
  }
  return -1;
}

console.log("\n§0 · the reader, proved on the three inputs that defeat a regex");
{
  // (a) an arrow function in a handler — the `>` that broke ui-consistency for years.
  const a = `<button onClick={() => setOpen(true)} className="h-[30px]">x</button>`;
  const ea = endOfOpenTag(a, 0);
  ok("0.1 an arrow-function handler does not end the open tag early",
     ea > 0 && a.slice(0, ea).includes('className="h-[30px]"'),
     `stopped at ${ea}: ${JSON.stringify(a.slice(0, Math.max(ea, 0) + 1))}`,
     "the `>` in `=>` is inside a brace scope");
  // (b) a template literal carrying nested template strings inside `${}`.
  const b = "<button aria-label={`${a}${n > 0 ? ` (${n})` : \"\"}`} className=\"h-[36px]\">x</button>";
  const eb = endOfOpenTag(b, 0);
  ok("0.2 a template literal with nested `${}` strings does not run away",
     eb > 0 && b.slice(0, eb).includes('className="h-[36px]"') && !b.slice(0, eb).includes("</button>"),
     `stopped at ${eb}: ${JSON.stringify(b.slice(0, Math.max(eb, 0) + 1))}`,
     "`${` pushes an expression scope, so an inner backtick cannot close the outer template");
  // (c) a block comment inside the tag holding an unbalanced quote — decomment first.
  const c = decomment('<input\n  /* every <label htmlFor="dob"> pointed at nothing */\n  className="h-[52px]" />');
  const ec = endOfOpenTag(c, 0);
  ok("0.3 a comment with an unbalanced quote inside the tag does not run away",
     ec > 0 && c.slice(0, ec).includes('className="h-[52px]"'),
     `stopped at ${ec}`,
     "comments are blanked before the lexer ever sees them");
  // (d) and the naive form really does fail — otherwise §0 is ceremony.
  const naive = /<button\b([^>]*)>/.exec(a);
  ok("0.4 the naive `<button\\b([^>]*)>` really does fail on (a)",
     !!naive && !naive[1].includes("className"),
     "the naive regex captured the className, so this fixture no longer demonstrates the defect",
     `naive captured only ${JSON.stringify(naive?.[1] ?? "")}`);
}

// ===========================================================================
console.log("\n§1 · the control-height ladder in globals.css — the VALUES");
// ===========================================================================
const globals = rd("src/app/globals.css");
const tokenPx = (name: string): number | null => {
  const m = new RegExp(`--${name}:\\s*(\\d+)px`).exec(globals);
  return m ? Number(m[1]) : null;
};
const TAP_MIN = must(tokenPx("tap-min"), "--tap-min in globals.css");
const H = {
  xs: must(tokenPx("h-control-xs"), "--h-control-xs"),
  sm: must(tokenPx("h-control-sm"), "--h-control-sm"),
  md: must(tokenPx("h-control-md"), "--h-control-md"),
  lg: must(tokenPx("h-control-lg"), "--h-control-lg"),
  xl: must(tokenPx("h-control-xl"), "--h-control-xl"),
};
const H_INPUT = must(tokenPx("h-input"), "--h-input");

/** ⭐ THE FLOOR. 44 is the bar; `--tap-min` is the ONE legal step below it. */
const PREFERRED = 44;

ok("1.1 --tap-min is 40 (Law 9 / DESIGN_AUTHORITY §A2)", TAP_MIN === 40,
   `it is now ${TAP_MIN}px — if the floor moved, this gate and every "40px = --tap-min" comment in src/ move with it`,
   `${TAP_MIN}px`);
ok("1.2 --h-control-xs is 32 (the dense MOUSE-ONLY admin rung)", H.xs === 32,
   `it is now ${H.xs}px`, `${H.xs}px`);
ok("1.3 --h-control-sm is exactly --tap-min", H.sm === TAP_MIN,
   `sm=${H.sm} tap-min=${TAP_MIN} — Phase 3 landed them on the same number deliberately; a gap here means one of them drifted`,
   `both ${TAP_MIN}px`);
ok("1.4 --h-control-md is the preferred 44", H.md === PREFERRED,
   `it is now ${H.md}px`, `${H.md}px`);
ok("1.5 --h-input equals --h-control-md, so an input and a button beside it line up",
   H_INPUT === H.md, `input=${H_INPUT} md=${H.md}`, `both ${H.md}px`);
ok("1.6 the ladder is monotonic (xs < sm ≤ md ≤ lg ≤ xl)",
   H.xs < H.sm && H.sm <= H.md && H.md <= H.lg && H.lg <= H.xl,
   `${H.xs}/${H.sm}/${H.md}/${H.lg}/${H.xl}`, `${H.xs}/${H.sm}/${H.md}/${H.lg}/${H.xl}`);
ok("1.7 every rung except the admin xs one clears --tap-min",
   [H.sm, H.md, H.lg, H.xl, H_INPUT].every((v) => v >= TAP_MIN),
   "a kit rung under the floor puts every consumer under it at once", "");

// The `.btn-<size>` → token binding, read out of globals.css. §3 needs it to resolve a
// `btn-md` into 44px; if it stops parsing, §3 is silently blind and must not report.
const BTN: Record<string, number> = {};
for (const m of globals.matchAll(/\.btn-(xs|sm|md|lg|xl)\s*\{[^}]*height:\s*var\(--h-control-(xs|sm|md|lg|xl)\)/g)) {
  BTN[m[1]] = H[m[2] as keyof typeof H];
}
ok("1.8 every .btn-<size> still resolves through a --h-control-* token",
   Object.keys(BTN).length === 5,
   `resolved ${Object.keys(BTN).join(", ") || "none"} — §3 cannot price a \`btn-*\` class it cannot resolve`,
   `xs ${BTN.xs} · sm ${BTN.sm} · md ${BTN.md} · lg ${BTN.lg} · xl ${BTN.xl}`);
if (Object.keys(BTN).length !== 5) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

// The overridden spacing scale. ⚠️ `h-8` is **48px** here, not 32 — `tailwind.config.ts`
// re-numbers `spacing`, and this repo's comments record the mistake nine separate times
// ("⚠️ LITERAL, not `h-8` (48px on the overridden scale)"). Read the scale; never assume it.
const twConfig = rd("tailwind.config.ts");
const spacingBlock = must(/spacing:\s*\{([\s\S]*?)\n\s{6}\},/.exec(twConfig), "the `spacing` block in tailwind.config.ts");
const SPACING = new Map<string, number>();
for (const m of spacingBlock[1].matchAll(/"([\d.]+)":\s*"(\d+)px"/g)) SPACING.set(m[1], Number(m[2]));
ok("1.9 the overridden spacing scale parsed (h-N does NOT mean N×4px here)",
   SPACING.get("8") === 48 && SPACING.get("7") === 40,
   `h-7=${SPACING.get("7")} h-8=${SPACING.get("8")} — the scale changed shape; §3's h-N resolution must be re-derived`,
   `h-7 = ${SPACING.get("7")}px · h-8 = ${SPACING.get("8")}px · h-10 = ${SPACING.get("10")}px`);

// ===========================================================================
console.log("\n§2 · EXCEPTION 1, as law — the 32px rung is ADMIN and MOUSE-ONLY");
// ===========================================================================
/**
 * The three files that DEFINE the rung are not consumers of it:
 *   globals.css      — declares `--h-control-xs` and `.btn-xs`
 *   ui/button.tsx    — maps the `xs` prop to the `btn-xs` class
 *   ui/select.tsx    — maps its own `xs` size to the same 32px
 * ⚠️ `size="xs"` on its own is NOT a signal: `Chip`, `Avatar` and `ProposalsStateBadge`
 * carry their own `xs`, and none of them is a control. Only the CONTROL components are
 * matched, by name.
 */
const XS_DEFINERS = new Set(["src/app/globals.css", "src/components/ui/button.tsx", "src/components/ui/select.tsx"]);
const XS_SIGNALS: Array<[RegExp, string]> = [
  [/\bbtn-xs\b/, "the `btn-xs` class"],
  [/<Button[^>]{0,400}?size="xs"/s, '<Button size="xs">'],
  [/<Select[^>]{0,400}?size="xs"/s, '<Select size="xs">'],
  [/var\(--h-control-xs\)/, "var(--h-control-xs)"],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e === "node_modules" || e === ".next") continue; walk(p, out); }
    else if (/\.(tsx|css)$/.test(e)) out.push(p);
  }
  return out;
}
const relOf = (f: string) => relative(ROOT, f).replace(/\\/g, "/");
/** Admin surfaces are mouse-and-desktop by definition; player surfaces are a phone. */
const isAdmin = (r: string) => r.includes("/admin/") || /\/admin-[\w-]+\.(tsx|css)$/.test(r);
const files = walk(join(ROOT, "src")).map(relOf);

const xsOnPlayer: string[] = [];
for (const r of files) {
  if (isAdmin(r) || XS_DEFINERS.has(r)) continue;
  const body = decomment(rd(r));
  for (const [re, what] of XS_SIGNALS) if (re.test(body)) xsOnPlayer.push(`${r} (${what})`);
}
ok("2.1 the 32px rung appears on NO player surface", xsOnPlayer.length === 0,
   xsOnPlayer.join(" · ") + " — 32px is the documented dense MOUSE-ONLY admin exception; on a finger surface use --tap-min (40) or the preferred 44",
   `checked ${files.filter((r) => !isAdmin(r)).length} player files`);
// And the exception must still be REACHABLE — if nothing uses it, it is not an
// exception, it is dead config, and it should be deleted rather than documented.
const xsOnAdmin = files.filter((r) => isAdmin(r) && XS_SIGNALS.some(([re]) => re.test(decomment(rd(r)))));
ok("2.2 the exception is actually used by admin (so it is a rule, not dead config)",
   xsOnAdmin.length > 0,
   "nothing uses --h-control-xs any more — delete the token and this exception rather than carrying both",
   `${xsOnAdmin.length} admin files`);

// ===========================================================================
console.log("\n§3 · the gate — a player control may not DECLARE a height under the floor");
// ===========================================================================
/** Interactive HTML tags, plus next/link which renders an `<a>`. */
const TAGS = ["button", "a", "Link", "input", "select", "textarea", "summary"];
const INTERACTIVE_ROLE = /role=["'](?:button|tab|menuitem|menuitemcheckbox|menuitemradio|option|switch|checkbox|radio|link)["']/;

/** Every height a tag DECLARES, in px. The effective floor is the largest of them
 *  (a `min-height` beats a shorter `height`, which is exactly how the DOM resolves it). */
function declaredHeights(attrs: string): Array<{ px: number; how: string }> {
  const out: Array<{ px: number; how: string }> = [];
  const push = (px: number, how: string) => { if (Number.isFinite(px)) out.push({ px, how }); };
  for (const m of attrs.matchAll(/\b(?:min-)?h-\[(\d+)px\]/g)) push(Number(m[1]), m[0]);
  for (const m of attrs.matchAll(/\bsize-\[(\d+)px\]/g)) push(Number(m[1]), m[0]);
  for (const m of attrs.matchAll(/\bh-\[var\(--tap-min\)\]/g)) push(TAP_MIN, m[0]);
  for (const m of attrs.matchAll(/\bh-\[var\(--h-control-(xs|sm|md|lg|xl)\)\]/g)) push(H[m[1] as keyof typeof H], m[0]);
  // numeric scale classes — resolved through the OVERRIDDEN scale, never 4×N
  for (const m of attrs.matchAll(/\b(?:min-)?h-([\d.]+)(?![\w[-])/g)) {
    const v = SPACING.get(m[1]);
    if (v !== undefined) push(v, `${m[0]} (=${v}px on this repo's scale)`);
  }
  // inline styles
  for (const m of attrs.matchAll(/\b(?:min)?[Hh]eight:\s*(\d+)\b/g)) push(Number(m[1]), m[0].replace(/\s+/g, ""));
  for (const m of attrs.matchAll(/\b(?:min)?[Hh]eight:\s*["'](\d+)px["']/g)) push(Number(m[1]), m[0].replace(/\s+/g, ""));
  // kit button sizes
  for (const m of attrs.matchAll(/\bbtn-(xs|sm|md|lg|xl)\b/g)) push(BTN[m[1]], m[0]);
  return out;
}

type Finding = { file: string; line: number; tag: string; px: number; how: string; label: string };
const findings: Finding[] = [];
let scannedTags = 0, runaways = 0;

for (const r of files) {
  if (!r.endsWith(".tsx")) continue;
  if (isAdmin(r)) continue;
  const body = decomment(rd(r));
  const starts: Array<{ at: number; tag: string }> = [];
  for (const tag of TAGS) {
    for (const m of body.matchAll(new RegExp(`<${tag}(?=[\\s/>])`, "g"))) starts.push({ at: m.index ?? 0, tag });
  }
  // Elements that are interactive only by ROLE (a <div role="switch">, a <span role="tab">).
  for (const m of body.matchAll(/<([a-z][\w.]*|[A-Z][\w.]*)(?=[\s])/g)) {
    const at = m.index ?? 0;
    if (starts.some((s) => s.at === at)) continue;
    const end = endOfOpenTag(body, at);
    if (end < 0) continue;
    if (INTERACTIVE_ROLE.test(body.slice(at, end))) starts.push({ at, tag: m[1] });
  }
  for (const { at, tag } of starts) {
    const end = endOfOpenTag(body, at);
    if (end < 0 || end - at > 4000) { runaways++; continue; }
    scannedTags++;
    const attrs = body.slice(at + tag.length + 1, end);
    if (/type=["']hidden["']/.test(attrs)) continue;      // never rendered, never tapped
    const hs = declaredHeights(attrs);
    if (hs.length === 0) continue;                        // declares nothing — the rendered half's job
    const eff = hs.reduce((a, b) => (b.px > a.px ? b : a));
    if (eff.px >= PREFERRED || eff.px === TAP_MIN) continue;
    const label = (/aria-label=\{?["']([^"']{0,30})/.exec(attrs)?.[1]
                ?? /placeholder=\{?["']([^"']{0,30})/.exec(attrs)?.[1] ?? "").trim();
    findings.push({ file: r, line: body.slice(0, at).split("\n").length, tag, px: eff.px, how: eff.how, label });
  }
}
// ⛔ A reader that ran away is not "no finding" — it is an unread file. Say so.
ok("3.1 every interactive open tag on a player surface was read to its end",
   runaways === 0,
   `${runaways} tags could not be closed — the lexer lost sync and this gate is BLIND on them`,
   `${scannedTags} tags read`);

/**
 * ⛔ THE RATCHET — pre-existing sub-floor player controls, none of them in this file's
 * ownership. It may only SHRINK, and §4 asserts every row is STILL a real finding, so
 * a fixed control leaves a stale row behind and the gate FAILS until the row is
 * deleted. ⚠️ These are NOT exceptions: an exception carries a reason that makes it
 * correct (see §2 and the `--tap-min` step above). Each row below carries the height
 * it currently declares, so a control cannot get SMALLER without failing either.
 */
const RATCHET: Record<string, { px: number; note: string }> = {
  "src/components/ui/toggle.tsx:button@26":
    { px: 26, note: "the kit Switch TRACK is 44×26 and stays that way by design — but since DG-A-02 (2026-08-29) its REACH is 40px via `.toggle-switch::after` (globals.css), so this row is now about PAINT, not about tap. ⛔ Do not read it as 'sub-floor' any more, and do not 'fix' it by raising the inline height: that would fail §4.x here (this key would stop matching) and change the geometry of ~100 controls. This scan is static and can only ever see the declared 26; the reach is proven where it actually lives, by `npm run qa:toggle-hit` against production with elementFromPoint — a bounding box cannot see that fix." },
  "src/components/proposals/vote-control.tsx:button@34":
    { px: 34, note: "the proposal up/down vote buttons are 36×34 inside a 3px-padded capsule (≈40 outer). Genuinely close, and genuinely not 44." },
  "src/components/profile/password-section.tsx:button@30":
    { px: 30, note: "the `Change / Set password` button in the account panel — 30px, the smallest declared player control in the tree, on a security action." },
  "src/components/ui/tabs.tsx:button@36":
    { px: 36, note: "36px segment inside the `p-1` (4px) capsule ⇒ a 46px capsule. The SEGMENT is under the floor even though the control group is not; documented at the call site." },
  "src/components/ui/date-select.tsx:button@36":
    { px: 36, note: "calendar day cell. Documented at the call site: `h-9` is 64px on this repo's scale, which made six rows 384px of grid inside a 320px popover." },
  "src/components/ui/date-select.tsx:button@32":
    { px: 32, note: "calendar year cell, same reason — `h-8` is 48px here, which showed 4.5 rows in a 240px scroller instead of 7." },
  "src/app/results/notable-carousel.tsx:button@8":
    { px: 8, note: "carousel paging dots (8px tall, 6–18px wide). `tabIndex={-1}` inside an `aria-hidden` strip, so they are out of the a11y tree — but they are still tappable, and a finger cannot hit 8px." },
};
const keyOf = (f: Finding) => `${f.file}:${f.tag}@${f.px}`;
const seenKeys = new Set(findings.map(keyOf));
const unratcheted = findings.filter((f) => !(keyOf(f) in RATCHET));
ok(`3.2 no player control declares a height below ${PREFERRED}px (the one legal step down is --tap-min ${TAP_MIN}px)`,
   unratcheted.length === 0,
   unratcheted.map((f) => `${f.file}:${f.line} <${f.tag}${f.label ? ` "${f.label}"` : ""}> declares ${f.px}px via ${f.how}`).join(" · ") +
     ` — raise it to ${PREFERRED}px, or to exactly ${TAP_MIN}px (--tap-min) if the surface genuinely cannot give the extra 4`,
   `${findings.length} sub-floor controls, all ratcheted; ${scannedTags} tags read across ${files.filter((r) => r.endsWith(".tsx") && !isAdmin(r)).length} player files`);

// ===========================================================================
console.log("\n§4 · the ratchet may only shrink");
// ===========================================================================
for (const [key, { px, note }] of Object.entries(RATCHET)) {
  ok(`4.x ratchet ${key} is still a real finding`, seenKeys.has(key),
     `nothing at ${px}px matches "${key}" any more — it was fixed (or moved). DELETE this row: a ratchet that can rot is a second place to be wrong`,
     note);
}
// A row whose control got SMALLER produces a different key, so it lands in §3.2 as a
// NEW finding rather than hiding inside its old row. That is the property that makes
// "may only shrink" mean shrink, and not merely "may not grow in count".
ok("4.z the ratchet is keyed by height, so a control cannot shrink inside its own row",
   Object.keys(RATCHET).every((k) => /@\d+$/.test(k)), "a row lost its @px suffix", "every row is keyed file:tag@px");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
