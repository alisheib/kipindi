/**
 * ONE QUESTION ON A JOURNEY SURFACE — the journey card, in every state (the Vodacom plan S7, §3.2; S7-PLAN WP5 as
 * amended by A12, A15, A16 and A24; the S4 boards s4-3-card-priced, -today, -closed, -settled, -one-side, -empty-pool,
 * -over-cap, -legacy, -320 and -longest-360, and the three cards of pick-1-home, drawn in the kit's tokens).
 *
 * ⭐ ONE SERVER COMPONENT, ITS STATE THE MARKET'S OWN (B9 inside it: the live, closed and settled states are one
 * component). A question that takes bets draws its two picks; one whose selection has closed, the closed row; a settled
 * one, the result row. The caller hands the market row and the render's clock and never chooses a state. It stands
 * beside the classic `MarketCard`, which stays untouched — its chunk, its red anchors and its raw readers (Open point 3).
 * WP7 mounts it on the home (an h2, `from: "home"`) and WP10 on `/live`, `/watchlist` and `/results` (h2) and in the
 * question page's similar rail (h3); nothing mounts it in WP5.
 *
 * ⭐ IT DECIDES NOTHING ITSELF: every figure and every word comes from WP3's pure rules, each called once, here, on the
 * server — `cardFigures` (whether it takes a bet now and each side's `cardEstimate`, exactly what the bet sheet serves,
 * so the card and the sheet cannot disagree about a market), `cardFace` (the picks, the meta label and its ink, the
 * one-sided note), `cardCloseLabel` with `cardCloseText` (an East Africa day, computed with the render's clock: in the
 * browser, midnight in Dar es Salaam could split the server from the client), `cardTitle` (the reader's short title,
 * else the reader's full one) and `normaliseCompetition` with `competitionLabel`. It prints no pool, no percentage and
 * no price state, and carries no predictor count, bar, sparkline, 24-hour move, status chip, watermark or Share (§3.2).
 *
 * ── THE ANATOMY (WP5 step 2) ─────────────────────────────────────────────────────────────────────────────────────────
 *   · THE META ROW: "category · competition" on the left, a `DotSeq` (it breaks between the two, and its dot never
 *     opens or ends a line), in the row's subtle ink; on the right the label, wearing the face's ink (A12): "Inafungwa
 *     leo" with its clock and "Inasubiri matokeo" with the closed hourglass take the brighter muted ink; "Siku N",
 *     "Imetatuliwa" (its check has no ink of its own) and "Imebatilishwa" keep the row's (Points for Ali 10).
 *   · THE HEADING: the short title on the title-sm rung — an h2, or an h3 in the similar rail — through `keepFigures`
 *     and balanced, like every market title. Only the full-title fallback is held to two lines: a short title is never
 *     clamped (`short-title.ts`: a longer one takes another line rather than losing its end).
 *   · THE PICKS: two links in the side buttons' ink and tracking, with no button height and no nowrap, which a two-line
 *     pick cannot use. The side word on the h4 rung (A15) over the face's words — "Shinda ≈2.8× dau", the figure a mono
 *     unit joined to the words after it by no-break spaces, so a break reads "Shinda / ≈2.8× dau", never "…≈2.8× / dau"
 *     (§0g item 11); "Kuwa wa kwanza" (Open point 8); "Upande mmoja tu"; over the cap "Upande mdogo, ona makadirio",
 *     with no number and its two clauses each whole (Open point 6); a thin side "Faida ndogo · ≈1.0×", one part a line
 *     (`DotSeq`'s centred form); and nothing under a hidden figure or an Up & Down side, which centres its side word.
 *   · OR THE CLOSED ROW, a lock and "Imefungwa", not a control; OR THE RESULT ROW: "Matokeo", the settled instant and
 *     the outcome chip in its own ink — the YES ink, the NO ink, a void's neutral one (one-sided 8.10's rule).
 *   · UNDER THEM, ON AN UNSETTLED ONE-SIDED POOL: the refund sentence naming the empty side, in the closed phase too
 *     (L22, Open point 7 — a departure from the canvas, which draws none).
 *
 * ── THE LINKS (WP5 step 3, Open point 4): real anchors, rendered on the server, so a tap works before hydration ─────
 *   · THE CARD IS ONE LINK, stretched under its picks (the classic card's pattern, without its classes): to the
 *     question, or for an Up & Down row on `/live` to its round (`/updown` when none resolved, as /live's wall links
 *     it). Its name is the reader's full title.
 *   · THE PICKS go exactly where today's buttons go: the question with `?side=YES` or `?side=NO`, plus `from=home` on
 *     the home, never prefetched (the landing rows' rule). An Up & Down pick reaches its round through the question
 *     page's `?side` translation. A pick's name is its visible text. S8 turns these same anchors into the sheet.
 *   · NavProgress starts on any internal anchor, so there is no click handler and no navigating event here.
 *
 * ── THE SETTLED INSTANT (A12 item 4, as A24 item 3 re-derives it) ── bound once, `settledAt` else `resolutionAt`, and
 * the one date the card prints: `formatEatDateTime` in the reader's month words and the East Africa clock, with the
 * year when the instant is not in this year (/results lists the whole settled archive), inside a `<time>` naming that
 * very instant — never the English `formatDeadline`. `test:timer-date` §3 holds it.
 *
 * ⛔ NEVER HERE: the classic card's surface hook, its classes or the board grid's (V18 selects them, and the phone
 * density blocks rewrite them); a directive (no client module may import this file — `test:journey-home` §4); an
 * inline style, or a size or ink of its own. Its rules are the `.kp-jcard` family in globals.css and its `--jcard-*`
 * tokens, which WP7's ghost reads too.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { DotSeq } from "@/components/ui/dot-seq";
import { I } from "@/components/ui/glyphs";
import { keepFigures } from "@/components/ui/keep-words";
import { cardFace, type CardMeta, type PickFace } from "@/lib/journey/card-face";
import { cardCloseLabel, cardCloseText, type CardCloseLabel } from "@/lib/markets/card-close-label";
import { cardTitle } from "@/lib/markets/short-title";
import { normaliseCompetition } from "@/lib/markets/competitions";
import { competitionLabel } from "@/lib/markets/competition-label";
import { marketCategoryLabel, pickLocalized } from "@/lib/localized";
import { outcomeWord, sideWord } from "@/lib/side-label";
import { formatEatDateTime } from "@/lib/eat-day";
import { cardFigures } from "@/lib/server/journey-sheet";
import type { StoredMarket } from "@/lib/server/market-service";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * The fields of a market row the card reads: the row as every surface already holds it. WP10 hands the row itself,
 * never a price and never a `?? 0` on a pool.
 */
export type JourneyCardMarket = Pick<
  StoredMarket,
  | "id" | "titleEn" | "titleSw" | "titleZh" | "shortTitleEn" | "shortTitleSw" | "shortTitleZh" | "category" | "competition"
  | "status" | "resolvedOutcome" | "yesPool" | "noPool" | "feeSnapshot" | "productLine" | "selectionClosedAt" | "resolutionAt"
  | "settledAt"
>;

/** The no-break space that joins a figure to the words after it. Built, never pasted: an invisible character is
 *  invisible in review too (the `short-title.ts` rule). */
const NBSP = String.fromCharCode(0xa0);

/**
 * "Shinda ≈{mult}× dau" with its figure: the space-delimited token holding `{mult}` (its "≈" and "×" with it) is one
 * mono unit, and every space after it becomes a no-break space, so the figure never leaves its unit — "≈2.8× dau",
 * "≈2.8× your bet", "≈2.8× 投注" — and the line can break only before the figure.
 */
function winWords(template: string, mult: string): ReactNode {
  const at = template.indexOf("{mult}");
  if (at < 0) return template;
  const from = template.lastIndexOf(" ", at) + 1;
  const space = template.indexOf(" ", at);
  const to = space < 0 ? template.length : space;
  return (
    <>
      {template.slice(0, from)}
      <span className="kp-jcard__mult">{template.slice(from, to).replace("{mult}", mult)}</span>
      {template.slice(to).split(" ").join(NBSP)}
    </>
  );
}

/**
 * Over the cap — "Upande mdogo, ona makadirio": each clause kept whole, so it breaks only after the comma, as the
 * over-cap board draws it. The space between the clauses is a text node of its own, where every engine offers the
 * break (`keep-words.tsx`, R6-1). A language whose comma takes no space (Chinese "，") breaks between its characters
 * and is left as written.
 */
function overCapWords(text: string): ReactNode {
  const at = text.indexOf(", ");
  if (at < 0) return text;
  return (
    <>
      <span className="kp-jcard__run">{text.slice(0, at + 1)}</span>
      {" "}
      <span className="kp-jcard__run">{text.slice(at + 2)}</span>
    </>
  );
}

/** A thin side's figure ("≈1.0×"): the mono unit, as the win line sets it. */
const thinPart = (mult: string) => (part: string): ReactNode =>
  part.includes(mult) ? <span className="kp-jcard__mult">{part}</span> : part;

/** A pick's second line — the face's words, or nothing for a hidden figure or an Up & Down side. */
function pickWords(face: PickFace, t: Dict): ReactNode {
  switch (face.kind) {
    case "win":
      return winWords(t.journey.cardWin, face.mult);
    case "thin":
      // "Faida ndogo · ≈1.0×" is two parts on a centred line, so each opens its own line and no dot is shown at a
      // line's end (`DotSeq` stack: a centred line cannot hide a dot at its edge).
      return <DotSeq text={t.journey.cardThin.replace("{mult}", face.mult)} stack renderPart={thinPart(face.mult)} />;
    case "overCap":
      return overCapWords(t.journey.cardOverCap);
    case "beFirst":
      return t.journey.cardBeFirst;
    case "oneSide":
      return t.market.oneSideOnly;
    case "word":
      return null;
  }
}

/** The meta row's right-hand words, from the face's kind (A12) and the close label it was derived from. */
function metaWords(meta: CardMeta, close: CardCloseLabel | null, t: Dict): string | null {
  switch (meta.kind) {
    case "today":
    case "days":
      return cardCloseText(close, t.journey);
    case "waiting":
      return t.market.waitingForResults;
    case "settled":
      return t.market.resolvedOutcome;
    case "void":
      return t.common.voided;
  }
}

/** Its glyph: a clock for today, the closed hourglass while the result is awaited (the market page's and /live's mark
 *  for that state), a check once settled; "Siku N" and a void carry none. */
function metaGlyph(meta: CardMeta): ReactNode {
  if (meta.kind === "today") return <I.clock s={14} />;
  if (meta.kind === "waiting") return <I.hourglassOff s={14} />;
  if (meta.kind === "settled") return <I.checkCircle s={14} />;
  return null;
}

export function JourneyCard({ m, nowMs, t, locale, heading = "h2", from, roundId }: {
  m: JourneyCardMarket;
  /** The render's clock (ms since the epoch): the close label, the bet test's resolution half and the settled date's
   *  year all read it. (`cardFigures` reads the selection half off the wall clock itself, as the bet path does.) */
  nowMs: number;
  t: Dict;
  locale: Locale;
  /** h2 on the home, `/live`, `/watchlist` and `/results`; h3 in the question page's similar rail (WP5 step 1). */
  heading?: "h2" | "h3";
  /** The home's picks carry `from=home`, which the old journey's funnel reads (side-picker.tsx). */
  from?: "home";
  /** An Up & Down row on `/live`: its round's id, or null when none resolved. Omitted elsewhere — the question page
   *  sends an Up & Down market to its round itself. */
  roundId?: string | null;
}) {
  const { bettable, estimates } = cardFigures(m, nowMs);
  const close = cardCloseLabel(m, nowMs);
  const face = cardFace({ productLine: m.productLine, status: m.status, resolvedOutcome: m.resolvedOutcome, bettable, estimates, close });
  const title = cardTitle(locale, m);
  const competition = normaliseCompetition(m.competition);
  const where = [marketCategoryLabel(t, m.category), competition ? competitionLabel(t, competition) : null]
    .filter((w): w is string => w !== null)
    .join(" · ");
  const label = face.meta ? metaWords(face.meta, close, t) : null;
  const settledIso = m.settledAt ?? m.resolutionAt;
  const target = m.productLine === "UPDOWN" && roundId !== undefined ? (roundId ? `/updown/${roundId}` : "/updown") : `/markets/${m.id}`;
  const pickHref = (side: "YES" | "NO") => `/markets/${m.id}?side=${side}${from === "home" ? "&from=home" : ""}`;
  const pick = (side: "YES" | "NO", pf: PickFace) => (
    <Link
      href={pickHref(side) as never}
      prefetch={false}
      className={`${side === "YES" ? "btn-yes" : "btn-no"} kp-jcard__pick${pf.kind === "word" ? " kp-jcard__pick--word" : ""}`}
    >
      <span className="kp-jcard__side">{sideWord(t, side, m.productLine)}</span>
      {pf.kind !== "word" && <>{" "}<span className="kp-jcard__line">{pickWords(pf, t)}</span></>}
    </Link>
  );
  const Heading = heading;
  return (
    <article className="kp-jcard" data-row-id={m.id} data-testid="journey-card">
      <Link href={target as never} className="kp-jcard__open" aria-label={pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)} />
      <div className="kp-jcard__meta">
        <DotSeq text={where} className="kp-jcard__where" />
        {face.meta && label && (
          <>
            {" "}
            <span className="kp-jcard__when" data-emphasis={face.meta.emphasis}>{metaGlyph(face.meta)}{label}</span>
          </>
        )}
      </div>
      <Heading className={title.short ? "kp-jcard__title text-title-sm" : "kp-jcard__title kp-jcard__title--full text-title-sm"}>
        {keepFigures(title.text)}
      </Heading>
      <div className="kp-jcard__act">
        {face.picks.kind === "open" ? (
          <div className="kp-jcard__picks">
            {pick("YES", face.picks.YES)}
            {pick("NO", face.picks.NO)}
          </div>
        ) : face.picks.kind === "closed" ? (
          <p className="kp-jcard__closed"><I.lock s={16} />{t.market.statusClosed}</p>
        ) : (
          <div className="kp-jcard__settled">
            <p className="kp-jcard__result">
              <span className="kp-jcard__result-label text-body">{t.journey.cardResultLabel}</span>
              {" "}
              <time dateTime={settledIso} className="kp-jcard__at">{formatEatDateTime(Date.parse(settledIso), nowMs, t.common.monthsShort, locale)}</time>
            </p>
            {face.picks.outcome && (
              <>
                {" "}
                <Chip variant={face.picks.ink} size="lg" className="kp-jcard__outcome">{outcomeWord(t, face.picks.outcome, m.productLine)}</Chip>
              </>
            )}
          </div>
        )}
        {face.oneSidedNote && (
          <p className="kp-jcard__note">{t.market.oneSidedNote.replace("{side}", sideWord(t, face.oneSidedNote, m.productLine))}</p>
        )}
      </div>
    </article>
  );
}
