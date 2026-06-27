/**
 * Admin pagination — now a thin alias over the shared platform pager
 * (src/components/ui/pagination) so admin tables and player lists use ONE
 * component. Existing admin imports (AdminPagination, parsePage, buildBaseHref,
 * PER_PAGE) keep working unchanged.
 */
export { Pagination as AdminPagination, parsePage, buildBaseHref, PER_PAGE } from "@/components/ui/pagination";
