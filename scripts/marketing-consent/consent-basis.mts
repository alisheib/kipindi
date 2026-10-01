/**
 * test:marketing-consent · section U33a — THE CONSENT-BASIS CATALOGUE (`src/lib/marketing/consent-basis.ts`), pure.
 *                                                                                              (S10, 2026-10-01)
 *
 * ⭐ WHAT THIS SECTION HOLDS. The catalogue alone, EXECUTED: the append-only pin, the ONE basis that is not
 * consent, the composed wordings (sender, content, channel, 18+), their distance from the player's SMS sentences,
 * the attestation test the gate will call, the ONE input door the panel and the start action share, the evidence
 * string — and G4: while Ali has not confirmed the drafts, nothing writes them. The writer (`import-consent.ts`,
 * U33.w*) and the gate's contact branch (U33.g*) arrive with U33a's engine commit and assert against the real
 * store in the runner; they are not here.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. Every assertion reads an injected `BasisImpl`. `--prove-red` plants each defect
 * IN MEMORY — an edited copy of the catalogue, a wrapper around a shipped function, a source that is not on disk —
 * and the runner requires the MATCHING assertion to fail. This module reads src/ for G4 and never touches a file
 * otherwise.
 *
 * Registered in `scripts/marketing-consent.test.mts` (both modes).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { srcFiles, REPO_ROOT } from "../lib/tracked-files.mts";
import {
  CONSENT_BASES, CONSENT_BASIS_G4, ADULT_ATTESTATION_WORDING, THIRD_PARTY_NOTICE, UNSHIPPED, CONSENT_BASIS_REFUSAL_SENTENCE,
  consentBasisFor, importConsentWording, isAttestedImportWording, isImportAttestation, checkConsentBasisInput,
  importConsentEvidence, normalizeProofNote,
} from "../../src/lib/marketing/consent-basis.ts";
import type {
  PinnedConsentBasis, ConsentBasisG4, ConsentBasisInput, ConsentBasisCheck, ConsentBasisKey, ImportAttestationRow,
} from "../../src/lib/marketing/consent-basis.ts";
import { SMS_CONSENT_WORDINGS } from "../../src/lib/marketing/consent-wording.ts";

export type Ok = (label: string, cond: boolean, detail?: string) => void;

/** One src file the G4 walk kept: it names the catalogue or calls a wording writer. Decommented. */
export type WalkedSource = { readonly rel: string; readonly text: string };

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
  readonly evidence: (runId: string, key: ConsentBasisKey, proofNote: string) => string;
  /** The player's pinned SMS sentences (`consent-wording.ts`). */
  readonly smsWordings: readonly string[];
  /** How many src files the G4 walk read — printed and floored, never trusted from a comment. */
  readonly walked: number;
  readonly sources: readonly WalkedSource[];
};

/* ══ G4 · THE POPULATION — every src file, read from the REAL tree ══════════════════════════════════ */

const CATALOGUE_REL = "src/lib/marketing/consent-basis.ts";
/** ⛔ A WORDING WRITER: the ledger's create (the very test `test:dal-parity` §20.0 walks) or a run's write-once
 *  basis (U33b). Either one storing a draft makes it evidence. */
const WORDING_WRITER = /\bdb\.(?:messagingConsent\.create|contactImport\.fixConsentBasis)\(/;
/** A string literal naming the catalogue's module by any path — static import, re-export, dynamic import. */
const NAMES_CATALOGUE = /["'`](?:[^"'`\n]*\/)?consent-basis(?:\.ts)?["'`]/;

function walkSources(): { walked: number; sources: WalkedSource[] } {
  const all = srcFiles();
  const sources: WalkedSource[] = [];
  for (const rel of all) {
    if (rel === CATALOGUE_REL) continue;
    const raw = readFileSync(join(REPO_ROOT, rel), "utf8");
    // A cheap screen first: only a file that could be either is decommented.
    if (!raw.includes("consent-basis") && !raw.includes("messagingConsent.create(") && !raw.includes("fixConsentBasis(")) continue;
    sources.push({ rel, text: decomment(raw) });
  }
  return { walked: all.length, sources };
}

const WALK = walkSources();

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
};

/* ══ THE PIN ════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE APPEND-ONLY PIN — key|since|firstParty|wording of the first entries, then the 18+ sentence. Appending an
 * entry leaves it unchanged; editing a wording, a flag or a date, removing an entry or reordering changes it.
 * 🔴 G4 · IT PINS THE DRAFTS (2026-10-01). Ali's G4 answer re-takes it ONCE, with every `since` set to the ship
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
  in4: "U33.in4 · ⛔ §5.14 · a note holding a phone number — spaced, +255 with brackets, zero-width joined, full-width, en-dashed, dotted — is note_has_phone; eight digits are not one",
  in5: "U33.in5 · ⭐ first-party without the 18+ box is adult_not_attested (only the boolean true attests); a bought list never asks — it passes unticked, and a stale tick is NOT carried onto it",
  in6: "U33.in6 · a complete first-party input passes — the catalogue's own entry, the composed wording, the note collapsed, the 18+ recorded",
  in7: "U33.in7 · every refusal answers in its OWN sentence — five refusals, five sentences; the phone one tells the officer to remove the number",
  in8: "U33.in8 · ⛔ the server door is TOTAL over a hostile request — no body, a number for a key, no note or a numeric note is a refusal, never a throw",
  ev: "U33.ev · the evidence names the run, the basis and the officer's note on one line — `import:<run> basis:<KEY> note:<note>`, whitespace collapsed",
  draft1: "U33.draft1 · 🔴 G4 · a DRAFT claims no ship date (every since is 'unshipped'); once Ali confirms, every since is a real day on or after his confirmation",
  draft2: "U33.draft2 · 🔴 G4 · while the wordings are DRAFT, NOTHING WRITES THEM — no ledger writer and no writer of a run's basis imports the catalogue",
} as const;

const NOTE_OK = "Kariakoo roadshow, stand 4, signed sheet kept in the office";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ch = (code: number): string => String.fromCharCode(code);
const ZWSP = ch(0x200b);
const EN_DASH = ch(0x2013);
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
    "stand 123.456.789 sign-ups",
  ].map((n) => verdict(ask("OWN_EVENT", n, true)));
  const notPhones = ["Kariakoo roadshow, 2026, stand 14, 340 sign-ups", "stand 1234 5678 sheet"].map((n) => verdict(ask("OWN_EVENT", n, true)));
  ok(p(L.in4), phones.every((v) => v === "note_has_phone") && notPhones.every((v) => v === "ok"), `${phones.join(",")} · ${notPhones.join(",")}`);

  const unticked = verdict(ask("OWN_EVENT", NOTE_OK, false));
  const stringTick = verdict(ask("AGENT_ROSTER", NOTE_OK, "true"));
  const bought = ask("THIRD_PARTY", NOTE_OK, false);
  const boughtTicked = ask("THIRD_PARTY", NOTE_OK, true);
  const boughtOk = (r: Answer) => typeof r !== "string" && r.ok && r.basis.key === "THIRD_PARTY" && r.wording === null && r.adultAttested === false;
  ok(p(L.in5), unticked === "adult_not_attested" && stringTick === "adult_not_attested" && boughtOk(bought) && boughtOk(boughtTicked),
    `${unticked},${stringTick},${verdict(bought)},${verdict(boughtTicked)}`);

  const full = ask("AGENT_ROSTER", "  Agent Juma's roster,\n   Mwanza   region  ", true);
  const roster = impl.lookup("AGENT_ROSTER");
  ok(p(L.in6), typeof full !== "string" && full.ok && roster !== null && full.basis === roster
    && full.wording !== null && full.wording === impl.compose(roster)
    && full.proofNote === "Agent Juma's roster, Mwanza region" && full.adultAttested === true,
    typeof full === "string" ? full : JSON.stringify(full).slice(0, 160));

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
  ok(p(L.ev), ev === "import:imp_t1 basis:OWN_FORM note:Kariakoo roadshow stand 4", JSON.stringify(ev));

  // ── 🔴 G4 · THE DRAFTS ───────────────────────────────────────────────────────────────────────────
  // ⚠️ One confirmation covers the catalogue as it stands. An entry appended LATER is new legal text: it needs its
  // own confirmation, and this gate grows a per-entry state then.
  const g4 = impl.g4;
  const datesOk = g4.state === "DRAFT"
    ? impl.bases.every((b) => b.since === UNSHIPPED)
    : ISO_DAY.test(g4.confirmedOn) && impl.bases.every((b) => ISO_DAY.test(b.since) && b.since >= g4.confirmedOn);
  ok(p(L.draft1), datesOk, `${g4.state}${g4.confirmedOn ? ` ${g4.confirmedOn}` : ""} · since: ${[...new Set(impl.bases.map((b) => b.since))].join(",")}`);

  // ⭐ The population is printed and floored, and the writers it finds are the control: a walk that sees no
  // ledger writer at all is a walk that sees nothing, and its "no draft writer" would be the silent verdict.
  const writers = impl.sources.filter((s) => WORDING_WRITER.test(s.text));
  const draftWriters = writers.filter((s) => NAMES_CATALOGUE.test(s.text)).map((s) => s.rel);
  ok(p(L.draft2), impl.walked >= 1000 && writers.length >= 3 && (g4.state !== "DRAFT" || draftWriters.length === 0),
    `walked ${impl.walked} src files · ${writers.length} wording writer(s) · ${g4.state}${draftWriters.length ? ` · importing it: ${draftWriters.join(", ")}` : ""}`);
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════════════
 * ⚠️ Every member DELEGATES to the shipped function unless its own flag is set, and the runner proves the
 * defect-free model green (§0b) before any plant is read — so a red case can only be blamed on its flag. */

export type BasisDefect = {
  /** The stored wording loses its 18+ sentence. */
  composeDropsAdult?: boolean;
  /** "Attested" read as a prefix — the basis sentence alone counts. */
  attestedByPrefix?: boolean;
  /** An unsigned row counts as an officer's attestation. */
  recordedByIgnored?: boolean;
  /** The §5.14 digit screen removed from the door. */
  noPhoneScreen?: boolean;
  /** The 18+ box ignored. */
  adultIgnored?: boolean;
  /** The 18+ box demanded for a bought list too. */
  adultForEveryBasis?: boolean;
  /** The door reads the request's fields as if the shape were guaranteed. */
  trustsRequestShape?: boolean;
  /** The evidence carries the note as typed — newlines and all. */
  rawEvidence?: boolean;
  /** The key looked up case-insensitively and trimmed. */
  caseFoldedLookup?: boolean;
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
      return real.check(i);
    },
    evidence: d.rawEvidence ? (runId, key, note) => `import:${runId} basis:${key} note:${note}` : real.evidence,
  };
}

export type BasisCase = { readonly name: string; readonly expect: string; readonly impl: BasisImpl };

/** A source that is not on disk: the writer U33a's engine commit adds, landing before Ali's G4 answer. */
const PLANTED_DRAFT_WRITER: WalkedSource = {
  rel: "src/lib/server/marketing/import-consent.ts",
  text: [
    'import { importConsentWording } from "@/lib/marketing/consent-basis";',
    "export async function recordImportConsentBatch(basis, key) {",
    "  await db.messagingConsent.create({ ...ledgerStamp(), ...key, status: \"GIVEN\", wording: importConsentWording(basis) });",
    "}",
  ].join("\n"),
};

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
      name: "🔴 G4 skipped — the import writer lands and imports the catalogue while the wordings are still DRAFT",
      expect: L.draft2,
      impl: { ...REAL_BASIS, sources: [...REAL_BASIS.sources, PLANTED_DRAFT_WRITER] },
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
      name: "⛔ the digit screen removed — a phone number rides into seven-year evidence",
      expect: L.in4,
      impl: basisModel({ noPhoneScreen: true }),
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
      name: "the key looked up case-insensitively — 'own_form' is guessed into OWN_FORM",
      expect: L.keys,
      impl: basisModel({ caseFoldedLookup: true }),
    },
  ];
}
