/** Pure companion to S16: a wrong count, missing hold/audit, or timeout must make the wide proof red. */
import { heldWideProblems, type HeldReadback, type HeldRelease } from "./s16-maswali-held-verdict.mts";

const N = 7_000;
const release: HeldRelease = { ok: true, already: false, previewHeld: N, settleMs: 29_999 };
const held: HeldReadback = { players: N, suspended: N, frozenWallets: N, heldTickets: N, auditRows: N, auditUsers: N };
let pass = 0;
function ok(label: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL ${label}`);
  pass++;
  console.log(`PASS ${label}`);
}

ok("control · every held winner, wallet and durable audit is present within the budget", heldWideProblems(N, release, held).length === 0);
ok("one unheld preview winner is refused", heldWideProblems(N, { ...release, previewHeld: N - 1 }, held).includes("previewHeld"));
ok("a refused release is refused", heldWideProblems(N, { ...release, ok: false }, held).includes("release"));
ok("a duplicate release is refused", heldWideProblems(N, { ...release, already: true }, held).includes("release"));
ok("the 30-second boundary is refused", heldWideProblems(N, { ...release, settleMs: 30_000 }, held).includes("settleMs"));
for (const key of ["players", "suspended", "frozenWallets", "heldTickets", "auditRows", "auditUsers"] as const) {
  ok(`one missing ${key} is refused`, heldWideProblems(N, release, { ...held, [key]: N - 1 }).includes(key));
}
ok("a missing read-back is refused", heldWideProblems(N, release, null).length === 6);
console.log(`s16-maswali-held-verdict: ${pass} passed, 0 failed`);
