// R5-H · the pins R5-D's suite holds that G-2 moved, each with its reason. CRLF (lib.cjs).
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5d.test.mts", (s) => {
  // 2.1 — the root ghost's signature: the rails, and (R5-H) a segment's pinned page.
  s = once(s, '  const shape = (s: string) => hasDirective(s, "use client") && s.includes("export function JourneyRouteGhost({ rails }: { rails: readonly string[] }) {")\n',
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): the binding also takes `at`, the page a segment's own loading file pins it\n"
    + "  // to (`/positions`, `/updown/history` — `test:visual-pass-r5h` §2 holds the two).\n"
    + '  const shape = (s: string) => hasDirective(s, "use client") && s.includes("export function JourneyRouteGhost({ rails, at }: { rails: readonly string[]; at?: JourneyGhostPage }) {")\n', "2.1");
  // The drawings the controls rebuild: Tiketi zangu's head too.
  s = once(s, 'const { TicketsGhost } = req("../src/components/journey/tickets/tickets-ghost.tsx") as { TicketsGhost: unknown };\n',
    'const { TicketsGhost, TicketsHeadGhost } = req("../src/components/journey/tickets/tickets-ghost.tsx") as { TicketsGhost: unknown; TicketsHeadGhost: unknown };\n'
    + 'const { LazyJourneyRouteGhost } = req("../src/components/journey/route-ghost-lazy.tsx") as { LazyJourneyRouteGhost: unknown };\n', "imports");
  s = once(s, "collectClientRefs();\nconst GHOST_MARKUP = /kp-hero|kp-hub|kp-shimmer-track|kp-hghost|aria-busy/;\n",
    "collectClientRefs();\nconst GHOST_MARKUP = /kp-hero|kp-hub|kp-shimmer-track|kp-hghost|aria-busy/;\n"
    + "/**\n * What a client drawing returns, captured inside a React render (its `useT` needs one) at the reader's language: the tree\n"
    + " * a SERVER component drawing it would have written into the payload (round 5's follow-up, R5-H · G-2 — the drawings read\n"
    + " * their own words now, so a control can no longer call them as functions).\n */\n"
    + "function drawnTree(el: unknown, l: Locale): unknown {\n"
    + "  const box: { tree?: unknown } = {};\n"
    + "  const { type, props } = el as { type: (p: unknown) => unknown; props: unknown };\n"
    + "  const Capture = () => { box.tree = type(props); return null; };\n"
    + "  const { AppRouterContext: Router } = req(\"next/dist/shared/lib/app-router-context.shared-runtime\") as { AppRouterContext: import(\"react\").Context<unknown> };\n"
    + "  renderToStaticMarkup(h(Router.Provider, { value: { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} } }, h(I18nProvider as never, { initial: l } as never, h(Capture))));\n"
    + "  return box.tree;\n"
    + "}\n", "drawnTree");
  // 2.6′ — the control rebuilds the server-drawn shape honestly: each drawing's own tree, as a server component wrote it.
  s = once(s, "  const t = dict.sw;\n  const before = h(RoutePick as never, {\n"
    + '    routes: { "/updown": h(UpDownGhost as never, { t }), "/positions": h(TicketsGhost as never, { t }), "/updown/history": h(UpDownHistoryGhost as never, { t, journey: true }),\n'
    + '      "/wallet/deposit": h(DepositGhost as never, { t }), "/wallet/deposit/return": h(DepositReturnLoading as never) },\n'
    + '    patterns: [["^/markets/[^/]+$", h(MarketDetailLoading as never)]], other: null,\n'
    + "  } as never);\n",
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): the shared drawings are client code reading their own words, so the\n"
    + "  // server-drawn shape is rebuilt from each one's own tree (`drawnTree`) — handed `{ t }` as before, a client reference\n"
    + "  // would serialize the whole dictionary as a prop, a number that measures nothing.\n"
    + "  const t = dict.sw;\n  const before = h(RoutePick as never, {\n"
    + '    routes: { "/updown": drawnTree(h(UpDownGhost as never), "sw"), "/positions": h(TicketsGhost as never, { t }),\n'
    + '      "/updown/history": drawnTree(h(UpDownHistoryGhost as never, { journeyHead: h(TicketsHeadGhost as never, { t }) }), "sw"),\n'
    + '      "/wallet/deposit": drawnTree(h(DepositGhost as never), "sw"), "/wallet/deposit/return": drawnTree(h(DepositReturnLoading as never), "sw") },\n'
    + '    patterns: [["^/markets/[^/]+$", drawnTree(h(MarketDetailLoading as never), "sw")]], other: null,\n'
    + "  } as never);\n", "2.6'");
  s = once(s, "    Buffer.byteLength(beforeJson) > 10_000 && GHOST_MARKUP.test(beforeJson), String(Buffer.byteLength(beforeJson)));\n",
    "    Buffer.byteLength(beforeJson) > 10_000 && Buffer.byteLength(beforeJson) < 40_000 && GHOST_MARKUP.test(beforeJson), String(Buffer.byteLength(beforeJson)));\n", "2.6'b");
  // 2.10 — the segment's journey arm is the root's binding, pinned to its page: drawn as what it binds.
  s = once(s, "  const differ: string[] = [];\n  for (const [path, file] of CASES) for (const l of LOCALES) {\n"
    + "    REQ.locale = l; REQ.path = path; REQ.journey = true;\n"
    + "    const own = inApp(path, l, await load(file)());\n",
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): a journey reader's /positions and /updown/history loading files hand back\n"
    + "  // the journey's own binding pinned to their page (`at`), which a browser draws as `JourneyRouteGhost` once its chunk\n"
    + "  // is in — drawn here as what it binds (2.10″ holds that it is that binding, and that page).\n"
    + "  const asDrawn = (el: unknown) => {\n"
    + "    const e = el as { type?: unknown; props?: Record<string, unknown> };\n"
    + "    return e && e.type === LazyJourneyRouteGhost ? h(JourneyRouteGhost as never, e.props as never) : el;\n"
    + "  };\n"
    + "  const differ: string[] = [], pinned: string[] = [];\n  for (const [path, file] of CASES) for (const l of LOCALES) {\n"
    + "    REQ.locale = l; REQ.path = path; REQ.journey = true;\n"
    + "    const el = await load(file)() as { type?: unknown; props?: { at?: string } };\n"
    + "    if (el.type === LazyJourneyRouteGhost) pinned.push(`${path}=${el.props?.at}`);\n"
    + "    const own = inApp(path, l, asDrawn(el));\n", "2.10");
  s = once(s, "  ok(`2.10 · one drawing: each page's own loading file, RUN for a journey reader, and the root ghost at its address write the same bytes (${CASES.length} pages × 3 languages)`,\n"
    + "    differ.length === 0, differ.join(\", \"));\n",
    "  ok(`2.10 · one drawing: each page's own loading file, RUN for a journey reader, and the root ghost at its address write the same bytes (${CASES.length} pages × 3 languages)`,\n"
    + "    differ.length === 0, differ.join(\", \"));\n"
    + "  ok(\"2.10″ · …and where a journey reader's picture differs from a classic reader's (/positions, /updown/history) the loading file hands back the journey's own binding pinned to its own page — in every language\",\n"
    + "    j([...new Set(pinned)].sort()) === j([\"/positions=/positions\", \"/updown/history=/updown/history\"]), j([...new Set(pinned)]));\n", "2.10''");
  return s;
});
