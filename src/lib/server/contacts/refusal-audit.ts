/**
 * ⭐ C8c · #14a · THE IMPORTER'S REFUSAL ROWS ARE BOUNDED — at most ONE audit row a minute for one officer, one run and one
 * reason, and none at all for a "moved".             (C8c, 2026-10-09 · docs/contacts-screen-briefs/C8c.md item 3)
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
 *     minute); the key is the audit action, the officer, the run (or none, for a refusal before a run is opened) and the
 *     reason. ⭐ THE OFFICER IS IN THE KEY on purpose — the brief's "per run per reason" would let one officer's row
 *     silence ANOTHER officer's refusal on the same run in the same minute (a `not_yours` from someone poking at another
 *     officer's import), and an audit trail must never lose WHO tried. Each officer is still held to one row a minute per
 *     run and reason, so the flood above becomes one row a minute;
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
 * ⛔ The key holds ids and a reason only — never a number, a name or a cell.
 * Guard: `test:contacts-import` (section `commit`, M27 and M27b) · `test:contacts-staging` O5.
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
};

/** Write a row or not — and, when writing, how many refusals of the same key the gate kept out since the last row. */
export type RefusalAuditVerdict = { readonly write: boolean; readonly repeats: number };

export type RefusalAuditGate = {
  readonly admit: (ask: RefusalAuditAsk) => RefusalAuditVerdict;
  /** Forget every key — a suite's fresh store; production never calls it. */
  readonly reset: () => void;
};

/** The one key: the audit action, the officer, the run (or "-") and the reason. */
export function refusalAuditKey(ask: RefusalAuditAsk): string {
  return `${ask.action}|${ask.officerId}|${ask.importId ?? "-"}|${ask.reason}`;
}

/** ⭐ A gate over `now` (ms): see the header for the rule. */
export function refusalAuditGate(
  now: () => number, windowMs: number = REFUSAL_AUDIT_WINDOW_MS, maxKeys: number = REFUSAL_AUDIT_KEYS_MAX,
): RefusalAuditGate {
  const seen = new Map<string, { at: number; kept: number }>();
  const admit = (ask: RefusalAuditAsk): RefusalAuditVerdict => {
    if (NEVER_AUDITED.includes(ask.reason)) return { write: false, repeats: 0 };
    const key = refusalAuditKey(ask);
    const t = now();
    const held = seen.get(key);
    if (held !== undefined && t - held.at < windowMs) {
      held.kept++;
      return { write: false, repeats: 0 };
    }
    if (held === undefined && seen.size >= maxKeys) {
      for (const [k, v] of seen) if (t - v.at >= windowMs) seen.delete(k);
      if (seen.size >= maxKeys) seen.clear();
    }
    seen.set(key, { at: t, kept: 0 });
    return { write: true, repeats: held === undefined ? 0 : held.kept };
  };
  return { admit, reset: () => seen.clear() };
}

/** ⭐ Production's ONE gate per process, on the wall clock — staging's refusals and the check's and the commit's share it. */
export const IMPORT_REFUSAL_AUDIT: RefusalAuditGate = refusalAuditGate(() => Date.now());
