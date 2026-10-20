import type { StoredWeek, WeekVisibility } from "@/lib/server/maswali-dal";
import { WEEK_STATES, type WeekState } from "@/lib/maswali-week-label";
import { matchesQuery, parseQuery, MAX_QUERY_LEN, type EntitySchema } from "@/lib/search";

/** URL state for the officer's week list. Only these values can change the read or enter a link. */
export type WeekListSort = "week" | "line" | "state" | "closes" | "tickets" | "settled";
export type WeekListQuery = {
  q: string;
  state: WeekState | "";
  line: WeekVisibility | "";
  sort: WeekListSort;
  dir: "asc" | "desc";
};

const SORTS: readonly WeekListSort[] = ["week", "line", "state", "closes", "tickets", "settled"];
const LINES: readonly WeekVisibility[] = ["PUBLIC", "DRIVE"];
const CODE_SEARCH: EntitySchema = { fields: { code: { columns: ["code"], kind: "text" } }, default: ["code"], viewModel: true };
const first = (value: string | string[] | undefined) => typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";

export function parseWeekListQuery(sp: Record<string, string | string[] | undefined>): WeekListQuery {
  const state = first(sp.state);
  const line = first(sp.line);
  const sort = first(sp.sort);
  const dir = first(sp.dir);
  return {
    q: first(sp.q).trim().slice(0, MAX_QUERY_LEN),
    state: WEEK_STATES.includes(state as WeekState) ? state as WeekState : "",
    line: LINES.includes(line as WeekVisibility) ? line as WeekVisibility : "",
    sort: SORTS.includes(sort as WeekListSort) ? sort as WeekListSort : "week",
    dir: dir === "asc" || dir === "desc" ? dir : "desc",
  };
}

/** Reuse the same validated state for sort links and the pager; changing a filter or sort drops page. */
export function weekListParams(query: WeekListQuery): Record<string, string | undefined> {
  return {
    q: query.q || undefined,
    state: query.state || undefined,
    line: query.line || undefined,
    sort: query.sort === "week" ? undefined : query.sort,
    dir: query.dir === "desc" ? undefined : query.dir,
  };
}

type ListWeek = Pick<StoredWeek, "id" | "code" | "seq" | "visibility" | "state" | "closesAt" | "ticketCount" | "settledAt">;

/** Select from every stored week before slicing; rowOf only reads the questions on the selected page. */
export function selectWeekPage<T extends ListWeek>(
  all: readonly T[], askedPage: number, perPage: number, query: WeekListQuery,
): { weeks: T[]; total: number; allTotal: number; page: number } {
  const parsed = parseQuery(query.q, { fields: ["code"] });
  const filtered = all.filter((w) =>
    matchesQuery(parsed, { code: w.code }, CODE_SEARCH) &&
    (!query.state || w.state === query.state) &&
    (!query.line || w.visibility === query.line));
  const value = (w: T): string | number | null => {
    switch (query.sort) {
      case "week": return w.seq;
      case "line": return w.visibility;
      case "state": return WEEK_STATES.indexOf(w.state);
      case "closes": return w.closesAt;
      case "tickets": return w.ticketCount;
      case "settled": return w.settledAt;
    }
  };
  const sorted = [...filtered].sort((a, b) => {
    const av = value(a), bv = value(b);
    // Unsettled weeks stay after dated ones in either direction.
    if (av === null || bv === null) return av === bv ? b.seq - a.seq : av === null ? 1 : -1;
    const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return (query.dir === "asc" ? order : -order) || b.seq - a.seq || a.id.localeCompare(b.id);
  });
  const size = Number.isFinite(perPage) && perPage > 0 ? Math.floor(perPage) : 1;
  const last = Math.max(1, Math.ceil(sorted.length / size));
  const page = Number.isFinite(askedPage) ? Math.min(Math.max(1, Math.floor(askedPage)), last) : 1;
  return { weeks: sorted.slice((page - 1) * size, page * size), total: sorted.length, allTotal: all.length, page };
}
