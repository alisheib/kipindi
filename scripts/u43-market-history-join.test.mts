/** U43 B4: one market-price/history join case list on memory and throwaway PostgreSQL. */
import { spawnSync } from "node:child_process";
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

// A machine may have DATABASE_URL while deliberately selecting the memory DAL.
// Run the same case list in that mixed configuration before the two-store runner.
const raw = process.env.VERIFY_DATABASE_URL ?? "";
if (!raw || !["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(raw).hostname)) {
  throw new Error("Mixed-store proof requires the loopback scratch cluster");
}
const mixed = spawnSync("npx", ["tsx", "scripts/lib/u43-market-history-join-cases.mts"], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: raw, USE_PRISMA_DAL: "false", HB_MONEY_STORE: "mixed" },
  encoding: "utf8", shell: process.platform === "win32", timeout: 60_000,
});
process.stdout.write(mixed.stdout ?? "");
if (mixed.stderr) process.stderr.write(mixed.stderr);
if (mixed.status !== 0 || !/@@SUMMARY \{"pass":12,"fail":0\}/.test(mixed.stdout ?? "")) {
  throw new Error("Mixed configuration (DATABASE_URL present, memory DAL selected) failed its chart join proof");
}

await runTwoStores({
  suite: "test:u43-market-history-join",
  casesFile: "scripts/lib/u43-market-history-join-cases.mts",
  minPass: { memory: 12, postgres: 13 },
  dbPrefix: "u43_card_history_join",
});
