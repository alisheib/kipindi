/**
 * A BET WAITING TO BE PLACED, CARRIED IN A LINK — `?bet=mkt_x.YES.5000` (the Vodacom plan S3, `docs/VODACOM-PLAN.md`
 * §3.1). A guest taps "NDIO" on a card, signs in or registers, and lands back on the sheet with their side (and, from
 * THEIR OWN tap, their stake) already chosen.
 *
 * THE GRAMMAR — `<id>.<SIDE>[.<stake>]`:
 *   · a market   `mkt_<alnum>` with YES | NO      → `mkt_b040971a5824517186c3.YES.5000`
 *   · a round    `udr_<alnum>` with UP | DOWN     → `udr_4f1c09aa2d.UP.5000`
 *   · the stake is a whole number of shillings, 1–9 digits, no leading zero; absent ⇒ the market's minimum.
 * Anything else is not a pending bet (null) — never a guess at what was meant.
 *
 * ⭐ THE LEGACY `?side=` STILL WORKS on a market page: the side is locked and the stake is the minimum.
 *
 * ⛔ A SHARED LINK CAN NEVER SET SOMEONE'S STAKE. The stake in a URL is only a claim. It is used only when THIS browser
 * wrote a matching marker into sessionStorage, less than 24 hours ago, at the moment the bet was chosen
 * (`stakeFromUrl`); any other link — a forwarded one, a crafted one — opens the sheet at the minimum. The marker also
 * carries the attribution the link arrived with (`ref`, `invite`, `utm_*`), so the rebuilt URL can drop it.
 *
 * ⛔ THE URL IS REBUILT FROM THE PATH AND THE BET ONLY (`pendingBetUrl`): every other parameter is dropped, and a path
 * that is not same-origin is replaced by "/" (`isSafePath`, the login form's own rule).
 *
 * Pure: storage is the caller's (the key and the TTL are here); this module only reads and writes strings.
 */
import { isSafePath } from "@/lib/safe-next";

export type PendingBet =
  | { kind: "market"; id: string; side: "YES" | "NO"; stake: number | null }
  | { kind: "round"; id: string; side: "UP" | "DOWN"; stake: number | null };

/** The sessionStorage key the marker lives under. */
export const PENDING_BET_KEY = "kp-pending-bet";
/** A marker older than this is ignored: the stake falls back to the minimum. */
export const PENDING_BET_TTL_MS = 24 * 60 * 60 * 1000;
/** A marker stamped further in the future than this is not ours (a clock cannot drift a minute in a tab's life). */
const FUTURE_TOLERANCE_MS = 60 * 1000;

const MARKET_ID = /^mkt_[A-Za-z0-9]{1,64}$/;
const ROUND_ID = /^udr_[A-Za-z0-9]{1,64}$/;
const STAKE = /^[1-9][0-9]{0,8}$/;

/** `?bet=` → the bet it names, or null. */
export function parseBetParam(raw: unknown): PendingBet | null {
  if (typeof raw !== "string" || raw.length > 90) return null;
  const parts = raw.split(".");
  if (parts.length < 2 || parts.length > 3) return null;
  const [id, side, stakeRaw] = parts;
  let stake: number | null = null;
  if (stakeRaw !== undefined) {
    if (!STAKE.test(stakeRaw)) return null;
    stake = Number(stakeRaw);
  }
  if (MARKET_ID.test(id) && (side === "YES" || side === "NO")) return { kind: "market", id, side, stake };
  if (ROUND_ID.test(id) && (side === "UP" || side === "DOWN")) return { kind: "round", id, side, stake };
  return null;
}

/** The bet as the link writes it — the exact inverse of `parseBetParam`. */
export function formatBetParam(b: PendingBet): string {
  return b.stake === null ? `${b.id}.${b.side}` : `${b.id}.${b.side}.${b.stake}`;
}

/**
 * The pending bet a page was opened with: `?bet=` when it is present and valid; else the legacy `?side=YES|NO` on a
 * market's own page (`/markets/<id>`), side locked, stake null (= the minimum). Null otherwise.
 */
export function pendingBetFrom(path: string, search: URLSearchParams | Record<string, string | undefined>): PendingBet | null {
  const get = (k: string): string | null =>
    search instanceof URLSearchParams ? search.get(k) : typeof search[k] === "string" ? (search[k] as string) : null;
  const bet = get("bet");
  if (bet !== null) return parseBetParam(bet);
  const side = get("side");
  if (side !== "YES" && side !== "NO") return null;
  const seg = (path.split("?")[0] ?? "").split("/");
  if (seg.length !== 3 || seg[0] !== "" || seg[1] !== "markets" || !MARKET_ID.test(seg[2])) return null;
  return { kind: "market", id: seg[2], side, stake: null };
}

/** The link back to the sheet: the path (same-origin, or "/") plus `?bet=` — every other parameter dropped. */
export function pendingBetUrl(path: string, bet: PendingBet): string {
  const bare = path.split("?")[0].split("#")[0];
  return `${isSafePath(bare) ? bare : "/"}?bet=${formatBetParam(bet)}`;
}

/* ─── The marker: proof that THIS browser chose the stake ─────────────────────────────────────────────────────── */

export type PendingBetMarker = {
  /** The bet exactly as `formatBetParam` wrote it. */
  bet: string;
  /** When it was chosen (ms since epoch). */
  at: number;
  ref?: string;
  invite?: string;
  utm?: Record<string, string>;
};

const CODE = /^[A-Za-z0-9_-]{1,64}$/;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const UTM_VALUE = /^[A-Za-z0-9._~ -]{1,100}$/;

/** The attribution a link arrived with — only `ref`, `invite` and the five `utm_*`, each in its own safe shape. */
export function attributionFrom(search: URLSearchParams): Pick<PendingBetMarker, "ref" | "invite" | "utm"> {
  const out: Pick<PendingBetMarker, "ref" | "invite" | "utm"> = {};
  const ref = search.get("ref");
  if (ref && CODE.test(ref)) out.ref = ref;
  const invite = search.get("invite");
  if (invite && CODE.test(invite)) out.invite = invite;
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = search.get(k);
    if (v && UTM_VALUE.test(v)) utm[k] = v;
  }
  if (Object.keys(utm).length > 0) out.utm = utm;
  return out;
}

/** The marker to store when a bet is chosen, as the string sessionStorage holds. */
export function writeMarker(bet: PendingBet, nowMs: number, attribution: Pick<PendingBetMarker, "ref" | "invite" | "utm"> = {}): string {
  const m: PendingBetMarker = { bet: formatBetParam(bet), at: nowMs, ...attribution };
  return JSON.stringify(m);
}

/** A stored marker, read defensively: anything malformed, expired or future-dated is null. */
export function readMarker(raw: string | null | undefined, nowMs: number): PendingBetMarker | null {
  if (typeof raw !== "string" || raw.length > 2_000) return null;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || typeof v !== "object") return null;
  const m = v as Record<string, unknown>;
  if (typeof m.bet !== "string" || parseBetParam(m.bet) === null) return null;
  if (typeof m.at !== "number" || !Number.isFinite(m.at)) return null;
  if (m.at > nowMs + FUTURE_TOLERANCE_MS || nowMs - m.at >= PENDING_BET_TTL_MS) return null;
  const out: PendingBetMarker = { bet: m.bet, at: m.at };
  if (typeof m.ref === "string" && CODE.test(m.ref)) out.ref = m.ref;
  if (typeof m.invite === "string" && CODE.test(m.invite)) out.invite = m.invite;
  if (m.utm && typeof m.utm === "object") {
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const val = (m.utm as Record<string, unknown>)[k];
      if (typeof val === "string" && UTM_VALUE.test(val)) utm[k] = val;
    }
    if (Object.keys(utm).length > 0) out.utm = utm;
  }
  return out;
}

/**
 * ⭐ THE STAKE THE SHEET MAY PREFILL: the URL's stake only when this browser's own marker names the SAME bet (id, side
 * and stake) and is under 24 hours old; otherwise null — the sheet opens at the market's minimum.
 */
export function stakeFromUrl(bet: PendingBet | null, markerRaw: string | null | undefined, nowMs: number): number | null {
  if (!bet || bet.stake === null) return null;
  const m = readMarker(markerRaw, nowMs);
  return m && m.bet === formatBetParam(bet) ? bet.stake : null;
}
