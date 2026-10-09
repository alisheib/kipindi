// Mutation proof for scripts/visual-pass-r4i.test.mts: plant each defect ON DISK, run the suite, require it to fail on the
// named check, restore the file's exact bytes and prove it (sha256). Lives in the scratchpad: the repo's suite writes nothing.
// Usage: node mutate.cjs [check-id ...]   (no args: every plant)
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = 'F:/kipindi-vis/';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const LOGIN = 'src/app/auth/login/page.tsx';
const RGA = 'src/app/profile/responsible-gambling/actions.ts';
const RGP = 'src/app/profile/responsible-gambling/page.tsx';
const DIAL = 'src/components/markets/conviction-dial.tsx';
const BCM = 'src/components/markets/bet-confirm-modal.tsx';
const MOD = 'src/components/ui/modal.tsx';
const DEP = 'src/app/wallet/deposit/page.tsx';
const HERO = 'src/components/home/landing-hero.tsx';
const MKT = 'src/app/markets/[id]/page.tsx';
const KEEP = 'src/components/ui/keep-run.tsx';
const SCALE = 'src/components/markets/dial-scale.ts';

// [name, file, from, to, expected failing check]
const M = [
  // §1 · the end: one formatter, carried as the instant
  ['E9 the formatter back on English months', 'src/lib/break-end.ts', '? formatEatDateTime(e.atMs, nowMs, monthsShort, locale)', '? formatEatDateTime(e.atMs, nowMs, ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], "en")', '1.1'],
  ['E9 the URL reader trusting any parseable value', 'src/lib/break-end.ts', '  if (INSTANT.test(s)) {', '  if (Number.isFinite(Date.parse(s))) return { atMs: Date.parse(s), withTime: true };\n  if (INSTANT.test(s)) {', '1.2′'],
  ['E9 accountRefusalPath back on the UTC day', 'src/lib/auth-landing.ts', 'const end = detail.standing === "serving" ? breakEndParam(detail.until) : null;', 'const end = detail.standing === "serving" ? (detail.until?.slice(0, 10) ?? null) : null;', '1.3'],
  ['E9 the exclusion landing back on the UTC day', RGA, 'const endParam = breakEndParam(untilIso);', 'const endParam = untilIso ? untilIso.slice(0, 10) : null;', '1.4'],
  ['E16 the break landing carrying nothing', RGA, 'redirect(`/auth/login?cooled=1${endParam ? `&until=${encodeURIComponent(endParam)}` : ""}`);', 'redirect("/auth/login?cooled=1");', '1.4'],
  ['E9 the session-ended door back on the UTC day', 'src/app/auth/session-ended/route.ts', 'const end = standing.permanent ? null : breakEndParam(standing.until);', 'const end = standing.permanent ? null : standing.until.slice(0, 10);', '1.4'],
  ['E9 the password door back on the UTC day', 'src/app/auth/login/actions.ts', '      const endParam = standing === "serving" ? breakEndParam(result.detail?.until) : null;\n      const until = endParam', '      const endParam = standing === "serving" ? (result.detail?.until?.slice(0, 10) ?? null) : null;\n      const until = endParam', '1.4'],
  ['E9 the sign-in panel printing the raw value', LOGIN, 'keepText(fill(t.auth.selfExclusionUntilBody, { date: breakEndText }), [breakEndText])', 'keepText(fill(t.auth.selfExclusionUntilBody, { date: sp.until ?? "" }), [sp.until ?? ""])', '1.5′'],
  ['E16 the break panel without its end', LOGIN, 'keepText(fill(t.rg.breakActive, { date: breakEndText }), [breakEndText])\n        : keepText(t.auth.coolingOffBody)', 'keepText(t.auth.coolingOffBody)\n        : keepText(t.auth.coolingOffBody)', '1.5′'],
  ['E17 renderFailure ignoring the reader\'s formatter', 'src/lib/failure-reasons.ts', '    until: failureUntil(d, when),', '    until: d.until ?? "—",', '1.6'],
  ['E17 the betting gate without the instant', 'src/lib/server/market-service.ts', 'reason: "cooling_off", detail: { until, untilAt: lockout.until! } };', 'reason: "cooling_off", detail: { until } };', '1.7'],
  ['E17 the deposit gate without the instant', 'src/lib/server/wallet-service.ts', 'reason: "self_excluded", detail: { until, untilAt: lockout.until! } };', 'reason: "self_excluded", detail: { until } };', '1.7'],
  ['E17 the old dial without its formatter', DIAL, ', (n) => formatTzs(n), when);', ', (n) => formatTzs(n));', '1.8'],
  ['E17 Up & Down without its formatter', 'src/components/updown/use-quick-bet.ts', 'reasonCopy, formatTzs, when);', 'reasonCopy, formatTzs);', '1.8'],
  ['E17 the deposit action without its formatter', 'src/app/wallet/deposit/actions.ts', 'return fail(errorCopy(t, result, (at) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale)));', 'return fail(errorCopy(t, result));', '1.8'],
  // §2 · whole sentences
  ['E20 a line may open on the dash again', KEEP, '  for (const m of text.matchAll(SPACED_DASH)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);\n', '', '2.3'],
  ['E20 the last word left alone again', KEEP, '  if (tail && tail.index > 0) ranges.push', '  if (false && tail && tail.index > 0) ranges.push', '2.4'],
  ['E57 the Chinese dash pair free to open a line', KEEP, '  for (const m of text.matchAll(CJK_DASH)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);\n', '', '2.5'],
  ['E20 the thin-upside notice drawn bare', 'src/components/markets/house-lean-warning.tsx', '{keepText(t.market.thinUpsideNote)}', '{t.market.thinUpsideNote}', '2.9'],
  ['E20 the RG confirm body drawn bare', 'src/components/rg/rg-confirm-submit.tsx', '<p>{keepText(body)}</p>', '<p>{body}</p>', '2.9'],
  // §3 · the limits page
  ['E56 the break callout back on the sm rung (11px)', RGP, '<Callout tone="neutral" size="md" glyph="pause">', '<Callout tone="neutral" glyph="pause">', '3.1'],
  ['E21 one form back on its legend\'s width', RGP, '<div style={{ width: periodFieldPx }}>\n            <FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend>', '<div>\n            <FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend>', '3.4'],
  ['E16 the confirm not reading the picked period', 'src/components/rg/rg-confirm-submit.tsx', '      onOpen={snapshot}\n', '', '3.5'],
  ['E16 Jizuie not naming its period', RGP, 'choice={{ field: "period", label: t.rg.exclusionPeriod, options: SELF_EXCLUSION_OPTIONS.map((o) => ({ value: o.id, label: o.label })) }}\n', '', '3.6'],
  ['E21 the reserve drawn as a text node (a drive\'s has-text meets it)', 'src/components/rg/rg-confirm-submit.tsx', '<span aria-hidden data-reserve={widthOf} className="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5 after:content-[attr(data-reserve)]">{icon}</span>', '<span aria-hidden className="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5">{icon}{widthOf}</span>', '3.7'],
  ['E21 the reserve dropped from the trigger', 'src/components/rg/rg-confirm-submit.tsx', '          {widthOf ? (', '          {false && widthOf ? (', '3.7'],
  ['E21 Jizuie\'s button on its own label\'s width again', RGP, '            widthOf={t.common.startABreak}\n', '', '3.7″'],
  ['E21 Pumzika\'s button on its own label\'s width again', RGP, '            widthOf={t.common.selfExclude}\n', '', '3.7″'],
  // §4 · the ✕
  ['E22 the confirm ✕ without its rise', MOD, 'className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"', 'className="-mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"', '4.1'],
  ['E22 the confirm ✕ growing the header row', MOD, 'className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"', 'className="-mt-1 -mr-1.5 lg:-mr-3 shrink-0"', '4.1′'],
  ['E22 the confirm ✕ back on Modal\'s corner', MOD, '      showClose={false}\n    >\n      <div className="mb-3 flex items-start gap-3">', '      showClose={!loading}\n    >\n      <div className="mb-3 flex items-start gap-3">', '4.1'],
  ['E54 the bet confirm ✕ back on the row top', BCM, 'className="mt-1 -mb-1 shrink-0 inline-flex', 'className="shrink-0 inline-flex', '4.2'],
  ['E54 the bet confirm ✕ growing a one-line row', BCM, 'className="mt-1 -mb-1 shrink-0 inline-flex', 'className="mt-1 shrink-0 inline-flex', '4.2'],
  // §5 · the bet confirm
  ['E18 the confirm cap ignoring the wrapper\'s 20px', BCM, 'max-h-[calc(100dvh-40px)]', 'max-h-[calc(100dvh-32px)]', '5.1'],
  ['E18 the confirm uncapped (taller than the phone)', BCM, ' flex flex-col max-h-[calc(100dvh-40px)]"', '"', '5.1'],
  ['E18 the answers back inside the scrolling body', BCM, '        {lean !== "fair" && !isOneSided && <HouseLeanWarning level={lean} />}\n      </div>\n', '        {lean !== "fair" && !isOneSided && <HouseLeanWarning level={lean} />}\n', '5.2'],
  ['E18 the footer no longer a fixed part of the column', BCM, '<div className="shrink-0 border-t border-border px-5 pt-3 lg:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]" data-testid="bet-confirm-actions">', '<div className="px-5 lg:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]" data-testid="bet-confirm-actions">', '5.2'],
  ['E53 "Possible winnings" back in the sentence face', BCM, '<p className="amount text-[18px] font-bold tabular-nums text-text leading-none">', '<p className="text-[18px] font-bold tabular-nums text-text leading-none">', '5.4'],
  ['E20 the confirm title drawn bare ("2026-27" alone)', BCM, '{keepText(marketTitle)}', '{marketTitle}', '5.5'],
  // §6 · the old dial
  ['E18 the scale back at 7.5 viewBox units (5.8px)', SCALE, 'const fontSize = DIAL_LABEL_PX / scale;', 'const fontSize = 7.5;', '6.1'],
  ['E18 figures under the resting thumb', SCALE, 'const clearOfThumb = fromCentre - h >= thumbClear;', 'const clearOfThumb = true;', '6.1'],
  ['E18 figures over their neighbours ("50K"/"100K")', SCALE, 'const clearOfNeighbour = lastX === null || Math.abs(x - lastX) >= h + lastHalf + gap;', 'const clearOfNeighbour = true;', '6.1'],
  ['E18 the figures back in the dim ink (1.4:1)', DIAL, 'fontSize={scaleMarks.fontSize}\n                      fill="var(--text-subtle)"', 'fontSize={scaleMarks.fontSize}\n                      fill="var(--text-muted)"\n                      opacity={0.55}', '6.2'],
  ['E18 "UAMUZI WAKO" back under the pill', DIAL, '<p className="-mt-1.5 mb-2 flex min-h-[44px] items-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle lg:-mt-3">', '<p className="mb-2 text-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle">', '6.4'],
  ['E53 "YOU ARE / PICKING" free to break', DIAL, 'eyebrow text-text-subtle mb-1.5 whitespace-nowrap">', 'eyebrow text-text-subtle mb-1">', '6.5'],
  ['E53 the Multiplier label off its box', DIAL, '<p className="flex min-h-[44px] items-center font-mono text-micro uppercase eyebrow text-text-subtle">', '<p className="font-mono text-micro uppercase eyebrow text-text-subtle">', '6.6'],
  ['E18 the caption squeezed beside the button', DIAL, '<div className="mt-4 flex flex-wrap items-center gap-3">', '<div className="mt-4 flex items-center gap-3">', '6.7'],
  // §7 · the refusal
  ['E52 the eyebrow repeating the title', DIAL, 'refusalRepeatsEyebrow ? undefined : t.common.couldNotPlaceBet}', 't.common.couldNotPlaceBet}', '7.2'],
  ['E52 the refusal not described', 'src/components/markets/operation-result-modal.tsx', '      describedBy={subtitle ? subtitleId : undefined}\n', '', '7.4'],
  ['E52 the eyebrow-less heading 4px under the crest', 'src/components/markets/operation-result-modal.tsx', 'className="p-6 lg:p-7 text-center [&>div+h2]:mt-4"', 'className="p-6 lg:p-7 text-center"', '7.3'],
  ['E52 the heading\'s class a template again (the dialog model reads none)', 'src/components/markets/operation-result-modal.tsx', '<h2 className="mt-1 font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]">', '<h2 className={`${eyebrow ? "mt-1" : "mt-4"} font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]`}>', '7.3'],
  // §8 · the deposit-paused notice
  ['E57 the Callout ignoring bodyWidth', 'src/components/ui/callout.tsx', 'bodyWidth === "measure" && "max-w-[42ch]"', '"max-w-[42ch]"', '8.1'],
  ['E57 the notice back on the 42ch measure', DEP, '            bodyWidth="full"\n', '', '8.2'],
  ['E57 the Withdraw door gone', DEP, '{journey ? t.journey.withdrawAction : t.common.withdraw}', '{null}', '8.2'],
  // §9 · nothing says bet now
  ['E19 the home lead back during a break', HERO, 'held || emptyWallet || onBreak ? null', 'held || emptyWallet ? null', '9.1'],
  ['E19 the add-funds call back during a break', HERO, 'const emptyWallet = !held && !onBreak && balance !== null && balance <= 0;', 'const emptyWallet = !held && balance !== null && balance <= 0;', '9.1'],
  ['E19 the home\'s break notice gone', HERO, ') : breakEnd ? (\n        <div className="kp-mine__held" role="status" data-testid="landing-mine-break">', ') : false ? (\n        <div className="kp-mine__held" role="status" data-testid="landing-mine-break">', '9.2'],
  ['E19 the hero formatting the end itself again (the call line R4-H also changes)', HERO, '            <SignedInAct t={t} mine={mine ?? null} journey={journey} />', '            <SignedInAct t={t} mine={mine ?? null} journey={journey} locale={locale} nowMs={nowMs} />', '9.3'],
  ['E19 the home\'s end said by another formatter', 'src/app/page.tsx', 'date: formatBreakEnd(Date.parse(breakEnd.until), nowMs, t.common.monthsShort, locale)', 'date: breakEnd.until.slice(0, 10)', '9.3'],
  ['E19 the home\'s break read failing closed', 'src/app/page.tsx', '          .then(breakStateOf)\n          .catch(() => null),', '          .then(breakStateOf),', '9.3'],
  ['E19 "Tazama maswali" back during a break', 'src/components/journey/tickets/tickets-view.tsx', 'action={breakNow ? null : firstTicket ? (', 'action={firstTicket ? (', '9.4'],
  ['E19 the classic Browse button back during a break', 'src/app/positions/page.tsx', 'browseLabel={cause === "no-rows" && !breakBody ? t.positions.browseMarkets : undefined}', 'browseLabel={cause === "no-rows" ? t.positions.browseMarkets : undefined}', '9.5'],
  ['E19 "place another prediction" back during a break', MKT, '{!breakEnd && <p className="mb-4 text-body-sm text-text-muted">{t.market.similarMarketsBody}</p>}', '<p className="mb-4 text-body-sm text-text-muted">{t.market.similarMarketsBody}</p>', '9.7'],
  // §10 · the journey Wallet and the hub
  ['E58 the Wallet silent about the break', 'src/components/layout/wallet-sheet.tsx', 'const breakText = !held && onBreak && breakEnd', 'const breakText = false && !held && onBreak && breakEnd', '10.1'],
  ['E58 the shell not handing the end over', 'src/components/layout/app-shell.tsx', 'onBreak={promoSuppressed} breakEnd={journeyBreak} proposalsState', 'onBreak={promoSuppressed} proposalsState', '10.2'],
  ['E58 Pumzika without its status', 'src/components/journey/account/hub-row.tsx', '{status && <span className="kp-hub__sub"', '{false && status && <span className="kp-hub__sub"', '10.3'],
  ['E58 the hub reader dropping the break', 'src/lib/server/hub-viewer.ts', 'breakEnd: lock.status === "fulfilled" && lock.value ? breakStateOf(lock.value) : null,', 'breakEnd: null,', '10.5'],
  // §11 · the auth pages
  ['E14 the rail back on the 1152px grid', 'src/components/auth/auth-shell.tsx', 'max-w-6xl grid-cols-1 lg:max-w-board lg:grid-cols-2 lg:px-6"', 'max-w-6xl grid-cols-1 lg:grid-cols-2"', '11.1'],
  ['E14 the wordmark twice at 1280', 'src/components/auth/auth-shell.tsx', 'hover:opacity-90 xl:hidden">', 'hover:opacity-90">', '11.2'],
  ['E11 the heading\'s last word alone again', 'src/components/auth/auth-panel.tsx', '{typeof title === "string" ? keepText(title) : title}', '{title}', '11.3'],
  ['E11 "6 / or 7" free to split', 'src/components/auth/login-identifier.tsx', 'keepText(t.common.phoneInputTitle, digitChoice(t.common.phoneInputTitle))', 'keepText(t.common.phoneInputTitle)', '11.4'],
  ['E12 the recovery link back to 10px mono capitals', LOGIN, 'className="-my-[11px] inline-flex min-h-[var(--tap-min)] items-center text-body-sm font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"', 'className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle hover:text-text"', '11.5'],
  ['E12 the recovery link\'s tap height growing the form', LOGIN, 'className="-my-[11px] inline-flex', 'className="inline-flex', '11.5'],
  ['E10 the panel glyph 2px under the title again', LOGIN, '<span className={"shrink-0 " + (errorPanel.tone === "success"', '<span className={"mt-0.5 shrink-0 " + (errorPanel.tone === "success"', '11.6'],
  // §12 · the resolution tile
  ['E23 "INAISHA" back on the result time', MKT, 'label={t.common.resolves} value={formatEatDateTime(Date.parse(m.resolutionAt)', 'label={t.market.resolves} value={formatEatDateTime(Date.parse(m.resolutionAt)', '12.1'],
  ['E20 "bado" alone in the pool tile', MKT, 'value={freshMarket ? keepText(t.market.noPoolYet) :', 'value={freshMarket ? t.market.noPoolYet :', '12.2'],
  // §13 · E35, executed
  ['E35 the duplicate-phone refusal removed', 'src/lib/server/auth-service.ts', '  if (await db.user.findByPhone(phone)) {\n    audit({ category: "AUTH", action: "register.duplicate_phone"', '  if (false && await db.user.findByPhone(phone)) {\n    audit({ category: "AUTH", action: "register.duplicate_phone"', '13.2'],
  ['E35 the duplicate-email refusal removed', 'src/lib/server/auth-service.ts', '  if (emailHolder) {\n    audit({ category: "SECURITY", action: "register.duplicate_email"', '  if (false && emailHolder) {\n    audit({ category: "SECURITY", action: "register.duplicate_email"', '13.3'],
  // §14 · gold is money
  ['GOLD the auth eyebrow back in gold', 'src/components/auth/auth-panel.tsx', '  brand: "text-brand-300",', '  brand: "text-gold-300",', '14.1'],
  ['GOLD the sign-in call to action back in gold', LOGIN, 'border border-brand-500/60 bg-brand-500/10 font-display font-bold text-[12.5px] text-brand-300 hover:bg-brand-500/20', 'border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20', '14.2'],
  ['GOLD the rate-limit sentence back in gold', 'src/app/auth/forgot-password/page.tsx', 'bg-warning-bg px-3.5 py-3 text-[13px] text-text-muted">', 'bg-warning-bg px-3.5 py-3 text-[13px] text-gold-300">', '14.2'],
  ['GOLD the reset link\'s lifetime back in gold', 'src/app/auth/reset-password/page.tsx', 'gap-1.5 text-body-sm text-text-muted">', 'gap-1.5 text-body-sm text-gold-300">', '14.2'],
  ['GOLD a gilt bonus card back', 'src/app/auth/register/page.tsx', '{referral && (\n            <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">', '{referral && (\n            <div className="overflow-hidden rounded-xl border border-gold-500/40 bg-gold-500/10">', '14.3'],
  ['GOLD the paused-deposit tile back in the gilt warning tone', DEP, '          <Callout\n            tone="neutral"\n            layout="stack"\n            glyph="lock"\n            role="status"\n            titleAs="h2"\n            title={t.wallet.depositPausedTitle}\n            bodyWidth="full"', '          <Callout\n            tone="warning"\n            layout="stack"\n            glyph="lock"\n            role="status"\n            titleAs="h2"\n            title={t.wallet.depositPausedTitle}\n            bodyWidth="full"', '14.4'],
  ['E32 the code page back on its hand-rolled stars', 'src/app/auth/otp/page.tsx', 'const masked = phone ? maskPhone(phone) : "+255••••";', 'const masked = phone ? phone.slice(0, 4) + "*****" + phone.slice(-2) : "+255*****";', '14.5'],
  // §15 · the bell
  ['E9 the bell\'s break notice back on the UTC day', 'src/lib/server/notification-service.ts', 'bodySw: `Kuweka dau na amana kumesimamishwa hadi ${end.sw}.`', 'bodySw: `Kuweka dau na amana kumesimamishwa hadi ${opts.until.slice(0, 10)}.`', '15.1'],
  ['E9 the bell\'s exclusion notice back on the UTC day', 'src/lib/server/notification-service.ts', 'bodyZh: `您的账户已停止投注与充值，直至 ${end.zh}。`', 'bodyZh: `您的账户已停止投注与充值，直至 ${opts.until.slice(0, 10)}。`', '15.2'],
  ['E9 the bell\'s ends in English months for every reader', 'src/lib/server/notification-service.ts', 'sw: formatBreakEnd(at, now, dict.sw.common.monthsShort, "sw"),', 'sw: formatBreakEnd(at, now, dict.en.common.monthsShort, "en"),', '15.1'],
];

const only = process.argv[2] ? new Set(process.argv.slice(2)) : null;
let caught = 0, missed = 0, restored = 0, ran = 0;
const rows = [];
for (const [name, file, from, to, expect] of M) {
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
  let mutated = lf.replace(from, () => to);
  if (crlf) mutated = mutated.replace(/\n/g, '\r\n');
  let out = '', code = 0;
  try {
    fs.writeFileSync(p, mutated);
    const r = spawnSync('npx', ['tsx', 'scripts/visual-pass-r4i.test.mts'], { cwd: ROOT, encoding: 'utf8', shell: true });
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
  rows.push(`${hit ? 'CAUGHT' : 'MISSED'} ${expect.padEnd(5)} ${name} — exit ${code}, failed [${failed.join(' ')}], restored ${back ? 'byte-identical' : 'DIFFERENT'}`);
}
console.log(rows.join('\n'));
console.log(`\nmutations: ${ran} planted, ${caught} caught, ${missed} missed · restored byte-identical: ${restored}/${ran}`);
process.exit(missed ? 1 : 0);
