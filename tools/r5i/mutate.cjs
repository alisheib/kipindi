// Mutation proof for R5-I: scripts/visual-pass-r5i.test.mts, the §11 added to scripts/feedback-law.test.mts, the §7 added to
// scripts/betting-ink.test.mts, and R5-I's re-pin in scripts/visual-pass-r5c.test.mts. Each defect is planted ON DISK, the
// suite is run, it must fail on the named check, and the file's exact bytes are restored and proved (sha256).
// Lives in the scratchpad: the repo's suites write nothing.
// Usage: node mutate.cjs [--dry] [check-id ...]   (--dry: only count each anchor's matches; no args: every plant)
const fs = require("fs");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const ROOT = "F:/kipindi-r5i/";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const R5I = "scripts/visual-pass-r5i.test.mts";
const FL = "scripts/feedback-law.test.mts";
const BI = "scripts/betting-ink.test.mts";
const R5C = "scripts/visual-pass-r5c.test.mts";
const CSS = "src/app/globals.css";
const ORM = "src/components/markets/operation-result-modal.tsx";
const DIAL = "src/components/markets/conviction-dial.tsx";
const PROF = "src/app/profile/page.tsx";
const WAL = "src/app/wallet/wallet-client.tsx";

// [name, file, from, to, expected failing check, suite?]
const M = [
  // ── §1 · the census: a new use of the betting pair anywhere, in each spelling, is caught ──────────────────────────────
  ["CENSUS the pair on an unregistered file (the sessions page's Sign out back in the NO rose)", "src/app/profile/sessions/page.tsx", 'style={{ color: "var(--danger-fg)" }}', 'style={{ color: "var(--no-300)" }}', "1.1"],
  ["CENSUS one more use in a registered file (the result's success crest back to the YES ramp)", ORM, '...crest("var(--success)", "var(--success-fg)"),', '...crest("var(--yes-400)", "var(--yes-300)"),', "1.2"],
  ["CENSUS the pair by NAME on an unregistered file (the RG hero's glow back to `yes`)", "src/app/profile/responsible-gambling/page.tsx", '<PageHero glow="info">', '<PageHero glow="yes">', "1.1"],
  ["CENSUS the pair by another spelling (a language glyph hand-typed at hue 22)", "src/lib/i18n.tsx", '{ char: "En",  color: "var(--brand-200)" },', '{ char: "En",  color: "oklch(78% 0.16 22)" },', "1.1"],
  // ── §2 · I-1, the app states ────────────────────────────────────────────────────────────────────────────────────────
  ["2.1 the result's success crest back in the YES green", ORM, '...crest("var(--success)", "var(--success-fg)"),', '...crest("var(--yes-400)", "var(--yes-300)"),', "2.1"],
  ["2.1′ a refusal's way out back on the NO side's stake button", ORM, '    ...crest("var(--danger)", "var(--danger-fg)"),\n    // ⛔ NOT `btn-no`', '    ...crest("var(--danger)", "var(--danger-fg)"),\n    primaryBtn: "btn-no",\n    // ⛔ NOT `btn-no`', "2.1′"],
  ["2.2 the crash page's mark back in the NO rose", "src/app/global-error.tsx", 'const DANGER_TEXT = "oklch(82% 0.16 25)";', 'const DANGER_TEXT = "oklch(80% 0.14 22)";', "2.2"],
  ["2.3 the avatar's clear hover back in the NO rose", "src/components/profile/avatar-uploader.tsx", "group-hover:border-danger-border group-hover:text-danger-fg", "group-hover:border-no-700 group-hover:text-no-300", "2.3"],
  ["2.3 a notification's dismiss hover back in the NO rose", "src/app/notifications/row-actions.tsx", "hover:text-danger-fg hover:bg-bg-overlay", "hover:text-no-300 hover:bg-bg-overlay", "2.3"],
  ["2.3 /profile's Sign out plate back in the NO rose", PROF, "bg-danger-500/10 text-danger-fg group-hover:bg-danger-500/20", "bg-no-500/10 text-no-300 group-hover:bg-no-500/20", "2.3"],
  ["2.4 the dial's stake range chip back in the NO rose", DIAL, '{isOverMax || isUnderMin ? (\n            <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-danger-border bg-danger-bg px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-danger-fg whitespace-nowrap">', '{isOverMax || isUnderMin ? (\n            <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-no-700 bg-no-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-no-300 whitespace-nowrap">', "2.4"],
  ["2.4′ Up & Down's out-of-range amount back in the Down side's rose", "src/components/updown/updown-stake-controls.tsx", 'customInvalid ? "text-danger-fg" : "text-text-subtle"', 'customInvalid ? "text-no-300" : "text-text-subtle"', "2.4′"],
  ["2.4′ a proposal's bad source link back in the NO rose", "src/app/proposals/new/create-form.tsx", 'text-danger-fg">{t.proposals.sourceLinkInvalid}', 'text-no-300">{t.proposals.sourceLinkInvalid}', "2.4′"],
  ["2.4′ \"passwords match\" back in the YES green", "src/components/auth/password-pair.tsx", '<span className="text-success-fg">{t.common.passwordsMatch}</span>', '<span className="text-yes-300">{t.common.passwordsMatch}</span>', "2.4′"],
  ["2.5 2FA's on-plate back in the YES green", "src/app/profile/security/security-client.tsx", 'enabled ? "bg-success-500/10 text-success-fg"', 'enabled ? "bg-yes-500/10 text-yes-300"', "2.5"],
  ["2.5 the paid-out tick back in the YES green", "src/components/markets/resolution-panel.tsx", '<I.check s={13} className="text-success-fg" />', '<I.check s={13} className="text-yes-300" />', "2.5"],
  ["2.5 the free window's \"No fee\" back in the YES green", "src/components/markets/sell-confirm-modal.tsx", 'style={{ color: isFree ? "var(--success-fg)" : "var(--text)" }}', 'style={{ color: isFree ? "var(--yes-300)" : "var(--text)" }}', "2.5"],
  ["2.5 an agent's uploaded slot back in the YES green", "src/app/agent/apply/apply-client.tsx", 'done ? "text-success-fg" : "text-text-subtle"', 'done ? "text-yes-300" : "text-text-subtle"', "2.5"],
  ["2.6 the auth eyebrow offering YES/NO again", "src/components/auth/auth-panel.tsx", 'export type AuthEyebrowTone = "brand" | "danger" | "success";', 'export type AuthEyebrowTone = "brand" | "danger" | "success" | "yes";', "2.6"],
  ["2.7‴ the RG art's accent back in the YES green", "src/components/rg/self-care-art.tsx", 'fill="currentColor" stroke="none" />', 'fill="var(--yes-300)" stroke="none" />', "2.7‴"],
  ["2.8 /profile's emerald → rose tilt back", PROF, '"radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +', '"radial-gradient(1200px 360px at 0% 0%, oklch(40% 0.10 152 / 0.30), transparent 60%), " +', "2.8"],
  ["2.8′ the open count's glyph back in the YES green", PROF, "icon={<I.sparkle s={14} />}", 'icon={<I.sparkle s={14} className="text-yes-300" />}', "2.8′"],
  ["2.9 the activity page's Won label tinted again", "src/app/profile/activity/page.tsx", "value={formatTzs(summary.won)}         icon={<I.trophy s={14} />} />", 'value={formatTzs(summary.won)}         icon={<I.trophy s={14} />} labelTone="yes" />', "2.9"],
  ["2.10 the journey bell's count back in the NO rose", "src/components/layout/notifications-panel.tsx", 'const countTone = journey ? "brand" : "rose";', 'const countTone = "rose";', "2.10"],
  ["2.11 a positive Up & Down net back in the YES green", "src/app/updown/history/page.tsx", 'style={{ color: net > 0 ? "var(--gilt)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>', 'style={{ color: net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>', "2.11"],
  ["2.12 the /wallet row's settled-credit plate back in the YES green", WAL, 'settledCredit || !(isCredit || movedNothing) ? "bg-brand-500/10 text-brand-300"', 'settledCredit ? "bg-yes-500/10 text-yes-300" : !(isCredit || movedNothing) ? "bg-brand-500/10 text-brand-300"', "2.12"],
  ["2.12″ the self-exclusion doors' hover back on the NO rose", WAL, "hover:text-text hover:border-border-strong transition-colors", "hover:text-text hover:border-no-700 transition-colors", "2.12″"],
  ["2.13 the leaderboard's rate back in the YES/NO inks", "src/app/leaderboard/page.tsx", '<span className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-text">', '<span className={`mt-0.5 font-mono text-[13px] font-bold tabular-nums ${r.roi >= 0 ? "text-yes-300" : "text-no-300"}`}>', "2.13"],
  ["2.14 the payout notice's edge back on the NO rose", "src/components/wallet/payout-status-notice.tsx", 'className={unavailable ? "border-danger-border" : undefined}', 'className={unavailable ? "border-no-700/60" : undefined}', "2.14"],
  ["2.15 the stale receipt back in the NO rose", "src/components/charts/terminal-chart.tsx", 'feed.liveStale ? "var(--danger-fg)"', 'feed.liveStale ? "var(--no-300)"', "2.15"],
  ["2.15′ the placed pulse back in the YES green", CSS, "0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--success-500) 55%, transparent); }", "0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--yes-500) 55%, transparent); }", "2.15′"],
  ["2.15″ the balance's up-move back in the YES green", CSS, ".kp-jbal__delta[data-sign] { color: var(--text); }", '.kp-jbal__delta[data-sign] { color: var(--text); }\n.kp-jbal__delta[data-sign="up"] { color: var(--yes-300); }', "2.15″"],
  // ── §3 · I-2, the refusals ──────────────────────────────────────────────────────────────────────────────────────────
  ["3.3‴ the dial's short balance back in the NO rose", DIAL, '<p className="mt-3 flex items-start gap-1 text-body-sm leading-[1.45] text-text-faint">', '<p className="mt-3 flex items-start gap-1 text-body-sm leading-[1.45] text-no-300">', "3.3‴"],
  ["3.4 the data export's refusal back to the alarm for every reason", "src/app/profile/account/export-data-button.tsx", "variant: refusalVariant(refusalReason(result)) });", 'variant: "danger" });', "3.4"],
  ["3.4 a comment's report refusal back to the alarm for every reason", "src/components/markets/comments-thread.tsx", '        toast({ title: errorCopy(t, r), variant: refusalVariant(refusalReason(r)) });\n      }\n    });\n  };\n\n  const remove', '        toast({ title: errorCopy(t, r), variant: "danger" });\n      }\n    });\n  };\n\n  const remove', "3.4"],
  ["3.5 a refused copy (Lipa) alarms again", "src/components/pay/lipa-qr-panel.tsx", 'description: t.toast.longPressCopy, variant: "factual" });', 'description: t.toast.longPressCopy, variant: "danger" });', "3.5"],
  ["3.7 an agent's referee field alarms again", "src/app/agent/apply/apply-client.tsx", 'variant: r.field ? "factual" : "danger"', 'variant: "danger"', "3.7"],
  // ── §4 · I-3, the grant words ───────────────────────────────────────────────────────────────────────────────────────
  ["4.1 a queued grant back in amber", "src/lib/status-tone.ts", 'GRANT_QUEUED:      { player: "royal" },', 'GRANT_QUEUED:      { player: "amber" },', "4.1"],
  ["4.1′ an unlocked grant struck in gilt", "src/lib/status-tone.ts", 'GRANT_FULFILLED:   { player: "green" },', 'GRANT_FULFILLED:   { player: "giltStruck" },', "4.1′"],
  ["4.2 the grant word back on the hand-rolled warning pill", WAL, '<Chip variant={grantStatusChip(g.status) ?? "neutral"} size="sm" metrics="base">\n                              {word}\n                            </Chip>', '<span className="inline-flex items-center rounded-pill px-1.5 py-px text-[8px] font-bold bg-warning-bg border border-warning-border text-warning-fg">\n                              {word}\n                            </span>', "4.2"],
  ["4.3 a declaration under review back in amber on /profile", PROF, 'sof!.reviewStatus === "REJECTED" ? "border-warning-border bg-warning-bg" : "border-info-border bg-info-bg"', 'sof!.reviewStatus === "REJECTED" ? "border-warning-border bg-warning-bg" : "border-warning-border bg-warning-bg"', "4.3"],
  ["4.3′ a declaration under review back in the success box", "src/app/profile/source-of-funds/page.tsx", 'existing.reviewStatus === "ACCEPTED" ? "border-success-border bg-success-bg" : "border-info-border bg-info-bg"', 'existing.reviewStatus === "ACCEPTED" ? "border-success-border bg-success-bg" : "border-success-border bg-success-bg"', "4.3′"],
  // ── §5 · contrast ───────────────────────────────────────────────────────────────────────────────────────────────────
  ["5‴ the brand pip back on `--brand-500` (3.48:1 digits)", "src/components/ui/count-badge.tsx", 'brand: { background: "var(--brand-600)", color: "var(--pearl-50)" },', 'brand: { background: "var(--brand-500)", color: "var(--pearl-50)" },', "5‴"],
  // ── §6 · what must stay ─────────────────────────────────────────────────────────────────────────────────────────────
  ["6.1 a side button losing the betting pair", "src/components/markets/market-card.tsx", "btn btn-yes", "btn btn-primary", "6.1"],
  ["6.8 an RG notice's tone swept up", "src/app/profile/responsible-gambling/page.tsx", '<Callout tone="neutral" size="md" glyph="lock">', '<Callout tone="info" size="md" glyph="lock">', "6.8"],
  // ── test:feedback-law §11 ───────────────────────────────────────────────────────────────────────────────────────────
  ["FL 11.0 the rank inverted for warnings (a fixable slip reads `danger`)", "src/lib/failure-reasons.ts", 'return reason !== null && REASONS[reason].severity !== "error" ? "factual" : "danger";', 'return reason !== null && REASONS[reason].severity === "info" ? "factual" : "danger";', "11.0", FL],
  ["FL 11.1 the dial opens the ✗ result over every refusal again", DIAL, '        if (mapped.variant === "danger") {\n          setResultData({', '        if (mapped.variant === "danger" || mapped.variant === "factual") {\n          setResultData({', "11.1", FL],
  ["FL 11.1 a dial arm toasts the gold `warning` again (BUSY)", DIAL, 'variant: refusalVariant(reasonForCode(code)), retryable: true', 'variant: "warning" as never, retryable: true', "11.1", FL],
  ["FL 11.1 the dial's short balance back to `danger`", DIAL, 'variant: refusalVariant("balance_insufficient")', 'variant: "danger"', "11.1", FL],
  ["FL 11.2 Up & Down's legacy BUSY back to `danger`", "src/components/updown/updown-bet-errors.ts", 'return { kind: "transient", description: m.udErrBusy, lockNow: false, variant: refusalVariant(reasonForCode(code)) };', 'return { kind: "transient", description: m.udErrBusy, lockNow: false, variant: "danger" };', "11.2", FL],
  ["FL 11.2c the quick bet toasts every refusal `danger` again", "src/components/updown/use-quick-bet.ts", "variant: fail.variant, durationMs: 0 });", 'variant: "danger", durationMs: 0 });', "11.2c", FL],
  ["FL 11.4 an empty name alarms again", "src/components/profile/name-editor.tsx", 'toast({ title: t.toast.nameEmpty, variant: "factual" });', 'toast({ title: t.toast.nameEmpty, variant: "danger" });', "11.4", FL],
  ["FL 11.5 the browser's English error message back in a toast", "src/components/profile/avatar-uploader.tsx", "toast({ title: t.toast.couldntReadImage, description: t.toast.pickJpgPng, variant: \"factual\" });", "toast({ title: t.toast.couldntReadImage, description: (err as Error).message, variant: \"factual\" });", "11.5", FL],
  // ── test:betting-ink §7 ─────────────────────────────────────────────────────────────────────────────────────────────
  ["BI §7a a sideless surface wears the NO rose (the sessions page's Sign out)", "src/app/profile/sessions/page.tsx", 'style={{ color: "var(--danger-fg)" }}', 'style={{ color: "var(--no-300)" }}', "§7a", BI],
  ["BI §7b the result's failure crest back in the NO rose", ORM, '...crest("var(--danger)", "var(--danger-fg)"),', '...crest("var(--no-400)", "var(--no-300)"),', "§7b", BI],
  ["BI §7b the balance's ±delta back in the betting pair", CSS, ".kp-jbal__delta[data-sign] { color: var(--text); }", ".kp-jbal__delta[data-sign] { color: var(--yes-300); }", "§7b", BI],
  ["BI §7b the dial's multiplier chip back in the NO rose", DIAL, '{isMultOverMax || isMultUnderMin ? (\n            <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-danger-border bg-danger-bg px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-danger-fg whitespace-nowrap">', '{isMultOverMax || isMultUnderMin ? (\n            <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-no-700 bg-no-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-no-300 whitespace-nowrap">', "§7b", BI],
  // ── test:visual-pass-r5c · R5-I's re-pin holds ──────────────────────────────────────────────────────────────────────
  ["R5C 1.2 a zero net on /updown/history struck in gilt (beyond the registered two)", "src/app/updown/history/page.tsx", 'style={{ color: net > 0 ? "var(--gilt)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>', 'style={{ color: net >= 0 ? "var(--gilt)" : net < 0 ? "var(--no-300)" : "var(--gilt)" }}>', "1.2", R5C],
];

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const onlyIds = args.filter((a) => a !== "--dry");
const only = onlyIds.length ? new Set(onlyIds) : null;
let caught = 0, missed = 0, restored = 0, ran = 0;
const rows = [];
for (const [name, file, from, to, expect, suite = R5I] of M) {
  if (only && !only.has(expect)) continue;
  ran++;
  const p = ROOT + file;
  const orig = fs.readFileSync(p);
  const h0 = sha(orig);
  const s = orig.toString("utf8");
  const crlf = s.includes("\r\n");
  const lf = s.replace(/\r\n/g, "\n");
  const n = lf.split(from).length - 1;
  if (n !== 1) { rows.push(`ANCHOR ${expect} ${name}: ${n} matches`); missed++; restored++; continue; }
  if (dry) { rows.push(`anchor ok  ${expect.padEnd(5)} ${name}`); caught++; restored++; continue; }
  let mutated = lf.replace(from, () => to);
  if (crlf) mutated = mutated.replace(/\n/g, "\r\n");
  let out = "", code = 0;
  try {
    fs.writeFileSync(p, mutated);
    const r = spawnSync("npx", ["tsx", suite], { cwd: ROOT, encoding: "utf8", shell: true });
    out = (r.stdout || "") + (r.stderr || "");
    code = r.status;
  } finally {
    fs.writeFileSync(p, orig);
  }
  const back = sha(fs.readFileSync(p)) === h0;
  if (back) restored++;
  const esc = expect.replace(/[.*+?^${}()|[\]\\]/g, (c) => "\\" + c);
  const hit = code !== 0 && new RegExp(`FAIL ${esc}( |′|″|‴|⁗)`).test(out);
  if (hit) caught++; else missed++;
  const failed = [...out.matchAll(/FAIL (\S+)/g)].map((m) => m[1]);
  rows.push(`${hit ? "CAUGHT" : "MISSED"} ${expect.padEnd(5)} ${name} — ${suite.replace("scripts/", "")} exit ${code}, failed [${[...new Set(failed)].join(" ")}], restored ${back ? "byte-identical" : "DIFFERENT"}`);
}
console.log(rows.join("\n"));
console.log(`\nmutations: ${ran} planted, ${caught} caught, ${missed} missed · restored byte-identical: ${restored}/${ran}${dry ? " (DRY: anchors only)" : ""}`);
process.exit(missed ? 1 : 0);
