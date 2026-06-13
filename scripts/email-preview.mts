import { chromium } from "playwright";
import {
  welcomeHtml, depositConfirmedHtml, betPlacedHtml, winNotificationHtml,
  withdrawalSentHtml, kycApprovedHtml,
} from "../src/lib/server/email.ts";

const samples: Record<string, string> = {
  welcome: welcomeHtml({ name: "Asha" }),
  deposit: depositConfirmedHtml({ amount: 50000, method: "M-Pesa", reference: "TXN-7F3K9Q2M1A8B", balance: 1250000 }),
  betPlaced: betPlacedHtml({ side: "YES", stake: 25000, marketTitle: "Will Simba SC win the Mainland derby on Saturday?", resolutionDate: "2026-06-20" }),
  win: winNotificationHtml({ payout: 184500, stake: 50000, marketTitle: "Will Simba SC win the Mainland derby?" }),
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
