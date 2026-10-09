// R6-A · MUTATION PROOF. Plants each defect ON DISK in F:\kipindi-r6a, runs the suite that guards it (strictly one at a
// time), shows the named check goes red (FAIL line + exit 1), and restores the file byte-identical (sha-256 checked).
// Originals are also copied to S\r6a\backup\ before anything is touched. Usage: node mutation-proof.cjs [filterSubstring]
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const ROOT = "F:/kipindi-wip"; // the merged tree (2026-10-09)
const S = path.dirname(__filename);
const BACKUP = path.join(S, "backup-vis");
const OUT = path.join(S, "mutation-result-vis.txt");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const NL = "\r\n";

const A1 = "scripts/rg-email-end.test.mts";
const R6 = "scripts/visual-pass-r6a.test.mts";

/** [id, suite, file, from, to, the check(s) that must go red] */
const PLANTS = [
  // ── A1 (test:rg-email-end) ─────────────────────────────────────────────────────────────────────────────────────────
  ["A1-1 UTC day back in the letters' end", A1, "src/lib/server/email.ts",
    'en: formatEatDateTime(at, nowMs, dict.en.common.monthsShort, "en"),',
    'en: new Date(at).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }),', ["1.1", "5.5"]],
  ["A1-2 English months in the Swahili line", A1, "src/lib/server/email.ts",
    'sw: formatEatDateTime(at, nowMs, dict.sw.common.monthsShort, "sw"),',
    'sw: formatEatDateTime(at, nowMs, dict.en.common.monthsShort, "sw"),', ["1.2", "5.5"]],
  ["A1-3 a permanent exclusion dated again", A1, "src/lib/server/email.ts",
    "const end = permanent ? null : rgEndIn(untilIso, Date.now());",
    "const end = rgEndIn(untilIso, Date.now());", ["2.4", "5.7"]],
  ["A1-4 the period's own label, not the dictionary's word", A1, "src/lib/server/email.ts",
    "{ label: \"Period\", value: permanent ? dict.en.common.permanent : period },",
    "{ label: \"Period\", value: period },", ["2.4", "5.7"]],
  ["A1-5 an unreadable end printed (the guard gone)", A1, "src/lib/server/email.ts",
    "  if (!Number.isFinite(at)) return null;" + NL + "  return {" + NL + "    en: formatEatDateTime",
    "  return {" + NL + "    en: formatEatDateTime", ["3.1", "5.5"]],
  ["A1-6 the receipt's Resolves row back to the UTC day", A1, "src/lib/server/email.ts",
    '...(Number.isFinite(Date.parse(resolvesAt)) ? [{ label: "Resolves", value: fmtDateTime(resolvesAt) }] : []),',
    '{ label: "Resolves", value: resolvesAt.slice(0, 10) },', ["4.1"]],
  ["A1-7 the receipt's Resolves row unguarded", A1, "src/lib/server/email.ts",
    '...(Number.isFinite(Date.parse(resolvesAt)) ? [{ label: "Resolves", value: fmtDateTime(resolvesAt) }] : []),',
    '{ label: "Resolves", value: fmtDateTime(resolvesAt) },', ["4.3"]],
  ["A1-8 permanence read from the period's name", A1, "src/lib/server/responsible-gambling.ts",
    "const standing = selfExclusionStandingOf(until);",
    'const standing = { state: "serving" as const, permanent: period === "perm" };', ["5.2"]],
  ["A1-9 the break's letter handed a UTC day", A1, "src/lib/server/responsible-gambling.ts",
    "html: coolOffHtml({ duration: PERIOD_LABEL[period] ?? period, untilIso: until }),",
    "html: coolOffHtml({ duration: PERIOD_LABEL[period] ?? period, untilIso: until.slice(0, 10) }),", ["5.1", "5.3"]],
  ["A1-10 market-service hands the UTC day again", A1, "src/lib/server/market-service.ts",
    "marketTitle: market.titleEn, placedAt: c.placedAt, resolvesAt: market.resolutionAt,",
    "marketTitle: market.titleEn, placedAt: c.placedAt, resolvesAt: market.resolutionAt.slice(0, 10),", ["5.4"]],
  ["A1-11 the zone-less fmtDate back in the RG service", A1, "src/lib/server/responsible-gambling.ts",
    "const PERIOD_LABEL: Record<string, string> = {",
    'const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); void fmtDate;' + NL + "const PERIOD_LABEL: Record<string, string> = {", ["5.1"]],
  ["A1-12 the break's clause printed with no end", A1, "src/lib/server/email.ts",
    "paused for ${duration}${end ? `, until ${end.en}` : \"\"}.",
    "paused for ${duration}, until ${end?.en}.", ["3.1"]],
  // ── A2 / A3 / bell (test:visual-pass-r6a) ──────────────────────────────────────────────────────────────────────────
  ["R6-1 the market page's break branch switched off", R6, "src/app/markets/[id]/page.tsx",
    "            session && breakBody ? (",
    "            false && breakBody ? (", ["2.1"]],
  ["R6-2 the market page's read without its catch", R6, "src/app/markets/[id]/page.tsx",
    "        .then(breakStateOf)" + NL + "        .catch(() => null)",
    "        .then(breakStateOf)", ["2.2"]],
  ["R6-3 the notice in the warning box", R6, "src/components/rg/bet-break-notice.tsx",
    '<Callout tone="neutral" size="md" glyph="lock" role="status">',
    '<Callout tone="warning" size="md" glyph="lock" role="status">', ["1.1"]],
  ["R6-4 the notice with the break's pause glyph", R6, "src/components/rg/bet-break-notice.tsx",
    '<Callout tone="neutral" size="md" glyph="lock" role="status">',
    '<Callout tone="neutral" size="md" glyph="pause" role="status">', ["1.1"]],
  ["R6-5 the notice as a note, not a status", R6, "src/components/rg/bet-break-notice.tsx",
    '<Callout tone="neutral" size="md" glyph="lock" role="status">',
    '<Callout tone="neutral" size="md" glyph="lock" role="note">', ["1.1"]],
  ["R6-6 the notice's end not kept whole", R6, "src/components/rg/bet-break-notice.tsx",
    "{keepText(body.text, body.keep)}",
    "{body.text}", ["1.1"]],
  ["R6-7 the card's break gate switched off", R6, "src/components/updown/updown-card.tsx",
    "          canQuickBet && breakBody ? (",
    "          false && breakBody ? (", ["3.2", "3.3"]],
  ["R6-8 the board hands its cards no break", R6, "src/app/updown/page.tsx",
    "                breakBody={breakBody}",
    "                breakBody={null}", ["3.1"]],
  ["R6-9 the round panel's break gate switched off", R6, "src/components/updown/round-action-panel.tsx",
    "    if (stake.isAuthed && breakBody) {",
    "    if (false && breakBody) {", ["4.2", "4.3"]],
  ["R6-10 the round page hands its panel no break", R6, "src/app/updown/[roundId]/page.tsx",
    "                  breakBody," + NL + "                }}",
    "                }}", ["4.1"]],
  ["R6-11 Tiketi zangu's Juu/Chini door kept during a break", R6, "src/app/updown/history/page.tsx",
    'breakBody ? null : <Link href="/updown" className="btn btn-primary btn-md">{t.market.udTitle}</Link>',
    '<Link href="/updown" className="btn btn-primary btn-md">{t.market.udTitle}</Link>', ["6.1"]],
  ["R6-12 performance's invitation kept during a break", R6, "src/app/positions/performance/page.tsx",
    "body={breakBody ?? t.performance.noPerformanceBody}",
    "body={t.performance.noPerformanceBody}", ["6.2", "6.6"]],
  ["R6-13 the empty leaderboard's door kept during a break", R6, "src/app/leaderboard/page.tsx",
    'action={breakBody ? null : <Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.positions.browseMarkets}</Link>}',
    'action={<Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.positions.browseMarkets}</Link>}', ["6.3"]],
  ["R6-14 the activity page never reads the break", R6, "src/app/profile/activity/page.tsx",
    "const breakEnd = summary.empty ? breakStateFromTimers(",
    "const breakEnd = false ? breakStateFromTimers(", ["6.4"]],
  ["R6-15 the bell dates a permanent exclusion again", R6, "src/lib/server/notification-service.ts",
    "const end = permanent ? null : await breakEndIn(opts.until);",
    "const end = await breakEndIn(opts.until);", ["7.1", "7.2"]],
  ["R6-16 a new, unclassified in-place stake site", R6, "src/app/watchlist/page.tsx",
    'export const dynamic = "force-dynamic";',
    'export const dynamic = "force-dynamic";' + NL + 'export const __r6aPlant = "<SidePicker marketId={id} />";', ["5.1"]],
  ["R6-17 a side-carrying door to somewhere ungated", R6, "src/components/markets/watch-star.tsx",
    '"use client";',
    '"use client";' + NL + "export const __r6aDoor = (side: string) => `/api/quick-bet?side=${side}`;", ["5.3"]],
  ["R6-19 the one-sided note dropped from the break arm (test:one-sided 8.5's re-pin)", "scripts/one-sided.test.mts", "src/app/markets/[id]/page.tsx",
    '              <h2 id={BET_PANEL_HEADING} className="sr-only">{t.market.placeYourStake}</h2>' + NL + "              {oneSidedCallout}" + NL + "              <BetBreakNotice",
    '              <h2 id={BET_PANEL_HEADING} className="sr-only">{t.market.placeYourStake}</h2>' + NL + "              <BetBreakNotice", ["8.5"]],
  ["R6-18 a first-bet invitation drawn outside any gate", R6, "src/app/watchlist/page.tsx",
    'export const dynamic = "force-dynamic";',
    'export const dynamic = "force-dynamic";' + NL + "export const __r6aInvite = (t: { leaderboard: { emptyBody: string } }) => t.leaderboard.emptyBody;", ["6.6"]],
];

const filter = process.argv[2] ?? "";
fs.mkdirSync(BACKUP, { recursive: true });
const lines = [`R6-A mutation proof · ${new Date().toISOString()} · ${ROOT}`];
let caught = 0, total = 0, restored = 0;
for (const [id, suite, rel, from, to, checks] of PLANTS) {
  if (filter && !id.includes(filter)) continue;
  total++;
  const file = path.join(ROOT, rel);
  const orig = fs.readFileSync(file);
  const origSha = sha(orig);
  const bk = path.join(BACKUP, rel.replace(/[\\/[\]]/g, "_"));
  if (!fs.existsSync(bk)) fs.writeFileSync(bk, orig);
  const text = orig.toString("utf8");
  const n = text.split(from).length - 1;
  if (n !== 1) { lines.push(`${id} :: ANCHOR FOUND ${n}x in ${rel} — NOT RUN`); console.log(lines[lines.length - 1]); continue; }
  let verdict = "";
  try {
    fs.writeFileSync(file, text.replace(from, () => to));
    const r = spawnSync("npx", ["tsx", suite], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
    const red = checks.filter((c) => new RegExp(`^  FAIL ${c.replace(/\./g, "\\.")}[ ′″]`, "m").test(out));
    const ok = r.status === 1 && red.length > 0;
    if (ok) caught++;
    const failed = [...out.matchAll(/^  FAIL ([0-9.′″]+)/gm)].map((m) => m[1]);
    verdict = `${ok ? "CAUGHT" : "MISSED"} exit=${r.status} named=[${checks.join(",")}] red-named=[${red.join(",")}] all-red=[${failed.join(",")}]`;
  } finally {
    fs.writeFileSync(file, orig);
    const back = sha(fs.readFileSync(file));
    if (back === origSha) restored++;
    verdict += ` restored=${back === origSha ? "byte-identical" : "MISMATCH"} sha=${back.slice(0, 12)}`;
  }
  lines.push(`${id} :: ${rel} :: ${verdict}`);
  console.log(lines[lines.length - 1]);
}
lines.push(`TOTAL ${total} planted, ${caught} caught on their named check, ${restored} restored byte-identical`);
console.log(lines[lines.length - 1]);
fs.writeFileSync(OUT + (filter ? `.${filter.replace(/[^\w-]/g, "_")}` : ""), lines.join("\n") + "\n");
process.exit(caught === total && restored === total ? 0 : 1);
