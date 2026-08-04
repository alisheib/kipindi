/**
 * THE PRICE-READING METHODS — one list, read by the server validator AND by the console.
 *
 * ── WHY THIS FILE HAS NO IMPORTS ─────────────────────────────────────────────
 * Same reason `updown-durations.ts` has none, and the same defect it was created to fix:
 * `updown-feed.ts` reaches `node:crypto`, so a client component cannot import it — and the
 * reading-method form therefore hand-copied the union as `"mock" | "twelvedata"`. A provider
 * added server-side would have been **accepted by the action and unreachable from every
 * screen**: a server accepting a value no operator can ask for. Exactly what happened to
 * `ALLOWED_DURATIONS` when both admin consoles carried their own copy of `[5, 15, 30]`.
 *
 * ── AND IT IS THE ROLLBACK LEVER ─────────────────────────────────────────────
 * ⛔ Switching provider is an audited config edit with NO deploy. That is what makes the
 * settlement rebuild safe to ship: if the dated reader misbehaves on production, an operator
 * returns to the quote reader in one click. A provider missing from this list cannot be
 * selected — which also means it cannot be switched away from.
 */

export type FeedProviderId = "mock" | "mock-bars" | "twelvedata" | "twelvedata-bars";

export type FeedProviderSpec = {
  id: FeedProviderId;
  /** Operator-facing name. */
  label: string;
  /** What this method actually does, in the operator's terms — not the vendor's. */
  blurb: string;
  /** Invents prices. Must never settle real money; gated behind a type-to-arm confirmation. */
  simulated?: boolean;
  /** Needs `TWELVEDATA_API_KEY` on the service. */
  needsKey?: boolean;
  /** Answers "the price at a NAMED INSTANT" rather than "the price now". */
  dated?: boolean;
};

/**
 * Order is the order the operator sees. The recommended method is first.
 *
 * ⚠️ The blurbs state the CONSEQUENCE, not the mechanism. An operator choosing between these
 * is deciding whether rounds can be settled late, which is a money question, and "reads a
 * time series endpoint" does not tell them that.
 */
export const FEED_PROVIDERS: readonly FeedProviderSpec[] = [
  {
    id: "twelvedata-bars",
    label: "Market data · 1-minute bars",
    blurb:
      "Asks for the price at the round's exact minute. Because that price can be fetched again " +
      "later, a close performed late still settles correctly instead of voiding — and anyone can " +
      "re-check the number we settled on.",
    needsKey: true,
    dated: true,
  },
  {
    id: "twelvedata",
    label: "Market data · live quote",
    blurb:
      "Asks for the price right now. If the close is not performed within the staleness window, " +
      "the price is gone and the round voids and refunds — even though nothing was wrong with the " +
      "market.",
    needsKey: true,
  },
  {
    id: "mock",
    label: "Simulated (development only)",
    blurb:
      "Invents a price. Refused outright in production — it must never settle real money.",
    simulated: true,
  },
  {
    id: "mock-bars",
    label: "Simulated · dated (development only)",
    blurb:
      "Invents a price for the round's exact minute, so a late close still settles. Refused " +
      "outright in production — it must never settle real money.",
    simulated: true,
    dated: true,
  },
];

export function findProvider(id: string): FeedProviderSpec | undefined {
  return FEED_PROVIDERS.find((p) => p.id === id);
}

/** Is this a provider the platform knows? The one gate the config validator applies. */
export function isFeedProviderId(v: unknown): v is FeedProviderId {
  return typeof v === "string" && FEED_PROVIDERS.some((p) => p.id === v);
}
