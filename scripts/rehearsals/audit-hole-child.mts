/**
 * The child half of `audit-hole.mts` — a process that fires REAL appends through the REAL `audit()`
 * while the parent decides, from outside, which of them are allowed to reach the database.
 *
 * ⛔ IT MUST BE A SEPARATE PROCESS, and the appends must be the shipped ones. The finding under test
 * is that an append can be allocated and never written while the process carries on — the fail-open
 * branch in `audit()` — and nothing about that is reproducible by a parent that stubs a client.
 *
 * ⛔ AND THE HOLE IS BUILT, NOT RACED. The parent holds the audit chain's own advisory lock
 * (`pg_advisory_lock(hashKey64("audit:chain"))`, the same key `appendPersisted` takes) while this
 * child appends. With `statement_timeout` set on this connection, the lock wait aborts, the
 * transaction rolls back, `appendPersisted` throws, and `audit()` does exactly what it does in
 * production against a sick database: keeps the entry in the ring and carries on. The ticket is
 * consumed either way. That is a real production failure mode driven end to end, not a simulation —
 * and unlike a timing race it produces the same hole every run.
 *
 * Protocol, line-oriented, so the parent can interleave its lock with this child's appends:
 *   → stdout `READY`                 once the module graph is warm
 *   ← stdin  `append <n> <tag>`      fire n appends and wait for the queue to settle
 *   → stdout `IDS <json>` `DONE`     the stamped ids, in ticket order
 *   ← stdin  `exit`
 *   → stdout `BOOT <id>` `ISSUED <n>`
 */
import { createInterface } from "node:readline";

const AUD = (await import("@/lib/server/audit")) as typeof import("@/lib/server/audit");

// One warm-up append, awaited, so the module graph, the Prisma client and `hydrate()` are all paid
// for before the parent starts timing anything or takes the lock.
await AUD.audit({
  category: "SYSTEM", action: "rehearsal.child_ready", actorId: null,
  targetType: null, targetId: null, payload: { pid: process.pid },
});
console.log("READY");

const rl = createInterface({ input: process.stdin });
for await (const line of rl) {
  const [cmd, a, b] = line.trim().split(/\s+/);
  if (cmd === "append") {
    const n = Number(a);
    const ids: string[] = [];
    for (let i = 0; i < n; i++) {
      // ⚠️ THE CALL IS THE SHIPPED ONE; the drill AWAITS the result and that is deliberate, not an
      // oversight. `audit()` is documented never to reject, so awaiting changes nothing about which
      // branch runs inside it — the fail-open is a property of the WRITE, not of whether the caller
      // waited. What awaiting buys is an exact ticket→id map, so the hole this drill measures is
      // the hole it built rather than whatever a racing queue happened to leave behind.
      const p = AUD.audit({
        category: "COMPLIANCE",
        action: "player.record_viewed",
        actorId: `officer_${b}`,
        targetType: "User",
        targetId: `usr_${b}_${i}`,
        payload: { drill: b, i, note: "the access-log class — no anchor, nothing can reconstruct it" },
      });
      ids.push(await p.then((e) => e.id, () => "REJECTED"));
    }
    // The queue is FIFO and each append is awaited above, so this is belt-and-braces — but a drill
    // that assumed the queue was empty and was wrong would measure the wrong hole.
    await AUD.auditFlush();
    console.log(`IDS ${JSON.stringify(ids)}`);
    console.log("DONE");
  } else if (cmd === "exit") {
    console.log(`BOOT ${AUD.auditBootId()}`);
    console.log(`ISSUED ${AUD.auditTicketsIssued()}`);
    rl.close();
    process.exit(0);
  }
}
