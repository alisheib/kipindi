/**
 * One "container" for S12. Attempts to take the lifecycle lease and reports whether it
 * won, as JSON on stdout. Run as a SEPARATE OS PROCESS on purpose: `leader.ts` keeps its
 * instance id in module scope, so two calls inside one process would share an identity
 * and could never contend the way two Railway replicas do.
 */
/* eslint-disable no-console */
process.env.USE_PRISMA_DAL = "true";

const { acquireLeadership, releaseLeadership, INSTANCE_ID } = await import("../../src/lib/server/leader.ts");

const task = process.env.S12_TASK ?? "s12";
const mode = process.env.S12_MODE ?? "acquire";

// Align both workers on a wall-clock instant so they race the read-modify-write rather
// than arriving politely one after the other.
const startAt = Number(process.env.S12_START_AT ?? 0);
if (startAt) {
  const wait = startAt - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

if (mode === "release") {
  await releaseLeadership(task);
  console.log(JSON.stringify({ instance: INSTANCE_ID, released: true }));
} else {
  const won = await acquireLeadership(task);
  console.log(JSON.stringify({ instance: INSTANCE_ID, won }));
}
process.exit(0);
