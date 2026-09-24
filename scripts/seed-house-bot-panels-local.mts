/**
 * THE ACTIVITY AND HISTORY PANELS, GIVEN SOMETHING TO PAINT — the OPS LANE's visual-pass seed for C7 step 5.
 *
 *   npm run db:scratch                   # terminal 1 (or reuse a cluster already listening on 5433)
 *   export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5433/<your own database>'
 *   npx prisma migrate deploy
 *   npm run db:seed-house-bots-local     # the roster, the markets, the admin
 *   npm run db:seed-house-bot-panels     # THIS — the rows the two new panels read
 *
 * ── WHY IT IS SEPARATE FROM `seed-house-bots-local.mts` ────────────────────────────────────────
 * That seed's whole point is a desk with a roster and NO house money in it: 0 marked rows, so a human can
 * watch the first stake appear. C7 step 5 then added two panels that read rows — the activity feed and the
 * change history — and on that world both are legitimately EMPTY. An empty panel is one state worth
 * photographing and it is the only state that seed can reach, so every other state (rows, a second page,
 * a filter matching nothing, a queued row with a cancel control) had no fixture at all.
 *
 * ⛔ IT IS A FIXTURE, AND IT SAYS SO RATHER THAN PRETENDING OTHERWISE. `seed-house-bots-local.mts` earns
 * its world through the real services because a seeded ROSTER the product could not have produced is worth
 * nothing to look at. These rows are different: the panels are read-only projections of two tables, so the
 * rows are INSERTED through the DAL and their `createdAt` is then moved backwards with one UPDATE each.
 * Backdating is the one thing no service offers and the window control cannot be exercised without it —
 * `today`, `24h`, `7d` and `all` are four names for one list until the rows sit on different days.
 * ⚠️ So this is a seed for LOOKING AT PANELS, never evidence about the engine that normally writes them.
 *
 * ⭐ THE SHAPE OF THE FIXTURE IS THE TABLE'S OWN CHECKS, NOT A GUESS. The first draft wrote `<marketId>:<n>`
 * into every anchor and was refused by `HouseBotIntent_market_anchor_check` on its first row. The database
 * says: a FILL or OPENER anchors on its MARKET (`hbi_fill_opener_anchor_uq` then allows ONE non-cancelled
 * row of each kind per market), a COUNTER anchors on the trigger POSITION and is unique on it, a MANUAL
 * anchors on `manual:<officer>:<uuid>`, may only be a Polls stake, and only ONE may be live per market.
 * So the volume here is COUNTER and finished MANUAL rows, which is also what a real desk's feed looks like.
 *
 * ⛔ LOOPBACK ONLY, and it refuses anything else — the refusal is `seed-house-bots-local.mts`'s, copied
 * rather than invented, for the reason that file states.
 * ⛔ D19: it prints to a TERMINAL and may name the feature there.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL is required. Start `npm run db:scratch` and export the URL it prints.");
  process.exit(2);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production.");
  process.exit(2);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — loopback only (localhost or 127.0.0.1).");
  process.exit(2);
}
if (process.env.NODE_ENV === "production") {
  console.error("REFUSED — NODE_ENV=production.");
  process.exit(2);
}
process.env.USE_PRISMA_DAL = "true";

const { houseBotSchemaReady }: Any = await import("../src/lib/server/house-bot/schema-ready.ts");
const schema = await houseBotSchemaReady();
if (!schema.ready) {
  console.error("REFUSED — the house schema is not ready (run `npx prisma migrate deploy` first).");
  process.exit(2);
}

const dal: Any = await import("../src/lib/server/house-bot-dal.ts");
const constants: Any = await import("../src/lib/house-bot/constants.ts");
const pgLib: Any = (await import("pg")).default;
const { randomUUID } = await import("node:crypto");

const bots: Any[] = await dal.houseBotStore.listNonRemoved();
if (bots.length === 0) {
  console.error("REFUSED — no designated accounts. Run `npm run db:seed-house-bots-local` first.");
  process.exit(2);
}
const active = bots.find((b) => b.status === "ACTIVE") ?? bots[0];
const others = bots.filter((b) => b.id !== active.id);

const pg = new pgLib.Client({ connectionString: url });
await pg.connect();
const mk: string[] = (await pg.query(`select id from "PredictionMarket" order by id limit 4`)).rows.map((r: Any) => r.id);
if (mk.length === 0) {
  console.error("REFUSED — no markets. Run `npm run db:seed-house-bots-local` first.");
  process.exit(2);
}

/**
 * ⛔ EVERY ROW THIS SCRIPT WRITES CARRIES A MARK, AND A RE-RUN REMOVES EXACTLY ITS OWN.
 * The first draft had no mark, its second run died on `pos_ops_0 already exists`, and the only
 * ways out were to truncate (which would have destroyed the roster's REAL designation history,
 * written by the other seed through the real services) or to hand-delete by guessing a pattern.
 * A fixture that cannot be re-run is a fixture you are afraid to re-run.
 */
const FIXTURE_MARK = { opsVisualFixture: true } as const;
const sweptI = await pg.query(`delete from "HouseBotIntent" where decision->>'opsVisualFixture' = 'true'`);
const sweptE = await pg.query(`delete from "HouseBotEvent"  where payload->>'opsVisualFixture' = 'true'`);
if (sweptI.rowCount || sweptE.rowCount) {
  console.log(`swept a previous run of THIS script: ${sweptI.rowCount} intents, ${sweptE.rowCount} events`);
}

const OFFICER = "usr_ops_visual_officer";
const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

/** Ages chosen so every window preset answers a DIFFERENT population. */
const AGES = [2 * HOUR, 5 * HOUR, 9 * HOUR, 30 * HOUR, 40 * HOUR, 9 * DAY, 20 * DAY];
/** A spread of magnitudes, because a money column is judged on its widest value. */
const STAKES = [1_000, 7_500, 25_000, 140_000, 1_250_000];

let seq = 0;
const made: { id: string; ageMs: number }[] = [];

async function intent(bot: Any, kind: string, status: string, product: string, ageMs: number, marketId: string) {
  const i = seq++;
  const id = `${constants.HOUSE_ID_PREFIX.intent}${randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const isManual = kind === "MANUAL";
  const line = isManual ? "MARKET" : product;                       // manual_polls_check
  const trigger = kind === "COUNTER" ? `pos_ops_${i}` : null;       // counter_anchor_check + unique
  const anchorKey = kind === "COUNTER" ? trigger!
    : isManual ? `manual:${OFFICER}:${randomUUID()}`                // manual_anchor_check
    : marketId;                                                     // market_anchor_check
  const finished = !["PENDING", "CLAIMED"].includes(status);
  await dal.houseBotIntentStore.insert({
    id, houseBotId: bot.id, botUserId: bot.userId, kind, anchorKey, marketId, productLine: line,
    triggerPositionId: trigger, triggerUserId: kind === "COUNTER" ? `usr_ops_trigger_${i % 5}` : null,
    targetId: null,
    requestedById: isManual ? OFFICER : null,                       // requestedById_check
    entryCondition: isManual ? "THIN" : null,                       // entryCondition_manual_check
    side: i % 2 === 0 ? "YES" : "NO",
    stakeTzs: STAKES[i % STAKES.length],
    dueAt: iso(-ageMs), deadlineAt: iso(-ageMs + HOUR), staleAt: iso(-ageMs + 10 * MIN),
    status,
    reasonCode: status === "FAILED" ? "SEAM_REFUSED" : status === "SKIPPED" ? "MARKET_CLOSED"
      : status === "EXPIRED" ? "DEADLINE_PASSED" : status === "CANCELLED" ? "STAFF_CANCELLED" : null,
    /* ⭐ THE SNAPSHOT THE ENGINE REALLY WRITES (2026-09-24). `decide.ts` puts `{ titleEn, category, cutoff,
       roundNumber }` on every intent it plans, and the Activity row now lifts the title out of it to name WHICH
       game a stake was on. With a bare mark here the browser gates only ever saw the NO-NAME fallback, so the one
       cell this fixture exists to photograph was the one it could not show. Every third row keeps a bare mark, so
       the fallback is still on screen too — both branches, in one shot. */
    why: null,
    decision: i % 3 === 1
      ? ({ ...FIXTURE_MARK } as Any)
      : ({ ...FIXTURE_MARK, snapshot: { titleEn: line === "UPDOWN"
          ? `Bitcoin Up or Down · ${[3, 5, 10, 15][i % 4]} min`
          : `Will the ${["ferry route reopen", "policy rate hold", "rains arrive early", "bridge open on time"][i % 4]} this week?`,
          category: line === "UPDOWN" ? "crypto" : "other", cutoff: iso(-ageMs + HOUR), roundNumber: line === "UPDOWN" ? 400 + i : null } } as Any),
    attempts: status === "FAILED" ? 3 : 0, transientAttempts: 0, nextAttemptAt: null,
    claimedBy: status === "CLAIMED" ? "ops-visual" : null,
    claimedUntil: status === "CLAIMED" ? iso(HOUR) : null,
    positionId: status === "PLACED" ? `pos_house_${i}` : null,      // placed_check + unique
    finishedAt: finished ? iso(-ageMs + MIN) : null,
    alertedAt: status === "PLACED" ? iso(-ageMs + MIN) : null,
  });
  made.push({ id, ageMs });
}

const ALL_STATUS = constants.INTENT_STATUSES as readonly string[];
const FINISHED = ALL_STATUS.filter((s) => !["PENDING", "CLAIMED"].includes(s));

/** One account's feed: COUNTER carries the volume, the constrained kinds appear where they legally can. */
async function feedFor(bot: Any, counters: number, manuals: number, live: number) {
  for (let k = 0; k < counters; k += 1) {
    await intent(bot, "COUNTER", ALL_STATUS[k % ALL_STATUS.length], k % 2 ? "UPDOWN" : "MARKET",
      AGES[k % AGES.length], mk[k % mk.length]);
  }
  for (let k = 0; k < manuals; k += 1) {
    await intent(bot, "MANUAL", FINISHED[k % FINISHED.length], "MARKET", AGES[k % AGES.length], mk[k % mk.length]);
  }
  /* Extra QUEUED rows — the cancel control's whole population (`cancelId` is set on PENDING alone). */
  for (let k = 0; k < live; k += 1) {
    await intent(bot, "COUNTER", "PENDING", k % 2 ? "UPDOWN" : "MARKET", AGES[k % 3], mk[k % mk.length]);
  }
}

await feedFor(active, 34, 12, 8);          // 54 rows on the ACTIVE account → 3 pages of 20
for (const b of others) await feedFor(b, 7, 2, 1);

/* The constrained kinds, placed where their unique indexes allow: ONE non-cancelled FILL and ONE
   non-cancelled OPENER per market, and any number of CANCELLED ones. */
for (let m = 0; m < mk.length; m += 1) {
  await intent(active, "FILL", m === 0 ? "PLACED" : "SKIPPED", "MARKET", AGES[m], mk[m]);
  await intent(active, "OPENER", m === 0 ? "PLACED" : "FAILED", "UPDOWN", AGES[m + 1], mk[m]);
  await intent(active, "FILL", "CANCELLED", "MARKET", AGES[m + 2], mk[m]);
  await intent(active, "OPENER", "CANCELLED", "UPDOWN", AGES[m + 3], mk[m]);
}

/* ⛔ THE BACKDATING, said out loud. `createdAt` is stamped by the database on insert; the window control
 * cannot be exercised while every row is one second old. One UPDATE per row, by id. */
for (const r of made) {
  await pg.query(`update "HouseBotIntent" set "createdAt" = now() - ($1 || ' milliseconds')::interval where id = $2`,
    [String(r.ageMs), r.id]);
}

/* ── the history panel: enough CHANGES to page, across kinds and actors ── */
const EVENT_KINDS = [
  "RULES_SAVED", "PAUSED", "STARTED", "LIMITS_SAVED", "TARGET_ADDED", "TARGET_UPDATED",
  "TARGET_REMOVED", "STAFF_INTENT_CANCELLED", "ENTER_NOW_REQUESTED", "ENTER_NOW_PREVIEWED",
  "HOLDER_2FA_ON", "HOLDER_EMAIL_CHANGED", "OPENER_SIDE_DRAWN", "CREDENTIAL_CHANGED",
  "HOLDER_AGAINST_BOT", "BOARD_DISCLOSURE_RECORDED", "REIMBURSEMENT_RECORDED", "TARGET_ENDED",
];
let e = 0;
const evMade: { id: string; ageMs: number }[] = [];
/* 🔴 THREE PASSES, AND THE THIRD IS THE ONE THAT MAKES A STATE REACHABLE AT ALL. With two, the ACTIVE
   account held exactly 20 events — exactly one page — so `/admin/desk/<id>?tab=history&hpage=2` was served
   as the LAST page, correctly and indistinguishably from a pager that does not work. The drive photographed
   it under the name "page 2" and measured page 1; the product was right and the coverage claim was false,
   which is the "not applicable" verdict this programme has already paid for. The third pass goes to the
   ACTIVE account too, so that panel has a real second page to reach. */
for (let pass = 0; pass < 3; pass += 1) {
  for (const kind of EVENT_KINDS) {
    const bot = pass === 1 ? (others[e % Math.max(1, others.length)] ?? active) : active;
    const ev = await dal.houseBotEventStore.append({
      houseBotId: bot.id, userId: null, marketId: null, kind,
      fromStatus: kind === "PAUSED" ? "ACTIVE" : kind === "STARTED" ? "PAUSED" : null,
      toStatus: kind === "PAUSED" ? "PAUSED" : kind === "STARTED" ? "ACTIVE" : null,
      reason: kind === "PAUSED" ? "Stood the desk down while the ferry story settles" : null,
      actorId: e % 3 === 0 ? null : OFFICER, payload: FIXTURE_MARK,
    });
    if (ev?.id) evMade.push({ id: ev.id, ageMs: AGES[e % AGES.length] });
    e += 1;
  }
}
for (const r of evMade) {
  await pg.query(`update "HouseBotEvent" set "createdAt" = now() - ($1 || ' milliseconds')::interval where id = $2`,
    [String(r.ageMs), r.id]);
}

const q = async (sql: string) => (await pg.query(sql)).rows[0].n as number;
const iCount = await q(`select count(*)::int n from "HouseBotIntent"`);
const eCount = await q(`select count(*)::int n from "HouseBotEvent"`);
const pending = await q(`select count(*)::int n from "HouseBotIntent" where status='PENDING'`);
const onActive = await q(`select count(*)::int n from "HouseBotIntent" where "houseBotId"='${active.id}'`);
await pg.end();

console.log("\n══ the two panels now have something to paint ══");
console.log(`   intents   ${iCount} desk-wide · ${onActive} on the ACTIVE account · ${pending} QUEUED (the cancel control's population)`);
console.log(`   events    ${eCount}`);
console.log(`   account   ${active.id}  ${active.label ?? ""}`);
console.log("   ages      2h · 5h · 9h · 30h · 40h · 9d · 20d, so today / 24h / 7d / all differ\n");
