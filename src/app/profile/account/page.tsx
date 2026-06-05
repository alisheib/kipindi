import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, UserCircle2, Download, AlertOctagon, Activity } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getOwnActivity } from "@/lib/server/user-service";
import { CloseAccountForm } from "./close-account-form";
import { ExportDataButton } from "./export-data-button";

export const metadata = { title: "My account · Akaunti yangu" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const user = db.user.findById(session.userId);
  const activity = getOwnActivity(session.userId, 50);
  const sp = (await searchParams) ?? {};

  const statusTone =
    user?.status === "ACTIVE" ? "yes"
    : user?.status === "PENDING_KYC" ? "warning"
    : "no";

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-5">
      {sp.error && (
        <div role="alert" className="rounded-xl border border-no-700 bg-no-500/10 px-4 py-3 text-[13px] text-no-300">
          {sp.error}
        </div>
      )}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        Profile
      </Link>

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle2 size={14} className="text-info-fg" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              My account
            </p>
          </div>
          <h1 className="font-display text-[24px] lg:text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
            Akaunti yangu
          </h1>
          <p className="mt-1 text-[13px] italic text-text-subtle">My account</p>
        </div>
      </header>

      {/* PROFILE SUMMARY */}
      <section className="rounded-xl glass-panel p-5 space-y-3">
        <h2 className="font-display text-[15px] font-semibold text-text">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Item label="Display name" value={user?.displayName ?? "—"} />
          <Item
            label="Phone"
            value={user?.phoneE164
              ? `${user.phoneE164.slice(0, 4)}*****${user.phoneE164.slice(-2)}`
              : "—"}
          />
          <Item label="Region" value={user?.region ?? "—"} />
          <Item
            label="Status"
            value={
              <Pill tone={statusTone as "yes" | "no" | "warning"}>
                {user?.status ?? "—"}
              </Pill>
            }
          />
          <Item
            label="Account opened"
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "—"}
          />
          <Item
            label="Last login"
            value={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-GB") : "—"}
          />
        </div>
      </section>

      {/* OWN ACTIVITY FEED */}
      <section className="rounded-xl glass-panel p-5 space-y-3">
        <div className="flex items-center gap-2">
          <I.activity s={15} />
          <h2 className="font-display text-[15px] font-semibold text-text">My activity</h2>
          <span className="ml-auto font-mono text-[11px] text-text-subtle tabular-nums">
            {activity.length} events
          </span>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-bg-overlay/50 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                <th className="text-left px-3 py-2 font-semibold">When</th>
                <th className="text-left px-3 py-2 font-semibold">Category</th>
                <th className="text-left px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {activity.slice(0, 30).map((e) => (
                <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-bg-overlay/40 transition-colors">
                  <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap text-text-muted">
                    {e.createdAt.replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-3 py-2 font-mono text-text-subtle">{e.category}</td>
                  <td className="px-3 py-2 font-display font-semibold text-text">{e.action}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-text-subtle">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DATA EXPORT — GDPR Art 15 / PDPA */}
      <section className="rounded-xl glass-panel p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <I.download s={15} />
          <h2 className="font-display text-[15px] font-semibold text-text">
            Export my data <span className="text-text-subtle italic font-normal">· Pakua data yangu</span>
          </h2>
        </div>
        <p className="text-[12.5px] text-text-muted leading-snug">
          Get a structured copy of every record we hold on you — profile, KYC, wallet, bets,
          transactions, settings, and audit trail. GDPR Article 15 / Tanzania PDPA right of access.
        </p>
        <div className="pt-1">
          <ExportDataButton />
        </div>
      </section>

      {/* CLOSE ACCOUNT — GDPR Art 17 */}
      <section className="rounded-xl border border-no-700/60 bg-no-500/[0.06] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertOctagon size={15} className="text-no-300" />
          <h2 className="font-display text-[15px] font-semibold text-text">
            Close my account <span className="text-text-subtle italic font-normal">· Funga akaunti</span>
          </h2>
          <span className="ml-auto inline-flex items-center rounded-pill border border-no-700 bg-no-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-no-300">
            One-way
          </span>
        </div>
        <p className="text-[12.5px] text-text-muted leading-snug">
          Closing your account freezes the wallet, ends marketing communication, and signs you out.
          Active bets continue to settle so payouts arrive correctly. Financial and KYC records are
          retained for 7 years per Tanzanian AML law (POCA Cap 423) before erasure.
          <span className="block italic text-text-subtle text-[11.5px] mt-1">
            Akaunti ikifungwa, pochi imefungwa. Madau yaliyowekwa yataendelea kupokelewa.
          </span>
        </p>
        <CloseAccountForm />
        <p className="font-mono text-[11px] text-text-subtle">
          Need help instead? Email <span className="text-text-muted">support@50pick.com</span> or
          call <span className="text-text-muted">+255 22 211 5811</span>.
        </p>
      </section>
    </main>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-overlay/40 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-subtle">
        {label}
      </p>
      <p className="mt-0.5 font-display text-[13px] font-semibold text-text">{value}</p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "yes" | "no" | "warning"; children: React.ReactNode }) {
  const cls =
    tone === "yes"     ? "border-yes-700 bg-yes-500/10 text-yes-300"
    : tone === "no"      ? "border-no-700 bg-no-500/10 text-no-300"
    :                      "border-warning-border bg-warning-bg/40 text-warning-fg";
  return (
    <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] ${cls}`}>
      {children}
    </span>
  );
}
