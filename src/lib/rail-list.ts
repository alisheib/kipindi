/**
 * "M-Pesa, Airtel Money, HaloPesa or Mixx by Yas" — a list of wallet names, joined the way the
 * reader's own language joins a list of alternatives.
 *
 * ⭐ THE CONJUNCTION IS NOT TYPED ANYWHERE. `Intl.ListFormat` with `type: "disjunction"` supplies
 * "or" / "au" / "或" and the separators ("," in en and sw, "、" in zh), so the dictionary carries
 * only the sentence around the list ("Deposit and withdraw with {rails}.") and never a name.
 * The names are brand spellings from `payment-providers.ts` — never translated, never dict keys.
 *
 * ⭐ PARTS, NOT A STRING: each name is an `element` part so the hero can set it in its own span
 * (the wallet names are the row's emphasis), while the joiners stay plain text.
 *
 * Client-safe on purpose — no imports but a type — so the guard (`test:hero-copy` §3) can call the
 * exact function the hero renders through.
 */
import type { Locale } from "@/lib/i18n-dict";

/** The BCP-47 tag each locale formats lists with. en is British English, like the rest of the product. */
export const LIST_TAG: Readonly<Record<Locale, string>> = { en: "en-GB", sw: "sw", zh: "zh" };

export type RailPart = { rail: boolean; text: string };

/** The list as parts: `rail: true` for a name, `false` for a joiner. An empty list is no parts. */
export function railListParts(locale: Locale, names: readonly string[]): RailPart[] {
  if (names.length === 0) return [];
  return new Intl.ListFormat(LIST_TAG[locale], { type: "disjunction" })
    .formatToParts([...names])
    .map((p) => ({ rail: p.type === "element", text: p.value }));
}

/** The same list as one string — what a reader sees, for the guard and for plain-text surfaces. */
export function railListText(locale: Locale, names: readonly string[]): string {
  return railListParts(locale, names).map((p) => p.text).join("");
}
