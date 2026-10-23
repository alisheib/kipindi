/** Pure companion to S16: a wrong count, missing hold/audit, or a section past the lock's budget must make the wide proof red. */
import { heldWideProblems, SECTION_BUDGET_MS, type HeldReadback, type HeldRelease } from "./s16-maswali-held-verdict.mts";

const N = 7_000;
// S7-F8 · a release whose holds take several sections of the chain lock: the whole release runs past 30 s, every section inside it.
const release: HeldRelease = { ok: true, already: false, previewHeld: N, settleMs: 120_000, spans: [10_100, 10_050, 29_999] };
const held: HeldReadback = { players: N, suspended: N, frozenWallets: N, heldTickets: N, auditRows: N, auditUsers: N };
let pass = 0;
function ok(label: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL ${label}`);
  pass++;
  console.log(`PASS ${label}`);
}

ok("control · every held winner, wallet and durable audit is present, every section of the lock inside its budget", heldWideProblems(N, release, held).length === 0);
ok("the budget is the chain lock's own 30 seconds", SECTION_BUDGET_MS === 30_000);
ok("a release longer than the budget whose every section fits it is accepted (the sections are the transactions)",
  heldWideProblems(N, { ...release, settleMs: 600_000 }, held).length === 0);
ok("one unheld preview winner is refused", heldWideProblems(N, { ...release, previewHeld: N - 1 }, held).includes("previewHeld"));
ok("a refused release is refused", heldWideProblems(N, { ...release, ok: false }, held).includes("release"));
ok("a duplicate release is refused", heldWideProblems(N, { ...release, already: true }, held).includes("release"));
ok("a section at the 30-second boundary is refused", heldWideProblems(N, { ...release, spans: [10_000, 30_000] }, held).includes("spans"));
ok("a section that never closed (no last write) is refused", heldWideProblems(N, { ...release, spans: [10_000, null] }, held).includes("spans"));
ok("a release with no section measured is refused", heldWideProblems(N, { ...release, spans: [] }, held).includes("spans"));
ok("a release time that is not a time is refused", heldWideProblems(N, { ...release, settleMs: Number.NaN }, held).includes("settleMs"));
for (const key of ["players", "suspended", "frozenWallets", "heldTickets", "auditRows", "auditUsers"] as const) {
  ok(`one missing ${key} is refused`, heldWideProblems(N, release, { ...held, [key]: N - 1 }).includes(key));
}
ok("a missing read-back is refused", heldWideProblems(N, release, null).length === 6);
console.log(`s16-maswali-held-verdict: ${pass} passed, 0 failed`);
