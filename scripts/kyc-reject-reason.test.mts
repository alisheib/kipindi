/**
 * A REJECTED PLAYER MUST BE TOLD, IN THEIR OWN LANGUAGE, THE REASON THE OFFICER
 * ACTUALLY PICKED.
 *
 * Found by rejecting a live persona through /admin/kyc/<id> on production
 * (2026-07-31, campaign §6 E-1). The officer selected "Details mismatch"; the
 * player's /profile/kyc read:
 *
 *     Reason: other. Details do not match the submitted ID. …
 *
 * Two independent defects stacked into one sentence that contradicts itself:
 *
 *  1. `rejectKycWorkstationAction` used the officer's reason code ONLY to look
 *     up an English sentence and never passed it on, so `reviewKyc` hard-coded
 *     `rejectReason: "OTHER"`. Every manual rejection ever made on 50pick is
 *     uncategorised — a rejection-reason breakdown reads 100% OTHER — and the
 *     player is shown a category that contradicts the note beside it.
 *
 *  2. `humanizeRejectReason` keyed its label map on names that are not members
 *     of the Postgres `KycRejectReason` enum (NIDA_MISMATCH, PHOTO_UNREADABLE,
 *     WRONG_DOCUMENT, SELFIE_MISMATCH, EXPIRED_DOCUMENT, DUPLICATE_ACCOUNT).
 *     Only UNDERAGE was real. Every other rejection — including the automatic
 *     NIDA ones in kyc-service.ts, which have always written real enum members —
 *     fell through to `raw.replace(/_/g," ").toLowerCase()` and printed English
 *     enum text to Swahili and Chinese players, while 21 correct translations
 *     sat unreachable in the dictionary.
 *
 * This test pins the join between the three: the schema enum, the officer's
 * reason codes, and the player's dictionary. Adding an enum member without a
 * translation, or renaming one without updating the map, fails here.
 */
import { readFileSync } from "node:fs";
import { dict } from "../src/lib/i18n-dict.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const SCHEMA = read("../prisma/schema.prisma");
const PROFILE = read("../src/app/profile/kyc/page.tsx");
const ACTIONS = read("../src/app/admin/kyc/[id]/kyc-actions.ts");
const SERVICE = read("../src/lib/server/kyc-service.ts");

// ── 1. The enum, read from the schema — the single source of truth ─────────
const enumBlock = /enum KycRejectReason \{([^}]*)\}/.exec(SCHEMA);
ok("prisma schema still declares enum KycRejectReason", !!enumBlock);
const MEMBERS = (enumBlock?.[1] ?? "")
  .split("\n").map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l));
ok("the enum has members", MEMBERS.length >= 5, MEMBERS.join(","));

// ── 2. Every member a player can be shown has a translated label ───────────
// OTHER is deliberately unlabelled: it says nothing actionable, and printing
// "Reason: other." in front of the officer's own sentence reads as a
// contradiction. The note is the message in that case.
const labelBlock = /function humanizeRejectReason[\s\S]*?\n\}/.exec(PROFILE)?.[0] ?? "";
ok("humanizeRejectReason still exists", labelBlock.length > 0);
ok(
  "humanizeRejectReason returns null (not the raw enum) for anything unmapped",
  /labels\[raw\] \?\? null/.test(labelBlock),
  "an unmapped member would print raw English enum text to a Swahili player",
);
for (const m of MEMBERS) {
  if (m === "OTHER") {
    ok("OTHER has NO label — the officer's note is the message", !labelBlock.includes(`\n    ${m}:`));
    continue;
  }
  ok(`${m} is mapped to a dictionary key`, new RegExp(`\\b${m}:\\s*t\\.profile\\.`).test(labelBlock),
    "this member would fall through and show raw enum text");
}

// ── 3. Every mapped key exists in ALL THREE locales, non-empty ─────────────
const keys = [...labelBlock.matchAll(/t\.profile\.(\w+)/g)].map((m) => m[1]);
ok("labels reference at least 5 dictionary keys", keys.length >= 5, String(keys.length));
for (const locale of ["en", "sw", "zh"] as const) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (dict as any)[locale].profile as Record<string, string>;
  for (const k of keys) {
    const v = profile[k];
    ok(`${locale}.profile.${k} is a non-empty string`, typeof v === "string" && v.trim().length > 0);
  }
}

// ── 4. There are no dictionary keys pretending to be reject labels ─────────
// Two orphans (rejectWrongType, rejectSelfieMismatch) survived translation into
// three languages while matching no enum member — a dead key looks exactly like
// a live one, which is what let defect (2) hide.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enProfile = (dict as any).en.profile as Record<string, string>;
const rejectKeys = Object.keys(enProfile).filter((k) => /^reject[A-Z]/.test(k));
for (const k of rejectKeys) {
  ok(`dictionary key profile.${k} is actually reachable from humanizeRejectReason`,
    keys.includes(k),
    "an unused reject* label is indistinguishable from a working one");
}

// ── 5. The officer's chosen code reaches the database ──────────────────────
ok(
  "reviewKyc accepts a rejectCode",
  /rejectCode\?:/.test(SERVICE),
  "without it every manual rejection is stored as OTHER",
);
ok(
  "reviewKyc stores the passed code, not a literal OTHER",
  /rejectReason: rejectCode/.test(SERVICE) && !/rejectReason: "OTHER"/.test(SERVICE),
  "hard-coding OTHER discards the officer's decision",
);
ok(
  "the workstation reject action passes rejectCode through",
  /decision: "REJECT"[\s\S]{0,80}rejectCode:/.test(ACTIONS),
);
ok(
  "the audit payload records the category that was stored",
  /payload: \{ kycId: k\.id, reason, rejectCode \}/.test(SERVICE),
);

// ── 6. Every officer reason code maps to a REAL enum member ───────────────
const codeBlock = /const REJECT_REASONS[\s\S]*?\n\};/.exec(ACTIONS)?.[0] ?? "";
const codes = [...codeBlock.matchAll(/code: "([A-Z_]+)"/g)].map((m) => m[1]);
ok("the rail's reason codes carry enum members", codes.length >= 4, codes.join(","));
for (const c of codes) {
  ok(`officer code -> ${c} is a real KycRejectReason member`, MEMBERS.includes(c));
}
ok(
  "suspected_fraud stays OTHER — never tell a suspected fraudster what we suspect",
  /suspected_fraud: \{[^}]*code: "OTHER"/.test(codeBlock),
);

console.log(`\n${fail === 0 ? "ALL PASSED" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
