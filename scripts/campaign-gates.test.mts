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
 *   §6  the source — the fence's one door, the send boundary, no posted count, ONE writer of the confirm keys, the wiring;
 *   §UI U40b's screen (ENGINE-SPEC §4.6, and the U40b review's fixes) — the dialog never opens on Confirm and is RE-ARMED,
 *       never remounted, on a refusal (6.4); its tier is the VIEW's, never the count's (OD67 · the U40a re-review), so a
 *       viewer who may not read a number always types; the kit's additive keys; the two actions, each alone in its file and
 *       gated first (6.3), their viewer from the stored role and their import walks; the card each officer's read is
 *       answered — no TZS for GROWTH (G5.3) and no list for a masked viewer (OD67); the trigger's reasons, the form's unsaved
 *       edits among them; the audience on screen held against the saved one; the view COUNTED ON DEMAND, never on a render,
 *       and nothing counted for what may not be confirmed (the review's MAJOR); the fence's count inside the split door's
 *       slots; every answer routed by the pure router; and a failed confirmation said as what is known. The re-review's
 *       fixes: the dialog never opens by itself (UI.15), the confirmation counts its own (UI.16), the wait for a slot is
 *       bounded and said, the dialog closable whenever no confirmation is in flight (UI.17), the read is no oracle (UI.18),
 *       the read has its own audited action and budget (UI.4b), and the card's reason lives in one live region (UI.8). The
 *       third pass: the read's bound is charged only its waiting (UI.19), a reader's missing figures are said (UI.20), and
 *       a bound means its own count (UI.21).
 * ⚠️ WHAT LIVES ELSEWHERE: the pure rule's table, the typed-number parse, the Start verdict (OD28) and their reds are
 * `test:campaign-confirm`'s; what the screen LOOKS like, at 1280 and 360 and with reduced motion, is the drive's
 * (`qa:marketing-confirm`).
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
const LOADER = await import("../src/app/admin/campaigns/new/composer-loader.ts");
const { composerSourceLineStale } = LOADER;
const COPY = await import("../src/app/admin/campaigns/new/composer-copy.ts");
const DOORS = await import("../src/app/admin/campaigns/new/confirm-doors.ts");
const SPLIT = await import("../src/lib/server/marketing/audience-split.ts");
const { RATE_RULES } = await import("../src/lib/server/rate-limit.ts");
const { domainForPath } = await import("../src/lib/server/roles.ts");
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
type FenceSlot = import("../src/lib/server/marketing/audience-fence.ts").FenceSlot;
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
type ConfirmCardData = import("../src/app/admin/campaigns/new/confirm-doors.ts").ConfirmCardData;
type ConfirmReadDeps = import("../src/app/admin/campaigns/new/confirm-doors.ts").ConfirmReadDeps;
type ConfirmRunDeps = import("../src/app/admin/campaigns/new/confirm-doors.ts").ConfirmRunDeps;
type ConfirmAnswerFacts = import("../src/app/admin/campaigns/new/composer-copy.ts").ConfirmAnswerFacts;
type ConfirmAnswerLike = import("../src/app/admin/campaigns/new/composer-copy.ts").ConfirmAnswerLike;
type ConfirmTriggerFacts = import("../src/app/admin/campaigns/new/composer-copy.ts").ConfirmTriggerFacts;
type ConfirmGateProps = import("../src/app/admin/campaigns/new/composer-copy.ts").ConfirmGateProps;

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
  x9: "6.9 · the shipped wiring is the real doors — CONFIRM_DEPS hands in audienceFence, fenceForViewer, signFence, verifyFence, decideConfirm, campaignAudienceRefusal, breakdownVisible, sourceLineRefusal, the FRESH source-line read, the settings' re-read, estimate.ts's ONE cost loader (loadSegmentCost), spendRefusal, confirmInstant, confirmedByThisWrite and audit; FENCE_DEPS campaignAudienceCount, walkCampaignAudience, isUnfilteredCampaignAudience and membersKeyOf",
  // ── §UI · U40b · THE CONFIRMATION ON SCREEN (ENGINE-SPEC §4.6, and the U40b review's fixes) ──
  u1: "UI.1 · ⭐ 6.4 · A5 · THE CONFIRM BUTTON IS NEVER FOCUSED WHEN THE DIALOG OPENS, NOR AFTER A REFUSAL — modal.tsx keeps `initialFocus={isHard ? inputRef : cancelRef}` byte-identical, exactly once; the Confirm card renders the kit's ConfirmModal once (no Modal and no dialog role of its own) and NEVER re-keys it: a refusal RE-ARMS it (`armKey` = `${watermark}:${attempt}` — the box cleared and the first target given the focus again through the opening's own focusIn, no remount, no blink), and the attempt is bumped in the router's re-arm branch and nowhere else",
  u2: "UI.2 · ⭐ OD67 · THE DIALOG'S TIER IS THE VIEW'S, NEVER THE COUNT'S (the U40a re-review's ruling) — on a listed-size audience of 3 the gate is the TYPED tier (the bare count to type, the digit keypad) for a viewer who may not read a number and the list tier for a reader; 7 people are typed for both; a view with no tier or no count opens nothing; and the card spreads `confirmGate(view)` into the dialog, with no CONFIRM_ENUMERATE_MAX, no confirmTier and no count compared in the card or the copy",
  u3: "UI.3 · THE KIT'S ADDITIONS ARE ADDITIVE — the hard arm keeps `{ tier: 'hard'; typedWord: string }` and gains only an optional `typedInputMode?: 'numeric'`; the medium arm forbids it (`typedInputMode?: never`, beside `typedWord?: never`); the keypad line is unchanged and opens for the caller's ask or a count word; the gate gives it to the typed tier alone; `armKey?` (both tiers), Modal's `refocusKey?` and ConfirmModal's `confirmHeld?` are optional, the re-arm going through the opening's own focusIn; and no file in src names typedInputMode but the confirmation's gate and the kit, nor armKey, refocusKey or confirmHeld but the Confirm card and the kit (every existing caller unchanged)",
  u4: "UI.4 · ⭐ THE CONFIRMATION'S ACTION — confirm-actions.ts is a 'use server' file with EXACTLY ONE exported function, `confirmCampaignAction(formData: FormData)`, whose FIRST statement is `softRequireStaff('growth', 'marketing.campaign.confirm', …)` — and growth is domainForPath('/admin/campaigns') — and which hands the form to `runConfirmFor(g.userId, confirmRequestOf(formData))`; the request reads only the campaign, the typed text and the watermark, never a count; the confirmation is judged as the STORED role sees it (the doors' viewer is `confirmViewerFor`); and the Confirm card imports it and calls it — no orphan",
  u4b: "UI.4b · ⭐ THE READ'S ACTION — confirm-view-actions.ts is a 'use server' file with EXACTLY ONE exported function, `campaignConfirmViewAction(request: unknown)`, whose FIRST statement is the confirmation's gate under the READ's own action (`marketing.campaign.confirm_view` — a refused read is never audited as a refused confirmation), whose SECOND is the officer's read budget (`marketing.campaignConfirmRead`, a real rule: a spent budget answered in words, nothing read), and which hands the request to `readConfirmCardFor(g.userId, confirmReadRequestOf(request))`; the request keeps only the campaign, a whole-number revision and the audience's campaign keys — a posted count, a typed word or any other key is dropped; a refusal of the read's own (the role's, a spent budget's) is printed ALONE, with no way back beside it, while a read lost in transit offers 'Count again'; and the Confirm card imports it and calls it — no orphan",
  u5: "UI.5 · ⭐ THE VIEWER IS THE STORED ROLE'S, AND IT FAILS CLOSED — confirmViewerFor reads GROWTH as no number and no money, FINANCE as money without a number, ADMIN as both; an unknown officer, no officer and a blank id as neither; a role read that throws as neither, and a cell that throws as that cell refused",
  u6: "UI.6 · ⭐ G5.3 · NO TZS IN A GROWTH RENDER — the card a GROWTH officer's read is answered (readConfirmCardFor, the read action's own body, whose shipped doors are confirmViewerFor, campaignConfirmView and confirmMoneyLine) carries no 'TZS' and no money figure — the money line null and the estimate's money taken out, its segments kept and said money-free — while a money reader's card (FINANCE, ADMIN) carries the line with 'TZS 42'; and the card prints money only from that line",
  u7: "UI.7 · ⭐ OD67 · NO LIST FOR A VIEWER WHO MAY NOT READ A NUMBER, IN THE CARD — on a listed-size audience of 3 the card a GROWTH officer's read is answered is typed, the count alone, no sample, no masked number anywhere and a watermark naming nobody; a reader's card on the same draft lists all three; and the card lists the view's own rows and nothing else",
  u8: "UI.8 · THE TRIGGER'S REASON, NEVER HIDDEN, NEVER A REFUSAL NOBODY ASKED FOR — none before a press or for a counted, unblocked draft; 'Save first' for unsaved text, an audience on screen the draft does not store, a save in flight or nothing saved; the audience's OWN problem when it cannot be used; 'reload' for a draft saved elsewhere since and 'Updating' while this tab's save is read back or another draft is on screen; 'Write the Swahili message first' for a blank body; the act gate's sentence for a view-only role; every status past DRAFT in words true of it; 'Nobody matches' for nobody; a read that failed or was lost said as such; the server's stale, unsaved, closed and gone answers; the service's own blocked sentence — no_body's included — WITHOUT a refused confirmation's 'Nothing was …' tail; a read that found no slot in time ('busy') and a spent read budget, each in its own words; and the card disables its trigger on it, with it in the title and on the card — said in ONE live region that is always there: the line's box carries role=status, the lines it swaps carry none (K8b)",
  u9: "UI.9 · ⛔ BOTH ACTIONS' IMPORT WALKS reach no send loop, token mint or enqueue (marketing/dispatch, optout-service, enqueue) — and neither the composer's loader nor its draft actions",
  u10: "UI.10 · THE AUDIENCE ON SCREEN AGAINST THE SAVED ONE — the composer's loader says `unsaved` for a saved draft whose address names another audience, never for its own stored audience, a draft opened with no audience in its address, or a new composer; the Confirm card reads it through the composer's state, and Save takes it as a change (never 'Nothing to save')",
  u11: "UI.11 · ⭐ COUNTED ON DEMAND, NEVER ON A RENDER (the U40b review's MAJOR) — page.tsx renders the card bare (no read, no boundary of its own, no import of the confirmation's doors or service); the card asks only inside `ask`, which its trigger and its way back call and no effect does; and the read counts NOTHING — its view door never asked — for a campaign past DRAFT (every status), a revision the form is not showing, an audience on screen the draft does not store, an address audience that cannot be read, or a campaign that is gone, while it asks exactly once for the draft the form shows",
  u12: "UI.12 · ⭐ THE FENCE'S COUNT TAKES THE SPLIT DOOR'S SLOTS — with both per-process slots held, a fence's count does not start (its count door unasked, one waiter) and starts once a slot frees; and audience-fence.ts counts through `audienceWalkCount(filter, deps.count, { join: slot.join, waitMs: slot.waitMs, waited })` (its slot FENCE_SLOT unless a suite hands one in), calling `deps.count(` nowhere else",
  u13: "UI.13 · ⭐ WHAT THE CARD DOES WITH EACH ANSWER (the pure router) — confirmed: close, read again, 'Nothing has been sent.' (success), its record's failure said and kept on screen when it did not land; failed: KEEP the dialog open, 'nothing was confirmed'; unfinished or lost in transit: KEEP it open, 'may already be confirmed', kept on screen; the role's refusal: close, in its words; not_draft: close, read again, titled 'Already confirmed' when the page then reads CONFIRMED and 'Not confirmed' otherwise; not_found: close, read again; every other refusal: RECOUNT, then RE-ARM on a fresh view that may open (the notice on top) or close with 'Not confirmed' and the notice; and the card routes every answer through confirmOutcome and afterRecount",
  u14: "UI.14 · ⭐ A FAILED CONFIRMATION IS SAID AS WHAT IS KNOWN — runConfirmFor with a confirmation that throws says 'nothing was confirmed' (failed) only when the row reads back a DRAFT or gone, and 'may already be confirmed' (unfinished) when it reads CONFIRMED or the read-back throws; a refusal and a confirmation pass through as the service gave them, its record's half kept; and the confirmation is handed the officer and the doors' viewer",
  u15: "UI.15 · ⭐ THE DIALOG NEVER OPENS BY ITSELF (the U40b re-review's MINOR 1) — an answer opens it only for the form still on screen (the key it was asked for) while nothing on the page blocks the trigger: not after the officer typed while it counted, picked another audience or saved, and never on a blocked answer or none (`confirmOpensOn`); the card asks it when the answer lands, reading the form as last rendered (`nowRef`), opens in that one place, shows the dialog only for the form it was opened for, and DROPS an open it can no longer show, outside a confirmation — so undoing the change never pops a dialog nobody pressed for",
  u16: "UI.16 · ⭐ THE CONFIRMATION COUNTS ITS OWN (the U40b re-review's MINOR 2 · OD27) — with a count of the same audience still in flight from before a contact was added (another officer's, another draft's), a view at 6 and the seventh added, a confirmation typed '6' counts 7 itself and is refused audience_moved (freshCount 7), the row still a DRAFT with nothing frozen, and the next view reads 7; the fence asks the split door `{ join: false }` (FENCE_SLOT), never the shared count",
  u17: "UI.17 · ⭐ THE WAIT FOR A SLOT IS BOUNDED, AND SAID (the U40b re-review's MINOR 3) — with both per-process slots held, a fence whose slot waits the bound it is given (the shipped CONFIRM_SLOT_WAIT_MS, 15 s — here 250 times shorter) answers AudienceSlotBusy within it, its count never asked; the trigger's read answers `busy`, the confirmation `busy` saying nothing was confirmed (the row still a DRAFT), and a reader's split asked with a bound is busy within it — each answered in time; with a slot free the same bound counts; the read's sentence says nothing was COUNTED (never a confirmation, never 'other work' — the slots are usually counting other audiences), the confirmation's that nothing was confirmed; the dialog KEEPS on busy, and the card offers 'Count again' after a read; the view hands a reader's split what is left of the bound once the count's WAIT is charged; and the dialog is closable whenever no confirmation is in flight — the card's `loading` is the request alone (`posting`, fallen as soon as it answers), `confirmHeld` the rest, and the kit's held Confirm is off while Cancel, Esc, ✕ and the scrim still close it",
  u18: "UI.18 · ⛔ THE READ IS NO ORACLE (the U40b re-review) — a viewer who may not read a number, posting a reader's hidden audience (a consent predicate) as the one on screen, is answered `unsaved` whether or not it equals the stored one; a reader posting the same is compared (the stored one counted, another unsaved); and the read's role rule is the campaign door's (`campaignAudienceRefusal`), asked before the comparison",
  u19: "UI.19 · ⭐ THE READ'S BOUND IS CHARGED ONLY ITS WAITING (the third pass) — a fence whose count WALKS 200 ms with its slot free reports no wait, and a reader's split is handed the whole CONFIRM_SLOT_WAIT_MS; one whose count WAITS ~150 ms for a slot reports it, and the split is handed the bound less that wait; the slot door tells an asker its wait once it holds the slot (`waited`), the fence hands it on (`waitedMs`), and the view charges that — never the time since it began",
  u20: "UI.20 · ⭐ A READER'S MISSING FIGURES ARE SAID (the third pass) — a reader's split that found no slot in time leaves the view its count, its watermark, its five rows and its estimate with `split: null`; and the dialog then SAYS so where the four figures would stand (data-confirm-figures='unread', COMPOSE_CONFIRM_SPLIT_UNREAD — the count exact, each message checked again when it is sent), never leaving them out in silence",
  u21: "UI.21 · ⛔ A BOUND MEANS ITS OWN COUNT (the third pass) — with both slots held, a bounded asker that does not say `join: false` still counts its own: an unbounded asker for the same audience behind it never joins it, so when the bound ends one in 'busy' the other keeps its place and counts once a slot frees; both of the split door's sharing rules say so (`!bounded(opts.waitMs)`), and an infinite wait is no bound",
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
// ── §UI · three officers whose STORED roles decide the Confirm card's viewer: GROWTH (no number, no money), FINANCE (money,
//    no number) and ADMIN (both). Staff accounts are never walked (`user.playerWalk`), so no audience above moves. ──
const UI_GROWTH = "usr_gates_ui_growth";
const UI_FINANCE = "usr_gates_ui_finance";
const UI_ADMIN = "usr_gates_ui_admin";
await db.user.create({ ...playerRow(UI_GROWTH, keyOf("78", 1)), role: "GROWTH" } as StoredUser);
await db.user.create({ ...playerRow(UI_FINANCE, keyOf("78", 2)), role: "FINANCE" } as StoredUser);
await db.user.create({ ...playerRow(UI_ADMIN, keyOf("78", 3)), role: "ADMIN" } as StoredUser);
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
  /** §UI (U40b) — the kit's dialog, the Confirm card, its two actions and their doors, the composer's copy, client and page
   *  (decommented). */
  modal: string;
  card: string;
  actions: string;
  viewActions: string;
  doors: string;
  copy: string;
  client: string;
  page: string;
  /** §UI 3 — every src file whose code names `typedInputMode`, every one naming `armKey` or `refocusKey`, and every one
   *  naming `confirmHeld` (read once). */
  inputModeHolders: string[];
  armKeyHolders: string[];
  heldHolders: string[];
  /** §UI 21 — the split door (decommented): its two sharing rules. */
  split: string;
};
/** §UI (U40b) — the card's pure decisions and its two server doors, each swappable by a plant. */
type UiImpl = {
  /** The dialog's tier (`confirmGate`). */
  gate: typeof COPY.confirmGate;
  /** The trigger's reason (`confirmTriggerBlocked`). */
  blocked: typeof COPY.confirmTriggerBlocked;
  /** A service sentence as the trigger says it (`composeTriggerSentence`). */
  sentence: typeof COPY.composeTriggerSentence;
  /** Who is looking (`confirmViewerFor`). */
  viewer: typeof SVC.confirmViewerFor;
  /** The read's doors as production's (`CONFIRM_READ_DEPS`), the suite's view injected (its source line). */
  readDeps: (impl: Impl) => ConfirmReadDeps;
  /** The trigger's read (`readConfirmCardFor`) and the confirmation's body (`runConfirmFor`). */
  read: typeof DOORS.readConfirmCardFor;
  run: typeof DOORS.runConfirmFor;
  /** The pure router (`confirmOutcome`, `afterRecount`). */
  outcome: typeof COPY.confirmOutcome;
  recount: typeof COPY.afterRecount;
  /** May an answer open the dialog, now (`confirmOpensOn` — the re-review's MINOR 1)? */
  opens: typeof COPY.confirmOpensOn;
  /** The way back a blocked answer offers (`confirmAnswerRetry`). */
  retry: typeof COPY.confirmAnswerRetry;
  /** The audience on screen against the saved one (`composeAudienceView`). */
  audienceView: typeof LOADER.composeAudienceView;
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
  ui: UiImpl;
};

const SVC_REL = "src/lib/server/marketing/campaign-confirm-service.ts";
const FENCE_REL = "src/lib/server/marketing/audience-fence.ts";
const DRAFT_REL = "src/lib/server/marketing/campaign-draft.ts";
/** §UI (U40b) — the files the confirmation's screen lives in. */
const MODAL_REL = "src/components/ui/modal.tsx";
const NEW_DIR = "src/app/admin/campaigns/new/";
const CARD_REL = `${NEW_DIR}campaign-confirm.tsx`;
const ACTIONS_REL = `${NEW_DIR}confirm-actions.ts`;
const VIEW_ACTIONS_REL = `${NEW_DIR}confirm-view-actions.ts`;
const DOORS_REL = `${NEW_DIR}confirm-doors.ts`;
const COPY_REL = `${NEW_DIR}composer-copy.ts`;
const CLIENT_REL = `${NEW_DIR}composer-client.tsx`;
const PAGE_REL = `${NEW_DIR}page.tsx`;
const LOADER_REL = `${NEW_DIR}composer-loader.ts`;

function walkDir(abs: string): string[] {
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkDir(join(abs, e.name)) : /[.]tsx?$/.test(e.name) ? [join(abs, e.name)] : []);
}
const DEV_ONLY = "src/app/api/dev-test/";
const confirmedHolders = new Map<string, string>();
const inputModeHolders: string[] = [];
const armKeyHolders: string[] = [];
const heldHolders: string[] = [];
for (const abs of walkDir(join(ROOT, "src"))) {
  const rel = relOf(abs);
  if (rel.startsWith(DEV_ONLY)) continue;
  const raw = readFileSync(abs, "utf8");
  if (raw.includes('"CONFIRMED"')) confirmedHolders.set(rel, decomment(raw.split(CR).join("")));
  // §UI 3 · a file whose CODE (not its comments) names the dialog's keypad key, or its re-arm keys.
  if (raw.includes("typedInputMode") && decomment(raw.split(CR).join("")).includes("typedInputMode")) inputModeHolders.push(rel);
  if ((raw.includes("armKey") || raw.includes("refocusKey")) && new RegExp("armKey|refocusKey").test(decomment(raw.split(CR).join("")))) armKeyHolders.push(rel);
  if (raw.includes("confirmHeld") && decomment(raw.split(CR).join("")).includes("confirmHeld")) heldHolders.push(rel);
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
  modal: code(MODAL_REL),
  card: code(CARD_REL),
  actions: code(ACTIONS_REL),
  viewActions: code(VIEW_ACTIONS_REL),
  doors: code(DOORS_REL),
  copy: code(COPY_REL),
  client: code(CLIENT_REL),
  page: code(PAGE_REL),
  inputModeHolders: [...inputModeHolders].sort(),
  armKeyHolders: [...armKeyHolders].sort(),
  heldHolders: [...heldHolders].sort(),
  split: code("src/lib/server/marketing/audience-split.ts"),
};
/** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
const plantIn = (src: string, from: string, to: string): string => {
  if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
  return src.replace(from, to);
};

/** §UI · the read's doors as production's — its viewer, its find and its money line — with the view counted through the
 *  bundle under test and the suite's source line (so a reader's three are a list, not a stale stamp). */
const realReadDeps = (impl: Impl): ConfirmReadDeps => ({
  ...DOORS.CONFIRM_READ_DEPS,
  view: (campaignId, viewer) => impl.view(campaignId, viewer, depsOf(impl)),
});

const REAL: Impl = {
  fenceDeps: { ...FEN.FENCE_DEPS },
  finish: (d) => d,
  view: SVC.campaignConfirmView,
  confirm: SVC.confirmCampaign,
  sources: REAL_SOURCES,
  shipped: { confirm: SVC.CONFIRM_DEPS, fence: FEN.FENCE_DEPS },
  ui: {
    gate: COPY.confirmGate,
    blocked: COPY.confirmTriggerBlocked,
    sentence: COPY.composeTriggerSentence,
    viewer: SVC.confirmViewerFor,
    readDeps: realReadDeps,
    read: DOORS.readConfirmCardFor,
    run: DOORS.runConfirmFor,
    outcome: COPY.confirmOutcome,
    recount: COPY.afterRecount,
    audienceView: LOADER.composeAudienceView,
    opens: COPY.confirmOpensOn,
    retry: COPY.confirmAnswerRetry,
  },
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

/* ── §UI's handles (U40b) ── */
/** A no-break space — a figure that must not split keeps its number with it (the money line's own spelling). */
const NB = String.fromCharCode(0xa0);
/** A masked number's dot (`maskPhone`): a card holding none shows no masked number at all. */
const DOT = String.fromCharCode(0x2022);
/** A5 · the one line that keeps the Confirm button from being focused when a dialog opens (`modal.tsx`). */
const FOCUS_LINE = "initialFocus={isHard ? inputRef : cancelRef}";
/** The dialog's re-arm key — a refusal re-arms it on the fresh view, never re-keys (remounts) it. */
const ARM_KEY = "armKey={`${dialog.view.watermark}:${attempt}`}";
/** The dialog takes its tier and its word as ONE spread of the gate (the last view it was drawn from). */
const GATE_SPREAD = "{...dialog.gate}";
/** Each action's signature, and the gate that must be its first statement (ruling 523). */
const ACTION_SIG = "export async function confirmCampaignAction(formData: FormData): Promise<ConfirmActionResult> {";
const VIEW_SIG = "export async function campaignConfirmViewAction(request: unknown): Promise<ConfirmReadAnswer> {";
const GUARD_LINE = 'const g = await softRequireStaff("growth", "marketing.campaign.confirm", COMPOSE_CONFIRM_ROLE_REFUSAL);';
/** The read's own gate (its own audited action — the re-review's NIT) and the officer's read budget, its second statement. */
const VIEW_GUARD_LINE = 'const g = await softRequireStaff("growth", "marketing.campaign.confirm_view", COMPOSE_CONFIRM_ROLE_REFUSAL);';
const READ_BUDGET_LINE = 'const rate = await rateCheckAsync(g.userId, "marketing.campaignConfirmRead");';
/** The Confirm card's one ConfirmModal element: from its tag to the end of the tag that spreads the gate. */
function dialogOf(card: string): string {
  const at = card.indexOf("<ConfirmModal");
  if (at < 0) return "";
  const spread = card.indexOf(GATE_SPREAD, at);
  const end = spread < 0 ? -1 : card.indexOf("/>", spread);
  return end < 0 ? card.slice(at, at + 1200) : card.slice(at, end + 2);
}
/** One `case "…":` branch of the card's router — from its label to the next case (or the switch's end). */
function caseOf(card: string, label: string): string {
  const at = card.indexOf(`case "${label}":`);
  if (at < 0) return "";
  const next = card.indexOf('case "', at + 6);
  const end = next < 0 ? card.indexOf("}", at) : next;
  return card.slice(at, end < 0 ? at + 600 : end);
}
/** From `opener` to the next top-level `export` (or the end) — one exported function of a module, read on its own. */
function exportedBody(src: string, opener: string): string {
  const at = src.indexOf(opener);
  if (at < 0) return "";
  const next = src.indexOf(`${NL}export `, at + opener.length);
  return src.slice(at, next < 0 ? src.length : next);
}
/** The names a file exports as functions, and how many other things it exports (a "use server" file may export neither). */
const exportedFunctions = (src: string): string[] =>
  [...src.matchAll(new RegExp("export[ ]+(async[ ]+)?function[ ]+([A-Za-z0-9_$]+)", "g"))].map((x) => x[2]);
const otherExports = (src: string): number => [...src.matchAll(new RegExp("export[ ]+(const|let|var|default|class)[^A-Za-z0-9_$]", "g"))].length;
/** What a "use server" file's one action does after its signature — its first statement and the rest. */
const actionBody = (src: string, sig: string): string => {
  const at = src.indexOf(sig);
  return at < 0 ? "" : src.slice(at + sig.length).trimStart();
};
/** A macrotask: every microtask already queued (a slot handed on, a waiter registered) has run. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
/** §UI · the card one officer's read is answered — the read action's own body (`readConfirmCardFor`), the bundle's view, for
 *  the draft as stored now (its revision; the stored audience on screen). */
async function cardOf(impl: Impl, w: World, userId: string, id: string): Promise<ConfirmCardData> {
  const c = await impl.ui.read(userId, { campaignId: id, draftRevision: rowOf(id)?.draftRevision ?? null, audience: null }, impl.ui.readDeps(impl));
  w.seen.push(c);
  return c;
}

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

  // ── §UI · U40b · THE CONFIRMATION ON SCREEN (ENGINE-SPEC §4.6) — before 4.15 and 4.17, so every card is swept too ──
  await claim(L.u1, async () => {
    const m = impl.sources.modal;
    const card = impl.sources.card;
    const el = dialogOf(card);
    const rearm = caseOf(card, "rearm");
    const others = ["confirmed", "keep", "close", "already", "recount"].map((c) => caseOf(card, c));
    const checks = {
      focusOnce: m.split(FOCUS_LINE).length - 1 === 1,
      oneDialog: card.split("<ConfirmModal").length - 1 === 1,
      noOwnDialog: !new RegExp("<Modal[^A-Za-z]").test(card) && !new RegExp('role="(alert)?dialog"').test(card),
      // ⭐ RE-ARMED, NEVER RE-KEYED: a remount draws nothing for its first commit (Modal mounts closed) — a blink.
      rearmed: el.includes(ARM_KEY) && !new RegExp("(^|[^A-Za-z])key=").test(el),
      // ⭐ POSITION, NOT PRESENCE: the attempt moves in the re-arm branch, and in no other branch of the router.
      bumpOnRearmOnly: card.split("setAttempt(").length - 1 === 1 && rearm.includes("setAttempt((a) => a + 1);")
        && others.every((b) => b.length > 0 && !b.includes("setAttempt(")),
      // The kit re-arms through the opening's own focusIn — the top dialog only, never a disabled target, its beat armed.
      kitRearms: m.includes("refocusKey={loading ? undefined : armKey}") && m.includes("if (open) openLayerRef.current?.focusIn();")
        && m.includes("openLayerRef.current = layer;"),
    };
    return [Object.values(checks).every(Boolean), json(checks)];
  });

  await claim(L.u2, async () => {
    const three = await draft(w, "ui_tier3", tagF("g-n3"));
    const seven = await draft(w, "ui_tier7", tagF("g-n7"));
    const m3 = await viewOf(impl, w, three, GROWTH);
    const r3 = await viewOf(impl, w, three, READER);
    const m7 = await viewOf(impl, w, seven, GROWTH);
    const r7 = await viewOf(impl, w, seven, READER);
    const g = impl.ui.gate;
    const typedFor = (gp: ConfirmGateProps | null, n: number): boolean =>
      gp !== null && gp.tier === "hard" && gp.typedWord === String(n) && gp.typedInputMode === "numeric";
    const listed = (gp: ConfirmGateProps | null): boolean => gp !== null && gp.tier === "medium" && !("typedWord" in gp) && !("typedInputMode" in gp);
    const tiers = {
      maskedThree: m3 !== null && m3.tier === "typed" && typedFor(g(m3), 3),
      readerThree: r3 !== null && r3.tier === "enumerate" && listed(g(r3)),
      seven: m7 !== null && r7 !== null && typedFor(g(m7), 7) && typedFor(g(r7), 7),
      nothing: g({ tier: null, count: null }) === null && g({ tier: "typed", count: null }) === null && g({ tier: null, count: 3 }) === null,
    };
    const card = impl.sources.card;
    const el = dialogOf(card);
    const both = `${card}${NL}${impl.sources.copy}`;
    const wired = {
      fromView: card.includes("const gate = view === null ? null : confirmGate(view);") && el.includes(GATE_SPREAD) && !el.includes("tier="),
      noThreshold: !both.includes("CONFIRM_ENUMERATE_MAX") && !both.includes("confirmTier(") && !new RegExp("[.]count[ ]*(<=|>=|<|>)").test(both),
    };
    return [Object.values(tiers).every(Boolean) && Object.values(wired).every(Boolean),
      `masked 3: ${showView(m3)} · reader 3: ${showView(r3)} · ${json(tiers)} · ${json(wired)}`];
  });

  await claim(L.u3, async () => {
    const m = impl.sources.modal;
    const at = m.indexOf("type ConfirmGate =");
    const typeText = at < 0 ? "" : m.slice(at, m.indexOf("export type ConfirmModalProps", at));
    const hardGate = impl.ui.gate({ tier: "typed", count: 5912 });
    const mediumGate = impl.ui.gate({ tier: "enumerate", count: 3 });
    const checks = {
      hardArm: typeText.includes('| { tier: "hard"; typedWord: string } & HardGateKeypad'),
      keypadKey: m.includes('type HardGateKeypad = { typedInputMode?: "numeric" };'),
      mediumArm: typeText.includes('| { tier?: "medium"; typedWord?: never; typedInputMode?: never };'),
      keypadLine: m.includes('inputMode={countGate ? "numeric" : undefined}')
        && m.includes('const countGate = isHard && (typedInputMode === "numeric" || isCountWord(gateWord));'),
      gate: hardGate !== null && hardGate.tier === "hard" && hardGate.typedInputMode === "numeric" && hardGate.typedWord === "5912"
        && mediumGate !== null && mediumGate.tier === "medium" && !("typedInputMode" in mediumGate),
      inputModeCallers: json(impl.sources.inputModeHolders) === json([COPY_REL, MODAL_REL].sort()),
      // The re-arm keys and the held Confirm: optional, and the kit's own focusIn does the focusing.
      armOptional: m.includes("armKey?: string | number;") && m.includes("refocusKey?: string | number;") && m.includes("confirmHeld?: boolean;"),
      armThroughFocusIn: m.includes("const refocusSeen = React.useRef(refocusKey);") && m.includes("refocusKey={loading ? undefined : armKey}"),
      armCallers: json(impl.sources.armKeyHolders) === json([CARD_REL, MODAL_REL].sort()),
      heldCallers: json(impl.sources.heldHolders) === json([CARD_REL, MODAL_REL].sort()),
    };
    return [Object.values(checks).every(Boolean),
      `${json(checks)} · typedInputMode in [${impl.sources.inputModeHolders.join(", ")}] · armKey/refocusKey in [${impl.sources.armKeyHolders.join(", ")}] · confirmHeld in [${impl.sources.heldHolders.join(", ")}]`];
  });

  await claim(L.u4, async () => {
    const a = impl.sources.actions;
    const body = actionBody(a, ACTION_SIG);
    const exported = exportedFunctions(a);
    const d = impl.sources.doors;
    const request = exportedBody(d, "export function confirmRequestOf(");
    const fields = [...request.matchAll(new RegExp('posted[(]formData, "([A-Za-z]+)"[)]', "g"))].map((x) => x[1]).sort();
    const card = impl.sources.card;
    const checks = {
      useServer: a.trimStart().startsWith('"use server";'),
      exactlyOne: body !== "" && json(exported) === json(["confirmCampaignAction"]) && otherExports(a) === 0,
      guardFirst: body.startsWith(GUARD_LINE) && body.slice(GUARD_LINE.length).trimStart().startsWith("if (!g.ok) return"),
      handsOver: body.includes("const result = await runConfirmFor(g.userId, confirmRequestOf(formData));"),
      domain: domainForPath("/admin/campaigns") === "growth",
      fields: json(fields) === json(["campaignId", "typed", "watermark"]),
      storedViewer: DOORS.CONFIRM_RUN_DEPS.viewer === SVC.confirmViewerFor && DOORS.CONFIRM_RUN_DEPS.confirm === SVC.confirmCampaign
        && d.includes("result = await deps.confirm({ campaignId: req.campaignId, typed: req.typed, watermark: req.watermark, actorId }, viewer);"),
      imported: card.includes('import { confirmCampaignAction } from "./confirm-actions";') && card.includes("confirmCampaignAction(fd)"),
    };
    return [Object.values(checks).every(Boolean), `${json(checks)} · exported [${exported.join(", ")}] · fields [${fields.join(", ")}]`];
  });

  await claim(L.u4b, async () => {
    const a = impl.sources.viewActions;
    const body = actionBody(a, VIEW_SIG);
    const exported = exportedFunctions(a);
    const card = impl.sources.card;
    // The request as the read keeps it: whatever else was posted — a count, a typed word, a key outside the vocabulary.
    const posted = DOORS.confirmReadRequestOf({
      campaignId: " cmp_ui_read ", draftRevision: 3, count: 7, typed: "7", watermark: "aw1.x",
      audience: { tag: "vip", count: "9", bogus: "x" },
    });
    const kept = json(posted) === json({ campaignId: "cmp_ui_read", draftRevision: 3, audience: { tag: "vip" } });
    const revisions = [-1, 1.5, "3", null, undefined].every((r) => DOORS.confirmReadRequestOf({ campaignId: "c", draftRevision: r }).draftRevision === null);
    const noAudience = DOORS.confirmReadRequestOf({ campaignId: "c", draftRevision: 0, audience: { bogus: "x" } }).audience === null;
    // The gate, then the budget: the line after the gate's own refusal is the budget's, before anything is read.
    const afterGuard = body.slice(VIEW_GUARD_LINE.length).trimStart();
    const secondStatement = afterGuard.slice(afterGuard.indexOf(NL) + 1).trimStart();
    const rule = (RATE_RULES as Record<string, { capacity: number; refillPerMin: number } | undefined>)["marketing.campaignConfirmRead"];
    const spent = COPY.composeConfirmReadRateLimited(24.2);
    const checks = {
      useServer: a.trimStart().startsWith('"use server";'),
      exactlyOne: body !== "" && json(exported) === json(["campaignConfirmViewAction"]) && otherExports(a) === 0,
      guardFirst: body.startsWith(VIEW_GUARD_LINE) && afterGuard.startsWith("if (!g.ok) return"),
      ownAction: a.includes('"marketing.campaign.confirm_view"') && !a.includes('"marketing.campaign.confirm",'),
      budgetSecond: secondStatement.startsWith(READ_BUDGET_LINE)
        && body.includes('if (!rate.allowed) return { ok: false, reason: "rate_limited", error: composeConfirmReadRateLimited(rate.retryAfterSec) };')
        && body.indexOf(READ_BUDGET_LINE) < body.indexOf("readConfirmCardFor("),
      realRule: rule !== undefined && rule.capacity >= 1 && rule.refillPerMin > 0,
      saysSpent: spent.includes("25 s") && spent.includes("nothing was counted"),
      // The read's own refusals are printed ALONE (the third pass); a read lost in transit is counted again.
      printedAlone: impl.ui.retry({ ok: false, reason: "rate_limited", error: spent }) === null
        && impl.ui.retry({ ok: false, reason: "role", error: COPY.COMPOSE_CONFIRM_ROLE_REFUSAL }) === null
        && impl.ui.retry({ ok: false, error: "Server error — nothing may have applied. Refresh before retrying." }) === "count"
        && card.includes("const retry = pageClear ? confirmAnswerRetry(answer) : null;"),
      handsOver: body.includes("return { ok: true, card: await readConfirmCardFor(g.userId, confirmReadRequestOf(request)) };"),
      kept, revisions, noAudience,
      readDoors: DOORS.CONFIRM_READ_DEPS.viewer === SVC.confirmViewerFor && DOORS.CONFIRM_READ_DEPS.view === SVC.campaignConfirmView
        && DOORS.CONFIRM_READ_DEPS.money === SVC.confirmMoneyLine && DOORS.CONFIRM_READ_DEPS.refusal === AUD.campaignAudienceRefusal,
      imported: card.includes('import { campaignConfirmViewAction } from "./confirm-view-actions";') && card.includes("campaignConfirmViewAction(request)"),
    };
    return [Object.values(checks).every(Boolean), `${json(checks)} · exported [${exported.join(", ")}] · kept ${json(posted)}`];
  });

  await claim(L.u5, async () => {
    const V = impl.ui.viewer;
    const is = (v: ConfirmViewer, reads: boolean, money: boolean): boolean => v.reads === reads && v.money === money;
    const roleFails = { ...SVC.CONFIRM_VIEWER_DEPS, role: async (): Promise<null> => { throw new Error("fixture: the role read failed"); } };
    const cellFails = { ...SVC.CONFIRM_VIEWER_DEPS, reads: async (): Promise<boolean> => { throw new Error("fixture: the cell read failed"); } };
    const got = {
      growth: is(await V(UI_GROWTH), false, false),
      finance: is(await V(UI_FINANCE), false, true),
      admin: is(await V(UI_ADMIN), true, true),
      unknown: is(await V("usr_gates_ui_nobody"), false, false),
      noOfficer: is(await V(null), false, false),
      blank: is(await V("   "), false, false),
      roleThrows: is(await V(UI_ADMIN, roleFails), false, false),
      cellThrows: is(await V(UI_ADMIN, cellFails), false, true),
    };
    return [Object.values(got).every(Boolean), json(got)];
  });

  await claim(L.u6, async () => {
    const id = await draft(w, "ui_money", tagF("g-n7"));
    const growth = await cardOf(impl, w, UI_GROWTH, id);
    const finance = await cardOf(impl, w, UI_FINANCE, id);
    const admin = await cardOf(impl, w, UI_ADMIN, id);
    const ge = growth.view?.estimate ?? null;
    const said = ge === null ? "" : COPY.composeConfirmSegments(ge.segments, ge.perRecipient);
    const growthText = `${json(growth)} ${said}`;
    const moneyFree = growth.read === "view" && growth.money === null && ge !== null && ge.segments === 7 && !("money" in ge)
      && said.startsWith("Up to 7") && !growthText.includes("TZS");
    const readers = [finance, admin].every((c) =>
      c.read === "view" && typeof c.money === "string" && c.money.split(NB).join(" ").includes("Up to TZS 42"));
    const card = impl.sources.card;
    const line = card.includes("{money !== null && <p") && !new RegExp("TZS|formatTzs|costTzs|limitTzs|priceTzs").test(card);
    return [moneyFree && readers && line,
      `GROWTH money ${json(growth.money)}, TZS in its render ${growthText.includes("TZS")} · readers' line ${json(finance.money)} · the card prints the line alone ${line}`];
  });

  await claim(L.u7, async () => {
    const id = await draft(w, "ui_list", tagF("g-n3"));
    const masked = await cardOf(impl, w, UI_GROWTH, id);
    const reader = await cardOf(impl, w, UI_ADMIN, id);
    const mv = masked.view;
    const rv = reader.view;
    const countAlone = mv !== null && mv.tier === "typed" && mv.count === 3 && mv.sample.length === 0 && mv.split !== null
      && mv.split.kind === "floor" && FEN.verifyFence(mv.watermark)?.membersKey === null && !json(masked).includes(DOT);
    const readerList = rv !== null && rv.tier === "enumerate" && rv.sample.length === 3 && rv.sample.every((s) => s.masked.includes(DOT));
    const card = impl.sources.card;
    const rowsAt = card.indexOf("view.sample.map((row, i) =>");
    const onlyRows = rowsAt >= 0 && card.split("data-confirm-row").length - 1 === 1 && card.indexOf("data-confirm-row") > rowsAt
      && card.split(".sample.map(").length - 1 === 1;
    return [countAlone && readerList && onlyRows,
      `masked ${masked.read} ${mv?.tier ?? "-"} list ${mv?.sample.length ?? "-"} key ${FEN.verifyFence(mv?.watermark ?? null)?.membersKey ?? "none"} · reader ${rv?.tier ?? "-"} list ${rv?.sample.length ?? "-"} · only the view's rows ${onlyRows}`];
  });

  await claim(L.u8, async () => {
    const B = impl.ui.blocked;
    type View = { blocked: string | null; message: string | null; tier: ConfirmTier | null; count: number | null; watermark: string | null };
    const view: View = { blocked: null, message: null, tier: "typed", count: 7, watermark: "aw1.fixture.seal" };
    const seen = (v: Partial<View>): ConfirmAnswerFacts => ({ ok: true, card: { status: "DRAFT", read: "view", view: { ...view, ...v } } });
    const said = (read: "closed" | "stale" | "unsaved" | "busy" | "gone" | "error", status: StoredSmsCampaign["status"] | null = "DRAFT"): ConfirmAnswerFacts =>
      ({ ok: true, card: { status, read, view: null } });
    const base: ConfirmTriggerFacts = {
      mayAct: true,
      actReason: null,
      form: {
        savedId: "cmp_ui", savedRevision: 3, pageDraftId: "cmp_ui", pageRevision: 3, status: "DRAFT",
        dirty: false, audienceUnsaved: false, audienceProblem: null, saving: false, swBlank: false,
      },
      answer: seen({}),
    };
    const form = (p: Partial<ConfirmTriggerFacts["form"]>): ConfirmTriggerFacts => ({ ...base, form: { ...base.form, ...p } });
    const answered = (answer: ConfirmAnswerFacts | null): ConfirmTriggerFacts => ({ ...base, answer });
    const none = { money: false, costTzs: null, limitTzs: null };
    const OVER = SVC.CONFIRM_SERVICE_COPY.over_limit(none);
    const SOURCE = SVC.CONFIRM_SERVICE_COPY.needs_source_line(none);
    const NO_BODY = SVC.CONFIRM_SERVICE_COPY.no_body(none);
    const NOT_FOUND = PURE.CONFIRM_REFUSAL_COPY.not_found({ fresh: null, shown: null });
    const READ_ONLY = "Read-only: the AUDITOR role can view SMS campaigns but not change it.";
    const PROBLEM = "This narrows the contact book only — a player account has no such field.";
    const T = impl.ui.sentence;
    const closed = Object.entries(COPY.COMPOSE_CONFIRM_CLOSED) as Array<[Exclude<StoredSmsCampaign["status"], "DRAFT">, string]>;
    const cases: Array<[string, ConfirmTriggerFacts, string | null]> = [
      ["ready", base, null],
      ["not asked yet", answered(null), null],
      ["unsaved text", form({ dirty: true }), COPY.COMPOSE_CONFIRM_SAVE_FIRST],
      ["unsaved audience", form({ audienceUnsaved: true }), COPY.COMPOSE_CONFIRM_SAVE_FIRST],
      ["saving", form({ saving: true }), COPY.COMPOSE_CONFIRM_SAVE_FIRST],
      ["nothing saved", { ...form({ savedId: null, savedRevision: null, pageDraftId: null, pageRevision: null, status: null }), answer: null }, COPY.COMPOSE_CONFIRM_SAVE_FIRST],
      ["the audience's own problem", form({ audienceProblem: PROBLEM, audienceUnsaved: true }), PROBLEM],
      ["saved elsewhere since", form({ pageRevision: 4 }), COPY.COMPOSE_CONFIRM_STALE],
      ["this tab's save read back", form({ savedRevision: 4 }), COPY.COMPOSE_TEST_UPDATING],
      ["another draft on screen", form({ pageDraftId: "cmp_other" }), COPY.COMPOSE_TEST_UPDATING],
      ["blank Swahili", form({ swBlank: true }), COPY.COMPOSE_CONFIRM_WRITE_SW],
      ["view-only role", { ...base, mayAct: false, actReason: READ_ONLY }, READ_ONLY],
      ...closed.map(([status, words]): [string, ConfirmTriggerFacts, string | null] => [`status ${status}`, form({ status }), words]),
      ["nobody", answered(seen({ blocked: "audience_empty", message: PURE.CONFIRM_REFUSAL_COPY.audience_empty({ fresh: 0, shown: null }) })), COPY.COMPOSE_CONFIRM_NOBODY],
      ["no message", answered(seen({ blocked: "no_body", message: NO_BODY })), T(NO_BODY)],
      ["over the limit", answered(seen({ blocked: "over_limit", message: OVER })), T(OVER)],
      ["no source line", answered(seen({ blocked: "needs_source_line", message: SOURCE })), T(SOURCE)],
      ["no longer a draft", answered(seen({ blocked: "not_draft", message: "x" })), COPY.COMPOSE_CONFIRM_ALREADY],
      ["a read that failed", answered(said("error")), COPY.COMPOSE_CONFIRM_UNCOUNTED],
      ["a read lost in transit", answered({ ok: false, error: "Server error — nothing may have applied. Refresh before retrying." }), COPY.COMPOSE_CONFIRM_UNCOUNTED],
      ["the role refused", answered({ ok: false, reason: "role", error: COPY.COMPOSE_CONFIRM_ROLE_REFUSAL }), COPY.COMPOSE_CONFIRM_ROLE_REFUSAL],
      ["the server says stale", answered(said("stale")), COPY.COMPOSE_CONFIRM_STALE],
      ["the server says unsaved", answered(said("unsaved")), COPY.COMPOSE_CONFIRM_SAVE_FIRST],
      ["the server says closed", answered(said("closed", "RUNNING")), COPY.COMPOSE_CONFIRM_CLOSED.RUNNING],
      ["gone", answered(said("gone", null)), T(NOT_FOUND)],
      ["no slot in time", answered(said("busy")), COPY.COMPOSE_CONFIRM_BUSY],
      ["the read budget spent", answered({ ok: false, reason: "rate_limited", error: "the budget's own sentence" }), "the budget's own sentence"],
    ];
    const wrong = cases.filter(([, facts, want]) => B(facts) !== want).map(([name]) => name);
    // ⛔ "Nothing was …" is what a refused CONFIRMATION did not do — never said beside a trigger that only read.
    const sentences = [
      ...Object.values(SVC.CONFIRM_SERVICE_COPY).flatMap((fn) => [fn({ money: true, costTzs: 120, limitTzs: 100 }), fn(none)]),
      NOT_FOUND,
    ];
    const tailless = sentences.every((s) => { const t = T(s); return t.length > 0 && !t.includes("Nothing was") && s.startsWith(t); });
    const src = impl.sources.card;
    const client = impl.sources.client;
    const wired = src.includes("const form = useComposerSaved();") && src.includes("const reason = confirmTriggerBlocked({ ...facts, answer });")
      && src.includes("disabled={reason !== null || confirming}") && src.includes("title={reason ?? undefined}") && src.includes("data-confirm-blocked>{reason}")
      && client.includes("dirty: c.dirty,") && client.includes("audienceUnsaved: c.view.audience.unsaved,") && client.includes("saving: c.saving,")
      && client.includes("savedRevision: c.saved?.draftRevision ?? null,") && client.includes("pageRevision: c.view.draft?.draftRevision ?? null,")
      && client.includes('audienceProblem: c.problemAt("audience") ?? c.view.audience.problem ?? null,')
      && client.includes("status: c.view.draft?.status ?? null,");
    // K8b · ONE live region, always there — the line's box — never the lines it swaps in already holding their words.
    const liveRegion = src.includes('<div className={CONFIRM_LINE_BOX} role="status">') && src.split('role="status"').length - 1 === 1;
    return [wrong.length === 0 && tailless && wired && liveRegion, `wrong [${wrong.join(", ")}] · tailless ${tailless} · wired ${wired} · one live region ${liveRegion}`];
  });

  await claim(L.u9, async () => {
    const reached = importWalk([ACTIONS_REL, VIEW_ACTIONS_REL], impl.sources);
    const forbidden = [
      "src/lib/server/marketing/dispatch.ts", "src/lib/server/marketing/optout-service.ts", "src/lib/server/marketing/enqueue.ts",
      LOADER_REL, `${NEW_DIR}actions.ts`,
    ];
    const hit = forbidden.filter((f) => reached.has(f));
    return [reached.size > 20 && reached.has(SVC_REL) && reached.has(DOORS_REL) && hit.length === 0,
      `${reached.size} files reached · forbidden reached [${hit.join(", ")}]`];
  });

  await claim(L.u10, async () => {
    const A = impl.ui.audienceView;
    const three = tagF("g-n3");
    const id = await draft(w, "ui_screen", three);
    const row = rowOf(id) as StoredSmsCampaign;
    const own = AUD.campaignAudienceParams(three) ?? {};
    const other = AUD.campaignAudienceParams(tagF("g-n7")) ?? {};
    const client = impl.sources.client;
    const checks = {
      own: A({ draft: id, ...own }, row, true).unsaved === false,
      moved: A({ draft: id, ...other }, row, true).unsaved === true,
      movedMasked: A({ draft: id, ...other }, row, false).unsaved === true,
      bare: A({ draft: id }, row, true).unsaved === false,
      fresh: A({ ...own }, null, true).unsaved === false,
      save: client.includes("!dirty && !view.sourceLineStale && !view.audience.unsaved"),
      hook: client.includes("audienceUnsaved: c.view.audience.unsaved,"),
    };
    return [Object.values(checks).every(Boolean), json(checks)];
  });

  await claim(L.u11, async () => {
    // ① The page: the card bare — nothing read for it, no boundary of its own, no confirmation module named.
    const page = impl.sources.page;
    const card = impl.sources.card;
    const bare = {
      card: page.includes("<AdminCard title={COMPOSE_CONFIRM_TITLE}><CampaignConfirm /></AdminCard>"),
      noDoors: !new RegExp("confirm-doors|confirm-view-actions|campaign-confirm-service|readConfirmCard|campaignConfirmView").test(page),
      oneSuspense: page.split("<Suspense").length - 1 === 1,
    };
    // ② The card: it asks in `ask` and in a refusal's recount only; `ask` is pressed, never called — no effect asks.
    const effects = [...card.matchAll(new RegExp("useEffect[(][(][)] => [{]([^]*?)[}], [[]", "g"))].map((x) => x[1]);
    const presses = {
      reads: card.split("campaignConfirmViewAction(request)").length - 1 === 2,
      pressed: card.split("onClick={ask}").length - 1 === 2 && !new RegExp("(^|[^A-Za-z_$.])ask[(]").test(card),
      noEffectAsks: effects.length >= 1 && effects.every((e) => !e.includes("campaignConfirmViewAction") && !new RegExp("(^|[^A-Za-z_$])ask([^A-Za-z_$]|$)").test(e)),
    };
    // ③ The read: NOTHING counted where it may not be — its view door spied on.
    let asked = 0;
    const deps = impl.ui.readDeps(impl);
    const spied: ConfirmReadDeps = { ...deps, view: (campaignId, viewer) => { asked++; return deps.view(campaignId, viewer); } };
    const read = (campaignId: string, draftRevision: number | null, audience: Record<string, string> | null) =>
      impl.ui.read(UI_ADMIN, { campaignId, draftRevision, audience }, spied);
    const three = tagF("g-n3");
    const id = await draft(w, "ui_demand", three);
    const closedId = await draft(w, "ui_demand_closed", three);
    const own = AUD.campaignAudienceParams(three) ?? {};
    const other = AUD.campaignAudienceParams(tagF("g-n7")) ?? {};
    const answers: string[] = [];
    answers.push(`stale:${(await read(id, 9, null)).read}`);
    answers.push(`unsaved:${(await read(id, 0, other)).read}`);
    answers.push(`unreadable:${(await read(id, 0, { pop: "neither" })).read}`);
    answers.push(`gone:${(await read("cmp_gates_ui_none", 0, null)).read}`);
    for (const status of ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED", "DONE", "CANCELLED"] as const) {
      const row = mem().smsCampaigns.get(closedId);
      if (row) row.status = status;
      answers.push(`${status}:${(await read(closedId, 0, null)).read}`);
    }
    const skipped = asked;
    const shown = await read(id, 0, own);
    const counted = asked - skipped;
    const want = ["stale:stale", "unsaved:unsaved", "unreadable:unsaved", "gone:gone", "CONFIRMED:closed", "PREPARING:closed", "RUNNING:closed",
      "PAUSED:closed", "DONE:closed", "CANCELLED:closed"];
    const reads = json(answers) === json(want) && skipped === 0 && counted === 1 && shown.read === "view";
    return [Object.values(bare).every(Boolean) && Object.values(presses).every(Boolean) && reads,
      `${json(bare)} · ${json(presses)} · answers ${answers.join(" ")} · counted ${skipped} where it may not, ${counted} for the draft shown (${shown.read})`];
  });

  await claim(L.u12, async () => {
    // Both per-process slots held by two other counts, then a fence: its count must wait for a slot, not walk beside them.
    const before = SPLIT.audienceSplitSlots();
    let releaseA = (): void => {};
    let releaseB = (): void => {};
    const heldA = new Promise<number>((resolve) => { releaseA = () => resolve(0); });
    const heldB = new Promise<number>((resolve) => { releaseB = () => resolve(0); });
    const a = SPLIT.audienceWalkCount(tagF("g-n1"), () => heldA);
    const b = SPLIT.audienceWalkCount(tagF("g-n2"), () => heldB);
    await tick();
    let counted = 0;
    const fenceDeps: FenceDeps = { ...impl.fenceDeps, count: async (f) => { counted++; return AUD.campaignAudienceCount(f); } };
    const fence = FEN.audienceFence(rowLike("cmp_ui_slots", tagF("g-n3")), fenceDeps);
    await tick();
    const full = SPLIT.audienceSplitSlots();
    const whileFull = { counted, running: full.running, waiting: full.waiting };
    releaseA();
    const f = await fence;
    releaseB();
    await Promise.all([a, b]);
    const after = SPLIT.audienceSplitSlots();
    const waits = before.running === 0 && before.waiting === 0 && whileFull.counted === 0 && whileFull.running === 2 && whileFull.waiting === 1
      && counted === 1 && f.claim.count === 3 && after.running === 0 && after.waiting === 0;
    const src = impl.sources.fence;
    const body = src.slice(src.indexOf("export async function audienceFence("));
    const wired = body.includes("const count = await audienceWalkCount(filter, deps.count, { join: slot.join, waitMs: slot.waitMs, waited: (ms) => { waitedMs = ms; } });")
      && body.includes("const slot = deps.slot ?? FENCE_SLOT;") && body.split("deps.count(").length - 1 === 0
      && src.includes('import { audienceWalkCount } from "@/lib/server/marketing/audience-split";');
    return [waits && wired, `${json({ before, whileFull, counted, count: f.claim.count, after })} · wired ${wired}`];
  });

  await claim(L.u13, async () => {
    const O = impl.ui.outcome;
    const A = impl.ui.recount;
    const refusal = (reason: string, error = `the service's sentence for ${reason}`): ConfirmAnswerLike => ({ ok: false, reason, error });
    const view = { blocked: null, message: null, tier: "typed" as ConfirmTier, count: 7, watermark: "aw1.fixture.seal" };
    const ready: ConfirmAnswerFacts = { ok: true, card: { status: "DRAFT", read: "view", view } };
    const blocked: ConfirmAnswerFacts = { ok: true, card: { status: "DRAFT", read: "view", view: { ...view, blocked: "over_limit", message: "x" } } };
    const unread: ConfirmAnswerFacts = { ok: true, card: { status: "DRAFT", read: "error", view: null } };
    const stale: ConfirmAnswerFacts = { ok: true, card: { status: "DRAFT", read: "stale", view: null } };
    const lost: ConfirmAnswerFacts = { ok: false, error: "Server error — nothing may have applied. Refresh before retrying." };
    const confirmed = O({ ok: true, count: 1604, recorded: true });
    const unrecorded = O({ ok: true, count: 1604, recorded: false });
    const failed = O(refusal("failed", COPY.COMPOSE_CONFIRM_FAILED));
    const unfinished = O(refusal("unfinished", COPY.COMPOSE_CONFIRM_UNFINISHED));
    const transit = O({ ok: false, error: "Server error — nothing may have applied. Refresh before retrying." });
    const role = O(refusal("role", COPY.COMPOSE_CONFIRM_ROLE_REFUSAL));
    const notDraft = O(refusal("not_draft"));
    const notFound = O(refusal("not_found"));
    const others = ["audience_moved", "typed_mismatch", "typed_required", "stale_view", "draft_changed", "audience_empty", "needs_source_line",
      "over_limit", "price_unknown", "unsaved", "no_body", "settings_unreadable", "source_unreadable", "audience_unreadable", "audience_refused"]
      .map((reason) => [reason, O(refusal(reason))] as const);
    const rearm = A(ready, "the notice");
    const routes = {
      confirmed: confirmed.kind === "confirmed" && confirmed.toast.variant === "success" && confirmed.toast.title === COPY.composeConfirmedToast(1604)
        && confirmed.toast.title.endsWith("Nothing has been sent.") && confirmed.toast.durationMs === undefined,
      unrecorded: unrecorded.kind === "confirmed" && unrecorded.toast.variant === "danger" && unrecorded.toast.description === COPY.COMPOSE_CONFIRM_UNRECORDED
        && unrecorded.toast.durationMs === 0,
      failedKeeps: failed.kind === "keep" && failed.toast.title === COPY.COMPOSE_CONFIRM_FAILED && failed.toast.variant === "danger",
      unfinishedKeeps: [unfinished, transit].every((o) => o.kind === "keep" && o.toast.title === COPY.COMPOSE_CONFIRM_UNFINISHED
        && o.toast.durationMs === 0 && !o.toast.title.toLowerCase().includes("nothing was confirmed")),
      roleCloses: role.kind === "close" && role.toast.description === COPY.COMPOSE_CONFIRM_ROLE_REFUSAL,
      notDraft: notDraft.kind === "already" && !notDraft.gone && notDraft.description === "the service's sentence for not_draft"
        && COPY.composeNotDraftTitle("CONFIRMED") === COPY.COMPOSE_CONFIRM_ALREADY_TITLE && COPY.composeNotDraftTitle("DRAFT") === COPY.COMPOSE_CONFIRM_REFUSED
        && COPY.composeNotDraftTitle(null) === COPY.COMPOSE_CONFIRM_REFUSED,
      notFound: notFound.kind === "already" && notFound.gone,
      recount: others.every(([reason, o]) => o.kind === "recount" && o.notice === `the service's sentence for ${reason}`),
      rearm: rearm.kind === "rearm" && rearm.notice === "the notice",
      closeWhenItCannotOpen: [blocked, unread, stale, lost, null].every((x) => {
        const o = A(x, "the notice");
        return o.kind === "close" && o.toast.title === COPY.COMPOSE_CONFIRM_REFUSED && o.toast.description === "the notice";
      }),
    };
    const card = impl.sources.card;
    const wired = card.includes("const o = confirmOutcome(r);") && card.includes('if (o.kind !== "recount") {')
      && card.includes("settle(afterRecount(again, refused));") && card.includes("setNotDraft(o.description);")
      && card.includes('toast({ title: composeNotDraftTitle(form.status), description: notDraft, variant: "warning" });');
    return [Object.values(routes).every(Boolean) && wired, `${json(routes)} · wired ${wired}`];
  });

  await claim(L.u14, async () => {
    const run = impl.ui.run;
    const id = await draft(w, "ui_run", tagF("g-n7"));
    const stored = rowOf(id) as StoredSmsCampaign;
    const as = (status: StoredSmsCampaign["status"]): StoredSmsCampaign => ({ ...stored, status });
    const req = { campaignId: id, typed: "7", watermark: "aw1.fixture.seal" };
    const viewer = async (): Promise<ConfirmViewer> => ({ reads: false, money: false });
    const throws: ConfirmRunDeps["confirm"] = async () => { throw new Error("fixture: the confirmation threw"); };
    const after = (find: ConfirmRunDeps["find"]): ConfirmRunDeps => ({ viewer, confirm: throws, find });
    const draftBack = await run("off_ui", req, after(async () => as("DRAFT")));
    const goneBack = await run("off_ui", req, after(async () => null));
    const confirmedBack = await run("off_ui", req, after(async () => as("CONFIRMED")));
    const unreadBack = await run("off_ui", req, after(async () => { throw new Error("fixture: the read-back failed"); }));
    const refusedWith: ConfirmCampaignResult = { ok: false, reason: "audience_moved", freshCount: 8, message: "the service's moved sentence" };
    let handed: { actor: string; viewer: ConfirmViewer } | null = null;
    const passes = await run("off_ui_passes", req, {
      viewer: async () => ({ reads: true, money: false }),
      confirm: async (input, v) => { handed = { actor: input.actorId, viewer: v }; return refusedWith; },
      find: async () => as("DRAFT"),
    });
    const confirmedRun = await run("off_ui", req, { viewer, confirm: async () => ({ ok: true, count: 7, tier: "typed", recorded: false }), find: async () => as("DRAFT") });
    const said = {
      failedWhenDraft: !draftBack.ok && draftBack.reason === "failed" && draftBack.error === COPY.COMPOSE_CONFIRM_FAILED,
      failedWhenGone: !goneBack.ok && goneBack.reason === "failed",
      unfinishedWhenConfirmed: !confirmedBack.ok && confirmedBack.reason === "unfinished" && confirmedBack.error === COPY.COMPOSE_CONFIRM_UNFINISHED,
      unfinishedWhenUnread: !unreadBack.ok && unreadBack.reason === "unfinished",
      refusalPasses: !passes.ok && passes.reason === "audience_moved" && passes.error === "the service's moved sentence" && passes.freshCount === 8,
      handed: json(handed) === json({ actor: "off_ui_passes", viewer: { reads: true, money: false } }),
      confirmationPasses: confirmedRun.ok && confirmedRun.count === 7 && confirmedRun.recorded === false,
    };
    return [Object.values(said).every(Boolean), json(said)];
  });

  await claim(L.u15, async () => {
    const O = impl.ui.opens;
    const view = { blocked: null, message: null, tier: "typed" as ConfirmTier, count: 7, watermark: "aw1.fixture.seal" };
    const ready: ConfirmAnswerFacts = { ok: true, card: { status: "DRAFT", read: "view", view } };
    const blocked: ConfirmAnswerFacts = { ok: true, card: { status: "DRAFT", read: "view", view: { ...view, blocked: "over_limit", message: "x" } } };
    const ASKED = "cmp_ui:3:null";
    const at = (answer: ConfirmAnswerFacts | null, onScreen: string, pageClear: boolean): boolean => O({ answer, askedFor: ASKED, onScreen, pageClear });
    const decides = {
      opens: at(ready, ASKED, true),
      typedWhileItCounted: !at(ready, ASKED, false),
      anotherAudience: !at(ready, 'cmp_ui:3:{"tag":"vip"}', true),
      savedMeanwhile: !at(ready, "cmp_ui:4:null", true),
      blockedAnswer: !at(blocked, ASKED, true),
      noAnswer: !at(null, ASKED, true),
    };
    const card = impl.sources.card;
    const landing = "if (confirmOpensOn({ answer: r, askedFor: key, onScreen: now.key, pageClear: now.clear })) {";
    const wired = {
      asksWhenItLands: card.includes(landing) && card.includes("const now = nowRef.current;")
        && card.includes("nowRef.current = { key: formKey, clear: pageClear };"),
      opensInOnePlace: card.split("setOpen(true)").length - 1 === 1 && card.indexOf("setOpen(true)") > card.indexOf(landing),
      shownForItsForm: card.includes("const dialogOpen = open && openedFor === formKey && live !== null;") && dialogOf(card).includes("open={dialogOpen}"),
      dropped: card.includes("if (open && live === null && !confirming) setOpen(false);"),
    };
    return [Object.values(decides).every(Boolean) && Object.values(wired).every(Boolean), `${json(decides)} · ${json(wired)}`];
  });

  await claim(L.u16, async () => {
    // Six people, typed; a view at 6. Then a count of the SAME audience still in flight from before a contact was added —
    // another officer's, another draft's: its answer will be the old 6, whenever it lands.
    const { tag } = await freshTag(w, "own", 6);
    const f = tagF(tag);
    const id = await draft(w, "ui_own", f);
    const at6 = await viewOf(impl, w, id, READER);
    const flights = (globalThis as unknown as { __50PICK_AUDIENCE_COUNTS?: Map<string, Promise<number>> }).__50PICK_AUDIENCE_COUNTS;
    if (flights === undefined) throw new Error("fixture: the split door's shared counts are not loaded");
    const key = AUD.contactAudienceKey(f);
    let landOld = (): void => {};
    const old = new Promise<number>((resolve) => { landOld = () => resolve(6); });
    flights.set(key, old);
    let result: ConfirmCampaignResult;
    try {
      await addTo(tag, w, "own");
      const confirming = confirmOf(impl, w, id, "6", at6?.watermark ?? null, READER);
      await tick();
      landOld();
      result = await confirming;
    } finally {
      if (flights.get(key) === old) flights.delete(key);
    }
    const row = rowOf(id);
    const after = await viewOf(impl, w, id, READER);
    const own = at6 !== null && at6.count === 6 && at6.tier === "typed" && !result.ok && result.reason === "audience_moved" && result.freshCount === 7
      && row?.status === "DRAFT" && row.audienceCount === null && after?.count === 7;
    // The count line itself is §UI 12's to hold; this holds the shipped slot it is handed.
    const shipped = impl.shipped.fence.slot === FEN.FENCE_SLOT && FEN.FENCE_SLOT.join === false;
    const wired = impl.sources.fence.includes("export const FENCE_SLOT: Readonly<FenceSlot> = Object.freeze({ join: false, waitMs: CONFIRM_SLOT_WAIT_MS });");
    return [own && shipped && wired, `view ${showView(at6)} · confirmation ${show(result)} · row ${row?.status} · next view ${showView(after)} · shipped ${shipped} · wired ${wired}`];
  });

  await claim(L.u17, async () => {
    // The bound under test is the fence's own, 250 times shorter (60 ms for the shipped 15 s) — an unbounded one stays one.
    const given = impl.fenceDeps.slot ?? FEN.FENCE_SLOT;
    const bound = given.waitMs / 250;
    const scaled: FenceDeps = { ...impl.fenceDeps, slot: { join: given.join, waitMs: bound } };
    const scaledFence = (c: Parameters<ConfirmDeps["fence"]>[0]): Promise<AudienceFence> => FEN.audienceFence(c, scaled);
    const id = await draft(w, "ui_busy", tagF("g-n7"));
    // ① Both per-process slots held by two other counts.
    let releaseA = (): void => {};
    let releaseB = (): void => {};
    const heldA = new Promise<number>((resolve) => { releaseA = () => resolve(0); });
    const heldB = new Promise<number>((resolve) => { releaseB = () => resolve(0); });
    const a = SPLIT.audienceWalkCount(tagF("g-n1"), () => heldA);
    const b = SPLIT.audienceWalkCount(tagF("g-n2"), () => heldB);
    await tick();
    const t0 = Date.now();
    type Timed<T> = { ok: true; v: T; at: number } | { ok: false; e: unknown; at: number };
    const timed = <T,>(p: Promise<T>): Promise<Timed<T>> =>
      p.then((v): Timed<T> => ({ ok: true, v, at: Date.now() - t0 }), (e: unknown): Timed<T> => ({ ok: false, e, at: Date.now() - t0 }));
    let asked = 0;
    const fenceP = timed(FEN.audienceFence(rowLike("cmp_ui_busy_fence", tagF("g-n3")), { ...scaled, count: async (fl) => { asked++; return AUD.campaignAudienceCount(fl); } }));
    const readDeps: ConfirmReadDeps = { ...impl.ui.readDeps(impl), view: (campaignId, viewer) => impl.view(campaignId, viewer, depsOf(impl, { fence: scaledFence })) };
    const readP = timed(impl.ui.read(UI_ADMIN, { campaignId: id, draftRevision: 0, audience: null }, readDeps));
    const runP = timed(impl.ui.run("off_ui_busy", { campaignId: id, typed: "7", watermark: null }, {
      viewer: async () => READER,
      confirm: (input, viewer) => impl.confirm(input, viewer, depsOf(impl, { fence: scaledFence })),
      find: async (x: string) => db.smsCampaign.find(x),
    }));
    const splitP = timed(SPLIT.audienceSplit(tagF("g-n3"), { viewerReads: true, waitMs: bound }));
    const inTime = await Promise.race([
      Promise.all([fenceP, readP, runP, splitP]).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
    ]);
    releaseA();
    releaseB();
    const [fe, rd, rn, sp] = await Promise.all([fenceP, readP, runP, splitP]);
    await Promise.all([a, b]);
    const slots = SPLIT.audienceSplitSlots();
    // ② A slot free: the same bound counts.
    const free = await FEN.audienceFence(rowLike("cmp_ui_busy_free", tagF("g-n3")), scaled);
    const quick = (x: { at: number }): boolean => x.at < 1500;
    const busy = {
      inTime,
      fence: !fe.ok && SPLIT.isAudienceSlotBusy(fe.e) && fe.at >= bound * 0.8 && quick(fe) && asked === 0,
      read: rd.ok && rd.v.read === "busy" && rd.v.view === null && quick(rd),
      run: rn.ok && !rn.v.ok && rn.v.reason === "busy" && rn.v.error === COPY.COMPOSE_CONFIRM_BUSY_CONFIRM && quick(rn)
        && rowOf(id)?.status === "DRAFT" && (await auditRows(CONFIRMED_ROW, id)).length === 0,
      split: !sp.ok && SPLIT.isAudienceSlotBusy(sp.e) && quick(sp),
      freed: slots.running === 0 && slots.waiting === 0,
      counted: free.claim.count === 3,
    };
    // ③ What the card does with it: KEEP the dialog, saying nothing was confirmed; "Count again" after a read.
    const kept = impl.ui.outcome({ ok: false, reason: "busy", error: COPY.COMPOSE_CONFIRM_BUSY_CONFIRM });
    const said = {
      keeps: kept.kind === "keep" && kept.toast.title === COPY.COMPOSE_CONFIRM_BUSY_CONFIRM && kept.toast.title.includes("nothing was confirmed"),
      // ⛔ True as written (the third pass): the slots are usually counting OTHER audiences, and beside a trigger that only
      // read, what did not happen is a count — the read's sentence says so, and never a confirmation or "other work".
      readSays: COPY.COMPOSE_CONFIRM_BUSY.includes("nothing was counted") && !COPY.COMPOSE_CONFIRM_BUSY.includes("confirmed")
        && !COPY.COMPOSE_CONFIRM_BUSY.includes("other work") && !COPY.COMPOSE_CONFIRM_BUSY_CONFIRM.includes("other work")
        && impl.ui.retry({ ok: true, card: { status: "DRAFT", read: "busy", view: null } }) === "count",
    };
    // ④ The wiring: one shipped bound; a reader's split gets what is left of it; the dialog closable but for the request.
    const card = impl.sources.card;
    const m = impl.sources.modal;
    const svc = impl.sources.service;
    const el = dialogOf(card);
    const confirmAt = card.indexOf("const confirm = () => {");
    const wired = {
      shipped: FEN.CONFIRM_SLOT_WAIT_MS === 15_000 && FEN.FENCE_SLOT.waitMs === FEN.CONFIRM_SLOT_WAIT_MS && impl.shipped.fence.slot === FEN.FENCE_SLOT,
      readerSplit: svc.includes("const left = Math.max(0, CONFIRM_SLOT_WAIT_MS - (fenced.waitedMs ?? 0));")
        && svc.includes("const split = await audienceViewFor(filter, count, viewer, deps, left);")
        && svc.includes("split: (f: ContactAudienceFilter, viewerReads: boolean, waitMs?: number) => audienceSplit(f, { viewerReads, waitMs }),"),
      requestAlone: el.includes("loading={posting}") && el.includes("confirmHeld={confirming && !posting}")
        && card.includes("const r = await runAdminAction(() => confirmCampaignAction(fd)).finally(() => setPosting(false));")
        && confirmAt >= 0 && card.indexOf("setPosting(true);", confirmAt) > confirmAt
        && card.indexOf("setPosting(true);", confirmAt) < card.indexOf("startConfirming(async () => {", confirmAt),
      kitHeld: m.includes("disabled={!armed || loading || confirmHeld}") && m.includes("disabled={loading} onClick={onClose}")
        && m.includes("closeOnScrim={!loading}") && m.includes("showClose={!loading}") && m.includes("onClose={loading ? () => {} : onClose}"),
    };
    const answers = `fence ${fe.ok ? "counted" : SPLIT.isAudienceSlotBusy(fe.e) ? "busy" : "threw"} at ${fe.at} ms · read ${rd.ok ? rd.v.read : "threw"} at ${rd.at} · run ${rn.ok ? (rn.v.ok ? "confirmed" : rn.v.reason) : "threw"} at ${rn.at} · split ${sp.ok ? "walked" : SPLIT.isAudienceSlotBusy(sp.e) ? "busy" : "threw"} at ${sp.at} (bound ${bound} ms)`;
    return [Object.values(busy).every(Boolean) && Object.values(said).every(Boolean) && Object.values(wired).every(Boolean),
      `${answers} · ${json(busy)} · ${json(said)} · ${json(wired)}`];
  });

  await claim(L.u18, async () => {
    // A reader's audience with a predicate a viewer who may not read a number may not use — and two guesses at it.
    const hidden: ContactAudienceFilter = { ...tagF("g-n3"), consent: ["GIVEN"] };
    const id = await draft(w, "ui_oracle", hidden);
    const same = AUD.campaignAudienceParams(hidden) ?? {};
    const guess = AUD.campaignAudienceParams({ ...hidden, consent: ["WITHDRAWN"] }) ?? {};
    const deps = impl.ui.readDeps(impl);
    const read = async (userId: string, audience: Record<string, string>): Promise<string> =>
      (await impl.ui.read(userId, { campaignId: id, draftRevision: 0, audience }, deps)).read;
    const masked = { same: await read(UI_GROWTH, same), guess: await read(UI_GROWTH, guess) };
    const reader = { same: await read(UI_ADMIN, same), guess: await read(UI_ADMIN, guess) };
    const noOracle = masked.same === "unsaved" && masked.guess === "unsaved";
    const readerCompares = reader.same === "view" && reader.guess === "unsaved";
    const d = impl.sources.doors;
    const ruleAt = d.indexOf("if (refusal(onScreen.filter, viewerReads) !== null) return false;");
    const wired = DOORS.CONFIRM_READ_DEPS.refusal === AUD.campaignAudienceRefusal && ruleAt > 0
      && ruleAt < d.indexOf("return contactAudienceKey(onScreen.filter) === contactAudienceKey(kept.filter);")
      && d.includes("!storesThis(req.audience, row.audienceFilter, viewer.reads, deps.refusal)")
      && d.indexOf("const viewer = await deps.viewer(userId);") < d.indexOf("!storesThis(");
    return [noOracle && readerCompares && wired, `masked ${json(masked)} · reader ${json(reader)} · wired ${wired}`];
  });

  await claim(L.u19, async () => {
    // A spy on the view's split door: the bound each reader's split is handed.
    const handed: number[] = [];
    const spySplit: ConfirmDeps["split"] = (fl, reads, waitMs) => { handed.push(waitMs ?? Number.NaN); return SVC.CONFIRM_DEPS.split(fl, reads, waitMs); };
    const id = await draft(w, "ui_budget", tagF("g-n7"));
    const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    // ① A slow WALK with its slot free: the count takes 200 ms and waited for nothing.
    const slowWalk: FenceDeps = { ...impl.fenceDeps, count: async (fl) => { await pause(200); return AUD.campaignAudienceCount(fl); } };
    const walked = await viewOf(impl, w, id, READER, { fence: (c) => FEN.audienceFence(c, slowWalk), split: spySplit });
    // ② A real WAIT: both per-process slots held ~150 ms, then the count.
    let releaseA = (): void => {};
    let releaseB = (): void => {};
    const heldA = new Promise<number>((resolve) => { releaseA = () => resolve(0); });
    const heldB = new Promise<number>((resolve) => { releaseB = () => resolve(0); });
    const a = SPLIT.audienceWalkCount(tagF("g-n1"), () => heldA);
    const b = SPLIT.audienceWalkCount(tagF("g-n2"), () => heldB);
    await tick();
    const waiting = viewOf(impl, w, id, READER, { fence: (c) => FEN.audienceFence(c, impl.fenceDeps), split: spySplit });
    await pause(150);
    releaseA();
    releaseB();
    const waited = await waiting;
    await Promise.all([a, b]);
    // ③ The door itself: an asker with a slot free is told it waited for nothing.
    let told = -1;
    await SPLIT.audienceWalkCount(tagF("g-n2"), AUD.campaignAudienceCount, { join: false, waitMs: 1000, waited: (ms) => { told = ms; } });
    const B = FEN.CONFIRM_SLOT_WAIT_MS;
    const budget = {
      walkNotCharged: walked !== null && walked.count === 7 && walked.split !== null && handed.length >= 2 && handed[0] > B - 60,
      waitCharged: waited !== null && waited.count === 7 && handed[1] <= B - 100 && handed[1] >= B - 5000,
      doorTells: told >= 0 && told < 60,
    };
    const svc = impl.sources.service;
    const wired = svc.includes("const left = Math.max(0, CONFIRM_SLOT_WAIT_MS - (fenced.waitedMs ?? 0));") && !svc.includes("getTime() - started")
      && impl.sources.fence.includes("return { claim, countedAt: deps.now().toISOString(), sample, waitedMs };");
    return [Object.values(budget).every(Boolean) && wired, `handed ${json(handed)} (bound ${B}) · told ${told} · ${json(budget)} · wired ${wired}`];
  });

  await claim(L.u20, async () => {
    // A reader's split that found no slot in time: the rest of the view stands, the figures do not.
    const id = await draft(w, "ui_unsplit", tagF("g-n7"));
    const busySplit: ConfirmDeps["split"] = async () => { throw new SPLIT.AudienceSlotBusy(0); };
    const v = await viewOf(impl, w, id, READER, { split: busySplit });
    const kept = v !== null && v.count === 7 && v.split === null && v.watermark !== null && v.blocked === null && v.estimate !== null
      && v.sample.length === 5;
    // …and the dialog SAYS so, where the four figures would stand.
    const card = impl.sources.card;
    const branch = "{view.split !== null ? (";
    const unread = 'data-confirm-figures="unread">{COMPOSE_CONFIRM_SPLIT_UNREAD}</p>';
    const said = card.includes(branch) && card.includes(unread) && card.indexOf(unread) > card.indexOf(branch)
      && COPY.COMPOSE_CONFIRM_SPLIT_UNREAD.startsWith("Couldn't work out who will receive it")
      && COPY.COMPOSE_CONFIRM_SPLIT_UNREAD.includes("checked again when it is sent");
    return [kept && said, `view ${showView(v)} · split ${v === null ? "-" : v.split === null ? "null" : "drawn"} · rows ${v?.sample.length ?? "-"} · said ${said}`];
  });

  await claim(L.u21, async () => {
    // Both per-process slots held by two other counts.
    let releaseA = (): void => {};
    let releaseB = (): void => {};
    const heldA = new Promise<number>((resolve) => { releaseA = () => resolve(0); });
    const heldB = new Promise<number>((resolve) => { releaseB = () => resolve(0); });
    const a = SPLIT.audienceWalkCount(tagF("g-n1"), () => heldA);
    const b = SPLIT.audienceWalkCount(tagF("g-n2"), () => heldB);
    await tick();
    const K = tagF("g-n4");
    const answer = (p: Promise<number>): Promise<string> =>
      p.then((n) => `counted ${n}`, (e: unknown) => (SPLIT.isAudienceSlotBusy(e) ? "busy" : "threw"));
    // A BOUNDED asker that does not say `join: false` — then an UNBOUNDED one for the same audience, behind it.
    const boundedP = answer(SPLIT.audienceWalkCount(K, AUD.campaignAudienceCount, { waitMs: 40 }));
    await tick();
    const plainP = answer(SPLIT.audienceWalkCount(K));
    await new Promise((resolve) => setTimeout(resolve, 120));
    const whileHeld = SPLIT.audienceSplitSlots();
    releaseA();
    releaseB();
    const [boundedSaid, plainSaid] = await Promise.all([boundedP, plainP]);
    await Promise.all([a, b]);
    const after = SPLIT.audienceSplitSlots();
    const own = boundedSaid === "busy" && plainSaid === "counted 4" && whileHeld.waiting === 1 && after.running === 0 && after.waiting === 0;
    const s = impl.sources.split;
    const wired = s.includes("const shared = count === campaignAudienceCount && opts.join !== false && !bounded(opts.waitMs);")
      && s.includes("&& opts.chunk === undefined && opts.observe === undefined && !bounded(opts.waitMs);")
      && s.includes("return waitMs !== undefined && waitMs !== Number.POSITIVE_INFINITY;");
    return [own && wired, `bounded ${boundedSaid} · unbounded ${plainSaid} · waiting while held ${whileHeld.waiting} · after ${json(after)} · wired ${wired}`];
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

  // 6.8 ("enqueue.ts asks startAudienceVerdict before its first createMany") is WITHDRAWN with U42's review: it held only by
  // the order the file declares things in. The behaviour is driven instead by `test:marketing-engine` E10 (b) — a listed
  // confirmation whose people changed writes NOTHING and pauses `audience_moved` — and E10b, with their plants.

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
  if (rel === ACTIONS_REL) return s.actions;
  if (rel === VIEW_ACTIONS_REL) return s.viewActions;
  if (rel === DOORS_REL) return s.doors;
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

  /** R-UI.2 · the tier as a browser might work it out — five or fewer people is a list, whoever is looking. */
  const countTier = (view: { tier: ConfirmTier | null; count: number | null }): ConfirmGateProps | null => {
    if (view.tier === null || view.count === null) return null;
    return view.count <= PURE.CONFIRM_ENUMERATE_MAX
      ? { tier: "medium" }
      : { tier: "hard", typedWord: String(view.count), typedInputMode: "numeric" };
  };
  /** R-UI.4 · the confirmation action's gate taken from the top and put after the confirmation has run. */
  const guardBelow = (src: string): string =>
    plantIn(plantIn(src, GUARD_LINE, ""), "  if (result.ok) {", `  ${GUARD_LINE}${NL}  if (result.ok) {`);
  /** R-UI.4c · the read action's gate taken from the top and put after the read has run. */
  const viewGuardBelow = (src: string): string =>
    plantIn(plantIn(src, VIEW_GUARD_LINE, ""), "  return { ok: true, card:", `  ${VIEW_GUARD_LINE}${NL}  return { ok: true, card:`);
  /** R-UI.17b / 17c · "no slot in time" taken for any other throw — the busy error's code lost on the way. */
  const plainThrow = (e: unknown): never => { throw new Error(`plain: ${String((e as Error)?.message ?? e)}`); };
  /** R-UI.16 · the fence's count door takes a count already in flight for its audience — whoever began it, and when. (A
   *  bound means its own count, §UI 21, so the join is planted at the door the fence counts through.) */
  const joiningCount = (fl: ContactAudienceFilter): Promise<number> => {
    const flights = (globalThis as unknown as { __50PICK_AUDIENCE_COUNTS?: Map<string, Promise<number>> }).__50PICK_AUDIENCE_COUNTS;
    return flights?.get(AUD.contactAudienceKey(fl)) ?? AUD.campaignAudienceCount(fl);
  };
  /** R-UI.11c · the read with its checks taken out: any revision, any audience on screen, any status — it counts. */
  const readCountingAnything: typeof DOORS.readConfirmCardFor = async (userId, req, deps = DOORS.CONFIRM_READ_DEPS) => {
    const row = await deps.find(req.campaignId);
    const asDraft: ConfirmReadDeps = {
      ...deps,
      find: async (id: string) => { const r = await deps.find(id); return r === null ? null : { ...r, status: "DRAFT" as const }; },
    };
    return DOORS.readConfirmCardFor(userId, row === null ? req : { ...req, draftRevision: row.draftRevision, audience: null }, asDraft);
  };

  /** A plant that replaces a source anchor is built when its turn comes, so an anchor that has gone fails that plant alone. */
  type Plant = { name: string; expect: Label[]; impl: Partial<Impl> | (() => Partial<Impl>) };
  const plants: Plant[] = [
    // §UI 16 is OD27's stale client too (the re-review's MINOR 2): the old typed number would confirm there as well.
    { name: "R1 (the plan's own) · the typed number checked against the count INSIDE the posted watermark", expect: [L.s2, L.s3, L.s12, L.u16],
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
    // §UI 6 reads the card the page builds from this very view, so it goes red with it: TZS in a GROWTH render.
    { name: "R13 · the view embeds the money for every role", expect: [L.s19, L.u6],
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
    // §UI 2 and §UI 7 read this very view: the dialog's tier follows it to a list, and the card a masked viewer is handed lists.
    { name: "R-OD67 · the fence as a reader sees it, for every role — a viewer who may not read a number gets the list, the members key and the list tier", expect: [L.g6c, L.u2, L.u7],
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
    // ── §UI · U40b — §4.6's four, OD67's list, the re-review's tier, the review's fixes, and each §UI claim's own control ──
    { name: "R-UI.1 · ⛔ A5 · the dialog opens with the focus ON CONFIRM (the medium tier's initialFocus becomes the confirm button)", expect: [L.u1],
      impl: () => withSources({ modal: plantIn(REAL_SOURCES.modal, FOCUS_LINE, "initialFocus={isHard ? inputRef : confirmRef}") }) },
    { name: "R-UI.1b · the dialog RE-KEYED on a refusal instead of re-armed — a remount draws nothing for a commit: it blinks", expect: [L.u1],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, ARM_KEY, "key={`${dialog.view.watermark}:${attempt}`}") }) },
    { name: "R-UI.1c · the attempt bumped on the CONFIRMED path too — a success re-arms a dialog it is closing", expect: [L.u1],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, 'case "confirmed":', `case "confirmed":${NL}        setAttempt((a) => a + 1);`) }) },
    { name: "R-UI.2 · ⛔ OD67 · the dialog's tier worked out from the COUNT in the browser (five or fewer is a list) — a masked viewer's three get a list dialog with no list in it, and a one-press confirm the server refuses", expect: [L.u2],
      impl: { ui: { ...REAL.ui, gate: countTier } } },
    { name: "R-UI.2b · the card works the tier out from the count itself, beside the view's", expect: [L.u2],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, "const gate = view === null ? null : confirmGate(view);",
        'const gate = view === null || view.count === null ? null : view.count <= CONFIRM_ENUMERATE_MAX ? { tier: "medium" as const } : confirmGate(view);') }) },
    { name: "R-UI.3 · `typedInputMode` given to the MEDIUM tier too", expect: [L.u3],
      impl: () => withSources({ modal: plantIn(REAL_SOURCES.modal, "typedWord?: never; typedInputMode?: never };", 'typedWord?: never; typedInputMode?: "numeric" };') }) },
    { name: "R-UI.3b · `armKey` made REQUIRED — every existing ConfirmModal caller stops compiling", expect: [L.u3],
      impl: () => withSources({ modal: plantIn(REAL_SOURCES.modal, "armKey?: string | number;", "armKey: string | number;") }) },
    { name: "R-UI.4 · ⛔ ruling 523 · the confirmation action's guard moved BELOW the confirmation", expect: [L.u4],
      impl: () => withSources({ actions: guardBelow(REAL_SOURCES.actions) }) },
    { name: "R-UI.4b · a second action in the confirmation's file — an orphan beside the one the card imports", expect: [L.u4],
      impl: withSources({ actions: `${REAL_SOURCES.actions}${NL}export async function previewConfirmAction(formData: FormData) { return formData; }` }) },
    { name: "R-UI.4c · ⛔ ruling 523 · the read action's guard moved BELOW the read — a count for anyone who posts", expect: [L.u4b],
      impl: () => withSources({ viewActions: viewGuardBelow(REAL_SOURCES.viewActions) }) },
    { name: "R-UI.4d · a second action in the read's file", expect: [L.u4b],
      impl: withSources({ viewActions: `${REAL_SOURCES.viewActions}${NL}export async function peekConfirmAction(request: unknown) { return request; }` }) },
    { name: "R-UI.5 · the viewer fails OPEN — no officer reads as a reader of numbers and money", expect: [L.u5],
      impl: { ui: { ...REAL.ui, viewer: async (id: string | null, deps?: Parameters<typeof SVC.confirmViewerFor>[1]) =>
        (typeof id === "string" && id.trim() !== "" ? SVC.confirmViewerFor(id, deps) : { reads: true, money: true }) } } },
    { name: "R-UI.6 · G5.3 · the read counted with money for every role — TZS in a GROWTH render", expect: [L.u6],
      impl: { ui: { ...REAL.ui, readDeps: (impl: Impl) => ({ ...realReadDeps(impl), viewer: async (id: string | null) => ({ ...(await SVC.confirmViewerFor(id)), money: true }) }) } } },
    // §UI 18 reads the same viewer: a masked officer read as a reader passes the role rule, and the comparison answers them.
    { name: "R-UI.7 · ⛔ OD67 · the read counted as a READER for every role — a viewer who may not read a number shown the list of three", expect: [L.u7, L.u18],
      impl: { ui: { ...REAL.ui, readDeps: (impl: Impl) => ({ ...realReadDeps(impl), viewer: async (id: string | null) => ({ ...(await SVC.confirmViewerFor(id)), reads: true }) }) } } },
    { name: "R-UI.8 · the trigger opens over unsaved text — the client's own check skipped (the server sees only the saved draft)", expect: [L.u8],
      impl: { ui: { ...REAL.ui, blocked: (f: ConfirmTriggerFacts) => COPY.confirmTriggerBlocked({ ...f, form: { ...f.form, dirty: false } }) } } },
    { name: "R-UI.8b · a form whose revision is behind the page's opens anyway — another tab's save confirmed under this tab's old text", expect: [L.u8],
      impl: { ui: { ...REAL.ui, blocked: (f: ConfirmTriggerFacts) => COPY.confirmTriggerBlocked({ ...f, form: { ...f.form, pageRevision: f.form.savedRevision } }) } } },
    { name: "R-UI.8c · an audience the composer cannot use said as 'Save first' beside a Save refused for that very problem", expect: [L.u8],
      impl: { ui: { ...REAL.ui, blocked: (f: ConfirmTriggerFacts) => COPY.confirmTriggerBlocked({ ...f, form: { ...f.form, audienceProblem: null } }) } } },
    { name: "R-UI.8d · 'Nothing was confirmed.' left beside a trigger that only read the audience", expect: [L.u8],
      impl: { ui: { ...REAL.ui, sentence: (s: string) => s } } },
    { name: "R-UI.9 · the confirmation's doors reach the composer's loader — and through it the send window's module", expect: [L.u9],
      impl: () => withSources({ doors: plantIn(REAL_SOURCES.doors, 'import { db } from "@/lib/server/store";', `import { db } from "@/lib/server/store";${NL}import { loadComposer } from "./composer-loader";`) }) },
    { name: "R-UI.10 · the audience on screen never compared with the saved one — a rail pick confirmed as the stored audience", expect: [L.u10],
      impl: { ui: { ...REAL.ui, audienceView: (sp, d, r, doors) => ({ ...LOADER.composeAudienceView(sp, d, r, doors), unsaved: false }) } } },
    { name: "R-UI.11 · ⛔ the review's MAJOR · the page counts the confirmation on its render — every navigation waits on a walk", expect: [L.u11],
      impl: () => withSources({ page: plantIn(REAL_SOURCES.page, "<AdminCard title={COMPOSE_CONFIRM_TITLE}><CampaignConfirm /></AdminCard>",
        '<AdminCard title={COMPOSE_CONFIRM_TITLE}><CampaignConfirm card={await readConfirmCardFor(null, { campaignId: view.draft?.id ?? "", draftRevision: null, audience: null })} /></AdminCard>') }) },
    { name: "R-UI.11b · the card asks on mount — a walk on every composer render, pressed or not", expect: [L.u11],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, "  const close = () => {", `  useEffect(() => { ask(); }, []);${NL}  const close = () => {`) }) },
    // …and §UI 18 with it: a read that never holds the audience on screen against anything answers a masked guess with a count.
    { name: "R-UI.11c · the read counts where it may not — past DRAFT, a stale revision, an audience on screen the draft does not store", expect: [L.u11, L.u18],
      impl: { ui: { ...REAL.ui, read: readCountingAnything } } },
    { name: "R-UI.12 · the fence counts OUTSIDE the split door's slots — beside two splits, on a pool shared with bets", expect: [L.u12],
      impl: () => withSources({ fence: plantIn(REAL_SOURCES.fence, "const count = await audienceWalkCount(filter, deps.count, { join: slot.join, waitMs: slot.waitMs, waited: (ms) => { waitedMs = ms; } });", "const count = await deps.count(filter);") }) },
    { name: "R-UI.13 · a refusal left on the OLD figures — no recount, no re-arm", expect: [L.u13],
      impl: { ui: { ...REAL.ui, outcome: (r: ConfirmAnswerLike) => {
        const o = COPY.confirmOutcome(r);
        return o.kind === "recount" ? { kind: "keep" as const, toast: { title: o.notice, variant: "warning" as const } } : o;
      } } } },
    { name: "R-UI.13b · 'no longer a draft' recounted — never read again and titled from the row, so this officer's own landed press reads 'Not confirmed'", expect: [L.u13],
      impl: { ui: { ...REAL.ui, outcome: (r: ConfirmAnswerLike) => (!r.ok && r.reason === "not_draft" ? { kind: "recount" as const, notice: r.error } : COPY.confirmOutcome(r)) } } },
    { name: "R-UI.13c · an answer that never came back told 'nothing was confirmed'", expect: [L.u13],
      impl: { ui: { ...REAL.ui, outcome: (r: ConfirmAnswerLike) => (!r.ok && (r.reason === undefined || r.reason === "unfinished")
        ? { kind: "keep" as const, toast: { title: COPY.COMPOSE_CONFIRM_FAILED, variant: "danger" as const } }
        : COPY.confirmOutcome(r)) } } },
    { name: "R-UI.13d · a recount that can no longer open re-armed anyway — the dialog left open on figures it cannot confirm", expect: [L.u13],
      impl: { ui: { ...REAL.ui, recount: (_answer: ConfirmAnswerFacts | null, notice: string) => ({ kind: "rearm" as const, notice }) } } },
    { name: "R-UI.14 · a failed confirmation says 'nothing was confirmed' whatever the row reads", expect: [L.u14],
      impl: { ui: { ...REAL.ui, run: (actorId: string, req: Parameters<typeof DOORS.runConfirmFor>[1], deps: ConfirmRunDeps = DOORS.CONFIRM_RUN_DEPS) =>
        DOORS.runConfirmFor(actorId, req, { ...deps, find: async () => null }) } } },
    // ── §UI · the U40b re-review's fixes (MINORs 1–3 and the NITs) ──
    { name: "R-UI.3c · `confirmHeld` made REQUIRED — every existing ConfirmModal caller stops compiling", expect: [L.u3],
      impl: () => withSources({ modal: plantIn(REAL_SOURCES.modal, "confirmHeld?: boolean;", "confirmHeld: boolean;") }) },
    { name: "R-UI.4e · the read audited as the confirmation itself — a refused read reads as a refused confirmation", expect: [L.u4b],
      impl: () => withSources({ viewActions: plantIn(REAL_SOURCES.viewActions, '"marketing.campaign.confirm_view"', '"marketing.campaign.confirm"') }) },
    { name: "R-UI.4f · the read with no budget — a script holds both of the split door's slots for everyone", expect: [L.u4b],
      impl: () => withSources({ viewActions: plantIn(REAL_SOURCES.viewActions, READ_BUDGET_LINE, "const rate = { allowed: true, retryAfterSec: 0 };") }) },
    { name: "R-UI.8e · the live region back on the three lines the card swaps — each mounted already holding its words, announced unreliably", expect: [L.u8],
      impl: () => withSources({ card: plantIn(plantIn(REAL_SOURCES.card, '<div className={CONFIRM_LINE_BOX} role="status">', "<div className={CONFIRM_LINE_BOX}>"),
        "data-confirm-blocked>", 'role="status" data-confirm-blocked>') }) },
    { name: "R-UI.15 · ⛔ MINOR 1 · the dialog opens on the answer alone — typed while it counted, then undone, it pops open with no press, on figures from before", expect: [L.u15],
      impl: { ui: { ...REAL.ui, opens: (o: Parameters<typeof COPY.confirmOpensOn>[0]) => COPY.confirmAnswerReady(o.answer) } } },
    { name: "R-UI.15b · an open the page can no longer show kept for later — undoing what blocked it opens the dialog by itself", expect: [L.u15],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, "  if (open && live === null && !confirming) setOpen(false);", "") }) },
    { name: "R-UI.15c · the dialog shown for whatever form is on screen, not the one it was opened for", expect: [L.u15],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, "const dialogOpen = open && openedFor === formKey && live !== null;", "const dialogOpen = open && live !== null;") }) },
    { name: "R-UI.16 · ⛔ MINOR 2 · the fence JOINS a count already running — one begun before a contact was added confirms the old number (OD27)", expect: [L.u16],
      impl: { fenceDeps: { ...FEN.FENCE_DEPS, count: joiningCount } } },
    { name: "R-UI.17 · ⛔ MINOR 3 · the confirmation's slot waited for without limit — the dialog unclosable while the line moves", expect: [L.u17],
      impl: { fenceDeps: { ...FEN.FENCE_DEPS, slot: { join: false, waitMs: Number.POSITIVE_INFINITY } } } },
    { name: "R-UI.17b · a confirmation that found no slot said as a failure — 'busy' taken for any throw", expect: [L.u17],
      impl: { ui: { ...REAL.ui, run: (actorId: string, req: Parameters<typeof DOORS.runConfirmFor>[1], deps: ConfirmRunDeps = DOORS.CONFIRM_RUN_DEPS) =>
        DOORS.runConfirmFor(actorId, req, { ...deps, confirm: (input, viewer) => deps.confirm(input, viewer).catch(plainThrow) }) } } },
    { name: "R-UI.17c · a read that found no slot said as a read that failed", expect: [L.u17],
      impl: { ui: { ...REAL.ui, read: (userId: string | null, req: Parameters<typeof DOORS.readConfirmCardFor>[1], deps: ConfirmReadDeps = DOORS.CONFIRM_READ_DEPS) =>
        DOORS.readConfirmCardFor(userId, req, { ...deps, view: (campaignId, viewer) => deps.view(campaignId, viewer).catch(plainThrow) }) } } },
    { name: "R-UI.17d · the dialog unclosable while a refusal's figures are read again — `loading` held for the whole confirmation", expect: [L.u17],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, "loading={posting}", "loading={confirming}") }) },
    { name: "R-UI.17e · a busy confirmation recounted — the dialog asks again into the same full house", expect: [L.u17],
      impl: { ui: { ...REAL.ui, outcome: (r: ConfirmAnswerLike) => (!r.ok && r.reason === "busy" ? { kind: "recount" as const, notice: r.error } : COPY.confirmOutcome(r)) } } },
    { name: "R-UI.18 · ⛔ the read compares before the role rule — a masked viewer learns whether a hidden filter equals their guess", expect: [L.u18],
      impl: { ui: { ...REAL.ui, readDeps: (impl: Impl) => ({ ...realReadDeps(impl), refusal: () => null }) } } },
    // ── §UI · the third pass ──
    { name: "R-UI.4g · 'Count again' offered beside a spent read budget — a button that can only be refused again", expect: [L.u4b],
      impl: { ui: { ...REAL.ui, retry: (a: ConfirmAnswerFacts | null) => (a !== null && !a.ok && a.reason === "rate_limited" ? "count" as const : COPY.confirmAnswerRetry(a)) } } },
    { name: "R-UI.19 · ⛔ the read's bound charged with the count's WALK — a large audience leaves a reader's figures no bound at all", expect: [L.u19],
      impl: finishWith((d) => ({ ...d, fence: async (c) => {
        const began = Date.now();
        const f = await d.fence(c);
        return { ...f, waitedMs: Date.now() - began };
      } })) },
    { name: "R-UI.19b · the count's WAIT never charged — the read waits twice, the count's bound and then the split's whole one", expect: [L.u19],
      impl: finishWith((d) => ({ ...d, fence: async (c) => ({ ...(await d.fence(c)), waitedMs: 0 }) })) },
    { name: "R-UI.20 · ⛔ a reader's missing figures left out in silence — the count, the list and the estimate, and not a word about who will receive it", expect: [L.u20],
      impl: () => withSources({ card: plantIn(REAL_SOURCES.card, 'data-confirm-figures="unread">{COMPOSE_CONFIRM_SPLIT_UNREAD}</p>', 'data-confirm-figures="unread"></p>') }) },
    { name: "R-UI.21 · ⛔ a bounded asker shares its count — an unbounded asker behind it inherits a 'busy' it never asked for", expect: [L.u21],
      impl: () => withSources({ split: plantIn(REAL_SOURCES.split, "const shared = count === campaignAudienceCount && opts.join !== false && !bounded(opts.waitMs);",
        "const shared = count === campaignAudienceCount && opts.join !== false;") }) },
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
