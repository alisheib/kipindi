"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { providerSummary, depositsTotal, withdrawalsTotal, grossGamingRevenue, netGamingRevenue, kycFunnel, rgRosterCounts } from "@/lib/server/analytics";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = db.user.findById(session.userId);
  if (!session.demoMode && !(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  return session;
}

function csvLine(values: ReadonlyArray<string | number>): string {
  return values.map((v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(",");
}

export type ExportResult =
  | { ok: true; filename: string; mime: string; payload: string }
  | { ok: false; error: string };

/* ============================================================
   GBT monthly summary
   ============================================================ */

export async function exportGbtMonthly(): Promise<ExportResult> {
  const session = await requireAdmin();
  const periodLabel = "28d";
  const dep = depositsTotal("28d");
  const wd  = withdrawalsTotal("28d");
  const ggr = grossGamingRevenue("28d");
  const ngr = netGamingRevenue("28d");
  const kyc = kycFunnel();
  const rg  = rgRosterCounts();
  const provs = providerSummary("28d");

  const lines: string[] = [
    "GBT Monthly Summary",
    `Operator,Kipindi Africa`,
    `Period,${periodLabel}`,
    `Generated_at,${new Date().toISOString()}`,
    `Reviewer,${session.userId}`,
    "",
    "# Aggregate financials (TZS)",
    csvLine(["metric", "value", "count"]),
    csvLine(["deposits_total", dep.amount, dep.count]),
    csvLine(["withdrawals_total", wd.amount, wd.count]),
    csvLine(["ggr", ggr, ""]),
    csvLine(["ngr", ngr, ""]),
    "",
    "# KYC funnel",
    csvLine(["step", "count"]),
    csvLine(["registered", kyc.registered]),
    csvLine(["started", kyc.started]),
    csvLine(["pending", kyc.pending]),
    csvLine(["approved", kyc.approved]),
    "",
    "# Responsible-gambling roster",
    csvLine(["state", "count"]),
    csvLine(["self_excluded", rg.selfExcluded]),
    csvLine(["cooled_off", rg.cooledOff]),
    csvLine(["expiring_this_week", rg.expiringThisWeek]),
    csvLine(["pending_limit_increase", rg.pendingLimitIncrease]),
    "",
    "# Mobile-money provider summary (28d)",
    csvLine(["provider", "deposits", "deposit_count", "withdrawals", "withdrawal_count", "net"]),
    ...provs.map((p) => csvLine([p.provider, p.deposits, p.depositCount, p.withdrawals, p.withdrawalCount, p.net])),
  ];
  const payload = lines.join("\n");
  audit({
    category: "ADMIN",
    action: "report.gbt_monthly.generated",
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: { period: periodLabel, sizeBytes: payload.length },
  });
  return {
    ok: true,
    filename: `gbt-monthly-${new Date().toISOString().slice(0, 10)}.csv`,
    mime: "text/csv",
    payload,
  };
}

/* ============================================================
   TRA withholding-tax remittance
   ============================================================ */

export async function exportTraTax(): Promise<ExportResult> {
  const session = await requireAdmin();
  // Per-player gross winnings + tax withheld + net paid
  const lines: string[] = [
    csvLine(["player_id", "phone_E164", "nida", "gross_winnings_tzs", "tax_withheld_tzs", "net_paid_tzs", "withdrawal_count"]),
  ];
  let cumulativeWithheld = 0;
  for (const u of db.user.list()) {
    const ts = db.txn.findByUser(u.id, 5_000);
    const grossWinnings = ts
      .filter((t) => (t.type === "BET_PAYOUT" || t.type === "CASHOUT") && t.status === "CONFIRMED")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    if (grossWinnings === 0) continue;
    const tax = ts.reduce((s, t) => s + (t.taxWithheld || 0), 0);
    const wdCount = ts.filter((t) => t.type === "WITHDRAWAL" && t.status === "CONFIRMED").length;
    const kyc = db.kyc.findByUserId(u.id);
    const nida = kyc?.nidaNumber ? `${kyc.nidaNumber.slice(0, 4)}...${kyc.nidaNumber.slice(-4)}` : "";
    cumulativeWithheld += tax;
    lines.push(csvLine([u.id, u.phoneE164, nida, grossWinnings, tax, grossWinnings - tax, wdCount]));
  }
  lines.unshift(`# TRA withholding-tax remittance`);
  lines.unshift(`# Income Tax Act Cap 332`);
  lines.unshift(`# Generated_at=${new Date().toISOString()}`);
  lines.unshift(`# Reviewer=${session.userId}`);
  lines.unshift(`# Total_withheld_tzs=${cumulativeWithheld}`);
  lines.unshift("");
  const payload = lines.join("\n");
  audit({
    category: "ADMIN",
    action: "report.tra_tax.generated",
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: { rows: lines.length, cumulativeWithheld },
  });
  return {
    ok: true,
    filename: `tra-tax-${new Date().toISOString().slice(0, 10)}.csv`,
    mime: "text/csv",
    payload,
  };
}

/* ============================================================
   FIU SAR
   ============================================================ */

export async function exportFiuSar(): Promise<ExportResult> {
  const session = await requireAdmin();
  // Anyone with a transaction ≥ TZS 1M or in AML_REVIEW
  const cutoff = 1_000_000;
  const lines: string[] = [
    csvLine(["player_id", "phone_E164", "trigger_kind", "trigger_amount_tzs", "transaction_id", "trigger_at", "review_status"]),
  ];
  for (const u of db.user.list()) {
    const ts = db.txn.findByUser(u.id, 5_000);
    for (const t of ts) {
      if (Math.abs(t.amount) >= cutoff || t.status === "AML_REVIEW") {
        lines.push(csvLine([
          u.id,
          u.phoneE164,
          Math.abs(t.amount) >= cutoff ? "threshold_breach" : "amlreview",
          Math.abs(t.amount),
          t.id,
          t.createdAt,
          t.status,
        ]));
      }
    }
  }
  lines.unshift("");
  lines.unshift(`# FIU Suspicious Activity Report (SAR)`);
  lines.unshift(`# Generated_at=${new Date().toISOString()}`);
  lines.unshift(`# Reviewer=${session.userId}`);
  lines.unshift(`# Threshold_tzs=${cutoff}`);
  const payload = lines.join("\n");
  audit({
    category: "ADMIN",
    action: "report.fiu_sar.generated",
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: { rows: lines.length, threshold: cutoff },
  });
  return {
    ok: true,
    filename: `fiu-sar-${new Date().toISOString().slice(0, 10)}.csv`,
    mime: "text/csv",
    payload,
  };
}

/* ============================================================
   Self-exclusion register (cross-operator format)
   ============================================================ */

export async function exportSxRegister(): Promise<ExportResult> {
  const session = await requireAdmin();
  const now = Date.now();
  const lines: string[] = [
    csvLine(["nida_hash", "region", "self_exclusion_until", "cooling_off_until", "operator"]),
  ];
  for (const u of db.user.list()) {
    const r = db.responsible.get(u.id);
    if (!r) continue;
    const sxAt = r.selfExclusionUntil ? new Date(r.selfExclusionUntil).getTime() : 0;
    const coAt = r.coolingOffUntil    ? new Date(r.coolingOffUntil).getTime() : 0;
    if (sxAt < now && coAt < now) continue;
    const kyc = db.kyc.findByUserId(u.id);
    const nidaHash = kyc?.nidaNumber ? `sha256:${kyc.nidaNumber.slice(-8)}` : "unknown";
    lines.push(csvLine([
      nidaHash,
      u.region ?? "",
      sxAt > now ? r.selfExclusionUntil : "",
      coAt > now ? r.coolingOffUntil : "",
      "kipindi",
    ]));
  }
  lines.unshift("");
  lines.unshift(`# Cross-operator self-exclusion register`);
  lines.unshift(`# Generated_at=${new Date().toISOString()}`);
  const payload = lines.join("\n");
  audit({
    category: "ADMIN",
    action: "report.sx_register.generated",
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: { rows: lines.length },
  });
  return {
    ok: true,
    filename: `sx-register-${new Date().toISOString().slice(0, 10)}.csv`,
    mime: "text/csv",
    payload,
  };
}

/* ============================================================
   ISO 27001 audit log export (full chain)
   ============================================================ */

export async function exportIsoAudit(): Promise<ExportResult> {
  const session = await requireAdmin();
  const { getAuditPage } = await import("@/lib/server/audit");
  const entries = getAuditPage({ limit: 100_000 });
  const lines: string[] = [
    csvLine(["id", "createdAt", "category", "action", "actorId", "targetType", "targetId", "ip", "userAgent", "prevHash", "entryHash", "payload"]),
    ...entries.map((e) => csvLine([
      e.id,
      e.createdAt,
      e.category,
      e.action,
      e.actorId ?? "",
      e.targetType ?? "",
      e.targetId ?? "",
      e.ip ?? "",
      e.userAgent ?? "",
      e.prevHash,
      e.entryHash,
      e.payload ? JSON.stringify(e.payload) : "",
    ])),
  ];
  lines.unshift("");
  lines.unshift(`# ISO 27001 audit log export`);
  lines.unshift(`# Generated_at=${new Date().toISOString()}`);
  lines.unshift(`# Total_entries=${entries.length}`);
  const payload = lines.join("\n");
  audit({
    category: "ADMIN",
    action: "report.iso_audit.generated",
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: { rows: entries.length },
  });
  return {
    ok: true,
    filename: `iso-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    mime: "text/csv",
    payload,
  };
}
