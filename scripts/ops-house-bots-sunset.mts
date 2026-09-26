/**
 * RETIRE THE HOUSE-BOT PROGRAMME — act 1 of 2 (04 F2, FS-06).
 *
 *   npm run ops:house-bots-sunset                                  # dry run: the exact census, nothing written
 *   npm run ops:house-bots-sunset -- --apply --reason "board decision 2026-09-20"
 *
 * ⛔ SUNSET IS A WIND-DOWN THAT INSTALLS A TERMINAL STATE. It is NOT a data retirement (every marker,
 * intent, event, press and target is kept) and it does NOT unwind open money (open house positions
 * settle normally — a pari-mutuel pool cannot void one position, and nothing is ever voided
 * automatically). It tells no holder anything, ever (D19).
 *
 * ⛔ IT IS THE FIRST OF TWO ACTS, AND THE ORDER IS THE POINT:
 *   1. this, with --apply: seconds, no deploy needed, and the desk is terminal the moment it commits;
 *   2. then set `desk: "WITHDRAWN"` in `src/lib/feature-state.ts`, commit and deploy. ⚠️ The key is `desk`
 *      since 2026-09-21 (it was `houseBots`); this line and the print below named the old key until 2026-09-26.
 * Act 1 is a DATABASE marker (it survives a redeploy of an older image); act 2 is a CODE constant (it
 * survives a database someone edits by hand). Each refuses the switch on its own; neither is allowed to
 * become the only one anyone maintains.
 *   3. afterwards, run `npm run ops:house-bots-status` until the open marked positions reach 0. ⛔ Never
 *      void, refund or cash one out to make that number fall faster.
 *
 * ── WHY THIS ONE GOES THROUGH THE SERVICES, WHERE `ops-house-bots-off.mts` DOES NOT ─────────────
 * A9's OFF exists for a database the app cannot reach, so it must not use the app's pool. A sunset is the
 * opposite case: the console is merely UNNECESSARY, not unreachable. And it needs three things raw SQL
 * cannot give it — a conditional write per account under that holder's own wallet lock, the HMAC-chained
 * compliance row, and the one admin alert — so `ops-stop-updown-chains.mts`'s standing rule applies in
 * full: it goes through the same calls the console would make.
 *
 * ⛔ THE SCRIPT ITSELF IS THIN ON PURPOSE. Every decision lives in `src/lib/server/house-bot/sunset.ts`,
 * where `test:house-bot-ops` drives it on BOTH store twins. A procedure that lived in a script could only
 * ever be tested by running the script.
 *
 * ⛔ IT CANNOT TURN ANYTHING ON: the state it writes is the one state `switchOnHouseBots` refuses.
 */
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const reasonAt = argv.indexOf("--reason");
const REASON = reasonAt === -1 ? "" : (argv[reasonAt + 1] ?? "");
/** An operator decision is attributed to an operator, never to "system". */
const OFFICER = process.env.OPS_OFFICER_ID ?? null;

const { houseBotSunsetCensus, sunsetHouseBots, SUNSET_REASON_MIN, SUNSET_REASON_MAX } = await import("../src/lib/server/house-bot/sunset.ts");

const tzs = (n: number): string => `TZS ${n.toLocaleString("en-US")}`;

let census;
try {
  census = await houseBotSunsetCensus();
} catch (e) {
  console.error(`\n⛔ the desk could not be read — nothing was written: ${String((e as Error)?.message ?? e).slice(0, 300)}\n`);
  process.exit(1);
}

console.log(`\n══ house bots · sunset ══   ${APPLY ? "APPLY" : "DRY RUN — nothing will be written"}`);
console.log(`   ⛔ a wind-down, not a deletion: every marker, intent, event, press and target is KEPT.`);
console.log(`   ⛔ open house money is NOT unwound: it settles normally, and nothing is ever voided automatically.`);
console.log(`\n── the census this run would record ──`);
console.log(`   master switch    ${census.control.enabled ? "ON" : "OFF"} · off cause ${census.control.offCause ?? "—"}`);
console.log(`   bots             ${census.bots} non-REMOVED${census.bots === 0 ? "" : ` · ${Object.entries(census.botsByStatus).map(([s, n]) => `${s} ${n}`).join(", ")}`}`);
console.log(`   live intents     ${census.liveIntents} (PENDING or CLAIMED, across the whole desk)`);
console.log(`   active targets   ${census.activeTargets}`);
console.log(`   open house money ${tzs(census.openExposureTzs)} across ${census.markets} market(s) — it SETTLES, it is not voided`);
for (const r of census.openExposureByMarket.slice(0, 20)) console.log(`     ${r.marketId}  ${tzs(r.openStakeTzs)}  ${r.bots} bot(s)`);
console.log(`\n   reason           ${REASON.length === 0 ? `— (required: --reason "…", ${SUNSET_REASON_MIN}–${SUNSET_REASON_MAX} characters)` : JSON.stringify(REASON)}`);
console.log(`   officer          ${OFFICER ?? "— (none given: OPS_OFFICER_ID=…)"}`);
console.log(`\n   what --apply writes, in this order:`);
console.log(`     1  the control row  → enabled=false, offCause=SUNSET   (⛔ never through switchOff: on today's`);
console.log(`                            OFF desk that predicate matches nothing and would leave NO terminal marker)`);
console.log(`     2  per account      → every ACTIVE target ENDED(SUNSET) with one TARGET_ENDED event each,`);
console.log(`                            then the account REMOVED with cause SUNSET — one transaction per holder`);
console.log(`     3  per account      → its PENDING and CLAIMED intents cancelled`);
console.log(`     4  events           → one REMOVED per account, plus ONE global SUNSET event`);
console.log(`     5  compliance       → ONE house_bot.sunset row: { bots, cancelled, openExposureByMarket }`);
console.log(`                            ⛔ the --reason is NOT in that payload — the chain cannot be rewritten, so it`);
console.log(`                            rides on the event row and HouseBot.removedReason, which erasure can reach`);
console.log(`     6  alert            → ONE admin alert for the whole wind-down, never one per account`);
console.log(`   ⛔ NOT written: no press row is touched, nothing is voided, refunded or cashed out, and no holder is told.`);

if (!APPLY) {
  console.log(`\nNOTHING WRITTEN — re-run with --apply --reason "…" to retire the programme.\n`);
  process.exit(0);
}

const done = await sunsetHouseBots({ actorId: OFFICER, reason: REASON });
if (!done.ok) {
  console.error(`\n⛔ REFUSED (${done.code}): ${done.message}`);
  console.error(`   Nothing was written.\n`);
  process.exit(done.code === "REASON" ? 2 : 1);
}
if (!done.changed) {
  console.log(`\nAlready retired — 0 rows changed, no second event, no second compliance row, no second alert.\n`);
  process.exit(0);
}

console.log(`\n   1  control row     → offCause SUNSET`);
console.log(`   2  accounts        → ${done.counts.botsRemoved} REMOVED(SUNSET) · ${done.counts.targetsEnded} target(s) ENDED(SUNSET)`);
console.log(`   3  intents         → ${done.counts.intentsCancelled} cancelled`);
console.log(`   4  global event    → ${done.eventId}`);
console.log(`   5  compliance      → ${done.recorded ? done.auditId ?? "written" : "recorded: false — THE DESK IS RETIRED but the compliance row did not land; file the note by hand"}`);
console.log(`   6  alert           → one, carrying ${tzs(done.census.openExposureTzs)} still open across ${done.census.markets} market(s)`);
console.log(`\n   NEXT, and it is not optional:`);
console.log(`     · set desk: "WITHDRAWN" in src/lib/feature-state.ts, commit and deploy — the code half of this state;`);
console.log(`     · then run npm run ops:house-bots-status until the open marked positions reach 0. They settle on their own.`);
console.log(`   See docs/HOUSE-BOTS.md §11 "Sunset".\n`);
process.exit(0);
