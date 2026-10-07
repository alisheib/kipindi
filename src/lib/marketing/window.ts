/**
 * U13 · THE SEND WINDOW — no marketing SMS outside 08:00–20:00 East Africa Time, or the hours the owner sets instead (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.8; decisions D13 · OQ5 · E2c · E9 · E14 · M12). PURE AND CLIENT-SAFE: the send
 * path (`dispatchSlice`), the officer's test send and the composer's Test card all read THIS rule, so what the card says up
 * front and what the server refuses can never disagree. Pinned in `test:client-graph-safe`.
 *
 * ⭐ ONE CONSTANT, ONE RULE. The default hours are `SEND_WINDOW_EAT` — OQ5's one named constant, declared in the settings
 * module (`./sms-settings`) and RE-EXPORTED here, never written twice. The hours the send path obeys are the pair the owner
 * saved on Admin → System → Marketing SMS (E14), and a pair is obeyed only when the settings' OWN rule accepts it
 * (`marketingSmsSettingsProblems`: 07:00–19:00 to start, 09:00–21:00 to end, on the quarter hour, at least 2 hours) — this
 * file holds no second copy of those bounds.
 *
 * ⭐ THE ARITHMETIC, WRITTEN OUT. Tanzania keeps UTC+3 all year (no daylight saving since 1931), so Africa/Dar_es_Salaam is
 * the fixed offset `EAT_OFFSET_MS` (`../eat-day`) — never a timezone library. An instant is moved by the offset; its EAT day
 * begins at that day's midnight; the window is HALF-OPEN within the day: open from the start's first millisecond up to,
 * but not including, the end's. So at the default hours 08:00:00.000 is open, 19:59:59.999 is open and 20:00:00.000 is
 * closed. A window never spans midnight (the bounds keep the end after the start), so "today" and "tomorrow" are EAT days.
 *
 * ⛔ IT FAILS CLOSED. Hours the settings rule refuses (a missing or non-number field, a fraction, an hour off the quarter, a
 * reversed or too-short window) and an instant that is not a finite date give a window that is CLOSED whatever the clock
 * says — reason `window_unreadable` — and that says nothing about when it opens, because nothing is known. A hold costs
 * only time (the rows stay outstanding, E9); a message sent outside the hours the owner chose breaks 50pick's own rule.
 *
 * ⛔ 50pick's own rule, not a TCRA rule — no law sets these hours (OQ5).
 */
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import {
  MARKETING_SMS_SETTINGS_DEFAULTS, SEND_WINDOW_EAT, formatWindow, marketingSmsSettingsProblems, minuteLabel,
} from "@/lib/marketing/sms-settings";

/** OQ5 · the default hours — the ONE constant, declared in `./sms-settings` and re-exported, never copied. */
export { SEND_WINDOW_EAT };

/** The hours a window is read from: the settings record's own two fields, minutes after midnight EAT (E14). */
export type SendWindowHours = { windowStartMinute: number; windowEndMinute: number };

/** Why a window is closed: outside its hours, or hours that could not be read (closed whatever the clock says). */
export type SendWindowClosedReason = "quiet_hours" | "window_unreadable";

export type SendWindowState = {
  /** May a marketing SMS leave at this instant? ⛔ Never true for hours that could not be read. */
  open: boolean;
  /** The next instant it opens, as ISO: today's start before it, tomorrow's from the start on (so, while it is open,
   *  tomorrow's) — never in the past. Blank when the hours could not be read. */
  opensAt: string;
  /** The next instant it closes, as ISO: today's end before it, tomorrow's from the end on — never in the past. Blank when
   *  the hours could not be read. */
  closesAt: string;
  /** The hours as people read them — "08:00–20:00 EAT". Blank when they could not be read. */
  label: string;
  /** The time it opens — "08:00". Blank when the hours could not be read. */
  opensAtTime: string;
  /** Null while open; why it is closed otherwise. */
  reason: SendWindowClosedReason | null;
  /** The instant this answer was judged at, as ISO — the send path adds its own elapsed time to it at the wire, so a slice
   *  judged open just before the close never reaches the network after it (the U13 review's SP-1). Blank when the hours
   *  could not be read. */
  judgedAt: string;
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** A Date prints instants up to 8.64e15 ms either side of 1970; two days inside that there is always a "tomorrow" to name. */
const LAST_INSTANT_MS = 8.64e15 - 2 * DAY_MS;

/** The default hours as a pair — `SEND_WINDOW_EAT`'s two values, read from the constant itself. */
const DEFAULT_HOURS: Readonly<SendWindowHours> = Object.freeze({
  windowStartMinute: SEND_WINDOW_EAT.startMinute,
  windowEndMinute: SEND_WINDOW_EAT.endMinute,
});

/**
 * ⛔ THE PAIR THE SEND PATH MAY OBEY — the two hours judged by the settings' OWN rule, the one the Marketing SMS card and its
 * server setter run (never a second copy of it): whole minutes on the quarter hour, a start from 07:00 to 19:00, an end from
 * 09:00 to 21:00, at least 2 hours apart. Anything else is null, and a null pair is a CLOSED window.
 */
export function sendWindowHoursOf(hours: unknown): SendWindowHours | null {
  if (hours === null || typeof hours !== "object" || Array.isArray(hours)) return null;
  const { windowStartMinute, windowEndMinute } = hours as Record<string, unknown>;
  if (typeof windowStartMinute !== "number" || typeof windowEndMinute !== "number") return null;
  const judged = marketingSmsSettingsProblems({ ...MARKETING_SMS_SETTINGS_DEFAULTS, windowStartMinute, windowEndMinute }, 0);
  return judged.ok ? { windowStartMinute: judged.value.windowStartMinute, windowEndMinute: judged.value.windowEndMinute } : null;
}

/** ⛔ The window for hours that could not be read: CLOSED whatever the clock says, and silent about when it opens. */
export function sendWindowUnreadable(): SendWindowState {
  return { open: false, opensAt: "", closesAt: "", label: "", opensAtTime: "", reason: "window_unreadable", judgedAt: "" };
}

/**
 * ⭐ THE RULE — open or closed at `nowMs` for these hours (`SEND_WINDOW_EAT` when none are given), with the next opening and
 * the next closing. Half-open: open from the start's first millisecond, closed from the end's. Hours the settings rule
 * refuses, and an instant that is not a finite date, are a CLOSED window (`sendWindowUnreadable`).
 */
export function sendWindowState(nowMs: number, hours: SendWindowHours = DEFAULT_HOURS): SendWindowState {
  const h = sendWindowHoursOf(hours);
  if (h === null || !Number.isFinite(nowMs) || Math.abs(nowMs) > LAST_INSTANT_MS) return sendWindowUnreadable();
  const moved = nowMs + EAT_OFFSET_MS;
  const eatMidnight = Math.floor(moved / DAY_MS) * DAY_MS;
  const sinceMidnight = moved - eatMidnight;
  const startMs = h.windowStartMinute * MINUTE_MS;
  const endMs = h.windowEndMinute * MINUTE_MS;
  const open = sinceMidnight >= startMs && sinceMidnight < endMs;
  /** This EAT day's midnight, as the UTC instant it is. */
  const midnight = eatMidnight - EAT_OFFSET_MS;
  const opensAt = sinceMidnight < startMs ? midnight + startMs : midnight + DAY_MS + startMs;
  const closesAt = sinceMidnight < endMs ? midnight + endMs : midnight + DAY_MS + endMs;
  return {
    open,
    opensAt: new Date(opensAt).toISOString(),
    closesAt: new Date(closesAt).toISOString(),
    label: formatWindow(h),
    opensAtTime: minuteLabel(h.windowStartMinute),
    reason: open ? null : "quiet_hours",
    judgedAt: new Date(nowMs).toISOString(),
  };
}
