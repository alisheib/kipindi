/**
 * THE PRODUCT LINES, AND THE ONE PLACE A STORED VALUE BECOMES ONE (MASWALI-BUILD S0.5, the fence).
 *
 * 50pick carries three products on the one `PredictionMarket` table, told apart by `productLine`:
 *   - MARKET  — the long-form Yes/No polls ("Maswali" in the journey's words);
 *   - UPDOWN  — Juu/Chini rounds;
 *   - MASWALI — Maswali Millionea weeks (route `/millionea`; the code keeps the `maswali-*` names, MR-1).
 *
 * ⛔ Before S0.5 every read did `productLine === "UPDOWN" ? "UPDOWN" : "MARKET"`: "not a round" meant "a poll". A
 *    Millionea week read that way is a poll with a one-sided pool, and every poll door (resolve, the sentinel,
 *    settle's one-sided refund, cash-out, the generic settlement queue) would act on it. So a stored value now
 *    becomes a line in exactly one function, `storedProductLine`, and every branch on a line is exhaustive
 *    (`switchLine`, or a `switch` ending in `assertNeverLine`), never a two-way ternary.
 *
 * Isomorphic on purpose: no Prisma, no `server-only`. Client components and the pure label modules import it.
 */

/** Every product line the platform knows, in the order the platform added them. */
export const PRODUCT_LINES = ["MARKET", "UPDOWN", "MASWALI"] as const;

export type ProductLine = (typeof PRODUCT_LINES)[number];

/** True for the three known lines and nothing else (not for NULL, not for a lower-case spelling). */
export function isKnownProductLine(v: unknown): v is ProductLine {
  return typeof v === "string" && (PRODUCT_LINES as readonly string[]).includes(v);
}

const alarmed = new Set<string>();

/**
 * A stored `productLine`, read the one way every store reads it.
 * - NULL or absent → MARKET: the column arrived after the first polls, and every row that predates it is a poll.
 * - A known line → itself. MASWALI is NOT folded into MARKET; that was the defect this module exists to end.
 * - Anything else → an alarm on the server log (once per value) and MARKET, so a corrupt row can never take the
 *   boot or a board down. The column gets a CHECK in S1, after which this arm is unreachable.
 */
export function storedProductLine(v: unknown): ProductLine {
  if (v == null) return "MARKET";
  if (isKnownProductLine(v)) return v;
  const key = String(v);
  if (!alarmed.has(key)) {
    alarmed.add(key);
    console.error(`[product-line] ALARM · unknown productLine ${JSON.stringify(key)} read as MARKET — check the row; S1's CHECK should make this impossible`);
  }
  return "MARKET";
}

/** The compile-time end of an exhaustive `switch` on a line: a new line that a switch forgot is a type error. */
export function assertNeverLine(line: never, where: string): never {
  throw new Error(`[product-line] unhandled productLine ${JSON.stringify(line)} at ${where}`);
}

/**
 * An exhaustive branch on a line, as an expression. The arms object must name every line, so adding a line is a
 * compile error at every call site rather than a silent fall-through to "poll".
 */
export function switchLine<T>(line: ProductLine, arms: { readonly [L in ProductLine]: () => T }): T {
  const arm = arms[line];
  if (!arm) return assertNeverLine(line as never, "switchLine");
  return arm();
}
