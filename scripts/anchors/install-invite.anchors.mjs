/**
 * Mutation anchors for `red:install-invite` — §3, the home-screen invitation.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` re-resolves every anchor below on every
 * run WITHOUT executing the harness, so an anchor that rots against edited source is caught
 * statically instead of surfacing later as a phantom catch.
 *
 * ── ⭐ WHAT THESE ARE AIMED AT
 * Every mutation is a plausible "simplification" rather than an invented defect, because that is
 * how this feature will actually break: somebody removes a check they cannot see the point of.
 * The two that matter most are the iOS pair — a dead button on a platform with no programmatic
 * install, and an invitation shown inside the installed app — because neither is visible from a
 * desktop dev browser, which is exactly where this code will be read.
 */
const INV = "src/components/pwa/install-invite.tsx";
const SHELL = "src/components/layout/app-shell.tsx";
const MANIFEST = "public/manifest.json";
const SURFACES = "src/lib/surfaces.ts";

export const MUTATIONS = [
  {
    name: "ios-loses-its-already-installed-check",
    why: "⛔ THE CASE A DESKTOP DEV BROWSER NEVER SHOWS YOU. `matchMedia(\"(display-mode: standalone)\")` "
       + "is left in place — it is the check a reader trusts — and only the iOS-only "
       + "`navigator.standalone` goes. iOS Safari does not report standalone display-mode, so a "
       + "player already inside the installed app is invited to install it, on the one platform "
       + "where the invitation is a set of instructions they have already followed.",
    file: INV,
    from: `    if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;`,
    to: ``,
    check: "2.2 ⛔ navigator.standalone is checked too — it is the ONLY signal on iOS",
  },
  {
    name: "the-cta-renders-without-the-event",
    why: "🔴 A BUTTON THAT DOES NOTHING, ON iOS. The `mode === \"prompt\"` guard goes, so the CTA "
       + "renders everywhere — and on iOS `deferred` is always null, so `install()` returns "
       + "immediately and the tap does nothing at all. ⛔ A control that looks like it installs "
       + "and does not is worse than the instructions it replaced.",
    file: INV,
    from: `            {mode === "prompt" && (`,
    to: `            {true && (`,
    check: "3.3 ⛔ the CTA renders ONLY when the event actually arrived",
  },
  {
    name: "it-can-sit-over-the-bet-button",
    why: "🔴 ALI'S EXPLICIT RULE, REMOVED. The money-commit gate goes from the render, so the card "
       + "can anchor itself over the gold confirm on a poll bet card or the one-click commit on an "
       + "Up & Down round. ⛔ This repo has ALREADY shipped a WhatsApp FAB on top of a CTA and only "
       + "LOOKING found it, which is why this is a guard and not a code comment.",
    file: INV,
    from: `  if (installed || !visible || isCommitSurface(pathname)) return null;`,
    to: `  if (installed || !visible) return null;`,
    check: "5.1 the money-commit gate is applied at RENDER, so a soft navigation removes it",
  },
  {
    name: "it-asks-on-a-first-ever-visit",
    why: "The single most disturbing version of this feature: a stranger's first ten seconds on the "
       + "site interrupted by a request to install an app they have not yet decided they want. "
       + "⭐ `MIN_VISITS` is the whole difference between an invitation and a pop-up.",
    file: INV,
    from: `const MIN_VISITS = 2;`,
    to: `const MIN_VISITS = 1;`,
    check: "4.1 ⛔ never on a first-ever visit",
  },
  {
    name: "the-copy-gets-truncated",
    why: "⛔ ALI'S CROSS-CUTTING RULE, BREACHED IN THE MOST ORDINARY WAY: somebody adds `truncate` to "
       + "make a card look tidier. Swahili is the longest of the three languages and 360 is the "
       + "narrowest width, so this is precisely where the platform's worst clipping has always been.",
    file: INV,
    from: `          <p className="mt-1 text-label leading-snug text-text-muted">`,
    to: `          <p className="mt-1 text-label leading-snug text-text-muted truncate">`,
    check: "6.1 ⛔ no truncate / line-clamp / nowrap anywhere in the card — the box grows, the words stay whole",
  },
  {
    name: "a-storage-read-goes-unguarded",
    why: "⛔ AND THIS ONE TAKES THE WHOLE SIGNED-IN APP DOWN, not just the invitation. The component "
       + "mounts in the ROOT SHELL, and a private window or blocked site data throws on the FIRST "
       + "`localStorage` touch — so an unguarded read routes every page to the error boundary. "
       + "`reality-check.tsx` records exactly this failure for `sessionStorage`.",
    file: INV,
    from: `  try { return window.localStorage.getItem(key); } catch { return null; }`,
    to: `  return window.localStorage.getItem(key);`,
    check: "7.1 ⛔ every localStorage access sits inside a try/catch",
  },
  {
    name: "the-invitation-is-imported-and-never-rendered",
    why: "⚠️ ASSERT THE MOUNT, NOT THE IMPORT. The lazy import stays, the component stays, the copy "
       + "stays in three languages — and nothing renders it. That is E-226, E-227, E-232 and "
       + "E-224's DAL filter, and it is the single most repeated defect on this platform.",
    file: SHELL,
    from: `      <Suspense fallback={null}><LazyInstallInvite /></Suspense>`,
    to: ``,
    check: "8.2 ⛔ it is RENDERED by the shell, not merely imported",
  },
  {
    name: "the-manifest-names-an-icon-that-is-not-there",
    why: "⭐ THE CHECK A JSON REVIEW CANNOT DO. The manifest still parses, still declares a 192 and a "
       + "512, and still passes every shape test — and the file it points at does not exist, so the "
       + "installed app carries a broken mark. Nothing in a build catches a bad PATH.",
    file: MANIFEST,
    from: `      "src": "/icons/icon-192.png",`,
    to: `      "src": "/icons/icon-192-missing.png",`,
    check: "1.6 the declared icon exists on disk",
  },
  {
    name: "two-definitions-of-a-money-surface",
    why: "⛔ THE DRIFT THIS REPO HAS FILED FOUR TIMES. `isMoneySurface` is exported from one home and "
       + "the Needle imports it; this puts the regex back in the Needle's own file, so the two can "
       + "disagree about where a fidget — or an invitation — may appear.",
    file: SURFACES,
    from: `export function isMoneySurface(path: string | null): boolean {`,
    to: `function isMoneySurface(path: string | null): boolean {`,
    check: "5.2 ⭐ ONE definition of a money surface",
  },
];
