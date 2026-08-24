/**
 * ⭐ ONE DEFINITION OF "THIS CONTROL IS UNREACHABLE" — imported by the seal AND by its RED
 * harness, so a guard and its own proof can never drift apart.
 *
 * ── THE DEFECT THIS EXISTS FOR (E-190) ───────────────────────────────────────────────────
 * Measured on production 2026-08-24, signed in as a QA-fleet player, at 1024px:
 *
 *   EN   button[Account menu]      box 1014..1054  vs vw 1024   → 30px off the screen
 *   SW   button[Arifa (11)]        box  993..1033  vs vw 1024   → the bell, severed
 *   SW   button[Menyu ya akaunti]  box 1049..1089  vs vw 1024   → ENTIRELY past the edge
 *
 * …on `/updown`, `/markets`, `/wallet`, `/results`, `/positions` and `/profile` — every page,
 * because it is the global header. On desktop the account menu is the ONLY path to profile and
 * to sign-out, so in Swahili a player at 1024 could not sign out.
 *
 * ⛔ AND `documentElement.scrollWidth - clientWidth` WAS **0** THROUGHOUT. `body` carries
 * `overflow-x: clip`, so the page does not scroll and the overflow never reaches the document.
 * Every check phrased as "is there horizontal overflow?" is GREEN over a severed control —
 * which is why the rule below is about the CONTROL and its ancestors, never about the document.
 *
 * ── THE TWO EXEMPTIONS, BOTH ALREADY PAID FOR ────────────────────────────────────────────
 * Copied deliberately from `responsive-audit.mjs`, which learned them the expensive way, rather
 * than re-derived — two definitions of "not really a defect" is two chances to disagree:
 *
 *  1 · **The Needle** (`#needle-root`) rests half-tucked against a viewport edge BY DESIGN
 *      (NEEDLE-SPEC §"Presence"); reading it as a clipped control produced 392 false failures
 *      on every surface × width the day it shipped.
 *  2 · **A closed `<details>`** still has layout boxes. `LanguageMenu`'s listbox rows report
 *      194×44 at left −71 with `visibility: visible` and `opacity: 1` while the disclosure is
 *      SHUT — Chrome lays the subtree out and neither paints nor hit-tests it. Reading those
 *      produced ~200 false failures per surface. ⚠️ The OPEN state is not waived by this: it is
 *      asserted separately by `responsive-audit`'s overlay sweep.
 *
 * ⛔ AND IT IS NOT A DOCUMENT-WIDE SWEEP BY ACCIDENT. `scope` defaults to the whole body so the
 * rule reads the same everywhere; callers narrow it only to say WHERE they looked.
 */

/**
 * The page function, exported as a REAL FUNCTION and never as source.
 *
 * 🔴 ⛔ NEVER WRITE THIS AS A TEMPLATE STRING. `page.evaluate("(sel) => {…}", arg)` does NOT
 * call the function — Playwright evaluates a string `pageFunction` strictly as an EXPRESSION,
 * so the expression's VALUE is the function object, which is not serialisable, and the caller
 * receives **`undefined`**. It throws nothing. Measured on playwright 1.59.1, 2026-08-24:
 *
 *     page.evaluate('(x) => 1 + 2', 'body')   →  undefined
 *     page.evaluate('function (x) { return 7 }', 'body')  →  undefined
 *     page.evaluate('1 + 2')                  →  3          ← only a bare expression works
 *
 * ⭐ THAT IS NOT A HYPOTHETICAL: it is E-191. `live-updown-handover-widths.mjs` held its probe
 * as a string and then wrote `ok("nothing clipped", !m || m.clipped.length === 0)` — so `m`
 * was `undefined`, `!m` was `true`, and the clipping check PASSED at every width in every
 * language while measuring nothing at all. A defensive `!m ||` is what makes it invisible: it
 * reads as care and behaves as an unconditional pass.
 *
 * Passed as a function, Playwright serialises the source itself and calls it. Same code, and it
 * cannot silently evaluate to nothing.
 *
 * @param {string} scopeSel a CSS selector to narrow the sweep; falls back to `document.body`.
 * @returns {string[]} one readable line per control a player cannot reach.
 */
export const CLIP_PROBE = (scopeSel) => {
  const vw = window.innerWidth;
  const scope = document.querySelector(scopeSel) || document.body;

  // A control is REACHABLE if some ancestor can be scrolled sideways to bring it into view.
  const hasScrollableAncestor = (el) => {
    let a = el.parentElement;
    while (a && a !== document.documentElement) {
      const cs = getComputedStyle(a);
      if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
      a = a.parentElement;
    }
    return false;
  };
  const inNeedle = (el) => !!el.closest?.("#needle-root");
  const inClosedDisclosure = (el) => !!el.closest?.("details:not([open])");

  const out = [];
  for (const el of scope.querySelectorAll('button, a[href], [role="button"], [role="menuitem"], input, select')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (inNeedle(el) || inClosedDisclosure(el)) continue;
    if ((r.right > vw + 2 || r.left < -2) && !hasScrollableAncestor(el)) {
      const name = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
      out.push(`${el.tagName.toLowerCase()}[${name}] ${Math.round(r.left)}..${Math.round(r.right)}>vw${vw}`);
    }
  }
  return out;
};

/**
 * The controls this page severs at the current viewport, as strings a human can read.
 * @param {import("playwright").Page} page
 * @param {string} [scopeSel] a CSS selector to narrow the sweep; defaults to the whole page.
 */
export async function clippedControls(page, scopeSel = "body") {
  return page.evaluate(CLIP_PROBE, scopeSel);
}

/**
 * ⭐ THE BAND THIS DEFECT LIVES IN, named once so nobody has to rediscover it.
 *
 * `lg` (1024) is where the desktop nav turns on and `xl` (1280) is where the bar has room
 * again — so 1024 is the tightest width the signed-in header is ever asked to fit, and it is
 * the width every existing sweep stepped over: `landmark-seal` ran 360/768/1280 and
 * `responsive-audit` reaches 1024 but signs in through `/auth/demo`, which 404s in any
 * production build (E-187) — so the two controls that clip there, the bell and the avatar, are
 * exactly the two the header renders ONLY when signed in.
 */
export const LG_XL_BAND = 1024;
