// Mutation proof for scripts/visual-pass-r5c.test.mts (and the R5-C additions to scripts/gold-is-money.test.mts): plant each
// defect ON DISK, run the suite, require it to fail on the named check, restore the file's exact bytes and prove it (sha256).
// Lives in the scratchpad: the repo's suites write nothing.
// Usage: node mutate.cjs [--dry] [check-id ...]   (--dry: only count each anchor's matches; no args: every plant)
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = 'F:/kipindi-wip/';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const R5C = 'scripts/visual-pass-r5c.test.mts';
const GIM = 'scripts/gold-is-money.test.mts';

const CSS = 'src/app/globals.css';
const AGENT = 'src/app/agent/page.tsx';
const PERF = 'src/app/positions/performance/page.tsx';
const INV = 'src/app/profile/invite/page.tsx';

// [name, file, from, to, expected failing check, suite?]
const M = [
  // §1 · the census — a new gold use anywhere, in each spelling, is caught
  ['CENSUS a gold ink on an unregistered file (the reality check\'s clock)', 'src/components/rg/reality-check.tsx', 'border border-border text-text-subtle">', 'border border-border text-gold-300">', '1.1'],
  ['CENSUS one more gold use in a registered file (the market page\'s CLOSED word)', 'src/app/markets/[id]/page.tsx', 'font-bold text-brand-300">\n                {t.market.closedAwaitingSettlement}', 'font-bold text-gold-300">\n                {t.market.closedAwaitingSettlement}', '1.2'],
  ['CENSUS gold by another spelling (global-error\'s link hand-typed at hue 82)', 'src/app/global-error.tsx', 'const LINK = "oklch(82% 0.120 262)";', 'const LINK = "oklch(86% 0.13 82)";', '1.2'],
  ['CENSUS a gold component back at its call site (a GiltCorner on the agent\'s share card)', 'src/app/profile/invite/agent-dashboard.tsx', '            <div className="relative flex items-center gap-4">', '            <GiltCorner size={38} rotate={0} />\n            <div className="relative flex items-center gap-4">', '1.2'],
  ['CENSUS a gold tone by name on an unregistered file (the bulk bar\'s dot)', 'src/app/notifications/bulk-bar.tsx', '<Dot tone="brand" />', '<Dot tone="gold" />', '1.1'],
  // §2 · the items
  ['2.1 the notifications page\'s unread dot back to gold', 'src/app/notifications/bulk-bar.tsx', '<Dot tone="brand" />', '<Dot tone="gold" />', '2.1'],
  ['2.2 one of the agent\'s three facts back in gold', AGENT, '<Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4"\n          label={t.agent.statCost}', '<Stat size="xl" boxed="glass" labelStyle="strong" tone="gold" font="mono" className="p-4"\n          label={t.agent.statCost}', '2.2'],
  ['2.2 the agent\'s three facts back in two faces', AGENT, '<Stat size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4"\n          label={t.agent.statTime}', '<Stat size="xl" boxed="glass" labelStyle="strong" className="p-4"\n          label={t.agent.statTime}', '2.2'],
  ['2.2′ a paused agent back in the warning tone', AGENT, '{ tone: "neutral", text: t.agent.stateAgentPaused }', '{ tone: "warning", text: t.agent.stateAgentPaused }', '2.2′'],
  ['2.2′ the fee box back in gold', AGENT, '<section className="rounded-xl glass-panel p-4">\n        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.feeTitle}</p>', '<section className="rounded-xl border border-gold-700 p-4">\n        <p className="font-mono text-micro uppercase eyebrow font-bold text-gold-300">{t.agent.feeTitle}</p>', '2.2′'],
  ['2.3 the page eyebrow offering gold again', 'src/components/ui/page-header.tsx', '  subtle: "text-text-subtle",\n', '  subtle: "text-text-subtle",\n  gold: "text-gold-300",\n', '2.3'],
  ['2.3″ /proposals\' Create back in gold', 'src/app/proposals/page.tsx', '<Button variant="primary" size="md" leading={<I.plus s={15} />}>{t.proposals.create}</Button>', '<Button variant="gold" size="md" leading={<I.plus s={15} />}>{t.proposals.create}</Button>', '2.3″'],
  ['2.4 the notable card\'s crown back in gold', 'src/app/results/page.tsx', 'font-bold text-brand-300">\n          <I.crown s={13} />', 'font-bold text-gold-300">\n          <I.crown s={13} />', '2.4'],
  ['2.4′ the /results glyph back in gold', 'src/app/results/page.tsx', '<span className="text-text-subtle"><I.resolved s={18} /></span>', '<span className="text-gold-300"><I.resolved s={18} /></span>', '2.4′'],
  ['2.5 the fairness chain\'s highlight back in gilt', 'src/app/fairness/page.tsx', '? "border-2 border-brand-500 bg-brand-500/10 text-brand-300"', '? "border-2 border-gold-500 bg-gold-500/10 text-gold-300"', '2.5'],
  ['2.5′ the fairness numerals back in gold', CSS, 'content: counter(fairness-step) "."; position: absolute; top: 0; left: 0; font-weight: 700; }', 'content: counter(fairness-step) "."; position: absolute; top: 0; left: 0; font-weight: 700; color: var(--gold-300); }', '2.5′'],
  ['2.5′ the fairness numerals tabular again (R4-E\'s measured ink alignment spread)', CSS, 'content: counter(fairness-step) "."; position: absolute; top: 0; left: 0; font-weight: 700; }', 'content: counter(fairness-step) "."; position: absolute; top: 0; left: 0; font-weight: 700; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }', '2.5′'],
  ['2.6 the badge\'s progress ring back to gilt', CSS, '.badge-ring-arc {\n  stroke: var(--brand-500);', '.badge-ring-arc {\n  stroke: var(--gilt);', '2.6'],
  ['2.7 the KYC rail\'s current step back in gold', 'src/app/profile/kyc/page.tsx', '? "border-2 border-brand-500 bg-brand-500/10 text-brand-300"', '? "border-2 border-gold-500 bg-gold-500/10 text-gold-300"', '2.7'],
  ['2.8 the bar\'s needle quietly re-inked (a sanctioned gold removed)', CSS, '--bar-needle:           var(--gilt);', '--bar-needle:           var(--brand-400);', '2.8'],
  ['2.9 a second gold accent in one illustration (the briefcase)', 'src/components/ui/empty-state.tsx', '<rect x="26" y="29" width="4" height="4" rx="1" fill={g} stroke="none" />', '<rect x="26" y="29" width="4" height="4" rx="1" fill={g} stroke={g} />', '2.9'],
  ['2.11 the RG pending box back to the warning tone', 'src/app/profile/responsible-gambling/page.tsx', '<Callout tone="neutral" size="md" glyph="clock">', '<Callout tone="warning" size="md" glyph="clock">', '2.11'],
  ['2.11 the RG pending box back to the sm rung (11px)', 'src/app/profile/responsible-gambling/page.tsx', '<Callout tone="neutral" size="md" glyph="clock">', '<Callout tone="neutral" glyph="clock">', '2.11'],
  ['2.12 the reality check\'s minutes back in gold', 'src/components/rg/reality-check.tsx', '<span className="font-mono">{elapsedMin}</span>', '<span className="font-mono text-gold-300">{elapsedMin}</span>', '2.12'],
  // §3 · the one accent
  ['3 the /live pip back to aqua (two carousels, two answers)', 'src/app/live/featured-contest.tsx', 'background: i === idx ? "var(--brand-400)"', 'background: i === idx ? "var(--aqua-400)"', '3'],
  ['3 the journey bell\'s unread dot back to gold', 'src/components/layout/notifications-panel.tsx', 'const unreadDot = journey ? "brand" : "gold";', 'const unreadDot = "gold";', '3'],
  ['3′ the landing eyebrow tick back to gilt', CSS, '  height: 14px;\n  background: var(--brand-400);\n  transform: rotate(14deg);', '  height: 14px;\n  background: var(--gilt);\n  transform: rotate(14deg);', '3′'],
  ['3‴ the Callout\'s promise box back to gilt', 'src/components/ui/callout.tsx', '  box: "border-info-border bg-info-bg", strongBox: "border-info-fg bg-info-bg", icon: "text-info", glyph: "info",', '  box: "border-gold-500/30 bg-gold-500/10", strongBox: "border-gold-400 bg-gold-500/15", icon: "text-gold-300", glyph: "info",', '3‴'],
  // §4 · money not earned
  ['4.1 "Confirm deposit" back in gold', 'src/app/wallet/deposit/deposit-confirm.tsx', '<button ref={buttonRef} type="button" className="btn btn-primary btn-lg w-full">', '<button ref={buttonRef} type="button" className="btn btn-gold btn-lg w-full">', '4.1'],
  ['4.1′ "you receive" back in gold', 'src/components/ui/receipt-row.tsx', 'total:  "font-mono text-[16px] font-bold tabular-nums text-text",', 'total:  "font-mono text-[16px] font-bold tabular-nums text-gold-300",', '4.1′'],
  ['4.1″ the Lipa amount back in gold', 'src/components/pay/lipa-qr-panel.tsx', '<p className="amount mt-1 text-body-sm font-bold text-text">{formatTzs(amountTzs)}</p>', '<p className="amount mt-1 text-body-sm font-bold text-gold-300">{formatTzs(amountTzs)}</p>', '4.1″'],
  ['4.2 the cashback inducement\'s CTA back in gold', 'src/components/ui/cashback-promo.tsx', 'className="btn btn-primary btn-sm rounded-pill mt-4 inline-flex"', 'className="btn btn-gold btn-sm rounded-pill mt-4 inline-flex"', '4.2'],
  ['4.2 the bonus card\'s unlock fill back to gold → yes', 'src/app/wallet/wallet-client.tsx', 'background: "linear-gradient(90deg, var(--brand-500), var(--brand-300))"', 'background: "linear-gradient(90deg, var(--gold-500), var(--yes-400))"', '4.2'],
  ['4.3 the exact payout-if-win back in gold', 'src/components/markets/position-card.tsx', '            value={formatTzs(payout)}\n            money\n            hint={t.market.payoutExactNote}', '            value={formatTzs(payout)}\n            tone="gold"\n            money\n            hint={t.market.payoutExactNote}', '4.3'],
  ['4.4 a zero net back in gilt', PERF, '${netPnl > 0 ? "text-[var(--gilt)]" : netPnl < 0 ? "text-no-300" : "text-text"}', '${netPnl >= 0 ? "text-[var(--gilt)]" : "text-no-300"}', '4.4'],
  ['4.4′ the gilt corner on a best-win card with no win', PERF, '{bestMarket && <GiltCorner', '{<GiltCorner', '4.4′'],
  ['4.4′ the invite dial gold before a shilling is earned', INV, 'const earnedGold = paid && s.earnedTzs > 0;', 'const earnedGold = paid;', '4.4′'],
  ['4.5 the invite share button gold again', 'src/app/profile/invite/invite-client.tsx', '<Button variant="primary" size="lg" fullWidth leading={<I.share s={17} />} onClick={share}>', '<Button variant="gold" size="lg" fullWidth leading={<I.share s={17} />} onClick={share}>', '4.5'],
  ['4.5′ a paying friend\'s chip back on the resolved seal', INV, '<Chip variant={r.earnedTzs > 0 ? "success" : "pending"}>', '<Chip variant={r.earnedTzs > 0 ? "resolved" : "pending"}>', '4.5′'],
  ['4.6 "Verified agent" back in gold', 'src/components/agent/verified-agent-badge.tsx', '<Chip variant="success" className={className}>', '<Chip variant="gold" className={className}>', '4.6'],
  ['4.7 the proposal\'s market button gold once resolved', 'src/app/proposals/[id]/page.tsx', '<Button variant="ghost" size="md" fullWidth className="mt-3" trailing={<I.arrowRight s={15} />}>', '<Button variant={p.status === "RESOLVED" ? "gold" : "ghost"} size="md" fullWidth className="mt-3" trailing={<I.arrowRight s={15} />}>', '4.7'],
  ['4.8 SubmitButton offering gold again', 'src/components/ui/submit-button.tsx', 'variant?: "claret" | "primary" | "ghost";', 'variant?: "gold" | "claret" | "primary" | "ghost";', '4.8'],
  // §5 · the warning family's one meaning
  ['5.1 a fixable slip back in the gold-struck warning toast', 'src/components/profile/password-section.tsx', 'if (next.length < 8) { toast({ title: t.toast.passwordMin8, variant: "factual" }); return; }', 'if (next.length < 8) { toast({ title: t.toast.passwordMin8, variant: "warning" }); return; }', '5.1'],
  ['5.2 a moving payment back in the warning result', 'src/app/wallet/wallet-result-modal.tsx', '(amlHeld || pending ? "info" : "success")', '(amlHeld || pending ? "warning" : "success")', '5.2'],
  ['5.2 a reversed payment back in the error treatment', 'src/app/wallet/wallet-result-modal.tsx', '(status === "FAILED" ? "danger" : "neutral")', '(status === "FAILED" ? "danger" : "danger")', '5.2'],
  ['5.2″ "under review" back in amber', 'src/app/profile/source-of-funds/page.tsx', '    : "pending";', '    : "warning";', '5.2″'],
  ['5.3 the OTP\'s last minute back in gold', 'src/components/auth/otp-expiry-countdown.tsx', 'const barColor = expired ? "var(--danger-500)" : "var(--brand-400)";', 'const barColor = expired ? "var(--danger-500)" : remaining <= 60 ? "var(--gold-400)" : "var(--brand-400)";', '5.3'],
  ['5.3′ the position ring\'s last hour back in gold', 'src/components/positions/countdown-ring.tsx', 'const urgentColor = urgentAccent ?? runColor;', 'const urgentColor = urgentAccent ?? "var(--gold-400)";', '5.3′'],
  ['5.4 the activity meter back on a ramp of its own', 'src/app/profile/activity/page.tsx', 'background: limitUsageFill(pct, over)', 'background: over ? "var(--danger-500)" : "var(--brand-500)"', '5.4'],
  // §6 · sanctioned gold that must stay
  ['6.2 the bet commit taken off gold', 'src/components/markets/bet-confirm-modal.tsx', 'className="btn btn-gold btn-lg w-full"', 'className="btn btn-primary btn-lg w-full"', '6.2'],
  ['6.4 the live balance taken off gold', CSS, '.kp-jbal__fig { display: inline-grid; justify-items: center; font-weight: 700; font-size: 12px; line-height: 1.1; color: var(--gold-300);', '.kp-jbal__fig { display: inline-grid; justify-items: center; font-weight: 700; font-size: 12px; line-height: 1.1; color: var(--text);', '6.4'],
  // §7 · the owner's items
  ['7.1 the warning token re-hued without the owner', CSS, '--warning-fg:     var(--gilt);', '--warning-fg:     oklch(86% 0.12 70);', '7.1'],
  ['7.2 the classic rail dot re-inked without the owner', CSS, '  border-radius: var(--r-pill);\n  background: var(--gilt);\n}', '  border-radius: var(--r-pill);\n  background: var(--brand-400);\n}', '7.2'],
  ['7.6 the legal frame\'s corners back to gilt', 'src/app/legal/_components.tsx', '<GiltCorner size={54} rotate={0} ink="var(--claret-400)"', '<GiltCorner size={54} rotate={0}', '7.6'],
  ['7.7 the coming-soon tag de-golded in the frozen classic chrome too (the scoped override made global)', CSS, '#main-content .cs-badge,\n:root:has(#kp-journey-shell) .cs-badge {', '.cs-badge,\n:root:has(#kp-journey-shell) .cs-badge {', '7.7'],
  ['7.7 the page bodies\' coming-soon tag back in gold (the override dropped)', CSS, '#main-content .cs-badge,\n:root:has(#kp-journey-shell) .cs-badge {', '.cs-badge-unused,\n:root:has(#kp-journey-shell-unused) .cs-badge {', '7.7'],
  // gold-is-money · the R5-C extension
  ['GIM the leaderboard\'s streak chip back in the money ink', 'src/app/leaderboard/page.tsx', 'className="inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-mono text-[10px] font-bold"', 'className="inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-mono text-[10px] font-bold text-gold-300"', '1b', GIM],
  ['GIM an achievement icon\'s accent back to --gold-400', 'src/components/badges/icons.tsx', 'const gold = "var(--metal-gold)";', 'const gold = "var(--gold-400)";', '1', GIM],
  ['GIM the coin\'s rim back on an alias of the money ink', CSS, '  border: 1.5px solid var(--metal-gold);\n  box-shadow:', '  border: 1.5px solid var(--border-gold);\n  box-shadow:', '2b', GIM],
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyIds = args.filter((a) => a !== '--dry');
const only = onlyIds.length ? new Set(onlyIds) : null;
let caught = 0, missed = 0, restored = 0, ran = 0;
const rows = [];
for (const [name, file, from, to, expect, suite = R5C] of M) {
  if (only && !only.has(expect)) continue;
  ran++;
  const p = ROOT + file;
  const orig = fs.readFileSync(p);
  const h0 = sha(orig);
  const s = orig.toString('utf8');
  const crlf = s.includes('\r\n');
  const lf = s.replace(/\r\n/g, '\n');
  const n = lf.split(from).length - 1;
  if (n !== 1) { rows.push(`ANCHOR ${expect} ${name}: ${n} matches`); missed++; continue; }
  if (dry) { rows.push(`anchor ok  ${expect.padEnd(5)} ${name}`); caught++; restored++; continue; }
  let mutated = lf.replace(from, () => to);
  if (crlf) mutated = mutated.replace(/\n/g, '\r\n');
  let out = '', code = 0;
  try {
    fs.writeFileSync(p, mutated);
    const r = spawnSync('npx', ['tsx', suite], { cwd: ROOT, encoding: 'utf8', shell: true });
    out = (r.stdout || '') + (r.stderr || '');
    code = r.status;
  } finally {
    fs.writeFileSync(p, orig);
  }
  const back = sha(fs.readFileSync(p)) === h0;
  if (back) restored++;
  const esc = expect.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
  const hit = code !== 0 && new RegExp(`FAIL ${esc}( |′|″|‴|⁗)`).test(out);
  if (hit) caught++; else missed++;
  const failed = [...out.matchAll(/FAIL (\S+)/g)].map((m) => m[1]);
  rows.push(`${hit ? 'CAUGHT' : 'MISSED'} ${expect.padEnd(5)} ${name} — ${suite.replace('scripts/', '')} exit ${code}, failed [${[...new Set(failed)].join(' ')}], restored ${back ? 'byte-identical' : 'DIFFERENT'}`);
}
console.log(rows.join('\n'));
console.log(`\nmutations: ${ran} planted, ${caught} caught, ${missed} missed · restored byte-identical: ${restored}/${ran}${dry ? ' (DRY: anchors only)' : ''}`);
process.exit(missed ? 1 : 0);
