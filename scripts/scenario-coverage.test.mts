/**
 * ⛔ **THE SCENARIO COVERAGE GATE — the whole register, measured, with the number printed.**
 *
 * `plans/house-bots/PROGRESS.md` "Scenario coverage gate (before REL-0)" requires **every** scenario id in
 * `plans/house-bots/01-scenario-register.md` to appear in at least one house-bot assertion name or comment,
 * or to be listed with a reason. Its "Ids covered by tests" row has read `not measured yet` for the whole
 * register since 2026-09-13; `test:house-bot-reports` `0.250` measured the 49 ids ruling 250 names, and said
 * so in its own words ("the WHOLE register is still not measured"). This file measures the whole register.
 *
 * ⛔⛔ **THE FIRST READING OF THIS GATE IS WRONG BY AN ORDER OF MAGNITUDE, AND THE TRAP IS THIS PROGRAMME'S
 * OWN NAMED FAILURE MODE.** Grepping `scripts/` for a register id finds almost nothing — and the conclusion
 * "the register is 8% covered" is FALSE. The suites are not indexed by register id. They are indexed by
 * **amendment letter** (`04 A12`, `PLAN F4, A11, A15`) and by **ruling number**, because `04-amendments.md`
 * ABSORBED the register: 188 of the 281 ids are named on a `Merged:` line under a lettered amendment, and
 * from that point the amendment, not the id, is what the code and the tests cite. Searching for the id
 * searches the wrong index. Measuring the wrong population, and calling the silence a hole, is rule 4 of
 * this checkpoint's own law ("not applicable" is the most dangerous silent verdict) arriving from the other
 * side: a hole invented where the work is done. A gate that reported a 250-row hole would schedule months
 * against nothing.
 *
 * ⛔ **SO EVERY ID IS RESOLVED THROUGH THE REGISTER'S OWN INDEX, NOT ONLY BY ITS NAME.** Each row carries a
 * `- **Test:**` line naming the suite that owns it — 281 of 281 do — and that line is a declaration the
 * document makes about itself, which is why §3 reads it rather than guessing. An id that resolves through
 * NEITHER door is printed BY NAME with the reason, and never silently counted as covered.
 *
 * ⛔ **WHAT THIS GATE REFUSES TO DO: BAKE A WITHDRAWN REQUIREMENT INTO A TEST NAME.** The literal way to
 * close this gate is to paste every id into an assertion label. §2 exists to stop that, because at least
 * four register rows now read BACKWARDS against the shipped product, and annotating them as written would
 * manufacture a confident wrong number:
 *   · **HB-LC-05** asks realised loss to be counted on the day a position SETTLED. The accepted rule is R3's
 *     PLACEMENT-day cohort (`04-amendments.md:67`, `:740`). The row states the rejected half.
 *   · **FS-31** asks eligibility for a blocking row while the holder has two-step sign-in. D5 makes consent
 *     password-only and `04-amendments.md:70`/`:737` record that FS-31 contradicts it; no such row exists in
 *     `eligibility.ts`, and none should.
 *   · **HB-ACC-42** is marked `[covered]` and asserts "No pause" on a ≥1M AML hold. Both halves are dead:
 *     the hold was switched off by the owner ruling of 2026-09-13 (`wallet-service.ts` `WITHDRAWAL_AML_HOLD`
 *     — "no new withdrawal enters AML_REVIEW"), so the trigger cannot occur; and `eligibility.ts:293` makes
 *     ANY non-ACTIVE wallet a `WALLET_NOT_ACTIVE` blocking row, which is the opposite of "No pause". This
 *     one is recorded in NO plan document — it was found in the code while this gate was being built.
 *   · **HB-ACC-07** names test:password-change-revokes-sessions as its owner. That suite does not exist
 *     and will not: A1 records the owner's ruling that the platform-wide sign-out is NOT BUILT in this
 *     build. The row asks for a test of a withdrawn feature.
 *
 * ⛔ **THE TWO WITHDRAWN OWNERS ARE WRITTEN BARE, WITHOUT BACKTICKS, ON PURPOSE — DO NOT "TIDY" THEM.**
 * `test:guards-exist` reads a backticked `test:`-name as a CITATION, and its whole point is that a
 * citation tells a reader the guard exists ("a comment naming a guard is worse than silence"). These two
 * names — test:password-change-revokes-sessions here and test:house-bot-reward-exclusion at `liveNames`
 * below — are named for the OPPOSITE reason: to record that they do not exist and must never be written.
 * Backticking them makes this file assert the existence of suites that `01-scenario-register.md:212` and
 * `:2418` say `package.json` "declares no such key and never will", and turns `test:guards-exist` red on
 * two names nobody may fix by creating the script — §2.2's own `proof()` below REQUIRES their absence, so
 * writing either suite would turn THIS gate red while building a feature the owner ruled against (A1, D20).
 * ⭐ The typography is the claim. Bare is the accurate way to name a suite that is deliberately absent.
 * §2 reports these by name and holds the count as a CEILING, so a fifth can never arrive unnoticed.
 *
 * ⛔ **CONTROLS, BECAUSE THIS LANE HAS TWICE HAD A GUARD PASS HARDER WHILE BROKEN.** §5 plants a covered id's
 * removal and requires the gate to REPORT it; requires a covered id NOT to be reported; requires a ghost id
 * to resolve through nothing; and proves the self-strip really strips — `0.250` reported all 49 ids covered
 * on its first run because the scanner read its own declaration list, and this file carries a far bigger one.
 *
 * The number this gate produces is printed in full, with its population and its denominator, and it is NOT
 * rounded in either direction.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REGISTER = "plans/house-bots/01-scenario-register.md";
const AMEND = "plans/house-bots/04-amendments.md";
const DEFERRED = "plans/house-bots/DEFERRED-TESTS.md";
const SELF = "scripts/scenario-coverage.test.mts";
const REPORTS_CASES = "scripts/lib/house-bot-reports-cases.mts";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = ""): void {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  if (detail && cond) console.log(`       ${detail}`);
}
function section(t: string): void { console.log(`\n${t}\n${"─".repeat(Math.min(t.length, 100))}`); }
const read = (rel: string): string => readFileSync(rel, "utf8");
const j = (v: unknown): string => JSON.stringify(v);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   §1 · THE POPULATION AND THE DENOMINATOR — DERIVED, NEVER TYPED
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · the population and the denominator, derived twice and cross-checked");

const PREFIX = "(?:HB-ACC|HB-LC|ENG|CRA|CA|FS|TGT)";
const ID_RE = new RegExp(`\\b${PREFIX}-[0-9]{2,3}\\b`, "g");
const registerText = read(REGISTER);
const registerLines = registerText.split(/\r?\n/);

/** Derivation 1 — the `###` headings, which is what a scenario row IS. */
const POP: string[] = registerLines
  .filter((l) => /^### /.test(l))
  .map((l) => l.slice(4).split(/\s/)[0])
  .filter((s) => new RegExp(`^${PREFIX}-[0-9]+$`).test(s));
const SET = new Set(POP);

/** Derivation 2 — every id-shaped token anywhere in the file. An independent path to the same set. */
const anywhere = new Set((registerText.match(ID_RE) ?? []));

/** Each row's own body, so a verdict line is attributed to ITS id and to no neighbour. */
const rowText = new Map<string, string>();
{
  let cur: string | null = null;
  let buf: string[] = [];
  for (const l of registerLines) {
    const h = l.match(new RegExp(`^### (${PREFIX}-[0-9]+)\\b`));
    if (h) { if (cur) rowText.set(cur, buf.join("\n")); cur = h[1]; buf = []; continue; }
    if (cur) buf.push(l);
  }
  if (cur) rowText.set(cur, buf.join("\n"));
}

/** The register declares its own section sizes: `## holder-account (45)`. Its own denominator check. */
const declared = [...registerText.matchAll(/^## ([a-z-]+) \((\d+)\)$/gm)].map((m) => ({ name: m[1], n: Number(m[2]) }));
const declaredTotal = declared.reduce((a, b) => a + b.n, 0);

ok("1.1 · the population is the register's own `###` rows, and a second, independent scan of every id-shaped token in the file yields the IDENTICAL set — two derivations, not one assertion",
  POP.length > 0 && anywhere.size === SET.size && [...anywhere].every((i) => SET.has(i)),
  `${POP.length} rows · ${anywhere.size} distinct ids found anywhere in the file · identical=${anywhere.size === SET.size}`);

ok("1.2 · ⛔ THE DENOMINATOR IS THE DOCUMENT'S OWN: each `## section (N)` header declares its size, and the seven declared sizes SUM to the number of rows — so a row added without updating its header, or a header edited without adding a row, fails here instead of quietly moving the number",
  declared.length === 7 && declaredTotal === POP.length,
  `${declared.map((d) => `${d.name} ${d.n}`).join(" · ")} = ${declaredTotal} vs ${POP.length} rows`);

const byPrefix = new Map<string, string[]>();
for (const id of POP) {
  const p = id.replace(/-[0-9]+$/, "");
  byPrefix.set(p, [...(byPrefix.get(p) ?? []), id]);
}
const gaps: string[] = [];
for (const [p, ids] of byPrefix) {
  const ns = ids.map((i) => Number(i.slice(p.length + 1))).sort((a, b) => a - b);
  for (let k = 0; k < ns.length; k++) if (ns[k] !== k + 1) { gaps.push(`${p}: expected ${k + 1}, found ${ns[k]}`); break; }
}
ok("1.3 · every prefix runs 01..N with no gap and no duplicate, so the count is the highest id and a dropped row cannot hide inside the sequence",
  gaps.length === 0 && new Set(POP).size === POP.length,
  [...byPrefix].map(([p, v]) => `${p} ${v.length}`).join(" · ") + (gaps.length ? ` · GAPS ${j(gaps)}` : ""));

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   §2 · RECONCILE THE REGISTER AGAINST THE SHIPPED PRODUCT — BEFORE ANYTHING IS COUNTED
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§2 · reconciliation · the rows that now read BACKWARDS, and the owners that do not exist");

const pkgScripts: Record<string, string> = JSON.parse(read("package.json")).scripts ?? {};
const SCRIPT_RE = /\b((?:test|red|qa|repro|ops|db):[a-z0-9:-]+)\b/g;

/**
 * The `- **Test:**` block of a row: the register's own statement of who owns it.
 *
 * ⛔ THE BLOCK IS MULTI-LINE AND MOST OF IT IS ON THE CONTINUATION LINES. The first version of this parser
 * ended the block at the first line break, and the whole `TGT-*` section — 40 rows whose suites are named on
 * indented bullets under `- **Test:**` — came back as "no script named". That is a 14%-of-the-register error
 * in the headline, produced by a lookahead, and it is why the block is taken to the next TOP-LEVEL field or
 * to the end of the row rather than to the next newline.
 */
function testLineOf(id: string): { raw: string; names: string[] } {
  const body = rowText.get(id) ?? "";
  const start = body.indexOf("- **Test:**");
  if (start < 0) return { raw: "", names: [] };
  const rest = body.slice(start + "- **Test:**".length);
  const next = rest.search(/\n-\s+\*\*[A-Z][a-z]+:\*\*/);
  const raw = next >= 0 ? rest.slice(0, next) : rest;
  return { raw, names: [...new Set([...raw.matchAll(SCRIPT_RE)].map((x) => x[1]))] };
}

/* A name inside ~~strikethrough~~ is a CLOSED reference, not a live claim — FS-05's
 * test:house-bot-reward-exclusion is struck through in place and must not be read as a missing owner.
 * (Bare, not backticked, for the reason given in the header: `01-scenario-register.md:2418` records it
 * "struck by D20 and `package.json` declares no such key — a closed reference, never a live owner".) */
function liveNames(id: string): string[] {
  const { raw, names } = testLineOf(id);
  const struckSpans = [...raw.matchAll(/~~[\s\S]*?~~/g)].map((m) => m[0]).join("\n");
  return names.filter((n) => !struckSpans.includes(n));
}

const ghostOwners = new Map<string, string[]>();
for (const id of POP) {
  for (const n of liveNames(id)) {
    if (!Object.prototype.hasOwnProperty.call(pkgScripts, n)) ghostOwners.set(n, [...(ghostOwners.get(n) ?? []), id]);
  }
}

/* ⛔ THE CEILING, NOT A FLOOR. Each entry is a row pointing at a suite nothing answers to. It may only
 * ever FALL: either the suite is written, or the row is reconciled and the pointer removed. A fifth
 * arriving turns this red rather than sliding in behind a green run. */
const GHOST_OWNER_CEILING = 3;
ok(`2.1 · ⛔ EVERY OWNER A ROW NAMES MUST EXIST. A \`Test:\` line naming an npm script nothing answers to is not coverage — \`npm run -s\` exits 1 with an empty log in a second, which is how a missing script reads as a failed suite. Ceiling ${GHOST_OWNER_CEILING}, and it only ever falls`,
  ghostOwners.size <= GHOST_OWNER_CEILING,
  ghostOwners.size === 0 ? "none" : [...ghostOwners].map(([n, ids]) => `${n} ← ${ids.join(",")}`).join(" · "));

/**
 * ⛔ THE ROWS THAT READ BACKWARDS. Each is a register requirement the shipped product deliberately does NOT
 * meet, with the authority that withdrew it. Annotating any of them into an assertion label would bake a
 * withdrawn requirement into the test names — the exact confident-wrong-number this gate exists to refuse.
 * Data, so a list that shrinks is visible; each `proof` is re-read from the tree on every run, so the day a
 * rewrite makes one of these live again, the assertion below fails instead of the claim rotting in a comment.
 */
/* @coverage-lists:start — ⛔ THE TREE SEARCH MUST NOT FIND THIS FILE'S OWN LISTS. Every id below is typed
   here as data. `bodyOf` removes everything between these markers when it reads SELF; without the strip this
   gate would count its own declaration as coverage — which is exactly how `0.250` reported 49 of 49 covered
   on its first run. §5.c0 proves the strip happens and proves it matters. */
const BACKWARDS: Array<{ id: string; asks: string; ships: string; authority: string; proof: () => boolean }> = [
  {
    id: "HB-LC-05",
    asks: "realised loss counted on the day a position SETTLED",
    ships: "R3's PLACEMENT-day cohort",
    authority: "04-amendments.md:67 and :740",
    proof: () => /HB-LC-05[^\n]*contradicts the accepted R3/.test(read(AMEND)) && /R3 fixed the placement-day cohort/.test(read(AMEND)),
  },
  {
    id: "FS-31",
    asks: "an eligibility blocking row while the holder has two-step sign-in",
    ships: "D5 — consent is the password only; no such row exists and none should",
    authority: "04-amendments.md:70 and :737",
    proof: () => /FS-31:\*\* contradicts D5/.test(read(AMEND)) && !/CONSENT_FACTOR_ADDED/.test(read("src/lib/server/house-bot/eligibility.ts")),
  },
  {
    id: "HB-ACC-42",
    asks: "a ≥1M AML hold that the bot sees as balance-minus-hold, with 'No pause'",
    ships: "the hold is OFF by the owner ruling of 2026-09-13, and ANY non-ACTIVE wallet is a WALLET_NOT_ACTIVE blocking row",
    authority: "wallet-service.ts WITHDRAWAL_AML_HOLD + eligibility.ts WALLET_NOT_ACTIVE — recorded in NO plan document",
    proof: () => /NO NEW WITHDRAWAL ENTERS AML_REVIEW/i.test(read("src/lib/server/wallet-service.ts"))
      && /WALLET_NOT_ACTIVE/.test(read("src/lib/server/house-bot/eligibility.ts")),
  },
  {
    id: "HB-ACC-07",
    asks: "test:password-change-revokes-sessions (bare by the header's rule), a suite for a platform-wide sign-out",
    ships: "A1 — the sign-out is NOT BUILT in this build (owner ruling), so the suite does not and will not exist",
    authority: "04-amendments.md A1",
    proof: () => /Signing out other devices on a password change is not built/.test(read(AMEND))
      && !Object.prototype.hasOwnProperty.call(pkgScripts, "test:password-change-revokes-sessions"),
  },
];
/** A ghost that is in no file, no amendment and no deferred row. The gate must resolve it through nothing. */
const GHOST_ID = "CRA-98";
/* @coverage-lists:end */

const backwardsBroken = BACKWARDS.filter((b) => !SET.has(b.id) || !b.proof());
ok(`2.2 · ⛔ THE ${BACKWARDS.length} ROWS THAT READ BACKWARDS AGAINST THE SHIPPED PRODUCT are named here with the authority that withdrew each, and every claim is RE-READ from the tree on this run — a rewrite that makes one live again fails here rather than rotting in a comment. These are NOT annotated into assertion labels: doing so would bake a withdrawn requirement into the test names`,
  backwardsBroken.length === 0,
  BACKWARDS.map((b) => `${b.id}: asks ${b.asks} · ships ${b.ships} (${b.authority})`).join("\n       "));

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   §3 · THE LADDER — one verdict per id, every one of them printed
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · the ladder · every id resolved by name, by its own declared owner, by a closure, or not at all");

/** ⛔ SELF-STRIP. The declaration region above is removed before this file is searched. */
const LIST_START = "@coverage-lists" + ":start";
const LIST_END = "@coverage-lists" + ":end";
const ROLL_START = "@roll-call-lists" + ":start";
const ROLL_END = "@roll-call-lists" + ":end";
function stripBetween(code: string, a: string, b: string): string {
  const i = code.indexOf(a);
  const k = code.indexOf(b);
  return i >= 0 && k > i ? `${code.slice(0, i)}${code.slice(k)}` : code;
}
function bodyOf(rel: string): string {
  let code: string;
  try { code = read(rel); } catch { return ""; }
  /* ⛔ THIS FILE IS NEVER PART OF ITS OWN POPULATION. Stripping only the declaration region was not enough:
   * §2's header comment names HB-LC-05, FS-31, HB-ACC-42 and HB-ACC-07 in prose, and the first run counted
   * two of them as NAMED — the gate certifying its own commentary as coverage, 8.5% built on 8.0% of real
   * evidence plus two ids it had typed about itself. A scanner must not be in the set it scans. */
  if (rel === SELF) return "";
  if (rel === REPORTS_CASES) code = stripBetween(code, ROLL_START, ROLL_END);
  return code;
}
/** What this file would contribute if it were not excluded — read for the control, never for the count. */
const selfWouldContribute = (): string[] => {
  const raw = read(SELF);
  return [...new Set((raw.match(ID_RE) ?? []).filter((i) => SET.has(i)))];
};

const tracked = execSync("git ls-files scripts src", { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);

/** Door 1 · the id itself, in an assertion label or a comment, anywhere under `scripts/` or `src/`. */
function scanTree(skip: string | null): Map<string, string> {
  const hit = new Map<string, string>();
  for (const rel of tracked) {
    let code = bodyOf(rel);
    if (!code) continue;
    if (skip) code = code.split(skip).join("<<redacted>>");
    for (const m of code.matchAll(ID_RE)) if (SET.has(m[0]) && !hit.has(m[0])) hit.set(m[0], rel);
  }
  return hit;
}
const named = scanTree(null);

/** Door 2 · the register's OWN closure verdict, written on the row by D19 or D20. */
const struckWhole = POP.filter((id) => /Coverage gate: struck by D(19|20)/.test(rowText.get(id) ?? ""));

/** Door 3 · the row's own `Test:` line, naming a suite that exists. `test:*` runs inside `test:all`. */
const ownedBy = new Map<string, string[]>();
for (const id of POP) {
  const live = liveNames(id).filter((n) => Object.prototype.hasOwnProperty.call(pkgScripts, n));
  if (live.length) ownedBy.set(id, live);
}
const inPipeline = (id: string): boolean => (ownedBy.get(id) ?? []).some((n) => n.startsWith("test:"));

/** Door 4 · named with a reason in the skipped-run register. */
const deferredText = read(DEFERRED);

type Verdict = "NAMED" | "STRUCK" | "OWNED" | "DEFERRED" | "UNRESOLVED";
function resolve(id: string, hits: Map<string, string>): { v: Verdict; why: string } {
  if (hits.has(id)) return { v: "NAMED", why: `named in ${hits.get(id)}` };
  if (struckWhole.includes(id)) return { v: "STRUCK", why: "the row's own 'Coverage gate: struck by D19/D20' closure" };
  if (ownedBy.has(id)) return { v: "OWNED", why: `its Test: line names ${ownedBy.get(id)!.join(", ")}${inPipeline(id) ? " (runs in test:all)" : " (manual gate, not in test:all)"}` };
  if (deferredText.includes(id)) return { v: "DEFERRED", why: "named with a reason in DEFERRED-TESTS.md" };
  return { v: "UNRESOLVED", why: "not named in any file under scripts/ or src/, no closure on its row, no owning suite that exists, no deferred row" };
}

const verdicts = new Map<string, { v: Verdict; why: string }>();
for (const id of POP) verdicts.set(id, resolve(id, named));
const of = (v: Verdict): string[] => POP.filter((i) => verdicts.get(i)!.v === v);

const NAMED = of("NAMED");
const STRUCK = of("STRUCK");
const OWNED = of("OWNED");
const DEFER = of("DEFERRED");
const UNRES = of("UNRESOLVED");
const pipeline = OWNED.filter(inPipeline);
const manualOnly = OWNED.filter((i) => !inPipeline(i));

ok("3.1 · the four doors partition the register exactly once each — every id has one verdict and no id has two, so nothing is counted twice and nothing falls between them",
  NAMED.length + STRUCK.length + OWNED.length + DEFER.length + UNRES.length === POP.length,
  `NAMED ${NAMED.length} · STRUCK ${STRUCK.length} · OWNED ${OWNED.length} · DEFERRED ${DEFER.length} · UNRESOLVED ${UNRES.length} = ${POP.length}`);

ok("3.2 · ⛔ EVERY UNRESOLVED ID IS PRINTED BY NAME WITH ITS REASON. An id the gate cannot resolve either way is never silently counted as covered — 'not applicable' is the most dangerous silent verdict, and this is the assertion that makes it impossible here",
  UNRES.every((id) => (verdicts.get(id)!.why ?? "").length > 0),
  UNRES.length === 0 ? "none" : `${UNRES.length} unresolved: ${UNRES.join(" ")}`);

/* ⛔ TWO CEILINGS, AND THE SECOND EXISTS BECAUSE THE FIRST WAS GAMED — BY ME, IN THE SAME SESSION.
 *
 * The first run of this gate reported 11 UNRESOLVED. Writing those 11 into `DEFERRED-TESTS.md` with a
 * reason — which is exactly what PROGRESS.md's rule asks for — moved all 11 through the DEFERRED door and
 * the summary line went to "UNRESOLVED 0". Nothing had been tested. The count of rows with no test at all
 * was unchanged; only the label moved, and the gate passed HARDER while the product was identical. That is
 * this lane's own named failure mode, reproduced by its own author inside one hour.
 *
 * So UNRESOLVED is held at 0 — no id may be unaccounted for — and the quantity that actually matters,
 * NO TEST AT ALL (deferred by name + unresolved), carries its own ceiling that only ever falls. Listing a
 * row cannot lower it; only writing the test can.
 */
const UNRESOLVED_CEILING = 0;
// 18 -> 3 on 2026-09-26: the printed count of this gate's own 3.4 run on that tree, set to exactly what it printed.
// The three still untested: ENG-19 (the 1M timed load run, REL-0's window, PROGRESS L5); CA-18 and CA-31 (NOT BUILT — the desk strip has no tab-return re-read or Updated stamp, the runner no 8 s/45 s card — each needs a build or an owner ruling, never a deferral note).
const NO_TEST_CEILING = 3;
const noTest = [...DEFER, ...UNRES];
ok(`3.3 · the unresolved count is held at ${UNRESOLVED_CEILING} — every id must be accounted for by some door, so a register row added without an owner turns this red on the day it lands instead of moving the published number quietly`,
  UNRES.length <= UNRESOLVED_CEILING,
  `${UNRES.length} unresolved · ceiling ${UNRESOLVED_CEILING}`);
ok(`3.4 · ⛔ AND THE RATCHET IS ON THE QUANTITY THAT CANNOT BE MOVED BY WRITING PROSE: ${noTest.length} rows have NO TEST AT ALL (deferred by name, or unresolved). Ceiling ${NO_TEST_CEILING}, which only ever falls — listing a row in DEFERRED-TESTS.md satisfies 3.3 but NOT this, because only a test lowers this one`,
  noTest.length <= NO_TEST_CEILING,
  `${noTest.length} with no test · ceiling ${NO_TEST_CEILING} · ${noTest.join(" ")}`);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   §4 · THE NUMBER
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§4 · the number, with its population and its denominator");

const denom = POP.length;
const covered = NAMED.length + OWNED.length;
const pctOf = (x: number): string => ((x / denom) * 100).toFixed(1) + "%";

console.log(`  POPULATION   every scenario id in ${REGISTER}`);
console.log(`  DENOMINATOR  ${denom}  (the register's own seven section headers declare ${declaredTotal})`);
console.log("");
console.log(`  NAMED        ${String(NAMED.length).padStart(3)}  ${pctOf(NAMED.length).padStart(6)}  the id itself appears in an assertion label or comment under scripts/ or src/`);
console.log(`  OWNED        ${String(OWNED.length).padStart(3)}  ${pctOf(OWNED.length).padStart(6)}  its own Test: line names a suite that EXISTS — ${pipeline.length} of them run inside test:all, ${manualOnly.length} are manual gates`);
console.log(`  STRUCK       ${String(STRUCK.length).padStart(3)}  ${pctOf(STRUCK.length).padStart(6)}  the requirement is withdrawn by D19/D20 and the row says so`);
console.log(`  DEFERRED     ${String(DEFER.length).padStart(3)}  ${pctOf(DEFER.length).padStart(6)}  named with a reason in DEFERRED-TESTS.md`);
console.log(`  UNRESOLVED   ${String(UNRES.length).padStart(3)}  ${pctOf(UNRES.length).padStart(6)}  ${UNRES.join(" ") || "—"}`);
console.log("");
console.log(`  ⭐ COVERAGE  ${covered} / ${denom} = ${pctOf(covered)}  (NAMED + OWNED)`);
console.log(`     of which PROVEN BY NAME ${NAMED.length} / ${denom} = ${pctOf(NAMED.length)} — the requirement as PROGRESS.md words it`);
console.log(`     and CARRIED BY A DECLARED OWNER ${OWNED.length} / ${denom} = ${pctOf(OWNED.length)} — a PROXY: it proves a suite owns the row, NOT that the row's own Expected is asserted inside it`);
console.log(`  ACCOUNTED FOR ${covered + STRUCK.length + DEFER.length} / ${denom} = ${pctOf(covered + STRUCK.length + DEFER.length)}  (every door)`);
console.log("");
console.log(`  ⛔ THE PROXY IS AN UPPER BOUND, AND IT IS NOT BEHAVIOURAL PROOF. ${OWNED.length} rows resolve because the`);
console.log("     register names an owning suite that exists, not because anything checked that suite asserts THAT row's");
console.log("     Expected. Closing the gap between the two is per-row work, and it is what the remaining figure buys.");

ok("4.1 · ⛔ THE GATE PRINTS ITS POPULATION AND ITS DENOMINATOR, and the coverage figure is split into the half proven by name and the half carried by a declared owner — so nobody can read the headline as behavioural proof, and nobody can read the small half as the whole truth",
  denom === POP.length && covered === NAMED.length + OWNED.length && denom > 0,
  `coverage ${covered}/${denom} = ${pctOf(covered)} · proven-by-name ${NAMED.length} · by-declared-owner ${OWNED.length}`);

ok("4.2 · the by-owner half is not a black box: every owning suite is named, and the rows that resolve only to a MANUAL gate (red:/qa:/ops:, which test:all does not run) are counted apart from the ones a daily run exercises",
  pipeline.length + manualOnly.length === OWNED.length,
  `in test:all ${pipeline.length} · manual only ${manualOnly.length}` + (manualOnly.length ? ` (${manualOnly.slice(0, 12).join(" ")}${manualOnly.length > 12 ? " …" : ""})` : ""));

const suiteCount = new Map<string, number>();
for (const [, names] of ownedBy) for (const n of names) suiteCount.set(n, (suiteCount.get(n) ?? 0) + 1);
console.log("\n  rows per owning suite: " + [...suiteCount].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   §4b · THE PROXY IS TESTED, NOT TRUSTED
   ⛔ The OWNED door says a suite is NAMED as the owner. It does not say the suite contains anything about
   this row. Where a row quotes a distinctive token in its own `Test:` block — an identifier, a refusal
   reason, an assertion phrase, in backticks — that token can be looked for inside the files the named suite
   actually executes. That is the only mechanical evidence available that the proxy is not empty, so it is
   measured and printed rather than assumed. It is a SAMPLE: most rows quote nothing checkable, and a token
   found anywhere in a suite file is still weaker than an assertion on this row's Expected. Both limits are
   printed, because a bound presented as a measurement is how a confident wrong number gets made.
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§4b · the proxy is tested, not trusted · a corroboration sample over the rows that quote something checkable");

/** The files a suite key really executes: its entry script, its cases library, its mutation anchors. */
function filesFor(key: string): string[] {
  const cmd = pkgScripts[key] ?? "";
  const out: string[] = [...cmd.matchAll(/scripts\/[A-Za-z0-9._/-]+\.(?:mts|mjs|ts|js)/g)].map((m) => m[0]);
  for (const f of [...out]) {
    const stem = f.replace(/^scripts\//, "").replace(/\.(mts|mjs|ts|js)$/, "").replace(/\.test$/, "");
    for (const c of [`scripts/lib/${stem}-cases.mts`, `scripts/anchors/${stem}.anchors.mjs`, `scripts/lib/${stem}.mts`]) {
      try { readFileSync(c); out.push(c); } catch { /* not every suite has one */ }
    }
  }
  return [...new Set(out)];
}
const bareToken = (t: string): string => t.replace(/\(.*$/, "").replace(/[<>[\]]/g, "");
let quoting = 0;
const corroborated: string[] = [];
const notFound: string[] = [];
for (const id of OWNED) {
  const { raw } = testLineOf(id);
  const toks = [...new Set([...raw.matchAll(/`([^`]{3,60})`/g)].map((m) => m[1]))]
    .filter((t) => !/^(?:test|red|qa|repro|ops|db):/.test(t))
    .filter((t) => /^[A-Za-z_][A-Za-z0-9_.()[\]<>:-]*$/.test(t));
  if (!toks.length) continue;
  quoting++;
  let body = "";
  for (const n of ownedBy.get(id) ?? []) for (const f of filesFor(n)) { try { body += read(f); } catch { /* skip */ } }
  const hit = toks.some((t) => body.includes(t) || (bareToken(t).length > 3 && body.includes(bareToken(t))));
  (hit ? corroborated : notFound).push(id);
}
const CORROBORATED_FLOOR = 29;
ok(`4b.1 · ⛔ THE PROXY IS SPOT-CHECKED WHERE IT CAN BE. Of the ${OWNED.length} rows carried by a declared owner, ${quoting} quote a distinctive token in their own Test: block; ${corroborated.length} of those tokens are present in the files that suite actually executes. Floor ${CORROBORATED_FLOOR}, which only ever rises`,
  corroborated.length >= CORROBORATED_FLOOR && quoting > 0,
  `${corroborated.length}/${quoting} corroborated = ${((corroborated.length / Math.max(quoting, 1)) * 100).toFixed(1)}% · NOT FOUND (${notFound.length}): ${notFound.join(" ") || "—"}`);

ok("4b.2 · ⛔ AND THE SAMPLE'S OWN LIMIT IS PRINTED, not buried: the rows that quote nothing checkable are counted, so the corroboration rate is never read as if it covered the whole owned set",
  quoting + (OWNED.length - quoting) === OWNED.length,
  `${OWNED.length - quoting} of ${OWNED.length} owned rows quote no checkable token — the proxy cannot be tested on them at all`);

console.log("");
console.log(`  ⛔ SO THE HONEST FIGURE IS A BRACKET, NOT A POINT.`);
console.log(`     LOWER  ${NAMED.length}/${denom} = ${pctOf(NAMED.length)}  proven by name — the requirement exactly as PROGRESS.md words it`);
console.log(`     UPPER  ${covered}/${denom} = ${pctOf(covered)}  named, or carried by an owning suite that exists and runs`);
console.log(`     the upper bound spot-checks at ${corroborated.length}/${quoting} = ${((corroborated.length / Math.max(quoting, 1)) * 100).toFixed(1)}% on the ${quoting} rows where it can be checked at all`);
console.log("");
console.log(`  ⛔ AND THE GAP, WHICH NO AMOUNT OF WRITING CAN CLOSE: ${noTest.length} rows have NO TEST AT ALL.`);
console.log(`     ${DEFER.length} are listed by name with a reason in DEFERRED-TESTS.md, ${UNRES.length} resolve through no door at all.`);
console.log(`     ${noTest.join(" ") || "—"}`);
console.log(`     A further ${STRUCK.length} need none: D19/D20 withdrew the requirement and the register's own row says so.`);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   §5 · THE CONTROLS — a guard that has never been shown to reject anything is not a guard
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§5 · controls · planted, positive, ghost, and the self-strip");

/* c0 · THE SELF-STRIP. Every id in §2's BACKWARDS list is typed in THIS file. If the tree scan read this
 * file whole, each would count as NAMED and this gate would certify its own declaration as coverage. */
const selfIds = selfWouldContribute();
const selfLeaked = selfIds.filter((id) => named.get(id) === SELF);
ok("5.c0 · ⛔ CONTROL · THE SCANNER IS NOT IN THE SET IT SCANS. This file names real register ids in its own commentary; the scan excludes it entirely and NONE of them is credited to it. Stripping only the declaration region was NOT enough on the first run — two ids this file merely writes ABOUT came back NAMED, a gate certifying its own prose as coverage",
  selfIds.length > 0 && selfLeaked.length === 0 && bodyOf(SELF) === "",
  `this file names ${selfIds.length} register ids (${selfIds.slice(0, 6).join(" ")}${selfIds.length > 6 ? " …" : ""}) · credited to it: ${selfLeaked.length}`);

/* c1 · A PLANTED NEGATIVE. Take an id that IS named in the tree, erase every occurrence from the corpus,
 * re-run the whole ladder, and require the gate to stop calling it NAMED. A gate that still reported it
 * covered would be reading something other than the tree. */
const plant = NAMED.find((id) => !ownedBy.has(id) && !struckWhole.includes(id) && !deferredText.includes(id))
  ?? NAMED[0] ?? null;
let plantedVerdict: Verdict | null = null;
if (plant) {
  const rescanned = scanTree(plant);
  plantedVerdict = resolve(plant, rescanned).v;
}
ok("5.c1 · ⛔ PLANTED CONTROL · an id that IS covered, removed from every assertion in the corpus, is REPORTED as no longer named — the whole ladder is re-run against the redacted corpus, so this proves the measurement follows the tree and not a cached list",
  plant !== null && plantedVerdict !== null && plantedVerdict !== "NAMED",
  `planted ${plant} · verdict with every occurrence redacted: ${plantedVerdict} (was NAMED)`);

/* c2 · THE POSITIVE CONTROL. The same run must NOT report an id that is genuinely covered. */
const positive = NAMED.filter((id) => id !== plant).slice(0, 5);
ok("5.c2 · ⛔ POSITIVE CONTROL · ids that ARE covered are NOT reported — a gate that fires on everything is as useless as one that fires on nothing, and this lane has twice had a guard pass harder while broken",
  positive.length > 0 && positive.every((id) => verdicts.get(id)!.v === "NAMED") && positive.every((id) => !UNRES.includes(id)),
  `${positive.length} covered ids checked and none reported: ${positive.join(" ")}`);

/* c3 · THE GHOST. An id in no file, no amendment, no closure and no deferred row must resolve through nothing. */
const ghostNamed = named.has(GHOST_ID);
const ghostOwned = ownedBy.has(GHOST_ID);
const ghostDeferred = deferredText.includes(GHOST_ID);
ok("5.c3 · CONTROL · a ghost id that is in no file, carries no closure, has no owning suite and sits in no deferred row resolves through NOTHING — so every door is a door and not a hole that passes anything through it",
  !ghostNamed && !ghostOwned && !ghostDeferred && !SET.has(GHOST_ID),
  `${GHOST_ID}: named=${ghostNamed} owned=${ghostOwned} deferred=${ghostDeferred} inRegister=${SET.has(GHOST_ID)}`);

/* c4 · THE SCAN IS NOT EMPTY. A tree search that found nothing would make every id resolve by owner and
 * print a confident number built on a broken reader. */
ok("5.c4 · CONTROL · the tree scan is a measurement and not an empty set: it searched every tracked file under scripts/ and src/ and found real ids in real files",
  tracked.length > 1500 && named.size >= 20,
  `${tracked.length} tracked files searched · ${named.size} register ids found by name`);

/* c5 · THE OWNER DOOR REALLY CHECKS package.json. A door that accepted any string would resolve everything. */
const fakeOwner = Object.prototype.hasOwnProperty.call(pkgScripts, "test:this-suite-does-not-exist");
ok("5.c5 · CONTROL · the owner door reads package.json and rejects a name nothing answers to — it is the check that turns 'a suite is named' into 'a suite exists'",
  !fakeOwner && Object.keys(pkgScripts).length > 100 && Object.prototype.hasOwnProperty.call(pkgScripts, "test:all"),
  `${Object.keys(pkgScripts).length} scripts declared · a fabricated name resolves=${fakeOwner}`);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════ */
console.log(`\nscenario-coverage: ${pass} passed, ${fail} failed`);
/* ⛔ A suite that can print ALL PASS on zero assertions is the suite-never-executed class. The floor is what
 * this file's own green run printed, and it only ever rises. */
const MIN_ASSERTIONS = 13;
if (pass + fail < MIN_ASSERTIONS) {
  console.log(`FLOOR · only ${pass + fail} assertions ran, floor is ${MIN_ASSERTIONS} — the suite did not execute`);
  process.exit(4);
}
process.exit(fail === 0 ? 0 : 1);
