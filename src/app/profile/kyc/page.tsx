import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShieldCheck, Check } from "lucide-react";
import { currentSession } from "@/lib/server/auth-service";
import { getKycStatus, startKyc } from "@/lib/server/kyc-service";
import { submitNidaAction } from "./actions";

export const metadata = { title: "Verify identity · Thibitisha" };

export default async function KycPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  // ensure a KYC record exists
  await startKyc(session.userId);
  const kyc = await getKycStatus(session.userId);

  const nidaDone = !!kyc?.nidaVerifiedAt;
  const docsCount = kyc?.documents.length ?? 0;
  const submitted = kyc?.status === "PENDING_REVIEW" || kyc?.status === "APPROVED";

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-start justify-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.03} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-2xl space-y-4">
        <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Verify ID", labelSw: "Thibitisha" }]} />
        <header>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Identity verification</p>
          <h1 className="font-display font-bold text-title-lg text-text mt-1.5">Verify your NIDA · Thibitisha NIDA</h1>
          <p className="text-body text-text-secondary mt-2 max-w-prose">
            We verify against the National Identification Authority before you can withdraw winnings. Required by Tanzania&apos;s Gaming Act and the Personal Data Protection Act.
            <br /><span className="italic">Tunathibitisha NIDA kabla ya kutoa pesa.</span>
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Step n={1} title="NIDA"      detail="National ID number"     done={nidaDone} active={!nidaDone} />
          <Step n={2} title="Documents" detail="Front, back, selfie"   done={docsCount >= 3} active={nidaDone && docsCount < 3} />
          <Step n={3} title="Review"    detail="Compliance approval"    done={kyc?.status === "APPROVED"} active={submitted && kyc?.status !== "APPROVED"} />
        </div>

        {!nidaDone && (
          <Card className="border-2 border-border-strong">
            <CardBody className="p-5 lg:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-info" strokeWidth={1.75} />
                <h2 className="font-display font-bold text-title-sm text-text">Step 1 · NIDA verification</h2>
              </div>
              <form action={submitNidaAction} className="space-y-3">
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
                <Button type="submit" variant="primary" size="xl" fullWidth>Verify NIDA · Thibitisha</Button>
              </form>
              <details className="text-body-sm text-text-secondary border-t border-border-divider pt-3">
                <summary className="font-bold text-text cursor-pointer">Why we ask · Kwa nini tunaomba</summary>
                <p className="mt-1.5 leading-snug">
                  The Gaming Board of Tanzania requires identity verification for every account that wagers real money. Your NIDA is checked against the National Identification Authority. We never share your number with third parties.
                </p>
              </details>
            </CardBody>
          </Card>
        )}

        {nidaDone && !submitted && (
          <Card className="border-2 border-border-strong">
            <CardBody className="p-5 lg:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Chip variant="success" size="sm"><Check size={11} strokeWidth={2.5} /> NIDA verified</Chip>
              </div>
              <h2 className="font-display font-bold text-title-sm text-text">Step 2 · Upload documents</h2>
              <p className="text-body-sm text-text-secondary">
                We need a clear photo of the <span className="font-bold text-text">front</span>, the <span className="font-bold text-text">back</span> of your NIDA card, and a <span className="font-bold text-text">selfie</span> holding the card.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <UploadSlot label="ID front · Mbele" done={docsCount >= 1} />
                <UploadSlot label="ID back · Nyuma" done={docsCount >= 2} />
                <UploadSlot label="Selfie · Picha yako" done={docsCount >= 3} />
              </div>
              <p className="text-micro text-text-tertiary italic">Document upload is stubbed in this build — the real uploader integrates with object storage in Sprint 2.</p>
            </CardBody>
          </Card>
        )}

        {submitted && (
          <Card className="border-2 border-gold-subtleHover/40 bg-gold-subtle/30">
            <CardBody className="p-5 lg:p-6 space-y-2 text-center">
              <p className="font-display font-bold text-title-sm text-gold">{kyc?.status === "APPROVED" ? "Identity verified" : "Submitted for review"}</p>
              <p className="text-body-sm text-text-secondary">
                {kyc?.status === "APPROVED"
                  ? "You can now deposit and withdraw freely. · Sasa unaweza kuweka na kutoa pesa."
                  : "Compliance is reviewing. Most reviews finish within 2 hours during business. · Ukaguzi unaendelea."}
              </p>
            </CardBody>
          </Card>
        )}

        <div className="flex items-center justify-between text-body-sm pt-1">
          <Link href="/profile" className="text-text-secondary hover:text-text transition-colors">← Back to profile</Link>
          <Link href="/wallet" className="text-royal hover:text-royal-hover font-bold transition-colors">Need to deposit? · Wallet</Link>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, detail, done, active }: { n: number; title: string; detail: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`p-3 rounded-md border ${done ? "border-gold-subtleHover/40 bg-gold-subtle/30" : active ? "border-royal bg-royal-subtle" : "border-border-subtle bg-bg-sunken/40"}`}>
      <div className="flex items-center gap-2">
        <span className={`h-6 w-6 inline-flex items-center justify-center rounded-pill text-caption font-bold ${done ? "bg-gold text-gold-fg" : active ? "bg-royal text-onBrand" : "bg-bg-sunken text-text-tertiary border border-border-subtle"}`}>
          {done ? <Check size={13} strokeWidth={3} /> : n}
        </span>
        <span className="text-label font-bold text-text">{title}</span>
      </div>
      <p className="text-caption text-text-tertiary mt-1">{detail}</p>
    </div>
  );
}

function UploadSlot({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`rounded-md border-2 border-dashed p-3 text-center ${done ? "border-gold-subtleHover/40 bg-gold-subtle/20" : "border-border-subtle bg-bg-sunken/30"}`}>
      <div className={`h-6 w-6 mx-auto rounded-pill inline-flex items-center justify-center mb-1.5 ${done ? "bg-gold text-gold-fg" : "bg-surface-pressed text-text-tertiary border border-border-subtle"}`}>
        {done ? <Check size={13} strokeWidth={3} /> : "+"}
      </div>
      <p className="text-caption font-bold text-text">{label}</p>
      <p className="text-micro text-text-tertiary mt-0.5">{done ? "Uploaded" : "Tap to upload"}</p>
    </div>
  );
}

function Field({ id, label, hint, type, pattern, inputMode, placeholder }: { id: string; label: string; hint?: string; type: string; pattern?: string; inputMode?: "numeric" | "text"; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">{label}</label>
      <input
        id={id} name={id} type={type} pattern={pattern} inputMode={inputMode} placeholder={placeholder} required
        className="w-full h-11 px-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors"
      />
      {hint && <p className="text-micro text-text-tertiary mt-1">{hint}</p>}
    </div>
  );
}
