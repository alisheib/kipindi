import { db } from "@/lib/server/store";
import type {
  MessagingKey, MessagingLocale, SmsCampaignRecipientStatus, StoredMarketingContact, StoredSmsCampaign,
  StoredSmsCampaignRecipient, StoredUser,
} from "@/lib/server/store";
import { marketingKeyOf } from "@/lib/server/marketing/erase";
// U33a-P · the export answers from the SWITCH and the record, never from its own reading of either.
import { marketingToggleState } from "@/lib/server/marketing/consent";
import { licenceOutreach } from "@/lib/server/marketing/outreach-record";
// U16a · the campaign records: the gate's reason union (a type only) and two pure, light runtime helpers.
import type { MarketingSkipReason } from "@/lib/server/marketing/consent";
import { optOutTokenRef } from "@/lib/marketing/optout";
import { isGatewayMsisdn } from "@/lib/phone-normalize";
// D10 · the ONE cap the twins read one row past — pure, and it takes only types from the store.
import { SMS_RECIPIENTS_BY_NUMBER_MAX } from "@/lib/server/marketing/campaign-model";

/**
 * U18b · THE MARKETING ARM OF A DATA EXPORT — what the platform holds about a person's marketing, for
 * both access doors: the player's own download (`exportUserData`) and the officer's DSAR bundle
 * (`buildDsarBundle`). ONE function, so the two doors cannot disagree about what "everything" is.
 *
 * 🔴 BEFORE THIS, NEITHER DOOR HAD A MARKETING SECTION. The consent ledger, the stop list and the contact
 * book all hold the person's number, and a right-of-access file that leaves out the record of what they
 * agreed to — and whether they are being marketed at all — is not the whole answer (PDPA 2022 / GDPR Art. 15).
 *
 * ⛔ ONLY WHAT IS THIS PERSON'S, AND A NUMBER IS NOT A PERSON (the S10 review). Tanzanian numbers are
 * recycled, so a record keyed by the number may be a PREVIOUS holder's. Ledger rows count only from the
 * day this account was created; a book row counts when it is LINKED to the account, or found by the
 * account's number, unlinked, and created after the account; a linked row's OTHER number counts only
 * while no other live account holds it (the holder check `erase.ts` makes). Without the bound a new
 * owner's own download handed them the last holder's consent history — and the fact that they had asked
 * a betting site to erase them.
 * ⭐ A STOP THAT REFUSES THIS PERSON NOW IS SHOWN WHATEVER ITS AGE — a re-armed suppression keeps its
 * first `createdAt` (both twins), so a date bound alone would hide a stop that is refusing them today.
 * One that began before the account is listed with `createdAt: null` ("before this account"), so the
 * previous holder's date is not disclosed.
 * ⚖️ WHEN IN DOUBT, DO NOT DISCLOSE — the opposite side of the doubt erasure takes (`erase.ts`).
 * ⛔ AN ALLOWLIST, NEVER THE RAW ROW. Left out on purpose: `recordedBy` (a member of STAFF — another
 * person's data), `evidence` (internal references), every row id, and the book's `notes` — staff free
 * text that can name third parties. ⚠️ Both doors share this allowlist, so NEITHER carries notes: an
 * officer who is asked for them reads the row on the console, redacts, and releases by hand.
 * A new column reaches the export only by being added here.
 * ⭐ STAGED IMPORT ROWS (U29b) — a row of an officer's contacts file, staged for import, that holds one of the person's
 * numbers is something we hold about them too: listed with the number, name, e-mail, tags and outcome it carries, and only
 * rows staged on or after the account's creation (the same bound). ⛔ Its notes, the file's name, the officer, the run and
 * the row's keys are withheld, as for the book.
 * ⛔ An erased account's `phoneE164` is a tombstone (`erased:usr_…`), never a key: `marketingKeyOf`
 * refuses it, so its digits cannot be read as some stranger's number.
 * ⭐ THE CAMPAIGN RECORDS (U16a — live BEFORE the first recipient row is written, M9). A campaign recipient row holds the
 * number a person was messaged at, what became of the message and the opt-out link in its footer, and it is kept seven
 * years (DATA-RETENTION) — so it is something we hold about them. Three sections, over the SAME numbers as the ledger
 * above, each number read through the DAL's ONE question — rows CREATED OR SENT since the account's creation (D12: a row
 * put on a campaign for the number's previous holder but sent after it passed to this person reached THEIR phone) —
 * and then, the review's MINOR-4:
 *   · the account's OWN current number answers with every such row (the bound is the rule there);
 *   · ANY OTHER number of theirs (a linked book row's old number) answers ONLY with rows linked to THIS person — the
 *     account itself, or one of their own linked book rows (D11). A number they once held may now be a stranger's, and
 *     the stranger's campaign messages are the stranger's, not this person's.
 *   · `campaignMessages` — every row that reached the network (handed over, delivered, no answer from the network, or
 *     not delivered after the network had it): when it was handed over, the status in words, the campaign's text for
 *     the variant that row went out in — the template AS STORED, `{jina}` as written (the name it printed is the
 *     person's own, and the footer's token is a live credential) — and when it was delivered;
 *   · `notSent` — every other row: refused at sending (in U38a's five-bucket words, `NOT_SENT_REASON`), never handed to
 *     the network, or still waiting. ⚠️ Wider than the engine spec's field list (SKIPPED only), on purpose: a row of a
 *     stopped campaign stays PENDING for ever (E25) and still holds the person's number, so it is in their file too.
 *     A row put on its campaign BEFORE the account existed (read because it was SENT since — D12) is listed undated
 *     (`at: null`), as an old stop is: the previous holder's campaign date is not this person's to receive;
 *   · `optOutLinks` — the links minted for those numbers, by reference only (`optOutTokenRef`: two characters, then
 *     stars), with when each was minted. A link minted BEFORE the account counts only when one of this person's own
 *     messages carried it — the mint reuses a number's newest link, so a recycled number's new holder is sent the old
 *     holder's — and then undated, as an old stop is. On ANY OTHER number of theirs, a link counts ONLY when one of
 *     their own messages carried it (D11 again: the stranger now holding that number has links of their own).
 * ⛔ Withheld, every one: campaign and recipient ids, the campaign's staff-only name, the officer, the gate's trail and
 * the refusal's detail, the provider's reference, the cost and the live token.
 * ⚠️ OWED (U43b + U16b): a message sent under a LICENCE basis is listed without its basis, and `outreach` above says so
 * only while the record is open. U43b records the basis on each row it sends; U16b then exports it per message, in
 * words ("your consent" / "the licence basis") — never the gate's trail itself.
 * ⛔ THE BOUND IS THE DAL'S, applied once: `smsCampaignRecipient.listByMsisdn` asks it in its own WHERE, so a previous
 * holder's rows are never read and cannot crowd this person's out of the cap — and it is not re-applied here, where a
 * second definition could disagree with the first. An account whose creation instant cannot be read gets no campaign
 * section at all: ⚖️ when in doubt, do not disclose (a production row always has one).
 * ⭐ D10 · NEVER A SILENT CUT (the review's MINOR-2). A number lists at most `SMS_RECIPIENTS_BY_NUMBER_MAX` rows, its
 * newest; the DAL reads ONE more, and when that row is there `campaignHistoryCut` says in words that the oldest are not
 * included (`CAMPAIGN_HISTORY_CUT`). ⛔ It offers nothing more: no door can produce the older rows (both doors read
 * through this one function and its one cap), so the sentence promises no "rest". Null means every row is listed.
 * ⚠️ The cut is measured on
 * the number's whole answer, before another number's link rule (D11) narrows it — so it may say "not all included"
 * when the rows past the cap were a stranger's: the cautious direction for a sentence that only ever adds a request.
 */
export type MarketingDsarSection = {
  contacts: Array<Pick<StoredMarketingContact,
    "msisdn" | "displayName" | "email" | "operator" | "source" | "consentState" | "suppressedAt" | "tags" | "createdAt" | "updatedAt">>;
  consent: Array<{ status: string; source: string; wording: string; locale: string; createdAt: string }>;
  /** `createdAt: null` — the stop began before this account existed (still listed while it refuses them). */
  suppression: Array<{ reason: string; createdAt: string | null; liftedAt: string | null }>;
  /** U29b · staged import rows holding the person's numbers, staged since the account's creation. */
  staged: Array<{ msisdn: string; displayName: string | null; email: string | null; tags: string[]; outcome: string | null; stagedAt: string }>;
  /** ⭐ U33a-P · non-null ONLY when offers reach this person on the LICENCE basis rather than on a consent they gave.
   *  ⛔ A person asking what we hold about them is entitled to be told that we message them WITHOUT their consent, and
   *  under what. A consenting person gets `null` — their basis is the consent rows already listed above — and so does
   *  anyone the switch does not reach. `since` is the instant the record was opened, which is when it became true. */
  outreach: { basis: "LICENCE_PLAYER"; since: string } | null;
  /** ⭐ U33r · whether THIS ACCOUNT'S OWN NUMBER is held in the agent-referee exclusion — the coded form of the number
   *  50pick keeps (not the number itself; without the server's pepper it cannot be turned back) so that it never sends that
   *  number marketing, because it was given as an agent applicant's referee. ⛔ A yes or a no, never the coded form itself, and never who named the number
   *  or when — nothing of that is kept (the U33r review's NIT: a person whose own number is held is told so, in both access
   *  doors). `null`: the switch could not be read just now. Read FROM THE SWITCH (`marketingToggleState`), as `outreach`
   *  is, so the screen and the file answer it one way. */
  agentRefereeExclusion: boolean | null;
  /** U16a · the campaign messages that reached the network, newest first. `sentAt` null: the hand-over time was not
   *  recorded (no answer from the network); `deliveredAt` null: no delivery receipt came. */
  campaignMessages: Array<{ sentAt: string | null; status: CampaignMessageStatus; message: string; deliveredAt: string | null }>;
  /** U16a · the campaign rows that sent nothing, newest first — `at` is when the person was put on the campaign;
   *  `at: null` — that was before this account existed (the row was SENT since, D12), so the date is withheld. */
  notSent: Array<{ at: string | null; reason: string }>;
  /** U16a · `createdAt: null` — minted before this account existed (listed because one of their own messages carried it). */
  optOutLinks: Array<{ ref: string; createdAt: string | null }>;
  /** D10 · null when every campaign row is listed; otherwise `CAMPAIGN_HISTORY_CUT`, the sentence saying the oldest are not. */
  campaignHistoryCut: string | null;
};

/** U16a · a message that reached the network, in the words the export uses — field values, not sentences (G10). */
export type CampaignMessageStatus = "handed over" | "delivered" | "no answer from the network" | "not delivered";

/** D10 · what a file says when a number held more campaign rows than it lists — the oldest are the ones left out.
 *  ⛔ It names no way to get them: neither door can produce rows past the one cap, so a sentence offering "the rest"
 *  would promise what no officer could deliver (PE-10). */
export const CAMPAIGN_HISTORY_CUT =
  "There are more campaign messages than this file can list; the oldest are not included.";

/** Every reason inside U38a's PROTECTED bucket reads as this ONE value (U20's REACH ruling, D19) — U33r's promised agent
 *  referee among them, so the words name it too and stay true for every reason they stand for. */
const PROTECTED_WORDS = "protected (responsible gambling, age, account status or agent referee)";

/**
 * U16a · a refusal AT SENDING, in U38a's five buckets (`AUDIENCE_BUCKET_OF`, `audience-split.ts`): the stop list, no
 * consent or basis, a withdrawn consent, an unconfirmed age, and PROTECTED as one value whatever the reason inside it —
 * plus the number no SMS can reach. A FULL Record over the gate's reasons, so a reason the gate gains is a compile error
 * here until it is given words. ⚠️ Written here rather than imported: the split's module pulls the audience walk and the
 * gate into both export doors. `test:campaign-privacy` P8 holds this partition equal to the split's, reason by reason.
 */
export const NOT_SENT_REASON: Readonly<Record<MarketingSkipReason, string>> = {
  bad_msisdn: "not a number an SMS can be sent to",
  suppressed: "on the stop list",
  no_consent: "no consent or recorded basis",
  consent_withdrawn: "consent withdrawn",
  age_unknown: "age not confirmed",
  rg_self_excluded: PROTECTED_WORDS,
  rg_cooling_off: PROTECTED_WORDS,
  rg_harm_marker: PROTECTED_WORDS,
  rg_under25_history: PROTECTED_WORDS,
  age_minor: PROTECTED_WORDS,
  account_status: PROTECTED_WORDS,
  // U33a-G · the split's `no_consent` bucket ("No consent or recorded basis", S6) — the same words, as P8 requires.
  no_basis: "no consent or recorded basis",
  // U33r · the split's ONE protected line (`AUDIENCE_BUCKET_OF`), so the same ONE value — P8 holds the partition.
  agent_referee: PROTECTED_WORDS,
};

/** U16a · the words for a row that sent nothing without a known refusal at sending. */
export const NOT_SENT_OTHER = {
  /** SKIPPED with a reason this code does not know (the column is text, so a later reason is not a migration). */
  refusedUnknown: "refused by a check made at sending",
  /** FAILED with no provider reference: the network never had the message. */
  neverHanded: "not handed to the network",
  /** PENDING or HELD on a campaign an officer stopped — such a row stays as it is for ever (E25). */
  campaignStopped: "the campaign was stopped before it reached this number",
  /** PENDING or HELD on a campaign that has not finished with it. */
  waiting: "waiting to be sent",
} as const;

/**
 * U16a · what the export makes of each recipient status: the words of a message that reached the network, or null for
 * a row that sent nothing. A FULL Record over the union (UNCONFIRMED in it since U43-0), so a status added later is a
 * compile error here — never a row that quietly leaves a person's file.
 */
const WIRE_WORDS: Readonly<Record<SmsCampaignRecipientStatus, CampaignMessageStatus | null>> = {
  PENDING: null,
  HELD: null,
  SKIPPED: null,
  SENT: "handed over",
  DELIVERED: "delivered",
  UNCONFIRMED: "no answer from the network",
  FAILED: "not delivered",
};

/** A FAILED row reached the network only when it carries the provider's reference — the wire had it, then the network
 *  refused it or a receipt said undelivered. Without one it never left, and it is listed as not sent. */
function wireWordsOf(r: Pick<StoredSmsCampaignRecipient, "status" | "smsReference">): CampaignMessageStatus | null {
  const words = WIRE_WORDS[r.status];
  if (words === null) return null;
  return r.status === "FAILED" && r.smsReference === null ? null : words;
}

/** OD42's rule as `renderForRecipient` applies it, read back from the row: English only when the row went out in English
 *  and the campaign has an English body; otherwise Swahili — the body every other recipient was sent. */
function bodyOfVariant(c: Pick<StoredSmsCampaign, "bodySw" | "bodyEn">, locale: MessagingLocale | null): string {
  const english = locale === "EN" && (c.bodyEn ?? "").trim().length > 0;
  return english ? (c.bodyEn ?? "") : c.bodySw;
}

function notSentReason(r: StoredSmsCampaignRecipient, campaign: Pick<StoredSmsCampaign, "status">): string {
  if (r.status === "SKIPPED") {
    const why = r.skipReason;
    return why !== null && Object.prototype.hasOwnProperty.call(NOT_SENT_REASON, why)
      ? NOT_SENT_REASON[why as MarketingSkipReason]
      : NOT_SENT_OTHER.refusedUnknown;
  }
  if (r.status === "FAILED") return NOT_SENT_OTHER.neverHanded;
  return campaign.status === "CANCELLED" ? NOT_SENT_OTHER.campaignStopped : NOT_SENT_OTHER.waiting;
}

export async function marketingDsarView(user: Pick<StoredUser, "id" | "phoneE164" | "createdAt">): Promise<MarketingDsarSection> {
  const accountNumber = marketingKeyOf(user.phoneE164);
  const since = user.createdAt;

  const rows = new Map<string, StoredMarketingContact>();
  for (const c of await Promise.resolve(db.marketingContact.listByUserId(user.id))) rows.set(c.id, c);
  if (accountNumber) {
    const byNumber = await Promise.resolve(db.marketingContact.findByMsisdn(accountNumber));
    if (byNumber && byNumber.userId === null && byNumber.createdAt >= since) rows.set(byNumber.id, byNumber);
  }
  const numbers = new Set<string>();
  if (accountNumber) numbers.add(accountNumber);
  for (const c of rows.values()) {
    if (c.msisdn === accountNumber) continue;
    // ⛔ A number another live account holds now is that account's record, not this person's.
    const holder = await Promise.resolve(db.user.findByPhone(`+${c.msisdn}`));
    if (!holder || holder.id === user.id) numbers.add(c.msisdn);
  }

  const consent: MarketingDsarSection["consent"] = [];
  const suppression: MarketingDsarSection["suppression"] = [];
  for (const identifier of numbers) {
    const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };
    for (const r of await Promise.resolve(db.messagingConsent.listFor(key))) {
      if (r.createdAt < since) continue;
      consent.push({ status: r.status, source: r.source, wording: r.wording, locale: r.locale, createdAt: r.createdAt });
    }
    for (const s of await Promise.resolve(db.suppression.listFor(identifier))) {
      if (s.channel !== "SMS" || s.category !== "MARKETING") continue;
      const active = !s.liftedAt;
      if (s.createdAt < since && !active) continue;
      suppression.push({ reason: s.reason, createdAt: s.createdAt < since ? null : s.createdAt, liftedAt: s.liftedAt ?? null });
    }
  }

  /* ⭐ U33a-P · READ FROM THE SWITCH, never recomputed here. The screen and this export answer the same question —
     "do offers reach you without your consent?" — and two readings of one fact is how they come to disagree. */
  const toggle = await marketingToggleState(user as Parameters<typeof marketingToggleState>[0]).catch(() => null);
  const record = toggle?.outreach === true ? await Promise.resolve(licenceOutreach()) : null;
  const outreach: MarketingDsarSection["outreach"] =
    record !== null && record.state === "open" ? { basis: "LICENCE_PLAYER", since: record.recordedAt } : null;
  // U33r · the same switch answers whether the account's own number is a promised referee's — never a second reading.
  const agentRefereeExclusion: MarketingDsarSection["agentRefereeExclusion"] = toggle === null ? null : toggle.referee === true;

  // U29b · the staged import rows holding the person's numbers, from the account's creation — through the same allowlist.
  const staged: MarketingDsarSection["staged"] = [];
  for (const identifier of numbers) {
    for (const row of await Promise.resolve(db.contactImportRow.listByMsisdn(identifier))) {
      if (row.stagedAt < since) continue;
      staged.push({
        msisdn: row.msisdn ?? identifier, displayName: row.displayName, email: row.email, tags: [...row.tags],
        outcome: row.outcome, stagedAt: row.stagedAt,
      });
    }
  }

  // U16a · THE CAMPAIGN RECORDS about the same numbers, from the account's creation — through the same allowlist.
  const campaignMessages: MarketingDsarSection["campaignMessages"] = [];
  const notSent: MarketingDsarSection["notSent"] = [];
  const optOutLinks: MarketingDsarSection["optOutLinks"] = [];
  let campaignHistoryCut: string | null = null;
  const createdMs = Date.parse(since);
  if (Number.isFinite(createdMs)) {
    // ONE spelling of the creation instant — the DAL's read takes `toISOString()`'s and refuses any other.
    const from = new Date(createdMs).toISOString();
    // D11 · the person's OWN book rows — those LINKED to the account. On a number other than the account's own, a row is
    // theirs only through the account itself or through one of these.
    const ownBookRows = new Set(Array.from(rows.values()).filter((c) => c.userId === user.id).map((c) => c.id));
    const linkedToThem = (r: StoredSmsCampaignRecipient) =>
      r.userId === user.id || (r.contactId !== null && ownBookRows.has(r.contactId));
    const held: StoredSmsCampaignRecipient[] = [];
    for (const identifier of numbers) {
      // A recipient row only ever holds the bare gateway key (`assertSeeds` refuses any other), so a number that is not
      // one has no row to read — and the DAL's read would refuse it rather than answer for a spelling no row holds.
      if (!isGatewayMsisdn(identifier)) continue;
      const answer = await Promise.resolve(db.smsCampaignRecipient.listByMsisdn(identifier, from));
      // D10 · the DAL reads ONE row past the cap: when it is there, this number's oldest rows are not in the file — said
      // in words, never dropped in silence. The newest `SMS_RECIPIENTS_BY_NUMBER_MAX` are the ones kept.
      if (answer.length > SMS_RECIPIENTS_BY_NUMBER_MAX) campaignHistoryCut = CAMPAIGN_HISTORY_CUT;
      const listed = answer.slice(0, SMS_RECIPIENTS_BY_NUMBER_MAX);
      // D11 · the account's own number: every row the bound admits. Another number of theirs: only rows linked to them.
      held.push(...(identifier === accountNumber ? listed : listed.filter(linkedToThem)));
    }
    held.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
    // ONE read per distinct campaign: the body of the variant sent, and whether a waiting row's campaign was stopped.
    const campaigns = new Map<string, StoredSmsCampaign>();
    for (const campaignId of new Set(held.map((r) => r.campaignId))) {
      const campaign = await Promise.resolve(db.smsCampaign.find(campaignId));
      // ⛔ The campaign link is RESTRICT and neither twin can delete a campaign, so a row whose campaign is gone means a
      // damaged store — refused loudly rather than exported with a hole where the message was.
      if (!campaign) throw new Error("marketingDsarView: a campaign recipient row names a campaign that is not there — the link is RESTRICT, so the store is damaged");
      campaigns.set(campaignId, campaign);
    }
    const carried = new Set<string>();
    for (const r of held) {
      const campaign = campaigns.get(r.campaignId) as StoredSmsCampaign;
      if (r.optOutToken !== null) carried.add(r.optOutToken);
      const status = wireWordsOf(r);
      if (status !== null) {
        campaignMessages.push({ sentAt: r.sentAt, status, message: bodyOfVariant(campaign, r.locale), deliveredAt: r.deliveredAt });
      } else {
        // A row put on its campaign before the account (read because it was SENT since, D12) is listed undated.
        notSent.push({ at: Date.parse(r.createdAt) >= createdMs ? r.createdAt : null, reason: notSentReason(r, campaign) });
      }
    }
    for (const identifier of numbers) {
      const ownNumber = identifier === accountNumber;
      for (const t of await Promise.resolve(db.marketingOptOutToken.listFor(identifier))) {
        if (t.channel !== "SMS" || t.category !== "MARKETING") continue;
        // An unreadable mint date reads as BEFORE the account — listed only when carried, and undated (do not disclose).
        const mintedBefore = !(Date.parse(t.createdAt) >= createdMs);
        // The account's own number: a link minted since the account, or one their own message carried. D11 · another
        // number of theirs: ONLY a link their own message carried — the stranger holding it now has links of their own.
        if (!carried.has(t.token) && (mintedBefore || !ownNumber)) continue;
        optOutLinks.push({ ref: optOutTokenRef(t.token), createdAt: mintedBefore ? null : t.createdAt });
      }
    }
  }

  return {
    contacts: Array.from(rows.values()).map((c) => ({
      msisdn: c.msisdn, displayName: c.displayName, email: c.email, operator: c.operator, source: c.source,
      consentState: c.consentState, suppressedAt: c.suppressedAt, tags: c.tags,
      createdAt: c.createdAt, updatedAt: c.updatedAt,
    })),
    consent,
    suppression,
    staged,
    outreach,
    agentRefereeExclusion,
    campaignMessages,
    notSent,
    optOutLinks,
    campaignHistoryCut,
  };
}
