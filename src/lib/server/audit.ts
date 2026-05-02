/**
 * Append-only audit log — every state change is recorded.
 * Compliance: GBT inspection, FIU AML reporting, ISO 27001 A.12.4.
 * In production, persists to Postgres `AuditLog` (Prisma model already defined).
 * Dev: in-memory + console for visibility.
 */

export type AuditCategory = "AUTH" | "KYC" | "WALLET" | "BET" | "ADMIN" | "COMPLIANCE" | "SECURITY" | "SYSTEM";

export type AuditEntry = {
  id: string;
  category: AuditCategory;
  action: string;            // verb-noun: "user.login", "kyc.approved"
  actorId: string | null;    // null for system events
  targetType: string | null; // "User" | "Bet" | ...
  targetId: string | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;         // ISO 8601
};

const MAX_IN_MEM = 10_000;
const ring: AuditEntry[] = [];

export function audit(entry: Omit<AuditEntry, "id" | "createdAt">): AuditEntry {
  const stamped: AuditEntry = {
    ...entry,
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  ring.push(stamped);
  if (ring.length > MAX_IN_MEM) ring.shift();
  if (process.env.NODE_ENV !== "production") {
    // Visible in dev console for inspection
    console.log("[audit]", stamped.category, stamped.action, stamped.actorId ?? "system", stamped.targetType ? `${stamped.targetType}#${stamped.targetId}` : "");
  }
  return stamped;
}

/** Read-only access for admin dashboards. */
export function getAuditPage(opts: { limit?: number; category?: AuditCategory; actorId?: string } = {}): AuditEntry[] {
  const limit = opts.limit ?? 100;
  let result = [...ring];
  if (opts.category) result = result.filter((e) => e.category === opts.category);
  if (opts.actorId) result = result.filter((e) => e.actorId === opts.actorId);
  return result.slice(-limit).reverse();
}

export function getAuditById(id: string): AuditEntry | undefined {
  return ring.find((e) => e.id === id);
}
