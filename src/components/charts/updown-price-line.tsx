/**
 * The Up & Down band's mini chart (landing v3, WP12): the opening price dashed, the two deciding
 * prices, and the round's real reads since it opened.
 *
 * ⭐ A MEMBER OF THE CHART HOME (`test:chart-one-home`), moved here from `components/home/updown-band.tsx`
 * on 2026-09-27: computed SVG geometry lives in `components/charts/`, and a chart drawn inside a landing
 * section is a second home the next chart edit would miss. The band keeps the words; this draws.
 *
 * ⛔ REAL DATA OR NOTHING (A-5). `series` is the round's own CONFIRMED observations — fewer than two
 * and no line is drawn, only the rules that are known. Every value comes from the caller's round.
 */
export type UpdownPriceLineRound = {
  openPrice: number | null;
  upTarget: number | null;
  downTarget: number | null;
  series: { ms: number; price: number }[] | null;
  opensAtMs: number;
};

const W = 400, H = 112, PAD = 10;

export function UpdownPriceLine({ round, label }: { round: UpdownPriceLineRound; label: string }) {
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
