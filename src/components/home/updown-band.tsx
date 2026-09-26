/**
 * §1e — UP & DOWN, the fast game, as a LIVE ROUND rather than a poster (landing v3, WP12).
 *
 * The band used to be one link with a count ("1 rounds live now") and a button: it told a visitor a
 * second game existed and showed nothing of it. v3 shows a round that is still taking bets: its asset
 * and duration, the price line since it opened, the opening price dashed across it, the two prices
 * that decide it, a countdown ring to when betting closes, and UP / DOWN straight into that round with
 * the side kept.
 *
 * ⛔ THE ROUND'S OWN RULE IS ON SCREEN (v3 review). It resolves UP if the price reaches `upTarget`, DOWN
 * if it reaches `downTarget`, and a finish between them is VOID with every stake refunded
 * (updown-service.ts). A dashed opening line alone, with the line coloured by "above or below the
 * open", told a reader a rule the round does not have. Both targets are drawn in the outcome inks and
 * named as the round page names them ("UP ≥ $X", "DOWN ≤ $Y" — price-hero.tsx); the line itself is
 * neutral.
 * ⛔ REAL DATA OR NOTHING (A-5). The line is the round's own CONFIRMED observations (`priceSeries` from
 * `getRoundDetail`) — fewer than two and no line is drawn. Observations exist only at grid boundaries,
 * so no "current price" is printed: the newest confirmed read is usually the round's own opening one,
 * and labelling it "now" would call a minutes-old number live. The concept's moving line was a random
 * walk and is not ported (L12).
 * ⛔ NOT ONE LINK ANY MORE. The whole band was an `<a>`; with buttons inside it, that would nest
 * interactive elements (WP17). It is a container, and each control is its own link.
 * Full width of the board column (Ali, 2026-09-26, R4(6)) — the band now has content on both sides.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Reveal } from "@/components/layout/reveal";
import { UpdownRing } from "@/components/home/updown-ring";
import { fill } from "@/lib/utils";
import { usd } from "@/lib/usd-price";
import { sideWord } from "@/lib/side-label";
import type { Dict } from "@/lib/i18n-dict";

/** A round still taking bets, already reduced to what the band draws. */
export type UpdownBandRound = {
  roundId: string;
  assetName: string;
  durationMinutes: number;
  decimals: number;
  openPrice: number | null;
  /** The price that wins UP, and the one that wins DOWN; between them the round voids. */
  upTarget: number | null;
  downTarget: number | null;
  /** Confirmed reads inside the round window, oldest first; null when fewer than two exist. */
  series: { ms: number; price: number }[] | null;
  opensAtMs: number;
  /** When betting closes on this round — what the ring counts to. */
  betsCloseAtMs: number;
  serverNowMs: number;
};

const W = 400, H = 112, PAD = 10;

/** The mini chart: the opening price dashed, the two deciding prices, and the real reads since open. */
function PriceLine({ round, label }: { round: UpdownBandRound; label: string }) {
  const pts = round.series ?? [];
  const values = [
    ...pts.map((p) => p.price),
    ...[round.openPrice, round.upTarget, round.downTarget].filter((v): v is number => v != null),
  ];
  if (values.length === 0) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const y = (v: number) => (hi === lo ? H / 2 : PAD + (1 - (v - lo) / span) * (H - PAD * 2));
  const t0 = round.opensAtMs;
  const t1 = pts.length ? Math.max(pts[pts.length - 1].ms, t0 + 1) : t0 + 1;
  const x = (ms: number) => ((ms - t0) / (t1 - t0)) * W;
  const rule = (v: number | null, cls: string) =>
    v == null ? null : <line className={cls} x1="0" x2={W} y1={y(v)} y2={y(v)} vectorEffect="non-scaling-stroke" />;
  return (
    <svg className="kp-udchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {rule(round.upTarget, "kp-udchart__target kp-udchart__target--up")}
      {rule(round.downTarget, "kp-udchart__target kp-udchart__target--down")}
      {rule(round.openPrice, "kp-udchart__open")}
      {pts.length >= 2 && (
        <polyline
          className="kp-udchart__line"
          points={pts.map((p) => `${x(p.ms).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ")}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export function UpdownBand({ t, liveCount, round }: { t: Dict; liveCount: number; round: UpdownBandRound | null }) {
  const up = sideWord(t, "YES", "UPDOWN");
  const down = sideWord(t, "NO", "UPDOWN");
  const upRule = round?.upTarget != null ? `${up.toUpperCase()} ≥ ${usd(round.upTarget, round.decimals)}` : null;
  const downRule = round?.downTarget != null ? `${down.toUpperCase()} ≤ ${usd(round.downTarget, round.decimals)}` : null;
  return (
    <Reveal band="updown" className="kp-band kp-band--tight kp-band--closes">
      <div className="kp-band__inner">
        <div className="kp-updown">
          <div className="kp-updown__copy">
            <p className="kp-hero__eyebrow text-balance" style={{ marginBottom: "var(--sp-1)" }}>
              <span className="live-dot" /> {t.home.updownEyebrow}
            </p>
            <h2 className="kp-shead__h text-balance" style={{ marginTop: 0 }}>{t.market.udTitle}</h2>
            <p className="kp-trust__b" style={{ maxWidth: "52ch" }}>{t.market.udTagline}</p>
            <p className="kp-topic__m">
              {/* The singular has its own key (the page printed "1 rounds live now" on 2026-09-26). */}
              {liveCount > 0
                ? <span className="kp-topic__live">{liveCount === 1 ? t.home.updownRoundsLiveOne : fill(t.home.updownRoundsLive, { n: liveCount })}</span>
                : t.home.updownStartsSoon}
            </p>
            <div className="kp-updown__acts">
              {round && (
                <>
                  {/* Into THIS round with the side kept — the round page locks a side on UP or DOWN. */}
                  <Link href={`/updown/${round.roundId}?side=UP` as never} className="btn btn-yes btn-lg kp-updown__bet">
                    <I.arrowUp s={16} /> {up}
                  </Link>
                  <Link href={`/updown/${round.roundId}?side=DOWN` as never} className="btn btn-no btn-lg kp-updown__bet">
                    <I.arrowDown s={16} /> {down}
                  </Link>
                </>
              )}
              {/* Beside UP/DOWN this is the quiet way in; with no round to show it is the band's one
                  action, so it keeps the primary skin the band has always had (v3 review).
                  `whiteSpace: normal` inline: `.btn` is unlayered and the utility lives in a cascade
                  layer, so the utility never won (measured on production at 200% zoom). */}
              <Link
                href={"/updown" as never}
                className={`btn ${round ? "btn-ghost" : "btn-primary"} btn-lg max-w-full kp-updown__all`}
                style={{ whiteSpace: "normal" }}
              >
                {!round && <I.trendingUp s={16} />}
                {t.home.updownCta}
                <I.chevronRight s={14} />
              </Link>
            </div>
          </div>

          {round && (
            <div className="kp-updown__round">
              <div className="kp-updown__head">
                <span className="kp-hero__eyebrow">{round.assetName} · {round.durationMinutes} {t.market.udMin}</span>
                {round.openPrice != null && (
                  <span className="kp-updown__open">{t.market.udOpenPrice} {usd(round.openPrice, round.decimals)}</span>
                )}
              </div>
              <div className="kp-updown__viz">
                <PriceLine
                  round={round}
                  label={[round.assetName, upRule, downRule, round.openPrice != null ? `${t.market.udOpenPrice} ${usd(round.openPrice, round.decimals)}` : null].filter(Boolean).join(" · ")}
                />
                <UpdownRing
                  opensAtMs={round.opensAtMs}
                  targetMs={round.betsCloseAtMs}
                  serverNowMs={round.serverNowMs}
                  capOpen={t.market.udBetsCloseIn}
                  capClosed={t.market.udSelectionsClosed}
                />
              </div>
              {upRule && downRule && (
                <p className="kp-updown__rules">
                  <span className="kp-updown__rule--up">{upRule}</span>
                  <span className="kp-updown__rule--down">{downRule}</span>
                </p>
              )}
              {/* Only when the dashed line is actually drawn (v3 review). */}
              {round.openPrice != null && <p className="kp-updown__note">{t.home.udDashed}</p>}
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}
