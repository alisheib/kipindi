/**
 * ⭐ C8c · #14a · THE IMPORTER'S REFUSAL ROWS ARE BOUNDED — at most ONE audit row a minute for one officer, one run, one
 * reason and one step, and none at all for a "moved".  (C8c, 2026-10-09 · docs/contacts-screen-briefs/C8c.md item 3)
 *
 * 🔴 WHY IT EXISTS. Every refusal the importer gives writes an audit row (`contacts.import.stage_refused`,
 * `contacts.import.check_refused`, `contacts.import.commit_refused` — X23), and nothing prunes the chain: it is HMAC-chained
 * evidence (`audit.ts`), and every append takes the chain's database-global lock. The step action's rate bucket
 * (`contacts.import.step`, 600 a minute — sized for a 200,000-row run, `rate-limit.ts`) is the only bound, so a script posting
 * bad cursors to the step action could write about 600 refusal rows a minute, each one a lock every other audited act
 * (bets included) waits behind.
 *
 * ⭐ THE RULE (the brief's bound, with the officer added):
 *   · ⛔ a "moved" is NEVER written — the cursor already advanced (another tab, an adopting admin, a reload): normal
 *     concurrency, not an event (`NEVER_AUDITED`);
 *   · any other refusal is written when no row of the same KEY was written in the last `REFUSAL_AUDIT_WINDOW_MS` (a
 *     minute); the key is the audit action, the officer, the run (or none, for a refusal before a run is opened), the
 *     reason and (the review's n4) the payload's `step` when it has one — a start and a commit step refused for one
 *     reason are two things that happened. ⭐ A ROW THE AUDIT DID NOT RECORD NEVER SILENCES THE MINUTE (n4): `audit()`
 *     never rejects, it resolves `recorded: false`; the writer then takes the admission back (`undo`), so the next
 *     refusal writes and counts the unrecorded one — and every one kept while it was failing — among its `repeats`.
 *     ⭐ THE OFFICER IS IN THE KEY on purpose — the brief's "per run per reason" would let one officer's row silence
 *     ANOTHER officer's refusal on the same run in the same minute (a `not_yours` from someone poking at another
 *     officer's import), and an audit trail must never lose WHO tried. Each officer is still held to one row a minute per
 *     run, reason and step, so the flood above becomes one row a minute;
 *   · ⭐ the refusals a row did not write are COUNTED, and the next row written for that key carries them as `repeats`
 *     (only when there were any — every payload shape is unchanged otherwise): a flood shows as one row a minute saying how
 *     many attempts it stands for, never as a quiet trickle. A flood that stops leaves its last minute's count unwritten —
 *     the price of writing nothing between rows, said here.
 * ⭐ WHY A GATE OF ITS OWN, NOT `rate-limit.ts` (the smallest change that can be proven): the rate limiter's buckets are
 * process-global and read the wall clock (`Date.now()`), so no suite could reset them between two runs of one test or
 * move a minute on — and a token bucket cannot count what it refused. This gate is a factory over a clock: production
 * holds ONE per process (`IMPORT_REFUSAL_AUDIT`, the wall clock), every suite builds its own over its fixed clock and
 * resets it per fresh store. ⚠️ PER PROCESS: with N server instances an officer can reach N rows a minute per run and
 * reason — still a bound, and the flood is gone.
 * ⛔ BOUNDED MEMORY: at most `REFUSAL_AUDIT_KEYS_MAX` keys; when full, the keys whose minute has passed are dropped, and if
 * every key is fresh the map is emptied (more rows, never fewer: the gate fails OPEN, as an audit control must).
 * ⛔ The key holds ids, a reason and a step's word only — never a number, a name or a cell.
 * Guard: `test:contacts-import` (section `commit`, M27, M27b and M27c) · `test:contacts-staging` O5.
 */

/** The window one key writes at most one row in. */
export const REFUSAL_AUDIT_WINDOW_MS = 60_000;
/** The most keys the gate remembers at once. */
export const REFUSAL_AUDIT_KEYS_MAX = 10_000;
/** ⛔ The reasons never written at all: normal concurrency, not an event. */
export const NEVER_AUDITED: readonly string[] = ["moved"];

/** One refusal the importer is about to write a row for. */
export type RefusalAuditAsk = {
  readonly action: string;
  readonly officerId: string;
  readonly importId: string | null;
  readonly reason: string;
  /** ⭐ The review's n4 · the payload's own `step` when it carries one ("start", "commit", "tags_not_added", a failure's
   *  step): two steps refused for one reason are two things that happened, so they never share a minute's row. */
  readonly step?: string;
};

/** Write a row or not — and, when writing, how many refusals of the same key the gate kept out since the last row.
 *  ⭐ n4 · `undo`: the write was not recorded (the audit resolved `recorded: false`, or threw) — the admission is taken
 *  back, so the minute stays open and the next refusal writes, counting this one, and every refusal of the key kept
 *  while the write was failing, among its `repeats`. */
export type RefusalAuditVerdict = { readonly write: boolean; readonly repeats: number; readonly undo: () => void };

export type RefusalAuditGate = {
  readonly admit: (ask: RefusalAuditAsk) => RefusalAuditVerdict;
  /** Forget every key — a suite's fresh store; production never calls it. */
  readonly reset: () => void;
};

/** The one key: the audit action, the officer, the run (or "-"), the reason and (n4) the payload's step (or "-"). */
export function refusalAuditKey(ask: RefusalAuditAsk): string {
  return `${ask.action}|${ask.officerId}|${ask.importId ?? "-"}|${ask.reason}|${ask.step ?? "-"}`;
}

const NOTHING_TO_UNDO = (): void => undefined;

/** ⭐ A gate over `now` (ms): see the header for the rule. */
export function refusalAuditGate(
  now: () => number, windowMs: number = REFUSAL_AUDIT_WINDOW_MS, maxKeys: number = REFUSAL_AUDIT_KEYS_MAX,
): RefusalAuditGate {
  const seen = new Map<string, { at: number; kept: number }>();
  const admit = (ask: RefusalAuditAsk): RefusalAuditVerdict => {
    if (NEVER_AUDITED.includes(ask.reason)) return { write: false, repeats: 0, undo: NOTHING_TO_UNDO };
    const key = refusalAuditKey(ask);
    const t = now();
    const held = seen.get(key);
    if (held !== undefined && t - held.at < windowMs) {
      held.kept++;
      return { write: false, repeats: 0, undo: NOTHING_TO_UNDO };
    }
    if (held === undefined && seen.size >= maxKeys) {
      for (const [k, v] of seen) if (t - v.at >= windowMs) seen.delete(k);
      if (seen.size >= maxKeys) seen.clear();
    }
    const kept = held === undefined ? 0 : held.kept;
    seen.set(key, { at: t, kept: 0 });
    // ⭐ n4 · an unrecorded write opens the minute again: the key is due at once, this refusal counted as kept — and (the
    // re-review's NIT) so is every refusal of the key kept WHILE that write was failing, never lost with it.
    const undo = (): void => {
      seen.set(key, { at: Number.NEGATIVE_INFINITY, kept: kept + 1 + (seen.get(key)?.kept ?? 0) });
    };
    return { write: true, repeats: kept, undo };
  };
  return { admit, reset: () => seen.clear() };
}

/** ⭐ Production's ONE gate per process, on the wall clock — staging's refusals and the check's and the commit's share it. */
export const IMPORT_REFUSAL_AUDIT: RefusalAuditGate = refusalAuditGate(() => Date.now());
