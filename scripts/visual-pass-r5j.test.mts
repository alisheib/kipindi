/**
 * ROUND 5 OF THE VISUAL PASS, FOLLOW-UP HELPER J (2026-10-09) — one way to count, one figure matcher: every fix held beside a
 * control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r5j.test.mts        (npm run test:visual-pass-r5j)
 *
 * The owner's rules (Ali): only perfect visual and logical results (2026-10-08); consistency and perfection in each move — a
 * finding is fixed with every sibling it has (2026-10-09).
 *   §0 the premise: the platform's one grouping (`formatNumber`) is the reader's in all three languages; a runtime-locale
 *      formatter is not (a German phone's "12.479")
 *   §1 G-4 · ONE WAY TO COUNT — the census: every count a player's page prints (a JSX child, a `{n}` slot, a template span,
 *      `toLocaleString`, `Intl.NumberFormat`, `String(count)`) goes through `formatNumber`, or is a classified exception with
 *      its reason; no exception is stale; each shape planted is found
 *   §2 G-4 · the counts drawn: a filter pill, the pager, a bar's phrase and pills at production's 12,479, rendered as a German
 *      phone runs them (a runtime-locale formatter shows "12.479" there); the Up & Down card; the share card; the deposit
 *      bounds beside the withdraw bounds
 *   §3 G-6 · ONE FIGURE MATCHER — the result modal reads every figure with `moneyRuns` (fill-nodes.tsx): its title, a subtitle
 *      given as words and its footnote, for every result; rendered on the sentences the private matcher got wrong, beside
 *      that matcher as the control
 *   §4 G-6 · the census of private figure readers: every regular expression in player-visible code that reads a currency or a
 *      thousands group is the shared reader's or classified; the share card's private grouping gone
 *   §5 G-6 · the empty slots: no typed no-break space; one CSS rule draws the line (`.kp-keep-line:empty::before`)
 *   §6 what classic viewers keep: the classic bell's bare count (frozen chrome) and the capped badge
 * Where an older suite owns a pin this work moved, the pin moved there, with its reason: `test:sell-grace-truth` §6 (the
 * result's figure reader and its plants), `test:visual-pass-r4d` 7.3b (the win-rate hint's count), `test:visual-pass-r5e` 6.5
 * and 6.5′ (the four slots left the excused list), `test:eyebrow-roles` (two signatures).
 * ⛔ It READS, parses and renders in memory; it writes nothing. The on-disk mutation proof is S/r5j/mutation-r5j.mjs.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { posix } from "node:path";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import ts from "typescript";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { playerRenderedFiles } from "./lib/player-surface-text.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const j = (v: unknown) => JSON.stringify(v);
const NBSP = String.fromCharCode(0xa0);
const walk = (d: string, out: string[] = []): string[] => {
  for (const n of readdirSync(d)) { const p = posix.join(d, n); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); }
  return out;
};

/* ── the renderer: React's server renderer inside the root layout's providers (r5h's harness) ───────────────────────── */
type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
// The dialog's chrome is a portal, which the server renderer cannot draw: a stand-in draws the panel in place, every other
// export of the module (the ✕, the exit beat) its own — so the result's own markup renders as the browser receives it.
{
  const at = req.resolve("../src/components/ui/modal.tsx");
  const real = req(at) as Record<string, unknown>;
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  const Inline = (p: { open: boolean; children?: unknown; ariaLabel?: string; describedBy?: string; role?: string }) =>
    p.open ? h("div", { role: p.role ?? "dialog", "aria-label": p.ariaLabel, "aria-describedby": p.describedBy }, p.children as never) : null;
  stub.exports = { ...real, Modal: Inline };
  (req.cache as Record<string, unknown>)[at] = stub;
}
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, Record<string, Record<string, string>>> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l } as never, el as never))));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const amountsIn = (m: string) => [...m.matchAll(/<span class="amount">([^<]*)<\/span>/g)].map((x) => x[1]);

const { formatNumber } = req("../src/lib/utils.ts") as { formatNumber: (n: number) => string };
const { moneyRuns } = req("../src/lib/fill-nodes.tsx") as { moneyRuns: (s: string) => unknown[] };
const { keepText } = req("../src/components/ui/keep-run.tsx") as { keepText: (s: string, runs?: string[]) => unknown };

/* ══ §0 · THE PREMISE ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("0 · the premise: one fixed grouping is the reader's in all three languages; a runtime locale's is not");
{
  const N = [12479, 1234567, 999, 1000];
  ok("0.1 CONTROL · `formatNumber` groups a count as \"12,479\" and leaves \"999\" bare",
    formatNumber(12479) === "12,479" && formatNumber(1234567) === "1,234,567" && formatNumber(999) === "999" && formatNumber(1000) === "1,000");
  ok("0.2 CONTROL · Swahili, English and Chinese all group as `formatNumber` does — so the one fixed grouping IS the reader's",
    LOCALES.every((l) => N.every((n) => new Intl.NumberFormat(l).format(n) === formatNumber(n))),
    j(LOCALES.map((l) => new Intl.NumberFormat(l).format(12479))));
  ok("0.3 CONTROL · …and a runtime's own locale need not: a German phone groups \"12.479\", a French one with a narrow no-break space — what `toLocaleString()` and `new Intl.NumberFormat()` printed after hydration on a server-rendered client card",
    new Intl.NumberFormat("de-DE").format(12479) === "12.479" && new Intl.NumberFormat("fr-FR").format(12479) === `12${String.fromCharCode(0x202f)}479`);
  ok("0.4 CONTROL · a bare count is ungrouped — production's /results lens read \"Zote 12479\"", String(12479) === "12479");
}

/* ══ §1 · G-4 · THE COUNT CENSUS ═══════════════════════════════════════════════════════════════════════════════════════ */
section("1 · G-4 · one way to count: every count a player's page prints goes through `formatNumber`");
/** A name that holds a count: a length or a size, or a counting word as a camelCase SEGMENT of the identifier ("openCount",
 *  "counts", "recruitCount" — never "Account" or "discount"). */
const COUNTY = new RegExp(
  "(?:\\.length|\\.size)\\b"
  + "|(?:(?:^|[^A-Za-z])(?:count|total|unread|streak|remaining|settlements|players|predictors|recruits|votes)"
  + "|[a-z0-9](?:Count|Total|Unread|Streak|Remaining|Settlements|Players|Predictors|Recruits|Votes))s?(?![a-z])"
  + "|(?:^|[^A-Za-z.])(?:wins|losses|voids|cashOuts|resolved|score)\\b"
  // the counts this codebase names without a counting word (the card's comment count, the home's "closing today", /live's
  // tipping markets, the agent form's attached documents)
  + "|(?:^|[^A-Za-z])(?:comments|closingToday|tippingMarkets|attached)(?![A-Za-z])",
);
/** A dictionary word (`t.proposals.votesCount` is "kura"), never a number. */
const WORDS = /^(?:t|dict|T|copy|words|labels)\./;
const FORMATTED = /^formatNumber\(|^formatTzs|^formatCompactNumber\(|^formatTzsCompact\(/;
/** A local name that IS the convention in its one file (each checked in 1.5): the away bar's `n`, the bell's `countText`. */
const ALIAS: Record<string, RegExp> = {
  "src/components/layout/away-summary-bar.tsx": /^n\(/,
  "src/components/layout/notifications-panel.tsx": /^countText\(/,
};
/** Every place `code` prints a count without the convention, as "kind :: expression". */
function censusOf(file: string, src: string): string[] {
  const out: string[] = [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const alias = ALIAS[file];
  const formatted = (t: string) => FORMATTED.test(t) || (alias !== undefined && alias.test(t));
  const say = (kind: string, e: ts.Node) => out.push(`${kind} :: ${squash(e.getText(sf))}`);
  const visit = (n: ts.Node) => {
    if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const e = n.expression;
      const simple = ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)
        || (ts.isBinaryExpression(e) && /^[+\-*/]$/.test(e.operatorToken.getText(sf))) || ts.isParenthesizedExpression(e);
      const t = e.getText(sf);
      if (simple && COUNTY.test(t) && !formatted(t) && !WORDS.test(t)) say("jsx", e);
    }
    if (ts.isTemplateSpan(n)) {
      const t = n.expression.getText(sf);
      if (COUNTY.test(t) && !formatted(t) && !t.includes("?") && !WORDS.test(t)) say("template", n.expression);
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "replace" && n.arguments.length === 2
      && ts.isStringLiteral(n.arguments[0]) && /^\{(n|total|shown|count)\}$/.test(n.arguments[0].text)) {
      const e = n.arguments[1];
      if (!formatted(e.getText(sf))) say(`slot ${n.arguments[0].text}`, e);
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^fill(Nodes)?$/.test(n.expression.text) && n.arguments[1] && ts.isObjectLiteralExpression(n.arguments[1])) {
      for (const p of n.arguments[1].properties) {
        const key = p.name?.getText(sf) ?? "";
        if (!/^(n|total|shown|count)$/.test(key)) continue;
        const e = ts.isPropertyAssignment(p) ? p.initializer : p;
        if (!formatted(e.getText(sf))) say(`slot {${key}}`, e);
      }
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "toLocaleString"
      && !/Date|date|time|Time/.test(n.expression.expression.getText(sf))) say("toLocaleString", n);
    if (ts.isNewExpression(n) && n.expression.getText(sf) === "Intl.NumberFormat") say("Intl.NumberFormat", n);
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "String" && n.arguments[0] && COUNTY.test(n.arguments[0].getText(sf))) say("String()", n);
    n.forEachChild(visit);
  };
  sf.forEachChild(visit);
  return out;
}
/** The player-visible modules outside the rendered population: the search echo's grammar, the share card, the card's close label. */
const EXTRA = ["src/lib/search/query.ts", "src/app/api/og/market/[id]/route.tsx", "src/lib/markets/card-close-label.ts"];
const POPULATION = [...playerRenderedFiles(), ...EXTRA];
const ORDINAL = "an ordinal that NAMES a place (\"Show market 3\", a step, a citation) — a position in a short list, not a quantity";
/** Every count a player can see that is LEFT bare, each with its reason. A site not here fails 1.1; a site here that is gone fails 1.2. */
const LEFT: Record<string, string> = {
  "src/app/live/featured-contest.tsx :: slot {n} :: String(i + 1)": ORDINAL,
  "src/app/results/notable-carousel.tsx :: slot {n} :: String(i + 1)": ORDINAL,
  "src/components/onboarding/first-visit-primer.tsx :: slot {n} :: String(i + 1)": ORDINAL,
  "src/components/chat/messages/Primitives.tsx :: slot {n} :: String(n)": `${ORDINAL}: a source's number, matching the [n] in the answer`,
  "src/app/updown/page.tsx :: slot {n} :: String(activeDuration)": "a duration in minutes (3–60), the time grammar's, not a count",
  "src/lib/markets/card-close-label.ts :: slot {n} :: String(label.n)": "a duration in days (the time-left grammar), in a module pure by contract (it imports only eat-day.ts; `test:client-graph-safe`) — under 1,000 for any market under 2.7 years (production's furthest: 170)",
  "src/components/onboarding/first-visit-primer.tsx :: slot {n} :: \"1\"": "the primer's demo dial labels, multipliers (\"1× chini\", \"200× juu\"), not counts",
  "src/components/onboarding/first-visit-primer.tsx :: slot {n} :: \"200\"": "the primer's demo dial labels, multipliers (\"1× chini\", \"200× juu\"), not counts",
  "src/components/onboarding/first-visit-primer.tsx :: template :: (step + 1) / CARDS.length": "a progress bar's scale (a style), not text",
  "src/components/ui/keep-words.tsx :: template :: out.length": "a React key, not text",
  "src/components/charts/pnl-chart.tsx :: jsx :: data[data.length - 1].label": "a label (words), not a count",
  "src/app/wallet/money-bar-ghost.tsx :: jsx :: count": "the loading ghost's phrase drawn transparent to its width (\"Miamala 00\"), not a count — R5-K/L's ghosts",
  "src/app/wallet/receipts/loading.tsx :: slot {n} :: \"00\"": "the loading ghost's two placeholder digits, not a count — R5-K/L's ghosts",
  "src/app/wallet/wallet-ghost.tsx :: slot {n} :: \"00\"": "the loading ghost's two placeholder digits, not a count — R5-K/L's ghosts",
  "src/components/charts/terminal-chart.tsx :: toLocaleString :: v.toLocaleString(locale, { minimumFractionDigits: decimalsRef.current, maximumFractionDigits: decimalsRef.current })": "a PRICE with its own decimals in the reader's language (explicit locale, never the runtime's) — `formatNumber` has no decimals",
  "src/components/ui/progress-bar.tsx :: toLocaleString :: value.toLocaleString()": "the operator console's progress bar (no player file imports it — 1.4), English-only by the admin convention",
  "src/components/ui/progress-bar.tsx :: toLocaleString :: safeMax.toLocaleString()": "the operator console's progress bar (no player file imports it — 1.4), English-only by the admin convention",
  "src/app/notifications/bulk-bar.tsx :: jsx :: countLabel": "a phrase its page builds with the count already grouped (`unreadN` filled by `formatNumber` — 1.6)",
  "src/components/updown/updown-card.tsx :: jsx :: playersText": "the count already grouped, memoised (`formatNumber(players)` — 2.4)",
};
{
  const found: string[] = [];
  for (const f of POPULATION) for (const x of censusOf(f, code(f))) found.push(`${f} :: ${x}`);
  // A bar's apply label takes the bar's own phrase, which already holds its count grouped (1.3 holds that phrase).
  const phraseOk = (s: string) => / :: slot \{n\} :: resultPhrase$/.test(s) && code(s.split(" :: ")[0]).includes(`.replace("{n}", formatNumber(resultCount))`);
  const unclassified = [...new Set(found)].filter((s) => !(s in LEFT) && !phraseOk(s));
  console.log(`     population: ${POPULATION.length} player-visible files; ${found.length} sites seen; ${Object.keys(LEFT).length} classified`);
  ok(`1.1 · every count a player's page prints is grouped through \`formatNumber\` — over ${POPULATION.length} player-visible files, no JSX count, no {n}/{total}/{shown} slot, no template count, no \`toLocaleString\`, no \`new Intl.NumberFormat\`, no \`String(count)\` outside the ${Object.keys(LEFT).length} classified sites`,
    POPULATION.length > 400 && unclassified.length === 0, unclassified.slice(0, 6).join(" | "));
  const stale = Object.keys(LEFT).filter((k) => !found.includes(k));
  ok("1.2 · no classified site is stale: each one is still where its reason says (a list that outlives its sites would excuse a new one)",
    stale.length === 0, stale.join(" | "));
  const BARS = ["src/app/fairness/fairness-bar.tsx", "src/app/notifications/notifications-bar.tsx", "src/app/positions/performance/performance-bar.tsx",
    "src/app/positions/positions-bar.tsx", "src/app/profile/account/account-bar.tsx", "src/app/profile/invite/recruits-bar.tsx", "src/app/proposals/proposals-bar.tsx",
    "src/app/results/results-bar.tsx", "src/app/updown/history/history-bar.tsx", "src/app/wallet/receipts/receipts-bar.tsx", "src/app/wallet/wallet-bar.tsx",
    "src/app/watchlist/watchlist-bar.tsx", "src/components/markets/discovery-bar.tsx"];
  const everyBar = POPULATION.filter((f) => code(f).includes("<QueryResultCount "));
  ok(`1.3 · every query bar (${BARS.length}, every file drawing a \`QueryResultCount\`) builds its result phrase with the count grouped — "masoko 12,479", and the sheet's apply label and its filter count from the same`,
    BARS.every((f) => code(f).includes(`.replace("{n}", formatNumber(resultCount))`)) && everyBar.length === BARS.length && everyBar.every((f) => BARS.includes(f)),
    j(everyBar.filter((f) => !BARS.includes(f))));
  const progressUsers = POPULATION.filter((f) => /from "@\/components\/ui\/progress-bar"/.test(code(f)));
  ok("1.4 · the progress bar the census excuses is the operator console's: no player-visible file imports it", progressUsers.length === 0, j(progressUsers));
  ok("1.5 · the two local names the census accepts are the convention: the away bar's `n` IS `formatNumber`, and the bell's `countText` groups the journey's count (the classic branch is §6.1)",
    code("src/components/layout/away-summary-bar.tsx").includes("const n = formatNumber;")
      && code("src/components/layout/notifications-panel.tsx").includes("const countText = (n: number) => (journey ? formatNumber(n) : String(n));"));
  ok("1.6 · the phrase the inbox's bulk bar prints is built with its count grouped: \"1,247 hazijasomwa\"",
    squash(code("src/app/notifications/page.tsx")).includes(`countLabel={counts.unread === 1 ? t.notif.unreadOne : t.notif.unreadN.replace("{n}", formatNumber(counts.unread))}`));
  // PLANTS — each shape the census reads, planted in a string, is found.
  const plant = (src: string, file = "src/app/x/page.tsx") => censusOf(file, src);
  ok("1.1′ PLANT · a bare count in JSX (/updown/history's \"2 dau\" as it shipped) is found", plant("const a = <span>{g.bets.length} {t.market.udBets}</span>;").length === 1);
  ok("1.1″ PLANT · a bar's phrase filled with `String(resultCount)` is found", plant(`const p = t.market.nResults.replace("{n}", String(resultCount));`).length === 2);
  ok("1.1‴ PLANT · a `fill` slot handed a bare count (the home's topic tile as it shipped) is found", plant("const s = fill(t.home.topicLive, { n: tp.count });").length === 1);
  ok("1.1⁗ PLANT · a template's count (/positions' win-rate hint as it shipped) is found", plant("const s = `${settled.length} ${t.market.tickerSettled}`;").length === 1);
  ok("1.1⁵ PLANT · `toLocaleString()` and a private `new Intl.NumberFormat()` (the Up & Down card's) are found",
    plant("const a = <p>{totalVotes.toLocaleString()}</p>; const f = new Intl.NumberFormat();").length === 2);
  ok("1.1⁶ PLANT · a primitive's bare `{count}` (the filter pill as it shipped) is found", plant("const a = <span>{count}</span>;", "src/components/ui/filter-pill.tsx").length === 1);
  ok("1.1⁷ CONTROL · the convention is not flagged: `formatNumber(…)` in each of those shapes",
    plant("const a = <span>{formatNumber(g.bets.length)}</span>; const p = x.replace(\"{n}\", formatNumber(resultCount)); const s = fill(y, { n: formatNumber(tp.count) }); const q = `${formatNumber(settled.length)}`;").length === 0);
}

/* ══ §2 · G-4 · THE COUNTS DRAWN ═══════════════════════════════════════════════════════════════════════════════════════ */
section("2 · G-4 · the counts drawn: a pill, the pager, a bar at production's 12,479 — on a German phone; the cards; the share card; the bounds");
/**
 * Render as a device whose locale groups otherwise would run it: a runtime default of de-DE ("12.479") for every formatter
 * that names no locale — `toLocaleString()` and `new Intl.NumberFormat()` — while a formatter that names its locale (as
 * `formatNumber` does, "en-US") is untouched. A count that depends on the runtime's locale shows it here; this process's own
 * locale groups as en-US does, so without this a runtime-locale formatter would render the same and hide.
 */
const RealNumberFormat = Intl.NumberFormat;
const realToLocale = Number.prototype.toLocaleString;
function asDevice<T>(locale: string, run: () => T): T {
  const Patched = function (this: unknown, locales?: string | string[], opts?: Intl.NumberFormatOptions) { return new RealNumberFormat(locales ?? locale, opts); } as unknown as typeof Intl.NumberFormat;
  Object.assign(Patched, RealNumberFormat);
  Patched.prototype = RealNumberFormat.prototype;
  Intl.NumberFormat = Patched;
  Number.prototype.toLocaleString = function (this: number, locales?: string | string[], opts?: Intl.NumberFormatOptions) { return new RealNumberFormat(locales ?? locale, opts).format(this); };
  try { return run(); } finally { Intl.NumberFormat = RealNumberFormat; Number.prototype.toLocaleString = realToLocale; }
}
{
  ok("2.0 CONTROL · the German phone is real: under it `(12479).toLocaleString()` and `new Intl.NumberFormat().format(12479)` print \"12.479\", and `formatNumber` still \"12,479\"",
    asDevice("de-DE", () => (12479).toLocaleString() === "12.479" && new Intl.NumberFormat().format(12479) === "12.479" && formatNumber(12479) === "12,479")
      && (12479).toLocaleString("en-US") === "12,479");
  const { FilterPill } = req("../src/components/ui/filter-pill.tsx") as { FilterPill: (p: Record<string, unknown>) => unknown };
  const pill = asDevice("de-DE", () => inApp("sw", h(FilterPill as never, { href: "/results?out=all", label: dict.sw.common.all, count: 12479, on: true, testId: "out:all" } as never)));
  ok("2.1 · a filter pill says its count grouped (\"Zote 12,479\") and still hands the probes the bare integer (`data-count=\"12479\"`)",
    textOf(pill) === `${dict.sw.common.all}12,479` && pill.includes('data-count="12479"') && !textOf(pill).includes("12479"), textOf(pill));
  const { Pagination } = req("../src/components/ui/pagination.tsx") as { Pagination: (p: Record<string, unknown>) => unknown };
  const pager = asDevice("de-DE", () => inApp("sw", h(Pagination as never, { total: 12479, page: 1040, perPage: 12, baseHref: "/results", ofLabel: dict.sw.common.of } as never)));
  const range = /<p class="font-mono[^"]*">([^<]*)<\/p>/.exec(pager)?.[1] ?? "";
  const buttons = [...pager.matchAll(/href="\/results\?page=(\d+)"[^>]*>(\d+)</g)].map((m) => [m[1], m[2]]);
  ok("2.2 · the pager's range is grouped (\"12,469–12,479 kati ya 12,479\" on the archive's last page) and each page button still names its page bare (\"1040\" — the address's `?page=1040`)",
    range === `12,469–12,479 ${dict.sw.common.of} 12,479` && buttons.length > 0 && buttons.every(([a, b]) => a === b) && buttons.some(([, b]) => b === "1040"),
    j({ range, buttons }));
  const { ResultsBar } = req("../src/app/results/results-bar.tsx") as { ResultsBar: (p: Record<string, unknown>) => unknown };
  const { ARCHIVE_DEFAULT_STATE } = req("../src/lib/results/archive.ts") as { ARCHIVE_DEFAULT_STATE: Record<string, unknown> };
  const zero = (ids: readonly string[]) => Object.fromEntries(ids.map((x) => [x, 0]));
  const counts = { out: { all: 12479, yes: 6912, no: 5023, void: 544 }, product: { all: 12479, MARKET: 9000, UPDOWN: 3479 }, cat: { all: 12479 }, when: { ...zero(["today", "yesterday", "7d", "30d"]), all: 12479 } };
  for (const l of LOCALES) {
    const bar = asDevice("de-DE", () => inApp(l, h(ResultsBar as never, { state: ARCHIVE_DEFAULT_STATE, counts, resultCount: 12479, t: dict[l] } as never)));
    const phrase = dict[l].market.nResults.replace("{n}", "12,479");
    const pills = [...bar.matchAll(/data-count="(\d+)"[^>]*>(?:(?!<\/a>).)*?<span class="font-mono[^"]*">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]);
    ok(`2.3 · ${l} · /results' bar at production's 12,479: the result line "${phrase}" (its \`data-result-count\` the bare integer), every pill's count grouped as its \`data-count\` reads ("6,912", "5,023")`,
      bar.includes(`data-result-count="12479"`) && textOf(bar).includes(phrase) && pills.length >= 6 && pills.every(([d, s]) => s === formatNumber(Number(d)))
        && !/>12479</.test(bar), j({ phrase, pills: pills.slice(0, 4) }));
  }
  const ud = code("src/components/updown/updown-card.tsx");
  ok("2.4 · the Up & Down card's player count is grouped as the round page's is (`formatNumber`): its private device-locale formatter is gone, so its first paint and its hydration agree",
    ud.includes("const playersText = useMemo(() => formatNumber(players), [players]);") && !ud.includes("new Intl.NumberFormat(") && !ud.includes("toLocaleString(")
      && code("src/app/updown/[roundId]/page.tsx").includes("{formatNumber(round.players)}"));
  const og = code("src/app/api/og/market/[id]/route.tsx");
  ok("2.5 · the share card's count reads as every count does — grouped, and the dictionary's one/many pair (\"1 predictor\", where it read \"1 predictors\")",
    og.includes("{formatNumber(m.predictorCount)} {m.predictorCount === 1 ? dict.en.market.predictorsCountOne : dict.en.market.predictorsCount}")
      && dict.en.market.predictorsCount === "predictors" && dict.en.market.predictorsCountOne === "predictor");
  const dep = code("src/app/wallet/deposit/actions.ts");
  ok("2.6 · the deposit refusal fills its bounds as the withdraw refusal does (`formatNumber`), one spelling for one grouping",
    dep.includes(`.replace("{min}", formatNumber(DEPOSIT_MIN_TZS))`) && dep.includes(`.replace("{max}", formatNumber(DEPOSIT_MAX_TZS))`) && !dep.includes("toLocaleString(")
      && code("src/app/wallet/withdraw/actions.ts").includes("{ min: formatNumber(withdrawMin), max: formatNumber(WITHDRAW_MAX_TZS) }"));
  const lb = code("src/app/leaderboard/page.tsx");
  ok("2.7 · the siblings R5-A's count line left: the leaderboard table's resolved column and its hot streak (the podium already grouped), /proposals' tally, the market page's predictor tile, /results' donut legend",
    lb.includes(">{formatNumber(r.resolved)}</td>") && lb.includes("{formatNumber(streak)} {streak > 1 ? t.leaderboard.winsLabel : t.leaderboard.winLabel}")
      && code("src/app/proposals/page.tsx").includes("{formatNumber(totalProposals)} {t.proposals.proposalsCount} · {formatNumber(totalVotes)} {t.proposals.votesCount}")
      && code("src/app/markets/[id]/page.tsx").includes("value={formatNumber(m.predictorCount)}")
      && code("src/app/results/page.tsx").includes(`{sideWord(t, "YES", line)} {formatNumber(winsIn(line, "YES"))}`));
}

/* ══ §3 · G-6 · ONE FIGURE MATCHER: THE RESULT ══════════════════════════════════════════════════════════════════════════ */
section("3 · G-6 · the result reads every figure with the one reader (`moneyRuns`), for every result");
/** The private matcher the result had (S6 A8f), as it shipped — the control for every sentence below. */
const OLD_FIGURE = new RegExp(`(${String.fromCharCode(0x2212)}?TZS ${String.fromCharCode(0x2212)}?[0-9][0-9,]*)`);
const oldAmounts = (s: string) => s.split(OLD_FIGURE).filter((_, i) => i % 2 === 1);
{
  const orm = code("src/components/markets/operation-result-modal.tsx");
  ok("3.1 · the result imports the platform's reader and draws its title, a subtitle given as words and its footnote through it — no matcher of its own, no opt-in prop anywhere",
    orm.includes(`import { moneyRuns } from "@/lib/fill-nodes";`) && orm.includes("{moneyRuns(title)}")
      && orm.includes(`{typeof subtitle === "string" ? moneyRuns(subtitle) : subtitle}`) && orm.includes("{moneyRuns(footnote)}")
      && !/const FIGURE\b|withWholeFigures|\.split\(/.test(orm) && POPULATION.every((f) => !/\bwholeFigures\b/.test(code(f))));
  const { OperationResultModal } = req("../src/components/markets/operation-result-modal.tsx") as { OperationResultModal: (p: Record<string, unknown>) => unknown };
  const render = (p: Record<string, unknown>) => inApp("sw", h(OperationResultModal as never, { open: true, variant: "danger", onClose() {}, ...p } as never));
  const titleOf = (m: string) => /<h2[^>]*>(.*?)<\/h2>/.exec(m)?.[1] ?? "";
  const CASES: Array<[string, string, string[]]> = [
    ["the bet receipt's stake (the dial's success title)", `${dict.sw.common.yes} · TZS 1,000`, ["TZS 1,000"]],
    ["a sentence's comma after a figure stays the sentence's", "Kiwango cha juu ni TZS 5,000,000, kisha jaribu tena", ["TZS 5,000,000"]],
    ["a compact figure", "Bwawa ni TZS 1.2M sasa", ["TZS 1.2M"]],
    ["a decimal figure", "Ada ni TZS 2.5 tu", ["TZS 2.5"]],
    ["the dictionary's no-break space", `Salio lako ni TZS${NBSP}500`, [`TZS${NBSP}500`]],
    ["a signed figure, the sign before the code", "Faida +TZS 1,234 leo", ["+TZS 1,234"]],
    ["a minus after the code", "Salio TZS \u22124,200", ["TZS \u22124,200"]],
  ];
  for (const [name, title, want] of CASES) {
    const m = render({ title });
    ok(`3.2 · the title: ${name} — "${title}" draws ${j(want)} as amounts, its words the caller's character for character`,
      j(amountsIn(titleOf(m))) === j(want) && textOf(titleOf(m)) === title, j({ got: amountsIn(titleOf(m)) }));
  }
  const ctl = CASES.slice(1, 6).map(([, title, want]) => j(oldAmounts(title)) !== j(want));
  ok("3.2′ CONTROL · the private matcher got each of those wrong: the comma taken (\"TZS 5,000,000,\"), \"TZS 1\" without \".2M\", \"TZS 2\" without \".5\", the no-break space missed, \"+\" left outside",
    ctl.every(Boolean) && j(oldAmounts("Kiwango cha juu ni TZS 5,000,000, kisha")) === j(["TZS 5,000,000,"]) && j(oldAmounts("Bwawa ni TZS 1.2M")) === j(["TZS 1"])
      && oldAmounts(`Salio TZS${NBSP}500`).length === 0 && j(oldAmounts("+TZS 1,234")) === j(["TZS 1,234"]), j(CASES.slice(1, 6).map(([, t]) => oldAmounts(t))));
  const sub = render({ title: "Haikuwekwa dau", subtitle: "Salio lako ni TZS 500 — dau hili linahitaji TZS 1,000.", footnote: "Ada ya TZS 15 imekatwa." });
  ok("3.3 · a refusal's subtitle given as words and the footnote read their figures too (the toast beside it already does): \"TZS 500\", \"TZS 1,000\", \"TZS 15\"",
    j(amountsIn(sub)) === j(["TZS 500", "TZS 1,000", "TZS 15"]), j(amountsIn(sub)));
  const kept = render({ title: "Haikuwekwa dau", subtitle: keepText("Salio lako ni TZS 500 — dau hili linahitaji TZS 1,000.") });
  ok("3.3′ · a subtitle handed in as nodes (a kept sentence) is drawn as given — the modal adds nothing to a caller's nodes",
    amountsIn(kept).length === 0 && textOf(kept).includes("Salio lako ni TZS 500"));
  const plain = render({ title: "Ombi limepokelewa", variant: "success" });
  ok("3.4 CONTROL · a title with no figure renders as plain text, as before (no element added)", titleOf(plain) === "Ombi limepokelewa", titleOf(plain));
  const { SellResultModal } = req("../src/components/markets/sell-result.tsx") as { SellResultModal: (p: Record<string, unknown>) => unknown };
  const sale = inApp("sw", h(SellResultModal as never, { open: true, resultData: { variant: "success", value: 9000, net: 0 }, positionId: "pos_1", journey: true, onClose() {} } as never));
  ok("3.5 · the sale's result asks for nothing and its figure is still one amount: \"TZS 9,000 imerudishwa\" (S6 A8f's outcome, now every result's)",
    amountsIn(titleOf(sale)).join() === "TZS 9,000" && !code("src/components/markets/sell-result.tsx").includes("wholeFigures"), titleOf(sale));
  const dial = code("src/components/markets/conviction-dial.tsx");
  ok("3.6 · the bet receipt's title is the one the reader now dresses: the dial still hands \"NDIO · TZS 1,000\" as words",
    dial.includes('title={resultData.variant === "success" ? `${sideWord(t, resultData.side, "MARKET")} · ${formatTzs(resultData.stake)}`'));
}

/* ══ §4 · G-6 · PRIVATE FIGURE READERS ══════════════════════════════════════════════════════════════════════════════════ */
section("4 · G-6 · every regular expression that reads a currency or a thousands group is the shared reader's or classified");
{
  const READS_FIGURE = /TZS|,\\d\{3\}|\(\\d\{3\}\)\+|\[0-9\]\[0-9,\]/;
  const SHARED: Record<string, string> = {
    "src/lib/fill-nodes.tsx": "THE reader of money in a finished sentence (`MONEY_RUN`, `moneyRuns`)",
    "src/components/ui/keep-words.tsx": "THE reader of a title's figures (`FIGURE`, its currency head `CURRENCY`)",
  };
  const CLASSIFIED: Record<string, string> = {
    "src/lib/markets/short-title.ts": "compares the NUMBERS a translation keeps, as a set (the operator's short-title form) — never reads a figure for display",
    "src/lib/house-bot/rules.ts": "the operator console's house-bot rules (admin)",
    "src/lib/contacts/vcard.ts": "the operator's contacts importer (admin)",
    "src/lib/contacts/xlsx-limits.ts": "the operator's contacts importer (admin)",
  };
  const pool = walk("src").filter((f) => /\.(tsx?|m?js)$/.test(f) && !/^src\/(?:app|components)\/admin\//.test(f) && !f.startsWith("src/lib/server/") && f !== "src/lib/i18n-dict.ts"
    && (!f.startsWith("src/app/api/") || f.startsWith("src/app/api/og/")));
  const readers = new Map<string, string[]>();
  for (const f of pool) {
    const sf = ts.createSourceFile(f, raw(f), ts.ScriptTarget.Latest, true, /\.tsx$/.test(f) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isRegularExpressionLiteral(n) && READS_FIGURE.test(n.text)) readers.set(f, [...(readers.get(f) ?? []), n.text]);
      if (ts.isNewExpression(n) && n.expression.getText(sf) === "RegExp" && n.arguments?.[0] && READS_FIGURE.test(n.arguments[0].getText(sf))) readers.set(f, [...(readers.get(f) ?? []), n.arguments[0].getText(sf)]);
      n.forEachChild(visit);
    };
    sf.forEachChild(visit);
  }
  const loose = [...readers.keys()].filter((f) => !(f in SHARED) && !(f in CLASSIFIED));
  console.log(`     ${pool.length} files read; figure readers in ${readers.size}: ${[...readers.keys()].join(", ")}`);
  ok(`4.1 · over ${pool.length} player-visible files (and the share card), every regular expression reading a currency or a thousands group is the shared reader's (fill-nodes.tsx, keep-words.tsx) or classified (${Object.keys(CLASSIFIED).length}) — the result's private \`FIGURE\` and the share card's private grouping are gone`,
    pool.length > 600 && loose.length === 0 && Object.keys(SHARED).every((f) => readers.has(f)), j(loose.map((f) => [f, readers.get(f)])));
  const staleCls = Object.keys(CLASSIFIED).filter((f) => !readers.has(f));
  ok("4.2 · no classified reader is stale", staleCls.length === 0, j(staleCls));
  const og = code("src/app/api/og/market/[id]/route.tsx");
  ok("4.3 · the share card writes money with the platform's one grammar (`const tzs = formatTzs;` — built in Node, which has Intl), no grouping regex of its own",
    og.includes("const tzs = formatTzs;") && og.includes(`import { formatNumber, formatTzs } from "@/lib/utils";`) && !/\\B\(\?=/.test(og));
  const plantSf = ts.createSourceFile("x.tsx", "const FIGURE = /(TZS [0-9][0-9,]*)/;", ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let planted = 0;
  plantSf.forEachChild(function v(n: ts.Node) { if (ts.isRegularExpressionLiteral(n) && READS_FIGURE.test(n.text)) planted++; n.forEachChild(v); });
  ok("4.1′ PLANT · a private money matcher (the result's, as it shipped) is read as one", planted === 1);
}

/* ══ §5 · G-6 · THE EMPTY SLOTS ═════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · G-6 · an empty slot keeps its line with no character in the page: one rule, four slots");
{
  const css = decommentCss(raw("src/app/globals.css"));
  const rules = [...css.matchAll(/[^{}]*kp-keep-line[^{}]*\{[^}]*\}/g)].map((m) => squash(m[0]).trim());
  ok("5.1 · globals.css draws the empty slot's space once, as generated content: `.kp-keep-line:empty::before { content: \"\\00a0\"; }` — no other rule names the class",
    rules.length === 1 && rules[0] === `.kp-keep-line:empty::before { content: "\\00a0"; }`, j(rules));
  const ESC = /\\u00[aA]0|\\u2060|\\u200[bB]|\\u202[fF]|&nbsp;|&#160;|fromCharCode\((?:160|0x00?[aA]0|0x2060|8288|0x200[bB])\)|[\u00a0\u2060\u200b\u202f]/;
  const SLOTS: Array<[string, string]> = [
    ["src/components/analytics/analytics-choice.tsx", `<p className="kp-keep-line min-w-0 text-body-sm text-text" aria-live="polite">{!mounted ? null : consent`],
    ["src/components/ui/search-box.tsx", "className={`mt-1.5 min-h-[17px] text-[11px] ${invalidReason ? \"text-danger-fg\" : \"text-text-subtle\"} kp-keep-line`} >{invalidReason || described || echo || null}"],
    ["src/components/ui/time-select.tsx", "className=\"kp-keep-line mt-0.5 font-mono text-[10px] text-text-subtle tabular-nums\" aria-hidden={preview && !errored ? undefined : true} >{preview && !errored ? `= ${preview}` : null}"],
    ["src/components/home/trust-band.tsx", `<span className="kp-settled__amt kp-keep-line" aria-hidden />`],
  ];
  const tight = (s: string) => squash(s).replace(/>\s+/g, ">").replace(/\s+</g, "<");
  ok("5.2 · the four slots hold no typed no-break space (raw or escaped), each renders nothing when empty and wears `kp-keep-line`",
    SLOTS.every(([f, want]) => !ESC.test(code(f)) && tight(code(f)).includes(tight(want))), j(SLOTS.filter(([f, want]) => ESC.test(code(f)) || !tight(code(f)).includes(tight(want))).map(([f]) => f)));
  const { AnalyticsChoice } = req("../src/components/analytics/analytics-choice.tsx") as { AnalyticsChoice: () => unknown };
  const ac = inApp("sw", h(AnalyticsChoice as never));
  const acP = /<p class="kp-keep-line[^"]*" aria-live="polite">([^<]*)<\/p>/.exec(ac);
  ok("5.3 · the analytics choice before it mounts (the server's page): its line is an EMPTY element the rule draws — no character in the page's text",
    acP !== null && acP[1] === "" && !ac.includes(NBSP), ac.slice(0, 160));
  const { TimeSelect } = req("../src/components/ui/time-select.tsx") as { TimeSelect: (p: Record<string, unknown>) => unknown };
  const tsel = inApp("en", h(TimeSelect as never, { value: "" } as never));
  const tsSpan = /<span class="kp-keep-line[^"]*" aria-hidden="true">([^<]*)<\/span>/.exec(tsel);
  ok("5.4 · the time field's empty preview: an empty, aria-hidden element the rule draws", tsSpan !== null && tsSpan[1] === "" && !tsel.includes(NBSP), tsel.slice(-200));
  ok("5.5 CONTROL · the typed space WAS page text — a copy, a find-in-page and `textContent` carried it; the generated one is not in the markup at all",
    textOf(renderToStaticMarkup(h("p", null, NBSP))) === NBSP && textOf(renderToStaticMarkup(h("p", { className: "kp-keep-line" }))) === "");
  ok("5.6 · what stays, by design: Up & Down's live-region nonce (a zero-width space that makes a repeated message announce again) and the legal tree's authored no-break spaces (byte-pinned)",
    /\\u200[bB]|\u200b/.test(code("src/components/updown/use-quick-bet.ts")) && raw("src/app/legal/responsible-gambling/page.tsx").includes("&nbsp;"));
  const r5e = raw("scripts/visual-pass-r5e.test.mts");
  ok("5.7 · the round-5 sweep no longer excuses the four slots (`test:visual-pass-r5e` 6.5) and holds them clear (6.5′): a typed space coming back fails there too",
    SLOTS.every(([f]) => !r5e.includes(`"${f}": "an empty`) && r5e.includes(`"${f}"`)));
}

/* ══ §6 · WHAT CLASSIC VIEWERS KEEP ═══════════════════════════════════════════════════════════════════════════════════════ */
section("6 · what classic viewers keep: the classic bell's count (frozen chrome) and the capped badge");
{
  const bell = code("src/components/layout/notifications-panel.tsx");
  ok("6.1 · the classic bell's count is byte-for-byte what it was (frozen, `qa:classic-shell-parity`); only the journey's bell groups it — both through one value, the change for classic its prop dropped",
    bell.includes("const countText = (n: number) => (journey ? formatNumber(n) : String(n));")
      && bell.includes('aria-label={`${t.common.notifications}${unread > 0 ? ` (${countText(unread)})` : ""}`}')
      && bell.includes('t.notif.unreadN.replace("{n}", countText(unread))') && bell.includes("export function NotificationsPanel({ journey = false }"));
  const badge = code("src/components/ui/count-badge.tsx");
  const caps = POPULATION.flatMap((f) => [...squash(code(f)).matchAll(/<CountBadge\b[^>]*?\bmax=\{([^}]*)\}/g)].map((m) => [f, m[1]]));
  const lifted = caps.filter(([, v]) => !(/^\d+$/.test(v) && Number(v) <= 99));
  ok(`6.2 · the count badge stays as it is: capped at "99+" (two digits, never a group to write) — and no caller lifts the cap (${caps.length} pass one: ${caps.map(([, v]) => v).join(", ") || "none"})`,
    badge.includes("max = 99,") && badge.includes("{count > max ? `${max}+` : count}") && lifted.length === 0, j(lifted));
}

console.log(`\nvisual-pass-r5j: ${pass} passed, ${fails.length} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fails.length ? 1 : 0);
