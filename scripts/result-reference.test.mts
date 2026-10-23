/**
 * test:result-reference — A RESULT'S UNBROKEN TOKEN NEVER LEAVES ONE CHARACTER ALONE (MASWALI-BUILD FLOW 4, the lead's ruling
 * of 2026-10-23; DESIGN_AUTHORITY §M4a rule 5). Found on the slip's deposit: the classic wallet's result drew
 * "txn_b7f5f7cd59628ee1bb86d11" over a lone "3" at 360.
 *
 *   npx tsx scripts/result-reference.test.mts               (npm run test:result-reference)
 *   npx tsx scripts/result-reference.test.mts --prove-red   (npm run red:result-reference — each plant on disk, restored)
 *
 * §1 THE CHUNKS (`lib/even-break.ts`): a token of 16+ characters with no space is cut into near-equal chunks — two halves,
 *    or one per ~14 characters — that join back to the exact string, the shortest never under 7; a short value or one with
 *    a space is left to wrap as text.
 * §2 THE DRAWING (`OperationResultModal`'s `DetailValue`): the chunks with a break opportunity (`<wbr>`) between them and
 *    nowhere else, the value's box no longer `break-all` for such a token (`overflow-wrap: break-word` as the floor), every
 *    other value as it was.
 * The browser proof (a real deposit's reference at 320/360 × sw/en/zh, its lines measured, with an in-page control) is
 * `qa:result-reference`. Pure and static: no server, no database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EVEN_BREAK_MAX_CHUNK, EVEN_BREAK_MIN_LENGTH, evenBreakChunks } from "../src/lib/even-break.ts";
import { DetailValue } from "../src/components/markets/operation-result-modal.tsx";
import { decomment } from "./lib/decomment.mts";
import { MUTATIONS } from "./anchors/result-reference.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = "scripts/result-reference.test.mts";

if (process.argv.includes("--prove-red")) {
  let caught = 0, missed = 0;
  for (const plant of MUTATIONS) {
    const target = resolve(ROOT, plant.file);
    const before = readFileSync(target, "utf8");
    try {
      writeFileSync(target, injectDefect(before, plant.from, plant.to));
      const run = spawnSync(process.execPath, ["--import", "tsx", SELF], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      const out = `${run.stdout}\n${run.stderr}`;
      const red = run.status !== 0 && plant.failure.test(out);
      if (red) caught++; else missed++;
      console.log(`${red ? "RED caught" : "MISSED"}: ${plant.name}${red ? "" : ` — exit ${run.status}; ${out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).join(" | ")}`}`);
    } finally {
      writeFileSync(target, before);
    }
    if (readFileSync(target, "utf8") !== before) { console.log(`FILE LEFT DIRTY: ${plant.file}`); missed++; }
  }
  console.log(`\nresult-reference RED: ${caught}/${MUTATIONS.length} caught, ${missed} missed`);
  process.exit(missed === 0 && caught === MUTATIONS.length ? 0 : 1);
}

let passed = 0, failed = 0;
const ok = (name: string, condition: boolean, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
};

// ── §1 · the chunks ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the chunks");
const TXN = "txn_b7f5f7cd59628ee1bb86d113";
const txn = evenBreakChunks(TXN);
ok("1.1 · ⭐ the wallet's 28-character transaction id is two halves of 14 that join back to the exact id",
  JSON.stringify(txn) === JSON.stringify(["txn_b7f5f7cd59", "628ee1bb86d113"]), JSON.stringify(txn));
let worst = { len: 0, min: Infinity, joins: true, spread: 0 };
for (let len = EVEN_BREAK_MIN_LENGTH; len <= 160; len++) {
  const token = Array.from({ length: len }, (_, i) => "abcdefghij0123456789"[i % 20]).join("");
  const c = evenBreakChunks(token) ?? [];
  const lens = c.map((x) => x.length);
  const min = Math.min(...lens), spread = Math.max(...lens) - min;
  if (min < worst.min || c.join("") !== token || spread > worst.spread) worst = { len, min: Math.min(min, worst.min), joins: worst.joins && c.join("") === token, spread: Math.max(spread, worst.spread) };
  if (Math.max(...lens) > EVEN_BREAK_MAX_CHUNK && c.length > 2) worst.joins = false;
}
ok("1.2 · ⛔ every token of 16–160 characters joins back exactly, its chunks differ by one character at most, and none is shorter than 7",
  worst.joins && worst.spread <= 1 && worst.min >= 7, JSON.stringify(worst));
const SHORT = ["TZS 1,000", "When the week settles", "MLN-2026-W49", "", "123456789012345"];
ok("1.3 · a short value, or one with a space, wraps as text — no chunks", SHORT.every((v) => evenBreakChunks(v) === null));
ok("1.4 · a Millionea serial (20 characters) is two halves of 10", JSON.stringify(evenBreakChunks("MLN-2026-W49-0001234")) === JSON.stringify(["MLN-2026-W", "49-0001234"]));

// ── §2 · the drawing ────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the drawing");
const drawn = renderToStaticMarkup(h(DetailValue, { value: TXN }));
ok("2.1 · ⭐ the modal draws the id's halves with ONE break opportunity between them — and the text is the exact id",
  drawn === "<span>txn_b7f5f7cd59</span><span><wbr/>628ee1bb86d113</span>" && drawn.replace(/<[^>]+>/g, "") === TXN, drawn);
ok("2.2 · any other value is drawn exactly as it was", renderToStaticMarkup(h(DetailValue, { value: "TZS 1,000" })) === "TZS 1,000");
const modal = decomment(readFileSync(resolve(ROOT, "src/components/markets/operation-result-modal.tsx"), "utf8")).replace(/\s+/g, " ");
// The token's own branch, and every other value's markup exactly as before FLOW 4 (`test:sell-grace-truth` 6.model reads it).
ok("2.3 · ⭐ such a token gets its own box — no break-all, break-word the floor, its chunks drawn — and every other value keeps its box exactly as it was",
  modal.includes("{evenBreakChunks(d.value) ? (")
    && modal.includes('<p data-detail-value className="min-w-0 ml-auto text-right font-mono text-[14px] font-bold tabular-nums [word-break:normal] [overflow-wrap:break-word]"')
    && modal.includes("<DetailValue value={d.value} />")
    && modal.includes('<p className="min-w-0 ml-auto text-right font-mono text-[14px] font-bold tabular-nums break-all"') && modal.includes("> {d.value} </p>"));

const FLOOR = 7;
ok(`floor · at least ${FLOOR} checks ran before this one`, passed + failed >= FLOOR, `${passed + failed} ran`);
console.log(`\nresult-reference: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
