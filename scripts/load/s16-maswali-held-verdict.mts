/** Source-only verdict for S16's disposable-Postgres all-held wide-winner shape. */
export type HeldRelease = {
  ok: boolean;
  already: boolean;
  previewHeld: number | null;
  settleMs: number;
};

export type HeldReadback = {
  players: number;
  suspended: number;
  frozenWallets: number;
  heldTickets: number;
  auditRows: number;
  auditUsers: number;
};

/** Name every failed fact so a timing failure cannot masquerade as a clean read-back. */
export function heldWideProblems(expected: number, release: HeldRelease | null, held: HeldReadback | null): string[] {
  if (!Number.isSafeInteger(expected) || expected <= 0) throw new Error("heldWideProblems needs a positive winner count");
  const problems: string[] = [];
  if (release?.ok !== true || release.already !== false) problems.push("release");
  if (release?.previewHeld !== expected) problems.push("previewHeld");
  if (typeof release?.settleMs !== "number" || !Number.isFinite(release.settleMs) || release.settleMs < 0 || release.settleMs >= 30_000) problems.push("settleMs");
  for (const key of ["players", "suspended", "frozenWallets", "heldTickets", "auditRows", "auditUsers"] as const) {
    if (held?.[key] !== expected) problems.push(key);
  }
  return problems;
}
