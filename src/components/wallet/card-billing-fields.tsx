"use client";

/**
 * Billing details for a CARD deposit — shown only when the Card rail is selected.
 *
 * WHY THIS EXISTS: Selcom rejects hosted-checkout card orders that carry no
 * billing information ("Card payments with no billing info will get rejected"),
 * and these fields feed the acquirer's AVS / fraud screening. We therefore ask
 * the player for them rather than synthesising an address — a fabricated billing
 * address is both a misrepresentation to the acquirer and a common reason for an
 * issuer to decline the card.
 *
 * Not persisted: we pass them straight through to the gateway for this one order
 * and keep nothing on the user record. That is deliberate — it is card-adjacent
 * PII with no other use in the product, so the least we can hold is none (PDPA
 * data-minimisation). The cost is re-typing on a repeat card deposit; revisit
 * only if that becomes a real complaint.
 *
 * Visibility is CSS-driven off the provider radio (`group-has-[…]`) to match
 * ProviderRadioGrid's no-JS-state pattern, so the section appears the instant
 * Card is picked without a client round-trip.
 *
 * ⚠️ These inputs deliberately carry NO html `required`: the block is hidden (not
 * unmounted) when a mobile-money rail is selected, and a hidden required field
 * silently blocks form submission with an un-focusable validation bubble. The
 * server is the authority instead — `depositAction` rejects a CARD deposit that
 * is missing any billing field, with a message naming the field.
 */
import { Field, Input } from "@/components/ui/input";
import { FieldLegend } from "@/components/ui/field-legend";

export type CardBillingCopy = {
  legend: string;
  why: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  region: string;
  postcode: string;
};

export function CardBillingFields({
  copy,
  defaults,
}: {
  copy: CardBillingCopy;
  /** Re-hydrated from the error redirect so a failed deposit never makes the
   *  player retype an address. */
  defaults?: Partial<Record<"firstName" | "lastName" | "address1" | "city" | "region" | "postcode", string>>;
}) {
  return (
    <div
      // Hidden until the CARD radio is checked. `peer`/`group-has` can't reach a
      // sibling *outside* the fieldset, so the wrapper form carries `group` and we
      // key off the checked card input by id.
      className="hidden group-has-[#provider-CARD:checked]/deposit:block space-y-4 rounded-xl border border-border bg-bg-elevated/40 p-4"
      data-testid="card-billing"
    >
      <div>
        <FieldLegend as="p" className="mb-1">{copy.legend}</FieldLegend>
        <p className="text-[11.5px] leading-relaxed text-text-subtle">{copy.why}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={copy.firstName}>
          <Input
            name="billingFirstName"
            autoComplete="given-name"
            maxLength={60}
            defaultValue={defaults?.firstName ?? ""}
          />
        </Field>
        <Field label={copy.lastName}>
          <Input
            name="billingLastName"
            autoComplete="family-name"
            maxLength={60}
            defaultValue={defaults?.lastName ?? ""}
          />
        </Field>
      </div>

      <Field label={copy.address}>
        <Input
          name="billingAddress1"
          autoComplete="address-line1"
          maxLength={120}
          defaultValue={defaults?.address1 ?? ""}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={copy.city}>
          <Input
            name="billingCity"
            autoComplete="address-level2"
            maxLength={60}
            defaultValue={defaults?.city ?? ""}
          />
        </Field>
        <Field label={copy.region}>
          <Input
            name="billingRegion"
            autoComplete="address-level1"
            maxLength={60}
            defaultValue={defaults?.region ?? ""}
          />
        </Field>
        <Field label={copy.postcode}>
          <Input
            name="billingPostcode"
            autoComplete="postal-code"
            maxLength={20}
            defaultValue={defaults?.postcode ?? ""}
          />
        </Field>
      </div>
    </div>
  );
}
