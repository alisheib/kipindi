/**
 * THE KYC SCREEN MUST NOT TELL AN UNVERIFIED PLAYER THEY ARE VERIFIED.
 *
 * Found by walking the live KYC ladder as a real player. On step 2 — NIDA number
 * typed, not one document uploaded, nothing submitted, no officer involved — the
 * card rendered a green ticked pill reading "ID verified" (SW "Imethibitishwa",
 * ZH "已验证"). It was bound to `nidaDone && !submitted`, i.e. to
 * `nidaVerifiedAt`.
 *
 * docs/NIDA-POLICY.md is the owner decision and could not be plainer:
 *
 *   > `nidaVerifiedAt` therefore means "format accepted", NOT "government
 *   > confirmed" … If any surface, doc or comment contradicts it, that surface
 *   > is wrong.
 *
 * There is no authority check anywhere in the product; identity assurance comes
 * from three documents a human compliance officer reviews. So that badge was a
 * false status claim on the one surface that must never overstate — and it was
 * false in all three languages.
 *
 * The same string is legitimate twice on the same page: the stepper node and the
 * approval reward-burst, both gated on `kyc?.status === "APPROVED"`. This test
 * pins the distinction rather than banning the string.
 */
import { readFileSync } from "node:fs";
import { dict } from "../src/lib/i18n-dict.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const SRC = readFileSync(new URL("../src/app/profile/kyc/page.tsx", import.meta.url), "utf8");

// ── 1. The pre-submission step-2 card must not claim verification ──────────
const OPEN = "{nidaDone && !submitted && (";
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
    "step-2 card uses the truthful nidaSaved label instead",
    block.includes("t.profile.nidaSaved"),
  );
}

// ── 2. Every remaining idVerified usage is APPROVED-gated ──────────────────
// Each usage must sit downstream of an `APPROVED` guard, either the stepper's
// `done:` binding or the reward-burst's explicit status check.
const usages = [...SRC.matchAll(/t\.profile\.idVerified/g)].map((m) => m.index ?? 0);
ok("idVerified is still used (stepper + approval burst)", usages.length >= 1, `${usages.length} usage(s)`);
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
  const v = d?.profile?.nidaSaved;
  ok(`${loc} has profile.nidaSaved`, typeof v === "string" && v.length > 0, String(v));
  ok(
    `${loc} nidaSaved does not itself claim verification`,
    !/verified|imethibitishwa|已验证/i.test(v ?? ""),
    v,
  );
}

// ── 4. The audit chain must not claim an authority check that never ran ────
// Driving KYC on production wrote these into the live audit chain:
//     nida.verify.requested  {"nidaLast4":"9014"}
//     nida.verify.success    {"matchScore":0.97}
//     kyc.nida.verified      {"matchScore":0.97}
// docs/NIDA-POLICY.md: the authority check is "deliberately absent … no request
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

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
