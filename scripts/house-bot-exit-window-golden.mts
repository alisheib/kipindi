/**
 * HOUSE BOTS · A14 GOLDEN GRID CAPTURE — run ONCE, before the exit-window extraction.
 *
 *   tsx scripts/house-bot-exit-window-golden.mts
 *
 * ⛔ WHY THIS FILE EXISTS. Build commit 2 extracts `exitWindowClosesAt` out of `cashOutValue`
 * (sanctioned change (k), 04 A14), and `cashOutValue` is a PLAYER money path: its output must be
 * byte-identical after the refactor. A golden snapshot written by the refactored code would prove
 * nothing, so this script captured `scripts/fixtures/house-bot-exit-window-golden.json` from the code
 * as it stood before the extraction, and `test:house-bot-seam` deep-equals the live output against it.
 *
 * ⛔ IT REFUSES TO OVERWRITE. Re-capturing after the refactor would turn the comparison into a check
 * built from the value it checks. Delete the file by hand only with a written reason in PROGRESS.md.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT_WINDOW_GRID, exitGridCase } from "./lib/house-bot-exit-grid.mts";

process.env.DATABASE_URL = "";
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "fixtures", "house-bot-exit-window-golden.json");
if (existsSync(out)) {
  console.error(`refusing to overwrite ${out}: the golden grid must come from the pre-refactor code`);
  process.exit(2);
}

const { cashOutValue } = await import("../src/lib/server/market-service.ts");
const realNow = Date.now;
const rows: Array<{ id: string; out: unknown }> = [];
try {
  for (const c of EXIT_WINDOW_GRID) {
    const { position, market, nowMs } = exitGridCase(c);
    Date.now = () => nowMs;
    rows.push({ id: c.id, out: await cashOutValue(position, market) });
  }
} finally {
  Date.now = realNow;
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ capturedFrom: "cashOutValue before the A14 extraction", count: rows.length, rows }, null, 1) + "\n");
console.log(`wrote ${rows.length} golden rows to ${out}`);
