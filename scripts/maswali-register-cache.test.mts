/** The terminal register projection is reused briefly, never the page's rollout or audience gate. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { invalidateMillioneaRegisterWeek, readCachedMillioneaRegisterWeek, REGISTER_CACHE_TTL_MS } from "../src/lib/server/maswali-register-cache.ts";
import { decomment } from "./lib/decomment.mts";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (name: string) => decomment(readFileSync(join(root, name), "utf8").replace(/\r\n/g, "\n"));
const world = {
  cache: read("src/lib/server/maswali-register-cache.ts"),
  player: read("src/lib/server/maswali-player.ts"),
  page: read("src/app/millionea/register/[week]/page.tsx"),
  service: read("src/lib/server/maswali-service.ts"),
  settlement: read("src/lib/server/maswali-settlement.ts"),
};
type World = typeof world;
const check = (label: string, yes: boolean) => { if (!yes) throw new Error(label); console.log(`PASS ${label}`); };
const count = (s: string, x: string) => s.split(x).length - 1;

function sourceChecks(w: World) {
  return {
    // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the lead's H2 ruling): the page reads ONE record by its code —
    // a final week through this cache, a public week still running from the store — and still only after its gate.
    // ⚠️ RE-PINNED IN THE OPEN 2026-10-22 (S5-DESIGN-REGISTER, round 2): the gate is asked for its 404 alone — the preview
    // mark it fed is the shell's bar now (D12), so the page keeps no binding.
    pageGate: w.page.includes("  await millioneaGate();\n")
      && w.page.includes("const rec = await millioneaRegisterRecord(code);")
      && w.page.indexOf("  await millioneaGate();\n") < w.page.indexOf("const rec = await millioneaRegisterRecord(code);")
      && w.player.includes("const week = await cachedMillioneaRegisterWeek(want);"),
    publicRead: w.player.includes("return readCachedMillioneaRegisterWeek(")
      && w.player.includes("() => weekStore.getByCode(want)")
      && w.player.includes("() => millioneaRegisterWeek(want)"),
    failClosed: w.cache.includes('if (!terminalPublic(head, code)) { entries.delete(code); return null; }')
      && w.cache.includes('if (!terminalPublic(after, code)) return null;')
      && w.cache.includes('head.visibility === "PUBLIC"')
      && w.cache.includes('head.state === "SETTLED" || head.state === "VOIDED"'),
    bounded: w.cache.includes("REGISTER_CACHE_TTL_MS = 15_000")
      && w.cache.includes("current.expiresAt > now()")
      && w.cache.includes("!value.refundsPending")
      && w.cache.includes("MAX_ENTRIES = 32"),
    // S5-FIX-SRV 2 · a correction now forgets its week once the correction has COMMITTED (it runs on the lock's transaction).
    // S5-FIX-SRV (finding 2's class) · so does the week void's decision: queued on its lock's transaction, never called bare.
    // ⚠️ RE-PINNED IN THE OPEN (S6-INT 22): S6-INT 14's M-3 writes the correction's owed records before its notice, so the
    // forgetting is followed by `const recorded = …` instead of the return — still after the lock has committed, still first.
    invalidate: w.service.includes("invalidateMillioneaRegisterWeek(res.code);\n  const recorded = await recordOwed(res.owed);")
      && w.service.includes("afterCommit(lockTx, () => invalidateMillioneaRegisterWeek(week.code));")
      && count(w.service, "invalidateMillioneaRegisterWeek(week.code);") === 0
      && w.service.includes("invalidateMillioneaRegisterWeek(stamped.week.code);")
      && w.settlement.includes("invalidateMillioneaRegisterWeek(first.code);")
      && w.cache.includes("generationOf(code) !== generation"),
  };
}
const guards = sourceChecks(world);
for (const [label, yes] of Object.entries(guards)) check(`source ${label}`, yes);

let clock = Date.parse("2026-10-20T12:00:00Z");
const now = () => clock;
const code = "MLN-2026-W42";
let head = { id: "mlw_cache", code, visibility: "PUBLIC", state: "SETTLED", closedAt: "2026-10-19T12:00:00Z", updatedAt: "2026-10-20T00:00:00Z" };
let calls = 0;
const readHead = async () => head;
const project = async () => ({ refundsPending: false, value: ++calls });
const first = await readCachedMillioneaRegisterWeek(code, readHead, project, now);
const second = await readCachedMillioneaRegisterWeek(code, readHead, project, now);
check("PUBLIC terminal hit saves the second projection read", first === second && calls === 1);

invalidateMillioneaRegisterWeek(code.toLowerCase());
const invalidated = await readCachedMillioneaRegisterWeek(code, readHead, project, now);
check("explicit invalidation reloads the canonical code", invalidated?.value === 2 && calls === 2);

clock += REGISTER_CACHE_TTL_MS;
const expired = await readCachedMillioneaRegisterWeek(code, readHead, project, now);
check("the 15 second fallback expires rather than serving stale forever", expired?.value === 3 && calls === 3);

head = { ...head, updatedAt: "2026-10-20T00:00:01Z" };
const changed = await readCachedMillioneaRegisterWeek(code, readHead, project, now);
check("a changed week row bypasses the older fingerprint", changed?.value === 4 && calls === 4);

head = { ...head, visibility: "DRIVE" };
const hidden = await readCachedMillioneaRegisterWeek(code, readHead, project, now);
check("a cached PUBLIC value is not served after visibility changes", hidden === null && calls === 4);
head = { ...head, visibility: "PUBLIC", state: "RESOLVING" };
check("a nonterminal week is not served", (await readCachedMillioneaRegisterWeek(code, readHead, project, now)) === null && calls === 4);
head = { ...head, state: "SETTLED" };
const failRead = async () => { throw new Error("store unavailable"); };
let rejected = false;
try { await readCachedMillioneaRegisterWeek(code, failRead, project, now); } catch { rejected = true; }
check("an unreadable store does not fall back to a cached answer", rejected);

const pendingCode = "MLN-2026-W43";
const pendingHead = async () => ({ ...head, code: pendingCode, state: "VOIDED" });
let pendingCalls = 0;
const pendingProject = async () => ({ refundsPending: true, value: ++pendingCalls });
await readCachedMillioneaRegisterWeek(pendingCode, pendingHead, pendingProject, now);
await readCachedMillioneaRegisterWeek(pendingCode, pendingHead, pendingProject, now);
check("VOIDED refunds still pending are projected afresh", pendingCalls === 2);

const racingCode = "MLN-2026-W44";
const racingHead = async () => ({ ...head, code: racingCode });
let raceCalls = 0;
const raceProject = async () => {
  raceCalls++;
  if (raceCalls === 1) invalidateMillioneaRegisterWeek(racingCode);
  return { refundsPending: false, value: raceCalls };
};
const raced = await readCachedMillioneaRegisterWeek(racingCode, racingHead, raceProject, now);
const racedHit = await readCachedMillioneaRegisterWeek(racingCode, racingHead, raceProject, now);
check("an in-flight invalidation cannot refill an old projection", raced?.value === 2 && racedHit === raced && raceCalls === 2);

if (process.argv.includes("--prove-red")) {
  const plants: Array<{ name: string; file: keyof World; from: string; to: string; fails: keyof typeof guards }> = [
    { name: "page skips cache", file: "player", from: "const week = await cachedMillioneaRegisterWeek(want);", to: "const week = await millioneaRegisterWeek(want);", fails: "pageGate" },
    { name: "page reads before its gate", file: "page", from: "  await millioneaGate();\n", to: "  await Promise.resolve();\n", fails: "pageGate" },
    { name: "no PUBLIC check", file: "cache", from: 'head.visibility === "PUBLIC"', to: "true", fails: "failClosed" },
    { name: "cache outlives TTL", file: "cache", from: "current.expiresAt > now()", to: "true", fails: "bounded" },
    { name: "pending refunds cached", file: "cache", from: "!value.refundsPending", to: "true", fails: "bounded" },
    { name: "correction does not invalidate", file: "service", from: "invalidateMillioneaRegisterWeek(res.code);\n  const recorded = await recordOwed(res.owed);", to: "const recorded = await recordOwed(res.owed);", fails: "invalidate" },
    { name: "the void forgets its week before its decision commits", file: "service", from: "afterCommit(lockTx, () => invalidateMillioneaRegisterWeek(week.code));", to: "invalidateMillioneaRegisterWeek(week.code);", fails: "invalidate" },
    { name: "settlement does not invalidate", file: "settlement", from: "invalidateMillioneaRegisterWeek(first.code);", to: "", fails: "invalidate" },
    { name: "late in-flight reader repopulates", file: "cache", from: "generationOf(code) !== generation", to: "false", fails: "invalidate" },
  ];
  for (const plant of plants) {
    check(`${plant.name} anchor unique`, count(world[plant.file], plant.from) === 1);
    check(`${plant.name} turns ${plant.fails} red`, sourceChecks({ ...world, [plant.file]: world[plant.file].replace(plant.from, plant.to) })[plant.fails] === false);
  }
}
console.log(`MASWALI register cache ${process.argv.includes("--prove-red") ? "red proof" : "guard"} passed`);
