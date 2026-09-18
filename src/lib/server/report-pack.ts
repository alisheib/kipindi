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
import { getAuditForTargetsDurable } from "./audit";
import { officerLabel } from "./actor-label";
// The ONE place the platform decides what a day is — see `packPeriodBounds`.
import { EAT_OFFSET_MS } from "@/lib/eat-day";

export type PackState = "draft" | "prepared" | "approved" | "submitted" | "acknowledged";

export const PACK_STEPS: { state: PackState; label: string; sw: string }[] = [
  { state: "draft", label: "Draft", sw: "Rasimu" },
  { state: "prepared", label: "Prepared", sw: "Imeandaliwa" },
  { state: "approved", label: "Approved", sw: "Imeidhinishwa" },
  { state: "submitted", label: "Submitted", sw: "Imewasilishwa" },
  { state: "acknowledged", label: "Acknowledged", sw: "Imepokelewa" },
];

export type PackArtifact = { filename: string; sizeBytes: number; sha256: string; reference: string };

/**
 * The four transitions the pack's state is derived from — a CLOSED list, passed to the durable
 * read so the database filters on it.
 *
 * The other action written on this same target is `pack.approve.conflict_blocked` (a refused
 * self-approval, `pack-actions.ts`). It is deliberately NOT here: it is not a transition, and
 * naming it would let refusals crowd the real signatures out of the read below.
 */
export const PACK_STATE_ACTIONS = ["pack.prepared", "pack.approved", "pack.submitted", "pack.acknowledged"] as const;

/** How many rows of a pack's own history the durable read takes. Four transitions plus their
 *  re-runs; past this the history is reported INCOMPLETE rather than silently cut. */
const PACK_HISTORY_LIMIT = 50;

/**
 * The one sentence a truncated pack history prints, on the card and in every refusal, so the
 * screen and the server say the same words.
 */
export const PACK_HISTORY_INCOMPLETE_LINE = "Pack history could not be read completely — do not sign";

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
  /**
   * The durable read hit its limit, so `state` and the signatures below are derived from a window
   * that may not hold every transition. TRUE means "do not sign": the card says so and every
   * transition refuses.
   */
  historyIncomplete: boolean;
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
  // ⛔ THE OFFSET IS IMPORTED, NOT RETYPED. This was a function-local
  // `const EAT_OFFSET_MS = 3 * 3600_000` — the THIRD independent literal of the same
  // number, on the GBT MONTHLY PACK, which is the filing an officer signs. `eat-day.ts`
  // says it in its own header: "If you need EAT day maths anywhere else, import it; do
  // not copy the offset." Three copies agreeing is a coincidence, not a control — and
  // the one that drifts moves a month boundary on a statutory return.
  return { start: Date.UTC(y, m - 1, 1) - EAT_OFFSET_MS, end: Date.UTC(y, m, 1) - EAT_OFFSET_MS };
}

export function packIdFor(period: string): string {
  return `gbt-monthly:${period}`;
}


/**
 * Derive the pack's current state + signatures from the audit trail.
 *
 * 🔴 IT READS THE AUDIT TABLE, NOT THE RING (C5-SPEC ruling 214). `getAuditPage` serves
 * `globalThis.__50PICK_AUDIT_RING`, which is per-container, capped at 10,000 GLOBALLY across every
 * category, and EMPTIES ON EVERY DEPLOY. So the same pack read "acknowledged" on a warm instance and
 * "draft" on one that had just restarted — and a pack that reads Draft invites a second Prepare, with
 * a second officer signature on a statutory filing that was already signed and filed.
 *
 * ⛔ AND IT IS `getAuditForTargetsDurable`, NOT `getAuditByActionsDurable`. The by-actions reader
 * applies its LIMIT BEFORE any target filter, so the rows of every OTHER month's pack — and the
 * `pack.approve.conflict_blocked` rows written on this very target — would eat the window and the
 * state would be derived from a read that no longer holds its own transitions. This one filters
 * target AND action in SQL, over `@@index([targetType, targetId])`.
 *
 * ⚠️ IT NEVER THROWS ON A TRUNCATED READ. `ReportPackCard` renders ABOVE both tabs of
 * `/admin/reports`, so a throw here takes the whole page down (the library with it), and inside the
 * four server actions it is an uncaught exception rather than a refusal an officer can read. The
 * truncation is reported as `historyIncomplete`, the card prints the danger line, and
 * `readPackForTransition` below refuses every transition before it happens.
 */
export async function getReportPack(period = currentPackPeriod()): Promise<ReportPack> {
  const packId = packIdFor(period);
  // Newest-first; the first match of each action is its latest occurrence.
  const { entries: events, truncated } = await getAuditForTargetsDurable({
    targetType: "ReportPack",
    targetIds: [packId],
    actions: [...PACK_STATE_ACTIONS],
    // Genesis: a pack's signatures are its whole life, and a window would silently drop an old one.
    sinceIso: "1970-01-01T00:00:00.000Z",
    limit: PACK_HISTORY_LIMIT,
  });
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
    historyIncomplete: truncated,
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

/**
 * ⛔ THE ONE WAY A TRANSITION READS ITS PACK (ruling 214). Every one of the four maker-checker
 * actions takes its pack from here, so a history the platform could not read completely refuses
 * the transition BEFORE anything is written — never after.
 *
 * A refusal that arrives after the `audit()` append is not a refusal: the signature is on the
 * chain and the officer is told it was blocked. That is the defect this function exists to make
 * structurally impossible, which is why the actions never call `getReportPack` themselves.
 */
export async function readPackForTransition(
  period: string,
): Promise<{ ok: true; pack: ReportPack } | { ok: false; error: string }> {
  const pack = await getReportPack(period);
  if (pack.historyIncomplete) {
    return {
      ok: false,
      error: `${PACK_HISTORY_INCOMPLETE_LINE}. The pack's signing history hit the read limit, `
        + "so the state shown here may not be its real state. Read the pack's history in the audit "
        + "log before any further signature.",
    };
  }
  return { ok: true, pack };
}
