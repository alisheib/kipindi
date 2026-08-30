/**
 * Shared admin table sorting — server-side, URL-driven (?sort=&dir=), so sorted
 * results are SSR-rendered, shareable, and survive refresh (same model as the
 * players table that pioneered the pattern). Pairs with AdminPagination.
 *
 *   const { sort, dir } = parseSort(sp, ["amount", "time"] as const, "time");
 *   const sorted = applySort(rows, sort, dir, {
 *     amount: (r) => Math.abs(r.amount),
 *     time:   (r) => r.createdAt,
 *   });
 *   // then slice with parsePage / render <SortTh ... /> headers
 */
import Link from "next/link";

export type SortDir = "asc" | "desc";

/**
 * Validate ?sort against an allow-list (typo/injection-safe) + ?dir.
 * `prefix` namespaces the params (e.g. "tx" → ?txsort/?txdir) so several tables
 * on one page sort independently.
 */
export function parseSort<K extends string>(
  sp: Record<string, string | undefined>,
  allowed: readonly K[],
  def: K,
  defDir: SortDir = "desc",
  prefix = "",
): { sort: K; dir: SortDir } {
  const rawSort = sp[`${prefix}sort`];
  const rawDir = sp[`${prefix}dir`];
  const sort = (allowed as readonly string[]).includes(rawSort ?? "") ? (rawSort as K) : def;
  const dir: SortDir = rawDir === "asc" ? "asc" : rawDir === "desc" ? "desc" : defDir;
  return { sort, dir };
}

/** Stable sort by a keyed accessor; numbers compare numerically, else by string. */
export function applySort<T>(
  rows: T[],
  sort: string,
  dir: SortDir,
  accessors: Record<string, (r: T) => string | number | null | undefined>,
): T[] {
  const acc = accessors[sort];
  if (!acc) return rows;
  const out = [...rows].sort((a, b) => {
    const av = acc(a) ?? "";
    const bv = acc(b) ?? "";
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
  return out;
}

/**
 * SortBtn — the CLIENT twin of <SortTh>, for a queue that sorts in local state
 * because its rows mutate optimistically (moderation, proposals).
 *
 * ⭐ CONSOLIDATION NOTE (stage 9b, 2026-08-21). This was typed out twice —
 * `moderation-client.tsx` and `admin-proposals-client.tsx` held byte-identical
 * copies differing only in the name of their field union — each carrying the
 * same comment claiming to match <SortTh>. Two copies of "matches SortTh" is two
 * things that can stop matching it. The generic parameter is what let one
 * definition serve both.
 *
 * ⛔ The arrow keeps its `opacity-0` (not `hidden`) on the inactive column: the
 * glyph still occupies its box, so the header does not jump sideways when the
 * sort moves — same reason <SortTh> does it.
 *
 * ⭐ DG-A-08 (2026-08-30) — `min-h-[44px]`, THE SAME LITERAL <SortTh> CARRIES. This
 * rendered a 14px box (`text-micro` is 10px/14px with no padding) against §A2's 40px
 * floor, on the control that reorders a moderation queue. It does NOT take the kit
 * `<Button>`: the twin invariant above is the whole reason this component exists, and
 * <SortTh> cannot be a `.btn` — it is an anchor inside a `<th>` that must keep the
 * header's own type. Giving one of the twins a button body is how they stop matching.
 * §K1 forbids a height utility only ON a `.btn`, and neither of these is one.
 */
export function SortBtn<K extends string>({
  field,
  label,
  current,
  dir,
  onSort,
}: {
  field: K;
  label: string;
  current: K;
  dir: SortDir;
  onSort: (f: K) => void;
}) {
  const isActive = current === field;
  return (
    <button type="button" onClick={() => onSort(field)} className={`inline-flex min-h-[44px] items-center gap-1 font-mono text-micro uppercase tracking-[0.1em] hover:text-text transition-colors ${isActive ? "text-text" : "text-text-subtle"}`}>
      {label}
      <span className={`text-brand-300 ${isActive ? "" : "opacity-0"}`} aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>
    </button>
  );
}

/**
 * Sortable table header cell. Clicking toggles dir on the active column (and
 * resets to the page-1 view by dropping ?page). Preserves all other query
 * params (filters) so sorting composes with filtering.
 */
export function SortTh({
  field,
  label,
  current,
  dir,
  sp,
  baseHref,
  align = "left",
  className,
  prefix = "",
}: {
  field: string;
  label: string;
  current: string;
  dir: SortDir;
  sp: Record<string, string | undefined>;
  baseHref: string;
  align?: "left" | "right";
  className?: string;
  /** Namespace the sort/dir/page params (e.g. "tx") so this header controls
   *  only its own table on a multi-table page. */
  prefix?: string;
}) {
  const sortKey = `${prefix}sort`;
  const dirKey = `${prefix}dir`;
  const pageKey = `${prefix}page`;
  const isActive = current === field;
  const nextDir: SortDir = isActive && dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== sortKey && k !== dirKey && k !== pageKey) params.set(k, v);
  }
  params.set(sortKey, field);
  params.set(dirKey, nextDir);
  /**
   * ⭐ `aria-sort` (stage 9b, 2026-08-21). It was never emitted, and two things
   * depended on it:
   *   1. A screen-reader user had NO way to know which column a sorted admin
   *      table was sorted by, or in which direction. The arrow glyph below is
   *      `aria-hidden` (correctly — it is a picture of the state, not the
   *      state), so that information existed on screen and nowhere else.
   *   2. `globals.css` styles `.admin-tbl th[aria-sort]` — pointer cursor, hover
   *      ink, brand-300 on the sorted column — and all four of those rules were
   *      DEAD CSS, matching nothing in the product, because no `<th>` in the
   *      console carried the attribute.
   *
   * `"none"` on the unsorted columns is deliberate: it is what makes the first
   * of those rules (the whole header cell reads as sortable) apply at all.
   * ⛔ It does NOT repaint the sorted column — `th[aria-sort="descending"]` sets
   * the TH's `color`, and the anchor inside already carries `text-text` when
   * active, so the anchor's own colour still wins. The only visible change is
   * the cursor, and hovering the cell's padding now lifting the label the same
   * way hovering the label already did.
   */
  return (
    <th
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
    >
      <Link
        href={`${baseHref}?${params.toString()}` as never}
        className={`group inline-flex min-h-[44px] items-center gap-1 hover:text-text transition-colors ${isActive ? "text-text" : ""}`}
        scroll={false}
      >
        {label}
        {/* ⭐ DG-A-17 — AN UNSORTED SORTABLE COLUMN NOW SAYS SO. The arrow was `opacity-0` on
            every inactive column, which reserved its width (right — the label must not jump when
            you sort) but left the column with NO affordance at all: nothing distinguished a
            sortable header from a fixed one until you happened to hover and the cursor changed.
            It fades in on hover instead of being permanently visible, so ten sortable columns do
            not become ten arrows competing with the data. ⛔ Still `aria-hidden`: it is a picture
            of the state, and `aria-sort` on the th is the state. */}
        <span
          className={`text-brand-300 transition-opacity ${isActive ? "" : "opacity-0 group-hover:opacity-60"}`}
          aria-hidden
        >{dir === "asc" ? "↑" : "↓"}</span>
      </Link>
    </th>
  );
}
