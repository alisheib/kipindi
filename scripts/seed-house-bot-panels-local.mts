/**
 * THE ACTIVITY AND HISTORY PANELS, GIVEN SOMETHING TO PAINT — the OPS LANE's visual-pass seed for C7 step 5.
 *
 *   npm run db:scratch                   # terminal 1 (or reuse a cluster already listening on 5433)
 *   export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5433/<your own database>'
 *   npx prisma migrate deploy
 *   npm run db:seed-house-bots-local     # the roster, the markets, the admin
 *   npm run db:seed-house-bot-panels     # THIS — the rows the two new panels read, and the RESULTS tab's stakes
 *   npm run db:seed-house-bot-panels -- --skip-results   # a re-run: the two panels again, the results left alone
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
 * ── THE RESULTS TAB (C7 437, 2026-09-26) — THE OPPOSITE RULE, AND WHY ────────────────────────────────
 * The activity and history panels project two tables of RECORDS, so inserted records are a faithful picture of
 * them. The Results tab projects MONEY — the day book reads `Position` rows carrying the account's marker and the
 * marked payout and refund `Transaction`s — and this script's inserted intents point at positions that do not exist,
 * so on them the tab painted "—" on all seven days. Worse, a status written onto a position without its money is
 * the 2026-09-26 Opening/Closing defect's class: a WIN with no payout reads as a loss. So the results half is
 * EARNED, through the real services and nothing else:
 *   · a second account is designated and started through `designation.ts`, exactly as `seed-house-bots-local.mts`
 *     does it, and at the end paused and removed through `roster-actions.ts`, so the tab's line for accounts no
 *     longer on the desk paints;
 *   · every stake is a real FILL through the real seam, against a real player's opposite stake, and every finished
 *     one is settled for real — `resolveMarket` then `settleMarket` — WIN, LOSS and VOID, with one left OPEN;
 *   · only TIME is moved: each position's `placedAt` and its intent's `createdAt`, onto the EAT day it stands for,
 *     so the seven days differ. It is the same declared fixture of time as `house-bot-world.mts`' `backdate`.
 * ⛔ THE MASTER SWITCH IS TURNED ON ONLY WHILE THE STAKES ARE PLACED, AND OFF AGAIN IN A `finally` — on this
 * loopback database only, and only if this script was the one that turned it on. The seam refuses every stake
 * while it is off, which is the whole reason it moves at all. ⛔ And it REFUSES to move it while an engine is
 * beating on this database: a server running beside it would stake on its own for as long as the switch is on.
 * ⛔ IT CANNOT BE RE-RUN, AND IT SAYS SO. Real positions, payouts and ledger rows cannot be swept the way this
 * script sweeps its marked intents and events, so a second run would stack a second set of days on the first. The
 * markets' own TITLES are the marker: a database that already carries them is refused before anything is written.
 * `--skip-results` re-runs the two panels and leaves the results alone.
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
const SKIP_RESULTS = process.argv.slice(2).includes("--skip-results");

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

/* ── THE RESULTS TAB'S PLAN (C7 437), declared FIRST: its checks can refuse the whole run, before anything is written ── */
/**
 * One row per stake: the EAT day it stands for (0 = today, 6 = six days back), whose account, how it ends, and a
 * market TITLE that is also this fixture's marker (see the header). ⭐ Chosen so the tab paints every state it has:
 * a day with only an open stake ("Nothing settled", "Still running"), a win, a refund alone ("Even"), a day on which
 * two accounts net to a loss, a day with no stakes at all, and seven-digit stakes on both sides of the ledger.
 * ⛔ The titles name no feature and no person; they are ordinary polls.
 */
type ResultStake = { day: number; on: "running" | "second"; outcome: "WIN" | "LOSS" | "VOID" | "OPEN"; stakeTzs: number; title: string };
const RESULT_STAKES: readonly ResultStake[] = [
  { day: 0, on: "running", outcome: "OPEN", stakeTzs: 48_000, title: "Will the harbour crane be back in service by Friday?" },
  { day: 1, on: "running", outcome: "WIN", stakeTzs: 1_000_000, title: "Will the coastal ferry keep its new timetable this week?" },
  { day: 2, on: "second", outcome: "VOID", stakeTzs: 12_600, title: "Will the stadium lights be repaired before the derby?" },
  { day: 3, on: "running", outcome: "WIN", stakeTzs: 40_000, title: "Will the water board lift the evening rationing?" },
  { day: 3, on: "second", outcome: "LOSS", stakeTzs: 250_000, title: "Will the new flyover open to traffic this month?" },
  { day: 5, on: "second", outcome: "WIN", stakeTzs: 125_000, title: "Will the national team name an unchanged squad?" },
  { day: 6, on: "second", outcome: "LOSS", stakeTzs: 1_000_000, title: "Will the cotton auction clear its first lot by noon?" },
];
const RESULT_TITLES = RESULT_STAKES.map((s) => s.title);
/** The second account: a neutral label and a neutral holder name — never a person's — funded for its stakes. */
const SECOND = { label: "Afternoon desk - removed", holderName: "Desk Holder · afternoon", balance: 3_000_000 };
const stakedOn = (on: ResultStake["on"]) => RESULT_STAKES.filter((s) => s.on === on).reduce((a, s) => a + s.stakeTzs, 0);

let resultsWorld: { w: Any; running: Any; officer: string } | null = null;
if (!SKIP_RESULTS) {
  const carried = (await pg.query(`select count(*)::int n from "PredictionMarket" where "titleEn" = any($1::text[])`, [RESULT_TITLES])).rows[0].n as number;
  if (carried > 0) {
    console.error(`REFUSED — this database already carries the results fixture (${carried} of its ${RESULT_TITLES.length} markets, by title).`);
    console.error("Its stakes are REAL positions, settled for real, with payouts and refunds in the ledger — nothing this script can sweep —");
    console.error("so a second run would stack a second set of days on the first and every figure on the Results tab would be wrong.");
    console.error("Re-run with --skip-results to redo the two panels only, or drop the database and seed it again.");
    process.exit(2);
  }
  const running = bots.find((b) => b.status === "ACTIVE");
  if (!running) {
    console.error("REFUSED — no ACTIVE account to stake through. `npm run db:seed-house-bots-local` starts one (or pass --skip-results).");
    process.exit(2);
  }
  /* The officer every service below names: the database's first ADMIN, read here — never an id typed into this file. */
  const officerRow = (await pg.query(`select id from "User" where role::text = 'ADMIN' order by "createdAt" asc, id asc limit 1`)).rows[0];
  if (!officerRow) {
    console.error("REFUSED — no ADMIN account on this database to act as the officer. Run `npm run db:seed-house-bots-local` first.");
    process.exit(2);
  }
  /* ⛔ AN ENGINE BEATING ON THIS DATABASE WOULD STAKE ON ITS OWN for as long as the switch below is on, and its
     stakes would land on today's row beside this fixture's. Two minutes is many planner beats: a beat that recent
     means a server is running against this database now. */
  const planner = ((await dal.houseBotRuntimeStore.listInstances()) as Any[]).find((r) => r.key === constants.RUNTIME_KEY.plannerBeat);
  const beatAgeMs = planner?.beatAt ? Date.now() - Date.parse(planner.beatAt) : null;
  if (beatAgeMs !== null && beatAgeMs < 2 * 60_000) {
    console.error(`REFUSED — an engine beat on this database ${Math.round(beatAgeMs / 1000)}s ago. Stop the server (or start it with HOUSE_BOT_ENGINE=false) and run this again:`);
    console.error("the master switch goes on while the results stakes are placed, and a running engine would stake beside them.");
    process.exit(2);
  }
  const { loadWorld }: Any = await import("./lib/house-bot-world.mts");
  const w: Any = await loadWorld();
  const wallet = await w.bal(running.userId);
  if (!wallet || Number(wallet.balance) < stakedOn("running")) {
    console.error(`REFUSED — the ACTIVE account's holder holds ${wallet?.balance ?? "no wallet"}, and its results stakes need ${stakedOn("running")}. Seed a fresh database.`);
    process.exit(2);
  }
  resultsWorld = { w, running, officer: officerRow.id as string };
}

/* ⛔ NOT the results fixture's markets: this half plants FILL intents on the markets it picks, and the database allows
   ONE live FILL per market — a `--skip-results` re-run that picked one of them would collide with its real stake. */
const mk: string[] = (await pg.query(`select id from "PredictionMarket" where "titleEn" <> all($1::text[]) order by id limit 4`, [RESULT_TITLES])).rows.map((r: Any) => r.id);
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
    /* ⭐ REAL OUTCOME CODES WHERE THE CONSOLE PAINTS A SENTENCE (2026-09-26). This wrote `MARKET_CLOSED` (a TARGET's end
       cause, never an intent's outcome) and `SEAM_REFUSED`, neither of which `CONSOLE_SKIP_SENTENCE` knows — so no row
       this fixture made ever carried a note, and the activity ledger's note line (RESUME-HERE §0c decision 2) could not
       be seen in any served run. A skip is now production's most common one, a stale price; a failure is the one that
       failed three times, which is what `attempts: 3` below already says. */
    reasonCode: status === "FAILED" ? "POISON" : status === "SKIPPED" ? "UD_STALE_PRICE"
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

/* ═══ THE RESULTS TAB (C7 437) — real stakes, settled for real, on six of the seven EAT days and two accounts ═══
 * Everything here goes through the services the product itself uses; only TIME is moved (see the header). */
type DayRead = { day: string; bets: number; open: number; settled: number; result: number };
let resultsRead: { days: DayRead[]; secondStatus: string; switchedOnHere: boolean; switchOnNow: boolean } | null = null;
if (resultsWorld) {
  const { w, running, officer } = resultsWorld;
  let switchedOnHere = false;
  let secondId: string | null = null;
  try {
    const D: Any = await import("../src/lib/server/house-bot/designation.ts");
    const ROSTER: Any = await import("../src/lib/server/house-bot/roster-actions.ts");
    const RULES: Any = await import("../src/lib/house-bot/rules.ts");
    const CRYPTO: Any = await import("../src/lib/server/crypto.ts");
    const CLOCK: Any = await import("../src/lib/house-bot/clock.ts");
    const BOOK: Any = await import("../src/lib/server/house-bot/book.ts");
    const { MARKET_CATEGORIES }: Any = await import("../src/lib/server/market-service.ts");
    const { ALLOWED_DURATIONS }: Any = await import("../src/lib/updown-durations.ts");
    /* The same rules context `seed-house-bots-local.mts` starts its running account with. */
    const CTX = {
      stakeBounds: { minTzs: 1_000, maxTzs: 1_000_000 }, betPlaceRefillPerMin: 10, chains: [],
      categories: MARKET_CATEGORIES, durations: ALLOWED_DURATIONS,
      exitRates: { polls: { freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 }, updown: {} },
      pollMinLifetimeMin: 120, limits: null, bots: [],
    };

    /* ── the second account, designated and started through the services, as `seed-house-bots-local.mts` does ──
       ⭐ ITS HOLDER'S PASSWORD IS MADE HERE AND NEVER WRITTEN DOWN: designation verifies the holder's own password,
       nobody signs in as this holder, and the account is off the desk before the script ends. */
    const secondPassword = `Fx-${randomUUID()}`;
    const secondHolder = await w.user({ balance: SECOND.balance });
    const salt = CRYPTO.randomId(16);
    await w.setUserFields(secondHolder, {
      displayName: SECOND.holderName, passwordHash: await CRYPTO.hashPassword(secondPassword, salt), passwordSalt: salt,
      passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE",
    });
    const designated = await D.designateHouseBot({ officerId: officer, userId: secondHolder, label: SECOND.label, note: null, password: secondPassword, submitId: null });
    if (!designated?.ok) throw new Error(`the second account could not be designated: ${JSON.stringify(designated)}`);
    secondId = designated.bot.id as string;
    {
      const b = await w.dal.houseBotStore.get(secondId);
      const rules = structuredClone(RULES.DEFAULT_RULES_V1(CTX));
      rules.scope.products.polls = true;
      rules.scope.categories = ["macro"];
      rules.modes.polls.fill = true;
      const saved = await w.dal.houseBotStore.saveRules(secondId, b.rulesVersion, { rules, ...w.OPEN_CAPS, freqMinGapSec: 20 });
      if (!saved.ok) throw new Error("the second account's rules could not be saved (CAS)");
      const started = await D.startHouseBot({ officerId: officer, botId: secondId, rulesContext: CTX });
      if (!started?.ok) throw new Error(`the second account could not be started: ${JSON.stringify(started)}`);
    }
    const accounts = { running: { botId: running.id as string, userId: running.userId as string }, second: { botId: secondId, userId: secondHolder } };

    /* ── the days, from ONE key taken once — never a second clock, the rule the tab's own reader keeps (348) ── */
    const today = CLOCK.eatDayKey(Date.now()) as string;
    const days = [today, ...(CLOCK.priorEatDays(today, 6) as string[])];
    const MIN_MS = 60_000;
    /** Where a stake lands: midday of a past day, a few minutes apart; today's ten minutes ago, never before today began. */
    const landAt = (s: ResultStake, k: number): number => {
      const from = CLOCK.eatDayWindow(days[s.day]).fromMs as number;
      return s.day === 0 ? Math.max(from + MIN_MS, Date.now() - 10 * MIN_MS) : from + 12 * 60 * MIN_MS + k * 7 * MIN_MS;
    };

    /* ── the switch: ON only for the placing, and only if it was off; OFF again in the `finally` below ── */
    switchedOnHere = (await w.dal.houseBotControlStore.switchOn({ byId: officer, reason: null })) !== null;
    try {
      for (const [k, s] of RESULT_STAKES.entries()) {
        const m = await w.poll({ graceMin: 0 });
        await w.prisma().$executeRawUnsafe('UPDATE "PredictionMarket" SET "titleEn" = $1, "titleSw" = $1 WHERE id = $2', s.title, m.id);
        /* A REAL player on the other side, first, and locked: a FILL may only take up money already locked against it. */
        const player = await w.user({ balance: 2_000_000 });
        const opposite = await w.svc.buyPosition(player, { marketId: m.id, side: "NO", stake: s.stakeTzs, idempotencyKey: randomUUID() });
        if (!opposite.ok) throw new Error(`the player's stake on "${s.title}" was refused: ${JSON.stringify(opposite)}`);
        await w.backdate(opposite.data.positionId, 30_000);
        await w.ageHouseMinute();
        const acct = accounts[s.on];
        const i = await w.intent(acct, m.id, {
          kind: "FILL", side: "YES", stakeTzs: s.stakeTzs,
          decision: { snapshot: { titleEn: s.title, category: "macro", cutoff: w.iso(3_600_000), roundNumber: null } },
        });
        const placed = await w.place(acct, i);
        if (!placed.ok) throw new Error(`the seam refused the stake on "${s.title}": ${JSON.stringify(placed)}`);
        const positionId = placed.data.positionId as string;
        if (s.outcome !== "OPEN") {
          /* ⛔ SETTLED FOR REAL — the verdict, then the money. A WIN pays out and a VOID refunds through the same
             code every market uses; a LOSS writes nothing, exactly as it does in production. */
          const verdict = s.outcome === "WIN" ? "YES" : s.outcome === "LOSS" ? "NO" : "VOID";
          const resolved = await w.svc.resolveMarket({ marketId: m.id, outcome: verdict, officerId: officer });
          if (!resolved.ok || resolved.data?.stage !== "complete") {
            throw new Error(`"${s.title}" did not resolve in one step (${JSON.stringify(resolved)}) — is two-officer resolution on for this database?`);
          }
          const settled = await w.svc.settleMarket(m.id, { force: true });
          if (!settled.ok) throw new Error(`"${s.title}" did not settle: ${JSON.stringify(settled)}`);
        }
        const byMs = Date.now() - landAt(s, k);
        await w.backdate(positionId, byMs);
        await w.backdateIntent(i.id, byMs);
        const ended = (await w.mdal.positionStore.get(positionId))?.status as string | undefined;
        if (ended !== s.outcome) throw new Error(`the stake on "${s.title}" reads ${ended ?? "missing"}, not ${s.outcome}`);
      }
    } finally {
      if (switchedOnHere) {
        const off = await w.dal.houseBotControlStore.switchOff({ cause: "MANUAL", byId: officer, reason: null }).catch(() => null);
        if (!off) console.error("⛔ THE MASTER SWITCH THIS SCRIPT TURNED ON COULD NOT BE TURNED OFF — turn it off on /admin/desk before anything else.");
      }
    }

    /* ── then the second account leaves the desk, through the officer's own two acts, so its stakes fold into the
       tab's one line for accounts no longer on the desk ── */
    const paused = await ROSTER.pauseHouseBot({ actorId: officer, botId: secondId, reason: null });
    const removed = await ROSTER.removeHouseBot({ actorId: officer, botId: secondId, reason: null });
    if (!paused?.ok || !removed?.ok || removed.status !== "REMOVED") {
      throw new Error(`the second account could not be paused and removed: ${JSON.stringify({ paused, removed })}`);
    }

    /* ── READ BACK from the day book the tab reads, never from what this script believes it wrote ── */
    const read: DayRead[] = [];
    for (const day of days) {
      const books = [...((await BOOK.houseDayBooks(day)) as Map<string, Any>).values()];
      read.push({
        day,
        bets: books.reduce((a, b) => a + b.bets, 0),
        open: books.reduce((a, b) => a + b.openStakeTzs, 0),
        settled: books.reduce((a, b) => a + b.settledStakeTzs, 0),
        result: -books.reduce((a, b) => a + b.realisedLossTzs, 0),
      });
    }
    const short = RESULT_STAKES.map((s) => s.day).filter((d, k, all) => all.indexOf(d) === k)
      .filter((d) => read[d].bets < RESULT_STAKES.filter((s) => s.day === d).length);
    if (short.length > 0) throw new Error(`the day book does not hold this fixture's stakes on ${short.map((d) => days[d]).join(", ")}: ${JSON.stringify(read)}`);
    resultsRead = {
      days: read,
      secondStatus: String((await w.dal.houseBotStore.get(secondId))?.status),
      switchedOnHere,
      switchOnNow: !!(await w.dal.houseBotControlStore.get())?.enabled,
    };
  } catch (err) {
    console.error(`\n⛔ THE RESULTS HALF FAILED PART-WAY: ${String((err as Error)?.stack ?? err).split("\n").slice(0, 3).join(" | ")}`);
    console.error(`   The two panels are seeded. Whatever the results half wrote stays${secondId ? ` (the second account is ${secondId})` : ""}, and its markets`);
    console.error("   carry the marker titles, so a plain re-run is refused: drop the database and seed it again, or re-run with --skip-results.");
    await pg.end();
    process.exit(1);
  }
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

if (resultsRead) {
  /* The tab's own words for a day, from the numbers read back — so a human can check the served page against this. */
  const says = (d: DayRead) => (d.bets === 0 ? "No stakes" : d.settled === 0 ? "Nothing settled"
    : d.result > 0 ? `Profit TZS ${d.result.toLocaleString("en-US")}` : d.result < 0 ? `Loss TZS ${(-d.result).toLocaleString("en-US")}` : "Even");
  console.log("══ the Results tab now has seven days to paint (read back from the day book) ══");
  for (const d of resultsRead.days) {
    console.log(`   ${d.day}   ${String(d.bets).padStart(2)} stake(s) · ${says(d).padEnd(24)} ${d.bets === 0 ? "" : d.open > 0 ? "Still running" : "Final"}`);
  }
  console.log(`   second account  ${resultsRead.secondStatus} — its stakes fold into the tab's line for accounts no longer on the desk`);
  console.log(`   master switch   ${resultsRead.switchOnNow ? "⛔ ON" : "OFF"}${resultsRead.switchedOnHere ? " (this script turned it on to place the stakes, and off again)" : " (this script did not move it)"}`);
  console.log("   open            /admin/desk?tab=results\n");
} else if (SKIP_RESULTS) {
  console.log("══ the Results tab was left alone (--skip-results) ══\n");
}
/* ⛔ AN EXPLICIT EXIT: resolving a market arms its settle timer in this process, which would otherwise keep it alive. */
process.exit(0);
