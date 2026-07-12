"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { startEnrollAction, confirmEnrollAction, disable2faAction, regenerateBackupCodesAction } from "./actions";

type Phase = "idle" | "enrolling" | "codes";

export function SecurityClient({ enabled, backupRemaining }: { enabled: boolean; backupRemaining: number }) {
  const { t } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const [phase, setPhase] = useState<Phase>("idle");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disarm, setDisarm] = useState<null | "disable" | "regen">(null);
  const [disarmCode, setDisarmCode] = useState("");

  // Render the otpauth URI to a QR data-URI (client-only, no network).
  useEffect(() => {
    if (!otpauthUrl) { setQr(null); return; }
    let alive = true;
    QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1, color: { dark: "#0b0a1f", light: "#ffffff" } })
      .then((url) => { if (alive) setQr(url); })
      .catch(() => { if (alive) setQr(null); });
    return () => { alive = false; };
  }, [otpauthUrl]);

  const errFor = (e?: string) =>
    e === "rate_limited" ? t.security.errRateLimited : e === "invalid" ? t.security.errInvalid : t.security.errGeneric;

  function beginEnroll() {
    start(async () => {
      const r = await startEnrollAction();
      if (!r.ok || !r.otpauthUrl) { toast({ title: errFor(r.error), variant: "danger" }); return; }
      setOtpauthUrl(r.otpauthUrl);
      setSecret(r.secret ?? null);
      setCode("");
      setPhase("enrolling");
    });
  }

  function confirmEnroll() {
    start(async () => {
      const r = await confirmEnrollAction(code);
      if (!r.ok || !r.backupCodes) { toast({ title: errFor(r.error), variant: "danger" }); return; }
      setBackupCodes(r.backupCodes);
      setPhase("codes");
    });
  }

  function finishCodes() {
    setPhase("idle");
    setBackupCodes(null);
    setOtpauthUrl(null);
    setSecret(null);
    toast({ title: t.security.enabledToast, variant: "success" });
    router.refresh();
  }

  function runDisarm() {
    const kind = disarm;
    start(async () => {
      if (kind === "regen") {
        const r = await regenerateBackupCodesAction(disarmCode);
        if (!r.ok || !r.backupCodes) { toast({ title: errFor(r.error), variant: "danger" }); return; }
        setDisarm(null); setDisarmCode("");
        setBackupCodes(r.backupCodes);
        setPhase("codes");
      } else {
        const r = await disable2faAction(disarmCode);
        if (!r.ok) { toast({ title: errFor(r.error), variant: "danger" }); return; }
        setDisarm(null); setDisarmCode("");
        toast({ title: t.security.disabledToast, variant: "success" });
        router.refresh();
      }
    });
  }

  // ── One-time backup-codes reveal (shared by enroll + regenerate) ──
  if (phase === "codes" && backupCodes) {
    return <BackupCodes codes={backupCodes} onDone={finishCodes} t={t} toast={toast} />;
  }

  // ── Enrolling: QR + verify ──
  if (phase === "enrolling") {
    return (
      <section className="rounded-xl glass-panel p-5 space-y-4">
        <div>
          <p className="gilt-eyebrow mb-1">{t.security.setupEyebrow}</p>
          <p className="text-[13px] text-text-muted">{t.security.scanHint}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg border border-border bg-white p-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={t.security.qrAlt} width={200} height={200} className="block" />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded bg-bg-inset" aria-hidden />
            )}
          </div>
          {secret && (
            <div className="text-center">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{t.security.manualKey}</p>
              <code className="select-all break-all font-mono text-[12.5px] text-text">{secret}</code>
            </div>
          )}
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-[13px] text-text-muted">{t.security.enterCodeHint}</p>
          <OtpInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="• • • • • •" aria-label={t.security.codeLabel} />
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={() => { setPhase("idle"); setOtpauthUrl(null); }} disabled={pending}>{t.common.cancel}</Button>
            <Button variant="primary" size="md" fullWidth loading={pending} disabled={code.length < 6} onClick={confirmEnroll}>{t.security.verifyEnable}</Button>
          </div>
        </div>
      </section>
    );
  }

  // ── Idle: enabled or disabled status ──
  return (
    <section className="rounded-xl glass-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${enabled ? "bg-yes-500/10 text-yes-300" : "bg-brand-500/10 text-brand-300"}`}>
            <I.shieldcheck s={18} />
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold text-text leading-tight">{t.security.totpTitle}</p>
            <p className="mt-0.5 text-[12.5px] text-text-subtle leading-snug">{t.security.totpBody}</p>
          </div>
        </div>
        <Chip variant={enabled ? "success" : "neutral"} size="md">{enabled ? t.security.on : t.security.off}</Chip>
      </div>

      {!enabled ? (
        <Button variant="primary" size="md" fullWidth loading={pending} leading={<I.keyRound s={16} />} onClick={beginEnroll}>
          {t.security.enable}
        </Button>
      ) : (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-text-muted">{t.security.backupRemaining}</span>
            <Chip variant={backupRemaining <= 2 ? "warning" : "neutral"} size="sm">{backupRemaining}</Chip>
          </div>

          {disarm === null ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDisarm("regen"); setDisarmCode(""); }}>{t.security.regenerate}</Button>
              <Button variant="danger" size="sm" onClick={() => { setDisarm("disable"); setDisarmCode(""); }}>{t.security.disable}</Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-border bg-bg-overlay/40 p-3">
              <p className="text-[12.5px] text-text-muted">{disarm === "disable" ? t.security.disableConfirm : t.security.regenConfirm}</p>
              <OtpInput value={disarmCode} onChange={(e) => setDisarmCode(e.target.value)} placeholder="• • • • • •" aria-label={t.security.codeLabel} />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDisarm(null)} disabled={pending}>{t.common.cancel}</Button>
                <Button variant={disarm === "disable" ? "danger" : "primary"} size="sm" fullWidth loading={pending} disabled={disarmCode.length < 6} onClick={runDisarm}>
                  {disarm === "disable" ? t.security.disable : t.security.regenerate}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BackupCodes({ codes, onDone, t, toast }: { codes: string[]; onDone: () => void; t: ReturnType<typeof useT>["t"]; toast: ReturnType<typeof useToast>["toast"] }) {
  const [ack, setAck] = useState(false);
  const copyAll = () => {
    navigator.clipboard?.writeText(codes.join("\n")).then(
      () => toast({ title: t.security.codesCopied, variant: "success" }),
      () => {},
    );
  };
  return (
    <section className="rounded-xl glass-panel p-5 space-y-4">
      <div>
        <p className="gilt-eyebrow mb-1">{t.security.backupTitle}</p>
        <p className="text-[13px] text-text-muted">{t.security.backupBody}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-md border border-gilt/40 bg-bg-overlay/40 p-3">
        {codes.map((c) => (
          <code key={c} className="select-all text-center font-mono text-[13px] tracking-[0.06em] text-text">{c}</code>
        ))}
      </div>
      <div className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2 text-[12px] text-warning-fg">
        <I.warning s={13} className="mt-[1px] shrink-0" />
        <span>{t.security.backupWarn}</span>
      </div>
      <Button variant="ghost" size="sm" leading={<I.copy s={14} />} onClick={copyAll}>{t.security.copyCodes}</Button>
      <label className="flex items-center gap-2 text-[13px] text-text-muted">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-[18px] w-[18px] accent-brand-500" />
        {t.security.savedAck}
      </label>
      <Button variant="primary" size="md" fullWidth disabled={!ack} onClick={onDone}>{t.security.done}</Button>
    </section>
  );
}
