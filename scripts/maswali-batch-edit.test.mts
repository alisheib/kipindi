/** Focused memory and disposable-Postgres proof of atomic Maswali builder saves. */
import { spawnSync } from "node:child_process";
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

if (process.argv.includes("--prove-red")) {
  const result = spawnSync("npx", ["tsx", "scripts/lib/maswali-batch-edit-child.mts", "--prove-red"], {
    encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory" },
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}

await runTwoStores({ suite: "test:maswali-batch-edit", casesFile: "scripts/lib/maswali-batch-edit-child.mts", minPass: 13, dbPrefix: "mlw_batch_edit" });
