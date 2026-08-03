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
