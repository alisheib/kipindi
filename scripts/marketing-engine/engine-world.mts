/**
 * test:marketing-engine — U43b-2's SHARED FIXTURE WORLD for its section modules (§S · §R · §C · §T). Not a section: it holds
 * no claim and no plant. It builds, on the MEMORY twin, through the store's own doors: consenting players exactly as the
 * ONE gate clears them (an account, its toggle on, an SMS-naming GIVEN ledger row, a wallet), RUNNING campaigns walked
 * through the ONE transition door (DRAFT → CONFIRMED → PREPARING → RUNNING), recipient rows through the seed door, a stub
 * wire that answers like `sendBatch` (results keyed by target, never by place), and the engine's dependencies with every
 * shop-wide read made FIXED — the send window always open (`scripts/lib/send-window.mts`, ENGINE-SPEC §5 rule 9: a
 * battery at night must not see every slice wait), money idle, no OTP failure, the console provider — so a claim changes
 * exactly the read it is about.
 * ⛔ No SMS can be sent from here: every wire is a stub, and the provider is the console. ⛔ No database: the host removes
 * the database variables before the first server module loads. ⛔ No backslash in this file (an editing tool decodes
 * them): patterns are character classes.
 */
import { db } from "../../src/lib/server/store.ts";
import type {
  SmsCampaignStatus, StoredSmsCampaign, StoredSmsCampaignRecipient, StoredSmsMessage, StoredUser,
} from "../../src/lib/server/store.ts";
import * as ENGINE from "../../src/lib/server/marketing/engine.ts";
import type { EngineDeps, EngineProcessState, SliceStepResult } from "../../src/lib/server/marketing/engine.ts";
import { SMS_CONSENT_WORDINGS } from "../../src/lib/marketing/consent-wording.ts";
import type { SmsBatchOptions, SmsBatchOutcome, SmsFailureCode, SmsOutbound, SmsResult } from "../../src/lib/server/sms.ts";
import { auditFlush, getAuditPage } from "../../src/lib/server/audit.ts";
import type { AuditEntry } from "../../src/lib/server/audit.ts";
// U13 · every slice a section drives is handed a FIXED window (ENGINE-SPEC §5 rule 9; `test:marketing-window` W6).
import { ALWAYS_OPEN, ALWAYS_CLOSED, NOON_EAT_MS } from "../lib/send-window.mts";

export { ALWAYS_OPEN, ALWAYS_CLOSED, NOON_EAT_MS };

/** The host's `ok`: one claim, by its label. */
export type Check = (label: string, cond: boolean, detail?: string) => void;

/** One claim: its body answers [holds, detail]; a body that throws is that claim's failure, never the section's end. */
export async function claim(ok: Check, label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err).slice(0, 240)}`);
  }
}

export const json = (v: unknown): string => JSON.stringify(v);
export const NL = String.fromCharCode(10);

/* ══ PEOPLE ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ A sentence the gate COUNTS (OQ11) — the Swahili profile sentence, pinned. */
export const PINNED_SW = SMS_CONSENT_WORDINGS.find((w) => w.site === "PROFILE" && w.locale === "SW")?.wording ?? "";

/** A bare gateway key on one NDC: `255`, the two NDC digits, seven more — made up, never a real person's. */
export const keyIn = (ndc: string, n: number): string => `255${ndc}${String(n).padStart(7, "0")}`;

let STAMP = 0;
/** A fresh run number: every fixture name and number of a run carries it, so a plant's re-run never meets an earlier one. */
export const nextRun = (): number => ++STAMP;

const T_PAST = "2024-06-01T00:00:00.000Z";

/**
 * ⭐ A CONSENTING PLAYER, as the ONE gate clears one: a PLAYER account (adult, active, the toggle on, the number stored with
 * its plus, as registration stores it), an SMS-naming GIVEN ledger row for the number, and a wallet. `consent: false`
 * leaves the toggle off and writes no ledger row — a player the gate refuses `no_consent`.
 */
export async function player(id: string, key: string, over: Partial<StoredUser> = {}, consent = true): Promise<{ id: string; key: string }> {
  const at = new Date().toISOString();
  await Promise.resolve(db.user.create({
    id, phoneE164: `+${key}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: consent, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null, ...over,
  } as StoredUser));
  if (consent) {
    await Promise.resolve(db.messagingConsent.create({
      id: `lc_${id}`, channel: "SMS", identifier: key, category: "MARKETING", status: "GIVEN", source: "PROFILE",
      wording: PINNED_SW, locale: "SW", evidence: "fixture", recordedBy: null, createdAt: T_PAST,
    }));
  }
  await Promise.resolve(db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at,
  } as never));
  return { id, key };
}

/** A contact-book row for a number — linked to the account that holds it when `userId` is given (STEP 23's shape). */
export async function bookContact(id: string, key: string, userId: string | null = null): Promise<string> {
  const at = new Date().toISOString();
  const r = await Promise.resolve(db.marketingContact.create({
    id, msisdn: key, rawInput: key, displayName: null, email: null, ndc: key.slice(3, 5), operator: null, source: "IMPORT",
    sourceRef: null, userId, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
    createdAt: at, createdBy: null, updatedAt: at, updatedBy: null,
  } as never));
  if (r === null) throw new Error(`fixture: the book row ${id} collided`);
  return id;
}

/* ══ CAMPAIGNS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The source line every fixture campaign carries (≤ 30 septets, one line, GSM-7) — a book recipient's message needs it. */
export const SOURCE_LINE = "Kutoka orodha ya 50pick.";
export const BODY_SW = "50pick: Habari {jina}, ofa ya leo.";
export const BODY_EN = "50pick: Hi {jina}, today's offer.";

export type CampaignShape = {
  count: number;
  bodySw?: string;
  bodyEn?: string | null;
  sourcePhrase?: string | null;
  fallbackSw?: string;
  fallbackEn?: string | null;
};

/**
 * ⭐ A RUNNING CAMPAIGN, walked through the ONE transition door as U40a, Start and U42's finish leave one: confirmed
 * TYPED at `count`, started, its list finished. Its message greets by `{jina}` (fallback "Rafiki"), carries the source
 * line, and is one GSM-7 segment.
 */
export async function runningCampaign(id: string, s: CampaignShape): Promise<StoredSmsCampaign> {
  const at = new Date().toISOString();
  const bodyEn = s.bodyEn === undefined ? null : s.bodyEn;
  await db.smsCampaign.create({
    id, name: `Engine ${id}`, status: "DRAFT", bodySw: s.bodySw ?? BODY_SW, bodyEn,
    codingSw: "GSM7", segmentsSw: 1, codingEn: bodyEn === null ? null : "GSM7", segmentsEn: bodyEn === null ? null : 1,
    nameFallbackSw: s.fallbackSw ?? "Rafiki", nameFallbackEn: bodyEn === null ? null : (s.fallbackEn ?? "Friend"),
    sourcePhrase: s.sourcePhrase === undefined ? SOURCE_LINE : s.sourcePhrase, draftRevision: 0, confirmTier: null,
    audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null, audienceWatermark: null, estimateSegments: null,
    estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: "usr_u43b2_officer",
    confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
  } as StoredSmsCampaign);
  const move = async (from: SmsCampaignStatus, to: SmsCampaignStatus, patch: Record<string, unknown>, draftRevision: number | null) => {
    const r = await db.smsCampaign.transition(id, { from: [from], to, patch: patch as never, draftRevision, at });
    if (r === null) throw new Error(`fixture: ${id} did not move ${from} → ${to}`);
  };
  await move("DRAFT", "CONFIRMED", {
    audienceCount: s.count, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: s.count, estimateTzs: s.count * 6,
    budgetTzs: 10_000, confirmedBy: "usr_u43b2_officer", confirmedAt: at,
  }, 0);
  await move("CONFIRMED", "PREPARING", { startedAt: at }, null);
  await move("PREPARING", "RUNNING", { enqueuedAt: at, enqueueCursor: "done" }, null);
  const row = await db.smsCampaign.find(id);
  if (row === null) throw new Error(`fixture: ${id} was not stored`);
  return row;
}

/** A campaign move an officer (or a fixture) makes through the ONE door. */
export async function moveCampaign(id: string, from: SmsCampaignStatus[], to: SmsCampaignStatus, patch: Record<string, unknown>): Promise<void> {
  const at = new Date().toISOString();
  const r = await db.smsCampaign.transition(id, { from, to, patch: patch as never, draftRevision: null, at });
  if (r === null) throw new Error(`fixture: the move to ${to} did not land`);
}
export const officerPause = (id: string): Promise<void> =>
  moveCampaign(id, ["RUNNING"], "PAUSED", { pausedAt: new Date().toISOString(), stopReason: "officer_paused" });

/** One person on a campaign: the row id (sorts in the given order), the key, and the links a seed carries. */
export type Seat = { id: string; key: string; userId?: string | null; contactId?: string | null };

/** Rows on a campaign, through the ONE seed door — whole batch or nothing. */
export async function seat(campaignId: string, seats: readonly Seat[]): Promise<void> {
  const at = new Date().toISOString();
  const r = await db.smsCampaignRecipient.createMany(seats.map((s) => ({
    id: s.id, campaignId, msisdn: s.key, contactId: s.contactId ?? null, userId: s.userId ?? null, optOutToken: null, createdAt: at,
  })));
  if (r.inserted !== seats.length) throw new Error(`fixture: ${seats.length - r.inserted} seat(s) on ${campaignId} were not inserted`);
}

/** A row as the store holds it now (a copy). */
export async function rowOf(id: string): Promise<StoredSmsCampaignRecipient | null> {
  return db.smsCampaignRecipient.find(id);
}
export async function campaignOf(id: string): Promise<StoredSmsCampaign | null> {
  return db.smsCampaign.find(id);
}
/** The memory twin's maps, read directly where a claim needs the stored truth of more than one row. */
type Mem = { smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>; smsMessages: Map<string, StoredSmsMessage> };
export function mem(): Mem {
  const s = (globalThis as unknown as { __50PICK_STORE?: Mem }).__50PICK_STORE;
  if (!s || !s.smsCampaignRecipients || !s.smsMessages) throw new Error("the memory store is not loaded — this suite runs on the memory twin only");
  return s;
}
export const rowsOn = (campaignId: string): StoredSmsCampaignRecipient[] =>
  [...mem().smsCampaignRecipients.values()].filter((r) => r.campaignId === campaignId).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** Every audit row of one action against one target. */
export async function auditRows(action: string, targetId: string): Promise<AuditEntry[]> {
  await auditFlush();
  return getAuditPage({ limit: 50_000 }).filter((e) => e.action === action && e.targetId === targetId);
}
/** Every audit row against one target, whatever its action. */
export async function auditFor(targetId: string): Promise<AuditEntry[]> {
  await auditFlush();
  return getAuditPage({ limit: 50_000 }).filter((e) => e.targetId === targetId);
}

/* ══ THE WIRE ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** How the stub wire answers one message: accepted, the reply lost (TRANSPORT — sms.ts's ambiguous), refused by the
 *  gateway's own `status:false` (REJECTED), a number it cannot dial (BAD_MSISDN), or no result at all for it. */
export type WireAnswer = "ok" | "transport" | "rejected" | "bad_msisdn" | "missing";

export type Wire = {
  calls: number;
  /** Every message handed to the wire, in order. */
  sent: SmsOutbound[];
  /** The options of every call (the credit kept for codes, E16). */
  opts: SmsBatchOptions[];
  send: (messages: SmsOutbound[], opts: SmsBatchOptions) => Promise<SmsBatchOutcome>;
};

/**
 * ⭐ A STUB WIRE that answers like `sendBatch`: results keyed by the caller's target (in REVERSE order, so nothing settled
 * by place can pass), references `ref_<target id>`; or a whole-batch refusal (`refused`, nothing sent); or a throw.
 * `during` runs inside the send, before it answers (a receipt landing between the wire and the settle, S16). `delayMs`
 * yields, so concurrent drivers interleave (§C).
 */
export function stubWire(o: {
  answer?: (m: SmsOutbound) => WireAnswer;
  refused?: SmsFailureCode;
  throws?: boolean;
  delayMs?: number;
  during?: (messages: SmsOutbound[]) => Promise<void>;
} = {}): Wire {
  const w: Wire = { calls: 0, sent: [], opts: [], send: async () => ({ results: [], balanceTzs: null }) };
  w.send = async (messages, opts) => {
    w.calls++;
    w.opts.push(opts);
    if (o.delayMs !== undefined) await new Promise((r) => setTimeout(r, o.delayMs));
    if (o.refused !== undefined) return { results: [], balanceTzs: null, refused: o.refused };
    w.sent.push(...messages);
    if (o.throws) throw new Error("socket hang up (stub)");
    if (o.during) await o.during(messages);
    const results: SmsResult[] = [];
    for (const m of messages) {
      const a = o.answer ? o.answer(m) : "ok";
      if (a === "missing") continue;
      const reference = `ref_${m.targetId ?? "none"}`;
      const base = { to: m.to, targetType: m.targetType ?? null, targetId: m.targetId ?? null };
      if (a === "ok") results.push({ ...base, reference, ok: true });
      else if (a === "transport") results.push({ ...base, reference, ok: false, code: "TRANSPORT", error: "transport failure" });
      else if (a === "rejected") results.push({ ...base, reference, ok: false, code: "REJECTED", error: "Invalid credentials" });
      else results.push({ ...base, reference: "", ok: false, code: "BAD_MSISDN", error: "not a number this gateway can dial" });
    }
    return { results: results.reverse(), balanceTzs: 100 };
  };
  return w;
}

/* ══ THE ENGINE'S DEPENDENCIES, FIXED ════════════════════════════════════════════════════════════════════════════════ */

/** A process state of the slice's own — so a run never shares a flight or a size with another (and §C can bypass E10). */
export const freshState = (): EngineProcessState => ({ flight: null, ticket: 0, sliceSize: ENGINE.SLICE_START, gateMsAvg: null, unanswered: {} });

/** ⭐ The engine's dependencies for a fixture world: production's own doors, rules and loop, with every shop-wide read
 *  FIXED (the window open, money idle, no OTP failure, the console provider, the rail alive) and the wire a stub. */
export function engineDeps(state: EngineProcessState, wire: Wire, over: Partial<EngineDeps> = {}): EngineDeps {
  return {
    ...ENGINE.ENGINE_DEPS,
    window: ALWAYS_OPEN,
    moneyBusy: () => ({ busy: false, stale: [] }),
    otpLastFailureAt: () => null,
    provider: () => "console",
    liveSwitch: async () => ({ state: "closed", why: "absent" }),
    rail: () => null,
    send: wire.send,
    state: () => state,
    ...over,
  };
}

/** A gate that clears every number it is asked (consent, a ledger reference) — for a claim that is not about the gate. */
export const CLEARS_ALL: NonNullable<EngineDeps["gate"]> = async () => ({ ok: true, basis: "CONSENT", basisRef: "ledger:fixture" });

/** Steps until the campaign is finished, paused, waiting or no longer running — or `max` steps. */
export async function drive(
  step: typeof ENGINE.runCampaignSlice,
  campaignId: string,
  deps: EngineDeps,
  max = 30,
): Promise<SliceStepResult[]> {
  const out: SliceStepResult[] = [];
  for (let i = 0; i < max; i++) {
    const r = await step(campaignId, deps);
    out.push(r);
    if (r.kind !== "sent") break;
  }
  return out;
}
export const said = (r: SliceStepResult | undefined): string => {
  if (r === undefined) return "nothing";
  if (r.kind === "sent") return `sent ${r.handedOver}/${r.claimed} (skipped ${r.skipped}, failed ${r.failed}, unconfirmed ${r.unconfirmed}, held ${r.held})`;
  if (r.kind === "paused") return `paused ${r.reason}`;
  if (r.kind === "waiting") return `waiting ${r.reason}${r.until ? ` until ${r.until}` : ""}`;
  if (r.kind === "finished") return "finished DONE";
  return `not_running ${r.status}`;
};
export const saidAll = (rs: readonly SliceStepResult[]): string => rs.map(said).join(" → ");
