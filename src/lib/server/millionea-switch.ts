/**
 * MASWALI MILLIONEA — THE OWNER'S ROLLOUT SWITCH, the READ side and the one write primitive (MASWALI-BUILD S1).
 *
 *     state = composeMillionea(millioneaCeiling(), stored switch)          (`@/lib/millionea-rollout`)
 *
 * A COPY OF THE JOURNEY'S SWITCH (`simple-journey-switch.ts`) WITHOUT ITS PREVIEW LINKS — read that file's header for
 * the reasoning; every rule here is the same rule:
 *   · ONE `SystemConfig` row, `millionea.rollout.switch`, holding `{ token }` — an HMAC-sealed record (`signSession`,
 *     purpose-tagged). A hand edit or a form can never set it: without `SESSION_SECRET` nobody writes one that parses.
 *   · ABSENT means no cap (the ceiling decides); UNREAD and MALFORMED mean WITHDRAWN. A surprise never SHOWS Millionea.
 *   · ⚠️ The seal proves authorship, not recency: an older genuine record restored by someone with database write
 *     access reads as stored. Database write access is the boundary, as it is for the journey and the invite switch.
 *   · Every reader goes through a ≤ 10 s snapshot, so a kill reaches every container within 10 s.
 *   · With no `DATABASE_URL` the row lives in process memory and is read synchronously.
 *
 * ⛔ THE ONE CALLER OF `writeMillioneaSwitchVerified` IS THE OWNER'S CEREMONY (S4, `/admin/maswali`), under its lock.
 */
import { composeMillionea, millioneaCeiling, type MillioneaStoredCap, type RolloutState } from "@/lib/millionea-rollout";
import { isRolloutState, lowerRollout } from "@/lib/feature-state";
import { signSession, verifySession } from "./crypto";
import { loadConfigResult, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";

export const MILLIONEA_SWITCH_KEY = "millionea.rollout.switch";
export const MILLIONEA_SWITCH_PURPOSE = "millionea.rollout.switch";
export const MILLIONEA_SWITCH_VERSION = 1;
export const MILLIONEA_REASON_MIN = 5;
export const MILLIONEA_REASON_MAX = 300;
/** How stale any reader's answer may be — the kill reaches every container within this. */
export const MILLIONEA_SWITCH_MAX_AGE_MS = 10_000;

/** One switch position, as the Owner's ceremony records it. */
export type MillioneaSwitchRecord = {
  cap: RolloutState;
  /** 1, 2, 3 … — for the ceremony's "changed a moment ago" check. */
  seq: number;
  changedAt: string;
  changedBy: string;
  /** Trimmed, 5–300 characters. */
  reason: string;
};

export type StoredMillioneaSwitch =
  | { kind: "ABSENT" }
  | { kind: "UNREAD" }
  | { kind: "MALFORMED"; why: string }
  | ({ kind: "SET" } & MillioneaSwitchRecord);

const UNREAD: StoredMillioneaSwitch = { kind: "UNREAD" };
const RECORD_KEYS = ["cap", "changedAt", "changedBy", "purpose", "reason", "seq", "v"];

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const isIso = (v: unknown): v is string => typeof v === "string" && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
const isAuthor = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 200;

/** The stored switch as `composeMillionea` reads it. */
export function storedCapOf(stored: StoredMillioneaSwitch): MillioneaStoredCap {
  switch (stored.kind) {
    case "ABSENT": return { kind: "ABSENT" };
    case "SET": return { kind: "SET", cap: stored.cap };
    case "MALFORMED": return { kind: "MALFORMED" };
    default: return { kind: "UNREAD" };
  }
}

/**
 * Parse a stored row — STRICTLY. Anything short of a correctly sealed, well-formed version-1 record is MALFORMED, and
 * MALFORMED is WITHDRAWN. ⛔ No coercion: `"ACTIVE "` is not a cap, `"3"` is not a seq. The row is exactly `{ token }`.
 */
export function parseStoredMillioneaSwitch(raw: unknown): StoredMillioneaSwitch {
  try {
    if (raw === null || raw === undefined) return { kind: "ABSENT" };
    if (!isPlainObject(raw)) return { kind: "MALFORMED", why: "not an object" };
    const keys = Object.keys(raw);
    if (keys.length !== 1 || keys[0] !== "token") return { kind: "MALFORMED", why: "unexpected fields" };
    const token = raw.token;
    if (typeof token !== "string" || token.split(".").length !== 2) return { kind: "MALFORMED", why: "unsigned" };
    const rec = verifySession<Record<string, unknown>>(token);
    if (!isPlainObject(rec)) return { kind: "MALFORMED", why: "bad signature" };
    if (Object.keys(rec).sort().join(",") !== RECORD_KEYS.join(",")) return { kind: "MALFORMED", why: "unexpected record fields" };
    if (rec.purpose !== MILLIONEA_SWITCH_PURPOSE) return { kind: "MALFORMED", why: "wrong purpose" };
    if (rec.v !== MILLIONEA_SWITCH_VERSION) return { kind: "MALFORMED", why: "wrong version" };
    if (!isRolloutState(rec.cap)) return { kind: "MALFORMED", why: "bad cap" };
    if (typeof rec.seq !== "number" || !Number.isSafeInteger(rec.seq) || rec.seq < 1) return { kind: "MALFORMED", why: "bad seq" };
    if (!isIso(rec.changedAt)) return { kind: "MALFORMED", why: "bad changedAt" };
    if (!isAuthor(rec.changedBy)) return { kind: "MALFORMED", why: "empty changedBy" };
    if (typeof rec.reason !== "string" || rec.reason !== rec.reason.trim()
      || rec.reason.length < MILLIONEA_REASON_MIN || rec.reason.length > MILLIONEA_REASON_MAX) return { kind: "MALFORMED", why: "bad reason" };
    return { kind: "SET", cap: rec.cap, seq: rec.seq, changedAt: rec.changedAt, changedBy: rec.changedBy, reason: rec.reason };
  } catch {
    return { kind: "MALFORMED", why: "unreadable" };
  }
}

/** Seal a record into the row shape the store holds. Used by the ceremony's write, and by suites. */
export function sealMillioneaSwitch(record: MillioneaSwitchRecord): { token: string } {
  return {
    token: signSession({
      purpose: MILLIONEA_SWITCH_PURPOSE,
      v: MILLIONEA_SWITCH_VERSION,
      cap: record.cap,
      seq: record.seq,
      changedAt: record.changedAt,
      changedBy: record.changedBy,
      reason: record.reason,
    }),
  };
}

// ── THE STORE — the database row, or process memory with no database ──────────────────────────────

/** ⚠️ TEST SEAM SHAPE — the journey switch's, unchanged. */
export type MillioneaSwitchStoreDeps = {
  loadConfigResult?: (key: string) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
  saveConfig?: (key: string, value: unknown) => Promise<void>;
  hasDatabase?: () => boolean;
};

type Snapshot = { stored: StoredMillioneaSwitch; at: number; gen: number };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MILLIONEA_SWITCH: Snapshot | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MILLIONEA_SWITCH_READ: Promise<StoredMillioneaSwitch> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_MILLIONEA_SWITCH_MEM: { value: unknown } | undefined;
}

let testDeps: MillioneaSwitchStoreDeps | null = null;

const snap = (): Snapshot => (globalThis.__50PICK_MILLIONEA_SWITCH ??= { stored: UNREAD, at: 0, gen: 0 });
const mem = () => (globalThis.__50PICK_MILLIONEA_SWITCH_MEM ??= { value: null });
const dbPresent = () => (testDeps?.hasDatabase ?? hasDatabase)();
const jsonCopy = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

async function storeLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!dbPresent()) return { ok: true, value: mem().value };
  const load: NonNullable<MillioneaSwitchStoreDeps["loadConfigResult"]> = testDeps?.loadConfigResult ?? loadConfigResult;
  const res = await load(MILLIONEA_SWITCH_KEY);
  return res.ok ? { ok: true, value: res.value } : { ok: false };
}

async function storeSave(value: unknown): Promise<void> {
  if (!dbPresent()) { mem().value = jsonCopy(value); return; }
  const save: NonNullable<MillioneaSwitchStoreDeps["saveConfig"]> = testDeps?.saveConfig ?? saveConfig;
  await save(MILLIONEA_SWITCH_KEY, value);
}

/** One read of the store, parsed. ⛔ Never rejects: a store that throws is UNREAD. */
async function readStored(): Promise<StoredMillioneaSwitch> {
  try {
    const res = await storeLoad();
    return res.ok ? parseStoredMillioneaSwitch(res.value) : UNREAD;
  } catch {
    return UNREAD;
  }
}

function readStoredSync(): StoredMillioneaSwitch | null {
  try {
    if (dbPresent()) return null;
    const stored = parseStoredMillioneaSwitch(mem().value);
    const s = snap();
    s.stored = stored;
    s.at = Date.now();
    return stored;
  } catch {
    return null;
  }
}

/** Re-read and update the snapshot; concurrent callers share one read; a read overtaken by a write answers the LESS. */
function refreshStored(): Promise<StoredMillioneaSwitch> {
  const sync = readStoredSync();
  if (sync) return Promise.resolve(sync);
  const inflight = globalThis.__50PICK_MILLIONEA_SWITCH_READ;
  if (inflight) return inflight;
  const genAtStart = snap().gen;
  const p: Promise<StoredMillioneaSwitch> = readStored()
    .then((stored) => {
      const s = snap();
      if (s.gen !== genAtStart) {
        const { ceiling } = millioneaCeiling();
        const mine = composeMillionea(ceiling, storedCapOf(stored));
        const theirs = composeMillionea(ceiling, storedCapOf(s.stored));
        return lowerRollout(mine, theirs) === mine ? stored : s.stored;
      }
      s.stored = stored;
      s.at = Date.now();
      return stored;
    })
    .catch(() => UNREAD)
    .finally(() => {
      if (globalThis.__50PICK_MILLIONEA_SWITCH_READ === p) globalThis.__50PICK_MILLIONEA_SWITCH_READ = undefined;
    });
  globalThis.__50PICK_MILLIONEA_SWITCH_READ = p;
  return p;
}

// ── THE READERS ────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ EVERY SCREEN'S READ: the effective rollout and the stored switch it came from. The snapshot if younger than
 * `maxAgeMs`, else a fresh read. ⛔ Under a WITHDRAWN ceiling the store is not read. ⛔ Never rejects.
 */
export async function millioneaSwitchNow(
  maxAgeMs: number = MILLIONEA_SWITCH_MAX_AGE_MS,
): Promise<{ state: RolloutState; stored: StoredMillioneaSwitch }> {
  try {
    const { ceiling } = millioneaCeiling();
    if (ceiling === "WITHDRAWN") return { state: "WITHDRAWN", stored: UNREAD };
    const sync = readStoredSync();
    if (sync) return { state: composeMillionea(ceiling, storedCapOf(sync)), stored: sync };
    const s = snap();
    if (maxAgeMs > 0 && s.at > 0 && Date.now() - s.at <= maxAgeMs) return { state: composeMillionea(ceiling, storedCapOf(s.stored)), stored: s.stored };
    const stored = await refreshStored();
    return { state: composeMillionea(ceiling, storedCapOf(stored)), stored };
  } catch {
    return { state: "WITHDRAWN", stored: UNREAD };
  }
}

/** The effective rollout alone — `/api/health`, the resolver. Never rejects. */
export async function millioneaStateNow(maxAgeMs: number = MILLIONEA_SWITCH_MAX_AGE_MS): Promise<RolloutState> {
  try {
    return (await millioneaSwitchNow(maxAgeMs)).state;
  } catch {
    return "WITHDRAWN";
  }
}

// ── THE WRITE PRIMITIVE — ⛔ ONE CALLER: the Owner's ceremony (S4), under its lock ───────────────────

/** Read the store NOW, bypassing the snapshot and any in-flight read. Updates the snapshot. */
export async function readMillioneaSwitchFresh(): Promise<StoredMillioneaSwitch> {
  const stored = await readStored();
  const s = snap();
  s.gen += 1;
  s.stored = stored;
  s.at = Date.now();
  return stored;
}

/**
 * Seal and store one record, then READ IT BACK and compare field by field (`saveConfig` never throws, so a failed
 * upsert is indistinguishable from a landed one). `UNCONFIRMED` is never "nothing changed": the next read decides.
 */
export async function writeMillioneaSwitchVerified(
  record: MillioneaSwitchRecord,
): Promise<{ ok: true; stored: Extract<StoredMillioneaSwitch, { kind: "SET" }> } | { ok: false; code: "NOT_STORED" | "UNCONFIRMED" }> {
  const s = snap();
  let sealed: { token: string };
  try {
    sealed = sealMillioneaSwitch(record);
  } catch {
    return { ok: false, code: "NOT_STORED" };
  }
  try {
    await storeSave(sealed);
  } catch {
    s.gen += 1; s.stored = UNREAD; s.at = 0;
    return { ok: false, code: "UNCONFIRMED" };
  }
  const back = await readStored();
  s.gen += 1;
  if (back.kind === "UNREAD") {
    s.stored = UNREAD; s.at = 0;
    return { ok: false, code: "UNCONFIRMED" };
  }
  s.stored = back;
  s.at = Date.now();
  if (back.kind !== "SET" || back.cap !== record.cap || back.seq !== record.seq || back.changedAt !== record.changedAt
    || back.changedBy !== record.changedBy || back.reason !== record.reason) {
    return { ok: false, code: "NOT_STORED" };
  }
  return { ok: true, stored: back };
}

/** ⚠️ TEST SEAM ONLY. Points the switch at an injected store, or back at the real one (`null` also empties memory). */
export function __setMillioneaSwitchStoreForTests(deps: MillioneaSwitchStoreDeps | null): void {
  testDeps = deps;
  const s = snap();
  s.gen += 1;
  s.stored = UNREAD;
  s.at = 0;
  globalThis.__50PICK_MILLIONEA_SWITCH_READ = undefined;
  if (deps === null) mem().value = null;
}
