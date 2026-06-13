import { chromium } from "playwright";
import {
  welcomeHtml, depositConfirmedHtml, betPlacedHtml, winNotificationHtml,
  lossNotificationHtml, cashOutReceiptHtml, withdrawalSentHtml, kycApprovedHtml,
  kycRejectedHtml, kycSubmittedHtml, kycSubmittedAdminHtml, emailVerifyHtml,
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
  kyc: kycApprovedHtml({ name: "Asha", reference: "kyc_9f3k2qm1a8" }),
  kycRejected: kycRejectedHtml({ reason: "The name on your NIDA card didn't match the details entered. Please re-check and resubmit.", reference: "kyc_9f3k2qm1a8" }),
  kycSubmitted: kycSubmittedHtml({ name: "Asha", reference: "kyc_9f3k2qm1a8", submittedAt: PLACED, docTypes: ["NIDA_FRONT", "NIDA_BACK", "SELFIE"], viewUrl: "/profile/kyc" }),
  kycAdmin: kycSubmittedAdminHtml({ reference: "kyc_9f3k2qm1a8", name: "Asha Mwamba", phoneMasked: "+25570*****19", nidaMasked: "•••• 4821", submittedAt: PLACED, reviewUrl: "https://50pick.tz/admin/players/usr_9f3k2qm1a8?tab=kyc" }),
  emailVerify: emailVerifyHtml({ name: "Asha", verifyUrl: "https://50pick.tz/auth/verify-email?token=eyJ...sig" }),
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
