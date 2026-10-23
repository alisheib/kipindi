/** Source-only verdict for S16's disposable-Postgres all-held wide-winner shape. */
export type HeldRelease = {
  ok: boolean;
  already: boolean;
  previewHeld: number | null;
  /** The whole release, its holds' sections included (reported; no single transaction spans it). */
  settleMs: number;
  /** S7-F8 · each section of the chain lock the release took, in ms (lock wait included; the last ends at its last write). */
  spans: Array<number | null>;
};

export type HeldReadback = {
  players: number;
  suspended: number;
  frozenWallets: number;
  heldTickets: number;
  auditRows: number;
  auditUsers: number;
};

/** The chain lock's own transaction budget (`src/lib/server/locks.ts`): every section of a release must close inside it. */
export const SECTION_BUDGET_MS = 30_000;

/** Name every failed fact so a timing failure cannot masquerade as a clean read-back. */
export function heldWideProblems(expected: number, release: HeldRelease | null, held: HeldReadback | null): string[] {
  if (!Number.isSafeInteger(expected) || expected <= 0) throw new Error("heldWideProblems needs a positive winner count");
  const problems: string[] = [];
  if (release?.ok !== true || release.already !== false) problems.push("release");
  if (release?.previewHeld !== expected) problems.push("previewHeld");
  if (typeof release?.settleMs !== "number" || !Number.isFinite(release.settleMs) || release.settleMs < 0) problems.push("settleMs");
  const spans = release?.spans;
  if (!Array.isArray(spans) || spans.length === 0
    || spans.some((s) => typeof s !== "number" || !Number.isFinite(s) || s < 0 || s >= SECTION_BUDGET_MS)) problems.push("spans");
  for (const key of ["players", "suspended", "frozenWallets", "heldTickets", "auditRows", "auditUsers"] as const) {
    if (held?.[key] !== expected) problems.push(key);
  }
  return problems;
}
