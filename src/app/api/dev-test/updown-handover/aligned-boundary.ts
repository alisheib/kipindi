/** A QA-only whole-minute boundary for a real service-created round. */
export const QA_ALIGNED_MIN_LEAD_MS = 60_000;

export function qaAlignedOpenAt(nowMs: number, spanMs: number): string {
  if (!Number.isFinite(nowMs) || !Number.isInteger(spanMs) || spanMs <= 0) {
    throw new Error("Invalid QA round clock or span");
  }
  const closeMs = Math.ceil((nowMs + QA_ALIGNED_MIN_LEAD_MS) / 60_000) * 60_000;
  return new Date(closeMs - spanMs).toISOString();
}
