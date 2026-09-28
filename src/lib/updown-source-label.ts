import type { PublicSourceClass } from "@/lib/server/updown-symbols";

/**
 * E-53 · the ONE map from a price's market class to the phrase a player is shown.
 *
 * Ali's decision: player surfaces name the KIND of market — *Live crypto market*,
 * *Live stock market*, *Live metals market*, *Live currency market* — and never the data
 * vendor. Which supplier 50pick buys market data from is an operational detail, and the
 * standing rule is that player surfaces do not narrate internal ops.
 *
 * ⛔ ONE MAP, ONE PLACE. The board card and the round page both need this, and the round
 * page ALSO needs it in the settlement-proof panel. Three copies of a five-arm switch is
 * how one surface keeps saying "Source: api.twelvedata.com" long after the others stopped
 * — which is exactly the shape of E-49/E-56, where a cell and its own sort accessor each
 * carried a private copy of the same expression and drifted.
 *
 * ⚠️ These are dict KEYS, not strings. Returning English here would defeat the point on a
 * trilingual product — and a key that exists in the type but not in the dictionary is
 * indistinguishable from a live one until a reader sees raw enum text (E-1).
 *
 * ⚠️ LONG-FORM MARKETS DO NOT USE THIS. They cite EWURA, TMA and other public
 * authorities, and those stay named and linked: that is how a player checks a settlement
 * against the body that actually published the number.
 */
export const SOURCE_CLASS_KEY: Record<PublicSourceClass, "udSourceCrypto" | "udSourceStock" | "udSourceMetals" | "udSourceFx" | "udSourceGeneric"> = {
  crypto:  "udSourceCrypto",
  stock:   "udSourceStock",
  metals:  "udSourceMetals",
  fx:      "udSourceFx",
  generic: "udSourceGeneric",
};

/**
 * Source's own / our observed time in EAT (Africa/Nairobi), with the zone stated — a
 * receipt without a timezone is not auditable.
 *
 * Hoisted here 2026-09-04 (session 80, E-262): the round detail page held this privately
 * and the board chart panel gained the same receipt line — a second private copy is the
 * drift this file's own header exists to stop.
 */
export const fmtEAT = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
  return `${s} EAT`;
};

/** Built once: an `Intl.DateTimeFormat` is the expensive part, and only the instant varies. */
let EAT_CLOCK: Intl.DateTimeFormat | null = null;

/**
 * An instant as the EAT wall clock, "14:26" — 24-hour, HH:MM, no zone suffix (landing v3, R5).
 *
 * The landing's Up & Down band stamps every verdict with the minute of its confirmed read ("saa 14:26").
 * ⛔ NO "EAT" ON THE BAND (the review's I-9): the zone is stated in the band's track description and on
 * the round page, which keeps `fmtEAT` above. The same zone as `fmtEAT`, so the band's "14:26" and the
 * round page's "14:26:00 EAT" are one reading. Null for an instant that is not a number.
 */
export const fmtEATClock = (ms: number): string | null => {
  if (!Number.isFinite(ms)) return null;
  // `hourCycle: "h23"`, not `hour12: false`: the latter lets some engines print a midnight minute "24:05".
  EAT_CLOCK ??= new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return EAT_CLOCK.format(new Date(ms));
};
