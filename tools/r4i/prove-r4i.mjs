// Proves test:visual-pass-r4i catches each real regression on ITS OWN assertion: plant the defect into the real source,
// run the suite, require exit ≠ 0 with a FAIL line starting with the expected label, restore, and finally require every
// touched file byte-identical and the suite green again. Run from F:\kipindi-r4i.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
process.chdir("F:/kipindi-r4i");

const M = [
  // §1 — the end carried and formatted
  ["the exclusion's landing cuts the end to its UTC day", "src/app/profile/responsible-gambling/actions.ts",
    "const endParam = breakEndParam(untilIso);", "const endParam = untilIso ? untilIso.slice(0, 10) : null;", "1.4 ·"],
  ["the break's landing carries nothing", "src/app/profile/responsible-gambling/actions.ts",
    "redirect(`/auth/login?cooled=1${endParam ? `&until=${encodeURIComponent(endParam)}` : \"\"}`);", "redirect(\"/auth/login?cooled=1\");", "1.4 ·"],
  ["accountRefusalPath back to the UTC day", "src/lib/auth-landing.ts",
    "const end = detail.standing === \"serving\" ? breakEndParam(detail.until) : null;", "const end = detail.standing === \"serving\" ? (detail.until ?? \"\").slice(0, 10) || null : null;", "1.3 ·"],
  ["the URL reader believes any parseable text", "src/lib/break-end.ts",
    "  if (typeof s !== \"string\") return null;", "  if (typeof s !== \"string\") return null;\n  if (Number.isFinite(Date.parse(s))) return { atMs: Date.parse(s), withTime: true };", "1.2′"],
  ["the break panel says only \"when the break ends\"", "src/app/auth/login/page.tsx",
    "        ? keepText(fill(t.rg.breakActive, { date: breakEndText }), [breakEndText])", "        ? keepText(t.auth.coolingOffBody)", "1.5′"],
  ["the betting gate drops the instant", "src/lib/server/market-service.ts",
    "reason: \"cooling_off\", detail: { until, untilAt: lockout.until! } };", "reason: \"cooling_off\", detail: { until } };", "1.7 ·"],
  ["the renderer ignores the reader's formatter", "src/lib/failure-reasons.ts",
    "    until: failureUntil(d, when),", "    until: d.until ?? \"—\",", "1.6 ·"],
  ["the dial drops its formatter", "src/components/markets/conviction-dial.tsx",
    "t.common.couldNotPlace, (n) => formatTzs(n), when);", "t.common.couldNotPlace, (n) => formatTzs(n));", "1.8 ·"],
  // §2 — whole sentences
  ["the last two words no longer kept", "src/components/ui/keep-run.tsx",
    "  if (tail && tail.index > 0) ranges.push([tail.index, tail.index + tail[0].trimEnd().length]);", "  void tail;", "2.4 ·"],
  ["the Chinese dash no longer held", "src/components/ui/keep-run.tsx",
    "  for (const m of text.matchAll(CJK_DASH)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);", "  void CJK_DASH;", "2.5 ·"],
  ["the deposit notice's sentence drawn plain", "src/app/wallet/deposit/page.tsx",
    "{keepText(fill(breakIsExclusion ? t.rg.exclusionActive : t.rg.breakActive, { date: breakEndText ?? \"\" }), breakEndText ? [breakEndText] : [])}",
    "{fill(breakIsExclusion ? t.rg.exclusionActive : t.rg.breakActive, { date: breakEndText ?? \"\" })}", "2.9 ·"],
  ["the RG confirm's body drawn plain", "src/components/rg/rg-confirm-submit.tsx",
    "{typeof body === \"string\" ? <p>{keepText(body)}</p> : body}", "{typeof body === \"string\" ? <p>{body}</p> : body}", "2.9 ·"],
  // §3 — the limits page
  ["the break callout back on the 11px rung", "src/app/profile/responsible-gambling/page.tsx",
    "<Callout tone=\"neutral\" size=\"md\" glyph=\"pause\">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>", "<Callout tone=\"neutral\" glyph=\"pause\">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>", "3.1 ·"],
  ["the break's field back on its legend's width", "src/app/profile/responsible-gambling/page.tsx",
    "<div style={{ width: periodFieldPx }}>\n            <FieldLegend className=\"block mb-1.5\">{t.rg.breakLength}</FieldLegend>",
    "<div>\n            <FieldLegend className=\"block mb-1.5\">{t.rg.breakLength}</FieldLegend>", "3.4 ·"],
  ["the confirm no longer reads the period picked", "src/components/rg/rg-confirm-submit.tsx",
    "      onOpen={snapshot}\n", "", "3.5 ·"],
  // §4 — the ✕
  ["ConfirmModal's ✕ without its 4px rise", "src/components/ui/modal.tsx",
    "className=\"-mt-1 -mr-1.5 lg:-mr-3 shrink-0\"", "className=\"-mr-1.5 lg:-mr-3 shrink-0\"", "4.1 ·"],
  ["the bet confirm's ✕ back on the row's top", "src/components/markets/bet-confirm-modal.tsx",
    "className=\"mt-1 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle", "className=\"shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle", "4.2 ·"],
  // §5 — the bet confirm
  ["the bet confirm grows past the screen", "src/components/markets/bet-confirm-modal.tsx",
    "panelClassName=\"overflow-hidden !p-0 flex flex-col max-h-[calc(100dvh-32px)]\"", "panelClassName=\"overflow-hidden !p-0\"", "5.1 ·"],
  ["the estimate back in the sentence face", "src/components/markets/bet-confirm-modal.tsx",
    "<p className=\"amount text-[18px] font-bold tabular-nums text-text leading-none\">\n              TZS {formatNumber(Math.round",
    "<p className=\"text-[18px] font-bold tabular-nums text-text leading-none\">\n              TZS {formatNumber(Math.round", "5.4 ·"],
  // §6 — the dial
  ["the scale labels every detent again", "src/components/markets/dial-scale.ts",
    "      const label = tzs > baseStake && clearOfThumb && insideView && clearOfNeighbour ? text : null;",
    "      const label = tzs > baseStake && !isEdge ? text : null; void clearOfThumb; void insideView; void clearOfNeighbour;", "6.1 ·"],
  ["the scale back at 55% muted ink", "src/components/markets/conviction-dial.tsx",
    "fill=\"var(--text-subtle)\"\n                      letterSpacing=\"0.04em\"", "fill=\"var(--text-muted)\"\n                      opacity={0.55}\n                      letterSpacing=\"0.04em\"", "6.2 ·"],
  ["the pick label centred under the pill again", "src/components/markets/conviction-dial.tsx",
    "<p className=\"-mt-1.5 mb-2 flex min-h-[44px] items-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle lg:-mt-3\">",
    "<p className=\"mb-2 text-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle\">", "6.4 ·"],
  ["the readout centred again (YOU ARE / PICKING)", "src/components/markets/conviction-dial.tsx",
    "<div className=\"grid grid-cols-[1fr_auto] gap-2 sm:gap-3 mt-5 items-start\">", "<div className=\"grid grid-cols-[1fr_auto] gap-2 sm:gap-3 mt-5 items-center\">", "6.5 ·"],
  ["the Multiplier label off its box's centre", "src/components/markets/conviction-dial.tsx",
    "<p className=\"flex min-h-[44px] items-center font-mono text-micro uppercase eyebrow text-text-subtle\">", "<p className=\"font-mono text-micro uppercase eyebrow text-text-subtle\">", "6.6 ·"],
  ["the caption squeezed beside the button again", "src/components/markets/conviction-dial.tsx",
    "<div className=\"mt-4 flex flex-wrap items-center gap-3\">", "<div className=\"mt-4 flex items-center gap-3\">", "6.7 ·"],
  // §7 — the refusal
  ["the refusal's eyebrow repeats its title", "src/components/markets/conviction-dial.tsx",
    "t.common.betPlacedEyebrow : refusalRepeatsEyebrow ? undefined : t.common.couldNotPlaceBet}", "t.common.betPlacedEyebrow : t.common.couldNotPlaceBet}", "7.2 ·"],
  ["the refusal's reason not described", "src/components/markets/operation-result-modal.tsx",
    "      describedBy={subtitle ? subtitleId : undefined}\n", "", "7.4 ·"],
  // §8 — the deposit notice
  ["the stack body held to 42ch whatever is asked", "src/components/ui/callout.tsx",
    "bodyWidth === \"measure\" && \"max-w-[42ch]\"", "\"max-w-[42ch]\"", "8.1 ·"],
  ["the notice without the way to Withdraw", "src/app/wallet/deposit/page.tsx",
    "action={breakIsExclusion ? undefined : (", "action={false ? undefined : undefined && (", "8.2 ·"],
  // §9 — nothing says bet now
  ["the home's lead back during a break", "src/components/home/landing-hero.tsx",
    "held || emptyWallet || onBreak ? null : <p className=\"kp-mine__lead\">{t.home.picksNone}</p>", "held || emptyWallet ? null : <p className=\"kp-mine__lead\">{t.home.picksNone}</p>", "9.1 ·"],
  ["Tazama maswali back during a break", "src/components/journey/tickets/tickets-view.tsx",
    "action={breakNow ? null : firstTicket ? (", "action={firstTicket ? (", "9.4 ·"],
  ["the classic Browse button back during a break", "src/app/positions/page.tsx",
    "browseLabel={cause === \"no-rows\" && !breakBody ? t.positions.browseMarkets : undefined}", "browseLabel={cause === \"no-rows\" ? t.positions.browseMarkets : undefined}", "9.5 ·"],
  ["\"place another prediction\" said during a break", "src/app/markets/[id]/page.tsx",
    "{!breakEnd && <p className=\"mb-4 text-body-sm text-text-muted\">{t.market.similarMarketsBody}</p>}", "<p className=\"mb-4 text-body-sm text-text-muted\">{t.market.similarMarketsBody}</p>", "9.7 ·"],
  // §10 — the journey Wallet and the hub
  ["the Wallet withholds Deposit without a word", "src/components/layout/wallet-sheet.tsx",
    "  const breakText = !held && onBreak && breakEnd", "  const breakText = false && breakEnd", "10.1 ·"],
  ["the shell no longer hands the end on", "src/components/layout/app-shell.tsx",
    "onBreak={promoSuppressed} breakEnd={journeyBreak} proposalsState", "onBreak={promoSuppressed} proposalsState", "10.2 ·"],
  ["Pumzika states nothing", "src/components/journey/account/hub-row.tsx",
    "{status && <span className=\"kp-hub__sub\"", "{false && status && <span className=\"kp-hub__sub\"", "10.3 ·"],
  ["the hub never reads the break", "src/lib/server/hub-viewer.ts",
    "    breakEnd: lock.status === \"fulfilled\" && lock.value ? breakStateOf(lock.value) : null,", "    breakEnd: null,", "10.5 ·"],
  // §11 — the auth pages
  ["the auth grid back to 1152 centred", "src/components/auth/auth-shell.tsx",
    "max-w-6xl grid-cols-1 lg:max-w-board lg:grid-cols-2 lg:px-6", "max-w-6xl grid-cols-1 lg:grid-cols-2", "11.1 ·"],
  ["the wordmark twice at 1280", "src/components/auth/auth-shell.tsx",
    "hover:opacity-90 xl:hidden\">", "hover:opacity-90\">", "11.2 ·"],
  ["\"Karibu kwenye / 50pick\" again", "src/components/auth/auth-panel.tsx",
    "{typeof title === \"string\" ? keepText(title) : title}", "{title}", "11.3 ·"],
  ["the recovery link back to a 10px microlabel", "src/app/auth/login/page.tsx",
    "className=\"inline-flex min-h-[var(--tap-min)] items-center text-body-sm font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline\"",
    "className=\"font-mono text-micro uppercase tracking-[0.14em] text-text-subtle hover:text-text\"", "11.5 ·"],
  ["the panel glyph 2px under the title again", "src/app/auth/login/page.tsx",
    "<span className={\"shrink-0 \" + (errorPanel.tone === \"success\"", "<span className={\"mt-0.5 shrink-0 \" + (errorPanel.tone === \"success\"", "11.6 ·"],
  // §12 — the resolution tile
  ["the tile says \"INAISHA\" again", "src/app/markets/[id]/page.tsx",
    "label={t.common.resolves} value={formatEatDateTime(Date.parse(m.resolutionAt)", "label={t.market.resolves} value={formatEatDateTime(Date.parse(m.resolutionAt)", "12.1 ·"],
  // §14 — gold is money
  ["the auth eyebrow gold again", "src/components/auth/auth-panel.tsx", "  brand: \"text-brand-300\",", "  brand: \"text-gold-300\",", "14.1 ·"],
  ["the sign-in CTA gilt again", "src/app/auth/login/page.tsx", "border border-brand-500/60 bg-brand-500/10 font-display font-bold text-[12.5px] text-brand-300 hover:bg-brand-500/20", "border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20", "14.2 ·"],
  ["the invite card gilt again", "src/app/auth/register/page.tsx", "<IconPlate size={40} className=\"bg-brand-500/15 text-brand-300\">", "<IconPlate size={40} className=\"bg-gold-500/15 text-gold-300\">", "14.3 ·"],
  ["the paused-deposit tile struck in gilt again", "src/app/wallet/deposit/page.tsx", "            tone=\"neutral\"\n            layout=\"stack\"\n            glyph=\"lock\"\n            role=\"status\"\n            titleAs=\"h2\"\n            title={t.wallet.depositPausedTitle}\n            bodyWidth=\"full\"", "            tone=\"warning\"\n            layout=\"stack\"\n            glyph=\"lock\"\n            role=\"status\"\n            titleAs=\"h2\"\n            title={t.wallet.depositPausedTitle}\n            bodyWidth=\"full\"", "14.4 ·"],
  ["the code page's star mask again", "src/app/auth/otp/page.tsx", "  const masked = phone ? maskPhone(phone) : \"+255••••\";", "  const masked = phone ? phone.slice(0, 4) + \"*****\" + phone.slice(-2) : \"+255*****\";", "14.5 ·"],
  // §13 — the E35 proof can fail
  ["sign-up stops checking the phone", "src/lib/server/auth-service.ts",
    "  if (await db.user.findByPhone(phone)) {\n    audit({ category: \"AUTH\", action: \"register.duplicate_phone\"",
    "  if (false && await db.user.findByPhone(phone)) {\n    audit({ category: \"AUTH\", action: \"register.duplicate_phone\"", "13.2 ·"],
];

const run = () => {
  try { execFileSync("npx", ["tsx", "scripts/visual-pass-r4i.test.mts"], { encoding: "utf8", stdio: "pipe", shell: true }); return { code: 0, out: "" }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};
const base = run();
if (base.code !== 0) { console.error("REFUSING: the suite is red on the untouched tree"); console.error(base.out.slice(-2000)); process.exit(1); }
const originals = new Map();
for (const [, f] of M) if (!originals.has(f)) originals.set(f, readFileSync(f, "utf8"));
let caught = 0; const problems = [];
for (const [i, [name, file, from, to, expect]] of M.entries()) {
  const orig = originals.get(file);
  const crlf = orig.includes("\r\n");
  const F = crlf ? from.replace(/\n/g, "\r\n") : from, T = crlf ? to.replace(/\n/g, "\r\n") : to;
  const n = orig.split(F).length - 1;
  if (n !== 1) { problems.push(`${name}: anchor found ${n}×`); console.log(`  ${i + 1}. ANCHOR ${n}×  ${name}`); continue; }
  writeFileSync(file, orig.replace(F, () => T), "utf8");
  const r = run();
  writeFileSync(file, orig, "utf8");
  const failLines = r.out.split("\n").filter((l) => l.includes("FAIL "));
  if (r.code === 0) { problems.push(`${name}: stayed GREEN`); console.log(`  ${i + 1}. NOT CAUGHT  ${name}`); }
  else if (!failLines.some((l) => l.includes(`FAIL ${expect}`))) { problems.push(`${name}: red, not on ${expect} — ${failLines.slice(0, 2).join(" | ")}`); console.log(`  ${i + 1}. WRONG REASON ${name} — ${failLines.slice(0, 2).map((l) => l.trim().slice(0, 90)).join(" | ")}`); }
  else { caught++; console.log(`  ${i + 1}. caught  ${name}  →  ${failLines.map((l) => l.trim().slice(5, 50)).join(" + ")}`); }
}
const dirty = [...originals].filter(([f, o]) => readFileSync(f, "utf8") !== o).map(([f]) => f);
const after = run();
console.log(`\n${caught}/${M.length} caught · restored byte-identical: ${dirty.length === 0} · green after: ${after.code === 0}`);
for (const p of problems) console.log(`  · ${p}`);
process.exit(caught === M.length && dirty.length === 0 && after.code === 0 ? 0 : 1);
