/**
 * THE ROSTER'S KYC STAGE — the gate that cannot skip. `npm run test:kyc-stage`
 *
 * ⭐ WHY IT EXISTS. Ali, 2026-09-11: *"it says pending kyc always — how do I know who
 * uploaded and how not."* The roster now derives a stage word per player
 * (`src/lib/kyc-stage.ts`). A tag that LIES is worse than no tag: "Uploaded · not sent"
 * over somebody who has uploaded nothing sends an officer to chase a player who owes us
 * nothing, and "Nothing yet" over a complete file leaves real money blocked with nobody
 * looking. So the words and the derivation are both asserted here.
 *
 * ⛔ NO DATABASE, BY DESIGN. `scripts/dal-parity.test.mts` states the rule this file
 * obeys: *"a guard that talks to Postgres SKIPS when `DATABASE_URL` is absent — which is
 * every predeploy run — and a skipped guard prints green."* Everything here reads source
 * text or calls a pure function, so it CANNOT skip and belongs in `predeploy`. The one
 * thing that genuinely needs Postgres — that a KYC restart really deletes document rows
 * — lives in `scripts/kyc-restart-clears-documents.test.mts`, which refuses to skip by
 * exiting 3.
 *
 * ⛔ EVERY REFUSAL HAS A CONTROL. §0 plants defects that MUST be reported, so a parser
 * that has silently stopped matching anything goes RED rather than green. That is not
 * ceremony: this repo has shipped a guard whose check count fell from 14 to 8 while it
 * still printed green.
 *
 * Run: npm run test:kyc-stage
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  kycStage, kycFileEverArrived, isKycStage, KYC_STAGES,
  type KycStage, type KycStatusToken, type KycStageFacts,
} from "../src/lib/kyc-stage.ts";
import { kycStageLabel, kycStageVariant } from "../src/components/admin/status-badge.tsx";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.KP_SRC ?? join(ROOT, "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

let pass = 0, fail = 0;
/**
 * ⛔ `why` PRINTS ON FAILURE ONLY. It is the diagnostic that explains a RED line, and
 * printing it beside PASS produced output like "PASS … — form found, control missing",
 * which reads as a defect on a passing run. A guard whose green output describes a
 * failure is how a future session loses an hour to a bug that is not there.
 * `evidence` is the opposite: it prints ALWAYS, because for the control assertions the
 * number IS the thing being checked.
 */
const ok = (label: string, cond: boolean, why = "", evidence = "") => {
  cond ? pass++ : fail++;
  const tail = evidence ? ` — ${evidence}` : (!cond && why ? ` — ${why}` : "");
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail}`);
};

const stageSrc = read("lib/kyc-stage.ts");
const badgeSrc = read("components/admin/status-badge.tsx");
const pageSrc = read("app/admin/players/page.tsx");
const dalSrc = read("lib/server/prisma-dal.ts");
const storeSrc = read("lib/server/store.ts");

/* ════════════════════════════════════════════════════════════════════════════
 * §0 · CONTROLS — each parser below must be PROVEN able to report something.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§0 · controls — the parsers can actually find things");
ok("§0a control · the stage module was read and is non-trivial", stageSrc.length > 2000, "", `${stageSrc.length} bytes`);
ok("§0b control · the roster page was read and is non-trivial", pageSrc.length > 2000, "", `${pageSrc.length} bytes`);
// A planted string that MUST match, so "found nothing" cannot pass for "found no defect".
ok("§0c control · the magnitude-scan regex matches a planted sample",
  /\.length\s*>=\s*\d/.test("if (documents.length >= 3) {}"));
ok("§0d control · the bare-variant regex matches a planted sample",
  /:\s*"(pending|success|warning|danger|neutral|gold|resolved|claret|live)"/.test('  foo: "warning",'));

/* ════════════════════════════════════════════════════════════════════════════
 * §1 · THE DERIVATION IS TOTAL — every state a production row can hold.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§1 · totality over the whole product space");

const STATUSES: KycStatusToken[] = ["NOT_STARTED", "IN_PROGRESS", "PENDING_REVIEW", "APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"];
const DOCS = [0, 1, 2, 3, 4];
const TS = [null, "2026-09-01T00:00:00.000Z"];
const VALID = new Set<string>(KYC_STAGES);

const space: { f: KycStageFacts; s: KycStage }[] = [];
for (const status of STATUSES) for (const documentCount of DOCS) for (const submittedAt of TS) for (const approvedAt of TS) {
  const f: KycStageFacts = { status, documentCount, submittedAt, approvedAt };
  space.push({ f, s: kycStage(f) });
}
ok("§1a the product space is the size it should be", space.length === 6 * 5 * 2 * 2, "", `${space.length} combinations`);
ok("§1b every combination yields a DECLARED stage", space.every((x) => VALID.has(x.s)),
  JSON.stringify(space.filter((x) => !VALID.has(x.s)).slice(0, 3)));
ok("§1c `null` — the most common input on a young platform — is 'nothing_yet'", kycStage(null) === "nothing_yet");
ok("§1d the derivation is deterministic", space.every((x) => kycStage(x.f) === x.s));

/* ════════════════════════════════════════════════════════════════════════════
 * §2 · THE HONESTY ARMS — what the words are allowed to claim.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§2 · the tag is not allowed to lie");

// 🔴 THE CENTRAL ONE. "Submitted" may appear on exactly one stage, and that stage may
// only be reached from PENDING_REVIEW — the one status where `submittedAt` is non-null
// by construction, because `submitForReview` writes the status and the timestamp
// together after `missingSlots` passes. Nothing else in the suite compares a WORD to a
// STATE: `test:kyc-copy-truth` matches a deny∧money∧identity phrase pattern over dict
// leaves, and `kyc-status-honesty` is hardcoded to the player's own KYC page.
const saysSubmitted = KYC_STAGES.filter((s) => /submitted/i.test(kycStageLabel(s)));
ok("§2a exactly ONE stage word says 'Submitted'", saysSubmitted.length === 1, JSON.stringify(saysSubmitted));
ok("§2b …and it is `with_us`", saysSubmitted[0] === "with_us", String(saysSubmitted[0]));
ok("§2c 🔴 `with_us` is reachable ONLY from PENDING_REVIEW",
  space.every((x) => x.s !== "with_us" || x.f.status === "PENDING_REVIEW"),
  JSON.stringify(space.filter((x) => x.s === "with_us" && x.f.status !== "PENDING_REVIEW").slice(0, 3)));
ok("§2d 🔴 …and EVERY PENDING_REVIEW row reads `with_us`, whatever else is true",
  space.every((x) => x.f.status !== "PENDING_REVIEW" || x.s === "with_us"));

// ⛔ "Uploaded" must never appear over an empty file on the in-progress arm.
ok("§2e 🔴 `uploaded` requires documentCount > 0",
  space.every((x) => x.s !== "uploaded" || x.f.documentCount > 0),
  JSON.stringify(space.filter((x) => x.s === "uploaded" && x.f.documentCount === 0).slice(0, 3)));
// ⛔ THE RESTART TRAP. `startKyc` preserves `approvedAt` through a reset, so a
// once-approved player who restarted has approvedAt set and NOTHING uploaded. Reading
// the three-witness rule on this arm would paint "Uploaded · not sent" over an empty file.
ok("§2f 🔴 a restarted, once-approved player with no documents reads 'nothing_yet'",
  kycStage({ status: "IN_PROGRESS", documentCount: 0, submittedAt: null, approvedAt: "2026-08-01T00:00:00.000Z" }) === "nothing_yet");
// ⛔ …and the REJECTED arm must still use all three witnesses, because erasure destroys
// document rows from any status: documentCount alone would call a refused complete file
// "nothing sent" once retention released its images.
ok("§2g an officer-refused file whose images were erased still reads 'after upload'",
  kycStage({ status: "REJECTED", documentCount: 0, submittedAt: "2026-08-01T00:00:00.000Z", approvedAt: null }) === "rejected_after_upload");
ok("§2h a refusal BEFORE any upload reads 'nothing sent'",
  kycStage({ status: "REJECTED", documentCount: 0, submittedAt: null, approvedAt: null }) === "rejected_no_docs");
ok("§2i `kycFileEverArrived` is an OR over three witnesses",
  kycFileEverArrived({ status: "REJECTED", documentCount: 0, submittedAt: null, approvedAt: "x" })
  && kycFileEverArrived({ status: "REJECTED", documentCount: 1, submittedAt: null, approvedAt: null })
  && !kycFileEverArrived({ status: "REJECTED", documentCount: 0, submittedAt: null, approvedAt: null }));

// ⛔ NO STAGE WORD MAY SAY "verified" — `idVerifiedAt` means FORMAT ACCEPTED, never "an
// authority confirmed this identity", and `kyc-status-honesty.test.mts` exists because
// that exact word was once bound to that exact field.
const saysVerified = KYC_STAGES.filter((s) => /verif/i.test(kycStageLabel(s)));
ok("§2j no stage word contains 'verif'", saysVerified.length === 0, JSON.stringify(saysVerified));
// ⛔ NO STAGE WORD MAY SAY "Pending" — the Account column on the SAME ROW reads
// "Pending KYC", and both render upper-cased. That is the complaint relocated.
const saysPending = KYC_STAGES.filter((s) => /pending/i.test(kycStageLabel(s)));
ok("§2k no stage word contains 'Pending'", saysPending.length === 0, JSON.stringify(saysPending));
ok("§2l every stage has a distinct, non-empty word",
  new Set(KYC_STAGES.map(kycStageLabel)).size === KYC_STAGES.length
  && KYC_STAGES.every((s) => kycStageLabel(s).trim().length > 0));
ok("§2m the failed-read cell has its own word and is NOT a stage",
  kycStageLabel("unreadable").length > 0 && !VALID.has("unreadable"));

/* ════════════════════════════════════════════════════════════════════════════
 * §3 · THE DERIVATION MAY NOT READ A MAGNITUDE.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§3 · documentCount is compared to ZERO and nothing else");
// `documents.length >= 3` was true of a NIDA and is a lie about a passport — a NIDA needs
// 3 slots, a passport 2. Completeness is `missingSlots`' job, and its OUTPUT is
// `submittedAt`. A magnitude comparison creeping in here would silently mis-tag one
// document type, which no visual check would catch.
const body = stageSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
ok("§3a no `>= <n>` magnitude comparison survives in the derivation", !/\.length\s*>=\s*\d|documentCount\s*>=\s*[1-9]/.test(body),
  (body.match(/documentCount\s*>=\s*\d|\.length\s*>=\s*\d/) ?? []).join(","));
ok("§3b the only documentCount comparison is against 0", (body.match(/documentCount\s*[<>=!]+\s*\d+/g) ?? []).every((m) => /\b0\b/.test(m)),
  JSON.stringify(body.match(/documentCount\s*[<>=!]+\s*\d+/g)));

/* ════════════════════════════════════════════════════════════════════════════
 * §4 · EXHAUSTIVE OVER THE SCHEMA, AND OVER ITSELF.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4 · the union tracks the database enum");
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const enumBlock = /enum\s+KycStatus\s*\{([^}]*)\}/.exec(schema)?.[1] ?? "";
const schemaArms = enumBlock.split("\n").map((l) => l.replace(/\/\/.*$/, "").trim()).filter(Boolean);
ok("§4a the schema enum was parsed", schemaArms.length === 6, "", JSON.stringify(schemaArms));
ok("§4b every schema arm is handled by the derivation", schemaArms.every((a) => stageSrc.includes(`"${a}"`)),
  JSON.stringify(schemaArms.filter((a) => !stageSrc.includes(`"${a}"`))));
ok("§4c the derivation carries a `never` exhaustiveness arm", /const\s+_exhaustive:\s*never/.test(stageSrc));
ok("§4d `KYC_STAGES` covers every stage the label map knows",
  KYC_STAGES.every((s) => typeof kycStageLabel(s) === "string"));
ok("§4e `isKycStage` accepts every declared stage and rejects junk",
  KYC_STAGES.every((s) => isKycStage(s)) && !isKycStage("PENDING_REVIEW") && !isKycStage("") && !isKycStage(undefined));

/* ════════════════════════════════════════════════════════════════════════════
 * §5 · COLOUR COMES FROM THE DICTIONARY.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§5 · no hand-typed chip variant");
const variantBody = /export function kycStageVariant[\s\S]*?\n}/.exec(badgeSrc)?.[0] ?? "";
ok("§5a the variant function was located", variantBody.length > 100, "", `${variantBody.length} bytes`);
ok("§5b every arm resolves through TONE_CHIP[STATUS_TONE.…]",
  !/:\s*"(pending|success|warning|danger|neutral|gold|resolved|claret|live)"/.test(variantBody),
  (variantBody.match(/:\s*"(pending|success|warning|danger|neutral|gold|resolved|claret|live)"/g) ?? []).join(","));
ok("§5c every stage resolves to a real chip variant",
  [...KYC_STAGES, "unreadable" as const].every((c) => typeof kycStageVariant(c) === "string" && kycStageVariant(c).length > 0));
// ⛔ The betting ink is money; a KYC state must never wear it.
ok("§5d no --yes-/--no- betting ink in the stage tones", !/--yes-|--no-/.test(variantBody));

/* ════════════════════════════════════════════════════════════════════════════
 * §6 · THE PAGE WIRING — the parts that fail SILENTLY.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§6 · the roster page threads the filter everywhere it must");
// 🔴 buildBaseHref is a deny-list of ONE key; the allow-list is the argument. A hand-typed
// literal here drops `kyc` from every page link, so the filter works on page 1 and
// evaporates on page 2 — while the count jumps to the unfiltered total.
ok("§6a 🔴 pagination carries the whole searchParams, not a hand-typed literal",
  /buildBaseHref\("\/admin\/players",\s*sp\)/.test(pageSrc),
  "a hand-typed literal here drops ?kyc= from every page link",
  (/buildBaseHref\([^)]*\)/.exec(pageSrc) ?? [])[0]);
// A GET form with no `action` replaces the entire query string with its named fields.
const formBlock = /<form[\s\S]*?<\/form>/.exec(pageSrc)?.[0] ?? "";
ok("§6b the KYC Select lives INSIDE the search form", /name="kyc"/.test(formBlock),
  formBlock ? "form found, control missing" : "no form found");
ok("§6c the Clear control appears for a kyc-only filter", /query\s*\|\|\s*statusFilter\s*\|\|\s*kycFilter/.test(pageSrc));
ok("§6d the table declares the KYC column", /<th className="text-left">KYC<\/th>/.test(pageSrc));
// ⛔ A header beginning "sta" would silently retarget scripts/admin-filter-drive.mjs,
// which matches columns by a 3-char lowercased prefix, onto the wrong cells.
ok("§6e the new header does not begin 'sta'", !/<th[^>]*>Sta[a-z]*<\/th>/.test(pageSrc.replace(/<th className="text-left">Status<\/th>/, "")));
const spans = pageSrc.match(/colSpan=\{(\d+)\}/g) ?? [];
ok("§6f every colSpan matches the eight-column table", spans.length > 0 && spans.every((s) => s === "colSpan={8}"), "", spans.join(","));
ok("§6g the filter is validated against the closed set", /isKycStage\(sp\.kyc\)/.test(pageSrc));
ok("§6h a failed KYC read drops the filter rather than showing an empty population",
  /!kycFailed\s*&&\s*isKycStage\(sp\.kyc\)/.test(pageSrc));
ok("§6i the chip, the tally and the filter all read one function",
  /if \(kycFilter && stageOf\(u\.id\) !== kycFilter\)/.test(pageSrc) && /<KycStageBadge cell=\{stageOf\(u\.id\)\}/.test(pageSrc));
// The tallies must count USERS, not submission rows — counting rows drops every player
// who has no submission, which is the very bucket this feature reveals.
ok("§6j the stage tallies iterate the user population, not the submission rows",
  /for \(const u of all\) stageCounts\[/.test(pageSrc));

/* ════════════════════════════════════════════════════════════════════════════
 * §7 · THE P0 THIS FEATURE RESTS ON — asserted at SOURCE so predeploy sees it.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§7 · the document write path stays fixed");
// The full behavioural proof needs Postgres (scripts/kyc-restart-clears-documents.test.mts).
// This is the half that can run with no database, so a revert cannot reach production green.
ok("§7a 🔴 `kyc.upsert` syncs documents on `!== undefined`, not on truthiness",
  /if \(k\.documents !== undefined\) \{/.test(dalSrc) && !/if \(k\.documents\?\.length\) \{/.test(dalSrc),
  /if \(k\.documents\?\.length\) \{/.test(dalSrc) ? "the pre-2026-09-11 guard is back" : "");
ok("§7b both DAL halves expose `listStageFacts`",
  /listStageFacts:/.test(dalSrc) && /listStageFacts:/.test(storeSrc));
// ⛔ The two population reads must not be parallelised: the order is what makes the
// one-render skew benign (it can then only under-claim, never over-claim).
const factsBody = /listStageFacts: async[\s\S]*?\n    \},/.exec(dalSrc)?.[0] ?? "";
ok("§7c the stage feed was located in the Prisma half", factsBody.length > 200, "", `${factsBody.length} bytes`);
ok("§7d 🔴 the two reads are sequential, never Promise.all", !/Promise\.all/.test(factsBody));
ok("§7e the stage feed joins no documents and selects no image bytes",
  !/include:/.test(factsBody) && !/storageKey/.test(factsBody));
ok("§7f both halves break a createdAt tie the same way (id desc)",
  /\{ createdAt: "desc" \}, \{ id: "desc" \}/.test(dalSrc) && /k\.id > cur\.id/.test(storeSrc));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass < 40) { console.error(`!! only ${pass} assertions ran — the parsers have stopped finding things. Treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
