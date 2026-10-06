/**
 * U43y · THE TYPE OF THE ONE MONEY-BUSY SIGNAL, `globalThis.__50PICK_MONEY_CHORES` — declared here and only here.
 *
 * ⛔ WHY A FILE OF ITS OWN (U43Y-MPS-1). Three money files write the signal — `lifecycle.ts`, `market-scheduler.ts` and
 * `updown-scheduler.ts`, one `try … catch` mirror beside each busy flip — and they import nothing to do it, so a money
 * path never depends on the marketing side. Their TypeScript therefore cannot pull this declaration in through an
 * import: EVERY program that type-checks a writer has to hold this file itself. The root `tsconfig.json` takes it with
 * the rest of `src`; `tsconfig.backup.json`, whose watchdog imports reach `market-scheduler.ts`, names it; so does the
 * temporary program `test:house-bot-rules` §14 writes. When the declaration lived in `money-busy.ts`, which no program
 * but the root one loads, `test:backup` failed its typecheck at the mirrors.
 *
 * Declarations only, and NO import, so joining any program adds this one global and nothing else. `test:money-busy`
 * §Y6.5 holds it to that, and holds every tsconfig at the repository root to seeing it.
 *
 * The one reader is `money-busy.ts` (`moneyBusy()`), which never writes. Every field is optional, so a writer's
 * `??= {}` is always a valid start.
 */
export {};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MONEY_CHORES:
    | {
        /** Epoch ms the running lifecycle pass began; 0 when none runs. `lifecycle.ts`, beside `running`. */
        lifecycleSince?: number;
        /** Epoch ms the running deposit/payout poll began; 0 when none runs. `lifecycle.ts`, beside `depositPolling`. */
        depositsSince?: number;
        /**
         * One start (epoch ms) per market fire in flight, in every module instance. `market-scheduler.ts`, beside
         * `firesInFlight`: each acquire pushes its own start, and its release removes that same start — never the
         * oldest, so a fire that never finishes keeps its own date and goes stale ten minutes after it began.
         */
        marketFires?: number[];
        /**
         * The same, for Up & Down chain fires. `updown-scheduler.ts`, beside `inFlight` — a chain an officer set
         * RUNNING. Since E-67 the chains are STOPPED and a hand-made round settles inside the lifecycle pass instead.
         */
        updownFires?: number[];
      }
    | undefined;
}
