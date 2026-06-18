/**
 * Server-rendered pagination strip for admin tables.
 * Uses URL searchParams — no client JS needed.
 */
import { I } from "@/components/ui/glyphs";

export const PER_PAGE = 20;

export function AdminPagination({
  total,
  page,
  perPage = PER_PAGE,
  baseHref,
  param = "page",
}: {
  total: number;
  page: number;
  perPage?: number;
  /** Base URL including existing query params (e.g. "/admin/players?q=foo&status=ACTIVE"). Page param is appended. */
  baseHref: string;
  /** Page query-param name. Override (e.g. "txpage") when one page hosts several
   *  independently-paginated tables so each keeps its own page state. */
  param?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, page), totalPages);
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  // Build page URL — append or replace &<param>=N
  const href = (p: number) => {
    const sep = baseHref.includes("?") ? "&" : "?";
    return `${baseHref}${sep}${param}=${p}`;
  };

  // Show at most 7 page buttons around the current page
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safePage > 3) pages.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase = "inline-flex items-center justify-center h-8 min-w-[32px] px-2 rounded-md font-mono text-[11px] tracking-[0.10em] transition-colors";
  const btnActive = "border border-brand-500 bg-brand-500/15 text-brand-300 font-bold";
  const btnInactive = "border border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text";
  const btnDisabled = "border border-border bg-bg-elevated text-text-subtle/40 pointer-events-none";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
        {((safePage - 1) * perPage + 1).toLocaleString()}–{Math.min(safePage * perPage, total).toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <a href={hasPrev ? href(safePage - 1) : undefined} className={`${btnBase} ${hasPrev ? btnInactive : btnDisabled}`} aria-label="Previous page">
          <I.chevronLeft s={14} />
        </a>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-text-subtle">…</span>
          ) : (
            <a key={p} href={href(p)} className={`${btnBase} ${p === safePage ? btnActive : btnInactive}`}>
              {p}
            </a>
          ),
        )}
        <a href={hasNext ? href(safePage + 1) : undefined} className={`${btnBase} ${hasNext ? btnInactive : btnDisabled}`} aria-label="Next page">
          <I.chevronRight s={14} />
        </a>
      </div>
    </div>
  );
}

/** Helper: parse page from searchParams, clamp to valid range. */
export function parsePage(raw: string | undefined, total: number, perPage = PER_PAGE): number {
  const n = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  const max = Math.max(1, Math.ceil(total / perPage));
  return Math.min(n, max);
}

/**
 * Helper: build baseHref from current searchParams, excluding the page param.
 * Pass `pageParam` (e.g. "txpage") on multi-table pages so the OTHER tables'
 * page/sort/dir state is preserved while this table's page resets.
 */
export function buildBaseHref(
  path: string,
  params: Record<string, string | undefined>,
  pageParam = "page",
): string {
  const entries = Object.entries(params).filter(([k, v]) => k !== pageParam && v);
  if (entries.length === 0) return path;
  return `${path}?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")}`;
}
