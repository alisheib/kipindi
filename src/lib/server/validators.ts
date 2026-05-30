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

export const nidaNumber = z
  .string()
  .trim()
  .regex(/^\d{20}$/, "NIDA number must be 20 digits");

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
    const now = Date.now();
    if (dob.getTime() > now) return false;
    const age = (now - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  }, "You must be 18 or older to register");

export const fullName = z.string().trim().min(2).max(120);

export const stakeAmount = z
  .number()
  .int("Stake must be a whole TZS amount")
  .min(100, "Minimum stake is TZS 100")
  .max(500_000, "Maximum stake is TZS 500,000");

export const depositAmount = z
  .number()
  .int()
  .min(500, "Minimum deposit is TZS 500")
  .max(2_000_000, "Single deposit cap is TZS 2,000,000");

export const withdrawAmount = z
  .number()
  .int()
  .min(1_000, "Minimum withdrawal is TZS 1,000")
  .max(5_000_000, "Single withdrawal cap is TZS 5,000,000");

export const RegisterSchema = z.object({
  phone: tzPhone,
  dob: dateOfBirth,
  acceptTerms: z.literal(true, { message: "You must accept the Terms" }),
  acceptAge: z.literal(true, { message: "You must confirm you are 18+" }),
  marketingOptIn: z.boolean().optional().default(false),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginRequestSchema = z.object({
  phone: tzPhone,
});
export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;

export const OtpVerifySchema = z.object({
  phone: tzPhone,
  code: otpCode,
  purpose: z.enum(["login", "register", "withdraw", "reauth", "self_exclusion"]),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;

export const KycNidaSchema = z.object({
  nida: nidaNumber,
  fullName,
  dob: dateOfBirth,
});
export type KycNidaInput = z.infer<typeof KycNidaSchema>;

export const PlaceBetSchema = z.object({
  matchId: z.string().min(1),
  windowKind: z.enum(["W_0_15", "W_15_30", "W_30_45", "W_45_60", "W_FT"]),
  outcome: z.enum(["home", "away", "draw"]),
  stake: stakeAmount,
});
export type PlaceBetInput = z.infer<typeof PlaceBetSchema>;

export const DepositSchema = z.object({
  provider: z.enum(["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "CARD"]),
  amount: depositAmount,
  msisdn: tzPhone.optional(),
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
  amount: z.number().int().min(500, "Minimum deposit is TZS 500").max(1_000_000_000, "Admin test-deposit cap is TZS 1,000,000,000"),
  msisdn: tzPhone.optional(),
});

export const WithdrawSchema = z.object({
  provider: z.enum(["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "BANK_TRANSFER"]),
  amount: withdrawAmount,
  msisdn: tzPhone.optional(),
  // Optional until the licensed SMS provider (Selcom/Beem) is signed — the
  // withdrawal is gated by KYC + AML + (planned) step-up SMS verification.
  // We do NOT present an OTP field that isn't actually enforced.
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

export const SelfExclusionSchema = z.object({
  duration: z.enum(["24h", "7d", "30d", "6m", "permanent"]),
  reason: z.string().max(500).optional(),
  otpCode,
});
