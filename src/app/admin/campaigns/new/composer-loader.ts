/**
 * U37b · WHAT /admin/campaigns/new READS — one function, the page's only read, returning one serialisable view.
 *
 * ⭐ THE DRAFT, FROM ITS OWN ADDRESS (`?draft=<id>`): an id that names nothing is the MISSING state — never a blank form
 * posing as a new one — and a read that fails THROWS to the page, which renders `AdminLoadError`.
 * ⭐ THE AUDIENCE, IN WORDS: the composer's own address in the CAMPAIGN vocabulary (`CAMPAIGN_AUDIENCE_URL_KEYS` — U24's
 * keys and U38b's `pop`, which the audience rail writes), else the draft's stored filter, else nothing chosen — parsed by
 * the campaign door's parsers (`parseCampaignAudienceParams`; a stored filter at the campaign scope — an unknown value is a
 * refusal, C2), held to the campaign door's own rule exactly as the save holds it (`campaignAudienceRefusal`, X25 — a
 * ticked selection for every role, and for a posted filter this viewer's role rule, any search included for a viewer
 * who may not read a number), and to OD55 (never one phone number). The save's own refusals, said before the officer
 * presses Save — and when the ADDRESS is what is refused, the card offers to remove it (`clearHref`), since nothing else
 * on the page can; a STORED filter this viewer may not have described is noted, never blocked (the save keeps it). It
 * also says what a save AS A NEW DRAFT must post to keep that audience (`carry`), or that it cannot — never the whole
 * book by omission.
 * ⭐ U38b · "WHO" IS AN EXPLICIT CHOICE (ENGINE-SPEC §4.4 decision 3): a NEW draft whose address carries no audience has
 * chosen nothing (`chosen` false) and nothing is counted; a saved draft always has. The card counts only a filter this
 * viewer's own role rule passes (`countKey` — its ONE key, by which page.tsx keys the count's Suspense) through the split
 * door (`composeAudienceCount` → `audienceSplit` → the ONE view-model, `audience-view-model.ts`). A saved DRAFT opened
 * with no audience in its address is sent to the address that carries its stored filter (`canonicalHref`), so the rail
 * and the window control read ONE address — the composer's own, built by ONE href builder (`composeHref`).
 * ⭐ THE SENDER LINE (OD45) is the server's `SMS_SENDER_ID`, read-only, and a dead rail speaks Admin → System's own words
 * (`railProblemNote`) — never a second wording of the fault.
 * ⭐ THE TEST CARD reads the officer's OWN account: the number masked, the first name the renderer would print, and their
 * existing opt-out token for the preview (a GET mints nothing — until the first test the link shows as xxxxxxxx). The
 * preview is the SAVED draft rendered by THE ONE renderer, as an account recipient — exactly what a test sends.
 * ⛔ No money is read and none is passed (OD24).
 * ⭐ WHAT THE FORM SHOWS AGAINST WHAT IS SAVED: the audience on screen is compared with the one the draft stores (`unsaved`).
 * ⛔ U40b · THE CONFIRM CARD IS NOT COUNTED HERE: a render of the composer never walks the stored audience for it — its view
 * is counted ON DEMAND, when the officer presses its trigger (`confirm-doors.ts`, behind `confirm-view-actions.ts`).
 */
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import type { SmsCampaignStatus, StoredSmsCampaign } from "@/lib/server/store";
import { smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import { readMarketingLiveSwitch, marketingLiveGate } from "@/lib/server/marketing/live-switch";
import {
  CAMPAIGN_AUDIENCE_URL_KEYS, WHOLE_BOOK, parseCampaignAudienceParams, parseContactAudienceJson, describeAudience,
  campaignAudienceRefusal, campaignAudienceParams, contactAudienceKey, isUnfilteredCampaignAudience, campaignAudienceCount,
} from "@/lib/server/marketing/audience";
import type { AudienceParse, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { audienceSplit, audienceWalkCount } from "@/lib/server/marketing/audience-split";
import { audienceCountView, audienceSplitView } from "./audience-view-model";
import type { AudienceSplitView } from "./audience-view-model";
import { wholeNumberAudienceProblem, CAMPAIGN_AUDIENCE_UNREADABLE, savedSourcePhrase } from "@/lib/server/marketing/campaign-draft";
import {
  TEST_OWN_NUMBER_UNUSABLE, TEST_TYPED_OUTREACH_CLOSED, TEST_TYPED_NO_ATTESTATION_WORDING, TEST_TYPED_NEEDS_SOURCE_LINE,
  TEST_TEMPLATE_INVALID,
} from "@/lib/server/marketing/campaign-test-send";
import { licenceOutreach } from "@/lib/server/marketing/outreach-record";
import { currentWording } from "@/lib/server/marketing/wordings";
import { liveSendWindow } from "@/lib/server/marketing/dispatch";
import { composeTestWindowNote } from "./composer-copy";
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
   * written as an address (`campaignAudienceParams` — its `pop` included), `{}` while nothing is chosen. ⛔ null when it
   * cannot travel — a filter this viewer may not post (the hidden note), one no address can write exactly, or a refused
   * one — and the screen then does not offer the save: a missing audience would otherwise quietly become the whole book.
   */
  carry: Record<string, string> | null;
  /** ⭐ U38b · "Who" has been chosen: the address carries an audience, or the draft is saved (it always has a filter). A
   *  NEW draft with no audience in its address has chosen nothing — the card counts nothing and says so (decision 3). */
  chosen: boolean;
  /** U38b · who the words are drawn from — the lead and the "everyone" sentence follow it — or null when nothing is
   *  described (not chosen, refused, or a stored filter this viewer may not see). */
  who: "book" | "players" | "both" | null;
  /**
   * ⭐ U38b · the filter's ONE key (`contactAudienceKey`) when the card may count it — chosen, not refused, and passed by
   * THIS viewer's own role rule (the split door asks it again) — else null, and nothing is counted. page.tsx keys the
   * count's Suspense by it, so a new filter shows its own fallback, never the old numbers under the new words (B5).
   */
  countKey: string | null;
  /**
   * ⭐ U38b · a saved DRAFT opened with no audience in its address: the composer's own address carrying its stored filter
   * (`composeHref` over `carry`), where page.tsx sends it — so the rail's links and the window control, which both build
   * from the address, start from the audience the draft holds. null otherwise.
   */
  canonicalHref: string | null;
  /**
   * ⭐ The audience ON SCREEN is not the one this saved DRAFT stores: its address names another (a rail pick not saved yet),
   * or one that cannot be read — so Save counts it as a change, never "Nothing to save" (the gap U40b found, 2026-10-07:
   * a saved draft whose only change was its audience could not be saved), and (U40b) the Confirm card will not open on it
   * ("Save first"): a confirmation freezes the STORED audience. False with no saved draft, past DRAFT, or with no audience
   * in the address (the stored one is kept).
   */
  unsaved: boolean;
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
  /** U13 · M12 · said up front while the send window is closed — read as the test send reads it (`liveSendWindow`). */
  windowNote: string | null;
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
 * ⭐ U37c · THE TYPED TEST'S VIEW, decided from the same facts the test send checks first (§3.7 step 6), in its
 * order and in its words: licence outreach open, `adult.test` saved, and the draft's STORED source line (the ROW's —
 * U37s: a draft saved before the line existed carries none until it is saved again) — and "allowed" only with a preview,
 * so a saved text that cannot render for a book recipient is refused in the render's words. ⛔ It takes no number: the preview
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
  // ⛔ "Allowed" always comes with a preview: a saved text that cannot render for a book recipient is refused here in the
  // render's own words (the send's step 7), never offered and then stuck on "updating" (U37c-2's review).
  const unrenderable = why === null && !sw.ok ? (sw.problems[0] ?? TEST_TEMPLATE_INVALID) : null;
  return { allowed: why === null && unrenderable === null, why: why ?? unrenderable, preview, attestation };
}

/**
 * ⭐ U38b · THE CAMPAIGN DOORS THE COMPOSER READS AN AUDIENCE THROUGH — its address at the campaign's own parser, a stored
 * filter at the campaign scope (decision 2 of ENGINE-SPEC §4.4), so a draft saved with a population reads back here as it
 * does in the save (`campaign-draft.ts`). Frozen: production's doors. A parameter of `composeAudienceView` for in-process
 * red plants only (`test:campaign-audience` R-B2) — production never passes it.
 */
export type ComposeAudienceDoors = {
  params: (sp: ComposeParams) => AudienceParse;
  json: (raw: unknown) => AudienceParse;
};
export const COMPOSE_AUDIENCE_DOORS: Readonly<ComposeAudienceDoors> = Object.freeze({
  params: (sp: ComposeParams) => parseCampaignAudienceParams(sp),
  json: (raw: unknown) => parseContactAudienceJson(raw, "campaign"),
});

/**
 * The audience on screen: the address's, else the stored one, else NOTHING CHOSEN (U38b — a new draft with no audience in
 * its address; a save then still stores the whole book, as before) — and why it cannot be saved, asked EXACTLY as the
 * save asks it (`audienceOf` in `campaign-draft.ts`): the campaign door's rule (`campaignAudienceRefusal` — this viewer's
 * role for a posted filter, the rule every role meets for a stored one), then OD55. ⭐ The viewer's read grant is handed
 * in, so `test:campaign-compose` §17.7 asks it for a masked viewer without a session.
 */
export function composeAudienceView(
  sp: ComposeParams,
  draft: StoredSmsCampaign | null,
  reads: boolean,
  doors: ComposeAudienceDoors = COMPOSE_AUDIENCE_DOORS,
): ComposeAudienceView {
  let params: Record<string, string> = {};
  for (const k of CAMPAIGN_AUDIENCE_URL_KEYS) {
    const v = first(sp[k])?.trim();
    if (v) params[k] = v;
  }
  const fromAddress = Object.keys(params).length > 0;
  // ⭐ U38b · "Who" is an explicit choice: the address names an audience, or the draft is saved (a saved draft always
  // holds a filter). A NEW draft with neither has chosen nothing, and nothing is counted (decision 3).
  const chosen = fromAddress || draft !== null;
  const nothing = { chosen, who: null, countKey: null, canonicalHref: null } as const;
  // ⭐ Is the audience on screen the one this DRAFT stores? Asked by the ONE key of each (`contactAudienceKey`), the stored
  // one read at the campaign scope — only while the address names an audience and the draft can still change.
  const storedKey = draft !== null && draft.status === "DRAFT" && fromAddress ? storedAudienceKey(draft.audienceFilter, doors) : null;
  const unsavedFor = (shownKey: string | null): boolean =>
    draft !== null && draft.status === "DRAFT" && fromAddress && (shownKey === null || shownKey !== storedKey);
  // ⭐ The composer's own address WITHOUT the filter, the draft kept — the one way to take a refused address filter out.
  // ⭐ STD-1 (the U38b review) · "Remove the filter" goes to the draft's OWN address for this viewer (`draftAddressFor` —
  // its stored audience in the address), never the bare ?draft=, which would meet the page's redirect inside the mounted
  // composer and drop the typed text. It cannot recurse: that address carries no audience to refuse.
  const clearHref = !fromAddress ? null : draft !== null ? draftAddressFor(draft, reads) : CAMPAIGN_SCREEN_ROUTES.compose;
  let filter: ContactAudienceFilter = WHOLE_BOOK;
  if (fromAddress) {
    const parsed = doors.params(sp);
    if (!parsed.ok) return { lines: [], everyone: false, problem: parsed.reason, note: null, params, clearHref, carry: null, ...nothing, unsaved: unsavedFor(null) };
    filter = parsed.filter;
    // ⛔ THE CARD AND THE SAVE READ ONE AUDIENCE (U37b review m6): the parser unions a repeated key, so what is posted is
    // re-spelt from the parsed filter — never the first raw value of each key, which saved Vodacom under "Airtel or Vodacom".
    // U38b · in the campaign's vocabulary, its `pop` always written (`campaignAudienceParams`).
    params = campaignAudienceParams(filter) ?? params;
  } else if (draft !== null) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(draft.audienceFilter);
    } catch {
      return { lines: [], everyone: false, problem: CAMPAIGN_AUDIENCE_UNREADABLE, note: null, params: null, clearHref: null, carry: null, ...nothing, unsaved: false };
    }
    // ⭐ U38b · AT THE CAMPAIGN SCOPE (decision 2): a population the composer saved reads back — never "unreadable".
    const parsed = doors.json(raw);
    if (!parsed.ok) {
      return { lines: [], everyone: false, problem: CAMPAIGN_AUDIENCE_UNREADABLE, note: null, params: null, clearHref: null, carry: null, ...nothing, unsaved: false };
    }
    filter = parsed.filter;
  }
  // ⛔ THE SAVE'S OWN REFUSALS, in its order: the campaign door's rule (a ticked selection for every role; for a posted
  // filter, this viewer's role rule, any search included for a masked viewer), then one phone number (OD55).
  const door = campaignAudienceRefusal(filter, fromAddress ? reads : true);
  const problem = door?.reason ?? wholeNumberAudienceProblem(filter);
  const clear = problem !== null ? clearHref : null;
  const unsaved = unsavedFor(contactAudienceKey(filter));
  // ⭐ A NEW draft is a POSTED filter, so it meets this viewer's own rule: the address's (already asked above), or the
  // stored one re-asked for this viewer and written as an address — never a filter the new draft could not save. Nothing
  // chosen carries nothing (`{}`): the new draft is then the whole book, as a save of an unchosen draft is.
  const mine = campaignAudienceRefusal(filter, reads) === null;
  const carry: Record<string, string> | null = problem !== null ? null
    : fromAddress ? params
      : !chosen ? {}
        : mine ? campaignAudienceParams(filter) : null;
  // ⛔ A filter is described only when this viewer's role rule passes it (A1.1 · X25) — asked without the ticked
  // selection, which every role is refused and which says nothing about a role — so a masked viewer is never handed a
  // phrase naming a consent, source, player or stop predicate, or a search. A POSTED one the role may not use is refused
  // above, as the save refuses it; a STORED one is only left undescribed — the save keeps it as it is, so blocking Save
  // here would refuse a save the server accepts. ⛔ U38b · and neither is counted: no key, so no split is ever asked.
  if (campaignAudienceRefusal({ ...filter, ids: null }, reads) !== null) {
    return fromAddress
      ? { lines: [], everyone: false, problem, note: null, params, clearHref: clear, carry, ...nothing, unsaved }
      : { lines: [], everyone: false, problem, note: COMPOSE_AUDIENCE_HIDDEN, params: null, clearHref: null, carry, ...nothing, unsaved };
  }
  const lines = chosen ? describeAudience(filter) : [];
  // ⭐ U38b · COUNTED ONLY WHAT WAS CHOSEN, IS SAVEABLE, AND THIS VIEWER MAY COUNT — the split door asks the role rule again.
  const countKey = chosen && problem === null && mine ? contactAudienceKey(filter) : null;
  // ⭐ U38b · a saved DRAFT opened with no audience in its address → the address carrying its stored filter (page.tsx
  // redirects), so the rail and the window control start from it. Never past DRAFT (no rail there), never for a filter
  // this viewer may not post (`carry` null — the hidden note), never for a refused one.
  const canonicalHref = !fromAddress && draft !== null && draft.status === "DRAFT" && problem === null && carry !== null
    ? composeHref({ draft: draft.id, ...carry })
    : null;
  return {
    lines,
    everyone: chosen && isUnfilteredCampaignAudience(filter),
    problem,
    note: null,
    params: fromAddress ? params : null,
    clearHref: clear,
    carry,
    chosen,
    who: chosen ? filter.population ?? "book" : null,
    countKey,
    canonicalHref,
    unsaved,
  };
}

/** A stored filter's ONE key, read at the campaign scope — null when it cannot be read (then nothing on screen is it). */
function storedAudienceKey(stored: string, doors: ComposeAudienceDoors): string | null {
  try {
    const parsed = doors.json(JSON.parse(stored));
    return parsed.ok ? contactAudienceKey(parsed.filter) : null;
  } catch {
    return null;
  }
}

/* ═══ U38b · THE COMPOSER'S ONE HREF BUILDER ═════════════════════════════════════════════════════════════════════ */

/**
 * The composer's address as ONE value per key: the draft, and the campaign's audience keys — a repeated multi-value key
 * (`?op=A&op=B`) written `op=A,B`, which the parser reads as one union; `q` keeps its FIRST non-blank value whole (a
 * comma inside a name search is part of the name). ⛔ Nothing else: no `page`, no stray key someone typed.
 */
export function composeLinkSp(sp: ComposeParams): Record<string, string> {
  const out: Record<string, string> = {};
  const draft = first(sp.draft)?.trim();
  if (draft) out.draft = draft;
  for (const k of CAMPAIGN_AUDIENCE_URL_KEYS) {
    const raw = sp[k];
    const vals = (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]).filter((v) => typeof v === "string" && v.trim() !== "");
    if (vals.length === 0) continue;
    out[k] = k === "q" ? vals[0] : vals.join(",");
  }
  return out;
}

/**
 * ⭐ STD-1 · WHERE A SAVED DRAFT LIVES, for this viewer — the composer's own canonical address (`composeAudienceView`'s
 * `canonicalHref`, exactly the address page.tsx redirects a bare `?draft=<id>` to), or the bare address when there is none
 * (a filter this viewer may not carry, or one no address can hold). A new draft's save sends the client straight here and
 * the list's DRAFT rows link here, so NO IN-APP NAVIGATION MEETS THE PAGE'S REDIRECT: a redirect thrown inside a mounted
 * page segment is caught by Next's RedirectBoundary, which unmounts the composer — the saved line gone, a blank flash.
 * The redirect stays for an address typed or bookmarked by hand.
 */
export function draftAddressFor(draft: StoredSmsCampaign, viewerReads: boolean): string {
  try {
    return composeAudienceView({ draft: draft.id }, draft, viewerReads).canonicalHref ?? campaignDraftHref(draft.id);
  } catch {
    return campaignDraftHref(draft.id);
  }
}

/**
 * ⭐ THE ONE HREF BUILDER for /admin/campaigns/new (U38b decision 4): every pill of the audience rail and the stored
 * filter's address (`canonicalHref`) go through it. It carries the draft and every audience key from `sp`, then applies
 * `patch` (a string sets a key, null removes it). The draft is ALWAYS kept — a filter is not a new campaign.
 */
export function composeHref(
  sp: ComposeParams,
  patch: Partial<Record<(typeof CAMPAIGN_AUDIENCE_URL_KEYS)[number], string | null>> = {},
): string {
  const flat = composeLinkSp(sp);
  const params = new URLSearchParams();
  if (flat.draft) params.set("draft", flat.draft);
  for (const k of CAMPAIGN_AUDIENCE_URL_KEYS) {
    const v = Object.prototype.hasOwnProperty.call(patch, k) ? patch[k] : flat[k];
    if (typeof v === "string" && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${CAMPAIGN_SCREEN_ROUTES.compose}?${qs}` : CAMPAIGN_SCREEN_ROUTES.compose;
}

/* ═══ U38b · THE COUNT — the split door, then the ONE view-model ═══════════════════════════════════════════════════ */

/** What the card shows for one audience: the view-model for this viewer, or the split door's own refusal in its words. */
export type ComposeAudienceCount = { kind: "view"; view: AudienceSplitView } | { kind: "refused"; reason: string };

declare global {
  /** DEV ONLY — set by `/api/dev-test/marketing-audience-seed?delayMs=` so the U38b drive can photograph the keyed
   *  fallback ("Counting who will receive it…"). Read only where NODE_ENV is not production (`devCountHold`). */
  // eslint-disable-next-line no-var
  var __50PICK_AUDIENCE_COUNT_DELAY_MS: number | undefined;
  /** DEV ONLY — set by `/api/dev-test/marketing-audience-seed?fault=1` so the drive can photograph the card's error and
   *  its "Count again". Read only where NODE_ENV is not production. */
  // eslint-disable-next-line no-var
  var __50PICK_AUDIENCE_COUNT_FAULT: boolean | undefined;
}

/** ⛔ DEV ONLY: the drive's pause before the count and its thrown count. Inert in production — the switches are set by a
 *  dev-test route that answers 404 there, and this reads them only off production too. */
async function devCountHold(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const ms = Math.min(15_000, Math.max(0, Number(globalThis.__50PICK_AUDIENCE_COUNT_DELAY_MS ?? 0) || 0));
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  if (globalThis.__50PICK_AUDIENCE_COUNT_FAULT === true) throw new Error("audience count fault (dev drive)");
}

/**
 * ⭐ THE CARD'S ONE READ (ENGINE-SPEC §4.4 decision 5): the audience the composer may count — for a READER through THE
 * split door (`audienceSplit` — the role rule first, one split per filter key, at most two at once, the time budget), shaped
 * by THE view-model; ⛔ for a viewer who may not read a number (OD65), the campaign door's role rule and then the ONE
 * walk's count (`campaignAudienceCount`) — the count alone, at every size, and the gate is NEVER asked about the people a
 * masked officer chose: no verdict exists to leak, not even through how long the answer takes.
 * ⛔ NOTHING CHOSEN, REFUSED OR HIDDEN COMPUTES NOTHING: no `countKey`, no call — the split door is never asked (B7).
 * ⛔ A read that fails THROWS to the card, which says so with "Count again" — never a zero. `split` and `count` exist for
 * in-process red plants and spies only — production never passes them.
 */
export async function composeAudienceCount(
  audience: Pick<ComposeAudienceView, "countKey">,
  viewerReads: boolean,
  split: typeof audienceSplit = audienceSplit,
  count: typeof campaignAudienceCount = campaignAudienceCount,
): Promise<ComposeAudienceCount | null> {
  if (audience.countKey === null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(audience.countKey);
  } catch {
    return { kind: "refused", reason: CAMPAIGN_AUDIENCE_UNREADABLE };
  }
  const parsed = parseContactAudienceJson(raw, "campaign");
  if (!parsed.ok) return { kind: "refused", reason: parsed.reason };
  await devCountHold();
  if (!viewerReads) {
    const refused = campaignAudienceRefusal(parsed.filter, false);
    if (refused !== null) return { kind: "refused", reason: refused.reason };
    // Under the split's own limits — the same slots, one count per key (the U38b review's #6).
    return { kind: "view", view: audienceCountView(contactAudienceKey(parsed.filter), await audienceWalkCount(parsed.filter, count)) };
  }
  const r = await split(parsed.filter, { viewerReads });
  if (!r.ok) return { kind: "refused", reason: r.reason };
  return { kind: "view", view: audienceSplitView(r.split, viewerReads) };
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
      windowNote: composeTestWindowNote(await liveSendWindow()),
      typed: composeTypedView(draft, { outreachOpen: licenceOutreach().state === "open", adult: currentWording("adult.test") }),
    },
  };
}
