/**
 * §1f — WHY THE RESULT CAN BE TRUSTED, and §1g the settled strip inside the same act.
 *
 * What this replaces was three icon-over-text columns — the most generic pattern on the web. The
 * kit promotes one editorial claim and demotes the three facts to cells divided by 1px rules.
 *
 * ⚠️ THE CLAIM'S EMPHASISED WORD DOES NOT GET GOLD. The kit sets `result` in `--gilt`. Q5 settled
 * that gold means money that was EARNED, and batch 2 removed gilt from the hero's "wisdom" on
 * exactly that ground — a headline word is emphasis, not money. It takes an `<em>`, a typographic
 * mark rather than a colour, so `test:gold-is-money` has nothing to object to and the page keeps
 * one meaning for gold.
 *
 * ⭐ THE M-PESA MARK GOES THROUGH `PaymentLogo`. The marks are TRADEMARKED and must not be
 * redrawn or re-tinted; `public/pay/mpesa.svg` is a vertical lockup drawn for a light surface, so
 * it needs the white tile that component owns. ⛔ Never inline the SVG.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { PaymentLogo } from "@/components/wallet/payment-logo";
import { pickLocalized } from "@/lib/localized";
import { formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { Reveal } from "@/components/layout/reveal";
import type { SettlementRow } from "@/lib/server/platform-stats";

/**
 * The claim, with its emphasised word wrapped in `<em>`.
 *
 * The word to emphasise is an EXPLICIT dict key per locale (`trustClaimAccent`), not a regex over
 * some other string. An earlier revision inferred it by matching the eyebrow for
 * /result|matokeo|结果/ — it worked in all three locales and was still the wrong shape: a
 * translator cannot see it, and a rephrased eyebrow would silently drop the emphasis on a sentence
 * whose whole job is to be read. When the marker is absent from the claim the sentence renders
 * whole: a missing emphasis is invisible, a mis-split sentence is broken.
 */
function Claim({ text, accent }: { text: string; accent: string }) {
  const i = accent ? text.indexOf(accent) : -1;
  if (i < 0) return <p className="kp-claim">{text}</p>;
  return (
    <p className="kp-claim">
      {text.slice(0, i)}
      <em>{accent}</em>
      {text.slice(i + accent.length)}
    </p>
  );
}

export function TrustBand({
  t, locale, settlements,
}: {
  t: Dict;
  locale: Locale;
  /** Already ordered `settledAt` DESC by `getPlatformStats`; only rows whose money has moved. */
  settlements: SettlementRow[];
}) {
  const cells = [
    { glyph: <I.shieldcheck s={26} />, h: t.home.trustCell1H, b: t.home.trustCell1B, marks: false },
    { glyph: <I.resolved s={26} />,    h: t.home.trustCell2H, b: t.home.trustCell2B, marks: false },
    { glyph: <I.phone s={26} />,       h: t.home.trustCell3H, b: t.home.trustCell3B, marks: true },
  ];

  return (
    <Reveal band="trust" className="kp-band kp-band--overlay kp-band--seam kp-band--closes">
      <div className="kp-band__inner">
        <p className="kp-hero__eyebrow">
          <span className="kp-hero__tick" aria-hidden />
          {t.home.trustEyebrow}
        </p>
        <Claim text={t.home.trustClaim} accent={t.home.trustClaimAccent} />

        <div className="kp-trust">
          {cells.map((c) => (
            <div key={c.h}>
              <span className="kp-trust__glyph" aria-hidden>{c.glyph}</span>
              <h3 className="kp-trust__h">{c.h}</h3>
              <p className="kp-trust__b">{c.b}</p>
              {c.marks && (
                <span className="kp-trust__marks">
                  {/* The official mark on its own white tile. `hue` is unused on this path — it
                      only feeds the initials placeholder when a mark has not been delivered. */}
                  <PaymentLogo id="MPESA" name="M-Pesa" hue={140} size={40} />
                </span>
              )}
            </div>
          ))}
        </div>

        {settlements.length > 0 && (
          <>
            <div className="kp-shead" style={{ marginTop: "var(--rh-close)" }}>
              <div>
                <p className="kp-hero__eyebrow">
                  <span className="kp-hero__tick" aria-hidden />
                  {t.home.settledEyebrow}
                </p>
                <h3 className="kp-shead__h">{t.home.settledHead}</h3>
              </div>
              <Link href={"/results" as never} className="kp-shead__link">
                {t.home.settledSeeAll}
                <I.chevronRight s={14} />
              </Link>
            </div>

            <div className="kp-settled">
              {settlements.map((s) => (
                <SettledRow key={s.id} row={s} t={t} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </Reveal>
  );
}

/**
 * One settled market.
 *
 * ⛔ THE OUTCOME IS READ, NEVER INFERRED (law 25 / `test:outcome`). `row.outcome` comes from the
 * stored `resolvedOutcome`; there is deliberately no pool comparison anywhere in this file.
 * ⛔ A VOID SHOWS NO FIGURE. We kept nothing and every stake was refunded, so `netPool` does not
 * describe what happened — it says "refunded", in the muted ink, never in the money gilt and
 * never as an error (licence condition 4 / §C4: a refund is neutral).
 */
function SettledRow({ row, t, locale }: { row: SettlementRow; t: Dict; locale: Locale }) {
  const isVoid = row.outcome === "VOID";
  const label = isVoid ? t.common.voided : row.outcome === "YES" ? t.common.yes : t.common.no;
  const tone = isVoid ? "chip-pending" : row.outcome === "YES" ? "chip-yes" : "chip-no";
  const question = pickLocalized(locale, row.titleEn, row.titleSw, row.titleZh);
  return (
    /* ⭐ THE WHOLE ROW IS THE LINK, AND THAT IS A FIX, NOT A FLOURISH. The question alone was the
       anchor, and at 360 it is one line of `--type-small` — measured at **20px**, less than half
       the 44px floor, on a NEW control with no frozen-card exemption to hide behind. Caught by
       `qa:landing-shots` at 360 in sw and zh.
       Making the row the anchor puts the target at the row's own 64px minimum without moving one
       pixel of layout — and it is what a reader expects anyway: tapping a settled row opens the
       market, not just the eleven characters of its title that fit. `aria-label` names the whole
       thing so a screen reader hears the question rather than "link". */
    <Link
      href={`/markets/${row.id}` as never}
      className="kp-settled__row"
      aria-label={question}
    >
      <span className={`kp-settled__pill chip ${tone}`}>{label}</span>
      <span className="kp-settled__q">{question}</span>
      {/* The named public source the outcome was judged against — the host only, because a full
          URL on a display row is noise and the market page carries the link itself. */}
      <span className="kp-settled__src">{sourceHost(row.sourceUrl)}</span>
      {isVoid || row.amountTzs == null || row.amountTzs <= 0 ? (
        <span className="kp-settled__amt kp-settled__amt--void">{t.home.settledVoid}</span>
      ) : (
        <span className="kp-settled__amt">{formatTzs(row.amountTzs)} {t.home.settledPaid}</span>
      )}
    </Link>
  );
}

/** The source's host, uppercased by CSS. Falls back to nothing rather than to a raw URL. */
function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
