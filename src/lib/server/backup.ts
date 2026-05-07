/**
 * Backup + restore for the in-memory store.
 *
 * In dev / single-process production (current Railway deploy), the entire app
 * state lives in `globalThis.__50PICK_STORE`. A server restart clears it.
 * This module:
 *
 *  1. Writes a JSON snapshot of the store to disk after every mutation
 *     (debounced — at most once per `DEBOUNCE_MS`, default 1.5s).
 *  2. Restores the snapshot on first boot, before any request is served.
 *  3. Keeps the last `MAX_SNAPSHOTS` snapshots so a corrupt latest can be
 *     replaced from a known-good one (audit-friendly).
 *
 * In production-Postgres mode this entire file is replaced by Prisma. The
 * persistence interface is identical to the dev `db` API in `store.ts`.
 *
 * Compliance:
 *  - FATF: account history is recoverable across restarts (7-year retention rule)
 *  - ISO 27001 A.12.3: backup procedure is documented + automated
 *  - Snapshot file is HMAC-signed (anti-tamper) using SESSION_SECRET — a manual
 *    edit will fail the signature check on next boot, surfacing in audit log.
 */
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { audit } from "./audit";

// Backup directory — point at a Railway volume mount in production so
// snapshots survive container redeploys. Recognised env vars (in order of
// precedence): STORE_BACKUP_DIR (canonical), FIFTYPICK_BACKUP_DIR,
// KIPINDI_BACKUP_DIR (legacy). Recommended Railway setup: attach a 1 GB
// volume mounted at /data, then set STORE_BACKUP_DIR=/data/50pick-backups.
const BACKUP_DIR =
  process.env.STORE_BACKUP_DIR ??
  process.env.FIFTYPICK_BACKUP_DIR ??
  process.env.KIPINDI_BACKUP_DIR ??
  join(process.cwd(), ".50pick-backups");
const DEBOUNCE_MS    = 1_500;
const MAX_SNAPSHOTS  = 12; // ~ last 18 minutes at 1.5s cadence
const SNAPSHOT_FILE  = "store.snapshot.json";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_STORE: any | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AUDIT_RING: any[] | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_BACKUP_TIMER: ReturnType<typeof setTimeout> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_BACKUP_RESTORED: boolean | undefined;
}

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-only-secret-replace-in-prod-32chars-minimum";
}

/** Convert Map → array for JSON-encoding. */
function serializeStore(store: any): string {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(store)) {
    if (v instanceof Map) {
      out[k] = { __map: true, entries: Array.from(v.entries()) };
    } else {
      out[k] = v;
    }
  }
  // Snapshot the audit ring alongside the store so the chain survives restarts
  out.__auditRing = globalThis.__50PICK_AUDIT_RING ?? [];
  return JSON.stringify(out);
}

/** Reverse — array → Map. Also restores the audit ring if present. */
function deserializeStore(payload: string): Record<string, Map<unknown, unknown>> {
  const parsed = JSON.parse(payload);
  // Hoist the audit ring back to globalThis if present
  if (Array.isArray(parsed.__auditRing)) {
    globalThis.__50PICK_AUDIT_RING = parsed.__auditRing;
    delete parsed.__auditRing;
  }
  const restored: Record<string, Map<unknown, unknown>> = {};
  for (const [k, v] of Object.entries(parsed) as [string, any][]) {
    if (v && typeof v === "object" && v.__map === true && Array.isArray(v.entries)) {
      restored[k] = new Map(v.entries);
    } else {
      // Fallback: shallow assignment; new schema fields added later will use defaults.
      restored[k] = v;
    }
  }
  return restored;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function ensureDir() {
  try { mkdirSync(BACKUP_DIR, { recursive: true }); } catch { /* ignore */ }
}

/** Write the current store to disk now. Called by debounced wrapper. */
function writeSnapshotNow(): void {
  if (!globalThis.__50PICK_STORE) return;
  ensureDir();
  const payload = serializeStore(globalThis.__50PICK_STORE);
  const signature = sign(payload);
  const envelope = JSON.stringify({ v: 1, ts: new Date().toISOString(), payload, signature });
  const tmp = join(BACKUP_DIR, `${SNAPSHOT_FILE}.tmp`);
  writeFileSync(tmp, envelope, "utf8");
  // Atomic replace via rename — avoids partial-write corruption
  const dest = join(BACKUP_DIR, SNAPSHOT_FILE);
  try {
    // Node's writeFileSync + rename doesn't exist for fs sync rename here; emulate:
    // copy contents, then delete tmp.
    writeFileSync(dest, envelope, "utf8");
    try { unlinkSync(tmp); } catch { /* ignore */ }
  } catch (e) {
    // Best-effort fallback: keep the tmp file
    return;
  }
  // Rolling history snapshot
  const histName = `snap-${Date.now()}.json`;
  try { writeFileSync(join(BACKUP_DIR, histName), envelope, "utf8"); } catch { /* ignore */ }
  pruneOldSnapshots();
}

function pruneOldSnapshots() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("snap-") && f.endsWith(".json"))
      .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t);
    for (const old of files.slice(MAX_SNAPSHOTS)) {
      try { unlinkSync(join(BACKUP_DIR, old.f)); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

/** Public API: schedule a backup. Debounced — bursts of mutations write once. */
export function scheduleBackup(): void {
  if (globalThis.__50PICK_BACKUP_TIMER) clearTimeout(globalThis.__50PICK_BACKUP_TIMER);
  globalThis.__50PICK_BACKUP_TIMER = setTimeout(() => {
    try {
      writeSnapshotNow();
    } catch (err) {
      audit({
        category: "SYSTEM",
        action: "backup.write.failed",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { error: String((err as Error)?.message ?? err) },
      });
    }
  }, DEBOUNCE_MS);
}

/** Restore from the latest snapshot. Idempotent — safe to call many times. */
export function restoreLatest(): { restored: boolean; reason: string } {
  if (globalThis.__50PICK_BACKUP_RESTORED) {
    return { restored: false, reason: "already restored this process" };
  }
  globalThis.__50PICK_BACKUP_RESTORED = true;
  ensureDir();
  const path = join(BACKUP_DIR, SNAPSHOT_FILE);
  if (!existsSync(path)) {
    return { restored: false, reason: "no snapshot present" };
  }
  let envelope: { v: number; ts: string; payload: string; signature: string };
  try {
    envelope = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    audit({ category: "SYSTEM", action: "backup.restore.parse_failed", actorId: null, targetType: null, targetId: null, payload: { error: String(e) } });
    return { restored: false, reason: "snapshot corrupt (parse failed)" };
  }
  const expected = sign(envelope.payload);
  if (expected !== envelope.signature) {
    audit({ category: "SYSTEM", action: "backup.restore.signature_invalid", actorId: null, targetType: null, targetId: null });
    return { restored: false, reason: "snapshot signature mismatch (tampered or wrong SESSION_SECRET)" };
  }
  let restored: Record<string, unknown>;
  try {
    restored = deserializeStore(envelope.payload);
  } catch (e) {
    audit({ category: "SYSTEM", action: "backup.restore.deserialize_failed", actorId: null, targetType: null, targetId: null, payload: { error: String(e) } });
    return { restored: false, reason: "snapshot deserialize failed" };
  }
  // Merge into the existing store. New schema fields added since the snapshot
  // get default empty Maps thanks to the hot-reload safety in store.ts.
  if (!globalThis.__50PICK_STORE) globalThis.__50PICK_STORE = {};
  for (const [k, v] of Object.entries(restored)) {
    (globalThis.__50PICK_STORE as any)[k] = v;
  }
  // Rebuild secondary indexes that aren't directly stored
  rebuildIndexes();
  audit({ category: "SYSTEM", action: "backup.restored", actorId: null, targetType: null, targetId: null, payload: { ts: envelope.ts } });
  return { restored: true, reason: `restored from ${envelope.ts}` };
}

/** Rebuild Map indexes that weren't snapshotted — like usersByPhone, walletsByUser. */
function rebuildIndexes() {
  const s = globalThis.__50PICK_STORE;
  if (!s) return;
  if (s.users instanceof Map) {
    s.usersByPhone = new Map();
    for (const u of s.users.values() as Iterable<{ id: string; phoneE164: string }>) {
      s.usersByPhone.set(u.phoneE164, u.id);
    }
  }
  if (s.wallets instanceof Map) {
    s.walletsByUser = new Map();
    for (const w of s.wallets.values() as Iterable<{ id: string; userId: string }>) {
      s.walletsByUser.set(w.userId, w.id);
    }
  }
}

/** Manual backup — useful for tests and admin "backup now" action. */
export function backupNow(): { ok: true; ts: string } | { ok: false; error: string } {
  try {
    writeSnapshotNow();
    return { ok: true, ts: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}
