/**
 * session-registry — E-381 §6 items 2 and 3: the registry must never turn a DATABASE failure into a
 * sign-out, and must never report a sign-in it did not record.
 *
 * 🔴 ① `dbGet` caught every Prisma error and returned `null`, and `session.ts` read `null` as "no
 *    active session" — so one pool timeout signed out every player not warm in the instance's Map.
 * 🔴 ② `setActiveSessionId` wrote the in-process cache, then swallowed the database write's error —
 *    so a login whose row never persisted looked successful until the next deploy or instance.
 * ⚠️ ③ Found while fixing (2026-09-14): the Map is never invalidated across instances, so a cache
 *    hit that disagrees with the cookie can be STALE. It must be re-read before anyone is told they
 *    were displaced.
 *
 * Drives the real module against a fake Prisma client (the `globalThis.__50PICK_PRISMA` singleton
 * `prisma()` returns). No database, no network.
 *   npx tsx scripts/session-registry.test.mts
 */
process.env.DATABASE_URL = "postgresql://fake:fake@127.0.0.1:1/none";

type Row = { userId: string; sessionId: string };
const table = new Map<string, Row>();
let failRead: null | { code: string } = null;
let failWrites: Array<{ code: string }> = [];
let reads = 0;
const fake = {
  activeSession: {
    async findUnique({ where }: { where: { userId: string } }) {
      reads++;
      if (failRead) throw Object.assign(new Error("simulated"), failRead);
      return table.get(where.userId) ?? null;
    },
    async upsert({ where, create, update }: { where: { userId: string }; create: Row; update: { sessionId: string } }) {
      const f = failWrites.shift();
      if (f) throw Object.assign(new Error("simulated"), f);
      const cur = table.get(where.userId);
      table.set(where.userId, cur ? { ...cur, ...update } : create);
    },
    async deleteMany({ where }: { where: { userId: string } }) {
      table.delete(where.userId);
      return { count: 1 };
    },
  },
};
(globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = fake;
(globalThis as { __50PICK_ACTIVE_SESSIONS?: Map<string, string> }).__50PICK_ACTIVE_SESSIONS = new Map();

const reg = await import("../src/lib/server/session-registry");
const cache = (globalThis as { __50PICK_ACTIVE_SESSIONS?: Map<string, string> }).__50PICK_ACTIVE_SESSIONS!;
const quiet = console.error;
console.error = () => {};

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); } else { fails.push(label); console.log(`FAIL ${label} ${extra}`); }
};

// ① A read failure is UNKNOWN, not absent.
table.set("u1", { userId: "u1", sessionId: "s1" });
failRead = { code: "P2024" };
const r1 = await reg.readActiveSession("u1", "s1");
ok("① a pool timeout on the read is `unavailable`, never `absent`", r1.state === "unavailable", JSON.stringify(r1));
ok("① and nothing is cached from a failed read", !cache.has("u1"));
failRead = { code: "P1001" };
ok("① a non-transient read failure is also `unavailable`", (await reg.readActiveSession("u1", "s1")).state === "unavailable");
failRead = null;
const r2 = await reg.readActiveSession("u1", "s1");
ok("① the database answering again gives the row", r2.state === "active" && r2.sessionId === "s1", JSON.stringify(r2));
ok("① and the answer is cached", cache.get("u1") === "s1");
ok("① a genuinely missing row is `absent`", (await reg.readActiveSession("nobody", "sX")).state === "absent");

// ② A write that fails leaves no trace, and says so.
failWrites = [{ code: "P1001" }];
let threw: unknown = null;
try { await reg.setActiveSessionId("u2", "s2"); } catch (e) { threw = e; }
ok("② a failed registry write THROWS", threw instanceof reg.SessionRegistryWriteError, String(threw));
ok("② and the cache was NOT written (no session this instance alone believes in)", !cache.has("u2"));
failWrites = [{ code: "P2024" }];
threw = null;
try { await reg.setActiveSessionId("u2", "s2"); } catch (e) { threw = e; }
ok("② a single transient write failure is retried once and lands", threw === null && table.get("u2")?.sessionId === "s2" && cache.get("u2") === "s2", String(threw));
failWrites = [{ code: "P2024" }, { code: "P2024" }];
threw = null;
try { await reg.setActiveSessionId("u3", "s3"); } catch (e) { threw = e; }
ok("② two transient failures give up and throw", threw instanceof reg.SessionRegistryWriteError && !cache.has("u3"));

// ③ A disagreeing cache hit is confirmed before it is believed.
table.set("u4", { userId: "u4", sessionId: "s4-new" }); // a newer sign-in, handled by ANOTHER instance
cache.set("u4", "s4-old");                               // this instance still remembers the old one
reads = 0;
const r4 = await reg.readActiveSession("u4", "s4-new");
ok("③ a stale cache hit does not call the newest session displaced", r4.state === "active" && r4.sessionId === "s4-new", JSON.stringify(r4));
ok("③ it re-read the database, and refreshed the cache", reads === 1 && cache.get("u4") === "s4-new");
reads = 0;
await reg.readActiveSession("u4", "s4-new");
ok("③ an agreeing cache hit costs no read (the hot path stays a memory hit)", reads === 0);
table.delete("u5"); cache.set("u5", "s5");
const r5 = await reg.readActiveSession("u5", "other");
ok("③ a cached id whose row is gone reads `absent`, and leaves the cache", r5.state === "absent" && !cache.has("u5"));
cache.set("u6", "s6-old"); table.set("u6", { userId: "u6", sessionId: "s6-new" }); failRead = { code: "P2024" };
ok("③ a disagreement the database cannot confirm is `unavailable`, not displaced", (await reg.readActiveSession("u6", "s6-new")).state === "unavailable");
failRead = null;

// ④ E-381 §6 item 12 · a revocation on ANOTHER instance reaches this one within the cache TTL.
{
  const at = (globalThis as { __50PICK_ACTIVE_SESSIONS_AT?: Map<string, number> }).__50PICK_ACTIVE_SESSIONS_AT!;
  table.set("u7", { userId: "u7", sessionId: "s7" });
  await reg.readActiveSession("u7", "s7");                  // warm: cached and confirmed now
  table.delete("u7");                                        // a suspension handled by another container
  reads = 0;
  const warm = await reg.readActiveSession("u7", "s7");
  ok("④ inside the TTL an agreeing hit is still a memory answer (no read on the hot path)", warm.state === "active" && reads === 0);
  at.set("u7", Date.now() - reg.CACHE_TTL_MS - 1);          // the TTL passes
  const later = await reg.readActiveSession("u7", "s7");
  ok("④ after the TTL the database is asked, and the revocation holds here too", later.state === "absent" && reads === 1 && !cache.has("u7"), JSON.stringify(later));
}

console.error = quiet;
console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILED"} — ${pass} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
