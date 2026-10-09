// R5-H · THE MUTATION PROOF — each defect planted ON DISK in F:\kipindi-r5h, `test:visual-pass-r5h` run, the named check
// must fail, and the file is restored byte for byte (sha-256 before = after, and the whole touched set re-hashed at the end).
// Usage: node mutation-r5h.mjs   (from anywhere; it runs the suite in the worktree)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = "F:/kipindi-r5h/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const crlf = (s) => s.replace(/\r?\n/g, "\r\n");
/** [file, from (LF text), to (LF text), the check that must fail] */
const PLANTS = [
  ["src/app/results/loading.tsx", '"use client";\n\n', "", "1.2 ·", "the results ghost drawn by a server component again (its tree in every refresh)"],
  ["src/app/markets/[id]/loading.tsx", '"use client";\n\n', "", "1.2 ·", "a question's skeleton drawn on the server again (every 15 s)"],
  ["src/components/ui/page-loader.tsx", '"use client";\n\n', "", "1.2 ·", "the kit's loader a server component again (16 routes)"],
  ["src/app/positions/positions-ghost.tsx", 'import { useT } from "@/lib/i18n";\n', 'import { useT } from "@/lib/i18n";\nimport { getServerT } from "@/lib/i18n-server";\n', "1.3 ·", "today's /positions picture reading the words on the server"],
  ["src/app/updown/history/loading.tsx", 'import { UpDownHistoryGhost } from "./history-ghost";\n', 'import { UpDownHistoryGhost } from "./history-ghost";\nimport { getServerT } from "@/lib/i18n-server";\nconst _w = getServerT;\n', "1.3 ·", "the history loading file reading the words again"],
  ["src/app/updown/loading.tsx", 'import { UpDownGhost } from "./updown-ghost";\n', 'import { UpDownGhost } from "./updown-ghost";\nimport { PageContainer } from "@/components/layout/page-container";\n', "1.3 ·", "a server loading file importing a server component (a tree in the payload)"],
  ["src/app/wallet/loading.tsx", "<WalletGhost bonusLive={bonusIsLiveFor()} />", "<WalletGhost bonusLive={false} />", "1.4 ·", "the bonus answer not asked (a live programme's second card never ghosted)"],
  ["src/app/wallet/wallet-ghost.tsx", '{bonusLive && (', '{false && (', "1.4 ·", "the drawing ignoring the bonus answer"],
  ["src/app/positions/loading.tsx", 'at="/positions"', 'at="/updown/history"', "2.1 ·", "a journey reader's /positions pinned to the round history's picture"],
  ["src/app/updown/history/loading.tsx", "  return <UpDownHistoryGhost />;\n", "  return <UpDownHistoryGhost journeyHead={null} />;\n", "2.1 ·", "the classic history drawing handed a prop it does not need"],
  ["src/components/journey/route-ghost.tsx", "  if (at) return routes[at];\n", "", "2.2′", "the pin ignored (the spinner over /positions/performance)"],
  ["src/app/updown/history/history-ghost.tsx", '"use client";\n\n', '"use client";\n\nimport { TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";\nexport const _h = TicketsHeadGhost;\n', "2.3 ·", "the history drawing loading the journey's head (its code to every classic reader)"],
  ["src/components/journey/journey-flag.tsx", "  useLayoutEffect(() => raiseJourneyFlag(), []);\n", "  useEffect(() => raiseJourneyFlag(), []);\n", "3.2 ·", "the flag raised in a passive effect again"],
  ["src/components/layout/app-shell.tsx", "{journeyShown && <LazyJourneyFlag />}", "{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}", "3.2 ·", "the flag back in a boundary of its own"],
  ["src/lib/journey/journey-on.ts", "    queueMicrotask(announceJourneyFlagAfterCommit);\n", "", "3.3 ·", "the lowering announced only while the mark is still in"],
  ["src/components/ui/not-found-mark.tsx", "  useLayoutEffect(() => announceNotFoundAfterCommit, []);\n", "  useLayoutEffect(() => announceNotFound, []);\n", "3.2 ·", "the not-found mark's going announced in its layout cleanup (reads the old path)"],
  ["src/lib/not-found-mark.ts", '  queueMicrotask(() => { if (typeof window !== "undefined") announceNotFound(); });\n', "  announceNotFound();\n", "3.4 ·", "the after-commit announcement made at once"],
  ["src/components/ui/strip-autoscroll.tsx", "  useLayoutEffect(() => {\n    for (const rail", "  useEffect(() => {\n    for (const rail", "3.6 ·", "the strip's edges marked after the paint again"],
  ["src/components/ui/toast.tsx", null, '\nexport const markToast = () => document.documentElement.setAttribute("data-toast", "");\n', "3.5 ·", "a new, unclassified writer of a DOM mark"],
  ["src/app/wallet/wallet-ghost.tsx", '      <MoneyBarGhost t={t} lenses={[t.common.all, t.wallet.typeIn, t.wallet.typeOut, t.wallet.typeBet, t.wallet.typePayout, t.wallet.typeRefund, t.wallet.typeBonus, t.wallet.typeAdjust]} count={t.wallet.nResults.replace("{n}", "00")} />\n', "", "4.1 ·", "R5-B's finding back: /wallet's ghost with no bar"],
  ["src/app/wallet/wallet-ghost.tsx", '<div className="kp-wallet-door flex justify-end" aria-hidden>', '<div className="flex justify-end" aria-hidden>', "4.1 ·", "the door off the bar's rhythm"],
  ["src/app/wallet/wallet-ghost.tsx", '      <section className="space-y-3">\n', '      <div>\n', "4.1 ·", "the spark and the list two blocks on the 32px rung again", "      </section>\n    </PageContainer>", "      </div>\n    </PageContainer>"],
  ["src/app/wallet/money-bar-ghost.tsx", "rounded-pill border border-transparent bg-bg-overlay px-3 text-[13px]", "rounded-pill border border-transparent bg-bg-overlay px-2.5 text-[13px]", "4.4 ·", "a pill narrower than the kit's"],
  ["src/app/wallet/money-bar-ghost.tsx", "[t.market.oddsAny, t.wallet.stateFlight,", "[t.market.oddsAny, t.wallet.txnStatusConfirmed,", "4.3 ·", "a state word that is not the bar's"],
  ["src/app/wallet/receipts/loading.tsx", "lenses={[t.common.all, t.receipts.lensDeposits, t.receipts.lensWithdrawals]}", "lenses={[t.common.all, t.receipts.lensDeposits]}", "4.3 ·", "the receipts ghost a lens short"],
  ["src/app/wallet/money-bar-ghost.tsx", "            <QueryGroupDivider />\n", "", "4.7 ·", "the groups drawn without their divider (a different wrap)"],
  ["src/app/wallet/money-bar-ghost.tsx", "<p className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\">", "<p data-result-count=\"0\" className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\">", "4.5 ·", "the ghost publishing a result count"],
  // §5 — G-2b's sweep, on disk
  ["src/app/wallet/deposit/deposit-ghost.tsx", "      <BackLinkGhost />\n", '      <div className="h-4 w-[64px] rounded bg-bg-overlay kp-shimmer-track" aria-hidden />\n', "5.1 ·", "the deposit ghost's back link a 20px bar again"],
  ["src/app/agent/invite/[token]/loading.tsx", " back={false} />", " />", "5.1 ·", "the invitation's ghost drawing a back link its page does not have"],
  ["src/components/ui/back-link.tsx", '<div className="flex min-h-[44px] items-center" aria-hidden>', '<div className="flex min-h-[20px] items-center" aria-hidden>', "5.1 ·", "the back link's ghost box 20px instead of the link's 44"],
  ["src/app/results/loading.tsx", '        <div className="min-w-0 flex-1">\n', '        <div className="flex flex-col gap-5">\n', "5.2 ·", "/results' carousel and grid back in a flex column (48px between them)"],
  ["src/app/markets/loading.tsx", 'h-[44px] w-[170px] rounded-pill bg-bg-elevated lg:hidden', "h-[44px] w-[170px] rounded-pill bg-bg-elevated", "5.3 ·", "/markets' Filters pill drawn at 1280 again"],
  ["src/app/live/loading.tsx", '<div className="relative z-10 p-5 lg:p-6">', '<div className="relative z-10 p-5">', "5.4 ·", "/live's hero 16px short from 1024 again"],
  ["src/app/wallet/receipts/loading.tsx", '<div className="h-[18px] w-[88px] rounded-pill', '<div className="h-[22px] w-[88px] rounded-pill', "5.5 ·", "the receipts row's chip line 22px again"],
  ["src/app/profile/loading.tsx", '<div className="grid grid-cols-1 gap-3 md:grid-cols-2">', '<div className="grid grid-cols-1 gap-2 md:grid-cols-2">', "5.6 ·", "/profile's grid on 12px again"],
  ["src/app/agent/loading.tsx", " subtitle={t.agent.heroSub} />", " />", "5.7 ·", "/agent's header without the page's subtitle"],
  ["src/app/updown/updown-ghost.tsx", '      <div className="mt-4 sm:hidden" aria-hidden>\n', '      <div className="mt-4 hidden" aria-hidden>\n', "5.8 ·", "/updown's phone trigger gone (both pill rows on a phone again)", '<div className="mt-4 hidden gap-2 sm:flex" aria-hidden>', '<div className="mt-4 flex gap-2" aria-hidden>'],
  ["src/app/updown/[roundId]/loading.tsx", "items-start gap-4 lg:[grid-template-columns", "items-start gap-4 xl:[grid-template-columns", "5.9 ·", "the round's two columns from xl again"],
  ["src/app/markets/[id]/loading.tsx", '<div className="mb-3 flex h-[40px] items-center gap-2">', '<div className="mb-3 flex items-center gap-2">', "5.10 ·", "the question's chips row back to its chips' height"],
  ["src/components/journey/tickets/tickets-ghost.tsx", ' data-rail-ghost=""', "", "5.11 ·", "Tiketi zangu's rail ghost without R5-B's hook"],
  ["src/app/updown/history/history-ghost.tsx", "<div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`} aria-hidden>", "<div className=\"mt-5\" aria-hidden>", "5.12 ·", "the round history's search band gone"],
];
const run = () => {
  try { return { code: 0, out: execFileSync("npx", ["tsx", "scripts/visual-pass-r5h.test.mts"], { cwd: ROOT, encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};
const touched = [...new Set(PLANTS.map((p) => p[0]))];
const manifest = Object.fromEntries(touched.map((f) => [f, sha(readFileSync(ROOT + f))]));
const baseline = run();
console.log(`baseline: exit ${baseline.code} — ${/visual-pass-r5h: (\d+) passed, (\d+) failed/.exec(baseline.out)?.[0]}`);
if (baseline.code !== 0) process.exit(1);
let caught = 0, restored = 0;
for (const [file, from, to, expect, why, from2, to2] of PLANTS) {
  const orig = readFileSync(ROOT + file);
  const text = orig.toString("utf8").replace(/\r\n/g, "\n");
  let planted;
  if (from === null) planted = text + to;
  else {
    if (text.split(from).length !== 2) { console.log(`NOT LANDED (${text.split(from).length - 1} matches) · ${file} · ${why}`); continue; }
    planted = text.replace(from, () => to);
    if (from2) { if (planted.split(from2).length !== 2) { console.log(`NOT LANDED (second part) · ${file} · ${why}`); continue; } planted = planted.replace(from2, () => to2); }
  }
  writeFileSync(ROOT + file, crlf(planted));
  const r = run();
  writeFileSync(ROOT + file, orig);
  const back = sha(readFileSync(ROOT + file)) === sha(orig);
  if (back) restored++;
  const failed = [...r.out.matchAll(/^\s+FAIL (\S+(?: ·|′|″)?)/gm)].map((m) => m[1]);
  const hit = r.code !== 0 && r.out.split(/\r?\n/).some((l) => l.trimStart().startsWith(`FAIL ${expect}`) || (expect.endsWith("′") && l.trimStart().startsWith(`FAIL ${expect}`)));
  if (hit) caught++;
  console.log(`${hit ? "CAUGHT " : "MISSED "} ${expect.padEnd(5)} ${why} — ${file}${hit ? "" : ` (failed instead: ${failed.join(", ") || "nothing"}; exit ${r.code})`}${back ? "" : " · NOT RESTORED"}`);
}
const after = Object.entries(manifest).filter(([f, h]) => sha(readFileSync(ROOT + f)) !== h).map(([f]) => f);
const final = run();
console.log(`\n${caught}/${PLANTS.length} caught on the named check · ${restored}/${PLANTS.length} restored byte-identical · ${touched.length - after.length}/${touched.length} files match their sha-256 from before${after.length ? ` (DIFFER: ${after.join(", ")})` : ""} · the suite after: exit ${final.code}`);
process.exit(caught === PLANTS.length && restored === PLANTS.length && after.length === 0 && final.code === 0 ? 0 : 1);
