/**
 * THE OWNER'S "PAYABLE / NOT PAYABLE" SWITCH — the READ side (2026-09-26).
 *
 * Ali, on `/admin/affiliate`: *"when is this paid and when unpaid, what switch is responsible? … let's
 * have 2 options, payable and not payable; if not payable keep everything locked."* This module answers
 * the first question for every reader on the platform, and it answers it the same way everywhere:
 *
 *     payable = composeInvitePayable(inviteRewardsCeiling(), stored switch)
 *
 *   ceiling CLOSED (env WITHDRAWN, or the code constant) → Not payable, whatever is stored.
 *   ceiling FORCED (env ACTIVE — tests / infra)          → payable, whatever is stored.
 *   ceiling OWNER  (the shipped state)                   → payable ONLY on a stored record that is
 *                                                          correctly SEALED and says `payable: true`.
 *
 * ⛔ NOT PAYABLE IS THE DEFAULT AND EVERY FAILURE MODE. No row, a row nobody could read, a row with a
 * bad signature, the wrong purpose, the wrong version, `payable: "true"`, a bad seq, reason, date or
 * author — each one is a distinct state here and every one of them reads as Not payable. There is no
 * path through this file on which an error, a timeout or a surprise turns money ON.
 *
 * ── WHERE IT LIVES AND WHY NOT IN `affiliate.config` ────────────────────────────────────────────────
 * One `SystemConfig` row, `invite.rewards.switch`, holding `{ token }` — an HMAC-sealed record
 * (`signSession` with a purpose tag, the same construction the share and reset tokens use). Not a field
 * of `affiliate.config`: that row is posted WHOLE by the growth officer's Save and merged at load, so a
 * field there could be flipped by a form or by a hand edit. A sealed record cannot be FORGED: without
 * `SESSION_SECRET` nobody can write a new one that parses.
 * 🔴 BUT IT CAN BE REPLAYED (review P1, 2026-09-26). An OLDER GENUINE record — the row as it stood while
 * invites were Payable, from a backup or a copy — restored by someone with database WRITE access reads as
 * stored, and pays. The seal proves who wrote a record, not that it is the latest. So the admin page
 * shows the stored record's number (`seq`) and warns when it is older than the last change recorded in
 * the COMPLIANCE trail (`invitePayableView` → `recordOlderThanLog`); database write access is the boundary.
 * ⚠️ AND A `SESSION_SECRET` ROTATION THEREFORE FAILS CLOSED, BY DESIGN: every stored record stops
 * verifying, invites read as Not payable ("Stored switch unreadable"), and the Owner makes them payable
 * again through the ceremony, which writes a record sealed under the new secret.
 *
 * ── HOW FRESH ────────────────────────────────────────────────────────────────────────────────────────
 * Config on this platform loads at boot and is not propagated between containers, and a deploy runs
 * the old and new containers side by side for about a minute (`railway.json` `overlapSeconds`). So:
 *   · THE MONEY PATH READS FRESH — `accrualContextFor`, `payBonus` and `payPrize` await
 *     `refreshInvitePayable()` before `policyFor`, so a switch turned off in one container is obeyed
 *     by the next accrual in every other. A failed read refuses that accrual (fail closed). ONLY once
 *     it says payable do they also re-read `affiliate.config` (`reloadAffiliateConfig`), so the reward
 *     is priced from the row and not from the config this container booted with; a failed config read
 *     refuses too, and an unpaid platform never pays for that second read.
 *   · SCREENS READ THROUGH A ≤ 10 s CACHE — `playerInvitePayableNow()`: the shell renders on every page.
 *   · `policyFor` IS SYNC and reads the snapshot (`playerInvitePayable()`), which is false until a read
 *     has landed and false again once that read is older than 10 s. On the money path the fresh read
 *     has just refreshed it.
 * With no `DATABASE_URL` (local dev, every suite) the row lives in process memory and every read is
 * synchronous and fresh, so the no-database path behaves exactly like the database path.
 *
 * ⛔ THE WRITE SIDE IS NOT HERE. `invite-rewards-ceremony.ts` owns the Owner's ceremony and is the ONE
 * caller of `writeStoredSwitchVerified`. This file is imported by the shell, the player invite page and
 * the payer, so it must stay light and must never import the ceremony, the house console or the service.
 */
import { inviteRewardsCeiling, type InviteRewardsCeiling } from "@/lib/feature-state";
import { signSession, verifySession } from "./crypto";
import { loadConfigResult, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";
import { getAffiliateConfig, reloadAffiliateConfig } from "./affiliate-config";
import { invitePaysPlayers, type AffiliateConfig } from "@/lib/affiliate-rules";
import { getAuditByActionsDurable } from "./audit";
import { db } from "./store";

export type { InviteRewardsCeiling } from "@/lib/feature-state";

/** The `SystemConfig` key of the sealed row. */
export const INVITE_SWITCH_KEY = "invite.rewards.switch";
/** The purpose sealed INTO the record, so no other token this secret signs can pass for one. */
export const INVITE_SWITCH_PURPOSE = "invite.rewards.switch";
export const INVITE_SWITCH_VERSION = 1;
/** The reason's bounds — the ceremony's floor and ceiling, and part of what a well-formed record is. */
export const INVITE_REASON_MIN = 5;
export const INVITE_REASON_MAX = 300;
/** How stale a SCREEN's answer may be. ⛔ Never the money path's — that one reads fresh. */
export const INVITE_SWITCH_SCREEN_MAX_AGE_MS = 10_000;

/** One switch position, as the Owner's ceremony records it. */
export type InviteSwitchRecord = {
  payable: boolean;
  /** 1, 2, 3 … — the position's version, for the ceremony's "changed a moment ago" check. */
  seq: number;
  /** ISO 8601. */
  changedAt: string;
  /** The Owner's user id. */
  changedBy: string;
  /** Trimmed, 5–300 characters. */
  reason: string;
};

/**
 * What the store holds, as FIVE distinct states — so a page can say which one it is looking at.
 *   ABSENT    — no row: never switched on.
 *   UNREAD    — the read failed or has not landed yet.
 *   MALFORMED — a row that is not a correctly sealed, well-formed record (`why` says which check).
 *   SET       — a verified record.
 * ⛔ Only `SET` with `payable === true` can pay, and only under the OWNER ceiling.
 */
export type StoredSwitch =
  | { kind: "ABSENT" }
  | { kind: "UNREAD" }
  | { kind: "MALFORMED"; why: string }
  | ({ kind: "SET" } & InviteSwitchRecord);

export type StoredSwitchSet = Extract<StoredSwitch, { kind: "SET" }>;

const UNREAD: StoredSwitch = { kind: "UNREAD" };
const RECORD_KEYS = ["changedAt", "changedBy", "payable", "purpose", "reason", "seq", "v"];

/**
 * ⭐ THE TRUTH TABLE, IN ONE FUNCTION. CLOSED → never; FORCED → always; OWNER → only a sealed record
 * that says `payable: true`. ⛔ The `default` is false: a ceiling this function does not know pays nothing.
 */
export function composeInvitePayable(ceiling: InviteRewardsCeiling, stored: StoredSwitch): boolean {
  switch (ceiling) {
    case "CLOSED": return false;
    case "FORCED": return true;
    case "OWNER": return stored.kind === "SET" && stored.payable === true;
    default: return false;
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Parse a stored row — STRICTLY. Anything short of a correctly sealed, well-formed version-1 record is
 * MALFORMED, and MALFORMED is Not payable.
 * ⛔ No coercion anywhere: `"true"` is not true, `1` is not true, `"3"` is not a seq. The row must be
 * exactly `{ token }` and the sealed record exactly its seven fields, so a hand edit cannot ride a
 * field in beside a real signature.
 */
export function parseStoredSwitch(raw: unknown): StoredSwitch {
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
    if (rec.purpose !== INVITE_SWITCH_PURPOSE) return { kind: "MALFORMED", why: "wrong purpose" };
    if (rec.v !== INVITE_SWITCH_VERSION) return { kind: "MALFORMED", why: "wrong version" };
    if (typeof rec.payable !== "boolean") return { kind: "MALFORMED", why: "payable is not a boolean" };
    if (typeof rec.seq !== "number" || !Number.isSafeInteger(rec.seq) || rec.seq < 1) return { kind: "MALFORMED", why: "bad seq" };
    if (typeof rec.changedAt !== "string" || !ISO_RE.test(rec.changedAt) || Number.isNaN(Date.parse(rec.changedAt))) return { kind: "MALFORMED", why: "bad changedAt" };
    if (typeof rec.changedBy !== "string" || rec.changedBy.trim().length === 0) return { kind: "MALFORMED", why: "empty changedBy" };
    if (typeof rec.reason !== "string" || rec.reason !== rec.reason.trim()
      || rec.reason.length < INVITE_REASON_MIN || rec.reason.length > INVITE_REASON_MAX) return { kind: "MALFORMED", why: "bad reason" };
    return { kind: "SET", payable: rec.payable, seq: rec.seq, changedAt: rec.changedAt, changedBy: rec.changedBy, reason: rec.reason };
  } catch {
    // A secret that cannot be resolved, a token that will not decode: still not a switch position.
    return { kind: "MALFORMED", why: "unreadable" };
  }
}

/** Seal a record into the row shape the store holds. Used by the ceremony's write — and by suites
 *  that need a row "another container" wrote. */
export function sealInviteSwitch(record: InviteSwitchRecord): { token: string } {
  return {
    token: signSession({
      purpose: INVITE_SWITCH_PURPOSE,
      v: INVITE_SWITCH_VERSION,
      payable: record.payable,
      seq: record.seq,
      changedAt: record.changedAt,
      changedBy: record.changedBy,
      reason: record.reason,
    }),
  };
}

// ── THE STORE — the database row, or process memory with no database ──────────────────────────────

/**
 * ⚠️ TEST SEAM SHAPE — modelled on `defineConfig`'s `deps`. `hasDatabase() === false` selects the
 * in-memory row (synchronous, like the no-database config path); `true` selects `loadConfigResult` /
 * `saveConfig`, which a suite may replace with a store that fails or changes on demand.
 */
export type InviteSwitchStoreDeps = {
  loadConfigResult?: (key: string) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
  saveConfig?: (key: string, value: unknown) => Promise<void>;
  hasDatabase?: () => boolean;
};

type Snapshot = { stored: StoredSwitch; at: number; gen: number };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_INVITE_SWITCH: Snapshot | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_INVITE_SWITCH_READ: Promise<StoredSwitch> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_INVITE_SWITCH_MEM: { value: unknown } | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_INVITE_CFG_READ_AT: number | undefined;
}

let testDeps: InviteSwitchStoreDeps | null = null;

/** The process-wide snapshot. `at === 0` means no read has landed; `gen` moves on every write, so a
 *  read that started BEFORE a write cannot land AFTER it and put the old position back. */
const snap = (): Snapshot => (globalThis.__50PICK_INVITE_SWITCH ??= { stored: UNREAD, at: 0, gen: 0 });
const mem = () => (globalThis.__50PICK_INVITE_SWITCH_MEM ??= { value: null });
const dbPresent = () => (testDeps?.hasDatabase ?? hasDatabase)();

/** ⭐ A Json column does not hand back the object you gave it; neither does this. */
const jsonCopy = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

async function storeLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!dbPresent()) return { ok: true, value: mem().value };
  const load: NonNullable<InviteSwitchStoreDeps["loadConfigResult"]> = testDeps?.loadConfigResult ?? loadConfigResult;
  const res = await load(INVITE_SWITCH_KEY);
  return res.ok ? { ok: true, value: res.value } : { ok: false };
}

async function storeSave(value: unknown): Promise<void> {
  if (!dbPresent()) { mem().value = jsonCopy(value); return; }
  const save: NonNullable<InviteSwitchStoreDeps["saveConfig"]> = testDeps?.saveConfig ?? saveConfig;
  await save(INVITE_SWITCH_KEY, value);
}

/** One read of the store, parsed. ⛔ Never rejects: a store that throws is UNREAD. */
async function readStored(): Promise<StoredSwitch> {
  try {
    const res = await storeLoad();
    return res.ok ? parseStoredSwitch(res.value) : UNREAD;
  } catch {
    return UNREAD;
  }
}

/** With no database the row is in memory: read it NOW, synchronously, and settle the snapshot. */
function readStoredSync(): StoredSwitch | null {
  try {
    if (dbPresent()) return null;
    const stored = parseStoredSwitch(mem().value);
    const s = snap();
    s.stored = stored;
    s.at = Date.now();
    return stored;
  } catch {
    return null;
  }
}

/**
 * Re-read the store and update the snapshot. ⭐ Concurrent callers SHARE one in-flight read, and the
 * previous snapshot stands while it is in flight. ⛔ A failed read lands as UNREAD — Not payable — and
 * a read that was overtaken by a write does not land at all, and answers payable only if it AND the
 * write both say so.
 */
function refreshStored(): Promise<StoredSwitch> {
  const sync = readStoredSync();
  if (sync) return Promise.resolve(sync);
  const inflight = globalThis.__50PICK_INVITE_SWITCH_READ;
  if (inflight) return inflight;
  const genAtStart = snap().gen;
  const p: Promise<StoredSwitch> = readStored()
    .then((stored) => {
      const s = snap();
      /* ⛔ OVERTAKEN BY A LOCAL WRITE: the two cannot be ordered — this read may have executed AFTER another
         container's newer Stop paying (review P2, 2026-09-26: answering the local value alone paid commission
         on a row that read OFF). So it answers PAYABLE only when BOTH say so; the snapshot is left to the
         write, and the next read settles it. */
      if (s.gen !== genAtStart) return composeInvitePayable("OWNER", stored) ? s.stored : stored;
      s.stored = stored;
      s.at = Date.now();
      return stored;
    })
    .catch(() => UNREAD)
    .finally(() => {
      if (globalThis.__50PICK_INVITE_SWITCH_READ === p) globalThis.__50PICK_INVITE_SWITCH_READ = undefined;
    });
  globalThis.__50PICK_INVITE_SWITCH_READ = p;
  return p;
}

// ── THE READERS ────────────────────────────────────────────────────────────────────────────────────

/**
 * SYNC: may a player-programme referral pay right now, on this container's last read?
 *
 * ⭐ For `policyFor`, which is synchronous and has ~no other way to ask. With no database it reads the
 * in-memory row on the spot. ⛔ On the money path the caller has just awaited `refreshInvitePayable()`,
 * so this is the fresh answer.
 * ⛔ AND IT FAILS CLOSED ON AGE: false until a read has landed, and false again once the last read is
 * older than the screens' 10 s — a caller that forgot to refresh gets Not payable, never an old ON.
 * Either way it kicks a background re-read (as `defineConfig.get()` re-arms a failed hydration).
 */
export function playerInvitePayable(): boolean {
  try {
    const { ceiling } = inviteRewardsCeiling();
    if (ceiling !== "OWNER") return composeInvitePayable(ceiling, UNREAD);
    const sync = readStoredSync();
    if (sync) return composeInvitePayable("OWNER", sync);
    const s = snap();
    if (s.at === 0 || Date.now() - s.at > INVITE_SWITCH_SCREEN_MAX_AGE_MS) {
      void refreshStored();
      return false;
    }
    return composeInvitePayable("OWNER", s.stored);
  } catch {
    return false;
  }
}

/**
 * ⭐ THE MONEY PATH'S READ: re-read the store now (sharing an in-flight read) and answer from it.
 * ⛔ Never rejects; a failed read answers false. Under a FORCED or CLOSED ceiling the store is not read
 * at all — its answer could not change the result.
 */
export async function refreshInvitePayable(): Promise<boolean> {
  try {
    const { ceiling } = inviteRewardsCeiling();
    if (ceiling !== "OWNER") return composeInvitePayable(ceiling, UNREAD);
    return composeInvitePayable("OWNER", await refreshStored());
  } catch {
    return false;
  }
}

/**
 * ⛔ THE LAST WORD BEFORE A CREDIT — a read that STARTS NOW, inside the payer's lock, and never shares a
 * read already in flight (that one may have begun before a Stop paying committed). Review P6, 2026-09-26:
 * a payer that passed its fresh read and then waited on its per-referrer lock credited a prize after the
 * Owner's Stop had landed. Called immediately before `creditWallet` / `recordReward`; false refuses.
 * ⛔ Never rejects; a failed read answers false. FORCED / CLOSED answer without a read.
 */
export async function confirmInvitePayableNow(): Promise<boolean> {
  try {
    const { ceiling } = inviteRewardsCeiling();
    if (ceiling !== "OWNER") return composeInvitePayable(ceiling, UNREAD);
    return composeInvitePayable("OWNER", await readStoredSwitchFresh());
  } catch {
    return false;
  }
}

/**
 * ⭐ THE SCREENS' REWARD SETTINGS — this container's copy, RE-READ from the row when it is older than
 * `maxAgeMs` (the switch's own ≤ 10 s). 🔴 WHY: a container keeps the config it booted with, so after
 * "Make payable → Nothing yet" on another container this one would go on telling players "Invite & Earn"
 * over the shipped prize it remembers. ⛔ Ask it only once the switch has said payable, so an unpaid
 * platform never pays for the read. A read that fails — or finds NO row, whose defaults nobody stored
 * (review P10) — answers null, and the screen then says nothing about money. ⛔ Never rejects.
 */
export async function inviteScreenAffiliateConfig(maxAgeMs: number = INVITE_SWITCH_SCREEN_MAX_AGE_MS): Promise<AffiliateConfig | null> {
  try {
    const at = globalThis.__50PICK_INVITE_CFG_READ_AT ?? 0;
    if (maxAgeMs > 0 && at > 0 && Date.now() - at <= maxAgeMs) return getAffiliateConfig();
    const row = await reloadAffiliateConfig();
    if (!row.ok || !row.stored) return null;
    globalThis.__50PICK_INVITE_CFG_READ_AT = Date.now();
    return row.config;
  } catch {
    return null;
  }
}

/**
 * ⭐ THE ONE PLAYER-FACING "PAID", as a screen asks it (`invitePaysPlayers` in `affiliate-rules`): the
 * switch composed payable through the screens' ≤ 10 s read, the service-level pause off, and at least one
 * reward armed in the settings as last read from their row (`inviteScreenAffiliateConfig`). "Make payable →
 * Nothing yet" answers FALSE here — every player surface then says "Invite friends", not "Invite & Earn"
 * (review P8). ⛔ Never rejects; any failure answers false.
 */
export async function invitePaysPlayersNow(maxAgeMs: number = INVITE_SWITCH_SCREEN_MAX_AGE_MS): Promise<boolean> {
  try {
    if (!(await playerInvitePayableNow(maxAgeMs))) return false;
    const cfg = await inviteScreenAffiliateConfig(maxAgeMs);
    return cfg !== null && invitePaysPlayers(true, cfg);
  } catch {
    return false;
  }
}

/**
 * THE SCREENS' READ: the snapshot if it is younger than `maxAgeMs`, else a fresh read.
 * ⭐ The shell, the player invite page, the health probe and the admin stats read through this, so a
 * page costs at most one `SystemConfig` read per container per 10 s. `maxAgeMs = 0` forces a read.
 * ⛔ Never rejects; any failure answers false.
 */
export async function playerInvitePayableNow(maxAgeMs: number = INVITE_SWITCH_SCREEN_MAX_AGE_MS): Promise<boolean> {
  try {
    const { ceiling } = inviteRewardsCeiling();
    if (ceiling !== "OWNER") return composeInvitePayable(ceiling, UNREAD);
    const sync = readStoredSync();
    if (sync) return composeInvitePayable("OWNER", sync);
    const s = snap();
    if (maxAgeMs > 0 && s.at > 0 && Date.now() - s.at <= maxAgeMs) return composeInvitePayable("OWNER", s.stored);
    return composeInvitePayable("OWNER", await refreshStored());
  } catch {
    return false;
  }
}

/** What `/admin/affiliate` renders its state card from — one fresh read, composed once. */
export type InvitePayableView = {
  ceiling: InviteRewardsCeiling;
  /** Where the ceiling came from: the server's environment, or the code. */
  ceilingSource: "ENV" | "CODE";
  /** The stored switch, as read just now — its record is the page's provenance. */
  stored: StoredSwitch;
  /** The stored record's seq, 0 for anything that is not a verified record. The ceremony's `expectSeq`. */
  seq: number;
  /** The switch composed under the ceiling. */
  payable: boolean;
  /** `affiliate.config.enabled` — the service-level pause. */
  configEnabled: boolean;
  /** ⭐ THE PAGE'S TWO STATES: Payable when this is true, Not payable otherwise. `payable && configEnabled`. */
  paying: boolean;
  /** The viewer's STORED role is ADMIN — the Owner. False with no viewer or a failed read. */
  viewerIsOwner: boolean;
  /** Who made the stored change: the author's CHOSEN display name — null when there is no record, no row for
   *  them, or no name (the card then says "the Owner"). ⛔ Never the generated "Player #…" handle. */
  changedByLabel: string | null;
  /** ⭐ THE STORED POSITION — what the Owner last set — whatever the ceiling makes of it. Under the hard kill
   *  a stored Payable is not paying, and lifting the kill resumes it: the page must say so (review P7). */
  storedPayable: boolean;
  /** The highest `seq` among this switch's confirmed recorded changes (COMPLIANCE `affiliate.payable.on` /
   *  `.off`), or null when none could be read. */
  lastRecordedSeq: number | null;
  /** ⛔ THE STORED RECORD IS OLDER THAN THE LAST RECORDED CHANGE. A record cannot be forged, but an older
   *  GENUINE one restored by someone with database write access reads as stored (review P1) — this is how
   *  the page notices. */
  recordOlderThanLog: boolean;
};

/** The highest confirmed `seq` in the switch's COMPLIANCE trail, or null. One indexed read; admin page only. */
async function lastRecordedSwitchSeq(): Promise<number | null> {
  try {
    const log = await getAuditByActionsDurable(["affiliate.payable.on", "affiliate.payable.off"], { category: "COMPLIANCE", limit: 200 });
    let top: number | null = null;
    for (const e of log.entries) {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      if (p.confirmed === false) continue;
      if (typeof p.seq === "number" && Number.isSafeInteger(p.seq) && (top === null || p.seq > top)) top = p.seq;
    }
    return top;
  } catch {
    return null;
  }
}

/**
 * The admin page's view of the switch — a FRESH read (the ceremony's `expectSeq` comes from it), the
 * ceiling, the service-level pause and whether the viewer is the Owner, decided on the STORED row.
 * ⛔ Every read that fails leaves the safe answer: Not payable, not the Owner, no label.
 */
export async function invitePayableView(viewerUserId?: string | null): Promise<InvitePayableView> {
  const { ceiling, source } = inviteRewardsCeiling();
  /* 🔴 `await`, NEVER `.then` ON A STORE CALL. With no DATABASE_URL (local dev, every suite) `db` is the
     SYNCHRONOUS memory store cast to the async Prisma type (`store.ts`), so `db.user.findById(id).then`
     is a TypeError there — the page would crash everywhere except production. */
  const ownerRead = async (): Promise<boolean> => {
    if (typeof viewerUserId !== "string" || viewerUserId.length === 0) return false;
    try { return (await db.user.findById(viewerUserId))?.role === "ADMIN"; } catch { return false; }
  };
  const [stored, viewerIsOwner, lastRecordedSeq] = await Promise.all([
    refreshStored().catch((): StoredSwitch => UNREAD),
    ownerRead(),
    lastRecordedSwitchSeq(),
  ]);
  /* ⛔ THE OWNER'S CHOSEN NAME, OR NOTHING (addendum I, 2026-09-26) — never `displayLabel`'s generated
     "Player #XXXXXX" handle: a growth officer reading this card was shown the Owner as an anonymous player.
     No name → null, and the card says "the Owner" (only the Owner can write a record). */
  let changedByLabel: string | null = null;
  if (stored.kind === "SET") {
    try {
      const author = await db.user.findById(stored.changedBy);
      const chosen = typeof author?.displayName === "string" ? author.displayName.trim() : "";
      changedByLabel = chosen.length > 0 ? chosen : null;
    } catch { changedByLabel = null; }
  }
  let configEnabled = false;
  try { configEnabled = getAffiliateConfig().enabled === true; } catch { configEnabled = false; }
  const payable = composeInvitePayable(ceiling, stored);
  const seq = stored.kind === "SET" ? stored.seq : 0;
  return {
    ceiling,
    ceilingSource: source,
    stored,
    seq,
    payable,
    configEnabled,
    paying: payable && configEnabled,
    viewerIsOwner,
    changedByLabel,
    storedPayable: stored.kind === "SET" && stored.payable === true,
    lastRecordedSeq,
    recordOlderThanLog: stored.kind !== "UNREAD" && lastRecordedSeq !== null && seq < lastRecordedSeq,
  };
}

// ── THE WRITE PRIMITIVE — ⛔ ONE CALLER: `invite-rewards-ceremony.ts`, under its lock ─────────────────

/**
 * Read the store NOW, bypassing the snapshot and any in-flight read. For the ceremony, under its lock,
 * where "changed a moment ago" must be decided on the row itself. Updates the snapshot.
 */
export async function readStoredSwitchFresh(): Promise<StoredSwitch> {
  const stored = await readStored();
  const s = snap();
  s.gen += 1;
  s.stored = stored;
  s.at = Date.now();
  return stored;
}

/**
 * Seal and store one switch position, then READ IT BACK and compare field by field.
 *
 * 🔴 WHY THE READ-BACK. `saveConfig` never throws — a failed upsert is indistinguishable from a landed
 * one at the call site (`define-config.ts` → `setVerified`). On the control that starts money, "it
 * says it changed" is not good enough.
 *   · `ok: true`  — the row reads back as exactly this record; the snapshot now holds it.
 *   · `NOT_STORED` — the row reads back as something else: the write did not land.
 *   · `UNCONFIRMED` — the read-back itself failed. The write may or may not have landed, so the snapshot
 *     is dropped and the next read decides. ⛔ The ceremony must not tell the Owner "nothing changed".
 */
export async function writeStoredSwitchVerified(
  record: InviteSwitchRecord,
): Promise<{ ok: true; stored: StoredSwitchSet } | { ok: false; code: "NOT_STORED" | "UNCONFIRMED" }> {
  const s = snap();
  let sealed: { token: string };
  try {
    sealed = sealInviteSwitch(record);
  } catch {
    // No secret to seal with: nothing was sent, so nothing can have landed.
    return { ok: false, code: "NOT_STORED" };
  }
  try {
    await storeSave(sealed);
  } catch {
    // A store that throws on write: nothing is known. Drop the snapshot so the next read decides.
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
  if (back.kind !== "SET" || back.payable !== record.payable || back.seq !== record.seq
    || back.changedAt !== record.changedAt || back.changedBy !== record.changedBy || back.reason !== record.reason) {
    return { ok: false, code: "NOT_STORED" };
  }
  return { ok: true, stored: back };
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code.
 *
 * Points the switch at an injected store (`deps`), or back at the real one (`null`). Either way the
 * snapshot and any in-flight read are DROPPED, so a suite starts from "no read has landed". `null`
 * also empties the in-memory row, which is the no-database boot state.
 */
export function __setInviteSwitchStoreForTests(deps: InviteSwitchStoreDeps | null): void {
  testDeps = deps;
  const s = snap();
  s.gen += 1;
  s.stored = UNREAD;
  s.at = 0;
  globalThis.__50PICK_INVITE_SWITCH_READ = undefined;
  globalThis.__50PICK_INVITE_CFG_READ_AT = undefined;
  if (deps === null) mem().value = null;
}
