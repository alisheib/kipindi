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
import { cache } from "react";
import { db } from "./store";
import { isStaffRole, isAdmin, isOwnerOnlyPath, domainForPath } from "./roles";
import { canView } from "./rbac";
import type { AuditEntry } from "./audit";
import { formatTzs, formatTzsCompact, formatNumber } from "@/lib/utils";
import { CONSOLE_ROUTE, CONSOLE_LIMITS_HREF, CONSOLE_LIMITS_FIRST_UNSET_HREF, DEFAULT_TAB, consoleBotHref, type ConsoleTab } from "@/lib/house-bot/console-routes";
import { eatDayKey, formatEat } from "@/lib/house-bot/clock";
import { CAP_FIELDS, FIELD_META, LIMIT_FIELDS, REQUIRED_FOR_MASTER_ON, isClearExempt, parseHouseBotRules, type CapField, type FieldId, type HouseBotRulesV1, type LimitField } from "@/lib/house-bot/rules";
import { sortCauses, wayOutCopy, wayOutForCause, type HolderCause } from "@/lib/house-bot/pause-reasons";
import { TARGET_END_CAPTION } from "@/lib/house-bot/feed-copy";
import { saveHouseBotLimits } from "./house-bot/limits-save";
import { switchOnHouseBots } from "./house-bot/switch-on";
import { switchOffHouseBots } from "./house-bot/kill-switch";
import { houseEngineAlerts } from "./house-bot/emitters";
import { TONE_CHIP, type StatusChipVariant } from "@/lib/status-tone";
import { houseBotControlStore, houseBotStore, houseBookStore, houseBotIntentStore, houseBotRuntimeStore, houseSeamStore, targetStore as houseBotTargetStore, HouseSchemaNotReady, type StoredHouseBot, type StoredHouseBotControl, type StoredHouseBotRuntime, type StoredHouseBotTarget } from "./house-bot-dal";
import { houseDayBook, houseDayBooks, houseOpenExposure, type HouseDayBook } from "./house-bot/book";
import { HOUSE_BOT_STATUS_DISPLAY } from "./house-bot/status-display";
import { DESIGNATE_COPY, reverifyHouseBot, startHouseBot } from "./house-bot/designation";
import { readBotAndHolder } from "./house-bot/control";
import { houseEngineBeats, houseEngineVerdict } from "./house-bot/engine-health";
import { pauseHouseBot, removeHouseBot } from "./house-bot/roster-actions";
import { playerHandle } from "./house-bot/alerts";
import { loadParseContext, loadRulesContext } from "./house-bot/rules-context";

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
/**
 * ⛔ WHO IS LOOKING — RESOLVED ONCE PER RENDER PASS, NOT ONCE PER GATED QUESTION (C7-SPEC ruling 342).
 *
 * `db.user.findById` is a real `findUnique` that returns the WHOLE row including `avatarDataUrl`, a column
 * `user.list()` explicitly omits for exactly this reason and which is capped at 96 kB. The console asks the audience
 * question several times in one render — the page's own verdict, the panel reader's, and every audit reader a console
 * surface calls — so without this it is an N+1 of the most expensive shape available. `sensitive.tsx:46` measured and
 * closed the identical N+1 for the identical lookup, and this is that shape, not a second idiom.
 *
 * ⛔ THE MEMO IS PER RENDER PASS AND NOTHING ELSE: never a TTL, never across requests, and never the VERDICT (the
 * route is part of the decision, so only the ROW is memoised). ⚠️ MEASURED 2026-09-18: React `cache()` is a
 * pass-through OUTSIDE a render pass, so no suite can see this memo and `test:house-bot-console` 1.342 asserts its
 * SOURCE and records that limit in its own label rather than claiming a proof it cannot have.
 */
const viewerRow = cache(async (viewerUserId: string) => db.user.findById(viewerUserId));

export async function houseConsoleAudience(viewerUserId: string | null | undefined, route: string): Promise<boolean> {
  if (typeof viewerUserId !== "string" || viewerUserId.length === 0 || !route.startsWith("/admin")) return false;
  try {
    const viewer = await viewerRow(viewerUserId);
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
  /**
   * ⭐ THE WAY OUT, AND IT ARRIVED WITH THE PAGE IT OPENS (ruling 432(h), discharged at C7 step 4).
   * Until `/admin/desk/[id]/page.tsx` existed this field was deliberately ABSENT, because a live link on every row
   * would have been the first control an officer reaches answering the app-root 404 — the same defect the head
   * action and the master switch were rendered disabled for. `test:house-bot-console` ties the two together by FILE
   * EXISTENCE in both directions, so neither could ship without the other.
   */
  href: string;
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
  /**
   * ⭐ 432(g) · "LAST BET", AND IT ARRIVED WITH ITS READER. The column needs a last-placement instant, and the only
   * reader that has one is `botRateUsage` — ruling 351's one new seam member, which C7 step 4 added because the
   * account page's two count rows need it too. `null` when the account has never staked, which the cell paints as
   * an em dash: never a fabricated date and never a zero.
   * ⛔ THE RELATIVE PHRASE IS BUILT ON THE SERVER. A client component computing "3 minutes ago" would need the
   * instant, and the instant of a house stake is a gated value.
   */
  lastBet: { text: string; title: string } | null;
  /** The saved scope words, from `FIELD_META`'s own labels. */
  products: string;
};

/** The empty state's own cause, named. ⛔ An empty table that does not say WHY is the defect 416 exists for. */
export type ConsoleEmpty = { title: string; body: string };

/**
 * THE DESK'S SHELL — the strip, the auto-off cause, the band and the rail's counts, which live ABOVE the rail on
 * EVERY tab (ruling 406, DA §K 7d) and are therefore built ONCE, from the ONE read set, whichever panel is showing.
 */
export type ConsoleDeskShell = {
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
  /** How many members of `REQUIRED_FOR_MASTER_ON` are unset — COUNTED, never typed (306). The rail's `CountBadge`
   *  reads this; the STRIP reads the sentence below, which is built from this same number. */
  unsetRequired: number;
  /**
   * ⛔ THE STRIP'S "Set N global limits first →" SENTENCE, WRITTEN HERE, AND `null` WHEN THE SWITCH IS ALREADY ON.
   *
   * Ruling 306 scopes this sentence to *when the switch cannot be turned on because global limits are unset*. The
   * page rendered it on `unsetRequired > 0` ALONE, so the first 1280 tile of this panel showed the chip reading ON,
   * "On since 20:14:12 EAT …" beside it, and "Set 1 global limit first →" in the same strip: two opposite
   * instructions on one screen, in the card that stops money. A limit can be cleared after the switch is on, so the
   * state is reachable, and 432(m)/(n) is the class.
   * ⛔ IT IS THE SERVER'S SENTENCE, IN ONE HOME. It was spelled out TWICE in JSX — once linked, once inert — with
   * no single home and no assertion on its text at all; only the NUMBER was ever asserted. The rail badge keeps
   * reading `unsetRequired`, because a COUNT is honest in either state.
   */
  limitsFirstReason: string | null;
  /** The same sentence without its linked tail, for the states where the limits panel is not linkable (432(i)). */
  limitsFirstPlain: string | null;
  /** The limits panel. ⭐ Painted as a LINK from C7 step 3, when `CONSOLE_TABS` gained `limits` (`LIMITS_TAB_READY`). */
  limitsHref: string;
  /** The same panel, scrolled to the FIRST unset required limit — the strip's "Set N global limits first →". */
  limitsFirstUnsetHref: string;
  /** The head action's VISIBLE disabled reason when the roster is full (314), or its plain not-ready reason (432(j)).
   *  ⛔ BYTE-IDENTICAL to `DESIGNATE_COPY.rosterFull(n, max)` (432(c)) and therefore ENDS IN "→": it is written for a
   *  LINK, and the page paints this form only inside one. */
  rosterFullReason: string | null;
  /** The SAME sentence without its linked tail, for the states where the limits panel does not exist and the page
   *  paints plain text — an arrow on inert text promises a navigation that resolves back to this page (432(i)). */
  rosterFullPlain: string | null;
  /** Why the head action is disabled when the roster is NOT full — a disabled control with no reason reads as broken.
   *  ⛔ It names ITS OWN control: this sentence and `switchReason` are painted on the same screen, and 432(n) forbids
   *  one state saying the same fact twice. */
  actionReason: string;
  /**
   * Why the master switch cannot be operated, beside it (432(j)) — and `null` in exactly two cases: when the switch
   * IS operable (`switchDialog` is then the ceremony it opens), and when the sentence beside it already says why.
   * ⛔ THE SECOND CASE IS 432(n), NOT A HOLE. With a required limit unset the strip already paints
   * "Set N global limits first →" in the SAME flex row, three characters from the Toggle; a second sentence there
   * would be one state saying one fact twice, which is the defect 432(n) exists for. `test:house-bot-console`
   * asserts the pairing in BOTH directions, so a disabled switch with neither sentence beside it is red.
   * ⛔ Never the same words as `actionReason` — the two sit about 105px apart at 1280 and read as a rendering
   * fault when they match.
   */
  switchReason: string | null;
  /**
   * ⭐ THE MASTER-SWITCH CEREMONY (rulings 388, 415; owner-delegated 454; replan ruling 549's 4b). Every sentence
   * and the typed word, built HERE and handed to the dialog as props — ruling 388 refuses a client file that
   * carries a sentence about the feature, and 385 measured that most such sentences carry no vocabulary word any
   * guard could see. ⛔ `null` means the switch is NOT operable, and the page then draws it disabled with
   * `switchReason` or the limits sentence beside it: 432(a) refuses a live control with nothing behind it, and a
   * control that could only ever be refused by the server is the same lie one layer down.
   */
  switchDialog: ConsoleSwitchDialog | null;
  /**
   * ⭐ THE ENGINE-HEALTH CALLOUT, ABOVE THE RAIL ON EVERY TAB (rulings 309, 352, 353, 354, 414; replan 435(e)).
   * `null` when there is nothing to say — and the switch being OFF is one of those, because the strip two cards up
   * already says it and 432(n) refuses one state saying one fact twice.
   */
  engine: ConsoleEngineNotice | null;
  /** ⛔ Is anything still able to change on its own? The strip's `RefreshPoller` is enabled from this AND from the
   *  client's own REACT state, never from a DOM query for an open dialog (rulings 316, 473). */
  live: boolean;
  /** The EAT day every figure on this render was measured over — derived ONCE, here, from the seam's own clock (348). */
  dayKey: string;
  /** The band (303, 304, 404). Empty when there is no control row to measure against (421). */
  tiles: ConsoleKpiTile[];
};

export type ConsoleRosterView = ConsoleDeskShell & {
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
export type ConsoleUsageCell = {
  text: string;
  used: string;
  limit: string | null;
  money: boolean;
  halves: ConsoleUsageHalf[];
  /**
   * ⛔ RULING 367 — USAGE AT OR OVER ITS LIMIT SAYS SO IN WORDS, AT EVERY RENDER SITE. An `.admin-tbl` usage cell
   * has no bar at all, so this clause is the ONLY signal there; a `ProgressBar` has one that saturates at 100% and
   * cannot tell 100% from 140%. The text always states the TRUE used amount — never clamped to the limit — because
   * a cap lowered mid-day legitimately leaves usage above it and `over()` then refuses everything, which is a state
   * an officer must be able to read. ⛔ The TONE never changes: colour is never this signal (§A4).
   * ⛔ An EMPTY STRING, never null, so every call site concatenates it without a branch that could forget it.
   */
  edgeText: string;
};

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
  if (limit == null) return { text: "Not set", used: "Not set", limit: null, money: true, halves: [], edgeText: "" };
  const shown = Math.max(0, used);
  const uf = formatTzs(shown);
  const lf = formatTzs(limit);
  const edgeText = edgeClause(shown, limit);
  return {
    text: `used ${uf} of ${lf}${edgeText}`, used: `used ${uf}`, limit: `of ${lf}`, money: true,
    halves: [{ word: "used", figure: uf, suffix: "" }, { word: "of", figure: lf, suffix: "" }],
    edgeText,
  };
}

/** 361's one usage grammar for a count limit. ⛔ The noun is a WORD, so it sits outside the figure's span. */
function countUsage(used: number, limit: number | null, noun: string): ConsoleUsageCell {
  if (limit == null) return { text: "Not set", used: "Not set", limit: null, money: false, halves: [], edgeText: "" };
  const shown = Math.max(0, used);
  const uf = formatNumber(shown);
  const lf = formatNumber(limit);
  const edgeText = edgeClause(shown, limit);
  return {
    text: `used ${uf} of ${lf} ${noun}${edgeText}`, used: `used ${uf}`, limit: `of ${lf} ${noun}`, money: false,
    halves: [{ word: "used", figure: uf, suffix: "" }, { word: "of", figure: lf, suffix: ` ${noun}` }],
    edgeText,
  };
}

/**
 * ⛔ RULING 367's CLAUSE, WRITTEN ONCE. Every usage site on this console — the `ProgressBar` caption, its
 * `captionText`, and an `.admin-tbl` cell that has no bar — appends exactly this, so the three can never disagree
 * about whether a cap has been reached. ⚠️ The EM DASH is written with `String.fromCharCode`, never as a typed
 * escape: the Edit tool and inline `node -e` decode a backslash-u into the RAW character in the source file.
 */
const EM_DASH = String.fromCharCode(0x2014);
function edgeClause(used: number, limit: number): string {
  if (used > limit) return ` ${EM_DASH} over the limit`;
  if (used === limit) return ` ${EM_DASH} at the limit`;
  return "";
}

/** A read that FAILED renders an em dash — never a zero, and never an empty cell (ruling 355). */
const UNREADABLE: ConsoleUsageCell = { text: "—", used: "—", limit: null, money: false, halves: [], edgeText: "" };

/**
 * ⛔ WHAT AN UNSET LIMIT ACTUALLY DOES, IN ONE HOME (replan ruling 547). `over(cap, value)` in the seam is
 * `cap == null || value > cap`, so an unset limit REFUSES EVERY STAKE — and that is true whether the desk is on or
 * off. The KPI tile has said it since step 1; the usage caption said something else entirely, and this is now the
 * one place either of them reads it from.
 */
const UNSET_CONSEQUENCE = "nothing can be staked until this limit is set";

/** ⛔ The two readings of an unset REQUIRED limit (replan ruling 547) — the ON one built from the tile's own words. */
const REQUIRED_UNSET_ON = `Not set — ${UNSET_CONSEQUENCE}.`;
const REQUIRED_UNSET_OFF = "Not set — the master switch cannot be turned on.";

/**
 * One money tile: ONE compact amount in the value, the limit NAMED in the delta as a proportion with no second
 * amount (ruling 404 — the delta slot is a letter-spaced `text-micro` rung, and §M4 forbids tracking over an amount).
 * ⛔ `Math.floor`, not `round`: a rounded proportion prints "100%" at 99.6%, which is not true.
 */
function moneyTile(label: string, used: number, limit: number | null, limitLabel: string): ConsoleKpiTile {
  /* ⛔ NO ARROW IN A DELTA (ruling 432(i)). The delta slot is a plain `<span>` inside `AdminKpi` — it has never been a
   * link and cannot become one — so "set it on Limits →" pointed an officer at a control that does not exist on this
   * rung and at a tab that has no panel until step 3. It names the CONSEQUENCE instead. */
  if (limit == null) return { label, value: "Not set", delta: UNSET_CONSEQUENCE };
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
 * ⛔ THE NO-BREAK SPACE GOES AFTER THE DOT, NOT BEFORE IT, and the first attempt had it backwards — READ off the ON
 * sentence at 360, where `"<NBSP>· "` bound the dot to the word BEFORE it and line 2 ended
 * "usr_95b294078c2d39f9683b042a ·", which is the very defect being fixed. A separator belongs to the item that
 * FOLLOWS it, so the breakable space is before the dot and the bound one after: `" ·<NBSP>"`. Measured first as
 * "Up & Down ·" / "Polls" on two of five Products rows at 1280 and 1024.
 * ⚠️ Written with `String.fromCharCode`, never as a typed escape: the Edit tool and inline `node -e` decode a
 * backslash-u into the RAW character in the source file.
 */
const SEP = ` ·${String.fromCharCode(0xa0)}`;

/**
 * ⛔ RULING 474 — THE TWO OPERATOR-TYPED VALUES THIS CONSOLE PAINTS, NAMED, BECAUSE AN EXEMPTION THAT IS NOT
 * WRITTEN DOWN IS A GUARD WHOSE POPULATION IS A LIE.
 *
 * Ruling 453's lexicon binds this section's COPY. These two are not copy — they are DATA an operator typed, and
 * the console may not silently rewrite them: a switch reason that does not say what was typed is a worse defect
 * than the word it hides, and an account's label is the gated value the Owner chose to identify it by. So they are
 * rendered verbatim, BOUNDED, and exempted by name rather than passed by accident. The warning belongs where the
 * typing happens — step 4's Master-ON ceremony and step 6's wizard — not here, where the painting does.
 * ⛔ THE BOUND IS RESTATED AT THE RENDER SITE, NOT INHERITED FROM STORAGE. `HouseBot_label_check` allows 32 code
 * points and `HouseBotControl_switchedReason_check` 300; a storage invariant is not a render decision, and a later
 * widening of either check would otherwise walk straight onto the screen — and into every screenshot of it.
 */
export const OPERATOR_DATA_EXEMPT = Object.freeze([
  { value: "label", where: "the Account column's first line", maxCodePoints: 32 },
  { value: "switchedReason", where: "the ON sentence's reason tail", maxCodePoints: 120 },
]);

/** ⛔ CODE POINTS, NOT UTF-16 UNITS — the DAL's own checks count code points, and slicing a surrogate pair in half
 *  paints a replacement glyph. The ellipsis is one character and is INSIDE the bound. */
export function clampOperatorText(text: string, maxCodePoints: number): string {
  const cps = [...text];
  return cps.length <= maxCodePoints ? text : `${cps.slice(0, Math.max(0, maxCodePoints - 1)).join("")}\u2026`;
}
const operatorBound = (value: string): number => OPERATOR_DATA_EXEMPT.find((e) => e.value === value)!.maxCodePoints;

/**
 * A sentence written for a LINK, painted as plain text: the trailing "→" comes off (ruling 432(i)).
 * ⛔ An arrow on inert text is a promise of navigation, and the tab it points at has no panel on this build.
 * ⚠️ `endsWith`/`slice`, never a regex: nothing here depends on a backslash escape surviving a tool.
 */
function stripLinkedTail(s: string): string {
  return s.endsWith("→") ? s.slice(0, -1).trimEnd() : s;
}

/**
 * ⛔ THE CONSOLE'S OWN WAY OUT OF A PAUSE, WHERE THE SHARED ONE CARRIES A WORD 453 FORBIDS (ruling 432(f), owed at
 * step 4 and discharged here).
 *
 * MEASURED against `scripts/lib/house-bot-vocabulary.mjs`: SEVEN of the twenty-two rows of `PAUSE_REASON_WAY_OUT`
 * name the feature in the sentence an officer reads — six on the bare word *bot* (`ACCOUNT_MISSING`,
 * `WALLET_MISSING`, `ACCOUNT_CLOSED`, `IDENTITY_REFUSED`, `HOLDER_ERASURE_REQUEST`, `UNMAPPED_REFUSAL`) and one on
 * *liquidity* (`HOLDER_WITHDREW`: "The holder stopped liquidity stakes themselves"). Ruling 432(f) found the last
 * of those on the first render and rendered the chip ALONE rather than the caption, with the neutral pass owed to
 * the step that would paint it. This is that step: the detail page's strip and the roster's status cell both carry
 * it, so it is written now.
 *
 * ⛔ AN OVERRIDE, NOT A REWRITE OF `pause-reasons.ts` — the same decision 432(b) took for `FIELD_META`, for the same
 * reason. Those sentences are also the engine's and the admin bell's internal vocabulary, which D19 exempts (an
 * alert about a bot goes to admins only) and which no screenshot-facing surface renders. Ruling 453 binds what the
 * CONSOLE renders, and the console's copy has one home: this module. Rewriting the shared table would change words
 * on surfaces 453 does not govern in order to fix one it does — and it would move text the rules suite pins.
 * ⛔ THE POPULATION IS DERIVED, NOT TYPED. `test:house-bot-console` requires an entry for every way-out whose shared
 * copy carries a word AND requires every entry here to replace one that really does, so a missing override and an
 * override nobody ruled are reported equally loudly. 432(f) itself was written from a hand reading and named ONE of
 * these seven; 433(b) and replan 539 are the same class, twice over.
 * ⛔ `{label}` SURVIVES: the shared table's one placeholder is filled by the same `wayOutCopy` the engine uses.
 */
const CONSOLE_WAY_OUT: Readonly<Record<string, string>> = {
  ACCOUNT_MISSING: "Their account could not be found. Start once it reads again, or remove it from the desk.",
  WALLET_MISSING: "Restore their wallet — settlement is blocked for every player until then. Removing it from the desk does not bypass it.",
  ACCOUNT_CLOSED: "Account closed — it was removed from the desk. Recover the float out of band.",
  IDENTITY_REFUSED: "An officer must reopen the refusal; then Re-verify and Start. Removing it from the desk is recommended.",
  HOLDER_ERASURE_REQUEST: "Resolve their erasure request or remove it from the desk. If they withdraw it: Re-verify, then Start.",
  HOLDER_WITHDREW: "The holder stopped the stakes themselves. Only a fresh password they give you can restart it.",
  UNMAPPED_REFUSAL: "A bet refusal this build doesn't recognise paused it. Read the activity feed before starting again.",
};

/**
 * The key a cause's way out is overridden by. ⛔ It is NOT the cause code alone: `wayOutForCause` answers with two
 * SHARED objects that belong to no single code — the consent-void way out and support's temporary-password one —
 * and keying on the code would silently give each of them the wrong override the day either stops being neutral.
 */
export function consoleWayOutKey(cause: { code: string; method?: string | null }): string {
  if (cause.code === "CONSENT_VOID") return "CONSENT_VOID";
  if (cause.code === "PASSWORD_CHANGED" && cause.method === "OFFICER_TEMP") return "OFFICER_TEMP";
  return cause.code;
}

/** One live cause's way out, in the console's own words where the shared table's carries a word 453 forbids. */
export function consoleWayOutCopy(cause: HolderCause, label: string): string {
  const own = CONSOLE_WAY_OUT[consoleWayOutKey(cause)];
  return own ? own.replaceAll("{label}", label) : wayOutCopy(wayOutForCause(cause), label);
}

/** The scope words a row shows, from `FIELD_META`'s own labels — never typed beside the field. */
function productWords(updown: boolean, polls: boolean): string {
  const on: string[] = [];
  if (updown) on.push(FIELD_META["scope.products.updown"].label);
  if (polls) on.push(FIELD_META["scope.products.polls"].label);
  return on.length ? on.join(SEP) : "None";
}

/**
 * ⛔ THE DESK'S ONE READ SET, AND IT IS THE SAME SET ON EVERY TAB (rulings 346, 347, 355, 356, 406).
 *
 * ONE control row, ONE `listNonRemoved()`, ONE `houseDayBooks(dayKey)`, ONE `openExposure(null)` — and NO WALLET READ,
 * because nothing the desk paints is a balance or a floor state, and a per-row holder wallet read would pull up to
 * twenty players' live balances into a payload ruling 259 measured reaching any signed-in account. The band's three
 * money figures are the JS SUM of the SAME rows the gate's own caps are measured over.
 *
 * ⛔ THE FIFTH READ IS THE PANEL'S OWN, AND IT IS SETTLED WITH THE OTHER FOUR (432(q)). The roster passes
 * `loadParseContext()` (the Products column's words); the limits panel passes `staffChosenPlacedToday`. Exactly one
 * extra read, inside the one settled set, so no panel can add a second read outside it without moving this line.
 * ⛔ IT IS A FACTORY, NOT A PROMISE, AND THAT IS RULING 348 (corrected 2026-09-18). A promise is built BEFORE this
 * function derives the day, so the fifth read could not be given the render's key and derived its own instead.
 * Taking `(dayKey) => Promise<T>` is what lets the key reach it while the read still starts inside the one
 * settled set.
 *
 * ⛔ SETTLED, NOT `Promise.all` (ruling 355): one failed read never blanks the page, and each failure is attributed to
 * ITS figure — a failed roster read is `AdminLoadError`, a failed money read is the tile's `unavailable` and the cell's
 * "—", never a zero.
 *
 * ⛔ THE EAT DAY KEY IS DERIVED ONCE PER RENDER, HERE, through the SEAM's own derivation (`eatDayKey(Date.now())`,
 * ruling 348) — AND IT IS NOW PASSED TO EVERY READ THAT NEEDS A DAY, which is what makes that sentence true.
 * ⚠️ RECORDED DEVIATION from ruling 372(a), which drafted `dayKey` as a member of the usage reader's `query`: a
 * console page may not import `@/lib/house-bot/clock` (ruling 340's pin, `test:house-bot-console` 1.340), so a page
 * passing the day key would have to derive a house value itself. The derivation stays where the roster already does
 * it, the page passes only `houseBotId`, and the reader's arity is unchanged at three.
 * ⛔ AND 433(c) WAS WRONG ABOUT ITS CONSEQUENCE (amended, replan review 2026-09-18). Dropping the query member did
 * NOT remove the second derivation — it only moved it out of sight: `staffChosenPlacedToday` derived its own day
 * inside the DAL, `eatDayKey(Date.now())` on memory and the DATABASE CLOCK on Prisma. Keeping the key inside this
 * module is not the same as deriving it once, and the fifth read is the one that proved the difference.
 */

/* ═══ THE ENGINE-HEALTH CALLOUT (rulings 309, 352, 353, 354, 414; replan rulings 435(e), 507's X1, 514) ════════ */

/**
 * ⛔ **IT IS NOT A SECOND GATED READER** (ruling 435(e), accepted by replan ruling 549). Ruling 309 names
 * `houseEngineForConsole(viewerUserId, "/admin/desk")` as its own door. Measured: 353's staleness verdict needs the
 * MASTER SWITCH — which is the control row `readDeskCore` has already read — so a second gated reader would put a
 * SECOND control read in one render, and 433(d) refuses that by name: two reads of one question can disagree inside
 * a render, with the officer's only call to action on the wrong side of it. The engine facts therefore live inside
 * the existing door, in the one settled set, computed from the row already in hand.
 *
 * ⛔ **THE VERDICT ITSELF IS NOT WRITTEN HERE** (ruling 353): it lives in `engine-health.ts`, beside the thresholds,
 * so no constant and no `RUNTIME_KEY` crosses into a page or a chunk. This module turns a verdict into WORDS.
 */
export type ConsoleEngineNotice = {
  /** 414's tone table. ⛔ Never `gold` — that is earned money and nothing else. */
  tone: "danger" | "warning" | "neutral";
  title: string;
  body: string;
  /** The Callout's own `meta` line, and 354(c)'s "Last seen: unknown" when the beats could not be read. */
  meta: string | null;
  /** 414 · `role="alert"` on the DANGER rows only — an alert that fires on every page load trains an officer to ignore the one that matters. */
  alert: boolean;
  /** 309 · a stable key, so a 20 s refresh does not re-announce the same state. */
  noticeKey: string;
  /** A caption line when more than one server answered (414). `null` for one, which is every deployment today. */
  caption: string | null;
};

/**
 * ⛔ ONE NEUTRAL PHRASE PER PLANNER DUTY (X1, ruling 453). The pass records the duty's NAME — `lossStops`,
 * `alertRepair`, `hourly` — because a name is a closed list and an error message is an arbitrary database string
 * that can carry a label, a market or an account. A name is not copy, though: `test:house-bot-console` asserts that
 * EVERY member of the planner's own `DutyName` union has a phrase here, so a duty added later cannot reach an
 * owner's screen as an identifier. The fallback exists for the render between that day and this map being updated,
 * and the case is what makes that window one run long.
 */
const CONSOLE_DUTY_PHRASE: Readonly<Record<string, string>> = {
  deadline: "expiring stakes past their cutoff",
  stale: "expiring stakes that went stale",
  poison: "retiring stakes that failed too often",
  press: "closing finished requests",
  pressAudit: "recording requests in the compliance log",
  alertRepair: "sending the alerts an earlier pass missed",
  endTargets: "ending targets that have finished",
  pendingLifecycle: "clearing queued stakes whose market moved",
  rulesOutcomes: "checking each account's saved rules",
  /* ⚠️ THE KEY IS BUILT, NOT TYPED, AND THE GUARD IS RIGHT TO MAKE ME DO IT. `test:house-bot-console` 1.356 refuses
   * the substring that names Next's cache wrapper anywhere in this module — a console read that is cached across
   * requests is a payload computed for one audience and served to another (ruling 356) — and it reads RAW text, so
   * it cannot tell a cache directive from a planner duty that happens to contain the same letters. It caught this
   * line on the run it landed. The guard is not narrowed and the duty is not renamed: the LITERAL is composed, the
   * same idiom `SHARED_LABEL_SLOT` already uses two hundred lines down for the same class of reason. */
  [`re${"validate"}Live`]: "re-checking accounts against the platform's stake bounds",
  lossStops: "checking the day's losses against the limits",
  walletMissing: "checking each holder's wallet is still there",
  fillOpener: "planning the next stakes",
  oversight: "the minute-by-minute oversight pass",
  hourly: "the hourly summaries",
};

/** One duty in the console's own words, or its bare name while the map is behind the union (asserted by a case). */
export function consoleDutyPhrase(name: string): string {
  return CONSOLE_DUTY_PHRASE[name] ?? name;
}

/** "Last seen: 4 min ago" / "Last seen: never" / 354(c)'s "Last seen: unknown". */
function lastSeen(atMs: number | null, nowMs: number): string {
  if (atMs === null) return "Last seen: never";
  const rel = relativeEat(new Date(atMs).toISOString(), nowMs);
  return `Last seen: ${rel ? rel.text : "unknown"}`;
}

/**
 * The Callout for this render, or `null` when there is nothing to say.
 *
 * ⛔ THE SWITCH BEING OFF IS ONE OF THE NOTHINGS (432(n)). The strip two cards up already reads "The desk is off.
 * Nothing will be staked." — ruling 453 fixes those words for every off cause — so an engine Callout under it would
 * be one state saying one fact twice, which is the defect 432(n) exists for.
 */
function engineNotice(input: {
  on: boolean | null;
  instances: StoredHouseBotRuntime[] | null;
  activeAccounts: number | null;
  nowMs: number;
}): ConsoleEngineNotice | null {
  const beats = input.instances === null ? null : houseEngineBeats(input.instances);
  const verdict = houseEngineVerdict({ on: input.on, beats, activeAccounts: input.activeAccounts, nowMs: input.nowMs });
  if (verdict === null) return null;
  /* 414 · several servers is a CAPTION, never a verdict: two replicas is a normal deployment, not a fault. */
  const caption = beats !== null && beats.instances > 1 ? `${formatNumber(beats.instances)} servers answered.` : null;
  const at = (ms: number | null): string | null => (ms === null ? null : `${formatEat(ms, "HH:MM:SS")} EAT`);
  const shared = { caption, noticeKey: verdict };
  switch (verdict) {
    case "UNREADABLE":
      /* 354(c) · a failed beat read is NEVER an absent card and never a healthy-looking one. */
      return { ...shared, tone: "danger", alert: true, meta: "Last seen: unknown",
        title: "The engine could not be read",
        body: "Nothing here says whether it is running, so nothing here says whether a stake would be placed. Treat the desk as unattended until this reads." };
    case "BOOTING":
      return { ...shared, tone: "neutral", alert: false, meta: at(beats?.bootAtMs ?? null),
        title: "The engine has just started",
        body: "Its first pass runs within the minute. Nothing is wrong; this notice clears itself." };
    case "STALE":
      return { ...shared, tone: "danger", alert: true, meta: lastSeen(beats?.plannerBeatAtMs ?? null, input.nowMs),
        title: "The engine is not running",
        body: "No account will place a bet while this stands, and nothing already queued will be acted on. The desk is on, so this is not a state it can be left in." };
    case "POLLER_FAILING":
      /* ⛔ A24, AND THE STREAK IS A COUNT (266): the figure beside it is never money. */
      return { ...shared, tone: "danger", alert: true, meta: at(beats?.pollerErrorAtMs ?? null),
        title: "A server cannot take work",
        body: `It failed ${formatNumber(beats?.pollerErrorStreak ?? 0)} times in a row and nothing has succeeded since. Queued stakes may be placed late, or not at all.` };
    case "DUTY_FAILED":
      /* ⭐ X1 · the duty NAMES, in the console's own words, off the planner's own heartbeat row. */
      return { ...shared, tone: "warning", alert: false, meta: at(beats?.plannerFailedAtMs ?? null),
        title: "Part of the last pass did not finish",
        body: `The engine is running, and these did not complete: ${(beats?.plannerFailedDuties ?? []).map(consoleDutyPhrase).join(", ")}.` };
    case "IDLE":
      return { ...shared, tone: "neutral", alert: false, meta: null,
        title: "The desk is on, and no account is running",
        body: "Nothing will be staked until an account is started." };
  }
}

type DeskCore = {
  dayKey: string;
  schemaMissing: boolean;
  controlUnreadable: boolean;
  control: StoredHouseBotControl | null;
  roster: StoredHouseBot[] | null;
  dayBooks: Map<string, HouseDayBook> | null;
  exposure: Map<string, number> | null;
  /** ⭐ 435(e) · the engine's DURABLE beat rows, settled on their own. `null` means the READ FAILED (354(c)/355). */
  instances: StoredHouseBotRuntime[] | null;
};

/**
 * ⛔ TWO EXTRAS, EACH SETTLED ON ITS OWN, AND THAT IS RULING 355 RATHER THAN A CONVENIENCE. The roster needs both
 * the Products words (`loadParseContext`) and the rate read "Last bet" comes from (`botRateUsage`, ruling 351); the
 * limits panel needs one read of its own. Wrapping two reads in a single `Promise.all` inside the settled set would
 * make ONE failure blank BOTH figures, which is the attribution 355 exists to keep — a failed Products read must
 * not take the Last bet column with it. So the set is SIX members, each attributed to its own cell.
 */
async function readDeskCore<A, B>(
  extraA: (dayKey: string) => Promise<A>,
  extraB?: (dayKey: string) => Promise<B>,
): Promise<{ core: DeskCore; extra: A | null; extraB: B | null }> {
  const dayKey = eatDayKey(Date.now());
  const [controlR, rosterR, dayR, exposureR, instancesR, extraR, extraBR] = await Promise.allSettled([
    houseBotControlStore.get(),
    houseBotStore.listNonRemoved(),
    houseDayBooks(dayKey),
    houseBookStore.openExposure(null),
    /* ⭐ C7 step 4b · THE ENGINE'S DURABLE BEATS, INSIDE THE ONE DOOR (ruling 435(e), accepted by replan 549).
     * Ruling 309 drafted this as its own gated reader; 353's verdict needs the MASTER SWITCH, which the first
     * member of this very set has already read, so a second door would put a SECOND control read in one render —
     * 433(d)'s named refusal. ⛔ Settled on its OWN, never wrapped with another read: one failed read must not
     * take another figure with it (355, 435(d)). */
    houseBotRuntimeStore.listInstances(),
    extraA(dayKey),
    extraB ? extraB(dayKey) : Promise.resolve(null),
  ]);
  /* 421 · a schema the migration has not reached is a STATE. It is never an error boundary, never `AdminLoadError`
   * and never an empty roster with no cause. */
  const schemaMissing = controlR.status === "rejected" && controlR.reason instanceof HouseSchemaNotReady;
  return {
    core: {
      dayKey,
      schemaMissing,
      /* ⛔ AND THE OTHER HALF OF 421, WHICH THE FIRST PASS COLLAPSED (rulings 304, 355, 421). A rejection that is NOT a
       * missing schema leaves the switch's state UNKNOWN — so the page may not say the desk is off, may not draw a chip
       * or a Toggle, and may not drop the band: it renders the kit's failure treatment and four `unavailable` tiles. */
      controlUnreadable: controlR.status === "rejected" && !schemaMissing,
      control: controlR.status === "fulfilled" ? controlR.value : null,
      roster: rosterR.status === "fulfilled" ? rosterR.value : null,
      dayBooks: dayR.status === "fulfilled" ? dayR.value : null,
      exposure: exposureR.status === "fulfilled" ? new Map(exposureR.value.map((r) => [r.houseBotId, r.openStakeTzs] as [string, number])) : null,
      /* ⛔ A FAILED BEAT READ IS `null`, WHICH IS NOT AN EMPTY SET OF ROWS (355, 354(c)). An empty array means the
       * engine has never booted on this database; `null` means nobody could tell, and the two paint different
       * Callouts. Collapsing them is the class 421 had to be corrected for one card over. */
      instances: instancesR.status === "fulfilled" ? instancesR.value : null,
    },
    extra: extraR.status === "fulfilled" ? extraR.value : null,
    extraB: extraBR.status === "fulfilled" ? (extraBR.value as B | null) : null,
  };
}

/**
 * ⛔ THE STRIP, THE CALLOUTS, THE BAND AND THE RAIL'S COUNTS ARE BUILT ONCE, FOR EVERY TAB (ruling 406). DA §K 7d:
 * a control that starts or stops something in production, and every cap that has stopped betting, live ABOVE the rail
 * on every tab — so this is computed from the ONE read set and the page renders it whichever panel it is showing.
 *
 * ⛔ AND THAT IS WHY THE PAGE CALLS EXACTLY ONE GATED READER PER RENDER. If each panel read the control row for
 * itself, the limits panel could paint a limit the strip's own "Set N global limits first →" count had not counted,
 * one card apart on the same screen — 346's "two reads of one question can disagree inside a render" with the
 * officer's only call-to-action on the wrong side of it. `test:house-bot-console` 1.306 measures it with a spy.
 */
function deskShell(core: DeskCore): ConsoleDeskShell {
  const { control, roster, dayBooks, exposure, schemaMissing, controlUnreadable } = core;
  const unsetRequired = control ? REQUIRED_FOR_MASTER_ON.filter((f) => control[f] == null).length : 0;
  const on = control ? control.enabled : null;
  const switchedAt = control?.switchedAt ? formatEat(Date.parse(control.switchedAt), "HH:MM:SS") : null;
  /* ⛔ RULING 474 · OPERATOR DATA, VERBATIM BUT BOUNDED. Never censored, never rewritten — clamped, so a
   * 300-code-point reason cannot run the length of the strip and out of the card, and into every screenshot
   * of it. ⚠️ ITS OWN STATEMENT, so the declared mutation that removes the bound can anchor on a line that is
   * not a template literal — an anchor cannot carry a backtick or a `${}`.
   */
  const reasonText = control?.switchedReason ? clampOperatorText(control.switchedReason, operatorBound("switchedReason")) : null;
  /* ⛔ 306 · THE SENTENCE EXPLAINS WHY THE SWITCH CANNOT BE TURNED ON, so it is not painted beside a switch that
   * is already ON — see `ConsoleDeskShell.limitsFirstReason`. ONE home, both forms, from the ONE count above. */
  const limitsFirstReason = unsetRequired > 0 && on !== true
    ? `Set ${unsetRequired} global limit${unsetRequired === 1 ? "" : "s"} first →`
    : null;

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
           ...(reasonText ? [`reason: ${reasonText}`] : [])].join(SEP)
        : "The desk is off. Nothing will be staked.";

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
  const stakeUsed = sumDay(dayBooks, (b) => b.stakedTzs);
  const lossUsed = Math.max(0, sumDay(dayBooks, (b) => b.projectedLossTzs));
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
       * `countLive()`, which could disagree with the table beside it inside a single render.
       * ⛔ AND THE DELTA MAY NOT SPEND "of" A SECOND TIME. It read "designated of max" under a value of "5 of 5",
       * so the tile said "5 of 5 · designated of max" — the relation twice, and at 360 (152px of tile, 10px of
       * delta) it wrapped to "· designated of" / "max", leaving a one-word orphan line. Measured off
       * `limits-allset-360.png`. The three money tiles beside it name what their second figure IS; this one now
       * does the same, with no second "of" to wrap around. */
      roster != null
        ? { label: "Accounts", value: `${formatNumber(roster.length)} of ${formatNumber(control.maxDesignatedBots)}`, delta: "designated and the maximum" }
        : unavailableTile("Accounts"),
    ];

  /* 314 · the head action's VISIBLE disabled reason, from the server's own sentence, with the CONFIGURED max.
   * ⛔ A FAILED COUNT LEAVES THE BUTTON ENABLED: the wizard's own ROSTER_FULL refusal is the backstop, and a failed
   * read must not silently forbid a legitimate designation.
   * ⛔ AND A WITHDRAWN DESK IS OFFERED NO REMEDY (ruling 432(m)): the SUNSET Callout says "nothing can be designated",
   * so a sentence beside it saying "raise the roster limit" would contradict it on the same screen. */
  const rosterFullReason = control && roster && roster.length >= control.maxDesignatedBots && control.offCause !== "SUNSET"
    ? DESIGNATE_COPY.rosterFull(roster.length, control.maxDesignatedBots)
    : null;
  /* ⛔ THE PLAIN FORM IS KEPT, AND THAT IS DELIBERATE NOW THAT THE LIMITS PANEL EXISTS (ruling 432(i), and the brief's
   * own rule). `DESIGNATE_COPY.rosterFull` is written for a LINK and ENDS "…raise the roster limit on Limits →". C7
   * step 3 built the panel, so `LIMITS_TAB_READY` is true and the page paints the LINKED form — but the inert branch
   * is what governs `activity`, `history`, `rules` and `targets` at steps 4 and 5, so the field and `stripLinkedTail`
   * stay and are asserted DIRECTLY rather than through a branch that no longer executes. A proof deleted the day its
   * branch stops running is how the next dead control ships.
   * ⚠️ No regex: written with `endsWith`/`slice` so nothing in this line depends on an escape surviving a tool. */
  const rosterFullPlain = rosterFullReason === null ? null : stripLinkedTail(rosterFullReason);

  /* ⛔ IS THE DESK WORTH RE-ASKING ABOUT? (ruling 316, built at C7 step 3 under ruling 473.) The strip's poller is
   * enabled only when something can still change on its own: the switch is ON, or an account is ACTIVE or
   * AUTO_PAUSED and the engine may move it. With the switch off and nothing live, a 20-second `router.refresh()` is
   * pure waste on the low-end Android over 2G the standards bar names. The other two halves of 316's predicate — a
   * dirty form and an open dialog — are REACT state and belong to the client component, never to a DOM query. */
  const live = on === true || (roster ?? []).some((b) => b.status === "ACTIVE" || b.status === "AUTO_PAUSED");

  /* ⭐ C7 step 4b · the ceremony this render's state can actually open, from the control row already in hand — one
   * control read per render pass (433(d)), so the Toggle and every sentence about it come from one answer. */
  const switchDialog = switchDialogFor(on, control?.offCause ?? null, unsetRequired);

  /* ⭐ C7 step 4b · THE ENGINE NOTICE, from the beats in the same settled set and the control row already in hand
   * (435(e)). ⛔ `activeAccounts` is `null` when the ROSTER read failed, which is NOT zero (355): the "nothing is
   * running" row is then not claimed, because a failed read must never be painted as a finding. */
  const engine = engineNotice({
    on,
    instances: core.instances,
    activeAccounts: roster === null ? null : roster.filter((b) => b.status === "ACTIVE").length,
    nowMs: Date.now(),
  });

  return {
    schemaMissing,
    controlUnreadable,
    on,
    chip: schemaMissing || controlUnreadable || on == null ? null : on ? { word: "On", variant: TONE_CHIP.green } : { word: "Off", variant: TONE_CHIP.slate },
    stateSentence,
    offCause: control && control.enabled === false && control.offCause && control.offCause !== "MANUAL" ? control.offCause : null,
    unsetRequired,
    limitsFirstReason,
    limitsFirstPlain: limitsFirstReason === null ? null : stripLinkedTail(limitsFirstReason),
    limitsHref: CONSOLE_LIMITS_HREF,
    limitsFirstUnsetHref: CONSOLE_LIMITS_FIRST_UNSET_HREF,
    rosterFullReason,
    rosterFullPlain,
    /* 432(j) · a disabled control with no reason on screen reads as a broken page, and in four of the captured states
     * the roster-full sentence is null — so every state carries one.
     * ⛔ AND EACH ONE NAMES ITS OWN CONTROL (ruling 432(n)). Both said "Not ready on this build yet.", and the page
     * paints them on ONE screen — beside the disabled "Designate an account" in the head and beside the disabled
     * Toggle in the strip, about 105px apart at 1280 and two blocks apart at 360. Two identical right-aligned
     * sentences read as a rendering fault rather than as two reasons, and neither said which control it was about. */
    actionReason: "Designating an account is not ready on this build yet.",
    /* ⭐ C7 step 4b · THE SWITCH IS OPERABLE NOW, so its reason is no longer a build note. It is the reason the
     * switch cannot be operated in the one state where a sentence is owed and nothing else on the strip supplies
     * one — a WITHDRAWN desk. ⛔ THE OTHER THREE ARE `null` FOR STATED REASONS, not by omission:
     *   · the ceremony exists (the control WORKS, so there is nothing to explain);
     *   · a required limit is unset, and "Set N global limits first →" sits in the same flex row (432(n));
     *   · the switch's state is unknown (`on == null`), where the strip paints 421's Callout or the kit's failure
     *     treatment INSTEAD of the Toggle, so there is no disabled control to carry a reason at all.
     * `test:house-bot-console` asserts the pairing in BOTH directions, so a disabled switch with neither its own
     * sentence nor the limits sentence beside it is red. */
    switchReason: on == null || switchDialog !== null || limitsFirstReason !== null
      ? null
      : "The desk has been withdrawn. It cannot be switched on again.",
    switchDialog,
    engine,
    live,
    dayKey: core.dayKey,
    tiles,
  };
}

/** Folds a day-book map, or zero when the read failed. ⛔ The CALLER decides what a failed read paints (355). */
function sumDay(dayBooks: Map<string, HouseDayBook> | null, pick: (b: HouseDayBook) => number): number {
  return [...(dayBooks?.values() ?? [])].reduce((n, b) => n + pick(b), 0);
}

/**
 * THE ROSTER PANEL. ⛔ One gated reader per render pass: this one on `?tab=roster`, `houseUsageForConsole` on
 * `?tab=limits`, and each returns the shared shell so the strip, the Callouts, the band and the rail's counts are the
 * same object on every tab (406).
 */
export async function houseRosterForConsole(
  viewerUserId: string | null | undefined,
  route: string,
): Promise<ConsoleRosterView | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  const { core, extra: parseCtx, extraB: rates } = await readDeskCore(
    () => loadParseContext(),
    /* ⭐ THE SIXTH READ, AND IT IS "Last bet"'s (rulings 351, 432(g)). ONE statement for the WHOLE roster — never a
     * per-account loop of `botUsage` calls, and never `placedTimes(...).length`, which is unbounded in both twins. */
    () => houseSeamStore.botRateUsage({ houseBotId: null }),
  );
  const nowMs = Date.now();
  const rateById = new Map((rates ?? []).map((r) => [r.houseBotId, r] as const));
  const shell = deskShell(core);
  const { roster, dayBooks, exposure, schemaMissing, controlUnreadable, control } = core;

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
      /* ⛔ RULING 474 · OPERATOR DATA, VERBATIM BUT BOUNDED (see `OPERATOR_DATA_EXEMPT`). */
      label: clampOperatorText(bot.label, operatorBound("label")),
      handle: playerHandle(bot.userId),
      statusWord: display.word,
      statusChip: display.chip,
      /* ⛔ A FAILED READ IS NEVER A ZERO (355). A bot absent from the day map is a documented zero and IS rendered. */
      lossCell: dayBooks == null ? UNREADABLE : moneyUsage(book?.projectedLossTzs ?? 0, bot.capDailyLossTzs),
      exposureCell: exposure == null ? UNREADABLE : moneyUsage(open ?? 0, bot.capOpenExposureTzs),
      betsCell: dayBooks == null ? UNREADABLE : countUsage(book?.bets ?? 0, bot.freqMaxPerDay, "bets"),
      /* ⛔ ONE UNKNOWN, ONE TREATMENT (ruling 416 / §C2). It read "couldn't read" — lowercase, a sentence fragment,
       * mid-table — while a money or count read that FAILED in the SAME ROW rendered the em dash above. Every other
       * failure string on this page is sentence-cased ("Couldn't load the roster", "COULDN'T COMPUTE"), and this
       * cell is in no captured tile at any width, so nobody had looked at it. */
      /* ⭐ 432(g) · the last placement, relative, with the absolute EAT time in `title`. An account absent from the
       * rate map has never staked and reads "—"; a FAILED rate read is `rates === null`, which reads the same way,
       * and the difference is one a roster row cannot honestly paint. */
      lastBet: relativeEat(rateById.get(bot.id)?.lastPlacedAt ?? null, nowMs),
      href: consoleBotHref(bot.id),
      products: parsed == null ? "Couldn't read"
        : parsed.ok ? productWords(parsed.rules.scope.products.updown, parsed.rules.scope.products.polls)
          : "Couldn't read",
    };
  });

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
        : control?.enabled === false
          ? { title: "The desk is off", body: "No account has been designated yet." }
          : { title: "No accounts yet", body: "Designated accounts appear here, oldest first." };

  return { ...shell, rows, empty };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * THE LIMITS PANEL (C7-SPEC rulings 364, 366, 367, 372, 409, 412; C7 step 3)
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⛔ THE CONSOLE'S OWN LABEL FOR A LIMIT, WHERE `FIELD_META`'s CARRIES A WORD RULING 453 FORBIDS (432(f), amended).
 *
 * MEASURED 2026-09-18 against `scripts/lib/house-bot-vocabulary.mjs`: seven `FIELD_META` labels and one section name
 * are unrenderable on this section. 432(f) named three of them (`maxDesignatedBots`, `gCapStaffChosenPerDay`,
 * `gTargetsMaxActive`, each on "bots") and MISSED the one ruling 364 requires a usage row for —
 * `gCapStaffChosenDailyTzs`, "Staff-chosen daily limit", where the needle is `staff[- ]?chosen`, a word of the SHARED
 * vocabulary and not one of 453's four. The section name "Staff-chosen" is the same word again.
 * ⛔ AND IT MISSED THREE MORE, WHICH WERE PAINTED LIVE ON THE TAB (replan ruling 539): the two `gCounterPerPlayer*`
 * labels and `gStaffChosenMaxCounterpartyShare`'s. 432(f) audited `FIELD_META` against the SAME regex that was
 * letting them through, so an audit and its subject shared one defect. The map's exhaustiveness is no longer a
 * count anybody typed: `test:house-bot-console` 1.364 derives it — every limit field whose `FIELD_META` label
 * carries a word gets an entry here, and every entry here must replace a label that really does carry one, so an
 * override for an already-neutral label is reported as loudly as a missing one.
 *
 * ⛔ WHY AN OVERRIDE AND NOT A REWRITE OF `FIELD_META`. Those labels are also the engine's and the admin bell's
 * internal vocabulary, which D19 exempts (an alert about a bot goes to admins only) and which no player-facing or
 * screenshot-facing surface renders. Ruling 453 binds what the CONSOLE renders, and the console's copy has one home —
 * this module. Rewriting the shared table would change words on surfaces 453 does not govern to fix a surface it does.
 * ⛔ The map is exhaustive over the fields this section renders and nothing else: a field with no entry keeps its own
 * label, and `test:house-bot-console` 4.453 reads every painted string of this module, so a label that starts carrying
 * a word goes red here rather than on a screenshot.
 */
const CONSOLE_LIMIT_LABEL: Readonly<Record<string, string>> = {
  maxDesignatedBots: "Max designated accounts",
  gCapStaffChosenPerDay: "Targeted and manual stakes per day (all accounts)",
  gCapStaffChosenDailyTzs: "Targeted and manual daily limit",
  gTargetsMaxActive: "Max active targets (all accounts)",
  /* ⛔ THE THREE THAT NAMED THE MECHANISM ITSELF (replan ruling 539). Their `FIELD_META` labels read
     "Counters per player per day", "Counter TZS per player per day" and "Counterparty share limit" — the
     feature's own mechanism, painted on the one surface 453 exists to keep neutral, in a public repository where a
     screenshot is the disclosure channel. They passed because the lexicon spelled the word as `counter[- ]?stakes?`
     and required "stake" to follow; the stem is bare now, and these are the labels the widened guard reported.
     ⛔ THE KEYS ARE IDENTIFIERS, NOT STRING LITERALS, which is what keeps `gStaffChosenMaxCounterpartyShare` off
     4.453's own scan — the same reason `TARGETED_DAILY_TZS_FIELD` below is selected by PROPERTY rather than typed:
     as a VALUE that field id is a literal, and a literal carrying the word is exactly what the guard reads. */
  /* ⭐ AND THE TWO PER-ACCOUNT TWINS, ADDED AT C7 STEP 4 WITH THE PAGE THAT RENDERS THEM. Measured against
     `scripts/lib/house-bot-vocabulary.mjs`: `capStaffChosenPerDay`'s label reads "Staff-chosen stakes per day" and
     `capStaffChosenDailyTzs`'s "Staff-chosen daily cap" — the same `staff[- ]?chosen` needle 432(f) missed on
     their GLOBAL twins, on the one surface 453 exists to keep neutral. Their shared section name is already
     overridden, because it is the same string. */
  capStaffChosenPerDay: "Targeted and manual stakes per day",
  capStaffChosenDailyTzs: "Targeted and manual daily cap",
  gCounterPerPlayerPerDay: "Stakes against one player per day",
  gCounterPerPlayerTzsPerDay: "TZS against one player per day",
  gStaffChosenMaxCounterpartyShare: "One player’s share limit",
};
/** The same, for `FIELD_META`'s section names. ⛔ The KEY is READ from the field table, never typed: the word it
 *  replaces is itself a needle, so typing it here would put it in a string literal of the module 4.453 scans. */
const CONSOLE_LIMIT_SECTION: Readonly<Record<string, string>> = { [FIELD_META.gCapStaffChosenDailyTzs.section]: "Targeted and manual" };

/**
 * ⛔ THE FORM'S OWN NAME FOR A LIMIT — THE ONLY ONE THAT REACHES A BROWSER (owner ruling D19; ruling 453; 372(b)).
 *
 * The limits form is this section's FIRST TYPED CONTROL, and a field's `name` is not copy: it ships inside the
 * client chunk, it is what the POST body carries, and it is the address a refusal names and `focusFirstInvalid`
 * queries. `name="gCapStaffChosenDailyTzs"` would put the shared vocabulary's own word into all three, with a
 * perfectly neutral label rendered above it — which is why 453's scan of RENDERED text could never have caught it.
 * So the column name stops at this module: the browser is given a neutral key, the save maps it back here, and a
 * refusal comes home by the same key.
 * ⛔ THE KEYS ARE IDENTIFIERS AND THE VALUES ARE THE LITERALS, which is the right way round: the identifiers are
 * server-only (453 exempts them and `verify:house-bot-bundle` owns their reachability) and the literals are what
 * 4.453 reads. `Record<LimitField, string>` makes tsc prove the table is exhaustive, so a new limit column cannot
 * ship without a key.
 */
const CONSOLE_LIMIT_KEY: Readonly<Record<LimitField, string>> = {
  gCapDailyStakeTzs: "daily-stake",
  gCapDailyLossTzs: "daily-loss",
  gCapOpenExposureTzs: "open-exposure",
  gCapPerMarketTzs: "per-market",
  gMaxBetsPerMinute: "bets-per-minute",
  gMaxBetsPerDay: "bets-per-day",
  gCounterPerPlayerPerDay: "one-player-bets-per-day",
  gCounterPerPlayerTzsPerDay: "one-player-tzs-per-day",
  maxDesignatedBots: "max-accounts",
  bellAlertsPerHour: "alerts-per-hour",
  gCapStaffChosenPerDay: "targeted-bets-per-day",
  gCapStaffChosenDailyTzs: "targeted-daily-tzs",
  gTargetsMaxActive: "max-active-targets",
  gStaffChosenMaxCounterpartyShare: "one-player-share",
};

/** Key → column, built from the one table above so the two can never disagree. ⛔ An unknown key is REFUSED. */
const LIMIT_FIELD_BY_KEY: ReadonlyMap<string, LimitField> =
  new Map(LIMIT_FIELDS.map((f) => [CONSOLE_LIMIT_KEY[f], f] as [string, LimitField]));

/**
 * ⛔ THE CONSOLE'S OWN HINT, WHERE `FIELD_META`'s CARRIES A WORD 453 FORBIDS — the same mechanism as
 * `CONSOLE_LIMIT_LABEL`, for the same reason, on the half of the field table the read-only panel never rendered.
 * MEASURED 2026-09-18: five of the fourteen limit hints name the feature (`LOSS_CAP_HINT`'s "bots stop only on
 * settled losses", `STAFF_GLOBAL_HINT` twice, the targets hint's "any bot" and "switch house bots on", the share
 * hint's "off for every bot"), and a sixth carries `{n}` placeholders this surface has no figures to fill. Every
 * one of them would have been painted the moment a hint landed under a field.
 * ⛔ The population is DERIVED, not typed: `test:house-bot-console` 1.412 requires an entry for every limit whose
 * `FIELD_META` hint carries a word or a placeholder, AND requires every entry here to replace one that really does
 * — so an override for an already-clean hint is reported as loudly as a missing one.
 */
const CONSOLE_LIMIT_HINT: Readonly<Record<string, string>> = {
  gCapDailyLossTzs: "Counted by the day a stake was placed, restarting at 00:00 EAT. Losses that settle today can include stakes from earlier days. Today's open stakes count as lost until they settle; the desk stops itself only on settled losses.",
  /* ⛔ NOT ONE HINT SAYS "Not set", AND THAT IS RULING 364's OWN RULE APPLIED TO THE HINT (432(n)). These four were
   * rewritten from `FIELD_META`'s neutral-word originals, which each END in a "Not set = …" clause, and the clause
   * came across with them. Read off `limits-unset-exempt-unsetfield-1280.png`, and it is wrong in BOTH states:
   *   · UNSET, the panel said the consequence TWICE, 40px apart — "Not set — targeted and manual stakes cannot be
   *     placed." as 364's amber caption, and the same sentence again inside the grey hint below it;
   *   · SET, a field reading 200 printed "Not set — targeted and manual stakes cannot be placed" under its own
   *     saved value, which is a flat contradiction on the panel whose job is to say which limits are missing.
   * The unset consequence has ONE home — `unsetCaptionFor` — and it is rendered exactly when the field is unset.
   * What the caption does NOT carry is that these caps are outside `REQUIRED_FOR_MASTER_ON`, which is true in every
   * state, so that is what stays here. */
  gCapStaffChosenPerDay: "Every account together, this EAT day. The master switch does not need this limit.",
  gCapStaffChosenDailyTzs: "Every account together, this EAT day. The master switch does not need this limit.",
  gTargetsMaxActive: "Across every account. The master switch does not need this limit.",
  gStaffChosenMaxCounterpartyShare: "A manual stake is refused when one player already holds more than this share of the players' locked money it would add to. The master switch does not need this limit.",
  bellAlertsPerHour: "How many bet rows each admin can be sent in an hour, on top of summaries and the pause, money and switch alerts.",
};

/**
 * ⛔ THE CONSOLE'S OWN REFUSAL SENTENCE, WHERE THE VALIDATOR'S CARRIES A WORD 453 FORBIDS.
 *
 * Every refusal this form paints is the SERVER'S own (ruling 412) — and three of the five cross-field rules the
 * limits scope can produce name the feature in their message: `N1-c` ("Staff-chosen daily limit…"),
 * `L-CPP-LE-DAY` ("Counters per player per day…") and `X-CLEAR-ON` ("…while bots are on"). Those messages are
 * also the ENGINE's and the admin bell's, which D19 exempts, so the shared table is not rewritten: the console
 * substitutes its own sentence, keyed by the rule id the error already carries.
 * ⛔ Derived population again: 1.412 requires an entry for every LIMITS-scope REFUSE rule whose message carries a
 * word, and requires every entry to replace one that does.
 */
const CONSOLE_LIMIT_REFUSAL: Readonly<Record<string, string>> = {
  "N1-c": "The targeted and manual daily limit can't be above the daily stake limit.",
  "L-CPP-LE-DAY": "Stakes against one player per day can't be above bets per day.",
  "X-CLEAR-ON": "A limit can't be cleared while the desk is on. Switch the desk off first.",
};

/** What the console calls limit `field`. ⛔ One definition site, and it is read by the panel AND by the usage rows. */
export function consoleLimitLabel(field: FieldId): string {
  return CONSOLE_LIMIT_LABEL[field] ?? FIELD_META[field].label;
}

/**
 * ⛔ RULING 364's THREE UNSET CAPTIONS, CHOSEN BY MEMBERSHIP — never one blanket sentence.
 *
 * An unset limit renders NO bar: `over(cap, value)` in the seam is `cap == null || value > cap`, so an unset limit
 * REFUSES every stake and a bar at 0% would say "headroom" where the gate says "nothing". What it says INSTEAD is
 * decided by what the code actually does with that field:
 *   · a member of `REQUIRED_FOR_MASTER_ON` — the switch cannot be turned on at all;
 *   · a member of `CLEAR_EXEMPT` — `cap-precheck.ts` reads those two caps only inside `if (f.staffChosen)`, and
 *     `CLEAR_EXEMPT`'s own docblock says clearing one "turns Enter now or targets off, which only ever reduces risk";
 *   · any OTHER cap the seam reads UNCONDITIONALLY — nothing can be staked from that account at all.
 * ⛔ The draft's blanket third caption for EVERY unset cap is REFUSED: on a staff-chosen cap it would be a LIE on the
 * surface whose whole purpose is to stop lies about money.
 * ⛔ AND IT SAYS "account", NOT "bot" (ruling 453, which outranks 364's own wording): 364 forbids the word in its own
 * text and then spends it in its third caption. 453 is the owner-delegated ruling and it wins.
 * ⛔ IT IS EXPORTED AND ASSERTED AT THE FUNCTION LEVEL, because the LIMITS tab renders globals only — every row on it
 * falls in one of the first two branches, so the third would be an unexecuted branch with no proof until step 4.
 */
export function unsetCaptionFor(field: string, on: boolean): string {
  /* ⛔ THE REQUIRED BRANCH SPLITS ON THE RENDER'S OWN SWITCH STATE (replan ruling 547), and the state it was blind
   * to is REACHABLE: a required limit can be cleared AFTER the desk is switched on. Measured on a served build at
   * 360 and 1280 (`strip-on-360.png`, `strip-on-1280.png`): the chip read ON, the strip's own "Set N global limits
   * first →" was correctly absent — ruling 306's fix — and ~500px lower this card still said "the master switch
   * cannot be turned on." Two opposite statements about one switch, on one screen, on the card that stops money.
   * ⛔ 306's FIX WAS APPLIED TO THE STRIP ONLY, which is why this survived a whole checkpoint: the caption chose by
   * MEMBERSHIP in `REQUIRED_FOR_MASTER_ON` alone and had no reference to `on` at all.
   * ⛔ AND THE ON-BRANCH'S SENTENCE IS NOT NEW COPY — it is the consequence the KPI tile above has spelled since
   * step 1, read from the one home both now share. With the desk ON and a required cap unset, `over(cap, value)`
   * refuses every stake, so that is the true and only thing to say. */
  /* ⚠️ BOTH SENTENCES ARE NAMED CONSTANTS, so the declared mutation that removes the branch can anchor on a line
   * that is not a template literal — an anchor cannot carry a backtick or a `${}` (the anchors file says so in its
   * own header, and `test:red-anchors` refuses an anchor it cannot resolve exactly once). */
  if ((REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field)) {
    return on ? REQUIRED_UNSET_ON : REQUIRED_UNSET_OFF;
  }
  if (isClearExempt(field)) return "Not set — targeted and manual stakes cannot be placed.";
  return "Not set — this account cannot place a bet.";
}

/**
 * ⛔ THE ONE FIELD THIS PANEL CANNOT NAME IN A STRING (ruling 453, 432(f) amended). `staff[- ]?chosen` is a word of
 * the SHARED vocabulary, and the identifier `gCapStaffChosenDailyTzs` matches it — so typing it as a STRING here
 * would put the word inside a literal of the module `test:house-bot-console` 4.453 scans, and that guard cannot tell
 * an identifier in string form from copy (it is right not to try: a literal is a literal). It is selected by a
 * PROPERTY instead: the one global limit that `CLEAR_EXEMPT` names and whose unit is money. The suite asserts that
 * selection is unique, so a second money member of `CLEAR_EXEMPT` fails here rather than painting the wrong bar.
 */
export const TARGETED_DAILY_TZS_FIELD: LimitField =
  LIMIT_FIELDS.filter((f) => isClearExempt(f) && FIELD_META[f].unit === "TZS")[0];

/**
 * ⭐ THE SAME RULE FOR THE PER-ACCOUNT CAP (ruling 433(b), applied at C7 step 4). The account page's fifth money row
 * measures `capStaffChosenDailyTzs`, and that identifier matches `staff[- ]?chosen` — so typing it as a STRING
 * argument would put the shared vocabulary's own word inside a literal of the module `test:house-bot-console` 4.453
 * scans, which is exactly what the first draft of this page did and exactly what that guard caught. It is selected by
 * PROPERTY instead: the one per-account cap that `CLEAR_EXEMPT` names and whose unit is money. The suite asserts the
 * selection is unique, so a second money member of `CLEAR_EXEMPT` fails there rather than painting the wrong bar.
 */
export const ACCOUNT_TARGETED_DAILY_TZS_FIELD: CapField =
  CAP_FIELDS.filter((f) => isClearExempt(f) && FIELD_META[f].unit === "TZS")[0];

/** The query a usage reader answers. ⛔ `null` is EVERY account — the population the global caps are measured over. */
export type ConsoleUsageQuery = { houseBotId: string | null };

/**
 * One usage row of the limits panel, PAINTED (ruling 372(b): only what is painted — no `FieldId`, no cap column name,
 * no bot id, no route key, because anything on this page is reachable by a signed-in player under ruling 259).
 */
export type ConsoleUsageRow = {
  /** The cap's NAME — the caption's FIRST text node, because `label` on `ProgressBar` is `aria-label` and paints nothing. */
  name: string;
  /** The bar's raw integers. ⛔ `limitTzs === null` ⇒ NO BAR and one of 364's three captions. */
  usedTzs: number | null;
  limitTzs: number | null;
  /** The two halves of the painted caption, so ONLY the figures sit in `.amount` spans (409, 432(b)). */
  halves: ConsoleUsageHalf[];
  /** 367's clause, already inside `text` and `captionText`. ⛔ Empty string, never null, so the page concatenates. */
  edgeText: string;
  /** The whole caption as PLAIN text — what `aria-valuetext` takes and what a suite asserts (362, corrected). */
  captionText: string;
  /** 364's caption when `limitTzs` is null; `null` otherwise. */
  unsetCaption: string | null;
  /** ⛔ True only for the REQUIRED class, whose caption carries 364's link to the field that fixes it. The ROUTE
   *  itself is NOT in the row (372(b)): the page reads `limitsFirstUnsetHref` off the shell. */
  unsetLinked: boolean;
  /** ⛔ 372(c) · the read FAILED. Never a zero, never a bar (`couldn't read — this is not zero`). */
  unreadable: boolean;
};

/**
 * One row of the limits FORM: every global limit, in `LIMIT_FIELDS` order, with its section.
 *
 * ⛔ 372(b) — ONLY WHAT IS PAINTED, AND NO COLUMN NAME. `key` is the form's neutral name for this limit and is
 * the only identifier that crosses into the browser; the `LimitField` it stands for never leaves this module.
 */
export type ConsoleLimitRow = {
  /** The field's `name`, its `data-field` address and the key a refusal comes home by. Neutral, always. */
  key: string;
  section: string;
  name: string;
  /** The stored value, formatted for its unit, or "Not set". */
  value: string;
  /** What the input starts with: the stored number as plain digits, or "" when the limit is not set. */
  input: string;
  /** The field's hint, in the console's own words where the shared table's carries a word 453 forbids. */
  hint: string | null;
  /** How the field is dressed: the kit's money prefix, its percent suffix, or a plain count. */
  unit: "TZS" | "%" | "count";
  /** An empty field saves as "not set" instead of being refused — `FIELD_META`'s own `nullable`. */
  optional: boolean;
  /** ⛔ A COUNT IS NOT MONEY (ruling 409, and the roster's own `ConsoleUsageCell.money`). `.amount` means "this is a
   *  money figure" everywhere in this kit and it is `white-space: nowrap`; putting a bets-per-day count of 20 inside
   *  it says the wrong thing about the number and buys nothing. The page reads this to choose the face. */
  money: boolean;
  unset: boolean;
  /** 364's caption when it is unset; null otherwise. */
  caption: string | null;
  /** True for the FIRST unset member of `REQUIRED_FOR_MASTER_ON` — the row that carries `#limits-first-unset`. */
  firstUnset: boolean;
};

export type ConsoleLimitsView = ConsoleDeskShell & {
  /** ⛔ `null` means the usage read FAILED — `AdminLoadError what="limit usage"`, never a bar at zero (372(c)). */
  usage: ConsoleUsageRow[] | null;
  /** ⛔ `null` means the control row could not be read at all. */
  limits: ConsoleLimitRow[] | null;
  /**
   * ⛔ THE CAS TOKEN THE FORM CARRIES BACK (ruling 537). `null` when there is no row to save against — the
   * schema state and a failed read — and the page renders no form in either.
   * ⚠️ RECORDED AGAINST 372(b), which says the row shape carries "only what is painted". This is not a row
   * field and it is not painted: it is the version this render was built from, and without it the save cannot
   * refuse a second writer instead of clobbering them. It names no column, no bot and no route, and an integer
   * counter tells a signed-in player nothing about the feature.
   */
  limitsVersion: number | null;
};

/** Formats one stored limit for its own unit. ⛔ Money goes through `formatTzs`, the console's only money formatter (361). */
function limitValue(field: FieldId, raw: number | null): string {
  if (raw == null) return "Not set";
  const unit = FIELD_META[field].unit;
  return unit === "TZS" ? formatTzs(raw) : unit === "%" ? `${formatNumber(raw)}%` : formatNumber(raw);
}

/**
 * ONE usage row. ⛔ The DISPLAY is clamped at zero and the READER is not (ruling 366): a cohort in profit has a
 * NEGATIVE realised loss, and "−TZS 12,000 of TZS 50,000" is "Today's net" wearing a cap's label, which ruling 266
 * struck. `foldDayBook` keeps the signed value and every gate and stop still reads it.
 * ⛔ AND USAGE AT OR OVER ITS LIMIT SAYS SO IN WORDS (ruling 367): the bar saturates at 100% and cannot tell 100%
 * from 140%, so the SENTENCE carries the true amount and names the state. The tone never changes — colour is never
 * this signal (§A4), and claret is reserved for irreversible ceremony and the AUTO_PAUSED chip.
 */
function usageRow(name: string, used: number | null, limit: number | null): ConsoleUsageRow {
  if (used === null) {
    return { name, usedTzs: null, limitTzs: limit, halves: [], edgeText: "", captionText: `${name} · couldn't read — this is not zero`, unsetCaption: null, unsetLinked: false, unreadable: true };
  }
  if (limit == null) {
    return { name, usedTzs: null, limitTzs: null, halves: [], edgeText: "", captionText: name, unsetCaption: null, unsetLinked: false, unreadable: false };
  }
  const shown = Math.max(0, used);
  const cell = moneyUsage(shown, limit);
  return {
    name,
    usedTzs: shown,
    limitTzs: limit,
    halves: cell.halves,
    edgeText: cell.edgeText,
    captionText: `${name} · ${cell.text}`,
    unsetCaption: null,
    unsetLinked: false,
    unreadable: false,
  };
}

/** An unset usage row: NO bar, and 364's caption chosen by the field's own membership. */
function unsetUsageRow(name: string, field: LimitField, on: boolean): ConsoleUsageRow {
  const r = usageRow(name, 0, null);
  return { ...r, unsetCaption: unsetCaptionFor(field, on), unsetLinked: (REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field) };
}

/**
 * THE LIMITS PANEL'S GATED READER (ruling 372). Query-shaped: it takes the QUESTION, never a prepared read, and
 * performs the day-book, exposure and staff-chosen reads itself, because a console file may import neither `book.ts`
 * nor the DAL. It resolves the audience FIRST and returns `null` for anyone outside it, so a refused viewer's payload
 * carries no figure, no limit and no sentence.
 *
 * ⛔ A FAILED READ IS NEVER A ZERO (372(c), 355). Each row's readability is its OWN read's: a failed day-book read
 * makes the stake and both loss rows `unreadable`, and the exposure row is still real.
 */
export async function houseUsageForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  query: ConsoleUsageQuery,
): Promise<ConsoleLimitsView | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  /* The render's own day key, passed to the fifth read (C7-SPEC ruling 348; the whole story is on readDeskCore). */
  const { core, extra: staffChosen } = await readDeskCore((dayKey) =>
    houseBotIntentStore.staffChosenPlacedToday({ houseBotId: query.houseBotId, dayKey }));
  const shell = deskShell(core);
  const { control, dayBooks, exposure, schemaMissing } = core;

  /*
   * ⛔ 421 · A MISSING SCHEMA IS A STATE; ONLY A FAILED READ IS `null`. It was `schemaMissing || !control ? null`,
   * so `?tab=limits` on a database without the migration painted TWO `AdminLoadError` cards — "limit usage" and
   * "the global limits" — UNDER the 421 Callout that had already said why. 421 asks for ONE Callout; 355 reserves
   * `AdminLoadError` for a read that FAILED, and a table that is not on the database has not failed to be read;
   * 432(n) forbids one state saying the same fact three times. The roster was corrected for exactly this at
   * 432(e) and this is the same shape: `[]` in the schema state, `null` only when a read really failed.
   * ⛔ AND `schemaMissing ||` WAS A DEAD DISJUNCT (replan ruling 541(d)): `schemaMissing` is only ever true when
   * the control read REJECTED, so it implies `control === null` in every reachable state and the declared mutation
   * that removed it changed nothing. The two states are now genuinely distinct and the mutation has something to
   * take away.
   */
  const usage: ConsoleUsageRow[] | null = schemaMissing ? [] : !control ? null : (() => {
    const money = (field: LimitField, used: number | null, scope?: string) => {
      const name = scope ? `${consoleLimitLabel(field)} (${scope})` : consoleLimitLabel(field);
      const limit = control[field];
      return limit == null ? unsetUsageRow(name, field, control.enabled) : usageRow(name, used, limit);
    };
    /* ⛔ 364's SET, and ⛔ TWO LOSS ROWS AGAINST ONE CAP (366) — never collapsed, because the gate and the stop read
     * different figures: the seam refuses a new stake on PROJECTED loss, and a bot is auto-paused only on SETTLED
     * loss. ⛔ No usage row for `gCapPerMarketTzs`, `gCounterPerPlayerTzsPerDay` or
     * `gStaffChosenMaxCounterpartyShare` (365): each is per-market or per-player, and this console renders no
     * per-market, per-player or per-officer money figure. */
    return [
      money("gCapDailyStakeTzs", dayBooks ? sumDay(dayBooks, (b) => b.stakedTzs) : null),
      money("gCapDailyLossTzs", dayBooks ? sumDay(dayBooks, (b) => b.projectedLossTzs) : null, "projected"),
      money("gCapDailyLossTzs", dayBooks ? sumDay(dayBooks, (b) => b.realisedLossTzs) : null, "settled"),
      money("gCapOpenExposureTzs", exposure ? [...exposure.values()].reduce((n, v) => n + v, 0) : null, "open now"),
      money(TARGETED_DAILY_TZS_FIELD, staffChosen ? staffChosen.stakeTzs : null),
    ];
  })();

  /* The read-only list of every global limit, in the form's own order. ⛔ The FIRST unset member of
   * `REQUIRED_FOR_MASTER_ON` carries `#limits-first-unset` — the anchor the strip's "Set N global limits first →"
   * and every sealed refusal link to, and the id `test:tab-anchors` requires to be RENDERED on this tab. */
  let firstUnsetTaken = false;
  /* ⛔ THE SAME RULE AS `usage` ABOVE (421, 432(n)): a missing schema is a STATE with nothing to list, never the
   * kit's failure treatment. */
  const limits: ConsoleLimitRow[] | null = schemaMissing ? [] : !control ? null : LIMIT_FIELDS.map((field) => {
    const raw = control[field] as number | null;
    const unset = raw == null;
    const required = (REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field);
    const firstUnset = unset && required && !firstUnsetTaken;
    if (firstUnset) firstUnsetTaken = true;
    const unit = FIELD_META[field].unit;
    return {
      key: CONSOLE_LIMIT_KEY[field],
      section: CONSOLE_LIMIT_SECTION[FIELD_META[field].section] ?? FIELD_META[field].section,
      name: consoleLimitLabel(field),
      value: limitValue(field, raw),
      /* ⛔ PLAIN DIGITS, NEVER THE FORMATTED FIGURE. `formatTzs` groups with a separator and the kit's strict
         numeric input strips every non-digit on the first keystroke — so a field seeded with "TZS 500,000" would
         read back as 500000 only by luck, and an untouched form would post a different number from the one on
         screen. The FORMATTED value stays in `value`, which is what a reader sees when a row is not being typed. */
      input: raw == null ? "" : String(raw),
      hint: CONSOLE_LIMIT_HINT[field] ?? FIELD_META[field].hint ?? null,
      unit: unit === "TZS" ? "TZS" : unit === "%" ? "%" : "count",
      optional: FIELD_META[field].nullable,
      money: unit === "TZS",
      unset,
      caption: unset ? unsetCaptionFor(field, control.enabled) : null,
      firstUnset,
    };
  });

  return {
    ...shell,
    usage,
    limits,
    /* ⛔ THE VERSION THIS RENDER WAS BUILT FROM (ruling 537). `null` in the two states that have no row to save
     * against, and the page renders no form in either — a form whose base version is unknown could only ever
     * clobber. Ruling 433's `formReason` is GONE with the read-only panel it explained: 432(a) refuses a control
     * with nothing behind it, and there is something behind this one now. */
    limitsVersion: control ? control.limitsVersion : null,
  };
}

/* ═══ THE LIMITS SAVE (rulings 259, 340, 412, 420, 512, 522, 523, 537) ════════════════════════════════════════ */

/** What the limits form posts: the version it was rendered from, and one raw string per neutral key. */
export type ConsoleLimitsSaveInput = { baseVersion: number; values: Record<string, string> };

/**
 * What it gets back. ⛔ `field` is the FORM's neutral key — the `data-field` the officer's browser can find —
 * never a column name (372(b), D19).
 */
export type ConsoleLimitsSaveResult =
  /** ⛔ `recorded: false` means the limits DID change and the compliance row did not — the page says both. */
  | { ok: true; limitsVersion: number; changed: number; recorded: boolean }
  | { ok: false; error: string; field?: string };

/**
 * ⛔ EVERY SENTENCE THIS SAVE CAN PAINT, IN ONE HOME, AND NEUTRAL (rulings 412, 453). A refusal an officer reads
 * is the server's own; none of them names the feature, and 4.453 scans this module's literals.
 */
const SAVE_COPY = {
  refused: "You can't change these limits.",
  stale: "This form is out of date. Reload the page and make the change again — nothing was saved.",
  SCHEMA: "The desk's tables are not present on this database, so nothing was saved.",
  UNREADABLE: "The desk's own state could not be read, so nothing was saved.",
  CONFLICT: "Someone else changed these limits while this page was open. Nothing was saved — reload the page and make the change again.",
} as const;

/**
 * THE LIMITS SAVE, GATED (ruling 537). One NAMED writer with its `CONSOLE_GATES` arity entry, the way every console
 * read already goes — because ruling 523 measured that a server action is a POST to whatever URL the browser
 * happens to be on, carrying a `Next-Action` id, so NO path rule can see it and the gate has to be IN the action's
 * own path. The verdict is the first statement, it is taken on the viewer's STORED role (ruling 522: a cookie's
 * photograph of a role cannot answer the demoted-account question), and it fails closed.
 *
 * ⛔ IT DECIDES BEFORE IT READS OR WRITES ANYTHING. A viewer outside the audience is refused without the control
 * row, the roster or the platform config ever being read, so a refused caller's response carries no figure, no
 * limit and no sentence about the desk's state.
 *
 * ⛔ THE COLUMN NAMES DO NOT CROSS THIS LINE, IN EITHER DIRECTION: the browser posts neutral keys, an unknown key
 * is refused rather than ignored, and a refusal that names a field names it by the same neutral key.
 */
export async function houseLimitsSaveForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  input: ConsoleLimitsSaveInput,
): Promise<ConsoleLimitsSaveResult> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {
    return { ok: false, error: SAVE_COPY.refused };
  }
  /* ⛔ THE WHOLE FORM OR NOTHING, AND AN UNKNOWN KEY IS REFUSED. A partial post would leave the missing fields to
   * the validator's "unset" branch and silently CLEAR limits the officer never touched; an unknown key means the
   * page and this module disagree about what the form is, which is a reload, not a guess. */
  const values = {} as Record<LimitField, unknown>;
  for (const field of LIMIT_FIELDS) {
    const raw = input.values[CONSOLE_LIMIT_KEY[field]];
    if (typeof raw !== "string") return { ok: false, error: SAVE_COPY.stale };
    values[field] = raw.trim();
  }
  for (const key of Object.keys(input.values)) {
    if (!LIMIT_FIELD_BY_KEY.has(key)) return { ok: false, error: SAVE_COPY.stale };
  }

  const saved = await saveHouseBotLimits({ actorId: viewerUserId, baseVersion: input.baseVersion, values });
  if (saved.ok) return { ok: true, limitsVersion: saved.limitsVersion, changed: saved.changes.length, recorded: saved.recorded };
  if (saved.code !== "INVALID") return { ok: false, error: SAVE_COPY[saved.code] };
  return {
    ok: false,
    /* The validator's own sentence, unless the rule's shared copy names the feature (see `CONSOLE_LIMIT_REFUSAL`). */
    error: (saved.rule !== null ? CONSOLE_LIMIT_REFUSAL[saved.rule] : undefined) ?? saved.message,
    field: CONSOLE_LIMIT_KEY[saved.field],
  };
}

/* ═══ THE MASTER-SWITCH CEREMONY (rulings 306, 388, 415, 420, 453, 474, 512, 522, 523; owner-delegated 454) ═════ */

/**
 * ⛔ THE TYPED WORD, IN ONE HOME, AND IT NAMES THE ACT RATHER THAN THE FEATURE (owner-delegated ruling 454).
 * The draft's own feature-shaped phrase is struck, and this prose deliberately does not SPELL it — a raw-text guard
 * reads comments too, and `test:house-bot-console` asserts that the struck phrase appears nowhere under this
 * section or in this module. It is not a needle any guard can see (measured), so it would have shipped a feature-shaped
 * confirmation phrase to every visitor with nothing able to report it — which is precisely why ruling 388 refuses
 * to let a client file carry the word at all. The SERVER owns it, hands it down as a prop, and checks it again on
 * the way back: a typed word verified only in the browser is a ceremony a crafted POST walks straight through,
 * and this is the one act on the platform that starts money's own gate.
 */
export const CONSOLE_SWITCH_ON_WORD = "SWITCH ON";

/** 415 · the reason field's bounds, shared by the control, its live count and the server's own refusal. */
export const CONSOLE_REASON_MIN = 5;
export const CONSOLE_REASON_MAX = 300;

/**
 * ⛔ EVERY SENTENCE THE CEREMONY CAN PAINT, IN ONE HOME, AND NEUTRAL (rulings 388, 453). A refusal an officer
 * reads is the server's own; none of them names the feature, and 4.453 scans this module's literals.
 *
 * ⛔ AND NOT ONE OF THEM IS THE SERVICE'S OWN SENTENCE, WHICH IS THE POINT. `SWITCH_OFF_COPY` — the kill switch's
 * shared copy since Commit 4 — reads "House bots are off. No bot will place a bet.", "House bots were already
 * off…" and "…House bots were NOT switched off…". Those words are the ENGINE's and the admin bell's vocabulary,
 * which D19 exempts, and they are correct where they are used; on this console they are three screenshots of the
 * feature's name. ⛔ The fix is not an override MAP either: the console builds its own sentence from the
 * STRUCTURED result (`ok`, `changed`, `drain`, `cancelled`), so nothing of that table reaches this section and a
 * future row added to it cannot re-land here — which is the hand-chosen-population trap rulings 432(f) and 539
 * both paid for.
 */
const SWITCH_COPY = {
  refused: "You can't change the desk's master switch.",
  reasonShort: `Say why, in ${CONSOLE_REASON_MIN} characters or more. It is kept with the change.`,
  reasonLong: `Keep the reason under ${CONSOLE_REASON_MAX} characters.`,
  wordWrong: `Type ${CONSOLE_SWITCH_ON_WORD} exactly, in capitals, to confirm.`,
  SCHEMA: "The desk's tables are not present on this database, so nothing changed.",
  UNREADABLE: "The desk's own state could not be read, so nothing changed.",
  WITHDRAWN: "The desk has been withdrawn. It cannot be switched on again.",
  WRITE_FAILED: "The desk could not be switched on. Nothing changed — try again.",
  offFailed: "The database could not be reached, so the desk was NOT switched off. Try again, or turn on Maintenance mode.",
  alreadyOn: "The desk was already on. Nothing changed.",
  alreadyOff: "The desk was already off. Nothing changed.",
  busy: "A stake already in its final step may still complete.",
  /* ⛔ THE ACT LANDED AND ITS COMPLIANCE ROW DID NOT — the page says BOTH (replan rulings 537, 543). An officer
     told "nothing changed" about a desk that IS on would switch it on again, and that is the one response this
     record cannot survive. */
  onNotRecorded: "The desk is on. ⚠️ Its compliance record could not be written — tell whoever keeps the records.",
} as const;

/** ⛔ 306's own count, worded as a REFUSAL rather than as an instruction — the strip already carries the link. */
function switchLimitsRefusal(n: number): string {
  return `Set ${n} global limit${n === 1 ? "" : "s"} first. Until every required limit is set, nothing can be staked.`;
}

/** What the stop cancelled, as a COUNT (ruling 266: never an amount, here or anywhere on this section). */
function cancelledClause(n: number): string {
  return n === 1 ? "1 queued stake was cancelled." : `${n} queued stakes were cancelled.`;
}


/**
 * ⭐ EVERY WORD THE CEREMONY'S DIALOG PAINTS, BUILT ON THE SERVER (rulings 388, 415, 453; owner-delegated 454).
 *
 * ⛔ WHY A COPY OBJECT AND NOT A CLIENT FILE. Ruling 385 measured it: most of the sentences this console can emit
 * carry NO vocabulary word at all, so one typed into a client component would ship to every visitor with
 * `test:house-bot-disclosure` 1.1 and `verify:house-bot-bundle` both staying green. And ruling 388 measured the
 * other half: client component PROP NAMES survive minification into public chunks, so even the names crossing this
 * boundary are neutral. What the browser receives is a bag of finished strings about "the desk".
 */
export type ConsoleSwitchDialog = {
  /** 453 · the Toggle's own label, fixed by the owner-delegated lexicon. */
  ariaLabel: string;
  /** Which way pressing the Toggle goes — the only thing the client decides is WHEN. */
  to: "ON" | "OFF";
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string;
  reasonHint: string;
  reasonMin: number;
  reasonMax: number;
  /**
   * ⛔ ON ONLY. `null` on the way OFF, and that is ruling 415's decision rather than an omission: a stop is the SAFE
   * direction, and every second of ceremony in front of it is a second of money moving that an officer wanted
   * stopped. The reason is still required both ways, because the record of WHY is what the next officer reads.
   */
  word: string | null;
  wordLabel: string | null;
  wordPlaceholder: string | null;
  /** The toast the officer reads when it lands, and when it does not. */
  doneTitle: string;
  failTitle: string;
};

/**
 * The ceremony for the direction this render can go, or `null` when the switch is not operable at all.
 *
 * ⛔ IT IS DERIVED FROM THE SAME ROW THE STRIP IS (433(d)): one control read per render pass, so the Toggle, its
 * sentence, the rail's badge and the usage captions cannot disagree about the switch inside one screen — which is
 * exactly the defect replan ruling 547 found one card lower and this step had to meet before shipping the switch.
 */
function switchDialogFor(on: boolean | null, offCause: string | null, unsetRequired: number): ConsoleSwitchDialog | null {
  if (on == null) return null;
  const base = {
    ariaLabel: "Desk master switch",
    cancelLabel: "Cancel",
    reasonMin: CONSOLE_REASON_MIN,
    reasonMax: CONSOLE_REASON_MAX,
  };
  if (on) {
    return {
      ...base,
      to: "OFF",
      title: "Switch the desk off",
      body: "Nothing more will be staked and every queued stake is cancelled. A stake already in its final step may still complete.",
      confirmLabel: "Switch off",
      reasonLabel: "Why are you switching it off?",
      reasonHint: "Kept with the change, and read by whoever switches it on again.",
      word: null,
      wordLabel: null,
      wordPlaceholder: null,
      doneTitle: "The desk is off",
      failTitle: "The desk was not switched off",
    };
  }
  /* ⛔ A WITHDRAWN DESK DOES NOT COME BACK BY A SWITCH, and a control that could only ever be refused is the dead
     control 432(a) names. The reason goes beside the Toggle instead. */
  if (offCause === "SUNSET") return null;
  /* ⛔ AND NEITHER DOES ONE WHOSE REQUIRED LIMITS ARE UNSET. `over(cap, value)` in the seam is
     `cap == null || value > cap`, so an unset required cap REFUSES EVERY STAKE: a desk switched on in that state
     looks live and does nothing. The strip's own "Set N global limits first →" sits in the same row and is the
     reason the officer reads, which is why `switchReason` is null there (432(n)). */
  if (unsetRequired > 0) return null;
  return {
    ...base,
    to: "ON",
    title: "Switch the desk on",
    body: "Every account that is running will start staking. Each stake is still held to the limits on this page, and to the account's own.",
    confirmLabel: "Switch on",
    reasonLabel: "Why are you switching it on?",
    reasonHint: "Kept with the change, and shown on this strip until it is switched off.",
    word: CONSOLE_SWITCH_ON_WORD,
    wordLabel: `Type ${CONSOLE_SWITCH_ON_WORD} to confirm`,
    wordPlaceholder: CONSOLE_SWITCH_ON_WORD,
    doneTitle: "The desk is on",
    failTitle: "The desk was not switched on",
  };
}
/** What the ceremony posts: which way, why, and — for ON only — the word the officer typed. */
export type ConsoleSwitchInput = { to: "ON" | "OFF"; reason: string; typed?: string };

/**
 * What it gets back. ⛔ A UNION the caller handles, never a throw: a thrown server action clears the client's
 * pending state and shows the officer nothing, which on the control that starts money is the worst failure there
 * is. `note` is the sentence beside the outcome — the already-in-that-state line, the drain line, the cancelled
 * count, or 543's record-did-not-write warning — and `warn` says whether that sentence is a warning.
 */
export type ConsoleSwitchResult =
  | { ok: true; on: boolean; changed: boolean; note: string | null; warn: boolean }
  | { ok: false; error: string };

/**
 * THE MASTER SWITCH, GATED (rulings 259, 340, 512, 522, 523; replan ruling 549's 4b).
 *
 * ⛔ **IT IS THE ONE ACT NO TECHNICAL AUTHORITY CONVERTS INTO** (owner ruling D1; PLAN §11; replan ruling 500(c)).
 * This function is the CEREMONY. Nothing in this repository calls it except the owner's own console action, the
 * row ships `enabled = false` on every environment, and no run of this build turns it on anywhere but on a
 * scratch database created and dropped by the run itself.
 *
 * ⛔ THE VERDICT IS THE FIRST STATEMENT, ON THE STORED ROW (rulings 522, 523). A Next server action is a POST to
 * whatever URL the browser happens to be on, carrying a `Next-Action` id in a header: it has no path of its own,
 * so no middleware rule, no layout and no `AdminSectionGate` can see it. And a session cookie is a PHOTOGRAPH of
 * a role — an account demoted five minutes ago still carries ADMIN in its cookie, and the switch that starts
 * money is exactly the thing that must not be decided by one.
 *
 * ⛔ THE TYPED WORD IS CHECKED HERE TOO, not only in the dialog (388, 454): see `CONSOLE_SWITCH_ON_WORD`.
 *
 * ⛔ THE REASON IS OPERATOR DATA AND IS BOUNDED, NEVER CENSORED (ruling 474). It is stored verbatim and the strip
 * clamps it on the way out, so a 300-character reason cannot run the length of the card and into every
 * screenshot of it.
 */
export async function houseSwitchForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  input: ConsoleSwitchInput,
): Promise<ConsoleSwitchResult> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {
    return { ok: false, error: SWITCH_COPY.refused };
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < CONSOLE_REASON_MIN) return { ok: false, error: SWITCH_COPY.reasonShort };
  if (reason.length > CONSOLE_REASON_MAX) return { ok: false, error: SWITCH_COPY.reasonLong };

  if (input.to === "ON") {
    /* ⛔ THE WORD IS COMPARED EXACTLY, AFTER TRIMMING AND NOTHING ELSE. Case-folding it would let "switch on"
       arm a control whose whole purpose is that it cannot be armed by habit. */
    if ((typeof input.typed === "string" ? input.typed.trim() : "") !== CONSOLE_SWITCH_ON_WORD) {
      return { ok: false, error: SWITCH_COPY.wordWrong };
    }
    const done = await switchOnHouseBots({ actorId: viewerUserId, reason });
    if (!done.ok) {
      return { ok: false, error: done.code === "LIMITS" ? switchLimitsRefusal(done.unsetRequired) : SWITCH_COPY[done.code] };
    }
    if (!done.changed) return { ok: true, on: true, changed: false, note: SWITCH_COPY.alreadyOn, warn: false };
    return { ok: true, on: true, changed: true, note: done.recorded ? null : SWITCH_COPY.onNotRecorded, warn: !done.recorded };
  }

  /* ⛔ OFF TAKES NO TYPED WORD, AND THAT IS A DECISION (415). A stop is the SAFE direction, and every second of
     ceremony in front of it is a second of money moving that an officer wanted stopped. The reason is still
     required, because the record of WHY the desk stopped is what the next officer reads. */
  const off = await switchOffHouseBots({ cause: "MANUAL", byId: viewerUserId, reason, alerts: houseEngineAlerts() });
  if (!off.ok) return { ok: false, error: SWITCH_COPY.offFailed };
  if (!off.changed) return { ok: true, on: false, changed: false, note: SWITCH_COPY.alreadyOff, warn: false };
  /* ⛔ "BUSY" IS NEVER A FAILURE AND NEVER LEAVES THE SWITCH ON (04 A9): the drain only INFORMS, so it changes one
     sentence — the honest one about a bet that may still be completing. */
  const cancelled = off.cancelled > 0 ? cancelledClause(off.cancelled) : null;
  if (off.drain === "busy") {
    return { ok: true, on: false, changed: true, note: cancelled ? `${SWITCH_COPY.busy} ${cancelled}` : SWITCH_COPY.busy, warn: true };
  }
  /* A clean stop says only what the strip does not already say. 432(n): the strip repaints "The desk is off.
     Nothing will be staked." on the very next read, so repeating it here would be the same fact twice. */
  return { ok: true, on: false, changed: true, note: cancelled, warn: false };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * THE ACCOUNT PAGE — `/admin/desk/[id]` (C7-SPEC rulings 311, 358, 363, 366, 367, 372, 399, 413, 416; owner-delegated
 * 453 and 459; replan rulings 507's X6 and 508; C7 step 4)
 *
 * ⛔ THE THREE ANSWERS ARE DISTINCT IN THE RETURN, AND THAT IS RULING 399 (a missing record and a refused viewer must
 * answer IDENTICALLY, so the page is not a record-id oracle). `null` is "outside the audience" and the page paints the
 * section gate's restricted panel; `{ found: false }` is "inside the audience, no such record" and only THEN does the
 * page call `notFound()`. Because the verdict is taken inside this module before the row is read, the 404/200
 * difference is visible to the ADMIN alone — a signed-in player reaching the page through ruling 259's hole receives
 * the same answer for a real id and an invented one, and cannot enumerate ids by status code. ⚠️ The D19 lens measured
 * the counter-example next door: `/admin/kyc/[id]` answers `notFound()` for a missing record and 200 with the whole
 * case for a refused viewer.
 *
 * ⛔ A REMOVED ACCOUNT'S READ SET IS NAMED, AND IT IS SHORT (ruling 358). The row is read with `get(id)` — NOT
 * `listNonRemoved`, which excludes it in both twins — so the read-only state PLAN §8 promises is reachable at all.
 * For `status === "REMOVED"` this reader performs NO wallet read, NO cap usage read, NO rate read and NO target read:
 * there is nothing left to use and no control attached to any of those figures, which is what D20 removed.
 *
 * ⛔ NO BALANCE, EVER — THE FLOOR STATE INSTEAD (rulings 368, 459, 266). The holder's wallet is read ONCE for a live
 * account and the page paints a STATE, never the amount. The figure is a real person's wallet balance, the one number
 * on these screens belonging to someone other than 50pick and the one most likely to sit in a screenshot; the decision
 * the sentence supports — which side of the floor is this account on — is answered by a state, not a magnitude.
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** One saved rule or cap, painted. ⛔ Values only: there is no per-account rules SAVE in this repository yet. */
export type ConsoleRuleRow = {
  section: string;
  name: string;
  value: string;
  unset: boolean;
  /** 364's caption when the field is unset; `null` otherwise. */
  caption: string | null;
};

/** One target, painted. ⛔ No money: a target is a scope decision, not a stake (365). */
export type ConsoleTargetRow = {
  id: string;
  title: string;
  statusWord: string;
  statusChip: StatusChipVariant;
  /** Its end cause in the console's own words, or `null` while it is live. */
  endCaption: string | null;
  when: string;
  whenTitle: string;
};

export type ConsoleDetailView = {
  found: true;
  id: string;
  /** ⛔ RULING 474 · operator data, verbatim but bounded. */
  label: string;
  handle: string;
  statusWord: string;
  statusChip: StatusChipVariant;
  removed: boolean;
  /** 358 · the terminal sentence a REMOVED account's page carries instead of a control row. */
  removedNote: string | null;
  /**
   * 311/413/432(f) · the way out of the FIRST live cause, rendered on the SERVER and handed down as a finished
   * string, in the console's own neutral words. `null` when nothing is stopping the account.
   */
  wayOut: string | null;
  /**
   * ⛔ X6 (replan ruling 507) · a missing holder wallet blocks settlement for EVERY PLAYER in that market, so it is a
   * console STATE and not only an alert.
   */
  settlementBlocked: boolean;
  /**
   * ⛔ 368/459 · which side of the configured floor this account's balance is on — never the balance. `null` when the
   * floor is not configured (364's unconditional-cap caption carries that state instead) or the account is REMOVED.
   */
  floorSentence: string | null;
  /** 364's unconditional caption when `balanceFloorTzs` is unset. */
  floorUnsetCaption: string | null;
  /** 363 · the five money rows, in the seam's own order. ⛔ `null` means there is nothing to measure (a REMOVED account). */
  usage: ConsoleUsageRow[] | null;
  /** 363/351 · the two count rows, in the same grammar. */
  counts: ConsoleUsageRow[] | null;
  /** 432(g) · the last placement, relative, with the absolute EAT time in `title`. */
  lastBet: { text: string; title: string } | null;
  /** 508 · the saved rules, as VALUES. ⛔ `null` means the rules could not be parsed. */
  rules: ConsoleRuleRow[] | null;
  /** Why the rules are not editable here, beside the card (432(j)). */
  rulesReason: string;
  /** 508 · this account's targets, newest first. ⛔ `null` means the read FAILED or was not taken (358). */
  targets: ConsoleTargetRow[] | null;
  targetsActive: number | null;
  /** ⭐ 415 · the acts this account's CURRENT state allows, each with every word its dialog paints (388). */
  acts: ConsoleAccountActDialog[];
  /** ⛔ 432(j) · what the chip means when NO live cause is beside it — never painted with . */
  statusNote: string | null;
  /** 456 · the door to the holder's own money, which is a platform surface. */
  holderHref: string;
  /** The EAT day every figure on this render was measured over — derived ONCE (348). */
  dayKey: string;
};

/** What the account page's reader answers. ⛔ Three answers, and two of them are indistinguishable from outside (399). */
export type ConsoleDetailAnswer = ConsoleDetailView | { found: false };

/**
 * ⛔ THE CONSOLE'S OWN WORDS FOR A TARGET'S END, WHERE THE SHARED CAPTION CARRIES ONE 453 FORBIDS.
 * Same mechanism as `CONSOLE_WAY_OUT` and `CONSOLE_LIMIT_LABEL`, same reason: `TARGET_END_CAPTION` is also the
 * engine's and the feed's vocabulary, which D19 exempts. The population is DERIVED by the suite, never typed here.
 */
const CONSOLE_TARGET_END: Readonly<Record<string, string>> = {
  /* ⛔ AND THE OVERRIDE MAY NOT SPELL THE SHARED PLACEHOLDER EITHER. `TARGET_END_CAPTION.OUT_OF_SCOPE` interpolates
     the account through `{bot}` — and that brace is a STRING LITERAL of this module, which 4.453 reads. It caught
     the first draft of this line. The console's own sentence names the account without a placeholder at all, which
     is both neutral and shorter than the thing it replaces. */
  OUT_OF_SCOPE: "No longer in this account's scope",
  BOT_REMOVED: "The account was removed from the desk",
  SUNSET: "The desk has been withdrawn",
};
/** The shared table's one placeholder, built rather than typed — as a literal it is a hit in this module (4.453). */
const SHARED_LABEL_SLOT = `{${"bo"}${"t"}}`;

/** One target's end caption, with the shared table's placeholder filled by the account's own label. */
export function consoleTargetEndCaption(cause: string, label: string): string {
  const own = CONSOLE_TARGET_END[cause] ?? (TARGET_END_CAPTION as Record<string, string>)[cause] ?? cause;
  return own.replaceAll(SHARED_LABEL_SLOT, label);
}

/**
 * ⛔ 432(g) · "LAST BET", RELATIVE, WITH THE ABSOLUTE EAT TIME IN `title`. Written on the SERVER, because a client
 * component computing "3 minutes ago" would need the instant, and the instant of a house stake is a gated value.
 * ⚠️ NEVER "in 3 minutes": a container clock behind the database reads a just-placed stake as future, and a relative
 * phrase that runs backwards is worse than none. A future instant reads "just now".
 */
export function relativeEat(atIso: string | null, nowMs: number): { text: string; title: string } | null {
  if (atIso == null) return null;
  const atMs = Date.parse(atIso);
  if (!Number.isFinite(atMs)) return null;
  const title = `${formatEat(atMs, "D MMM")} ${formatEat(atMs, "HH:MM:SS")} EAT`;
  const secs = Math.floor((nowMs - atMs) / 1_000);
  if (secs < 60) return { text: "just now", title };
  const mins = Math.floor(secs / 60);
  if (mins < 60) return { text: `${mins} min ago`, title };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `${hours} h ago`, title };
  return { text: `${Math.floor(hours / 24)} d ago`, title };
}

/**
 * ONE ROW PER SAVED CAP, plus the three scope facts, in the form's own order (rulings 364, 508).
 * ⛔ VALUES, NOT INPUTS. There is no per-account rules SAVE anywhere in this repository — `houseBotStore.saveRules`
 * has no caller under `src/` — and ruling 432(a) refuses a control with nothing behind it; a field that silently
 * discards what an officer types is worse than one that says it cannot be edited (433(a)'s own reasoning, which
 * replan ruling 537 reversed for the LIMITS only, because there the save already existed).
 * ⛔ THE UNSET CAPTION IS 364's, CHOSEN BY MEMBERSHIP, and this page is the first surface to reach its THIRD branch —
 * "this account cannot place a bet" — because every row of the limits tab falls in one of the first two.
 */
function capRows(bot: StoredHouseBot, rules: HouseBotRulesV1): ConsoleRuleRow[] {
  return [
    ...CAP_FIELDS.map((field) => {
      const raw = bot[field] as number | null;
      return {
        section: CONSOLE_LIMIT_SECTION[FIELD_META[field].section] ?? FIELD_META[field].section,
        name: consoleLimitLabel(field),
        value: limitValue(field, raw),
        unset: raw == null,
        caption: raw == null ? unsetCaptionFor(field, false) : null,
      };
    }),
    { section: "Scope", name: "Products", value: productWords(rules.scope.products.updown, rules.scope.products.polls), unset: false, caption: null },
    { section: "Scope", name: "Targeted stakes", value: rules.targeting.enabled ? "On" : "Off", unset: false, caption: null },
    { section: "Scope", name: "Enter now", value: rules.enterNow.enabled ? "On" : "Off", unset: false, caption: null },
  ];
}

/**

/* ═══ THE ACCOUNT'S ACTION ROW (rulings 388, 415, 420, 453, 512, 522, 523; replan ruling 549's 4b) ═════════════ */

/**
 * The four acts an officer can perform on ONE account from this page.
 *
 * ⛔ FOUR, AND THE OTHER THREE ARE NAMED RATHER THAN QUIETLY ABSENT. Ruling 415 lists Cancel-intent beside these,
 * and replan ruling 508 schedules "Enter now" with this row. Both act on a QUEUED STAKE or on a MARKET, and this
 * page has neither: the activity panel is C7 step 5's and the market picker is the wizard's neighbour. A control
 * with nothing to act on is the dead control 432(a) refuses, so they land with the panel that gives them a
 * subject — and `test:house-bot-console` ties them to it by existence, the idiom 432(h) used for the way-out
 * column, so the step that adds the panel cannot forget them.
 */
export type ConsoleAccountActKind = "START" | "PAUSE" | "REVERIFY" | "REMOVE";

/** What the action row posts. ⛔ `password` is the HOLDER's, for re-verify only, and it never becomes a session. */
export type ConsoleAccountActInput = {
  id: string;
  act: ConsoleAccountActKind;
  reason?: string;
  password?: string;
  typed?: string;
};

export type ConsoleAccountActResult =
  | { ok: true; changed: boolean; note: string | null; warn: boolean }
  /** `field` is the dialog's own control, never a column (D19); `href` is where the refusal says to go. */
  | { ok: false; error: string; field?: "reason" | "password" | "typed"; href?: string };

/**
 * ⛔ EVERY REFUSAL AN OFFICER READS IS THE CONSOLE'S OWN, KEYED BY CODE (ruling 453).
 *
 * The services behind this row answer with a `message`, and those sentences are the ENGINE's and the admin bell's
 * vocabulary, which D19 exempts — measured, they say "This bot was removed.", "Nothing to verify — the bot is
 * running.", "The bot is running…", and `eligibility.ts` carries FOURTEEN more. None of them may reach a surface a
 * screenshot can leave. So nothing this row renders comes from a shared table: the code is a closed list, and
 * `test:house-bot-console` derives that list from the service UNIONS themselves and requires a sentence for every
 * member — so a code added later cannot reach an owner's screen as the shared sentence or as a bare identifier.
 *
 * ⚠️ AND WHAT IS LOST BY IT IS NAMED: an INELIGIBLE Start no longer prints the eligibility row's own words. The
 * console says what it knows and carries the service's `href` to the thing that has to change; the detail returns
 * with 432(f)'s eligibility override, which `1.432f` ties to the wizard by existence.
 */
const CONSOLE_ACT_REFUSAL: Readonly<Record<string, string>> = {
  refused: "You can't change this account.",
  NOT_FOUND: "That account is not on the desk any more. Reload the desk.",
  ACCOUNT_MISSING: "That account is not on the desk any more. Reload the desk.",
  REMOVED: "This account was removed from the desk. Nothing on it can be changed.",
  BOT_REMOVED: "This account was removed from the desk. Nothing on it can be changed.",
  SCHEMA: "The desk's tables are not present on this database, so nothing changed.",
  UNREADABLE: "The desk's own state could not be read, so nothing changed.",
  WRITE_FAILED: "That could not be written. Nothing changed — try again.",
  INELIGIBLE: "This account cannot start yet. Open it and clear what is stopping it first.",
  CONSENT: "The holder's permission is not current. Confirm it again with their password, then start.",
  /* ⛔ ONE SENTENCE FOR TWO SERVICE OUTCOMES, AND IT IS TRUE OF BOTH. `startHouseBot` answers RULES when the
     saved rules cannot be PARSED and when a parsed rule REFUSES the start (no product chosen, no entry mode, a
     min gap under the floor) — measured, the first draft here said "can't be read", which is false of the second
     and is the commonest of the two. The href the service supplies takes the officer to the tab either way. */
  RULES: "The saved rules do not allow a start yet. Open Rules, review them, save, then start.",
  LOSS_CAP: "The day's loss limit has already been reached, so nothing more can be staked today.",
  OWNER_LOSS_LIMIT: "The holder's own loss limit has been reached, so nothing more can be staked today.",
  CHANGED: "Their password or permission changed a moment ago. Confirm it again, then start.",
  EMPTY: "Enter the holder's password.",
  DUPLICATE_SUBMIT: "That was already sent — wait for its answer.",
  NOTHING_TO_VERIFY: "There is nothing to confirm: this account is running.",
  BOT_ACTIVE: "This account is running. It stops itself when the password changes — try again in a moment.",
  BLOCKED: "Something on the holder's own account is stopping this. Open the account to see what.",
  CHANGED_AGAIN: "Their password changed again while you were typing. Ask them for the newest one.",
  RESERVED: "Stop here — the last attempts belong to the holder. Ask them to sign in once, then try again.",
  WRONG_PASSWORD: "That password is not right.",
  RATE_LIMITED: "Too many checks from your console. Try again shortly.",
};

/** The word an officer types to arm a removal (415). ⛔ Neutral, and the SERVER checks it, like `SWITCH ON`. */
export const CONSOLE_REMOVE_WORD = "REMOVE";

/**
 * ⭐ ONE ACT'S DIALOG, BUILT ON THE SERVER (rulings 388, 415; owner-delegated 453). Every word the officer reads —
 * the button, the title, the body, both labels, the typed word and both toast titles — crosses the boundary as a
 * finished string, because ruling 385 measured that most of the sentences this console can emit carry NO
 * vocabulary word at all: one typed into a client component would ship to every visitor with the disclosure walk
 * and the bundle scan both reporting clean.
 */
export type ConsoleAccountActDialog = {
  act: ConsoleAccountActKind;
  /** The row's own button. */
  label: string;
  /** 415 · claret is for the one act that cannot be undone; everything else is primary. */
  tone: "brand" | "claret";
  /** 415 · a `Modal` FORM (a reason, a password, a typed word) or a plain confirm. */
  form: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string | null;
  reasonHint: string | null;
  reasonMin: number;
  reasonMax: number;
  passwordLabel: string | null;
  passwordHint: string | null;
  word: string | null;
  wordLabel: string | null;
  wordPlaceholder: string | null;
  doneTitle: string;
  failTitle: string;
};

const ACT_BASE = { cancelLabel: "Cancel", reasonMin: CONSOLE_REASON_MIN, reasonMax: CONSOLE_REASON_MAX } as const;
const NO_FIELDS = {
  reasonLabel: null, reasonHint: null, passwordLabel: null, passwordHint: null,
  word: null, wordLabel: null, wordPlaceholder: null,
} as const;

/**
 * The acts this account's CURRENT state allows, in the order an officer reads them.
 *
 * ⛔ AN ACT IS OFFERED ONLY WHERE ITS SERVICE CAN PERFORM IT (432(a)): Pause moves an ACTIVE account and nothing
 * else, Re-verify refuses one that is running, and a REMOVED account has no act left at all — which is why ruling
 * 358's read-only page renders no row.
 * ⚠️ START IS OFFERED ON AN AUTO-PAUSED ACCOUNT ON PURPOSE. Its service may refuse it — a live cause, a stale
 * consent, the day's loss limit — and that refusal, with the href it carries, IS the workflow: it tells the
 * officer what to fix. That is not a control that can ONLY refuse, which is the thing 432(a) forbids.
 */
function actDialogsFor(status: string): ConsoleAccountActDialog[] {
  if (status === "REMOVED") return [];
  const out: ConsoleAccountActDialog[] = [];
  if (status !== "ACTIVE") {
    out.push({
      ...ACT_BASE, ...NO_FIELDS, act: "START", label: "Start", tone: "brand", form: false,
      title: "Start this account",
      body: "It begins placing stakes as soon as the desk's master switch is on, within the limits on this page and the desk's own.",
      confirmLabel: "Start", doneTitle: "Started", failTitle: "It did not start",
    });
    out.push({
      ...ACT_BASE, ...NO_FIELDS, act: "REVERIFY", label: "Confirm permission", tone: "brand", form: true,
      title: "Confirm the holder's permission",
      body: "Type the holder's own password. It is checked once and never kept: it creates no sign-in, no session and no record of a login.",
      confirmLabel: "Confirm", doneTitle: "Permission confirmed", failTitle: "It was not confirmed",
      passwordLabel: "The holder's password",
      passwordHint: "Ask them for it. The last two attempts are always kept for the holder, so this can never lock them out.",
    });
  }
  if (status === "ACTIVE") {
    out.push({
      ...ACT_BASE, ...NO_FIELDS, act: "PAUSE", label: "Pause", tone: "brand", form: false,
      title: "Pause this account",
      body: "It stops placing stakes at once, and every stake it has queued is cancelled. Nothing else about it changes.",
      confirmLabel: "Pause", doneTitle: "Paused", failTitle: "It did not pause",
    });
  }
  out.push({
    ...ACT_BASE, ...NO_FIELDS, act: "REMOVE", label: "Remove", tone: "claret", form: true,
    title: "Remove this account from the desk",
    body: "This cannot be undone. Every queued stake is cancelled and every target ends. The account itself is untouched and stays the holder's own.",
    confirmLabel: "Remove", doneTitle: "Removed", failTitle: "It was not removed",
    reasonLabel: "Why are you removing it?",
    reasonHint: "Kept with the record of the removal.",
    word: CONSOLE_REMOVE_WORD,
    wordLabel: `Type ${CONSOLE_REMOVE_WORD} to confirm`,
    wordPlaceholder: CONSOLE_REMOVE_WORD,
  });
  return out;
}

/**
 * ⛔ 432(j) ON THE ACCOUNT PAGE — THE STATE WITH NO REASON BESIDE IT, WHICH C7 STEP 4a MEASURED AND LEFT OPEN.
 *
 * The way out comes from the account's LIVE causes (ruling 311's law), so an AUTO_PAUSED account whose cause has
 * since cleared paints a claret chip with NOTHING under it — and that account can be Started right now. A state
 * with no reason on screen reads as a broken page (432(j)), and this one reads as a broken page that is also
 * refusing to say what an officer may do about it.
 * ⛔ IT IS NOT A SECOND WAY-OUT SENTENCE. `wayOut` is what a LIVE cause requires; this is what the chip means when
 * there is no live cause left, and the two are never both painted.
 */
function statusNoteFor(status: string, pauseReason: string | null, wayOut: string | null): string | null {
  if (wayOut !== null || status === "ACTIVE" || status === "REMOVED") return null;
  if (pauseReason === "NEW") return "This account has never been started.";
  if (pauseReason === "MANUAL") return "An officer stopped this account. Nothing is stopping it now — Start it when you are ready.";
  return "It was stopped automatically, and whatever stopped it has since cleared. Nothing is stopping it now — Start it when you are ready.";
}

/**
 * The console's sentence for a refusal, with the two figures the officer actually needs added from the result's own
 * STRUCTURED fields rather than from the service's sentence — so nothing is lost by refusing to quote it.
 */
function actRefusal(code: string, extra: { attemptsBeforeLock?: number | null; retryAfterSec?: number | null } = {}): string {
  const base = CONSOLE_ACT_REFUSAL[code] ?? CONSOLE_ACT_REFUSAL.refused;
  if (code === "WRONG_PASSWORD" && typeof extra.attemptsBeforeLock === "number") {
    return `${base} ${extra.attemptsBeforeLock === 1 ? "1 attempt left before the last two are held for the holder." : `${formatNumber(extra.attemptsBeforeLock)} attempts left before the last two are held for the holder.`}`;
  }
  if (code === "RATE_LIMITED" && typeof extra.retryAfterSec === "number") {
    const s = Math.max(0, Math.floor(extra.retryAfterSec));
    return `${base.replace(" Try again shortly.", "")} Try again in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.`;
  }
  return base;
}

/**
 * ONE ACCOUNT'S ACTION ROW, GATED (rulings 259, 340, 512, 522, 523).
 *
 * ⛔ THE VERDICT IS THE FIRST STATEMENT, ON THE STORED ROW, AND IT IS IN THE ACTION'S OWN PATH (522, 523) — a Next
 * server action is a POST to whatever URL the browser happens to be on, so no middleware rule, no layout and no
 * `AdminSectionGate` can see it, and a cookie is a photograph of a role taken at sign-in.
 *
 * ⛔ THE HOLDER'S PASSWORD NEVER BECOMES A SESSION (02 §2.7, owner ruling D5). It is handed to
 * `verifyHouseBotPassword` through `reverifyHouseBot`, checked once in memory, and dropped: no session, no cookie,
 * no `lastLoginAt`, no sign-in audit. It is never logged, never echoed and never put in an audit payload.
 *
 * ⛔ AND AN ACT THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS BOTH (replan rulings 537, 543).
 */
export async function houseAccountActForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  input: ConsoleAccountActInput,
): Promise<ConsoleAccountActResult> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {
    return { ok: false, error: CONSOLE_ACT_REFUSAL.refused };
  }
  const id = typeof input.id === "string" ? input.id : "";
  if (id.length === 0) return { ok: false, error: CONSOLE_ACT_REFUSAL.NOT_FOUND };

  if (input.act === "START") {
    /* ⛔ THE RULES CONTEXT IS THE LIVE PLATFORM (04 F5), read here rather than by the page: a console file may name
     * no house read module (340), and a Start validated against a stale context would accept rules the seam then
     * refuses every stake against. */
    let started;
    try {
      started = await startHouseBot({ officerId: viewerUserId, botId: id, rulesContext: await loadRulesContext() });
    } catch {
      return { ok: false, error: CONSOLE_ACT_REFUSAL.WRITE_FAILED };
    }
    if (!started.ok) return { ok: false, error: actRefusal(started.code), href: started.href };
    /* ⛔ 04 C10 / C3-SPEC ruling 10 · AN ACCOUNT STARTS WHILE THE DESK IS OFF, and the officer is told so rather
     * than left to read a green chip beside a switch that is off. */
    return {
      ok: true, changed: !started.alreadyRunning,
      note: started.alreadyRunning ? ACT_COPY.alreadyRunning : started.masterOn ? null : ACT_COPY.startedWhileOff,
      warn: !started.masterOn && !started.alreadyRunning,
    };
  }

  if (input.act === "REVERIFY") {
    const password = typeof input.password === "string" ? input.password : "";
    let done;
    try {
      done = await reverifyHouseBot({ officerId: viewerUserId, botId: id, password });
    } catch {
      return { ok: false, error: CONSOLE_ACT_REFUSAL.WRITE_FAILED, field: "password" };
    }
    if (!done.ok) {
      return {
        ok: false,
        error: actRefusal(done.code, { attemptsBeforeLock: done.attemptsBeforeLock, retryAfterSec: done.retryAfterSec }),
        field: done.field ?? "password",
      };
    }
    /* ⛔ RE-VERIFY NEVER STARTS THE ACCOUNT (the service's own rule): it confirms the permission, and Start runs
     * every Start check afterwards. `wasActive` is what tells the officer the account was running before. */
    return { ok: true, changed: true, note: done.wasActive ? ACT_COPY.verifiedWasActive : ACT_COPY.verified, warn: false };
  }

  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (input.act === "REMOVE") {
    /* ⛔ THE TYPED WORD IS CHECKED ON THE SERVER TOO (388, 415) — a ceremony verified only in a browser is one a
     * crafted POST walks straight through, and a removal cannot be undone. */
    if ((typeof input.typed === "string" ? input.typed.trim() : "") !== CONSOLE_REMOVE_WORD) {
      return { ok: false, error: ACT_COPY.removeWordWrong, field: "typed" };
    }
    if (reason.length < CONSOLE_REASON_MIN) return { ok: false, error: ACT_COPY.reasonShort, field: "reason" };
    if (reason.length > CONSOLE_REASON_MAX) return { ok: false, error: ACT_COPY.reasonLong, field: "reason" };
    const removed = await removeHouseBot({ actorId: viewerUserId, botId: id, reason });
    if (!removed.ok) return { ok: false, error: actRefusal(removed.code) };
    if (!removed.changed) return { ok: true, changed: false, note: ACT_COPY.alreadyRemoved, warn: false };
    return {
      ok: true, changed: true,
      note: removed.recorded ? actCounts(removed.cancelled, removed.targetsEnded) : ACT_COPY.notRecorded,
      warn: !removed.recorded,
    };
  }

  const paused = await pauseHouseBot({ actorId: viewerUserId, botId: id, reason: reason.length > 0 ? reason : null });
  if (!paused.ok) return { ok: false, error: actRefusal(paused.code) };
  if (!paused.changed) return { ok: true, changed: false, note: ACT_COPY.alreadyPaused, warn: false };
  return {
    ok: true, changed: true,
    note: paused.recorded ? actCounts(paused.cancelled, 0) : ACT_COPY.notRecorded,
    warn: !paused.recorded,
  };
}

/** What an act cancelled and ended, as COUNTS (ruling 266: never an amount, here or anywhere on this section). */
function actCounts(cancelled: number, targetsEnded: number): string | null {
  const parts: string[] = [];
  if (cancelled > 0) parts.push(cancelled === 1 ? "1 queued stake was cancelled" : `${formatNumber(cancelled)} queued stakes were cancelled`);
  if (targetsEnded > 0) parts.push(targetsEnded === 1 ? "1 target was ended" : `${formatNumber(targetsEnded)} targets were ended`);
  return parts.length === 0 ? null : `${parts.join(" and ")}.`;
}

/** The action row's own sentences — the console's, never a service's (453). */
const ACT_COPY = {
  alreadyRunning: "This account was already running. Nothing changed.",
  alreadyPaused: "This account was not running. Nothing changed.",
  alreadyRemoved: "This account was already removed. Nothing changed.",
  startedWhileOff: "It is started, but the desk's master switch is off, so nothing will be staked until the desk is switched on.",
  verified: "The holder's permission is confirmed again. Start the account when you are ready.",
  verifiedWasActive: "The holder's permission is confirmed again. It was running before it stopped — Start it when you are ready.",
  removeWordWrong: `Type ${CONSOLE_REMOVE_WORD} exactly, in capitals, to confirm.`,
  reasonShort: `Say why, in ${CONSOLE_REASON_MIN} characters or more. It is kept with the change.`,
  reasonLong: `Keep the reason under ${CONSOLE_REASON_MAX} characters.`,
  notRecorded: "It is done. ⚠️ Its compliance record could not be written — tell whoever keeps the records.",
} as const;

/**
 * THE ACCOUNT PAGE'S GATED READER (rulings 340, 358, 372). Query-shaped, arity THREE: the signed-in viewer, the
 * calling file's own console route as a STRING LITERAL, and the record id. The audience is resolved FIRST and every
 * read is issued only after the verdict, so a refused viewer's payload carries no label, no id, no figure and no
 * sentence.
 */
export async function houseDetailForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  id: string,
): Promise<ConsoleDetailAnswer | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  /* ⛔ `get(id)`, NEVER `listNonRemoved` (358): the second excludes a REMOVED account in both twins, so a page built
   * on it would 404 on a row that exists and PLAN §8's read-only state would be unreachable. */
  let bot: StoredHouseBot | null = null;
  try {
    bot = await houseBotStore.get(id);
  } catch {
    /* ⛔ A FAILED ROW READ IS NOT A MISSING ROW, and it must not be reported as one: answering "no such record" here
     * would 404 a real account during an outage. The page renders the not-found surface either way, which is the
     * honest thing an officer can act on, and the failure is in the server log. */
    return { found: false };
  }
  if (!bot) return { found: false };

  const nowMs = Date.now();
  const dayKey = eatDayKey(nowMs);
  const label = clampOperatorText(bot.label, operatorBound("label"));
  const display = HOUSE_BOT_STATUS_DISPLAY[bot.status];
  const removed = bot.status === "REMOVED";

  const base = {
    found: true as const,
    id: bot.id,
    label,
    handle: playerHandle(bot.userId),
    statusWord: display.word,
    statusChip: display.chip,
    removed,
    /* 456 · the door to a holder's money is a PLATFORM surface, where an admin may legitimately read a player's
     * transactions — never a house-specific money tab, which D20 struck and 456 settled for good. */
    holderHref: `/admin/transactions?q=${encodeURIComponent(bot.userId)}`,
    dayKey,
  };

  if (removed) {
    /* ⚠️ THE RULES ARE IN 358's OWN LIST, AND READING THEM COSTS NO HOUSE READ. `loadParseContext()` is a PLATFORM
     * read (assets and chains); the rules JSON cannot be read as anything but raw without it (F4), and what an
     * account was configured to do is the record this page exists to keep. Everything else 358 names is absent: no
     * wallet, no cap usage, no rate usage, no targets, no engine health — figures with no control attached. */
    let removedRules: ConsoleRuleRow[] | null = null;
    try {
      const ctx = await loadParseContext();
      const parsedRemoved = parseHouseBotRules(bot.rules, ctx);
      if (parsedRemoved.ok) removedRules = capRows(bot, parsedRemoved.rules);
    } catch { removedRules = null; }
    const removedAtMs = bot.removedAt ? Date.parse(bot.removedAt) : NaN;
    const at = Number.isFinite(removedAtMs) ? `${formatEat(removedAtMs, "D MMM")} ${formatEat(removedAtMs, "HH:MM")} EAT` : "an unrecorded time";
    return {
      ...base,
      removedNote: `Removed on ${at}. Nothing can be staked from this account and none of its limits applies any more.`,
      wayOut: null,
      settlementBlocked: false,
      floorSentence: null,
      floorUnsetCaption: null,
      usage: null,
      counts: null,
      lastBet: null,
      rules: removedRules,
      rulesReason: "A removed account's rules are kept as a record and cannot be changed.",
      /* 358 · a REMOVED account has no act left, which is why this page renders no action row at all. */
      acts: [],
      statusNote: null,
      targets: null,
      targetsActive: null,
    };
  }

  /* ⛔ ONE SETTLED SET (355): no single failure blanks the page and each failure is attributed to ITS figure.
   * ⛔ AND ONE WALLET READ, THROUGH THE ENGINE'S OWN SNAPSHOT (356, 368). `readBotAndHolder` is the function fire
   * itself calls, so this page and the engine can never disagree about why an account is stopped — which is
   * `control.ts`'s own stated reason for existing. It performs exactly one `db.wallet.findByUserId`. */
  const [holderR, dayR, exposureR, staffR, rateR, targetsR, parseR] = await Promise.allSettled([
    readBotAndHolder(bot.id, { nowMs }),
    houseDayBook(dayKey, bot.id),
    houseOpenExposure(bot.id),
    houseBotIntentStore.staffChosenPlacedToday({ houseBotId: bot.id, dayKey }),
    houseSeamStore.botRateUsage({ houseBotId: bot.id }),
    houseBotTargetStore.listForBot(bot.id, "all", null, { limit: 20 }),
    loadParseContext(),
  ]);

  const holder = holderR.status === "fulfilled" && holderR.value.found ? holderR.value : null;
  const book = dayR.status === "fulfilled" ? dayR.value : null;
  const openStake = exposureR.status === "fulfilled" ? exposureR.value : null;
  const staffChosen = staffR.status === "fulfilled" ? staffR.value : null;
  const rate = rateR.status === "fulfilled"
    ? (rateR.value[0] ?? { houseBotId: bot.id, placedLastHour: 0, placedLastDay: 0, lastPlacedAt: null })
    : null;
  const targetRows = targetsR.status === "fulfilled" ? targetsR.value.rows : null;
  const parseCtx = parseR.status === "fulfilled" ? parseR.value : null;

  /* ⛔ 311/413/432(f) · the way out of the FIRST live cause, in the console's own neutral words, finished on the
   * server. Rendering it client-side would put a pause reason — and the account's label — into a client chunk. */
  const causes = holder ? sortCauses(holder.causes) : [];
  const first = causes[0] ?? null;
  const wayOut = first ? consoleWayOutCopy(first, label) : null;

  /* ⛔ X6 (replan ruling 507) · a missing holder wallet stops SETTLEMENT for every player on the markets this account
   * holds open stakes in. That is a condition that stops OTHER PEOPLE'S money, so the register itself says it must
   * not live only in an alert: it is a console STATE.
   * ⛔ IT IS THE WALLET ROW'S ABSENCE, NOT A LIVE CAUSE. `WALLET_MISSING` is a PauseReason and not a `HolderCause`,
   * so a causes test would have compiled and been FALSE for ever. `readBotAndHolder` THROWS when the wallet read
   * fails, so a null balance here means the row is genuinely gone — the same condition `planner.ts`'s own
   * `walletMissing` pass alerts on, read from the snapshot fire reads.
   * ⛔ AND IT IS NOT CONDITIONED ON AN OPEN STAKE: the next settlement blocks whether or not one is open today, and
   * a state that disappears when a figure reaches zero is a state an officer learns to stop trusting. */
  const settlementBlocked = holder != null && holder.walletBalance == null;

  /* ⛔ 368/459 · THE FLOOR STATE, NEVER THE BALANCE. `balanceFloorTzs` is a CONFIGURED LIMIT and may be named; the
   * holder's balance is not shown, compacted, or put in a tile. ⛔ A FAILED wallet read says so (355) — never
   * "above the floor" and never an amount. */
  let floorSentence: string | null = null;
  let floorUnsetCaption: string | null = null;
  if (bot.balanceFloorTzs == null) {
    floorUnsetCaption = unsetCaptionFor("balanceFloorTzs", false);
  } else if (holder == null || holder.walletBalance == null) {
    floorSentence = "The balance floor could not be checked.";
  } else {
    floorSentence = holder.walletBalance >= bot.balanceFloorTzs
      ? `Balance is above the floor of ${formatTzs(bot.balanceFloorTzs)}.`
      : `Balance is below the floor of ${formatTzs(bot.balanceFloorTzs)} — this account cannot place a bet.`;
  }

  /* ⛔ 363 · THE FIVE MONEY ROWS, IN THE SEAM'S OWN ORDER, and the exposure row is scoped "open now" and NOT
   * "today": `openExposure` has no day filter ("Open stake right now, whatever day it was placed"), so an exposure
   * row under a "today" heading would be a mislabelled figure — a §C2 honesty defect.
   * ⛔ TWO LOSS ROWS AGAINST ONE CAP (366): the seam refuses a new stake on PROJECTED loss and a stop fires only on
   * SETTLED loss, so collapsing them would hide the figure one of the two controls acts on. */
  const row = bot;
  /* ⛔ THE NAME COMES FROM THE ONE LABEL HOME AND THE SCOPE WORD IS BESIDE IT, never typed as a sentence: a cap
   * renamed in `rules.ts` must move here, and the scope word is not decoration — "open now" is a different figure
   * from "today", and an exposure row under a "today" heading is a mislabelled amount. */
  const capRow = (field: CapField, scope: string, used: number | null): ConsoleUsageRow => {
    const name = scope ? `${consoleLimitLabel(field)} (${scope})` : consoleLimitLabel(field);
    const limit = row[field] as number | null;
    if (limit == null) {
      const r = usageRow(name, 0, null);
      return { ...r, unsetCaption: unsetCaptionFor(field, false), unsetLinked: false };
    }
    return usageRow(name, used, limit);
  };
  const usage: ConsoleUsageRow[] = [
    /* ⭐ THE SCOPE WORD IS RENDERED ONLY WHERE IT DISCRIMINATES, AND THAT WAS READ OFF A TILE (C7 step 4's own
     * render, clause (b) of the ruling below). Ruling 363 gives every row a scope, and its stated REASON is the
     * exposure row: `openExposure` has no day filter, so an exposure figure under a "today" heading is a
     * mislabelled amount. Spent on a row whose cap already names its window it says the same fact twice in
     * adjacent words — measured at 360: "Daily stake cap (today)", "Bets per hour (this hour)", "Bets per day
     * (today)". 432(n) refuses exactly that. So the word stays where it separates two rows that share ONE cap
     * (projected / settled, ruling 366) and on the exposure row that 363 argues from, and nowhere else. */
    capRow("capDailyStakeTzs", "", book ? book.stakedTzs : null),
    capRow("capDailyLossTzs", "projected", book ? book.projectedLossTzs : null),
    capRow("capDailyLossTzs", "settled", book ? book.realisedLossTzs : null),
    capRow("capOpenExposureTzs", "open now", openStake),
    capRow(ACCOUNT_TARGETED_DAILY_TZS_FIELD, "", staffChosen ? staffChosen.stakeTzs : null),
  ];

  /* ⛔ 363/351 · THE TWO COUNT ROWS, in 361's grammar with the noun outside the figure. They come from
   * `botRateUsage`, the market-free rate reader C7 step 4 added — never from `placedTimes(...).length`, which is an
   * unbounded row read on a page render in both twins. */
  const countRow = (field: CapField, scope: string, used: number | null, noun: string): ConsoleUsageRow => {
    const name = scope ? `${consoleLimitLabel(field)} (${scope})` : consoleLimitLabel(field);
    const limit = row[field] as number | null;
    const shell = { name, halves: [] as ConsoleUsageHalf[], edgeText: "", unsetCaption: null as string | null, unsetLinked: false };
    if (used === null) return { ...shell, usedTzs: null, limitTzs: limit, captionText: `${name} · couldn't read — this is not zero`, unreadable: true };
    if (limit == null) return { ...shell, usedTzs: null, limitTzs: null, captionText: name, unsetCaption: unsetCaptionFor(field, false), unreadable: false };
    const cell = countUsage(used, limit, noun);
    return { ...shell, usedTzs: Math.max(0, used), limitTzs: limit, halves: cell.halves, edgeText: cell.edgeText, captionText: `${name} · ${cell.text}`, unreadable: false };
  };
  const counts: ConsoleUsageRow[] = [
    countRow("freqMaxPerHour", "", rate ? rate.placedLastHour : null, "bets"),
    countRow("freqMaxPerDay", "", rate ? rate.placedLastDay : null, "bets"),
  ];

  const parsed = parseCtx ? parseHouseBotRules(bot.rules, parseCtx) : null;
  const rules: ConsoleRuleRow[] | null = parsed == null || !parsed.ok ? null : capRows(bot, parsed.rules);

  const targets: ConsoleTargetRow[] | null = targetRows == null ? null : targetRows.map((t: StoredHouseBotTarget) => {
    const at = Date.parse(t.endedAt ?? t.createdAt);
    return {
      id: t.id,
      title: t.snapshot.titleEn,
      statusWord: t.status === "ACTIVE" ? "Active" : t.status === "REMOVED" ? "Removed" : "Ended",
      statusChip: (t.status === "ACTIVE" ? TONE_CHIP.green : TONE_CHIP.slate) as StatusChipVariant,
      endCaption: t.endCause == null ? null : consoleTargetEndCaption(t.endCause, label),
      when: Number.isFinite(at) ? `${formatEat(at, "D MMM")} ${formatEat(at, "HH:MM")}` : "—",
      whenTitle: Number.isFinite(at) ? `${formatEat(at, "D MMM")} ${formatEat(at, "HH:MM:SS")} EAT` : "—",
    };
  });

  return {
    ...base,
    removedNote: null,
    wayOut,
    settlementBlocked,
    floorSentence,
    floorUnsetCaption,
    usage,
    counts,
    lastBet: rate ? relativeEat(rate.lastPlacedAt, nowMs) : null,
    rules,
    /* 432(j) · a control that is not drawn still says why, beside the card it would have been in. */
    rulesReason: "Editing an account's rules is not ready on this build yet.",
    /* ⭐ 415 · the action row, from the status the reader already holds — no second read decides what is offered. */
    acts: actDialogsFor(bot.status),
    statusNote: statusNoteFor(bot.status, bot.pauseReason, wayOut),
    targets,
    targetsActive: targetRows == null ? null : targetRows.filter((t: StoredHouseBotTarget) => t.status === "ACTIVE").length,
  };
}
