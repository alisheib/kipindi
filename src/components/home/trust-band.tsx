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
 * ⭐ THE MOBILE-MONEY MARKS GO THROUGH `PaymentLogo`. The marks are TRADEMARKED and must not be
 * redrawn or re-tinted; every one in `public/pay/` is drawn for a light surface, so it needs the
 * white tile that component owns. ⛔ Never inline the SVG.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { PaymentLogo } from "@/components/wallet/payment-logo";
import { MOBILE_MONEY_METHODS } from "@/lib/payment-providers";
import { Chip } from "@/components/ui/chip";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { pickLocalized } from "@/lib/localized";
import { outcomeWord } from "@/lib/side-label";
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
        <p className="kp-hero__eyebrow text-balance">
          <span className="kp-hero__tick" aria-hidden />
          {t.home.trustEyebrow}
        </p>
        <Claim text={t.home.trustClaim} accent={t.home.trustClaimAccent} />

        <div className="kp-trust">
          {cells.map((c) => (
            <div key={c.h}>
              <span className="kp-trust__glyph" aria-hidden>{c.glyph}</span>
              {/* `text-balance` (2026-09-13): at 1280 and 768 the zh bodies left one glyph alone on
                  the last line. Balance, not pretty, because Firefox and older Safari ignore pretty. */}
              <h3 className="kp-trust__h text-balance">{c.h}</h3>
              {/* ⛔ `break-keep` IS APPLIED TO EVERY LOCALE EXCEPT CHINESE, AND THAT EXCEPTION IS THE POINT.
                    It is `word-break: keep-all`, which in CJK forbids a break BETWEEN CHARACTERS — so on
                    the Chinese page a paragraph can only break at punctuation and a line ends after
                    about seven glyphs, leaving 91px of a 328px column empty. Measured at 360 zh on
                    production 2026-09-24. It earns its place in sw/en, where it stops a long Swahili
                    compound splitting mid-word; in zh it has no word to protect and only does harm.
                    ⚠️ The measure is capped too. `.kp-trust__b` declares no max-width, so between 561
                    and 1023 — where this band is a single column — the line grew with the viewport:
                    89 characters at 640, 105 at 768, 142 at 1023. 62ch is the same order as the
                    52ch the Up & Down tagline already uses on this page.
                    🔴 50ch, NOT 62ch — THE SAME MIS-CALIBRATION THE HERO PAID FOR. `ch` is the advance
                    of the digit ZERO, which in Inter at 13px is 8.2px against an average character
                    advance of about 6.5px. 62ch resolved to 508px and still admitted 78 characters
                    on one line; measured on production after it shipped. 50ch ≈ 410px ≈ 63
                    characters. V7 in the landing gate is what caught both. */}
                <p
                  className={`kp-trust__b text-balance [overflow-wrap:anywhere]${locale === "zh" ? "" : " break-keep"}`}
                  style={{ maxWidth: "50ch" }}
                >{c.b}</p>
              {c.marks && (
                /* All four rails (2026-09-13). The cell says "mobile money in and out", and one
                   M-Pesa mark was left over from the old M-Pesa-only copy. The list and its order
                   come from the catalogue the deposit and withdraw pickers use. Four 40px tiles
                   plus three 8px gaps is 184px, and the middle cell at 768 has 192px. `flex-wrap`
                   lets narrower cells wrap instead of overflowing. */
                <span className="kp-trust__marks flex-wrap">
                  {/* Each official mark sits on its own white tile. `hue` is not used for a
                      delivered logo; it only colours the initials placeholder. */}
                  {MOBILE_MONEY_METHODS.map((m) => (
                    <PaymentLogo key={m.id} id={m.id} name={m.name} hue={m.hue ?? 0} size={40} />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>

        {settlements.length > 0 && (
          <>
            <div className="kp-shead" style={{ marginTop: "var(--rh-close)" }}>
              {/* 🔴 `min-w-0` — A FLEX ITEM DEFAULTS TO `min-width: auto`, WHICH MEANS IT REFUSES TO
                  SHRINK BELOW ITS CONTENT. This block sat at 236px inside a 148px column at a 180px
                  viewport (360 at 200% browser zoom, WCAG 1.4.4), pushing the document to 255px and
                  giving the whole page a horizontal scrollbar. Nothing here is nowrap; the text was
                  simply never given permission to wrap. Measured on production 2026-09-24. */}
              <div className="min-w-0">
                <p className="kp-hero__eyebrow text-balance">
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
  // 🔴 THE NULL ARM, WHICH DID NOT EXIST. `SettlementRow.outcome` is
  // `"YES" | "NO" | "VOID" | null`, and the old line was a two-armed dictionary ternary on the
  // YES token — so an UNRECORDED outcome fell through to the NO arm and rendered **"NO", in
  // red**, on a panel whose own header says *"THE OUTCOME IS READ, NEVER INFERRED"*. An enum
  // word used to mean absence is the worst case of §7's defect: it does not look like a bug,
  // it looks like a result.
  //
  // ⚠️ THE OLD LINE IS DESCRIBED, NOT QUOTED, AND THAT IS DELIBERATE. `test:labels` §4 scans
  // raw lines for exactly that shape, so pasting it here kept the count at 15 — the comment
  // explaining the fix WAS the fifteenth private word-map. Same decoy-anchor trap that made
  // `red:failure-reasons` mutate a comment earlier today: a scanner cannot tell code from
  // prose about code.
  //
  // ⛔ Belt and braces, deliberately. `platform-stats.ts` now applies the ticker's rule 5 and
  // drops null rows before they get here, so this arm should be unreachable — but the type
  // permits null, and the previous version of this file was ALSO written when it "could not
  // happen". A component that cannot describe its input renders nothing rather than a word
  // it made up.
  if (row.outcome === null) return null;
  const isVoid = row.outcome === "VOID";
  // ⭐ Through the ONE map (`side-label.ts`), not a private copy — §7's whole point. VOID gets
  // its own word there, because a refund is neutral and printing a direction over one is a
  // false statement about someone's money.
  const label = outcomeWord(t, row.outcome, "MARKET");
  // ⚠️ A TONE IS NOT A WORD — AND THAT IS WHY IT NOW HAS ITS OWN MAP, NOT THIS FILE'S.
  // The note this replaces was right about `side-label.ts`: pushing a colour through a
  // VOCABULARY map, which has no opinion about colour, is the defect, and `test:labels` §4
  // still deliberately does not count a colour ternary. §B11 (D4) supplies the map that DOES
  // have an opinion — `status-tone.ts` — so the VOID arm reads its tone from there rather
  // than naming a class. ⛔ The YES/NO arms stay: those are OUTCOME words carrying the
  // betting pair for its own meaning (§B2a), not app states borrowing it.
  const variant = isVoid ? TONE_CHIP[STATUS_TONE.VOID.player] : row.outcome === "YES" ? "yes" : "no";
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
      {/* `.kp-settled__pill` is `grid-area: o` and NOTHING else — it never set a height,
          a padding or a size. The geometry came from `.chip`, and the kit's `md` base is
          that rule byte-for-byte (21px / 0 8px / 10.5px), with the status metrics (23px /
          0 9px / 11px) on the VOID arm exactly as `.chip-pending` gave them. */}
      <Chip variant={variant} className="kp-settled__pill">{label}</Chip>
      <span className="kp-settled__q">{question}</span>
      {/* The named public source the outcome was judged against — the host only, because a full
          URL on a display row is noise and the market page carries the link itself. */}
      <span className="kp-settled__src">{sourceHost(row.sourceUrl)}</span>
      {/* 🔴 THIS SAID "REFUNDED" OVER MARKETS THAT WERE NEVER REFUNDED. The condition was
          `isVoid || amountTzs == null || amountTzs <= 0`, which folds THREE different states into
          one word. A VOID really was refunded — every stake went back. But a market resolved YES or
          NO whose pool was empty paid nothing because there was nothing in it, and telling a player
          their money came back when no money was ever staked is a false statement about money on
          the same panel whose header says the outcome is read and never inferred.
          ⛔ THE ZERO ARM NOW RENDERS NOTHING rather than borrowing a word that belongs to a
          different event. The outcome pill and the source still say what happened; silence about a
          sum nobody staked is the only honest thing this column can say, and inventing a fourth
          phrase would be new assessed copy in three locales for a row that has nothing to report.
          ⚠️ `amountTzs == null` stays WITH the void arm: `settledAmount` returns null exactly when
          the outcome is not YES or NO, so null here means VOID and nothing else.
          Caught on production 2026-09-24: a settled row carried the "NDIO" outcome pill and the
          refund word in the same row. */}
      {isVoid || row.amountTzs == null ? (
        <span className="kp-settled__amt kp-settled__amt--void">{t.home.settledVoid}</span>
      ) : row.amountTzs > 0 ? (
        <span className="kp-settled__amt">{formatTzs(row.amountTzs)} {t.home.settledPaid}</span>
      ) : null}
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
