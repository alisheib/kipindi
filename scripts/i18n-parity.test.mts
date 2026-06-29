/**
 * i18n locale parity guard.
 *
 * Protects the three-locale dictionary (en / sw / zh) from silent drift:
 *
 *   1. Every locale exposes EXACTLY the same set of leaf keys (no missing,
 *      no extra) — a new `en` key with no sw/zh translation fails the build.
 *   2. No sw/zh value is byte-identical to its en value (i.e. left
 *      untranslated), except for an explicit allowlist of genuinely
 *      language-neutral tokens (proper nouns, codes, units).
 *
 * Why a test and not only types: the dict is `as const` and consumed via
 * `dict[locale] as Dict`, so the compiler cannot see drift. This is the
 * authoritative parity check. Wired into `predeploy`.
 *
 * Run: npm run test:i18n
 */
import { dict } from "../src/lib/i18n-dict.ts";

type Obj = Record<string, unknown>;

function flatten(o: Obj, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const k of Object.keys(o)) {
    const v = o[k];
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [kk, vv] of flatten(v as Obj, path)) out.set(kk, vv);
    } else {
      out.set(path, String(v));
    }
  }
  return out;
}

/** Key paths that are intentionally identical to English (proper nouns, codes, units). */
const IDENTICAL_OK = new Set<string>([
  "home.heroLocation",          // "Tanzania · Dar es Salaam" — place names
  "profile.nida",               // NIDA — national-ID acronym
  "profile.signOutConfirmBodySw", // already a Swahili-named key
  "profile.tanzania",           // "Tanzania" — proper noun
  "leaderboard.tableRoi",       // ROI — finance acronym
  "footer.eighteenPlus",        // "18+"
  "error.notFoundCode",         // "404"
  "proposals.titleSwPlaceholder", // Swahili-title field example — Swahili in every locale by design
  "profile.kycLabel",             // KYC — acronym
  "profile.sofBand2",             // "TZS 12M – 50M" — currency range
  "profile.sofBand3",             // "TZS 50M – 200M" — currency range
]);

const en = flatten(dict.en);
const sw = flatten(dict.sw);
const zh = flatten(dict.zh);

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("i18n parity guard\n");

// 1. Key-set parity
for (const [name, loc] of [["sw", sw], ["zh", zh]] as const) {
  const missing = [...en.keys()].filter((k) => !loc.has(k));
  const extra = [...loc.keys()].filter((k) => !en.has(k));
  check(`${name}: no missing keys`, missing.length === 0, missing.slice(0, 20).join(", "));
  check(`${name}: no extra keys`, extra.length === 0, extra.slice(0, 20).join(", "));
}

// 2. No untranslated (identical-to-en) values outside the allowlist
for (const [name, loc] of [["sw", sw], ["zh", zh]] as const) {
  const untranslated = [...en.entries()]
    .filter(([k, v]) => loc.get(k) === v && !IDENTICAL_OK.has(k))
    .map(([k]) => k);
  check(
    `${name}: no untranslated values`,
    untranslated.length === 0,
    untranslated.length ? `${untranslated.length}: ${untranslated.slice(0, 20).join(", ")}` : "",
  );
}

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — en=${en.size} sw=${sw.size} zh=${zh.size} keys`);
process.exit(fail === 0 ? 0 : 1);
