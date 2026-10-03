/**
 * test:marketing-consent · section U33a — THE CONSENT-BASIS CATALOGUE (`src/lib/marketing/consent-basis.ts`), pure.
 *                                                                                              (S10, 2026-10-01)
 *
 * ⭐ WHAT THIS SECTION HOLDS. The catalogue alone, EXECUTED: the append-only pin, the ONE basis that is not
 * consent, the composed wordings (sender, content, channel, 18+), their distance from the player's SMS sentences,
 * the attestation test the gate will call, the ONE input door the panel and the start action share, the evidence
 * string — and G4: while Ali has not confirmed the drafts, nothing in production reaches them.
 *
 * ⚠️ G4 · WHAT "NOTHING IN PRODUCTION" MEANS (the lead's Option A, 2026-10-01, recorded in plan §0h). U33.draft2
 * walks the real src tree and, while the state is DRAFT, fails if a PRODUCTION ENTRY POINT — any file under
 * src/app, any "use server" module, the boot hook (`instrumentation.ts`) or the proxy — names the catalogue or the
 * import writer, calls `recordImportConsentBatch(` / `fixConsentBasis(`, imports a barrel that re-exports either,
 * or reaches a draft writer through its imports, however many modules away. So U33a's engine commit MAY land with
 * the writer (`import-consent.ts`) UNCALLED and the gate's contact branch reading `isImportAttestation`; their own
 * tests (U33.w*, U33.g*) assert against the real store in the runner, not here. The first PRODUCTION caller —
 * U32's commit action, U33b's panel — is what stops at G4. U33.draft3 is the detector's own control: a fixed
 * population in memory with every shape it claims to see, and the shapes it must let through.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. Every assertion reads an injected `BasisImpl`. `--prove-red` plants each defect
 * IN MEMORY — an edited copy of the catalogue, a wrapper around a shipped function, a source that is not on disk,
 * a blinded detector — and the runner requires the MATCHING assertion to fail. This module READS src/ for G4 and
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
  CONSENT_BASES, CONSENT_BASIS_G4, ADULT_ATTESTATION_WORDING, THIRD_PARTY_NOTICE, UNSHIPPED, CONSENT_BASIS_REFUSAL_SENTENCE,
  PROOF_NOTE_MIN, PROOF_NOTE_MAX,
  consentBasisFor, importConsentWording, isAttestedImportWording, isImportAttestation, checkConsentBasisInput,
  importConsentEvidence, normalizeProofNote, proofNoteChars,
} from "../../src/lib/marketing/consent-basis.ts";
import type {
  PinnedConsentBasis, ConsentBasisG4, ConsentBasisInput, ConsentBasisCheck, ConsentBasisKey, ImportAttestationRow,
} from "../../src/lib/marketing/consent-basis.ts";
import { SMS_CONSENT_WORDINGS } from "../../src/lib/marketing/consent-wording.ts";

export type Ok = (label: string, cond: boolean, detail?: string) => void;

/* ══ G4 · THE PRODUCTION SURFACE — every src file, read from the REAL tree ══════════════════════════════════ */

/** One module specifier a source loads. `typeOnly`: `import type` / `export type` — erased at build, never followed. */
export type LoadedSpec = { readonly spec: string; readonly typeOnly: boolean; readonly reexport: boolean };

/** One src file as the G4 walk read it: decommented (a commented-out import is not an import), whether its first
 *  statement is "use server", and every specifier it loads. */
export type WalkedSource = {
  readonly rel: string;
  readonly text: string;
  readonly useServer: boolean;
  readonly specs: readonly LoadedSpec[];
};

/** A production entry point that reaches the drafts, and how. */
export type DraftFinding = { readonly rel: string; readonly why: string };

/** What the G4 detector found over one population — every count printed, every finding named. */
export type DraftReach = {
  /** Production entry points: every file under src/app, every "use server" module, the boot hook and the proxy. */
  readonly entries: number;
  readonly serverActions: number;
  /** Value-import edges resolved inside src. */
  readonly edges: number;
  /** Modules that create ledger rows, and the entry points that reach one through at least one import — the walk's
   *  end-to-end control: a walk that resolves nothing reaches nothing, and its "nothing reaches the drafts" would be
   *  the silent verdict. */
  readonly ledgerWriters: number;
  readonly reachLedger: number;
  /** Modules that would STORE a draft: the import writer's own module, or one that loads the catalogue and writes. */
  readonly writers: readonly string[];
  readonly violations: readonly DraftFinding[];
};

const CATALOGUE_REL = "src/lib/marketing/consent-basis.ts";
/** A string literal naming the catalogue's module by any path and any script extension — static import, re-export,
 *  dynamic import, require. Read on an ENTRY's text: while DRAFT an entry may not name it at all. */
const NAMES_CATALOGUE = /["'`](?:[^"'`\n]*\/)?consent-basis(?:\.[cm]?[jt]sx?)?["'`]/;
/** …and the import writer's module (U33a's engine commit adds `src/lib/server/marketing/import-consent.ts`). */
const NAMES_WRITER = /["'`](?:[^"'`\n]*\/)?import-consent(?:\.[cm]?[jt]sx?)?["'`]/;
/** The same two names as a loaded specifier — read for re-exports (barrels) and for a module that loads the catalogue. */
const CATALOGUE_SPEC = /(?:^|\/)consent-basis(?:\.[cm]?[jt]sx?)?$/;
const WRITER_SPEC = /(?:^|\/)import-consent(?:\.[cm]?[jt]sx?)?$/;
const WRITER_FILE = /(?:^|\/)import-consent\.[cm]?[jt]sx?$/;
/** ⛔ The two calls that STORE a draft: the import writer's batch, and a run's write-once basis (the U33 spec's name). */
const WRITER_CALL = /\b(?:recordImportConsentBatch|fixConsentBasis)\s*\(/;
/** ⛔ A LEDGER WRITE by any receiver — `db.`, a transaction's `tx.`, `prisma.` — and the batch form too. */
const LEDGER_WRITE = /\b\w+\.messagingConsent\.(?:create|createMany)\b/;
/** Next's entry points outside src/app: the boot hook and the request proxy (Next 16's name for middleware). */
const ROOT_ENTRY = /^src\/(?:instrumentation(?:-\w+)?|proxy|middleware)\.[cm]?[jt]sx?$/;

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

/** ⭐ THE ONE DOOR into a G4 population: the real tree and every planted source are read the same way. */
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

/** Every flag off is the shipped detector; each flag blinds or widens ONE thing — U33.draft3's plants. */
export type DetectorDefect = {
  /** Only `@/` specifiers resolve — a relative import walks past. */
  aliasOnly?: boolean;
  /** The catalogue known only as `consent-basis` or `consent-basis.ts` (the first draft's matcher) — `.js` walks past. */
  tsOnlyName?: boolean;
  /** Only an entry's own text is read — a writer one import away is invisible. */
  entryTextOnly?: boolean;
  /** Re-exports not followed — a barrel launders the catalogue into a page. */
  noBarrels?: boolean;
  /** The rule Option A replaced: every module that loads the catalogue is a finding, so the UNCALLED writer and the
   *  gate's read stall the build. */
  everyImporter?: boolean;
};

/**
 * ⭐ THE G4 DETECTOR. While the wordings are DRAFT, no production entry point may reach them:
 * · an entry may not NAME the catalogue or the import writer, nor call `recordImportConsentBatch(` / `fixConsentBasis(`;
 * · an entry may not import a BARREL that re-exports either (barrels of barrels included);
 * · no entry may REACH a draft writer through its value imports, however many modules away — so U32's commit
 *   action is caught through `commitBatch` though it never names the writer itself.
 * ⚠️ A READER IS NOT A WRITER. The gate (`consent.ts`) may load the catalogue to read `isImportAttestation`, and an
 * entry may reach the gate: reading a draft stores nothing (Option A). `import type` is erased at build and is not
 * followed — but an entry may not NAME the catalogue even for a type.
 */
export function draftReachOf(sources: readonly WalkedSource[], d: DetectorDefect = {}): DraftReach {
  const byRel = new Map(sources.map((s) => [s.rel, s] as const));
  const all = [...byRel.values()];
  const files = new Set(byRel.keys());
  const resolve = (from: string, spec: string): string | null =>
    d.aliasOnly && !spec.startsWith("@/") ? null : resolveSpec(from, spec, files);
  const namesCatalogue = d.tsOnlyName ? /["'`](?:[^"'`\n]*\/)?consent-basis(?:\.ts)?["'`]/ : NAMES_CATALOGUE;
  const catalogueSpec = d.tsOnlyName ? /(?:^|\/)consent-basis(?:\.ts)?$/ : CATALOGUE_SPEC;
  const isEntry = (s: WalkedSource): boolean => s.rel.startsWith("src/app/") || s.useServer || ROOT_ENTRY.test(s.rel);

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

  // Barrels: a module that re-exports the catalogue or the writer — by name, or through another barrel.
  const barrels = new Set<string>();
  if (!d.noBarrels) {
    for (let grew = true; grew;) {
      grew = false;
      for (const s of all) {
        if (barrels.has(s.rel)) continue;
        const relays = s.specs.some((l) => {
          if (!l.reexport || l.typeOnly) return false;
          if (catalogueSpec.test(l.spec) || WRITER_SPEC.test(l.spec)) return true;
          const r = resolve(s.rel, l.spec);
          return r !== null && barrels.has(r);
        });
        if (relays) { barrels.add(s.rel); grew = true; }
      }
    }
  }
  const viaBarrel = (s: WalkedSource): string | undefined => (edges.get(s.rel) ?? []).find((r) => barrels.has(r));

  /** Loads the catalogue as a value — by name, or through a barrel. */
  const loadsCatalogue = (s: WalkedSource): boolean =>
    s.specs.some((l) => !l.typeOnly && catalogueSpec.test(l.spec)) || viaBarrel(s) !== undefined;
  const writesLedger = (s: WalkedSource): boolean => s.text.includes(".messagingConsent.create") && LEDGER_WRITE.test(s.text);
  const callsWriter = (s: WalkedSource): boolean =>
    (s.text.includes("recordImportConsentBatch") || s.text.includes("fixConsentBasis")) && WRITER_CALL.test(s.text);

  // A DRAFT WRITER: the import writer's own module, or a module that loads the catalogue AND writes with it.
  const writers = all.filter((s) => s.rel !== CATALOGUE_REL
    && (WRITER_FILE.test(s.rel) || ((writesLedger(s) || callsWriter(s)) && loadsCatalogue(s)))).map((s) => s.rel);
  const ledger = all.filter(writesLedger).map((s) => s.rel);

  const reverse = new Map<string, string[]>();
  for (const [from, tos] of edges) {
    for (const to of tos) {
      const back = reverse.get(to);
      if (back) back.push(from); else reverse.set(to, [from]);
    }
  }
  /** Every module from which one of `targets` is reachable through value imports — the targets included. */
  const reaching = (targets: readonly string[]): Set<string> => {
    const seen = new Set(targets);
    if (d.entryTextOnly) return seen;
    const stack = [...targets];
    for (let at = stack.pop(); at !== undefined; at = stack.pop()) {
      for (const from of reverse.get(at) ?? []) if (!seen.has(from)) { seen.add(from); stack.push(from); }
    }
    return seen;
  };
  const writerSet = new Set(writers);
  /** The shortest import path from an entry to a draft writer, for the finding's text. */
  const pathToWriter = (start: string): string => {
    const prev = new Map<string, string>();
    const seen = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i];
      if (writerSet.has(at)) {
        const path = [at];
        for (let back = prev.get(at); back !== undefined; back = prev.get(back)) path.unshift(back);
        return path.join(" → ");
      }
      for (const next of edges.get(at) ?? []) if (!seen.has(next)) { seen.add(next); prev.set(next, at); queue.push(next); }
    }
    return "a draft writer";
  };

  const entries = all.filter(isEntry);
  const reachWriter = reaching(writers);
  const ledgerSet = new Set(ledger);
  const reachLedgerSet = reaching(ledger);
  const violations: DraftFinding[] = [];
  for (const e of entries) {
    const why: string[] = [];
    if (e.text.includes("consent-basis") && namesCatalogue.test(e.text)) why.push("names the catalogue");
    if (e.text.includes("import-consent") && NAMES_WRITER.test(e.text)) why.push("names the import writer");
    if (callsWriter(e)) why.push("calls recordImportConsentBatch / fixConsentBasis");
    const barrel = viaBarrel(e);
    if (barrel !== undefined) why.push(`imports a barrel of it (${barrel})`);
    if (reachWriter.has(e.rel)) why.push(`reaches a draft writer: ${pathToWriter(e.rel)}`);
    if (why.length) violations.push({ rel: e.rel, why: why.join("; ") });
  }
  if (d.everyImporter) for (const s of all) if (!isEntry(s) && loadsCatalogue(s)) violations.push({ rel: s.rel, why: "loads the catalogue" });
  violations.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return {
    entries: entries.length,
    serverActions: entries.filter((e) => e.useServer).length,
    edges: edgeCount,
    ledgerWriters: ledger.length,
    reachLedger: entries.filter((e) => reachLedgerSet.has(e.rel) && !ledgerSet.has(e.rel)).length,
    writers,
    violations,
  };
}

function walkSources(): { walked: number; sources: WalkedSource[] } {
  const all = srcFiles();
  return { walked: all.length, sources: all.map((rel) => sourceOf(rel, readFileSync(join(REPO_ROOT, rel), "utf8"))) };
}

const WALK = walkSources();

/* ══ G4 · THE DETECTOR'S OWN CONTROL — a fixed population, in memory ════════════════════════════════════════
 * ⛔ A detector that resolves nothing calls the whole tree clean, and its output is indistinguishable from a real
 * pass (the `client-graph-safe` §0 lesson). So U33.draft3 runs it on sources that are not on disk: every shape it
 * claims to see must be found, and the shapes Option A lets through must pass. */

const CONTROL_RAW: ReadonlyArray<readonly [string, string]> = [
  // ALLOWED · the catalogue, and the import writer UNCALLED: it loads the catalogue by a RELATIVE path and writes the
  // ledger inside a transaction, and only the two FINDING entries below reach it.
  ["src/lib/marketing/consent-basis.ts", "export const CONSENT_BASES = [];"],
  ["src/lib/server/marketing/import-consent.ts", [
    'import { importConsentWording } from "../../marketing/consent-basis";',
    "export async function recordImportConsentBatch(tx, rows) {",
    "  await tx.messagingConsent.createMany({ data: rows.map((r) => ({ ...r, wording: importConsentWording(r.basis) })) });",
    "}",
  ].join("\n")],
  // ALLOWED · the gate READS the catalogue, and a player action reaches the gate; its commented-out import is not one.
  ["src/lib/server/marketing/consent.ts", [
    'import { isImportAttestation } from "@/lib/marketing/consent-basis";',
    "export const attested = (row) => isImportAttestation(row);",
  ].join("\n")],
  ["src/app/profile/notifications/actions.ts", [
    '"use server";',
    'import { attested } from "@/lib/server/marketing/consent";',
    '// import { recordImportConsentBatch } from "@/lib/server/marketing/import-consent";',
    "export async function save(row) { return attested(row); }",
  ].join("\n")],
  // FINDING · U32's shape: commitBatch calls the writer by a relative path, and the commit action calls commitBatch.
  ["src/lib/server/contacts/import-commit.ts", [
    'import { recordImportConsentBatch } from "../marketing/import-consent";',
    "export async function commitBatch(tx, rows) { await recordImportConsentBatch(tx, rows); }",
  ].join("\n")],
  ["src/app/admin/contacts/import/import-actions.ts", [
    '"use server";',
    'import { commitBatch } from "@/lib/server/contacts/import-commit";',
    "export async function commitImport() { await commitBatch(null, []); }",
  ].join("\n")],
  // FINDING · U33b's shape: the basis panel names the catalogue by a relative `.js` specifier.
  ["src/app/admin/contacts/import/basis-panel.tsx", [
    '"use client";',
    'import { CONSENT_BASES } from "../../../../lib/marketing/consent-basis.js";',
    "export const count = CONSENT_BASES.length;",
  ].join("\n")],
  // FINDING · a barrel re-exports the catalogue, and a page imports the barrel.
  ["src/lib/marketing/index.ts", 'export * from "./consent-basis";'],
  ["src/app/admin/contacts/barrel-page.tsx", [
    'import { CONSENT_BASES } from "@/lib/marketing";',
    "export default function Page() { return CONSENT_BASES.length; }",
  ].join("\n")],
  // FINDING · a "use server" module OUTSIDE src/app fixes a run's basis.
  ["src/lib/server/contacts/start-run.ts", [
    "'use server';",
    "export async function startRun(db, id, key) { await db.contactImport.fixConsentBasis(id, key); }",
  ].join("\n")],
  // FINDING · the boot hook loads the commit module by a dynamic import.
  ["src/instrumentation.ts", [
    "export async function register() {",
    '  const { commitBatch } = await import("./lib/server/contacts/import-commit");',
    "  return commitBatch;",
    "}",
  ].join("\n")],
];
const CONTROL_SOURCES: readonly WalkedSource[] = CONTROL_RAW.map(([rel, raw]) => sourceOf(rel, raw));
/** Exactly these are findings — every one of them, and nothing else. */
const CONTROL_FINDINGS: readonly string[] = [
  "src/app/admin/contacts/barrel-page.tsx",
  "src/app/admin/contacts/import/basis-panel.tsx",
  "src/app/admin/contacts/import/import-actions.ts",
  "src/instrumentation.ts",
  "src/lib/server/contacts/start-run.ts",
];

/* ══ THE IMPLEMENTATION UNDER TEST ═══════════════════════════════════════════════════════════════════════════ */

/** Everything the assertions read — the shipped catalogue and functions, or a plant's. */
export type BasisImpl = {
  readonly bases: readonly PinnedConsentBasis[];
  readonly adult: string;
  readonly notice: string;
  readonly g4: ConsentBasisG4;
  readonly lookup: (key: string | null | undefined) => PinnedConsentBasis | null;
  readonly compose: (basis: PinnedConsentBasis) => string | null;
  readonly isAttested: (wording: string | null | undefined) => boolean;
  readonly isAttestation: (row: ImportAttestationRow) => boolean;
  readonly check: (input: ConsentBasisInput) => ConsentBasisCheck;
  readonly evidence: (runId: string, key: ConsentBasisKey, proofNote: string) => string | null;
  /** The player's pinned SMS sentences (`consent-wording.ts`). */
  readonly smsWordings: readonly string[];
  /** How many src files the G4 walk read — printed and floored, never trusted from a comment. */
  readonly walked: number;
  readonly sources: readonly WalkedSource[];
  /** The G4 detector — injected, so a blinded one can be planted (U33.draft3). */
  readonly detect: (sources: readonly WalkedSource[]) => DraftReach;
};

export const REAL_BASIS: BasisImpl = {
  bases: CONSENT_BASES,
  adult: ADULT_ATTESTATION_WORDING,
  notice: THIRD_PARTY_NOTICE,
  g4: CONSENT_BASIS_G4,
  lookup: consentBasisFor,
  compose: importConsentWording,
  isAttested: isAttestedImportWording,
  isAttestation: isImportAttestation,
  check: checkConsentBasisInput,
  evidence: importConsentEvidence,
  smsWordings: SMS_CONSENT_WORDINGS.map((w) => w.wording),
  walked: WALK.walked,
  sources: WALK.sources,
  detect: (sources) => draftReachOf(sources),
};

/* ══ THE PIN ════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE APPEND-ONLY PIN — key|since|firstParty|wording of the first entries, then the 18+ sentence. Appending an
 * entry leaves it unchanged; editing a wording, a flag or a date, removing an entry or reordering changes it.
 * ⚠️ G4 · IT PINS THE DRAFTS (2026-10-01). Ali's G4 answer re-takes it ONCE, with every `since` set to the ship
 * date (U33.draft1); from the first production row it is never re-taken. ⛔ Never "update the hash" to make this
 * pass — a red here is an edit to legal evidence.
 */
const PINNED_BASIS_COUNT = 4;
const PINNED_BASIS_SHA = "f9d9ac400b285144";
export const basisSha = (bases: readonly PinnedConsentBasis[], adult: string): string => createHash("sha256")
  .update([...bases.slice(0, PINNED_BASIS_COUNT).map((b) => [b.key, b.since, String(b.firstParty), b.wording].join("|")), adult].join("\n"), "utf8")
  .digest("hex").slice(0, 16);

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════ */

/** Each label once, so a red case names exactly the line it must turn red. */
export const BASIS_LABELS = {
  pin: "U33.pin · ⛔ APPEND-ONLY — the catalogue's entries (key|since|firstParty|wording) and the 18+ sentence are byte-identical to the pin",
  keys: "U33.keys · every key is distinct and found exactly as spelled — a case-folded, padded or prototype key finds NOTHING (C2: refused, never guessed)",
  cat1: "U33.cat1 · ⭐ exactly ONE basis is not consent — THIRD_PARTY — and it composes NO wording (a bought list records no ledger row)",
  cat2: "U33.cat2 · every first-party basis composes ONE wording: its sentence, then the 18+ sentence — naming 50pick, offers, news, SMS and 18",
  cat3: "U33.cat3 · ⛔ the import wordings and the player's SMS sentences are DISJOINT — an import row never passes the player check, no SMS sentence reads as an attestation",
  notice: "U33.notice · the bought-list notice says the numbers are stored, NEVER sent a marketing SMS, and that the list is not consent",
  att1: "U33.att1 · ⭐ every composed wording is attested — and nothing else is: not a basis sentence without its 18+, not the 18+ alone, not a bought list with one glued on, not a near copy",
  att2: "U33.att2 · ⭐ an import attestation is GIVEN, from IMPORT, recorded BY an officer, under an attested wording — drop any one and it is not one",
  in1: "U33.in1 · an unknown basis key is refused as unknown_basis — never guessed, never defaulted",
  in2: "U33.in2 · a proof note under 10 characters, counted AFTER trimming and collapsing whitespace, is note_too_short — exactly 10 passes",
  in3: "U33.in3 · 501 characters is note_too_long — exactly 500 passes",
  in4: "U33.in4 · ⛔ §5.14 · a note holding a phone number — spaced, +255 with brackets, zero-width joined, full-width, en-dashed, dotted, joined by low lines (vb5: the ONE phone-run rule) — is note_has_phone; eight digits are not one, and (vb5 review m3) neither is a photo's name nor nine digits no operator holds",
  in5: "U33.in5 · ⭐ first-party without the 18+ box is adult_not_attested (only the boolean true attests); a bought list never asks — it passes unticked, and a stale tick is NOT carried onto it",
  in6: "U33.in6 · a complete first-party input passes — the catalogue's own entry, the composed wording, the note collapsed but in the officer's OWN characters ('№4' stays '№4'), the 18+ recorded",
  in7: "U33.in7 · every refusal answers in its OWN sentence — five refusals, five sentences; the phone one tells the officer to remove the number",
  in8: "U33.in8 · ⛔ the server door is TOTAL over a hostile request — no body, a number for a key, no note or a numeric note is a refusal, never a throw",
  ev: "U33.ev · the evidence names the run, the basis and the officer's note on one line — `import:<run> basis:<KEY> note:<note>`, whitespace collapsed — and composes NOTHING for a note holding a phone number, a run id that is not one token, or a key outside the catalogue",
  draft1: "U33.draft1 · ⚠️ G4 · a DRAFT claims no ship date (every since is 'unshipped'); once Ali confirms, every since is a real day on or after his confirmation",
  draft2: "U33.draft2 · ⛔ G4 · while the wordings are DRAFT, NOTHING IN PRODUCTION REACHES THEM — no src/app file, 'use server' module, boot hook or proxy names the catalogue or the import writer, calls the writer, imports a barrel of either, or reaches a draft writer through its imports (an UNCALLED writer may land)",
  draft3: "U33.draft3 · ⚠️ CONTROL — the G4 detector on a fixed population: it finds a relative `.js` import, a barrel, a writer two imports away, a dynamic import and a basis write outside src/app — and lets the uncalled writer, the gate's read and a commented-out import through",
} as const;

const NOTE_OK = "Kariakoo roadshow, stand 4, signed sheet kept in the office";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
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
    try { return impl.check(input as ConsentBasisInput); } catch (e) { return `threw: ${e instanceof Error ? e.message : String(e)}`; }
  };
  const ask = (basisKey: unknown, proofNote: unknown, adultAttested: unknown): Answer => run({ basisKey, proofNote, adultAttested });

  const firstParty = impl.bases.filter((b) => b.firstParty);
  const composed = firstParty.map((b) => impl.compose(b));
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
  ok(p(L.cat1), notConsent.length === 1 && notConsent[0].key === "THIRD_PARTY" && impl.compose(notConsent[0]) === null,
    `not consent: [${notConsent.map((b) => b.key).join(",")}]`);

  const TERMS = ["50pick", "offers", "news", "SMS", "18"];
  const thin = firstParty.filter((b, i) => {
    const w = composed[i];
    return w === null || !w.startsWith(b.wording) || !w.endsWith(` ${impl.adult}`) || !TERMS.every((t) => w.includes(t));
  });
  ok(p(L.cat2), firstParty.length >= 3 && thin.length === 0, `thin: [${thin.map((b) => b.key).join(",")}]`);

  const sms = new Set(impl.smsWordings);
  const shared = allComposed.filter((w) => sms.has(w));
  const smsAttested = impl.smsWordings.filter((w) => impl.isAttested(w));
  ok(p(L.cat3), impl.smsWordings.length > 0 && allComposed.length > 0 && shared.length === 0 && smsAttested.length === 0,
    `${shared.length} shared · ${smsAttested.length} SMS sentence(s) attested`);

  ok(p(L.notice), impl.notice.includes("stored") && impl.notice.includes("never sent a marketing SMS") && impl.notice.includes("not consent"),
    impl.notice);

  // ── THE ATTESTATION THE GATE WILL READ ───────────────────────────────────────────────────────────
  const third = impl.bases.find((b) => b.key === "THIRD_PARTY");
  const lookalikes = [
    ...firstParty.map((b) => b.wording), // the basis sentence without its 18+ statement
    impl.adult, // the 18+ statement alone
    ...(third ? [`${third.wording} ${impl.adult}`] : []), // a bought list with an 18+ statement glued on
    ...allComposed.map((w) => `${w} `), // a near copy: one trailing space
    ...allComposed.map((w) => w.toUpperCase()), // a near copy: shouted
    "",
  ];
  const wrongly = lookalikes.filter((w) => impl.isAttested(w));
  ok(p(L.att1), allComposed.length >= 3 && allComposed.every((w) => impl.isAttested(w)) && wrongly.length === 0
    && !impl.isAttested(null) && !impl.isAttested(undefined),
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
    ["a basis sentence without its 18+", row({ wording: firstParty[0]?.wording ?? "" })],
  ];
  const counted = notOnes.filter(([, r]) => impl.isAttestation(r)).map(([n]) => n);
  ok(p(L.att2), own !== "" && impl.isAttestation(row({})) && counted.length === 0, `counted: [${counted.join(", ")}]`);

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
  const boughtOk = (r: Answer) => typeof r !== "string" && r.ok && r.basis.key === "THIRD_PARTY" && r.wording === null && r.adultAttested === false;
  ok(p(L.in5), unticked === "adult_not_attested" && stringTick === "adult_not_attested" && boughtOk(bought) && boughtOk(boughtTicked),
    `${unticked},${stringTick},${verdict(bought)},${verdict(boughtTicked)}`);

  const full = ask("AGENT_ROSTER", `  Agent Juma's roster ${NUMERO_SIGN}4,\n   Mwanza   region  `, true);
  const roster = impl.lookup("AGENT_ROSTER");
  ok(p(L.in6), typeof full !== "string" && full.ok && roster !== null && full.basis === roster
    && full.wording !== null && full.wording === impl.compose(roster)
    && full.proofNote === `Agent Juma's roster ${NUMERO_SIGN}4, Mwanza region` && full.adultAttested === true,
    typeof full === "string" ? full : full.ok ? `note ${JSON.stringify(full.proofNote)} · 18+ ${full.adultAttested}` : full.reason);

  const refusals = [
    ask("PURCHASED", NOTE_OK, true), ask("OWN_FORM", "abc", true), ask("OWN_FORM", "a".repeat(501), true),
    ask("OWN_FORM", "roadshow 0712 345 678", true), ask("OWN_FORM", NOTE_OK, false),
  ];
  const said = refusals.map((r) => (typeof r === "string" || r.ok ? "" : r.sentence));
  ok(p(L.in7), said.every((s) => s.length > 0) && new Set(said).size === refusals.length && said[3].startsWith("Remove the phone number."),
    said.join(" | ").slice(0, 220));

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

  // ── ⚠️ G4 · THE DRAFTS ───────────────────────────────────────────────────────────────────────────
  // ⚠️ One confirmation covers the catalogue as it stands. An entry appended LATER is new legal text: it needs its
  // own confirmation, and this gate grows a per-entry state then.
  const g4 = impl.g4;
  const datesOk = g4.state === "DRAFT"
    ? impl.bases.every((b) => b.since === UNSHIPPED)
    : ISO_DAY.test(g4.confirmedOn) && impl.bases.every((b) => ISO_DAY.test(b.since) && b.since >= g4.confirmedOn);
  ok(p(L.draft1), datesOk, `${g4.state}${g4.confirmedOn ? ` ${g4.confirmedOn}` : ""} · since: ${[...new Set(impl.bases.map((b) => b.since))].join(",")}`);

  // ⭐ The population is printed and floored, and the ledger writers the walk reaches FROM production are its
  // end-to-end control: a walk that resolves nothing reaches nothing, and its "nothing reaches the drafts" would be
  // the silent verdict.
  const prod = impl.detect(impl.sources);
  const reached = prod.violations.map((v) => `${v.rel} (${v.why})`);
  ok(p(L.draft2), impl.walked >= 1000 && prod.entries >= 300 && prod.serverActions >= 20 && prod.edges >= 2000
    && prod.ledgerWriters >= 3 && prod.reachLedger >= 3 && (g4.state !== "DRAFT" || reached.length === 0),
    `walked ${impl.walked} src files · ${prod.entries} entry points (${prod.serverActions} 'use server') · ${prod.edges} import edges · `
    + `${prod.ledgerWriters} ledger writer(s), reached from ${prod.reachLedger} entry point(s) · ${prod.writers.length} draft writer(s) · ${g4.state}`
    + (reached.length ? ` · reaching the drafts: ${reached.join(" | ")}` : ""));

  const ctl = impl.detect(CONTROL_SOURCES);
  const flagged = [...new Set(ctl.violations.map((v) => v.rel))];
  const missed = CONTROL_FINDINGS.filter((r) => !flagged.includes(r));
  const overFlagged = flagged.filter((r) => !CONTROL_FINDINGS.includes(r));
  ok(p(L.draft3), missed.length === 0 && overFlagged.length === 0,
    `missed: [${missed.join(", ")}] · flagged wrongly: [${overFlagged.join(", ")}]`);
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════════════
 * ⚠️ Every member DELEGATES to the shipped function unless its own flag is set, and the runner proves the
 * defect-free model green (§0b) before any plant is read — so a red case can only be blamed on its flag. */

/** vb5 plant only · the note screen as the catalogue kept its own copy before vb5: every separator but the low line. */
const PRE_VB5_SEPARATORS = /[\s.()\[\]+\p{Pd}]/gu;
const PRE_VB5_PHONE_RUN = /\p{Nd}{9,}/u;

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
  /** The G4 detector blinded or widened (U33.draft3). */
  detector?: DetectorDefect;
};

export function basisModel(d: BasisDefect): BasisImpl {
  const real = REAL_BASIS;
  return {
    ...real,
    lookup: d.caseFoldedLookup
      ? (k) => (typeof k === "string" ? CONSENT_BASES.find((b) => b.key.toLowerCase() === k.trim().toLowerCase()) ?? null : null)
      : real.lookup,
    compose: d.composeDropsAdult ? (b) => (importConsentWording(b) === null ? null : b.wording) : real.compose,
    isAttested: d.attestedByPrefix ? (w) => typeof w === "string" && w.startsWith("This person gave their number") : real.isAttested,
    isAttestation: d.recordedByIgnored ? (r) => isImportAttestation({ ...r, recordedBy: r.recordedBy ?? "anyone" }) : real.isAttestation,
    check: (i) => {
      if (d.trustsRequestShape) {
        const body = i as { basisKey: string; proofNote: string; adultAttested: boolean };
        return checkConsentBasisInput({ basisKey: body.basisKey, proofNote: body.proofNote.trim(), adultAttested: body.adultAttested });
      }
      if (d.adultIgnored) {
        const r = checkConsentBasisInput({ ...i, adultAttested: true });
        return r.ok ? { ...r, adultAttested: r.basis.firstParty && i.adultAttested === true } : r;
      }
      if (d.adultForEveryBasis) {
        const r = checkConsentBasisInput(i);
        return r.ok && i.adultAttested !== true
          ? { ok: false, reason: "adult_not_attested", sentence: CONSENT_BASIS_REFUSAL_SENTENCE.adult_not_attested }
          : r;
      }
      if (d.noPhoneScreen) {
        const r = checkConsentBasisInput(i);
        if (r.ok || r.reason !== "note_has_phone") return r;
        // The rest of the door as it runs with the screen gone: the same note with every digit blanked to a letter.
        const rest = checkConsentBasisInput({ ...i, proofNote: normalizeProofNote(i.proofNote).replace(/\p{Nd}/gu, "x") });
        return rest.ok ? { ...rest, proofNote: normalizeProofNote(i.proofNote) } : rest;
      }
      if (d.lowLineNotJoined) {
        const r = checkConsentBasisInput(i);
        const note = normalizeProofNote(i?.proofNote);
        // The pre-vb5 screen still catches every other spelling; only a number joined by low lines slips past it, and
        // the rest of the door then runs on the same note with every digit blanked to a letter.
        if (r.ok || r.reason !== "note_has_phone" || PRE_VB5_PHONE_RUN.test(note.normalize("NFKC").replace(PRE_VB5_SEPARATORS, ""))) return r;
        const rest = checkConsentBasisInput({ ...i, proofNote: note.replace(/\p{Nd}/gu, "x") });
        return rest.ok ? { ...rest, proofNote: note } : rest;
      }
      if (d.unknownDefaults) {
        // A key the catalogue does not hold becomes OWN_FORM instead of a refusal.
        return checkConsentBasisInput(consentBasisFor(i?.basisKey) ? i : { ...i, basisKey: "OWN_FORM" });
      }
      if (d.rawLengthMinimum) {
        const r = checkConsentBasisInput(i);
        const typed = typeof i?.proofNote === "string" ? i.proofNote : "";
        if (r.ok || r.reason !== "note_too_short" || Array.from(typed).length < PROOF_NOTE_MIN) return r;
        // The note AS TYPED cleared the minimum, so the door goes on to the 18+ box.
        const note = normalizeProofNote(typed);
        const rest = checkConsentBasisInput({ ...i, proofNote: note.padEnd(PROOF_NOTE_MIN, "x") });
        return rest.ok ? { ...rest, proofNote: note } : rest;
      }
      if (d.maxOffByOne) {
        const r = checkConsentBasisInput(i);
        if (r.ok || r.reason !== "note_too_long" || proofNoteChars(i?.proofNote) > PROOF_NOTE_MAX + 1) return r;
        // The limit drawn at 501, so a 501-character note goes on to the 18+ box.
        const note = normalizeProofNote(i?.proofNote);
        const rest = checkConsentBasisInput({ ...i, proofNote: Array.from(note).slice(0, PROOF_NOTE_MAX).join("") });
        return rest.ok ? { ...rest, proofNote: note } : rest;
      }
      if (d.noteStoredRaw) {
        const r = checkConsentBasisInput(i);
        return r.ok ? { ...r, proofNote: typeof i?.proofNote === "string" ? i.proofNote : "" } : r;
      }
      if (d.noteFolded) {
        const r = checkConsentBasisInput(i);
        return r.ok ? { ...r, proofNote: r.proofNote.normalize("NFKC") } : r;
      }
      if (d.oneSentence) {
        const r = checkConsentBasisInput(i);
        return r.ok ? r : { ...r, sentence: CONSENT_BASIS_REFUSAL_SENTENCE.unknown_basis };
      }
      return real.check(i);
    },
    evidence: d.rawEvidence
      ? (runId, key, note) => `import:${runId} basis:${key} note:${note}`
      : d.evidenceUnscreened
        ? (runId, key, note) => `import:${runId} basis:${key} note:${normalizeProofNote(note)}`
        : real.evidence,
    detect: d.detector ? (sources) => draftReachOf(sources, d.detector) : real.detect,
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
  const ownForm = importConsentWording(consentBasisFor("OWN_FORM"));
  if (ownForm === null) problems.push("basis plant: OWN_FORM composes no wording to append to the SMS list");
  const [first, second, ...rest] = CONSENT_BASES;
  /** The state G4 is about, forced — so a draft2 case still means something after Ali's answer. */
  const draft: ConsentBasisG4 = { state: "DRAFT", confirmedOn: null };
  /** U32's shape, not on disk: the writer, `commitBatch` calling it, and the commit ACTION calling `commitBatch` —
   *  the action never names the writer, so only the reach through its imports can catch it. */
  const commitPath: WalkedSource[] = [
    sourceOf("src/lib/server/marketing/import-consent.ts", [
      'import { importConsentWording } from "@/lib/marketing/consent-basis";',
      "export async function recordImportConsentBatch(tx, rows) {",
      "  await tx.messagingConsent.createMany({ data: rows.map((r) => ({ ...r, wording: importConsentWording(r.basis) })) });",
      "}",
    ].join("\n")),
    sourceOf("src/lib/server/contacts/import-commit.ts", [
      'import { recordImportConsentBatch } from "@/lib/server/marketing/import-consent";',
      "export async function commitBatch(tx, rows) { await recordImportConsentBatch(tx, rows); }",
    ].join("\n")),
    sourceOf("src/app/admin/contacts/import/import-actions.ts", [
      '"use server";',
      'import { commitBatch } from "@/lib/server/contacts/import-commit";',
      "export async function commitImportAction() { await commitBatch(null, []); }",
    ].join("\n")),
  ];
  /** U33b's shape, not on disk: the basis panel renders the catalogue. */
  const panel = sourceOf("src/app/admin/contacts/import/consent-basis-panel.tsx", [
    '"use client";',
    'import { CONSENT_BASES } from "@/lib/marketing/consent-basis";',
    "export function ConsentBasisPanel() { return CONSENT_BASES.length; }",
  ].join("\n"));

  return [
    {
      name: "one character of OWN_FORM's wording changed ('SMS.' → 'SMS!') — evidence edited after the fact",
      expect: L.pin,
      impl: { ...REAL_BASIS, bases: edited("OWN_FORM", (b) => ({ ...b, wording: b.wording.replace(/SMS\.$/, "SMS!") })) },
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
      name: "🔴 the consent-wording saga again — a DRAFT's since set to the day it was drafted",
      expect: L.draft1,
      impl: { ...REAL_BASIS, bases: edited("OWN_FORM", (b) => ({ ...b, since: "2026-10-01" })) },
    },
    {
      name: "G4 flipped to CONFIRMED with every since still 'unshipped' — confirmed, but no ship date recorded",
      expect: L.draft1,
      impl: { ...REAL_BASIS, g4: { state: "CONFIRMED", confirmedOn: "2026-10-02" } },
    },
    {
      name: "⛔ G4 skipped — U32's commit action lands while the wordings are DRAFT and reaches the writer through commitBatch (it never names the writer itself)",
      expect: L.draft2,
      impl: { ...REAL_BASIS, g4: draft, sources: [...REAL_BASIS.sources, ...commitPath] },
    },
    {
      name: "⛔ G4 skipped — U33b's basis panel lands while the wordings are DRAFT and renders them",
      expect: L.draft2,
      impl: { ...REAL_BASIS, g4: draft, sources: [...REAL_BASIS.sources, panel] },
    },
    {
      name: "the detector resolves only `@/` specifiers — a relative import walks past it",
      expect: L.draft3,
      impl: basisModel({ detector: { aliasOnly: true } }),
    },
    {
      name: "the detector knows the catalogue only as `consent-basis` or `consent-basis.ts` — a `.js` specifier walks past it",
      expect: L.draft3,
      impl: basisModel({ detector: { tsOnlyName: true } }),
    },
    {
      name: "the detector reads only the entry's own text — a writer two imports away is invisible",
      expect: L.draft3,
      impl: basisModel({ detector: { entryTextOnly: true } }),
    },
    {
      name: "the detector does not follow re-exports — a barrel launders the catalogue into a page",
      expect: L.draft3,
      impl: basisModel({ detector: { noBarrels: true } }),
    },
    {
      name: "the rule Option A replaced — every module that loads the catalogue is a finding, so the uncalled writer and the gate's read stall the build",
      expect: L.draft3,
      impl: basisModel({ detector: { everyImporter: true } }),
    },
    {
      name: "THIRD_PARTY flagged first-party — a bought list would record consent",
      expect: L.cat1,
      impl: { ...REAL_BASIS, bases: edited("THIRD_PARTY", (b) => ({ ...b, firstParty: true })) },
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
  ];
}
