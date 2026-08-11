/**
 * WALL CLOCK → INSTANT. The inverse of everything in `utils.ts`.
 *
 * `utils.ts` has nine helpers that turn an instant into a string in the platform
 * timezone. Not one of them goes the other way, and the admin market wizard needed
 * that direction — so it used the only thing to hand:
 *
 *     fd.set("resolutionAt", new Date(resolutionAt).toISOString());   // wizard.tsx
 *
 * `resolutionAt` there comes from `<input type="datetime-local">`, which yields a
 * BARE WALL CLOCK — `2026-08-15T14:30`, no zone, no offset. `new Date()` parses that
 * in the BROWSER's timezone. So the instant a poll resolves at was decided by the
 * officer's laptop clock settings rather than by the platform, and an officer working
 * from anywhere other than EAT published a poll that resolves at a different absolute
 * moment from the one they typed and confirmed on the review step.
 *
 * 🔴 THAT IS A MONEY DEFECT, and this campaign has already measured the mechanism at
 * one-minute resolution: a poll closing at 01:30 read BTC 63,993 at the console but
 * 64,014.51 on the 1-minute bar AT the deadline — it crossed one minute LATE, and
 * resolving on the wrong instant would have paid the wrong side. A timezone slip is
 * that same error multiplied by hours. ⚠️ And every cloud/CI session runs on UTC, so a
 * poll created from one was silently three hours off.
 *
 * ── WHY THE ZONE IS A PARAMETER AND NOT A CONSTANT ──────────────────────────────
 * There are already TWO timezone conventions in this repo and they disagree:
 *   · `eat-day.ts` pins a FIXED `EAT_OFFSET_MS` (+3h), with a good argument — Tanzania
 *     has had no DST since 1931, so the constant is exact rather than approximate.
 *   · `utils.ts` reads an ADMIN-CONFIGURABLE `getPlatformTimezone()` for every
 *     player-visible time, resolution display and sentinel prompt.
 *
 * An officer reads every other timestamp in the console through the second one. So the
 * wizard's wall clock has to be interpreted the same way, or the review step would echo
 * a time in one convention and store it in another. Hence: the caller passes the zone,
 * and the server — which is where `getPlatformTimezone()` lives and is authoritative —
 * is what supplies it. ⛔ Do not hardcode +3 here; that would make a third convention.
 *
 * No timezone library, for the reason `eat-day.ts` gives: a dependency that can change
 * its mind about EAT is a worse risk than this arithmetic. `Intl` ships with the
 * runtime and its zone database is the platform's own.
 */

/** A bare wall clock: `YYYY-MM-DDTHH:mm`, optional `:ss`, no zone, no offset. */
const WALL_CLOCK_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * True when a string carries NO zone information, and so means nothing until someone
 * says which clock it was read off.
 *
 * ⛔ This is the discriminator the whole fix rests on, so it is deliberately strict:
 * anything with a `Z`, a `+hh:mm` or a `-hh:mm` is already an instant and must be left
 * alone. Re-interpreting an instant as a wall clock would shift it by the offset in
 * the WRONG direction — a worse bug than the one being fixed.
 */
export function isBareWallClock(s: string): boolean {
  return WALL_CLOCK_RE.test(s.trim());
}

/**
 * The offset of `timeZone` from UTC, in milliseconds, AT a given instant.
 *
 * Positive east of Greenwich (EAT returns +10_800_000). Computed by asking `Intl` what
 * the local clock reads at that instant and diffing against the instant itself — which
 * is why it is correct across DST boundaries in zones that have them, without knowing
 * anything about their rules.
 *
 * Returns 0 for an unknown zone rather than throwing: a bad admin config must not take
 * down poll creation, and 0 degrades to UTC, which is at least a defined answer.
 */
export function tzOffsetMsAt(timeZone: string, atMs: number): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23", // ⛔ NOT hour12:false — that can yield hour "24" on some engines
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(atMs));
  } catch {
    return 0;
  }
  const at = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const localAsUtc = Date.UTC(at("year"), at("month") - 1, at("day"), at("hour"), at("minute"), at("second"));
  return localAsUtc - atMs;
}

/**
 * A bare wall clock, read as if on `timeZone`'s clock, as a UTC instant (ISO string).
 * `null` when the input is not a bare wall clock — callers must handle that rather
 * than fall back to `new Date()`, which is the defect this module exists to end.
 *
 * The two-pass correction matters only in zones with DST — EAT has none — but it costs
 * one extra `Intl` call and makes the function correct for any platform timezone an
 * admin can select, which is the point of taking the zone as a parameter at all.
 */
export function wallClockToUtcIso(wall: string, timeZone: string): string | null {
  const m = WALL_CLOCK_RE.exec(wall.trim());
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  if (!Number.isFinite(naive)) return null;
  // First guess: the offset at the naive instant. Then re-evaluate AT the candidate —
  // near a DST transition the two differ and the second answer is the right one.
  const firstPass = naive - tzOffsetMsAt(timeZone, naive);
  const secondPass = naive - tzOffsetMsAt(timeZone, firstPass);
  return new Date(secondPass).toISOString();
}

/**
 * Normalise whatever a form sent into a UTC instant.
 *
 * A bare wall clock is read on `timeZone`'s clock; anything already carrying a zone is
 * returned untouched. This is what lets the wizard send a raw `datetime-local` value
 * while any caller that already builds a proper ISO instant keeps working unchanged.
 */
export function toUtcIso(value: string, timeZone: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (isBareWallClock(v)) return wallClockToUtcIso(v, timeZone);
  const parsed = Date.parse(v);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
