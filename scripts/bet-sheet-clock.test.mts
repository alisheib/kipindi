/** Executes the clock fixture's doors and exact service arguments; no actual clock, database, session or user mutation. */
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
const source = readFileSync(new URL("../src/app/api/dev-test/bet-sheet-clock/route.ts", import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (name: string, test: boolean) => { if (test) passed++; else { failed++; console.error(`FAIL ${name}`); } };
async function run(code = source, options: { env?: Record<string, string>; database?: boolean; guest?: boolean; real?: boolean; body?: unknown; limit?: number } = {}) {
  const calls: unknown[] = [], module = { exports: {} as { POST?: (req: Request) => Promise<Response> } };
  const imports: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (value: unknown, init?: ResponseInit) => new Response(JSON.stringify(value), init) } },
    "@/lib/server/auth-service": { currentSession: async () => { calls.push("session"); return options.guest ? null : { userId: "own" }; } },
    "@/lib/server/prisma": { hasDatabase: () => options.database ?? false },
    "@/lib/server/store": { db: { user: { findById: async (uid: string) => { calls.push(["user", uid]); return options.real ? { role: "PLAYER", displayName: "Real player", phoneE164: "+255700000000" } : { role: "PLAYER", displayName: "Local Sheet Matrix", phoneE164: "+255711234567" }; } } } },
    "@/lib/server/responsible-gambling": {
      getRgSettings: async (uid: string) => { calls.push(["settings", uid]); return { sessionTimeLimitMin: options.limit ?? 15 }; },
      checkSessionTimeLimit: async (uid: string, start: number, now: number) => { calls.push(["gate", uid, start, now]); return { exceeded: true, limitMin: 15, playedMin: Math.floor((now - start) / 60000) }; },
    },
  };
  const built = await transform(code, { loader: "ts", format: "cjs" });
  new Function("require", "process", "module", "exports", built.code)((id: string) => imports[id], { env: { NODE_ENV: "development", ...options.env } }, module, module.exports);
  const response = await module.exports.POST!(new Request("http://localhost:3043/api/dev-test/bet-sheet-clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body ?? { elapsedMin: 16 }) }));
  return { response, calls, body: await response.json() };
}
for (const options of [{ env: { NODE_ENV: "production" } }, { env: { DATABASE_URL: "not-real" } }, { database: true }]) {
  const got = await run(source, options); check("production/database refuse before auth, reads or gate write", [404,409].includes(got.response.status) && got.calls.length === 0);
}
check("guest stops at auth", JSON.stringify((await run(source, { guest: true })).calls) === '["session"]');
for (const body of [{ elapsedMin: 16, userId: "stranger" }, { elapsedMin: 16, phone: "foreign" }, { elapsedMin: 14 }, { elapsedMin: 121 }, { elapsedMin: 16.5 }, {}]) {
  const got = await run(source, { body }); check("foreign scope or unbounded clock never reaches a store or gate", got.response.status === 400 && JSON.stringify(got.calls) === '["session"]');
}
const real = await run(source, { real: true }); check("a real user is refused before settings/gate", real.response.status === 403 && real.calls.length === 2);
const noLimit = await run(source, { limit: 30 }); check("a limit not actually15 is refused before gate", noLimit.response.status === 409 && noLimit.calls.length === 3);
const own = await run(); const gate = own.calls.at(-1) as [string, string, number, number];
check("actual service receives own identity, 16-minute earlier start and the same present time", gate[0] === "gate" && gate[1] === "own" && gate[3] - gate[2] === 16 * 60000);
check("projection contains only truthful standing, no PII, uncached", JSON.stringify(own.body) === '{"ok":true,"standing":{"exceeded":true,"limitMin":15,"playedMin":16}}' && own.response.headers.get("Cache-Control") === "no-store");
for (const [from, options] of [
  ['process.env.NODE_ENV === "production"', { env: { NODE_ENV: "production" } }],
  ["process.env.DATABASE_URL || hasDatabase()", { env: { DATABASE_URL: "not-real" } }],
] as const) {
  check("single guard mutation anchor", source.split(from).length === 2);
  const red = await run(source.replace(from, "false"), options); check("RED removed door exposes forbidden service call and fails verdict", red.calls.some(call => Array.isArray(call) && call[0] === "gate"));
}
console.log(`bet-sheet-clock: ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
