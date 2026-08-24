/**
 * THE ANCHORS `red:backup-order` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * `orderAllTables` replaced `orderUndeclared` on 2026-08-25 after the nightly backup died
 * for four nights on `Session → Device` — a table the F-05 expand step had deliberately
 * left on production while removing its Prisma model. The old code assembled the dump as
 * `[...declared, ...undeclared]` and therefore had to REFUSE that case. The ordering
 * constraint belongs to the FK graph, not to which branch declares what.
 *
 * ⭐ THE FIRST IS THE REGRESSION ITSELF — restore the append assumption and the four dead
 * nights come straight back.
 *
 * ⭐ THE FOURTH IS THE POSITIVE CONTROL, and it is the one worth reading. The other three
 * prove the gate catches a WRONG order. None of them proves the gate would notice a dump
 * that quietly DROPPED a table — an order can be perfectly sorted and still be missing
 * something, and "every table is still in the dump" is the assertion nobody writes. So it
 * makes the sort return a correct-but-incomplete order and the gate must fail on the COUNT.
 *
 * ⚠️ SINGLE-LINE ANCHORS. This tree is CRLF for most files and these declarations are LF, so
 * a multi-line anchor cannot match and the replace becomes a silent no-op — which reads as
 * "the guard failed to catch the defect" rather than "the harness never ran".
 * ⚠️ And no replacement may CONTAIN its own anchor, or the did-it-reach-disk check refuses a
 * mutation that applied correctly.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const CORE = "src/lib/server/backup/core.ts";
const BACKUP = "scripts/db-backup.mts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "append-undeclared-again",
    why: "⭐ THE FOUR DEAD NIGHTS, VERBATIM: the dump goes back to declared-then-undeclared, so a declared table holding an FK into an undeclared one is written before its parent and the artifact cannot replay",
    file: BACKUP,
    suite: "backup",
    from: `  const dumpOrder = orderAllTables(known, undeclared, fkEdges);`,
    to: `  const dumpOrder = [...known, ...undeclared];`,
    expect: "db:backup orders the whole graph rather than appending undeclared tables",
  },
  {
    name: "undeclared-parent-ignored",
    why: "edges are read but the undeclared parent is never made a prerequisite, so it sorts to the end again — the same broken artifact, arrived at inside the sorter instead of at the call site",
    file: CORE,
    suite: "backup",
    from: `    if (!all.has(e.child) || !all.has(e.parent)) continue;`,
    to: `    if (!all.has(e.child) || !all.has(e.parent) || (declared.includes(e.child) && !declared.includes(e.parent))) continue;`,
    expect: "🔴 a DECLARED table with an FK into an undeclared one is ORDERED, not refused",
  },
  {
    name: "declared-order-resorted",
    why: "the declared tables are re-sorted alphabetically instead of kept in tableOrder()'s order, so two dumps of one database stop being diffable and a parent-before-child guarantee that Prisma already made is thrown away",
    file: CORE,
    suite: "backup",
    from: `  for (const t of declared) visit(t);`,
    to: `  for (const t of [...declared].sort()) visit(t);`,
    expect: "the declared order survives byte-for-byte when nothing undeclared intrudes",
  },
  {
    name: "control-drops-a-table",
    why: "⭐ POSITIVE CONTROL — the sort returns a correctly-ordered but INCOMPLETE list. Every ordering assertion still passes, because everything present is in the right place; only an assertion that COUNTS stands between that and a backup silently missing a table",
    file: CORE,
    suite: "backup",
    from: `  for (const t of [...undeclared].sort()) visit(t);`,
    to: `  for (const t of [...undeclared].sort().slice(1)) visit(t);`,
    expect: "…and both are actually present",
  },
];

/**
 * ⛔ ONE MUTATION WAS WRITTEN AND THEN REMOVED, AND WHY IS WORTH MORE THAN THE MUTATION.
 *
 * It replaced `if (e.child === e.parent) continue;` in `orderAllTables` with `if (false)`,
 * on the theory that a self-referencing table would then become its own prerequisite. The
 * gate stayed GREEN — correctly. `visit()` already refuses a node that is `onStack`, so the
 * self-edge is absorbed there and the table is emitted exactly once either way.
 *
 * The line is therefore DEFENCE-IN-DEPTH and says so in `core.ts`, not a load-bearing
 * branch. ⭐ Rule 8 of `.claude/skills/50pick-standards`: *before asserting a failure mode,
 * prove you can produce it.* A mutation kept here anyway would have been a permanent
 * NOT CAUGHT, and the honest options were to invent an assertion that could see a
 * difference that does not exist, or to delete the mutation. This is the second.
 */
