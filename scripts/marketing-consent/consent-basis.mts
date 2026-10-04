/**
 * test:marketing-consent · section U33a — THE CONSENT-BASIS CATALOGUE (`src/lib/marketing/consent-basis.ts`), pure.
 *                                                                          (S10, 2026-10-01 · U33w, 2026-10-04)
 *
 * ⭐ WHAT THIS SECTION HOLDS. The catalogue alone, EXECUTED: the append-only pin, the TWO bases that are not consent (a
 * bought list, and OD57 · OD58's licence outreach basis), the composed wordings (sender, content, channel, 18+), their
 * distance from the player's SMS sentences, the attestation test the gate will call, the ONE input door the panel and
 * the start action share, the evidence string — and U33w's rule: the wordings here are SUGGESTIONS, and nothing records
 * one an admin never saved.
 *
 * ⭐ U33w · WHAT REPLACED G4's "NOTHING IN PRODUCTION REACHES THE DRAFTS" (spec S14 · §9). The wordings are edited and
 * saved on the Marketing wordings card (`marketing.wordings`), so the catalogue composes and recognises an import
 * attestation from the SAVED versions handed in (`SavedBasisWordings`), never from its defaults:
 *   · U33.draft1 — a default carries no ship date (every `since` is UNSHIPPED); a saved version carries its own savedAt.
 *   · U33.draft2 — W1's rule, structurally, over the REAL src tree: no BASIS WRITER (a module that writes a ledger row —
 *     by any receiver, in any create, upsert or raw-SQL form — a list basis or a test attestation) names a default — the
 *     card's suggestions, the default 18+ sentence or the default notice — or reads a catalogue entry's `defaultWording`
 *     (M3: chained, a variable, the door's answer, a non-null assertion), itself, through a barrel, or through a helper.
 *   · U33.draft3 — W1c, the detector's own control: a fixed population in memory with every shape it claims to see, and
 *     the shapes it must let through (the card's prefill, the pin, the catalogue, a writer that takes the catalogue's
 *     labels, a writer that reads `currentWording`).
 *   · U33.sav1 — W1 at the catalogue: with NOTHING saved, no first-party basis composes a wording, no default is
 *     attested, and the door refuses `wording_unsaved`.
 * `test:marketing-wordings` runs the same detector (W1 · W1c) beside the store's runtime half.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. Every assertion reads an injected `BasisImpl`. `--prove-red` plants each defect
 * IN MEMORY — an edited copy of the catalogue, a wrapper around a shipped function, a source that is not on disk,
 * a blinded detector — and the runner requires the MATCHING assertion to fail. This module READS src/ for W1 and
 * never writes a file.
 *
 * Registered in `scripts/marketing-consent.test.mts` (both modes).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { isDirective } from "../lib/is-directive.mts";
import { srcFiles, REPO_ROOT } from "../lib/tracked-files.mts";
import {
  CONSENT_BASES, ADULT_ATTESTATION_WORDING, THIRD_PARTY_NOTICE, UNSHIPPED, CONSENT_BASIS_REFUSAL_SENTENCE, NO_SAVED_WORDINGS,
  PROOF_NOTE_MIN, PROOF_NOTE_MAX,
  consentBasisFor, importConsentWording, isAttestedImportWording, isImportAttestation, checkConsentBasisInput,
  importConsentEvidence, normalizeProofNote, proofNoteChars,
} from "../../src/lib/marketing/consent-basis.ts";
import type {
  PinnedConsentBasis, ConsentBasisInput, ConsentBasisCheck, ConsentBasisKey, ImportAttestationRow, SavedBasisWordings,
} from "../../src/lib/marketing/consent-basis.ts";
import { appendVersion } from "../../src/lib/marketing/marketing-wordings.ts";
import { SMS_CONSENT_WORDINGS } from "../../src/lib/marketing/consent-wording.ts";

export type Ok = (label: string, cond: boolean, detail?: string) => void;

/* ══ W1 · THE BASIS WRITERS — every src file, read from the REAL tree ════════════════════════════════════════ */

/** One module specifier a source loads. `typeOnly`: `import type` / `export type` — erased at build, never followed. */
export type LoadedSpec = { readonly spec: string; readonly typeOnly: boolean; readonly reexport: boolean };

/** One src file as the W1 walk read it: decommented (a commented-out import is not an import), whether its first
 *  statement is "use server", and every specifier it loads. */
export type WalkedSource = {
  readonly rel: string;
  readonly text: string;
  readonly useServer: boolean;
  readonly specs: readonly LoadedSpec[];
};

/** A basis writer that reaches a default wording, and how. */
export type DefaultFinding = { readonly rel: string; readonly why: string };

/** What the W1 detector found over one population — every count printed, every finding named. */
export type DefaultReach = {
  /** src files judged (a population member outside src/ is never judged). */
  readonly files: number;
  /** Value-import edges resolved inside src. */
  readonly edges: number;
  /** BASIS WRITERS: modules that write a ledger row, a list basis or a test attestation — each one records words. */
  readonly writers: readonly string[];
  /** Modules outside the two homes that name a default — the card's prefill is one, legitimately: it writes nothing. */
  readonly readers: readonly string[];
  readonly violations: readonly DefaultFinding[];
};

/** `import … from` / `export … from`, `type` or not — only the clause shapes the language allows, so a match can
 *  never run from one statement into the next. */
const FROM_SPEC = /\b(import|export)\s+(type\s+)?(?:\*\s*(?:as\s+[\w$]+\s*)?|\{[^}]*\}\s*|[\w$]+\s*(?:,\s*(?:\{[^}]*\}|\*\s*as\s+[\w$]+)\s*)?)from\s*(["'])([^"'\n]+)\3/g;
/** `import "x"` — loaded for its side effects. */
const BARE_SPEC = /\bimport\s*(["'])([^"'\n]+)\1/g;
/** `import("x")` and `require("x")`. A template with an interpolation in it cannot be resolved and is not matched. */
const CALL_SPEC = /\b(?:import|require)\s*\(\s*(["'`])([^"'`$\n]+)\1\s*\)/g;

function loadedSpecs(text: string): LoadedSpec[] {
  const out: LoadedSpec[] = [];
  for (const m of text.matchAll(FROM_SPEC)) out.push({ spec: m[4], typeOnly: m[2] !== undefined, reexport: m[1] === "export" });
  for (const m of text.matchAll(BARE_SPEC)) out.push({ spec: m[2], typeOnly: false, reexport: false });
  for (const m of text.matchAll(CALL_SPEC)) out.push({ spec: m[2], typeOnly: false, reexport: false });
  return out;
}

/** ⭐ THE ONE DOOR into a W1 population: the real tree and every planted source are read the same way. */
export function sourceOf(rel: string, raw: string): WalkedSource {
  const text = decomment(raw);
  return { rel, text, useServer: isDirective(raw, "use server"), specs: loadedSpecs(text) };
}

const RESOLVE_TRIES = ["", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js"];

/** A specifier resolved to a file of the population, or null (a package). `@/` is `src/` (tsconfig `paths`), a
 *  relative one is joined to the importer's folder, and TypeScript's ESM spelling (`./x.js` naming `x.ts`) holds. */
export function resolveSpec(fromRel: string, spec: string, files: ReadonlySet<string>): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec === "." || spec === ".." || spec.startsWith("./") || spec.startsWith("../")) base = posix.join(posix.dirname(fromRel), spec);
  else return null;
  const stems = [base];
  const js = /\.(?:[cm]?js|jsx)$/.exec(base);
  if (js) stems.push(base.slice(0, -js[0].length));
  for (const stem of stems) for (const t of RESOLVE_TRIES) if (files.has(stem + t)) return stem + t;
  return null;
}

/** ⭐ THE TWO HOMES — where the defaults are DEFINED. Naming one there is the definition, not a read, and a writer may
 *  load a home for its RULES (the readers, `appendVersion`, a basis's flags) — never for its words. */
export const DEFAULT_HOMES: readonly string[] = ["src/lib/marketing/consent-basis.ts", "src/lib/marketing/marketing-wordings.ts"];

/** ⛔ THE NAMES THAT HOLD A DEFAULT WORDING: the card's suggestions, the default 18+ sentence and the default bought-list
 *  notice. ⭐ M3 · The catalogue is no longer one of them: its entries keep their default under `defaultWording` (below),
 *  so a writer may take the catalogue for its keys, labels and flags — and is found the moment it reads the default. */
export const DEFAULT_NAMES: readonly string[] = ["WORDING_DEFAULTS", "ADULT_ATTESTATION_WORDING", "THIRD_PARTY_NOTICE"];

/** ⛔ M3 · The catalogue field that holds a basis's default wording (`consent-basis.ts`). */
export const DEFAULT_FIELD = "defaultWording";

/* ⛔ No pattern in this section holds a backslash: an editing tool decodes typed escapes (repo memory, 2026-10-02 — a
   word boundary once landed on disk as a raw BACKSPACE and blinded three guards). Word edges are lookarounds over
   explicit classes, and whitespace is a class built from its character codes. */
const ID = "[A-Za-z0-9_$]";
const WS = `[ ${String.fromCharCode(9, 10, 13)}]`;
/** A default named as an identifier — imported, aliased, read off a namespace, indexed, or handed on. */
const NAMES_DEFAULT = new RegExp(`(?<!${ID})(?:${DEFAULT_NAMES.join("|")})(?!${ID})`);
/** ⛔ M3 · A catalogue entry's default read IN ANY SHAPE — chained off the lookup (`consentBasisFor(k)?.defaultWording`),
 *  off a variable (`basis.defaultWording`), off the door's answer, after a non-null assertion (`!.defaultWording`), indexed
 *  by its name, destructured — every one of them names the field. */
const READS_DEFAULT_FIELD = new RegExp(`(?<!${ID})${DEFAULT_FIELD}(?!${ID})`);
/** ⛔ A LEDGER WRITE by ANY receiver — `db.`, a transaction's `tx.`, `prisma.`, a call's result (the DAL's `pc().`), an
 *  optional chain — in every Prisma form that records a row: create, createMany, createManyAndReturn and upsert. */
const WRITES_LEDGER = new RegExp(
  `[?]?[.]${WS}*messagingConsent${WS}*[?]?[.]${WS}*(?:create|createMany|createManyAndReturn|upsert)(?!${ID})`,
);
/** ⛔ A RAW-SQL LEDGER WRITE — an INSERT INTO or an UPDATE of the table, quoted or not, schema-qualified or not, any case. */
const RAW_LEDGER_WRITE = new RegExp(
  `(?<![A-Za-z0-9_])(?:insert${WS}+into|update)${WS}+(?:["]?public["]?[.])?["]?messagingconsent["]?(?![A-Za-z0-9_])`,
  "i",
);
/** The writer test as it stood before the U33w review — an identifier receiver, create or createMany, no raw SQL.
 *  Kept only for U33.draft3's plant (`narrowWriters`), which must go red. */
const WRITES_LEDGER_NARROW = new RegExp(`(?<!${ID})[A-Za-z_$]${ID}*[.]messagingConsent[.](?:create|createMany)(?!${ID})`);
/** ⛔ A LIST-BASIS WRITE (U33a-L's `db.contactListBasis.create`). */
const WRITES_LIST_BASIS = new RegExp(`[.]contactListBasis[.]create(?!${ID})`);
/** ⛔ A TEST ATTESTATION BUILT (U37c): the gate's context object, with the wording version it confirms. */
const NAMES_ATTESTATION = new RegExp(`(?<!${ID})(?:testAttestation|TestAttestation)(?!${ID})`);
const NAMES_WORDING_VERSION = new RegExp(`(?<!${ID})wordingVersion(?!${ID})`);
/** TypeScript's ESM spelling of a script file — a `./x.js` specifier naming `x.ts`. */
const JS_SPELLING = /[.](?:[cm]?js|jsx)$/;

/** Every flag off is the shipped detector; each flag blinds or widens ONE thing — U33.draft3's plants. */
export type DefaultDefect = {
  /** Only a writer's own text is read — a barrel or a helper launders a default into it. */
  ownTextOnly?: boolean;
  /** Only `@/` specifiers resolve — a relative import walks past. */
  aliasOnly?: boolean;
  /** TypeScript's ESM spelling (`./x.js` naming `x.ts`) is not resolved — a `.js` specifier walks past. */
  noJsSpelling?: boolean;
  /** M3 · `defaultWording` is not seen — a default read off the catalogue (chained, a variable, the door's answer, `!.`). */
  noDefaultField?: boolean;
  /** A HOME counts as a reader — so every writer that loads the readers or the rules would stall the build. */
  homesRead?: boolean;
  /** The writer test as it stood before the review — `pc().messagingConsent`, createManyAndReturn, upsert and raw SQL
   *  are not seen as writes. */
  narrowWriters?: boolean;
};

/**
 * ⭐ THE W1 DETECTOR (U33w · S14 — it replaces G4's "nothing in production reaches the drafts"). A BASIS WRITER — a
 * module that writes a ledger row, a list basis or a test attestation, each of which records words — takes its words
 * from the SAVED history (`currentWording`) and refuses when there is none. So no basis writer may:
 *  · NAME a default (`DEFAULT_NAMES`), or READ a catalogue entry's `defaultWording` in any shape (M3);
 *  · REACH, through its value imports, a module outside the two homes that does — a barrel that re-exports a default
 *    under another name, a helper that hands one back — however many modules away.
 * A ledger write is any receiver's create, createMany, createManyAndReturn or upsert on `messagingConsent`, or raw SQL
 * that inserts into or updates the table.
 * ⚠️ A READER IS NOT A WRITER: the card's prefill names `WORDING_DEFAULTS`, and nothing that writes imports the card.
 * The homes are the definitions, and loading one for its rules is how a writer reaches `currentWording` at all, so the
 * walk never continues through a home. `import type` is erased at build and is never followed.
 * ⚠️ WHAT IT DOES NOT SEE, said so nobody reads it as more: a default read by a key built at run time
 * (`entry[name]`), or copied out whole (`Object.values(entry)`); a ledger delegate taken off by destructuring
 * (`const { messagingConsent } = db`). The runtime half covers those paths — `importConsentWording` composes from saved
 * versions only, and the door refuses `wording_unsaved` and never hands out the catalogue entry (U33.sav1, U33.in6,
 * `test:marketing-wordings` W1).
 */
export function defaultReachOf(sources: readonly WalkedSource[], d: DefaultDefect = {}): DefaultReach {
  const byRel = new Map(sources.filter((s) => s.rel.startsWith("src/")).map((s) => [s.rel, s] as const));
  const all = [...byRel.values()];
  const files = new Set(byRel.keys());
  const homes = new Set(DEFAULT_HOMES);
  const resolve = (from: string, spec: string): string | null => {
    if (d.aliasOnly && !spec.startsWith("@/")) return null;
    if (d.noJsSpelling && JS_SPELLING.test(spec)) return null;
    return resolveSpec(from, spec, files);
  };

  // The value edges: every specifier that is not type-only and lands on a file of the population.
  const edges = new Map<string, string[]>();
  let edgeCount = 0;
  for (const s of all) {
    const to: string[] = [];
    for (const l of s.specs) {
      const r = l.typeOnly ? null : resolve(s.rel, l.spec);
      if (r !== null && r !== s.rel) to.push(r);
    }
    edges.set(s.rel, to);
    edgeCount += to.length;
  }

  const namesDefault = (s: WalkedSource): boolean =>
    NAMES_DEFAULT.test(s.text) || (!d.noDefaultField && READS_DEFAULT_FIELD.test(s.text));
  const writesLedger = (s: WalkedSource): boolean =>
    (d.narrowWriters ? WRITES_LEDGER_NARROW.test(s.text) : WRITES_LEDGER.test(s.text) || RAW_LEDGER_WRITE.test(s.text));
  const isWriter = (s: WalkedSource): boolean => writesLedger(s) || WRITES_LIST_BASIS.test(s.text)
    || (NAMES_ATTESTATION.test(s.text) && NAMES_WORDING_VERSION.test(s.text));
  const readers = all.filter((s) => (d.homesRead || !homes.has(s.rel)) && namesDefault(s)).map((s) => s.rel);
  const readerSet = new Set(readers);
  const writers = all.filter((s) => !homes.has(s.rel) && isWriter(s)).map((s) => s.rel);

  /** The shortest value-import path from a writer to a default reader (the writer itself counts) — never through a home. */
  const pathToReader = (start: string): string[] | null => {
    if (readerSet.has(start)) return [start];
    if (d.ownTextOnly) return null;
    const prev = new Map<string, string>();
    const seen = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i];
      if (at !== start && homes.has(at)) continue;
      for (const next of edges.get(at) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        prev.set(next, at);
        if (readerSet.has(next)) {
          const path = [next];
          for (let back = prev.get(next); back !== undefined; back = prev.get(back)) path.unshift(back);
          return path;
        }
        queue.push(next);
      }
    }
    return null;
  };

  const violations: DefaultFinding[] = [];
  for (const w of writers) {
    const path = pathToReader(w);
    if (path === null) continue;
    violations.push({ rel: w, why: path.length === 1 ? "names a default wording" : `reaches a default wording: ${path.join(" → ")}` });
  }
  violations.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { files: all.length, edges: edgeCount, writers, readers, violations };
}

function walkSources(): { walked: number; sources: WalkedSource[] } {
  const all = srcFiles();
  return { walked: all.length, sources: all.map((rel) => sourceOf(rel, readFileSync(join(REPO_ROOT, rel), "utf8"))) };
}

const WALK = walkSources();

/* ══ W1c · THE DETECTOR'S OWN CONTROL — a fixed population, in memory ═══════════════════════════════════════════
 * ⛔ A detector that resolves nothing calls the whole tree clean, and its output is indistinguishable from a real
 * pass (the `client-graph-safe` §0 lesson). So U33.draft3 — and `test:marketing-wordings` W1c — run it on sources that
 * are not on disk: every shape it claims to see must be found, and the shapes W1 lets through must pass. */

const LF = String.fromCharCode(10);
const lines = (...l: string[]): string => l.join(LF);

const W1C_RAW: ReadonlyArray<readonly [string, string]> = [
  // ALLOWED · the two homes — the catalogue (the pin's subject; it keeps each default under `defaultWording`, M3) and
  // the card's suggestions: the definitions.
  ["src/lib/marketing/consent-basis.ts", lines(
    'export const CONSENT_BASES = [{ key: "OWN_FORM", firstParty: true, label: "Our own form", defaultWording: "This person agreed to 50pick SMS." }];',
    'export const ADULT_ATTESTATION_WORDING = "They told us they are 18 or older.";',
    "export const consentBasisFor = (k) => CONSENT_BASES.find((b) => b.key === k) ?? null;",
    "export const checkConsentBasisInput = (input, saved) => ({ ok: true, basisKey: input.basisKey, firstParty: true, wording: null });",
  )],
  ["src/lib/marketing/marketing-wordings.ts", lines(
    'import { CONSENT_BASES, ADULT_ATTESTATION_WORDING } from "./consent-basis";',
    'export const WORDING_DEFAULTS = { "adult.consent": ADULT_ATTESTATION_WORDING, "basis.OWN_FORM": CONSENT_BASES[0].defaultWording };',
    "export const appendVersion = (h, text, stamp) => [...h, { v: h.length + 1, text, ...stamp }];",
  )],
  // ALLOWED · the readers load a home for its RULES and name no default.
  ["src/lib/server/marketing/wordings.ts", lines(
    'import { appendVersion } from "@/lib/marketing/marketing-wordings";',
    "export const currentWording = (key) => null;",
    "export const appendSaved = (h, text, stamp) => appendVersion(h, text, stamp);",
  )],
  // ALLOWED · the card's prefill: it names the suggestions, and it writes nothing.
  ["src/app/admin/system/marketing-wordings-form.tsx", lines(
    '"use client";',
    'import { WORDING_DEFAULTS } from "@/lib/marketing/marketing-wordings";',
    'export function MarketingWordingsForm() { return WORDING_DEFAULTS["adult.test"]; }',
  )],
  // ALLOWED · the pin lives OUTSIDE src/, where nothing is a writer: it reads the catalogue's defaults to hash them.
  ["scripts/marketing-consent/consent-basis.mts", lines(
    'import { CONSENT_BASES, ADULT_ATTESTATION_WORDING } from "../../src/lib/marketing/consent-basis.ts";',
    'export const pin = () => [...CONSENT_BASES.map((b) => b.defaultWording), ADULT_ATTESTATION_WORDING].join("|");',
  )],
  // ALLOWED · U33b-L's shape done right: the words and their versions from currentWording, refused on null.
  ["src/lib/server/marketing/list-basis.ts", lines(
    'import { currentWording } from "./wordings";',
    "export async function recordListBasis(db, listId, officerId) {",
    '  const words = currentWording("basis.LICENCE_OUTREACH");',
    '  const adult = currentWording("adult.list");',
    '  if (words === null || adult === null) return { ok: false, reason: "wording_unsaved" };',
    "  return db.contactListBasis.create({ data: { listId, wording: words.text, wordingVersion: words.v, adultWording: adult.text, adultVersion: adult.v, recordedBy: officerId } });",
    "}",
  )],
  // ALLOWED · a ledger writer with the player's OWN sentences, and a default read that is commented out (not one).
  ["src/lib/server/marketing/consent-ledger.ts", lines(
    'import { marketingConsentWording } from "@/lib/marketing/consent-wording";',
    '// import { WORDING_DEFAULTS } from "@/lib/marketing/marketing-wordings";',
    "/* const words = consentBasisFor(key)!.defaultWording; */",
    "export async function appendMarketingConsent(db, row) { await db.messagingConsent.create({ data: { ...row, wording: marketingConsentWording(row.site) } }); }",
  )],
  // ALLOWED · ⭐ M3 · U32's shape done right: the catalogue taken for its KEYS, LABELS and FLAGS, the words from the door's
  // composed SAVED wording — the catalogue is not a default; only its `defaultWording` is.
  ["src/lib/server/marketing/import-labels.ts", lines(
    'import { CONSENT_BASES, checkConsentBasisInput } from "@/lib/marketing/consent-basis";',
    'import { currentWording } from "./wordings";',
    "export async function applyRun(tx, input, saved, rows) {",
    "  const r = checkConsentBasisInput(input, saved);",
    "  if (!r.ok || !r.firstParty || r.wording === null) return { ok: false };",
    "  const label = CONSENT_BASES.find((b) => b.key === r.basisKey)?.label;",
    '  const adult = currentWording("adult.consent");',
    "  await tx.messagingConsent.createMany({ data: rows.map((row) => ({ ...row, wording: r.wording, note: label, adultVersion: adult?.v })) });",
    "}",
  )],
  // FINDING · U32's shape gone wrong: the import writer stores CONSENT_BASES[..].defaultWording, by a RELATIVE path.
  ["src/lib/server/marketing/import-consent.ts", lines(
    'import { CONSENT_BASES } from "../../marketing/consent-basis";',
    "export async function recordImportConsentBatch(tx, rows) {",
    '  const words = CONSENT_BASES.find((b) => b.key === "OWN_FORM").defaultWording;',
    "  await tx.messagingConsent.createMany({ data: rows.map((r) => ({ ...r, wording: words })) });",
    "}",
  )],
  // FINDING · U37c's shape gone wrong: the test attestation built from the card's SUGGESTION.
  ["src/lib/server/marketing/campaign-test-send.ts", lines(
    'import { WORDING_DEFAULTS } from "@/lib/marketing/marketing-wordings";',
    "export function attestationFor(officerId, attemptRef) {",
    '  const testAttestation = { officerId, attemptRef, wordingVersion: 1, text: WORDING_DEFAULTS["adult.test"] };',
    "  return testAttestation;",
    "}",
  )],
  // FINDING · a barrel re-exports the suggestions under ANOTHER NAME, and a list writer records one through it.
  ["src/lib/marketing/index.ts", 'export { WORDING_DEFAULTS as SUGGESTED } from "./marketing-wordings";'],
  ["src/lib/server/marketing/list-basis-bulk.ts", lines(
    'import { SUGGESTED } from "@/lib/marketing";',
    "export async function recordAll(db, listIds) {",
    '  for (const listId of listIds) await db.contactListBasis.create({ data: { listId, adultWording: SUGGESTED["adult.list"] } });',
    "}",
  )],
  // FINDING · a HELPER hands back the default 18+ sentence, and an import writer stores it — both by relative `.js` paths.
  ["src/lib/server/marketing/basis-words.ts", lines(
    'import { ADULT_ATTESTATION_WORDING } from "../../marketing/consent-basis.js";',
    "export const adultWords = () => ADULT_ATTESTATION_WORDING;",
  )],
  ["src/lib/server/marketing/import-run.ts", lines(
    'import { adultWords } from "./basis-words.js";',
    "export async function applyRun(db, row) { await db.messagingConsent.create({ data: { ...row, wording: adultWords() } }); }",
  )],
  // FINDING · a catalogue entry's default chained straight off the lookup — the catalogue never named.
  ["src/lib/server/marketing/import-fix.ts", lines(
    'import { consentBasisFor } from "@/lib/marketing/consent-basis";',
    "export async function fixWording(tx, id, key) {",
    "  const words = consentBasisFor(key)?.defaultWording;",
    "  await tx.messagingConsent.create({ data: { id, wording: words } });",
    "}",
  )],
  // FINDING · ⛔ M3 · the VARIABLE shape: the entry kept in a variable and its default taken a statement later — written
  // through the DAL's own receiver shape, `pc().messagingConsent.create`.
  ["src/lib/server/marketing/import-variable.ts", lines(
    'import { consentBasisFor } from "@/lib/marketing/consent-basis";',
    "export async function recordOne(pc, id, key) {",
    "  const basis = consentBasisFor(key);",
    "  if (basis === null) return;",
    "  const words = basis.defaultWording;",
    "  await pc().messagingConsent.create({ data: { id, wording: words } });",
    "}",
  )],
  // FINDING · ⛔ M3 · the DOOR-RESULT shape: the default read off the door's answer (as it could be while the answer
  // carried the catalogue entry) — written with createManyAndReturn.
  ["src/lib/server/marketing/import-door.ts", lines(
    'import { checkConsentBasisInput } from "@/lib/marketing/consent-basis";',
    "export async function applyRows(tx, input, saved, rows) {",
    "  const r = checkConsentBasisInput(input, saved);",
    "  if (!r.ok) return [];",
    "  return tx.messagingConsent.createManyAndReturn({ data: rows.map((row) => ({ ...row, wording: r.basis.defaultWording })) });",
    "}",
  )],
  // FINDING · ⛔ M3 · the NON-NULL shape, `consentBasisFor(key)!.defaultWording` — written with upsert.
  ["src/lib/server/marketing/import-upsert.ts", lines(
    'import { consentBasisFor } from "@/lib/marketing/consent-basis";',
    "export async function upsertOne(db, id, key) {",
    "  return db.messagingConsent.upsert({ where: { id }, create: { id, wording: consentBasisFor(key)!.defaultWording }, update: {} });",
    "}",
  )],
  // FINDING · ⛔ a RAW-SQL ledger write that stores the default 18+ sentence.
  ["src/lib/server/marketing/import-raw.ts", lines(
    'import { ADULT_ATTESTATION_WORDING } from "@/lib/marketing/consent-basis";',
    "export async function rawInsert(tx, id) {",
    '  await tx.$executeRaw`INSERT INTO "MessagingConsent" ("id", "wording") VALUES (${id}, ${ADULT_ATTESTATION_WORDING})`;',
    "}",
  )],
];

/** ⭐ W1c's fixed population, and exactly the findings it must produce — every one of them, and nothing else. */
export const W1C_CONTROL: { readonly sources: readonly WalkedSource[]; readonly findings: readonly string[] } = {
  sources: W1C_RAW.map(([rel, raw]) => sourceOf(rel, raw)),
  findings: [
    "src/lib/server/marketing/campaign-test-send.ts",
    "src/lib/server/marketing/import-consent.ts",
    "src/lib/server/marketing/import-door.ts",
    "src/lib/server/marketing/import-fix.ts",
    "src/lib/server/marketing/import-raw.ts",
    "src/lib/server/marketing/import-run.ts",
    "src/lib/server/marketing/import-upsert.ts",
    "src/lib/server/marketing/import-variable.ts",
    "src/lib/server/marketing/list-basis-bulk.ts",
  ],
};

/** W1c's verdict on a detector: what it missed and what it flagged wrongly, each named. */
export function controlVerdict(detect: (sources: readonly WalkedSource[]) => DefaultReach): { missed: string[]; overFlagged: string[] } {
  const flagged = [...new Set(detect(W1C_CONTROL.sources).violations.map((v) => v.rel))];
  return {
    missed: W1C_CONTROL.findings.filter((r) => !flagged.includes(r)),
    overFlagged: flagged.filter((r) => !W1C_CONTROL.findings.includes(r)),
  };
}

/* ══ THE IMPLEMENTATION UNDER TEST ═══════════════════════════════════════════════════════════════════════════ */

/** ⭐ The SAVED wordings the catalogue assertions compose with: every default saved once, as an admin who approved the
 *  suggestions as written would leave them. (U33.sav1 asserts the other side: with nothing saved, nothing composes.) */
export const SAVED_DEFAULTS: SavedBasisWordings = {
  basis: Object.fromEntries(CONSENT_BASES.map((b) => [b.key, [b.defaultWording]])),
  adult: [ADULT_ATTESTATION_WORDING],
};

/** Everything the assertions read — the shipped catalogue and functions, or a plant's. */
export type BasisImpl = {
  readonly bases: readonly PinnedConsentBasis[];
  readonly adult: string;
  readonly notice: string;
  /** The saved wordings the assertions compose and recognise with (`SAVED_DEFAULTS`). */
  readonly saved: SavedBasisWordings;
  readonly lookup: (key: string | null | undefined) => PinnedConsentBasis | null;
  readonly compose: (basis: PinnedConsentBasis, saved: SavedBasisWordings) => string | null;
  readonly isAttested: (wording: string | null | undefined, saved: SavedBasisWordings) => boolean;
  readonly isAttestation: (row: ImportAttestationRow, saved: SavedBasisWordings) => boolean;
  readonly check: (input: ConsentBasisInput, saved: SavedBasisWordings) => ConsentBasisCheck;
  readonly evidence: (runId: string, key: ConsentBasisKey, proofNote: string) => string | null;
  /** The ONE way a saved version is made (`marketing-wordings.ts`) — U33.draft1 reads its stamp. */
  readonly append: typeof appendVersion;
  /** The player's pinned SMS sentences (`consent-wording.ts`). */
  readonly smsWordings: readonly string[];
  /** How many src files the W1 walk read — printed and floored, never trusted from a comment. */
  readonly walked: number;
  readonly sources: readonly WalkedSource[];
  /** The W1 detector — injected, so a blinded one can be planted (U33.draft3). */
  readonly detect: (sources: readonly WalkedSource[]) => DefaultReach;
};

export const REAL_BASIS: BasisImpl = {
  bases: CONSENT_BASES,
  adult: ADULT_ATTESTATION_WORDING,
  notice: THIRD_PARTY_NOTICE,
  saved: SAVED_DEFAULTS,
  lookup: consentBasisFor,
  compose: importConsentWording,
  isAttested: isAttestedImportWording,
  isAttestation: isImportAttestation,
  check: checkConsentBasisInput,
  evidence: importConsentEvidence,
  append: appendVersion,
  smsWordings: SMS_CONSENT_WORDINGS.map((w) => w.wording),
  walked: WALK.walked,
  sources: WALK.sources,
  detect: (sources) => defaultReachOf(sources),
};

/* ══ THE PIN ════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE APPEND-ONLY PIN — key|since|firstParty|defaultWording of the first entries, then the 18+ sentence. Appending an
 * entry leaves it unchanged; editing a wording, a flag or a date, removing an entry or reordering changes it.
 * ⭐ It hashes VALUES: M3 renamed the field `wording` → `defaultWording`, the code below changed by that name alone, and
 * the sha did not move (re-derived with sha256sum over the values, never re-taken).
 * ⛔ IT IS NEVER RE-TAKEN (U33w · S14). It pins the four drafts of 2026-10-01 and the 18+ sentence AS DEFAULTS: what a
 * row carries is the version an admin SAVED on the Marketing wordings card, so these bytes never need to move, and a
 * default never gets a ship date (U33.draft1). LICENCE_OUTREACH was appended below them, and the sha did not move.
 * ⛔ Never "update the hash" to make this pass — a red here is an edit to the catalogue's legal defaults.
 */
const PINNED_BASIS_COUNT = 4;
const PINNED_BASIS_SHA = "f9d9ac400b285144";
export const basisSha = (bases: readonly PinnedConsentBasis[], adult: string): string => createHash("sha256")
  .update([...bases.slice(0, PINNED_BASIS_COUNT).map((b) => [b.key, b.since, String(b.firstParty), b.defaultWording].join("|")), adult].join("\n"), "utf8")
  .digest("hex").slice(0, 16);

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════ */

/** Each label once, so a red case names exactly the line it must turn red. */
export const BASIS_LABELS = {
  pin: "U33.pin · ⛔ APPEND-ONLY — the catalogue's entries (key|since|firstParty|defaultWording) and the 18+ sentence are byte-identical to the pin",
  keys: "U33.keys · every key is distinct and found exactly as spelled — a case-folded, padded or prototype key finds NOTHING (C2: refused, never guessed)",
  cat1: "U33.cat1 · ⭐ exactly TWO bases are not consent — THIRD_PARTY and (OD57 · OD58) LICENCE_OUTREACH — and neither composes a wording (neither records a ledger row)",
  cat2: "U33.cat2 · every first-party basis composes ONE wording: its sentence, then the 18+ sentence — naming 50pick, offers, news, SMS and 18",
  cat3: "U33.cat3 · ⛔ the import wordings and the player's SMS sentences are DISJOINT — an import row never passes the player check, no SMS sentence reads as an attestation",
  notice: "U33.notice · the bought-list notice's default says the numbers are stored WITHOUT consent and reach a campaign only once they are on a list recorded under the licence outreach basis, with its 18+ confirmation — and no longer promises they are 'never sent' (OD57 made that false)",
  att1: "U33.att1 · ⭐ every composed wording is attested against the saved versions — and nothing else is: not a basis sentence without its 18+, not the 18+ alone, not a bought list or the licence basis with one glued on, not a near copy",
  att2: "U33.att2 · ⭐ an import attestation is GIVEN, from IMPORT, recorded BY an officer, under a wording composed from SAVED versions — drop any one and it is not one",
  in1: "U33.in1 · an unknown basis key is refused as unknown_basis — never guessed, never defaulted",
  in2: "U33.in2 · a proof note under 10 characters, counted AFTER trimming and collapsing whitespace, is note_too_short — exactly 10 passes",
  in3: "U33.in3 · 501 characters is note_too_long — exactly 500 passes",
  in4: "U33.in4 · ⛔ §5.14 · a note holding a phone number — spaced, +255 with brackets, zero-width joined, full-width, en-dashed, dotted, joined by low lines (vb5: the ONE phone-run rule) — is note_has_phone; eight digits are not one, and (vb5 review m3) neither is a photo's name nor nine digits no operator holds",
  in5: "U33.in5 · ⭐ first-party without the 18+ box is adult_not_attested (only the boolean true attests); a bought list never asks — it passes unticked, and a stale tick is NOT carried onto it",
  in6: "U33.in6 · a complete first-party input passes — the basis by its key with its first-party flag and NEVER the catalogue entry (M3: nothing in the answer can reach a default), the composed SAVED wording, the note collapsed but in the officer's OWN characters ('№4' stays '№4'), the 18+ recorded",
  in7: "U33.in7 · every refusal answers in its OWN sentence — six refusals, six sentences; the phone one tells the officer to remove the number, and an unsaved basis says where an admin saves it",
  in8: "U33.in8 · ⛔ the server door is TOTAL over a hostile request — no body, a number for a key, no note or a numeric note is a refusal, never a throw",
  ev: "U33.ev · the evidence names the run, the basis and the officer's note on one line — `import:<run> basis:<KEY> note:<note>`, whitespace collapsed — and composes NOTHING for a note holding a phone number, a run id that is not one token, or a key outside the catalogue",
  draft1: "U33.draft1 · ⭐ a DEFAULT carries no ship date (every since is 'unshipped'), and a SAVED version carries its own savedAt — appending a version never restamps the ones before it",
  draft2: "U33.draft2 · ⛔ W1 · NO BASIS WRITER NAMES A DEFAULT — over the real src tree, no module that writes a ledger row (any receiver; create, createMany, createManyAndReturn, upsert or raw SQL), a list basis or a test attestation names the card's suggestions, the default 18+ sentence or the default notice, reads a catalogue entry's defaultWording, or reaches one through a barrel or a helper",
  draft3: "U33.draft3 · ⚠️ CONTROL — the W1 detector on a fixed population: it finds a writer reading CONSENT_BASES[..].defaultWording, one reading WORDING_DEFAULTS, one through a barrel, one through a helper (a relative .js import), one chained off consentBasisFor, one through a variable, one off the door's answer, one after a non-null assertion and one by raw SQL — seeing pc().messagingConsent, createManyAndReturn and upsert as writes — and lets the card's prefill, the pin, the catalogue, a writer taking the catalogue's labels and a writer that reads currentWording through",
  sav1: "U33.sav1 · ⛔ W1 at the catalogue · with NOTHING saved no first-party basis composes a wording, no composed default is attested or makes a row an attestation, and the door refuses wording_unsaved — so too with the basis saved but not its 18+ sentence",
  lic1: "U33.lic1 · ⭐ LICENCE_OUTREACH is appended BELOW the pin: not first-party, the ONE licence basis, composing no wording — and its default says the person has not agreed, and names 50pick, the licence and the stop",
  lic2: "U33.lic2 · ⛔ the import door refuses LICENCE_OUTREACH as unknown_basis and no evidence is composed under it — a licence basis is recorded on a list (U33b-L), never on an import run — while the catalogue lookup still finds it",
} as const;

const NOTE_OK = "Kariakoo roadshow, stand 4, signed sheet kept in the office";
const ch = (code: number): string => String.fromCharCode(code);
const ZWSP = ch(0x200b);
const EN_DASH = ch(0x2013);
/** "№" — NFKC would fold it to "No"; the stored note keeps the officer's character. */
const NUMERO_SIGN = ch(0x2116);
/** The same digits in their full-width forms (U+FF10 onward) — what a phone keyboard in CJK mode types. */
const fullWidth = (s: string): string => s.replace(/\d/g, (d) => ch(0xff10 + Number(d)));

type Answer = ConsentBasisCheck | string;
const verdict = (r: Answer): string => (typeof r === "string" ? r : r.ok ? "ok" : r.reason);

export function assertConsentBasis(impl: BasisImpl, tag: string, ok: Ok): void {
  const p = (label: string) => `${tag}${label}`;
  const L = BASIS_LABELS;
  /** ⛔ A throw is an answer too — recorded, never a crash that hides the other assertions. */
  const run = (input: unknown): Answer => {
    try { return impl.check(input as ConsentBasisInput, impl.saved); } catch (e) { return `threw: ${e instanceof Error ? e.message : String(e)}`; }
  };
  const ask = (basisKey: unknown, proofNote: unknown, adultAttested: unknown): Answer => run({ basisKey, proofNote, adultAttested });

  const firstParty = impl.bases.filter((b) => b.firstParty);
  const composed = firstParty.map((b) => impl.compose(b, impl.saved));
  const allComposed = composed.filter((w): w is string => w !== null);

  // ── PIN ──────────────────────────────────────────────────────────────────────────────────────────
  const sha = basisSha(impl.bases, impl.adult);
  ok(p(L.pin), sha === PINNED_BASIS_SHA && impl.bases.length >= PINNED_BASIS_COUNT, `sha ${sha} · ${impl.bases.length} entries`);

  // ── KEYS ─────────────────────────────────────────────────────────────────────────────────────────
  const keys = impl.bases.map((b) => b.key);
  const strays = ["own_form", " OWN_FORM", "OWN_FORM ", "", "toString", "constructor", null, undefined]
    .filter((k) => impl.lookup(k) !== null);
  ok(p(L.keys), keys.length > 0 && new Set(keys).size === keys.length && keys.every((k) => impl.lookup(k)?.key === k) && strays.length === 0,
    `strays=${JSON.stringify(strays)}`);

  // ── THE CATALOGUE ────────────────────────────────────────────────────────────────────────────────
  const notConsent = impl.bases.filter((b) => !b.firstParty);
  ok(p(L.cat1), notConsent.map((b) => b.key).join(",") === "THIRD_PARTY,LICENCE_OUTREACH"
    && notConsent.every((b) => impl.compose(b, impl.saved) === null),
    `not consent: [${notConsent.map((b) => b.key).join(",")}]`);

  const TERMS = ["50pick", "offers", "news", "SMS", "18"];
  const thin = firstParty.filter((b, i) => {
    const w = composed[i];
    return w === null || !w.startsWith(b.defaultWording) || !w.endsWith(` ${impl.adult}`) || !TERMS.every((t) => w.includes(t));
  });
  ok(p(L.cat2), firstParty.length >= 3 && thin.length === 0, `thin: [${thin.map((b) => b.key).join(",")}]`);

  const sms = new Set(impl.smsWordings);
  const shared = allComposed.filter((w) => sms.has(w));
  const smsAttested = impl.smsWordings.filter((w) => impl.isAttested(w, impl.saved));
  ok(p(L.cat3), impl.smsWordings.length > 0 && allComposed.length > 0 && shared.length === 0 && smsAttested.length === 0,
    `${shared.length} shared · ${smsAttested.length} SMS sentence(s) attested`);

  ok(p(L.notice), impl.notice.includes("stored without consent") && impl.notice.includes("only after") && impl.notice.includes("list")
    && impl.notice.includes("licence outreach basis") && impl.notice.includes("18+") && !impl.notice.includes("never sent"),
    impl.notice);

  // ── THE ATTESTATION THE GATE WILL READ ───────────────────────────────────────────────────────────
  const third = impl.bases.find((b) => b.key === "THIRD_PARTY");
  const licenceBasis = impl.bases.find((b) => b.key === "LICENCE_OUTREACH");
  const lookalikes = [
    ...firstParty.map((b) => b.defaultWording), // the basis sentence without its 18+ statement
    impl.adult, // the 18+ statement alone
    ...(third ? [`${third.defaultWording} ${impl.adult}`] : []), // a bought list with an 18+ statement glued on
    ...(licenceBasis ? [`${licenceBasis.defaultWording} ${impl.adult}`] : []), // the licence basis with one glued on
    ...allComposed.map((w) => `${w} `), // a near copy: one trailing space
    ...allComposed.map((w) => w.toUpperCase()), // a near copy: shouted
    "",
  ];
  const wrongly = lookalikes.filter((w) => impl.isAttested(w, impl.saved));
  ok(p(L.att1), allComposed.length >= 3 && allComposed.every((w) => impl.isAttested(w, impl.saved)) && wrongly.length === 0
    && !impl.isAttested(null, impl.saved) && !impl.isAttested(undefined, impl.saved),
    `${wrongly.length} look-alike(s) attested: ${wrongly.map((w) => w.slice(0, 40)).join(" | ")}`);

  const own = allComposed[0] ?? "";
  const row = (over: Partial<ImportAttestationRow>): ImportAttestationRow =>
    ({ status: "GIVEN", source: "IMPORT", recordedBy: "officer-fixture", wording: own, ...over });
  const notOnes: Array<[string, ImportAttestationRow]> = [
    ["recordedBy null", row({ recordedBy: null })],
    ["recordedBy blank", row({ recordedBy: "   " })],
    ["status WITHDRAWN", row({ status: "WITHDRAWN" })],
    ["source OPERATOR", row({ source: "OPERATOR" })],
    ["source PROFILE", row({ source: "PROFILE" })],
    ["an SMS sentence", row({ wording: impl.smsWordings[0] ?? "" })],
    ["a basis sentence without its 18+", row({ wording: firstParty[0]?.defaultWording ?? "" })],
  ];
  const counted = notOnes.filter(([, r]) => impl.isAttestation(r, impl.saved)).map(([n]) => n);
  ok(p(L.att2), own !== "" && impl.isAttestation(row({}), impl.saved) && counted.length === 0, `counted: [${counted.join(", ")}]`);

  // ── THE ONE DOOR ─────────────────────────────────────────────────────────────────────────────────
  const unknowns = ["PURCHASED", "own_form", "", "toString"].map((k) => verdict(ask(k, NOTE_OK, true)));
  ok(p(L.in1), unknowns.every((v) => v === "unknown_basis"), unknowns.join(","));

  const short = ["abcdefghi", "   abcdef    ", "abc    \n   def"].map((n) => verdict(ask("OWN_FORM", n, true)));
  const ten = verdict(ask("OWN_FORM", "abcdefghij", true));
  ok(p(L.in2), short.every((v) => v === "note_too_short") && ten === "ok", `${short.join(",")} · ten=${ten}`);

  const long = verdict(ask("OWN_FORM", "a".repeat(501), true));
  const max = verdict(ask("OWN_FORM", "a".repeat(500), true));
  ok(p(L.in3), long === "note_too_long" && max === "ok", `501=${long} · 500=${max}`);

  const phones = [
    "roadshow 0712 345 678",
    "call +255 (712) 345-678 after six",
    `met at stand 0712${ZWSP}345${ZWSP}678`,
    `roadshow ${fullWidth("0712 345 678")}`,
    `call 0712${EN_DASH}345${EN_DASH}678 after six`,
    "stand 0754.123.456 sign-ups",
    // ⛔ vb5 · the low line joins too — the ONE phone-run rule; the catalogue's own copy let it through.
    "roadshow 0712_345_678 sign-ups",
  ].map((n) => verdict(ask("OWN_EVENT", n, true)));
  // vb5 review m3 · the rule refuses a Tanzanian mobile number, not every nine digits: a photo's name and a figure no
  // operator's prefix holds are kept.
  const notPhones = ["Kariakoo roadshow, 2026, stand 14, 340 sign-ups", "stand 1234 5678 sheet", "photo IMG_20261003_143052.jpg at the stand", "stand 123.456.789 sign-ups"]
    .map((n) => verdict(ask("OWN_EVENT", n, true)));
  ok(p(L.in4), phones.every((v) => v === "note_has_phone") && notPhones.every((v) => v === "ok"), `${phones.join(",")} · ${notPhones.join(",")}`);

  const unticked = verdict(ask("OWN_EVENT", NOTE_OK, false));
  const stringTick = verdict(ask("AGENT_ROSTER", NOTE_OK, "true"));
  const bought = ask("THIRD_PARTY", NOTE_OK, false);
  const boughtTicked = ask("THIRD_PARTY", NOTE_OK, true);
  const boughtOk = (r: Answer) => typeof r !== "string" && r.ok && r.basisKey === "THIRD_PARTY" && r.firstParty === false
    && r.wording === null && r.adultAttested === false;
  ok(p(L.in5), unticked === "adult_not_attested" && stringTick === "adult_not_attested" && boughtOk(bought) && boughtOk(boughtTicked),
    `${unticked},${stringTick},${verdict(bought)},${verdict(boughtTicked)}`);

  const full = ask("AGENT_ROSTER", `  Agent Juma's roster ${NUMERO_SIGN}4,\n   Mwanza   region  `, true);
  const roster = impl.lookup("AGENT_ROSTER");
  // ⛔ M3 · the answer's fields, exactly: the key and the one flag — never the catalogue entry, whose defaultWording a
  // caller could otherwise record.
  const answerKeys = typeof full !== "string" && full.ok ? Object.keys(full).sort().join(",") : "";
  ok(p(L.in6), typeof full !== "string" && full.ok && roster !== null
    && answerKeys === "adultAttested,basisKey,firstParty,ok,proofNote,wording"
    && full.basisKey === "AGENT_ROSTER" && full.firstParty === true
    && full.wording !== null && full.wording === impl.compose(roster, impl.saved)
    && full.proofNote === `Agent Juma's roster ${NUMERO_SIGN}4, Mwanza region` && full.adultAttested === true,
    typeof full === "string" ? full : full.ok ? `fields ${answerKeys} · note ${JSON.stringify(full.proofNote)} · 18+ ${full.adultAttested}` : full.reason);

  /** The door with NOTHING saved — its own refusal, wording_unsaved (U33w). */
  const unsavedDoor = (): Answer => {
    try { return impl.check({ basisKey: "OWN_FORM", proofNote: NOTE_OK, adultAttested: true }, NO_SAVED_WORDINGS); }
    catch (e) { return `threw: ${e instanceof Error ? e.message : String(e)}`; }
  };
  const refusals = [
    ask("PURCHASED", NOTE_OK, true), unsavedDoor(), ask("OWN_FORM", "abc", true), ask("OWN_FORM", "a".repeat(501), true),
    ask("OWN_FORM", "roadshow 0712 345 678", true), ask("OWN_FORM", NOTE_OK, false),
  ];
  const said = refusals.map((r) => (typeof r === "string" || r.ok ? "" : r.sentence));
  ok(p(L.in7), said.every((s) => s.length > 0) && new Set(said).size === refusals.length && said[4].startsWith("Remove the phone number.")
    && said[1].includes("Marketing wordings"),
    said.join(" | ").slice(0, 260));

  const hostile = [run(undefined), run(null), run({}), ask(42, NOTE_OK, true), ask("OWN_FORM", undefined, true), ask("OWN_FORM", 12345678901, true)]
    .map(verdict);
  ok(p(L.in8), hostile.every((v) => v !== "ok" && !v.startsWith("threw")), hostile.join(","));

  // ── THE EVIDENCE ─────────────────────────────────────────────────────────────────────────────────
  const ev = impl.evidence("imp_t1", "OWN_FORM", "  Kariakoo   roadshow\n stand 4 ");
  const composedAnyway = [
    impl.evidence("imp_t1", "OWN_FORM", "roadshow 0712 345 678"), // ⛔ a phone number in the note
    impl.evidence("imp_t1 basis:THIRD_PARTY", "OWN_FORM", NOTE_OK), // a run id that would forge a second basis
    impl.evidence("imp_t1", "PURCHASED" as string as ConsentBasisKey, NOTE_OK), // a key the catalogue does not hold
  ].filter((e) => e !== null);
  ok(p(L.ev), ev === "import:imp_t1 basis:OWN_FORM note:Kariakoo roadshow stand 4" && composedAnyway.length === 0,
    `${JSON.stringify(ev)} · composed anyway: ${JSON.stringify(composedAnyway)}`);

  // ── U33w · THE DEFAULTS ARE SUGGESTIONS ─────────────────────────────────────────────────────────────
  // ⭐ A default has no ship date; the date evidence carries is the saved version's own, and a later save never moves it.
  const undated = impl.bases.filter((b) => b.since !== UNSHIPPED).map((b) => b.key);
  const t1 = "2026-10-04T08:00:00.000Z";
  const t2 = "2026-10-05T09:30:00.000Z";
  const h1 = impl.append([], "The first saved words for the draft check.", { savedAt: t1, savedBy: "officer-d1" });
  const h2 = impl.append(h1, "The second saved words for the draft check.", { savedAt: t2, savedBy: "officer-d2" });
  const stamped = h1.length === 1 && h2.length === 2 && h2[0].savedAt === t1 && h2[1].savedAt === t2
    && JSON.stringify(h2[0]) === JSON.stringify(h1[0]) && h2[1].savedBy === "officer-d2";
  ok(p(L.draft1), undated.length === 0 && stamped,
    `since: ${[...new Set(impl.bases.map((b) => b.since))].join(",")} · savedAt: ${h2.map((v) => v.savedAt).join(",")}`);

  // ⭐ The population is printed and floored, and the import edges are its end-to-end control: a walk that resolves
  // nothing reaches nothing, and its "no writer names a default" would be the silent verdict.
  const prod = impl.detect(impl.sources);
  const found = prod.violations.map((v) => `${v.rel} (${v.why})`);
  ok(p(L.draft2), impl.walked >= 1000 && prod.files >= 1000 && prod.edges >= 2000 && prod.writers.length >= 3 && found.length === 0,
    `walked ${impl.walked} src files · ${prod.files} judged · ${prod.edges} import edges · ${prod.writers.length} basis writer(s) · `
    + `${prod.readers.length} default reader(s) outside the homes [${prod.readers.join(", ")}]`
    + (found.length ? ` · reaching a default: ${found.join(" | ")}` : ""));

  const ctl = controlVerdict(impl.detect);
  ok(p(L.draft3), ctl.missed.length === 0 && ctl.overFlagged.length === 0,
    `missed: [${ctl.missed.join(", ")}] · flagged wrongly: [${ctl.overFlagged.join(", ")}]`);

  // ── ⛔ W1 AT THE CATALOGUE — nothing saved, nothing composed, nothing recognised, the door refuses ─────────
  const none = NO_SAVED_WORDINGS;
  const composedUnsaved = firstParty.map((b) => impl.compose(b, none)).filter((w) => w !== null);
  const defaultsComposed = firstParty.map((b) => `${b.defaultWording} ${impl.adult}`);
  const attestedUnsaved = defaultsComposed.filter((w) => impl.isAttested(w, none));
  const rowsUnsaved = defaultsComposed
    .filter((w) => impl.isAttestation({ status: "GIVEN", source: "IMPORT", recordedBy: "officer-fixture", wording: w }, none));
  const doorWith = (saved: SavedBasisWordings): string => {
    try { return verdict(impl.check({ basisKey: "OWN_FORM", proofNote: NOTE_OK, adultAttested: true }, saved)); }
    catch (e) { return `threw: ${e instanceof Error ? e.message : String(e)}`; }
  };
  const ownForm = impl.lookup("OWN_FORM");
  const basisOnly: SavedBasisWordings = { basis: { OWN_FORM: ownForm ? [ownForm.defaultWording] : [] }, adult: [] };
  const door = [doorWith(none), doorWith(basisOnly)];
  ok(p(L.sav1), firstParty.length >= 3 && composedUnsaved.length === 0 && attestedUnsaved.length === 0 && rowsUnsaved.length === 0
    && door.every((v) => v === "wording_unsaved"),
    `${composedUnsaved.length} composed · ${attestedUnsaved.length} attested · ${rowsUnsaved.length} row(s) · door: ${door.join(",")}`);

  // ── THE LICENCE BASIS (OD57 · OD58) ─────────────────────────────────────────────────────────────────
  const licences = impl.bases.filter((b) => b.licence === true);
  const lic = licences.length === 1 ? licences[0] : null;
  ok(p(L.lic1), lic !== null && lic.key === "LICENCE_OUTREACH" && lic.firstParty === false
    && impl.bases.indexOf(lic) >= PINNED_BASIS_COUNT && impl.compose(lic, impl.saved) === null
    && lic.defaultWording.includes("50pick") && lic.defaultWording.includes("has not agreed") && lic.defaultWording.includes("licence")
    && lic.defaultWording.includes("stop"),
    lic ? `${lic.key} at ${impl.bases.indexOf(lic)} · firstParty ${lic.firstParty}` : `${licences.length} licence bases`);

  const licDoor = verdict(ask("LICENCE_OUTREACH", NOTE_OK, true));
  const licEvidence = impl.evidence("imp_t1", "LICENCE_OUTREACH", NOTE_OK);
  ok(p(L.lic2), licDoor === "unknown_basis" && licEvidence === null && impl.lookup("LICENCE_OUTREACH")?.licence === true,
    `door ${licDoor} · evidence ${JSON.stringify(licEvidence)}`);
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════════════
 * ⚠️ Every member DELEGATES to the shipped function unless its own flag is set, and the runner proves the
 * defect-free model green (§0b) before any plant is read — so a red case can only be blamed on its flag. */

/** vb5 plant only · the note screen as the catalogue kept its own copy before vb5: every separator but the low line. */
const PRE_VB5_SEPARATORS = /[\s.()\[\]+\p{Pd}]/gu;
const PRE_VB5_PHONE_RUN = /\p{Nd}{9,}/u;

/** Any decimal digit, full-width included (the `p{Nd}` property class) — built from its code, never typed. */
const ANY_DIGIT = new RegExp(`${String.fromCharCode(92)}p{Nd}`, "gu");

export type BasisDefect = {
  /** The stored wording loses its 18+ sentence. */
  composeDropsAdult?: boolean;
  /** "Attested" read as a prefix — the basis sentence alone counts. */
  attestedByPrefix?: boolean;
  /** An unsigned row counts as an officer's attestation. */
  recordedByIgnored?: boolean;
  /** The §5.14 digit screen removed from the door. */
  noPhoneScreen?: boolean;
  /** vb5 · the screen as the catalogue kept its own copy before vb5 — every separator but the low line. */
  lowLineNotJoined?: boolean;
  /** The 18+ box ignored. */
  adultIgnored?: boolean;
  /** The 18+ box demanded for a bought list too. */
  adultForEveryBasis?: boolean;
  /** The door reads the request's fields as if the shape were guaranteed. */
  trustsRequestShape?: boolean;
  /** An unknown key defaulted to OWN_FORM instead of refused. */
  unknownDefaults?: boolean;
  /** The 10-character minimum counted on the note as typed — padding clears it. */
  rawLengthMinimum?: boolean;
  /** The 500-character limit drawn at 501. */
  maxOffByOne?: boolean;
  /** The note handed back as typed, not as it is stored. */
  noteStoredRaw?: boolean;
  /** The stored note compatibility-folded (NFKC) — the first draft's shape. */
  noteFolded?: boolean;
  /** Every refusal answers in the same sentence. */
  oneSentence?: boolean;
  /** The evidence carries the note as typed — newlines and all. */
  rawEvidence?: boolean;
  /** The evidence composed whatever it is handed — a number in the note, a forged run id, an unknown key. */
  evidenceUnscreened?: boolean;
  /** The key looked up case-insensitively and trimmed. */
  caseFoldedLookup?: boolean;
  /** U33w · the pre-U33w composer: a first-party wording composed from the catalogue's DEFAULTS, whatever is saved. */
  composeFromDefaults?: boolean;
  /** U33w · recognition against the DEFAULTS, whatever is saved. */
  attestedFromDefaults?: boolean;
  /** U33w · the door lets a first-party basis through with nothing saved — an ok answer with a null wording. */
  doorIgnoresUnsaved?: boolean;
  /** OD57 · OD58 · the import door accepts the licence basis, as it accepts a bought list. */
  doorAcceptsLicence?: boolean;
  /** M3 · the door's answer carries the catalogue entry (and with it the default wording) beside the composed wording. */
  doorReturnsEntry?: boolean;
  /** U33w · appending a version restamps every version before it with the new savedAt. */
  appendRestamps?: boolean;
  /** The W1 detector blinded or widened (U33.draft3). */
  detector?: DefaultDefect;
};

export function basisModel(d: BasisDefect): BasisImpl {
  const real = REAL_BASIS;
  return {
    ...real,
    lookup: d.caseFoldedLookup
      ? (k) => (typeof k === "string" ? CONSENT_BASES.find((b) => b.key.toLowerCase() === k.trim().toLowerCase()) ?? null : null)
      : real.lookup,
    compose: d.composeDropsAdult
      ? (b, saved) => {
        // The saved basis words alone, without the 18+ sentence they must carry.
        if (importConsentWording(b, saved) === null) return null;
        const words = saved.basis[b.key] ?? [];
        return words.length > 0 ? words[words.length - 1] : null;
      }
      : d.composeFromDefaults
        ? (b) => importConsentWording(b, SAVED_DEFAULTS)
        : real.compose,
    isAttested: d.attestedByPrefix
      ? (w) => typeof w === "string" && w.startsWith("This person gave their number")
      : d.attestedFromDefaults
        ? (w) => isAttestedImportWording(w, SAVED_DEFAULTS)
        : real.isAttested,
    isAttestation: d.recordedByIgnored
      ? (r, saved) => isImportAttestation({ ...r, recordedBy: r.recordedBy ?? "anyone" }, saved)
      : real.isAttestation,
    check: (i, saved) => {
      if (d.trustsRequestShape) {
        const body = i as { basisKey: string; proofNote: string; adultAttested: boolean };
        return checkConsentBasisInput({ basisKey: body.basisKey, proofNote: body.proofNote.trim(), adultAttested: body.adultAttested }, saved);
      }
      if (d.doorAcceptsLicence && i?.basisKey === "LICENCE_OUTREACH") {
        // The licence key run through the door as if it were a bought list, and answered as itself.
        const r = checkConsentBasisInput({ ...i, basisKey: "THIRD_PARTY" }, saved);
        return r.ok ? { ...r, basisKey: "LICENCE_OUTREACH" } : r;
      }
      if (d.doorReturnsEntry) {
        // M3 · the answer as it stood before the review: the catalogue entry beside the composed wording.
        const r = checkConsentBasisInput(i, saved);
        return r.ok ? ({ ...r, basis: consentBasisFor(r.basisKey) } as ConsentBasisCheck) : r;
      }
      if (d.doorIgnoresUnsaved) {
        const r = checkConsentBasisInput(i, saved);
        if (r.ok || r.reason !== "wording_unsaved") return r;
        // The rest of the door as it ran before U33w, with the null wording let through on an ok answer.
        const rest = checkConsentBasisInput(i, SAVED_DEFAULTS);
        return rest.ok ? { ...rest, wording: null } : rest;
      }
      if (d.adultIgnored) {
        const r = checkConsentBasisInput({ ...i, adultAttested: true }, saved);
        return r.ok ? { ...r, adultAttested: r.firstParty && i.adultAttested === true } : r;
      }
      if (d.adultForEveryBasis) {
        const r = checkConsentBasisInput(i, saved);
        return r.ok && i.adultAttested !== true
          ? { ok: false, reason: "adult_not_attested", sentence: CONSENT_BASIS_REFUSAL_SENTENCE.adult_not_attested }
          : r;
      }
      if (d.noPhoneScreen) {
        const r = checkConsentBasisInput(i, saved);
        if (r.ok || r.reason !== "note_has_phone") return r;
        // The rest of the door as it runs with the screen gone: the same note with every digit blanked to a letter.
        const rest = checkConsentBasisInput({ ...i, proofNote: normalizeProofNote(i.proofNote).replace(ANY_DIGIT, "x") }, saved);
        return rest.ok ? { ...rest, proofNote: normalizeProofNote(i.proofNote) } : rest;
      }
      if (d.lowLineNotJoined) {
        const r = checkConsentBasisInput(i, saved);
        const note = normalizeProofNote(i?.proofNote);
        // The pre-vb5 screen still catches every other spelling; only a number joined by low lines slips past it, and
        // the rest of the door then runs on the same note with every digit blanked to a letter.
        if (r.ok || r.reason !== "note_has_phone" || PRE_VB5_PHONE_RUN.test(note.normalize("NFKC").replace(PRE_VB5_SEPARATORS, ""))) return r;
        const rest = checkConsentBasisInput({ ...i, proofNote: note.replace(ANY_DIGIT, "x") }, saved);
        return rest.ok ? { ...rest, proofNote: note } : rest;
      }
      if (d.unknownDefaults) {
        // A key the catalogue does not hold becomes OWN_FORM instead of a refusal.
        return checkConsentBasisInput(consentBasisFor(i?.basisKey) ? i : { ...i, basisKey: "OWN_FORM" }, saved);
      }
      if (d.rawLengthMinimum) {
        const r = checkConsentBasisInput(i, saved);
        const typed = typeof i?.proofNote === "string" ? i.proofNote : "";
        if (r.ok || r.reason !== "note_too_short" || Array.from(typed).length < PROOF_NOTE_MIN) return r;
        // The note AS TYPED cleared the minimum, so the door goes on to the 18+ box.
        const note = normalizeProofNote(typed);
        const rest = checkConsentBasisInput({ ...i, proofNote: note.padEnd(PROOF_NOTE_MIN, "x") }, saved);
        return rest.ok ? { ...rest, proofNote: note } : rest;
      }
      if (d.maxOffByOne) {
        const r = checkConsentBasisInput(i, saved);
        if (r.ok || r.reason !== "note_too_long" || proofNoteChars(i?.proofNote) > PROOF_NOTE_MAX + 1) return r;
        // The limit drawn at 501, so a 501-character note goes on to the 18+ box.
        const note = normalizeProofNote(i?.proofNote);
        const rest = checkConsentBasisInput({ ...i, proofNote: Array.from(note).slice(0, PROOF_NOTE_MAX).join("") }, saved);
        return rest.ok ? { ...rest, proofNote: note } : rest;
      }
      if (d.noteStoredRaw) {
        const r = checkConsentBasisInput(i, saved);
        return r.ok ? { ...r, proofNote: typeof i?.proofNote === "string" ? i.proofNote : "" } : r;
      }
      if (d.noteFolded) {
        const r = checkConsentBasisInput(i, saved);
        return r.ok ? { ...r, proofNote: r.proofNote.normalize("NFKC") } : r;
      }
      if (d.oneSentence) {
        const r = checkConsentBasisInput(i, saved);
        return r.ok ? r : { ...r, sentence: CONSENT_BASIS_REFUSAL_SENTENCE.unknown_basis };
      }
      return real.check(i, saved);
    },
    evidence: d.rawEvidence
      ? (runId, key, note) => `import:${runId} basis:${key} note:${note}`
      : d.evidenceUnscreened
        ? (runId, key, note) => `import:${runId} basis:${key} note:${normalizeProofNote(note)}`
        : real.evidence,
    append: d.appendRestamps
      ? (h, text, stamp) => appendVersion(h, text, stamp).map((v) => ({ ...v, savedAt: stamp.savedAt }))
      : real.append,
    detect: d.detector ? (sources) => defaultReachOf(sources, d.detector) : real.detect,
  };
}

export type BasisCase = { readonly name: string; readonly expect: string; readonly impl: BasisImpl };

/** The red cases, built only under `--prove-red`. ⛔ A plant that changes nothing proves nothing — it is reported. */
export function basisCases(problems: string[]): BasisCase[] {
  const L = BASIS_LABELS;
  const edited = (key: ConsentBasisKey, edit: (b: PinnedConsentBasis) => PinnedConsentBasis): readonly PinnedConsentBasis[] => {
    const out = CONSENT_BASES.map((b) => (b.key === key ? edit(b) : b));
    if (JSON.stringify(out) === JSON.stringify(CONSENT_BASES)) problems.push(`basis plant on ${key} changed nothing`);
    return out;
  };
  const ownForm = importConsentWording(consentBasisFor("OWN_FORM"), SAVED_DEFAULTS);
  if (ownForm === null) problems.push("basis plant: OWN_FORM composes no wording to append to the SMS list");
  const [first, second, ...rest] = CONSENT_BASES;
  /** A basis writer as somebody would write it wrongly — not on disk — added to the REAL population. */
  const withWriter = (rel: string, raw: string): BasisImpl => ({ ...REAL_BASIS, sources: [...REAL_BASIS.sources, sourceOf(rel, raw)] });

  return [
    {
      name: "one character of OWN_FORM's wording changed ('SMS.' → 'SMS!') — evidence edited after the fact",
      expect: L.pin,
      impl: { ...REAL_BASIS, bases: edited("OWN_FORM", (b) => ({ ...b, defaultWording: b.defaultWording.replace(/SMS[.]$/, "SMS!") })) },
    },
    {
      name: "the AGENT_ROSTER entry removed — every roster consent orphaned",
      expect: L.pin,
      impl: { ...REAL_BASIS, bases: CONSENT_BASES.filter((b) => b.key !== "AGENT_ROSTER") },
    },
    {
      name: "the first two entries swapped",
      expect: L.pin,
      impl: { ...REAL_BASIS, bases: [second, first, ...rest] },
    },
    {
      name: "🔴 the consent-wording saga again — a default given the day it was drafted as its since",
      expect: L.draft1,
      impl: { ...REAL_BASIS, bases: edited("OWN_FORM", (b) => ({ ...b, since: "2026-10-01" })) },
    },
    {
      name: "appending a version restamps the versions before it — version 1 now claims version 2's savedAt",
      expect: L.draft1,
      impl: basisModel({ appendRestamps: true }),
    },
    {
      name: "⛔ W1 skipped — U33b-L's list writer records the card's SUGGESTION as the 18+ confirmation (WORDING_DEFAULTS)",
      expect: L.draft2,
      impl: withWriter("src/lib/server/marketing/list-basis.ts", lines(
        'import { WORDING_DEFAULTS } from "@/lib/marketing/marketing-wordings";',
        "export async function recordListBasis(db, listId) {",
        '  return db.contactListBasis.create({ data: { listId, adultWording: WORDING_DEFAULTS["adult.list"], adultVersion: 0 } });',
        "}",
      )),
    },
    {
      name: "⛔ W1 skipped — U32's import writer stores the catalogue's default wording (CONSENT_BASES[..].defaultWording) by a relative import",
      expect: L.draft2,
      impl: withWriter("src/lib/server/marketing/import-consent.ts", lines(
        'import { CONSENT_BASES } from "../../marketing/consent-basis";',
        "export async function recordImportConsentBatch(tx, rows) {",
        "  await tx.messagingConsent.createMany({ data: rows.map((r) => ({ ...r, wording: CONSENT_BASES[0].defaultWording })) });",
        "}",
      )),
    },
    {
      name: "⛔ M3 · W1 skipped the DAL's way — a variable's defaultWording written through pc().messagingConsent.create",
      expect: L.draft2,
      impl: withWriter("src/lib/server/marketing/import-dal.ts", lines(
        'import { consentBasisFor } from "@/lib/marketing/consent-basis";',
        "export async function recordOne(pc, id, key) {",
        "  const basis = consentBasisFor(key);",
        "  if (basis !== null) await pc().messagingConsent.create({ data: { id, wording: basis.defaultWording } });",
        "}",
      )),
    },
    {
      name: "the detector reads only the writer's own text — a barrel or a helper launders a default into it",
      expect: L.draft3,
      impl: basisModel({ detector: { ownTextOnly: true } }),
    },
    {
      name: "the detector resolves only `@/` specifiers — a relative import walks past it",
      expect: L.draft3,
      impl: basisModel({ detector: { aliasOnly: true } }),
    },
    {
      name: "the detector does not read TypeScript's ESM spelling — a `./x.js` specifier naming x.ts walks past it",
      expect: L.draft3,
      impl: basisModel({ detector: { noJsSpelling: true } }),
    },
    {
      name: "M3 · the detector does not see defaultWording — a default read off the catalogue (chained, a variable, the door's answer, after `!`) walks past",
      expect: L.draft3,
      impl: basisModel({ detector: { noDefaultField: true } }),
    },
    {
      name: "the writer test narrowed back — pc().messagingConsent, createManyAndReturn, upsert and raw SQL are not seen as ledger writes",
      expect: L.draft3,
      impl: basisModel({ detector: { narrowWriters: true } }),
    },
    {
      name: "the detector counts a HOME as a reader — the writer that reads currentWording would stall the build",
      expect: L.draft3,
      impl: basisModel({ detector: { homesRead: true } }),
    },
    {
      name: "THIRD_PARTY flagged first-party — a bought list would record consent",
      expect: L.cat1,
      impl: { ...REAL_BASIS, bases: edited("THIRD_PARTY", (b) => ({ ...b, firstParty: true })) },
    },
    {
      name: "⛔ LICENCE_OUTREACH flagged first-party — the licence basis would read as a consent nobody gave",
      expect: L.lic1,
      impl: { ...REAL_BASIS, bases: edited("LICENCE_OUTREACH", (b) => ({ ...b, firstParty: true })) },
    },
    {
      name: "the stored wording drops the 18+ sentence — the gate would read an attestation nobody made",
      expect: L.cat2,
      impl: basisModel({ composeDropsAdult: true }),
    },
    {
      name: "an import wording appended to the player's SMS sentences — an import row would pass the player check",
      expect: L.cat3,
      impl: { ...REAL_BASIS, smsWordings: [...REAL_BASIS.smsWordings, ownForm ?? ""] },
    },
    {
      name: "the bought-list notice softened to 'These numbers will be stored.'",
      expect: L.notice,
      impl: { ...REAL_BASIS, notice: "These numbers will be stored." },
    },
    {
      name: "🔴 the bought-list notice put back as it read before OD57 — 'never sent a marketing SMS', now false",
      expect: L.notice,
      impl: { ...REAL_BASIS, notice: "These numbers will be stored and never sent a marketing SMS. A bought or third-party list is not consent." },
    },
    {
      name: "attested read as a prefix — a basis sentence with no 18+ statement counts",
      expect: L.att1,
      impl: basisModel({ attestedByPrefix: true }),
    },
    {
      name: "recordedBy ignored — an unsigned row counts as an officer's attestation",
      expect: L.att2,
      impl: basisModel({ recordedByIgnored: true }),
    },
    {
      name: "an unknown key defaulted to OWN_FORM — 'PURCHASED' is guessed into a first-party consent",
      expect: L.in1,
      impl: basisModel({ unknownDefaults: true }),
    },
    {
      name: "the 10-character minimum counted on the note as typed — '   abcdef    ' clears it on padding",
      expect: L.in2,
      impl: basisModel({ rawLengthMinimum: true }),
    },
    {
      name: "the 500-character limit drawn at 501 — a 501-character note passes",
      expect: L.in3,
      impl: basisModel({ maxOffByOne: true }),
    },
    {
      name: "⛔ the digit screen removed — a phone number rides into seven-year evidence",
      expect: L.in4,
      impl: basisModel({ noPhoneScreen: true }),
    },
    {
      name: "vb5 · the catalogue's own screen again, without the low line — '0712_345_678' rides into seven-year evidence",
      expect: L.in4,
      impl: basisModel({ lowLineNotJoined: true }),
    },
    {
      name: "the 18+ box ignored — a first-party run with no age statement records one",
      expect: L.in5,
      impl: basisModel({ adultIgnored: true }),
    },
    {
      name: "the 18+ box demanded for a bought list — an attestation asked where nothing can carry it",
      expect: L.in5,
      impl: basisModel({ adultForEveryBasis: true }),
    },
    {
      name: "the note handed back as typed — leading spaces and a newline ride into the evidence",
      expect: L.in6,
      impl: basisModel({ noteStoredRaw: true }),
    },
    {
      name: "the stored note compatibility-folded (the first draft) — '№4' becomes 'No4' in seven-year evidence",
      expect: L.in6,
      impl: basisModel({ noteFolded: true }),
    },
    {
      name: "⛔ M3 · the door answers with the catalogue entry beside the wording — a caller can reach its defaultWording",
      expect: L.in6,
      impl: basisModel({ doorReturnsEntry: true }),
    },
    {
      name: "every refusal answers in the same sentence — the officer is never told to remove the number",
      expect: L.in7,
      impl: basisModel({ oneSentence: true }),
    },
    {
      name: "the door trusts the request's shape — a missing body throws instead of refusing",
      expect: L.in8,
      impl: basisModel({ trustsRequestShape: true }),
    },
    {
      name: "the evidence carries the note as typed — a newline inside ledger evidence",
      expect: L.ev,
      impl: basisModel({ rawEvidence: true }),
    },
    {
      name: "⛔ the evidence composes whatever it is handed — a raw note puts a phone number into seven-year evidence",
      expect: L.ev,
      impl: basisModel({ evidenceUnscreened: true }),
    },
    {
      name: "the key looked up case-insensitively — 'own_form' is guessed into OWN_FORM",
      expect: L.keys,
      impl: basisModel({ caseFoldedLookup: true }),
    },
    {
      name: "⛔ the pre-U33w composer — a first-party wording composed from the catalogue's DEFAULTS with nothing saved",
      expect: L.sav1,
      impl: basisModel({ composeFromDefaults: true }),
    },
    {
      name: "⛔ recognition against the DEFAULTS — a row under words nobody saved reads as an attestation",
      expect: L.sav1,
      impl: basisModel({ attestedFromDefaults: true }),
    },
    {
      name: "⛔ the door lets a first-party basis through with nothing saved — an ok answer with a null wording",
      expect: L.sav1,
      impl: basisModel({ doorIgnoresUnsaved: true }),
    },
    {
      name: "⛔ the import door accepts LICENCE_OUTREACH like a bought list — a run 'under the licence' records nothing and looks as if it had",
      expect: L.lic2,
      impl: basisModel({ doorAcceptsLicence: true }),
    },
  ];
}
