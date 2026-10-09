/**
 * test:contacts-lists — U33b-L's guard: RECORDING A LICENCE BASIS ON A LIST (spec
 * `docs/marketing-specs/U33a-U37c-OD58.md` §6 U33b-L · §7.8 · §8 · §9 U33b-L; OD57 · OD58) — and, since the tracker's
 * ◐ 3b (2026-10-07), the Lists card's 18+ confirmation held to the words it was given for.
 *
 * ⭐ DRIVEN AGAINST THE REAL WRITER and the real DAL — `recordListBasis` / `revokeListBasis` over the live store, with
 * the wordings SAVED through the shipped setter rather than planted, because "the words must be saved first" is one of
 * the rules under test and a planted row would skip it.
 *
 * ⭐ A FRESH WORLD FOR EVERY RUN (3b). `--prove-red` runs every assertion once per red case, in ONE process, and the
 * first cut of this suite shared one world between the runs: after the baseline the wordings were saved (B1 could no
 * longer see "unsaved", and B0's save from version 0 was refused as stale) and every member's number was already in the
 * book (the store refuses a second contact on a number, so the counts read 0). Read from the code: B0, B1, B4 and B5
 * failed in EVERY run after the first, so the cases expecting B1 and B4 were "caught" whatever their defect did. Each
 * run now has its own wordings record (`__wordingsStoreForTest`, handed to the writer as its `ListBasisDeps`) and
 * numbers no earlier run used — and `--prove-red` runs the shipped code once more AFTER the cases and requires it
 * green, so a case is caught by its own defect or not at all.
 *
 * ⛔ WHAT MAKES THIS WORTH A SUITE. This writer is the only thing in the platform that can make a person reachable
 * WITHOUT their consent. Everything below is therefore asserted about what it REFUSES, what it stores as seven-year
 * evidence, what its audit row may carry (counts, never a number and never the note's text), and — the rule the whole
 * design rests on — that a recording covers the members present when it was made and nobody added afterwards. And
 * (3b) that the 18+ words stored beside an officer's tick are the words that officer was shown.
 *
 * ⛔ NO DATABASE: `DATABASE_URL` is deleted before the first server module loads. ⛔ NOTHING IS WRITTEN TO DISK: a red
 * case that plants a line plants it in a COPY of the source text, in memory.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

delete process.env.DATABASE_URL;

const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);

const { db } = await import("../src/lib/server/store.ts");
const LB = await import("../src/lib/server/marketing/list-basis.ts");
const { LIST_BASIS_REFUSAL_SENTENCE, attestedVersionOf, recordListBasis, revokeListBasis } = LB;
const { __wordingsStoreForTest } = await import("../src/lib/server/marketing/wordings.ts");
const { WORDING_DEFAULTS } = await import("../src/lib/marketing/marketing-wordings.ts");
const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
// C8b (B5) · the card's loader, and the campaign composer's own count for a list — what a masked viewer's figure must equal.
const { listsCardView } = await import("../src/app/admin/contacts/lists-loader.ts");
const { campaignAudienceCount, WHOLE_BOOK } = await import("../src/lib/server/marketing/audience.ts");
const { ERASURE_EVIDENCE } = await import("../src/lib/marketing/erasure-mark.ts");

type RecordInput = Parameters<typeof recordListBasis>[0];
type Deps = NonNullable<Parameters<typeof recordListBasis>[1]>;
type Words = ReturnType<typeof __wordingsStoreForTest>;

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

const L = {
  b1: "B1 · ⛔ a recording is REFUSED while the licence wording or its 18+ sentence is unsaved — a default nobody approved is not evidence, and the refusal says where to save them",
  b2: "B2 · every rule refuses with its own sentence and writes nothing: no officer, a list that is not there, the 18+ box unticked, a note holding a phone number, a note too short and one too long",
  b3: "B3 · a recording stores the SAVED texts and their versions as they stand, born unrevoked, with an `lb_` id of twenty letters",
  b4: "B4 · its audit row is COMPLIANCE, carries counts and ids only — never the note's text and no nine-digit run — and NO ledger row, suppression or contact-cache write happens",
  b5: "B5 · ⭐ it covers the members present when it was made and NOT one added after; recording again covers that one",
  b6: "B6 · a revoke covers nothing from then on, is audited, and a second revoke does not move the first one's stamp",
  b7: "B7 · a revoke is refused when no basis is in force, and its reason is held to the phone and length rules — but never to a rule about the WORDS: stopping outreach must not wait on a wording",
  b8: 'B8 · the wiring — both actions ask softRequireStaff("growth") FIRST and spend `marketing.listBasis` before the writer; the card decides nothing itself, holds no phone number, labels the tick with the SAVED sentence, and the loader reads coverage from the DAL rather than counting it again',
  b9: "B9 · ⛔ 3b · THE TICK COUNTS ONLY FOR THE WORDS IT WAS GIVEN FOR — the owner rewords the 18+ sentence while the page is open: a recording posted for the version the page showed, a newer one, none, null, the number as text or a fraction is refused attestation_stale with its sentence and writes nothing (no basis row, no audit row); posted for the saved version it records, and the row carries the NEW words and their version",
  b10: "B10 · ⛔ 3b · the posted version is re-typed strictly (`attestedVersionOf`) — plain decimal digits naming a positive whole number are that number; empty, zero, a leading zero, a fraction, a sign, a space, an exponent, hex, eleven digits, words, a number, null, a file, an array and an object are null",
  b11: "B11 · ⛔ 3b · the wiring of the version — the loader hands the card the saved 18+ version, the card holds its tick against that version and reads it at the Record click, posts it beside the tick, and the action hands the posted field to the writer through the writer's own re-typing rule",
  b12: "B12 · ⛔ C8b (B5) · THE CARD'S FIGURES ARE THE VIEWER'S: on a list holding a stranger (recorded), a stranger added since, a player's LINKED row (recorded) and the erased tombstone, a masked viewer reads 3 members, 2 covered and NO linked figure — every live member, the campaign composer's count EXACTLY — and a reader reads today's 2, 1 covered, and 1 more with an account; the tombstone in neither; and the recording's COMPLIANCE row keeps the figures it records today (the unlinked members alone)",
} as const;

/* ══ THE SOURCES — read ONCE; a red case plants into a COPY, in memory ══════════════════════════════════════════ */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

type Sources = {
  readonly actions: string;
  readonly card: string;
  readonly loader: string;
  readonly pkg: string;
  readonly rateLimit: string;
};
const SOURCES: Sources = {
  actions: read("src/app/admin/contacts/list-basis-actions.ts"),
  card: read("src/app/admin/contacts/lists-card.tsx"),
  loader: read("src/app/admin/contacts/lists-loader.ts"),
  pkg: read("package.json"),
  rateLimit: read("src/lib/server/rate-limit.ts"),
};

/** ⛔ 3b · the lines that carry the version from the saved words to the writer — B11 reads each, and a red case swaps one. */
const WIRE = {
  loader: "adultVersion: adult?.v ?? null,",
  cardHolds: "const ticked = tickedFor !== null && tickedFor === view.adultVersion;",
  cardTicks: "onChange={(on) => setTickedFor(on ? view.adultVersion : null)}",
  cardCaptures: "attestedVersion: ticked ? tickedFor : null",
  cardAttests: 'fd.set("adultAttested", ask.attestedVersion !== null ? "1" : "0");',
  cardPosts: 'if (ask.attestedVersion !== null) fd.set("attestedVersion", String(ask.attestedVersion));',
  action: 'attestedVersion: attestedVersionOf(formData.get("attestedVersion")),',
} as const;

type Plant = { readonly file: keyof Sources; readonly from: string; readonly to: string };

/** One exact string replaced in a COPY of one source — or null when it is not there EXACTLY once (a plant that does not
 *  land proves nothing, and one that lands twice would go red for a reason the case does not claim). */
function plantIn(src: Sources, plant: Plant): Sources | null {
  const text = src[plant.file];
  const at = text.indexOf(plant.from);
  if (at < 0 || text.indexOf(plant.from, at + 1) >= 0) return null;
  return { ...src, [plant.file]: text.slice(0, at) + plant.to + text.slice(at + plant.from.length) };
}

/* ══ THE WORLD ══════════════════════════════════════════════════════════════════════════════════════════════════ */

let seq = 0;
/** ⭐ A number no run has used. The book holds ONE contact per number and refuses a second (`create` answers null), so a
 *  number an earlier run took would leave this run's list with a member that has no book row — counted as nobody. */
let phoneSeq = 0;
const OFFICER = "usr_officer_lb";
const NOTE = "Collected at the Dar es Salaam roadshow in September, sign-up sheets held by the growth team.";
const T1 = "2026-10-05T09:00:00.000Z";
const T2 = "2026-10-05T11:00:00.000Z";
/** ⛔ 3b · the owner's rewording of the 18+ sentence — it passes the wording's own rules (it names 18 and the list). */
const REWORDED = "I confirm that every number on this list belongs to a person aged 18 or older, and that where the numbers came from is on record.";

/** Save the two wordings through the SHIPPED setter, into THIS run's record — the rule "they must be saved" is under test. */
async function saveWordings(words: Words): Promise<boolean> {
  const d = WORDING_DEFAULTS as Record<string, string>;
  const patch: Record<string, string> = {};
  for (const key of ["basis.LICENCE_OUTREACH", "adult.list"]) {
    patch[key] = d[key];
    patch[`approve.${key}`] = "1";
    patch[`base.${key}`] = "0";
  }
  const res = await words.saveMarketingWordings(patch, OFFICER);
  return res.ok === true;
}

/** ⛔ 3b · The owner rewords the 18+ sentence: a NEW version, saved through the shipped setter on top of the one there. */
async function reword(words: Words, text: string): Promise<boolean> {
  const base = words.wordingHistory("adult.list").length;
  const res = await words.saveMarketingWordings({ "adult.list": text, "base.adult.list": String(base) }, OFFICER);
  return res.ok === true && words.currentWording("adult.list")?.text === text;
}

async function makeList(name: string): Promise<string> {
  const id = `cl_${String(seq++).padStart(4, "0")}aaaaaaaaaaaaaaaa`.slice(0, 23);
  const row = await Promise.resolve(db.contactList.create({
    id, name, createdBy: OFFICER, createdAt: T1, updatedAt: T1,
  } as never));
  return (row as { id: string } | null)?.id ?? id;
}

/** A contact with no account, added to a list at a given instant. Answers the contact's number. */
async function addMember(listId: string, addedAt: string): Promise<string> {
  const contactId = `ct_${String(seq++).padStart(4, "0")}bbbbbbbbbbbbbbbb`.slice(0, 23);
  const msisdn = `25571${String(5000000 + ++phoneSeq)}`;
  const made = await Promise.resolve(db.marketingContact.create({
    id: contactId, msisdn, displayName: null, email: null, operator: null,
    source: "MANUAL", sourceRef: null, userId: null, consentState: "NONE", suppressedAt: null, tags: [],
    createdBy: OFFICER, createdAt: addedAt, updatedAt: addedAt,
  } as never));
  if (made === null) throw new Error("fixture: the book refused a member's number — an earlier run already holds it");
  await Promise.resolve(db.contactListMember.add({ listId, contactId, addedBy: OFFICER, addedAt } as never));
  return msisdn;
}

const auditFor = async (action: string, targetId: string) => {
  await auditFlush();
  return getAuditPage({ limit: 300 }).filter((r) => r.action === action && r.targetId === targetId);
};

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

export type ListBasisImpl = {
  readonly record: (input: RecordInput) => ReturnType<typeof recordListBasis>;
  readonly revoke: typeof revokeListBasis;
  /** ⛔ 3b · the posted field's re-typing rule. */
  readonly versionOf: typeof attestedVersionOf;
  /** ⛔ C8b (B5) · the Lists card's loader, by the viewer's read cell. */
  readonly cardView: typeof listsCardView;
};
/** An implementation is made for ONE run's world: the writer reads that run's wordings record (`Deps`). */
export type MakeImpl = (deps: Deps) => ListBasisImpl;
export const REAL: MakeImpl = (deps) => ({
  record: (input) => recordListBasis(input, deps),
  revoke: revokeListBasis,
  versionOf: attestedVersionOf,
  cardView: listsCardView,
});

async function runAssertions(make: MakeImpl, tag: string, src: Sources = SOURCES): Promise<void> {
  const p = (s: string) => `${tag}${s}`;
  // ⭐ THIS RUN'S WORLD: its own wordings record, nothing saved in it yet, shared with no other run.
  const words = __wordingsStoreForTest();
  const impl = make({ wording: words.currentWording });
  /** The saved 18+ version as the card would show it now — the version an officer's tick is given for. */
  const shown = (): number | null => words.currentWording("adult.list")?.v ?? null;

  // ── B1 · the words first, before anything is saved ──────────────────────────────────────────────────────────────
  {
    const list = await makeList(`unsaved-${seq}`);
    // Posted for version 1, as a page that showed one would post it — so only the wording rule stands between this
    // recording and a row.
    const res = await impl.record({ listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, attestedVersion: 1, nowIso: T1 });
    const refused = !res.ok && res.reason === "wording_unsaved" && res.error === LIST_BASIS_REFUSAL_SENTENCE.wording_unsaved;
    const nothing = (await Promise.resolve(db.contactListBasis.listForList(list))).length === 0;
    ok(p(L.b1), refused && nothing, `${res.ok ? "RECORDED" : res.reason} · rows ${nothing ? 0 : "some"}`);
  }

  const saved = await saveWordings(words);
  ok(p("B0 · ⚠️ PRECONDITION — the two wordings save through the shipped setter"), saved
    && words.currentWording("basis.LICENCE_OUTREACH") !== null && words.currentWording("adult.list") !== null);
  /** The 18+ version on the screen from here until B9 rewords it — what every tick below is given for. */
  const V = shown();

  // ── B2 · every other rule ───────────────────────────────────────────────────────────────────────────────────────
  {
    const list = await makeList(`rules-${seq}`);
    const cases: [string, RecordInput, string][] = [
      ["no officer", { listId: list, officerId: "   ", proofNote: NOTE, adultAttested: true, attestedVersion: V }, "no_officer"],
      ["no list", { listId: "cl_doesnotexistxxxxxxx", officerId: OFFICER, proofNote: NOTE, adultAttested: true, attestedVersion: V }, "list_not_found"],
      ["box unticked", { listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: false, attestedVersion: V }, "adult_not_attested"],
      ["note holds a number", { listId: list, officerId: OFFICER, proofNote: "They gave it at 0754 321 987 on the day.", adultAttested: true, attestedVersion: V }, "note_has_phone"],
      ["note too short", { listId: list, officerId: OFFICER, proofNote: "roadshow", adultAttested: true, attestedVersion: V }, "note_too_short"],
      ["note too long", { listId: list, officerId: OFFICER, proofNote: "x".repeat(5000), adultAttested: true, attestedVersion: V }, "note_too_long"],
    ];
    const wrong: string[] = [];
    for (const [name, input, want] of cases) {
      const r = await impl.record({ ...input, nowIso: T1 });
      const got = r.ok ? "RECORDED" : r.reason;
      const sentenceOk = !r.ok && r.error === LIST_BASIS_REFUSAL_SENTENCE[r.reason];
      if (got !== want || !sentenceOk) wrong.push(`${name}: ${got}`);
    }
    const nothing = (await Promise.resolve(db.contactListBasis.listForList(list))).length === 0;
    ok(p(L.b2), wrong.length === 0 && nothing, `${wrong.join(" · ") || "all refused with their sentence"} · rows ${nothing ? 0 : "some"}`);
  }

  // ── B3 / B4 · a recording, its row and its audit row ────────────────────────────────────────────────────────────
  let coveredList = "";
  {
    const list = await makeList(`record-${seq}`);
    coveredList = list;
    const first = await addMember(list, T1);
    await addMember(list, T1);
    const res = await impl.record({ listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, attestedVersion: V, nowIso: T1 });
    const rows = await Promise.resolve(db.contactListBasis.listForList(list));
    const row = rows[0];
    const w = words.currentWording("basis.LICENCE_OUTREACH");
    const a = words.currentWording("adult.list");
    const stored = res.ok && row !== undefined
      && /^lb_[a-z]{20}$/.test(row.id) && row.basisKey === "LICENCE_OUTREACH"
      && row.wording === w?.text && row.wordingVersion === w?.v
      && row.adultWording === a?.text && row.adultVersion === a?.v
      && row.recordedBy === OFFICER && row.revokedAt === null;
    ok(p(L.b3), stored, row ? `${row.id} · v${row.wordingVersion}/${row.adultVersion} · revoked ${row.revokedAt}` : "no row");

    const rowsAudit = await auditFor("marketing.list_basis_recorded", list);
    const payload = (rowsAudit[0]?.payload ?? {}) as Record<string, unknown>;
    const json = JSON.stringify(payload);
    const countsOnly = rowsAudit.length === 1 && rowsAudit[0].category === "COMPLIANCE"
      && typeof payload.noteChars === "number" && !json.includes(NOTE.slice(0, 20)) && !/[0-9]{9}/.test(json)
      && payload.members === 2 && payload.covered === 2;
    // ⛔ And nothing else was written: no ledger row for a member's number, and no suppression.
    const ledger = await Promise.resolve(db.messagingConsent.latestFor({ channel: "SMS", identifier: first, category: "MARKETING" }));
    ok(p(L.b4), countsOnly && ledger === null, `${json.slice(0, 120)} · ledger ${ledger === null ? "none" : "WRITTEN"}`);
  }

  // ── B5 · coverage is of the members present ────────────────────────────────────────────────────────────────────
  {
    await addMember(coveredList, T2);                  // added AFTER the recording
    const after = await Promise.resolve(db.contactListBasis.coveredCount(coveredList));
    const res2 = await impl.record({ listId: coveredList, officerId: OFFICER, proofNote: NOTE, adultAttested: true, attestedVersion: V, nowIso: T2 });
    const again = await Promise.resolve(db.contactListBasis.coveredCount(coveredList));
    ok(p(L.b5), after.live === 3 && after.covered === 2 && res2.ok && again.covered === 3,
      `before ${JSON.stringify(after)} · after re-recording ${JSON.stringify(again)}`);
  }

  // ── B6 / B7 · revoking ─────────────────────────────────────────────────────────────────────────────────────────
  {
    const REASON = "The roadshow sheets could not be produced for the audit, so the basis is withdrawn.";
    const r1 = await impl.revoke({ listId: coveredList, officerId: OFFICER, reason: REASON, nowIso: T2 });
    const cover = await Promise.resolve(db.contactListBasis.coveredCount(coveredList));
    const rows = await Promise.resolve(db.contactListBasis.listForList(coveredList));
    const stamp = rows[0]?.revokedAt;
    const rowsAudit = await auditFor("marketing.list_basis_revoked", coveredList);
    const payload = (rowsAudit[0]?.payload ?? {}) as Record<string, unknown>;
    const r2 = await impl.revoke({ listId: coveredList, officerId: OFFICER, reason: REASON, nowIso: "2026-10-06T00:00:00.000Z" });
    const rowsAfter = await Promise.resolve(db.contactListBasis.listForList(coveredList));
    ok(p(L.b6),
      r1.ok && cover.covered === 0 && rowsAudit.length === 1 && typeof payload.reasonChars === "number"
        && !JSON.stringify(payload).includes(REASON.slice(0, 20)) && rowsAfter[0]?.revokedAt === stamp,
      `covered ${cover.covered} · audit ${rowsAudit.length} · second revoke ${r2.ok ? "ok" : r2.reason} · stamp held ${rowsAfter[0]?.revokedAt === stamp}`);

    const fresh = await makeList(`norevoke-${seq}`);
    const none = await impl.revoke({ listId: fresh, officerId: OFFICER, reason: REASON, nowIso: T2 });
    const shortReason = await impl.revoke({ listId: coveredList, officerId: OFFICER, reason: "no", nowIso: T2 });
    const phoneReason = await impl.revoke({ listId: coveredList, officerId: OFFICER, reason: "Called 0754 321 987 and they objected to it.", nowIso: T2 });
    ok(p(L.b7),
      !none.ok && none.reason === "basis_not_found"
        && !shortReason.ok && shortReason.reason === "reason_too_short"
        && !phoneReason.ok && phoneReason.reason === "reason_has_phone",
      `${none.ok ? "ok" : none.reason} · ${shortReason.ok ? "ok" : shortReason.reason} · ${phoneReason.ok ? "ok" : phoneReason.reason}`);
  }

  // ── B9 · ⛔ 3b · the tick counts only for the words it was given for ─────────────────────────────────────────────
  {
    const list = await makeList(`reworded-${seq}`);
    await addMember(list, T1);
    const before = shown();                                // the words the officer's page showed — and the tick was given for
    const reworded = await reword(words, REWORDED);        // the owner rewords the sentence while that page is open
    const now = shown();
    const n = now ?? 0;
    const posts: { name: string; value?: unknown }[] = [
      { name: "the version the page showed", value: before },
      { name: "a newer version", value: n + 1 },
      { name: "no version" },
      { name: "null", value: null },
      { name: "the version as text", value: String(n) },
      { name: "a fraction", value: n + 0.5 },
    ];
    const wrong: string[] = [];
    for (const post of posts) {
      const input: Record<string, unknown> = { listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, nowIso: T2 };
      if ("value" in post) input.attestedVersion = post.value;
      const r = await impl.record(input as RecordInput);
      const refusedRight = !r.ok && r.reason === "attestation_stale" && r.error === LIST_BASIS_REFUSAL_SENTENCE.attestation_stale;
      if (!refusedRight) wrong.push(`${post.name}: ${r.ok ? "RECORDED" : r.reason}`);
    }
    // ⛔ Nothing was written for any of them — no basis row, and no audit row.
    const rowsBefore = (await Promise.resolve(db.contactListBasis.listForList(list))).length;
    const auditBefore = (await auditFor("marketing.list_basis_recorded", list)).length;
    // ⭐ The version on the screen NOW records — and the row carries the new words, never the ones the old page showed.
    const res = await impl.record({ listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, attestedVersion: now, nowIso: T2 });
    const row = (await Promise.resolve(db.contactListBasis.listForList(list)))[0];
    const current = res.ok && row !== undefined && row.adultVersion === now && row.adultWording === REWORDED;
    ok(p(L.b9),
      reworded && before !== null && now === before + 1 && wrong.length === 0 && rowsBefore === 0 && auditBefore === 0 && current,
      `reworded ${reworded} v${before}→v${now} · ${wrong.join(" · ") || "every stale post refused"} · rows ${rowsBefore} · audit ${auditBefore} · current ${res.ok ? `recorded v${row?.adultVersion}` : res.reason}`);
  }

  // ── B10 · ⛔ 3b · the posted field, re-typed ─────────────────────────────────────────────────────────────────────
  {
    const v = impl.versionOf;
    const takes = v("1") === 1 && v("3") === 3 && v("12") === 12 && v("2147483647") === 2147483647;
    const file = typeof Blob === "function" ? new Blob(["3"]) : { size: 1 };
    const notVersions: unknown[] = [
      "", "0", "03", "3.0", "3.5", " 3", "3 ", "-3", "+3", "3e0", "0x3", "12345678901", "three",
      3, 3.5, null, undefined, file, ["3"], { v: 3 },
    ];
    const loose = notVersions.filter((x) => v(x) !== null);
    ok(p(L.b10), takes && loose.length === 0,
      `takes ${takes} · read as a version: ${loose.map((x) => JSON.stringify(x) ?? String(x)).join(", ") || "none"}`);
  }

  // ── B8 · the wiring, read from the source ──────────────────────────────────────────────────────────────────────
  {
    const { actions, card, loader } = src;
    const pkg = JSON.parse(src.pkg) as { scripts: Record<string, string> };
    /* ⛔ THE GATE IS THE FIRST STATEMENT of each action (ruling 523), and the budget is spent BEFORE the writer — a
       refused recording spends it too, because the budget bounds attempts and not successes. */
    const gateFirst = actions.split("export async function").slice(1).every((body) => {
      const gateAt = body.indexOf('softRequireStaff("growth"');
      const rateAt = body.indexOf('rateCheckAsync(gate.userId, "marketing.listBasis")');
      const writeAt = Math.max(body.indexOf("recordListBasis("), body.indexOf("revokeListBasis("));
      return gateAt > 0 && rateAt > gateAt && writeAt > rateAt;
    });
    // ⛔ The card decides nothing: no rule of its own, and no phone number anywhere in it.
    const cardDecides = /currentWording[(]|db[.]|messagingConsent/.test(card);
    const cardLabelsFromSaved = card.includes("view.adultLabel");
    // ⛔ The loader asks the DAL for coverage — it never counts members itself. ⭐ C8b (B5) · the split, through the ONE
    // viewer rule (`listFiguresFor`) with the viewer's read cell.
    const loaderAsksDal = loader.includes("db.contactListBasis.coverageSplit(") && loader.includes("listFiguresFor(")
      && loader.includes(", viewerReads);") && !/for [(]const m of/.test(loader);
    const wired = pkg.scripts["test:contacts-lists"] === "tsx scripts/contacts-lists.test.mts"
      && pkg.scripts["red:contacts-lists"] === "tsx scripts/contacts-lists.test.mts --prove-red"
      && (pkg.scripts.predeploy ?? "").includes("npm run test:contacts-lists")
      && /"marketing.listBasis": {/.test(src.rateLimit);
    ok(p(L.b8), gateFirst && !cardDecides && cardLabelsFromSaved && loaderAsksDal && wired,
      `gate first ${gateFirst} · card decides ${cardDecides} · labels from saved ${cardLabelsFromSaved} · loader asks dal ${loaderAsksDal} · wired ${wired}`);
  }

  // ── B11 · ⛔ 3b · the version's wiring, read from the source ───────────────────────────────────────────────────
  {
    const loaderHands = src.loader.includes(WIRE.loader);
    const cardHolds = src.card.includes(WIRE.cardHolds) && src.card.includes(WIRE.cardTicks);
    const cardCaptures = src.card.includes(WIRE.cardCaptures);
    const cardPosts = src.card.includes(WIRE.cardAttests) && src.card.includes(WIRE.cardPosts);
    const actionHands = src.actions.includes(WIRE.action);
    ok(p(L.b11), loaderHands && cardHolds && cardCaptures && cardPosts && actionHands,
      `loader hands it ${loaderHands} · tick held to it ${cardHolds} · read at the click ${cardCaptures} · posted ${cardPosts} · action hands it ${actionHands}`);
  }

  // ── B12 · ⛔ C8b (B5) · the Lists card's figures, by viewer ─────────────────────────────────────────────────────
  {
    const list = await makeList(`viewer-${seq}`);
    await addMember(list, T1);                             // a stranger, before the recording
    // A player's LINKED row and the erased tombstone, both on the list before the recording.
    const linkedId = `ct_${String(seq++).padStart(4, "0")}cccccccccccccccc`.slice(0, 23);
    const tombId = `ct_${String(seq++).padStart(4, "0")}dddddddddddddddd`.slice(0, 23);
    for (const [id, userId, sourceRef] of [[linkedId, "usr_lb_player", null], [tombId, null, ERASURE_EVIDENCE]] as const) {
      await Promise.resolve(db.marketingContact.create({
        id, msisdn: `25571${String(5000000 + ++phoneSeq)}`, displayName: null, email: null, operator: null,
        source: "REGISTRATION", sourceRef, userId, consentState: "UNKNOWN", suppressedAt: null, tags: [],
        createdBy: null, createdAt: T1, updatedAt: T1,
      } as never));
      await Promise.resolve(db.contactListMember.add({ listId: list, contactId: id, addedBy: OFFICER, addedAt: T1 } as never));
    }
    const res = await impl.record({ listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, attestedVersion: shown(), nowIso: T1 });
    await addMember(list, T2);                             // a stranger added since
    const rowOf = async (reads: boolean) => (await impl.cardView(reads)).rows.find((r) => r.id === list) ?? null;
    const masked = await rowOf(false);
    const reader = await rowOf(true);
    const composer = await campaignAudienceCount({ ...WHOLE_BOOK, lists: [list] });
    const recorded = (await auditFor("marketing.list_basis_recorded", list))[0];
    const payload = (recorded?.payload ?? {}) as Record<string, unknown>;
    ok(p(L.b12),
      res.ok && masked !== null && masked.live === 3 && masked.covered === 2 && masked.withAccount === null && masked.live === composer
        && reader !== null && reader.live === 2 && reader.covered === 1 && reader.withAccount === 1
        && payload.members === 1 && payload.covered === 1,
      `masked ${masked ? `${masked.covered}/${masked.live} (account ${masked.withAccount})` : "none"} · composer ${composer} · reader ${reader ? `${reader.covered}/${reader.live} + ${reader.withAccount}` : "none"} · recorded ${JSON.stringify(payload)}`);
  }
}

/* ══ THE RED CASES ══════════════════════════════════════════════════════════════════════════════════════════════ */

type Defect = {
  /** The writer records today's DEFAULT when nothing is saved — evidence of an approval nobody gave. */
  readonly readsDefault?: boolean;
  /** The 18+ box is treated as ticked. */
  readonly noBox?: boolean;
  /** The audit row carries the note's own text. */
  readonly auditsNote?: boolean;
  /** ⛔ 3b · The writer as it was before 3b: whatever version the tick was given for, it records the words saved NOW. */
  readonly ignoresVersion?: boolean;
  /** ⛔ 3b · The posted field is read loosely — any number JavaScript can make of it. */
  readonly looseVersion?: boolean;
  /** ⛔ C8b (B5) · The card as it stood before C8b: every viewer reads coveredCount's pair — the linked members left out. */
  readonly cardBeforeC8b?: boolean;
  /** ⛔ C8b (B5) · Every viewer handed the READER's figures — the linked count among them. */
  readonly cardAsReader?: boolean;
  /** ⛔ 3b · One exact line of one wired file replaced, in a COPY of its text. */
  readonly plant?: Plant;
};

const looseVersionOf = (raw: unknown): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function withDefect(d: Defect): MakeImpl {
  return (base) => {
    const defaults = WORDING_DEFAULTS as Record<string, string>;
    /* What a writer that "used the default" does: a reader that falls back to the catalogue's suggestion while nothing
       is saved. The REAL writer runs over it, so the reader is the only thing planted. */
    const deps: Deps = d.readsDefault
      ? { wording: (key) => base.wording(key) ?? { v: 1, text: defaults[key] ?? "", savedAt: T1, savedBy: "the suggestion" } }
      : base;
    return {
      revoke: revokeListBasis,
      versionOf: d.looseVersion ? looseVersionOf : attestedVersionOf,
      cardView: d.cardAsReader
        ? () => listsCardView(true)
        : d.cardBeforeC8b
          ? async (reads) => {
            const v = await listsCardView(reads);
            const rows = [];
            for (const r of v.rows) {
              const c = await Promise.resolve(db.contactListBasis.coveredCount(r.id));
              rows.push({ ...r, live: c.live, covered: c.covered, withAccount: null });
            }
            return { ...v, rows };
          }
          : listsCardView,
      record: async (input) => {
        if (d.noBox) return recordListBasis({ ...input, adultAttested: true }, deps);
        if (d.ignoresVersion) return recordListBasis({ ...input, attestedVersion: deps.wording("adult.list")?.v ?? null }, deps);
        if (d.auditsNote) {
          const res = await recordListBasis(input, deps);
          if (res.ok) {
            await (await import("../src/lib/server/audit.ts")).audit({
              category: "COMPLIANCE", action: "marketing.list_basis_recorded", actorId: input.officerId,
              targetType: "ContactList", targetId: input.listId, payload: { note: input.proofNote },
            });
          }
          return res;
        }
        return recordListBasis(input, deps);
      },
    };
  };
}

const CASES: { name: string; defect: Defect; expect: string }[] = [
  { name: "the writer records today's DEFAULT while nothing is saved", defect: { readsDefault: true }, expect: L.b1 },
  { name: "the 18+ box is treated as ticked", defect: { noBox: true }, expect: L.b2 },
  { name: "the audit row carries the note's own text", defect: { auditsNote: true }, expect: L.b4 },
  // ── 3b ──
  { name: "the writer ignores the posted version and records the words saved at the save", defect: { ignoresVersion: true }, expect: L.b9 },
  { name: "the posted version is read loosely (a leading zero, a fraction, a space)", defect: { looseVersion: true }, expect: L.b10 },
  { name: "the card posts the tick without its version", defect: { plant: { file: "card", from: WIRE.cardPosts, to: "" } }, expect: L.b11 },
  { name: "the card holds a bare tick, which survives a rewording", defect: { plant: { file: "card", from: WIRE.cardHolds, to: "const ticked = tickedFor !== null;" } }, expect: L.b11 },
  { name: "the action hands the writer no version", defect: { plant: { file: "actions", from: WIRE.action, to: "attestedVersion: null," } }, expect: L.b11 },
  { name: "the loader hands the card no version", defect: { plant: { file: "loader", from: WIRE.loader, to: "adultVersion: null," } }, expect: L.b11 },
  // ── C8b (B5) ──
  { name: "⛔ C8b · B5 not built — every viewer reads coveredCount's pair, so a one-number list tells a masked officer whether the number is a player's", defect: { cardBeforeC8b: true }, expect: L.b12 },
  { name: "⛔ C8b · every viewer handed the reader's figures — the masked officer reads how many members have an account", defect: { cardAsReader: true }, expect: L.b12 },
  { name: "⛔ C8b · the loader asks the DAL's old pair, not its split", defect: { plant: { file: "loader", from: "db.contactListBasis.coverageSplit(", to: "db.contactListBasis.coveredCount(" } }, expect: L.b8 },
];

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}contacts-lists: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped writer is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);
  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let src: Sources = SOURCES;
    if (c.defect.plant) {
      const planted = plantIn(SOURCES, c.defect.plant);
      if (planted === null) {
        problems.push(`case ${i + 1} (${c.name}): the plant did not land — its line is not in ${c.defect.plant.file} exactly once`);
        continue;
      }
      src = planted;
    }
    await runAssertions(withDefect(c.defect), tag, src);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on its own line — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.slice(0, 64)}…${LF}`);
  }
  /* ⭐ THE CONTROL, LAST: the shipped code once more, in a fresh world, after every case. Green, or a case above may have
     been caught by a line that fails in any late run rather than by its own defect — the leak this suite once had. */
  pass = 0; fail = 0; failed.length = 0;
  await runAssertions(REAL, "again:");
  if (fail !== 0) problems.push(`CONTROL: the shipped code is red when it runs after the cases (${failed.join(" | ")}) — a world leaks between runs`);
  console.log(`${LF}§last control: ${pass} passed, ${fail} failed`);
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${LF}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${LF}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
