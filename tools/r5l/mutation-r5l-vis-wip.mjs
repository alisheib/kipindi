// R5-L · the mutation proof: every defect R5-L fixed, planted ON DISK one at a time, must turn test:visual-pass-r5l red on
// its NAMED check; every file is restored byte for byte (sha-256 before and after).
// Run from anywhere: node mutation-r5l.mjs   (it runs the suite in F:/kipindi-r5l; one suite at a time, never in parallel)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = "F:/kipindi-wip/";
const sha = (p) => createHash("sha256").update(readFileSync(ROOT + p)).digest("hex");

/** [the check that must report it, file, from, to, what it puts back] */
const PLANTS = [
  ["1.1", "src/app/profile/security/loading.tsx", "          <BackLinkGhost />\n", "", "a generic loader without its page's back link (the 257px spinner box first again)"],
  ["1.1", "src/app/notifications/loading.tsx", "icon={<I.bellRing s={22} />}", "icon={<I.bellRing s={14} />}", "a loader's header with the page's icon a size smaller (its eyebrow row 15px, not 22)"],
  ["1.1", "src/app/proposals/loading.tsx", 'rhythm="space-y-6"', 'rhythm="space-y-5"', "a loader on another page's rung"],
  ["1.2", "src/components/ui/page-loader.tsx", "      {lead}\n      <div className=\"rounded-xl border border-border bg-bg-elevated p-10 grid place-items-center\">", "      <div className=\"rounded-xl border border-border bg-bg-elevated p-10 grid place-items-center\">", "PageLoader drawing its spinner first and the page's bands nowhere"],
  ["1.3", "src/components/ui/page-loader.tsx", 'className={cn("content-fade-in", rhythm)}', 'className="content-fade-in"', "PageLoader ignoring the page's rhythm"],
  ["2.1", "src/app/markets/page.tsx", "<Suspense fallback={<MarketsBoardGhost />}>", '<Suspense fallback={<div className="market-grid mt-3" />}>', "/markets' fallback a skeleton of its own again (GridSkeleton's shape)"],
  ["2.2", "src/app/results/page.tsx", "<Suspense fallback={<ResultsGhostBands notable={!searching && pageNum === 1} searching={searching} />}>", "<Suspense fallback={<ResultsGhostBands />}>", "/results' fallback not handed what the page knows (a search's page draws a carousel)"],
  ["2.3", "src/app/results/loading.tsx", "{Array.from({ length: notable ? PLAYER_PER_PAGE - 3 : PLAYER_PER_PAGE }).map((_, i) => (", "{Array.from({ length: 6 }).map((_, i) => (", "the grid's count typed again (six cards under the carousel)"],
  ["2.4", "src/app/markets/loading.tsx", '<div className="market-grid mt-5" aria-hidden>', '<div className="market-grid mt-3" aria-hidden>', "the board's grid back on GridSkeleton's mt-3"],
  ["3.1", "src/app/agent/loading.tsx", '<ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">', '<ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">', "the documents' grid a step closer than the page's"],
  ["3.2", "src/app/agent/loading.tsx", '<Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4 kp-shimmer-track"\n          label={<GhostText>{t.agent.statEarn}</GhostText>}', '<Stat size="xl" boxed="glass" labelStyle="caps" font="mono" className="p-4 kp-shimmer-track"\n          label={<GhostText>{t.agent.statEarn}</GhostText>}', "a tile off the page's props (another label rung)"],
  ["3.3", "src/app/agent/loading.tsx", '"pt-2 pb-1 border-t border-border-strong" : "py-1.5"', '"pt-2 pb-1 border-t border-border-strong" : "py-2"', "the waterfall's rows on another padding"],
  ["3.4", "src/app/agent/loading.tsx", '<p className="pt-1 text-body-sm leading-snug"><GhostText>{step}</GhostText></p>', '<p className="pt-1 text-body-sm leading-snug">{step}</p>', "a step's sentence printed instead of set and not shown"],
  ["3.5", "src/app/agent/loading.tsx", "{[t.agent.earnLifetime, t.agent.earnUncapped,", "{[t.agent.earnLifetime, t.agent.earnCapped,", "a term the programme does not have drawn (a cap)"],
  ["4.1", "src/app/agent/apply/loading.tsx", '<div className="mt-2 grid grid-cols-4 gap-1">', '<div className="mt-2 grid grid-cols-4 gap-2">', "the step buttons apart by another gap"],
  ["4.2", "src/app/agent/apply/loading.tsx", '<div className="flex items-center justify-between" aria-hidden>', '<section className="rounded-xl glass-panel p-4 space-y-3" aria-hidden><div className="h-4" /></section>\n        <div className="flex items-center justify-between" aria-hidden>', "a second generic panel back under the step panel"],
  ["4.3", "src/app/agent/status/loading.tsx", "<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />", '<div className="h-6 w-56 rounded bg-bg-overlay/60 kp-shimmer-track" aria-hidden />', "the status header a 32px bar again"],
  ["4.4", "src/app/agent/apply/loading.tsx", 'kp-shimmer-track" : ""}`}>\n                <GhostText>{label}</GhostText>', 'kp-shimmer-track" : ""}`}>\n                {label}', "the step labels printed"],
  ["5.1", "src/app/leaderboard/loading.tsx", '<section className="rounded-xl glass-panel px-4 pt-6 pb-4 text-transparent" aria-hidden>', '<section className="rounded-xl glass-panel p-4 text-transparent" aria-hidden>', "the podium on another padding"],
  ["5.2", "src/app/leaderboard/loading.tsx", "      <PodiumGhost />\n", "      <p className=\"font-mono text-caption uppercase eyebrow text-text-muted\">{t.common.loading}</p>\n      <PodiumGhost />\n", "a spinner's caption back among the bands"],
  ["5.3", "src/app/leaderboard/loading.tsx", "{Array.from({ length: PLAYER_PER_PAGE }).map((_, i) => (", "{Array.from({ length: 8 }).map((_, i) => (", "eight rows again (a page is twelve)"],
  ["5.4", "src/app/leaderboard/loading.tsx", "        <PillGhost label={t.market.udTitle} />\n", "", "the lens a pill short"],
  ["8.4", "src/app/live/loading.tsx", "lg:min-h-[calc(2*1.25*24px)]", "lg:min-h-[calc(3*1.25*24px)]", "the hero's question stack back on three lines from lg (30px over today's board at 1280)"],
  ["8.4", "src/app/live/loading.tsx", "\"min-h-[calc(4*1.25*19px)] xs:min-h-[calc(3*1.25*19px)]\"", "\"min-h-[calc(6*1.25*19px)] xs:min-h-[calc(3*1.25*19px)]\"", "the Swahili phone's question stack back on six lines"],
  ["5.5", "src/app/leaderboard/loading.tsx", "{!first && <span className=\"mt-1 flex h-[22.5px] items-center\">", "{<span className=\"mt-1 flex h-[22.5px] items-center\">", "the leader on a streak too (the podium 8px taller than the measured board's)"],
  ["6.1", "src/app/results/loading.tsx", "relative block overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 lg:p-6 kp-shimmer-track text-transparent", "relative block overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 kp-shimmer-track text-transparent", "the notable card 16px short from 1024 (its lg padding gone)"],
  ["6.2", "src/app/results/loading.tsx", "min-h-[calc(3*1.25*18px)] sm:min-h-[calc(2*1.25*18px)] md:min-h-[calc(1.25*18px)] lg:min-h-[calc(1.25*22px)]", "min-h-[calc(3*1.25*18px)]", "the title's judgement a phone's at every width"],
  ["6.3", "src/app/results/loading.tsx", "          <GroupGhost label={t.common.when}>{when.map((w) => <PillGhost key={w} label={w} />)}</GroupGhost>\n          <QueryGroupDivider />\n          <GroupGhost label={t.common.topic}>{topics.map((c) => <PillGhost key={c} label={c} glyph />)}</GroupGhost>\n", "          <GroupGhost label={t.common.topic}>{topics.map((c) => <PillGhost key={c} label={c} glyph />)}</GroupGhost>\n          <QueryGroupDivider />\n          <GroupGhost label={t.common.when}>{when.map((w) => <PillGhost key={w} label={w} />)}</GroupGhost>\n", "row 2's groups out of the page's order"],
  ["6.4", "src/app/results/loading.tsx", "const when = [t.common.rangeToday, t.common.rangeYesterday,", "const when = [t.common.rangeToday, t.common.rangeToday,", "a pill with another word"],
  ["7.1", "src/app/markets/loading.tsx", "          <QueryGroupDivider />\n          <MenuGhost label={t.common.topic} value={t.market.catAll} />\n", "          <MenuGhost label={t.common.topic} value={t.market.catAll} />\n", "the topic menu without the page's divider (the row's 29px gap)"],
  ["7.2", "src/app/markets/loading.tsx", '<PillGhost label={`${formatTzsCompact(POOL_FLOORS["10k"])}+`} amount />', "<PillGhost label={t.market.pool10k} amount />", "a pool floor in the old words, not the money formatter's"],
  ["7.3", "src/app/markets/loading.tsx", "{STATUS_PILL_W.map(", "{[64, 104, 60].map(", "row 1's per-status widths dropped"],
  ["8.1", "src/app/live/loading.tsx", "kp-shimmer-track flex flex-col rounded-xl border border-border bg-bg-elevated p-4 text-transparent", "kp-shimmer-track flex flex-col rounded-xl border border-border bg-bg-elevated p-3 text-transparent", "a card on another padding"],
  ["8.2", "src/app/live/loading.tsx", '<ButtonGhost size="md">{t.market.openMarket}</ButtonGhost>', '<div className="kp-shimmer-track h-[var(--h-control-md)] w-[150px] rounded-md bg-bg-overlay" />', "the CTA back to a 150px box (two lines at 390)"],
  ["8.3", "src/app/live/loading.tsx", '${locale === "sw" ? "min-h-[4.125em]" : "min-h-[2.75em]"}', "min-h-[4.125em]", "every language's card at Swahili's height"],
  ["9.1", "src/components/ui/query-bar-ghost.tsx", "px-1.5 text-transparent lg:gap-2 lg:px-3", "px-3 text-transparent lg:gap-2 lg:px-3", "the sort ghost's phone padding off QuerySort's"],
  ["9.1", "src/components/ui/ghost-text.tsx", /* one helper since the merge (R5-K's) */ 'text-transparent box-decoration-clone";', 'text-transparent";', "the helper's word bar on the first line only (no box-decoration-clone)"],
  ["9.2", "src/app/wallet/money-bar-ghost.tsx", /* 2026-10-10: FiltersGhost too */ 'import { CountGhost, FiltersGhost, PillGhost } from "@/components/ui/query-bar-ghost";\n', 'import { CountGhost, FiltersGhost, PillGhost as KitPill } from "@/components/ui/query-bar-ghost";\nvoid KitPill;\nfunction PillGhost({ label }: { label: string }) { return <span className="inline-flex min-h-[44px] px-3">{label}</span>; }\n', "a second pill ghost"],
];

const files = [...new Set(PLANTS.map((p) => p[1]))];
const before = Object.fromEntries(files.map((f) => [f, sha(f)]));
const original = Object.fromEntries(files.map((f) => [f, readFileSync(ROOT + f)]));
const lines = [];
let caught = 0;
for (const [id, file, from, to, what] of PLANTS) {
  const buf = original[file].toString("utf8");
  const crlf = buf.includes("\r\n");
  const f = crlf ? from.replace(/\n/g, "\r\n") : from, t = crlf ? to.replace(/\n/g, "\r\n") : to;
  const n = buf.split(f).length - 1;
  if (n !== 1) { lines.push(`ANCHOR ${id} ${file}: found ${n} times — ${what}`); continue; }
  writeFileSync(ROOT + file, buf.replace(f, () => t));
  let out = "";
  try { out = execSync("npx tsx scripts/visual-pass-r5l.test.mts", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600000 }); }
  catch (e) { out = String(e.stdout ?? "") + String(e.stderr ?? ""); }
  finally { writeFileSync(ROOT + file, original[file]); }
  const failed = [...out.matchAll(/^  FAIL (\S+)/gm)].map((m) => m[1]);
  const hit = failed.includes(id);
  if (hit) caught++;
  lines.push(`${hit ? "CAUGHT" : "MISSED"} ${id.padEnd(4)} ${file} — ${what}  [red: ${failed.join(" ") || "none"}]`);
  if (sha(file) !== before[file]) { lines.push(`RESTORE FAILED ${file}`); break; }
}
const after = files.filter((f) => sha(f) !== before[f]);
console.log(lines.join("\n"));
console.log(`\nmutation-r5l: ${PLANTS.length} planted, ${caught} caught on the named check; ${files.length} files restored byte-identical: ${after.length === 0 ? "yes" : "NO — " + after.join(", ")}`);
console.log(files.map((f) => `  ${before[f].slice(0, 12)}  ${f}`).join("\n"));
process.exit(caught === PLANTS.length && after.length === 0 ? 0 : 1);
