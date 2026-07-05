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
import { resolvePhoneEmail } from "./email-map";
import { isSuppressed } from "./email-suppression";

const FROM = "noreply@50pick.tz";
const REPLY_TO = "support@50pick.tz";
const COMPANY = "50pick";
const HELPLINE = "+255 22 211 5811";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kipindi-production.up.railway.app";

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
  /** Set false for critical action links (e.g. the KYC "Review now" deep link)
   *  so Postmark does NOT rewrite them through its click-tracking redirect — a
   *  mis-set tracking domain would otherwise send the click "nowhere". */
  trackLinks?: boolean;
};

export async function sendEmail({ to, subject, html, tag, trackLinks = true }: SendInput): Promise<{ ok: boolean; messageId?: string }> {
  // Skip stub addresses (phone-only users without email)
  if (!to || to.endsWith("@stub") || to.endsWith("@none")) {
    return { ok: true };
  }
  // Skip addresses that hard-bounced or filed a spam complaint (Postmark webhook
  // → suppression list). Protects sender reputation; never throws.
  if (isSuppressed(to)) {
    console.log(`[email] suppressed (bounced/complained): ${to} | ${subject}`);
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
      TrackLinks: trackLinks ? LinkTrackingOptions.HtmlOnly : LinkTrackingOptions.None,
      MessageStream: "outbound",
    });
    return { ok: true, messageId: res.MessageID };
  } catch (err) {
    const e = err as Error & { statusCode?: number; errorCode?: number };
    console.error(`[email] Send failed: ${e.message} (to=${to}, statusCode=${e.statusCode ?? "?"}, errorCode=${e.errorCode ?? "?"})`);
    return { ok: false };
  }
}

// ─── Brand Kit v2 "Needle" — email design tokens ────────────────────────
// Matched to the email signature (50pick/Email Signatures/signature.html)

// Exact hex conversions of the OKLCH tokens in globals.css
const BRAND_BG = "#0c0e28";        // --bg-base
const BRAND_CARD = "#161845";       // --bg-elevated
const BRAND_BORDER = "#2b2e63";     // --border
const BORDER_STRONG = "#3d4189";    // --border-strong
const BRAND_LINK = "#7060d0";       // --brand-500
const GILT = "#e8c05a";             // --gold-300
const GILT_MID = "#c49a2e";         // --gold-500
const GILT_DARK = "#8a6c1a";        // --gold-700
const TEXT = "#f0eff4";             // --text
const TEXT_MUTED = "#c8c6d8";       // --text-muted
const TEXT_SUBTLE = "#8b89a8";      // --text-subtle
const TEXT_FAINT = "#5c5a78";       // --text-faint
const YES_COLOR = "#2db872";        // --yes-500
const NO_COLOR = "#c04848";         // --no-500

// Brand mark — hosted PNG from the real logo kit (never recreated)
const MARK_IMG = `<img src="${BASE_URL}/icons/mark-color-512.png" width="56" height="56" alt="50pick" class="sp-mark" style="display:block;margin:0 auto;border:0;max-width:56px;height:auto">`;

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<!-- Brand fonts. Clients that honor web fonts (Apple Mail, iOS Mail, some
     others) render Sora / JetBrains Mono / Inter; Gmail/Outlook ignore the
     link and fall back to the system stacks declared inline on every element,
     so text stays on-brand where possible and always legible elsewhere. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;700;800&family=JetBrains+Mono:wght@500;700&family=Inter:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  /* Mobile refinements. Modern clients (Apple Mail, iOS Mail, Gmail app, etc.)
     honour these; clients that ignore <style> keep the inline desktop styles,
     which already degrade cleanly. This is what stops the layout jamming on a
     phone: the CTA goes full-width instead of overflowing, and the two-column
     detail rows stack into label-over-value. */
  @media only screen and (max-width:600px) {
    .sp-wrap   { padding: 20px 10px !important; }
    .sp-card   { padding: 22px 18px 20px !important; }
    .sp-h1     { font-size: 21px !important; line-height: 1.18 !important; }
    .sp-cta    { display: block !important; width: auto !important; padding: 16px 14px !important; }
    .sp-mark   { width: 52px !important; height: 52px !important; }
    .sp-row-label { display: block !important; width: 100% !important; box-sizing: border-box !important;
                    text-align: left !important; padding: 12px 0 1px !important; border-bottom: 0 !important; }
    .sp-row-val   { display: block !important; width: 100% !important; box-sizing: border-box !important;
                    text-align: left !important; padding: 0 0 12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};color:${TEXT};font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND_BG}">
<tr><td align="center" class="sp-wrap" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;width:100%">

  <!-- Header: mark + wordmark -->
  <tr><td align="center" style="padding:0 0 24px">
    <a href="https://50pick.tz" style="text-decoration:none">
      ${MARK_IMG}
    </a>
    <div style="margin-top:10px;font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.015em">
      <a href="https://50pick.tz" style="color:${TEXT};text-decoration:none">
        <span style="color:${TEXT}">50pick</span><span style="color:${TEXT_MUTED};font-weight:500;font-size:14px;margin-left:2px">.tz</span>
      </a>
    </div>
  </td></tr>

  <!-- Gold top bar -->
  <tr><td><div style="height:3px;background:linear-gradient(90deg,${GILT_MID},${GILT},${GILT_MID});border-radius:3px 3px 0 0"></div></td></tr>

  <!-- Card body -->
  <tr><td class="sp-card" style="background:${BRAND_CARD};border:1px solid ${BRAND_BORDER};border-top:none;border-radius:0 0 12px 12px;padding:32px 28px 28px">
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 0 0;text-align:center">
    <!-- Gilt rule -->
    <div style="width:42px;height:2px;background:${GILT};border-radius:2px;margin:0 auto 16px"></div>
    <p style="margin:0;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${GILT_MID}">
      50pick.tz <span style="color:${NO_COLOR}">·</span> <span style="color:${TEXT_SUBTLE}">Soko la Utabiri</span>
    </p>
    <p style="margin:12px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_FAINT};line-height:1.7">
      18+ · Licensed by Gaming Board of Tanzania<br>
      Helpline ${HELPLINE} · <a href="mailto:${REPLY_TO}" style="color:${TEXT_SUBTLE};text-decoration:none">${REPLY_TO}</a>
    </p>
    <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:10px;color:${TEXT_FAINT}">
      You're receiving this because you have a 50pick account.<br>
      <a href="${BASE_URL}/profile/account" style="color:${TEXT_SUBTLE};text-decoration:underline">Manage preferences</a>
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
  return `<h1 style="margin:0 0 12px;font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:${color ?? TEXT};line-height:1.15;letter-spacing:-0.02em">${text}</h1>`;
}

/** Escape HTML entities — prevents XSS when interpolating user-supplied text
 *  (officer reason notes, market titles, references) into email HTML. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function subtitle(text: string): string {
  return `<p style="margin:0 0 16px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;color:${TEXT_MUTED};line-height:1.55">${esc(text)}</p>`;
}

function subtitleSw(text: string): string {
  return `<p style="margin:-10px 0 16px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;font-style:italic;color:${TEXT_SUBTLE};line-height:1.5">${esc(text)}</p>`;
}

function detailRows(rows: { label: string; value: string; tone?: "good" | "bad" }[]): string {
  // Two columns (label left, value right) on desktop; the sp-row-* classes stack
  // them label-over-value on phones so long values (amounts, references) never
  // collide with the label. word-break keeps a long reference from overflowing.
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${BRAND_BORDER};margin-top:20px">${rows.map(
    (r) => {
      const valColor = r.tone === "good" ? YES_COLOR : r.tone === "bad" ? NO_COLOR : TEXT;
      return `<tr><td class="sp-row-label" style="padding:11px 0;border-bottom:1px solid ${BRAND_BORDER};font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:${TEXT_FAINT};vertical-align:top">${esc(r.label)}</td><td class="sp-row-val" style="padding:11px 0;border-bottom:1px solid ${BRAND_BORDER};text-align:right;font-family:'JetBrains Mono','Courier New',monospace;font-size:14px;font-weight:700;color:${valColor};word-break:break-word">${esc(r.value)}</td></tr>`;
    },
  ).join("")}</table>`;
}

/** Resolve a path to an absolute URL. Email links MUST be absolute — a bare
 *  "/markets" is dead in an inbox. Pass a full http(s) URL through unchanged. */
function link(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function ctaButton(hrefOrPath: string, label: string): string {
  const href = link(hrefOrPath);
  // Desktop: centered inline pill. Mobile (.sp-cta): full-width block so a long
  // bilingual label can never overflow the card. mso block keeps Outlook happy.
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px"><tr><td align="center">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;v-text-anchor:middle;width:300px" arcsize="50%" fillcolor="${GILT_MID}"><w:anchorlock/><center style="color:#0c0e28;font-family:Segoe UI,sans-serif;font-size:14px;font-weight:700">${label}</center></v:roundrect><![endif]-->
    <!--[if !mso]><!-->
    <a href="${href}" class="sp-cta" style="display:inline-block;padding:15px 36px;background:${GILT_MID};color:#0c0e28;font-family:'Sora','Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;border-radius:999px;text-decoration:none;letter-spacing:-0.01em;border-top:1px solid ${GILT};border-bottom:2px solid ${GILT_DARK};text-align:center">${label}</a>
    <!--<![endif]-->
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

/** Format an ISO timestamp in East Africa Time, e.g. "13 Jun 2026, 14:32 EAT". */
const fmtDateTime = (iso?: string): string => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Africa/Dar_es_Salaam",
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) + " EAT";
  } catch { return iso; }
};

/** Standard footer line on money/bet receipts: keep the reference for support. */
function refNote(): string {
  return `<p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE};line-height:1.55">Keep this reference. If anything looks wrong, reply here or email <a href="mailto:${REPLY_TO}" style="color:${BRAND_LINK};text-decoration:none">${REPLY_TO}</a> and quote it — every action on your account is logged and traceable.<br><span style="font-style:italic;color:${TEXT_FAINT}">Hifadhi kumbukumbu hii kwa ajili ya msaada.</span></p>`;
}

// ─── User email lookup helper ───────────────────────────────────────────

/** Look up a user's email and send. Silently skips if no email on file.
 *  Fully best-effort: NEVER throws and NEVER blocks the caller's flow — a
 *  failed lookup or send must not break a bet, deposit, or KYC decision. Call
 *  sites fire-and-forget (no await), so any rejection is swallowed here. */
export async function sendEmailToUser(
  userId: string,
  build: (email: string) => SendInput,
): Promise<void> {
  try {
    const { db } = await import("./store");
    const user = await db.user.findById(userId);
    // Prefer the stored email; fall back to the live phone→email map so receipts
    // reach mapped accounts even if user.email was never persisted (matches how
    // login/welcome emails resolve the address).
    const email = user?.email || resolvePhoneEmail(user?.phoneE164 ?? "");
    if (!email) {
      console.warn(`[email] sendEmailToUser skipped — no email for user ${userId.slice(0, 14)}… (user.email=${user?.email ?? "null"}, phone=${user?.phoneE164?.slice(0, 6) ?? "?"}…)`);
      return;
    }
    const input = build(email);
    console.log(`[email] sending "${input.subject}" → ${email} (tag=${input.tag ?? "none"})`);
    const result = await sendEmail(input);
    if (!result.ok) console.warn(`[email] sendEmailToUser delivery failed for ${email} (subject="${input.subject}")`);
  } catch (err) {
    console.error("[email] sendEmailToUser failed:", (err as Error)?.message);
  }
}

// ─── Email templates ────────────────────────────────────────────────────

export function welcomeHtml({ name }: { name: string }): string {
  return wrap(`
    ${eyebrow("Welcome · Karibu")}
    ${heading(`Welcome to 50pick, ${name}`)}
    ${subtitle("Your account is ready. Browse markets, place your first prediction, and join the community.")}
    ${subtitleSw("Akaunti yako iko tayari. Tazama masoko na uweke utabiri wako wa kwanza.")}
    ${ctaButton("/markets", "Browse markets · Tazama masoko")}
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
    ${ctaButton("/wallet", "View wallet · Tazama pochi")}
  `);
}

export function withdrawalSentHtml({ amount, destination, reference }: {
  amount: number; destination: string; reference: string;
}): string {
  return wrap(`
    ${eyebrow("Withdrawal sent", "Pesa imetumwa")}
    ${heading("Withdrawal on its way")}
    ${subtitle("Your provider should pay out within moments.")}
    ${subtitleSw("Mtoa huduma wako atalipa hivi punde.")}
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

export function betPlacedHtml({ reference, side, stake, payoutIfWin, marketTitle, placedAt, resolutionDate }: {
  reference: string; side: "YES" | "NO"; stake: number; payoutIfWin?: number; marketTitle: string; placedAt?: string; resolutionDate: string;
}): string {
  return wrap(`
    ${eyebrow("Bet placed", "Dau limewekwa")}
    ${heading("Position open")}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Your pick", value: side, tone: side === "YES" ? "good" : "bad" },
      { label: "Stake", value: fmtTzs(stake) },
      ...(payoutIfWin ? [{ label: "Potential return", value: fmtTzs(payoutIfWin), tone: "good" as const }] : []),
      ...(placedAt ? [{ label: "Placed", value: fmtDateTime(placedAt) }] : []),
      { label: "Resolves", value: resolutionDate },
    ])}
    ${subtitle("Payout is calculated at resolution from the final pool share.")}
    ${subtitle("5-min free exit · You can sell this position within 5 minutes for a full refund at no cost. After that, a 9% fee applies on early exit.")}
    ${refNote()}
    ${ctaButton("/positions", "View positions · Tazama madau")}
  `);
}

export function winNotificationHtml({ reference, payout, stake, marketTitle, settledAt }: {
  reference: string; payout: number; stake: number; marketTitle: string; settledAt?: string;
}): string {
  const net = payout - stake;
  return wrap(`
    ${eyebrow("Position won", "Umeshinda")}
    ${heading(`You won ${fmtTzs(payout)}`, GILT)}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Payout", value: fmtTzs(payout), tone: "good" },
      { label: "Net profit", value: `+${fmtTzs(net)}`, tone: "good" },
      { label: "Stake", value: fmtTzs(stake) },
      ...(settledAt ? [{ label: "Settled", value: fmtDateTime(settledAt) }] : []),
    ])}
    ${refNote()}
    ${ctaButton("/positions", "View positions · Tazama madau")}
  `);
}

export function lossNotificationHtml({ reference, stake, marketTitle, settledAt }: {
  reference: string; stake: number; marketTitle: string; settledAt?: string;
}): string {
  return wrap(`
    ${eyebrow("Bet lost", "Dau limepotea")}
    ${heading(`Bet lost · ${fmtTzs(stake)}`)}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Stake lost", value: fmtTzs(stake), tone: "bad" },
      ...(settledAt ? [{ label: "Settled", value: fmtDateTime(settledAt) }] : []),
    ])}
    ${subtitle("Most people play for fun. If it stops feeling fun, take a break.")}
    ${subtitleSw("Kama haifurahishi tena, pumzika.")}
    ${refNote()}
    ${ctaButton("/profile/responsible-gambling", "Set limits · Weka mipaka")}
  `);
}

export function selectionClosedHtml({ marketTitle, closedAt, resolvesAt, marketId }: {
  marketTitle: string; closedAt?: string; resolvesAt?: string | null; marketId: string;
}): string {
  return wrap(`
    ${eyebrow("Selections closed", "Uchaguzi umefungwa")}
    ${heading("Waiting for results")}
    ${subtitle(marketTitle)}
    ${detailRows([
      { label: "Status", value: "Betting closed" },
      ...(closedAt ? [{ label: "Closed", value: fmtDateTime(closedAt) }] : []),
      ...(resolvesAt ? [{ label: "Results expected", value: fmtDateTime(resolvesAt) }] : []),
    ])}
    ${subtitle("Your prediction is locked in. We'll email you the moment the result is settled.")}
    ${subtitleSw("Utabiri wako umehifadhiwa. Tutakutumia matokeo mara yatakapotolewa.")}
    ${ctaButton(`/markets/${marketId}`, "View market · Tazama soko")}
  `);
}

export function cashOutReceiptHtml({ reference, value, stake, marketTitle, soldAt, gracePeriod }: {
  reference: string; value: number; stake: number; marketTitle: string; soldAt?: string; gracePeriod?: boolean;
}): string {
  const net = value - stake;
  const profit = net >= 0;
  return wrap(`
    ${eyebrow("Position sold", "Imeuzwa")}
    ${heading(`Cashed out · ${fmtTzs(value)}`)}
    ${subtitle(marketTitle)}
    ${gracePeriod ? `<p style="margin:12px 0;padding:10px 14px;background:oklch(40% 0.12 152 / 0.15);border-left:3px solid oklch(60% 0.14 152);border-radius:6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:oklch(80% 0.10 152)">Grace period exit — full stake returned, no fee applied.</p>` : ""}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Sellback", value: fmtTzs(value), tone: gracePeriod ? "good" as const : undefined },
      ...(gracePeriod ? [{ label: "Fee", value: "None (grace period)", tone: "good" as const }] : [{ label: "Net", value: `${profit ? "+" : "\u2212"}${fmtTzs(Math.abs(net))}`, tone: profit ? "good" as const : "bad" as const }]),
      { label: "Stake", value: fmtTzs(stake) },
      ...(soldAt ? [{ label: "Sold", value: fmtDateTime(soldAt) }] : []),
    ])}
    ${refNote()}
    ${ctaButton("/positions", "View positions \u00b7 Tazama madau")}
  `);
}

export function oneSidedRefundHtml({ reference, stake, marketTitle, settledAt }: {
  reference: string; stake: number; marketTitle: string; settledAt?: string;
}): string {
  return wrap(`
    ${eyebrow("Full refund", "Pesa imerudishwa")}
    ${heading(`Refunded · ${fmtTzs(stake)}`)}
    ${subtitle(marketTitle)}
    <p style="margin:12px 0;padding:10px 14px;background:oklch(40% 0.12 262 / 0.15);border-left:3px solid oklch(60% 0.14 262);border-radius:6px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:oklch(80% 0.10 262)">All bets were placed on the same side — no opposing pool existed to pay winnings from. Your full stake has been returned at no fee.</p>
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Refunded", value: fmtTzs(stake), tone: "good" },
      { label: "Fee", value: "None" },
      ...(settledAt ? [{ label: "Settled", value: fmtDateTime(settledAt) }] : []),
    ])}
    ${refNote()}
    ${ctaButton("/markets", "Browse markets \u00b7 Angalia masoko")}
  `);
}

export function inviteHtml({ campaignName, bonusAmountTzs, code, message }: {
  campaignName: string; bonusAmountTzs: number; code: string; message?: string;
}): string {
  return wrap(`
    ${eyebrow("You're invited · Umealikwa")}
    ${heading(`Get a TZS ${Math.round(bonusAmountTzs).toLocaleString("en-US")} bonus on 50pick`)}
    ${subtitle(message?.trim() ? message.trim() : "Join 50pick and start predicting. Your welcome bonus is waiting.")}
    ${subtitleSw("Jiunge na 50pick uanze kutabiri. Bonasi yako ya kukukaribisha inakusubiri.")}
    ${detailRows([
      { label: "Welcome bonus", value: fmtTzs(bonusAmountTzs), tone: "good" },
      { label: "Invite code", value: code },
      { label: "Campaign", value: campaignName },
    ])}
    ${ctaButton(`/auth/register?invite=${encodeURIComponent(code)}`, "Claim your bonus · Pata bonasi")}
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

export function kycApprovedHtml({ name, reference }: { name: string; reference?: string }): string {
  return wrap(`
    ${eyebrow("Identity verified", "Utambulisho umethibitishwa")}
    ${heading(`You're fully verified, ${name}`)}
    ${subtitle("Your identity is confirmed — you can now deposit, place bets, and withdraw.")}
    ${subtitleSw("Utambulisho wako umethibitishwa — sasa unaweza kuweka pesa, kuweka dau, na kutoa pesa.")}
    ${reference ? detailRows([{ label: "Reference", value: reference }]) : ""}
    ${ctaButton("/markets", "Browse markets · Tazama masoko")}
  `);
}

export function kycRejectedHtml({ reason, reference }: { reason: string; reference?: string }): string {
  return wrap(`
    ${eyebrow("Identity check", "Ukaguzi wa utambulisho")}
    ${heading("Identity check needs attention")}
    ${subtitle(reason)}
    ${subtitleSw("Tafadhali angalia tena nyaraka zako na uwasilishe upya.")}
    ${reference ? detailRows([{ label: "Reference", value: reference }]) : ""}
    ${ctaButton("/profile/kyc", "Resubmit · Wasilisha tena")}
  `);
}

/**
 * Sent to the player the moment their KYC enters PENDING_REVIEW. Confirms the
 * documents landed, carries the reference, and sets expectations on timing.
 * Honest about the locked-during-review behaviour (Decision #1: reply-to-reopen).
 */
export function kycSubmittedHtml({ name, reference, submittedAt, docTypes, viewUrl }: {
  name?: string; reference: string; submittedAt: string; docTypes: string[]; viewUrl?: string;
}): string {
  // Map raw docType codes to a friendly, bilingual-safe label list.
  const friendly: Record<string, string> = { NIDA_FRONT: "ID front", NIDA_BACK: "ID back", SELFIE: "selfie" };
  const docList = docTypes.map((d) => friendly[d] ?? d.replace(/_/g, " ").toLowerCase()).join(", ") || "—";
  return wrap(`
    ${eyebrow("Documents received · Nyaraka zimepokelewa")}
    ${heading("We're reviewing your documents")}
    ${subtitle(`Thanks${name ? `, ${name}` : ""}. Your ID documents are in and our team is verifying them. You'll get an email the moment it's decided — usually within a few hours during business hours.`)}
    ${subtitleSw("Asante. Nyaraka zako zimepokelewa na timu yetu inazithibitisha. Utapata barua pepe mara tu uamuzi utakapotolewa.")}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Submitted", value: fmtDateTime(submittedAt) },
      { label: "Documents", value: docList },
      { label: "Status", value: "Pending verification" },
    ])}
    <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE};line-height:1.55">Need to change a document? Reply to this email and we'll reopen your submission. Your documents are locked while under review.<br><span style="font-style:italic;color:${TEXT_FAINT}">Unahitaji kubadilisha nyaraka? Jibu barua pepe hii.</span></p>
    ${refNote()}
    ${ctaButton(viewUrl ?? "/profile/kyc", "View your submission · Tazama")}
  `);
}

/**
 * Sent to the player when an officer needs more / clearer documents or extra
 * information before they can decide (status → ADDITIONAL_INFO_REQUIRED). The
 * `reason` is the officer's free-text note. Their documents are unlocked so
 * they can update and resubmit.
 */
export function kycMoreInfoHtml({ reason, reference }: { reason: string; reference?: string }): string {
  return wrap(`
    ${eyebrow("More information needed", "Tunahitaji maelezo zaidi")}
    ${heading("We need a little more to verify you")}
    ${subtitle(reason)}
    ${subtitleSw("Tafadhali rekebisha au ongeza nyaraka zilizoombwa, kisha uwasilishe tena. Hii si kukataliwa — tunahitaji tu kitu kimoja zaidi.")}
    ${reference ? detailRows([{ label: "Reference", value: reference }, { label: "Status", value: "Awaiting your update" }]) : ""}
    <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE};line-height:1.55">Your documents are unlocked — open the link below, replace or add what's asked, and submit again. Nothing else changes on your account.</p>
    ${ctaButton("/profile/kyc", "Update & resubmit · Sasisha")}
  `);
}

/**
 * Sent to compliance / ops when a new submission needs review. Deliberately
 * carries NO images, NO full NIDA, NO DOB — the reviewer opens the secured
 * admin drill-in to see the evidence. NIDA is masked to the last 4 digits.
 */
export function kycSubmittedAdminHtml({ reference, phoneMasked, name, nidaMasked, submittedAt, reviewUrl }: {
  reference: string; phoneMasked: string; name: string; nidaMasked: string; submittedAt: string; reviewUrl: string;
}): string {
  return wrap(`
    ${eyebrow("KYC · awaiting review")}
    ${heading("New identity submission to verify")}
    ${subtitle("A player has submitted their identity documents and is waiting on a compliance decision.")}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Player", value: `${name} · ${phoneMasked}` },
      { label: "NIDA", value: nidaMasked },
      { label: "Submitted", value: fmtDateTime(submittedAt) },
    ])}
    ${ctaButton(reviewUrl, "Review now")}
  `);
}

/**
 * Sent to every admin/officer when a REAL market's event time has passed and it
 * is waiting for the two-officer resolution. Mirrors the KYC admin email: a
 * clear nudge with a button straight to the resolver queue. Carries only the
 * market title — the outcome decision happens in the secured admin surface.
 */
export function marketResolutionAdminHtml({ title, closedAt, reviewUrl }: {
  title: string; closedAt: string; reviewUrl: string;
}): string {
  return wrap(`
    ${eyebrow("Market · awaiting resolution")}
    ${heading("A market has closed and needs resolving")}
    ${subtitle("Its event time has passed. Two officers must confirm the outcome before winners are paid.")}
    ${detailRows([
      { label: "Market", value: title },
      { label: "Closed", value: fmtDateTime(closedAt) },
    ])}
    ${ctaButton(reviewUrl, "Resolve now")}
  `);
}

/**
 * Player email when a market is cancelled (emergency void). States the admin's
 * REASON and confirms the full stake was refunded to their wallet.
 */
export function marketCancelledRefundHtml({ title, reason, amount, reference }: {
  title: string; reason: string; amount: number; reference: string;
}): string {
  return wrap(`
    ${eyebrow("Market cancelled · Soko limefutwa")}
    ${heading("Your stake has been refunded")}
    ${subtitle(`We had to cancel a market you'd staked on. Your full stake has been returned to your 50pick wallet — you've lost nothing.`)}
    ${subtitleSw("Tumelazimika kufuta soko ulilokuwa umeweka dau. Dau lako lote limerejeshwa kwenye pochi yako.")}
    ${detailRows([
      { label: "Market", value: title },
      { label: "Reason", value: reason },
      { label: "Refunded to wallet", value: fmtTzs(amount), tone: "good" },
      { label: "Reference", value: reference },
    ])}
    ${ctaButton("/wallet", "View wallet · Pochi")}
  `);
}

/** Officer email confirming an emergency void completed (with the reason). */
export function marketCancelledAdminHtml({ title, reason, refundedCount, refundedTzs }: {
  title: string; reason: string; refundedCount: number; refundedTzs: number;
}): string {
  return wrap(`
    ${eyebrow("Market cancelled · confirmation")}
    ${heading("Market voided & players refunded")}
    ${subtitle("An emergency void completed successfully. Every open stake was refunded in full and the market is closed.")}
    ${detailRows([
      { label: "Market", value: title },
      { label: "Reason", value: reason },
      { label: "Players refunded", value: String(refundedCount) },
      { label: "Total refunded", value: fmtTzs(refundedTzs) },
    ])}
    ${ctaButton("/admin/markets", "Open markets")}
  `);
}

/**
 * Email-address confirmation. Sent when a player sets or changes their email
 * (profile or KYC step). The link carries a stateless HMAC-signed token that
 * embeds the address, so changing the email invalidates older links.
 */
export function emailVerifyHtml({ name, verifyUrl }: { name?: string; verifyUrl: string }): string {
  return wrap(`
    ${eyebrow("Confirm your email · Thibitisha barua pepe")}
    ${heading("Confirm your email address")}
    ${subtitle(`${name ? `${name}, please` : "Please"} confirm this is your email so we can send you account, deposit, withdrawal, and verification notices. This link expires in 24 hours.`)}
    ${subtitleSw("Tafadhali thibitisha barua pepe yako ili tuweze kukutumia taarifa za akaunti. Kiungo hiki kinaisha baada ya saa 24.")}
    ${ctaButton(verifyUrl, "Confirm email · Thibitisha")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If you didn't add this email to a 50pick account, ignore this message — nothing will change.</p>
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
    ${subtitleSw("Rafiki uliyemwalika amejiunga — umepata tuzo.")}
    ${detailRows([
      { label: "Reward", value: fmtTzs(amount), tone: "good" },
      { label: "Total earned", value: fmtTzs(totalEarned) },
    ])}
    ${ctaButton("/profile/invite", "Invite more · Alika zaidi")}
  `);
}

/** Referral earning (commission / bonus / prize) landed in the wallet. Unified
 *  so every referral money event emails the player consistently. */
export function referralEarningHtml({ type, amountTzs }: {
  type: "COMMISSION" | "BONUS" | "PRIZE"; amountTzs: number;
}): string {
  const en = type === "COMMISSION" ? "Referral commission earned"
    : type === "BONUS" ? "Referral bonus added"
    : "Milestone reward";
  const sw = type === "COMMISSION" ? "Umepata kamisheni ya rafiki"
    : type === "BONUS" ? "Bonasi ya rafiki imeongezwa"
    : "Zawadi ya hatua";
  return wrap(`
    ${eyebrow("Referral reward", sw)}
    ${heading(`${en} · ${fmtTzs(amountTzs)}`)}
    ${subtitle("It's in your wallet. Keep inviting friends to earn more.")}
    ${subtitleSw("Ipo kwenye pochi yako. Endelea kualika marafiki kupata zaidi.")}
    ${detailRows([{ label: "Reward", value: fmtTzs(amountTzs), tone: "good" }])}
    ${ctaButton("/profile/invite", "Invite more · Alika zaidi")}
  `);
}

// ─── Player market-proposal emails ──────────────────────────────────────

/** Player: proposal received, under review. Sent on submit. */
export function proposalSubmittedHtml({ titleEn, reference, submittedAt }: {
  titleEn: string; reference: string; submittedAt: string;
}): string {
  return wrap(`
    ${eyebrow("Proposal received", "Pendekezo limepokelewa")}
    ${heading("The 50pick team is reviewing your proposal")}
    ${subtitle(`Thanks for suggesting a market. Our team is reviewing "${titleEn}" and we'll notify you as soon as there's a decision.`)}
    ${subtitleSw("Asante kwa kupendekeza soko. Timu yetu inalikagua na tutakujulisha haraka iwezekanavyo.")}
    ${detailRows([
      { label: "Proposal", value: titleEn },
      { label: "Reference", value: reference },
      { label: "Submitted", value: fmtDateTime(submittedAt) },
      { label: "Status", value: "Under review" },
    ])}
    ${ctaButton("/proposals?f=mine", "View your proposals · Tazama")}
  `);
}

/** Officers: a new proposal is awaiting review. Carries source link + proposer. */
export function proposalSubmittedAdminHtml({ reference, proposer, titleEn, titleSw, category, sourceUrl, reviewUrl }: {
  reference: string; proposer: string; titleEn: string; titleSw: string | null; category: string; sourceUrl: string; reviewUrl: string;
}): string {
  const srcIsLink = /^https?:\/\//.test(sourceUrl);
  const srcHtml = srcIsLink
    ? `<a href="${esc(sourceUrl)}" style="color:${BRAND_LINK};text-decoration:none;word-break:break-all">${esc(sourceUrl)}</a>`
    : esc(sourceUrl);
  return wrap(`
    ${eyebrow("Proposal · awaiting review")}
    ${heading("New market proposal to review")}
    ${subtitle(`${proposer} submitted a market proposal. Approve it to pay the proposer's bonus, or send it back / decline.`)}
    ${detailRows([
      { label: "Reference", value: reference },
      { label: "Proposer", value: proposer },
      { label: "Title (EN)", value: titleEn },
      ...(titleSw ? [{ label: "Title (SW)", value: titleSw }] : []),
      { label: "Category", value: category },
    ])}
    <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:${TEXT_MUTED};line-height:1.55"><span style="font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:${TEXT_FAINT}">Source</span><br>${srcHtml}</p>
    ${ctaButton(reviewUrl, "Review proposal")}
  `);
}

/** Player: proposal approved — reward bonus credited. */
export function proposalApprovedHtml({ titleEn, amountTzs, wagerRequiredTzs }: {
  titleEn: string; amountTzs: number; wagerRequiredTzs: number;
}): string {
  if (amountTzs > 0) {
    return wrap(`
      ${eyebrow("Proposal approved", "Pendekezo limekubaliwa")}
      ${heading(`Approved · bonus ${fmtTzs(amountTzs)} credited`, GILT)}
      ${subtitle(`Great news — "${titleEn}" was approved and your reward has landed in your bonus wallet.`)}
      ${subtitleSw("Habari njema — pendekezo lako limekubaliwa na zawadi yako ipo kwenye pochi yako ya bonasi.")}
      ${detailRows([
        { label: "Bonus credited", value: fmtTzs(amountTzs), tone: "good" },
        ...(wagerRequiredTzs > 0 ? [{ label: "Play-through", value: fmtTzs(wagerRequiredTzs) }] : []),
        { label: "Wallet", value: "Bonus wallet" },
      ])}
      ${wagerRequiredTzs > 0 ? subtitle(`Play through ${fmtTzs(wagerRequiredTzs)} in bets and it becomes withdrawable cash.`) : ""}
      ${ctaButton("/wallet", "View bonus wallet · Pochi ya bonasi")}
    `);
  }
  return wrap(`
    ${eyebrow("Proposal approved", "Pendekezo limekubaliwa")}
    ${heading("Your proposal was approved")}
    ${subtitle(`"${titleEn}" was approved by the 50pick team. Thanks for helping shape the markets.`)}
    ${subtitleSw("Pendekezo lako limekubaliwa na timu ya 50pick. Asante.")}
    ${ctaButton("/proposals?f=mine", "View your proposals · Tazama")}
  `);
}

/** Player: proposal is now a live market. */
export function proposalListedHtml({ titleEn, marketId }: { titleEn: string; marketId: string }): string {
  return wrap(`
    ${eyebrow("Proposal is live", "Pendekezo ni soko sasa")}
    ${heading("Your proposal is now a live market")}
    ${subtitle(`"${titleEn}" is open for predictions. Share it and watch the pool build.`)}
    ${subtitleSw("Soko lako sasa liko wazi kwa utabiri. Lishiriki.")}
    ${ctaButton(`/markets/${marketId}`, "View market · Tazama soko")}
  `);
}

/** Player: changes requested before the proposal can be approved. */
export function proposalChangesHtml({ titleEn, note }: { titleEn: string; note: string | null }): string {
  return wrap(`
    ${eyebrow("Changes requested", "Marekebisho yanahitajika")}
    ${heading("A tweak is needed on your proposal")}
    ${subtitle(note ? `On "${titleEn}", our team noted: ${note}` : `"${titleEn}" needs a small change before it can be approved.`)}
    ${subtitleSw("Pendekezo lako linahitaji marekebisho madogo kabla ya kukubaliwa.")}
    ${ctaButton("/proposals?f=mine", "View your proposals · Tazama")}
  `);
}

/** Player: proposal declined, with reason. No bonus. */
export function proposalDeclinedHtml({ titleEn, reason, note }: { titleEn: string; reason: string; note: string | null }): string {
  return wrap(`
    ${eyebrow("Proposal update", "Taarifa ya pendekezo")}
    ${heading("We couldn't list this proposal")}
    ${subtitle(`Thanks for suggesting "${titleEn}". After review it wasn't a fit this time.`)}
    ${detailRows([
      { label: "Reason", value: reason },
      ...(note ? [{ label: "Note", value: note }] : []),
    ])}
    ${subtitle("Don't let this stop you — propose another market anytime.")}
    ${subtitleSw("Usikate tamaa — pendekeza soko lingine wakati wowote.")}
    ${ctaButton("/proposals/new", "Propose another · Pendekeza")}
  `);
}

/** Admin alert — Market Sentinel sweep failing. Kit-styled (was bespoke HTML). */
export function sentinelDownAdminHtml({ reason, errorCount, sampleError }: {
  reason: string; errorCount: number; sampleError: string;
}): string {
  return wrap(`
    ${eyebrow("Market Sentinel", "Mlinzi wa soko")}
    ${heading("Market Sentinel is failing")}
    ${subtitle(`On its last sweep the auto-close AI could not check ${errorCount} market(s), so a just-settled market could stay open to betting.`)}
    ${subtitle("Most likely fix: the Anthropic API balance is exhausted or the key is invalid — check Plans & Billing and ANTHROPIC_API_KEY.")}
    ${detailRows([
      { label: "Reason", value: reason, tone: "bad" },
      { label: "Markets affected", value: String(errorCount) },
      { label: "Last error", value: sampleError.slice(0, 200) },
    ])}
    ${ctaButton("/admin/system", "Open admin · Fungua")}
  `);
}

/** Admin alert — AI cycle spend nearing/at the configured budget. Kit-styled. */
export function aiCreditLimitAdminHtml({ level, spentUsd, limitUsd }: {
  level: "warn" | "limit"; spentUsd: number; limitUsd: number;
}): string {
  const reached = level === "limit";
  const spent = `$${spentUsd.toFixed(2)}`;
  const limit = `$${limitUsd.toFixed(2)}`;
  return wrap(`
    ${eyebrow("AI spend", "Matumizi ya AI")}
    ${heading(reached ? `AI spend reached the ${limit} limit` : `AI spend nearing the ${limit} limit`)}
    ${subtitle(reached
      ? "AI features (poll generation, the help chatbot, the market sentinel) will stop once Anthropic credit runs out. Top up credit on the Anthropic console, then reset the cycle on the AI usage page."
      : "Plan a top-up soon. You'll get one more email if spend reaches the full limit.")}
    ${detailRows([
      { label: "Spent this cycle", value: spent, tone: reached ? "bad" : undefined },
      { label: "Budget", value: limit },
    ])}
    ${ctaButton("/admin/ai-usage", "AI usage & credits")}
  `);
}

export function bonusCreditedHtml({ amountTzs, wagerRequiredTzs, sourceLabel }: {
  amountTzs: number; wagerRequiredTzs: number; sourceLabel?: string;
}): string {
  return wrap(`
    ${eyebrow("Bonus added", "Bonasi imeongezwa")}
    ${heading(`Bonus added · ${fmtTzs(amountTzs)}`)}
    ${subtitle(`${sourceLabel ? sourceLabel + ". " : ""}Play through ${fmtTzs(wagerRequiredTzs)} in bets and it becomes withdrawable cash.`)}
    ${subtitleSw(`Cheza dau ya ${fmtTzs(wagerRequiredTzs)} ili kuibadilisha kuwa pesa unayoweza kutoa.`)}
    ${detailRows([
      { label: "Bonus", value: fmtTzs(amountTzs), tone: "good" },
      { label: "Play-through", value: fmtTzs(wagerRequiredTzs) },
    ])}
    ${ctaButton("/wallet", "View wallet · Pochi")}
  `);
}

export function bonusFulfilledHtml({ amountTzs }: { amountTzs: number }): string {
  return wrap(`
    ${eyebrow("Bonus unlocked", "Bonasi imefunguliwa")}
    ${heading(`Bonus unlocked · ${fmtTzs(amountTzs)}`)}
    ${subtitle(`You finished the play-through — ${fmtTzs(amountTzs)} is now real, withdrawable balance.`)}
    ${subtitleSw(`Umemaliza masharti — ${fmtTzs(amountTzs)} sasa ni pesa halisi unayoweza kutoa.`)}
    ${detailRows([{ label: "Now withdrawable", value: fmtTzs(amountTzs), tone: "good" }])}
    ${ctaButton("/wallet", "Withdraw · Toa pesa")}
  `);
}

/** Source-of-Funds review outcome. status drives the copy + CTA. */
export function sofDecisionHtml({ status, note }: {
  status: "ACCEPTED" | "REJECTED" | "MORE_INFO"; note?: string;
}): string {
  if (status === "ACCEPTED") {
    return wrap(`
      ${eyebrow("Source of funds", "Chanzo cha fedha")}
      ${heading("Source of funds accepted")}
      ${subtitle("Your source-of-funds review is complete. Higher deposit and withdrawal limits are now unlocked.")}
      ${subtitleSw("Ukaguzi wa chanzo cha fedha umekamilika. Vikomo vya juu sasa vimefunguliwa.")}
      ${ctaButton("/wallet/deposit", "Make a deposit · Weka pesa")}
    `);
  }
  if (status === "MORE_INFO") {
    return wrap(`
      ${eyebrow("Source of funds", "Chanzo cha fedha")}
      ${heading("We need a bit more")}
      ${subtitle(note ? `Our compliance team needs more information: ${note}` : "Our compliance team needs more information to complete your source-of-funds review.")}
      ${subtitleSw("Timu yetu inahitaji maelezo zaidi kukamilisha ukaguzi.")}
      ${ctaButton("/profile/source-of-funds", "Update details · Sasisha")}
    `);
  }
  return wrap(`
    ${eyebrow("Source of funds", "Chanzo cha fedha")}
    ${heading("Source of funds not accepted")}
    ${subtitle(note ? `Your source-of-funds submission wasn't accepted: ${note}` : "Your source-of-funds submission wasn't accepted. You can resubmit with updated information.")}
    ${subtitleSw("Wasilisho lako halikukubaliwa. Unaweza kuwasilisha tena.")}
    ${ctaButton("/profile/source-of-funds", "Resubmit · Wasilisha tena")}
  `);
}

export function sofSubmittedHtml(): string {
  return wrap(`
    ${eyebrow("Compliance", "Uzingatiaji")}
    ${heading("Source of funds received")}
    ${subtitle("We've received your source-of-funds declaration. Our compliance team will review it shortly and let you know once it's cleared.")}
    ${subtitleSw("Tumeipokea taarifa yako ya chanzo cha fedha. Timu yetu itaipitia na kukujulisha ikikamilika.")}
    ${ctaButton("/profile/source-of-funds", "View status · Tazama hali")}
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
    ${ctaButton("/markets", "Browse markets · Tazama masoko")}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If this wasn't you, change your password immediately and contact support.</p>
  `);
}

/** Security alert sent whenever the account password changes (self-service
 *  change, reset-link completion, or officer-issued temporary password). */
export function passwordChangedHtml({ time, method }: { time: string; method: string }): string {
  return wrap(`
    ${eyebrow("Security", "Usalama")}
    ${heading("Your password was changed")}
    ${subtitle("The password on your 50pick account was just changed.")}
    ${subtitleSw("Nenosiri la akaunti yako ya 50pick limebadilishwa.")}
    ${detailRows([
      { label: "When", value: time },
      { label: "How", value: method },
    ])}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If you did NOT do this, your account may be compromised — reset your password and contact <a href="mailto:${REPLY_TO}" style="color:${BRAND_LINK};text-decoration:none">${REPLY_TO}</a> immediately.</p>
  `);
}

/** Security alert sent to the PREVIOUS address whenever the account email is
 *  changed — so an account-takeover that swaps the email still notifies the
 *  real owner on the address they still control. */
export function emailChangedHtml({ newEmail, time }: { newEmail: string; time: string }): string {
  return wrap(`
    ${eyebrow("Security", "Usalama")}
    ${heading("Your email was changed")}
    ${subtitle("The email address on your 50pick account was just changed.")}
    ${subtitleSw("Anwani ya barua pepe ya akaunti yako ya 50pick imebadilishwa.")}
    ${detailRows([
      { label: "When", value: time },
      { label: "New address", value: newEmail },
    ])}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If you did NOT do this, your account may be compromised — contact <a href="mailto:${REPLY_TO}" style="color:${BRAND_LINK};text-decoration:none">${REPLY_TO}</a> immediately.</p>
  `);
}

/** Confirmation sent when a player closes their own account. */
export function accountClosedHtml({ name, time }: { name: string; time: string }): string {
  return wrap(`
    ${eyebrow("Account", "Akaunti")}
    ${heading(`Your account is closed, ${name}`)}
    ${subtitle("Your 50pick account has been closed as you requested. Deposits, withdrawals and betting are disabled. Any open positions will settle out normally.")}
    ${subtitleSw("Akaunti yako ya 50pick imefungwa kama ulivyoomba.")}
    ${detailRows([
      { label: "Closed", value: time },
    ])}
    <p style="margin:16px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:${TEXT_SUBTLE}">If you did NOT request this, contact <a href="mailto:${REPLY_TO}" style="color:${BRAND_LINK};text-decoration:none">${REPLY_TO}</a> immediately.</p>
  `);
}

/** Officer alert: a transaction is awaiting AML clearance in the review queue. */
export function amlReviewAdminHtml({ amount, kind, reference }: { amount: number; kind: string; reference: string }): string {
  return wrap(`
    ${eyebrow("Compliance", "AML")}
    ${heading("Transaction awaiting AML review")}
    ${subtitle(`A ${kind.toLowerCase()} has crossed the AML threshold and needs officer clearance.`)}
    ${detailRows([
      { label: "Type", value: kind },
      { label: "Amount", value: fmtTzs(amount) },
      { label: "Reference", value: reference },
    ])}
    ${ctaButton("/admin/aml", "Open AML queue")}
  `);
}
