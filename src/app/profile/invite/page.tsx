import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getPlayerReferralSummary } from "@/lib/server/affiliate-service";
import { FiftyMark } from "@/components/brand";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferralShare } from "./invite-client";

export const metadata = { title: "Invite & Earn · Alika upate" };
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default async function InvitePage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const s = getPlayerReferralSummary(session.userId);
  const ringValue = s.recruitCount === 0 ? 0 : Math.min(100, 30 + s.recruitCount * 12);
  const ringLabel = s.earnedTzs > 0 ? compact(s.earnedTzs) : "0";
  const shareText = "Join me on 50pick — predict and win. Use my link:";

  return (
    <div className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-3">
      <h1 className="sr-only">Invite &amp; Earn · Alika upate</h1>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[19px] font-bold leading-none">
            Invite &amp; Earn <span className="font-normal italic text-text-subtle text-[14px]">· Alika upate</span>
          </p>
        </div>
        <Chip variant={s.programEnabled ? "active" : "paused"}>{s.programEnabled ? "Active" : "Paused"}</Chip>
      </div>

      {/* Hero — gold earnings ring + adaptive promises */}
      <section
        className="relative overflow-hidden rounded-xl border border-border-strong p-[18px]"
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
            <Cap className="mb-1.5 !text-gold-300">Refer &amp; earn</Cap>
            <p className="font-display text-[19px] font-bold leading-tight">Invite friends. Earn together.</p>
            <p className="mt-0.5 font-display italic text-text-subtle text-[13px]">Alika marafiki. Pateni pamoja.</p>
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
                      <p className="text-[13px] font-medium leading-snug">{p.en}</p>
                      <p className="font-display italic text-text-subtle text-[10.5px]">{p.sw}</p>
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
          <span className="shrink-0" style={{ color: "oklch(84% 0.15 80)" }}><I.info s={16} /></span>
          <p className="text-[12px] leading-relaxed text-text-muted">
            The program is paused right now. Your link still works — rewards resume when it&rsquo;s back on.{" "}
            <span className="font-display italic text-text-subtle">Mpango umesimama kwa sasa.</span>
          </p>
        </div>
      )}

      {/* Referral link + share (client) */}
      <div id="referral-share">
        <ReferralShare link={s.link} shareText={shareText} />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label="Referrals" value={String(s.recruitCount)} sub={s.recruitCount > 0 ? "all-time" : "none yet"} />
        <Kpi label="Earned" value={s.earnedTzs > 0 ? s.earnedTzs.toLocaleString("en-US") : "0"} sub="TZS · all-time" gold />
      </div>

      {/* How it works */}
      <section className="rounded-xl glass-panel p-4">
        <p className="font-display text-[15px] font-bold leading-tight">
          How it works <span className="font-normal italic text-text-subtle text-[12px]">· Inavyofanya kazi</span>
        </p>
        <div className="mt-3 space-y-3">
          {[
            ["Share your link", "Shiriki kiungo chako"],
            ["They sign up & play", "Wanajisajili na kucheza"],
            ["You earn", "Wewe unapata"],
          ].map(([en, sw], i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-mono text-[14px] font-bold"
                style={
                  i === 2
                    ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))", color: "oklch(24% 0.06 85)", border: "1px solid var(--gold-700)" }
                    : { background: "color-mix(in oklab, var(--royal-500) 18%, transparent)", color: "var(--royal-200)", border: "1px solid color-mix(in oklab, var(--royal-500) 36%, transparent)" }
                }
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold">{en}</p>
                <p className="font-display italic text-text-subtle text-[11px]">{sw}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recruits */}
      <Cap className="!mt-1">Your referrals · Marafiki wako</Cap>
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
                <p className="font-mono text-[10px] text-text-subtle">joined {fmtDate(r.joinedAt)}</p>
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
          title="No referrals yet"
          titleSw="Bado hakuna marafiki"
          body="Share your link to invite your first friend. They'll appear here once they join."
          action={
            <a href="#referral-share">
              <Button variant="gold" size="md" leading={<I.share s={14} />}>
                Share your link
              </Button>
            </a>
          }
        />
      )}

      <p className="pt-1 text-center text-[10.5px] leading-relaxed text-text-subtle">
        Rewards are credited after a friend&rsquo;s activity clears. 18+. Terms apply.
      </p>
    </div>
  );
}
