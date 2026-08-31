/**
 * RED anchors for `npm run red:cn-collision` — the control for `test:cn-collision`.
 *
 * ⭐ ONE CASE, AND IT IS THE REAL DEFECT REPLAYED. Making `extendTailwindMerge(...)` hand back
 * the BARE `twMerge` is exactly the state the platform shipped in until 2026-08-31:
 * tailwind-merge stops knowing this repo's fontSize keys, files every unrecognised `text-*` as
 * a text COLOUR, and the later class of a size/colour pair silently deletes the earlier. If the
 * gate does not go red on that, it would not have caught the bug it exists for — and a gate
 * that cannot catch its own founding defect is decoration.
 *
 * ⛔ AND THE MUTATION DOUBLES AS THE CENSUS: its output names every call site that was losing a
 * class before the fix. That is the list of rendered changes the handover says nobody has
 * looked at — re-derived from the code, not quoted from a probe that never travelled.
 *
 * ⚠️ ONE ANCHOR, ON THE IMPORT, deliberately: shadowing the factory is a single edit, whereas
 * rewriting the `const twMerge = …` assignment would need a second anchor to fix the import and
 * a two-part mutation this harness does not model. A control with fewer moving parts is a
 * control that keeps working.
 */
export const MUTATIONS = [
  {
    name: "⭐ THE REAL DEFECT REPLAYED · cn() falls back to a bare twMerge that does not know this repo's fontSize keys",
    file: "src/lib/utils.ts",
    expect: "lose a class that nothing later replaces",
    from: `import { extendTailwindMerge } from "tailwind-merge";`,
    to: `import { extendTailwindMerge as _ext, twMerge as _bare } from "tailwind-merge";\nconst extendTailwindMerge = (_cfg: Parameters<typeof _ext>[0]) => _bare;`,
  },
];
