/**
 * test:campaign-privacy — U16a's guard (marketing ENGINE-SPEC §4.7): erasure, the access export and retention reach
 * SmsCampaign, SmsCampaignRecipient and the opt-out tokens — LIVE before U42 writes the first recipient row (M9).
 *
 * ⭐ WHY A SUITE OF ITS OWN (the spec's decision 6). `red:erasure` is a FILE-MUTATING harness and takes no new anchors
 * (§5.3), and `test:erasure` keeps running unchanged. So the U16a assertions live here, and every one has an IN-PROCESS
 * red: `--prove-red` plants each defect in memory — a DAL member swapped on the shared `db` for one run and put back
 * after it, a door wrapped, or a text handed in planted — and requires the MATCHING assertion to fail. Nothing on disk
 * changes, so this suite can run beside any other.
 * ⛔ THE MEMORY TWIN ONLY. `DATABASE_URL` is removed BEFORE the store is imported (the store picks its twin at import),
 * and P0 asserts a campaign written lands in the memory map — so a run on a machine with a database configured can never
 * erase or settle anything in it. The Prisma twin's half is `test:dal-parity` §26.u16a (its shape) and
 * `scripts/live/campaign-privacy-pg-probe.mts` (its behaviour, on a scratch PostgreSQL).
 * ⭐ THROUGH THE REAL DOORS (U43a): a fixture row is settled as the engine settles one — claimed under a fresh token
 * (`claim`, re-read by `claimedBy`), then ONE patch of the settle table (`settle`), a held row re-queued first where a
 * fixture asks (`requeueHeld`) — so P10 sweeps what the doors WRITE, never what this suite wrote. Only what no U43a door
 * writes stays by hand (`afterTheDoors`): U46a's receipts (a failure reported after a send, the cost) and one state no
 * door can reach, kept to hold the export's defence.
 * ⭐ THE REVIEW ROUND (U16a's D10 · D11 · D12, and the strict sweep). The read takes rows CREATED OR SENT since the bound
 * (P3's row queued for the previous holder and sent after the number passed; P9's small number); the cap is 5,000 and
 * both twins read ONE row past it, so a file that cannot list every row SAYS so (P3g, over one number holding more —
 * built ONCE per process); a number other than the account's own lists only rows linked to the person (P3f); and after
 * erasure no recipient row anywhere holds an erased person's id, name or mask (P10). Every fixture name, and the last
 * three digits of every fixture number, carry the RUN — so a name a red case planted can never answer a later run's sweep.
 * ⭐ THE FIXER ROUND (2026-10-07). P11 · THE ERASURE MARKER (3a(ii)): an account that never consented and had no book row
 * is marked WITHDRAWN on its own number at erasure, so the REAL gate — the outreach record open, a typed test's usable
 * attestation in hand — refuses it consent_withdrawn, a second pass appends nothing, a consent is still withdrawn exactly
 * once, and a later yes still lifts it (no stop-list row). P10's TRIPWIRE: a recipient-namespace member P10 does not
 * account for, in either twin, fails P10 by name — so no new door (U46a's receipt next) lands without P10 sweeping
 * what it writes; U43a's six are accounted for, its three writers driven (R-P10e proves the settle is the real one). W1:
 * the suite's own wiring (its four package.json keys; on predeploy once, straight after test:erasure). A row put on its
 * campaign before the account is listed undated (P3b). P6c reads the page's SCHEDULE too, and S1 sees any spelling.
 * ⛔ No backslash anywhere in this file: line breaks and patterns are built with String.fromCharCode and character
 * classes, because the tools this file is edited with decode escapes (`test:source-bytes`).
 * ⚠️ U13 (the send window) makes `dispatchSlice` time-dependent: its builder injects an open window into P5's call in
 * the same commit (the spec's §5.9 — U13 greps every `dispatchSlice(` under scripts/).
 *
 * Run:  npm run test:campaign-privacy
 * Red:  npm run red:campaign-privacy
 */
process.exitCode = 1;
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import type {
  StoredMarketingContact, StoredSmsCampaign, StoredSmsCampaignRecipient, StoredUser, SmsCampaignTransitionPatch,
  SmsCampaignStatus, SmsCampaignGateTrail, StoredMessagingConsent, SmsCampaignRecipientSettle, SmsCampaignSettleResult,
} from "../src/lib/server/store.ts";
import type {
  MarketingSkipReason, MarketingGateReads, MarketingGateVerdict, TestAttestation,
} from "../src/lib/server/marketing/consent.ts";
import type { LicenceOutreach } from "../src/lib/server/marketing/outreach-record.ts";
import type { SmsBatchOutcome, SmsOutbound } from "../src/lib/server/sms.ts";

// ⛔ BEFORE THE STORE IS IMPORTED — see the header.
delete process.env.DATABASE_URL;
const { db } = await import("../src/lib/server/store.ts");
const { anonymizeClosedAccount } = await import("../src/lib/server/erasure.ts");
const { eraseMarketingFor, ERASURE_EVIDENCE, ERASURE_LEDGER_WORDING } = await import("../src/lib/server/marketing/erase.ts");
// P11 · the ONE gate, asked exactly as a typed test asks it (the outreach record handed in, an attestation in the context).
const { mayReceiveMarketingSms, DB_GATE_READS } = await import("../src/lib/server/marketing/consent.ts");
const { ledgerStamp } = await import("../src/lib/server/marketing/ledger-stamp.ts");
const { marketingDsarView, NOT_SENT_REASON, CAMPAIGN_HISTORY_CUT } = await import("../src/lib/server/marketing/dsar.ts");
const { exportUserData } = await import("../src/lib/server/user-service.ts");
const { buildDsarBundle } = await import("../src/lib/server/privacy.ts");
const { dispatchSlice } = await import("../src/lib/server/marketing/dispatch.ts");
const { AUDIENCE_BUCKET_OF } = await import("../src/lib/server/marketing/audience-split.ts");
const { SMS_CONSENT_WORDINGS } = await import("../src/lib/marketing/consent-wording.ts");
const { OPTOUT_TOKEN_ALPHABET, optOutTokenRef } = await import("../src/lib/marketing/optout.ts");
const { SMS_RECIPIENTS_BY_NUMBER_MAX, SMS_CAMPAIGN_SEED_CHUNK_MAX, SMS_RECIPIENT_SETTLE_KEYS } = await import("../src/lib/server/marketing/campaign-model.ts");
const { getAuditPage, auditFlush } = await import("../src/lib/server/audit.ts");
// P10's needles — the platform's own masks, so a mask that changes shape is followed here (`test:erasure` reads the same).
const { maskName } = await import("../src/lib/server/affiliate-service.ts");
const { maskPhone } = await import("../src/lib/phone-normalize.ts");
const { displayLabel } = await import("../src/lib/display-label.ts");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROVE_RED = process.argv.includes("--prove-red");
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const lf = (s: string) => s.split(CR).join("");
const read = (rel: string) => lf(readFileSync(join(ROOT, rel), "utf8"));

/** Every src/ file's text, decommented — the writer population S1 reads. */
function srcTexts(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  const walk = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}/${e.name}`);
      else if (/[.](ts|tsx)$/.test(e.name)) out.push({ path: `${rel}/${e.name}`, text: decomment(readFileSync(join(dir, e.name), "utf8")) });
    }
  };
  walk(join(ROOT, "src"), "src");
  return out;
}

/** The memory twin's campaign maps — the rows a fixture settles by hand and an assertion reads back. */
type MemMaps = {
  smsCampaigns: Map<string, StoredSmsCampaign>;
  smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
};
function mem(): MemMaps {
  const s = (globalThis as unknown as { __50PICK_STORE?: MemMaps }).__50PICK_STORE;
  if (!s || !s.smsCampaigns || !s.smsCampaignRecipients) {
    throw new Error("the memory store has no campaign maps — this suite runs on the memory twin only");
  }
  return s;
}
const rowsNow = (): StoredSmsCampaignRecipient[] => Array.from(mem().smsCampaignRecipients.values());

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence `fn` computes — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}
async function throwsAsync(fn: () => unknown): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

const L = {
  p0: "P0 · CONTROL · the suite runs on the MEMORY twin: DATABASE_URL is absent, a campaign written lands in the memory map, and both new recipient members are there",
  p1: "P1 · ⭐ erasure unlinks EVERY recipient row of the account — userId null, the row at its old number too — deletes none, keeps every other column, and says how many in its counts and in its audit row",
  p2: "P2 · a recipient row linked to ANOTHER account at the same number, and an unlinked row there, are untouched by the erasure",
  p3: "P3 · ⭐ the export carries the person's messages that reached the network since the account's creation — one put on a campaign before it but SENT after it too (D12), and one the network never answered — newest first, the status in words, the body of the variant each went out in — and NOT a previous holder's rows at the same number, created and sent before the account",
  p3b: "P3b · every other row since the account is listed as not sent, newest first, with its reason — refused at sending in the five-bucket words, never handed to the network, the campaign stopped, still waiting — and one put on its campaign BEFORE the account (read because it was sent since) is listed UNDATED, so the previous holder's campaign date stays theirs",
  p3c: "P3c · the opt-out links: the person's own by reference with when each was minted; one minted before the account only when one of their messages carried it, and then undated; a previous holder's never",
  p3d: "P3d · both doors — the player's own download and the officer's DSAR bundle — carry exactly those three sections, and no cut line when every row is listed",
  p3f: "P3f · ⭐ on a number other than the account's own — a linked book row's old number — only rows linked to this person are theirs (D11): their messages there, through the account or through their own book row, are listed; a stranger's message there, and the link minted for the stranger, are in no file of theirs",
  p3g: "P3g · ⭐ never a silent cut (D10): a number holding more campaign rows than the cap lists its newest SMS_RECIPIENTS_BY_NUMBER_MAX (5,000) and the file says in words that the oldest are not included — offering no rest that no door could produce — and a file listing every row says nothing",
  p4: "P4 · ⛔ no export carries a recipient id, a campaign id or name, the officer, the gate trail, the refusal detail, the provider reference or failure, another account's id, a book row id or a LIVE token — and every link reference is two characters then stars",
  p5: "P5 · ⭐ an erased number's PENDING row in a RUNNING campaign is refused at send — dispatchSlice skips it consent_withdrawn — while a consenting player in the same slice is handed over; the wire never sees the erased number, and the row stays PENDING",
  p6: "P6 · /admin/retention's SCHEDULE and DATA-RETENTION §1 name the SAME two classes — campaigns and their recipients, and the opt-out links — with the same period, the same trigger and the same legal basis",
  p6b: "P6b · the two new rows' Swahili glosses are COPIED (plan §5.13): /admin/campaigns' own Kampeni and the stop page's own button",
  p6c: "P6c · no line of the published schedule, and no row of the page's SCHEDULE, still says the opt-out links are not reached or sit outside it — in any capitalisation",
  p7: "P7 · erasure is idempotent: a second run reports the account already erased and unlinks 0 — through anonymizeClosedAccount and through eraseMarketingFor",
  p7b: "P7b · a re-run still reaches the campaign records: a row linked to the account AFTER the first pass loses its link (1), and the run after that unlinks 0",
  p8: "P8 · the export's refusal words keep U38a's five-bucket partition reason by reason — every reason has words, protected standing is ONE value, and two reasons share words exactly when they share a bucket",
  p9: "P9 · the memory read answers only rows CREATED OR SENT at or after the bound — one put on a campaign before it and sent after it is in, one sent before it is not — NEWEST first with ties broken on the id, and SMS_RECIPIENTS_BY_NUMBER_MAX + 1 rows at most (5,001): the newest",
  p10: "P10 · ⭐ the strict sweep: after erasure no recipient row in the store — its gate trail, refusal detail, error, any column but the number — holds an erased person's account id, name, first name, masked name, masked number or anonymous handle (the number is the record itself, and stays); and neither twin's recipient namespace has a member P10 does not account for, named — so a new door that writes a row (U46a's receipt next) lands only with P10 sweeping it — and the rows it sweeps were settled through the real doors",
  p11: "P11 · ⭐ THE ERASURE MARKER (3a(ii)): an account that never consented and has no book row, erased — its own number's ledger now ends in the erasure's WITHDRAWN (OPERATOR, the erasure's wording and evidence, the officer), counted once",
  p11b: "P11b · ⭐ …and the ONE gate refuses that number consent_withdrawn with the licence-outreach record OPEN and a typed test's usable attestation in hand — while the same reads and attestation DO reach a number nobody holds (the control)",
  p11c: "P11c · a second pass appends nothing: a re-run of the erasure counts 0 and leaves the one row, and eraseMarketingFor called twice on a never-consented account writes 1 then 0",
  p11d: "P11d · an account whose latest row is GIVEN still gets exactly ONE WITHDRAWN — the erasure's, above the consent it withdraws",
  p11e: "P11e · the marker is a LEDGER row, never a stop: no stop-list row is written for the erased number, and once its next holder says yes the gate answers on that consent (U18's ruling — no unliftable stop on erasure)",
  s1: "S1 · ⛔ smsCampaignRecipient.unlinkUser is named in src only where it must be — the two twins' members, the rule set's refusal and ONE caller, marketing/erase.ts (erasure's helper) — in ANY spelling: a dotted call, a bracket call or a destructured name",
  s2: "S2 · ⛔ the DAL refuses a missing or empty account id, an unreadable stamp, a number that is not the bare key and a bound in another spelling BEFORE it reads or writes — Prisma's NO-CONDITION trap — and nothing changes",
  w1: "W1 · the suite's own wiring: test:campaign-privacy and red:campaign-privacy run this file (the red with --prove-red), db:probe-campaign-privacy and qa:marketing-retention run the probe and the drive and stay OFF predeploy, and predeploy runs test:campaign-privacy exactly ONCE, straight after test:erasure",
};

/* ═══ THE WORLD — what a red case may swap, each part named ══════════════════════════════════════════════════════ */

type RecipientPlant = {
  unlinkUser?: (userId: string, at: string) => Promise<number>;
  listByMsisdn?: (msisdn: string, sinceIso: string) => Promise<StoredSmsCampaignRecipient[]>;
  settle?: (patches: readonly SmsCampaignRecipientSettle[], at: string) => Promise<SmsCampaignSettleResult>;
};
/** A fixture person a settle may name — what P10's needles are made of. */
type Person = { id: string; firstName: string | null; displayName: string | null; phoneE164: string };
/** What a settle writes beside the status: the gate's trail, the refusal's detail and the provider's error. */
type Marks = { trail: SmsCampaignGateTrail; skipDetail: string; error: string };
type World = {
  /** Members swapped onto the shared `db.smsCampaignRecipient` for one run, and put back after it. */
  recipient: RecipientPlant;
  /** Swapped onto `db.messagingConsent.create` for one run (R-P5 drops the erasure's WITHDRAWN row). */
  consentCreate: typeof db.messagingConsent.create | null;
  /** The export the run reads: the real one, or a planted wrapper. */
  view: typeof marketingDsarView;
  /** The erasure the run drives: the real one, or a planted wrapper. */
  erase: typeof anonymizeClosedAccount;
  /** The refusal words P8 holds to U38a's partition. */
  words: Readonly<Record<MarketingSkipReason, string>>;
  /** What a fixture hands the REAL settle door for a row's trail, detail and error — what U43b will hand it — so P10
   *  sweeps what that door writes from them (R-P10, R-P10b and R-P10c name the person in them). */
  marks: (who: Person) => Marks;
  page: string;
  doc: string;
  i18n: string;
  campaignsPage: string;
  src: Array<{ path: string; text: string }>;
  /** The two twins' source — P10's tripwire reads each one's recipient-namespace members from it. */
  twins: { memory: string; prisma: string };
  /** package.json's scripts — W1 reads the suite's own wiring from them. */
  scripts: Record<string, string>;
};
const REAL_RECIPIENT = {
  unlinkUser: db.smsCampaignRecipient.unlinkUser, listByMsisdn: db.smsCampaignRecipient.listByMsisdn, settle: db.smsCampaignRecipient.settle,
};
const REAL_CONSENT_CREATE = db.messagingConsent.create;
const REAL: World = {
  recipient: {},
  consentCreate: null,
  view: marketingDsarView,
  erase: anonymizeClosedAccount,
  words: NOT_SENT_REASON,
  marks: () => ({ trail: TRAIL.map((g) => ({ ...g })), skipDetail: "fixture detail", error: "provider: rejected" }),
  page: read("src/app/admin/retention/page.tsx"),
  doc: read("docs/DATA-RETENTION.md"),
  i18n: read("src/lib/i18n-dict.ts"),
  campaignsPage: read("src/app/admin/campaigns/page.tsx"),
  src: srcTexts(),
  twins: { memory: read("src/lib/server/store.ts"), prisma: read("src/lib/server/prisma-dal.ts") },
  scripts: (JSON.parse(read("package.json")) as { scripts?: Record<string, string> }).scripts ?? {},
};

/** Puts a world's swapped members on the shared `db` for the length of `fn`, and the real ones back after it. */
async function withPlants(w: World, fn: () => Promise<void>): Promise<void> {
  const ns = db.smsCampaignRecipient as unknown as Record<string, unknown>;
  const consent = db.messagingConsent as unknown as Record<string, unknown>;
  const saved = { unlinkUser: ns.unlinkUser, listByMsisdn: ns.listByMsisdn, settle: ns.settle, create: consent.create };
  if (w.recipient.unlinkUser) ns.unlinkUser = w.recipient.unlinkUser;
  if (w.recipient.listByMsisdn) ns.listByMsisdn = w.recipient.listByMsisdn;
  if (w.recipient.settle) ns.settle = w.recipient.settle;
  if (w.consentCreate) consent.create = w.consentCreate;
  try {
    await fn();
  } finally {
    ns.unlinkUser = saved.unlinkUser;
    ns.listByMsisdn = saved.listByMsisdn;
    ns.settle = saved.settle;
    consent.create = saved.create;
  }
}

/* ═══ THE FIXTURES — every instant, id and expected answer written HERE, by hand ═════════════════════════════════ */

const DAY = 86_400_000;
const HOUR = 3_600_000;
const T0 = Date.parse("2026-10-04T09:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
/** A staff id that must never reach a person's file. */
const OFFICER = "usr_officer_SENTINEL_u16a";
const PINNED_SW = SMS_CONSENT_WORDINGS.find((x) => x.site === "PROFILE" && x.locale === "SW")?.wording ?? "";
const PROTECTED = "protected (responsible gambling, age or account status)";
let RUN = 0;

/** A bare key on NDC 71, distinct per run and per role: 255 7 1 then seven digits — the role in the thousands, the RUN
 *  in the last three, so every mask of a number (`maskPhone` keeps its last two digits, `maskName` its last three) is
 *  this run's alone (P10). */
const keyOf = (run: number, i: number) => `2557${String(10000000 + i * 1000 + run)}`;
/** Eight characters of the ambiguity-free alphabet: two that tell the links apart, two that tell the runs apart. */
const tokenOf = (two: string, run: number) =>
  `${two}${OPTOUT_TOKEN_ALPHABET[run % 32]}${OPTOUT_TOKEN_ALPHABET[Math.floor(run / 32) % 32]}WXYZ`;
/** The reference shape, written here: the token's first two characters, then six stars. */
const refOf = (token: string) => `${token.slice(0, 2)}******`;
const LOWER = "abcdefghijklmnopqrstuvwxyz";
/** A fixture person's name, carrying the run in two letters: the first name ENDS with the one that changes every run and
 *  the surname STARTS with the slow one — so the name, the first name and the masked name (`maskName` keeps the first
 *  name's last letter and the surname's initial) are this run's alone, and P10 never meets a name an earlier red case
 *  planted. */
function named(first: string, last: string, run: number): { firstName: string; displayName: string } {
  const slow = LOWER[Math.floor(run / 26) % 26], fast = LOWER[run % 26];
  const firstName = `${first}-${slow}${fast}`;
  return { firstName, displayName: `${firstName} ${slow.toUpperCase()}-${last}` };
}

function makeUser(id: string, phoneE164: string, over: Partial<StoredUser> = {}): StoredUser {
  return {
    id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v3", acceptedTermsAt: iso(T0 - 900 * DAY), marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: iso(T0 - 900 * DAY), updatedAt: iso(T0 - 900 * DAY), lastLoginAt: null, closedAt: null,
    ...over,
  } as StoredUser;
}
function bookRow(id: string, msisdn: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  return {
    id, msisdn, rawInput: msisdn, displayName: null, email: null, ndc: msisdn.slice(3, 5), operator: null,
    source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
    importId: null, createdAt: iso(T0), createdBy: null, updatedAt: iso(T0), updatedBy: null, ...o,
  };
}
/** A blank draft, written out by hand — independent of the rule set the twins ask. */
function draft(id: string, o: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign {
  return {
    id, name: `NAME-SENTINEL ${id}`, status: "DRAFT", bodySw: `50pick: Habari ${id}.`, bodyEn: null, codingSw: "GSM7",
    segmentsSw: 1, codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null, sourcePhrase: null,
    draftRevision: 0, confirmTier: null, audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null,
    audienceWatermark: null, estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null,
    enqueuedAt: null, stopReason: null, createdBy: OFFICER, confirmedBy: null, confirmedAt: null, startedAt: null,
    pausedAt: null, finishedAt: null, createdAt: iso(T0 - 950 * DAY), updatedAt: iso(T0 - 950 * DAY), ...o,
  };
}
/** A campaign born a draft and walked through the real transition door to the status a fixture needs. */
async function campaignIn(id: string, status: SmsCampaignStatus, o: Partial<StoredSmsCampaign> = {}): Promise<void> {
  await db.smsCampaign.create(draft(id, o));
  if (status === "DRAFT") return;
  const t = (s: number) => iso(T0 - 940 * DAY + s * 1000);
  const step = async (from: SmsCampaignStatus, to: SmsCampaignStatus, patch: SmsCampaignTransitionPatch, draftRevision: number | null, when: string) => {
    const moved = await db.smsCampaign.transition(id, { from: [from], to, patch, draftRevision, at: when });
    if (!moved) throw new Error(`fixture: ${id} did not move ${from} → ${to}`);
  };
  await step("DRAFT", "CONFIRMED", {
    audienceCount: 10, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: 10, estimateTzs: 60,
    budgetTzs: 10000, confirmedBy: OFFICER, confirmedAt: t(1),
  }, 0, t(1));
  await step("CONFIRMED", "PREPARING", { startedAt: t(2) }, null, t(2));
  await step("PREPARING", "RUNNING", { enqueueCursor: "done", enqueuedAt: t(3) }, null, t(3));
  if (status === "DONE") await step("RUNNING", "DONE", { finishedAt: t(4) }, null, t(4));
  if (status === "CANCELLED") await step("RUNNING", "CANCELLED", { finishedAt: t(4), stopReason: "officer_stopped" }, null, t(4));
  if (status === "PAUSED") await step("RUNNING", "PAUSED", { pausedAt: t(4), stopReason: "officer_paused" }, null, t(4));
}
async function recipient(id: string, campaignId: string, msisdn: string, o: { userId?: string | null; contactId?: string | null; optOutToken?: string | null; createdAt: string }): Promise<void> {
  const r = await db.smsCampaignRecipient.createMany([{
    id, campaignId, msisdn, contactId: o.contactId ?? null, userId: o.userId ?? null, optOutToken: o.optOutToken ?? null, createdAt: o.createdAt,
  }]);
  if (r.inserted !== 1) throw new Error(`fixture: recipient ${id} was not inserted`);
}
let CLAIMS = 0;
/** ⭐ THROUGH THE REAL DOORS (U43a) — a fixture row settled as the engine settles one: claimed under a fresh token, the
 *  claim re-read as the slice re-reads it before the wire (`claimedBy`), then ONE patch of the settle table, which the
 *  door's own rule set judges. A nullable column the fixture leaves out is written as U43b writes it: the row's own
 *  opt-out token, else null. `held` first parks the row HELD and re-queues it (`requeueHeld`, Resume's door), so every
 *  recipient writer P10 accounts for is driven. ⛔ The row must be its campaign's FIRST free row (each fixture campaign
 *  is built so): a claim that takes any other row, or a settle that does not land, is a broken fixture and throws. */
async function settle(
  id: string, patch: { to: SmsCampaignRecipientSettle["to"] } & Record<string, unknown>, o: { held?: boolean } = {},
): Promise<void> {
  const row = mem().smsCampaignRecipients.get(id);
  if (!row) throw new Error(`fixture: no recipient ${id}`);
  const at = iso(T0);
  const claim = async (): Promise<string> => {
    const token = `fixture${String(CLAIMS++).padStart(6, "0")}`;
    const won = await db.smsCampaignRecipient.claim(row.campaignId, 1, token, at);
    const held = await db.smsCampaignRecipient.claimedBy(row.campaignId, token);
    if (won.length !== 1 || won[0].id !== id || held.length !== 1 || held[0].id !== id) {
      throw new Error(`fixture: the claim on ${row.campaignId} did not take ${id} alone`);
    }
    return token;
  };
  if (o.held) {
    const parked = await db.smsCampaignRecipient.settle(
      [{ id, claimToken: await claim(), to: "HELD", failureClass: "gate_unanswered", attempts: 1 }], at);
    const requeued = await db.smsCampaignRecipient.requeueHeld(row.campaignId, at);
    if (parked.settled !== 1 || requeued !== 1) throw new Error(`fixture: ${id} was not held and re-queued`);
  }
  const full: Record<string, unknown> = { ...patch };
  for (const key of Object.keys(SMS_RECIPIENT_SETTLE_KEYS[patch.to])) {
    if (!(key in full)) full[key] = key === "optOutToken" ? row.optOutToken : null;
  }
  const done = await db.smsCampaignRecipient.settle([{ ...full, id, claimToken: await claim() } as SmsCampaignRecipientSettle], at);
  if (done.settled !== 1 || done.lost.length !== 0) throw new Error(`fixture: the settle did not land on ${id}`);
}
/** ⚠️ BY HAND, AFTER THE DOORS — only what no U43a door writes: U46a's receipt over a row the doors settled (a failure
 *  reported after a send, the cost) and one state no door can reach, kept to hold the export's defence (PE-08). When
 *  U46a's receipt door lands in either twin, P10's tripwire names it, and these writes move to it. */
function afterTheDoors(id: string, patch: Partial<StoredSmsCampaignRecipient>): void {
  const row = mem().smsCampaignRecipients.get(id);
  if (!row) throw new Error(`fixture: no recipient ${id}`);
  Object.assign(row, patch);
}
/** A row's every column but the two erasure may write — so "kept" means kept, byte for byte. */
const snap = (id: string): string => {
  const r = mem().smsCampaignRecipients.get(id);
  return r ? JSON.stringify({ ...r, userId: "-", updatedAt: "-" }) : "absent";
};
/** The trail a settled row carries, every string of it a sentinel no person's file may hold. */
const TRAIL = [{ check: "gate", verdict: "TRAIL-SENTINEL verdict", wording: "TRAIL-SENTINEL wording", source: "TRAIL-SENTINEL source" }];

/** Every form in which a row could name a person: the account id, the anonymous handle made from it, the name, the first
 *  name, the masked name (`maskName`'s two forms — a piece of the name, or the number's last three digits when there is
 *  no name) and the masked number. ⛔ The bare number is NOT a needle: a row's `msisdn` is the record itself. */
function needlesOf(who: Person): string[] {
  const out = [who.id, displayLabel({ id: who.id, displayName: null }), maskName(null, who.phoneE164), maskPhone(who.phoneE164)];
  if (who.displayName) out.push(who.displayName, maskName(who.displayName, who.phoneE164));
  if (who.firstName) out.push(who.firstName);
  return out;
}
/** `needle` in `text` where the next character cannot continue it — so one id is never read inside a longer one. */
function holds(text: string, needle: string): boolean {
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) {
    if (!/[A-Za-z0-9_]/.test(text.charAt(at + needle.length))) return true;
  }
  return false;
}

/** ⛔ P10's TRIPWIRE · the recipient-namespace members P10 accounts for: the five WRITERS it drives (createMany seeds every
 *  fixture row; claim, settle and requeueHeld settle them — `settle()` above, `World.marks` handed to the real door;
 *  unlinkUser is erasure's own write) and the seven READS, which write nothing. A NEW member — U46a's receipt door next —
 *  is a writer P10 has never seen. ⚠️ A member joins this list only in the commit that makes P10 sweep what it writes:
 *  route the fixture writes it takes over (`afterTheDoors`, for the receipt) through it. */
const P10_ACCOUNTED: readonly string[] = [
  "createMany", "claim", "settle", "requeueHeld", "unlinkUser",
  "find", "countByStatus", "countsByCampaign", "listByMsisdn", "claimedBy", "findStranded", "lastActivity",
];
/** A twin's `smsCampaignRecipient` members, read from its SOURCE: the namespace's brace matched to its close, then every
 *  name at the members' own indent (four spaces). Null when the namespace is not there exactly once. */
function recipientMembers(src: string): string[] | null {
  const opener = `${NL}  smsCampaignRecipient: {`;
  if (src.split(opener).length !== 2) return null;
  const from = src.indexOf(opener) + opener.length - 1;
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const ch = src.charAt(i);
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return Array.from(src.slice(from, i + 1).matchAll(/^ {4}([A-Za-z0-9_]+) *:/gm)).map((m) => m[1]);
    }
  }
  return null;
}

/** S1 · every src file that may NAME the unlink, once each, and why. Any other mention — a second call in any spelling, or
 *  a second mention in one of these — is a door outside erasure. */
const UNLINK_NAMED: Readonly<Record<string, string>> = {
  "src/lib/server/store.ts": "the memory twin's member",
  "src/lib/server/prisma-dal.ts": "the Prisma twin's member",
  "src/lib/server/marketing/campaign-model.ts": "the rule set's refusal names the member it guards",
  "src/lib/server/marketing/erase.ts": "erasure's helper — the ONE caller",
};
/** The member's name as a whole word — a dotted call, a bracket key or a destructured binding all count. */
const UNLINK_WORD = /(^|[^A-Za-z0-9_$])unlinkUser(?![A-Za-z0-9_$])/gm;

/* ═══ THE BIG NUMBER — more rows than the cap, built ONCE per process, read by every run's P9 and P3g ═══════════════ */

const BIG_KEY = keyOf(999, 1);
const BIG_USER = "usr_u16a_bigY";
const BIG_T = T0 - 60 * DAY;
/** 5,005 rows, written by hand: 0 and 1 one and two minutes before the bound, 2 to 5002 a minute apart after it, and the
 *  two newest tied on one instant — 5,003 in the bound, two more than the 5,001 the read may answer. */
const BIG_ROWS = 5005;
const bigRow = (i: number) => `rcp_u16a_big_${String(i).padStart(4, "0")}`;
const BIG_TIE_A = "rcp_u16a_big_tie_a", BIG_TIE_B = "rcp_u16a_big_tie_b";
const BIG_TIE_AT = BIG_T + 6000 * 60_000;
const bigCreated = (i: number) => (i < 2 ? BIG_T - (i + 1) * 60_000 : BIG_T + i * 60_000);
/** One campaign per row (a number is on a campaign once), through the real create doors; every row PENDING, the account's own. */
async function buildBig(): Promise<void> {
  await db.user.create(makeUser(BIG_USER, `+${BIG_KEY}`, { createdAt: iso(BIG_T) }));
  const seeds: Parameters<typeof db.smsCampaignRecipient.createMany>[0] = [];
  for (let i = 0; i < BIG_ROWS; i++) {
    const campaignId = `cmp_u16a_big_${i}`;
    await db.smsCampaign.create(draft(campaignId));
    const tie = i >= BIG_ROWS - 2;
    seeds.push({
      id: i === BIG_ROWS - 2 ? BIG_TIE_A : i === BIG_ROWS - 1 ? BIG_TIE_B : bigRow(i), campaignId, msisdn: BIG_KEY,
      contactId: null, userId: BIG_USER, optOutToken: null, createdAt: iso(tie ? BIG_TIE_AT : bigCreated(i)),
    });
  }
  for (let at = 0; at < seeds.length; at += SMS_CAMPAIGN_SEED_CHUNK_MAX) {
    const chunk = seeds.slice(at, at + SMS_CAMPAIGN_SEED_CHUNK_MAX);
    const r = await db.smsCampaignRecipient.createMany(chunk);
    if (r.inserted !== chunk.length) throw new Error(`fixture: the big number inserted ${r.inserted} of ${chunk.length}`);
  }
}

/* ═══ P6's two readers — the page's SCHEDULE row and the published schedule's row, compared field by field ════════ */

const CLASSES = ["SMS campaigns and their recipients", "Marketing opt-out links"] as const;
type PageRow = { years: string; legal: string; trigger: string; swahili: string };
function pageRow(page: string, category: string): PageRow | null {
  const lines = page.split(NL).filter((l) => l.trim().startsWith(`{ category: "${category}",`));
  if (lines.length !== 1) return null;
  const l = lines[0];
  const str = (name: string): string => {
    const at = l.indexOf(`${name}: "`);
    if (at < 0) return "";
    const from = at + name.length + 3;
    return l.slice(from, l.indexOf('"', from));
  };
  const y = l.indexOf("retentionYears: ");
  return { years: y < 0 ? "" : l.slice(y + 16, l.indexOf(",", y)).trim(), legal: str("legalBasis"), trigger: str("trigger"), swahili: str("swahili") };
}
const plain = (s: string) => s.split("*").join("").split("`").join("").trim();
function docRow(doc: string, category: string): string[] | null {
  const lines = doc.split(NL).filter((l) => {
    if (!l.startsWith("| ")) return false;
    const first = plain(l.slice(2).split(" | ")[0] ?? "");
    return first === category || first.startsWith(`${category} —`);
  });
  if (lines.length !== 1) return null;
  const l = lines[0].trim();
  return l.slice(2, l.endsWith(" |") ? l.length - 2 : l.length).split(" | ").map(plain);
}
/** A trigger read without its leading "From" — the page says "From the last …", the schedule's column "The last …". */
const lead = (s: string) => {
  const t = s.toLowerCase().trim();
  return t.startsWith("from ") ? t.slice(5) : t;
};
function parityProblems(page: string, doc: string): string[] {
  const out: string[] = [];
  for (const c of CLASSES) {
    const pr = pageRow(page, c);
    const dr = docRow(doc, c);
    if (!pr) { out.push(`${c}: not exactly one row in the page's SCHEDULE`); continue; }
    if (!dr || dr.length < 6) { out.push(`${c}: not exactly one row in DATA-RETENTION §1`); continue; }
    const period = dr[1], measured = dr[2], legal = dr[3];
    if (!/^[0-9]+$/.test(pr.years) || !period.startsWith(`${pr.years} years`)) out.push(`${c}: the page says ${pr.years} years, the schedule "${period.slice(0, 40)}"`);
    if (lead(pr.trigger) !== lead(measured)) out.push(`${c}: the page's trigger "${pr.trigger}" is not the schedule's "${measured}"`);
    for (const part of pr.legal.split(";").map((x) => x.trim()).filter(Boolean)) {
      if (!legal.includes(part)) out.push(`${c}: the schedule's legal basis does not name "${part}"`);
    }
  }
  return out;
}

/* ═══ THE ASSERTIONS ════════════════════════════════════════════════════════════════════════════════════════════ */

async function run(w: World, tag: string): Promise<void> {
  const p = (s: string) => `${tag}${s}`;
  const n = RUN++;
  const K = `u16a${n}`;
  await withPlants(w, async () => {
    // ── P0 · the twin ───────────────────────────────────────────────────────────────────────────────────────────
    await check(p(L.p0), async () => {
      const id = `cmp_${K}_p0`;
      await db.smsCampaign.create(draft(id));
      return [process.env.DATABASE_URL === undefined && mem().smsCampaigns.has(id)
        && typeof REAL_RECIPIENT.unlinkUser === "function" && typeof REAL_RECIPIENT.listByMsisdn === "function",
        `memory map holds it: ${mem().smsCampaigns.has(id)}`];
    });

    // ── P1 · P2 · an erasure over three linked rows, a previous holder's and an unlinked one ────────────────────────
    const E1 = `usr_${K}_E1`, PREV1 = `usr_${K}_P1`;
    const N1 = keyOf(n, 1), N1_OLD = keyOf(n, 2), PREV1_NOW = keyOf(n, 3);
    const nameE1 = named("Zuhura", "Kamaliza", n);
    const pE1: Person = { id: E1, ...nameE1, phoneE164: `+${N1}` };
    await db.user.create(makeUser(E1, `+${N1}`, { status: "CLOSED", closedAt: iso(T0 - 30 * DAY), createdAt: iso(T0 - 200 * DAY), displayName: nameE1.displayName }));
    await db.user.create(makeUser(PREV1, `+${PREV1_NOW}`));
    const cA = `cmp_${K}_a`, cB = `cmp_${K}_b`, cC = `cmp_${K}_c`, cOld = `cmp_${K}_old`;
    await campaignIn(cA, "RUNNING");
    await campaignIn(cB, "DONE");
    await campaignIn(cC, "RUNNING");
    await campaignIn(cOld, "DONE");
    const rEa = `rcp_${K}_ea`, rEb = `rcp_${K}_eb`, rEc = `rcp_${K}_ec`, rPrev = `rcp_${K}_prev1`, rNone = `rcp_${K}_none1`;
    // The row at the old number was sent through a book row nobody links — its CONTACT link must survive the erasure.
    const bookE1 = `mc_${K}_e1old`;
    await db.marketingContact.create(bookRow(bookE1, N1_OLD));
    await recipient(rEa, cA, N1, { userId: E1, createdAt: iso(T0 - 10 * DAY) });
    await recipient(rEb, cB, N1, { userId: E1, createdAt: iso(T0 - 20 * DAY) });
    await recipient(rEc, cC, N1_OLD, { userId: E1, contactId: bookE1, createdAt: iso(T0 - 5 * DAY) });
    await recipient(rPrev, cOld, N1, { userId: PREV1, createdAt: iso(T0 - 400 * DAY) });
    await recipient(rNone, cC, N1, { userId: null, createdAt: iso(T0 - 5 * DAY) });
    await settle(rEb, {
      to: "DELIVERED", smsReference: `REF-${K}-eb`, sentAt: iso(T0 - 20 * DAY + 60_000), deliveredAt: iso(T0 - 20 * DAY + 120_000),
      locale: "SW", segments: 1, bodyLen: 30, gateTrail: w.marks(pE1).trail,
    });
    afterTheDoors(rEb, { costTzs: 6 });
    const mEc = w.marks(pE1);
    await settle(rEc, { to: "SKIPPED", skipReason: "suppressed", skipDetail: mEc.skipDetail, gateTrail: mEc.trail });
    await settle(rPrev, {
      to: "DELIVERED", smsReference: `REF-${K}-prev1`, sentAt: iso(T0 - 400 * DAY), deliveredAt: iso(T0 - 400 * DAY + 60_000), locale: "SW", gateTrail: TRAIL,
    });
    const ids1 = [rEa, rEb, rEc];
    const kept1 = new Map(ids1.map((id) => [id, snap(id)] as const));
    const prevBefore = JSON.stringify(mem().smsCampaignRecipients.get(rPrev) ?? null);
    const noneBefore = JSON.stringify(mem().smsCampaignRecipients.get(rNone) ?? null);
    const sizeBefore = mem().smsCampaignRecipients.size;
    const r1 = await w.erase(E1, { officerId: OFFICER });
    await auditFlush();
    await check(p(L.p1), () => {
      const rows = ids1.map((id) => mem().smsCampaignRecipients.get(id));
      const unlinked = rows.every((r) => r !== undefined && r.userId === null);
      const kept = ids1.every((id) => snap(id) === kept1.get(id));
      const counted = r1.ok ? r1.counts.campaignRecipientsUnlinked : -1;
      const row = getAuditPage({ limit: 100_000 }).find((e) => e.action === "privacy.erasure.completed" && e.targetId === E1);
      const audited = (row?.payload as { campaignRecipientsUnlinked?: number } | undefined)?.campaignRecipientsUnlinked;
      const contactKept = mem().smsCampaignRecipients.get(rEc)?.contactId === bookE1;
      return [r1.ok && unlinked && kept && contactKept && mem().smsCampaignRecipients.size === sizeBefore && counted === 3 && audited === 3,
        `ok ${r1.ok} · links ${rows.map((r) => (r ? r.userId ?? "null" : "GONE")).join(",")} · kept ${kept} · contact link ${contactKept} · rows ${sizeBefore} → ${mem().smsCampaignRecipients.size} · counted ${counted} · audited ${audited}`];
    });
    await check(p(L.p2), () => {
      const prevNow = mem().smsCampaignRecipients.get(rPrev);
      return [JSON.stringify(prevNow ?? null) === prevBefore && prevNow?.userId === PREV1
        && JSON.stringify(mem().smsCampaignRecipients.get(rNone) ?? null) === noneBefore,
        `the previous holder's row → ${prevNow ? prevNow.userId ?? "null" : "GONE"} · the unlinked row untouched: ${JSON.stringify(mem().smsCampaignRecipients.get(rNone) ?? null) === noneBefore}`];
    });

    // ── P7 · P7b · idempotent, and a re-run reaches a row linked after the first pass ──────────────────────────────
    const H = `usr_${K}_H`, H2 = `usr_${K}_H2`;
    const NH = keyOf(n, 4), NH2 = keyOf(n, 5);
    const nameH = named("Bahati", "Ntimbwa", n);
    const pH: Person = { id: H, ...nameH, phoneE164: `+${NH}` };
    await db.user.create(makeUser(H, `+${NH}`, { status: "CLOSED", closedAt: iso(T0 - 10 * DAY), createdAt: iso(T0 - 300 * DAY), displayName: nameH.displayName }));
    await db.user.create(makeUser(H2, `+${NH2}`, { createdAt: iso(T0 - 300 * DAY) }));
    const cH1 = `cmp_${K}_h1`, cH2 = `cmp_${K}_h2`, cH3 = `cmp_${K}_h3`;
    await campaignIn(cH1, "RUNNING");
    await campaignIn(cH2, "DONE");
    await campaignIn(cH3, "RUNNING");
    await recipient(`rcp_${K}_h1`, cH1, NH, { userId: H, createdAt: iso(T0 - 3 * DAY) });
    await recipient(`rcp_${K}_h2`, cH2, NH, { userId: H, createdAt: iso(T0 - 40 * DAY) });
    await recipient(`rcp_${K}_h2a`, cH1, NH2, { userId: H2, createdAt: iso(T0 - 2 * DAY) });
    // Held once, re-queued on Resume, then refused by the network at hand-over: the row keeps the provider's error and the
    // gate's trail (P10 sweeps both, as the settle door wrote them).
    const mH = w.marks(pH);
    await settle(`rcp_${K}_h2`, {
      to: "FAILED", smsReference: `REF-${K}-h2`, failedAt: iso(T0 - 40 * DAY + 120_000),
      failureClass: "provider_rejected", error: mH.error, gateTrail: mH.trail,
    }, { held: true });
    const h1 = await w.erase(H, { officerId: OFFICER });
    const h2 = await w.erase(H, { officerId: OFFICER });
    const d1 = await eraseMarketingFor({ userId: H2, phoneE164: `+${NH2}`, officerId: OFFICER });
    const d2 = await eraseMarketingFor({ userId: H2, phoneE164: `+${NH2}`, officerId: OFFICER });
    await check(p(L.p7), () => [
      h1.ok && !h1.alreadyErased && h1.counts.campaignRecipientsUnlinked === 2
        && h2.ok && h2.alreadyErased && h2.counts.campaignRecipientsUnlinked === 0
        && d1.campaignRecipientsUnlinked === 1 && d2.campaignRecipientsUnlinked === 0,
      `erasure ${h1.ok ? h1.counts.campaignRecipientsUnlinked : "refused"} then ${h2.ok ? h2.counts.campaignRecipientsUnlinked : "refused"} · direct ${d1.campaignRecipientsUnlinked} then ${d2.campaignRecipientsUnlinked}`]);
    // The enqueue walked the account before its number was tombstoned, and wrote this row after the first pass.
    const straggler = `rcp_${K}_h3`;
    await recipient(straggler, cH3, NH, { userId: H, createdAt: iso(T0 - DAY) });
    const h3 = await w.erase(H, { officerId: OFFICER });
    const h4 = await w.erase(H, { officerId: OFFICER });
    await check(p(L.p7b), () => [
      h3.ok && h3.alreadyErased && h3.counts.campaignRecipientsUnlinked === 1 && mem().smsCampaignRecipients.get(straggler)?.userId === null
        && h4.ok && h4.counts.campaignRecipientsUnlinked === 0,
      `re-run ${h3.ok ? h3.counts.campaignRecipientsUnlinked : "refused"} · the straggler's link ${mem().smsCampaignRecipients.get(straggler)?.userId ?? "null"} · next ${h4.ok ? h4.counts.campaignRecipientsUnlinked : "refused"}`]);

    // ── P5 · the erased number at send, beside a consenting player in the same slice ──────────────────────────────
    const F = `usr_${K}_F`, G = `usr_${K}_G`;
    const NF = keyOf(n, 6), NG = keyOf(n, 7);
    const nameF = named("Fatuma", "Mkwawa", n);
    const pF: Person = { id: F, ...nameF, phoneE164: `+${NF}` };
    await db.user.create(makeUser(F, `+${NF}`, { status: "CLOSED", closedAt: iso(T0 - 2 * DAY), marketingOptIn: true, createdAt: iso(T0 - 500 * DAY), displayName: nameF.displayName }));
    await db.user.create(makeUser(G, `+${NG}`, { marketingOptIn: true, createdAt: iso(T0 - 500 * DAY) }));
    await db.wallet.create({
      id: `wal_${G}`, userId: G, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(T0), updatedAt: iso(T0),
    } as never);
    for (const [who, key] of [[F, NF], [G, NG]] as const) {
      // D3 · the toggle AND an SMS-wording GIVEN row — what a consenting player is.
      await db.messagingConsent.create({
        id: `lc_${K}_${who}`, channel: "SMS", identifier: key, category: "MARKETING", status: "GIVEN", source: "PROFILE",
        wording: PINNED_SW, locale: "SW", evidence: "fixture", recordedBy: null, createdAt: iso(T0 - 400 * DAY),
      });
    }
    const cRun = `cmp_${K}_run`;
    await campaignIn(cRun, "RUNNING");
    const rF = `rcp_${K}_f`, rG = `rcp_${K}_g`;
    await recipient(rF, cRun, NF, { userId: F, createdAt: iso(T0 - DAY) });
    await recipient(rG, cRun, NG, { userId: G, createdAt: iso(T0 - DAY) });
    const rFBefore = snap(rF);
    await w.erase(F, { officerId: OFFICER });
    const wire = { sent: [] as SmsOutbound[], calls: 0 };
    const send = async (messages: SmsOutbound[]): Promise<SmsBatchOutcome> => {
      wire.calls++;
      wire.sent.push(...messages);
      return {
        results: messages.map((m) => ({ reference: `ref_${m.targetId}`, to: m.to, ok: true, targetType: m.targetType, targetId: m.targetId })),
        balanceTzs: 100,
      } as SmsBatchOutcome;
    };
    const outcomes = await dispatchSlice([{ ref: rF, msisdn: NF, body: "50pick: tangazo." }, { ref: rG, msisdn: NG, body: "50pick: tangazo." }], { send });
    await check(p(L.p5), () => {
      const oF = outcomes.find((o) => o.ref === rF);
      const oG = outcomes.find((o) => o.ref === rG);
      const rowF = mem().smsCampaignRecipients.get(rF);
      return [oF?.outcome === "skipped" && oF.skipReason === "consent_withdrawn" && oG?.outcome === "handed_over"
        && wire.calls === 1 && wire.sent.length === 1 && wire.sent[0]?.to === NG && !wire.sent.some((m) => m.to === NF)
        && rowF?.status === "PENDING" && rowF.userId === null && snap(rF) === rFBefore,
        `erased ${oF?.outcome}${oF?.outcome === "skipped" ? ` ${oF.skipReason}` : ""} · consenting ${oG?.outcome} · the wire: ${wire.calls} call(s), ${wire.sent.length} message(s) · the row ${rowF?.status}, link ${rowF?.userId ?? "null"}`];
    });

    // ── P11 · THE ERASURE MARKER (3a(ii)) — an account that never consented and has no book row ────────────────────
    const M = `usr_${K}_M`, M2 = `usr_${K}_M2`, GV = `usr_${K}_GV`;
    const NM = keyOf(n, 12), NM2 = keyOf(n, 13), NGV = keyOf(n, 14), NNOBODY = keyOf(n, 15);
    const ledgerKey = (identifier: string) => ({ channel: "SMS" as const, identifier, category: "MARKETING" as const });
    /** The erasure's own row, exactly as erase.ts writes it. */
    const isErasureRow = (r: StoredMessagingConsent | null | undefined): boolean =>
      !!r && r.status === "WITHDRAWN" && r.source === "OPERATOR" && r.wording === ERASURE_LEDGER_WORDING
        && r.evidence === ERASURE_EVIDENCE && r.recordedBy === OFFICER;
    // M never said yes (the switch off, no ledger row) and is in no book: before the marker its erasure wrote nothing.
    await db.user.create(makeUser(M, `+${NM}`, { status: "CLOSED", closedAt: iso(T0 - 3 * DAY), createdAt: iso(T0 - 100 * DAY) }));
    await db.user.create(makeUser(GV, `+${NGV}`, { status: "CLOSED", closedAt: iso(T0 - 3 * DAY), marketingOptIn: true, createdAt: iso(T0 - 100 * DAY) }));
    await db.messagingConsent.create({
      id: `lc_${K}_gv`, channel: "SMS", identifier: NGV, category: "MARKETING", status: "GIVEN", source: "PROFILE",
      wording: PINNED_SW, locale: "SW", evidence: "fixture", recordedBy: null, createdAt: iso(T0 - 50 * DAY),
    });
    const m1 = await w.erase(M, { officerId: OFFICER });
    const markerRows = await db.messagingConsent.listFor(ledgerKey(NM));
    await check(p(L.p11), () => [
      m1.ok && m1.counts.marketingConsentWithdrawn === 1 && markerRows.length === 1 && isErasureRow(markerRows[0]),
      `erasure ${m1.ok ? `withdrew ${m1.counts.marketingConsentWithdrawn}` : "refused"} · the number's ledger: ${markerRows.map((r) => `${r.status}/${r.source}`).join(", ") || "EMPTY"}`]);
    // The gate as a typed test asks it: the licence-outreach record OPEN, and the officer's 18+ attestation for THIS call —
    // the two ways a number with no consent can be reached. ⭐ CONTROL: the same reads and attestation reach a number
    // nobody holds, so the refusal is the marker's and not an unusable attestation's.
    const open: LicenceOutreach = { state: "open", recordedBy: OFFICER, recordedAt: iso(T0) };
    const openReads: MarketingGateReads = { ...DB_GATE_READS, outreach: () => open };
    const asked = new Date();
    const attest: TestAttestation = { officerId: OFFICER, at: asked.toISOString(), attemptRef: `att_${K}_marker`, wordingVersion: 1 };
    const erasedVerdict = await mayReceiveMarketingSms(NM, asked, openReads, { testAttestation: attest });
    const nobodyVerdict = await mayReceiveMarketingSms(NNOBODY, asked, openReads, { testAttestation: attest });
    const verdictText = (v: MarketingGateVerdict): string => (v.ok ? `allowed on ${v.basis}` : `refused ${v.skipReason}`);
    await check(p(L.p11b), () => [
      !erasedVerdict.ok && erasedVerdict.skipReason === "consent_withdrawn" && nobodyVerdict.ok && nobodyVerdict.basis === "LICENCE_TEST",
      `the erased number: ${verdictText(erasedVerdict)} · CONTROL, a number nobody holds: ${verdictText(nobodyVerdict)}`]);
    // A second pass: the erasure re-run (the number already a tombstone), and the step itself twice on an account whose
    // number is not tombstoned yet (test:erasure 12.15's shape) — which reaches step 1 both times.
    const m2 = await w.erase(M, { officerId: OFFICER });
    const e1 = await eraseMarketingFor({ userId: M2, phoneE164: `+${NM2}`, officerId: OFFICER });
    const e2 = await eraseMarketingFor({ userId: M2, phoneE164: `+${NM2}`, officerId: OFFICER });
    const rowsM = await db.messagingConsent.listFor(ledgerKey(NM));
    const rowsM2 = await db.messagingConsent.listFor(ledgerKey(NM2));
    await check(p(L.p11c), () => [
      m2.ok && m2.alreadyErased && m2.counts.marketingConsentWithdrawn === 0 && rowsM.length === 1
        && e1.marketingConsentWithdrawn === 1 && e2.marketingConsentWithdrawn === 0 && rowsM2.length === 1 && isErasureRow(rowsM2[0]),
      `re-run ${m2.ok ? m2.counts.marketingConsentWithdrawn : "refused"} (ledger ${rowsM.length}) · the step twice ${e1.marketingConsentWithdrawn} then ${e2.marketingConsentWithdrawn} (ledger ${rowsM2.length})`]);
    // Unchanged: a consent is withdrawn exactly once.
    const g1 = await w.erase(GV, { officerId: OFFICER });
    const rowsGV = await db.messagingConsent.listFor(ledgerKey(NGV));
    await check(p(L.p11d), () => [
      g1.ok && g1.counts.marketingConsentWithdrawn === 1 && rowsGV.length === 2 && isErasureRow(rowsGV[0]) && rowsGV[1]?.status === "GIVEN",
      `erasure ${g1.ok ? `withdrew ${g1.counts.marketingConsentWithdrawn}` : "refused"} · the ledger, newest first: ${rowsGV.map((r) => r.status).join(", ")}`]);
    // The number's NEXT holder says yes — a new row on the ledger's own clock, after the marker — and the gate answers on it.
    await db.messagingConsent.create({
      ...ledgerStamp(), channel: "SMS", identifier: NM, category: "MARKETING", status: "GIVEN", source: "PROFILE",
      wording: PINNED_SW, locale: "SW", evidence: "fixture", recordedBy: null,
    });
    const later = new Date();
    const lifted = await mayReceiveMarketingSms(NM, later, openReads, { testAttestation: { ...attest, at: later.toISOString() } });
    const stop = await db.suppression.find(ledgerKey(NM));
    await check(p(L.p11e), () => [
      lifted.ok && lifted.basis === "CONSENT" && stop === null,
      `after a new yes: ${verdictText(lifted)} · a stop-list row for the number: ${stop ? stop.reason : "none"}`]);

    // ── P10 · the strict sweep: after the erasures above, no row anywhere names an erased person ──────────────────
    await check(p(L.p10), () => {
      const erased: Person[] = [pE1, pH, pF, { id: H2, firstName: null, displayName: null, phoneE164: `+${NH2}` }];
      const needles = erased.flatMap(needlesOf);
      const swept = (r: StoredSmsCampaignRecipient): string[] => {
        const text = JSON.stringify({ ...r, msisdn: "-" });
        return needles.filter((x) => holds(text, x));
      };
      const all = rowsNow();
      const hits = all.flatMap((r) => swept(r).map((x) => `${r.id} holds "${x}"`));
      const eb = mem().smsCampaignRecipients.get(rEb), ec = mem().smsCampaignRecipients.get(rEc);
      const hf = mem().smsCampaignRecipients.get(`rcp_${K}_h2`);
      // ⭐ CONTROLS: the sweep reads rows that DO carry a trail, a refusal detail and an error — and it finds a first
      // name written into a copy of one of them — so a clean answer is never an empty or a blind scan.
      const carried = (eb?.gateTrail?.length ?? 0) > 0 && (ec?.skipDetail ?? "") !== "" && (hf?.error ?? "") !== "";
      const sees = eb !== undefined
        && swept({ ...eb, gateTrail: [{ check: "c", verdict: "v", wording: `Habari ${nameE1.firstName}`, source: null }] }).length > 0;
      // CONTROL: those three rows were written BY THE DOORS — each keeps the claim the settle landed under (a settled row
      // keeps its claim) — so the sweep reads what the settle door wrote (R-P10e proves the door is the real one).
      const byDoors = [eb, ec, hf].every((r) => r !== undefined && (r.claimToken ?? "").startsWith("fixture") && r.claimedAt !== null);
      // ⛔ THE TRIPWIRE (PE-01): every row swept above was settled through the doors P10 accounts for, so a member of either
      // twin's recipient namespace that P10 does not account for is a writer nobody sweeps — named, and red until P10
      // drives it.
      const twinsRead: Array<[string, string[] | null]> = [
        ["store.ts", recipientMembers(w.twins.memory)], ["prisma-dal.ts", recipientMembers(w.twins.prisma)],
      ];
      const strays = twinsRead.flatMap(([twin, members]) => (members === null
        ? [`${twin}: its smsCampaignRecipient namespace was not found exactly once`]
        : members.filter((m) => !P10_ACCOUNTED.includes(m)).map((m) => `${twin} smsCampaignRecipient.${m} is a door P10 does not drive`)));
      // CONTROL: the reader is not blind — it sees every accounted member in both twins, and reads the memory twin's
      // namespace exactly as the running twin holds it.
      const readerSees = twinsRead.every(([, members]) => members !== null && P10_ACCOUNTED.every((m) => members.includes(m)))
        && JSON.stringify([...(recipientMembers(w.twins.memory) ?? [])].sort()) === JSON.stringify(Object.keys(db.smsCampaignRecipient).sort());
      return [hits.length === 0 && carried && sees && byDoors && strays.length === 0 && readerSees,
        [...strays, ...hits].slice(0, 6).join(" · ") || `${all.length} rows swept for ${needles.length} needles · carried ${carried} · the scan sees a planted name ${sees} · written by the doors ${byDoors} · both namespaces accounted for, the reader sees them ${readerSees}`];
    });

    // ── S2 · the DAL refuses before it reads or writes ─────────────────────────────────────────────────────────────
    await check(p(L.s2), async () => {
      const linked = () => rowsNow().filter((r) => r.userId !== null).length;
      const before = linked();
      const refused = [
        await throwsAsync(() => db.smsCampaignRecipient.unlinkUser(undefined as unknown as string, iso(T0))),
        await throwsAsync(() => db.smsCampaignRecipient.unlinkUser("", iso(T0))),
        await throwsAsync(() => db.smsCampaignRecipient.unlinkUser(G, "2026-10-04 12:00")),
        await throwsAsync(() => db.smsCampaignRecipient.listByMsisdn(undefined as unknown as string, iso(T0))),
        await throwsAsync(() => db.smsCampaignRecipient.listByMsisdn(`+${NG}`, iso(T0))),
        await throwsAsync(() => db.smsCampaignRecipient.listByMsisdn(NG, "2026-10-04T12:00:00+03:00")),
      ];
      return [refused.every(Boolean) && linked() === before,
        `refused ${refused.map((x) => (x ? "y" : "N")).join("")} · linked rows ${before} → ${linked()}`];
    });

    // ── P3 · P3b · P3c · P3d · P3f · P3g · P4 · the export of a person whose number had a previous holder ─────────
    const X = `usr_${K}_X`, Q = `usr_${K}_Q`;
    const NX = keyOf(n, 8), NX_OLD = keyOf(n, 9), Q_NOW = keyOf(n, 10);
    const TX = T0 - 100 * DAY;
    await db.user.create(makeUser(X, `+${NX}`, { createdAt: iso(TX) }));
    await db.user.create(makeUser(Q, `+${Q_NOW}`));
    const bookOld = `mc_${K}_xold`;
    await db.marketingContact.create(bookRow(bookOld, NX_OLD, { userId: X, displayName: "Neema (old number)", createdAt: iso(TX + DAY), updatedAt: iso(TX + DAY) }));
    const xc = (s: string) => `cmp_${K}_x${s}`;
    const xr = (s: string) => `rcp_${K}_x${s}`;
    const BODY = {
      prev: `50pick: PREVIOUS-HOLDER-BODY ${K}.`, before: `50pick: JUST-BEFORE-BODY ${K}.`, boundary: `50pick: Mpaka ${K}.`,
      oldnum: `50pick: Namba ya zamani ${K}.`, sw: `50pick: Ujumbe wa Kiswahili ${K}.`, enSw: `50pick: Ujumbe kwa Kiswahili ${K}.`,
      en: `50pick: The English message ${K}.`, failref: `50pick: Haikufika ${K}.`,
      passed: `50pick: Ujumbe uliofika baadaye ${K}.`, viabook: `50pick: Kupitia kitabu ${K}.`, unconf: `50pick: Hakuna jibu ${K}.`,
      stranger: `50pick: STRANGER-BODY ${K}.`,
    };
    await campaignIn(xc("prev"), "DONE", { bodySw: BODY.prev });
    await campaignIn(xc("before"), "DONE", { bodySw: BODY.before });
    await campaignIn(xc("passed"), "DONE", { bodySw: BODY.passed });
    await campaignIn(xc("boundary"), "DONE", { bodySw: BODY.boundary });
    await campaignIn(xc("oldnum"), "DONE", { bodySw: BODY.oldnum });
    await campaignIn(xc("viabook"), "DONE", { bodySw: BODY.viabook });
    await campaignIn(xc("sw"), "DONE", { bodySw: BODY.sw });
    await campaignIn(xc("en"), "DONE", { bodySw: BODY.enSw, bodyEn: BODY.en, codingEn: "GSM7", segmentsEn: 1 });
    await campaignIn(xc("stranger"), "DONE", { bodySw: BODY.stranger });
    await campaignIn(xc("skip"), "DONE");
    await campaignIn(xc("prot"), "DONE");
    await campaignIn(xc("failref"), "DONE", { bodySw: BODY.failref });
    await campaignIn(xc("failno"), "DONE");
    await campaignIn(xc("stop"), "CANCELLED");
    await campaignIn(xc("wait"), "PAUSED");
    await campaignIn(xc("unknown"), "DONE");
    await campaignIn(xc("unconf"), "DONE", { bodySw: BODY.unconf });
    await campaignIn(xc("failpre"), "DONE");
    const tPrev = tokenOf("PV", n), tCarried = tokenOf("CR", n), tNew = tokenOf("NW", n), tOld = tokenOf("DL", n), tStr = tokenOf("ST", n);
    for (const [token, identifier, minted] of [
      [tPrev, NX, iso(TX - 10 * DAY)], [tCarried, NX, iso(TX - 5 * DAY)], [tNew, NX, iso(TX + 2 * DAY)],
      [tOld, NX_OLD, iso(TX + DAY + 60_000)], [tStr, NX_OLD, iso(TX + 4 * DAY + HOUR + 60_000)],
    ] as const) {
      const made = await db.marketingOptOutToken.create({ token, channel: "SMS", identifier, category: "MARKETING", createdAt: minted });
      if (!made) throw new Error(`fixture: the token ${token} is taken`);
    }
    const day = (k: number) => iso(TX + k * DAY);
    const sentAt = (k: number) => iso(TX + k * DAY + 60_000);
    const deliveredAt = (k: number) => iso(TX + k * DAY + 120_000);
    await recipient(xr("prev"), xc("prev"), NX, { userId: Q, optOutToken: tPrev, createdAt: iso(TX - 20 * DAY) });
    await recipient(xr("before"), xc("before"), NX, { createdAt: iso(TX - 1) });
    // D12 · put on a campaign for the PREVIOUS holder three days before the number passed, and sent twelve hours after it.
    await recipient(xr("passed"), xc("passed"), NX, { userId: Q, optOutToken: tCarried, createdAt: iso(TX - 3 * DAY) });
    await recipient(xr("boundary"), xc("boundary"), NX, { userId: X, createdAt: day(0) });
    await recipient(xr("oldnum"), xc("oldnum"), NX_OLD, { userId: X, contactId: bookOld, optOutToken: tOld, createdAt: day(1) });
    // D11 · sent through the person's OWN book row at the old number, with no account link — theirs through the book.
    await recipient(xr("viabook"), xc("viabook"), NX_OLD, { contactId: bookOld, createdAt: iso(TX + DAY + 6 * HOUR) });
    await recipient(xr("sw"), xc("sw"), NX, { userId: X, optOutToken: tCarried, createdAt: day(2) });
    await recipient(xr("en"), xc("en"), NX, { userId: X, optOutToken: tNew, createdAt: day(3) });
    // D11 · a STRANGER who held the old number after this person — their account since erased, so the row has no link.
    await recipient(xr("stranger"), xc("stranger"), NX_OLD, { optOutToken: tStr, createdAt: iso(TX + 4 * DAY + HOUR) });
    await recipient(xr("skip"), xc("skip"), NX, { userId: X, createdAt: day(4) });
    await recipient(xr("prot"), xc("prot"), NX, { userId: X, createdAt: day(5) });
    await recipient(xr("failref"), xc("failref"), NX, { userId: X, createdAt: day(6) });
    await recipient(xr("failno"), xc("failno"), NX, { userId: X, createdAt: day(7) });
    await recipient(xr("stop"), xc("stop"), NX, { userId: X, createdAt: day(8) });
    await recipient(xr("wait"), xc("wait"), NX, { userId: X, createdAt: day(9) });
    await recipient(xr("unknown"), xc("unknown"), NX, { userId: X, createdAt: day(10) });
    await recipient(xr("unconf"), xc("unconf"), NX, { userId: X, createdAt: day(11) });
    // PE-08 · put on a campaign for the PREVIOUS holder two days before the number passed, and FAILED after it without a
    // provider reference — read (it was sent since), never handed to the network, so it is listed as not sent: UNDATED.
    await recipient(xr("failpre"), xc("failpre"), NX, { userId: Q, createdAt: iso(TX - 2 * DAY) });
    await settle(xr("prev"), { to: "DELIVERED", smsReference: `REF-SENTINEL-${K}-prev`, sentAt: iso(TX - 20 * DAY + 60_000), deliveredAt: iso(TX - 20 * DAY + 120_000), locale: "SW", gateTrail: TRAIL });
    // Created AND sent one millisecond before the account — both arms of the bound leave it out.
    await settle(xr("before"), { to: "SENT", smsReference: `REF-SENTINEL-${K}-before`, sentAt: iso(TX - 1), locale: "SW", gateTrail: TRAIL });
    await settle(xr("passed"), { to: "DELIVERED", smsReference: `REF-SENTINEL-${K}-passed`, sentAt: iso(TX + 12 * HOUR), deliveredAt: iso(TX + 12 * HOUR + 60_000), locale: "SW", gateTrail: TRAIL });
    await settle(xr("boundary"), { to: "DELIVERED", smsReference: `REF-SENTINEL-${K}-boundary`, sentAt: sentAt(0), deliveredAt: deliveredAt(0), locale: "SW", segments: 1, gateTrail: TRAIL });
    afterTheDoors(xr("boundary"), { costTzs: 6 });
    await settle(xr("oldnum"), { to: "SENT", smsReference: `REF-SENTINEL-${K}-oldnum`, sentAt: sentAt(1), locale: "SW", gateTrail: TRAIL });
    await settle(xr("viabook"), { to: "SENT", smsReference: `REF-SENTINEL-${K}-viabook`, sentAt: iso(TX + DAY + 6 * HOUR + 60_000), locale: "SW", gateTrail: TRAIL });
    await settle(xr("sw"), { to: "DELIVERED", smsReference: `REF-SENTINEL-${K}-sw`, sentAt: sentAt(2), deliveredAt: deliveredAt(2), locale: "SW", gateTrail: TRAIL });
    await settle(xr("en"), { to: "SENT", smsReference: `REF-SENTINEL-${K}-en`, sentAt: sentAt(3), locale: "EN", gateTrail: TRAIL });
    await settle(xr("stranger"), { to: "DELIVERED", smsReference: `REF-SENTINEL-${K}-stranger`, sentAt: iso(TX + 4 * DAY + HOUR + 60_000), deliveredAt: iso(TX + 4 * DAY + HOUR + 120_000), locale: "SW", gateTrail: TRAIL });
    await settle(xr("skip"), { to: "SKIPPED", skipReason: "suppressed", skipDetail: "DETAIL-SENTINEL suppressed", gateTrail: TRAIL });
    await settle(xr("prot"), { to: "SKIPPED", skipReason: "rg_self_excluded", skipDetail: "DETAIL-SENTINEL self-excluded", gateTrail: TRAIL });
    // Sent, then a FAILED receipt (U46a's): the doors send it, the receipt's failure is written after them.
    await settle(xr("failref"), { to: "SENT", smsReference: `REF-SENTINEL-${K}-failref`, sentAt: sentAt(6), locale: "SW", gateTrail: TRAIL });
    afterTheDoors(xr("failref"), { status: "FAILED", failedAt: deliveredAt(6), failureClass: "FAILCLASS-SENTINEL", error: "ERROR-SENTINEL" });
    await settle(xr("failno"), { to: "FAILED", failedAt: sentAt(7), failureClass: "FAILCLASS-SENTINEL", error: "ERROR-SENTINEL", gateTrail: TRAIL });
    await settle(xr("wait"), { to: "HELD", failureClass: "gate_unanswered", attempts: 3 });
    await settle(xr("unknown"), { to: "SKIPPED", skipReason: "frequency_cap", skipDetail: "DETAIL-SENTINEL cap", gateTrail: TRAIL });
    // NIT-7 · handed to the wire, and the network never answered (U43-0's UNCONFIRMED): no hand-over time recorded.
    await settle(xr("unconf"), { to: "UNCONFIRMED", smsReference: `REF-SENTINEL-${K}-unconf`, locale: "SW", gateTrail: TRAIL });
    // PE-08 · a state no door reaches — a send instant on a row no network ever took — kept to hold the export's defence:
    // FAILED by the doors, the instant after them.
    await settle(xr("failpre"), { to: "FAILED", failedAt: iso(TX + 6 * HOUR + 60_000), failureClass: "FAILCLASS-SENTINEL", error: "ERROR-SENTINEL", gateTrail: TRAIL });
    afterTheDoors(xr("failpre"), { sentAt: iso(TX + 6 * HOUR) });

    // The answers, written by hand — newest first (when each row was put on its campaign).
    const wantMessages = [
      { sentAt: null, status: "no answer from the network", message: BODY.unconf, deliveredAt: null },
      { sentAt: sentAt(6), status: "not delivered", message: BODY.failref, deliveredAt: null },
      { sentAt: sentAt(3), status: "handed over", message: BODY.en, deliveredAt: null },
      { sentAt: sentAt(2), status: "delivered", message: BODY.sw, deliveredAt: deliveredAt(2) },
      { sentAt: iso(TX + DAY + 6 * HOUR + 60_000), status: "handed over", message: BODY.viabook, deliveredAt: null },
      { sentAt: sentAt(1), status: "handed over", message: BODY.oldnum, deliveredAt: null },
      { sentAt: sentAt(0), status: "delivered", message: BODY.boundary, deliveredAt: deliveredAt(0) },
      { sentAt: iso(TX + 12 * HOUR), status: "delivered", message: BODY.passed, deliveredAt: iso(TX + 12 * HOUR + 60_000) },
    ];
    const wantNotSent = [
      { at: day(10), reason: "refused by a check made at sending" },
      { at: day(9), reason: "waiting to be sent" },
      { at: day(8), reason: "the campaign was stopped before it reached this number" },
      { at: day(7), reason: "not handed to the network" },
      { at: day(5), reason: PROTECTED },
      { at: day(4), reason: "on the stop list" },
      // PE-08 · put on its campaign before the account: listed, undated.
      { at: null, reason: "not handed to the network" },
    ];
    const wantLinks = [
      { ref: refOf(tNew), createdAt: iso(TX + 2 * DAY) },
      { ref: refOf(tCarried), createdAt: null },
      { ref: refOf(tOld), createdAt: iso(TX + DAY + 60_000) },
    ];
    const view = await w.view({ id: X, phoneE164: `+${NX}`, createdAt: iso(TX) });
    const playerDoc = await exportUserData(X);
    const officerDoc = await buildDsarBundle(X);
    await check(p(L.p3), () => {
      const json = JSON.stringify(view);
      return [JSON.stringify(view.campaignMessages) === JSON.stringify(wantMessages)
        && !json.includes("PREVIOUS-HOLDER-BODY") && !json.includes("JUST-BEFORE-BODY"),
        JSON.stringify(view.campaignMessages).slice(0, 420)];
    });
    await check(p(L.p3b), () => [JSON.stringify(view.notSent) === JSON.stringify(wantNotSent), JSON.stringify(view.notSent).slice(0, 420)]);
    await check(p(L.p3c), () => [JSON.stringify(view.optOutLinks) === JSON.stringify(wantLinks), JSON.stringify(view.optOutLinks)]);
    await check(p(L.p3d), () => {
      const want = JSON.stringify({ campaignMessages: wantMessages, notSent: wantNotSent, optOutLinks: wantLinks, campaignHistoryCut: null });
      const pick = (m: unknown) => {
        const o = (m ?? {}) as Record<string, unknown>;
        return JSON.stringify({ campaignMessages: o.campaignMessages, notSent: o.notSent, optOutLinks: o.optOutLinks, campaignHistoryCut: o.campaignHistoryCut });
      };
      return [pick(playerDoc.marketing) === want && pick(officerDoc?.marketing) === want,
        `player ${pick(playerDoc.marketing) === want} · officer ${pick(officerDoc?.marketing) === want}`];
    });
    await check(p(L.p3f), () => {
      const json = JSON.stringify(view);
      const refs = view.optOutLinks.map((l) => l.ref);
      return [!json.includes("STRANGER-BODY") && !refs.includes(refOf(tStr))
        && json.includes(BODY.oldnum) && json.includes(BODY.viabook) && refs.includes(refOf(tOld)),
        `the stranger's message ${json.includes("STRANGER-BODY")} · the stranger's link ${refs.includes(refOf(tStr))} · their own there: through the account ${json.includes(BODY.oldnum)}, through their book row ${json.includes(BODY.viabook)}, the link one carried ${refs.includes(refOf(tOld))}`];
    });
    await check(p(L.p3g), async () => {
      const big = await w.view({ id: BIG_USER, phoneE164: `+${BIG_KEY}`, createdAt: iso(BIG_T) });
      const listed = big.campaignMessages.length + big.notSent.length;
      const said = big.campaignHistoryCut ?? "";
      // PE-10 · the sentence says the oldest are left out, and offers nothing more: no door can produce them.
      return [SMS_RECIPIENTS_BY_NUMBER_MAX === 5000 && listed === 5000 && said === CAMPAIGN_HISTORY_CUT
        && said.includes("oldest") && said.includes("not included") && !said.toLowerCase().includes("ask us")
        && big.notSent[0]?.at === iso(BIG_TIE_AT) && big.notSent[4999]?.at === iso(bigCreated(5))
        && view.campaignHistoryCut === null,
        `listed ${listed} · the cut line ${JSON.stringify(big.campaignHistoryCut)} · newest ${big.notSent[0]?.at} · oldest listed ${big.notSent[4999]?.at} · a whole file's cut line ${JSON.stringify(view.campaignHistoryCut)}`];
    });
    await check(p(L.p4), () => {
      const sentinels = [
        "NAME-SENTINEL", OFFICER, "TRAIL-SENTINEL", "DETAIL-SENTINEL", "REF-SENTINEL", "FAILCLASS-SENTINEL", "ERROR-SENTINEL",
        Q, bookOld, tPrev, tCarried, tNew, tOld, tStr,
        ...["prev", "before", "passed", "boundary", "oldnum", "viabook", "sw", "en", "stranger", "skip", "prot", "failref", "failno", "stop", "wait", "unknown", "unconf", "failpre"].flatMap((s) => [xr(s), xc(s)]),
      ];
      const docs: Array<[string, unknown]> = [["view", view], ["player export", playerDoc], ["officer bundle", officerDoc]];
      const hits = docs.flatMap(([name, d]) => sentinels.filter((s) => JSON.stringify(d).includes(s)).map((s) => `${name} holds ${s}`));
      const shape = new RegExp(`^[${OPTOUT_TOKEN_ALPHABET}]{2}[*]{6}$`);
      const refsOk = view.optOutLinks.length > 0 && view.optOutLinks.every((l) => typeof l.ref === "string" && shape.test(l.ref));
      // ⭐ CONTROL: the scan reads documents that DO hold the person's campaign messages — never an empty one.
      const control = JSON.stringify(view).includes(BODY.sw) && JSON.stringify(playerDoc).includes(BODY.sw) && JSON.stringify(officerDoc).includes(BODY.sw);
      return [hits.length === 0 && refsOk && control,
        hits.slice(0, 6).join(" · ") || `refs ${view.optOutLinks.map((l) => l.ref).join(",")} · control ${control}`];
    });

    // ── P6 · P6b · P6c · the published schedule and the page ────────────────────────────────────────────────────
    await check(p(L.p6), () => {
      const problems = parityProblems(w.page, w.doc);
      return [problems.length === 0, problems.join(" · ") || "both classes agree"];
    });
    await check(p(L.p6b), () => {
      const camp = pageRow(w.page, CLASSES[0]);
      const link = pageRow(w.page, CLASSES[1]);
      return [camp?.swahili === "Kampeni" && w.campaignsPage.includes('sw="Kampeni"')
        && link?.swahili === "Acha ofa na habari kwa SMS" && w.i18n.includes('stopButton: "Acha ofa na habari kwa SMS"'),
        `campaigns "${camp?.swahili}" · links "${link?.swahili}"`];
    });
    await check(p(L.p6c), () => {
      // Line by line, so a cell boundary or a line end bounds the match: the doc's every line, and the page's SCHEDULE rows.
      const unreached = /MarketingOptOutToken[^|]*not reached|tokens? sits? outside/i;
      const docHits = w.doc.split(NL).filter((l) => unreached.test(l));
      const pageHits = w.page.split(NL).filter((l) => l.trim().startsWith("{ category: ") && unreached.test(l));
      const scheduleRows = w.page.split(NL).filter((l) => l.trim().startsWith("{ category: ")).length;
      return [docHits.length === 0 && pageHits.length === 0 && scheduleRows >= 15,
        [...docHits, ...pageHits].map((l) => l.trim().slice(0, 120)).join(" · ") || `the old claim is gone from the schedule and from ${scheduleRows} page rows`];
    });

    // ── P8 · the refusal words keep the split's partition ───────────────────────────────────────────────────────────
    await check(p(L.p8), () => {
      const reasons = Object.keys(AUDIENCE_BUCKET_OF) as MarketingSkipReason[];
      const sameKeys = reasons.length > 5 && [...reasons].sort().join(",") === Object.keys(w.words).sort().join(",");
      const filled = reasons.every((r) => typeof w.words[r] === "string" && w.words[r].length > 0);
      const bad: string[] = [];
      for (const a of reasons) {
        for (const b of reasons) {
          if ((AUDIENCE_BUCKET_OF[a] === AUDIENCE_BUCKET_OF[b]) !== (w.words[a] === w.words[b])) bad.push(`${a}/${b}`);
        }
      }
      return [sameKeys && filled && bad.length === 0 && w.words.rg_self_excluded === PROTECTED,
        bad.slice(0, 4).join(", ") || `${reasons.length} reasons, ${new Set(Object.values(w.words)).size} distinct words`];
    });

    // ── P9 · the memory read's bound (both arms), order and cap ─────────────────────────────────────────────────
    {
      // A small number: rows put on a campaign before the bound — one sent after it (in, D12), one sent before it and
      // one never sent (out) — and one put on at the bound itself (in).
      const N9 = keyOf(n, 11);
      const T9 = T0 - 50 * DAY;
      const r9 = (s: string) => `rcp_${K}_n9${s}`;
      for (const [s, created] of [["at", T9], ["late", T9 - 2 * HOUR], ["early", T9 - 3 * HOUR], ["never", T9 - HOUR]] as const) {
        const cid = `cmp_${K}_n9${s}`;
        await db.smsCampaign.create(draft(cid));
        await recipient(r9(s), cid, N9, { createdAt: iso(created) });
      }
      await settle(r9("late"), { to: "SENT", smsReference: `REF-${K}-n9late`, sentAt: iso(T9 + 30_000), locale: "SW", gateTrail: TRAIL });
      await settle(r9("early"), { to: "SENT", smsReference: `REF-${K}-n9early`, sentAt: iso(T9 - 1), locale: "SW", gateTrail: TRAIL });
      await check(p(L.p9), async () => {
        const small = await db.smsCampaignRecipient.listByMsisdn(N9, iso(T9));
        const big = await db.smsCampaignRecipient.listByMsisdn(BIG_KEY, iso(BIG_T));
        const bigOut = [bigRow(0), bigRow(1), bigRow(2), bigRow(3)];
        return [SMS_RECIPIENTS_BY_NUMBER_MAX === 5000
          && small.map((r) => r.id).join(",") === [r9("at"), r9("late")].join(",")
          && big.length === 5001 && big[0]?.id === BIG_TIE_B && big[1]?.id === BIG_TIE_A
          && big[2]?.id === bigRow(5002) && big[5000]?.id === bigRow(4) && big.every((r) => r.msisdn === BIG_KEY)
          && !big.some((r) => bigOut.includes(r.id)),
          `small [${small.map((r) => r.id).join(",")}] · big ${big.length} rows · first ${big[0]?.id} ${big[1]?.id} ${big[2]?.id} · last ${big[big.length - 1]?.id}`];
      });
    }

    // ── S1 · the one writer ───────────────────────────────────────────────────────────────────────────────────────
    await check(p(L.s1), () => {
      // Every MENTION of the member, over decommented text — so a bracket call or a destructured name is seen too.
      const named = w.src
        .map((f) => ({ path: f.path, n: (f.text.match(UNLINK_WORD) ?? []).length }))
        .filter((x) => x.n > 0);
      const got = named.map((x) => x.path).sort();
      const once = named.every((x) => x.n === 1);
      return [JSON.stringify(got) === JSON.stringify(Object.keys(UNLINK_NAMED).sort()) && once,
        `named in [${named.map((x) => `${x.path} ×${x.n}`).join(", ")}]`];
    });

    // ── W1 · the suite's own wiring ─────────────────────────────────────────────────────────────────────────────
    await check(p(L.w1), () => {
      const s = w.scripts;
      const chain = (s.predeploy ?? "").split("&&").map((x) => x.trim());
      const at = chain.indexOf("npm run test:campaign-privacy");
      const runs = chain.filter((x) => x === "npm run test:campaign-privacy").length;
      const keys = s["test:campaign-privacy"] === "tsx scripts/campaign-privacy.test.mts"
        && s["red:campaign-privacy"] === "tsx scripts/campaign-privacy.test.mts --prove-red"
        && (s["db:probe-campaign-privacy"] ?? "").includes("scripts/live/campaign-privacy-pg-probe.mts")
        && (s["qa:marketing-retention"] ?? "").includes("scripts/live/marketing-u16a-retention-drive.mjs");
      const afterErasure = at > 0 && chain[at - 1] === "npm run test:erasure";
      const offPredeploy = !chain.some((x) => x.includes("db:probe-campaign-privacy") || x.includes("qa:marketing-retention"));
      return [keys && runs === 1 && afterErasure && offPredeploy,
        `keys ${keys} · on predeploy ${runs} time(s) · straight after test:erasure ${afterErasure} · probe and drive off predeploy ${offPredeploy}`];
    });
  });
}

/* ═══ THE RED CASES — each a defect somebody would plausibly write, planted in memory ════════════════════════════ */

/** A text with `from` replaced — refused unless `from` is found exactly once (a plant that misses proves nothing). */
function plant(text: string, from: string, to: string): string {
  const parts = text.split(from);
  if (parts.length !== 2) throw new Error(`the plant's anchor is found ${parts.length - 1} times, not once`);
  return parts.join(to);
}
/** The memory twin's read, re-written WITHOUT its rule set — at the cap a plant names, and with or without the bound's
 *  sent arm (D12) — the shape four plants need. */
const unguardedRead = async (msisdn: string, sinceIso: string, cap: number, sentArm = true): Promise<StoredSmsCampaignRecipient[]> => {
  const since = Date.parse(sinceIso);
  return rowsNow()
    .filter((r) => r.msisdn === msisdn && (Date.parse(r.createdAt) >= since || (sentArm && r.sentAt !== null && Date.parse(r.sentAt) >= since)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))
    .slice(0, cap)
    .map((r) => ({ ...r }));
};
/** The numbers of a person's own linked book rows other than the account's — where D11's link rule applies. */
const otherNumbersOf = async (u: { id: string; phoneE164: string }): Promise<string[]> =>
  (await db.marketingContact.listByUserId(u.id)).map((c) => c.msisdn).filter((m) => m !== u.phoneE164.slice(1));

/** A case reddens `expect` — and every label in `also`, when one defect must show in more than one place. */
const CASES: Array<{ name: string; expect: string; also?: string[]; build: () => World }> = [
  {
    name: "R-P1 · unlinkUser skipped — the erasure leaves every campaign row linked to the erased account",
    expect: L.p1,
    build: () => ({ ...REAL, recipient: { unlinkUser: async () => 0 } }),
  },
  {
    name: "R-P1b · the recipient rows DELETED at erasure — the record that a number was messaged is gone",
    expect: L.p1,
    build: () => ({
      ...REAL,
      recipient: {
        unlinkUser: async (userId: string) => {
          let gone = 0;
          for (const r of rowsNow()) if (r.userId === userId) { mem().smsCampaignRecipients.delete(r.id); gone++; }
          return gone;
        },
      },
    }),
  },
  {
    name: "R-P1c · the unlink also clears the CONTACT link — the record loses the book row it was sent through",
    expect: L.p1,
    build: () => ({
      ...REAL,
      recipient: {
        unlinkUser: async (userId: string, stamp: string) => {
          let unlinked = 0;
          for (const r of rowsNow()) {
            if (r.userId !== userId) continue;
            r.userId = null;
            r.contactId = null;
            r.updatedAt = stamp;
            unlinked++;
          }
          return unlinked;
        },
      },
    }),
  },
  {
    name: "R-P2 · the erasure unlinks by the NUMBER as well as the link — a previous holder's record loses its account",
    expect: L.p2,
    build: () => ({
      ...REAL,
      recipient: {
        unlinkUser: async (userId: string, stamp: string) => {
          const numbers = new Set(rowsNow().filter((r) => r.userId === userId).map((r) => r.msisdn));
          let unlinked = 0;
          for (const r of rowsNow()) {
            if (r.userId === null || (r.userId !== userId && !numbers.has(r.msisdn))) continue;
            r.userId = null;
            r.updatedAt = stamp;
            unlinked++;
          }
          return unlinked;
        },
      },
    }),
  },
  {
    name: "R-P3 · the export's read without the creation bound — a previous holder's messages land in the new owner's file",
    expect: L.p3,
    build: () => ({ ...REAL, recipient: { listByMsisdn: async (msisdn: string) => REAL_RECIPIENT.listByMsisdn(msisdn, "1970-01-01T00:00:00.000Z") } }),
  },
  {
    name: "R-P3s · the export's read bounds by creation alone — a message queued for the number's previous holder but SENT after it passed to this person leaves their file (D12)",
    expect: L.p3,
    build: () => ({ ...REAL, recipient: { listByMsisdn: async (msisdn: string, sinceIso: string) => unguardedRead(msisdn, sinceIso, SMS_RECIPIENTS_BY_NUMBER_MAX + 1, false) } }),
  },
  {
    name: "R-P3b · a row put on its campaign BEFORE the account is dated in notSent — the previous holder's campaign date in this person's file (PE-08)",
    expect: L.p3b,
    build: () => ({
      ...REAL,
      view: async (u) => {
        const v = await marketingDsarView(u);
        // The defect as written — `at: r.createdAt` whatever its age: each undated entry gets its own row's instant back.
        const reached = (r: StoredSmsCampaignRecipient) => r.status === "SENT" || r.status === "DELIVERED" || r.status === "UNCONFIRMED"
          || (r.status === "FAILED" && r.smsReference !== null);
        const older = (await REAL_RECIPIENT.listByMsisdn(u.phoneE164.slice(1), u.createdAt))
          .filter((r) => Date.parse(r.createdAt) < Date.parse(u.createdAt) && !reached(r))
          .map((r) => r.createdAt);
        let i = 0;
        return { ...v, notSent: v.notSent.map((x) => (x.at === null && i < older.length ? { ...x, at: older[i++] } : x)) };
      },
    }),
  },
  {
    name: "R-P3c · every link at the number listed with its date, whoever it was minted for",
    expect: L.p3c,
    build: () => ({
      ...REAL,
      view: async (u) => {
        const v = await marketingDsarView(u);
        const all = await db.marketingOptOutToken.listFor(u.phoneE164.slice(1));
        return { ...v, optOutLinks: all.map((t) => ({ ref: optOutTokenRef(t.token), createdAt: t.createdAt })) };
      },
    }),
  },
  {
    name: "R-P3f · the link rule dropped on the person's other numbers — a stranger's message at their old number lands in their file (D11)",
    expect: L.p3f,
    build: () => ({
      ...REAL,
      view: async (u) => {
        const v = await marketingDsarView(u);
        const extra: typeof v.campaignMessages = [];
        for (const m of await otherNumbersOf(u)) {
          for (const r of await REAL_RECIPIENT.listByMsisdn(m, u.createdAt)) {
            if (r.userId === u.id || r.contactId !== null || r.sentAt === null) continue;
            const campaign = await db.smsCampaign.find(r.campaignId);
            extra.push({ sentAt: r.sentAt, status: "delivered", message: campaign?.bodySw ?? "", deliveredAt: r.deliveredAt });
          }
        }
        return { ...v, campaignMessages: [...v.campaignMessages, ...extra] };
      },
    }),
  },
  {
    name: "R-P3f2 · every link minted at the person's old number since the account listed, carried or not — the stranger's own stop link in their file (D11)",
    expect: L.p3f,
    build: () => ({
      ...REAL,
      view: async (u) => {
        const v = await marketingDsarView(u);
        const extra: typeof v.optOutLinks = [];
        for (const m of await otherNumbersOf(u)) {
          for (const t of await db.marketingOptOutToken.listFor(m)) {
            const ref = optOutTokenRef(t.token);
            if (Date.parse(t.createdAt) >= Date.parse(u.createdAt) && !v.optOutLinks.some((l) => l.ref === ref)) extra.push({ ref, createdAt: t.createdAt });
          }
        }
        return { ...v, optOutLinks: [...v.optOutLinks, ...extra] };
      },
    }),
  },
  {
    name: "R-P3g · the read stops AT the cap — a number holding more lists its newest 5,000 and the file never says the oldest are missing (D10)",
    expect: L.p3g,
    build: () => ({ ...REAL, recipient: { listByMsisdn: async (msisdn: string, sinceIso: string) => unguardedRead(msisdn, sinceIso, SMS_RECIPIENTS_BY_NUMBER_MAX) } }),
  },
  {
    name: "R-P4 · the LIVE token exported in place of its reference — anybody holding the file can stop or restart the person's marketing",
    expect: L.p4,
    build: () => ({
      ...REAL,
      view: async (u) => {
        const v = await marketingDsarView(u);
        const live = await db.marketingOptOutToken.listFor(u.phoneE164.slice(1));
        return { ...v, optOutLinks: v.optOutLinks.map((l) => ({ ...l, ref: live.find((t) => optOutTokenRef(t.token) === l.ref)?.token ?? l.ref })) };
      },
    }),
  },
  {
    name: "R-P4b · the raw recipient row exported — the row id, the gate trail and the provider reference in a person's file",
    expect: L.p4,
    build: () => ({
      ...REAL,
      view: async (u) => {
        const v = await marketingDsarView(u);
        const raw = await REAL_RECIPIENT.listByMsisdn(u.phoneE164.slice(1), u.createdAt);
        return { ...v, campaignMessages: raw as unknown as typeof v.campaignMessages };
      },
    }),
  },
  {
    name: "R-P5 · the erasure's WITHDRAWN ledger row never written — the erased number reaches the gate's contact path instead of a refusal of its own",
    expect: L.p5,
    build: () => ({ ...REAL, consentCreate: async (row) => (row.status === "WITHDRAWN" ? row : REAL_CONSENT_CREATE(row)) }),
  },
  {
    name: "R-P6 · the page row's period changed alone — /admin/retention says 5 years while the published schedule says 7",
    expect: L.p6,
    build: () => ({
      ...REAL,
      page: plant(REAL.page, 'category: "SMS campaigns and their recipients", swahili: "Kampeni", retentionYears: 7,', 'category: "SMS campaigns and their recipients", swahili: "Kampeni", retentionYears: 5,'),
    }),
  },
  {
    name: "R-P6b · an invented Swahili gloss on the campaign row (plan §5.13: copied glosses only)",
    expect: L.p6b,
    build: () => ({ ...REAL, page: plant(REAL.page, 'swahili: "Kampeni", retentionYears: 7,', 'swahili: "Kampeni za SMS", retentionYears: 7,') }),
  },
  {
    name: "R-P6c · the marketing-consent row's old line restored — the links read as unreached again",
    expect: L.p6c,
    build: () => ({ ...REAL, doc: REAL.doc + NL + "Neither store has a period of its own yet and `MarketingOptOutToken` is not reached." }),
  },
  {
    name: "R-P6c2 · the page's marketing-consent row says the opt-out tokens sit outside it — the stale claim back on /admin/retention while the published schedule is clean",
    expect: L.p6c,
    build: () => ({
      ...REAL,
      page: plant(REAL.page, 'storage: "Postgres (flag cleared nightly)" }', 'storage: "Postgres (flag cleared nightly; the opt-out tokens sit outside this row)" }'),
    }),
  },
  {
    name: "R-P7b · a re-run never reaches the campaign records — the row linked after the first pass keeps the erased account",
    expect: L.p7b,
    build: () => ({
      ...REAL,
      erase: async (id, opts) => {
        const linkedBefore = new Map(rowsNow().filter((r) => r.userId === id).map((r) => [r.id, r.updatedAt] as const));
        const out = await anonymizeClosedAccount(id, opts);
        if (out.ok && out.alreadyErased) {
          for (const [rid, stamp] of linkedBefore) {
            const r = mem().smsCampaignRecipients.get(rid);
            if (r) { r.userId = id; r.updatedAt = stamp; }
          }
          out.counts.campaignRecipientsUnlinked = 0;
        }
        return out;
      },
    }),
  },
  {
    name: "R-P8 · a protected reason itemised in the export's words — self-exclusion named on its own",
    expect: L.p8,
    build: () => ({ ...REAL, words: { ...NOT_SENT_REASON, rg_self_excluded: "self-excluded" } }),
  },
  {
    name: "R-P9 · the memory read without its cap — every row of a number in one read",
    expect: L.p9,
    build: () => ({ ...REAL, recipient: { listByMsisdn: async (msisdn: string, sinceIso: string) => unguardedRead(msisdn, sinceIso, Number.MAX_SAFE_INTEGER) } }),
  },
  {
    name: "R-P10 · the gate trail records the RENDERED greeting — the person's first name outlives their erasure in the campaign record",
    expect: L.p10,
    build: () => ({
      ...REAL,
      marks: (who) => ({ ...REAL.marks(who), trail: [{ check: "consent", verdict: "GIVEN", wording: `Habari ${who.firstName ?? "rafiki"}, ofa mpya leo`, source: "PROFILE" }] }),
    }),
  },
  {
    name: "R-P10b · the refusal detail names the account it refused — the erased account's id stays in the record",
    expect: L.p10,
    build: () => ({ ...REAL, marks: (who) => ({ ...REAL.marks(who), skipDetail: `account ${who.id} is closed` }) }),
  },
  {
    name: "R-P10c · the provider's error scrubbed by MASKING the number instead of removing it — the masked number stays in the record",
    expect: L.p10,
    build: () => ({ ...REAL, marks: (who) => ({ ...REAL.marks(who), error: `destination ${maskPhone(who.phoneE164)} unreachable` }) }),
  },
  {
    name: "R-P10d · a receipt door (U46a's) lands in the Prisma twin's recipient namespace and P10 never drives it — the next writer of a row could name the person and the sweep would stay green",
    expect: L.p10,
    build: () => ({
      ...REAL,
      twins: {
        ...REAL.twins,
        prisma: plant(REAL.twins.prisma, `${NL}  smsCampaignRecipient: {`, `${NL}  smsCampaignRecipient: {${NL}    recordReceipt: async (id: string): Promise<boolean> => id.length > 0,`),
      },
    }),
  },
  {
    // ⭐ THE ROUTING'S OWN RED: the settle DOOR writes the account it settled into the trail (a re-link "for the record").
    // Only a sweep of rows the real door settled sees it — were the fixtures settled by hand again, this would stay green.
    name: "R-P10e · the settle door itself writes the row's account into the gate trail — the erased account's id outlives the erasure, written by the door, not by the caller",
    expect: L.p10,
    build: () => ({
      ...REAL,
      recipient: {
        settle: async (patches, at) => REAL_RECIPIENT.settle(patches.map((x) => {
          if (!("gateTrail" in x)) return x;
          const account = mem().smsCampaignRecipients.get(x.id)?.userId ?? "none";
          return { ...x, gateTrail: [...x.gateTrail, { check: "account", verdict: account, wording: null, source: null }] };
        }), at),
      },
    }),
  },
  {
    name: "R-P11 · the erasure marker reverted to U18b's GIVEN-only rule — an account that never consented leaves no WITHDRAWN row, so its tombstoned number reads as a stranger's and a typed test's attestation reaches it",
    expect: L.p11b,
    also: [L.p11],
    build: () => ({
      ...REAL,
      consentCreate: async (row) => {
        if (row.status === "WITHDRAWN" && row.evidence === ERASURE_EVIDENCE) {
          // The rule before the marker: nothing is written for a number whose latest row is not a consent to withdraw.
          const latest = await db.messagingConsent.latestFor({ channel: row.channel, identifier: row.identifier, category: row.category });
          if (latest?.status !== "GIVEN") return row;
        }
        return REAL_CONSENT_CREATE(row);
      },
    }),
  },
  {
    name: "R-P11e · the erasure writes an OPERATOR stop-list row on the account's number instead — a stop nobody can lift, so the number's next holder is refused for ever",
    expect: L.p11e,
    build: () => ({
      ...REAL,
      erase: async (id, opts) => {
        const before = await db.user.findById(id);
        const out = await anonymizeClosedAccount(id, opts);
        const key = before ? before.phoneE164.slice(1) : "";
        if (out.ok && !out.alreadyErased && /^255[0-9]{9}$/.test(key)) {
          await db.suppression.create({
            id: `sup_planted_${id}`, channel: "SMS", identifier: key, category: "MARKETING", reason: "OPERATOR",
            evidence: "erasure", recordedBy: null, createdAt: new Date().toISOString(), liftedAt: null, liftedReason: null,
          });
        }
        return out;
      },
    }),
  },
  {
    name: "R-S1 · a second caller of unlinkUser in src — a path that strips account links outside erasure",
    expect: L.s1,
    build: () => ({ ...REAL, src: [...REAL.src, { path: "src/app/admin/campaigns/planted.ts", text: "export const x = (id: string, at: string) => db.smsCampaignRecipient.unlinkUser(id, at);" }] }),
  },
  {
    name: "R-S1b · a second caller written with brackets (smsCampaignRecipient['unlinkUser']) — the spelling a search for the dotted call cannot see",
    expect: L.s1,
    build: () => ({ ...REAL, src: [...REAL.src, { path: "src/app/admin/campaigns/planted.ts", text: 'export const x = (id: string, at: string) => db.smsCampaignRecipient["unlinkUser"](id, at);' }] }),
  },
  {
    name: "R-W1 · test:campaign-privacy taken off predeploy — every assertion here stays green and stops gating a deploy",
    expect: L.w1,
    build: () => {
      const chain = (REAL.scripts.predeploy ?? "").split("&&").map((x) => x.trim());
      const without = chain.filter((x) => x !== "npm run test:campaign-privacy");
      if (without.length === chain.length) throw new Error("the plant's entry is not on predeploy");
      return { ...REAL, scripts: { ...REAL.scripts, predeploy: without.join(" && ") } };
    },
  },
  {
    name: "R-S2 · the twin asks no rule set — a missing id unlinks quietly and a spelling no row holds reads as nothing",
    expect: L.s2,
    build: () => ({
      ...REAL,
      recipient: {
        unlinkUser: async (userId: string, stamp: string) => {
          let unlinked = 0;
          for (const r of rowsNow()) {
            if (r.userId !== userId) continue;
            r.userId = null;
            r.updatedAt = stamp;
            unlinked++;
          }
          return unlinked;
        },
        listByMsisdn: async (msisdn: string, sinceIso: string) => unguardedRead(msisdn, sinceIso, SMS_RECIPIENTS_BY_NUMBER_MAX + 1),
      },
    }),
  },
];

// The big number is built ONCE, before the first run: 5,005 campaigns and rows that every run's P9 and P3g read.
await buildBig();

if (!PROVE_RED) {
  await run(REAL, "");
  console.log("");
  console.log("─".repeat(64));
  console.log(`  CAMPAIGN PRIVACY: ${pass} passed, ${fail} failed`);
  console.log("  The record that we messaged a number stays; which account held it goes.");
  console.log("─".repeat(64));
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  // ⛔ A red proof over a red baseline proves nothing — the untouched world must be green first.
  pass = 0; fail = 0; failed.length = 0;
  await run(REAL, "base:");
  if (fail !== 0) problems.push(`the untouched world is RED (${failed.join(" | ")})`);
  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let world: World;
    try {
      world = c.build();
    } catch (err) {
      problems.push(`case ${i + 1}: the plant did not apply — ${(err as Error).message}`);
      continue;
    }
    await run(world, tag);
    const wanted = [c.expect, ...(c.also ?? [])];
    const missing = wanted.filter((x) => !failed.includes(`${tag}${x}`));
    if (fail === 0) problems.push(`case ${i + 1} stayed GREEN`);
    else if (missing.length > 0) problems.push(`case ${i + 1} red, but not on "${missing.join('" and "')}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${wanted.join(" + ")}${NL}`);
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
