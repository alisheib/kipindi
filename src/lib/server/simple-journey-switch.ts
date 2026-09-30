/**
 * THE NEW JOURNEY'S ROLLOUT SWITCH — the READ side (the Vodacom plan, `docs/VODACOM-PLAN.md` S1, 2026-09-30).
 *
 * The plan: *"Instant kill: a DB-backed /admin toggle (two halves). `FEATURE_SIMPLEJOURNEY` env is the hard
 * override."* This module is the database half, and it answers one question the same way for every reader:
 *
 *     state = composeSimpleJourney(simpleJourneyCeiling(), stored switch)
 *
 *   The CEILING (`feature-state.ts`) is what the code and the environment allow: STAFF_PREVIEW as shipped,
 *   anything `FEATURE_SIMPLEJOURNEY` names exactly. The STORED switch is the Owner's cap, set on
 *   `/admin/journey` through a ceremony (`simple-journey-ceremony.ts`). The state is the LOWER of the two.
 *
 * ⛔ THE ASYMMETRY WITH THE INVITE SWITCH IS DELIBERATE, AND `test:simple-journey-flag` PINS IT.
 *   · ABSENT (no row — nobody has ever pressed anything) means NO CAP: the ceiling decides. A kill switch
 *     that starts killed would hide the preview on a fresh database until somebody wrote a row.
 *   · UNREAD and MALFORMED (a read that failed, a row that is not a correctly sealed record) mean WITHDRAWN:
 *     the old journey, which is the product every player has today. A surprise never SHOWS the new journey.
 *
 * ── THE RECORD ───────────────────────────────────────────────────────────────────────────────────────
 * One `SystemConfig` row, `journey.rollout.switch`, holding `{ token }` — an HMAC-sealed record (`signSession`
 * with a purpose tag, as `invite-rewards-switch.ts` does). It carries the Owner's cap AND the agency's preview
 * links (plan SJ-23: "a signed, 7-day, revocable visitor-preview link"), so a revoke and a kill are one read,
 * one lock and one record number.
 * ⚠️ The seal proves AUTHORSHIP, not recency: an older genuine record restored by someone with database write
 * access reads as stored (the invite switch's review P1). Here that can only re-open a PREVIEW, or a link the
 * Owner revoked, until its own 7 days end — database write access is the boundary, as it is there.
 * ⚠️ A `SESSION_SECRET` rotation makes the row MALFORMED, which reads as WITHDRAWN and kills every link until
 * the Owner writes a new record (`/admin/journey` says "Stored switch unreadable").
 *
 * ── HOW FRESH ────────────────────────────────────────────────────────────────────────────────────────
 * Every reader goes through a ≤ 10 s snapshot (`JOURNEY_SWITCH_MAX_AGE_MS`): AppShell renders on every page,
 * so a page costs at most one `SystemConfig` read per container per 10 s. A kill therefore reaches every
 * container within 10 s. With no `DATABASE_URL` (local dev, every suite) the row lives in process memory
 * and is read synchronously, so the no-database path behaves like the database path.
 *
 * ⛔ THE WRITE SIDE IS NOT HERE. `simple-journey-ceremony.ts` is the ONE caller of `writeJourneySwitchVerified`.
 */
import { lowerRollout, simpleJourneyCeiling, isRolloutState, type RolloutState } from "@/lib/feature-state";
import { signSession, verifySession } from "./crypto";
import { loadConfigResult, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";
import { db } from "./store";

export type { RolloutState } from "@/lib/feature-state";

/** The `SystemConfig` key of the sealed row. */
export const JOURNEY_SWITCH_KEY = "journey.rollout.switch";
/** The purpose sealed INTO the record, so no other token this secret signs can pass for one. */
export const JOURNEY_SWITCH_PURPOSE = "journey.rollout.switch";
export const JOURNEY_SWITCH_VERSION = 1;
/** The reason's bounds — the ceremony's floor and ceiling, and part of what a well-formed record is. */
export const JOURNEY_REASON_MIN = 5;
export const JOURNEY_REASON_MAX = 300;
/** A link's label (who it is for), trimmed. */
export const JOURNEY_LINK_LABEL_MIN = 2;
export const JOURNEY_LINK_LABEL_MAX = 60;
/** How many links one record holds. Issuing past it refuses; expired links are pruned 30 days after they end. */
export const JOURNEY_LINKS_MAX = 25;
/** How stale any reader's answer may be — the kill reaches every container within this. */
export const JOURNEY_SWITCH_MAX_AGE_MS = 10_000;

/** One preview link the Owner issued. `id` is what the link token and every pass minted from it carry. */
export type JourneyPreviewLink = {
  /** 16 lowercase hex characters. */
  id: string;
  /** Who it is for ("Agency — Fred"), 2–60 characters, trimmed. */
  label: string;
  /** The Owner's user id. */
  issuedBy: string;
  /** ISO 8601. */
  issuedAt: string;
  /** ISO 8601 — issuedAt + 7 days. */
  expiresAt: string;
  /** ISO 8601, or null while the link is live. */
  revokedAt: string | null;
  /** The Owner who revoked it, or null. */
  revokedBy: string | null;
};

/** One switch position, as the Owner's ceremony records it. */
export type JourneySwitchRecord = {
  /** The Owner's cap. The state is the lower of this and the ceiling. */
  cap: RolloutState;
  /** Every link issued and not yet pruned, newest first. */
  links: JourneyPreviewLink[];
  /** 1, 2, 3 … — the record's version, for the ceremony's "changed a moment ago" check. */
  seq: number;
  /** ISO 8601. */
  changedAt: string;
  /** The Owner's user id. */
  changedBy: string;
  /** Trimmed, 5–300 characters. */
  reason: string;
};

/**
 * What the store holds, as FOUR distinct states — so a page can say which one it is looking at.
 *   ABSENT    — no row: nobody has pressed anything. The ceiling decides.
 *   UNREAD    — the read failed or has not landed. WITHDRAWN.
 *   MALFORMED — a row that is not a correctly sealed, well-formed record (`why` says which check). WITHDRAWN.
 *   SET       — a verified record. The lower of its cap and the ceiling.
 */
export type StoredJourneySwitch =
  | { kind: "ABSENT" }
  | { kind: "UNREAD" }
  | { kind: "MALFORMED"; why: string }
  | ({ kind: "SET" } & JourneySwitchRecord);

export type StoredJourneySwitchSet = Extract<StoredJourneySwitch, { kind: "SET" }>;

const UNREAD: StoredJourneySwitch = { kind: "UNREAD" };
const RECORD_KEYS = ["cap", "changedAt", "changedBy", "links", "purpose", "reason", "seq", "v"];
const LINK_KEYS = ["expiresAt", "id", "issuedAt", "issuedBy", "label", "revokedAt", "revokedBy"];

/**
 * ⭐ THE TRUTH TABLE, IN ONE FUNCTION.
 *   ABSENT            → the ceiling.
 *   SET               → the lower of the ceiling and the stored cap.
 *   UNREAD, MALFORMED → WITHDRAWN.
 * ⛔ The `default` is WITHDRAWN: a stored state this function does not know shows nobody anything new.
 */
export function composeSimpleJourney(ceiling: RolloutState, stored: StoredJourneySwitch): RolloutState {
  if (!isRolloutState(ceiling)) return "WITHDRAWN";
  switch (stored.kind) {
    case "ABSENT": return ceiling;
    case "SET": return lowerRollout(ceiling, stored.cap);
    default: return "WITHDRAWN";
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const LINK_ID_RE = /^[0-9a-f]{16}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
const isAuthor = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 200;

/** One link, strictly. Null when it is not exactly a well-formed link. */
function parseLink(raw: unknown): JourneyPreviewLink | null {
  if (!isPlainObject(raw)) return null;
  if (Object.keys(raw).sort().join(",") !== LINK_KEYS.join(",")) return null;
  const { id, label, issuedBy, issuedAt, expiresAt, revokedAt, revokedBy } = raw;
  if (typeof id !== "string" || !LINK_ID_RE.test(id)) return null;
  if (typeof label !== "string" || label !== label.trim() || label.length < JOURNEY_LINK_LABEL_MIN || label.length > JOURNEY_LINK_LABEL_MAX) return null;
  if (!isAuthor(issuedBy) || !isIso(issuedAt) || !isIso(expiresAt)) return null;
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) return null;
  if (revokedAt === null) {
    if (revokedBy !== null) return null;
  } else if (!isIso(revokedAt) || !isAuthor(revokedBy)) return null;
  return { id, label, issuedBy, issuedAt, expiresAt, revokedAt, revokedBy: revokedBy as string | null };
}

/**
 * Parse a stored row — STRICTLY. Anything short of a correctly sealed, well-formed version-1 record is
 * MALFORMED, and MALFORMED is WITHDRAWN.
 * ⛔ No coercion anywhere: `"ACTIVE "` is not a cap, `"3"` is not a seq, and one malformed link spoils the
 * record (a hand edit cannot ride a link in beside a real signature). The row must be exactly `{ token }`.
 */
export function parseStoredJourneySwitch(raw: unknown): StoredJourneySwitch {
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
    if (rec.purpose !== JOURNEY_SWITCH_PURPOSE) return { kind: "MALFORMED", why: "wrong purpose" };
    if (rec.v !== JOURNEY_SWITCH_VERSION) return { kind: "MALFORMED", why: "wrong version" };
    if (!isRolloutState(rec.cap)) return { kind: "MALFORMED", why: "bad cap" };
    if (typeof rec.seq !== "number" || !Number.isSafeInteger(rec.seq) || rec.seq < 1) return { kind: "MALFORMED", why: "bad seq" };
    if (!isIso(rec.changedAt)) return { kind: "MALFORMED", why: "bad changedAt" };
    if (!isAuthor(rec.changedBy)) return { kind: "MALFORMED", why: "empty changedBy" };
    if (typeof rec.reason !== "string" || rec.reason !== rec.reason.trim()
      || rec.reason.length < JOURNEY_REASON_MIN || rec.reason.length > JOURNEY_REASON_MAX) return { kind: "MALFORMED", why: "bad reason" };
    if (!Array.isArray(rec.links) || rec.links.length > JOURNEY_LINKS_MAX) return { kind: "MALFORMED", why: "bad links" };
    const links: JourneyPreviewLink[] = [];
    for (const l of rec.links) {
      const link = parseLink(l);
      if (!link) return { kind: "MALFORMED", why: "bad link" };
      if (links.some((x) => x.id === link.id)) return { kind: "MALFORMED", why: "duplicate link" };
      links.push(link);
    }
    return { kind: "SET", cap: rec.cap, links, seq: rec.seq, changedAt: rec.changedAt, changedBy: rec.changedBy, reason: rec.reason };
  } catch {
    // A secret that cannot be resolved, a token that will not decode: still not a switch position.
    return { kind: "MALFORMED", why: "unreadable" };
  }
}

/** Seal a record into the row shape the store holds. Used by the ceremony's write — and by suites that need
 *  a row "another container" wrote. */
export function sealJourneySwitch(record: JourneySwitchRecord): { token: string } {
  return {
    token: signSession({
      purpose: JOURNEY_SWITCH_PURPOSE,
      v: JOURNEY_SWITCH_VERSION,
      cap: record.cap,
      links: record.links.map((l) => ({ ...l })),
      seq: record.seq,
      changedAt: record.changedAt,
      changedBy: record.changedBy,
      reason: record.reason,
    }),
  };
}

/** Is this link usable at `now`: in the record, not revoked, not expired? */
export function linkIsLive(link: JourneyPreviewLink | null | undefined, now: number = Date.now()): link is JourneyPreviewLink {
  return !!link && link.revokedAt === null && Date.parse(link.expiresAt) > now;
}

// ── THE STORE — the database row, or process memory with no database ──────────────────────────────

/** ⚠️ TEST SEAM SHAPE — the invite switch's, unchanged. `hasDatabase() === false` selects the in-memory row. */
export type JourneySwitchStoreDeps = {
  loadConfigResult?: (key: string) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
  saveConfig?: (key: string, value: unknown) => Promise<void>;
  hasDatabase?: () => boolean;
};

type Snapshot = { stored: StoredJourneySwitch; at: number; gen: number };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_JOURNEY_SWITCH: Snapshot | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_JOURNEY_SWITCH_READ: Promise<StoredJourneySwitch> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_JOURNEY_SWITCH_MEM: { value: unknown } | undefined;
}

let testDeps: JourneySwitchStoreDeps | null = null;

/** The process-wide snapshot. `at === 0` means no read has landed; `gen` moves on every write, so a read that
 *  started BEFORE a write cannot land AFTER it and put the old position back. */
const snap = (): Snapshot => (globalThis.__50PICK_JOURNEY_SWITCH ??= { stored: UNREAD, at: 0, gen: 0 });
const mem = () => (globalThis.__50PICK_JOURNEY_SWITCH_MEM ??= { value: null });
const dbPresent = () => (testDeps?.hasDatabase ?? hasDatabase)();

/** ⭐ A Json column does not hand back the object you gave it; neither does this. */
const jsonCopy = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

async function storeLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!dbPresent()) return { ok: true, value: mem().value };
  const load: NonNullable<JourneySwitchStoreDeps["loadConfigResult"]> = testDeps?.loadConfigResult ?? loadConfigResult;
  const res = await load(JOURNEY_SWITCH_KEY);
  return res.ok ? { ok: true, value: res.value } : { ok: false };
}

async function storeSave(value: unknown): Promise<void> {
  if (!dbPresent()) { mem().value = jsonCopy(value); return; }
  const save: NonNullable<JourneySwitchStoreDeps["saveConfig"]> = testDeps?.saveConfig ?? saveConfig;
  await save(JOURNEY_SWITCH_KEY, value);
}

/** One read of the store, parsed. ⛔ Never rejects: a store that throws is UNREAD. */
async function readStored(): Promise<StoredJourneySwitch> {
  try {
    const res = await storeLoad();
    return res.ok ? parseStoredJourneySwitch(res.value) : UNREAD;
  } catch {
    return UNREAD;
  }
}

/** With no database the row is in memory: read it NOW, synchronously, and settle the snapshot. */
function readStoredSync(): StoredJourneySwitch | null {
  try {
    if (dbPresent()) return null;
    const stored = parseStoredJourneySwitch(mem().value);
    const s = snap();
    s.stored = stored;
    s.at = Date.now();
    return stored;
  } catch {
    return null;
  }
}

/**
 * Re-read the store and update the snapshot. ⭐ Concurrent callers SHARE one in-flight read. ⛔ A failed read
 * lands as UNREAD (WITHDRAWN). A read overtaken by a local write cannot be ordered against it (it may have run
 * after another container's newer kill), so it answers whichever of the two shows LESS, and leaves the
 * snapshot to the write.
 */
function refreshStored(): Promise<StoredJourneySwitch> {
  const sync = readStoredSync();
  if (sync) return Promise.resolve(sync);
  const inflight = globalThis.__50PICK_JOURNEY_SWITCH_READ;
  if (inflight) return inflight;
  const genAtStart = snap().gen;
  const p: Promise<StoredJourneySwitch> = readStored()
    .then((stored) => {
      const s = snap();
      if (s.gen !== genAtStart) {
        const { ceiling } = simpleJourneyCeiling();
        const mine = composeSimpleJourney(ceiling, stored);
        const theirs = composeSimpleJourney(ceiling, s.stored);
        return lowerRollout(mine, theirs) === mine ? stored : s.stored;
      }
      s.stored = stored;
      s.at = Date.now();
      return stored;
    })
    .catch(() => UNREAD)
    .finally(() => {
      if (globalThis.__50PICK_JOURNEY_SWITCH_READ === p) globalThis.__50PICK_JOURNEY_SWITCH_READ = undefined;
    });
  globalThis.__50PICK_JOURNEY_SWITCH_READ = p;
  return p;
}

// ── THE READERS ────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ EVERY SCREEN'S READ: the effective rollout, and the stored record it came from (the preview resolver needs
 * its links). The snapshot if it is younger than `maxAgeMs`, else a fresh read; `maxAgeMs = 0` forces one.
 * ⛔ Under a WITHDRAWN ceiling the store is not read: nothing it holds could show anything. ⛔ Never rejects —
 * any failure answers WITHDRAWN.
 */
export async function journeySwitchNow(
  maxAgeMs: number = JOURNEY_SWITCH_MAX_AGE_MS,
): Promise<{ state: RolloutState; stored: StoredJourneySwitch }> {
  try {
    const { ceiling } = simpleJourneyCeiling();
    if (ceiling === "WITHDRAWN") return { state: "WITHDRAWN", stored: UNREAD };
    const sync = readStoredSync();
    if (sync) return { state: composeSimpleJourney(ceiling, sync), stored: sync };
    const s = snap();
    if (maxAgeMs > 0 && s.at > 0 && Date.now() - s.at <= maxAgeMs) return { state: composeSimpleJourney(ceiling, s.stored), stored: s.stored };
    const stored = await refreshStored();
    return { state: composeSimpleJourney(ceiling, stored), stored };
  } catch {
    return { state: "WITHDRAWN", stored: UNREAD };
  }
}

/** The effective rollout alone — `/api/health` and anything else that does not need the links. Never rejects. */
export async function simpleJourneyStateNow(maxAgeMs: number = JOURNEY_SWITCH_MAX_AGE_MS): Promise<RolloutState> {
  try {
    return (await journeySwitchNow(maxAgeMs)).state;
  } catch {
    return "WITHDRAWN";
  }
}

/** What `/admin/journey` renders its cards from — one fresh read, composed once. */
export type JourneySwitchView = {
  ceiling: RolloutState;
  /** Where the ceiling came from: the server's environment, or the code. */
  ceilingSource: "ENV" | "CODE";
  /** The stored switch, as read just now. */
  stored: StoredJourneySwitch;
  /** The stored record's seq, 0 for anything that is not a verified record. The ceremony's `expectSeq`. */
  seq: number;
  /** ⭐ THE EFFECTIVE ROLLOUT — what players and staff get right now. */
  state: RolloutState;
  /** The Owner's stored cap, or null when there is no verified record (ABSENT: no cap). */
  storedCap: RolloutState | null;
  /** The viewer's STORED role is ADMIN — the Owner. False with no viewer or a failed read. */
  viewerIsOwner: boolean;
  /** The stored change's author: their CHOSEN display name, or null (the card then says "the Owner"). */
  changedByLabel: string | null;
  /** Every link in the record, newest first. Empty when there is no verified record. */
  links: JourneyPreviewLink[];
};

/**
 * The admin page's view — a FRESH read (the ceremony's `expectSeq` comes from it), the ceiling, and whether
 * the viewer is the Owner, decided on the STORED row. ⛔ Every read that fails leaves the safe answer.
 */
export async function journeySwitchView(viewerUserId?: string | null): Promise<JourneySwitchView> {
  const { ceiling, source } = simpleJourneyCeiling();
  /* 🔴 `await`, NEVER `.then` ON A STORE CALL: with no DATABASE_URL `db` is the SYNCHRONOUS memory store cast
     to the async type (`store.ts`), so `.then` is a TypeError everywhere except production. */
  const ownerRead = async (): Promise<boolean> => {
    if (typeof viewerUserId !== "string" || viewerUserId.length === 0) return false;
    try { return (await db.user.findById(viewerUserId))?.role === "ADMIN"; } catch { return false; }
  };
  const [stored, viewerIsOwner] = await Promise.all([readJourneySwitchFresh().catch((): StoredJourneySwitch => UNREAD), ownerRead()]);
  let changedByLabel: string | null = null;
  if (stored.kind === "SET") {
    try {
      const author = await db.user.findById(stored.changedBy);
      const chosen = typeof author?.displayName === "string" ? author.displayName.trim() : "";
      changedByLabel = chosen.length > 0 ? chosen : null;
    } catch { changedByLabel = null; }
  }
  return {
    ceiling,
    ceilingSource: source,
    stored,
    seq: stored.kind === "SET" ? stored.seq : 0,
    state: composeSimpleJourney(ceiling, stored),
    storedCap: stored.kind === "SET" ? stored.cap : null,
    viewerIsOwner,
    changedByLabel,
    links: stored.kind === "SET" ? stored.links : [],
  };
}

// ── THE WRITE PRIMITIVE — ⛔ ONE CALLER: `simple-journey-ceremony.ts`, under its lock ───────────────

/** Read the store NOW, bypassing the snapshot and any in-flight read. Updates the snapshot. */
export async function readJourneySwitchFresh(): Promise<StoredJourneySwitch> {
  const stored = await readStored();
  const s = snap();
  s.gen += 1;
  s.stored = stored;
  s.at = Date.now();
  return stored;
}

const sameLinks = (a: JourneyPreviewLink[], b: JourneyPreviewLink[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Seal and store one record, then READ IT BACK and compare field by field.
 * 🔴 WHY THE READ-BACK: `saveConfig` never throws — a failed upsert is indistinguishable from a landed one.
 *   · `ok: true`    — the row reads back as exactly this record; the snapshot now holds it.
 *   · `NOT_STORED`  — the row reads back as something else: the write did not land.
 *   · `UNCONFIRMED` — the read-back itself failed: the next read decides. ⛔ Never "nothing changed".
 */
export async function writeJourneySwitchVerified(
  record: JourneySwitchRecord,
): Promise<{ ok: true; stored: StoredJourneySwitchSet } | { ok: false; code: "NOT_STORED" | "UNCONFIRMED" }> {
  const s = snap();
  let sealed: { token: string };
  try {
    sealed = sealJourneySwitch(record);
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
    || back.changedBy !== record.changedBy || back.reason !== record.reason || !sameLinks(back.links, record.links)) {
    return { ok: false, code: "NOT_STORED" };
  }
  return { ok: true, stored: back };
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code. Points the switch at an injected store (`deps`),
 * or back at the real one (`null`); either way the snapshot and any in-flight read are DROPPED. `null` also
 * empties the in-memory row, which is the no-database boot state.
 */
export function __setJourneySwitchStoreForTests(deps: JourneySwitchStoreDeps | null): void {
  testDeps = deps;
  const s = snap();
  s.gen += 1;
  s.stored = UNREAD;
  s.at = 0;
  globalThis.__50PICK_JOURNEY_SWITCH_READ = undefined;
  if (deps === null) mem().value = null;
}
