/**
 * U37b · THE DRAFT SAVE — what `/admin/campaigns/new`'s one Save button writes (decisions X12 · X15 · M5 · OD55).
 *
 * ⭐ THE SERVER'S VERDICT, NEVER THE BROWSER'S. The composer shows a live counter, but what is stored is re-decided
 * here: `validateCampaignTemplate` — the ONE verdict the screen and the renderer share — runs again on the posted text,
 * and the coding and segment count saved beside each body (`codingSw`/`segmentsSw`, `codingEn`/`segmentsEn`) are the
 * SERVER's counter's. The confirmation's estimate is priced from these stored figures (X15, M16), so a posted
 * "1 segment" for a two-segment body would price a campaign nobody will send. ⛔ The input type carries no segments,
 * coding, sender or source line, and nothing here reads one from the post.
 *
 * ⭐ U37s · THE SOURCE LINE IS STAMPED, NEVER POSTED (G5). Every DRAFT save stamps the SAVED `source.phrase` wording
 * (Admin → System → Marketing wordings) onto the row — on the first save and on every edit, so a draft never keeps a
 * line that has since been changed or cleared — and the server's verdict prices exactly that line. Blank while nothing is
 * saved: the row stores null, the counter reserves the longest line allowed, and a contact-book recipient is refused,
 * as before G5. A campaign past DRAFT keeps the line frozen on it (a save of it is refused `not_draft`).
 * ⛔ The line is READ FRESH for the stamp (`readSavedSourcePhrase` — the row, re-read), never from this process's cache
 * alone: a container that has not loaded the row yet, or still holds the version it booted with, would stamp none or a
 * stale one over a good line. A read that cannot answer refuses the save (`source_unreadable`) and writes nothing.
 *
 * ⭐ ONE OPTIMISTIC MECHANISM (X12): an edit is a compare-and-set on `draftRevision` through the campaign door's one
 * draft writer (`db.smsCampaign.update`), which writes only while the row is still a DRAFT on the revision the form was
 * rendered on and moves it on by one. No second update method, and no timestamp compare. A refused write is re-read
 * once, only to say WHY: gone (`not_found`), confirmed or cancelled since (`not_draft`), or saved by someone else
 * (`stale`, with the time they saved).
 *
 * ⭐ THE AUDIENCE IS A FILTER (U24's canonical key, X13), read from the composer's own address in the contacts filter
 * vocabulary (U38 adds the controls that write it). ⛔ OD55: a whole phone number is refused — a campaign targets a
 * group; one person is reached only by the officer's own test send, and a number frozen into a confirmed campaign's
 * filter is a key erasure would have to chase (U16). A name search stays allowed for a viewer who reads numbers.
 * ⛔ X25 · A POSTED filter meets the campaign door's OWN rule (`campaignAudienceRefusal`, the one U38a's count asks):
 * a ticked selection for every role, and for this viewer the role rule — consent, source, player, stop, and ANY search
 * for a viewer who may not read a number (validation audit, 2026-10-03: a masked officer could save `?q=asha`, which
 * the count then refused). A STORED filter is held to the rule every role meets and kept as it is — the screen notes
 * it, and nothing on the page could take it out.
 *
 * ⭐ WHAT IS STORED IS WHAT WAS JUDGED (validation audit, 2026-10-03): the name cleaned by the contact book's ONE name
 * cleaner — and a name holding a Tanzanian mobile number is refused by the ONE verdict (`validateCampaignTemplate`, so
 * the screen refuses it before Save is pressed; a campaign row is never deleted); a body's `{jina}` fallback stored ONLY
 * while that body uses `{jina}` — a hidden, unchecked word is never kept.
 *
 * `marketing.campaign_created` is written once, when the draft is born. Owed: U50 registers it.
 *
 * Guard: `npm run test:campaign-compose` §17 (the source line: §17.13–§17.16).
 */
import { db } from "@/lib/server/store";
import type { SmsCampaignDraftGuard, SmsCampaignDraftPatch, StoredSmsCampaign } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { randomId } from "@/lib/server/crypto";
import { validateCampaignTemplate, scanPlaceholders } from "@/lib/marketing/campaign-template";
import type { CampaignDraftFields, TemplateField, TemplateVerdict } from "@/lib/marketing/campaign-template";
import { cleanDisplayName } from "@/lib/contacts/contact-fields";
import type { SmsEncoding } from "@/lib/sms-compose";
import {
  WHOLE_BOOK, parseContactAudienceParams, parseContactAudienceJson, contactAudienceKey, campaignAudienceRefusal,
  auditContactAudience, scrubPhoneRuns, CAMPAIGN_AUDIENCE_SELECTION,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { holdsPhoneRun } from "@/lib/contacts/contact-fields";
import { SMS_CAMPAIGN_VALUE } from "@/lib/server/marketing/campaign-model";
import { currentWording, freshWording } from "@/lib/server/marketing/wordings";
import { formatClock } from "@/lib/utils";

/* ══ THE SENTENCES — the server's, shown as they are ═══════════════════════════════════════════════════════════════ */

export const CAMPAIGN_CREATED_ACTION = "marketing.campaign_created";
export const CAMPAIGN_DRAFT_INVALID = "The draft wasn't saved — fix what is marked below.";
export const CAMPAIGN_DRAFT_MISSING = "This draft no longer exists — start a new SMS campaign.";
export const CAMPAIGN_NOT_DRAFT = "This campaign is no longer a draft — its message can't change.";
/** OD55 · said on the audience card. */
export const CAMPAIGN_AUDIENCE_ONE_NUMBER =
  "A campaign goes to a group, never to one phone number — take the number out of the audience. To see the message on a phone, use the test send: it goes to your own number.";
/** ⭐ The sentence lives in `audience.ts` (U38a's campaign door refuses a selection with it too) — ONE copy. */
export { CAMPAIGN_AUDIENCE_SELECTION };
export const CAMPAIGN_AUDIENCE_UNREADABLE = "The saved audience could not be read — choose it again.";
/** U37s · the source line's fresh read could not answer — nothing was saved, and nothing the officer typed is wrong. */
export const CAMPAIGN_SOURCE_LINE_UNREADABLE =
  "The campaign's source line couldn't be read just now, so the draft wasn't saved — try again in a moment.";

/** Someone saved since this form was rendered — when, on the console's clock. */
export function campaignDraftStale(updatedAt: string): string {
  return `Someone else saved this draft at ${formatClock(updatedAt)} — reload to see their version before changing it.`;
}

/* ══ THE SHAPES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A field a refusal can name: the template's own, and the audience card. */
export type CampaignDraftField = TemplateField | "audience";

/**
 * What the composer posts — the officer's five fields, the draft it edits, and the composer's own address.
 * ⛔ No segments, no coding, no sender, no source line: those are computed here or set on the server.
 */
export type CampaignDraftInput = {
  /** null = a new draft. */
  id: string | null;
  /** The revision the form was rendered on — REQUIRED with an id (the compare in X12's compare-and-set). */
  draftRevision: number | null;
  name: string;
  bodySw: string;
  bodyEn: string;
  nameFallbackSw: string;
  nameFallbackEn: string;
  /** The composer's address in the contacts filter vocabulary; null keeps the stored audience (a new draft: the whole book). */
  audience: Record<string, string> | null;
};

export type CampaignDraftOptions = {
  /** May this officer read a number (`identity.contact` = read)? A posted filter is held to `campaignAudienceRefusal` (X25 · A1.1). */
  viewerReads: boolean;
};

export type CampaignDraftSaved = {
  ok: true;
  id: string;
  draftRevision: number;
  savedAt: string;
  created: boolean;
  codingSw: SmsEncoding;
  segmentsSw: number;
  codingEn: SmsEncoding | null;
  segmentsEn: number | null;
};
export type CampaignDraftRefusal =
  | { ok: false; reason: "invalid"; error: string; problems: Partial<Record<CampaignDraftField, string[]>> }
  | { ok: false; reason: "not_found" | "not_draft" | "stale" | "source_unreadable"; error: string };
export type CampaignDraftResult = CampaignDraftSaved | CampaignDraftRefusal;

/** The ONE campaign door's draft members, and the rest of what a save touches — swappable for in-process red plants. */
export type CampaignDraftDeps = {
  campaigns: {
    find: (id: string) => Promise<StoredSmsCampaign | null>;
    create: (row: StoredSmsCampaign) => Promise<StoredSmsCampaign>;
    update: (id: string, patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard, at: string) => Promise<StoredSmsCampaign | null>;
  };
  validate: typeof validateCampaignTemplate;
  /** U37s · the saved source line, read FRESH (`readSavedSourcePhrase`) — or a read that could not answer. */
  sourcePhrase: () => Promise<SourcePhraseRead> | SourcePhraseRead;
  /** OD55's rule (`wholeNumberAudienceProblem`). */
  audienceRule: (f: ContactAudienceFilter) => string | null;
  audit: (entry: Parameters<typeof audit>[0]) => unknown;
  now: () => Date;
  newId: () => string;
};

/* ══ THE AUDIENCE ════════════════════════════════════════════════════════════════════════════════════════════════ */

/** U24's canonical `q` holds a WHOLE number as its bare `255…` key (and a name as text), so this shape IS one person. */
const WHOLE_NUMBER_KEY = /^255[0-9]{9}$/;

/**
 * ⛔ OD55 · the sentence when the audience holds a whole phone number ANYWHERE it can, else null: the search, a tag, a
 * list id, the import id. U37b's review (m4): `?tag=0712345678`, or a search padded past the number parser ("0712345678
 * 0" stays name text), stored one person in a field the canonical-key test never read. A name search passes.
 * ⭐ The officer's TEXT — the search and the tags — is asked THE ONE REFUSAL the book's writers ask (`holdsPhoneRun`: a
 * Tanzanian mobile number), so a tag the book accepts ("5000-10000") can always be aimed at (the vb5 review, m3). The
 * IDS are asked the broad mask: the store mints list and import ids as letters only (`cl_…`, `ci_…`), so any run of
 * nine digits in one is a hand-made address.
 */
export function wholeNumberAudienceProblem(f: ContactAudienceFilter): string | null {
  const texts = [f.q ?? "", ...(f.tags ?? [])];
  const ids = [...(f.lists ?? []), f.importId ?? ""];
  const canonical = f.q !== null && WHOLE_NUMBER_KEY.test(f.q.trim());
  return canonical || texts.some((t) => t !== "" && holdsPhoneRun(t)) || ids.some((t) => t !== "" && scrubPhoneRuns(t) !== t)
    ? CAMPAIGN_AUDIENCE_ONE_NUMBER
    : null;
}

type AudienceVerdict = { ok: true; filter: ContactAudienceFilter; key: string; write: boolean } | { ok: false; reason: string };

/**
 * The audience this save stores: the posted address (re-parsed here — an unknown value refuses, C2), else the stored
 * filter (kept as it is), else the whole book. The campaign door's rule and OD55 are asked of every one of them.
 */
function audienceOf(
  posted: Record<string, string> | null,
  current: StoredSmsCampaign | null,
  viewerReads: boolean,
  rule: CampaignDraftDeps["audienceRule"],
): AudienceVerdict {
  let filter: ContactAudienceFilter = WHOLE_BOOK;
  if (posted !== null) {
    const parsed = parseContactAudienceParams(posted);
    if (!parsed.ok) return { ok: false, reason: parsed.reason };
    filter = parsed.filter;
  } else if (current !== null) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(current.audienceFilter);
    } catch {
      return { ok: false, reason: CAMPAIGN_AUDIENCE_UNREADABLE };
    }
    const parsed = parseContactAudienceJson(raw);
    if (!parsed.ok) return { ok: false, reason: CAMPAIGN_AUDIENCE_UNREADABLE };
    filter = parsed.filter;
  }
  // ⛔ X25 · THE CAMPAIGN DOOR'S OWN RULE, the one U38a's count asks — never the book's narrower `roleRefusal`. A POSTED
  // filter is the officer's own choice: it meets this viewer's role rule (any search, for a viewer who may not read a
  // number). A STORED one meets the rule every role meets — a ticked selection — and is otherwise kept as it is.
  const door = campaignAudienceRefusal(filter, posted !== null ? viewerReads : true);
  if (door !== null) return { ok: false, reason: door.reason };
  const one = rule(filter);
  if (one !== null) return { ok: false, reason: one };
  return { ok: true, filter, key: contactAudienceKey(filter), write: posted !== null || current === null };
}

/* ══ THE SAVE ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const text = (v: unknown): string => (typeof v === "string" ? v : "");
/** ⛔ THE COLUMN'S OWN RULE (`campaign-model.ts`): a whole number within Postgres INTEGER — never a second copy here, so
 *  a revision past 2,147,483,647 is "no revision" (stale), not a value the door then throws on. */
const isRevision = SMS_CAMPAIGN_VALUE.draftRevision;
const orNull = (s: string): string | null => (s === "" ? null : s);
/** A source line as it is stamped: trimmed, and null when blank — a line of spaces is no line. */
const phraseOrNull = (v: unknown): string | null => {
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
};

/** U37s · the source line as a draft save reads it: the line (null — never saved, or cleared), or no answer. */
export type SourcePhraseRead = { ok: true; phrase: string | null } | { ok: false };

/**
 * ⭐ U37s · THE SOURCE LINE A DRAFT SAVE STAMPS — the newest SAVED `source.phrase` wording as the ROW holds it now
 * (`freshWording`, re-read), trimmed; null while nothing is saved or the saved line was cleared (W1: never a suggestion).
 * ⛔ `{ ok: false }` when the read cannot answer — the save then refuses, so a good stamp is never replaced by a guess.
 * The wording's own rules are the renderer's (`sourcePhraseProblems`, 30 septets as printed), checked when it is saved.
 */
export async function readSavedSourcePhrase(): Promise<SourcePhraseRead> {
  const read = await freshWording("source.phrase");
  return read.ok ? { ok: true, phrase: phraseOrNull(read.version?.text) } : { ok: false };
}

/**
 * The same line from this process's cache — for the composer's DISPLAY only (its counter and its stale note), which
 * acts on nothing: the save re-reads the row itself (`readSavedSourcePhrase`) and re-judges what it stores.
 */
export function savedSourcePhrase(): string | null {
  return phraseOrNull(currentWording("source.phrase")?.text);
}

/** The figures stored beside each body — the SERVER's counter's, from the verdict it just computed (X15). */
function storedFigures(verdict: TemplateVerdict, fields: CampaignDraftFields): Pick<StoredSmsCampaign,
  "bodyEn" | "codingSw" | "segmentsSw" | "codingEn" | "segmentsEn"> {
  const en = verdict.counters.EN;
  const english = fields.bodyEn !== "" && en !== null;
  return {
    codingSw: verdict.counters.SW.encoding,
    segmentsSw: verdict.counters.SW.segments,
    bodyEn: english ? fields.bodyEn : null,
    codingEn: english ? en.encoding : null,
    segmentsEn: english ? en.segments : null,
  };
}

/**
 * ⛔ A `{jina}` FALLBACK IS STORED ONLY WHILE ITS BODY USES `{jina}`. The screen hides the field once the placeholder is
 * gone and the verdict stops judging it — so a word kept anyway would be stored UNCHECKED ("Rafiki1" typed, then the
 * placeholder deleted). Not judged, not kept.
 */
function storedFallbacks(fields: CampaignDraftFields): Pick<StoredSmsCampaign, "nameFallbackSw" | "nameFallbackEn"> {
  const uses = (body: string) => body !== "" && scanPlaceholders(body).jina > 0;
  return {
    nameFallbackSw: uses(fields.bodySw) ? orNull(fields.nameFallbackSw) : null,
    nameFallbackEn: uses(fields.bodyEn) ? orNull(fields.nameFallbackEn) : null,
  };
}

/** The first sentence of a refused verdict, in the screen's field order — for the toast and the Save line. */
function firstProblem(problems: Partial<Record<CampaignDraftField, string[]>>): string {
  const order: CampaignDraftField[] = ["name", "bodySw", "nameFallbackSw", "bodyEn", "nameFallbackEn", "sourcePhrase", "audience"];
  for (const k of order) {
    const p = problems[k]?.[0];
    if (p) return p;
  }
  return CAMPAIGN_DRAFT_INVALID;
}

export const CAMPAIGN_DRAFT_DEPS: CampaignDraftDeps = {
  campaigns: {
    find: (id) => db.smsCampaign.find(id),
    create: (row) => db.smsCampaign.create(row),
    update: (id, patch, guard, at) => db.smsCampaign.update(id, patch, guard, at),
  },
  validate: validateCampaignTemplate,
  sourcePhrase: readSavedSourcePhrase,
  audienceRule: wholeNumberAudienceProblem,
  audit,
  now: () => new Date(),
  newId: () => `cmp_${randomId(12)}`,
};

/**
 * ⭐ SAVE ONE DRAFT. A new one is born a DRAFT at revision 0 with the officer as `createdBy`; an existing one is changed
 * only by the compare-and-set on the revision the form carried.
 */
export async function saveCampaignDraft(
  input: CampaignDraftInput,
  officerId: string,
  options: CampaignDraftOptions,
  deps: CampaignDraftDeps = CAMPAIGN_DRAFT_DEPS,
): Promise<CampaignDraftResult> {
  // ⛔ Every field re-read BY NAME and trimmed — the name by the contact book's ONE name cleaner, as the verdict reads
  // it; what is validated below is exactly what is stored.
  const fields: CampaignDraftFields = {
    name: cleanDisplayName(text(input?.name)) ?? "",
    bodySw: text(input?.bodySw).trim(),
    bodyEn: text(input?.bodyEn).trim(),
    nameFallbackSw: text(input?.nameFallbackSw).trim(),
    nameFallbackEn: text(input?.nameFallbackEn).trim(),
  };
  const id = text(input?.id).trim();

  // ── the draft it edits, if it edits one ──
  let current: StoredSmsCampaign | null = null;
  if (id !== "") {
    current = await deps.campaigns.find(id);
    if (current === null) return { ok: false, reason: "not_found", error: CAMPAIGN_DRAFT_MISSING };
    if (current.status !== "DRAFT") return { ok: false, reason: "not_draft", error: CAMPAIGN_NOT_DRAFT };
    // ⛔ No revision, no compare — an edit that cannot say which version it was made on is refused as stale.
    if (!isRevision(input?.draftRevision)) return { ok: false, reason: "stale", error: campaignDraftStale(current.updatedAt) };
  }

  // ── U37s · the source line this save will stamp, read fresh — ⛔ no answer, no save (never a guessed or blank stamp) ──
  const read = await deps.sourcePhrase();
  if (!read || read.ok !== true) return { ok: false, reason: "source_unreadable", error: CAMPAIGN_SOURCE_LINE_UNREADABLE };
  const phrase = phraseOrNull(read.phrase);

  // ── the audience, and the template — the server's verdict on both ──
  const problems: Partial<Record<CampaignDraftField, string[]>> = {};
  const audience = audienceOf(input?.audience ?? null, current, options.viewerReads, deps.audienceRule);
  if (!audience.ok) problems.audience = [audience.reason];
  // M5 · U37s · the source line is the SAVED wording (owner gate G5), stamped on every draft save — never posted — and
  // the verdict prices exactly the line the row will carry (blank: the longest line allowed is reserved).
  // ⭐ The ONE verdict refuses a name holding a phone number too, exactly as the screen did before Save was pressed.
  const verdict = deps.validate(fields, phrase ?? "");
  Object.assign(problems, verdict.problems);
  if (!audience.ok || !verdict.ok || Object.keys(problems).length > 0) {
    return { ok: false, reason: "invalid", error: firstProblem(problems), problems };
  }

  const figures = storedFigures(verdict, fields);
  const fallbacks = storedFallbacks(fields);
  const at = deps.now().toISOString();

  if (current === null) {
    const row: StoredSmsCampaign = {
      id: deps.newId(), name: fields.name, status: "DRAFT", bodySw: fields.bodySw, bodyEn: figures.bodyEn,
      codingSw: figures.codingSw, segmentsSw: figures.segmentsSw, codingEn: figures.codingEn, segmentsEn: figures.segmentsEn,
      nameFallbackSw: fallbacks.nameFallbackSw, nameFallbackEn: fallbacks.nameFallbackEn, sourcePhrase: phrase,
      draftRevision: 0, confirmTier: null, audienceFilter: audience.key, audienceCount: null, audienceWatermark: null,
      estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null,
      createdBy: officerId, confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null,
      createdAt: at, updatedAt: at,
    };
    const created = await deps.campaigns.create(row);
    await deps.audit({
      category: "ADMIN",
      action: CAMPAIGN_CREATED_ACTION,
      actorId: officerId,
      targetType: "SmsCampaign",
      targetId: created.id,
      // ⛔ The audience as the chain may hold it: masked, a name search by its length only (U24's own form).
      payload: {
        english: figures.bodyEn !== null,
        segmentsSw: figures.segmentsSw,
        segmentsEn: figures.segmentsEn,
        audience: auditContactAudience(audience.filter),
      },
    });
    return {
      ok: true, id: created.id, draftRevision: created.draftRevision, savedAt: created.updatedAt, created: true,
      codingSw: created.codingSw, segmentsSw: created.segmentsSw, codingEn: created.codingEn, segmentsEn: created.segmentsEn,
    };
  }

  // ⛔ A body travels WITH its saved figures (the door refuses one without the other), and the English three together.
  const patch: SmsCampaignDraftPatch = {
    name: fields.name,
    bodySw: fields.bodySw, codingSw: figures.codingSw, segmentsSw: figures.segmentsSw,
    bodyEn: figures.bodyEn, codingEn: figures.codingEn, segmentsEn: figures.segmentsEn,
    nameFallbackSw: fallbacks.nameFallbackSw, nameFallbackEn: fallbacks.nameFallbackEn,
    // ⛔ U37s · re-stamped on EVERY edit: a draft never keeps a line that was changed or cleared since it was stamped.
    sourcePhrase: phrase,
    ...(audience.write ? { audienceFilter: audience.key } : {}),
  };
  const revision = input.draftRevision as number;
  const saved = await deps.campaigns.update(current.id, patch, { draftRevision: revision }, at);
  if (saved === null) {
    // The compare-and-set refused: say why, from one fresh read.
    const now = await deps.campaigns.find(current.id);
    if (now === null) return { ok: false, reason: "not_found", error: CAMPAIGN_DRAFT_MISSING };
    if (now.status !== "DRAFT") return { ok: false, reason: "not_draft", error: CAMPAIGN_NOT_DRAFT };
    return { ok: false, reason: "stale", error: campaignDraftStale(now.updatedAt) };
  }
  return {
    ok: true, id: saved.id, draftRevision: saved.draftRevision, savedAt: saved.updatedAt, created: false,
    codingSw: saved.codingSw, segmentsSw: saved.segmentsSw, codingEn: saved.codingEn, segmentsEn: saved.segmentsEn,
  };
}
