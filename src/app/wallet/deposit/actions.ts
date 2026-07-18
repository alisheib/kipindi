"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { deposit } from "@/lib/server/wallet-service";
import { db } from "@/lib/server/store";
import { displayLabel } from "@/lib/display-label";
import type { DepositInput } from "@/lib/server/validators";
import type { CardCheckoutContext } from "@/lib/server/payments";

/** Absolute base for the URLs we hand Selcom to send the buyer back to. Must be
 *  the real public host — a relative path is meaningless to the gateway. */
const BASE_URL = () => (process.env.NEXT_PUBLIC_APP_URL || "https://www.50pick.tz").replace(/\/+$/, "");

export async function depositAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const amount = parseInt(String(formData.get("amount") ?? "0"), 10);
  // Pass the chosen provider through (don't coerce to MPESA) — the schema validates it.
  const provider = String(formData.get("provider") ?? "") as DepositInput["provider"];
  const msisdn = formData.get("msisdn") ? String(formData.get("msisdn")) : undefined;
  const isCard = provider === "CARD";

  const billing = {
    firstName: String(formData.get("billingFirstName") ?? "").trim(),
    lastName: String(formData.get("billingLastName") ?? "").trim(),
    address1: String(formData.get("billingAddress1") ?? "").trim(),
    city: String(formData.get("billingCity") ?? "").trim(),
    region: String(formData.get("billingRegion") ?? "").trim(),
    postcode: String(formData.get("billingPostcode") ?? "").trim(),
  };

  // Carry form values through the error redirect so the player doesn't
  // have to re-enter provider + amount + phone (+ billing) on a failure.
  const carry = new URLSearchParams();
  carry.set("provider", provider);
  carry.set("amount", String(amount));
  if (msisdn) carry.set("msisdn", msisdn);
  if (isCard) {
    if (billing.firstName) carry.set("bFirst", billing.firstName);
    if (billing.lastName) carry.set("bLast", billing.lastName);
    if (billing.address1) carry.set("bAddr", billing.address1);
    if (billing.city) carry.set("bCity", billing.city);
    if (billing.region) carry.set("bRegion", billing.region);
    if (billing.postcode) carry.set("bPost", billing.postcode);
  }
  const fail = (message: string): never =>
    redirect((`/wallet/deposit?error=${encodeURIComponent(message)}&${carry.toString()}`) as never);

  // Canonical bounds — must match the depositAmount schema (validators.ts) and
  // the "Min TZS 500" helper text on the form. Single source of truth: 500–2,000,000.
  if (!Number.isFinite(amount) || amount < 500 || amount > 2_000_000) {
    fail("Enter an amount between TZS 500 and TZS 2,000,000.");
  }

  // ── Rail-specific requirements, enforced HERE because the form can't ───────
  // The card-billing block and the handset field are hidden (not unmounted) by
  // CSS depending on the chosen rail, and an html `required` on a hidden field
  // blocks submission with an un-focusable bubble. So the server is the single
  // authority, and the messages name the missing field so the player can act.
  let card: CardCheckoutContext | undefined;
  if (isCard) {
    const missing = (
      !billing.firstName ? "first name" :
      !billing.lastName ? "last name" :
      !billing.address1 ? "street address" :
      !billing.city ? "city" :
      !billing.region ? "region" :
      !billing.postcode ? "postcode or P.O. box" :
      null
    );
    // Selcom rejects card orders with incomplete billing info, and these fields
    // feed the acquirer's fraud screening — so we stop here rather than send a
    // half-filled order and surface an opaque gateway decline instead.
    if (missing) fail(`Enter your billing ${missing} to pay by card.`);

    const user = await db.user.findById(session.userId);
    if (!user?.email) fail("Add and confirm your email address before paying by card.");

    // `order_id` is pre-seeded by US — Selcom appends payment_status + transid on
    // the return but does NOT echo order_id back. Without this the return page
    // would have no way to know which deposit it is looking at.
    const ref = `${BASE_URL()}/wallet/deposit/return`;
    card = {
      buyerEmail: user!.email!,
      buyerName: displayLabel(user!),
      buyerPhone: user!.phoneE164,
      billing: {
        firstName: billing.firstName,
        lastName: billing.lastName,
        address1: billing.address1,
        city: billing.city,
        stateOrRegion: billing.region,
        postcodeOrPobox: billing.postcode,
        country: "TZ",
        phone: user!.phoneE164,
      },
      redirectUrl: ref,
      cancelUrl: `${ref}?cancelled=1`,
    };
  } else if (!msisdn) {
    // Mobile money has nowhere to push the USSD prompt without a number. The
    // adapter would return a bare DECLINED; say the useful thing instead.
    fail("Enter the mobile-money number to send the payment prompt to.");
  }

  const idempotencyKey = formData.get("idempotencyKey") ? String(formData.get("idempotencyKey")) : undefined;
  const result = await deposit(session.userId, { provider, amount, msisdn }, idempotencyKey, card);
  revalidatePath("/wallet");

  if (!result.ok) {
    // The email gate is a recoverable STATE, not a form error — send the player
    // to the gate surface (which offers resend / change address) rather than
    // re-rendering the form with a message they can't act on.
    if (result.code === "EMAIL_UNVERIFIED") redirect("/wallet/deposit" as never);
    return fail(result.error);
  }
  const data = result.data!;

  // CARD: the money hasn't moved — the buyer still has to enter their card on
  // Selcom's hosted page. Hand them off. The txn is already PROCESSING with its
  // providerRef stored, so whatever happens next (they pay, cancel, or close the
  // tab) the return leg and the reconcile sweep can both resolve it.
  if (data.redirectUrl) redirect(data.redirectUrl as never);

  // status is CONFIRMED for synchronous providers, PROCESSING when the provider
  // collects asynchronously (we credit on the webhook). The modal reflects both.
  redirect(`/wallet?deposited=${data.txnId}&amount=${amount}&status=${data.status}` as never);
}
