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

/**
 * A PLAYER'S OWN TRANSACTIONS — `/wallet`.
 *
 * ⛔ NOT `TXN_SEARCH`, AND THE DIFFERENCE IS NOT COSMETIC. That schema is the ADMIN one: its
 * fields are `msisdn` and `user`, and its default columns are `id / providerRef / msisdn /
 * userId`. Handing it to a player surface would (a) advertise `user:` and `msisdn:` as clickable
 * help chips on a page where another person's identifiers have no business being typed, and
 * (b) fail to search the one field a player would actually reach for — the row's own
 * `description`, which is the sentence they can see.
 *
 * ⛔ `viewModel: true`: the row a player's wallet renders is assembled on the server and carries
 * the STORED `type`/`status` beside the folded display token. `matchesQuery` only.
 */
export const MY_TXN_SEARCH: EntitySchema = {
  fields: {
    ref: { columns: ["providerRef"], kind: "text" },
    type: { columns: ["type"], kind: "exact" },
    status: { columns: ["status"], kind: "exact" },
    id: { columns: ["id"], kind: "exact" },
  },
  // What a bare token searches — the sentence on the row, which is what a player can see.
  default: ["description"],
  viewModel: true,
};

/**
 * ⭐ THE AGENT APPLICATION QUEUE — /admin/agents, Applications tab.
 *
 * 🔴 WHY IT EXISTS: the console had NO SEARCH AT ALL. An officer holding a phone number, an
 * application id or a receipt reference could not look it up — they scrolled the queue or
 * pasted the id into the URL by hand — and the Decided table was a hard `slice(0, 20)` with no
 * next page, so application #21 onward was unreachable from the console entirely.
 *
 * ⚠️ A VIEW MODEL. The rows this filters carry `name` and `phone` joined from a batched user
 * lookup, plus `agentCode` / `feeReference` off the application. ⛔ Never pass it to
 * `queryToWhere`: `name` is not a column on AgentApplication.
 *
 * ⛔ THE PHONE IS SEARCHABLE BUT NEVER RENDERED UNMASKED — the tables wrap it in `Sensitive`.
 * Being able to FIND an applicant by the number they gave support is the whole point; that is a
 * different question from printing it in a list.
 */
export const AGENT_SEARCH: EntitySchema = {
  fields: {
    name: { columns: ["name"], kind: "text" },
    phone: { columns: ["phone"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
    user: { columns: ["userId"], kind: "exact" },
    status: { columns: ["status"], kind: "exact" },
    source: { columns: ["source"], kind: "exact" },
    fee: { columns: ["feeDisposition"], kind: "exact" },
    /** The receipt reference an applicant types — what an officer holds when finance calls. */
    receipt: { columns: ["feeReference"], kind: "text" },
    /** The 50PICK-AG code, on an approved row. */
    code: { columns: ["agentCode"], kind: "text" },
  },
  default: ["name", "phone", "id", "feeReference", "agentCode"],
  viewModel: true,
};

/**
 * A PLAYER'S OWN UP & DOWN ROUNDS — `/updown/history`.
 *
 * ⛔ SMALL, BUT NOT HAND-ROLLED. The first version of that page's filter matched with
 * `assetName.toLowerCase().includes(q)` and `test:search-adoption` refused it, correctly: this
 * platform has ONE search grammar, and a surface that quietly re-implements a substring match
 * loses quoted phrases, `-exclude` and `field:` — and gains a second definition of what
 * searching means. A round's only words are its asset's name and its duration.
 *
 * ⛔ `viewModel: true`: a row here is a GROUPED ROUND assembled on the server, not a table.
 */
export const UD_ROUND_SEARCH: EntitySchema = {
  fields: {
    asset: { columns: ["assetName", "assetKey"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
  },
  default: ["assetName", "assetKey"],
  viewModel: true,
};

/**
 * A PLAYER'S OWN POSITIONS — `/positions`.
 *
 * ⛔ `viewModel: true`, AND IT IS NOT A FORMALITY. A position row is assembled on the server from
 * TWO tables: the `Position` (stake, side, status, payout) and the `PredictionMarket` it belongs
 * to (the three titles, the category). None of the market names are columns on `Position`, so
 * passing this to `queryToWhere` would emit a `where` on columns that do not exist and fail at
 * runtime, in production, on a page holding real money. `matchesQuery` only.
 *
 * ⭐ `title` SPANS ALL THREE LANGUAGES ON PURPOSE. A player reading the Swahili page may still
 * type an English team name — the market carries all three titles and the grammar matches any of
 * them, so the search finds what the player means rather than what the page happens to render.
 *
 * ⚠️ `side` and `status` are `exact` because they are ENUMS. A `contains` on an enum is a type
 * error in SQL and a slow way to write `equals` here; and `status:` is deliberately searchable
 * even though the lens strip already filters it — a player who has learned `status:WIN` should
 * not be told the grammar has an exception.
 */
export const POSITION_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["titleEn", "titleSw", "titleZh"], kind: "text" },
    category: { columns: ["category"], kind: "text" },
    side: { columns: ["side"], kind: "exact" },
    status: { columns: ["status"], kind: "exact" },
    market: { columns: ["marketId"], kind: "exact" },
    id: { columns: ["id"], kind: "exact" },
  },
  // What a bare token searches — the words a player can actually see on the card.
  default: ["titleEn", "titleSw", "titleZh", "category"],
  viewModel: true,
};

/**
 * THE PUBLIC PROPOSAL BOARD — `/proposals`.
 *
 * ⛔ NOT `PROPOSAL_SEARCH`, AND THE DIFFERENCE IS NOT COSMETIC — the same split `MY_TXN_SEARCH`
 * had to make from `TXN_SEARCH`. That schema is the ADMIN queue's: its title column is `title`
 * (the officer view flattens the three languages into one before it reaches the list), so pointing
 * it at a player row — which carries `titleEn` / `titleSw` / `titleZh` — would search a column
 * that is not there and match NOTHING, while echoing the query back as though it had run. That is
 * `regex-advertised-never-executed` with a different cause.
 *
 * ⭐ `title` SPANS ALL THREE LANGUAGES, for the reason `POSITION_SEARCH` gives: a player reading
 * the Swahili board may still type an English team name, and the proposal carries all three.
 *
 * ⭐ `description` AND `criterion` ARE SEARCHABLE AND THE ADMIN SCHEMA'S ARE NOT. They are the two
 * fields that say what a proposal actually MEANS — the officer queue triages by title and
 * proposer, but a player looking for "the one about the bridge" is remembering the sentence.
 *
 * ⚠️ `status` IS `exact` BECAUSE IT IS AN ENUM, and it is deliberately searchable even though the
 * lens strip already filters it — a player who has learned `status:DECLINED` should not be told
 * the grammar has an exception.
 *
 * ⛔ `viewModel: true`. A board row is assembled by `toView` from the proposal AND its proposer's
 * user row (`proposerMasked` is computed, never stored), so `queryToWhere` would emit a `where` on
 * a column that does not exist. `matchesQuery` only.
 */
export const BOARD_PROPOSAL_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["titleEn", "titleSw", "titleZh"], kind: "text" },
    category: { columns: ["category"], kind: "text" },
    description: { columns: ["description"], kind: "text" },
    criterion: { columns: ["criterion"], kind: "text" },
    proposer: { columns: ["proposerMasked"], kind: "text" },
    status: { columns: ["status"], kind: "exact" },
    id: { columns: ["id"], kind: "exact" },
  },
  // What a bare token searches — the words a player can actually read on the card.
  default: ["titleEn", "titleSw", "titleZh", "category", "description", "criterion"],
  viewModel: true,
};

/**
 * A PLAYER'S OWN INBOX — `/notifications`.
 *
 * ⭐ THE ONLY PLAYER SEARCH SCHEMA THAT IS **NOT** A VIEW MODEL, and that is the whole reason it
 * looks different from `MY_TXN_SEARCH` and `POSITION_SEARCH`. Those describe rows assembled on the
 * server from several tables, so they can only be matched in JS. A notification is ONE table row
 * with real columns — so this goes through `queryToWhere` into the SQL, which is what lets the
 * page keep paging in the database.
 *
 * 🔴 THAT IS NOT AN OPTIMISATION, IT IS THE ONLY WORKABLE SHAPE. `notification-service.ts` records
 * the measurement: Up & Down writes a row per settled round, "20 rows to one player in an hour,
 * and 360/day if a 3-minute chain runs". Reading a player's whole inbox into JS to search it —
 * the approach every other player surface in this campaign takes — would be tens of thousands of
 * rows on a page that a player opens to find one receipt.
 *
 * ⛔ `event` IS DELIBERATELY NOT SEARCHABLE. It is the internal emitter key (`bet.won`,
 * `kyc.approved`) and it is not rendered anywhere a player can see — offering it as a chip would
 * teach a vocabulary the screen never speaks (§L3), and matching it would return rows whose
 * visible words contain nothing the player typed.
 *
 * ⚠️ BOTH TITLE AND BODY, ACROSS ALL THREE LANGUAGES. The body is where the amount and the market
 * name live, so "won" finds a title and "Yanga" finds a body; and a Swahili reader may still type
 * an English team name, which is `POSITION_SEARCH`'s rule applied to a second surface.
 */
export const NOTIFICATION_SEARCH: EntitySchema = {
  fields: {
    title: { columns: ["titleEn", "titleSw", "titleZh"], kind: "text" },
    body: { columns: ["bodyEn", "bodySw", "bodyZh"], kind: "text" },
    kind: { columns: ["kind"], kind: "exact" },
    id: { columns: ["id"], kind: "exact" },
  },
  // What a bare token searches — every word a player can actually read on the row.
  default: ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"],
};

/**
 * ⭐ THE APPROVED ROSTER — /admin/agents, Agents tab. Separate from `AGENT_SEARCH` because it
 * filters a different shape (an agent, not an application) with a different useful default: an
 * officer looking for an agent holds their CODE or their handle, not a receipt reference.
 */
export const AGENT_ROSTER_SEARCH: EntitySchema = {
  fields: {
    name: { columns: ["handle"], kind: "text" },
    code: { columns: ["code"], kind: "text" },
    user: { columns: ["userId"], kind: "exact" },
  },
  default: ["handle", "code", "userId"],
  viewModel: true,
};

/** The names a surface should offer as clickable chips in the syntax help. */
export function fieldNames(s: EntitySchema): string[] {
  return Object.keys(s.fields);
}
