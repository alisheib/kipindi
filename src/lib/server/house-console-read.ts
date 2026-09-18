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
import { CONSOLE_ROUTE, CONSOLE_LIMITS_HREF, CONSOLE_LIMITS_FIRST_UNSET_HREF, DEFAULT_TAB, type ConsoleTab } from "@/lib/house-bot/console-routes";
import { eatDayKey, formatEat } from "@/lib/house-bot/clock";
import { FIELD_META, LIMIT_FIELDS, REQUIRED_FOR_MASTER_ON, isClearExempt, parseHouseBotRules, type LimitField } from "@/lib/house-bot/rules";
import { saveHouseBotLimits } from "./house-bot/limits-save";
import { TONE_CHIP, type StatusChipVariant } from "@/lib/status-tone";
import { houseBotControlStore, houseBotStore, houseBookStore, houseBotIntentStore, HouseSchemaNotReady, type StoredHouseBot, type StoredHouseBotControl } from "./house-bot-dal";
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
  /** Why the master switch is disabled, beside it, whenever it is drawn (432(j)). ⛔ Never the same words as
   *  `actionReason` — the two sit about 105px apart at 1280 and read as a rendering fault when they match. */
  switchReason: string;
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
type DeskCore = {
  dayKey: string;
  schemaMissing: boolean;
  controlUnreadable: boolean;
  control: StoredHouseBotControl | null;
  roster: StoredHouseBot[] | null;
  dayBooks: Map<string, HouseDayBook> | null;
  exposure: Map<string, number> | null;
};

async function readDeskCore<T>(extra: (dayKey: string) => Promise<T>): Promise<{ core: DeskCore; extra: T | null }> {
  const dayKey = eatDayKey(Date.now());
  const [controlR, rosterR, dayR, exposureR, extraR] = await Promise.allSettled([
    houseBotControlStore.get(),
    houseBotStore.listNonRemoved(),
    houseDayBooks(dayKey),
    houseBookStore.openExposure(null),
    extra(dayKey),
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
    },
    extra: extraR.status === "fulfilled" ? extraR.value : null,
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
    switchReason: "The switch is not ready on this build yet.",
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

  const { core, extra: parseCtx } = await readDeskCore(() => loadParseContext());
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
export function consoleLimitLabel(field: LimitField): string {
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
export function unsetCaptionFor(field: string): string {
  if ((REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field)) return "Not set — the master switch cannot be turned on.";
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
function limitValue(field: LimitField, raw: number | null): string {
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
function unsetUsageRow(name: string, field: LimitField): ConsoleUsageRow {
  const r = usageRow(name, 0, null);
  return { ...r, unsetCaption: unsetCaptionFor(field), unsetLinked: (REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field) };
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
      return limit == null ? unsetUsageRow(name, field) : usageRow(name, used, limit);
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
      caption: unset ? unsetCaptionFor(field) : null,
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
