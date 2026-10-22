/** U43 gold restoration: exact action paint, with factual outcomes retained. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { MUTATIONS } from "./anchors/u43-earned-palette.anchors.mjs";

const paths = {
  panel: "src/components/updown/round-stake-panel.tsx",
  jud: "src/components/journey/updown/jud-arm.tsx",
  sheet: "src/components/journey/bet-sheet/bet-sheet.tsx",
  css: "src/app/globals.css",
  law: "docs/DESIGN_AUTHORITY.md",
  bet: "src/components/markets/bet-confirm-modal.tsx",
  sell: "src/components/markets/sell-confirm-modal.tsx",
  registration: "src/app/auth/register/page.tsx",
  receipt: "src/components/updown/updown-bet-receipt-modal.tsx",
  blocked: "src/components/updown/updown-bet-blocked-modal.tsx",
  result: "src/components/markets/operation-result-modal.tsx",
  saleResult: "src/components/markets/sell-result.tsx",
  hook: "src/components/updown/use-quick-bet.ts",
  kit: "src/components/ui/toast.tsx",
  glyphs: "src/components/ui/glyphs.tsx",
  dict: "src/lib/i18n-dict.ts",
  header: "src/components/layout/top-app-bar.tsx",
  wallet: "src/components/layout/wallet-sheet.tsx",
  balance: "src/components/layout/wallet-balance-pill.tsx",
  journeyHeader: "src/components/journey/journey-top-bar.tsx",
  bottom: "src/components/layout/bottom-nav.tsx",
  bell: "src/components/layout/notifications-panel.tsx",
  avatar: "src/components/layout/avatar-menu.tsx",
  price: "src/components/updown/price-hero.tsx",
  chart: "src/components/charts/terminal-chart.tsx",
  status: "src/lib/status-tone.ts",
  language: "src/components/ui/language-menu.tsx",
  error: "src/app/global-error.tsx",
};
const src = Object.fromEntries(Object.entries(paths).map(([key, path]) => [
  key, readFileSync(process.env.U43_EARNED_MUTANT_FILE === path ? process.env.U43_EARNED_MUTANT_PATH : path, "utf8").replace(/\r\n/g, "\n"),
]));
const tag = (value, marker, name) => {
  const at = value.indexOf(marker);
  const start = at < 0 ? -1 : value.lastIndexOf(`<${name}`, at);
  const end = at < 0 ? -1 : value.indexOf(`</${name}>`, at);
  return start < 0 || end < 0 ? "" : value.slice(start, end + name.length + 3);
};
const checks = [
  ["detail-gold", () => tag(src.panel, "bet.place(lockedSide)", "button").includes('className="btn btn-gold btn-lg mt-3 w-full justify-center"')],
  ["journey-gold", () => tag(src.jud, 'data-testid="jud-place"', "Button").includes('variant="gold"') && tag(src.jud, 'data-testid="jud-place"', "Button").includes("bet.place(side)")],
  ["low-deposit-gold", () => tag(src.sheet, 'data-testid="journey-sheet-deposit"', "Button").includes('variant="gold"') && tag(src.sheet, 'data-testid="journey-sheet-deposit"', "Button").includes('className="kp-bsheet__deposit gilt-metal"') && tag(src.sheet, 'data-testid="journey-sheet-deposit"', "Button").includes("onDeposit(selectedDeposit)")],
  ["sheet-commit-gold", () => tag(src.sheet, 'data-testid="journey-sheet-place"', "Button").includes('variant="gold"') && tag(src.sheet, 'data-testid="journey-sheet-place"', "Button").includes("onClick={onPlace}")],
  ["sheet-disabled-gold", () => src.css.includes(".kp-bsheet .btn-gold:disabled {") && !src.css.includes(".kp-bsheet .btn-primary:disabled {")],
  ["sheet-rail-ink", () => /\.kp-bsheet__rails \{[^}]*color:\s*var\(--gold-fg\)/s.test(src.css)],
  ["bet-confirm-gold", () => tag(src.bet, "ref={confirmRef}", "button").includes("onConfirm()") && tag(src.bet, "ref={confirmRef}", "button").includes('className="btn btn-gold btn-lg w-full"')],
  ["sell-confirm-gold", () => tag(src.sell, "ref={confirmRef}", "button").includes("onConfirm()") && tag(src.sell, "ref={confirmRef}", "button").includes('className="btn btn-gold btn-lg w-full"')],
  ["free-exit-success", () => src.sell.includes('borderColor: isFree ? "color-mix(in oklab, var(--success-500) 62%, transparent)"') && src.sell.includes('background:  isFree ? "color-mix(in oklab, var(--success-500) 18%, transparent)"') && src.sell.includes('style={{ color: isFree ? "var(--success-fg)" : "var(--text)" }}') && src.sell.includes('{isFree ? t.dialog.noFee : `−${formatTzs(fee)}`}')],
  ["header-deposit-gold", () => tag(src.header, 'data-testid="deposit-header"', "Link").includes('className="btn gilt-metal btn-md btn-pill"')],
  ["wallet-deposit-gold", () => tag(src.wallet, 'data-testid="wallet-sheet-deposit"', "Link").includes('className="btn gilt-metal btn-lg kp-wsheet__act"')],
  ["journey-header-deposit-gold", () => src.journeyHeader.includes('className="btn gilt-metal btn-md btn-pill kp-jhdr__pill"')],
  ["balance-gold", () => src.balance.includes('"cursor-pointer text-gold-300 hover:text-gold-200"') && src.balance.includes("var(--gold-300) 22%") && src.balance.includes('text-[var(--gold-300)] transition-colors')],
  ["bottom-coin-colors", () => ["green", "red", "gold", "pivot"].every((key) => src.bottom.includes(`"--kp-coin-${key}": MARK.${key}`))],
  ["classic-bell-gold", () => src.bell.includes('journey ? "brand" : "gold"') && src.bell.includes('journey ? "bg-brand-500/[0.04]" : "bg-gold-500/[0.04]"')],
  ["avatar-accent-gold", () => src.avatar.includes('accent ? "hover:bg-gold-500/10"') && src.avatar.includes('accent ? "text-gold-300"')],
  ["classic-language-gold", () => src.language.includes('journey ? "var(--brand-300)" : "var(--gilt)"')],
  ["resolved-gold", () => src.status.includes('RESOLVED: { player: "giltStruck", admin: "gilt", proposals: "giltStruck" }') && src.status.includes('LIVE:')],
  ["price-reference-gold", () => src.price.includes('stroke="var(--gilt)"') && src.price.includes('fill="var(--gilt)"')],
  ["price-direction", () => src.price.includes('tone === "up" ? "var(--yes-300)" : "var(--no-300)"') && src.price.includes('isUp ? "var(--yes-300)" : "var(--no-300)"')],
  ["chart-reference-gold", () => src.chart.includes('color: ink("--gilt")') && src.chart.includes('className="whitespace-nowrap text-gold-300" data-testid="updown-chart-opening-reference"')],
  ["error-mark-gold", () => src.error.includes('const NEEDLE = "oklch(86% 0.13 82)"')],
  ["placed-toast-factual", () => /toast\(\{\s*title: copy\.placed,[\s\S]*?variant: "factual"/.test(src.hook) && src.kit.includes('bar: "bg-text-muted"') && src.kit.includes('plate: "quiet"') && src.kit.includes('icon: <I.info s={plateGlyph(40)} />') && src.glyphs.includes("40: 20")],
  ["refused-toasts-factual", () => src.hook.includes('description: fail.description, variant: "factual", durationMs: 0') && src.hook.includes('description: errCopy.udErrBusy, variant: "factual", durationMs: 0')],
  ["receipt-side", () => src.receipt.includes('variant="success"') && src.receipt.includes('stripTone={placed.side === "UP" ? "yes" : "no"}') && src.receipt.includes('primaryLabel={t.market.udRcKeepPlaying}') && src.receipt.includes('footnote={projected != null ? t.market.udEstimateNote : undefined}') && !src.receipt.includes('successCrestTone="neutral"')],
  ["receipt-side-button", () => src.result.includes('stripTone === "gold" ? "btn-gold" : stripTone === "yes" ? "btn-yes" : stripTone === "no" ? "btn-no" : "btn-primary"') && src.result.includes('className={`btn ${effectiveBtn} btn-lg w-full`}')],
  ["blocked-neutral", () => src.blocked.includes('open={!!blocked}') && src.blocked.includes('variant="neutral"') && !src.blocked.includes("autoCloseMs=")],
  ["sale-outcomes", () => src.saleResult.includes('variant={resultData.variant}') && src.saleResult.includes('stripTone={resultData.variant === "success" ? "gold" : "brand"}') && src.saleResult.includes('resultData.net >= 0') && src.saleResult.includes('t.common.fullStakeReturned') && src.saleResult.includes('t.common.stakeReturnedMinusFee')],
  ["registered-offers-neutral", () => ["referral.newPlayerBonusTzs", "invite.bonusAmountTzs"].every((field) => src.registration.split(`<span className="amount text-text">{formatTzs(${field})}</span>`).length === 2) && !/className="[^"]*(?:gold|gilt)[^"]*"/.test(src.registration)],
  ["localized-continue", () => {
    const words = [...src.dict.matchAll(/udRcKeepPlaying:\s*"([^"]+)"/g)].map((m) => m[1]);
    return words.length === 3 && words[0] === "Keep playing" && words[1] === "Endelea kucheza" && words[2] === "继续游戏";
  }],
  ["current-law", () => src.law.includes("Current player rule (Ali, 2026-10-20): restore the full earlier house-gold treatment") && src.law.includes("A bet, sale or deposit still earns no money by itself.")],
];

const failed = checks.filter(([, check]) => !check()).map(([id]) => id);
for (const id of failed) console.error(`FAIL ${id}`);
if (failed.length) process.exit(1);
console.log(`PASS U43 gold and factual palette (${checks.length} checks)`);

if (process.argv.includes("--prove-red")) {
  for (const { name: expected, file, from: before, to: after } of MUTATIONS) {
    const key = Object.entries(paths).find(([, path]) => path === file)?.[0];
    if (!key) throw new Error(`red anchor names an unread source: ${file}`);
    if (src[key].split(before).length !== 2) throw new Error(`plant premise is not unique: ${key} ${expected}`);
    const temp = join(tmpdir(), `u43-earned-${randomUUID()}.tmp`);
    try {
      writeFileSync(temp, src[key].replace(before, after), "utf8");
      const run = spawnSync(process.execPath, [process.argv[1]], {
        cwd: process.cwd(), encoding: "utf8", env: { ...process.env, U43_EARNED_MUTANT_FILE: file, U43_EARNED_MUTANT_PATH: temp },
      });
      if (run.status === 0 || !(run.stderr + run.stdout).includes(`FAIL ${expected}`))
        throw new Error(`guard missed physical red mutation: ${key} ${expected}\n${run.stderr}${run.stdout}`);
      console.log(`RED ${expected}`);
    } finally { unlinkSync(temp); }
  }
  console.log(`PASS ${MUTATIONS.length} independent physical red mutations`);
}
