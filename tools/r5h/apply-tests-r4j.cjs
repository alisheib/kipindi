// R5-H · the pins R4-J's suite holds that G-2 and G-3 moved, each with its reason. CRLF (lib.cjs).
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r4j.test.mts", (s) => {
  s = once(s, "  // drawing: one drawing, never redrawn. [the ghost's use, its import, the page's loading file, what that file renders]\n"
    + "  const own: Array<[string, string, string, string]> = [\n"
    + "    ['\"/updown\": <UpDownGhost t={t} />', 'import { UpDownGhost } from \"@/app/updown/updown-ghost\";', \"src/app/updown/loading.tsx\", \"return <UpDownGhost t={t} />;\"],\n"
    + "    ['\"/updown/history\": <UpDownHistoryGhost t={t} journey />', 'import { UpDownHistoryGhost } from \"@/app/updown/history/history-ghost\";', \"src/app/updown/history/loading.tsx\", \"return <UpDownHistoryGhost t={t} journey={journey} />;\"],\n"
    + "    ['\"/wallet/deposit\": <DepositGhost t={t} />', 'import { DepositGhost } from \"@/app/wallet/deposit/deposit-ghost\";', \"src/app/wallet/deposit/loading.tsx\", \"return <DepositGhost t={t} />;\"],\n",
    "  // drawing: one drawing, never redrawn. [the ghost's use, its import, the page's loading file, what that file renders]\n"
    + "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): the shared drawings read their own words (`useT`), so neither the root\n"
    + "  // ghost nor the loading file hands them any; the round history takes the journey's head as `journeyHead` (its module\n"
    + "  // loads nothing of the journey's), and a journey reader's /positions is the root ghost pinned to the page.\n"
    + "  const own: Array<[string, string, string, string]> = [\n"
    + "    ['\"/updown\": <UpDownGhost />', 'import { UpDownGhost } from \"@/app/updown/updown-ghost\";', \"src/app/updown/loading.tsx\", \"return <UpDownGhost />;\"],\n"
    + "    ['\"/updown/history\": <UpDownHistoryGhost journeyHead={<TicketsHeadGhost t={t} />} />', 'import { UpDownHistoryGhost } from \"@/app/updown/history/history-ghost\";', \"src/app/updown/history/loading.tsx\", \"return <UpDownHistoryGhost />;\"],\n"
    + "    ['\"/wallet/deposit\": <DepositGhost />', 'import { DepositGhost } from \"@/app/wallet/deposit/deposit-ghost\";', \"src/app/wallet/deposit/loading.tsx\", \"return <DepositGhost />;\"],\n", "3.4 own");
  s = once(s, "      && read(\"src/app/positions/loading.tsx\").includes(\"if (journey) return <TicketsGhost t={t} />;\") && oneDrawing(ghost).length === 0,\n",
    "      && read(\"src/app/positions/loading.tsx\").includes('if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at=\"/positions\" />;') && oneDrawing(ghost).length === 0,\n", "3.4 positions");
  s = once(s, "    oneDrawing(ghost.replace('\"/updown\": <UpDownGhost t={t} />', '\"/updown\": <div className=\"mx-auto w-full max-w-board px-3 lg:px-6 py-6\" aria-busy=\"true\" />')).length === 1);\n",
    "    oneDrawing(ghost.replace('\"/updown\": <UpDownGhost />', '\"/updown\": <div className=\"mx-auto w-full max-w-board px-3 lg:px-6 py-6\" aria-busy=\"true\" />')).length === 1);\n", "3.4'");
  // 5.2 — the mark's going: announced once the commit that takes it out is done, before its paint (G-3's phases).
  s = once(s, "&& squash(s).includes(\"useEffect(() => announceNotFound, []);\")\n",
    "&& squash(s).includes(\"useLayoutEffect(() => announceNotFoundAfterCommit, []);\")\n", "5.2 markOk");
  s = once(s, "  ok(\"5.2 · NotFoundMark writes the hidden span with the path it was drawn for, announces its coming in a LAYOUT effect (before that commit's paint) and its going in a passive cleanup (after the span is out)\",\n",
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-3): its going is announced once the commit that takes the span out is done —\n"
    + "  // a microtask queued from its layout cleanup — so before that commit's paint, as the journey flag's lowering is.\n"
    + "  ok(\"5.2 · NotFoundMark writes the hidden span with the path it was drawn for, announces its coming in a LAYOUT effect (before that commit's paint) and its going once that commit is done, still before its paint (the span is out by then)\",\n", "5.2 label");
  s = once(s, "!markOk(mark.replace(\"useEffect(() => announceNotFound, []);\", \"\"))",
    "!markOk(mark.replace(\"useLayoutEffect(() => announceNotFoundAfterCommit, []);\", \"\"))", "5.2'");
  return s;
});
