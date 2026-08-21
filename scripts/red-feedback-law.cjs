/**
 * RED PROOF for the FEEDBACK LAW guard (`npm run test:feedback-law`).
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation below must make the suite EXIT
 * NON-ZERO *and* report ≥1 failure, and every mutation is reverted and verified byte-for-byte.
 * A mutation whose anchor is missing is reported as PROVING NOTHING — never skipped quietly,
 * because a stale anchor is an ABSENT test that fails in the direction of looking fine. That
 * is not hypothetical here: the sibling harness `red-e64.cjs` carried an anchor that went
 * stale on 2026-08-07 and sat unnoticed for eight days, partly because it was not in
 * `red:all`. Both this and that are wired into `red:all` in the same commit.
 *
 * ⭐ EVERY MUTATION IS A DEFECT THAT WAS REAL, or is the exact inverse of one:
 *   · the poll that buzzed on a render (and on a LOSS, with the win pattern)
 *   · E-57's short-circuited call — the symbol survives, the feedback does not
 *   · a refusal that says only that something failed
 *   · a refusal wearing the alarm register for a slip the player can fix
 *   · gold on something that was not earned
 *   · the money exit stated as a constant, on rounds where it does not exist
 *   · the client rule and the server rule drifting apart
 *   · the toast the player is READING resumed by someone else's arrival, bar still frozen
 *
 *   npm run red:feedback-law
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const SUITE = "scripts/feedback-law.test.mts";

const PANEL = "src/components/layout/notifications-panel.tsx";
const QUICK = "src/components/updown/use-quick-bet.ts";
const STAR = "src/components/markets/watch-star.tsx";
const TOAST = "src/components/ui/toast.tsx";
const CONTROLS = "src/components/updown/updown-stake-controls.tsx";
const RECEIPT = "src/components/updown/updown-bet-receipt-modal.tsx";
const SERVICE = "src/lib/server/market-service.ts";
const DICT = "src/lib/i18n-dict.ts";
const TIMING = "src/lib/feedback-timing.ts";
const ANNOUNCER = "src/components/updown/updown-result-announcer.tsx";

const PRESENCE = "src/lib/result-modal-presence.ts";

const MUTATIONS = [
  // ── §10 · the secondary standing down, and the three ways to get it wrong ──────────────
  {
    // 🔴 THE SUPPRESSION SIMPLY STOPS. The toast paints over the receipt's crest at 360 again.
    name: "⭐ the viewport stops holding — the toast covers the receipt crest at 360 again",
    file: TOAST,
    find: `  if (held) return null;`,
    with: `  void held;`,
  },
  {
    // ⛔ THE ONE THAT LOSES TIME NOBODY SAW. Holding without pausing means a 3s toast burns its
    // whole dwell behind the modal and is gone — or half-gone — by the time the player can see
    // it. "Held" then means "silently expired", which is the drop this design exists to avoid.
    name: "held toasts keep counting down behind the modal — the dwell burns unseen",
    file: TOAST,
    find: `    if (resultModalOpen) {
      if (!prevModalOpenRef.current) userPausedRef.current.clear();
      for (const id of ids) pause(id);
    } else if (prevModalOpenRef.current) {
      for (const id of ids) if (!userPausedRef.current.has(id)) resume(id);
    }`,
    with: `    void resultModalOpen; void ids; void pause; void resume;`,
  },
  {
    // 🔴 THE DEFECT THE EDGE CLOSES, RESTORED. Releasing on state rather than on the modal's
    // true→false EDGE means any stack change — a NEW TOAST ARRIVING — bulk-resumes every
    // countdown, including one the pointer is holding. `resume` re-arms the real dismiss
    // timer; `ToastItem`'s own `paused` state keeps the bar frozen. Under a burst the toast
    // the player is reading vanishes mid-sentence under a bar that still looks half full.
    name: "the release is state-driven again — a new arrival kills the toast under the pointer",
    file: TOAST,
    find: `    } else if (prevModalOpenRef.current) {
      for (const id of ids) if (!userPausedRef.current.has(id)) resume(id);
    }`,
    with: `    } else {
      for (const id of ids) resume(id);
    }`,
  },
  {
    // ⚠️ THE LEAK. The count is taken and never released, so after the first result modal the
    // site never shows another toast — total, silent, and only visible on the SECOND action.
    name: "presence is never released — every toast on the site goes silent after one modal",
    file: PRESENCE,
    find: `    return () => {
      openCount = Math.max(0, openCount - 1);
      publish();
    };`,
    with: `    return () => {};`,
  },
  {
    name: "⭐ the poll buzzes again — a vibration for a render nobody asked for",
    file: PANEL,
    find: `    if (prevUnreadRef.current !== null && clientUnread > prevUnreadRef.current) {
      setRingSeq((s) => s + 1);
    }`,
    with: `    if (prevUnreadRef.current !== null && clientUnread > prevUnreadRef.current) {
      haptics.success();
      setRingSeq((s) => s + 1);
    }`,
  },
  {
    name: "E-57 — the haptic call is short-circuited; every character of the name survives",
    file: QUICK,
    find: `          haptics.confirm();`,
    with: `          void 0 && haptics.confirm();`,
  },
  {
    name: "the refusal says only that something failed (the §6a defect, restored)",
    file: STAR,
    find: `        toast({ title: t.watchlist.toggleFailed, description: t.watchlist.toggleFailedBody, variant: "factual" });`,
    with: `        toast({ title: t.watchlist.toggleFailed, variant: "factual" });`,
  },
  {
    name: "a fixable slip wears the ALARM register (red, role=alert, error haptic)",
    file: STAR,
    find: `description: t.watchlist.toggleFailedBody, variant: "factual" });`,
    with: `description: t.watchlist.toggleFailedBody, variant: "danger" });`,
  },
  {
    name: "the premise moves — `warning` is re-inked off gold and nobody re-decides §F",
    file: TOAST,
    find: `  warning: {
    bar: "bg-gold-500",`,
    with: `  warning: {
    bar: "bg-brand-300",`,
  },
  {
    name: "`factual` grows a TICK — a confirmation glyph over news that is not good",
    file: TOAST,
    find: `    icon: <span className="text-text-secondary"><I.info s={18} /></span>,`,
    with: `    icon: <span className="text-text-secondary"><I.checkCircle s={18} /></span>,`,
  },
  {
    name: "⭐ the Up & Down bet loses its receipt again — money moves, no dialog",
    file: CONTROLS,
    find: `        <UpDownBetReceiptModal`,
    with: `        <NoSuchModal`,
  },
  {
    name: "the burst stops coalescing — a second bet inherits the first tap's countdown",
    file: CONTROLS,
    find: `          key={bet.placedReceipt?.nonce ?? 0}`,
    with: ``,
  },
  {
    name: "⭐ the way out is stated as a CONSTANT — false on every 3-minute round",
    file: RECEIPT,
    find: `  const exitMinutes = freeExitMinutesFor(info, placed);`,
    with: `  const exitMinutes = 5;`,
  },
  {
    name: "the projection is GILDED — gold on money that has not been earned",
    file: RECEIPT,
    find: `      stripTone={placed.side === "UP" ? "yes" : "no"}`,
    with: `      stripTone="gold"`,
  },
  {
    name: "⭐ the SERVER's runway rule is reworded and the client silently keeps the old one",
    file: SERVICE,
    find: `  const hadRunway = graceMs > 0 && closesAt - placedAt >= graceMs;`,
    with: `  const hadRunway = graceMs > 0 && (closesAt - placedAt) > graceMs;`,
  },
  {
    name: "the server stops refusing a bonus-funded exit; the receipt still promises one",
    file: SERVICE,
    find: `  const bonusFunded = (position.bonusStakeTzs ?? 0) > 0;`,
    with: `  const bonusFunded = false;`,
  },
  {
    name: "the bare-word title returns — a refusal that names neither cause nor remedy",
    file: DICT,
    find: `      passwordFailed: "Password not changed",`,
    with: `      failed: "Failed",`,
  },
  {
    name: "⭐ a SIXTH banner starts rendering the server's English at a player",
    file: STAR,
    find: `      className={cn(`,
    with: `      data-red={<span>{sp.error}</span>}
      className={cn(`,
  },
  {
    name: "⭐ the dwell literal comes back to a call site — four copies of one rule again",
    file: ANNOUNCER,
    find: `          durationMs: DWELL_RESULT_MS,`,
    with: `          durationMs: 6000,`,
  },
  {
    name: "the intrusion rule inverts — the blocking modal outstays the corner toast",
    file: TIMING,
    find: `export const DWELL_CELEBRATION_MS = 7_000;`,
    with: `export const DWELL_CELEBRATION_MS = 9_000;`,
  },
  {
    name: "⭐ the celebration parks on screen — a beat becomes an obstruction",
    file: TIMING,
    find: `export const DWELL_RESULT_MS = 8_000;`,
    with: `export const DWELL_RESULT_MS = 30_000;`,
  },
  {
    name: "the raise is quietly reverted — 'more time' stops being true",
    file: TIMING,
    find: `export const DWELL_CELEBRATION_MS = 7_000;`,
    with: `export const DWELL_CELEBRATION_MS = 4_500;`,
  },
  {
    name: "⭐ the bet-placed toast is swept up in the change (Ali: keep it NORMAL)",
    file: QUICK,
    find: `            durationMs: 3000,`,
    with: `            durationMs: 9000,`,
  },
  {
    name: "⭐ a LOSS is timed shorter than a WIN — the platform leans on the outcome it likes",
    file: ANNOUNCER,
    find: `        title: t.market.udLostTitle,
        description: \`\${sideWord} · \${formatTzs(res.stake)}\`,
        variant: "factual",
        durationMs: DWELL_RESULT_MS,`,
    with: `        title: t.market.udLostTitle,
        description: \`\${sideWord} · \${formatTzs(res.stake)}\`,
        variant: "factual",
        durationMs: 2000,`,
  },
  {
    name: "a native browser dialog reaches a player",
    file: STAR,
    find: `    const prev = on;`,
    with: `    const prev = on;
    if (!confirm("Are you sure?")) return;`,
  },
];

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

/** Try the anchor as written, then its CRLF form. Returns the form actually present. */
function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  if (text.includes(crlf)) return crlf;
  return null;
}

console.log("── the suite on the FIXED tree (must be green, or nothing below proves anything) ──");
const before = run();
console.log(`   exit=${before.status}  ${(before.stdout + before.stderr).match(/\d+ passed, \d+ failed/)?.[0] ?? ""}`);
if (before.status !== 0) {
  console.error("   ✗ the suite is not green to begin with — fix that first");
  process.exit(2);
}

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  const find = resolve(original, m.find);
  if (!find) {
    console.error(`   ✗ ANCHOR NOT FOUND in ${m.file} (neither LF nor CRLF) — THIS MUTATION PROVES NOTHING.`);
    continue;
  }
  const replacement = m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n");
  const mutated = original.replace(find, replacement);
  if (mutated === original) {
    console.error(`   ✗ THE FILE DID NOT CHANGE — THIS MUTATION PROVES NOTHING.`);
    continue;
  }
  writeFileSync(m.file, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failed = Number(out.match(/^feedback-law: (\d+) passed, (\d+) failed/m)?.[2] ?? 0);
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.trim().startsWith("·")).slice(0, 3)) {
    console.log(`     ${line.trim()}`);
  }
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) {
    console.error(`   🔴 REVERT FAILED on ${m.file} — stop and restore by hand`);
    process.exit(2);
  }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
