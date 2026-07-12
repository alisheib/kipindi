/**
 * ADM1 — Regulator report-pack signing model (Batch 3 §1).
 *
 * The monthly Gaming Board pack moves through a mandatory maker-checker chain:
 *   Draft → Prepared → Approved → Submitted → Acknowledged
 * with two DISTINCT officers (the preparer cannot approve their own pack).
 *
 * State is DERIVED from the immutable audit trail — each transition is an
 * append-only `pack.*` ADMIN audit event on the pack's targetId. This needs no
 * schema migration, works identically in dev and prod, and is tamper-evident
 * (the same HMAC chain that proves the reports themselves). Nothing here is
 * fabricated: every signature is a real actor + real timestamp, and the
 * artifact hash is the sha256 of the actual rendered PDF.
 */
import { getAuditPage } from "./audit";
import { officerLabel } from "./actor-label";

export type PackState = "draft" | "prepared" | "approved" | "submitted" | "acknowledged";

export const PACK_STEPS: { state: PackState; label: string; sw: string }[] = [
  { state: "draft", label: "Draft", sw: "Rasimu" },
  { state: "prepared", label: "Prepared", sw: "Imeandaliwa" },
  { state: "approved", label: "Approved", sw: "Imeidhinishwa" },
  { state: "submitted", label: "Submitted", sw: "Imewasilishwa" },
  { state: "acknowledged", label: "Acknowledged", sw: "Imepokelewa" },
];

export type PackArtifact = { filename: string; sizeBytes: number; sha256: string; reference: string };

export type ReportPack = {
  packId: string;
  period: string;          // "YYYY-MM" (EAT)
  periodLabel: string;     // "June 2026"
  state: PackState;
  preparedBy: string | null;
  preparedByName: string | null;
  preparedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  submittedBy: string | null;
  submittedByName: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedRef: string | null;
  artifact: PackArtifact | null;
};

/** The statutory pack's period key. The Gaming Board monthly pack reports the
 *  PREVIOUS complete calendar month, so in July we assemble June's pack. */
export function currentPackPeriod(now = Date.now()): string {
  // First day of this EAT month, minus one day → some day in the previous month.
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const mo = Number(parts.find((p) => p.type === "month")!.value);
  const prevMonthUtc = new Date(Date.UTC(y, mo - 1, 1) - 24 * 3600_000); // last day of previous month
  const py = prevMonthUtc.getUTCFullYear();
  const pm = String(prevMonthUtc.getUTCMonth() + 1).padStart(2, "0");
  return `${py}-${pm}`;
}

export function packPeriodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Epoch [start, end) bounds for a YYYY-MM pack period, in EAT (Africa/Dar_es_Salaam,
 *  fixed UTC+3, no DST). The statutory figures MUST cover exactly this calendar
 *  month — not a rolling 28-day window — so the pack's numbers match its label. */
export function packPeriodBounds(period: string): { start: number; end: number } {
  const [y, m] = period.split("-").map(Number);
  const EAT_OFFSET_MS = 3 * 3600_000;
  return { start: Date.UTC(y, m - 1, 1) - EAT_OFFSET_MS, end: Date.UTC(y, m, 1) - EAT_OFFSET_MS };
}

export function packIdFor(period: string): string {
  return `gbt-monthly:${period}`;
}


/** Derive the pack's current state + signatures from the audit trail. */
export async function getReportPack(period = currentPackPeriod()): Promise<ReportPack> {
  const packId = packIdFor(period);
  // Newest-first; the first match of each action is its latest occurrence.
  const events = getAuditPage({ category: "ADMIN", limit: 10000 }).filter(
    (e) => e.targetId === packId && e.action.startsWith("pack."),
  );
  const prepared = events.find((e) => e.action === "pack.prepared");
  const approved = events.find((e) => e.action === "pack.approved");
  const submitted = events.find((e) => e.action === "pack.submitted");
  const acknowledged = events.find((e) => e.action === "pack.acknowledged");

  const state: PackState = acknowledged ? "acknowledged"
    : submitted ? "submitted"
    : approved ? "approved"
    : prepared ? "prepared"
    : "draft";

  const [preparedByName, approvedByName, submittedByName] = await Promise.all([
    officerLabel(prepared?.actorId ?? null),
    officerLabel(approved?.actorId ?? null),
    officerLabel(submitted?.actorId ?? null),
  ]);

  const art = prepared?.payload as { filename?: string; sizeBytes?: number; sha256?: string; reference?: string } | undefined;
  const artifact: PackArtifact | null = art?.sha256
    ? { filename: art.filename ?? `GB-${period}.pdf`, sizeBytes: art.sizeBytes ?? 0, sha256: art.sha256, reference: art.reference ?? "" }
    : null;

  return {
    packId,
    period,
    periodLabel: packPeriodLabel(period),
    state,
    preparedBy: prepared?.actorId ?? null,
    preparedByName,
    preparedAt: prepared?.createdAt ?? null,
    approvedBy: approved?.actorId ?? null,
    approvedByName,
    approvedAt: approved?.createdAt ?? null,
    submittedBy: submitted?.actorId ?? null,
    submittedByName,
    submittedAt: submitted?.createdAt ?? null,
    acknowledgedAt: acknowledged?.createdAt ?? null,
    acknowledgedRef: (acknowledged?.payload as { reference?: string } | undefined)?.reference ?? null,
    artifact,
  };
}
