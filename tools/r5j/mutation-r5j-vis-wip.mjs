// R5-J mutation proof: plant each defect ON DISK in F:\kipindi-r5j, run the named suite(s), require the named check to FAIL,
// restore the file byte-identical (sha-256 checked after every plant and for every file at the end).
//   node mutation-r5j.mjs            (run from anywhere; never while another suite is running in the worktree)
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const ROOT = "F:/kipindi-wip/";
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5j";
const LOG = `${S}/mutation-r5j.log`;
const R5J = "test:visual-pass-r5j", SGT = "test:sell-grace-truth", R5E = "test:visual-pass-r5e", R4D = "test:visual-pass-r4d";
const NB = "\\u00a0"; // the escape, as source text
const PLANTS = [
  ["the filter pill prints its count bare again (\"Zote 12479\")", "src/components/ui/filter-pill.tsx", "{formatNumber(count)}", "{count}", [[R5J, "1.1"], [R5J, "2.1"]]],
  ["/results' bar fills its phrase with String(resultCount)", "src/app/results/results-bar.tsx", `.replace("{n}", formatNumber(resultCount))`, `.replace("{n}", String(resultCount))`, [[R5J, "1.1"], [R5J, "1.3"], [R5J, "2.3"]]],
  ["the pager's total back on the runtime's locale", "src/components/ui/pagination.tsx", "{formatNumber(total)}", "{total.toLocaleString()}", [[R5J, "1.1"], [R5J, "2.2"]]],
  ["the Up & Down card's private device-locale formatter back", "src/components/updown/updown-card.tsx", "useMemo(() => formatNumber(players), [players])", "useMemo(() => new Intl.NumberFormat().format(players), [players])", [[R5J, "1.1"], [R5J, "2.4"]]],
  ["/proposals' tally on toLocaleString() again", "src/app/proposals/page.tsx", "{formatNumber(totalProposals)}", "{totalProposals.toLocaleString()}", [[R5J, "1.1"], [R5J, "2.7"]]],
  ["/live's count line bare again", "src/app/live/page.tsx", "{formatNumber(markets.length)} {t.market.liveCount}", "{markets.length} {t.market.liveCount}", [[R5J, "1.1"]]],
  ["/positions' win-rate hint's count bare in its template", "src/app/positions/page.tsx", "`${formatNumber(settled.length)} ${t.market.tickerSettled}`", "`${settled.length} ${t.market.tickerSettled}`", [[R5J, "1.1"], [R4D, "7.3b"]]],
  ["the home's \"browse all\" slot handed the bare count", "src/components/home/landing-hero.tsx", "fill(t.home.heroBrowseAll, { n: formatNumber(figures.openCount) })", "fill(t.home.heroBrowseAll, { n: figures.openCount })", [[R5J, "1.1"]]],
  ["the card's comment count bare again", "src/components/markets/market-card.tsx", "<I.comment s={10} />{formatNumber(comments)}", "<I.comment s={10} />{comments}", [[R5J, "1.1"]]],
  ["the leaderboard's hot streak bare again", "src/app/leaderboard/page.tsx", "{formatNumber(streak)} {streak > 1", "{streak} {streak > 1", [[R5J, "1.1"], [R5J, "2.7"]]],
  ["the deposit refusal's bounds on toLocaleString(\"en-US\") again", "src/app/wallet/deposit/actions.ts", `.replace("{min}", formatNumber(DEPOSIT_MIN_TZS))`, `.replace("{min}", DEPOSIT_MIN_TZS.toLocaleString("en-US"))`, [[R5J, "1.1"], [R5J, "2.6"]]],
  ["the away bar's `n` back to a bare String", "src/components/layout/away-summary-bar.tsx", "  const n = formatNumber;", "  const n = (v: number) => String(v);", [[R5J, "1.5"]]],
  ["a classified site goes away (its exemption would be stale)", "src/app/updown/page.tsx", `.replace("{n}", String(activeDuration))`, `.replace("{n}", formatNumber(activeDuration))`, [[R5J, "1.2"]]],
  ["the journey bell's count bare too", "src/components/layout/notifications-panel.tsx", "(journey ? formatNumber(n) : String(n))", "(journey ? String(n) : String(n))", [[R5J, "1.5"], [R5J, "6.1"]]],
  ["a caller lifts the badge's cap (a four-digit pip)", "src/components/chat/ChatBubble.tsx", "max={99}", "max={999}", [[R5J, "6.2"]]],
  ["the result draws its title as given (no reader)", "src/components/markets/operation-result-modal.tsx", "{moneyRuns(title)}", "{title}", [[R5J, "3.1"], [R5J, "3.2"], [SGT, "6.result"]]],
  ["the result's private matcher back (split on its own FIGURE)", "src/components/markets/operation-result-modal.tsx", `import { moneyRuns } from "@/lib/fill-nodes";`, `const FIGURE = /(TZS [0-9][0-9,]*)/;\nconst moneyRuns = (s: string) => s.split(FIGURE);`, [[R5J, "3.1"], [R5J, "3.2"], [R5J, "4.1"]]],
  ["a refusal's subtitle no longer read for figures", "src/components/markets/operation-result-modal.tsx", `{typeof subtitle === "string" ? moneyRuns(subtitle) : subtitle}`, "{subtitle}", [[R5J, "3.1"], [R5J, "3.3"]]],
  ["the sale asks for whole figures again (a stale opt-in prop)", "src/components/markets/sell-result.tsx", `      stripTone="brand"\n`, `      stripTone="brand"\n      wholeFigures\n`, [[R5J, "3.1"], [R5J, "3.5"]]],
  ["the shared reader forgets a compact figure (\"TZS 1.2M\" read as \"TZS 1\")", "src/lib/fill-nodes.tsx", "(?:\\.\\d+)?[KMB]?/g;", "(?:\\.\\d+)?/g;", [[R5J, "3.2"], [SGT, "6.result"]]],
  ["the share card's private grouping regex back", "src/app/api/og/market/[id]/route.tsx", "const tzs = formatTzs;", `const tzs = (n: number) => "TZS " + Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");`, [[R5J, "4.1"], [R5J, "4.3"]]],
  ["the empty-slot rule deleted from globals.css", "src/app/globals.css", `.kp-keep-line:empty::before { content: "\\00a0"; }\n`, "", [[R5J, "5.1"]]],
  ["the analytics choice types its no-break space again", "src/components/analytics/analytics-choice.tsx", "{!mounted ? null : consent", `{!mounted ? "${NB}" : consent`, [[R5J, "5.2"], [R5J, "5.3"], [R5E, "6.5′"]]],
  ["the settled row's empty cell types its no-break space again", "src/components/home/trust-band.tsx", `<span className="kp-settled__amt kp-keep-line" aria-hidden />`, `<span className="kp-settled__amt" aria-hidden>{"${NB}"}</span>`, [[R5J, "5.2"], [R5E, "6.5′"]]],
  ["the time field's preview types its no-break space again", "src/components/ui/time-select.tsx", "{preview && !errored ? `= ${preview}` : null}", "{preview && !errored ? `= ${preview}` : \"" + NB + "\"}", [[R5J, "5.2"], [R5J, "5.4"]]],
  ["the round-5 sweep excuses a slot again", "scripts/visual-pass-r5e.test.mts", `    "src/components/updown/use-quick-bet.ts": "a live region's re-announce nonce (U+200B), not layout",`, `    "src/components/analytics/analytics-choice.tsx": "an empty slot's line box (no words) — named for the integrator",\n    "src/components/updown/use-quick-bet.ts": "a live region's re-announce nonce (U+200B), not layout",`, [[R5J, "5.7"]]],
];
const sha = (s) => createHash("sha256").update(s).digest("hex");
const files = [...new Set(PLANTS.map((p) => p[1]))];
const before = new Map(files.map((f) => [f, readFileSync(ROOT + f)]));
const beforeSha = new Map(files.map((f) => [f, sha(before.get(f))]));
writeFileSync(LOG, `mutation-r5j · ${new Date().toISOString()} · ${PLANTS.length} plants over ${files.length} files\n`);
const say = (s) => { console.log(s); appendFileSync(LOG, s + "\n"); };
const run = (suite) => {
  const r = spawnSync("npm", ["run", "-s", suite], { cwd: ROOT, shell: true, encoding: "utf8", timeout: 900_000, maxBuffer: 256 << 20 });
  return `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
};
// A check FAILED when a line names it as failing: this suite's "  FAIL <id> ·", sell-grace-truth's "FAIL <id> ·".
// The id must be followed by white space, so "1.1" is not "1.1′" and "6.5′" (a non-word mark) still matches.
const failed = (out, id) => out.split(/\r?\n/).some((l) => new RegExp(`^\\s*FAIL ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s)`).test(l));
let caught = 0, restoredAll = true;
for (const [name, file, from, to, expect] of PLANTS) {
  const orig = before.get(file);
  const text = orig.toString("utf8");
  const crlf = text.includes("\r\n");
  const norm = (s) => (crlf ? s.replace(/\r?\n/g, "\r\n") : s);
  const F = norm(from), T = norm(to);
  const n = text.split(F).length - 1;
  if (n !== 1) { say(`INCONCLUSIVE  ${name} — anchor found ${n}× in ${file}`); continue; }
  writeFileSync(ROOT + file, text.split(F).join(T));
  const results = [];
  const outs = new Map();
  for (const [suite, id] of expect) {
    if (!outs.has(suite)) outs.set(suite, run(suite));
    results.push([suite, id, failed(outs.get(suite), id)]);
  }
  writeFileSync(ROOT + file, orig);
  const back = sha(readFileSync(ROOT + file)) === beforeSha.get(file);
  if (!back) restoredAll = false;
  const all = results.every(([, , f]) => f);
  if (all) caught++;
  say(`${all ? "CAUGHT" : "MISSED"}  ${name}  [${results.map(([s, id, f]) => `${s.replace("test:", "")} ${id} ${f ? "✗" : "✓ (not failed)"}`).join(" · ")}]  restored ${back ? "byte-identical" : "MISMATCH"}`);
}
const finalOk = files.every((f) => sha(readFileSync(ROOT + f)) === beforeSha.get(f));
say(`\n${caught}/${PLANTS.length} caught on their named checks; every file restored byte-identical: ${restoredAll && finalOk ? "yes" : "NO"}`);
for (const f of files) say(`  ${beforeSha.get(f).slice(0, 16)}  ${f}`);
process.exit(caught === PLANTS.length && restoredAll && finalOk ? 0 : 1);
