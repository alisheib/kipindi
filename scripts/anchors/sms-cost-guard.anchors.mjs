/**
 * Anchors for red:sms-cost-guard — each reintroduces, on the real file, a defect in the SMS credit
 * floor or the balance reading it runs on (and, since 2026-09-26, the alarm and the /admin/system tile). DATA, so `test:red-anchors` §3 can audit that every
 * `from` still resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines in `sms.ts` must be paired with
 * re-anchoring here, or the harness reports ANCHOR FAIL — loudly, by design.
 */
export const MUTATIONS = [
  {
    // 🔴 THE LATCH, EXACTLY AS IT SHIPPED. A refused reply answers `balance: 0.0` because
    // Blackball validates before it authenticates; recording it stores TZS 0 and trips the floor.
    name: "sms.ts — the balance is recorded from refused replies too",
    file: "src/lib/server/sms.ts",
    // ⚠️ RE-ANCHORED 2026-09-27: the reply's balance is now stamped with when it was asked (`askedAt`).
    from: `    if (outcome.ok) {
      recordBalance(outcome.balance, askedAt);`,
    to: `    if (true) {
      recordBalance(outcome.balance, askedAt);`,
    expect: `§2 ⛔ the refusal's balance 0.0 is NOT recorded`,
  },
  {
    // ⚠️ AT SEND TIME THE BALANCE REFRESH NOW MASKS THIS — a stale reading is replaced before the
    // floor decides — so the defect is visible where it still does harm: the snapshot that
    // /admin/system and /api/health render, which would show a stale reading as "below floor".
    name: "sms.ts — a stale balance reading is trusted forever",
    file: "src/lib/server/sms.ts",
    from: `  const live = b !== null && !stale;`,
    to: `  const live = b !== null;`,
    expect: `§3 …and is not treated as below the floor`,
  },
  {
    // Refusing a login code to save TZS 6 is a self-inflicted outage.
    name: "sms.ts — the floor stops exempting OTP",
    file: "src/lib/server/sms.ts",
    from: `  if (!everyMessageIsOtp) {`,
    to: `  if (true) {`,
    expect: `§1 ⭐ under the SAME floor, an OTP still sends`,
  },
  {
    // A level-triggered alarm writes a permanent row per send into a chain that cannot be pruned.
    name: "sms.ts — the low-balance alarm becomes level-triggered",
    file: "src/lib/server/sms.ts",
    from: `  if (prev !== null && prev > threshold && tzs <= threshold) {`,
    to: `  if (tzs <= threshold) {`,
    expect: `§4 crossing the alert line writes exactly ONE alarm, not one per send`,
  },
  {
    // The refused row would carry a figure that was never the account's balance.
    name: "sms.ts — a refused row stores the refusal's false balance",
    file: "src/lib/server/sms.ts",
    from: `          // A refusal's \`balance\` is not the account's (it reads 0.0 before auth) — no figure beats a false one.
          balanceTzs: null,`,
    to: `          balanceTzs: outcome.balance,`,
    expect: `§2 the refused row stores NO balance rather than a false 0`,
  },
  {
    // "No reading yet" read as "empty" would take the rail down on every cold start.
    name: "sms.ts — an absent balance reading is treated as below the floor",
    file: "src/lib/server/sms.ts",
    from: `    belowFloor: live && b!.tzs < balanceFloor(),`,
    to: `    belowFloor: b === null || (live && b!.tzs < balanceFloor()),`,
    expect: `§6 ⛔ an unreadable balance does NOT hold a campaign: unknown is not low`,
  },
  {
    // Without the refresh, a campaign is judged on a missing or stale reading — and a campaign
    // held by the floor makes no request that could ever refresh it.
    // ⚠️ RE-ANCHORED 2026-09-26: sendBatch's inline copy of the refresh was replaced by the one
    // `refreshSmsBalance` path; the defect (no refresh before the floor decides) is unchanged.
    name: "sms.ts — a missing or stale reading is no longer refreshed from the balance endpoint",
    file: "src/lib/server/sms.ts",
    from: `    await refreshSmsBalance({ maxAgeMs: balanceTtlMs() });`,
    to: `    /* no refresh before the floor decides */`,
    expect: `§3 …because the stale reading was replaced by a real balance read`,
  },

  // ══ 2026-09-26 · owner rulings D7/D8 — the one refresh path, the alarm, the admin tile ══════════
  {
    // "TZS 30 on the card → top up → send" refused for up to 15 minutes on a figure already false.
    name: "sms.ts — a low reading is trusted by the floor without a re-check",
    file: "src/lib/server/sms.ts",
    from: `    if (smsBalanceSnapshot().belowFloor) await refreshSmsBalance({ maxAgeMs: LOW_READING_RECHECK_MS });`,
    to: `    /* no re-check before refusing */`,
    expect: `§3 ⭐ a LOW reading over a minute old is re-checked before refusing: a top-up is honoured`,
  },
  {
    name: "sms.ts — a fresh reading is not reused, so every render calls the vendor",
    file: "src/lib/server/sms.ts",
    from: `  if (before.tzs !== null && before.at !== null && Date.now() - before.at < (opts.maxAgeMs ?? 60_000)) return answer("reused");`,
    to: `  /* no reuse */`,
    expect: `§7 a reading under a minute old is reused: a page render cannot hammer the vendor`,
  },
  {
    // The balance endpoint validates before it authenticates: a refusal answers balance 0.0.
    name: "sms.ts — a refused balance read's 0.0 is taken as the balance",
    file: "src/lib/server/sms.ts",
    from: `    const tzs = r.ok ? r.balance : null;`,
    to: `    const tzs = r.balance;`,
    expect: `§7 ⛔ a REFUSED read records nothing: its 0.0 is not the account's balance, and unknown is never low`,
  },
  {
    // The read is the one free live credential check; an outage reported as "refused" sends the operator to
    // re-issue keys that were never wrong.
    // ⚠️ RE-ANCHORED 2026-09-27: the verdict is three branches now (unreachable, refused, unexpected); replacing the
    // first with an unconditional "refused" is the same defect.
    name: "sms.ts — every failed balance read is reported as refused",
    file: "src/lib/server/sms.ts",
    from: `    if (r.transport !== null || r.httpStatus >= 500 || r.httpStatus === 429) return { tzs: null, error: "unreachable" };`,
    to: `    return { tzs: null, error: "refused" };`,
    expect: `§7 no response, or the vendor's own 5xx, says UNREACHABLE: an outage never reads as wrong credentials`,
  },
  {
    // The verdict survives only as long as the request: a reload inside the retry window forgets why it failed.
    name: "sms.ts — a failed read forgets why it failed",
    file: "src/lib/server/sms.ts",
    from: `      if (r.tzs === null) { st.failedAt = Date.now(); st.error = r.error; return false; }`,
    to: `      if (r.tzs === null) { st.failedAt = Date.now(); return false; }`,
    expect: `§7 a refused read says REFUSED, so the card can tell wrong credentials from an outage`,
  },
  {
    // A hanging vendor re-paid its full timeout on every reload of the kill-switch page.
    name: "sms.ts — a failed read is not remembered",
    file: "src/lib/server/sms.ts",
    from: `  if (!st.inflight && st.failedAt !== null && Date.now() - st.failedAt < balanceRetryMs()) return answer("failed");`,
    to: `  /* failure not remembered */`,
    expect: `§7 a read that failed moments ago is not repeated: a reload cannot re-pay a failing vendor`,
  },
  {
    name: "sms.ts — concurrent callers each send their own balance request",
    file: "src/lib/server/sms.ts",
    from: `  if (st.inflight) return st.inflight;`,
    to: `  /* no in-flight sharing */`,
    expect: `§7 two concurrent reads share ONE request`,
  },
  {
    // The System page (and its maintenance kill-switch) waited out the vendor's 8 s timeout.
    name: "sms.ts — the render budget is ignored",
    file: "src/lib/server/sms.ts",
    from: `  if (budgetMs === undefined) return p;`,
    to: `  return p;`,
    expect: `§7 ⛔ a slow vendor cannot hold a render: the read returns within its budget`,
  },
  {
    name: "sms.ts — a restart swallows a balance that is already low",
    file: "src/lib/server/sms.ts",
    from: `  } else if (prev === null && tzs <= threshold) {`,
    to: `  } else if (false) {`,
    expect: `§4b a first reading after a restart already at or below the alert line raises ONE alarm`,
  },
  {
    // Every push to main is a restart; an alarm per deploy is noise that gets ignored.
    // ⚠️ RE-ANCHORED 2026-09-27: the suppression is now "the same low episode, and not newly below the floor".
    name: "sms.ts — every restart re-raises the low-balance alarm",
    file: "src/lib/server/sms.ts",
    from: `    if (sameEpisode && !newlyBelowFloor) return;`,
    to: `    /* every restart alarms */`,
    expect: `§4b …and a second restart inside a day does not raise it again: a restart is not a crossing`,
  },
  {
    // The alarm as it shipped: an audit row nothing read.
    name: "sms.ts — the low-balance alarm reaches nobody",
    file: "src/lib/server/sms.ts",
    from: `    .then((m) => m.notifyAdminsSmsCreditLow({ tzs, alertTzs: threshold, floorTzs: floor }))`,
    to: `    .then(() => undefined)`,
    expect: `§4c the alarm reaches the officers: a SECURITY bell row that links to /admin/system`,
  },
  {
    name: "admin/system — the page waits for the vendor with no budget",
    file: "src/app/admin/system/page.tsx",
    from: `  const smsRead = refreshSmsBalance({ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_RENDER_BUDGET_MS }).catch(() => null);`,
    to: `  const smsRead = refreshSmsBalance({ maxAgeMs: 60_000 }).catch(() => null);`,
    expect: `§8 the System page reads the balance live within its render budget`,
  },
  {
    // /api/health published whatever the process last saw: null after a deploy, then that figure forever.
    name: "api/health — the balance is no longer refreshed",
    file: "src/app/api/health/route.ts",
    from: `    const smsRead = refreshSmsBalance({ maxAgeMs: 60_000, budgetMs: SMS_BALANCE_HEALTH_BUDGET_MS }).catch(() => null);`,
    to: `    const smsRead = Promise.resolve(null);`,
    expect: `§8 /api/health refreshes the balance within a short budget`,
  },
  {
    // An unconfirmed figure shown as today's credit, exactly as the tile did before D7.
    name: "sms-credit-tile — an unconfirmed reading is shown as current",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const confirmed = i.read !== null && (i.read.outcome === "fresh" || i.read.outcome === "reused");`,
    to: `  const confirmed = true;`,
    expect: `§9 …a read still in flight too: never shown as current`,
  },
  {
    // A figure the gate itself treats as unknown, headlined as the credit — "TZS 185" from hours ago.
    name: "sms-credit-tile — a reading past the TTL is headlined as today's credit",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  if (s.stale) {`,
    to: `  if (false) {`,
    // ⚠️ RE-LABELLED 2026-09-27 (final visual review): the old figure is in the note, its time on the provenance line.
    expect: `§9 stale: a reading past the TTL is headlined as a dash, its figure in the note and its time under the dash`,
  },
  {
    // "Couldn't read" with no reason: wrong keys and an outage look the same.
    // ⚠️ RE-ANCHORED 2026-09-27: the failed read's reason is computed once, for every branch.
    name: "sms-credit-tile — an unknown balance no longer says why",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const reason = failedBecause(i.read, name);`,
    to: `  const reason = null;`,
    expect: `§9 unknown says WHY: wrong credentials read differently from an outage`,
  },
  {
    // DG-A-10: "▲ 14 entries" — an arrow on a count, beside the SMS tile.
    name: "admin/system — the Audit chain tile draws an arrow again",
    file: "src/app/admin/system/page.tsx",
    from: `tone={chain.valid ? "success" : "danger"} pulse={!chain.valid} />`,
    to: `deltaDir={chain.valid ? "up" : "down"} pulse={!chain.valid} />`,
    expect: `§8 the Audit chain tiles carry valid/broken by word and tone, never an arrow`,
  },
  {
    // "blackball · 0" / "sent · TZS 185" at 360 — read as money sent.
    // ⚠️ RE-ANCHORED 2026-09-27: the traffic facts moved to the chip (`factsOf`); then (final visual review) every count
    // goes through one `count` helper, grouped, with the rate dropped from the chip.
    name: "sms-credit-tile — the count may break from its noun",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: "const count = (n: number, what: string) => keep(`${formatNumber(n)} ${what}`);",
    to: "const count = (n: number, what: string) => `${formatNumber(n)} ${what}`;",
    expect: `§9 …and never splits inside 'N sent' or 'N failed'`,
  },
  {
    // Low credit was a grey arrow in the same ink as every other caption.
    // ⚠️ RE-ANCHORED 2026-09-27: the level's tone is one input to the tile's tone now (a dead rail and failing sends too).
    name: "sms-credit-tile — below the alert line loses its warning ink",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const levelTone: SmsCreditTile["tone"] = s.belowFloor ? "danger" : s.belowAlert ? "warning" : undefined;`,
    to: `  const levelTone: SmsCreditTile["tone"] = s.belowFloor ? "danger" : undefined;`,
    expect: `§9 below the alert line: the word, in warning ink`,
  },

  // ══ 2026-09-27 · the re-review: the floor, the episode, the verdict, the order, the tile's words, the audience ══════
  {
    // 160 → 140 → 40 told the officers once ("top up soon"), then paused invites in silence.
    name: "sms.ts — crossing the floor raises no alarm of its own",
    file: "src/lib/server/sms.ts",
    from: `  } else if (prev !== null && prev >= floor && tzs < floor) {`,
    to: `  } else if (false) {`,
    expect: `§4d crossing the FLOOR raises its own alarm once: 160, 140, 40, 34 is two alarms`,
  },
  {
    // A recovery lived only in the process, so a restart took a new low spell for the one already announced.
    name: "sms.ts — a recovery is not written down",
    file: "src/lib/server/sms.ts",
    from: `    recordRecovery(prev, tzs, threshold);`,
    to: `    /* recovery not recorded */`,
    expect: `§4e a new low spell after a top-up is announced even when a restart finds it`,
  },
  {
    // Any sms.balance_low under a day old silenced the boot check, whatever happened since.
    name: "sms.ts — the boot check ignores a recovery",
    file: "src/lib/server/sms.ts",
    from: `    const sameEpisode = last?.action === "sms.balance_low" && Number.isFinite(at) && Date.now() - at < BOOT_ALARM_REPEAT_MS;`,
    to: `    const sameEpisode = Number.isFinite(at) && Date.now() - at < BOOT_ALARM_REPEAT_MS;`,
    expect: `§4e a new low spell after a top-up is announced even when a restart finds it`,
  },
  {
    name: "sms.ts — a restart that finds the floor crossed stays silent after an alert-line alarm",
    file: "src/lib/server/sms.ts",
    from: `    const newlyBelowFloor = tzs < floor && !(Number.isFinite(lastTo) && lastTo < floor);`,
    to: `    const newlyBelowFloor = false;`,
    expect: `§4b …but a restart that finds it below the FLOOR after an alert-line alarm raises the floor's alarm`,
  },
  {
    // A read that landed late replaced a newer send reply: a re-armed alarm, or an undone top-up.
    name: "sms.ts — a late reading overwrites a newer one",
    file: "src/lib/server/sms.ts",
    from: `  if (cur && cur.at > readAt) return;`,
    to: `  /* a late reading overwrites */`,
    expect: `§7 a read that lands late never overwrites a newer reading`,
  },
  {
    // Every reply that was not an outage was "refused": a moved endpoint sent the operator to rotate working keys.
    name: "sms.ts — any reply that is not an outage is called a credential refusal",
    file: "src/lib/server/sms.ts",
    from: `    return { tzs: null, error: "unexpected" };`,
    to: `    return { tzs: null, error: "refused" };`,
    expect: `§7 a moved endpoint or a reply we cannot read says UNEXPECTED, never wrong credentials`,
  },
  {
    name: "sms.ts — a rate limit is taken for something other than an outage",
    file: "src/lib/server/sms.ts",
    from: ` || r.httpStatus === 429) return { tzs: null, error: "unreachable" };`,
    to: `) return { tzs: null, error: "unreachable" };`,
    expect: `§7 a rate limit is an outage, never wrong credentials`,
  },
  {
    // The state in which no SMS can go out was a white dash and a grey caption, beside an amber TZS 120.
    name: "sms-credit-tile — a dead rail loses its danger",
    file: "src/app/admin/system/sms-credit-tile.ts",
    // ⚠️ RE-ANCHORED 2026-09-27 (final visual review): a dead rail is a note and, for keys, the Railway names (`vars`).
    from: `    if (dead) return { value: "—", tone: "danger", ...dead, caption: facts };`,
    to: `    if (dead) return { value: "—", ...dead, caption: facts };`,
    expect: `§9 a dead rail is danger, with the consequence and the fix`,
  },
  {
    // "Couldn't read the balance … still waiting for Blackball": a failure headline for a read still running.
    name: "sms-credit-tile — a slow vendor is called a failure",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: "    if (pending) return { value: \"—\", note: `Checking with ${name}…${SEP}reload in a few seconds`, caption: facts };",
    to: "    if (false) return { value: \"—\", note: \"\", caption: facts };",
    expect: `§9 a slow vendor is not called a failure: checking, and reload in a few seconds`,
  },
  {
    // "Healthy · Blackball · 0.0% ok · 0 sent since restart": the rail down, and the one word said healthy.
    name: "sms-credit-tile — failing sends are ignored",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const failing = h.successRate !== null && h.failed > 0 && h.successRate < FAILING_BELOW;`,
    to: `  const failing = false;`,
    expect: `§9 ⛔ never Healthy while sends fail: the failures in words, danger when none got through`,
  },
  {
    // A readable balance with no sender ID read "Healthy" while sendBatch refused every message.
    name: "sms-credit-tile — the rail's own problem is ignored",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const rail = i.rail ?? (keysUnset ? "keys-not-set" : null);`,
    to: `  const rail = keysUnset ? "keys-not-set" : null;`,
    expect: `§9 ⛔ never Healthy on a rail that cannot send: a readable balance with no sender ID is danger`,
  },
  {
    // "was TZS 30, below floor · couldn't refresh" and no action, exactly when invites start sending again.
    // ⚠️ RE-ANCHORED 2026-09-27 (final visual review): "no longer held" read as good news or as lost invites; the verb
    // is "sending again", to match "paused".
    name: "sms-credit-tile — a stale low figure drops its action",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `    const act = belowFloor ? [...(pending ? [] : ["invites are sending again"]), "top up now"] : low ? ["top up soon"] : [];`,
    to: `    const act = [];`,
    expect: `§9 …and keeps the action: invites are sending again, top up now`,
  },
  {
    // Final visual review: the stale figure under the floor went from red to amber, calming down exactly when invites
    // start sending again on the credit login codes need, with "top up now" still the action.
    name: "sms-credit-tile — a stale figure below the floor drops to warning ink",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `      tone: dead || belowFloor ? "danger" : low || !pending ? "warning" : undefined,`,
    to: `      tone: dead ? "danger" : belowFloor || low || !pending ? "warning" : undefined,`,
    expect: `§9 …a stale figure below the floor is danger: invites are sending again on the credit login codes need`,
  },
  {
    name: "sms-credit-tile — a seven-figure credit is printed in full and clips at 360",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const value = s.tzs >= COMPACT_FROM ? keep(formatTzsCompact(s.tzs)) : amount(s.tzs);`,
    to: `  const value = amount(s.tzs);`,
    // ⚠️ RE-LABELLED 2026-09-27 (final visual review): the exact figure moved from the chip to the line under the value.
    expect: `§9 a seven-figure credit is compacted, never clipped, and the exact figure is the line under it`,
  },
  {
    // After a first reading every failure read "couldn't refresh": rotated keys looked like a network blip.
    name: "sms-credit-tile — the reason is dropped once a figure exists",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: "  const refresh = pending ? `still waiting for ${name}` : `couldn't refresh${reason ? `${NB}— ${reason}` : \"\"}`;",
    to: "  const refresh = pending ? `still waiting for ${name}` : \"couldn't refresh\";",
    expect: `§9 the reason survives a first reading: refused keys after a good read are danger, and a stale figure says why`,
  },
  {
    // Railway's servers run on UTC: the owner would read a clock three hours behind.
    // ⚠️ RE-ANCHORED 2026-09-27 (final visual review): one numeric-parts formatter now reads the Dar es Salaam wall
    // clock for both the time and the day (Intl's month NAMES differ by ICU build, so none is read).
    name: "sms-credit-tile — the clock is read in UTC",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  timeZone: "Africa/Dar_es_Salaam", year: "numeric",`,
    to: `  timeZone: "UTC", year: "numeric",`,
    expect: `§9 the clock is East Africa Time, 24-hour, and a reading from the EAT day before carries its date`,
  },
  {
    // "Today" judged by the server's UTC date: a reading at 23:50 EAT loses its date after midnight in Dar.
    name: "sms-credit-tile — the day is judged in UTC",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  const today = eatWall(now);`,
    to: `  const today = new Date(now);`,
    expect: `§9 the clock is East Africa Time, 24-hour, and a reading from the EAT day before carries its date`,
  },
  {
    // The failure this suite hit on 2026-09-27: a newer ICU spells September "Sept", and the tile took Intl's name.
    // Planted as the symptom itself, so the plant is the same on every Node.
    name: "sms-credit-tile — the month is ICU's name, not the tile's own list",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `"Jul", "Aug", "Sep", "Oct",`,
    to: `"Jul", "Aug", "Sept", "Oct",`,
    expect: `§9 the month is the same three letters on every Node and ICU build`,
  },
  {
    name: "admin/system — the tile is not told why SMS cannot send",
    file: "src/app/admin/system/page.tsx",
    from: `    rail: smsRailProblem(),`,
    to: `    rail: null,`,
    expect: `§8 …and tells the tile whether SMS can send at all, and how many sends failed`,
  },
  {
    // "Below floor — invites paused … top up now" was 10px grey mono under a red number.
    name: "admin-shell — the state sentence goes back to the 10px grey chip style",
    file: "src/components/admin/admin-shell.tsx",
    from: "      {note && <p className={`text-body-sm break-words ${noteInk}`}>{note}</p>}",
    to: "      {note && <p className=\"font-mono text-micro text-text-tertiary\">{note}</p>}",
    expect: `§8 the state sentence is prose at the reading floor in the state's ink, never the 10px chip`,
  },

  // ══ 2026-09-27 · the final visual review: provenance, the key names, the chip, the alert line ══════════════════════
  {
    // "Below the TZS 50 floor — … · top up Blackball now · last read 20:30 EAT · couldn't refresh — no answer from
    // Blackball": the one clause saying the big red TZS 30 was unconfirmed came fourth in a red run-on.
    name: "sms-credit-tile — the provenance is pushed back onto the tail of the state sentence",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `  return { value, tone, provenance, note, ...(dead?.vars ? { vars: dead.vars } : {}), caption: facts };`,
    to: `  return { value, tone, note: [note, provenance].filter(Boolean).join(SEP) || undefined, ...(dead?.vars ? { vars: dead.vars } : {}), caption: facts };`,
    expect: `§9 an unconfirmed figure says so on its own line under it: the note keeps only the state and the action`,
  },
  {
    // "check BLACKBALL_CLIENT_ID / SECRET on Railway": no Railway variable is called SECRET.
    name: "sms-credit-tile — the refused keys name a variable that does not exist",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `const BLACKBALL_KEYS = ["BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET"];`,
    to: `const BLACKBALL_KEYS = ["BLACKBALL_CLIENT_ID", "SECRET"];`,
    expect: `§9 refused and unset keys name BOTH real Railway variables, whole`,
  },
  {
    // "Healthy" at TZS 185 with no reference, while sms.ts said the card names "alert at TZS 150".
    name: "sms-credit-tile — Healthy names no alert line",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: "confirmed ? `Healthy${SEP}alert at ${amount(i.thresholds.alertTzs)}` : undefined",
    to: "confirmed ? \"Healthy\" : undefined",
    expect: `§9 healthy: the CREDIT is the headline, and the state names the alert line`,
  },
  {
    // "idle since restart" beside "no SMS can send": jargon for the owner, and "idle" read as a second fault.
    name: "sms-credit-tile — the chip's window goes back to 'since restart'",
    file: "src/app/admin/system/sms-credit-tile.ts",
    from: `const SINCE = "since server start";`,
    to: `const SINCE = "since restart";`,
    expect: `§9 every tile says its state in words, and the chip is one plain fact: no provider, no separator`,
  },
  {
    // `break-words` split "BLACKBALL_CLIENT" / "_ID / SECRET on" at 360 — easy to mis-copy into Railway's search.
    name: "admin-shell — a Railway name may break anywhere again",
    file: "src/components/admin/admin-shell.tsx",
    // Re-anchored 2026-09-30: the helper now splits AFTER each underscore (`split(/(?<=_)/)`, labels §11a), so a part
    // already ends in its underscore. The defect planted is unchanged: drop the break opportunity.
    from: "(i < parts.length - 1 ? [part, <wbr key={i} />] : [part])",
    to: "(i < parts.length - 1 ? [part] : [part])",
    expect: `§8 the provenance is its own line under the figure, and a Railway name breaks only after an underscore`,
  },
  {
    name: "admin/system — the tile is not given its provenance line or its Railway names",
    file: "src/app/admin/system/page.tsx",
    from: ` provenance={smsTile.provenance} note={smsTile.note} noteCode={smsTile.vars} `,
    to: ` note={smsTile.note} `,
    expect: `§8 …and draws the tile from smsCreditTile, with no pulse and no arrow`,
  },
  {
    // Told "top up now" and sent to /admin/system, which the COMPLIANCE role cannot open.
    name: "notification-service — the SMS credit alarm goes to COMPLIANCE again",
    file: "src/lib/server/notification-service.ts",
    from: `  const officers = await db.user.listByRoles(await rolesThatCanOpen("/admin/system")); // audit M5 · the officers who top it up`,
    to: `  const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE"]); // audit M5`,
    expect: `§4c ⛔ …and never to an officer whose role cannot open that page: no bell, no email for compliance`,
  },

  // ══ 2026-10-07 · U49a — the credit kept for login and withdrawal codes (`sendBatch`'s `minimumBalanceTzs`, §10) ══════
  {
    // The plan's RED, undone: the engine asks for the credit kept for codes and the send path never looks.
    name: "sms.ts — the marketing floor option is ignored",
    file: "src/lib/server/sms.ts",
    from: `    if (keptForCodes !== undefined && prepared.every((p) => p.out.purpose === "MARKETING")) {`,
    to: `    if (false) {`,
    expect: `§10 ⭐ below the credit kept for codes a MARKETING batch is REFUSED MARKETING_FLOOR before any request, every message reported refused and no row written`,
  },
  {
    // "every" become "some": a login code sent beside marketing is held by a floor that exists to protect it.
    name: "sms.ts — the marketing floor judges a batch that carries a login code",
    file: "src/lib/server/sms.ts",
    from: `&& prepared.every((p) => p.out.purpose === "MARKETING")) {`,
    to: `&& prepared.some((p) => p.out.purpose === "MARKETING")) {`,
    expect: `§10 ⭐ in the SAME state an OTP batch still sends, and so does a batch carrying a login code beside marketing: the marketing floor judges only an all-MARKETING batch`,
  },
  {
    // Unknown read as low on the SHARED rail: one failed balance read would hold every campaign batch. Failing closed on
    // an unreadable credit is the engine's rule, never this path's.
    name: "sms.ts — an unknown or stale balance is read as below the credit kept for codes",
    file: "src/lib/server/sms.ts",
    from: `  return s.tzs !== null && !s.stale && s.tzs < keptTzs;`,
    to: `  return s.tzs === null || s.stale || s.tzs < keptTzs;`,
    expect: `§10 ⛔ an unreadable or a stale balance does NOT hold a MARKETING batch inside sendBatch: unknown is not low, the engine fails closed before it (E16)`,
  },
  {
    // "TZS 15,000 on the card → top up → send" held on a figure the top-up had already made false.
    name: "sms.ts — a low reading is trusted by the marketing floor without a re-check",
    file: "src/lib/server/sms.ts",
    from: `      if (belowKeptForCodes(keptForCodes)) await refreshSmsBalance({ maxAgeMs: LOW_READING_RECHECK_MS });`,
    to: `      /* no re-check before the marketing floor refuses */`,
    expect: `§10 a LOW reading over a minute old is re-checked before the marketing floor refuses: a top-up is honoured`,
  },
  {
    // NaN compares false with everything, so a malformed floor would read as no floor at all.
    name: "sms.ts — a malformed floor is read as no floor",
    file: "src/lib/server/sms.ts",
    from: `      if (!Number.isFinite(keptForCodes) || keptForCodes < 0) {`,
    to: `      if (false) {`,
    expect: `§10 ⛔ a floor that is not a figure holds the MARKETING batch: a malformed option never opens the rail (and 0, a figure, sends)`,
  },
];
