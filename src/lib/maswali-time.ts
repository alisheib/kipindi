/**
 * MASWALI MILLIONEA — AN EVENT'S OWN CLOCK (MASWALI-BUILD S2; MASWALI-PLAN MR-5, MB-29, the S2 clock-change cases).
 *
 * A question's event happens in ITS zone: a match in London, a price close in New York, the rain in Dar es Salaam. The
 * officer types the start as the source prints it — a local date and time — and names the IANA zone; this converts it to
 * the UTC instant every comparison uses (the close guard, the void deadline, the fixture-drift watch).
 *
 * ⛔ THE CLOCKS CHANGE DURING THE FIRST WEEKS: Europe falls back on Sunday 25 October 2026 and the United States on
 *    Sunday 1 November 2026. A local time inside a fall-back hour happens TWICE, and one inside a spring-forward gap never
 *    happens at all. Both are REFUSED, never guessed: a kickoff read an hour wrong moves the sales close across an event.
 *
 * Isomorphic: `Intl.DateTimeFormat` with a `timeZone` — the zone database the runtime ships, no library to drift.
 */

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

/** Is this an IANA zone the runtime knows? */
export function isKnownZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return typeof zone === "string" && zone.length > 0;
  } catch {
    return false;
  }
}

/** The zone's offset from UTC at one instant, in milliseconds (local = utc + offset). */
export function zoneOffsetMs(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

export type ZonedResult =
  | { ok: true; utcMs: number }
  | { ok: false; reason: "malformed" | "unknown_zone" | "nonexistent" | "ambiguous" };

/**
 * ⭐ A local "YYYY-MM-DDTHH:MM" in `zone` → its UTC instant, or the reason it has none.
 *   · `nonexistent` — inside a spring-forward gap (the clock skips it);
 *   · `ambiguous`   — inside a fall-back hour (the clock shows it twice): the officer must give the instant another way.
 */
export function zonedToUtcMs(local: string, zone: string): ZonedResult {
  const m = LOCAL_RE.exec(local);
  if (!m) return { ok: false, reason: "malformed" };
  if (!isKnownZone(zone)) return { ok: false, reason: "unknown_zone" };
  const [y, mo, d, h, mi] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(naive).getUTCMonth() !== mo - 1 || new Date(naive).getUTCDate() !== d) return { ok: false, reason: "malformed" };
  // Every UTC instant whose local reading in `zone` is exactly this wall time. Offsets in use are within ±14 h, and a
  // change moves them by at most a few hours, so trying the offsets either side of the naive guess finds them all.
  const candidates = new Set<number>();
  for (const probe of [naive - 14 * 3_600_000, naive - 3 * 3_600_000, naive, naive + 3 * 3_600_000, naive + 14 * 3_600_000]) {
    const utc = naive - zoneOffsetMs(probe, zone);
    if (utc + zoneOffsetMs(utc, zone) === naive) candidates.add(utc);
  }
  if (candidates.size === 0) return { ok: false, reason: "nonexistent" };
  if (candidates.size > 1) return { ok: false, reason: "ambiguous" };
  return { ok: true, utcMs: [...candidates][0] };
}

/** The local "YYYY-MM-DDTHH:MM" an instant reads as in `zone` — what the register prints beside the EAT time. */
export function utcToZonedLocal(utcMs: number, zone: string): string {
  const local = new Date(utcMs + zoneOffsetMs(utcMs, zone));
  return local.toISOString().slice(0, 16);
}
