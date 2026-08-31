/**
 * focusFirstInvalid — DG-S-06 (DESIGN-GATE-2026-08-28 step 5), §K rule 7d.
 *
 * ⭐ Ali's commission: *"validation takes you to the place where the missing item is."*
 *
 * 🔴 THE REPO HAD ONE HELPER THAT TRIED THIS AND IT WAS WRONG FOUR WAYS. `poll-actions.tsx:197`
 * `scrollToFirstError` is, re-derived at HEAD, the ONLY such helper in `src/`:
 *
 *   ① IT PICKS THE WRONG FIELD. `Object.keys(errs)[0]` is the insertion order of the error
 *     object — the order the VALIDATOR happened to run — not the order the fields appear on
 *     screen. So "take me to the missing item" could scroll PAST the first empty field to a
 *     later one. A helper that takes you to the wrong place is worse than none: it tells you
 *     the form is wrong *there*, and it is not.
 *   ② IT ONLY FINDS `<input>`. `el.querySelector("input")` misses `<textarea>` (22 of them
 *     under `src/app/admin`), `<select>` (41), and every custom control. On those fields it
 *     scrolls and then focuses nothing, so the keyboard is left where it was.
 *   ③ IT REFUSES IN SILENCE. `if (el) { … }` has NO else — §K rule 7d names this exact defect,
 *     because a field on an UNRENDERED TAB returns `null` and the operator is told the form is
 *     invalid while nothing moves and nothing says why. That is the whole reason a tabbed
 *     console needs this helper to be careful.
 *   ④ ITS MOTION IS UNCONDITIONAL. `behavior: "smooth"` plus a magic `setTimeout(…, 300)`
 *     racing it. §M6 — it must still work with motion off, and a fixed delay against an
 *     animation is a race that resolves differently on a slow machine.
 *
 * ⛔ SO THIS RETURNS A RESULT INSTEAD OF FAILING QUIETLY. The caller is handed what happened,
 * and a caller that ignores it is visibly ignoring something.
 */

export type FocusFirstInvalidResult =
  | { ok: true; field: string }
  /** The field exists in the error set but not in the DOM — §K rule 7d's named case. */
  | { ok: false; reason: "not-rendered"; field: string; ownedByTab?: string }
  | { ok: false; reason: "no-errors" }
  | { ok: false; reason: "no-form" };

/**
 * Take the operator to the first invalid field IN DOCUMENT ORDER.
 *
 * @param form  the form (or any container) that owns the fields
 * @param errorFields  the field names that failed — order is IGNORED on purpose, see ①
 */
export function focusFirstInvalid(
  form: HTMLElement | null | undefined,
  errorFields: string[],
): FocusFirstInvalidResult {
  if (!form) return { ok: false, reason: "no-form" };
  const wanted = errorFields.filter(Boolean);
  if (!wanted.length) return { ok: false, reason: "no-errors" };

  /* ⭐ DOCUMENT ORDER, NOT ERROR ORDER. Every candidate is queried in one pass and the DOM
     hands them back in the order they appear, so "first" means first ON SCREEN — which is what
     "the place where the missing item is" means to the person reading it. */
  const all = Array.from(form.querySelectorAll<HTMLElement>("[data-field]"));
  const target = all.find((el) => wanted.includes(el.getAttribute("data-field") || ""));

  if (!target) {
    /* ⛔ NOT SILENT (defect ③). The field is invalid and is not on screen — which, on a tabbed
       console, usually means the panel that owns it is not rendered. If a section rail is
       present, name the tab that owns it so the caller can switch there FIRST and call again;
       §K rule 7d: "resolve which tab owns the first invalid field and switch to it BEFORE
       focusing." */
    const rail = document.querySelector("[data-section-rail]");
    const owner = rail
      ? Array.from(rail.querySelectorAll<HTMLAnchorElement>("a[href]"))
          .find((a) => wanted.some((w) => (a.getAttribute("data-owns-fields") || "").split(/\s+/).includes(w)))
      : null;
    return {
      ok: false,
      reason: "not-rendered",
      field: wanted[0],
      ownedByTab: owner?.getAttribute("href") || undefined,
    };
  }

  /* ⭐ ANY focusable control, not just `<input>` (defect ②). The field wrapper is the anchor;
     the thing that takes focus is whatever control it contains. */
  const control =
    target.matches("input, textarea, select, button, [tabindex]")
      ? target
      : target.querySelector<HTMLElement>("input, textarea, select, button, [tabindex]:not([tabindex='-1'])");

  /* §M6 — honour BOTH the OS setting and the app's own motion tier. The in-app tier is a
     `data-motion` attribute on the root (`globals.css` scopes dozens of rules to
     `[data-motion="reduced"]`), and it is NOT the same thing as the media query: a reader can
     choose reduced motion inside the product without setting it in their OS. A helper that
     checks only `prefers-reduced-motion` obeys half of them. */
  const tier = document.documentElement.getAttribute("data-motion");
  const reduced =
    tier === "reduced" || tier === "minimal" ||
    (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });

  /* ⛔ NO `setTimeout` RACING THE SCROLL (defect ④). Focus is applied immediately with
     `preventScroll`, so the browser does not fight its own smooth scroll and the keyboard
     lands even if the animation is still travelling — or never runs at all. */
  if (control) {
    try { (control as HTMLElement & { focus(o?: FocusOptions): void }).focus({ preventScroll: true }); }
    catch { control.focus(); }
  }

  return { ok: true, field: target.getAttribute("data-field") || wanted[0] };
}
