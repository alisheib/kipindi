/**
 * The searchable-field registry — what `field:value` may name, per entity.
 *
 * Field names are validated against a CLOSED set, the same way `parseSort` in
 * components/admin/admin-sort.tsx validates `?sort`. That is what makes
 * `queryToWhere` injection-safe: a column name can only ever come from this file,
 * never from the URL.
 *
 * `kind` matters. A Prisma `contains` on an enum column is a type error, and on a
 * cuid it is a slow way to write `equals`. Each field declares how it is matched.
 */

export type FieldKind =
  /** Free text — `contains`, case-insensitive. */
  | "text"
  /** IDs, references, enums — `equals` on the exact value. */
  | "exact";

export type FieldSpec = {
  /** One name can cover several columns: `title:` spans EN + SW + ZH. */
  columns: readonly string[];
  kind: FieldKind;
};

export type EntitySchema = {
  fields: Readonly<Record<string, FieldSpec>>;
  /** The columns a BARE token searches. Keep this to what a human would expect. */
  default: readonly string[];
  /**
   * TRUE when the names above describe a client-side VIEW MODEL rather than
   * table columns — e.g. the admin proposals list receives `proposerMasked`, a
   * PII-masked value computed on the server, and `title` rather than `titleEn`.
   *
   * A view-model schema can only ever be used with `matchesQuery`. Passing one to
   * `queryToWhere` would emit a `where` on a column that does not exist and fail
   * at runtime in production. The adoption guard skips schema validation for
   * these and would need the same care if one were ever moved to SQL.
   */
  viewModel?: true;
};

/** Every column named anywhere in a schema — used by the adoption guard. */
export function allColumns(s: EntitySchema): string[] {
  return [...new Set(Object.values(s.fields).flatMap((f) => f.columns))];
}

export const MARKET_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["titleEn", "titleSw", "titleZh"], kind: "text" },
    category: { columns: ["category"], kind: "text" },
    criterion: { columns: ["resolutionCriterion"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
    status: { columns: ["status"], kind: "exact" },
  },
  // Matches what /markets and /results already searched, so the behavioural
  // contract in scripts/markets-search-e2e.mjs still holds.
  default: ["titleEn", "titleSw", "titleZh", "category", "resolutionCriterion"],
};

export const USER_SEARCH: EntitySchema = {
  fields: {
    name: { columns: ["displayName"], kind: "text" },
    phone: { columns: ["phoneE164"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
    status: { columns: ["status"], kind: "exact" },
    role: { columns: ["role"], kind: "exact" },
    /**
     * ⚠️ COMPUTED, NOT A COLUMN. `displayLabel(u)` renders the auto-handle an
     * officer actually sees and pastes ("Player #A3F2K8"). It exists only in JS,
     * so a caller must supply it on the record it passes to `matchesQuery`.
     *
     * Consequence to respect when /admin/players eventually moves to SQL: this
     * field CANNOT be expressed in a Prisma `where`. Either persist the handle as
     * a real column first, or drop it from `default` and accept that pasting a
     * handle stops working. Do not quietly let it fall out — an officer pasting a
     * handle and getting nothing is worse than not offering it.
     */
    handle: { columns: ["displayLabel"], kind: "text" },
  },
  default: ["id", "phoneE164", "displayName", "displayLabel"],
};

export const TXN_SEARCH: EntitySchema = {
  fields: {
    ref: { columns: ["providerRef"], kind: "text" },
    msisdn: { columns: ["msisdn"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
    user: { columns: ["userId"], kind: "exact" },
    status: { columns: ["status"], kind: "exact" },
    type: { columns: ["type"], kind: "exact" },
  },
  // Mirrors prisma-dal.ts txn.search exactly — id / providerRef / msisdn / userId.
  default: ["id", "providerRef", "msisdn", "userId"],
};

export const AI_USAGE_SEARCH: EntitySchema = {
  fields: {
    model: { columns: ["model"], kind: "text" },
    error: { columns: ["errorType"], kind: "text" },
    detail: { columns: ["detail"], kind: "text" },
    feature: { columns: ["feature"], kind: "exact" },
  },
  default: ["model", "errorType", "detail"],
};

export const POLL_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["titleEn", "titleSw", "titleZh"], kind: "text" },
    category: { columns: ["category"], kind: "text" },
    criterion: { columns: ["resolutionCriterion"], kind: "text" },
    reasoning: { columns: ["reasoning"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
  },
  default: ["titleEn", "titleSw", "titleZh", "category", "id", "resolutionCriterion", "reasoning"],
};

export const CANDIDATE_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["proposedTitleEn", "proposedTitleSw", "proposedTitleZh"], kind: "text" },
    category: { columns: ["category"], kind: "text" },
    criterion: { columns: ["resolutionCriterion"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
  },
  default: ["proposedTitleEn", "proposedTitleSw", "proposedTitleZh", "category", "id", "resolutionCriterion"],
};

export const PROPOSAL_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["title", "titleSw", "titleZh"], kind: "text" },
    category: { columns: ["category"], kind: "text" },
    proposer: { columns: ["proposerMasked"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
  },
  default: ["title", "titleSw", "titleZh", "proposerMasked", "category", "id"],
  // Client-side view model: the admin list receives `title` (not titleEn) and
  // `proposerMasked` (PII-masked on the server). Never pass this to queryToWhere.
  viewModel: true,
};

/** The names a surface should offer as clickable chips in the syntax help. */
export function fieldNames(s: EntitySchema): string[] {
  return Object.keys(s.fields);
}
