/** Executes the local WP11a observer against hostile populations; no real session, store, environment or server. */
import { readFileSync } from "node:fs";
import { transform } from "esbuild";

const source = readFileSync(new URL("../src/app/api/dev-test/bet-sheet-observe/route.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
let passed = 0, failed = 0;
function check(label: string, ok: boolean) { if (ok) passed++; else { failed++; console.error(`FAIL ${label}`); } }
async function run(code: string, env: Record<string, string> = {}, user: string | null = "own", database = false, query = "marketId=mkt_test") {
  const reads: unknown[] = [];
  const module = { exports: {} as { GET?: (req: Request) => Promise<Response> } };
  const imported: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json", ...init.headers } }) } },
    "@/lib/server/auth-service": { currentSession: async () => { reads.push("session"); return user ? { userId: user } : null; } },
    "@/lib/server/prisma": { hasDatabase: () => database },
    "@/lib/server/market-dal": { positionStore: { listForUserAndMarket: async (uid: string, marketId: string) => {
      reads.push(["positions", uid, marketId]);
      return [
        { id: "mine", userId: "own", idempotencyKey: "own-key", houseBotId: null, phone: "secret" },
        { id: "other", userId: "stranger", idempotencyKey: "other-key", houseBotId: null, phone: "secret" },
        { id: "house", userId: "own", idempotencyKey: "house-key", houseBotId: "house" },
      ];
    } } },
    "@/lib/server/store": { db: { txn: { findByUserTypes: async (uid: string, types: string[], limit: number) => {
      reads.push(["txns", uid, types.join(), limit]);
      return [
        { id: "t-own", userId: "own", positionId: "mine", houseBotId: null },
        { id: "t-stranger", userId: "stranger", positionId: "mine", houseBotId: null },
        { id: "t-other-market", userId: "own", positionId: "elsewhere", houseBotId: null },
        { id: "t-house", userId: "own", positionId: "mine", houseBotId: "house" },
      ];
    } } } },
  };
  const built = await transform(code, { loader: "ts", format: "cjs" });
  new Function("require", "process", "exports", "module", built.code)((name: string) => {
    if (!(name in imported)) throw new Error(`Unexpected dependency: ${name}`);
    return imported[name];
  }, { env: { NODE_ENV: "development", ...env } }, module.exports, module);
  const response = await module.exports.GET!(new Request(`http://localhost:3000/api/dev-test/bet-sheet-observe?${query}`));
  return { status: response.status, body: await response.json(), cache: response.headers.get("Cache-Control"), reads };
}
for (const [label, env, database, status] of [
  ["production", { NODE_ENV: "production" }, false, 404],
  ["database env present", { DATABASE_URL: "not-a-real-address" }, false, 409],
  ["configured database", {}, true, 409],
] as const) {
  const result = await run(source, env, "own", database);
  check(`${label}: refused before any session or record read`, result.status === status && result.reads.length === 0);
}
const guest = await run(source, {}, null);
check("guest refused; no store read", guest.status === 401 && guest.reads.join() === "session");
for (const query of ["", "marketId=bad%20id", "marketId=mkt_test&userId=stranger"]) {
  const result = await run(source, {}, "own", false, query);
  check(`bad or spoofed scope ${query}: no store read`, result.status === 400 && result.reads.join() === "session");
}
const own = await run(source);
check("both stores asked for exactly the session's own identity", JSON.stringify(own.reads) === JSON.stringify(["session", ["positions", "own", "mkt_test"], ["txns", "own", "BET_PLACED", Number.MAX_SAFE_INTEGER]]));
check("hostile foreign/house/unrelated rows are excluded, projection carries no PII", JSON.stringify(own.body) === JSON.stringify({ ok: true, marketId: "mkt_test", positionCount: 1, betPlacedCount: 1, positions: [{ positionId: "mine", key: "own-key" }], transactionIds: ["t-own"] }));
check("evidence cannot be cached", own.cache === "no-store");
for (const [label, from, to, env, database, expected] of [
  ["production guard", 'process.env.NODE_ENV === "production"', "false", { NODE_ENV: "production" }, false, 404],
  ["database guard", "process.env.DATABASE_URL || hasDatabase()", "false", { DATABASE_URL: "not-a-real-address" }, false, 409],
  ["configured DB guard", "process.env.DATABASE_URL || hasDatabase()", "false", {}, true, 409],
] as const) {
  check(`plant ${label} has one anchor`, source.split(from).length === 2);
  const result = await run(source.replace(from, to), env, "own", database);
  check(`RED ${label} removed is detected`, result.status !== expected || result.reads.length !== 0);
}
console.log(`bet-sheet-observe: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
