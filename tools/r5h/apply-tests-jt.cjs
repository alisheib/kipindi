// R5-H · journey-tickets §10: the pictures are still PICKED on the server (§0h point 21) and now DRAWN in the browser (G-2).
// The checks move with them; every red plant still lands and is caught (one new plant for each new rule). CRLF (lib.cjs).
const { rd, once, edit } = require("./lib.cjs");
const P = "scripts/journey-tickets.test.mts";
edit(P, (s) => {
  // The header's description of §10.
  s = once(s, " *   §10 LOADING AND ERRORS (§0h point 21) — each loading file asks the per-request resolver beside the words and\n"
    + " *      returns ONE ghost by its answer: the journey's for a journey request, today's (kept whole) for everybody else,\n"
    + " *      both picked and drawn on the server. The error pages",
    " *   §10 LOADING AND ERRORS (§0h point 21) — each loading file asks the per-request resolver, and nothing else, and\n"
    + " *      returns ONE picture by its answer: the journey's for a journey request, today's (kept whole) for everybody else —\n"
    + " *      picked on the server, drawn in the browser since round 5's follow-up (R5-H, G-2: a refresh carries a reference,\n"
    + " *      not a tree), and a classic reader is sent no script for the journey's picture. The error pages", "header");
  // The World holds the two new drawings' files and the journey's route ghost.
  s = once(s, '/** Round 5 (review G1): the history loading file hands its answer to this drawing, which the journey\'s root ghost also draws. */\nconst HISTORY_GHOST = "src/app/updown/history/history-ghost.tsx";\n',
    '/** Round 5 (review G1): the history loading file hands its answer to this drawing, which the journey\'s root ghost also draws. */\nconst HISTORY_GHOST = "src/app/updown/history/history-ghost.tsx";\n'
    + "/** Round 5's follow-up (R5-H, G-2): today's /positions picture, drawn in the browser, and the journey's route ghost — the\n"
    + " *  root's, which a journey reader's two loading files hand back pinned to their page — with the binding they render. */\n"
    + 'const POSITIONS_GHOST = "src/app/positions/positions-ghost.tsx";\n'
    + 'const ROUTE_GHOST = "src/components/journey/route-ghost.tsx";\n'
    + 'const ROUTE_GHOST_LAZY = "src/components/journey/route-ghost-lazy.tsx";\n', "consts");
  s = once(s, "const SOURCES = [PAGE, BAR, LOADING, ERROR, HISTORY, HISTORY_LOADING, HISTORY_GHOST, HISTORY_ERROR, ...JOURNEY_FILES,\n",
    "const SOURCES = [PAGE, BAR, LOADING, ERROR, HISTORY, HISTORY_LOADING, HISTORY_GHOST, POSITIONS_GHOST, ROUTE_GHOST, HISTORY_ERROR, ...JOURNEY_FILES,\n", "sources");
  // §10's constants and its three checks.
  const a = s.indexOf("/** The one line each loading file opens with: the words and the shell's own answer, asked together. */\n");
  const b = s.indexOf("  const errors = ERROR_ARMS.filter(");
  if (a < 0 || b < 0) throw new Error("§10 block");
  const oldBlock = s.slice(a, b);
  const keep = (from, to) => { const x = oldBlock.indexOf(from), y = oldBlock.indexOf(to); if (x < 0 || y < 0) throw new Error(`keep ${from}`); return oldBlock.slice(x, y); };
  // Kept verbatim: CLASSIC_GHOST, HISTORY_GHOST_LINES, VALUE_IMPORT + loadsOf, ticketFiles, ERROR_ARMS.
  const classicGhost = keep("/** Today's ghost, block by block:", "const HISTORY_GHOST_LINES = [");
  const historyLines = keep("const HISTORY_GHOST_LINES = [", "const HISTORY_GHOST_OPEN = ");
  const tail = keep("/** A VALUE import's module specifier", "function g10Loading(W: World, ok: Ok) {");
  const block =
    "/** The one line each loading file opens with since round 5's follow-up (R5-H, G-2): the shell's own answer, asked alone —\n"
    + " *  the drawings read their words in the browser. */\n"
    + "const ASK = \"const { journey } = await resolveSimpleJourney();\";\n"
    + "const SESSION_READS = [\"currentSession(\", \"cookies(\", \"headers(\", \"getServerT(\"];\n"
    + "/** A journey request's picture: the journey's route ghost (the root's binding), pinned to the page. */\n"
    + "const JOURNEY_GHOST_RETURN = 'if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at=\"/positions\" />;';\n"
    + "const HISTORY_JOURNEY_RETURN = 'if (journey) return <LazyJourneyRouteGhost rails={heroRailNames(null)} at=\"/updown/history\" />;';\n"
    + "/** Everybody else's: today's drawing, the loading file's one classic return. */\n"
    + "const CLASSIC_PICK = \"return <PositionsGhost />;\";\n"
    + "const HISTORY_CLASSIC_PICK = \"return <UpDownHistoryGhost />;\";\n"
    + classicGhost + historyLines
    + "/** The history drawing's two head lines: today's, or the head it is handed (the journey's, from the route ghost). */\n"
    + "const HISTORY_GHOST_OPEN = \"{journeyHead ? journeyHead\";\n"
    + "const HISTORY_GHOST_HEAD = [`{journeyHead ? journeyHead : ${HISTORY_GHOST_LINES[0]}}`, `{journeyHead ? null : ${HISTORY_GHOST_LINES[1]}}`].join(\"\");\n"
    + "/** The one place the journey's history head is drawn: the route ghost's history entry. */\n"
    + "const ROUTE_HISTORY_ENTRY = '\"/updown/history\": <UpDownHistoryGhost journeyHead={<TicketsHeadGhost t={t} />} />';\n"
    + tail
    + "function g10Loading(W: World, ok: Ok) {\n"
    + "  const loading = text(W, LOADING);\n"
    + "  const hloading = text(W, HISTORY_LOADING);\n"
    + "  const reading = [LOADING, HISTORY_LOADING].flatMap((f) => SESSION_READS.filter((r) => text(W, f).includes(r)).map((r) => `${f}: ${r}`));\n"
    + "  ok(\"10.loading · each loading file asks the per-request resolver, and nothing else — no words (the drawings read theirs in the browser since R5-H) and no session of its own (§0h point 21)\",\n"
    + "    count(loading, ASK) === 1 && count(hloading, ASK) === 1 && count(loading, \"resolveSimpleJourney(\") === 1\n"
    + "      && count(hloading, \"resolveSimpleJourney(\") === 1 && reading.length === 0,\n"
    + "    show({ positions: count(loading, ASK), history: count(hloading, ASK), reading }));\n"
    + "  const body = after(loading, \"export default async function PositionsLoading(\");\n"
    + "  const asked = body.indexOf(ASK);\n"
    + "  const early = body.indexOf(JOURNEY_GHOST_RETURN);\n"
    + "  const classic = body.indexOf(CLASSIC_PICK);\n"
    + "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): today's picture is drawn in the browser, by `PositionsGhost` beside the\n"
    + "  // loading file — every block of it held there; the history drawing takes the journey's head as `journeyHead`.\n"
    + "  const ghost = text(W, POSITIONS_GHOST);\n"
    + "  const gbody = after(ghost, \"export function PositionsGhost(\");\n"
    + "  const lost = CLASSIC_GHOST.filter((b) => !(count(ghost, b) === 1 && gbody.indexOf(b) > gbody.indexOf(CLASSIC_RETURN)));\n"
    + "  const hghost = text(W, HISTORY_GHOST);\n"
    + "  const historyHead = siblingTernaries(hghost, HISTORY_GHOST_OPEN, \"{journeyHead ? null : \");\n"
    + "  const hbody = after(hloading, \"export default async function UpDownHistoryLoading(\");\n"
    + "  ok(\"10.ghost · each loading file returns ONE picture by the answer: a journey request the journey's route ghost pinned to the page, BEFORE its one classic return — today's drawing, which keeps every block of today's; the history drawing swaps only its two head lines, each a sibling ternary where it stood, and the journey's head is drawn in one place, the route ghost\",\n"
    + "    asked > 0 && early > asked && classic > early && count(loading, JOURNEY_GHOST_RETURN) === 1 && count(loading, CLASSIC_PICK) === 1\n"
    + "      && count(ghost, CLASSIC_RETURN) === 1 && lost.length === 0\n"
    + "      && hbody.indexOf(ASK) > 0 && hbody.indexOf(HISTORY_JOURNEY_RETURN) > hbody.indexOf(ASK) && hbody.indexOf(HISTORY_CLASSIC_PICK) > hbody.indexOf(HISTORY_JOURNEY_RETURN)\n"
    + "      && count(hloading, HISTORY_JOURNEY_RETURN) === 1 && count(hloading, HISTORY_CLASSIC_PICK) === 1\n"
    + "      && historyHead === HISTORY_GHOST_HEAD && count(hghost, \"<TicketsHeadGhost\") === 0 && count(text(W, ROUTE_GHOST), ROUTE_HISTORY_ENTRY) === 1,\n"
    + "    lost.length > 0 ? `today's ghost lost: ${lost.join(\" · \")}` : historyHead.slice(0, 200));\n"
    + "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): picked on the server, DRAWN IN THE BROWSER. Each loading file stays server\n"
    + "  // code and loads exactly two client modules: the journey's route-ghost binding (the root's, which a journey reader's\n"
    + "  // browser already holds and a classic reader's never fetches) and its own classic drawing — which loads nothing from\n"
    + "  // components/journey/ (a server file's client imports join its segment's first load for every reader: point 21 sends a\n"
    + "  // classic reader no script for the journey's picture). Tiketi zangu's drawings stay a module with no directive that only\n"
    + "  // the route ghost loads.\n"
    + "  const pickers = [[LOADING, POSITIONS_GHOST], [HISTORY_LOADING, HISTORY_GHOST]] as const;\n"
    + "  const serverSide = pickers.filter(([f]) => isClient(text(W, f)) || text(W, f).includes(\"useJourneyOn\")).map(([f]) => f);\n"
    + "  const wrongLoads = pickers.filter(([f, own]) => show(loadsOf(W, f).filter((l) => isClient(textOf(W, l))).sort()) !== show([ROUTE_GHOST_LAZY, own].sort())).map(([f]) => `${f} loads ${show(loadsOf(W, f).filter((l) => isClient(textOf(W, l))))}`);\n"
    + "  const classicDrawings = pickers.map(([, own]) => own);\n"
    + "  const notClient = classicDrawings.filter((f) => !isClient(text(W, f)) || text(W, f).includes(\"useJourneyOn\"));\n"
    + "  const journeyInClassic = classicDrawings.flatMap((f) => loadsOf(W, f).filter((l) => l.startsWith(\"src/components/journey/\")).map((l) => `${f} loads ${l}`));\n"
    + "  const tiketi = ticketFiles();\n"
    + "  const clientTiketi = tiketi.filter((f) => f !== RAIL && isClient(textOf(W, f)));\n"
    + "  const ghostLoaders = [...new Set([...Object.keys(W.files), ...srcFiles().filter((f) => /[.]tsx?$/.test(f))])].filter((f) => f !== GHOST && loadsOf(W, f).includes(GHOST)).sort();\n"
    + "  ok(\"10.pick · the pictures are picked on the server and drawn in the browser: each loading file is server code that reads no flag hook and loads two client modules, the journey's route-ghost binding and its own classic drawing; the classic drawings are client code loading nothing from components/journey/ (§0h point 21); Tiketi zangu's ghosts are loaded by the route ghost alone, and no file in components/journey/tickets/ is client code but the switch's rail wrapper (5.lazy)\",\n"
    + "    text(W, GHOST).length > 0 && serverSide.length === 0 && wrongLoads.length === 0 && notClient.length === 0 && journeyInClassic.length === 0\n"
    + "      && show(ghostLoaders) === show([ROUTE_GHOST]) && tiketi.length >= 6 && tiketi.includes(RAIL) && isClient(textOf(W, RAIL)) && clientTiketi.length === 0,\n"
    + "    [...serverSide, ...wrongLoads, ...notClient, ...journeyInClassic, ...clientTiketi].join(\", \") || show({ ghostLoaders, files: tiketi.length }));\n";
  s = s.slice(0, a) + block + s.slice(b);
  // The red plants that named the old lines, and one for each new rule.
  s = once(s, 'const notAsked = swap(LOADING, ASK_BOTH, "const { t } = await getServerT(); const journey = false;");\n',
    'const notAsked = swap(LOADING, ASK, "const journey = false;");\n', "plant notAsked");
  s = once(s, "const sessionRead = swap(HISTORY_LOADING, ASK_BOTH, `${ASK_BOTH}${LF}  await currentSession();`);\n",
    "const sessionRead = swap(HISTORY_LOADING, ASK, `${ASK}${LF}  await currentSession();`);\n"
    + "const wordsOnServer = swap(LOADING, ASK, `const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);`);\n", "plant sessionRead");
  s = once(s, 'const journeyForAll = swap(LOADING, JOURNEY_GHOST_RETURN, "return <TicketsGhost t={t} />;");\n',
    "const journeyForAll = swap(LOADING, JOURNEY_GHOST_RETURN, JOURNEY_GHOST_RETURN.replace(\"if (journey) \", \"\"));\n"
    + "const pinnedElsewhere = swap(LOADING, JOURNEY_GHOST_RETURN, JOURNEY_GHOST_RETURN.replace('at=\"/positions\"', 'at=\"/updown/history\"'));\n", "plant journeyForAll");
  s = once(s, 'const classicBlockLost = swap(LOADING, CLASSIC_GHOST[3], "<div aria-hidden>");\n',
    'const classicBlockLost = swap(POSITIONS_GHOST, CLASSIC_GHOST[3], "<div aria-hidden>");\n', "plant classicBlockLost");
  s = once(s, 'const historyGhostForAll = swap(HISTORY_GHOST, HISTORY_GHOST_OPEN, "{true ? <TicketsHeadGhost");\n',
    "const historyGhostForAll = withFile(HISTORY_GHOST, (x) => `import { TicketsHeadGhost } from \"@/components/journey/tickets/tickets-ghost\";${LF}${x.split(HISTORY_GHOST_OPEN).join(\"{true ? <TicketsHeadGhost t={t} />\")}`);\n"
    + "const classicLoadsJourney = withFile(POSITIONS_GHOST, (x) => `import { TicketsGhost } from \"@/components/journey/tickets/tickets-ghost\";${LF}${x}`);\n"
    + "const classicOnServer = withFile(POSITIONS_GHOST, (x) => x.replace(`\"use client\";`, \"\"));\n", "plant historyGhostForAll");
  s = once(s, '  { name: "the history loading file reads the session itself", expect: ["10.loading"], world: sessionRead, landed: changed(sessionRead, HISTORY_LOADING) },\n',
    '  { name: "the history loading file reads the session itself", expect: ["10.loading"], world: sessionRead, landed: changed(sessionRead, HISTORY_LOADING) },\n'
    + '  { name: "the positions loading file reads the words on the server again (the drawing in every refresh)", expect: ["10.loading"], world: wordsOnServer, landed: changed(wordsOnServer, LOADING) },\n', "entry words");
  s = once(s, '  { name: "today\'s ghost loses a block (the exposure bar)", expect: ["10.ghost"], world: classicBlockLost, landed: changed(classicBlockLost, LOADING) },\n',
    '  { name: "a journey reader\'s /positions pinned to another page\'s picture", expect: ["10.ghost"], world: pinnedElsewhere, landed: changed(pinnedElsewhere, LOADING) },\n'
    + '  { name: "today\'s ghost loses a block (the exposure bar)", expect: ["10.ghost"], world: classicBlockLost, landed: changed(classicBlockLost, POSITIONS_GHOST) },\n', "entry blockLost");
  s = once(s, '  { name: "the ghosts become client code (picked in the browser again)", expect: ["10.pick"], world: ghostsInBrowser, landed: changed(ghostsInBrowser, GHOST) },\n',
    '  { name: "Tiketi zangu\'s ghosts become a client boundary (a server file could load their code for every reader)", expect: ["10.pick"], world: ghostsInBrowser, landed: changed(ghostsInBrowser, GHOST) },\n'
    + '  { name: "today\'s /positions picture loads the journey\'s ghost (its code to every classic reader)", expect: ["10.pick"], world: classicLoadsJourney, landed: changed(classicLoadsJourney, POSITIONS_GHOST) },\n'
    + '  { name: "today\'s /positions picture drawn on the server again (its tree in every refresh)", expect: ["10.pick"], world: classicOnServer, landed: changed(classicOnServer, POSITIONS_GHOST) },\n', "entry ghosts");
  return s;
});
// ASK_BOTH must be gone everywhere (no stale reference).
if (rd(P).includes("ASK_BOTH")) throw new Error("ASK_BOTH still referenced");
