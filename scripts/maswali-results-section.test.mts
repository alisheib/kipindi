/**
 * MB-90: Millionea has its own /results section. Its gate runs before its week read; only public final weeks reach the
 * view, which uses the register's words and facts. The classic archive keeps its own counts, search, and pager.
 * S5-DESIGN-DOORS (2026-10-21): a week's facts are Millionea's one fact line, at the row's end from 1024 (L14, L15), and the
 * section stands on the archive's first, unfiltered page alone (L16, `millioneaSectionShown`, run against every axis).
 * --prove-red mutates in-memory sources and a dependency-injected reader; it never changes a worktree file.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "../src/lib/i18n-dict.ts";
import { millioneaVisibleFor, type RolloutState } from "../src/lib/millionea-rollout.ts";
import type { MillioneaWeekSummary } from "../src/lib/server/maswali-player.ts";
import { loadVisibleMillioneaResults } from "../src/app/results/millionea-results-access.ts";
import { MillioneaResultsView, millioneaSectionShown } from "../src/app/results/millionea-results-view.tsx";
import { ARCHIVE_DEFAULT_STATE } from "../src/lib/results/archive.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const source = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n"));
const real = {
  page: source("src/app/results/page.tsx"),
  server: source("src/app/results/millionea-results.tsx"),
  access: source("src/app/results/millionea-results-access.ts"),
  view: source("src/app/results/millionea-results-view.tsx"),
  data: source("src/lib/server/maswali-player.ts"),
  // The row /results draws is the register's one row (S5-DESIGN-REGISTER's `WeekRow`, adopted with no fork, 2026-10-21).
  parts: source("src/app/millionea/register/register-parts.tsx"),
};
type Sources = typeof real;
const assert = (label: string, passes: boolean): void => {
  if (!passes) throw new Error(label);
  console.log(`PASS ${label}`);
};
const count = (s: string, part: string) => s.split(part).length - 1;
const markup = (t: (typeof dict)["en"], weeks: MillioneaWeekSummary[], preview = false) =>
  renderToStaticMarkup(createElement(MillioneaResultsView, { t, weeks, preview }));
const textOf = (html: string) => html.replace(/<[^>]+>/g, "");
const week = (id: string, state: "SETTLED" | "VOIDED", over: Partial<MillioneaWeekSummary> = {}): MillioneaWeekSummary => ({
  id, code: `MLN-2026-W${id}`, state, isFinal: true, closedAt: null, settledAt: null,
  tickets: 6, sales: 6_000, carryIn: 0, jackpot: null, winners: 0, share: null, fee: 0,
  topUp: null, paid: null, carriedForward: 412_000, refundsPending: false, ...over,
});
const weeks = [
  week("45", "SETTLED", { winners: 1, jackpot: 1_013_000, carriedForward: 0 }),
  week("44", "VOIDED", { refundsPending: true, carriedForward: null }),
  week("43", "SETTLED"),
];

function sourceChecks(w: Sources) {
  const p = w.page, s = w.server, a = w.access, v = w.view, d = w.data, pr = w.parts;
  const sectionAt = p.indexOf("<MillioneaResultsSection />");
  const classicAt = p.indexOf("<ResultsContent state={state} searching={searching} pageNum={pageNum} />");
  return {
    // RE-PINNED 2026-10-21 (S5-DESIGN-DOORS L16): mounted on the archive's first, unfiltered page alone (`placed` below).
    mounted: sectionAt > classicAt && classicAt >= 0
      && p.includes("{millioneaSectionShown(state, searching, pageNum) && (\n          <Suspense fallback={null}>\n            <MillioneaResultsSection />\n          </Suspense>\n        )}"),
    isolated: p.includes('(await listTerminalMarkets("ALL")).filter((m) => m.productLine !== "MASWALI")')
      && p.indexOf("async function ResultsContent(") > sectionAt
      && !p.slice(p.indexOf("async function ResultsContent(")).includes("millioneaResultsSection"),
    door: s.includes("loadVisibleMillioneaResults(millioneaDoor, millioneaResultsSection)")
      && s.includes("if (!result) return null;") && s.indexOf("if (!result) return null;") < s.indexOf("getServerT()"),
    // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P19): the read now stands in a try, its failure the `contained` case.
    readAfterGate: /const access = await door\(\);\s*if \(!access\.visible\) return null;\s*try \{\s*return \{ preview: access\.preview, weeks: await read\(\) \};/.test(a),
    contained: /try \{\s*return \{ preview: access\.preview, weeks: await read\(\) \};\s*\} catch \(err\) \{[^}]*return null;\s*\}/.test(a),
    publicFinal: d.includes('weekStore.list({ visibility: "PUBLIC", states: TERMINAL })')
      && d.includes("return (await millioneaRegister({ perPage: limit })).rows;"),
    // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-DOORS, the lead's instruction): a week's row is the register's one row
    // (`WeekRow`), handed the week's chip and its facts; the section's own chevron is the register link's alone.
    view: v.includes("{preview && <MillioneaPreviewMark t={t} />}")
      && v.includes("<EmptyState fill title={t.millionea.regEmpty} />")
      && v.includes("facts={weekFacts(t, w)}")
      && v.includes("chip={<WeekStateChip t={t} state={w.state} />}")
      && v.includes("href={MILLIONEA_HREF.register}")
      && v.includes("{t.millionea.productTitle}")
      && v.includes("data-testid=\"millionea-results-section\"")
      && count(v, "<I.chevronRight") === 1,
    // S5-DESIGN-DOORS L14 L15, through the one row: /results draws `WeekRow` and no row of its own (no fork — no <li>, no
    // link of its own, no hand-typed "·"), its list drawing the rules (above the first row and between rows); the row's
    // facts are Millionea's one fact line, ending at the row's end from 1024 beside the chevron.
    factLine: v.includes("<WeekRow key={w.id} t={t} code={w.code} chip={<WeekStateChip t={t} state={w.state} />} facts={weekFacts(t, w)} />")
      && v.includes('<ul role="list" className="flex flex-col divide-y divide-border border-t border-border">')
      && !/<li\b|registerWeekHref|>·</.test(v)
      && count(pr, '<MaswaliFacts layout="phone" facts={facts} />') === 1
      && pr.includes('<span className="min-w-0 text-body-sm text-text-muted lg:ml-auto" data-testid="millionea-week-facts">')
      && pr.includes('<span className="flex min-w-0 flex-1 flex-col gap-1">'),
  };
}

/** L16 · the section stands on the archive's first page as it opens, and under no narrowing of it. */
function placedChecks(shown: typeof millioneaSectionShown): string[] {
  const base = ARCHIVE_DEFAULT_STATE, failures: string[] = [];
  if (!shown(base, false, 1)) failures.push("hidden on the archive as it opens");
  if (!shown({ ...base, sort: "volume", dir: "asc" }, false, 1)) failures.push("hidden under a sort (a sort narrows nothing)");
  if (!shown({ ...base, product: "all" }, false, 1)) failures.push("hidden on the undivided archive");
  const narrowed: Array<[string, boolean]> = [
    ["a search", shown(base, true, 1)], ["page 2", shown(base, false, 2)], ["a topic", shown({ ...base, cat: "sports" }, false, 1)],
    ["an outcome lens", shown({ ...base, out: "void" }, false, 1)], ["a time window", shown({ ...base, when: "7d" }, false, 1)],
    ["the Up & Down rounds", shown({ ...base, product: "UPDOWN" }, false, 1)],
  ];
  for (const [name, drawn] of narrowed) if (drawn) failures.push(`drawn under ${name}`);
  return failures;
}

type Reader = typeof loadVisibleMillioneaResults;
async function accessChecks(readVisible: Reader) {
  const states: Array<{ name: string; state: RolloutState; staff: boolean; expected: boolean; preview: boolean }> = [
    { name: "WITHDRAWN staff", state: "WITHDRAWN", staff: true, expected: false, preview: false },
    { name: "STAFF_PREVIEW public", state: "STAFF_PREVIEW", staff: false, expected: false, preview: false },
    { name: "STAFF_PREVIEW staff", state: "STAFF_PREVIEW", staff: true, expected: true, preview: true },
    { name: "ACTIVE public", state: "ACTIVE", staff: false, expected: true, preview: false },
  ];
  const failures: string[] = [];
  for (const c of states) {
    let reads = 0;
    const gate = millioneaVisibleFor(c.state, { staff: c.staff, pass: false });
    const got = await readVisible(async () => gate, async () => { reads++; return weeks; });
    const okay = c.expected
      ? got?.weeks === weeks && got.preview === c.preview && reads === 1
      : got === null && reads === 0;
    if (!okay) failures.push(`${c.name}: reads=${reads}, visible=${got !== null}, preview=${got?.preview}`);
  }
  return failures;
}

function viewChecks() {
  const failures: string[] = [];
  for (const locale of ["en", "sw", "zh"] as const) {
    const t = dict[locale];
    const empty = markup(t, []);
    const full = markup(t, weeks);
    const marked = markup(t, weeks, true);
    const emptyText = textOf(empty), fullText = textOf(full), markedText = textOf(marked);
    const facts = [t.millionea.regWonOne, t.millionea.regRefundsPending, t.millionea.feeZero];
    if (!emptyText.includes(t.millionea.productTitle) || !emptyText.includes(t.millionea.regEmpty) || emptyText.includes("MLN-2026")) failures.push(`${locale}: empty`);
    if (!fullText.includes(t.millionea.productTitle) || !full.includes('href="/millionea/register/MLN-2026-W45"')
      || !fullText.includes("MLN-2026-W44") || !fullText.includes("MLN-2026-W43")
      || !facts.every((word) => fullText.includes(word)) || !fullText.includes("TZS 1,013,000")
      || fullText.includes(t.millionea.regEmpty)) failures.push(`${locale}: full`);
    // ⚠️ RE-PINNED OPENLY (MASWALI-BUILD S5-FIX-PLATFORM D12, 2026-10-21): the preview's mark is the shell's ONE bar above the
    // page now (`MillioneaPreviewBar`, which stands on /results too), so the section draws it neither way; the view keeps its
    // call (`source view`), which renders nothing until round 2 removes it. `test:millionea-shell` §1 holds the bar.
    if (fullText.includes(t.millionea.previewMark) || markedText.includes(t.millionea.previewMark) || marked !== full) failures.push(`${locale}: preview`);
  }
  return failures;
}

const CHECK_NAMES = Object.keys(sourceChecks(real)) as Array<keyof ReturnType<typeof sourceChecks>>;
const base = sourceChecks(real);
for (const name of CHECK_NAMES) assert(`source ${name}`, base[name]);
assert("WITHDRAWN, STAFF_PREVIEW and ACTIVE gate the read", (await accessChecks(loadVisibleMillioneaResults)).length === 0);
/** P19 · a week read that throws, at every state that reads: no section — never an error that reaches results/error.tsx
 *  and takes the classic archive's place. The gate's own answer is unchanged (a hidden request still reads nothing). */
async function failureChecks(readVisible: Reader) {
  const failures: string[] = [];
  for (const c of [{ state: "STAFF_PREVIEW" as RolloutState, staff: true }, { state: "ACTIVE" as RolloutState, staff: false }]) {
    const gate = millioneaVisibleFor(c.state, { staff: c.staff, pass: false });
    let got: unknown = "unset";
    try { got = await readVisible(async () => gate, async () => { throw new Error("store down"); }); }
    catch (e) { failures.push(`${c.state}: the read error escaped (${(e as Error).message})`); continue; }
    if (got !== null) failures.push(`${c.state}: a failed read drew a section (${JSON.stringify(got)})`);
  }
  return failures;
}
const quiet = console.error;
console.error = () => {};
const failed = await failureChecks(loadVisibleMillioneaResults);
console.error = quiet;
assert(`a week read that throws draws no section and never escapes to the page's error boundary${failed.length ? ` (${failed.join(", ")})` : ""}`, failed.length === 0);
const viewFailures = viewChecks();
assert(`empty, full and preview render in en/sw/zh${viewFailures.length ? ` (${viewFailures.join(", ")})` : ""}`, viewFailures.length === 0);
const placedFailures = placedChecks(millioneaSectionShown);
assert(`L16 · placed on the archive's first page as it opens (a sort or the undivided archive keeps it), never under a search, page 2, a topic, an outcome lens, a time window or the Up & Down rounds alone${placedFailures.length ? ` (${placedFailures.join(", ")})` : ""}`, placedFailures.length === 0);

if (process.argv.includes("--prove-red")) {
  const mutations: Array<{ name: string; file: keyof Sources; from: string; to: string; fails: keyof typeof base }> = [
    { name: "section removed", file: "page", from: "<MillioneaResultsSection />", to: "", fails: "mounted" },
    { name: "classic archive admits Millionea", file: "page", from: 'm.productLine !== "MASWALI"', to: "true", fails: "isolated" },
    { name: "rollout door bypassed", file: "server", from: "loadVisibleMillioneaResults(millioneaDoor, millioneaResultsSection)", to: "loadVisibleMillioneaResults(async () => ({ visible: true, preview: false }), millioneaResultsSection)", fails: "door" },
    { name: "hidden request reads weeks", file: "access", from: "if (!access.visible) return null;", to: "if (access.visible) return null;", fails: "readAfterGate" },
    { name: "drive week reaches results", file: "data", from: 'visibility: "PUBLIC", states: TERMINAL', to: 'visibility: "DRIVE", states: TERMINAL', fails: "publicFinal" },
    { name: "preview mark removed", file: "view", from: "{preview && <MillioneaPreviewMark t={t} />}", to: "", fails: "view" },
    { name: "fake empty result", file: "view", from: "<EmptyState fill title={t.millionea.regEmpty} />", to: "<EmptyState fill title={t.results.noResolvedYet} />", fails: "view" },
    { name: "week facts removed", file: "view", from: "facts={weekFacts(t, w)}", to: "facts={[]}", fails: "view" },
    { name: "section under every filter again", file: "page", from: "{millioneaSectionShown(state, searching, pageNum) && (", to: "{true && (", fails: "mounted" },
    { name: "hand-rolled separators back", file: "parts", from: '<MaswaliFacts layout="phone" facts={facts} />', to: "{facts.map((f, i) => <span key={i}>{i > 0 && <span>·</span>}{f}</span>)}", fails: "factLine" },
    { name: "a forked row back", file: "view", from: "<WeekRow key={w.id} t={t} code={w.code} chip={<WeekStateChip t={t} state={w.state} />} facts={weekFacts(t, w)} />", to: "<li key={w.id}><Link href={registerWeekHref(w.code) as never}>{w.code}</Link></li>", fails: "factLine" },
    { name: "the facts far from the chevron again", file: "parts", from: 'text-text-muted lg:ml-auto" data-testid="millionea-week-facts"', to: 'text-text-muted" data-testid="millionea-week-facts"', fails: "factLine" },
    { name: "the list's rules dropped", file: "view", from: "divide-y divide-border border-t border-border", to: "", fails: "factLine" },
  ];
  assert("L16 · the section drawn under every filter turns the placement red", placedChecks(() => true).length > 0);
  for (const m of mutations) {
    assert(`${m.name} plant is unique`, count(real[m.file], m.from) === 1);
    const altered = { ...real, [m.file]: real[m.file].replace(m.from, m.to) };
    assert(`${m.name} turns ${m.fails} red`, sourceChecks(altered)[m.fails] === false);
  }
  const eager: Reader = async (door, read) => {
    const data = await read();
    const access = await door();
    return access.visible ? { preview: access.preview, weeks: data } : null;
  };
  assert("eager read turns the runtime gate red", (await accessChecks(eager)).length > 0);
  const silent: Reader = async () => null;
  assert("hidden ACTIVE turns the runtime gate red", (await accessChecks(silent)).length > 0);
  // P19's plants: the loader as it stood — the read awaited bare, so its error escapes to results/error.tsx — run, and as source.
  const bare: Reader = async (door, read) => {
    const access = await door();
    if (!access.visible) return null;
    return { preview: access.preview, weeks: await read() };
  };
  assert("a read error that escapes the loader turns the failure check red", (await failureChecks(bare)).some((x) => x.includes("escaped")));
  const sourceBare = { ...real, access: real.access.replace(/try \{\s*(return \{ preview: access\.preview, weeks: await read\(\) \};)\s*\} catch \(err\) \{[^}]*return null;\s*\}/, "$1") };
  assert("the uncaught loader turns the source check `contained` red", sourceBare.access !== real.access && sourceChecks(sourceBare).contained === false);
}

console.log(`MASWALI RESULTS SECTION ${process.argv.includes("--prove-red") ? "red proof" : "guard"} passed`);
