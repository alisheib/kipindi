/**
 * THE VOLUME BEHIND ALI'S "notification on win or lose" — measured, never remembered.
 *
 * Ali's dated decision of 2026-07-24 SUPPRESSES per-round Up & Down notifications
 * (`perEventNotificationsSuppressed()` returns true for UPDOWN) because *"forty emails an
 * hour is unusable"*, and E-37 replaced them with a daily digest. His mandate for session 30
 * asks for a per-round win/lose notification, which CONTRADICTS that decision — so the
 * trade-off goes to him with real numbers instead of a remembered phrase.
 *
 * ⛔ THE NUMBER THAT MATTERS IS NOT ROUNDS/DAY. It is MESSAGES TO ONE PLAYER PER HOUR.
 * "Forty emails an hour" is a per-recipient claim; a platform sending 400/h to 400 players
 * is not what he objected to. Every figure below is grouped by `userId` for that reason.
 *
 * ⚠️ THE PRODUCT MODEL CHANGED ON 2026-08-04 (E-67): nothing emits on a timer, a round
 * exists only because an operator pressed "Generate round". So §1/§2 measure the rate under
 * OPERATOR drive — which is LOW by construction and would flatter the case for un-suppressing.
 * §3 computes the standing-chain rate from `roundSpanMinutes()` itself, so the honest ceiling
 * comes from the product's own arithmetic and cannot drift from it.
 *
 * ⛔ ENUM VALUES ARE `WIN` / `LOSS` / `VOID` (prisma/schema.prisma:798). The first draft of
 * this script asked for `WON`/`LOST`/`REFUNDED` and Postgres rejected it — which is the good
 * outcome. A status filter that silently matched nothing would have printed a confident zero.
 */
import { Client } from "pg";
import { roundSpanMinutes, resultPhaseMinutes } from "../src/lib/updown-durations.ts";

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

const n = (v: unknown) => Number(v ?? 0);
const pad = (v: unknown, w: number) => String(v).padStart(w);

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log(`── server clock ── ${(await c.query(`select now()::text as t`)).rows[0].t}\n`);

  // ── 1. What a per-round channel would have sent, per day, over the last 14 days ──
  // One message per SETTLED position. VOID (refund) already sends today — E-43 closed the
  // inversion — so it is the honest baseline for what a per-event channel FEELS like.
  console.log("── 1. Up & Down settled positions per day (= the messages a per-round channel WOULD send) ──");
  const perDay = (await c.query(`
    select date_trunc('day', m."settledAt") as day,
           count(*) filter (where p.status = 'WIN')  as wins,
           count(*) filter (where p.status = 'LOSS') as losses,
           count(*) filter (where p.status = 'VOID') as voids,
           count(distinct p."userId")                as players,
           count(distinct m.id)                      as rounds
      from "Position" p
      join "PredictionMarket" m on m.id = p."marketId"
     where m."productLine" = 'UPDOWN' and m."settledAt" > now() - interval '14 days'
     group by 1 order by 1 desc`)).rows;
  if (!perDay.length) console.log("   (no settled Up & Down positions in 14 days)");
  for (const r of perDay)
    console.log(`   ${String(r.day).slice(0, 10)}  msgs ${pad(n(r.wins) + n(r.losses) + n(r.voids), 4)}  (win ${pad(r.wins, 3)} · loss ${pad(r.losses, 3)} · void ${pad(r.voids, 3)})  players ${pad(r.players, 3)}  rounds ${pad(r.rounds, 3)}`);

  // ── 2. THE FIGURE THE DECISION WAS ABOUT: messages to ONE player in ONE hour ──
  console.log("\n── 2. WORST-CASE MESSAGES TO ONE PLAYER IN ONE HOUR (this is what 'forty an hour' meant) ──");
  const perHour = (await c.query(`
    select hr, max(msgs) as worst, sum(msgs) as total, count(*) as recipients
      from (
        select date_trunc('hour', m."settledAt") as hr, p."userId", count(*) as msgs
          from "Position" p
          join "PredictionMarket" m on m.id = p."marketId"
         where m."productLine" = 'UPDOWN' and p.status in ('WIN','LOSS','VOID')
           and m."settledAt" > now() - interval '14 days'
         group by 1, 2
      ) t group by hr order by worst desc limit 10`)).rows;
  if (!perHour.length) console.log("   (none)");
  for (const r of perHour)
    console.log(`   ${String(r.hr).slice(0, 16)}  worst-off player ${pad(r.worst, 3)} msgs/h  ·  ${pad(r.total, 4)} across ${pad(r.recipients, 3)} players`);

  // ── 3. THE CEILING, from the product's own arithmetic — not extrapolated from history ──
  console.log("\n── 3. IF A CHAIN RAN ALL DAY — per RUNNING chain, to a player who plays every round ──");
  console.log("   (span = betting duration + result phase; both read from updown-durations.ts, not copied)");
  for (const mins of [3, 5, 10, 15, 30, 60]) {
    const span = roundSpanMinutes(mins);
    const perDayN = Math.floor((24 * 60) / span);
    console.log(`   ${pad(mins, 2)}m betting + ${resultPhaseMinutes(mins)}m result = ${pad(span, 2)}m span → ${pad(perDayN, 3)} rounds/day → ${pad(perDayN, 3)} msgs/day, ${(60 / span).toFixed(1)}/h`);
  }

  // ── 4. What is ACTUALLY being sent today — grouped by `event`, never guessed from titles ──
  console.log("\n── 4. EVERY notification event written in the last 7 days (the real channel mix) ──");
  for (const r of (await c.query(`
    select event, kind, count(*) as ct, count(distinct "userId") as players,
           count(*) filter (where "sentAt" is not null) as sent
      from "Notification" where "createdAt" > now() - interval '7 days'
     group by 1, 2 order by ct desc limit 30`)).rows)
    console.log(`   ${pad(r.ct, 5)}  sent ${pad(r.sent, 5)}  players ${pad(r.players, 4)}  ${String(r.event).padEnd(28)} ${r.kind ?? ""}`);

  // ── 5. The digest specifically — E-37's replacement channel, and whether it is alive ──
  console.log("\n── 5. THE DIGEST (E-37) — is the channel that replaced per-round messages actually sending? ──");
  const dig = (await c.query(`
    select date_trunc('day', "createdAt") as day, count(*) as rows_, count(distinct "userId") as players,
           count(*) filter (where "sentAt" is not null) as sent
      from "Notification"
     where event ilike '%digest%' and "createdAt" > now() - interval '14 days'
     group by 1 order by 1 desc`)).rows;
  if (!dig.length) console.log("   ⛔ NO rows with an event matching '%digest%' in 14 days — check §4's list before concluding it is dead.");
  for (const r of dig)
    console.log(`   ${String(r.day).slice(0, 10)}  ${pad(r.rows_, 4)} rows to ${pad(r.players, 3)} players, ${pad(r.sent, 4)} sent`);

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
