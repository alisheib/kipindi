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
 * ⭐ AND FROM 2026-09-13, MONEY. Identity is asked before a withdrawal and before nothing
 * else (docs/COMPLIANCE-DECISIONS.md, 2026-09-13), so a player can hold real money with no
 * identity file at all. The derivation gained a money dimension and an eighth stage,
 * "Funded · nothing sent"; the roster gained a `?funded=` axis; /admin/finance gained "Held for
 * unverified". §8-§10 prove the rules that keep those honest: money moves ONE arm and no
 * other, "verified" is the withdrawal gate's own predicate, the liability figure is on the
 * wallet-liability basis, a failed read is never zero, and `PENDING_KYC` no longer reads as a
 * state.
 *
 * ⛔ NO DATABASE, BY DESIGN. `scripts/dal-parity.test.mts` states the rule this file
 * obeys: *"a guard that talks to Postgres SKIPS when `DATABASE_URL` is absent — which is
 * every predeploy run — and a skipped guard prints green."* Everything here reads source
 * text or calls a pure function, so it CANNOT skip and belongs in `predeploy`. The one
 * thing that genuinely needs Postgres — that a KYC restart really deletes document rows
 * — lives in `scripts/kyc-restart-clears-documents.test.mts`, which refuses to skip by
 * exiting 3. The liability SUM is pure (`tallyHeldForUnverified`) precisely so it can be
 * proven here with a fixture rather than skipped against an absent database.
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
  MONEY_NOT_APPLIED, MONEY_ONLY_STAGES, MONEY_SPLIT_STAGES, stageTurnsOnMoney,
  walletHeldTzs, FUNDED_AXIS, isFundedAxis, fundedAxisOf, tallyHeldForUnverified,
  type KycStage, type KycStatusToken, type KycStageFacts, type KycMoney,
} from "../src/lib/kyc-stage.ts";
import { approvedEver } from "../src/lib/kyc-approval.ts";
import {
  kycStageLabel, kycStageVariant, fundedAxisLabel,
  accountStatusLabel, playerStatusVariant, presentedAccountStatus,
} from "../src/components/admin/status-badge.tsx";

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

/** Block comments and FULL-LINE `//` comments removed — so an assertion about CODE is not
 *  satisfied (or tripped) by a comment that merely mentions the pattern. Full-line only, so a
 *  `//` inside a string on a code line is never eaten. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const stageSrc = read("lib/kyc-stage.ts");
const badgeSrc = read("components/admin/status-badge.tsx");
const pageSrc = read("app/admin/players/page.tsx");
const cohortsSrc = read("app/admin/players/cohorts/page.tsx");
const financeSrc = read("app/admin/finance/page.tsx");
const analyticsSrc = read("lib/server/analytics.ts");
const kycMoneySrc = read("lib/server/kyc-money.ts");
const lexiconSrc = read("lib/admin-status-lexicon.ts");
const dalSrc = read("lib/server/prisma-dal.ts");
const storeSrc = read("lib/server/store.ts");
const pageCode = code(pageSrc);

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
ok("§0e control · the money-threshold regex flags a planted non-zero threshold",
  !(["heldTzs >= 1000"].join("").match(/heldTzs\s*[<>=!]+\s*\d+/g) ?? []).every((m) => /\b0\b/.test(m)));
ok("§0f control · the comment stripper removes a planted block and line comment but keeps code",
  code("/* db.kyc.list() */\n  // db.kyc.list()\nconst x = 1;") === "\n\nconst x = 1;");

/* ════════════════════════════════════════════════════════════════════════════
 * §1 · THE DERIVATION IS TOTAL — every state a production row can hold, at every money.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§1 · totality over the whole product space");

const STATUSES: KycStatusToken[] = ["NOT_STARTED", "IN_PROGRESS", "PENDING_REVIEW", "APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"];
const DOCS = [0, 1, 2, 3, 4];
const TS = [null, "2026-09-01T00:00:00.000Z"];
/** ⭐ FOUR MONEY STATES, and the first is NOT zero: `MONEY_NOT_APPLIED` is a viewer without money
 *  rights or a failed read. `{ heldTzs: 1 }` is the smallest balance that counts. */
const MONEY: KycMoney[] = [MONEY_NOT_APPLIED, { heldTzs: 0 }, { heldTzs: 1 }, { heldTzs: 250_000 }];
const VALID = new Set<string>(KYC_STAGES);

const space: { f: KycStageFacts | null; m: KycMoney; s: KycStage }[] = [];
for (const status of STATUSES) for (const documentCount of DOCS) for (const submittedAt of TS) for (const approvedAt of TS) for (const m of MONEY) {
  const f: KycStageFacts = { status, documentCount, submittedAt, approvedAt };
  space.push({ f, m, s: kycStage(f, m) });
}
// `null` — no submission row — is a real input on EVERY money state.
for (const m of MONEY) space.push({ f: null, m, s: kycStage(null, m) });
const rows = space.filter((x): x is { f: KycStageFacts; m: KycMoney; s: KycStage } => x.f !== null);

ok("§1a the product space is the size it should be", space.length === 6 * 5 * 2 * 2 * 4 + 4, "", `${space.length} combinations`);
ok("§1b every combination yields a DECLARED stage", space.every((x) => VALID.has(x.s)),
  JSON.stringify(space.filter((x) => !VALID.has(x.s)).slice(0, 3)));
ok("§1c `null` with no money applied, or holding nothing, is 'nothing_yet'",
  kycStage(null, MONEY_NOT_APPLIED) === "nothing_yet" && kycStage(null, { heldTzs: 0 }) === "nothing_yet");
ok("§1d the derivation is deterministic", space.every((x) => kycStage(x.f, x.m) === x.s));

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
  rows.every((x) => x.s !== "with_us" || x.f.status === "PENDING_REVIEW") && space.every((x) => x.f !== null || x.s !== "with_us"),
  JSON.stringify(rows.filter((x) => x.s === "with_us" && x.f.status !== "PENDING_REVIEW").slice(0, 3)));
ok("§2d 🔴 …and EVERY PENDING_REVIEW row reads `with_us`, whatever else is true — money included",
  rows.every((x) => x.f.status !== "PENDING_REVIEW" || x.s === "with_us"));

// ⛔ "Uploaded" must never appear over an empty file on the in-progress arm.
ok("§2e 🔴 `uploaded` requires documentCount > 0",
  rows.every((x) => x.s !== "uploaded" || x.f.documentCount > 0) && space.every((x) => x.f !== null || x.s !== "uploaded"),
  JSON.stringify(rows.filter((x) => x.s === "uploaded" && x.f.documentCount === 0).slice(0, 3)));
// ⛔ THE RESTART TRAP. `startKyc` preserves `approvedAt` through a reset, so a
// once-approved player who restarted has approvedAt set and NOTHING uploaded. Reading
// the three-witness rule on this arm would paint "Uploaded · not sent" over an empty file.
// ⭐ And from 2026-09-13 the same player holding money must NOT read "Funded · nothing sent":
// they were approved, so the withdrawal gate lets them through.
const RESTARTED: KycStageFacts = { status: "IN_PROGRESS", documentCount: 0, submittedAt: null, approvedAt: "2026-08-01T00:00:00.000Z" };
ok("§2f 🔴 a restarted, once-approved player with no documents reads 'nothing_yet' — at EVERY money",
  MONEY.every((m) => kycStage(RESTARTED, m) === "nothing_yet"),
  JSON.stringify(MONEY.map((m) => kycStage(RESTARTED, m))));
// ⛔ …and the REJECTED arm must still use all three witnesses, because erasure destroys
// document rows from any status: documentCount alone would call a refused complete file
// "nothing sent" once retention released its images.
ok("§2g an officer-refused file whose images were erased still reads 'after upload'",
  MONEY.every((m) => kycStage({ status: "REJECTED", documentCount: 0, submittedAt: "2026-08-01T00:00:00.000Z", approvedAt: null }, m) === "rejected_after_upload"));
ok("§2h a refusal BEFORE any upload reads 'nothing sent' — and money does not turn it into 'Funded'",
  MONEY.every((m) => kycStage({ status: "REJECTED", documentCount: 0, submittedAt: null, approvedAt: null }, m) === "rejected_no_docs"));
ok("§2i `kycFileEverArrived` is an OR over three witnesses",
  kycFileEverArrived({ status: "REJECTED", documentCount: 0, submittedAt: null, approvedAt: "x" })
  && kycFileEverArrived({ status: "REJECTED", documentCount: 1, submittedAt: null, approvedAt: null })
  && !kycFileEverArrived({ status: "REJECTED", documentCount: 0, submittedAt: null, approvedAt: null }));

// ⛔ NO STAGE WORD MAY SAY "verified" — `idVerifiedAt` means FORMAT ACCEPTED, never "an
// authority confirmed this identity", and `kyc-status-honesty.test.mts` exists because
// that exact word was once bound to that exact field.
const saysVerified = KYC_STAGES.filter((s) => /verif/i.test(kycStageLabel(s)));
ok("§2j no stage word contains 'verif'", saysVerified.length === 0, JSON.stringify(saysVerified));
// ⛔ NO STAGE WORD MAY SAY "Pending". Until 2026-09-13 the Account column on the SAME ROW read
// "Pending KYC"; from 2026-09-13 nothing is pending on an unverified account at all, because
// depositing and playing are open — so the word would be false on its own terms.
const saysPending = KYC_STAGES.filter((s) => /pending/i.test(kycStageLabel(s)));
ok("§2k no stage word contains 'Pending'", saysPending.length === 0, JSON.stringify(saysPending));
ok("§2l every stage has a distinct, non-empty word",
  new Set(KYC_STAGES.map(kycStageLabel)).size === KYC_STAGES.length
  && KYC_STAGES.every((s) => kycStageLabel(s).trim().length > 0), "", `${KYC_STAGES.length} stages`);
ok("§2m the failed-read cell has its own word and is NOT a stage",
  kycStageLabel("unreadable").length > 0 && !VALID.has("unreadable"));
// ⛔ "Unverified" reads like an officer's finding about a person; the stage names a balance.
ok("§2n the funded stage's word says 'Funded', never 'Unverified'",
  /funded/i.test(kycStageLabel("funded_nothing_yet")) && !/unverif/i.test(kycStageLabel("funded_nothing_yet")),
  kycStageLabel("funded_nothing_yet"));

/* ════════════════════════════════════════════════════════════════════════════
 * §3 · THE DERIVATION MAY NOT READ A MAGNITUDE.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§3 · documentCount and heldTzs are compared to ZERO and nothing else");
// `documents.length >= 3` was true of a NIDA and is a lie about a passport — a NIDA needs
// 3 slots, a passport 2. Completeness is `missingSlots`' job, and its OUTPUT is
// `submittedAt`. A magnitude comparison creeping in here would silently mis-tag one
// document type, which no visual check would catch.
const body = stageSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
ok("§3a no `>= <n>` magnitude comparison survives in the derivation", !/\.length\s*>=\s*\d|documentCount\s*>=\s*[1-9]/.test(body),
  (body.match(/documentCount\s*>=\s*\d|\.length\s*>=\s*\d/) ?? []).join(","));
ok("§3b the only documentCount comparison is against 0", (body.match(/documentCount\s*[<>=!]+\s*\d+/g) ?? []).every((m) => /\b0\b/.test(m)),
  JSON.stringify(body.match(/documentCount\s*[<>=!]+\s*\d+/g)));
// ⛔ A money threshold would be a POLICY, and no ruling set one (2026-09-13 ruling 2: no deposit
// cap for unverified accounts). "Holding money" is > 0.
const heldCmp = body.match(/heldTzs\s*[<>=!]+\s*\d+/g) ?? [];
ok("§3c the only heldTzs comparison is against 0 — and there is at least one", heldCmp.length > 0 && heldCmp.every((m) => /\b0\b/.test(m)),
  JSON.stringify(heldCmp), `${heldCmp.length} comparisons`);

/* ════════════════════════════════════════════════════════════════════════════
 * §4 · EXHAUSTIVE OVER THE SCHEMA, AND OVER ITSELF.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4 · the union tracks the database enum");
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const enumArms = (name: string) =>
  (new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`).exec(schema)?.[1] ?? "").split("\n").map((l) => l.replace(/\/\/.*$/, "").trim()).filter(Boolean);
const schemaArms = enumArms("KycStatus");
ok("§4a the schema enum was parsed", schemaArms.length === 6, "", JSON.stringify(schemaArms));
ok("§4b every schema arm is handled by the derivation", schemaArms.every((a) => stageSrc.includes(`"${a}"`)),
  JSON.stringify(schemaArms.filter((a) => !stageSrc.includes(`"${a}"`))));
ok("§4c the derivation carries a `never` exhaustiveness arm", /const\s+_exhaustive:\s*never/.test(stageSrc));
ok("§4d `KYC_STAGES` covers every stage the label map knows",
  KYC_STAGES.every((s) => typeof kycStageLabel(s) === "string"));
ok("§4e `isKycStage` accepts every declared stage and rejects junk",
  KYC_STAGES.every((s) => isKycStage(s)) && !isKycStage("PENDING_REVIEW") && !isKycStage("") && !isKycStage(undefined));
ok("§4f every declared stage is actually REACHABLE from some input — no dead words",
  KYC_STAGES.every((s) => space.some((x) => x.s === s)),
  JSON.stringify(KYC_STAGES.filter((s) => !space.some((x) => x.s === s))));

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
// ⭐ THE TONE RULING (status-tone.ts, KYC_FUNDED_NOTHING_YET). Amber is spent on exactly the two
// stages where a human must move; royal on the one that is OUR move. The funded stage is the new
// normal majority — painting it amber would recreate "it says pending kyc always" in a new colour.
const amber = KYC_STAGES.filter((s) => kycStageVariant(s) === "warning");
ok("§5e amber is still spent on exactly TWO stages (uploaded, more_needed)",
  amber.length === 2 && amber.includes("uploaded") && amber.includes("more_needed"), JSON.stringify(amber));
ok("§5f royal (our move) is still ONE stage — the funded stage does not wear it",
  KYC_STAGES.filter((s) => kycStageVariant(s) === kycStageVariant("with_us")).length === 1);
ok("§5g the funded stage is never gilt — a balance is not a win",
  !["gold", "resolved"].includes(kycStageVariant("funded_nothing_yet")), kycStageVariant("funded_nothing_yet"));

/* ════════════════════════════════════════════════════════════════════════════
 * §6 · THE PAGE WIRING — the parts that fail SILENTLY.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§6 · the roster page threads the filters everywhere they must");
// 🔴 buildBaseHref is a deny-list of ONE key; the allow-list is the argument. A hand-typed
// literal here drops `kyc` and `funded` from every page link, so the filter works on page 1
// and evaporates on page 2 — while the count jumps to the unfiltered total.
ok("§6a 🔴 pagination carries the whole searchParams, not a hand-typed literal",
  /buildBaseHref\("\/admin\/players",\s*sp\)/.test(pageSrc),
  "a hand-typed literal here drops ?kyc= and ?funded= from every page link",
  (/buildBaseHref\([^)]*\)/.exec(pageSrc) ?? [])[0]);
// A GET form with no `action` replaces the entire query string with its named fields.
const formBlock = /<form[\s\S]*?<\/form>/.exec(pageSrc)?.[0] ?? "";
ok("§6b the KYC Select lives INSIDE the search form", /name="kyc"/.test(formBlock),
  formBlock ? "form found, control missing" : "no form found");
ok("§6b2 the money Select lives INSIDE the search form too", /name="funded"/.test(formBlock),
  formBlock ? "form found, control missing — Search would wipe ?funded=" : "no form found");
ok("§6c the Clear control appears for a kyc-only or funded-only filter",
  /query\s*\|\|\s*statusFilter\s*\|\|\s*kycFilter\s*\|\|\s*fundedFilter/.test(pageSrc));
ok("§6d the table declares the KYC column", /<th className="text-left">KYC<\/th>/.test(pageSrc));
// ⛔ A header beginning "sta" would silently retarget scripts/admin-filter-drive.mjs,
// which matches columns by a 3-char lowercased prefix, onto the wrong cells.
ok("§6e the new header does not begin 'sta'", !/<th[^>]*>Sta[a-z]*<\/th>/.test(pageSrc.replace(/<th className="text-left">Status<\/th>/, "")));
const spans = pageSrc.match(/colSpan=\{(\d+)\}/g) ?? [];
ok("§6f every colSpan matches the seven-column table (the duplicate Drill-down column went 2026-09-14)", spans.length > 0 && spans.every((s) => s === "colSpan={7}"), "", spans.join(","));
ok("§6g the stage filter is validated against the closed set", /isKycStage\(sp\.kyc\)/.test(pageSrc));
ok("§6h a failed KYC read drops the filter rather than showing an empty population",
  /!kycFailed\s*&&\s*isKycStage\(sp\.kyc\)/.test(pageSrc));
ok("§6i the chip, the tally and the filter all read one function",
  /if \(kycFilter && stageOf\(u\.id\) !== kycFilter\)/.test(pageSrc) && /<KycStageBadge cell=\{stageOf\(u\.id\)\}/.test(pageSrc));
// The tallies must count USERS, not submission rows — counting rows drops every player
// who has none, which is the very bucket this feature reveals.
ok("§6j the stage tallies iterate the user population through `stageOf`",
  /for \(const u of all\) countStage\(stageOf\(u\.id\)\)/.test(pageCode));
// ⭐ 2026-09-13 — the DERIVATION iterates users too: a funded player with no row at all would
// never be met by a loop over submission rows, and would read "Nothing yet".
ok("§6k 🔴 the stage map is built per USER, with money, not per submission row",
  /for \(const u of all\) stageByUser\.set\(u\.id, kycStage\(factsByUser\.get\(u\.id\) \?\? null, moneyOf\(u\.id\)\)\)/.test(pageCode));
// 🔴 Privileged data that is never fetched cannot leak — the gate is asked BEFORE the query.
ok("§6l 🔴 the wallet population read happens only inside `if (canSeeMoney)`",
  /if \(canSeeMoney\) \{\s*try \{ wallets = await db\.wallet\.listAll\(\); \} catch \{ walletsFailed = true; \}\s*\}/.test(pageCode)
  && (pageCode.match(/db\.wallet\.listAll\(\)/g) ?? []).length === 1,
  "", `${(pageCode.match(/db\.wallet\.listAll\(\)/g) ?? []).length} listAll call(s)`);
ok("§6m no per-row wallet point query survives (one snapshot feeds every money figure)",
  !/db\.wallet\.findByUserId/.test(pageCode));
ok("§6n ?funded= is validated against the closed set AND honoured only when money is known",
  /moneyKnown\s*&&\s*isFundedAxis\(sp\.funded\)/.test(pageCode));
ok("§6o 🔴 a money-only stage is offered only when money is known",
  /MONEY_ONLY_STAGES as readonly KycStage\[\]\)\.includes\(s\) \? moneyKnown/.test(pageCode)
  && /offeredStages\.includes\(sp\.kyc\)/.test(pageCode)
  && /\.\.\.offeredStages\.map\(/.test(pageCode));
ok("§6p ⛔ a failed wallet read marks 'unreadable' exactly the cells money decides",
  /if \(moneyStagesUnknown && stageTurnsOnMoney\(facts\)\) return "unreadable";/.test(pageCode));
ok("§6q 🔴 the balance sort needs money rights (a sort by a hidden figure leaks its ranking)",
  /sortRequested === "balance" && !moneyKnown \? "joined"/.test(pageCode));
ok("§6r the money Select renders only for a viewer with money rights",
  /\{canSeeMoney && \(\s*<div[^>]*>\s*<Select\s+name="funded"/.test(pageCode));
ok("§6s ⛔ the roster never reads `db.kyc.list()` (it joins base64 document images)",
  !/db\.kyc\.list\(/.test(pageCode));

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

/* ════════════════════════════════════════════════════════════════════════════
 * §8 · THE MONEY DIMENSION (2026-09-13) — money moves ONE arm, and "verified" is the gate's.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§8 · money splits 'nothing sent' and nothing else");
const unfund = (s: KycStage): KycStage => (s === "funded_nothing_yet" ? "nothing_yet" : s);
// 🔴 THE CENTRAL ONE. Strip the funded split and every answer must equal the no-money answer.
// A money dimension that leaked into `with_us`, `uploaded` or a refusal would change whose move
// a FILE is — which no balance can.
const leaks = space.filter((x) => unfund(x.s) !== kycStage(x.f, MONEY_NOT_APPLIED));
ok("§8a 🔴 money changes no stage except nothing_yet ↔ funded_nothing_yet, across the whole space",
  leaks.length === 0, JSON.stringify(leaks.slice(0, 3)));
ok("§8b `funded_nothing_yet` requires money APPLIED and heldTzs > 0",
  space.every((x) => x.s !== "funded_nothing_yet" || (x.m !== MONEY_NOT_APPLIED && x.m.heldTzs > 0)));
ok("§8c 🔴 `funded_nothing_yet` is never an account the withdrawal gate would pay (approvedEver)",
  space.every((x) => x.s !== "funded_nothing_yet" || !approvedEver(x.f)),
  JSON.stringify(space.filter((x) => x.s === "funded_nothing_yet" && approvedEver(x.f)).slice(0, 3)));
ok("§8d ⛔ no input reaches a MONEY_ONLY stage without money applied",
  space.every((x) => x.m !== MONEY_NOT_APPLIED || !(MONEY_ONLY_STAGES as readonly string[]).includes(x.s)));
ok("§8e every MONEY_ONLY stage is reachable WITH money — the constant is not stale",
  MONEY_ONLY_STAGES.every((s) => space.some((x) => x.s === s)));
ok("§8f `stageTurnsOnMoney` is exact: when true both outcomes are MONEY_SPLIT stages; when false, money never moves the word",
  space.every((x) => stageTurnsOnMoney(x.f)
    ? [kycStage(x.f, { heldTzs: 0 }), kycStage(x.f, { heldTzs: 1 })].every((s) => (MONEY_SPLIT_STAGES as readonly string[]).includes(s))
    : MONEY.every((m) => kycStage(x.f, m) === kycStage(x.f, MONEY_NOT_APPLIED))));
ok("§8g control · `stageTurnsOnMoney` is true for a missing row and false for a submitted file and for a restart",
  stageTurnsOnMoney(null)
  && !stageTurnsOnMoney({ status: "PENDING_REVIEW", documentCount: 3, submittedAt: "x", approvedAt: null })
  && !stageTurnsOnMoney(RESTARTED));
ok("§8h ⭐ the most common production input: no row, holding money → 'funded_nothing_yet'",
  kycStage(null, { heldTzs: 1 }) === "funded_nothing_yet" && kycStage(null, { heldTzs: 250_000 }) === "funded_nothing_yet");
ok("§8i an APPROVED row with no stamp is approved at any money (the page/server asymmetry fix holds)",
  MONEY.every((m) => kycStage({ status: "APPROVED", documentCount: 0, submittedAt: null, approvedAt: null }, m) === "approved"));
ok("§8j the derivation asks `approvedEver`, not a hand-written approvedAt test",
  /approvedEver\(facts\)/.test(body) && /from "\.\/kyc-approval"/.test(stageSrc));

// The one definition of "holds money".
ok("§8k `walletHeldTzs` is balance + hold, a missing wallet is 0, and bonus is not money we owe",
  walletHeldTzs({ balance: 100, hold: 50 }) === 150
  && walletHeldTzs({ balance: 100 }) === 100
  && walletHeldTzs(null) === 0 && walletHeldTzs(undefined) === 0
  && walletHeldTzs({ balance: 0, hold: 0, bonusBalance: 999 } as { balance: number; hold: number }) === 0);
ok("§8l `?funded=` is a closed set: held/none accepted, junk refused",
  FUNDED_AXIS.length === 2 && FUNDED_AXIS.every((f) => isFundedAxis(f))
  && !isFundedAxis("HELD") && !isFundedAxis("") && !isFundedAxis(undefined) && !isFundedAxis("unreadable"));
ok("§8m the funded axis and the funded stage agree on what 'holding money' means",
  [0, 1, 250_000].every((h) => (kycStage(null, { heldTzs: h }) === "funded_nothing_yet") === (fundedAxisOf(h) === "held")));
ok("§8n the money axis has distinct words, and a failed read is not 'No money held'",
  new Set([fundedAxisLabel("held"), fundedAxisLabel("none"), fundedAxisLabel("unreadable")]).size === 3
  && [fundedAxisLabel("held"), fundedAxisLabel("none"), fundedAxisLabel("unreadable")].every((w) => w.trim().length > 0));

/* ════════════════════════════════════════════════════════════════════════════
 * §9 · HELD FOR UNVERIFIED — the finance figure, proven on a fixture.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§9 · the liability tally is on the wallet-liability basis, and a failure is not zero");
const FACTS = [
  { userId: "u_appr",   status: "APPROVED",    approvedAt: "2026-09-01T00:00:00.000Z" },
  { userId: "u_restart", status: "IN_PROGRESS", approvedAt: "2026-08-01T00:00:00.000Z" }, // once approved → may withdraw
  { userId: "u_nostamp", status: "APPROVED",    approvedAt: null },                       // approved now, stamp missing
  { userId: "u_prog",   status: "IN_PROGRESS", approvedAt: null },
  { userId: "u_refused", status: "REJECTED",   approvedAt: null },
  { userId: "u_dup",    status: "IN_PROGRESS", approvedAt: null },                        // NEWEST — first wins
  { userId: "u_dup",    status: "APPROVED",    approvedAt: "2026-07-01T00:00:00.000Z" },  // older duplicate
];
const WALLETS = [
  { userId: "u_appr",    status: "ACTIVE" as const, balance: 1000, hold: 0 },
  { userId: "u_restart", status: "ACTIVE" as const, balance: 500,  hold: 0 },
  { userId: "u_nostamp", status: "ACTIVE" as const, balance: 300,  hold: 0 },
  { userId: "u_prog",    status: "ACTIVE" as const, balance: 200,  hold: 50 },   // unverified 250
  { userId: "u_norow",   status: "ACTIVE" as const, balance: 100,  hold: 0 },    // no submission → unverified 100
  { userId: "u_zero",    status: "ACTIVE" as const, balance: 0,    hold: 0 },    // holds nothing → not an account held
  { userId: "u_refused", status: "FROZEN" as const, balance: 4000, hold: 0 },    // S1 — outside the ACTIVE basis
  { userId: "u_closed",  status: "CLOSED" as const, balance: 70,   hold: 0 },
  { userId: "u_dup",     status: "ACTIVE" as const, balance: 10,   hold: 0 },    // newest row unapproved → 10
];
const T = tallyHeldForUnverified(FACTS, WALLETS);
/** `walletLiabilityTotal()`'s own arithmetic, re-typed here ON PURPOSE as the independent oracle. */
const liabilityOracle = WALLETS.filter((w) => w.status === "ACTIVE").reduce((s, w) => s + w.balance + w.hold, 0);
ok("§9a ACTIVE never-approved accounts holding money: 3 accounts, TZS 360",
  T.accounts === 3 && T.tzs === 360, "", JSON.stringify({ accounts: T.accounts, tzs: T.tzs }));
ok("§9b 🔴 `basisTotalTzs` equals the wallet-liability arithmetic over the same snapshot",
  T.basisTotalTzs === liabilityOracle, "", `${T.basisTotalTzs} vs ${liabilityOracle}`);
ok("§9c the figure is a SUBSET of the liability it sits beside", T.tzs <= T.basisTotalTzs);
ok("§9d 🔴 frozen and closed never-approved money is reported BESIDE the basis, not dropped",
  T.frozen.accounts === 1 && T.frozen.tzs === 4000 && T.closed.accounts === 1 && T.closed.tzs === 70,
  "", JSON.stringify({ frozen: T.frozen, closed: T.closed }));
const approvedOnly = tallyHeldForUnverified(FACTS, WALLETS.filter((w) => ["u_appr", "u_restart", "u_nostamp"].includes(w.userId)));
ok("§9e ⛔ an account approved EVER (stamp) or NOW (status) is never counted — the gate's predicate",
  approvedOnly.accounts === 0 && approvedOnly.tzs === 0 && approvedOnly.basisTotalTzs === 1800);
const empty = tallyHeldForUnverified([], []);
ok("§9f a genuine zero is representable as a number (the FAILED read is a different arm — §9h)",
  empty.accounts === 0 && empty.tzs === 0 && empty.basisTotalTzs === 0 && empty.frozen.tzs === 0 && empty.closed.tzs === 0);

const analyticsCode = code(analyticsSrc);
ok("§9g `walletLiabilityTotal` sums through the ONE shared `walletHeldTzs`, ACTIVE only",
  /if \(w\.status === "ACTIVE"\) total \+= walletHeldTzs\(w\)/.test(analyticsCode));
ok("§9h 🔴 `unverifiedLiability` returns a FAILED arm on a failed read, and tallies through the pure function",
  /if \(!read\.ok\) return \{ ok: false, failed: read\.failed \};/.test(analyticsCode)
  && /tallyHeldForUnverified\(read\.facts, read\.wallets\)/.test(analyticsCode));
const kycMoneyCode = code(kycMoneySrc);
const iFacts = kycMoneyCode.indexOf("db.kyc.listStageFacts()");
const iWallets = kycMoneyCode.indexOf("db.wallet.listAll()");
ok("§9i the snapshot reads facts BEFORE wallets (the skew can only over-state unverified money), each failure named",
  iFacts > 0 && iWallets > iFacts
  && /return \{ ok: false, failed: "kyc" \}/.test(kycMoneyCode) && /return \{ ok: false, failed: "wallets" \}/.test(kycMoneyCode)
  && !/Promise\.all/.test(kycMoneyCode), "", `facts@${iFacts} wallets@${iWallets}`);
ok("§9j ⛔ neither analytics nor the snapshot reads `db.kyc.list()`",
  !/db\.kyc\.list\(/.test(analyticsCode) && !/db\.kyc\.list\(/.test(kycMoneyCode));
const financeGrids = financeSrc.match(/<KpiGrid[^>]*>[\s\S]*?<\/KpiGrid>/g) ?? [];
ok("§9k /admin/finance shows 'Held for unverified' in the SAME KPI row as 'Wallet liability'",
  financeGrids.some((g) => /label="Wallet liability"/.test(g) && /label="Held for unverified"/.test(g)),
  "", `${financeGrids.length} KPI grids`);
ok("§9l ⛔ the finance tile is `unavailable` on a failed read — never TZS 0",
  /label="Held for unverified"[\s\S]{0,400}unavailable=\{held === null\}/.test(financeSrc)
  && /const held = unverified && unverified\.ok \? unverified : null;/.test(financeSrc));

/* ════════════════════════════════════════════════════════════════════════════
 * §10 · `PENDING_KYC` IS NOT A STATE ANY MORE (2026-09-13).
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§10 · a PENDING_KYC straggler reads as what it is — active");
const userArms = enumArms("UserStatus");
ok("§10a the UserStatus enum was parsed and still carries PENDING_KYC (removal is a migration)",
  userArms.length === 6 && userArms.includes("PENDING_KYC"), "", JSON.stringify(userArms));
ok("§10b a straggler's WORD is the Active word", accountStatusLabel("PENDING_KYC") === accountStatusLabel("ACTIVE"),
  `${accountStatusLabel("PENDING_KYC")} vs ${accountStatusLabel("ACTIVE")}`);
ok("§10c a straggler's TONE is the Active tone", playerStatusVariant("PENDING_KYC") === playerStatusVariant("ACTIVE"),
  `${playerStatusVariant("PENDING_KYC")} vs ${playerStatusVariant("ACTIVE")}`);
ok("§10d the fold touches PENDING_KYC and nothing else",
  userArms.filter((a) => a !== "PENDING_KYC").every((a) => presentedAccountStatus(a) === a) && presentedAccountStatus("PENDING_KYC") === "ACTIVE");
ok("§10e totality: every UserStatus arm has a real word — no underscore, no 'Pending'",
  userArms.every((a) => { const w = accountStatusLabel(a); return w.trim().length > 0 && !w.includes("_") && !/pending/i.test(w); }),
  JSON.stringify(userArms.map((a) => [a, accountStatusLabel(a)])));
ok("§10f ⛔ the lexicon no longer defines a 'Pending KYC' account word", !/pendingKyc\s*:/.test(code(lexiconSrc)));
ok("§10g ⛔ the roster offers no PENDING_KYC filter and paints no PENDING_KYC legend",
  !/"PENDING_KYC"/.test(pageCode), (pageCode.match(/.*"PENDING_KYC".*/) ?? [])[0]);
ok("§10h the roster's status filter is validated against its closed set and compares the PRESENTED status",
  /\(ACCOUNT_FILTER as readonly string\[\]\)\.includes\(sp\.status \?\? ""\)/.test(pageCode)
  && /presentedAccountStatus\(u\.status\) !== statusFilter/.test(pageCode));
const cohortsCode = code(cohortsSrc);
ok("§10i ⛔ cohorts: no 'Pending KYC' tile, no 'needs follow-up', no file-local status tones",
  !/Pending KYC/.test(cohortsCode) && !/needs follow-up/.test(cohortsCode) && !/function statusVariant/.test(cohortsSrc)
  && /<AccountStatusBadge status=\{s\} \/>/.test(cohortsCode));
ok("§10j cohorts: the KPI and the health meter read ONE approved-ever count (the gate's predicate)",
  /approvedEver\(f\)/.test(cohortsCode) && (cohortsCode.match(/value=\{approvedCount\}/g) ?? []).length === 1
  && /approvedCount\.toLocaleString\(\)/.test(cohortsCode));
ok("§10k ⛔ cohorts reads no money — it is the growth domain, and GROWTH reads money.figures as none",
  !/wallet|formatTzs|unverifiedLiability|heldTzs/i.test(cohortsCode));
ok("§10l ⛔ the roster carries no 'needs review' caption", !/needs review/i.test(pageCode));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 90) { console.error(`!! only ${pass + fail} assertions ran — the parsers have stopped finding things. Treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
