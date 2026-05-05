/* Specimen wrappers for microstructure + screens */

const PriceChartSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Price chart · YES probability over time</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 720, lineHeight: 1.6 }}>
      Primary market visualization. Y-axis is implied YES probability (0–100%); 50% line emphasized. Right-edge tag shows current price; line+area gradient is teal→emerald. Time-range tabs: 1H · 24H · 7D · 30D · ALL.
    </div>
    <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 22 }}>
      <PriceChart data={samplePriceData} width={780} height={240} />
    </div>
    <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
      <span>Volume sparkline (24h):</span>
      <VolumeSparkline data={[8, 12, 6, 14, 22, 18, 9, 16, 28, 31, 24, 19, 15, 22, 28, 35, 41, 38, 27, 18, 12, 8, 6, 9]} width={300} />
    </div>
  </div>
);

const OrderBookSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Order book · depth · payout calculator</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 760, lineHeight: 1.6 }}>
      The three components that turn a generic platform into a real prediction market. <strong style={{ color: 'var(--text)' }}>Order book</strong> shows liquidity at each implied price; <strong style={{ color: 'var(--text)' }}>depth chart</strong> visualizes cumulative size on each side mirrored from the mid; <strong style={{ color: 'var(--text)' }}>payout calculator</strong> turns stake → expected return in pari-mutuel framing.
    </div>
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <OrderBook />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Depth chart</div>
          <DepthChart width={380} height={140} />
        </div>
        <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18 }}>
          <LiquidityHeat width={380} />
        </div>
        <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18 }}>
          <Countdown />
        </div>
      </div>
      <PayoutCalculator />
    </div>
    <div style={{ marginTop: 24 }}>
      <MarketStats />
    </div>
  </div>
);

const ResolutionSpecimen = () => (
  <div className="specimen" style={{ width: 1100 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Resolution &amp; objection</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 720, lineHeight: 1.6 }}>
      Every market has a designated source, fetched at a specific time, witnessed by two officers. The criterion clause is shown verbatim — legal-precise language, never marketing copy. Objections are public and append-only.
    </div>
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <ResolutionSourceCard />
      <DisputeLog />
    </div>
  </div>
);

const MarketDetailSpecimen = () => (
  <div className="specimen" style={{ width: 1340 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Market detail · full screen</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 760, lineHeight: 1.6 }}>
      The page where money happens. Combines: market header (title EN + Swahili + tags), price chart, signature TippingBar, microstats, depth + liquidity heat, resolution source, countdown, payout calculator, order book.
    </div>
    <MarketDetailScreen />
  </div>
);

const PortfolioSpecimen = () => (
  <div className="specimen" style={{ width: 1340 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Portfolio · P&amp;L view</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 760, lineHeight: 1.6 }}>
      User's view of their own performance. Top stat row, P&amp;L curve, allocation by category, open-positions table with side, stake, current value, payout-if-win, resolution timing, and inline probability bar.
    </div>
    <PortfolioScreen />
  </div>
);

Object.assign(window, {
  PriceChartSpecimen, OrderBookSpecimen, ResolutionSpecimen,
  MarketDetailSpecimen, PortfolioSpecimen,
});
