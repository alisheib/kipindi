/**
 * Mutation anchors for `red:decomment`.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` audits declared anchors
 * without executing the harness, and holds a ceiling of undeclared harnesses that
 * may only shrink. Three inline anchors in `updown-push-red.mjs` rotted silently
 * against rewritten code on 2026-08-22; that is what this shape prevents.
 *
 * Each entry names the CHECK it must redden. "Exited non-zero" is not evidence:
 * the harness requires that exact check to be the one that failed, and requires
 * the gate to have reported reading the mutant tree.
 */
export const MUTATIONS = [
  {
    name: "stripper-reverts-to-block-comments-first",
    why: "E-186 itself: a `/*` inside a `//` line opens a comment nobody wrote.",
    file: "scripts/lib/decomment.mts",
    from: "export function decomment(s: string): string {\n  let out = \"\";",
    to: "export function decomment(s: string): string {\n  return BLIND.blockFirst(s);\n  let out = \"\";",
    check: "1.1 a `/*` inside a `//` line does not swallow the code after it",
  },
  {
    name: "stripper-reverts-to-line-comments-first",
    why: "The E-186 REPAIR: a `//` inside a block comment eats that block's terminator.",
    file: "scripts/lib/decomment.mts",
    from: "export function decomment(s: string): string {\n  let out = \"\";",
    to: "export function decomment(s: string): string {\n  return BLIND.lineFirst(s);\n  let out = \"\";",
    check: "1.2 a `//` inside a block comment does not swallow that block's terminator",
  },
  {
    name: "stripper-loses-the-url-carve-out",
    why: "Without it `https://50pick.tz` is read as a line comment and the rest of the line vanishes.",
    file: "scripts/lib/decomment.mts",
    from: "if (c === \"/\" && d === \"/\" && s[i - 1] !== \":\") {",
    to: "if (c === \"/\" && d === \"/\") {",
    check: "1.3 a `://` URL is not mistaken for a line comment",
  },
  {
    name: "stripper-stops-stripping-altogether",
    why: "⭐ THE CONTROL OF THE CONTROLS. A helper that returns its input satisfies every "
       + "`this survived` check in §1 while asserting nothing. 1.4/1.5 are what stop that.",
    file: "scripts/lib/decomment.mts",
    from: "export function decomment(s: string): string {\n  let out = \"\";",
    to: "export function decomment(s: string): string {\n  return s;\n  let out = \"\";",
    check: "1.4 CONTROL: a line comment really is removed",
  },
  {
    name: "a-gate-re-inlines-a-private-stripper",
    why: "The E-108 shape returning: one helper, copy-pasted, repaired one place at a time.",
    file: "scripts/outcome-display.test.mts",
    from: "import { decomment } from \"./lib/decomment.mts\";",
    to: "import { decomment } from \"./lib/decomment.mts\";\nconst stripComments = (s: string) => s;",
    check: "2.2 no NEW script defines a comment stripper of its own",
  },
  {
    name: "a-ratcheted-stripper-moves-without-the-ratchet-shrinking",
    why: "The ratchet must notice progress too — a stale entry is a list nobody is reading.",
    file: "scripts/token-collision.test.mts",
    from: "const decomment = (s: string) => s.replace(/\\/\\*[\\s\\S]*?\\*\\//g, \"\");",
    to: "const notAStripperAnyMore = (s: string) => s;",
    check: "2.2b the ratchet may only SHRINK",
  },
  {
    name: "pii-in-logs-stops-reading-scripts",
    why: "§5.2 is about a real exposure. If nothing strips comments from scripts/, that claim is idle.",
    file: "scripts/pii-in-logs.test.mts",
    from: "const scriptDir = readdirSync(join(root, \"scripts\"))",
    to: "const scriptDir = readdirSync(join(root, \"src\"))",
    check: "5.1 a guard really does strip comments from scripts/, not only from src/",
  },
  {
    name: "the-hazard-fixture-stops-reproducing-the-bug",
    why: "⭐ THE CONTROL OF THE FIXTURE. If HAZARD_A no longer contains a `/*`, check 1.1 "
       + "passes for the wrong reason. §3.1 exists so that can never be silent.",
    file: "scripts/decomment.test.mts",
    from: "'// an honest, guided \"not available\" state — deep links to /proposals/* are',",
    to: "'// an honest, guided \"not available\" state — deep links to /proposals/x are',",
    check: "3.1 block-comments-first loses the code after a `/*` in a `//` line",
  },
];
