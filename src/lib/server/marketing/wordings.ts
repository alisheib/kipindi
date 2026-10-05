/**
 * U33w · THE MARKETING WORDINGS, PERSISTED — `marketing.wordings`, the readers every basis writer must use, and the ONE
 * verified setter the "Marketing wordings" card on /admin/system calls.
 *
 * ⭐ WHY THIS EXISTS (OD57 · OD58 · S14 · the owner rule of 2026-10-03). The basis wordings, the 18+ confirmations, the
 * bought-list notice and the source line are admin-edited config now, kept with an append-only history (the pure half,
 * `@/lib/marketing/marketing-wordings`, holds the keys, the suggestions and the rules). This file is where that history
 * lives and the only door it is written through.
 *
 * ⛔ W1 · NOTHING UNSAVED IS EVER RECORDED. `currentWording(key)` answers the NEWEST SAVED version or `null` — never a
 * suggestion — and every basis writer (U33b-L's `list-basis.ts`, U37c's test attestation, U32's import writer) records
 * `{ text, v }` from it and REFUSES on `null`. `isImportAttestationSaved` recognises an import attestation against the
 * SAVED versions only (any saved pair, S14), so a row written under a default nobody saved is refused at the gate.
 *
 * ⭐ THE PRECEDENT THAT SHIPS (`support-config.ts`, `tax-config.ts`): `defineConfig`, a VERIFIED setter (persist, read
 * the row back, only then cache and audit `{ before, after, changes }` as `config.marketing_wordings_updated`), the
 * hydration gate (a process that never loaded the row refuses to save, W7), validation before any write, a refusal per
 * field, and no lock: every wording is editable, kept safe by its rules and an audit row.
 *
 * ⛔ APPEND-ONLY, ENFORCED HERE (W2 · W3). The browser sends TEXT only (`readWordingsPatch` refuses a posted history, a
 * version object or an unknown field). The server re-reads the row (`reload`, so a version another instance saved is
 * appended to, never overwritten), builds each changed wording's full history with `appendVersion`, and runs
 * `appendOnlyProblem` over the WHOLE proposed record before the write — and once more, synchronously, over the very
 * record the factory merges onto (m2). A save that would change, drop, renumber or double a saved version is refused,
 * nothing is written, and no audit row is made. Saves are serialised within this process (D9), so two officers saving
 * at once cannot drop each other's version.
 *
 * ⛔ M1 · A ROW THIS FILE COULD NOT READ IN FULL IS NEVER REWRITTEN. The reader drops what it cannot read — a malformed
 * history, a key the card does not hold — and its readers fail closed (a dropped wording reads as never saved). But a
 * save writes the WHOLE record, so a save over such a row would erase what was dropped. So every read of the row notes
 * what it dropped (`readWordingHistoriesReport`), and while the latest read dropped anything, EVERY save is refused
 * (`history_unreadable`) and the row is left exactly as it is, for a developer to look at.
 *
 * ⛔ M2 · m1 · THE APPROVAL AND THE PAGE'S AGE ARE THE SERVER'S RULES (`admissionProblems`, against the row as it is
 * now): a wording whose history is empty is a suggestion, saved only with its `approve.<key>` field — so a hand-built
 * POST of the suggestions approves nothing — and a wording edited from a version count that is not the count saved now
 * is refused ("Someone saved this wording since you opened the page"), never quietly superseded.
 *
 * ⚠️ THE READERS ARE THIS PROCESS'S CACHE (sync, ~0 cost — the gate asks per number). Production runs one instance; in a
 * deploy's overlap a version saved on the other instance reaches this one at its next reload, and until then a writer
 * here records the version before it — a saved, approved version — and a row written there under the new one is refused
 * here (the safe direction). ⛔ A process that never loaded the row holds nothing saved: its readers answer `null`.
 * ⚠️ KNOWN GAP (review m5): the factory's audit row is fire-and-forget (`audit()` is not awaited), as for every
 * `defineConfig` record — the save is verified, its audit row is not.
 *
 * Guard: `npm run test:marketing-wordings` (W1–W14 drive THIS file's setter and readers, through `__wordingsStoreForTest`).
 */
import { defineConfig } from "../define-config";
import {
  EMPTY_WORDINGS, WORDING_KEYS, WORDING_RULES, isWordingKey, mergeWordings, sameHistory, wordingsShapeProblem,
  type WordingHistories, type WordingKey, type WordingProblem, type WordingRules, type WordingVersion, type WordingsUpdate,
} from "@/lib/marketing/marketing-wordings";
import { isImportAttestation, type ImportAttestationRow, type SavedBasisWordings } from "@/lib/marketing/consent-basis";

/** The SystemConfig row. */
export const MARKETING_WORDINGS_KEY = "marketing.wordings";

/** The factory's audit row for every save (spec §8). */
export const MARKETING_WORDINGS_AUDIT = { action: "config.marketing_wordings_updated", targetType: "MARKETING_WORDINGS" } as const;

/** Why a save was refused. Every refusal writes nothing and makes no audit row. */
export type WordingsRefusal =
  | "no_officer" | "not_understood" | "invalid" | "not_approved" | "stale" | "unreadable" | "history_unreadable" | "history"
  | "not_saved";

export type WordingsSaveResult =
  | { readonly ok: true; readonly changed: readonly WordingKey[] }
  | {
    readonly ok: false;
    readonly reason: WordingsRefusal;
    readonly error: string;
    /** Every problem with every wording in the request, by key (`invalid`, `not_approved`, `stale`) — the card shows
     *  each under its own box. */
    readonly problems: { readonly [K in WordingKey]?: readonly WordingProblem[] };
  };

/** The console's sentences for a refusal of the whole save (English console copy); a wording's own problem is said
 *  under its box in its own words (`WORDING_SENTENCE`). */
export const WORDINGS_REFUSAL_SENTENCE: Readonly<Record<Exclude<WordingsRefusal, "not_saved">, string>> = {
  no_officer: "Sign in again to save the wordings.",
  not_understood: "That save wasn't understood — reload the page and try again.",
  invalid: "Some wordings can't be saved yet — each problem is shown under its box.",
  not_approved: "A suggestion is saved only when its “Approve and save this wording” box is ticked, so nothing was saved.",
  stale: "Someone saved a wording since you opened this page, so nothing was saved — reload the page to see it.",
  unreadable: "The saved wordings couldn't be read, so nothing was changed. Please try again.",
  history_unreadable: "The saved wordings could not be read in full, so nothing was saved. Ask the developer to check the marketing wordings setting.",
  history: "That save would change or remove a version already saved, so nothing was saved. Reload the page and try again.",
};

/** A fresh read of one wording: the row's newest saved version (or null — never saved, or cleared), or a read that could
 *  not answer. ⛔ `{ ok: false }` is never "nothing saved": a caller that stamps the wording refuses on it. */
export type FreshWording = { readonly ok: true; readonly version: WordingVersion | null } | { readonly ok: false };

/** What this file reads and writes — every reader and the setter, over ONE factory instance. */
export type WordingsStore = {
  /** ⭐ The NEWEST SAVED version of a wording, or `null` when it was never saved — ⛔ never a suggestion. */
  readonly currentWording: (key: WordingKey) => WordingVersion | null;
  /** Every saved version of a wording, oldest first (a copy). */
  readonly wordingHistory: (key: WordingKey) => WordingVersion[];
  /** Every saved basis and 18+ text, for `consent-basis.ts` to compose and recognise with. */
  readonly savedBasisWordings: () => SavedBasisWordings;
  /** ⭐ Is this ledger row a first-party import attestation under SAVED words (any saved pair)? */
  readonly isImportAttestationSaved: (row: ImportAttestationRow | null | undefined) => boolean;
  /** ⭐ U37s · the newest SAVED version AS THE ROW HOLDS IT NOW — re-read (`reload`), never this process's cache alone. */
  readonly freshWording: (key: WordingKey) => Promise<FreshWording>;
  /** ⛔ THE ONLY WRITER. */
  readonly saveMarketingWordings: (patch: unknown, officerId: string, nowIso?: string) => Promise<WordingsSaveResult>;
};

/** The factory's surface this file uses. */
type WordingsConfig = {
  get: () => WordingHistories;
  setVerified: (updates: WordingsUpdate, officerId: string) => Promise<{ ok: true; config: WordingHistories } | { ok: false; error: string }>;
  reload: () => Promise<{ ok: true; config: WordingHistories; stored: boolean } | { ok: false; error: string }>;
};

/** What the latest read of the row had to leave out (M1) — set by the row reader, which the factory runs on every read
 *  of a stored row (hydration, `reload`, the read-back after a write). */
type RowSeen = { dropped: readonly string[] };

/** The record's defaults and its validation, shared by every instance. */
const WORDINGS_SHAPE = {
  defaults: EMPTY_WORDINGS,
  validate: (c: WordingHistories): { ok: true } | { ok: false; reason: string } => {
    const problem = wordingsShapeProblem(c);
    return problem === null ? { ok: true } : { ok: false, reason: problem };
  },
} as const;

const refusal = (reason: Exclude<WordingsRefusal, "not_saved">): WordingsSaveResult =>
  ({ ok: false, reason, error: WORDINGS_REFUSAL_SENTENCE[reason], problems: {} });

function storeOver(cfg: WordingsConfig, seen: RowSeen, rules: WordingRules, merge: typeof mergeWordings, queued: boolean): WordingsStore {
  const currentWording = (key: WordingKey): WordingVersion | null => {
    if (!isWordingKey(key)) return null;
    const list = cfg.get()[key];
    if (!Array.isArray(list) || list.length === 0) return null;
    return { ...list[list.length - 1] };
  };

  const wordingHistory = (key: WordingKey): WordingVersion[] => {
    if (!isWordingKey(key)) return [];
    const list = cfg.get()[key];
    return Array.isArray(list) ? list.map((x) => ({ ...x })) : [];
  };

  const savedBasisWordings = (): SavedBasisWordings => rules.saved(cfg.get());

  const isImportAttestationSaved = (row: ImportAttestationRow | null | undefined): boolean =>
    isImportAttestation(row, rules.saved(cfg.get()));

  const saveNow = async (patch: unknown, officerId: string, nowIso: string | undefined): Promise<WordingsSaveResult> => {
    // The server sets the author from the session, never from the request.
    if (typeof officerId !== "string" || officerId.trim() === "") return refusal("no_officer");
    const read = rules.readPatch(patch);
    if (!read.ok) return refusal("not_understood");
    const { texts: asked, approved, base } = read.request;

    // Every problem with every wording in the request, at once — nothing is written while any remains.
    const keys = WORDING_KEYS.filter((k) => asked[k] !== undefined);
    const texts: Partial<Record<WordingKey, string>> = {};
    const problems: { [K in WordingKey]?: readonly WordingProblem[] } = {};
    for (const k of keys) {
      const text = rules.normalize(asked[k]);
      texts[k] = text;
      const found = rules.problems(k, text);
      if (found.length > 0) problems[k] = found;
    }
    if (Object.keys(problems).length > 0) {
      return { ok: false, reason: "invalid", error: WORDINGS_REFUSAL_SENTENCE.invalid, problems };
    }
    if (keys.length === 0) return { ok: true, changed: [] };

    // ⛔ Appended to the row AS IT IS NOW — a version another instance saved since this one booted is kept, never
    // overwritten. A read that cannot answer refuses (it fails closed, and a never-loaded process refuses here, W7).
    const fresh = await cfg.reload();
    if (!fresh.ok) return refusal("unreadable");
    // ⛔ M1 · the latest read left something out, and a save writes the whole record: refuse, and leave the row alone.
    if (fresh.stored && seen.dropped.length > 0) return refusal("history_unreadable");
    const before = fresh.config;

    // ⛔ M2 · m1 · the server's own rules, against each wording's history as it is NOW: a suggestion needs its approval,
    // and a page edited from another version count is stale. Every refused wording is named, each in its own words.
    const refused: { [K in WordingKey]?: readonly WordingProblem[] } = {};
    for (const k of keys) {
      const found = rules.admit({ approved: approved[k] === true, base: base[k] ?? -1 }, before[k] ?? []);
      if (found.length > 0) refused[k] = found;
    }
    const refusedKeys = WORDING_KEYS.filter((k) => refused[k] !== undefined);
    if (refusedKeys.length > 0) {
      const reason = refusedKeys.some((k) => (refused[k] ?? []).some((x) => x.code === "stale")) ? "stale" : "not_approved";
      return { ok: false, reason, error: WORDINGS_REFUSAL_SENTENCE[reason], problems: refused };
    }

    const stamp = { savedAt: nowIso ?? new Date().toISOString(), savedBy: officerId };
    const updates: { [K in WordingKey]?: readonly WordingVersion[] } = {};
    const changed: WordingKey[] = [];
    for (const k of keys) {
      const was = before[k] ?? [];
      const next = rules.append(was, texts[k] ?? "", stamp);
      if (!sameHistory(next, was)) {
        updates[k] = next;
        changed.push(k);
      }
    }
    // An unchanged text is no change: nothing is written and no audit row is made.
    if (changed.length === 0) return { ok: true, changed: [] };

    // ⛔ W3 · the WHOLE proposed record, merged exactly as the factory will merge it, must be a clean append.
    if (rules.appendOnly(before, merge(before, updates)) !== null) return refusal("history");
    // ⛔ m2 · and AGAIN over what the factory merges onto — its cache, `cfg.get()` — with nothing awaited between this
    // check and the write's own merge, so the record checked is the record written.
    const current = cfg.get();
    if (rules.appendOnly(current, merge(current, updates)) !== null) return refusal("history");
    const res = await cfg.setVerified(updates, officerId);
    if (!res.ok) return { ok: false, reason: "not_saved", error: res.error, problems: {} };
    return { ok: true, changed };
  };

  /* ⛔ D9 · ONE SAVE AT A TIME IN THIS PROCESS. Two saves that both re-read the row before either wrote would each build
     on the same record, and the second write would drop the first's version. A refused or failed save never jams the
     queue: the chain only waits for the previous save to settle. (`queued: false` exists for the red case that proves
     this queue is load-bearing, and nothing else.) */
  let queue: Promise<unknown> = Promise.resolve();
  const saveMarketingWordings = (patch: unknown, officerId: string, nowIso?: string): Promise<WordingsSaveResult> => {
    if (!queued) return saveNow(patch, officerId, nowIso);
    const run = queue.then(() => saveNow(patch, officerId, nowIso));
    queue = run.catch(() => undefined);
    return run;
  };

  /**
   * ⭐ U37s · A FRESH READ, for a writer that STAMPS a wording onto another record (the draft save's source line). The
   * cache is this process's: it answers "nothing saved" until the boot read lands, and the version it booted with during
   * a deploy's overlap — and a stamp written from either would quietly replace a good line with a stale one or none. So
   * the row is re-read here (`reload` replaces the cache with what it read). ⛔ FAILS CLOSED: a read that could not
   * answer is `{ ok: false }`, and the caller refuses — never the cached value. With no database the cache IS the store.
   */
  const freshWording = async (key: WordingKey): Promise<FreshWording> => {
    if (!isWordingKey(key)) return { ok: true, version: null };
    const read = await cfg.reload().catch(() => ({ ok: false as const }));
    if (!read.ok) return { ok: false };
    return { ok: true, version: currentWording(key) };
  };

  return { currentWording, wordingHistory, savedBasisWordings, isImportAttestationSaved, freshWording, saveMarketingWordings };
}

type StoreOptions = {
  readonly key: string;
  readonly deps?: Parameters<typeof defineConfig>[0]["deps"];
  readonly rules: WordingRules;
  readonly merge: typeof mergeWordings;
  readonly queued: boolean;
};

/**
 * ⭐ ONE BUILDER, TWO INSTANCES — the live record and the test seam are both made here, so a protection added here is
 * driven by `test:marketing-wordings` by construction (the `support-config.ts` lesson: a seam that respelled its options
 * left a removed validator green).
 * ⛔ `migrate` IS THE ROW READER (`rules.readRow`): every read of a stored row goes through it, and it notes what it had
 * to drop (M1). ⛔ `merge` IS THE RECORD'S OWN (spec §5): the factory's shallow default would be wrong for a record the
 * server rebuilds key by key.
 */
function makeStore(o: StoreOptions): WordingsStore {
  const seen: RowSeen = { dropped: [] };
  const cfg = defineConfig<WordingHistories, WordingsUpdate>({
    key: o.key,
    ...WORDINGS_SHAPE,
    migrate: (persisted: Record<string, unknown>): Partial<WordingHistories> => {
      const reading = o.rules.readRow(persisted);
      seen.dropped = reading.dropped;
      return reading.histories;
    },
    merge: o.merge,
    audit: MARKETING_WORDINGS_AUDIT,
    deps: o.deps,
  });
  return storeOver(cfg, seen, o.rules, o.merge, o.queued);
}

const live = makeStore({ key: MARKETING_WORDINGS_KEY, rules: WORDING_RULES, merge: mergeWordings, queued: true });

/** ⭐ The newest SAVED version of a wording, or `null` — ⛔ a basis writer records nothing on `null` (W1). */
export function currentWording(key: WordingKey): WordingVersion | null {
  return live.currentWording(key);
}

/** ⭐ U37s · the newest SAVED version as the ROW holds it now (re-read) — ⛔ `{ ok: false }` when the read cannot answer. */
export function freshWording(key: WordingKey): Promise<FreshWording> {
  return live.freshWording(key);
}

/** Every saved version of a wording, oldest first — the card's history. */
export function wordingHistory(key: WordingKey): WordingVersion[] {
  return live.wordingHistory(key);
}

/** Every saved basis and 18+ text, oldest first — what `importConsentWording` and `checkConsentBasisInput` take. */
export function savedBasisWordings(): SavedBasisWordings {
  return live.savedBasisWordings();
}

/** ⭐ Is this ledger row an officer's first-party import attestation under SAVED words? `consent-basis.ts`'s
 *  `isImportAttestation` over every saved pair of a first-party basis version and an `adult.consent` version (S14). */
export function isImportAttestationSaved(row: ImportAttestationRow | null | undefined): boolean {
  return live.isImportAttestationSaved(row);
}

/**
 * ⛔ THE ONLY WRITER, and the ONLY one the card's action may call: TEXT per key with its version count and approval
 * (`readWordingsPatch`), every rule run first (`wordingProblems`), the server's own admission (`admissionProblems`), a
 * version appended only on change, the append-only check over the whole record, then the VERIFIED write and its audit
 * row. `nowIso` is the server's clock (tests pin it); the author is the session's officer.
 */
export function saveMarketingWordings(patch: unknown, officerId: string, nowIso?: string): Promise<WordingsSaveResult> {
  return live.saveMarketingWordings(patch, officerId, nowIso);
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code.
 *
 * A SECOND instance built by the same `makeStore`, against an injected store (`deps`) — so `test:marketing-wordings`
 * drives the code that ships, read-back and hydration gate included. `rules` and `merge` default to the shipped ones; a
 * red case plants exactly one of them, and `unqueued` removes the D9 queue for the one case that proves it.
 */
export function __wordingsStoreForTest(opts: {
  deps?: Parameters<typeof defineConfig>[0]["deps"];
  rules?: WordingRules;
  merge?: typeof mergeWordings;
  unqueued?: boolean;
} = {}): WordingsStore {
  return makeStore({
    key: `${MARKETING_WORDINGS_KEY}.__test__${Math.random().toString(36).slice(2)}`,
    deps: opts.deps,
    rules: opts.rules ?? WORDING_RULES,
    merge: opts.merge ?? mergeWordings,
    queued: opts.unqueued !== true,
  });
}
