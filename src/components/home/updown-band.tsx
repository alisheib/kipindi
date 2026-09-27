/**
 * §1e — UP & DOWN, THE FAST GAME, AS A MATCH (landing v3, ruling R5 · spec
 * `docs/design-system/v4-2026-09-26-landing-ten/specs/updown-band-v2.md`).
 *
 * R5 (Ali, 2026-09-27): *"people don't really like these graphs much — don't think anyone understands
 * them. We need something more elite, more unique, more visually appealing"*, rated 10/10 by a UI/UX +
 * gambling-industry panel on real frames before it ships. The price-line chart and its countdown ring are
 * gone. The band is a football scoreboard for one live round:
 *   G1 the fixture (asset mark, name, duration) and ONE clock line — "Dau linafungwa baada ya 01:52";
 *   G2 the plate — who is ahead, dated ("Juu inaongoza · saa 14:26 · Juu ya ufunguzi kwa $18.52"), with
 *      the Up and Down bet links INSIDE it, directly under the answer: the teams are the buttons;
 *   G3 one match timeline — a stem per confirmed read, the lock where betting closes, the flag where the
 *      price decides, the playhead (`components/charts/updown-match-track.tsx`);
 *   G4 the terms in two sentences — when it is decided, and when every stake comes back.
 *
 * ── THE HONESTY RULES (spec §11) ────────────────────────────────────────────────────────────────
 * ⛔ THE VERDICT IS SETTLEMENT'S OWN ANSWER. Each read's side is `decideOutcomeByTargets` on the round's
 * frozen targets (`toUpdownBandRound`), so "Juu inaongoza" is exactly what the round would settle on if it
 * closed at that read — UP at or above `upTarget`, DOWN at or below `downTarget`, and strictly between
 * them nobody leads and every stake comes back.
 * ⛔ NO STALE-AS-LIVE. Every verdict carries the minute of its CONFIRMED read and turns past tense ("Juu
 * iliongoza") once that read is older than the terminal's own stale rule, or at the deciding instant —
 * rendered so on the server, and flipped on the client by `UpdownMatchState`'s `data-aged`. The band
 * prints no absolute price anywhere, and no "live" beside a number (the eyebrow's "hai" is the game's).
 * ⛔ LAW 40. No pool, player count, multiplier, estimate or payout on the band: the round type carries no
 * money field (R5(b) keeps the pool and players off the band; the round page shows them and warns about a
 * one-sided round before any stake).
 * ⛔ L17. The only urgency is the real countdown: no pulse, and the leader is never lit — the buttons are
 * solid and equal whatever the score; the leader is told by the verdict's words, arrow and ink only.
 * ⛔ R5(a). The confirmed price refreshes every 60 seconds while the tab is visible, through the public
 * history feed — see `updown-match-state.tsx`.
 *
 * ── THE MECHANICS ───────────────────────────────────────────────────────────────────────────────
 * This file is a SERVER component and never calls a helper from a `"use client"` module (`mmss`,
 * `useTickSeconds`, `secondsUntil` live in client modules — a client helper called from server code took
 * down every page once while the build stayed green). It only RENDERS the client leaves: the wrapper
 * (`UpdownMatchState`: tense, lock, anchor, refresh), the digits, and the live score and timeline, whose
 * words come from the one builder `updown-match-words.tsx`.
 * NOT ONE LINK: the band is a container and each control is its own link (WP17).
 * Full width of the board column (R4(6)). With no readable round: today's band, unchanged (S8).
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Reveal } from "@/components/layout/reveal";
import { AssetMark } from "@/components/updown/asset-mark";
import { fill } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { UpdownBandRound } from "@/lib/updown-match";
import { UpdownMatchState } from "./updown-match-state";
import { UpdownMatchDigits } from "./updown-match-digits";
import { UpdownMatchScore, UpdownMatchTimeline } from "./updown-match-live";
import { matchWords } from "./updown-match-words";

export function UpdownBand({ t, locale, liveCount, round }: {
  t: Dict;
  locale: Locale;
  liveCount: number;
  round: UpdownBandRound | null;
}) {
  const copy = (
    <div className="kp-updown__copy">
      <p className="kp-hero__eyebrow text-balance" style={{ marginBottom: "var(--sp-1)" }}>
        <span className="live-dot" /> {t.home.updownEyebrow}
      </p>
      <h2 className="kp-shead__h text-balance" style={{ marginTop: 0 }}>{t.market.udTitle}</h2>
      <p className="kp-trust__b" style={{ maxWidth: "52ch" }}>{t.market.udTagline}</p>
      {/* The live count only when no round is shown (I-12): beside a round it says nothing the round
          does not. The singular has its own key (the page printed "1 rounds live now" on 2026-09-26). */}
      {!round && (
        <p className="kp-topic__m">
          {liveCount > 0
            ? <span className="kp-topic__live">{liveCount === 1 ? t.home.updownRoundsLiveOne : fill(t.home.updownRoundsLive, { n: liveCount })}</span>
            : t.home.updownStartsSoon}
        </p>
      )}
    </div>
  );

  // ── S8 · no live round, or none readable: today's band ──────────────────────────────────────────
  if (!round) {
    return (
      <Reveal band="updown" className="kp-band kp-band--tight kp-band--closes">
        <div className="kp-band__inner">
          <div className="kp-updown kp-updown--solo">
            {copy}
            <div className="kp-updown__acts">
              {/* The band's one action keeps the primary skin it has always had. `whiteSpace: normal`
                  inline: `.btn` is unlayered and the utility lives in a cascade layer, so the utility
                  never won (measured on production at 200% zoom). */}
              <Link
                href={"/updown" as never}
                className="btn btn-primary btn-lg max-w-full kp-updown__all"
                style={{ whiteSpace: "normal" }}
              >
                <I.trendingUp s={16} />
                {t.home.updownCta}
                <I.chevronRight s={14} />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    );
  }

  // ── S1–S7 · a live round ────────────────────────────────────────────────────────────────────────
  // The rule is static (targets and the deciding minute), so it is rendered here; the verdict, its
  // detail and the timeline are the live leaves' (they change when the refresh lands a newer read).
  const w = matchWords(t, locale, round);
  const roundHref = `/updown/${round.roundId}`;
  return (
    <Reveal band="updown" className="kp-band kp-band--tight kp-band--closes">
      <div className="kp-band__inner">
        {/* Keyed on the round and its render instant: a new server render is a new round state. */}
        <UpdownMatchState key={`${round.roundId}:${round.serverNowMs}`} className="kp-updown" round={round}>
          {copy}

          <div className="kp-udmatch" role="group" aria-labelledby="kp-udmatch-name">
            {/* G1 — identity and the one clock line */}
            <div className="kp-udmatch__head">
              <p className="kp-udmatch__fixture" id="kp-udmatch-name">
                <AssetMark icon={round.iconKey} ticker={round.assetKey} className="kp-udmatch__mark" />
                <span className="kp-udmatch__name">{round.assetName}</span>
                <Chip>{round.durationMinutes} {t.market.udMin}</Chip>
              </p>
              <div className="kp-udclock">
                <p className="kp-udclock__row kp-udclock__row--open">
                  <I.clock s={12} className="kp-udclock__glyph" />
                  <span className="kp-udclock__cap" aria-hidden>{t.market.udBetsCloseIn}</span>
                  <UpdownMatchDigits label={t.market.udBetsCloseIn} />
                </p>
                <p className="kp-udclock__row kp-udclock__row--closed">
                  <I.lock s={12} className="kp-udclock__glyph" />
                  {/* "Bets closed", then — past the deciding price's instant — "Awaiting result": the band never
                      states the result, the round page does. The link is described by this caption, so the focus
                      moved onto it at close also says why (WCAG 4.1.2). */}
                  <span className="kp-udclock__cap" id="kp-udclock-state">
                    <span className="kp-udclock__closed">{t.market.udLockedTitle}</span>
                    <span className="kp-udclock__decided">{t.market.udAwaitingResult}</span>
                  </span>
                  <Link href={roundHref as never} className="kp-udclock__watch" aria-describedby="kp-udclock-state">
                    {t.market.udRcWatchRound}
                    <I.chevronRight s={14} />
                  </Link>
                </p>
              </div>
            </div>

            {/* G2 — the score. The picks ARE the Up/Down links: always solid and equal, never lit.
                At close they leave and inert padlocked sides take their exact box. */}
            <UpdownMatchScore>
              <Link href={`${roundHref}?side=UP` as never} className="btn btn-yes btn-lg kp-udbug__pick kp-udbug__pick--up">
                <I.arrowUp s={16} />
                {w.up}
              </Link>
              <Link href={`${roundHref}?side=DOWN` as never} className="btn btn-no btn-lg kp-udbug__pick kp-udbug__pick--down">
                <I.arrowDown s={16} />
                {w.down}
              </Link>
              <span className="kp-udbug__side kp-udbug__side--up" aria-hidden><I.lock s={14} />{w.up}</span>
              <span className="kp-udbug__side kp-udbug__side--down" aria-hidden><I.lock s={14} />{w.down}</span>
            </UpdownMatchScore>

            {/* G3 — the timeline (components/charts) */}
            <UpdownMatchTimeline />

            {/* G4 — the terms, after the actions */}
            {w.rule != null && (
              <p className="kp-udrule">
                <span className="kp-udrule__glyph" aria-hidden><I.flag s={12} /></span>
                <span>{w.rule}</span>
              </p>
            )}
          </div>

          <div className="kp-updown__acts">
            <Link href={"/updown" as never} className="kp-shead__link kp-updown__all">
              {t.home.udMatchAllRounds}
              <I.chevronRight s={14} />
            </Link>
            <Link href={"/updown" as never} className="btn btn-primary btn-lg kp-updown__next">
              {t.home.udMatchNextRound}
              <I.chevronRight s={14} />
            </Link>
          </div>
        </UpdownMatchState>
      </div>
    </Reveal>
  );
}
