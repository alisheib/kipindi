import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { currentSession } from "@/lib/server/auth-service";
import { getPlayerReferralSummary } from "@/lib/server/affiliate-service";
import QRCode from "qrcode";
import { FiftyMark, GiltCorner } from "@/components/brand";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferralShare } from "./invite-client";
import { formatDateShort as fmtDate } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Invite & Earn" };
export const dynamic = "force-dynamic";

/** Compact TZS for the ring center: 31000 → "31K", 1_284_000 → "1.3M". */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

const PROMISE_ICON = { percent: I.percent, ticket: I.ticket, gift: I.gift } as const;

/** Gold earnings ring — a brand-correct progress dial (NOT the betting
 *  ConfidenceDial, which is green/red). Pure kit tokens. */
function EarningsRing({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <svg width={96} height={96} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-overlay)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--gold-400)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 50 50)"
        style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--gold-300) 50%, transparent))" }}
      />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontWeight={700}
        fontSize="22"
        fill="var(--gold-300)"
        style={{ letterSpacing: "-0.03em" }}
      >
        {label}
      </text>
    </svg>
  );
}

function Cap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[9.5px] uppercase tracking-[0.1em] font-bold text-text-subtle ${className}`}>
      {children}
    </p>
  );
}

function Kpi({ label, value, sub, gold }: { label: string; value: string; sub: string; gold?: boolean }) {
  return (
    <div className="rounded-xl glass-panel p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <Cap>{label}</Cap>
        <span className="text-text-subtle">{gold ? <I.coins s={14} /> : <I.users s={14} />}</span>
      </div>
      <div className={`font-mono text-[24px] font-bold leading-none tracking-[-0.02em] ${gold ? "text-gold-300" : "text-text"}`}>
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] text-text-subtle">{sub}</div>
    </div>
  );
}

export default async function InvitePage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/profile/invite");

  const { t, locale } = await getServerT();
  let s: Awaited<ReturnType<typeof getPlayerReferralSummary>>;
  try { s = await getPlayerReferralSummary(session.userId); } catch { s = { code: "", link: "", recruitCount: 0, earnedTzs: 0, recruits: [], programEnabled: false, promises: [] }; }
  const ringValue = s.recruitCount === 0 ? 0 : Math.min(100, 30 + s.recruitCount * 12);
  const ringLabel = s.earnedTzs > 0 ? compact(s.earnedTzs) : "0";
  const shareText = t.profile.shareText;

  // Share-card QR (A9) — royal modules on white for scannability; sanctioned
  // raw-hex context. Encodes the referral link; graceful if the lib/link fails.
  let qrDataUrl = "";
  if (s.link) {
    try {
      qrDataUrl = await QRCode.toDataURL(s.link, { margin: 1, width: 240, color: { dark: "#0A0E4A", light: "#FFFFFF" } });
    } catch { /* graceful — card renders without the QR */ }
  }

  return (
    <div className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.common.profile} />
      <h1 className="sr-only">{t.profile.inviteEarn}</h1>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[19px] font-bold leading-none">
            {t.profile.inviteEarn}
          </p>
        </div>
        <Chip variant={s.programEnabled ? "active" : "paused"}>{s.programEnabled ? t.common.active : t.common.paused}</Chip>
      </div>

      {/* Hero — gold earnings ring + adaptive promises */}
      <section
        className="relative overflow-hidden rounded-xl border border-border-strong p-5"
        style={{ background: "linear-gradient(150deg, var(--bg-elevated), var(--royal-950))" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--gold-500) 12%, transparent), transparent 60%)" }}
        />
        <div className="relative flex items-center gap-4">
          <EarningsRing value={ringValue} label={ringLabel} />
          <div className="min-w-0 flex-1">
            <Cap className="mb-1.5 !text-gold-300">{t.profile.inviteEarn}</Cap>
            <p className="font-display text-[19px] font-bold leading-tight">{t.profile.inviteEarnSub}</p>
          </div>
        </div>

        {s.promises.length > 0 && (
          <>
            <div className="my-3.5 h-px bg-border" />
            <div className="space-y-2.5">
              {s.promises.map((p, i) => {
                const PIcon = PROMISE_ICON[p.icon];
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-gold-300"
                      style={{ background: "color-mix(in oklab, var(--gold-500) 16%, transparent)" }}
                    >
                      <PIcon s={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug">{locale === "sw" ? p.sw : p.en}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Paused banner */}
      {!s.programEnabled && (
        <div
          className="flex gap-2.5 rounded-xl border p-3"
          style={{
            background: "color-mix(in oklab, var(--warning-500) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)",
          }}
        >
          <span className="shrink-0" style={{ color: "var(--gold-300)" }}><I.info s={16} /></span>
          <p className="text-[12px] leading-relaxed text-text-muted">
            {t.profile.programPaused}
          </p>
        </div>
      )}

      {/* A9 share-card — the visual a referrer sends: FiftyMark, headline, the
          CODE in a GiltCorner frame, QR bottom-right. Shows the code, never a
          balance. Gold is principled here (the invite pays the referrer). */}
      <section className="relative overflow-hidden rounded-xl border p-5" style={{ background: "#060A50", borderColor: "var(--gold-700)" }}>
        <GiltCorner size={38} rotate={0} style={{ position: "absolute", top: 6, left: 6 }} />
        <GiltCorner size={38} rotate={180} style={{ position: "absolute", bottom: 6, right: 6 }} />
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <FiftyMark size={38} />
            <p className="mt-3 font-display text-[20px] font-bold leading-tight text-text">{t.common.youveBeenInvited}</p>
            <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] font-bold text-gold-300/70">{t.common.invite}</p>
            <div className="mt-1 inline-block rounded-md border border-gold-700 px-3 py-1.5" style={{ background: "color-mix(in oklab, var(--gold-500) 10%, transparent)" }}>
              <span className="font-mono text-[22px] font-bold tracking-[0.1em] text-gold-300">{s.code || "—"}</span>
            </div>
          </div>
          {qrDataUrl && (
            <div className="shrink-0 rounded-lg bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="" aria-hidden width={104} height={104} className="block" />
            </div>
          )}
        </div>
      </section>

      {/* Referral link + share (client) */}
      <div id="referral-share">
        <ReferralShare link={s.link} shareText={shareText} />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label={t.common.invite} value={String(s.recruitCount)} sub={s.recruitCount > 0 ? t.common.allTime : "—"} />
        <Kpi label={t.proposals.earned} value={s.earnedTzs > 0 ? s.earnedTzs.toLocaleString("en-US") : "0"} sub="TZS" gold />
      </div>

      {/* How it works */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-[15px] font-bold leading-tight">
          {t.profile.howItWorks}
        </p>
        <div className="mt-3 space-y-3">
          {[
            t.common.share + " " + t.profile.yourReferralLink.toLowerCase(),
            t.common.signUp + " & " + t.common.placeBet.toLowerCase(),
            t.proposals.earned,
          ].map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-[14px] font-bold"
                style={
                  i === 2
                    ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))", color: "var(--gold-950)", border: "1px solid var(--gold-700)" }
                    : { background: "color-mix(in oklab, var(--royal-500) 18%, transparent)", color: "var(--royal-200)", border: "1px solid color-mix(in oklab, var(--royal-500) 36%, transparent)" }
                }
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements banner — Management Bonus Rules §4 + §5 */}
      <section className="rounded-xl border border-border bg-bg-elevated/60 p-4 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle flex items-center gap-1.5">
          <I.shieldcheck s={11} />
          {t.profile.bonusRequirements}
        </p>
        <ul className="space-y-1.5 text-[12px] text-text-muted leading-snug list-disc pl-4">
          <li>{t.profile.inviteReqRegister}</li>
          <li>{t.profile.inviteReqDeposit}</li>
          <li>{t.profile.inviteReqBet}</li>
          <li>{t.profile.inviteReqWager}</li>
          <li>{t.profile.inviteReqExpiry}</li>
          <li>{t.profile.inviteReqSequential}</li>
        </ul>
      </section>

      {/* Recruits */}
      <Cap className="!mt-1">{t.profile.yourReferrals}</Cap>
      {s.recruits.length > 0 ? (
        <div className="overflow-hidden rounded-xl glass-panel">
          {s.recruits.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${i < s.recruits.length - 1 ? "border-b border-border" : ""}`}
            >
              <Avatar initials={r.maskedName.slice(0, 2)} size="sm" seed={r.maskedName} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12.5px] font-medium">{r.maskedName}</p>
                <p className="font-mono text-[10px] text-text-subtle">{t.common.joined} {fmtDate(r.joinedAt)}</p>
              </div>
              <Chip variant={r.earnedTzs > 0 ? "resolved" : "pending"}>{r.status}</Chip>
              <div className={`w-[64px] text-right font-mono text-[12.5px] font-semibold ${r.earnedTzs > 0 ? "text-gold-300" : "text-text-subtle"}`}>
                {r.earnedTzs > 0 ? "+" + r.earnedTzs.toLocaleString("en-US") : "—"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          kind="leaderboard"
          title={t.profile.noReferralsYet}
          body={t.profile.noReferralsBody}
          action={
            <a href="#referral-share">
              <Button variant="gold" size="md" leading={<I.share s={14} />}>
                {t.profile.shareWithFriends}
              </Button>
            </a>
          }
        />
      )}

      <p className="pt-1 text-center text-[10.5px] leading-relaxed text-text-subtle">
        {t.profile.rewardsDisclaimer}
      </p>
    </div>
  );
}
