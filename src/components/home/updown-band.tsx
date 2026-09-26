/**
 * §1e — UP & DOWN, the fast game, as a LIVE ROUND rather than a poster (landing v3, WP12).
 *
 * The band used to be one link with a count ("1 rounds live now") and a button: it told a visitor a
 * second game existed and showed nothing of it. v3 shows the soonest round that is still taking bets:
 * its asset and duration, the real price line since it opened with the opening price dashed across
 * it, a countdown ring to when betting closes, and UP / DOWN straight into that round with the side
 * kept.
 *
 * ⛔ REAL DATA OR NOTHING (A-5). The line is the round's own CONFIRMED observations (`priceSeries`
 * from `getRoundDetail`) — fewer than two and it draws the opening line alone. Nothing is sampled or
 * simulated: the concept's moving line was a random walk, and it is not ported (L12).
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

/** The soonest open round, already reduced to what the band draws. */
export type UpdownBandRound = {
  roundId: string;
  assetName: string;
  durationMinutes: number;
  decimals: number;
  openPrice: number | null;
  livePrice: number | null;
  /** Confirmed reads inside the round window, oldest first; null when fewer than two exist. */
  series: { ms: number; price: number }[] | null;
  opensAtMs: number;
  /** When betting closes on this round — what the ring counts to. */
  betsCloseAtMs: number;
  serverNowMs: number;
};

const W = 400, H = 112, PAD = 10;

/** The mini line: price over time since the round opened, and the opening price as a dashed rule. */
function PriceLine({ round, label }: { round: UpdownBandRound; label: string }) {
  const pts = round.series ?? [];
  const values = [...pts.map((p) => p.price), ...(round.openPrice != null ? [round.openPrice] : [])];
  if (values.length === 0) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const y = (v: number) => (hi === lo ? H / 2 : PAD + (1 - (v - lo) / span) * (H - PAD * 2));
  const t0 = round.opensAtMs;
  const t1 = pts.length ? Math.max(pts[pts.length - 1].ms, t0 + 1) : t0 + 1;
  const x = (ms: number) => ((ms - t0) / (t1 - t0)) * W;
  const last = pts.length ? pts[pts.length - 1].price : null;
  const up = last != null && round.openPrice != null ? last >= round.openPrice : true;
  return (
    <svg className="kp-udchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {round.openPrice != null && (
        <line className="kp-udchart__open" x1="0" x2={W} y1={y(round.openPrice)} y2={y(round.openPrice)} vectorEffect="non-scaling-stroke" />
      )}
      {pts.length >= 2 && (
        <polyline
          className={up ? "kp-udchart__line kp-udchart__line--up" : "kp-udchart__line kp-udchart__line--down"}
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
  const now = round?.livePrice ?? round?.series?.[round.series.length - 1]?.price ?? null;
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
              {/* `whiteSpace: normal` inline: `.btn` is unlayered and `whitespace-normal` lives in a
                  cascade layer, so the utility never won — an inline style is the one mechanism that
                  cannot lose here (measured on production when the band was 229px wide at 200% zoom). */}
              <Link href={"/updown" as never} className="btn btn-ghost btn-lg max-w-full" style={{ whiteSpace: "normal" }}>
                {t.home.updownCta}
                <I.chevronRight s={14} />
              </Link>
            </div>
          </div>

          {round && (
            <div className="kp-updown__round">
              <div className="kp-updown__head">
                <span className="kp-hero__eyebrow">{round.assetName} · {round.durationMinutes} {t.market.udMin}</span>
                {now != null && <span className="kp-updown__now">{usd(now, round.decimals)}</span>}
              </div>
              <div className="kp-updown__viz">
                <PriceLine
                  round={round}
                  label={`${round.assetName} · ${t.market.udOpenPrice} ${usd(round.openPrice, round.decimals)}${now != null ? ` → ${usd(now, round.decimals)}` : ""}`}
                />
                <UpdownRing
                  opensAtMs={round.opensAtMs}
                  targetMs={round.betsCloseAtMs}
                  serverNowMs={round.serverNowMs}
                  capOpen={t.market.udBetsCloseIn}
                  capClosed={t.market.udSelectionsClosed}
                />
              </div>
              <p className="kp-updown__note">{t.home.udDashed}</p>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}
