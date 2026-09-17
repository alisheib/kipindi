/**
 * The report catalogue's house entries, as a CLOSED LIST (C5-SPEC ruling 170). `catalogue.ts` re-exports it beside
 * `REPORT_CATALOGUE`; step 6 of Commit 5 adds the two entries themselves under these exact ids.
 *
 * ⛔ WHY A LIST AND NOT A HAND-TYPED ACTION. The reports route writes `report.<id>.generated` and `report.<id>.failed` with
 * the OFFICER as actor, so an officer's own "Export my data" and `/profile/account` feed would carry a house word
 * (owner ruling D19). The player's actor-side reads exclude exactly these actions, derived here from the ids, so a renamed
 * report cannot slip past the exclusion.
 *
 * Server-only. A tiny module on purpose: `user-service.ts` must not import the report builders to learn two ids.
 */
export const HOUSE_REPORT_IDS = ["house-liquidity", "house-market-statement"] as const;

export type HouseReportId = (typeof HOUSE_REPORT_IDS)[number];

/** The audit actions the reports route writes for the house entries (`api/admin/reports/[id]/route.ts`). */
export const HOUSE_REPORT_AUDIT_ACTIONS: readonly string[] = HOUSE_REPORT_IDS.flatMap((id) => [`report.${id}.generated`, `report.${id}.failed`]);
