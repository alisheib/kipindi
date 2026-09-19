/**
 * THE ENGINE'S HEALTH, FOR THE OWNER ONLY — the admin-gated server reader (owner ruling D19; C5-SPEC ruling 172),
 * AND the one server-side staleness predicate the console renders (C7-SPEC rulings 352, 353, 354, 414).
 *
 * ⛔ WHY IT MOVED. `/api/health` is public and the proxy does not gate it; it used to print a `houseBots` block (schema
 * state, engine started/refused, tick times, the late-reaction drop count) to any visitor. Under D19 nothing about house
 * bots is public, so the same facts live here, behind the house-alert audience, and render on `/admin/system` from its
 * SERVER page. `/api/health` keeps only the readiness gate: a missing house schema still answers 503 with `ok:false`,
 * and the reason is in the server log and on this reader. Commit 7's strip and Commit 8's house-bot status command (not
 * built yet, so not named as a script here) read this reader too.
 *
 * ⛔ THE GATE DECIDES ON THE STORED ROLE, never the session cookie's photograph of it (`session.ts`): the viewer's account
 * is read, and only the house-alert audience (`inHouseAlertAudience`, the rule `houseBotAlertRecipients` follows — every
 * ADMIN) gets anything back. Every other viewer gets `null` before any engine or schema read: no card, no placeholder.
 *
 * ⛔ **IT FAILS CLOSED ON THE VIEWER LOOKUP TOO** (ruling 354(a), C7 step 4b). `db.user.findById` used to sit OUTSIDE
 * the `try`, so a pool timeout propagated out of this function and `/admin/system` swallowed it with a `.catch` that
 * turned it into the `null` meaning "not in the audience" — a page that looks healthy while nobody could tell. The
 * lookup is inside now and a failure answers `null` the way `houseConsoleAudience` already does, so the two gates
 * cannot disagree about a transient failure, and that page's `.catch` is redundant and removed.
 *
 * ⛔ **THE STALENESS VERDICT IS THE PLANNER BEAT ALONE** (ruling 353), and it REVERSES `PLAN.md:450`'s OR. The poller
 * writes its beat only after a CLAIM — a healthy engine with nothing due writes none — so an OR would paint the
 * console's gravest statement on an idle, healthy engine, and an alarm that is usually wrong is one nobody reads. The
 * planner beat IS liveness: it is written whenever the money-safety duties succeed, work or no work. The boot grace is
 * not optional either: `FIRST_TICK_DELAY_MS` is 20 s, so without it every deploy paints the danger Callout.
 * ⛔ AND THE VERDICT IS COMPUTED ON THE SERVER, HERE, never in a page and never in a client module: no threshold
 * constant, no `RUNTIME_KEY` and no house-named prop crosses into a chunk.
 *
 * ⛔ **THE DURABLE BEATS ARE THE SOURCE, NOT THIS PROCESS'S OWN STATE** (rulings 309, 352). `houseBotEngineHealth()`
 * describes the process RENDERING the page, which is not necessarily the process running the engine — a healthy engine
 * on another replica would render as dead. Those figures may be shown only labelled as THIS server's.
 */
import { BOOT_GRACE_MS, ENGINE_STALE_MS, RUNTIME_KEY } from "@/lib/house-bot/constants";
import type { StoredHouseBotRuntime } from "../house-bot-dal";
import { db } from "../store";
import { inHouseAlertAudience } from "./alerts";
import { houseBotEngineHealth } from "./engine";
import { houseBotSchemaReady, type HouseSchemaState } from "./schema-ready";

export type HouseEngineHealthView =
  | { readable: true; schema: HouseSchemaState; engine: ReturnType<typeof houseBotEngineHealth> }
  | { readable: false };

/** The engine and schema state for `viewerUserId`, or `null` when that account is not in the house-alert audience. */
export async function houseEngineHealthFor(viewerUserId: string | null | undefined): Promise<HouseEngineHealthView | null> {
  if (!viewerUserId) return null;
  try {
    /* ⛔ 354(a) · THE LOOKUP IS INSIDE THE TRY. Outside it, a pool timeout propagated and the only caller turned it
     * into the `null` that means "not in the audience" — so an outage rendered as "your role cannot view this". */
    const viewer = await db.user.findById(viewerUserId);
    if (!viewer || !inHouseAlertAudience(viewer.role)) return null;
    return { readable: true, schema: await houseBotSchemaReady(), engine: houseBotEngineHealth() };
  } catch {
    // An ADMIN whose read failed is told so; the page never turns a failed read into a healthy-looking card.
    return { readable: false };
  }
}

/* ═══ THE DURABLE BEATS, AND THE ONE VERDICT (rulings 352, 353, 414; A24) ═════════════════════════════════════ */

/**
 * What `listInstances()`'s rows say about the ENGINE, folded once. ⛔ Every field is read off a DURABLE row written on
 * the DATABASE clock — `beat:planner`, `beat:poller:<instance>` and `engine:<instance>` — and never off this process.
 */
export type HouseEngineBeats = {
  /** `beat:planner`'s own beat. Liveness (ruling 353). */
  plannerBeatAtMs: number | null;
  /** ⭐ X1 · the duties the last planner pass could not complete, by NAME, off the planner row's key-scoped column. */
  plannerFailedDuties: string[];
  plannerFailedAtMs: number | null;
  /** The NEWEST `engine:%` boot (A23's "latest boot"), and how many instances answered. */
  bootAtMs: number | null;
  instances: number;
  /** The newest poller beat, and A24's newest poller failure across every instance. INFORMATION, never the verdict. */
  pollerBeatAtMs: number | null;
  pollerErrorAtMs: number | null;
  pollerErrorStreak: number;
  /** A24's durable database-clock offset, from the instance that measured it last. */
  skewMs: number | null;
};

const ms = (iso: string | null): number | null => {
  if (iso == null) return null;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : null;
};
const newest = (a: number | null, b: number | null): number | null => (a == null ? b : b == null ? a : Math.max(a, b));

/**
 * Fold the runtime rows into the engine's durable facts.
 *
 * ⛔ THE ROWS ARE SELECTED BY THEIR KEY PREFIX, FROM `RUNTIME_KEY` (ruling 352). `PLAN.md:450`'s `pollerBeatAt` and
 * `plannerBeatAt` name fields that do not exist on `StoredHouseBotRuntime` — the beats are ROWS, each carrying one
 * `beatAt` column, and every key comes from that one table.
 * ⛔ AND THE POLLER'S COLUMNS ARE KEY-SCOPED, WHICH IS WHY THE SAME NAMES CARRY TWO MEANINGS. On a
 * `beat:poller:<instance>` row they are A24's claim failures; on `beat:planner` they are X1's failed duty NAMES.
 * Reading them off the wrong row is the only way to get this wrong, so each is read off exactly one row family.
 */
export function houseEngineBeats(rows: readonly StoredHouseBotRuntime[]): HouseEngineBeats {
  const planner = rows.find((r) => r.key === RUNTIME_KEY.plannerBeat) ?? null;
  const engines = rows.filter((r) => r.key.startsWith("engine:"));
  const pollers = rows.filter((r) => r.key.startsWith("beat:poller:"));
  return {
    plannerBeatAtMs: planner ? ms(planner.beatAt) : null,
    /* ⛔ NAMES ONLY, and the split is on the one separator the writer uses. An empty string is not a duty. */
    plannerFailedDuties: (planner?.pollerErrorCode ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0),
    plannerFailedAtMs: planner ? ms(planner.pollerErrorAt) : null,
    bootAtMs: engines.reduce<number | null>((acc, r) => newest(acc, ms(r.bootAt)), null),
    instances: engines.length,
    pollerBeatAtMs: pollers.reduce<number | null>((acc, r) => newest(acc, ms(r.beatAt)), null),
    pollerErrorAtMs: pollers.reduce<number | null>((acc, r) => newest(acc, ms(r.pollerErrorAt)), null),
    pollerErrorStreak: pollers.reduce((acc, r) => Math.max(acc, r.pollerErrorStreak), 0),
    skewMs: pollers.reduce<number | null>((acc, r) => (r.skewMs == null ? acc : acc == null ? r.skewMs : r.skewMs), null),
  };
}

/**
 * ⛔ ONE VERDICT, ONE HOME, AND THE ORDER IS THE DECISION (rulings 353, 414).
 *
 *   · `UNREADABLE` — the beats could not be read at all. ⛔ NEVER a healthy band and never an absent card (354(c)):
 *     "Last seen: unknown" is the only honest thing to show, and an unreadable state that renders as healthy is
 *     Ali's own "'Not applicable' is the most dangerous silent verdict" in its exact form.
 *   · `BOOTING`   — a boot inside `BOOT_GRACE_MS`. `FIRST_TICK_DELAY_MS` is 20 s, so without this every deploy
 *     paints the danger row.
 *   · `STALE`     — 353's rule, and the only one that says the engine is not running.
 *   · `POLLER_FAILING` — A24: a poller ERROR newer than that poller's own beat. ⛔ This is NOT "the poller beat is
 *     stale", which 353 struck: an idle poller writes nothing and is perfectly healthy. It is a recorded FAILURE
 *     that nothing has succeeded since — a condition that had no writer at all until C7 step 4b.
 *   · `DUTY_FAILED` — X1: the last planner pass beat, so the engine is alive, and a duty did not complete.
 *   · `IDLE`      — on, healthy, and no account is running: nothing will be staked, and no other card says so.
 *   · `null`      — nothing to say. The switch being OFF is one of those: the strip two cards up already says
 *     "The desk is off. Nothing will be staked.", and 432(n) refuses one state saying one fact twice.
 *
 * ⚠️ 414's "engine disabled by configuration" row is NOT BUILT, and that is measured rather than dropped: the only
 * writer of `engineEnabled` in the whole tree is `engine.ts:229`, which writes `true` on a SUCCESSFUL boot, and a
 * refused start writes no row at all (`test:house-bot-engine` 11.16 pins exactly that). So a disabled engine is
 * INDISTINGUISHABLE from one that never booted, and it is already reported — as `STALE`, which is the true
 * statement. A branch nothing can reach is the dead control ruling 432(a) refuses, one layer down.
 */
export type HouseEngineVerdict = "UNREADABLE" | "BOOTING" | "STALE" | "POLLER_FAILING" | "DUTY_FAILED" | "IDLE";

export function houseEngineVerdict(input: {
  /** The master switch, from the control row the caller has ALREADY read (ruling 435(e)). */
  on: boolean | null;
  /** `null` means the beats could not be READ — never an empty set of rows, which is a different fact (355). */
  beats: HouseEngineBeats | null;
  /** ⛔ `null` means the ROSTER read failed, which is not the same as zero (355) — `IDLE` is then not claimed. */
  activeAccounts: number | null;
  nowMs: number;
}): HouseEngineVerdict | null {
  const { on, beats, activeAccounts, nowMs } = input;
  if (on !== true) return null;
  if (beats === null) return "UNREADABLE";
  const booting = beats.bootAtMs !== null && nowMs - beats.bootAtMs <= BOOT_GRACE_MS;
  if (booting) return "BOOTING";
  /* 353 · the boot grace has passed (or nothing ever booted) AND the planner beat is missing or older than the
   * threshold. `PLANNER_INTERVAL_MS` 15 s against `ENGINE_STALE_MS` 30 s leaves exactly one missed tick of headroom. */
  if (beats.plannerBeatAtMs === null || nowMs - beats.plannerBeatAtMs > ENGINE_STALE_MS) return "STALE";
  if (beats.pollerErrorAtMs !== null && (beats.pollerBeatAtMs === null || beats.pollerErrorAtMs > beats.pollerBeatAtMs)) {
    return "POLLER_FAILING";
  }
  if (beats.plannerFailedDuties.length > 0) return "DUTY_FAILED";
  if (activeAccounts === 0) return "IDLE";
  return null;
}
