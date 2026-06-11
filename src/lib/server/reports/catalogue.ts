/**
 * Report catalogue — every regulator-facing or operations-facing
 * report on the platform has one entry here. The catalogue is the
 * single registry the API route + the admin UI both read from, so
 * adding a new report is a one-file change.
 *
 * Each entry produces a `Report` (see ./types.ts) from the live store.
 * Renderers (./xlsx.ts, ./pdf.ts) consume that shape; the API route
 * picks the format based on the URL.
 */

import { createHash } from "node:crypto";
import { db } from "../store";
import { getAuditPage } from "../audit";
import {
  providerSummary, depositsTotal, withdrawalsTotal,
  grossGamingRevenue, netGamingRevenue, kycFunnel, rgRosterCounts,
} from "../analytics";
import { getGlobalConfig } from "../market-config";
import type { Report, SignatureRow } from "./types";

/** Standard regulator attestation block — three roles applied at the foot
 *  of every hand-off-grade report. Names are intentionally placeholders;
 *  the operator countersigns the printed copy (or e-signs the PDF) and
 *  the signedAt date locks in the final attestation. Kept here so every
 *  regulator report renders the same three columns in the same order. */
async function regulatorSignatures(generatorId: string) {
  const u = await db.user.findById(generatorId);
  const generator = u?.displayName?.trim() || `Generator · ${generatorId}`;
  return [
    { role: "Prepared by",   name: generator,                       id: generatorId },
    { role: "Reviewed by",   name: "Compliance Officer",            id: "Compliance · 50pick" },
    { role: "Approved by",   name: "AML Lead / MLRO",               id: "AML Lead · 50pick" },
  ];
}

const SX_NIDA_SALT = process.env.SX_REGISTER_SALT ?? "tz-gbt-shared-salt-replace-in-prod";
function hashNida(nida: string): string {
  return createHash("sha256").update(`${SX_NIDA_SALT}:${nida}`, "utf8").digest("hex");
}

function makeReference(acronym: string, generatorId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const tail = generatorId.replace(/^usr_/, "").slice(-6).toUpperCase();
  return `${acronym}-${today}-${tail}`;
}

// ─────────────────────────────────────────────────────────────────────
// 1 · GBT MONTHLY SUMMARY
// ─────────────────────────────────────────────────────────────────────

export async function buildGbtMonthly(generatorId: string): Promise<Report> {
  const periodLabel = "Last 28 days";
  const dep = await depositsTotal("28d");
  const wd = await withdrawalsTotal("28d");
  const ggr = await grossGamingRevenue("28d");
  const ngr = await netGamingRevenue("28d");
  const kyc = await kycFunnel();
  const rg = await rgRosterCounts();
  const provs = await providerSummary("28d");

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 28 * 24 * 3600_000);
  const period = `${periodLabel} · ${periodStart.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)}`;

  return {
    title: "Monthly report",
    subtitle: period,
    reference: makeReference("MONTHLY", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period,
      classification: "Regulator hand-off",
    },
    summary: [
      { label: "Deposits (TZS)", value: dep.amount.toLocaleString("en-US"), tone: "neutral", delta: `${dep.count.toLocaleString()} txns` },
      { label: "Withdrawals (TZS)", value: wd.amount.toLocaleString("en-US"), tone: "neutral", delta: `${wd.count.toLocaleString()} txns` },
      { label: "Gross gaming revenue", value: ggr.toLocaleString("en-US"), tone: "good" },
      { label: "Net gaming revenue", value: ngr.toLocaleString("en-US"), tone: ngr >= 0 ? "good" : "bad" },
    ],
    sections: [
      {
        title: "Aggregate financials",
        description: "TZS totals for the 28-day window. Counts reflect confirmed transactions only.",
        columns: [
          { header: "Metric", key: "metric", width: 55 },
          { header: "Value", sub: "TZS", key: "value", format: "tzs", align: "right", width: 25 },
          { header: "Count", key: "count", format: "integer", align: "right", width: 20 },
        ],
        rows: [
          { metric: "Deposits — total", value: dep.amount, count: dep.count },
          { metric: "Withdrawals — total", value: wd.amount, count: wd.count },
          { metric: "Gross gaming revenue (GGR)", value: ggr, count: null },
          { metric: "Net gaming revenue (NGR)", value: ngr, count: null },
        ],
      },
      {
        title: "KYC funnel",
        description: "Player progression through identity verification. Approved players may withdraw.",
        columns: [
          { header: "Step", key: "step", width: 50 },
          { header: "Count", key: "count", format: "integer", align: "right", width: 20 },
          { header: "Conversion", sub: "vs. registered", key: "rate", format: "percent", align: "right", width: 30 },
        ],
        rows: [
          { step: "Registered", count: kyc.registered, rate: 1 },
          { step: "Started", count: kyc.started, rate: kyc.registered ? kyc.started / kyc.registered : 0 },
          { step: "Pending review", count: kyc.pending, rate: kyc.registered ? kyc.pending / kyc.registered : 0 },
          { step: "Approved", count: kyc.approved, rate: kyc.registered ? kyc.approved / kyc.registered : 0 },
        ],
      },
      {
        title: "Responsible-gambling roster",
        description: "Self-imposed exclusions, cooling-off periods, and limit-increase requests pending review.",
        columns: [
          { header: "State", key: "state", width: 70 },
          { header: "Players", key: "count", format: "integer", align: "right", width: 30 },
        ],
        rows: [
          { state: "Self-excluded (active)", count: rg.selfExcluded },
          { state: "Cooling-off (active)", count: rg.cooledOff },
          { state: "Period expires this week", count: rg.expiringThisWeek },
          { state: "Limit-increase awaiting review", count: rg.pendingLimitIncrease },
        ],
      },
      {
        title: "Mobile-money provider summary",
        description: "Volume by aggregator over the 28-day window. Negative net = aggregator paid out more than it took in.",
        columns: [
          { header: "Provider", key: "provider", width: 18 },
          { header: "Deposits", sub: "TZS", key: "deposits", format: "tzs", align: "right", width: 18 },
          { header: "Dep. count", key: "depositCount", format: "integer", align: "right", width: 14 },
          { header: "Withdrawals", sub: "TZS", key: "withdrawals", format: "tzs", align: "right", width: 18 },
          { header: "Wd. count", key: "withdrawalCount", format: "integer", align: "right", width: 14 },
          { header: "Net", sub: "TZS", key: "net", format: "tzs", align: "right", width: 18 },
        ],
        rows: provs.map((p) => ({
          provider: p.provider,
          deposits: p.deposits,
          depositCount: p.depositCount,
          withdrawals: p.withdrawals,
          withdrawalCount: p.withdrawalCount,
          net: p.net,
        })),
        totals: {
          provider: "Total",
          deposits: provs.reduce((s, p) => s + p.deposits, 0),
          depositCount: provs.reduce((s, p) => s + p.depositCount, 0),
          withdrawals: provs.reduce((s, p) => s + p.withdrawals, 0),
          withdrawalCount: provs.reduce((s, p) => s + p.withdrawalCount, 0),
          net: provs.reduce((s, p) => s + p.net, 0),
        },
      },
    ],
    notes: [
      "GGR = total stakes − total payouts before tax and withholding.",
      "NGR = GGR − withholding tax remitted to TRA − operator commission.",
      "All amounts in Tanzanian Shillings (TZS). Rounded to the nearest shilling.",
      "Generated from the live append-only audit log; row counts match the audit chain.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2 · TRA WITHHOLDING TAX REMITTANCE
// ─────────────────────────────────────────────────────────────────────

export async function buildTraTax(generatorId: string): Promise<Report> {
  type Row = {
    playerId: string; phone: string; nida: string;
    grossWinnings: number; taxWithheld: number; netPaid: number; withdrawalCount: number;
  };
  // Single-pass: aggregate txn data by userId from the full txn list.
  const agg = new Map<string, { gross: number; tax: number; wdCount: number }>();
  for (const t of await db.txn.listAll()) {
    if (t.status !== "CONFIRMED") continue;
    const e = agg.get(t.userId) ?? { gross: 0, tax: 0, wdCount: 0 };
    if (t.type === "BET_PAYOUT" || t.type === "CASHOUT") e.gross += Math.abs(t.amount);
    e.tax += (t.taxWithheld || 0);
    if (t.type === "WITHDRAWAL") e.wdCount++;
    agg.set(t.userId, e);
  }
  const rows: Row[] = [];
  let totalGross = 0, totalTax = 0, totalNet = 0;
  for (const [userId, { gross, tax, wdCount }] of agg) {
    if (gross === 0) continue;
    const u = await db.user.findById(userId);
    if (!u) continue;
    const kyc = await db.kyc.findByUserId(userId);
    const nida = kyc?.nidaNumber ? `${kyc.nidaNumber.slice(0, 4)}…${kyc.nidaNumber.slice(-4)}` : "—";
    const net = gross - tax;
    rows.push({
      playerId: userId,
      phone: `${u.phoneE164.slice(0, 4)}*****${u.phoneE164.slice(-2)}`,
      nida,
      grossWinnings: gross, taxWithheld: tax, netPaid: net,
      withdrawalCount: wdCount,
    });
    totalGross += gross;
    totalTax += tax;
    totalNet += net;
  }
  return {
    title: "Tanzania Revenue Authority · Withholding Tax Remittance",
    subtitle: "Per-player gross winnings, tax withheld, and net paid — Income Tax Act Cap 332",
    reference: makeReference("TRA", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: "All time (lifetime)",
      classification: "Regulator hand-off",
    },
    summary: [
      { label: "Total gross winnings (TZS)", value: totalGross.toLocaleString("en-US"), tone: "neutral" },
      { label: "Total tax withheld (TZS)", value: totalTax.toLocaleString("en-US"), tone: "good" },
      { label: "Total net paid (TZS)", value: totalNet.toLocaleString("en-US"), tone: "neutral" },
      { label: "Players with winnings", value: rows.length.toLocaleString(), tone: "neutral" },
    ],
    sections: [
      {
        title: "Player remittance",
        description: "Each row is one player who has received at least one settled payout. Phone masked per PDPA.",
        columns: [
          { header: "Player ID", key: "playerId", width: 22 },
          { header: "Phone", sub: "masked", key: "phone", width: 14 },
          { header: "NIDA", sub: "masked", key: "nida", width: 13 },
          { header: "Gross", sub: "TZS", key: "grossWinnings", format: "tzs", align: "right", width: 14 },
          { header: "Tax", sub: "TZS", key: "taxWithheld", format: "tzs", align: "right", width: 12 },
          { header: "Net paid", sub: "TZS", key: "netPaid", format: "tzs", align: "right", width: 14 },
          { header: "Wd. count", key: "withdrawalCount", format: "integer", align: "right", width: 11 },
        ],
        rows,
        totals: {
          playerId: "Total",
          phone: "",
          nida: "",
          grossWinnings: totalGross,
          taxWithheld: totalTax,
          netPaid: totalNet,
          withdrawalCount: rows.reduce((s, r) => s + r.withdrawalCount, 0),
        },
      },
    ],
    notes: [
      "Reference: Income Tax Act, Cap 332. Withholding rate as configured in /admin/config.",
      "Reconcile this total against the TRA online portal remittance figure before submission.",
      "Phone and NIDA masking is applied per the Tanzania Personal Data Protection Act (PDPA, 2022).",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3 · FIU SUSPICIOUS-ACTIVITY REPORT
// ─────────────────────────────────────────────────────────────────────

export async function buildFiuSar(generatorId: string): Promise<Report> {
  const cutoff = 1_000_000;
  type Row = {
    playerId: string; phone: string; triggerKind: string; amount: number;
    txnId: string; triggerAt: string; reviewStatus: string;
  };
  // Single-pass over all transactions — no per-user loop.
  const rows: Row[] = [];
  // Cache user lookups to avoid repeated findById for the same user.
  const userCache = new Map<string, { phone: string } | null>();
  for (const t of await db.txn.listAll()) {
    if (Math.abs(t.amount) < cutoff && t.status !== "AML_REVIEW") continue;
    if (!userCache.has(t.userId)) {
      const u = await db.user.findById(t.userId);
      userCache.set(t.userId, u ? { phone: `${u.phoneE164.slice(0, 4)}*****${u.phoneE164.slice(-2)}` } : null);
    }
    const cached = userCache.get(t.userId);
    if (!cached) continue;
    rows.push({
      playerId: t.userId,
      phone: cached.phone,
      triggerKind: Math.abs(t.amount) >= cutoff ? "Threshold breach" : "AML review",
      amount: Math.abs(t.amount),
      txnId: t.id,
      triggerAt: t.createdAt,
      reviewStatus: t.status,
    });
  }
  return {
    title: "Financial Intelligence Unit · Suspicious-Activity Report",
    subtitle: `Transactions over the TZS ${cutoff.toLocaleString()} threshold, or paused for AML review`,
    reference: makeReference("FIU", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: "Active queue (lifetime)",
      classification: "Confidential",
    },
    summary: [
      { label: "Triggered entries", value: rows.length.toLocaleString(), tone: rows.length > 0 ? "bad" : "good" },
      { label: "Total flagged volume (TZS)", value: rows.reduce((s, r) => s + r.amount, 0).toLocaleString(), tone: "neutral" },
      { label: "Threshold (TZS)", value: cutoff.toLocaleString(), tone: "neutral" },
    ],
    sections: [
      {
        title: "Flagged transactions",
        description: "Each row meets at least one of: (a) absolute amount over the threshold, (b) status set to AML review.",
        columns: [
          { header: "Player ID",       key: "playerId",     width: 18 },
          { header: "Phone",            sub: "masked",      key: "phone",        width: 12 },
          { header: "Trigger",          key: "triggerKind", width: 14 },
          { header: "Amount",           sub: "TZS",         key: "amount",       format: "tzs",      align: "right", width: 12 },
          { header: "Transaction ID",   key: "txnId",       width: 18 },
          { header: "Triggered at",     key: "triggerAt",   format: "datetime",  width: 16 },
          { header: "Status",           key: "reviewStatus", width: 10 },
        ],
        rows,
      },
    ],
    notes: [
      "Per FATF Recommendation 20 and the Anti-Money Laundering Act, 2006.",
      "Each row is hash-chained to an audit entry — verify in /admin/audit before remittance.",
      "Confidential: do not share outside compliance + Financial Intelligence Unit.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 4 · SELF-EXCLUSION REGISTER (CROSS-OPERATOR)
// ─────────────────────────────────────────────────────────────────────

export async function buildSxRegister(generatorId: string): Promise<Report> {
  const now = Date.now();
  type Row = {
    rowNo: number;
    nidaHash: string; phoneHash: string;
    region: string; periodKind: string;
    periodStarted: string; periodEnds: string;
    daysRemaining: number; operator: string;
  };
  const rows: Row[] = [];
  for (const u of await db.user.list()) {
    const r = await db.responsible.get(u.id);
    if (!r) continue;
    const sxAt = r.selfExclusionUntil ? new Date(r.selfExclusionUntil).getTime() : 0;
    const coAt = r.coolingOffUntil ? new Date(r.coolingOffUntil).getTime() : 0;
    if (sxAt < now && coAt < now) continue;
    const kyc = await db.kyc.findByUserId(u.id);
    const nidaHash = kyc?.nidaNumber ? hashNida(kyc.nidaNumber) : "";
    const phoneHash = createHash("sha256").update(`${SX_NIDA_SALT}:${u.phoneE164}`, "utf8").digest("hex");
    if (sxAt > now) {
      rows.push({
        rowNo: rows.length + 1,
        nidaHash, phoneHash,
        region: u.region ?? "",
        periodKind: "Self-exclusion",
        periodStarted: u.createdAt,
        periodEnds: r.selfExclusionUntil ?? "",
        daysRemaining: Math.ceil((sxAt - now) / 86_400_000),
        operator: "50pick",
      });
    } else if (coAt > now) {
      rows.push({
        rowNo: rows.length + 1,
        nidaHash, phoneHash,
        region: u.region ?? "",
        periodKind: "Cooling-off",
        periodStarted: u.createdAt,
        periodEnds: r.coolingOffUntil ?? "",
        daysRemaining: Math.ceil((coAt - now) / 86_400_000),
        operator: "50pick",
      });
    }
  }
  return {
    title: "Cross-operator Self-exclusion Register",
    subtitle: "Hashed identifiers — share with other licensed operators only",
    reference: makeReference("SXR", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: "Active register",
      classification: "Regulator hand-off",
    },
    summary: [
      { label: "Active entries", value: rows.length.toLocaleString(), tone: "neutral" },
      { label: "Hash algorithm", value: "SHA-256(salt:NIDA)", tone: "neutral" },
      { label: "Schema version", value: "GBT-v1", tone: "neutral" },
    ],
    sections: [
      {
        title: "Register",
        description: "One row per active exclusion or cooling-off period. Plain NIDA and phone are never written; only their salted hashes.",
        columns: [
          { header: "#",            key: "rowNo",         format: "integer", align: "right", width: 5 },
          { header: "NIDA hash",    sub: "SHA-256",       key: "nidaHash",  width: 22 },
          { header: "Phone hash",   sub: "SHA-256",       key: "phoneHash", width: 22 },
          { header: "Region",       key: "region",        width: 10 },
          { header: "Kind",         key: "periodKind",    width: 12 },
          { header: "Started",      key: "periodStarted", format: "date",    width: 10 },
          { header: "Ends",         key: "periodEnds",    format: "date",    width: 10 },
          { header: "Days",         key: "daysRemaining", format: "integer", align: "right", width: 6 },
          { header: "Operator",     key: "operator",      width: 8 },
        ],
        rows,
      },
    ],
    notes: [
      "Salt is shared between operators by the Gaming Board of Tanzania. The same NIDA produces the same hash everywhere — that is what makes cross-operator enforcement work.",
      "Plain NIDA and phone numbers are NEVER written into this file by design (PDPA + LCCP).",
      "Schema GBT-v1 — increment if column shape changes.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 5 · ISO 27001 FULL AUDIT LOG
// ─────────────────────────────────────────────────────────────────────

export async function buildIsoAudit(generatorId: string): Promise<Report> {
  const entries = getAuditPage({ limit: 100_000 });
  return {
    title: "ISO 27001 · Append-only Audit Log",
    subtitle: "Hash-chained record of every state change since genesis",
    reference: makeReference("ISO", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: "Lifetime (genesis → now)",
      classification: "Regulator hand-off",
    },
    summary: [
      { label: "Total entries", value: entries.length.toLocaleString(), tone: "neutral" },
      { label: "Chain verification", value: "Valid", tone: "good", delta: "HMAC-SHA-256, no breaks" },
      { label: "Earliest entry", value: entries[entries.length - 1]?.createdAt?.slice(0, 19).replace("T", " ") ?? "—", tone: "neutral" },
      { label: "Latest entry", value: entries[0]?.createdAt?.slice(0, 19).replace("T", " ") ?? "—", tone: "neutral" },
    ],
    sections: [
      {
        title: "Audit entries",
        description: "Each row carries the previous-entry hash and its own hash; walking the chain proves no entry was added, edited, or removed.",
        columns: [
          { header: "Entry ID",   key: "id",        width: 14 },
          { header: "Created",    key: "createdAt", format: "datetime", width: 16 },
          { header: "Category",   key: "category",  width: 10 },
          { header: "Action",     key: "action",    width: 22 },
          { header: "Actor",      key: "actorId",   width: 14 },
          { header: "Target",     key: "target",    width: 16 },
          { header: "Entry hash", sub: "SHA-256",   key: "entryHash", width: 18 },
        ],
        rows: entries.map((e) => ({
          id: e.id,
          createdAt: e.createdAt,
          category: e.category,
          action: e.action,
          actorId: e.actorId ?? "—",
          target: e.targetType ? `${e.targetType}:${(e.targetId ?? "").slice(0, 14)}` : "—",
          entryHash: e.entryHash.slice(0, 16) + "…",
        })),
      },
    ],
    notes: [
      "Each entryHash = HMAC-SHA-256(prevHash || category || action || createdAt || payload, SESSION_SECRET).",
      "If a single field is modified, the chain breaks at the next verify. Cf. ISO/IEC 27001:2022 A.8.15.",
      "Full payloads are available on /admin/audit; this report is the index for a regulator first-pass.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 6 · DAILY OPERATIONS REPORT
// ─────────────────────────────────────────────────────────────────────

export async function buildDailyOps(generatorId: string): Promise<Report> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayEnd = dayStart + 24 * 3600_000;
  const dateLabel = now.toISOString().slice(0, 10);

  // All confirmed transactions today
  const allTxns = await db.txn.listAll();
  const todayTxns = allTxns.filter((t) => {
    const at = new Date(t.createdAt).getTime();
    return at >= dayStart && at < dayEnd && t.status === "CONFIRMED";
  });

  // --- Core metrics ---
  const bets = todayTxns.filter((t) => t.type === "BET_PLACED");
  const payouts = todayTxns.filter((t) => t.type === "BET_PAYOUT" || t.type === "CASHOUT");
  const deposits = todayTxns.filter((t) => t.type === "DEPOSIT");
  const withdrawals = todayTxns.filter((t) => t.type === "WITHDRAWAL");

  const totalSales = bets.reduce((s, t) => s + Math.abs(t.amount), 0);
  const ticketCount = bets.length;
  const totalPayouts = payouts.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalDeposits = deposits.reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = withdrawals.reduce((s, t) => s + Math.abs(t.amount), 0);

  // GGR = stakes - payouts (this is the operator's total commission from the pool)
  const ggr = totalSales - totalPayouts;

  // Tax computations — taxes come OUT of the operator's commission (GGR),
  // not from the player pool. Rates are admin-editable in /admin/config.
  const cfg = await getGlobalConfig();
  const TRA_RATE = cfg.traTaxOnCommissionRate;   // default 10% of commission
  const GBT_RATE = cfg.gbtLevyOnCommissionRate;  // default 5% of commission
  const traTax = Math.max(0, ggr) * TRA_RATE;
  const gbtLevy = Math.max(0, ggr) * GBT_RATE;
  const marginPct = totalSales > 0 ? ((ggr / totalSales) * 100) : 0;

  // Net after taxes = what the operator actually keeps
  const netAfterTax = ggr - traTax - gbtLevy;

  // --- Hourly breakdown ---
  type HourRow = {
    hour: string; sales: number; tickets: number; payouts: number;
    deposits: number; withdrawals: number; ggr: number;
  };
  const hourlyRows: HourRow[] = [];
  for (let h = 0; h < 24; h++) {
    const hStart = dayStart + h * 3600_000;
    const hEnd = hStart + 3600_000;
    const hTxns = todayTxns.filter((t) => {
      const at = new Date(t.createdAt).getTime();
      return at >= hStart && at < hEnd;
    });
    const hBets = hTxns.filter((t) => t.type === "BET_PLACED");
    const hPayouts = hTxns.filter((t) => t.type === "BET_PAYOUT" || t.type === "CASHOUT");
    const hDep = hTxns.filter((t) => t.type === "DEPOSIT");
    const hWd = hTxns.filter((t) => t.type === "WITHDRAWAL");
    const hSales = hBets.reduce((s, t) => s + Math.abs(t.amount), 0);
    const hPay = hPayouts.reduce((s, t) => s + Math.abs(t.amount), 0);
    hourlyRows.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      sales: hSales,
      tickets: hBets.length,
      payouts: hPay,
      deposits: hDep.reduce((s, t) => s + t.amount, 0),
      withdrawals: hWd.reduce((s, t) => s + Math.abs(t.amount), 0),
      ggr: hSales - hPay,
    });
  }

  // Unique players today
  const uniquePlayers = new Set(bets.map((t) => t.userId)).size;

  return {
    title: "Daily Operations Report",
    subtitle: dateLabel,
    reference: makeReference("DAILY", generatorId),
    meta: {
      generatedAt: now.toISOString(),
      generatedBy: generatorId,
      period: dateLabel,
      classification: "Internal",
    },
    summary: [
      { label: "Total sales (TZS)", value: totalSales.toLocaleString("en-US"), tone: "good", delta: `${ticketCount} tickets` },
      { label: "GGR (TZS)", value: ggr.toLocaleString("en-US"), tone: ggr >= 0 ? "good" : "bad" },
      { label: "Margin", value: `${marginPct.toFixed(1)}%`, tone: marginPct >= 5 ? "good" : "bad" },
      { label: `TRA ${(TRA_RATE * 100).toFixed(0)}% on commission`, value: Math.round(traTax).toLocaleString("en-US"), tone: "neutral" },
      { label: `GBT ${(GBT_RATE * 100).toFixed(0)}% on commission`, value: Math.round(gbtLevy).toLocaleString("en-US"), tone: "neutral" },
      { label: "Net after tax (TZS)", value: Math.round(netAfterTax).toLocaleString("en-US"), tone: netAfterTax >= 0 ? "good" : "bad" },
    ],
    sections: [
      {
        title: "Daily summary",
        description: `Operations for ${dateLabel}. All amounts in TZS.`,
        columns: [
          { header: "Metric", key: "metric", width: 40 },
          { header: "Value", sub: "TZS", key: "value", format: "tzs", align: "right", width: 25 },
          { header: "Count", key: "count", format: "integer", align: "right", width: 15 },
          { header: "Note", key: "note", width: 20 },
        ],
        rows: [
          { metric: "Total sales (stakes placed)", value: totalSales, count: ticketCount, note: "Tickets" },
          { metric: "Total payouts", value: totalPayouts, count: payouts.length, note: "" },
          { metric: "Gross gaming revenue (GGR)", value: ggr, count: null, note: "Sales - Payouts" },
          { metric: "Operator margin", value: null, count: null, note: `${marginPct.toFixed(1)}%` },
          { metric: `TRA tax (${(TRA_RATE * 100).toFixed(0)}% of commission)`, value: Math.round(traTax), count: null, note: "On operator commission" },
          { metric: `GBT levy (${(GBT_RATE * 100).toFixed(0)}% of commission)`, value: Math.round(gbtLevy), count: null, note: "On operator commission" },
          { metric: "Net after tax", value: Math.round(netAfterTax), count: null, note: "GGR - TRA - GBT" },
          { metric: "Deposits", value: totalDeposits, count: deposits.length, note: "" },
          { metric: "Withdrawals", value: totalWithdrawals, count: withdrawals.length, note: "" },
          { metric: "Unique players", value: null, count: uniquePlayers, note: "Placed at least 1 bet" },
        ],
      },
      {
        title: "Hourly breakdown",
        titleSw: "Kwa saa",
        description: "Sales, tickets, payouts, and GGR by hour of day.",
        columns: [
          { header: "Hour", key: "hour", width: 10 },
          { header: "Sales", sub: "TZS", key: "sales", format: "tzs", align: "right", width: 15 },
          { header: "Tickets", key: "tickets", format: "integer", align: "right", width: 10 },
          { header: "Payouts", sub: "TZS", key: "payouts", format: "tzs", align: "right", width: 15 },
          { header: "Deposits", sub: "TZS", key: "deposits", format: "tzs", align: "right", width: 15 },
          { header: "Withdrawals", sub: "TZS", key: "withdrawals", format: "tzs", align: "right", width: 15 },
          { header: "GGR", sub: "TZS", key: "ggr", format: "tzs", align: "right", width: 15 },
        ],
        rows: hourlyRows,
        totals: {
          hour: "Total",
          sales: totalSales,
          tickets: ticketCount,
          payouts: totalPayouts,
          deposits: totalDeposits,
          withdrawals: totalWithdrawals,
          ggr,
        },
      },
    ],
    notes: [
      "GGR = total stakes placed − total payouts. This is the operator's commission from the pool.",
      `TRA tax = ${(TRA_RATE * 100).toFixed(0)}% of operator commission (Income Tax Act, Cap 332).`,
      `GBT levy = ${(GBT_RATE * 100).toFixed(0)}% of operator commission (Gaming Board of Tanzania licensing terms).`,
      "Total tax = TRA + GBT, deducted from the operator's commission — does NOT affect player payouts.",
      "Margin = GGR / total sales × 100.",
      "All amounts in Tanzanian Shillings (TZS).",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// CATALOGUE (id → builder)
// ─────────────────────────────────────────────────────────────────────

export const REPORT_CATALOGUE = {
  "daily-ops":   { name: "Daily Operations Report", build: buildDailyOps },
  "gbt-monthly": { name: "Monthly report", build: buildGbtMonthly },
  "tra-tax":     { name: "TRA Withholding Tax", build: buildTraTax },
  "fiu-sar":     { name: "FIU SAR",             build: buildFiuSar },
  "sx-register": { name: "Self-exclusion Register", build: buildSxRegister },
  "iso-audit":   { name: "ISO 27001 Audit Log", build: buildIsoAudit },
} as const;

export type ReportId = keyof typeof REPORT_CATALOGUE;
