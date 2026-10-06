/**
 * ops:marketing-live-switch — THE AUDITED OPS DOOR to the marketing live switch (spec `docs/marketing-specs/ENGINE-SPEC.md`
 * §4.3 U49s decision 9; E13). The owner's own door is the "Marketing SMS sending" card on Admin → System; this is the
 * ONE other, for Claude acting on Ali's G1 delegation (Claude never signs in as Ali or Jay).
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN. It calls the SAME `openMarketingLiveSwitch` / `closeMarketingLiveSwitch` the card's
 * actions call, with `via: "ops"`, no actor, and the operator's screened `by` and `reason` (plain words, at most 120
 * characters, no phone number) — so the duration bounds, the read-back, the COMPLIANCE row and the fail-closed rollback
 * are exactly the card's. It imports nothing that writes SystemConfig itself (`test:marketing-settings` S12).
 *
 * ⛔ IT REFUSES WITHOUT A DATABASE: a no-database process cannot store the switch, and "opened" would be a lie.
 * ⛔ AND A WRITE REFUSES UNLESS IT RUNS WITH PRODUCTION'S OWN ENVIRONMENT, AS `railway run` INJECTS IT: the COMPLIANCE row
 * must be signed by the key production verifies with, so a write needs `RAILWAY_ENVIRONMENT_NAME=production` and
 * `RAILWAY_SERVICE_NAME=50pick` (Railway sets both under `railway run --service 50pick`) and an `AUDIT_CHAIN_SECRET`
 * that is set and is not `SESSION_SECRET`. ⚠️ That is the realistic mistake closed — a local `.env` run — not a
 * cryptographic proof of the key; a row signed with any other key would fail `verifyChainFull` on the server. Nothing
 * secret is ever printed.
 * ⛔ AND AN OPEN REFUSES FROM A PC WHOSE CLOCK IS MORE THAN 20 SECONDS OFF THE DATABASE'S (the U49s fourth review's m4):
 * `railway run` runs this on the operator's PC, and the writers stamp and judge the switch by this process's clock — a
 * clock a minute behind would read the owner's fresh opening as malformed, a minute ahead would stamp an opening the
 * servers read as malformed while this door printed ON. ⭐ A CLOSE ONLY WARNS (the fifth review's F5): its delete needs no
 * clock, and a stop that waits on one is not a stop.
 *
 * Run it through Railway so production's audit secret signs the row (STEP 23's precedent). `railway run` hands this PC the
 * app's PRIVATE database host, which resolves only inside Railway: this door rewrites it to the public proxy, as every ops
 * script in this repo does (the URL is never printed):
 *   railway run --service 50pick npm run ops:marketing-live-switch -- status
 *   railway run --service 50pick npm run ops:marketing-live-switch -- open --minutes 120 --by "Claude for Ali (G1)" --reason "U52a live drive"
 *   railway run --service 50pick npm run ops:marketing-live-switch -- close --by "Claude for Ali (G1)" --reason "drive done"
 *
 * Exit: 0 done · 1 refused, not confirmed or needing attention (the reason is printed in the card's words), or a status
 * that could not be read · 2 not run (usage, no database, no production audit secret, or — for an open — this PC's clock
 * off the database's).
 */
import { hasDatabase } from "../../src/lib/server/prisma.ts";
import {
  closeMarketingLiveSwitch, openMarketingLiveSwitch, opsClockProblem, readDatabaseClockMs, readMarketingLiveSwitch,
  LIVE_SWITCH_MAX_OPEN_MS, LIVE_SWITCH_MIN_OPEN_MS,
} from "../../src/lib/server/marketing/live-switch.ts";

/** ⛔ The public proxy, before anything reads the database (the client reads the URL when it is first used): `railway run`
 *  injects `postgres.railway.internal`, which does not resolve off Railway — without this every read here is unreadable
 *  and every write is refused `cannot_read`. */
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
}

const USAGE = [
  "usage: npm run ops:marketing-live-switch -- status",
  "       npm run ops:marketing-live-switch -- open --minutes <30–1440> --by \"<who>\" --reason \"<why>\"",
  "       npm run ops:marketing-live-switch -- close --by \"<who>\" --reason \"<why>\"",
].join("\n");

function flag(name: string): string | undefined {
  const args = process.argv.slice(3);
  const at = args.indexOf(`--${name}`);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : undefined;
}

function describe(s: Awaited<ReturnType<typeof readMarketingLiveSwitch>>): string {
  if (s.state === "open") return `ON — opened at ${s.enabledAt} by ${s.enabledBy}; it switches itself off at ${s.closesAt}`;
  if (s.why === "expired") return `OFF — it switched itself off at ${s.closedAt ?? "its closing time"}`;
  return `OFF (${s.why})`;
}

async function main(): Promise<number> {
  const command = process.argv[2];
  if (command !== "status" && command !== "open" && command !== "close") {
    console.log(USAGE);
    return 2;
  }
  if (!hasDatabase()) {
    console.log("REFUSING: no DATABASE_URL — the switch cannot be stored without the database. Run it through the runner (see the header).");
    return 2;
  }
  if (command === "status") {
    const s = await readMarketingLiveSwitch();
    console.log(describe(s));
    return s.state === "closed" && s.why === "unreadable" ? 1 : 0;
  }
  const auditKey = process.env.AUDIT_CHAIN_SECRET ?? "";
  const viaRailway = process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick";
  if (!viaRailway || auditKey.trim() === "" || auditKey === (process.env.SESSION_SECRET ?? "")) {
    console.log("REFUSING: this is not production's own environment (run it through `railway run --service 50pick`, which sets RAILWAY_ENVIRONMENT_NAME and the audit secret) — the COMPLIANCE row would not verify.");
    return 2;
  }
  // This PC's clock against the database's, measured across one round trip: it gates an OPEN; a close only warns.
  const askedAt = Date.now();
  const dbMs = await readDatabaseClockMs();
  const clockProblem = opsClockProblem(dbMs, askedAt, Date.now());
  const by = flag("by");
  const reason = flag("reason");
  if (command === "open") {
    if (clockProblem !== null) {
      console.log(`REFUSING: ${clockProblem} — sync it (Windows: Settings → Time & language → Date & time → Sync now) and run it again.`);
      return 2;
    }
    const minutes = Number(flag("minutes") ?? "");
    if (!Number.isInteger(minutes) || minutes * 60_000 < LIVE_SWITCH_MIN_OPEN_MS || minutes * 60_000 > LIVE_SWITCH_MAX_OPEN_MS) {
      console.log(`REFUSED: --minutes must be a whole number from ${LIVE_SWITCH_MIN_OPEN_MS / 60_000} to ${LIVE_SWITCH_MAX_OPEN_MS / 60_000}.`);
      return 1;
    }
    const r = await openMarketingLiveSwitch({ actorId: null, via: "ops", forMs: minutes * 60_000, by, reason });
    console.log(r.ok ? `DONE: ${describe(r.state)}` : `REFUSED (${r.reason}): ${r.error}`);
    return r.ok ? 0 : 1;
  }
  if (clockProblem !== null) console.log(`WARNING: ${clockProblem} — switching off anyway (a stop never waits on a clock).`);
  const r = await closeMarketingLiveSwitch({ actorId: null, via: "ops", by, reason });
  if (!r.ok) {
    console.log(`${r.reason === "already_closed" ? "NOTHING TO DO" : "REFUSED"} (${r.reason}): ${r.error}`);
    return r.reason === "already_closed" ? 0 : 1;
  }
  // ⛔ Never "OFF" from a read that never landed (the fifth review's F3): say it could not be read back, and to look.
  const unread = r.state.state === "closed" && r.state.why === "unreadable";
  const was = r.was === "open" ? "" : r.was === "unknown" ? " (its delete lost its reply, so what it removed isn't known)" : ` (the row it removed already read ${r.was})`;
  const now = unread ? "the switch couldn't be read back afterwards — run status to check it" : describe(r.state);
  const reopened = r.reopened ? " — ⚠️ but someone switched it on again at the same moment; it is ON" : "";
  console.log(`DONE: switched off${was}; now ${now}${reopened}${r.recorded ? "" : " — ⚠️ but its COMPLIANCE row was NOT recorded: tell the developer."}`);
  return unread || r.reopened || !r.recorded ? 1 : 0;
}

process.exitCode = await main();
// The audit queue and the database pool keep the event loop alive; every write above was awaited, so leave now.
process.exit(process.exitCode);
