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
  return (
    <th className={`${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}>
      <Link
        href={`${baseHref}?${params.toString()}` as never}
        className={`inline-flex items-center gap-1 hover:text-text transition-colors ${isActive ? "text-text" : ""}`}
        scroll={false}
      >
        {label}
        <span className={`text-brand-300 ${isActive ? "" : "opacity-0"}`} aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>
      </Link>
    </th>
  );
}
