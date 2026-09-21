/**
 * ⛔ A KILLED RED DRIVE MUST NOT LEAVE A DEFECT ON DISK — the one restore guard every house-bot red harness arms.
 *
 * Every one of these harnesses writes a REAL defect into a REAL source file, runs a suite, and puts the file back in a
 * `finally`. A drive that dies before that `finally` runs leaves the injected defect sitting in the worktree, where
 * `git diff` shows it as a plausible one-line change — ready for the next `git add -A` in any lane to ship it, after
 * which every suite is green because the defect IS the code now. That is `docs/FAILURE-INVENTORY.md` §3.8 with one
 * fewer step: two concurrent red drives once left the live payout gate DISABLED while the harness reported clean.
 *
 * `red-house-bot-engine.mjs` shed the leaking idiom at 85dc41af by restoring inside its own SIGINT/SIGTERM handler.
 * This module is that same restore, in ONE place, armed by all three harnesses — a second copy is how the first rots.
 *
 * WHAT IT COVERS — driven, not assumed (2026-09-21):
 *  · SIGINT / SIGTERM / SIGBREAK — a drive stopped from its own console with Ctrl-C or Ctrl-Break.
 *  · An UNCAUGHT THROW anywhere, via the `exit` pass. That includes the one hole the `finally` cannot cover: `write()`
 *    throws its read-back mismatch AFTER the rename has already landed the defect on disk, and the call that injects
 *    the defect sits OUTSIDE the try/finally that restores it.
 *  · Any `process.exit()` the harness itself takes while a file is mutated.
 *  · A suite child that exits non-zero or calls `process.exit` — `execSync` throws, the `finally` restores, and the
 *    `exit` pass here confirms the file is back before the process is gone.
 *
 * ⛔ WHAT IT CANNOT COVER, AND THAT IS NOT A DETAIL:
 *  · `process.kill(pid)` / `taskkill` on WINDOWS terminates unconditionally — NO handler of any kind runs, not this
 *    one and not the `finally`. That is how the 2026-09-21 runaway drive had to be stopped.
 *  · `process.abort()`, a hard power loss, or a kill -9.
 *  · A signal is DEFERRED while the main thread is blocked inside `execSync`. A real console Ctrl-C reaches the suite
 *    child too, so the child dies and the drive unblocks at once; a signal aimed at the parent alone does not stop the
 *    drive until that suite finishes on its own.
 * ⛔ So after ANY killed drive, still check the worktree against `git show HEAD:<file>`. Each harness's refusal to
 *    START on a dirty target is the load-bearing check; this guard is what keeps it from ever having to fire.
 */
import { readFileSync, unlinkSync } from "node:fs";

/**
 * @param {Map<string,string>} original  path → the byte-exact content read before any mutation
 * @param {(p: string, s: string) => void} write  the harness's own temp-file + rename + read-back writer
 * @param {() => void} releaseLock  the harness's own lock remover
 * @param {string} label  what to call this drive in the operator's console
 * @returns {(why: string, loud?: boolean) => boolean} the restore itself, for a harness that wants to call it directly
 */
export function armRestoreGuard({ original, write, releaseLock, label = "red drive" }) {
  const restore = (why, loud = false) => {
    const broken = [];
    let putBack = 0;
    for (const [p, s] of original) {
      let onDisk = null;
      try { onDisk = readFileSync(p, "utf8"); } catch { onDisk = null; }
      // ⭐ Only a file that actually differs is rewritten, so the clean-exit pass is pure reads and never churns a
      //    byte-identical file through a rename the end-of-run sha check would then have to re-prove.
      if (onDisk !== s) {
        try { write(p, s); putBack++; } catch { broken.push(p); }
      }
      // A kill between `writeFileSync(tmp)` and `renameSync` leaves the temp file behind; take it with us.
      try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
    }
    if (broken.length) {
      console.error(`⛔ ${label} · ${why}: COULD NOT RESTORE ${broken.join(", ")} — A DEFECT IS STILL ON DISK.\n   Run: git checkout -- ${broken.join(" ")}`);
    } else if (loud || putBack > 0) {
      console.error(`${label} · ${why}: ${putBack} target(s) put back from the in-memory original, ${original.size - putBack} already clean.`);
    }
    return broken.length === 0;
  };

  /**
   * ⭐ PREPENDED. The harness registers `process.on("exit", releaseLock)` the moment it takes the lock — before the
   * `original` map it would restore from even exists. Prepending puts the restore in FRONT of that listener, so the
   * defect is off the disk BEFORE the lock is dropped and a waiting drive can start.
   */
  process.prependListener("exit", () => { restore("exit"); });

  // ⚠️ SIGBREAK is not decoration on Windows: Ctrl-Break is the only console stop that can be aimed at ONE process
  //    group, and it is what a supervisor sends when it wants this drive and not its neighbours.
  for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
    process.on(sig, () => {
      restore(sig, true);
      releaseLock();
      process.exit(1);
    });
  }

  return restore;
}
