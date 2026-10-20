/**
 * Apply a seal batch one slot at a time. An earlier seal cannot be rolled back when a later
 * slot refuses, so the result always names the slots that actually landed and notes their
 * device even on a partial result. The caller refreshes the week after this result.
 */
export type SealBatchResult =
  | { ok: true; sealed: number[]; auditWarning: string | null }
  | { ok: false; error: string; sealed: number[]; auditWarning: string | null };

export type SealBatchRow = { slot: number; outcome: "YES" | "NO" | "VOID"; evidence: string };

/** Reject the whole submitted batch before its first irreversible seal. */
export function parseSealRows(raw: string): SealBatchRow[] | string {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return "The seals could not be read."; }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 15) return "Seal between one and fifteen questions at once.";
  const seen = new Set<number>();
  const rows: SealBatchRow[] = [];
  for (const value of parsed) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "Each seal needs a question, a result and evidence.";
    const row = value as Record<string, unknown>;
    if (typeof row.slot !== "number" || !Number.isInteger(row.slot) || row.slot < 1 || row.slot > 15 ||
        (row.outcome !== "YES" && row.outcome !== "NO" && row.outcome !== "VOID") || typeof row.evidence !== "string") {
      return "Each seal needs a valid question, result and evidence.";
    }
    if (seen.has(row.slot)) return `Slot ${row.slot} appears more than once.`;
    seen.add(row.slot);
    rows.push({ slot: row.slot, outcome: row.outcome, evidence: row.evidence });
  }
  return rows;
}

export async function applySealBatch<T extends { slot: number }>(
  rows: readonly T[],
  seal: (row: T) => Promise<{ ok: boolean; error?: string }>,
  noteDevice: (sealed: number[]) => Promise<void>,
  safeFailure: (error: unknown) => string,
): Promise<SealBatchResult> {
  const sealed: number[] = [];
  let failure: string | null = null;
  for (const row of rows) {
    try {
      const result = await seal(row);
      if (!result.ok) {
        failure = `Slot ${row.slot}: ${result.error ?? "The seal was refused."}`;
        break;
      }
      sealed.push(row.slot);
    } catch (error) {
      failure = `Slot ${row.slot}: ${safeFailure(error)}`;
      break;
    }
  }

  let auditWarning: string | null = null;
  if (sealed.length) {
    try {
      await noteDevice([...sealed]);
    } catch {
      auditWarning = "The device record could not be checked after these seals landed. Tell an administrator; do not repeat those seals.";
    }
  }
  return failure ? { ok: false, error: failure, sealed, auditWarning } : { ok: true, sealed, auditWarning };
}

/** Remove only confirmed successes; failed and unattempted inputs remain ready for review. */
export function withoutSealedPicks<T>(picks: Readonly<Record<number, T>>, sealed: readonly number[]): Record<number, T> {
  const remaining = { ...picks };
  for (const slot of sealed) delete remaining[slot];
  return remaining;
}
