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
import { getAuditByActionsDurable, getAuditPageDurable, verifyChain, verifyChainFull } from "../audit";
import {
  providerSummary, depositsTotal, withdrawalsTotal,
  grossGamingRevenue, netGamingRevenue, kycFunnel, rgRosterCounts,
} from "../analytics";
import { currentPackPeriod, packPeriodLabel, packPeriodBounds } from "../report-pack";
// The single definition of a Tanzanian day. Never re-derive one locally.
import { startOfEatDay, eatDateLabel } from "../report-money";
// The SAR reports at the large-payout line. Until 2026-09-13 the withdrawal AML hold used the same
// constant; the owner ruling switched the hold off (`WITHDRAWAL_AML_HOLD`), the line stays.
import { AML_REVIEW_THRESHOLD_TZS } from "../payments";
import { getGlobalConfig } from "../market-config";
// The levies this report states are READ from the double-entry ledger, never re-derived.
import { houseAccountMovement } from "../ledger";
import type { Report, Row, SignatureRow, SummaryItem } from "./types";
import { formatDateTime, formatTzs } from "@/lib/utils";
import { buildFinanceWindow, type FinanceWindowArg } from "./finance-window";

/** Standard regulator attestation block — three roles at the foot of every
 *  hand-off-grade report. Only "Prepared by" is filled (the real generator, who
 *  is known at build time). "Reviewed by" / "Approved by" are left BLANK
 *  signature lines — never-fabricate: we must not pre-print a Compliance/AML
 *  signer name that no identified person actually attested. The reviewer/approver
 *  countersigns (or e-signs) the issued copy; the blank line + "Signature & date"
 *  is what both renderers draw. Kept here so every report renders the same three
 *  columns in the same order. */
async function regulatorSignatures(generatorId: string) {
  const u = await db.user.findById(generatorId);
  const generator = u?.displayName?.trim() || `Generator · ${generatorId}`;
  return [
    { role: "Prepared by",   name: generator, id: generatorId },
    { role: "Reviewed by",   name: "" }, // countersigned on the issued copy — never pre-filled
    { role: "Approved by",   name: "" },
  ];
}

/**
 * Salted SHA-256 of one identifier for the self-exclusion register.
 *
 * ⚠️ RENAMED FROM `hashNida` 2026-08-20. It was never NIDA-only — the phone number
 * goes through the same function — and from 2026-08-20 the identity half can be any
 * of four documents, so the old name described neither of its two call sites.
 */
function hashIdentifier(value: string): string {
  const salt = process.env.SX_REGISTER_SALT;
  // In production a real, secret salt is mandatory — without it the "anonymized"
  // cross-operator identity hashes are dictionary-reversible over the ID space.
  // Mirror the AUDIT_CHAIN_SECRET guard: refuse rather than ship a guessable salt.
  if (process.env.NODE_ENV === "production" && !salt) {
    throw new Error("SX_REGISTER_SALT must be set in production before generating the self-exclusion register.");
  }
  return createHash("sha256").update(`${salt ?? "tz-gbt-salt-dev-only"}:${value}`, "utf8").digest("hex");
}

function makeReference(acronym: string, generatorId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const tail = generatorId.replace(/^usr_/, "").slice(-6).toUpperCase();
  return `${acronym}-${today}-${tail}`;
}

// ─────────────────────────────────────────────────────────────────────
// 1 · GBT MONTHLY SUMMARY
// ─────────────────────────────────────────────────────────────────────

export async function buildGbtMonthly(generatorId: string, packPeriod: string = currentPackPeriod()): Promise<Report> {
  // Statutory GBT monthly pack: the figures MUST cover the exact calendar month
  // named by `packPeriod` (YYYY-MM), not a rolling 28-day window — otherwise the
  // numbers in the signed artifact don't match its "June 2026" heading (and the
  // maker-checker sha256 would be over a mislabelled document).
  const bounds = packPeriodBounds(packPeriod);
  const dep = await depositsTotal(bounds);
  const wd = await withdrawalsTotal(bounds);
  const ggr = await grossGamingRevenue(bounds);
  const ngr = await netGamingRevenue(bounds);
  const kyc = await kycFunnel();
  const rg = await rgRosterCounts();
  const provs = await providerSummary(bounds);

  const periodLabel = packPeriodLabel(packPeriod);
  // Display the EAT calendar dates (not the UTC instant, which would read as the
  // last day of the prior month since EAT midnight is 21:00 UTC the day before).
  const [py, pm] = packPeriod.split("-").map(Number);
  const lastDay = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const period = `${periodLabel} · ${packPeriod}-01 → ${packPeriod}-${String(lastDay).padStart(2, "0")} (EAT)`;

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
        description: "TZS totals for the statutory calendar month. Counts reflect confirmed transactions only.",
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
        description: "Volume by aggregator over the statutory calendar month. Negative net = aggregator paid out more than it took in.",
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
      // 🔴 L57 (C5-D20-REPLAN ruling 268), corrected 2026-09-20. This note went to the GAMING BOARD saying
      // "voids/refunds excluded from both sides". The code has never done that: `report-money.ts:155` is
      // `const ggr = stakes - payouts - refunds`, and that file's own header (:19-21) states the reason —
      // a refunded stake was still counted in Stakes, so without subtracting it GGR is overstated by the whole
      // refunded amount AND SO IS THE TRA/GBT LEVY BASE COMPUTED FROM IT. Two other notes in this same file
      // already say it correctly (:723 "Sales − Payouts − Refunds", :763 "…− refunded stakes"), so the pack was
      // internally inconsistent as well as wrong. A regulator note is a statement about our own arithmetic; it is
      // re-derived from the function that computes the figure, never written from memory of the definition.
      "GGR = total stakes − total payouts − refunded stakes. A refunded stake is returned in full and earns the operator nothing, so it is removed from the base.",
      "NGR = GGR − bonus cost − agent commission − payment-processing fees (pre-tax operator bottom line).",
      "Agent commission is contracted income paid to vetted agents out of the operator fee AFTER TRA and GBT levies; it does not reduce the levy base.",
      "All amounts in Tanzanian Shillings (TZS). Rounded to the nearest shilling.",
      // PROVENANCE — must describe what this builder actually reads.
      //
      // This line previously claimed "Generated from the live append-only audit log;
      // row counts match the audit chain." That was FALSE: no figure in this pack comes
      // from the audit log, and no row count is reconciled against the audit chain. It
      // was printed on the artifact that passes through the two-officer signing chain to
      // the Gaming Board. Never state a provenance this builder does not exercise.
      "Source: the Transaction, User and KYC tables, aggregated for the named EAT calendar " +
        "month. Financial figures are computed by the shared money module used by the " +
        "operator console, so the console and this pack cannot disagree.",
      // Scope caveat — the honest disclosure of §1.9. kycFunnel() and rgRosterCounts()
      // take no window; they are as-of-generation snapshots sitting beside period-bounded
      // money. Until they are windowed, the document must say so rather than let a reader
      // assume every number shares the heading's period.
      "Scope: deposits, withdrawals, GGR, NGR and the provider summary are bounded to the " +
        "period above. The KYC funnel and responsible-gambling roster are point-in-time " +
        "counts as at the generation timestamp, not period totals.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3 · FIU SUSPICIOUS-ACTIVITY REPORT
// ─────────────────────────────────────────────────────────────────────

export async function buildFiuSar(generatorId: string, packPeriod: string = currentPackPeriod()): Promise<Report> {
  // Use the SAME line as payments.AML_REVIEW_THRESHOLD_TZS, so a report and any hold on that
  // line can never drift apart.
  // ⚠️ SINCE 2026-09-13 THE HOLD IS OFF (owner ruling, `WITHDRAWAL_AML_HOLD` in payments.ts). This
  // report still flags every settled deposit or withdrawal of 1,000,000+ as a threshold breach;
  // `heldForAml` below stops firing for new withdrawals (it still fires for a row held before the
  // ruling, and for a deposit owed back to an excluded player).
  const cutoff = AML_REVIEW_THRESHOLD_TZS;

  // A SAR must cover a stated reporting period. This was previously
  // "Active queue (lifetime)" with no date filter at all, so it grew without bound
  // and could not be filed for a window.
  const bounds = packPeriodBounds(packPeriod);

  // Money that actually MOVED, in or out of the platform. The previous filter was
  // `Math.abs(amount) >= cutoff` across ALL types and ALL statuses, which reported to
  // the Financial Intelligence Unit:
  //   • large BET_PAYOUTs, BET_REFUNDs, BONUS_CREDITs and ADJUSTMENTs — internal
  //     movements, not cash entering or leaving the regulated perimeter; and
  //   • FAILED / CANCELLED / REVERSED transactions — money that never moved at all.
  // Filing those as "suspicious activity" both buries the real signals and misstates
  // the operator's exposure.
  const CASH_MOVEMENT: ReadonlySet<string> = new Set(["DEPOSIT", "WITHDRAWAL"]);
  const SETTLED: ReadonlySet<string> = new Set(["CONFIRMED", "AML_REVIEW"]);

  type Row = {
    playerId: string; phone: string; triggerKind: string; amount: number;
    txnId: string; triggerAt: string; reviewStatus: string;
  };
  // Single-pass over all transactions — no per-user loop.
  const rows: Row[] = [];
  // Cache user lookups to avoid repeated findById for the same user.
  const userCache = new Map<string, { phone: string } | null>();
  for (const t of await db.txn.listAll()) {
    const at = new Date(t.createdAt).getTime();
    if (at < bounds.start || at >= bounds.end) continue;

    // An explicit AML hold is reportable whatever its type. Since 2026-09-13 only a legacy
    // withdrawal or a deposit owed back to an excluded player sits in AML_REVIEW.
    const heldForAml = t.status === "AML_REVIEW";
    // A threshold breach only counts when real cash crossed the perimeter.
    const thresholdBreach =
      CASH_MOVEMENT.has(t.type) && SETTLED.has(t.status) && Math.abs(t.amount) >= cutoff;
    if (!heldForAml && !thresholdBreach) continue;

    if (!userCache.has(t.userId)) {
      const u = await db.user.findById(t.userId);
      userCache.set(t.userId, u ? { phone: `${u.phoneE164.slice(0, 4)}*****${u.phoneE164.slice(-2)}` } : null);
    }
    const cached = userCache.get(t.userId);
    if (!cached) continue;
    rows.push({
      playerId: t.userId,
      phone: cached.phone,
      triggerKind: heldForAml ? "AML review" : "Threshold breach",
      amount: Math.abs(t.amount),
      txnId: t.id,
      triggerAt: t.createdAt,
      reviewStatus: t.status,
    });
  }
  // Largest first — an FIU reviewer reads top-down.
  rows.sort((a, b) => b.amount - a.amount);
  return {
    title: "Financial Intelligence Unit · Suspicious-Activity Report",
    subtitle: `Transactions at or above the ${formatTzs(cutoff)} threshold, or paused for AML review`,
    // Landscape: the line-items carry two ~18-char IDs (player + transaction) plus
    // a datetime — they wrap mid-token in portrait.
    orientation: "landscape",
    reference: makeReference("FIU", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: `${packPeriodLabel(packPeriod)} · ${packPeriod} (EAT)`,
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
        description:
          "Each row meets at least one of: (a) a confirmed deposit or withdrawal at or above " +
          "the threshold, (b) a transaction an officer placed under AML review. Internal " +
          "movements (payouts, refunds, bonuses, adjustments) and transactions that never " +
          "settled are excluded — no money crossed the regulated perimeter.",
        columns: [
          { header: "Player ID",       key: "playerId",     width: 15 },
          { header: "Phone",            sub: "masked",      key: "phone",        width: 12 },
          { header: "Trigger",          key: "triggerKind", width: 14 },
          { header: "Amount",           sub: "TZS",         key: "amount",       format: "tzs",      align: "right", width: 12 },
          { header: "Transaction ID",   key: "txnId",       width: 15 },
          { header: "Triggered at",     key: "triggerAt",   format: "datetime",  width: 18 },
          { header: "Status",           key: "reviewStatus", width: 13 },
        ],
        rows,
      },
    ],
    notes: [
      "Per FATF Recommendation 20 and the Anti-Money Laundering Act, 2006.",
      // 2026-09-13 · this line goes to the regulator: there is no live withdrawal hold any more (owner ruling).
      `Threshold: ${formatTzs(cutoff)}, the platform's large-transaction reporting line (no withdrawal has been held for review at it since 2026-09-13).`,
      "Scope: confirmed deposits and withdrawals at or above the threshold, plus any " +
        "transaction placed under AML review, within the period above.",
      // Softened from "Each row is hash-chained to an audit entry — verify in /admin/audit".
      // Every row carries a transaction id, but this artifact does not emit the audit-entry
      // reference, so a recipient cannot verify the chain FROM this document. Do not claim a
      // verification path the reader has not been given.
      "Each row carries its transaction ID. The corresponding append-only audit entries are " +
        "held in the operator's audit log and can be produced on request.",
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
    // 🔴 THE IDENTITY NUMBER, WHICHEVER DOCUMENT IT CAME FROM. This read the
    // deprecated NIDA-only column, so from 2026-08-20 a player self-excluded on a
    // PASSPORT would have gone onto the cross-operator register with an EMPTY
    // hash — the one column that makes the register work across operators.
    // ⚠️ The TYPE is hashed with the number: two documents can share digits, and
    // a register that collides them excludes the wrong person.
    const nidaHash = kyc?.idNumber ? hashIdentifier(`${kyc.idType ?? ""}:${kyc.idNumber}`) : "";
    const phoneHash = hashIdentifier(u.phoneE164); // same salted-SHA-256 (prod-salt-guarded)
    if (sxAt > now) {
      rows.push({
        rowNo: rows.length + 1,
        nidaHash, phoneHash,
        region: u.region ?? "",
        periodKind: "Self-exclusion",
        // The date the EXCLUSION began — never the account's registration date, which
        // is what this column used to carry. Blank when the period predates the column,
        // because an unknown start is recoverable and a wrong one is not.
        periodStarted: r.selfExclusionStartedAt ?? "",
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
        // See above — real start, or blank. Not the registration date.
        periodStarted: r.coolingOffStartedAt ?? "",
        periodEnds: r.coolingOffUntil ?? "",
        daysRemaining: Math.ceil((coAt - now) / 86_400_000),
        operator: "50pick",
      });
    }
  }
  return {
    title: "Cross-operator Self-exclusion Register",
    subtitle: "Hashed identifiers — share with other licensed operators only",
    // Landscape: nine columns including two full 64-char SHA-256 hashes — portrait
    // shreds the "Days"/"Operator" columns to one glyph per line.
    orientation: "landscape",
    reference: makeReference("SXR", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: "Active register",
      classification: "Regulator hand-off",
    },
    summary: [
      { label: "Active entries", value: rows.length.toLocaleString(), tone: "neutral" },
      { label: "Hash algorithm", value: "SHA-256(salt:idType:idNumber)", tone: "neutral" },
      { label: "Schema version", value: "GBT-v1", tone: "neutral" },
    ],
    sections: [
      {
        title: "Register",
        description: "One row per active exclusion or cooling-off period. Plain identity numbers and phones are never written; only their salted hashes.",
        columns: [
          { header: "#",            key: "rowNo",         format: "integer", align: "right", width: 5 },
          { header: "ID hash",      sub: "SHA-256",       key: "nidaHash",  width: 22 },
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
      // Was: "Salt is shared between operators by the Gaming Board of Tanzania. The same
      // NIDA produces the same hash everywhere — that is what makes cross-operator
      // enforcement work." The salt is read from a LOCAL environment variable
      // (SX_REGISTER_SALT). No Gaming Board salt-distribution scheme is wired, so hashes
      // in this file match no other operator's, and the cross-operator matching the note
      // described would not actually happen. State the mechanism as it is.
      "Identifiers are salted SHA-256 hashes. Cross-operator matching requires every " +
        "operator to use the identical Gaming Board-issued salt; this file is generated " +
        "with the salt configured for this operator. Confirm salt alignment with the " +
        "Board before relying on these hashes to match another operator's register.",
      "Plain identity numbers and phone numbers are NEVER written into this file by design (PDPA + LCCP).",
      // ⛔ THE DOCUMENT TYPE IS INSIDE THE HASH, NOT IN A COLUMN. It has to be in the
      // hash, because from 2026-08-20 a person may be excluded on any one of four
      // documents and two of them could share digits — a register that collides them
      // excludes the wrong person. It must NOT be a column: this file's whole design is
      // that it carries no plain identity data, and "this exclusion is on a passport" is
      // a de-anonymising axis over a small population.
      "Hashes cover the identity document TYPE as well as its number, so the same digits " +
        "on two different documents cannot collide. Schema GBT-v1 hashes covered the NIDA " +
        "number alone; a register issued before 2026-08-20 will not hash-match this one.",
      // Honest disclosure for the blank "Started" cells on legacy rows.
      "\"Started\" is the date the exclusion period began. It is blank for periods set " +
        "before the platform began recording exclusion start dates; the end date and days " +
        "remaining are authoritative for every row.",
      "Schema GBT-v1 — increment if column shape changes.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 5 · ISO 27001 FULL AUDIT LOG
// ─────────────────────────────────────────────────────────────────────

/** Rows exported per run. The chain is walkable from the artifact, so this is a
 *  document-size bound, not a data bound — and the cap is disclosed on the page. */
const ISO_EXPORT_LIMIT = 25_000;

export async function buildIsoAudit(generatorId: string): Promise<Report> {
  // Read the audit TABLE, not the in-memory ring. `getAuditPage({limit: 100_000})`
  // returned at most MAX_IN_MEM (10,000) rows from THIS container — and this document
  // called itself "Lifetime (genesis → now)" while printing the full-DB verified total
  // beside it, so the header could read "Total entries: 10,000" next to
  // "487,332 entries verified".
  const { entries, total, truncated } = await getAuditPageDurable({ limit: ISO_EXPORT_LIMIT });
  return {
    title: "ISO 27001 · Append-only Audit Log",
    subtitle: truncated
      ? `Hash-chained record — oldest ${entries.length.toLocaleString()} of ${total.toLocaleString()} entries`
      : "Hash-chained record of every state change since genesis",
    reference: makeReference("ISO", generatorId),
    // Landscape: eight columns including two SHA-256 hashes + a datetime — the
    // densest table in the catalogue.
    orientation: "landscape",
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: truncated
        ? `Genesis → entry ${entries.length.toLocaleString()} of ${total.toLocaleString()} (export capped)`
        : "Lifetime (genesis → now)",
      classification: "Regulator hand-off",
    },
    summary: [
      // Rows IN THIS FILE vs rows in the log — two different numbers, both stated,
      // so they can never appear to contradict each other again.
      { label: "Entries in this export", value: entries.length.toLocaleString(), tone: "neutral" },
      { label: "Entries in the log", value: total.toLocaleString(), tone: "neutral" },
      // Full-chain verification against the persisted DB — not just the in-memory
      // 10k ring. Falls back to in-memory when no DB is available.
      // Two DIFFERENT facts, stated separately, because collapsing them into one
      // boolean printed "BROKEN" on a regulator hand-off — which asserts tampering.
      //
      //  • The chain LINKS are what prove no entry was inserted, removed or
      //    reordered. A break here is the real integrity failure.
      //  • A row that will not recompute is a HASHING-REGIME question, not a tamper
      //    signal: this platform signed with the SESSION_SECRET fallback before
      //    AUDIT_CHAIN_SECRET existed, and rows written before the payload
      //    normalisation fix cannot recompute at all.
      await (async (): Promise<SummaryItem> => {
        const v = await verifyChainFull();
        // 🔴 THREE VERDICTS, NOT TWO (AR-3, 2026-09-21). Until this changed, a row EDITED in place
        // left `valid:true` and this tile read "Intact" on a document that goes to a regulator —
        // the failure was counted in `unverifiable` and then described as a signing-regime
        // footnote. The three are different findings and must not collapse onto one word:
        //   · a LINK break  — an entry was inserted, removed or reordered;
        //   · an UNATTESTED row — an entry's own hash no longer matches its contents, and no
        //     declared baseline accounts for it. That is what an in-place EDIT looks like;
        //   · rows inside a DECLARED baseline — accounted for, dated, digested, and genuinely not
        //     a tamper signal.
        if (v.linkBroken) {
          return { label: "Chain integrity", value: "BROKEN", tone: "bad",
            delta: `Chain link failed at ${v.firstBreakAt ?? "unknown"} (entry #${v.index ?? "?"} of ${v.total.toLocaleString()}) — an entry was inserted, removed or reordered.` };
        }
        if (!v.valid) {
          return { label: "Chain integrity", value: "UNVERIFIED", tone: "bad",
            delta: `${v.total.toLocaleString()} entries, every link joined — but ${(v.unattested ?? 0).toLocaleString()} entry hash(es) do not match their contents and no declared baseline accounts for them. ${v.firstBreakAt ?? ""}`.trim() };
        }
        const based = v.baselined ?? 0;
        return based === 0
          ? { label: "Chain integrity", value: "Intact", tone: "good",
              delta: `HMAC-SHA-256 · ${v.total.toLocaleString()} entries, all links joined and all hashes recomputed` }
          : { label: "Chain integrity", value: "Intact", tone: "good",
              delta: `${v.total.toLocaleString()} entries, every link joined. ${(v.verified ?? 0).toLocaleString()} hashes recomputed; ${based.toLocaleString()} predate the current signing regime and are covered by the baseline declared ${v.baseline?.declaredAt?.slice(0, 10) ?? "—"} (entry ${v.baseline?.entryId ?? "—"}, see note).` };
      })(),
      // Rows are now oldest-first (chain order), so first/last are the other way round
      // from the ring-backed version. These describe THIS EXPORT's span — with a cap in
      // play, the last row here is not the newest entry in the log.
      // Minute precision on the KPI tile (the audit table carries the full second-
      // precision timestamp) so the value fits the tile on one line, un-truncated.
      { label: "First entry in export", value: entries[0]?.createdAt?.slice(0, 16).replace("T", " ") ?? "—", tone: "neutral" },
      { label: "Last entry in export", value: entries[entries.length - 1]?.createdAt?.slice(0, 16).replace("T", " ") ?? "—", tone: "neutral" },
    ],
    sections: [
      {
        title: "Audit entries",
        description: "Each row carries the previous-entry hash and its own hash; walking the chain proves no entry was added, edited, or removed.",
        columns: [
          { header: "Entry ID",   key: "id",        width: 14 },
          // Plain compact "YYYY-MM-DD HH:MM" — a formatted "21 Jul 2026, 08:59 UTC"
          // wraps even in landscape; the compact form stays on one line and sorts.
          { header: "Created",    sub: "UTC",       key: "createdAt", width: 15 },
          { header: "Category",   key: "category",  width: 15 },
          { header: "Action",     key: "action",    width: 18 },
          { header: "Actor",      key: "actorId",   width: 16 },
          { header: "Target",     key: "target",    width: 16 },
          // prevHash is what makes the chain walkable FROM this document. Without it the
          // artifact promised "walking the chain proves no entry was added, edited or
          // removed" while giving the reader only one side of each link.
          { header: "Prev hash",  sub: "SHA-256",   key: "prevHash",  width: 18 },
          { header: "Entry hash", sub: "SHA-256",   key: "entryHash", width: 18 },
        ],
        rows: entries.map((e) => ({
          id: e.id,
          // Compact, single-line, sortable: "2026-07-21 08:59" (UTC — noted in the sub-head).
          createdAt: e.createdAt.slice(0, 16).replace("T", " "),
          category: e.category,
          action: e.action,
          actorId: e.actorId ?? "—",
          target: e.targetType ? `${e.targetType}:${(e.targetId ?? "").slice(0, 14)}` : "—",
          prevHash: e.prevHash === "GENESIS" ? "GENESIS" : e.prevHash.slice(0, 16) + "…",
          entryHash: e.entryHash.slice(0, 16) + "…",
        })),
      },
    ],
    notes: [
      "Each entryHash = HMAC-SHA-256(prevHash || category || action || createdAt || payload, AUDIT_CHAIN_SECRET).",
      "If a single field is modified, the chain breaks at the next verify. Cf. ISO/IEC 27001:2022 A.8.15.",
      // The honest disclosure. Without it, a non-zero "cannot be re-verified" count on
      // the page invites exactly the conclusion it must not: that the log was altered.
      "Integrity is asserted on two independent grounds. (1) CHAIN LINKS: every entry " +
        "carries the previous entry's hash, so an inserted, removed or reordered record " +
        "breaks the chain — this is the tamper-evidence property, and it is verified over " +
        "the full database. (2) HASH RECOMPUTATION: each entry's own HMAC is recomputed.",
      "Entries signed before the platform adopted a dedicated audit-chain key (previously " +
        "the session key was used) cannot be recomputed under the current key and are " +
        "reported as such. That is a signing-key history, not evidence of alteration: their " +
        "chain links are intact and verified. Historical hashes are deliberately NOT " +
        "recomputed under the current key — doing so would rewrite the very record whose " +
        "purpose is to show nothing was rewritten.",
      // ⛔ THE DISCLOSURE ABOVE WAS A LOOPHOLE UNTIL 2026-09-21. It explained away every entry that
      // failed to recompute, and an entry EDITED in place fails to recompute in exactly the same
      // way. Naming the boundary is what makes the explanation honest rather than an excuse.
      "That population is not open-ended. It is fixed by a dated declaration recorded in " +
        "this same log (action audit.unverifiable_baseline), which states how many entries " +
        "are covered, up to which sequence number, and a SHA-256 digest of their exact stored " +
        "contents. Any entry outside that declaration whose hash does not match its contents " +
        "is reported as UNVERIFIED, not as a signing-key artefact — and an edit to an entry " +
        "inside it moves the digest. Integrity is therefore asserted over every entry in the " +
        "log, with no unbounded exempt class.",
      "Full payloads are available on /admin/audit; this report is the index for a regulator first-pass.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 6 · DAILY OPERATIONS REPORT
// ─────────────────────────────────────────────────────────────────────

export async function buildDailyOps(generatorId: string): Promise<Report> {
  // The day MUST be the Tanzanian calendar day. This previously used
  // `new Date().getFullYear()/getMonth()/getDate()`, which is SERVER-LOCAL — and the
  // Railway container runs UTC, so the window was 03:00 → 03:00 EAT. Since this report
  // computes the TRA and GBT levies below, the tax was assessed on the wrong 24 hours,
  // the hourly breakdown was shifted three hours end to end, and consecutive daily
  // filings could not be reconciled against the (EAT-correct) monthly pack.
  const nowMs = Date.now();
  const dayStart = startOfEatDay(nowMs);
  const dayEnd = dayStart + 24 * 3600_000;
  const dateLabel = eatDateLabel(dayStart);

  // All confirmed transactions today
  const allTxns = await db.txn.listAll();
  const todayTxns = allTxns.filter((t) => {
    const at = new Date(t.createdAt).getTime();
    return at >= dayStart && at < dayEnd && t.status === "CONFIRMED";
  });

  // --- Core metrics ---
  const bets = todayTxns.filter((t) => t.type === "BET_PLACED");
  const payouts = todayTxns.filter((t) => t.type === "BET_PAYOUT" || t.type === "CASHOUT");
  // Refunds (voided / one-sided polls) return the whole stake — we keep nothing.
  const refunds = todayTxns.filter((t) => t.type === "BET_REFUND");
  const deposits = todayTxns.filter((t) => t.type === "DEPOSIT");
  const withdrawals = todayTxns.filter((t) => t.type === "WITHDRAWAL");

  const totalSales = bets.reduce((s, t) => s + Math.abs(t.amount), 0);
  const ticketCount = bets.length;
  const totalPayouts = payouts.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalRefunds = refunds.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalDeposits = deposits.reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = withdrawals.reduce((s, t) => s + Math.abs(t.amount), 0);

  /**
   * GGR = stakes − payouts − refunds. Refunds MUST be subtracted: a voided/one-sided poll
   * returns every stake and we earn nothing, but the stake was counted in totalSales.
   *
   * 🔴 THIS COMMENT USED TO SAY GGR "= the operator's commission (what we KEEP)" AND THAT THE
   * REPORT AND THE LEDGER "now agree". BOTH WERE FALSE, and stating them here is why the same
   * defect was re-derived twice. Measured on production 2026-09-25: GGR over September was
   * 803,675 while gross settlement commission booked to the ledger was 62,985 — GGR is a
   * TURNOVER measure that still contains money on open positions, not the fee we charged.
   */
  const ggr = totalSales - totalPayouts - totalRefunds;

  /**
   * 🔴 THE LEVIES ARE READ FROM THE LEDGER, NOT COMPUTED — and every formula this report has
   * ever used was wrong.
   *
   * ① It multiplied GGR by the rates. GGR is not the fee (see above), so on September's
   *   production figures that is 120,551 against 8,796 actually booked — about 14×. The rates
   *   are named `…OnCommissionRate` and `levySplit` (payout.ts) applies them to the settlement
   *   FEE, which is what the ledger books.
   * ② Multiplying `HOUSE:COMMISSION` instead would also be wrong: that account is already NET
   *   of the levies. Each settlement credits the commission and then DEBITS
   *   `SETTLEMENT_TRA_LEVY` / `SETTLEMENT_GBT_LEVY` straight back out of it (ledger.ts). All
   *   time: credits 63,651, debits −9,523, and TRA 6,320 + GBT 3,203 = 9,523 exactly.
   * ③ And no formula reproduces the booked figure anyway: each settlement rounds its own levy
   *   (GBT on a 130 fee is 6.5 → 7), and `WITHDRAWAL_FEE` sits in the same account carrying no
   *   levy at all — 251 levy entries against 251 settlement-commission entries.
   *
   * ⭐ So this reads `HOUSE:TRA_LEVY` and `HOUSE:GBT_LEVY` movement over the same EAT day the
   * rest of the report covers. Those are whole shillings, rounded once at posting time, and are
   * the amount actually owed — so the document reconciles against the house accounts rather
   * than against a formula, and the note on its face becomes true for the first time.
   * ⛔ A FAILED LEDGER READ OMITS THE LEVY LINES ENTIRELY. It must never print 0: a fabricated
   * zero on a tax line is the one number on this page nobody may invent.
   */
  const cfg = await getGlobalConfig();
  const TRA_RATE = cfg.traTaxOnCommissionRate;   // 10% of the settlement fee
  const GBT_RATE = cfg.gbtLevyOnCommissionRate;  // 5% of the settlement fee
  const ledgerDay = await houseAccountMovement(dayStart, dayEnd).catch(() => null);
  const traTax = ledgerDay === null ? null : Math.round(ledgerDay["HOUSE:TRA_LEVY"] ?? 0);
  const gbtLevy = ledgerDay === null ? null : Math.round(ledgerDay["HOUSE:GBT_LEVY"] ?? 0);
  /* The levy BASE, shown so the 15% closes on the document's own face. `HOUSE:COMMISSION` is
     net of the levies, so the gross fee is the account's movement plus what was levied off it. */
  const commissionGross = ledgerDay === null || traTax === null || gbtLevy === null
    ? null
    : Math.round((ledgerDay["HOUSE:COMMISSION"] ?? 0) + traTax + gbtLevy);
  // Margin is measured against stakes that were actually retained. totalSales
  // still contains refunded stakes, which are returned in full — including them
  // understates margin every time a market voids.
  const retainedSales = totalSales - totalRefunds;
  const marginPct = retainedSales > 0 ? ((ggr / retainedSales) * 100) : 0;

  /* Net after taxes = GGR less what we hand over. All three printed values are integers read
     off (or derived from) the ledger, so the arithmetic on the face still closes exactly. */
  const netAfterTax = traTax === null || gbtLevy === null ? null : ggr - traTax - gbtLevy;

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
    const hRefunds = hTxns.filter((t) => t.type === "BET_REFUND");
    const hDep = hTxns.filter((t) => t.type === "DEPOSIT");
    const hWd = hTxns.filter((t) => t.type === "WITHDRAWAL");
    const hSales = hBets.reduce((s, t) => s + Math.abs(t.amount), 0);
    const hPay = hPayouts.reduce((s, t) => s + Math.abs(t.amount), 0);
    const hRef = hRefunds.reduce((s, t) => s + Math.abs(t.amount), 0);
    hourlyRows.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      sales: hSales,
      tickets: hBets.length,
      payouts: hPay,
      deposits: hDep.reduce((s, t) => s + t.amount, 0),
      withdrawals: hWd.reduce((s, t) => s + Math.abs(t.amount), 0),
      ggr: hSales - hPay - hRef, // net of refunds — see the GGR note above
    });
  }

  // Unique players today
  const uniquePlayers = new Set(bets.map((t) => t.userId)).size;

  return {
    title: "Daily Operations Report",
    subtitle: dateLabel,
    reference: makeReference("DAILY", generatorId),
    meta: {
      generatedAt: new Date(nowMs).toISOString(),
      generatedBy: generatorId,
      period: `${dateLabel} (EAT)`,
      classification: "Internal",
    },
    summary: [
      { label: "Total sales (TZS)", value: totalSales.toLocaleString("en-US"), tone: "good", delta: `${ticketCount} tickets` },
      { label: "GGR (TZS)", value: ggr.toLocaleString("en-US"), tone: ggr >= 0 ? "good" : "bad" },
      { label: "Margin", value: `${marginPct.toFixed(1)}%`, tone: marginPct >= 5 ? "good" : "bad" },
      /* ⛔ OMITTED, NOT ZEROED, when the ledger could not be read — see the levy note above.
         A tax tile reading "0" is indistinguishable from a day that owed nothing. */
      ...(traTax === null || gbtLevy === null || netAfterTax === null ? [] : [
        { label: `TRA ${(TRA_RATE * 100).toFixed(0)}% (booked)`, value: traTax.toLocaleString("en-US"), tone: "neutral" as const },
        { label: `GBT ${(GBT_RATE * 100).toFixed(0)}% (booked)`, value: gbtLevy.toLocaleString("en-US"), tone: "neutral" as const },
        { label: "Net after tax (TZS)", value: netAfterTax.toLocaleString("en-US"), tone: (netAfterTax >= 0 ? "good" : "bad") as "good" | "bad" },
      ]),
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
          { metric: "Gross gaming revenue (GGR)", value: ggr, count: null, note: "Sales − Payouts − Refunds" },
          { metric: "Operator margin", value: null, count: null, note: `${marginPct.toFixed(1)}%` },
          /* ⭐ THE LEVY BASE IS PRINTED BESIDE THE LEVIES, so an auditor can see the 15% close
             on the face instead of taking it on trust — and so nobody re-derives the base from
             GGR again. It is the gross settlement fee: `HOUSE:COMMISSION` movement plus the two
             levies that were debited out of it. ⛔ All four lines vanish together on a failed
             ledger read; a partial tax block is worse than none. */
          ...(traTax === null || gbtLevy === null || netAfterTax === null || commissionGross === null ? [] : [
            { metric: "Commission booked (levy base)", value: commissionGross, count: null, note: "Gross settlement fee" },
            { metric: `TRA tax (${(TRA_RATE * 100).toFixed(0)}% of commission)`, value: traTax, count: null, note: "As booked to the ledger" },
            { metric: `GBT levy (${(GBT_RATE * 100).toFixed(0)}% of commission)`, value: gbtLevy, count: null, note: "As booked to the ledger" },
            { metric: "Net after tax", value: netAfterTax, count: null, note: "GGR - TRA - GBT" },
          ]),
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
      // The stated methodology MUST match the computed one. This note previously read
      // "total stakes placed − total payouts", omitting the refund subtraction the code
      // performs — so an auditor recomputing the tax from the printed formula derived a
      // HIGHER GGR and a HIGHER liability than the document reports.
      "GGR = total stakes placed − total payouts − refunded stakes. This is the operator's " +
        "commission from the pool. Refunds are subtracted because a voided or one-sided " +
        "market returns every stake in full, so no commission is earned on it.",
      /* 🔴 THESE TWO SENTENCES WERE ALREADY TRUE WHILE THE CODE ABOVE WAS NOT. They have said
         "of operator commission" all along; the arithmetic multiplied GGR, which is ~14× larger.
         The code now matches the prose, and the prose now says where the figure comes from. */
      ...(traTax === null || gbtLevy === null ? [
        "Statutory levies are OMITTED from this report: the double-entry ledger could not be read, " +
          "and an unbacked tax figure is worse than none.",
      ] : [
        `TRA tax = ${(TRA_RATE * 100).toFixed(0)}% of operator commission (Income Tax Act, Cap 332).`,
        `GBT levy = ${(GBT_RATE * 100).toFixed(0)}% of operator commission (Gaming Board of Tanzania licensing terms).`,
        "Both levy figures are READ from the double-entry ledger (HOUSE:TRA_LEVY, HOUSE:GBT_LEVY) " +
          "for this EAT day, not recomputed from a rate — each settlement rounds its own levy, so a " +
          "rate applied to a period total would not reproduce what was booked. GGR is shown above as " +
          "a turnover measure and is NOT the levy base: it still contains stakes on open positions.",
      ]),
      "Total tax = TRA + GBT, deducted from the operator's commission — does NOT affect player payouts.",
      "Each levy is rounded to the nearest shilling before the net is derived, so the " +
        "figures on this page add up exactly as printed.",
      "Margin = GGR / (total sales − refunded stakes) × 100.",
      `Reporting day: ${dateLabel} 00:00–24:00 East Africa Time (UTC+3).`,
      "All amounts in Tanzanian Shillings (TZS).",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// 7 · KYC RE-VERIFICATION ROSTER  (internal · customer comms)
// ─────────────────────────────────────────────────────────────────────

const REVERIFY_MONTHS = 24;
const maskUserId = (id: string) => `${id.replace(/^usr_/, "").slice(0, 4)}…${id.slice(-4)}`;
const maskNidaTail = (n: string | null | undefined) => (n ? `•••• ${n.slice(-4)}` : "—");

export async function buildKycReverify(generatorId: string): Promise<Report> {
  const now = Date.now();
  // Calendar months, not 30-day approximations. `REVERIFY_MONTHS * 30 days` is 720
  // days ≈ 23.7 months, so every due date drifted ~10 days early and the "DUE NOW"
  // count was overstated. addMonths keeps the anniversary date exact.
  const addMonths = (ms: number, months: number): number => {
    const d = new Date(ms);
    const target = new Date(d);
    target.setUTCMonth(target.getUTCMonth() + months);
    // Clamp a month-end anniversary (e.g. 31 Jan + 1 month) to the last valid day
    // rather than letting it roll into the following month.
    if (target.getUTCDate() !== d.getUTCDate()) target.setUTCDate(0);
    return target.getTime();
  };
  const approved = (await db.kyc.list()).filter((k) => k.status === "APPROVED");

  let dueNow = 0, dueSoon = 0;
  const rows: Row[] = approved.map((k) => {
    const anchor = k.reviewedAt ?? k.idVerifiedAt ?? k.submittedAt ?? k.updatedAt;
    const anchorMs = anchor ? new Date(anchor).getTime() : now;
    const dueAt = addMonths(anchorMs, REVERIFY_MONTHS);
    const daysToDue = Math.round((dueAt - now) / (24 * 3600_000));
    const status = daysToDue <= 0 ? "DUE NOW" : daysToDue <= 90 ? "DUE ≤ 90d" : "OK";
    if (status === "DUE NOW") dueNow++; else if (status === "DUE ≤ 90d") dueSoon++;
    return {
      player: maskUserId(k.userId),
      idDoc: k.idType ? `${k.idType} ${maskNidaTail(k.idNumber)}` : maskNidaTail(k.idNumber),
      verifiedOn: anchor ? anchor.slice(0, 10) : "—",
      dueOn: new Date(dueAt).toISOString().slice(0, 10),
      daysToDue,
      status,
    };
  }).sort((a, b) => (a.daysToDue as number) - (b.daysToDue as number));

  return {
    title: "KYC re-verification roster",
    subtitle: `Re-verify every ${REVERIFY_MONTHS} months · ${approved.length} approved identities`,
    reference: makeReference("KYCREV", generatorId),
    meta: { generatedAt: new Date().toISOString(), generatedBy: generatorId, period: `As of ${new Date().toISOString().slice(0, 10)}`, classification: "Internal" },
    summary: [
      { label: "Approved identities", value: approved.length.toLocaleString("en-US") },
      { label: "Due now", value: dueNow.toLocaleString("en-US"), tone: dueNow > 0 ? "bad" : "good" },
      { label: "Due within 90 days", value: dueSoon.toLocaleString("en-US"), tone: dueSoon > 0 ? "neutral" : "good" },
    ],
    sections: [{
      title: "Re-verification roster",
      titleSw: "Orodha ya uthibitisho upya",
      description: `Soonest-due first. Re-verification is triggered every ${REVERIFY_MONTHS} months from the last approval, or on a phone/region change.`,
      columns: [
        { header: "Player", key: "player", width: 18 },
        { header: "Document", key: "idDoc", width: 22 },
        { header: "Verified on", key: "verifiedOn", format: "date", width: 16 },
        { header: "Re-verify by", key: "dueOn", format: "date", width: 16 },
        { header: "Days to due", key: "daysToDue", format: "integer", align: "right", width: 12 },
        { header: "Status", key: "status", width: 14 },
      ],
      rows,
    }],
    notes: [
      `Re-verification interval: ${REVERIFY_MONTHS} months from last approval (or on phone/region change).`,
      "Identity number shown masked (last 4), beside the document type it came from — the full number lives only in the verification record.",
      "Drives the customer-comms outreach queue; not a regulator filing.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// 8 · RESPONSIBLE-GAMBLING ENGAGEMENT  (internal · RG audit)
// ─────────────────────────────────────────────────────────────────────

/**
 * Every `rg.*` audit action the platform WRITES today — a CLOSED, exported list, passed to the
 * durable read so the database filters on it instead of the reader scanning a category window.
 *
 * ⛔ IT IS A LIST OF ACTIONS THAT OCCUR, NOT OF ACTIONS WE IMAGINE. `rg.reality_check.continued`
 * is READ (`/admin/compliance`) and never written by any code path — reality-check prompts fire
 * client-side and nothing posts them back (PROGRESS L30). Putting it here would make this a list
 * whose membership nobody can measure, and `test:house-bot-reports` §0 walks every `audit({...})`
 * call under `src/` in both directions: an `rg.*` written and not listed is red, and an entry here
 * with no writer is red.
 *
 * Writers, measured: `responsible-gambling.ts` (the limit change and its deferred twin,
 * self-exclusion, cooling-off), `market-service.ts` (the session-time refusal),
 * `admin/players/[id]/actions.ts` (an officer reopening a served exclusion).
 */
export const RG_AUDIT_ACTIONS = [
  "rg.limit.changed",
  "rg.limit.increase.deferred",
  "rg.self_exclusion.activated",
  "rg.cooling_off.activated",
  "rg.session_limit.enforced",
  "rg.self_exclusion.reopened",
] as const;

/** Rows of RG history this document tabulates. Past it the section says so, in the platform's own
 *  truncation sentence — the same shape the match-integrity refunds table uses. */
const RG_EVENT_LIMIT = 200;

export async function buildRgEngagement(generatorId: string): Promise<Report> {
  const roster = await rgRosterCounts();
  const now = Date.now();

  const limitRows: Row[] = [];
  let withAnyLimit = 0;
  for (const u of await db.user.list()) {
    const r = await db.responsible.get(u.id);
    if (!r) continue;
    const hasLimit = r.dailyDepositLimit !== null || r.weeklyDepositLimit !== null || r.monthlyDepositLimit !== null || r.dailyLossLimit !== null || r.sessionTimeLimitMin !== null;
    const sx = r.selfExclusionUntil && new Date(r.selfExclusionUntil).getTime() > now;
    const co = r.coolingOffUntil && new Date(r.coolingOffUntil).getTime() > now;
    // E-408 — a pending change is keyed on its effective time (a pending REMOVAL carries `to = null`).
    const pending = !!(r.pendingIncreaseEffectiveAt || r.pendingWeeklyIncreaseEffectiveAt || r.pendingMonthlyIncreaseEffectiveAt || r.pendingLossLimitEffectiveAt || r.pendingSessionLimitEffectiveAt);
    if (!hasLimit && !sx && !co && !pending) continue;
    if (hasLimit) withAnyLimit++;
    limitRows.push({
      player: maskUserId(u.id),
      dailyDeposit: r.dailyDepositLimit,
      weeklyDeposit: r.weeklyDepositLimit,
      monthlyDeposit: r.monthlyDepositLimit,
      dailyLoss: r.dailyLossLimit,
      sessionMin: r.sessionTimeLimitMin,
      realityCheckMin: r.realityCheckIntervalMin,
      pendingIncrease: r.pendingIncreaseTo,
      selfExcludedUntil: sx ? r.selfExclusionUntil!.slice(0, 10) : "—",
      cooledOffUntil: co ? r.coolingOffUntil!.slice(0, 10) : "—",
    });
  }

  // Self-exclusion / cool-off events from the COMPLIANCE audit TABLE (rg.* actions).
  //
  // 🔴 IT WAS THE RING, AND THE RING IS NOT THE LOG (C5-SPEC ruling 214). `getAuditPage` served at
  // most the last 500 entries of ONE container's in-memory ring, across every category — so a busy
  // hour of wallet and market rows pushed every self-exclusion out of the window, and a deploy
  // emptied it entirely. This document then printed an EMPTY "Self-exclusion & cool-off events"
  // table under a note claiming those activations are written to the log and shown above.
  //
  // ⭐ THE CATEGORY IS PASSED as well as the actions: `AuditLog` has no index on `action`, and
  // `@@index([category, createdAt])` turns a walk of the whole chain into a range scan of one
  // category. Every action in the list is COMPLIANCE by construction.
  const rg = await getAuditByActionsDurable(RG_AUDIT_ACTIONS, { category: "COMPLIANCE", limit: RG_EVENT_LIMIT });
  const events = rg.entries.map((e) => ({
    at: formatDateTime(e.createdAt),
    event: e.action.replace("rg.", "").replace(/[._]/g, " "),
    player: e.targetId ? maskUserId(e.targetId) : "—",
  }));

  return {
    title: "Responsible-gambling engagement",
    subtitle: "Player-protection controls, limits, and self-exclusion activity",
    // Landscape: the limits grid is ten columns (five money limits + session/
    // reality-check/pending/exclusion dates) — portrait collides the "min"
    // sub-heads and wraps money values mid-number.
    orientation: "landscape",
    reference: makeReference("RGENG", generatorId),
    meta: { generatedAt: new Date().toISOString(), generatedBy: generatorId, period: `As of ${new Date().toISOString().slice(0, 10)}`, classification: "Internal" },
    summary: [
      { label: "Players with active limits", value: withAnyLimit.toLocaleString("en-US") },
      { label: "Self-excluded", value: roster.selfExcluded.toLocaleString("en-US"), tone: "neutral" },
      { label: "Cooled-off", value: roster.cooledOff.toLocaleString("en-US"), tone: "neutral" },
      { label: "Pending limit increases", value: roster.pendingLimitIncrease.toLocaleString("en-US"), tone: roster.pendingLimitIncrease > 0 ? "neutral" : "good" },
    ],
    sections: [
      {
        title: "Active player limits",
        titleSw: "Vikomo vya wachezaji",
        description: "Players who have set any deposit/loss/session limit, have a pending increase, or are self-excluded / cooled-off. All amounts in TZS.",
        columns: [
          { header: "Player", key: "player", width: 16 },
          { header: "Daily dep.", key: "dailyDeposit", format: "tzs", align: "right", width: 14 },
          { header: "Weekly dep.", key: "weeklyDeposit", format: "tzs", align: "right", width: 14 },
          { header: "Monthly dep.", key: "monthlyDeposit", format: "tzs", align: "right", width: 14 },
          { header: "Daily loss", key: "dailyLoss", format: "tzs", align: "right", width: 14 },
          { header: "Session", sub: "min", key: "sessionMin", format: "integer", align: "right", width: 10 },
          { header: "Reality chk", sub: "min", key: "realityCheckMin", format: "integer", align: "right", width: 12 },
          { header: "Pending →", key: "pendingIncrease", format: "tzs", align: "right", width: 14 },
          { header: "Self-excl until", key: "selfExcludedUntil", width: 16 },
          { header: "Cool-off until", key: "cooledOffUntil", width: 16 },
        ],
        rows: limitRows,
      },
      {
        title: "Self-exclusion & cool-off events",
        titleSw: "Matukio ya kujizuia",
        // ⛔ A CAPPED TABLE SAYS SO, in the platform's own sentence (`reports-verify-live.mts`
        // recognises "Showing the most recent"). A section that silently stops at its limit reads
        // as a complete one, and this is the document a regulator asks for.
        description: rg.truncated
          ? `Activations recorded in the compliance audit log (most recent first). Showing the most recent `
            + `${events.length.toLocaleString("en-US")} of ${rg.total.toLocaleString("en-US")}.`
          : "Activations recorded in the compliance audit log (most recent first).",
        columns: [
          { header: "When", key: "at", width: 22 },
          { header: "Event", key: "event", width: 28 },
          { header: "Player", key: "player", width: 18 },
        ],
        rows: events,
      },
    ],
    notes: [
      "Limit changes, self-exclusions, and cool-offs are written to the COMPLIANCE audit log and shown above.",
      "Reality-check prompts fire client-side every 30 min (LCCP SR 3.4.1); per-fire counts are not yet centrally persisted, so they are not tabulated here — wire a server beacon to add them.",
      "Player identifiers are masked; the full record is available in the player drill-in.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// 9 · MATCH-INTEGRITY QUARTERLY REVIEW  (Sportradar + GBT integrity unit)
// ─────────────────────────────────────────────────────────────────────

export async function buildMatchIntegrity(generatorId: string): Promise<Report> {
  const { listMarkets } = await import("../market-service");
  // REGULATOR READ → productLine "ALL". This report reconciles voided markets against
  // BET_REFUND transactions, and that refund total already includes every product. A
  // voided Up & Down round refunds real money, so leaving it out would show refunds
  // with no market to explain them — the exact discrepancy an inspector looks for.
  const voidedMarkets = await listMarkets({ status: "VOIDED", productLine: "ALL" });
  const refunds = (await db.txn.listAll()).filter((t) => t.type === "BET_REFUND");
  const refundTotal = refunds.reduce((s, t) => s + Math.abs(t.amount), 0);

  /**
   * 🔴 L57's third item — the missing "Resolution path" column, added 2026-09-20.
   *
   * The note above used to tell the regulator every void came from "the two-officer resolution flow". It does not:
   * single-admin resolution is the permanent default and two-officer is an optional toggle
   * (`scripts/two-admin-policy.test.mts`, owner decision 2026-07-24). Correcting the note to say the path is
   * recorded per adjudication left an obvious gap — the pack then pointed at a record it did not print.
   *
   * ⛔ DERIVED FROM THE MARKET'S OWN STAGE FIELDS, not from a second read and not from the toggle's CURRENT value.
   * The toggle's value today says nothing about how a market sealed last month; `market-service.ts:3335` records
   * `resolutionAuth` on the adjudication for exactly that reason. The same two facts that drive it —
   * `resolutionStage1By` and `resolutionStage2By` — are already on every row this builder has in hand, so the
   * column costs no query and cannot disagree with the audit entry about the same market.
   *
   * ⛔ AND THE THIRD STATE IS NAMED. A void with no stage-2 officer is "single-officer"; with a DIFFERENT stage-2
   * officer it is "two-officer"; with stage-2 equal to stage-1 it is neither, and printing either word would be a
   * false statement about a dual control. That case is "—" and the note says unrecorded, because an em-dash is the
   * honest answer for a path we cannot name — the same grammar the compliance card uses for an unmeasured rate.
   */
  const resolutionPath = (m: { resolutionStage1By?: string | null; resolutionStage2By?: string | null }) => {
    const one = m.resolutionStage1By ?? null;
    const two = m.resolutionStage2By ?? null;
    if (!one && !two) return "—";
    if (two && one && two !== one) return "Two-officer";
    if (!two) return "Single-officer";
    return "—";
  };

  const marketRows: Row[] = voidedMarkets.map((m) => ({
    market: m.titleEn,
    category: m.category,
    voidedOn: (m.resolutionStage2At ?? m.updatedAt ?? "").slice(0, 10) || "—",
    path: resolutionPath(m),
    pool: m.yesPool + m.noPool,
    predictors: m.predictorCount,
  }));

  // Refunds grouped by market (a refund txn carries positionId; group by description/positionId tail).
  const refundRows: Row[] = refunds.slice(0, 200).map((t) => ({
    when: t.createdAt.slice(0, 10),
    player: maskUserId(t.userId),
    amount: Math.abs(t.amount),
    ref: t.providerRef ?? t.positionId ?? t.id,
  }));

  return {
    // Titled "quarterly" but computed over all history — the cadence is how often it
    // is FILED, not the window it covers. Say which, rather than let a reader assume
    // these figures describe one quarter.
    title: "Match-integrity review",
    subtitle: "Voided markets, refunded stakes, and integrity activity — cumulative to date",
    reference: makeReference("INTEG", generatorId),
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: generatorId,
      period: `Cumulative to ${eatDateLabel(Date.now())} (EAT) — not a single quarter`,
      classification: "Regulator hand-off",
    },
    summary: [
      { label: "Voided markets", value: voidedMarkets.length.toLocaleString("en-US"), tone: voidedMarkets.length > 0 ? "neutral" : "good" },
      { label: "Refund transactions", value: refunds.length.toLocaleString("en-US"), tone: "neutral" },
      { label: "Stakes refunded (TZS)", value: Math.round(refundTotal).toLocaleString("en-US"), tone: "neutral" },
    ],
    sections: [
      {
        title: "Voided markets",
        titleSw: "Masoko yaliyobatilishwa",
        description: "Markets resolved as VOID — stakes returned to players. Pool in TZS.",
        columns: [
          { header: "Market", key: "market", width: 46 },
          { header: "Category", key: "category", width: 16 },
          { header: "Voided on", key: "voidedOn", format: "date", width: 14 },
          // L57 · the path that sealed THIS void, derived from its own stage officers — never from the toggle's
          // current value, which says nothing about how a market sealed last month.
          { header: "Resolution path", key: "path", width: 18 },
          { header: "Pool", sub: "TZS", key: "pool", format: "tzs", align: "right", width: 16 },
          { header: "Predictors", key: "predictors", format: "integer", align: "right", width: 12 },
        ],
        rows: marketRows,
      },
      {
        title: "Stake refunds",
        titleSw: "Marejesho ya dau",
        // The table is capped but the totals row reports the FULL set. Say so on both,
        // so a reader cannot add up the visible rows, get a different number, and lose
        // confidence in the document. Same discipline as the X-Export-Truncated header
        // on the transactions CSV.
        description:
          refunds.length > refundRows.length
            ? `Individual stake refunds posted to player wallets. Showing the most recent ` +
              `${refundRows.length} of ${refunds.length}; the total below covers all ${refunds.length}.`
            : "Individual stake refunds posted to player wallets.",
        columns: [
          { header: "Date", key: "when", format: "date", width: 14 },
          { header: "Player", key: "player", width: 18 },
          { header: "Amount", sub: "TZS", key: "amount", format: "tzs", align: "right", width: 16 },
          { header: "Reference", key: "ref", width: 28 },
        ],
        rows: refundRows,
        totals: {
          when: refunds.length > refundRows.length ? "Total (all)" : "Total",
          player: "",
          amount: refundTotal,
          ref: `${refunds.length} refunds`,
        },
      },
    ],
    notes: [
      // 🔴 L57 (C5-D20-REPLAN ruling 268), corrected 2026-09-20. This note told the regulator the voids came from
      // "the two-officer resolution flow", naming a control that is NOT in force by default. The owner decision of
      // 2026-07-24, pinned end-to-end by `scripts/two-admin-policy.test.mts`, is the opposite: single-admin
      // resolution is the PERMANENT DEFAULT in all money modes, a position-holding admin may resolve, and
      // two-officer authorisation is an OPTIONAL TOGGLE with NO real-money hard-lock. Claiming a dual-control a
      // regulator would weigh, while it may be switched off, is the most expensive sentence on this page.
      // ⭐ The replacement does not swing to the other error either — it does not assert single-admin, because the
      // toggle may be ON. It states what is true in both states and points at the record that answers it per case:
      // the suite's own §D notes "the adjudication records which authorization path sealed it".
      "This report aggregates platform-side integrity activity: markets voided through the resolution flow and the resulting stake refunds. The authorisation path that sealed each void — single-officer or two-officer, per the policy in force at the time — is printed per row under Resolution path, and is derived from that void's own stage officers. A dash means the path is not recorded for that market; the full case detail is in the market resolution audit trail.",
      "The Sportradar Integrity Services feed is a stub adapter — external alerts are not yet ingested. When live, per-alert case files will be appended here.",
      "Player identifiers are masked; full case detail is in the market resolution audit trail.",
    ],
    signatures: await regulatorSignatures(generatorId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// CATALOGUE (id → builder)
// ─────────────────────────────────────────────────────────────────────

export const REPORT_CATALOGUE = {
  "daily-ops":   { name: "Daily Operations Report", build: buildDailyOps },
  "gbt-monthly": { name: "Monthly report", build: buildGbtMonthly },
  "fiu-sar":     { name: "FIU SAR",             build: buildFiuSar },
  "sx-register": { name: "Self-exclusion Register", build: buildSxRegister },
  "iso-audit":   { name: "ISO 27001 Audit Log", build: buildIsoAudit },
  "kyc-reverify":   { name: "KYC re-verification roster", build: buildKycReverify },
  "rg-engagement":  { name: "Responsible-gambling engagement", build: buildRgEngagement },
  "match-integrity":{ name: "Match-integrity quarterly review", build: buildMatchIntegrity },
  /**
   * ⭐ THE ONLY WINDOWED ENTRY, AND THE FLAG IS HOW THE ROUTE KNOWS. `windowed` tells
   * `/api/admin/reports/[id]` to resolve `?range/from/to` through the SAME `resolveRange` the
   * console used and hand the result to the builder as a further argument — the shape
   * `buildGbtMonthly(generatorId, packPeriod = …)` already proved is compatible both with this
   * `as const` registry and with a route that calls `entry.build(userId)`. Every other entry
   * carries no flag and is not touched.
   * ⛔ `gbt-monthly` STAYS FIXED TO ITS CALENDAR MONTH. It is the statutory pack; following a
   * picker is exactly what it must not do. The two now sit under separate labels on the finance
   * page so an officer cannot mistake one for the other.
   */
  "finance-window": {
    name: "Finance — selected window",
    windowed: true,
    build: (generatorId: string, win?: FinanceWindowArg) =>
      buildFinanceWindow(generatorId, makeReference, win),
  },
} as const;

export type ReportId = keyof typeof REPORT_CATALOGUE;

/**
 * ⭐ ONE ANSWER TO "DOES THIS REPORT TAKE A WINDOW?", read off the registry itself rather than
 * re-listed by each surface. The route uses it to decide whether to resolve `?range/from/to`;
 * the reports library uses it to decide whether to hand the button its page's window. A second
 * hand-typed list of windowed ids is exactly the shape that lets a console and a route disagree
 * about what a URL means.
 */
export function isWindowedReport(id: string): boolean {
  const entry = (REPORT_CATALOGUE as Record<string, { windowed?: boolean }>)[id];
  return entry?.windowed === true;
}

/** The house entries' ids and the audit actions the route writes for them — a closed list (C5-SPEC ruling 170). */
export { HOUSE_REPORT_IDS, HOUSE_REPORT_AUDIT_ACTIONS } from "./house-report-ids";
