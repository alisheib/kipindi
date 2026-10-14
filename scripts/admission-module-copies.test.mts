/** Admission across independently esbuild-compiled copies. No real Prisma/monitoring import, SQL, HTTP or money call. */
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import { injectDefect, resolveAnchor } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/admission-module-copies.anchors.mjs";

type Limits = { maxInFlight: number; maxQueue: number; maxWaitMs: number };
type Snapshot = { inFlight: number; queueDepth: number; admitted: number; shed: number; timedOut: number; limits: Limits };
type API = {
  setAdmissionLimits: (limits: Partial<Limits>) => Limits;
  getAdmissionLimits: () => Limits;
  admissionSnapshot: () => Snapshot;
  __resetAdmission: () => void;
  withAdmission: <T>(fn: () => Promise<T>, options?: { maxWaitMs?: number }) => Promise<T>;
  inAdmission: () => boolean;
  runOutsideAdmission: <T>(fn: () => T) => T;
};
const source = readFileSync(new URL("../src/lib/server/admission.ts", import.meta.url), "utf8");
async function compiledCopy(code: string, registry: object): Promise<API> {
  const built = await transform(code, { loader: "ts", format: "cjs", target: "node24" });
  const module = { exports: {} };
  const imports: Record<string, unknown> = {
    "node:async_hooks": { AsyncLocalStorage }, "./prisma": { connectionLimit: () => 20 },
    "./monitoring": { captureServerError: async () => undefined },
  };
  new Function("require", "module", "exports", "globalThis", built.code)((name: string) => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected module-copy dependency: ${name}`);
    return imports[name];
  }, module, module.exports, registry);
  return module.exports as API;
}
const j = (value: unknown) => JSON.stringify(value);
const gate = () => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  return { waiting, release };
};
const errorKind = (error: unknown) => error && typeof error === "object" && "kind" in error ? error.kind : null;

async function checks(code: string): Promise<Record<string, boolean>> {
  const registry = {}, a = await compiledCopy(code, registry);
  const wanted = { maxInFlight: 1, maxQueue: 3, maxWaitMs: 500 };
  a.setAdmissionLimits(wanted);
  const b = await compiledCopy(code, registry);
  const result: Record<string, boolean> = { "config.copy-keeps-limits": j(b.getAdmissionLimits()) === j(wanted) };
  const next = { maxInFlight: 2, maxQueue: 4, maxWaitMs: 600 };
  b.setAdmissionLimits(next);
  result["config.admin-update-shared"] = j(a.getAdmissionLimits()) === j(next);
  const c = await compiledCopy(code, registry);
  result["config.third-load-no-reset"] = j(c.getAdmissionLimits()) === j(next) && j(a.getAdmissionLimits()) === j(next);
  a.__resetAdmission();
  result["config.counter-reset-keeps-limits"] = j(a.getAdmissionLimits()) === j(next);
  // Set every copy too, so the configuration failure cannot mask an independent context/queue defect.
  for (const copy of [a, b, c]) copy.setAdmissionLimits(wanted);

  const hold = gate(), started = gate();
  let otherEntered = false;
  const order: number[] = [];
  const holder = a.withAdmission(async () => { started.release(); await hold.waiting; });
  await started.waiting;
  result["context.request-private"] = !a.inAdmission() && !b.inAdmission() && !c.inAdmission();
  const second = b.withAdmission(async () => { otherEntered = true; order.push(2); });
  const third = c.withAdmission(async () => { order.push(3); });
  result["queue.shared-state"] = a.admissionSnapshot().inFlight === 1 && b.admissionSnapshot().queueDepth === 2
    && c.admissionSnapshot().queueDepth === 2;
  result["queue.one-capacity"] = !otherEntered && order.length === 0;
  hold.release();
  const done = await Promise.allSettled([holder, second, third]);
  result["queue.fifo"] = j(order) === "[2,3]" && done.every(row => row.status === "fulfilled");
  const snap = a.admissionSnapshot();
  result["queue.shared-counters"] = snap.admitted === 3 && snap.inFlight === 0 && snap.queueDepth === 0
    && j(snap) === j(b.admissionSnapshot()) && j(snap) === j(c.admissionSnapshot());

  for (const copy of [a, b, c]) copy.__resetAdmission();
  let nested = false, context = false, escaped = false, genuineEscape = false;
  await a.withAdmission(async () => {
    context = b.inAdmission() && c.inAdmission();
    try { nested = await b.withAdmission(async () => c.admissionSnapshot().inFlight === 1, { maxWaitMs: 25 }); }
    catch { /* bounded negative control: module-local ALS queues on its own parent's slot */ }
    escaped = b.runOutsideAdmission(() => !a.inAdmission() && !b.inAdmission() && !c.inAdmission());
    let executed = false;
    try { await b.runOutsideAdmission(() => c.withAdmission(async () => { executed = true; }, { maxWaitMs: 0 })); }
    catch (error) { genuineEscape = errorKind(error) === "shed" && !executed; }
    result["context.outer-restored"] = a.inAdmission() && b.inAdmission() && c.inAdmission();
  });
  result["context.shared"] = context;
  result["context.nested"] = nested;
  result["context.escape"] = escaped;
  result["context.genuine-escape"] = genuineEscape;
  result["context.one-admission"] = a.admissionSnapshot().admitted === 1 && a.admissionSnapshot().inFlight === 0;
  result["context.no-leak-after-return"] = !a.inAdmission() && !b.inAdmission() && !c.inAdmission();

  // reset also bounds a mutant whose first callback intentionally omitted releaseSlot.
  for (const copy of [a, b, c]) copy.__resetAdmission();
  let expectedThrow = false, released = false;
  try { await a.withAdmission(async () => { throw new Error("expected admission fixture fault"); }); }
  catch (error) { expectedThrow = error instanceof Error && error.message === "expected admission fixture fault"; }
  try { await c.withAdmission(async () => { released = true; }, { maxWaitMs: 0 }); } catch { /* leaked-slot control */ }
  result["release.throw"] = expectedThrow && released && a.admissionSnapshot().inFlight === 0;
  for (const copy of [a, b, c]) copy.__resetAdmission();
  return result;
}

let failed = 0;
const normal = await checks(source);
for (const [name, pass] of Object.entries(normal)) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`); if (!pass) failed++;
}
for (const mutation of MUTATIONS) {
  const resolved = resolveAnchor(source, mutation.from);
  if (!resolved.ok) throw new Error(`${mutation.name}: ${resolved.reason}`);
}
if (process.argv.includes("--prove-red")) {
  for (const mutation of MUTATIONS) {
    const caught = (await checks(injectDefect(source, mutation.from, mutation.to)))[mutation.expect] === false;
    console.log(`${caught ? "PASS" : "FAIL"} PLANT ${mutation.name} — ${mutation.expect}`); if (!caught) failed++;
  }
}
console.log(`admission-module-copies: ${Object.keys(normal).length} actual-esbuild controls, ${process.argv.includes("--prove-red") ? MUTATIONS.length : 0} plants, ${failed} failures; no SQL/HTTP/money`);
process.exit(failed ? 1 : 0);
