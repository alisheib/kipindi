/**
 * MASWALI MILLIONEA — NO QUESTION ABOUT POLITICS (MASWALI-BUILD S2; R-CATEGORIES, MASWALI-PLAN S2 item 7).
 *
 * The Gaming Board's licence terms exclude political-event markets, and the platform holds that rule in its category
 * list (`markets/categories.ts` has no `politics`). A Millionea question is written by an officer, not chosen from a
 * category alone, so the open ALSO reads its English and Swahili words: a question about an election, a referendum or a
 * political party is refused whatever category it was filed under. The list is the subject matter the licence excludes,
 * nothing more — a sports question that mentions a club's "president" passes, because the club is not politics.
 *
 * Pure and isomorphic: the draft form shows the same refusal the open enforces.
 */

/** Whole words or phrases, lower case, in the two languages the binding text is written in. */
const BANNED_TOPIC_TERMS: readonly string[] = [
  // English
  "election", "elections", "electoral", "referendum", "political", "politics", "politician", "political party",
  "parliamentary seat", "presidential race", "presidential election", "ballot",
  // Kiswahili
  "uchaguzi", "siasa", "kisiasa", "mwanasiasa", "wanasiasa", "chama cha siasa", "vyama vya siasa", "kura ya maoni",
  "kampeni ya uchaguzi", "mgombea urais", "mgombea ubunge",
];

const norm = (s: string) => ` ${s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

/** The banned terms a text contains, as whole words. Empty when it is clean. */
export function bannedTopicHits(text: string): string[] {
  const t = norm(text);
  return BANNED_TOPIC_TERMS.filter((term) => t.includes(` ${term} `));
}
