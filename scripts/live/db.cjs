/**
 * THE ONE WAY TO OPEN A CONNECTION TO PRODUCTION FROM A SCRIPT — and the reason it exists.
 *
 * ⛔ §3's FIRST TRAP IS THAT `pg` SILENTLY SHIFTS EVERY TIMESTAMP BY THIS MACHINE'S UTC OFFSET,
 * and session 30 paid for it AGAIN despite it being documented, because a fresh probe was
 * written with a bare `new Client(...)` like every other probe in this repo. Prisma maps
 * `DateTime` to `timestamp(3) WITHOUT time zone` and writes UTC wall-clock into it; when
 * node-postgres reads a naked timestamp it builds a JS `Date` in the PROCESS's local zone —
 * EAT (+3) here — so `.toISOString()` reads three hours early.
 *
 * ⭐ WHAT MADE IT SO CONVINCING, AND WHY A COMMENT WAS NEVER GOING TO BE ENOUGH: `now()` is a
 * genuine `timestamptz` and round-trips CORRECTLY, so one clock in the same script is right and
 * the other is wrong, and they disagree by exactly the offset of the room you are sitting in.
 * Session 30 read a settled round's `closesAt` as 18:01Z, saw the page's auditable settlement
 * proof say `00:01:00 EAT`, and was one commit from filing a money-grade false-statement finding
 * against a page that was correct on every line.
 *
 * 🔴 AND §3's STATED REMEDY WAS FALSE. It said *"use the harness (`live/harness.mjs` sets the
 * type parsers for OIDs 1114/1082)"* — `setTypeParser` appeared NOWHERE in this repository, and
 * `harness.mjs` is a Playwright driver that never imports `pg`. A trap list whose remedy does
 * not exist is worse than no remedy, because the next session imports the harness and then
 * trusts `.toISOString()`. This file is that remedy, made real.
 *
 * WHAT IT DOES: returns the raw STRING for `timestamp` (1114) and `date` (1082), so a timestamp
 * read through it is the UTC wall-clock the database actually holds and cannot be misread by a
 * zone conversion that never should have happened. `timestamptz` (1184) is deliberately left
 * alone — it carries its offset and the driver handles it correctly.
 *
 *   const { connect } = require("./live/db.cjs");     // from scripts/
 *   const c = await connect();
 *   const { rows } = await c.query(`select "closesAt" from "UpDownRound" where id = $1`, [id]);
 *   rows[0].closesAt   // "2026-08-05 21:01:00"  — a string, in UTC, unambiguous
 *
 * ⚠️ Still the honest alternative, and still fine: `::text`-cast in the query itself. This
 * session's DB session timezone is `Etc/UTC` (verified with `current_setting('TIMEZONE')`), so
 * `::text` is already true UTC. `scripts/s29-board-state.cjs` does exactly that and has been
 * telling the truth all along.
 */
const pg = require("pg");

// 1114 = timestamp without time zone · 1082 = date. Hand back the bytes Postgres sent.
// ⛔ Do NOT add 1184 (timestamptz) here — it is unambiguous and the driver is right about it.
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1082, (v) => v);

/**
 * The proxy rewrite every probe in this repo copy-pastes. `postgres.railway.internal` only
 * resolves from INSIDE Railway; a script run locally under `railway run` gets the internal
 * host in DATABASE_URL and must go through the public proxy instead.
 */
function publicUrl(raw = process.env.DATABASE_URL || "") {
  return raw.replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
}

async function connect(url = publicUrl()) {
  if (!url) throw new Error("no DATABASE_URL — run under `railway run --service 50pick --`");
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
}

module.exports = { connect, publicUrl };
