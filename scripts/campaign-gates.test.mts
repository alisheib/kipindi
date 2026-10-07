/**
 * test:campaign-gates — U40a's guard: THE CONFIRMATION, SERVER (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.5, with the
 * assertions of `docs/marketing-specs/U40.md` carried over as §4.5 changes them; decisions OD27 · X9 · X13 · X15 · E15 ·
 * E18 · OD60 · OD63 · OD65 · OD66 · OD67) — and U41's guard (G7.1).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: the fence (`audience-fence.ts`) over the REAL walk on the
 * memory twin, and the service (`campaign-confirm-service.ts`) end to end — its view and its one conditional write, the
 * memory twin's `transition`, the real split door for a reader, the real settings re-read, the real audit chain (polled),
 * and the shipped price loader (`estimate.ts`'s `loadSegmentCost`) over a send history seeded on the memory twin:
 *   §0  controls — the fixture world counts what it claims; the settings read answers the defaults; the seeded Blackball
 *       history measures TZS 5 a segment, and the console rail (this suite's) has none;
 *   §1  the tier at the server (1.1: through the fence) and the typed text as typed (1.2);
 *   §2  the seal (2.1: every one-character change refused, and the service refuses such a watermark), the KEYED members
 *       key (2.2: no number, no bare digest, a new secret a new key) and the key BOUND TO ITS DRAFT (2.2b: the U40a
 *       review's MAJOR — two drafts holding the same one person never share a key; the same draft re-viewed always does);
 *   §4  the service on the memory twin — OD27's stale client, equality, the two tiers, a swap, the crossing, draft_changed
 *       (before the view and WHILE the audience is counted), five officers at once, the fresh freeze, nobody, a confirmed
 *       campaign, nothing sent, X9's count, no raw key, the list is everybody (for a reader), no money for GROWTH, a lost
 *       reply (4.20) and one that is NOT this write's (4.20b: another officer's, and the same officer's twin in the same
 *       millisecond), and the record said in both halves (4.21);
 *   §G  §4.5's own — E18 the source line (and the stamp saved now), E15 the limit and the frozen budget (X15), a measured
 *       price through the shipped loader, unreadable settings (OD63), OD65's count alone, OD66's refusal (nothing counted),
 *       OD67's typed tier and no list for a viewer who may not read a number (G6c), and U41's one officer;
 *   §6  the source — the fence's one door, the send boundary, no posted count, ONE writer of the confirm keys, the wiring.
 * ⚠️ WHAT LIVES ELSEWHERE: the pure rule's table, the typed-number parse, the Start verdict (OD28) and their reds are
 * `test:campaign-confirm`'s; the modal, its focus line and the action (6.3, 6.4) are U40b's, which extends this suite.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` first proves the baseline green, then the plants' stand-in gate with no
 * flaw switched on, then plants each defect IN MEMORY (a dependency handed to the service or the fence, a stand-in gate, a
 * wrapper of the service, a source string replaced in memory) and requires EXACTLY the assertions it names to fail — red
 * anywhere else is reported, never counted as a catch. No file on disk is written. No database is touched: the database
 * variables are removed below, before the first server module loads, so the store picks its memory twin.
 * ⛔ This file holds no backslash (an editing tool decodes them): line breaks and patterns are built from codes and
 * character classes.
 *
 * Run: `npm run test:campaign-gates` · Red: `npm run red:campaign-gates`
 */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
/* The suite's rail is the console stub, whose own sends are none: a confirmation prices the configured TZS 6 unless G5.4
   points the rail at Blackball, whose seeded history measures TZS 5. */
process.env.SMS_PROVIDER = "console";
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const SVC = await import("../src/lib/server/marketing/campaign-confirm-service.ts");
const FEN = await import("../src/lib/server/marketing/audience-fence.ts");
const PURE = await import("../src/lib/marketing/campaign-confirm.ts");
const AUD = await import("../src/lib/server/marketing/audience.ts");
const SETTINGS = await import("../src/lib/server/marketing/sms-settings.ts");
const EST = await import("../src/lib/server/marketing/estimate.ts");
const { MARKETING_SMS_SETTINGS_DEFAULTS } = await import("../src/lib/marketing/sms-settings.ts");
const { readSavedSourcePhrase } = await import("../src/lib/server/marketing/campaign-draft.ts");
const { composerSourceLineStale } = await import("../src/app/admin/campaigns/new/composer-loader.ts");
const { breakdownVisible } = await import("../src/lib/marketing/campaign-status.ts");
const { SMS_CAMPAIGN_CONFIRM_KEYS } = await import("../src/lib/server/marketing/campaign-model.ts");
const { AUDIENCE_FLOOR } = await import("../src/app/admin/campaigns/new/audience-copy.ts");
const { db } = await import("../src/lib/server/store.ts");
const { audit, auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
const { maskPhone } = await import("../src/lib/phone-normalize.ts");
const { parseTzNumber } = await import("../src/lib/tz-msisdn.ts");
const { formatNumber } = await import("../src/lib/utils.ts");

type ConfirmDeps = import("../src/lib/server/marketing/campaign-confirm-service.ts").ConfirmDeps;
type ConfirmViewer = import("../src/lib/server/marketing/campaign-confirm-service.ts").ConfirmViewer;
type CampaignConfirmView = import("../src/lib/server/marketing/campaign-confirm-service.ts").CampaignConfirmView;
type ConfirmCampaignResult = import("../src/lib/server/marketing/campaign-confirm-service.ts").ConfirmCampaignResult;
type FenceDeps = import("../src/lib/server/marketing/audience-fence.ts").FenceDeps;
type AudienceFence = import("../src/lib/server/marketing/audience-fence.ts").AudienceFence;
type FenceClaim = import("../src/lib/marketing/campaign-confirm.ts").FenceClaim;
type ConfirmTier = import("../src/lib/marketing/campaign-confirm.ts").ConfirmTier;
type ConfirmDecision = import("../src/lib/marketing/campaign-confirm.ts").ConfirmDecision;
type DecideRefusalReason = import("../src/lib/marketing/campaign-confirm.ts").DecideRefusalReason;
type ContactAudienceFilter = import("../src/lib/server/marketing/audience.ts").ContactAudienceFilter;
type StoredSmsCampaign = import("../src/lib/server/store.ts").StoredSmsCampaign;
type StoredMarketingContact = import("../src/lib/server/store.ts").StoredMarketingContact;
type StoredUser = import("../src/lib/server/store.ts").StoredUser;
type SmsCampaignTransition = import("../src/lib/server/store.ts").SmsCampaignTransition;
type StoredSmsMessage = import("../src/lib/server/store.ts").StoredSmsMessage;
type AuditEntry = import("../src/lib/server/audit.ts").AuditEntry;
type SettingsReload = import("../src/lib/server/marketing/sms-settings.ts").SettingsReload;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
/** A line break built from its code — this file holds no backslash escape. */
const NL = String.fromCharCode(10);
const rawRead = (rel: string): string => readFileSync(join(ROOT, rel), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));
const relOf = (abs: string): string => abs.slice(ROOT.length + 1).split(sep).join("/");
const json = (v: unknown): string => JSON.stringify(v);

/* ══ THE LABELS — each once, so a red case names exactly the claims it must turn red ═════════════════════════════════ */

const L = {
  c0: "0 · CONTROLS — the memory twin is loaded; the fixture world counts what it claims through the ONE walk (tags of 1–7 people, 1,666 and 1,667, the book ∪ players fixture of 7 with a book-held player, five player accounts, two of them Yas, a list of 3 with an unsendable number, nobody, one contact tagged alone whose number a player holds, and that player alone in a one-minute window); the settings re-read answers the defaults (TZS 6, a limit of TZS 10,000); the seeded Blackball history measures TZS 5 a segment through the shipped loader, and the console rail has no history (the configured TZS 6)",
  t1: "1.1 · ⭐ THE FENCE'S TIER over the real walk — a FILTERED audience of 1–5 people is listed with a 32-hex members key, 6 and 7 are typed with none, and an UNFILTERED population is typed at every size (all five player accounts, the whole book, both)",
  t2: "1.2 · the typed text reaches the gate as it was typed — '1,666' (grouped) and ' 7 ' confirm, read by the pure rule's parse, never a lenient one",
  w1: "2.1 · ⭐ THE SEAL — verifyFence(signFence(f)) is f for a listed and a typed claim; the token with ANY one character changed, another format (aw0, aw2), a part missing, empty or extra, padding, another key's seal, a non-string and an over-long string are null and never throw; a malformed claim is never sealed; and the service refuses a changed watermark stale_view with nothing frozen",
  w2: "2.2 · ⭐ THE MEMBERS KEY IS KEYED — a one-person audience's key and its whole watermark hold neither the bare key, its +255 form, its 0-form nor its nine national digits, the key is no part of the unkeyed sha256 of the canonical members, the bare key, the +255 or the 0-form; a new SESSION_SECRET gives a new key; and it is 32 lowercase hex",
  w2b: "2.2b · ⭐ THE MEMBERS KEY IS BOUND TO ITS DRAFT (the U40a review's MAJOR) — a draft of one contact tagged on its own and a draft of the one player who joined in a one-minute window hold the SAME person, and their keys differ; the same draft re-viewed at the same revision gives the same key, and the next revision another",
  s1: "4.1 · the happy path, typed (7 people, filtered) — CONFIRMED, audienceCount 7, TYPED, no watermark, confirmedBy the officer, confirmedAt the write's own instant, estimateSegments 7, estimateTzs 42, and exactly ONE marketing.campaign_confirmed row (COMPLIANCE, the officer, SmsCampaign#id) carrying the audience in auditContactAudience's words, the tier, the count, the revision and the segments",
  s2: "4.2 · ⭐ OD27 · THE STALE CLIENT (the plan's control) — a view at 7, one matching contact added, '7' typed on the old watermark: refused audience_moved with freshCount 8, the row still DRAFT with no count, ONE refused row {shownCount 7, freshCount 8} and NO confirmed row; a fresh view and '8' then confirm 8",
  s3: "4.3 · confirmation is EQUALITY — a shrink at confirm (7 → 6) with '7' typed is refused audience_moved with freshCount 6; OD28's 'fewer goes ahead' is Start's",
  s4: "4.4 · the wrong number on a current watermark is refused typed_mismatch, and the row stays DRAFT",
  s5: "4.5 · nothing typed on the typed tier is refused typed_required",
  s6: "4.6 · a listed audience (3 people, filtered) confirms with nothing typed — CONFIRMED, ENUMERATE, audienceWatermark the view's 32-hex members key",
  s7: "4.7 · ⭐ a list where one person was SWAPPED (still 3) is refused audience_moved — the list approved THOSE people",
  s8: "4.8 · an UNFILTERED small population (all five player accounts) is typed — nothing typed is typed_required, and '5' confirms TYPED with no watermark",
  s9: "4.9 · crossing 5 → 6 while the list was open is refused audience_moved with freshCount 6, and the next view is typed",
  s10: "4.10 · draft_changed — a save after the view is refused draft_changed; a save that lands WHILE the audience is being counted is caught by the write's own revision condition and read back draft_changed; nothing is frozen either time",
  s11: "4.11 · ⭐ CONCURRENCY — five confirmations of one draft at once: exactly one confirms, four are refused not_draft, and there is exactly ONE confirmed row",
  s12: "4.12 · ⭐ THE FREEZE IS THE FRESH COUNT — a watermark from an earlier view of 3 with the fresh 7 typed confirms 7, never 3",
  s13: "4.13 · a filter matching nobody — the view is blocked audience_empty (a real 0) and a confirmation is refused audience_empty",
  s14: "4.14 · confirming a CONFIRMED campaign is refused not_draft with the row byte-identical, and its view is blocked not_draft with nothing counted",
  s15: "4.15 · ⭐ CONFIRMED SENDS NOTHING — across every view and confirmation of the run, no SmsMessage, no opt-out token and no SmsCampaignRecipient row appears",
  s16: "4.16 · ⭐ X9 · THE NUMBER TO TYPE IS THE MATCHING FIGURE — for a reader the fence's count equals the split door's own 'On this campaign' (a second walk) on every fixture, the book ∪ players one included (7: a book-held player counted once); and the count a masked viewer of the SAME draft types is that figure (their own view is built from the fence's count, so it is held against the reader's split, never against itself)",
  s17: "4.17 · ⭐ NO RAW KEY LEAVES THE SERVER — no view, result, confirmed or refused audit payload of the run holds a 255… key or a +255… number",
  s18: "4.18 · ⭐ THE LIST IS EVERYBODY, FOR A READER — a listed audience's sample is every person, the unsendable one included, each as maskPhone of its key; a typed audience's is the walk's first five, in the walk's order (a viewer who may not read a number gets none — G6c)",
  s19: "4.19 · G5.3 · ⛔ A GROWTH VIEWER READS NO MONEY — its view and its refusal hold no 'TZS' and no money figures (estimate.money null, the segments kept), while a money reader's view carries the cost",
  s20: "4.20 · a write that lands but loses its reply is reported confirmed — the row's own stamp read back — with exactly one confirmed row, never 'nothing was confirmed'",
  s20b: "4.20b · ⛔ A WRITE THAT IS NOT THIS ONE IS NEVER CLAIMED — another officer's confirmation landing before this write throws is not taken for it (the error reaches the caller, no confirmed row for this officer); nor is the same officer's twin in the SAME millisecond (one confirmed row in all)",
  s21: "4.21 · ⭐ ruling 543 · THE CONFIRMATION SAYS BOTH HALVES — its answer carries recorded: true when the marketing.campaign_confirmed row is in the log, and recorded: false (the campaign still CONFIRMED) when the audit reports it was not",
  g51: "G5.1 · ⭐ E18 · needs_source_line for the book and for both with no source line on the draft — the view blocked with the spec's sentence, the confirmation refused, nothing frozen — while a players-only campaign with none confirms",
  g51b: "G5.1b · the draft's stamped source line must be the one saved now — an older stamp is unsaved (view blocked, confirmation refused), a saved line that cannot be read is source_unreadable, and once saved again it confirms; and the rule blocks exactly where the composer's composerSourceLineStale (or a blank stamp) does, on every pair",
  g52: "G5.2 · ⭐ E15 · THE LIMIT — 1,667 people at TZS 6 (TZS 10,002) are refused over_limit, the money reader told 'TZS 10,002' and 'TZS 10,000' and GROWTH told no figure, nothing frozen; 1,666 (TZS 9,996) confirm with budgetTzs 10,000, estimateTzs 9,996 and estimateSegments 1,666 — the population × the saved segments × the price (X15)",
  g54: "G5.4 · a MEASURED price wins over the configured one in the freeze, through the SHIPPED loader (CONFIRM_DEPS.cost — estimate.ts's loadSegmentCost) over a send history on the memory twin — on the Blackball rail its history measures TZS 5 beside a configured TZS 6, and 7 × 1 × 5 = TZS 35 is frozen; on the console rail, which has none, the configured TZS 6 stands (TZS 42)",
  g55: "G5.5 · ⛔ OD63 · settings that cannot be read — a read that failed, a row not read in full, a read that throws — are settings_unreadable, never priced from the defaults; a price nobody knows is price_unknown; nothing frozen",
  g6: "G6 · ⛔ OD65 · A VIEWER WHO MAY NOT READ A NUMBER SEES THE COUNT ALONE — their view's split is the count-alone view over the fence's own count and the split door is asked ZERO times; a reader's is the full view, asked once",
  g6b: "G6b · ⛔ OD66 · a viewer who may not read a number, on a book ∪ players audience, is refused audience_refused BEFORE anything is counted — the fence asked ZERO times by their view and their confirmation; no count, no watermark, no list, no split, no figure in the sentence, freshCount null in the result and the refused row — while a reader's view counts once and the reader confirms the same campaign",
  g6c: "G6c · ⛔ OD67 · A VIEWER WHO MAY NOT READ A NUMBER CONFIRMS BY TYPING, NEVER BY A LIST — on a listed-size audience (3) their view is typed with no sample and a watermark naming nobody; their confirmation with nothing typed is refused typed_required, on their own watermark AND on a reader's list watermark; '3' confirms TYPED with no watermark stored; the review's two one-person drafts show them no key at all; while a reader keeps the list tier and its sample",
  g71: "G7.1 · ⭐ U41 · ONE OFFICER — no file under src/lib/server/marketing/ or src/app/admin/campaigns/ calls twoOfficerGate, imports two-officer or names a second approver, and test:two-admin is in predeploy",
  x1: "6.1 · the fence reaches the audience only through campaignAudienceCount and walkCampaignAudience — no db., no contactAudience, no marketingContact, no createHash — and keys from the session secret through crypto.ts's signSession",
  x2: "6.2 · ⛔ THE SEND BOUNDARY — the import walk from the service and the fence reaches no send loop, token mint or enqueue (marketing/dispatch, marketing/optout-service, marketing/enqueue); neither file names a send, a mint or a recipient write; and neither imports from sms.ts (the price comes from estimate.ts's one cost loader)",
  x5: "6.5 · ⛔ OD27 tripwire — ConfirmCampaignInput declares exactly campaignId, typed, watermark and actorId: no posted count can reach the gate",
  x6: '6.6 · ⭐ the confirm keys have exactly ONE src writer — the transition(… to: "CONFIRMED" …) in campaign-confirm-service.ts (dev-only seed routes aside), whose patch names every confirm key',
  x7: "6.7 · ⭐ test:campaign-gates and red:campaign-gates resolve to this file, and predeploy runs test:campaign-gates exactly once, right after test:campaign-confirm",
  x8: "6.8 · PENDING until U42 — enqueue.ts asks startAudienceVerdict before its first createMany",
  x9: "6.9 · the shipped wiring is the real doors — CONFIRM_DEPS hands in audienceFence, fenceForViewer, signFence, verifyFence, decideConfirm, campaignAudienceRefusal, breakdownVisible, sourceLineRefusal, the FRESH source-line read, the settings' re-read, estimate.ts's ONE cost loader (loadSegmentCost), spendRefusal, confirmInstant, confirmedByThisWrite and audit; FENCE_DEPS campaignAudienceCount, walkCampaignAudience, isUnfilteredCampaignAudience and membersKeyOf",
} as const;
type Label = (typeof L)[keyof typeof L];

/* ══ THE RECORDER ════════════════════════════════════════════════════════════════════════════════════════════════════ */

let pass = 0;
let fail = 0;
let skipped = 0;
let quiet = false;
const failed: string[] = [];
const ok = (label: Label, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); }
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
};
/** One claim: its body answers [holds, detail]; a throw is a failure with its message, never a crash. ⛔ A detail never
 *  carries a phone number — counts and reasons only. */
async function claim(label: Label, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err).slice(0, 200)}`);
  }
}
const skip = (label: Label, why: string): void => {
  skipped++;
  if (!quiet) console.log(`SKIP ${label} — ${why}`);
};
const throws = (fn: () => unknown): boolean => {
  try { fn(); return false; } catch { return true; }
};

/* ══ THE FIXTURE WORLD — written once, through the store's own doors ═════════════════════════════════════════════════ */

type Mem = {
  marketingContacts: Map<string, StoredMarketingContact>;
  smsCampaigns: Map<string, StoredSmsCampaign>;
  smsMessages: Map<string, unknown>;
  optOutTokens: Map<string, unknown>;
  smsCampaignRecipients: Map<string, unknown>;
};
function mem(): Mem {
  const s = (globalThis as unknown as { __50PICK_STORE?: Mem }).__50PICK_STORE;
  if (!s || !s.marketingContacts || !s.smsCampaigns || !s.smsMessages || !s.optOutTokens || !s.smsCampaignRecipients) {
    throw new Error("the memory store is not loaded — this suite runs on the memory twin only");
  }
  return s;
}

/** A bare key on an NDC: `255`, the two NDC digits, seven more. */
const keyOf = (ndc: string, n: number): string => `255${ndc}${String(n).padStart(7, "0")}`;
const T0 = "2026-08-20T08:00:00.000Z";
const LINE = "Namba yako ipo kwenye orodha ya 50pick.";
const OLD_LINE = "Namba yako ilitoka kwa mshirika wetu.";
const OTHER_SECRET = "another-session-secret-for-the-gates-suite-0123456789";

function contactRow(id: string, msisdn: string, tags: string[]): StoredMarketingContact {
  return {
    id, msisdn, rawInput: msisdn, displayName: null, email: null, ndc: msisdn.slice(3, 5), operator: null, source: "IMPORT",
    sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags, notes: null, importId: null,
    createdAt: T0, createdBy: null, updatedAt: T0, updatedBy: null,
  } as StoredMarketingContact;
}
async function addContact(id: string, msisdn: string, tags: string[]): Promise<void> {
  if ((await db.marketingContact.create(contactRow(id, msisdn, tags))) === null) throw new Error(`fixture: contact ${id} collided`);
}
function playerRow(id: string, key: string, at = "2026-08-01T08:00:00.000Z"): StoredUser {
  return {
    id, phoneE164: `+${key}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser;
}

const WHOLE_BOOK = AUD.WHOLE_BOOK;
const tagF = (t: string): ContactAudienceFilter => ({ ...WHOLE_BOOK, tags: [t] });
const X9F: ContactAudienceFilter = { ...WHOLE_BOOK, population: "both", operators: ["AIRTEL"] };
const PLAYERS_ALL: ContactAudienceFilter = { ...WHOLE_BOOK, population: "players" };
const YAS_PLAYERS: ContactAudienceFilter = { ...WHOLE_BOOK, population: "players", operators: ["HONORA"] };
const BOTH_ALL: ContactAudienceFilter = { ...WHOLE_BOOK, population: "both" };
/** The review's MAJOR, as fixtures: ONE contact tagged on its own (the book) and the ONE player who joined in a one-minute
 *  window (player accounts only) — the same number, two drafts a GROWTH officer may build. */
const HELD_TAG = tagF("g-held");
const JOINED_AT = "2026-08-02T08:00:00.000Z";
const ONE_MINUTE_PLAYERS: ContactAudienceFilter = {
  ...WHOLE_BOOK, population: "players", addedFrom: JOINED_AT, addedBefore: "2026-08-02T08:01:00.000Z",
};

// ── tags of 1–7 people (Vodacom 074): g-n{n} ──
const N_KEYS: Record<number, string[]> = {};
for (let n = 1; n <= 7; n++) {
  N_KEYS[n] = [];
  for (let i = 1; i <= n; i++) {
    const k = keyOf("74", n * 100 + i);
    N_KEYS[n].push(k);
    await addContact(`mc_n${n}_${i}`, k, [`g-n${n}`]);
  }
}
// ── 1,667 people (Vodacom 075), the first 1,666 tagged twice: g-l7 = 1,667 · g-l6 = 1,666 ──
for (let i = 0; i < 1667; i++) {
  await addContact(`mc_big_${String(i).padStart(4, "0")}`, keyOf("75", 10_000 + i), i < 1666 ? ["g-l7", "g-l6"] : ["g-l7"]);
}
// ── a list of 3 with an unsendable 064 number: g-u3 ──
const U3_KEYS = [keyOf("74", 901), keyOf("74", 902), "255641000903"];
await addContact("mc_u3_1", U3_KEYS[0], ["g-u3"]);
await addContact("mc_u3_2", U3_KEYS[1], ["g-u3"]);
await addContact("mc_u3_3", U3_KEYS[2], ["g-u3"]);
// ── X9 · the book ∪ players on Airtel: four contacts, a contact whose number a player holds, three players. The held
//    contact is also tagged on its own (g-held), and its player alone joined on 2 August — the review's two drafts. ──
const HELD = keyOf("68", 50);
for (let i = 1; i <= 4; i++) await addContact(`mc_x9_${i}`, keyOf("68", i), ["g-x9"]);
await addContact("mc_x9_h", HELD, ["g-x9", "g-held"]);
await db.user.create(playerRow("pl_x9_1", keyOf("68", 60)));
await db.user.create(playerRow("pl_x9_2", keyOf("68", 61)));
await db.user.create(playerRow("pl_x9_3", HELD, JOINED_AT));
// ── two Yas (HONORA) players: a players-only audience of 2 ──
await db.user.create(playerRow("pl_q_1", keyOf("65", 70)));
await db.user.create(playerRow("pl_q_2", keyOf("65", 71)));
// ── a Blackball send history: five one-message chunks ten minutes apart, each charged TZS 5, so U39's walk finds four
//    clean pairs and MEASURES TZS 5 a segment for that rail. This suite's own rail is the console, which has no history
//    (the configured TZS 6 stands); G5.4 points the rail at Blackball to drive the shipped price loader over it. ──
const HISTORY_AT = Date.now() - 2 * 24 * 60 * 60_000;
for (let i = 0; i < 5; i++) {
  const t = HISTORY_AT + i * 10 * 60_000;
  await db.smsMessage.create({
    reference: `msg_gates_${i}`, msisdn: keyOf("79", 900 + i), purpose: "OPS", provider: "blackball", senderId: "50PICK",
    bodyLen: 48, status: "DELIVERED", providerMsg: null, dlrStatus: null, dlrDesc: null, balanceTzs: 500 - 5 * i, attempts: 1,
    targetType: null, targetId: null, createdAt: new Date(t).toISOString(), sentAt: new Date(t + 400).toISOString(),
    deliveredAt: new Date(t + 2_000).toISOString(), failedAt: null,
  } as StoredSmsMessage);
}
/** Runs `fn` with the SMS rail pointed at `provider`, and puts the suite's rail back. */
async function onRail<T>(provider: string, fn: () => Promise<T>): Promise<T> {
  const before = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = provider;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.SMS_PROVIDER;
    else process.env.SMS_PROVIDER = before;
  }
}

/** Each run's own campaigns and churn: fresh ids, fresh tags, fresh numbers (Vodacom 076), so no run meets another's. */
let RUN = 0;
let SEQ = 0;

/* ══ THE VIEWERS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A reader of numbers and of money (the owner's tier). */
const READER: ConfirmViewer = { reads: true, money: true };
/** GROWTH: numbers masked, no money. */
const GROWTH: ConfirmViewer = { reads: false, money: false };
/** Money readable, numbers masked — the count alone, so a big audience is never handed to the gate here. */
const MONEY_MASKED: ConfirmViewer = { reads: false, money: true };

/* ══ THE BUNDLE UNDER TEST — every part swappable by a red case ══════════════════════════════════════════════════════ */

type Sources = {
  fence: string;
  service: string;
  draft: string;
  /** Every src file (decommented) holding "CONFIRMED", for 6.6 — dev-only seed routes left out. */
  confirmedHolders: Map<string, string>;
  /** Every .ts/.tsx under the two campaign directories (decommented), for G7.1. */
  campaignPath: Map<string, string>;
  pkg: string;
};
type Impl = {
  /** The fence's reads and rules — a plant swaps one. */
  fenceDeps: FenceDeps;
  /** A plant's last word on the dependencies an assertion assembled (identity when nothing is planted). */
  finish: (d: ConfirmDeps) => ConfirmDeps;
  view: typeof SVC.campaignConfirmView;
  confirm: typeof SVC.confirmCampaign;
  sources: Sources;
  /** The SHIPPED wiring, as 6.9 reads it. */
  shipped: { confirm: Readonly<ConfirmDeps>; fence: Readonly<FenceDeps> };
};

const SVC_REL = "src/lib/server/marketing/campaign-confirm-service.ts";
const FENCE_REL = "src/lib/server/marketing/audience-fence.ts";
const DRAFT_REL = "src/lib/server/marketing/campaign-draft.ts";

function walkDir(abs: string): string[] {
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkDir(join(abs, e.name)) : /[.]tsx?$/.test(e.name) ? [join(abs, e.name)] : []);
}
const DEV_ONLY = "src/app/api/dev-test/";
const confirmedHolders = new Map<string, string>();
for (const abs of walkDir(join(ROOT, "src"))) {
  const rel = relOf(abs);
  if (rel.startsWith(DEV_ONLY)) continue;
  const raw = readFileSync(abs, "utf8");
  if (raw.includes('"CONFIRMED"')) confirmedHolders.set(rel, decomment(raw.split(CR).join("")));
}
const campaignPath = new Map<string, string>();
for (const dir of ["src/lib/server/marketing", "src/app/admin/campaigns"]) {
  for (const abs of walkDir(join(ROOT, ...dir.split("/")))) campaignPath.set(relOf(abs), code(relOf(abs)));
}
const REAL_SOURCES: Sources = {
  fence: code(FENCE_REL),
  service: code(SVC_REL),
  draft: code(DRAFT_REL),
  confirmedHolders,
  campaignPath,
  pkg: rawRead("package.json"),
};
/** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
const plantIn = (src: string, from: string, to: string): string => {
  if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
  return src.replace(from, to);
};

const REAL: Impl = {
  fenceDeps: { ...FEN.FENCE_DEPS },
  finish: (d) => d,
  view: SVC.campaignConfirmView,
  confirm: SVC.confirmCampaign,
  sources: REAL_SOURCES,
  shipped: { confirm: SVC.CONFIRM_DEPS, fence: FEN.FENCE_DEPS },
};

/** The suite's one fixed injection: the saved source line, read fresh (by the view and the confirmation alike), is LINE. */
const SUITE_LINE: Partial<ConfirmDeps> = {
  freshLine: () => ({ ok: true, phrase: LINE }),
};
/** The dependencies one call gets: production's, the suite's source line, the impl's fence, an assertion's own, and the
 *  plant's last word. */
function depsOf(impl: Impl, over: Partial<ConfirmDeps> = {}): ConfirmDeps {
  return impl.finish({
    ...SVC.CONFIRM_DEPS,
    ...SUITE_LINE,
    fence: (c) => FEN.audienceFence(c, impl.fenceDeps),
    ...over,
  });
}

/* ══ THE WORLD ONE RUN SEES ══════════════════════════════════════════════════════════════════════════════════════════ */

type World = { run: number; seen: unknown[]; ids: Set<string>; actors: Set<string> };

async function draft(w: World, slot: string, filter: ContactAudienceFilter, o: { sourcePhrase?: string | null } = {}): Promise<string> {
  const id = `cmp_g${w.run}_${slot}`;
  const at = new Date().toISOString();
  await db.smsCampaign.create({
    id, name: `Gates ${slot}`, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null,
    codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null,
    sourcePhrase: o.sourcePhrase === undefined ? LINE : o.sourcePhrase, draftRevision: 0, confirmTier: null,
    audienceFilter: AUD.contactAudienceKey(filter), audienceCount: null, audienceWatermark: null, estimateSegments: null,
    estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null, createdBy: "off_gates",
    confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
  } as StoredSmsCampaign);
  w.ids.add(id);
  return id;
}
/** A fresh tag of `n` new contacts for this run's churn. */
async function freshTag(w: World, name: string, n: number): Promise<{ tag: string; ids: string[] }> {
  const tag = `r${w.run}-${name}`;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(await addTo(tag, w, name));
  return { tag, ids };
}
async function addTo(tag: string, w: World, name: string): Promise<string> {
  const id = `mc_r${w.run}_${name}_${String(++SEQ).padStart(6, "0")}`;
  await addContact(id, keyOf("76", 100_000 + SEQ), [tag]);
  return id;
}
/** Takes a contact out of every tag — the memory twin's row, as an officer's edit would leave it. */
function untag(id: string): void {
  const c = mem().marketingContacts.get(id);
  if (!c) throw new Error("fixture: no such contact to untag");
  c.tags = [];
}
const rowOf = (id: string): StoredSmsCampaign | null => {
  const r = mem().smsCampaigns.get(id);
  return r ? { ...r } : null;
};
const rowLike = (id: string, f: ContactAudienceFilter) => ({ id, draftRevision: 0, audienceFilter: AUD.contactAudienceKey(f) });

async function viewOf(impl: Impl, w: World, id: string, viewer: ConfirmViewer, over: Partial<ConfirmDeps> = {}): Promise<CampaignConfirmView | null> {
  const v = await impl.view(id, viewer, depsOf(impl, over));
  w.seen.push(v);
  return v;
}
async function confirmOf(
  impl: Impl, w: World, id: string, typed: string | null, watermark: string | null, viewer: ConfirmViewer,
  over: Partial<ConfirmDeps> = {}, actor = `off_${w.run}`,
): Promise<ConfirmCampaignResult> {
  w.actors.add(actor);
  const r = await impl.confirm({ campaignId: id, typed, watermark, actorId: actor }, viewer, depsOf(impl, over));
  w.seen.push(r);
  return r;
}
async function auditRows(action: string, targetId: string): Promise<AuditEntry[]> {
  await auditFlush();
  return getAuditPage({ limit: 10_000 }).filter((e) => e.action === action && e.targetId === targetId);
}
const CONFIRMED_ROW = SVC.CAMPAIGN_CONFIRMED_ACTION;
const REFUSED_ROW = SVC.CAMPAIGN_CONFIRM_REFUSED_ACTION;
const sentCounts = () => ({ sms: mem().smsMessages.size, tokens: mem().optOutTokens.size, recipients: mem().smsCampaignRecipients.size });
const show = (r: ConfirmCampaignResult | null): string =>
  r === null ? "null" : r.ok ? `ok ${r.count} ${r.tier}` : `refused ${r.reason} (fresh ${r.freshCount})`;
const showView = (v: CampaignConfirmView | null): string =>
  v === null ? "no view" : `${v.count} ${v.tier} blocked ${v.blocked}`;
const HEX32 = new RegExp("^[0-9a-f]{32}$");
const RAW_KEY = new RegExp("(^|[^0-9])255[67][0-9]{8}([^0-9]|$)");
const PLUS_KEY = new RegExp("[+]255[0-9]{9}");
const sha256hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
/** Runs `fn` under another session secret, and puts the real one back. */
function withSecret<T>(secret: string, fn: () => T): T {
  const before = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = secret;
  try {
    return fn();
  } finally {
    if (before === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = before;
  }
}
/** The token with the character at `i` changed to another. */
const changeAt = (t: string, i: number): string => `${t.slice(0, i)}${t[i] === "a" ? "b" : "a"}${t.slice(i + 1)}`;

/* ══ THE ASSERTIONS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl): Promise<void> {
  const w: World = { run: ++RUN, seen: [], ids: new Set(), actors: new Set() };
  const sentBefore = sentCounts();
  const D = depsOf(impl);

  // ── §0 · CONTROLS — through the REAL count, so no plant can move them ──
  await claim(L.c0, async () => {
    const count = AUD.campaignAudienceCount;
    const ns: number[] = [];
    for (let n = 1; n <= 7; n++) ns.push(await count(tagF(`g-n${n}`)));
    const figures = {
      ns: ns.join(","), l6: await count(tagF("g-l6")), l7: await count(tagF("g-l7")), x9: await count(X9F),
      players: await count(PLAYERS_ALL), yas: await count(YAS_PLAYERS), u3: await count(tagF("g-u3")), none: await count(tagF("g-none")),
      held: await count(HELD_TAG), minute: await count(ONE_MINUTE_PLAYERS),
    };
    const s = await SETTINGS.reloadMarketingSmsSettings();
    const settings = s.ok && s.readable && s.settings.pricePerSegmentTzs === 6 && s.settings.campaignLimitTzs === 10_000;
    // The shipped price loader, straight: the Blackball history measures 5; the console rail has none, so 6 stands.
    const blackball = await onRail("blackball", () => EST.loadSegmentCost(6));
    const consoleRail = await EST.loadSegmentCost(6);
    const prices = `${blackball.kind}:${blackball.kind === "unknown" ? "-" : blackball.tzsPerSegment} · ${consoleRail.kind}:${consoleRail.kind === "unknown" ? "-" : consoleRail.tzsPerSegment}`;
    const priced = blackball.kind === "measured" && blackball.tzsPerSegment === 5 && consoleRail.kind === "configured" && consoleRail.tzsPerSegment === 6;
    mem();
    return [figures.ns === "1,2,3,4,5,6,7" && figures.l6 === 1666 && figures.l7 === 1667 && figures.x9 === 7 && figures.players === 5
      && figures.yas === 2 && figures.u3 === 3 && figures.none === 0 && figures.held === 1 && figures.minute === 1 && settings && priced
      && !process.env.DATABASE_URL && process.env.SMS_PROVIDER === "console",
    `${json(figures)} · settings ${settings} · prices ${prices}`];
  });

  // ── §1 · THE TIER ──
  await claim(L.t1, async () => {
    const out: string[] = [];
    let good = true;
    for (let n = 1; n <= 7; n++) {
      const f = await D.fence(rowLike(`cmp_t1_${n}`, tagF(`g-n${n}`)));
      const listed = n <= 5;
      good = good && f.claim.count === n && (listed
        ? f.claim.tier === "enumerate" && typeof f.claim.membersKey === "string" && HEX32.test(f.claim.membersKey)
        : f.claim.tier === "typed" && f.claim.membersKey === null);
      out.push(`${n}:${f.claim.tier}`);
    }
    for (const [name, filter] of [["players", PLAYERS_ALL], ["book", WHOLE_BOOK], ["both", BOTH_ALL]] as const) {
      const f = await D.fence(rowLike(`cmp_t1_${name}`, filter));
      good = good && f.claim.tier === "typed" && f.claim.membersKey === null && f.claim.count >= 5;
      out.push(`${name}:${f.claim.count}:${f.claim.tier}`);
    }
    return [good, out.join(" ")];
  });

  await claim(L.t2, async () => {
    const a = await draft(w, "t2a", tagF("g-l6"));
    const va = await viewOf(impl, w, a, MONEY_MASKED);
    const ra = await confirmOf(impl, w, a, "1,666", va?.watermark ?? null, MONEY_MASKED);
    const b = await draft(w, "t2b", tagF("g-n7"));
    const vb = await viewOf(impl, w, b, GROWTH);
    const rb = await confirmOf(impl, w, b, " 7 ", vb?.watermark ?? null, GROWTH);
    return [ra.ok && ra.count === 1666 && rb.ok && rb.count === 7, `${show(ra)} · ${show(rb)}`];
  });

  // ── §2 · THE SEAL AND THE KEY ──
  await claim(L.w1, async () => {
    const K = "0123456789abcdef0123456789abcdef";
    const listedClaim: FenceClaim = { v: 1, campaignId: "cmp_seal", draftRevision: 4, count: 3, tier: "enumerate", membersKey: K };
    const typedClaim: FenceClaim = { v: 1, campaignId: "cmp_seal", draftRevision: 4, count: 5912, tier: "typed", membersKey: null };
    const claims = [listedClaim, typedClaim];
    const tokens = claims.map((c) => D.sign(c));
    const same = (a: FenceClaim | null, b: FenceClaim) => a !== null && json(a) === json(b);
    const round = tokens.every((t, i) => same(D.verify(t), claims[i]));
    let changes = 0;
    const accepted: number[] = [];
    for (const t of tokens) {
      for (let i = 0; i < t.length; i++) {
        changes++;
        if (D.verify(changeAt(t, i)) !== null) accepted.push(i);
      }
    }
    const [, b64, mac] = tokens[0].split(".");
    const malformed: unknown[] = [
      `aw0.${b64}.${mac}`, `aw2.${b64}.${mac}`, `aw1.${b64}`, `aw1.${b64}.${mac}.x`, `aw1..${mac}`, `aw1.${b64}.`, `aw1.${b64}=.${mac}`,
      "", "aw1", null, undefined, 42, {}, [tokens[0]], "x".repeat(5000),
    ];
    let malformedHeld = true;
    for (const m of malformed) {
      try { if (D.verify(m as string) !== null) malformedHeld = false; } catch { malformedHeld = false; }
    }
    const foreign = withSecret(OTHER_SECRET, () => D.sign(listedClaim));
    const foreignRefused = D.verify(foreign) === null;
    const neverSealed = throws(() => D.sign({ ...listedClaim, count: 9 })) && throws(() => D.sign({ ...typedClaim, membersKey: K }));
    // The service: a watermark changed in its seal is no view at all.
    const id = await draft(w, "w1", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const changed = v?.watermark ? changeAt(v.watermark, v.watermark.length - 3) : null;
    const r = await confirmOf(impl, w, id, "7", changed, GROWTH);
    const row = rowOf(id);
    const service = !r.ok && r.reason === "stale_view" && row?.status === "DRAFT" && row.audienceCount === null;
    const everyCharacter = changes === tokens.reduce((n, t) => n + t.length, 0) && changes > 200;
    return [round && accepted.length === 0 && everyCharacter && malformedHeld && foreignRefused && neverSealed && service,
      `round ${round} · ${changes} changes, ${accepted.length} accepted · malformed held ${malformedHeld} · foreign refused ${foreignRefused} · never sealed ${neverSealed} · service ${show(r)}`];
  });

  await claim(L.w2, async () => {
    const f = await D.fence(rowLike("cmp_w2", tagF("g-n1")));
    const M = f.claim.membersKey ?? "";
    const k = N_KEYS[1][0];
    const canonical = PURE.canonicalMembers([k], 1) ?? "";
    const spellings = [k, `+${k}`, `0${k.slice(3)}`, k.slice(3)];
    const token = D.sign(f.claim);
    const decoded = Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8");
    const noNumber = spellings.every((s) => !token.includes(s) && !decoded.includes(s) && !M.includes(s));
    const digests = [canonical, k, `+${k}`, `0${k.slice(3)}`].map(sha256hex);
    const notBare = M !== "" && digests.every((h) => !h.includes(M));
    const scope = { campaignId: "cmp_w2", draftRevision: 0 };
    const mine = impl.fenceDeps.membersKey(scope, canonical);
    const theirs = withSecret(OTHER_SECRET, () => impl.fenceDeps.membersKey(scope, canonical));
    const keyed = mine === M && theirs !== M;
    return [f.claim.tier === "enumerate" && HEX32.test(M) && notBare && noNumber && keyed,
      `tier ${f.claim.tier} · hex ${HEX32.test(M)} · not a bare digest ${notBare} · no number ${noNumber} · keyed ${keyed}`];
  });

  await claim(L.w2b, async () => {
    // The review's scenario: the contact tagged on its own, and the one player who joined in that minute — one number.
    const book = await D.fence(rowLike("cmp_w2b_book", HELD_TAG));
    const players = await D.fence(rowLike("cmp_w2b_players", ONE_MINUTE_PLAYERS));
    const again = await D.fence(rowLike("cmp_w2b_book", HELD_TAG));
    const nextRevision = await D.fence({ ...rowLike("cmp_w2b_book", HELD_TAG), draftRevision: 1 });
    const [kBook, kPlayers, kAgain, kNext] = [book, players, again, nextRevision].map((f) => f.claim.membersKey ?? "");
    const listed = [book, players].every((f) => f.claim.tier === "enumerate" && f.claim.count === 1);
    const keys = [kBook, kPlayers, kAgain, kNext].every((k) => HEX32.test(k));
    return [listed && keys && kBook !== kPlayers && kBook === kAgain && kNext !== kBook,
      `both listed with one person ${listed} · two drafts differ ${kBook !== kPlayers} · re-viewed same ${kBook === kAgain} · next revision differs ${kNext !== kBook}`];
  });

  // ── §4 · THE SERVICE ON THE MEMORY TWIN ──
  await claim(L.s1, async () => {
    const filter = tagF("g-n7");
    const id = await draft(w, "s1", filter);
    const v = await viewOf(impl, w, id, GROWTH);
    const AT = new Date(Date.UTC(2026, 9, 7, 9, 30, 0));
    const actor = `off_${w.run}_s1`;
    const r = await confirmOf(impl, w, id, "7", v?.watermark ?? null, GROWTH, { now: () => AT }, actor);
    const row = rowOf(id);
    const rows = await auditRows(CONFIRMED_ROW, id);
    const p = (rows[0]?.payload ?? {}) as Record<string, unknown>;
    const stored = row !== null && row.status === "CONFIRMED" && row.audienceCount === 7 && row.confirmTier === "TYPED"
      && row.audienceWatermark === null && row.confirmedBy === actor && row.confirmedAt === AT.toISOString()
      && row.estimateSegments === 7 && row.estimateTzs === 42;
    const audited = rows.length === 1 && rows[0].category === "COMPLIANCE" && rows[0].actorId === actor
      && rows[0].targetType === "SmsCampaign" && rows[0].targetId === id && json(p.describe) === json(AUD.auditContactAudience(filter))
      && p.count === 7 && p.tier === "typed" && p.draftRevision === 0 && p.estimateSegments === 7 && p.budgetSet === true;
    return [r.ok && r.count === 7 && r.tier === "typed" && stored && audited,
      `${show(r)} · stored ${stored} · ${rows.length} confirmed row(s), audited ${audited}`];
  });

  await claim(L.s2, async () => {
    const t = await freshTag(w, "s", 7);
    const id = await draft(w, "s2", tagF(t.tag));
    const v1 = await viewOf(impl, w, id, GROWTH);
    await addTo(t.tag, w, "s");
    const r1 = await confirmOf(impl, w, id, "7", v1?.watermark ?? null, GROWTH);
    const mid = rowOf(id);
    const refused = await auditRows(REFUSED_ROW, id);
    const confirmedBefore = await auditRows(CONFIRMED_ROW, id);
    const p = (refused[0]?.payload ?? {}) as Record<string, unknown>;
    const v2 = await viewOf(impl, w, id, GROWTH);
    const r2 = await confirmOf(impl, w, id, "8", v2?.watermark ?? null, GROWTH);
    return [v1?.count === 7 && !r1.ok && r1.reason === "audience_moved" && r1.freshCount === 8 && mid?.status === "DRAFT"
      && mid.audienceCount === null && refused.length === 1 && p.shownCount === 7 && p.freshCount === 8 && confirmedBefore.length === 0
      && v2?.count === 8 && r2.ok && r2.count === 8,
    `view ${v1?.count} · ${show(r1)} · ${refused.length} refused row(s) ${json(p)} · ${confirmedBefore.length} confirmed before · then ${show(r2)}`];
  });

  await claim(L.s3, async () => {
    const t = await freshTag(w, "k", 7);
    const id = await draft(w, "s3", tagF(t.tag));
    const v = await viewOf(impl, w, id, GROWTH);
    untag(t.ids[0]);
    const r = await confirmOf(impl, w, id, "7", v?.watermark ?? null, GROWTH);
    return [v?.count === 7 && !r.ok && r.reason === "audience_moved" && r.freshCount === 6 && rowOf(id)?.status === "DRAFT", `${showView(v)} · ${show(r)}`];
  });

  await claim(L.s4, async () => {
    const id = await draft(w, "s4", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const r = await confirmOf(impl, w, id, "6", v?.watermark ?? null, GROWTH);
    return [!r.ok && r.reason === "typed_mismatch" && rowOf(id)?.status === "DRAFT", show(r)];
  });

  await claim(L.s5, async () => {
    const id = await draft(w, "s5", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const r = await confirmOf(impl, w, id, null, v?.watermark ?? null, GROWTH);
    return [!r.ok && r.reason === "typed_required" && rowOf(id)?.status === "DRAFT", show(r)];
  });

  await claim(L.s6, async () => {
    const id = await draft(w, "s6", tagF("g-n3"));
    const v = await viewOf(impl, w, id, READER);
    const shownKey = FEN.verifyFence(v?.watermark ?? null)?.membersKey ?? null;
    const r = await confirmOf(impl, w, id, null, v?.watermark ?? null, READER);
    const row = rowOf(id);
    return [v?.tier === "enumerate" && r.ok && r.tier === "enumerate" && row?.confirmTier === "ENUMERATE" && shownKey !== null
      && HEX32.test(shownKey) && row.audienceWatermark === shownKey && row.audienceCount === 3,
    `${showView(v)} · ${show(r)} · watermark kept ${row?.audienceWatermark === shownKey}`];
  });

  await claim(L.s7, async () => {
    const t = await freshTag(w, "w", 3);
    const id = await draft(w, "s7", tagF(t.tag));
    const v = await viewOf(impl, w, id, READER);
    untag(t.ids[1]);
    await addTo(t.tag, w, "w");
    const r = await confirmOf(impl, w, id, null, v?.watermark ?? null, READER);
    return [v?.tier === "enumerate" && v.count === 3 && !r.ok && r.reason === "audience_moved" && r.freshCount === 3
      && rowOf(id)?.status === "DRAFT", `${showView(v)} · ${show(r)}`];
  });

  await claim(L.s8, async () => {
    const id = await draft(w, "s8", PLAYERS_ALL);
    const v = await viewOf(impl, w, id, READER);
    const none = await confirmOf(impl, w, id, null, v?.watermark ?? null, READER);
    const five = await confirmOf(impl, w, id, "5", v?.watermark ?? null, READER);
    const row = rowOf(id);
    return [v?.tier === "typed" && v.count === 5 && !none.ok && none.reason === "typed_required" && five.ok && five.tier === "typed"
      && row?.confirmTier === "TYPED" && row.audienceWatermark === null,
    `${showView(v)} · ${show(none)} · ${show(five)}`];
  });

  await claim(L.s9, async () => {
    const t = await freshTag(w, "x", 5);
    const id = await draft(w, "s9", tagF(t.tag));
    const v = await viewOf(impl, w, id, READER);
    await addTo(t.tag, w, "x");
    const r = await confirmOf(impl, w, id, null, v?.watermark ?? null, READER);
    const next = await viewOf(impl, w, id, READER);
    return [v?.tier === "enumerate" && v.count === 5 && !r.ok && r.reason === "audience_moved" && r.freshCount === 6
      && next?.tier === "typed" && next.count === 6, `${showView(v)} · ${show(r)} · next ${showView(next)}`];
  });

  await claim(L.s10, async () => {
    const at = () => new Date().toISOString();
    const a = await draft(w, "s10a", tagF("g-n7"));
    const va = await viewOf(impl, w, a, GROWTH);
    await db.smsCampaign.update(a, { name: "Edited after the view" }, { draftRevision: 0 }, at());
    const ra = await confirmOf(impl, w, a, "7", va?.watermark ?? null, GROWTH);
    const b = await draft(w, "s10b", tagF("g-n7"));
    const vb = await viewOf(impl, w, b, GROWTH);
    const savedWhileCounting = async (c: Pick<StoredSmsCampaign, "id" | "draftRevision" | "audienceFilter">): Promise<AudienceFence> => {
      const f = await FEN.audienceFence(c, impl.fenceDeps);
      await db.smsCampaign.update(c.id, { name: "Edited while counted" }, { draftRevision: c.draftRevision }, at());
      return f;
    };
    const rb = await confirmOf(impl, w, b, "7", vb?.watermark ?? null, GROWTH, { fence: savedWhileCounting });
    const rowA = rowOf(a);
    const rowB = rowOf(b);
    return [!ra.ok && ra.reason === "draft_changed" && !rb.ok && rb.reason === "draft_changed"
      && rowA?.status === "DRAFT" && rowA.audienceCount === null && rowB?.status === "DRAFT" && rowB.audienceCount === null && rowB.draftRevision === 1,
    `after the view ${show(ra)} · while counted ${show(rb)} · rows ${rowA?.status}/${rowB?.status}`];
  });

  await claim(L.s11, async () => {
    const id = await draft(w, "s11", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const results = await Promise.all([1, 2, 3, 4, 5].map((i) => confirmOf(impl, w, id, "7", v?.watermark ?? null, GROWTH, {}, `off_${w.run}_s11_${i}`)));
    const oks = results.filter((r) => r.ok).length;
    const notDraft = results.filter((r) => !r.ok && r.reason === "not_draft").length;
    const rows = await auditRows(CONFIRMED_ROW, id);
    return [oks === 1 && notDraft === 4 && rows.length === 1, `${oks} confirmed · ${notDraft} not_draft · ${rows.length} confirmed row(s)`];
  });

  await claim(L.s12, async () => {
    const t = await freshTag(w, "g", 3);
    const id = await draft(w, "s12", tagF(t.tag));
    const v = await viewOf(impl, w, id, READER);
    for (let i = 0; i < 4; i++) await addTo(t.tag, w, "g");
    const r = await confirmOf(impl, w, id, "7", v?.watermark ?? null, READER);
    return [v?.count === 3 && v.tier === "enumerate" && r.ok && r.count === 7 && rowOf(id)?.audienceCount === 7,
      `${showView(v)} · ${show(r)} · frozen ${rowOf(id)?.audienceCount}`];
  });

  await claim(L.s13, async () => {
    const id = await draft(w, "s13", tagF("g-none"));
    const v = await viewOf(impl, w, id, GROWTH);
    const r = await confirmOf(impl, w, id, null, v?.watermark ?? null, GROWTH);
    return [v?.blocked === "audience_empty" && v.count === 0 && !r.ok && r.reason === "audience_empty" && rowOf(id)?.status === "DRAFT",
      `${showView(v)} · ${show(r)}`];
  });

  await claim(L.s14, async () => {
    const id = await draft(w, "s14", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const first = await confirmOf(impl, w, id, "7", v?.watermark ?? null, GROWTH);
    const before = json(rowOf(id));
    const again = await confirmOf(impl, w, id, "7", v?.watermark ?? null, GROWTH);
    const after = json(rowOf(id));
    const late = await viewOf(impl, w, id, GROWTH);
    return [first.ok && !again.ok && again.reason === "not_draft" && before === after && late?.blocked === "not_draft"
      && late.count === null && late.watermark === null,
    `${show(first)} · ${show(again)} · identical ${before === after} · view ${showView(late)}`];
  });

  await claim(L.s16, async () => {
    const checks: string[] = [];
    let good = true;
    for (const [name, filter] of [["both", X9F], ["book", tagF("g-n7")], ["players", PLAYERS_ALL], ["yas", YAS_PLAYERS]] as const) {
      const id = await draft(w, `s16_${name}`, filter);
      // A reader: the fence's count beside the split door's own "On this campaign" — two walks, one number.
      const reader = await viewOf(impl, w, id, READER);
      const figure = reader !== null && reader.split !== null && reader.split.kind === "full" ? reader.split.onCampaign : null;
      const same = reader !== null && reader.count !== null && figure === formatNumber(reader.count);
      good = good && same && (name !== "both" || reader?.count === 7);
      checks.push(`${name} ${reader?.count}/${figure}`);
      // ⚠️ A masked viewer's own view is built from the fence's count, so it is never held against itself: the number they
      // type is held against the READER's split figure for the same draft. (Both populations at once are refused to them.)
      if (name !== "both") {
        const masked = await viewOf(impl, w, id, GROWTH);
        good = good && masked !== null && masked.count !== null && figure === formatNumber(masked.count);
        checks.push(`${name} masked ${masked?.count}`);
      }
    }
    return [good, checks.join(" · ")];
  });

  await claim(L.s18, async () => {
    const a = await draft(w, "s18a", tagF("g-u3"));
    const va = await viewOf(impl, w, a, READER);
    const b = await draft(w, "s18b", tagF("g-n7"));
    const vb = await viewOf(impl, w, b, READER);
    const listed = va !== null && va.tier === "enumerate" && va.count === 3 && va.sample.length === 3
      && json(va.sample.map((s) => s.masked).sort()) === json(U3_KEYS.map((k) => maskPhone(k)).sort());
    const typed = vb !== null && vb.tier === "typed" && json(vb.sample.map((s) => s.masked)) === json(N_KEYS[7].slice(0, 5).map((k) => maskPhone(k)));
    return [listed && typed, `listed ${va?.sample.length} of ${va?.count} (${listed}) · typed ${vb?.sample.length} in order (${typed})`];
  });

  await claim(L.s19, async () => {
    const id = await draft(w, "s19", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const r = await confirmOf(impl, w, id, "6", v?.watermark ?? null, GROWTH);
    const reader = await viewOf(impl, w, id, READER);
    const growthText = `${json(v)} ${json(r)}`;
    return [v !== null && v.estimate !== null && v.estimate.money === null && v.estimate.segments === 7 && !growthText.includes("TZS")
      && !r.ok && reader?.estimate?.money?.costTzs === 42,
    `GROWTH money ${json(v?.estimate?.money)} · TZS in GROWTH text ${growthText.includes("TZS")} · reader cost ${reader?.estimate?.money?.costTzs}`];
  });

  await claim(L.s20, async () => {
    const id = await draft(w, "s20", tagF("g-n7"));
    const v = await viewOf(impl, w, id, GROWTH);
    const base = depsOf(impl).campaigns;
    const lost: ConfirmDeps["campaigns"] = {
      find: base.find,
      transition: async (cid: string, t: SmsCampaignTransition) => {
        await base.transition(cid, t);
        throw new Error("the reply was lost");
      },
    };
    let r: ConfirmCampaignResult | null = null;
    let threw = "";
    try {
      r = await confirmOf(impl, w, id, "7", v?.watermark ?? null, GROWTH, { campaigns: lost });
    } catch (err) {
      threw = String((err as Error)?.message ?? err);
    }
    const rows = await auditRows(CONFIRMED_ROW, id);
    return [r !== null && r.ok && rowOf(id)?.status === "CONFIRMED" && rows.length === 1, `${show(r)}${threw ? ` · threw ${threw}` : ""} · ${rows.length} confirmed row(s)`];
  });

  await claim(L.s20b, async () => {
    const base = depsOf(impl).campaigns;
    // ① Another officer's confirmation lands, then THIS write throws: the row is not this officer's — never claimed.
    const a = await draft(w, "s20b_other", tagF("g-n7"));
    const va = await viewOf(impl, w, a, GROWTH);
    const mine = `off_${w.run}_s20b`;
    const other = `off_${w.run}_s20b_other`;
    const othersFirst: ConfirmDeps["campaigns"] = {
      find: base.find,
      transition: async (cid: string, t: SmsCampaignTransition) => {
        await base.transition(cid, { ...t, patch: { ...t.patch, confirmedBy: other } });
        throw new Error("the reply was lost");
      },
    };
    let ra: ConfirmCampaignResult | null = null;
    let threwA = false;
    try {
      ra = await confirmOf(impl, w, a, "7", va?.watermark ?? null, GROWTH, { campaigns: othersFirst }, mine);
    } catch {
      threwA = true;
    }
    const minesA = (await auditRows(CONFIRMED_ROW, a)).filter((e) => e.actorId === mine).length;
    // ② The same officer, the SAME millisecond: the first attempt lands; the twin's write then fails, and its read-back
    //    finds the first attempt's row — every value alike but the instant. It is not the twin's own.
    const b = await draft(w, "s20b_twin", tagF("g-n7"));
    const vb = await viewOf(impl, w, b, GROWTH);
    const AT = new Date(Date.UTC(2026, 9, 7, 11, 0, 0));
    const twin = `off_${w.run}_s20b_twin`;
    const before = rowOf(b) as StoredSmsCampaign;
    const first = await confirmOf(impl, w, b, "7", vb?.watermark ?? null, GROWTH, { now: () => AT }, twin);
    let reads = 0;
    const lateTwin: ConfirmDeps["campaigns"] = {
      // Its first read predates the first attempt's write; its read-back is the real one.
      find: async (cid: string) => (reads++ === 0 ? { ...before } : base.find(cid)),
      transition: async () => {
        throw new Error("the database refused this write");
      },
    };
    let threwB = false;
    try {
      await confirmOf(impl, w, b, "7", vb?.watermark ?? null, GROWTH, { now: () => AT, campaigns: lateTwin }, twin);
    } catch {
      threwB = true;
    }
    const rowsB = (await auditRows(CONFIRMED_ROW, b)).length;
    return [threwA && ra === null && minesA === 0 && rowOf(a)?.confirmedBy === other && first.ok && threwB && rowsB === 1,
      `another officer's write: threw ${threwA}, answered ${show(ra)}, rows for this officer ${minesA} · the twin: first ${show(first)}, twin threw ${threwB}, ${rowsB} confirmed row(s)`];
  });

  await claim(L.s21, async () => {
    const a = await draft(w, "s21", tagF("g-n7"));
    const va = await viewOf(impl, w, a, GROWTH);
    const ra = await confirmOf(impl, w, a, "7", va?.watermark ?? null, GROWTH);
    // The chain could not keep the confirmed row (a persist failure): the campaign is confirmed, the record is not.
    const b = await draft(w, "s21_unrecorded", tagF("g-n7"));
    const vb = await viewOf(impl, w, b, GROWTH);
    const notKept: Partial<ConfirmDeps> = {
      audit: async (entry) => {
        const r = await audit(entry);
        return entry.action === CONFIRMED_ROW ? { ...r, recorded: false, unrecorded: "PERSIST_FAILED" } : r;
      },
    };
    const rb = await confirmOf(impl, w, b, "7", vb?.watermark ?? null, GROWTH, notKept);
    return [ra.ok && ra.recorded === true && rb.ok && rb.recorded === false && rowOf(b)?.status === "CONFIRMED",
      `recorded ${ra.ok ? ra.recorded : show(ra)} · not kept ${rb.ok ? rb.recorded : show(rb)} · ${rowOf(b)?.status}`];
  });

  // ── §G · §4.5'S OWN ──
  await claim(L.g51, async () => {
    const book = await draft(w, "g51book", tagF("g-n7"), { sourcePhrase: null });
    const vb = await viewOf(impl, w, book, READER);
    const rb = await confirmOf(impl, w, book, "7", vb?.watermark ?? null, READER);
    const both = await draft(w, "g51both", X9F, { sourcePhrase: null });
    const vt = await viewOf(impl, w, both, READER);
    const rt = await confirmOf(impl, w, both, String(vt?.count ?? ""), vt?.watermark ?? null, READER);
    const players = await draft(w, "g51players", YAS_PLAYERS, { sourcePhrase: null });
    const vp = await viewOf(impl, w, players, READER);
    const rp = await confirmOf(impl, w, players, null, vp?.watermark ?? null, READER);
    const SENTENCE = SVC.CONFIRM_SERVICE_COPY.needs_source_line({ money: true, costTzs: null, limitTzs: null });
    const refusedBoth = [rb, rt].every((r) => !r.ok && r.reason === "needs_source_line" && r.message === SENTENCE)
      && [vb, vt].every((v) => v?.blocked === "needs_source_line" && v.message === SENTENCE)
      && [book, both].every((id) => rowOf(id)?.status === "DRAFT" && rowOf(id)?.audienceCount === null);
    // A stamp of spaces, or an empty one, is no line — whatever is saved now.
    const blank = D.sourceRule({ sourcePhrase: "   " }, tagF("g-n7"), { ok: true, phrase: LINE }) === "needs_source_line"
      && D.sourceRule({ sourcePhrase: "" }, X9F, { ok: true, phrase: null }) === "needs_source_line";
    return [refusedBoth && blank && SENTENCE.includes("source line") && vp?.blocked === null && rp.ok,
      `book ${show(rb)} · both ${show(rt)} · blank stamps ${blank} · players ${showView(vp)} ${show(rp)}`];
  });

  await claim(L.g51b, async () => {
    const id = await draft(w, "g51b", tagF("g-n7"), { sourcePhrase: OLD_LINE });
    const v = await viewOf(impl, w, id, READER);
    // The view reads the line FRESH, as the confirmation does: one that cannot be read blocks it, in the same words.
    const vu = await viewOf(impl, w, id, READER, { freshLine: () => ({ ok: false }) });
    const r = await confirmOf(impl, w, id, "7", v?.watermark ?? null, READER);
    const unread = await confirmOf(impl, w, id, "7", v?.watermark ?? null, READER, { freshLine: () => ({ ok: false }) });
    await db.smsCampaign.update(id, { sourcePhrase: LINE }, { draftRevision: 0 }, new Date().toISOString());
    const v2 = await viewOf(impl, w, id, READER);
    const r2 = await confirmOf(impl, w, id, "7", v2?.watermark ?? null, READER);
    // The rule against the composer's own test, on every pair of a stamped line and a saved one (a blank stamp is G5.1's).
    const rule = depsOf(impl).sourceRule;
    let agree = true;
    for (const stamp of [LINE, OLD_LINE]) {
      for (const saved of [null, LINE, OLD_LINE]) {
        const row = { ...(rowOf(id) as StoredSmsCampaign), status: "DRAFT" as const, sourcePhrase: stamp };
        if ((rule(row, tagF("g-n7"), { ok: true, phrase: saved }) !== null) !== composerSourceLineStale(row, saved)) agree = false;
        if (rule(row, YAS_PLAYERS, { ok: true, phrase: saved }) !== null) agree = false;
      }
    }
    return [v?.blocked === "unsaved" && vu?.blocked === "source_unreadable" && !r.ok && r.reason === "unsaved" && !unread.ok
      && unread.reason === "source_unreadable" && v2?.blocked === null && r2.ok && agree,
    `${showView(v)} · unread view ${showView(vu)} · ${show(r)} · unread ${show(unread)} · saved again ${show(r2)} · agrees ${agree}`];
  });

  await claim(L.g52, async () => {
    const big = await draft(w, "g52big", tagF("g-l7"));
    const vb = await viewOf(impl, w, big, MONEY_MASKED);
    const rb = await confirmOf(impl, w, big, "1667", vb?.watermark ?? null, MONEY_MASKED);
    const rg = await confirmOf(impl, w, big, "1667", vb?.watermark ?? null, GROWTH);
    const fits = await draft(w, "g52fits", tagF("g-l6"));
    const vf = await viewOf(impl, w, fits, MONEY_MASKED);
    const rf = await confirmOf(impl, w, fits, "1666", vf?.watermark ?? null, MONEY_MASKED);
    const row = rowOf(fits);
    const money = (s: string | null | undefined) => typeof s === "string" && s.includes("TZS 10,002") && s.includes("TZS 10,000");
    const refused = vb?.blocked === "over_limit" && money(vb.message) && !rb.ok && rb.reason === "over_limit" && money(rb.message)
      && !rg.ok && rg.reason === "over_limit" && !rg.message.includes("TZS") && !new RegExp("[0-9]").test(rg.message)
      && rowOf(big)?.status === "DRAFT" && rowOf(big)?.audienceCount === null;
    const frozen = vf?.blocked === null && vf.estimate?.money?.costTzs === 9996 && vf.estimate.money.limitTzs === 10_000
      && rf.ok && row?.budgetTzs === 10_000 && row.estimateTzs === 9996 && row.estimateSegments === 1666 && row.audienceCount === 1666;
    return [refused && frozen,
      `1,667: ${showView(vb)} · ${show(rb)} · GROWTH ${show(rg)} · 1,666: ${show(rf)} budget ${row?.budgetTzs} estimate ${row?.estimateTzs} segments ${row?.estimateSegments}`];
  });

  await claim(L.g54, async () => {
    // Nothing injected: the shipped price loader (CONFIRM_DEPS.cost) walks the seeded history of the rail in use.
    const id = await draft(w, "g54", tagF("g-n7"));
    const [v, r] = await onRail("blackball", async () => {
      const view = await viewOf(impl, w, id, MONEY_MASKED);
      return [view, await confirmOf(impl, w, id, "7", view?.watermark ?? null, MONEY_MASKED)] as const;
    });
    const row = rowOf(id);
    const plain = await draft(w, "g54_console", tagF("g-n7"));
    const vc = await viewOf(impl, w, plain, MONEY_MASKED);
    const measured = v?.estimate?.money?.priceKind === "measured" && v.estimate.money.priceTzs === 5 && v.estimate.money.costTzs === 35
      && r.ok && row?.estimateTzs === 35;
    const configured = vc?.estimate?.money?.priceKind === "configured" && vc.estimate.money.priceTzs === 6 && vc.estimate.money.costTzs === 42;
    return [SVC.CONFIRM_DEPS.cost === EST.loadSegmentCost && measured && configured,
      `Blackball ${json(v?.estimate?.money)} · ${show(r)} · frozen ${row?.estimateTzs} · console ${json(vc?.estimate?.money)}`];
  });

  await claim(L.g55, async () => {
    const failedRead = async (): Promise<SettingsReload> => ({ ok: false, error: "fixture: the read failed" });
    const halfRead = async (): Promise<SettingsReload> => ({ ok: true, settings: { ...MARKETING_SMS_SETTINGS_DEFAULTS }, stored: true, readable: false });
    const throwing = async (): Promise<SettingsReload> => { throw new Error("fixture: the read threw"); };
    const out: string[] = [];
    let good = true;
    for (const [name, settings] of [["failed", failedRead], ["half", halfRead], ["threw", throwing]] as const) {
      const id = await draft(w, `g55_${name}`, tagF("g-n7"));
      const v = await viewOf(impl, w, id, MONEY_MASKED, { settings });
      const r = await confirmOf(impl, w, id, "7", v?.watermark ?? null, MONEY_MASKED, { settings });
      good = good && v?.blocked === "settings_unreadable" && !r.ok && r.reason === "settings_unreadable" && rowOf(id)?.status === "DRAFT";
      out.push(`${name} ${show(r)}`);
    }
    const unknown = async () => ({ kind: "unknown" as const, reason: "no-sends" as const });
    const p = await draft(w, "g55_price", tagF("g-n7"));
    const vp = await viewOf(impl, w, p, MONEY_MASKED, { cost: unknown });
    const rp = await confirmOf(impl, w, p, "7", vp?.watermark ?? null, MONEY_MASKED, { cost: unknown });
    good = good && vp?.blocked === "price_unknown" && !rp.ok && rp.reason === "price_unknown" && rowOf(p)?.status === "DRAFT";
    out.push(`price ${show(rp)}`);
    return [good, out.join(" · ")];
  });

  await claim(L.g6, async () => {
    let asked = 0;
    const spy: Partial<ConfirmDeps> = {
      split: (f, viewerReads) => { asked++; return SVC.CONFIRM_DEPS.split(f, viewerReads); },
    };
    const id = await draft(w, "g6", tagF("g-n7"));
    const masked = await viewOf(impl, w, id, GROWTH, spy);
    const maskedAsked = asked;
    const reader = await viewOf(impl, w, id, READER, spy);
    const readerAsked = asked - maskedAsked;
    const alone = masked !== null && masked.split !== null && masked.split.kind === "floor" && masked.split.onCampaign === "7"
      && masked.split.sentence === AUDIENCE_FLOOR && maskedAsked === 0;
    const full = reader !== null && reader.split !== null && reader.split.kind === "full" && readerAsked === 1;
    return [alone && full, `masked ${masked?.split?.kind} asked ${maskedAsked} · reader ${reader?.split?.kind} asked ${readerAsked}`];
  });

  await claim(L.g6b, async () => {
    // A spy on the fence: "refused BEFORE anything is counted" is the number of counts, not a reading of the answer.
    let fenced = 0;
    const counting: Partial<ConfirmDeps> = {
      fence: async (c) => {
        fenced++;
        return FEN.audienceFence(c, impl.fenceDeps);
      },
    };
    const id = await draft(w, "g6b", X9F);
    const masked = await viewOf(impl, w, id, GROWTH, counting);
    const afterMaskedView = fenced;
    const readerView = await viewOf(impl, w, id, READER, counting);
    const afterReaderView = fenced;
    const r = await confirmOf(impl, w, id, "7", readerView?.watermark ?? null, GROWTH, counting);
    const afterMaskedConfirm = fenced;
    const refusedRows = await auditRows(REFUSED_ROW, id);
    const p = (refusedRows[0]?.payload ?? {}) as Record<string, unknown>;
    const digit = new RegExp("[0-9]");
    const uncounted = masked !== null && masked.blocked === "audience_refused" && masked.count === null && masked.watermark === null
      && masked.sample.length === 0 && masked.split === null && masked.describe.length === 0 && masked.estimate === null
      && typeof masked.message === "string" && !digit.test(masked.message);
    const refused = !r.ok && r.reason === "audience_refused" && r.freshCount === null && !digit.test(r.message)
      && refusedRows.length === 1 && p.freshCount === null && p.reason === "audience_refused" && rowOf(id)?.status === "DRAFT";
    // The reader types what their own view shows: this claim is about who may count, not about what the count is (4.16's).
    const rr = await confirmOf(impl, w, id, String(readerView?.count ?? ""), readerView?.watermark ?? null, READER, counting);
    const counts = afterMaskedView === 0 && afterReaderView === 1 && afterMaskedConfirm === 1 && fenced === 2;
    return [uncounted && refused && counts && rr.ok && rr.count === readerView?.count,
      `masked ${showView(masked)} · ${show(r)} · ${refusedRows.length} refused row(s) · counted ${afterMaskedView}/${afterReaderView}/${afterMaskedConfirm}/${fenced} · reader ${show(rr)}`];
  });

  await claim(L.g6c, async () => {
    // A listed-size audience (3 people, filtered), seen by a viewer who may not read a number and by a reader.
    const id = await draft(w, "g6c", tagF("g-n3"));
    const masked = await viewOf(impl, w, id, GROWTH);
    const reader = await viewOf(impl, w, id, READER);
    const maskedClaim = FEN.verifyFence(masked?.watermark ?? null);
    const readerClaim = FEN.verifyFence(reader?.watermark ?? null);
    const countAlone = masked !== null && masked.tier === "typed" && masked.count === 3 && masked.sample.length === 0
      && maskedClaim !== null && maskedClaim.tier === "typed" && maskedClaim.membersKey === null;
    const readerKeeps = reader !== null && reader.tier === "enumerate" && reader.sample.length === 3
      && readerClaim !== null && readerClaim.membersKey !== null;
    // Their confirmation is held to the typed tier — on their own watermark, and on a reader's list watermark.
    const none = await confirmOf(impl, w, id, null, masked?.watermark ?? null, GROWTH);
    const viaList = await confirmOf(impl, w, id, null, reader?.watermark ?? null, GROWTH);
    const typed = await confirmOf(impl, w, id, "3", masked?.watermark ?? null, GROWTH);
    const row = rowOf(id);
    const heldTyped = !none.ok && none.reason === "typed_required" && !viaList.ok && viaList.reason === "typed_required"
      && typed.ok && typed.tier === "typed" && row?.confirmTier === "TYPED" && row.audienceWatermark === null;
    // The review's two one-person drafts: what such a viewer is handed names nobody.
    const a = await draft(w, "g6c_book", HELD_TAG);
    const b = await draft(w, "g6c_players", ONE_MINUTE_PLAYERS);
    const nameless = [await viewOf(impl, w, a, GROWTH), await viewOf(impl, w, b, GROWTH)].every((v) =>
      v !== null && v.count === 1 && v.tier === "typed" && v.sample.length === 0 && FEN.verifyFence(v.watermark)?.membersKey === null);
    return [countAlone && readerKeeps && heldTyped && nameless,
      `masked ${showView(masked)} key ${maskedClaim?.membersKey ?? "none"} list ${masked?.sample.length} · reader ${showView(reader)} list ${reader?.sample.length} · none ${show(none)} · via a list ${show(viaList)} · typed ${show(typed)} · the two drafts nameless ${nameless}`];
  });

  // ── 4.15 and 4.17 read the whole run ──
  await claim(L.s15, async () => {
    const after = sentCounts();
    return [json(after) === json(sentBefore), `before ${json(sentBefore)} · after ${json(after)}`];
  });

  await claim(L.s17, async () => {
    await auditFlush();
    const payloads = getAuditPage({ limit: 10_000 })
      .filter((e) => (e.action === CONFIRMED_ROW || e.action === REFUSED_ROW) && ((e.targetId !== null && w.ids.has(e.targetId)) || (e.actorId !== null && w.actors.has(e.actorId))))
      .map((e) => e.payload ?? {});
    const texts = [...w.seen, ...payloads].map((x) => json(x));
    const leaks = texts.filter((t) => RAW_KEY.test(t) || PLUS_KEY.test(t)).length;
    return [leaks === 0 && texts.length > 40 && payloads.length > 10, `${leaks} of ${texts.length} answers and payloads hold a number (${payloads.length} audit payloads read)`];
  });

  // ── §G7 · U41 ──
  await claim(L.g71, async () => {
    const SECOND = new RegExp("twoOfficerGate|two-officer|secondApprover|secondOfficer|approverId|countersign", "i");
    const holders: string[] = [];
    for (const [rel, text] of impl.sources.campaignPath) {
      const src = rel === SVC_REL ? impl.sources.service : rel === FENCE_REL ? impl.sources.fence : rel === DRAFT_REL ? impl.sources.draft : text;
      if (SECOND.test(src)) holders.push(rel);
    }
    const chain = predeployOf(impl.sources.pkg);
    return [holders.length === 0 && impl.sources.campaignPath.size >= 20 && impl.sources.campaignPath.has(SVC_REL) && chain.includes("npm run test:two-admin"),
      `${impl.sources.campaignPath.size} files read · a second approver in [${holders.join(", ")}] · test:two-admin in predeploy ${chain.includes("npm run test:two-admin")}`];
  });

  // ── §6 · THE SOURCE ──
  await claim(L.x1, async () => {
    const f = impl.sources.fence;
    const dbToken = new RegExp("(^|[^A-Za-z0-9_$.])db[.]");
    const imports = (name: string, from: string) => new RegExp(`import[ ]*[{][^}]*[^A-Za-z0-9_]${name}[^A-Za-z0-9_][^}]*[}][ ]*from[ ]*"${from}"`).test(f);
    const checks = {
      noDb: !dbToken.test(f),
      noBook: !f.includes("contactAudience(") && !f.includes("marketingContact"),
      noBareHash: !f.includes("createHash"),
      count: imports("campaignAudienceCount", "@/lib/server/marketing/audience") && f.includes("count: campaignAudienceCount,"),
      walk: imports("walkCampaignAudience", "@/lib/server/marketing/audience") && f.includes("walk: walkCampaignAudience,"),
      keyed: imports("signSession", "@/lib/server/crypto") && f.includes("signSession(FENCE_KEY_PURPOSE)"),
    };
    return [Object.values(checks).every(Boolean), json(checks)];
  });

  await claim(L.x2, async () => {
    const reached = importWalk([SVC_REL, FENCE_REL], impl.sources);
    const forbidden = ["src/lib/server/marketing/dispatch.ts", "src/lib/server/marketing/optout-service.ts", "src/lib/server/marketing/enqueue.ts"];
    const reachedForbidden = forbidden.filter((f) => reached.has(f));
    const SEND_NAMES = ["sendBatch", "blackballSend", "dispatchSlice", "sendCampaignTest", "ensureOptOutToken", "marketingOptOutToken", "smsCampaignRecipient", "smsMessage.create"];
    const named = [impl.sources.service, impl.sources.fence].flatMap((s) => SEND_NAMES.filter((n) => s.includes(n)));
    const smsImports = (s: string) => [...s.matchAll(new RegExp(`import[ ]*[{]([^}]*)[}][ ]*from[ ]*"@/lib/server/sms"`, "g"))]
      .flatMap((m) => m[1].split(",").map((x) => x.trim()).filter((x) => x !== ""));
    const svcSms = smsImports(impl.sources.service);
    const fenceSms = smsImports(impl.sources.fence);
    return [reached.size > 20 && reachedForbidden.length === 0 && named.length === 0 && svcSms.length === 0 && fenceSms.length === 0,
      `${reached.size} files reached · forbidden reached [${reachedForbidden.join(", ")}] · send names [${named.join(", ")}] · from sms.ts: service [${svcSms.join(", ")}], fence [${fenceSms.join(", ")}]`];
  });

  await claim(L.x5, async () => [
    impl.sources.service.includes("export type ConfirmCampaignInput = { campaignId: string; typed: string | null; watermark: string | null; actorId: string };"),
    "the input type is not exactly the four fields",
  ]);

  await claim(L.x6, async () => {
    const TO_CONFIRMED = new RegExp('to[ ]*:[ ]*"CONFIRMED"', "g");
    const writers: string[] = [];
    for (const [rel, text] of impl.sources.confirmedHolders) {
      const src = rel === SVC_REL ? impl.sources.service : rel === DRAFT_REL ? impl.sources.draft : text;
      for (const _ of src.matchAll(TO_CONFIRMED)) writers.push(rel);
    }
    if (!impl.sources.confirmedHolders.has(DRAFT_REL)) for (const _ of impl.sources.draft.matchAll(TO_CONFIRMED)) writers.push(DRAFT_REL);
    const s = impl.sources.service;
    const at = s.indexOf('to: "CONFIRMED"');
    const end = s.indexOf("draftRevision: freeze.draftRevision", at);
    const patch = at < 0 || end < 0 ? "" : s.slice(at, end);
    const missing = SMS_CAMPAIGN_CONFIRM_KEYS.filter((k) => !patch.includes(`${k}:`));
    return [json(writers) === json([SVC_REL]) && missing.length === 0, `writers [${writers.join(", ")}] · patch misses [${missing.join(", ")}]`];
  });

  await claim(L.x7, async () => {
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(impl.sources.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    const chain = predeployOf(impl.sources.pkg);
    const at = chain.indexOf("npm run test:campaign-gates");
    const wired = scripts["test:campaign-gates"] === "tsx scripts/campaign-gates.test.mts"
      && scripts["red:campaign-gates"] === "tsx scripts/campaign-gates.test.mts --prove-red"
      && chain.filter((x) => x === "npm run test:campaign-gates").length === 1
      && at > 0 && at === chain.indexOf("npm run test:campaign-confirm") + 1;
    return [wired, `test ${scripts["test:campaign-gates"]} · red ${scripts["red:campaign-gates"]} · at ${at}, campaign-confirm at ${chain.indexOf("npm run test:campaign-confirm")}`];
  });

  const ENQUEUE_REL = "src/lib/server/marketing/enqueue.ts";
  if (!existsSync(join(ROOT, ...ENQUEUE_REL.split("/")))) {
    skip(L.x8, "enqueue.ts does not exist yet — U42's commit turns this on");
  } else {
    await claim(L.x8, async () => {
      const e = code(ENQUEUE_REL);
      const ask = e.indexOf("startAudienceVerdict(");
      const write = e.indexOf("createMany(");
      return [ask > 0 && write > 0 && ask < write, `startAudienceVerdict at ${ask}, the first createMany at ${write}`];
    });
  }

  await claim(L.x9, async () => {
    const c = impl.shipped.confirm;
    const f = impl.shipped.fence;
    const wiring = {
      fence: c.fence === FEN.audienceFence, shape: c.shape === SVC.fenceForViewer, sign: c.sign === FEN.signFence,
      verify: c.verify === FEN.verifyFence, decide: c.decide === PURE.decideConfirm, refusal: c.refusal === AUD.campaignAudienceRefusal,
      breakdown: c.breakdown === breakdownVisible, sourceRule: c.sourceRule === SVC.sourceLineRefusal, freshLine: c.freshLine === readSavedSourcePhrase,
      settings: c.settings === SETTINGS.reloadMarketingSmsSettings, cost: c.cost === EST.loadSegmentCost, spendRule: c.spendRule === SVC.spendRefusal,
      stamp: c.stamp === SVC.confirmInstant, ownWrite: c.ownWrite === SVC.confirmedByThisWrite, audit: c.audit === audit,
      count: f.count === AUD.campaignAudienceCount, walk: f.walk === AUD.walkCampaignAudience,
      unfiltered: f.unfiltered === AUD.isUnfilteredCampaignAudience, membersKey: f.membersKey === FEN.membersKeyOf,
    };
    const off = Object.entries(wiring).filter(([, v]) => !v).map(([k]) => k);
    return [off.length === 0, `not the real door: [${off.join(", ")}]`];
  });
}

/** predeploy as its steps. */
function predeployOf(pkg: string): string[] {
  try {
    return ((JSON.parse(pkg) as { scripts?: Record<string, string> }).scripts?.predeploy ?? "").split(" && ");
  } catch {
    return [];
  }
}

/* ══ THE IMPORT WALK (6.2) — read-only; the two units' own files come from the bundle, so a plant reaches it ═══════════ */

const DISK = new Map<string, string>();
function sourceFor(rel: string, s: Sources): string {
  if (rel === SVC_REL) return s.service;
  if (rel === FENCE_REL) return s.fence;
  if (rel === DRAFT_REL) return s.draft;
  let text = DISK.get(rel);
  if (text === undefined) {
    text = code(rel);
    DISK.set(rel, text);
  }
  return text;
}
function resolveSpec(fromRel: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, "src", ...spec.slice(2).split("/"));
  else if (spec.startsWith(".")) base = resolve(dirname(join(ROOT, ...fromRel.split("/"))), ...spec.split("/"));
  else return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx"), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /[.]tsx?$/.test(candidate)) return relOf(candidate);
  }
  return null;
}
function importWalk(starts: string[], s: Sources): Set<string> {
  const FROM = new RegExp(`(?:import|export)[ ]+(type[ ]+)?[^"';]*?from[ ]*["']([^"']+)["']`, "g");
  const DYNAMIC = new RegExp(`import[ ]*[(][ ]*["']([^"']+)["']`, "g");
  const BARE = new RegExp(`import[ ]+["']([^"']+)["']`, "g");
  const seen = new Set<string>(starts);
  const queue = [...starts];
  while (queue.length > 0) {
    const rel = queue.shift() as string;
    const text = sourceFor(rel, s);
    const specs = [
      ...[...text.matchAll(FROM)].filter((m) => m[1] === undefined).map((m) => m[2]),
      ...[...text.matchAll(DYNAMIC)].map((m) => m[1]),
      ...[...text.matchAll(BARE)].map((m) => m[1]),
    ];
    for (const spec of specs) {
      const next = resolveSpec(rel, spec);
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/* ══ THE STAND-IN GATE THE PLANTS SWITCH FLAWS ON IN ═════════════════════════════════════════════════════════════════ */

/** The tier a claim is HELD to, written from the rule (the pure module keeps its own private). */
const heldTierOf = (c: FenceClaim): ConfirmTier =>
  c.tier === "enumerate" && Number.isSafeInteger(c.count) && c.count >= 1 && c.count <= PURE.CONFIRM_ENUMERATE_MAX
    && typeof c.membersKey === "string" && HEX32.test(c.membersKey) ? "enumerate" : "typed";

type DecideFlaws = Partial<Record<"typedVsShown" | "freezeShown" | "noMembers" | "typedAtLeast" | "noEmpty" | "numberParse", true>>;
/** The gate as somebody might write it, with one flaw on. With NO flaw on it must pass every assertion (checked before any
 *  plant runs), so a plant built from it is red for its flaw and nothing else. */
function flawedDecide(flaw: DecideFlaws): typeof PURE.decideConfirm {
  return ({ fresh, shown, typed }) => {
    const tier = heldTierOf(fresh);
    const refuse = (reason: DecideRefusalReason): ConfirmDecision => ({
      ok: false, reason, freshCount: fresh.count, freshTier: tier, shownCount: shown === null ? null : shown.count,
    });
    if (!flaw.noEmpty && fresh.count === 0) return refuse("audience_empty");
    if (shown === null || shown.v !== 1 || shown.campaignId !== fresh.campaignId) return refuse("stale_view");
    if (shown.draftRevision !== fresh.draftRevision) return refuse("draft_changed");
    const freeze = {
      count: flaw.freezeShown ? shown.count : fresh.count,
      tier,
      audienceWatermark: tier === "enumerate" ? fresh.membersKey : null,
      draftRevision: fresh.draftRevision,
    };
    if (tier === "enumerate") {
      const same = shown.count === fresh.count && (flaw.noMembers === true || shown.membersKey === fresh.membersKey);
      return same ? { ok: true, freeze } : refuse("audience_moved");
    }
    const text = flaw.numberParse && typeof typed === "string" ? String(Number(typed)) : typed;
    const n = PURE.parseTypedCount(text);
    const target = flaw.typedVsShown ? shown.count : fresh.count;
    if (n !== null && (flaw.typedAtLeast ? n >= target : n === target)) return { ok: true, freeze };
    if (shown.count !== fresh.count) return refuse("audience_moved");
    return refuse(n === null ? "typed_required" : "typed_mismatch");
  };
}
const withDecide = (flaw: DecideFlaws): Partial<Impl> => ({ finish: (d) => ({ ...d, decide: flawedDecide(flaw) }) });

/** A quiet run: this file's lines and the audit module's console echo both held back, so the red runs print verdicts only. */
async function silently(run: () => Promise<void>): Promise<void> {
  const log = console.log;
  console.log = () => {};
  try {
    await run();
  } finally {
    console.log = log;
  }
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL);
  console.log(`${NL}campaign-gates: ${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped (pending)` : ""}`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const reset = () => { pass = 0; fail = 0; skipped = 0; failed.length = 0; };
  quiet = true;
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  await silently(() => runAssertions(REAL));
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
    process.exit(1);
  }
  console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)`);
  /* ── THE STAND-IN — the plants' gate with no flaw on must be faithful ── */
  reset();
  await silently(() => runAssertions({ ...REAL, ...withDecide({}) }));
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the stand-in gate is red with no flaw on:${NL}  ${failed.join(`${NL}  `)}`);
    process.exit(1);
  }
  console.log(`RED CONTROL — the stand-in gate with no flaw is green (${pass} claims)${NL}`);

  /* ── THE PLANTS — each a defect this unit could really ship, planted in memory ── */
  const PLANT_KEY = keyOf("79", 4242);
  const finishWith = (f: (d: ConfirmDeps) => ConfirmDeps): Partial<Impl> => ({ finish: f });
  const withSources = (patch: Partial<Sources>): Partial<Impl> => ({ sources: { ...REAL_SOURCES, ...patch } });
  /** The first keys of a stored audience, read again by a plant (it never sees the fence's). */
  const firstKeysOf = async (stored: string): Promise<string[]> => {
    const read = FEN.readCampaignAudience(stored);
    if (!read.ok) return [];
    const keys: string[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 20 && keys.length < 6; guard++) {
      const page = await AUD.walkCampaignAudience(read.filter, cursor, 6);
      for (const r of page.rows) keys.push(r.msisdn);
      if (page.next === "done" || page.next === cursor) break;
      cursor = page.next;
    }
    return keys.slice(0, 6);
  };
  const unsealed = (t: string | null | undefined): FenceClaim | null => {
    try {
      const part = typeof t === "string" ? t.split(".")[1] : undefined;
      return part ? PURE.parseFenceClaim(JSON.parse(Buffer.from(part, "base64url").toString("utf8"))) : null;
    } catch { return null; }
  };

  /** A plant that replaces a source anchor is built when its turn comes, so an anchor that has gone fails that plant alone. */
  type Plant = { name: string; expect: Label[]; impl: Partial<Impl> | (() => Partial<Impl>) };
  const plants: Plant[] = [
    { name: "R1 (the plan's own) · the typed number checked against the count INSIDE the posted watermark", expect: [L.s2, L.s3, L.s12],
      impl: withDecide({ typedVsShown: true }) },
    { name: "R2 · the freeze takes the shown count", expect: [L.s12], impl: withDecide({ freezeShown: true }) },
    { name: "R3 · the list tier skips the members key — a swapped person is confirmed", expect: [L.s7], impl: withDecide({ noMembers: true }) },
    { name: "R4 · the fence ignores `unfiltered` — every small audience is listed", expect: [L.t1, L.s8],
      impl: { fenceDeps: { ...FEN.FENCE_DEPS, unfiltered: () => false } } },
    // The DAL's conditional write replaced by an unconditional one; an assertion that hands in its own write stand-in (4.20,
    // 4.20b) keeps it — that stand-in is wrapped around this very write, so it is never lost to the plant.
    { name: "R5 · the confirmation is an unconditional update — status and revision ignored", expect: [L.s10, L.s11],
      impl: finishWith((d) => ({ ...d, campaigns: { ...d.campaigns, transition: d.campaigns.transition !== SVC.CONFIRM_DEPS.campaigns.transition
        ? d.campaigns.transition
        : async (id: string, t: SmsCampaignTransition) => {
          const row = mem().smsCampaigns.get(id);
          if (!row) return null;
          const next = { ...row, status: t.to ?? row.status, updatedAt: t.at } as StoredSmsCampaign;
          for (const [k, v] of Object.entries(t.patch)) if (v !== undefined) (next as Record<string, unknown>)[k] = v;
          mem().smsCampaigns.set(id, next);
          return { ...next };
        } } })) },
    { name: "R7 · the list's rows carry the msisdn", expect: [L.s17],
      impl: finishWith((d) => ({ ...d, fence: async (c) => {
        const f = await d.fence(c);
        const keys = await firstKeysOf(c.audienceFilter);
        return { ...f, sample: f.sample.map((s, i) => ({ ...s, msisdn: keys[i] ?? null })) } as AudienceFence;
      } })) },
    { name: "R8 · the service imports sendBatch from the SMS module", expect: [L.x2],
      impl: withSources({ service: `import { sendBatch } from "@/lib/server/sms";${NL}${REAL_SOURCES.service}${NL}void sendBatch;` }) },
    { name: "R9 · X9 · the fence counts the BOOK arm alone whenever there is one — a book ∪ players audience's players go unconfirmed", expect: [L.s16],
      impl: { fenceDeps: { ...FEN.FENCE_DEPS, count: async (f: ContactAudienceFilter) => {
        const arms = AUD.audienceArms(f);
        return arms.book !== null ? AUD.contactAudience(arms.book).count() : AUD.campaignAudienceCount(f);
      } } } },
    { name: "R9b · the fence's source counts through contactAudience", expect: [L.x1],
      impl: () => withSources({ fence: plantIn(REAL_SOURCES.fence, "count: campaignAudienceCount,", "count: (f) => contactAudience(f).count(),") }) },
    // A bare digest is neither keyed nor bound to a draft: both claims about the key go red, by its nature.
    { name: "R10 · the members key is a plain sha256 of the members", expect: [L.w2, L.w2b],
      impl: { fenceDeps: { ...FEN.FENCE_DEPS, membersKey: (_scope: { campaignId: string; draftRevision: number }, canonical: string) => sha256hex(canonical).slice(0, 32) } } },
    { name: "R-2.2b · the members key without its draft (the review's MAJOR) — keyed, but the same on every draft holding the same people", expect: [L.w2b],
      impl: { fenceDeps: { ...FEN.FENCE_DEPS, membersKey: (_scope: { campaignId: string; draftRevision: number }, canonical: string) =>
        FEN.membersKeyOf({ campaignId: "", draftRevision: 0 }, canonical) } } },
    { name: "R13 · the view embeds the money for every role", expect: [L.s19],
      impl: { view: (id, viewer, deps) => SVC.campaignConfirmView(id, { ...viewer, money: true }, deps) } },
    { name: "R-1.2 · the typed text is read with Number() before the gate", expect: [L.t2], impl: withDecide({ numberParse: true }) },
    { name: "R-2.1 · the watermark is read without its seal", expect: [L.w1], impl: finishWith((d) => ({ ...d, verify: unsealed })) },
    { name: "R-4.3 · the typed check is `>=` — a shrunk audience confirms on the old number", expect: [L.s3], impl: withDecide({ typedAtLeast: true }) },
    { name: "R-4.13 · the gate has no empty check", expect: [L.s13], impl: withDecide({ noEmpty: true }) },
    { name: "R-4.15 · the confirmation enqueues its first recipient", expect: [L.s15],
      impl: finishWith((d) => ({ ...d, campaigns: { ...d.campaigns, transition: async (id: string, t: SmsCampaignTransition) => {
        const r = await d.campaigns.transition(id, t);
        if (r !== null && t.to === "CONFIRMED") {
          await db.smsCampaignRecipient.createMany([{ id: `rcp_plant_${id}`, campaignId: id, msisdn: PLANT_KEY, contactId: null, userId: null, optOutToken: null, createdAt: t.at }]);
        }
        return r;
      } } })) },
    { name: "R-4.18 · the list is the reachable rows only — an unsendable person is confirmed unseen", expect: [L.s18],
      impl: finishWith((d) => ({ ...d, fence: async (c) => {
        const f = await d.fence(c);
        const reachable = (await firstKeysOf(c.audienceFilter)).filter((k) => parseTzNumber(k).verdict === "ok");
        return { ...f, sample: reachable.slice(0, 5).map((k) => ({ masked: maskPhone(k), operator: parseTzNumber(k).operator?.brand ?? null })) };
      } })) },
    { name: "R-G5.1 · E18's source-line check removed", expect: [L.g51],
      impl: finishWith((d) => ({ ...d, sourceRule: (row, f, s) => { const r = SVC.sourceLineRefusal(row, f, s); return r === "needs_source_line" ? null : r; } })) },
    { name: "R-G5.1b · a stamp the owner has since changed is confirmed (and an unread line too)", expect: [L.g51b],
      impl: finishWith((d) => ({ ...d, sourceRule: (row, f, s) => { const r = SVC.sourceLineRefusal(row, f, s); return r === "unsaved" || r === "source_unreadable" ? null : r; } })) },
    { name: "R-G5.2 · E15's limit check removed", expect: [L.g52],
      impl: finishWith((d) => ({ ...d, spendRule: (cost) => (cost === null ? "price_unknown" : null) })) },
    // The write lands with a budget the confirmation did not ask for, so a lost reply's read-back (4.20) rightly refuses to
    // claim it as this write: the stricter read-back the U40a review asked for sees the difference. Both reds are this plant's.
    { name: "R-G5.2b · budgetTzs frozen as null", expect: [L.g52, L.s20],
      impl: finishWith((d) => ({ ...d, campaigns: { ...d.campaigns, transition: (id: string, t: SmsCampaignTransition) =>
        d.campaigns.transition(id, t.to === "CONFIRMED" ? { ...t, patch: { ...t.patch, budgetTzs: null } } : t) } })) },
    { name: "R-G5.2c · the over-limit sentence names the money to every role", expect: [L.g52],
      impl: { confirm: (input, viewer, deps) => SVC.confirmCampaign(input, { ...viewer, money: true }, deps) } },
    { name: "R-G5.4 · the configured price is frozen whenever one is set — the measured one ignored", expect: [L.g54],
      impl: finishWith((d) => ({ ...d, cost: async (configured) => {
        const m = await d.cost(configured);
        return m.kind === "measured" && configured !== null ? { kind: "configured" as const, tzsPerSegment: configured } : m;
      } })) },
    { name: "R-G5.5 · the settings fail OPEN — an unreadable row priced as the defaults", expect: [L.g55],
      impl: finishWith((d) => ({ ...d, settings: async () => {
        let r: SettingsReload;
        try { r = await d.settings(); } catch { r = { ok: false, error: "threw" }; }
        return r.ok && r.readable ? r : { ok: true, settings: { ...MARKETING_SMS_SETTINGS_DEFAULTS }, stored: false, readable: true };
      } })) },
    { name: "R-OD65 · a masked viewer's audience is asked of the split door — the gate is asked about the people they chose", expect: [L.g6],
      impl: finishWith((d) => ({ ...d, breakdown: () => true })) },
    { name: "R-OD66 · the role rule skipped — a masked viewer's book ∪ players audience is counted", expect: [L.g6b],
      impl: finishWith((d) => ({ ...d, refusal: () => null })) },
    { name: "R-OD67 · the fence as a reader sees it, for every role — a viewer who may not read a number gets the list, the members key and the list tier", expect: [L.g6c],
      impl: finishWith((d) => ({ ...d, shape: (f) => f })) },
    { name: "R-4.20b · a lost reply's read-back claims any CONFIRMED row — another officer's confirmation, or a twin's, taken for this one", expect: [L.s20b],
      impl: finishWith((d) => ({ ...d, ownWrite: (after) => after?.status === "CONFIRMED" })) },
    { name: "R-4.20c · the instant is not made unique — the same officer's twin in the same millisecond reads as this write", expect: [L.s20b],
      impl: finishWith((d) => ({ ...d, stamp: (_id: string, now: Date) => now.toISOString() })) },
    { name: "R-4.21 · the answer says recorded without reading the audit's result", expect: [L.s21],
      impl: { confirm: async (input, viewer, deps) => {
        const r = await SVC.confirmCampaign(input, viewer, deps);
        return r.ok ? { ...r, recorded: true } : r;
      } } },
    { name: "R-G7.1 · the service asks a second officer (twoOfficerGate)", expect: [L.g71],
      impl: withSources({ service: `import { twoOfficerGate } from "@/lib/server/two-officer";${NL}${REAL_SOURCES.service}${NL}void twoOfficerGate;` }) },
    { name: "R-6.5 · the confirmation's input grows a posted count", expect: [L.x5],
      impl: () => withSources({ service: plantIn(REAL_SOURCES.service, "watermark: string | null; actorId: string };", "watermark: string | null; actorId: string; count: number };") }) },
    { name: "R-6.6 · a second writer of the confirm keys (the draft save confirms)", expect: [L.x6],
      impl: withSources({ draft: `${REAL_SOURCES.draft}${NL}void db.smsCampaign.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: {}, draftRevision: 0, at });` }) },
    { name: "R-6.7 · the suite drops out of predeploy", expect: [L.x7],
      impl: () => withSources({ pkg: plantIn(REAL_SOURCES.pkg, "npm run test:campaign-gates && ", "") }) },
    { name: "R-6.9 · the shipped confirmation reads the CACHED settings, not a fresh re-read", expect: [L.x9],
      impl: { shipped: { confirm: { ...SVC.CONFIRM_DEPS, settings: async () => ({ ok: true, settings: SETTINGS.marketingSmsSettings(), stored: true, readable: true }) }, fence: FEN.FENCE_DEPS } } },
  ];

  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the claims it names${NL}`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants) {
    reset();
    let built: Impl;
    try {
      built = { ...REAL, ...(typeof plant.impl === "function" ? plant.impl() : plant.impl) };
    } catch (err) {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — the plant could not be built: ${String((err as Error)?.message ?? err)}`);
      continue;
    }
    await silently(() => runAssertions(built));
    const got = [...new Set(failed)].sort();
    const want = [...new Set<string>(plant.expect)].sort();
    if (json(got) === json(want)) {
      held++;
      console.log(`  held  ${plant.name}`);
    } else {
      missed.push(plant.name);
      const extra = got.filter((x) => !want.includes(x));
      const absent = want.filter((x) => !got.includes(x));
      console.log(`  FAIL  ${plant.name}${absent.length ? `${NL}        did not fail: ${absent.map((x) => x.slice(0, 70)).join(" | ")}` : ""}${extra.length ? `${NL}        also failed: ${extra.map((x) => x.slice(0, 70)).join(" | ")}` : ""}`);
    }
  }
  console.log(`${NL}RED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}
