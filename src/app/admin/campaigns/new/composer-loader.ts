/**
 * U37b · WHAT /admin/campaigns/new READS — one function, the page's only read, returning one serialisable view.
 *
 * ⭐ THE DRAFT, FROM ITS OWN ADDRESS (`?draft=<id>`): an id that names nothing is the MISSING state — never a blank form
 * posing as a new one — and a read that fails THROWS to the page, which renders `AdminLoadError`.
 * ⭐ THE AUDIENCE, IN WORDS: the composer's own address in the contacts filter vocabulary (U38 adds the controls that
 * write it), else the draft's stored filter, else the whole book — parsed by U24's ONE parser (an unknown value is a
 * refusal, C2), held to the role rule every door asks before it describes a filter (`roleRefusal`, A1.1), and to the
 * save's shape rules (never a ticked selection, never one phone number — OD55). The save's own refusals, said before the
 * officer presses Save; a STORED filter this viewer may not have described is noted, never blocked (the save keeps it).
 * ⭐ THE SENDER LINE (OD45) is the server's `SMS_SENDER_ID`, read-only, and a dead rail speaks Admin → System's own words
 * (`railProblemNote`) — never a second wording of the fault.
 * ⭐ THE TEST CARD reads the officer's OWN account: the number masked, the first name the renderer would print, and their
 * existing opt-out token for the preview (a GET mints nothing — until the first test the link shows as xxxxxxxx). The
 * preview is the SAVED draft rendered by THE ONE renderer, as an account recipient — exactly what a test sends.
 * ⛔ No money is read and none is passed (OD24).
 */
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import type { SmsCampaignStatus, StoredSmsCampaign } from "@/lib/server/store";
import { smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import { readMarketingLiveSwitch, marketingLiveGate } from "@/lib/server/marketing/live-switch";
import {
  CONTACT_AUDIENCE_URL_KEYS, WHOLE_BOOK, parseContactAudienceParams, parseContactAudienceJson, describeAudience, roleRefusal,
  contactAudienceParams,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import {
  wholeNumberAudienceProblem, CAMPAIGN_AUDIENCE_SELECTION, CAMPAIGN_AUDIENCE_UNREADABLE,
} from "@/lib/server/marketing/campaign-draft";
import { TEST_OWN_NUMBER_UNUSABLE } from "@/lib/server/marketing/campaign-test-send";
import { renderForRecipient, firstNameFor } from "@/lib/marketing/campaign-template";
import type { CampaignDraftFields, CampaignTemplate } from "@/lib/marketing/campaign-template";
import { footerMeasurementToken } from "@/lib/marketing/footer";
import { maskPhone } from "@/lib/phone-normalize";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { railProblemNote, smsProviderLabel } from "@/app/admin/system/sms-credit-tile";
import { viewerReadsContacts } from "@/app/admin/contacts/contacts-loader";
import {
  COMPOSE_AUDIENCE_HIDDEN, COMPOSE_SENDER_STUB, COMPOSE_SENDER_UNSET, COMPOSE_TEST_LIVE_NOTE, composeSenderLine,
} from "./composer-copy";

/** Next's own shape: a repeated param arrives as an array. */
export type ComposeParams = Record<string, string | string[] | undefined>;

export type ComposeDraftView = {
  id: string;
  draftRevision: number;
  status: SmsCampaignStatus;
  updatedAt: string;
  /** The stored text as the form holds it — a null column as "". */
  fields: CampaignDraftFields;
};

export type ComposeAudienceView = {
  /** `describeAudience`'s phrases — empty for the whole book, or when the filter may not be described to this viewer. */
  lines: string[];
  everyone: boolean;
  /** Why this audience cannot be saved, in one sentence — or null. The SAVE's own refusals, so the two agree. */
  problem: string | null;
  /** Said beside a STORED filter this viewer may not have described (A1.1) — never a block: the save keeps it. */
  note: string | null;
  /** The address's filter params, posted with a save — null when the address carries none (the stored one is kept). */
  params: Record<string, string> | null;
};

export type ComposeSenderView = { line: string; dead: boolean; vars: string[] };

export type ComposeTestView = {
  /** The officer's own number, masked — null when their account's number is not one an SMS can reach. */
  ownNumberMasked: string | null;
  /** Why no test can reach their number — the test send's own sentence — or null. */
  ownNumberProblem: string | null;
  /** Their existing opt-out token is in the preview (else it shows as the measurement placeholder). */
  tokenReady: boolean;
  /** The SAVED draft as a test sends it, per variant, and the revision it was rendered from. */
  preview: { SW: string; EN: string | null; revision: number } | null;
  /** Said up front when the live switch would refuse a test (a real carrier, the switch closed). */
  liveNote: string | null;
};

export type ComposeView =
  | { kind: "missing" }
  | {
      kind: "ready";
      draft: ComposeDraftView | null;
      readOnly: boolean;
      /** M5 · the campaign's source line (blank until G5) — the live counter prices it, or its reserve. */
      sourcePhrase: string;
      audience: ComposeAudienceView;
      sender: ComposeSenderView;
      test: ComposeTestView;
    };

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
/** A campaign id as the store mints them; anything else names nothing. */
const CAMPAIGN_ID = /^[A-Za-z0-9_-]{1,64}$/;

function fieldsOf(c: StoredSmsCampaign): CampaignDraftFields {
  return {
    name: c.name,
    bodySw: c.bodySw,
    bodyEn: c.bodyEn ?? "",
    nameFallbackSw: c.nameFallbackSw ?? "",
    nameFallbackEn: c.nameFallbackEn ?? "",
  };
}

function templateOf(c: StoredSmsCampaign): CampaignTemplate {
  const f = fieldsOf(c);
  return { bodySw: f.bodySw, bodyEn: f.bodyEn, nameFallbackSw: f.nameFallbackSw, nameFallbackEn: f.nameFallbackEn, sourcePhrase: c.sourcePhrase ?? "" };
}

/** The audience on screen: the address's, else the stored one, else the whole book — and why it cannot be saved. */
async function audienceView(sp: ComposeParams, draft: StoredSmsCampaign | null): Promise<ComposeAudienceView> {
  let params: Record<string, string> = {};
  for (const k of CONTACT_AUDIENCE_URL_KEYS) {
    const v = first(sp[k])?.trim();
    if (v) params[k] = v;
  }
  const fromAddress = Object.keys(params).length > 0;
  let filter: ContactAudienceFilter = WHOLE_BOOK;
  if (fromAddress) {
    const parsed = parseContactAudienceParams(sp);
    if (!parsed.ok) return { lines: [], everyone: false, problem: parsed.reason, note: null, params };
    filter = parsed.filter;
    // ⛔ THE CARD AND THE SAVE READ ONE AUDIENCE (U37b review m6): the parser unions a repeated key, so what is posted is
    // re-spelt from the parsed filter — never the first raw value of each key, which saved Vodacom under "Airtel or Vodacom".
    params = contactAudienceParams(filter) ?? params;
  } else if (draft !== null) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(draft.audienceFilter);
    } catch {
      return { lines: [], everyone: false, problem: CAMPAIGN_AUDIENCE_UNREADABLE, note: null, params: null };
    }
    const parsed = parseContactAudienceJson(raw);
    if (!parsed.ok) return { lines: [], everyone: false, problem: CAMPAIGN_AUDIENCE_UNREADABLE, note: null, params: null };
    filter = parsed.filter;
  }
  // ⛔ THE SAVE'S OWN REFUSALS OF THE FILTER'S SHAPE, in its order: a ticked selection, then one phone number (OD55).
  const shape = filter.ids !== null ? CAMPAIGN_AUDIENCE_SELECTION : wholeNumberAudienceProblem(filter);
  // ⛔ A filter is described only after the role rule passed it (A1.1) — a masked viewer is never handed a phrase naming
  // a consent, source, player or stop predicate. A POSTED one the role may not use is refused, as the save refuses it;
  // a STORED one is only left undescribed — the save keeps it as it is, so blocking Save here would refuse a save the
  // server accepts.
  const role = roleRefusal(filter, await viewerReadsContacts());
  if (role !== null) {
    return fromAddress
      ? { lines: [], everyone: false, problem: role.reason, note: null, params }
      : { lines: [], everyone: false, problem: shape, note: COMPOSE_AUDIENCE_HIDDEN, params: null };
  }
  const lines = describeAudience(filter);
  return { lines, everyone: lines.length === 0, problem: shape, note: null, params: fromAddress ? params : null };
}

/** OD45 · the sender line: the server's value, or the stub's honest sentence, or Admin → System's words for a dead rail. */
function senderView(): ComposeSenderView {
  const provider = smsProviderResolution();
  const rail = smsRailProblem();
  if (rail !== null) {
    const said = railProblemNote(rail, smsProviderLabel(provider));
    return { line: said.note, dead: true, vars: said.vars ?? [] };
  }
  if (provider === "console") return { line: COMPOSE_SENDER_STUB, dead: false, vars: [] };
  const senderId = (process.env.SMS_SENDER_ID ?? "").trim();
  return { line: senderId === "" ? COMPOSE_SENDER_UNSET : composeSenderLine(senderId), dead: false, vars: [] };
}

export async function loadComposer(sp: ComposeParams): Promise<ComposeView> {
  // ── the draft its address names, if it names one ──
  const draftId = first(sp.draft)?.trim() ?? "";
  let draft: StoredSmsCampaign | null = null;
  if (draftId !== "") {
    draft = CAMPAIGN_ID.test(draftId) ? await db.smsCampaign.find(draftId) : null;
    if (draft === null) return { kind: "missing" };
  }

  // ── the officer's own account: the number a test reaches, the name it prints, the token it carries ──
  const session = await currentSession();
  const officer = session ? await db.user.findById(session.userId) : null;
  const parsed = officer ? parseTzNumber(officer.phoneE164) : null;
  const key = parsed !== null && parsed.verdict === "ok" && parsed.msisdn ? parsed.msisdn : null;
  const tokens = key !== null ? await db.marketingOptOutToken.listFor(key) : [];
  const token = tokens.length > 0 ? tokens[0].token : null;

  let preview: ComposeTestView["preview"] = null;
  if (draft !== null && draft.status === "DRAFT") {
    const template = templateOf(draft);
    const name = firstNameFor({ userDisplayName: officer?.displayName ?? null });
    const text = (variant: "SW" | "EN") =>
      renderForRecipient(template, { variant, name, token: token ?? footerMeasurementToken(), origin: "account" }).text;
    preview = { SW: text("SW"), EN: template.bodyEn.trim() === "" ? null : text("EN"), revision: draft.draftRevision };
  }

  const live = marketingLiveGate(smsProviderResolution(), await readMarketingLiveSwitch());

  return {
    kind: "ready",
    draft: draft === null ? null : {
      id: draft.id, draftRevision: draft.draftRevision, status: draft.status, updatedAt: draft.updatedAt, fields: fieldsOf(draft),
    },
    readOnly: draft !== null && draft.status !== "DRAFT",
    sourcePhrase: draft?.sourcePhrase ?? "",
    audience: await audienceView(sp, draft),
    sender: senderView(),
    test: {
      ownNumberMasked: key !== null ? maskPhone(key) : null,
      ownNumberProblem: key !== null ? null : TEST_OWN_NUMBER_UNUSABLE,
      tokenReady: token !== null,
      preview,
      liveNote: live.ok ? null : COMPOSE_TEST_LIVE_NOTE,
    },
  };
}
