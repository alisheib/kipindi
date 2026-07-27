/* Market objects: MarketCard, BuyTray, PositionCard, ResolutionPanel,
   LeaderboardRow, EmptyState. Concept system — placeholder copy. */

const fmt = (n) => n.toLocaleString('en-US');

const MarketCard = ({ title, titleSw, category, yesPct, volume, predictors, timeLeft, status = 'live', resolved, hover }) => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${hover ? 'var(--teal-500)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)',
      padding: 18,
      width: 360,
      transition: 'all var(--ease-stage)',
      boxShadow: hover ? '0 8px 28px -12px rgba(0,0,0,0.45)' : 'none',
      transform: hover ? 'translateY(-2px)' : 'none',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Chip variant={status === 'resolved' ? 'resolved' : status === 'live' ? 'live' : 'neutral'} dot={status === 'live'}>
          {status === 'live' ? 'Live' : status === 'resolved' ? 'Resolved' : 'Pending'}
        </Chip>
        <Chip variant="neutral">{category}</Chip>
      </div>
      <button style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
        <Icon name="external" size={16} />
      </button>
    </div>
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {titleSw && (
        <div style={{ fontSize: 13, color: 'var(--text-subtle)', fontStyle: 'italic', marginTop: 4 }}>
          {titleSw}
        </div>
      )}
    </div>
    <div style={{ marginBottom: 12 }}>
      <ProbabilityBar yesPct={yesPct} size="micro" resolved={resolved} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        <span style={{ color: 'var(--yes-300)' }}>YES <strong style={{ fontWeight: 700 }}>{yesPct}¢</strong></span>
        <span style={{ color: 'var(--text-subtle)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontStyle: 'italic' }}>
          {Math.abs(yesPct - 50) < 4 ? 'tipping' : yesPct > 50 ? 'leans yes' : 'leans no'}
        </span>
        <span style={{ color: 'var(--no-300)' }}><strong style={{ fontWeight: 700 }}>{100 - yesPct}¢</strong> NO</span>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
      <span>vol {volume}</span>
      <span>·</span>
      <span>{predictors} predictors</span>
      <span style={{ marginLeft: 'auto' }}>{timeLeft}</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Btn variant="yes" size="md">YES @ {yesPct}%</Btn>
      <Btn variant="no"  size="md">NO @ {100 - yesPct}%</Btn>
    </div>
  </div>
);

const BuyTray = ({ side = 'yes' }) => {
  const [activeSide, setActiveSide] = React.useState(side);
  const [amount, setAmount] = React.useState('25,000');
  const chips = ['1k', '5k', '10k', '25k', '50k', '100k'];
  const num = parseInt(amount.replace(/[^\d]/g, '')) || 0;
  const odds = activeSide === 'yes' ? 0.62 : 0.38;
  const payout = Math.round(num / odds);
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: 20,
      width: 340,
    }}>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)', marginBottom: 18 }}>
        <button
          onClick={() => setActiveSide('yes')}
          style={{
            flex: 1, height: 36, border: 'none', cursor: 'pointer',
            background: activeSide === 'yes' ? 'var(--yes-500)' : 'transparent',
            color: activeSide === 'yes' ? 'oklch(15% 0.04 150)' : 'var(--text-muted)',
            borderRadius: 'var(--r-sm)', fontWeight: 700, fontFamily: 'var(--font-body)',
            transition: 'all var(--ease-micro)',
          }}>
          YES
        </button>
        <button
          onClick={() => setActiveSide('no')}
          style={{
            flex: 1, height: 36, border: 'none', cursor: 'pointer',
            background: activeSide === 'no' ? 'var(--no-500)' : 'transparent',
            color: activeSide === 'no' ? 'white' : 'var(--text-muted)',
            borderRadius: 'var(--r-sm)', fontWeight: 700, fontFamily: 'var(--font-body)',
            transition: 'all var(--ease-micro)',
          }}>
          NO
        </button>
      </div>
      <span className="specimen-label">Stake amount</span>
      <Input prefix="TZS" mono value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {chips.map(c => (
          <button key={c}
            onClick={() => setAmount((parseInt(c) * 1000).toLocaleString())}
            style={{
              height: 28, padding: '0 12px', borderRadius: 'var(--r-pill)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12,
              cursor: 'pointer',
            }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Share of pool</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>~0.42%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>If correct, you receive</span>
        <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--gold-300)' }}>
          TZS {fmt(payout)}
        </span>
      </div>
      <Btn variant="gold" size="xl" style={{ width: '100%' }}>
        Confirm · TZS {fmt(payout)}
      </Btn>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 10, textAlign: 'center' }}>
        Pool-share payout. Outcome may differ from current odds.
      </div>
    </div>
  );
};

const PositionCard = ({ side, market, stake, current, payout, status }) => (
  <div style={{
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)', padding: 16, width: 340,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <Chip variant={side === 'YES' ? 'yes' : 'no'}>{side}</Chip>
      <Chip variant={status === 'win' ? 'resolved' : status === 'loss' ? 'no' : 'pending'}>
        {status === 'win' ? 'Resolved · Win' : status === 'loss' ? 'Resolved · Loss' : status === 'void' ? 'Voided' : 'Pending'}
      </Chip>
    </div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 14 }}>
      {market}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
      {[
        ['Stake', `TZS ${stake}`],
        [status === 'pending' ? 'Current' : 'Final', `TZS ${current}`],
        ['Max payout', `TZS ${payout}`],
      ].map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
        </div>
      ))}
    </div>
    <button disabled style={{
      width: '100%', height: 32, border: '1px dashed var(--border-strong)',
      background: 'transparent', color: 'var(--text-subtle)', fontSize: 12,
      borderRadius: 'var(--r-sm)', cursor: 'not-allowed',
    }}>
      Sell half · Coming soon
    </button>
  </div>
);

const ResolutionPanel = ({ resolved }) => (
  <div style={{
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)', padding: 20, width: 480,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
        Resolution
      </span>
      <Chip variant={resolved ? 'resolved' : 'objection'}>
        {resolved ? 'Resolved · YES' : 'Objection window'}
      </Chip>
    </div>

    {!resolved && (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Objection window</span>
          <span className="mono">17h 24m left</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '28%', height: '100%', background: 'var(--warning-500)' }} />
        </div>
      </div>
    )}

    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)', marginBottom: 12 }}>
      <Avatar initials="AM" size="md" hue={150} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Resolved by Asha M.</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Compliance Officer · 2-officer rule satisfied</div>
      </div>
      <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--teal-300)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        Source <Icon name="external" size={12} />
      </button>
    </div>

    <table style={{ width: '100%', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
      <tbody>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={{ padding: '8px 0', color: 'var(--text-subtle)' }}>YES pool</td>
          <td style={{ padding: '8px 0', textAlign: 'right' }}>TZS 4,820,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={{ padding: '8px 0', color: 'var(--text-subtle)' }}>NO pool</td>
          <td style={{ padding: '8px 0', textAlign: 'right' }}>TZS 2,940,000</td>
        </tr>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <td style={{ padding: '8px 0', color: 'var(--text-subtle)' }}>Operator margin (9%)</td>
          <td style={{ padding: '8px 0', textAlign: 'right' }}>TZS 264,600</td>
        </tr>
        <tr>
          <td style={{ padding: '8px 0', fontWeight: 700 }}>Distributed to YES</td>
          <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--gold-300)', fontWeight: 700 }}>TZS 7,495,400</td>
        </tr>
      </tbody>
    </table>

    {!resolved && (
      <button style={{
        width: '100%', marginTop: 16, height: 38, border: '1px solid var(--warning-500)',
        background: 'transparent', color: 'oklch(82% 0.16 80)',
        borderRadius: 'var(--r-md)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Icon name="flag" size={14} /> Flag this resolution for review
      </button>
    )}
  </div>
);

const LeaderboardRow = ({ rank, handle, tier, roi, resolved, streak, light }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '40px 1fr 80px 80px 90px 90px',
    alignItems: 'center', gap: 16,
    padding: '14px 18px',
    background: light ? 'var(--bg-elevated)' : 'transparent',
    borderTop: light ? 'none' : '1px solid var(--border)',
    width: 720,
  }}>
    <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: rank <= 3 ? 'var(--gold-400)' : 'var(--text-muted)' }}>
      {rank.toString().padStart(2, '0')}
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar initials={handle.slice(0, 2).toUpperCase()} size="md" hue={(rank * 40) % 360} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          @{handle} <TierBadge tier={tier} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{resolved} markets resolved</div>
      </div>
    </div>
    <span className="mono" style={{ color: roi >= 0 ? 'var(--gold-400)' : 'var(--no-400)', fontWeight: 600 }}>
      {roi >= 0 ? '+' : ''}{roi}%
    </span>
    <Chip variant="neutral">🔥 {streak}</Chip>
    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resolved}</span>
    <button disabled style={{
      height: 30, border: '1px solid var(--border)', background: 'transparent',
      color: 'var(--text-subtle)', fontSize: 12, borderRadius: 'var(--r-pill)',
      cursor: 'not-allowed', opacity: 0.6,
    }}>
      Follow · soon
    </button>
  </div>
);

const EmptyState = ({ illustration, title, body, action }) => (
  <div style={{
    border: '1px dashed var(--border-strong)',
    borderRadius: 'var(--r-lg)', padding: 32, textAlign: 'center',
    width: 360, background: 'var(--bg-elevated)',
  }}>
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
      {illustration}
    </div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
      {title}
    </div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
      {body}
    </div>
    {action && <Btn variant="ghost" size="md">{action}</Btn>}
  </div>
);

/* Line-art empties — brand-teal stroke, gold accent */
const EmptyMarketsArt = () => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="var(--teal-400)" strokeWidth="1.5">
    <rect x="10" y="14" width="100" height="18" rx="3" />
    <rect x="10" y="38" width="100" height="18" rx="3" />
    <rect x="10" y="62" width="60"  height="14" rx="3" />
    <circle cx="100" cy="22" r="3" fill="var(--gold-400)" stroke="none" />
  </svg>
);
const EmptyPositionsArt = () => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="var(--teal-400)" strokeWidth="1.5">
    <path d="M10 60 L40 38 L60 50 L88 22 L110 30" />
    <circle cx="88" cy="22" r="4" fill="var(--gold-400)" stroke="none" />
    <path d="M10 70h100" strokeDasharray="3 4" opacity="0.5" />
  </svg>
);

Object.assign(window, { MarketCard, BuyTray, PositionCard, ResolutionPanel, LeaderboardRow, EmptyState, EmptyMarketsArt, EmptyPositionsArt, fmt });
