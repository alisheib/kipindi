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

// ─── Brand Kit v2 "Needle" — email design tokens ────────────────────────
// Matched to the email signature (50pick/Email Signatures/signature.html)

const BRAND_NAVY = "#232a6b";
const BRAND_BG = "#0d0f2e";
const BRAND_CARD = "#141640";
const BRAND_BORDER = "#2a2d5e";
const BRAND_LINK = "#3346c8";
const GILT = "#d9b23f";
const GILT_DARK = "#b8902a";
const TEXT = "#f0eff4";
const TEXT_MUTED = "#8a90ad";
const TEXT_SUBTLE = "#5a607e";
const YES_COLOR = "#199a5b";
const NO_COLOR = "#d9404a";

// Inline SVG mark from the brand kit — crisp at any zoom, no hosted image needed
const MARK_SVG = `<svg width="48" height="48" viewBox="-3 -3 106 106" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="m"><circle cx="50" cy="50" r="44.6"/></clipPath></defs><g clip-path="url(#m)"><path d="M 30.65 -27.62 A 80 80 0 0 0 69.35 127.62 L 30.65 -27.62 Z" fill="${YES_COLOR}"/><path d="M 30.65 -27.62 A 80 80 0 0 1 69.35 127.62 L 30.65 -27.62 Z" fill="${NO_COLOR}"/></g><circle cx="50" cy="50" r="44.6" fill="none" stroke="${BRAND_LINK}" stroke-width="2.8"/><line x1="37.54" y1="0.03" x2="62.46" y2="99.97" stroke="${GILT}" stroke-width="3" stroke-linecap="round"/><circle cx="56.29" cy="75.23" r="2.5" fill="#f0c84e"/><text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="'JetBrains Mono',monospace" font-weight="700" font-size="29" letter-spacing="-0.04em" fill="#f8f8fd">50</text></svg>`;

// Gilt needle-rule separator (from the signature)
const GILT_RULE = `<table cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:16px 0"><div style="width:42px;height:2px;background:${GILT};border-radius:2px"></div></td></tr></table>`;

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND_BG};color:${TEXT};font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND_BG}">
<tr><td align="center" style="padding:32px 16px">
<table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px">

  <!-- Header: mark + wordmark -->
  <tr><td align="center" style="padding:0 0 24px">
    <a href="https://50pick.tz" style="text-decoration:none">
      ${MARK_SVG}
    </a>
    <div style="margin-top:10px;font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.015em">
      <a href="https://50pick.tz" style="color:${BRAND_NAVY};text-decoration:none">
        <span style="color:${TEXT}">50pick</span><span style="color:${TEXT_MUTED};font-weight:500;font-size:14px;margin-left:2px">.tz</span>
      </a>
    </div>
  </td></tr>

  <!-- Gold top bar -->
  <tr><td><div style="height:3px;background:linear-gradient(90deg,${GILT},${GILT_DARK},${GILT});border-radius:3px 3px 0 0"></div></td></tr>

  <!-- Card body -->
  <tr><td style="background:${BRAND_CARD};border:1px solid ${BRAND_BORDER};border-top:none;border-radius:0 0 12px 12px;padding:28px 28px 24px">
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 0 0;text-align:center">
    <!-- Gilt rule -->
    <div style="width:42px;height:2px;background:${GILT};border-radius:2px;margin:0 auto 16px"></div>
    <p style="margin:0;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${GILT_DARK}">
      50pick.tz <span style="color:${NO_COLOR}">·</span> <span style="color:${TEXT_MUTED}">Soko la Utabiri</span>
    </p>
    <p style="margin:10px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE};line-height:1.7">
      18+ · Licensed by Gaming Board of Tanzania<br>
      Helpline ${HELPLINE} · <a href="mailto:${REPLY_TO}" style="color:${BRAND_LINK};text-decoration:none">${REPLY_TO}</a>
    </p>
    <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:${TEXT_SUBTLE}">
      You're receiving this because you have a 50pick account.<br>
      <a href="https://50pick.tz/profile/account" style="color:${TEXT_MUTED};text-decoration:underline">Manage preferences</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function eyebrow(en: string, sw?: string): string {
  let html = `<p style="margin:0 0 6px;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;color:${GILT_DARK}">${en}</p>`;
  if (sw) html += `<p style="margin:0 0 2px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;font-style:italic;color:${TEXT_SUBTLE}">${sw}</p>`;
  return html;
}

function heading(text: string, color?: string): string {
  return `<h1 style="margin:0 0 10px;font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:${color ?? TEXT};line-height:1.2">${text}</h1>`;
}

function subtitle(text: string): string {
  return `<p style="margin:0 0 16px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:${TEXT_MUTED};line-height:1.55">${text}</p>`;
}

function subtitleSw(text: string): string {
  return `<p style="margin:-10px 0 16px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-style:italic;color:${TEXT_SUBTLE};line-height:1.5">${text}</p>`;
}

function detailRows(rows: { label: string; value: string; tone?: "good" | "bad" }[]): string {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${BRAND_BORDER};margin-top:16px">${rows.map(
    (r) => {
      const valColor = r.tone === "good" ? YES_COLOR : r.tone === "bad" ? NO_COLOR : TEXT;
      return `<tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND_BORDER};font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:${TEXT_SUBTLE}">${r.label}</td><td style="padding:10px 0;border-bottom:1px solid ${BRAND_BORDER};text-align:right;font-family:'JetBrains Mono','Courier New',monospace;font-size:14px;font-weight:700;color:${valColor}">${r.value}</td></tr>`;
    },
  ).join("")}</table>`;
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px"><tr><td align="center">
    <a href="${href}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#c49a2e,${GILT});color:${BRAND_NAVY};font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;border-radius:999px;text-decoration:none;letter-spacing:-0.01em">${label}</a>
  </td></tr></table>`;
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
  return wrap(`
    ${eyebrow("Welcome · Karibu")}
    ${heading(`Welcome to 50pick, ${name}`)}
    ${subtitle("Your account is ready. Browse markets, place your first prediction, and join the community.")}
    ${subtitleSw("Akaunti yako iko tayari. Tazama masoko na uweke utabiri wako wa kwanza.")}
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
  `);
}

export function depositConfirmedHtml({ amount, method, reference, balance }: {
  amount: number; method: string; reference: string; balance: number;
}): string {
  return wrap(`
    ${eyebrow("Deposit confirmed", "Amana imethibitishwa")}
    ${heading("Funds added")}
    ${subtitle("Your wallet has been topped up. You can start predicting.")}
    ${detailRows([
      { label: "Amount", value: fmtTzs(amount), tone: "good" },
      { label: "Method", value: method },
      { label: "Reference", value: reference },
      { label: "New balance", value: fmtTzs(balance) },
    ])}
    ${ctaButton("https://50pick.tz/wallet", "View wallet · Tazama pochi")}
  `);
}

export function withdrawalSentHtml({ amount, destination, reference }: {
  amount: number; destination: string; reference: string;
}): string {
  return wrap(`
    ${eyebrow("Withdrawal sent", "Pesa imetumwa")}
    ${heading("Withdrawal on its way")}
    ${subtitle("Your provider should pay out within moments.")}
    ${detailRows([
      { label: "Amount", value: fmtTzs(amount) },
      { label: "Destination", value: destination },
      { label: "Reference", value: reference },
    ])}
  `);
}

export function withdrawalUnderReviewHtml({ amount, reference }: {
  amount: number; reference: string;
}): string {
  return wrap(`
    ${eyebrow("Under review", "Inakaguliwa")}
    ${heading("Withdrawal under review")}
    ${subtitle("Amounts over TZS 1,000,000 are reviewed by our compliance team. This usually takes under 2 hours.")}
    ${subtitleSw("Kiasi kikubwa kinakaguliwa na timu yetu ya ufuatiliaji. Kawaida huchukua chini ya masaa 2.")}
    ${detailRows([
      { label: "Amount", value: fmtTzs(amount) },
      { label: "Reference", value: reference },
      { label: "Status", value: "AML review" },
    ])}
  `);
}

export function betPlacedHtml({ side, stake, marketTitle, resolutionDate }: {
  side: "YES" | "NO"; stake: number; marketTitle: string; resolutionDate: string;
}): string {
  const sideColor = side === "YES" ? YES_COLOR : NO_COLOR;
  return wrap(`
    ${eyebrow("Bet placed", "Dau limewekwa")}
    ${heading("Position open")}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Your pick", value: side },
      { label: "Stake", value: fmtTzs(stake) },
      { label: "Resolves", value: resolutionDate },
    ]).replace(`>${side}<`, ` style="color:${sideColor}">${side}<`)}
    ${subtitle("Payout is calculated at resolution from the final pool share.")}
    ${ctaButton("https://50pick.tz/positions", "View positions · Tazama madau")}
  `);
}

export function winNotificationHtml({ payout, stake, marketTitle }: {
  payout: number; stake: number; marketTitle: string;
}): string {
  const net = payout - stake;
  return wrap(`
    ${eyebrow("Position won", "Umeshinda")}
    ${heading(`You won ${fmtTzs(payout)}`, GILT)}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Payout", value: fmtTzs(payout), tone: "good" },
      { label: "Net profit", value: `+${fmtTzs(net)}`, tone: "good" },
      { label: "Stake", value: fmtTzs(stake) },
    ])}
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
  `);
}

export function lossNotificationHtml({ stake, marketTitle }: {
  stake: number; marketTitle: string;
}): string {
  return wrap(`
    ${eyebrow("Bet lost", "Dau limepotea")}
    ${heading(`Bet lost · ${fmtTzs(stake)}`)}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Stake lost", value: fmtTzs(stake), tone: "bad" },
    ])}
    ${subtitle("Most people play for fun. If it stops feeling fun, take a break.")}
    ${subtitleSw("Kama haifurahishi tena, pumzika.")}
    ${ctaButton("https://50pick.tz/profile/responsible-gambling", "Set limits · Weka mipaka")}
  `);
}

export function cashOutReceiptHtml({ value, stake, marketTitle }: {
  value: number; stake: number; marketTitle: string;
}): string {
  const net = value - stake;
  const profit = net >= 0;
  return wrap(`
    ${eyebrow("Position sold", "Imeuzwa")}
    ${heading(`Cashed out · ${fmtTzs(value)}`)}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Sellback", value: fmtTzs(value) },
      { label: "Net", value: `${profit ? "+" : "\u2212"}${fmtTzs(Math.abs(net))}`, tone: profit ? "good" : "bad" },
      { label: "Stake", value: fmtTzs(stake) },
    ])}
  `);
}

export function passwordResetHtml({ resetLink }: { resetLink: string }): string {
  return wrap(`
    ${eyebrow("Password reset", "Badilisha nenosiri")}
    ${heading("Reset your password")}
    ${subtitle("Click the button below to set a new password. This link expires in 1 hour.")}
    ${subtitleSw("Bonyeza kitufe hapa chini kuweka nenosiri jipya. Kiungo hiki kinaisha baada ya saa 1.")}
    ${ctaButton(resetLink, "Reset password · Badilisha")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If you didn't request this, ignore this email. Your password won't change.</p>
  `);
}

export function kycApprovedHtml({ name }: { name: string }): string {
  return wrap(`
    ${eyebrow("Identity verified", "Utambulisho umethibitishwa")}
    ${heading(`You're fully verified, ${name}`)}
    ${subtitle("Your identity has been confirmed. All platform features are now unlocked.")}
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
  `);
}

export function kycRejectedHtml({ reason }: { reason: string }): string {
  return wrap(`
    ${eyebrow("Identity check", "Ukaguzi wa utambulisho")}
    ${heading("Identity check needs attention")}
    ${subtitle(reason)}
    ${subtitleSw("Tafadhali angalia tena nyaraka zako na uwasilishe upya.")}
    ${ctaButton("https://50pick.tz/profile/kyc", "Resubmit · Wasilisha tena")}
  `);
}

export function selfExclusionHtml({ period, endDate }: { period: string; endDate: string }): string {
  return wrap(`
    ${eyebrow("Self-exclusion active", "Jizuie")}
    ${heading("Self-exclusion confirmed")}
    ${subtitle(`You've locked your account for <strong>${period}</strong>. Betting, deposits, and login are disabled until <strong>${endDate}</strong>. This cannot be reversed.`)}
    ${subtitleSw(`Akaunti yako imefungwa hadi ${endDate}. Hii haiwezi kubatilishwa.`)}
    ${detailRows([
      { label: "Period", value: period },
      { label: "Unlocks", value: endDate },
    ])}
    ${subtitle(`Need help? Contact the Tanzania Gambling Helpline: ${HELPLINE}`)}
  `);
}

export function coolOffHtml({ duration, endDate }: { duration: string; endDate: string }): string {
  return wrap(`
    ${eyebrow("Break active", "Pumzika")}
    ${heading("Break confirmed")}
    ${subtitle(`Login and betting are paused for <strong>${duration}</strong>. You'll be able to sign in again after <strong>${endDate}</strong>.`)}
    ${detailRows([
      { label: "Duration", value: duration },
      { label: "Resumes", value: endDate },
    ])}
  `);
}

export function amlRejectRefundHtml({ amount, reason }: { amount: number; reason: string }): string {
  return wrap(`
    ${eyebrow("Withdrawal returned", "Pesa imerudishwa")}
    ${heading("Withdrawal returned to wallet")}
    ${subtitle("Your withdrawal has been returned to your wallet balance.")}
    ${detailRows([
      { label: "Amount refunded", value: fmtTzs(amount) },
      { label: "Reason", value: reason },
    ])}
    ${subtitle(`If you have questions, contact <a href="mailto:${REPLY_TO}" style="color:${BRAND_LINK};text-decoration:none">${REPLY_TO}</a>`)}
  `);
}

export function referralRewardHtml({ amount, referredName, totalEarned }: {
  amount: number; referredName: string; totalEarned: number;
}): string {
  return wrap(`
    ${eyebrow("Referral reward", "Umepata tuzo")}
    ${heading(`You earned ${fmtTzs(amount)}`)}
    ${subtitle(`${referredName} joined through your referral link.`)}
    ${detailRows([
      { label: "Reward", value: fmtTzs(amount), tone: "good" },
      { label: "Total earned", value: fmtTzs(totalEarned) },
    ])}
    ${ctaButton("https://50pick.tz/profile/invite", "Invite more · Alika zaidi")}
  `);
}

export function loginNotificationHtml({ name, time, ip }: { name: string; time: string; ip: string }): string {
  return wrap(`
    ${eyebrow("Sign-in", "Umeingia")}
    ${heading(`Welcome back, ${name}`)}
    ${subtitle("You just signed in to your 50pick account.")}
    ${subtitleSw("Umeingia kwenye akaunti yako ya 50pick.")}
    ${detailRows([
      { label: "Time", value: time },
      { label: "IP address", value: ip },
    ])}
    ${ctaButton("https://50pick.tz/markets", "Browse markets · Tazama masoko")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If this wasn't you, change your password immediately and contact support.</p>
  `);
}

export function sessionRevokedHtml(): string {
  return wrap(`
    ${eyebrow("Security", "Usalama")}
    ${heading("Signed out on another device")}
    ${subtitle("Your account was signed in on another device. For security, your previous session was ended.")}
    ${subtitleSw("Akaunti yako imeingia kwenye kifaa kingine. Kikao chako kilichopita kimesitishwa.")}
    ${ctaButton("https://50pick.tz/auth/login", "Sign in again · Ingia tena")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If this wasn't you, change your password immediately.</p>
  `);
}
