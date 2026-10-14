/** Account-partitioned request recovery. Unplaced selections keep their separate 24-hour auth bridge. */
import { parseBetParam, PENDING_BET_KEY, PENDING_BET_MAX_BYTES } from "./pending-bet";
import { isIntentKey, type Quote } from "./sheet-state";
import type { StoredIntent } from "./sheet-storage";

export const SHEET_OWNER_PREFIX = "kp-sheet-intents:v2:";
export const SHEET_LEGACY_KEY = "kp-sheet-intents:legacy:v1";
export const SHEET_RECOVERY_MAX_BYTES = PENDING_BET_MAX_BYTES;
export type TabStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type KeyReceipt = { ownerId: string; positionId: string; quote: Quote };
type Archive = { v: 1; records: string[]; resolved: Record<string, KeyReceipt> };
const ownerValid = (owner: unknown): owner is string => typeof owner === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(owner);
export const sheetOwnerKey = (owner: string) => ownerValid(owner) ? SHEET_OWNER_PREFIX + owner : null;
const sameQuote = (a: Quote, b: Quote) => a.marketId === b.marketId && a.side === b.side && a.stake === b.stake;
const quoteValid = (q: unknown): q is Quote => !!q && typeof q === "object" && /^mkt_[A-Za-z0-9]{1,64}$/.test((q as Quote).marketId)
  && ((q as Quote).side === "YES" || (q as Quote).side === "NO") && Number.isSafeInteger((q as Quote).stake) && (q as Quote).stake > 0;
const entryValid = (e: unknown): e is StoredIntent => !!e && typeof e === "object" && quoteValid((e as StoredIntent).quote)
  && isIntentKey((e as StoredIntent).key) && Number.isFinite((e as StoredIntent).at) && (e as StoredIntent).at >= 0;
const parse = (raw: string | null): unknown => {
  if (raw === null) return null;
  if (raw.length > SHEET_RECOVERY_MAX_BYTES) throw new Error("Recovery envelope exceeds its bound");
  return JSON.parse(raw);
};

/** A request key has no selection TTL: age alone says nothing about whose money moved. */
export function ownedSheetIntents(raw: string | null, owner: string): StoredIntent[] {
  if (!ownerValid(owner)) throw new Error("Invalid recovery owner");
  const v = parse(raw) as { v?: unknown; owner?: unknown; pending?: unknown } | null;
  if (v === null) return [];
  if (v.v !== 2 || v.owner !== owner || !Array.isArray(v.pending) || !v.pending.every(entryValid)) throw new Error("Unreadable account recovery");
  const keys = new Set<string>(), questions = new Set<string>();
  for (const e of v.pending as StoredIntent[]) {
    const question = `${e.quote.marketId}.${e.quote.side}`;
    // The host has one unresolved request per question/side. Refuse an ambiguous historic store rather than lose a key.
    if (keys.has(e.key) || questions.has(question)) throw new Error("Duplicate recovery identity");
    keys.add(e.key); questions.add(question);
  }
  return v.pending;
}

/** Legacy parsing deliberately ignores readMarker's 24-hour selection expiry. Nothing assigns these keys an owner. */
export function legacySheetIntents(raw: string | null): StoredIntent[] {
  const v = parse(raw) as { bet?: unknown; at?: unknown; k?: unknown; pending?: unknown } | null;
  if (v === null) return [];
  if (typeof v !== "object" || Array.isArray(v) || (Object.prototype.hasOwnProperty.call(v, "pending") && !Array.isArray(v.pending))) throw new Error("Unreadable legacy envelope");
  const candidates = [v, ...(Array.isArray(v.pending) ? v.pending : [])] as Array<{ bet?: unknown; at?: unknown; k?: unknown }>;
  const entries = new Map<string, StoredIntent>();
  for (const e of candidates) {
    if (e.k === undefined) continue;
    const b = parseBetParam(e.bet);
    if (!b || b.kind !== "market" || b.stake === null || !isIntentKey(e.k) || typeof e.at !== "number" || !Number.isFinite(e.at) || e.at < 0) throw new Error("Unreadable legacy request identity");
    const quote: Quote = {marketId: b.id, side: b.side, stake: b.stake}, prior = entries.get(e.k);
    if (prior && !sameQuote(prior.quote, quote)) throw new Error("Conflicting legacy request identity");
    entries.set(e.k, {quote, key: e.k, at: Math.min(prior?.at ?? e.at, e.at)});
  }
  return [...entries.values()];
}

function archiveOf(raw: string | null): Archive {
  const v = parse(raw) as Archive | null;
  if (v === null) return {v: 1, records: [], resolved: {}};
  if (v.v !== 1 || !Array.isArray(v.records) || !v.records.every((r) => typeof r === "string") || !v.resolved || typeof v.resolved !== "object" || Array.isArray(v.resolved)) throw new Error("Unreadable legacy quarantine");
  const tuples = new Map<string, Quote>();
  for (const raw of v.records) for (const e of legacySheetIntents(raw)) {
    const prior = tuples.get(e.key);
    if (prior && !sameQuote(prior, e.quote)) throw new Error("Conflicting quarantined request identity");
    tuples.set(e.key, e.quote);
  }
  for (const [key, proof] of Object.entries(v.resolved)) if (!isIntentKey(key) || !ownerValid(proof?.ownerId) || typeof proof?.positionId !== "string" || !proof.positionId || proof.positionId.length > 128 || !quoteValid(proof.quote)) throw new Error("Unreadable legacy receipt proof");
  return v;
}
function persist(storage: TabStorage, key: string, value: string): boolean {
  if (value.length > SHEET_RECOVERY_MAX_BYTES) return false;
  const before = storage.getItem(key);
  try {
    storage.setItem(key, value);
    if (storage.getItem(key) === value) return true;
  } catch { /* the original bytes remain authoritative; try to restore any partial write */ }
  try { if (before === null) storage.removeItem(key); else storage.setItem(key, before); } catch { /* still fail closed */ }
  return false;
}

/** Preserve the complete old envelope before any shared-marker writer can replace it. */
export function quarantineLegacySheet(storage: TabStorage): boolean {
  try {
    const raw = storage.getItem(PENDING_BET_KEY);
    const archive = archiveOf(storage.getItem(SHEET_LEGACY_KEY));
    if (legacySheetIntents(raw).length === 0 || raw === null || archive.records.includes(raw)) return true;
    const next = JSON.stringify({...archive, records: [...archive.records, raw]});
    archiveOf(next);
    return persist(storage, SHEET_LEGACY_KEY, next);
  } catch { return false; }
}
export function unresolvedLegacySheet(storage: TabStorage): StoredIntent[] {
  const archive = archiveOf(storage.getItem(SHEET_LEGACY_KEY)), seen = new Set<string>();
  return archive.records.flatMap(legacySheetIntents).filter((e) => {
    const proof = archive.resolved[e.key];
    if (proof && sameQuote(proof.quote, e.quote)) return false;
    if (seen.has(e.key)) return false;
    seen.add(e.key); return true;
  });
}

/** Caller supplies an authenticated private receipt; no null or foreign receipt can resolve an ambiguous key. */
export function resolveLegacySheet(storage: TabStorage, owner: string, key: string, receipt: KeyReceipt): boolean {
  try {
    if (!ownerValid(owner) || receipt.ownerId !== owner || !isIntentKey(key) || !quoteValid(receipt.quote) || typeof receipt.positionId !== 'string' || !receipt.positionId || receipt.positionId.length > 128) return false;
    const archive = archiveOf(storage.getItem(SHEET_LEGACY_KEY));
    const matches = archive.records.flatMap(legacySheetIntents).filter((e) => e.key === key);
    if (!matches.length || !matches.every((e) => sameQuote(e.quote, receipt.quote))) return false;
    return persist(storage, SHEET_LEGACY_KEY, JSON.stringify({...archive, resolved: {...archive.resolved, [key]: receipt}}));
  } catch { return false; }
}

/** Only this account's namespace changes. A corrupt store or full quota refuses the next dispatch; nothing is evicted. */
export function saveOwnedSheet(storage: TabStorage, owner: string, entries: readonly StoredIntent[]): boolean {
  try {
    const key = sheetOwnerKey(owner);
    if (!key || !entries.every(entryValid)) return false;
    ownedSheetIntents(storage.getItem(key), owner);
    const raw = JSON.stringify({v: 2, owner, pending: entries});
    ownedSheetIntents(raw, owner);
    return persist(storage, key, raw);
  } catch { return false; }
}

/** The shared auth bridge cannot acquire a dispatched key or wipe an unarchived legacy envelope. */
export function saveSheetSelection(storage: TabStorage, raw: string | null): boolean {
  try {
    if (!quarantineLegacySheet(storage)) return false;
    if (raw === null) { storage.removeItem(PENDING_BET_KEY); return storage.getItem(PENDING_BET_KEY) === null; }
    if (raw.length > PENDING_BET_MAX_BYTES || legacySheetIntents(raw).length) return false;
    return persist(storage, PENDING_BET_KEY, raw);
  } catch { return false; }
}
