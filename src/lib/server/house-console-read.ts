/**
 * THE HOUSE DATA ON A CONSOLE PAGE, READ ONLY FOR A VIEWER WHO MAY SEE THAT PAGE (owner ruling D19; C5-SPEC rulings 259, 260).
 *
 * ⛔ WHY THE GATE IS HERE AND NOT ONLY IN THE LAYOUTS. The console's staff check lives in `admin/layout.tsx` and each
 * section's `AdminSectionGate`. A layout's verdict does not stop its page from rendering: measured 2026-09-17 on this
 * branch's production build, a signed-in PLAYER — the holder and a trigger player too — who opened a console page as a
 * plain document received 200 and the page's whole server payload behind the redirect, and a flight request whose router
 * state names the admin layouts skips them altogether. So every read of house data a console page renders asks THIS
 * module, which decides on the viewer's STORED role (never the session cookie's photograph of it) before it reads
 * anything, the way the engine health card does (ruling 172).
 *
 * ⛔ FAIL CLOSED. A viewer that cannot be read is not in the audience.
 * ⛔ OWNER RULING D20 (2026-09-17): a house bot is an ordinary player in every report, and the admin-only house
 * displays are un-built — so what this module gates is the AUDIT ROWS a console page renders, and nothing else. A later
 * console surface that reads house data reads it through here (C5-SPEC ruling 259's audience), never past it.
 *
 * ⛔ WHAT THIS MODULE GATES, NAMED (C7-SPEC ruling 340). Two things, and a console file may reach neither any other way:
 *   · the AUDIT ROWS a console page renders — `houseAuditForConsole`, seventeen call sites in fourteen files;
 *   · and, from C7 step 1, a NAMED READER PER CONSOLE SURFACE, each `(viewerUserId, route, …)`, which resolves the
 *     audience FIRST, performs its own reads only after the verdict, and returns a PAINTED view model (finished strings,
 *     numbers and booleans) or `null`. `houseRosterForConsole` is the first. A page therefore names no read module, and
 *     a refused viewer's payload holds no label, no id, no figure and no sentence.
 *   ⛔ The readers are QUERY-shaped, never thunk-shaped: the gate-call pin fixes each export's arity, requires arg 0 to
 *   be the signed-in session's id and arg 1 to be a STRING LITERAL equal to the calling file's own console route
 *   (`scripts/lib/house-bot-reports-cases.mts`, case 0.260.1), so a door taking a prepared read could not be called.
 *
 * ⛔ THE AUDIT ROWS A CONSOLE PAGE RENDERS (ruling 260). The same measurement, extended to every console page, found
 * `/admin/players/<holder>` streaming the holder's `house_bot.password_verified` row, and `/admin/audit` every house row with
 * its payload, to a signed-in player. So every audit row a console file reads passes `houseAuditForConsole` before the page
 * uses it: whole for the route's audience, and NO row for anyone else. Not a house-free filter: a platform row can carry a
 * house VALUE (a deduped notice's kind, a failed letter's tag, an error's stack), and a refused erasure's reason exists only
 * for a live house bot, so even a rewritten reason names the account. No list of actions, keys or values closes that; a
 * viewer outside the audience is painted the section gate's restricted panel, so none of the page's rows is theirs to read.
 */
import { db } from "./store";
import { isStaffRole, isAdmin, isOwnerOnlyPath, domainForPath } from "./roles";
import { canView } from "./rbac";
import type { AuditEntry } from "./audit";
import { formatTzs, formatTzsCompact, formatNumber } from "@/lib/utils";
import { CONSOLE_ROUTE, CONSOLE_LIMITS_HREF, DEFAULT_TAB, type ConsoleTab } from "@/lib/house-bot/console-routes";
import { eatDayKey, formatEat } from "@/lib/house-bot/clock";
import { FIELD_META, REQUIRED_FOR_MASTER_ON, parseHouseBotRules } from "@/lib/house-bot/rules";
import { TONE_CHIP, type StatusChipVariant } from "@/lib/status-tone";
import { houseBotControlStore, houseBotStore, houseBookStore, HouseSchemaNotReady, type StoredHouseBot, type StoredHouseBotControl } from "./house-bot-dal";
import { houseDayBooks, type HouseDayBook } from "./house-bot/book";
import { HOUSE_BOT_STATUS_DISPLAY } from "./house-bot/status-display";
import { DESIGNATE_COPY } from "./house-bot/designation";
import { playerHandle } from "./house-bot/alerts";
import { loadParseContext } from "./house-bot/rules-context";

/**
 * ⛔ THE SECOND BELT (C7-SPEC ruling 341). `OWNER_ONLY_PREFIXES` in `roles.ts` carries `/admin/desk` too, and it is the
 * belt the section gate and the RBAC suites read — but it is a LIST A MERGE CAN DROP, and `roles.ts` is named in PLAN
 * §11 as expected merge-conflict ground. If that entry were ever lost, `domainForPath` would fall CLOSED to `"ops"` and
 * this module would answer `canView(role, "ops")` — a question the DB-backed grant matrix that `/admin/roles` edits LIVE
 * gets to answer, so one grant edit and no deploy would put SUPPORT, GROWTH, MODERATOR, FINANCE or AUDITOR inside the
 * console's read audience. A gate that fails closed on its own constant cannot be widened by losing a line elsewhere.
 * ⛔ No route joins this prefix except by a code change: there is no exemption list and no widening.
 */
export const HOUSE_CONSOLE_PREFIX = CONSOLE_ROUTE;

/**
 * True when `route` is the console section or anything under it — so `/new` and `/<id>` inherit.
 * ⛔ Exported so the belt can be measured on its own: an ESM namespace is read-only, so a suite cannot patch
 * `isOwnerOnlyPath` away to prove this branch is doing the work, and a belt nobody can measure separately is a belt
 * that will be deleted by a merge without anything going red.
 */
export function isHouseConsoleRoute(route: string): boolean {
  return route === HOUSE_CONSOLE_PREFIX || route.startsWith(`${HOUSE_CONSOLE_PREFIX}/`);
}

/**
 * True only for a signed-in STAFF account whose stored role may VIEW the console route `route` (the same question the
 * section gate asks: Owner-only paths for ADMIN, every other path by its domain's view grant). Never throws.
 * ⛔ The console section is answered by `HOUSE_CONSOLE_PREFIX` FIRST, before `isOwnerOnlyPath` and before `canView`.
 */
export async function houseConsoleAudience(viewerUserId: string | null | undefined, route: string): Promise<boolean> {
  if (typeof viewerUserId !== "string" || viewerUserId.length === 0 || !route.startsWith("/admin")) return false;
  try {
    const viewer = await db.user.findById(viewerUserId);
    if (!viewer || !isStaffRole(viewer.role)) return false;
    if (isHouseConsoleRoute(route)) return isAdmin(viewer.role);
    if (isOwnerOnlyPath(route)) return isAdmin(viewer.role);
    return (await canView(viewer.role, domainForPath(route))) === true;
  } catch {
    return false;
  }
}

/** What a console file's audit reader returns: the ring's rows, a durable page of them, or `null` from the page's own catch. */
export type ConsoleAuditRead = AuditEntry[] | { entries: AuditEntry[]; total?: number; truncated?: boolean } | null | undefined;

/**
 * The audit rows a console page renders, for `viewerUserId` on `route`: exactly what was read for the route's audience; for
 * anyone else (fail closed, `houseConsoleAudience`) NO row — an empty array, or the durable page with no entries, a total of
 * 0 and nothing truncated (a kept total beside fewer entries would count what was withheld). Takes the read itself, or its
 * promise, keeps its shape, and lets a rejected read reject into the page's own catch.
 */
export async function houseAuditForConsole<T extends ConsoleAuditRead>(viewerUserId: string | null | undefined, route: string, read: T | PromiseLike<T>): Promise<T> {
  const rows = await read;
  if (rows == null || (await houseConsoleAudience(viewerUserId, route))) return rows;
  if (Array.isArray(rows)) return [] as unknown as T;
  return { ...rows, entries: [], ...("total" in rows ? { total: 0 } : {}), ...("truncated" in rows ? { truncated: false } : {}) } as T;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * THE CONSOLE'S OWN READERS (C7-SPEC rulings 340, 346, 347, 348, 355, 356, 421)
 *
 * One NAMED reader per console surface. Each takes `(viewerUserId, route, …)`, resolves the audience FIRST, performs
 * its reads only after the verdict, and returns a PAINTED view model — finished strings, numbers and booleans — or
 * `null`. `null` means the page paints the restricted panel before computing or fetching anything.
 *
 * ⛔ THE COPY IS BUILT HERE, NOT IN THE PAGE, AND IT IS NEUTRAL (ruling 453). Nothing these readers paint names the
 * feature: an entry is an "account", the section is "the desk", money moved is a "stake", a ceiling is a "limit". The
 * words bot, house, liquidity and counter-stake appear in no painted string. Identifiers are exempt and server-only.
 *
 * ⛔ MONEY ONLY AS USAGE AGAINST A CONFIGURED LIMIT (ruling 266, in 361's one grammar): `used TZS 42,000 of
 * TZS 50,000`, lower-case "used", no percentage in the words, no "remaining", no arrow. An unset limit is "Not set"
 * and never a zero — `over(cap, value)` in the seam is `cap == null || value > cap`, so an unset limit REFUSES every
 * stake, and "TZS 0 of TZS 0" would tell the owner the opposite of the truth.
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A KPI tile, painted. `unavailable` is the kit's own "n/a · couldn't compute" state — never a fabricated zero. */
export type ConsoleKpiTile = { label: string; value: string; delta?: string; unavailable?: boolean };

/** One roster row, painted. ⛔ No net, no balance, no lifetime figure (rulings 266, 310, 360, 368). */
export type ConsoleRosterRow = {
  id: string;
  /* ⛔ NO `href` AT THIS CHECKPOINT, AND IT IS RULING 432(a)'s OWN RULE APPLIED WHERE THE FIRST PASS MISSED IT
   * (ruling 432(h)). `/admin/desk/[id]` has no page until C7 step 4, so a way-out link on every row would be the
   * one control an officer reaches first answering the app-root 404 — the same defect the head action and the
   * master switch are rendered disabled for. The column arrives with the page it opens, the way "Last bet" arrives
   * with its reader (432(g)), and `test:house-bot-console` 4.432h ties the two together so step 4 cannot forget it. */
  /** A gated value: the account's own label. */
  label: string;
  /** `playerHandle(userId)` — "Player #TAIL". ⛔ Never a name, a phone or an email (04 R6). */
  handle: string;
  statusWord: string;
  statusChip: StatusChipVariant;
  /** Projected loss used of its limit, in 361's grammar, or "Not set". */
  lossCell: ConsoleUsageCell;
  /** Open stake used of its limit, in 361's grammar, or "Not set". */
  exposureCell: ConsoleUsageCell;
  /** Stakes placed today of the per-day count limit, in 361's grammar, or "Not set". */
  betsCell: ConsoleUsageCell;
  /** The saved scope words, from `FIELD_META`'s own labels. */
  products: string;
};

/** The empty state's own cause, named. ⛔ An empty table that does not say WHY is the defect 416 exists for. */
export type ConsoleEmpty = { title: string; body: string };

export type ConsoleRosterView = {
  /** ⛔ 421: the feature's tables are not on this database. A STATE, not a failure and not a zero. */
  schemaMissing: boolean;
  /**
   * ⛔ 421's OTHER HALF, AND IT IS NOT THE SAME STATE (rulings 304, 355, 421). The control row's read FAILED for a
   * reason that is not a missing schema — a transient connection, a lock timeout, anything. The switch's state is then
   * UNKNOWN, so nothing on this page may say the desk is off: `on` is null, the chip is null, the strip renders the
   * kit's failure treatment, and the band renders four `unavailable` tiles rather than no band at all.
   * ⛔ The first pass collapsed this into the OFF sentence — "The desk is off. Nothing will be staked." — while the
   * switch may have been ON and money moving, which is the fabricated state ruling 355 forbids.
   */
  controlUnreadable: boolean;
  /** The master switch's own state. `null` when there is no control row to switch (421), and when it could not be read. */
  on: boolean | null;
  chip: { word: string; variant: StatusChipVariant } | null;
  /** The OFF or ON sentence, formatted on the server. */
  stateSentence: string;
  /** The auto-off cause, when the switch is off for one (308). */
  offCause: string | null;
  /** How many members of `REQUIRED_FOR_MASTER_ON` are unset — COUNTED, never typed (306). */
  unsetRequired: number;
  /** Where the limits panel WILL be (step 3). ⚠️ Painted as a LINK only once `CONSOLE_TABS` holds `limits`
   *  (`LIMITS_TAB_READY`): until then `?tab=limits` resolves back to the roster, so a link here would repaint the
   *  identical page with no limits form and no explanation — ruling 432(i). */
  limitsHref: string;
  /** The head action's VISIBLE disabled reason when the roster is full (314), or its plain not-ready reason (432(j)). */
  rosterFullReason: string | null;
  /** Why the head action is disabled when the roster is NOT full — a disabled control with no reason reads as broken. */
  actionReason: string;
  /** Why the master switch is disabled, beside it, whenever it is drawn (432(j)). */
  switchReason: string;
  /** The band (303, 304, 404). Empty when there is no control row to measure against (421). */
  tiles: ConsoleKpiTile[];
  /** The roster. ⛔ `null` means the READ FAILED — `AdminLoadError`, never an empty state (355). */
  rows: ConsoleRosterRow[] | null;
  /** Non-null EXACTLY when `rows` is empty, naming the cause (310's precedence: off beats "none yet"). ⛔ An empty
   *  table that does not say WHY is the defect 416 exists for, so the page renders this instead of the rows. */
  empty: ConsoleEmpty | null;
};

/**
 * One usage cell. `text` is ruling 361's ONE grammar and is what a suite asserts and what the cell reads as; `used` and
 * `limit` are the same sentence's two halves, so the CELL may break between them while each amount stays one object.
 *
 * ⛔ WHY THE TWO HALVES EXIST, MEASURED (2026-09-18, 360 px, five accounts on the real page). `.amount` is
 * `white-space: nowrap` and the kit's `.admin-tbl td.tabular` adds nowrap to the whole cell, so a pair rendered as one
 * string made each money column **243 px** wide: the second money answer ran 357→600 on a 360 viewport — out of the
 * visible strip — and, because `.admin-tbl` is `width: 100%`, the ACCOUNT column absorbed the shortfall and laid out at
 * **93 px**, the G-4/G-5 defect the kit documents. Ruling 373's named fallback (move the cap into the column HEADER)
 * cannot be built here: the cap is PER ACCOUNT, and the fixture alone holds three different values and one unset. So the
 * pair wraps instead — two amounts, each indivisible, on two lines in a narrow cell. Nothing is compacted, nothing is
 * clipped, and the limit stays beside its usage, which is what ruling 266 requires.
 */
export type ConsoleUsageCell = { text: string; used: string; limit: string | null; money: boolean; halves: ConsoleUsageHalf[] };

/**
 * One half of a usage sentence, split so the page can put ONLY THE FIGURE in an `.amount` span (ruling 409: "only the
 * two FIGURES sit inside `.amount` spans; the sentence itself is `text-body-sm`").
 * ⛔ WHY IT MATTERS BEYOND SEMANTICS. `.amount` is `white-space: nowrap`, so wrapping the connective words inside it
 * made each unbreakable unit wider than the figure it was protecting — the very constraint 432(b) was solving. The
 * page renders `{word} <figure>{suffix}` inside ONE nowrap span per half, so a half never breaks and the cell may.
 */
export type ConsoleUsageHalf = { word: string; figure: string; suffix: string };

/** 361's one usage grammar for money. An unset limit is a STATE, never a figure and never a bar at zero. */
function moneyUsage(used: number, limit: number | null): ConsoleUsageCell {
  if (limit == null) return { text: "Not set", used: "Not set", limit: null, money: true, halves: [] };
  const uf = formatTzs(Math.max(0, used));
  const lf = formatTzs(limit);
  return {
    text: `used ${uf} of ${lf}`, used: `used ${uf}`, limit: `of ${lf}`, money: true,
    halves: [{ word: "used", figure: uf, suffix: "" }, { word: "of", figure: lf, suffix: "" }],
  };
}

/** 361's one usage grammar for a count limit. ⛔ The noun is a WORD, so it sits outside the figure's span. */
function countUsage(used: number, limit: number | null, noun: string): ConsoleUsageCell {
  if (limit == null) return { text: "Not set", used: "Not set", limit: null, money: false, halves: [] };
  const uf = formatNumber(Math.max(0, used));
  const lf = formatNumber(limit);
  return {
    text: `used ${uf} of ${lf} ${noun}`, used: `used ${uf}`, limit: `of ${lf} ${noun}`, money: false,
    halves: [{ word: "used", figure: uf, suffix: "" }, { word: "of", figure: lf, suffix: ` ${noun}` }],
  };
}

/** A read that FAILED renders an em dash — never a zero, and never an empty cell (ruling 355). */
const UNREADABLE: ConsoleUsageCell = { text: "—", used: "—", limit: null, money: false, halves: [] };

/**
 * One money tile: ONE compact amount in the value, the limit NAMED in the delta as a proportion with no second
 * amount (ruling 404 — the delta slot is a letter-spaced `text-micro` rung, and §M4 forbids tracking over an amount).
 * ⛔ `Math.floor`, not `round`: a rounded proportion prints "100%" at 99.6%, which is not true.
 */
function moneyTile(label: string, used: number, limit: number | null, limitLabel: string): ConsoleKpiTile {
  /* ⛔ NO ARROW IN A DELTA (ruling 432(i)). The delta slot is a plain `<span>` inside `AdminKpi` — it has never been a
   * link and cannot become one — so "set it on Limits →" pointed an officer at a control that does not exist on this
   * rung and at a tab that has no panel until step 3. It names the CONSEQUENCE instead. */
  if (limit == null) return { label, value: "Not set", delta: "nothing can be staked until this limit is set" };
  const shown = Math.max(0, used);
  const pct = limit > 0 ? Math.floor((shown / limit) * 100) : 100;
  return { label, value: formatTzsCompact(shown), delta: `${formatNumber(pct)}% of ${limitLabel.toLowerCase()}` };
}

/** The tile the kit paints when a read FAILED. ⛔ Not the same as a genuine zero. */
function unavailableTile(label: string): ConsoleKpiTile {
  return { label, value: "n/a", unavailable: true };
}

/**
 * The ONE separator every list on this section joins with.
 * ⛔ THE SPACE BEFORE THE DOT IS A NO-BREAK SPACE, and it was measured: with a plain space the Products cell broke as
 * "Up & Down ·" / "Polls" on two of five rows at 1280 and 1024, and the ON sentence ended a line on a bare "·" at 360.
 * A separator belongs to the item that FOLLOWS it. ⚠️ Written with `String.fromCharCode`, never as a typed escape:
 * the Edit tool and inline `node -e` decode a backslash-u into the RAW character in the source file.
 */
const SEP = `${String.fromCharCode(0xa0)}· `;

/** The scope words a row shows, from `FIELD_META`'s own labels — never typed beside the field. */
function productWords(updown: boolean, polls: boolean): string {
  const on: string[] = [];
  if (updown) on.push(FIELD_META["scope.products.updown"].label);
  if (polls) on.push(FIELD_META["scope.products.polls"].label);
  return on.length ? on.join(SEP) : "None";
}

/**
 * ⛔ THE ROSTER'S ONE READ SET (rulings 346, 347, 356): ONE control row, ONE `listNonRemoved()`, ONE
 * `houseDayBooks(dayKey)` and ONE `openExposure(null)` — and NO WALLET READ, because nothing the roster paints is a
 * balance or a floor state, and a per-row holder wallet read would pull up to twenty players' live balances into a
 * payload ruling 259 measured reaching any signed-in account. The band's three money figures are the JS SUM of the
 * SAME per-bot rows the columns render, so the band can never disagree with the column beneath it.
 *
 * ⛔ SETTLED, NOT `Promise.all` (ruling 355): one failed read never blanks the page, and each failure is attributed to
 * ITS figure — a failed roster read is `AdminLoadError`, a failed money read is the tile's `unavailable` and the cell's
 * "—", never a zero.
 *
 * ⛔ THE EAT DAY KEY IS DERIVED ONCE PER RENDER, through the SEAM's own derivation (`eatDayKey(Date.now())`, ruling
 * 348), so the roster and the band cannot straddle EAT midnight inside one page, and the console reads the same day the
 * gate that refuses a stake reads.
 */
export async function houseRosterForConsole(
  viewerUserId: string | null | undefined,
  route: string,
): Promise<ConsoleRosterView | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  const dayKey = eatDayKey(Date.now());
  const [controlR, rosterR, dayR, exposureR, ctxR] = await Promise.allSettled([
    houseBotControlStore.get(),
    houseBotStore.listNonRemoved(),
    houseDayBooks(dayKey),
    houseBookStore.openExposure(null),
    loadParseContext(),
  ]);

  /* 421 · a schema the migration has not reached is a STATE. It is never an error boundary, never `AdminLoadError`
   * and never an empty roster with no cause. */
  const schemaMissing = controlR.status === "rejected" && controlR.reason instanceof HouseSchemaNotReady;
  /* ⛔ AND THE OTHER HALF OF 421, WHICH THE FIRST PASS COLLAPSED (rulings 304, 355, 421). A rejection that is NOT a
   * missing schema leaves the switch's state UNKNOWN — so the page may not say the desk is off, may not draw a chip
   * or a Toggle, and may not drop the band: it renders the kit's failure treatment and four `unavailable` tiles. */
  const controlUnreadable = controlR.status === "rejected" && !schemaMissing;
  const control: StoredHouseBotControl | null = controlR.status === "fulfilled" ? controlR.value : null;
  const roster: StoredHouseBot[] | null = rosterR.status === "fulfilled" ? rosterR.value : null;
  const dayBooks: Map<string, HouseDayBook> | null = dayR.status === "fulfilled" ? dayR.value : null;
  const exposure = exposureR.status === "fulfilled" ? new Map(exposureR.value.map((r) => [r.houseBotId, r.openStakeTzs])) : null;
  const parseCtx = ctxR.status === "fulfilled" ? ctxR.value : null;

  const unsetRequired = control ? REQUIRED_FOR_MASTER_ON.filter((f) => control[f] == null).length : 0;
  const on = control ? control.enabled : null;
  const switchedAt = control?.switchedAt ? formatEat(Date.parse(control.switchedAt), "HH:MM:SS") : null;

  /* ⛔ 453 · ONE OFF SENTENCE FOR EVERY OFF CAUSE, and it names nothing. The ON sentence names the ACTOR BY ID, the
   * way `/admin/audit` already does (ruling 420) — never a display name, a phone or an email, and never a second read. */
  const stateSentence = schemaMissing
    ? "The desk's tables are not present on this database. Nothing can be staked."
    : controlUnreadable
      ? "The desk's own state could not be read, so nothing here says whether it is on."
      : on === true
        ? [`On since ${switchedAt ?? "an unrecorded time"} EAT`,
           /* ⛔ AN ACTOR IS AN ID (ruling 420), and the null actor reads "System" — 420's own string was
            * "System — house bot engine", which ruling 453 forbids on the screen (432(k)). */
           `switched by ${control?.switchedById ?? "System"}`,
           ...(control?.switchedReason ? [`reason: ${control.switchedReason}`] : [])].join(SEP)
        : "The desk is off. Nothing will be staked.";

  /* ⛔ 421 · WITH NO CONTROL ROW THE ROSTER IS NOT RENDERED AT ALL, and that is a correction the first render forced.
   * A page headed "The desk is not set up on this database" with five accounts listed beneath it says two opposite
   * things at once — and the accounts are real, because only the control row is missing. The desk cannot stake and
   * cannot be designated without that row, so the table names THAT cause instead of listing rows no control governs. */
  const rows: ConsoleRosterRow[] | null = schemaMissing ? [] : roster == null ? null : roster.map((bot) => {
    const book = dayBooks?.get(bot.id) ?? null;
    const open = exposure?.get(bot.id) ?? null;
    const parsed = parseCtx ? parseHouseBotRules(bot.rules, parseCtx) : null;
    const display = HOUSE_BOT_STATUS_DISPLAY[bot.status];
    return {
      id: bot.id,
      label: bot.label,
      handle: playerHandle(bot.userId),
      statusWord: display.word,
      statusChip: display.chip,
      /* ⛔ A FAILED READ IS NEVER A ZERO (355). A bot absent from the day map is a documented zero and IS rendered. */
      lossCell: dayBooks == null ? UNREADABLE : moneyUsage(book?.projectedLossTzs ?? 0, bot.capDailyLossTzs),
      exposureCell: exposure == null ? UNREADABLE : moneyUsage(open ?? 0, bot.capOpenExposureTzs),
      betsCell: dayBooks == null ? UNREADABLE : countUsage(book?.bets ?? 0, bot.freqMaxPerDay, "bets"),
      products: parsed == null ? "couldn't read"
        : parsed.ok ? productWords(parsed.rules.scope.products.updown, parsed.rules.scope.products.polls)
          : "couldn't read",
    };
  });

  /* ⛔ THE BAND MEASURES THE POPULATION THE GATE MEASURES, AND THAT IS NOT THE ROSTER (ruling 432(l)).
   * The three global limits in the band are the three the seam enforces, and `cap-precheck.ts` reads them over EVERY
   * bot: `houseDayBook(day, null)` and `houseOpenExposure(null)` — neither filters REMOVED, and neither can, because a
   * removed account's stakes and open positions are still the desk's money today. The first pass folded these two maps
   * over `listNonRemoved()`'s ids, so a holder who closed their account at 15:00 silently dropped that day's stake,
   * projected loss and open exposure out of the band while the gate kept counting them: the owner would read "40% of
   * the daily stake limit" while every stake was being refused at 100%. So the fold is over the MAP, which is the same
   * total the gate reads. ⛔ The per-row cells stay per-account and are unchanged.
   * ⛔ AND EACH TILE'S READABILITY IS ITS OWN READ'S (355): a failed ROSTER read blanks the Accounts tile, not the
   * money tiles, whose figures never came from the roster. */
  const sumDay = (pick: (b: HouseDayBook) => number) =>
    [...(dayBooks?.values() ?? [])].reduce((n, b) => n + pick(b), 0);
  const stakeUsed = sumDay((b) => b.stakedTzs);
  const lossUsed = Math.max(0, sumDay((b) => b.projectedLossTzs));
  const exposureUsed = [...(exposure?.values() ?? [])].reduce((n, v) => n + v, 0);

  const tiles: ConsoleKpiTile[] = controlUnreadable
    ? ["Stake today", "Loss today", "Open exposure", "Accounts"].map(unavailableTile)
    : !control ? [] : [
      dayBooks
        ? moneyTile("Stake today", stakeUsed, control.gCapDailyStakeTzs, FIELD_META.gCapDailyStakeTzs.label)
        : unavailableTile("Stake today"),
      dayBooks
        ? moneyTile("Loss today", lossUsed, control.gCapDailyLossTzs, FIELD_META.gCapDailyLossTzs.label)
        : unavailableTile("Loss today"),
      exposure
        ? moneyTile("Open exposure", exposureUsed, control.gCapOpenExposureTzs, FIELD_META.gCapOpenExposureTzs.label)
        : unavailableTile("Open exposure"),
      /* ⛔ 453 · "Accounts", reading "2 of 5". The count is the length of the ONE roster read (346) — never a second
       * `countLive()`, which could disagree with the table beside it inside a single render. */
      roster != null
        ? { label: "Accounts", value: `${formatNumber(roster.length)} of ${formatNumber(control.maxDesignatedBots)}`, delta: "designated of max" }
        : unavailableTile("Accounts"),
    ];

  /* 314 · the head action's VISIBLE disabled reason, from the server's own sentence, with the CONFIGURED max.
   * ⛔ A FAILED COUNT LEAVES THE BUTTON ENABLED: the wizard's own ROSTER_FULL refusal is the backstop, and a failed
   * read must not silently forbid a legitimate designation. */
  /* ⛔ AND A WITHDRAWN DESK IS OFFERED NO REMEDY (ruling 432(m)): the SUNSET Callout says "nothing can be designated",
   * so a sentence beside it saying "raise the roster limit" would contradict it on the same screen. */
  const rosterFullReason = control && roster && roster.length >= control.maxDesignatedBots && control.offCause !== "SUNSET"
    ? DESIGNATE_COPY.rosterFull(roster.length, control.maxDesignatedBots)
    : null;

  /* ⛔ 310's empty-state precedence: the switch's own state beats "none yet"; a FAILED read beats both and is
   * `rows === null`. ⛔ AND NO STATE SAYS THE SAME FACT TWICE (ruling 432(n)): the block ABOVE the table owns the
   * cause — the Callout in the schema state, the strip in the off state — so the table says only what the TABLE is.
   * The first render printed the schema sentence in a Callout and again, word for word, as the empty state's own
   * title and body 200px below it. ⛔ And nothing instructs the reader to use a control this checkpoint renders
   * disabled: "Designate an account … or switch the desk on" was the only call to action on an empty page, and
   * neither control can be pressed until steps 4 and 6. */
  const empty: ConsoleEmpty | null = rows == null || rows.length > 0 ? null
    : schemaMissing
      ? { title: "No roster", body: "The desk's tables are not on this database — see the notice above." }
      : controlUnreadable
        ? { title: "No roster", body: "The desk's own state could not be read — see the notice above." }
        : on === false
          ? { title: "The desk is off", body: "No account has been designated yet." }
          : { title: "No accounts yet", body: "Designated accounts appear here, oldest first." };

  return {
    schemaMissing,
    controlUnreadable,
    on,
    chip: schemaMissing || controlUnreadable || on == null ? null : on ? { word: "On", variant: TONE_CHIP.green } : { word: "Off", variant: TONE_CHIP.slate },
    stateSentence,
    offCause: control && control.enabled === false && control.offCause && control.offCause !== "MANUAL" ? control.offCause : null,
    unsetRequired,
    limitsHref: CONSOLE_LIMITS_HREF,
    rosterFullReason,
    /* 432(j) · a disabled control with no reason on screen reads as a broken page, and in four of the captured states
     * the roster-full sentence is null — so every state carries one. */
    actionReason: "Not ready on this build yet.",
    switchReason: "Not ready on this build yet.",
    tiles,
    rows,
    empty,
  };
}
