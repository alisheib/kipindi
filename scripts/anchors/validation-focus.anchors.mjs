/**
 * RED anchors for `npm run red:validation-focus` — the control for DG-S-05 + DG-S-06's
 * `test:validation-focus` (§K rule 7d).
 *
 * ⛔ EVERY CASE MUST MAKE THE GATE EXIT NON-ZERO AND FAIL ON ITS OWN NAMED ASSERTION. "It went
 * red" is not a control — a defect caught for the wrong reason is reported as WRONG REASON.
 *
 * ⭐ ALL THREE ARE SILENT DEFECTS, WHICH IS WHY THEY ARE THE CASES. None of them throws, none
 * fails a typecheck, and each leaves a helper that still looks like it works:
 *   · `address-dropped` — the refusal stops carrying a field, so every focus call downstream
 *     quietly has nothing to aim at, and validation goes back to a toast.
 *   · `error-order` — the helper still focuses A field, just not the FIRST one on screen. It
 *     tells the operator the form is wrong somewhere it is not.
 *   · `silent-refusal` — the not-rendered branch disappears, which is exactly the defect §K
 *     rule 7d names: an invalid field on an unrendered tab, nothing moving, nothing said.
 */
export const MUTATIONS = [
  {
    name: "⭐ THE ADDRESS IS DROPPED · a refusal can no longer name its field",
    file: "src/lib/server/field-error.ts",
    expect: "1.3 the failure type carries an optional `field`",
    from: `  field?: string;`,
    to: `  /* removed */`,
  },
  {
    name: "⭐ ERROR ORDER · it focuses a field, just not the first one on screen",
    file: "src/lib/client/focus-first-invalid.ts",
    expect: "2.2 it picks by DOCUMENT order, not error order",
    from: `  const all = Array.from(form.querySelectorAll<HTMLElement>("[data-field]"));`,
    to: `  const all = wanted.map((w) => form.querySelector<HTMLElement>("[data-field='" + w + "']")).filter(Boolean) as HTMLElement[];`,
  },
  {
    name: "⭐ SILENT REFUSAL · an unrendered invalid field stops being reported",
    file: "src/lib/client/focus-first-invalid.ts",
    expect: "2.4 it REFUSES LOUDLY when the field is not rendered",
    from: `      reason: "not-rendered",`,
    to: `      reason: "no-errors" as never,`,
  },
];
