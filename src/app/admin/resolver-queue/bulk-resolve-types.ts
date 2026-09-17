/**
 * The bulk-resolve action's result shape — in its OWN module, not beside the action.
 *
 * ⛔ A `"use server"` FILE MAY EXPORT ONLY ASYNC FUNCTIONS. `export type` is erased by
 * `tsc`, so a type exported from the action file typechecks perfectly and `npm run
 * qa:types` stays green — and `next build` still fails, because the Server Actions
 * transform reads the module's export list before the types are gone. This project has
 * paid for that once already: green locally, red in CI, and the failure names a rule the
 * typechecker cannot see. So the types live here and both the action and the bar import
 * them.
 */
import type { BulkBlockReason } from "@/lib/server/bulk-resolve-eligibility";

export type BulkResolveOutcome = {
  marketId: string;
  title: string;
  outcome?: "YES" | "NO";
  /** Present on `resolved` — when the money is scheduled to move. */
  settlesAt?: string | null;
  /** Present on `resolved` — did this row need a typed override? */
  overridden?: boolean;
  /** Present on `staged` — two-admin mode; a DIFFERENT officer must confirm. */
  awaitingSecond?: boolean;
  reason?: BulkBlockReason;
  detail?: string;
};

/**
 * ⭐ FIVE BUCKETS, AND EVERY ONE OF THEM IS SHOWN. Partial success is the NORMAL case for
 * a bulk seal, not the error case — a queue of twenty will routinely hold rows the floor
 * refuses, rows another officer just took, and rows whose betting has not closed. ⛔ One
 * "Done ✓" over a mixed batch is a false statement about money on a settlement surface.
 */
export type BulkResolveResult =
  | {
      ok: true;
      batchId: string;
      attempted: number;
      /** Sealed by this action. The verdict is recorded; the money moves at settle. */
      resolved: BulkResolveOutcome[];
      /** Two-admin mode — stage-1 staged, awaiting a DIFFERENT officer. */
      staged: BulkResolveOutcome[];
      /** Refused by the floor (or by row state) and NOT overridden. Nothing happened. */
      skipped: BulkResolveOutcome[];
      /** Someone else got there first between render and submit — a double-click, a second
       *  admin, or the scheduler. ⛔ NOT a failure: the market is in the state that was
       *  asked for. Counted apart so "we resolved 12" never counts one market twice. */
      alreadyApplied: BulkResolveOutcome[];
      /** The engine refused, or threw. */
      failed: BulkResolveOutcome[];
    }
  /** ⭐ DG-S-05 — `field` is the `data-field` of the control the officer must fix. Optional and
   *  additive: every refusal that cannot name one stays exactly as it was. */
  | { ok: false; error: string; field?: string };

/**
 * One row of the queue, as the CLIENT sees it. Everything here is derived on the server
 * and handed down as a serialisable prop.
 *
 * ⛔ THE CLIENT NEVER COMPUTES A VERDICT. `bulkVerdictFor` needs the trusted-source
 * registry, the effective per-market config and `decideAutoResolve` itself — importing
 * that graph into a `"use client"` file would drag Prisma and the lock manager into the
 * browser bundle. More to the point: a verdict the browser computed is a verdict an
 * attacker chose, and the server re-derives every one of these before it seals anything.
 * What is here is for PAINT.
 */
export type BulkRow = {
  marketId: string;
  title: string;
  /** Player money held on this market until it resolves — the actual urgency signal, and
   *  what the confirmation dialog totals. */
  pool: number;
  verdict: BulkVerdictView;
  /**
   * A neutral state the server page derives for the bar's count (C5-SPEC ruling 192): `held`, `unread` when the page's read
   * failed, `none` otherwise. It carries no figure and no word — the sentences arrive as one string from the page
   * (`exposureCountTemplate`), and the client never learns more than which rows to count. Absent = `none`.
   */
  exposureState?: "none" | "held" | "unread";
};

/**
 * The bar's count sentences, from the page's template and the rows in scope: the first sentence counts `held` rows, the
 * second `unread` rows (`|` separates them, `{n}` is the count), and a sentence whose count is 0 is left out — so rows
 * that are all `none`, or no template, give nothing and the bar renders what it rendered before.
 */
export function exposureCountLines(rows: ReadonlyArray<Pick<BulkRow, "exposureState">>, template: string | null | undefined): string[] {
  if (!template) return [];
  const [heldText = "", unreadText = ""] = template.split("|");
  const held = rows.filter((r) => r.exposureState === "held").length;
  const unread = rows.filter((r) => r.exposureState === "unread").length;
  const out: string[] = [];
  if (held > 0 && heldText) out.push(heldText.split("{n}").join(String(held)));
  if (unread > 0 && unreadText) out.push(unreadText.split("{n}").join(String(unread)));
  return out;
}

/** The paint-only projection of `BulkVerdict`. Same fields, no methods, no server types. */
export type BulkVerdictView = {
  eligible: boolean;
  outcome: "YES" | "NO" | null;
  reason: BulkBlockReason | null;
  all: BulkBlockReason[];
  overridable: boolean;
  stage: "seal" | "stage1";
  modeIsAuto: boolean;
  /** Did THIS officer stage it? Decides which of two OPPOSITE instructions the row gives:
   *  go and find a colleague, or there is nothing here for you to do. */
  stagedByMe: boolean;
  confidence: number | null;
  citedHost: string | null;
  approvedHost: string | null;
  /**
   * ⛔ THE FLOOR THIS ROW WAS ACTUALLY JUDGED AGAINST — `getEffectiveConfig(m.id)`, which
   * honours a per-market override, and NOT the queue-wide number.
   *
   * It is on the verdict rather than passed beside it because the override justification is
   * composed from these fields and written to the audit chain. The queue used to hand the
   * GLOBAL threshold down for display while `bulkVerdictFor` refused the row against the
   * market's own — harmless while it only dressed a chip, a false statement the moment a
   * regulator reads "against a floor of 90%" on a market whose floor was 95.
   */
  threshold: number;
};
