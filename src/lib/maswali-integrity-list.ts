import { matchesQuery, parseQuery, MAX_QUERY_LEN, type EntitySchema } from "@/lib/search";

type Direction = "asc" | "desc";
type HeldSort = "week" | "ticket" | "holder" | "share" | "decision";
type WinnerSort = "week" | "ticket" | "share";
type SealSort = "week";
type HeldDecision = "" | "pending" | "forfeited";
type WinnerReview = "" | "flagged" | "clear";
type SealState = "" | "SETTLED" | "VOIDED";

export type IntegrityListQuery = {
  held: { q: string; decision: HeldDecision; sort: HeldSort; dir: Direction; page: number };
  winners: { q: string; review: WinnerReview; sort: WinnerSort; dir: Direction; page: number };
  seals: { q: string; state: SealState; sort: SealSort; dir: Direction; page: number };
};

const first = (value: string | string[] | undefined) => typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;
const pageOf = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1;
const qOf = (value: string) => value.trim().slice(0, MAX_QUERY_LEN);
const dirOf = (value: string): Direction => value === "asc" ? "asc" : "desc";

export function parseIntegrityListQuery(sp: Record<string, string | string[] | undefined>): IntegrityListQuery {
  return {
    held: {
      q: qOf(first(sp.hq)), decision: oneOf(first(sp.hdecision), ["", "pending", "forfeited"] as const, ""),
      sort: oneOf(first(sp.hsort), ["week", "ticket", "holder", "share", "decision"] as const, "week"),
      dir: dirOf(first(sp.hdir)), page: pageOf(first(sp.hpage)),
    },
    winners: {
      q: qOf(first(sp.wq)), review: oneOf(first(sp.wreview), ["", "flagged", "clear"] as const, ""),
      sort: oneOf(first(sp.wsort), ["week", "ticket", "share"] as const, "week"),
      dir: dirOf(first(sp.wdir)), page: pageOf(first(sp.wpage)),
    },
    seals: {
      q: qOf(first(sp.sq)), state: oneOf(first(sp.sstate), ["", "SETTLED", "VOIDED"] as const, ""),
      sort: "week", dir: dirOf(first(sp.sdir)), page: pageOf(first(sp.spage)),
    },
  };
}

/** These are the only values passed to sort links, filter forms and the three independent pagers. */
export function integrityListParams(query: IntegrityListQuery): Record<string, string | undefined> {
  return {
    hq: query.held.q || undefined,
    hdecision: query.held.decision || undefined,
    hsort: query.held.sort === "week" ? undefined : query.held.sort,
    hdir: query.held.dir === "desc" ? undefined : query.held.dir,
    hpage: query.held.page > 1 ? String(query.held.page) : undefined,
    wq: query.winners.q || undefined,
    wreview: query.winners.review || undefined,
    wsort: query.winners.sort === "week" ? undefined : query.winners.sort,
    wdir: query.winners.dir === "desc" ? undefined : query.winners.dir,
    wpage: query.winners.page > 1 ? String(query.winners.page) : undefined,
    sq: query.seals.q || undefined,
    sstate: query.seals.state || undefined,
    sdir: query.seals.dir === "desc" ? undefined : query.seals.dir,
    spage: query.seals.page > 1 ? String(query.seals.page) : undefined,
  };
}

type Result<T> = { rows: T[]; total: number; allTotal: number; page: number };
function pageRows<T>(all: readonly T[], selected: T[], asked: number, perPage: number): Result<T> {
  const size = Number.isFinite(perPage) && perPage > 0 ? Math.floor(perPage) : 1;
  const last = Math.max(1, Math.ceil(selected.length / size));
  const page = Number.isFinite(asked) ? Math.min(Math.max(1, Math.floor(asked)), last) : 1;
  return { rows: selected.slice((page - 1) * size, page * size), total: selected.length, allTotal: all.length, page };
}
function sorted<T>(rows: T[], get: (row: T) => string | number | boolean | null, dir: Direction): T[] {
  return rows.map((row, index) => ({ row, index })).sort((a, b) => {
    const av = get(a.row), bv = get(b.row);
    if (av === null || bv === null) return av === bv ? a.index - b.index : av === null ? 1 : -1;
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return (dir === "asc" ? cmp : -cmp) || a.index - b.index;
  }).map(({ row }) => row);
}

const HELD_SEARCH: EntitySchema = { fields: {
  week: { columns: ["weekCode"], kind: "text" }, ticket: { columns: ["serial"], kind: "text" },
  holder: { columns: ["holder"], kind: "text" },
}, default: ["weekCode", "serial", "holder"], viewModel: true };
const WINNER_SEARCH: EntitySchema = { fields: {
  week: { columns: ["code"], kind: "text" }, ticket: { columns: ["serial"], kind: "text" },
}, default: ["code", "serial"], viewModel: true };
const SEAL_SEARCH: EntitySchema = { fields: { week: { columns: ["code"], kind: "text" } }, default: ["code"], viewModel: true };

export type HeldListRow = { weekCode: string; weekSeq: number; serial: string; holder: string; payout: number; forfeited: boolean };
export function selectHeldShares<T extends HeldListRow>(all: readonly T[], query: IntegrityListQuery["held"], perPage: number): Result<T> {
  const parsed = parseQuery(query.q, { fields: ["week", "ticket", "holder"] });
  const filtered = all.filter((row) =>
    matchesQuery(parsed, { weekCode: row.weekCode, serial: row.serial, holder: row.holder }, HELD_SEARCH) &&
    (!query.decision || (query.decision === "forfeited") === row.forfeited));
  const ordered = sorted(filtered, (row) => {
    switch (query.sort) {
      case "week": return row.weekSeq;
      case "ticket": return row.serial;
      case "holder": return row.holder.toLowerCase();
      case "share": return row.payout;
      case "decision": return row.forfeited;
    }
  }, query.dir);
  return pageRows(all, ordered, query.page, perPage);
}

export type WinnerListTicket = { serial: string; payout: number | null; frozenReason: string | null };
export type WinnerListRow = { ticket: WinnerListTicket; code: string; seq: number };
export function selectWinnerTickets<T extends WinnerListRow>(all: readonly T[], query: IntegrityListQuery["winners"], perPage: number): Result<T> {
  const parsed = parseQuery(query.q, { fields: ["week", "ticket"] });
  const filtered = all.filter((row) =>
    matchesQuery(parsed, { code: row.code, serial: row.ticket.serial }, WINNER_SEARCH) &&
    (!query.review || (query.review === "flagged") === !!row.ticket.frozenReason));
  const ordered = sorted(filtered, (row) => query.sort === "week" ? row.seq : query.sort === "ticket" ? row.ticket.serial : row.ticket.payout, query.dir);
  return pageRows(all, ordered, query.page, perPage);
}

export type SealListWeek = { code: string; seq: number; state: string };
export function selectSealWeeks<T extends SealListWeek>(all: readonly T[], query: IntegrityListQuery["seals"], perPage: number): Result<T> {
  const parsed = parseQuery(query.q, { fields: ["week"] });
  const filtered = all.filter((week) => matchesQuery(parsed, { code: week.code }, SEAL_SEARCH) && (!query.state || week.state === query.state));
  return pageRows(all, sorted(filtered, (week) => week.seq, query.dir), query.page, perPage);
}
