"use client";

/**
 * LipaQrPanel — "scan this instead of typing it".
 *
 * ── WHAT IT IS FOR ───────────────────────────────────────────────────────────
 * One reusable payment affordance for Selcom's static merchant QR (Lipa Namba).
 * Built as a component rather than inline markup because the fee page and the
 * landing page both show it today and a second surface would otherwise copy it —
 * the failure `payment-providers.ts` documents at length, where one label lived in
 * eight places and drifted.
 *
 * ── ⛔ WHERE IT MAY BE USED ──────────────────────────────────────────────────
 * ONLY on a payment a HUMAN reconciles. The QR is static: no amount, no
 * per-payment reference (EMVCo point-of-initiation `11`, verified by decoding the
 * artwork). Money paid through it lands in the merchant account and credits no
 * wallet, because our rail attributes deposits solely by the `dep_…` order id we
 * mint. See the header of `src/lib/server/lipa-config.ts` before adding a caller.
 *
 * ── ⭐ THE PANEL CANNOT CONTRADICT ITS OWN PAGE ──────────────────────────────
 * It renders the QR only when the destination account the page names IS the Lipa
 * number the QR encodes (`shouldShowLipaQr`). Point the fee somewhere else and the
 * QR disappears on its own, leaving the number in text. Two destinations for one
 * payment is how money goes missing for a week, so it is made unrepresentable
 * rather than merely discouraged.
 *
 * ── CLIENT COMPONENT ─────────────────────────────────────────────────────────
 * `"use client"` because it copies to the clipboard and toasts. It therefore takes
 * every value as a prop and imports nothing from `src/lib/server/*`.
 */
import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { type LipaDisplay, formatLipaNumber, shouldShowLipaQr } from "@/lib/lipa";

export function LipaQrPanel({
  lipa,
  account,
  amountTzs,
  className = "",
}: {
  /** The merchant identity, from `lipaDisplay()` on the server. */
  lipa: LipaDisplay | null;
  /** The destination account THIS page tells the payer to pay. The QR shows only if it matches. */
  account: string;
  /** Optional — the exact amount owed, echoed so the payer types it correctly. */
  amountTzs?: number;
  className?: string;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!shouldShowLipaQr(lipa, account)) return null;
  const l = lipa!;
  const pretty = formatLipaNumber(l.lipaNumber);

  const copy = async () => {
    try {
      // The DIGITS, not the spaced display form — this is pasted into a payment
      // field, and a space is the kind of thing a wallet app rejects at the till.
      await navigator.clipboard.writeText(l.lipaNumber);
      setCopied(true);
      toast({ title: t.lipa.copied, variant: "success" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: t.toast.couldntCopy, description: t.toast.longPressCopy, variant: "danger" });
    }
  };

  return (
    /* `data-lipa-qr` is the live drive's handle (`qa:lipa-qr`). It screenshots the img
       inside this node and DECODES it, and asserts the same selector matches nothing on
       /wallet/deposit — so the attribute is load-bearing for both halves of that proof,
       not a styling hook. ⛔ Do not rename it without updating the drive. */
    <section data-lipa-qr className={`rounded-xl glass-panel p-4 ${className}`.trim()}>
      <p className="flex items-center gap-1.5 font-mono text-micro uppercase eyebrow font-bold text-text-tertiary">
        <I.qr s={12} /> {t.lipa.title}
      </p>
      <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{t.lipa.lead}</p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        {/*
          A WHITE PLATE, NOT THE DARK SURFACE. Same reasoning as the MNO marks in
          `payment-logo.tsx`, but here it is functional rather than aesthetic: a QR
          inverted or tinted by a dark theme is a QR that scanners refuse. The asset
          already carries its own quiet zone; the padding keeps the panel edge from
          crowding it on small screens.
        */}
        {/* ⚠️ Utility classes, NOT an inline style object. `payment-logo.tsx` sets the
            equivalent plate inline and is carried on `test:design-frozen`'s ratchet;
            that ratchet may only ever shrink, so a new file starts at zero and stays
            there. `rounded-control` is the 12px semantic rung (`--r-md`) the MNO tiles
            use — `rounded-md` is 8px and would not match them. */}
        <div className="mx-auto shrink-0 rounded-control border border-border bg-white p-2 sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={l.qrAssetPath}
            /* Nobody scans a QR with a screen reader, so the alt carries what the code
               ENCODES rather than describing the picture. It repeats the merchant and
               number rendered beside it, and that redundancy is the point: a listener
               gets the same two facts a sighted payer checks against their wallet app. */
            alt={`${t.lipa.title} — ${l.merchantName}, ${t.lipa.numberLabel} ${pretty}`}
            width={224}
            height={224}
            /* 192 / 224 CSS px. Chosen from measurement, not taste: `.qa-lipa/threshold`
               decoded the painted symbol at every step from 176 to 288 at both DPRs, and
               these two sit inside that band with margin at 1×, 2× and 3×. Bigger is also
               simply better for the person holding the phone. */
            className="block h-48 w-48 sm:h-56 sm:w-56"
            /* ⛔ NO `image-rendering` OVERRIDE, AND NO RASTER SOURCE. The asset is an SVG
               and must stay one. Measured against the 840px bitmap this originally shipped
               with, the painted symbol decoded at 160px, FAILED at 176 and 192, decoded at
               208, failed at 240 and 256 — and the pattern moved again at a different DPR.
               That is moiré between the module grid and the pixel grid, and no
               `image-rendering` value fixes it: `pixelated` drops module edges on a
               downscale, smooth blurs them, and which one wins depends on the exact ratio.
               A vector symbol has nothing to resample. ⛔ Do not swap in a .png "for
               consistency with the other /pay marks" — those are logos; this is money. */
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-mono text-micro uppercase eyebrow font-bold text-text-tertiary">{t.lipa.payingLabel}</p>
            <p className="mt-1 text-body-sm font-bold leading-snug text-text">{l.merchantName}</p>
          </div>

          <div>
            <p className="font-mono text-micro uppercase eyebrow font-bold text-text-tertiary">{t.lipa.numberLabel}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="amount font-mono text-title-lg font-bold tracking-wide text-gold-300">{pretty}</span>
              {/* `md` (44px), not `sm` (40px). Both clear `test:tap-target`, but 40 is the
                  ONE legal step below the bar and this is a money control on a phone —
                  taking the minimum here would be spending the exemption for nothing. */}
              <Button type="button" variant="ghost" size="md" onClick={copy} aria-label={t.lipa.numberLabel}>
                {copied ? <I.check s={14} /> : <I.copy s={14} />}
              </Button>
            </div>
          </div>

          {amountTzs != null && (
            <div>
              <p className="font-mono text-micro uppercase eyebrow font-bold text-text-tertiary">{t.lipa.amountLabel}</p>
              <p className="amount mt-1 text-body-sm font-bold text-gold-300">{formatTzs(amountTzs)}</p>
            </div>
          )}

          {l.ussdCode && (
            <p className="flex items-center gap-1.5 text-body-sm leading-relaxed text-text-muted">
              <I.ussd s={14} className="shrink-0 text-text-tertiary" />
              <span>
                {t.lipa.ussdLabel} <span className="font-mono font-bold text-text">{l.ussdCode}</span>
              </span>
            </p>
          )}
        </div>
      </div>

      <ol className="mt-4 space-y-1.5 text-body-sm leading-relaxed text-text-muted">
        {[t.lipa.step1, t.lipa.step2, t.lipa.step3].map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="amount shrink-0 font-mono font-bold text-text-tertiary">{i + 1}.</span>
            <span className="min-w-0">{s}</span>
          </li>
        ))}
      </ol>

      {/*
        THE LAST LINE OF DEFENCE IS THE PAYER'S OWN EYES. Every wallet app shows the
        merchant name before the PIN prompt. Telling someone what they should expect
        to see is the only check that survives a swapped poster in a shop window, and
        it costs one sentence.
      */}
      <p className="mt-3 flex gap-1.5 text-body-sm leading-relaxed text-text-tertiary">
        <I.shieldcheck s={14} className="mt-0.5 shrink-0" />
        <span>{t.lipa.verify}</span>
      </p>
    </section>
  );
}
