/**
 * ADM4 — Payments operations backend (Batch 3 §4).
 *
 * Everything here is computed from REAL transaction records — success rate,
 * latency, last failure, PSP reconciliation and the retry queue all come from
 * the live `Transaction` store. No MNO health number is fabricated: when there
 * is no data in the window a card reads honestly (— / no traffic), and latency
 * is only shown from transactions that actually recorded a completedAt.
 *
 * The per-MNO kill-switches are persisted operational flags (default: all live)
 * enforced at the top of the deposit/withdrawal money path.
 */
import { db } from "./store";
import type { StoredTxn } from "./store";
import { loadConfig, saveConfig } from "./config-store";
import { audit } from "./audit";

export type Mno = "MPESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX";
export const MNOS: { id: Mno; label: string }[] = [
  { id: "MPESA", label: "M-Pesa" },
  { id: "AIRTEL_MONEY", label: "Airtel Money" },
  { id: "HALO_PESA", label: "HaloPesa" },
  { id: "MIXX", label: "Mixx by Yas" },
];

const DAY_MS = 24 * 3600_000;

export type MnoHealth = {
  id: Mno;
  label: string;
  successRate: number | null;   // 0–100, null when no traffic in window
  confirmed: number;
  failed: number;
  p50Ms: number | null;
  p95Ms: number | null;
  lastFailure: { reason: string; at: string } | null;
  deposits: { confirmed: number; failed: number; volume: number };
  withdrawals: { confirmed: number; failed: number; volume: number };
};

function pct(arr: number[], p: number): number | null {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}

function healthFor(id: Mno, label: string, txns: StoredTxn[]): MnoHealth {
  const money = txns.filter((t) => (t.type === "DEPOSIT" || t.type === "WITHDRAWAL") && t.provider === id);
  const confirmed = money.filter((t) => t.status === "CONFIRMED");
  const failed = money.filter((t) => t.status === "FAILED");
  const total = confirmed.length + failed.length;
  const latencies = confirmed
    .filter((t) => t.completedAt)
    .map((t) => Date.parse(t.completedAt!) - Date.parse(t.createdAt))
    .filter((ms) => ms >= 0);
  const lastFail = failed.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const dep = money.filter((t) => t.type === "DEPOSIT");
  const wd = money.filter((t) => t.type === "WITHDRAWAL");
  return {
    id, label,
    successRate: total === 0 ? null : (confirmed.length / total) * 100,
    confirmed: confirmed.length,
    failed: failed.length,
    p50Ms: pct(latencies, 50),
    p95Ms: pct(latencies, 95),
    lastFailure: lastFail ? { reason: (lastFail.description ?? "failed").replace(/^.*failed:\s*/i, "") || "failed", at: lastFail.createdAt } : null,
    deposits: { confirmed: dep.filter((t) => t.status === "CONFIRMED").length, failed: dep.filter((t) => t.status === "FAILED").length, volume: dep.filter((t) => t.status === "CONFIRMED").reduce((s, t) => s + t.amount, 0) },
    withdrawals: { confirmed: wd.filter((t) => t.status === "CONFIRMED").length, failed: wd.filter((t) => t.status === "FAILED").length, volume: wd.filter((t) => t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0) },
  };
}

export async function allMnoHealth(windowMs = DAY_MS): Promise<MnoHealth[]> {
  const cutoff = Date.now() - windowMs;
  // Windowed DB query (only the 24h payment txns) instead of loading every row.
  const txns = await db.txn.listSince(cutoff, { types: ["DEPOSIT", "WITHDRAWAL"] });
  return MNOS.map((m) => healthFor(m.id, m.label, txns));
}

// ── Kill-switches ────────────────────────────────────────────────────────────
export type KillState = { deposits: boolean; withdrawals: boolean; by?: string; at?: string };
type KillMap = Record<string, KillState>;
const KILL_KEY = "payments.killswitch";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_KILLSWITCH: KillMap | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_KILLSWITCH_HYDRATED: boolean | undefined;
}
const kstore = globalThis.__50PICK_KILLSWITCH ?? (globalThis.__50PICK_KILLSWITCH = {});

async function ensureKill(): Promise<void> {
  if (globalThis.__50PICK_KILLSWITCH_HYDRATED) return;
  globalThis.__50PICK_KILLSWITCH_HYDRATED = true;
  const stored = await loadConfig<KillMap>(KILL_KEY);
  if (stored) Object.assign(kstore, stored);
}

export async function getKillSwitches(): Promise<KillMap> {
  await ensureKill();
  const out: KillMap = {};
  for (const m of MNOS) out[m.id] = kstore[m.id] ?? { deposits: false, withdrawals: false };
  return out;
}

/** Is this provider paused for a given flow? Enforced in the money path. */
export async function isPaymentPaused(provider: string, kind: "deposits" | "withdrawals"): Promise<boolean> {
  await ensureKill();
  return !!kstore[provider]?.[kind];
}

export async function setKillSwitch(provider: Mno, kind: "deposits" | "withdrawals", paused: boolean, officerId: string): Promise<void> {
  await ensureKill();
  const cur = kstore[provider] ?? { deposits: false, withdrawals: false };
  kstore[provider] = { ...cur, [kind]: paused, by: officerId, at: new Date().toISOString() };
  void saveConfig(KILL_KEY, kstore);
  audit({
    category: "COMPLIANCE",
    action: paused ? "payments.killswitch.paused" : "payments.killswitch.resumed",
    actorId: officerId,
    targetType: "PaymentProvider",
    targetId: provider,
    payload: { kind, paused, note: `${kind} ${paused ? "PAUSED" : "resumed"} for ${provider}` },
  });
}

// ── Reconciliation (PSP settlement) ──────────────────────────────────────────
/** A confirmed money movement is reconciled with the PSP when it carries the
 *  provider correlation id (providerRef). One without it is unmatched drift.
 *  This is the real, dev-safe reconciliation until a settlement-file feed lands. */
export async function reconcile(windowMs = DAY_MS): Promise<{ matched: number; unmatched: number; driftTzs: number; unmatchedRefs: string[] }> {
  const cutoff = Date.now() - windowMs;
  const money = (await db.txn.listSince(cutoff, { types: ["DEPOSIT", "WITHDRAWAL"] }))
    .filter((t) => t.status === "CONFIRMED");
  const matched = money.filter((t) => !!t.providerRef);
  const unmatched = money.filter((t) => !t.providerRef);
  return {
    matched: matched.length,
    unmatched: unmatched.length,
    driftTzs: unmatched.reduce((s, t) => s + Math.abs(t.amount), 0),
    unmatchedRefs: unmatched.slice(0, 20).map((t) => t.id),
  };
}

// ── Retry queue (failed money movements) ─────────────────────────────────────
export type RetryRow = { id: string; provider: string; type: "DEPOSIT" | "WITHDRAWAL"; amount: number; reason: string; createdAt: string; ageMs: number };
export async function retryQueue(): Promise<RetryRow[]> {
  const failed = (await db.txn.listByStatus("FAILED")).filter((t) => t.type === "DEPOSIT" || t.type === "WITHDRAWAL");
  return failed
    .map((t) => ({
      id: t.id,
      provider: t.provider ?? "—",
      type: t.type as "DEPOSIT" | "WITHDRAWAL",
      amount: Math.abs(t.amount),
      reason: (t.description ?? "failed").replace(/^.*failed:\s*/i, "") || "failed",
      createdAt: t.createdAt,
      ageMs: Date.now() - Date.parse(t.createdAt),
    }))
    .sort((a, b) => b.ageMs - a.ageMs);
}
