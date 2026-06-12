/**
 * Email service — Postmark transactional email.
 *
 * Pattern mirrors the SMS service: when POSTMARK_API_KEY is set, emails
 * go through Postmark. When unset, they log to console (dev/test).
 *
 * Every email uses the same envelope:
 *   From: noreply@50pick.tz
 *   ReplyTo: support@50pick.tz
 *   HtmlBody: kit-styled HTML built by the template functions below
 *
 * Usage:
 *   await sendEmail({
 *     to: user.email ?? user.phone + "@stub",
 *     subject: "Deposit confirmed · TZS 10,000",
 *     html: depositConfirmedHtml({ amount: 10_000, ... }),
 *   });
 */

import { ServerClient } from "postmark";
import { LinkTrackingOptions } from "postmark/dist/client/models/message/SupportingTypes";

const FROM = "noreply@50pick.tz";
const REPLY_TO = "support@50pick.tz";
const COMPANY = "50pick";
const HELPLINE = "+255 22 211 5811";

let _client: ServerClient | null = null;
function client(): ServerClient | null {
  if (_client) return _client;
  const key = process.env.POSTMARK_API_KEY;
  if (!key) return null;
  _client = new ServerClient(key);
  return _client;
}

type SendInput = {
  to: string;
  subject: string;
  html: string;
  /** Optional tag for Postmark analytics (e.g. "welcome", "deposit"). */
  tag?: string;
};

export async function sendEmail({ to, subject, html, tag }: SendInput): Promise<{ ok: boolean; messageId?: string }> {
  // Skip stub addresses (phone-only users without email)
  if (!to || to.endsWith("@stub") || to.endsWith("@none")) {
    return { ok: true };
  }

  const pm = client();
  if (!pm) {
    console.log(`[email-stub] To: ${to} | Subject: ${subject}`);
    return { ok: true, messageId: "stub" };
  }

  try {
    const res = await pm.sendEmail({
      From: FROM,
      To: to,
      ReplyTo: REPLY_TO,
      Subject: subject,
      HtmlBody: html,
      TextBody: stripHtml(html),
      Tag: tag,
      TrackOpens: true,
      TrackLinks: LinkTrackingOptions.HtmlOnly,
      MessageStream: "outbound",
    });
    return { ok: true, messageId: res.MessageID };
  } catch (err) {
    console.error("[email] Send failed:", (err as Error).message);
    return { ok: false };
  }
}

// ─── Shared HTML helpers ────────────────────────────────────────────────

const BRAND_BG = "#0d0f2e";
const BRAND_CARD = "#141640";
const BRAND_BORDER = "#2a2d5e";
const GOLD = "#d4a843";
const TEXT = "#f0eff4";
const TEXT_MUTED = "#9b99ad";
const TEXT_SUBTLE = "#6e6c80";
const YES_COLOR = "#4ade80";
const NO_COLOR = "#f87171";

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: ${BRAND_BG}; color: ${TEXT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .outer { max-width: 580px; margin: 0 auto; padding: 24px 16px; }
  .header { text-align: center; padding: 20px 0 16px; border-bottom: 1px solid ${BRAND_BORDER}; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 800; color: ${GOLD}; letter-spacing: -0.02em; text-decoration: none; }
  .logo span { color: ${TEXT_MUTED}; font-weight: 500; font-size: 14px; margin-left: 2px; }
  .card { background: ${BRAND_CARD}; border: 1px solid ${BRAND_BORDER}; border-radius: 12px; padding: 28px 24px; }
  .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; color: ${GOLD}; margin: 0 0 6px; font-family: 'JetBrains Mono', ui-monospace, monospace; }
  h1 { font-size: 22px; font-weight: 700; color: ${TEXT}; margin: 0 0 8px; line-height: 1.2; }
  .subtitle { font-size: 13px; color: ${TEXT_MUTED}; margin: 0 0 20px; line-height: 1.5; }
  .detail-grid { border-top: 1px solid ${BRAND_BORDER}; margin-top: 16px; padding-top: 16px; }
  .detail-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid ${BRAND_BORDER}; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: ${TEXT_SUBTLE}; font-family: 'JetBrains Mono', ui-monospace, monospace; }
  .detail-value { font-size: 14px; font-weight: 700; color: ${TEXT}; font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .detail-value.good { color: ${YES_COLOR}; }
  .detail-value.bad { color: ${NO_COLOR}; }
  .cta { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #c49a2e, #d4a843); color: #1a1a2e; font-size: 14px; font-weight: 700; border-radius: 999px; text-decoration: none; text-align: center; margin-top: 20px; }
  .footer { text-align: center; padding: 24px 0 8px; font-size: 11px; color: ${TEXT_SUBTLE}; line-height: 1.6; }
  .footer a { color: ${TEXT_MUTED}; text-decoration: underline; }
</style>
</head>
<body>
<div class="outer">
  <div class="header">
    <a href="https://50pick.tz" class="logo">50pick<span>.tz</span></a>
  </div>
  ${body}
  <div class="footer">
    <p>18+ · Licensed by Gaming Board of Tanzania<br>
    Helpline ${HELPLINE} · <a href="mailto:${REPLY_TO}">${REPLY_TO}</a></p>
    <p style="margin-top:12px;font-size:10px;color:${TEXT_SUBTLE}">
      You're receiving this because you have a 50pick account.<br>
      <a href="https://50pick.tz/profile/account">Manage email preferences</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

function detailRows(rows: { label: string; value: string; tone?: "good" | "bad" }[]): string {
  return `<div class="detail-grid">${rows.map(
    (r) => `<div class="detail-row"><span class="detail-label">${r.label}</span><span class="detail-value${r.tone ? ` ${r.tone}` : ""}">${r.value}</span></div>`,
  ).join("")}</div>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center"><a href="${href}" class="cta">${label}</a></div>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const fmtTzs = (n: number) => `TZS ${Math.round(n).toLocaleString("en-US")}`;

// ─── User email lookup helper ───────────────────────────────────────────

/** Look up a user's email and send. Silently skips if no email on file. */
export async function sendEmailToUser(
  userId: string,
  build: (email: string) => SendInput,
): Promise<void> {
  const { db } = await import("./store");
  const user = await db.user.findById(userId);
  const email = user?.email;
  if (!email) return;
  const input = build(email);
  await sendEmail(input);
}

// ─── Email templates ────────────────────────────────────────────────────

export function welcomeHtml({ name }: { name: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Welcome · Karibu</p>
    <h1>Welcome to 50pick, ${name}</h1>
    <p class="subtitle">Your account is ready. Browse markets, place your first prediction, and join the community.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Akaunti yako iko tayari. Tazama masoko na uweke utabiri wako wa kwanza.</p>
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
  </div>`);
}

export function depositConfirmedHtml({ amount, method, reference, balance }: {
  amount: number; method: string; reference: string; balance: number;
}): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Deposit confirmed · Amana imethibitishwa</p>
    <h1>Funds added</h1>
    <p class="subtitle">Your wallet has been topped up. You can start predicting.</p>
    ${detailRows([
      { label: "Amount", value: fmtTzs(amount), tone: "good" },
      { label: "Method", value: method },
      { label: "Reference", value: reference },
      { label: "New balance", value: fmtTzs(balance) },
    ])}
    ${ctaButton("https://50pick.tz/wallet", "View wallet · Tazama pochi")}
  </div>`);
}

export function withdrawalSentHtml({ amount, destination, reference }: {
  amount: number; destination: string; reference: string;
}): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Withdrawal sent · Pesa imetumwa</p>
    <h1>Withdrawal on its way</h1>
    <p class="subtitle">Your provider should pay out within moments.</p>
    ${detailRows([
      { label: "Amount", value: fmtTzs(amount) },
      { label: "Destination", value: destination },
      { label: "Reference", value: reference },
    ])}
  </div>`);
}

export function withdrawalUnderReviewHtml({ amount, reference }: {
  amount: number; reference: string;
}): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Under review · Inakaguliwa</p>
    <h1>Withdrawal under review</h1>
    <p class="subtitle">Amounts over TZS 1,000,000 are reviewed by our compliance team. This usually takes under 2 hours.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Kiasi kikubwa kinakaguliwa na timu yetu ya ufuatiliaji. Kawaida huchukua chini ya masaa 2.</p>
    ${detailRows([
      { label: "Amount", value: fmtTzs(amount) },
      { label: "Reference", value: reference },
      { label: "Status", value: "AML review" },
    ])}
  </div>`);
}

export function betPlacedHtml({ side, stake, marketTitle, resolutionDate }: {
  side: "YES" | "NO"; stake: number; marketTitle: string; resolutionDate: string;
}): string {
  const sideColor = side === "YES" ? YES_COLOR : NO_COLOR;
  return wrap(`<div class="card">
    <p class="eyebrow">Bet placed · Dau limewekwa</p>
    <h1>Position open</h1>
    <p class="subtitle">${marketTitle}</p>
    ${detailRows([
      { label: "Your pick", value: side },
      { label: "Stake", value: fmtTzs(stake) },
      { label: "Resolves", value: resolutionDate },
    ]).replace(`>${side}<`, ` style="color:${sideColor}">${side}<`)}
    <p class="subtitle" style="margin-top:16px">Payout is calculated at resolution from the final pool share. Outcome may differ from current odds.</p>
    ${ctaButton("https://50pick.tz/positions", "View positions · Tazama madau")}
  </div>`);
}

export function winNotificationHtml({ payout, stake, marketTitle }: {
  payout: number; stake: number; marketTitle: string;
}): string {
  const net = payout - stake;
  return wrap(`<div class="card">
    <p class="eyebrow">Position won · Umeshinda</p>
    <h1 style="color:${GOLD}">You won ${fmtTzs(payout)}</h1>
    <p class="subtitle">${marketTitle}</p>
    ${detailRows([
      { label: "Payout", value: fmtTzs(payout), tone: "good" },
      { label: "Net profit", value: `+${fmtTzs(net)}`, tone: "good" },
      { label: "Stake", value: fmtTzs(stake) },
    ])}
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
  </div>`);
}

export function lossNotificationHtml({ stake, marketTitle }: {
  stake: number; marketTitle: string;
}): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Bet lost · Dau limepotea</p>
    <h1>Bet lost · ${fmtTzs(stake)}</h1>
    <p class="subtitle">${marketTitle}</p>
    ${detailRows([
      { label: "Stake lost", value: fmtTzs(stake), tone: "bad" },
    ])}
    <p class="subtitle" style="margin-top:16px">Most people play for fun. If it stops feeling fun, take a break.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Kama haifurahishi tena, pumzika.</p>
    ${ctaButton("https://50pick.tz/profile/responsible-gambling", "Set limits · Weka mipaka")}
  </div>`);
}

export function cashOutReceiptHtml({ value, stake, marketTitle }: {
  value: number; stake: number; marketTitle: string;
}): string {
  const net = value - stake;
  const profit = net >= 0;
  return wrap(`<div class="card">
    <p class="eyebrow">Position sold · Imeuzwa</p>
    <h1>Cashed out · ${fmtTzs(value)}</h1>
    <p class="subtitle">${marketTitle}</p>
    ${detailRows([
      { label: "Sellback", value: fmtTzs(value) },
      { label: "Net", value: `${profit ? "+" : "\u2212"}${fmtTzs(Math.abs(net))}`, tone: profit ? "good" : "bad" },
      { label: "Stake", value: fmtTzs(stake) },
    ])}
  </div>`);
}

export function passwordResetHtml({ resetLink }: { resetLink: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Password reset · Badilisha nenosiri</p>
    <h1>Reset your password</h1>
    <p class="subtitle">Click the button below to set a new password. This link expires in 1 hour.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Bonyeza kitufe hapa chini kuweka nenosiri jipya. Kiungo hiki kinaisha baada ya saa 1.</p>
    ${ctaButton(resetLink, "Reset password · Badilisha")}
    <p class="subtitle" style="margin-top:16px;font-size:11px">If you didn't request this, ignore this email. Your password won't change.</p>
  </div>`);
}

export function kycApprovedHtml({ name }: { name: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Identity verified · Utambulisho umethibitishwa</p>
    <h1>You're fully verified, ${name}</h1>
    <p class="subtitle">Your identity has been confirmed. All platform features are now unlocked.</p>
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
  </div>`);
}

export function kycRejectedHtml({ reason }: { reason: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Identity check · Ukaguzi wa utambulisho</p>
    <h1>Identity check needs attention</h1>
    <p class="subtitle">${reason}</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Tafadhali angalia tena nyaraka zako na uwasilishe upya.</p>
    ${ctaButton("https://50pick.tz/profile/kyc", "Resubmit · Wasilisha tena")}
  </div>`);
}

export function selfExclusionHtml({ period, endDate }: { period: string; endDate: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Self-exclusion active · Jizuie</p>
    <h1>Self-exclusion confirmed</h1>
    <p class="subtitle">You've locked your account for <strong>${period}</strong>. Betting, deposits, and login are disabled until <strong>${endDate}</strong>. This cannot be reversed.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Akaunti yako imefungwa hadi ${endDate}. Hii haiwezi kubatilishwa.</p>
    ${detailRows([
      { label: "Period", value: period },
      { label: "Unlocks", value: endDate },
    ])}
    <p class="subtitle" style="margin-top:16px">Need help? Contact the Tanzania Gambling Helpline: ${HELPLINE}</p>
  </div>`);
}

export function coolOffHtml({ duration, endDate }: { duration: string; endDate: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Break active · Pumzika</p>
    <h1>Break confirmed</h1>
    <p class="subtitle">Login and betting are paused for <strong>${duration}</strong>. You'll be able to sign in again after <strong>${endDate}</strong>.</p>
    ${detailRows([
      { label: "Duration", value: duration },
      { label: "Resumes", value: endDate },
    ])}
  </div>`);
}

export function amlRejectRefundHtml({ amount, reason }: { amount: number; reason: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Withdrawal returned · Pesa imerudishwa</p>
    <h1>Withdrawal returned to wallet</h1>
    <p class="subtitle">Your withdrawal has been returned to your wallet balance.</p>
    ${detailRows([
      { label: "Amount refunded", value: fmtTzs(amount) },
      { label: "Reason", value: reason },
    ])}
    <p class="subtitle" style="margin-top:16px">If you have questions, contact <a href="mailto:${REPLY_TO}" style="color:${GOLD}">${REPLY_TO}</a></p>
  </div>`);
}

export function referralRewardHtml({ amount, referredName, totalEarned }: {
  amount: number; referredName: string; totalEarned: number;
}): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Referral reward · Umepata tuzo</p>
    <h1>You earned ${fmtTzs(amount)}</h1>
    <p class="subtitle">${referredName} joined through your referral link.</p>
    ${detailRows([
      { label: "Reward", value: fmtTzs(amount), tone: "good" },
      { label: "Total earned", value: fmtTzs(totalEarned) },
    ])}
    ${ctaButton("https://50pick.tz/profile/invite", "Invite more · Alika zaidi")}
  </div>`);
}

export function loginNotificationHtml({ name, time, ip }: { name: string; time: string; ip: string }): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Sign-in · Umeingia</p>
    <h1>Welcome back, ${name}</h1>
    <p class="subtitle">You just signed in to your 50pick account.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Umeingia kwenye akaunti yako ya 50pick.</p>
    ${detailRows([
      { label: "Time", value: time },
      { label: "IP address", value: ip },
    ])}
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
    <p class="subtitle" style="margin-top:16px;font-size:11px">If this wasn't you, change your password immediately and contact support.</p>
  </div>`);
}

export function sessionRevokedHtml(): string {
  return wrap(`<div class="card">
    <p class="eyebrow">Security · Usalama</p>
    <h1>Signed out on another device</h1>
    <p class="subtitle">Your account was signed in on another device. For security, your previous session was ended.</p>
    <p class="subtitle" style="font-style:italic;color:${TEXT_SUBTLE}">Akaunti yako imeingia kwenye kifaa kingine. Kikao chako kilichopita kimesitishwa.</p>
    ${ctaButton("https://50pick.tz/auth/login", "Sign in again · Ingia tena")}
    <p class="subtitle" style="margin-top:16px;font-size:11px">If this wasn't you, change your password immediately.</p>
  </div>`);
}
