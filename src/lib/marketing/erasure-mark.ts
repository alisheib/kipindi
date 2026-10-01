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
 * ⛔ PURE AND CLIENT-SAFE, AND IT IMPORTS NOTHING. No directive: a "use client" here would turn the constant into a
 * client reference on the server (the 2026-09-05 `kycGateState` outage shape).
 */
export const ERASURE_EVIDENCE = "erasure" as const;
