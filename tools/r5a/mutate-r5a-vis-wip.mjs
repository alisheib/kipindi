// R5-A MUTATION PROOF — plant each defect on disk, run test:visual-pass-r5a, require it to FAIL on the named check, restore
// the file byte for byte (sha-256 before == after). Run from the worktree: node <this file>   (cwd F:/kipindi-r5a)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = "F:/kipindi-wip";
process.chdir(ROOT);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const TSX = "node_modules/tsx/dist/cli.mjs";
const run = () => spawnSync(process.execPath, [TSX, "scripts/visual-pass-r5a.test.mts"], { encoding: "utf8", maxBuffer: 64 << 20 });

/** [name, file, find, replace, the check that must fail] — `find` must occur in the file exactly as written. */
const PLANTS = [
  ["F2 · the card centred on the column again", "src/app/globals.css", "  .kp-hero__card { margin-top: 3px; }", "  .kp-hero__card { margin-top: 3px; }\r\n  .kp-hero__intro { align-self: end; }", "1.1"],
  ["F2 · the unhinted 4px", "src/app/globals.css", "  .kp-hero__card { margin-top: 3px; }", "  .kp-hero__card { margin-top: 4px; }", "1.2"],
  ["F12 · the spotlight's capitalised label back", "src/app/results/page.tsx", "{formatNumber(m.predictorCount)} {m.predictorCount === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}", "{m.predictorCount} {t.market.predictors}", "2.1"],
  ["F12 · the card's runtime toLocaleString back", "src/components/markets/market-card.tsx", "<b>{formatNumber(predictors)}</b>", "<b>{predictors.toLocaleString()}</b>", "2.3"],
  ["F12 · the leaderboard lower-cases a label again", "src/app/leaderboard/page.tsx", "{formatNumber(r.resolved)} {t.results.resolved}", "{r.resolved} {t.leaderboard.tableResolved.toLowerCase()}", "2.4"],
  ["F16 · the legal header passes the bare title", "src/app/legal/_components.tsx", "title={legalTitle(title)}", "title={title}", "3.2"],
  ["F16 · the pair cap lifted (\"ya NDIO/HAPANA\" bound)", "src/app/legal/_components.tsx", "const KEEP_PAIR_MAX = 10;", "const KEEP_PAIR_MAX = 20;", "3.3"],
  ["F15 · the dictionary's chip back", "src/components/markets/discovery-bar.tsx", '"10k": poolFloor("10k"),', '"10k": t.market.pool10k,', "4.1"],
  ["F17 · the KYC row's old key", "src/components/journey/account/hub-rows.ts", 'label: "profile.kycIdentityVerification", sub: "profile.verifyIdSub"', 'label: "common.verifyId", sub: "profile.verifyIdSub"', "5.1"], // R6-C's key (merged 2026-10-09)
  ["F17 · the journey menu's page names dropped", "src/components/layout/avatar-menu.tsx", '"/leaderboard": t.leaderboard.title,', "", "5.3"], // one entry a line since R6-C (merged 2026-10-09)
  ["F17 · the journey footer's proposals words back", "src/components/layout/public-footer.tsx", "{journeyShown ? t.proposals.title : t.footer.proposeGetPaid}", "{t.footer.proposeGetPaid}", "5.4"],
  ["F17 · /live's eyebrow back to \"Hai\"", "src/app/live/page.tsx", 'eyebrow font-bold text-text">{t.common.live}</p>', 'eyebrow font-bold text-text">{t.home.liveSection}</p>', "5.5"],
  ["F18 · a threshold under the English name", "src/app/globals.css", "@container kp-gbt (min-width: 168px)", "@container kp-gbt (min-width: 150px)", "6.2"],
  ["F18 · the journey footer's sentence plain", "src/components/layout/public-footer.tsx", "{journeyShown ? keepRegulator(t.footer.licensedByGbt) : t.footer.licensedByGbt}", "{t.footer.licensedByGbt}", "6.4"],
  ["F18 · the hero's trust row plain", "src/components/home/hero-intro.tsx", "<span>{keepRegulator(t.footer.licensedByGbt)}</span>", "<span>{t.footer.licensedByGbt}</span>", "6.5"],
  ["F19 · the price caption's take-back dropped", "src/app/globals.css", ".mcardp-pctcap::after,\r\n", "", "7.1"],
  ["F19 · the spotlight flag's text span dropped", "src/app/results/page.tsx", '<span className="kp-track-end kp-track-end--16">{t.results.notableResult}</span>', "{t.results.notableResult}", "7.2"],
  ["F20 · .kp-modal-title on the wrong point (0.5em)", "src/app/globals.css", ".kp-modal-title { margin-top: calc(var(--sp-10) - var(--sp-6) - 0.6em);", ".kp-modal-title { margin-top: calc(var(--sp-10) - var(--sp-6) - 0.5em);", "8.2"],
  ["F20 · ConfirmModal's ✕ back on the medallion", "src/components/ui/modal.tsx", 'className="mt-[2.8px] -mb-[12.8px] -mr-1.5 lg:-mr-3 shrink-0"', 'className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"', "8.3"],
  ["F20 · the sell confirm's ✕ back in the corner", "src/components/markets/sell-confirm-modal.tsx", "      showClose={false}\r\n    >\r\n      <div className=\"mb-4 flex items-start gap-3\">", "    >\r\n      <div className=\"mb-4 flex items-start gap-3\">", "8.4"],
  ["F20 · the bet confirm's ✕ 24px in again", "src/components/markets/bet-confirm-modal.tsx", 'className="mt-1 -mb-1 -mr-1.5 lg:-mr-3 shrink-0" />', 'className="mt-1 -mb-1 shrink-0" />', "8.5"],
  ["F20 · the filter sheet's ✕ back at -mt-1", "src/components/markets/filter-sheet.tsx", 'className="-mr-1 -mt-[14.4px] mb-[10.4px] shrink-0"', 'className="-mr-1 -mt-1 shrink-0"', "8.6"],
  // The follow-up (integrator's review): one CloseX, no ✕ drawn by hand on a dialog, one in-flight rule.
  ["F20+ · the bet confirm's hand-drawn ✕ back (\"Ghairi\", straight to onCancel)", "src/components/markets/bet-confirm-modal.tsx",
    '<CloseX withheld={pending} onClick={() => { if (!pending) onCancel(); }} label={t.common.close} className="mt-1 -mb-1 -mr-1.5 lg:-mr-3 shrink-0" />',
    '<button type="button" onClick={onCancel} aria-label={t.common.cancel} className="mt-1 -mb-1 -mr-1.5 lg:-mr-3 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"><I.x s={16} /></button>', "8.10"],
  ["F20+ · a ✕ drawn by hand in the share dialog", "src/components/markets/share-button.tsx",
    '<p className="kp-modal-title mb-2 font-display text-[14px] font-semibold text-text">{t.dialog.shareMarket}</p>',
    '<p className="kp-modal-title mb-2 font-display text-[14px] font-semibold text-text">{t.dialog.shareMarket}</p><button type="button" aria-label={t.common.close} onClick={() => setOpen(false)}><I.x s={16} /></button>', "8.10"],
  ["F20+ · the filter sheet's ✕ back at the screen's edge (-mr-3)", "src/components/markets/filter-sheet.tsx", 'className="-mr-1 -mt-[14.4px] mb-[10.4px] shrink-0"', 'className="-mr-3 -mt-[14.4px] mb-[10.4px] shrink-0"', "8.6″"],
  ["F20+ · CloseX withheld still drawn", "src/components/ui/modal.tsx", 'transition-colors${withheld ? " invisible" : ""}`}', "transition-colors`}", "8.12"],
  ["F20+ · the sell confirm's ✕ drawn but dead while selling", "src/components/markets/sell-confirm-modal.tsx", "<CloseX withheld={pending} onClick=", "<CloseX onClick=", "8.13"],
  ["F20+ · ConfirmModal's ✕ taken out of its row while loading", "src/components/ui/modal.tsx",
    '<CloseX withheld={loading} onClick={onClose} label={t.common.close} className="mt-[2.8px] -mb-[12.8px] -mr-1.5 lg:-mr-3 shrink-0" />',
    '{!loading && <CloseX onClick={onClose} label={t.common.close} className="mt-[2.8px] -mb-[12.8px] -mr-1.5 lg:-mr-3 shrink-0" />}', "8.13"],
  ["F20+ · the objection dialog's corner ✕ drawn while filing", "src/components/markets/objection-dialog.tsx", "        showClose={!pending}\r\n", "", "8.13"],
  ["F20+ · the hold dialog's corner ✕ drawn while holding (admin)", "src/app/admin/settlement/hold-button.tsx", "        showClose={!pending}\r\n", "", "8.13"],
  ["F20+ · the arm confirm open across its request without `loading` (admin)", "src/app/admin/updown/proposals/proposal-actions.tsx", "mid-request and Arm could fire twice. */\r\n        loading={pending}\r\n", "mid-request and Arm could fire twice. */\r\n", "8.13"],
  ["F20 · the channels title centred on the box", "src/components/social/channels-panel.tsx", '<div className="flex items-start gap-3">', '<div className="flex items-center gap-3">', "8.7"],
  ["F20 · the install card's ✕ on the row's top", "src/components/pwa/install-invite.tsx", 'className="-mt-[13.6px] shrink-0 inline-flex h-[44px] w-[44px]', 'className="shrink-0 inline-flex h-[44px] w-[44px]', "8.8"],
  ["F20 · the reality check's row at the padding", "src/components/rg/reality-check.tsx", '<div className="-mt-[3.6px] lg:-mt-[11.6px] flex items-start gap-2.5 pr-8">', '<div className="flex items-start gap-2.5 pr-8">', "8.9"],
  ["F20 · the toast's ✕ 8px down again", "src/components/ui/toast.tsx", 'className="absolute right-1.5 top-0 inline-flex h-8 w-8', 'className="absolute right-1.5 top-1.5 inline-flex h-8 w-8', "8.11"],
  ["F5 · a shot without the park", "scripts/qa-journey-shell.mjs", "  await parkPointer(page);\r\n  await settle(page, PARK_SETTLE_MS);", "  await settle(page, 150);", "9.1"],
  ["§A5 · /results' bar over an empty archive", "src/app/results/page.tsx", "{archiveRows.length > 0 && <ResultsBar state={state} counts={counts} resultCount={totalCount} t={t} />}", "<ResultsBar state={state} counts={counts} resultCount={totalCount} t={t} />", "10.1"],
  ["CHECK · /markets' wrapper gives nothing back", "src/app/globals.css", ".kp-markets-search { margin-bottom: -1px; }", ".kp-markets-search { margin-bottom: 0px; }", "11.1"],
  ["CHECK · Matokeo under the circled check again", "src/components/journey/account/hub-rows.ts", 'label: "common.results", glyph: "resolved" };', 'label: "common.results", glyph: "checkCircle" };', "11.2"],
  ["CHECK · the chart's deadline never cleared", "src/components/charts/terminal-chart.tsx", "        clearTimeout(deadline);\r\n", "", "11.3"],
  ["CHECK · the grid card's pool word dropped", "src/components/markets/market-card.tsx", ': <><span className="sr-only">{t.common.pool}{" "}</span>{formatTzs(volume)}</>}', ": formatTzs(volume)}", "11.4"],
];

const base = run();
const baseFails = (base.stdout.match(/^\s*FAIL /gm) ?? []).length;
console.log(`baseline: exit ${base.status}, ${baseFails} FAIL line(s)`);
if (base.status !== 0) { console.log(base.stdout.slice(-3000)); process.exit(2); }

let good = 0, bad = 0;
for (const [name, file, find, replace, check] of PLANTS) {
  const before = readFileSync(file);
  const hash = sha(before);
  const src = before.toString("utf8");
  const hits = src.split(find).length - 1;
  if (hits !== 1) { console.log(`  ✗ ${name}: the anchor occurs ${hits} times in ${file}`); bad++; continue; }
  writeFileSync(file, src.replace(find, replace));
  let r;
  try { r = run(); } finally { writeFileSync(file, before); }
  const restored = sha(readFileSync(file)) === hash;
  const caught = r.status !== 0 && new RegExp(`^\\s*FAIL ${check.replace(".", "\\.")}[ ′″‴⁗·]`, "m").test(r.stdout);
  const others = (r.stdout.match(/^\s*FAIL ([0-9.′″‴⁗]+)/gm) ?? []).map((s) => s.trim().slice(5));
  if (caught && restored) { good++; console.log(`  ✓ ${name} → FAIL ${check} (failed: ${others.join(", ")}) · restored ${hash.slice(0, 12)}`); }
  else { bad++; console.log(`  ✗ ${name}: caught ${caught} (failed: ${others.join(", ") || "none"}, exit ${r.status}) · restored ${restored}`); }
}
const after = run();
console.log(`\n${good}/${PLANTS.length} plants caught on their named check, every file restored byte-identical; final run exit ${after.status}`);
process.exit(bad === 0 && after.status === 0 ? 0 : 1);
