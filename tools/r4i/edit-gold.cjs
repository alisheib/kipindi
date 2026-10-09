const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
const BRAND_CTA = "mt-2 inline-flex h-[40px] items-center px-3.5 rounded-pill border border-brand-500/60 bg-brand-500/10 font-display font-bold text-[12.5px] text-brand-300 hover:bg-brand-500/20 transition-colors";
const GOLD_CTA = "mt-2 inline-flex h-[40px] items-center px-3.5 rounded-pill border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20 transition-colors";
// 1 · the auth eyebrows: brand, the tone 2fa and verify-email already use. Gold leaves the map so no call site can ask it.
edit("src/components/auth/auth-panel.tsx", [
  [` * Colour discipline is inherited from <AuthShell>: gold here is the EYEBROW of a
 * sign-in/sign-up screen (chrome), never a figure — nothing is earned on the
 * auth surface.
 */`, ` * Colour discipline is inherited from <AuthShell>: NO gold — nothing is earned on the auth surface.
 * ⭐ R4-I (2026-10-09), on R4-K's gold audit (DESIGN_AUTHORITY Q5 "gold is money, and nothing else", §M3 "struck
 * gold appears only where money was earned"): the eyebrow (INGIA / SIGN IN / FUNGUA AKAUNTI) was gold by DEFAULT, the
 * one gold on a screen where nothing is earned. Its default is now \`brand\`, the tone /auth/2fa and /auth/verify-email
 * already pass, and \`gold\` is out of the map, so no call site can ask for it again.
 */`],
  [`export type AuthEyebrowTone = "gold" | "brand" | "no" | "yes";

const EYEBROW_TONE: Record<AuthEyebrowTone, string> = {
  gold: "text-gold-300",
  brand: "text-brand-300",`, `export type AuthEyebrowTone = "brand" | "no" | "yes";

const EYEBROW_TONE: Record<AuthEyebrowTone, string> = {
  brand: "text-brand-300",`],
  [`  tone = "gold",`, `  tone = "brand",`],
]);
// The sign-in and sign-up panels: the warning glyph in the muted ink, the call to action in the brand's.
edit("src/app/auth/login/page.tsx", [
  [`errorPanel.tone === "danger" ? "text-danger-fg" : "text-gold-300")}>`, `errorPanel.tone === "danger" ? "text-danger-fg" : "text-text-muted")}>`],
  [`                    /* ⚠️ LITERAL, not \`h-9\` — spacing is overridden (tailwind.config.ts:200-215),
                       so \`h-9\` was a 64px capsule around 12.5px type. 40px = --tap-min.
                       Twin of auth/register/register-form.tsx — keep the two in step. */
                    className="${GOLD_CTA}"`,
   `                    /* ⚠️ LITERAL, not \`h-9\` — spacing is overridden (tailwind.config.ts:200-215),
                       so \`h-9\` was a 64px capsule around 12.5px type. 40px = --tap-min.
                       Twin of auth/register/register-form.tsx — keep the two in step.
                       ⭐ R4-I (2026-10-09, R4-K's gold audit): the brand's ink, not gold — "Create one", "Reset password"
                       earn nothing (Q5, §M3); the warning glyph above is the muted ink for the same reason (F3). */
                    className="${BRAND_CTA}"`],
]);
edit("src/app/auth/register/register-form.tsx", [
  [`(errorPanel.tone === "danger" ? "text-danger-fg" : "text-gold-300")}>`, `(errorPanel.tone === "danger" ? "text-danger-fg" : "text-text-muted")}>`],
  [`                className="${GOLD_CTA}"`, `                /* R4-I · the brand's ink, not gold — twin of auth/login/page.tsx, which says why. */
                className="${BRAND_CTA}"`],
]);
edit("src/app/auth/forgot-password/page.tsx", [
  [`<div role="alert" className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-3 text-[13px] text-gold-300">`,
   `{/* R4-I (2026-10-09, R4-K's gold audit): the sentence in the muted ink, not gold — a wait earns nothing (F3, §M3). */}
            <div role="alert" className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-3 text-[13px] text-text-muted">`],
  [`<I.phone s={14} className="text-gold-300 shrink-0" />`, `<I.phone s={14} className="text-brand-300 shrink-0" />`],
  [`<I.mail s={14} className="text-gold-300 shrink-0" />`, `<I.mail s={14} className="text-brand-300 shrink-0" />`],
]);
// The register page's two bonus cards: gold only on the money figure itself.
edit("src/app/auth/register/page.tsx", [
  [`          {referral && (
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: "color-mix(in oklab, var(--gold-500) 36%, transparent)",
                background: "linear-gradient(135deg, color-mix(in oklab, var(--gold-500) 16%, var(--bg-elevated)), var(--bg-elevated))",
              }}
            >`,
   `          {/* ⭐ R4-I (2026-10-09, R4-K's gold audit — Q5 "gold is money, and nothing else"): a bonus IS money, so its FIGURE
              keeps gold (\`.amount\`); the card around it, its gift plate, its hint and the referral code are not money and
              wear the neutral card, the brand plate and the muted ink. They were a gilt card from edge to edge. */}
          {referral && (
            <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">`],
  [`                    <p className="mt-1 text-body-sm font-semibold text-gold-300">
                      {\`\${t.auth.signUpAndGet} \${formatTzs(referral.newPlayerBonusTzs)} \${t.auth.toStart}\`}
                    </p>`,
   `                    <p className="mt-1 text-body-sm font-semibold text-text-muted">
                      {t.auth.signUpAndGet} <span className="amount text-gold-300">{formatTzs(referral.newPlayerBonusTzs)}</span> {t.auth.toStart}
                    </p>`],
  [`          {invite && (
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: "color-mix(in oklab, var(--gold-500) 36%, transparent)",
                background: "linear-gradient(135deg, color-mix(in oklab, var(--gold-500) 16%, var(--bg-elevated)), var(--bg-elevated))",
              }}
            >`,
   `          {invite && (
            <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">`],
  [`                <IconPlate size={40} className="bg-gold-500/15 text-gold-300">`, `                <IconPlate size={40} className="bg-brand-500/15 text-brand-300">`],
  [`                  <p className="text-[14px] font-bold text-text">{t.auth.claimBonus} {formatTzs(invite.bonusAmountTzs)}</p>
                  <p className="mt-1 text-body-sm font-semibold text-gold-300">{t.auth.bonusWalletHint}</p>`,
   `                  <p className="text-[14px] font-bold text-text">{t.auth.claimBonus} <span className="amount text-gold-300">{formatTzs(invite.bonusAmountTzs)}</span></p>
                  <p className="mt-1 text-body-sm font-semibold text-text-muted">{t.auth.bonusWalletHint}</p>`],
  [`                  className="text-gold-300 font-semibold"`, `                  className="text-text font-semibold"`],
]);
// 2 · the deposit-paused tile and the limits page's break sentence: F3's "warning → factual" — neutral, glyph kept.
edit("src/app/wallet/deposit/page.tsx", [
  [`          <Callout
            tone="warning"
            layout="stack"
            glyph="lock"
            role="status"
            titleAs="h2"
            title={t.wallet.depositPausedTitle}
            bodyWidth="full"`,
   `          {/* R4-I (2026-10-09, R4-K's gold audit): \`neutral\`, not \`warning\` — the warning tone is struck in gilt
              (\`--warning-fg\` IS \`--gilt\`, DESIGN_AUTHORITY F3), and a paused deposit has earned nothing. The lock stays. */}
          <Callout
            tone="neutral"
            layout="stack"
            glyph="lock"
            role="status"
            titleAs="h2"
            title={t.wallet.depositPausedTitle}
            bodyWidth="full"`],
  [`          <Callout
            tone="warning"
            layout="stack"
            glyph="lock"
            role="status"
            titleAs="h2"
            title={t.wallet.depositPausedTitle}
            action={`,
   `          <Callout
            tone="neutral"
            layout="stack"
            glyph="lock"
            role="status"
            titleAs="h2"
            title={t.wallet.depositPausedTitle}
            action={`],
]);
edit("src/app/profile/responsible-gambling/page.tsx", [
  [`        <Callout tone="warning" size="md">{endSentence(t.rg.exclusionActive, rg.selfExclusionUntil)}</Callout>`,
   `        <Callout tone="neutral" size="md" glyph="lock">{endSentence(t.rg.exclusionActive, rg.selfExclusionUntil)}</Callout>`],
  [`        <Callout tone="warning" size="md">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>`,
   `        <Callout tone="neutral" size="md" glyph="pause">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>`],
  [`          run, and the Chinese sentence no longer leaves "现。" alone on its last line (\`keepText\`). */}`,
   `          run, and the Chinese sentence no longer leaves "现。" alone on its last line (\`keepText\`).
          ⭐ NEUTRAL, NOT WARNING (R4-K's gold audit, the same day): the warning tone is struck in gilt (\`--warning-fg\` IS
          \`--gilt\`, DESIGN_AUTHORITY F3) and a running break has earned nothing — the neutral box, each with its own
          section's glyph (the break's pause, the exclusion's lock). */}`],
]);
// R4-H · one mask for one phone.
edit("src/app/auth/otp/page.tsx", [
  [`import { phoneCodeSignInEnabled } from "@/lib/server/otp-door";`, `import { phoneCodeSignInEnabled } from "@/lib/server/otp-door";
import { maskPhone } from "@/lib/phone-normalize";`],
  [`  const masked = phone ? phone.slice(0, 4) + "*****" + phone.slice(-2) : "+255*****";`,
   `  // R4-I (2026-10-09, R4-H's E32): the platform's one mask (\`maskPhone\`, "+255••••84" — the hub's and the hero's), not a
  // hand-rolled "+255*****84": one phone reads one way everywhere.
  const masked = phone ? maskPhone(phone) : "+255••••";`],
]);
