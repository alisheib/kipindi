/** U43: the outer Postgres lock must have enough time to settle a full book. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(process.env.U43_LOCK_BUDGET_ROOT ?? fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFileSync(join(root, path), "utf8");
const locks = ts.createSourceFile("locks.ts", read("src/lib/server/locks.ts"), ts.ScriptTarget.Latest, true);
const market = ts.createSourceFile("market-service.ts", read("src/lib/server/market-service.ts"), ts.ScriptTarget.Latest, true);
let passed = 0, failed = 0;
function check(label, condition) {
  if (condition) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.log(`FAIL ${label}`); }
}
function topFunction(file, name) {
  const found = file.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  if (found.length !== 1 || !found[0].body) throw new Error(`Expected one complete ${name} declaration`);
  return found[0];
}
function executable(file, name, dependencies) {
  const source = topFunction(file, name).getText(file).replace(/^export\s+/, "");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(dependencies), `${compiled}\nreturn ${name};`)(...Object.values(dependencies));
}
function declarations(node, name) {
  const found = [];
  function visit(current) {
    if (ts.isVariableDeclaration(current) && current.name.getText() === name) found.push(current);
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}
function timeoutExpression(name, operand) {
  const found = declarations(topFunction(market, name), "timeoutMs")
    .filter((declaration) => declaration.initializer?.getText(market).includes(operand));
  if (found.length !== 1) throw new Error(`Expected one ${name} ${operand} budget`);
  return found[0].initializer.getText(market);
}

// Execute the production function body with a fake adapter. This reads values
// and arguments, not a mention of "timeout" in prose or another function.
let database = true;
const advisoryCalls = [], memoryCalls = [];
const tx = { kind: "one transaction" };
const withLock = executable(locks, "withLock", {
  hasDatabase: () => database,
  withAdvisoryLock: async (key, callback, timeoutMs) => {
    advisoryCalls.push({ key, timeoutMs });
    return callback(tx);
  },
  withMemoryLock: async (key, callback) => {
    memoryCalls.push(key);
    return callback(null);
  },
});
const seen = await withLock("wallet:u43", async (client) => client);
check("default outer lock uses 30 seconds and passes one transaction to its callback",
  seen === tx && advisoryCalls.at(-1)?.key === "wallet:u43" && advisoryCalls.at(-1)?.timeoutMs === 30_000);
await withLock("wallet:u43", async () => undefined, { timeoutMs: 90_000 });
check("a bounded holder budget reaches the advisory lock unchanged",
  advisoryCalls.at(-1)?.timeoutMs === 90_000);
await withLock("wallet:u43", async () => undefined, { timeoutMs: 600_000 });
check("ten minutes is the accepted upper boundary", advisoryCalls.at(-1)?.timeoutMs === 600_000);
for (const bad of [29_999, 600_001, 60_000.5, Number.NaN]) {
  const before = advisoryCalls.length;
  let refused = false;
  try { await withLock("wallet:u43", async () => undefined, { timeoutMs: bad }); }
  catch { refused = true; }
  check(`invalid timeout ${String(bad)} is refused before a transaction`, refused && advisoryCalls.length === before);
}
database = false;
const memory = await withLock("wallet:u43", async (client) => client, { timeoutMs: 90_000 });
check("memory store keeps its null-transaction lock path", memory === null && memoryCalls.at(-1) === "wallet:u43");

let transactionOptions = null, rawLockCalls = 0, committedCalls = 0;
const pgTx = { $executeRaw: async () => { rawLockCalls++; } };
const withAdvisoryLock = executable(locks, "withAdvisoryLock", {
  prisma: () => ({ $transaction: async (callback, options) => {
    transactionOptions = options;
    return callback(pgTx);
  } }),
  hashKey64: () => 1n,
  lockStore: { getStore: () => null, run: (_context, callback) => callback() },
  runCommitted: () => { committedCalls++; },
});
const returned = await withAdvisoryLock("wallet:u43", async (client) => client, 90_000);
check("advisory transaction receives the override and its callback receives that same client",
  returned === pgTx && transactionOptions?.timeout === 90_000 && transactionOptions?.maxWait === 10_000
    && rawLockCalls === 1 && committedCalls === 1);
await withAdvisoryLock("wallet:u43", async () => undefined);
check("direct advisory caller retains the 30-second default", transactionOptions?.timeout === 30_000);

const settle = topFunction(market, "settleMarket").getText(market);
const emergency = topFunction(market, "emergencyVoidMarket").getText(market);
const settleBudget = new Function("plannedOpen", `return (${timeoutExpression("settleMarket", "plannedOpen.length")});`);
const emergencyBudget = new Function("observedOpenCount", `return (${timeoutExpression("emergencyVoidMarket", "observedOpenCount")});`);
for (const [count, expected] of [[0, 30_000], [1, 30_050], [100, 35_000], [20_000, 600_000]]) {
  check(`settlement budget for ${count} open positions is ${expected}ms`, settleBudget(Array(count)) === expected);
  check(`emergency void budget for ${count} open positions is ${expected}ms`, emergencyBudget(count) === expected);
}
check("ordinary settlement passes the budget on its outer wallet or zero-holder market lock",
  settle.includes("index === 0 ? { timeoutMs } : undefined")
  && settle.includes("sortedHolders.length === 0 ? { timeoutMs } : undefined"));
check("emergency void passes the budget on its outer wallet or zero-holder market lock",
  emergency.includes("i === 0 ? { timeoutMs } : undefined")
  && emergency.includes("ids.length === 0 ? withLock(`market:${opts.marketId}`, () => fn(), { timeoutMs })")
  && emergency.includes("withHolderLocks([...holderIds].sort(), timeoutMs,"));

console.log(`u43-lock-budget: ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
