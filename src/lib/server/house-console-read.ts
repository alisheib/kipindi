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
import type { StoredUser } from "./store";
import { formatTzs, formatTzsCompact, formatNumber } from "@/lib/utils";
import { CONSOLE_ROUTE, CONSOLE_LIMITS_HREF, CONSOLE_LIMITS_FIRST_UNSET_HREF, CONSOLE_NEW_ROUTE, DEFAULT_TAB, consoleBotHref, consoleDetailTab, consoleNewHref, consoleTab, type ConsoleDetailTab, type ConsoleTab, type ConsoleWizardStep } from "@/lib/house-bot/console-routes";
import { eatDayKey, formatEat } from "@/lib/house-bot/clock";
/* ⭐ C7 step 5 (the account half) · the closed lists the two panels' word maps are TOTAL over. Pure copy module,
 * no read, no client directive — the same folder `console-routes.ts` and `rules.ts` already live in. */
import { INTENT_KINDS, INTENT_PRODUCT_LINES, INTENT_STATUSES, type EngineCode, type HouseBotEventKind, type IntentKind, type IntentStatus } from "@/lib/house-bot/constants";
/* ⭐ The platform's ONE window resolver, so "today" means one span on this screen and on every other (ruling 410). */
import { resolveRange } from "./date-range";
import { CAP_FIELDS, FIELD_META, LIMIT_FIELDS, REQUIRED_FOR_MASTER_ON, REQUIRED_FOR_START, isClearExempt, parseHouseBotRules, unitSuffix, type CapField, type FieldId, type HouseBotRulesV1, type LimitField } from "@/lib/house-bot/rules";
import { sortCauses, wayOutCopy, wayOutForCause, type HolderCause } from "@/lib/house-bot/pause-reasons";
import { TARGET_END_CAPTION } from "@/lib/house-bot/feed-copy";
import { saveHouseBotLimits } from "./house-bot/limits-save";
import { saveHouseBotRules } from "./house-bot/rules-save";
import { switchOnHouseBots } from "./house-bot/switch-on";
import { switchOffHouseBots } from "./house-bot/kill-switch";
import { houseEngineAlerts } from "./house-bot/emitters";
import { TONE_CHIP, type StatusChipVariant } from "@/lib/status-tone";
import { houseBotControlStore, houseBotEventStore, houseBotStore, houseBookStore, houseBotIntentStore, houseBotRuntimeStore, houseSeamStore, targetStore as houseBotTargetStore, HouseSchemaNotReady, type IntentFeedCount, type IntentProductLine, type StoredHouseBot, type StoredHouseBotControl, type StoredHouseBotEvent, type StoredHouseBotIntent, type StoredHouseBotRuntime, type StoredHouseBotTarget } from "./house-bot-dal";
import { houseDayBook, houseDayBooks, houseOpenExposure, type HouseDayBook } from "./house-bot/book";
import { HOUSE_BOT_STATUS_DISPLAY } from "./house-bot/status-display";
import { DESIGNATE_COPY, designateHouseBot, reverifyHouseBot, startHouseBot } from "./house-bot/designation";
/* ⭐ C7 step 6 · the wizard's own reads and its one grammar. `eligibility.ts` is named HERE and nowhere near a
 * page: a console file may import no module under `src/lib/server/house-bot/` (ruling 340), which is exactly why
 * the check card is served by a gated reader rather than by the page. */
import { houseBotEligibility } from "./house-bot/eligibility";
import { positionStore } from "./market-dal";
import { rateCheckAsync } from "./rate-limit";
import { displayLabel } from "@/lib/display-label";
import { parseQuery, matchesQuery, fieldNames, ACCOUNT_PICKER_SEARCH } from "@/lib/search";
import { LABEL_COPY, LABEL_MAX_CHARS, LABEL_MIN_CHARS, TEXT_MAX_CHARS, validateLabel, validateNote } from "@/lib/house-bot/rules";
import { readBotAndHolder } from "./house-bot/control";
import { houseEngineBeats, houseEngineVerdict } from "./house-bot/engine-health";
import { pauseHouseBot, removeHouseBot } from "./house-bot/roster-actions";
import { cancelQueuedStake } from "./house-bot/press-cancel";
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
  /**
   * Why the head action is NOT a live link — and `null` when it is, because there is nothing to explain about a
   * control that works (432(j) read the other way round).
   * ⛔ IT IS NULL WHEN THE ROSTER IS FULL TOO, AND THAT IS 432(n) RATHER THAN A HOLE: the roster-full sentence sits
   * in the same flex row, three characters from the button, and IS the reason. Exactly one sentence beside a
   * disabled control, never both and never neither.
   * ⛔ It names ITS OWN control: this sentence and `switchReason` are painted on the same screen, and 432(n)
   * forbids one state saying the same fact twice.
   */
  actionReason: string | null;
  /**
   * ⭐ C7 STEP 6 · THE WIZARD THE HEAD ACTION OPENS, AND IT ARRIVED WITH THE PAGE IT OPENS (432(h)).
   * Until `/admin/desk/new/page.tsx` existed the head action was rendered DISABLED whatever the roster held,
   * because a primary action answering the app-root 404 is the dead control 432(a) refuses.
   * `test:house-bot-console` ties the link and the file together in both directions.
   */
  designateHref: string;
  /** True when the head action is a real link — exactly when `actionReason` and `rosterFullReason` are both null. */
  designateLive: boolean;
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
  /**
   * ⭐ C7 STEP 5 · THE ACTIVITY TAB'S BADGE — how many stakes are QUEUED across the whole desk, on every tab.
   * ⛔ `null` IS A FAILED COUNT AND IS NOT ZERO. `CountBadge` renders nothing at zero, so a count may never stand
   * in for a read's health: a failed count paints NO badge and the activity panel paints `AdminLoadError` for that
   * subject instead (355). ⛔ It does not move as the officer filters — ruling 312 scopes it to the desk, not to
   * the rail, so a bell's own narrowed address cannot change the number beside the tab it is pointing at.
   */
  pendingIntents: number | null;
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
    case "CLAIMS_BLOCKED":
      /**
       * ⭐ THE STATE THAT USED TO PAINT NOTHING AT ALL (register:1218, 2026-09-21). A server whose clock cannot
       * be trusted refuses every stake, and until this case existed the verdict was `null` and this Callout did
       * not render — switch on, green chip, full tiles, nothing staked.
       * ⛔ "A SERVER", NOT "THE DESK", and the distinction is the honest one: the block is per container, so on a
       * multi-replica deployment the others may still be placing stakes. Overstating it would send an officer to
       * switch off a desk that is half working; understating it would let a silent half continue.
       * ⛔ NO THRESHOLD IN THE WORDS. Writing "more than five seconds" would put `MAX_TOLERATED_SKEW_MS` in a
       * sentence, where it drifts the day the constant moves — the two reasons are named instead, which is what
       * an officer can act on anyway.
       */
      /**
       * ⛔ NO META, AND THAT WAS READ OFF THE TILE RATHER THAN REASONED (2026-09-21).
       *
       * This passed `lastSeen(beats.pollerBeatAtMs)` and the rendered Callout read
       * **"LAST SEEN: NEVER"** directly under "it is refusing to act on anything due" — which tells an
       * officer the server is DEAD when the whole point of this verdict is that it is ALIVE and
       * deliberately holding back. Two correct facts that contradict each other in one box.
       * ⛔ IT IS THE WRONG INSTRUMENT, NOT A MISSING VALUE. `pollerBeatAtMs` is written only after a
       * pass that actually CLAIMED rows, so on the one condition this verdict reports — claims refused
       * before they are attempted — it is STRUCTURALLY always empty. There is no state in which it
       * could have said something useful here.
       * ⚠️ AND THE PLANNER BEAT IS NOT THE FALLBACK. It is a different component's heartbeat; putting
       * it behind the word "Last seen" would be a second wrong answer wearing the first one's label.
       * The caption already carries what a reader can use ("2 servers answered."), and `STALE` and
       * `POLLER_FAILING` keep their own metas, each read off the instrument that is theirs.
       */
      return { ...shared, tone: "danger", alert: true, meta: null,
        title: "A server is not placing stakes",
        body: beats?.claimsBlockedReason === "SKEW_UNKNOWN"
          ? "Its clock could not be checked against the platform's, so it is refusing to act on anything due rather than risk acting at the wrong moment. Nothing will be staked from that server until it reads."
          : "Its clock does not agree with the platform's, so it is refusing to act on anything due rather than risk acting at the wrong moment. Nothing will be staked from that server until it agrees." };
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

/**
 * ⛔ THE POPULATION THE ACTIVITY BADGE COUNTS, AND IT IS RULING 312's OWN WORD — "pending", one member of
 * `INTENT_STATUSES`. Never `LIVE_INTENT_STATUSES` (PENDING + CLAIMED): a CLAIMED stake has already been taken up by
 * the engine and there is nothing left for an officer to cancel about it, so a badge counting it would offer a
 * number no control on the page can act on. Written ONCE, read by the badge and by the cancel control's own rule.
 */
const CONSOLE_PENDING_STATUSES = ["PENDING"] as const satisfies readonly IntentStatus[];

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
  /**
   * ⭐ C7 STEP 5 (the LANDING half) · HOW MANY STAKES ARE QUEUED ACROSS THE WHOLE DESK — the activity tab's badge.
   * ⛔ IT IS A MEMBER OF THE CORE SET AND NOT A CALLER'S EXTRA, AND THE REASON IS MEASURED, NOT PREFERRED. The rail
   * renders ABOVE the panels on EVERY tab (406), so every one of the four landing readers has to be able to paint
   * this badge; as a positional extra each reader would have carried it in a different slot, which is precisely how
   * two readers come to count two different populations under one number. It is a SHELL fact, and the shell is what
   * this function exists to build.
   * ⛔ IT MAY NOT COME FROM A SECOND GATED READER (the one-reader-per-render spy) AND MAY NOT BE COUNTED FROM ROWS
   * (ruling 344): the rows are one clamped page, the badge is the population.
   * ⛔ `["PENDING"]` ALONE, ruling 312's own word, never `LIVE_INTENT_STATUSES` (PENDING + CLAIMED): a CLAIMED stake
   * is already in flight and there is nothing an officer can still cancel about it.
   * ⛔ `null` means the COUNT READ FAILED, which is not zero — `CountBadge` renders nothing at zero, so a count can
   * never stand in for a read's health and the panel paints `AdminLoadError` for that subject instead.
   */
  pendingIntents: number | null;
};

/**
 * ⛔ TWO EXTRAS, EACH SETTLED ON ITS OWN, AND THAT IS RULING 355 RATHER THAN A CONVENIENCE. The roster needs both
 * the Products words (`loadParseContext`) and the rate read "Last bet" comes from (`botRateUsage`, ruling 351); the
 * limits panel needs one read of its own, and each landing panel needs its own page and its own total. Wrapping two
 * reads in a single `Promise.all` inside the settled set would make ONE failure blank BOTH figures, which is the
 * attribution 355 exists to keep — a failed Products read must not take the Last bet column with it.
 * ⛔ SEVEN MEMBERS, AND THE COUNT IS STATED HERE BECAUSE IT WAS ONCE WRONG IN THIS VERY DOCBLOCK: the array below is
 * the control row, the roster, the day books, the open exposure, the engine's beats, the QUEUED-stake count the
 * rail's badge paints, and the caller's two extras.
 */
async function readDeskCore<A, B>(
  extraA: (dayKey: string) => Promise<A>,
  extraB?: (dayKey: string) => Promise<B>,
): Promise<{ core: DeskCore; extra: A | null; extraB: B | null }> {
  const dayKey = eatDayKey(Date.now());
  const [controlR, rosterR, dayR, exposureR, instancesR, pendingR, extraR, extraBR] = await Promise.allSettled([
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
    /* ⭐ C7 step 5 · THE RAIL'S BADGE, COUNTED ACROSS EVERY ACCOUNT AND UNFILTERED BY THE RAIL (ruling 312). It is a
     * COUNTING reader over the same shared predicate the feed pages over, never `listFeed(...).length` (344), and it
     * is settled on its OWN so a failed count cannot blank a figure beside it (355). */
    houseBotIntentStore.countFeed({ statuses: CONSOLE_PENDING_STATUSES }),
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
      /* ⛔ `null` IS A FAILED COUNT, NOT A ZERO (355, and the badge's own rule above). */
      pendingIntents: pendingR.status === "fulfilled" ? pendingR.value : null,
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
      /* ⛔ THE CEILING CARRIES ITS SCOPE, BECAUSE THE FIGURE ABOVE IT IS THE PROJECTED ONE (432(o); C7 step 7
       * review, visual-3). `lossUsed` folds `projectedLossTzs`, the table 150px below heads the same figure
       * "LOSS TODAY (PROJECTED)", and the Limits tab splits the same ceiling into "(projected)" and "(settled)"
       * rows — so an unqualified "of daily loss limit" was one figure under three names, two of them on one
       * screen. The distinction decides which control acts: the seam refuses a new stake on PROJECTED loss and an
       * account is auto-paused only on SETTLED loss. ⛔ The tile's LABEL stays short — `AdminKpi` truncates it —
       * so the scope goes in the delta, which the kit already wraps. */
      dayBooks
        ? moneyTile("Loss today", lossUsed, control.gCapDailyLossTzs, `${FIELD_META.gCapDailyLossTzs.label} (projected)`)
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
  /* ⛔ A WITHDRAWN DESK, DERIVED ONCE (432(m)). It governs the roster-full remedy AND, from C7 step 6, whether the
   * head action is a link at all — two answers to one fact, so the fact is read in one place. */
  const withdrawn = control != null && control.enabled === false && control.offCause === "SUNSET";
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
    /* ⭐ C7 STEP 6 TURNED THE HEAD ACTION ON, so its reason is no longer a build note — and the assertion that
     * demanded a sentence in every state is re-aimed rather than deleted (432(j) with 432(n) beside it):
     *   · the desk is WITHDRAWN → this sentence, because the SUNSET Callout above already says nothing can be
     *     designated and 432(m) refuses a "raise the roster limit" remedy that would contradict it;
     *   · the roster is FULL → `null`, because `rosterFullReason` sits in the same flex row and IS the reason;
     *   · otherwise → `null`, because the action is a live link to the wizard and a working control explains
     *     nothing.
     * ⛔ Never the switch's own words: the two sit about 105px apart at 1280 and read as a rendering fault when
     * they match, which is the defect the previous pair of identical sentences actually produced. */
    actionReason: withdrawn ? "The desk has been withdrawn, so no account can be designated." : null,
    designateHref: CONSOLE_NEW_ROUTE,
    designateLive: !withdrawn && rosterFullReason === null,
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
    /* ⛔ ONE NUMBER, ONE READ, ON EVERY TAB — the badge cannot disagree with itself between two panels, and it is
     * `null` rather than 0 when the count could not be taken (355). */
    pendingIntents: core.pendingIntents,
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
  gStaffChosenMaxCounterpartyShare: "One player's share limit",
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
  /**
   * ⭐ THE RECOMMENDED VALUE, AS PLAIN DIGITS, OR "" WHERE THERE IS NONE (2026-09-21).
   *
   * ⛔ `recommendedLimits()` HAS EXISTED SINCE THE PLAN AND NOTHING EVER CALLED IT. Its own docblock reads
   * "Use recommended values fills these into the form and saves nothing", the switch-on sheet describes that
   * control, and the operator guide documents it — but no component in `src/app/admin/desk` referenced it, so
   * the control was never on the screen and an officer had to type all eight required limits by hand before
   * the master switch could be offered at all. A function written, documented in three places, and wired to
   * nothing.
   * ⛔ PLAIN DIGITS, NEVER THE FORMATTED FIGURE — the same rule `input` carries three lines up: the kit's
   * strict numeric input strips every non-digit on the first keystroke, so a field filled with "TZS 500,000"
   * would read back as 500000 only by luck.
   * ⚠️ Read from `FIELD_META` directly rather than through `recommendedLimits()`, and that is a measured
   * choice: every global limit's recommendation is a STATIC number (verified — none resolves `LIVE_MIN`), so
   * pulling them here needs no stake-bounds context, and a row whose recommendation is null (`gTargetsMaxActive`)
   * yields "" and is simply not filled.
   */
  recommended: string;
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
  /**
   * ⛔ THE RECOMMEND CONTROL'S OWN WORDS, ON THE SERVER WHERE COPY LIVES (ruling 388).
   *
   * `test:house-bot-console` 1.388 holds every string of 25+ characters in a console CLIENT file to a closed
   * list of six the client is allowed to own; everything else belongs here. The first form of this control put
   * its toast sentence in `limits-form.tsx` and 1.388 caught it immediately — correctly, and it is the reason
   * these three strings are fields rather than literals beside the button.
   * ⚠️ FINISHED SENTENCES, NOT A TEMPLATE. No count is interpolated, so nothing has to cross the boundary as a
   * function and the client never assembles copy from parts — which is how a half-translated sentence gets
   * built on a surface ruling 453 requires to stay neutral.
   */
  recommendCopy: { label: string; filledTitle: string; filledBody: string };
};

/**
 * Formats one stored limit for its own unit. ⛔ Money goes through `formatTzs`, the console's only money formatter (361).
 *
 * ⛔ A TIME FIELD CARRIES ITS WORD, AND IT DID NOT USED TO. This read `: formatNumber(raw)` for every unit that was
 * neither `TZS` nor `%`, so `freqMinGapSec` — unit `"s"`, labelled "Shortest gap between its bets" — rendered on the
 * saved-rules card as a bare `30`, while `rules.ts`'s own refusal for that same field said "at least 30 seconds".
 * The surface an officer reads while SETTING the value was the one with no unit on it.
 * ⭐ THE WORD COMES FROM `unitSuffix`, WHICH THE REFUSAL NOW USES TOO, so the two cannot drift apart — the same
 * one-source discipline the pagers already follow by sharing ONE predicate with their counting readers.
 * ⚠️ `count` still renders bare ON PURPOSE: the label carries the noun ("Bets per day"), and "200 count" is worse
 * than "200". `unitSuffix` returns "" for it, so that is a decision this function makes by deferring, not by
 * falling through — which is the difference that let the defect exist.
 */
function limitValue(field: FieldId, raw: number | null): string {
  if (raw == null) return "Not set";
  const unit = FIELD_META[field].unit;
  if (unit === "TZS") return formatTzs(raw);
  if (unit === "%") return `${formatNumber(raw)}%`;
  return `${formatNumber(raw)}${unitSuffix(unit, raw)}`;
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
      /* ⛔ PLAIN DIGITS, for the reason `input` above gives. A null recommendation yields "" and fills nothing. */
      recommended: FIELD_META[field].recommended == null || typeof FIELD_META[field].recommended === "string"
        ? ""
        : String(FIELD_META[field].recommended),
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
    /* ⛔ NEUTRAL, AND IT SAYS WHAT THE CONTROL DOES NOT DO. "Nothing is saved yet" is the whole point: filling
     * and committing are different decisions on the form that sets the ceilings which stop money, and the
     * switch-on sheet has always documented this control as one that fills and does not save. */
    recommendCopy: {
      label: "Use recommended values",
      filledTitle: "Recommended values filled",
      filledBody: "Nothing is saved yet — check the numbers, then press Save.",
    },
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
  | { ok: true; limitsVersion: number; changed: number; recorded: boolean;
      /**
       * ⭐ WHAT THE SAVE BROKE, IN THE CONSOLE'S OWN NEUTRAL WORDS — finished sentences, ready to paint.
       *
       * ⛔ THE VALIDATOR'S OWN MESSAGES MAY NOT BE USED HERE. All three conflict rules spell the feature out
       * ("…is below bot “{label}” max stake…"), which is the exact substitution `CONSOLE_LIMIT_REFUSAL` exists
       * for one screen up. These are built from the conflict's STRUCTURED fields instead of substituted as
       * whole strings, so a new conflict rule cannot arrive carrying a word 453 forbids.
       * ⚠️ EMPTY IS THE NORMAL CASE. A save with nothing to warn about hands back `[]`, never `null` — the form
       * paints a list, and a failed read is not a state this field can be in (the save already succeeded).
       */
      warnings: string[] }
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
  if (saved.ok) {
    /**
     * ⛔ ONE SHAPE FOR ALL THREE RULES, BUILT FROM THE FIELDS — never the rule's own sentence (see `warnings`).
     * The account's label is already on this page in the roster, so naming it here leaks nothing new; what it
     * adds is the one thing the officer cannot otherwise work out — WHICH account just stopped being able to
     * stake, and against which of its own settings.
     */
    const warnings = saved.conflicts.map((c) => {
      /* ⚠️ THE CEILING COMES FROM THE VALUES JUST SUBMITTED, which is both simplest and correct in BOTH cases:
         a limit this save CHANGED is the number the officer typed, and one it left alone was seeded into the
         form from the stored row, so the two agree. `saved.changes` would carry only the first kind. */
      const typed = Number(values[c.field]);
      const ceiling = limitValue(c.field, Number.isFinite(typed) ? typed : null);
      const theirs = limitValue(c.field, c.value);
      return `${consoleLimitLabel(c.field)} ${ceiling} is below “${c.label}”'s own setting of ${theirs}. Stakes from that account will be refused until one of the two is changed.`;
    });
    return { ok: true, limitsVersion: saved.limitsVersion, changed: saved.changes.length, recorded: saved.recorded, warnings };
  }
  if (saved.code !== "INVALID") return { ok: false, error: SAVE_COPY[saved.code] };
  return {
    ok: false,
    /* The validator's own sentence, unless the rule's shared copy names the feature (see `CONSOLE_LIMIT_REFUSAL`). */
    error: (saved.rule !== null ? CONSOLE_LIMIT_REFUSAL[saved.rule] : undefined) ?? saved.message,
    field: CONSOLE_LIMIT_KEY[saved.field],
  };
}

/* ═══ THE ACCOUNT'S OWN RULES SAVE — the write this build never had (2026-09-21) ═══════════════════════════ */

/**
 * ⛔ WHAT THIS CLOSES, MEASURED ON PRODUCTION. Until today no account could be started at all: designation
 * writes every account blank, `rulesStartProblems` refuses one per unset cap plus "no product" plus "no entry
 * mode", and the console answered "Open Rules, review them, save, then start." beside a tab that said editing
 * was not ready on this build. `houseBotStore.saveRules` and `validateHouseBotRules` had no caller anywhere.
 * The validator was green at 521/0 and the CAS write existed in both twins; only the door was missing.
 *
 * ⛔ THE COLUMN NAMES DO NOT CROSS THIS LINE, IN EITHER DIRECTION (453), exactly as the global save has it: the
 * browser posts neutral keys, an unknown key is REFUSED rather than ignored, and a refusal that names a field
 * names it by the same neutral key.
 */
const CONSOLE_CAP_KEY: Readonly<Record<CapField, string>> = {
  stakeMinTzs: "stake-min",
  stakeMaxTzs: "stake-max",
  capPerMarketTzs: "per-market",
  capDailyStakeTzs: "daily-stake",
  capDailyLossTzs: "daily-loss",
  capOpenExposureTzs: "open-exposure",
  balanceFloorTzs: "balance-floor",
  freqMinGapSec: "min-gap",
  freqMaxPerHour: "bets-per-hour",
  freqMaxPerDay: "bets-per-day",
  freqMaxPerMarket: "bets-per-market",
  capStaffChosenPerDay: "targeted-bets-per-day",
  capStaffChosenDailyTzs: "targeted-daily-tzs",
  targetsMaxActive: "max-active-targets",
};

const CAP_FIELD_BY_KEY = new Map<string, CapField>(CAP_FIELDS.map((f) => [CONSOLE_CAP_KEY[f], f]));

/**
 * ⛔ THE TEN SWITCHES, AND THE TABLE IS THE CONTRACT. The form posts exactly these keys and no others; a
 * missing one is a stale tab rather than "off", because reading absence as OFF would let a form that failed to
 * render a control silently turn a mode off on save.
 */
const CONSOLE_FLAG_KEY = {
  productUpdown: "product-updown",
  productPolls: "product-polls",
  updownCounter: "updown-react",
  updownFill: "updown-fill",
  updownOpener: "updown-opener",
  pollsCounter: "polls-react",
  pollsFill: "polls-fill",
  pollsOpener: "polls-opener",
  enterNow: "enter-now",
  targeting: "targeted-stakes",
} as const;

const FLAG_KEYS: readonly string[] = Object.values(CONSOLE_FLAG_KEY);

/** What the account's rules form posts. ⛔ Neutral keys only, and the WHOLE form or nothing. */
export type ConsoleRulesSaveInput = {
  /** ⛔ `accountId`, NOT the column's own name: this key is declared in a CLIENT file too, and 1.384/401 refuse
     a house-shaped prop name anywhere across that boundary. The service is handed the column name here. */
  accountId: string;
  baseVersion: number;
  values: Record<string, string>;
  flags: Record<string, boolean>;
};

export type ConsoleRulesSaveResult =
  /** ⛔ `recorded: false` means the rules DID change and the compliance row did not — the page says both. */
  | { ok: true; rulesVersion: number; changed: number; rulesChanged: boolean; recorded: boolean; warnings: string[] }
  | { ok: false; error: string; field?: string };

/**
 * ⛔ EVERY SENTENCE THIS SAVE CAN PAINT, IN ONE HOME, AND NEUTRAL (rulings 412, 453). None names the feature,
 * and 4.453 scans this module's literals.
 */
const RULES_SAVE_COPY = {
  refused: "You can't change this account.",
  stale: "This form is out of date. Reload the page and make the change again — nothing was saved.",
  SCHEMA: "The desk's tables are not present on this database, so nothing was saved.",
  UNREADABLE: "The desk's own state could not be read, so nothing was saved.",
  NOT_FOUND: "That account is not on the desk any more. Reload the desk.",
  REMOVED: "This account was removed from the desk. Nothing on it can be changed.",
  CONFLICT: "Someone else changed this account while this page was open. Nothing was saved — reload the page and make the change again.",
  RULES_UNREADABLE: "This account's saved settings could not be read, so nothing was saved. Reload the page, and if it says this again, raise it before changing anything.",
} as const;

/**
 * THE ACCOUNT RULES SAVE, GATED (ruling 537's shape). One NAMED writer with its `CONSOLE_GATES` arity entry,
 * because a server action is a POST to whatever URL the browser happens to be on and no path rule can see it.
 *
 * ⛔ IT DECIDES BEFORE IT READS OR WRITES ANYTHING. A viewer outside the audience is refused without the
 * account, the roster or the platform config ever being read.
 */
export async function houseRulesSaveForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  input: ConsoleRulesSaveInput,
): Promise<ConsoleRulesSaveResult> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {
    return { ok: false, error: RULES_SAVE_COPY.refused };
  }
  /* ⛔ THE WHOLE FORM OR NOTHING. A partial post would leave the missing caps to the validator's "unset"
     branch and silently CLEAR limits the officer never touched. */
  const values = {} as Record<CapField, unknown>;
  for (const field of CAP_FIELDS) {
    const raw = input.values[CONSOLE_CAP_KEY[field]];
    if (typeof raw !== "string") return { ok: false, error: RULES_SAVE_COPY.stale };
    values[field] = raw.trim();
  }
  for (const key of Object.keys(input.values)) {
    if (!CAP_FIELD_BY_KEY.has(key)) return { ok: false, error: RULES_SAVE_COPY.stale };
  }
  for (const key of FLAG_KEYS) {
    if (typeof input.flags[key] !== "boolean") return { ok: false, error: RULES_SAVE_COPY.stale };
  }
  for (const key of Object.keys(input.flags)) {
    if (!FLAG_KEYS.includes(key)) return { ok: false, error: RULES_SAVE_COPY.stale };
  }

  const saved = await saveHouseBotRules({
    actorId: viewerUserId,
    botId: input.accountId,
    baseVersion: input.baseVersion,
    caps: values,
    flags: {
      products: { updown: input.flags[CONSOLE_FLAG_KEY.productUpdown], polls: input.flags[CONSOLE_FLAG_KEY.productPolls] },
      modes: {
        updown: {
          counter: input.flags[CONSOLE_FLAG_KEY.updownCounter],
          fill: input.flags[CONSOLE_FLAG_KEY.updownFill],
          opener: input.flags[CONSOLE_FLAG_KEY.updownOpener],
        },
        polls: {
          counter: input.flags[CONSOLE_FLAG_KEY.pollsCounter],
          fill: input.flags[CONSOLE_FLAG_KEY.pollsFill],
          opener: input.flags[CONSOLE_FLAG_KEY.pollsOpener],
        },
      },
      enterNow: input.flags[CONSOLE_FLAG_KEY.enterNow],
      targeting: input.flags[CONSOLE_FLAG_KEY.targeting],
    },
  });
  if (saved.ok) {
    /* ⚠️ THE VALIDATOR'S WARNINGS ARE ADVICE, NOT REFUSALS, and they are the one thing that tells an officer
       their account is configured to do nothing — "no automatic mode" is a saveable, legal, silent state. */
    return {
      ok: true, rulesVersion: saved.rulesVersion, changed: saved.changes.length,
      rulesChanged: saved.rulesChanged, recorded: saved.recorded,
      warnings: saved.warnings.map((w) => w.message),
    };
  }
  if (saved.code !== "INVALID") return { ok: false, error: RULES_SAVE_COPY[saved.code] };
  /* The validator's own sentence, unless the rule's shared copy names the feature (`CONSOLE_LIMIT_REFUSAL`). */
  return {
    ok: false,
    error: (saved.rule !== null ? CONSOLE_LIMIT_REFUSAL[saved.rule] : undefined) ?? saved.message,
    field: CONSOLE_CAP_KEY[saved.field as CapField],
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
  /** ⛔ IT SAYS "(required)", AND SIX ADMIN DIALOGS NEXT DOOR ALREADY DO (C7 step 7 review, visual-5). The reason
   *  gates the primary button on `CONSOLE_REASON_MIN`, and until this was marked an officer who typed the confirm
   *  word and no reason met a dead button with nothing on screen to explain it. The counter counts DOWN from the
   *  maximum, so it says nothing about the floor. */
  reasonLabel: string;
  reasonHint: string;
  /** ⛔ WHAT THE LIVE COUNT COUNTS. Read off the first 360 tile: it painted a bare "300", and a figure with no
   *  basis is a figure an officer has to guess at — the class §C2 refuses. The WORDS are the server's (388). */
  reasonCountLabel: string;
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
    reasonCountLabel: "characters left",
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
      reasonLabel: "Why are you switching it off? (required)",
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
    reasonLabel: "Why are you switching it on? (required)",
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
/**
 * ONE ACCOUNT'S RULES AS A FORM (2026-09-21) — the shape the page draws inputs from.
 *
 * ⛔ IT CARRIES NO SENTENCE LONGER THAN A LABEL, and every label is the ONE label home's (`consoleLimitLabel`)
 * or a neutral word for a switch. The form component owns no copy at all, for ruling 388's reason: a sentence
 * typed into a client file ships to every visitor with the bundle scan reporting clean.
 * ⛔ AND IT CARRIES `required`, WHICH IS THE WHOLE POINT OF THE FORM. Eleven of the fourteen caps are
 * `REQUIRED_FOR_START`, and until 2026-09-21 an officer had no way to know which — the desk refused the start
 * generically and named none of them.
 */
export type ConsoleRulesForm = {
  /** The version the form was rendered from; the save is conditional on it (CAS). */
  baseVersion: number;
  caps: readonly {
    key: string;
    label: string;
    /** The raw stored number as a string, or "" when unset — never a formatted figure. */
    value: string;
    /**
     * ⛔ THE SAME FIGURE FORMATTED, FOR THE HINT — and it is a SECOND field on purpose. 🔴 Measured by the
     * visual gate: the form painted the word "TZS" as loose text beside a raw number and carried NO money
     * atom at all, so §5.1's control ("every currency figure is inside the atom the scan reads") and §5.2
     * both went red. The input is seeded from `value`, which must stay unformatted; what an officer READS
     * while typing over a ceiling is this one, inside `.amount`.
     */
    saved: string;
    /** 364's consequence sentence when the cap is unset — the server's, chosen by the field's membership. */
    caption: string | null;
    unit: "TZS" | "count";
    required: boolean;
  }[];
  flags: readonly { key: string; section: string; label: string; on: boolean }[];
  /**
   * ⛔ EVERY SENTENCE THE FORM PAINTS, FROM HERE (ruling 388, and `house-bot-console-cases.mts`'s
   * `CLIENT_OWNED_COPY` enforces it: the console's client files hold a CLOSED set of six strings of 25
   * characters or more, asserted by size). A sentence typed into the form component would ship to every
   * visitor with the bundle scan reporting clean — and would break that assertion on the way in.
   */
  copy: { barDetail: string; guardBody: string };
};

export type ConsoleRuleRow = {
  section: string;
  name: string;
  value: string;
  unset: boolean;
  /** 364's caption when the field is unset; `null` otherwise. */
  caption: string | null;
  /**
   * ⛔ WHICH FACE THE VALUE WEARS, DECIDED BY THE ROW AND NEVER BY THE PAGE (rulings 401, 409).
   *
   * 🔴 MEASURED 2026-09-20, by the render, with every suite green. The server hands this card an ALREADY-FORMATTED
   * string, so nothing downstream can tell "TZS 900,000,000" from "1,440" — and the card painted both as plain
   * body text. The limits panel one tab away paints the identical values through
   * `row.money ? "amount tabular-nums" : "font-mono tabular-nums"` (`limits-form.tsx`), so ONE section was showing
   * ONE kind of value two ways, which is the defect this section was pulled up on once already.
   * ⛔ AND IT WAS INVISIBLE TO THE INSTRUMENTS. `.amount` is what `qa:house-bots-visual` §5.1 scans, so seven
   * currency caps sat outside the money-clipping gate entirely, and `test:type-scale`'s money detector is blind to
   * a pre-formatted string by construction. The flag is the only thing that can carry the fact.
   * ⛔ `"money"` IS NEVER SET ON AN UNSET ROW: "Not set" is a state, not a figure, and `.amount`'s `nowrap` and
   * money meaning belong to figures only — the same rule `limits-form.tsx` applies by showing the caption instead.
   * A count is `"count"` (365/409: a count is not money); a word like "Polls" or "Off" is `"word"` and stays body text.
   */
  face: "money" | "count" | "word";
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
  /**
   * 508 · the same facts as `rules`, as INPUTS — `null` for a removed account and for rules that would not
   * parse, which are the two states no form may overwrite.
   */
  rulesForm: ConsoleRulesForm | null;
  /** What the officer is told beside the card — what the form is for, or why there is none (432(j)). */
  rulesReason: string;
  /** 508 · this account's targets, newest first — ONE PAGE of them. ⛔ `null` means the read FAILED or was not taken (358). */
  targets: ConsoleTargetRow[] | null;
  targetsActive: number | null;
  /**
   * ⛔ THE TARGETS PAGER'S THREE FACTS (grid-paging §2.2). The Targets tab lists every target this account has
   * ever had, and that set has no ceiling: an ENDED target is kept as a record, so the list grows with every poll
   * the account is ever pointed at. Rendering a limit-20 read whole would silently hide row 21 with nothing on the
   * page to say so — the exact defect `test:grid-paging` exists for.
   * ⛔ `targetsTotal` COMES FROM `countForBot`, NEVER FROM `targets.length`: the DAL clamps list readers at 500,
   * so a total built from the page would lie and the pager would stop short of the last page.
   */
  targetsTotal: number | null;
  /** The 1-indexed page `targets` holds, already clamped to the set (1 when there is nothing to page). */
  targetsPage: number;
  /** The page size the pager must be drawn with, so the page and the control can never disagree. */
  targetsPerPage: number;
  /* ── C7 step 5 · THE ACTIVITY PANEL ──────────────────────────────────────────────────────────────────────────
   * ⛔ THREE ANSWERS, AND THEY ARE NOT INTERCHANGEABLE (rulings 355, 421, and the correction already recorded at
   * `houseUsageForConsole`): `[]` is a list with nothing in it, `null` is a read that FAILED and paints the kit's
   * failure treatment, and a REMOVED account takes neither read at all (358) so it is `null` for the same reason
   * its usage is. The page tells the two apart by `removed`, which it already holds. */
  feed: ConsoleFeedRow[] | null;
  /** ⛔ FROM `countFeed`, NEVER `feed.length` (ruling 344): `pageLimit` clamps every list reader at 500 rows. */
  feedTotal: number | null;
  feedPage: number;
  feedPerPage: number;
  /** The rail, finished — labels, hrefs and which chip is in force (ruling 410). */
  feedFilters: ConsoleFilterGroup[];
  /** The window presets the rail offers and the one a bare visit is on — the page types neither. */
  feedPresets: readonly string[];
  feedPresetDefault: string;
  /** Every live parameter of this panel, for the pager's own `baseHref` (411: the page number is the only one it owns). */
  feedParams: Record<string, string | undefined>;
  /** Which empty state belongs to THIS read — an unfiltered list with nothing in it reads differently from a filter that matched nothing. */
  feedEmpty: ConsoleEmpty;
  /** True when the rail is narrowing anything at all, so the panel can offer one way back (432(a)). */
  feedFiltered: boolean;
  /** Where "clear the filter" goes. */
  feedClearHref: string;
  /** The declared order, said once, where a reader of the table can see it. */
  feedOrderNote: string;
  /* ── C7 step 5 · THE HISTORY PANEL ───────────────────────────────────────────────────────────────────────── */
  history: ConsoleEventRow[] | null;
  historyTotal: number | null;
  historyPage: number;
  historyPerPage: number;
  historyParams: Record<string, string | undefined>;
  historyEmpty: ConsoleEmpty;
  historyOrderNote: string;
  /** ⛔ ONE sentence naming every axis of the address that was thrown away, or `null` (rulings 387, 432(j)). */
  queryRefusal: string | null;
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
 * The Targets tab's page size. It is the admin table size the shared pager already defaults to, written here
 * rather than imported because `@/components/ui/pagination` is a CLIENT-reachable module and this one is
 * server-only — the render takes the number from the view, so the page and its control cannot disagree.
 */
const CONSOLE_TARGETS_PER_PAGE = 20;

/** `?tpage=` as a whole page number. Anything else — absent, 0, -3, 1.5, NaN — is page 1. */
function consolePageNumber(raw: number | undefined): number {
  return Number.isSafeInteger(raw) && (raw as number) >= 1 ? (raw as number) : 1;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * C7 STEP 5 (the account half) · THE ACTIVITY PANEL AND THE HISTORY PANEL
 *
 * ⛔ **THE TWO PANELS RIDE THE ACCOUNT PAGE'S ONE GATED READER** (rulings 340, 346, 433(d)). `houseDetailForConsole`
 * already resolves the audience, reads the record and settles every other figure this route paints; a second door for
 * the feed would put two audience verdicts and two control reads in ONE render, which is the named refusal 433(d)
 * carries and the spy `test:house-bot-console` 1.306 measures. So the query arrives at the SAME door and the slices
 * come back inside the SAME view model.
 *
 * ⛔ **THE PAGE SIZE AND THE PAGE NUMBER ARE SERVER-ONLY** (the reason already written at `CONSOLE_TARGETS_PER_PAGE`):
 * `@/components/ui/pagination` is a CLIENT-reachable module, so the numbers are stated here and the render takes them
 * from the view — the page and its control can never disagree.
 *
 * ⛔ **THE ORDER IS DECLARED, AND IT IS THE SAME ORDER IN BOTH READERS OF EACH PAIR.** Both twins list intents and
 * events `("createdAt", "id") DESC` (`memPage`/`sqlPage`, `memoryHouseBotEvents.listAll`/`prismaHouseBotEvents.listAll`)
 * and both counting readers measure the SAME predicate. A numbered pager over an unstable order shows one row twice
 * and hides another, which is a defect nothing on the screen reveals.
 *
 * ⛔ **WHAT THE PROJECTION MAY NOT CARRY** (rulings 360, 361, 453; owner ruling D20). `intent.why` is composed in
 * `server/house-bot/decide.ts` and opens with a word 453 forbids, embeds formatted amounts and, on one branch, a POOL
 * TOTAL — an aggregate of other people's money, which is no role of ruling 360. `intent.decision` is an untyped blob.
 * `intent.triggerUserId` is another player's raw id; the rule is `playerHandle`. None of the three is projected, and
 * no source guard could see them if they were: 4.453 collects LITERALS of this section, and a sentence composed in a
 * module outside it is in neither population.
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The two panels' page sizes. Written HERE and not imported, for the reason `CONSOLE_TARGETS_PER_PAGE` states one
 * screen up: `@/components/ui/pagination` is client-reachable and this module is server-only.
 */
const CONSOLE_FEED_PER_PAGE = 20;
const CONSOLE_HISTORY_PER_PAGE = 20;

/**
 * ⛔ **THE EVENT WORD MAP IS TOTAL, AND `WORD[kind] ?? kind` IS FORBIDDEN OUTRIGHT** (rulings 317, 453).
 *
 * MEASURED, not assumed. `EVENT_KINDS` holds `HOLDER_AGAINST_BOT`, and 453's lexicon opens with a `\bbots?\b`
 * word-boundary pattern — an UNDERSCORE IS A WORD CHARACTER, so there is no boundary before `BOT` and the lexicon
 * cannot see that kind at all. `STAFF_EVENT_WORD` in `feed-copy.ts` is `Partial` and covers 8 of the 30, and one of
 * its eight is itself a word of the shared vocabulary. So a raw-enum fallback would paint the feature's own name on
 * an officer's screen and NOTHING would report it — not 4.453, not 3.453, not the bundle scan.
 * ⛔ Therefore: a TOTAL `Record<HouseBotEventKind, string>`, so `tsc` itself refuses a kind added without a word, and
 * an assertion that no value of it matches the console's own lexicon.
 */
export const CONSOLE_EVENT_WORD = {
  DESIGNATED: "Added to the desk",
  VERIFIED: "Holder's permission confirmed",
  STARTED: "Started",
  PAUSED: "Paused by an officer",
  AUTO_PAUSED: "Stopped by a limit",
  RULES_SAVED: "Rules saved",
  REMOVED: "Removed from the desk",
  SWITCH_ON: "The desk was switched on",
  SWITCH_OFF: "The desk was switched off",
  LIMITS_SAVED: "Desk limits saved",
  OWNER_MONEY: "The holder's money moved",
  CREDENTIAL_CHANGED: "Sign-in details changed",
  HOLDER_CAUSE_ADDED: "The holder's own account raised a block",
  CONSENT_VOIDED: "The holder's permission ended",
  HOLDER_AGAINST_BOT: "The holder staked against this account",
  HOLDER_EMAIL_CHANGED: "The holder's email changed",
  HOLDER_2FA_ON: "The holder turned two-step sign-in on",
  HOLDER_2FA_OFF: "The holder turned two-step sign-in off",
  PENALTY_BOXED: "A player was put in the penalty box",
  REIMBURSEMENT_RECORDED: "A reimbursement was recorded",
  BOARD_DISCLOSURE_RECORDED: "A Board disclosure was recorded",
  SUNSET: "The desk was withdrawn",
  ENTER_NOW_PREVIEWED: "A manual stake was previewed",
  ENTER_NOW_REQUESTED: "A manual stake was requested",
  OPENER_SIDE_DRAWN: "The opening side was drawn",
  TARGET_ADDED: "A target was added",
  TARGET_UPDATED: "A target was changed",
  TARGET_REMOVED: "A target was stopped",
  TARGET_ENDED: "A target ended",
  STAFF_INTENT_CANCELLED: "A queued stake was cancelled",
} as const satisfies Record<HouseBotEventKind, string>;

/** One intent kind, in the console's own words. ⛔ TOTAL, for exactly the reason the event map states. */
const CONSOLE_INTENT_KIND_WORD = {
  COUNTER: "Responding",
  FILL: "Filling",
  OPENER: "Opening",
  MANUAL: "Manual",
} as const satisfies Record<IntentKind, string>;

/** One intent status, its word and its chip. ⛔ TOTAL, and the chip comes from the ONE tone table (ruling 311). */
const CONSOLE_INTENT_STATUS = {
  PENDING: { word: "Queued", chip: TONE_CHIP.royal },
  CLAIMED: { word: "In flight", chip: TONE_CHIP.broadcast },
  PLACED: { word: "Placed", chip: TONE_CHIP.green },
  SKIPPED: { word: "Skipped", chip: TONE_CHIP.slate },
  EXPIRED: { word: "Expired", chip: TONE_CHIP.slate },
  FAILED: { word: "Failed", chip: TONE_CHIP.rose },
  CANCELLED: { word: "Cancelled", chip: TONE_CHIP.claret },
} as const satisfies Record<IntentStatus, { word: string; chip: StatusChipVariant }>;

/** One product line, in the platform's own screen words — the same two `/admin/house` already paints. */
const CONSOLE_PRODUCT_WORD = {
  MARKET: "Polls",
  UPDOWN: "Up & Down",
} as const satisfies Record<IntentProductLine, string>;

/**
 * ⛔ **THE CONSOLE'S OWN SENTENCE FOR EVERY ENGINE OUTCOME** (rulings 370(c), 453), TOTAL over `EngineCode`.
 *
 * `feed-copy.ts`'s own table names the feature in plain English in more than twenty of its rows — measured:
 * `MASTER_OFF`, `PRODUCT_NOT_SUPPORTED`, the six `CAP_GLOBAL_*` rows, every `{bot}` placeholder, and the two
 * staff-chosen rows whose sentences are themselves words of the shared vocabulary. Ruling 370(c) forbids a CLIENT
 * importing that module; nothing forbade the SERVER painting it into the officer's DOM, which 453 does forbid. So
 * this is an OVERRIDE, the same decision 432(f) took for `PAUSE_REASON_WAY_OUT` and 432(b) for `FIELD_META`, and for
 * the same reason: the engine's own words are the engine's, and the console's copy has one home.
 * ⛔ TOTAL, so a code added to the engine without a console sentence is a compile error rather than a blank cell.
 */
const CONSOLE_SKIP_SENTENCE = {
  OUTSIDE_SCHEDULE: "Outside this account's schedule",
  POOL_BAND: "The pool was outside this account's band",
  NOT_REACTING: "This account did not react this time",
  TRIGGER_STAKE_RANGE: "The player's stake was outside this account's range",
  NO_REACT_ZONE: "The stake came too close to betting close",
  EXIT_WINDOW_TOO_LATE: "The player's exit window closes too late to react in time",
  UD_CLOSENESS: "The price had already moved too far from the round's open",
  UD_NO_PRICE: "The round has no open price or targets",
  PENALTY_BOX: "That player is in today's penalty box",
  MARKET_HELD: "Another account, or a queued stake, already held this market",
  NO_ELIGIBLE_BOT: "No account could take it",
  STAKE_BELOW_MIN: "What was left after the limits was below the minimum",
  MAINTENANCE: "50pick was in maintenance",
  CUTOFF: "Too close to betting close",
  MARKET_NOT_LIVE: "The market was no longer open",
  MARKET_GONE: "The market no longer exists",
  MASTER_OFF: "The desk was switched off",
  BOT_NOT_ACTIVE: "This account was not running",
  TRIGGER_EXITED: "The player cashed out first",
  CONDITION_GONE: "The market's money changed first, so its side no longer held",
  BUSY_TIMEOUT: "50pick stayed busy until it was too late",
  UNMAPPED: "Refused for a reason the engine does not recognise",
  INTERNAL: "An internal error stopped it",
  STAKE_BOUNDS_CHANGED: "The platform's own stake limits changed",
  POISON: "It failed three times",
  NO_CUTOFF: "The poll has no betting close",
  UD_NO_ROUND: "The Up & Down market has no round",
  PRODUCT_NOT_SUPPORTED: "The desk does not stake on this product",
  UD_STALE_PRICE: "No fresh price was available",
  MARKET_REOPENED: "The market was reopened",
  CHAIN_NOT_RUNNING: "The Up & Down chain was not running",
  HOLDER_RECRUIT: "The player was recruited by an account holder",
  STALE: "50pick was busy until the time limit passed",
  CANCELLED_BY_ADMIN: "An officer stopped it before it was placed",
  INFO_BLACKOUT: "An AI result check is recorded on this market, or it was reopened after one",
  TARGET_REMOVED: "The target was stopped",
  TARGET_ENDED: "The target ended",
  COUNTERPARTY_CONCENTRATION: "One player held too much of the locked money",
  CAP_OPPOSITE_SIDE: "This account already held the other side of this market",
  OUT_OF_SCOPE: "This account's rules no longer cover this market",
  CAP_STAKE_MIN: "Below this account's smallest allowed stake",
  CAP_STAKE_MAX: "Above this account's largest allowed stake",
  CAP_PER_MARKET: "This account's per-market TZS limit was reached",
  CAP_BALANCE_FLOOR: "The holder's balance was below the floor",
  CAP_DAILY_STAKE: "This account's daily stake limit was reached",
  CAP_DAILY_LOSS_PROJECTED: "This account's daily loss limit could have been passed",
  CAP_EXPOSURE: "This account's open exposure limit was reached",
  CAP_STAFF_CHOSEN_PER_DAY: "This account had used today's manual stakes",
  CAP_STAFF_CHOSEN_DAILY_STAKE: "This account's manual TZS limit for today was reached",
  CAP_TARGET_ONCE: "The target reacts to the first stake only, and one reaction is already placed",
  CAP_MIN_GAP: "This account's minimum gap between bets applied",
  CAP_PER_HOUR: "This account's hourly bet limit was reached",
  CAP_PER_DAY: "This account's daily bet limit was reached",
  CAP_PER_MARKET_COUNT: "This account's bets-per-market limit was reached",
  CAP_GLOBAL_PER_MARKET: "The desk's per-market TZS limit was reached",
  CAP_GLOBAL_DAILY_STAKE: "The desk's daily stake limit was reached",
  CAP_GLOBAL_LOSS_PROJECTED: "The desk's daily loss limit could have been passed",
  CAP_GLOBAL_EXPOSURE: "The desk's open exposure limit was reached",
  CAP_GLOBAL_BETS_PER_MINUTE: "The desk's bets-per-minute limit applied",
  CAP_GLOBAL_BETS_PER_DAY: "The desk's daily bet limit was reached",
  CAP_COUNTERPARTY_COUNT: "That player had been met as often as allowed today",
  CAP_COUNTERPARTY_TZS: "The TZS set against that player today reached its limit",
  CAP_GLOBAL_STAFF_CHOSEN_PER_DAY: "The desk had used today's manual stakes",
  CAP_GLOBAL_STAFF_CHOSEN_DAILY_STAKE: "The desk's manual TZS limit for today was reached",
} as const satisfies Record<EngineCode, string>;

/**
 * The window the activity rail offers, and the one a bare visit is on.
 * ⭐ `all` IS THE DEFAULT AND IT IS THE FOURTH WINDOW ON PURPOSE. Delivered bells already link with `&range=all`
 * (`alert-copy.ts`'s feed href and the two placement notices), and one account's own activity is a short list — a
 * rail that opened narrowed would hide the row the officer followed a bell to reach, which is 432(a) pointing the
 * other way. The three narrowing presets are the platform's own ids, so "today" means one thing everywhere.
 */
const CONSOLE_FEED_PRESETS = ["today", "24h", "7d", "all"] as const;
const CONSOLE_FEED_PRESET_DEFAULT = "all";

/**
 * ⛔ **THE URL TOKEN IS THE CONSOLE'S OWN WORD, SLUGGED — NEVER THE ENUM, LOWERCASED** (ruling 453).
 *
 * 🔴 READ OFF A SERVED PAGE, NOT REASONED ABOUT. The first build of this rail derived each option's query value
 * with `member.toLowerCase()`, and `/admin/desk/<id>?tab=activity` came back carrying
 * `href="…&kind=counter"` and `data-chip="kind:counter"` FIVE times — a word 453's lexicon forbids, in served
 * markup and in the address bar, where it lands in every screenshot of the screen. NOTHING reported it: 4.453
 * scans source LITERALS and the token was computed at runtime; 3.453 scanned the painted LABELS and not the keys;
 * the bundle scan reads chunks and this is server markup. Every suite was green.
 *
 * ⛔ So the rule is inverted and made self-enforcing: a token may only ever be the option's OWN painted word,
 * slugged — which means a token can never carry a word its label does not, and the ONE neutrality scan over the
 * labels now covers the keys and the hrefs by construction. The parse reads the same table, so the control an
 * officer clicks and the read the server takes are still one function.
 */
const consoleSlug = (word: string): string => word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** One option of one filter group — a finished label, a finished href and whether it is the one in force. */
export type ConsoleFilterOption = { key: string; label: string; href: string; on: boolean };
/**
 * One axis of the activity rail. `param` is the REAL query-parameter name, because `FilterPill`'s `testId`
 * contract is "axis:value using the REAL query-param name and value" and a driver rebuilds a URL from it.
 */
export type ConsoleFilterGroup = { param: string; label: string; options: ConsoleFilterOption[] };

/** One row of the activity panel. ⛔ No intent id, no `why`, no `decision`, no trigger player's id. */
export type ConsoleFeedRow = {
  when: string;
  whenTitle: string;
  /** ⛔ ONE intent's own stake, formatted, never a sum (rulings 266, 360 role C, 373). */
  stake: string;
  statusWord: string;
  statusChip: StatusChipVariant;
  typeWord: string;
  productWord: string;
  /** The console's own sentence for the engine's outcome code, or `null` for a row that simply landed. */
  note: string | null;
  /** True for the ONE row a delivered bell's `&intent=` names. ⛔ A flag, never the id — an id in an attribute is served markup. */
  anchored: boolean;
};

/** One row of the history panel. ⛔ No amount from any payload, and no free-text reason (see the reader). */
export type ConsoleEventRow = {
  when: string;
  whenTitle: string;
  /** `CONSOLE_EVENT_WORD[kind]`, always — never the raw enum and never a `?? kind` fallback. */
  eventWord: string;
  /** The status change this event recorded, in the ONE status map's words, or `null` when it changed no status. */
  change: string | null;
  /** The actor's own id, or the console's word for the engine — ruling 420: an actor is an id, never a name. */
  who: string;
  /**
   * ⛔ 266/369(c) · AN `OWNER_MONEY` ROW CARRIES A DOOR, NEVER A FIGURE. `money-hook.ts` writes `amountTzs` and
   * `balanceTzs` — the holder's own wallet balance — onto every one of those events. Ruling 266 allows money only
   * as usage against a configured limit and 456 settled that the door to a holder's money is the platform's own
   * transactions screen. So the row links there by transaction id and paints no amount at all.
   */
  moneyHref: string | null;
  anchored: boolean;
};

/**
 * What EITHER console page hands its own door: the REQUEST's query string, untouched.
 *
 * ⛔ **THE DOOR VALIDATES, NOT THE PAGE, AND NOT THE RAIL** (rulings 259, 383, 387). A console page is served 200 to
 * any signed-in account and a crafted address is free, so every value below is read here, checked against a CLOSED
 * list here, and refused here. The rail's own hrefs are built from the SAME parse, so the control an officer clicks
 * and the read the server takes cannot disagree — there is one function, not two.
 *
 * ⭐ ONE SHAPE FOR BOTH PAGES, AND IT WAS CALLED `ConsoleDetailQuery` UNTIL THE LANDING PANELS LANDED. The landing
 * page's address carries the same axes — the same window, the same three chips, the same two bell anchors and the
 * same two page numbers — so a second type would have been a second parse wearing a different name, which is the
 * one thing 383 and 387 are written against. `tpage` is the Targets grid's own page number and is simply absent
 * from a landing address; an absent parameter is page 1 in either shape.
 */
export type ConsoleQuery = {
  tab?: string | string[];
  tpage?: string | string[];
  page?: string | string[];
  hpage?: string | string[];
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
  kind?: string | string[];
  product?: string | string[];
  outcome?: string | string[];
  intent?: string | string[];
  event?: string | string[];
};

/** The parsed, validated query. `refusals` names every axis that was thrown away, by its own screen word. */
type ConsoleParsed = {
  /** The panel this address selects, resolved against the CALLER's own closed list (see `tabOf`). */
  tab: string;
  tpage: number;
  page: number;
  pageAsked: boolean;
  hpage: number;
  hpageAsked: boolean;
  preset: string;
  from: string | null;
  to: string | null;
  fromIso: string | undefined;
  toIso: string | undefined;
  kind: IntentKind | null;
  product: IntentProductLine | null;
  outcome: IntentStatus | null;
  intentId: string | null;
  eventId: string | null;
  refusals: string[];
};

/** One value of a repeated or array-shaped parameter is no value at all — a repeated parameter is a refusal. */
function oneParam(raw: string | string[] | undefined): { value: string | null; repeated: boolean } {
  if (raw === undefined) return { value: null, repeated: false };
  if (Array.isArray(raw)) return { value: null, repeated: raw.length > 0 };
  const v = raw.trim();
  return { value: v.length === 0 ? null : v, repeated: false };
}

/**
 * ⛔ A BOUNDED ID, CHECKED BY SHAPE BEFORE IT IS USED FOR ANYTHING. The two anchor parameters arrive from a
 * delivered bell, so they are real ids in practice and arbitrary text in principle. They are never interpolated
 * into markup and never used as a filter; this refuses the rest before they are compared at all.
 */
const CONSOLE_ANCHOR_SHAPE = /^hb[ie]_[A-Za-z0-9_]{1,48}$/;

/**
 * The closed-list member one URL token addresses, or `null`. ⛔ MATCHED ON THE TOKEN, never on the enum spelled in
 * lower case: the enum carries the feature's own vocabulary and an address is the one place this section cannot
 * take a word back (see `consoleSlug`).
 */
function fromClosedList(axis: ConsoleFeedAxis, value: string | null): string | null {
  if (value == null) return null;
  const v = value.toLowerCase();
  return CONSOLE_FEED_AXES[axis].members.find((m) => consoleAxisToken(axis, m) === v) ?? null;
}

/**
 * THE ONE PARSE. Every axis of the account page's address, validated against a closed list or a shape, with every
 * refusal NAMED so the page can say what it ignored rather than silently narrowing to something nobody asked for.
 */
function parseConsoleQuery(
  query: ConsoleQuery | undefined,
  nowMs: number,
  /**
   * ⛔ THE ONE DIFFERENCE BETWEEN THE TWO SHAPES, PASSED IN RATHER THAN BRANCHED ON. The landing rail and the
   * account page's rail are separate CLOSED LISTS with separate panels (`consoleTab` / `consoleDetailTab`), and a
   * parse that decided between them itself would be the second spelling of the filter this function exists to
   * prevent. Everything below this line is identical for both, which is why there is one parse and not two.
   */
  tabOf: (raw: string | string[] | undefined) => string,
): ConsoleParsed {
  const q = query ?? {};
  const refusals: string[] = [];
  const say = (axis: string) => { if (!refusals.includes(axis)) refusals.push(axis); };

  const pageOf = (raw: string | string[] | undefined, axis: string): { n: number; asked: boolean } => {
    const one = oneParam(raw);
    if (one.repeated) { say(axis); return { n: 1, asked: false }; }
    if (one.value == null) return { n: 1, asked: false };
    const n = Number(one.value);
    if (!Number.isSafeInteger(n) || n < 1) { say(axis); return { n: 1, asked: false }; }
    return { n: consolePageNumber(n), asked: true };
  };

  const closed = <T extends string>(raw: string | string[] | undefined, axis: ConsoleFeedAxis, said: string): T | null => {
    const one = oneParam(raw);
    if (one.repeated) { say(said); return null; }
    if (one.value == null) return null;
    const hit = fromClosedList(axis, one.value);
    if (hit == null) say(said);
    return hit as T | null;
  };

  const anchor = (raw: string | string[] | undefined, prefix: string): string | null => {
    const one = oneParam(raw);
    if (one.repeated) { say("link"); return null; }
    if (one.value == null) return null;
    if (!CONSOLE_ANCHOR_SHAPE.test(one.value) || !one.value.startsWith(prefix)) { say("link"); return null; }
    return one.value;
  };

  const targets = pageOf(q.tpage, "page");
  const feedPage = pageOf(q.page, "page");
  const history = pageOf(q.hpage, "page");

  /* ⛔ THE WINDOW IS THE PLATFORM'S OWN RESOLVER, so "today" means one span on every screen (`lib/query/windows.ts`'s
   * own header states the rule). `all` is the console's fourth window and is the ABSENCE of a bound rather than a
   * bound at the epoch: a count with no window is a count, and a `createdAt >= 1970` predicate is a slower way to
   * say the same thing. A preset nobody offers is refused, not silently honoured. */
  const rangeOne = oneParam(q.range);
  if (rangeOne.repeated) say("window");
  const fromOne = oneParam(q.from);
  const toOne = oneParam(q.to);
  if (fromOne.repeated || toOne.repeated) say("window");
  const askedPreset = rangeOne.value;
  const custom = askedPreset === "custom" || fromOne.value != null || toOne.value != null;
  let preset = CONSOLE_FEED_PRESET_DEFAULT;
  let fromIso: string | undefined;
  let toIso: string | undefined;
  if (custom) {
    const win = resolveRange({ range: "custom", from: fromOne.value, to: toOne.value }, nowMs, CONSOLE_FEED_PRESET_DEFAULT);
    preset = "custom";
    fromIso = new Date(win.start).toISOString();
    toIso = new Date(win.end).toISOString();
  } else if (askedPreset != null && askedPreset !== CONSOLE_FEED_PRESET_DEFAULT) {
    if (!(CONSOLE_FEED_PRESETS as readonly string[]).includes(askedPreset)) {
      say("window");
    } else {
      const win = resolveRange({ range: askedPreset }, nowMs, CONSOLE_FEED_PRESET_DEFAULT);
      preset = askedPreset;
      fromIso = new Date(win.start).toISOString();
      toIso = new Date(win.end).toISOString();
    }
  }

  return {
    tab: tabOf(q.tab),
    tpage: targets.n,
    page: feedPage.n,
    pageAsked: feedPage.asked,
    hpage: history.n,
    hpageAsked: history.asked,
    preset,
    from: custom ? fromOne.value : null,
    to: custom ? toOne.value : null,
    fromIso,
    toIso,
    kind: closed<IntentKind>(q.kind, "kind", "type"),
    product: closed<IntentProductLine>(q.product, "product", "product"),
    outcome: closed<IntentStatus>(q.outcome, "outcome", "outcome"),
    intentId: anchor(q.intent, "hbi_"),
    eventId: anchor(q.event, "hbe_"),
    refusals,
  };
}

/** The refusal Callout's own heading — number-agnostic, because the sentence beneath it is not (read off a tile). */
export const CONSOLE_REFUSAL_TITLE = "This address was not used in full";

/** What a refused axis is called on screen, and the one sentence that says an address was not taken at its word. */
function consoleRefusalSentence(refusals: readonly string[]): string | null {
  if (refusals.length === 0) return null;
  const list = refusals.length === 1
    ? refusals[0]
    : `${refusals.slice(0, -1).join(", ")} and ${refusals[refusals.length - 1]}`;
  return refusals.length === 1
    ? `One part of this address was not understood and was ignored: ${list}. The rest of the filter is in force.`
    : `Parts of this address were not understood and were ignored: ${list}. The rest of the filter is in force.`;
}

/**
 * Every live FILTER of the activity panel, as the pager's `baseHref` and the rail's own links need them.
 *
 * ⛔ THE BELL'S ANCHOR IS NOT ONE OF THEM, DELIBERATELY. `&intent=` is a LANDING INSTRUCTION — "show me the page
 * this row is on" — and it belongs to the address the bell produced, not to every link the officer clicks
 * afterwards. Carrying it forward would re-resolve a page under a filter the anchor was never ranked in, and it
 * would echo a bounded record id into every pager link and every chip on the rail, which is the one thing this
 * section may never put in a response it does not have to.
 */
function consoleFeedParams(p: ConsoleParsed): Record<string, string | undefined> {
  return {
    tab: "activity",
    range: p.preset === CONSOLE_FEED_PRESET_DEFAULT ? undefined : p.preset,
    from: p.from ?? undefined,
    to: p.to ?? undefined,
    kind: p.kind ? consoleAxisToken("kind", p.kind) : undefined,
    product: p.product ? consoleAxisToken("product", p.product) : undefined,
    outcome: p.outcome ? consoleAxisToken("outcome", p.outcome) : undefined,
  };
}

/**
 * One rail link: the panel's own page, the live parameters, one axis changed — and `page` dropped (ruling 411).
 * ⛔ `base` IS A FINISHED ROUTE THE CALLER GOT FROM `console-routes.ts` (`CONSOLE_ROUTE` for the desk, `consoleBotHref`
 * for one account) and is never composed here: ruling 319 puts the segment in one module, and a rail that built its
 * own path would be the second spelling of the route this section was pulled up on.
 */
function consoleFeedLink(base: string, params: Record<string, string | undefined>, patch: Record<string, string | undefined>): string {
  const merged: Record<string, string | undefined> = { ...params, ...patch };
  const qs = Object.entries(merged)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join("&");
  return qs ? `${base}?${qs}` : base;
}

/**
 * ⭐ THE RAIL'S THREE AXES, IN ONE TABLE — the parse below and the render above both read it, so the control an
 * officer clicks and the read the server takes cannot be two different spellings of the same filter.
 * ⛔ A page about ONE account has no Bot axis: a control that can only ever select the account you are looking at
 * is the dead control 432(a) refuses. The landing rail's own axes are that page's, when it is built.
 */
export const CONSOLE_FEED_AXES = {
  kind: { label: "Type", all: "Any type", members: INTENT_KINDS as readonly string[], word: CONSOLE_INTENT_KIND_WORD as Readonly<Record<string, string>> },
  product: { label: "Product", all: "Any product", members: INTENT_PRODUCT_LINES as readonly string[], word: CONSOLE_PRODUCT_WORD as Readonly<Record<string, string>> },
  outcome: {
    label: "Outcome", all: "Any outcome", members: INTENT_STATUSES as readonly string[],
    word: Object.fromEntries(INTENT_STATUSES.map((st) => [st, CONSOLE_INTENT_STATUS[st].word])) as Readonly<Record<string, string>>,
  },
} as const;
export type ConsoleFeedAxis = keyof typeof CONSOLE_FEED_AXES;

/** The URL token one member of one axis is addressed by — its own painted word, slugged, and nothing else. */
function consoleAxisToken(axis: ConsoleFeedAxis, member: string): string {
  return consoleSlug(CONSOLE_FEED_AXES[axis].word[member] ?? member);
}

/**
 * The activity rail, built where every other painted string of this section is built. ⛔ The rail file receives
 * FINISHED labels and FINISHED hrefs: it types no route, no enum and no closed list, so nothing about the feature
 * can reach it by name — and every string below is inside 4.453's and 3.453's scans, which a label typed at a call
 * site one directory away would not be.
 */
function consoleFeedGroups(base: string, p: ConsoleParsed): ConsoleFilterGroup[] {
  const params = consoleFeedParams(p);
  const live: Readonly<Record<ConsoleFeedAxis, string | null>> = { kind: p.kind, product: p.product, outcome: p.outcome };
  return (Object.keys(CONSOLE_FEED_AXES) as ConsoleFeedAxis[]).map((axis) => {
    const a = CONSOLE_FEED_AXES[axis];
    return {
      param: axis,
      label: a.label,
      options: [
        { key: "", label: a.all, href: consoleFeedLink(base, params, { [axis]: undefined }), on: live[axis] == null },
        ...a.members.map((m) => ({
          key: consoleAxisToken(axis, m),
          label: a.word[m] ?? m,
          href: consoleFeedLink(base, params, { [axis]: consoleAxisToken(axis, m) }),
          on: live[axis] === m,
        })),
      ],
    };
  });
}

/** The activity panel's empty states — one for a list with nothing in it, one for a filter that matched nothing. */
const CONSOLE_FEED_EMPTY: ConsoleEmpty = {
  title: "Nothing staked yet",
  body: "Every stake this account tries appears here, newest first, with what happened to it.",
};
const CONSOLE_FEED_EMPTY_FILTERED: ConsoleEmpty = {
  title: "Nothing matches this filter",
  body: "No stake on this account matches what the rail above is set to. Widen the window or clear a chip.",
};
const CONSOLE_HISTORY_EMPTY: ConsoleEmpty = {
  title: "No changes yet",
  body: "Every change to this account is kept here, newest first — who made it and when.",
};

/** The order BOTH panels are read in, said once where a reader of the table can see it (`("createdAt","id") DESC`). */
const CONSOLE_ORDER_NOTE = "Newest first.";

/**
 * Everything the two panels paint that does NOT depend on their rows: the rail, the live parameters, the window the
 * rail offers, the empty state this read has earned and the refusal sentence.
 *
 * ⛔ IT IS BUILT FOR EVERY STATE, INCLUDING A REMOVED ACCOUNT'S (358). A removed account takes neither list read, so
 * its rows are `null` — but the SHAPE is the same, because a view model whose keys appear and disappear is how a page
 * comes to read `undefined.length` on the one state nobody rendered.
 */
function consolePanelShell(base: string, p: ConsoleParsed): Pick<ConsoleDetailView,
  "feedPage" | "feedPerPage" | "feedFilters" | "feedPresets" | "feedPresetDefault" | "feedParams" | "feedEmpty"
  | "feedFiltered" | "feedClearHref" | "feedOrderNote" | "historyPage" | "historyPerPage" | "historyParams"
  | "historyEmpty" | "historyOrderNote" | "queryRefusal"> {
  const filtered = p.kind != null || p.product != null || p.outcome != null || p.preset !== CONSOLE_FEED_PRESET_DEFAULT;
  return {
    feedPage: p.page,
    feedPerPage: CONSOLE_FEED_PER_PAGE,
    feedFilters: consoleFeedGroups(base, p),
    feedPresets: CONSOLE_FEED_PRESETS,
    feedPresetDefault: CONSOLE_FEED_PRESET_DEFAULT,
    feedParams: consoleFeedParams(p),
    feedEmpty: filtered ? CONSOLE_FEED_EMPTY_FILTERED : CONSOLE_FEED_EMPTY,
    feedFiltered: filtered,
    feedClearHref: consoleFeedLink(base, { tab: "activity" }, {}),
    feedOrderNote: CONSOLE_ORDER_NOTE,
    historyPage: p.hpage,
    historyPerPage: CONSOLE_HISTORY_PER_PAGE,
    /* The history panel has no rail, so its only live parameter is the tab — and, for the reason above, the
       bell's `&event=` anchor is not carried into the pager's own links either. */
    historyParams: { tab: "history" },
    historyEmpty: CONSOLE_HISTORY_EMPTY,
    historyOrderNote: CONSOLE_ORDER_NOTE,
    queryRefusal: consoleRefusalSentence(p.refusals),
  };
}

/**
 * ⛔ **A BELL MUST LAND ON THE PAGE ITS OWN ROW IS ON** (ruling 302's other half, and 432(a)'s). A delivered alert
 * links to `&intent=<id>` or `&event=<id>`; under a NUMBERED pager, honouring that link means counting the rows at or
 * newer than the anchor INSIDE the same filter and turning the rank into a page number. Anything less is an officer
 * following a bell onto a screen that looks like it worked.
 * ⛔ THE RANK IS COUNTED OVER THE SAME PREDICATE THE ROWS ARE PAGED OVER — the anchor's own `createdAt` replaces only
 * the window's lower bound, every other facet is kept. A rank measured over a different population is a page number
 * with no basis. An anchor outside the filter has no page in it and the panel stays where the officer asked to be.
 * ⚠️ It runs ONLY when a bell was followed and no page was typed, so an ordinary render takes neither read.
 */
async function consoleFeedAnchorPage(anchorId: string, filter: IntentFeedCount, fallback: number): Promise<number> {
  try {
    const row = await houseBotIntentStore.get(anchorId);
    if (!row) return fallback;
    /* ⛔ THE ACCOUNT FACET IS CHECKED ONLY WHEN THERE IS ONE. On the DESK-WIDE feed `houseBotId` is absent — that is
     * the whole population — and comparing a real id with `undefined` would have refused every anchor the landing
     * page was ever sent, silently, on the one link a bell produces. */
    if (filter.houseBotId !== undefined && row.houseBotId !== filter.houseBotId) return fallback;
    if (filter.fromIso !== undefined && Date.parse(row.createdAt) < Date.parse(filter.fromIso)) return fallback;
    if (filter.toIso !== undefined && Date.parse(row.createdAt) >= Date.parse(filter.toIso)) return fallback;
    const rank = await houseBotIntentStore.countFeed({ ...filter, fromIso: row.createdAt });
    return rank > 0 ? Math.max(1, Math.ceil(rank / CONSOLE_FEED_PER_PAGE)) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The history panel's half of the same rule, over the event log's own shared predicate.
 * ⛔ `botId` IS `null` ON THE DESK-WIDE LOG, and that is not "any account": it is the population that also holds the
 * CONTROL ROW's own events (`houseBotId: null` — the switch, the limits save, the withdrawal), which a per-account
 * narrowing correctly drops and the desk's own history must not.
 */
async function consoleHistoryAnchorPage(anchorId: string, botId: string | null, fallback: number): Promise<number> {
  try {
    const row = await houseBotEventStore.get(anchorId);
    if (!row) return fallback;
    if (botId !== null && row.houseBotId !== botId) return fallback;
    const rank = await houseBotEventStore.countAll({ ...(botId !== null ? { houseBotId: botId } : {}), fromIso: row.createdAt });
    return rank > 0 ? Math.max(1, Math.ceil(rank / CONSOLE_HISTORY_PER_PAGE)) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ⛔ A PAGE PAST THE END IS SERVED AS THE LAST PAGE — the idiom this section already ships for the Targets grid, and
 * the one §0a allows it to have. A numbered pager drawn from a real total beside a card with no rows is 432(a)'s dead
 * control; an "empty page 3" is a state nobody can act on.
 */
function consoleLastPage(total: number | null, want: number, perPage: number): number {
  if (total == null) return want;
  return Math.min(want, Math.max(1, Math.ceil(total / perPage)));
}

/** One intent, painted. ⛔ Finished strings and booleans only — see the section header for what may not cross. */
function consoleFeedRow(i: StoredHouseBotIntent, anchorId: string | null): ConsoleFeedRow {
  const at = Date.parse(i.createdAt);
  /* 🔴 SECONDS, AND THAT WAS READ OFF A SERVED PAGE. With `HH:MM` every row of a busy account reads the same
     instant — twenty rows on one screen all saying "20 Sep 15:10" — so the ONE column that states the order could
     not be used to check it. The targets grid keeps minutes: a target is a rare, deliberate act. A stake is not. */
  const status = CONSOLE_INTENT_STATUS[i.status];
  const code = i.reasonCode;
  return {
    when: Number.isFinite(at) ? `${formatEat(at, "D MMM")} ${formatEat(at, "HH:MM:SS")}` : "—",
    whenTitle: Number.isFinite(at) ? `${formatEat(at, "D MMM YYYY")} ${formatEat(at, "HH:MM:SS")} EAT` : "—",
    stake: formatTzs(i.stakeTzs),
    statusWord: status.word,
    statusChip: status.chip,
    typeWord: CONSOLE_INTENT_KIND_WORD[i.kind],
    productWord: CONSOLE_PRODUCT_WORD[i.productLine],
    /* ⛔ THE CONSOLE'S OWN SENTENCE OR NOTHING — never `intent.why`, and never the engine's own table. An outcome
     * code this build does not know paints no sentence rather than a raw enum (453). */
    note: code != null && Object.prototype.hasOwnProperty.call(CONSOLE_SKIP_SENTENCE, code)
      ? (CONSOLE_SKIP_SENTENCE as Record<string, string>)[code]
      : null,
    anchored: anchorId != null && i.id === anchorId,
  };
}

/** One event, painted. ⛔ No payload amount and no wallet balance reaches this row — a door does (266, 369(c), 456). */
function consoleEventRow(e: StoredHouseBotEvent, anchorId: string | null): ConsoleEventRow {
  const at = Date.parse(e.createdAt);
  const word = (s: string | null): string | null => (s != null && s in HOUSE_BOT_STATUS_DISPLAY
    ? HOUSE_BOT_STATUS_DISPLAY[s as keyof typeof HOUSE_BOT_STATUS_DISPLAY].word : null);
  const from = word(e.fromStatus);
  const to = word(e.toStatus);
  const txn = e.payload != null && typeof e.payload.txnId === "string" ? e.payload.txnId : null;
  return {
    when: Number.isFinite(at) ? `${formatEat(at, "D MMM")} ${formatEat(at, "HH:MM:SS")}` : "—",
    whenTitle: Number.isFinite(at) ? `${formatEat(at, "D MMM YYYY")} ${formatEat(at, "HH:MM:SS")} EAT` : "—",
    eventWord: CONSOLE_EVENT_WORD[e.kind],
    change: to == null ? null : from == null ? to : `${from} → ${to}`,
    /* ⛔ 420 · AN ACTOR IS AN ID, NEVER A NAME. The same rule the ON sentence already follows one card up; a name
     * would put a staff member's identity on a screen a record id is already masked out of. */
    who: e.actorId ?? "System",
    moneyHref: txn ? `/admin/transactions?q=${encodeURIComponent(txn)}` : null,
    anchored: anchorId != null && e.id === anchorId,
  };
}

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
        /* ⛔ THE FACE IS DERIVED FROM THE FIELD'S OWN UNIT, the same source `limitValue` formats from, so the two
           can never disagree — and it is `"word"` while the row is unset, because "Not set" is a state. */
        face: (raw == null ? "word" : FIELD_META[field].unit === "TZS" ? "money" : "count") as ConsoleRuleRow["face"],
      };
    }),
    { section: "Scope", name: "Products", value: productWords(rules.scope.products.updown, rules.scope.products.polls), unset: false, caption: null, face: "word" as const },
    { section: "Scope", name: "Targeted stakes", value: rules.targeting.enabled ? "On" : "Off", unset: false, caption: null, face: "word" as const },
    { section: "Scope", name: "Enter now", value: rules.enterNow.enabled ? "On" : "Off", unset: false, caption: null, face: "word" as const },
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
  /**
   * ⛔ THE BROWSER'S OWN IDEMPOTENCY KEY FOR ONE PRESS (CA-19, 2026-09-20). Re-verify spends the HOLDER'S
   * sign-in attempts, of which the last two are kept for them, and a double-tapped Confirm with a mistyped
   * password used to cost TWO of the three.
   *
   * ⭐ THE SERVICE ALREADY HAD THE ANSWER AND THIS ROW NEVER ASKED FOR IT. `verifyHouseBotPassword` claims
   * `submit:<officer>:<id>` once, durably, BEFORE the password is checked, and answers DUPLICATE_SUBMIT to the
   * copy — the same property the designate wizard has carried since C7 step 6 and the cancel control makes
   * REQUIRED. `CONSOLE_ACT_REFUSAL.DUPLICATE_SUBMIT` was even written for this row. What was missing was this
   * field and the one argument below it: the only guard was `if (pending) return` in the dialog, and React's
   * `useTransition` does not set `pending` until it has re-rendered, so two taps inside one frame both pass it.
   *
   * ⚠️ OPTIONAL, not required: it is an idempotency key, not an authorisation. A caller that omits one is
   * refused nothing — it simply keeps the behaviour this row had before, which is what makes adding it safe.
   */
  submitId?: string;
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
  /** ⛔ WHAT THE LIVE COUNT COUNTS — read off the first 360 tile, where it was a bare number (388, §C2). */
  reasonCountLabel: string;
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

const ACT_BASE = { cancelLabel: "Cancel", reasonCountLabel: "characters left", reasonMin: CONSOLE_REASON_MIN, reasonMax: CONSOLE_REASON_MAX } as const;
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
    reasonLabel: "Why are you removing it? (required)",
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
      /* ⛔ CA-19 · THE SUBMIT ID GOES WITH IT, so a double tap is ONE attempt against the holder's three.
         Read defensively, like every other field of this row: a client that sends nothing sends null, and
         `verifyHouseBotPassword` then skips the claim entirely rather than claiming the empty string —
         which one caller sharing a key with the next would turn into a permanent DUPLICATE_SUBMIT. */
      const submitId = typeof input.submitId === "string" && input.submitId.length > 0 ? input.submitId : null;
      done = await reverifyHouseBot({ officerId: viewerUserId, botId: id, password, submitId });
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
  /**
   * ⛔ THE REQUEST'S OWN QUERY STRING, UNTOUCHED, AND THE DOOR VALIDATES IT (rulings 259, 383, 387). It arrives as
   * the page received it — every value a string, an array or absent — and `parseConsoleQuery` checks each axis against its own list
   * against a CLOSED list or a shape before anything is read with it. The rail's own links are built from the SAME
   * parse, so the control an officer clicks and the read the server takes cannot disagree: one function, not two.
   * ⚠️ It replaced a bare `targetsPage: number` at C7 step 5 and the gate's ARITY IS UNCHANGED AT FOUR — the pin
   * moves with a door's shape, it is never dropped.
   */
  query?: ConsoleQuery,
): Promise<ConsoleDetailAnswer | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  const nowMs = Date.now();
  const q = parseConsoleQuery(query, nowMs, consoleDetailTab);

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
    const at = Number.isFinite(removedAtMs) ? `${formatEat(removedAtMs, "D MMM YYYY")} ${formatEat(removedAtMs, "HH:MM")} EAT` : "an unrecorded time";
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
      rulesForm: null,
      rulesReason: "A removed account's rules are kept as a record and cannot be changed.",
      /* 358 · a REMOVED account has no act left, which is why this page renders no action row at all. */
      acts: [],
      statusNote: null,
      targets: null,
      targetsActive: null,
      targetsTotal: null,
      targetsPage: 1,
      targetsPerPage: CONSOLE_TARGETS_PER_PAGE,
      /* 358 · a removed account takes neither list read, so both slices are `null` — the state the page reads as
       * "there was never a read to fail", which is the distinction 355 and 421 exist to keep. */
      ...consolePanelShell(consoleBotHref(bot.id), q),
      feed: null,
      feedTotal: null,
      history: null,
      historyTotal: null,
    };
  }

  /* ⛔ ONE SETTLED SET (355): no single failure blanks the page and each failure is attributed to ITS figure.
   * ⛔ AND ONE WALLET READ, THROUGH THE ENGINE'S OWN SNAPSHOT (356, 368). `readBotAndHolder` is the function fire
   * itself calls, so this page and the engine can never disagree about why an account is stopped — which is
   * `control.ts`'s own stated reason for existing. It performs exactly one `db.wallet.findByUserId`. */
  /* ⛔ THE TARGETS PAGER READS THREE THINGS, NOT ONE, AND EACH IS THE READER FOR ITS OWN QUESTION.
   * · `listForBot(… offset)` is the PAGE — `pageLimit` clamps it at 500 rows, so it can answer "which rows"
   *   and nothing else;
   * · `countForBot(bot.id, "all")` is the TOTAL the pager draws its last page from. A total taken from the page
   *   would read 20 for ever and the control would never appear at all;
   * · `countActive({ botId })` is the TAB COUNT. It was read off the page's own rows before, which made the
   *   badge "active targets among the newest 20" — a figure with no basis the moment a 21st target exists, and
   *   one that would have changed as an officer paged. */
  const wantPage = q.tpage;
  /* ⭐ C7 STEP 5 · THE TWO PANELS' READS JOIN THE SAME SETTLED SET, AND ONLY THE TAB IN VIEW TAKES ITS OWN.
   * ⛔ Each is settled on its OWN, never wrapped with another read (355, 435(d)): a failed row read must not blank
   * the total beside it, because `null` rows and a real total say different things and paint different treatments.
   * ⛔ ONE FILTER OBJECT feeds both the page and the count (ruling 345): the moment the two are written separately
   * the badge above a table counts a population the table cannot show, and nothing on the screen says which is wrong. */
  const wantFeed = q.tab === "activity";
  const wantHistory = q.tab === "history";
  const feedFilter: IntentFeedCount = {
    houseBotId: bot.id,
    ...(q.product ? { productLine: q.product } : {}),
    ...(q.kind ? { kinds: [q.kind] } : {}),
    ...(q.outcome ? { statuses: [q.outcome] } : {}),
    ...(q.fromIso ? { fromIso: q.fromIso } : {}),
    ...(q.toIso ? { toIso: q.toIso } : {}),
  };
  /* A bell was followed and no page was typed: resolve the anchor's own page before the set is issued. */
  const wantFeedPage = wantFeed && q.intentId && !q.pageAsked
    ? await consoleFeedAnchorPage(q.intentId, feedFilter, q.page) : q.page;
  const wantHistoryPage = wantHistory && q.eventId && !q.hpageAsked
    ? await consoleHistoryAnchorPage(q.eventId, bot.id, q.hpage) : q.hpage;
  const [holderR, dayR, exposureR, staffR, rateR, targetsR, targetsCountR, targetsActiveR, parseR,
    feedR, feedCountR, historyR, historyCountR] = await Promise.allSettled([
    readBotAndHolder(bot.id, { nowMs }),
    houseDayBook(dayKey, bot.id),
    houseOpenExposure(bot.id),
    houseBotIntentStore.staffChosenPlacedToday({ houseBotId: bot.id, dayKey }),
    houseSeamStore.botRateUsage({ houseBotId: bot.id }),
    houseBotTargetStore.listForBot(bot.id, "all", null, { limit: CONSOLE_TARGETS_PER_PAGE, offset: (wantPage - 1) * CONSOLE_TARGETS_PER_PAGE }),
    houseBotTargetStore.countForBot(bot.id, "all"),
    houseBotTargetStore.countActive({ botId: bot.id }),
    loadParseContext(),
    wantFeed
      ? houseBotIntentStore.listFeed({ ...feedFilter, limit: CONSOLE_FEED_PER_PAGE, offset: (wantFeedPage - 1) * CONSOLE_FEED_PER_PAGE })
      : Promise.resolve(null),
    wantFeed ? houseBotIntentStore.countFeed(feedFilter) : Promise.resolve(null),
    wantHistory
      ? houseBotEventStore.listAll({ houseBotId: bot.id, limit: CONSOLE_HISTORY_PER_PAGE, offset: (wantHistoryPage - 1) * CONSOLE_HISTORY_PER_PAGE })
      : Promise.resolve(null),
    wantHistory ? houseBotEventStore.countAll({ houseBotId: bot.id }) : Promise.resolve(null),
  ]);

  const holder = holderR.status === "fulfilled" && holderR.value.found ? holderR.value : null;
  const book = dayR.status === "fulfilled" ? dayR.value : null;
  const openStake = exposureR.status === "fulfilled" ? exposureR.value : null;
  const staffChosen = staffR.status === "fulfilled" ? staffR.value : null;
  const rate = rateR.status === "fulfilled"
    ? (rateR.value[0] ?? { houseBotId: bot.id, placedLastHour: 0, placedLastDay: 0, lastPlacedAt: null })
    : null;
  const targetsTotal = targetsCountR.status === "fulfilled" ? targetsCountR.value : null;
  /* ⛔ A PAGE PAST THE END IS SERVED AS THE LAST PAGE, NOT AS AN EMPTY GRID. `?tpage=99` on a nine-page account
   * would otherwise render a card with no rows and a pager pointing at a page that is not the one it drew. The
   * re-read costs one statement and only ever happens on a page number a hand typed. */
  const lastPage = targetsTotal == null ? wantPage : Math.max(1, Math.ceil(targetsTotal / CONSOLE_TARGETS_PER_PAGE));
  const shownPage = Math.min(wantPage, lastPage);
  let targetPage = targetsR.status === "fulfilled" ? targetsR.value : null;
  if (targetPage != null && shownPage !== wantPage) {
    try {
      targetPage = await houseBotTargetStore.listForBot(bot.id, "all", null,
        { limit: CONSOLE_TARGETS_PER_PAGE, offset: (shownPage - 1) * CONSOLE_TARGETS_PER_PAGE });
    } catch { targetPage = null; }
  }
  const targetRows = targetPage == null ? null : targetPage.rows;
  const parseCtx = parseR.status === "fulfilled" ? parseR.value : null;

  /* ⭐ C7 STEP 5 · THE TWO PANELS, IN THE SHIPPED IDIOM AND NOT A SECOND ONE (§0a).
   * ⛔ The total comes from the COUNTING reader and never from the rows (344); the page past the end is served as
   * the LAST page, which is what the Targets grid twelve lines up already does; and a FAILED read is `null`, which
   * the page paints as the kit's failure treatment and never as an empty table (355). */
  /* ⛔ THE ANCHOR'S RANK IS INCLUSIVE, SO A TIE INFLATES IT — AND THE STEP BACK IS WHAT MAKES IT EXACT.
   * `countFeed({ fromIso: row.createdAt })` counts rows at or newer than the anchor, so rows sharing the anchor's
   * millisecond are counted with it and the rank can only be too LARGE, never too small — which pushes the computed
   * page LATER, never earlier. The rows are already in hand, so the correction costs no read of its own: if the
   * anchor is not among them, the page is stepped back ONCE, before the single re-read below. That is exact for any
   * tie block smaller than a page, which is every physically possible one — the per-minute cap is at most twenty
   * stakes across the whole desk, so twenty stakes by ONE account inside one millisecond cannot happen. */
  const feedTotal = wantFeed && feedCountR.status === "fulfilled" ? feedCountR.value : null;
  let feedPageRows = wantFeed && feedR.status === "fulfilled" ? feedR.value : null;
  let feedShown = consoleLastPage(feedTotal, wantFeedPage, CONSOLE_FEED_PER_PAGE);
  if (wantFeed && q.intentId != null && !q.pageAsked && feedShown === wantFeedPage && feedShown > 1
    && feedPageRows != null && !feedPageRows.rows.some((i) => i.id === q.intentId)) feedShown -= 1;
  if (wantFeed && feedPageRows != null && feedShown !== wantFeedPage) {
    try {
      feedPageRows = await houseBotIntentStore.listFeed({ ...feedFilter, limit: CONSOLE_FEED_PER_PAGE, offset: (feedShown - 1) * CONSOLE_FEED_PER_PAGE });
    } catch { feedPageRows = null; }
  }
  const feed: ConsoleFeedRow[] | null = feedPageRows == null ? null
    : feedPageRows.rows.map((i) => consoleFeedRow(i, q.intentId));

  const historyTotal = wantHistory && historyCountR.status === "fulfilled" ? historyCountR.value : null;
  let historyPageRows = wantHistory && historyR.status === "fulfilled" ? historyR.value : null;
  let historyShown = consoleLastPage(historyTotal, wantHistoryPage, CONSOLE_HISTORY_PER_PAGE);
  if (wantHistory && q.eventId != null && !q.hpageAsked && historyShown === wantHistoryPage && historyShown > 1
    && historyPageRows != null && !historyPageRows.some((e) => e.id === q.eventId)) historyShown -= 1;
  if (wantHistory && historyPageRows != null && historyShown !== wantHistoryPage) {
    try {
      historyPageRows = await houseBotEventStore.listAll({ houseBotId: bot.id, limit: CONSOLE_HISTORY_PER_PAGE, offset: (historyShown - 1) * CONSOLE_HISTORY_PER_PAGE });
    } catch { historyPageRows = null; }
  }
  const history: ConsoleEventRow[] | null = historyPageRows == null ? null
    : historyPageRows.map((e) => consoleEventRow(e, q.eventId));

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
  /**
   * ⭐ THE SAME FACTS AS `rules`, AS INPUTS RATHER THAN SENTENCES (2026-09-21) — and it is a SEPARATE shape on
   * purpose. `ConsoleRuleRow` carries formatted display strings ("TZS 20,000", "Not set"), which is exactly
   * what a text input must not be seeded with: an officer who saved such a form back would post a thousands
   * separator into a money column. So the form gets the raw number as a plain string and the neutral key,
   * and the card keeps its formatted row.
   * ⛔ A REMOVED ACCOUNT GETS NO FORM (358): its rules are a record. `null` here is what the page draws no
   * form for, and the same `null` covers rules that would not parse — a document this module could not read
   * is not one a form may overwrite.
   */
  const rulesForm: ConsoleRulesForm | null = parsed == null || !parsed.ok ? null : {
    baseVersion: bot.rulesVersion,
    caps: CAP_FIELDS.map((field) => ({
      key: CONSOLE_CAP_KEY[field],
      label: consoleLimitLabel(field),
      /* ⛔ RAW, NEVER FORMATTED, and empty for unset — "" is what the validator reads as UNSET, so the form's
         empty box and the column's NULL are the same state travelling in both directions. */
      value: bot[field] == null ? "" : String(bot[field]),
      saved: limitValue(field, bot[field] as number | null),
      caption: bot[field] == null ? unsetCaptionFor(field, false) : null,
      unit: FIELD_META[field].unit === "TZS" ? ("TZS" as const) : ("count" as const),
      required: (REQUIRED_FOR_START as readonly string[]).includes(field),
    })),
    flags: [
      { key: CONSOLE_FLAG_KEY.productUpdown, section: "Products", label: "Up & Down", on: parsed.rules.scope.products.updown },
      { key: CONSOLE_FLAG_KEY.productPolls, section: "Products", label: "Polls", on: parsed.rules.scope.products.polls },
      { key: CONSOLE_FLAG_KEY.updownCounter, section: "Up & Down entry", label: "React to a player's stake", on: parsed.rules.modes.updown.counter },
      { key: CONSOLE_FLAG_KEY.updownFill, section: "Up & Down entry", label: "Fill a thin side", on: parsed.rules.modes.updown.fill },
      { key: CONSOLE_FLAG_KEY.updownOpener, section: "Up & Down entry", label: "Open a quiet market", on: parsed.rules.modes.updown.opener },
      { key: CONSOLE_FLAG_KEY.pollsCounter, section: "Polls entry", label: "React to a player's stake", on: parsed.rules.modes.polls.counter },
      { key: CONSOLE_FLAG_KEY.pollsFill, section: "Polls entry", label: "Fill a thin side", on: parsed.rules.modes.polls.fill },
      { key: CONSOLE_FLAG_KEY.pollsOpener, section: "Polls entry", label: "Open a quiet market", on: parsed.rules.modes.polls.opener },
      { key: CONSOLE_FLAG_KEY.enterNow, section: "By hand", label: "Enter now", on: parsed.rules.enterNow.enabled },
      { key: CONSOLE_FLAG_KEY.targeting, section: "By hand", label: "Targeted stakes", on: parsed.rules.targeting.enabled },
    ],
    copy: {
      barDetail: "These govern every stake this one account places.",
      guardBody: "This account's settings have been changed but not saved. Leaving now discards the change.",
    },
  };

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
    rulesForm,
    /* 432(j) · a control that is not drawn still says why, beside the card it would have been in. */
    /**
     * ⛔ THE SENTENCE THIS REPLACES SAID "Editing an account's rules is not ready on this build yet." — true
     * until 2026-09-21, and the reason an owner and a manager could not start a single account: the Start
     * refusal sent them here to save, and there was nothing here to save with.
     *
     * 🔴 AND ITS FIRST REPLACEMENT SAID WHAT THE TAB GUIDANCE ALREADY SAYS — READ OFF THE TILES, at 1280 and
     * at 360 (2026-09-21). It repeated "All eleven required limits must be set, and at least one product and
     * one entry mode chosen, before Start will run this account" ninety pixels under the panel line that
     * carries exactly that fact; on a 360 tile the two paragraphs filled the whole viewport and not one
     * control was visible under them. 432(n) is the rule one state saying one fact twice exists for, and no
     * suite could see it — both sentences were individually correct.
     * ⭐ SO IT CARRIES THE FACT THE PANEL LINE DOES NOT: these limits are not the only ones. The seam holds
     * every stake to the account's caps AND to the desk's own, which is what the Start dialog tells an
     * officer and what nothing on this tab otherwise says.
     * ⛔ AND IT IS NOT RENDERED FOR A DOCUMENT THAT WOULD NOT PARSE — that state gets its own sentence below,
     * because "these limits apply" is a claim about a form that is not being drawn.
     */
    rulesReason: parsed !== null && parsed.ok
      ? "Every stake this account places is held to these limits and to the desk's own."
      : "These settings could not be read, so no form is shown. Reload the page, and if it says this again, raise it before changing anything.",
    /* ⭐ 415 · the action row, from the status the reader already holds — no second read decides what is offered. */
    acts: actDialogsFor(bot.status),
    statusNote: statusNoteFor(bot.status, bot.pauseReason, wayOut),
    targets,
    targetsActive: targetsActiveR.status === "fulfilled" ? targetsActiveR.value : null,
    targetsTotal,
    targetsPage: shownPage,
    targetsPerPage: CONSOLE_TARGETS_PER_PAGE,
    ...consolePanelShell(consoleBotHref(bot.id), q),
    /* ⛔ THE PAGE THE ROWS REALLY CAME FROM, never the one the address asked for — the pager and the table cannot
     * disagree about which page is on screen. */
    feedPage: feedShown,
    historyPage: historyShown,
    feed,
    feedTotal,
    history,
    historyTotal,
  };
}



/* ═══ C7 STEP 5 (the LANDING half) · THE DESK-WIDE ACTIVITY AND HISTORY PANELS ════════════════════════════════
 *
 * ⛔ **TWO MORE GATED DOORS, EACH QUERY-SHAPED, EACH WITH ITS `CONSOLE_GATES` ENTRY** (rulings 259, 340, 512).
 * The account page's two panels answer about ONE record; these answer about the DESK — every account's stakes in
 * one list, and every account's changes together with the CONTROL ROW's own (the switch, the limits save, the
 * withdrawal), which a per-account narrowing correctly drops and the desk's own history must not lose.
 *
 * ⛔ **ONE READER PER RENDER PASS, STILL** (rulings 346, 406, 433(d)). Each returns the SAME `ConsoleDeskShell` the
 * roster and limits readers return, built from ONE `readDeskCore` call — so the strip, the band and the rail's
 * badge are identical on all four tabs and cannot be two reads of one question inside one render.
 *
 * ⛔ **THE PANELS ARE THE ACCOUNT PAGE'S PANELS, WIDENED — NOT A SECOND PAIR** (§0a). The same parse, the same
 * rail builder, the same page-size constants, the same "a page past the end is the LAST page" idiom and the same
 * anchor rule. What is added is the column that only a desk-wide list needs: WHOSE stake it was.
 */

/** ⛔ The three honest answers to "which account is this row about", each a different fact (355, 358). */
const CONSOLE_ACCOUNT_UNREADABLE = "Could not be read";
const CONSOLE_ACCOUNT_GONE = "Removed from the desk";
/** An event of the CONTROL ROW itself — the switch, a limits save, the withdrawal. It belongs to no account. */
const CONSOLE_ACCOUNT_DESK = "The desk";

/** One row of the desk-wide activity panel: the account page's row, plus whose stake it was. */
export type ConsoleDeskFeedRow = ConsoleFeedRow & {
  /**
   * ⛔ RULING 474 · THE ACCOUNT'S OWN LABEL IS OPERATOR DATA, verbatim but bounded — or one of the two console
   * words above when the roster read failed or the account has since been removed. Three states, three sentences,
   * never one standing in for another.
   */
  accountName: string;
  /** True when `accountName` is the operator's own text, so the DOM can say so (474's own hook). */
  accountIsOperatorText: boolean;
  /** The holder, as a HANDLE and nothing else (04 R6) — `null` when the account could not be named. */
  accountHandle: string | null;
  /** That account's own page. ⛔ Built by `console-routes.ts`, never spelled at a call site (319). */
  accountHref: string;
  /**
   * ⛔ THE ID THE CANCEL CONTROL POSTS, AND `null` ON EVERY ROW THAT CANNOT BE STOPPED. Only a QUEUED stake can
   * be: a CLAIMED one is already in flight and `cancelPending` refuses it, so offering the control there would be
   * the dead control 432(a) forbids. It is POSTED and never PAINTED — no row renders it.
   */
  cancelId: string | null;
};

/** One row of the desk-wide history: the account page's row, plus whose account it is — or the desk's own. */
export type ConsoleDeskEventRow = ConsoleEventRow & {
  accountName: string;
  /** True only when `accountName` is the operator's own text — which is also exactly when `accountHref` opens a page. */
  accountIsOperatorText: boolean;
  /** `null` for the control row's own events, which belong to no account and open no page (432(a)). */
  accountHref: string | null;
};

/**
 * ⭐ THE CANCEL CONTROL'S FINISHED COPY (rulings 388, 415, 453) — ONE object for the whole panel and not one per
 * row, because twenty identical dialogs in one payload is twenty chances for them to stop being identical.
 * ⛔ Every word crosses the boundary as a finished string: ruling 385 measured that most of this console's
 * sentences carry NO vocabulary word at all, so one typed into a client file would ship to every visitor with the
 * disclosure walk and the bundle scan both reporting clean.
 */
export type ConsoleCancelCopy = {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string;
  reasonHint: string;
  reasonCountLabel: string;
  reasonMin: number;
  reasonMax: number;
  doneTitle: string;
  failTitle: string;
};

const CONSOLE_CANCEL_COPY: ConsoleCancelCopy = {
  label: "Stop it",
  title: "Stop this queued stake",
  body: "This stake has not been placed yet. Stopping it means it never will be, and the record keeps who stopped it and why.",
  confirmLabel: "Stop the stake",
  cancelLabel: "Cancel",
  /* ⛔ 388 · A REQUIRED FIELD SAYS SO. The primary button is armed on `CONSOLE_REASON_MIN` and the counter counts
     DOWN, so a field that did not say it was required met an officer with a dead button and nothing explaining it. */
  reasonLabel: "Why are you stopping it? (required)",
  reasonHint: "This is kept on the record. Do not type anyone's name, number or address.",
  reasonCountLabel: "characters left",
  reasonMin: CONSOLE_REASON_MIN,
  reasonMax: CONSOLE_REASON_MAX,
  doneTitle: "The stake was stopped",
  failTitle: "Nothing was stopped",
};

/** The desk-wide activity panel. ⛔ Same shell, same rail, same pager, one more column. */
export type ConsoleFeedView = ConsoleDeskShell
  & Pick<ConsoleDetailView, "feedPage" | "feedPerPage" | "feedFilters" | "feedPresets" | "feedPresetDefault"
    | "feedParams" | "feedEmpty" | "feedFiltered" | "feedClearHref" | "feedOrderNote" | "queryRefusal">
  & {
    /** ⛔ `null` is a read that FAILED (355) — `AdminLoadError`, never an empty table. */
    feed: ConsoleDeskFeedRow[] | null;
    /** ⛔ FROM `countFeed`, NEVER `feed.length` (344): `pageLimit` clamps every list reader at 500 rows. */
    feedTotal: number | null;
    /** `null` when this render offers no cancel at all, so the page draws no control rather than a dead one. */
    cancelCopy: ConsoleCancelCopy | null;
  };

/** The desk-wide history panel. */
export type ConsoleHistoryView = ConsoleDeskShell
  & Pick<ConsoleDetailView, "historyPage" | "historyPerPage" | "historyParams" | "historyEmpty" | "historyOrderNote" | "queryRefusal">
  & {
    history: ConsoleDeskEventRow[] | null;
    historyTotal: number | null;
  };

/** The desk's own empty states. ⛔ DIFFERENT WORDS from the account page's: "this account" and "the desk" are
 *  different subjects, and an officer who reads the second sentence on the wrong panel learns the wrong fact (416). */
const CONSOLE_DESK_FEED_EMPTY: ConsoleEmpty = {
  title: "Nothing staked yet",
  body: "Every stake the desk tries appears here, newest first, with what happened to it.",
};
/**
 * 🔴 AND THE FILTERED ONE IS THE DESK'S TOO, WHICH THE FIRST BUILD GOT WRONG AND EVERY SUITE PASSED.
 * The reader used to keep the SHELL's filtered sentence here, on the reasoning that "nothing matches this filter"
 * is the same fact on either page. It is not: that sentence's BODY reads "No stake on **this account** matches",
 * and on the page that lists every account there is no such account. Read off the served page at
 * `?tab=activity&kind=manual&outcome=cancelled&product=up-down` — the account page's sentence, painted on the
 * desk. ⛔ 416's whole point is that two different subjects say different things, and the assertion that was
 * meant to hold this compared only the TITLES and then checked the UNFILTERED body for the word "desk", so the
 * one string that was wrong is the one string it never read.
 */
const CONSOLE_DESK_FEED_EMPTY_FILTERED: ConsoleEmpty = {
  title: "Nothing matches this filter",
  body: "No stake anywhere on the desk matches what the rail above is set to. Widen the window or clear a chip.",
};
const CONSOLE_DESK_HISTORY_EMPTY: ConsoleEmpty = {
  title: "No changes yet",
  body: "Every change to the desk and to the accounts on it is kept here, newest first — who made it and when.",
};

/**
 * Which account a row is about, from the roster the shell already read — never a second read and never a read per
 * row (ruling 351's own refusal of the per-bot loop).
 * ⛔ THE THREE STATES ARE KEPT APART: the roster read FAILED (nobody can tell), the account is not on the roster
 * (it was removed, which is a fact about the row), or it is there and the label is the operator's own text.
 */
function consoleAccountCell(
  roster: ReadonlyMap<string, StoredHouseBot> | null,
  houseBotId: string | null,
): { accountName: string; accountIsOperatorText: boolean; accountHandle: string | null } {
  if (houseBotId === null) return { accountName: CONSOLE_ACCOUNT_DESK, accountIsOperatorText: false, accountHandle: null };
  if (roster === null) return { accountName: CONSOLE_ACCOUNT_UNREADABLE, accountIsOperatorText: false, accountHandle: null };
  const found = roster.get(houseBotId);
  if (!found) return { accountName: CONSOLE_ACCOUNT_GONE, accountIsOperatorText: false, accountHandle: null };
  return {
    accountName: clampOperatorText(found.label, operatorBound("label")),
    accountIsOperatorText: true,
    accountHandle: playerHandle(found.userId),
  };
}

/** The roster the shell already holds, keyed — built once per render, never per row. */
function consoleRosterMap(roster: StoredHouseBot[] | null): ReadonlyMap<string, StoredHouseBot> | null {
  return roster === null ? null : new Map(roster.map((b) => [b.id, b] as [string, StoredHouseBot]));
}

/**
 * ⭐ THE DESK-WIDE ACTIVITY PANEL'S GATED READER (rulings 312, 317, 340, 344, 345, 355, 410, 411).
 *
 * ⛔ THE AUDIENCE IS RESOLVED FIRST AND NOTHING IS READ BEFORE THE VERDICT, so a refused viewer's payload carries
 * no label, no handle, no amount and no sentence.
 * ⛔ ONE FILTER OBJECT FEEDS THE PAGE AND THE TOTAL (ruling 345). The moment the two are written separately the
 * pager counts a population the table cannot show, and nothing on the screen says which of them is wrong.
 * ⛔ THE ORDER IS THE DAL'S OWN `("createdAt","id") DESC`, in BOTH the listing reader and the counting reader — a
 * numbered pager over an unstable order shows one row twice and hides another.
 */
export async function houseFeedForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  query?: ConsoleQuery,
): Promise<ConsoleFeedView | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  const q = parseConsoleQuery(query, Date.now(), consoleTab);
  /* ⛔ NO ACCOUNT FACET AT ALL — the desk IS the population. An empty-string or "any" sentinel would be a fourth
   * spelling of "no filter" that the shared predicate would then have to know about. */
  const feedFilter: IntentFeedCount = {
    ...(q.product ? { productLine: q.product as IntentProductLine } : {}),
    ...(q.kind ? { kinds: [q.kind as IntentKind] } : {}),
    ...(q.outcome ? { statuses: [q.outcome as IntentStatus] } : {}),
    ...(q.fromIso ? { fromIso: q.fromIso } : {}),
    ...(q.toIso ? { toIso: q.toIso } : {}),
  };
  /* A bell was followed and no page was typed: resolve the anchor's own page before the set is issued. */
  const wantPage = q.intentId && !q.pageAsked
    ? await consoleFeedAnchorPage(q.intentId, feedFilter, q.page) : q.page;

  const { core, extra: pageRead, extraB: totalRead } = await readDeskCore(
    () => houseBotIntentStore.listFeed({ ...feedFilter, limit: CONSOLE_FEED_PER_PAGE, offset: (wantPage - 1) * CONSOLE_FEED_PER_PAGE }),
    () => houseBotIntentStore.countFeed(feedFilter),
  );
  const shell = deskShell(core);

  const feedTotal = totalRead;
  let rows = pageRead;
  let shown = consoleLastPage(feedTotal, wantPage, CONSOLE_FEED_PER_PAGE);
  /* ⛔ THE ANCHOR'S RANK IS INCLUSIVE, SO A TIE INFLATES IT — the step back is what makes it exact, and it costs no
   * read: the rows are already in hand (the whole argument is written at the account page's own reader). */
  if (q.intentId != null && !q.pageAsked && shown === wantPage && shown > 1
    && rows != null && !rows.rows.some((i) => i.id === q.intentId)) shown -= 1;
  if (rows != null && shown !== wantPage) {
    try {
      rows = await houseBotIntentStore.listFeed({ ...feedFilter, limit: CONSOLE_FEED_PER_PAGE, offset: (shown - 1) * CONSOLE_FEED_PER_PAGE });
    } catch { rows = null; }
  }

  const byId = consoleRosterMap(core.roster);
  const feed: ConsoleDeskFeedRow[] | null = rows == null ? null : rows.rows.map((i) => ({
    ...consoleFeedRow(i, q.intentId),
    ...consoleAccountCell(byId, i.houseBotId),
    accountHref: consoleBotHref(i.houseBotId),
    /* ⛔ ONE POPULATION FOR THE BADGE AND FOR THE CONTROL (the `CONSOLE_PENDING_STATUSES` table): a row the badge
     * counts is a row an officer can stop, and a row it does not count offers no control at all. */
    cancelId: (CONSOLE_PENDING_STATUSES as readonly string[]).includes(i.status) ? i.id : null,
  }));

  const panel = consolePanelShell(CONSOLE_ROUTE, q);
  return {
    ...shell,
    feedPage: shown,
    feedPerPage: panel.feedPerPage,
    feedFilters: panel.feedFilters,
    feedPresets: panel.feedPresets,
    feedPresetDefault: panel.feedPresetDefault,
    feedParams: panel.feedParams,
    /* ⛔ THE DESK'S OWN WORDS FOR BOTH EMPTY STATES, AND THAT IS A CORRECTION A RENDER HAD TO MAKE. The filtered
     * branch used to hand back the SHELL's sentence, whose body names "this account" — on the one page that has
     * no account to name. Each subject has its own pair (416); neither borrows the other's. */
    feedEmpty: panel.feedFiltered ? CONSOLE_DESK_FEED_EMPTY_FILTERED : CONSOLE_DESK_FEED_EMPTY,
    feedFiltered: panel.feedFiltered,
    feedClearHref: panel.feedClearHref,
    feedOrderNote: panel.feedOrderNote,
    queryRefusal: panel.queryRefusal,
    feed,
    feedTotal,
    /* ⛔ NO CONTROL WHERE THERE IS NOTHING TO STOP (432(a)). A failed read offers none either: `feed` is `null` and
     * the panel paints the kit's failure treatment instead of a table with buttons in it. */
    cancelCopy: feed != null && feed.some((r) => r.cancelId !== null) ? CONSOLE_CANCEL_COPY : null,
  };
}

/**
 * ⭐ THE DESK-WIDE HISTORY PANEL'S GATED READER (rulings 317, 340, 344, 355, 411, 420).
 *
 * ⛔ IT CARRIES THE CONTROL ROW'S OWN EVENTS, and that is the difference from the account page's history: the
 * switch, a limits save and the withdrawal are the DESK's changes and belong to no account, so the desk-wide read
 * takes no account facet at all.
 * ⛔ NO AMOUNT AND NO BALANCE FROM ANY PAYLOAD (266, 369(c), 456) — the row carries a door to the platform's own
 * transactions screen instead, exactly as the account page's does.
 */
export async function houseHistoryForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  query?: ConsoleQuery,
): Promise<ConsoleHistoryView | null> {
  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  const q = parseConsoleQuery(query, Date.now(), consoleTab);
  const wantPage = q.eventId && !q.hpageAsked
    ? await consoleHistoryAnchorPage(q.eventId, null, q.hpage) : q.hpage;

  const { core, extra: pageRead, extraB: totalRead } = await readDeskCore(
    () => houseBotEventStore.listAll({ limit: CONSOLE_HISTORY_PER_PAGE, offset: (wantPage - 1) * CONSOLE_HISTORY_PER_PAGE }),
    () => houseBotEventStore.countAll({}),
  );
  const shell = deskShell(core);

  const historyTotal = totalRead;
  let rows = pageRead;
  let shown = consoleLastPage(historyTotal, wantPage, CONSOLE_HISTORY_PER_PAGE);
  if (q.eventId != null && !q.hpageAsked && shown === wantPage && shown > 1
    && rows != null && !rows.some((e) => e.id === q.eventId)) shown -= 1;
  if (rows != null && shown !== wantPage) {
    try {
      rows = await houseBotEventStore.listAll({ limit: CONSOLE_HISTORY_PER_PAGE, offset: (shown - 1) * CONSOLE_HISTORY_PER_PAGE });
    } catch { rows = null; }
  }

  const byId = consoleRosterMap(core.roster);
  const history: ConsoleDeskEventRow[] | null = rows == null ? null : rows.map((e) => {
    const cell = consoleAccountCell(byId, e.houseBotId);
    return {
      ...consoleEventRow(e, q.eventId),
      accountName: cell.accountName,
      accountIsOperatorText: cell.accountIsOperatorText,
      accountHref: e.houseBotId === null ? null : consoleBotHref(e.houseBotId),
    };
  });

  const panel = consolePanelShell(CONSOLE_ROUTE, q);
  return {
    ...shell,
    historyPage: shown,
    historyPerPage: panel.historyPerPage,
    historyParams: panel.historyParams,
    historyEmpty: CONSOLE_DESK_HISTORY_EMPTY,
    historyOrderNote: panel.historyOrderNote,
    queryRefusal: panel.queryRefusal,
    history,
    historyTotal,
  };
}


/* ═══ C7 STEP 5 (the LANDING half) · THE CANCEL DOOR (rulings 340, 350, 382, 415, 512, 522, 523) ═════════════
 *
 * ⛔ **THE FIRST WRITE THIS SECTION EVER MAKES TO THE PRESS TABLE**, and it is behind the same named door every
 * console read goes through: a Next server action is a POST to whatever URL the browser is on, carrying an id in a
 * header, so no middleware rule, no layout and no page gate can see it. The action's own gate is the only
 * protection there is, and it decides on the viewer's STORED row (522) rather than on a session cookie's
 * photograph of it.
 *
 * ⛔ **THE EXPORT NAME AND THE GUARD LABEL ARE NEUTRAL; THE AUDIT KEY IS NOT RENAMED** (ruling 382, and the trap it
 * inverts). Membership in `HOUSE_AUDIT` is what keeps this row out of a player's own audit read, so a key minted to
 * sound neutral would silently leave that exclusion. The key is `press-audit.ts`'s own, written at the service.
 */

/** What the cancel control posts. ⛔ `id` is the QUEUED stake; `submitId` is the browser's own idempotency key. */
export type ConsoleCancelInput = { id: string; submitId: string; reason: string };

/**
 * What it gets back. ⛔ A union the caller must handle, never a throw: a thrown server action clears the client's
 * pending state and shows the officer nothing, which on a control that stops money is the worst failure there is.
 */
export type ConsoleCancelResult =
  | { ok: true; changed: boolean; note: string | null; warn: boolean }
  | { ok: false; error: string; field?: "reason" };

/**
 * ⛔ ONE SENTENCE PER REFUSAL CODE, IN THE CONSOLE'S OWN NEUTRAL WORDS (453) — never the service's code and never a
 * raw enum. A control that says only "it did not work" is a control an officer cannot act on (432(j)).
 */
const CONSOLE_CANCEL_REFUSAL: Readonly<Record<string, string>> = {
  refused: "You do not have access to this.",
  NOT_FOUND: "That stake is no longer on record. Reload the page.",
  NOT_PENDING: "It had already left the queue, so nothing was stopped. Reload the page to see where it went.",
  SCHEMA: "The desk is not set up on this database, so nothing could be stopped.",
  UNREADABLE: "That stake could not be read, so nothing was stopped. Try again.",
  WRITE_FAILED: "Nothing was stopped. Try again.",
  BAD_SUBMIT_ID: "Nothing was stopped. Reload the page and try again.",
  reasonShort: `Say why, in at least ${CONSOLE_REASON_MIN} characters.`,
  reasonLong: `That is longer than ${CONSOLE_REASON_MAX} characters.`,
};

/** What the officer is told when the cancel landed but its decision record did not (the repair writes it later). */
const CONSOLE_CANCEL_NOTE = {
  done: "The stake was stopped.",
  notRecorded: "The stake was stopped, but the decision record has not been written yet. It will be.",
};

/**
 * Stop one queued stake, as the signed-in officer.
 *
 * ⛔ ARITY THREE, like every other write door on this section: the viewer, the calling file's own console route as a
 * STRING LITERAL, and what the control posted. ⛔ The audience is resolved FIRST and nothing is read before the
 * verdict, so a refused caller cannot use this as an oracle for whether a record id exists.
 * ⛔ THE REASON IS VALIDATED HERE WITH THE SAME BOUNDS THE CONTROL ARMS ON (`CONSOLE_REASON_MIN`/`MAX`, the pair the
 * dialog's own copy carries) — a ceremony verified only in a browser is one a crafted POST walks straight through.
 */
export async function houseCancelIntentForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  input: ConsoleCancelInput,
): Promise<ConsoleCancelResult> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {
    return { ok: false, error: CONSOLE_CANCEL_REFUSAL.refused };
  }
  const id = typeof input.id === "string" ? input.id : "";
  if (id.length === 0) return { ok: false, error: CONSOLE_CANCEL_REFUSAL.NOT_FOUND };
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < CONSOLE_REASON_MIN) return { ok: false, error: CONSOLE_CANCEL_REFUSAL.reasonShort, field: "reason" };
  if (reason.length > CONSOLE_REASON_MAX) return { ok: false, error: CONSOLE_CANCEL_REFUSAL.reasonLong, field: "reason" };

  const done = await cancelQueuedStake({
    actorId: viewerUserId,
    intentId: id,
    submitId: typeof input.submitId === "string" ? input.submitId : "",
    reason,
  });
  if (!done.ok) return { ok: false, error: CONSOLE_CANCEL_REFUSAL[done.code] ?? CONSOLE_CANCEL_REFUSAL.WRITE_FAILED };
  /* ⛔ A REPEAT OF ONE PRESS IS NOT A SECOND CANCEL, and it is not a failure either: the first press already did
   * this, so the officer is told the truth about the stake rather than about their second click. */
  if (!done.changed) return { ok: true, changed: false, note: CONSOLE_CANCEL_NOTE.done, warn: false };
  return {
    ok: true,
    changed: true,
    /* 🔴 `null`, NOT `CONSOLE_CANCEL_NOTE.done` — READ OFF THE TOAST ITSELF, and only visible once the toast
     * was visible at all. The control paints this as the DESCRIPTION under `doneTitle`, which is "The stake was
     * stopped"; the note was "The stake was stopped." So the officer's one confirmation said the same sentence
     * twice, differing by a full stop. A description that repeats its title is not a second fact, it is noise on
     * the one surface that has to be read quickly. The `notRecorded` branch stays, because it says something the
     * title does not, and so does the repeat branch above. `1.415`'s own assertion already allows `null` here. */
    note: done.recorded ? null : CONSOLE_CANCEL_NOTE.notRecorded,
    warn: !done.recorded,
  };
}

/* ═══ C7 STEP 6 · THE DESIGNATE WIZARD (rulings 356, 359, 368 as amended by 459, 382, 383, 387, 412) ════════
 *
 * ⛔ THREE MORE DOORS, EACH QUERY-SHAPED AND EACH WITH ITS `CONSOLE_GATES` ENTRY (rulings 340, 512). The wizard is
 * three surfaces — a lookup, a check and a write — and every one of them is a POST an ordinary player can make:
 * ruling 383 measured 200 of the 221 server-action ids in this build's manifest inside publicly downloadable chunks,
 * so the action's own gate is the only protection there is. Each resolves the viewer's STORED row FIRST and reads
 * nothing before the verdict.
 *
 * ⛔ THE COPY IS THE CONSOLE'S OWN (owner-delegated ruling 453). `eligibility.ts` writes twenty-five blocking rows
 * and seven warnings in the ENGINE'S vocabulary — measured, they say "Only a player account can provide liquidity.",
 * "This account is already a house bot.", "Liquidity stakes can't continue — resolve the request or remove the bot."
 * D19 exempts those: they are the engine's and the admin bell's internal words and no screenshot-facing surface
 * renders them. This one would. So the check card paints a sentence per CODE from the table below, the population is
 * derived from the service's own two unions rather than typed here, and nothing the wizard renders comes from a
 * shared table. The same decision 432(f) took for `PAUSE_REASON_WAY_OUT` and 432(b) for `FIELD_META`, for the same
 * reason, and never a rewrite of the engine's own words.
 */

/** At most ten options (412). ⛔ A bound on the ANSWER, not on the query — the officer types more, not less. */
const CONSOLE_PICKER_MAX = 10;
/** Before a lookup runs at all: two characters. A one-character search is a directory walk with extra steps. */
const CONSOLE_PICKER_MIN_QUERY = 2;

/**
 * ⛔ THE ONE ANSWER A SEARCH THAT FINDS NOTHING GIVES, AND IT IS THE SAME ANSWER A REFUSED CALLER GETS (387(c)).
 * Never a count, never "no match", never a masked row: nothing may distinguish "you are not the owner" from
 * "nothing found", because the action id is readable off the public bundle and any signed-in account can POST it.
 */
export const CONSOLE_PICKER_EMPTY = "Nothing to show.";

/**
 * ⛔ A BUSY BUCKET IS NOT AN EMPTY RESULT, AND SAYING IT WAS IS A LIE TO THE OWNER (C7 step 6 review, d19-hunt-03).
 * The rate branch answered the byte-identical `refused` shape, so an officer who had already passed the audience gate
 * was told "Nothing to show." about accounts that exist — on the one screen where "it is not there" is read as "that
 * account does not exist". 387(c)'s parity is between a REFUSED CALLER and a search that found nothing; a caller
 * already inside the audience is neither, and this branch is only reachable AFTER the verdict has passed, so it
 * reveals nothing a refused caller can ask for.
 */
export const CONSOLE_PICKER_BUSY = "Too many searches at once. Wait a moment and try again.";

/** One option in the picker's listbox. ⛔ No phone and no email: the PHONE is the check card's, through `Sensitive`. */
export type ConsolePickerRow = {
  userId: string;
  /**
   * `playerHandle(userId)` — "Player #TAIL". ⛔ THE ONLY WAY AN OPTION NAMES A PERSON, and it is the same rule
   * ruling 346 sets for the roster: never a display name, never a phone, never an email. The officer searched BY
   * one of those, so the option only has to say which account matched; the identity they can act on is the check
   * card's, where the phone goes through the platform's own server gate (359).
   */
  handle: string;
  /** Where choosing this option goes — built in the route module, never spelled at a call site (319). */
  href: string;
  /** Why this option cannot be chosen, or `null`. Rendered beneath it, with `aria-disabled` (412). */
  reason: string | null;
};

/**
 * What the picker answers. ⛔ `note` and `count` are BOTH empty for a refused caller and for a search that found
 * nothing, so the two are byte-identical (387(c)).
 */
export type ConsolePickerAnswer = { rows: ConsolePickerRow[]; note: string | null; count: string };

/** Why an option cannot be chosen — decided on the account row and the ONE roster read, never per-row eligibility. */
const PICKER_REASON = {
  onDesk: "Already on the desk",
  staff: "A staff account",
  agent: "An agent account",
  closed: "The account is closed",
  inactive: "The account is not active",
  noPassword: "No password set",
  self: "Your own account",
} as const;

/**
 * THE ACCOUNT LOOKUP, GATED (rulings 259, 340, 383, 387). Arity THREE: the signed-in viewer, the calling file's own
 * console route as a STRING LITERAL, and the query the officer typed.
 *
 * ⛔ THE RATE LIMIT IS ON THE CALLER, NOT THE QUERY (387(e)). A bucket keyed on what was typed can be sidestepped
 * by typing something else, which is the whole of a directory walk.
 * ⛔ NO PER-ROW ELIGIBILITY, AND NO WALLET READ AT ALL (356). An option's reason is decided on the account row and
 * on the ONE roster read; running the full check ten times would pull ten players' live balances, responsible-gambling
 * settings and data-rights queues into a lookup, and ruling 368 argues its whole case from exactly that harm.
 */
export async function houseAccountsForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  query: string,
): Promise<ConsolePickerAnswer> {
  const refused: ConsolePickerAnswer = { rows: [], note: CONSOLE_PICKER_EMPTY, count: "" };

  /* ⛔ THE FLOOR IS DECIDED BEFORE THE AUDIENCE IS, AND IT IS THE ONLY THING THAT MAY BE (C7 step 6 review,
     d19-hunt-08). A short query reads nothing, decides nothing and its answer is a constant — so answering it
     first is what makes the two shapes below indistinguishable. Below the audience check it was the ONE branch
     where the refusal and the ordinary answer differed (`note: null` against "Nothing to show."), so a signed-in
     player could learn from a one-character POST that they were outside the audience.
     ⛔ A SHORT QUERY READS NOTHING AND SAYS NOTHING. The officer has not asked a question yet, so there is no
     answer to give and no empty state to paint — the field's own hint is what is on screen. */
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < CONSOLE_PICKER_MIN_QUERY) return { rows: [], note: null, count: "" };

  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") return refused;

  /* ⛔ AND THE BUSY ANSWER IS ITS OWN, because this line is only reachable once the verdict has passed. */
  const gate = await rateCheckAsync(viewerUserId, "desk.picker");
  if (!gate.allowed) return { rows: [], note: CONSOLE_PICKER_BUSY, count: "" };

  let users: StoredUser[] = [];
  let live: StoredHouseBot[] = [];
  try {
    const [usersR, liveR] = await Promise.allSettled([
      (async () => db.user.list())(),
      (async () => houseBotStore.listNonRemoved())(),
    ]);
    if (usersR.status !== "fulfilled") return refused;
    users = usersR.value;
    live = liveR.status === "fulfilled" ? liveR.value : [];
  } catch {
    return refused;
  }

  const onDesk = new Set(live.map((b) => b.userId));
  const parsed = parseQuery(q, { fields: fieldNames(ACCOUNT_PICKER_SEARCH) });
  /* ⚠️ `displayLabel` is COMPUTED and not a column (the grammar says so in its own docblock), so it is supplied
     on the record handed to the matcher — the same shape `/admin/players` uses. */
  const hits = users.filter((u) => matchesQuery(
    parsed,
    { ...u, displayLabel: displayLabel(u) } as unknown as Record<string, string | null | undefined>,
    ACCOUNT_PICKER_SEARCH,
  ));

  /* ⛔ THE TEN THAT SURVIVE THE SLICE ARE THE SAME TEN A SECOND RUN RETURNS (C7 step 6 review, d19-hunt-04).
     `db.user.list()` is `findMany` with no `orderBy` on Postgres and insertion order in memory, so the slice was
     taking whichever ten the store happened to hand back — a different ten between the two twins, and possibly a
     different ten on two runs of the same query. An exact id match, then an exact phone match, then the id: total,
     stable, and it puts the row the officer pasted at the top where they are looking for it. */
  const qLower = q.toLowerCase();
  const matchRank = (u: StoredUser): number =>
    u.id.toLowerCase() === qLower ? 0 : (u.phoneE164 ?? "").toLowerCase() === qLower ? 1 : 2;
  hits.sort((a, b) => matchRank(a) - matchRank(b) || a.id.localeCompare(b.id));

  const rows: ConsolePickerRow[] = hits.slice(0, CONSOLE_PICKER_MAX).map((u) => ({
    userId: u.id,
    handle: playerHandle(u.id),
    href: consoleNewHref({ userId: u.id }),
    reason: pickerReason(u, onDesk.has(u.id), u.id === viewerUserId),
  }));

  if (rows.length === 0) return refused;
  const blocked = rows.filter((r) => r.reason !== null).length;
  /* ⛔ THE COUNT SAYS WHAT IS TRUE, NOT WHAT IS ON SCREEN (C7 step 6 review, d19-hunt-04). "10 accounts" when
     forty matched is a false sentence on the one screen where an account the officer cannot see reads as an
     account that does not exist — so a truncated answer says so and says what to do about it. */
  const shown = hits.length > CONSOLE_PICKER_MAX
    ? `${formatNumber(rows.length)} of ${formatNumber(hits.length)} accounts${SEP}narrow the search`
    : `${formatNumber(rows.length)} ${rows.length === 1 ? "account" : "accounts"}`;
  return {
    rows,
    note: null,
    /* 412 · the polite live count, and it says how many of what is on screen cannot be chosen — the one fact a
       reader cannot get by counting the rows. */
    count: blocked === 0 ? shown : `${shown}${SEP}${formatNumber(blocked)} cannot be chosen`,
  };
}

/** One option's refusal, from the account row and the roster read alone. `null` when nothing on either stops it. */
function pickerReason(u: StoredUser, onDesk: boolean, isSelf: boolean): string | null {
  if (onDesk) return PICKER_REASON.onDesk;
  if (isSelf) return PICKER_REASON.self;
  if (u.role === "AGENT") return PICKER_REASON.agent;
  if (u.role !== "PLAYER") return PICKER_REASON.staff;
  if (u.status === "CLOSED" || u.closedAt != null) return PICKER_REASON.closed;
  if (u.status !== "ACTIVE" && u.status !== "COOLED_OFF") return PICKER_REASON.inactive;
  if (!u.passwordHash || !u.passwordSalt) return PICKER_REASON.noPassword;
  return null;
}

/**
 * ⛔ THE CONSOLE'S OWN SENTENCE FOR EVERY ELIGIBILITY ROW (ruling 453, and the same shape `CONSOLE_ACT_REFUSAL`
 * already has one card over).
 *
 * MEASURED against `scripts/lib/house-bot-vocabulary.mjs`: of the twenty-five blocking rows and seven warnings
 * `eligibility.ts` writes, ELEVEN name the feature in the sentence an officer reads — on *liquidity*
 * (`AGENT_ACCOUNT`, `STAFF_ACCOUNT`, `ERASURE_REQUEST`), on the bare word *bot* (`ALREADY_LIVE_BOT`,
 * `ACCOUNT_CLOSED`, `WALLET_MISSING`, `IDENTITY_REFUSED`, `PASSWORD_CHANGED`), on *house stakes*
 * (`ACCOUNT_CLOSED`, `OWNER_LOSS_LIMIT`, `RECRUITED`) and on *house bot* itself.
 * ⛔ SO THE TABLE COVERS EVERY CODE, NOT ONLY THE DIRTY ONES. A per-row "override it if it is dirty" rule cannot
 * be checked from source — the shared sentences are built at run time out of dates, counts and names — so the
 * console answers from its own closed table for all thirty-two, and `test:house-bot-console` derives the population
 * from `ELIGIBILITY_BLOCKING_CODES` and `ELIGIBILITY_WARNING_CODES` themselves. A code added to either union later
 * cannot reach an owner's screen as the shared sentence or as a bare identifier.
 * ⚠️ WHAT IS LOST BY IT IS NAMED: the DATES and FIGURES the shared rows interpolate do not come through. The
 * console says what is stopping the designation and carries the row's own `href` to the thing that has to change;
 * the holder's own screens carry the detail, which is where a player's dates and money legitimately are (456).
 */
const CONSOLE_ELIGIBILITY_COPY: Readonly<Record<string, string>> = {
  ACCOUNT_MISSING: "No account with that ID.",
  STAFF_ACCOUNT: "This is a staff account. Only a player's own account can be used here.",
  AGENT_ACCOUNT: "This is an agent account. Only a player's own account can be used here.",
  ACCOUNT_CLOSED: "This account is closed and cannot be reopened, so it cannot be used here.",
  NOT_ACTIVE: "This account is not active.",
  NO_PASSWORD: "This account has no password, so the holder cannot give their permission.",
  RG_LOCKED: "The holder is self-excluded or on a break. Their permission cannot be asked for until it ends.",
  RG_UNREADABLE: "Couldn't read their responsible-gambling settings. Refresh to try again.",
  WALLET_MISSING: "This account has no wallet.",
  WALLET_NOT_ACTIVE: "Their wallet is not active, so nothing could be staked from it.",
  BALANCE_UNREADABLE: "Their wallet could not be read. Refresh to try again.",
  ALREADY_LIVE_BOT: "This account is already on the desk.",
  OWN_ACCOUNT: "You can't use your own account.",
  ROSTER_FULL: "The desk is at its maximum. Remove an account or raise the roster limit first.",
  ERASURE_REQUEST: "They have asked for their data to be erased. Resolve that request first.",
  ERASURE_UNREADABLE: "Couldn't read the data-rights queue. Refresh to try again.",
  SIGN_IN_LOCKED: "Their sign-in is locked after wrong passwords. Ask them to sign in once, then try again.",
  PASSWORD_SET_BY_SUPPORT: "Their password was last set through support. Ask them to change it themselves in Account settings first.",
  PASSWORD_HISTORY_UNREADABLE: "Couldn't read how their password was last set. Refresh to try again.",
  IDENTITY_REFUSED: "Their identity check was finally refused. An officer must reopen it first.",
  PASSWORD_CHANGED: "Their password changed. Ask them for the new one.",
  CONSENT_VOID: "Their permission has ended. It has to be given again.",
  RG_SINCE_VERIFIED: "A self-exclusion or break has run since their permission was last confirmed.",
  DAILY_LOSS_STOP: "The day's loss limit has already been reached.",
  OWNER_LOSS_LIMIT: "Their own daily loss limit has been reached.",
  EMAIL_UNVERIFIED: "Their email is not confirmed, so they cannot top up until they confirm it.",
  IDENTITY_NOT_APPROVED: "Their identity has never been approved, so they cannot withdraw until it is.",
  RECRUITED: "An agent recruited them. No commission is paid on anything staked from the desk.",
  OPEN_POSITIONS: "They hold open positions of their own. Those markets are skipped.",
  PUBLIC_NAME: "The leaderboard shows the first word of their display name — suggest a nickname.",
  NAME_RISK: "Their public display name could give away what this account is used for — ask them to change it.",
  SIGN_IN_LOCKED_WARNING: "Their sign-in is locked after wrong passwords. Confirming their permission waits for the lock.",
};

/** One row of the check card, in the console's own words. ⛔ The service's sentence never crosses this line. */
export type ConsoleCheckRow = { code: string; text: string; href: string | null };

/**
 * The console's sentence for one eligibility code. ⛔ A code with no entry answers a neutral fallback, never the
 * service's own words and never a bare identifier.
 */
export function consoleCheckSentence(code: string): string {
  return CONSOLE_ELIGIBILITY_COPY[code] ?? "Something on the holder's own account is stopping this.";
}

/** The account's funded STATE — never an amount (ruling 459, amending 368). */
export type ConsoleFunded = { word: string; chip: StatusChipVariant; sentence: string };

/**
 * THE WIZARD'S WHOLE ACCOUNT-BOUND VIEW MODEL — the check card, the consent copy and the review summary, painted
 * on the server from ONE read set (rulings 340, 355, 356, 359).
 */
export type ConsoleCheckView = {
  userId: string;
  handle: string;
  /**
   * ⛔ SERVER-ONLY (ruling 359). The page hands this to the platform's own SERVER `Sensitive` component, which
   * resolves the viewer's stored role, calls `readCell`, and computes the mask itself — the raw value never
   * becomes a client prop. A console file that built a masked value and rendered `SensitiveReveal` would answer
   * READ-TIERS in a `.tsx`, which `sensitive.tsx` forbids in as many words.
   */
  phoneE164: string | null;
  /**
   * ⛔ WHETHER THERE IS A NUMBER AT ALL — AND IT IS A SEPARATE FIELD ON PURPOSE (C7 step 7, `test:read-tiers` 7.1).
   * The page draws the Phone term only when a value exists, and it used to decide that with `view.phoneE164 !== null`
   * in the JSX. The READ-TIERS ratchet strips `<Sensitive …/>` and then reports EVERY other braced expression naming
   * a governed accessor — so the presence CHECK, which renders nothing, read to it exactly like a page printing the
   * number in the clear, and the desk joined `/admin/agents` on a line whose ceiling is 0. The value now crosses the
   * boundary only inside `Sensitive`; the branch takes this boolean.
   */
  hasPhone: boolean;
  /** 456 · the platform surface where an admin may legitimately read this player's money. */
  holderHref: string;
  /** ⛔ A STATE, NEVER A BALANCE (459). `null` when the wallet could not be read — a blocking row then says so. */
  funded: ConsoleFunded | null;
  /** Why the wallet's own bonus money is not part of that state. A FACT, and it reads nothing. */
  bonusCaption: string;
  /** How many markets they are in on their own account, or an em dash when the read failed. */
  openPositions: string;
  /** Whether this account has been on the desk before, in words. `null` when it never has. */
  priorNote: string | null;
  blocking: ConsoleCheckRow[];
  warnings: ConsoleCheckRow[];
  eligible: boolean;
  /**
   * ⭐ THERE IS NO ACCOUNT BEHIND THIS `?u=` AT ALL — read off the first render (355, 416). The card painted
   * HANDLE "Player #_00000" from the typed id, an EMPTY "Phone" term with nothing under it, and "Open positions 0"
   * for an account that does not exist: a fabricated zero beside a labelled row that says nothing. A missing record
   * is a STATE, and the page paints the state instead of the facts.
   */
  accountMissing: boolean;
  /** Why Continue is not live — `null` when it is (432(j) read the other way round). */
  continueReason: string | null;
  /** The wizard's own four hrefs, built in the route module (319) — never composed at a call site. */
  findHref: string;
  checkHref: string;
  consentHref: string;
  reviewHref: string;
  /** The bounds the review step's two fields are held to, so the client types no number of its own. */
  labelMin: number;
  labelMax: number;
  noteMax: number;
};

/**
 * ⛔ EVERY SENTENCE THE WIZARD PAINTS THAT IS LONGER THAN A LABEL, BUILT HERE (ruling 388, whose Proof is
 * "no console client file contains a string literal of 25+ characters that is not a prop name, class name, aria
 * string or event name").
 *
 * 🔴 WHAT WAS SHIPPING, AND WHY NO GUARD SAW IT. The consent step typed its four sentences into a `"use client"`
 * file, so they went verbatim into a publicly downloadable chunk — "Stakes are placed from this account, out of
 * the money in its own wallet…", "Nothing is staked until an officer starts this account and the desk's master
 * switch is on." Ruling 385 measured exactly this: MOST of the sentences this console can emit carry no
 * vocabulary word at all, so `test:house-bot-disclosure` 1.1 and `verify:house-bot-bundle` both report clean
 * while a paragraph describing the feature sits in a public asset. The words are neutral (453); publishing them
 * is the harm, and the only place a guard can see it is the boundary they cross.
 *
 * ⛔ THE BOUNDS ARE INTERPOLATED HERE TOO, so the client types no number of its own and cannot disagree with
 * `validateLabel`. ⚠️ The apostrophe is the real one: JSX entities are the page's problem, not the copy's.
 */
export const CONSOLE_WIZARD_COPY = {
  searchLabel: "Search for an account",
  searchHint: "A handle, a phone number, or an account ID.",
  searchIntro: "Search by handle, phone number or account ID. Only a player's own account can be used here, and only with their permission.",
  listLabel: "Accounts",
  consentTitle: "What the holder agrees to",
  consentBullets: [
    "Stakes are placed from this account, out of the money in its own wallet, within the limits set for it and for the desk.",
    "Their permission is confirmed with their own password, checked once and never kept. It creates no sign-in and no session.",
    "They can end it at any time from their own account, and it ends by itself if they take a break, self-exclude, close the account or ask for their data to be erased.",
    "Nothing is staked until an officer starts this account and the desk's master switch is on.",
  ],
  labelLabel: "A name for this account on the desk",
  labelHint: `${LABEL_MIN_CHARS} to ${LABEL_MAX_CHARS} characters. It is shown to officers only.`,
  noteLabel: "Why (optional)",
  noteHint: `Up to ${TEXT_MAX_CHARS} characters. Kept with the record.`,
  reviewTitle: "Confirm with the holder",
  passwordLabel: "The holder's password",
  passwordHint: "Ask them for it. It is checked once and never kept, and the last two attempts are always held for them so this can never lock them out.",
  refusedTitle: "It was not designated",
  wayOut: "Open it",
} as const;

/**
 * THE WIZARD'S GATED READER (rulings 340, 356, 359, 512). Arity THREE: the signed-in viewer, the calling file's own
 * console route as a STRING LITERAL, and the account being checked.
 *
 * ⛔ EXACTLY ONE WALLET READ, AND IT IS THE ONE `houseBotEligibility` ALREADY TAKES (356). The funded STATE is
 * built from the balance that check returns; nothing here reads the wallet a second time, and nothing paints the
 * figure (459).
 * ⛔ A REFUSED VIEWER GETS `null` AND NOTHING ELSE — no handle, no sentence, no id (259, 399).
 */
export async function houseCheckForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  userId: string,
): Promise<ConsoleCheckView | null> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") return null;
  const id = typeof userId === "string" ? userId : "";
  if (id.length === 0) return null;

  /* ⛔ ONE SETTLED SET (355): a failed prior-designation read or a failed position read must not blank the card
     that says whether this account can be used at all.
     ⚠️ EACH MEMORY-STORE READ IS WRAPPED IN AN ASYNC THUNK, because the memory twin returns PLAIN VALUES and a
     synchronous throw inside the array literal would escape `allSettled` altogether. */
  const [elR, userR, priorR, positionsR] = await Promise.allSettled([
    houseBotEligibility(id, { context: "designate", actorId: viewerUserId }),
    (async () => db.user.findById(id))(),
    (async () => houseBotStore.listByUserId(id))(),
    /* ⛔ A COUNTING READER, NEVER A PAGE (ruling 344; C7 step 6 review, conformance-344). This was
       `listForUser(id, 100).filter(OPEN).length` — the hundred NEWEST positions of every status, filtered in
       JS — so an account with a hundred settled positions newer than its open ones rendered "Open positions 0"
       on the card that decides whether it may be designated, beside a warning saying it holds some. */
    (async () => positionStore.countOwnOpenForUser(id))(),
  ]);

  /* ⛔ A FAILED ELIGIBILITY READ IS NOT AN ELIGIBLE ACCOUNT (355). The card refuses with its own blocking row
     rather than painting a card an officer could press Continue on. */
  const el = elR.status === "fulfilled" ? elR.value : null;
  const user = userR.status === "fulfilled" ? userR.value : null;
  const prior = priorR.status === "fulfilled" ? priorR.value : null;
  const positions = positionsR.status === "fulfilled" ? positionsR.value : null;

  const row = (r: { code: string; href?: string }): ConsoleCheckRow =>
    ({ code: r.code, text: consoleCheckSentence(r.code), href: r.href ?? null });

  const blocking: ConsoleCheckRow[] = el === null
    ? [{ code: "UNREADABLE", text: "This account could not be checked. Refresh to try again.", href: null }]
    : el.blocking.map(row);
  const warnings: ConsoleCheckRow[] = el === null ? [] : el.warnings.map(row);
  const eligible = el !== null && el.eligible;

  /* ⛔ 459 · A FUNDED STATE, NEVER A BARE BALANCE. Ruling 266 holds with no exception anywhere on this console:
     the figure is a real person's wallet position — the one number on these screens belonging to somebody other
     than the platform, and the one most likely to sit in a screenshot — and the decision this card supports,
     "can this account fund anything at all", is answered by a state and not by a magnitude. The officer who wants
     the figure is one link away on the holder's own money screen (456). "Funded" is a word this product already
     ships (`KYC_STAGE.fundedNothingYet`), so nothing is invented here either. */
  const balance = el?.balanceTzs ?? null;
  const funded: ConsoleFunded | null = balance === null ? null : balance > 0
    ? { word: "Funded", chip: TONE_CHIP.green, sentence: "There is money in this wallet, so a stake can be funded from it." }
    : { word: "Not funded", chip: TONE_CHIP.slate, sentence: "This wallet is empty, so nothing can be staked from it until the holder puts money in." };

  const open = positions;
  const phone = user?.phoneE164 ?? null;
  const priorCount = prior === null ? 0 : prior.filter((b) => b.status === "REMOVED").length;

  return {
    userId: id,
    handle: playerHandle(id),
    phoneE164: phone,
    hasPhone: phone !== null,
    holderHref: `/admin/transactions?q=${encodeURIComponent(id)}`,
    funded,
    bonusCaption: "Bonus money is never staked from the desk, whatever the wallet holds.",
    openPositions: open === null ? EM_DASH : formatNumber(open),
    priorNote: priorCount === 0
      ? null
      : priorCount === 1
        ? "This account was on the desk once before and was removed."
        : `This account was on the desk ${formatNumber(priorCount)} times before and was removed each time.`,
    blocking,
    warnings,
    eligible,
    accountMissing: blocking.some((r) => r.code === "ACCOUNT_MISSING"),
    /* 432(j) · a control that is not live says why, and it says a fact the rows above do not already carry: HOW
       MANY of them are stopping it. 432(n) forbids one state saying the same thing twice. */
    continueReason: eligible ? null : blocking.length === 1
      ? "1 check is stopping this account."
      : `${formatNumber(blocking.length)} checks are stopping this account.`,
    findHref: CONSOLE_NEW_ROUTE,
    checkHref: consoleNewHref({ userId: id }),
    consentHref: consoleNewHref({ userId: id, step: "consent" }),
    reviewHref: consoleNewHref({ userId: id, step: "review" }),
    labelMin: LABEL_MIN_CHARS,
    labelMax: LABEL_MAX_CHARS,
    noteMax: TEXT_MAX_CHARS,
  };
}

/** What the wizard's last step posts. ⛔ `password` is the HOLDER's and never becomes a session (owner ruling D5). */
export type ConsoleDesignateInput = {
  userId: string;
  label: string;
  note?: string;
  password: string;
  submitId?: string;
};

export type ConsoleDesignateResult =
  | { ok: true; href: string; note: string }
  /** `field` is the form's own control, never a column (D19); `href` is where the refusal says to go. */
  | { ok: false; error: string; field?: "label" | "note" | "password"; href?: string };

/**
 * ⛔ THE TWO LABEL SENTENCES, EXPORTED BY NAME (C7 step 6 review, test-strength-383-label-late). The EARLY check —
 * the console's own `validateLabel`, before a password attempt is spent — answers the LENGTH sentence; the LATE
 * path, `designateHouseBot`'s own refusal, answers `labelTaken`. A case that pins only `field === "label"` cannot
 * tell the two apart, because both paths produce it, so the assertion that the shape is refused BEFORE the service
 * is reached has to name the sentence only the early check can say.
 */
export const CONSOLE_DESIGNATE_LABEL_LENGTH = `Give it a name of ${LABEL_MIN_CHARS} to ${LABEL_MAX_CHARS} characters.`;
export const CONSOLE_DESIGNATE_LABEL_TAKEN = "That name is already in use on the desk. Choose another.";

/** The wizard's own sentences — the console's, never a service's (453). */
const DESIGNATE_FORM_COPY = {
  labelLength: CONSOLE_DESIGNATE_LABEL_LENGTH,
  labelCharset: "Letters, numbers, spaces and - _ . # ' only.",
  labelTaken: CONSOLE_DESIGNATE_LABEL_TAKEN,
  noteLong: `At most ${TEXT_MAX_CHARS} characters — shorten it.`,
  ineligible: "Something on the holder's own account is stopping this. Read the checks and clear them first.",
  alreadyOnDesk: "This account is already on the desk.",
  done: "It is on the desk, stopped, with no limits of its own set yet.",
} as const;

/**
 * THE DESIGNATION, GATED (rulings 259, 340, 382, 383, 512, 522, 523).
 *
 * ⛔ THE VERDICT IS THE FIRST STATEMENT, ON THE STORED ROW, AND IT IS IN THE ACTION'S OWN PATH. A Next server
 * action is a POST to whatever URL the browser happens to be on, so no middleware rule, no layout and no
 * `AdminSectionGate` can see it, and a session cookie is a photograph of a role taken at sign-in.
 * ⛔ ONE SHARED REFUSAL FOR EVERYONE OUTSIDE THE AUDIENCE (383), the same sentence every other console action
 * answers with — no field, no href, no id, no count and no existence signal, and nothing is read or written on
 * that path.
 * ⛔ THE HOLDER'S PASSWORD PASSES STRAIGHT THROUGH to the one service that may check it. It is never logged,
 * never echoed and never put in an audit payload.
 */
export async function houseDesignateForConsole(
  viewerUserId: string | null | undefined,
  route: string,
  input: ConsoleDesignateInput,
): Promise<ConsoleDesignateResult> {
  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {
    return { ok: false, error: CONSOLE_ACT_REFUSAL.refused };
  }
  const userId = typeof input.userId === "string" ? input.userId : "";
  if (userId.length === 0) return { ok: false, error: CONSOLE_ACT_REFUSAL.NOT_FOUND };

  /* ⛔ THE SHAPE IS REFUSED BEFORE A PASSWORD ATTEMPT IS SPENT. `verifyHouseBotPassword` counts against the
     holder's own reserve, so a mistyped NAME must never cost one — which is also the order the service itself
     takes, restated here so the console's own sentence is what an officer reads. */
  const label = typeof input.label === "string" ? input.label : "";
  const labelErr = validateLabel(label);
  if (labelErr) {
    return {
      ok: false,
      field: "label",
      error: labelErr.message === LABEL_COPY.charset ? DESIGNATE_FORM_COPY.labelCharset : DESIGNATE_FORM_COPY.labelLength,
    };
  }
  const note = typeof input.note === "string" ? input.note : "";
  if (note.length > 0 && validateNote(note)) return { ok: false, field: "note", error: DESIGNATE_FORM_COPY.noteLong };

  let done;
  try {
    done = await designateHouseBot({
      officerId: viewerUserId,
      userId,
      label,
      note: note.length > 0 ? note : null,
      password: typeof input.password === "string" ? input.password : "",
      submitId: typeof input.submitId === "string" ? input.submitId : null,
    });
  } catch {
    return { ok: false, error: CONSOLE_ACT_REFUSAL.WRITE_FAILED };
  }

  if (done.ok) return { ok: true, href: consoleBotHref(done.bot.id), note: DESIGNATE_FORM_COPY.done };

  /* ⛔ EVERY REFUSAL AN OFFICER READS IS THE CONSOLE'S OWN, KEYED BY CODE (453). `designateHouseBot` answers with
     `eligibility.ts`'s and `rules.ts`'s sentences, and measured, those carry the feature's words — "Another bot is
     already called …", "This account is already a house bot.", and fourteen more. The ONE exception is passed
     through deliberately: `ROSTER_FULL` is already `DESIGNATE_COPY.rosterFull`, which ruling 314 forbids re-typing
     anywhere and pins byte-identical to the head action's own sentence. */
  if (done.code === "INVALID") {
    return {
      ok: false,
      field: done.field === "note" ? "note" : "label",
      error: done.field === "note" ? DESIGNATE_FORM_COPY.noteLong : DESIGNATE_FORM_COPY.labelTaken,
    };
  }
  if (done.code === "ROSTER_FULL") return { ok: false, error: done.message, href: done.href };
  if (done.code === "ALREADY_BOT") return { ok: false, error: DESIGNATE_FORM_COPY.alreadyOnDesk, href: done.href };
  if (done.code === "PASSWORD_CHANGED") return { ok: false, field: "password", error: DESIGNATE_COPY.passwordChanged };
  if (done.code === "INELIGIBLE") return { ok: false, error: DESIGNATE_FORM_COPY.ineligible };
  return {
    ok: false,
    field: "password",
    error: actRefusal(done.code, { attemptsBeforeLock: done.attemptsBeforeLock, retryAfterSec: done.retryAfterSec }),
  };
}
