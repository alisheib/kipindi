/**
 * IS THE "41 MESSAGES IN ONE HOUR" A STEADY RATE, OR A SETTLEMENT BATCH?
 *
 * `s30-notify-volume.mts` §2 found a worst-off player at 41 would-be messages in one hour —
 * which lands almost exactly on Ali's own "forty emails an hour". That is too convenient to
 * report without taking it apart.
 *
 * ⛔ E-58's LESSON: A RATE IS NOT A DIAGNOSIS. `void_rate = 100%` and `void_reason='operator'`
 * mean opposite things, and a session once filed a one-off bulk remediation as an ongoing
 * product failure. If those 41 messages are 20 rounds of a STOPPED chain settling together in
 * one batch, the number describes a backlog and not what a player would live with. If they are
 * spread evenly across the hour, it describes the product.
 *
 * So: bucket the worst hour by MINUTE, name the player, and separately compute the steady
 * state implied by the chains that are actually RUNNING right now.
 */
import { Client } from "pg";
import { roundSpanMinutes } from "../src/lib/updown-durations.ts";

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
const pad = (v: unknown, w: number) => String(v).padStart(w);

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ── 1. Name the worst-off player and the exact hour ──
  const worst = (await c.query(`
    select date_trunc('hour', m."settledAt") as hr, p."userId",
           u."displayName" as name, u."phoneE164" as phone, count(*) as msgs
      from "Position" p
      join "PredictionMarket" m on m.id = p."marketId"
      join "User" u on u.id = p."userId"
     where m."productLine" = 'UPDOWN' and p.status in ('WIN','LOSS','VOID')
       and m."settledAt" > now() - interval '14 days'
     group by 1, 2, 3, 4 order by msgs desc limit 1`)).rows[0];
  if (!worst) { console.log("no data"); await c.end(); return; }
  console.log(`── the worst-off recipient ──`);
  console.log(`   ${worst.userId}  ${worst.name ?? "(no name)"}  ${worst.phone}`);
  console.log(`   hour ${String(worst.hr).slice(0, 16)} → ${worst.msgs} would-be messages\n`);

  // ── 2. Spread them across that hour, BY MINUTE. A batch stacks; a product paces. ──
  console.log("── those messages bucketed by MINUTE within the hour (batch vs steady rate) ──");
  const byMin = (await c.query(`
    select to_char(m."settledAt", 'HH24:MI') as minute, count(*) as msgs,
           count(distinct m.id) as rounds
      from "Position" p
      join "PredictionMarket" m on m.id = p."marketId"
     where m."productLine" = 'UPDOWN' and p.status in ('WIN','LOSS','VOID')
       and p."userId" = $1
       and date_trunc('hour', m."settledAt") = $2
     group by 1 order by 1`, [worst.userId, worst.hr])).rows;
  for (const r of byMin) console.log(`   ${r.minute}  ${pad(r.msgs, 3)} msgs over ${pad(r.rounds, 2)} rounds  ${"█".repeat(Number(r.msgs))}`);
  const minutes = byMin.length;
  const maxIn1 = Math.max(...byMin.map((r) => Number(r.msgs)));
  console.log(`\n   spread over ${minutes} distinct minute(s); busiest single minute ${maxIn1} messages`);
  console.log(`   ⇒ ${minutes <= 3 ? "A BATCH — this is a backlog settling, not a lived rate." : "SPREAD — this is close to a lived rate."}\n`);

  // ── 3. THE STEADY STATE: what the chains RUNNING right now would send ──
  console.log("── steady state from the chains that are RUNNING on production right now ──");
  const chains = (await c.query(`
    select ch.id, a."key" as asset, ch."durationMinutes" as mins, ch.state
      from "UpDownChain" ch join "UpDownAsset" a on a.id = ch."assetId"
     where ch.state = 'RUNNING' order by ch."createdAt"`)).rows;
  if (!chains.length) console.log("   (no RUNNING chains — the board is operator-driven, so this is expected)");
  let perHour = 0;
  for (const ch of chains) {
    const span = roundSpanMinutes(Number(ch.mins));
    const rate = 60 / span;
    perHour += rate;
    console.log(`   ${ch.id}  ${ch.asset} ${ch.mins}m  span ${span}m → ${rate.toFixed(1)} rounds/h`);
  }
  console.log(`\n   ⇒ a player betting EVERY round on EVERY running chain receives ${perHour.toFixed(1)} messages/hour, ${(perHour * 24).toFixed(0)}/day`);
  console.log(`   ⇒ the same player on ONE 3-minute chain would receive 15.0/hour, 360/day (the ceiling)\n`);

  // ── 4. What the digest actually delivered, so the alternative is not hypothetical ──
  // ⛔ `event ilike '%digest%'` finds NOTHING — the digest writes kind = 'ROUND_RESULT'
  // (notification-service.ts:333). A first pass used the word and reported the channel dead.
  console.log("── the digest, by its REAL key (kind = 'ROUND_RESULT', href /updown/history?day=) ──");
  for (const r of (await c.query(`
    select date_trunc('day', "createdAt") as day, count(*) as rows_, count(distinct "userId") as players,
           count(*) filter (where "sentAt" is not null) as sent
      from "Notification"
     where kind = 'ROUND_RESULT' and href like '/updown/history?day=%'
       and "createdAt" > now() - interval '14 days'
     group by 1 order by 1 desc`)).rows)
    console.log(`   ${String(r.day).slice(0, 10)}  ${pad(r.rows_, 3)} digests to ${pad(r.players, 3)} players, ${pad(r.sent, 3)} sent`);

  console.log("\n── one real digest body, verbatim — so the trade-off is judged on what it SAYS ──");
  const sample = (await c.query(`
    select "titleEn", "bodyEn", href, "createdAt"::text as at from "Notification"
     where kind = 'ROUND_RESULT' and href like '/updown/history?day=%'
     order by "createdAt" desc limit 1`)).rows[0];
  if (!sample) console.log("   (none)");
  else {
    console.log(`   ${sample.at}  ${sample.href}`);
    console.log(`   TITLE: ${sample.titleEn}`);
    console.log(`   BODY : ${sample.bodyEn}`);
  }

  await c.end();
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
