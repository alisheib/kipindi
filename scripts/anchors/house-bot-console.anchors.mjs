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
/* ⭐ replan ruling 537 · the limits SAVE: the action, the client form and the service behind them. */
const ACTIONS = "src/app/admin/desk/actions.ts";
const FORM = "src/app/admin/desk/limits-form.tsx";
const SAVE = "src/lib/server/house-bot/limits-save.ts";
/** The page ruling 434 was taken on — a platform surface, not a console one. */
const REFUSED = "src/app/admin/kyc/refused/page.tsx";
/* ⭐ C7 step 4 · the house DAL, for `botRateUsage` — the one new seam member ruling 351 allows. */
const DAL = "src/lib/server/house-bot-dal.ts";
/* ⭐ C7 step 4 · the account page. */
const DETAIL = "src/app/admin/desk/[id]/page.tsx";
/* ⭐ C7 step 4b · the master-switch ceremony's client half. */
const CEREMONY = "src/app/admin/desk/switch-ceremony.tsx";
/* ⭐ C7 step 4b · the officer's two roster acts, which had no service under src/ at all before this step. */
const ROSTER = "src/lib/server/house-bot/roster-actions.ts";
/* ⭐ C7 step 5 (the account half) · the activity panel's own filter rail. */
const RAIL = "src/app/admin/desk/activity-filters.tsx";
/** C7 step 5's landing half: the first press anything under `src/` creates, and the bell that links to its panel. */
const PRESS_CANCEL = "src/lib/server/house-bot/press-cancel.ts";
const NOTIF = "src/lib/server/notification-service.ts";
/* ⭐ C7 step 6 · the designate wizard's own actions file and its one client module. */
const NEW_ACTIONS = "src/app/admin/desk/new/actions.ts";
const NEW_PAGE = "src/app/admin/desk/new/page.tsx";
const NEW_CLIENT = "src/app/admin/desk/new/designate-wizard.tsx";

/* ⭐ C7 step 7 · the closing gates. The last four are GUARD files: the only way to show that an assertion whose
 * subject IS a guard can fail is to mutate the guard, and `318-expect-drift` on this very file is the precedent. */
const BOOK = "src/lib/server/house-bot/book.ts";
const FEED = "src/lib/house-bot/feed-copy.ts";
const KILL = "src/lib/server/house-bot/kill-switch.ts";
const CONSTANTS = "src/lib/house-bot/constants.ts";
const HEALTH = "src/app/api/health/route.ts";
const VOCAB = "scripts/lib/house-bot-vocabulary.mjs";
const REPORTS = "scripts/lib/house-bot-reports-cases.mts";
const CASES = "scripts/lib/house-bot-console-cases.mts";
const COMMS = "scripts/lib/house-bot-comms-cases.mts";
/* ⭐ C5-7 · ruling 232 · the one file that holds every positioned transaction write. */
const MARKET = "src/lib/server/market-service.ts";
/* ⭐ C5-7 · ruling 235 · the Up & Down digest, F6's one production caller. */
const DIGEST = "src/lib/server/updown-digest.ts";
/* ⭐ ADDED AT THE C7 STEP 7 REVIEW. The erasure door is the one house refusal a COMPLIANCE officer can make the
   platform print; the shared scanner is what 1.371's population is read through; the visual gate is where 474's
   exemption is applied; the shell is where the account page's own head stamps that exemption. */
const ERASURE = "src/lib/server/erasure.ts";
const DECOMMENT = "scripts/lib/decomment.mts";
const VISUAL = "scripts/qa-house-bots-visual.mjs";
const SHELL = "src/components/admin/admin-shell.tsx";
const CLOCK = "src/lib/house-bot/clock.ts";

export const MUTATIONS = [
  /* ── C7 step 6 · THE DESIGNATE WIZARD (rulings 356, 359, 368/459, 382, 383, 385, 387, 388) ─────────────────────
   * Each puts back a shape the wizard could plausibly have shipped in: a door that reads before it decides, a
   * refusal that tells a player whether an account exists, a real person's balance on the one screen most likely to
   * end up in a screenshot, or a service's own sentence passed through onto a surface 453 exists to keep neutral. */
  {
    name: "359-missing-card · an account that does not exist gets a card of facts about nothing — a built handle, an empty term and a fabricated zero",
    file: NEW_PAGE,
    from: `          {view !== null && step === "check" && !view.accountMissing && (`,
    to: `          {view !== null && step === "check" && (`,
    expect: "1.359 · 355 · 416 · the wizard's fact grid, its funded state and its footer are all guarded by `accountMissing`",
    suite: "console-mem",
  },
  {
    name: "359-missing-flag · the reader stops reporting a missing account, so the page can never tell the two states apart",
    file: GATE,
    from: `    accountMissing: blocking.some((r) => r.code === "ACCOUNT_MISSING"),`,
    to: `    accountMissing: false,`,
    expect: "1.359 · 355 · a `?u=` with no account behind it answers `accountMissing`",
    suite: "console-mem",
  },
  {
    /* ⭐ RE-ANCHORED AT C7 STEP 7 to the SAME defect: the presence check moved off the governed accessor so the
     * READ-TIERS ratchet stops reporting the desk, and the term must still be drawn only when there is a number. */
    name: "359-phone-term · the Phone term is drawn unconditionally, so an account with no number gets a labelled row that says nothing",
    file: NEW_PAGE,
    from: `                  {view.hasPhone && (`,
    to: `                  {true && (`,
    expect: "1.359 · the Phone term is drawn only when there is a value",
    suite: "console-mem",
  },
  {
    name: "359-gate-late · the check card is built BEFORE the audience verdict, so a refused viewer's payload carries the account",
    file: GATE,
    from: `  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") return null;
  const id = typeof userId === "string" ? userId : "";
  if (id.length === 0) return null;`,
    to: `  const id = typeof userId === "string" ? userId : "";
  if (id.length === 0) return null;`,
    expect: "1.359 · a viewer OUTSIDE the audience receives `null` and nothing else",
    suite: "console-mem",
  },
  {
    name: "459-balance · the check card paints the holder's balance, which is the one exception ruling 459 withdrew",
    file: GATE,
    from: `    ? { word: "Funded", chip: TONE_CHIP.green, sentence: "There is money in this wallet, so a stake can be funded from it." }`,
    to: `    ? { word: "Funded", chip: TONE_CHIP.green, sentence: \`Live balance \${formatTzs(balance)}.\` }`,
    expect: "1.359 · 459 · the card paints a funded STATE in both polarities and NO amount",
    suite: "console-mem",
  },
  {
    name: "453-elig-passthrough · the check card renders the SERVICE's own eligibility sentences, which name the feature",
    file: GATE,
    from: `    ({ code: r.code, text: consoleCheckSentence(r.code), href: r.href ?? null });`,
    to: `    ({ code: r.code, text: (r as { message?: string }).message ?? consoleCheckSentence(r.code), href: r.href ?? null });`,
    expect: "1.359 · 453 · every blocking and warning sentence the card paints is the CONSOLE's own",
    suite: "console-mem",
  },
  {
    name: "453-elig-gap · one eligibility code loses its console sentence and falls back to the generic line",
    file: GATE,
    from: `  AGENT_ACCOUNT: "This is an agent account. Only a player's own account can be used here.",\n`,
    to: ``,
    expect: "1.359 · 453 · the console has a sentence of its own for EVERY code in the service's two unions",
    suite: "console-mem",
  },
  {
    /* ⭐ RE-ANCHORED AT C7 STEP 6's FIX, SAME DEFECT: the settled set's fourth read is now a COUNT, not a page
       (ruling 344), so the line the second wallet read is planted beside changed with it. */
    name: "356-wizard-wallet · the check card reads the candidate's wallet a SECOND time, for a figure it never paints",
    file: GATE,
    from: `    (async () => positionStore.countOwnOpenForUser(id))(),`,
    to: `    (async () => positionStore.countOwnOpenForUser(id))(),
    (async () => db.wallet.findByUserId(id))(),`,
    expect: "1.356 · the wizard's check card performs EXACTLY ONE wallet read",
    suite: "console-mem",
  },
  {
    name: "387-oracle · the picker's refusal carries a count, so a player can tell a match from a miss",
    file: GATE,
    from: `  const refused: ConsolePickerAnswer = { rows: [], note: CONSOLE_PICKER_EMPTY, count: "" };`,
    to: `  const refused: ConsolePickerAnswer = { rows: [], note: CONSOLE_PICKER_EMPTY, count: "0 accounts" };`,
    expect: "1.387 · for a caller OUTSIDE the audience a matching query, a non-matching query and an unknown id answer IDENTICALLY",
    suite: "console-mem",
  },
  {
    name: "387-phone · a picker option carries the account's phone, which never passed through the platform's own gate",
    file: GATE,
    from: `    handle: playerHandle(u.id),
    href: consoleNewHref({ userId: u.id }),`,
    to: `    handle: \`\${playerHandle(u.id)} \${u.phoneE164}\`,
    href: consoleNewHref({ userId: u.id }),`,
    expect: "1.387 · the owner's search finds the account by its id and paints the handle alone",
    suite: "console-mem",
  },
  {
    /* ⭐ THE `expect` IS RE-AIMED, NOT THE MUTATION (C7 step 6 review, test-strength-387-blind). It named the
       assertion whose fixture is a SUPPORT account, refused two branches later by the role test and never through
       `onDesk` at all — so the line it named stayed green and the harness reported WRONG-ASSERTION. The line this
       defect really reddens is the roster one. */
    name: "387-blind · every picker option is offered as choosable, including one already on the desk",
    file: GATE,
    from: `  if (onDesk) return PICKER_REASON.onDesk;`,
    to: `  if (false) return PICKER_REASON.onDesk;`,
    expect: "1.387 · an account already on the desk comes back as an option that cannot be chosen",
    suite: "console-mem",
  },
  {
    name: "387-floor · a one-character query walks the whole account directory",
    file: GATE,
    from: `  if (q.length < CONSOLE_PICKER_MIN_QUERY) return { rows: [], note: null, count: "" };`,
    to: `  if (q.length < 0) return { rows: [], note: null, count: "" };`,
    expect: "1.387 · a query under the floor answers with no rows, no count and no sentence",
    suite: "console-mem",
  },
  {
    name: "383-refusal-field · the designation's refusal to a non-owner names a field, which is a shape only a real form gets",
    file: GATE,
    from: `    return { ok: false, error: CONSOLE_ACT_REFUSAL.refused };
  }
  const userId = typeof input.userId === "string" ? input.userId : "";`,
    to: `    return { ok: false, error: CONSOLE_ACT_REFUSAL.refused, field: "password" };
  }
  const userId = typeof input.userId === "string" ? input.userId : "";`,
    expect: "1.383 · a caller outside the audience receives ONE fixed refusal",
    suite: "console-mem",
  },
  {
    name: "383-label-late · the label's shape is checked AFTER the password, so a typo spends the holder's own attempt",
    file: GATE,
    from: `  const labelErr = validateLabel(label);`,
    to: `  const labelErr = null as ReturnType<typeof validateLabel>;`,
    expect: "1.383 · a mistyped name is refused on its own field",
    suite: "console-mem",
  },
  {
    name: "382-export · a console action takes the export name ruling 382 forbids, which ships verbatim in a public chunk",
    file: NEW_ACTIONS,
    from: `export async function designateDeskAccountAction(`,
    to: `export async function designateHouseBotAction(`,
    expect: "1.382 · every exported symbol of every console `\"use server\"` file",
    suite: "console-mem",
  },
  {
    name: "385-copy · a sentence the server owns is typed into the client file instead of arriving as a prop",
    file: NEW_CLIENT,
    from: `const TRANSPORT_FAILURE = "That did not reach the server. Nothing changed — try again.";`,
    to: `const TRANSPORT_FAILURE = "There is money in this wallet, so a stake can be funded from it.";`,
    expect: "1.385 · not one sentence the gate module can emit is ALSO typed into a console client file",
    suite: "console-mem",
  },
  {
    name: "388-prop · a client prop is named for the feature, and a prop name survives minification into a public chunk",
    file: NEW_CLIENT,
    from: `  checkHref,
  labelMin,`,
    to: `  houseBotLabel,
  checkHref,
  labelMin,`,
    expect: "1.388 · not one prop name, type field or string literal of any console client file carries a vocabulary word",
    suite: "console-mem",
  },
  {
    name: "420-name · the console resolves a display name, putting a real person's name on the screenshot surface",
    file: GATE,
    from: `    phoneE164: phone,`,
    to: `    phoneE164: phone,
    displayName: user?.displayName ?? null,`,
    expect: "1.420 · the ON sentence names the actor by id and the module resolves NO name for one",
    suite: "console-mem",
  },
  {
    name: "342-viewer · the subject's row is read through the VIEWER's id, which is how an N+1 on the wrong row ships",
    file: GATE,
    from: `    (async () => db.user.findById(id))(),`,
    to: `    (async () => db.user.findById(viewerUserId))(),`,
    expect: "1.342 · the viewer lookup is wrapped in React `cache()` inside the gate module",
    suite: "console-mem",
  },
  {
    name: "432h-wizard · the head action stops opening the wizard, so the deliverable's first control is inert again",
    file: PAGE,
    from: `              ? <Link href={view.designateHref as Route} className="btn btn-primary btn-md inline-flex items-center">Designate an account</Link>`,
    to: `              ? <Button size="md" variant="primary" disabled>Designate an account</Button>`,
    expect: "1.407 · 432(h) · …and the same rule for the wizard",
    suite: "console-mem",
  },
  /* ── C7 step 6 · WHAT THE FIX PASS ADDED (rulings 259/324/380, 344, 355, 387, 388, 412) ───────────────────────
   * Each is a shape the wizard ACTUALLY shipped in and a review measured: a page that gated only when a `?u=` was
   * present, a population built from a page, a failed read painted as a state, a picker whose count lied about its
   * own bound, a feature paragraph typed into a public chunk, and an idempotency key derived from what the officer
   * typed — which bricked the control after one wrong password. */
  {
    name: "380-page-gate · the wizard's page decides its audience only when a `?u=` is present, so a bare /admin/desk/new streams to any signed-in account",
    file: NEW_PAGE,
    from: `  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/desk"))) return null;
  const sp = await searchParams;`,
    to: `  const sp = await searchParams;`,
    expect: "1.380 · 324 · the wizard's page decides its OWN audience first",
    suite: "console-mem",
  },
  {
    name: "344-paged-count · `Open positions` is built from a PAGE again, so an account whose settled rows are newer reads zero open",
    file: GATE,
    from: `    (async () => positionStore.countOwnOpenForUser(id))(),`,
    to: `    (async () => (await positionStore.listForUser(id, 3)).filter((x) => x.status === "OPEN" && x.houseBotId == null).length)(),`,
    expect: "1.344 · the check card's open-position figure comes from a COUNTING reader",
    suite: "console-mem",
  },
  {
    name: "355-unreadable-row · a failed eligibility read stops saying so, so an unreadable account paints as a card with nothing wrong with it",
    file: GATE,
    from: `  const blocking: ConsoleCheckRow[] = el === null
    ? [{ code: "UNREADABLE", text: "This account could not be checked. Refresh to try again.", href: null }]
    : el.blocking.map(row);`,
    to: `  const blocking: ConsoleCheckRow[] = el === null ? [] : el.blocking.map(row);`,
    expect: "1.359 · 355 · a failed eligibility read is a BLOCKING ROW, not an eligible account",
    suite: "console-mem",
  },
  {
    name: "355-open-zero · a failed position count renders a fabricated zero instead of the em dash",
    file: GATE,
    from: `    openPositions: open === null ? EM_DASH : formatNumber(open),`,
    to: `    openPositions: formatNumber(open ?? 0),`,
    expect: "1.359 · 355 · a failed position count renders an EM DASH, never a fabricated zero",
    suite: "console-mem",
  },
  {
    name: "355-door-hidden · the bonus fact and the way to the holder's own money screen go back inside the funded guard, so a failed wallet read takes the door with it",
    file: NEW_PAGE,
    from: `                <div className="mt-4 pt-4 border-t border-border-subtle">
                  {view.funded !== null && (`,
    to: `                <div className="mt-4 pt-4 border-t border-border-subtle">
                  {view.funded !== null && view.bonusCaption.length > 0 && (`,
    expect: "1.359 · 456 · the page paints the bonus fact and the way to the holder's own money screen OUTSIDE the funded guard",
    suite: "console-mem",
  },
  {
    name: "387-busy-lies · a rate-limited lookup answers the refusal, telling an owner inside the audience that accounts which exist do not",
    file: GATE,
    from: `  if (!gate.allowed) return { rows: [], note: CONSOLE_PICKER_BUSY, count: "" };`,
    to: `  if (!gate.allowed) return refused;`,
    expect: "1.387(e) · a rate-limited lookup answers its OWN sentence",
    suite: "console-mem",
  },
  {
    name: "387-rate-rule · the picker's rate rule is deleted, and `rateCheckAsync` fails OPEN on a key it does not know",
    file: "src/lib/server/rate-limit.ts",
    from: `  "desk.picker":   { capacity: 30, refillPerMin: 15 },`,
    to: ``,
    expect: "1.387(e) · the picker's rate rule EXISTS, is keyed on the CALLER",
    suite: "console-mem",
  },
  {
    name: "387-cap · the ten-option bound becomes a hundred, so a listbox with no scroll box of its own runs off the page",
    file: GATE,
    from: `  const rows: ConsolePickerRow[] = hits.slice(0, CONSOLE_PICKER_MAX).map((u) => ({`,
    to: `  const rows: ConsolePickerRow[] = hits.slice(0, 100).map((u) => ({`,
    expect: "1.387 · 412 · the answer is capped at ten options and the count says so",
    suite: "console-mem",
  },
  {
    name: "387-count-lie · the live count reports the rows SHOWN, so a query matching forty says `10 accounts`",
    file: GATE,
    from: `  const shown = hits.length > CONSOLE_PICKER_MAX
    ? \`\${formatNumber(rows.length)} of \${formatNumber(hits.length)} accounts\${SEP}narrow the search\`
    : \`\${formatNumber(rows.length)} \${rows.length === 1 ? "account" : "accounts"}\`;`,
    to: `  const shown = \`\${formatNumber(rows.length)} \${rows.length === 1 ? "account" : "accounts"}\`;`,
    expect: "1.387 · 412 · the answer is capped at ten options and the count says so",
    suite: "console-mem",
  },
  {
    name: "387-order · the slice takes whichever ten the store happened to return, so the two twins can answer different tens",
    file: GATE,
    from: `  hits.sort((a, b) => matchRank(a) - matchRank(b) || a.id.localeCompare(b.id));`,
    to: ``,
    expect: "1.387 · …and the ten that survive the slice are the same ten a second run returns",
    suite: "console-mem",
  },
  {
    name: "412-nonce · the submit claim goes back to the account and the typed name, so one wrong password bricks the control for 30 days",
    file: NEW_CLIENT,
    from: `        result = await designate({ userId, label, note, password, submitId: attempt.current });`,
    to: `        result = await designate({ userId, label, note, password, submitId: \`\${userId}:\${label}\` });`,
    expect: "1.412 · …so the wizard mints a NEW nonce for every armed attempt",
    suite: "console-mem",
  },
  {
    name: "388-25char · a sentence about the feature is typed into the client file, where no vocabulary guard can see it",
    file: NEW_CLIENT,
    from: `/** What the designation posts and what it gets back — declared structurally, for ruling 384's reason above. */`,
    to: `const LEAK = "Stakes are placed from this account, out of the money in its own wallet, within the limits set for it and for the desk.";
/** What the designation posts and what it gets back — declared structurally, for ruling 384's reason above. */`,
    expect: "1.388 · every string of 25+ characters in every console client file is either a class list or one of the six",
    suite: "console-mem",
  },
  {
    name: "382-guard-extractor · the guard-label extractor stops matching, and an empty population reads as compliance",
    file: "scripts/lib/house-bot-console-cases.mts",
    from: `      const GUARD_RE = /require(?:Owner|Staff|HouseOwner)\\(\\s*"([^"]+)"/g;`,
    to: `      const GUARD_RE = /requireNothingAtAll\\(\\s*"([^"]+)"/g;`,
    expect: "1.382 · CONTROL · the guard-label extractor is proved LIVE on a synthetic source",
    suite: "console-mem",
  },
  {
    name: "387-grammar · a house-named column is added to the picker's own search grammar, which the client search box value-imports",
    file: "src/lib/search/fields.ts",
    from: `    handle: { columns: ["displayLabel"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
  },
  // What a bare token searches — what an officer actually holds: a pasted handle, a phone number, or an id.`,
    to: `    handle: { columns: ["displayLabel"], kind: "text" },
    id: { columns: ["id"], kind: "exact" },
    house: { columns: ["houseBotId"], kind: "exact" },
  },
  // What a bare token searches — what an officer actually holds: a pasted handle, a phone number, or an id.`,
    expect: "4.1 · R1's house filter is never a TXN_SEARCH field, column or default, and the designation picker's own grammar carries none either",
    suite: "disclosure",
  },
  /* ── C7 step 4b · THE ACCOUNT'S ACTION ROW (ruling 415; replan 549) ──────────────────────────────────────────
   * Each puts back a shape the console could plausibly have shipped in: an act offered in a state its service
   * cannot perform, a ceremony the server does not check, an officer's stop recorded as the engine's, or a
   * service's own sentence passed through onto a surface ruling 453 exists to keep neutral. */
  {
    name: "415-acts-everywhere · every act is offered in every state, so Pause is drawn on an account that is not running",
    file: GATE,
    from: `function actDialogsFor(status: string): ConsoleAccountActDialog[] {\n  if (status === "REMOVED") return [];`,
    to: `function actDialogsFor(status: string): ConsoleAccountActDialog[] {\n  status = "ACTIVE";\n  if (status === "REMOVED") return [];`,
    expect: "1.415 · the action row offers exactly the acts this account's CURRENT state allows",
    suite: "console-mem",
  },
  {
    name: "415-remove-unchecked · the server stops checking Remove's typed word, so the ceremony is a browser courtesy",
    file: GATE,
    from: `    if ((typeof input.typed === "string" ? input.typed.trim() : "") !== CONSOLE_REMOVE_WORD) {\n      return { ok: false, error: ACT_COPY.removeWordWrong, field: "typed" };\n    }`,
    to: ``,
    expect: "1.415 · 388 · Remove is refused by the SERVER without the typed word",
    suite: "console-mem",
  },
  {
    name: "415-shared-refusal · the console passes a service's own refusal through, onto the one surface 453 keeps neutral",
    file: GATE,
    from: `        error: actRefusal(done.code, { attemptsBeforeLock: done.attemptsBeforeLock, retryAfterSec: done.retryAfterSec }),`,
    to: `        error: done.message,`,
    expect: "1.415 · 453 · every re-verify refusal is the CONSOLE's own sentence",
    suite: "console-mem",
  },
  {
    name: "415-engine-pause · an officer's stop is written as the ENGINE's, so a person and a worker are indistinguishable in a seven-year record",
    file: ROSTER,
    from: `      from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pauseDetail: null, pausedFromStatus: null,`,
    to: `      from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "WALLET_FROZEN", pauseDetail: null, pausedFromStatus: "ACTIVE",`,
    expect: "1.415 · ⭐ PAUSE STOPS A RUNNING ACCOUNT",
    suite: "console-mem",
  },
  {
    name: "432j-no-status-note · a stopped account whose cause has cleared paints a claret chip with nothing under it again",
    file: GATE,
    from: `  if (wayOut !== null || status === "ACTIVE" || status === "REMOVED") return null;`,
    to: `  return null;\n  if (wayOut !== null || status === "ACTIVE" || status === "REMOVED") return null;`,
    expect: "1.415 · 432(j) · an AUTO-PAUSED account whose cause has since cleared carries an honest sentence",
    suite: "console-mem",
  },
  /* ── C7 step 4b · the engine-health Callout, the console half (rulings 414, 435(e); X1). ───────────────────── */
  {
    name: "414-notice-absent · the engine Callout is never painted, so a dead engine is invisible on the one page that could say so",
    file: GATE,
    from: `    engine,`,
    to: `    engine: null,`,
    expect: "1.353 · 414 · a STALE engine paints the DANGER Callout",
    suite: "console-mem",
  },
  {
    name: "X1-duty-identifier · a failed duty reaches the owner's screen as the engine's own identifier",
    file: GATE,
    from: `  return CONSOLE_DUTY_PHRASE[name] ?? name;`,
    to: `  return name;`,
    expect: "1.414 · X1 · every member of the planner's own `DutyName` union has a neutral phrase",
    suite: "console-mem",
  },
  /* ── C7 step 4b · THE MASTER-SWITCH CEREMONY (rulings 388, 415; owner-delegated 454; replan ruling 549) ────────
   * Each puts back a state the console was ACTUALLY in, or one it could plausibly have shipped in: a ceremony the
   * server does not check, a control offered in a state its service refuses, or a stop that can be refused. */
  {
    name: "454-word-unchecked · the server stops checking the typed word, so the ceremony is a browser courtesy",
    file: GATE,
    from: `    if ((typeof input.typed === "string" ? input.typed.trim() : "") !== CONSOLE_SWITCH_ON_WORD) {\n      return { ok: false, error: SWITCH_COPY.wordWrong };\n    }`,
    to: ``,
    expect: "1.454 · the SERVER refuses a word that only looks right",
    suite: "console-mem",
  },
  {
    name: "454-word-folded · the typed word is case-folded, so habit can arm the control that starts money",
    file: CEREMONY,
    from: `  return copy.word === null || typed.trim() === copy.word;`,
    to: `  return copy.word === null || typed.trim().toUpperCase() === copy.word;`,
    expect: "1.415 · 454 · the confirm arms only on a reason of the required length AND the word typed EXACTLY",
    suite: "console-mem",
  },
  {
    name: "306-switch-on-unset · the switch is offered while a required limit is unset, so the only act behind it is a refusal",
    file: GATE,
    from: `  if (unsetRequired > 0) return null;`,
    to: ``,
    expect: "1.306 · 454 · with a required limit unset the ceremony is REFUSED by the server",
    suite: "console-mem",
  },
  {
    name: "415-off-typed-word · the kill switch grows a typed word, so a stop waits on ceremony while money moves",
    file: GATE,
    from: `      word: null,\n      wordLabel: null,\n      wordPlaceholder: null,\n      doneTitle: "The desk is off",`,
    to: `      word: CONSOLE_SWITCH_ON_WORD,\n      wordLabel: "Type it",\n      wordPlaceholder: null,\n      doneTitle: "The desk is off",`,
    expect: "1.415 · the way OFF takes NO typed word and the way ON does",
    suite: "console-mem",
  },
  {
    name: "415-shared-copy · the console passes the kill switch's SHARED sentence through instead of building its own",
    file: GATE,
    from: `  if (!off.ok) return { ok: false, error: SWITCH_COPY.offFailed };`,
    to: `  if (!off.ok) return { ok: false, error: off.message };`,
    /* ⚠️ RE-AIMED under replan ruling 541: the first form named the kill switch's SUCCESS case, which this
       defect cannot reach — the branch it changes only runs when the OFF WRITE FAILS, and no case reached it.
       The case was written (a throwing control-row write) and the declaration now names it. */
    expect: "1.415 · 453 · a kill switch whose WRITE FAILED says so in the console's own neutral words",
    suite: "console-mem",
  },
  {
    name: "432j-switch-operable · the disabled switch keeps its sentence while the ceremony is offered, so one state says one fact twice",
    file: GATE,
    from: `    switchReason: on == null || switchDialog !== null || limitsFirstReason !== null`,
    to: `    switchReason: on == null`,
    expect: "432(j) · 432(n) · a DISABLED master switch carries exactly one reason beside it",
    suite: "console-mem",
  },
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

  const { core, extra: parseCtx, extraB: rates } = await readDeskCore(`,
    to: `  const mayView = await houseConsoleAudience(viewerUserId, route);

  const { core, extra: parseCtx, extraB: rates } = await readDeskCore(`,
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
    from: `  if (limit == null) return { label, value: "Not set", delta: UNSET_CONSEQUENCE };`,
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
    from: `        ? { label: "Accounts", value: \`\${formatNumber(roster.length)} of \${formatNumber(control.maxDesignatedBots)}\`, delta: "designated and the maximum" }`,
    to: `        ? { label: "Accounts", value: \`\${formatNumber(await houseBotStore.countLive())} of \${formatNumber(control.maxDesignatedBots)}\`, delta: "designated and the maximum" }`,
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
    /* ⚠️ RE-ANCHORED at C7 step 4: the set grew a sixth member when "Last bet" brought ruling 351's rate
       reader with it. RE-ANCHORED AGAIN at step 4b: a SEVENTH, the engine's durable beats, which ruling 435(e)
       puts inside this same door rather than behind a second one. RE-ANCHORED AGAIN at C7 step 5's landing
       half: an EIGHTH, the rail's queued-stake badge, which is a SHELL fact and so belongs to this set rather
       than to a caller's slot. 🔴 EACH TIME IT WAS THE RED HARNESS THAT REPORTED THE ROT, never a reading — an
       anchor that stops resolving is a mutation that silently stops being driven. THE DEFECT IS UNCHANGED — one
       failed read blanks the whole page instead of its own cell. */
    from: `  const [controlR, rosterR, dayR, exposureR, instancesR, pendingR, extraR, extraBR] = await Promise.allSettled([`,
    to: `  const [controlR, rosterR, dayR, exposureR, instancesR, pendingR, extraR, extraBR] = await Promise.all([`,
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
    /* ⚠️ RE-POINTED 2026-09-20 (C7 step 5's landing half). Its `from` was the TWO-key literal and its `to`
       added `activity` — both of which stopped existing when the landing panels landed, so `test:red-anchors` §3
       ("every DECLARED anchor resolves exactly once") would have gone red on the text rather than on the rule.
       ⛔ IT IS RE-AIMED, NOT DELETED: the defect is unchanged — a key on the rail with no panel behind it — and
       the new `to` is a FIFTH key nothing renders. */
    name: "312-rail · a tab key is added to the closed list with no panel behind it",
    file: ROUTES,
    from: `export const CONSOLE_TABS = ["roster", "activity", "limits", "history"] as const;`,
    to: `export const CONSOLE_TABS = ["roster", "activity", "limits", "history", "money"] as const;`,
    expect: "1.312 · the rail's options come from the closed list",
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
    /* ⚠️ RE-ANCHORED at C7 step 5's landing half: the page carries THREE of these openers now, the anchor
       matched 3× and the harness refused to inject — which is how the presence check this fires is known to have
       been broken by the same change. The label above it is what makes the money-bearing one unique. */
    from: `                <ScrollX label="Desk activity">
                  <table className="admin-tbl">`,
    to: `                <ScrollX label="Desk activity">
                  <table className="admin-tbl min-w-[720px]">`,
    expect: "1.373 · the money-bearing TABLE carries no `min-w-*` of its own",
    suite: "console-mem",
  },
  {
    name: "373-subject · the subject column loses its floor, so it absorbs the whole shortfall at 360 again",
    file: PAGE,
    /* ⚠️ RE-ANCHORED at C7 step 5's landing half, same rot and same finding: three panels paint this header, so
       the anchor matched 3×. The `Stake` header on the next line is the money-bearing panel's own. */
    from: `                        <th scope="col" className="text-left p-3 min-w-[150px]">Account</th>
                        <th scope="col" className="text-right p-3 !whitespace-normal">Stake</th>`,
    to: `                        <th scope="col" className="text-left p-3">Account</th>
                        <th scope="col" className="text-right p-3 !whitespace-normal">Stake</th>`,
    expect: "1.373 · EVERY panel that paints the subject column carries the SAME floor",
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
    /* ⭐ RE-ANCHORED TO THE SAME DEFECT AT C7 STEP 6, because the LINE moved when the head action became a real
     * link (432(h)): the reason is now `null` in every state but a WITHDRAWN desk, which is the one state where a
     * disabled head action has nothing else beside it. Removing that branch leaves a disabled control with no
     * sentence at all — the identical defect, at the identical site, reported by the case this step added for it. */
    name: "432j-action-reason · the disabled head action loses the one reason it still carries, on a WITHDRAWN desk",
    file: GATE,
    from: `    actionReason: withdrawn ? "The desk has been withdrawn, so no account can be designated." : null,`,
    to: `    actionReason: null,`,
    expect: "432(j) · 432(n) · ⭐ THE HEAD ACTION OBEYS THE SAME RULE NOW THAT IT WORKS",
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
    from: `  const { core, extra: parseCtx, extraB: rates } = await readDeskCore(`,
    to: `  await loadParseContext();
  const { core, extra: parseCtx, extraB: rates } = await readDeskCore(`,
    expect: "1.347 · 432(q) · the desk's read set is the four house reads plus EXACTLY ONE `loadParseContext()`",
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
    /* ⚠️ RE-POINTED 2026-09-20. `to` flipped the flag to `consoleTabExists("activity")` — which was FALSE while
       the landing panels were unbuilt and is TRUE now, so the mutation would have left the flag true, produced no
       failure at all, and been reported NOT-RED (a missed mutation, which exits 1). It is aimed at a key that
       exists nowhere, which is the state the old `to` was standing in for. */
    to: `export const LIMITS_TAB_READY: boolean = consoleTabExists("money");`,
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
    /* ⚠️ RE-ANCHORED at C7 step 4: replan ruling 547 split this branch on the render's switch state, so the
       one-line form no longer exists. The DEFECT is unchanged — the REQUIRED branch never fires, and an unset
       required limit explains nothing. */
    from: `  if ((REQUIRED_FOR_MASTER_ON as readonly string[]).includes(field)) {`,
    to: `  if (false as boolean) {`,
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
    from: `      return limit == null ? unsetUsageRow(name, field, control.enabled) : usageRow(name, used, limit);`,
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
    /* ⚠️ RE-POINTED 2026-09-18: it named the BUILT-IN LINE assertion, which is a different subject. The
       rendered case is the one that can see an announcement that never reaches the DOM. */
    expect: "1.362 · RENDERED · with a caption the bar paints EXACTLY ONE line",
    suite: "console-mem",
  },
  {
    /* ⛔ THE DEFECT RULING 362 SPLIT THE PAIR FOR: `aria-valuetext` is a STRING attribute, so a ReactNode stamps
       `[object Object]` into the DOM for every screen-reader user AND into any served body a scanner reads. No
       source regex can see that — only a render can. */
    name: "362-valuetext-node · the ReactNode caption is handed to `aria-valuetext`, which stamps [object Object]",
    file: BAR,
    from: `        aria-valuetext={captionText}`,
    to: `        aria-valuetext={(caption ?? captionText) as unknown as string}`,
    expect: "1.362 · RENDERED · with a caption the bar paints EXACTLY ONE line",
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
    /* ⚠️ RE-ANCHORED, SAME DEFECT (replan ruling 537): the limits row now reads its unit ONCE into a local,
       because the form needs the same unit for the money prefix and the percent suffix, so the quoted line moved. */
    from: `      money: unit === "TZS",`,
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
    from: `count: k === "limits" ? view.unsetRequired : k === "activity" ? view.pendingIntents ?? undefined : undefined`,
    to: `count: k === "limits" ? view.tiles.filter((t) => t.value === "Not set").length : k === "activity" ? view.pendingIntents ?? undefined : undefined`,
    expect: "1.405 · both badges are `TabItem.count`",
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
    /* ⛔ RULING 434 HAD NO DECLARED MUTATION AND NO CASE IN `test:all` — the only instrument that went red without
       the fix was `qa:house-bot-console-probe`, which `test:all` does not run. This is the leak it was taken on,
       put back: the page reads `refusedFundsReport` — an officer's free-text justification, rendered in a `<td>`
       — and 259 measured that a layout's redirect changes what is PAINTED, not what is SENT. */
    name: "434-refused-ungated · the refused-funds page reads before it decides its audience, streaming an officer's justification to any signed-in account",
    file: REFUSED,
    from: `  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/kyc/refused"))) return null;`,
    to: `  void houseConsoleAudience;`,
    expect: "0.434 · ⛔ D19/259 · every admin page that imports from an audit reader whose ROWS are handed on",
    suite: "reports-mem",
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
    expect: "1.474 · both exemptions are CLAMPED at their own render site",
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
  /* ⚠️ RE-ANCHORED, SAME DEFECT, OTHER SIDE (replan ruling 537). It used to plant a typed control into a panel that
     had none, which proved the tie while `typed` was false. The panel now HAS its control and its save, so the
     declaration that still measures the tie is the one that takes the SAVE away and leaves the control standing —
     the exact state 432(a) refuses, and the state ruling 433(a) believed the repository was already in. */
  {
    name: "412-typed · the typed limits control stands with no save behind it, discarding what an officer types",
    file: SAVE,
    from: `  const cas = await houseBotControlStore.saveLimits(input.baseVersion, patch);`,
    to: `  const cas = { ok: true, row: { ...control, limitsVersion: input.baseVersion + 1 } };`,
    expect: "1.412 · 537 · a typed control, a wired limits SAVE",
    suite: "console-mem",
  },
  {
    name: "537-guard · the guarded form loses its UnsavedChangesGuard, so an in-app link discards what was typed in silence",
    file: FORM,
    from: `      <UnsavedChangesGuard
        dirty={armed}`,
    to: `      <UnsavedChangesGuardOff
        dirty={armed}`,
    expect: "1.412 · 537 · a typed control, a wired limits SAVE",
    suite: "console-mem",
  },
  {
    name: "537-bar · the singleton PendingChangesBar goes, so Save leaves the viewport on a form taller than the screen",
    file: FORM,
    from: `      <PendingChangesBar
        dirty={armed}`,
    to: `      <PendingChangesBarOff
        dirty={armed}`,
    expect: "1.412 · EXACTLY ONE guarded form on the tab",
    suite: "console-mem",
  },
  {
    name: "537-gate · the save stops deciding its audience — ruling 523's defect, on a POST no path rule can see",
    file: GATE,
    /* ⚠️ RE-ANCHORED at C7 step 4b: the ceremony's own gated writer opens with the SAME verdict line, so the
       one-line form matched twice and `test:red-anchors` refused to inject it. The refusal sentence that follows
       is what tells the two doors apart, and it is the save's. Same defect, same assertion. */
    from: `  if (!(await houseConsoleAudience(viewerUserId, route)) || typeof viewerUserId !== "string") {\n    return { ok: false, error: SAVE_COPY.refused };`,
    to: `  if (typeof viewerUserId !== "string") {\n    return { ok: false, error: SAVE_COPY.refused };`,
    expect: "2.537 · a PLAYER, a signed-in AUDITOR and an anonymous caller are each REFUSED",
    suite: "console-mem",
  },
  /* ⚠️ THE FIRST FORM OF THIS DECLARATION WAS AIMED AT NOTHING (replan ruling 541's class, caught by driving it).
     It re-read the version immediately before the write — but BOTH writers await that read before EITHER writes, so
     both re-read the same number and the store's own conditional write still decided between them: the suite stayed
     GREEN with the defect injected. What actually defeats "refuse, never clobber" is a RETRY: the loser re-reads
     after losing and writes over the winner. That is the shape a well-meaning fix takes, and it is the one this
     declaration now injects. */
  {
    name: "537-cas · the loser of the CAS RETRIES on the fresh version instead of being refused, so the second officer silently overwrites the first",
    file: SAVE,
    from: `  const cas = await houseBotControlStore.saveLimits(input.baseVersion, patch);
  if (!cas.ok) return { ok: false, code: "CONFLICT" };`,
    to: `  let cas = await houseBotControlStore.saveLimits(input.baseVersion, patch);
  if (!cas.ok) cas = await houseBotControlStore.saveLimits((await houseBotControlStore.get()).limitsVersion, patch);
  if (!cas.ok) return { ok: false, code: "CONFLICT" };`,
    expect: "2.537 · TWO REAL WRITERS on ONE base version",
    suite: "console-mem",
  },
  {
    name: "537-cheap · a stale tab reaches the roster and the platform config before the CAS refuses it — three reads for a save that cannot land",
    file: SAVE,
    from: `  if (!Number.isInteger(input.baseVersion) || control.limitsVersion !== input.baseVersion) {`,
    to: `  if (!Number.isInteger(input.baseVersion)) {`,
    expect: "2.537 · a tab rendered from an older version is refused",
    suite: "console-mem",
  },
  {
    name: "537-partial · a post missing a field is accepted, so limits the officer never touched are silently CLEARED",
    file: GATE,
    from: `    if (typeof raw !== "string") return { ok: false, error: SAVE_COPY.stale };`,
    to: `    if (typeof raw !== "string") continue;`,
    expect: "2.537 · a post missing a field",
    suite: "console-mem",
  },
  {
    name: "537-unknown · a key the form does not own is ignored rather than refused",
    file: GATE,
    from: `  for (const key of Object.keys(input.values)) {
    if (!LIMIT_FIELD_BY_KEY.has(key)) return { ok: false, error: SAVE_COPY.stale };
  }`,
    to: `  void LIMIT_FIELD_BY_KEY;`,
    expect: "2.537 · a post missing a field",
    suite: "console-mem",
  },
  {
    name: "537-key-leak · a field's posted NAME becomes the column's own, which ships in the chunk and in the POST body under a neutral label",
    file: GATE,
    from: `  gCapStaffChosenDailyTzs: "targeted-daily-tzs",`,
    to: `  gCapStaffChosenDailyTzs: "gCapStaffChosenDailyTzs",`,
    expect: "2.537 · D19 · every key the form posts is neutral",
    suite: "console-mem",
  },
  {
    name: "537-name-drift · the rendered field name is derived from the label instead of the server's key, so the refusal's address stops matching it",
    file: FORM,
    from: `                    name={row.key}`,
    to: `                    name={row.name.toLowerCase().replace(/ /g, "-")}`,
    expect: "2.537 · RENDERED · D19 · every field's `name` and `data-field`",
    suite: "console-mem",
  },
  {
    name: "537-anchor · the strip's fragment is rendered on no field at all, so \"Set N global limits first →\" scrolls nowhere",
    file: FORM,
    from: `              return row.firstUnset ? (`,
    to: `              return false ? (`,
    expect: "2.537 · RENDERED · the strip's fragment lands on the FIRST unset required limit",
    suite: "console-mem",
  },
  {
    name: "537-dup-heading · the limits card names its own section twice — the card's title and the form's first group, 34px apart",
    file: FORM,
    from: `          {section.name === omitSection ? null : <p className="text-body-sm font-semibold text-text">{section.name}</p>}`
      + ``,
    to: `          <p className="text-body-sm font-semibold text-text">{section.name}</p>`,
    expect: "2.537 · RENDERED · 432(n) · the group whose name the card already carries loses its heading",
    suite: "console-mem",
  },
  {
    name: "537-recorded · a compliance row that did not write is reported as written — the officer is told the record is safe when it is not",
    file: SAVE,
    from: `    recorded = false;`,
    to: `    recorded = true;`,
    expect: "2.537 · a save whose COMPLIANCE ROW cannot be written still reports the truth",
    suite: "console-mem",
  },
  {
    name: "537-audit-actor · the compliance row stops naming the officer who made the change",
    file: SAVE,
    from: `    actorId: input.actorId,`,
    to: `    actorId: null,`,
    expect: "2.537 · 420 · the row names the ACTOR BY ID",
    suite: "console-mem",
  },
  {
    name: "537-audit-action · the save writes its record under another action, so `house_bot.limits_saved` goes back to having no writer",
    file: SAVE,
    from: `    action: "house_bot.limits_saved",`,
    to: `    action: "house_bot.rules_saved",`,
    expect: "2.537 · …and it writes the COMPLIANCE row",
    suite: "console-mem",
  },
  {
    name: "537-hint-leak · the loss limit's hint falls back to the shared table's, which says the feature's name under a neutral label",
    file: GATE,
    from: `  gCapDailyLossTzs: "Counted by the day a stake was placed,`,
    to: `  gCapDailyLossTzsUnused: "Counted by the day a stake was placed,`,
    expect: "2.537 · 453 · every shared HINT that names the feature",
    suite: "console-mem",
  },
  {
    name: "537-refusal-leak · the clear-while-on refusal falls back to the shared sentence, which names the feature on the screen that refuses",
    file: GATE,
    from: `  "X-CLEAR-ON": "A limit can't be cleared while the desk is on.`,
    to: `  "X-CLEAR-ON-UNUSED": "A limit can't be cleared while the desk is on.`,
    expect: "2.537 · 453 · clearing a required limit while the desk is ON",
    suite: "console-mem",
  },
  {
    name: "537-focus · the refusal names a field and nothing takes the officer to it — §K rule 7d's own defect",
    file: FORM,
    from: `        const landed = focusFirstInvalid(form, [result.field]);`,
    to: `        const landed = { ok: true, field: result.field, reason: "", ownedByTab: "" };`,
    expect: "1.412 · §K 7d · every field carries `dataField` and `name`",
    suite: "console-mem",
  },
  {
    name: "537-revalidate · a REFUSED save revalidates the section, replacing the officer's own typing at the moment they are told to fix one field",
    file: ACTIONS,
    from: `    if (result.ok) revalidatePath(CONSOLE_ROUTE);`,
    to: `    revalidatePath(CONSOLE_ROUTE);`,
    expect: "1.537 · only a save that LANDED revalidates the section",
    suite: "console-mem",
  },
  {
    name: "537-action-route · the action asks the door about another section's route, which its own section gate does not answer for",
    file: ACTIONS,
    from: `houseLimitsSaveForConsole(session?.userId ?? null, "/admin/desk", input)`,
    to: `houseLimitsSaveForConsole(session?.userId ?? null, "/admin/house", input)`,
    expect: "1.537 · 523 · the action is",
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
    expect: "1.373 · EVERY panel that paints the subject column carries the SAME floor",
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
    /* ⚠️ RE-ANCHORED at C7 step 4: the roster went from SIX columns to EIGHT when the way-out and "Last bet"
       columns arrived with the page and the reader they were waiting for. THE DEFECT IS UNCHANGED — a ghost with
       a different column count from the table it stands in for. */
    from: `        <SkTableCard cols={8} rows={5} minWidth={280} title={false} sw={false} cellPy={16} />`,
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
    from: `the page's own 16px cell padding (SIX until`,
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
    /* ⭐ RE-ANCHORED at C7 step 4b to the SAME defect on the line that now carries it. The sentence moved when the
       switch became operable — it is no longer a build note, it is the one state where a disabled switch owes its
       own words — and the mutation still does exactly what it always did: make it the head action's sentence. */
    from: `      : "The desk has been withdrawn. It cannot be switched on again.",`,
    to: `      : "Designating an account is not ready on this build yet.",`,
    expect: "432(j) · 432(n) · a DISABLED master switch carries exactly one reason beside it",
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
  /* ── C7 step 3's VISUAL pass · rulings 544 and 432(n), both found by reading a served tile. ───────────── */
  {
    /* ⚠️ THE MUTATION IS THE CODE AS IT SHIPPED BEFORE 544, which is the point: `ProgressBar` clamps at 100%, so
     * `limits-at-1280.png` and `limits-over-1280.png` are pixel-identical in the meter and the clause is the only
     * discriminator there is. Untoned, it is four grey words at the end of five grey lines. */
    name: "544-edge-tone · the bar's at/over clause goes back to the sentence's own tone, where the geometry cannot say it",
    file: PAGE,
    from: `          {row.edgeText ? <span className="text-warning-fg">{row.edgeText}</span> : null}`,
    to: `          {row.edgeText}`,
    expect: "1.544 · the BAR's at/over clause carries the warning tone",
    suite: "console-mem",
  },
  {
    name: "432n-placeholder · an unset limit says \"Not set\" twice in one field — once in the box, once in the caption below it",
    file: FORM,
    from: `                    placeholder={row.optional && !row.unset ? "Not set" : undefined}`,
    to: `                    placeholder={row.optional ? "Not set" : undefined}`,
    expect: "2.537 · RENDERED · 432(n) · an UNSET limit says",
    suite: "console-mem",
  },
  {
    /* ⚠️ THE MUTATION PUTS BACK THE SHARED TABLE'S OWN CLAUSE, NEUTRALISED — which is exactly how it got in.
       Under a SET field it prints "Not set" beside the field's own value; under an unset one it says 364's
       caption a second time, 40px lower. */
    name: "432n-hint-notset · a hint carries the unset consequence again, so the panel says it twice — and says it under a field that is SET",
    file: GATE,
    from: `  gTargetsMaxActive: "Across every account. The master switch does not need this limit.",`,
    to: `  gTargetsMaxActive: "Across every account. Not set — no target can be added, and the master switch does not need this limit.",`,
    expect: "2.537 · 432(n) · not one hint this panel renders says",
    suite: "console-mem",
  },
  /* ── C7 step 4 · ruling 351's one new seam member. Both mutations land on the MEMORY twin, which is the twin
     the `console-mem` child runs; the PRISMA twin's shape is `test:dal-parity` 16.botRateUsage's subject. ───── */
  {
    /* The two windows collapse into one, so the hour count reads the day's. The fixture places one stake NOW, one
       two hours ago and one two days ago precisely so the two numbers differ — 1 and 2 — and a reader that answers
       the same number twice cannot hide behind a fixture where they happen to agree. */
    name: "351-window · the hour window becomes the day window, so `bets this hour` reads today's count",
    file: DAL,
    from: `      if (at > now - HOUR_MS) row.placedLastHour++;`,
    to: `      if (at > now - DAY_MS) row.placedLastHour++;`,
    expect: "1.351 · one account's rate usage",
    suite: "console-mem",
  },
  {
    /* `lastPlacedAt` takes the OLDEST placement instead of the newest — the `min`/`max` slip, which paints a
       "Last bet" of two days ago on an account that staked a minute ago. */
    name: "351-oldest · `lastPlacedAt` keeps the OLDEST placement instead of the newest",
    file: DAL,
    from: `      if (row.lastPlacedAt == null || at > ms(row.lastPlacedAt)) row.lastPlacedAt = new Date(at).toISOString();`,
    to: `      if (row.lastPlacedAt == null || at < ms(row.lastPlacedAt)) row.lastPlacedAt = new Date(at).toISOString();`,
    expect: "1.351 · one account's rate usage",
    suite: "console-mem",
  },
  /* ── C7 step 4 · replan ruling 547 and ruling 432(f) — the two sentences step 3 left saying the wrong thing. ─ */
  {
    /* The caption goes back to choosing by MEMBERSHIP alone, with no reference to the render's switch state -- which is the shape that painted “the master switch cannot be turned on” under a chip reading ON. */
    name: "547-caption-blind · the unset caption stops asking whether the desk is already on",
    file: GATE,
    from: `    return on ? REQUIRED_UNSET_ON : REQUIRED_UNSET_OFF;`,
    to: `    return REQUIRED_UNSET_OFF;`,
    expect: "1.547 · with the desk ON",
    suite: "console-mem",
  },
  {
    /* ONE key moves from a row whose shared sentence carries the feature's own word to a row whose sentence is already neutral. That is BOTH halves of the derived population at once: a dirty sentence with no override, and an override for a sentence nobody had to rename. */
    name: "432f-wayout-key · the neutral way-out override moves onto a row that never needed one",
    file: GATE,
    from: `  HOLDER_WITHDREW: "The holder stopped the stakes themselves. Only a fresh password they give you can restart it.",`,
    to: `  MANUAL: "The holder stopped the stakes themselves. Only a fresh password they give you can restart it.",`,
    expect: "1.311 · 432(f) · not one way-out sentence",
    suite: "console-mem",
  },
  /* ── C7 step 4 · the account page, its three answers, its floor STATE, X6, and the two roster columns ── */
  {
    /* Under ruling 259 a signed-in player reaches this route. With the order swapped, a real id and an invented one answer differently for a viewer outside the audience — and the difference is a STATUS CODE, which no vocabulary needle can see. */
    name: "399-oracle · the record check runs BEFORE the audience verdict, so the 404 becomes an id oracle",
    file: DETAIL,
    from: `  if (!answer) return null;
  if (!answer.found) notFound();`,
    to: `  if (!answer.found) notFound();
  if (!answer) return null;`,
    expect: "1.399 · the audience verdict is AWAITED",
    suite: "console-mem",
  },
  {
    /* Ruling 358 fixes a removed account's read set as the row, its final state and its saved rules. With the branch dead it reads the holder's wallet, the day book, the exposure, the rate and the targets — five reads for an account that can never stake again, which is what D20 removed. */
    name: "358-removed-reads · a REMOVED account falls through to the live read set",
    file: GATE,
    from: `  if (removed) {`,
    to: `  if (false as boolean) {`,
    expect: "1.358 · its read set is the row",
    suite: "console-mem",
  },
  {
    /* Ruling 459 withdrew 368's last exception: the holder's balance is the one number on these screens belonging to someone other than 50pick, and the decision the sentence supports is answered by a STATE. */
    name: "368-balance · the floor sentence spends the holder's own balance",
    file: GATE,
    from: `  const row = bot;`,
    to: `  const row = bot;
  if (holder && floorSentence) floorSentence = String(holder.walletBalance) + floorSentence;`,
    expect: "1.368 · 459 · the holder's own balance appears NOWHERE",
    suite: "console-mem",
  },
  {
    /* `WALLET_MISSING` is a PauseReason and not a `HolderCause`, so a causes test compiles and is FALSE for ever — ruling 541's mutation-aimed-at-nothing, in the product rather than in a guard. */
    name: "507-x6 · X6 reads a live CAUSE again, which is the shape that could never be true",
    file: GATE,
    from: `  const settlementBlocked = holder != null && holder.walletBalance == null;`,
    to: `  const settlementBlocked = causes.some((c) => c.code === "WALLET_MISSING");`,
    expect: "1.507 · X6 · a MISSING holder wallet",
    suite: "console-mem",
  },
  {
    /* `openExposure` has no day filter, so an exposure figure under a heading that says nothing about its window reads as today's — a mislabelled amount, which is the §C2 defect 363 exists for. */
    name: "363-scope · the exposure row loses the scope word ruling 363 argues its whole case from",
    file: GATE,
    from: `    capRow("capOpenExposureTzs", "open now", openStake),`,
    to: `    capRow("capOpenExposureTzs", "", openStake),`,
    expect: "1.363 · the exposure row is scoped",
    suite: "console-mem",
  },
  {
    /* 432(h)'s whole subject: the first control an officer reaches on the deliverable must open the account it names, and the column exists exactly when that page does. */
    name: "432h-href · the roster's way out stops pointing at the page it opens",
    file: GATE,
    from: `      href: consoleBotHref(bot.id),`,
    to: `      href: "",`,
    expect: "1.432h · every roster row carries a way-out href",
    suite: "console-mem",
  },
  {
    /* Read off `acct-removed-1280.png`: the Overview tab rendered 600px of NOTHING and the Targets tab would have painted the kit's failure treatment for a read ruling 358 says is never taken. */
    name: "435a-removed-cards · a REMOVED account gets its rail back, and an empty panel behind it",
    file: DETAIL,
    from: `        {!view.removed && (
        /* 312 · the rail carries exactly the tabs whose panels exist.`,
    to: `        {true && (
        /* 312 · the rail carries exactly the tabs whose panels exist.`,
    expect: "1.435 · 358 · every card of the account page is guarded",
    suite: "console-mem",
  },
  /* ── C7 step 7 · THE CLOSING GATES (rulings 320, 370, 371, 375, 390, 391, 395, 397, 398) ────────────────────────
   * Each puts back the thing the closing step retired, or the shape the console could still have shipped: a results
   * reader with no reader, an amount behind a refusal sentence, a money record with no transaction behind it, a
   * thrown message one deploy flag from the person who POSTed the action id, a browser key that names the feature,
   * an API route under the console's own segment, and the vocabulary word whose promotion would redden the desk's
   * own button. ⛔ The last two are mutations of GUARD files, which is the only way an assertion whose subject IS a
   * guard can be shown able to fail — the precedent is `318-expect-drift` on this very file. */
  {
    name: "371-book-reader · the results reader D20 struck is declared again in `book.ts`, with no caller and nothing to stop the next page using it",
    file: BOOK,
    from: `export async function houseOpenExposure(houseBotId: string | null, tx?: HouseTx): Promise<number> {`,
    to: `export async function houseBotBook(input: { houseBotId: string | null }): Promise<{ netTzs: number }> {\n  return { netTzs: 0, ...input };\n}\n\nexport async function houseOpenExposure(houseBotId: string | null, tx?: HouseTx): Promise<number> {`,
    expect: "1.371 · no house-bot module and no house-bot guard names",
    suite: "console-mem",
  },
  {
    name: "371-book-type · the `HouseBotBook` type comes back, re-acquiring `netTzs` and `feeWithheldTzs` for whoever reaches for it next",
    file: BOOK,
    from: `export function foldDayBook(raw: RawSums, houseBotId: string | null, dayKey: string): HouseDayBook {`,
    to: `export type HouseBotBook = { bets: number; feeWithheldTzs: null };\n\nexport function foldDayBook(raw: RawSums, houseBotId: string | null, dayKey: string): HouseDayBook {`,
    expect: "and `book.ts` itself declares neither of them",
    suite: "console-mem",
  },
  {
    name: "370-held-amount · ruling 254's held amount goes into the kill switch's own sentence, which is exactly the figure 370 decided NOT KEPT",
    file: FEED,
    from: `  DRAINED: "House bots are off. No bot will place a bet.",`,
    to: `  DRAINED: "House bots are off. No bot will place a bet. TZS 50,000 is still held.",`,
    expect: "1.370 · not one `EngineCode` sentence and not one switch-off sentence carries a formatted amount",
    suite: "console-mem",
  },
  {
    name: "370-outcome-money · `SwitchOffOutcome` grows a money field, so a later render has a held figure to reach for",
    file: KILL,
    from: `      cancelled: number;`,
    to: `      cancelled: number;\n      heldTzs: number;`,
    expect: "1.370 · `SwitchOffOutcome` carries no money field at all",
    suite: "console-mem",
  },
  {
    name: "375-writer · a console action writes the reimbursement record D3b has no transaction behind",
    file: ACTIONS,
    from: `export async function saveDeskLimitsAction(input: ConsoleLimitsSaveInput): Promise<ConsoleLimitsSaveResult> {`,
    to: `const REIMBURSEMENT_ACTION = "house_bot.reimbursement_recorded";\n\nexport async function saveDeskLimitsAction(input: ConsoleLimitsSaveInput): Promise<ConsoleLimitsSaveResult> {`,
    expect: "1.375 · `reimbursement_recorded` has no writer anywhere under `src/`",
    suite: "console-mem",
  },
  {
    name: "375-audit-key · a thirty-second house audit key is slipped into the map instead of being ruled",
    file: CONSTANTS,
    from: `  "house_bot.credential_changed": "SECURITY",`,
    to: `  "house_bot.credential_changed": "SECURITY",\n  "house_bot.reimbursement_paid": "COMPLIANCE",`,
    expect: "and `HOUSE_AUDIT`'s key set is PINNED at its post-un-build size",
    suite: "console-mem",
  },
  {
    name: "390-throw · a console action throws instead of returning a typed refusal, and `runAdminAction` echoes 140 characters of the message",
    file: ACTIONS,
    from: `export async function setDeskSwitchAction(input: ConsoleSwitchInput): Promise<ConsoleSwitchResult> {`,
    to: `export async function setDeskSwitchAction(input: ConsoleSwitchInput): Promise<ConsoleSwitchResult> {\n  if (!input) throw new Error("house bot desk unreadable");`,
    expect: "1.390 · not one `throw` in the console's server modules",
    suite: "console-mem",
  },
  {
    name: "390-sentence · a refusal sentence names the feature, on the one screen 453 exists to keep neutral",
    file: GATE,
    from: `  NOT_FOUND: "That account is not on the desk any more. Reload the desk.",`,
    to: `  NOT_FOUND: "That house bot is not on the desk any more. Reload the desk.",`,
    expect: "and every refusal SENTENCE the door can hand back is free of the shared vocabulary",
    suite: "console-mem",
  },
  {
    name: "391-storage · the console starts keeping a draft in the browser, which is where 04 C12's module was headed",
    file: LIVE,
    from: `  const [holds, setHolds] = useState(0);`,
    to: `  const [holds, setHolds] = useState(0);\n  sessionStorage.setItem("desk:holds", String(holds));`,
    expect: "1.391 · no draft module was smuggled into",
    suite: "console-mem",
  },
  {
    name: "391-key · the draft key takes the struck `hb:` prefix, which no absence guard on this branch can see",
    file: LIVE,
    from: `export function DeskLive({ live }: { live: boolean }) {`,
    to: `const DRAFT_KEY = "hb:desk-draft";\n\nexport function DeskLive({ live }: { live: boolean }) {\n  void DRAFT_KEY;`,
    expect: "1.391 · and the rule the first writer will meet is stated where it binds",
    suite: "console-mem",
  },
  {
    name: "395-api-reach · an API route names the console route, which is the first half of an export nobody ruled",
    file: HEALTH,
    from: `import { NextResponse } from "next/server";`,
    to: `import { NextResponse } from "next/server";\nconst DESK = "/admin/desk";\nvoid DESK;`,
    expect: "1.395 · and no file under `src/app/api/` names the console route",
    suite: "console-mem",
  },
  {
    name: "397-enter-now · \"enter now\" is promoted into the shared words, exactly as the draft scheduled — and the desk's own rules row goes with it",
    file: VOCAB,
    from: "export const HOUSE_WORD_SOURCE = String.raw`liquidity|ukwasi|",
    to: "export const HOUSE_WORD_SOURCE = String.raw`enter now|liquidity|ukwasi|",
    expect: "1.397 · `enter now` is NOT in the shared words",
    suite: "console-mem",
  },
  {
    name: "397-probe-out · the served probe leaves `VOCABULARY_CONSUMERS`, and the one absence instrument nothing else holds goes unheld again",
    file: REPORTS,
    from: `  "scripts/house-bot-console-probe.mts",\n] as const;`,
    to: `] as const;`,
    expect: "1.397 · the served probe is inside `VOCABULARY_CONSUMERS`",
    suite: "console-mem",
  },
  {
    name: "397-family-source · this suite re-declares a vocabulary family source of its own, which is the thing ruling 175 exists to refuse",
    file: CASES,
    from: `const NEUTRAL = consoleNeutralRegExp();`,
    to: `const HOUSE_WORD_SOURCE = "liquidity|house bot";\nvoid HOUSE_WORD_SOURCE;\nconst NEUTRAL = consoleNeutralRegExp();`,
    expect: "397(e) · this suite imports the shared vocabulary, re-declares none of its three family sources",
    suite: "console-mem",
  },
  {
    name: "397-deviation-unrecorded · the reason this suite is outside the closed list is deleted from the list's own source, leaving the deviation in a plan nobody greps",
    file: REPORTS,
    from: "`scripts/lib/house-bot-console-cases.mts` is deliberately NOT here",
    to: "that file is elsewhere",
    expect: "397(e) · this file is EITHER inside `VOCABULARY_CONSUMERS` or the reason it is not is written in that list's own source",
    suite: "console-mem",
  },
  {
    /* ⭐ RE-ANCHORED AT THE C7 STEP 7 REVIEW to the same defect. The short-circuit chain this quoted was replaced
       by a rungs TABLE read from the bottom (review d19-hunt-02 / test-strength-02), so the defect is now written
       as the table losing its top rung: `built` falls to 6 and the four assertions step 7 owes stop being owed. */
    name: "398-rung7 · the roll-call's ladder stops at step 6, so the four assertions step 7 owes stop being owed and their absence becomes invisible again",
    file: CASES,
    from: `      [[3, "limits"], [4, "detail"], [5, "activity"], [6, "wizard"], [7, "closing"]];`,
    to: `      [[3, "limits"], [4, "detail"], [5, "activity"], [6, "wizard"]];`,
    expect: "1.398 · ROLL-CALL · every D19 assertion owed at or before the step this tree has built",
    suite: "console-mem",
  },
  {
    name: "320-href-unresolvable · a house alert's account href stops resolving, which is precisely what the retired `COMMIT_7` exemption used to hide",
    file: ROUTES,
    from: "  return `${CONSOLE_ROUTE}/${botId}`;",
    to: "  return `${CONSOLE_ROUTE}-archive/${botId}`;",
    expect: "7.2 · ⭐ 04:1077 · every link a house alert produces resolves to a page that exists today",
    suite: "comms-mem",
  },
  {
    name: "320-control-resolves · the resolver's own control is aimed at a path that DOES resolve, so the retired exemption's replacement stops measuring anything",
    file: COMMS,
    from: `      const parts = "/admin/desk/hb_0123456789abcdef01234567/nowhere-at-all".split("/").filter(Boolean);`,
    to: `      const parts = "/admin/desk".split("/").filter(Boolean);`,
    expect: "7.2b · CONTROL · the resolver still REFUSES a route nobody built",
    suite: "comms-mem",
  },
  /* ══ C7 STEP 7 REVIEW · THE DECLARATIONS THE FIXES OWE ═══════════════════════════════════════════════════════
     Each names the assertion the review added or repaired, and each plants the defect the review MEASURED rather
     than a convenient one. Four mutate GUARD files on purpose: an assertion whose SUBJECT is a guard can only be
     shown able to fail by mutating that guard (`318-expect-drift` is the precedent on this register). */
  {
    name: "371-big-file · the struck results reader comes back in the BIGGEST file of the population, where the retired three-regex stripper was blind",
    file: DAL,
    from: `export const TARGET_TIMING_FIELDS = ["delayMinSec", "delayMaxSec", "timingFrom", "reactTo"] as const;`,
    to: `export type HouseBotBookRow = { netTzs: number };\n\nexport const TARGET_TIMING_FIELDS = ["delayMinSec", "delayMaxSec", "timingFrom", "reactTo"] as const;`,
    expect: "1.371 · no house-bot module and no house-bot guard names",
    suite: "console-mem",
  },
  {
    name: "371-desync · the shared literal blanker starts LOSING characters, which is the silent failure the per-file length invariant exists to catch",
    file: DECOMMENT,
    from: `      if (close !== -1) { out += c + blankRun(s.slice(i + 1, close)) + c; i = close + 1; continue; }`,
    to: `      if (close !== -1) { out += c + c; i = close + 1; continue; }`,
    expect: "1.371 · no house-bot module and no house-bot guard names",
    suite: "console-mem",
  },
  {
    name: "390-erasure-names · the DSAR refusal a COMPLIANCE officer reads names the feature, the record id and the owner-only route again",
    file: ERASURE,
    from: `      error: "This account is still in use by an owner-managed account and cannot be erased yet. An owner has been told; the request stays open and can be run again once it is released.",`,
    to: `      error: "This account is still house bot hb_0123456789abcdef01234567. The owner must remove it at /admin/desk before it can be erased.",`,
    expect: "1.390 · and the ERASURE door's own refusal",
    suite: "console-mem",
  },
  {
    name: "390-catch · a console action loses the catch that turns a throw from behind the door into a typed refusal",
    file: ACTIONS,
    from: `    return { ok: false, error: safeError(err, "Nothing was saved. Reload the page and try again.") };`,
    to: `    return { ok: false, error: String(err) };`,
    expect: "1.390 · and every exported console action turns a throw from BEHIND the door into a typed refusal",
    suite: "console-mem",
  },
  {
    name: "370-template-amount · an engine sentence is rewritten as a TEMPLATE carrying an interpolated amount — the exact form the old double-quote-only capture dropped",
    file: FEED,
    from: `  NO_REACT_ZONE: "the stake came too close to betting close",`,
    to: "  NO_REACT_ZONE: `the stake came too close to betting close, TZS 50,000 still held`,",
    expect: "1.370 · not one `EngineCode` sentence and not one switch-off sentence carries a formatted amount",
    suite: "console-mem",
  },
  {
    name: "395-file-floor · the API file walk's extension filter stops matching, so it scans nothing and reports a clean zero",
    file: CASES,
    from: `          else if (/\\.tsx?$/.test(e)) {\n            scanned.push(rel);`,
    to: `          else if (/\\.never$/.test(e)) {\n            scanned.push(rel);`,
    expect: "1.395 · and no file under `src/app/api/` names the console route",
    suite: "console-mem",
  },
  {
    name: "398-ladder-hole · the ladder stops computing its gaps, so a tree carrying the closing step's artefact with step 5 missing reads as complete",
    file: CASES,
    from: `      return { built, gaps: RUNGS.filter(([n, k]) => n <= built && !t[k]).map(([n, k]) => \`\${n}:\${k}\`) };`,
    to: `      return { built, gaps: [] as string[] };`,
    expect: "1.398 · LADDER · every rung below the highest one this tree carries",
    suite: "console-mem",
  },
  {
    name: "474-head-hook · the account page's own head stops marking the operator's label, so the served gate scans an Owner-chosen value as if this repo had written it",
    file: DETAIL,
    from: `        titleIsOperatorText`,
    to: `        sw={undefined}`,
    expect: "1.474 · EVERY site under the section that paints the account's own LABEL carries the 474 hook",
    suite: "console-mem",
  },
  {
    name: "474-shell-stamp · AdminPageHead stops stamping the hook it was given, so the prop is accepted and the attribute never reaches the DOM",
    file: SHELL,
    from: `          {...(titleIsOperatorText ? { "data-operator-text": "label" } : {})}`,
    to: `          {...({})}`,
    expect: "1.474 · EVERY site under the section that paints the account's own LABEL carries the 474 hook",
    suite: "console-mem",
  },
  {
    name: "474-shared-scan · the served gate goes back to running the SHARED vocabulary over the raw body, with no operator exemption",
    file: VISUAL,
    from: `        houseHits(bodySubject).length === 0, houseHits(bodySubject).slice(0, 6).join(","));`,
    to: `        houseHits(facts.body).length === 0, houseHits(facts.body).slice(0, 6).join(","));`,
    expect: "1.474 · and the served gate removes the operator's marked text from the SHARED vocabulary scan",
    suite: "console-mem",
  },
  {
    /* ⛔ RE-POINTED AT C7 STEP 7's REVIEW FIX, AND THE DEFECT IT PLANTS IS THE SAME ONE. The shared thing became a
       COMPONENT (`../way-out-link`) rather than the class string the review first put in `console-routes.ts`, which
       `test:house-bot-rules` 0.console-routes.ts refused — Tailwind scans every file, so a class-shaped string in a
       routes module becomes CSS and an invalid one once 500'd every route here. The old `from` line no longer
       exists, so this anchor stopped resolving and the harness was measuring NOTHING. It now takes the account
       page's real way out off the shared component and re-types the hover-only treatment by hand, which is exactly
       the defect the name describes and exactly what 1.432's re-typed-treatment sweep is for. */
    name: "432-way-out · the account page re-types the hover-only link treatment the wizard's repair replaced, so one section ships two looks for one control",
    file: DETAIL,
    from: `          <WayOutLink href={CONSOLE_ROUTE}>`,
    to: `          <Link href={CONSOLE_ROUTE as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline">`,
    expect: "1.432 · the way-out link is declared ONCE",
    suite: "console-mem",
  },
  {
    /* ⛔ THE OTHER THREE ASSERTIONS THE SHARED-COMPONENT CHANGE BROKE GET DECLARED MUTATIONS OF THEIR OWN, in the
       same pass that repaired them. Each one was re-aimed at a NEW shape, and a re-aimed assertion nobody has seen
       go red is an assertion that has stopped measuring — which is precisely the state all four were left in.
       ⭐ THIS ONE IS THE 432(i)/541(b) POSITIONAL PIN, and the defect is the one the pin was widened for: the head's
       way out written back as a bare `<Link>` with the SAME href. The old scan could not see that difference at all
       — it knew one element name — so this is the mutation that proves the pin now measures the ELEMENT beside the
       href rather than simply expecting one fewer link. */
    name: "306-way-out-element · the head's shared way out is re-typed as a bare <Link> with the same href, so the section paints one control two ways and the positional pin must say so",
    file: PAGE,
    from: `                ? <WayOutLink href={view.limitsHref}>{view.rosterFullReason}</WayOutLink>`,
    to: `                ? <Link href={view.limitsHref as Route} className="underline">{view.rosterFullReason}</Link>`,
    expect: "1.306 · 432(i) · 541(b) · every `<Link href=` in the section is pinned BY POSITION",
    suite: "console-mem",
  },
  {
    /* ⭐ 1.312a's OWN DEFECT: the LINKED roster-full sentence — the one that ends in an arrow — painted a second
       time OUTSIDE every link, where the arrow is a promise of navigation nothing honours. The paint is ADDED
       rather than swapped for the plain form, so the mutation lands on this assertion and not on the neighbour
       that holds the inert form still BUILT. */
    name: "312a-linked-outside · the head paints the LINKED roster-full sentence a second time outside every link, so an arrow sits on inert text",
    file: PAGE,
    from: `            <span className="text-body-sm text-text-secondary max-w-[38ch]">`,
    to: `            <span className="text-body-sm text-text-secondary max-w-[38ch]">\n              {view.rosterFullReason}`,
    expect: "1.312a · 432(i) · the head paints the LINKED roster-full sentence only inside the one guarded `<Link>`",
    suite: "console-mem",
  },
  {
    /* ⭐ 1.359/456's OWN DEFECT, and it is conformance-355's verbatim: the way to the holder's own money screen
       painted INSIDE the `funded !== null` guard, so an unreadable wallet takes the door with the state — the
       officer loses the way forward at the exact moment they need it. */
    name: "359-door-inside · the way to the holder's own money screen is painted inside the funded guard, so a failed wallet read removes the door with the state",
    file: NEW_PAGE,
    from: `                  {view.funded !== null && (`,
    to: `                  {view.funded !== null && (\n                    <WayOutLink href={view.holderHref}>Open the holder&apos;s own money screen</WayOutLink>`,
    expect: "1.359 · 456 · the page paints the bonus fact and the way to the holder's own money screen OUTSIDE the funded guard",
    suite: "console-mem",
  },
  {
    name: "432-chip-shrink · the account strip's status chip becomes shrinkable again, which is what broke the longest status word across two lines at 360",
    file: DETAIL,
    from: `              <Chip size="sm" variant={view.statusChip} className="shrink-0">{view.statusWord}</Chip>`,
    to: `              <Chip size="sm" variant={view.statusChip}>{view.statusWord}</Chip>`,
    expect: "1.432 · the account strip's status chip is pinned against the flex shrink",
    suite: "console-mem",
  },
  {
    name: "432-loss-scope · the LOSS TODAY tile drops the scope from its ceiling, so the band and the column beside it name one figure two ways",
    file: GATE,
    from: "        ? moneyTile(\"Loss today\", lossUsed, control.gCapDailyLossTzs, `${FIELD_META.gCapDailyLossTzs.label} (projected)`)",
    to: `        ? moneyTile("Loss today", lossUsed, control.gCapDailyLossTzs, FIELD_META.gCapDailyLossTzs.label)`,
    expect: "1.432 · the LOSS TODAY tile names its ceiling with the SCOPE",
    suite: "console-mem",
  },
  {
    name: "432-apostrophe · one console label takes a curly apostrophe again, so one row of the limits list renders a different glyph from its neighbours",
    file: GATE,
    from: `  gStaffChosenMaxCounterpartyShare: "One player's share limit",`,
    to: "  gStaffChosenMaxCounterpartyShare: \"One player\u2019s share limit\",",
    expect: "1.432 · not one curly apostrophe anywhere the console writes its own copy",
    suite: "console-mem",
  },
  {
    name: "388-required · a reason field stops saying it is required, leaving a disarmed primary button with nothing on screen to explain it",
    file: GATE,
    from: `    reasonLabel: "Why are you switching it on? (required)",`,
    to: `    reasonLabel: "Why are you switching it on?",`,
    expect: "1.388 · every reason field the console asks for is MARKED required",
    suite: "console-mem",
  },
  {
    name: "435-year · the removal record's date loses its year, so a removal from a previous year reads as this year on the one card meant to outlive the account",
    file: GATE,
    from: "`${formatEat(removedAtMs, \"D MMM YYYY\")} ${formatEat(removedAtMs, \"HH:MM\")} EAT`",
    to: "`${formatEat(removedAtMs, \"D MMM\")} ${formatEat(removedAtMs, \"HH:MM\")} EAT`",
    expect: "1.435 · the removal record's date carries the YEAR",
    suite: "console-mem",
  },
  {
    name: "435-saved-rules · the removed account's saved-rules card starts painting the live captions again, so the page states a consequence its own removal Callout has just denied",
    file: DETAIL,
    from: `          <SavedRulesCard rows={rulesRows} reason={view.rulesReason} captions={false} />`,
    to: `          <SavedRulesCard rows={rulesRows} reason={view.rulesReason} captions />`,
    expect: "1.435 · the saved-rules card is declared ONCE and used by both states",
    suite: "console-mem",
  },
  {
    name: "320-population · the comms walk's console filter reports nothing, so the retired exemption's replacement resolves an EMPTY set and reads as compliance",
    file: COMMS,
    from: `  const consoleHrefs = hrefs.filter((h) => h.split("?")[0] === CR.CONSOLE_ROUTE || h.split("?")[0].startsWith(\`\${CR.CONSOLE_ROUTE}/\`));`,
    to: `  const consoleHrefs = hrefs.filter(() => false);`,
    expect: "7.2a · the walk really had links to resolve",
    suite: "comms-mem",
  },
  {
    /* ⚠️ REPLACED TWICE ON 2026-09-20 (C7 step 5's landing half), and the second repair is the one worth reading.
       Its subject was a RECORDED DEBT left standing after its panel was built, and there is no debt list any more:
       7.2c asserts ZERO dead tabs with no tolerance at all. The first replacement pointed at the RIGHT defect — a
       panel deleted while its key stays on the rail — and filed it under the WRONG SUITE and the WRONG LABEL.
       🔴 MEASURED, not reasoned: the comms suite reads `console-routes.ts` and nothing else of the section, so a
       deleted PANEL is invisible to it and this mutation would have been reported WRONG-ASSERTION — which is the
       exact class ruling 505's roll-call exists to end, caught by that roll-call on its first run. And the label it
       named scans `tab === "…"` occurrences, which `false && tab === "history"` still satisfies. It is filed under
       `console-mem` against the assertion that slices each panel OUT of the page's source, where an unreachable
       group reads as an empty slice. The comms half of the same rule gets its own entry below, aimed at the thing
       the comms suite CAN see: the KEY going missing while an alert still links to it. */
    name: "320-tab-panel-gone · a panel is deleted while its key stays on the rail, so every alert linking to it lands on a screen that quietly repaints the roster",
    file: PAGE,
    from: `        {tab === "history" && (<>`,
    to: `        {false && tab === "history" && (<>`,
    expect: "1.312 · CONTROL · each of the four panels is found and non-empty in the page's own source",
    suite: "console-mem",
  },
  {
    /* ⛔ THE COMMS HALF OF RULING 312, AND IT IS WHAT 7.2c MEASURES NOW THAT THE TOLERANCE LIST IS GONE: a tab key
       leaves the closed list while the alerts still link to it, so every bell carrying that `?tab=` lands on a
       screen that quietly repaints the roster (302's fallback) with nothing saying the panel was not shown. The
       hour summary's own link is the one this fires on. */
    name: "320-tab-key-gone · the landing rail loses a key while a delivered alert still links to it, so the bell lands on a screen that silently repaints the roster",
    file: ROUTES,
    from: `export const CONSOLE_TABS = ["roster", "activity", "limits", "history"] as const;`,
    to: `export const CONSOLE_TABS = ["roster", "limits", "history"] as const;`,
    expect: "7.2c · every `?tab=` a house alert produces names a panel that is BUILT for its own SHAPE",
    suite: "comms-mem",
  },
  {
    name: "318-comms-drift · a comms-mem declaration expect rots into a label no run prints, which is the WRONG-ASSERTION class the roll-call exists to end",
    file: ANCHORS,
    from: "    to: `      const parts = \"/admin/desk\".split(\"/\").filter(Boolean);`,\n    expect: \"7.2b · CONTROL · the resolver still REFUSES a route nobody built\",",
    to: "    to: `      const parts = \"/admin/desk\".split(\"/\").filter(Boolean);`,\n    expect: \"7.2z · CONTROL · a label no run of this suite prints\",",
    expect: "7.505 · every declared `comms-mem` mutation",
    suite: "comms-mem",
  },
  {
    /* ⛔ L52 · THE RULE TABLE IS A RENDERED STRING. `rateLimitSnapshot()` returns each live bucket's ACTION half and
       `/admin/system` paints it verbatim to every staff account with the ops VIEW grant. Until this checkpoint the
       desk's account check named the feature there, and C7 step 6 gave it a real caller — so the word was reachable
       on an admin table outside this feature's audience. The mutation puts a vocabulary word back in the same place.
       (The exact historical spelling is planted INSIDE the suite by 0.L52.c4, rebuilt from the shared sample; it is
       not re-typed here, because a word in an anchors file is still a word in the tree.) */
    name: "L52-rule-word · a rate-limit action name carries a vocabulary word again, and /admin/system paints it to the ops VIEW audience",
    file: "src/lib/server/rate-limit.ts",
    from: `  "desk.verify":   { capacity: 3, refillPerMin: 0.2 },`,
    to: `  "liquidity.verify":   { capacity: 3, refillPerMin: 0.2 },`,
    expect: "0.L52.1 · ⛔ D19 · L52 · NO rate-limit action name carries the shared vocabulary",
    suite: "reports-mem",
  },
  {
    /* ⛔ THE FAIL-OPEN THE RENAME RISKS, AND `tsc` CANNOT SEE IT. `RATE_RULES` is typed `Record<string, RateRule>`,
       so `keyof typeof RATE_RULES` is `string`; `rateCheck` returns `{ allowed: true }` on an action nobody
       declares. A rename that missed this caller would switch the desk's password-check limiter OFF in silence,
       every suite staying green — `test:house-bot-designation` 1.8 would still pass, because an unlimited bucket
       never refuses. 0.L52.3 is the only assertion that reads the call site against the table. */
    name: "L52-stale-caller · the desk's account check names a rule the table does not declare, so its limiter fails open and nothing else says so",
    file: DESIG,
    from: `  const rl = await rateCheckAsync(\`\${officerId}:\${userId}\`, "desk.verify");`,
    to: `  const rl = await rateCheckAsync(\`\${officerId}:\${userId}\`, "desk.verify.v2");`,
    expect: "0.L52.3 · ⛔ every call site names a rule the table DECLARES",
    suite: "reports-mem",
  },
  {
    /* ⛔ RULING 232 · THE DEFECT A PRESENCE CHECK PASSES. The marker is still there, still well-formed, and reads
       the WALLET instead of the position whose id the row carries — so an orphan refund on a player's position
       would be filed against whatever the wallet happened to carry, and every suite that reads a marker reads the
       one its own fixture wrote. Only 0.232.1 pairs the marker's source with the row's `positionId`. */
    name: "232-marker-wrong-object · a positioned refund copies the marker from the wallet, not from the position whose id the row carries",
    file: MARKET,
    from: `      ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),
      amlReason: null,
      createdAt: p.settledAt, updatedAt: p.settledAt, completedAt: p.settledAt,`,
    to: `      ...(w.houseBotId ? { houseBotId: w.houseBotId } : {}),
      amlReason: null,
      createdAt: p.settledAt, updatedAt: p.settledAt, completedAt: p.settledAt,`,
    expect: "0.232.1 · ⛔ RULING 232 · every positioned transaction write copies the marker FROM THE OBJECT WHOSE id IS ITS positionId",
    suite: "reports-mem",
  },
  {
    /* ⛔ A WRITER THAT BYPASSES THE DAL bypasses everything the DAL does for a marker — and it is the shape nobody
       looks for, because the row it writes is a perfectly ordinary Transaction. */
    name: "232-dal-bypass · a service writes a Transaction row straight through Prisma, around the DAL and around every marker rule",
    file: MARKET,
    from: `    if (realRefund > 0) await db.txn.create({`,
    to: `    if (realRefund > 0) await prisma().transaction.create({ data: { id: "x" } });
    if (realRefund > 0) await db.txn.create({`,
    expect: "0.232.3 · ⛔ nothing in tracked src/ writes a Transaction row around the DAL",
    suite: "reports-mem",
  },
  {
    /* ⛔ RULING 235's OWN MUTATION, named in the spec: the `houseOnly` argument dropped. The call still reads
       correct, still goes through F6's helper, still gates the email — and now a holder whose Up & Down day was
       entirely house-marked gets a LETTER about stakes they did not choose. */
    name: "235-houseonly-dropped · the digest still calls F6's helper, without the one argument that makes it F6",
    file: DIGEST,
    from: `      if (!channelAllowed("ROUND_RESULT", { houseOnly: line.totals.ownRounds === 0 }).email) continue;`,
    to: `      if (!channelAllowed("ROUND_RESULT", {}).email) continue;`,
    expect: "9.235.1 · ⛔ 04 F6 · a day that was ALL house rounds: the holder gets the BELL and NO email",
    suite: "reports-mem",
  },
  {
    /* ⛔ THE STATE THIS CHECKPOINT FOUND THE PLATFORM IN: F6's helper with no caller at all, so the rule existed
       as a paragraph. 0.235.1 is the only assertion whose subject is whether the rule has a way to happen. */
    name: "235-no-caller · the email gate is removed, so F6's helper goes back to having no production caller and its rule to being a paragraph",
    file: DIGEST,
    from: `      if (!channelAllowed("ROUND_RESULT", { houseOnly: line.totals.ownRounds === 0 }).email) continue;
`,
    to: ``,
    expect: "0.235.1 · ⛔ RULING 235 · 04 F6's helper has EXACTLY ONE production caller",
    suite: "reports-mem",
  },
  {
    /* ⛔ RULING 149: the docstring described an hourly holder summary as "the one account of those stakes". D19
       does not allow that surface and this programme never built it, so the sentence taught the next session a
       law the platform does not have. */
    name: "149-docstring-promise · channelAllowed's docstring promises an hourly holder summary again",
    file: "src/lib/server/comms-registry.ts",
    from: ` * house-marked it never goes to a phone and never becomes a letter.`,
    to: ` * house-marked it never goes to a phone and never becomes a letter — the holder's hourly summary is the one account of those stakes, and it is a bell.`,
    expect: "0.235.3 · ⛔ RULING 149 · the helper's docstring no longer promises an hourly holder summary",
    suite: "reports-mem",
  },
  {
    /* ⛔ RULING 247's OWN DEFECT SHAPE: a reader that hands back the ROW instead of the projection. The
       trader-seed reader is the best place to plant it because nothing about the change looks wrong —
       it still answers "who is on this market", it is still one aggregate, and the extra field is
       invisible until somebody serialises the answer to a signed-out visitor. */
    name: "247-seeds-raw · the trader-seed reader answers with position ROWS, so the marker and the hb: bet key reach every viewer of a market",
    file: MARKET,
    from: `    if (arr.length < n && !arr.includes(p.userId)) arr.push(p.userId);`,
    to: `    if (arr.length < n && !arr.includes(p.userId)) arr.push(p as unknown as string);`,
    expect: "11.247.2 · ⛔ D19 · ruling 247 · HB-LC-39 / CRA-27 · every viewer · NOT ONE of them carries the fixture's bot, intent, event, target or press id",
    suite: "reports-mem",
  },
  {
    /* ⛔ THE ONE VIEWER-FACING CALLER OF THE RAW POSITION READ. `myStakesByMarket` is what a player's
       round panel is built from; growing its item by one field puts the marker in the holder's own
       round detail. 11.247.c1c is the only assertion whose subject is that six-field literal, and it
       exists because no Up & Down fixture runs in this suite — a sweep that cannot reach a reader is
       not a reason to leave the reader unguarded. */
    name: "247-round-item-marker · the viewer's own round item grows the marker, so a holder's round panel carries it",
    file: "src/lib/server/updown-board.ts",
    from: `      id: p.id,
      side: (p.side === "YES" ? "UP" : "DOWN") as "UP" | "DOWN",`,
    to: `      id: p.id,
      houseBotId: p.houseBotId,
      side: (p.side === "YES" ? "UP" : "DOWN") as "UP" | "DOWN",`,
    expect: "11.247.c1c · the one viewer-facing caller of that raw read PROJECTS",
    suite: "reports-mem",
  },

  /* ══ C7 STEP 5 (THE ACCOUNT HALF) · THE ACTIVITY AND HISTORY PANELS ═══════════════════════════════════════════
   * ⛔ ONE DECLARATION PER GUARD FAMILY THE STEP ADDED, and each one puts back the defect its own assertion was
   * written against — never a defect that merely goes red somewhere. The three declarations the plan expected to
   * BREAK at this step (`312-rail`, `320-tab-debt-stale`, `432i-dead-link`) did NOT break, and the reason is the
   * ordering: all three are anchored on the LANDING rail's closed list, which this step deliberately left alone.
   * ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  {
    name: "312-detail-rail · a key joins the ACCOUNT page's closed list with no panel behind it — ruling 312's dead control, one route over from where it was first measured",
    file: ROUTES,
    from: `export const CONSOLE_DETAIL_TABS = ["overview", "activity", "rules", "targets", "history"] as const;`,
    to: `export const CONSOLE_DETAIL_TABS = ["overview", "activity", "rules", "targets", "history", "money"] as const;`,
    expect: "1.312 · a panel for every key AND a key for every panel",
    suite: "console-mem",
  },
  {
    name: "317-word-hole · one kind loses its console word, so the TOTAL map stops being total and a raw enum is one render away",
    file: GATE,
    from: `  SUNSET: "The desk was withdrawn",`,
    to: `  SUNSET_DISABLED: "The desk was withdrawn",`,
    expect: "1.317 · the console's event word map is TOTAL over `EVENT_KINDS`",
    suite: "console-mem",
  },
  {
    name: "317-word-names-it · the word for the kind the LEXICON IS BLIND TO names the feature — the exact leak the map exists to make impossible",
    file: GATE,
    from: `  HOLDER_AGAINST_BOT: "The holder staked against this account",`,
    to: `  HOLDER_AGAINST_BOT: "The holder staked against this bot",`,
    expect: "1.317 · 453 · not one of its words carries a house-vocabulary word",
    suite: "console-mem",
  },
  {
    name: "317-raw-enum-fallback · the history's Event cell grows a `?? kind` escape, which paints the raw enum for any kind the map has lost",
    file: GATE,
    from: `    eventWord: CONSOLE_EVENT_WORD[e.kind],`,
    to: `    eventWord: (CONSOLE_EVENT_WORD as Record<string, string>)[e.kind] ?? e.kind,`,
    expect: "1.317 · 453 · no raw-enum fallback survives",
    suite: "console-mem",
  },
  {
    name: "345-facet-drift · the COUNTING reader drops the rail's facets, so the total counts a population the table cannot show — 344/345's own defect, and the one that is invisible until the last page",
    file: GATE,
    from: `    wantFeed ? houseBotIntentStore.countFeed(feedFilter) : Promise.resolve(null),`,
    to: `    wantFeed ? houseBotIntentStore.countFeed({ houseBotId: bot.id }) : Promise.resolve(null),`,
    expect: "1.345 · the listing reader and the COUNTING reader are called with the same facets",
    suite: "console-mem",
  },
  {
    name: "411-past-the-end · a page past the end stops being served as the LAST page, so a hand-typed `?page=99` renders a card with no rows under a pager pointing somewhere else",
    file: GATE,
    from: `  if (total == null) return want;
  return Math.min(want, Math.max(1, Math.ceil(total / perPage)));`,
    to: `  if (total == null) return want;
  return Math.max(1, want - 0);`,
    expect: "1.411 · `?page=99` is served as the LAST page",
    suite: "console-mem",
  },
  {
    name: "355-failed-reads-empty · a FAILED activity read answers an empty list, so the kit's failure treatment is never reached and a read that nobody could take looks like an account that has done nothing",
    file: GATE,
    from: `  const feed: ConsoleFeedRow[] | null = feedPageRows == null ? null
    : feedPageRows.rows.map((i) => consoleFeedRow(i, q.intentId));`,
    to: `  const feed: ConsoleFeedRow[] | null = feedPageRows == null ? []
    : feedPageRows.rows.map((i) => consoleFeedRow(i, q.intentId));`,
    expect: "1.355 · a failed activity read is `feed === null`",
    suite: "console-mem",
  },
  {
    name: "302-refusal-silent · a crafted filter axis is thrown away WITHOUT being named, so the panel narrows to something nobody asked for and says nothing",
    file: GATE,
    from: `    if (hit == null) say(said);`,
    to: `    if (hit == null) { void said; }`,
    expect: "1.302 · 432(j) · …and every refused axis is NAMED",
    suite: "console-mem",
  },
  {
    name: "302-smuggle · the door stops checking a filter axis against its closed list and passes the typed value straight into the read — the bypassed-client defect ruling 383 measured the whole shape of",
    file: GATE,
    from: `    const hit = fromClosedList(axis, one.value);
    if (hit == null) say(said);
    return hit as T | null;`,
    to: `    const hit = fromClosedList(axis, one.value);
    if (hit == null) say(said);
    return (hit ?? one.value) as T | null;`,
    expect: "1.302 · a bypassed client smuggles NOTHING past the door",
    suite: "console-mem",
  },
  {
    name: "302-anchor-ignored · a bell's `&intent=` stops resolving its row's page, so an officer who followed an alert lands on page 1 and the row the alert is about is nowhere on the screen",
    file: GATE,
    from: `  const wantFeedPage = wantFeed && q.intentId && !q.pageAsked
    ? await consoleFeedAnchorPage(q.intentId, feedFilter, q.page) : q.page;`,
    to: `  const wantFeedPage = q.page;`,
    expect: "1.302 · a bell's `&intent=` resolves the row's page SERVER-SIDE",
    suite: "console-mem",
  },
  {
    name: "369-balance-in-the-link · the money row's DOOR carries the holder's own wallet balance in its query string — ruling 266's bare balance, smuggled through an href instead of a cell",
    file: GATE,
    from: "    moneyHref: txn ? `/admin/transactions?q=${encodeURIComponent(txn)}` : null,",
    to: "    moneyHref: txn ? `/admin/transactions?q=${encodeURIComponent(txn)}&b=${String(e.payload?.balanceTzs ?? \"\")}` : null,",
    expect: "1.369 · 266 · no history row carries an amount or the holder's wallet balance",
    suite: "console-mem",
  },
  {
    name: "453-why-painted · the feed row paints the engine's own composed sentence, which opens with a word 453 forbids and embeds formatted money and a pool total — and NO source guard can see it, because it is composed in a module outside the section",
    file: GATE,
    from: `    stake: formatTzs(i.stakeTzs),`,
    to: `    stake: i.why ?? formatTzs(i.stakeTzs),`,
    expect: "1.453 · D20 · no feed row carries the engine's composed sentence",
    suite: "console-mem",
  },
  {
    name: "410-rail-rank · the window filter drops the dense rank, so one rail is 44px beside 32px chips — the same control at two sizes on one screen",
    file: RAIL,
    from: `      <DateTimeRangeFilter rank="dense" replace presetIds={presets} defaultPreset={presetDefault} />`,
    to: `      <DateTimeRangeFilter replace presetIds={presets} defaultPreset={presetDefault} />`,
    expect: "1.410 · every rank-taking control on the rail takes the DENSE rank",
    suite: "console-mem",
  },
  {
    name: "384-prop-name · a server call site passes a house-shaped PROP NAME across the client boundary, where minification keeps it and the bundle scan's identifier family does not know it",
    file: DETAIL,
    from: `          <ActivityFilters groups={view.feedFilters} presets={view.feedPresets} presetDefault={view.feedPresetDefault} />`,
    to: `          <ActivityFilters botGroups={view.feedFilters} presets={view.feedPresets} presetDefault={view.feedPresetDefault} />`,
    expect: "1.384 · 401 · no house-shaped PROP NAME crosses the client boundary",
    suite: "console-mem",
  },
  {
    name: "411-total-from-rows · the activity pager takes its total from the RENDERED rows, so it reads 20 for ever and the control never reaches the last page",
    file: DETAIL,
    from: `                  total={view.feedTotal}`,
    to: `                  total={feedRows.length}`,
    expect: "1.411 · every `total` is a COUNTING field of the view and never a rendered array's length",
    suite: "console-mem",
  },
  {
    /* ⚠️ RE-POINTED 2026-09-20. It mutated `UNBUILT_TABS`, the tolerance list — which is DELETED with the build
       that paid it, so the text no longer exists. ⛔ Its question survives and is asked of what replaced the list:
       the two rails are separate closed lists, and a resolver that stopped telling them apart would let a link to
       one pass on the strength of the other. */
    name: "7.2e-shape-flattened · the alert-link resolver stops telling the two rails apart, so a landing link passes on the strength of the account page's closed list",
    file: COMMS,
    from: `  const exists = (x: { shape: string; tab: string }) => (x.shape === "detail" ? CR.consoleDetailTabExists(x.tab) : CR.consoleTabExists(x.tab));`,
    to: `  const exists = (x: { shape: string; tab: string }) => CR.consoleDetailTabExists(x.tab) || CR.consoleTabExists(x.tab);`,
    expect: "7.2d · CONTROL · a planted alert href naming a tab NOBODY built",
    suite: "comms-mem",
  },

  /* ══ THE THREE THE SERVED PAGE FOUND, WHICH NO SUITE DID ═══════════════════════════════════════════════════
   * Each of these shipped GREEN and was read off a real render of the account page on a scratch database. They
   * are declared here so the next session cannot lose what the render cost to find. */
  {
    name: "453-enum-token · the rail's URL token goes back to the enum lowercased, so `?kind=counter` reaches the address bar and `data-chip=\"kind:counter\"` reaches served markup — MEASURED, five times, with every suite green",
    file: GATE,
    from: `  return consoleSlug(CONSOLE_FEED_AXES[axis].word[member] ?? member);`,
    to: `  return member.toLowerCase();`,
    expect: "1.453 · every option KEY and every link the rail builds is neutral too",
    suite: "console-mem",
  },
  {
    name: "373-minute-only · the activity row's When cell drops its seconds, so twenty rows of a busy account all read one instant under a column that claims to be newest first",
    file: GATE,
    from: `    when: Number.isFinite(at) ? \`\${formatEat(at, "D MMM")} \${formatEat(at, "HH:MM:SS")}\` : "—",
    whenTitle: Number.isFinite(at) ? \`\${formatEat(at, "D MMM YYYY")} \${formatEat(at, "HH:MM:SS")} EAT\` : "—",
    stake: formatTzs(i.stakeTzs),`,
    to: `    when: Number.isFinite(at) ? \`\${formatEat(at, "D MMM")} \${formatEat(at, "HH:MM")}\` : "—",
    whenTitle: Number.isFinite(at) ? \`\${formatEat(at, "D MMM YYYY")} \${formatEat(at, "HH:MM:SS")} EAT\` : "—",
    stake: formatTzs(i.stakeTzs),`,
    expect: "1.373 · both panels' `When` cell states SECONDS",
    suite: "console-mem",
  },
  {
    name: "302-heading-plural · the refusal card's heading goes back to a SINGULAR title, which sat above a plural sentence on the same card",
    file: GATE,
    from: `export const CONSOLE_REFUSAL_TITLE = "This address was not used in full";`,
    to: `export const CONSOLE_REFUSAL_TITLE = "Part of this address was not used";`,
    expect: "1.302 · 432(n) · the refusal card's heading is number-agnostic",
    suite: "console-mem",
  },

  /* ══ C7 STEP 5 · THE LANDING HALF ═════════════════════════════════════════════════
   * An anchor that RESOLVES is not an assertion that went red (ruling 275). One declaration per new assertion,
   * each with the label a green run printed — copied out of the run's own output, never written by hand. */
  {
    name: "312-rail-order · the four keys are kept but the rail order is scrambled, so an officer reads the desk's own sequence in the wrong order",
    file: ROUTES,
    from: `export const CONSOLE_TABS = ["roster", "activity", "limits", "history"] as const;`,
    to: `export const CONSOLE_TABS = ["roster", "limits", "activity", "history"] as const;`,
    expect: "1.312 · the rail's options come from the closed list",
    suite: "console-mem",
  },
  {
    name: "312-badge-zero · a FAILED queued-stake count is painted as a zero, so a read that could not be taken reads as \"nothing queued\" and the badge stands in for the read's health",
    file: PAGE,
    from: `k === "activity" ? view.pendingIntents ?? undefined : undefined`,
    to: `k === "activity" ? view.pendingIntents ?? 0 : undefined`,
    expect: "1.405 · both badges are `TabItem.count`",
    suite: "console-mem",
  },
  {
    name: "344-landing-total-from-rows · the desk feed's pager takes its total from the rendered page, so it stops at 500 rows for ever and hides every page past it",
    file: PAGE,
    from: `                  total={feedView.feedTotal}`,
    to: `                  total={feedRows.length}`,
    expect: "1.411 · both landing panels draw the shared `AdminPagination`, each total is a COUNTING field of its view, and neither is a rendered array's length",
    suite: "console-mem",
  },
  {
    name: "345-landing-facet-drift · the desk feed's COUNT is taken over a different population from its rows, so the pager counts stakes the table cannot show",
    file: GATE,
    from: `    () => houseBotIntentStore.countFeed(feedFilter),`,
    to: `    () => houseBotIntentStore.countFeed({}),`,
    expect: "1.345 · the desk-wide feed's rows and total move together",
    suite: "console-mem",
  },
  {
    name: "317-landing-history-narrowed · the desk history narrows to one account, which silently drops the CONTROL ROW's own events — the switch, the limits save, the withdrawal",
    file: GATE,
    from: `    () => houseBotEventStore.countAll({}),`,
    to: `    () => houseBotEventStore.countAll({ houseBotId: "hb_none" }),`,
    expect: "1.317 · the desk history carries the CONTROL ROW's own events",
    suite: "console-mem",
  },
  {
    name: "355-landing-badge-blanks-panel · a failed desk-feed read is answered with an empty list, so a read nobody could take renders as \"nothing staked yet\"",
    file: GATE,
    from: `  const feed: ConsoleDeskFeedRow[] | null = rows == null ? null : rows.rows.map((i) => ({`,
    to: `  const feed: ConsoleDeskFeedRow[] | null = rows == null ? [] : rows.rows.map((i) => ({`,
    expect: "1.355 · a FAILED desk read paints the kit's failure treatment",
    suite: "console-mem",
  },
  {
    name: "415-cancel-on-any-row · the stop control is offered over a stake the engine has already claimed, which the service can only ever refuse",
    file: GATE,
    from: `    cancelId: (CONSOLE_PENDING_STATUSES as readonly string[]).includes(i.status) ? i.id : null,`,
    to: `    cancelId: i.id,`,
    expect: "1.415 · the stop control is offered on exactly the rows the badge counts",
    suite: "console-mem",
  },
  {
    name: "415-cancel-reason-unchecked · the cancel door stops checking the reason, so a bypassed client posts an empty decision record onto a live money control",
    file: GATE,
    from: `  if (reason.length < CONSOLE_REASON_MIN) return { ok: false, error: CONSOLE_CANCEL_REFUSAL.reasonShort, field: "reason" };`,
    to: `  if (false) return { ok: false, error: CONSOLE_CANCEL_REFUSAL.reasonShort, field: "reason" };`,
    expect: "1.415 · the cancel door validates the reason with the SAME bounds the control arms on",
    suite: "console-mem",
  },
  {
    name: "382-cancel-audit-key · the cancel's audit key is renamed to the neutral-sounding ADMIN one, which silently leaves HOUSE_AUDIT and puts a house row in a player's own audit read",
    file: PRESS_CANCEL,
    from: `      purpose: "STAFF_CANCEL",`,
    to: `      purpose: "ENTER_NOW",`,
    expect: "1.382 · the cancel's audit action is a `HOUSE_AUDIT` key",
    suite: "console-mem",
  },
  {
    name: "410-landing-rail-absent · the desk activity panel drops its rail, so the window and the three chips the bells link to have nothing to select",
    file: PAGE,
    from: `          <ActivityFilters groups={feedView.feedFilters} presets={feedView.feedPresets} presetDefault={feedView.feedPresetDefault} />`,
    to: ``,
    expect: "1.410 · the landing activity panel renders the SAME rail file",
    suite: "console-mem",
  },
  {
    name: "411-landing-basehref-bare · the desk feed's pager builds its baseHref without the live filters, so page 2 of a filtered list is page 2 of the unfiltered one",
    file: PAGE,
    from: `                  baseHref={buildBaseHref(CONSOLE_ROUTE, feedView.feedParams, "page")}`,
    to: `                  baseHref={buildBaseHref(CONSOLE_ROUTE, { tab: "activity" }, "page")}`,
    expect: "1.411 · each landing pager's `baseHref` carries its own panel's live parameters",
    suite: "console-mem",
  },
  /* ⛔ THE BELL'S WINDOW HAS TWO WRONG FORMS AND THEY ARE DECLARED SEPARATELY, because the control beside the
   * assertion says in so many words that a guard which cannot tell them apart is measuring a spelling rather than
   * the bell. One mutation per way the defect can be written is the rule this programme keeps paying to relearn. */
  {
    name: "369-bell-clock-href · the hour summary's link goes back to the HH:MM clock form, which the console's window parser cannot read — so the bell lands on a \"custom\" label over the last 24 hours",
    file: NOTIF,
    from: `&from=\${encodeURIComponent(opts.fromEat)}&to=\${encodeURIComponent(opts.toEat)}\`,`,
    to: `&from=\${encodeURIComponent(opts.fromHH)}&to=\${encodeURIComponent(opts.toHH)}\`,`,
    expect: "1.369 · the hour summary's bell lands on the HOUR IT IS ABOUT",
    suite: "console-mem",
  },
  {
    name: "369-bell-iso-href · the hour summary's link carries the alert's own ISO instant, which the parser refuses just as completely — the form a field once called `fromIso` invited",
    file: NOTIF,
    from: `&from=\${encodeURIComponent(opts.fromEat)}&to=\${encodeURIComponent(opts.toEat)}\`,`,
    to: `&from=\${encodeURIComponent(opts.fromIso)}&to=\${encodeURIComponent(opts.toIso)}\`,`,
    expect: "1.369 · the hour summary's bell lands on the HOUR IT IS ABOUT",
    suite: "console-mem",
  },
  {
    name: "474-landing-label-unclamped · the desk feed's account cell paints the Owner's label unbounded, on the one page that lists every account at once",
    file: GATE,
    from: `    accountName: clampOperatorText(found.label, operatorBound("label")),`,
    to: `    accountName: found.label,`,
    expect: "1.474 · both exemptions are CLAMPED at their own render site",
    suite: "console-mem",
  },
];
