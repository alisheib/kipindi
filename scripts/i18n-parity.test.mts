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
  "proposals.titleZhPlaceholder", // Chinese-title field example — Chinese in every locale by design
  "common.titleEnPlaceholder",    // English-title field example — English in every locale by design (the field is the required EN title)
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

// 3. PLACEHOLDER PARITY.
//
// Call sites interpolate by hand — `t.dialog.freeExitBody.replace("{pct}", …)`.
// So if EN carries a {pct} and the Swahili string does not, the Swahili player is
// shown a fee sentence WITH NO NUMBER IN IT and nothing fails. That is exactly how
// a money surface goes quietly wrong in a language nobody on the team reads, and
// it is the reason this check exists: every locale must carry the same set of
// placeholders as EN, or the interpolation silently drops on the floor.
{
  const tokens = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [name, loc] of [["sw", sw], ["zh", zh]] as const) {
    const mismatched = [...en.entries()]
      .filter(([k, v]) => {
        const a = tokens(v);
        const b = tokens(loc.get(k) ?? "");
        return a.join("|") !== b.join("|");
      })
      .map(([k, v]) => `${k} (en:{${tokens(v).join(",")}} vs ${name}:{${tokens(loc.get(k) ?? "").join(",")}})`);
    check(
      `${name}: placeholder parity`,
      mismatched.length === 0,
      mismatched.length ? `${mismatched.length}: ${mismatched.slice(0, 10).join("; ")}` : "",
    );
  }
}

// 4. NO HARDCODED FEE RATES IN COPY.
//
// The regression guard for the whole capped-fee change. Every fee number a player
// reads must be interpolated from the poll's own rates. A literal "9%" in a string
// was true when it was written, became false the moment admin retuned the rate,
// and nothing anywhere told us. Several such strings shipped and lied for months.
//
// Percentages that are NOT fee rates (ROI tiers, "100% verified") are allowlisted
// by key. Everything else must use a {placeholder}.
{
  const RATE_PCT_OK = new Set([
    "leaderboard.tierSovereign", "leaderboard.tierDiamond", "leaderboard.tierGold",
  ]);
  // A fee-ish percentage: a number followed by % in a string that also talks about
  // fees/commission/tax/exit. Deliberately narrow — we want no false positives.
  const FEE_WORDS = /(fee|commission|margin|tax|levy|exit|ada|kamisheni|kodi|手续费|佣金|税)/i;
  const offenders: string[] = [];
  for (const [name, loc] of [["en", en], ["sw", sw], ["zh", zh]] as const) {
    for (const [k, v] of loc.entries()) {
      if (RATE_PCT_OK.has(k)) continue;
      if (/\d+(\.\d+)?\s*%/.test(v) && FEE_WORDS.test(v)) offenders.push(`${name}.${k}: "${v.slice(0, 60)}…"`);
    }
  }
  check(
    "no hardcoded fee percentages in copy (use {pct})",
    offenders.length === 0,
    offenders.length ? `${offenders.length}: ${offenders.slice(0, 8).join(" | ")}` : "",
  );
}

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — en=${en.size} sw=${sw.size} zh=${zh.size} keys`);
process.exit(fail === 0 ? 0 : 1);
