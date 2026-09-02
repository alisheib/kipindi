/**
 * ⭐ THE Z-ORDER CONTRACT — the ladder, the traps, and the one rule that keeps a
 * `position: fixed` overlay pointing at the viewport.
 *
 *   npx tsx scripts/stacking-contract.test.mts     (npm run test:stacking)
 *
 * 🔴 WHY THIS EXISTS. Before 2026-08-21 **no gate in this repo read a z-index at all.**
 * The platform's stacking order lived in four places that could not see one another:
 * a prose table in `needle.css`, a `zIndex` ladder in `tailwind.config.ts`, ~40
 * hand-typed `z-[N]` literals across `src/`, and five `zIndex:` numbers in inline
 * styles. Three of the four were WRONG, and each was wrong in a way that only shows
 * up as "a control I can see and cannot press".
 *
 * ⛔ THE FAILURE MODE THAT MOTIVATED THE WHOLE FILE — **a declared z-index is not an
 * effective one.** A positioned element that carries a z-index forms a STACKING
 * CONTEXT, and every descendant is sealed inside it: the child's own z-index orders
 * it against its siblings and cannot lift it past its parent's rung, no matter how
 * large the number is. So `needle.css`'s invariant table — which reasons entirely from
 * the DECLARED literals — is optimistic in three directions at once:
 *
 *   surface            declares   actually lands at   sealed inside
 *   nav-more (rail)      50            40             bottom-nav      (fixed, z-40)
 *   nav-more (bar)       50            30             top-app-bar     (sticky, z-30)
 *   language-menu        30            30             top-app-bar     (sticky, z-30)
 *   menu-shell           30            20             discovery-bar   (sticky, z-20)
 *   admin AI toolkit     50            40             admin top bar   (relative, z-40)
 *
 * Every one of those numbers is a promise the DOM cannot keep. `nav-more` asking for
 * 50 does not put the overflow menu above a z-45 Needle or a z-60 bell panel; it puts
 * it at 40, level with the bar it hangs from. That is not a bug on its own — an
 * anchored menu SHOULD travel with its bar — but it is a lie in the table a future
 * session will reason from, and this file replaces the table with an assertion.
 *
 * ⭐ SO §2 ASSERTS THE **EFFECTIVE ROOT** Z, NOT THE DECLARED ONE, and it earns the
 * right to do so: for each trapped surface it re-proves, in source, that (a) the child
 * does not portal out, (b) the named ancestor really renders it, and (c) the
 * ancestor's own element really forms a stacking context (positioned + a z-index).
 * Drop any one of the three and the "effective" number is a guess.
 *
 * 🔴 AND THE TAILWIND LADDER STATED FICTION (§4). `tailwind.config.ts` declared
 * `modal: 1300` (the real Modal is 100), `toast: 1500` (the real one is 1800) and
 * `dropdown: 1000` (the real ones are 20–130). Ten rungs, one consumer: the admin
 * mobile nav drawer at `z-popover` = **1400** — which put a NAVIGATION DRAWER above
 * every admin `<Modal>` at 100. On this platform an admin Modal is where an officer
 * types SEAL to settle a market, so a mis-tapped hamburger could cover the dialog
 * that moves money. The ladder now carries only rungs that ship, `popover` is pinned
 * to the drawer rung it should always have been, and §4 asserts the ladder against
 * the SHIPPING FILES (it reads Modal's own default out of `modal.tsx`) rather than
 * against a literal copied in here, which would be the same two-definitions defect
 * one level up.
 *
 * 🔴 §5 — NO NON-PORTALED `position: fixed` INSIDE ROUTE CONTENT. Measured on
 * 2026-08-15 (globals.css, `.kp-fsheet-panel`): `.route-enter` is
 * `animation: m-settle-in … both`, and a `both` fill keeps the final keyframe's
 * `transform` applied FOR EVER. A transformed element is the containing block for
 * every fixed-position descendant, so `inset: 0` resolves to the page-transition
 * wrapper instead of the window — the sheet reported `top: -32px` in a 780px
 * viewport, with a scrim that covered neither end. That is why the shared `<Modal>`
 * portals to `document.body`. `AiOverlayShell` (`ui/ai-progress.tsx`) is exactly that
 * trap today: `fixed inset-0`, `role="dialog"`, `aria-modal`, no portal, rendered from
 * two admin ROUTE files. It is carried in a one-entry ratchet that may only shrink —
 * and §5.3 proves the failure mode is REACHABLE rather than theoretical, because a
 * check written against an unreachable branch proves nothing.
 *
 * 🔴 §5.2 WAS ONE LEVEL TOO SHALLOW UNTIL 2026-09-01, AND A REAL DEFECT WALKED THROUGH
 * IT GREEN. Its predicate was `fixed` + `inset-0` — a FULL-VIEWPORT overlay — so an
 * EDGE-ANCHORED bar (`fixed inset-x-0 bottom-0`) was invisible to it, even though the
 * containing-block trap is identical and does not care which insets are set. The new
 * `PendingChangesBar` was written non-portaled, passed this gate, and would have sat at
 * the bottom of a 4,000px PAGE — scrolling away — while still computing `position:
 * fixed` and looking perfect in a screenshot of the top of the page.
 * ⭐ Widening it required fixing a SECOND shallowness first: the "is it root-mounted?"
 * question was asked one hop deep, so `ui/toast.tsx` — whose viewport reaches the root
 * through its own `ToastProvider` — read as a finding, and the rule could not have
 * landed at zero. `reachesOnlyRootMounts` now walks the consumer graph transitively
 * (cycle-safe), which is what made the widening honest rather than a ratchet entry.
 * ⚠️ Proved RED on the exact shape: removing the bar's `createPortal` fails 5.2 by name.
 *
 * ⚠️ RATCHETS vs EXCEPTIONS, and why both appear here. A deliberate inversion with a
 * reason (toasts above modals; select above modal) is stated in §3 as LAW. A defect we
 * have not fixed yet (`AiOverlayShell`; `needle.css` naming a rung that no surface
 * ships) is a RATCHET — listed by name, and asserted to still be a real finding, so
 * the moment someone fixes it the stale entry FAILS and must be deleted. A ratchet
 * that can rot is just a second place to be wrong.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const rd = (p: string) => readFileSync(join(ROOT, p), "utf8");

let pass = 0, fail = 0;
/**
 * `why` is the reason the rule exists and prints on a PASS; `detail` is what a
 * reader needs in order to FIX it and prints only on a failure. Printing the
 * fix-instruction next to the word PASS is how a green log ends up reading like a
 * red one, which is its own kind of rot.
 */
const ok = (label: string, cond: boolean, detail = "", why = "") => {
  cond ? pass++ : fail++;
  const tail = cond ? why : detail;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail ? ` — ${tail}` : ""}`);
};

// ---------------------------------------------------------------------------
// Comment stripping. A z-index written in PROSE is not a declaration, and this
// codebase's comments are long and quote real class strings — `filter-sheet.tsx`
// alone explains "the bar is z-20 and the bottom nav z-40" inside a block comment.
// A sweep that counts those is counting the documentation, not the product.
//
// ⛔ `/\/\*/` ON ITS OWN IS WRONG HERE, AND IT COST AN HOUR. `admin-shell.tsx`
// explains that "every /admin/** route maps to exactly one AdminDomain" — and
// `/admin/**` CONTAINS `/*`. A naive block-comment regex opened a comment inside
// that prose and blanked the next 40 lines of real code, including the admin top
// bar's own `relative z-40`. So a block comment must START at a boundary
// (line-start, whitespace, or one of `{(,;=`), which is where every real one in
// this codebase does. The `[^:/]` guard in front of `//` does the same job for
// `https://` and for `/admin/**`.
// Comments are BLANKED, not deleted, so byte offsets and line numbers survive.
// ---------------------------------------------------------------------------
const decomment = (s: string) =>
  s.replace(/(^|[\s{(,;=])\/\*[\s\S]*?\*\//g, (m, p1: string) => p1 + m.slice(p1.length).replace(/[^\n]/g, " "))
   .replace(/(^|[^:"'`\w/])\/\/[^\n]*/g, "$1");

/** Read a file with comments blanked. */
const src = (p: string) => decomment(rd(p));

/**
 * Find EXACTLY ONE match of `re` in `p`, and return the captured number.
 *
 * ⛔ E-108's lesson, applied. A locator that matches the wrong block — or matches
 * three blocks and silently takes the first — validates something nobody meant. So
 * every locator here carries a neighbouring, surface-specific anchor (`kp-rail`,
 * `app-topbar`, `rounded-control`, `lcl-scrim`) rather than the bare number, and the
 * match count is asserted. Zero matches and two matches are both failures.
 */
function soleNumber(p: string, re: RegExp, label: string): number | null {
  const body = src(p);
  const hits = [...body.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))];
  if (hits.length !== 1) {
    ok(label, false, `locator matched ${hits.length} times in ${p} — it no longer names one surface, so nothing below it can be trusted`);
    return null;
  }
  return Number(hits[0][1]);
}

// ===========================================================================
// THE CONTRACT — the measured ladder, top to bottom.
// Every rung below was read off the shipping file, not designed here.
// ===========================================================================
type Surface = {
  id: string;
  file: string;
  /** Must capture the z as group 1, and must carry an anchor unique to this surface. */
  find: RegExp;
  z: number;
  note: string;
};

const ROOT_SURFACES: Surface[] = [
  { id: "skip-link",           file: "src/components/layout/app-shell.tsx",              find: /focus:z-\[(\d+)\][^"]*focus:rounded-md/,                     z: 9999, note: "WCAG 2.4.1 skip link — above literally everything, including a locale change" },
  { id: "locale-overlay",      file: "src/lib/i18n.tsx",                                 find: /lcl-scrim fixed inset-0 z-\[(\d+)\]/,                        z: 9000, note: "the whole app is re-rendering in another language; nothing may sit over it" },
  { id: "nav-progress",        file: "src/components/ui/nav-progress.tsx",               find: /fixed inset-x-0 top-0 z-\[(\d+)\] h-\[3px\]/,                z: 2000, note: "DELIBERATELY above toasts — navigation feedback outranks a message about the page you are leaving" },
  { id: "toast",               file: "src/components/ui/toast.tsx",                      find: /fixed inset-x-0 top-0 z-\[(\d+)\] flex flex-col/,            z: 1800, note: "DELIBERATELY above modals — see operation-result-modal.tsx" },
  { id: "win-celebration",     file: "src/components/markets/win-celebration.tsx",       find: /zIndex=\{(\d+)\}/,                                           z: 1700, note: "a Modal raised off its default — earned money outranks whatever is open" },
  { id: "reality-check",       file: "src/components/rg/reality-check.tsx",              find: /zIndex=\{(\d+)\}/,                                           z: 1700, note: "RG interruption — same rung as the celebration, by design" },
  // ⚠️ The legacy tooltip is `position: absolute`, not fixed, so its EFFECTIVE rung
  //    depends on where it is used (a hovered `.mcardp` gets a transform, and a
  //    transform makes a stacking context). It is listed for its DECLARED rung only —
  //    which is the one number the old Tailwind ladder already had right — and it is
  //    deliberately absent from the §3 ordering laws for exactly that reason.
  { id: "tooltip",             file: "src/app/globals.css",                              find: /(?:^|\n)\.kp-tooltip-popover \{[\s\S]{0,1400}?z-index:\s*(\d+);/, z: 1600, note: "declared rung of the legacy inline tooltip (position:absolute — context-dependent in practice)" },
  { id: "offline-banner",      file: "src/components/ui/offline-banner.tsx",             find: /fixed top-0 inset-x-0 z-\[(\d+)\]/,                          z:  200, note: "connectivity is a fact about the whole app, so it outranks page chrome" },
  { id: "first-visit-primer",  file: "src/components/onboarding/first-visit-primer.tsx", find: /zIndex=\{(\d+)\}/,                                           z:  150, note: "a Modal raised above select/date-select so the primer is never pierced" },
  { id: "select",              file: "src/components/ui/select.tsx",                     find: /fixed z-\[(\d+)\] rounded-control/,                          z:  130, note: "DELIBERATELY above modals — a Select inside a dialog must open over it" },
  { id: "date-select",         file: "src/components/ui/date-select.tsx",                find: /fixed inset-0 z-\[(\d+)\] flex items-center/,                z:  120, note: "same reason as select; below select so a Select over a calendar still wins" },
  { id: "modal",               file: "src/components/ui/modal.tsx",                      find: /zIndex = (\d+),/,                                            z:  100, note: "THE dialog rung — the default every consequential confirm rides" },
  { id: "filter-sheet-lift",   file: "src/app/globals.css",                              find: /html\[data-sheet-open\] \.kp-discovery-bar \{ z-index: (\d+); \}/, z: 100, note: "the discovery bar is lifted to the dialog rung WHILE its sheet is open, and only then" },
  { id: "chat-panel-mobile",   file: "src/components/chat/ChatRoot.tsx",                 find: /inset: "40px 0 0 0",\s*\n\s*zIndex: (\d+),/,                 z:   80, note: "full-height chat sheet on phones" },
  { id: "chat-scrim-mobile",   file: "src/components/chat/ChatRoot.tsx",                 find: /position: "fixed", inset: 0, zIndex: (\d+) \}/,              z:   79, note: "one rung under its own panel" },
  { id: "needle-drawer-panel", file: "src/components/layout/needle-drawer.tsx",          find: /fixed z-\[(\d+)\] border border-border-strong/,              z:   71, note: "the Needle's bottom sheet" },
  { id: "needle-drawer-scrim", file: "src/components/layout/needle-drawer.tsx",          find: /fixed inset-0 z-\[(\d+)\] bg-black\/50/,                     z:   70, note: "one rung under its own panel" },
  { id: "chat-panel-desktop",  file: "src/components/chat/ChatRoot.tsx",                 find: /right: 32,\s*\n\s*bottom: 32,\s*\n\s*zIndex: (\d+),/,        z:   70, note: "anchored panel, no scrim on desktop" },
  { id: "notifications-panel", file: "src/components/layout/notifications-panel.tsx",    find: /z-\[(\d+)\] rounded-modal border border-border-strong/,      z:   61, note: "the bell panel" },
  { id: "avatar-menu-panel",   file: "src/components/layout/avatar-menu.tsx",            find: /shadow-overlay z-\[(\d+)\]/,                                 z:   61, note: "the account menu" },
  { id: "notifications-scrim", file: "src/components/layout/notifications-panel.tsx",    find: /fixed inset-0 z-\[(\d+)\] bg-black\/60/,                     z:   60, note: "one rung under its own panel" },
  { id: "avatar-menu-scrim",   file: "src/components/layout/avatar-menu.tsx",            find: /fixed inset-0 z-\[(\d+)\] bg-black\/45/,                     z:   60, note: "one rung under its own panel" },
  { id: "chat-fab",            file: "src/components/chat/ChatRoot.tsx",                 find: /bottom: isMobile \? 80 : 16,\s*\n\s*zIndex: (\d+),/,         z:   60, note: "the chat bubble floats with the menus, not with the bars" },
  { id: "pull-to-refresh",     file: "src/components/ui/pull-to-refresh.tsx",            find: /fixed left-1\/2 z-\[(\d+)\]/,                                z:   60, note: "the pull indicator crosses the top bar" },
  { id: "needle",              file: "src/components/layout/needle.css",                 find: /#needle-root #needle \{[^}]*z-index: (\d+);/,                z:   45, note: "ABOVE both nav bars so it can never be trapped under one, BELOW every menu/dialog so a fidget never covers a decision" },
  { id: "bottom-nav",          file: "src/components/layout/bottom-nav.tsx",             find: /lg:hidden fixed inset-x-0 bottom-0 z-(\d+) kp-rail/,         z:   40, note: "primary navigation on the phone" },
  { id: "admin-top-bar",       file: "src/components/admin/admin-shell.tsx",             find: /"relative z-(\d+) border-b border-border"/,                  z:   40, note: "elevated above the page body so the AI-toolkit dropdown overlays content" },
  { id: "top-app-bar",         file: "src/components/layout/top-app-bar.tsx",            find: /"sticky top-0 z-(\d+) app-topbar"/,                          z:   30, note: "the player header" },
  { id: "discovery-bar",       file: "src/components/markets/discovery-bar.tsx",         find: /kp-discovery-bar sticky top-\[56px\] z-(\d+)/,               z:   20, note: "the board's filter rail — the lowest chrome rung" },
];

/** A surface sealed inside another surface's stacking context. */
type Trapped = {
  id: string;
  file: string;
  find: RegExp;
  declared: number;
  /** The ancestor whose stacking context seals it — an id from ROOT_SURFACES. */
  ancestor: string;
  /** The ancestor's file must render this child; this is the symbol it renders. */
  renderedAs: string;
  effective: number;
  note: string;
};

const TRAPPED: Trapped[] = [
  {
    id: "nav-more-rail", file: "src/components/layout/nav-more.tsx",
    find: /absolute bottom-\[calc\(100%\+8px\)\] right-2 z-\[(\d+)\]/,
    declared: 50, ancestor: "bottom-nav", renderedAs: "NavMore", effective: 40,
    note: "the phone rail's overflow menu — opens upward out of a z-40 fixed bar",
  },
  {
    id: "nav-more-bar", file: "src/components/layout/nav-more.tsx",
    find: /absolute right-0 top-\[calc\(100%\+6px\)\] z-\[(\d+)\]/,
    declared: 50, ancestor: "top-app-bar", renderedAs: "NavMore", effective: 30,
    note: "the header's More menu — hangs from a z-30 sticky header",
  },
  {
    id: "language-menu", file: "src/components/ui/language-menu.tsx",
    find: /absolute top-\[calc\(100%\+6px\)\] z-(\d+) min-w-\[196px\]/,
    declared: 30, ancestor: "top-app-bar", renderedAs: "LanguageMenu", effective: 30,
    note: "declares the same rung as the bar it lives in — the number reads like a choice and is not one",
  },
  {
    id: "menu-shell", file: "src/components/markets/menu-shell.tsx",
    find: /absolute left-0 top-\[calc\(100%\+6px\)\] z-(\d+) max-h-/,
    declared: 30, ancestor: "discovery-bar", renderedAs: "MenuShell", effective: 20,
    note: "the board's filter dropdowns — asks for 30, lands at the bar's 20",
  },
  {
    id: "admin-ai-toolkit", file: "src/components/admin/ai-toolkit.tsx",
    find: /shadow-e4 z-(\d+)`/,
    declared: 50, ancestor: "admin-top-bar", renderedAs: "AiToolkit", effective: 40,
    note: "the admin AI switchboard — its own file's comment reasons from the 50",
  },
];

// ===========================================================================
console.log("\n§1 · every named surface still declares the rung the contract says");
// The VALUE, read out of the shipping file — never a count of how often a name appears.
// ===========================================================================
const declared = new Map<string, number>();
for (const s of ROOT_SURFACES) {
  const n = soleNumber(s.file, s.find, `1.x ${s.id} declares z=${s.z}`);
  if (n === null) continue;
  declared.set(s.id, n);
  ok(`1.x ${s.id} declares z=${s.z}`, n === s.z,
     `${s.file} now declares ${n} — update the contract AND re-check every law below it`, s.note);
}

// ===========================================================================
console.log("\n§2 · the TRAPPED families — effective root z, proved three ways");
// ===========================================================================
for (const t of TRAPPED) {
  const childBody = src(t.file);
  const anc = ROOT_SURFACES.find((s) => s.id === t.ancestor)!;
  const ancBody = src(anc.file);

  // (a) the child cannot portal out of the context. If it ever does, its declared
  //     number becomes the real one and this whole entry must be re-derived.
  ok(`2.x ${t.id} does not portal out of ${t.ancestor}`,
     !/createPortal\s*\(/.test(childBody),
     "it portals now — the trap is gone and the effective z below must be recomputed",
     "no createPortal, so it cannot escape the context");

  // (b) the containment is REAL, in source. Without this, "effective" is a guess
  //     about a render tree nobody checked.
  ok(`2.x ${t.ancestor} really renders <${t.renderedAs}>`,
     new RegExp(`<${t.renderedAs}[\\s/>]`).test(ancBody),
     `${anc.file} no longer renders <${t.renderedAs}> — the ancestor chain changed`,
     "the containment is real, in source");

  // (c) the ancestor's element really forms a stacking context: positioned AND
  //     carrying a z-index. `position: static` with a z-index forms nothing, and a
  //     positioned element WITHOUT one forms nothing either (z-index: auto).
  const ancDecl = ancBody.match(new RegExp(anc.find.source));
  const ancClass = (ancDecl?.[0] ?? "").trim().slice(0, 80);
  ok(`2.x ${t.ancestor} forms a stacking context (positioned + z-index)`,
     /\b(fixed|sticky|relative|absolute)\b/.test(ancClass) && /z-(?:\[)?\d+/.test(ancClass),
     `read: "${ancClass}" — without BOTH a position and a z-index there is no context, and nothing is trapped`,
     `"${ancClass}"`);

  // the declared number, read out of the child
  const d = soleNumber(t.file, t.find, `2.x ${t.id} declares z=${t.declared}`);
  if (d !== null) ok(`2.x ${t.id} declares z=${t.declared}`, d === t.declared, `it now declares ${d}`);

  // and the effective root z is the ANCESTOR's rung, not the child's number.
  const eff = declared.get(t.ancestor);
  ok(`2.x ${t.id} lands at effective z=${t.effective}, not its declared ${t.declared}`,
     eff === t.effective,
     `${t.ancestor} is at ${eff}, so this surface lands at ${eff} — fix the contract, not the number`,
     t.declared > t.effective ? `TRAPPED: asks for ${t.declared}, sealed at ${t.effective} — ${t.note}` : t.note);
}

// ===========================================================================
console.log("\n§3 · the effective order, and the inversions that are deliberate");
// ===========================================================================
const effective = new Map<string, number>();
for (const s of ROOT_SURFACES) effective.set(s.id, declared.get(s.id) ?? NaN);
for (const t of TRAPPED) effective.set(t.id, declared.get(t.ancestor) ?? NaN);
const zOf = (id: string) => effective.get(id) ?? NaN;

/** id-above, id-below, why it is deliberate rather than an accident. */
const LAWS: Array<[string, string, string]> = [
  ["skip-link", "locale-overlay",   "a keyboard user must be able to skip content even mid-locale-change"],
  ["locale-overlay", "nav-progress", "the app is re-rendering in another language — nothing may show through"],
  ["nav-progress", "toast",          "DELIBERATE: route feedback outranks a message about the page being left"],
  ["toast", "modal",                 "DELIBERATE (operation-result-modal.tsx): a toast must be readable over a dialog"],
  ["toast", "win-celebration",       "even the celebration does not bury a toast"],
  ["win-celebration", "modal",       "earned money outranks whatever dialog was open"],
  ["reality-check", "modal",         "an RG interruption outranks whatever dialog was open"],
  ["offline-banner", "first-visit-primer", "connectivity is a fact about the whole app"],
  ["first-visit-primer", "select",   "the primer must not be pierced by a dropdown behind it"],
  ["select", "date-select",          "a Select opened over a calendar still wins"],
  ["date-select", "modal",           "DELIBERATE: a picker inside a dialog must open OVER it, not inside it"],
  ["modal", "chat-panel-mobile",     "a dialog outranks the chat sheet"],
  ["chat-panel-mobile", "chat-scrim-mobile", "a panel is above its own scrim"],
  ["needle-drawer-panel", "needle-drawer-scrim", "a panel is above its own scrim"],
  ["needle-drawer-scrim", "notifications-panel", "the drawer covers the bell panel"],
  ["notifications-panel", "notifications-scrim", "a panel is above its own scrim"],
  ["avatar-menu-panel", "avatar-menu-scrim", "a panel is above its own scrim"],
  ["notifications-scrim", "needle",  "⭐ THE NEEDLE RULE: a fidget must never cover a decision"],
  ["chat-fab", "needle",             "⭐ THE NEEDLE RULE: a fidget must never cover a control"],
  ["needle", "bottom-nav",           "⭐ THE NEEDLE RULE: the object passes OVER the bars so it can never be trapped under one"],
  ["needle", "top-app-bar",          "⭐ THE NEEDLE RULE: same, on desktop"],
  ["bottom-nav", "top-app-bar",      "the phone rail sits over the header when both are on screen"],
  ["top-app-bar", "discovery-bar",   "the board's filter rail scrolls under the header, not over it"],
];
for (const [above, below, why] of LAWS) {
  ok(`3.x ${above} (${zOf(above)}) > ${below} (${zOf(below)})`,
     Number.isFinite(zOf(above)) && Number.isFinite(zOf(below)) && zOf(above) > zOf(below), why, why);
}

// The trapped families, stated as the invariant rather than as a number: an anchored
// menu travels WITH its bar and cannot outrank it. This is the claim `needle.css`'s
// prose table gets wrong, and it is the one worth pinning.
for (const t of TRAPPED) {
  const why = `an anchored menu is sealed in the bar it hangs from; its declared ${t.declared} buys it nothing`;
  ok(`3.x ${t.id} cannot outrank its own ${t.ancestor}`, zOf(t.id) === zOf(t.ancestor), why, why);
}
// And the consequence a session most often gets wrong: NONE of them clears the Needle.
for (const t of TRAPPED) {
  const why = "the Needle suppresses itself on money surfaces; it does not yield to an anchored menu";
  ok(`3.x ${t.id} (effective ${zOf(t.id)}) is BELOW the Needle (${zOf("needle")}) despite declaring ${t.declared}`,
     zOf(t.id) < zOf("needle"), why, why);
}

// ===========================================================================
console.log("\n§4 · the Tailwind zIndex ladder states SHIPPED truth");
// ===========================================================================
const tw = rd("tailwind.config.ts");
const ladderBlock = /zIndex:\s*\{([\s\S]*?)\n\s{6}\},/.exec(tw);
ok("4.1 the zIndex ladder block is readable", !!ladderBlock,
   "tailwind.config.ts no longer has a `zIndex: { … }` block at the expected indent");
const ladder = new Map<string, number>();
if (ladderBlock) {
  for (const m of ladderBlock[1].matchAll(/^\s*"?([\w-]+)"?:\s*(?:[A-Z_]+\s*,|"(\d+)")/gm)) {
    if (m[2] !== undefined) ladder.set(m[1], Number(m[2]));
  }
  // Keys bound to a shared const (the DRAWER alias) resolve through that const.
  const consts = new Map<string, number>();
  for (const m of tw.matchAll(/^const ([A-Z_]+) = "(\d+)";/gm)) consts.set(m[1], Number(m[2]));
  for (const m of ladderBlock[1].matchAll(/^\s*"?([\w-]+)"?:\s*([A-Z_]+),/gm)) {
    const v = consts.get(m[2]);
    if (v !== undefined) ladder.set(m[1], v);
  }
}
ok("4.2 the ladder has rungs", ladder.size > 0, `${ladder.size} keys`);

// ⭐ Read the four load-bearing rungs OUT OF THE SHIPPING FILES. Comparing the config
// against a literal typed in here would just move the second definition one level up.
const shippedModal = zOf("modal"), shippedToast = zOf("toast"), shippedTooltip = zOf("tooltip"), shippedCeleb = zOf("win-celebration");
const bind = (n: number, key: string, from: string, shipped: number) =>
  ok(`4.${n} ladder.${key} === ${from}`, ladder.get(key) === shipped,
     `ladder says ${ladder.get(key)}, ${from} says ${shipped} — the ladder is a BRIDGE and must never originate a value`,
     `${shipped}`);
bind(3, "modal", "the Modal's own default (modal.tsx)", shippedModal);
bind(4, "toast", "the toast viewport's own z (toast.tsx)", shippedToast);
bind(5, "tooltip", ".kp-tooltip-popover's own z (globals.css)", shippedTooltip);
bind(6, "celebration", "the win celebration's own z (win-celebration.tsx)", shippedCeleb);

// 🔴 THE DEFECT THIS SECTION EXISTS FOR. `z-popover` is the ladder's ONLY consumer,
// and it dresses the admin mobile NAV DRAWER. A nav drawer above a dialog means a
// typed-SEAL settlement confirm can be covered by a hamburger menu.
const amn = src("src/components/admin/admin-mobile-nav.tsx");
const popoverUses = [...amn.matchAll(/(?:^|\s)z-popover(?=[\s"'`]|$)/g)].length;
ok("4.7 the admin nav drawer still dresses itself with the ladder", popoverUses >= 2,
   `found ${popoverUses} \`z-popover\` class uses in admin-mobile-nav.tsx — expected the scrim AND the aside; if it stopped using the ladder, 4.8 is asserting nothing`,
   `${popoverUses} uses (scrim + aside)`);
ok("4.8 the admin nav drawer resolves BELOW the shared Modal",
   (ladder.get("popover") ?? Infinity) < shippedModal,
   `z-popover = ${ladder.get("popover")} vs Modal ${shippedModal} — a nav drawer covering an officer's typed-SEAL confirm is the defect this rung was moved for`,
   `z-popover ${ladder.get("popover")} < Modal ${shippedModal}`);
// `popover` and `drawer` must be ONE value, not two that can drift.
ok("4.9 `popover` is an alias of `drawer`, not a second copy of the rung",
   ladder.get("popover") === ladder.get("drawer"),
   `popover=${ladder.get("popover")} drawer=${ladder.get("drawer")} — bind both to the shared DRAWER const`,
   `both ${ladder.get("drawer")}`);

// ⭐ And the ladder may name only rungs that SHIP. That check needs the full sweep of
// `src/`, so it lands in §6.3 — it is what stops `modal: 1300` / `toast: 1500` /
// `dropdown: 1000` from coming back: a name is cheap; a rung nothing paints at is fiction.

// ===========================================================================
console.log("\n§5 · no non-portaled `position: fixed` inside route content");
// ===========================================================================
// 5.1 — the mechanism is still live: route content really is wrapped in a
//       transform-retaining animation, so a fixed descendant really is mis-anchored.
//       ⛔ Prove the premise before asserting the failure. A check written against an
//       unreachable branch proves nothing.
const shell = src("src/components/layout/app-shell.tsx");
const routeTransition = src("src/components/ui/route-transition.tsx");
const globalsRaw = rd("src/app/globals.css");
ok("5.1a every route's children go through <RouteTransition>",
   /<RouteTransition>\{children\}<\/RouteTransition>/.test(shell),
   "app-shell.tsx no longer wraps children — re-derive whether the trap still exists before asserting it",
   "route content is wrapped");
ok("5.1b RouteTransition really stamps `route-enter`",
   /classList\.add\("route-enter"\)/.test(routeTransition) && /className="route-enter"/.test(routeTransition),
   "route-transition.tsx no longer applies the class the trap depends on",
   "both the SSR class and the client re-trigger");
ok("5.1c `.route-enter` is still a fill-retaining animation (the containing-block trap)",
   /\.route-enter\s*\{[^}]*animation:\s*m-settle-in[^}]*both/.test(globalsRaw),
   "globals.css no longer fills the route animation `both` — the trap may be gone; re-measure before keeping §5",
   "a `both` fill keeps the final keyframe's transform for ever, and a transformed element is the containing block for every fixed descendant");

// 5.2 — the sweep. A full-viewport fixed overlay must portal to document.body, unless
//       its owner is one of the FOUR named root mount points (which render outside
//       <RouteTransition> and therefore have no transformed ancestor).
const ROOT_MOUNTS = new Set([
  "src/app/layout.tsx",                          // renders <AppShell> + <LazyOverlays> as siblings
  "src/components/layout/app-shell.tsx",         // chrome around, never inside, RouteTransition
  "src/components/layout/lazy-overlays.tsx",     // ChatRoot + FirstVisitPrimer, mounted at the root
  "src/components/theme-provider.tsx",           // LocaleChangeOverlay, sibling of the whole shell
]);
/**
 * ⛔ A RATCHET, NOT AN EXCEPTION. Each entry is a real defect that this file does not
 * own; it may only SHRINK. §5.4 asserts every entry is STILL a finding, so a fixed
 * entry left behind FAILS — a ratchet that can rot is a second place to be wrong.
 * ⚠️ `symbol` is written out rather than inferred. The first draft took the first
 * `export function` in the file and got `useAiPhases`, a hook that renders nothing —
 * a locator that finds the wrong thing and then reports confidently about it.
 */
const FIXED_OVERLAY_RATCHET: Array<{ file: string; symbol: string; why: string }> = [
  {
    file: "src/components/ui/ai-progress.tsx",
    symbol: "AiOverlayShell",
    why: "`fixed inset-0` + role=dialog + aria-modal, NO portal, rendered from admin ROUTE files. " +
         "Inside `.route-enter`'s retained transform its `inset: 0` resolves to the page wrapper, not the window. " +
         "Fix: portal it to document.body (what <Modal> does), or adopt <Modal> outright.",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e === "node_modules" || e === ".next") continue; walk(p, out); }
    else if (e.endsWith(".tsx")) out.push(p);
  }
  return out;
}
const tsxFiles = walk(join(ROOT, "src"));
const relOf = (f: string) => relative(ROOT, f).replace(/\\/g, "/");
const bodyCache = new Map<string, string>();
const bodyOf = (r: string) => {
  if (!bodyCache.has(r)) bodyCache.set(r, decomment(readFileSync(join(ROOT, r), "utf8")));
  return bodyCache.get(r)!;
};
/** Every file that renders `<Symbol …>`, excluding the file that defines it. */
const consumersOf = (symbol: string, self: string) =>
  tsxFiles.map(relOf).filter((r) => r !== self && new RegExp(`<${symbol}[\\s/>]`).test(bodyOf(r)));

/**
 * ⭐ ROOT-MOUNTED TRANSITIVELY, not just directly (added 2026-09-01, ADMIN-TABS).
 *
 * §5.2 used to ask only *"are this file's DIRECT consumers all root mounts?"*, which is one hop
 * short of the truth: `ui/toast.tsx` declares a fixed viewport, its only consumer is itself
 * (`<ToastViewport>` inside `<ToastProvider>`), and it is `ToastProvider` that
 * `theme-provider.tsx` mounts at the root. One hop said "no consumers found" and the file read
 * as an unratcheted finding — so the sweep could not be widened without either a filename
 * allowlist or a ratchet entry for a file that is not actually broken. §A1 forbids the first
 * and the second would be debt wearing a rule's clothes.
 *
 * ⛔ THE DEPTH BOUND IS NOT DECORATION: a component can render itself (a recursive tree), and a
 * cycle here would hang the gate. `seen` makes the walk terminate on any graph.
 */
const reachesOnlyRootMounts = (file: string, seen = new Set<string>()): boolean => {
  if (ROOT_MOUNTS.has(file)) return true;
  if (seen.has(file)) return false;            // a cycle proves nothing; it is not a root mount
  seen.add(file);
  const body = bodyOf(file);
  const symbols = [...body.matchAll(/export (?:function|const) (\w+)/g)].map((m) => m[1]);
  const consumers = new Set<string>();
  for (const sym of symbols) for (const c of consumersOf(sym, file)) consumers.add(c);
  if (consumers.size === 0) return false;      // nothing renders it — cannot claim it is safe
  return [...consumers].every((c) => reachesOnlyRootMounts(c, seen));
};
/**
 * The exported component that OWNS a match — the nearest `export function X` /
 * `export const X =` above it. That is the symbol a consumer actually writes, which
 * is the only thing that answers "is this mounted at the root or inside a page?".
 */
function ownerSymbolAt(body: string, index: number): string {
  let best = "", bestAt = -1;
  for (const m of body.matchAll(/export (?:function|const) (\w+)/g)) {
    const at = m.index ?? 0;
    if (at <= index && at > bestAt) { bestAt = at; best = m[1]; }
  }
  return best;
}

type Overlay = { file: string; symbol: string; consumers: string[] };
const fixedOverlays: Overlay[] = [];
for (const f of tsxFiles) {
  const r = relOf(f);
  const body = bodyOf(r);
  // A full-viewport fixed layer: a className carrying both `fixed` and `inset-0`, or
  // an inline style setting position:fixed with inset:0. Anything smaller is anchored
  // chrome, which the transform trap displaces but does not make unreachable.
  /**
   * 🔴 WIDENED 2026-09-01 (ADMIN-TABS) — IT USED TO SEE ONLY FULL-VIEWPORT OVERLAYS, and that
   * blind spot let a real defect through a green gate. `PendingChangesBar` is `fixed inset-x-0
   * bottom-0`: an EDGE-ANCHORED bar spanning the viewport, mis-anchored by the IDENTICAL
   * mechanism this section exists for — `.route-enter`'s retained transform makes it the
   * containing block, so the bar would have sat at the bottom of a 4,000px PAGE and scrolled
   * away, while still computing `position: fixed` and looking perfect in a screenshot of the
   * top. `inset-0` was never the property that mattered; being viewport-anchored is.
   * ⛔ It was only widenable once the consumer walk became TRANSITIVE — before that,
   * `ui/toast.tsx` read as a finding and the rule could not land at zero.
   */
  const hit = /\bfixed\b[^"'`]*\binset-0\b|\binset-0\b[^"'`]*\bfixed\b/.exec(body)
           ?? /\bfixed\b[^"'`]*\binset-x-0\b[^"'`]*\b(?:bottom|top)-0\b/.exec(body)
           ?? /\b(?:bottom|top)-0\b[^"'`]*\binset-x-0\b[^"'`]*\bfixed\b/.exec(body)
           ?? /position:\s*"fixed",\s*inset:\s*0\b/.exec(body);
  if (!hit) continue;
  if (/createPortal\s*\(/.test(body)) continue;   // it escapes to document.body — safe
  const symbol = ownerSymbolAt(body, hit.index ?? 0);
  const consumers = symbol ? consumersOf(symbol, r) : [];
  // Mounted ONLY from the app's four root mount points ⇒ it is a sibling of the shell,
  // never a descendant of <RouteTransition>, so there is no transformed ancestor.
  if (ROOT_MOUNTS.has(r)) continue;
  /* ⭐ TRANSITIVE — see `reachesOnlyRootMounts`. The one-hop version could not see that
     `ui/toast.tsx`'s viewport reaches the root through its own provider. */
  if (reachesOnlyRootMounts(r)) continue;
  fixedOverlays.push({ file: r, symbol, consumers });
}
const ratchetFiles = new Set(FIXED_OVERLAY_RATCHET.map((e) => e.file));
const unratcheted = fixedOverlays.filter((o) => !ratchetFiles.has(o.file));
ok("5.2 no NEW non-portaled viewport-anchored `fixed` overlay inside route content (full-viewport OR edge-anchored)",
   unratcheted.length === 0,
   unratcheted.map((o) => `${o.file} (<${o.symbol}>, rendered by ${o.consumers.join(", ") || "nothing found — check by hand"})`).join(" · ") +
     " — portal it to document.body (see <Modal>), or mount it at the root beside <AppShell>",
   `${fixedOverlays.length} found, all ratcheted`);

// 5.3 — REACHABILITY. A ratcheted entry is only a defect if something in route content
//       actually renders it. Prove it, by name. A check written against an unreachable
//       branch proves nothing, and a ratchet for a phantom is worse than no ratchet.
for (const e of FIXED_OVERLAY_RATCHET) {
  const consumers = consumersOf(e.symbol, e.file);
  const routeConsumers = consumers.filter((r) => r.startsWith("src/app/") && !ROOT_MOUNTS.has(r));
  ok(`5.3 <${e.symbol}> is reachable from route content (the trap is real, not theoretical)`,
     routeConsumers.length > 0,
     `<${e.symbol}> has no route-content consumer any more — DELETE this ratchet entry`,
     `rendered by ${routeConsumers.join(", ")} — ${e.why}`);
}

// 5.4 — the ratchet may only shrink.
for (const e of FIXED_OVERLAY_RATCHET) {
  ok(`5.4 ratchet entry ${e.file} is still a real finding`,
     fixedOverlays.some((o) => o.file === e.file),
     "it portals now (or moved to a root mount) — DELETE this entry from FIXED_OVERLAY_RATCHET; a stale ratchet is a second place to be wrong",
     "still un-portaled");
}

// ===========================================================================
console.log("\n§6 · the closed rung set — no new hand-typed z-index");
// ===========================================================================
/**
 * The root plane (z ≥ 20) is a CLOSED SET. Every value below is owned by a named
 * surface above, so a new literal anywhere in `src/` fails until it is given a name
 * and a place in the ladder. That is the whole anti-decay property: today's ~40
 * hand-typed literals were all added one reasonable-looking line at a time.
 *
 * The local plane (z ≤ 10) is deliberately NOT closed — those numbers order children
 * INSIDE one component's own stacking context (a card watermark, a sticky table head,
 * a chart readout) and never compete with the surfaces above.
 */
const LOCAL_PLANE_MAX = 10;
const KNOWN_ROOT_RUNGS = new Set<number>([
  20, 30, 40, 45, 50, 60, 61, 70, 71, 79, 80,
  100, 120, 130, 150, 200, 1600, 1700, 1800, 2000, 9000, 9999,
]);

const seen = new Map<number, string[]>();
const allFiles: string[] = [];
(function walkAll(dir: string) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e === "node_modules" || e === ".next") continue; walkAll(p); }
    else if (/\.(tsx?|css)$/.test(e)) allFiles.push(p);
  }
})(join(ROOT, "src"));

for (const f of allFiles) {
  const r = relOf(f);
  const body = decomment(readFileSync(f, "utf8"));
  const pats = [
    /(?:^|[\s"'`:{])z-\[(\d+)\]/g,
    /(?:^|[\s"'`:{])z-(\d+)(?=[\s"'`}]|$)/g,
    /zIndex:\s*(\d+)/g,
    /zIndex\s*=\s*\{?(\d+)/g,
    /z-index:\s*(\d+)/g,
  ];
  for (const p of pats) for (const m of body.matchAll(p)) {
    const v = Number(m[1]);
    const at = seen.get(v) ?? [];
    if (!at.includes(r)) at.push(r);
    seen.set(v, at);
  }
}
const rootValues = [...seen.keys()].filter((v) => v > LOCAL_PLANE_MAX).sort((a, b) => a - b);
const unknown = rootValues.filter((v) => !KNOWN_ROOT_RUNGS.has(v));
ok("6.1 every root-plane z in src/ is a named rung",
   unknown.length === 0,
   unknown.map((v) => `z=${v} (${(seen.get(v) ?? []).join(", ")})`).join(" · ") +
     " — name it in ROOT_SURFACES/TRAPPED and add it to KNOWN_ROOT_RUNGS, or reuse an existing rung",
   `${rootValues.length} rungs, all accounted for: ${rootValues.join(", ")}`);
// The reverse direction — a rung the contract names but nothing paints at is fiction,
// which is precisely how the Tailwind ladder rotted.
const orphanRungs = [...KNOWN_ROOT_RUNGS].filter((v) => !seen.has(v)).sort((a, b) => a - b);
ok("6.2 every named rung is actually painted at somewhere in src/",
   orphanRungs.length === 0,
   `${orphanRungs.join(", ")} — delete the rung, it names nothing`,
   "no orphan rungs");

// And the ladder's own values must be shipped rungs (this is what killed 1000/1100/1200/1300/1400/1500).
const ladderFiction = [...ladder.entries()].filter(([, v]) => v > LOCAL_PLANE_MAX && !seen.has(v));
ok("6.3 no Tailwind ladder rung is fiction",
   ladderFiction.length === 0,
   ladderFiction.map(([k, v]) => `${k}: ${v}`).join(", ") + " — nothing in src/ paints at these; the ladder must state shipped truth",
   `${ladder.size} rungs, all shipped`);
// ⚠️ The reverse — "every contract rung must also be a Tailwind key" — is deliberately
// NOT asserted. `50` is withheld on purpose (see the tailwind.config.ts note: four menus
// declare it and not one lands there), and the local plane has no business being a
// utility at all.

// ===========================================================================
console.log("\n§7 · needle.css's prose stack table may only name rungs that ship");
// ===========================================================================
/**
 * ⚠️ The Needle's z-index comment carries an inline table of "50pick's real stack".
 * It is the closest thing this codebase had to a written ladder, and a future session
 * WILL reason from it — so the numbers in it are load-bearing prose. One of them names
 * a rung nothing has ever painted at.
 *
 * ⛔ RATCHET, not exception: `needle.css` is not this file's to edit, and the entry
 * must go the moment the comment is corrected (§7.2).
 */
const needleCss = rd("src/components/layout/needle.css");
const stackTable = /50pick's real stack:([^.]*)\./.exec(needleCss);
ok("7.1 the prose stack table is still where the contract expects it", !!stackTable,
   "needle.css no longer contains `50pick's real stack: …` — re-point this check at the table's new home",
   "found in needle.css");
const PROSE_RATCHET = new Map<number, string>([
  [90, "needle.css names `popovers 90`; nothing in src/ has ever painted at 90. The real popover-ish rungs are 60/61 (menus) and 70/71 (drawers)."],
]);
if (stackTable) {
  const prose = [...stackTable[1].matchAll(/\b(\d{2,4})\b/g)].map((m) => Number(m[1]));
  const fiction = prose.filter((v) => !seen.has(v));
  const newFiction = fiction.filter((v) => !PROSE_RATCHET.has(v));
  ok("7.2 no NEW fictional rung in the prose table", newFiction.length === 0,
     `${newFiction.join(", ")} — the table must quote rungs that ship`,
     `${prose.length} numbers read: ${prose.join(", ")}`);
  for (const [v, why] of PROSE_RATCHET) {
    ok(`7.3 prose ratchet ${v} is still a real finding`, fiction.includes(v),
       "the comment was corrected — DELETE this entry from PROSE_RATCHET", why);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
