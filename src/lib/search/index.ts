/**
 * One search grammar, two executors, one field registry.
 *
 * Isomorphic on purpose — /live and /admin/proposals filter on the client, so
 * this cannot live under src/lib/server. Import from "@/lib/search".
 */
export { parseQuery, describeQuery, isSafeRegex, MAX_QUERY_LEN, MAX_REGEX_LEN } from "./query";
export type { ParsedQuery, SearchTerm } from "./query";
export { matchesQuery } from "./predicate";
export { queryToWhere } from "./prisma-where";
export {
  MARKET_SEARCH, USER_SEARCH, TXN_SEARCH, AI_USAGE_SEARCH,
  POLL_SEARCH, CANDIDATE_SEARCH, PROPOSAL_SEARCH, POSITION_SEARCH, MY_TXN_SEARCH, UD_ROUND_SEARCH,
  // ⛔ The PLAYER board's schema — see its header for why it is not `PROPOSAL_SEARCH`.
  BOARD_PROPOSAL_SEARCH,
  // ⭐ The one player schema that is NOT a view model — it goes into the SQL. See its header.
  NOTIFICATION_SEARCH,
  fieldNames, allColumns,
} from "./fields";
export type { EntitySchema, FieldSpec, FieldKind } from "./fields";
