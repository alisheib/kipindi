/**
 * A PROPOSED DAY ENDS ON THE PLATFORM CLOCK, NOT IN UTC.
 *
 * THE DEFECT (2026-08-11, F9 / session 42): a player proposing a poll picks a DATE,
 * and five separate places turned that date into an instant by writing
 * `Date.parse(\`${date}T23:59:59.000Z\`)` — two validation gates, one edit gate, and
 * the two that MOVE MONEY: the published market's `resolutionAt` and
 * `selectionClosedAt`.
 *
 * ⛔ Every one pinned the day to UTC, which is **02:59:59 EAT the following morning**.
 * A poll proposed "for the 15th" resolved three hours into the 16th, with betting open
 * through those hours. Same family as E-144 approached from the other end: that one
 * converted an officer's typed wall clock, this interprets a bare date.
 *
 * ⭐ WHY THE STRUCTURAL HALF MATTERS MORE THAN THE ARITHMETIC HALF. The maths below is
 * three assertions; the real risk is the SIXTH copy. This concept was written five
 * times because writing it inline is easier than finding the helper, and nothing
 * stopped it. §3 fails the file if the literal returns.
 *
 * Run: npm run test:proposal-day
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { readFileSync } from "node:fs";
import { endOfProposalDayIso, endOfProposalDayMs } from "../src/lib/server/proposals-service.ts";
import { getPlatformTimezone } from "../src/lib/server/platform-config.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

console.log(`platform timezone under test: ${getPlatformTimezone()}\n`);

// ── 1 · The boundary ─────────────────────────────────────────────────────────
// On EAT (the default, and production's value) the 15th ends at 20:59:59Z, NOT
// 23:59:59Z. Those three hours are the whole defect.
{
  const iso = endOfProposalDayIso("2026-08-15");
  ok("1: the proposed day ends on the platform clock", iso === "2026-08-15T20:59:59.000Z", String(iso));
  ok("1: and NOT at 23:59:59 UTC — the three hours that were the defect",
     iso !== "2026-08-15T23:59:59.000Z");

  // ⭐ Stated as the property rather than a literal, so this still means something if
  // an admin changes the platform timezone: whatever the zone, the instant must render
  // back as 23:59 on that zone's clock, on the date that was proposed.
  const back = new Date(iso!).toLocaleString("en-GB", {
    timeZone: getPlatformTimezone(), year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  ok("1: it reads back as 23:59 on the proposed date, in the platform zone",
     back.includes("15/08/2026") && back.includes("23:59"), back);
}

// ── 2 · Shape ────────────────────────────────────────────────────────────────
ok("2: a malformed date is null, not a silent Invalid Date", endOfProposalDayIso("not-a-date") === null);
ok("2: …and NaN in ms form, so `<= Date.now()` gates refuse it",
   Number.isNaN(endOfProposalDayMs("not-a-date")));
ok("2: an empty string is null", endOfProposalDayIso("") === null);
// The validation gates all read `Number.isFinite(ts)`; NaN must therefore be the
// failure signal, and NaN <= Date.now() is false, so a bad date can never pass as
// "in the future" either. Both halves asserted because either alone is not enough.
ok("2: NaN cannot masquerade as a future date", !(endOfProposalDayMs("bogus") > Date.now()));

// ── 3 · STRUCTURAL — the sixth copy must not appear ──────────────────────────
// This is the half that actually holds. Rule 5b: assert the call site, not the symbol.
{
  const FILES = [
    "src/lib/server/proposals-service.ts",
    "src/app/proposals/new/create-form.tsx",
  ];
  for (const rel of FILES) {
    const src = decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8"));
    // Any `T23:59:59` pinned to Z, in code rather than prose.
    ok(`3: ${rel} pins no day boundary to UTC`,
       !/T23:59:59(\.\d+)?Z/.test(src),
       "a hardcoded UTC day-end is back — route it through endOfProposalDayIso instead");
  }

  // ⛔ AND THE MONEY LINES SPECIFICALLY, by name. The file could be free of the literal
  // while the two lines that build the market still used something else wrong — the
  // structural check above is necessary and not sufficient.
  const svc = decomment(readFileSync(new URL("../src/lib/server/proposals-service.ts", import.meta.url), "utf8"));
  ok("3: the published market's resolutionAt comes from endOfProposalDayIso",
     /resolutionAt\s*=\s*endOfProposalDayIso\(\s*p\.resolutionDate\s*\)/.test(svc));
  ok("3: and so does selectionClosedAt",
     /endOfProposalDayIso\(\s*p\.selectionCloseDate\s*\)/.test(svc));

  // The helper itself must take the zone from config, never a literal.
  ok("3: the helper reads the ADMIN-CONFIGURED zone, not a hardcoded one",
     /wallClockToUtcIso\(\s*`\$\{date\}T23:59:59`\s*,\s*getPlatformTimezone\(\)\s*\)/.test(svc));
  ok("3: and names no zone of its own",
     !/Africa\/Dar_es_Salaam/.test(svc));

  // The client form must apply the SAME policy, or it enables a Submit the server
  // then refuses — which is what it did for a three-hour window every night.
  const form = decomment(readFileSync(new URL("../src/app/proposals/new/create-form.tsx", import.meta.url), "utf8"));
  ok("3: the client form validates against the platform zone too",
     /wallClockToUtcIso\([\s\S]{0,60}?platformTz\s*\)/.test(form),
     "the form and the server must agree, or Submit lights up on a date the server refuses");
}

console.log(`\nproposal-day: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
