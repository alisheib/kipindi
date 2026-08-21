/**
 * THE PAYMENT METHODS — one catalogue, one place, per rail.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * `"MPESA"` is a storage token. **"M-Pesa" is a brand name a Tanzanian reads on
 * their own statement**, and until this file there were EIGHT places that turned
 * one into the other — the deposit chooser, the deposit confirmation, the withdraw
 * chooser, the withdraw confirmation, the wallet Methods tab, the receipt page, the
 * admin transactions lexicon, and the wallet service's notification copy. Two of
 * them said so out loud: the receipt page called itself a *"local mirror of
 * wallet-service's label map"*, and both confirmation sheets named
 * `payment-ops.ts`'s `MNOS` as the thing they were copying. A mirror is a second
 * definition. A ninth rail, a renamed brand (Tigo Pesa → **Mixx by Yas** already
 * happened) or a corrected spelling had to be made in eight places or the player
 * was told two different names for the money that just left their phone.
 *
 * DESIGN_AUTHORITY §L2: *if you find a mapping in two places, DELETE one.*
 *
 * ── ⛔ CLIENT-SAFE, AND THAT IS THE POINT ────────────────────────────────────
 * **This module has no imports and must never gain one.** The reason the maps
 * multiplied is that the only shared lists lived under `src/lib/server/`
 * (`payment-ops.ts`, `payments.ts`, `wallet-service.ts`), which a client component
 * cannot import — pulling Prisma and `node:` builtins into a browser chunk is the
 * break CLAUDE.md records for `hashKey64`. So every surface wrote its own instead.
 * A catalogue the browser cannot read is not a single source of truth.
 *
 * ── ⚠️ WHY "METHOD" AND NOT "PROVIDER" ──────────────────────────────────────
 * `PaymentProviderId` IS ALREADY TAKEN, and it means something else:
 * `server/payment-control.ts` uses it for the **aggregator** we route through
 * (`"mock" | "selcom" | "azampay"`). Two different unions under one identifier, both
 * inside the payments domain, is the exact defect this file exists to remove — so
 * the rail vocabulary is `PaymentMethodId` here, which is also the word the player
 * reads ("choose your payment method") and the word `wallet-client.tsx` already
 * uses for its tile type. ⛔ Do not "tidy" this back to `PaymentProviderId`.
 * (`PayoutRail` in `selcom.ts` is a third, narrower thing again — a Selcom
 * disbursement code such as `WALLET_CASHIN`.)
 *
 * ── THE NAMES ARE NOT COPY, SO THEY ARE NOT TRANSLATED ───────────────────────
 * ⛔ These strings do NOT belong in `i18n-dict.ts` and must never be routed
 * through it. "M-Pesa" is "M-Pesa" in English, Swahili and Chinese; it is spelled
 * the way its owner spells it. `.replace(/_/g, " ")` on any of them produces
 * "TIGO PESA" / "HALO PESA" — misspellings of two real Tanzanian brands, on the
 * page an operator reconciles against a Selcom statement.
 *
 * ── WHAT IS *NOT* SETTLED HERE ───────────────────────────────────────────────
 * `hue` is the tile hue for a method whose official mark has not been delivered
 * (see `components/wallet/payment-logo.tsx` — once the SVG lands the hue is unused
 * on that path). The five values below are the ones the PLAYER surfaces ship
 * today. ⚠️ `/admin/payments` carries its own `MNO_HUE` on four of them
 * (150/25/240/290 against 152/22/80/280) and it is genuinely different, not a
 * rounding of the same intent — folding it in would change what an officer sees,
 * which is a redesign, not a consolidation. It is left where it is on purpose.
 */

/** Every rail a `Transaction.provider` may name. Storage vocabulary. */
export type PaymentMethodId =
  | "MPESA"
  | "TIGO_PESA"
  | "AIRTEL_MONEY"
  | "HALO_PESA"
  | "MIXX"
  | "TTCL_PESA"
  | "CARD"
  | "BANK_TRANSFER"
  | "INTERNAL";

/**
 * The mobile-money rails a player can actually pick in the product.
 *
 * ⚠️ NOT the same set as `PaymentMethodId`. `TIGO_PESA` and `TTCL_PESA` appear on
 * historical rows and in the admin filter but are not offered in a chooser, and
 * `CARD` / `BANK_TRANSFER` / `INTERNAL` are not mobile money at all.
 */
export type MobileMoneyMethodId = "MPESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX";

export type PaymentMethodSpec = {
  id: PaymentMethodId;
  /** Brand spelling, verbatim. Never translated, never de-underscored. */
  name: string;
  /** Tile hue for the initials placeholder; `null` where no surface ships one. */
  hue: number | null;
  /** Is this one of the four mobile-money rails a player chooses between? */
  mobileMoney: boolean;
};

/**
 * ⛔ THE ORDER IS THE ORDER `/admin/transactions` FILTERS IN, and the four
 * mobile-money entries fall in the order every player chooser renders them. Both
 * were lifted from the shipped surfaces, so adopting this list moves nothing.
 */
export const PAYMENT_METHODS: Readonly<Record<PaymentMethodId, PaymentMethodSpec>> = {
  MPESA:         { id: "MPESA",         name: "M-Pesa",        hue: 152,  mobileMoney: true },
  TIGO_PESA:     { id: "TIGO_PESA",     name: "Tigo Pesa",     hue: null, mobileMoney: false },
  AIRTEL_MONEY:  { id: "AIRTEL_MONEY",  name: "Airtel Money",  hue: 22,   mobileMoney: true },
  HALO_PESA:     { id: "HALO_PESA",     name: "HaloPesa",      hue: 80,   mobileMoney: true },
  MIXX:          { id: "MIXX",          name: "Mixx by Yas",   hue: 280,  mobileMoney: true },
  TTCL_PESA:     { id: "TTCL_PESA",     name: "TTCL Pesa",     hue: null, mobileMoney: false },
  CARD:          { id: "CARD",          name: "Card",          hue: 200,  mobileMoney: false },
  BANK_TRANSFER: { id: "BANK_TRANSFER", name: "Bank transfer", hue: null, mobileMoney: false },
  /** Not a gateway at all — a movement that never left 50pick (stake, payout,
   *  bonus, adjustment). "Internal" is what the ledger calls it. */
  INTERNAL:      { id: "INTERNAL",      name: "Internal",      hue: null, mobileMoney: false },
};

/** Filter / export order for the admin transactions console. */
export const PAYMENT_METHOD_IDS = Object.keys(PAYMENT_METHODS) as readonly PaymentMethodId[];

/** The four rails, in chooser order. Derived — a fifth is added once, above. */
export const MOBILE_MONEY_METHODS: readonly PaymentMethodSpec[] =
  PAYMENT_METHOD_IDS.map((id) => PAYMENT_METHODS[id]).filter((m) => m.mobileMoney);

export function isPaymentMethodId(v: unknown): v is PaymentMethodId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, v);
}

export function isMobileMoneyMethodId(v: unknown): v is MobileMoneyMethodId {
  return isPaymentMethodId(v) && PAYMENT_METHODS[v].mobileMoney;
}

/**
 * The brand name for a rail, or `null` when the token is unknown or absent.
 *
 * ⛔ RETURNS `null` RATHER THAN A FALLBACK ON PURPOSE. The call sites do not agree
 * on what an unknown rail should read as, and each is right about its own page: a
 * wallet notification says "Mobile money", a receipt line says "—", the admin
 * console de-underscores the raw token so an officer can still see WHICH unknown
 * value the row carries. Baking one of those in here would silently change the
 * other two. Callers keep their own `?? …`.
 */
export function paymentMethodName(id: string | null | undefined): string | null {
  return isPaymentMethodId(id) ? PAYMENT_METHODS[id].name : null;
}

/** Tile hue for a rail, or `null` when it has none (see the header). */
export function paymentMethodHue(id: string | null | undefined): number | null {
  return isPaymentMethodId(id) ? PAYMENT_METHODS[id].hue : null;
}
