import { chromium } from "playwright";
import {
  welcomeHtml, depositConfirmedHtml, betPlacedHtml, winNotificationHtml,
  lossNotificationHtml, cashOutReceiptHtml, withdrawalSentHtml, kycApprovedHtml,
} from "../src/lib/server/email.ts";

const PLACED = "2026-06-14T11:32:00.000Z";
const SETTLED = "2026-06-20T18:05:00.000Z";
const samples: Record<string, string> = {
  welcome: welcomeHtml({ name: "Asha" }),
  deposit: depositConfirmedHtml({ amount: 50000, method: "M-Pesa", reference: "TXN-7F3K9Q2M1A8B", balance: 1250000 }),
  betPlaced: betPlacedHtml({ reference: "pos_9f3k2qm1a8", side: "YES", stake: 25000, payoutIfWin: 46200, marketTitle: "Will Simba SC win the Mainland derby on Saturday?", placedAt: PLACED, resolutionDate: "2026-06-20" }),
  win: winNotificationHtml({ reference: "pos_9f3k2qm1a8", payout: 184500, stake: 50000, marketTitle: "Will Simba SC win the Mainland derby?", settledAt: SETTLED }),
  loss: lossNotificationHtml({ reference: "pos_7b22aa90fe", stake: 30000, marketTitle: "Will it rain in Dodoma before Friday?", settledAt: SETTLED }),
  cashout: cashOutReceiptHtml({ reference: "pos_9f3k2qm1a8", value: 38200, stake: 25000, marketTitle: "Will Simba SC win the Mainland derby?", soldAt: PLACED }),
  withdrawal: withdrawalSentHtml({ amount: 1000000, destination: "M-Pesa · 0744 *** 219", reference: "WD-2026-0613-0098" }),
  kyc: kycApprovedHtml({ name: "Asha" }),
};

const b = await chromium.launch();
for (const width of [375, 600]) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  for (const [name, html] of Object.entries(samples)) {
    const p = await ctx.newPage();
    await p.setContent(html, { waitUntil: "networkidle" });
    await p.screenshot({ path: `/tmp/email_${name}_${width}.png`, fullPage: true });
    await p.close();
  }
  await ctx.close();
}
await b.close();
console.log("rendered:", Object.keys(samples).join(", "), "@ 375 + 600");
