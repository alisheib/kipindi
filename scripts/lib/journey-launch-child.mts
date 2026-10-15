/**
 * One store's run of `test:journey-launch` (S13 WP2). The two-store runner starts this file twice — once on the memory
 * store, once on a fresh scratch Postgres — because a store picks its backend when it is first imported, so a store is a
 * process. `HB_MONEY_STORE` names the store; every line printed carries it.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
import { loadLaunch, runLaunchCases } from "./journey-launch-cases.mts";

const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};

const { JL, impl } = await loadLaunch();
const { onPostgres } = await runLaunchCases(ok, impl, JL);
ok(`0.store · the cases ran on the ${STORE} store`, onPostgres === (STORE === "postgres"), `onPostgres ${onPostgres}`);

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
