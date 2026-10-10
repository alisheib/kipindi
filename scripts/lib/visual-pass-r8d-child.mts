/**
 * One store's run of `test:visual-pass-r8d-stores` (R8-D, 2026-10-10). The two-store runner starts this file twice — once on
 * the memory store, once on a fresh scratch Postgres — because every store picks its backend when it is first imported, so a
 * store is a process. `HB_MONEY_STORE` names the store; every line printed carries it.
 *
 * The cases are `scripts/lib/visual-pass-r8d-cases.mts`, shared with `test:visual-pass-r8d`, which runs them in memory.
 */
import { runR8dServiceCases } from "./visual-pass-r8d-cases.mts";

const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};

const { onPostgres } = await runR8dServiceCases(ok);
ok(`0.store · the cases ran on the ${STORE} store`, onPostgres === (STORE === "postgres"), `onPostgres ${onPostgres}`);

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
