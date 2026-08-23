/**
 * FOUR WAYS TO PROVE WHO YOU ARE — the guard for the whole unit.
 *
 * ⚠️ WHAT THIS SUITE IS FOR, IN ONE LINE. From 2026-08-20 a 50pick player proves
 * identity with ANY ONE of NIDA, passport, driving licence or voter's card (owner
 * decision, Ali 2026-08-19). `docs/IDENTITY-POLICY.md` states the two controls that
 * actually do the work — **uniqueness: one document, one account** and **document
 * review by a human** — and this suite exists because widening *which* document is
 * accepted is exactly the change that quietly widens *how many accounts one human
 * can hold*.
 *
 * ⛔ EVERY REFUSAL BELOW HAS A POSITIVE CONTROL IN THE SAME RUN. The whole family of
 * traps this repo has paid for is "a guard that passes because the feature is
 * absent": an assertion that a bad passport is refused is also satisfied by a
 * validator that refuses every passport, and an assertion that a duplicate is
 * blocked is also satisfied by a service that blocks everything. So each refusal is
 * paired with the nearest ACCEPTANCE, and both must hold.
 *
 * ⛔ AND ASK OF EVERY LINE: WOULD THIS STILL PASS IF THE FEATURE WERE ABSENT?
 * §6 is the one that matters most — only a NIDA carries a date of birth inside its
 * number, so an age check derived from the NUMBER passes vacuously for the other
 * three. It is asserted per type, on four separate accounts.
 *
 * Proved red by `npm run red:id-documents`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { readFileSync } from "node:fs";
import {
  ID_DOC_TYPES,
  ID_DOC_SPECS,
  ALL_DOC_SLOTS,
  DOC_SLOT_LABEL_KEY,
  ID_NUMBER_MIN_LEN,
  ID_NUMBER_MAX_LEN,
  MIN_AGE_YEARS,
  ageOn,
  isExpired,
  isIdDocType,
  missingSlots,
  nidaDateOfBirth,
  normaliseIdNumber,
  validateIdNumber,
  type IdDocType,
} from "../src/lib/id-documents.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { startKyc, submitIdentityStep, attachDocument, submitForReview, getKycStatus } from "../src/lib/server/kyc-service.ts";
import { db } from "../src/lib/server/store.ts";
/** Comments describe the trap; they are not the control. Strip before asserting. */
import { decomment as stripComments } from "./lib/decomment.mts";

/**
 * 🔴 THE REPORTER IS CAPTURED BEFORE ANYTHING SILENCES `console.log`, AND THAT IS NOT
 * TIDINESS. Several sections below replace `console.log` with a no-op to keep the
 * service's email/audit stubs out of the transcript. The first draft of this file had
 * `ok()` writing through the LIVE `console.log`, so every failure raised INSIDE a
 * silenced section printed nothing: the suite exited 1 with "6 failed" and not one
 * line saying which. `red:id-documents` caught it — it reported "went red, but on no
 * assertion at all", which is indistinguishable from the gate falling over.
 * ⛔ A guard that cannot say WHY it is red is a guard nobody will act on.
 */
const LOG = console.log.bind(console);

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; LOG(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => LOG(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

const read = (p: string) => readFileSync(p, "utf8");

const now = new Date().toISOString();
const origLog = console.log;
let seq = 0;
async function mkPlayer(id: string) {
  seq++;
  await db.user.create({
    id, phoneE164: `+2557950${String(seq).padStart(5, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "PENDING_KYC", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null, emailVerifiedAt: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  });
}

// A real 1×1 JPEG — `validateDocImage` sniffs magic bytes, so a made-up base64
// string is refused and every upload assertion would pass for the wrong reason.
const VALID_IMG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

/** A NIDA whose first eight digits are a real date and an adult DOB. */
const nida = (tail: string) => `19900101${tail.padStart(12, "0")}`;

// ═══════════════════════════════════════════════════════════════════════════
section("1 · the catalogue is complete, and honest about what it does not know");
// ═══════════════════════════════════════════════════════════════════════════

ok("exactly four identity documents are offered",
  ID_DOC_TYPES.length === 4 && ["NIDA", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD"].every((t) => (ID_DOC_TYPES as readonly string[]).includes(t)),
  ID_DOC_TYPES.join(", "));
ok("every type has a spec, keyed by itself",
  ID_DOC_TYPES.every((t) => ID_DOC_SPECS[t]?.type === t));
ok("control · a string that is not one of the four is refused by the narrower",
  !isIdDocType("NIDA_FRONT") && !isIdDocType("") && !isIdDocType("SELFIE") && isIdDocType("PASSPORT"));

// 🔴 THE HONESTY ASSERTION. A regex on a national ID is a compliance control and a
// wrong one locks a real citizen out of their own money. Two of the four formats are
// documented and two are not — this pins WHICH, so a later session cannot quietly
// invent a rule for a licence and cannot quietly loosen the one rule that is real.
ok("🔴 NIDA carries a PUBLISHED rule",
  ID_DOC_SPECS.NIDA.format.kind === "published",
  "The 20-digit shape is published and has been enforced since the first KYC release.");
ok("…and that rule is still exactly 20 digits",
  ID_DOC_SPECS.NIDA.format.kind === "published" && String(ID_DOC_SPECS.NIDA.format.pattern) === String(/^\d{20}$/),
  "Loosening this silently accepts a malformed national ID; tightening it locks people out.");
ok("🔴 PASSPORT is SECONDARY-sourced, so ADVISORY",
  ID_DOC_SPECS.PASSPORT.format.kind === "secondary",
  "9 alphanumeric comes from non-government sources. Promoting it to `published`\n" +
  "       turns a rumour into a lockout; find a TRA/Immigration spec first and cite it.");
for (const t of ["DRIVER_LICENSE", "VOTER_CARD"] as const) {
  const f = ID_DOC_SPECS[t].format;
  ok(`🔴 ${t} declares that NO authoritative format exists`,
    f.kind === "unpublished",
    "TRA and NEC do not publish these number formats, and Ali instructed 2026-08-19:\n" +
    "       \"for now driving and voting, keep them open — later we change\". ⛔ Do not\n" +
    "       invent a pattern. Adding one is a one-line change HERE, beside its citation.");
  ok(`…and ${t} says so in words an officer reads`,
    f.kind === "unpublished" && /no authoritative/i.test(f.absenceNote) && f.absenceNote.length > 80,
    "The absence must be STATED, not implied by an empty field.");
  ok(`…and ${t} therefore offers the browser NO pattern to enforce`,
    ID_DOC_SPECS[t].htmlPattern === null,
    "A browser-enforced pattern synthesised from our sanity band is a lockout wearing\n" +
    "       a tooltip — on a rule no authority ever published.");
}
ok("the two documented types carry their source inline",
  ID_DOC_SPECS.NIDA.format.kind === "published" && ID_DOC_SPECS.NIDA.format.sourceNote.length > 40 &&
  ID_DOC_SPECS.PASSPORT.format.kind === "secondary" && /secondary sources only/i.test(ID_DOC_SPECS.PASSPORT.format.sourceNote),
  "A sourced regex is a control; an unsourced one is a liability. Keep the citation\n" +
  "       beside the rule so the next session can check it rather than trust it.");

// ═══════════════════════════════════════════════════════════════════════════
section("2 · normalisation is a uniqueness control, not a tidy-up");
// ═══════════════════════════════════════════════════════════════════════════

ok("🔴 separators and case collapse to ONE canonical value",
  normaliseIdNumber("ab 123-456") === "AB123456" &&
  normaliseIdNumber("AB123456") === "AB123456" &&
  normaliseIdNumber(" ab/123.456 ") === "AB123456",
  "If `AB 123456` and `AB123456` normalise differently the partial unique index sees\n" +
  "       two documents, and one human holds two accounts.");
ok("control · normalisation does not collapse genuinely different numbers",
  normaliseIdNumber("AB123456") !== normaliseIdNumber("AB123457"));

// ═══════════════════════════════════════════════════════════════════════════
section("3 · per-type validation — every refusal beside its acceptance");
// ═══════════════════════════════════════════════════════════════════════════

// NIDA — the one PUBLISHED rule, so it REFUSES.
ok("NIDA · a well-formed 20-digit number is accepted", validateIdNumber("NIDA", nida("456712345678")).ok);
ok("NIDA · 19 digits is refused", !validateIdNumber("NIDA", "1990010145671234567").ok);
ok("NIDA · letters are refused", !validateIdNumber("NIDA", "1990010145671234567A").ok);
// ⭐ AND HARDER THAN A LENGTH: digits 1-8 are a date, so they are checked as one.
{
  const v = validateIdNumber("NIDA", "19993101456712345678");
  ok("🔴 NIDA · month 31 is refused as an impossible date",
    !v.ok && v.refusal === "nida_date",
    "The published example decomposes 8-5-5-2 with YYYYMMDD leading. A 20-digit\n" +
    "       string that is not a date is not a NIDA.");
}
ok("🔴 NIDA · 30 February is refused (JS rolls it to 2 March — the round-trip catches it)",
  nidaDateOfBirth("19990230456712345678") === null);
ok("control · a real date round-trips", nidaDateOfBirth("19950101123456789012") === "1995-01-01");
ok("control · the date check only runs once the length rule has passed",
  nidaDateOfBirth("1995") === null && nidaDateOfBirth("") === null);

// PASSPORT — SECONDARY, so it FLAGS and never refuses.
{
  // ⚠️ NINE CHARACTERS, letter-leading — `AB1234567`, not `AB123456`. The first
  // draft of this fixture used eight and the suite correctly called it
  // out-of-shape, which is the guard working: the advisory pattern really is
  // 1-2 letters then 7-8 digits, summing to nine.
  const inShape = validateIdNumber("PASSPORT", "AB1234567");
  ok("PASSPORT · a shape-conforming number is accepted with no flag",
    inShape.ok && !inShape.flags.includes("unofficial_shape"), JSON.stringify(inShape));
  const outOfShape = validateIdNumber("PASSPORT", "ZZ99");
  ok("🔴 PASSPORT · a number OUTSIDE the shape is ACCEPTED, and FLAGGED",
    outOfShape.ok && outOfShape.flags.includes("unofficial_shape"),
    "The 9-character shape is from secondary sources. Refusing on it would lock out a\n" +
    "       holder of an older booklet over a rule no government published. The officer is\n" +
    "       told instead, and the bio-page image is the control.");
}

// LICENCE / VOTER CARD — no published format: the sanity band, and nothing more.
for (const t of ["DRIVER_LICENSE", "VOTER_CARD"] as const) {
  ok(`${t} · a plain alphanumeric number is accepted`, validateIdNumber(t, "TZ1234567").ok);
  ok(`${t} · a number with punctuation normalises and is accepted`, validateIdNumber(t, "tz-123 4567").ok);
  const v = validateIdNumber(t, "TZ1234567");
  ok(`🔴 ${t} · the verdict SAYS no published format was applied`,
    v.ok && v.flags.includes("no_published_format"),
    "The officer's screen renders this. An open field that does not announce itself as\n" +
    "       open reads as a checked field, which is the misrepresentation this unit avoids.");
  // The band is a bound on what a column and a human can hold — never a format claim.
  ok(`${t} · empty is refused`, !validateIdNumber(t, "   ").ok);
  ok(`${t} · below the sanity floor is refused`, !validateIdNumber(t, "AB").ok);
  ok(`${t} · above the sanity ceiling is refused`, !validateIdNumber(t, "A".repeat(ID_NUMBER_MAX_LEN + 1)).ok);
  ok(`${t} · a symbol is refused as charset, not silently stripped`,
    !validateIdNumber(t, "TZ12#45$7").ok);
}
ok("the sanity band is a band, not a point", ID_NUMBER_MIN_LEN < ID_NUMBER_MAX_LEN && ID_NUMBER_MIN_LEN >= 3);

// ═══════════════════════════════════════════════════════════════════════════
section("4 · required slots and expiry are per-document, never a count");
// ═══════════════════════════════════════════════════════════════════════════

for (const t of ID_DOC_TYPES) {
  const spec = ID_DOC_SPECS[t];
  ok(`${t} · requires at least one document image and a selfie`,
    spec.requiredSlots.length >= 2 && spec.requiredSlots.includes("SELFIE"),
    "⭐ THE SELFIE SURVIVES ON ALL FOUR ON PURPOSE. \"Selfie matches the ID photo\" is one\n" +
    "       of the officer's four attestations (kyc-attestations.ts), so dropping it for three\n" +
    "       of the types would REMOVE THE HUMAN CONTROL while widening the document list —\n" +
    "       exactly what docs/IDENTITY-POLICY.md forbids.");
  ok(`${t} · every required slot is a real slot`,
    spec.requiredSlots.every((s) => ALL_DOC_SLOTS.includes(s)));
  ok(`${t} · every required slot has a player-facing label key`,
    spec.requiredSlots.every((s) => typeof DOC_SLOT_LABEL_KEY[s] === "string" && DOC_SLOT_LABEL_KEY[s].length > 0));
}
ok("🔴 NIDA still asks for front + back + selfie", ID_DOC_SPECS.NIDA.requiredSlots.join(",") === "NIDA_FRONT,NIDA_BACK,SELFIE");
ok("PASSPORT asks for the BIO PAGE, not a NIDA slot", ID_DOC_SPECS.PASSPORT.requiredSlots.includes("PASSPORT") && !ID_DOC_SPECS.PASSPORT.requiredSlots.includes("NIDA_FRONT"));
ok("DRIVER_LICENSE asks for the licence image", ID_DOC_SPECS.DRIVER_LICENSE.requiredSlots.includes("DRIVER_LICENSE"));
ok("VOTER_CARD asks for the card image", ID_DOC_SPECS.VOTER_CARD.requiredSlots.includes("VOTER_CARD"));

// 🔴 EXPIRY EXISTS FOR EXACTLY THE TWO DOCUMENTS THAT HAVE ONE.
ok("🔴 passport and driving licence carry an expiry",
  ID_DOC_SPECS.PASSPORT.expires && ID_DOC_SPECS.DRIVER_LICENSE.expires);
ok("🔴 NIDA and the voter's card do NOT",
  !ID_DOC_SPECS.NIDA.expires && !ID_DOC_SPECS.VOTER_CARD.expires,
  "Asking for a date a document does not carry invites an invented one, and an\n" +
  "       invented date in a compliance record is worse than no date.");
ok("isExpired · a past date is expired", isExpired("2020-01-01", new Date()));
ok("isExpired · a future date is not", !isExpired("2099-01-01", new Date()));
ok("🔴 isExpired · a MISSING date is not 'expired'", !isExpired(null, new Date()),
  "A missing date is a required-field question, not an expiry one. Conflating the two\n" +
  "       told a player their in-date passport had expired.");

ok("missingSlots names what is missing, not how many",
  missingSlots("PASSPORT", ["SELFIE"]).join(",") === "PASSPORT" &&
  missingSlots("PASSPORT", ["PASSPORT", "SELFIE"]).length === 0);
ok("🔴 missingSlots is not satisfiable by a COUNT",
  missingSlots("NIDA", ["SELFIE", "SELFIE", "SELFIE"]).length === 2,
  "`documents.length >= 3` was true of three copies of one slot, and false of a\n" +
  "       complete two-slot passport submission.");

// ═══════════════════════════════════════════════════════════════════════════
section("5 · 🔴 ONE DOCUMENT, ONE ACCOUNT — for every one of the four");
// ═══════════════════════════════════════════════════════════════════════════

console.log = () => {}; // silence the service's email/audit stubs
for (const [i, idType] of ID_DOC_TYPES.entries()) {
  const num = idType === "NIDA" ? nida(`4567123456${String(10 + i)}`) : `DUP${idType.slice(0, 3)}${i}`;
  const expiry = ID_DOC_SPECS[idType].expires ? "2030-06-30" : undefined;
  const a = `usr_dup_a_${i}`, b = `usr_dup_b_${i}`;
  await mkPlayer(a); await mkPlayer(b);
  await startKyc(a); await startKyc(b);

  const first = await submitIdentityStep(a, { idType, idNumber: num, fullName: "Holder One", dob: "1990-01-01", ...(expiry ? { idExpiry: expiry } : {}) });
  ok(`control · ${idType} is accepted for the FIRST account`,
    first.ok && (first as { data?: { verified: boolean } }).data?.verified === true, JSON.stringify(first).slice(0, 120));

  const second = await submitIdentityStep(b, { idType, idNumber: num, fullName: "Holder Two", dob: "1990-01-01", ...(expiry ? { idExpiry: expiry } : {}) });
  ok(`🔴 ${idType} · the SAME document is refused for a SECOND account`,
    !second.ok && (second as { reason?: string }).reason === "id_taken",
    "Widening WHICH document is accepted must not widen HOW MANY accounts one human\n" +
    "       can hold. This is the whole compliance risk of the unit.");

  // ⭐ AND THE SAME SPELLING WRITTEN DIFFERENTLY IS THE SAME DOCUMENT.
  const spaced = await submitIdentityStep(b, { idType, idNumber: num.replace(/^(.{3})/, "$1 "), fullName: "Holder Two", dob: "1990-01-01", ...(expiry ? { idExpiry: expiry } : {}) });
  ok(`🔴 ${idType} · a re-spaced copy of the number is ALSO refused`,
    !spaced.ok && (spaced as { reason?: string }).reason === "id_taken",
    "Normalisation is what makes this true. Without it `AB 123456` opens a second\n" +
    "       account on the same passport.");
}
console.log = origLog;

// 🔴 THE PAIR, NOT THE NUMBER. Two DIFFERENT documents that happen to share digits
// are two documents — refusing the second would lock out an unrelated citizen.
{
  console.log = () => {};
  const shared = "SHARED12345";
  const p = "usr_pair_p", d = "usr_pair_d";
  await mkPlayer(p); await mkPlayer(d);
  await startKyc(p); await startKyc(d);
  const rp = await submitIdentityStep(p, { idType: "VOTER_CARD", idNumber: shared, fullName: "Voter Person", dob: "1990-01-01" });
  const rd = await submitIdentityStep(d, { idType: "DRIVER_LICENSE", idNumber: shared, fullName: "Driver Person", dob: "1990-01-01", idExpiry: "2030-01-01" });
  console.log = origLog;
  ok("control · the voter's card is accepted", rp.ok);
  ok("🔴 the same digits on a DIFFERENT document are NOT a duplicate",
    rd.ok, JSON.stringify(rd).slice(0, 140));
}

// ═══════════════════════════════════════════════════════════════════════════
section("6 · 🔴 the age gate belongs to the PLAYER, not to the NIDA number");
// ═══════════════════════════════════════════════════════════════════════════
// Only a NIDA carries a date of birth inside its number. An UNDERAGE check derived
// from the NUMBER therefore passes vacuously for the other three — a guard that
// passes because the feature is absent. So: assert it per type, on fresh accounts
// (a shared account meets the rate limiter on the fourth attempt and the refusal
// stops being about age at all), each beside an adult acceptance.

ok(`the minimum age is ${MIN_AGE_YEARS}`, MIN_AGE_YEARS === 18);
ok("ageOn counts whole calendar years, not 365.25-day approximations",
  ageOn("2000-03-02", new Date("2018-03-01T00:00:00Z")) === 17 &&
  ageOn("2000-03-02", new Date("2018-03-02T00:00:00Z")) === 18);

console.log = () => {};
for (const [i, idType] of ID_DOC_TYPES.entries()) {
  const expiry = ID_DOC_SPECS[idType].expires ? "2030-06-30" : undefined;
  const num = idType === "NIDA" ? nida(`4567123499${String(10 + i)}`) : `AGE${idType.slice(0, 3)}${i}`;
  const young = `usr_age_y_${i}`, adult = `usr_age_a_${i}`;
  await mkPlayer(young); await mkPlayer(adult);
  await startKyc(young); await startKyc(adult);
  const ry = await submitIdentityStep(young, { idType, idNumber: num, fullName: "Too Young", dob: "2015-01-01", ...(expiry ? { idExpiry: expiry } : {}) });
  const ra = await submitIdentityStep(adult, { idType, idNumber: num, fullName: "Grown Up", dob: "1990-01-01", ...(expiry ? { idExpiry: expiry } : {}) });
  console.log = origLog;
  ok(`🔴 ${idType} · an under-18 applicant is refused`, !ry.ok && ry.code === "INVALID", String(ry.code));
  ok(`control · ${idType} · an adult with the SAME number is accepted`,
    ra.ok && (ra as { data?: { verified: boolean } }).data?.verified === true, JSON.stringify(ra).slice(0, 120));
  console.log = () => {};
}
console.log = origLog;

// ═══════════════════════════════════════════════════════════════════════════
section("7 · expiry is refused at submit, and re-checked before review");
// ═══════════════════════════════════════════════════════════════════════════
{
  console.log = () => {};
  const u = "usr_exp_1";
  await mkPlayer(u); await startKyc(u);
  const past = await submitIdentityStep(u, { idType: "PASSPORT", idNumber: "EX111111", idExpiry: "2020-01-01", fullName: "Expired Holder", dob: "1990-01-01" });
  const none = await submitIdentityStep(u, { idType: "PASSPORT", idNumber: "EX222222", idExpiry: "", fullName: "No Date", dob: "1990-01-01" });
  const good = await submitIdentityStep(u, { idType: "PASSPORT", idNumber: "EX333333", idExpiry: "2030-01-01", fullName: "In Date", dob: "1990-01-01" });
  console.log = origLog;
  ok("🔴 an EXPIRED passport is refused at submit", !past.ok && (past as { reason?: string }).reason === "id_expired",
    "An expired document is not valid identity evidence. Handing one to an officer to\n" +
    "       approve is the human control failing silently.");
  ok("…and a MISSING expiry is a different refusal, with its own sentence",
    !none.ok && (none as { reason?: string }).reason === "id_expiry_required");
  ok("control · an in-date passport is accepted", good.ok && (good as { data?: { verified: boolean } }).data?.verified === true, JSON.stringify(good).slice(0, 120));

  // ⚠️ AND AGAIN AT SUBMIT-FOR-REVIEW. A passport accepted on Monday can be out of
  // date by the time the photographs are attached.
  console.log = () => {};
  await attachDocument(u, "PASSPORT", VALID_IMG);
  await attachDocument(u, "SELFIE", VALID_IMG);
  const beforeExpiry = await submitForReview(u);
  const k = await getKycStatus(u);
  await db.kyc.upsert({ ...k!, status: "IN_PROGRESS", idExpiry: "2020-01-01", updatedAt: new Date().toISOString() });
  const afterExpiry = await submitForReview(u);
  console.log = origLog;
  ok("control · an in-date submission reaches review", beforeExpiry.ok, JSON.stringify(beforeExpiry));
  ok("🔴 a submission whose document expired since is refused at review time",
    !afterExpiry.ok && (afterExpiry as { reason?: string }).reason === "id_expired");
}

// ═══════════════════════════════════════════════════════════════════════════
section("8 · the required slots gate submission, per document");
// ═══════════════════════════════════════════════════════════════════════════
{
  console.log = () => {};
  const u = "usr_slots_1";
  await mkPlayer(u); await startKyc(u);
  await submitIdentityStep(u, { idType: "VOTER_CARD", idNumber: "VOTERSLOT1", fullName: "Slot Tester", dob: "1990-01-01" });
  const noDocs = await submitForReview(u);
  await attachDocument(u, "VOTER_CARD", VALID_IMG);
  const oneDoc = await submitForReview(u);
  await attachDocument(u, "SELFIE", VALID_IMG);
  const bothDocs = await submitForReview(u);
  console.log = origLog;
  ok("🔴 no attachments · refused", !noDocs.ok && (noDocs as { reason?: string }).reason === "docs_required");
  ok("🔴 the card WITHOUT the selfie · still refused", !oneDoc.ok && (oneDoc as { reason?: string }).reason === "docs_required",
    "The selfie is the officer's face-match attestation. Dropping it for three of the\n" +
    "       four types would remove the human control while widening the document list.");
  ok("control · card + selfie · reaches review", bothDocs.ok, JSON.stringify(bothDocs));
  // ⭐ AND IT IS NOT A COUNT: a voter's card needs TWO, and a NIDA needs THREE.
  ok("…and the gate is the SLOT LIST, not a literal 3",
    ID_DOC_SPECS.VOTER_CARD.requiredSlots.length === 2 && ID_DOC_SPECS.NIDA.requiredSlots.length === 3);
}

// ═══════════════════════════════════════════════════════════════════════════
section("9 · the identity tuple is the ONLY home — the deprecated mirror is GONE");
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ THIS SECTION USED TO POLICE A MIRROR THAT NO LONGER EXISTS, and left as it was it
// would have become a guard that CANNOT FAIL: "nothing reads the deprecated columns" is
// trivially true once the columns are gone, and its RED case would then have proved
// only that a detector detects an impossible defect.
//
// 🔴 AND THE OLD VERSION WAS NARROWER THAN EVERY DOCUMENT CLAIMED. Its locator was
// `\b(?:kyc|k)\??\.\s*nida(?:Number|VerifiedAt)\b` — a dot-read through an identifier
// spelled exactly `kyc` or `k` — and it EXEMPTED prisma-dal.ts and store.ts, which is
// precisely where the platform's only two readers lived. Its one positive control fed
// it the single shape it could already see. So "read by NOTHING", stated in five
// documents and in the session-52 handoff, was a claim no check had ever tested.
//
// What it asserts now is what can still go wrong: no spelling of the columns survives
// anywhere under src/, the schema declares neither field nor index, and the number-only
// duplicate read does not come back.
{
  const APP = ["src/app", "src/components", "src/lib"];
  const { readdirSync } = await import("node:fs");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
  };
  // ⛔ NO ALLOWLIST THIS TIME. The old one exempted the only three files that ever
  // touched the column — which is how the guard and its own control came to agree and
  // be blind together. If a store back-end needs the token again, that IS the finding.
  const LEGACY = /\bnida(?:Number|VerifiedAt)\b/;
  const offenders: string[] = [];
  for (const root of APP) {
    for (const f of walk(root)) {
      const body = stripComments(read(f));
      if (LEGACY.test(body)) offenders.push(f);
    }
  }
  ok("🔴 no spelling of the deprecated nida* columns survives anywhere under src/",
    offenders.length === 0,
    `found in: ${offenders.join(", ")}\n` +
    "       Two homes for one fact diverge silently, and the stale one is always the one\n" +
    "       somebody reads. Use `idType` / `idNumber` / `idVerifiedAt`.");
  // ⭐ FOUR CONTROLS, because ONE control was the reason the old guard was narrow: it
  // proved only the single shape its regex already matched.
  ok("control · the detector sees a dot-read",   LEGACY.test("const x = kyc.nidaNumber;"));
  ok("control · …a destructure",                 LEGACY.test("const { nidaVerifiedAt } = kyc;"));
  ok("control · …a bare row property",           LEGACY.test("row.nidaNumber ?? null"));
  ok("control · …and a Prisma where-key",        LEGACY.test("where: { nidaNumber: norm }"));
  ok("control · and it does NOT fire on the legacy INDEX NAME, which must survive",
    !LEGACY.test('msg.includes("KycSubmission_nidaNumber_active_key")'),
    "An underscore is a word character, so the index name is not a column read. If this\n" +
    "       flips, the guard starts refusing the one legacy reference that has to stay.");

  // 🔴 THE SCHEMA IS THE OTHER HALF. A field re-added there re-enters every generated
  // client, and the column comes back with it.
  const schema = read("prisma/schema.prisma");
  const kycModel = /model KycSubmission \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? "";
  ok("control · the KycSubmission model was actually located", kycModel.length > 400);
  ok("🔴 KycSubmission declares NO nida* field and NO index on one",
    !/^\s*nida(?:Number|VerifiedAt)\s/m.test(kycModel) && !/@@index\(\[nidaNumber\]\)/.test(kycModel),
    "The fields must leave the schema one release BEFORE the columns leave the database:\n" +
    "       postinstall runs `prisma generate`, which bakes the column list from this file,\n" +
    "       and Prisma selects every scalar column — so a column dropped while a\n" +
    "       previously-deployed container still names it throws 42703 on\n" +
    "       `db.kyc.findByUserId`, which `createSession` calls on all three login paths.\n" +
    "       That is sign-in, platform-wide, not three KYC pages.");

  // 🔴 AND THE NUMBER-ONLY DUPLICATE READ MUST NOT COME BACK. Not dead-code hygiene:
  // matching a number without its document type refuses a passport for sharing digits
  // with a NIDA, and lets one human hold two accounts on two different documents.
  for (const f of ["src/lib/server/store.ts", "src/lib/server/prisma-dal.ts"]) {
    ok(`🔴 ${f.split("/").pop()} exposes no number-only duplicate read`,
      !/\bfind(?:ByNida|ActiveByNida)\s*[:(]/.test(stripComments(read(f))),
      "findActiveByIdNumber matches on the PAIR. A number-only read is the route around\n" +
      "       a DUPLICATE_IDENTITY rejection that the tuple exists to close.");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section("10 · every player-facing string exists in all three languages");
// ═══════════════════════════════════════════════════════════════════════════
// ⛔ THE CATALOGUE RETURNS KEYS, NEVER WORDS. A missing key renders `undefined` on the
// chooser — in the language of the 44 of 46 live players who are not reading English.
{
  const locales = ["en", "sw", "zh"] as const;
  const keysToCheck = new Set<string>();
  for (const t of ID_DOC_TYPES) {
    const s = ID_DOC_SPECS[t];
    [s.labelKey, s.numberLabelKey, s.hintKey, s.ruleKey].forEach((k) => keysToCheck.add(k));
  }
  Object.values(DOC_SLOT_LABEL_KEY).forEach((k) => keysToCheck.add(k));
  ["chooseIdType", "chooseIdTypeBody", "idExpiryLabel", "idExpiryHint", "identityDocument", "idSaved", "idDocsNeeded"].forEach((k) => keysToCheck.add(k));
  for (const loc of locales) {
    const d = (dict as unknown as Record<string, { profile: Record<string, string> }>)[loc];
    for (const k of keysToCheck) {
      const v = d?.profile?.[k];
      ok(`${loc}.profile.${k} exists and is non-empty`, typeof v === "string" && v.trim().length > 0, String(v));
    }
  }
  // ⛔ AND THE RULE SENTENCES MUST NAME THE RULE, not say "invalid" — §F4. The one for
  // the two open documents must NOT claim a format that does not exist.
  const en = (dict as unknown as Record<string, { profile: Record<string, string> }>).en.profile;
  ok("🔴 the NIDA rule sentence states the real rule (20 digits)", /20/.test(en[ID_DOC_SPECS.NIDA.ruleKey]));
  ok("🔴 the passport sentence hedges, because the source is secondary", /usually/i.test(en[ID_DOC_SPECS.PASSPORT.ruleKey]));
  ok("🔴 the open-format sentence claims no format",
    ID_DOC_SPECS.DRIVER_LICENSE.ruleKey === ID_DOC_SPECS.VOTER_CARD.ruleKey &&
    /exactly as printed/i.test(en[ID_DOC_SPECS.DRIVER_LICENSE.ruleKey]) &&
    !/\bmust be\b/i.test(en[ID_DOC_SPECS.DRIVER_LICENSE.ruleKey]),
    "Telling a player their licence number 'must be' anything is a claim TRA never made.");
}

// ═══════════════════════════════════════════════════════════════════════════
section("11 · the surfaces read the catalogue rather than re-writing it");
// ═══════════════════════════════════════════════════════════════════════════
{
  const PAGE = stripComments(read("src/app/profile/kyc/page.tsx"));
  ok("the player page renders the slots the CATALOGUE names",
    /requiredSlots\.map\(/.test(PAGE) && !/docType="NIDA_FRONT"/.test(PAGE),
    "Three hard-written uploaders is how a passport journey ends up asking for the\n" +
    "       back of a NIDA card.");
  ok("the chooser uses the kit's ONE filter control, not a hand-rolled one",
    /<FilterPill/.test(PAGE),
    "DESIGN_AUTHORITY: hand-rolling a second control language is a documented refusal.");
  ok("🔴 the chooser puts the type in the URL, so a refused submit round-trips",
    /href=\{`\/profile\/kyc\?idType=\$\{ty\}`\}/.test(PAGE));
  ok("🔴 …and the FORM carries its own copy, so a stale link cannot pick the rule",
    /<input type="hidden" name="idType" value=\{chosenType\} \/>/.test(PAGE),
    "Validating against a query string lets a hand-edited `?idType=` check a passport\n" +
    "       number against a licence's rule.");
  // ⚠️ SCOPED TO THE ELEMENT, NOT TO A CHARACTER WINDOW. The first draft looked for
  // `placeholder=` within 400 characters of `id="idNumber"`; the field's own props run
  // to 543, so re-adding a placeholder sat just outside the window and the assertion
  // stayed green over the defect. `red:id-documents` case 17 is what found that.
  {
    const at = PAGE.indexOf('id="idNumber"');
    const end = PAGE.indexOf("/>", at);
    const field = at >= 0 && end > at ? PAGE.slice(at, end) : "";
    ok("fixture · the identity-number field element was located", field.length > 50, String(field.length));
    ok("⛔ A-5 · no placeholder on the identity number field",
      field.length > 50 && !/placeholder=/.test(field),
      "A placeholder must never become a value. The shape lives in the hint and the rule\n" +
      "       sentence, which are text — not a greyed value sitting in a box.");
  }
  ok("the expiry field renders only for a document that HAS one",
    /\{spec\.expires && \(/.test(PAGE));

  const ADMIN = stripComments(read("src/app/admin/kyc/[id]/page.tsx"));
  ok("the reviewer's tabs are this document's slots",
    /required\.length \? required : ALL_DOC_SLOTS/.test(ADMIN),
    "Three hard-written tabs meant the passport bio page — the only image that\n" +
    "       matters — had no tab at all.");
  ok("the reviewer is told when NO published format was applied",
    /absenceNote/.test(ADMIN),
    "An open field that does not announce itself as open reads as a checked field.");

  const ROUTE = stripComments(read("src/app/api/admin/kyc-doc/route.ts"));
  ok("🔴 the document route's accept-list is DERIVED from the catalogue",
    /new Set<string>\(ALL_DOC_SLOTS\)/.test(ROUTE),
    "A literal set is why PASSPORT / DRIVER_LICENSE / VOTER_CARD existed in the database\n" +
    "       enum and were unreachable from the product.");
}

console.log("");
console.log("─".repeat(64));
console.log(`  FOUR IDENTITY DOCUMENTS: ${pass} passed, ${fail} failed`);
console.log(`  Uniqueness is enforced by the DATABASE on ("idType","idNumber");`);
console.log(`  run 'npm run red:id-documents' to see this suite refuse each defect.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
