/**
 * test:section-rail — DESIGN_AUTHORITY §K rule 7g.
 *
 *   "Every `<nav>` that maps a rail of destinations states which one is current."
 *
 * ⭐ KEYED ON THE CONTROL, NEVER ON A SPELLING — and 7g records two shallower keys that were
 * MEASURED failing, which is why neither is used here:
 *   · Keyed on `semantics="tab"`: `FilterPill`'s `semantics` DEFAULTS to `"tab"`, so a rail
 *     that never spells the prop still emits `aria-current="page"`. That key reported HITS 4,
 *     convicting three innocent filter rails.
 *   · Keyed on the URL spelling `?tab=`: it reported HITS 0 OVER THE LIVE DEFECT, because that
 *     rail computed its class into a `const` above the tag, so no state token sat inside the
 *     tag body — and it would have emptied silently the day someone spelled it `?section=`.
 * Both are §A1's named disease: a guard reading the SPELLING of a value instead of the value.
 * So the subject is the RENDERED aria: a rail in population either emits `aria-current`, or it
 * announces nothing and is a finding.
 *
 * ⛔ WHAT THIS GATE DOES NOT PROVE, said out loud (7g's own clause): it proves the rail SAYS
 * which section is current. It cannot prove 7a (when a page earns tabs), 7d (what may never go
 * behind a click) or 7e (the do-not-tab list). Those ship as REVIEWED rules. Claiming a gate
 * over them would be a gate one level too shallow, which is indistinguishable from no gate.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
/**
 * ⚠️ `KP_SRC` exists so `red:section-rail` can point this gate at a MUTATED COPY of the tree
 * and prove the gate moves. ⛔ It is never set in normal use, and the control never writes to
 * the real `src/`.
 */
const SRC = process.env.KP_SRC || join(here, "..", "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (e.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Comments stripped FIRST, so prose cannot count as code (7g's population clause).
 * ⚠️ Deliberately a lexer, not a regex sweep. Source files here are full of comments that
 * quote JSX verbatim — including `<nav aria-current=…>` inside explanations of past defects —
 * so prose must not count as code. Strings and template literals are skipped properly, which
 * a regex sweep cannot do: a quoted double-slash would otherwise open a comment that runs to
 * end of line and swallow real code after it.
 *
 * ⛔ AND THIS COMMENT ITSELF MUST NOT SPELL A BLOCK-COMMENT TERMINATOR. The first draft did,
 * inside backticks, while explaining this very function — and esbuild closed the comment
 * there and died on "unterminated string literal" 40 lines lower, pointing at innocent code.
 * A delimiter written in prose ABOUT code is still a delimiter.
 */
function stripComments(s: string): string {
  let out = "";
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    // ⛔ COMMENTS ARE BLANKED, NOT DELETED — every newline inside one is KEPT. The first draft
    // deleted them, so the stripped text had fewer lines than the file and every line number
    // this gate printed was shifted earlier: it reported `notifications/page.tsx:120` over a
    // helper function and `results/page.tsx:307` over a `<p>`. A gate that names a file:line
    // the reader cannot find teaches them to distrust the gate, not to fix the defect — and in
    // a file whose comments outweigh its code, the drift is tens of lines.
    if (c === "/" && d === "/") { while (i < n && s[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(s[i] === "*" && s[i + 1] === "/")) { if (s[i] === "\n") out += "\n"; i++; }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c; out += c; i++;
      while (i < n) {
        if (s[i] === "\\") { out += s[i] + (s[i + 1] ?? ""); i += 2; continue; }
        if (s[i] === q) { out += s[i]; i++; break; }
        out += s[i]; i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** Every `<nav …>` … `</nav>` block. Navs do not nest in this product; asserted below. */
function navBlocks(src: string): { block: string; line: number }[] {
  const out: { block: string; line: number }[] = [];
  const re = /<nav\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index;
    const end = src.indexOf("</nav>", start);
    if (end === -1) continue;
    const block = src.slice(start, end + 6);
    if (/<nav\b/.test(block.slice(4))) continue; // nested — skip rather than mis-attribute
    out.push({ block, line: src.slice(0, start).split("\n").length });
  }
  return out;
}

/**
 * 🔴 A TOGGLE RAIL CAN DECLARE ITSELF ONE LEVEL UP, AND THE FIRST DRAFT COULD NOT SEE THAT.
 *
 * `discovery-bar.tsx` defines a local `Chip` at `:76` whose whole body is
 * `<FilterPill {...rest} on={pressed} semantics="toggle" …/>` (`:90`), and its three `<nav>`s
 * then map `<Chip href=… pressed=…>`. Looking for `semantics="toggle"` INSIDE the nav block
 * found nothing, so the gate convicted all three — rails that emit `aria-pressed` exactly as
 * §K rule 7b requires, and for which `aria-current` would be the lie the law names.
 *
 * ⭐ So the file's own wrappers are resolved first: any local component whose body sets
 * `semantics="toggle"` is collected by NAME, and a rail that maps one is a toggle rail.
 * ⚠️ ONE level of indirection, deliberately, and stated rather than silently assumed: a
 * wrapper of a wrapper would still be missed. That is a known edge with zero instances at
 * HEAD, and it fails toward a FINDING (a false positive a reader can dismiss) rather than
 * toward silence — which is the direction a gate should fail in.
 */
function toggleWrappers(src: string): string[] {
  const names: string[] = [];
  const re = /(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*=\s*(?:\(|function))/g;
  const starts: { name: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) starts.push({ name: m[1] ?? m[2], at: m.index });
  for (let i = 0; i < starts.length; i++) {
    const body = src.slice(starts[i].at, starts[i + 1]?.at ?? src.length);
    if (/semantics\s*=\s*["'{]?\s*toggle/.test(body)) names.push(starts[i].name);
  }
  return names;
}

const files = walk(SRC);
type Row = { file: string; line: number; block: string };
const population: Row[] = [];

for (const f of files) {
  const src = stripComments(readFileSync(f, "utf8"));
  const wrappers = toggleWrappers(src);
  for (const { block, line } of navBlocks(src)) {
    /**
     * A RAIL OF DESTINATIONS: it maps a list, and what it maps NAVIGATES.
     *
     * 🔴 `href` IS THE DISCRIMINATOR, AND THE FIRST DRAFT GOT THIS WRONG IN EXACTLY THE WAY
     * 7g WARNS ABOUT. Keying "destination" on the TAG (`<a>` / `<Link>` / `<FilterPill>`)
     * reported **12 hits against 7g's predicted 1**, convicting nine innocent FILTER rails —
     * `results/page.tsx:307,326,346`, `notifications`, `positions`, `profile/activity`,
     * `updown-board-tabs` and the rest. A `<FilterPill>` is either kind of rail depending on
     * whether its option owns a URL, so the tag cannot tell them apart.
     * ⭐ `filter-pill.tsx:38-48` states the law this key implements: an option that NAVIGATES
     * takes `aria-current="page"`; one that changes in-page view state takes `aria-pressed`,
     * and ⛔ one semantic imposed on both is a lie about the control. A rail with no `href`
     * anywhere in it is the second kind, and `aria-current` would be wrong there — so it is
     * out of population rather than a finding.
     */
    const maps = /\.map\s*\(/.test(block);
    const navigates = /\bhref\s*[=:]/.test(block);
    // ⛔ A TOGGLE RAIL IS NOT A RAIL OF DESTINATIONS. `semantics="toggle"` emits `aria-pressed`
    // (filter-pill.tsx:193) for options that change in-page view state — `/markets`' discovery
    // chips are the case the law names. `aria-current` would be WRONG there, so such a rail is
    // out of population rather than a finding: 7b says one semantic imposed on both is a lie
    // about the control.
    const isToggleRail =
      /semantics\s*=\s*["'{]?\s*toggle/.test(block) ||
      wrappers.some((w) => new RegExp(`<${w}\\b`).test(block));
    if (maps && navigates && !isToggleRail) {
      population.push({ file: f.slice(SRC.length + 1).replace(/\\/g, "/"), line, block });
    }
  }
}

/**
 * A rail in population must STATE which destination is current — but it may state it through
 * a PRIMITIVE rather than in its own tag body, and a gate that cannot see that is keyed on a
 * spelling.
 *
 * 🔴 THIS IS 7g's NAMED DISEASE, AND THE FIRST DRAFT HAD IT. Grepping the nav block for the
 * literal `aria-current` reported **15 offenders against 7g's predicted 1**, convicting every
 * rail built out of `<FilterPill>` — `results/page.tsx`, `profile/activity` (which even marks
 * itself `data-filter-rail`), `notifications`, `positions`, `discovery-bar` and the rest. None
 * of them is a defect: `filter-pill.tsx:141` DEFAULTS `semantics = "tab"` and `:192` emits
 * `aria-current="page"` when selected, so the announcement is real and simply not written at
 * the call site. §A1: a guard reading the SPELLING of a value instead of the value that lands
 * on the glass.
 *
 * ⭐ So delegation is modelled EXPLICITLY, each entry naming the file:line that makes it true,
 * so the model can be audited instead of trusted. ⛔ If a primitive changes its default, this
 * list is wrong and must move with it — that is why each row cites the line it depends on.
 */
const DELEGATES: { why: string; test: (b: string) => boolean }[] = [
  {
    why: "<FilterPill> · semantics defaults to \"tab\" (filter-pill.tsx:141) and emits aria-current=\"page\" when selected (:192)",
    test: (b) => /<FilterPill\b/.test(b),
  },
];

const announces = (b: string) => /aria-current/.test(b) || DELEGATES.some((d) => d.test(b));
const offenders = population.filter((r) => !announces(r.block));

console.log("──────────────────────────────────────────────────────────────────────");
console.log("§K rule 7g · SECTION RAIL — every rail of destinations names the current one");
console.log("──────────────────────────────────────────────────────────────────────");
console.log(`  .tsx files scanned   ${files.length}`);
console.log(`  <nav> rails in population ${population.length}`);
for (const r of population) {
  console.log(`     ${/aria-current/.test(r.block) ? "·" : "✗"} ${r.file}:${r.line}`);
}

/**
 * ⛔ THE VACUITY FLOOR — the gate asserts its own population and exits non-zero below it, so a
 * rename, a refactor away from `<nav>`, or a broken regex empties the subject set LOUDLY
 * instead of passing. A coverage gate whose denominator can silently reach zero is not a gate.
 *
 * 🔴 RE-DERIVED 2026-08-31 AT **15**, AND IT IS NOT 7g'S RECORDED 17 — for two separate
 * reasons, both worth stating so the next session does not "restore" the number.
 *
 * ① THE CONVERSION MOVED THE DENOMINATOR, which 7g's control clause did not expect. 7g
 *    measured 17 with `/admin/players/[id]`'s hand-rolled `<nav>` still in the tree and
 *    predicted its single hit would "land at 0 the moment that rail is converted". It did —
 *    but converting DELETED a `<nav>` from that page rather than adding an `aria-current` to
 *    it, because the rail now renders inside `ui/tabs.tsx`, whose own `<nav>` was already
 *    counted. The offender and one member of the denominator left together.
 * ② THIS GATE'S POPULATION IS NARROWER THAN 7g's PROSE, on purpose. 7g describes "a rail of
 *    `<a>` / `<Link>` / `<FilterPill>` destinations"; keyed on the tag that admits TOGGLE
 *    rails, whose options change in-page view state and correctly emit `aria-pressed`. Those
 *    are excluded here (see `isToggleRail`), because `aria-current` on one would be the lie
 *    §K rule 7b names. Measured: `discovery-bar.tsx`'s three rails alone account for it.
 *
 * ⭐ 487 `.tsx` files scanned, which is 7g's own recorded figure, so the SCAN is the same size
 * even though the SUBJECT SET is not — the difference is a deliberate narrowing, not a blind
 * spot. ⛔ This constant may only shrink, and only in the same commit as the rail it loses.
 */
const FLOOR = 15;

let bad = 0;
if (population.length < FLOOR) {
  console.log(`\n🔴 VACUITY: population ${population.length} is below the floor of ${FLOOR}.`);
  console.log("   The subject set shrank. Either a rail was deleted (lower this constant in the");
  console.log("   SAME commit, with the reason) or the parser stopped seeing rails — which is a");
  console.log("   gate that would have passed over anything.");
  bad = 1;
} else {
  console.log(`\n  vacuity floor        ${FLOOR} · population ${population.length} ✅`);
}

if (offenders.length) {
  console.log(`\n🔴 ${offenders.length} rail(s) map destinations and announce NONE of them as current:`);
  for (const r of offenders) console.log(`     ✗ src/${r.file}:${r.line}`);
  console.log("\n   A rail whose options navigate takes `aria-current=\"page\"` on the one in force");
  console.log("   (§K rule 7b · filter-pill.tsx states the general law). Without it a screen reader");
  console.log("   is told there are six links and never which page it is on.");
  bad = 1;
} else {
  console.log("\n✅ every rail of destinations names the one in force.");
}

process.exit(bad);
