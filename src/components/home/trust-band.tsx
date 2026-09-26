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
import { fill, formatTzs } from "@/lib/utils";
import { eatDayKey, formatEatDay } from "@/lib/eat-day";
import { signoffWord } from "@/lib/markets/signoff";
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
/* ⭐ AN h2 SINCE LANDING v3 (WP17). The claim was a <p>, so this band's three <h3> cells sat under
   the Up & Down band's <h2> — a screen reader navigating by heading heard the trust facts as part of
   the fast game. The claim IS this section's heading; it now says so. */
function Claim({ text, accent }: { text: string; accent: string }) {
  const i = accent ? text.indexOf(accent) : -1;
  if (i < 0) return <h2 className="kp-claim">{text}</h2>;
  return (
    <h2 className="kp-claim">
      {text.slice(0, i)}
      <em>{accent}</em>
      {text.slice(i + accent.length)}
    </h2>
  );
}

export function TrustBand({
  t, locale, settlements, nowMs,
}: {
  t: Dict;
  locale: Locale;
  /** Already ordered `settledAt` DESC by `getPlatformStats`; only rows whose money has moved. */
  settlements: SettlementRow[];
  /** The render instant — a settlement from an earlier year prints its year. */
  nowMs: number;
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
                {/* `text-balance` on every .kp-shead__h, not some of them — it was on 3 of 5, which is the
                    kind of inconsistency that reads as a bug on whichever heading happens to wrap. */}
                <h3 className="kp-shead__h text-balance">{t.home.settledHead}</h3>
              </div>
              <Link href={"/results" as never} className="kp-shead__link">
                {t.home.settledSeeAll}
                <I.chevronRight s={14} />
              </Link>
            </div>

            {/* `role="list"`: WebKit drops the list role from a `list-style: none` ul (VoiceOver). */}
            <ul className="kp-settled" role="list">
              {settlements.map((s) => (
                <SettledRow key={s.id} row={s} t={t} locale={locale} nowMs={nowMs} />
              ))}
            </ul>
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
/* The floor under the settled strip’s money column.
 *
 * 🔴 EVERY SETTLED ROW IS ITS OWN GRID (`.kp-settled__row` is `display:grid`), so the four tracks
 * are sized per row and nothing makes them agree. The silent row — a market decided with an empty
 * pool, which prints no sum — sized its money track to the non-breaking space and collapsed it.
 * Measured on production 2026-09-24, five rows, at BOTH 768 and 1280:
 *
 *     row0  amt 148.22px   source host x=449
 *     row1  amt 156.02px   source host x=441
 *     row2  amt 156.02px   source host x=456
 *     row3  amt   7.81px   source host x=589   ← the silent row, 140px out of line
 *     row4  amt 148.22px   source host x=449
 *
 * Fixing the row’s HEIGHT (the non-breaking space, above) did not fix its WIDTH: an empty line box
 * is one line tall and nearly zero wide. The settling source is the trust signal on this panel and
 * it sat 140px away from the column it belongs to, on one row in five.
 *
 * ⭐ `ch` IS EXACT HERE, AND IT IS NORMALLY NOT. `1ch` is the advance of the digit zero, which in a
 * proportional face overshoots the average character by a quarter or more — this codebase has been
 * bitten by that. `.kp-settled__amt` is `--font-mono`, where every advance is the same by
 * definition. The arithmetic checks out against the measurement: 148.22px / 19 characters and
 * 156.02px / 20 characters both give 7.80px per character.
 *
 * 20ch is the widest row present ("TZS 20,350 yalilipwa"). It is a FLOOR, never a cap, so a larger
 * payout still widens its own cell rather than being clipped, and a shorter word in another locale
 * is padded up to the column instead of breaking it. It costs the question column 7.8px on the two
 * narrowest rows, which is the whole price.
 *
 * ⚠️ AND ONE QUESTION NOW TRUNCATES AT 1280 THAT DID NOT BEFORE — the silent row’s. Say it plainly:
 * that row was reading wider than its neighbours ONLY because its money track had collapsed and
 * handed the question the 148px it should never have had. Its un-truncated question was a symptom
 * of the defect, not a feature being spent. After this it clips exactly like row1 already did, and
 * clipping here is the designed behaviour — `.kp-settled__q` is `text-overflow: ellipsis` and the
 * whole row is a link to the market. Simulated on production before shipping: source-host spread
 * across the five rows falls from 148px to 15px at both 768 and 1280, no amount cell clips in any
 * locale, and 360 is untouched because the row stacks below 768. */
/* ⭐ SINCE LANDING v3 THE FLOOR LIVES IN globals.css, FROM 768 ONLY (`.kp-settled__amt`). The row is
   one line from 768 — the layout the 20ch floor was measured for — but below it v3 put the source and
   the amount on a SHARED line, and a 156px floor there ran the source link over the amount at 360
   (found by the v3 review). Below 768 the amount takes its own width and the source gives way. */
function SettledRow({ row, t, locale, nowMs }: { row: SettlementRow; t: Dict; locale: Locale; nowMs: number }) {
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
  // ⭐ WHEN, AND WHO (landing v3, WP13): the day the money moved, in the reader's own month words and
  // the platform's zone (`formatEatDay`, the /updown history formatter — `formatDayShort` is English
  // months in every locale), with the year when it is not this one; and THIS market's own sign-off
  // from `signoffOf` (lib/markets/signoff.ts) — never a fixed "two officers", which single-admin
  // resolution would make false (INHERIT-MANIFEST L2). `/fairness` renders the same rule and the same
  // words, so a reader who follows a row there reads the same answer.
  const when = row.settledAtMs != null ? (() => {
    const key = eatDayKey(row.settledAtMs);
    const day = formatEatDay(key, t.common.monthsShort, locale);
    const thisYear = key.slice(0, 4) === eatDayKey(nowMs).slice(0, 4);
    return fill(t.home.settledOn, { date: locale === "zh" || thisYear ? day : `${day} ${key.slice(0, 4)}` });
  })() : null;
  const who = row.signoff ? signoffWord(t.common, row.signoff) : null;
  const meta = [when, who].filter(Boolean).join(" · ");
  const host = sourceHost(row.sourceUrl);
  return (
    /* ⭐ THE WHOLE ROW IS STILL THE TARGET, AND NOW THE SOURCE IS A LINK OF ITS OWN.
       The row used to BE the anchor: the question alone measured 20px tall at 360, under half the
       44px floor, and making the row the link put the target at its own 64px minimum. v3 asks for
       the settling source as a link beside it (the delivery's results row), and a link cannot sit
       inside a link. So the row's link is its own element laid over the whole row
       (`.kp-settled__open`), exactly as the market card's `.mcardp-open` is, and the source link is
       raised above it. The tap target is unchanged; the source is now checkable in
       one tap, which is the point of naming it. */
    <li className="kp-settled__row">
      {/* `.kp-settled__pill` is `grid-area: o` and NOTHING else — the geometry is `.chip`'s. */}
      <Chip variant={variant} className="kp-settled__pill">{label}</Chip>
      {/* The row's link is a REAL element laid over the whole row (`.kp-settled__open`, the market card's
          `.mcardp-open` pattern) — not an `::after` on the question: a pseudo-element stretched to the row
          is measured from the link's own ~20px box by every tap-reach instrument, and the gate would have
          failed every row (v3 review). Its accessible name is the question. */}
      <Link href={`/markets/${row.id}` as never} className="kp-settled__open" aria-label={question} />
      <span className="kp-settled__q">{question}</span>
      {meta && <span className="kp-settled__meta">{meta}</span>}
      {/* The named public source the outcome was judged against — the host as the label, the real
          URL as the destination, opened beside the page. */}
      {host ? (
        <a className="kp-settled__src" href={row.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${host} · ${t.home.settledSourceNewTab}`}>
          <span className="kp-settled__host">{host}</span>
          <span aria-hidden className="kp-settled__ext"><I.externalLink s={11} /></span>
        </a>
      ) : <span className="kp-settled__src" aria-hidden />}
      {/* 🔴 THIS SAID "REFUNDED" OVER MARKETS THAT WERE NEVER REFUNDED. The condition folded THREE
          states into one word. A VOID really was refunded — every stake went back. A market resolved
          YES or NO whose pool was empty paid nothing because there was nothing in it; telling a player
          their money came back when none was staked is a false statement about money.
          ⛔ THE ZERO ARM RENDERS NOTHING rather than borrowing a word from a different event.
          ⚠️ `amountTzs == null` stays WITH the void arm: `settledAmount` returns null exactly when the
          outcome is not YES or NO. */}
      {isVoid || row.amountTzs == null ? (
        <span className="kp-settled__amt kp-settled__amt--void">{t.home.settledVoid}</span>
      ) : row.amountTzs > 0 ? (
        <span className="kp-settled__amt">{formatTzs(row.amountTzs)} {t.home.settledPaid}</span>
      ) : (
        /* 🔴 AN EMPTY CELL, NOT NO CELL — and not an EMPTY span either. Returning null removed the grid
           item and collapsed the row; an empty span has height 0 and held nothing. A non-breaking
           space gives the cell one line box at its own line-height, so the silent row keeps its
           tracks (measured on production 2026-09-24). `aria-hidden`: there is no figure to announce. */
        <span className="kp-settled__amt" aria-hidden>{"\u00a0"}</span>
      )}
    </li>
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
