/**
 * test:campaign-models — U35's guard (marketing campaigns' data model). COMMIT A (U35a, S10 2026-10-01): the
 * MARKETING purpose, alone in its own migration, in the schema and the store's union — and nobody writing it yet.
 * COMMIT B (U35b, S10 2026-10-02): the campaign tables — §1 the migration and the schema read as TEXT, §2 the rules
 * EXECUTED on the memory twin (the plan's Accept among them), §3 the MARKETING writer pin.
 * COMMIT C (U43-0, S10 2026-10-04 — ENGINE-SPEC §4.2, decision E4): UNCONFIRMED joins the recipient status in its OWN
 * one-statement ADD VALUE migration, deployed one push before any writer (55P04). §1.8c holds the schema, the store
 * and campaign-model to the order Postgres holds after EVERY migration; §1.12 and §1.13 hold the ADD VALUE alone and
 * after the tables; §2.13 executes the counts knowing the value and still refusing a status nobody knows (P8); §3.2
 * pins its writers — none in this commit.
 * COMMIT D (U43a, S10 2026-10-04 — ENGINE-SPEC §4.10): the engine's recipient doors EXECUTED on the memory twin —
 * §2.14 ⭐ five concurrent claimers over 1,000 rows win 1,000 rows, each once (the plan's RED for the conditional claim);
 * §2.15 the claim's shape; §2.16 ⭐ a settle lands by the row's id and the claim it names, never by its place, and is
 * otherwise `lost`; §2.17 ⭐ the settle table, every row refused and accepted; §2.18 a refused batch, and a reference
 * another row holds, change nothing; §2.19 the release and the hold; §2.20 ⭐ UNCONFIRMED never goes back to PENDING;
 * §2.21 the stranded read; §2.22 the requeue; §2.23 `lastActivity`; §2.24 the reaper's evidence read; §2.25 every door
 * asks the rule set first; §2.26 `claimedBy`; §2.27 the claim's bound IS `BATCH_MAX`; §2.28 ⛔ the settle's write — its
 * row of the table, never the account link, never a clock in a send instant (U16a PE-01, PE-08). (The spec numbered its
 * settle case §2.12; on this tree §2.12 is U35b's SET NULL and §2.13 U43-0's, so U43a's cases start at §2.14.) §3.2's
 * pin now also sees the settle door's spelling, `to: "UNCONFIRMED"` in a patch — U43b, the first writer, declares itself
 * there. ⭐ The review of 2026-10-07 made each case able to fail for the reason it names: §2.20 holds a token-less
 * UNCONFIRMED row (the claim's status test on its own), §2.21 claims a later id earlier (the stranded order), §2.24 gives
 * the newer message the lower reference, §2.23 holds a release and a requeue that keep their claim's instant (D15),
 * §2.15 a reused token (D16), §2.18 the P2002 code both twins carry.
 * COMMIT E (U46a, S14 2026-10-07 — ENGINE-SPEC §4.14, decision E28): the receipt door EXECUTED on the memory twin —
 * §2.29 ⭐ a receipt moves a SENT, an UNCONFIRMED and a still-claimed row forward, the claim kept and nothing else written;
 * §2.30 ⛔ it never moves a settled row and never a row that is not the message's (number, reference), and a reference
 * another row holds is P2002; §2.31 its rule set refuses before the door reads, and `receiptWrite` writes exactly its
 * columns. A receipt only moves a row OUT of UNCONFIRMED, so §3.2's pin stays empty for it.
 * COMMIT F (U43b-2, S14 2026-10-07 — ENGINE-SPEC §4.13 decisions 3 and 6): the engine declares itself — §3.1's
 * MARKETING_WRITERS gains `engine.ts` (its one send, purpose MARKETING) and §3.2's UNCONFIRMED_WRITERS gains
 * `engine-rules.ts` (the settle and the reaper's patches to UNCONFIRMED); and §2.32 executes DC-4's send record on the
 * memory twin — written only into a row a receipt settled under the same claim with no trail yet, exactly its six columns,
 * never the status, its rule set first.
 *
 * ⭐ WHY A SUITE OF ITS OWN: `red:dal-parity` can never plant a defect in schema.prisma or a migration (it reads them
 * from ROOT, not KP_SRC), so a shape that lives in SQL needs an in-process suite that is HANDED the text and can be
 * handed a planted one. The plan's old RED for the unique key ("drop the index → U43's control fails") cannot run
 * before U43 exists, so its executable home is §2.1 here: the dedupe fixture fails when the key leaves the schema or
 * the migration, and when the twin stops honouring it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION — `--prove-red` plants each defect in memory (a text, or one twin member swapped)
 * and requires the MATCHING assertion to fail. This file changes nothing on disk.
 * ⛔ §2 RUNS ON THE MEMORY TWIN ONLY. `DATABASE_URL` is removed BEFORE the store is imported (the store picks its
 * twin at import), and 2.0 asserts the writes land in the memory maps — so a run on a machine with a database
 * configured can never put a campaign into it.
 *
 * Run:  npm run test:campaign-models
 * Red:  npm run red:campaign-models
 */
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import type {
  StoredSmsCampaign, StoredSmsCampaignRecipient, SmsCampaignRecipientSeed, SmsCampaignRecipientStatus,
  SmsCampaignDraftPatch, SmsCampaignDraftGuard, SmsCampaignTransition, SmsCampaignTransitionPatch,
  SmsCampaignRecipientSettle, SmsCampaignGateTrail, StoredSmsMessage, SmsRecipientReceipt, SmsRecipientReceiptResult,
  SmsRecipientSendRecord, SmsRecipientSendRecordResult,
} from "../src/lib/server/store.ts";

// ⛔ BEFORE THE STORE IS IMPORTED — see the header.
delete process.env.DATABASE_URL;
const { db } = await import("../src/lib/server/store.ts");
const CM = await import("../src/lib/server/marketing/campaign-model.ts");
const { isGatewayMsisdn } = await import("../src/lib/phone-normalize.ts");
const { MEMBERS_KEY_HEX_CHARS } = await import("../src/lib/marketing/campaign-confirm.ts");
const { contactAudienceWrites, WHOLE_BOOK } = await import("../src/lib/server/marketing/audience.ts");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROVE_RED = process.argv.includes("--prove-red");
const lf = (s: string) => s.replace(/\r\n/g, "\n");
/** SQL with its `--` comments and blank lines removed — what Postgres actually runs. */
const sqlStatements = (sql: string) => lf(sql).split("\n").filter((l) => !/^\s*--/.test(l) && l.trim() !== "").join("\n");

// ⛔ U43-0 added the lines below WITHOUT A BACKSLASH (the tools that write this file decode escapes): line breaks are
// built with String.fromCharCode, and every pattern uses a character class instead of an escape.
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);
/** Every run of whitespace one space — so a statement split over lines still meets a one-line pattern. */
function squash(s: string): string {
  let out = s.split(CR).join(" ").split(NL).join(" ").split(TAB).join(" ");
  while (out.includes("  ")) out = out.split("  ").join(" ");
  return out.trim();
}

type Migration = { folder: string; sql: string };
function readMigrations(): Migration[] {
  const dir = join(ROOT, "prisma", "migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "migration.sql")))
    .map((e) => ({ folder: e.name, sql: readFileSync(join(dir, e.name, "migration.sql"), "utf8") }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

/** Every src/ file's text, for the writer population (§3). */
function srcTexts(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push({ path: p.slice(ROOT.length).replace(/\\/g, "/").replace(/^\//, ""), text: decomment(readFileSync(p, "utf8")) });
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

/**
 * ⛔ THE FILES ALLOWED TO SEND WITH `purpose: "MARKETING"`. U37b's test send declared itself here in the change that
 * built it (behind the closed `marketing.sms.live` switch, DECISIONS X14); U43b-2's slice declared itself in its own
 * commit (`engine.ts` — `engineSend`, ENGINE-SPEC §4.13 decision 3) — a send under the purpose from anywhere else is a
 * campaign path nobody reviewed.
 */
export const MARKETING_WRITERS: readonly string[] = [
  "src/lib/server/marketing/campaign-test-send.ts",
  "src/lib/server/marketing/engine.ts",
];

/**
 * ⛔ THE FILES ALLOWED TO WRITE A RECIPIENT'S STATUS AS `UNCONFIRMED` (U43-0 · ENGINE-SPEC §3.2, decision E4). EMPTY ON
 * PURPOSE: the value ships ONE DEPLOY BEFORE its first writer (55P04), so in U43-0 nothing may write it. U43b's slice
 * (its settle and its reaper) declares itself here in its own commit; U46a's receipt arm only moves a row OUT of the
 * value, so it joins only if that ever changes.
 * ⚠️ A TEXT PIN, like MARKETING_WRITERS (§3.2's controls prove what it sees): an object key `status: "UNCONFIRMED"`, an
 * assignment `.status = "UNCONFIRMED"` and SQL's `"status" = 'UNCONFIRMED'` (which a WHERE also spells — declare it,
 * or say it is a read). It does NOT see a status passed through a variable or a generated enum member.
 * ⭐ U43a widened it to its settle door's own spelling: a patch's `to: "UNCONFIRMED"` followed by a comma or a brace (the
 * house's trailing-comma style) is a write — a TYPE's `to: "UNCONFIRMED";` is not — so U43b's settle and reaper cannot
 * hand the door the value undeclared. The door itself writes `status` from a variable and so is not a writer here.
 * ⭐ U43b-2 (ENGINE-SPEC §4.13 decision 3): its first writer — the engine's pure settlement table and reaper,
 * `engine-rules.ts`, whose patches move a row to UNCONFIRMED (E3 · E4 · E6); `engine.ts` hands them to the door and spells
 * the value only in a comparison.
 */
export const UNCONFIRMED_WRITERS: readonly string[] = [
  "src/lib/marketing/engine-rules.ts",
];

/* ═══ THE WORLD — the texts §1 reads and the twin §2 drives, each swappable by a red case ═══════════════════════ */

type CampaignNs = typeof db.smsCampaign;
type RecipientNs = typeof db.smsCampaignRecipient;
/** U43a · the message namespace — §2.24 drives its `findByTargets`, the reaper's evidence read. */
type MessageNs = typeof db.smsMessage;
type Twin = { campaign: CampaignNs; recipient: RecipientNs; message: MessageNs };
/** The rule set itself (`campaign-model.ts`), executed directly by §2.9–§2.11 (and U43a's settle table by §2.17, its
 *  write by §2.28; U46a's receipt rules and write by §2.31) — swappable, so a red case can delete one refusal from it.
 *  (Both twins call these very functions first: `test:dal-parity` §26.shape, §26.u43a and §26.u46a.) */
type Rules = {
  assertTransitionShape: typeof CM.assertTransitionShape;
  assertDraftPatch: typeof CM.assertDraftPatch;
  assertNewCampaign: typeof CM.assertNewCampaign;
  assertSettle: typeof CM.assertSettle;
  settleWrite: typeof CM.settleWrite;
  assertReceipt: typeof CM.assertReceipt;
  receiptWrite: typeof CM.receiptWrite;
  /** U43b-2 · DC-4's send record — its rules and write (§2.32). */
  assertSendRecord: typeof CM.assertSendRecord;
  sendRecordWrite: typeof CM.sendRecordWrite;
};
type World = {
  migrations: Migration[];
  schema: string;
  store: string;
  smsCompose: string;
  /** U43a · sms-blackball.ts, decommented — §2.27 reads `BATCH_MAX` from it. */
  blackball: string;
  src: Array<{ path: string; text: string }>;
  twin: Twin;
  rules: Rules;
};
const REAL: World = {
  migrations: readMigrations(),
  schema: lf(readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8")),
  store: decomment(lf(readFileSync(join(ROOT, "src", "lib", "server", "store.ts"), "utf8"))),
  smsCompose: decomment(lf(readFileSync(join(ROOT, "src", "lib", "sms-compose.ts"), "utf8"))),
  blackball: decomment(lf(readFileSync(join(ROOT, "src", "lib", "server", "sms-blackball.ts"), "utf8"))),
  src: srcTexts(),
  twin: { campaign: db.smsCampaign, recipient: db.smsCampaignRecipient, message: db.smsMessage },
  rules: {
    assertTransitionShape: CM.assertTransitionShape, assertDraftPatch: CM.assertDraftPatch, assertNewCampaign: CM.assertNewCampaign,
    assertSettle: CM.assertSettle, settleWrite: CM.settleWrite, assertReceipt: CM.assertReceipt, receiptWrite: CM.receiptWrite,
    assertSendRecord: CM.assertSendRecord, sendRecordWrite: CM.sendRecordWrite,
  },
};

/** The memory twin's three campaign maps. §2 clears them before every run, so each run starts from nothing. */
type MemMaps = {
  smsCampaigns: Map<string, StoredSmsCampaign>;
  smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient>;
  recipientsByCampaignMsisdn: Map<string, string>;
};
function mem(): MemMaps {
  const s = (globalThis as unknown as { __50PICK_STORE?: MemMaps }).__50PICK_STORE;
  if (!s || !s.smsCampaigns || !s.smsCampaignRecipients || !s.recipientsByCampaignMsisdn) {
    throw new Error("the memory store has no campaign maps — §2 runs on the memory twin only");
  }
  return s;
}

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

const L = {
  s11: "1.1 ⛔ exactly ONE migration adds MARKETING to SmsPurpose, and that file holds NO other statement (55P04)",
  s12: "1.2 the ADD VALUE migration sorts BEFORE the campaign tables' migration — the tables ship one migration later",
  s13: "1.3 exactly ONE migration creates the two tables and the three new types (SmsCampaignStatus, SmsCampaignRecipientStatus, SmsEncoding), and no other migration creates any of them",
  s14: "1.4 every OTHER index the two models declare is in the migrations under its name — Prisma's own, or the schema's map — the tables migration's or a later one's, and the migrations hold none the schema lacks (the one key is 2.1's)",
  s14b: "1.4b ⭐ the live page's two reads, each with its index (the U47b-1 review and its re-review): the recipient model declares (campaignId, status, skipReason, failureClass) by its map name and (campaignId, claimedAt), and the ONE migration that names the outcome index holds EXACTLY those two CREATE INDEX IF NOT EXISTS, in that order, and nothing else (no DROP, no CONCURRENTLY: prisma migrate runs a file in one transaction)",
  s15: "1.5 the schema's two models and the migration's two tables declare the SAME columns — name, type, nullability and default, one by one",
  s16: "1.6 ⛔ no CASCADE link: the campaign link is RESTRICT and contactId / userId are SET NULL — in the migration AND the schema, under Prisma's constraint names",
  s17: "1.7 ⛔ expand-only: the tables migration only CREATEs types, tables and indexes and ADDs the recipient's foreign keys — no DROP, RENAME, ALTER TYPE, CONCURRENTLY or MARKETING",
  s18: "1.8 the schema's enum SmsPurpose and the store's SmsPurpose union are the same set, and both carry MARKETING",
  s18b: "1.8b SmsCampaignStatus is ONE set in the schema, the migration and the store, in the schema's order in campaign-model.ts — and holds no approval status (OQ1)",
  s18c: "1.8c SmsCampaignRecipientStatus is ONE set in the schema, the migrations and the store — the schema and campaign-model.ts in the order Postgres holds after EVERY migration (the tables' CREATE TYPE of six, then each ADD VALUE as it places it) — HELD (X12) and UNCONFIRMED (E4) included",
  s18d: "1.8d SmsEncoding is ONE set in the schema, the migration and sms-compose.ts, and the store types both codings with sms-compose's union",
  s19: "1.9 every timestamp in both models is TIMESTAMPTZ(3) — @db.Timestamptz(3) in the schema, never a naive TIMESTAMP(3) in the migration",
  s110: "1.10 ⛔ no stored counter (OD26): SmsCampaign's only numeric columns are the saved segments, the revision, the confirmed population and the frozen estimate and budget",
  s111: "1.11 ⛔ a recipient holds LINKS, never copies: no name, e-mail or account-phone column on SmsCampaignRecipient, and both back-relations are declared",
  s112: "1.12 ⛔ exactly ONE migration adds UNCONFIRMED to SmsCampaignRecipientStatus, and that file holds NO other statement (55P04 — U43-0 deploys alone, one push before its first writer)",
  s113: "1.13 that ADD VALUE migration sorts AFTER the campaign tables' migration — the type exists before it is extended",
  s20: "2.0 CONTROL · §2 runs on the MEMORY twin: DATABASE_URL is absent and a campaign written lands in the memory map",
  s21: "2.1 ⭐ the dedupe fixture: 1,000 seeds, then the same 1,000 people (ids re-minted) shuffled among 200 new ones, give 1,200 rows, all PENDING — on the key the database enforces (the schema's @@unique([campaignId, msisdn]) and the migration's unique index)",
  s22: "2.2 the key is PER CAMPAIGN: one number on two campaigns is two rows",
  s23: "2.3 ⛔ a batch is refused WHOLE — a +255 or 07 spelling, 1,001 seeds, a missing campaign or contact, a repeated id, a seed that settles a row — and nothing is written; a seed already on the campaign is skipped before its links are checked, as Postgres does",
  s24: "2.4 ⭐ a confirmed scope cannot be widened: a draft save lands on its revision (the text stored), the confirmation freezes, then a wider audience is refused, a frozen key is refused outside DRAFT and nothing returns to DRAFT — the stored filter byte-identical",
  s25: "2.5 ⭐ two racing transitions from RUNNING (to PAUSED and to CANCELLED) leave exactly ONE winner, the row holds the winner's status and reason, and a third writer from RUNNING is refused",
  s26: "2.6 ⭐ draftRevision is the ONE optimistic mechanism: two saves on one revision — exactly one lands and its text is the one stored; a stale revision is refused; a save without one throws",
  s27: "2.7 countByStatus returns every recipient status, zeros included, in the schema's order — for a campaign with rows and for one with none",
  s28: "2.8 a recipient is born PENDING with nothing settled, and a campaign is born a blank DRAFT — born CONFIRMED, born with a count, an ids audience, a non-canonical filter, an extra or a missing key are each refused, nothing written",
  s29: "2.9 ⭐ the lifecycle rules refuse every move a campaign does not make — to inside from (two winners), out of or onto a terminal row, back to DRAFT, a DRAFT skipping its confirmation, a phone number as a cursor — and pass the moves it does",
  s210: "2.10 ⭐ the confirmation is ONE move: its fields only with DRAFT → CONFIRMED, on a revision, and all of them — who, when, a population of at least one, the tier and its watermark, the frozen estimates — every gap refused",
  s211: "2.11 the draft-save and birth rules refuse a body without its saved verdict, a half-removed English variant, an emptied column and a value its column cannot take — and the watermark width is U40's MEMBERS_KEY_HEX_CHARS",
  s212: "2.12 a contact removed from the book leaves its campaign recipient row in place with the link set to null — Postgres' SET NULL, mirrored by the memory twin",
  s213: "2.13 ⭐ the counts KNOW UNCONFIRMED (U43-0): a campaign with 2 UNCONFIRMED and 2 PENDING rows counts both, UNCONFIRMED last — and a status this code does not know is still REFUSED, never dropped (P8)",
  s214: "2.14 ⭐ FIVE CONCURRENT CLAIMERS over 1,000 rows (the memory twin, interleaved between every claim and its settle): exactly 1,000 distinct rows won in total, no row twice, every settle landed and every row settled — the plan's RED for the conditional claim (U43a)",
  s215: "2.15 the claim takes the FIRST `limit` rows of ITS campaign that are PENDING and unclaimed, in id order (E21), writes the token, the instant and the stamp and nothing else, answers exactly the rows now holding the token as copies — a held, settled or claimed row is never taken, a campaign with none answers [] — and ⛔ a token a row already holds (a settled row keeps its claim's) is refused before anything is written, in any campaign (D16)",
  s216: "2.16 ⭐ A SETTLE LANDS BY THE ROW'S ID AND THE CLAIM IT NAMES, NEVER BY ITS PLACE: patches handed in shuffled land each on its own row; a foreign claim, a row already settled, a reaped row claimed again by another slice and a missing id are each LOST, the row untouched — and the rest of the batch still lands",
  s217: "2.17 ⭐ THE SETTLE TABLE (ENGINE-SPEC §4.10 decision 3, + the reaper's DELIVERED and SENT): a key missing, a key another status owns, a phone number in a detail, an error, a trail's words or a source (in any spelling, separators and all), a trail of 25 checks or a 201-character string, a delta of 2, one row or one reference twice, 201 patches, an instant in another spelling — each REFUSED; every lawful patch the slice and the reaper write passes",
  s218: "2.18 a refused settle batch changes NOTHING — one bad patch refuses the whole batch before any write — and a batch carrying a reference another row already holds is refused whole too, carrying Prisma's code P2002 (the memory twin of the transaction rolling back)",
  s219: "2.19 a release (to PENDING) clears the claim's token and moves attempts on by exactly its delta, 1 or 0, keeping the claim's instant and writing nothing else; a HELD keeps its claim and writes its class and attempts; every settle stamps the caller's instant — and a released row is claimable again, a held one is not",
  s220: "2.20 ⭐ UNCONFIRMED NEVER GOES BACK TO PENDING: a release, a hold or a second settle of an UNCONFIRMED row — even under its own claim — is lost and changes nothing; the requeue moves the HELD row beside it and never it; a new claim never takes it — not even one whose token was cleared, so the claim's STATUS test is held on its own",
  s221: "2.21 findStranded answers ITS campaign's PENDING rows holding a claim STRICTLY older than the cutoff — never a claim at the cutoff, a younger one, a settled or an unclaimed row — OLDEST CLAIM FIRST (a higher id claimed earlier comes first) then id, at most `limit`",
  s222: "2.22 requeueHeld moves exactly its campaign's HELD rows to PENDING — attempts 0, the claim's token and the class cleared, the claim's instant kept, stamped — answers how many, touches no other status and no other campaign, and the requeued rows are claimable again",
  s223: "2.23 ⭐ lastActivity is the newest claim instant on the campaign and NEVER MOVES BACKWARDS while a page drives it — a settled row's claim counts, a released or requeued row keeps its claim's instant (D15), a later claim moves it on, another campaign's never counts — and null when nothing was ever claimed",
  s224: "2.24 smsMessage.findByTargets answers the NEWEST message of the asked type for each target — by createdAt (the newer one holding the LOWER reference, so a pick by reference is seen), a tie broken by the higher reference — one per target, none for a target without one, ordered by target id, as copies — an empty list is an empty answer, and 201 ids are refused",
  s225: "2.25 every U43a door asks the rule set FIRST: a lost campaign id, a limit of 0 or above the claim's bound, a token or an instant in another spelling, a cutoff that is not an instant, an empty target — each refused, and nothing written (Prisma reads undefined as NO CONDITION)",
  s226: "2.26 claimedBy answers the campaign's rows still PENDING under the claim — what U43b's beforeSend re-reads (E6): a row settled, released or held since is not among them, and another token or campaign reads nothing",
  s227: "2.27 the claim's bound IS the send's chunk: SMS_RECIPIENT_CLAIM_MAX equals sms-blackball's BATCH_MAX (E11 — one slice, one sendBatch chunk)",
  s228: "2.28 ⛔ THE SETTLE'S WRITE (U16a PE-01, PE-08): for every lawful patch settleWrite writes EXACTLY its row of the table, the status and the caller's stamp — never userId, the account link only erasure clears, nor the number or the contact, even when a patch carries them — and every send instant as the patch carries it (sentAt is the hand-over copied from the message), never the settle's clock; the trail copied",
  s229: "2.29 ⭐ THE RECEIPT DOOR (U46a · E28): a DELIVERED receipt moves a SENT row, an UNCONFIRMED row (its reference written where it had none, E4) and a row a slice still holds (PENDING, D5) to DELIVERED, and a FAILED receipt moves one to FAILED with its class receipt:<token> and its words — each at the receipt's own instant, the claim kept, nothing else written — and the slice's later settle of the held row is lost",
  s230: "2.30 ⛔ MONOTONIC AND IDENTITY-CHECKED: a receipt never moves a DELIVERED, FAILED, SKIPPED or HELD row (settled) — a late FAILED after its DELIVERED among them — nor a row of another number or one holding another message's reference (mismatch), nor a row that is not there (not_found); nothing is written in each, and a reference another row holds is refused whole with Prisma's code P2002",
  s232: "2.32 ⭐ DC-4 · THE SEND RECORD (U43b-2): into a row a receipt settled before the slice's settle — DELIVERED or FAILED, under the slice's claim, no trail yet — recordSend writes EXACTLY the trail, the token, the variant, the size, the length and the hand-over instant (null for an unanswered message) and the stamp, never the status, the reference, the receipt's own instant, class and words or the claim; a second record, a SENT or a still-PENDING row, another claim's record and a row that is not there write nothing; its rule set refuses first (a lost id, a key it does not have or one missing, a claim of another shape, a trail holding a phone number or none, a token with a space, a variant, a size, a length or an instant in another form), by the door before it reads; and sendRecordWrite writes exactly its columns",
  s231: "2.31 the receipt's rule set first: a lost id, a key a receipt does not have or one missing, a number in another spelling, a verdict other than DELIVERED or FAILED, an instant in another spelling, a FAILED token untrimmed, empty, too long or a phone number, a FAILED description over 200 characters or holding a phone number — each REFUSED, and by the door before it reads; every lawful receipt passes; and receiptWrite writes EXACTLY its columns — never the claim, sentAt, attempts, the account link, the number or the contact",
  s31: "3.1 ⛔ no src file sends with purpose MARKETING unless it is a declared MARKETING_WRITER (U37b's test send, U43b-2's slice)",
  s32: "3.2 ⛔ no src file writes a recipient's status as UNCONFIRMED unless it is a declared UNCONFIRMED_WRITER (U43b-2's settlement table and reaper, its first writer — the value shipped one deploy before) — and the pin sees a key, an assignment, SQL and a settle patch's `to:` (U43a), and not a comparison, a read or a type",
};

/* ═══ THE TEXT READERS (§1) ═══════════════════════════════════════════════════════════════════════════════════ */

const NEW_TYPES = ["SmsCampaignStatus", "SmsCampaignRecipientStatus", "SmsEncoding"] as const;
const TABLES = ["SmsCampaign", "SmsCampaignRecipient"] as const;
/** THE ONE KEY — §2.1 owns it; §1.4 compares every other index. */
const ONE_KEY = "SmsCampaignRecipient_campaignId_msisdn_key";

/** The migration that creates the campaign table (null when none does). */
const tablesMigration = (w: World): Migration | null =>
  w.migrations.find((m) => /CREATE TABLE "SmsCampaign" \(/.test(sqlStatements(m.sql))) ?? null;
/** The schema's `model X {…}`, up to its closing brace at the start of a line. */
function schemaModel(schema: string, name: string): string {
  const at = schema.indexOf(`model ${name} {`);
  if (at < 0) return "";
  const end = schema.indexOf("\n}", at);
  return end < 0 ? "" : schema.slice(at, end + 2);
}
/** Prisma comments (`//` and `///`) out of one line. */
const uncomment = (line: string) => line.replace(/\/\/.*$/, "");
/** The values of `enum X { … }` in declared order. */
function schemaEnum(schema: string, name: string): string[] {
  const m = new RegExp(`\\benum ${name} \\{([^}]*)\\}`).exec(schema);
  if (!m) return [];
  return m[1].split("\n").map((l) => uncomment(l).trim()).filter((l) => /^[A-Z][A-Z0-9_]*$/.test(l));
}
/** The values of `CREATE TYPE "X" AS ENUM (…)` in declared order. */
function migrationEnum(sql: string, name: string): string[] {
  const m = new RegExp(`CREATE TYPE "${name}" AS ENUM \\(([^)]*)\\)`).exec(sqlStatements(sql));
  return m ? Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]) : [];
}
/** The members of `export type X = "A" | "B";` in a TypeScript source, in written order. */
function tsUnion(src: string, name: string): string[] {
  const m = new RegExp(`export type ${name} =\\s*([^;]+);`).exec(src);
  return m ? Array.from(m[1].matchAll(/"([A-Z][A-Z0-9_]*)"/g)).map((x) => x[1]) : [];
}
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const sameSet = (a: readonly string[], b: readonly string[]) => same([...a].sort(), [...b].sort());

/* ── U43-0 · the enum Postgres holds after EVERY migration, the one ADD VALUE, and its writers ── */

/** ⭐ The values Postgres holds for an enum after EVERY migration, in Postgres' own order: the one CREATE TYPE, then each
 *  later `ALTER TYPE … ADD VALUE` in folder order — appended, or placed BEFORE / AFTER a neighbour when it says so; an
 *  IF NOT EXISTS on a value already there adds nothing. null when an ADD VALUE names the type before any migration
 *  created it, or a neighbour the type does not hold — Postgres would refuse that file. */
function migratedEnum(migrations: readonly Migration[], name: string): string[] | null {
  const addValue = new RegExp(`ALTER TYPE "${name}" ADD VALUE (?:IF NOT EXISTS )?'([^']+)'(?: (BEFORE|AFTER) '([^']+)')?`, "g");
  let values: string[] | null = null;
  for (const m of migrations) {
    const created = migrationEnum(m.sql, name);
    if (created.length > 0) values = [...created];
    for (const a of squash(sqlStatements(m.sql)).matchAll(addValue)) {
      if (values === null) return null;
      const value: string = a[1];
      const where: string | undefined = a[2];
      const neighbour: string | undefined = a[3];
      if (values.includes(value)) continue;
      if (where === undefined || neighbour === undefined) { values.push(value); continue; }
      const at = values.indexOf(neighbour);
      if (at < 0) return null;
      values.splice(where === "AFTER" ? at + 1 : at, 0, value);
    }
  }
  return values;
}
/** U43-0's one statement, whitespace squashed: `ALTER TYPE "SmsCampaignRecipientStatus" ADD VALUE [IF NOT EXISTS] 'UNCONFIRMED'`. */
const ADD_UNCONFIRMED = /ALTER TYPE "SmsCampaignRecipientStatus" ADD VALUE (IF NOT EXISTS )?'UNCONFIRMED'/;
/** The migrations that add UNCONFIRMED — read from what Postgres RUNS (comments out), so a header that quotes the
 *  statement is never counted as a second one. */
const unconfirmedAdds = (w: World): Migration[] => w.migrations.filter((m) => ADD_UNCONFIRMED.test(squash(sqlStatements(m.sql))));
/** A migration's statements — comments and blank lines out, split on the semicolon. */
const statementsOf = (m: Migration): string[] => sqlStatements(m.sql).split(";").map((x) => x.trim()).filter(Boolean);
/** §3.2's pin: a LITERAL write of the value — an object key, an assignment (never a comparison) or SQL's
 *  `"status" = '…'`. The status word in either case (SQL), the value in Postgres' own spelling only: the dispatch
 *  outcome "unconfirmed" is another word for another thing. U43a's second arm: a settle patch's `to: "UNCONFIRMED"`,
 *  then a comma or a brace (never a type member's semicolon). */
const WRITES_UNCONFIRMED = /[Ss][Tt][Aa][Tt][Uu][Ss]"?[ ]*(?::|=(?!=))[ ]*["'`]UNCONFIRMED["'`]|(?:^|[^A-Za-z0-9_$])to[ ]*:[ ]*["'`]UNCONFIRMED["'`][ ]*[,}]/m;

type Col = { type: string; notNull: boolean; def: string | null };
const colText = (c: Col | undefined) => (c ? `${c.type}${c.notNull ? " NOT NULL" : ""}${c.def !== null ? ` DEFAULT ${c.def}` : ""}` : "absent");
const SCALAR_SQL: Record<string, string> = {
  String: "TEXT", Int: "INTEGER", BigInt: "BIGINT", Float: "DOUBLE PRECISION", Boolean: "BOOLEAN", Json: "JSONB",
};
/** A model's SCALAR columns as Postgres types — what the migration must create. Relation fields are skipped. */
function schemaColumns(model: string, enums: ReadonlySet<string>): Map<string, Col> {
  const out = new Map<string, Col>();
  for (const raw of model.split("\n").slice(1)) {
    const line = uncomment(raw).trim();
    if (!line || line.startsWith("@@") || line === "}") continue;
    const m = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)(\[\])?(\?)?(.*)$/.exec(line);
    if (!m) continue;
    const [, name, type, list, opt, attrs] = m;
    if (list) continue;
    let sql: string | null = null;
    if (type in SCALAR_SQL) sql = SCALAR_SQL[type];
    else if (type === "DateTime") sql = /@db\.Timestamptz\(3\)/.test(attrs) ? "TIMESTAMPTZ(3)" : "TIMESTAMP(3)";
    else if (type === "Decimal") {
      const d = /@db\.Decimal\((\d+),\s*(\d+)\)/.exec(attrs);
      sql = d ? `DECIMAL(${d[1]},${d[2]})` : "DECIMAL(65,30)";
    } else if (enums.has(type)) sql = `"${type}"`;
    if (sql === null) continue;
    const dm = /@default\(([^()]*(?:\(\))?)\)/.exec(attrs);
    let def: string | null = null;
    if (dm) {
      const v = dm[1].trim();
      if (v === "now()") def = "CURRENT_TIMESTAMP";
      else if (v === "cuid()" || v === "uuid()") def = null;
      else if (/^-?\d+$/.test(v)) def = v;
      else if (/^[A-Z][A-Z0-9_]*$/.test(v)) def = `'${v}'`;
      else def = v;
    }
    out.set(name, { type: sql, notNull: !opt, def });
  }
  return out;
}
/** A CREATE TABLE's columns, as the migration declares them. */
function migrationColumns(sql: string, table: string): Map<string, Col> {
  const out = new Map<string, Col>();
  const s = sqlStatements(sql);
  const at = s.indexOf(`CREATE TABLE "${table}" (`);
  if (at < 0) return out;
  const end = s.indexOf("\n);", at);
  for (const raw of s.slice(at, end < 0 ? undefined : end).split("\n").slice(1)) {
    const m = /^\s*"(\w+)"\s+("\w+"|[A-Z]+(?: PRECISION)?(?:\(\d+(?:,\d+)?\))?)(\s+NOT NULL)?(?:\s+DEFAULT\s+(.+?))?,?\s*$/.exec(raw);
    if (m) out.set(m[1], { type: m[2], notNull: !!m[3], def: m[4] ?? null });
  }
  return out;
}
const schemaEnumNames = (schema: string) => new Set(Array.from(schema.matchAll(/^enum (\w+) \{/gm), (m) => m[1]));

type Idx = { unique: boolean; name: string; cols: string[] };
const idxText = (i: Idx) => `${i.unique ? "UNIQUE " : ""}${i.name}(${i.cols.join(",")})`;
/** The indexes a model declares, NAMED as Prisma names them (`<Table>_<cols>_idx` / `_key`) — or by the block's own
 *  `map: "…"` when it gives one (U47b-1's outcome index: Prisma's own name would pass Postgres's 63 characters). */
function schemaIndexes(model: string, table: string): Idx[] {
  const out: Idx[] = [];
  for (const raw of model.split("\n")) {
    const line = uncomment(raw).trim();
    const block = /^@@(unique|index)\(\[([^\]]+)\]/.exec(line);
    if (block) {
      const cols = block[2].split(",").map((c) => c.trim());
      const mapped = /\bmap:\s*"(\w+)"/.exec(line);
      out.push({ unique: block[1] === "unique", cols, name: mapped ? mapped[1] : `${table}_${cols.join("_")}_${block[1] === "unique" ? "key" : "idx"}` });
      continue;
    }
    const field = /^([A-Za-z_]\w*)\s+\S+.*\s@unique\b/.exec(line);
    if (field) out.push({ unique: true, cols: [field[1]], name: `${table}_${field[1]}_key` });
  }
  return out;
}
/** Every `CREATE [UNIQUE] INDEX [IF NOT EXISTS] "name" ON "Table"(…)` of one table in a migration's statements. */
function migrationIndexes(sql: string, table: string): Idx[] {
  const out: Idx[] = [];
  for (const m of sqlStatements(sql).matchAll(/CREATE (UNIQUE )?INDEX (?:IF NOT EXISTS )?"(\w+)" ON "(\w+)"\(([^)]*)\)/g)) {
    if (m[3] === table) out.push({ unique: !!m[1], name: m[2], cols: m[4].split(",").map((c) => c.trim().replace(/"/g, "")) });
  }
  return out;
}
/** ⭐ U47b-1 · the outcome index — its map name, its columns in order, and the ONE migration that creates it. */
const OUTCOME_INDEX = "SmsCampaignRecipient_outcome_idx";
const OUTCOME_COLS = ["campaignId", "status", "skipReason", "failureClass"] as const;
/** ⭐ Its re-review · the view's other read (`lastActivity`, the newest claim) — Prisma's own name, the same file. */
const CLAIMED_INDEX = "SmsCampaignRecipient_campaignId_claimedAt_idx";
const CLAIMED_COLS = ["campaignId", "claimedAt"] as const;
/** The migrations AFTER the tables migration that name either campaign table at all (an index migration, or worse). */
const laterTableMigrations = (w: World, tablesFolder: string): Migration[] =>
  w.migrations.filter((m) => m.folder > tablesFolder && /"SmsCampaign(Recipient)?"/.test(sqlStatements(m.sql)));
type Fk = { name: string; col: string; ref: string; onDelete: string };
function migrationFks(sql: string, table: string): Fk[] {
  const out: Fk[] = [];
  const re = /ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("id"\) ON DELETE (SET NULL|RESTRICT|CASCADE|NO ACTION|SET DEFAULT)/g;
  for (const m of sqlStatements(sql).matchAll(re)) if (m[1] === table) out.push({ name: m[2], col: m[3], ref: m[4], onDelete: m[5] });
  return out;
}
/** `field Model? @relation(fields: [col], references: [id], onDelete: X)` → { col, ref, onDelete }. */
function schemaRelations(model: string): Array<{ col: string; ref: string; onDelete: string | null }> {
  const out: Array<{ col: string; ref: string; onDelete: string | null }> = [];
  for (const raw of model.split("\n")) {
    const m = /^\s*\w+\s+(\w+)\??\s+@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[id\](?:,\s*onDelete:\s*(\w+))?/.exec(uncomment(raw));
    if (m) out.push({ col: m[2], ref: m[1], onDelete: m[3] ?? null });
  }
  return out;
}
/** The one key, as the schema and the migration declare it (§2.1 reads both). */
function declaredOneKey(w: World): { schema: boolean; migration: boolean } {
  const model = schemaModel(w.schema, "SmsCampaignRecipient").split("\n").map(uncomment).join("\n");
  const t = tablesMigration(w);
  return {
    schema: /^\s*@@unique\(\[campaignId,\s*msisdn\]\)/m.test(model),
    migration: !!t && /CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_msisdn_key" ON "SmsCampaignRecipient"\("campaignId", "msisdn"\);/.test(sqlStatements(t.sql)),
  };
}

/* ═══ THE FIXTURES (§2) ═══════════════════════════════════════════════════════════════════════════════════════ */

const T0 = Date.parse("2026-10-02T09:00:00.000Z");
const at = (s: number) => new Date(T0 + s * 1000).toISOString();
/** A bare key: 255, then 7, then eight digits — `isGatewayMsisdn`'s one shape. */
const keyOf = (i: number) => `255710${String(i).padStart(6, "0")}`;
const OFFICER = "usr_u35b_officer";
/** U24's canonical key for "consent given" (`contactAudienceKey`), and the whole book's. */
const FILTER_GIVEN = '{"consent":["GIVEN"]}';
const FILTER_WHOLE_BOOK = "{}";

/** A blank draft, written out by hand — independent of the rule set under test. */
function draft(id: string, o: Partial<StoredSmsCampaign> = {}): StoredSmsCampaign {
  return {
    id, name: `Campaign ${id}`, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null,
    codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null,
    sourcePhrase: null, draftRevision: 0, confirmTier: null, audienceFilter: FILTER_GIVEN, audienceCount: null,
    audienceWatermark: null, estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null,
    enqueuedAt: null, stopReason: null, createdBy: OFFICER, confirmedBy: null, confirmedAt: null, startedAt: null,
    pausedAt: null, finishedAt: null, createdAt: at(0), updatedAt: at(0), ...o,
  };
}
const seed = (id: string, campaignId: string, msisdn: string): SmsCampaignRecipientSeed =>
  ({ id, campaignId, msisdn, contactId: null, userId: null, optOutToken: null, createdAt: at(1) });
/** What a confirmation freezes (U40's columns, X13/X15) — a typed tier, 1,200 people, one segment each. */
const CONFIRM: SmsCampaignTransitionPatch = {
  audienceCount: 1200, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: 1200, estimateTzs: 7200,
  budgetTzs: 8000, confirmedBy: OFFICER, confirmedAt: at(3),
};
/** A deterministic shuffle (an LCG), so a red case and the baseline see the same order. */
function shuffled<T>(xs: readonly T[], s0: number): T[] {
  const out = [...xs];
  let s = s0 >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function chunks<T>(xs: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}
async function throws(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}
const total = (counts: ReadonlyArray<{ count: number }>) => counts.reduce((n, c) => n + c.count, 0);

/* ═══ THE ASSERTIONS ══════════════════════════════════════════════════════════════════════════════════════════ */

async function run(w: World, tag: string): Promise<void> {
  const p = (s: string) => `${tag}${s}`;
  ok(p("0 · CONTROL · the migrations, the schema and the store were read"),
    w.migrations.length > 50 && w.schema.includes("enum SmsPurpose") && w.store.includes("export type SmsPurpose"), `${w.migrations.length} migrations`);

  // ── §1.1 · the ADD VALUE stands alone ──────────────────────────────────────────────────────
  const adds = w.migrations.filter((m) => /ALTER TYPE\s+"SmsPurpose"\s+ADD VALUE\s+(IF NOT EXISTS\s+)?'MARKETING'/.test(m.sql));
  const alone = adds.length === 1 && sqlStatements(adds[0].sql).trim().split(";").map((x) => x.trim()).filter(Boolean).length === 1;
  ok(p(L.s11), alone, adds.map((m) => m.folder).join(", ") || "none");

  const tables = tablesMigration(w);
  const tsql = tables ? tables.sql : "";
  const enums = schemaEnumNames(w.schema);

  // ── §1.2 · the order ───────────────────────────────────────────────────────────────────────
  await check(p(L.s12), () => [adds.length === 1 && tables !== null && adds[0].folder < tables.folder,
    `${adds[0]?.folder ?? "no ADD VALUE"} < ${tables?.folder ?? "no tables migration"}`]);

  // ── §1.3 · created once ────────────────────────────────────────────────────────────────────
  await check(p(L.s13), () => {
    const creators = (re: RegExp) => w.migrations.filter((m) => re.test(sqlStatements(m.sql))).map((m) => m.folder);
    const objects = [
      ...TABLES.map((t) => creators(new RegExp(`CREATE TABLE "${t}" \\(`))),
      ...NEW_TYPES.map((t) => creators(new RegExp(`CREATE TYPE "${t}" AS ENUM`))),
    ];
    const once = tables !== null && objects.every((f) => f.length === 1 && f[0] === tables.folder);
    return [once, objects.map((f, i) => `${[...TABLES, ...NEW_TYPES][i]}: ${f.join(",") || "none"}`).join(" · ")];
  });

  // ── §1.4 · every other index, under Prisma's names ─────────────────────────────────────────
  await check(p(L.s14), () => {
    const diffs: string[] = [];
    // ⭐ U47b-1 · the tables migration's indexes AND every later migration's on the two tables (the outcome index's file)
    const later = tables === null ? [] : laterTableMigrations(w, tables.folder);
    for (const t of TABLES) {
      const want = schemaIndexes(schemaModel(w.schema, t), t).filter((i) => i.name !== ONE_KEY).map(idxText);
      const got = [tsql, ...later.map((m) => m.sql)].flatMap((sql) => migrationIndexes(sql, t)).filter((i) => i.name !== ONE_KEY).map(idxText);
      for (const x of want) if (!got.includes(x)) diffs.push(`${t}: schema has ${x}, the migrations do not`);
      for (const x of got) if (!want.includes(x)) diffs.push(`${t}: the migrations have ${x}, the schema does not`);
      if (want.length === 0) diffs.push(`${t}: no index parsed from the schema`);
    }
    return [diffs.length === 0, diffs.join(" · ") || "indexes agree"];
  });

  // ── §1.4b · ⭐ the outcome index — one file, one statement ────────────────────────────────
  await check(p(L.s14b), () => {
    const indexes = schemaIndexes(schemaModel(w.schema, "SmsCampaignRecipient"), "SmsCampaignRecipient");
    const declared = indexes.find((i) => i.name === OUTCOME_INDEX);
    const declaredClaimed = indexes.find((i) => i.name === CLAIMED_INDEX);
    const later = tables === null ? [] : laterTableMigrations(w, tables.folder);
    // ⭐ The file is found by the outcome index's NAME (its re-review): a later contract migration on the same tables —
    // the redundant (campaignId, status) index's drop, one day — must not turn this claim red by being there.
    const file = later.find((m) => sqlStatements(m.sql).includes(`"${OUTCOME_INDEX}"`)) ?? null;
    const stmts = file === null ? [] : sqlStatements(file.sql).split(";").map((x) => x.trim()).filter(Boolean);
    const quoted = (cols: readonly string[]) => cols.map((c) => `"${c}"`).join(", ");
    const want = [
      `CREATE INDEX IF NOT EXISTS "${OUTCOME_INDEX}" ON "SmsCampaignRecipient"(${quoted(OUTCOME_COLS)})`,
      `CREATE INDEX IF NOT EXISTS "${CLAIMED_INDEX}" ON "SmsCampaignRecipient"(${quoted(CLAIMED_COLS)})`,
    ];
    const schemaOk = declared !== undefined && !declared.unique && declared.cols.join(",") === OUTCOME_COLS.join(",")
      && declaredClaimed !== undefined && !declaredClaimed.unique && declaredClaimed.cols.join(",") === CLAIMED_COLS.join(",");
    const fileOk = file !== null && JSON.stringify(stmts) === JSON.stringify(want) && !/CONCURRENTLY|DROP/i.test(sqlStatements(file.sql));
    return [schemaOk && fileOk,
      `schema ${declared ? idxText(declared) : "declares no outcome index"} · ${declaredClaimed ? idxText(declaredClaimed) : "no claimedAt index"} · file ${file?.folder ?? "none names the outcome index"} · statements ${stmts.length}: ${stmts.map((s) => s.slice(0, 70)).join(" | ") || "none"}`];
  });

  // ── §1.5 · the columns, one by one ─────────────────────────────────────────────────────────
  await check(p(L.s15), () => {
    const diffs: string[] = [];
    for (const t of TABLES) {
      const want = schemaColumns(schemaModel(w.schema, t), enums);
      const got = migrationColumns(tsql, t);
      if (want.size < 20 || got.size < 20) diffs.push(`${t}: parsed ${want.size} schema / ${got.size} migration columns`);
      for (const k of new Set([...want.keys(), ...got.keys()])) {
        const a = colText(want.get(k)), b = colText(got.get(k));
        if (a !== b) diffs.push(`${t}.${k}: schema ${a} · migration ${b}`);
      }
    }
    return [diffs.length === 0, diffs.slice(0, 4).join(" · ") || "every column agrees"];
  });

  // ── §1.6 · no CASCADE link ─────────────────────────────────────────────────────────────────
  await check(p(L.s16), () => {
    const want = ["campaignId>SmsCampaign:RESTRICT", "contactId>MarketingContact:SET NULL", "userId>User:SET NULL"];
    const fks = migrationFks(tsql, "SmsCampaignRecipient");
    const got = fks.map((f) => `${f.col}>${f.ref}:${f.onDelete}`);
    const named = fks.every((f) => f.name === `SmsCampaignRecipient_${f.col}_fkey`);
    const rel = schemaRelations(schemaModel(w.schema, "SmsCampaignRecipient")).map((r) => `${r.col}>${r.ref}:${r.onDelete}`);
    const relWant = ["campaignId>SmsCampaign:Restrict", "contactId>MarketingContact:SetNull", "userId>User:SetNull"];
    const noCascadeSql = !/ON DELETE CASCADE/.test(sqlStatements(tsql));
    const noCascadeSchema = TABLES.every((t) => !/onDelete:\s*Cascade/.test(schemaModel(w.schema, t).split("\n").map(uncomment).join("\n")));
    return [sameSet(got, want) && named && sameSet(rel, relWant) && noCascadeSql && noCascadeSchema,
      `migration [${got.join(", ")}] · schema [${rel.join(", ")}] · names ${named} · cascade-free ${noCascadeSql}/${noCascadeSchema}`];
  });

  // ── §1.7 · expand-only ─────────────────────────────────────────────────────────────────────
  await check(p(L.s17), () => {
    const sql = sqlStatements(tsql);
    const stmts = sql.split(";").map((x) => x.trim()).filter(Boolean);
    const SHAPE = /^(CREATE TYPE "\w+" AS ENUM|CREATE TABLE "(SmsCampaign|SmsCampaignRecipient)" \(|CREATE (UNIQUE )?INDEX "\w+" ON "(SmsCampaign|SmsCampaignRecipient)"\(|ALTER TABLE "SmsCampaignRecipient" ADD CONSTRAINT "\w+" FOREIGN KEY)/;
    const odd = stmts.filter((s) => !SHAPE.test(s));
    // ⚠️ `DELETE FROM`, not the bare word: every foreign key here legitimately says `ON DELETE …`.
    const banned = /\b(DROP|RENAME|CONCURRENTLY|TRUNCATE)\b|DELETE\s+FROM|ALTER\s+TYPE|'MARKETING'/i.exec(sql);
    return [tables !== null && stmts.length >= 10 && odd.length === 0 && banned === null,
      `${stmts.length} statements · odd: ${odd.map((s) => s.slice(0, 50)).join(" | ") || "none"} · banned: ${banned?.[0] ?? "none"}`];
  });

  // ── §1.8 · the enums, three ways (four for the encoding) ───────────────────────────────────
  const enumBody = (w.schema.match(/enum SmsPurpose \{([\s\S]*?)\}/) ?? ["", ""])[1];
  const enumValues = enumBody.split("\n").map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l)).sort();
  const unionText = (w.store.match(/export type SmsPurpose = ([^;]+);/) ?? ["", ""])[1];
  const unionValues = Array.from(unionText.matchAll(/"([A-Z_]+)"/g)).map((m) => m[1]).sort();
  ok(p(L.s18), enumValues.includes("MARKETING") && enumValues.join(",") === unionValues.join(","),
    `schema [${enumValues}] · store [${unionValues}]`);

  await check(p(L.s18b), () => {
    const s = schemaEnum(w.schema, "SmsCampaignStatus"), m = migrationEnum(tsql, "SmsCampaignStatus");
    const t = tsUnion(w.store, "SmsCampaignStatus"), c = [...CM.SMS_CAMPAIGN_STATUSES];
    return [s.length === 7 && same(s, m) && sameSet(s, t) && same(s, c) && !s.some((v) => /APPROV/.test(v)),
      `schema [${s}] · migration [${m}] · store [${t}] · campaign-model [${c}]`];
  });
  await check(p(L.s18c), () => {
    // U43-0: the tables migration's CREATE TYPE is applied history (six values, X12) and stays so; the set Postgres
    // holds is that, then every later ADD VALUE — and THAT is what the schema, the store and campaign-model must equal.
    const s = schemaEnum(w.schema, "SmsCampaignRecipientStatus"), m = migrationEnum(tsql, "SmsCampaignRecipientStatus");
    const pg = migratedEnum(w.migrations, "SmsCampaignRecipientStatus");
    const t = tsUnion(w.store, "SmsCampaignRecipientStatus"), c = [...CM.SMS_CAMPAIGN_RECIPIENT_STATUSES];
    return [s.length === 7 && s.includes("HELD") && s.includes("UNCONFIRMED") && m.length === 6 && pg !== null && same(s, pg)
        && sameSet(s, t) && same(s, c),
      `schema [${s}] · after every migration [${pg ?? "an ADD VALUE before its type"}] (created [${m}]) · store [${t}] · campaign-model [${c}]`];
  });
  await check(p(L.s18d), () => {
    const s = schemaEnum(w.schema, "SmsEncoding"), m = migrationEnum(tsql, "SmsEncoding"), c = tsUnion(w.smsCompose, "SmsEncoding");
    const typed = /\bcodingSw: SmsEncoding;/.test(w.store) && /\bcodingEn: SmsEncoding \| null;/.test(w.store)
      && /import type \{ SmsEncoding \} from "@\/lib\/sms-compose";/.test(w.store);
    return [s.length === 2 && same(s, m) && sameSet(s, c) && typed, `schema [${s}] · migration [${m}] · sms-compose [${c}] · store typed ${typed}`];
  });

  // ── §1.9 · Timestamptz(3), everywhere ──────────────────────────────────────────────────────
  await check(p(L.s19), () => {
    const bad: string[] = [];
    let seen = 0;
    for (const t of TABLES) {
      for (const [k, c] of schemaColumns(schemaModel(w.schema, t), enums)) {
        if (!c.type.startsWith("TIMESTAMP")) continue;
        seen++;
        if (c.type !== "TIMESTAMPTZ(3)") bad.push(`schema ${t}.${k}`);
      }
      for (const [k, c] of migrationColumns(tsql, t)) if (/^TIMESTAMP(\(|$)/.test(c.type)) bad.push(`migration ${t}.${k}`);
    }
    return [seen >= 12 && bad.length === 0, bad.join(", ") || `${seen} timestamps, every one Timestamptz(3)`];
  });

  // ── §1.10 · no stored counter ──────────────────────────────────────────────────────────────
  await check(p(L.s110), () => {
    const ALLOWED = ["segmentsSw", "segmentsEn", "draftRevision", "audienceCount", "estimateSegments", "estimateTzs", "budgetTzs"];
    const NUMERIC = (type: string) => /^(INTEGER|BIGINT|DOUBLE PRECISION|REAL|SMALLINT|DECIMAL)/.test(type);
    const COUNTER = (k: string) => /^(sent|delivered|failed|skipped|held|pending|accepted|handedOver|total|recipients?|count)/i.test(k) || (/Count$/.test(k) && k !== "audienceCount");
    const fromSchema = [...schemaColumns(schemaModel(w.schema, "SmsCampaign"), enums)].filter(([, c]) => NUMERIC(c.type)).map(([k]) => k);
    const fromSql = [...migrationColumns(tsql, "SmsCampaign")].filter(([, c]) => NUMERIC(c.type)).map(([k]) => k);
    const allNames = [...schemaColumns(schemaModel(w.schema, "SmsCampaign"), enums).keys(), ...migrationColumns(tsql, "SmsCampaign").keys()];
    const extra = [...fromSchema, ...fromSql].filter((k) => !ALLOWED.includes(k));
    const named = allNames.filter(COUNTER);
    return [fromSchema.length >= 5 && extra.length === 0 && named.length === 0,
      `numeric [${[...new Set([...fromSchema, ...fromSql])]}] · not allowed [${extra}] · counter-named [${named}]`];
  });

  // ── §1.11 · links, never copies ────────────────────────────────────────────────────────────
  await check(p(L.s111), () => {
    const cols = [...schemaColumns(schemaModel(w.schema, "SmsCampaignRecipient"), enums).keys()];
    const copies = cols.filter((k) => /^(displayName|name|email|phoneE164|phone|firstName|lastName|fullName)$/i.test(k));
    const back = (model: string) => /^\s*\w+\s+SmsCampaignRecipient\[\]/m.test(schemaModel(w.schema, model).split("\n").map(uncomment).join("\n"));
    return [cols.includes("msisdn") && cols.includes("contactId") && cols.includes("userId") && copies.length === 0 && back("User") && back("MarketingContact"),
      `copied columns [${copies}] · back-relations User ${back("User")} / MarketingContact ${back("MarketingContact")}`];
  });

  // ── §1.12 · the UNCONFIRMED ADD VALUE stands alone (U43-0) ─────────────────────────────────
  const uAdds = unconfirmedAdds(w);
  ok(p(L.s112), uAdds.length === 1 && statementsOf(uAdds[0]).length === 1,
    uAdds.map((m) => `${m.folder} (${statementsOf(m).length} statement(s))`).join(", ") || "none");

  // ── §1.13 · …and only after the type exists ────────────────────────────────────────────────
  await check(p(L.s113), () => [uAdds.length === 1 && tables !== null && tables.folder < uAdds[0].folder,
    `${tables?.folder ?? "no tables migration"} < ${uAdds[0]?.folder ?? "no UNCONFIRMED migration"}`]);

  // ── §2 · the rules, EXECUTED on the memory twin ────────────────────────────────────────────
  const maps = mem();
  maps.smsCampaigns.clear();
  maps.smsCampaignRecipients.clear();
  maps.recipientsByCampaignMsisdn.clear();
  const C = w.twin.campaign, R = w.twin.recipient;

  await check(p(L.s20), async () => {
    const created = await C.create(draft("cmp_control"));
    return [process.env.DATABASE_URL === undefined && created.id === "cmp_control" && mem().smsCampaigns.has("cmp_control"),
      `${mem().smsCampaigns.size} campaign(s) in the memory map`];
  });

  await check(p(L.s21), async () => {
    const key = declaredOneKey(w);
    await C.create(draft("cmp_dedupe"));
    const people = Array.from({ length: 1000 }, (_, i) => keyOf(i));
    const first = await R.createMany(people.map((m, i) => seed(`rcp_d1_${i}`, "cmp_dedupe", m)));
    // The same 1,000 people with RE-MINTED ids, as a restarted enqueue mints them, shuffled among 200 new ones.
    const again = shuffled([
      ...people.map((m, i) => seed(`rcp_d2_${i}`, "cmp_dedupe", m)),
      ...Array.from({ length: 200 }, (_, i) => seed(`rcp_d3_${i}`, "cmp_dedupe", keyOf(1000 + i))),
    ], 35);
    let inserted = 0, duplicates = 0;
    for (const part of chunks(again, CM.SMS_CAMPAIGN_SEED_CHUNK_MAX)) {
      const r = await R.createMany(part);
      inserted += r.inserted;
      duplicates += r.duplicates;
    }
    const counts = await R.countByStatus("cmp_dedupe");
    const pending = counts.find((c) => c.status === "PENDING")?.count ?? -1;
    const rows = Array.from(mem().smsCampaignRecipients.values()).filter((r) => r.campaignId === "cmp_dedupe").length;
    return [first.inserted === 1000 && first.duplicates === 0 && inserted === 200 && duplicates === 1000
        && pending === 1200 && total(counts) === 1200 && rows === 1200 && key.schema && key.migration,
      `first ${first.inserted}+${first.duplicates}dup · again ${inserted}+${duplicates}dup · PENDING ${pending} · rows ${rows} · key in schema ${key.schema} · in migration ${key.migration}`];
  });

  await check(p(L.s22), async () => {
    await C.create(draft("cmp_key_b"));
    await C.create(draft("cmp_key_c"));
    const b = await R.createMany([seed("rcp_kb_0", "cmp_key_b", keyOf(4000))]);
    const c = await R.createMany([seed("rcp_kc_0", "cmp_key_c", keyOf(4000))]);
    const nb = total(await R.countByStatus("cmp_key_b")), nc = total(await R.countByStatus("cmp_key_c"));
    return [b.inserted === 1 && c.inserted === 1 && c.duplicates === 0 && nb === 1 && nc === 1,
      `campaign b +${b.inserted} · campaign c +${c.inserted} (${c.duplicates} dup) · rows ${nb}/${nc}`];
  });

  await check(p(L.s23), async () => {
    await C.create(draft("cmp_whole"));
    // A person already on the campaign, re-seeded with a link to a contact that does not exist: Postgres skips the row
    // at ON CONFLICT and never checks its link, so the batch is NOT refused — it is one duplicate.
    await R.createMany([seed("rcp_w_held", "cmp_whole", keyOf(5100))]);
    const heldAgain = await R.createMany([{ ...seed("rcp_w_held_again", "cmp_whole", keyOf(5100)), contactId: "mc_missing" }]);
    const heldSkipped = heldAgain.inserted === 0 && heldAgain.duplicates === 1;
    const size = () => mem().smsCampaignRecipients.size;
    const before = size();
    const ok3 = [0, 1, 2].map((i) => seed(`rcp_w_${i}`, "cmp_whole", keyOf(5000 + i)));
    const refusals = {
      plus: await throws(() => R.createMany([...ok3, seed("rcp_w_plus", "cmp_whole", `+${keyOf(5003)}`)])),
      local: await throws(() => R.createMany([...ok3, seed("rcp_w_local", "cmp_whole", `0${keyOf(5004).slice(3)}`)])),
      tooMany: await throws(() => R.createMany(Array.from({ length: CM.SMS_CAMPAIGN_SEED_CHUNK_MAX + 1 }, (_, i) => seed(`rcp_w_many_${i}`, "cmp_whole", keyOf(6000 + i))))),
      noCampaign: await throws(() => R.createMany([...ok3, seed("rcp_w_orphan", "cmp_missing", keyOf(5005))])),
      noContact: await throws(() => R.createMany([...ok3, { ...seed("rcp_w_contact", "cmp_whole", keyOf(5006)), contactId: "mc_missing" }])),
      sameId: await throws(() => R.createMany([seed("rcp_w_dup", "cmp_whole", keyOf(5007)), seed("rcp_w_dup", "cmp_whole", keyOf(5008))])),
      settles: await throws(() => R.createMany([{ ...seed("rcp_w_settled", "cmp_whole", keyOf(5009)), status: "SENT" } as unknown as SmsCampaignRecipientSeed])),
    };
    const after = size();
    const allRefused = Object.values(refusals).every(Boolean);
    return [allRefused && after === before && heldSkipped,
      `${Object.entries(refusals).filter(([, v]) => !v).map(([k]) => k).join(", ") || "every batch refused"} · rows ${before} → ${after} · a held key with a dangling link ${heldSkipped ? "skipped" : `answered ${JSON.stringify(heldAgain)}`}`];
  });

  await check(p(L.s24), async () => {
    const id = "cmp_frozen";
    await C.create(draft(id, { audienceFilter: FILTER_GIVEN }));
    const NEW_BODY = "50pick: Ofa mpya leo.";
    const saved = await C.update(id, { bodySw: NEW_BODY, codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2));
    const confirmed = await C.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: CONFIRM, draftRevision: 1, at: at(3) });
    const widened = await C.update(id, { audienceFilter: FILTER_WHOLE_BOOK }, { draftRevision: 1 }, at(4));
    const frozenKeyAfter = await throws(() => C.transition(id, { from: ["CONFIRMED"], to: null, patch: { audienceCount: 999999 }, draftRevision: 1, at: at(5) }));
    const backToDraft = await throws(() => C.transition(id, { from: ["CONFIRMED"], to: "DRAFT", patch: {}, draftRevision: null, at: at(5) }));
    const statusByPatch = await throws(() => C.update(id, { status: "DRAFT" } as unknown as SmsCampaignDraftPatch, { draftRevision: 1 }, at(5)));
    const row = await C.find(id);
    return [saved?.draftRevision === 1 && saved?.bodySw === NEW_BODY && confirmed?.status === "CONFIRMED" && widened === null && frozenKeyAfter && backToDraft && statusByPatch
        && row?.status === "CONFIRMED" && row.bodySw === NEW_BODY && row.audienceFilter === FILTER_GIVEN && row.audienceCount === 1200
        && row.confirmedBy === OFFICER && row.draftRevision === 1,
      `save rev ${saved?.draftRevision} (${saved?.bodySw === NEW_BODY ? "text stored" : "TEXT LOST"}) · ${confirmed?.status} · widening ${widened === null ? "refused" : "WRITTEN"} · frozen key after DRAFT ${frozenKeyAfter ? "refused" : "WRITTEN"} · back to DRAFT ${backToDraft ? "refused" : "ALLOWED"} · stored ${row?.audienceFilter} (${row?.status}, ${row?.audienceCount})`];
  });

  await check(p(L.s25), async () => {
    const id = "cmp_race";
    await C.create(draft(id));
    await C.transition(id, { from: ["DRAFT"], to: "CONFIRMED", patch: CONFIRM, draftRevision: 0, at: at(2) });
    await C.transition(id, { from: ["CONFIRMED"], to: "PREPARING", patch: { startedAt: at(3) }, draftRevision: null, at: at(3) });
    await C.transition(id, { from: ["PREPARING"], to: "RUNNING", patch: { enqueueCursor: "done", enqueuedAt: at(4) }, draftRevision: null, at: at(4) });
    const raced = await Promise.all([
      C.transition(id, { from: ["RUNNING"], to: "PAUSED", patch: { stopReason: "officer_pause", pausedAt: at(5) }, draftRevision: null, at: at(5) }),
      C.transition(id, { from: ["RUNNING"], to: "CANCELLED", patch: { stopReason: "officer_stop", finishedAt: at(5) }, draftRevision: null, at: at(5) }),
    ]);
    const winners = raced.filter((r) => r !== null);
    const row = await C.find(id);
    const third = await C.transition(id, { from: ["RUNNING"], to: "DONE", patch: { finishedAt: at(6) }, draftRevision: null, at: at(6) });
    const after = await C.find(id);
    return [winners.length === 1 && row?.status === winners[0]?.status && row?.stopReason === winners[0]?.stopReason
        && third === null && after?.status === row?.status,
      `${winners.length} winner(s) · final ${row?.status} (${row?.stopReason}) · a third writer from RUNNING ${third === null ? "refused" : "WON"}`];
  });

  await check(p(L.s26), async () => {
    const id = "cmp_revision";
    await C.create(draft(id));
    const A = "50pick: toleo A.", B = "50pick: toleo B.";
    const saves = await Promise.all([
      C.update(id, { bodySw: A, codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2)),
      C.update(id, { bodySw: B, codingSw: "GSM7", segmentsSw: 1 }, { draftRevision: 0 }, at(2)),
    ]);
    const winners = saves.filter((r) => r !== null);
    const row = await C.find(id);
    const stale = await C.update(id, { name: "A late save" }, { draftRevision: 0 }, at(3));
    const noRevision = await throws(() => C.update(id, { name: "No revision" }, {} as unknown as SmsCampaignDraftGuard, at(3)));
    const after = await C.find(id);
    const stored = row?.bodySw ?? "";
    return [winners.length === 1 && row?.draftRevision === 1 && (stored === A || stored === B) && stored === winners[0]?.bodySw
        && stale === null && noRevision && after?.name === draft(id).name && after?.draftRevision === 1,
      `${winners.length} save(s) landed · revision ${row?.draftRevision} · stored "${stored}" · stale ${stale === null ? "refused" : "WRITTEN"} · no revision ${noRevision ? "refused" : "ACCEPTED"}`];
  });

  await check(p(L.s27), async () => {
    await C.create(draft("cmp_counts"));
    await R.createMany([0, 1, 2].map((i) => seed(`rcp_c_${i}`, "cmp_counts", keyOf(7000 + i))));
    const some = await R.countByStatus("cmp_counts");
    const none = await R.countByStatus("cmp_nobody");
    const order = schemaEnum(w.schema, "SmsCampaignRecipientStatus");
    return [order.length === 7 && order[6] === "UNCONFIRMED" && same(some.map((c) => c.status), order) && same(none.map((c) => c.status), order)
        && some[0]?.status === "PENDING" && some[0]?.count === 3 && some.slice(1).every((c) => c.count === 0) && none.every((c) => c.count === 0),
      `[${some.map((c) => `${c.status} ${c.count}`).join(", ")}] · empty campaign [${none.map((c) => c.count).join(",")}]`];
  });

  await check(p(L.s28), async () => {
    await C.create(draft("cmp_born"));
    await R.createMany([seed("rcp_born_0", "cmp_born", keyOf(8000))]);
    const r = await R.find("rcp_born_0");
    const born = r !== null && r.status === "PENDING" && r.attempts === 0 && r.smsReference === null && r.claimToken === null
      && r.claimedAt === null && r.costTzs === null && r.gateTrail === null && r.locale === null && r.sentAt === null && r.updatedAt === r.createdAt;
    const { sourcePhrase: _absent, ...missingKey } = draft("cmp_born_m");
    const refused = {
      confirmed: await throws(() => C.create(draft("cmp_born_c", { status: "CONFIRMED" }))),
      counted: await throws(() => C.create(draft("cmp_born_n", { audienceCount: 10 }))),
      ids: await throws(() => C.create(draft("cmp_born_i", { audienceFilter: '{"ids":["mc_1"]}' }))),
      loose: await throws(() => C.create(draft("cmp_born_l", { audienceFilter: '{ "consent": ["GIVEN"] }' }))),
      extraKey: await throws(() => C.create({ ...draft("cmp_born_x"), sentCount: 0 } as unknown as StoredSmsCampaign)),
      missingKey: await throws(() => C.create(missingKey as unknown as StoredSmsCampaign)),
    };
    const written = ["cmp_born_c", "cmp_born_n", "cmp_born_i", "cmp_born_l", "cmp_born_x", "cmp_born_m"].filter((x) => mem().smsCampaigns.has(x));
    return [born && Object.values(refused).every(Boolean) && written.length === 0,
      `born ${born ? "PENDING and unsettled" : JSON.stringify(r)} · accepted: ${Object.entries(refused).filter(([, v]) => !v).map(([k]) => k).join(", ") || "none"} · written [${written}]`];
  });

  // ── §2.9–§2.11 · the rule set itself, every refusal executed (both twins call it first: dal-parity §26.shape) ──
  const refusesT = (t: SmsCampaignTransition): boolean => { try { w.rules.assertTransitionShape(t); return false; } catch { return true; } };
  const refusesD = (patch: SmsCampaignDraftPatch, guard: SmsCampaignDraftGuard = { draftRevision: 0 }, stamp = at(9)): boolean => {
    try { w.rules.assertDraftPatch(patch, guard, stamp); return false; } catch { return true; }
  };
  const refusesN = (row: StoredSmsCampaign): boolean => { try { w.rules.assertNewCampaign(row); return false; } catch { return true; } };
  /** Every input that must be refused IS, and every input that must pass DOES — a rule that refuses everything is no rule. */
  const verdicts = (refused: Array<[string, boolean]>, passed: Array<[string, boolean]>): [boolean, string] => {
    const letThrough = refused.filter(([, r]) => !r).map(([n]) => n);
    const blocked = passed.filter(([, r]) => r).map(([n]) => n);
    return [letThrough.length === 0 && blocked.length === 0, `let through: [${letThrough.join("; ")}] · wrongly refused: [${blocked.join("; ")}]`];
  };
  const T = (o: Partial<SmsCampaignTransition>): SmsCampaignTransition =>
    ({ from: ["RUNNING"], to: "PAUSED", patch: { pausedAt: at(9) }, draftRevision: null, at: at(9), ...o });
  const CT = (patch: SmsCampaignTransitionPatch, o: Partial<SmsCampaignTransition> = {}): SmsCampaignTransition =>
    ({ from: ["DRAFT"], to: "CONFIRMED", patch, draftRevision: 0, at: at(9), ...o });
  const HEX = "0123456789abcdef0123456789abcdef";
  const { estimateTzs: _money, ...withoutMoney } = CONFIRM;

  await check(p(L.s29), () => verdicts([
    ["to inside from — two racers would both win", refusesT(T({ from: ["RUNNING", "PAUSED"], to: "PAUSED" }))],
    ["out of a terminal status", refusesT(T({ from: ["DONE"], to: "RUNNING", patch: {} }))],
    ["a write onto a terminal row", refusesT(T({ from: ["CANCELLED"], to: null, patch: { stopReason: "late" } }))],
    ["back to DRAFT", refusesT(T({ from: ["CONFIRMED"], to: "DRAFT", patch: {} }))],
    ["a DRAFT skipping its confirmation", refusesT(T({ from: ["DRAFT"], to: "RUNNING", patch: {} }))],
    ["a move outside the lifecycle", refusesT(T({ from: ["CONFIRMED"], to: "DONE", patch: {} }))],
    ["no from", refusesT(T({ from: [] }))],
    ["an unknown status", refusesT(T({ from: ["SENDING" as never] }))],
    ["a status named twice", refusesT(T({ from: ["RUNNING", "RUNNING"] }))],
    ["a draft key in a transition", refusesT(T({ patch: { bodySw: "x" } as unknown as SmsCampaignTransitionPatch }))],
    ["the status in a patch", refusesT(T({ patch: { status: "DONE" } as unknown as SmsCampaignTransitionPatch }))],
    ["nothing moved and nothing written", refusesT(T({ to: null, patch: {} }))],
    ["at in another spelling", refusesT(T({ at: "2026-10-02 09:00" }))],
    ["a phone number as the cursor", refusesT(T({ from: ["PREPARING"], to: null, patch: { enqueueCursor: "b:255712345678" } }))],
    ["an instant in another spelling", refusesT(T({ patch: { pausedAt: "2026-10-02" } }))],
  ], [
    ["Pause from RUNNING or PREPARING", refusesT(T({ from: ["RUNNING", "PREPARING"], to: "PAUSED", patch: { stopReason: "officer_pause", pausedAt: at(9) } }))],
    ["Stop from every live status", refusesT(T({ from: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], to: "CANCELLED", patch: { finishedAt: at(9) } }))],
    ["Resume an interrupted enqueue", refusesT(T({ from: ["PAUSED"], to: "PREPARING", patch: {} }))],
    ["a book cursor written while PREPARING", refusesT(T({ from: ["PREPARING"], to: null, patch: { enqueueCursor: "b:mc_seed_000123" } }))],
    ["the walk finished", refusesT(T({ from: ["PREPARING"], to: "RUNNING", patch: { enqueueCursor: "done", enqueuedAt: at(9) } }))],
    ["a draft cancelled", refusesT(T({ from: ["DRAFT"], to: "CANCELLED", patch: { stopReason: "officer_cancel", finishedAt: at(9) } }))],
  ]));

  await check(p(L.s210), () => verdicts([
    ["a confirmation field without the move to CONFIRMED", refusesT({ from: ["DRAFT"], to: null, patch: { audienceCount: 5 }, draftRevision: 0, at: at(9) })],
    ["a frozen key after DRAFT", refusesT({ from: ["CONFIRMED"], to: null, patch: { audienceCount: 5 }, draftRevision: 0, at: at(9) })],
    ["a confirmation of anything but a DRAFT", refusesT(CT(CONFIRM, { from: ["PAUSED"] }))],
    ["a confirmation without the officer's revision", refusesT(CT(CONFIRM, { draftRevision: null }))],
    ["no one confirmed it", refusesT(CT({ ...CONFIRM, confirmedBy: null }))],
    ["no time it was confirmed", refusesT(CT({ ...CONFIRM, confirmedAt: null }))],
    ["a confirmation of nobody", refusesT(CT({ ...CONFIRM, audienceCount: 0 }))],
    ["a population that is not a whole number", refusesT(CT({ ...CONFIRM, audienceCount: 2.5 }))],
    ["a population beyond Postgres INTEGER", refusesT(CT({ ...CONFIRM, audienceCount: 2147483648 }))],
    ["no tier", refusesT(CT({ ...CONFIRM, confirmTier: null }))],
    ["a tier in another spelling", refusesT(CT({ ...CONFIRM, confirmTier: "typed" as never }))],
    ["a typed tier carrying a watermark", refusesT(CT({ ...CONFIRM, audienceWatermark: HEX }))],
    ["an enumerate tier without its keyed watermark", refusesT(CT({ ...CONFIRM, confirmTier: "ENUMERATE", audienceWatermark: null, audienceCount: 3 }))],
    ["a watermark that is not U40's keyed hex", refusesT(CT({ ...CONFIRM, confirmTier: "ENUMERATE", audienceWatermark: "not-a-key", audienceCount: 3 }))],
    ["no frozen segment estimate", refusesT(CT({ ...CONFIRM, estimateSegments: null }))],
    ["the money estimate left out", refusesT(CT(withoutMoney))],
    ["money with a third decimal", refusesT(CT({ ...CONFIRM, estimateTzs: 7200.555 }))],
  ], [
    ["a typed confirmation", refusesT(CT(CONFIRM))],
    ["an enumerate confirmation with its keyed watermark", refusesT(CT({ ...CONFIRM, confirmTier: "ENUMERATE", audienceWatermark: HEX, audienceCount: 3 }))],
    ["a confirmation whose price is not yet measured", refusesT(CT({ ...CONFIRM, estimateTzs: null }))],
  ]));

  await check(p(L.s211), () => {
    const [good, detail] = verdicts([
      ["a Swahili body without its saved verdict", refusesD({ bodySw: "50pick: mpya." })],
      ["an English body without its coding", refusesD({ bodyEn: "50pick: new.", segmentsEn: 1 })],
      ["English half removed", refusesD({ bodyEn: null, codingEn: "GSM7", segmentsEn: 1 })],
      ["the name emptied", refusesD({ name: null } as unknown as SmsCampaignDraftPatch)],
      ["a coding that is neither GSM7 nor UCS2", refusesD({ bodySw: "x", codingSw: "GSM-7" as never, segmentsSw: 1 })],
      ["zero segments", refusesD({ bodySw: "x", codingSw: "GSM7", segmentsSw: 0 })],
      ["a segment count beyond Postgres INTEGER", refusesD({ bodySw: "x", codingSw: "GSM7", segmentsSw: 2147483648 })],
      ["an empty Swahili body", refusesD({ bodySw: "", codingSw: "GSM7", segmentsSw: 1 })],
      ["a confirmation field in a draft save", refusesD({ audienceCount: 5 } as unknown as SmsCampaignDraftPatch)],
      ["an engine field in a draft save", refusesD({ stopReason: "x" } as unknown as SmsCampaignDraftPatch)],
      ["an ids audience", refusesD({ audienceFilter: '{"ids":["mc_1"]}' })],
      ["a revision that is not a whole number", refusesD({ name: "n" }, { draftRevision: 1.5 })],
      ["a stamp that is not an instant", refusesD({ name: "n" }, { draftRevision: 0 }, "yesterday")],
      ["an English body at birth without its coding", refusesN(draft("cmp_rule_en", { bodyEn: "50pick: new." }))],
      ["a birth stamp in another spelling", refusesN(draft("cmp_rule_at", { createdAt: "2026-10-02T09:00:00Z" }))],
    ], [
      ["a full Swahili save", refusesD({ bodySw: "50pick: mpya.", codingSw: "UCS2", segmentsSw: 2 }, { draftRevision: 3 })],
      ["English added whole", refusesD({ bodyEn: "50pick: new.", codingEn: "GSM7", segmentsEn: 1 })],
      ["English removed whole", refusesD({ bodyEn: null, codingEn: null, segmentsEn: null })],
      ["a name alone", refusesD({ name: "Renamed" })],
      ["a blank draft at birth", refusesN(draft("cmp_rule_ok"))],
      ["a draft born with English whole", refusesN(draft("cmp_rule_en2", { bodyEn: "50pick: new.", codingEn: "GSM7", segmentsEn: 1 }))],
    ]);
    const width = CM.SMS_CAMPAIGN_WATERMARK_HEX_CHARS === MEMBERS_KEY_HEX_CHARS;
    return [good && width, `${detail} · watermark width ${CM.SMS_CAMPAIGN_WATERMARK_HEX_CHARS} vs U40's ${MEMBERS_KEY_HEX_CHARS}`];
  });

  await check(p(L.s212), async () => {
    const contactId = "mc_u35b_link";
    // The PRODUCTION removal — U23's bulk remove, its where built by U24's ONE translation (`toAudienceWhere`) — for
    // exactly this one contact, so the where follows every axis a later unit adds to the audience.
    const removeOne = () => contactAudienceWrites({ ...WHOLE_BOOK, ids: [contactId] }).remove();
    await removeOne(); // a leftover from an earlier run, if any
    await db.marketingContact.create({
      id: contactId, msisdn: keyOf(9000), rawInput: "0710009000", displayName: null, email: null, ndc: "71", operator: null,
      source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
      importId: null, createdAt: at(0), createdBy: null, updatedAt: at(0), updatedBy: null,
    });
    await C.create(draft("cmp_link"));
    await R.createMany([{ ...seed("rcp_link_0", "cmp_link", keyOf(9000)), contactId }]);
    const linked = (await R.find("rcp_link_0"))?.contactId ?? null;
    const removed = await removeOne();
    const after = await R.find("rcp_link_0");
    return [linked === contactId && removed.changed === 1 && after !== null && after.contactId === null && after.msisdn === keyOf(9000),
      `linked ${linked} · removed ${removed.changed} · the recipient ${after === null ? "ROW GONE" : `kept, link ${after.contactId}`}`];
  });

  // ── §2.13 · the counts know UNCONFIRMED, and still refuse what nobody knows (U43-0, P8) ──────
  await check(p(L.s213), async () => {
    await C.create(draft("cmp_unconfirmed"));
    await R.createMany([0, 1, 2, 3].map((i) => seed(`rcp_u_${i}`, "cmp_unconfirmed", keyOf(9500 + i))));
    // ⛔ No DAL door writes UNCONFIRMED before U43b (§3.2), so the state a slice would leave is set in the memory map —
    // here, in a script, as test:campaigns-page sets its fixtures' states.
    const rows = mem().smsCampaignRecipients;
    for (const id of ["rcp_u_0", "rcp_u_1"]) { const r = rows.get(id); if (r) r.status = "UNCONFIRMED"; }
    const counts = await R.countByStatus("cmp_unconfirmed");
    const last = counts[counts.length - 1];
    const known = last?.status === "UNCONFIRMED" && last.count === 2 && counts.find((c) => c.status === "PENDING")?.count === 2 && total(counts) === 4;
    const odd = rows.get("rcp_u_2");
    let refused = false;
    try {
      if (odd) odd.status = "ACCEPTED" as unknown as SmsCampaignRecipientStatus;
      await R.countByStatus("cmp_unconfirmed");
    } catch {
      refused = true;
    } finally {
      if (odd) odd.status = "PENDING";
    }
    return [known && refused,
      `[${counts.map((c) => `${c.status} ${c.count}`).join(", ")}] · a status this code does not know ${refused ? "refused" : "COUNTED (or dropped)"}`];
  });

  /* ── §2.14–§2.28 · U43a · THE ENGINE'S RECIPIENT DOORS, EXECUTED ON THE MEMORY TWIN (ENGINE-SPEC §4.10) ───────────────
   * Every fixture goes through the doors themselves (claim → settle), never a hand-set map, so a plant in any door is seen
   * — with ONE exception, named where it stands (§2.20): a token-less UNCONFIRMED row, which no door can make and a raw
   * repair could. Ids are fixed-width, so id order is seed order. ⛔ No backslash below: line breaks and patterns are
   * classes. */
  const M = w.twin.message;
  const TRAIL = (verdict: string): SmsCampaignGateTrail => [{ check: "gate", verdict, wording: null, source: null }];
  const rowOf = (id: string): StoredSmsCampaignRecipient | undefined => mem().smsCampaignRecipients.get(id);
  const rowsOf = (campaignId: string): StoredSmsCampaignRecipient[] =>
    Array.from(mem().smsCampaignRecipients.values()).filter((r) => r.campaignId === campaignId)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const snap = (ids: readonly string[]): string => JSON.stringify(ids.map((x) => rowOf(x) ?? null));
  /** A campaign of `n` fresh rows through the doors; answers their ids, in id order. */
  const campaignOf = async (id: string, n: number, keyFrom: number): Promise<string[]> => {
    await C.create(draft(id));
    const ids = Array.from({ length: n }, (_, i) => `rcp_${id.slice(4)}_${String(i).padStart(4, "0")}`);
    for (const part of chunks(ids.map((rid, i) => seed(rid, id, keyOf(keyFrom + i))), CM.SMS_CAMPAIGN_SEED_CHUNK_MAX)) await R.createMany(part);
    return ids;
  };
  const skipped = (id: string, claimToken: string): SmsCampaignRecipientSettle => ({
    id, claimToken, to: "SKIPPED", skipReason: "suppressed", skipDetail: "suppressed withdrawn on 2026-10-02T09:00:00.000Z", gateTrail: TRAIL("suppressed"),
  });
  const sent = (id: string, claimToken: string, smsReference: string): SmsCampaignRecipientSettle => ({
    id, claimToken, to: "SENT", smsReference, sentAt: at(50), optOutToken: "K7MXP2QR", locale: "SW", segments: 1, bodyLen: 72, gateTrail: TRAIL("ok"),
  });
  const held = (id: string, claimToken: string): SmsCampaignRecipientSettle =>
    ({ id, claimToken, to: "HELD", failureClass: "gate_unanswered", attempts: 3 });
  const release = (id: string, claimToken: string, attemptsDelta: 0 | 1): SmsCampaignRecipientSettle =>
    ({ id, claimToken, to: "PENDING", attemptsDelta });
  const unsure = (id: string, claimToken: string, smsReference: string | null): SmsCampaignRecipientSettle => ({
    id, claimToken, to: "UNCONFIRMED", smsReference, optOutToken: null, locale: null, segments: null, bodyLen: null, gateTrail: TRAIL("unconfirmed"),
  });
  /** Every key of `b` but `except` holds the same value in `r`. */
  const sameBut = (r: StoredSmsCampaignRecipient | undefined, b: StoredSmsCampaignRecipient | undefined, except: readonly string[]): boolean =>
    r !== undefined && b !== undefined && Object.keys(b).every((k) => except.includes(k)
      || JSON.stringify((r as unknown as Record<string, unknown>)[k]) === JSON.stringify((b as unknown as Record<string, unknown>)[k]));
  const yieldNow = (): Promise<void> => new Promise((done) => setImmediate(done));
  const ids_ = (rows: ReadonlyArray<{ id: string }>): string => rows.map((r) => r.id).join(",");

  // ── §2.14 · ⭐ five concurrent claimers ────────────────────────────────────────────────────────
  await check(p(L.s214), async () => {
    const id = "cmp_claim_five";
    const ids = await campaignOf(id, 1000, 20000);
    const wins = new Map<string, number>();
    let lost = 0, rounds = 0;
    const free = () => rowsOf(id).filter((r) => r.status === "PENDING" && r.claimToken === null).length;
    const claimer = async (who: string): Promise<void> => {
      for (let round = 0; round < 200; round++) {
        rounds++;
        const token = `tok_${who}_${String(round).padStart(4, "0")}`;
        const won = await R.claim(id, CM.SMS_RECIPIENT_CLAIM_MAX, token, at(100 + round));
        await yieldNow(); // ⭐ the window a real slice holds its claim open: the other four claim here
        if (won.length === 0) {
          if (free() === 0) return;
          continue;
        }
        for (const r of won) wins.set(r.id, (wins.get(r.id) ?? 0) + 1);
        const res = await R.settle([...won].reverse().map((r) => skipped(r.id, token)), at(100 + round));
        lost += res.lost.length;
        await yieldNow();
      }
    };
    await Promise.all(["a", "b", "c", "d", "e"].map(claimer));
    const twice = [...wins.values()].filter((n) => n !== 1).length;
    const rows = rowsOf(id);
    const settled = rows.filter((r) => r.status === "SKIPPED").length;
    return [wins.size === 1000 && twice === 0 && lost === 0 && settled === 1000 && ids.every((x) => wins.get(x) === 1),
      `${wins.size} rows won · ${twice} won more than once · ${lost} settle(s) lost · ${settled} of ${rows.length} SKIPPED · ${rounds} claim rounds`];
  });

  // ── §2.15 · the claim's shape ──────────────────────────────────────────────────────────────────
  await check(p(L.s215), async () => {
    const id = "cmp_claim_shape";
    const ids = await campaignOf(id, 7, 22000);
    const other = await campaignOf("cmp_claim_other", 2, 22100);
    const h = await R.claim(id, 1, "tok_shape_held", at(10));
    await R.settle([held(ids[0], "tok_shape_held")], at(11));
    const s = await R.claim(id, 1, "tok_shape_skip", at(12));
    await R.settle([skipped(ids[1], "tok_shape_skip")], at(13));
    const before = new Map(rowsOf(id).map((r): [string, StoredSmsCampaignRecipient] => [r.id, { ...r }]));
    const won = await R.claim(id, 3, "tok_shape_main", at(20));
    const want = [ids[2], ids[3], ids[4]];
    const onlyTheClaim = rowsOf(id).every((r) => {
      const b = before.get(r.id);
      if (!want.includes(r.id)) return JSON.stringify(r) === JSON.stringify(b);
      return b !== undefined && b.claimToken === null && b.claimedAt === null && r.claimToken === "tok_shape_main" && r.claimedAt === at(20)
        && r.updatedAt === at(20) && r.status === "PENDING" && r.attempts === 0 && sameBut(r, b, ["claimToken", "claimedAt", "updatedAt"]);
    });
    const answered = ids_(won) === want.join(",") && won.every((r) => r.claimToken === "tok_shape_main");
    if (won[0]) won[0].status = "SKIPPED"; // a copy: the store must not move
    const copies = rowOf(ids[2])?.status === "PENDING";
    const rest = await R.claim(id, 10, "tok_shape_rest", at(21));
    const none = await R.claim(id, 5, "tok_shape_none", at(22));
    // ⛔ D16 · a token is fresh for each claim: the one a SETTLED row keeps, and the one rows still PENDING hold, are each
    // refused before anything is written — here, and in another campaign that still has free rows to take
    const keepAll = snap([...ids, ...other]);
    const reusedSettled = await throws(() => R.claim(id, 1, "tok_shape_skip", at(23)));
    const reusedHeld = await throws(() => R.claim("cmp_claim_other", 1, "tok_shape_main", at(24)));
    const reuseWroteNothing = snap([...ids, ...other]) === keepAll;
    const otherUntouched = other.every((x) => rowOf(x)?.claimToken === null);
    return [ids_(h) === ids[0] && ids_(s) === ids[1] && answered && onlyTheClaim && copies && ids_(rest) === [ids[5], ids[6]].join(",")
        && none.length === 0 && reusedSettled && reusedHeld && reuseWroteNothing && otherUntouched,
      `held [${ids_(h)}] · skipped [${ids_(s)}] · won [${ids_(won)}] · only the claim moved ${onlyTheClaim} · copies ${copies} · rest [${ids_(rest)}] · none ${none.length} · a settled row's token ${reusedSettled ? "refused" : "REUSED"} · a held token in another campaign ${reusedHeld ? "refused" : "REUSED"} · nothing written ${reuseWroteNothing} · other campaign untouched ${otherUntouched}`];
  });

  // ── §2.16 · ⭐ settle by id and claim, never by position ───────────────────────────────────────────
  await check(p(L.s216), async () => {
    const id = "cmp_settle_id";
    const ids = await campaignOf(id, 6, 22200);
    const won = await R.claim(id, 6, "tok_settle_id", at(30));
    const refOf = (rid: string): string => `sms_settle_${rid.slice(-4)}`;
    // ⭐ never the claim's order: a fixed permutation, so a settle that zipped patches onto rows by place is seen
    const patches = [3, 0, 5, 1, 4, 2].map((i) => sent(ids[i], "tok_settle_id", refOf(ids[i])));
    const shuffledAway = ids_(won) === ids.join(",") && patches.map((pp) => pp.id).join(",") !== ids.join(",");
    const res = await R.settle(patches, at(31));
    const own = ids.every((x) => rowOf(x)?.status === "SENT" && rowOf(x)?.smsReference === refOf(x));
    const lid = "cmp_settle_lost";
    const l = await campaignOf(lid, 4, 22300);
    await R.claim(lid, 4, "tok_lost_aaaa", at(40));
    await R.settle([skipped(l[2], "tok_lost_aaaa")], at(41));        // row 2: settled already
    await R.settle([release(l[3], "tok_lost_aaaa", 1)], at(42));     // row 3: reaped …
    await R.claim(lid, 1, "tok_lost_bbbb", at(43));                  // … and claimed again by another slice
    const keep = snap([l[0], l[2], l[3]]);
    const late = await R.settle([
      sent(l[0], "tok_wrong_xxxx", "sms_lost_0"),   // a claim it never held
      sent(l[1], "tok_lost_aaaa", "sms_lost_1"),    // its own claim: lands
      sent(l[2], "tok_lost_aaaa", "sms_lost_2"),    // already settled
      sent(l[3], "tok_lost_aaaa", "sms_lost_3"),    // a stalled slice's late settle over a reaped row
      sent("rcp_settle_nobody", "tok_lost_aaaa", "sms_lost_4"),
    ], at(44));
    const untouched = snap([l[0], l[2], l[3]]) === keep;
    return [shuffledAway && res.settled === 6 && res.lost.length === 0 && own && late.settled === 1
        && late.lost.join(",") === [l[0], l[2], l[3], "rcp_settle_nobody"].join(",") && rowOf(l[1])?.smsReference === "sms_lost_1" && untouched
        && rowOf(l[3])?.claimToken === "tok_lost_bbbb" && rowOf(l[3])?.attempts === 1,
      `shuffled ${shuffledAway} · settled ${res.settled}, lost [${res.lost}] · each its own reference ${own} · late: settled ${late.settled}, lost [${late.lost}] · lost rows untouched ${untouched}`];
  });

  // ── §2.17 · ⭐ the settle table, every row executed on the rule set ─────────────────────────────────
  {
    const refusesS = (patches: unknown[], stamp = at(60)): boolean => {
      try { w.rules.assertSettle(patches as SmsCampaignRecipientSettle[], stamp); return false; } catch { return true; }
    };
    const base = { id: "rcp_rule_0001", claimToken: "tok_rule_0001" };
    const SENT_FULL = { ...base, to: "SENT", smsReference: "sms_0a1b2c3d4e5f60718293a4b5", sentAt: at(60), optOutToken: "K7MXP2QR", locale: "SW", segments: 1, bodyLen: 72, gateTrail: TRAIL("ok") };
    const SENT_REAPED = { ...base, to: "SENT", smsReference: "sms_0a1b2c3d4e5f60718293a4b6", sentAt: at(60), optOutToken: null, locale: null, segments: null, bodyLen: 72, gateTrail: TRAIL("reaped") };
    const SKIP = { ...base, to: "SKIPPED", skipReason: "suppressed", skipDetail: "suppressed withdrawn on 2026-10-02T09:00:00.000Z", gateTrail: TRAIL("suppressed") };
    const FAIL = { ...base, to: "FAILED", failureClass: "BAD_MSISDN", error: null, failedAt: at(60), smsReference: "sms_0a1b2c3d4e5f60718293a4b7", gateTrail: TRAIL("failed") };
    const UNSURE = { ...base, to: "UNCONFIRMED", smsReference: null, optOutToken: null, locale: null, segments: null, bodyLen: null, gateTrail: TRAIL("unconfirmed") };
    const DELIV = { ...base, to: "DELIVERED", smsReference: "sms_0a1b2c3d4e5f60718293a4b8", sentAt: null, deliveredAt: at(61), optOutToken: null, locale: null, segments: null, bodyLen: 72, gateTrail: TRAIL("delivered") };
    const HOLD = { ...base, to: "HELD", failureClass: "gate_unanswered", attempts: 3 };
    const FREE = { ...base, to: "PENDING", attemptsDelta: 1 };
    const without = (o: Record<string, unknown>, k: string): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k));
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ ...SKIP, id: `rcp_rule_${String(i).padStart(4, "0")}` }));
    await check(p(L.s217), () => verdicts([
      ["a SENT without its reference", refusesS([without(SENT_FULL, "smsReference")])],
      ["a SENT whose reference is null", refusesS([{ ...SENT_FULL, smsReference: null }])],
      ["a SENT carrying skipReason (another status's key)", refusesS([{ ...SENT_FULL, skipReason: "suppressed" }])],
      ["a SENT without its trail", refusesS([without(SENT_FULL, "gateTrail")])],
      ["a SKIPPED carrying a reference", refusesS([{ ...SKIP, smsReference: "sms_0a1b2c3d4e5f60718293a4c0" }])],
      ["a SKIPPED carrying a token", refusesS([{ ...SKIP, optOutToken: "K7MXP2QR" }])],
      ["a FAILED without failedAt", refusesS([without(FAIL, "failedAt")])],
      ["a FAILED carrying skipReason", refusesS([{ ...FAIL, skipReason: "suppressed" }])],
      ["a HELD carrying a reference", refusesS([{ ...HOLD, smsReference: "sms_0a1b2c3d4e5f60718293a4c1" }])],
      ["a HELD with negative attempts", refusesS([{ ...HOLD, attempts: -1 }])],
      ["a release that moves attempts by 2", refusesS([{ ...FREE, attemptsDelta: 2 }])],
      ["a release that also writes a column", refusesS([{ ...FREE, failureClass: "gate_unanswered" }])],
      ["a status the table does not hold", refusesS([{ ...base, to: "ACCEPTED" }])],
      ["no claim token", refusesS([{ ...SKIP, claimToken: "" }])],
      ["no row id", refusesS([{ ...SKIP, id: "" }])],
      ["⛔ a phone number in the skip detail", refusesS([{ ...SKIP, skipDetail: "refused 0712 345 678 at the gate" }])],
      ["⛔ a phone number in the error", refusesS([{ ...FAIL, error: "gateway: 255712345678 rejected" }])],
      ["⛔ a phone number in a trail's words", refusesS([{ ...SKIP, gateTrail: [{ check: "gate", verdict: "suppressed", wording: "the number +255 712 345 678", source: null }] }])],
      ["⛔ a phone number standing as a trail source token", refusesS([{ ...SKIP, gateTrail: [{ check: "gate", verdict: "suppressed", wording: null, source: "msisdn:255712345678" }] }])],
      ["⛔ a phone number written with spaces as a trail source", refusesS([{ ...SKIP, gateTrail: [{ check: "gate", verdict: "suppressed", wording: null, source: "msisdn 0712 345 678" }] }])],
      ["⛔ a phone number written with a plus and dashes as a trail source", refusesS([{ ...SKIP, gateTrail: [{ check: "gate", verdict: "suppressed", wording: null, source: "tel:+255-712-345-678" }] }])],
      ["a trail of 25 checks", refusesS([{ ...SKIP, gateTrail: Array.from({ length: 25 }, () => TRAIL("ok")[0]) }])],
      ["a trail string of 201 characters", refusesS([{ ...SKIP, gateTrail: [{ check: "gate", verdict: "x".repeat(201), wording: null, source: null }] }])],
      ["an empty trail", refusesS([{ ...SKIP, gateTrail: [] }])],
      ["a trail check with a fifth key", refusesS([{ ...SKIP, gateTrail: [{ ...TRAIL("ok")[0], msisdn: "x" }] }])],
      ["a skip detail of 501 characters", refusesS([{ ...SKIP, skipDetail: "x".repeat(501) }])],
      ["two patches for one row", refusesS([SKIP, { ...SKIP }])],
      ["two patches carrying one reference", refusesS([SENT_FULL, { ...SENT_FULL, id: "rcp_rule_0002" }])],
      ["201 patches in one batch", refusesS(many(201))],
      ["at in another spelling", refusesS([SKIP], "2026-10-02 09:00")],
      ["a sentAt in another spelling", refusesS([{ ...SENT_FULL, sentAt: "2026-10-02" }])],
      ["a variant that is not EN, SW or ZH", refusesS([{ ...SENT_FULL, locale: "FR" }])],
      ["zero segments", refusesS([{ ...SENT_FULL, segments: 0 }])],
      ["⛔ a patch carrying userId — the account link only erasure clears (U16a PE-01)", refusesS([{ ...SENT_FULL, userId: "usr_erased_0001" }])],
    ], [
      ["the slice's SENT — everything it prepared", refusesS([SENT_FULL])],
      ["the reaper's SENT from evidence — token, variant and segments unknown (E6)", refusesS([SENT_REAPED])],
      ["a SKIPPED whose detail carries an instant", refusesS([SKIP])],
      ["a FAILED BAD_MSISDN with its reference and no error", refusesS([FAIL])],
      ["an UNCONFIRMED knowing nothing but its trail", refusesS([UNSURE])],
      ["the reaper's DELIVERED (§3.2)", refusesS([DELIV])],
      ["a HELD after three attempts", refusesS([HOLD])],
      ["a release by 1 and a release by 0", refusesS([FREE, { ...FREE, id: "rcp_rule_0002", attemptsDelta: 0 }])],
      ["a trail source holding an SMS reference whose hex has a phone-shaped run (no false refusal)", refusesS([{ ...SKIP, gateTrail: [{ check: "dispatch", verdict: "handed_over", wording: null, source: "sms_0712345678abcdef0123456a" }] }])],
      ["trail sources that are references, an instant and the send window (no false refusal)", refusesS([{ ...SKIP, gateTrail: [
        { check: "consent", verdict: "GIVEN", wording: null, source: "ledger:lc_2557100012001" },
        { check: "window", verdict: "open", wording: null, source: "08:00–20:00 EAT · 2026-10-07T08:00:00.000Z" },
        { check: "outreach", verdict: "open", wording: null, source: "outreach:2026-10-07T06:19:55.000Z" },
      ] }])],
      ["an empty batch", refusesS([])],
      ["200 patches", refusesS(many(200))],
    ]));
  }

  // ── §2.18 · a refused batch changes nothing; a reference another row holds refuses the batch ───────────
  await check(p(L.s218), async () => {
    const id = "cmp_settle_whole";
    const ids = await campaignOf(id, 4, 22400);
    await R.claim(id, 4, "tok_whole_0001", at(70));
    await R.settle([sent(ids[3], "tok_whole_0001", "sms_whole_held")], at(70));   // a reference a row now holds
    const before = snap(ids.slice(0, 3));
    const bad = { ...sent(ids[2], "tok_whole_0001", "sms_whole_2"), skipReason: "suppressed" } as unknown as SmsCampaignRecipientSettle;
    const refused = await throws(() => R.settle([sent(ids[0], "tok_whole_0001", "sms_whole_0"), sent(ids[1], "tok_whole_0001", "sms_whole_1"), bad], at(71)));
    const unchanged = snap(ids.slice(0, 3)) === before;
    // DC-7 · the refusal carries Prisma's own code, so a caller that reads `code` reads it in both twins
    let dupCode: unknown = "no refusal";
    try {
      await R.settle([sent(ids[0], "tok_whole_0001", "sms_whole_fresh"), sent(ids[1], "tok_whole_0001", "sms_whole_held")], at(72));
    } catch (e) {
      dupCode = (e as { code?: unknown } | null)?.code;
    }
    const dup = dupCode === "P2002";
    const stillUnchanged = snap(ids.slice(0, 3)) === before;
    return [refused && unchanged && dup && stillUnchanged,
      `a bad third patch ${refused ? "refused" : "ACCEPTED"} · rows ${unchanged ? "unchanged" : "WRITTEN"} · a held reference ${dup ? "refused, code P2002" : `NOT refused as P2002 (${String(dupCode)})`} · rows ${stillUnchanged ? "unchanged" : "WRITTEN"}`];
  });

  // ── §2.19 · the release and the hold ───────────────────────────────────────────────────────────────
  await check(p(L.s219), async () => {
    const id = "cmp_settle_release";
    const ids = await campaignOf(id, 3, 22500);
    await R.claim(id, 3, "tok_rel_0001", at(80));
    const before = new Map(rowsOf(id).map((r): [string, StoredSmsCampaignRecipient] => [r.id, { ...r }]));
    const res = await R.settle([release(ids[0], "tok_rel_0001", 1), release(ids[1], "tok_rel_0001", 0), held(ids[2], "tok_rel_0001")], at(81));
    const [r0, r1, r2] = ids.map(rowOf);
    // D15 · a release clears the claim's TOKEN and keeps its instant (`lastActivity` reads it) — claimedAt is not excepted
    const one = r0?.status === "PENDING" && r0.claimToken === null && r0.claimedAt === at(80) && r0.attempts === 1 && r0.updatedAt === at(81)
      && sameBut(r0, before.get(ids[0]), ["claimToken", "attempts", "updatedAt"]);
    const zero = r1?.status === "PENDING" && r1.claimToken === null && r1.claimedAt === at(80) && r1.attempts === 0 && r1.updatedAt === at(81)
      && sameBut(r1, before.get(ids[1]), ["claimToken", "updatedAt"]);
    const hold = r2?.status === "HELD" && r2.failureClass === "gate_unanswered" && r2.attempts === 3 && r2.claimToken === "tok_rel_0001"
      && r2.updatedAt === at(81) && sameBut(r2, before.get(ids[2]), ["status", "failureClass", "attempts", "updatedAt"]);
    const again = await R.claim(id, 3, "tok_rel_0002", at(82));
    return [res.settled === 3 && one && zero && hold && ids_(again) === [ids[0], ids[1]].join(","),
      `settled ${res.settled} · release by 1 ${one} · release by 0 ${zero} · hold ${hold} · claimed again [${ids_(again)}]`];
  });

  // ── §2.20 · ⭐ UNCONFIRMED never goes back to PENDING ──────────────────────────────────────────────
  await check(p(L.s220), async () => {
    const id = "cmp_unconfirmed_stays";
    const ids = await campaignOf(id, 4, 22600);
    await R.claim(id, 4, "tok_unc_0001", at(90));
    await R.settle([unsure(ids[0], "tok_unc_0001", "sms_unc_0"), held(ids[1], "tok_unc_0001"), unsure(ids[3], "tok_unc_0001", "sms_unc_3")], at(91));
    // ⛔ THE ONE HAND-SET ROW (DC-10): every UNCONFIRMED row a door writes keeps its claim's token (D7), so the claim's
    // token test alone would refuse it and its STATUS test would never be exercised. A raw repair or a receipt arm could
    // clear the token — so row 3's is cleared here, by hand, and the claim must still never take it.
    const bare = rowOf(ids[3]);
    if (bare) bare.claimToken = null;
    const keep = snap([ids[0], ids[3]]);
    const back = await R.settle([release(ids[0], "tok_unc_0001", 1)], at(92));
    const parked = await R.settle([held(ids[0], "tok_unc_0001")], at(93));
    const again = await R.settle([sent(ids[0], "tok_unc_0001", "sms_unc_again")], at(94));
    const requeued = await R.requeueHeld(id, at(95));
    const claimed = await R.claim(id, 10, "tok_unc_0002", at(96));
    const stays = snap([ids[0], ids[3]]) === keep && rowOf(ids[0])?.status === "UNCONFIRMED" && rowOf(ids[3])?.status === "UNCONFIRMED"
      && rowOf(ids[3])?.claimToken === null;
    return [bare !== undefined && back.lost.join(",") === ids[0] && parked.lost.join(",") === ids[0] && again.lost.join(",") === ids[0]
        && requeued === 1 && stays && ids_(claimed) === ids[1],
      `release ${back.lost.length ? "lost" : "LANDED"} · hold ${parked.lost.length ? "lost" : "LANDED"} · second settle ${again.lost.length ? "lost" : "LANDED"} · requeued ${requeued} · both UNCONFIRMED rows ${stays ? "untouched" : `now ${rowOf(ids[0])?.status} / ${rowOf(ids[3])?.status} under ${rowOf(ids[3])?.claimToken}`} · claimed [${ids_(claimed)}]`];
  });

  // ── §2.21 · the stranded read ──────────────────────────────────────────────────────────────────────
  await check(p(L.s221), async () => {
    const id = "cmp_stranded";
    const ids = await campaignOf(id, 5, 22700);
    // DC-6 · the claim order is NOT the id order: row 1 holds the OLDEST claim, row 0 (a lower id) a later one — so an
    // answer ordered by id alone, or newest first, is seen
    await R.claim(id, 2, "tok_str_early", at(50));                         // rows 0 and 1, at 50 …
    await R.settle([release(ids[0], "tok_str_early", 0)], at(51));         // … row 0 released: row 1 keeps the claim of 50
    await R.claim(id, 1, "tok_str_late0", at(100));                        // row 0 again, at 100 — exactly the cutoff below
    await R.claim(id, 1, "tok_str_young", at(400));                        // row 2, at 400
    await R.claim(id, 1, "tok_str_sent", at(20));                          // row 3, at 20 …
    await R.settle([sent(ids[3], "tok_str_sent", "sms_str_3")], at(21));   // … then settled: the oldest claim, never stranded
    await campaignOf("cmp_stranded_other", 1, 22800);
    await R.claim("cmp_stranded_other", 1, "tok_str_other", at(10));       // another campaign's, older still
    const cut = await R.findStranded(id, at(200), CM.SMS_RECIPIENT_BATCH_MAX);
    const atCut = await R.findStranded(id, at(100), CM.SMS_RECIPIENT_BATCH_MAX);
    const one = await R.findStranded(id, at(200), 1);
    return [ids_(cut) === [ids[1], ids[0]].join(",") && cut[0]?.claimToken === "tok_str_early" && cut[1]?.claimToken === "tok_str_late0"
        && ids_(atCut) === ids[1] && ids_(one) === ids[1],
      `older than 200 [${ids_(cut)}] · strictly older than 100 [${ids_(atCut)}] · limit 1 [${ids_(one)}]`];
  });

  // ── §2.22 · the requeue ────────────────────────────────────────────────────────────────────────────
  await check(p(L.s222), async () => {
    const id = "cmp_requeue";
    const ids = await campaignOf(id, 7, 22900);
    await R.claim(id, 7, "tok_req_0001", at(110));
    await R.settle([
      held(ids[0], "tok_req_0001"),
      { ...held(ids[1], "tok_req_0001"), failureClass: "prepare:token_unavailable" } as SmsCampaignRecipientSettle,
      unsure(ids[2], "tok_req_0001", "sms_req_2"),
      sent(ids[3], "tok_req_0001", "sms_req_3"),
      skipped(ids[4], "tok_req_0001"),
      { id: ids[5], claimToken: "tok_req_0001", to: "FAILED", failureClass: "BAD_MSISDN", error: null, failedAt: at(111), smsReference: null, gateTrail: TRAIL("failed") },
    ], at(111));                                                                   // row 6 stays PENDING under its claim
    const otherIds = await campaignOf("cmp_requeue_other", 1, 23000);
    await R.claim("cmp_requeue_other", 1, "tok_req_other", at(110));
    await R.settle([held(otherIds[0], "tok_req_other")], at(111));
    const keep = snap(ids.slice(2));
    const n = await R.requeueHeld(id, at(120));
    const right = [ids[0], ids[1]].map(rowOf).every((r) => r?.status === "PENDING" && r.attempts === 0 && r.claimToken === null
      && r.claimedAt === at(110) && r.failureClass === null && r.updatedAt === at(120));                 // D15: the claim's instant kept
    const othersSame = snap(ids.slice(2)) === keep;
    const otherCampaign = rowOf(otherIds[0])?.status === "HELD";
    const reclaimed = await R.claim(id, 10, "tok_req_0002", at(121));
    return [n === 2 && right && othersSame && otherCampaign && ids_(reclaimed) === [ids[0], ids[1]].join(","),
      `requeued ${n} · reset right ${right} · every other row untouched ${othersSame} · the other campaign's HELD kept ${otherCampaign} · claimed again [${ids_(reclaimed)}]`];
  });

  // ── §2.23 · lastActivity ───────────────────────────────────────────────────────────────────────────
  await check(p(L.s223), async () => {
    const id = "cmp_activity";
    const ids = await campaignOf(id, 3, 23100);
    const none = await R.lastActivity(id);
    await R.claim(id, 1, "tok_act_0001", at(130));                              // row 0, at 130 …
    await R.settle([sent(ids[0], "tok_act_0001", "sms_act_0")], at(131));       // … settled: its claim still counts
    await R.claim(id, 1, "tok_act_0002", at(140));                              // row 1, at 140
    const newest = await R.lastActivity(id);
    await R.settle([release(ids[1], "tok_act_0002", 1)], at(141));              // released: a page WAS driving at 140 (D15)
    const afterRelease = await R.lastActivity(id);
    await R.claim(id, 1, "tok_act_0003", at(150));                              // row 1 again, at 150 — a later claim moves it on …
    await R.settle([held(ids[1], "tok_act_0003")], at(151));                    // … held …
    await R.requeueHeld(id, at(160));                                           // … and requeued by Resume: still 150
    const afterRequeue = await R.lastActivity(id);
    await campaignOf("cmp_activity_other", 1, 23200);
    await R.claim("cmp_activity_other", 1, "tok_act_other", at(500));
    const own = await R.lastActivity(id);
    return [none === null && newest === at(140) && afterRelease === at(140) && afterRequeue === at(150) && own === at(150),
      `none ${none} · after two claims ${newest} · after the release ${afterRelease} · after a later claim, a hold and the requeue ${afterRequeue} · beside another campaign's later claim ${own}`];
  });

  // ── §2.24 · the reaper's evidence read ─────────────────────────────────────────────────────────────
  await check(p(L.s224), async () => {
    const T = "SmsCampaignRecipient";
    const message = (reference: string, targetType: string, targetId: string, status: StoredSmsMessage["status"], createdAt: string): StoredSmsMessage => ({
      reference, msisdn: keyOf(23300), purpose: "MARKETING", provider: "console", senderId: "50pick", bodyLen: 72, status,
      providerMsg: null, dlrStatus: null, dlrDesc: null, balanceTzs: null, attempts: 1, targetType, targetId, createdAt,
      sentAt: status === "ACCEPTED" ? createdAt : null, deliveredAt: null, failedAt: status === "FAILED" ? createdAt : null,
    });
    // DC-2 · rcp_ft_1's NEWEST message holds the LOWER reference, so an answer picked by reference alone (references are
    // random hex in production) is seen as well as one picked oldest-first
    await M.createMany([
      message("sms_ft_0000000000000000000a", T, "rcp_ft_1", "QUEUED", at(160)),            // rcp_ft_1's newest — the lower reference
      message("sms_ft_0000000000000000000b", T, "rcp_ft_1", "FAILED", at(150)),
      message("sms_ft_0000000000000000000c", T, "rcp_ft_2", "ACCEPTED", at(150)),
      message("sms_ft_0000000000000000000d", T, "rcp_ft_2", "UNKNOWN", at(150)),           // the same instant: the higher reference
      message("sms_ft_0000000000000000000e", "SmsCampaignTest", "rcp_ft_3", "ACCEPTED", at(170)),
      message("sms_ft_0000000000000000000f", "InviteEntry", "rcp_ft_1", "ACCEPTED", at(180)),
    ]);
    const found = await M.findByTargets(T, ["rcp_ft_2", "rcp_ft_1", "rcp_ft_3", "rcp_ft_none"]);
    const got = found.map((m) => `${m.targetId}:${m.reference.slice(-1)}`).join(",");
    const empty = await M.findByTargets(T, []);
    const tooMany = await throws(() => M.findByTargets(T, Array.from({ length: CM.SMS_RECIPIENT_BATCH_MAX + 1 }, (_, i) => `rcp_ft_${i}`)));
    if (found[0]) found[0].status = "FAILED"; // a copy: the store must not move
    const copy = (await M.findByTargets(T, ["rcp_ft_1"]))[0]?.status === "QUEUED";
    return [got === "rcp_ft_1:a,rcp_ft_2:d" && empty.length === 0 && tooMany && copy,
      `[${got}] · empty ${empty.length} · 201 ids ${tooMany ? "refused" : "ACCEPTED"} · copies ${copy}`];
  });

  // ── §2.25 · the rule set first, in every door ───────────────────────────────────────────────────────
  await check(p(L.s225), async () => {
    const id = "cmp_rules_first";
    const ids = await campaignOf(id, 2, 23400);
    const others = rowsOf("cmp_claim_five").length;
    const keep = snap(ids);
    const refused: Array<[string, boolean]> = [
      ["a claim with a lost campaign id", await throws(() => R.claim(undefined as unknown as string, 5, "tok_rules_0001", at(200)))],
      ["a claim of 0", await throws(() => R.claim(id, 0, "tok_rules_0001", at(200)))],
      ["a claim above the bound", await throws(() => R.claim(id, CM.SMS_RECIPIENT_CLAIM_MAX + 1, "tok_rules_0001", at(200)))],
      ["a token too short", await throws(() => R.claim(id, 5, "tok", at(200)))],
      ["a claim instant in another spelling", await throws(() => R.claim(id, 5, "tok_rules_0001", "2026-10-02 09:00"))],
      ["claimedBy with a lost token", await throws(() => R.claimedBy(id, undefined as unknown as string))],
      ["a stranded cutoff that is not an instant", await throws(() => R.findStranded(id, "yesterday", 10))],
      ["a stranded read of 0", await throws(() => R.findStranded(id, at(0), 0))],
      ["a stranded read above the bound", await throws(() => R.findStranded(id, at(0), CM.SMS_RECIPIENT_BATCH_MAX + 1))],
      ["a requeue with a lost campaign id", await throws(() => R.requeueHeld(undefined as unknown as string, at(200)))],
      ["a requeue instant in another spelling", await throws(() => R.requeueHeld(id, "now"))],
      ["an activity read of no campaign", await throws(() => R.lastActivity(""))],
      ["an evidence read of no type", await throws(() => M.findByTargets("", ["rcp_x_0001"]))],
      ["an evidence read of an empty id", await throws(() => M.findByTargets("SmsCampaignRecipient", [""]))],
    ];
    const letThrough = refused.filter(([, r]) => !r).map(([n]) => n);
    const unchanged = snap(ids) === keep && rowsOf("cmp_claim_five").length === others
      && rowsOf("cmp_claim_five").every((r) => r.claimToken === null || !r.claimToken.startsWith("tok_rules"));
    return [letThrough.length === 0 && unchanged, `let through: [${letThrough.join("; ")}] · nothing written ${unchanged}`];
  });

  // ── §2.26 · claimedBy ──────────────────────────────────────────────────────────────────────────────
  await check(p(L.s226), async () => {
    const id = "cmp_claimed_by";
    const ids = await campaignOf(id, 4, 23500);
    await R.claim(id, 4, "tok_cb_00001", at(210));
    const all = await R.claimedBy(id, "tok_cb_00001");
    await R.settle([sent(ids[0], "tok_cb_00001", "sms_cb_0"), release(ids[1], "tok_cb_00001", 1), held(ids[2], "tok_cb_00001")], at(211));
    const left = await R.claimedBy(id, "tok_cb_00001");
    const foreign = await R.claimedBy(id, "tok_cb_other1");
    const elsewhere = await R.claimedBy("cmp_claim_shape", "tok_cb_00001");
    return [ids_(all) === ids.join(",") && ids_(left) === ids[3] && foreign.length === 0 && elsewhere.length === 0,
      `after the claim [${ids_(all)}] · after a settle, a release and a hold [${ids_(left)}] · another token ${foreign.length} · another campaign ${elsewhere.length}`];
  });

  // ── §2.27 · the claim's bound is one sendBatch chunk ─────────────────────────────────────────────────
  await check(p(L.s227), () => {
    const m = /export const BATCH_MAX = ([0-9]+);/.exec(w.blackball);
    const batchMax = m ? Number(m[1]) : Number.NaN;
    return [batchMax === CM.SMS_RECIPIENT_CLAIM_MAX, `sms-blackball BATCH_MAX ${batchMax} · SMS_RECIPIENT_CLAIM_MAX ${CM.SMS_RECIPIENT_CLAIM_MAX}`];
  });

  // ── §2.28 · ⛔ the settle's write: its row of the table, never the account link, never a clock in a send instant ──────
  await check(p(L.s228), () => {
    const SETTLE_AT = at(70);
    const W = "tok_write_0001";
    const lawful: SmsCampaignRecipientSettle[] = [
      sent("rcp_write_0001", W, "sms_write_1"),                                    // sentAt at(50): the hand-over, never at(70)
      skipped("rcp_write_0002", W),
      { id: "rcp_write_0003", claimToken: W, to: "FAILED", failureClass: "BAD_MSISDN", error: null, failedAt: at(55), smsReference: null, gateTrail: TRAIL("failed") },
      unsure("rcp_write_0004", W, "sms_write_4"),
      {
        id: "rcp_write_0005", claimToken: W, to: "DELIVERED", smsReference: "sms_write_5", sentAt: at(52), deliveredAt: at(56), optOutToken: null,
        locale: null, segments: null, bodyLen: 72, gateTrail: TRAIL("delivered"),
      },
      held("rcp_write_0006", W),
      release("rcp_write_0007", W, 1),
    ];
    const wrong: string[] = [];
    for (const pp of lawful) {
      const columns = pp.to === "PENDING" ? ["claimToken"] : Object.keys(CM.SMS_RECIPIENT_SETTLE_KEYS[pp.to]);
      const want = [...columns, "status", "updatedAt"].sort().join(",");
      // the patch as a careless caller could hand it: the account link, the number and the contact riding along
      const carried = { ...pp, userId: "usr_erased_0001", msisdn: keyOf(23600), contactId: "mc_write_0001" } as unknown as SmsCampaignRecipientSettle;
      const wr = w.rules.settleWrite(carried, SETTLE_AT);
      const got = Object.keys(wr.set).sort().join(",");
      const patchOf = pp as unknown as Record<string, unknown>;
      const values = Object.entries(wr.set).every(([k, v]) => (k === "status" ? v === pp.to : k === "updatedAt" ? v === SETTLE_AT
        : k === "claimToken" ? v === null : JSON.stringify(v) === JSON.stringify(patchOf[k])));
      const moves = wr.attemptsBy === (pp.to === "PENDING" ? pp.attemptsDelta : 0);
      if (got !== want || !values || !moves) wrong.push(`${pp.to} [${got}]${values ? "" : " (a value not the patch's)"}${moves ? "" : " (attempts moved)"}`);
    }
    const sentSet = w.rules.settleWrite(lawful[0], SETTLE_AT).set;
    const deliveredSet = w.rules.settleWrite(lawful[4], SETTLE_AT).set;
    const instants = sentSet.sentAt === at(50) && sentSet.updatedAt === SETTLE_AT && deliveredSet.sentAt === at(52) && deliveredSet.deliveredAt === at(56);
    const given = (lawful[0] as { gateTrail: SmsCampaignGateTrail }).gateTrail;
    const stored = sentSet.gateTrail;
    const trailCopied = Array.isArray(stored) && stored !== given && stored[0] !== given[0] && JSON.stringify(stored) === JSON.stringify(given);
    return [wrong.length === 0 && instants && trailCopied,
      `off the table: [${wrong.join("; ")}] · send instants as carried, the clock in updatedAt alone ${instants} · the trail copied ${trailCopied}`];
  });

  /* ── §2.29–§2.31 · U46a · THE RECEIPT DOOR, EXECUTED ON THE MEMORY TWIN (ENGINE-SPEC §4.14, E28) ─────────────────────────
   * Every row reaches its state through the doors themselves (claim → settle → receipt), never a hand-set map, so a plant
   * in the receipt door is seen. ⛔ No backslash below. */
  /** A receipt as the DLR route's campaign arm hands it in: the message's reference and number, the verdict, the token as
   *  the mapper read it, the vendor's words scrubbed, the instant it arrived. */
  const receipt = (reference: string, msisdn: string, status: "DELIVERED" | "FAILED", o: Partial<SmsRecipientReceipt> = {}): SmsRecipientReceipt => ({
    reference, msisdn, status, rawStatus: status === "DELIVERED" ? "DELIVRD" : "UNDELIV",
    desc: status === "DELIVERED" ? "Success" : "Absent subscriber", at: at(300), ...o,
  });
  const applied = (x: SmsRecipientReceiptResult): boolean => x.changed && x.reason === "applied";

  // ── §2.29 · ⭐ a receipt moves a row forward, and writes nothing else ───────────────────────────────────
  await check(p(L.s229), async () => {
    const id = "cmp_receipt_moves";
    const ids = await campaignOf(id, 4, 24000);
    const key = (i: number) => keyOf(24000 + i);
    const T = "tok_rcpt_0001";
    await R.claim(id, 4, T, at(290));
    // rows 0 and 3 SENT, row 1 UNCONFIRMED without its reference (E3: the transport died first), row 2 still claimed (D5)
    await R.settle([sent(ids[0], T, "sms_rcpt_0"), unsure(ids[1], T, null), sent(ids[3], T, "sms_rcpt_3")], at(291));
    const before = new Map(rowsOf(id).map((r): [string, StoredSmsCampaignRecipient] => [r.id, { ...r }]));
    const answers = [
      await R.recordReceipt(ids[0], receipt("sms_rcpt_0", key(0), "DELIVERED")),
      await R.recordReceipt(ids[1], receipt("sms_rcpt_1", key(1), "DELIVERED")),
      await R.recordReceipt(ids[2], receipt("sms_rcpt_2", key(2), "DELIVERED")),
      await R.recordReceipt(ids[3], receipt("sms_rcpt_3", key(3), "FAILED")),
    ];
    const lateSettle = await R.settle([sent(ids[2], T, "sms_rcpt_2")], at(310));
    const [r0, r1, r2, r3] = ids.map(rowOf);
    /** DELIVERED at the receipt's instant, the claim's token and instant kept, nothing but `except` moved. */
    const deliveredRow = (r: StoredSmsCampaignRecipient | undefined, rid: string, except: readonly string[]): boolean =>
      r?.status === "DELIVERED" && r.deliveredAt === at(300) && r.updatedAt === at(300) && r.claimToken === T && r.claimedAt === at(290)
        && sameBut(r, before.get(rid), ["status", "deliveredAt", "updatedAt", ...except]);
    const fromSent = deliveredRow(r0, ids[0], []) && r0?.smsReference === "sms_rcpt_0" && r0.sentAt === at(50);
    const fromUnsure = deliveredRow(r1, ids[1], ["smsReference"]) && r1?.smsReference === "sms_rcpt_1" && r1.sentAt === null;
    const fromClaimed = deliveredRow(r2, ids[2], ["smsReference"]) && r2?.smsReference === "sms_rcpt_2"
      && lateSettle.settled === 0 && lateSettle.lost.join(",") === ids[2];
    const toFailed = r3?.status === "FAILED" && r3.failedAt === at(300) && r3.updatedAt === at(300) && r3.failureClass === "receipt:UNDELIV"
      && r3.error === "Absent subscriber" && r3.smsReference === "sms_rcpt_3" && r3.claimToken === T && r3.deliveredAt === null
      && sameBut(r3, before.get(ids[3]), ["status", "failedAt", "failureClass", "error", "updatedAt"]);
    return [answers.every(applied) && fromSent && fromUnsure && fromClaimed && toFailed,
      `answers [${answers.map((x) => x.reason).join(",")}] · SENT ${fromSent} · UNCONFIRMED ${fromUnsure} · still claimed ${fromClaimed} (its late settle lost [${lateSettle.lost}]) · FAILED ${toFailed}`];
  });

  // ── §2.30 · ⛔ never a settled row, never another person's ─────────────────────────────────────────
  await check(p(L.s230), async () => {
    const id = "cmp_receipt_stays";
    const ids = await campaignOf(id, 7, 24100);
    const key = (i: number) => keyOf(24100 + i);
    const T = "tok_rcpt_0002";
    await R.claim(id, 7, T, at(320));
    await R.settle([
      sent(ids[0], T, "sms_stay_0"),
      { id: ids[1], claimToken: T, to: "FAILED", failureClass: "BAD_MSISDN", error: null, failedAt: at(321), smsReference: null, gateTrail: TRAIL("failed") },
      skipped(ids[2], T),
      held(ids[3], T),
      sent(ids[4], T, "sms_stay_4"),
      sent(ids[5], T, "sms_stay_5"),
    ], at(321));                                                                    // row 6 stays PENDING under the claim
    const first = await R.recordReceipt(ids[0], receipt("sms_stay_0", key(0), "DELIVERED"));
    const keep = snap(ids);
    const misses: Array<[string, SmsRecipientReceiptResult, SmsRecipientReceiptResult["reason"]]> = [
      ["a late FAILED after its DELIVERED", await R.recordReceipt(ids[0], receipt("sms_stay_0", key(0), "FAILED", { at: at(330) })), "settled"],
      ["a DELIVERED for a row the wire refused (FAILED)", await R.recordReceipt(ids[1], receipt("sms_stay_1", key(1), "DELIVERED")), "settled"],
      ["a DELIVERED for a SKIPPED row", await R.recordReceipt(ids[2], receipt("sms_stay_2", key(2), "DELIVERED")), "settled"],
      ["a FAILED for a HELD row", await R.recordReceipt(ids[3], receipt("sms_stay_3", key(3), "FAILED")), "settled"],
      ["another number's receipt", await R.recordReceipt(ids[4], receipt("sms_stay_4", key(94), "DELIVERED")), "mismatch"],
      ["another message's reference", await R.recordReceipt(ids[5], receipt("sms_stay_other", key(5), "DELIVERED")), "mismatch"],
      ["a row that is not there", await R.recordReceipt("rcp_receipt_nobody", receipt("sms_stay_x", key(7), "DELIVERED")), "not_found"],
    ];
    const unchanged = snap(ids) === keep;
    // DC-7 · a reference another row holds: refused whole, with the code Prisma's unique index carries
    let dupCode: unknown = "no refusal";
    try {
      await R.recordReceipt(ids[6], receipt("sms_stay_4", key(6), "DELIVERED"));
    } catch (e) {
      dupCode = (e as { code?: unknown } | null)?.code;
    }
    const stillUnchanged = snap(ids) === keep;
    const misread = misses.filter(([, x, want]) => x.changed || x.reason !== want).map(([n, x]) => `${n} → ${x.changed ? "APPLIED" : x.reason}`);
    return [applied(first) && misread.length === 0 && unchanged && dupCode === "P2002" && stillUnchanged && rowOf(ids[0])?.failedAt === null,
      `misread: [${misread.join("; ")}] · nothing written ${unchanged} · a held reference ${dupCode === "P2002" ? "refused, code P2002" : `NOT refused as P2002 (${String(dupCode)})`} · still nothing written ${stillUnchanged}`];
  });

  // ── §2.31 · the receipt's rule set first, and its write exactly its columns ──────────────────────────────
  await check(p(L.s231), async () => {
    const refusesR = (rid: unknown, r: unknown): boolean => {
      try { w.rules.assertReceipt(rid as string, r as SmsRecipientReceipt); return false; } catch { return true; }
    };
    const withoutR = (o: SmsRecipientReceipt, k: string): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k));
    const RID = "rcp_rule_0001";
    const OK_D = receipt("sms_0a1b2c3d4e5f60718293a4b5", keyOf(24200), "DELIVERED");
    const OK_F = receipt("sms_0a1b2c3d4e5f60718293a4b6", keyOf(24200), "FAILED");
    const MAXT = CM.SMS_RECEIPT_TOKEN_MAX;
    const [rules, why] = verdicts([
      ["a lost id", refusesR(undefined, OK_D)],
      ["an empty id", refusesR("", OK_D)],
      ["⛔ a receipt carrying userId — the account link only erasure clears", refusesR(RID, { ...OK_D, userId: "usr_erased_0001" })],
      ["a receipt carrying a claim token", refusesR(RID, { ...OK_D, claimToken: "tok_rcpt_9999" })],
      ["no number", refusesR(RID, withoutR(OK_D, "msisdn"))],
      ["no reference", refusesR(RID, withoutR(OK_D, "reference"))],
      ["no token", refusesR(RID, withoutR(OK_D, "rawStatus"))],
      ["no description key at all", refusesR(RID, withoutR(OK_D, "desc"))],
      ["no instant", refusesR(RID, withoutR(OK_D, "at"))],
      ["a reference with a space in it", refusesR(RID, { ...OK_D, reference: "sms 0a1b2c" })],
      ["the number as +255", refusesR(RID, { ...OK_D, msisdn: `+${keyOf(24200)}` })],
      ["the number as 07", refusesR(RID, { ...OK_D, msisdn: `0${keyOf(24200).slice(3)}` })],
      ["a verdict of ACCEPTED", refusesR(RID, { ...OK_D, status: "ACCEPTED" })],
      ["a verdict of UNCONFIRMED", refusesR(RID, { ...OK_D, status: "UNCONFIRMED" })],
      ["an instant in another spelling", refusesR(RID, { ...OK_D, at: "2026-10-02 09:05" })],
      ["a description that is not text", refusesR(RID, { ...OK_D, desc: 42 })],
      ["a FAILED token with a trailing space", refusesR(RID, { ...OK_F, rawStatus: "UNDELIV " })],
      ["a FAILED token with a leading space", refusesR(RID, { ...OK_F, rawStatus: " UNDELIV" })],
      ["an empty FAILED token", refusesR(RID, { ...OK_F, rawStatus: "" })],
      [`a FAILED token of ${MAXT + 1} characters`, refusesR(RID, { ...OK_F, rawStatus: "X".repeat(MAXT + 1) })],
      ["⛔ a phone number as a FAILED token", refusesR(RID, { ...OK_F, rawStatus: "255712345678" })],
      ["a FAILED description of 201 characters", refusesR(RID, { ...OK_F, desc: "x".repeat(201) })],
      ["⛔ a phone number in a FAILED description", refusesR(RID, { ...OK_F, desc: "subscriber 0712 345 678 absent" })],
      ["⛔ a phone number with a plus and dashes in a FAILED description", refusesR(RID, { ...OK_F, desc: "sent to +255-712-345-678" })],
    ], [
      ["a DELIVERED receipt", refusesR(RID, OK_D)],
      ["a FAILED receipt", refusesR(RID, OK_F)],
      ["a FAILED receipt with no description", refusesR(RID, { ...OK_F, desc: null })],
      [`a FAILED token of ${MAXT} characters and a description of 200`, refusesR(RID, { ...OK_F, rawStatus: "X".repeat(MAXT), desc: "x".repeat(200) })],
      ["a FAILED description holding the masked number the route's scrub leaves", refusesR(RID, { ...OK_F, desc: "subscriber ••••78 absent" })],
      ["a DELIVERED receipt whose words it never writes (long, a number in them)", refusesR(RID, { ...OK_D, desc: `${"x".repeat(250)} 0712 345 678` })],
    ]);
    // ⛔ THE DOOR ASKS IT FIRST: a lost id, a lost number and a number in the words each refused before anything is read
    const id = "cmp_receipt_rules";
    const ids = await campaignOf(id, 1, 24300);
    await R.claim(id, 1, "tok_rcpt_0003", at(340));
    await R.settle([sent(ids[0], "tok_rcpt_0003", "sms_rules_0")], at(341));
    const keep = snap(ids);
    const doorFirst = [
      await throws(() => R.recordReceipt(undefined as unknown as string, receipt("sms_rules_0", keyOf(24300), "DELIVERED"))),
      await throws(() => R.recordReceipt(ids[0], { ...receipt("sms_rules_0", keyOf(24300), "DELIVERED"), msisdn: undefined } as unknown as SmsRecipientReceipt)),
      await throws(() => R.recordReceipt(ids[0], receipt("sms_rules_0", keyOf(24300), "FAILED", { desc: "call 0712 345 678" }))),
    ].every(Boolean) && snap(ids) === keep;
    // ⛔ THE WRITE: exactly its columns, built from the receipt's own fields — a careless caller's extras never reach a column
    const careless = { ...OK_D, userId: "usr_erased_0001", claimToken: null, sentAt: at(1), attempts: 9, contactId: "mc_x" } as unknown as SmsRecipientReceipt;
    const wd = w.rules.receiptWrite(careless);
    const wf = w.rules.receiptWrite({ ...OK_F, msisdn: keyOf(24201), userId: "usr_erased_0001" } as unknown as SmsRecipientReceipt);
    const keysD = Object.keys(wd.set).sort().join(",");
    const keysF = Object.keys(wf.set).sort().join(",");
    const writes = keysD === "deliveredAt,smsReference,status,updatedAt" && keysF === "error,failedAt,failureClass,smsReference,status,updatedAt"
      && wd.attemptsBy === 0 && wf.attemptsBy === 0
      && wd.set.status === "DELIVERED" && wd.set.deliveredAt === OK_D.at && wd.set.updatedAt === OK_D.at && wd.set.smsReference === OK_D.reference
      && wf.set.status === "FAILED" && wf.set.failedAt === OK_F.at && wf.set.updatedAt === OK_F.at && wf.set.smsReference === OK_F.reference
      && wf.set.failureClass === `${CM.SMS_RECEIPT_CLASS_PREFIX}${OK_F.rawStatus}` && wf.set.error === OK_F.desc;
    return [rules && doorFirst && writes, `${why} · the door asks it first ${doorFirst} · receiptWrite writes [${keysD}] and [${keysF}]`];
  });

  /* ── §2.32 · U43b-2 · DC-4 · THE SEND RECORD, EXECUTED ON THE MEMORY TWIN (ENGINE-SPEC §4.13 decision 6) ─────────────────
   * Every row reaches its state through the doors (claim → receipt → send record; claim → settle), never a hand-set map. ── */
  await check(p(L.s232), async () => {
    const id = "cmp_send_record";
    const ids = await campaignOf(id, 6, 24400);
    const key = (i: number) => keyOf(24400 + i);
    const T = "tok_srec_0001";
    await R.claim(id, 6, T, at(350));
    // rows 0 (DELIVERED), 1 (FAILED) and 4 (DELIVERED): a receipt beat the slice's settle; row 2 SENT by the settle; 3 and 5 claimed
    await R.recordReceipt(ids[0], receipt("sms_srec_0", key(0), "DELIVERED", { at: at(352) }));
    await R.recordReceipt(ids[1], receipt("sms_srec_1", key(1), "FAILED", { at: at(352) }));
    await R.recordReceipt(ids[4], receipt("sms_srec_4", key(4), "DELIVERED", { at: at(352) }));
    await R.settle([sent(ids[2], T, "sms_srec_2")], at(353));
    const record = (o: Partial<SmsRecipientSendRecord> = {}): SmsRecipientSendRecord => ({
      claimToken: T, gateTrail: TRAIL("ok"), optOutToken: "K7MXP2QR", locale: "SW", segments: 1, bodyLen: 72, sentAt: at(351), ...o,
    });
    const before = new Map(rowsOf(id).map((r): [string, StoredSmsCampaignRecipient] => [r.id, { ...r }]));
    const w0 = await R.recordSend(ids[0], record(), at(354));
    const w1 = await R.recordSend(ids[1], record({ sentAt: null, locale: null }), at(354));
    const SIX = ["gateTrail", "optOutToken", "locale", "segments", "bodyLen", "sentAt", "updatedAt"];
    const r0 = rowOf(ids[0]);
    const r1 = rowOf(ids[1]);
    const intoDelivered = w0.written && r0?.status === "DELIVERED" && r0.deliveredAt === at(352) && r0.smsReference === "sms_srec_0" && r0.claimToken === T
      && r0.sentAt === at(351) && r0.optOutToken === "K7MXP2QR" && r0.locale === "SW" && r0.segments === 1 && r0.bodyLen === 72 && r0.updatedAt === at(354)
      && JSON.stringify(r0.gateTrail) === JSON.stringify(TRAIL("ok")) && sameBut(r0, before.get(ids[0]), SIX);
    const intoFailed = w1.written && r1?.status === "FAILED" && r1.failureClass === "receipt:UNDELIV" && r1.error === "Absent subscriber"
      && r1.failedAt === at(352) && r1.sentAt === null && r1.claimToken === T && sameBut(r1, before.get(ids[1]), SIX);
    const keep = snap(ids);
    const misses: Array<[string, SmsRecipientSendRecordResult]> = [
      ["a second record over the first (its trail is no longer null)", await R.recordSend(ids[0], record({ gateTrail: TRAIL("again") }), at(355))],
      ["a SENT row (the settle landed)", await R.recordSend(ids[2], record(), at(355))],
      ["a row still PENDING under the claim", await R.recordSend(ids[3], record(), at(355))],
      ["another claim's record", await R.recordSend(ids[4], record({ claimToken: "tok_srec_9999" }), at(355))],
      ["a row that is not there", await R.recordSend("rcp_send_record_nobody", record(), at(355))],
    ];
    const missedWrites = misses.filter(([, x]) => x.written).map(([n]) => n);
    const unchanged = snap(ids) === keep;
    // ── the rule set first ──
    const refusesS = (rid: unknown, s: unknown): boolean => {
      try { w.rules.assertSendRecord(rid as string, s as SmsRecipientSendRecord, at(360)); return false; } catch { return true; }
    };
    const withoutS = (k: string): Record<string, unknown> => Object.fromEntries(Object.entries(record()).filter(([key]) => key !== k));
    const RID = "rcp_srec_rule_0001";
    const [rules, why] = verdicts([
      ["a lost id", refusesS(undefined, record())],
      ["an empty id", refusesS("", record())],
      ["⛔ a record carrying the status", refusesS(RID, { ...record(), status: "SENT" })],
      ["⛔ a record carrying userId — the account link only erasure clears", refusesS(RID, { ...record(), userId: "usr_erased_0001" })],
      ["a record carrying a reference", refusesS(RID, { ...record(), smsReference: "sms_x" })],
      ["no hand-over key at all", refusesS(RID, withoutS("sentAt"))],
      ["no trail", refusesS(RID, withoutS("gateTrail"))],
      ["a claim of another shape", refusesS(RID, record({ claimToken: "tok srec" }))],
      ["an empty trail", refusesS(RID, record({ gateTrail: [] }))],
      ["⛔ a phone number in the trail", refusesS(RID, record({ gateTrail: [{ check: "gate", verdict: "sent to 0712 345 678", wording: null, source: null }] }))],
      ["a token with a space", refusesS(RID, record({ optOutToken: "K7MX P2QR" }))],
      ["a variant in another spelling", refusesS(RID, record({ locale: "sw" as never }))],
      ["a size of 0", refusesS(RID, record({ segments: 0 }))],
      ["a length that is not whole", refusesS(RID, record({ bodyLen: 72.5 }))],
      ["a hand-over instant in another spelling", refusesS(RID, record({ sentAt: "2026-10-02 09:05" }))],
    ], [
      ["a lawful record", refusesS(RID, record())],
      ["every nullable column null (an unanswered message)", refusesS(RID, record({ optOutToken: null, locale: null, segments: null, bodyLen: null, sentAt: null }))],
      ["a trail whose source is a reference holding digits", refusesS(RID, record({ gateTrail: [{ check: "dispatch", verdict: "handed_over", wording: null, source: "sms_0712345678abcdef01234567" }] }))],
    ]);
    // ⛔ THE DOOR ASKS IT FIRST: a lost id and a number in the trail each refused before anything is read
    const doorFirst = [
      await throws(() => R.recordSend(undefined as unknown as string, record(), at(361))),
      await throws(() => R.recordSend(ids[5], record({ gateTrail: [{ check: "gate", verdict: "call 0712 345 678", wording: null, source: null }] }), at(361))),
    ].every(Boolean) && snap(ids) === keep;
    // ⛔ THE WRITE: exactly its columns — a careless caller's extras never reach a column, and the trail is copied
    const careless = { ...record(), status: "SENT", claimToken: null, smsReference: "sms_y", attempts: 9, userId: "usr_erased_0001" } as unknown as SmsRecipientSendRecord;
    const wr = w.rules.sendRecordWrite(careless, at(362));
    const keys = Object.keys(wr.set).sort().join(",");
    const writes = keys === "bodyLen,gateTrail,locale,optOutToken,segments,sentAt,updatedAt" && wr.attemptsBy === 0 && wr.set.updatedAt === at(362)
      && wr.set.gateTrail !== careless.gateTrail && JSON.stringify(wr.set.gateTrail) === JSON.stringify(careless.gateTrail);
    return [intoDelivered && intoFailed && missedWrites.length === 0 && unchanged && rules && doorFirst && writes,
      `into DELIVERED ${intoDelivered} · into FAILED ${intoFailed} · wrote where it must not [${missedWrites.join("; ")}] · nothing else changed ${unchanged} · ${why} · the door asks it first ${doorFirst} · sendRecordWrite writes [${keys}]`];
  });

  // ── §3.1 · the MARKETING writer population ─────────────────────────────────────────────────
  const writers = w.src.filter((f) => /purpose\s*:\s*["']MARKETING["']/.test(f.text)).map((f) => f.path);
  const undeclared = writers.filter((f) => !MARKETING_WRITERS.includes(f));
  ok(p(L.s31), undeclared.length === 0, undeclared.join(", ") || `${w.src.length} files scanned`);

  // ── §3.2 · the UNCONFIRMED writer population (U43-0) ───────────────────────────────────────
  // ⭐ The pin's own controls ride in the same assertion: a pin that matched nothing would pass every src tree.
  const pinSees = [
    'await pc().smsCampaignRecipient.updateMany({ where: { id }, data: { status: "UNCONFIRMED" } });',
    "row.status = 'UNCONFIRMED';",
    `update "SmsCampaignRecipient" set "status" = 'UNCONFIRMED' where "id" = $1`,
    // U43a · the settle door's own spelling, on one line and as the last key of a literal
    'await db.smsCampaignRecipient.settle([{ id, claimToken, to: "UNCONFIRMED", smsReference: ref, gateTrail }], at);',
    'return { id: row.id, claimToken: row.claimToken ?? "", to: "UNCONFIRMED" };',
  ].every((t) => WRITES_UNCONFIRMED.test(t));
  const pinIgnores = [
    'if (row.status === "UNCONFIRMED") return;',
    'where: { status: { in: ["SENT", "UNCONFIRMED"] } }',
    'UNCONFIRMED: "settled",',
    'return { ref, outcome: "unconfirmed" };',
    // U43a · a TYPE member and a comparison of the patch's target are not writes
    '  | { id: string; claimToken: string; to: "UNCONFIRMED"; smsReference: string | null }',
    'if (p.to === "UNCONFIRMED") continue;',
  ].every((t) => !WRITES_UNCONFIRMED.test(t));
  const uWriters = w.src.filter((f) => WRITES_UNCONFIRMED.test(f.text)).map((f) => f.path);
  const uUndeclared = uWriters.filter((f) => !UNCONFIRMED_WRITERS.includes(f));
  ok(p(L.s32), uUndeclared.length === 0 && pinSees && pinIgnores,
    `undeclared [${uUndeclared.join(", ")}] of ${w.src.length} files · the pin sees a key, an assignment and SQL ${pinSees} · ignores a comparison, a read and a word ${pinIgnores}`);
}

if (!PROVE_RED) {
  await run(REAL, "");
  console.log(`\ncampaign-models: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await run(REAL, "base:");
  if (fail) problems.push(`BASELINE red: ${failed.join(" | ")}`);

  /* ── THE PLANTS — each a defect as somebody would write it, in memory ── */
  const addFile = REAL.migrations.find((m) => /ALTER TYPE\s+"SmsPurpose"\s+ADD VALUE/.test(m.sql));
  const tablesFolder = tablesMigration(REAL)?.folder ?? "";
  /** One exact text plant: the `from` must sit in the text EXACTLY once, or the case reports its plant missing. */
  const plant = (text: string, from: string, to: string): string => {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error(`the plant's anchor matches ${n} times: ${from.slice(0, 60)}`);
    return text.replace(from, () => to);
  };
  /** One exact text plant INSIDE one model's block (`schemaModel`), so a later model that spells a column the same way
   *  (U29's ContactImport has a pausedAt too) can never make an anchor match twice. */
  const withModel = (model: string, from: string, to: string): World => {
    const block = schemaModel(REAL.schema, model);
    if (block === "") throw new Error(`the schema has no model ${model}`);
    return { ...REAL, schema: REAL.schema.replace(block, () => plant(block, from, to)) };
  };
  /** ⚠️ The plant edits the LF-normalised text, so a CRLF checkout of the migration cannot make an anchor vanish. */
  const withTablesSql = (edit: (sql: string) => string): World => ({
    ...REAL, migrations: REAL.migrations.map((m) => (m.folder === tablesFolder ? { ...m, sql: edit(lf(m.sql)) } : m)),
  });
  /** ⭐ U47b-1 · the outcome index's ONE file, edited in memory (LF-normalised, as the tables plant is). */
  const outcomeFolder = REAL.migrations.find((m) => m.folder.endsWith("_sms_recipient_outcome_index"))?.folder ?? "";
  const withOutcomeFile = (edit: (sql: string) => string): World => {
    if (outcomeFolder === "") throw new Error("no _sms_recipient_outcome_index migration — U47b-1's file is missing");
    return { ...REAL, migrations: REAL.migrations.map((m) => (m.folder === outcomeFolder ? { ...m, sql: edit(lf(m.sql)) } : m)) };
  };
  const withCampaign = (o: Partial<CampaignNs>): World => ({ ...REAL, twin: { ...REAL.twin, campaign: { ...REAL.twin.campaign, ...o } } });
  const withRecipient = (o: Partial<RecipientNs>): World => ({ ...REAL, twin: { ...REAL.twin, recipient: { ...REAL.twin.recipient, ...o } } });
  const withRules = (o: Partial<Rules>): World => ({ ...REAL, rules: { ...REAL.rules, ...o } });
  /** A rule with ONE refusal deleted: an input matching `skip` passes unchecked; everything else meets the real rule. */
  const lets = <A extends unknown[]>(real: (...a: A) => void, skip: (...a: A) => boolean) => (...a: A): void => { if (!skip(...a)) real(...a); };
  /** The keys a patch sets — written without the rule set, as the plants do. */
  const definedOnly = (o: object): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  /** A recipient row born from a seed, written by hand for the plants. */
  const bornRow = (s: SmsCampaignRecipientSeed): StoredSmsCampaignRecipient => ({
    ...s, status: "PENDING", smsReference: null, locale: null, failureClass: null, error: null, skipReason: null,
    skipDetail: null, claimToken: null, claimedAt: null, attempts: 0, segments: null, bodyLen: null, costTzs: null,
    gateTrail: null, updatedAt: s.createdAt, sentAt: null, deliveredAt: null, failedAt: null,
  });
  const writeCampaign = (row: StoredSmsCampaign): StoredSmsCampaign => { mem().smsCampaigns.set(row.id, row); return { ...row }; };

  /* ── U43-0's plant helpers ── */
  const unconfirmedFile: Migration | undefined = unconfirmedAdds(REAL)[0];
  /** The migrations with U43-0's file edited (its folder, its text) or dropped (null) — re-sorted, as readMigrations
   *  sorts them, so a renamed folder lands where Postgres would meet it. */
  const withUnconfirmedFile = (edit: (m: Migration) => Migration | null): World => {
    if (unconfirmedFile === undefined) throw new Error("no migration adds UNCONFIRMED — U43-0's file is missing");
    const next = REAL.migrations.flatMap((m) => {
      if (m !== unconfirmedFile) return [m];
      const e = edit({ ...m, sql: lf(m.sql) });
      return e === null ? [] : [e];
    });
    return { ...REAL, migrations: next.sort((a, b) => a.folder.localeCompare(b.folder)) };
  };
  /** One edit INSIDE one enum's block, so a value spelled the same in another enum is never the one planted. */
  const withEnum = (name: string, edit: (block: string) => string): World => {
    const at = REAL.schema.indexOf(`enum ${name} {`);
    const end = at < 0 ? -1 : REAL.schema.indexOf("}", at);
    if (end < 0) throw new Error(`the schema has no enum ${name}`);
    const block = REAL.schema.slice(at, end + 1);
    return { ...REAL, schema: REAL.schema.slice(0, at) + edit(block) + REAL.schema.slice(end + 1) };
  };
  /** The six statuses a build before U43-0 knows. */
  const SIX: readonly string[] = ["PENDING", "HELD", "SENT", "DELIVERED", "FAILED", "SKIPPED"];

  /* ── U43a's plant helpers ── */
  const withMessage = (o: Partial<MessageNs>): World => ({ ...REAL, twin: { ...REAL.twin, message: { ...REAL.twin.message, ...o } } });
  const byId = (a: StoredSmsCampaignRecipient, b: StoredSmsCampaignRecipient): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const memRows = (): StoredSmsCampaignRecipient[] => Array.from(mem().smsCampaignRecipients.values());
  /** A write the rule set computed, applied by hand — the plants' own apply. */
  const applyWrite = (r: StoredSmsCampaignRecipient, wr: ReturnType<typeof CM.settleWrite>): void => {
    Object.assign(r, wr.set);
    r.attempts += wr.attemptsBy;
  };
  /** A planted settle: the rule set asked, then `lands` alone decides which patches are written — in place, unchecked. */
  const plantedSettle = (lands: (pp: SmsCampaignRecipientSettle, r: StoredSmsCampaignRecipient | undefined) => boolean): RecipientNs["settle"] =>
    async (patches, stamp) => {
      CM.assertSettle(patches, stamp);
      const landing = patches.filter((pp) => lands(pp, mem().smsCampaignRecipients.get(pp.id)));
      for (const pp of landing) {
        const r = mem().smsCampaignRecipients.get(pp.id);
        if (r) applyWrite(r, CM.settleWrite(pp, stamp));
      }
      const won = new Set(landing.map((pp) => pp.id));
      return { settled: won.size, lost: patches.filter((pp) => !won.has(pp.id)).map((pp) => pp.id) };
    };

  /* ── U46a's plant helpers ── */
  /** A planted receipt door: the rule set asked, then each guard the plant names LEFT OUT — the identity (the number, or
   *  only the reference arm), the status, the unique reference — or the reference left out of the write. */
  const plantedReceipt = (o: { status?: false; identity?: false; reference?: false; unique?: false; writeReference?: false }): RecipientNs["recordReceipt"] =>
    async (id, r) => {
      CM.assertReceipt(id, r);
      const row = mem().smsCampaignRecipients.get(id);
      if (row === undefined) return { changed: false, reason: "not_found" };
      const numberOk = o.identity === false || row.msisdn === r.msisdn;
      const referenceOk = o.identity === false || o.reference === false || row.smsReference === null || row.smsReference === r.reference;
      const open = o.status === false || CM.SMS_RECEIPT_FROM.includes(row.status);
      if (!numberOk || !referenceOk || !open) return { changed: false, reason: CM.receiptMiss(row, r) };
      if (o.unique !== false && memRows().some((x) => x.id !== id && x.smsReference === r.reference)) {
        throw Object.assign(new Error("planted door: a reference another row holds (P2002)"), { code: "P2002" });
      }
      const wr = CM.receiptWrite(r);
      if (o.writeReference === false) delete (wr.set as Record<string, unknown>).smsReference;
      applyWrite(row, wr);
      return { changed: true, reason: "applied" };
    };

  /* ── U43b-2's plant helper ── */
  /** A planted send record: the rule set asked, then each guard the plant names LEFT OUT — the claim, the receipt's
   *  statuses, the trail not yet written. */
  const plantedSend = (o: { claim?: false; status?: false; trail?: false }): RecipientNs["recordSend"] =>
    async (rid, s, stamp) => {
      CM.assertSendRecord(rid, s, stamp);
      const row = mem().smsCampaignRecipients.get(rid);
      if (row === undefined) return { written: false };
      if (o.claim !== false && row.claimToken !== s.claimToken) return { written: false };
      if (o.status !== false && !CM.SMS_SEND_RECORD_FROM.includes(row.status)) return { written: false };
      if (o.trail !== false && row.gateTrail !== null) return { written: false };
      applyWrite(row, CM.sendRecordWrite(s, stamp));
      return { written: true };
    };

  const CASES: Array<{ name: string; expect: string; build: () => World }> = [
    /* ── U35a's three, unchanged ── */
    {
      name: "R3 · the ADD VALUE file also creates a table — Postgres refuses the new value in that transaction (55P04)",
      expect: L.s11,
      build: () => ({ ...REAL, migrations: REAL.migrations.map((m) => (m === addFile ? { ...m, sql: `${m.sql}\nCREATE TABLE "SmsCampaign" ("id" TEXT NOT NULL);\n` } : m)) }),
    },
    {
      name: "the store's union forgets MARKETING — the schema and the code disagree on the lanes",
      expect: L.s18,
      build: () => ({ ...REAL, store: REAL.store.replace(/export type SmsPurpose = ([^;]+);/, 'export type SmsPurpose = "OTP" | "INVITE" | "OPS";') }),
    },
    {
      name: "R14 · an undeclared file sends with purpose MARKETING",
      expect: L.s31,
      build: () => ({ ...REAL, src: [...REAL.src, { path: "src/lib/server/marketing/rogue.ts", text: 'await sendBatch([{ to, body, purpose: "MARKETING" }]);' }] }),
    },
    /* ── U35b · the plan's RED line ── */
    {
      name: "⭐ a CASCADE link — deleting a contact would erase the record that we messaged them (the migration's contactId FK)",
      expect: L.s16,
      build: () => withTablesSql((sql) => plant(sql, `REFERENCES "MarketingContact"("id") ON DELETE SET NULL`, `REFERENCES "MarketingContact"("id") ON DELETE CASCADE`)),
    },
    {
      name: "a CASCADE link in the schema — the campaign relation onDelete: Cascade",
      expect: L.s16,
      build: () => withModel("SmsCampaignRecipient", "@relation(fields: [campaignId], references: [id], onDelete: Restrict)", "@relation(fields: [campaignId], references: [id], onDelete: Cascade)"),
    },
    {
      name: "⭐ a stored counter — SmsCampaign gains sentCount Int @default(0) (OD26)",
      expect: L.s110,
      build: () => withModel("SmsCampaign", "  stopReason        String?\n", "  stopReason        String?\n  sentCount         Int                    @default(0)\n"),
    },
    {
      name: "⭐ a frozen audience widened after DRAFT — the draft save writes whatever the status and the revision",
      expect: L.s24,
      build: () => withCampaign({
        update: async (id, patch, _guard, stamp) => {
          const row = mem().smsCampaigns.get(id);
          return row ? writeCampaign({ ...row, ...definedOnly(patch), draftRevision: row.draftRevision + 1, updatedAt: stamp } as StoredSmsCampaign) : null;
        },
      }),
    },
    {
      name: "a frozen key written by a transition outside DRAFT — the rule set skipped, the from-check kept",
      expect: L.s24,
      build: () => withCampaign({
        transition: async (id, t) => {
          const row = mem().smsCampaigns.get(id);
          if (!row || !t.from.includes(row.status)) return null;
          return writeCampaign({ ...row, ...definedOnly(t.patch), status: t.to ?? row.status, updatedAt: t.at } as StoredSmsCampaign);
        },
      }),
    },
    {
      name: "⭐ an unconditional transition — the status is set by id, `from` never checked",
      expect: L.s25,
      build: () => withCampaign({
        transition: async (id, t) => {
          CM.assertTransitionShape(t);
          const row = mem().smsCampaigns.get(id);
          return row ? writeCampaign({ ...row, ...definedOnly(t.patch), status: t.to ?? row.status, updatedAt: t.at } as StoredSmsCampaign) : null;
        },
      }),
    },
    {
      name: "⭐ the recipient unique index removed from the SCHEMA — the Prisma twin's skipDuplicates would dedupe on nothing",
      expect: L.s21,
      build: () => withModel("SmsCampaignRecipient", "  @@unique([campaignId, msisdn])\n", ""),
    },
    {
      name: "the recipient unique index removed from the MIGRATION",
      expect: L.s21,
      build: () => withTablesSql((sql) => plant(sql, `CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_msisdn_key" ON "SmsCampaignRecipient"("campaignId", "msisdn");`, "")),
    },
    {
      name: "a memory createMany with no dedupe — a restarted enqueue puts 1,000 people on the campaign twice",
      expect: L.s21,
      build: () => withRecipient({
        createMany: async (seeds) => {
          CM.assertSeeds(seeds);
          for (const s of seeds) mem().smsCampaignRecipients.set(s.id, bornRow(s));
          return { inserted: seeds.length, duplicates: 0 };
        },
      }),
    },
    {
      name: "a key of msisdn only — a global unique: a person on one campaign can never be on a second",
      expect: L.s22,
      build: () => withRecipient({
        createMany: async (seeds) => {
          CM.assertSeeds(seeds);
          const m = mem();
          const held = new Set(Array.from(m.smsCampaignRecipients.values(), (r) => r.msisdn));
          let inserted = 0;
          for (const s of seeds) {
            if (held.has(s.msisdn) || m.smsCampaignRecipients.has(s.id)) continue;
            m.smsCampaignRecipients.set(s.id, bornRow(s));
            held.add(s.msisdn);
            inserted++;
          }
          return { inserted, duplicates: seeds.length - inserted };
        },
      }),
    },
    {
      name: "a partial batch — the +255 and 07 spellings dropped quietly and the rest written",
      expect: L.s23,
      build: () => withRecipient({
        createMany: async (seeds) => REAL.twin.recipient.createMany(seeds.filter((s) => isGatewayMsisdn(s.msisdn))),
      }),
    },
    {
      name: "a draft save without the revision compare — last write wins between two officers",
      expect: L.s26,
      build: () => withCampaign({
        update: async (id, patch, guard, stamp) => {
          CM.assertDraftPatch(patch, guard, stamp);
          const row = mem().smsCampaigns.get(id);
          if (!row || row.status !== "DRAFT") return null;
          return writeCampaign({ ...row, ...definedOnly(patch), draftRevision: row.draftRevision + 1, updatedAt: stamp } as StoredSmsCampaign);
        },
      }),
    },
    {
      name: "counts not zero-filled — only the statuses that have rows come back",
      expect: L.s27,
      build: () => withRecipient({
        countByStatus: async (campaignId) => {
          const raw = new Map<string, number>();
          for (const r of mem().smsCampaignRecipients.values()) if (r.campaignId === campaignId) raw.set(r.status, (raw.get(r.status) ?? 0) + 1);
          return Array.from(raw, ([status, count]) => ({ status: status as SmsCampaignRecipientStatus, count }));
        },
      }),
    },
    {
      name: "a campaign born CONFIRMED (or carrying a count, an ids audience or a loose filter) is accepted",
      expect: L.s28,
      build: () => withCampaign({ create: async (row) => writeCampaign({ ...row }) }),
    },
    /* ── U35b · the rest of §1, each assertion seen red ── */
    {
      // (U43-0 re-anchored it: UNCONFIRMED is now a real value, so the invented one is F7's ACCEPTED.)
      name: "enum drift — the store's recipient-status union gains ACCEPTED, which neither the schema nor any migration has",
      expect: L.s18c,
      build: () => ({ ...REAL, store: plant(REAL.store, `| "SKIPPED" | "UNCONFIRMED";`, `| "SKIPPED" | "UNCONFIRMED" | "ACCEPTED";`) }),
    },
    {
      name: "a naive timestamp — SmsCampaign.pausedAt loses @db.Timestamptz(3) (the consent-tie lesson)",
      expect: L.s19,
      build: () => withModel("SmsCampaign", "  pausedAt          DateTime?              @db.Timestamptz(3)\n", "  pausedAt          DateTime?\n"),
    },
    {
      name: "schema and migration drift — the migration forgets the stopReason column",
      expect: L.s15,
      build: () => withTablesSql((sql) => plant(sql, `    "stopReason" TEXT,\n`, "")),
    },
    {
      name: "an index the schema declares is missing from the migration — (campaignId, status)",
      expect: L.s14,
      build: () => withTablesSql((sql) => plant(sql, `CREATE INDEX "SmsCampaignRecipient_campaignId_status_idx" ON "SmsCampaignRecipient"("campaignId", "status");`, "")),
    },
    {
      name: "the tables migration also drops an index — no longer expand-only",
      expect: L.s17,
      build: () => withTablesSql((sql) => `${sql}\nDROP INDEX "SmsCampaign_createdAt_idx";\n`),
    },
    /* ── U47b-1 · the outcome index (the review's MINOR 4): its schema line, its ONE file, its ONE statement ── */
    {
      name: "R-47b1-idx-1 · the outcome index's migration is missing — the schema declares an index no migration creates",
      expect: L.s14b,
      build: () => ({ ...REAL, migrations: REAL.migrations.filter((m) => m.folder !== outcomeFolder) }),
    },
    {
      name: "R-47b1-idx-2 · the outcome index built CONCURRENTLY — refused inside the one transaction prisma migrate runs a file in",
      expect: L.s14b,
      build: () => withOutcomeFile((sql) => plant(sql, `CREATE INDEX IF NOT EXISTS "${OUTCOME_INDEX}"`, `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${OUTCOME_INDEX}"`)),
    },
    {
      name: "R-47b1-idx-3 · the outcome file also drops the (campaignId, status) index — no longer one additive statement",
      expect: L.s14b,
      build: () => withOutcomeFile((sql) => `${sql}${NL}DROP INDEX "SmsCampaignRecipient_campaignId_status_idx";${NL}`),
    },
    {
      name: "R-47b1-idx-4 · the outcome index's columns out of the groupBy's order — (campaignId, skipReason, status, failureClass)",
      expect: L.s14,
      build: () => withOutcomeFile((sql) => plant(sql, `("campaignId", "status", "skipReason", "failureClass")`, `("campaignId", "skipReason", "status", "failureClass")`)),
    },
    {
      name: "R-47b1-idx-5 · the schema's map name and the file's name differ — the probe's drift diff would name it",
      expect: L.s14,
      build: () => withModel("SmsCampaignRecipient", `map: "${OUTCOME_INDEX}"`, `map: "${OUTCOME_INDEX}x"`),
    },
    {
      name: "R-47b1-idx-6 · the claimedAt index left out of the file (its re-review) — lastActivity reads every row again",
      expect: L.s14b,
      build: () => withOutcomeFile((sql) => plant(sql, `CREATE INDEX IF NOT EXISTS "${CLAIMED_INDEX}" ON "SmsCampaignRecipient"("campaignId", "claimedAt");`, "")),
    },
    {
      name: "a copied person column — the recipient model gains displayName (D16: a link, never a copy)",
      expect: L.s111,
      build: () => withModel("SmsCampaignRecipient", "  skipDetail   String?\n", "  skipDetail   String?\n  displayName  String?\n"),
    },
    /* ── U35b · the rule set, one refusal deleted at a time ── */
    {
      name: "the rule set lets `to` inside `from` — two racing writers would both win",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.to !== null && t.from.includes(t.to)) }),
    },
    {
      name: "the rule set lets a finished campaign be written to or moved out of",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.from.some((s) => s === "DONE" || s === "CANCELLED")) }),
    },
    {
      name: "the rule set lets a DRAFT skip its confirmation and start running",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.from.includes("DRAFT") && t.to === "RUNNING") }),
    },
    {
      name: "the rule set takes a phone number as the enqueue cursor (X8)",
      expect: L.s29,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => typeof t.patch.enqueueCursor === "string" && /^[bp]:\d+$/.test(t.patch.enqueueCursor)) }),
    },
    {
      name: "the rule set lets a confirmation field be written without the move to CONFIRMED",
      expect: L.s210,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.to === null && t.patch.audienceCount !== undefined) }),
    },
    {
      name: "the rule set confirms a campaign without its frozen estimate (X15)",
      expect: L.s210,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.to === "CONFIRMED" && (t.patch.estimateSegments === null || t.patch.estimateTzs === undefined)) }),
    },
    {
      name: "the rule set lets a typed confirmation carry a watermark (X13)",
      expect: L.s210,
      build: () => withRules({ assertTransitionShape: lets(CM.assertTransitionShape, (t) => t.patch.confirmTier === "TYPED" && t.patch.audienceWatermark !== null && t.patch.audienceWatermark !== undefined) }),
    },
    {
      name: "the rule set saves a body without its coding and segments — the estimate would price a message nobody sends",
      expect: L.s211,
      build: () => withRules({ assertDraftPatch: lets(CM.assertDraftPatch, (patch) => patch.bodySw !== undefined && patch.codingSw === undefined) }),
    },
    {
      name: "the rule set takes a half-removed English variant",
      expect: L.s211,
      build: () => withRules({ assertDraftPatch: lets(CM.assertDraftPatch, (patch) => patch.bodyEn === null && patch.codingEn !== null && patch.codingEn !== undefined) }),
    },
    /* ── U43-0 · UNCONFIRMED: its ADD VALUE alone and after the tables, one order, counts that know it, no writer ── */
    {
      name: "R1.12 · ⭐ the UNCONFIRMED ADD VALUE file also moves rows into the value — Postgres refuses it inside that transaction (55P04) and the container stops at boot",
      expect: L.s112,
      build: () => withUnconfirmedFile((m) => ({ ...m, sql: `${m.sql}${NL}UPDATE "SmsCampaignRecipient" SET "status" = 'UNCONFIRMED' WHERE "status" = 'PENDING' AND "claimToken" IS NOT NULL;${NL}` })),
    },
    {
      name: "a SECOND migration adds UNCONFIRMED again — an idempotent re-add riding a later deploy beside a writer",
      expect: L.s112,
      build: () => ({ ...REAL, migrations: [...REAL.migrations, { folder: "20261009120000_sms_recipient_unconfirmed_again", sql: `ALTER TYPE "SmsCampaignRecipientStatus" ADD VALUE IF NOT EXISTS 'UNCONFIRMED';${NL}` }] }),
    },
    {
      name: "the ADD VALUE migration lost — the schema and the store name a value no migration gives Postgres (prisma generate knows it; production's database never would)",
      expect: L.s18c,
      build: () => withUnconfirmedFile(() => null),
    },
    {
      name: "R1.13 · the ADD VALUE migration renamed to sort BEFORE the campaign tables — it would extend a type that does not exist yet",
      expect: L.s113,
      build: () => withUnconfirmedFile((m) => ({ ...m, folder: "20261002110000_sms_recipient_unconfirmed" })),
    },
    {
      name: "the schema lists UNCONFIRMED after SENT while its ADD VALUE appends it last — the schema's order and Postgres' disagree",
      expect: L.s18c,
      build: () => withEnum("SmsCampaignRecipientStatus", (b) => plant(plant(b, `  UNCONFIRMED${NL}`, ""), `  SENT${NL}`, `  SENT${NL}  UNCONFIRMED${NL}`)),
    },
    {
      name: "enum drift — the store's recipient-status union forgets UNCONFIRMED, which the schema and the migrations carry",
      expect: L.s18c,
      build: () => ({ ...REAL, store: plant(REAL.store, `| "SKIPPED" | "UNCONFIRMED";`, `| "SKIPPED";`) }),
    },
    {
      name: "⭐ the old build's six-status count meets an UNCONFIRMED row and refuses the whole campaign — why U43-0 ships a deploy before any writer",
      expect: L.s213,
      build: () => withRecipient({
        countByStatus: async (campaignId) => {
          const counts = await REAL.twin.recipient.countByStatus(campaignId);
          const unknown = counts.find((c) => !SIX.includes(c.status) && c.count > 0);
          if (unknown) throw new Error(`[campaign-model] countByStatus: "${unknown.status}" is a recipient status this code does not know`);
          return counts.filter((c) => SIX.includes(c.status));
        },
      }),
    },
    {
      name: "a count that DROPS a status it does not know instead of refusing it — a campaign read as further along than it is (P8 undone)",
      expect: L.s213,
      build: () => withRecipient({
        countByStatus: async (campaignId) => {
          const known = new Set<string>(CM.SMS_CAMPAIGN_RECIPIENT_STATUSES);
          const raw = new Map<SmsCampaignRecipientStatus, number>();
          for (const r of mem().smsCampaignRecipients.values()) {
            if (r.campaignId === campaignId && known.has(r.status)) raw.set(r.status, (raw.get(r.status) ?? 0) + 1);
          }
          return CM.fillRecipientCounts(Array.from(raw, ([status, count]) => ({ status, count })));
        },
      }),
    },
    {
      name: "R3.2 · ⭐ an UNDECLARED src file writes a recipient's status as UNCONFIRMED — a writer nobody reviewed",
      expect: L.s32,
      build: () => ({ ...REAL, src: [...REAL.src, { path: "src/lib/server/marketing/rogue-settle.ts", text: 'await db.smsCampaignRecipient.settle(id, { status: "UNCONFIRMED", smsReference: ref });' }] }),
    },
    {
      name: "R3.2b · ⭐ an UNDECLARED src file hands U43a's settle door a patch to UNCONFIRMED — the door's own spelling, seen",
      expect: L.s32,
      build: () => ({ ...REAL, src: [...REAL.src, { path: "src/lib/marketing/rogue-rules.ts", text: 'export const reaped = (id: string, claimToken: string) => ({ id, claimToken, to: "UNCONFIRMED", smsReference: null, optOutToken: null, locale: null, segments: null, bodyLen: null, gateTrail: [] });' }] }),
    },
    /* ── U43a · the engine's recipient doors: each defect as somebody would write it ── */
    {
      name: "⭐ R-C1 · an UNCONDITIONAL claim — the memory claim without its claimToken === null test: five drivers take the same rows (the plan's RED)",
      expect: L.s214,
      build: () => withRecipient({
        claim: async (campaignId, limit, token, stamp) => {
          CM.assertClaim(campaignId, limit, token, stamp);
          const free = memRows().filter((r) => r.campaignId === campaignId && r.status === "PENDING").sort(byId).slice(0, limit);
          for (const r of free) applyWrite(r, CM.claimWrite(token, stamp));
          return free.map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "a claim that writes no token — the rows look free to every claimer, and each one's settle is lost",
      expect: L.s214,
      build: () => withRecipient({
        claim: async (campaignId, limit, token, stamp) => {
          CM.assertClaim(campaignId, limit, token, stamp);
          return memRows().filter((r) => r.campaignId === campaignId && r.status === "PENDING" && r.claimToken === null).sort(byId).slice(0, limit)
            .map((r) => ({ ...r, claimToken: token, claimedAt: stamp }));
        },
      }),
    },
    {
      name: "a claim that crosses campaigns — the campaign test dropped, another campaign's people claimed into this slice",
      expect: L.s215,
      build: () => withRecipient({
        claim: async (campaignId, limit, token, stamp) => {
          CM.assertClaim(campaignId, limit, token, stamp);
          const free = memRows().filter((r) => r.status === "PENDING" && r.claimToken === null).sort(byId).slice(0, limit);
          for (const r of free) applyWrite(r, CM.claimWrite(token, stamp));
          return free.map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "⭐ settle BY POSITION — the patches zipped onto the claim's rows in id order (an invite marked SENT because ANOTHER succeeded, sms.ts's attribution rule)",
      expect: L.s216,
      build: () => withRecipient({
        settle: async (patches, stamp) => {
          CM.assertSettle(patches, stamp);
          const tokens = new Set(patches.map((pp) => pp.claimToken));
          const rows = memRows().filter((r) => r.status === "PENDING" && r.claimToken !== null && tokens.has(r.claimToken)).sort(byId);
          patches.forEach((pp, i) => {
            const r = rows[i];
            if (r) applyWrite(r, CM.settleWrite(pp, stamp));
          });
          return { settled: Math.min(rows.length, patches.length), lost: [] };
        },
      }),
    },
    {
      name: "a settle that ignores the claim it names — a stalled slice's late settle lands over the reaper's verdict and over another slice's claim",
      expect: L.s216,
      build: () => withRecipient({ settle: plantedSettle((pp, r) => r !== undefined && r.status === "PENDING") }),
    },
    {
      name: "the settle table lets a SENT carry a skipReason — another status's key, no longer refused by name",
      expect: L.s217,
      build: () => withRules({ assertSettle: lets(CM.assertSettle, (patches) => patches.some((pp) => pp.to === "SENT" && Object.prototype.hasOwnProperty.call(pp, "skipReason"))) }),
    },
    {
      name: "the settle table lets a phone number through in a skip detail (§5.14)",
      expect: L.s217,
      build: () => withRules({ assertSettle: lets(CM.assertSettle, (patches) => patches.some((pp) => pp.to === "SKIPPED" && pp.skipDetail.includes("0712"))) }),
    },
    {
      // The S14 review's MINOR: a source split on symbols read "0712 345 678" as three short numbers and let it through.
      name: "the settle table lets a phone number written with separators through as a trail source (§5.14)",
      expect: L.s217,
      build: () => withRules({ assertSettle: lets(CM.assertSettle, (patches) => patches.some((pp) => "gateTrail" in pp && Array.isArray(pp.gateTrail)
        && pp.gateTrail.some((g) => typeof g.source === "string" && (g.source.includes("712 345") || g.source.includes("712-345"))))) }),
    },
    {
      name: "the settle table lets a gate trail of 25 checks through",
      expect: L.s217,
      build: () => withRules({ assertSettle: lets(CM.assertSettle, (patches) => patches.some((pp) => "gateTrail" in pp && Array.isArray(pp.gateTrail) && pp.gateTrail.length > 24)) }),
    },
    {
      name: "the settle table refuses the reaper's SENT (no token, variant or segments) — E6's ACCEPTED → SENT could never be written",
      expect: L.s217,
      build: () => withRules({
        assertSettle: (patches, stamp) => {
          if (patches.some((pp) => pp.to === "SENT" && pp.optOutToken === null)) throw new Error("planted: a SENT must carry its token");
          CM.assertSettle(patches, stamp);
        },
      }),
    },
    {
      name: "a settle that asks the rule set one patch at a time — a bad third patch is found after the first two were written",
      expect: L.s218,
      build: () => withRecipient({
        settle: async (patches, stamp) => {
          let settled = 0;
          const lost: string[] = [];
          for (const pp of patches) {
            CM.assertSettle([pp], stamp);
            const r = mem().smsCampaignRecipients.get(pp.id);
            if (!r || r.claimToken !== pp.claimToken || r.status !== "PENDING") {
              lost.push(pp.id);
              continue;
            }
            applyWrite(r, CM.settleWrite(pp, stamp));
            settled++;
          }
          return { settled, lost };
        },
      }),
    },
    {
      name: "the memory twin's P2002 removed — a reference another row already holds is written a second time",
      expect: L.s218,
      build: () => withRecipient({ settle: plantedSettle((pp, r) => r !== undefined && r.claimToken === pp.claimToken && r.status === "PENDING") }),
    },
    {
      name: "a release that never moves attempts on — a person a failing gate holds is retried for ever, never HELD",
      expect: L.s219,
      build: () => withRecipient({
        settle: async (patches, stamp) => REAL.twin.recipient.settle(patches.map((pp) => (pp.to === "PENDING" ? { ...pp, attemptsDelta: 0 as const } : pp)), stamp),
      }),
    },
    {
      name: "⭐ requeueHeld widened to UNCONFIRMED — an unanswered message goes back to PENDING and is SENT AGAIN, a second charge",
      expect: L.s220,
      build: () => withRecipient({
        requeueHeld: async (campaignId, stamp) => {
          CM.assertRequeueHeld(campaignId, stamp);
          let n = 0;
          for (const r of memRows()) {
            if (r.campaignId !== campaignId || (r.status !== "HELD" && r.status !== "UNCONFIRMED")) continue;
            applyWrite(r, CM.requeueWrite(stamp));
            n++;
          }
          return n;
        },
      }),
    },
    {
      name: "a settle that never looks at the status — a release lands on an UNCONFIRMED row and frees it for a second send",
      expect: L.s220,
      build: () => withRecipient({ settle: plantedSettle((pp, r) => r !== undefined && r.claimToken === pp.claimToken) }),
    },
    {
      name: "findStranded counts a claim AT the cutoff — a claim exactly ten minutes old reaped under a live slice",
      expect: L.s221,
      build: () => withRecipient({
        findStranded: async (campaignId, cutoff, limit) => {
          CM.assertStrandedRead(campaignId, cutoff, limit);
          return memRows().filter((r) => r.campaignId === campaignId && r.status === "PENDING" && r.claimedAt !== null && Date.parse(r.claimedAt) <= Date.parse(cutoff))
            .sort((a, b) => Date.parse(a.claimedAt ?? "") - Date.parse(b.claimedAt ?? "") || byId(a, b)).slice(0, limit).map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "requeueHeld leaves the claim in place — a requeued row reads PENDING and is never claimed again",
      expect: L.s222,
      build: () => withRecipient({
        requeueHeld: async (campaignId, stamp) => {
          CM.assertRequeueHeld(campaignId, stamp);
          let n = 0;
          for (const r of memRows()) {
            if (r.campaignId !== campaignId || r.status !== "HELD") continue;
            Object.assign(r, { status: "PENDING", attempts: 0, failureClass: null, updatedAt: stamp });
            n++;
          }
          return n;
        },
      }),
    },
    {
      name: "lastActivity read from updatedAt — every write reads as a claim: a release's stamp, and erasure's unlink or Resume's requeue would read as somebody driving",
      expect: L.s223,
      build: () => withRecipient({
        lastActivity: async (campaignId) => {
          CM.assertActivityRead(campaignId);
          const stamps = memRows().filter((r) => r.campaignId === campaignId && r.updatedAt !== r.createdAt).map((r) => r.updatedAt).sort();
          return stamps.length === 0 ? null : stamps[stamps.length - 1];
        },
      }),
    },
    {
      name: "findByTargets answers the OLDEST message per target — the reaper reads a superseded FAILED and drops a message in flight",
      expect: L.s224,
      build: () => withMessage({
        findByTargets: async (targetType, targetIds) => {
          CM.assertTargetsRead(targetType, targetIds);
          if (targetIds.length === 0) return [];
          const oldest = new Map<string, StoredSmsMessage>();
          for (const m of await REAL.twin.message.listRecent(100_000)) {
            if (m.targetType !== targetType || m.targetId === null || !targetIds.includes(m.targetId)) continue;
            const prev = oldest.get(m.targetId);
            if (!prev || Date.parse(m.createdAt) < Date.parse(prev.createdAt)) oldest.set(m.targetId, { ...m });
          }
          return [...oldest.values()].sort((a, b) => ((a.targetId ?? "") < (b.targetId ?? "") ? -1 : 1));
        },
      }),
    },
    {
      name: "a twin without the rule set — a claim with a lost campaign id takes every campaign's rows (what Prisma does with undefined)",
      expect: L.s225,
      build: () => withRecipient({
        claim: async (campaignId, limit, token, stamp) => {
          const free = memRows().filter((r) => (campaignId === undefined || r.campaignId === campaignId) && r.status === "PENDING" && r.claimToken === null)
            .sort(byId).slice(0, Math.max(limit, 1));
          for (const r of free) applyWrite(r, CM.claimWrite(token, stamp));
          return free.map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "claimedBy without the status test — beforeSend keeps rows a settle or the reaper already took (E6's double-send guard undone)",
      expect: L.s226,
      build: () => withRecipient({
        claimedBy: async (campaignId, token) => {
          CM.assertClaimRead(campaignId, token);
          return memRows().filter((r) => r.campaignId === campaignId && r.claimToken === token).sort(byId).map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "the claim's bound out of step with the send's chunk — sms-blackball sends 100 a chunk while a claim takes 50",
      expect: L.s227,
      build: () => ({ ...REAL, blackball: plant(REAL.blackball, "export const BATCH_MAX = 50;", "export const BATCH_MAX = 100;") }),
    },
    /* ── U43a · the review of 2026-10-07: each case must fail for the reason its label names ── */
    {
      name: "a claim that takes a token a row already holds — the answer folds in an earlier claim's rows, and another campaign's free row is claimed under it (D16)",
      expect: L.s215,
      build: () => withRecipient({
        claim: async (campaignId, limit, token, stamp) => {
          CM.assertClaim(campaignId, limit, token, stamp);
          const free = memRows().filter((r) => r.campaignId === campaignId && r.status === "PENDING" && r.claimToken === null).sort(byId).slice(0, limit);
          for (const r of free) applyWrite(r, CM.claimWrite(token, stamp));
          return memRows().filter((r) => r.campaignId === campaignId && r.claimToken === token && r.status === "PENDING").sort(byId).map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "the memory twin's P2002 without its code — a caller that reads Prisma's code (P2002) can never meet it in a suite (DC-7)",
      expect: L.s218,
      build: () => withRecipient({
        settle: async (patches, stamp) => {
          try {
            return await REAL.twin.recipient.settle(patches, stamp);
          } catch (e) {
            throw new Error((e as Error).message);
          }
        },
      }),
    },
    {
      name: "⭐ the memory claim without its STATUS test — a row a raw repair left UNCONFIRMED and token-less is claimed and SENT AGAIN (DC-10)",
      expect: L.s220,
      build: () => withRecipient({
        claim: async (campaignId, limit, token, stamp) => {
          CM.assertClaim(campaignId, limit, token, stamp);
          const free = memRows().filter((r) => r.campaignId === campaignId && r.claimToken === null).sort(byId).slice(0, limit);
          for (const r of free) applyWrite(r, CM.claimWrite(token, stamp));
          return memRows().filter((r) => r.campaignId === campaignId && r.claimToken === token).sort(byId).map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "findStranded ordered by id alone — the reaper's page reaps the youngest stranded claims first and leaves the oldest waiting (DC-6)",
      expect: L.s221,
      build: () => withRecipient({
        findStranded: async (campaignId, cutoff, limit) => {
          CM.assertStrandedRead(campaignId, cutoff, limit);
          return memRows().filter((r) => r.campaignId === campaignId && r.status === "PENDING" && r.claimToken !== null && r.claimedAt !== null
            && Date.parse(r.claimedAt) < Date.parse(cutoff)).sort(byId).slice(0, limit).map((r) => ({ ...r }));
        },
      }),
    },
    {
      name: "⭐ a release that also clears claimedAt — lastActivity falls back while a page is claiming and releasing, and U47b tells that very page 'Nobody is sending' (DC-3)",
      expect: L.s223,
      build: () => withRecipient({
        settle: async (patches, stamp) => {
          const res = await REAL.twin.recipient.settle(patches, stamp);
          for (const pp of patches) {
            const r = mem().smsCampaignRecipients.get(pp.id);
            if (pp.to === "PENDING" && r !== undefined && !res.lost.includes(pp.id)) r.claimedAt = null;
          }
          return res;
        },
      }),
    },
    {
      name: "findByTargets picks the HIGHEST REFERENCE per target, not the newest — references are random hex, so the reaper reads a random message (DC-2)",
      expect: L.s224,
      build: () => withMessage({
        findByTargets: async (targetType, targetIds) => {
          CM.assertTargetsRead(targetType, targetIds);
          if (targetIds.length === 0) return [];
          const top = new Map<string, StoredSmsMessage>();
          for (const m of await REAL.twin.message.listRecent(100_000)) {
            if (m.targetType !== targetType || m.targetId === null || !targetIds.includes(m.targetId)) continue;
            const prev = top.get(m.targetId);
            if (!prev || m.reference > prev.reference) top.set(m.targetId, { ...m });
          }
          return [...top.values()].sort((a, b) => ((a.targetId ?? "") < (b.targetId ?? "") ? -1 : 1));
        },
      }),
    },
    {
      name: "⭐ settleWrite reads its columns off the PATCH — a userId a patch carried reaches the row, and an erased account is linked again (U16a PE-01)",
      expect: L.s228,
      build: () => withRules({
        settleWrite: (pp, stamp) => {
          if (pp.to === "PENDING") return CM.settleWrite(pp, stamp);
          const set: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(pp)) if (k !== "id" && k !== "claimToken" && k !== "to") set[k] = v;
          return { set: { ...set, status: pp.to, updatedAt: stamp } as Partial<StoredSmsCampaignRecipient>, attemptsBy: 0 };
        },
      }),
    },
    {
      name: "⭐ settleWrite stamps sentAt with the settle's own clock — the reaper dates a hand-over ten minutes late, and the access export lists a message to the number's next holder (U16a PE-08)",
      expect: L.s228,
      build: () => withRules({
        settleWrite: (pp, stamp) => {
          const wr = CM.settleWrite(pp, stamp);
          return pp.to === "SENT" || pp.to === "DELIVERED" ? { ...wr, set: { ...wr.set, sentAt: stamp } } : wr;
        },
      }),
    },
    /* ── U46a · the receipt door: each defect as somebody would write it ── */
    {
      name: "⭐ R-46a · the receipt door without its status guard — a late FAILED rewrites a DELIVERED row, and a FAILED, SKIPPED or HELD row is moved by a receipt (the spec's plant)",
      expect: L.s230,
      build: () => withRecipient({ recordReceipt: plantedReceipt({ status: false }) }),
    },
    {
      name: "⭐ R-46b · the receipt door without its identity check — another number's receipt, and another message's, move the row (the spec's plant)",
      expect: L.s230,
      build: () => withRecipient({ recordReceipt: plantedReceipt({ identity: false }) }),
    },
    {
      name: "R-46c · the receipt door's reference arm dropped — a row holding another message's reference is moved, its reference overwritten",
      expect: L.s230,
      build: () => withRecipient({ recordReceipt: plantedReceipt({ reference: false }) }),
    },
    {
      name: "R-46d · the memory twin's P2002 removed from the receipt — a reference another row holds is written a second time",
      expect: L.s230,
      build: () => withRecipient({ recordReceipt: plantedReceipt({ unique: false }) }),
    },
    {
      name: "⭐ R-46e · a receipt door that drops the claim as it settles — the row a receipt reached first can no longer be found by its slice's send record (DC-4), and the record of which slice held it is gone",
      expect: L.s229,
      build: () => withRecipient({
        recordReceipt: async (id, r) => {
          const out = await REAL.twin.recipient.recordReceipt(id, r);
          const row = mem().smsCampaignRecipients.get(id);
          if (out.changed && row !== undefined) row.claimToken = null;
          return out;
        },
      }),
    },
    {
      name: "R-46f · a receipt that never writes its reference — an UNCONFIRMED row DELIVERED with none reads as never handed to the network in the person's own file",
      expect: L.s229,
      build: () => withRecipient({ recordReceipt: plantedReceipt({ writeReference: false }) }),
    },
    {
      name: "R-46g · the receipt's rule set lets a phone number through in a FAILED description (§5.14)",
      expect: L.s231,
      build: () => withRules({ assertReceipt: lets(CM.assertReceipt, (_id, r) => r.status === "FAILED" && typeof r.desc === "string" && r.desc.includes("0712")) }),
    },
    {
      name: "R-46h · the receipt's rule set lets a lost id through — Prisma reads undefined as NO CONDITION, and one receipt reaches every open row",
      expect: L.s231,
      build: () => withRules({ assertReceipt: lets(CM.assertReceipt, (id) => !id) }),
    },
    {
      name: "⭐ R-46i · receiptWrite dates the hand-over by the receipt — sentAt stamped with the receipt's instant (U16a PE-08)",
      expect: L.s231,
      build: () => withRules({
        receiptWrite: (r) => {
          const wr = CM.receiptWrite(r);
          return { ...wr, set: { ...wr.set, sentAt: r.at } };
        },
      }),
    },
    /* ── U43b-2 · DC-4's send record: each defect as somebody would write it ── */
    {
      name: "⭐ R-43b-1 · the send record without its trail-null guard — a second record overwrites the first one's trail (or the reaper's)",
      expect: L.s232,
      build: () => withRecipient({ recordSend: plantedSend({ trail: false }) }),
    },
    {
      name: "⭐ R-43b-2 · the send record without its status guard — a SENT row's, and a still-claimed row's, columns rewritten",
      expect: L.s232,
      build: () => withRecipient({ recordSend: plantedSend({ status: false }) }),
    },
    {
      name: "R-43b-3 · the send record without its claim — another slice's record lands on the row",
      expect: L.s232,
      build: () => withRecipient({ recordSend: plantedSend({ claim: false }) }),
    },
    {
      name: "⭐ R-43b-4 · sendRecordWrite writes the status too — the receipt's DELIVERED turned back into SENT",
      expect: L.s232,
      build: () => withRules({
        sendRecordWrite: (s, stamp) => {
          const wr = CM.sendRecordWrite(s, stamp);
          return { ...wr, set: { ...wr.set, status: "SENT" } };
        },
      }),
    },
    {
      name: "R-43b-5 · the send record's rule set lets a phone number through the trail (§5.14)",
      expect: L.s232,
      build: () => withRules({ assertSendRecord: lets(CM.assertSendRecord, (_id, s) => JSON.stringify(s?.gateTrail ?? null).includes("0712")) }),
    },
  ];

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
    if (fail === 0) problems.push(`case ${i + 1} stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) { console.log("\nPROBLEMS:"); for (const x of problems) console.log(`  ✗ ${x}`); process.exitCode = 1; }
  else { console.log("RED PROOF COMPLETE"); process.exitCode = 0; }
}
