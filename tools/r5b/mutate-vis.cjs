// Mutation proof for scripts/visual-pass-r5b.test.mts: plant each defect ON DISK, run the suite, require it to fail on the
// NAMED check, restore the file's exact bytes and prove it (sha256). Lives in the scratchpad: the repo's suite writes nothing.
//   node mutate.cjs            every plant
//   node mutate.cjs 6.6 9.1    only the plants expected on those checks
const fs = require("fs");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const ROOT = "F:/kipindi-vis/";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const J = ":root:has(#kp-journey-shell)";

// [name, file, from, to, expected check]
const M = [
  // §1 F3
  ["F3 the journey's foot rule dropped (the rule back on Funga's border, 8px)", "src/app/globals.css",
    `${J} .kp-wsheet__foot { padding-top: var(--sp-4); }`, "", "1.1"],
  // §2 F6
  ["F6 the rail no longer reaches into the gutter", "src/app/globals.css",
    "  margin-inline-start: calc(-1 * var(--sp-3));\n  border-bottom-color: transparent;", "  border-bottom-color: transparent;", "2.1"],
  ["F6 the options back on the kit's 20px", "src/app/globals.css",
    `${J} :is([data-section-rail], [data-rail-ghost]) > * { padding-inline: var(--sp-3); }`,
    `${J} :is([data-section-rail], [data-rail-ghost]) > * { padding-inline: var(--sp-5); }`, "2.1"],
  ["F6 the rule's line drawn from the rail's own left (12px into the gutter)", "src/app/globals.css",
    "var(--sp-3) 100% / calc(100% - var(--sp-3)) 1px no-repeat border-box", "0 100% / 100% 1px no-repeat border-box", "2.1"],
  ["F6 /wallet's ghost back on 14px with the display face", "src/app/wallet/loading.tsx",
    "whitespace-nowrap px-4 text-body-sm font-semibold text-text-subtle", "whitespace-nowrap px-3.5 font-display text-[13px] text-text-subtle", "2.4"],
  // §3 F7
  ["F7 Modal's panel without its dock mark", "src/components/ui/modal.tsx",
    '        data-dock={tall ? "lg" : sheet ? "sm" : undefined}\n', "", "3.1"],
  ["F7 a small sheet left ON the screen's last row", "src/app/globals.css",
    `${J} [data-dock-wrap="sm"] { bottom: -1px; }`, `${J} [data-dock-wrap="sm"] { bottom: 0; }`, "3.2"],
  ["F7 the Wallet's dock padding out of step with its own", "src/app/globals.css",
    ".kp-wsheet { --dock-pb: calc(var(--sp-5) + env(safe-area-inset-bottom, 0px)); }", ".kp-wsheet { --dock-pb: var(--sp-6); }", "3.4"],
  ["F7 the Needle's drawer unmarked", "src/components/layout/needle-drawer.tsx",
    '            data-dock="sm"\n            data-dock-wrap="sm"\n', "", "3.5"],
  ["F7 the primer docking on Modal's 24", "src/components/onboarding/first-visit-primer.tsx",
    'panelClassName="!p-0 [--dock-pb:0px] max-h', 'panelClassName="!p-0 max-h', "3.5"],
  ["F7 the chat sheet keeping its bottom border", "src/app/globals.css",
    `  ${J} .cm-panel-sheet { border-bottom-width: 0; }\n`, "", "3.6"],
  // §4 F8
  ["F8 the dark drop back on the journey's pip", "src/app/globals.css",
    "left: 21px !important; box-shadow: none; }", "left: 21px !important; box-shadow: 0 2px 4px color-mix(in oklab, var(--royal-950) 40%, transparent); }", "4.1"],
  // §5 F9
  ["F9 the formatter swapped (a day for a moment) on the re-apply notice", "src/lib/server/notification-service.ts",
    'await instantIn(opts.reapplyAt, formatEatDate, "")', 'await instantIn(opts.reapplyAt, formatEatDateTime, "")', "5.2"],
  ["F9 the caller formats the payout time in English again", "src/lib/server/market-service.ts",
    "  const paysAt = m.objectionsClosedAt;", "  const paysAt = formatDateTime(m.objectionsClosedAt);", "5.3"],
  ["F9 the Swahili verdict body printing the English date", "src/lib/server/notification-service.ts",
    "Malipo kuanzia ${paysFrom.sw}", "Malipo kuanzia ${paysFrom.en}", "5.4"],
  ["F9 the revoked agent's notice: the English day in the Swahili body", "src/lib/server/notification-service.ts",
    "Unaweza kuomba tena kuanzia ${when!.sw}.", "Unaweza kuomba tena kuanzia ${when!.en}.", "5.5"],
  ["F9 the revoked agent's letter: the English day in the Swahili line", "src/lib/server/email.ts",
    "Unaweza kuomba tena kuanzia ${whenSw}.", "Unaweza kuomba tena kuanzia ${whenEn}.", "5.6"],
  // §6 F10
  ["F10 the cut never steps back to a word", "src/lib/notification-text.ts",
    "  while (cut > 0 && !boundary(cut)) cut--;", "  while (false && cut > 0 && !boundary(cut)) cut--;", "6.1"],
  ["F10 a Chinese opening bracket allowed to end a cut", "src/lib/notification-text.ts",
    "(\\[{“‘«「『（【〈《〔…", "(\\[{“‘«…", "6.4"],
  ["F10 one notice back on .slice(0, 70)", "src/lib/server/notification-service.ts",
    "bodyEn: `${clipQuote(opts.marketTitle.en, 70)} was voided. Your stake has been returned.`",
    "bodyEn: `${opts.marketTitle.en.slice(0, 70)} was voided. Your stake has been returned.`", "6.6"],
  ["F10 an email subject back on .slice(0, 50)", "src/lib/server/market-service.ts",
    "subject: `Market cancelled · ${clipQuote(m.titleEn, 50)}`,", "subject: `Market cancelled · ${m.titleEn.slice(0, 50)}`,", "6.7"],
  // §7 F11
  ["F11 the header's Deposit back on common.deposit", "src/app/wallet/wallet-client.tsx",
    "{journey ? t.journey.depositAction : t.common.deposit}", "{t.common.deposit}", "7.1"],
  ["F11 the balance card not told", "src/app/wallet/wallet-client.tsx",
    " canDeposit={depositOpen} journey={journey} />", " canDeposit={depositOpen} />", "7.1"],
  ["F11 the page not asking the resolver", "src/app/wallet/page.tsx",
    "        journey={(await resolveSimpleJourney()).journey}\n", "", "7.2"],
  ["F11 the receipts' Deposit back on common.depositCta", "src/app/wallet/receipts/page.tsx",
    "{journey ? t.journey.depositAction : t.common.depositCta}", "{t.common.depositCta}", "7.2"],
  // §8 F13
  ["F13 the door back on the page's rung", "src/app/globals.css",
    ".kp-discovery-bar + .kp-wallet-door.kp-wallet-door { margin-top: 15px; margin-bottom: -7px; }",
    ".kp-discovery-bar + .kp-wallet-door.kp-wallet-door { margin-top: 32px; margin-bottom: 0px; }", "8.1"],
  ["F13 the door without its hook", "src/app/wallet/wallet-client.tsx",
    '<div className="kp-wallet-door flex justify-end">', '<div className="flex justify-end">', "8.2"],
  // §9 F14
  ["F14 the wrapped row back on a 4px gap", "src/components/ui/query-bar.tsx",
    "flex-wrap justify-end gap-y-1.5 -mb-1 lg:mb-0 lg:flex-nowrap`;", "flex-wrap justify-end gap-y-1 -mb-1 lg:mb-0 lg:flex-nowrap`;", "9.1"],
  ["F14 the receipts ghost retyping the old wrap", "src/app/wallet/receipts/loading.tsx",
    "<div className={QUERY_BAR_ROW1_WRAP_CLASS}>", "<div className={`${QUERY_BAR_ROW1_WRAP_CLASS} gap-y-1 lg:flex-nowrap`}>", "9.3"],
  ["F14 the ghost's count back on its 12px bar", "src/app/wallet/receipts/loading.tsx",
    '<div className="flex h-[17.25px] shrink-0 items-center"><div className="h-3 w-[80px] rounded bg-bg-overlay" /></div>',
    '<div className="h-3 w-[80px] shrink-0 rounded bg-bg-overlay" />', "9.4"],
  // §10 /notifications
  ["§A5 the cleared rows forgotten", "src/app/notifications/page.tsx",
    "const inboxEmpty = !q && counts.all === 0 && counts.cleared === 0;", "const inboxEmpty = !q && counts.all === 0;", "10.1"],
  ["§A5 the bar drawn over an empty inbox again", "src/app/notifications/page.tsx",
    "      {!inboxEmpty && (\n        <NotificationsBar", "      {(\n        <NotificationsBar", "10.1"],
  ["§A5 the search band drawn over an empty inbox again", "src/app/notifications/page.tsx",
    "      {!inboxEmpty && (\n        <Suspense>", "      {(\n        <Suspense>", "10.1"],
  // §11 CHECKS
  ["CHECK the lead printed bare again", "src/components/home/landing-hero.tsx",
    "{keepText(t.home.emptyBalance, methodRunIn(t.home.emptyBalance, t.wallet.mobileMoneyOnly))}", "{t.home.emptyBalance}", "11.1"],
  ["CHECK the method's run never found", "src/components/home/landing-hero.tsx",
    "  return at < 0 || method.length === 0 ? [] : [sentence.slice(at, at + method.length)];", "  return [];", "11.2"],
  ["CHECK the deposit pip back 8px in", "src/components/wallet/provider-radio-grid.tsx",
    'className="absolute right-1 top-1 inline-flex', 'className="absolute right-1.5 top-1.5 inline-flex', "11.5"],
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
  const s = orig.toString("utf8");
  const crlf = s.includes("\r\n");
  const lf = s.replace(/\r\n/g, "\n");
  const n = lf.split(from).length - 1;
  if (n !== 1) { rows.push(`ANCHOR ${expect.padEnd(5)} ${name}: ${n} matches`); missed++; continue; }
  let mutated = lf.replace(from, () => to);
  if (crlf) mutated = mutated.replace(/\n/g, "\r\n");
  let out = "", code = 0;
  try {
    fs.writeFileSync(p, mutated);
    const r = spawnSync("npx", ["tsx", "scripts/visual-pass-r5b.test.mts"], { cwd: ROOT, encoding: "utf8", shell: true, maxBuffer: 64 << 20 });
    out = (r.stdout || "") + (r.stderr || "");
    code = r.status;
  } finally {
    fs.writeFileSync(p, orig);
  }
  const back = sha(fs.readFileSync(p)) === h0;
  if (back) restored++;
  const hit = code !== 0 && new RegExp(`FAIL ${expect.replace(/\./g, "\\.")}( |′|″)`).test(out);
  if (hit) caught++; else missed++;
  const failed = [...out.matchAll(/FAIL (\S+)/g)].map((m) => m[1]);
  rows.push(`${hit ? "CAUGHT" : "MISSED"} ${expect.padEnd(5)} ${name} — exit ${code}, failed [${failed.join(" ")}], restored ${back ? "byte-identical" : "DIFFERENT"}`);
}
console.log(rows.join("\n"));
console.log(`\nmutations: ${ran} planted · ${caught} caught on the named check · ${missed} missed · restored byte-identical: ${restored}/${ran}`);
process.exit(missed || restored !== ran ? 1 : 0);
