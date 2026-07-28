import type { ParsedQuery, SearchTerm } from "./query";
import type { EntitySchema } from "./fields";

/**
 * The SQL executor — turns one parsed query into a Prisma `where` fragment.
 *
 * Twin of `matchesQuery` in predicate.ts. The two are asserted equivalent by
 * scripts/search-grammar.test.mts; if you change the semantics of one, change
 * both or the guard fails. This is the failure mode `txn-filters.ts` was written
 * to avoid — two definitions of one truth, drifting.
 *
 * ── On regex ───────────────────────────────────────────────────────────────
 * `mode: "regex"` returns null here, deliberately: Prisma has no regex operator,
 * so it cannot be expressed as a `where` at all. A caller that supports regex must
 * take the raw-SQL path (`~*`) with the full envelope, and must NOT quietly fall
 * back to returning everything.
 *
 * The honest cost of that path, so nobody enables it casually: Postgres `~*` is
 * unindexable in the general case — pg_trgm GIN can only accelerate a regex when
 * trigrams are extractable from the pattern, which `.*` and alternations defeat.
 * So it is a sequential scan with a backtracking match per row. On `Transaction`
 * that can hold a pooled connection for minutes, and `admission.ts` sizes the bet
 * gate off that same pool — enough concurrent regex queries would stop the
 * platform accepting bets. Hence: admin-only, statement_timeout, forced LIMIT.
 */

/** Column names can only come from the closed registry in fields.ts, never a URL. */
type WhereLeaf = Record<string, unknown>;

function leafFor(col: string, term: SearchTerm, exact: boolean): WhereLeaf {
  return exact
    ? { [col]: { equals: term.value } }
    : { [col]: { contains: term.value, mode: "insensitive" } };
}

function orForTerm(term: SearchTerm, schema: EntitySchema): WhereLeaf | null {
  const spec = term.field ? schema.fields[term.field] : undefined;
  const cols = spec ? spec.columns : schema.default;
  if (!cols.length) return null;
  const exact = spec?.kind === "exact";
  const arms = cols.map((c) => leafFor(c, term, exact));
  return arms.length === 1 ? arms[0] : { OR: arms };
}

/**
 * Returns a Prisma `where` fragment, `{}` for an empty query, or `null` when the
 * query cannot be expressed in SQL (invalid, or regex). `null` means "return zero
 * rows" — never "return everything".
 */
export function queryToWhere(q: ParsedQuery, schema: EntitySchema): WhereLeaf | null {
  if (q.mode === "empty") return {};
  if (q.mode === "invalid") return null;
  if (q.mode === "regex") return null;

  const and: WhereLeaf[] = [];
  for (const t of q.terms) {
    const arm = orForTerm(t, schema);
    if (!arm) continue;
    and.push(t.negated ? { NOT: arm } : arm);
  }
  if (!and.length) return {};
  return and.length === 1 ? and[0] : { AND: and };
}
