/**
 * U49s · THE LIVE SWITCH AND THE MARKETING SMS SETTINGS ON A REAL POSTGRES — the shipped writers, the shipped reader, the
 * shipped settings store and the shipped estimate dep, against a scratch PostgreSQL 18.3 migrated from empty.
 *
 * ⭐ WHY THIS EXISTS. `test:marketing-settings` drives every rule against an in-memory row; it cannot say what Postgres does.
 * These are facts about the database, and the three U49s reviews' MAJORs rest on them:
 *   · the rollback's compare-and-delete (`deleteConfigIfValue`, Prisma's jsonb `equals`) deletes the row ONLY while it holds
 *     exactly the value this call wrote — whatever the key order — and leaves any other row alone;
 *   · the CONDITIONAL WRITE (the third review's MAJOR-2): `createConfigIfAbsent` really answers "exists" for a taken key
 *     (Prisma surfaces P2002) and `replaceConfigIfValue` replaces only the identical jsonb value — so a second opening whose
 *     first read raced ahead writes nothing;
 *   · `takeConfig` is DELETE … RETURNING, and an absent key really answers P2025 (nothing taken, not a failure);
 *   · the writers round-trip the switch's three keys exactly, so the strict reader reads back what the writer wrote;
 *   · `audit()` on a database really leaves the COMPLIANCE rows `recorded`, with the payload the writers built.
 *
 *   0  the cluster is migrated and empty for the two keys;
 *   1  the switch through the SHIPPED writers: absent → opened (three keys in SQL, read back open, its COMPLIANCE row) →
 *      the compare-and-delete refuses a different value (and an undefined or null one) and takes back the identical one
 *      in another key order → re-opened
 *      → closed (row gone, its row with openSince) → an expired row and the old two-key row are closed as `was` expired /
 *      malformed → an absent switch is `already_closed` and writes nothing;
 *   1e the ROLLBACK through the shipped writer with one fault planted (the confirmation not recorded): the row is taken
 *      back in SQL, audit_failed, and the ending recorded as open_failed:off; 1f a second owner's row landing before our
 *      confirmation STANDS (other_open) — the shipped compare-and-delete never takes it;
 *   1g the conditional write's two halves on jsonb; 1h DELETE … RETURNING and P2025;
 *   1i ⭐ MAJOR-2 through the shipped writer: a first read that raced ahead (absent, or one stale row) → nothing written,
 *      other_open, recorded not_written, the first opening stands;
 *   1j ⭐ MAJOR-1 through the shipped writer: a delete that commits and loses its reply → recorded as a close
 *      (was:unknown), never "already off"; an opening that lands after it stands (no blind second delete);
 *   1k ⭐ the fourth review's M1 through the shipped writer: a failed first read and a delete that fails unasked →
 *      still_open_after_close, no close recorded, no second delete, the opening stands;
 *   1l the retry's compare-and-delete (`takeConfig` with the row first read) on jsonb, and the database's clock;
 *   1m ⭐ REAL CONCURRENCY on separate pool connections — five openings over an absent switch, five over one stale row,
 *      three closes at once: exactly one of each stands, and exactly one close is recorded (Postgres re-checks a
 *      conditional UPDATE/DELETE's WHERE once it holds the row — this proves it on the shipped writers);
 *   2  the settings through the SHIPPED store: the defaults read fresh, a save writes exactly the record (and its ADMIN
 *      row), a stale page is refused, a row corrupted in SQL reads `readable: false` and refuses the save, untouched;
 *   3  the estimate's REAL default dep prices with the saved record (TZS 7.50), and with NO price once the row is
 *      corrupted (never the default standing in).
 *
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes and deletes rows. ⛔ No backslash anywhere in this file (line breaks are built).
 *
 * Run: `npm run db:probe-marketing-settings` (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs
 * this probe). It needs `embedded-postgres` installed on demand (see `scripts/db-scratch.mts`).
 */
import pg from "pg";

process.exitCode = 1;
const NL = String.fromCharCode(10);
const URL_ = process.env.DATABASE_URL ?? "";
let host = "";
try { host = new URL(URL_).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("refusing: this probe writes and deletes rows, and runs only against a loopback cluster (through pg-probe-run).");
  process.exit(2);
}
// The modules read NODE_ENV and the audit secret at first use: a development process, signed with the local fallback.
delete process.env.AUDIT_CHAIN_SECRET;

const LIVE = await import("../../src/lib/server/marketing/live-switch.ts");
const STORE = await import("../../src/lib/server/marketing/sms-settings.ts");
const PURE = await import("../../src/lib/marketing/sms-settings.ts");
const CONFIG = await import("../../src/lib/server/config-store.ts");
const EST = await import("../../src/lib/server/marketing/estimate.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");

const client = new pg.Client({ connectionString: URL_ });
await client.connect();

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const KEY = LIVE.MARKETING_LIVE_SWITCH_KEY;
const SKEY = STORE.MARKETING_SMS_SETTINGS_KEY;
const rowOf = async (key: string): Promise<unknown> => {
  const r = await client.query('SELECT value FROM "SystemConfig" WHERE key = $1', [key]);
  return r.rows.length === 0 ? null : r.rows[0].value;
};
const setRow = async (key: string, value: unknown): Promise<void> => {
  await client.query(
    'INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()',
    [key, JSON.stringify(value)],
  );
};
const auditsOf = async (action: string): Promise<{ category: string; actorId: string | null; payload: Record<string, unknown> }[]> => {
  await auditFlush();
  const r = await client.query('SELECT category, "actorId", payload FROM "AuditLog" WHERE action = $1 ORDER BY seq', [action]);
  return r.rows.map((x) => ({ category: String(x.category), actorId: x.actorId === null ? null : String(x.actorId), payload: (x.payload ?? {}) as Record<string, unknown> }));
};
const iso = (ms: number): string => new Date(ms).toISOString();
/** JSON with its keys sorted — jsonb keeps its own key order, so a row read back is compared by value, never by text. */
const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));
const OWNER = "usr_pg_probe_owner";

try {
  /* ── 0 · the cluster ── */
  const migrations = await client.query("SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  ok("0 · the scratch cluster is migrated, and holds neither key", migrations.rows[0].n > 50 && (await rowOf(KEY)) === null && (await rowOf(SKEY)) === null,
    `${migrations.rows[0].n} migrations applied`);

  /* ── 1 · the switch through the SHIPPED writers ── */
  const absent = await LIVE.readMarketingLiveSwitch();
  const opened = await LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 30 * 60_000 });
  const stored = (await rowOf(KEY)) as Record<string, unknown> | null;
  const readOpen = await LIVE.readMarketingLiveSwitch();
  const openRows = await auditsOf("marketing.live_switch_opened");
  const intentRows = await auditsOf("marketing.live_switch_opening");
  const firstSeq = async (action: string): Promise<bigint> => {
    const r = await client.query('SELECT min(seq) AS s FROM "AuditLog" WHERE action = $1', [action]);
    return BigInt(r.rows[0].s ?? -1);
  };
  const intentFirst = (await firstSeq("marketing.live_switch_opening")) < (await firstSeq("marketing.live_switch_opened"));
  ok("1a · absent → OPENED through the shipped writer: its 'opening' COMPLIANCE row on the chain FIRST, exactly the three keys in SQL, read back open, and its 'opened' row with the closing time",
    absent.state === "closed" && absent.why === "absent" && opened.ok && stored !== null
      && Object.keys(stored).sort().join(",") === "closesAt,enabledAt,enabledBy" && stored.enabledBy === OWNER
      && readOpen.state === "open" && readOpen.closesAt === stored.closesAt
      && intentRows.length === 1 && intentRows[0].payload.closesAt === stored.closesAt && intentFirst
      && openRows.length === 1 && openRows[0].category === "COMPLIANCE" && openRows[0].actorId === OWNER && openRows[0].payload.closesAt === stored.closesAt,
    `${opened.ok ? "opened" : opened.reason} · row ${JSON.stringify(stored)} · opening rows ${intentRows.length} (first ${intentFirst}) · opened rows ${openRows.length}`);

  // ⭐ THE ROLLBACK'S COMPARE-AND-DELETE, on jsonb: a different value is refused; the identical one, keys reordered, is taken.
  const s = stored as { enabledBy: string; enabledAt: string; closesAt: string };
  const other = await CONFIG.deleteConfigIfValue(KEY, { ...s, closesAt: iso(Date.parse(s.closesAt) + 60_000) });
  // ⛔ Prisma drops an undefined filter: without the guard these two would be UNCONDITIONAL deletes.
  const noValue = await CONFIG.deleteConfigIfValue(KEY, undefined);
  const nullValue = await CONFIG.deleteConfigIfValue(KEY, null);
  const stillThere = (await rowOf(KEY)) !== null;
  const mine = await CONFIG.deleteConfigIfValue(KEY, { closesAt: s.closesAt, enabledBy: s.enabledBy, enabledAt: s.enabledAt });
  const goneAfter = (await rowOf(KEY)) === null;
  ok("1b · ⭐ the compare-and-delete on jsonb deletes ONLY the identical value — a different closing time, an undefined and a null value are refused and the row stays; the same three keys in another order are taken",
    other === false && noValue === false && nullValue === false && stillThere && mine === true && goneAfter,
    `different ${other} · undefined ${noValue} · null ${nullValue} (row kept ${stillThere}) · identical, reordered ${mine} (gone ${goneAfter})`);

  const reopened = await LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 60 * 60_000 });
  const reopenedAt = reopened.ok ? reopened.state.enabledAt : "";
  const closed = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" });
  const closeRows = await auditsOf("marketing.live_switch_closed");
  ok("1c · re-opened, then CLOSED: the row is gone in SQL, the reader says absent, and its COMPLIANCE row carries was:open and openSince",
    reopened.ok && closed.ok && closed.was === "open" && (await rowOf(KEY)) === null
      && (await LIVE.readMarketingLiveSwitch()).state === "closed"
      && closeRows.length === 1 && closeRows[0].payload.was === "open" && closeRows[0].payload.openSince === reopenedAt,
    `${closed.ok ? closed.was : closed.reason} · closed rows ${closeRows.length}`);

  const now = Date.now();
  await setRow(KEY, { enabledBy: OWNER, enabledAt: iso(now - 3 * 3_600_000), closesAt: iso(now - 3_600_000) });
  const expiredRead = await LIVE.readMarketingLiveSwitch();
  const closedExpired = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" });
  await setRow(KEY, { enabledBy: OWNER, enabledAt: iso(now - 60_000) });
  const twoKeyRead = await LIVE.readMarketingLiveSwitch();
  const closedTwoKey = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" });
  const rowsBefore = (await auditsOf("marketing.live_switch_closed")).length;
  const closedAbsent = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" });
  const rowsAfter = (await auditsOf("marketing.live_switch_closed")).length;
  ok("1d · an expired row reads expired and the old two-key row reads malformed — each is DELETED by a close and recorded as such; an absent switch answers already_closed and writes no row",
    expiredRead.state === "closed" && expiredRead.why === "expired" && closedExpired.ok && closedExpired.was === "expired"
      && twoKeyRead.state === "closed" && twoKeyRead.why === "malformed" && closedTwoKey.ok && closedTwoKey.was === "malformed"
      && (await rowOf(KEY)) === null && !closedAbsent.ok && closedAbsent.reason === "already_closed" && rowsAfter === rowsBefore,
    `expired ${closedExpired.ok ? closedExpired.was : closedExpired.reason} · two-key ${closedTwoKey.ok ? closedTwoKey.was : closedTwoKey.reason} · absent ${closedAbsent.ok ? "WROTE" : closedAbsent.reason}`);

  /* ── 1e · THE ROLLBACK THROUGH THE SHIPPED WRITER, one fault planted: the 'opened' confirmation is not recorded ── */
  const realDeps = LIVE.LIVE_SWITCH_WRITE_DEPS;
  const failedBefore = (await auditsOf("marketing.live_switch_open_failed")).length;
  const lostConfirm = await LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 30 * 60_000 }, {
    ...realDeps,
    audit: (e) => (e.action === "marketing.live_switch_opened" ? Promise.resolve({ recorded: false }) : realDeps.audit(e)),
  });
  const failedRows = await auditsOf("marketing.live_switch_open_failed");
  ok("1e · ⭐ the rollback through the shipped writer: a confirmation that is not recorded takes the row back (gone in SQL), answers audit_failed, and records the ending as open_failed:off",
    !lostConfirm.ok && lostConfirm.reason === "audit_failed" && (await rowOf(KEY)) === null
      && failedRows.length === failedBefore + 1 && failedRows[failedRows.length - 1].payload.outcome === "off",
    `${lostConfirm.ok ? "OPEN" : lostConfirm.reason} · row ${JSON.stringify(await rowOf(KEY))} · ending ${String(failedRows[failedRows.length - 1]?.payload.outcome)}`);

  /* ── 1f · a second owner's opening lands before our confirmation: the shipped rollback never takes it ── */
  const theirs = { enabledBy: "usr_pg_probe_other", enabledAt: iso(Date.now()), closesAt: iso(Date.now() + 3_600_000) };
  const raced = await LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 30 * 60_000 }, {
    ...realDeps,
    audit: async (e) => {
      if (e.action !== "marketing.live_switch_opened") return realDeps.audit(e);
      await setRow(KEY, theirs);
      return { recorded: false };
    },
  });
  const keptTheirs = canonical(await rowOf(KEY)) === canonical(theirs);
  ok("1f · ⭐ a row another owner lands before our confirmation STANDS — the shipped compare-and-delete leaves it, and the attempt answers other_open",
    !raced.ok && raced.reason === "other_open" && keptTheirs,
    `${raced.ok ? "OPEN" : raced.reason} · row ${JSON.stringify(await rowOf(KEY))}`);
  await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" });

  /* ── 1g · the conditional write's two halves, on jsonb ── */
  const held = { enabledBy: "usr_pg_probe_other", enabledAt: iso(Date.now()), closesAt: iso(Date.now() + 3_600_000) };
  await setRow(KEY, held);
  const created = await CONFIG.createConfigIfAbsent(KEY, { enabledBy: OWNER, enabledAt: iso(Date.now()), closesAt: iso(Date.now() + 60_000) });
  const createKept = canonical(await rowOf(KEY)) === canonical(held);
  const wrongExpected = await CONFIG.replaceConfigIfValue(KEY, { ...held, closesAt: iso(Date.parse(held.closesAt) + 60_000) }, { enabledBy: OWNER });
  const nullExpected = await CONFIG.replaceConfigIfValue(KEY, null, { enabledBy: OWNER });
  const replaceKept = canonical(await rowOf(KEY)) === canonical(held);
  const replacement = { enabledBy: OWNER, enabledAt: held.enabledAt, closesAt: held.closesAt };
  const rightExpected = await CONFIG.replaceConfigIfValue(KEY, { closesAt: held.closesAt, enabledAt: held.enabledAt, enabledBy: held.enabledBy }, replacement);
  const replaced = canonical(await rowOf(KEY)) === canonical(replacement);
  ok("1g · ⭐ the conditional write on jsonb — createConfigIfAbsent answers 'exists' for a taken key (P2002) and leaves the row; replaceConfigIfValue refuses a different or a null expected value and replaces the identical one, keys reordered",
    created === "exists" && createKept && wrongExpected === false && nullExpected === false && replaceKept && rightExpected === true && replaced,
    `create ${created} (kept ${createKept}) · different ${wrongExpected} · null ${nullExpected} (kept ${replaceKept}) · identical ${rightExpected} (replaced ${replaced})`);

  /* ── 1h · DELETE … RETURNING, and P2025 ── */
  const taken = await CONFIG.takeConfig(KEY);
  const takenGone = (await rowOf(KEY)) === null;
  const takenAgain = await CONFIG.takeConfig(KEY);
  const createdFresh = await CONFIG.createConfigIfAbsent(KEY, replacement);
  const createdRow = canonical(await rowOf(KEY)) === canonical(replacement);
  const tidy = await CONFIG.takeConfig(KEY);
  ok("1h · takeConfig is DELETE … RETURNING — it answers exactly the row it removed; on an absent key it answers deleted:null (P2025), never a failure; createConfigIfAbsent creates on an absent key",
    taken.ok && canonical(taken.deleted) === canonical(replacement) && takenGone && takenAgain.ok && takenAgain.deleted === null
      && createdFresh === "created" && createdRow && tidy.ok && (await rowOf(KEY)) === null,
    `taken ${taken.ok ? JSON.stringify(taken.deleted) : "FAILED"} · absent ${takenAgain.ok ? JSON.stringify(takenAgain.deleted) : "FAILED"} · created ${createdFresh}`);

  /* ── 1i · ⭐ THE THIRD REVIEW'S MAJOR-2 through the shipped writer: a second opening whose first read raced ahead ── */
  const first = { enabledBy: "usr_pg_probe_first", enabledAt: iso(Date.now()), closesAt: iso(Date.now() + 3_600_000) };
  await setRow(KEY, first);
  const failedBeforeRace = (await auditsOf("marketing.live_switch_open_failed")).length;
  const openedBeforeRace = (await auditsOf("marketing.live_switch_opened")).length;
  /** The shipped deps, with the FIRST read answering what it saw before the first opening landed. */
  const staleFirstRead = (seen: unknown) => {
    let loads = 0;
    return { ...realDeps, load: async (key: string) => (loads++ === 0 ? { ok: true as const, value: seen } : realDeps.load(key)) };
  };
  const racedAbsent = await LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 30 * 60_000 }, staleFirstRead(null));
  const keptAfterAbsent = canonical(await rowOf(KEY)) === canonical(first);
  const expiredSeen = { enabledBy: OWNER, enabledAt: iso(Date.now() - 3 * 3_600_000), closesAt: iso(Date.now() - 3_600_000) };
  const racedStale = await LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 30 * 60_000 }, staleFirstRead(expiredSeen));
  const keptAfterStale = canonical(await rowOf(KEY)) === canonical(first);
  const failedRace = await auditsOf("marketing.live_switch_open_failed");
  const openedAfterRace = (await auditsOf("marketing.live_switch_opened")).length;
  ok("1i · ⭐ THE THIRD REVIEW'S MAJOR-2 on Postgres: a second opening whose first read raced ahead of the first — the switch read absent, or one stale row — writes NOTHING through the shipped conditional write, answers other_open, records not_written, and the first opening's row stands",
    !racedAbsent.ok && racedAbsent.reason === "other_open" && keptAfterAbsent
      && !racedStale.ok && racedStale.reason === "other_open" && keptAfterStale
      && failedRace.length === failedBeforeRace + 2 && failedRace.slice(-2).every((r) => r.payload.outcome === "not_written")
      && openedAfterRace === openedBeforeRace,
    `raced an absent read ${racedAbsent.ok ? "OPENED" : racedAbsent.reason} (kept ${keptAfterAbsent}) · raced a stale read ${racedStale.ok ? "OPENED" : racedStale.reason} (kept ${keptAfterStale}) · endings ${failedRace.slice(-2).map((r) => String(r.payload.outcome)).join(",")}`);

  /* ── 1j · ⭐ THE THIRD REVIEW'S MAJOR-1 through the shipped writer: a delete that commits and loses its reply ── */
  const closedBeforeLost = (await auditsOf("marketing.live_switch_closed")).length;
  const lostReply = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" }, {
    ...realDeps,
    take: async (key) => { const r = await realDeps.take(key); return r.ok ? { ok: false as const, error: "connection dropped after commit" } : r; },
  });
  const goneAfterLost = (await rowOf(KEY)) === null;
  const closedLost = await auditsOf("marketing.live_switch_closed");
  const lastLost = closedLost[closedLost.length - 1];
  // …and an opening that lands right after such a delete STANDS: the close looks before it would try again.
  const later = { enabledBy: "usr_pg_probe_later", enabledAt: iso(Date.now()), closesAt: iso(Date.now() + 3_600_000) };
  await setRow(KEY, first);
  let takes = 0;
  const lostThenOpened = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" }, {
    ...realDeps,
    take: async (key) => {
      takes++;
      const r = await realDeps.take(key);
      if (!r.ok) return r;
      await setRow(KEY, later);
      return { ok: false as const, error: "connection dropped after commit" };
    },
  });
  const laterStands = canonical(await rowOf(KEY)) === canonical(later);
  ok("1j · ⭐ THE THIRD REVIEW'S MAJOR-1 on Postgres: a close whose delete COMMITS and loses its reply is recorded as a close (was:unknown, openSince) with the row gone in SQL — never 'It was already off'; an opening that lands after such a delete stands (one delete, reopened)",
    lostReply.ok && lostReply.was === "unknown" && !lostReply.reopened && goneAfterLost
      && closedLost.length === closedBeforeLost + 1 && lastLost?.payload.was === "unknown" && lastLost?.payload.openSince === first.enabledAt
      && lostThenOpened.ok && lostThenOpened.was === "unknown" && lostThenOpened.reopened && takes === 1 && laterStands,
    `lost reply ${lostReply.ok ? `closed:${lostReply.was}` : lostReply.reason} (gone ${goneAfterLost}, recorded ${String(lastLost?.payload.was)}) · then opened ${lostThenOpened.ok ? `closed:${lostThenOpened.was}${lostThenOpened.reopened ? "+reopened" : ""}` : lostThenOpened.reason} (deletes ${takes}, later stands ${laterStands})`);
  await CONFIG.takeConfig(KEY);

  /* ── 1k · ⭐ THE FOURTH REVIEW'S M1 through the shipped writer: a failed first read and a delete that fails unasked ── */
  await setRow(KEY, first);
  const closedBeforeM1 = (await auditsOf("marketing.live_switch_closed")).length;
  let m1Loads = 0;
  let m1Takes = 0;
  const m1 = await LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" }, {
    ...realDeps,
    load: async (key) => (m1Loads++ === 0 ? { ok: false as const, error: "pool timeout" } : realDeps.load(key)),
    take: async () => { m1Takes++; return { ok: false as const, error: "pool timeout" }; },
  });
  const m1Stands = canonical(await rowOf(KEY)) === canonical(first);
  const closedAfterM1 = (await auditsOf("marketing.live_switch_closed")).length;
  ok("1k · ⭐ THE FOURTH REVIEW'S M1 on Postgres: a close whose first read failed and whose delete failed without effect answers still_open_after_close, records NO close, tries no second delete — the opening stands in SQL",
    !m1.ok && m1.reason === "still_open_after_close" && m1Stands && closedAfterM1 === closedBeforeM1 && m1Takes === 1,
    `${m1.ok ? `closed:${m1.was}` : m1.reason} · opening stands ${m1Stands} · closed rows +${closedAfterM1 - closedBeforeM1} · deletes ${m1Takes}`);

  /* ── 1l · the retry's delete takes ONLY the row first read (jsonb), and the database's clock reads ── */
  const notIt = await CONFIG.takeConfig(KEY, { ...first, closesAt: iso(Date.parse(first.closesAt) + 60_000) });
  const nullIt = await CONFIG.takeConfig(KEY, null);
  const stillFirst = canonical(await rowOf(KEY)) === canonical(first);
  const itReordered = await CONFIG.takeConfig(KEY, { closesAt: first.closesAt, enabledBy: first.enabledBy, enabledAt: first.enabledAt });
  const goneNow = (await rowOf(KEY)) === null;
  const askedAt = Date.now();
  const dbClock = await LIVE.readDatabaseClockMs();
  const offset = dbClock === null ? null : dbClock - (askedAt + Date.now()) / 2;
  ok("1l · the retry's compare-and-delete on jsonb — a different value and a null one take nothing and the row stays; the identical value in another key order is taken and answered; readDatabaseClockMs reads the cluster's clock (this machine's, within 2 s)",
    notIt.ok && notIt.deleted === null && nullIt.ok && nullIt.deleted === null && stillFirst
      && itReordered.ok && canonical(itReordered.deleted) === canonical(first) && goneNow && offset !== null && Math.abs(offset) < 2_000,
    `different ${notIt.ok ? JSON.stringify(notIt.deleted) : "FAILED"} · null ${nullIt.ok ? JSON.stringify(nullIt.deleted) : "FAILED"} (kept ${stillFirst}) · identical ${itReordered.ok ? "taken" : "FAILED"} (gone ${goneNow}) · clock offset ${offset === null ? "UNREAD" : `${Math.round(offset)} ms`}`);

  /* ── 1m · ⭐ REAL CONCURRENCY — openings and closes racing on separate connections ── */
  // Five openings whose first reads all saw the switch absent: their creates race in Postgres — exactly one stands.
  const raceOpen = (seen: unknown) => {
    let loads = 0;
    return LIVE.openMarketingLiveSwitch({ actorId: OWNER, via: "card", forMs: 30 * 60_000 }, {
      ...realDeps,
      load: async (key: string) => (loads++ === 0 ? { ok: true as const, value: seen } : realDeps.load(key)),
    });
  };
  const fromAbsent = await Promise.all([1, 2, 3, 4, 5].map(() => raceOpen(null)));
  const absentWinners = fromAbsent.filter((r) => r.ok);
  const absentRow = await rowOf(KEY);
  const absentStands = absentWinners.length === 1 && absentWinners[0].ok && canonical(absentRow) === canonical({
    enabledBy: absentWinners[0].state.enabledBy, enabledAt: absentWinners[0].state.enabledAt, closesAt: absentWinners[0].state.closesAt,
  });
  const absentLosers = fromAbsent.filter((r) => !r.ok).map((r) => (r.ok ? "OPEN" : r.reason));
  await CONFIG.takeConfig(KEY);
  // Five openings whose first reads all saw the same expired row: their replaces race — exactly one matches.
  const staleNow = Date.now();
  const staleRow = { enabledBy: OWNER, enabledAt: iso(staleNow - 3 * 3_600_000), closesAt: iso(staleNow - 3_600_000) };
  await setRow(KEY, staleRow);
  const fromStale = await Promise.all([1, 2, 3, 4, 5].map(() => raceOpen(staleRow)));
  const staleWinners = fromStale.filter((r) => r.ok);
  const staleLosers = fromStale.filter((r) => !r.ok).map((r) => (r.ok ? "OPEN" : r.reason));
  const staleStands = staleWinners.length === 1 && staleWinners[0].ok && (await LIVE.readMarketingLiveSwitch()).state === "open";
  // Three closes of that one opening at once: exactly one removes it, and exactly one close is recorded.
  const closedBeforeRace = (await auditsOf("marketing.live_switch_closed")).length;
  const closes = await Promise.all([1, 2, 3].map(() => LIVE.closeMarketingLiveSwitch({ actorId: OWNER, via: "card" })));
  const closedAfterRace = (await auditsOf("marketing.live_switch_closed")).length;
  const removedBy = closes.filter((r) => r.ok && r.was === "open").length;
  const otherCloses = closes.filter((r) => !(r.ok && r.was === "open")).map((r) => (r.ok ? `closed:${r.was}` : r.reason));
  ok("1m · ⭐ REAL CONCURRENCY on separate connections — five openings that all read absent: exactly one stands, the rest other_open; five that all read the same expired row: exactly one replaces it, the rest other_open; three closes at once: exactly one removes it and exactly one close is recorded, the rest already_closed",
    absentStands && absentLosers.length === 4 && absentLosers.every((x) => x === "other_open")
      && staleStands && staleLosers.length === 4 && staleLosers.every((x) => x === "other_open")
      && removedBy === 1 && closedAfterRace - closedBeforeRace === 1 && otherCloses.every((x) => x === "already_closed") && (await rowOf(KEY)) === null,
    `from absent: ${absentWinners.length} stood, others ${absentLosers.join(",")} · from one stale row: ${staleWinners.length} stood, others ${staleLosers.join(",")} · closes: ${removedBy} removed it, others ${otherCloses.join(",")}, closed rows +${closedAfterRace - closedBeforeRace}`);

  /* ── 2 · the settings through the SHIPPED store ── */
  const fresh = await STORE.reloadMarketingSmsSettings();
  const D = PURE.MARKETING_SMS_SETTINGS_DEFAULTS;
  const post = (over: Record<string, string>, base: string) => ({
    pricePerSegmentTzs: "7.50", codesReserveTzs: "25000", campaignLimitTzs: "12000", windowStartMinute: "510", windowEndMinute: "1140", base, ...over,
  });
  const saved = await STORE.saveMarketingSmsSettings(post({}, PURE.settingsFingerprint({ ...D })), OWNER);
  const sqlRow = (await rowOf(SKEY)) as Record<string, unknown> | null;
  const want = { v: 1, pricePerSegmentTzs: 7.5, codesReserveTzs: 25_000, campaignLimitTzs: 12_000, windowStartMinute: 510, windowEndMinute: 1140 };
  const exact = sqlRow !== null && Object.keys(sqlRow).sort().join(",") === Object.keys(want).sort().join(",")
    && Object.entries(want).every(([k, v]) => sqlRow[k] === v);
  const stale = await STORE.saveMarketingSmsSettings(post({ campaignLimitTzs: "13000" }, PURE.settingsFingerprint({ ...D })), OWNER);
  const settingRows = await auditsOf(STORE.MARKETING_SMS_SETTINGS_AUDIT.action);
  ok("2a · the settings: the defaults read fresh with no row; a save writes EXACTLY the record in SQL and its ADMIN row; a page saved from the old base is refused stale",
    fresh.ok && !fresh.stored && fresh.readable && saved.ok && exact && !stale.ok && stale.reason === "stale"
      && settingRows.length === 1 && settingRows[0].category === "ADMIN" && (settingRows[0].payload.after as Record<string, unknown> | undefined)?.pricePerSegmentTzs === 7.5,
    `saved ${saved.ok ? saved.changed.join(",") : saved.reason} · row ${JSON.stringify(sqlRow)} · stale ${stale.ok ? "SAVED" : stale.reason} · audit rows ${settingRows.length}`);

  /* ── 3 · the estimate's REAL default dep prices with the saved record ── */
  const estimate = () => EST.loadEstimateInputsFor("ADMIN", { ok: true, population: 10, forecast: 5 }, {
    moneyVisible: async () => true,
    readBalance: async () => ({ tzs: 50_000, at: Date.now(), outcome: "fresh" as const, stale: false, error: null }),
  });
  const priced = await estimate();
  const pricedLabel = priced.money?.cost.kind === "configured" ? priced.money.cost.tzsPerSegment : priced.money?.cost.kind;
  ok("3a · the estimate's REAL default dep re-reads the record and prices TZS 7.50 as configured (nothing measured on an empty cluster)",
    pricedLabel === 7.5, `cost ${JSON.stringify(priced.money?.cost)}`);

  // Corrupt the stored record in SQL: the store reads it as not readable in full, refuses a save, and the estimate gets NO price.
  await setRow(SKEY, { ...want, pricePerSegmentTzs: "x" });
  const corrupt = await STORE.reloadMarketingSmsSettings();
  const refused = await STORE.saveMarketingSmsSettings(post({}, PURE.settingsFingerprint(corrupt.ok ? corrupt.settings : { ...D })), OWNER);
  const untouched = canonical(await rowOf(SKEY)) === canonical({ ...want, pricePerSegmentTzs: "x" });
  const unpriced = await estimate();
  ok("2b · 3b · a record corrupted in SQL reads readable:false, refuses every save and stays untouched — and the estimate gives NO configured price (never the default standing in)",
    corrupt.ok && !corrupt.readable && !refused.ok && refused.reason === "unreadable" && untouched && unpriced.money?.cost.kind === "unknown",
    `readable ${corrupt.ok ? corrupt.readable : "NOT READ"} · save ${refused.ok ? "SAVED" : refused.reason} · untouched ${untouched} · cost ${JSON.stringify(unpriced.money?.cost)}`);
} catch (err) {
  ok("the probe ran to the end", false, String((err as Error)?.stack ?? err).split(NL).slice(0, 4).join(" | "));
} finally {
  await client.end().catch(() => {});
}

console.log(`${NL}marketing-settings pg probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
process.exit(process.exitCode);
