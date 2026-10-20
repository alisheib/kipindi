/**
 * MB-90: Millionea has its own /results section. Its gate runs before its week read; only public final weeks reach the
 * view, which uses the register's words and facts. The classic archive keeps its own counts, search, and pager.
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
import { MillioneaResultsView } from "../src/app/results/millionea-results-view.tsx";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const source = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n"));
const real = {
  page: source("src/app/results/page.tsx"),
  server: source("src/app/results/millionea-results.tsx"),
  access: source("src/app/results/millionea-results-access.ts"),
  view: source("src/app/results/millionea-results-view.tsx"),
  data: source("src/lib/server/maswali-player.ts"),
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
  const p = w.page, s = w.server, a = w.access, v = w.view, d = w.data;
  const sectionAt = p.indexOf("<MillioneaResultsSection />");
  const classicAt = p.indexOf("<ResultsContent state={state} searching={searching} pageNum={pageNum} />");
  return {
    mounted: sectionAt > classicAt && classicAt >= 0 && p.includes("<Suspense fallback={null}>\n          <MillioneaResultsSection />\n        </Suspense>"),
    isolated: p.includes('(await listTerminalMarkets("ALL")).filter((m) => m.productLine !== "MASWALI")')
      && p.indexOf("async function ResultsContent(") > sectionAt
      && !p.slice(p.indexOf("async function ResultsContent(")).includes("millioneaResultsSection"),
    door: s.includes("loadVisibleMillioneaResults(millioneaDoor, millioneaResultsSection)")
      && s.includes("if (!result) return null;") && s.indexOf("if (!result) return null;") < s.indexOf("getServerT()"),
    readAfterGate: /const access = await door\(\);\s*if \(!access\.visible\) return null;\s*return \{ preview: access\.preview, weeks: await read\(\) \};/.test(a),
    publicFinal: d.includes('weekStore.list({ visibility: "PUBLIC", states: TERMINAL })')
      && d.includes("return (await millioneaRegister({ perPage: limit })).rows;"),
    view: v.includes("{preview && <MillioneaPreviewMark t={t} />}")
      && v.includes("<EmptyState fill title={t.millionea.regEmpty} />")
      && v.includes("const facts = weekFacts(t, w);")
      && v.includes("<WeekStateChip t={t} state={w.state} />")
      && v.includes("registerWeekHref(w.code)")
      && v.includes("href={MILLIONEA_HREF.register}")
      && v.includes("{t.millionea.productTitle}")
      && v.includes("data-testid=\"millionea-results-section\"")
      && count(v, "<I.chevronRight") === 2,
  };
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
    if (fullText.includes(t.millionea.previewMark) || !markedText.includes(t.millionea.previewMark)) failures.push(`${locale}: preview`);
  }
  return failures;
}

const CHECK_NAMES = Object.keys(sourceChecks(real)) as Array<keyof ReturnType<typeof sourceChecks>>;
const base = sourceChecks(real);
for (const name of CHECK_NAMES) assert(`source ${name}`, base[name]);
assert("WITHDRAWN, STAFF_PREVIEW and ACTIVE gate the read", (await accessChecks(loadVisibleMillioneaResults)).length === 0);
const viewFailures = viewChecks();
assert(`empty, full and preview render in en/sw/zh${viewFailures.length ? ` (${viewFailures.join(", ")})` : ""}`, viewFailures.length === 0);

if (process.argv.includes("--prove-red")) {
  const mutations: Array<{ name: string; file: keyof Sources; from: string; to: string; fails: keyof typeof base }> = [
    { name: "section removed", file: "page", from: "<MillioneaResultsSection />", to: "", fails: "mounted" },
    { name: "classic archive admits Millionea", file: "page", from: 'm.productLine !== "MASWALI"', to: "true", fails: "isolated" },
    { name: "rollout door bypassed", file: "server", from: "loadVisibleMillioneaResults(millioneaDoor, millioneaResultsSection)", to: "loadVisibleMillioneaResults(async () => ({ visible: true, preview: false }), millioneaResultsSection)", fails: "door" },
    { name: "hidden request reads weeks", file: "access", from: "if (!access.visible) return null;", to: "if (access.visible) return null;", fails: "readAfterGate" },
    { name: "drive week reaches results", file: "data", from: 'visibility: "PUBLIC", states: TERMINAL', to: 'visibility: "DRIVE", states: TERMINAL', fails: "publicFinal" },
    { name: "preview mark removed", file: "view", from: "{preview && <MillioneaPreviewMark t={t} />}", to: "", fails: "view" },
    { name: "fake empty result", file: "view", from: "<EmptyState fill title={t.millionea.regEmpty} />", to: "<EmptyState fill title={t.results.noResolvedYet} />", fails: "view" },
    { name: "week facts removed", file: "view", from: "const facts = weekFacts(t, w);", to: "const facts = [];", fails: "view" },
  ];
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
}

console.log(`MASWALI RESULTS SECTION ${process.argv.includes("--prove-red") ? "red proof" : "guard"} passed`);
