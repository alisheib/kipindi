/**
 * test:campaign-audience — U38a's guard: the campaign audience is ONE filter, ONE walk, and a split counted by THE GATE.
 *
 * ⭐ WHAT IT HOLDS (`audience.ts`'s population axis and walk, `audience-split.ts`, `consent.ts`'s defaulted reads):
 *   §1 THE ONE RESOLVER, EXTENDED — the population axis travels through U24's ONE JSON parser, key and describer; a
 *      book-only axis beside a population is REFUSED by name (never dropped, never "nobody"); the contact book's doors
 *      refuse a population by name (the parser's default scope — U23's bulk bar says bad_audience) and its readers
 *      throw on one; an address cannot carry one.
 *   §2 X25 / D19 — the campaign door's role rule (a ticked selection refused to every role; ANY search refused to a
 *      masked viewer, before a single read) and a masked sample with no per-row detail.
 *   §3 THE ONE WALK — its order and its cursor, resumed from every cursor; a number the book holds walked once, by its
 *      book row; erased tombstones, staff and non-+255 numbers never; the operator and the window on the player arm;
 *      the campaign-audience count IS the walk.
 *   §4 THE SPLIT — the memory twin's §25 reads equal its single reads per element (4.0); each number's slot is the
 *      gate's own answer on a fixture holding every skip reason (4.1, the Accept); the figures are counted, not derived
 *      (4.2); the projection equals a dry dispatchSlice over the same walk (4.3, the Accept); the count writes nothing
 *      (4.4); protected standing is one line (4.5); the gate's three reads never per row (4.6); the budget leaves the rest unchecked (4.7);
 *      the sample is the walk's first five reachable rows (4.8); the send loop still asks with one argument (4.9);
 *      one split per filter key and at most two at once (4.10); the gate's reads parameter (4.11).
 *   §5 THE WIRING — the keys, and the suite on predeploy exactly once.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a planted dependency handed to the split or
 * the walk, a planted parser, an alternative engine, a source string replaced exactly once — and requires the MATCHING
 * assertion to fail. This file makes no file-modifying call of any kind (`test:red-anchors` 4.3 counts it in-process
 * only while that holds). Its store writes are the fixture's, through the store's own methods, made once at load; the
 * one assertion that drives the send loop (4.3) writes only the audit rows that loop writes, after the split it checks.
 * ⚠️ The Suspense key and the client derivation (the plan's RED for the card) are U38b's — there is no card yet. The
 * engine's half of "derive a count" is R1 here: a figure derived by subtraction.
 *
 * Run:  npm run test:campaign-audience
 * Red:  npm run red:campaign-audience
 */
process.exitCode = 1;

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type {
  StoredUser, StoredMarketingContact, StoredResponsibleGambling, SuppressionReason, MessagingKey,
} from "../src/lib/server/store.ts";
import {
  WHOLE_BOOK, parseContactAudienceJson, parseContactAudienceParams, contactAudienceKey, describeAudience, auditContactAudience,
  urlExpressible, contactAudienceParams, contactAudience, contactAudienceWrites, roleRefusal, ROLE_REFUSAL_REASON,
  campaignAudienceRefusal, CAMPAIGN_SEARCH_REFUSAL_REASON, POPULATION_BOOK_ONLY_REASON, CONTACT_AUDIENCE_URL_KEYS,
  audienceArms, walkCampaignAudience, CAMPAIGN_WALK_DEPS, campaignAudienceCount, CAMPAIGN_AUDIENCE_SELECTION,
  POPULATION_BOOK_DOOR_REASON,
} from "../src/lib/server/marketing/audience.ts";
import type {
  ContactAudienceFilter, AudienceParse, CampaignAudienceRow, CampaignAudiencePage, CampaignWalkDeps,
} from "../src/lib/server/marketing/audience.ts";
import {
  audienceSplit, computeAudienceSplit, AUDIENCE_SPLIT_DEPS, AUDIENCE_SAMPLE_SIZE, AUDIENCE_SPLITS_PER_PROCESS, AUDIENCE_BUCKETS,
  AUDIENCE_BUCKET_OF, audienceSlotOf, assertAudienceSplitAdds, audienceSplitSlots,
} from "../src/lib/server/marketing/audience-split.ts";
import type {
  AudienceSplit, AudienceSplitDeps, AudienceSplitOptions, AudienceSplitResult, AudienceSlot, AudienceSampleRow, AudienceBucket,
} from "../src/lib/server/marketing/audience-split.ts";
import { mayReceiveMarketingSms, DB_GATE_READS, userPhoneKeyFor } from "../src/lib/server/marketing/consent.ts";
import type { MarketingSkipReason } from "../src/lib/server/marketing/consent.ts";
import { dispatchSlice } from "../src/lib/server/marketing/dispatch.ts";
import type { SliceOutcome } from "../src/lib/server/marketing/dispatch.ts";
import { auditTicketsIssued, auditFlush } from "../src/lib/server/audit.ts";
import { SMS_CONSENT_WORDINGS } from "../src/lib/marketing/consent-wording.ts";
import { SMS_CAMPAIGN_VALUE, assertAudienceFilter } from "../src/lib/server/marketing/campaign-model.ts";
import { parseBulkRequest } from "../src/lib/server/marketing/contact-bulk.ts";
import { ERASURE_EVIDENCE } from "../src/lib/server/marketing/erase.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";
import { maskPhone, toMsisdn255 } from "../src/lib/phone-normalize.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);
const CRLF = String.fromCharCode(13) + NL;

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** A call that must not crash the run: a planted defect that throws becomes a null its assertion fails on. */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch (err) { console.log(`   (threw: ${String((err as Error)?.message ?? err).slice(0, 140)})`); return null; }
}
const throws = (fn: () => unknown): boolean => { try { fn(); return false; } catch { return true; } };
async function throwsAsync(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}
const json = (v: unknown) => JSON.stringify(v);

/* ═══ THE FIXTURE — one world, written once through the store's own methods ═══════════════════════════════════════ */

const T0 = Date.now();
const NOW = new Date(T0);
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
/** A date of birth `n` whole years (and a fortnight) ago, as registration stores it. */
const bornYearsAgo = (n: number): string => {
  const d = new Date(T0 - 14 * DAY);
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().slice(0, 10);
};
/** ⭐ A sentence the gate COUNTS (OQ11): the SW profile sentence, pinned. */
const PINNED_SW = SMS_CONSENT_WORDINGS.find((w) => w.site === "PROFILE" && w.locale === "SW")?.wording ?? "";
/** ⛔ The pre-2026-09-26 sign-up sentence — it never named SMS, so it no longer counts. */
const OLD_SIGNUP_SW = "Nipe matangazo (hiari).";

const storeBefore = { accounts: await db.user.count(), book: await db.marketingContact.count() };

function makeUser(id: string, phoneE164: string, over: Partial<StoredUser>): StoredUser {
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: iso(T0),
    marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(T0), updatedAt: iso(T0), lastLoginAt: iso(T0), closedAt: null,
    ...over,
  } as StoredUser;
}
const rgRow = (userId: string, selfExclusionUntil: string | null, patch: Partial<StoredResponsibleGambling> = {}): StoredResponsibleGambling => ({
  userId,
  dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null,
  dailyLossLimit: null, sessionTimeLimitMin: null, realityCheckIntervalMin: 60,
  selfExclusionUntil, coolingOffUntil: null,
  selfExclusionStartedAt: selfExclusionUntil, coolingOffStartedAt: null,
  pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
  pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
  pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
  ...patch,
} as StoredResponsibleGambling);
const k = (phone: string) => toMsisdn255(phone);
const mkey = (identifier: string): MessagingKey => ({ channel: "SMS", identifier, category: "MARKETING" });
/** Player n joined on 1 Aug + (n − 1) days, 08:00 UTC — so a window can be drawn between accounts. */
const joined = (n: number) => iso(Date.parse("2026-08-01T08:00:00.000Z") + (n - 1) * DAY);
async function player(id: string, phone: string, n: number, over: Partial<StoredUser> = {}): Promise<void> {
  await db.user.create(makeUser(id, phone, { createdAt: joined(n), updatedAt: joined(n), ...over }));
}
async function said(identifier: string, status: "GIVEN" | "WITHDRAWN", createdAt: string, id: string, wording = PINNED_SW): Promise<void> {
  await db.messagingConsent.create({
    id, channel: "SMS", identifier, category: "MARKETING", status, source: "PROFILE", wording, locale: "SW",
    evidence: "fixture", recordedBy: null, createdAt,
  });
}
async function stop(identifier: string, reason: SuppressionReason, id: string): Promise<void> {
  await db.suppression.create({
    id, channel: "SMS", identifier, category: "MARKETING", reason, evidence: "fixture", recordedBy: null,
    createdAt: "2026-07-01T00:00:00.000Z", liftedAt: null, liftedReason: null,
  });
}
const BASE_YES = "2024-06-01T00:00:00.000Z";
/** A consenting player: the toggle AND an SMS-naming GIVEN row, long ago (D3). */
async function consenting(id: string, phone: string, n: number, over: Partial<StoredUser> = {}): Promise<void> {
  await player(id, phone, n, over);
  await said(k(phone), "GIVEN", BASE_YES, `lc_${id}_1`);
}
function contact(id: string, msisdn: string, ndc: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  return {
    id, msisdn, rawInput: msisdn, displayName: null, email: null, ndc, operator: null, source: "IMPORT", sourceRef: null,
    userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
    createdAt: "2026-08-20T08:00:00.000Z", createdBy: null, updatedAt: "2026-08-20T08:00:00.000Z", updatedBy: null, ...o,
  };
}

// ── THE PLAYERS (ids sort in walk order) — one per reason the gate can give, and the four it must never walk ──
await consenting("pa01", "+255751000001", 1, { avatarDataUrl: "data:image/png;base64,AAAA" });   // will receive
await consenting("pa02", "+255751000002", 2);                                                    // a stop in force
await stop(k("+255751000002"), "WITHDRAWN", "sp_pa02");
await consenting("pa03", "+255751000003", 3);                                                    // a LIFTED stop
await stop(k("+255751000003"), "WITHDRAWN", "sp_pa03");
await db.suppression.lift(mkey(k("+255751000003")), "fixture: started again", "2026-07-02T00:00:00.000Z");
await player("pa04", "+255751000004", 4, { marketingOptIn: false });                             // the toggle off
await player("pa05", "+255751000005", 5);                                                        // a yes under the old wording
await said(k("+255751000005"), "GIVEN", "2026-09-20T00:00:00.000Z", "lc_pa05_1", OLD_SIGNUP_SW);
await consenting("pa06", "+255751000006", 6);                                                    // a yes, then a no
await said(k("+255751000006"), "WITHDRAWN", "2026-02-01T00:00:00.000Z", "lc_pa06_2");
await consenting("pa07", "+255751000007", 7);                                                    // a yes and a no in ONE millisecond
await said(k("+255751000007"), "GIVEN", "2026-03-01T00:00:00.000Z", "lc_pa07_t1");
await said(k("+255751000007"), "WITHDRAWN", "2026-03-01T00:00:00.000Z", "lc_pa07_t2");
await consenting("pa08", "+255681000008", 8);                                                    // serving a self-exclusion
await db.responsible.upsert(rgRow("pa08", iso(T0 + 30 * DAY)));
await consenting("pa09", "+255681000009", 9, { status: "COOLED_OFF" });                          // on a break
await db.responsible.upsert(rgRow("pa09", null, { coolingOffUntil: iso(T0 + 2 * DAY) }));
await consenting("pa10", "+255681000010", 10);                                                   // a harm marker: three deposits inside an hour
await db.wallet.create({ id: "wal_pa10", userId: "pa10", balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(T0), updatedAt: iso(T0) } as never);
for (let i = 0; i < 3; i++) {
  await db.txn.create({
    id: `tx_pa10_${i}`, walletId: "wal_pa10", userId: "pa10", type: "DEPOSIT", status: "CONFIRMED", amount: 10_000, fee: 0,
    taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null,
    createdAt: iso(T0 - (i + 1) * 60_000), updatedAt: iso(T0),
  } as never);
}
await consenting("pa11", "+255681000011", 11, { dob: bornYearsAgo(16) });                        // a minor
await consenting("pa12", "+255711000012", 12, { status: "COOLED_OFF", dob: bornYearsAgo(20) });  // under 25, a break on record
await db.responsible.upsert(rgRow("pa12", null, { coolingOffUntil: iso(T0 - 30 * DAY) }));
await said(k("+255711000012"), "GIVEN", iso(T0 - 10 * DAY), "lc_pa12_2");
await consenting("pa13", "+255711000013", 13, { status: "SUSPENDED" });                          // the account's status
await consenting("pa14", "+255711000014", 14, { dob: null });                                    // no date of birth
await consenting("pa15", "+255641000015", 15);                                                   // NDC 064 — no live network
await consenting("pa16", "+255761000016", 16);                                                   // will receive; the book holds the number (cb06)
await consenting("pa17", "+255761000017", 17);                                                   // will receive; an ERASED tombstone holds it (cb07)
await consenting("ps01", "+255751000090", 18, { role: "GROWTH" });                               // ⛔ staff — never walked
await db.user.create(makeUser("pe01", "erased:pe01", { createdAt: joined(19) }));                 // ⛔ an erased account — never walked
await consenting("pf01", "+254712000001", 20);                                                   // ⛔ a foreign number — never walked

// ── THE BOOK ──
await db.marketingContact.create(contact("cb01", "255791000101", "79", { displayName: "Asha Kitabu", consentState: "GIVEN" }));
await said("255791000101", "GIVEN", "2026-09-01T00:00:00.000Z", "lc_cb01_1");                    // a contact's yes: no 18+ attestation yet
await db.marketingContact.create(contact("cb02", "255641000102", "64"));                         // a 064 contact
await db.marketingContact.create(contact("cb03", "255791000103", "79", { displayName: "Baraka Kitabu" })); // no word on record
await db.marketingContact.create(contact("cb04", "255681000104", "68", { consentState: "WITHDRAWN" }));
await said("255681000104", "GIVEN", "2026-01-01T00:00:00.000Z", "lc_cb04_1");
await said("255681000104", "WITHDRAWN", "2026-02-01T00:00:00.000Z", "lc_cb04_2");
await db.marketingContact.create(contact("cb05", "255681000105", "68", { suppressedAt: "2026-07-01T00:00:00.000Z" }));
await stop("255681000105", "OPERATOR", "sp_cb05");
// pa16's number, with a link that points at the WRONG account (pa04, the toggle off) — the gate finds the holder by NUMBER.
await db.marketingContact.create(contact("cb06", "255761000016", "76", { displayName: "Neema Kitabu", userId: "pa04", source: "REGISTRATION" }));
// ⛔ an ERASED tombstone on pa17's number — in no audience (C3), and it hides nobody.
await db.marketingContact.create(contact("cb07", "255761000017", "76", { sourceRef: ERASURE_EVIDENCE, consentState: "WITHDRAWN" }));

/* ═══ THE ORACLES — written by hand ═══════════════════════════════════════════════════════════════════════════════ */

const F = (patch: Partial<ContactAudienceFilter>): ContactAudienceFilter => ({ ...WHOLE_BOOK, ...patch });
const BOOK = WHOLE_BOOK;
const BOTH = F({ population: "both" });
const PLAYERS = F({ population: "players" });
const BOTH_VODACOM = F({ population: "both", operators: ["VODACOM"] });
const PLAYERS_AIRTEL = F({ population: "players", operators: ["AIRTEL"] });
/** 1 Aug 00:00 EAT → 6 Aug 00:00 EAT: pa01–pa05 joined inside it, pa06 on the morning it ends. */
const PLAYERS_WINDOW = F({ population: "players", addedFrom: "2026-07-31T21:00:00.000Z", addedBefore: "2026-08-05T21:00:00.000Z" });

const SEQ_BOOK = ["cb01", "cb02", "cb03", "cb04", "cb05", "cb06"];
const SEQ_PLAYERS = Array.from({ length: 17 }, (_, i) => `pa${String(i + 1).padStart(2, "0")}`);
const SEQ_BOTH = [...SEQ_BOOK, ...SEQ_PLAYERS.filter((p) => p !== "pa16")];
const SEQ_BOTH_VODACOM = ["cb01", "cb03", "cb06", "pa01", "pa02", "pa03", "pa04", "pa05", "pa06", "pa07", "pa17"];
const SEQ_PLAYERS_AIRTEL = ["pa08", "pa09", "pa10", "pa11"];
const SEQ_PLAYERS_WINDOW = ["pa01", "pa02", "pa03", "pa04", "pa05"];
const NEVER = ["cb07", "ps01", "pe01", "pf01"];

type Figures = Pick<AudienceSplit, "matching" | "unsendable" | "reachable" | "willReceive" | "notReceiving" | "unanswered" | "notReceivingTotal" | "unchecked">;
const EXPECT_BOTH: Figures = {
  matching: 22, unsendable: 2, reachable: 20, willReceive: 4,
  notReceiving: { suppressed: 2, no_consent: 3, withdrawn: 3, age_unknown: 2, protected: 6 }, unanswered: 0, notReceivingTotal: 16, unchecked: 0,
};
const EXPECT_PLAYERS: Figures = {
  matching: 17, unsendable: 1, reachable: 16, willReceive: 4,
  notReceiving: { suppressed: 1, no_consent: 2, withdrawn: 2, age_unknown: 1, protected: 6 }, unanswered: 0, notReceivingTotal: 12, unchecked: 0,
};
const EXPECT_BOOK: Figures = {
  matching: 6, unsendable: 1, reachable: 5, willReceive: 1,
  notReceiving: { suppressed: 1, no_consent: 1, withdrawn: 1, age_unknown: 1, protected: 0 }, unanswered: 0, notReceivingTotal: 4, unchecked: 0,
};
const figuresOf = (s: AudienceSplit): Figures => ({
  matching: s.matching, unsendable: s.unsendable, reachable: s.reachable, willReceive: s.willReceive,
  notReceiving: Object.fromEntries(AUDIENCE_BUCKETS.map((b) => [b, s.notReceiving[b]])) as Record<AudienceBucket, number>,
  unanswered: s.unanswered, notReceivingTotal: s.notReceivingTotal, unchecked: s.unchecked,
});
const ALL_REASONS: MarketingSkipReason[] = [
  "bad_msisdn", "suppressed", "no_consent", "consent_withdrawn", "rg_self_excluded", "rg_cooling_off", "rg_harm_marker",
  "rg_under25_history", "age_minor", "age_unknown", "account_status",
];

const rowId = (r: CampaignAudienceRow): string => (r.kind === "contact" ? r.contactId : r.userId);
type Walked = { ids: string[]; rows: CampaignAudienceRow[]; cursors: string[]; pages: CampaignAudienceRow[][] };
async function walkAll(walk: Impl["walk"], f: ContactAudienceFilter, limit: number): Promise<Walked> {
  const out: Walked = { ids: [], rows: [], cursors: [], pages: [] };
  let cursor: string | null = null;
  for (let i = 0; i < 400; i++) {
    const page: CampaignAudiencePage = await walk(f, cursor, limit);
    out.rows.push(...page.rows);
    out.ids.push(...page.rows.map(rowId));
    out.cursors.push(page.next);
    out.pages.push(page.rows);
    if (page.next === "done") return out;
    cursor = page.next;
  }
  out.ids.push("NEVER-ENDED");
  return out;
}
/** The gate's OWN answer for one number — the REAL gate with its default single reads, through the REAL slot mapping. */
const gateSlot = async (msisdn: string): Promise<AudienceSlot> =>
  audienceSlotOf({ kind: "verdict", verdict: await mayReceiveMarketingSms(msisdn, NOW) });

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════════════════════ */

type Sources = { consent: string; dispatch: string; split: string; pkg: string; srcFiles: Map<string, string> };
type Impl = {
  /** A CAMPAIGN door's parse (`scope` "campaign") — the population axis admitted. */
  parseJson: (raw: unknown) => AudienceParse;
  /** A contact-book door's parse (the default scope) — a population refused by name. */
  parseBook: (raw: unknown) => AudienceParse;
  /** The contact book's reader — the belt that refuses a population. */
  book: (f: ContactAudienceFilter) => unknown;
  refusal: typeof campaignAudienceRefusal;
  walk: (f: ContactAudienceFilter, cursor: string | null, limit: number) => Promise<CampaignAudiencePage>;
  count: (f: ContactAudienceFilter) => Promise<number>;
  split: (f: ContactAudienceFilter, o: AudienceSplitOptions, d?: AudienceSplitDeps) => Promise<AudienceSplitResult>;
  deps: AudienceSplitDeps;
  sources: Sources;
};

const readRepo = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).split(CRLF).join(NL);
function walkSrc(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkSrc(join(dir, e.name)) : /[.](ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
}
const SRC_DIR = join(ROOT, "src");
const SRC_FILES = new Map<string, string>();
for (const f of walkSrc(SRC_DIR)) SRC_FILES.set(f.slice(SRC_DIR.length + 1).split(String.fromCharCode(92)).join("/"), decomment(readFileSync(f, "utf8")).split(CRLF).join(NL));
const REAL_SOURCES: Sources = {
  consent: readRepo("src/lib/server/marketing/consent.ts"),
  dispatch: readRepo("src/lib/server/marketing/dispatch.ts"),
  split: readRepo("src/lib/server/marketing/audience-split.ts"),
  pkg: readFileSync(join(ROOT, "package.json"), "utf8"),
  srcFiles: SRC_FILES,
};

const REAL: Impl = {
  parseJson: (raw) => parseContactAudienceJson(raw, "campaign"),
  parseBook: (raw) => parseContactAudienceJson(raw),
  book: (f) => contactAudience(f),
  refusal: campaignAudienceRefusal,
  walk: (f, c, l) => walkCampaignAudience(f, c, l),
  count: (f) => campaignAudienceCount(f),
  split: (f, o, d) => audienceSplit(f, o, d),
  deps: AUDIENCE_SPLIT_DEPS,
  sources: REAL_SOURCES,
};

/** A spy on one store member, restored by the caller. The memory twin's members are plain arrow functions. */
function spy(target: unknown, name: string): { calls: number; restore: () => void } {
  const t = target as Record<string, (...a: unknown[]) => unknown>;
  const real = t[name];
  const s = { calls: 0, restore: () => { t[name] = real; } };
  t[name] = (...a: unknown[]) => { s.calls++; return real(...a); };
  return s;
}
type BulkCount = { stops: number; users: number; consents: number; walks: number };
const counted = (base: AudienceSplitDeps, n: BulkCount): AudienceSplitDeps => ({
  ...base,
  walk: async (f, c, l, d) => { n.walks++; return base.walk(f, c, l, d); },
  suppressions: async (b) => { n.stops++; return base.suppressions(b); },
  users: async (p) => { n.users++; return base.users(p); },
  consents: async (b) => { n.consents++; return base.consents(b); },
});
const zero = (): BulkCount => ({ stops: 0, users: 0, consents: 0, walks: 0 });
const splitOf = (r: AudienceSplitResult | null): AudienceSplit | null => (r !== null && r.ok ? r.split : null);
/** The memory store, serialised — EVERY field, and a Map or Set at ANY depth by its entries (the import runs' rows are a
 *  Map of Maps, which a bare JSON.stringify writes as {}) — so a write anywhere moves it. */
function storeSnapshot(): string {
  const s = (globalThis as unknown as { __50PICK_STORE?: Record<string, unknown> }).__50PICK_STORE ?? {};
  const deep = (_x: string, y: unknown): unknown =>
    typeof y === "bigint" ? y.toString() : y instanceof Map ? ["Map", ...y.entries()] : y instanceof Set ? ["Set", ...y.values()] : y;
  return Object.keys(s).sort().map((key) => `${key}:${JSON.stringify(s[key], deep) ?? "undefined"}`).join("|");
}

/* ═══ THE LABELS — once; each assertion and its red case read them ═══════════════════════════════════════════════ */

const L = {
  c01: "0.1 · CONTROL · the store held no account and no book row before the fixture — every walked row is this suite's",
  c02: "0.2 · CONTROL · the fixture holds EVERY reason the gate can give, and a number it lets through — so the split's equality with the gate is a claim about all of them",
  l11: "1.1 · the population travels through U24's ONE JSON parser and key — players and both round-trip, `book` is held as null (one filter, one key), an unknown value or a non-string REFUSES naming population, and a filter stored before U38 keys exactly as it did",
  l12: "1.2 · ⛔ a book-only axis beside a population is REFUSED by name — q, consent, suppressed, lists, tags, sources, player, importId and ids, with players and with both — never dropped for the player arm (wider) nor read as nobody (narrower); the operator and the window are accepted, and a filter built in code throws in audienceArms",
  l13: "1.3 · describeAudience says the population first and gives the window its verb — Added (the book, unchanged), Joined (players), Added or joined (both)",
  l14: "1.4 · ⛔ the contact book's doors REFUSE a population — the JSON parser at its default (book) scope BY NAME, so U23's bulk bar answers bad_audience naming it, never a generic failure; the book's readers throw on one (a bulk or a count never reads players as the book); an address cannot carry one (urlExpressible false, no params, not in the address vocabulary); and the audit form names it",
  l21: "2.1 · 🔴 X25 / D19 · the campaign door's role rule — a ticked selection (ids) is refused for EVERY role (X13), a masked viewer is refused ANY search (a whole number or a name) by name, and still U24's player axes; a reader is refused nothing new; the operator, the window and the population pass — and the door answers BEFORE a single walk or bulk read",
  l22: "2.2 · 🔴 X25 · a masked viewer's sample carries NO per-row detail — no contact or account id, no subject field, no name, no slot — while a reader's carries all of it",
  l31: "3.1 · ⭐ THE ONE ORDER — the book by contact id, then the players by account id — identical at limit 1000, 3 and 1, resumed from every cursor with no row twice and none skipped; every cursor is b:<id> · p:<id> · done, never a phone number",
  l32: "3.2 · ⭐ a number the book holds is walked ONCE, by its book row (both) — and a player-only population still walks that player; an ERASED tombstone is never walked and hides nobody",
  l33: "3.3 · ⛔ staff, an erased account and a foreign number are never walked; the player arm takes the operator by prefix and the window on the account's createdAt; the book alone is the book",
  l34: "3.4 · ⛔ a cursor the walk did not write REFUSES — never read as a restart or as done — and so does a cursor naming an arm the filter does not have",
  l35: "3.5 · ⭐ X9 · the campaign-audience count IS the walk — 22 for both, 17 for the players, 6 for the book",
  l40: "4.0 · §25 · the memory twin's bulk reads equal its single reads PER ELEMENT — findActiveAmong = find (the lifted stop absent in both), latestAmong = latestFor (the same-millisecond tie included), findByPhones = findByPhone with the avatar omitted, msisdnsPresent = findByMsisdn (the tombstone present unless its mark is excluded); an empty set is [] and 2,001 keys REFUSE",
  l41: "4.1 · ⭐ THE SPLIT EQUALS THE GATE — every walked number's slot is the gate's own answer (default single reads), and the figures are the hand-counted ones for both, the players and the book",
  l42: "4.2 · the figures are COUNTED from the answers, never derived — they add up (assertAudienceSplitAdds), and not receiving is the buckets + unanswered, which matching − will receive is not when unsendable numbers are in the audience",
  l43: "4.3 · ⭐ THE PROJECTION EQUALS THE LOOP — a dry dispatchSlice over the same walk hands over exactly will receive, skips exactly the buckets and the unsendable, and holds exactly the unanswered",
  l44: "4.4 · ⛔ THE COUNT WRITES NOTHING — the store and the audit chain are unchanged across a split over RG-refused players",
  l45: "4.5 · ⛔ protected standing is ONE line — the buckets are exactly the five, and no rg_*, age_minor or account_status appears anywhere in the split",
  l46: "4.6 · ⭐ the gate's three single reads are never asked per row — suppression, account and latest word come from §25's bulk reads, each asked once per walk page that holds a sendable number (RG's own break check still reads the ledger directly; the RG, identity and harm-marker reads stay the gate's own, per player)",
  l47: "4.7 · ⛔ THE BUDGET — past it the gate is asked with no reads: an unsendable number is still unsendable, every other is unchecked (never will receive), the figures still add up, and no bulk read is made for a page that starts past it",
  l48: "4.8 · ⭐ the sample is the walk's FIRST FIVE REACHABLE rows, in the walk's own order, each with its gate slot, masked number and operator by prefix",
  l49: "4.9 · ⛔ the send loop is untouched — no src file calls the gate BY NAME with a third argument, dispatch still asks with ONE (its exact text pinned), the split's gate IS the send gate, and the split names no send path or audit",
  l410a: "4.10a · ⭐ ONE split per filter key — two askers at once, a reader and a masked viewer, share ONE walk (each §25 read made once) and each gets it shaped for their own role",
  l410b: "4.10b · ⛔ at most TWO splits run at once — a third waits for a slot, then runs; nothing is left running",
  l411: "4.11 · consent.ts's DEFAULTED reads — the gate's three single reads go through `reads` (the store's own by default, answering what the store answers), the profile switch keeps the default, the defaults are FROZEN (the send loop's reads, the split's and the walk's dependencies), and the rg-doors anchor line is byte-identical, once",
  l5: "5 · the wiring — test:campaign-audience and red:campaign-audience (in-process --prove-red) exist, and predeploy runs the suite exactly once",
};

/* ═══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;

  /* ── §0 · CONTROLS ── */
  ok(p(L.c01), storeBefore.accounts === 0 && storeBefore.book === 0, json(storeBefore));
  const reasonsSeen = new Set<string>();
  for (const r of [...(await walkAll(REAL.walk, BOTH, 1000)).rows, ...(await walkAll(REAL.walk, PLAYERS, 1000)).rows]) {
    const v = await mayReceiveMarketingSms(r.msisdn, NOW);
    reasonsSeen.add(v.ok ? "ok" : v.skipReason);
  }
  ok(p(L.c02), ALL_REASONS.every((x) => reasonsSeen.has(x)) && reasonsSeen.has("ok"), [...reasonsSeen].sort().join(","));

  /* ── §1 · THE ONE RESOLVER, EXTENDED ── */
  {
    const players = impl.parseJson({ population: "players" });
    const both = impl.parseJson({ population: "both", operators: ["VODACOM"], addedFrom: "2026-09-02T21:00:00.000Z", addedBefore: "2026-09-05T21:00:00.000Z" });
    const bothKey = both.ok ? contactAudienceKey(both.filter) : "";
    const back = bothKey ? impl.parseJson(JSON.parse(bothKey)) : null;
    const book = impl.parseJson({ population: "book" });
    const refused = [impl.parseJson({ population: "everyone" }), impl.parseJson({ population: "PLAYERS" }), impl.parseJson({ population: 7 })];
    ok(p(L.l11),
      players.ok && players.filter.population === "players" && contactAudienceKey(players.filter) === '{"population":"players"}'
        && both.ok && bothKey.endsWith(',"population":"both"}') && back !== null && back.ok && contactAudienceKey(back.filter) === bothKey
        && book.ok && book.filter.population === null && contactAudienceKey(book.filter) === "{}"
        && refused.every((r) => !r.ok && r.param === "population") && contactAudienceKey(WHOLE_BOOK) === "{}"
        && !throws(() => assertAudienceFilter(bothKey, "u38a")) && !throws(() => assertAudienceFilter('{"population":"players"}', "u38a")),
      `${players.ok ? contactAudienceKey(players.filter) : "refused"} · ${bothKey} · ${refused.map((r) => (r.ok ? "accepted" : r.param)).join(",")}`);

    const AXES: Array<[string, unknown]> = [
      ["q", "Asha"], ["consent", ["GIVEN"]], ["suppressed", false], ["lists", ["lst_1"]], ["tags", ["vip"]],
      ["sources", ["IMPORT"]], ["player", true], ["importId", "imp_1"], ["ids", ["cb01"]],
    ];
    const leaked: string[] = [];
    for (const population of ["players", "both"]) {
      for (const [axis, value] of AXES) {
        const r: AudienceParse = impl.parseJson({ population, [axis]: value });
        if (r.ok || r.param !== axis || r.reason !== POPULATION_BOOK_ONLY_REASON) leaked.push(`${population}+${axis}`);
      }
    }
    ok(p(L.l12),
      leaked.length === 0 && both.ok && impl.parseJson({ population: "players", operators: ["AIRTEL"] }).ok
        && throws(() => audienceArms(F({ population: "both", tags: ["vip"] }))) && !throws(() => audienceArms(BOTH_VODACOM)),
      leaked.length ? `accepted or misnamed: ${leaked.join(" | ")}` : "");

    const dBoth = describeAudience(F({ population: "both", operators: ["VODACOM"], addedFrom: "2026-09-02T21:00:00.000Z", addedBefore: "2026-09-05T21:00:00.000Z" }));
    const dBook = describeAudience(F({ addedFrom: "2026-09-02T21:00:00.000Z", addedBefore: "2026-09-05T21:00:00.000Z" }));
    ok(p(L.l13),
      json(describeAudience(PLAYERS)) === json(["Player accounts"])
        && json(dBoth) === json(["Contact book and player accounts", "Operator: Vodacom", "Added or joined 3 Sep 2026 → 5 Sep 2026"])
        && json(describeAudience(PLAYERS_WINDOW)) === json(["Player accounts", "Joined 1 Aug 2026 → 5 Aug 2026"])
        && json(dBook) === json(["Added 3 Sep 2026 → 5 Sep 2026"]) && json(describeAudience(WHOLE_BOOK)) === "[]",
      `${json(dBoth)} ${json(describeAudience(PLAYERS_WINDOW))}`);

    const addressed = parseContactAudienceParams({ population: "players", op: "VODACOM" }, T0);
    const bookDoor = [impl.parseBook({ population: "players" }), impl.parseBook({ population: "both", operators: ["VODACOM"] })];
    const bookDoorBook = impl.parseBook({ population: "book", tags: ["vip"] });
    const bulkDoor = parseBulkRequest({ action: "tag", audience: { population: "players" }, tag: "vip" });
    ok(p(L.l14),
      throws(() => impl.book(BOTH)) && throws(() => impl.book(PLAYERS)) && throws(() => contactAudienceWrites(PLAYERS)) && !throws(() => impl.book(BOOK))
        && !urlExpressible(BOTH) && contactAudienceParams(PLAYERS) === null
        && !(CONTACT_AUDIENCE_URL_KEYS as readonly string[]).includes("population") && addressed.ok && addressed.filter.population === null
        && auditContactAudience(PLAYERS).population === "players" && auditContactAudience(WHOLE_BOOK).population === undefined
        && bookDoor.every((r) => !r.ok && r.param === "population" && r.reason === POPULATION_BOOK_DOOR_REASON)
        && bookDoorBook.ok && bookDoorBook.filter.population === null && json(bookDoorBook.filter.tags) === json(["vip"])
        && !bulkDoor.ok && bulkDoor.reason === "bad_audience" && bulkDoor.error.includes(POPULATION_BOOK_DOOR_REASON),
      `book reader throws on a population: ${throws(() => impl.book(BOTH))} · book door ${bookDoor.map((r) => (r.ok ? "ACCEPTED" : r.param)).join(",")} · bulk ${json(bulkDoor)}`);
  }

  /* ── §2 · X25 / D19 ── */
  {
    const nameQ = impl.refusal(F({ q: "Asha" }), false);
    const numberQ = impl.refusal(F({ q: "255712345678" }), false);
    const consentQ = impl.refusal(F({ consent: ["GIVEN"] }), false);
    const n = zero();
    const door = await safe(() => impl.split(F({ q: "Asha" }), { viewerReads: false, now: NOW }, counted(impl.deps, n)));
    const readerDoor = await safe(() => impl.split(F({ q: "Asha" }), { viewerReads: true, now: NOW }, impl.deps));
    // ⛔ a ticked selection — one row would make a masked viewer's figures that row's own verdict — refused for every role
    const ticked = [impl.refusal(F({ ids: ["cb06"] }), false), impl.refusal(F({ ids: ["cb06"] }), true)];
    const nIds = zero();
    const tickedDoor = await safe(() => impl.split(F({ ids: ["cb06"] }), { viewerReads: false, now: NOW }, counted(impl.deps, nIds)));
    ok(p(L.l21),
      nameQ?.param === "q" && nameQ.reason === CAMPAIGN_SEARCH_REFUSAL_REASON && numberQ?.param === "q" && numberQ.reason === CAMPAIGN_SEARCH_REFUSAL_REASON
        && consentQ?.param === "consent" && consentQ.reason === ROLE_REFUSAL_REASON
        && impl.refusal(F({ q: "Asha" }), true) === null && impl.refusal(BOTH_VODACOM, false) === null && impl.refusal(PLAYERS_WINDOW, false) === null
        && door !== null && !door.ok && door.param === "q" && n.walks === 0 && n.stops + n.users + n.consents === 0
        && readerDoor !== null && readerDoor.ok
        && ticked.every((r) => r?.param === "ids" && r.reason === CAMPAIGN_AUDIENCE_SELECTION)
        && tickedDoor !== null && !tickedDoor.ok && tickedDoor.param === "ids" && nIds.walks === 0 && nIds.stops + nIds.users + nIds.consents === 0,
      `name ${json(nameQ)} · number ${numberQ?.param} · door ${json(door)} · reads ${json(n)} · ticked ${ticked.map((r) => r?.param ?? "ACCEPTED").join(",")}`);

    const masked = splitOf(await safe(() => impl.split(BOTH, { viewerReads: false, now: NOW }, impl.deps)));
    const reader = splitOf(await safe(() => impl.split(BOTH, { viewerReads: true, now: NOW }, impl.deps)));
    const maskedJson = json(masked?.sample ?? null);
    ok(p(L.l22),
      masked !== null && masked.sample.length === AUDIENCE_SAMPLE_SIZE && masked.sample.every((r) => r.detail === null && r.masked.includes("••••"))
        && !/contactPhone|"phone"|subject|slot|"name"|kind|(cb|pa)[0-9]{2}/.test(maskedJson)
        && reader !== null && reader.sample.length === AUDIENCE_SAMPLE_SIZE && reader.sample.every((r) => r.detail !== null),
      maskedJson.slice(0, 220));
  }

  /* ── §3 · THE ONE WALK ── */
  {
    const w1000 = await safe(() => walkAll(impl.walk, BOTH, 1000));
    const w3 = await safe(() => walkAll(impl.walk, BOTH, 3));
    const w1 = await safe(() => walkAll(impl.walk, BOTH, 1));
    const cursors = [...(w1000?.cursors ?? []), ...(w3?.cursors ?? []), ...(w1?.cursors ?? [])];
    const CURSOR = /^(?:[bp]:[A-Za-z0-9_-]{1,64}|done)$/;
    ok(p(L.l31),
      w1000 !== null && w3 !== null && w1 !== null
        && json(w1000.ids) === json(SEQ_BOTH) && json(w3.ids) === json(SEQ_BOTH) && json(w1.ids) === json(SEQ_BOTH)
        && new Set(w3.ids).size === w3.ids.length && cursors.length > 0
        && cursors.every((c) => CURSOR.test(c) && !/[0-9]{9}/.test(c) && SMS_CAMPAIGN_VALUE.enqueueCursor(c)),
      `limit 3: ${w3?.ids.join(",") ?? "threw"}`);

    const bothIds = w1000?.ids ?? [];
    const players = await safe(() => walkAll(impl.walk, PLAYERS, 1000));
    ok(p(L.l32),
      bothIds.filter((x) => x === "cb06").length === 1 && !bothIds.includes("pa16") && bothIds.includes("pa17") && !bothIds.includes("cb07")
        && players !== null && players.ids.includes("pa16") && players.ids.includes("pa17"),
      `both: ${bothIds.join(",")}`);

    const vodacom = await safe(() => walkAll(impl.walk, BOTH_VODACOM, 1000));
    const airtel = await safe(() => walkAll(impl.walk, PLAYERS_AIRTEL, 2));
    const win = await safe(() => walkAll(impl.walk, PLAYERS_WINDOW, 4));
    const book = await safe(() => walkAll(impl.walk, BOOK, 4));
    const everywhere = [...bothIds, ...(players?.ids ?? []), ...(vodacom?.ids ?? []), ...(book?.ids ?? [])];
    ok(p(L.l33),
      NEVER.every((x) => !everywhere.includes(x)) && players !== null && json(players.ids) === json(SEQ_PLAYERS)
        && json(vodacom?.ids ?? null) === json(SEQ_BOTH_VODACOM) && json(airtel?.ids ?? null) === json(SEQ_PLAYERS_AIRTEL)
        && json(win?.ids ?? null) === json(SEQ_PLAYERS_WINDOW) && json(book?.ids ?? null) === json(SEQ_BOOK),
      `players ${players?.ids.join(",") ?? "threw"} · vodacom ${vodacom?.ids.join(",") ?? "threw"} · window ${win?.ids.join(",") ?? "threw"}`);

    const done = await safe(() => impl.walk(BOTH, "done", 5));
    const bad = await Promise.all(["nope", "b:", "q:cb01", "b:cb 01", "p:pa01;drop", "p:255712345678"].map((c) => throwsAsync(() => impl.walk(BOTH, c, 5))));
    ok(p(L.l34),
      bad.every(Boolean) && (await throwsAsync(() => impl.walk(PLAYERS, "b:cb01", 5))) && (await throwsAsync(() => impl.walk(BOOK, "p:pa01", 5)))
        && done !== null && done.rows.length === 0 && done.next === "done",
      `refused ${bad.filter(Boolean).length} of ${bad.length}`);

    const counts = [await safe(() => impl.count(BOTH)), await safe(() => impl.count(PLAYERS)), await safe(() => impl.count(BOOK))];
    ok(p(L.l35), json(counts) === json([SEQ_BOTH.length, SEQ_PLAYERS.length, SEQ_BOOK.length]), json(counts));
  }

  /* ── §4 · THE SPLIT ── */
  {
    // 4.0 · the memory twin's §25 reads, per element
    const playerKeys = SEQ_PLAYERS.map((_, i) => i).map((i) => ["+255751000001", "+255751000002", "+255751000003", "+255751000004",
      "+255751000005", "+255751000006", "+255751000007", "+255681000008", "+255681000009", "+255681000010", "+255681000011",
      "+255711000012", "+255711000013", "+255711000014", "+255641000015", "+255761000016", "+255761000017"][i]).map(k);
    const bookKeys = ["255791000101", "255641000102", "255791000103", "255681000104", "255681000105", "255761000016", "255761000017"];
    const ids = [...new Set([...playerKeys, ...bookKeys, "255759999998", "255759999999"])];
    const batch = { channel: "SMS" as const, category: "MARKETING" as const, identifiers: ids };
    const stops = new Map((await db.suppression.findActiveAmong(batch)).map((s) => [s.identifier, s.id] as const));
    const latest = new Map((await db.messagingConsent.latestAmong(batch)).map((c) => [c.identifier, c.id] as const));
    const accounts = await db.user.findByPhones(ids.map(userPhoneKeyFor));
    const accountOf = new Map(accounts.map((u) => [u.phoneE164, u] as const));
    const present = new Set(await db.marketingContact.msisdnsPresent({ msisdns: ids, excludeSourceRef: null }));
    const presentLive = new Set(await db.marketingContact.msisdnsPresent({ msisdns: ids, excludeSourceRef: ERASURE_EVIDENCE }));
    const off: string[] = [];
    for (const id of ids) {
      if ((stops.get(id) ?? null) !== ((await db.suppression.find(mkey(id)))?.id ?? null)) off.push(`stop ${id}`);
      if ((latest.get(id) ?? null) !== ((await db.messagingConsent.latestFor(mkey(id)))?.id ?? null)) off.push(`latest ${id}`);
      const single = await db.user.findByPhone(userPhoneKeyFor(id));
      const bulk = accountOf.get(userPhoneKeyFor(id)) ?? null;
      if ((bulk?.id ?? null) !== (single?.id ?? null) || (bulk !== null && json({ ...single, avatarDataUrl: null }) !== json(bulk))) off.push(`account ${id}`);
      const row = await db.marketingContact.findByMsisdn(id);
      if (present.has(id) !== (row !== null)) off.push(`present ${id}`);
      if (presentLive.has(id) !== (row !== null && row.sourceRef !== ERASURE_EVIDENCE)) off.push(`present-live ${id}`);
    }
    const pa01Single = await db.user.findByPhone("+255751000001");
    const tooMany = Array.from({ length: 2001 }, (_, i) => `2557${String(10000000 + i)}`);
    ok(p(L.l40),
      off.length === 0 && stops.size === 2 && latest.get(k("+255751000007")) === "lc_pa07_t2" && present.has("255761000017") && !presentLive.has("255761000017")
        && accounts.length > 0 && accounts.every((u) => u.avatarDataUrl === null) && pa01Single?.avatarDataUrl === "data:image/png;base64,AAAA"
        && json(await db.suppression.findActiveAmong({ ...batch, identifiers: [] })) === "[]" && json(await db.user.findByPhones([])) === "[]"
        && json(await db.messagingConsent.latestAmong({ ...batch, identifiers: [] })) === "[]"
        && json(await db.marketingContact.msisdnsPresent({ msisdns: [], excludeSourceRef: null })) === "[]"
        && (await throwsAsync(async () => db.suppression.findActiveAmong({ ...batch, identifiers: tooMany })))
        && (await throwsAsync(async () => db.messagingConsent.latestAmong({ ...batch, identifiers: tooMany })))
        && (await throwsAsync(async () => db.user.findByPhones(tooMany.map(userPhoneKeyFor))))
        && (await throwsAsync(async () => db.marketingContact.msisdnsPresent({ msisdns: tooMany, excludeSourceRef: null }))),
      off.length ? off.join(" | ") : `stops ${stops.size} · tie → ${latest.get(k("+255751000007"))}`);

    // 4.1 · the split equals the gate
    const seen: Array<[CampaignAudienceRow, AudienceSlot]> = [];
    const both = splitOf(await safe(() => impl.split(BOTH, { viewerReads: true, now: NOW, observe: (row, slot) => seen.push([row, slot]) }, impl.deps)));
    const playersSplit = splitOf(await safe(() => impl.split(PLAYERS, { viewerReads: true, now: NOW }, impl.deps)));
    const bookSplit = splitOf(await safe(() => impl.split(BOOK, { viewerReads: true, now: NOW }, impl.deps)));
    const disagree: string[] = [];
    for (const [row, slot] of seen) {
      const own = await gateSlot(row.msisdn);
      if (own !== slot) disagree.push(`${rowId(row)} split=${slot} gate=${own}`);
    }
    ok(p(L.l41),
      both !== null && disagree.length === 0 && seen.length === both.matching && json([...seen.map(([r]) => rowId(r))].sort()) === json([...SEQ_BOTH].sort())
        && json(figuresOf(both)) === json(EXPECT_BOTH) && playersSplit !== null && json(figuresOf(playersSplit)) === json(EXPECT_PLAYERS)
        && bookSplit !== null && json(figuresOf(bookSplit)) === json(EXPECT_BOOK),
      disagree.length ? disagree.join(" | ") : `both ${both ? json(figuresOf(both)) : "threw"}`);

    // 4.2 · counted, not derived
    let adds = false;
    try { if (both) { assertAudienceSplitAdds(both); adds = true; } } catch { adds = false; }
    const bucketSum = both ? AUDIENCE_BUCKETS.reduce((n, b) => n + both.notReceiving[b], 0) : -1;
    ok(p(L.l42),
      both !== null && adds && both.notReceivingTotal === bucketSum + both.unanswered && both.notReceivingTotal === 16
        && both.notReceivingTotal !== both.matching - both.willReceive && both.reachable === both.matching - both.unsendable,
      both ? `not receiving ${both.notReceivingTotal} · matching − will receive ${both.matching - both.willReceive}` : "the split threw");

    // 4.3 · the projection equals the loop (AFTER the split — the loop writes the RG audit line when it acts)
    const walked = (await walkAll(REAL.walk, BOTH, 1000)).rows;
    const outcomes: SliceOutcome[] = await dispatchSlice(walked.map((r, i) => ({ ref: `r${i}`, msisdn: r.msisdn, body: "50pick: tangazo." })), {
      send: async (messages) => ({
        results: messages.map((m) => ({ reference: `ref_${m.targetId}`, to: m.to, ok: true, targetType: m.targetType, targetId: m.targetId })),
        balanceTzs: 100,
      }),
    });
    const loop = { handed: 0, unsendable: 0, held: 0, buckets: Object.fromEntries(AUDIENCE_BUCKETS.map((b) => [b, 0])) as Record<string, number> };
    for (const o of outcomes) {
      if (o.outcome === "handed_over") loop.handed++;
      else if (o.outcome === "held") loop.held++;
      else if (o.outcome === "skipped") {
        const b = AUDIENCE_BUCKET_OF[o.skipReason];
        if (b === "unsendable") loop.unsendable++; else loop.buckets[b] = (loop.buckets[b] ?? 0) + 1;
      }
    }
    ok(p(L.l43),
      both !== null && outcomes.length === walked.length && loop.handed === both.willReceive && loop.unsendable === both.unsendable
        && loop.held === both.unanswered && json(loop.buckets) === json(figuresOf(both).notReceiving),
      `loop ${json(loop)} · split ${both ? json(figuresOf(both)) : "threw"}`);

    // 4.4 · writes nothing
    await auditFlush();
    const storeAt = storeSnapshot();
    const ticketsAt = auditTicketsIssued();
    const quiet = splitOf(await safe(() => impl.split(BOTH, { viewerReads: true, now: NOW }, impl.deps)));
    await auditFlush();
    ok(p(L.l44), quiet !== null && storeSnapshot() === storeAt && auditTicketsIssued() === ticketsAt,
      `audit tickets ${ticketsAt} → ${auditTicketsIssued()} · store ${storeSnapshot() === storeAt ? "unchanged" : "CHANGED"}`);

    // 4.5 · protected is one line
    const flat = json(both ?? {});
    ok(p(L.l45),
      both !== null && json(Object.keys(both.notReceiving).sort()) === json([...AUDIENCE_BUCKETS].sort())
        && !/rg_|age_minor|account_status/.test(flat) && both.notReceiving.protected === 6,
      both ? Object.keys(both.notReceiving).join(",") : "the split threw");

    // 4.6 · no per-row read
    const singles = [spy(db.suppression, "find"), spy(db.user, "findByPhone"), spy(db.messagingConsent, "latestFor")];
    const n46 = zero();
    let s46: AudienceSplit | null = null;
    try {
      s46 = splitOf(await safe(() => impl.split(BOTH, { viewerReads: true, now: NOW, chunk: 4 }, counted(impl.deps, n46))));
    } finally {
      for (const s of singles) s.restore();
    }
    const pages4 = (await walkAll(REAL.walk, BOTH, 4)).pages.filter((page) => page.some((r) => parseTzNumber(r.msisdn).verdict === "ok")).length;
    ok(p(L.l46),
      s46 !== null && singles[0].calls === 0 && singles[1].calls === 0 && singles[2].calls <= 1
        && n46.stops === pages4 && n46.users === pages4 && n46.consents === pages4 && pages4 === 7,
      `single reads find=${singles[0].calls} findByPhone=${singles[1].calls} latestFor=${singles[2].calls} · bulk ${json(n46)} over ${pages4} pages`);

    // 4.7 · the budget — a clock that counts the gate's answers runs out after seven
    let gateCalls = 0;
    const n47 = zero();
    const budgeted: AudienceSplitDeps = { ...counted(impl.deps, n47), gate: async (m, at, reads) => { gateCalls++; return impl.deps.gate(m, at, reads); } };
    const s47 = splitOf(await safe(() => impl.split(BOTH, { viewerReads: true, now: NOW, chunk: 4, budgetMs: 7, clock: () => gateCalls }, budgeted)));
    let adds47 = false;
    try { if (s47) { assertAudienceSplitAdds(s47); adds47 = true; } } catch { adds47 = false; }
    ok(p(L.l47),
      s47 !== null && adds47 && s47.unchecked === 14 && s47.willReceive === 2 && s47.unsendable === 2 && s47.notReceivingTotal === 4
        && s47.matching === 22 && n47.stops === 3 && n47.users === 3 && n47.consents === 3,
      s47 ? `${json(figuresOf(s47))} · bulk ${json(n47)}` : "the split threw");

    // 4.8 · the sample
    const oracleSample = async (f: ContactAudienceFilter): Promise<AudienceSampleRow[]> => {
      const out: AudienceSampleRow[] = [];
      for (const r of (await walkAll(REAL.walk, f, 1000)).rows) {
        if (out.length >= AUDIENCE_SAMPLE_SIZE) break;
        const slot = await gateSlot(r.msisdn);
        if (slot === "unsendable") continue;
        out.push({
          masked: maskPhone(r.msisdn), operator: parseTzNumber(r.msisdn).operator?.brand ?? null,
          detail: r.kind === "contact" ? { subject: { field: "contactPhone", id: r.contactId }, name: r.name, slot } : { subject: { field: "phone", id: r.userId }, name: null, slot },
        });
      }
      return out;
    };
    const sampleIds = (s: AudienceSplit | null) => (s ?? { sample: [] as AudienceSampleRow[] }).sample.map((r) => r.detail?.subject.id ?? "?").join(",");
    const bothSample = await oracleSample(BOTH);
    const playersSample = await oracleSample(PLAYERS);
    ok(p(L.l48),
      both !== null && playersSplit !== null && bookSplit !== null
        && json(both.sample) === json(bothSample) && json(playersSplit.sample) === json(playersSample)
        && sampleIds(both) === "cb01,cb03,cb04,cb05,cb06" && sampleIds(playersSplit) === "pa01,pa02,pa03,pa04,pa05"
        && bookSplit.sample.length === bookSplit.reachable && both.sample.every((r) => r.masked.startsWith("+255") && r.operator !== null),
      `both ${sampleIds(both)} · players ${sampleIds(playersSplit)}`);

    // 4.9 · the send loop untouched
    const argCounts = (src: string): number[] => {
      const out: number[] = [];
      const NAME = "mayReceiveMarketingSms(";
      for (let at = src.indexOf(NAME); at >= 0; at = src.indexOf(NAME, at + 1)) {
        if (src.slice(Math.max(0, at - 9), at).endsWith("function ")) continue;
        let depth = 0, args = 1, empty = true, i = at + NAME.length;
        for (; i < src.length; i++) {
          const ch = src[i];
          if (ch === "(" || ch === "[" || ch === "{") depth++;
          else if (ch === ")" || ch === "]" || ch === "}") { if (depth === 0) break; depth--; }
          else if (ch === "," && depth === 0) args++;
          else if (ch.trim() !== "") empty = false;
        }
        out.push(empty ? 0 : args);
      }
      return out;
    };
    const thirdArg = [...impl.sources.srcFiles].filter(([, s]) => argCounts(s).some((x) => x >= 3)).map(([rel]) => rel);
    const disp = impl.sources.dispatch;
    const splitSrc = impl.sources.split;
    ok(p(L.l49),
      thirdArg.length === 0 && disp.includes("const ask = deps.gate ?? mayReceiveMarketingSms;") && disp.includes("verdict = await ask(row.msisdn);")
        && disp.includes("gate?: (msisdn: string) => Promise<MarketingGateVerdict>;") && AUDIENCE_SPLIT_DEPS.gate === mayReceiveMarketingSms
        && splitSrc.length > 2000 && !/sendBatch|dispatchSlice|[^A-Za-z.]audit[(]/.test(splitSrc)
        && !splitSrc.includes('from "@/lib/server/sms"') && !splitSrc.includes('from "@/lib/server/marketing/dispatch"')
        && argCounts("x(mayReceiveMarketingSms(n, now, reads)); export async function mayReceiveMarketingSms(a, b, c) {}").join() === "3",
      thirdArg.length ? `a third argument in [${thirdArg}]` : "");

    // 4.10a · one split per filter key
    const bulk = [spy(db.suppression, "findActiveAmong"), spy(db.user, "findByPhones"), spy(db.messagingConsent, "latestAmong")];
    let pair: Array<AudienceSplitResult | null> = [];
    try {
      pair = await Promise.all([safe(() => impl.split(BOTH, { viewerReads: true })), safe(() => impl.split(BOTH, { viewerReads: false }))]);
    } finally {
      for (const s of bulk) s.restore();
    }
    const [readerShared, maskedShared] = pair.map(splitOf);
    ok(p(L.l410a),
      readerShared !== null && maskedShared !== null && bulk.every((s) => s.calls === 2)
        && json(figuresOf(readerShared)) === json(figuresOf(maskedShared)) && json(figuresOf(readerShared)) === json(EXPECT_BOTH)
        && readerShared.sample.every((r) => r.detail !== null) && maskedShared.sample.every((r) => r.detail === null),
      `bulk calls ${bulk.map((s) => s.calls).join("/")} (one walk = 2 each)`);

    // 4.10b · at most two at once
    let release: () => void = () => {};
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    let entered = 0;
    const held: AudienceSplitDeps = {
      ...impl.deps,
      walk: async (f, c, l, d) => {
        if (c === null) { entered++; await barrier; }
        return impl.deps.walk(f, c, l, d);
      },
    };
    const runs = [BOTH, PLAYERS, BOOK].map((f) => safe(() => impl.split(f, { viewerReads: true }, held)));
    await new Promise((resolve) => setTimeout(resolve, 25));
    const whileHeld = entered;
    release();
    const finished = (await Promise.all(runs)).map(splitOf);
    const slots = audienceSplitSlots();
    ok(p(L.l410b),
      AUDIENCE_SPLITS_PER_PROCESS === 2 && whileHeld === 2 && entered === 3 && finished.every((s) => s !== null)
        && slots.running === 0 && slots.waiting === 0 && slots.flights === 0,
      `entered while held ${whileHeld} · in all ${entered} · slots ${json(slots)}`);

    // 4.11 · consent.ts's defaulted reads
    const cons = impl.sources.consent;
    const gateAt = cons.indexOf("export async function mayReceiveMarketingSms");
    const gateEnd = cons.indexOf(`${NL}export `, gateAt + 10);
    const gateBody = gateAt < 0 ? "" : cons.slice(gateAt, gateEnd < 0 ? undefined : gateEnd);
    const RG_LINE = "    const rg = await marketingRgStanding(user, identifier, now.getTime());";
    const defaults = [
      ((await DB_GATE_READS.suppression(mkey(k("+255751000002")))) ?? null)?.id === ((await db.suppression.find(mkey(k("+255751000002")))) ?? null)?.id,
      ((await DB_GATE_READS.userByPhone("+255751000001")) ?? null)?.id === "pa01",
      ((await DB_GATE_READS.latestConsent(mkey(k("+255751000006")))) ?? null)?.id === "lc_pa06_2",
    ];
    ok(p(L.l411),
      gateBody.includes("export async function mayReceiveMarketingSms(msisdn: string, now: Date = new Date(), reads: MarketingGateReads = DB_GATE_READS)")
        && gateBody.includes("const suppressed = await Promise.resolve(reads.suppression(key));")
        && gateBody.includes("const user = await Promise.resolve(reads.userByPhone(userPhoneKeyFor(identifier)));")
        && gateBody.includes("const noConsent = await playerConsentRefusal(user, key, reads);")
        && gateBody.includes("const latest = await Promise.resolve(reads.latestConsent(key));")
        && !gateBody.includes("db.suppression.find(") && !gateBody.includes("db.user.findByPhone(") && !gateBody.includes("db.messagingConsent.latestFor(")
        && cons.includes("reads: MarketingGateReads = DB_GATE_READS,") && cons.includes("if (await playerConsentRefusal(user, key)) return TOGGLE_OFF;")
        && cons.split(RG_LINE).length - 1 === 1 && defaults.every(Boolean)
        && Object.isFrozen(DB_GATE_READS) && Object.isFrozen(AUDIENCE_SPLIT_DEPS) && Object.isFrozen(CAMPAIGN_WALK_DEPS),
      `gate body ${gateBody.length} chars · rg line ×${cons.split(RG_LINE).length - 1} · defaults ${defaults.join(",")} · frozen ${[DB_GATE_READS, AUDIENCE_SPLIT_DEPS, CAMPAIGN_WALK_DEPS].map((o) => Object.isFrozen(o)).join(",")}`);
  }

  /* ── §5 · THE WIRING ── */
  {
    const scripts = (JSON.parse(impl.sources.pkg) as { scripts: Record<string, string> }).scripts;
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    ok(p(L.l5),
      scripts["test:campaign-audience"] === "tsx scripts/campaign-audience.test.mts"
        && scripts["red:campaign-audience"] === "tsx scripts/campaign-audience.test.mts --prove-red"
        && chain.filter((x) => x === "npm run test:campaign-audience").length === 1,
      `on predeploy ×${chain.filter((x) => x === "npm run test:campaign-audience").length}`);
  }
}

/* ═══ THE RUN ════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${NL}campaign-audience: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${NL}§0 baseline: ${pass} passed, ${fail} failed${NL}`);

  /** A walk whose player phase is planted — the shipped walk over planted store reads. */
  const walkWith = (d: Partial<CampaignWalkDeps>): Impl["walk"] => (f, c, l) => walkCampaignAudience(f, c, l, { ...CAMPAIGN_WALK_DEPS, ...d });
  const withWalk = (w: Impl["walk"]): Partial<Impl> => ({ walk: w, count: (f) => campaignAudienceCount(f, (g, c, l) => w(g, c, l)) });
  /** The memory ledger in WRITE order — what a read with no tiebreak falls back on. */
  const ledgerRows = () => [...((globalThis as unknown as { __50PICK_STORE?: { messagingConsents: Map<string, { identifier: string; channel: string; category: string; createdAt: string }> } }).__50PICK_STORE?.messagingConsents.values() ?? [])];

  /** R12's engine: the count run through the send loop with a no-op send — what the plan forbids. */
  const splitViaLoop: Impl["split"] = async (f, o) => {
    const refused = campaignAudienceRefusal(f, o.viewerReads);
    if (refused) return { ok: false, param: refused.param, reason: refused.reason };
    const rows = (await walkAll(REAL.walk, f, 1000)).rows;
    const outs = await dispatchSlice(rows.map((r, i) => ({ ref: `c${i}`, msisdn: r.msisdn, body: "count" })), { send: async () => ({ results: [], balanceTzs: null }) });
    const notReceiving = Object.fromEntries(AUDIENCE_BUCKETS.map((b) => [b, 0])) as Record<AudienceBucket, number>;
    let unsendable = 0, willReceive = 0, unanswered = 0;
    for (const x of outs) {
      if (x.outcome === "skipped") { const b = AUDIENCE_BUCKET_OF[x.skipReason]; if (b === "unsendable") unsendable++; else notReceiving[b]++; }
      else if (x.outcome === "held") unanswered++;
      else willReceive++;
    }
    const refusals = AUDIENCE_BUCKETS.reduce((n, b) => n + notReceiving[b], 0);
    return { ok: true, split: { filterKey: contactAudienceKey(f), matching: rows.length, unsendable, reachable: rows.length - unsendable, willReceive,
      notReceiving, unanswered, notReceivingTotal: refusals + unanswered, unchecked: 0, sample: [], computedAt: iso(T0), durationMs: 0 } };
  };

  const CASES: Array<{ name: string; expect: string[]; impl: Impl }> = [
    {
      name: "R1 · a figure DERIVED, not counted — not receiving as matching − will receive (the engine's half of 'derive a count'; the card's is U38b's)",
      expect: [L.l42],
      impl: { ...REAL, deps: { ...REAL.deps, figures: (t) => { const fig = AUDIENCE_SPLIT_DEPS.figures(t); return { ...fig, notReceivingTotal: fig.matching - fig.willReceive }; } } },
    },
    {
      name: "R2 · the split decides from the book's consent CACHE — a contact whose cache says GIVEN counted as will receive, the gate never asked",
      expect: [L.l41],
      impl: {
        ...REAL,
        deps: {
          ...REAL.deps,
          gate: async (m, at, reads) => {
            const row = await db.marketingContact.findByMsisdn(toMsisdn255(m));
            return row !== null && row.consentState === "GIVEN" ? { ok: true } : mayReceiveMarketingSms(m, at, reads);
          },
        },
      },
    },
    {
      name: "R3 · ⭐ a LIFTED stop prefetched as active — the bulk stop read stops asking about the lift",
      expect: [L.l41],
      impl: {
        ...REAL,
        deps: {
          ...REAL.deps,
          suppressions: async (b) => (await Promise.all(b.identifiers.map(async (id) => db.suppression.listFor(id)))).flat()
            .filter((s) => s.channel === b.channel && s.category === b.category),
        },
      },
    },
    {
      name: "R5 · ⭐ the ledger tiebreak dropped — each number's latest word read by createdAt alone, so a same-millisecond yes-then-no reads yes",
      expect: [L.l41],
      impl: {
        ...REAL,
        deps: {
          ...REAL.deps,
          consents: async (b) => {
            const want = new Set(b.identifiers);
            const ordered = ledgerRows().filter((r) => r.channel === b.channel && r.category === b.category && want.has(r.identifier))
              .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
            const first = new Map<string, unknown>();
            for (const r of ordered) if (!first.has(r.identifier)) first.set(r.identifier, r);
            return [...first.values()] as never;
          },
        },
      },
    },
    {
      name: "R6 · no prefetch — the split asks the gate with its default single reads, three a number",
      expect: [L.l46],
      impl: { ...REAL, deps: { ...REAL.deps, gate: async (m, at) => mayReceiveMarketingSms(m, at) } },
    },
    {
      name: "R7 · ⭐ `unchecked` counted as will receive — a number past the budget read as a yes",
      expect: [L.l47],
      impl: { ...REAL, deps: { ...REAL.deps, slotOf: (o) => (o.kind === "unchecked" ? "willReceive" : audienceSlotOf(o)) } },
    },
    {
      name: "R8 · ⭐ the sample out of walk order — the split reads the audience in an order U42 will not enqueue",
      expect: [L.l48],
      impl: { ...REAL, deps: { ...REAL.deps, walk: async (f, c, l, d) => { const page = await walkCampaignAudience(f, c, l, d); return { ...page, rows: [...page.rows].reverse() }; } } },
    },
    {
      name: "R11 · ⭐ protected reasons ITEMISED — the RG, age and account reasons each their own key",
      expect: [L.l45],
      impl: {
        ...REAL,
        deps: {
          ...REAL.deps,
          slotOf: (o) => (o.kind === "verdict" && !o.verdict.ok && AUDIENCE_BUCKET_OF[o.verdict.skipReason] === "protected" ? (o.verdict.skipReason as never) : audienceSlotOf(o)),
        },
      },
    },
    {
      name: "R12 · the count runs the SEND LOOP — dispatchSlice with a no-op send, which writes the RG audit line for every RG refusal",
      expect: [L.l44],
      impl: { ...REAL, split: splitViaLoop },
    },
    {
      name: "R15 · ⭐ a walk restart that RE-INCLUDES the cursor row — the player read takes `>=` the cursor",
      expect: [L.l31],
      impl: {
        ...REAL,
        ...withWalk(walkWith({
          players: async (q) => {
            const page = await db.user.playerWalk(q);
            if (q.afterId === null) return page;
            const again = (await db.user.playerWalk({ ...q, afterId: null, limit: 10_000 })).rows.find((u) => u.id === q.afterId);
            return again ? { ...page, rows: [again, ...page.rows].slice(0, q.limit) } : page;
          },
        })),
      },
    },
    {
      name: "R16 · the de-duplication dropped — a number the book holds walked AGAIN as a player",
      expect: [L.l32],
      impl: { ...REAL, ...withWalk(walkWith({ inBook: async () => [] })) },
    },
    {
      name: "R17 · an ERASED tombstone counted as in the book — the player at its number never walked",
      expect: [L.l32],
      impl: { ...REAL, ...withWalk(walkWith({ inBook: async (q) => db.marketingContact.msisdnsPresent({ ...q, excludeSourceRef: null }) })) },
    },
    {
      name: "R18 · staff WALKED — the player read loses its role",
      expect: [L.l33],
      impl: {
        ...REAL,
        ...withWalk(walkWith({
          players: async (q) => {
            const rows = (await db.user.list())
              .filter((u) => u.phoneE164.startsWith("+255") && (q.afterId === null || u.id > q.afterId))
              .filter((u) => q.ndcs === null || q.ndcs.some((n) => u.phoneE164.startsWith(`+255${n}`)))
              .filter((u) => (q.createdFrom === null || Date.parse(u.createdAt) >= Date.parse(q.createdFrom)) && (q.createdBefore === null || Date.parse(u.createdAt) < Date.parse(q.createdBefore)))
              .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
            const shown = rows.slice(0, q.limit);
            return { rows: shown.map((u) => ({ id: u.id, phoneE164: u.phoneE164 })), nextAfterId: rows.length > q.limit ? shown[shown.length - 1].id : null };
          },
        })),
      },
    },
    {
      name: "R19 · ⭐ a player flag in a MASKED sample — the sample handed to a masked viewer unshaped",
      expect: [L.l22],
      impl: { ...REAL, deps: { ...REAL.deps, shape: (s) => s } },
    },
    {
      name: "R20 · 🔴 a masked viewer's SEARCH allowed on the campaign audience — the door asks U24's role rule alone",
      expect: [L.l21],
      impl: { ...REAL, refusal: (f, r) => roleRefusal(f, r), deps: { ...REAL.deps, refusal: (f, r) => roleRefusal(f, r) } },
    },
    {
      name: "R21 · no single-flight — every asker walks the audience again",
      expect: [L.l410a],
      impl: { ...REAL, split: (f, o, d) => audienceSplit(f, { ...o, now: o.now ?? new Date() }, d) },
    },
    {
      name: "R22 · no per-process limit — a third split starts beside two (the pool is shared with bets)",
      expect: [L.l410b],
      impl: {
        ...REAL,
        split: async (f, o, d = AUDIENCE_SPLIT_DEPS) => {
          const refused = d.refusal(f, o.viewerReads);
          if (refused) return { ok: false, param: refused.param, reason: refused.reason };
          return { ok: true, split: d.shape(await computeAudienceSplit(f, o, d), o.viewerReads) };
        },
      },
    },
    {
      name: "R23 · a book-only axis beside a population ACCEPTED — the player arm silently loses it",
      expect: [L.l12],
      impl: {
        ...REAL,
        parseJson: (raw) => {
          const r = parseContactAudienceJson(raw, "campaign");
          return !r.ok && r.reason === POPULATION_BOOK_ONLY_REASON ? { ok: true, filter: F({ population: "both" }) } : r;
        },
      },
    },
    {
      name: "R24 · the contact book's reader reads a population as the book",
      expect: [L.l14],
      impl: { ...REAL, book: (f) => contactAudience({ ...f, population: null }) },
    },
    {
      name: "R28 · a contact-book door admits a population — the bulk bar's audience parsed at the campaign scope, so its reader throws a generic failure where a refusal named the axis (U38a review)",
      expect: [L.l14],
      impl: { ...REAL, parseBook: (raw) => parseContactAudienceJson(raw, "campaign") },
    },
    {
      name: "R29 · 🔴 a ticked selection ACCEPTED at the campaign door — one ticked row's verdict, the protected line included, shown to a masked viewer (U38a review)",
      expect: [L.l21],
      impl: {
        ...REAL,
        refusal: (f, r) => campaignAudienceRefusal({ ...f, ids: null }, r),
        deps: { ...REAL.deps, refusal: (f, r) => campaignAudienceRefusal({ ...f, ids: null }, r) },
      },
    },
    {
      name: "R25 · the send loop handed reads — dispatch asks the gate with a third argument",
      expect: [L.l49],
      impl: { ...REAL, sources: { ...REAL_SOURCES, dispatch: REAL_SOURCES.dispatch.split("verdict = await ask(row.msisdn);").join("verdict = await ask(row.msisdn, new Date(), reads);") } },
    },
    {
      name: "R26 · the rg-doors anchor line moved — the gate's RG call rewritten",
      expect: [L.l411],
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          consent: REAL_SOURCES.consent.split("    const rg = await marketingRgStanding(user, identifier, now.getTime());")
            .join("    const rg = await marketingRgStanding(user, identifier, now.getTime(), MARKETING_RG_DEPS);"),
        },
      },
    },
    {
      name: "R27 · the suite drops out of predeploy — a gate outside the pipeline is not a gate",
      expect: [L.l5],
      impl: { ...REAL, sources: { ...REAL_SOURCES, pkg: REAL_SOURCES.pkg.split("npm run test:campaign-audience && ").join("") } },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    const missing = c.expect.filter((e) => !failed.includes(`${tag}${e}`));
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (missing.length) problems.push(`case ${i + 1} (${c.name}): red, but not on "${missing.join(" & ")}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.join(" & ")}${NL}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${NL}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${NL}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
