// R5-K's MUTATION PROOF — each fix undone ON DISK, one at a time; the suite (test:visual-pass-r5k) must fail on the check
// named for it; every file is put back byte-identical (sha-256), checked after each plant and again at the end.
//   node mutation-r5k.mjs            (from anywhere; it works in F:/kipindi-r5k)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const ROOT = "F:/kipindi-vis/";
// R5-G (merging beside this work) moves the withdraw drawing into withdraw-ghost.tsx; plant wherever it lives.
const WITHDRAW = existsSync(ROOT + "src/app/wallet/withdraw/withdraw-ghost.tsx") ? "src/app/wallet/withdraw/withdraw-ghost.tsx" : "src/app/wallet/withdraw/loading.tsx";
const sha = (b) => createHash("sha256").update(b).digest("hex");
/** [the check that must fail, file, exact text (LF; matched as CRLF), its replacement, what the plant puts back]. */
const PLANTS = [
  ["0.1", "src/components/ui/ghost-text.tsx", `export const GHOST_TEXT_CLASS = "select-none rounded-sm bg-bg-overlay text-transparent box-decoration-clone";`, `export const GHOST_TEXT_CLASS = "select-none rounded-sm bg-bg-overlay text-transparent";`, "a bar on the first line only"],
  ["0.3", "src/components/ui/ghost-text.tsx", `metrics={metrics ?? "base"}`, `metrics={metrics ?? "status"}`, "the ghost chip on the taller status row"],
  ["0.4", "src/app/profile/loading.tsx", `import { useT } from "@/lib/i18n";`, `import { useT } from "@/lib/i18n";\nimport { getServerT } from "@/lib/i18n-server";\nvoid getServerT;`, "a drawing reading the server again"],
  ["1.1", "src/app/wallet/receipt/[id]/loading.tsx", `      <p className="text-body-sm leading-relaxed" aria-hidden><GhostText>{t.wallet.receiptFootnote}</GhostText></p>\n`, ``, "the receipt's footnote left out"],
  ["1.3", "src/app/wallet/receipt/[id]/loading.tsx", `        <RowGhost label={t.wallet.balanceAfter}><AmountGhost /></RowGhost>\n`, ``, "a row short (seven for eight)"],
  ["1.4", "src/app/wallet/receipt-ghost.tsx", "export const TXN_ID_SHAPE = `txn_${\"0\".repeat(24)}`;", "export const TXN_ID_SHAPE = `txn_${\"0\".repeat(16)}`;", "an id shape shorter than a real id"],
  ["2.1", "src/app/wallet/money-form-ghost.tsx", `      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3" aria-hidden>`, `      <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3" aria-hidden>`, "the trust strip off its own classes"],
  ["2.2", "src/app/wallet/money-form-ghost.tsx", `<div key={name} className="relative flex flex-col items-center gap-2 rounded-md border border-border px-2 py-[14px]"`, `<div key={name} className="relative flex flex-col items-center gap-2 rounded-md border border-border px-2 py-[10px]"`, "tiles 8px short (98.25 for 106.25)"],
  ["2.3", "src/app/wallet/money-form-ghost.tsx", `export const QUICK_PILLS = 6;`, `export const QUICK_PILLS = 3;`, "three quick-amount pills (one row on a phone)"],
  ["2.4", "src/app/wallet/money-form-ghost.tsx", `            <p className="mt-1.5 text-body-sm text-balance"><GhostText>{t.wallet.mobileMoneyNumberHint}</GhostText></p>\n`, ``, "the phone hint left out"],
  ["3.1", "src/app/wallet/deposit/return/loading.tsx", `<div className="flex flex-col sm:flex-row gap-[10px]" aria-hidden>`, `<div className="flex flex-col sm:flex-row gap-2" aria-hidden>`, "the return's buttons 12px apart (the page's are 10)"],
  ["3.3", "src/app/wallet/deposit/return/loading.tsx", `            title={<GhostText>{t.wallet.returnPaidTitle}</GhostText>}`, `            title={t.wallet.returnPaidTitle}`, "the outcome's heading SHOWN"],
  ["4.1", WITHDRAW, `<PageHero contentClassName="relative z-10 p-5 lg:p-6 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">`, `<PageHero contentClassName="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">`, "the withdraw hero's old row class"],
  ["4.2", "src/app/wallet/money-form-ghost.tsx", `    <div className="flex items-start gap-[10px] px-[14px] py-3 text-body-sm leading-snug">`, `    <div className="flex items-start gap-2 px-[14px] py-3 text-body-sm leading-snug">`, "a notice row off the page's NoticeRow"],
  ["4.3", "src/app/wallet/money-form-ghost.tsx", `body={fill(t.wallet.taxBody, { pct: FEE_PCT_SHAPE })}`, `body={fill(t.wallet.taxBody, { pct: "0" })}`, "the fee's rate drawn as one digit (the first draft)"],
  ["5.1", "src/app/profile/loading.tsx", `<div className="h-[80px] w-[80px] shrink-0 rounded-full bg-bg-overlay/20" />`, `<div className="h-[64px] w-[64px] shrink-0 rounded-full bg-bg-overlay/20" />`, "the 64px avatar back"],
  ["5.2", "src/app/profile/loading.tsx", `<span className="inline-flex items-center min-h-[var(--tap-min)]"><ChipGhost glyph={10}>{t.profile.addEmailPill}</ChipGhost></span>`, `<ChipGhost glyph={10}>{t.profile.addEmailPill}</ChipGhost>`, "the email pill out of its tap-floor link"],
  ["5.3", "src/app/profile/loading.tsx", `className="col-span-2 min-w-0 whitespace-nowrap border-b border-border px-5 sm:col-span-1 sm:border-b-0 lg:px-6"`, `className="min-w-0 whitespace-nowrap border-b border-border px-5 sm:border-b-0 lg:px-6"`, "the balance cell one column on a phone"],
  ["5.4", "src/app/profile/loading.tsx", `const SHELF: readonly AchievementId[] = ["first-prediction", "first-win", "verified", "market-maker", "connector", "sharp"];`, `const SHELF: readonly AchievementId[] = ["first-prediction", "first-win", "verified", "market-maker", "sharp"];`, "a badge short"],
  ["5.5", "src/app/profile/loading.tsx", `  [t.profile.verifyIdentity, t.profile.verifyIdSub],\n`, ``, "a settings row short"],
  ["5.6", "src/app/profile/loading.tsx", `<p className={PROFILE_SIGN_OUT_TITLE}><GhostText>{t.common.signOut}</GhostText></p>`, `<p className="font-display text-[14px] font-semibold"><GhostText>{t.common.signOut}</GhostText></p>`, "the sign-out title off its face"],
  ["6.1", "src/app/positions/positions-ghost.tsx", `          <span className="text-body-sm tracking-normal font-semibold text-transparent">{t.performance.viewPerformance}</span>`, `          <span className="text-body-sm font-semibold text-transparent">{t.performance.viewPerformance}</span>`, "the head's button words tracked (a narrower box)"],
  ["6.2", "src/app/positions/positions-ghost.tsx", `<div className="grid gap-x-0 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>`, `<div className="grid gap-x-0 gap-y-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>`, "the strip back on a fixed two-column grid"],
  ["6.3", "src/app/positions/positions-ghost.tsx", `<div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-[0.12em] tabular-nums">`, `<div className="mb-1.5 flex items-center justify-between gap-2 font-mono uppercase tracking-[0.12em] tabular-nums">`, "the exposure keys off their 14px line"],
  ["6.4", "src/app/positions/positions-ghost.tsx", `    [t.common.topic, [t.market.catAll, ...MARKET_CATEGORIES.map((c) => categoryLabel(t, c))]],\n`, ``, "the topic group left out"],
  ["6.5", "src/app/positions/positions-ghost.tsx", `    [t.common.when, [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll]],`, `    [t.common.when, [t.common.rangeToday, t.common.rangeAll]],`, "a narrower window group (row 2 a line short)"],
  ["7.1", "src/app/positions/performance/loading.tsx", `      <section className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>`, `      <section className="grid grid-cols-1 gap-3" aria-hidden>`, "the highlights off the page's grid"],
  ["7.2", "src/app/positions/performance/loading.tsx", `<div className="aspect-[3/1] w-full rounded bg-bg-overlay" />`, `<div className="h-[200px] w-full rounded bg-bg-overlay" />`, "the 200px chart box back"],
  ["7.3", "src/app/positions/performance/loading.tsx", `<Stat size="xl" labelStyle="caps" boxed="panel" font="mono" label={<GhostText>{t.performance.totalStaked}</GhostText>}`, `<Stat size="xl" labelStyle="caps" boxed="panel" label={<GhostText>{t.performance.totalStaked}</GhostText>}`, "a stake tile in the display face"],
];
const files = [...new Set(PLANTS.map((p) => p[1]))];
const original = new Map(files.map((f) => [f, readFileSync(ROOT + f)]));
const want = new Map(files.map((f) => [f, sha(original.get(f))]));
const results = [];
let firstRun = true;
for (const [check, file, from, to, what] of PLANTS) {
  const buf = original.get(file);
  const s = buf.toString("utf8");
  const crlf = s.includes("\r\n");
  const n = (x) => (crlf ? x.replace(/\r?\n/g, "\r\n") : x);
  const f = n(from), tt = n(to);
  const count = s.split(f).length - 1;
  if (count !== 1) { results.push([check, what, `NOT PLANTED (found ${count} times)`]); continue; }
  writeFileSync(ROOT + file, s.replace(f, () => tt));
  const t0 = Date.now();
  const r = spawnSync("npx", ["tsx", "scripts/visual-pass-r5k.test.mts"], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600000 });
  const secs = Math.round((Date.now() - t0) / 1000);
  writeFileSync(ROOT + file, buf);
  const back = sha(readFileSync(ROOT + file)) === want.get(file);
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const failed = out.split(/\r?\n/).filter((l) => /^ {2}FAIL /.test(l)).map((l) => l.slice(7, 7 + (l.slice(7).indexOf(" ") > 0 ? l.slice(7).indexOf(" ") : 5)));
  const caught = failed.includes(check);
  results.push([check, what, `${caught ? "CAUGHT" : "MISSED"} on ${check} (failing: ${failed.join(", ") || "none"}; exit ${r.status}; ${secs}s) · restored byte-identical: ${back ? "yes" : "NO"}`]);
  console.log(`${caught && back ? "ok  " : "BAD "} ${check} · ${what} → ${results.at(-1)[2]}`);
  if (firstRun) firstRun = false;
}
const end = files.filter((f) => sha(readFileSync(ROOT + f)) !== want.get(f));
const caught = results.filter((r) => r[2].startsWith("CAUGHT")).length;
console.log(`\nmutation-r5k: ${PLANTS.length} planted, ${caught} caught on the named check; every file restored byte-identical at the end: ${end.length === 0 ? "yes" : "NO — " + end.join(", ")}`);
for (const f of files) console.log(`  sha-256 ${want.get(f).slice(0, 16)}… ${f}`);
if (caught !== PLANTS.length || end.length) process.exit(1);
