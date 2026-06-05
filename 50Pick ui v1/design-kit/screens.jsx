/* Full-screen prediction-market product mockups.
   Market detail (the page where money happens) + Portfolio (P&L view).
   These are the two screens a developer needs to know how everything
   composes together — order book, chart, calculator, all in context.
*/

const MarketDetailScreen = () => (
  <div style={{
    width: 1280, background: 'oklch(13% 0.012 240)',
    border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-lg)',
    padding: 24,
  }}>
    {/* Top bar */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid oklch(22% 0.013 240)', marginBottom: 24 }}>
      <FiftyLockup size={22} color="oklch(96% 0.005 240)" />
      <div style={{ display: 'flex', gap: 14, fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'oklch(78% 0.012 240)' }}>
        <span style={{ color: 'oklch(96% 0.005 240)', fontWeight: 600 }}>Markets</span>
        <span>Portfolio</span>
        <span>Leaderboard</span>
        <span>Wallet</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(85% 0.012 240)' }}>
        <Avatar initials="AM" size="sm" hue={150} />
        <span>TZS 84,200</span>
      </div>
    </div>

    {/* Market header */}
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Chip variant="neutral">Weather</Chip>
        <Chip variant="live" dot>Live</Chip>
        <Chip variant="neutral">Bimodal regions</Chip>
      </div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 700, color: 'oklch(96% 0.005 240)', letterSpacing: '-0.025em', marginBottom: 6, lineHeight: 1.15 }}>
        Will the long rains begin before April 15?
      </div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontStyle: 'italic', fontSize: 16, color: 'oklch(70% 0.012 240)' }}>
        Mvua za masika zitaanza kabla ya tarehe 15 Aprili?
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
      {/* Left column: chart + tipping bar + stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>YES probability · 30 days</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700, color: 'oklch(80% 0.13 152)', letterSpacing: '-0.03em' }}>62¢</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'oklch(72% 0.10 152)' }}>+4.2¢ today</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(70% 0.012 240)' }}>
              {['1H','24H','7D','30D','ALL'].map((t,i) => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 4, background: i === 3 ? 'oklch(22% 0.04 215)' : 'transparent', color: i === 3 ? 'oklch(85% 0.012 240)' : 'oklch(60% 0.012 240)', cursor: 'pointer' }}>{t}</span>
              ))}
            </div>
          </div>
          <PriceChart data={samplePriceData} width={760} height={220} />
          <div style={{ marginTop: 16 }}>
            <TippingBar yesPct={62} animate={false} />
          </div>
        </div>

        <MarketStats />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', padding: 18 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Depth</div>
            <DepthChart width={340} height={130} />
          </div>
          <div style={{ background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', padding: 18 }}>
            <LiquidityHeat width={340} />
          </div>
        </div>

        <ResolutionSourceCard />
      </div>

      {/* Right column: countdown + calculator + book */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', padding: 18 }}>
          <Countdown d={0} h={17} m={24} s={12} />
        </div>
        <PayoutCalculator />
        <OrderBook />
      </div>
    </div>
  </div>
);

const PortfolioScreen = () => (
  <div style={{
    width: 1280, background: 'oklch(13% 0.012 240)',
    border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-lg)',
    padding: 24,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid oklch(22% 0.013 240)', marginBottom: 24 }}>
      <FiftyLockup size={22} color="oklch(96% 0.005 240)" />
      <div style={{ display: 'flex', gap: 14, fontFamily: 'Sora, sans-serif', fontSize: 13, color: 'oklch(78% 0.012 240)' }}>
        <span>Markets</span>
        <span style={{ color: 'oklch(96% 0.005 240)', fontWeight: 600 }}>Portfolio</span>
        <span>Leaderboard</span>
        <span>Wallet</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
        <Avatar initials="AM" size="sm" hue={150} />
        <span style={{ color: 'oklch(85% 0.012 240)' }}>TZS 84,200</span>
      </div>
    </div>

    {/* Top stat row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
      {[
        ['Net P&L (30d)',    '+ TZS 28,420', '+18.4%', 'yes'],
        ['Open positions',   '7',            'TZS 142,000 staked', 'neutral'],
        ['Resolved · win-rate', '64%',       '23 of 36',  'yes'],
        ['Active streak',    '4',            'wins',      'gold'],
      ].map(([k, v, sub, tone], i) => (
        <div key={i} style={{
          background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
          borderRadius: 'var(--r-md)', padding: 18,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{k}</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 26,
            letterSpacing: '-0.02em',
            color: tone === 'yes' ? 'oklch(78% 0.13 152)' : tone === 'gold' ? 'oklch(80% 0.14 85)' : 'oklch(96% 0.005 240)',
          }}>{v}</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(70% 0.012 240)', marginTop: 4 }}>{sub}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
      {/* P&L chart */}
      <div style={{ background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', padding: 22 }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'oklch(96% 0.005 240)', marginBottom: 4 }}>P&amp;L · 30 days</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Cumulative net return</div>
        <PriceChart data={[
          { t:'Feb 12', yes: 0.50 },{ t:'Feb 16', yes: 0.51 },{ t:'Feb 20', yes: 0.49 },
          { t:'Feb 24', yes: 0.53 },{ t:'Feb 28', yes: 0.56 },{ t:'Mar 4', yes: 0.58 },
          { t:'Mar 8', yes: 0.61 },{ t:'Mar 12', yes: 0.64 },{ t:'today', yes: 0.68 },
        ]} width={620} height={210} />
        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(70% 0.012 240)' }}>
          <span>Best · <span style={{ color: 'oklch(78% 0.13 152)' }}>+TZS 18,400 · base-rate market</span></span>
          <span>Worst · <span style={{ color: 'oklch(78% 0.14 22)' }}>−TZS 5,000 · league title</span></span>
        </div>
      </div>

      {/* Allocation by category */}
      <div style={{ background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', padding: 22 }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'oklch(96% 0.005 240)', marginBottom: 4 }}>Allocation</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Stake by category</div>
        {[
          ['Weather',  42, 'oklch(60% 0.13 215)'],
          ['Sports',   28, 'oklch(60% 0.16 22)'],
          ['Macro',    18, 'oklch(58% 0.16 152)'],
          ['Politics', 8,  'oklch(70% 0.16 85)'],
          ['Culture',  4,  'oklch(60% 0.18 320)'],
        ].map(([k, pct, color], i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(85% 0.012 240)', marginBottom: 6 }}>
              <span>{k}</span><span>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'oklch(20% 0.013 240)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Open positions table */}
    <div style={{ marginTop: 24, background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid oklch(22% 0.013 240)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'oklch(96% 0.005 240)' }}>Open positions</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>7 active · TZS 142,000 staked</div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '2.4fr 80px 100px 100px 110px 1fr 80px',
        gap: 16, padding: '10px 22px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase',
        borderBottom: '1px solid oklch(22% 0.013 240)',
      }}>
        <span>Market</span><span>Side</span><span>Stake</span><span>Current</span><span>If win</span><span>Resolves</span><span></span>
      </div>
      {[
        { m: 'Long rains begin before Apr 15', side: 'YES', stake: '25,000', current: '40,322', payout: '40,322', resolves: '17h 24m · live',  pct: 62 },
        { m: 'Base rate change at next meeting', side: 'YES', stake: '10,000', current: '18,400', payout: '18,400', resolves: 'Resolved',     pct: 73, status: 'win' },
        { m: 'League title to favourite',        side: 'NO',  stake: '5,000',  current: '0',       payout: '0',       resolves: 'Resolved',     pct: 8,  status: 'loss' },
        { m: 'TZS-USD above 2,650 by month-end', side: 'NO',  stake: '40,000', current: '32,800',  payout: '32,800',  resolves: '4d 11h · live', pct: 32 },
        { m: 'Bunge passes finance bill v2',     side: 'YES', stake: '12,000', current: '8,400',   payout: '8,400',   resolves: '11d',           pct: 41 },
      ].map((p, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '2.4fr 80px 100px 100px 110px 1fr 80px',
          gap: 16, padding: '14px 22px', alignItems: 'center',
          borderBottom: '1px solid oklch(22% 0.013 240)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'oklch(85% 0.012 240)',
        }}>
          <span style={{ fontFamily: 'Sora, sans-serif', color: 'oklch(96% 0.005 240)' }}>{p.m}</span>
          <Chip variant={p.side === 'YES' ? 'yes' : 'no'}>{p.side}</Chip>
          <span>{p.stake}</span>
          <span style={{ color: p.status === 'loss' ? 'oklch(72% 0.14 22)' : p.status === 'win' ? 'oklch(78% 0.13 152)' : 'oklch(85% 0.012 240)' }}>{p.current}</span>
          <span style={{ color: 'oklch(78% 0.13 152)' }}>{p.payout}</span>
          <span style={{ color: 'oklch(70% 0.012 240)' }}>{p.resolves}</span>
          <span style={{ width: 64 }}><ProbabilityBar yesPct={p.pct} size="micro" /></span>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { MarketDetailScreen, PortfolioScreen });
