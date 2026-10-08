/**
 * ⛔ OD61 · THE /admin OVERVIEW'S LIVE ACTIVITY FEED SHOWS COMPLIANCE AND IDENTITY ROWS ONLY TO A VIEWER WHO MAY READ
 * COMPLIANCE (marketing tracker ◐ 3a (i), owed since OD61 — U37c-1, 2026-10-05 — and due before U43 writes RG lines in
 * bulk; the identity rows by OD61's amendment, the lead's decision on the review of 2026-10-07).
 *
 * 🔴 WHY. Every staff role may open the overview (the `overview` domain), and its feed printed the newest audit rows whole
 * — `action · targetType#id` — whatever their category. A COMPLIANCE row is a compliance reading: a
 * `marketing.suppressed.rg · User#…` line names a player in responsible-gambling standing the moment a message to them is
 * refused, so a GROWTH officer watching the feed while their campaign sends could read off it which numbers belong to
 * protected players — the D19 oracle the composer's refusals and counts are worded to prevent. (OD61 already stopped a
 * TYPED test from writing such a line; the send loop still writes one per refusal, which is why the feed is restricted.)
 * An identity row is the same kind of reading: `kyc.rejected · User#…`, `kyc.id.duplicate_blocked · User#…` name a
 * player's identity check and its verdict, and the KYC pages are the compliance domain's.
 *
 * ⭐ THE RULE. A viewer whose STORED role may view the compliance domain — `canView(role, "compliance")`: the Owner, and by
 * default COMPLIANCE and AUDITOR, or any role the Owner grants it on /admin/roles — sees the feed as it always was. Every
 * other viewer is shown no COMPLIANCE row, no KYC row and no row of the `kyc.*` family whatever category wrote it (a few
 * identity refusals are SECURITY rows) — the newest rows of everything else, and as many of them: the page reads the
 * whole in-memory ring (`OVERVIEW_FEED_SCAN`), so a burst of hidden rows never thins anybody's feed, and the gap where a
 * hidden row was can never be counted. ⛔ FAILS CLOSED: no viewer, an unreadable row, a non-staff role or a failed grant
 * read is a viewer who may not.
 *
 * ⛔ NOT AN AUDIT READER. This module filters the rows the page read through `houseAuditForConsole` and never calls the
 * audit module's readers itself: the house programme's pin (0.260.1) holds every console audit read to that gate, and a
 * file outside the console that read rows would have to be classified there.
 *
 * Guard: `npm run test:admin-overview-feed` (in-process `--prove-red`).
 */
import { cache } from "react";
import { db } from "./store";
import { isStaffRole } from "./roles";
import { canView } from "./rbac";
import type { AuditEntry } from "./audit";

/** How many rows the overview's feed shows. */
export const OVERVIEW_FEED_ROWS = 12;

/** How many of the newest audit rows the page reads for the feed: the WHOLE in-memory ring (`MAX_IN_MEM` in `audit.ts`), so
 *  the newest `OVERVIEW_FEED_ROWS` rows a viewer may read are always among them, however many hidden rows are newer. */
export const OVERVIEW_FEED_SCAN = 10_000;

/** The categories the feed shows only to a viewer who may read compliance: COMPLIANCE (OD61) and KYC (its amendment). */
export const COMPLIANCE_ONLY_CATEGORIES: readonly string[] = Object.freeze(["COMPLIANCE", "KYC"]);

/** …and the identity family by its action, whatever category wrote it (`kyc.id.duplicate_blocked` is a SECURITY row). */
export const COMPLIANCE_ONLY_ACTION_PREFIX = "kyc.";

/** ⛔ Is this row one only a viewer who may read compliance is shown? */
export function isComplianceOnlyRow(e: Pick<AuditEntry, "category" | "action">): boolean {
  return COMPLIANCE_ONLY_CATEGORIES.includes(e.category)
    || (typeof e.action === "string" && e.action.startsWith(COMPLIANCE_ONLY_ACTION_PREFIX));
}

/**
 * ⭐ THE RULE, PURE: the rows a viewer's feed shows, from the newest rows read (newest first) — compliance and identity
 * rows only when the viewer may read compliance, and always the newest `OVERVIEW_FEED_ROWS` of what they may read.
 * ⛔ The filter runs BEFORE the cut: cutting first would show a non-reader fewer rows exactly where hidden rows were.
 */
export function overviewFeedRows<T extends Pick<AuditEntry, "category" | "action">>(
  rows: readonly T[] | null | undefined,
  mayReadCompliance: boolean,
): T[] {
  const read: readonly T[] = rows ?? [];
  const shown = mayReadCompliance ? read : read.filter((e) => !isComplianceOnlyRow(e));
  return shown.slice(0, OVERVIEW_FEED_ROWS);
}

/**
 * The viewer's STORED row, once per render pass (React `cache`, a pass-through outside one) — the section gate reads the
 * same row; a role is decided from the row, never from the session cookie's photograph of it.
 */
const viewerRow = cache(async (viewerUserId: string) => db.user.findById(viewerUserId));

/**
 * ⛔ MAY THIS VIEWER READ COMPLIANCE ROWS — their stored role's VIEW grant on the compliance domain, the question the
 * compliance pages' own section gate asks. Never throws: no viewer, a row that cannot be read, a non-staff role or a grant
 * read that fails answers `false`.
 */
export async function viewerMayReadCompliance(viewerUserId: string | null | undefined): Promise<boolean> {
  if (typeof viewerUserId !== "string" || viewerUserId.length === 0) return false;
  try {
    const viewer = await viewerRow(viewerUserId);
    if (!viewer || !isStaffRole(viewer.role)) return false;
    return (await canView(viewer.role, "compliance")) === true;
  } catch {
    return false;
  }
}
