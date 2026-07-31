/**
 * S14 worker — one OS process = one Railway container. Submits the SAME NIDA
 * for its OWN user, aligned to a shared wall-clock start so both processes are
 * inside `submitNidaStep`'s read-then-write window at the same instant.
 *
 * Prints exactly one `__S14_RESULT__ {json}` line for the coordinator to parse.
 */
/* eslint-disable no-console */
const { LOAD_USER, LOAD_NIDA, LOAD_DOB, LOAD_START_AT, LOAD_WORKER_ID } = process.env;
if (!LOAD_USER || !LOAD_NIDA || !LOAD_START_AT) {
  console.error("s14 worker: missing env");
  process.exit(1);
}

const { submitNidaStep } = await import("../../src/lib/server/kyc-service.ts");

// Barrier: spin until the agreed instant so both processes race, rather than
// one finishing before the other has connected its pool.
const startAt = Number(LOAD_START_AT);
while (Date.now() < startAt) await new Promise((r) => setTimeout(r, 2));

let outcome: Record<string, unknown>;
try {
  const r = await submitNidaStep(LOAD_USER, {
    nida: LOAD_NIDA,
    fullName: "Asha Mwamba Juma",
    dob: LOAD_DOB ?? "1990-01-01",
  });
  outcome = r.ok
    ? { accepted: true, verified: (r.data as { verified?: boolean } | undefined)?.verified ?? null }
    : { accepted: false, code: r.code ?? null, error: r.error };
} catch (e) {
  outcome = { accepted: false, threw: String((e as Error)?.message ?? e).slice(0, 200) };
}

console.log(`__S14_RESULT__ ${JSON.stringify({ worker: LOAD_WORKER_ID, ...outcome })}`);
process.exit(0);
