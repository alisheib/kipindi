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
    from: `      : "The desk is off. Nothing will be staked.";`,
    to: `      : "House bots are off. No bot will place a bet.";`,
    expect: "3.453 · not one painted string carries a house-vocabulary word",
    suite: "console-mem",
  },
  {
    name: "453-accounts · the fourth tile is labelled Bots again",
    file: GATE,
    from: `      ? { label: "Accounts", value:`,
    to: `      ? { label: "Bots", value:`,
    expect: "3.453 · not one painted string carries a house-vocabulary word",
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
    expect: "nav HIDES staff + roles + desk (Owner-only)",
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
    from: `  if (limit == null) return { label, value: "Not set", delta: "nothing can be staked — set it on Limits →" };`,
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
    from: `         \`switched by \${control?.switchedById ?? "System"}\`,`,
    to: `         \`switched by \${control?.switchedReason ?? "System"}\`,`,
    expect: "1.306 · the ON sentence names the time and the ACTOR BY ID",
    suite: "console-mem",
  },

  /* ── Rulings 346, 347, 355, 356, 361, 421 · the reads and their failures. ─────────────────────────────────────── */
  {
    name: "346-countlive · the Accounts tile takes a second count, which can disagree with the table beside it",
    file: GATE,
    from: `      ? { label: "Accounts", value: \`\${formatNumber(roster.length)} of \${formatNumber(control.maxDesignatedBots)}\`, delta: "designated of max" }`,
    to: `      ? { label: "Accounts", value: \`\${formatNumber(await houseBotStore.countLive())} of \${formatNumber(control.maxDesignatedBots)}\`, delta: "designated of max" }`,
    expect: "1.346 · exactly ONE `listNonRemoved` and ZERO `countLive` per render",
    suite: "console-mem",
  },
  {
    name: "347-second-read · the band's exposure comes from a second query rather than from the rows it renders",
    file: GATE,
    from: `  const exposureUsed = ids.reduce((n, id) => n + (exposure?.get(id) ?? 0), 0);`,
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
    expect: "1.355 · a failed ROSTER read is `rows === null`",
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
    from: `  const u = \`used \${formatTzs(Math.max(0, used))}\`;`,
    to: `  const u = \`\${formatTzs(Math.max(0, used))} /\`;`,
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
    from: `      <AdminPageHead title="Desk" sw="Dawati" />`,
    to: `      <AdminPageHead title="House bots" sw="Dawati" />`,
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
    from: `      <span className="amount tabular-nums">{cell.used}</span>`,
    to: `      <span className="amount">{cell.used}</span>`,
    expect: "1.407 · every `<th>` carries `scope=\"col\"`",
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
    expect: "1.373 · …and only the SUBJECT column carries a floor",
    suite: "console-mem",
  },
  {
    name: "361-parts · the usage cell's two halves stop agreeing with the one grammar",
    file: GATE,
    from: `  return { text: \`\${u} \${l}\`, used: u, limit: l };\n}\n\n/** 361's one usage grammar for a count limit. */`,
    to: `  return { text: \`\${u} \${l}\`, used: \`\${u} \${l}\`, limit: l };\n}\n\n/** 361's one usage grammar for a count limit. */`,
    expect: "1.310 · an account with NO stakes today reads used TZS 0 of its limit",
    suite: "console-mem",
  },
  {
    name: "373-order · the money columns move out of the answer position",
    file: PAGE,
    from: `                      <th scope="col" className="text-left p-3">Status</th>`,
    to: `                      <th scope="col" className="text-left p-3">State</th>`,
    expect: "1.310 / 1.373 · the roster's headers are the control facts, in order",
    suite: "console-mem",
  },
];
