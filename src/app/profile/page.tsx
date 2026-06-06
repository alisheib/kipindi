import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/name-editor";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredBet } from "@/lib/server/store";
import { displayInitials } from "@/lib/display-label";
import { BadgeShelf } from "@/components/badges/Badge";
import { computeAchievementShelf } from "@/lib/server/achievements";

export const metadata = { title: "Profile · Wasifu" };
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

/** Mask a Tanzanian E.164 phone for on-screen display per PDPA / GBT
 *  data-minimisation: keep prefix + 2 trailing digits, mask the rest. */
function maskPhone(phoneE164: string): string {
  if (phoneE164.length <= 6) return phoneE164;
  return `${phoneE164.slice(0, 4)}*****${phoneE164.slice(-2)}`;
}

function regionLabel(region: string | null) {
  return region ?? "Tanzania";
}

export default async function ProfilePage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const user = db.user.findById(session.userId);
  if (!user) redirect("/auth/login");

  const wallet = db.wallet.findByUserId(user.id);
  const kyc = db.kyc.findByUserId(user.id);
  const positions = db.bet.findByUser(user.id, 500) as StoredBet[];
  const initials = displayInitials(user);
  const displayName = user.displayName ?? "Set your name";

  const kycLevel = kyc?.status ?? "NOT_STARTED";
  const kycPill =
    kycLevel === "APPROVED"
      ? { tone: "yes", label: "ID verified · Imethibitishwa" }
      : kycLevel === "PENDING_REVIEW" || kycLevel === "IN_PROGRESS"
        ? { tone: "info", label: "In review · Inakaguliwa" }
        : kycLevel === "REJECTED"
          ? { tone: "no", label: "Rejected · Imekataliwa" }
          : { tone: "warning", label: "Verify ID · Thibitisha" };

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      {/* Screen-reader-only h1 — gives the page proper landmark
          structure without disturbing the visual hierarchy (the
          display name + ProfileNameEditor sit prominently inside the
          hero card below; that's where the eye reads, but a screen
          reader needs a top-level heading too). */}
      <h1 className="sr-only">
        Profile · {displayName} · Wasifu
      </h1>
      {/* ── Hero — kit-faithful: tilted FiftyMark watermark, OKLCH gradient,
            mono-stamped meta, picture uploader badge. No Kipindi tokens. */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        {/* Layered background — emerald → rose tilt + mark watermark */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 360px at 0% 0%, oklch(40% 0.10 152 / 0.30), transparent 60%), " +
              "radial-gradient(900px 320px at 100% 100%, oklch(45% 0.13 22 / 0.25), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={220} />
        </div>

        <div className="relative z-10 p-5 lg:p-6 flex items-start gap-4 lg:gap-5">
          <AvatarUploader
            initials={initials}
            seed={user.id}
            currentSrc={user.avatarDataUrl}
            size="2xl"
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
              Predictor · Mtabiri
            </p>
            <ProfileNameEditor
              currentName={user.displayName}
              fallbackPlaceholder={displayName}
            />
            <p className="mt-1.5 font-mono text-[12px] text-text-muted tabular-nums">
              {maskPhone(user.phoneE164)} · {regionLabel(user.region)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {/* Role badge — yellow for ADMIN/COMPLIANCE/MODERATOR so Ali can
                  see at a glance whether his ADMIN_BOOTSTRAP_PHONES env wired
                  up correctly on this account. Plain "Player" otherwise. */}
              {user.role !== "PLAYER" && user.role !== "AGENT" ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    background: "linear-gradient(135deg, oklch(82% 0.13 86), oklch(72% 0.12 76))",
                    borderColor: "oklch(58% 0.12 76)",
                    color: "oklch(20% 0.06 86)",
                    boxShadow: "0 0 0 3px oklch(60% 0.13 86 / 0.18)",
                  }}
                >
                  <I.shieldcheck s={11} />
                  {user.role === "ADMIN" ? "ADMIN · Msimamizi"
                    : user.role === "COMPLIANCE" ? "COMPLIANCE · Ufuatiliaji"
                    : user.role === "MODERATOR" ? "MODERATOR · Mwangalizi"
                    : user.role}
                </span>
              ) : (
                <Pill tone="neutral">Player · Mtabiri</Pill>
              )}
              <Pill tone={kycPill.tone as "yes" | "no" | "info" | "warning"}>
                {kycPill.label}
              </Pill>
              <Pill tone="neutral">{user.locale === "SW" ? "Kiswahili" : "English"}</Pill>
            </div>
          </div>
        </div>

        {/* Stat strip — wallet + open positions */}
        <div className="relative z-10 grid grid-cols-3 border-t border-border/60 divide-x divide-border/60">
          <Stat
            label="Balance"
            sw="Salio"
            value={wallet ? fmtTzs(wallet.balance) : "—"}
            icon={<I.wallet s={14} />}
          />
          <Stat
            label="Open"
            sw="Hai"
            value={String(positions.filter((p) => p.status === "PENDING_CONFIRMATION" || p.status === "PLACED").length)}
            icon={<I.sparkle s={14} className="text-yes-300" />}
          />
          <Stat
            label="Settled"
            sw="Imekamilika"
            value={String(positions.filter((p) => p.status !== "PENDING_CONFIRMATION" && p.status !== "PLACED").length)}
            icon={<I.check s={14} />}
          />
        </div>
      </section>

      {/* ── KYC banner if not approved */}
      {kycLevel !== "APPROVED" && (
        <section className="rounded-xl border border-warning-border bg-warning-bg/30 p-5">
          <div className="flex items-start gap-3">
            <I.shieldcheck s={20} />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold text-text leading-tight">
                Verify your identity · Thibitisha kitambulisho
              </p>
              <p className="mt-1 text-[13px] text-text-muted leading-snug">
                We verify NIDA before withdrawal. Takes about 2 minutes.
                <span className="block italic text-text-subtle text-[12px] mt-0.5">
                  Tunathibitisha NIDA kabla ya kutoa pesa.
                </span>
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <Step n={1} title="NIDA"   detail="National ID number" done />
                <Step n={2} title="Phone"  detail="SMS code"           done />
                <Step n={3} title="Selfie" detail="Front · back · selfie" active />
              </div>
              <Link href="/profile/kyc" className="btn btn-gold btn-md mt-4 inline-flex" style={{ borderRadius: "var(--r-pill)" }}>
                Continue verification · Endelea
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Achievements shelf */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
          Achievements · Beji
        </h2>
        <div className="rounded-xl glass-panel p-5">
          <BadgeShelf items={computeAchievementShelf(user.id)} />
          <p className="mt-4 text-center text-[11px] text-text-subtle">
            More badges unlock as you predict, win, propose and invite. · Beji zaidi zinafunguliwa unapocheza.
          </p>
        </div>
      </section>

      {/* ── Settings grid */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
          Account · Akaunti
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <SettingRow icon={Gift}              title="Invite & Earn"       sw="Alika upate"     subtitle="Refer friends · earn rewards"         href="/profile/invite" accent badge="New" />
          <SettingRow icon={UserCircle2}       title="My account"          sw="Akaunti yangu"   subtitle="Activity · Export · Close"            href="/profile/account" />
          <SettingRow icon={Sliders}           title="Responsible gambling" sw="Vikomo"          subtitle="Limits · Self-exclusion"              href="/profile/responsible-gambling" />
          <SettingRow icon={ShieldCheck}       title="Verify ID"           sw="Thibitisha"      subtitle="NIDA · documents · review"            href="/profile/kyc" />
          <SettingRow icon={FileSignature}     title="Source of funds"     sw="Asili ya fedha"  subtitle="AML declaration"                      href="/profile/source-of-funds" />
          <SettingRow icon={MonitorSmartphone} title="Active sessions"     sw="Vifaa"           subtitle="Devices · Sign out everywhere"        href="/profile/sessions" />
          <SettingRow icon={HeartPulse}        title="Help & support"      sw="Msaada"          subtitle="FAQ · Helpline · Email"               href="/help" />
        </div>
      </section>

      {/* ── Sign out */}
      <a
        href="/auth/logout"
        className="group inline-flex w-full items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3.5 hover:border-no-700 transition-colors"
      >
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-no-500/10 text-no-300 group-hover:bg-no-500/20 transition-colors">
            <I.logOut s={16} />
          </span>
          <span>
            <p className="font-display text-[14px] font-semibold text-text leading-tight">Sign out · Toka</p>
            <p className="mt-0.5 text-[12px] text-text-subtle">See you soon · Tutaonana</p>
          </span>
        </span>
        <I.chevronRight s={16} />
      </a>
    </main>
  );
}

function Stat({ label, sw, value, icon }: { label: string; sw: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-text-subtle">
        {icon}
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold">{label}</p>
      </div>
      <p className="mt-1 font-display text-[18px] font-bold leading-tight tabular-nums text-text">{value}</p>
      <p className="text-[11px] italic text-text-subtle">{sw}</p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "yes" | "no" | "info" | "warning" | "neutral"; children: React.ReactNode }) {
  const cls =
    tone === "yes"     ? "border-yes-700 bg-yes-500/10 text-yes-300"
    : tone === "no"      ? "border-no-700 bg-no-500/10 text-no-300"
    : tone === "info"    ? "border-info-border bg-info-bg/40 text-info-fg"
    : tone === "warning" ? "border-warning-border bg-warning-bg/40 text-warning-fg"
    :                      "border-border bg-bg-overlay text-text-muted";
  return (
    <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] ${cls}`}>
      {children}
    </span>
  );
}

function Step({ n, title, detail, active, done }: { n: number; title: string; detail: string; active?: boolean; done?: boolean }) {
  const cls =
    done   ? "border-yes-700 bg-yes-500/10"
    : active ? "border-gold-700 bg-gold-500/10"
    :          "border-border bg-bg-overlay";
  const numCls =
    done   ? "bg-yes-500 text-yes-950"
    : active ? "bg-gold-500 text-gold-fg"
    :          "bg-bg-overlay text-text-subtle border border-border";
  return (
    <div className={`rounded-md border p-3 ${cls}`}>
      <div className="flex items-center gap-2">
        <span className={`h-5 w-5 inline-flex items-center justify-center rounded-pill font-mono text-[10px] font-bold ${numCls}`}>
          {done ? <I.check s={11} /> : n}
        </span>
        <span className="font-display text-[12px] font-semibold text-text">{title}</span>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">{detail}</p>
    </div>
  );
}

function SettingRow({ icon: Icon, title, sw, subtitle, href, accent, badge }: { icon: typeof Sliders; title: string; sw: string; subtitle: string; href: string; accent?: boolean; badge?: string }) {
  return (
    <Link
      href={href as never}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3.5 transition-colors ${accent ? "border-gold-700/60 hover:border-gold-500" : "border-border hover:border-gold-700"} hover:bg-bg-overlay`}
      style={accent ? { background: "color-mix(in oklab, var(--gold-500) 7%, var(--bg-elevated))" } : undefined}
    >
      {accent && (
        <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" }} />
      )}
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-md shrink-0 transition-colors ${accent ? "text-gold-fg" : "bg-gold-500/10 text-gold-300 group-hover:bg-gold-500/15"}`}
        style={accent ? { background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" } : undefined}
      >
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13.5px] font-semibold text-text leading-tight flex items-center gap-2">
          {title} <span className="text-text-subtle font-normal italic font-display">· {sw}</span>
          {badge && (
            <span className="inline-flex items-center rounded-pill border border-gold-700/50 bg-gold-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-gold-300">
              {badge}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11.5px] text-text-subtle leading-snug">{subtitle}</p>
      </div>
      <I.chevronRight s={16} />
    </Link>
  );
}
