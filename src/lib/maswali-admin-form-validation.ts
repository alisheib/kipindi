import { licenceRefLengthOk } from "./maswali-ceremony-bounds";

/** Match the money service's amount/reference gate before opening its confirmation. */
export function validGuaranteeDraft(amount: string, reference: string): boolean {
  const value = Number(amount);
  const ref = reference.trim();
  return /^\d+$/.test(amount) && Number.isSafeInteger(value) && value > 0 && ref.length >= 5 && ref.length <= 120;
}

export type GuaranteeReview = { mode: "fund" | "return"; amount: string; reference: string };

/** Freeze the values shown in the money confirmation and sent to the action. */
export function guaranteeReviewDraft(mode: GuaranteeReview["mode"], amount: string, reference: string): GuaranteeReview | null {
  if (!validGuaranteeDraft(amount, reference)) return null;
  return { mode, amount: String(Number(amount)), reference: reference.trim() };
}

export type LicenceReview = { kind: "OWNER_RULING" | "GBT_WRITTEN" | "NONE"; ref: string; label: string };

/** Match the licence service's canonical reference before review and submission. */
export function licenceReviewDraft(kind: string, ref: string): LicenceReview | null {
  if (kind === "NONE") return { kind, ref: "", label: "None (withdraw it)" };
  if (kind !== "OWNER_RULING" && kind !== "GBT_WRITTEN") return null;
  const canonicalRef = ref.trim().replace(/\s+/g, " ");
  if (!licenceRefLengthOk(canonicalRef)) return null;
  return { kind, ref: canonicalRef, label: kind === "GBT_WRITTEN" ? "The Gaming Board's letter" : "The Owner's dated ruling" };
}

/** Match the share service's required decision length inside its confirmation. */
export function validShareDecision(text: string): boolean {
  const length = text.trim().length;
  return length >= 5 && length <= 300;
}

export type SunsetCandidate = { id: string; code: string; state: string };
export const SUNSET_LOOKUP_THRESHOLD = 12;
export const SUNSET_MATCH_LIMIT = 20;

/** A long Owner action list requires a code lookup; no candidate is silently preselected. */
export function sunsetChoices(weeks: readonly SunsetCandidate[], raw: string): { rows: SunsetCandidate[]; total: number; needsLookup: boolean } {
  const needsLookup = weeks.length > SUNSET_LOOKUP_THRESHOLD;
  const query = raw.trim().toLocaleUpperCase("en");
  const matches = query ? weeks.filter((week) => week.code.toLocaleUpperCase("en").includes(query)) : needsLookup ? [] : [...weeks];
  return { rows: matches.slice(0, SUNSET_MATCH_LIMIT), total: matches.length, needsLookup };
}

/**
 * Review the exact target and the consequence before the typed final-week confirmation. A draft's notice is the stop's own
 * rule (`sunsetMaswali`, S7-F): a full week — or, while a closed week's results are being decided and no week is on sale,
 * less for the next week to open, its buyers told at purchase.
 */
export function sunsetConfirmText(week: SunsetCandidate): { title: string; body: string } {
  return {
    title: `Make ${week.code} the final week?`,
    body: week.state === "DRAFT"
      ? `${week.code} is a draft. The service requires a full week's notice before it opens — or, while a closed week's results are being decided and no week is on sale, less if it is the next week to open (OD-03). Once this final week runs, no later week can open; if no ticket gets 10 of 10, the top score shares the jackpot.`
      : `${week.code} becomes final at once. Once this final week runs, no later week can open; if no ticket gets 10 of 10, the top score shares the jackpot.`,
  };
}
