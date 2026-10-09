// Review A · t2: the RG confirmation emails' end date vs the bell notice's, for the same break.
// Run with TZ=UTC (Railway's default; nothing in the repo sets TZ). Read-only: builds HTML strings, sends nothing.
import { formatBreakEnd } from "file:///F:/kipindi-rev/src/lib/break-end.ts";
import { dict } from "file:///F:/kipindi-rev/src/lib/i18n-dict.ts";

const E = await import("file:///F:/kipindi-rev/src/lib/server/email.ts");
// responsible-gambling.ts:38-39, verbatim (not exported):
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

console.log("process TZ =", Intl.DateTimeFormat().resolvedOptions().timeZone);
const cases = [
  { label: "24h break taken 9 Oct 01:30 EAT", takenAt: "2026-10-08T22:30:00.000Z", secs: 24 * 3600 },
  { label: "1h break taken 9 Oct 14:00 EAT", takenAt: "2026-10-09T11:00:00.000Z", secs: 3600 },
  { label: "24h exclusion taken 9 Oct 02:10 EAT", takenAt: "2026-10-08T23:10:00.000Z", secs: 24 * 3600 },
  // PERMANENT: responsible-gambling.ts stores perm as now + 100*365 days; PERIOD_LABEL.perm = "permanent".
  { label: "PERMANENT exclusion taken 9 Oct 14:00 EAT", takenAt: "2026-10-09T11:00:00.000Z", secs: 100 * 365 * 24 * 3600, period: "permanent" },
];
for (const c of cases) {
  const until = new Date(Date.parse(c.takenAt) + c.secs * 1000).toISOString();
  const now = Date.parse(c.takenAt);
  console.log(`\n== ${c.label} · until (UTC instant) ${until}`);
  const bellSw = formatBreakEnd(Date.parse(until), now, dict.sw.common.monthsShort, "sw");
  const bellEn = formatBreakEnd(Date.parse(until), now, dict.en.common.monthsShort, "en");
  console.log(`bell (notifyCoolOff/notifySelfExclusion) sw: hadi ${bellSw} | en: until ${bellEn}`);
  if (c.label.includes("exclusion")) {
    const html = E.selfExclusionHtml({ period: (c as { period?: string }).period ?? "24 hours", endDate: fmtDate(until) });
    const t = text(html);
    console.log("email selfExclusionHtml:", t.slice(t.indexOf("You've"), t.indexOf("Period") > 0 ? t.indexOf("Period") : undefined));
  } else {
    const html = E.coolOffHtml({ duration: c.secs === 3600 ? "1 hour" : "24 hours", endDate: fmtDate(until), untilIso: new Date(until).toISOString() });
    const t = text(html);
    console.log("email coolOffHtml:", t.slice(t.indexOf("Betting"), t.indexOf("Duration") > 0 ? t.indexOf("Duration") : undefined));
  }
}
