// R6-A · A1 measurement — the RG confirmation emails' end, built exactly as responsible-gambling.ts builds them, against
// the bell's end for the same break. Run with TZ=UTC from F:\kipindi-r6a (Railway's zone; nothing in the repo sets TZ).
// Read-only: builds HTML strings, sends nothing. Works on the tree BEFORE and AFTER the fix (it detects the signature).
import { formatBreakEnd } from "file:///F:/kipindi-r6a/src/lib/break-end.ts";
import { dict } from "file:///F:/kipindi-r6a/src/lib/i18n-dict.ts";

const E = await import("file:///F:/kipindi-r6a/src/lib/server/email.ts");
const RG = await import("file:///F:/kipindi-r6a/src/lib/server/responsible-gambling.ts").catch((e) => { console.log("(RG import failed:", String(e).slice(0, 120), ")"); return null; });

const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
// responsible-gambling.ts:38-39 BEFORE the fix, verbatim (not exported):
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const newSignature = /untilIso/.test(String(E.selfExclusionHtml)) && !/endDate/.test(String(E.selfExclusionHtml));

console.log("process TZ =", Intl.DateTimeFormat().resolvedOptions().timeZone, "| builders take the instant:", newSignature);
const cases = [
  { label: "24h break taken 9 Oct 01:30 EAT", takenAt: "2026-10-08T22:30:00.000Z", secs: 24 * 3600, kind: "break", period: "24 hours" },
  { label: "1h break taken 9 Oct 14:00 EAT", takenAt: "2026-10-09T11:00:00.000Z", secs: 3600, kind: "break", period: "1 hour" },
  { label: "24h exclusion taken 9 Oct 02:10 EAT", takenAt: "2026-10-08T23:10:00.000Z", secs: 24 * 3600, kind: "exclusion", period: "24 hours" },
  { label: "6m exclusion taken 9 Oct 14:00 EAT (ends next year)", takenAt: "2026-10-09T11:00:00.000Z", secs: 182 * 24 * 3600, kind: "exclusion", period: "6 months" },
  { label: "PERMANENT exclusion taken 9 Oct 14:00 EAT", takenAt: "2026-10-09T11:00:00.000Z", secs: 100 * 365 * 24 * 3600, kind: "exclusion", period: "permanent" },
];
for (const c of cases) {
  const until = new Date(Date.parse(c.takenAt) + c.secs * 1000).toISOString();
  const now = Date.parse(c.takenAt);
  console.log(`\n== ${c.label} · until (UTC instant) ${until}`);
  console.log(`   bell: sw "hadi ${formatBreakEnd(Date.parse(until), now, dict.sw.common.monthsShort, "sw")}" | en "until ${formatBreakEnd(Date.parse(until), now, dict.en.common.monthsShort, "en")}"`);
  let html: string;
  if (c.kind === "exclusion") {
    const permanent = RG ? (() => { const s = RG.selfExclusionStandingOf(until, now); return s.state === "serving" && s.permanent; })() : c.period === "permanent";
    html = newSignature
      ? E.selfExclusionHtml({ period: c.period, untilIso: until, permanent } as never)
      : E.selfExclusionHtml({ period: c.period, endDate: fmtDate(until) } as never);
  } else {
    html = newSignature
      ? E.coolOffHtml({ duration: c.period, untilIso: until } as never)
      : E.coolOffHtml({ duration: c.period, endDate: fmtDate(until), untilIso: new Date(until).toISOString() } as never);
  }
  const t = text(html);
  const from = t.search(/You've|Betting and/);
  const to = t.indexOf("18+");
  console.log("   email:", t.slice(from, to > from ? to : undefined).replace(/\s*\|\s*/g, " | "));
}

// The sibling: betPlacedHtml's "Resolves" row for a market resolving 10 Oct 01:00 EAT (= 9 Oct 22:00 UTC).
const resolutionAt = "2026-10-09T22:00:00.000Z";
const betArgs = { reference: "pos_a1", side: "YES" as const, stake: 10_000, marketTitle: "T", placedAt: "2026-10-09T09:00:00.000Z", cashOutFeeRate: 0.1, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 };
const betNew = /resolvesAt/.test(String(E.betPlacedHtml));
const bet = text(betNew
  ? E.betPlacedHtml({ ...betArgs, resolvesAt: resolutionAt } as never)
  : E.betPlacedHtml({ ...betArgs, resolutionDate: resolutionAt.slice(0, 10) } as never));
console.log(`\n== betPlacedHtml, market resolving ${resolutionAt} (10 Oct 01:00 EAT):`, bet.slice(bet.indexOf("Placed"), bet.indexOf("Your payout")));
