import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRight, ShieldCheck, Sliders, LogOut, Check, UserCircle2,
  FileSignature, MonitorSmartphone, HeartPulse, Wallet, Sparkles,
} from "lucide-react";
import { FiftyMark } from "@/components/brand";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/name-editor";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredBet } from "@/lib/server/store";

export const metadata = { title: "Profile · Wasifu" };
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

function initialsFor(displayName: string | null, phone: string): string {
  if (displayName && displayName.trim().length > 0) {
    const parts = displayName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  // Fall back to last 2 digits of phone
  const tail = phone.replace(/\D/g, "").slice(-2);
  return tail || "50";
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
  const initials = initialsFor(user.displayName, user.phoneE164);
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
    <main className="mx-auto max-w-[960px] px-3 lg:px-6 py-6 space-y-6">
      {/* ── Hero — kit-faithful: tilted FiftyMark watermark, OKLCH gradient,
            mono-stamped meta, picture uploader badge. No Kipindi tokens. */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-elevated">
        {/* Layered background — emerald → rose tilt + mark watermark */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 360px at 0% 0%, oklch(40% 0.10 152 / 0.30), transparent 60%), " +
              "radial-gradient(900px 320px at 100% 100%, oklch(45% 0.13 22 / 0.25), transparent 60%), " +
              "linear-gradient(135deg, oklch(20% 0.012 240) 0%, oklch(16% 0.014 240) 100%)",
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
              {user.phoneE164} · {regionLabel(user.region)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Pill tone={kycPill.tone as "yes" | "no" | "info" | "warning"}>
                {kycPill.label}
              </Pill>
              <Pill tone="neutral">{user.locale === "SW" ? "Kiswahili" : "English"}</Pill>
              {session.demoMode && <Pill tone="warning">Demo · Mfano</Pill>}
            </div>
          </div>
        </div>

        {/* Stat strip — wallet + open positions */}
        <div className="relative z-10 grid grid-cols-3 border-t border-border/60 divide-x divide-border/60">
          <Stat
            label="Balance"
            sw="Salio"
            value={wallet ? fmtTzs(wallet.balance) : "—"}
            icon={<Wallet size={14} className="text-gold-400" />}
          />
          <Stat
            label="Open"
            sw="Hai"
            value={String(positions.filter((p) => p.status === "PENDING_CONFIRMATION" || p.status === "PLACED").length)}
            icon={<Sparkles size={14} className="text-yes-300" />}
          />
          <Stat
            label="Settled"
            sw="Imekamilika"
            value={String(positions.filter((p) => p.status !== "PENDING_CONFIRMATION" && p.status !== "PLACED").length)}
            icon={<Check size={14} className="text-text-muted" strokeWidth={2.5} />}
          />
        </div>
      </section>

      {/* ── KYC banner if not approved */}
      {kycLevel !== "APPROVED" && (
        <section className="rounded-xl border border-warning-border bg-warning-bg/30 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 text-warning-fg shrink-0" strokeWidth={1.75} />
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
              <Link href="/profile/kyc" className="btn btn-gold btn-md mt-4 inline-flex" style={{ borderRadius: 999 }}>
                Continue verification · Endelea
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Settings grid */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
          Account · Akaunti
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
        className="group inline-flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3.5 hover:border-no-700 transition-colors"
      >
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-no-500/10 text-no-300 group-hover:bg-no-500/20 transition-colors">
            <LogOut size={16} strokeWidth={1.75} />
          </span>
          <span>
            <p className="font-display text-[14px] font-semibold text-text leading-tight">Sign out · Toka</p>
            <p className="mt-0.5 text-[12px] text-text-subtle">See you soon · Tutaonana</p>
          </span>
        </span>
        <ChevronRight size={16} className="text-text-subtle group-hover:text-no-300 transition-colors" />
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
          {done ? <Check size={11} strokeWidth={3} /> : n}
        </span>
        <span className="font-display text-[12px] font-semibold text-text">{title}</span>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">{detail}</p>
    </div>
  );
}

function SettingRow({ icon: Icon, title, sw, subtitle, href }: { icon: typeof Sliders; title: string; sw: string; subtitle: string; href: string }) {
  return (
    <Link
      href={href as never}
      className="group flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-3.5 hover:border-gold-700 hover:bg-bg-overlay transition-colors"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gold-500/10 text-gold-300 group-hover:bg-gold-500/15 transition-colors shrink-0">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13.5px] font-semibold text-text leading-tight">
          {title} <span className="text-text-subtle font-normal italic font-display">· {sw}</span>
        </p>
        <p className="mt-0.5 text-[11.5px] text-text-subtle leading-snug">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-text-subtle group-hover:text-text-muted shrink-0" />
    </Link>
  );
}
