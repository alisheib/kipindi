// R6-A · re-shape the builder calls in five scripts (exact, counted replacements; CRLF kept).
const fs = require("node:fs");
const R = "F:/kipindi-r6a/";
const edits = [
  ["scripts/comms-email-shots.mts", 'resolutionDate: "30 Sep 2026"', 'resolvesAt: "2026-09-30T09:00:00.000Z"'],
  ["scripts/comms-email-shots.mts", 'E.selfExclusionHtml({ period: "6 months", endDate: "31 January 2027" })', 'E.selfExclusionHtml({ period: "6 months", untilIso: "2027-01-31T09:00:00.000Z" })'],
  ["scripts/comms-email-shots.mts", 'E.coolOffHtml({ duration: "24 hours", endDate: "01 August 2026" })', 'E.coolOffHtml({ duration: "24 hours", untilIso: "2026-08-01T09:00:00.000Z" })'],
  ["scripts/email-preview.mts", 'resolutionDate: "2026-06-20"', 'resolvesAt: "2026-06-20T18:00:00.000Z"'],
  ["scripts/email-stress.test.mts", 'resolutionDate: "not-a-date"', 'resolvesAt: "not-a-date"'],
  ["scripts/email-stress.test.mts", 'resolutionDate: "2026-12-31"', 'resolvesAt: "2026-12-31T09:00:00.000Z"'],
  ["scripts/poll-lifecycle-e2e.test.mts", 'resolutionDate: ahead(180)', 'resolvesAt: ahead(180)'],
];
for (const [f, from, to] of edits) {
  const p = R + f;
  const s = fs.readFileSync(p, "utf8");
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log("SKIP (count " + n + ")", f, from); continue; }
  fs.writeFileSync(p, s.replace(from, () => to));
  console.log("ok", f, "::", from, "->", to);
}
