// R5-G · THE MUTATION PROOF for test:visual-pass-r5g. Each plant writes one defect to disk, runs the suite, requires it to
// fail ON THE NAMED CHECK, then restores the file and proves it byte-identical (sha-256). A plant that does not apply
// (its text not found exactly once) is a failure of the proof, never skipped. Run from anywhere:
//   node mutation-r5g.mjs [plant-number ...]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/kipindi-r5g";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const CR = "\r\n";

/** [what the defect is, file, exact text, replacement, the check id(s) that must fail] */
const PLANTS = [
  ["the journey's deposit eyebrow back to \"WEKA PESA\" (repeats the h1 in Swahili)", "src/lib/journey/money-names.ts",
    "{ title: t.journey.depositAction, eyebrow: t.wallet.title,", "{ title: t.journey.depositAction, eyebrow: t.common.addFunds,", ["1.1", "1.2"]],
  ["the journey's withdraw heading back to \"Toa fedha\"", "src/lib/journey/money-names.ts",
    "eyebrow: t.wallet.title, heading: t.journey.withdrawAction }", "eyebrow: t.wallet.title, heading: t.wallet.moveFundsOut }", ["1.1"]],
  ["the deposit page's tab back to \"Amana\" for everybody", "src/app/wallet/deposit/page.tsx",
    "return { title: depositNames(t, journey).title };", "return { title: t.common.deposit };", ["1.3′", "2.1"]],
  ["the deposit page's h1 back to `common.deposit`", "src/app/wallet/deposit/page.tsx",
    "          title={names.heading}", "          title={t.common.deposit}", ["1.3"]],
  ["the deposit commit back to \"Amana\" for everybody", "src/app/wallet/deposit/deposit-confirm.tsx",
    "confirmLabel={depositNames(t, journey).commit}", "confirmLabel={t.common.deposit}", ["1.5"]],
  ["the deposit loading file without the journey answer", "src/app/wallet/deposit/loading.tsx",
    "return <DepositGhost t={t} journey={journey} />;", "return <DepositGhost t={t} journey={false} />;", ["1.4′"]],
  ["the root ghost drawing the classic deposit head", "src/components/journey/route-ghost.tsx",
    "\"/wallet/deposit\": <DepositGhost t={t} journey />,", "\"/wallet/deposit\": <DepositGhost t={t} journey={false} />,", ["1.4′"]],
  ["the withdraw page's tab back to \"Toa\" for everybody", "src/app/wallet/withdraw/page.tsx",
    "return { title: withdrawNames(t, journey).title };", "return { title: t.wallet.withdrawTitle };", ["1.6′"]],
  ["the withdraw ghost's eyebrow back to \"TOA\"", "src/app/wallet/withdraw/loading.tsx",
    "          eyebrow={names.eyebrow}", "          eyebrow={t.wallet.withdrawTitle}", ["1.6″"]],
  ["the provider's return's eyebrow back to \"AMANA\" for everybody", "src/app/wallet/deposit/return/page.tsx",
    "eyebrow={depositNames(t, journey).title}", "eyebrow={t.common.deposit}", ["1.7"]],
  ["the capture harness expecting \"Amana\" again", "scripts/qa-journey-shell.mjs",
    "'/wallet/deposit': H('eq', 'Weka pesa', 'Deposit', '充值'),", "'/wallet/deposit': H('eq', 'Amana', 'Deposit', '充值'),", ["1.8"]],
  ["/updown/history's tab back to \"Juu na Chini zako\" for a journey reader", "src/app/updown/history/page.tsx",
    "return { title: journey ? t.journey.tabTickets : t.market.udHistoryTitle };", "return { title: t.market.udHistoryTitle };", ["3.1"]],
  ["the Up & Down board's history pill back to \"Juu na Chini zako\" in the journey", "src/app/updown/page.tsx",
    "const historyName = journey ? t.journey.tabTickets : t.market.udHistoryTitle;", "const historyName = t.market.udHistoryTitle;", ["3.2"]],
  ["/profile's help row back to \"Help & support\"", "src/app/profile/page.tsx",
    "title={t.common.help}                 subtitle={t.profile.helpSupportSub}", "title={t.profile.helpSupport}         subtitle={t.profile.helpSupportSub}", ["3.3", "2.4"]],
  ["the agent's top-up back to \"Ongeza fedha kwenye pochi yangu\" in the journey", "src/app/agent/apply/apply-client.tsx",
    "{journey ? t.journey.depositAction : t.agent.payTopUp}", "{t.agent.payTopUp}", ["3.4"]],
  ["an agent's invite tab back to \"Alika na upate zawadi\"", "src/app/profile/invite/page.tsx",
    "if (dashboard) return { title: t.agent.dashTitle };", "if (dashboard) return { title: t.profile.inviteEarn };", ["3.5"]],
  ["the hub's withdraw row back to \"Toa\" (a door drifting from its page)", "src/components/journey/account/hub-rows.ts",
    "label: \"journey.withdrawAction\", glyph: \"arrowUpFromLine\"", "label: \"common.withdraw\", glyph: \"arrowUpFromLine\"", ["2.4"]],
  ["a new door to the deposit screen, its words unruled (on the receipt page)", "src/app/wallet/receipt/[id]/page.tsx",
    "      <p className=\"text-body-sm leading-relaxed text-text-subtle\">{t.wallet.receiptFootnote}</p>",
    "      <Link href=\"/wallet/deposit\" className=\"btn btn-ghost\">{t.common.deposit}</Link>" + CR + "      <p className=\"text-body-sm leading-relaxed text-text-subtle\">{t.wallet.receiptFootnote}</p>", ["2.7"]],
  ["the opt-out footer's licence line without `flex-1` (a size container would collapse)", "src/components/layout/app-shell.tsx",
    "className=\"kp-gbt flex-1 text-text-muted", "className=\"kp-gbt text-text-muted", ["4.4"]],
  ["the opt-out footer's licence sentence printed plain", "src/components/layout/app-shell.tsx",
    "{keepRegulator(t.footer.licensedByGbt)}", "{t.footer.licensedByGbt}", ["4.4"]],
  ["the offline document's Swahili threshold under the name (240px)", "src/lib/offline-document.ts",
    "{ en: 168, sw: 263, zh: 120 }", "{ en: 168, sw: 240, zh: 120 }", ["4.8"]],
  ["the offline document's licence sentence without the name span", "src/lib/offline-document.ts",
    "<p class=\"kp-off__gbt\">${sayLicence((t) => t.footer.licensedByGbt)}</p>", "<p class=\"kp-off__gbt\">${say((t) => t.footer.licensedByGbt)}</p>", ["4.7"]],
  ["the offline document's licence line not a size container", "src/lib/offline-document.ts",
    "flex:1 1 0%;min-width:0;container:kp-gbt/inline-size}", "flex:1 1 0%;min-width:0}", ["4.8"]],
  ["global-error's licence line printed plain", "src/app/global-error.tsx",
    "<span>{keepRegulatorName(t.gbt)}</span>", "<span>{t.gbt}</span>", ["4.10"]],
  ["global-error's copy of the pattern drifted (the zh break hint no longer allowed)", "src/app/global-error.tsx",
    "\\u4e9a\\p{Cf}?\\u535a", "\\u4e9a\\u535a", ["4.3"]],
  ["`keepRegulator` keeping nothing", "src/components/ui/keep-words.tsx",
    "  const cut = regulatorSplit(text);" + CR + "  if (!cut) return text;", "  const cut = regulatorSplit(text);" + CR + "  if (cut || !cut) return text;", ["4.4"]],
  ["the pattern losing the Swahili name", "src/lib/regulator-name.ts",
    "|Bodi ya Michezo ya Kubahatisha Tanzania|", "|", ["4.1"]],
  ["a new line printing the regulator's name, unclassified (on the agent page)", "src/app/agent/page.tsx",
    "<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} />",
    "<PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} subtitle={t.agent.heroSub} /><p>Licensed by the Gaming Board of Tanzania</p>", ["4.12"]],
  ["legal prose wrapped (a keep span in the terms page)", "src/app/legal/terms/page.tsx",
    "under licence from the Gaming Board of Tanzania, licence number{\" \"}", "under licence from the <span className=\"kp-gbt-name\">Gaming Board of Tanzania</span>, licence number{\" \"}", ["4.14"]],
  ["the avatar menu's journey leaderboard row back to its classic words", "src/components/layout/avatar-menu.tsx",
    "\"/profile/kyc\": t.profile.verifyIdentity, \"/leaderboard\": t.leaderboard.title, \"/proposals\"", "\"/profile/kyc\": t.profile.verifyIdentity, \"/proposals\"", ["2.2"]],
];

const only = process.argv.slice(2).map(Number).filter((n) => n > 0);
let caught = 0, missed = 0, unapplied = 0, restored = 0;
const log = [];
for (const [i, [what, rel, find, repl, expect]] of PLANTS.entries()) {
  if (only.length && !only.includes(i + 1)) continue;
  const p = join(ROOT, rel);
  const before = readFileSync(p, "utf8");
  const h0 = sha(before);
  const n = before.split(find).length - 1;
  if (n !== 1) { unapplied++; log.push(`P${i + 1} NOT APPLIED (${n} matches) · ${what} · ${rel}`); console.log(log.at(-1)); continue; }
  writeFileSync(p, before.replace(find, repl));
  let out = "";
  try {
    const r = spawnSync("npx", ["tsx", "scripts/visual-pass-r5g.test.mts"], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    out = `${r.stdout}\n${r.stderr}`;
  } finally {
    writeFileSync(p, before);
  }
  const back = sha(readFileSync(p, "utf8")) === h0;
  if (back) restored++;
  const failed = [...out.matchAll(/^\s*FAIL (\S+)/gm)].map((m) => m[1]);
  const crashed = !/visual-pass-r5g: \d+ passed/.test(out);
  const hit = expect.filter((id) => failed.includes(id));
  const ok = hit.length > 0 && !crashed;
  if (ok) caught++; else missed++;
  log.push(`P${i + 1} ${ok ? "CAUGHT" : crashed ? "CRASHED" : "MISSED"} on ${hit.join(", ") || `(expected ${expect.join("/")}; failed: ${failed.join(", ") || "none"})`} · restored ${back ? "byte-identical" : "‹DIFFERS›"} · ${what}`);
  console.log(log.at(-1));
}
const total = only.length || PLANTS.length;
console.log(`\nMUTATION PROOF r5g — ${caught}/${total} caught on their named check, ${missed} missed, ${unapplied} not applied; ${restored}/${total - unapplied} files restored byte-identical (sha-256)`);
process.exitCode = caught === total && restored === total ? 0 : 1;
