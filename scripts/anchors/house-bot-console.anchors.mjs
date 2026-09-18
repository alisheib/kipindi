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
/* ⭐ C7 step 3 · the kit file the caption pair lives in, and the section's first client module. */
const BAR = "src/components/ui/progress-bar.tsx";
const LIVE = "src/app/admin/desk/desk-live.tsx";

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
    /* ⚠️ RE-ANCHORED 2026-09-18 (B2, ruling 348): `readDeskCore` now takes a FACTORY, so the second quoted
       line moved. THE DEFECT IS UNCHANGED — the verdict is resolved and then not acted on, and every read
       below runs for a viewer outside the audience. */
    from: `  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  const { core, extra: parseCtx } = await readDeskCore(() => loadParseContext());`,
    to: `  const mayView = await houseConsoleAudience(viewerUserId, route);

  const { core, extra: parseCtx } = await readDeskCore(() => loadParseContext());`,
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
    from: `  const [controlR, rosterR, dayR, exposureR, extraR] = await Promise.allSettled([`,
    to: `  const [controlR, rosterR, dayR, exposureR, extraR] = await Promise.all([`,
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
    from: `    text: \`used \${uf} of \${lf}\${edgeText}\`, used: \`used \${uf}\`, limit: \`of \${lf}\`, money: true,`,
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
    from: `export const CONSOLE_TABS = ["roster", "limits"] as const;`,
    to: `export const CONSOLE_TABS = ["roster", "limits", "activity"] as const;`,
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
    from: `      controlUnreadable: controlR.status === "rejected" && !schemaMissing,`,
    to: `      controlUnreadable: false as boolean,`,
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
    from: `  const stakeUsed = sumDay(dayBooks, (b) => b.stakedTzs);`,
    to: `  const stakeUsed = sumDay(dayBooks, (b) => ((roster ?? []).some((r) => r.id === b.houseBotId) ? b.stakedTzs : 0));`,
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
    /* ⚠️ RE-ANCHORED 2026-09-18 (B2, ruling 348) — the factory form. Same defect: a SECOND parse-context
       read inside one render, outside the one settled set. */
    from: `  const { core, extra: parseCtx } = await readDeskCore(() => loadParseContext());`,
    to: `  await loadParseContext();
  const { core, extra: parseCtx } = await readDeskCore(() => loadParseContext());`,
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
    name: "432i-dead-link · the link flag stops being DERIVED from the closed list, so a rail option and its link can drift apart",
    file: ROUTES,
    from: `export const LIMITS_TAB_READY: boolean = consoleTabExists("limits");`,
    to: `export const LIMITS_TAB_READY: boolean = consoleTabExists("activity");`,
    expect: "1.312a · 432(i) · both limits pointers are still GUARDED by the flag",
    suite: "console-mem",
  },
  /* ── C7 STEP 3 · the limits tab, the kit's caption pair, 367's clause and the one live trigger ─────────────── */
  {
    name: "372-verdict · the USAGE reader reads first and decides afterwards — the second door past the gate",
    file: GATE,
    /* ⚠️ RE-ANCHORED 2026-09-18 (B2, ruling 348): the fifth read is now built by a factory that takes the
       render's day key, so the quoted second line moved. THE DEFECT IS UNCHANGED — the usage reader resolves
       its verdict and then reads anyway, the second door past the gate. The comment line is part of the anchor
       only because the guard line alone is not unique: the roster reader opens with the identical statement. */
    from: `  if (!(await houseConsoleAudience(viewerUserId, route))) return null;

  /* The render's own day key, passed to the fifth read`,
    to: `  const mayView = await houseConsoleAudience(viewerUserId, route);

  /* The render's own day key, passed to the fifth read`,
    expect: "1.372 · the usage reader refuses a viewer outside the audience with `null` and performs ZERO store calls",
    suite: "console-mem",
  },
  {
    name: "372-zero · a FAILED money read renders a bar at TZS 0 instead of saying it could not be read",
    file: GATE,
    from: `  if (used === null) {`,
    to: `  if (false as boolean) {`,
    expect: "1.372 · a failed day read makes the stake and both loss rows say so",
    suite: "console-mem",
  },
  {
    name: "364-blanket · the draft's blanket caption is put back, so a staff-chosen cap is told it cannot place a bet",
    file: GATE,
    from: `  if (isClearExempt(field)) return "Not set — targeted and manual stakes cannot be placed.";`,
    to: `  if (false as boolean) return "Not set — targeted and manual stakes cannot be placed.";`,
    expect: "1.364 · every member of `CLEAR_EXEMPT` gets the targeted-and-manual caption",
    suite: "console-mem",
  },
  {
    name: "364-master · the required caption stops naming the master switch, so an unset required limit explains nothing",
    file: GATE,
    from: `  if ((REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field)) return "Not set — the master switch cannot be turned on.";`,
    to: `  if (false as boolean) return "Not set — the master switch cannot be turned on.";`,
    expect: "1.364 · every member of `REQUIRED_FOR_MASTER_ON` gets the master-switch caption",
    suite: "console-mem",
  },
  {
    name: "364-label · the console's neutral label override is dropped, so `FIELD_META`'s own words reach the screen",
    file: GATE,
    from: `  return CONSOLE_LIMIT_LABEL[field] ?? FIELD_META[field].label;`,
    to: `  return FIELD_META[field].label;`,
    expect: "1.364 · 453 · every limit name, section and value the panel paints is neutral",
    suite: "console-mem",
  },
  {
    name: "364-bar-at-zero · an UNSET cap renders a bar at zero, saying headroom where the gate refuses everything",
    file: GATE,
    from: `      return limit == null ? unsetUsageRow(name, field) : usageRow(name, used, limit);`,
    to: `      return usageRow(name, used ?? 0, limit ?? 0);`,
    expect: "1.364 · an UNSET cap renders NO bar and one of the three captions",
    suite: "console-mem",
  },
  {
    name: "366-clamp · the settled loss row renders a cohort's PROFIT as a negative amount — today's net wearing a cap's label",
    file: GATE,
    from: `  const shown = Math.max(0, used);
  const cell = moneyUsage(shown, limit);`,
    to: `  const shown = used;
  const cell = moneyUsage(shown, limit);`,
    expect: "1.366 · the two loss rows are separate, share ONE cap, and the SETTLED one renders a profit as zero",
    suite: "console-mem",
  },
  {
    name: "367-clamp · the usage text is clamped to the limit, so 140% reads as 100% and the officer cannot see the breach",
    file: GATE,
    from: `  const uf = formatTzs(shown);`,
    to: `  const uf = formatTzs(Math.min(shown, limit));`,
    expect: "1.367 · usage OVER its limit says so in words",
    suite: "console-mem",
  },
  {
    name: "367-silent · the at/over clause is dropped, leaving a saturated bar as the only signal that a cap is reached",
    file: GATE,
    from: `  if (used === limit) return \` \${EM_DASH} at the limit\`;`,
    to: `  if (false as boolean) return \` \${EM_DASH} at the limit\`;`,
    expect: "1.367 · usage EQUAL to its limit says so in words",
    suite: "console-mem",
  },
  {
    name: "362-double · the kit prints BOTH lines, so a named cap sits above a tracked bare number",
    file: BAR,
    from: `      {caption ? (`,
    to: `      {false ? (`,
    expect: "1.362 · the kit's built-in numeric line renders ONLY when no caption is given",
    suite: "console-mem",
  },
  {
    name: "362-aria · the bar stops announcing its value, so the caption reaches the eye and nobody else",
    file: BAR,
    from: `        aria-valuetext={captionText}`,
    to: `        aria-label={label}`,
    expect: "1.362 · the kit's built-in numeric line renders ONLY when no caption is given",
    suite: "console-mem",
  },
  {
    name: "409-name · the caption drops the cap's NAME, and `label` is aria-only, so a card of bars names its caps to nobody",
    file: GATE,
    from: `    captionText: \`\${name} · \${cell.text}\`,`,
    to: `    captionText: cell.text,`,
    expect: "1.409 · `captionText` is PLAIN",
    suite: "console-mem",
  },
  {
    name: "409-count-as-money · a bets-per-day COUNT is painted in `.amount`, the class that means money everywhere else in this kit",
    file: GATE,
    from: `      money: FIELD_META[field].unit === "TZS",`,
    to: `      money: true,`,
    expect: "1.409 · every limit row says whether it is MONEY",
    suite: "console-mem",
  },
  {
    name: "409-amount · the caption's figures lose `.amount`, so money is painted in prose and may break mid-number",
    file: PAGE,
    from: `              <span className="whitespace-nowrap">{h.word}{" "}<span className="amount tabular-nums">{h.figure}</span>{h.suffix}</span>`,
    to: `              <span className="whitespace-nowrap">{h.word}{" "}<span className="tabular-nums">{h.figure}</span>{h.suffix}</span>`,
    expect: "1.409 · the caption's FIRST text node is the cap's name",
    suite: "console-mem",
  },
  {
    name: "405-badge · the rail's count is derived a SECOND time, so the badge can disagree with the sentence above it",
    file: PAGE,
    from: `count: k === "limits" ? view.unsetRequired : undefined`,
    to: `count: k === "limits" ? view.tiles.filter((t) => t.value === "Not set").length : undefined`,
    expect: "1.405 · the limits badge is `TabItem.count`",
    suite: "console-mem",
  },
  {
    name: "406-strip · the live trigger moves inside a tab group, so a tab switch remounts it and two timers can race",
    file: PAGE,
    from: `              <DeskLive live={view.live} />`,
    to: `              {tab === "roster" ? <DeskLive live={view.live} /> : null}`,
    expect: "1.406 · the strip, both Callouts, the band, the rail and the live trigger are ALL rendered before ANY `tab === ` condition",
    suite: "console-mem",
  },
  {
    name: "316-interval · the poller falls back to the kit's 30s default, which is the same size as 353's staleness threshold",
    file: LIVE,
    from: `      intervalMs={LIVE_ROUND_MS}`,
    to: `      eventName="50pick:sse:notification"`,
    expect: "1.316 · it polls on `LIVE_ROUND_MS`",
    suite: "console-mem",
  },
  {
    name: "316-dom · the hold is read from the DOM instead of React state — a CLOSED dialog left in the tree then silences the page",
    file: LIVE,
    from: `      enabled={deskPollerEnabled(live, holds)}`,
    to: `      enabled={deskPollerEnabled(live, document.querySelectorAll("[role=dialog]").length)}`,
    expect: "1.316 · `enabled` is composed from REACT STATE",
    suite: "console-mem",
  },
  {
    name: "316-live · `live` is always true, so a dead desk with the switch off and no account still polls every 20s",
    file: GATE,
    from: `  const live = on === true || (roster ?? []).some((b) => b.status === "ACTIVE" || b.status === "AUTO_PAUSED");`,
    to: `  const live = true;`,
    expect: "1.316 · CONTROL · with the switch off and no account at all `live` is FALSE",
    suite: "console-mem",
  },
  {
    name: "306-second-read · the limits panel reads the control row a SECOND time, so the badge and the sentence can disagree",
    file: GATE,
    from: `  const shell = deskShell(core);
  const { control, dayBooks, exposure, schemaMissing } = core;`,
    to: `  const shell = deskShell(core);
  const { dayBooks, exposure, schemaMissing } = core;
  const control = await houseBotControlStore.get().catch(() => null);`,
    expect: "1.306 · 1.312 · each render pass reads the control row EXACTLY ONCE",
    suite: "console-mem",
  },
  {
    /* ⛔ 306 scopes the sentence to *when the switch cannot be turned on*. Without the `on !== true` term the
       strip paints "Set 1 global limit first →" beside a chip reading ON and "On since 20:14:12 EAT" — two
       opposite instructions on one screen, in the card that stops money. Measured on the first 1280 tile. */
    name: "306-sentence-on · the strip instructs an officer to set limits beside a switch that is already ON",
    file: GATE,
    from: `  const limitsFirstReason = unsetRequired > 0 && on !== true`,
    to: `  const limitsFirstReason = unsetRequired > 0`,
    expect: "1.306 · 432(m) · with the switch ON the sentence is NOT painted",
    suite: "console-mem",
  },
  {
    /* ⛔ RULING 474: operator data is rendered verbatim but BOUNDED. Unclamped, a 300-code-point reason runs the
       length of the strip — and into every screenshot of it. */
    name: "474-reason-unclamped · an operator's 300-character switch reason is painted whole",
    file: GATE,
    from: `  const reasonText = control?.switchedReason ? clampOperatorText(control.switchedReason, operatorBound("switchedReason")) : null;`,
    to: `  const reasonText = control?.switchedReason ?? null;`,
    expect: "1.474 · a 300-code-point switch reason is BOUNDED at the render site",
    suite: "console-mem",
  },
  {
    /* ⛔ The second of 474's two exemptions, at ITS render site. */
    name: "474-label-unclamped · an account's operator-chosen label is painted with no bound of its own",
    file: GATE,
    from: `      label: clampOperatorText(bot.label, operatorBound("label")),`,
    to: `      label: bot.label,`,
    expect: "1.474 · exactly TWO operator-typed values are exempted from 453",
    suite: "console-mem",
  },
  {
    /* ⛔ THE OTHER HALF OF 1.312a, WHICH NO DECLARED MUTATION EXERCISED (replan ruling 541(e)). `432i-dead-link`'s
       polarity flip proves the LINK branch; nothing proved that both limits pointers are still GUARDED by the flag.
       `1.318`'s roll-call only checks `expect`-drift — it never asks whether an assertion HAS a declaration — so the
       gap was invisible. Dropping the guard ships the link unconditionally, which is the dead control 432(i) exists
       for: the moment `limits` leaves `CONSOLE_TABS`, `consoleTab()` resolves the href back to the roster and the
       sentence repaints the identical page with no explanation. */
    name: "432i-unguarded · the head's roster-full sentence links whatever `CONSOLE_TABS` holds, so the flag stops deciding",
    file: PAGE,
    from: `              {rosterFull && LIMITS_TAB_READY`,
    to: `              {rosterFull`,
    expect: "1.312a · 432(i) · both limits pointers are still GUARDED by the flag",
    suite: "console-mem",
  },
  {
    name: "306-anchor-everywhere · every unset row carries the anchor, so `#limits-first-unset` names several elements",
    file: GATE,
    from: `    const firstUnset = unset && required && !firstUnsetTaken;`,
    to: `    const firstUnset = unset && required;`,
    expect: "1.306 · exactly ONE row of the limits list carries the anchor",
    suite: "console-mem",
  },
  {
    name: "306-anchor-href · the strip's link drops the fragment, so the officer lands on the tab and hunts for the field",
    file: PAGE,
    from: `                  <Link href={view.limitsFirstUnsetHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-warning-fg hover:underline">`,
    to: `                  <Link href={view.limitsHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-warning-fg hover:underline">`,
    expect: "1.306 · 432(i) · 541(b) · every `<Link href=` in the section is pinned BY POSITION",
    suite: "console-mem",
  },
  {
    name: "401-client-house · the section's client file imports a house module by TYPE, which the bundler erases and the walker cannot see",
    file: LIVE,
    from: `import { LIVE_ROUND_MS } from "@/lib/refresh-cadence";`,
    to: `import { LIVE_ROUND_MS } from "@/lib/refresh-cadence";
import type { ConsoleTab } from "@/lib/house-bot/console-routes";`,
    expect: "1.330 · 1.401 · no client file of the section names a house module in ANY import form",
    suite: "console-mem",
  },
  {
    name: "412-typed · a typed control ships on the limits panel with no save behind it, discarding what an officer types",
    file: PAGE,
    from: `                  {limitRows.map((row) => (row.firstUnset`,
    to: `                  <input readOnly value="" />
                  {limitRows.map((row) => (row.firstUnset`,
    expect: "1.412 · 433 · the section renders a typed control EXACTLY when a limits-save is wired",
    suite: "console-mem",
  },
  /* ── C7 STEP 2 · the D19 section's own seven, each naming the assertion 506 assigned to this step ───────── */
  {
    name: "381-codename · the document title stops being the ONE neutral codename, in a string served 200 to any signed-in account",
    file: PAGE,
    from: `export const metadata = { title: "Admin · Desk" };`,
    to: `export const metadata = { title: "Admin · Desk console" };`,
    expect: "1.381 · the three server-rendered strings take the codename",
    suite: "console-mem",
  },
  {
    name: "384-type-import · the section's client file reaches a house module by TYPE — erased by the bundler, invisible to the disclosure walker",
    file: LIVE,
    from: `import { useEventStream } from "@/lib/use-event-stream";`,
    to: `import { useEventStream } from "@/lib/use-event-stream";
import type { ConsoleRosterView } from "@/lib/server/house-console-read";`,
    expect: "1.384 · no client file of the section carries a house module SPECIFIER",
    suite: "console-mem",
  },
  {
    name: "386-kind · the live strip compares a notification KIND, putting the literal HOUSE_BOT into a public chunk",
    file: LIVE,
    from: `    const up = () => setHolds((n) => n + 1);`,
    to: `    const up = () => { if (String(window.name) === "HOUSE_BOT") return; setHolds((n) => n + 1); };`,
    expect: "1.386 · and it inspects NO kind",
    suite: "console-mem",
  },
  {
    name: "389-utils · the section's client file imports `@/lib/utils`' date helpers, which reach server platform config from a chunk (E-322)",
    file: LIVE,
    from: `import { LIVE_ROUND_MS } from "@/lib/refresh-cadence";`,
    to: `import { LIVE_ROUND_MS } from "@/lib/refresh-cadence";
import { formatEat } from "@/lib/utils";`,
    expect: "1.389 · no client file of the section imports `@/lib/utils`' date helpers",
    suite: "console-mem",
  },
  {
    name: "342-nocache · the viewer lookup stops being memoised per render pass, restoring the N+1 `sensitive.tsx` measured and closed",
    file: GATE,
    from: `const viewerRow = cache(async (viewerUserId: string) => db.user.findById(viewerUserId));`,
    to: `const viewerRow = async (viewerUserId: string) => db.user.findById(viewerUserId);`,
    expect: "1.342 · the viewer lookup is wrapped in React `cache()` inside the gate module",
    suite: "console-mem",
  },
  {
    name: "343-header · the page builds a gate argument from a header, which the own-route pin reports as a VALUE and cannot measure",
    file: PAGE,
    from: `  const sp = await searchParams;
  const tab = consoleTab(sp.tab);`,
    to: `  const sp = await searchParams;
  const tab = consoleTab(sp.tab);
  void (typeof headers === "function" ? "x-pathname" : null);`,
    expect: "1.343 · and no gate argument is built from a header",
    suite: "console-mem",
  },
  {
    name: "332-holder-exclusion · a silent holder-exclusion clause enters the gate, locking a one-owner platform out of its own controls",
    file: GATE,
    from: `    if (isHouseConsoleRoute(route)) return isAdmin(viewer.role);`,
    to: `    if (isHouseConsoleRoute(route)) return isAdmin(viewer.role) && !(await houseBotStore.findLiveByUserId(viewerUserId));`,
    expect: "1.332 · X13 · no holder-exclusion clause exists in the gate",
    suite: "console-mem",
  },
  {
    /* ⚠️ RE-AIMED 2026-09-18 (replan ruling 541(d)). It removed `schemaMissing ||` — a DEAD DISJUNCT, because
       `schemaMissing` is only true when the control read REJECTED and therefore implies `control === null` in
       every reachable state. The mutation changed nothing and could turn nothing red. The source no longer
       carries the disjunct at all: a missing schema is a STATE (`[]`) and only a failed read is `null`, so the
       two branches are genuinely distinct and there is something to take away. */
    name: "421-limits · a missing schema is painted as a FAILED READ again — two AdminLoadError cards under the Callout that already said why",
    file: GATE,
    from: `  const usage: ConsoleUsageRow[] | null = schemaMissing ? [] : !control ? null : (() => {`,
    to: `  const usage: ConsoleUsageRow[] | null = schemaMissing ? null : !control ? null : (() => {`,
    expect: "1.421 · a missing schema leaves the limits panel with nothing to LIST",
    suite: "console-mem",
  },
  {
    /* ⛔ AND THE OTHER DIRECTION, WHICH IS THE HALF 355 ACTUALLY RESERVES `AdminLoadError` FOR. A read that
       really failed must not become an empty card: an empty state is a fact about the data, and there is no
       fact here — the row could not be read. */
    name: "421-limits-failed · a control read that FAILED becomes an empty panel instead of the kit's failure treatment",
    file: GATE,
    from: `  const usage: ConsoleUsageRow[] | null = schemaMissing ? [] : !control ? null : (() => {`,
    to: `  const usage: ConsoleUsageRow[] | null = schemaMissing ? [] : !control ? [] : (() => {`,
    expect: "1.421 · CONTROL · a GENERIC control failure is NOT that state",
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
