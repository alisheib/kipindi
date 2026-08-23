/**
 * Mutation anchors for `red:decomment`.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` audits declared anchors
 * without executing the harness, and holds a ceiling of undeclared harnesses that
 * may only shrink. Three inline anchors in `updown-push-red.mjs` rotted silently
 * against rewritten code on 2026-08-22; that is what this shape prevents.
 *
 * ⭐ THIS FILE HAS ALREADY EARNED ITS KEEP. When `E-189` renumbered the gate's
 * checks, four `check:` strings here went stale — and `test:red-anchors` said so
 * before a single false green could ship.
 *
 * Each entry names the CHECK it must redden. "Exited non-zero" is not evidence:
 * the harness requires that exact check to be among the failures, and requires the
 * gate to have reported reading the mutant tree.
 */
const STRIPPER = "scripts/lib/decomment.mts";
const GATE = "scripts/decomment.test.mts";

export const MUTATIONS = [
  {
    name: "stripper-reverts-to-block-comments-first",
    why: "E-186 itself: a `/*` inside a `//` line opens a comment nobody wrote.",
    file: STRIPPER,
    from: "export function decomment(s: string): string {\n  let out = \"\";",
    to: "export function decomment(s: string): string {\n  return BLIND.blockFirst(s);\n  let out = \"\";",
    check: "1.1 a `/*` inside a `//` line does not swallow the code after it",
  },
  {
    name: "stripper-reverts-to-line-comments-first",
    why: "The E-186 REPAIR: a `//` inside a block comment eats that block's terminator.",
    file: STRIPPER,
    from: "export function decomment(s: string): string {\n  let out = \"\";",
    to: "export function decomment(s: string): string {\n  return BLIND.lineFirst(s);\n  let out = \"\";",
    check: "1.2 a `//` inside a block comment does not swallow that block's terminator",
  },
  {
    name: "stripper-loses-string-literal-awareness",
    why: "⭐ E-189 EXACTLY. Without it a `/*` inside a string opens a block that runs to the "
       + "next terminator or to EOF — it flipped a live pii-in-logs verdict.",
    file: STRIPPER,
    from: "if (c === '\"' || c === \"'\") {\n      const j = endOfQuoted(s, i, c);",
    to: "if (c === \"\\u0000\") {\n      const j = endOfQuoted(s, i, c);",
    check: "1.3 a comment delimiter inside a STRING literal opens nothing",
  },
  {
    name: "stripper-loses-template-literal-awareness",
    why: "The other half of E-189 — full-flow-audit.mjs lost 88% of itself to a `/*` in a template.",
    file: STRIPPER,
    from: "if (c === \"`\") {\n      const j = endOfTemplate(s, i);",
    to: "if (c === \"\\u0000\") {\n      const j = endOfTemplate(s, i);",
    check: "1.4 a comment delimiter inside a TEMPLATE literal opens nothing",
  },
  {
    name: "unterminated-block-swallows-to-EOF-again",
    why: "The first scanner did this, and it is how a regex NO-MATCH became a swallow: text "
       + "wrongly removed is a silent false negative, which is the whole failure mode here.",
    file: STRIPPER,
    from: "if (end === -1) { out += s.slice(i); break; }",
    to: "if (end === -1) { i = n; break; }",
    check: "1.5 an UNTERMINATED block comment keeps the rest",
  },
  {
    name: "stripper-loses-the-url-carve-out",
    why: "Without it an unquoted `https://50pick.tz` is read as a line comment.",
    file: STRIPPER,
    from: "if (c === \"/\" && d === \"/\" && s[i - 1] !== \":\") {",
    to: "if (c === \"/\" && d === \"/\") {",
    check: "1.6 an UNQUOTED `://` URL is not mistaken for a line comment",
  },
  {
    name: "stripper-stops-stripping-altogether",
    why: "⭐ THE CONTROL OF THE CONTROLS. A helper that returns its input satisfies every "
       + "`this survived` check in §1 while asserting nothing. 1.7/1.8 are what stop that.",
    file: STRIPPER,
    from: "export function decomment(s: string): string {\n  let out = \"\";",
    to: "export function decomment(s: string): string {\n  return s;\n  let out = \"\";",
    check: "1.7 CONTROL: a line comment really is removed",
  },
  {
    name: "block-comment-newlines-are-destroyed",
    why: "The first scanner emitted nothing for a block, so every line number after one moved "
       + "— while the @returns promised the opposite. A guard reporting a line needs this.",
    file: STRIPPER,
    from: "for (let k = i; k < end + 2; k++) if (s[k] === \"\\n\") out += \"\\n\";",
    to: "",
    check: "1.9 newlines survive",
  },
  {
    name: "a-private-stripper-escapes-the-population-count",
    why: "The ratchet must notice a NEW private stripper. Dropping the shared module from the "
       + "allowlist makes it count as one, which is the same arithmetic a new copy would cause.",
    file: GATE,
    from: "  \"scripts/lib/decomment.mts\",\n  \"scripts/decomment.test.mts\",",
    to: "  \"scripts/decomment.test.mts\",",
    check: "2.1 the private-stripper population may only shrink",
  },
  {
    name: "the-reference-tokeniser-stops-agreeing",
    why: "⭐ §4 is the only check that can catch a whole state the author forgot existed — which "
       + "is what E-189 was. This proves the two implementations really are compared.",
    file: GATE,
    from: "if (c === \"'\") { st = \"sq\"; out += c; i++; continue; }",
    to: "if (c === \"\\u0000\") { st = \"sq\"; out += c; i++; continue; }",
    check: "4.1 the shipped scanner agrees with an independent tokeniser",
  },
  {
    name: "the-hazard-fixture-stops-reproducing-the-bug",
    why: "⭐ THE CONTROL OF THE FIXTURE. If HAZARD_A no longer holds a `/*`, check 1.1 passes for "
       + "the wrong reason. §3.1 exists so that can never be silent.",
    file: GATE,
    from: "'// an honest, guided \"not available\" state — deep links to /proposals/* are',",
    to: "'// an honest, guided \"not available\" state — deep links to /proposals/x are',",
    check: "3.1 block-comments-first loses the code after a `/*` in a `//` line",
  },
  {
    name: "pii-in-logs-stops-reading-scripts",
    why: "§5.2 is about a real exposure. If nothing strips comments from scripts/, that claim is idle.",
    file: "scripts/pii-in-logs.test.mts",
    from: "const scriptDir = readdirSync(join(root, \"scripts\"))",
    to: "const scriptDir = readdirSync(join(root, \"src\"))",
    check: "5.1 a guard really does strip comments from scripts/, not only from src/",
  },
];
