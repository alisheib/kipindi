import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck, Check } from "lucide-react";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { getKycStatus, startKyc } from "@/lib/server/kyc-service";
import { submitNidaAction } from "./actions";

export const metadata = { title: "Verify identity · Thibitisha" };

export default async function KycPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  await startKyc(session.userId);
  const kyc = await getKycStatus(session.userId);

  const nidaDone = !!kyc?.nidaVerifiedAt;
  const docsCount = kyc?.documents.length ?? 0;
  const submitted = kyc?.status === "PENDING_REVIEW" || kyc?.status === "APPROVED";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <ChevronLeft size={14} aria-hidden />
        Profile
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(45% 0.10 240 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(20% 0.012 240) 0%, oklch(16% 0.014 240) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-info-fg" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-info-fg">
              Identity verification
            </p>
          </div>
          <h1 className="font-display text-[24px] lg:text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
            Verify your NIDA · Thibitisha NIDA
          </h1>
          <p className="mt-2 text-[13px] text-text-muted leading-snug max-w-prose">
            We verify against the National Identification Authority before withdrawals.
            Required by the Tanzania Gaming Act and the Personal Data Protection Act.
            <span className="block italic text-text-subtle text-[12px] mt-1">
              Tunathibitisha NIDA kabla ya kutoa pesa.
            </span>
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Step n={1} title="NIDA"      detail="National ID number"  done={nidaDone} active={!nidaDone} />
        <Step n={2} title="Documents" detail="Front · back · selfie" done={docsCount >= 3} active={nidaDone && docsCount < 3} />
        <Step n={3} title="Review"    detail="Compliance approval"  done={kyc?.status === "APPROVED"} active={submitted && kyc?.status !== "APPROVED"} />
      </section>

      {!nidaDone && (
        <section className="rounded-2xl border border-border bg-bg-elevated p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-info-fg" strokeWidth={1.75} />
            <h2 className="font-display text-[15px] font-semibold text-text">Step 1 · NIDA verification</h2>
          </div>
          <form action={submitNidaAction} className="space-y-4">
            <Field
              id="nida"
              label="NIDA number · Nambari ya NIDA"
              hint="20 digits, exactly as on your card"
              type="text"
              pattern="\d{20}"
              inputMode="numeric"
              placeholder="00000000000000000000"
            />
            <Field
              id="fullName"
              label="Full name · Jina kamili"
              hint="As printed on the NIDA card"
              type="text"
            />
            <Field
              id="dob"
              label="Date of birth · Tarehe ya kuzaliwa"
              hint="Must match NIDA exactly"
              type="date"
            />
            <button
              type="submit"
              className="w-full h-12 rounded-pill font-display font-bold text-[14px] transition-all border"
              style={{
                background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))",
                color: "var(--gold-fg)",
                borderColor: "var(--gold-700)",
                boxShadow: "0 1px 0 oklch(95% 0.08 80) inset, 0 8px 18px -10px oklch(78% 0.14 80 / 0.7)",
              }}
            >
              Verify NIDA · Thibitisha
            </button>
          </form>
          <details className="border-t border-border pt-3 text-[12.5px] text-text-muted">
            <summary className="font-display font-semibold text-text cursor-pointer">
              Why we ask · Kwa nini tunaomba
            </summary>
            <p className="mt-1.5 leading-snug">
              The Gaming Board of Tanzania requires identity verification for every account
              that wagers real money. Your NIDA is checked against the National Identification
              Authority. We never share your number with third parties.
            </p>
          </details>
        </section>
      )}

      {nidaDone && !submitted && (
        <section className="rounded-2xl border border-border bg-bg-elevated p-5 lg:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-yes-300">
              <Check size={11} strokeWidth={2.5} />
              NIDA verified
            </span>
          </div>
          <h2 className="font-display text-[15px] font-semibold text-text">Step 2 · Upload documents</h2>
          <p className="text-[12.5px] text-text-muted leading-snug">
            We need a clear photo of the <span className="font-bold text-text">front</span>,
            the <span className="font-bold text-text">back</span> of your NIDA card,
            and a <span className="font-bold text-text">selfie</span> holding the card.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <UploadSlot label="ID front · Mbele"    done={docsCount >= 1} />
            <UploadSlot label="ID back · Nyuma"     done={docsCount >= 2} />
            <UploadSlot label="Selfie · Picha yako" done={docsCount >= 3} />
          </div>
          <p className="text-[10.5px] italic text-text-subtle">
            Document upload is stubbed in this build — the real uploader integrates with object storage in a later sprint.
          </p>
        </section>
      )}

      {submitted && (
        <section className="rounded-2xl border border-gold-700 bg-gold-500/10 p-5 lg:p-6 text-center space-y-2">
          <p className="font-display text-[16px] font-bold text-gold-300">
            {kyc?.status === "APPROVED" ? "Identity verified" : "Submitted for review"}
          </p>
          <p className="text-[12.5px] text-text-muted leading-snug">
            {kyc?.status === "APPROVED"
              ? "You can now deposit and withdraw freely."
              : "Compliance is reviewing. Most reviews finish within 2 hours during business hours."}
            <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
              {kyc?.status === "APPROVED"
                ? "Sasa unaweza kuweka na kutoa pesa."
                : "Ukaguzi unaendelea — utakamilika ndani ya saa 2."}
            </span>
          </p>
        </section>
      )}

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/profile"
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-subtle hover:text-text"
        >
          ← Profile
        </Link>
        <Link
          href="/wallet"
          className="font-display text-[13px] font-semibold text-gold-300 hover:text-gold-200 transition-colors"
        >
          Need to deposit? · Wallet
        </Link>
      </div>
    </main>
  );
}

function Step({ n, title, detail, done, active }: { n: number; title: string; detail: string; done?: boolean; active?: boolean }) {
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

function UploadSlot({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`rounded-md border-2 border-dashed p-3.5 text-center ${
        done ? "border-yes-700 bg-yes-500/[0.07]" : "border-border bg-bg-overlay/40"
      }`}
    >
      <div
        className={`mx-auto mb-1.5 h-6 w-6 inline-flex items-center justify-center rounded-pill ${
          done ? "bg-yes-500 text-yes-950" : "bg-bg-overlay text-text-subtle border border-border"
        }`}
      >
        {done ? <Check size={11} strokeWidth={3} /> : "+"}
      </div>
      <p className="font-display text-[12px] font-semibold text-text">{label}</p>
      <p className="mt-0.5 font-mono text-[10.5px] text-text-subtle">{done ? "Uploaded" : "Tap to upload"}</p>
    </div>
  );
}

function Field({
  id, label, hint, type, pattern, inputMode, placeholder,
}: {
  id: string; label: string; hint?: string; type: string;
  pattern?: string; inputMode?: "numeric" | "text"; placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        pattern={pattern}
        inputMode={inputMode}
        placeholder={placeholder}
        required
        className="w-full h-11 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[13px] tabular-nums text-text focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors"
      />
      {hint && <p className="mt-1.5 text-[11px] text-text-subtle">{hint}</p>}
    </div>
  );
}
