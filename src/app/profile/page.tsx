import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Pattern } from "@/components/ui/pattern";
import { ChevronRight, ShieldCheck, Sliders, LogOut, BellRing, Globe2, MonitorSmartphone, HeartPulse, Check, UserCircle2 } from "lucide-react";
import { user } from "@/lib/mock-data";

export const metadata = { title: "Profile · Wasifu" };

export default function ProfilePage() {
  const kycPill =
    user.kycStatus === "approved" ? <Chip variant="success" size="sm">ID verified · Imethibitishwa</Chip> :
    user.kycStatus === "in_progress" ? <Chip variant="info" size="sm">In review · Inakaguliwa</Chip> :
    user.kycStatus === "rejected" ? <Chip variant="danger" size="sm">Rejected · Imekataliwa</Chip> :
    <Chip variant="warning" size="sm">Not started · Haijaanza</Chip>;

  return (
    <div className="mx-auto max-w-[960px] px-3 lg:px-6 py-4 lg:py-6 space-y-4">
      <section className="relative rounded-2xl overflow-hidden border border-royal/30">
        <div className="absolute inset-0 bg-g-brand" aria-hidden />
        <Pattern kind="sokoni" opacity={0.06} color="#FFFFFF" />
        <div className="relative z-10 p-4 lg:p-5 flex items-center gap-3 text-onBrand">
          <Avatar initials={user.initials} size="xl" color="var(--gold)" className="shadow-glow-gold" />
          <div className="flex-1">
            <h1 className="font-display text-title-md lg:text-title-lg leading-tight m-0">{user.name}</h1>
            <p className="text-body-sm opacity-80 tabular leading-tight mt-0.5">{user.phone} · {user.region}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {kycPill}
              {user.streak > 0 && (
                <span className="inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-gold-subtle/40 text-gold border border-gold-subtleHover/40 text-micro font-bold tabular tracking-[0.14em] uppercase">
                  ×{user.streak} <span className="opacity-70 font-normal">streak</span>
                </span>
              )}
              <Chip variant="neutral" size="sm">{user.locale === "sw" ? "Kiswahili" : "English"}</Chip>
            </div>
          </div>
        </div>
      </section>

      {user.kycStatus !== "approved" && (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-info" strokeWidth={1.75} />
              <p className="font-display text-title-sm text-text">Verify your identity · Thibitisha kitambulisho</p>
            </div>
            <p className="text-body-sm text-text-secondary">
              We need to verify your NIDA before you can withdraw winnings. Takes 2 minutes. ·
              Tunahitaji kuthibitisha NIDA kabla ya kutoa pesa.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Step n={1} title="NIDA number"  detail="National ID number"   done />
              <Step n={2} title="Phone"         detail="Receive an SMS code" done />
              <Step n={3} title="ID + selfie"   detail="Front, back, selfie" active />
            </div>
            <Button variant="primary" size="lg" fullWidth>Continue verification · Endelea</Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SettingRow icon={UserCircle2}        title="My account · Akaunti yangu"  subtitle="Activity · Export data · Close account" href="/profile/account" />
        <SettingRow icon={Sliders}            title="Responsible gambling"        subtitle="Limits · Vikomo · Self-exclusion"        href="/profile/responsible-gambling" />
        <SettingRow icon={ShieldCheck}        title="Verify ID · Thibitisha"      subtitle="NIDA · documents · review"               href="/profile/kyc" />
        <SettingRow icon={BellRing}           title="Notifications"               subtitle="Push · SMS · Email"                      href="#" />
        <SettingRow icon={MonitorSmartphone}  title="Active sessions"             subtitle="Devices · Sign out"                      href="#" />
        <SettingRow icon={HeartPulse}         title="Help & support"              subtitle="Live chat · Helpline"                    href="#" />
        <SettingRow icon={Globe2}             title="Language · Lugha"            subtitle="English · Kiswahili"                     href="#" />
        <SettingRow icon={LogOut}             title="Sign out · Toka"             subtitle="See you soon · Tutaonana"                href="/auth/logout" />
      </div>
    </div>
  );
}

function Step({ n, title, detail, active, done }: { n: number; title: string; detail: string; active?: boolean; done?: boolean }) {
  return (
    <div className={`p-3 rounded-md border ${
      done ? "border-gold-subtleHover/40 bg-gold-subtle/30" :
      active ? "border-royal bg-royal-subtle" : "border-border-subtle bg-bg-sunken/40"
    }`}>
      <div className="flex items-center gap-2">
        <span className={`h-6 w-6 inline-flex items-center justify-center rounded-pill text-caption font-bold ${
          done ? "bg-gold text-gold-fg" :
          active ? "bg-royal text-onBrand" : "bg-bg-sunken text-text-tertiary border border-border-subtle"
        }`}>
          {done ? <Check size={13} strokeWidth={3} /> : n}
        </span>
        <span className="text-label font-bold text-text">{title}</span>
      </div>
      <p className="text-caption text-text-tertiary mt-1">{detail}</p>
    </div>
  );
}

function SettingRow({ icon: Icon, title, subtitle, href }: { icon: typeof Sliders; title: string; subtitle: string; href: string }) {
  return (
    <Link href={href}>
      <Card interactive>
        <CardBody className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-md bg-royal-subtle text-royal inline-flex items-center justify-center shrink-0">
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold text-text truncate">{title}</p>
            <p className="text-caption text-text-tertiary">{subtitle}</p>
          </div>
          <ChevronRight size={16} className="text-text-tertiary shrink-0" />
        </CardBody>
      </Card>
    </Link>
  );
}
