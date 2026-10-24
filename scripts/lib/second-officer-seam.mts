/**
 * FEE-TAX R1 · THE OWNER'S "SECOND-OFFICER CHECKS" IN A SUITE (ruling 6 of 2026-10-24; `src/lib/server/second-officer-policy.ts`).
 *
 * ⭐ NOTHING STORED IS OFF — the Owner's ruling is the default (his go-live answers of 2026-10-24: the setting goes live OFF,
 *    with no click after the release). A read that FAILS is ON, and a stored row always wins. So a suite moves the setting
 *    the way production meets it, through the setting's own store seam (`__setSecondOfficerStoreForTests`) and its REAL
 *    reader — never by a flag beside it:
 *      · "stored-on"   — a stored, well-formed ON row, exactly what only the Owner's audited act writes: every check refuses
 *                        as it did before R1;
 *      · "stored-off"  — a stored, well-formed OFF row: the same officer acts;
 *      · "absent"      — the store answers that no row exists: the Owner's ruling, OFF;
 *      · "read-fails"  — the store answers that it could not be asked (`ok: false`): ON;
 *      · "read-throws" — the store throws: ON.
 * ⭐ A suite that asserts the refusals as they stood before R1 says so ONCE, at its top (`holdSecondOfficerChecksOn`), and
 *    runs one act in another position inside `withSecondOfficerChecks(state, act)` (or `withSecondOfficerChecksOff`), which
 *    puts back exactly the store the suite had, whatever the act did. A check that stopped asking the setting therefore stays
 *    refused under a stored OFF here, and goes red.
 * ⛔ IMPORT ORDER: the policy module is loaded on the first call, never on import, so a suite may import this helper before
 *    it has chosen its store.
 */
export type SecondOfficerState = "stored-on" | "stored-off" | "absent" | "read-fails" | "read-throws";

/** The rows the Owner's act writes — the shape `second-officer-policy.ts` stores and reads. */
export const SECOND_OFFICER_ON_ROW = {
  on: true,
  changedBy: "usr_owner_fixture",
  changedAt: "2026-10-24T00:00:00.000Z",
  reason: "test fixture: the checks as before R1",
};
export const SECOND_OFFICER_OFF_ROW = {
  on: false,
  changedBy: "usr_owner_fixture",
  changedAt: "2026-10-24T00:00:00.000Z",
  reason: "test fixture: any officer acts",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type StoreDeps = { hasDatabase?: () => boolean; loadConfigResult?: (key: string) => Promise<any>; saveConfig?: (key: string, value: unknown) => Promise<void> };

const policy = () => import("../../src/lib/server/second-officer-policy.ts");

/** The store seam that answers `state` through the real reader. */
export function secondOfficerStoreFor(state: SecondOfficerState): StoreDeps {
  switch (state) {
    case "stored-on": return { hasDatabase: () => true, loadConfigResult: async () => ({ ok: true as const, value: SECOND_OFFICER_ON_ROW }) };
    case "stored-off": return { hasDatabase: () => true, loadConfigResult: async () => ({ ok: true as const, value: SECOND_OFFICER_OFF_ROW }) };
    case "absent": return { hasDatabase: () => true, loadConfigResult: async () => ({ ok: true as const, value: null }) };
    case "read-fails": return { hasDatabase: () => true, loadConfigResult: async () => ({ ok: false as const, error: "test fixture: the store could not be asked" }) };
    case "read-throws": return { hasDatabase: () => true, loadConfigResult: async () => { throw new Error("test fixture: the store threw"); } };
  }
}

/** From here on, for the rest of the suite (or until the next hold), the setting reads `state`. */
export async function holdSecondOfficerChecks(state: SecondOfficerState): Promise<void> {
  (await policy()).__setSecondOfficerStoreForTests(secondOfficerStoreFor(state));
}

/** ⭐ The Owner's stored ON for the rest of the suite: every second-officer check refuses as it did before R1. */
export async function holdSecondOfficerChecksOn(): Promise<void> {
  await holdSecondOfficerChecks("stored-on");
}

/** Run ONE act with the setting reading `state`, then put back exactly the store the suite had — whatever the act did. */
export async function withSecondOfficerChecks<T>(state: SecondOfficerState, act: () => Promise<T>): Promise<T> {
  const p = await policy();
  const before = p.__setSecondOfficerStoreForTests(secondOfficerStoreFor(state));
  try {
    return await act();
  } finally {
    p.__setSecondOfficerStoreForTests(before);
  }
}

/** One act with the Owner's stored OFF: the same officer acts. */
export function withSecondOfficerChecksOff<T>(act: () => Promise<T>): Promise<T> {
  return withSecondOfficerChecks("stored-off", act);
}

/** One act with the Owner's stored ON: the check refuses as before R1. */
export function withSecondOfficerChecksOn<T>(act: () => Promise<T>): Promise<T> {
  return withSecondOfficerChecks("stored-on", act);
}
