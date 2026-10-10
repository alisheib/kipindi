/**
 * THE KYC SCREEN MUST NOT TELL AN UNVERIFIED PLAYER THEY ARE VERIFIED.
 *
 * Found by walking the live KYC ladder as a real player. On step 2 — the identity
 * number typed, not one document uploaded, nothing submitted, no officer involved — the
 * card rendered a green ticked pill reading "ID verified" (SW "Imethibitishwa",
 * ZH "已验证"). It was bound to `nidaDone && !submitted`, i.e. to
 * `idVerifiedAt` (`nidaVerifiedAt` before 2026-08-20).
 *
 * docs/IDENTITY-POLICY.md is the owner decision and could not be plainer:
 *
 *   > `idVerifiedAt` therefore means "format accepted", NOT "government
 *   > confirmed" … If any surface, doc or comment contradicts it, that surface
 *   > is wrong.
 *
 * There is no authority check anywhere in the product — not for NIDA, and there is
 * no endpoint at all for a passport, a driving licence or a voter's card. Identity
 * assurance comes from the documents a human compliance officer reviews. So that
 * badge was a false status claim on the one surface that must never overstate —
 * and it was false in all three languages.
 *
 * The same string is legitimate on the approval reward-burst, gated on
 * `kyc?.status === "APPROVED"` (since 2026-09-14 the stepper's last node reads its own
 * `profile.stepVerified`). This test pins the distinction rather than banning the string.
 */
import { readFileSync } from "node:fs";
import { dict } from "../src/lib/i18n-dict.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const SRC = readFileSync(new URL("../src/app/profile/kyc/page.tsx", import.meta.url), "utf8");

// ── 1. The pre-submission step-2 card must not claim verification ──────────
// ⚠️ RE-ANCHORED 2026-08-20. `nidaDone` became `idDone` when the identity step
// stopped being NIDA-only. An anchor that no longer matches makes indexOf return
// -1, and the assertions below would then run over a 4000-character slice of the
// WRONG part of the file — passing on nothing. The "still exists" check underneath
// is what turns that into a red.
// ⚠️ RE-ANCHORED 2026-10-10: the photo step also waits while an agent's SAVED document has expired (`agentDocExpired` —
// the details form comes back instead), so its opening gained one clause.
const OPEN = "{idDone && !submitted && !agentDocExpired && (";
const start = SRC.indexOf(OPEN);
ok("the pre-submission step-2 card still exists", start !== -1);
if (start !== -1) {
  // Take the block up to the section that follows it.
  const rest = SRC.slice(start);
  const end = rest.indexOf("\n      )}");
  const block = rest.slice(0, end === -1 ? 4000 : end);
  ok(
    "step-2 card does NOT render t.profile.idVerified",
    !block.includes("t.profile.idVerified"),
    "an unverified player would be badged 'ID verified' before any document is reviewed",
  );
  ok(
    "step-2 card uses the truthful idSaved label instead",
    block.includes("t.profile.idSaved"),
  );
}

// ── 2. Every remaining idVerified usage is APPROVED-gated ──────────────────
// Each usage must sit downstream of an `APPROVED` guard, either the stepper's
// `done:` binding or the reward-burst's explicit status check.
const usages = [...SRC.matchAll(/t\.profile\.idVerified/g)].map((m) => m.index ?? 0);
ok("idVerified is still used (the approval burst)", usages.length >= 1, `${usages.length} usage(s)`);
for (const at of usages) {
  const context = SRC.slice(Math.max(0, at - 400), at + 120);
  ok(
    `idVerified at offset ${at} is gated on APPROVED`,
    context.includes("APPROVED"),
    context.replace(/\s+/g, " ").slice(-140),
  );
}

// ── 3. The truthful label exists in all three languages ────────────────────
for (const loc of ["en", "sw", "zh"] as const) {
  const d = (dict as unknown as Record<string, { profile: Record<string, string> }>)[loc];
  const v = d?.profile?.idSaved;
  ok(`${loc} has profile.idSaved`, typeof v === "string" && v.length > 0, String(v));
  ok(
    `${loc} idSaved does not itself claim verification`,
    !/verified|imethibitishwa|已验证/i.test(v ?? ""),
    v,
  );
}

// ── 4. The audit chain must not claim an authority check that never ran ────
// Driving KYC on production wrote these into the live audit chain:
//     nida.verify.requested  {"nidaLast4":"9014"}
//     nida.verify.success    {"matchScore":0.97}
//     kyc.nida.verified      {"matchScore":0.97}
// docs/IDENTITY-POLICY.md: the authority check is "deliberately absent … no request
// has ever reached the National Identification Authority". So the hash-chained
// record a GBT/TRA inspector reads asserted a 97%-confidence identity match that
// nothing computed — and it returned gender "M" for every player alive.
// 50pick never fabricates live data; if we cannot compute it we record nothing.
{
  delete process.env.NIDA_API_URL;
  const { verifyNida } = await import("../src/lib/server/nida.ts");
  const r = await verifyNida({
    nida: "19950412123456789012",
    fullName: "Honesty Probe",
    dob: "1990-01-01",
    userId: "usr_honesty_probe",
  });
  ok("verifyNida still accepts a well-formed NIDA", r.ok === true && "verified" in r && r.verified === true);
  if (r.ok && "verified" in r && r.verified) {
    ok("it does NOT claim an authority check happened", r.authorityChecked === false, String(r.authorityChecked));
    ok("it invents no match score", r.matchScore === undefined, String(r.matchScore));
    ok("it invents no gender", r.gender === undefined, String(r.gender));
    ok("it echoes the player's own claim unchanged", r.fullName === "Honesty Probe" && r.dob === "1990-01-01");
  }
}

// Source guard against someone re-introducing the literals. Comments are
// stripped first — this file documents the old values on purpose, and scanning
// raw text would fail on its own explanation.
const NIDA_CODE = readFileSync(new URL("../src/lib/server/nida.ts", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
ok("no hardcoded 0.97 match score in nida.ts code", !NIDA_CODE.includes("0.97"));
ok('no hardcoded gender: "M" in nida.ts code', !/gender:\s*"M"/.test(NIDA_CODE));

// ── 5. The WAITING card claims no verification (2026-10-10) ──────────────────
// From 2026-10-10 most players are approved on the typed press itself; the few the automatic checks pass to an
// officer — and agent applicants whose photos are with our team — see a waiting card. It says we are checking; it
// must never say verified, in any language, because nothing has been decided.
{
  const WAIT = "{submitted && kyc?.status !== \"APPROVED\" && (";
  const at = SRC.indexOf(WAIT);
  ok("the waiting card still exists, gated on NOT approved", at !== -1);
  const block = at === -1 ? "" : SRC.slice(at, SRC.indexOf("</section>", at));
  ok("the waiting card renders no verified word", block.length > 100 && !/t\.profile\.(?:idVerified|agentVerifiedTitle|kycApproved)/.test(block),
    block.replace(/\s+/g, " ").slice(0, 160));
  // ⭐ 2026-10-10 (the screenshot pass): the h1 IS the status while a case is with our team ("We're checking your
  // details", `kycCheckingTitle`), so the card's title is a short label (`kycGate.eyebrowPending`, "With our team") and
  // its body says when — "checking" stood three times on one screen (h1, a hero sentence, the card).
  ok("…and names the typed case 'checking your details' — the h1 its status (kycCheckingTitle), the card a short label and the body (kycCheckingBody)",
    block.includes("t.kycGate.eyebrowPending") && block.includes("t.profile.kycCheckingBody") && !block.includes("t.profile.kycCheckingTitle")
      && SRC.includes("pending ? (photoCase ? t.kycGate.titlePendingAgent : t.profile.kycCheckingTitle)"));
  for (const loc of ["en", "sw", "zh"] as const) {
    const d = (dict as unknown as Record<string, { profile: Record<string, string>; kycGate: Record<string, string> }>)[loc];
    const words = `${d?.profile?.kycCheckingTitle ?? ""} ${d?.profile?.kycCheckingBody ?? ""} ${d?.kycGate?.eyebrowPending ?? ""}`;
    ok(`${loc} kycChecking* and the waiting card's label exist and claim no verification`,
      (d?.profile?.kycCheckingTitle ?? "").length > 0 && (d?.profile?.kycCheckingBody ?? "").length > 0 && (d?.kycGate?.eyebrowPending ?? "").length > 0
        && !/verified|imethibitishwa|umethibitishwa|已验证/i.test(words),
      words);
  }
}

type Loc = "en" | "sw" | "zh";
const LOCS: readonly Loc[] = ["en", "sw", "zh"];
const say = (loc: Loc, group: string, key: string) =>
  String((dict as unknown as Record<string, Record<string, Record<string, unknown>>>)[loc]?.[group]?.[key] ?? "");

// ── 6. AN EXPIRED DOCUMENT ON THE AGENT UPGRADE OFFERS SUPPORT, NOT A SEND THE SERVER REFUSES (review R5.4) ──
// An identity verified from typed details whose passport or licence has expired since cannot send its photo case
// (`submitForReview` refuses `id_expired`), and its document and number cannot change on this page. The uploaders and
// the send stood there anyway — an offer the server refuses, with no way to enter a new document. The page asks the
// server's own expiry rule and draws a notice and the support door in that place instead.
{
  const page = decomment(SRC).replace(/\r\n/g, "\n");
  /** The expired card: from its marker to the `) : (` that opens the photo step it replaces. */
  const expiredCard = (src: string): string => {
    const at = src.indexOf("data-kyc-agent-expired");
    const end = at < 0 ? -1 : src.indexOf(") : (", at);
    return end < 0 ? "" : src.slice(at, end);
  };
  const ruled = (src: string): boolean => {
    const card = expiredCard(src);
    return /const docExpired = isExpired\(/.test(src)
      && /\{idDone && !submitted && !agentDocExpired && \(\s*approved && docExpired \? \(/.test(src)
      && card.length > 200
      && !/<KycDocUploader|sendPhotosForReviewAction|<SubmitButton|<form/.test(card)
      && /<Link href="\/help"[^>]*>[\s\S]*?t\.error\.contactSupport/.test(card)
      && card.includes("t.profile.agentPhotosExpiredTitle") && card.includes("t.profile.agentPhotosExpiredBody");
  };
  ok("6.1 ⭐ R5.4 · an APPROVED identity whose document has expired gets a notice and the support door IN PLACE of the photo step — no uploader, no send",
    ruled(page), expiredCard(page).replace(/\s+/g, " ").slice(0, 160));
  const card = expiredCard(page);
  const plantedUploader = page.replace(card, `${card}<KycDocUploader label="x" docType="SELFIE" attached={false} />`);
  ok("6.1c control · an uploader planted in the expired card is caught", plantedUploader !== page && !ruled(plantedUploader));
  const plantedNoDoor = page.replace(card, card.replace('href="/help"', 'href="/profile"'));
  ok("6.1d control · an expired card with no support door is caught", plantedNoDoor !== page && !ruled(plantedNoDoor));
  const plantedEveryone = page.replace("approved && docExpired ? (", "docExpired ? (");
  ok("6.1e control · a notice drawn on ANY expired row (where the details step is still open) is caught", plantedEveryone !== page && !ruled(plantedEveryone));
  // ⭐ ONE RULE WITH THE SERVER: the page imports the catalogue's `isExpired`, and the photo send asks the same function.
  const svc = decomment(readFileSync(new URL("../src/lib/server/kyc-service.ts", import.meta.url), "utf8"));
  ok("6.2 the page and the photo send ask the same expiry rule (`isExpired`, id-documents.ts) — no second rule",
    /import \{[^}]*isExpired[^}]*\} from "@\/lib\/id-documents"/.test(page) && /isExpired\(k\.idExpiry/.test(svc));
  // The words: the document named in all three languages, support named — and withdrawals named ONLY to say they are not
  // affected (2026-10-10, the v4 pass: a player shown "Passport has expired" asks whether their money is stuck). An expired
  // document does not close them (the identity stays approved); any other withdrawal sentence on this card is refused.
  const WITHDRAW: Record<Loc, RegExp> = { en: /withdraw|cash[- ]?out/i, sw: /kutoa pesa|kutoa fedha|utoaji/i, zh: /提现/ };
  const SUPPORT: Record<Loc, RegExp> = { en: /support/i, sw: /msaada/i, zh: /客服/ };
  for (const loc of LOCS) {
    const title = say(loc, "profile", "agentPhotosExpiredTitle"), body = say(loc, "profile", "agentPhotosExpiredBody");
    const NOT_AFFECTED: Record<Loc, string> = { en: "Your withdrawals are not affected.", sw: "Utoaji wako wa pesa hauathiriwi.", zh: "您的提现不受影响。" };
    ok(`6.3 ${loc} · the expired card names the document, the way on (support), and withdrawals only as NOT affected`,
      title.includes("{document}") && SUPPORT[loc].test(body) && body.includes(NOT_AFFECTED[loc])
        && !WITHDRAW[loc].test(`${title} ${body.replace(NOT_AFFECTED[loc], "")}`), `${title} | ${body}`);
  }
  ok("6.3c control · the withdrawal matcher sees a withdrawal in every language",
    WITHDRAW.en.test("Your withdrawals are paused.") && WITHDRAW.sw.test("Kutoa pesa kumesitishwa.") && WITHDRAW.zh.test("提现已暂停。"));
}

// ── 7. A VERIFIED IDENTITY IS NEVER TOLD TO VERIFY, AND A CORRECTION IS NAMED AS ONE (review R5.6, R5.10) ──────────────
// The agent application's applicant verified from typed details read "Verify your identity" (`photo_upgrade` now —
// `test:kyc-gate-state-table` §4 holds that only an APPROVED row draws it, so its "verified" is always true), and the
// /agent page said "Identity verification comes first" to the same player. And officers now ask only for CORRECTIONS of
// typed details, so the /profile/kyc card, the /profile pill and the withdraw panel all name that one ask.
{
  const VERIFY: Record<Loc, RegExp> = { en: /verify/i, sw: /thibitisha/i, zh: /验证/ };
  const VERIFIED: Record<Loc, RegExp> = { en: /verified/i, sw: /umethibitishwa/i, zh: /已验证/ };
  for (const loc of LOCS) {
    const asks = [say(loc, "kycGate", "titlePhotoUpgrade"), say(loc, "kycGate", "ctaPhotoUpgrade"), say(loc, "agent", "ctaKycPhotos")];
    const states = [say(loc, "kycGate", "bodyPhotoUpgrade"), say(loc, "agent", "stateKycPhotos")];
    ok(`7.1 ${loc} · the verified applicant is asked for photos, never to verify — and is told the identity IS verified`,
      asks.every((s) => s.length > 0 && !VERIFY[loc].test(s)) && states.every((s) => VERIFIED[loc].test(s)), `${asks.join(" | ")} || ${states.join(" | ")}`);
  }
  ok("7.1c control · the words those replaced DO ask to verify, in every language",
    LOCS.every((loc) => VERIFY[loc].test(say(loc, "kycGate", "titleNotStarted")) && VERIFY[loc].test(say(loc, "agent", "ctaKyc"))));
  const CHECK: Record<Loc, RegExp> = { en: /check/i, sw: /hakiki/i, zh: /核对/ };
  for (const loc of LOCS) {
    const heading = say(loc, "profile", "kycMoreInfo"), pill = say(loc, "profile", "kycMoreInfoPill"), title = say(loc, "kycGate", "titleMoreInfo");
    ok(`7.2 ${loc} · a correction is named as one — the /profile/kyc heading IS the withdraw panel's title, and the /profile pill says the same verb`,
      heading === title && [heading, pill].every((s) => CHECK[loc].test(s)), `${heading} | ${pill} | ${title}`);
  }
  const retired: [Loc, string][] = [["en", "More information needed"], ["sw", "Maelezo zaidi yanahitajika"], ["zh", "需要更多信息"], ["en", "More info needed"], ["sw", "Maelezo yanahitajika"]];
  ok("7.2c control · the retired \"more information\" heading and pills fail 7.2's verb, in every language",
    retired.every(([loc, s]) => !CHECK[loc].test(s)));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
