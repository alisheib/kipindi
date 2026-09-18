/**
 * THE DECLARED MUTATIONS behind `red:house-bot-console` (C7-SPEC ruling 318; PLAN §12's RED-harness line names the
 * console by name, so ruling 217's "no new red key" is kept).
 *
 * ⛔ WHY THEY ARE DECLARED HERE AND NOT INSIDE THE HARNESS. `test:red-anchors` §3 imports this file and resolves every
 * `from` against the working tree, insisting it matches EXACTLY ONCE — so an anchor that rots is reported by a suite
 * that runs every day, rather than by a harness nobody ran. §4's ratchet counts harnesses that do NOT declare, and it
 * is never raised: declaring is the only way in.
 *
 * ⚠️ EACH ENTRY MUST FAIL ITS OWN ASSERTION. `expect` is matched against the FAIL lines of the run, so a mutation that
 * goes red somewhere else is reported as WRONG-ASSERTION, not as caught. That is the whole value of the drive: a guard
 * that goes red for the wrong reason is a guard that will go green for the wrong reason too.
 *
 * ⛔ NOT RUN BY THE CHECKPOINT THAT WROTE THEM (ruling 275): the batch belongs to the commit close, once, from a
 * temporary worktree on its own scratch Postgres port.
 */
const PAGE = "src/app/admin/desk/page.tsx";
const LOADING = "src/app/admin/desk/loading.tsx";
const GATE = "src/lib/server/house-console-read.ts";
const ROUTES = "src/lib/house-bot/console-routes.ts";
const NAV = "src/components/admin/admin-nav-groups.ts";
const ROLES = "src/lib/server/roles.ts";
const DESIG = "src/lib/server/house-bot/designation.ts";
/* ⛔ THIS FILE IS ITSELF A TARGET, for the one assertion whose subject is this file: 1.318's roll-call. */
const ANCHORS = "scripts/anchors/house-bot-console.anchors.mjs";

export const MUTATIONS = [
  /* ── Ruling 453 · THE NEUTRAL LEXICON. Four mutations, one per sentence the ruling fixes. ─────────────────────── */
  {
    name: "453-title · the head title says the feature's name again",
    file: PAGE,
    from: `        title="Desk"`,
    to: `        title="House bots"`,
    expect: "4.453 · ⛔ RULING 453",
    suite: "console-mem",
  },
  {
    name: "453-aria · the switch's aria-label says the feature's name again",
    file: PAGE,
    from: `aria-label="Desk master switch"`,
    to: `aria-label="House bots master switch"`,
    expect: "4.453 · ⛔ RULING 453",
    suite: "console-mem",
  },
  {
    name: "453-off · the OFF sentence goes back to ruling 306's original words",
    file: GATE,
    from: `        : "The desk is off. Nothing will be staked.";`,
    to: `        : "House bots are off. No bot will place a bet.";`,
    expect: "3.453 · not one painted string of ANY state carries a house-vocabulary word",
    suite: "console-mem",
  },
  {
    name: "453-accounts · the fourth tile is labelled Bots again",
    file: GATE,
    from: `        ? { label: "Accounts", value:`,
    to: `        ? { label: "Bots", value:`,
    expect: "3.453 · not one painted string of ANY state carries a house-vocabulary word",
    suite: "console-mem",
  },

  /* ── Rulings 300, 340, 341, 380 · the audience, and the order it is decided in. ───────────────────────────────── */
  {
    name: "300-order · the page stops awaiting the verdict before it reads",
    file: PAGE,
    from: `  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/desk"))) return null;`,
    to: `  void houseConsoleAudience;`,
    expect: "1.300 · the page awaits `houseConsoleAudience` with a literal route BEFORE it calls the gated reader",
    suite: "console-mem",
  },
  {
    name: "340-null · the reader reads first and decides afterwards",
    file: GATE,
    from: `  if (!(await houseConsoleAudience(viewerUserId, route))) return null;`,
    to: `  const mayView = await houseConsoleAudience(viewerUserId, route);`,
    expect: "1.300 · the reader refuses a PLAYER with `null` and performs ZERO store calls",
    suite: "console-mem",
  },
  {
    name: "341-belt · the gate's own prefix belt is removed, leaving only the roles.ts list a merge can drop",
    file: GATE,
    from: `    if (isHouseConsoleRoute(route)) return isAdmin(viewer.role);`,
    to: `    void isHouseConsoleRoute;`,
    expect: "1.341 · …and the belt is consulted BEFORE `isOwnerOnlyPath`",
    suite: "console-mem",
  },
  {
    name: "341-belt-wide · the belt's predicate matches a look-alike prefix",
    file: GATE,
    from: `  return route === HOUSE_CONSOLE_PREFIX || route.startsWith(\`\${HOUSE_CONSOLE_PREFIX}/\`);`,
    to: `  return route.startsWith(HOUSE_CONSOLE_PREFIX);`,
    expect: "1.341.c1 · the gate's OWN prefix belt answers for the section and everything under it",
    suite: "console-mem",
  },
  {
    name: "322-prefix · the desk leaves OWNER_ONLY_PREFIXES",
    file: ROLES,
    from: `export const OWNER_ONLY_PREFIXES = ["/admin/staff", "/admin/roles", "/admin/desk"] as const;`,
    to: `export const OWNER_ONLY_PREFIXES = ["/admin/staff", "/admin/roles"] as const;`,
    expect: "/admin/desk is Owner-only",
    suite: "rbac",
  },
  {
    name: "321-nav · the nav item stops being ownerOnly, so it enters every staff payload",
    file: NAV,
    from: `      { href: "/admin/desk", label: "Desk", key: "desk", domain: "ops", ownerOnly: true },`,
    to: `      { href: "/admin/desk", label: "Desk", key: "desk", domain: "ops" },`,
    expect: "13 · …and the desk is still absent from SUPPORT's nav",
    suite: "rbac",
  },
  {
    name: "326-key · the ROUTE_KEYS pair is dropped, so the section highlights nothing",
    file: NAV,
    from: `  ["/admin/desk", "desk"],`,
    to: `  ["/admin/live", "live"],`,
    expect: "4 · /admin/desk → desk",
    suite: "admin-nav",
  },

  /* ── Rulings 303, 304, 306, 314 · the strip and the band. ─────────────────────────────────────────────────────── */
  {
    name: "306-count · the unset-limit count is taken over the six money globals, not the eight the switch requires",
    file: GATE,
    from: `  const unsetRequired = control ? REQUIRED_FOR_MASTER_ON.filter((f) => control[f] == null).length : 0;`,
    to: `  const unsetRequired = control ? REQUIRED_FOR_MASTER_ON.slice(0, 6).filter((f) => control[f] == null).length : 0;`,
    expect: "1.306 · with ONLY the two counterparty limits unset it counts 2",
    suite: "console-mem",
  },
  {
    name: "304-notset · an unset limit renders a zero usage instead of a block",
    file: GATE,
    from: `  if (limit == null) return { label, value: "Not set", delta: "nothing can be staked until this limit is set" };`,
    to: `  if (limit == null) return { label, value: formatTzsCompact(Math.max(0, used)), delta: "0% of the limit" };`,
    expect: "1.304 · all three money limits NULL renders three 'Not set' tiles",
    suite: "console-mem",
  },
  {
    name: "314-reason · the roster-full reason is re-typed at the call site instead of read from its one home",
    file: GATE,
    from: `    ? DESIGNATE_COPY.rosterFull(roster.length, control.maxDesignatedBots)`,
    to: `    ? \`The roster is full (\${roster.length} of \${control.maxDesignatedBots}).\``,
    expect: "1.314 · at the configured maximum the reason is `DESIGNATE_COPY.rosterFull(n, max)`",
    suite: "console-mem",
  },
  {
    name: "420-actor · the ON sentence names the actor through a display lookup instead of by id",
    file: GATE,
    from: `           \`switched by \${control?.switchedById ?? "System"}\`,`,
    to: `           \`switched by \${control?.switchedReason ?? "System"}\`,`,
    expect: "1.306 · the ON sentence names the time and the ACTOR BY ID",
    suite: "console-mem",
  },

  /* ── Rulings 346, 347, 355, 356, 361, 421 · the reads and their failures. ─────────────────────────────────────── */
  {
    name: "346-countlive · the Accounts tile takes a second count, which can disagree with the table beside it",
    file: GATE,
    from: `        ? { label: "Accounts", value: \`\${formatNumber(roster.length)} of \${formatNumber(control.maxDesignatedBots)}\`, delta: "designated of max" }`,
    to: `        ? { label: "Accounts", value: \`\${formatNumber(await houseBotStore.countLive())} of \${formatNumber(control.maxDesignatedBots)}\`, delta: "designated of max" }`,
    expect: "1.346 · exactly ONE `listNonRemoved` and ZERO `countLive` per render",
    suite: "console-mem",
  },
  {
    name: "347-second-read · the band's exposure comes from a second query rather than from the rows it renders",
    file: GATE,
    from: `  const exposureUsed = [...(exposure?.values() ?? [])].reduce((n, v) => n + v, 0);`,
    to: `  const exposureUsed = (await houseBookStore.openExposure(null)).reduce((n, r) => n + r.openStakeTzs, 0);`,
    expect: "1.347 · exactly ONE day read and ONE exposure read per render",
    suite: "console-mem",
  },
  {
    name: "356-wallet · the roster reads every holder's live balance for a figure nothing renders",
    file: GATE,
    from: `    const parsed = parseCtx ? parseHouseBotRules(bot.rules, parseCtx) : null;`,
    to: `    const parsed = parseCtx ? parseHouseBotRules(bot.rules, parseCtx) : null; void db.wallet.findByUserId(bot.userId);`,
    expect: "1.356 · ZERO wallet reads",
    suite: "console-mem",
  },
  {
    name: "355-all · the reads are combined with Promise.all, so one failure blanks the page",
    file: GATE,
    from: `  const [controlR, rosterR, dayR, exposureR, ctxR] = await Promise.allSettled([`,
    to: `  const [controlR, rosterR, dayR, exposureR, ctxR] = await Promise.all([`,
    expect: "1.355 · the gated readers combine their reads with a SETTLING combinator",
    suite: "console-mem",
  },
  {
    name: "355-zero · a failed money read paints a fabricated TZS 0 instead of an em dash",
    file: GATE,
    from: `      lossCell: dayBooks == null ? UNREADABLE : moneyUsage(book?.projectedLossTzs ?? 0, bot.capDailyLossTzs),`,
    to: `      lossCell: moneyUsage(book?.projectedLossTzs ?? 0, bot.capDailyLossTzs),`,
    expect: "1.355 · a failed MONEY read renders the kit's `unavailable` tile and the cell '—'",
    suite: "console-mem",
  },
  {
    name: "361-grammar · the usage caption becomes a slash pair instead of the one fixed grammar",
    file: GATE,
    from: `    text: \`used \${uf} of \${lf}\`, used: \`used \${uf}\`, limit: \`of \${lf}\`, money: true,`,
    to: `    text: \`\${uf} / \${lf}\`, used: \`used \${uf}\`, limit: \`of \${lf}\`, money: true,`,
    expect: "1.361 · every usage cell matches the one fixed grammar",
    suite: "console-mem",
  },
  {
    name: "421-schema · an un-migrated database is treated as an ordinary failed read",
    file: GATE,
    from: `  const schemaMissing = controlR.status === "rejected" && controlR.reason instanceof HouseSchemaNotReady;`,
    to: `  const schemaMissing = false as boolean; void HouseSchemaNotReady;`,
    expect: "1.421 · a `HouseSchemaNotReady` renders the schema STATE",
    suite: "console-mem",
  },
  {
    name: "421-rows · the schema state lists the accounts anyway, contradicting its own Callout",
    file: GATE,
    from: `  const rows: ConsoleRosterRow[] | null = schemaMissing ? [] : roster == null ? null : roster.map((bot) => {`,
    to: `  const rows: ConsoleRosterRow[] | null = roster == null ? null : roster.map((bot) => {`,
    expect: "1.421 · a `HouseSchemaNotReady` renders the schema STATE",
    suite: "console-mem",
  },

  /* ── Rulings 302, 312, 313, 319, 403, 407, 417 · the section's own law. ───────────────────────────────────────── */
  {
    name: "312-rail · a tab key is added to the closed list with no panel behind it",
    file: ROUTES,
    from: `export const CONSOLE_TABS = ["roster"] as const;`,
    to: `export const CONSOLE_TABS = ["roster", "limits"] as const;`,
    expect: "1.312a · the rail's options come from the closed list",
    suite: "console-mem",
  },
  {
    name: "302-fallback · an unknown ?tab= is passed through instead of resolving to the roster",
    file: ROUTES,
    from: `  return (CONSOLE_TABS as readonly string[]).includes(one ?? "") ? (one as ConsoleTab) : DEFAULT_TAB;`,
    to: `  return (one ?? DEFAULT_TAB) as ConsoleTab;`,
    expect: "resolves to the roster — never a 404 and never a redirect",
    suite: "console-mem",
  },
  {
    name: "319-literal · a sealed refusal types the route segment again",
    file: DESIG,
    from: `href: CONSOLE_LIMITS_HREF }`,
    to: `href: "/admin/desk?tab=limits" }`,
    expect: "1.319 · the two sealed refusals take their href from that module",
    suite: "console-mem",
  },
  {
    name: "313-loader · the loader's head names the feature, in a body rendered for whoever asked",
    file: LOADING,
    from: `      <AdminPageHead title="Desk" sw="Dawati" actions={<SkChip className="h-[44px] w-48" />} />`,
    to: `      <AdminPageHead title="House bots" sw="Dawati" actions={<SkChip className="h-[44px] w-48" />} />`,
    expect: "1.313 · the roster loader carries the REAL neutral head",
    suite: "console-mem",
  },
  {
    name: "417-ghost · the band's ghost is dropped, so the load→loaded swap jumps by a whole band",
    file: LOADING,
    from: `        <SkKpiRow count={4} />`,
    to: `        {null}`,
    expect: "1.417 · the loader's ghost sequence matches the page's card sequence",
    suite: "console-mem",
  },
  {
    name: "403-gloss · an invented Swahili gloss is passed where no shipped word exists",
    file: PAGE,
    from: `        sw="Dawati"`,
    to: `        sw="Matukio"`,
    expect: "1.403 · every Swahili gloss the section passes occurs verbatim in a shipped source",
    suite: "console-mem",
  },
  {
    name: "407-tabular · a money figure loses `tabular-nums`, so its digits stop lining up column to column",
    file: PAGE,
    from: `  const figure = cell.money ? "amount tabular-nums" : "font-mono tabular-nums";`,
    to: `  const figure = cell.money ? "amount" : "font-mono";`,
    expect: "1.407 / 1.409 · every `<th>` carries `scope=\"col\"`",
    suite: "console-mem",
  },
  {
    name: "373-minw · the money TABLE takes a min-width again, which stretches every column and pushes the answer out of view at 360",
    file: PAGE,
    from: `                <table className="admin-tbl">`,
    to: `                <table className="admin-tbl min-w-[720px]">`,
    expect: "1.373 · the money-bearing TABLE carries no `min-w-*` of its own",
    suite: "console-mem",
  },
  {
    name: "373-subject · the subject column loses its floor, so it absorbs the whole shortfall at 360 again",
    file: PAGE,
    from: `                      <th scope="col" className="text-left p-3 min-w-[150px]">Account</th>`,
    to: `                      <th scope="col" className="text-left p-3">Account</th>`,
    expect: "1.373 · …and only the SUBJECT and STATUS columns carry a floor",
    suite: "console-mem",
  },
  {
    name: "361-parts · a usage half's WORD is folded back into its figure, so the page must put prose in `.amount` again",
    file: GATE,
    from: `    halves: [{ word: "used", figure: uf, suffix: "" }, { word: "of", figure: lf, suffix: "" }],`,
    to: `    halves: [{ word: "", figure: \`used \${uf}\`, suffix: "" }, { word: "", figure: \`of \${lf}\`, suffix: "" }],`,
    expect: "1.409 · each usage half carries its connective WORD apart from its FIGURE",
    suite: "console-mem",
  },
  {
    name: "373-order · the money columns move out of the answer position",
    file: PAGE,
    from: `                      <th scope="col" className="text-left p-3 min-w-[128px]">Status</th>`,
    to: `                      <th scope="col" className="text-left p-3 min-w-[128px]">State</th>`,
    expect: "1.310 / 1.373 · the roster's headers are the control facts, in order",
    suite: "console-mem",
  },
  /* --------------------------------------------------------------------------------------------------------------
   * ADDED BY THIS STEP'S FIXER, one per assertion the review's findings forced (ruling 432(h)-(q)).
   * -------------------------------------------------------------------------------------------------------------- */
  {
    name: "421-unreadable · a generic control-read failure is collapsed back into the no-control-row state",
    file: GATE,
    from: `  const controlUnreadable = controlR.status === "rejected" && !schemaMissing;`,
    to: `  const controlUnreadable = false as boolean;`,
    expect: "1.421 · a GENERIC control failure is NOT collapsed into the schema state",
    suite: "console-mem",
  },
  {
    name: "421-unreadable-says-off · the unreadable state states the desk is OFF, which it does not know",
    file: GATE,
    from: `      ? "The desk's own state could not be read, so nothing here says whether it is on."`,
    to: `      ? "The desk is off. Nothing will be staked."`,
    expect: "1.421 · …and it says NOTHING about whether the desk is on",
    suite: "console-mem",
  },
  {
    name: "421-unreadable-band · the unreadable state drops the whole band instead of four unavailable tiles",
    file: GATE,
    from: `    ? ["Stake today", "Loss today", "Open exposure", "Accounts"].map(unavailableTile)`,
    to: `    ? []`,
    expect: "1.421 · …and the band is FOUR `unavailable` tiles",
    suite: "console-mem",
  },
  {
    name: "432l-day-fold · the band's day figures are folded over the ROSTER again, under-counting the limit the gate enforces",
    file: GATE,
    from: `    [...(dayBooks?.values() ?? [])].reduce((n, b) => n + pick(b), 0);`,
    to: `    (roster ?? []).reduce((n, b) => n + (dayBooks?.get(b.id) ? pick(dayBooks.get(b.id)!) : 0), 0);`,
    expect: "1.347 · 432(l) · the band measures the GATE's population",
    suite: "console-mem",
  },
  {
    name: "432l-exposure-fold · the band's exposure is folded over the ROSTER again",
    file: GATE,
    from: `  const exposureUsed = [...(exposure?.values() ?? [])].reduce((n, v) => n + v, 0);`,
    to: `  const exposureUsed = (roster ?? []).reduce((n, b) => n + (exposure?.get(b.id) ?? 0), 0);`,
    expect: "1.347 · 432(l) · the band measures the GATE's population",
    suite: "console-mem",
  },
  {
    name: "355-roster-blanks-money · a failed ROSTER read blanks the money tiles too, which never came from the roster",
    file: GATE,
    from: `      dayBooks
        ? moneyTile("Stake today", stakeUsed, control.gCapDailyStakeTzs, FIELD_META.gCapDailyStakeTzs.label)`,
    to: `      dayBooks && roster
        ? moneyTile("Stake today", stakeUsed, control.gCapDailyStakeTzs, FIELD_META.gCapDailyStakeTzs.label)`,
    expect: "1.355 · a failed ROSTER read blanks the ACCOUNTS tile alone",
    suite: "console-mem",
  },
  {
    name: "355-exposure-zero · a failed EXPOSURE read paints a fabricated TZS 0 instead of an em dash",
    file: GATE,
    from: `      exposureCell: exposure == null ? UNREADABLE : moneyUsage(open ?? 0, bot.capOpenExposureTzs),`,
    to: `      exposureCell: moneyUsage(open ?? 0, bot.capOpenExposureTzs),`,
    expect: "1.355 · a failed EXPOSURE read blanks the exposure tile ALONE",
    suite: "console-mem",
  },
  {
    name: "308-manual · a MANUAL off raises an auto-off Callout, telling an officer why they did what they did",
    file: GATE,
    from: `    offCause: control && control.enabled === false && control.offCause && control.offCause !== "MANUAL" ? control.offCause : null,`,
    to: `    offCause: control && control.enabled === false && control.offCause ? control.offCause : null,`,
    expect: "1.308 · a MANUAL off carries NO cause",
    suite: "console-mem",
  },
  {
    name: "308-stale · a stale cause under a LIVE switch raises its Callout, so an ON desk is captioned as stopped",
    file: GATE,
    from: `    offCause: control && control.enabled === false && control.offCause && control.offCause !== "MANUAL" ? control.offCause : null,`,
    to: `    offCause: control && control.offCause && control.offCause !== "MANUAL" ? control.offCause : null,`,
    expect: "1.308 · a STALE cause left on the row while the switch is ON renders none",
    suite: "console-mem",
  },
  {
    name: "432m-sunset · a WITHDRAWN desk offers the roster-full remedy its own Callout has just withdrawn",
    file: GATE,
    from: ` && control.offCause !== "SUNSET"`,
    to: ``,
    expect: "432(m) · a SUNSET desk at its maximum offers NO roster-full remedy",
    suite: "console-mem",
  },
  {
    /* ⛔ IT REPORTED UNDER ANOTHER RULING'S NAME. The declared `expect` was 432(m)'s SUNSET label, so the drive
     * printed this defect as caught by an assertion about the roster-full remedy, and ruling 432(j)'s own clause
     * ("a disabled control carries a reason on screen in EVERY state") was guarded only through that case's
     * `actionReason.length > 8` half. It now names the dedicated case added at this finish. */
    name: "432j-action-reason · the disabled head action loses the reason it carries when the roster is not full",
    file: GATE,
    from: `    actionReason: "Designating an account is not ready on this build yet.",`,
    to: `    actionReason: "",`,
    expect: "432(j) · 432(n) · every disabled control on this rung carries its OWN reason",
    suite: "console-mem",
  },
  {
    name: "432n-instruct · the empty state tells the reader to press two controls this checkpoint renders disabled",
    file: GATE,
    from: `          ? { title: "The desk is off", body: "No account has been designated yet." }`,
    to: `          ? { title: "The desk is off", body: "Nothing will be staked. Designate an account to build the roster, or switch the desk on." }`,
    expect: "1.310 · 432(n) · no empty state tells the reader to designate an account",
    suite: "console-mem",
  },
  {
    name: "432n-repeat · the schema state's empty box restates the Callout above it, word for word",
    file: GATE,
    from: `      ? { title: "No roster", body: "The desk's tables are not on this database — see the notice above." }`,
    to: `      ? { title: "The desk is not set up on this database", body: "Its tables are not present here, so nothing can be staked and nothing can be designated." }`,
    expect: "1.421 · 432(n) · the schema state's empty box says what the TABLE is",
    suite: "console-mem",
  },
  {
    name: "432p-separator · a plain space before the separator, so a line may end on a dangling dot again",
    file: GATE,
    from: `String.fromCharCode(0xa0)`,
    to: `String.fromCharCode(0x20)`,
    expect: "1.306 · 432(p) · a list never breaks onto a dangling separator",
    suite: "console-mem",
  },
  {
    name: "432q-second-context · a second parse-context read inside one render",
    file: GATE,
    from: `    loadParseContext(),`,
    to: `    loadParseContext(), loadParseContext(),`,
    expect: "1.347 · 432(q) · the reader's read set is the four house reads plus EXACTLY ONE `loadParseContext()`",
    suite: "console-mem",
  },
  {
    name: "453-jsx · a table header, in JSX TEXT, names the feature",
    file: PAGE,
    from: `>Products</th>`,
    to: `>House bots</th>`,
    expect: "4.453 · ⛔ RULING 453",
    suite: "console-mem",
  },
  {
    name: "432h-rowlink · the way-out link comes back while the page it opens does not exist",
    file: PAGE,
    from: `                          <td className="p-3 text-text-secondary">{r.products}</td>`,
    to: `                          <td className="p-3 text-text-secondary">{r.products}</td>
                          <td className="p-3 text-right"><Link href={"/admin" as Route} className="row-link">open</Link></td>`,
    expect: "1.407 · 432(h) · the roster carries a way-out link EXACTLY when",
    suite: "console-mem",
  },
  {
    name: "432i-dead-link · the limits sentence is a live link again while that tab has no panel",
    file: ROUTES,
    from: `export const LIMITS_TAB_READY: boolean = consoleTabExists("limits");`,
    to: `export const LIMITS_TAB_READY: boolean = true;`,
    expect: "1.312a · 432(i) · the page renders a LINK to the limits tab only when",
    suite: "console-mem",
  },
  {
    name: "432o-nowrap-header · the money header is nowrap again, which pins its figure off a 360 screen",
    file: PAGE,
    from: `                      <th scope="col" className="text-right p-3 !whitespace-normal">Loss today (projected)</th>`,
    to: `                      <th scope="col" className="text-right p-3 whitespace-normal">Loss today (projected)</th>`,
    expect: "1.373 · 432(o) · every money-bearing header may WRAP",
    suite: "console-mem",
  },
  {
    name: "432o-status-floor · the status column loses its floor, so the AUTO-PAUSED chip is a two-line pill again",
    file: PAGE,
    from: `                      <th scope="col" className="text-left p-3 min-w-[128px]">Status</th>`,
    to: `                      <th scope="col" className="text-left p-3">Status</th>`,
    expect: "1.373 · …and only the SUBJECT and STATUS columns carry a floor",
    suite: "console-mem",
  },
  {
    name: "432o-exposure-name · the column and the tile call the same figure two different things",
    file: PAGE,
    from: `                      <th scope="col" className="text-right p-3 !whitespace-normal">Open exposure</th>`,
    to: `                      <th scope="col" className="text-right p-3 !whitespace-normal">Exposure</th>`,
    expect: "1.310 / 1.373 · the roster's headers are the control facts, in order",
    suite: "console-mem",
  },
  {
    name: "432o-bets-axis · the count usage is left-aligned again, on a different axis from the money beside it",
    file: PAGE,
    from: `                      <th scope="col" className="text-right p-3 !whitespace-normal">Bets today</th>`,
    to: `                      <th scope="col" className="text-left p-3">Bets today</th>`,
    expect: "1.407 · 432(o) · every usage column is right-aligned",
    suite: "console-mem",
  },
  {
    name: "417-cols · the loader's table ghost draws the column count the page no longer has",
    file: LOADING,
    from: `        <SkTableCard cols={6} rows={5} minWidth={280} title={false} sw={false} cellPy={16} />`,
    to: `        <SkTableCard cols={7} rows={5} minWidth={280} title={false} sw={false} cellPy={16} />`,
    expect: "1.417 · the table ghost states the page's real facts",
    suite: "console-mem",
  },
  {
    name: "417-docblock · the loader's docblock contradicts its own call site about the cell padding again",
    file: LOADING,
    /* ⚠️ RE-ANCHORED at step 1's finish, to the SAME defect: the docblock's sentence moved onto a new line when
     * the head's action ghost was added, so the old anchor (` * the page's own 16px cell padding (`) no longer
     * resolved. The line quoted here still carries the claim the call site would contradict. */
    from: `the page's own 16px cell padding (\`p-3\` on every cell`,
    to: `12px cell padding, because this page overrides no cell padding (\`p-3\` on every cell`,
    expect: "1.417 · …and the loader's own prose does not contradict it",
    suite: "console-mem",
  },

  /* --------------------------------------------------------------------------------------------------------------
   * ADDED AT STEP 1's FINISH (2026-09-18): the mutation for the ONE assertion this run added.
   * -------------------------------------------------------------------------------------------------------------- */
  {
    /* ⛔ THE ONLY ASSERTION THAT CAN REPORT THIS DEFECT IS `0.throw`, WHICH IS WHY IT EXISTS. 432(e) fixes the schema
     * state's roster at `[]` so `AdminTableEmpty` may name the cause; `null` is the FAILED-READ shape and would paint
     * "Couldn't load the roster" over a state the page knows perfectly well. The case that would catch it reads
     * `.rows.length`, so under this defect it THROWS during its own argument evaluation and never reaches `ok()` —
     * before the guard added at this finish, that throw also skipped the lexicon scan and the whole source law. */
    name: "0-throw-schema-rows · the schema state hands the page a null roster, so the case that reads its length throws",
    file: GATE,
    from: `  const rows: ConsoleRosterRow[] | null = schemaMissing ? [] : roster == null ? null : roster.map((bot) => {`,
    to: `  const rows: ConsoleRosterRow[] | null = schemaMissing ? null : roster == null ? null : roster.map((bot) => {`,
    expect: "0.throw · no behavioural case threw",
    suite: "console-mem",
  },
  /* --------------------------------------------------------------------------------------------------------------
   * ADDED BY STEP 1's FIXER (2026-09-18, the review pass): one declared mutation per assertion this pass added.
   * -------------------------------------------------------------------------------------------------------------- */
  {
    /* ⛔ 432(n) IN THE CALLOUT BODIES — the half that was applied to the empty states and not to the Callouts. */
    name: "432n-callout · an auto-off Callout repeats the strip's own OFF sentence one card below it",
    file: PAGE,
    from: `            The desk has been withdrawn, and nothing can be designated.`,
    to: `            The desk has been withdrawn. Nothing will be staked, and nothing can be designated.`,
    expect: "1.308 · 432(n) · no auto-off Callout body repeats the strip's own OFF sentence",
    suite: "console-mem",
  },
  {
    /* ⛔ 432(j) + 432(n) · the master switch's reason goes back to the head action's WORD FOR WORD. */
    name: "432j-switch-reason · both disabled controls say the same seven words again",
    file: GATE,
    from: `    switchReason: "The switch is not ready on this build yet.",`,
    to: `    switchReason: "Designating an account is not ready on this build yet.",`,
    expect: "432(j) · 432(n) · every disabled control on this rung carries its OWN reason",
    suite: "console-mem",
  },
  {
    /* ⛔ 432(i) · the reader stops stripping the linked tail, so the inert sentence carries an arrow again. */
    name: "432i-arrow-strip · the PLAIN form of the roster-full sentence keeps the tail it is written for a link with",
    file: GATE,
    from: `  const rosterFullPlain = rosterFullReason === null ? null : stripLinkedTail(rosterFullReason);`,
    to: `  const rosterFullPlain = rosterFullReason;`,
    expect: "1.314 · 432(i) · the PLAIN form of the roster-full sentence is the linked one WITHOUT its tail",
    suite: "console-mem",
  },
  {
    /* ⛔ 432(i) · the PAGE paints the linked form in the inert branch again — an arrow with no navigation behind it. */
    name: "432i-arrow-paint · the head paints the LINKED sentence where there is no link",
    file: PAGE,
    from: `                : rosterFull ? view.rosterFullPlain : view.actionReason}`,
    to: `                : rosterFull ? view.rosterFullReason : view.actionReason}`,
    expect: "1.312a · 432(i) · the head paints the LINKED roster-full sentence only inside the one guarded `<Link>`",
    suite: "console-mem",
  },
  {
    /* ⛔ 417 · the loader's head loses its action ghost, which is a ~105px jump at 360 on the swap. */
    name: "417-head-ghost · the loader's head stops ghosting the action row the page always renders",
    file: LOADING,
    from: ` actions={<SkChip className="h-[44px] w-48" />} />`,
    to: ` />`,
    expect: "1.417 · the loader ghosts the head's action row whenever the page's head renders a control",
    suite: "console-mem",
  },
  {
    /* ⛔ 404 · the proportion ROUNDS, so a desk one shilling from its stop prints "100% of" — invisible until the
     * fixture's cap stopped being a round number (21,001 against 21,000 of usage). */
    name: "404-round · the cap proportion rounds up, so 99.995% prints 100%",
    file: GATE,
    from: `  const pct = limit > 0 ? Math.floor((shown / limit) * 100) : 100;`,
    to: `  const pct = limit > 0 ? Math.round((shown / limit) * 100) : 100;`,
    expect: "1.404 · the delta is the FLOORED proportion of its OWN GLOBAL cap",
    suite: "console-mem",
  },
  {
    /* ⛔ 432(p) · the no-break space moves to the WRONG SIDE of the dot — the measured defect, which the old
     * predicate (`!/ · /`) passed either way. */
    name: "432p-wrong-side · the no-break space binds the dot to the word BEFORE it, so a line may end on a bare dot",
    file: GATE,
    /* ⚠️ SINGLE-quoted, never a template literal: a backtick-quoted `from` would INTERPOLATE
     * `${String.fromCharCode(0xa0)}` at import time and the anchor would hunt a raw no-break space that is
     * not in the source. Measured here, 2026-09-18: the first attempt resolved to `const SEP = ` · `;`. */
    from: 'const SEP = ` ·${String.fromCharCode(0xa0)}`;',
    to: 'const SEP = `${String.fromCharCode(0xa0)}· `;',
    expect: "1.306 · 432(p) · a list never breaks onto a dangling separator",
    suite: "console-mem",
  },
  {
    /* ⛔ 416 · the unparsed Products cell goes back to a lowercase sentence fragment beside an em dash. */
    name: "416-products-case · an unreadable rule set renders a lowercase fragment mid-table again",
    file: GATE,
    from: `      products: parsed == null ? "Couldn't read"`,
    to: `      products: parsed == null ? "couldn't read"`,
    expect: "1.310 · 416 · a rule set the reader cannot parse renders ONE sentence-cased unknown",
    suite: "console-mem",
  },
  {
    /* ⛔ 318 · THE ROLL-CALL'S OWN MUTATION, and its subject is this file. A declared `expect` that names no label
     * the suite can print makes the drive report WRONG-ASSERTION instead of CAUGHT — measured three times over on
     * 2026-09-18 — and `test:red-anchors` §3 is structurally blind to it, because it resolves `from` and never reads
     * `expect`. `356-wallet`'s expect is drifted here because it is unique in this file. */
    name: "318-expect-drift · a declared mutation names an assertion the suite cannot print",
    file: ANCHORS,
    /* ⚠️ BUILT BY CONCATENATION, AND IT HAS TO BE. This mutation's subject is THIS FILE, so a `from` written as
     * one literal would occur TWICE — once in the declaration it targets and once here — and the shared resolver
     * refuses an ambiguous anchor. Split across a `+`, with the separator as an escape, the file contains no second
     * copy of the needle while JS still builds the exact line. `356-wallet`'s expect is the target because it is the
     * only one that is unique in this file. */
    from: 'expect: "1.356 ' + '· ZERO wallet reads",',
    to: 'expect: "1.356 ' + '· ZERO wallet reads from the holder",',
    expect: "1.318 · every declared `console-mem` mutation names an assertion THIS run actually printed",
    suite: "console-mem",
  },
];
