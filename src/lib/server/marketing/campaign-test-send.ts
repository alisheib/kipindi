/**
 * U37b · THE OFFICER'S TEST SEND — one saved draft, rendered for the officer and sent to the officer's OWN number, and
 * to nobody else (decisions X14 · M9 · M12; plan §9 U37b).
 *
 * ⛔ IT TAKES (campaignId, variant) AND NOTHING ELSE. No number and no body: the recipient is the phone on the
 * officer's own ACCOUNT (read from the store, never from the request, never from the session's photograph), and the
 * text is the STORED draft's, rendered by THE ONE renderer (`renderForRecipient`). Whatever else a browser posts is
 * never read, so a test cannot be turned into a message to a stranger or a message nobody reviewed.
 *
 * ⛔ IT GOES THROUGH THE ONE GATE. `dispatchSlice` asks `mayReceiveMarketingSms` for the officer's number immediately
 * before the send — no bypass (a bypass is D15's second, ungated send path). So an officer needs a recorded SMS consent
 * and a date of birth on their own account, exactly as any recipient does, and the screen names the remedy.
 *
 * ⛔ X14 · THE ONE LIVE SWITCH. With `marketing.sms.live` absent (CLOSED) a real carrier is refused `live_sends_closed`
 * BEFORE anything is minted, written or handed over: no opt-out token, no `SmsMessage` row, no transport call. Only the
 * console stub (no handset, no money) passes while it is closed. Opening it is owner gate G1; every test after that is a
 * real SMS (G3), which is why the officer's budget is small (`marketing.testSend`: 3, then one per 10 minutes).
 *
 * THE ORIGIN IS CHOSEN, NOT DEFAULTED (U37a, OD49): the number is the officer's own account's, so the message renders
 * as an ACCOUNT recipient's — their own first name may print and no source line is added. A contact-book origin would
 * print a source sentence that is false for this number, and is refused anyway while the campaign has no source line.
 *
 * WHAT IS WRITTEN: one masked `marketing.campaign_test` audit row for every attempt that passes the budget (an attempt
 * the budget refuses writes none — a button held down must not fill an unprunable chain); and, when it reaches the
 * wire, the ONE `SmsMessage` row `sendBatch` writes — purpose MARKETING, target `SmsCampaignTest` / the campaign id, so
 * a delivery receipt settles that row and nothing else (the DLR route has no per-target arm for it).
 *
 * OWED DOWNSTREAM: U15 allowlists this file on the one send path (M9); it obeys the send window once U13 exists, and
 * U14's frequency cap leaves `SmsCampaignTest` out (M12); U50 registers the audit action.
 *
 * Guard: `npm run test:campaign-compose` §18 · `npm run test:campaign-models` §3.1 (the MARKETING writer pin).
 */
import { db } from "@/lib/server/store";
import type { StoredSmsCampaign, StoredUser } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import type { RateResult } from "@/lib/server/rate-limit";
import { sendBatch, smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import type { SmsBatchOutcome, SmsOutbound, SmsProviderResolution, SmsRailProblem } from "@/lib/server/sms";
import { dispatchSlice } from "@/lib/server/marketing/dispatch";
import type { SliceDeps } from "@/lib/server/marketing/dispatch";
import type { MarketingSkipReason } from "@/lib/server/marketing/consent";
import { ensureOptOutToken } from "@/lib/server/marketing/optout-service";
import { readMarketingLiveSwitch, marketingLiveGate } from "@/lib/server/marketing/live-switch";
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import { renderForRecipient, firstNameFor } from "@/lib/marketing/campaign-template";
import type { CampaignTemplate, CampaignVariant } from "@/lib/marketing/campaign-template";
import { footerMeasurementToken } from "@/lib/marketing/footer";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";

/** The target type every test `SmsMessage` row carries — U14's cap counts `SmsCampaignRecipient` rows only (M12). */
export const CAMPAIGN_TEST_TARGET_TYPE = "SmsCampaignTest";
export const CAMPAIGN_TEST_ACTION = "marketing.campaign_test";

/** ⛔ THE WHOLE INPUT — which saved campaign, which language. No number, no body. */
export type CampaignTestInput = { campaignId: string; variant: CampaignVariant };

export type CampaignTestRefusalReason =
  | "rate_limited" | "not_found" | "not_draft" | "no_english_body" | "own_number_unusable" | "rail_dead"
  | "live_sends_closed" | "template_invalid" | "token_unavailable" | MarketingSkipReason | "held" | "failed";

/** `handed_over` is the gateway TAKING it — never "delivered" (OD41); only a receipt is delivery. */
export type CampaignTestResult =
  | { ok: true; outcome: "handed_over"; via: "stub" | "open"; text: string; maskedTo: string; at: string; reference: string }
  | { ok: false; outcome: "refused"; reason: CampaignTestRefusalReason; error: string; retryAfterSec?: number; rail?: SmsRailProblem }
  | { ok: false; outcome: "unconfirmed"; error: string; text: string; maskedTo: string; at: string };

/* ══ THE SENTENCES — each one the officer can act on ════════════════════════════════════════════════════════════════ */

export const TEST_LIVE_SENDS_CLOSED = "Marketing SMS are not switched on yet. The owner switches them on before the first send.";
export const TEST_NOT_FOUND = "This campaign was not found — save it first, then test it.";
export const TEST_NOT_DRAFT = "This campaign is no longer a draft, so it can't be tested.";
export const TEST_NO_ENGLISH = "This campaign has no saved English message — test the Swahili one.";
export const TEST_OWN_NUMBER_UNUSABLE = "Your account's phone number is not a Tanzanian mobile number an SMS can reach, so no test can be sent.";
export const TEST_RAIL_DEAD = "No SMS can leave this server right now — the sender line above says why.";
export const TEST_TOKEN_UNAVAILABLE = "Your stop link couldn't be made, so nothing was sent — try again.";
export const TEST_TEMPLATE_INVALID = "The saved message no longer passes its own check — correct it and save again.";
export const TEST_UNCONFIRMED = "No answer from the network — don't resend straight away; check your phone first.";
export const TEST_GATE_UNANSWERED = "The consent check couldn't answer, so nothing was sent — try again shortly.";
export const TEST_CREDIT_FLOOR = "SMS credit is below its floor, so marketing messages are held — top it up, then test again.";

export function testRateLimited(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `That is the test limit for now — try again in ${minutes} min.`;
}

/** The gate's refusal of the officer's OWN number, with the remedy. ⛔ One sentence for every responsible-gambling reason. */
const GATE_SENTENCE: Readonly<Record<MarketingSkipReason, string>> = {
  bad_msisdn: TEST_OWN_NUMBER_UNUSABLE,
  suppressed: "Your number is on the stop list, so no marketing SMS can reach it — start them again from your own SMS link or your profile first.",
  no_consent: "Your number has no SMS offers consent on record — turn on SMS offers on your own profile, then test again.",
  consent_withdrawn: "You withdrew SMS offers consent for your number — turn it back on from your own profile, then test again.",
  rg_self_excluded: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  rg_cooling_off: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  rg_harm_marker: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  rg_under25_history: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  age_minor: "Your account's date of birth is under 18, so no marketing SMS can reach your number.",
  age_unknown: "Your account has no readable date of birth, so the consent check can't clear your number — add it to your own account, then test again.",
  account_status: "Your account's status stops marketing SMS to your number, so no test can be sent to it.",
};
export function testGateSentence(reason: MarketingSkipReason): string {
  return GATE_SENTENCE[reason] ?? GATE_SENTENCE.no_consent;
}

/** A send the slice HELD — nothing was attempted, for a reason that is not about this person. */
function heldSentence(reason: string): string {
  if (reason === "BALANCE_FLOOR") return TEST_CREDIT_FLOOR;
  if (reason === "gate_unanswered") return TEST_GATE_UNANSWERED;
  return TEST_RAIL_DEAD;
}

/* ══ THE DEPENDENCIES — swappable for in-process red plants, never in production ══════════════════════════════════ */

export type CampaignTestDeps = {
  campaigns: { find: (id: string) => Promise<StoredSmsCampaign | null> };
  users: { findById: (id: string) => Promise<StoredUser | null> };
  /** The officer's budget — `marketing.testSend`, keyed on the officer. */
  rate: (officerId: string) => Promise<RateResult>;
  provider: () => SmsProviderResolution;
  rail: () => SmsRailProblem | null;
  liveSwitch: () => Promise<MarketingLiveSwitch>;
  ensureToken: (raw: string) => Promise<string | null>;
  /** THE ONE renderer (`renderForRecipient`) — swapped only by a red plant. */
  render: typeof renderForRecipient;
  dispatch: typeof dispatchSlice;
  /** Undefined = the ONE gate, `mayReceiveMarketingSms` (`dispatchSlice`'s own default). */
  gate: SliceDeps["gate"];
  send: SliceDeps["send"];
  audit: (entry: Parameters<typeof audit>[0]) => unknown;
  now: () => Date;
};

/**
 * ⭐ THE TEST'S ONE SEND: `sendBatch`, the platform's one send path, with the test's purpose and target stamped on — so
 * its row is MARKETING-purpose (declared in `test:campaign-models` §3.1) and outside the frequency cap (M12).
 */
export function campaignTestSend(messages: SmsOutbound[]): Promise<SmsBatchOutcome> {
  return sendBatch(messages.map((m): SmsOutbound => ({ ...m, purpose: "MARKETING", targetType: CAMPAIGN_TEST_TARGET_TYPE })));
}

export const CAMPAIGN_TEST_DEPS: CampaignTestDeps = {
  campaigns: { find: (id) => db.smsCampaign.find(id) },
  users: { findById: (id) => db.user.findById(id) },
  rate: (officerId) => rateCheckAsync(officerId, "marketing.testSend"),
  provider: () => smsProviderResolution(),
  rail: () => smsRailProblem(),
  liveSwitch: () => readMarketingLiveSwitch(),
  ensureToken: (raw) => ensureOptOutToken(raw),
  render: renderForRecipient,
  dispatch: dispatchSlice,
  gate: undefined,
  send: campaignTestSend,
  audit,
  now: () => new Date(),
};

/* ══ THE TEST ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A campaign id as the store mints them — anything else is not looked up. ⛔ The audit row names only a campaign that
 *  was FOUND (U37b review m2): an all-digit "id" is a whole phone number, and a refused lookup must not carry it into the
 *  chain that is never pruned. */
const CAMPAIGN_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The stored row as the renderer reads it (U35's nullable columns as blank text). */
function templateOf(c: StoredSmsCampaign): CampaignTemplate {
  return {
    bodySw: c.bodySw ?? "",
    bodyEn: c.bodyEn ?? "",
    nameFallbackSw: c.nameFallbackSw ?? "",
    nameFallbackEn: c.nameFallbackEn ?? "",
    sourcePhrase: c.sourcePhrase ?? "",
  };
}

export async function sendCampaignTest(
  input: CampaignTestInput,
  officerId: string,
  deps: CampaignTestDeps = CAMPAIGN_TEST_DEPS,
): Promise<CampaignTestResult> {
  // ⛔ THESE TWO KEYS ONLY. A `to`, a `msisdn`, a `body` posted beside them is never read.
  const rawId = typeof input?.campaignId === "string" ? input.campaignId.trim() : "";
  const campaignId = CAMPAIGN_ID.test(rawId) ? rawId : "";
  const variant: CampaignVariant = input?.variant === "EN" ? "EN" : "SW";
  let maskedTo: string | null = null;
  /** The id of the campaign the store FOUND — the only id an audit row may name. */
  let foundId: string | null = null;

  /** One masked row per attempt. ⛔ No number but the masked one, no message text, no token. */
  const record = async (outcome: "handed_over" | "refused" | "unconfirmed", reason: string | null, extra: Record<string, string> = {}) => {
    await deps.audit({
      category: "ADMIN",
      action: CAMPAIGN_TEST_ACTION,
      actorId: officerId,
      targetType: "SmsCampaign",
      targetId: foundId,
      payload: { variant, outcome, reason, ...(maskedTo !== null ? { to: maskedTo } : {}), ...extra },
    });
  };
  const refuse = async (
    reason: CampaignTestRefusalReason,
    error: string,
    extra: { retryAfterSec?: number; rail?: SmsRailProblem } = {},
  ): Promise<CampaignTestResult> => {
    await record("refused", reason);
    return { ok: false, outcome: "refused", reason, error, ...extra };
  };

  // ── 1 · the officer's budget, before anything else is read. ⛔ A refused attempt writes no row (see the header). ──
  const budget = await deps.rate(officerId);
  if (!budget.allowed) {
    return { ok: false, outcome: "refused", reason: "rate_limited", error: testRateLimited(budget.retryAfterSec), retryAfterSec: budget.retryAfterSec };
  }

  // ── 2 · the SAVED campaign, still a draft — its text is what will be sent ──
  const campaign = campaignId === "" ? null : await deps.campaigns.find(campaignId);
  if (campaign === null) return refuse("not_found", TEST_NOT_FOUND);
  foundId = campaign.id;
  if (campaign.status !== "DRAFT") return refuse("not_draft", TEST_NOT_DRAFT);
  const template = templateOf(campaign);
  if (variant === "EN" && template.bodyEn.trim() === "") return refuse("no_english_body", TEST_NO_ENGLISH);

  // ── 3 · ⛔ THE OFFICER'S OWN NUMBER — their account's, judged by the numbering plan, and nothing else ──
  const officer = await deps.users.findById(officerId);
  const parsed = officer === null ? null : parseTzNumber(officer.phoneE164);
  const key = parsed !== null && parsed.verdict === "ok" && parsed.msisdn ? parsed.msisdn : null;
  if (officer === null || key === null) return refuse("own_number_unusable", TEST_OWN_NUMBER_UNUSABLE);
  const to = maskPhone(key);
  maskedTo = to;

  // ── 4 · a rail that can send at all — before a token is minted for nothing ──
  const rail = deps.rail();
  if (rail !== null) return refuse("rail_dead", TEST_RAIL_DEAD, { rail });

  // ── 5 · ⛔ X14 · THE ONE LIVE SWITCH — before a token, a row or a transport call ──
  const live = marketingLiveGate(deps.provider(), await deps.liveSwitch());
  if (!live.ok) return refuse("live_sends_closed", TEST_LIVE_SENDS_CLOSED);

  // ── 6 · the stored template's own verdict (one campaign, one verdict, OD48) — before the token is touched ──
  const name = firstNameFor({ userDisplayName: officer.displayName });
  const dry = deps.render(template, { variant, name, token: footerMeasurementToken(), origin: "account" });
  if (!dry.ok) return refuse("template_invalid", dry.problems[0] ?? TEST_TEMPLATE_INVALID);

  // ── 7 · the officer's opt-out token: reused, else minted — one per number, for ever ──
  const token = await deps.ensureToken(key);
  if (token === null) return refuse("token_unavailable", TEST_TOKEN_UNAVAILABLE);
  const message = deps.render(template, { variant, name, token, origin: "account" });
  if (!message.ok) return refuse("template_invalid", message.problems[0] ?? TEST_TEMPLATE_INVALID);

  // ── 8 · THE ONE GATE, then THE ONE SEND — `dispatchSlice` asks the gate for this number immediately before it ──
  const outcomes = await deps.dispatch([{ ref: campaign.id, msisdn: key, body: message.text }], { send: deps.send, gate: deps.gate });
  const out = outcomes[0];
  const at = deps.now().toISOString();
  if (out?.outcome === "handed_over") {
    await record("handed_over", null, { via: live.via, reference: out.reference });
    return { ok: true, outcome: "handed_over", via: live.via, text: message.text, maskedTo: to, at, reference: out.reference };
  }
  if (out?.outcome === "skipped") return refuse(out.skipReason, testGateSentence(out.skipReason));
  if (out?.outcome === "held") return refuse("held", heldSentence(out.reason));
  // ⛔ A transport that lost its reply may still have sent it: unconfirmed, never retried, never "handed over" (OD23).
  if (out?.outcome === "failed" && out.code !== "TRANSPORT") {
    return refuse("failed", `The network refused the message (${out.code}) — nothing reached your phone.`);
  }
  await record("unconfirmed", out?.outcome === "failed" ? out.code : "no_answer");
  return { ok: false, outcome: "unconfirmed", error: TEST_UNCONFIRMED, text: message.text, maskedTo: to, at };
}
