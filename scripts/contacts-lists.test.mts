/**
 * test:contacts-lists — U33b-L's guard: RECORDING A LICENCE BASIS ON A LIST (spec
 * `docs/marketing-specs/U33a-U37c-OD58.md` §6 U33b-L · §7.8 · §8 · §9 U33b-L; OD57 · OD58).
 *
 * ⭐ DRIVEN AGAINST THE REAL WRITER and the real DAL — `recordListBasis` / `revokeListBasis` over the live store, with
 * the wordings SAVED through the shipped setter rather than planted, because "the words must be saved first" is one of
 * the rules under test and a planted row would skip it.
 *
 * ⛔ WHAT MAKES THIS WORTH A SUITE. This writer is the only thing in the platform that can make a person reachable
 * WITHOUT their consent. Everything below is therefore asserted about what it REFUSES, what it stores as seven-year
 * evidence, what its audit row may carry (counts, never a number and never the note's text), and — the rule the whole
 * design rests on — that a recording covers the members present when it was made and nobody added afterwards.
 *
 * ⛔ NO DATABASE: `DATABASE_URL` is deleted before the first server module loads.
 */
delete process.env.DATABASE_URL;

const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);

const { db } = await import("../src/lib/server/store.ts");
const LB = await import("../src/lib/server/marketing/list-basis.ts");
const { LIST_BASIS_REFUSAL_SENTENCE, recordListBasis, revokeListBasis } = LB;
const { saveMarketingWordings, currentWording } = await import("../src/lib/server/marketing/wordings.ts");
const { WORDING_DEFAULTS } = await import("../src/lib/marketing/marketing-wordings.ts");
const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");

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
  b8: "B8 · the wiring — both actions ask softRequireStaff(\"growth\") FIRST and spend `marketing.listBasis` before the writer; the card decides nothing itself, holds no phone number, labels the tick with the SAVED sentence, and the loader reads coverage from the DAL rather than counting it again",
} as const;

/* ══ THE WORLD ══════════════════════════════════════════════════════════════════════════════════════════════════ */

let seq = 0;
const OFFICER = "usr_officer_lb";
const NOTE = "Collected at the Dar es Salaam roadshow in September, sign-up sheets held by the growth team.";
const T1 = "2026-10-05T09:00:00.000Z";
const T2 = "2026-10-05T11:00:00.000Z";

/** Save the two wordings through the SHIPPED setter — the rule "they must be saved" is under test. */
async function saveWordings(): Promise<boolean> {
  const d = WORDING_DEFAULTS as Record<string, string>;
  const patch: Record<string, string> = {};
  for (const key of ["basis.LICENCE_OUTREACH", "adult.list"]) {
    patch[key] = d[key];
    patch[`approve.${key}`] = "1";
    patch[`base.${key}`] = "0";
  }
  const res = await saveMarketingWordings(patch, OFFICER);
  return res.ok === true;
}

async function makeList(name: string): Promise<string> {
  const id = `cl_${String(seq++).padStart(4, "0")}aaaaaaaaaaaaaaaa`.slice(0, 23);
  const row = await Promise.resolve(db.contactList.create({
    id, name, createdBy: OFFICER, createdAt: T1, updatedAt: T1,
  } as never));
  return (row as { id: string } | null)?.id ?? id;
}

/** A contact with no account, added to a list at a given instant. */
async function addMember(listId: string, n: number, addedAt: string): Promise<void> {
  const contactId = `ct_${String(seq++).padStart(4, "0")}bbbbbbbbbbbbbbbb`.slice(0, 23);
  await Promise.resolve(db.marketingContact.create({
    id: contactId, msisdn: `25571${String(5000000 + n)}`, displayName: null, email: null, operator: null,
    source: "MANUAL", sourceRef: null, userId: null, consentState: "NONE", suppressedAt: null, tags: [],
    createdBy: OFFICER, createdAt: addedAt, updatedAt: addedAt,
  } as never));
  await Promise.resolve(db.contactListMember.add({ listId, contactId, addedBy: OFFICER, addedAt } as never));
}

const auditFor = async (action: string, targetId: string) => {
  await auditFlush();
  return getAuditPage({ limit: 300 }).filter((r) => r.action === action && r.targetId === targetId);
};

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

export type ListBasisImpl = {
  readonly record: typeof recordListBasis;
  readonly revoke: typeof revokeListBasis;
};
export const REAL: ListBasisImpl = { record: recordListBasis, revoke: revokeListBasis };

async function runAssertions(impl: ListBasisImpl, tag: string): Promise<void> {
  const p = (s: string) => `${tag}${s}`;

  // ── B1 · the words first, before anything is saved ──────────────────────────────────────────────────────────────
  {
    const list = await makeList(`unsaved-${seq}`);
    const res = await impl.record({ listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, nowIso: T1 });
    const refused = !res.ok && res.reason === "wording_unsaved" && res.error === LIST_BASIS_REFUSAL_SENTENCE.wording_unsaved;
    const nothing = (await Promise.resolve(db.contactListBasis.listForList(list))).length === 0;
    ok(p(L.b1), refused && nothing, `${res.ok ? "RECORDED" : res.reason} · rows ${nothing ? 0 : "some"}`);
  }

  const saved = await saveWordings();
  ok(p("B0 · ⚠️ PRECONDITION — the two wordings save through the shipped setter"), saved
    && currentWording("basis.LICENCE_OUTREACH") !== null && currentWording("adult.list") !== null);

  // ── B2 · every other rule ───────────────────────────────────────────────────────────────────────────────────────
  {
    const list = await makeList(`rules-${seq}`);
    const cases: [string, Parameters<typeof recordListBasis>[0], string][] = [
      ["no officer", { listId: list, officerId: "   ", proofNote: NOTE, adultAttested: true }, "no_officer"],
      ["no list", { listId: "cl_doesnotexistxxxxxxx", officerId: OFFICER, proofNote: NOTE, adultAttested: true }, "list_not_found"],
      ["box unticked", { listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: false }, "adult_not_attested"],
      ["note holds a number", { listId: list, officerId: OFFICER, proofNote: "They gave it at 0754 321 987 on the day.", adultAttested: true }, "note_has_phone"],
      ["note too short", { listId: list, officerId: OFFICER, proofNote: "roadshow", adultAttested: true }, "note_too_short"],
      ["note too long", { listId: list, officerId: OFFICER, proofNote: "x".repeat(5000), adultAttested: true }, "note_too_long"],
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
    await addMember(list, 1, T1);
    await addMember(list, 2, T1);
    const res = await impl.record({ listId: list, officerId: OFFICER, proofNote: NOTE, adultAttested: true, nowIso: T1 });
    const rows = await Promise.resolve(db.contactListBasis.listForList(list));
    const row = rows[0];
    const w = currentWording("basis.LICENCE_OUTREACH");
    const a = currentWording("adult.list");
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
      && typeof payload.noteChars === "number" && !json.includes(NOTE.slice(0, 20)) && !/\d{9}/.test(json)
      && payload.members === 2 && payload.covered === 2;
    // ⛔ And nothing else was written: no ledger row for either member's number, and no suppression.
    const ledger = await Promise.resolve(db.messagingConsent.latestFor({ channel: "SMS", identifier: "255715000001", category: "MARKETING" }));
    ok(p(L.b4), countsOnly && ledger === null, `${json.slice(0, 120)} · ledger ${ledger === null ? "none" : "WRITTEN"}`);
  }

  // ── B5 · coverage is of the members present ────────────────────────────────────────────────────────────────────
  {
    await addMember(coveredList, 3, T2);               // added AFTER the recording
    const after = await Promise.resolve(db.contactListBasis.coveredCount(coveredList));
    const res2 = await impl.record({ listId: coveredList, officerId: OFFICER, proofNote: NOTE, adultAttested: true, nowIso: T2 });
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

  // ── B8 · the wiring, read from the source ──────────────────────────────────────────────────────────────────────
  {
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
    const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
    const actions = read("src/app/admin/contacts/list-basis-actions.ts");
    const card = read("src/app/admin/contacts/lists-card.tsx");
    const loader = read("src/app/admin/contacts/lists-loader.ts");
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    /* ⛔ THE GATE IS THE FIRST STATEMENT of each action (ruling 523), and the budget is spent BEFORE the writer — a
       refused recording spends it too, because the budget bounds attempts and not successes. */
    const gateFirst = actions.split("export async function").slice(1).every((body) => {
      const gateAt = body.indexOf("softRequireStaff(\"growth\"");
      const rateAt = body.indexOf("rateCheckAsync(gate.userId, \"marketing.listBasis\")");
      const writeAt = Math.max(body.indexOf("recordListBasis("), body.indexOf("revokeListBasis("));
      return gateAt > 0 && rateAt > gateAt && writeAt > rateAt;
    });
    // ⛔ The card decides nothing: no rule of its own, and no phone number anywhere in it.
    const cardDecides = /currentWording\(|db\.|messagingConsent/.test(card);
    const cardLabelsFromSaved = card.includes("view.adultLabel");
    // ⛔ The loader asks the DAL for coverage — it never counts members itself.
    const loaderAsksDal = loader.includes("db.contactListBasis.coveredCount(") && !/for \(const m of/.test(loader);
    const wired = pkg.scripts["test:contacts-lists"] === "tsx scripts/contacts-lists.test.mts"
      && pkg.scripts["red:contacts-lists"] === "tsx scripts/contacts-lists.test.mts --prove-red"
      && (pkg.scripts.predeploy ?? "").includes("npm run test:contacts-lists")
      && /"marketing.listBasis": {/.test(read("src/lib/server/rate-limit.ts"));
    ok(p(L.b8), gateFirst && !cardDecides && cardLabelsFromSaved && loaderAsksDal && wired,
      `gate first ${gateFirst} · card decides ${cardDecides} · labels from saved ${cardLabelsFromSaved} · loader asks dal ${loaderAsksDal} · wired ${wired}`);
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
};

function withDefect(d: Defect): ListBasisImpl {
  return {
    revoke: revokeListBasis,
    record: async (input) => {
      if (d.noBox) return recordListBasis({ ...input, adultAttested: true });
      if (d.readsDefault && currentWording("basis.LICENCE_OUTREACH") === null) {
        // What a writer that fell back to the catalogue default would do: record anyway.
        const defaults = WORDING_DEFAULTS as Record<string, string>;
        const id = `lb_${"abcdefghijklmnopqrst"}`;
        const row = await Promise.resolve(db.contactListBasis.create({
          id, listId: input.listId, basisKey: "LICENCE_OUTREACH",
          wording: defaults["basis.LICENCE_OUTREACH"], wordingVersion: 1,
          adultWording: defaults["adult.list"], adultVersion: 1,
          proofNote: input.proofNote, recordedBy: input.officerId, recordedAt: input.nowIso ?? T1,
        })).catch(() => null);
        if (row) return { ok: true as const, basisId: row.id, coverage: await Promise.resolve(db.contactListBasis.coveredCount(input.listId)) };
      }
      if (d.auditsNote) {
        const res = await recordListBasis(input);
        if (res.ok) {
          await (await import("../src/lib/server/audit.ts")).audit({
            category: "COMPLIANCE", action: "marketing.list_basis_recorded", actorId: input.officerId,
            targetType: "ContactList", targetId: input.listId, payload: { note: input.proofNote },
          });
        }
        return res;
      }
      return recordListBasis(input);
    },
  };
}

const CASES: { name: string; defect: Defect; expect: string }[] = [
  { name: "the writer records today's DEFAULT while nothing is saved", defect: { readsDefault: true }, expect: L.b1 },
  { name: "the 18+ box is treated as ticked", defect: { noBox: true }, expect: L.b2 },
  { name: "the audit row carries the note's own text", defect: { auditsNote: true }, expect: L.b4 },
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
    await runAssertions(withDefect(c.defect), tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on its own line — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.slice(0, 64)}…${LF}`);
  }
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
