/** Guard the card's observable pending and realized-money labels. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict, type Locale } from "../src/lib/i18n-dict.ts";
import { validRealizedPayout } from "../src/lib/updown-result-truth.ts";

const source = readFileSync(resolve("src/components/updown/updown-card.tsx"), "utf8").replace(/\r\n/g, "\n");
let passed = 0;
const check = (label: string, okay: unknown) => {
  assert.ok(okay, label);
  passed++;
  console.log(`PASS ${label}`);
};
const section = (start: string, end: string) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `card section premise: ${start}`);
  return source.slice(a, b);
};

const resultHeader = section("{settledNow ? (", ") : (\n          <CardCountdownDigits");
check("a known verdict with money unsettled has neutral result ink",
  resultHeader.includes('!settled || state === "void" ? "var(--text-muted)"') &&
  resultHeader.includes('settled && price.kind === "priced" ? t.market.udUpWins : t.market.udUp'));

const single = section("{cardResults.length === 1 ? (", ") : (\n              <>");
check("an unknown single payout appears once, with no invented amount",
  single.includes('cardResults[0].payout == null ? t.market.udPayoutUnavailable') &&
  single.includes('cardResults[0].payout != null && <>') &&
  single.match(/udPayoutUnavailable/g)?.length === 1);
check("a realized LOSS names zero paid out rather than restating stake",
  single.includes('cardResults[0].status !== "VOID" && <span>{t.market.udPaidOut}</span>') &&
  single.includes('formatTzs(cardResults[0].payout)') &&
  !single.includes('formatTzs(cardResults[0].stake)'));
const multi = section("{cardResults.map((result) => (", "</p>\n                ))}");
check("each realized leg uses its actual payout, including zero for a loss",
  multi.includes('result.payout != null && <>') && multi.includes('formatTzs(result.payout)') &&
  !multi.includes('formatTzs(result.stake)'));

check("the mounted card validates realized payouts before formatting",
  source.includes('payout: validRealizedPayout(r) ? r.payout : null') &&
  validRealizedPayout({ status: "LOSS", stake: 2_000, payout: 0 }) &&
  !validRealizedPayout({ status: "LOSS", stake: 2_000, payout: null }) &&
  !validRealizedPayout({ status: "WIN", stake: 2_000, payout: -5 }));

// Two VOID legs with one missing payout are not a verified full refund or a
// verified paid total. Read the actual card markup in every player language.
const { UpDownCard } = await import("../src/components/updown/updown-card.tsx");
const { I18nProvider } = await import("../src/lib/i18n.tsx");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
const now = Date.UTC(2026, 9, 20, 12, 0);
for (const locale of ["en", "sw", "zh"] as const satisfies readonly Locale[]) {
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router as never },
    createElement(I18nProvider, { initial: locale }, createElement(UpDownCard, {
      roundId: "u43-missing-second-refund", assetName: "Bitcoin", assetTicker: "BTC", assetIcon: "crypto", assetKey: "BTCUSD",
      durationMinutes: 5, decimals: 2, readPrice: null, readUnavailable: false, openPrice: 85_000,
      opensAtMs: now - 5 * 60_000, closesAtMs: now - 60_000, selectionClosesAtMs: now - 2 * 60_000,
      serverNowMs: now, volumeTzs: 300, players: 1, pricing: { upPool: 100, downPool: 200, rates: {}, show: false },
      state: "void", settled: true, settledAtMs: now - 30_000, correctionKind: null, voidReason: "no-move",
      sourceClass: "crypto", openQuotedAt: new Date(now - 5 * 60_000).toISOString(), readQuotedAt: null, closeQuotedAt: null,
      myRefundedStake: 100, myResults: [
        { status: "VOID", side: "UP", stake: 100, payout: 100 },
        { status: "VOID", side: "DOWN", stake: 200, payout: null },
      ],
    } as never))));
  const summary = html.match(/<div class="ud-card-own-result[^\"]*"><p[^>]*>([\s\S]*?)<\/p>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
  check(`${locale} partial VOID result leaves total payment unclaimed`,
    summary.includes(dict[locale].market.udPayoutUnavailable)
    && !summary.includes(dict[locale].market.udPaidOut)
    && !summary.includes(dict[locale].market.udRefundTitle));
}
console.log(`u43-card-money-readout: ${passed} passed, 0 failed`);
