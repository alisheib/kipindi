/**
 * THE MARKET CHANGE LOG — which market rows a COMMITTED write has changed, for the memos that hold copies of them.
 *
 * 🔴 WHY IT EXISTS (R9-D, the Vodacom plan's S6 visual pass, round 9, 2026-10-11 — tiles 168–170). `/results` said
 * "0 imetatuliwa · TZS 0 imekamilika" over "Bado hakuna soko lililotatuliwa" while the LIVE strip on the same screen said
 * "TZS 8K imekamilika NDIO kwenye Je, Yanga SC…" and the same player's tickets listed six settled bets. The archive is
 * memoised (`listTerminalMarkets`, five minutes) and NOTHING cleared it when a market resolved, voided or settled, so a
 * read taken before the drive's markets settled — an empty one — kept being served after they had. A player who has
 * just won saw "no settled markets" beside their own winning ticket.
 *
 * ⭐ ONE RULE FOR EVERY MEMO OVER THE MARKET TABLE: a memo takes `marketChangeMark()` BEFORE it reads and keeps it with
 * what it read; on every later hit it asks `marketsChangedSince(mark, line)` and re-reads exactly those rows. A change
 * noted while a read was still in flight carries a later number than that read's mark, so a read that started before a
 * write can never land after it and be served as current — the law the journey and invite switches keep with their
 * `gen` (simple-journey-switch.ts), here naming the rows so the memo re-reads only those.
 *
 * ⛔ NOTED AT THE STORE, AFTER THE COMMIT, NEVER AT A CALLER. Every writer of a market row — the officer's resolve, the
 * bulk resolver, the Sentinel's seal, an Up & Down round, the emergency void, settlement, an upheld objection, a
 * re-categorisation, the short titles, a delete — goes through `marketStore` (market-dal.ts), and both of its twins note
 * here. On Postgres a write made on a lock's transaction is noted when that transaction COMMITS (`afterCommit`,
 * locks.ts): noted earlier, a reader on another connection could re-read the row as it was before the commit and keep it
 * as current. Two writers bypass the store. The chain purge's redaction (chain-purge.ts) notes after its own batch
 * commits. The desk's Counts-as shift (`shiftShownExtra`, house-bot-dal.ts) needs no note, for `addToPool`'s reason: it
 * moves only `predictorExtra`, only on LIVE and CLOSED rows, and the memos this rule serves hold finished rows alone
 * (/admin/insights reads the true count, never the extra). `test:results-freshness` holds the census.
 *
 * ⚠️ ONE PROCESS. The log lives on `globalThis`, like every memo it serves. Production runs one container
 * (docs/RAILWAY-LIVE.md §13, item 6); a write this process cannot see — an ops script against the database, the other
 * container during a deploy's 60-second overlap — is bounded by each memo's own TTL, exactly as before this existed.
 */
import type { ProductLine, ProductLineFilter } from "./market-service";

/**
 * How many changes the log keeps. A memo whose mark is older than the oldest kept change re-reads in full — cheaper than
 * re-reading a thousand rows by id, and never wrong. Up & Down writes about three notes a round, so this is hours of
 * changes against memos whose TTLs are minutes.
 */
export const MARKET_CHANGE_LOG_MAX = 1_000;

type Change = { seq: number; id: string; line: ProductLine | null };
type ChangeLog = { seq: number; changes: Change[] };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKET_CHANGES: ChangeLog | undefined;
}

const changeLog = (): ChangeLog => (globalThis.__50PICK_MARKET_CHANGES ??= { seq: 0, changes: [] });

/** A row the terminal archive holds: RESOLVED or VOIDED (`listTerminalMarkets`). */
export function isTerminalStatus(status: string | null | undefined): boolean {
  return status === "RESOLVED" || status === "VOIDED";
}

/** The log's position now. ⛔ A memo takes it BEFORE it reads, never after. */
export function marketChangeMark(): number {
  return changeLog().seq;
}

/**
 * Record that these rows changed. `line` is the rows' product line when the writer knows it, `null` when it does not
 * (then every memo, whatever line it holds, re-reads them). ⛔ Call it once the write is COMMITTED — through
 * `afterCommit(tx, …)` when the write was made on a transaction.
 */
export function noteMarketsChanged(ids: readonly string[], line: ProductLine | null): void {
  const log = changeLog();
  for (const id of ids) log.changes.push({ seq: ++log.seq, id, line });
  if (log.changes.length > MARKET_CHANGE_LOG_MAX) log.changes.splice(0, log.changes.length - MARKET_CHANGE_LOG_MAX);
}

/**
 * The ids changed after `mark` on the product lines `filter` covers — or `null` when the log no longer reaches back to
 * `mark` and the caller must re-read in full.
 */
export function marketsChangedSince(mark: number, filter: ProductLineFilter): Set<string> | null {
  const log = changeLog();
  const out = new Set<string>();
  if (mark >= log.seq) return out;
  const oldest = log.changes.length > 0 ? log.changes[0].seq : log.seq + 1;
  if (mark + 1 < oldest) return null;
  for (let i = log.changes.length - 1; i >= 0 && log.changes[i].seq > mark; i--) {
    const c = log.changes[i];
    if (filter === "ALL" || c.line === null || c.line === filter) out.add(c.id);
  }
  return out;
}
