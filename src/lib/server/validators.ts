/**
 * Zod schemas — single source of truth for input validation.
 * Server-side enforcement; client-side is convenience only.
 *
 * Compliance notes:
 *  - PII fields (NIDA, phone, DOB) validated server-side
 *  - Tanzania E.164 phone normalization
 *  - NIDA format check (20-digit numeric per NIDA Act 2008)
 *  - Stake range hard-bound to GBT-approved limits
 */
import { z } from "zod";
import { isOfAge } from "@/lib/id-documents";
import { minWithdrawalForRate } from "@/lib/payout";

// Tanzania mobile number — accepts every common shape the user might type:
//   712 345 678   (just the 9 digits, with optional spaces) — most common,
//                 because the form shows "+255" as a visual prefix
//   0712 345 678  (legacy local format)
//   255712345678
//   +255712345678 (canonical E.164)
// All variants normalise to "+2557…" or "+2556…".
export const tzPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^(?:\+?255|0)?[67]\d{8}$/,
        "Enter a valid Tanzania mobile number",
      )
      .transform((v) => {
        if (v.startsWith("+")) return v;
        if (v.startsWith("255")) return "+" + v;
        if (v.startsWith("0")) return "+255" + v.slice(1);
        if (/^[67]\d{8}$/.test(v)) return "+255" + v;
        return v;
      }),
  );

export const otpCode = z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits");

// ⛔ `nidaNumber` WAS DELETED HERE ON 2026-08-20. It declared a SECOND home for the
// 20-digit NIDA rule, and from that date a NIDA is one of four accepted documents
// rather than the only one. There is now exactly ONE catalogue of identity-number
// rules — `src/lib/id-documents.ts` — so a licence format arriving later is added
// beside its citation instead of racing a copy in the file named "validators".

export const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => {
    // Year sanity: <input type="date"> happily accepts "0019-01-01"
    // when the user types just "19" for the year. That tripped a
    // confusing "must be 18 or older" message even though Ali had
    // typed 1999. Reject any year before 1900 explicitly so the user
    // sees the real reason ("Year must be 1900 or later") and can
    // re-type — separate from the actual age gate below.
    const year = parseInt(v.slice(0, 4), 10);
    return year >= 1900;
  }, "Year must be 1900 or later — please re-type the full year (e.g. 1999)")
  .refine((v) => {
    const dob = new Date(v);
    if (isNaN(dob.getTime())) return false;
    if (dob.getTime() > Date.now()) return false;
    // ⛔ ONE AGE GATE — whole calendar years on the Tanzanian date (`isOfAge`). This was `/ 365.25 days`, which
    // disagreed with the KYC service's own lock for ~12 hours around many birthdays (id-documents.ts).
    return isOfAge(v, new Date());
  }, "You must be 18 or older to register");

export const fullName = z.string().trim().min(2).max(120);

// ⛔ `stakeAmount` and `PlaceBetSchema` were DELETED here on 2026-08-14. They declared a
// TZS 100 minimum and a TZS 500,000 maximum against a football-match bet shape this
// platform does not have, and NOTHING imported them — so they were a fourth, unenforced
// version of the stake rule sitting in the file named "validators". The real bounds are
// PLATFORM_MIN_STAKE / PLATFORM_MAX_STAKE in src/lib/payout.ts, resolved per market by
// getEffectiveConfig + stakeBoundsForUpDownMarket and enforced in buyPosition. A rule
// stated in a place that never runs is the second version of the truth this whole
// programme exists to remove — see docs/RULES.md.

// Single-transaction money caps — the single source of truth. These drive BOTH
// server enforcement (the schemas below) AND the wallet "Limits" tab display, so
// the numbers a player sees can never drift from what the server actually
// enforces (wallet-client reads them via the server page's `limits` prop).
// ⭐ TZS 1,000 since 2026-10-07 (management, relayed by Ali: "in deposits and in the minimum stake … should be always
// consistently 1000 not 500") — the same figure as the minimum stake (`PLATFORM_MIN_STAKE`). The rule is
// docs/RULES.md §1; every surface that states it (the deposit hint, the chatbot, the Limits tab) is filled from here.
export const DEPOSIT_MIN_TZS = 1_000;
export const DEPOSIT_MAX_TZS = 2_000_000;
export const WITHDRAW_MIN_TZS = 1_000;
export const WITHDRAW_MAX_TZS = 5_000_000;
const tzs = (n: number) => n.toLocaleString("en-US");

/**
 * THE SMALLEST WITHDRAWAL A PLAYER MAY ASK FOR — the one figure every surface states (owner ruling 2026-10-07: the
 * withdraw screen states the TRUE minimum, never a typed "1,000").
 *
 * It is the larger of the platform's gross floor (`WITHDRAW_MIN_TZS`) and the gross whose NET still clears the
 * gateway's own floor at the live fee (`minWithdrawalForRate`) — TZS 1,015 at a 1.5% fee (the fee rounds). The withdraw hint, the
 * action's out-of-range refusal, the confirm dialog's check and the wallet's Limits tab all print THIS, so the number a
 * player reads is the number the server refuses below. ⚠️ Pass the LIVE `withdrawalFeeRate` (`getEffectiveConfig()`):
 * the fee is admin-tunable, which is exactly why the figure is derived and never typed.
 */
export function withdrawMinFor(withdrawalFeeRate: number): number {
  return Math.max(WITHDRAW_MIN_TZS, minWithdrawalForRate(withdrawalFeeRate));
}

export const depositAmount = z
  .number()
  .int()
  .min(DEPOSIT_MIN_TZS, `Minimum deposit is TZS ${tzs(DEPOSIT_MIN_TZS)}`)
  .max(DEPOSIT_MAX_TZS, `Single deposit cap is TZS ${tzs(DEPOSIT_MAX_TZS)}`);

export const withdrawAmount = z
  .number()
  .int()
  .min(WITHDRAW_MIN_TZS, `Minimum withdrawal is TZS ${tzs(WITHDRAW_MIN_TZS)}`)
  .max(WITHDRAW_MAX_TZS, `Single withdrawal cap is TZS ${tzs(WITHDRAW_MAX_TZS)}`);

/** A real, deliverable email address. REQUIRED at sign-up: it is where the verification link
 *  and account notices go, and a CONFIRMED address is what a withdrawal needs (owner ruling
 *  2026-10-07, beside an approved identity). ⚠️ Until 2026-10-07 a confirmed address unlocked the
 *  first DEPOSIT instead; that gate is deleted — a deposit asks no email question at all, and the
 *  player's record of every deposit and withdrawal is in the app (/wallet/receipts), mailed or not.
 *  Normalised to lower-case here so uniqueness and lookups can never drift on case. */
export const emailAddress = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, { message: "Enter your email address" })
  .max(254, { message: "That email address is too long" })
  .email({ message: "Enter a valid email address" });

export const RegisterSchema = z.object({
  phone: tzPhone,
  email: emailAddress,
  dob: dateOfBirth,
  acceptTerms: z.literal(true, { message: "You must accept the Terms" }),
  acceptAge: z.literal(true, { message: "You must confirm you are 18+" }),
  // ⛔ No `marketingOptIn`: the sign-up SMS-offers box was REMOVED on 2026-10-07 (COMPLIANCE-DECISIONS § "2026-10-07 ·
  // Marketing SMS go to anyone with a phone — consent is not a condition"), so sign-up records no marketing choice.
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginRequestSchema = z.object({
  phone: tzPhone,
});
export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;

// no purpose field: the server decides (verifyOtpAndAuth consumes a login code only)
export const OtpVerifySchema = z.object({ phone: tzPhone, code: otpCode });
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;

/**
 * THE IDENTITY STEP — any ONE of four Tanzanian documents (owner decision, Ali
 * 2026-08-19). Replaces `KycNidaSchema`, which could only describe a NIDA.
 *
 * ⛔ THE NUMBER'S RULE IS NOT HERE, AND THAT IS DELIBERATE. Each document has its
 * own — one published, one advisory, two openly absent — and they live in exactly
 * one place, `src/lib/id-documents.ts`, so tightening a licence format later is a
 * one-line change there with its citation beside it. A second copy of the rule in
 * this file is how two validators come to disagree. This schema checks the SHAPE of
 * the submission (a real type, a non-empty number, a plausible expiry) and hands the
 * number to `validateIdNumber`, which is also what gives a refusal a `reason` the
 * player's own language can render.
 *
 * ⭐ `dob` IS THE AGE GATE FOR ALL FOUR TYPES. Only a NIDA number carries a date of
 * birth inside it, so an age check derived from the NUMBER would be silently
 * NIDA-only — a control that passes because the feature is absent. `dateOfBirth`
 * refuses anyone under 18 whatever document they chose.
 */
export const KycIdentitySchema = z.object({
  idType: z.enum(["NIDA", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD"], {
    errorMap: () => ({ message: "Choose which identity document you are using." }),
  }),
  idNumber: z.string().trim().min(1, "Enter your document number").max(40),
  // Only the two documents that HAVE an expiry send one; `""` is "not applicable",
  // never "unknown". The per-type requirement is enforced in kyc-service, which can
  // name the document in the refusal.
  idExpiry: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .or(z.literal(""))
    .optional(),
  fullName,
  dob: dateOfBirth,
});
export type KycIdentityInput = z.infer<typeof KycIdentitySchema>;

export const DepositSchema = z.object({
  provider: z.enum(["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "CARD"]),
  amount: depositAmount,
  msisdn: tzPhone.optional(),
  /** The journey funnel's origin (Vodacom plan S3b): only "low_balance" is a value; absent = a direct deposit. */
  origin: z.enum(["low_balance"]).optional(),
});
export type DepositInput = z.infer<typeof DepositSchema>;

/**
 * TEMPORARY admin testing deposit — relaxes the TZS 2,000,000 single-deposit
 * cap so an operator can fund a wallet with as much play-money as needed to
 * test deposits / referrals / proposals. Gated to ADMIN roles in
 * wallet-service and switchable off via ADMIN_TEST_DEPOSITS=false. Remove with
 * the bypass when test funding is no longer needed.
 */
export const AdminDepositSchema = z.object({
  provider: z.enum(["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "CARD"]),
  // The floor is the player's own (`DEPOSIT_MIN_TZS`, 2026-10-07) — it read a typed 500, a second definition of the rule.
  amount: z.number().int().min(DEPOSIT_MIN_TZS, `Minimum deposit is TZS ${tzs(DEPOSIT_MIN_TZS)}`).max(1_000_000_000, "Admin test-deposit cap is TZS 1,000,000,000"),
  msisdn: tzPhone.optional(),
});

export const WithdrawSchema = z.object({
  // Mobile-money payouts only (Selcom Wallet Cashin). BANK_TRANSFER was removed —
  // it has no account-capture and routes to a different rail (Qwiksend), so offering
  // it here only produced a PROVIDER_DOWN failure. Bank payouts are a separate epic.
  provider: z.enum(["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX"]),
  amount: withdrawAmount,
  // REQUIRED: the payee mobile number is where the money is sent. It was previously
  // optional server-side while required client-side — the mismatch is closed here.
  msisdn: tzPhone,
  // Optional because no withdrawal step-up SMS check is built: the withdraw path never reads
  // this field. The SMS rail itself is live (Blackball, since 2026-09-16), so this is no longer
  // waiting on a provider (corrected 2026-09-25). Today's payout protections are listed in
  // src/app/wallet/withdraw/actions.ts (identity approval, registered-number binding, the
  // per-withdrawal cap). We do NOT present an OTP field that isn't actually enforced.
  otpCode: otpCode.optional(),
});
export type WithdrawInput = z.infer<typeof WithdrawSchema>;

export const ResponsibleLimitsSchema = z.object({
  dailyDeposit: z.number().int().nonnegative().optional(),
  weeklyDeposit: z.number().int().nonnegative().optional(),
  monthlyDeposit: z.number().int().nonnegative().optional(),
  dailyLoss: z.number().int().nonnegative().optional(),
  sessionMin: z.number().int().min(15).max(480).optional(),
  realityCheckMin: z.number().int().min(15).max(120).optional(),
});

// 🔴 `SelfExclusionSchema` DELETED 2026-09-07 — unreferenced, and it required an OTP self-exclusion does not.
