/**
 * THE ERASURE MARK — the one word an erasure leaves behind, in a module the browser may import.
 *                                                                        (U31-A, S10 2026-10-01)
 *
 * The evidence on the ledger row an erasure appends, and the `sourceRef` an emptied book row carries. ⛔ Never the
 * account id or the request id. ⭐ On the book row it is the importer's signal (U31): a row marked `erasure`
 * COLLAPSES TO KEEP whatever a file asks, so re-importing an old spreadsheet cannot write the erased person's name
 * back — the job the first cut's stop was doing, without a stop nobody can lift.
 *
 * ⭐ WHY IT MOVED OUT OF `erase.ts`. The import's `decide()` (`src/lib/contacts/import-decide.ts`) runs in the browser
 * behind the Apply label as well as on the server behind the request, and `erase.ts` imports the store.
 * `test:contacts-boundary` §2.2 forbids a contacts module from reaching src/lib/server, so the declaration lives here
 * and `erase.ts` imports AND re-exports it: every existing importer of `erase.ts` keeps working, and the browser's
 * rule and the server's erasure read ONE binding (`test:contacts-import` §D3d).
 *
 * ⛔ The VALUE is persisted — emptied book rows and ledger rows already carry it — so it never changes.
 *
 * ⭐ C8a · THE ONE RULE "DOES AN ERASURE STAND ON THIS NUMBER?" (S15-15, 2026-10-09). An erasure leaves its word in two
 * places: on the emptied book row (`sourceRef`, the TOMBSTONE) and, on the account's own number, as a ledger row — the
 * ERASURE MARKER, a WITHDRAWN whose evidence is the mark (`erase.ts` step 1). The marker is deliberately not a stop: a
 * Tanzanian number is recycled, so a later GIVEN lifts it and the number's next holder can still say yes
 * (`test:campaign-privacy` P11e). But NOTHING ELSE lifts it — not an opt-out tap on an old /s/ link, not a lapse, no row
 * that is not a GIVEN. So the rule reads the number's ledger newest first for the latest row that is EITHER a GIVEN or
 * a marker: a marker, and an erasure stands; a GIVEN, or neither, and it does not (`erasureStandsOn`). 🔴 Before C8a the
 * importer read only the ledger's LAST row, so a later opt-out tap lifted the erasure and an old spreadsheet wrote the
 * erased person back, name and all.
 *   · A NUMBER WITH A BOOK ROW is decided by the row ALONE (`isErasedNumber`): the tombstone is erased whatever the ledger
 *     says, and a row the erasure did not empty is an ordinary row whatever the ledger says.
 *   · ONE BINDING: the importer's decide() (in the browser and on the server), the facts it is fed (both twins' grouped
 *     read `messagingConsent.erasureStandsAmong`, which answers through `erasureStandsAmongRows`), the commit's
 *     re-decision, and the Add form's lookup and save all read the functions below (`test:contacts-import` §D3d, §D3f;
 *     `test:dal-parity` §30).
 *
 * ⛔ PURE AND CLIENT-SAFE, AND IT IMPORTS NOTHING. No directive: a "use client" here would turn the constant into a
 * client reference on the server (the 2026-09-05 `kycGateState` outage shape).
 */
export const ERASURE_EVIDENCE = "erasure" as const;

/** A consent-ledger row as the erasure rule reads it — its status and its evidence. Structural on purpose: a stored ledger
 *  row, a Prisma select of those columns and the importer's ledger word all satisfy it. */
export type ErasureLedgerRow = { readonly status: string; readonly evidence: string | null };

/** A ledger row with its number — what a grouped read hands the rule (named, so no signature carries an inline type). */
export type ErasureLedgerEntry = ErasureLedgerRow & { readonly identifier: string };

/** ⭐ Is this ledger row the ERASURE MARKER — the WITHDRAWN an erasure appends, its evidence the mark? */
export function isErasureMarker(row: ErasureLedgerRow): boolean {
  return row.status === "WITHDRAWN" && row.evidence === ERASURE_EVIDENCE;
}

/**
 * ⭐ THE ONE RULE — does an erasure stand on this number, by its ledger? `newestFirst` holds the number's rows in the
 * ledger's own order (createdAt descending, then id descending — the order `latestFor` reads). The first row that is a
 * GIVEN or a marker decides: a marker, and it stands; a GIVEN, and it was lifted. A row that is neither (an opt-out's
 * WITHDRAWN, a lapse) is passed over — it never lifts an erasure. No such row at all: no erasure stands.
 */
export function erasureStandsOn(newestFirst: readonly ErasureLedgerRow[]): boolean {
  for (const row of newestFirst) {
    if (row.status === "GIVEN") return false;
    if (isErasureMarker(row)) return true;
  }
  return false;
}

/**
 * The numbers among `keys` on which an erasure stands — `erasureStandsOn` asked of each number's own rows. ⛔ `newestFirst`
 * must hold the rows in the ledger's order (createdAt descending, then id descending); a number with no row never stands.
 * Each number once, in code-unit order. ⭐ BOTH TWINS' grouped read answer through this
 * (`messagingConsent.erasureStandsAmong`), so the memory twin and Postgres differ only in how they read the rows, never
 * in the rule.
 */
export function erasureStandsAmongRows(keys: readonly string[], newestFirst: readonly ErasureLedgerEntry[]): string[] {
  const byNumber = new Map<string, ErasureLedgerRow[]>();
  for (const row of newestFirst) {
    const held = byNumber.get(row.identifier);
    if (held === undefined) byNumber.set(row.identifier, [row]);
    else held.push(row);
  }
  return Array.from(new Set(keys)).filter((m) => erasureStandsOn(byNumber.get(m) ?? [])).sort();
}

/**
 * ⭐ IS THIS NUMBER ERASED? `book` is the number's book row, or null; `erasureStands` is the ledger's answer
 * (`erasureStandsOn`). A book row decides ALONE: the tombstone (its mark) is erased, and an ordinary row is not, whatever
 * the ledger says. With no row, the ledger decides. The importer's decide() and the Add form's lookup and save ask this
 * one function, so a number the importer keeps as erased is never added by hand.
 */
export function isErasedNumber(book: { readonly sourceRef: string | null } | null, erasureStands: boolean): boolean {
  if (book !== null) return book.sourceRef === ERASURE_EVIDENCE;
  return erasureStands;
}
