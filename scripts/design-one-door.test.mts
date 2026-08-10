/**
 * test:design-one-door — THE DESIGN RULEBOOK HAS EXACTLY ONE FRONT DOOR.
 *
 * Why this guard exists (2026-08-08). Nine files had grown a claim to be the place a
 * session starts for anything visual: `design-system/README.md` ("start here for anything
 * visual"), `00-START-HERE.md` ("files outside this archive have no authority" — which,
 * read literally, voided DESIGN_AUTHORITY.md), `11-material/README.md` ("read this before
 * anything else"), `RULES.md` ("the laws"), and CLAUDE.md pointing at a different one
 * again. They formed a cycle. Three of them disagreed with the shipped code on values a
 * session would have pasted straight into globals.css — the canvas lightness, `--text-faint`
 * at a figure that FAILS AA, and easing tokens with durations baked in, the exact shape
 * that once zeroed transitions platform-wide.
 *
 * A maze of rulebooks is not a documentation problem, it is a correctness problem: the
 * session reads whichever door it found first. So this is a ratchet, not a style note.
 *
 * It asserts three things:
 *   1. DESIGN_AUTHORITY.md declares itself the only rulebook, and still carries the
 *      filing law (§0) — the section that says where a new design fact goes.
 *   2. No OTHER design doc claims to be the entry point / rule book / the laws.
 *   3. Every design doc that is record carries a "RECORD, NOT RULE" banner, so a reader
 *      who lands in the middle of one knows what they are holding.
 */
import { readFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";

const AUTHORITY = "docs/DESIGN_AUTHORITY.md";

/** Phrases that claim primacy. Case-insensitive. */
const DOOR_CLAIMS: RegExp[] = [
  /start here for anything visual/i,
  /\bthis is the entry point\b/i,
  /^#\s.*—\s*the rule ?book\s*$/im,
  /have no authority/i,
  /read this before anything else(?! in the folder)/i,
];

let failed = 0;
const ok = (m: string) => console.log(`  ok   ${m}`);
const bad = (m: string) => { console.log(`  FAIL ${m}`); failed++; };

// ── 1 · the one door is the one door ────────────────────────────────────────
const auth = readFileSync(AUTHORITY, "utf8");
if (/THIS IS THE ONLY DESIGN RULEBOOK/i.test(auth)) ok("DESIGN_AUTHORITY declares itself the only rulebook");
else bad("DESIGN_AUTHORITY no longer declares itself the only rulebook");

if (/##\s*§0\s*—\s*THE FILING LAW/i.test(auth)) ok("§0 filing law present (where a new design fact goes)");
else bad("§0 filing law MISSING — without it the next stray design doc has nowhere assigned, and the maze rebuilds");

for (const section of ["## T —", "## S —", "## A —", "## C —", "## H —", "## E —", "## K —", "## M —"]) {
  if (auth.includes(section)) ok(`rulebook keeps section ${section.replace(" —", "")}`);
  else bad(`rulebook LOST section ${section.replace(" —", "")} — a rule family vanished`);
}

// ── 2 · nobody else claims the door ─────────────────────────────────────────
// 🔴 NORMALISE THE SEPARATOR BEFORE COMPARING — this gate was RED on Windows and GREEN on
// Linux for the same commit, which is the worst failure a ratchet can have: it makes the
// verdict a property of the machine rather than the repo. `globSync` yields
// `docs\DESIGN_AUTHORITY.md` on Windows, so `p !== AUTHORITY` (written with a forward
// slash) never matched, the rulebook was never excluded from its OWN competing-doors
// scan, and it failed on the three front-door phrases it is *supposed* to be the only
// file allowed to carry. Same lesson as `test:updown-push`'s CRLF literal: a guard must
// compare normalised values, or it is judging the filesystem, not the code.
const designDocs = globSync("docs/**/*.md", { exclude: (p) => p.includes("node_modules") })
  .map((p) => p.replace(/\\/g, "/"))
  .filter((p) => p !== AUTHORITY)
  .filter((p) => /design/i.test(p));

for (const p of designDocs) {
  const body = readFileSync(p, "utf8");
  // A struck/quoted historical copy is fine — it must be inside an HTML comment or
  // marked superseded. We only reject a LIVE claim.
  const live = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^.*(?:SUPERSEDED|RECORD, NOT RULE|struck|~~).*$/gim, "");
  for (const re of DOOR_CLAIMS) {
    if (re.test(live)) bad(`${p} still claims to be a front door (${re})`);
  }
}
ok(`${designDocs.length} design doc(s) scanned for competing front-door claims`);

// ── 3 · record is labelled as record ────────────────────────────────────────
const MUST_BE_LABELLED = [
  "docs/design-system/README.md",
  "docs/design-system/v2-2026-07-27/00-START-HERE.md",
  "docs/design-system/v2-2026-07-27/01-foundations/colour.md",
  "docs/design-system/v2-2026-07-27/01-foundations/elevation-motion.md",
  "docs/design-system/v2-2026-07-27/01-foundations/typography.md",
  "docs/design-system/v2-2026-07-27/01-foundations/spacing-shape.md",
  "docs/design-system/v2-2026-07-27/06-patterns-and-rules/RULES.md",
  "docs/design-system/v2-2026-07-27/11-material/README.md",
];
for (const p of MUST_BE_LABELLED) {
  if (!existsSync(p)) { ok(`${p} — gone (fine; deletion is a valid end state)`); continue; }
  const body = readFileSync(p, "utf8").slice(0, 1400);
  if (/RECORD, NOT RULE|SUPERSEDED/i.test(body)) ok(`${p} labelled as record`);
  else bad(`${p} is NOT labelled — a reader landing here cannot tell rule from record`);
}

// ── 4 · the dangerous block stays dead ──────────────────────────────────────
const em = "docs/design-system/v2-2026-07-27/01-foundations/elevation-motion.md";
if (existsSync(em)) {
  const body = readFileSync(em, "utf8");
  if (/--ease-micro\s+100ms\s+cubic-bezier/.test(body.replace(/^>.*$/gm, ""))) {
    bad("elevation-motion.md publishes duration-bearing easing tokens again (the platform-wide motion outage, DESIGN_AUTHORITY B5)");
  } else ok("the duration-bearing easing block stays deleted (B5)");
}

console.log(failed === 0
  ? `\nONE DOOR — design rulebook is singular and labelled.\n`
  : `\n${failed} FAILURE(S) — the design maze is growing back.\n`);
process.exit(failed === 0 ? 0 : 1);
