/**
 * test:marketing-wordings — U33w's guard: THE MARKETING WORDINGS, EDITABLE (spec `docs/marketing-specs/U33a-U37c-OD58.md`
 * §5.1 · §6 · §9; OD57 · OD58 · S14; the owner rule of 2026-10-03, "admins can change everything"; the U33w review).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script. The store under test is the REAL one — the readers and
 * the verified setter of `src/lib/server/marketing/wordings.ts`, built by its own `makeStore` over a second instance of
 * the real `defineConfig` factory (`__wordingsStoreForTest`) — against an in-memory row that answers like Postgres (every
 * write kept as a JSON copy, every read a JSON copy back), so the read-back and the hydration gate run as in production:
 *   W0  the keys — every catalogue basis has its wording key, and nothing else does;
 *   W1  ⛔ nothing unsaved is ever recorded — with nothing saved every reader answers null, the catalogue composes
 *       nothing, the import door refuses; and no basis writer in src names a default (the structural detector, shared
 *       with test:marketing-consent U33.draft2);
 *   W1c the detector's own control, on a fixed population (U33.draft3's);
 *   W2  a save appends only on change — earlier versions byte-identical, the server's stamp, every other key untouched;
 *   W3  ⛔ a POST that rewrites or drops a past version is refused — nothing written, no audit row;
 *   W4  each rule refuses its own case in its own words, every problem at once, every suggestion passes its own rules,
 *       the normaliser is idempotent (a saved wording reads back as saved), a phone number written with solidi or commas
 *       is one (m6), and a valid save is stored normalised and audited `{ before, after, changes }`;
 *   W5  ⛔ basis.LICENCE_OUTREACH can never be saved claiming consent — nor an opt-in, permission, acceptance, sign-up,
 *       request or subscription (m3);
 *   W6  an import attestation is recognised against every SAVED pair of versions, and nothing else;
 *   W7  a process that never loaded the row refuses to save, writes nothing, and its readers answer null;
 *   W8  the wiring — the action, the card, the page and its tab, the pure module's purity, the server's live store, the
 *       client-graph pin, the scripts and predeploy (a gate outside the pipeline is not a gate);
 *   W9  ⛔ M2 · a suggestion is saved only on purpose, and that is the SERVER's rule: the card sends an unticked suggestion
 *       never, a ticked or edited one with its approval, the source line only when typed; a hand-built POST of the nine
 *       suggestions without approvals is refused and writes nothing;
 *   W10 m1 · a page out of date is refused, in its own words, and nothing is written;
 *   W11 m3 · a consent basis that negates its agreement after the word ("agreed to nothing") is refused, and an evidence
 *       wording holding a letter from another alphabet is refused;
 *   W12 ⛔ M1 · a row the reader could not read in full is never rewritten — every save refused, the row left as it was;
 *   W13 D9 · two saves at once keep both versions, numbered 1 and 2, and two wordings saved at once keep both;
 *   W14 the action's form reading — each name once, React's own fields left out, a file passed on to be refused.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — one rule, one piece of the store, one source
 * string — and requires the MATCHING assertion to fail. This file makes no file-modifying call of any kind, so it stays in
 * `test:red-anchors` §4's in-process class. ⛔ No pattern here holds a backslash: an editing tool decodes typed escapes
 * (repo memory, 2026-10-02), so line breaks and invisible characters are built from their codes.
 *
 * Run:  npm run test:marketing-wordings
 * Red:  npm run red:marketing-wordings
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { isDirective } from "./lib/is-directive.mts";
import { auditFlush, getAuditForActor } from "../src/lib/server/audit.ts";
import {
  WORDING_KEYS, WORDING_DEFAULTS, WORDING_RULE, WORDING_RULES, WORDING_SENTENCE, EMPTY_WORDINGS,
  isWordingKey, basisWordingKey, wordingProblems, appendVersion, appendOnlyProblem, mergeWordings, readWordingsPatch,
  normalizeWording, savedBasisWordingsOf, readWordingHistories, admissionProblems, wordingsToSave, approvesOnEdit,
  wordingsPostEntries, patchFromForm, approveFieldName, baseFieldName,
} from "../src/lib/marketing/marketing-wordings.ts";
import type {
  WordingKey, WordingProblem, WordingRules, WordingHistories, WordingVersion, WordingCardState,
} from "../src/lib/marketing/marketing-wordings.ts";
import { CONSENT_BASES, consentBasisFor, importConsentWording, checkConsentBasisInput } from "../src/lib/marketing/consent-basis.ts";
import { holdsPhoneRun } from "../src/lib/contacts/contact-fields.ts";
import { validateCampaignTemplate } from "../src/lib/marketing/campaign-template.ts";
import { __wordingsStoreForTest, MARKETING_WORDINGS_AUDIT, WORDINGS_REFUSAL_SENTENCE } from "../src/lib/server/marketing/wordings.ts";
import type { WordingsStore } from "../src/lib/server/marketing/wordings.ts";
import { REAL_BASIS, controlVerdict, defaultReachOf, sourceOf } from "./marketing-consent/consent-basis.mts";
import type { WalkedSource, DefaultReach } from "./marketing-consent/consent-basis.mts";

const PROVE_RED = process.argv.includes("--prove-red");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

/* ══ THE LABELS — each once, so a red case names exactly the line it must turn red ═══════════════════════════════ */

const L = {
  w0: "W0 · the keys — every catalogue basis has its basis.<KEY> wording and nothing else does; the 18+ trio, the notice and the source line; a case-folded, padded or prototype key is refused, and the readers answer nothing for an unknown one",
  w1: "W1 · ⛔ nothing unsaved is ever recorded — with nothing saved every reader answers null, no first-party basis composes a wording, no default reads as an attestation, the import door refuses wording_unsaved; and no basis writer in src names a default (the detector over the real tree)",
  w1c: "W1c · ⚠️ CONTROL — the detector on a fixed population finds every shape it claims to see (CONSENT_BASES[..].defaultWording, WORDING_DEFAULTS, a barrel, a helper, chained, a variable, the door's answer, a non-null assertion, raw SQL; pc() receivers, createManyAndReturn, upsert) and lets the card's prefill, the pin, the catalogue, a writer taking the catalogue's labels and a writer reading currentWording through",
  w2: "W2 · a save appends only on change — earlier versions byte-identical, v increments, the server stamps savedBy and savedAt, an unchanged text writes nothing and audits nothing, and every other wording keeps its history, in the cache and in the row",
  w3: "W3 · ⛔ a POST that rewrites or drops a past version is refused — a posted history, a version object, the whole record, an unknown field, a non-string, a malformed approval or count is not understood; a rebuilt history that rewrites, drops, renumbers or doubles a version is refused; nothing is written and no audit row is made",
  w4: "W4 · each rule refuses its own case with its own sentence, every problem is listed at once (one wording and several), every suggestion passes its own rules, the source line is judged by the renderer's own verdict, the normaliser is idempotent (a saved wording reads back as saved), a number written with solidi or commas is a number (m6), and a valid save is stored normalised and audited { before, after, changes }",
  w5: "W5 · ⛔ basis.LICENCE_OUTREACH can never be saved claiming consent — without 'has not agreed' (or 'never agreed' / 'did not agree') it is refused, so is a denial beside an agreement, an opt-in, permission, acceptance, a sign-up, a request or a subscription (m3), and the store writes nothing; the bought-list basis is held to the same plain denial in its own words",
  w6: "W6 · isImportAttestationSaved is true for every SAVED pair of a first-party basis version and an adult.consent version — and false for an unsaved default, a near copy, the adult sentence alone, THIRD_PARTY or LICENCE with it glued on, recordedBy null, a source other than IMPORT; a new row composes the newest pair",
  w7: "W7 · a process that never loaded the row refuses the save — nothing written, no audit row — and its readers answer null and recognise nothing (it fails closed)",
  w8: "W8 · the wiring — the action asks requireAdmin first, reads its form with patchFromForm, saves through the verified setter, names a box per refusal and revalidates three pages; the card validates live, builds its request with wordingsToSave and wordingsPostEntries, ticks on edit with approvesOnEdit, never holds a save silently (m4), names each tick's wording and links each status line; the page renders it on its own tab and reads its rows only there (m7); the pure module is pure and pinned; the server's live store is makeStore over WORDING_RULES, queued, refusing a partly read row (M1) and re-checking the record it writes (m2); the suite and its red run in predeploy, right after test:marketing-consent",
  w9: "W9 · ⛔ M2 · a suggestion is saved only on purpose, and the SERVER holds the rule — the card never sends an unticked suggestion, sends a ticked or edited one with approve.<key>=1, the source line only when typed, a saved wording only when changed, each with its version count; a hand-built POST of the nine suggestions with no approval field is refused key by key in its own words and writes nothing, and the same POST approved saves all nine",
  w10: "W10 · m1 · a page out of date is refused — a save built on a version count that is not the count saved now (behind or ahead) is refused under its box ('Someone saved this wording since you opened the page — reload to see it.'), nothing is written, and the same save from the current count is version 2",
  w11: "W11 · m3 · a consent basis that negates its agreement AFTER the word ('agreed to nothing', 'agreed to no offers', 'agreed, but not to SMS') is refused in its own words while the suggestions and an accented consent still pass, and a basis or 18+ wording holding a letter from another alphabet (a Cyrillic or Greek look-alike of a Latin letter) is refused in plain words — by the store too, writing nothing",
  w12: "W12 · ⛔ M1 · a row the reader could not read in full — a malformed history, a history out of order, a key the card does not hold, a row that is not a record — is never rewritten: every save is refused ('history_unreadable', in the review's words), the row is byte-identical and no audit row is made, its readers fail closed; and a row read in full saves as usual",
  w13: "W13 · D9 · two saves at once keep both versions — the same wording saved twice concurrently is versions 1 and 2, each by its own officer, and two wordings saved concurrently each keep their version in the row",
  w14: "W14 · the action's form reading (patchFromForm) — the card's fields pass, React's $ACTION_ fields are left out, a name posted twice is refused, a file or a __proto__ field is passed on and refused by the request reader, and a real FormData saves through the store",
} as const;

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BACKSLASH = String.fromCharCode(92);
const ZWSP = String.fromCharCode(0x200b);
const ZWJ = String.fromCharCode(0x200d);
const ACUTE = String.fromCharCode(0x301);
const E_ACUTE = String.fromCharCode(0xe9);
const CYR_A = String.fromCharCode(0x430);
const GRK_O = String.fromCharCode(0x3bf);
const RIGHT_QUOTE = String.fromCharCode(0x2019);
const lines = (...l: string[]): string => l.join(LF);
const unCrlf = (s: string): string => s.split(CR + LF).join(LF);
const read = (rel: string): string => decomment(unCrlf(readFileSync(join(ROOT, rel), "utf8")));
const rawRead = (rel: string): string => unCrlf(readFileSync(join(ROOT, rel), "utf8"));
/** Every run of whitespace removed, so a reflowed line still compares equal (the W8 source checks). */
const WS_RUN = new RegExp(`[ ${String.fromCharCode(9, 10, 13)}]+`, "g");
const squash = (s: string): string => s.replace(WS_RUN, "");
const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const T1 = "2026-10-04T08:00:00.000Z";
const T2 = "2026-10-04T09:15:00.000Z";
const T3 = "2026-10-05T10:30:00.000Z";

/** Saved words that are NOT the suggestions, so a default nobody saved can be told apart from a saved version. */
const OWN_FORM_A = "This person gave their number to 50pick on our own 50pick form and agreed there to receive 50pick offers by SMS.";
const OWN_FORM_B = "This person gave their number to 50pick on a 50pick form, and agreed there to receive 50pick offers and news by SMS.";
const ROSTER_A = "This person gave their number to a registered 50pick agent, for 50pick, and agreed to receive 50pick offers and news by SMS.";
const ADULT_A = "They told us they are aged 18 or older.";
const ADULT_B = "They confirmed to us that they are 18 or older.";
const ADULT_TEST_A = "I confirm that the person who uses this number is aged 18 or older.";
const ADULT_TEST_B = "I confirm that whoever uses this number is 18 or older.";
const NOTE_OK = "Kariakoo roadshow, stand 4, signed sheet kept in the office";

/** ⛔ The review's own words (lead rulings M1 · M2 · m1) — pinned here, so a reworded refusal is a visible change. */
const NOT_APPROVED_SENTENCE = "Tick “Approve and save this wording” to save a suggestion.";
const STALE_SENTENCE = "Someone saved this wording since you opened the page — reload to see it.";
const UNREADABLE_SENTENCE = "The saved wordings could not be read in full, so nothing was saved. Ask the developer to check the marketing wordings setting.";

type FakeDb = { readonly deps: unknown; readonly writes: () => number; readonly row: () => Record<string, unknown> | null };

/** ⭐ One SystemConfig row that answers like Postgres: every write kept as a JSON copy and every read a JSON copy back,
 *  so the factory's read-back compares what really round-tripped. `failLoads`: the store cannot answer at all (W7).
 *  `seed`: a row already there before the process boots (W12). */
function fakeDb(opts: { failLoads?: boolean; seed?: unknown } = {}): FakeDb {
  const copy = (v: unknown): unknown => (v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)));
  let stored: unknown = copy(opts.seed);
  let writes = 0;
  return {
    deps: {
      hasDatabase: () => true,
      loadConfigResult: async () => (opts.failLoads ? { ok: false, error: "the store did not answer" } : { ok: true, value: copy(stored) }),
      saveConfig: async (_key: string, value: unknown) => { writes++; stored = copy(value); },
    },
    writes: () => writes,
    row: () => copy(stored) as Record<string, unknown> | null,
  };
}

let seq = 0;
/** A fresh officer id per check, so one run's audit rows are never another's. */
const officer = (tag: string, what: string): string => `off_${tag.replace(/[^A-Za-z0-9]/g, "")}_${what}_${seq++}`;
const auditRows = async (actorId: string) => {
  await auditFlush();
  return getAuditForActor(actorId).filter((e) => e.action === MARKETING_WORDINGS_AUDIT.action);
};

/** ⭐ The request the card would post for these texts, against the history the page rendered: each text with its
 *  version count, and the approval for a wording never saved (the card's own ticks, W9, are asserted separately). */
function cardPost(store: WordingsStore, texts: Partial<Record<WordingKey, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of WORDING_KEYS) {
    const text = texts[key];
    if (text === undefined) continue;
    const count = store.wordingHistory(key).length;
    out[key] = text;
    out[baseFieldName(key)] = String(count);
    if (count === 0) out[approveFieldName(key)] = "1";
  }
  return out;
}

/* ══ THE SOURCES THE WIRING IS READ FROM ═════════════════════════════════════════════════════════════════════════ */

type Sources = {
  actions: string; form: string; page: string; pure: string; pureRaw: string; server: string; cgs: string; pkg: string;
};
const REAL_SOURCES: Sources = {
  actions: read("src/app/admin/system/actions.ts"),
  form: read("src/app/admin/system/marketing-wordings-form.tsx"),
  page: read("src/app/admin/system/page.tsx"),
  pure: read("src/lib/marketing/marketing-wordings.ts"),
  pureRaw: rawRead("src/lib/marketing/marketing-wordings.ts"),
  server: read("src/lib/server/marketing/wordings.ts"),
  cgs: read("scripts/client-graph-safe.test.mjs"),
  pkg: rawRead("package.json"),
};

/* ══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ════════════════════════════════ */

type Impl = {
  readonly keys: readonly string[];
  readonly defaults: Readonly<Record<WordingKey, string>>;
  /** The rule the card runs live. */
  readonly problems: (key: WordingKey, text: string) => readonly WordingProblem[];
  readonly appendOnly: typeof appendOnlyProblem;
  /** What the store is built from (its rules are `problems` and `appendOnly` too, unless a plant says otherwise). */
  readonly rules: WordingRules;
  readonly merge: typeof mergeWordings;
  /** The D9 queue removed (W13's plant). */
  readonly unqueued: boolean;
  /** A plant on a built store's readers. */
  readonly wrap: (store: WordingsStore) => WordingsStore;
  /** The card's half of M2: what a save sends, and what an edit ticks. */
  readonly toSave: typeof wordingsToSave;
  readonly approvesOnEdit: typeof approvesOnEdit;
  readonly postEntries: typeof wordingsPostEntries;
  /** The action's form reading (W14). */
  readonly fromForm: typeof patchFromForm;
  readonly sources: readonly WalkedSource[];
  readonly walked: number;
  readonly detect: (sources: readonly WalkedSource[]) => DefaultReach;
  readonly src: Sources;
};

const REAL: Impl = {
  keys: WORDING_KEYS,
  defaults: WORDING_DEFAULTS,
  problems: wordingProblems,
  appendOnly: appendOnlyProblem,
  rules: WORDING_RULES,
  merge: mergeWordings,
  unqueued: false,
  wrap: (store) => store,
  toSave: wordingsToSave,
  approvesOnEdit,
  postEntries: wordingsPostEntries,
  fromForm: patchFromForm,
  sources: REAL_BASIS.sources,
  walked: REAL_BASIS.walked,
  detect: (sources) => defaultReachOf(sources),
  src: REAL_SOURCES,
};

/** ⭐ THE REAL STORE — the shipped readers and setter over a fresh factory instance and a fresh row. */
const storeOf = (impl: Impl, db: FakeDb, rules: WordingRules = impl.rules): WordingsStore =>
  impl.wrap(__wordingsStoreForTest({ deps: db.deps as never, rules, merge: impl.merge, unqueued: impl.unqueued }));

const codesOf = (list: readonly WordingProblem[]): string => list.map((x) => x.code).join(",");

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (label: string) => `${tag}${label}`;

  // ── W0 · THE KEYS ────────────────────────────────────────────────────────────────────────────────────────
  {
    const keys = [...impl.keys];
    const basisKeys = keys.filter((k) => k.startsWith("basis.")).map((k) => k.slice("basis.".length)).sort();
    const catalogue = CONSENT_BASES.map((b) => b.key).sort();
    const others = keys.filter((k) => !k.startsWith("basis.")).sort();
    const strays = ["basis.own_form", "basis.OWN_FORM ", " basis.OWN_FORM", "toString", "__proto__", "constructor", "", "basis.PURCHASED", null, 7]
      .filter((k) => isWordingKey(k));
    const store = storeOf(impl, fakeDb());
    const unknownRead = store.currentWording("basis.PURCHASED" as WordingKey) === null && store.wordingHistory("toString" as WordingKey).length === 0;
    const conds = {
      distinct: keys.length > 0 && new Set(keys).size === keys.length && keys.every((k) => isWordingKey(k)),
      catalogue: JSON.stringify(basisKeys) === JSON.stringify(catalogue) && CONSENT_BASES.every((b) => keys.includes(basisWordingKey(b.key))),
      others: JSON.stringify(others) === JSON.stringify(["adult.consent", "adult.list", "adult.test", "notice.thirdParty", "source.phrase"]),
      strays: strays.length === 0,
      unknownRead,
    };
    ok(p(L.w0), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · keys [${keys.join(", ")}]`);
  }

  // ── W1 · ⛔ NOTHING UNSAVED IS EVER RECORDED ──────────────────────────────────────────────────────────────────
  {
    const store = storeOf(impl, fakeDb());
    await tick();
    const answered = WORDING_KEYS.filter((k) => store.currentWording(k) !== null);
    const histories = WORDING_KEYS.filter((k) => store.wordingHistory(k).length !== 0);
    const saved = store.savedBasisWordings();
    const firstParty = CONSENT_BASES.filter((b) => b.firstParty);
    const composed = firstParty.map((b) => importConsentWording(b, saved)).filter((w) => w !== null);
    const attested = firstParty.filter((b) => store.isImportAttestationSaved({
      status: "GIVEN", source: "IMPORT", recordedBy: "officer-w1", wording: `${b.defaultWording} ${WORDING_DEFAULTS["adult.consent"]}`,
    })).map((b) => b.key);
    const door = checkConsentBasisInput({ basisKey: "OWN_FORM", proofNote: NOTE_OK, adultAttested: true }, saved);
    const reach = impl.detect(impl.sources);
    const found = reach.violations.map((v) => `${v.rel} (${v.why})`);
    const structural = impl.walked >= 1000 && reach.files >= 1000 && reach.edges >= 2000 && reach.writers.length >= 3 && found.length === 0;
    ok(p(L.w1), answered.length === 0 && histories.length === 0 && composed.length === 0 && attested.length === 0
      && !door.ok && door.reason === "wording_unsaved" && structural,
      `answered [${answered.join(", ")}] · histories [${histories.join(", ")}] · composed ${composed.length} · attested [${attested.join(", ")}] · `
      + `door ${door.ok ? "ok" : door.reason} · walked ${impl.walked} · ${reach.files} judged · ${reach.edges} edges · ${reach.writers.length} writer(s) · `
      + `readers [${reach.readers.join(", ")}]${found.length ? ` · reaching a default: ${found.join(" | ")}` : ""}`);
  }

  // ── W1c · THE DETECTOR'S OWN CONTROL ─────────────────────────────────────────────────────────────────────────
  {
    const ctl = controlVerdict(impl.detect);
    ok(p(L.w1c), ctl.missed.length === 0 && ctl.overFlagged.length === 0,
      `missed: [${ctl.missed.join(", ")}] · flagged wrongly: [${ctl.overFlagged.join(", ")}]`);
  }

  // ── W2 · A SAVE APPENDS ONLY ON CHANGE ───────────────────────────────────────────────────────────────────────
  {
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w2a");
    const b = officer(tag, "w2b");
    const r1 = await store.saveMarketingWordings(cardPost(store, { "basis.OWN_FORM": OWN_FORM_A, "basis.THIRD_PARTY": WORDING_DEFAULTS["basis.THIRD_PARTY"] }), a, T1);
    const first = store.wordingHistory("basis.OWN_FORM");
    const thirdFirst = JSON.stringify(store.wordingHistory("basis.THIRD_PARTY"));
    const writes1 = db.writes();
    const rows1 = (await auditRows(a)).length;
    // The same words again — padded, with a run of spaces and a zero-width space — is no change.
    const r2 = await store.saveMarketingWordings(cardPost(store, { "basis.OWN_FORM": `  ${OWN_FORM_A.replace(" ", "   ")}${ZWSP} ` }), a, T2);
    const writes2 = db.writes();
    const rows2 = (await auditRows(a)).length;
    // Changed words: one version appended, stamped by the server with ITS clock and the session's officer.
    const r3 = await store.saveMarketingWordings(cardPost(store, { "basis.OWN_FORM": OWN_FORM_B, "adult.consent": ADULT_A }), b, T3);
    const own = store.wordingHistory("basis.OWN_FORM");
    const adult = store.wordingHistory("adult.consent");
    const third = JSON.stringify(store.wordingHistory("basis.THIRD_PARTY"));
    const row = db.row();
    const conds = {
      first: r1.ok && JSON.stringify(r1.changed) === JSON.stringify(["basis.OWN_FORM", "basis.THIRD_PARTY"])
        && first.length === 1 && first[0].v === 1 && first[0].text === OWN_FORM_A && first[0].savedAt === T1 && first[0].savedBy === a,
      unchangedWritesNothing: r2.ok && r2.changed.length === 0 && writes2 === writes1 && rows2 === rows1 && rows1 === 1,
      appended: r3.ok && own.length === 2 && JSON.stringify(own[0]) === JSON.stringify(first[0])
        && own[1].v === 2 && own[1].text === OWN_FORM_B && own[1].savedAt === T3 && own[1].savedBy === b,
      newKey: adult.length === 1 && adult[0].v === 1 && adult[0].text === ADULT_A && adult[0].savedBy === b,
      othersKept: third === thirdFirst && JSON.parse(third).length === 1,
      persisted: row !== null && JSON.stringify(row["basis.OWN_FORM"]) === JSON.stringify(own)
        && JSON.stringify(row["basis.THIRD_PARTY"]) === thirdFirst && JSON.stringify(row["adult.consent"]) === JSON.stringify(adult),
      current: store.currentWording("basis.OWN_FORM")?.v === 2 && store.currentWording("basis.OWN_FORM")?.text === OWN_FORM_B,
    };
    const said = [r1, r2, r3].map((r) => (r.ok ? `ok[${r.changed.join(",")}]` : `${r.reason}: ${r.error}`)).join(" · ");
    ok(p(L.w2), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · ${said}`);
  }

  // ── W3 · ⛔ A POST THAT REWRITES OR DROPS A PAST VERSION IS REFUSED ──────────────────────────────────────────
  {
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w3");
    const base = await store.saveMarketingWordings(cardPost(store, { "basis.OWN_FORM": OWN_FORM_A }), a, T1);
    const writes0 = db.writes();
    const rows0 = (await auditRows(a)).length;
    const v1 = store.wordingHistory("basis.OWN_FORM");
    const T = WORDING_DEFAULTS["adult.test"];
    const hostile: Array<[string, unknown]> = [
      ["a history posted for a key", { "basis.OWN_FORM": [{ v: 1, text: OWN_FORM_B, savedAt: T1, savedBy: a }] }],
      ["a version object posted for a key", { "basis.OWN_FORM": { v: 1, text: OWN_FORM_B } }],
      ["the whole record posted", { versions: { "basis.OWN_FORM": [] } }],
      ["an unknown field beside a good one", { "basis.OWN_FORM": OWN_FORM_B, [baseFieldName("basis.OWN_FORM")]: "1", "basis.OWN_FORM.v1": OWN_FORM_A }],
      ["a number for a text", { "adult.test": 18, [baseFieldName("adult.test")]: "0", [approveFieldName("adult.test")]: "1" }],
      ["an array", [OWN_FORM_B]],
      ["nothing", null],
      ["a string", OWN_FORM_B],
      ["a prototype trick", Object.create({ "basis.OWN_FORM": OWN_FORM_B })],
      ["a text sent without its version count", { "adult.test": T, [approveFieldName("adult.test")]: "1" }],
      ["a version count that is not a count", { "adult.test": T, [baseFieldName("adult.test")]: "1.5", [approveFieldName("adult.test")]: "1" }],
      ["a version count for a wording not sent", { [baseFieldName("adult.test")]: "0" }],
      ["an approval for a wording not sent", { [approveFieldName("adult.test")]: "1" }],
      ["an approval that is not 1", { "adult.test": T, [baseFieldName("adult.test")]: "0", [approveFieldName("adult.test")]: "yes" }],
      ["an approval for a key the card does not hold", { "adult.test": T, [baseFieldName("adult.test")]: "0", "approve.basis.PURCHASED": "1" }],
    ];
    const answers: string[] = [];
    for (const [name, body] of hostile) {
      const r = await store.saveMarketingWordings(body, a, T2);
      answers.push(`${name}=${r.ok ? "ok" : r.reason}`);
    }
    const notUnderstood = answers.every((x) => x.endsWith("=not_understood"));
    // The append-only check itself, over proposals somebody's builder could make.
    const before: WordingHistories = { ...EMPTY_WORDINGS, "basis.OWN_FORM": v1 };
    const v: WordingVersion = v1[0] ?? { v: 1, text: OWN_FORM_A, savedAt: T1, savedBy: a };
    const proposals: Array<[string, WordingHistories]> = [
      ["version 1 rewritten", { ...before, "basis.OWN_FORM": [{ ...v, text: OWN_FORM_B }] }],
      ["version 1 dropped", { ...before, "basis.OWN_FORM": [] }],
      ["version 1's author changed", { ...before, "basis.OWN_FORM": [{ ...v, savedBy: "someone-else" }] }],
      ["two versions at once", { ...before, "basis.OWN_FORM": [v, { ...v, v: 2, text: OWN_FORM_B }, { ...v, v: 3, text: ROSTER_A }] }],
      ["the next version misnumbered", { ...before, "basis.OWN_FORM": [v, { ...v, v: 5, text: OWN_FORM_B }] }],
      ["a key the card does not hold", { ...before, "basis.PURCHASED": [] } as unknown as WordingHistories],
    ];
    const letThrough = proposals.filter(([, after]) => impl.appendOnly(before, after) === null).map(([n]) => n);
    const cleanAppend = impl.appendOnly(before, { ...before, "basis.OWN_FORM": [v, { ...v, v: 2, text: OWN_FORM_B, savedAt: T2 }] }) === null;
    // …and through the store: a builder that rewrites version 1 is stopped by the store's own guard, before the write.
    const rewriter: WordingRules = {
      ...impl.rules,
      append: (h, text, stamp) => (h.length === 0 ? appendVersion(h, text, stamp) : [{ ...h[0], text, savedAt: stamp.savedAt }, ...h.slice(1)]),
    };
    const db2 = fakeDb();
    const guardedStore = storeOf(impl, db2, rewriter);
    const a2 = officer(tag, "w3b");
    await guardedStore.saveMarketingWordings(cardPost(guardedStore, { "basis.OWN_FORM": OWN_FORM_A }), a2, T1);
    const writesBefore = db2.writes();
    const rewrote = await guardedStore.saveMarketingWordings(cardPost(guardedStore, { "basis.OWN_FORM": OWN_FORM_B }), a2, T2);
    const conds = {
      base: base.ok && v1.length === 1,
      notUnderstood,
      untouched: db.writes() === writes0 && (await auditRows(a)).length === rows0 && JSON.stringify(store.wordingHistory("basis.OWN_FORM")) === JSON.stringify(v1),
      checkRefuses: letThrough.length === 0 && cleanAppend,
      storeGuard: !rewrote.ok && rewrote.reason === "history" && db2.writes() === writesBefore
        && guardedStore.wordingHistory("basis.OWN_FORM")[0]?.text === OWN_FORM_A && (await auditRows(a2)).length === 1,
    };
    ok(p(L.w3), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · ${answers.filter((x) => !x.endsWith("=not_understood")).join(" · ")} · let through [${letThrough.join(", ")}]`
      + ` · rewrite ${rewrote.ok ? "ok" : rewrote.reason}`);
  }

  // ── W4 · EVERY RULE IN ITS OWN WORDS, EVERY PROBLEM AT ONCE, THE NORMALISER, THE AUDIT ROW ───────────────────
  {
    const failingDefaults = WORDING_KEYS.filter((k) => impl.problems(k, impl.defaults[k]).length > 0);
    type Case = { readonly name: string; readonly key: WordingKey; readonly text: string; readonly codes: string; readonly sentence?: string };
    const cases: Case[] = [
      { name: "too short", key: "adult.test", text: "18 or old", codes: "too_short", sentence: WORDING_SENTENCE.tooShort(10) },
      { name: "too long", key: "basis.OWN_FORM", text: `${OWN_FORM_A} ${"a".repeat(400)}`, codes: "too_long", sentence: WORDING_SENTENCE.tooLong(400) },
      { name: "markup", key: "notice.thirdParty", text: "These numbers will be stored <b>without</b> consent.", codes: "markup", sentence: WORDING_SENTENCE.markup },
      { name: "a phone number", key: "adult.list", text: `${WORDING_DEFAULTS["adult.list"]} Call 0712 345 678.`, codes: "has_phone", sentence: WORDING_SENTENCE.hasPhone },
      // m6 · for a wording, a solidus and a comma join the digits of a number too.
      { name: "a phone number written with solidi (m6)", key: "adult.list", text: `${WORDING_DEFAULTS["adult.list"]} Call 0712/345/678.`, codes: "has_phone", sentence: WORDING_SENTENCE.hasPhone },
      { name: "a phone number written with commas (m6)", key: "adult.test", text: "I confirm that the person who uses 0712,345,678 is 18 or older.", codes: "has_phone", sentence: WORDING_SENTENCE.hasPhone },
      { name: "a date written with solidi is not a number", key: "adult.list", text: "I confirm that every number on this list, gathered on 12/03/2026, belongs to a person aged 18 or older.", codes: "" },
      { name: "a consent basis that never says agreed", key: "basis.OWN_EVENT", text: "This person gave their number to 50pick staff at a 50pick event and asked about 50pick offers by SMS.", codes: "consent_not_stated", sentence: WORDING_SENTENCE.consentNotStated },
      { name: "a consent basis that says agreed only in a denial", key: "basis.OWN_EVENT", text: "This person gave their number to 50pick staff at a 50pick shop but never agreed to receive offers by SMS.", codes: "consent_negated", sentence: WORDING_SENTENCE.consentNegated },
      { name: "a bought list that never denies an agreement", key: "basis.THIRD_PARTY", text: "This number came from a bought list, and 50pick may message the person about offers.", codes: "not_agreed_missing", sentence: WORDING_SENTENCE.notAgreedThirdParty },
      { name: "the licence basis without the licence", key: "basis.LICENCE_OUTREACH", text: "50pick may send this person offers by SMS as outreach. The person has not agreed to receive them; every message carries a stop link.", codes: "licence_missing", sentence: WORDING_SENTENCE.licence },
      { name: "the licence basis without the stop", key: "basis.LICENCE_OUTREACH", text: "50pick may send this person offers by SMS under its Gaming Board of Tanzania licence. The person has not agreed to receive them.", codes: "stop_missing", sentence: WORDING_SENTENCE.stop },
      { name: "an 18+ sentence without 18", key: "adult.consent", text: "They told us they are adults.", codes: "eighteen_missing", sentence: WORDING_SENTENCE.eighteen },
      { name: "a basis without 50pick", key: "basis.THIRD_PARTY", text: "This number came from a bought or third-party list; the person never agreed to hear from us.", codes: "brand_missing", sentence: WORDING_SENTENCE.brand },
      { name: "a consent basis without SMS", key: "basis.OWN_FORM", text: "This person gave their number to 50pick on a 50pick form and agreed there to receive 50pick offers and news.", codes: "sms_missing", sentence: WORDING_SENTENCE.sms },
      { name: "a list confirmation without the list", key: "adult.list", text: "I confirm that every number here belongs to a person aged 18 or older.", codes: "list_missing", sentence: WORDING_SENTENCE.list },
      { name: "a source line with angle brackets", key: "source.phrase", text: "<b>Orodha</b>", codes: "markup" },
      { name: "a blank source line (no source line)", key: "source.phrase", text: "   ", codes: "" },
    ];
    const wrongCases = cases.filter((c) => {
      const got = impl.problems(c.key, c.text);
      return codesOf(got) !== c.codes || (c.sentence !== undefined && got[0]?.sentence !== c.sentence);
    }).map((c) => `${c.name}: ${codesOf(impl.problems(c.key, c.text)) || "none"}`);
    // The source line is judged by the RENDERER's own verdict — the one every campaign save and every send re-runs.
    const probe = { name: "Probe", bodySw: "50pick", bodyEn: "", nameFallbackSw: "", nameFallbackEn: "" };
    const renderer = (t: string): string[] => validateCampaignTemplate(probe, normalizeWording(t)).problems.sourcePhrase ?? [];
    const sourceTexts = ["a".repeat(31), `Orodha ya 50pick${RIGHT_QUOTE}s`, "Orodha {jina}"];
    const sourceWrong = sourceTexts.filter((t) => {
      const got = impl.problems("source.phrase", t);
      const want = renderer(t);
      return want.length === 0 || codesOf(got) !== want.map(() => "source_line").join(",") || JSON.stringify(got.map((x) => x.sentence)) !== JSON.stringify(want);
    });
    // Every problem at once — in one wording, and across two in one save.
    const allAtOnce = codesOf(impl.problems("basis.LICENCE_OUTREACH", "hello there")) === "too_short,brand_missing,licence_missing,not_agreed_missing,stop_missing"
      && codesOf(impl.problems("basis.OWN_FORM", "Call <me> on 0712 345 678 for offers")) === "markup,has_phone,brand_missing,sms_missing,consent_not_stated";
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w4");
    const bad = await store.saveMarketingWordings(cardPost(store, {
      "adult.test": "18 or old",
      "basis.THIRD_PARTY": "This number came from a bought list, and 50pick may message the person about offers.",
    }), a, T1);
    const bothListed = !bad.ok && bad.reason === "invalid" && (bad.problems["adult.test"]?.length ?? 0) > 0
      && (bad.problems["basis.THIRD_PARTY"]?.length ?? 0) > 0 && db.writes() === 0 && (await auditRows(a)).length === 0;
    const phone = await store.saveMarketingWordings(cardPost(store, { "adult.list": `${WORDING_DEFAULTS["adult.list"]} Call 0712/345/678.` }), a, T1);
    const phoneRefused = !phone.ok && (phone.problems["adult.list"] ?? []).some((x) => x.code === "has_phone") && db.writes() === 0;
    // A valid save: stored as normalised, and audited by the factory as { before, after, changes } naming only that wording.
    const clean = "I confirm that the person who uses this number is 18 or older.";
    const good = await store.saveMarketingWordings(cardPost(store, { "adult.test": `  I confirm  that the person who uses this number${ZWSP} is 18 or older.  ` }), a, T2);
    const rows = await auditRows(a);
    const payload = (rows[0]?.payload ?? {}) as { before?: Record<string, unknown>; after?: Record<string, unknown>; changes?: Record<string, unknown> };
    const afterList = payload.after?.["adult.test"];
    const audited = good.ok && rows.length === 1 && rows[0].category === "ADMIN" && rows[0].targetType === MARKETING_WORDINGS_AUDIT.targetType
      && rows[0].targetId === "global" && JSON.stringify(payload.before?.["adult.test"]) === "[]"
      && Array.isArray(afterList) && (afterList[0] as WordingVersion | undefined)?.text === clean
      && JSON.stringify(Object.keys(payload.changes ?? {})) === JSON.stringify(["adult.test"])
      && store.currentWording("adult.test")?.text === clean;
    // ⭐ The normaliser is IDEMPOTENT: a format character between a letter and its accent blocks composition until it is
    // removed, so the text is composed again after the removal — and a saved wording reads back, in another process, as
    // the words that were saved (the read checks a saved text is already normalised).
    const tricky = `They told us at the cafe${ZWJ}${ACUTE} that they are 18 or older.`;
    const once = impl.rules.normalize(tricky);
    const messy = [tricky, `  a${ZWSP}b  c `, `e${ACUTE}${ZWJ}`, `${ZWJ}${ACUTE}x`, `x${String.fromCharCode(7)}${ACUTE}y`];
    const idempotent = impl.rules.normalize(once) === once && once.includes(`caf${E_ACUTE}`)
      && messy.every((s) => impl.rules.normalize(impl.rules.normalize(s)) === impl.rules.normalize(s));
    const dbI = fakeDb();
    const writer = storeOf(impl, dbI);
    const iA = officer(tag, "w4i");
    const savedTricky = await writer.saveMarketingWordings(cardPost(writer, { "adult.consent": tricky }), iA, T1);
    const reader = storeOf(impl, dbI);
    await tick();
    const readBack = reader.currentWording("adult.consent")?.text === once;
    const savedAfter = await reader.saveMarketingWordings(cardPost(reader, { "adult.list": WORDING_DEFAULTS["adult.list"] }), iA, T2);
    const roundTrip = savedTricky.ok && readBack && savedAfter.ok;
    const conds = {
      defaultsPass: failingDefaults.length === 0, ownCases: wrongCases.length === 0, sourceLine: sourceWrong.length === 0, allAtOnce,
      bothListed, phoneRefused, audited, idempotent, roundTrip,
    };
    ok(p(L.w4), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · failing suggestions [${failingDefaults.join(", ")}] · wrong [${wrongCases.join(" | ")}] · source [${sourceWrong.join(" | ")}]`
      + ` · round trip ${savedTricky.ok ? "saved" : savedTricky.reason}/${readBack ? "read" : "unread"}/${savedAfter.ok ? "saved" : savedAfter.reason}`);
  }

  // ── W5 · ⛔ THE LICENCE BASIS CAN NEVER BE SAVED CLAIMING CONSENT ─────────────────────────────────────────────
  {
    const LIC: WordingKey = "basis.LICENCE_OUTREACH";
    const claims = [
      "50pick may send this person offers and news by SMS under its Gaming Board of Tanzania licence because they agreed to receive them; a stop is kept for good.",
      "50pick may send this person offers by SMS under its licence. The person consented to receive them, and every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed to receive them, but agreed to hear from us; a stop ends it.",
      "50pick may send this person offers by SMS under its licence; the person hasn't agreed, and every message carries a stop link.",
      // m3 · every other way of saying they agreed, beside a plain denial.
      "50pick may send this person offers by SMS under its licence. The person has not agreed to receive them, but opted in to our list; every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed, but gave us permission to write; every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed, but accepted our terms; every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed, but signed up at a stand; every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed, but asked for offers; every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed, but subscribed to our news; every message carries a stop link.",
      "50pick may send this person offers by SMS under its licence. The person has not agreed, but consented by phone; every message carries a stop link.",
    ];
    const denials = [
      impl.defaults[LIC],
      "50pick may message this person by SMS as outreach under its Gaming Board of Tanzania licence; the person never agreed to it, and a stop link ends it.",
      "Under its licence, 50pick may send this person offers by SMS. The person did not agree to them; every message carries a stop link.",
      // m3 · a NEGATED permission is a denial too, not a claim.
      "50pick may message this person by SMS as outreach under its Gaming Board of Tanzania licence; the person never agreed to it and gave no permission, and a stop link ends it.",
    ];
    const claimed = claims.filter((t) => !impl.problems(LIC, t).some((x) => x.code === "not_agreed_missing"));
    const deniedButRefused = denials.filter((t) => impl.problems(LIC, t).length > 0);
    const ownSentence = impl.problems(LIC, claims[0]).find((x) => x.code === "not_agreed_missing")?.sentence === WORDING_SENTENCE.notAgreedLicence;
    const db = fakeDb();
    const store = storeOf(impl, db);
    const r = await store.saveMarketingWordings(cardPost(store, { [LIC]: claims[4] }), officer(tag, "w5"), T1);
    const storeRefused = !r.ok && r.reason === "invalid" && (r.problems[LIC] ?? []).some((x) => x.code === "not_agreed_missing")
      && db.writes() === 0 && store.currentWording(LIC) === null;
    const third = impl.problems("basis.THIRD_PARTY", "This number came from a bought list; 50pick may message the person, who agreed to hear from us.");
    const thirdOwn = third.some((x) => x.code === "not_agreed_missing" && x.sentence === WORDING_SENTENCE.notAgreedThirdParty);
    const thirdOptIn = impl.problems("basis.THIRD_PARTY", "This number came from a bought list; the person never agreed to hear from 50pick, though they signed up elsewhere.")
      .some((x) => x.code === "not_agreed_missing");
    const conds = { claimsRefused: claimed.length === 0, denialsAccepted: deniedButRefused.length === 0, ownSentence, storeRefused, thirdOwn, thirdOptIn };
    ok(p(L.w5), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · accepted as a denial: [${claimed.map((t) => t.slice(0, 90)).join(" | ")}] · refused denials: [${deniedButRefused.map((t) => codesOf(impl.problems(LIC, t))).join(" | ")}]`);
  }

  // ── W6 · RECOGNITION AGAINST EVERY SAVED PAIR, AND NOTHING ELSE ──────────────────────────────────────────────
  {
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w6");
    const s1 = await store.saveMarketingWordings(cardPost(store, {
      "basis.OWN_FORM": OWN_FORM_A, "adult.consent": ADULT_A, "basis.AGENT_ROSTER": ROSTER_A,
      "basis.THIRD_PARTY": WORDING_DEFAULTS["basis.THIRD_PARTY"], "basis.LICENCE_OUTREACH": WORDING_DEFAULTS["basis.LICENCE_OUTREACH"],
    }), a, T1);
    const s2 = await store.saveMarketingWordings(cardPost(store, { "basis.OWN_FORM": OWN_FORM_B, "adult.consent": ADULT_B }), a, T2);
    const row = (wording: string, over: Record<string, unknown> = {}) =>
      ({ status: "GIVEN", source: "IMPORT", recordedBy: "officer-w6", wording, ...over }) as { status: string; source: string; recordedBy: string | null; wording: string };
    const yes = [`${OWN_FORM_A} ${ADULT_A}`, `${OWN_FORM_A} ${ADULT_B}`, `${OWN_FORM_B} ${ADULT_A}`, `${OWN_FORM_B} ${ADULT_B}`, `${ROSTER_A} ${ADULT_A}`];
    const no: Array<[string, ReturnType<typeof row>]> = [
      ["an unsaved default (OWN_EVENT was never saved)", row(`${WORDING_DEFAULTS["basis.OWN_EVENT"]} ${ADULT_A}`)],
      ["OWN_FORM's default, which was never saved as such", row(`${WORDING_DEFAULTS["basis.OWN_FORM"]} ${ADULT_A}`)],
      ["a near copy, one trailing space", row(`${OWN_FORM_B} ${ADULT_B} `)],
      ["a near copy, shouted", row(`${OWN_FORM_B} ${ADULT_B}`.toUpperCase())],
      ["the adult sentence alone", row(ADULT_B)],
      ["THIRD_PARTY with the adult sentence glued on", row(`${WORDING_DEFAULTS["basis.THIRD_PARTY"]} ${ADULT_A}`)],
      ["LICENCE_OUTREACH with the adult sentence glued on", row(`${WORDING_DEFAULTS["basis.LICENCE_OUTREACH"]} ${ADULT_A}`)],
      ["recordedBy null", row(`${OWN_FORM_B} ${ADULT_B}`, { recordedBy: null })],
      ["source OPERATOR", row(`${OWN_FORM_B} ${ADULT_B}`, { source: "OPERATOR" })],
      ["status WITHDRAWN", row(`${OWN_FORM_B} ${ADULT_B}`, { status: "WITHDRAWN" })],
    ];
    const missed = yes.filter((w) => !store.isImportAttestationSaved(row(w)));
    const wrongly = no.filter(([, r]) => store.isImportAttestationSaved(r)).map(([n]) => n);
    const composed = importConsentWording(consentBasisFor("OWN_FORM"), store.savedBasisWordings());
    ok(p(L.w6), s1.ok && s2.ok && missed.length === 0 && wrongly.length === 0 && composed === `${OWN_FORM_B} ${ADULT_B}`,
      `saves ${s1.ok ? "ok" : s1.reason}/${s2.ok ? "ok" : s2.reason} · missed ${missed.length} · recognised wrongly [${wrongly.join(", ")}] · composes ${JSON.stringify(composed)}`);
  }

  // ── W7 · A PROCESS THAT NEVER LOADED THE ROW REFUSES, AND READS NOTHING ──────────────────────────────────────
  {
    const db = fakeDb({ failLoads: true });
    const store = storeOf(impl, db);
    await tick();
    const a = officer(tag, "w7");
    const r = await store.saveMarketingWordings(cardPost(store, { "adult.test": WORDING_DEFAULTS["adult.test"] }), a, T1);
    await tick();
    const refused = !r.ok && (r.reason === "unreadable" || r.reason === "not_saved") && db.writes() === 0 && (await auditRows(a)).length === 0;
    const blind = WORDING_KEYS.every((k) => store.currentWording(k) === null)
      && !store.isImportAttestationSaved({ status: "GIVEN", source: "IMPORT", recordedBy: "officer-w7", wording: `${WORDING_DEFAULTS["basis.OWN_FORM"]} ${WORDING_DEFAULTS["adult.consent"]}` });
    ok(p(L.w7), refused && blind, `${r.ok ? "saved" : `${r.reason}: ${r.error}`} · writes ${db.writes()} · readers blind ${blind}`);
  }

  // ── W8 · THE WIRING ──────────────────────────────────────────────────────────────────────────────────────────
  {
    const src = impl.src;
    const at = src.actions.indexOf("export async function saveMarketingWordingsAction(");
    // ⛔ ENDS AT THE NEXT TOP-LEVEL EXPORT (U33p, 2026-10-04): `savePolicyLinesAction` follows this action in the same
    // file and reads its form with the same `patchFromForm(formData.entries())` — a slice to the end of the file let THAT
    // call satisfy W8, and the plant that removes this action's own call stayed green (red:marketing-wordings 35/36).
    const end = at < 0 ? -1 : src.actions.indexOf(String.fromCharCode(10) + "export ", at + 1);
    const action = at < 0 ? "" : src.actions.slice(at, end < 0 ? undefined : end);
    const actionOk = squash(action).startsWith(squash("export async function saveMarketingWordingsAction(formData: FormData): Promise<MarketingWordingsActionResult> {") + squash("const session = await requireAdmin();"))
      && action.includes("patchFromForm(formData.entries())") && action.includes("saveMarketingWordings(form.patch, session.userId)")
      && action.includes("fieldError(wordingFieldName(first), res.error)")
      && ["/admin/system", "/admin/campaigns/new", "/admin/contacts"].every((path) => action.includes(`revalidatePath("${path}")`));
    const BLOCKED_BRANCH = squash("if (blocked.length > 0) { focusFirstInvalid(form, blocked.map((key) => wordingFieldName(key))); return; }");
    const onSubmitAt = src.form.indexOf("const onSubmit = ");
    const onSubmitBody = onSubmitAt < 0 ? "" : src.form.slice(onSubmitAt, src.form.indexOf("start(async", onSubmitAt));
    const neverSilent = squash(onSubmitBody).includes(BLOCKED_BRANCH) && onSubmitBody.includes('toast({ title: "Nothing to save yet"')
      && squash(src.form).split(BLOCKED_BRANCH).length - 1 === 2;
    const cardOk = isDirective(rawRead("src/app/admin/system/marketing-wordings-form.tsx"), "use client")
      && src.form.includes("useMayAct()") && (src.form.match(/wordingProblems[(]/g) ?? []).length >= 2
      && src.form.includes("saveMarketingWordingsAction") && src.form.includes("<UnsavedChangesGuard")
      && src.form.includes("saveAnchor={saveRef}") && src.form.includes("dataField={wordingFieldName(key)}")
      && src.form.includes("wordingsToSave(cardState)") && src.form.includes("wordingsPostEntries(sending)")
      && src.form.includes("approvesOnEdit(key, versionsOf(key).length)") && neverSilent
      && src.form.includes("ariaLabel={`${APPROVE_LABEL}: ${WORDING_COPY[key].label}`}")
      && (src.form.match(/aria-describedby=[{]statusId[}]/g) ?? []).length === 2 && src.form.includes("id={statusId}");
    const groupAt = src.page.indexOf('{tab === "wordings" && (<>');
    const groupEnd = groupAt < 0 ? -1 : src.page.indexOf("</>)}", groupAt);
    const cardAt = src.page.indexOf("<MarketingWordingsForm");
    const pageOk = groupAt >= 0 && cardAt > groupAt && cardAt < groupEnd
      && src.page.includes('from "@/lib/server/marketing/wordings"') && src.page.includes("wordingHistory(key)")
      && src.page.includes('{ value: "wordings", labelEn: "Marketing wordings", href: "/admin/system?tab=wordings" }')
      && src.page.includes('const wordingRows = tab === "wordings" ? await marketingWordingRows() : null;')
      && src.page.includes('sp.tab === "wordings" ? "wordings"');
    const specs = [...src.pure.matchAll(/from[ ]*"([^"]+)"/g)].map((m) => m[1]);
    const pureOk = !isDirective(src.pureRaw, "use client") && !isDirective(src.pureRaw, "use server")
      && JSON.stringify(specs) === JSON.stringify(["./consent-basis", "../contacts/contact-fields", "./campaign-template"]);
    const curAt = src.server.indexOf("const current = cfg.get();");
    const setAt = src.server.indexOf("cfg.setVerified(updates, officerId)");
    const beforeWrite = curAt >= 0 && setAt > curAt ? src.server.slice(curAt, setAt) : "";
    const recheck = beforeWrite.includes("rules.appendOnly(current, merge(current, updates))")
      && beforeWrite.split("await").length === 2 && beforeWrite.trimEnd().endsWith("const res = await");
    const partRead = src.server.includes('if (fresh.stored && seen.dropped.length > 0) return refusal("history_unreadable");')
      && src.server.includes("const reading = o.rules.readRow(persisted);") && src.server.includes("seen.dropped = reading.dropped;");
    const serverOk = src.server.includes('MARKETING_WORDINGS_KEY = "marketing.wordings"')
      && src.server.includes('action: "config.marketing_wordings_updated"') && src.server.includes('targetType: "MARKETING_WORDINGS"')
      && src.server.includes("merge: o.merge") && src.server.includes("cfg.setVerified(updates, officerId)")
      && squash(src.server).includes(squash("const live = makeStore({ key: MARKETING_WORDINGS_KEY, rules: WORDING_RULES, merge: mergeWordings, queued: true });"))
      && partRead && recheck;
    const pinAt = src.cgs.indexOf("const PINNED = [");
    const pinned = pinAt < 0 ? "" : src.cgs.slice(pinAt, src.cgs.indexOf("];", pinAt));
    const pinOk = pinned.includes('"lib/marketing/marketing-wordings.ts"');
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(src.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    const atSuite = chain.indexOf("npm run test:marketing-wordings");
    const wired = scripts["test:marketing-wordings"] === "tsx scripts/marketing-wordings.test.mts"
      && scripts["red:marketing-wordings"] === "tsx scripts/marketing-wordings.test.mts --prove-red"
      && chain.filter((x) => x === "npm run test:marketing-wordings").length === 1
      && atSuite > 0 && chain[atSuite - 1] === "npm run test:marketing-consent";
    const conds = { actionOk, cardOk, neverSilent, pageOk, pureOk, serverOk, partRead, recheck, pinOk, wired };
    ok(p(L.w8), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · the pure module loads [${specs.join(", ")}]`);
  }

  // ── W9 · ⛔ M2 · A SUGGESTION IS SAVED ONLY ON PURPOSE — THE CARD'S HALF AND THE SERVER'S ─────────────────────
  {
    const savedNone = Object.fromEntries(WORDING_KEYS.map((k) => [k, { count: 0, text: null }])) as WordingCardState["saved"];
    const texts0 = { ...WORDING_DEFAULTS } as Record<WordingKey, string>;
    const keysOf = (list: ReadonlyArray<{ key: WordingKey }>): string => list.map((w) => w.key).join(",");
    const editedText = "I confirm that the person using this number is 18 or older.";
    const unticked = impl.toSave({ texts: texts0, saved: savedNone, approved: {} });
    const ticked = impl.toSave({ texts: texts0, saved: savedNone, approved: { "adult.test": true } });
    const ticksOnEdit = impl.approvesOnEdit("adult.test", 0) && !impl.approvesOnEdit("adult.test", 2) && !impl.approvesOnEdit("source.phrase", 0);
    const edit = impl.toSave({ texts: { ...texts0, "adult.test": editedText }, saved: savedNone, approved: { "adult.test": impl.approvesOnEdit("adult.test", 0) } });
    const sourceBlank = impl.toSave({ texts: texts0, saved: savedNone, approved: { "source.phrase": true } });
    const sourceTyped = impl.toSave({ texts: { ...texts0, "source.phrase": "Orodha ya 50pick" }, saved: savedNone, approved: {} });
    const savedSome = { ...savedNone, "adult.test": { count: 2, text: editedText } } as WordingCardState["saved"];
    const sameSaved = impl.toSave({ texts: { ...texts0, "adult.test": `${editedText} ` }, saved: savedSome, approved: {} });
    const changedSaved = impl.toSave({ texts: { ...texts0, "adult.test": ADULT_TEST_A }, saved: savedSome, approved: {} });
    const card = {
      untickedNeverSent: unticked.length === 0,
      tickedSent: keysOf(ticked) === "adult.test" && ticked[0]?.approve === true && ticked[0]?.base === 0,
      editTicks: ticksOnEdit && keysOf(edit) === "adult.test" && edit[0]?.approve === true && edit[0]?.text === editedText,
      sourceOnlyTyped: sourceBlank.length === 0 && keysOf(sourceTyped) === "source.phrase" && sourceTyped[0]?.approve === true && sourceTyped[0]?.base === 0,
      savedOnChange: sameSaved.length === 0 && keysOf(changedSaved) === "adult.test" && changedSaved[0]?.approve === false && changedSaved[0]?.base === 2,
    };
    // The request a tick builds, read back by the action's reading and the server's.
    const form = impl.fromForm(impl.postEntries(ticked));
    const reading = form.ok ? readWordingsPatch(form.patch) : null;
    const request = reading !== null && reading.ok
      && JSON.stringify(reading.request.texts) === JSON.stringify({ "adult.test": WORDING_DEFAULTS["adult.test"] })
      && reading.request.approved["adult.test"] === true && reading.request.base["adult.test"] === 0;
    // The server's half: a hand-built POST of the nine suggestions, each with its version count and NO approval.
    const nine = WORDING_KEYS.filter((k) => !WORDING_RULE[k].clearable);
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w9");
    const handBuilt: Record<string, string> = {};
    for (const k of nine) { handBuilt[k] = WORDING_DEFAULTS[k]; handBuilt[baseFieldName(k)] = "0"; }
    const refused = await store.saveMarketingWordings(handBuilt, a, T1);
    const bare: Record<string, string> = {};
    for (const k of nine) bare[k] = WORDING_DEFAULTS[k];
    const refusedBare = await store.saveMarketingWordings(bare, a, T1);
    const nothingWritten = db.writes() === 0 && (await auditRows(a)).length === 0 && nine.every((k) => store.currentWording(k) === null);
    const approvedPost: Record<string, string> = { ...handBuilt };
    for (const k of nine) approvedPost[approveFieldName(k)] = "1";
    const accepted = await store.saveMarketingWordings(approvedPost, a, T2);
    const server = {
      refused: !refused.ok && refused.reason === "not_approved"
        && nine.every((k) => refused.problems[k]?.[0]?.code === "not_approved" && refused.problems[k]?.[0]?.sentence === NOT_APPROVED_SENTENCE),
      bareNotUnderstood: !refusedBare.ok && refusedBare.reason === "not_understood",
      nothingWritten,
      approvedSaved: accepted.ok && accepted.changed.length === nine.length && nine.every((k) => store.currentWording(k)?.v === 1),
      sentence: WORDING_SENTENCE.notApproved === NOT_APPROVED_SENTENCE,
    };
    ok(p(L.w9), Object.values(card).every(Boolean) && request && Object.values(server).every(Boolean),
      `card ${JSON.stringify(card)} · request ${request} · server ${JSON.stringify(server)} · `
      + `${refused.ok ? "the suggestions SAVED unapproved" : refused.reason}`);
  }

  // ── W10 · m1 · A PAGE OUT OF DATE IS REFUSED ──────────────────────────────────────────────────────────────────
  {
    const K: WordingKey = "adult.test";
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w10a");
    const b = officer(tag, "w10b");
    const v1 = await store.saveMarketingWordings({ [K]: ADULT_TEST_A, [baseFieldName(K)]: "0", [approveFieldName(K)]: "1" }, a, T1);
    const writes1 = db.writes();
    // A page opened before version 1 still says 0 versions…
    const stale = await store.saveMarketingWordings({ [K]: ADULT_TEST_B, [baseFieldName(K)]: "0", [approveFieldName(K)]: "1" }, b, T2);
    // …and a count from nowhere (2) is not the count saved now either.
    const ahead = await store.saveMarketingWordings({ [K]: ADULT_TEST_B, [baseFieldName(K)]: "2" }, b, T2);
    const untouched = db.writes() === writes1 && store.wordingHistory(K).length === 1 && store.currentWording(K)?.text === ADULT_TEST_A
      && (await auditRows(b)).length === 0;
    // The page reloaded: its count is 1, and its words are version 2.
    const fresh = await store.saveMarketingWordings({ [K]: ADULT_TEST_B, [baseFieldName(K)]: "1" }, b, T3);
    const conds = {
      first: v1.ok,
      staleRefused: !stale.ok && stale.reason === "stale" && stale.problems[K]?.[0]?.code === "stale" && stale.problems[K]?.[0]?.sentence === STALE_SENTENCE,
      aheadRefused: !ahead.ok && ahead.reason === "stale",
      untouched,
      freshSaved: fresh.ok && store.wordingHistory(K).length === 2 && store.currentWording(K)?.text === ADULT_TEST_B && store.currentWording(K)?.savedBy === b,
      sentence: WORDING_SENTENCE.stale === STALE_SENTENCE,
    };
    ok(p(L.w10), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · stale ${stale.ok ? "SAVED" : stale.reason} · ahead ${ahead.ok ? "SAVED" : ahead.reason}`);
  }

  // ── W11 · m3 · A NEGATION AFTER "AGREED", AND A LETTER FROM ANOTHER ALPHABET ──────────────────────────────────
  {
    const negatedAfter: Array<[string, WordingKey, string]> = [
      ["agreed to nothing", "basis.OWN_FORM", "This person gave their number to 50pick on a 50pick form and agreed to nothing about SMS offers."],
      ["agreed to no offers", "basis.OWN_EVENT", "This person gave their number to 50pick staff at a 50pick shop and agreed to no offers by SMS."],
      ["agreed, but not to SMS", "basis.AGENT_ROSTER", "This person gave their number to a registered 50pick agent and agreed, but not to SMS offers."],
    ];
    const stillConsents: Array<[WordingKey, string]> = [
      ["basis.OWN_FORM", impl.defaults["basis.OWN_FORM"]],
      ["basis.OWN_EVENT", impl.defaults["basis.OWN_EVENT"]],
      ["basis.AGENT_ROSTER", impl.defaults["basis.AGENT_ROSTER"]],
      // An accented letter is still the Latin alphabet, and "no permission is needed to stop" denies no agreement.
      ["basis.OWN_EVENT", `This person gave their number to 50pick at the Mlimani City caf${E_ACUTE} and agreed there to receive 50pick offers by SMS; no permission is needed to stop.`],
    ];
    const nonLatin: Array<[string, WordingKey, string]> = [
      ["a Cyrillic look-alike of a, inside the word agreed", "basis.OWN_FORM", OWN_FORM_A.replace("agreed", `${CYR_A}greed`)],
      ["a Greek look-alike of o, in an 18+ sentence", "adult.consent", `They told us they are 18 or ${GRK_O}lder.`],
      ["a Cyrillic look-alike of a, in the licence basis's denial", "basis.LICENCE_OUTREACH", WORDING_DEFAULTS["basis.LICENCE_OUTREACH"].replace("has not agreed", `h${CYR_A}s not agreed`)],
    ];
    const wrongAfter = negatedAfter.filter(([, k, t]) => {
      const hit = impl.problems(k, t).find((x) => x.code === "consent_negated");
      return hit === undefined || hit.sentence !== WORDING_SENTENCE.consentNegated;
    }).map(([n]) => n);
    const wronglyRefused = stillConsents.filter(([k, t]) => impl.problems(k, t).length > 0).map(([k, t]) => `${k}: ${codesOf(impl.problems(k, t))}`);
    const wrongScript = nonLatin.filter(([, k, t]) => !impl.problems(k, t).some((x) => x.code === "non_latin" && x.sentence === WORDING_SENTENCE.nonLatin))
      .map(([n]) => n);
    const db = fakeDb();
    const store = storeOf(impl, db);
    const r = await store.saveMarketingWordings(cardPost(store, { "basis.OWN_FORM": nonLatin[0][2], "basis.OWN_EVENT": negatedAfter[1][2] }), officer(tag, "w11"), T1);
    const storeRefused = !r.ok && r.reason === "invalid" && (r.problems["basis.OWN_FORM"] ?? []).some((x) => x.code === "non_latin")
      && (r.problems["basis.OWN_EVENT"] ?? []).some((x) => x.code === "consent_negated") && db.writes() === 0;
    const conds = { negatedAfter: wrongAfter.length === 0, consentsPass: wronglyRefused.length === 0, otherAlphabet: wrongScript.length === 0, storeRefused };
    ok(p(L.w11), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · let through [${wrongAfter.join(", ")}] · refused [${wronglyRefused.join(" | ")}] · alphabet missed [${wrongScript.join(", ")}]`);
  }

  // ── W12 · ⛔ M1 · A ROW NOT READ IN FULL IS NEVER REWRITTEN ───────────────────────────────────────────────────
  {
    const goodV1: WordingVersion = { v: 1, text: ADULT_A, savedAt: T1, savedBy: "officer-seed" };
    const seeds: Array<[string, unknown, WordingKey | null]> = [
      ["a malformed history (version 1 without its author)", { "adult.consent": [goodV1], "adult.test": [{ v: 1, text: ADULT_TEST_A }] }, "adult.test"],
      ["a history out of order (it starts at version 2)", { "adult.consent": [goodV1], "basis.OWN_FORM": [{ ...goodV1, v: 2, text: OWN_FORM_A }] }, "basis.OWN_FORM"],
      ["a key the card does not hold", { "adult.consent": [goodV1], "basis.PURCHASED": [] }, null],
      ["a row that is not a record at all", [goodV1], null],
    ];
    const results: string[] = [];
    let allRefused = true;
    let readersClosed = true;
    for (const [name, seed, droppedKey] of seeds) {
      const db = fakeDb({ seed });
      const store = storeOf(impl, db);
      await tick();
      const before = JSON.stringify(db.row());
      const a = officer(tag, "w12");
      if (droppedKey !== null && store.currentWording(droppedKey) !== null) readersClosed = false;
      if (!Array.isArray(seed) && store.currentWording("adult.consent")?.text !== ADULT_A) readersClosed = false;
      const r = await store.saveMarketingWordings(cardPost(store, { "adult.list": WORDING_DEFAULTS["adult.list"] }), a, T2);
      const refused = !r.ok && r.reason === "history_unreadable" && r.error === UNREADABLE_SENTENCE && db.writes() === 0
        && JSON.stringify(db.row()) === before && (await auditRows(a)).length === 0;
      if (!refused) allRefused = false;
      results.push(`${name}=${r.ok ? "REWRITTEN" : r.reason}`);
    }
    // The control: a row read in full is saved over as usual — the refusal is about what was dropped, and nothing else.
    const dbOk = fakeDb({ seed: { "adult.consent": [goodV1] } });
    const storeOk = storeOf(impl, dbOk);
    await tick();
    const saved = await storeOk.saveMarketingWordings(cardPost(storeOk, { "adult.list": WORDING_DEFAULTS["adult.list"] }), officer(tag, "w12ok"), T2);
    const control = saved.ok && JSON.stringify(dbOk.row()?.["adult.consent"]) === JSON.stringify([goodV1]) && storeOk.currentWording("adult.list")?.v === 1;
    const sentence = WORDINGS_REFUSAL_SENTENCE.history_unreadable === UNREADABLE_SENTENCE;
    ok(p(L.w12), allRefused && readersClosed && control && sentence,
      `${results.join(" · ")} · readers closed ${readersClosed} · control ${saved.ok ? "saved" : saved.reason} · sentence ${sentence}`);
  }

  // ── W13 · D9 · TWO SAVES AT ONCE KEEP BOTH ────────────────────────────────────────────────────────────────────
  {
    const K: WordingKey = "adult.test";
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "w13a");
    const b = officer(tag, "w13b");
    // One wording saved twice at once — the second built on the first (its count is 1): both kept, numbered 1 and 2.
    const [r1, r2] = await Promise.all([
      store.saveMarketingWordings({ [K]: ADULT_TEST_A, [baseFieldName(K)]: "0", [approveFieldName(K)]: "1" }, a, T1),
      store.saveMarketingWordings({ [K]: ADULT_TEST_B, [baseFieldName(K)]: "1" }, b, T2),
    ]);
    const h = store.wordingHistory(K);
    // Two wordings saved at once, each from nothing: neither save drops the other's version.
    const [r3, r4] = await Promise.all([
      store.saveMarketingWordings({ "adult.list": WORDING_DEFAULTS["adult.list"], [baseFieldName("adult.list")]: "0", [approveFieldName("adult.list")]: "1" }, a, T2),
      store.saveMarketingWordings({ "notice.thirdParty": WORDING_DEFAULTS["notice.thirdParty"], [baseFieldName("notice.thirdParty")]: "0", [approveFieldName("notice.thirdParty")]: "1" }, b, T3),
    ]);
    const row = db.row();
    const listRow = row?.["adult.list"];
    const noticeRow = row?.["notice.thirdParty"];
    const conds = {
      bothSaved: r1.ok && r2.ok,
      numbered: h.length === 2 && h[0].v === 1 && h[0].text === ADULT_TEST_A && h[0].savedBy === a
        && h[1].v === 2 && h[1].text === ADULT_TEST_B && h[1].savedBy === b,
      twoWordings: r3.ok && r4.ok && Array.isArray(listRow) && listRow.length === 1 && Array.isArray(noticeRow) && noticeRow.length === 1,
      rowKeepsAll: row !== null && JSON.stringify(row[K]) === JSON.stringify(h),
    };
    const said = [r1, r2, r3, r4].map((r) => (r.ok ? "ok" : r.reason)).join(",");
    ok(p(L.w13), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · ${said}`);
  }

  // ── W14 · THE ACTION'S FORM READING ───────────────────────────────────────────────────────────────────────────
  {
    const K: WordingKey = "adult.test";
    const T = WORDING_DEFAULTS[K];
    const file: unknown = typeof File === "function" ? new File(["words"], "words.txt") : new Blob(["words"]);
    const cardFields: Array<[string, unknown]> = [[K, T], [baseFieldName(K), "0"], [approveFieldName(K), "1"]];
    const readForm = (entries: Array<[string, unknown]>) => {
      const form = impl.fromForm(entries);
      return form.ok ? { taken: true, patch: form.patch, request: readWordingsPatch(form.patch) } : { taken: false, patch: null, request: null };
    };
    const card = readForm(cardFields);
    const withReact = readForm([["$ACTION_ID_0123abcd", ""], ["$ACTION_REF_1", ""], ...cardFields, ["$ACTION_KEY", "k0"]]);
    const twiceText = readForm([[K, T], [K, `${T} Again.`], [baseFieldName(K), "0"], [approveFieldName(K), "1"]]);
    const twiceCount = readForm([[K, T], [baseFieldName(K), "0"], [baseFieldName(K), "1"], [approveFieldName(K), "1"]]);
    const fileText = readForm([[K, file], [baseFieldName(K), "0"], [approveFieldName(K), "1"]]);
    const protoName = readForm([["__proto__", "x"], ...cardFields]);
    const fields = (patch: Record<string, unknown> | null): string => Object.keys(patch ?? {}).sort().join(",");
    const fd = new FormData();
    for (const [name, value] of cardFields) fd.set(name, String(value));
    const viaForm = impl.fromForm(fd.entries());
    const db = fakeDb();
    const store = storeOf(impl, db);
    const saved = viaForm.ok ? await store.saveMarketingWordings(viaForm.patch, officer(tag, "w14"), T1) : null;
    const conds = {
      card: card.taken && card.request?.ok === true && fields(card.patch) === [K, approveFieldName(K), baseFieldName(K)].sort().join(","),
      reactLeftOut: withReact.taken && withReact.request?.ok === true && fields(withReact.patch) === fields(card.patch),
      twiceRefused: !twiceText.taken && !twiceCount.taken,
      fileRefused: fileText.taken && fileText.request?.ok === false,
      protoRefused: protoName.taken && protoName.request?.ok === false,
      formData: saved !== null && saved.ok && store.currentWording(K)?.text === T,
    };
    ok(p(L.w14), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · React's fields kept [${fields(withReact.patch)}]`);
  }
}

/* ══ THE PLANTS — each one piece as somebody would write it wrongly, in memory ═══════════════════════════════════ */

/** W4's plant · the normaliser as it stood before the review — format characters removed AFTER the only composition. */
const CF = new RegExp(`${BACKSLASH}p{Cf}`, "gu");
const WS_OR_CC = new RegExp(`[${BACKSLASH}s${BACKSLASH}p{Cc}]+`, "gu");
const preReviewNormalize = (raw: unknown): string =>
  (typeof raw === "string" ? raw.normalize("NFC").replace(CF, "").replace(WS_OR_CC, " ").trim() : "");

/** W5's plant · the denial check as it stood before the review: one of the three phrases, and no other agree or consent
 *  word once the negated ones are read out — an opt-in, permission or sign-up beside it went unseen. */
const PRE_REVIEW_NEGATED = /(?<![a-z])(?:not|never|no|without)(?: +[a-z0-9']+){0,2} +(?:agree[a-z]*|consent[a-z]*)/g;
const preReviewDenies = (t: string): boolean => {
  const s = normalizeWording(t).toLowerCase();
  return ["never agreed", "has not agreed", "did not agree"].some((x) => s.includes(x))
    && !/(?<![a-z])(?:agree|consent)/.test(s.replace(PRE_REVIEW_NEGATED, " "));
};

function cases(problems: string[]): Array<{ name: string; expect: string; impl: Impl }> {
  const withProblems = (fn: Impl["problems"]): Impl => ({ ...REAL, problems: fn, rules: { ...WORDING_RULES, problems: fn } });
  const withRules = (over: Partial<WordingRules>): Impl => ({ ...REAL, rules: { ...WORDING_RULES, ...over } });
  const srcPlant = (over: Partial<Sources>): Impl => {
    for (const [k, v] of Object.entries(over)) {
      if (v === REAL_SOURCES[k as keyof Sources]) problems.push(`source plant on ${k} changed nothing`);
    }
    return { ...REAL, src: { ...REAL_SOURCES, ...over } };
  };
  const actionAt = REAL_SOURCES.actions.indexOf("export async function saveMarketingWordingsAction(");
  const actionUngated = actionAt < 0 ? REAL_SOURCES.actions
    : REAL_SOURCES.actions.slice(0, actionAt) + REAL_SOURCES.actions.slice(actionAt).replace("const session = await requireAdmin();", "const session = { userId: 'anyone' };");
  const allTicked = Object.fromEntries(WORDING_KEYS.map((k) => [k, true])) as Partial<Record<WordingKey, boolean>>;

  return [
    {
      name: "W0 · a wording key with no catalogue basis behind it ('basis.PURCHASED')",
      expect: L.w0,
      impl: { ...REAL, keys: [...WORDING_KEYS, "basis.PURCHASED"] },
    },
    {
      name: "⛔ a writer reading the default — U33b-L's list writer records the card's SUGGESTION as its 18+ confirmation",
      expect: L.w1,
      impl: {
        ...REAL,
        sources: [...REAL.sources, sourceOf("src/lib/server/marketing/list-basis.ts", lines(
          'import { WORDING_DEFAULTS } from "@/lib/marketing/marketing-wordings";',
          "export async function recordListBasis(db, listId) {",
          '  return db.contactListBasis.create({ data: { listId, adultWording: WORDING_DEFAULTS["adult.list"], adultVersion: 0 } });',
          "}",
        ))],
      },
    },
    {
      name: "⛔ a reader answering the suggestion — currentWording falls back to WORDING_DEFAULTS when nothing is saved",
      expect: L.w1,
      impl: {
        ...REAL,
        wrap: (store) => ({
          ...store,
          currentWording: (k) => store.currentWording(k) ?? { v: 1, text: WORDING_DEFAULTS[k], savedAt: T1, savedBy: "nobody" },
        }),
      },
    },
    {
      name: "the detector reads only a writer's own text — a barrel or a helper launders a suggestion into a writer",
      expect: L.w1c,
      impl: { ...REAL, detect: (sources) => defaultReachOf(sources, { ownTextOnly: true }) },
    },
    {
      name: "⛔ a save that rewrites v1 — the builder replaces the newest version in place instead of appending",
      expect: L.w2,
      impl: withRules({
        append: (h, text, stamp) => (h.length === 0 ? appendVersion(h, text, stamp)
          : [...h.slice(0, -1), { ...h[h.length - 1], text, savedAt: stamp.savedAt, savedBy: stamp.savedBy }]),
      }),
    },
    {
      name: "⛔ the history dropped on save — the merge keeps only the wordings the request rebuilt (the factory's shallow default, in effect)",
      expect: L.w2,
      impl: { ...REAL, merge: (_current, updates) => mergeWordings(EMPTY_WORDINGS, updates) },
    },
    {
      name: "⛔ the append-only check removed — a rebuilt history that rewrites or drops a saved version is written",
      expect: L.w3,
      impl: { ...REAL, appendOnly: () => null, rules: { ...WORDING_RULES, appendOnly: () => null } },
    },
    {
      name: "⛔ a posted history honoured — an array posted for a key is read as that wording's words",
      expect: L.w3,
      impl: withRules({
        readPatch: (raw) => {
          const r = readWordingsPatch(raw);
          if (r.ok || !raw || typeof raw !== "object" || Array.isArray(raw)) return r;
          const texts: Partial<Record<WordingKey, string>> = {};
          const approved: Partial<Record<WordingKey, true>> = {};
          const base: Partial<Record<WordingKey, number>> = {};
          for (const [k, value] of Object.entries(raw as Record<string, unknown>)) {
            if (!isWordingKey(k) || !Array.isArray(value)) continue;
            const last = value[value.length - 1] as { text?: unknown } | string | undefined;
            texts[k] = typeof last === "string" ? last : typeof last?.text === "string" ? last.text : "";
            approved[k] = true;
            base[k] = value.length;
          }
          return Object.keys(texts).length > 0 ? { ok: true, request: { texts, approved, base } } : r;
        },
      }),
    },
    {
      name: "⛔ the phone rule removed — a wording may hold a phone number",
      expect: L.w4,
      impl: withProblems((k, t) => wordingProblems(k, t).filter((x) => x.code !== "has_phone")),
    },
    {
      name: "every problem NOT listed at once — the rules stop at the first",
      expect: L.w4,
      impl: withProblems((k, t) => wordingProblems(k, t).slice(0, 1)),
    },
    {
      name: "a consent basis saved without saying the person agreed — the consent rule removed",
      expect: L.w4,
      impl: withProblems((k, t) => wordingProblems(k, t).filter((x) => x.code !== "consent_not_stated")),
    },
    {
      name: "the normaliser as it stood before the review — not idempotent, so a saved wording no longer reads back as saved",
      expect: L.w4,
      impl: withRules({ normalize: preReviewNormalize }),
    },
    {
      name: "m6 · the wording phone check without its joiners — '0712/345/678' and '0712,345,678' are saved as evidence",
      expect: L.w4,
      impl: withProblems((k, t) => wordingProblems(k, t).filter((x) => x.code !== "has_phone" || holdsPhoneRun(normalizeWording(t)))),
    },
    {
      name: "⛔ the licence rule removed — basis.LICENCE_OUTREACH may be saved claiming consent",
      expect: L.w5,
      impl: withProblems((k, t) => (k === "basis.LICENCE_OUTREACH"
        ? wordingProblems(k, t).filter((x) => x.code !== "not_agreed_missing")
        : wordingProblems(k, t))),
    },
    {
      name: "m3 · the denial check as it stood before the review — an opt-in, permission, sign-up or subscription beside 'has not agreed' is let through",
      expect: L.w5,
      impl: withProblems((k, t) => ((k === "basis.LICENCE_OUTREACH" || k === "basis.THIRD_PARTY") && preReviewDenies(t)
        ? wordingProblems(k, t).filter((x) => x.code !== "not_agreed_missing")
        : wordingProblems(k, t))),
    },
    {
      name: "⛔ recognition against the current version only — an older saved version is no longer recognised",
      expect: L.w6,
      impl: withRules({
        saved: (h) => {
          const all = savedBasisWordingsOf(h);
          const basis: Record<string, readonly string[]> = {};
          for (const [k, list] of Object.entries(all.basis)) basis[k] = (list ?? []).slice(-1);
          return { basis, adult: all.adult.slice(-1) };
        },
      }),
    },
    {
      name: "W8 · the suite drops out of predeploy — a gate outside the pipeline is not a gate",
      expect: L.w8,
      impl: srcPlant({ pkg: REAL_SOURCES.pkg.split("npm run test:marketing-wordings && ").join("") }),
    },
    {
      name: "W8 · marketing-wordings.ts left out of client-graph-safe's pins",
      expect: L.w8,
      impl: srcPlant({ cgs: REAL_SOURCES.cgs.split('"lib/marketing/marketing-wordings.ts",').join("") }),
    },
    {
      name: "W8 · the action saves before it asks who is saving (requireAdmin dropped)",
      expect: L.w8,
      impl: srcPlant({ actions: actionUngated }),
    },
    {
      name: "W8 · the action reads its form its own way (patchFromForm not used — a name posted twice is a guess again)",
      expect: L.w8,
      impl: srcPlant({ actions: REAL_SOURCES.actions.replace("patchFromForm(formData.entries())", "{ ok: true as const, patch: Object.fromEntries(formData.entries()) }") }),
    },
    {
      name: "W8 · the card stops validating as the admin types (wordingProblems no longer called)",
      expect: L.w8,
      impl: srcPlant({ form: REAL_SOURCES.form.split("wordingProblems(").join("(() => [])(") }),
    },
    {
      name: "m4 · the card's own submit holds a blocked save silently again (Enter in a box does nothing)",
      expect: L.w8,
      impl: srcPlant({
        form: REAL_SOURCES.form
          .replace("if (blocked.length > 0) { focusFirstInvalid(form, blocked.map((key) => wordingFieldName(key))); return; }", "if (!canSave) return;")
          .replace('if (sending.length === 0) { toast({ title: "Nothing to save yet", description: HELD_IDLE }); return; }', ""),
      }),
    },
    {
      name: "m7 · the page reads the wordings on every tab (the card's rows loaded where the card is not shown)",
      expect: L.w8,
      impl: srcPlant({ page: REAL_SOURCES.page.replace('tab === "wordings" ? await marketingWordingRows() : null', "await marketingWordingRows()") }),
    },
    {
      name: "W8 · the pure module reaches the server (a store import)",
      expect: L.w8,
      impl: srcPlant({ pure: `${REAL_SOURCES.pure}${LF}import { db } from "@/lib/server/store";` }),
    },
    {
      name: "m2 · the second append-only check removed — the record the factory merges onto is never re-checked",
      expect: L.w8,
      impl: srcPlant({ server: REAL_SOURCES.server.replace('if (rules.appendOnly(current, merge(current, updates)) !== null) return refusal("history");', "") }),
    },
    {
      name: "D9 · the live store built without its queue",
      expect: L.w8,
      impl: srcPlant({ server: REAL_SOURCES.server.replace("merge: mergeWordings, queued: true", "merge: mergeWordings, queued: false") }),
    },
    {
      name: "⛔ M2 · the server's approval rule removed — a hand-built POST of the suggestions approves all nine",
      expect: L.w9,
      impl: withRules({ admit: (req, h) => admissionProblems(req, h).filter((x) => x.code !== "not_approved") }),
    },
    {
      name: "⛔ M2 · the card sends every suggestion, ticked or not (one Save approves the G4 drafts and the source line together)",
      expect: L.w9,
      impl: { ...REAL, toSave: (s) => wordingsToSave({ ...s, approved: allTicked }) },
    },
    {
      name: "M2 · an edit no longer ticks its suggestion — the words typed are held back until a tick nobody sees is set",
      expect: L.w9,
      impl: { ...REAL, approvesOnEdit: () => false },
    },
    {
      name: "⛔ m1 · the version count ignored — a page out of date quietly supersedes a version saved since it opened",
      expect: L.w10,
      impl: withRules({ admit: (req, h) => admissionProblems({ ...req, base: h.length }, h) }),
    },
    {
      name: "m3 · a negation after 'agreed' let through — 'agreed to nothing' saved as a consent basis",
      expect: L.w11,
      impl: withProblems((k, t) => wordingProblems(k, t).filter((x) => x.code !== "consent_negated")),
    },
    {
      name: "m3 · a letter from another alphabet let through — a Cyrillic look-alike of a makes 'agreed' read right and match nothing",
      expect: L.w11,
      impl: withProblems((k, t) => wordingProblems(k, t).filter((x) => x.code !== "non_latin")),
    },
    {
      name: "⛔ M1 · the reader's drops not reported — a save rewrites the row without the history it could not read",
      expect: L.w12,
      impl: withRules({ readRow: (raw) => ({ histories: readWordingHistories(raw), dropped: [] }) }),
    },
    {
      name: "⛔ D9 · the queue removed — two saves at once build on the same record, and one of them is lost",
      expect: L.w13,
      impl: { ...REAL, unqueued: true },
    },
    {
      name: "W14 · a name posted twice read as its last value",
      expect: L.w14,
      impl: {
        ...REAL,
        fromForm: (entries) => {
          const patch = Object.create(null) as Record<string, unknown>;
          for (const [name, value] of entries) { if (!String(name).startsWith("$ACTION_")) patch[name] = value; }
          return { ok: true, patch };
        },
      },
    },
    {
      name: "W14 · React's own $ACTION_ fields handed to the setter — a form posted without JavaScript is not understood",
      expect: L.w14,
      impl: {
        ...REAL,
        fromForm: (entries) => {
          const patch = Object.create(null) as Record<string, unknown>;
          for (const [name, value] of entries) {
            if (Object.prototype.hasOwnProperty.call(patch, name)) return { ok: false };
            patch[name] = value;
          }
          return { ok: true, patch };
        },
      },
    },
  ];
}

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}marketing-wordings: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);
  const CASES = cases(problems);
  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}${LF}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${LF}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${LF}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
