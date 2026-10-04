/**
 * U33p · THE PUBLIC POLICY LINES, PERSISTED — `legal.policy_lines`, the readers the two legal pages print through, the
 * `PolicyLine` wrapper they print with, and the ONE verified setter the "Public policy lines" card on /admin/system calls
 * (spec `docs/marketing-specs/U33a-U37c-OD58.md` §5.2 · §6 U33p · §8; OD58 · S15; the owner rule of 2026-10-03; the U33p
 * review, F1 · F4 · F5 · F8 · F12).
 *
 * ⭐ WHY THIS EXISTS. Five public lines are admin-edited config now (the pure half, `@/lib/legal/policy-lines`, holds the
 * keys, today's text as defaults, the rules and the versions). This file is where each line's history lives, how a page
 * prints it, and the only door it is written through.
 *
 * ⛔ NOTHING PRINTS DIFFERENTLY UNTIL AN ADMIN SAVES NEW WORDS. A page wraps each editable bullet in `<PolicyLine line
 * locale>` with its OWN literal JSX inside — today's text, untouched. While the line has no saved words (never saved, or
 * its newest version is a review marker) the wrapper prints exactly those children: the page's text and DOM are what they
 * were before U33p (React's inline payload gains one empty slot per wrapper), and `test:rg-policy` and
 * `test:privacy-notice` (which read the pages as source, with the wrapper's tags stripped —
 * `scripts/lib/policy-line-source.mts`) keep both English hash pins untouched. Once a line has saved words the wrapper
 * prints them in today's markup: a bullet, its label in bold where the line has one. A saved blank line prints nothing.
 *
 * ⭐ THE PRECEDENT THAT SHIPS (`marketing/wordings.ts`, U33w): `defineConfig`, a VERIFIED setter (persist, read the row back,
 * only then cache and audit `{ before, after, changes }` as `config.policy_lines_updated` — the changes name the line and,
 * when its words moved, the page version, spec §8), the hydration gate, every rule run before any write, a refusal per box,
 * and no lock: every line is editable, kept true by its rules and an audit row.
 *   · F12 · each line keeps an append-only HISTORY — a save appends one server-stamped version and `policyHistoryProblem`
 *     refuses any record that would rewrite, drop, renumber or double a saved one;
 *   · F4 · "today's words, reviewed" is a MARKER (`reviewedDefault`: the fingerprint of the code default reviewed) — no
 *     text, so the page keeps printing the code's literal; every saved version records the default's fingerprint;
 *   · F1 · only NEW WORDS move a page's version (`moved`); a review writes its marker and its audit row and nothing else;
 *   · F5 · a stamp records the code version it was made against (`base`), and `printedPolicyVersion` decides what prints;
 *   · M1 · a row the reader could not read in full is never rewritten — every save is refused while the latest read dropped
 *     anything (the reader fails closed: a dropped line prints the page's own words);
 *   · m1 · a page edited from a revision that is not the revision saved now is refused, never quietly superseded;
 *   · D9 · saves are serialised within this process, so two admins saving at once cannot drop each other's version.
 *
 * ⚠️ THE READERS ARE THIS PROCESS'S CACHE (sync — the pages print through them on every request). Production runs one
 * instance; in a deploy's overlap a line saved on the other instance reaches this one at its next reload. ⚠️ KNOWN GAP (the
 * U33w review's m5, every `defineConfig` record): the factory's audit row is fire-and-forget — the save is verified, its
 * audit row is not. ⛔ F8 · `policyLinesReadable()` answers whether this process holds the record AT ALL (hydrated, read in
 * full): ⚠️ OWED TO U33a-R — its gate must refuse every licence send while it is false, and once licence outreach can be
 * OPEN a save that would fail one of its opening checks (`policyOpeningProblems`) must be refused while it is open.
 *
 * Guard: `npm run test:policy-lines` (L0–L9 drive THIS file's setter, readers and wrapper, through
 * `__policyLinesStoreForTest` and the live store).
 */
import { createElement, type ReactNode } from "react";
import { defineConfig } from "../define-config";
import {
  EMPTY_POLICY_LINES, POLICY_LINE_DEFAULTS, POLICY_LINE_KEYS, POLICY_LINE_RULES, POLICY_LINE_SPEC, POLICY_PAGE_KEYS,
  POLICY_PAGES, isPolicyLineKey, isPolicyLocale, mergePolicyLines, metaWithVersion, policyDefaultFingerprint,
  policyLineParts, policyLineState, policyLinesShapeProblem, policyVerdictBlocks, printedPolicyVersion,
  type PolicyLineHistory, type PolicyLineKey, type PolicyLineProblem, type PolicyLineRules, type PolicyLineVersion,
  type PolicyLinesRecord, type PolicyLinesUpdate, type PolicyLocale, type PolicyPage, type PolicyTexts,
} from "@/lib/legal/policy-lines";

/** The SystemConfig row. */
export const POLICY_LINES_KEY = "legal.policy_lines";

/** The factory's audit row for every save (spec §8). */
export const POLICY_LINES_AUDIT = { action: "config.policy_lines_updated", targetType: "POLICY_LINES" } as const;

/** Why a save was refused. Every refusal writes nothing and makes no audit row. */
export type PolicyLinesRefusal =
  | "no_officer" | "not_understood" | "invalid" | "stale" | "unreadable" | "row_unreadable" | "history" | "not_saved";

/** Every problem of every line in a request, by line and language — the card shows each under its own box. */
export type PolicyLinesProblems = { readonly [K in PolicyLineKey]?: Readonly<Record<PolicyLocale, readonly PolicyLineProblem[]>> };

/** The version each page prints after a save. */
export type PolicyPageVersions = Readonly<Record<PolicyPage, string>>;

export type PolicyLinesSaveResult =
  | {
    readonly ok: true;
    /** Every line the save wrote a version of (new words, or a review marker). */
    readonly changed: readonly PolicyLineKey[];
    /** The lines whose printed WORDS moved — only these move a page's version. */
    readonly moved: readonly PolicyLineKey[];
    readonly versions: PolicyPageVersions;
  }
  | { readonly ok: false; readonly reason: PolicyLinesRefusal; readonly error: string; readonly problems: PolicyLinesProblems };

/** The console's sentences for a refusal of the whole save (English console copy); a line's own problem is said under its
 *  box in its own words (`POLICY_LINE_SENTENCE`). */
export const POLICY_LINES_REFUSAL_SENTENCE: Readonly<Record<Exclude<PolicyLinesRefusal, "not_saved">, string>> = {
  no_officer: "Sign in again to save the policy lines.",
  not_understood: "That save wasn't understood — reload the page and try again.",
  invalid: "Some lines can't be saved yet — each problem is shown under its box.",
  stale: "Someone saved a policy line since you opened this page, so nothing was saved — reload the page to see it.",
  unreadable: "The saved policy lines couldn't be read, so nothing was changed. Please try again.",
  row_unreadable: "The saved policy lines could not be read in full, so nothing was saved. Ask the developer to check the public policy lines setting.",
  history: "That save would change or remove a version already saved, so nothing was saved. Reload the page and try again.",
};

/** What this file reads and writes — every reader and the setter, over ONE factory instance. */
export type PolicyLinesStore = {
  /** ⭐ A line's NEWEST saved version — new words or a review marker — or `null` when it was never saved (a copy). */
  readonly savedLine: (key: PolicyLineKey) => PolicyLineVersion | null;
  /** Every saved version of a line, oldest first (copies). */
  readonly savedHistory: (key: PolicyLineKey) => PolicyLineVersion[];
  /** ⭐ What the page prints for a line in a language: its saved words — `""` for a saved blank line — or `null` while it
   *  has none (never saved, or reviewed): the page then prints its own words. */
  readonly savedPolicyText: (key: PolicyLineKey, locale: PolicyLocale) => string | null;
  /** The line as the public reads it now: the saved words, or today's text. */
  readonly policyLine: (key: PolicyLineKey, locale: PolicyLocale) => string;
  /** The version a page prints now (`printedPolicyVersion` of its code version and its saved stamp). */
  readonly policyVersion: (page: PolicyPage) => string;
  /** A page's META line with the version the page prints. */
  readonly policyMeta: (meta: string, page: PolicyPage) => string;
  /** The whole saved record (a deep copy) — what U33a-R's opening checks read. */
  readonly savedRecord: () => PolicyLinesRecord;
  /** ⛔ F8 · Does this process hold the record at all — hydrated, and read in full? */
  readonly readable: () => boolean;
  /** ⛔ THE ONLY WRITER. */
  readonly savePolicyLines: (patch: unknown, officerId: string, nowIso?: string) => Promise<PolicyLinesSaveResult>;
};

/** The factory's surface this file uses. */
type PolicyLinesConfig = {
  get: () => PolicyLinesRecord;
  setVerified: (updates: PolicyLinesUpdate, officerId: string) => Promise<{ ok: true; config: PolicyLinesRecord } | { ok: false; error: string }>;
  reload: () => Promise<{ ok: true; config: PolicyLinesRecord; stored: boolean } | { ok: false; error: string }>;
};

/** What the latest read of the row had to leave out (M1) — set by the row reader, which the factory runs on every read of
 *  a stored row (hydration, `reload`, the read-back after a write). */
type RowSeen = { dropped: readonly string[] };

const refusal = (reason: Exclude<PolicyLinesRefusal, "not_saved">): PolicyLinesSaveResult =>
  ({ ok: false, reason, error: POLICY_LINES_REFUSAL_SENTENCE[reason], problems: {} });

const printedVersions = (r: PolicyLinesRecord): PolicyPageVersions => ({
  rg: printedPolicyVersion(POLICY_PAGES.rg.codeVersion, r["version.rg"]),
  privacy: printedPolicyVersion(POLICY_PAGES.privacy.codeVersion, r["version.privacy"]),
});

function storeOver(cfg: PolicyLinesConfig, key: string, seen: RowSeen, rules: PolicyLineRules, merge: typeof mergePolicyLines, queued: boolean): PolicyLinesStore {
  const historyOf = (line: PolicyLineKey): PolicyLineHistory => (isPolicyLineKey(line) ? cfg.get()[line] ?? [] : []);

  const savedHistory = (line: PolicyLineKey): PolicyLineVersion[] => historyOf(line).map((v) => ({ ...v }));

  const savedLine = (line: PolicyLineKey): PolicyLineVersion | null => {
    const h = historyOf(line);
    return h.length > 0 ? { ...h[h.length - 1] } : null;
  };

  const savedPolicyText = (line: PolicyLineKey, locale: PolicyLocale): string | null => {
    if (!isPolicyLineKey(line) || !isPolicyLocale(locale)) return null;
    const words = policyLineState(line, historyOf(line)).words;
    return words === null ? null : words[locale];
  };

  const policyLine = (line: PolicyLineKey, locale: PolicyLocale): string => {
    const saved = savedPolicyText(line, locale);
    if (saved !== null) return saved;
    return isPolicyLineKey(line) && isPolicyLocale(locale) ? POLICY_LINE_DEFAULTS[line][locale] : "";
  };

  const policyVersion = (page: PolicyPage): string => {
    const spec = POLICY_PAGES[page];
    return spec ? printedPolicyVersion(spec.codeVersion, cfg.get()[spec.versionKey]) : "";
  };

  const policyMeta = (meta: string, page: PolicyPage): string => {
    const spec = POLICY_PAGES[page];
    return spec ? metaWithVersion(meta, cfg.get()[spec.versionKey]) : meta;
  };

  const savedRecord = (): PolicyLinesRecord => mergePolicyLines(cfg.get(), {});

  /* ⛔ F8 · the factory's own hydration register (a declared global, so it survives hot reloads) and this file's M1 note.
     The `get()` first RE-ARMS a hydration that could not ask (the factory's own rule), so a process whose only reader is a
     send gate is never pinned on "not readable" for want of a page render. */
  const readable = (): boolean => {
    cfg.get();
    return globalThis.__50PICK_CONFIGS_HYDRATED?.has(key) === true && seen.dropped.length === 0;
  };

  const saveNow = async (patch: unknown, officerId: string, nowIso: string | undefined): Promise<PolicyLinesSaveResult> => {
    // The server sets the author from the session, never from the request.
    if (typeof officerId !== "string" || officerId.trim() === "") return refusal("no_officer");
    const read = rules.readPatch(patch);
    if (!read.ok) return refusal("not_understood");
    const asked = read.request.lines;

    // Every problem with every line in the request, at once — nothing is written while any remains.
    const keys = POLICY_LINE_KEYS.filter((k) => asked[k] !== undefined);
    const texts: Partial<Record<PolicyLineKey, PolicyTexts>> = {};
    const problems: { [K in PolicyLineKey]?: Readonly<Record<PolicyLocale, readonly PolicyLineProblem[]>> } = {};
    for (const k of keys) {
      const req = asked[k];
      if (req === undefined) continue;
      const t: PolicyTexts = {
        en: rules.normalize(req.texts.en, k, "en"),
        sw: rules.normalize(req.texts.sw, k, "sw"),
        zh: rules.normalize(req.texts.zh, k, "zh"),
      };
      texts[k] = t;
      const verdict = rules.problems(k, t);
      if (policyVerdictBlocks(verdict)) problems[k] = verdict.problems;
    }
    if (Object.keys(problems).length > 0) {
      return { ok: false, reason: "invalid", error: POLICY_LINES_REFUSAL_SENTENCE.invalid, problems };
    }
    if (keys.length === 0) return { ok: true, changed: [], moved: [], versions: printedVersions(cfg.get()) };

    // ⛔ Built on the row AS IT IS NOW — a version another instance saved since this one booted is kept, never overwritten.
    // A read that cannot answer refuses (it fails closed, and a never-loaded process refuses here).
    const fresh = await cfg.reload();
    if (!fresh.ok) return refusal("unreadable");
    // ⛔ M1 · the latest read left something out, and a save writes the whole record: refuse, and leave the row alone.
    if (fresh.stored && seen.dropped.length > 0) return refusal("row_unreadable");
    const before = fresh.config;

    // ⛔ m1 · a page edited from another revision is stale (`policyAdmissionProblems`) — every stale line is named, under
    // its English box.
    const stale: { [K in PolicyLineKey]?: Readonly<Record<PolicyLocale, readonly PolicyLineProblem[]>> } = {};
    for (const k of keys) {
      const req = asked[k];
      if (req === undefined) continue;
      const found = rules.admit(req.base, before[k]);
      if (found.length > 0) stale[k] = { en: [...found], sw: [], zh: [] };
    }
    if (Object.keys(stale).length > 0) return { ok: false, reason: "stale", error: POLICY_LINES_REFUSAL_SENTENCE.stale, problems: stale };

    // A line gets a version only when the request changes it (`policyLineChanges`): new WORDS, or a REVIEW marker of
    // today's words (the line's tick). Only new words count as `moved`.
    const stamp = typeof nowIso === "string" ? nowIso : new Date().toISOString();
    const updates: { -readonly [K in keyof PolicyLinesUpdate]: PolicyLinesUpdate[K] } = {};
    const changed: PolicyLineKey[] = [];
    const moved: PolicyLineKey[] = [];
    for (const k of keys) {
      const req = asked[k];
      const t = texts[k];
      if (req === undefined || t === undefined) continue;
      const history = before[k];
      const state = policyLineState(k, history);
      if (!rules.changes(k, t, state.words, req.review, state.reviewedCurrent)) continue;
      const rev = history.length + 1;
      const fingerprint = policyDefaultFingerprint(k);
      const version: PolicyLineVersion = rules.movesWords(k, t, state.words)
        ? { rev, en: t.en, sw: t.sw, zh: t.zh, codeDefault: fingerprint, savedAt: stamp, savedBy: officerId }
        : { rev, reviewedDefault: fingerprint, savedAt: stamp, savedBy: officerId };
      updates[k] = [...history.map((v) => ({ ...v })), version];
      changed.push(k);
      if ("en" in version) moved.push(k);
    }
    if (changed.length === 0) return { ok: true, changed: [], moved: [], versions: printedVersions(before) };

    // ⭐ THE PAGE'S VERSION MOVES WITH NEW WORDS ONLY (spec §5.2; review F1 · F5) — once per page whose printed words this
    // save moved, always later than the version the page prints now, and recorded with the code version it was made
    // against. A review moves nothing: the page's words did not change.
    const nowMs = Date.parse(stamp);
    for (const page of POLICY_PAGE_KEYS) {
      if (!moved.some((k) => POLICY_LINE_SPEC[k].page === page)) continue;
      const spec = POLICY_PAGES[page];
      const printed = printedPolicyVersion(spec.codeVersion, before[spec.versionKey]);
      updates[spec.versionKey] = { stamp: rules.nextVersion(printed, nowMs), base: spec.codeVersion };
    }

    // ⛔ F12 · the WHOLE proposed record, merged exactly as the factory will merge it, must be a clean append — checked
    // against the record the factory merges onto (`cfg.get()`, the row just read), with nothing awaited in between.
    const current = cfg.get();
    if (rules.appendOnly(current, merge(current, updates)) !== null) return refusal("history");
    const res = await cfg.setVerified(updates, officerId);
    if (!res.ok) return { ok: false, reason: "not_saved", error: res.error, problems: {} };
    return { ok: true, changed, moved, versions: printedVersions(res.config) };
  };

  /* ⛔ D9 · ONE SAVE AT A TIME IN THIS PROCESS. Two saves that both re-read the row before either wrote would each build on
     the same record, and the second write would drop the first's version. A refused or failed save never jams the queue:
     the chain only waits for the previous save to settle. (`queued: false` exists for the red case that proves this queue
     is load-bearing, and nothing else.) */
  let queue: Promise<unknown> = Promise.resolve();
  const savePolicyLines = (patch: unknown, officerId: string, nowIso?: string): Promise<PolicyLinesSaveResult> => {
    if (!queued) return saveNow(patch, officerId, nowIso);
    const run = queue.then(() => saveNow(patch, officerId, nowIso));
    queue = run.catch(() => undefined);
    return run;
  };

  return { savedLine, savedHistory, savedPolicyText, policyLine, policyVersion, policyMeta, savedRecord, readable, savePolicyLines };
}

type StoreOptions = {
  readonly key: string;
  readonly deps?: Parameters<typeof defineConfig>[0]["deps"];
  readonly rules: PolicyLineRules;
  readonly merge: typeof mergePolicyLines;
  readonly queued: boolean;
};

/**
 * ⭐ ONE BUILDER, TWO INSTANCES — the live record and the test seam are both made here, so a protection added here is driven
 * by `test:policy-lines` by construction (the `support-config.ts` lesson).
 * ⛔ `migrate` IS THE ROW READER (`rules.readRow`): every read of a stored row goes through it, and it notes what it had to
 * drop (M1). ⛔ `merge` IS THE RECORD'S OWN (spec §5): the server rebuilds key by key.
 */
function makeStore(o: StoreOptions): PolicyLinesStore {
  const seen: RowSeen = { dropped: [] };
  const cfg = defineConfig<PolicyLinesRecord, PolicyLinesUpdate>({
    key: o.key,
    defaults: EMPTY_POLICY_LINES,
    validate: (c: PolicyLinesRecord): { ok: true } | { ok: false; reason: string } => {
      const problem = policyLinesShapeProblem(c);
      return problem === null ? { ok: true } : { ok: false, reason: problem };
    },
    migrate: (persisted: Record<string, unknown>): Partial<PolicyLinesRecord> => {
      const reading = o.rules.readRow(persisted);
      seen.dropped = reading.dropped;
      return reading.record;
    },
    merge: o.merge,
    audit: POLICY_LINES_AUDIT,
    deps: o.deps,
  });
  return storeOver(cfg, o.key, seen, o.rules, o.merge, o.queued);
}

const live = makeStore({ key: POLICY_LINES_KEY, rules: POLICY_LINE_RULES, merge: mergePolicyLines, queued: true });

/** ⭐ A line's NEWEST saved version (new words or a review marker), or `null` — the card's status line. */
export function savedPolicyLine(key: PolicyLineKey): PolicyLineVersion | null {
  return live.savedLine(key);
}

/** ⭐ Every saved version of a line, oldest first — the card's history. */
export function savedPolicyHistory(key: PolicyLineKey): PolicyLineVersion[] {
  return live.savedHistory(key);
}

/** ⭐ The saved words a page prints for a line in a language — `null` while it has none. */
export function savedPolicyText(key: PolicyLineKey, locale: PolicyLocale): string | null {
  return live.savedPolicyText(key, locale);
}

/** ⭐ The line as the public reads it now (spec §6: `policyLine(key, locale)`) — the saved words, or today's text. U33a-P
 *  prints `policyLine("profile.outreachNote", locale)` when it is not blank. */
export function policyLine(key: PolicyLineKey, locale: PolicyLocale): string {
  return live.policyLine(key, locale);
}

/** ⭐ The version a page prints now (spec §6: `policyVersion(page)`). */
export function policyVersion(page: PolicyPage): string {
  return live.policyVersion(page);
}

/** ⭐ A page's META with the version the page prints — unchanged while nothing is stamped. */
export function policyMeta(meta: string, page: PolicyPage): string {
  return live.policyMeta(meta, page);
}

/** The whole saved record, a deep copy — what U33a-R's opening checks (`policyOpeningProblems`) read. */
export function savedPolicyLines(): PolicyLinesRecord {
  return live.savedRecord();
}

/**
 * ⛔ F8 · IS THE RECORD READABLE HERE — has this process loaded `legal.policy_lines` (its hydration answered) and read it IN
 * FULL (nothing dropped)? While it is false the pages print their own words and the opening checks see nothing saved:
 * ⚠️ U33a-R's gate must refuse every licence send while this is false.
 */
export function policyLinesReadable(): boolean {
  return live.readable();
}

/**
 * ⛔ THE ONLY WRITER, and the ONLY one the card's action may call: TEXT per line and language with the revision it was
 * edited from and its review tick (`readPolicyLinesPatch`), every rule run first (`policyLineProblems`), the server's own
 * admission (a stale page), a version appended only on change (new words, or a review marker), the page's version stamped
 * only for new words, the append-only check, then the VERIFIED write and its audit row. `nowIso` is the server's clock
 * (tests pin it); the author is the session's officer.
 */
export function savePolicyLines(patch: unknown, officerId: string, nowIso?: string): Promise<PolicyLinesSaveResult> {
  return live.savePolicyLines(patch, officerId, nowIso);
}

/**
 * ⭐ HOW A PAGE PRINTS A LINE — pure: the page's own words (`fallback`) while the line has no saved words (`saved === null`),
 * nothing for a saved blank line, and otherwise the saved words in today's markup: one bullet, and for a labelled line its
 * label in `<strong className="text-text">` with the rest — colon first — as ONE text node, exactly as the page's JSX
 * prints `<strong>Consent</strong>: marketing …` (L1 renders both and compares).
 */
export function policyLineNode(line: PolicyLineKey, saved: string | null, fallback: ReactNode): ReactNode {
  if (saved === null) return fallback;
  if (saved === "") return null;
  const parts = policyLineParts(line, saved);
  return parts.label === null
    ? createElement("li", null, saved)
    : createElement("li", null, createElement("strong", { className: "text-text" }, parts.label), parts.rest);
}

/**
 * ⭐ THE WRAPPER THE TWO LEGAL PAGES PRINT THEIR EDITABLE BULLETS THROUGH — the page's literal JSX as its children. ⛔ Read
 * per request (a server component, sync), never at import: the `content()` lesson both pages carry. ⛔ Server only — it
 * reads this process's record; no client file imports it. The guards strip its tags to read the children as today's text
 * (`scripts/lib/policy-line-source.mts`).
 */
export function PolicyLine({ line, locale, children }: { line: PolicyLineKey; locale: PolicyLocale; children?: ReactNode }): ReactNode {
  return policyLineNode(line, live.savedPolicyText(line, locale), children ?? null);
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code.
 *
 * A SECOND instance built by the same `makeStore`, against an injected store (`deps`) — so `test:policy-lines` drives the
 * code that ships, read-back and hydration gate included. `rules` and `merge` default to the shipped ones; a red case
 * plants exactly one of them, and `unqueued` removes the D9 queue for the one case that proves it.
 */
export function __policyLinesStoreForTest(opts: {
  deps?: Parameters<typeof defineConfig>[0]["deps"];
  rules?: PolicyLineRules;
  merge?: typeof mergePolicyLines;
  unqueued?: boolean;
} = {}): PolicyLinesStore {
  return makeStore({
    key: `${POLICY_LINES_KEY}.__test__${Math.random().toString(36).slice(2)}`,
    deps: opts.deps,
    rules: opts.rules ?? POLICY_LINE_RULES,
    merge: opts.merge ?? mergePolicyLines,
    queued: opts.unqueued !== true,
  });
}
