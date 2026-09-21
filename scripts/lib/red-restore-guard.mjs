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
 * IT HAS TWO PARTS, AND ON WINDOWS THE SECOND IS THE ONE THAT WORKS.
 *
 * 1 · THE RESTORE — what puts the file back. DRIVEN 2026-09-21, not assumed. It runs on:
 *    · the `exit` pass, prepended, which is EVERY way this process decides to end: an uncaught throw, any
 *      `process.exit` the harness takes, the end of a clean run. That covers the one hole the `finally` cannot:
 *      `write()` throws its read-back mismatch AFTER the rename has already landed the defect on disk, and the call
 *      that injects the defect sits OUTSIDE the try/finally that restores it.
 *    · a SIGINT / SIGTERM / SIGBREAK listener — which matters on POSIX and whenever the process is idle, and which
 *      ⚠️ MEASURED HERE, NEVER RUNS DURING A WINDOWS DRIVE (see the stop block below). It is kept because it is
 *      correct where it can run, not because it is what saves this platform.
 *
 * 2 · THE STOP — what makes the drive actually obey. Read `CONSOLE_STOP_STATUS` below: the order to stop has to be
 *    one a main thread blocked in `execSync` can SEE, and the only such thing is the child's own exit status.
 *
 * ⛔ WHAT NEITHER PART CAN COVER, AND THAT IS NOT A DETAIL:
 *  · `process.kill(pid)` / `taskkill` on WINDOWS terminates unconditionally — NO handler of any kind runs, not this
 *    one and not the `finally`. That is how the 2026-09-21 runaway drive had to be stopped.
 *  · `process.abort()`, a hard power loss, a bluescreen on this machine's failing RAM, or a kill -9.
 *  · A signal aimed at the PARENT ALONE (not the console) does not even unblock the drive: it finishes the suite it
 *    is in first, and the stop is only seen after that child returns.
 * ⛔ So after ANY killed drive, still check the worktree against `git show HEAD:<file>`. Each harness's refusal to
 *    START on a dirty target is the load-bearing check; this guard is what keeps it from ever having to fire.
 */
import { readFileSync, unlinkSync } from "node:fs";

/**
 * ⛔ THE ORDER TO STOP HAS TO BE ONE THE BLOCKED MAIN THREAD CAN SEE. MEASURED on this machine, 2026-09-21,
 * with a probe shaped exactly like these harnesses (signal listeners registered, then a wholly synchronous body):
 * a real console Ctrl-C reached the drive, the suite child died — and the SIGINT listener NEVER RAN. Node cannot
 * run a JS signal callback while the main thread is blocked in `execSync`, and a red drive never returns to the
 * event loop between one `execSync` and the next, so it never runs at all. The probe's own `exit` handler printed
 * `handlerRan=no`.
 *
 * ⛔ THAT IS NOT A COSMETIC GAP. DRIVEN on the console harness the same night: Ctrl-C at the first mutation killed
 * that one suite child, the harness read the dead child as a failed run, put the file back — and then INJECTED THE
 * NEXT DEFECT. It ran 80 more seconds and planted TEN more defects after the operator ordered it to stop. Every one
 * of those is a window in which a `taskkill`, a bluescreen or a power cut leaves a defect on disk, which is the
 * failure this whole guard exists to prevent — and the operator, having pressed Ctrl-C, believes it is over.
 *
 * What the blocked thread CAN see is the child's own exit status. A Windows process killed by a console control
 * event exits with STATUS_CONTROL_C_EXIT, and `execSync`'s error carries it as `.status`. MEASURED: `status`
 * 3221225786, `signal` null, `killed` undefined — so `.signal` is useless here and `.status` is the whole signal.
 * It is a number, not console text, so it does not turn on the operating system's language.
 */
export const CONSOLE_STOP_STATUS = 3221225786; // 0xC000013A STATUS_CONTROL_C_EXIT

let stopReason = "";
/** Record that this drive has been ordered to stop. Safe to call repeatedly; the first reason is kept. */
export function requestStop(why) { if (!stopReason) stopReason = why; }
/** The reason, or "" — a harness checks this after EVERY child, while its files are back and before the next one. */
export function stopRequested() { return stopReason; }
/** True when this `execSync` error is a console stop (Ctrl-C / Ctrl-Break) that reached the suite child. */
export function isConsoleStop(err) { return Boolean(err) && err.status === CONSOLE_STOP_STATUS; }

/**
 * ⛔ Stop NOW if a stop was ordered. Called with every target already back on disk: `process.exit` runs the
 * prepended `exit` pass, which re-checks every file and drops the lock, so nothing is left behind.
 */
export function haltIfStopped(label) {
  const why = stopRequested();
  if (!why) return;
  console.error(`\n⛔ ${label} STOPPED ON THE OPERATOR'S ORDER — ${why}.`);
  console.error("   No further defect will be injected. Every target is put back before this process exits.");
  process.exit(1);
}

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
      requestStop(`a ${sig} handler ran`);
      restore(sig, true);
      releaseLock();
      process.exit(1);
    });
  }

  return restore;
}
