// R6-C · THE MUTATION PROOF for test:visual-pass-r6c. Each plant writes one defect to disk, runs the suite, requires it to
// fail ON THE NAMED CHECK, then restores the file and proves it byte-identical (sha-256). A plant that does not apply
// (its text not found exactly once) is a failure of the proof, never skipped. Run from anywhere:
//   node mutation-r6c.mjs [plant-number ...]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/kipindi-vis"; // the merged tree (2026-10-09)
const sha = (s) => createHash("sha256").update(s).digest("hex");
const CR = "\r\n";

/** [what the defect is, file, exact text, replacement, the check id(s) of which at least one must fail] */
const PLANTS = [
  // §1 C12
  ["the bet stake mono but not `.amount` again (it splits \"TZS\" / \"1,000\")", "src/components/markets/bet-confirm-modal.tsx",
    '<p className="amount font-bold text-[22px] leading-none text-text">TZS {formatNumber(stake)}</p>', '<p className="font-mono font-bold text-[22px] tabular-nums leading-none text-text">TZS {formatNumber(stake)}</p>', ["1.1"]],
  ["the bet confirm's side | stake row that cannot wrap", "src/components/markets/bet-confirm-modal.tsx",
    '<div className="flex flex-wrap items-baseline justify-between gap-y-2">', '<div className="flex items-baseline justify-between">', ["1.2"]],
  ["the side word without its 16px (the two values may touch)", "src/components/markets/bet-confirm-modal.tsx",
    '<p className="pr-3 font-display font-bold text-[26px] leading-none"', '<p className="font-display font-bold text-[26px] leading-none"', ["1.3"]],
  // §2 C7
  ["the board card's range line one whole `.amount` again", "src/components/updown/updown-stake-controls.tsx",
    '<p className={cn("mt-1 text-micro", customInvalid ? "text-danger-fg" : "text-text-subtle")}>', '<p className={cn("mt-1 text-micro amount", customInvalid ? "text-danger-fg" : "text-text-subtle")}>', ["2.1"]],
  ["the round page's range line one whole `.amount` again", "src/components/updown/round-stake-panel.tsx",
    '<p className={cn("mt-1 text-micro", customInvalid ? "text-danger-fg" : "text-text-subtle")}>', '<p className={cn("mt-1 text-micro amount", customInvalid ? "text-danger-fg" : "text-text-subtle")}>', ["2.1′"]],
  ["a new sentence in an `.amount` (the signed-out range line)", "src/components/updown/round-stake-panel.tsx",
    '<p className="mt-2 amount text-micro text-text-faint">{formatTzs(minStake)} – {formatTzs(maxStake)}</p>', '<p className="mt-2 amount text-micro text-text-faint">{t.market.udStakeRange} {formatTzs(minStake)} – {formatTzs(maxStake)}</p>', ["2.3"]],
  // §3 C8
  ["the Up & Down board's 300px track floor unguarded again", "src/app/updown/page.tsx",
    'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', 'repeat(auto-fill, minmax(300px, 1fr))', ["3.1", "3.2"]],
  ["the round history's 320px track floor unguarded again", "src/app/updown/history/page.tsx",
    'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', 'repeat(auto-fill, minmax(320px, 1fr))', ["3.1"]],
  // §4 C13
  ["the journey menu's KYC row offered to every reader again", "src/components/layout/avatar-menu.tsx",
    ' && !(journey && r.href === "/profile/kyc" && !kycOffered)', "", ["4.5"]],
  ["the journey menu's KYC row back on the h1's words", "src/components/layout/avatar-menu.tsx",
    '"/profile/kyc": t.profile.kycIdentityVerification,', '"/profile/kyc": t.profile.verifyIdentity,', ["4.6"]],
  ["the shell reading the KYC row for every reader (a query on every classic page)", "src/components/layout/app-shell.tsx",
    "journeyRead.then((j) => (j.journey ? db.kyc.findByUserId(session.userId) : null)),", "db.kyc.findByUserId(session.userId),", ["4.3"]],
  ["the hub's reader spelling its own KYC predicate (a verified-only copy)", "src/lib/server/hub-viewer.ts",
    'const kycOffered = k.status === "fulfilled" && kycDoorOffered(k.value?.status, k.value?.rejectReason);', 'const kycOffered = k.status === "fulfilled" && k.value?.status !== "APPROVED";', ["4.2"]],
  ["the one KYC question forgetting a final refusal", "src/lib/kyc-refusal.ts",
    'return level !== "APPROVED" && !(level === "REJECTED" && isFinalRefusal(rejectReason));', 'return level !== "APPROVED";', ["4.1"]],
  // §5 C1
  ["the hub's invite row back to \"never a paid word\"", "src/components/journey/account/hub-rows.ts",
    "label: inviteNameKey({ agent: v.agentInStanding, paid: v.doors.invitePaid }),", 'label: v.agentInStanding ? "agent.dashTitle" : "profile.inviteFriends",', ["5.4"]],
  ["the journey footer's invite link back to \"Alika marafiki\" for everybody", "src/components/layout/public-footer.tsx",
    "{journeyShown ? inviteName(t, { agent: inviteAgent, paid: invitePaid }) : t.profile.inviteFriends}", "{t.profile.inviteFriends}", ["5.4"]],
  ["the journey menu's invite row back to the classic literal (\"Invite & Earn\" for an agent)", "src/components/layout/avatar-menu.tsx",
    '"/profile/invite": inviteName(t, { agent: inviteAgent, paid: invitePaid }),', "", ["5.4"]],
  ["the invite page's tab without the agent's name", "src/app/profile/invite/page.tsx",
    "return { title: inviteName(t, { agent: dashboard, paid: payable }) };", "return { title: payable ? t.profile.inviteEarn : t.profile.inviteFriends };", ["5.2"]],
  ["the one rule forgetting the paid page", "src/lib/journey/invite-name.ts",
    'return r.agent ? "agent.dashTitle" : r.paid ? "profile.inviteEarn" : "profile.inviteFriends";', 'return r.agent ? "agent.dashTitle" : "profile.inviteFriends";', ["5.1"]],
  ["/profile's invite row back to \"Alika marafiki\" for a paid player", "src/app/profile/page.tsx",
    "title={inviteName(t, { agent: false, paid: invitePayable })}", "title={t.profile.inviteFriends}", ["5.5"]],
  // §6 C14
  ["the dial's result door back to \"Tazama nafasi\" in the journey", "src/components/markets/conviction-dial.tsx",
    "(journeyOn ? t.journey.tabTickets : t.common.viewPositions)", "t.common.viewPositions", ["6.1", "6.6"]],
  ["the performance ghost's eyebrow back to \"NAFASI\" for a journey reader", "src/app/positions/performance/performance-ghost.tsx",
    "eyebrow={journey ? t.journey.tabTickets : t.common.positions}", "eyebrow={t.common.positions}", ["6.3", "6.6"]],
  ["/help's card back to \"Madau yangu\" in the journey", "src/app/help/page.tsx",
    "title={journey ? t.journey.tabTickets : t.help.myPositions}", "title={t.help.myPositions}", ["6.4", "6.6"]],
  // §7 back links
  ["the KYC page's back link back to \"‹ WASIFU\" in the journey", "src/app/profile/kyc/page.tsx",
    '<BackLink fallbackHref={journey ? "/account" : "/profile"} label={journey ? t.journey.tabAccount : t.common.profile} />', '<BackLink fallbackHref="/profile" label={t.common.profile} />', ["7.1", "7.2"]],
  // §8 C4
  ["the sign-in break panel amber again", "src/app/auth/login/page.tsx",
    'tone: "neutral" as const,', 'tone: "warning" as const,', ["8.1"]],
  // §9 C2
  ["the Needle drawer's ✕ not risen to the capitals", "src/components/layout/needle-drawer.tsx",
    'className="-mt-[15px] mb-[7px] -mr-1 sm:-mr-1.5 shrink-0"', 'className="mb-[7px] -mr-1 sm:-mr-1.5 shrink-0"', ["9.1"]],
  ["the chat panel's ✕ centred on the header again", "src/components/chat/ChatPanel.tsx",
    'className="self-start -mt-[13.125px] shrink-0"', 'className="shrink-0"', ["9.2"]],
  // §10 C9
  ["a titled dialog's title off the corner ✕ (the share dialog)", "src/components/markets/share-button.tsx",
    '<p className="kp-modal-title mb-2 font-display text-[14px] font-semibold text-text">', '<p className="mb-2 font-display text-[14px] font-semibold text-text">', ["10.1"]],
  ["the crest-first result dialog losing the corner ✕ it keeps", "src/components/markets/operation-result-modal.tsx",
    `      panelClassName="overflow-hidden !p-0"${CR}    >`, `      panelClassName="overflow-hidden !p-0"${CR}      showClose={false}${CR}    >`, ["10.1"]],
  // §11 C3
  ["the gold census back to `--warning-fg` alone", "scripts/visual-pass-r5c.test.mts",
    "bar-needle(?:-glow)?|warning(?:-fg|-500|-bg|-border)?)\\s*[,)]/g);", "bar-needle(?:-glow)?|warning-fg)\\s*[,)]/g);", ["11.1"]],
  // §12 C10
  ["the journey bell's title cut to one plain line again", "src/components/layout/notifications-panel.tsx",
    "{journey ? <DotSeq text={pickTitle(n, locale)} renderPart={moneyRuns} /> : pickTitle(n, locale)}", "{pickTitle(n, locale)}", ["12.1"]],
  // §13 C11
  ["the bet confirm's STAKE label keeping its trailing tracking", "src/components/markets/bet-confirm-modal.tsx",
    'text-text-subtle mb-1 kp-track-end">{t.dialog.stakeLabel}', 'text-text-subtle mb-1">{t.dialog.stakeLabel}', ["13.1"]],
  ["the 0.08em label taking back 0.14em", "src/app/positions/performance/page.tsx",
    "kp-track-end kp-track-end--08", "kp-track-end", ["13.2"]],
  // §14 C16 C17 C18
  ["the board card's signal pill back at the default size", "src/components/markets/market-card.tsx",
    `            size="xs"${CR}            metrics="status"${CR}            aria-label={signal.label}`, "            aria-label={signal.label}", ["14.1"]],
  ["the classic held question clamped at two lines again", "src/components/markets/position-card.tsx",
    'tracking-[-0.005em] text-text text-balance">', 'tracking-[-0.005em] text-text line-clamp-2 text-balance">', ["14.3"]],
  ["the win seal's market name clamped at two lines again", "src/components/markets/win-celebration.tsx",
    'className="g-settle mt-2.5 text-[13px] text-text-subtle text-balance"', 'className="g-settle mt-2.5 text-[13px] text-text-subtle line-clamp-2"', ["14.6", "14.7"]],
  ["the tickets ghost's first pill 24px again", "src/components/journey/tickets/tickets-ghost.tsx",
    '<div className="h-[18px] w-[64px] rounded-pill bg-bg-overlay" />', '<div className="h-5 w-[64px] rounded-pill bg-bg-overlay" />', ["14.4"]],
  // §16 the pair gap
  ["the deposit return's pair 10px apart again (`gap-2.5`)", "src/app/wallet/deposit/return/page.tsx",
    '<div className="flex flex-col sm:flex-row gap-2">', '<div className="flex flex-col sm:flex-row gap-2.5">', ["16.1", "16.2"]],
  ["the deposit return's ghost drawing its pair on the old 10px (`gap-2.5`, a rebuild on the old gap)", "src/app/wallet/deposit/return/loading.tsx",
    // merged 2026-10-09: R5-K's rebuilt ghost draws the pair, on the page's gap-2 — the plant takes it back to 10px
    '<div className="flex flex-col sm:flex-row gap-2" aria-hidden>',
    '<div className="flex flex-col sm:flex-row gap-2.5" aria-hidden>', ["16.4"]],
  ["the market page's two sides 10px apart again", "src/components/markets/side-picker.tsx",
    '<div className="grid grid-cols-2 gap-2">', '<div className="grid grid-cols-2 gap-2.5">', ["16.1"]],
  // §15
  ["a dictionary word changed", "src/lib/i18n-dict.ts",
    'tabTickets: "Tiketi zangu",', 'tabTickets: "Tiketi zangu!",', ["15.1"]],
];

const only = process.argv.slice(2).map(Number).filter((n) => n > 0);
let caught = 0, missed = 0, unapplied = 0, restored = 0;
for (const [i, [what, rel, find, repl, expect]] of PLANTS.entries()) {
  if (only.length && !only.includes(i + 1)) continue;
  const p = join(ROOT, rel);
  const before = readFileSync(p, "utf8");
  const h0 = sha(before);
  const n = before.split(find).length - 1;
  if (n !== 1) { unapplied++; console.log(`P${i + 1} NOT APPLIED (${n} matches) · ${what} · ${rel}`); continue; }
  writeFileSync(p, before.replace(find, repl));
  let out = "";
  try {
    // Through npm, as every suite run here: cmd.exe (shell: true on Windows) cannot start a forward-slash path.
    const r = spawnSync("npm run -s test:visual-pass-r6c", { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    out = `${r.stdout}\n${r.stderr}`;
  } finally {
    writeFileSync(p, before);
  }
  const back = sha(readFileSync(p, "utf8")) === h0;
  if (back) restored++;
  const failed = [...out.matchAll(/^\s*FAIL (\S+)/gm)].map((m) => m[1]);
  const crashed = !/\d+ passed, \d+ failed/.test(out);
  const hit = expect.filter((id) => failed.includes(id));
  const ok = hit.length > 0 && !crashed;
  if (ok) caught++; else missed++;
  console.log(`P${i + 1} ${ok ? "CAUGHT" : crashed ? "CRASHED" : "MISSED"} on ${hit.join(", ") || `(expected ${expect.join("/")}; failed: ${failed.join(", ") || "none"})`} · restored ${back ? "byte-identical" : "‹DIFFERS›"} · ${what}${crashed ? `\n${out.slice(-600)}` : ""}`);
}
const total = only.length || PLANTS.length;
console.log(`\nMUTATION PROOF r6c — ${caught}/${total} caught on their named check, ${missed} missed, ${unapplied} not applied; ${restored}/${total - unapplied} files restored byte-identical (sha-256)`);
process.exitCode = caught === total && restored === total ? 0 : 1;
