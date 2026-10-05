/**
 * U37b · WHAT /admin/campaigns/new READS — one function, the page's only read, returning one serialisable view.
 *
 * ⭐ THE DRAFT, FROM ITS OWN ADDRESS (`?draft=<id>`): an id that names nothing is the MISSING state — never a blank form
 * posing as a new one — and a read that fails THROWS to the page, which renders `AdminLoadError`.
 * ⭐ THE AUDIENCE, IN WORDS: the composer's own address in the contacts filter vocabulary (U38 adds the controls that
 * write it), else the draft's stored filter, else the whole book — parsed by U24's ONE parser (an unknown value is a
 * refusal, C2), held to the campaign door's own rule exactly as the save holds it (`campaignAudienceRefusal`, X25 — a
 * ticked selection for every role, and for a posted filter this viewer's role rule, any search included for a viewer
 * who may not read a number), and to OD55 (never one phone number). The save's own refusals, said before the officer
 * presses Save — and when the ADDRESS is what is refused, the card offers to remove it (`clearHref`), since nothing else
 * on the page can; a STORED filter this viewer may not have described is noted, never blocked (the save keeps it). It
 * also says what a save AS A NEW DRAFT must post to keep that audience (`carry`), or that it cannot — never the whole
 * book by omission.
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
  CONTACT_AUDIENCE_URL_KEYS, WHOLE_BOOK, parseContactAudienceParams, parseContactAudienceJson, describeAudience,
  campaignAudienceRefusal, contactAudienceParams,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { wholeNumberAudienceProblem, CAMPAIGN_AUDIENCE_UNREADABLE, savedSourcePhrase } from "@/lib/server/marketing/campaign-draft";
import {
  TEST_OWN_NUMBER_UNUSABLE, TEST_TYPED_OUTREACH_CLOSED, TEST_TYPED_NO_ATTESTATION_WORDING, TEST_TYPED_NEEDS_SOURCE_LINE,
} from "@/lib/server/marketing/campaign-test-send";
import { licenceOutreach } from "@/lib/server/marketing/outreach-record";
import { currentWording } from "@/lib/server/marketing/wordings";
import { renderForRecipient, firstNameFor } from "@/lib/marketing/campaign-template";
import type { CampaignDraftFields, CampaignTemplate } from "@/lib/marketing/campaign-template";
import { CAMPAIGN_SCREEN_ROUTES, campaignDraftHref } from "@/lib/marketing/campaign-status";
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
  /**
   * ⭐ "Remove the filter" — the composer's own address WITHOUT its filter (the draft kept), offered only while the
   * ADDRESS is what the save would refuse: the page has no other control that takes it out. null otherwise.
   */
  clearHref: string | null;
  /**
   * ⭐ What "Save as a new draft" posts so the NEW draft keeps this audience: the address's filter, else the stored one
   * written as an address (`{}` for the whole book). ⛔ null when it cannot travel — a filter this viewer may not post
   * (the hidden note), one no address can write exactly, or a refused one — and the screen then does not offer the save:
   * a missing audience would otherwise quietly become the whole contact book.
   */
  carry: Record<string, string> | null;
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
  /** U37c · a test to ANOTHER number — offered only once its three number-independent checks pass. */
  typed: ComposeTypedView;
};

/** U37c · what the Test card needs to offer a test to a TYPED number — ⛔ the loader takes no number. */
export type ComposeTypedView = {
  /** Typed tests may be offered: licence outreach open, `adult.test` saved, and this draft carrying a source line. */
  allowed: boolean;
  /** The first number-independent refusal, in the test send's own words (§3.7 step 6) — null when allowed. */
  why: string | null;
  /** The SAVED draft as a CONTACT-BOOK recipient gets it — the `{jina}` fallback, its stored source line, the measurement
   *  token for the stop link — the same for every number. Null while it cannot render (no source line). */
  preview: { SW: string; EN: string | null; revision: number } | null;
  /** The saved `adult.test` confirmation — the tick's label, verbatim — and its version; null while unsaved. */
  attestation: { text: string; version: number } | null;
};

export type ComposeView =
  | { kind: "missing" }
  | {
      kind: "ready";
      draft: ComposeDraftView | null;
      readOnly: boolean;
      /** M5 · U37s · the source line the counter prices (`composerSourcePhrase`) — blank: it prices the reserve. */
      sourcePhrase: string;
      /** U37s · this DRAFT carries a different line than the one saved now (none, an older one, or one since cleared) —
       *  so Save is offered even with nothing typed, and the screen says why (`composerSourceLineStale`). */
      sourceLineStale: boolean;
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

/**
 * ⭐ U37s · THE LINE THE COUNTER PRICES IS THE LINE THE SAVE WILL STAMP. A new composer and a DRAFT are priced with the
 * SAVED line (`savedSourcePhrase`) — a draft's next save re-stamps it, so pricing the line stamped on it earlier would
 * let the counter pass a body the save then refuses. A campaign past DRAFT is priced with the line frozen on it. Blank
 * ("") while nothing is saved: the counter then reserves the longest line allowed.
 */
export function composerSourcePhrase(draft: StoredSmsCampaign | null, saved: string | null): string {
  if (draft !== null && draft.status !== "DRAFT") return draft.sourcePhrase ?? "";
  return saved ?? "";
}

/**
 * ⭐ U37s · A DRAFT WHOSE STAMP IS NOT THE SAVED LINE — saved before the line existed (every draft before U37s stores
 * none), stamped with a line changed since, or carrying a line since cleared. Only a save re-stamps it, and with nothing
 * typed the screen would otherwise refuse that save as "no changes" while its counter, which prices the saved line, reads
 * "set". ⛔ Never true past DRAFT: a confirmed campaign keeps its own line by design.
 */
export function composerSourceLineStale(draft: StoredSmsCampaign | null, saved: string | null): boolean {
  if (draft === null || draft.status !== "DRAFT") return false;
  return (draft.sourcePhrase ?? null) !== (saved ?? null);
}

function templateOf(c: StoredSmsCampaign): CampaignTemplate {
  const f = fieldsOf(c);
  return { bodySw: f.bodySw, bodyEn: f.bodyEn, nameFallbackSw: f.nameFallbackSw, nameFallbackEn: f.nameFallbackEn, sourcePhrase: c.sourcePhrase ?? "" };
}

/**
 * ⭐ U37c · THE TYPED TEST'S VIEW, decided from the same three facts the test send checks first (§3.7 step 6), in its
 * order and in its words: licence outreach open, `adult.test` saved, and the draft's STORED source line (the ROW's —
 * U37s: a draft saved before the line existed carries none until it is saved again). ⛔ It takes no number: the preview
 * is the book-origin render of the saved draft with the measurement token, the same for every number, and the stop link
 * made for a real number is never shown.
 */
export function composeTypedView(
  draft: StoredSmsCampaign | null,
  facts: { outreachOpen: boolean; adult: { text: string; v: number } | null },
): ComposeTypedView {
  const attestation = facts.adult === null ? null : { text: facts.adult.text, version: facts.adult.v };
  if (draft === null || draft.status !== "DRAFT") return { allowed: false, why: null, preview: null, attestation };
  const template = templateOf(draft);
  const why = !facts.outreachOpen ? TEST_TYPED_OUTREACH_CLOSED
    : attestation === null ? TEST_TYPED_NO_ATTESTATION_WORDING
      : template.sourcePhrase.trim() === "" ? TEST_TYPED_NEEDS_SOURCE_LINE
        : null;
  const render = (variant: "SW" | "EN") => renderForRecipient(template, { variant, name: null, token: footerMeasurementToken(), origin: "book" });
  const sw = render("SW");
  const en = template.bodyEn.trim() === "" ? null : render("EN");
  const preview = sw.ok ? { SW: sw.text, EN: en !== null && en.ok ? en.text : null, revision: draft.draftRevision } : null;
  return { allowed: why === null, why, preview, attestation };
}

/**
 * The audience on screen: the address's, else the stored one, else the whole book — and why it cannot be saved, asked
 * EXACTLY as the save asks it (`audienceOf` in `campaign-draft.ts`): the campaign door's rule (`campaignAudienceRefusal`
 * — this viewer's role for a posted filter, the rule every role meets for a stored one), then OD55. ⭐ The viewer's read
 * grant is handed in, so `test:campaign-compose` §17.7 asks it for a masked viewer without a session.
 */
export function composeAudienceView(sp: ComposeParams, draft: StoredSmsCampaign | null, reads: boolean): ComposeAudienceView {
  let params: Record<string, string> = {};
  for (const k of CONTACT_AUDIENCE_URL_KEYS) {
    const v = first(sp[k])?.trim();
    if (v) params[k] = v;
  }
  const fromAddress = Object.keys(params).length > 0;
  // ⭐ The composer's own address WITHOUT the filter, the draft kept — the one way to take a refused address filter out.
  const clearHref = !fromAddress ? null : draft !== null ? campaignDraftHref(draft.id) : CAMPAIGN_SCREEN_ROUTES.compose;
  let filter: ContactAudienceFilter = WHOLE_BOOK;
  if (fromAddress) {
    const parsed = parseContactAudienceParams(sp);
    if (!parsed.ok) return { lines: [], everyone: false, problem: parsed.reason, note: null, params, clearHref, carry: null };
    filter = parsed.filter;
    // ⛔ THE CARD AND THE SAVE READ ONE AUDIENCE (U37b review m6): the parser unions a repeated key, so what is posted is
    // re-spelt from the parsed filter — never the first raw value of each key, which saved Vodacom under "Airtel or Vodacom".
    params = contactAudienceParams(filter) ?? params;
  } else if (draft !== null) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(draft.audienceFilter);
    } catch {
      return { lines: [], everyone: false, problem: CAMPAIGN_AUDIENCE_UNREADABLE, note: null, params: null, clearHref: null, carry: null };
    }
    const parsed = parseContactAudienceJson(raw);
    if (!parsed.ok) {
      return { lines: [], everyone: false, problem: CAMPAIGN_AUDIENCE_UNREADABLE, note: null, params: null, clearHref: null, carry: null };
    }
    filter = parsed.filter;
  }
  // ⛔ THE SAVE'S OWN REFUSALS, in its order: the campaign door's rule (a ticked selection for every role; for a posted
  // filter, this viewer's role rule, any search included for a masked viewer), then one phone number (OD55).
  const door = campaignAudienceRefusal(filter, fromAddress ? reads : true);
  const problem = door?.reason ?? wholeNumberAudienceProblem(filter);
  const clear = problem !== null ? clearHref : null;
  // ⭐ A NEW draft is a POSTED filter, so it meets this viewer's own rule: the address's (already asked above), or the
  // stored one re-asked for this viewer and written as an address — never a filter the new draft could not save.
  const carry = problem !== null ? null
    : fromAddress ? params
      : campaignAudienceRefusal(filter, reads) === null ? contactAudienceParams(filter) : null;
  // ⛔ A filter is described only when this viewer's role rule passes it (A1.1 · X25) — asked without the ticked
  // selection, which every role is refused and which says nothing about a role — so a masked viewer is never handed a
  // phrase naming a consent, source, player or stop predicate, or a search. A POSTED one the role may not use is refused
  // above, as the save refuses it; a STORED one is only left undescribed — the save keeps it as it is, so blocking Save
  // here would refuse a save the server accepts.
  if (campaignAudienceRefusal({ ...filter, ids: null }, reads) !== null) {
    return fromAddress
      ? { lines: [], everyone: false, problem, note: null, params, clearHref: clear, carry }
      : { lines: [], everyone: false, problem, note: COMPOSE_AUDIENCE_HIDDEN, params: null, clearHref: null, carry };
  }
  const lines = describeAudience(filter);
  return { lines, everyone: lines.length === 0, problem, note: null, params: fromAddress ? params : null, clearHref: clear, carry };
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
  const savedLine = savedSourcePhrase();

  return {
    kind: "ready",
    draft: draft === null ? null : {
      id: draft.id, draftRevision: draft.draftRevision, status: draft.status, updatedAt: draft.updatedAt, fields: fieldsOf(draft),
    },
    readOnly: draft !== null && draft.status !== "DRAFT",
    sourcePhrase: composerSourcePhrase(draft, savedLine),
    sourceLineStale: composerSourceLineStale(draft, savedLine),
    audience: composeAudienceView(sp, draft, await viewerReadsContacts()),
    sender: senderView(),
    test: {
      ownNumberMasked: key !== null ? maskPhone(key) : null,
      ownNumberProblem: key !== null ? null : TEST_OWN_NUMBER_UNUSABLE,
      tokenReady: token !== null,
      preview,
      liveNote: live.ok ? null : COMPOSE_TEST_LIVE_NOTE,
      typed: composeTypedView(draft, { outreachOpen: licenceOutreach().state === "open", adult: currentWording("adult.test") }),
    },
  };
}
