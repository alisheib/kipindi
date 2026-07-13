/**
 * Platform maintenance-mode tests (in-memory store; no DATABASE_URL) — §9.3 #1.
 *
 * The global switch pauses NEW bets + NEW deposits platform-wide while keeping
 * withdrawals/cash-outs open (funds never trapped). Verifies:
 *   - default OFF → bets place normally
 *   - ON  → buyPosition blocked (SUSPENDED, maintenance message)
 *   - ON  → deposit blocked (SUSPENDED) — gated before any schema/parse work
 *   - OFF again → bets place normally (fully reversible)
 *   - every flip is written to the audit chain
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { deposit } from "../src/lib/server/wallet-service.ts";
import { setPlatformConfig, getPlatformConfig, isMaintenanceMode } from "../src/lib/server/platform-config.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();

await db.user.create({
  id: "mm_u", phoneE164: "+255960000001", passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
  displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);
await db.wallet.create({
  id: "wal_mm_u", userId: "mm_u", balance: 100_000, pending: 0, hold: 0,
  currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
} as StoredWallet);

const market = await createMarket({
  titleEn: "Maintenance market", titleSw: "Soko la majaribio", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

// ── Default is OFF ──────────────────────────────────────────────────────────
ok("default: maintenance OFF", (await isMaintenanceMode()) === false);
{
  const r = await buyPosition("mm_u", { marketId: market.id, side: "YES", stake: 5_000 });
  ok("OFF: bet places", r.ok, r.ok ? "" : (r as { error?: string }).error);
}

// ── Turn ON ─────────────────────────────────────────────────────────────────
const setOn = await setPlatformConfig({ maintenanceMode: true, maintenanceNote: "Scheduled upgrade" }, "mm_officer");
ok("setPlatformConfig ON ok", setOn.ok);
ok("isMaintenanceMode() reflects ON", (await isMaintenanceMode()) === true);
ok("config persists the note", (await getPlatformConfig()).maintenanceNote === "Scheduled upgrade");

{
  const r = await buyPosition("mm_u", { marketId: market.id, side: "YES", stake: 5_000 });
  ok("ON: bet blocked", !r.ok && (r as { code?: string }).code === "SUSPENDED", JSON.stringify(r));
  // The operator's note is surfaced to the player verbatim when set.
  ok("ON: bet error surfaces the operator note", !r.ok && (r as { error?: string }).error === "Scheduled upgrade", (r as { error?: string }).error);
}
// With no note, players see the default maintenance copy.
await setPlatformConfig({ maintenanceMode: true, maintenanceNote: null }, "mm_officer");
{
  const r = await buyPosition("mm_u", { marketId: market.id, side: "YES", stake: 5_000 });
  ok("ON (no note): default message mentions maintenance", !r.ok && /maintenance/i.test((r as { error?: string }).error ?? ""), (r as { error?: string }).error);
}
{
  // Blocked before schema parse — even minimal input is refused during maintenance.
  const r = await deposit("mm_u", { provider: "MPESA", amount: 5_000, msisdn: "+255700000000" } as never);
  ok("ON: deposit blocked", !r.ok && (r as { code?: string }).code === "SUSPENDED", JSON.stringify(r));
}

// ── Turn OFF — fully reversible ─────────────────────────────────────────────
const setOff = await setPlatformConfig({ maintenanceMode: false, maintenanceNote: null }, "mm_officer");
ok("setPlatformConfig OFF ok", setOff.ok);
ok("isMaintenanceMode() reflects OFF", (await isMaintenanceMode()) === false);
{
  const r = await buyPosition("mm_u", { marketId: market.id, side: "NO", stake: 5_000 });
  ok("OFF again: bet places", r.ok, r.ok ? "" : (r as { error?: string }).error);
}

// ── Every flip is audited ───────────────────────────────────────────────────
await auditFlush();
const flips = getAuditPage({ limit: 200 }).filter((e) => e.action === "config.platform_updated");
ok("both flips audited", flips.length >= 2, `count=${flips.length}`);

console.log(`\nmaintenance-mode: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
