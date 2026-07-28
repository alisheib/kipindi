import type { ParsedQuery, SearchTerm } from "./query";
import type { EntitySchema } from "./fields";

/**
 * The JS executor — used by the in-memory store, by every server component that
 * filters a list it has already loaded, and by the two client-side filters
 * (/live pulse grid, admin proposals).
 *
 * Its twin is `queryToWhere` in prisma-where.ts. The two MUST agree, and
 * scripts/search-grammar.test.mts asserts they do over a fixture matrix — that is
 * the whole reason this lives in one module. `txn-filters.ts` is the precedent:
 * one rule module read by both DALs. This extends it to the client as well, which
 * is why it lives in src/lib/search and not src/lib/server.
 */

/** A catastrophic pattern must not get an unbounded input. `resolutionEvidence`
 *  is @db.Text; the service layer caps it at 2000, but do not rely on that here. */
const MAX_HAYSTACK = 4000;

function haystack(
  fields: Record<string, string | null | undefined>,
  schema: EntitySchema,
  term: SearchTerm,
): string[] {
  if (term.field) {
    const spec = schema.fields[term.field];
    if (!spec) return [];
    return spec.columns.map((c) => (fields[c] ?? "").toLowerCase());
  }
  return schema.default.map((c) => (fields[c] ?? "").toLowerCase());
}

function hit(term: SearchTerm, parts: string[], schema: EntitySchema): boolean {
  const spec = term.field ? schema.fields[term.field] : undefined;
  // An `exact` field (id / enum / cuid) is matched whole, not by substring — a
  // `status:won` must not also match `status:withdrawn`.
  if (spec?.kind === "exact") return parts.some((p) => p === term.value);
  // A phrase must sit inside ONE field. Joining the fields first would let
  // "sports crypto" match a title ending in "sports" next to a "crypto" category —
  // a coincidence across a boundary, not a phrase.
  return parts.some((p) => p.includes(term.value));
}

export function matchesQuery(
  q: ParsedQuery,
  fields: Record<string, string | null | undefined>,
  schema: EntitySchema,
): boolean {
  if (q.mode === "empty") return true;
  // Fail CLOSED. A broken pattern must show nothing, never everything — on a
  // compliance surface "no filter applied" reads as "this record does not exist".
  if (q.mode === "invalid") return false;

  if (q.mode === "regex") {
    let re: RegExp;
    try {
      re = new RegExp(q.source, q.flags);
    } catch {
      return false;
    }
    const hay = schema.default
      .map((c) => fields[c] ?? "")
      .join(" ")
      .slice(0, MAX_HAYSTACK);
    return re.test(hay);
  }

  // Every term must be satisfied — order-independent AND. This is the half that
  // makes a long query work, and the half nine of the twelve old implementations
  // did not have.
  return q.terms.every((t) => {
    const found = hit(t, haystack(fields, schema, t), schema);
    return t.negated ? !found : found;
  });
}
