/**
 * ONE COMPLIANCE SCREEN MUST NOT RENDER THE SAME DAY IN TWO TIMEZONES.
 *
 * Found by LOOKING at a live officer screenshot (2026-07-31, campaign §6 E-2).
 * Three timestamps, one screen, top to bottom:
 *
 *   decision card      31 Jul 2026, 17:11        EAT, via formatDateTime
 *   document strip     uploaded 2026-07-31 13:31:33   raw UTC, Z stripped
 *   applicant panel    SUBMITTED 31 Jul 2026, 16:31   EAT, via formatDateTime
 *
 * The middle one was `uploadedAt.slice(0, 19).replace("T", " ")` — the raw ISO
 * value with its `Z` cut off, so it neither said UTC nor was EAT. An officer
 * comparing when a document was uploaded against when the submission was made
 * — on a record they are about to sign a compliance decision on — read a
 * 3-hour gap that does not exist. DOB rendered as the raw ISO string
 * `1995-04-12T00:00:00.000Z` on the same card.
 *
 * Sibling of the `pg` −3h trap this campaign already paid for (§3): a timezone
 * bug does not look like a bug, it looks like a fact.
 *
 * A raw UTC string is not banned outright — several admin screens print one and
 * SAY so ("… UTC", or keeping the trailing Z). What is banned is an unlabelled
 * one sitting beside formatted local times.
 */
import { readFileSync } from "node:fs";
import { formatDate, formatDateTime } from "../src/lib/utils.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const VIEWER = read("../src/app/admin/kyc/[id]/kyc-doc-viewer.tsx");
const PAGE = read("../src/app/admin/kyc/[id]/page.tsx");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const V = stripComments(VIEWER);
const P = stripComments(PAGE);

// ── 1 · The three timestamps all go through the same formatter ─────────────
section("1 · one screen, one timezone");

ok("the document strip formats uploadedAt", /uploaded \$\{formatDateTime\(current\.uploadedAt\)\}/.test(V),
  "this is the one that was 3h out");
ok("…and imports it rather than hand-rolling a format", /import \{ formatDateTime \} from "@\/lib\/utils"/.test(VIEWER));
ok("the applicant panel still formats Submitted", /formatDateTime\(kyc\.submittedAt\)/.test(P));
ok("the decision trail still formats reviewedAt", /formatDateTime\(kyc\.reviewedAt\)/.test(P));

ok("🔴 no ISO slicing survives on the document strip",
  !/uploadedAt\??\.?slice\(0, ?19\)/.test(V),
  "`.slice(0,19).replace(\"T\",\" \")` prints raw UTC with the Z removed — it neither says UTC nor is local");
ok("🔴 no raw-ISO date rendering survives on the workstation page",
  !/\{kyc\.dob \?\? "—"\}/.test(P) && !/`DOB \$\{kyc\.dob\}`/.test(P),
  "the raw value reads 1995-04-12T00:00:00.000Z to an officer");
ok("DOB goes through formatDate on the applicant card", /kyc\.dob \? formatDate\(kyc\.dob\) : "—"/.test(P));
ok("…and in the auto-check detail line", /DOB \$\{formatDate\(kyc\.dob\)\}/.test(P));

// ── 2 · The formatters actually render the platform zone ───────────────────
section("2 · the helpers are zone-aware, not just named that way");

// 13:31:33 UTC is 16:31 in EAT (+3). This is the exact instant from the live
// screenshot: the strip said 13:31:33 while the panel beside it said 16:31.
const INSTANT = "2026-07-31T13:31:33.000Z";
const dt = formatDateTime(INSTANT);
ok("formatDateTime shifts a UTC instant into the platform zone", /16:31/.test(dt), dt);
ok("…and does not print the raw UTC hour", !/13:31/.test(dt), dt);

// A DOB stored at midnight is the classic off-by-one-day: read as UTC in a
// zone behind it, or formatted in a zone ahead of it, the day changes.
const DOB = "1995-04-12T00:00:00.000Z";
const d = formatDate(DOB);
ok("formatDate keeps a midnight DOB on its own day", /12 Apr 1995/.test(d), d);
ok("…and prints no time component at all", !/:/.test(d), d);

// ── 3 · An unlabelled raw timestamp cannot come back ───────────────────────
section("3 · the pattern itself is gone from these two files");

for (const [name, src] of [["kyc-doc-viewer.tsx", V], ["page.tsx", P]] as const) {
  ok(`${name} contains no unlabelled ISO-to-space rewrite`,
    !/replace\("T", ?" "\)/.test(src),
    "if a raw UTC value is ever wanted here it must SAY UTC, like /admin/insights does");
  ok(`${name} calls no inline toLocale* without a timeZone`,
    !/toLocale(Date|Time)?String\((?![^)]*timeZone)/.test(src),
    "an inline toLocaleString renders in whatever zone the SERVER runs in");
}

console.log(`\n${fail === 0 ? "ALL PASSED" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
