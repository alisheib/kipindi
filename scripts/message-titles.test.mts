/**
 * test:message-titles — the Vodacom plan's S12, WP12 and WP13, ON BOTH STORES: a message that leaves the site carries a
 * market's officer-approved short title only once the new journey is ACTIVE for everyone (the S15 flip), and the full
 * title — byte for byte as before S12 — until then and on any failure.
 *
 *   npm run test:message-titles      (boots the on-box Postgres through db-scratch)
 *   npm run red:message-titles       (plants each defect into the real source, memory child; one at a time)
 *
 * ⭐ ONE CASE LIST, TWO STORES. `scripts/lib/message-titles-child.mts` runs in two child processes through the runner the
 * two-store suites use: the memory store, then a fresh scratch database with every migration applied — on Postgres the
 * short titles come back through the Prisma DAL (`toStoredMarket`), the switch's record is the real `SystemConfig` row, and
 * the bell rows are real rows. A case that passes in memory and fails on Postgres is a FAIL. ⛔ NO POSTGRES IS A FAILURE,
 * NOT A SKIP (exit 3, NOT MEASURED).
 *
 * WHAT IT HOLDS — read the child's header: §A the rule, §B the switch, §C every call site in four switch states (the
 * shipped STAFF_PREVIEW, WITHDRAWN, the switch's read failing, ACTIVE), §D the share picture, the win card and the share
 * preview in the same four.
 *
 * ⛔ THE FLOOR IS PER STORE, and it is what a run PRINTED, never arithmetic: 67 on each store (2026-10-14, the two-store
 * run of this case list: `0.mem` 67 passed, `0.pg` 67 passed), the child's store check included. It rose from 55 with §D
 * (WP13); WP12's list without §D printed 55 on each store (2026-10-15). A section that stops running fails this floor
 * even while every case that ran passed. It only ever rises, to a number a run printed.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:message-titles",
  casesFile: "scripts/lib/message-titles-child.mts",
  minPass: { memory: 67, postgres: 67 },
  dbPrefix: "msg_titles",
});
