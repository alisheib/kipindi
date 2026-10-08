/**
 * test:icon-sizes — THE GLYPH SIZE SET IS FROZEN, AND IT MUST ONLY EVER SHRINK.
 *
 * Why this guard exists (2026-09-11). `DG-A-19` filed one finding in two halves: two prop
 * spellings for one idea, and a spread of glyph sizes with no per-context constant anywhere.
 *
 *   • The PROP half closed well. `size` was deleted from `GlyphProps`, so reintroducing it is
 *     a compile error — a guard earned by deleting something rather than by writing one.
 *   • The SIZE half was never done at all, and the reason is worth more than the finding:
 *     ⛔ DG-A-19 APPEARED IN NO STEP ROW OF THE DESIGN GATE'S OWN WORK ORDER. The gate closed
 *     45/45 over a population that never contained it. A score computed over a hand-chosen
 *     population cannot see what was left out — the gate was not wrong, it was never asked.
 *
 * ⭐ SO THIS GUARD'S POPULATION IS DISCOVERED, NEVER LISTED. It walks every `.tsx` under
 * `src/`. A guard that enumerates its own files reproduces exactly the blindness that let
 * DG-A-19 survive a programme built to catch it.
 *
 * It asserts two things, and the SECOND is the one that makes it a ratchet rather than a
 * rubber stamp:
 *
 *   1. NO NEW SIZE. Every `s={N}` in the tree is a value that was already in use when this
 *      guard was written. Drift upward goes red.
 *   2. NO SLACK. Every frozen value must still be USED by at least one call site. ⛔ Without
 *      this half a ratchet can only overstate debt: sizes get consolidated away, the allow-list
 *      keeps permitting them, and the guard stays green while quietly licensing a re-entry for
 *      a value nothing renders any more. When this half goes red the fix is to DELETE the value
 *      from FROZEN — the ratchet tightening is the guard working, not the guard failing.
 *
 * ⚠️ WHAT THIS GUARD DOES NOT CLAIM. It does not say the spread is GOOD — 19 sizes is not a
 * scale, it is a history. It says the spread cannot GROW while the collapse is deferred. The
 * per-context constants (`GLYPH`, `plateGlyph`) in `src/components/ui/glyphs.tsx` are the home
 * a future collapse works from.
 *
 * Prove it can fail:  npm run red:icon-sizes         (a glyph size outside the frozen set, planted in memory)
 *                     npm run red:icon-sizes-slack   (a frozen size nothing renders, planted in memory)
 *
 * ⛔ BOTH PROOFS EXIT 0 WHEN THEY WORK (2026-10-08). They used to run the real checks over the planted defect and exit 1 —
 * "red" meant the PROCESS was red — while every other `red:*` in the fleet exits 0 when its guard catches the defect, and
 * `red:all` reads any non-zero exit as a failed harness. So both read FAIL on a healthy main, and printed the ratchet's own
 * instruction for a REAL slack ("delete it from FROZEN") over a value, 41, that was never in FROZEN: a planted message wearing
 * a finding's clothes, which is how a green ratchet came to be read as a red one. Now each proof plants its defect IN MEMORY,
 * runs the very `audit()` the real run prints, and exits 0 only when
 *   (a) the untouched tree audits clean — otherwise a red below proves nothing — and
 *   (b) the audit names EXACTLY the planted defect and nothing else.
 * ⛔ IN-PROCESS BY CONSTRUCTION: this file makes no file-writing call, which is what keeps both proofs in `test:red-anchors`
 * §4's in-process class instead of counting them as undeclared disk harnesses.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The sizes in use on 2026-09-11, measured off the tree — not chosen, not designed.
 * ⛔ Adding a number here is a DESIGN decision and needs a reason in the commit message.
 * Removing one is free, and is what progress looks like.
 */
const FROZEN = new Set([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 96, 150]);

/** Walk every .tsx under src/ — DISCOVERED, never listed. See the header. */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

type Site = { file: string; line: number };
type Source = { file: string; lines: string[] };

const files = walk("src");
/** The population, read once: the real run audits it as it stands, a proof audits it with ONE defect added. */
const population: Source[] = files.map((f) => ({
  file: f.replace(/\\/g, "/"),
  lines: readFileSync(f, "utf8").split(/\r?\n/),
}));

// 3 · THE PLATE THE GLYPH SITS ON HAS ONE HOME TOO.
//
// ⛔ WHY THIS LIVES IN THE SAME GUARD. `IconPlate` was built in stage 9 to end a micro-pattern
// retyped in eight places with four different radii — and its own note SAYS it consolidated
// them. It did not: six of the eight still carried a hand-rolled plate on 2026-09-11, and the
// only two that had moved were the two already using `rounded-control`, i.e. the ones that
// needed no moving. ⭐ A consolidation that migrates exactly the compliant sites leaves the
// defect it was built for completely intact, and its own note then reports success.
//
// There was also a NINTH site the note never listed (`profile/invite`, `rounded-[7px]`) — found
// by searching for the PATTERN, which is the only way a hand-written list of eight could have
// been checked at all. Hence: the population here is the pattern, never a list.
const plateRe = /place-items-center\s+rounded-\[/;

/**
 * EVERYTHING THE RATCHET ASSERTS, AS DATA: one scan of one population against one frozen set. The real run prints it and the
 * red proofs read it, so a proof exercises the same code the guard runs — never a copy of it.
 *   introduced  1 · sizes in use that are not frozen            (NO NEW SIZE)
 *   unused      2 · frozen sizes nothing renders any more        (NO SLACK)
 *   handRolled  3 · icon plates retyped outside `IconPlate`
 */
function audit(pop: Source[], frozen: ReadonlySet<number>) {
  const seen = new Map<number, Site[]>();
  const handRolled: string[] = [];
  for (const { file, lines } of pop) {
    lines.forEach((text, i) => {
      for (const m of text.matchAll(/\bs=\{(\d+)\}/g)) {
        const n = Number(m[1]);
        if (!seen.has(n)) seen.set(n, []);
        seen.get(n)!.push({ file, line: i + 1 });
      }
      // the atom's own prose describes the pattern
      if (!file.endsWith("src/components/ui/icon-plate.tsx") && plateRe.test(text)) handRolled.push(`${file}:${i + 1}`);
    });
  }
  const introduced = [...seen.keys()].filter((n) => !frozen.has(n)).sort((a, b) => a - b);
  const unused = [...frozen].filter((n) => !seen.has(n)).sort((a, b) => a - b);
  return { seen, introduced, unused, handRolled };
}
type Audit = ReturnType<typeof audit>;

const sizeMsg = (n: number, at: Site[]) =>
  `s={${n}} is NOT in the frozen set — ${at.length} site(s), first at ${at[0].file}:${at[0].line}. ` +
  `Use a constant from \`GLYPH\` or \`plateGlyph()\` in src/components/ui/glyphs.tsx. ` +
  `If this size is genuinely a new context, add it to FROZEN and say why in the commit.`;
const slackMsg = (n: number) =>
  `s={${n}} is frozen but NO LONGER USED anywhere — delete it from FROZEN. ` +
  `Leaving it licenses a re-entry for a value nothing renders; a ratchet that only ever ` +
  `permits more than is needed cannot go red for the thing it was built to catch.`;
const plateMsg = (site: string) =>
  `${site} retypes the icon-plate pattern with a one-off radius. Use <IconPlate size={…}> ` +
  `from src/components/ui/icon-plate.tsx — B10.2: each family has ONE radius, and an ` +
  `arbitrary \`rounded-[…]\` is a second definition site.`;

const real = audit(population, FROZEN);

// ⭐ THE CONTROLS. A guard nobody has watched go red is a green light of unknown wiring, so each proof plants ONE defect IN
// MEMORY and runs the very `audit()` above over it. A planted size is a line of SOURCE — `<Glyph s={37} />` in a file that does
// not exist — fed through the same scan the tree goes through, so the proof exercises the regex as well as the comparison.
// ⛔ AND THE TWO HALVES NEED A CONTROL EACH, because they fail for opposite reasons and one passing proves nothing about the
// other: `--prove-red-slack` freezes a value nothing renders; if that stays green, the no-slack half is decorative.
type Plant = {
  flag: string;
  /** which half of the ratchet must catch it */
  half: "size" | "slack";
  n: number;
  what: string;
  population: Source[];
  frozen: ReadonlySet<number>;
};
const PLANTS: Plant[] = [
  {
    flag: "--prove-red", half: "size", n: 37, what: "a glyph size outside the frozen set",
    population: [...population, { file: "src/__prove_red__.tsx", lines: ["export const Planted = () => <Glyph s={37} />;"] }],
    frozen: FROZEN,
  },
  {
    flag: "--prove-red-slack", half: "slack", n: 41, what: "a frozen size nothing renders",
    population,
    frozen: new Set([...FROZEN, 41]),
  },
];

/** What an audit reports, one token per finding — so "exactly the planted defect" is a comparison, not a judgement. */
const defectsOf = (a: Audit) => [
  ...a.introduced.map((n) => `size:${n}`),
  ...a.unused.map((n) => `slack:${n}`),
  ...a.handRolled.map((site) => `plate:${site}`),
];

const proofs = PLANTS.filter((p) => process.argv.includes(p.flag));
if (proofs.length > 0) {
  console.log(`\nICON SIZE RATCHET — red proof: ${proofs.map((p) => p.flag).join(" ")} (planted IN MEMORY; the tree is never touched)\n`);
  const baseline = defectsOf(real);
  const baselineClean = baseline.length === 0;
  console.log(baselineClean
    ? `  ✓ CONTROL  the untouched tree audits clean — ${files.length} .tsx files, ${real.seen.size} distinct sizes, ${FROZEN.size} frozen`
    : `  ✗ CONTROL  the untouched tree is ITSELF red (${baseline.join(", ")}) — a red below would prove nothing, so the proof is void`);
  let caught = 0;
  for (const p of proofs) {
    const a = audit(p.population, p.frozen);
    const got = defectsOf(a);
    const want = `${p.half}:${p.n}`;
    // A plant must be NEW: a value already frozen, or already rendered, introduces nothing for the ratchet to catch.
    const isNew = !FROZEN.has(p.n) && !real.seen.has(p.n);
    const hit = baselineClean && isNew && got.length === 1 && got[0] === want;
    if (hit) caught++;
    console.log(`  ${hit ? "✓ CAUGHT  " : "✗ MISSED  "} ${p.what} — s={${p.n}}`);
    if (hit) {
      console.log(`             the ratchet says: ${p.half === "size" ? sizeMsg(p.n, a.seen.get(p.n)!) : slackMsg(p.n)}`);
    } else if (!isNew) {
      console.log(`             s={${p.n}} is already frozen or rendered by the tree, so planting it proves nothing — pick another value`);
    } else {
      console.log(`             the audit reported [${got.join(", ") || "nothing"}], not exactly [${want}]${got.length === 0 ? " — the detector is broken and its green means nothing" : ""}`);
    }
  }
  console.log(`\n${caught}/${proofs.length} planted ratchet defects caught${baselineClean ? "" : " — ⛔ but the untouched tree is itself red, so the proof is void"}\n`);
  process.exit(caught === proofs.length && baselineClean ? 0 : 1);
}

let failed = 0;
const bad = (m: string) => { failed++; console.log(`  ✗ ${m}`); };
const ok = (m: string) => console.log(`  ✓ ${m}`);

console.log(`\nICON SIZE RATCHET — ${files.length} .tsx files walked, ${real.seen.size} distinct sizes found\n`);

// 1 · NO NEW SIZE.
if (real.introduced.length === 0) {
  ok(`no glyph size outside the frozen set (${FROZEN.size} values)`);
} else {
  for (const n of real.introduced) bad(sizeMsg(n, real.seen.get(n)!));
}

// 2 · NO SLACK — the half that keeps this a ratchet. See the header.
if (real.unused.length === 0) {
  ok("every frozen size is still used — the allow-list carries no slack");
} else {
  for (const n of real.unused) bad(slackMsg(n));
}

// 3 · no hand-rolled plates — see `plateRe` above.
if (real.handRolled.length === 0) {
  ok("no hand-rolled icon plates — `IconPlate` is the only home for the family");
} else {
  for (const site of real.handRolled) bad(plateMsg(site));
}

console.log(
  failed === 0
    ? `\nICON KIT — ${FROZEN.size} frozen sizes, no drift, no slack, no hand-rolled plates.\n`
    : `\n${failed} FAILURE(S) — the glyph kit is drifting again (DG-A-19).\n`,
);
process.exit(failed === 0 ? 0 : 1);
