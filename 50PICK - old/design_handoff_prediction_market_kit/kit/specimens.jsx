/* Specimens canvas — every component in default + key states.
   Concept design system. Not affiliated with any licensed operator. */

const { useState } = React;

/* =================================================================
   Cover artboard — kit overview
   ================================================================= */
const Cover = () => (
  <div className="specimen" style={{ width: 880, padding: 56 }}>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>
      Concept design kit · v0.1 · prediction-market UI
    </div>
    <div className="display" style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.0, marginBottom: 18, letterSpacing: '-0.03em' }}>
      Binary markets,<br />
      <span style={{ color: 'var(--teal-400)' }}>composed.</span>
    </div>
    <div style={{ fontSize: 17, color: 'var(--text-muted)', maxWidth: 560, lineHeight: 1.55, marginBottom: 32 }}>
      A component kit for pari-mutuel binary prediction markets — tokens, atoms, market objects, leaderboard, and resolution flow. Specimens only; no assembled product, no payment surfaces, no operator chrome.
    </div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 40 }}>
      <Chip variant="neutral">Concept</Chip>
      <Chip variant="neutral">Not a live product</Chip>
      <Chip variant="neutral">Design specimens only</Chip>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
      <div>
        <div className="specimen-label">Invariants</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
          <li>YES is emerald, always on the LEFT</li>
          <li>NO is rose, always on the RIGHT</li>
          <li>Probability bars: YES left, NO right</li>
          <li>Mono digits for all amounts and percentages</li>
        </ul>
      </div>
      <div>
        <div className="specimen-label">Type stack</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
          <li>Display — Sora (geometric, distinguishable 1/l/i)</li>
          <li>Body — Inter (Latin + diacritics)</li>
          <li>Mono — JetBrains Mono (tabular figures)</li>
        </ul>
      </div>
    </div>
  </div>
);

/* =================================================================
   Color
   ================================================================= */
const ColorRamp = ({ name, varName, steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] }) => (
  <div style={{ marginBottom: 18 }}>
    <div className="swatch-row-label">{name}</div>
    <div className="swatch-row">
      {steps.map(s => (
        <div key={s} className="swatch" style={{ background: `var(--${varName}-${s})` }}>
          {s}
        </div>
      ))}
    </div>
  </div>
);

const ColorSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Color</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      OKLCH-defined ramps. Brand teal for chrome; emerald and rose are reserved for YES/NO; gold for resolved-winner moments.
    </div>
    <ColorRamp name="brand · teal" varName="teal" />
    <ColorRamp name="yes · emerald" varName="yes" />
    <ColorRamp name="no · rose" varName="no" />
    <ColorRamp name="win · gold" varName="gold" />
    <ColorRamp name="neutral · slate" varName="slate" steps={[50,100,200,300,400,500,600,700,800,900,950]} />
    <div className="specimen-divider" />
    <div className="swatch-row-label">Semantic</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      <div className="swatch" style={{ background: 'var(--danger-500)' }}>danger-500</div>
      <div className="swatch" style={{ background: 'var(--warning-500)' }}>warning-500</div>
      <div className="swatch" style={{ background: 'var(--info-500)' }}>info-500</div>
      <div className="swatch" style={{ background: 'var(--gold-500)' }}>gold-500</div>
    </div>
  </div>
);

/* =================================================================
   Type
   ================================================================= */
const TypeSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Type</div>
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px 24px', alignItems: 'baseline' }}>
      {[
        ['display-1 · 56', <div className="display" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em' }}>Tabiri. Predict.</div>],
        ['display-2 · 44', <div className="display" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Will the rains begin early?</div>],
        ['h1 · 34',        <div className="display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.015em' }}>Live markets</div>],
        ['h2 · 26',        <div className="display" style={{ fontSize: 26, fontWeight: 600 }}>Resolution panel</div>],
        ['h3 · 20',        <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Top predictors this week</div>],
        ['h4 · 17',        <div style={{ fontSize: 17, fontWeight: 600 }}>Buy YES at sixty-two percent</div>],
        ['body · 15',      <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>The operator keeps a nine-percent margin from the losing pool. Winners share the remainder pro-rata to stake.</div>],
        ['small · 13',     <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Pool-share payout. Outcome may differ from current odds.</div>],
        ['micro · 11',     <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resolution criterion</div>],
        ['mono · 14',      <div className="mono" style={{ fontSize: 14 }}>TZS 1,234,567 · 62.4% · 17h 24m</div>],
      ].map(([k, v], i) => (
        <React.Fragment key={i}>
          <span className="specimen-label" style={{ marginBottom: 0 }}>{k}</span>
          <div>{v}</div>
        </React.Fragment>
      ))}
    </div>
  </div>
);

/* =================================================================
   Buttons
   ================================================================= */
const ButtonSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Button</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Primary uses brand-teal. YES and NO use emerald / rose with safety-critical left/right pairing. Gold reserved for the confirm-payout moment.
    </div>
    {[
      ['Variants',
        <>
          <Btn variant="primary">Primary</Btn>
          <Btn variant="yes">YES @ 62%</Btn>
          <Btn variant="no">NO @ 38%</Btn>
          <Btn variant="ghost">Ghost</Btn>
          <Btn variant="danger">Danger</Btn>
          <Btn variant="gold">Confirm · TZS 40,322</Btn>
        </>
      ],
      ['Sizes',
        <>
          <Btn size="sm">Small</Btn>
          <Btn size="md">Medium</Btn>
          <Btn size="lg">Large</Btn>
          <Btn size="xl">Extra-large</Btn>
        </>
      ],
      ['States',
        <>
          <Btn>Rest</Btn>
          <Btn loading>Loading</Btn>
          <Btn disabled>Disabled</Btn>
          <Btn leadingIcon={<Icon name="predict" size={14} />}>Predict</Btn>
          <Btn trailingIcon={<Icon name="arrow" size={14} />}>Continue</Btn>
        </>
      ],
    ].map(([label, kids], i) => (
      <div key={i} style={{ marginBottom: 20 }}>
        <span className="specimen-label">{label}</span>
        <div className="specimen-row" style={{ marginBottom: 0 }}>{kids}</div>
      </div>
    ))}
  </div>
);

/* =================================================================
   Chips, badges, dots
   ================================================================= */
const ChipSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Chips, badges, indicators</div>
    <span className="specimen-label">Status chips</span>
    <div className="specimen-row">
      <Chip variant="neutral">Neutral</Chip>
      <Chip variant="yes">YES position</Chip>
      <Chip variant="no">NO position</Chip>
      <Chip variant="live" dot>Live</Chip>
      <Chip variant="resolved">Resolved · YES</Chip>
      <Chip variant="pending">Pending</Chip>
      <Chip variant="objection">Objection window</Chip>
    </div>
    <span className="specimen-label">Tier badges</span>
    <div className="specimen-row">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TierBadge tier="bronze" /> Bronze</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TierBadge tier="silver" /> Silver</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TierBadge tier="gold" /> Gold</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TierBadge tier="diamond" /> Diamond</span>
    </div>
    <span className="specimen-label">Live dot</span>
    <div className="specimen-row">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LiveDot /> 312 trading now</span>
    </div>
  </div>
);

/* =================================================================
   Probability bar — variants
   ================================================================= */
const PBarSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Probability bar</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Most-rendered atom. YES on the left, NO on the right — globally invariant. Four variants for different densities.
    </div>

    <span className="specimen-label">Split (default) · 12px micro</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      <ProbabilityBar yesPct={50} size="micro" />
      <ProbabilityBar yesPct={62} size="micro" />
      <ProbabilityBar yesPct={8}  size="micro" />
    </div>

    <span className="specimen-label">Split · 24px large with labels</span>
    <div style={{ marginBottom: 8 }}>
      <ProbabilityBar yesPct={62} size="large" showLabels />
    </div>
    <div style={{ marginBottom: 24 }}>
      <ProbabilityBar yesPct={73} size="large" showLabels resolved />
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6 }}>↑ Resolved · gold-shimmer overlay</div>
    </div>

    <span className="specimen-label">Segmented · gap between sides</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      <ProbabilityBar yesPct={62} size="micro" variant="segmented" />
      <ProbabilityBar yesPct={62} size="large" variant="segmented" showLabels />
    </div>

    <span className="specimen-label">Minimal · single-fill leading side (for dense lists)</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      <ProbabilityBar yesPct={62} size="micro" variant="minimal" />
      <ProbabilityBar yesPct={32} size="micro" variant="minimal" />
      <ProbabilityBar yesPct={62} size="large" variant="minimal" showLabels />
    </div>

    <div className="specimen-divider" />

    <div className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Progress bar</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
      <ProgressBar value={68} tone="teal" size="md" label="Daily limit used" showValue />
      <ProgressBar value={42} tone="warning" size="md" label="Objection window" showValue />
      <ProgressBar value={100} tone="gold" size="md" label="Verified" showValue />
      <ProgressBar value={84} tone="no" size="md" label="Loss-limit reached" showValue />
      <ProgressBar value={28} tone="info" size="sm" label="Sync" showValue />
      <ProgressBar value={92} tone="yes" size="lg" label="Confidence" showValue />
    </div>

    <span className="specimen-label">Stepped · KYC / multi-step</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
      <SteppedProgress steps={4} current={0} />
      <SteppedProgress steps={4} current={2} />
      <SteppedProgress steps={6} current={4} />
    </div>

    <span className="specimen-label">Circular · confidence rings</span>
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <CircularProgress value={92} tone="yes" size={64} />
      <CircularProgress value={64} tone="warning" size={64} />
      <CircularProgress value={38} tone="no" size={64} />
      <CircularProgress value={100} tone="gold" size={64} label="✓" />
      <CircularProgress value={48} tone="teal" size={48} stroke={4} />
    </div>
  </div>
);

/* =================================================================
   Inputs
   ================================================================= */
const InputSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Input</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <span className="specimen-label">Text</span>
        <Input placeholder="Search markets…" />
      </div>
      <div>
        <span className="specimen-label">Money (TZS prefix, mono)</span>
        <Input prefix="TZS" mono value="25,000" />
      </div>
      <div>
        <span className="specimen-label">Phone</span>
        <Input prefix="+255" mono value="712 345 678" />
      </div>
      <div>
        <span className="specimen-label">OTP (6-digit)</span>
        <Input mono value="• • •   • • •" />
      </div>
      <div>
        <span className="specimen-label">Error</span>
        <Input value="invalid value" error />
        <div style={{ fontSize: 12, color: 'oklch(72% 0.20 25)', marginTop: 6 }}>Something didn't work. · Hitilafu imetokea.</div>
      </div>
      <div>
        <span className="specimen-label">Disabled</span>
        <Input value="Locked" disabled />
      </div>
    </div>
  </div>
);

/* =================================================================
   Avatar
   ================================================================= */
const AvatarSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Avatar</div>
    <span className="specimen-label">Sizes · initials fallback</span>
    <div className="specimen-row">
      <Avatar initials="AM" size="sm" hue={150} />
      <Avatar initials="JK" size="md" hue={215} />
      <Avatar initials="FS" size="lg" hue={300} />
      <Avatar initials="NH" size="md" hue={25} />
      <Avatar initials="OP" size="md" hue={80} />
    </div>
  </div>
);

/* =================================================================
   Skeleton
   ================================================================= */
const SkeletonSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Skeleton</div>
    <span className="specimen-label">Market-card row</span>
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 18, width: 360,
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Skeleton w={60} h={20} r={999} />
        <Skeleton w={70} h={20} r={999} />
      </div>
      <Skeleton w="92%" h={18} /> <div style={{ height: 6 }} />
      <Skeleton w="62%" h={14} />
      <div style={{ height: 14 }} />
      <Skeleton w="100%" h={12} r={999} />
      <div style={{ height: 10 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Skeleton h={38} />
        <Skeleton h={38} />
      </div>
    </div>
  </div>
);

/* =================================================================
   Toast
   ================================================================= */
const ToastSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Toast</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Toast kind="success" title="Position confirmed" body="YES on the league title · TZS 25,000 staked." />
      <Toast kind="warning" title="Approaching daily limit" body="You're at 80% of your self-set daily stake limit." />
      <Toast kind="danger"  title="Couldn't place stake" body="Network blip. Nothing was charged. Try again." />
      <Toast kind="info"    title="Market resolves in 1h" body="Source URL will be auto-fetched at resolution time." />
    </div>
  </div>
);

/* =================================================================
   Tooltip
   ================================================================= */
const TooltipSpecimen = () => (
  <div className="specimen" style={{ width: 880, paddingTop: 80 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Tooltip</div>
    <div style={{ display: 'flex', gap: 36, marginTop: 32 }}>
      <Tooltip label="62.4% YES · 312 predictors">
        <Btn variant="ghost">Hover the probability</Btn>
      </Tooltip>
      <Tooltip label="9% margin from losing pool">
        <Btn variant="ghost">How payouts work</Btn>
      </Tooltip>
    </div>
  </div>
);

/* =================================================================
   Icons
   ================================================================= */
const IconSpecimen = () => {
  const groups = [
    ['Market types', ['politics','sports','macro','weather','crypto','culture','tech','asterisk']],
    ['Actions',      ['predict','share','flag']],
    ['Wallet',       ['deposit','withdraw','history']],
    ['Auth',         ['lock']],
    ['Compliance',   ['shield','audit','hammer']],
    ['System',       ['backup','chain','sms','search','bell','arrow','external','check','close','plus','sun','moon','globe']],
  ];
  return (
    <div className="specimen" style={{ width: 880 }}>
      <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Icons</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        1.5px stroke, optical-tuned at 16/20/24. Subset shown — full kit lives in the brief.
      </div>
      {groups.map(([label, names]) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <span className="specimen-label">{label}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {names.map(n => (
              <div key={n} style={{
                width: 64, height: 64, border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center',
                background: 'var(--bg-elevated)', color: 'var(--text)',
                position: 'relative',
              }}>
                <Icon name={n} size={22} />
                <span style={{ position: 'absolute', bottom: 4, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-subtle)' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* =================================================================
   Market card · all states
   ================================================================= */
const MarketCardSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Market card</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      List-row card. Title in EN, Swahili italicised below. Tap-anywhere → market detail; YES/NO buttons stop propagation.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
      <MarketCard
        title="Will the rains begin before April 15?"
        titleSw="Mvua zitaanza kabla ya tarehe 15 Aprili?"
        category="Weather" yesPct={62} volume="1.2M" predictors={312} timeLeft="2d 14h" status="live"
      />
      <MarketCard
        title="Will the league title go to the favourite?"
        titleSw="Ubingwa wa ligi utaenda kwa kipenzi cha mashabiki?"
        category="Sports" yesPct={48} volume="3.4M" predictors={812} timeLeft="11d" status="live" hover
      />
      <MarketCard
        title="Will the base rate change at the next meeting?"
        titleSw="Riba ya msingi itabadilika katika mkutano ujao?"
        category="Macro" yesPct={73} volume="820K" predictors={94} timeLeft="Resolved" status="resolved" resolved
      />
    </div>
  </div>
);

/* =================================================================
   Buy tray · position card · resolution panel
   ================================================================= */
const HeartSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Buy tray · position · resolution</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      The three components closest to money. Pool-share framing throughout — never "winnings".
    </div>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div>
        <span className="specimen-label">BuyTray (default · YES)</span>
        <BuyTray side="yes" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span className="specimen-label">PositionCard · pending</span>
          <PositionCard side="YES" market="Will the rains begin before April 15?" stake="25,000" current="40,322" payout="40,322" status="pending" />
        </div>
        <div>
          <span className="specimen-label">PositionCard · resolved win</span>
          <PositionCard side="YES" market="Will the base rate change at the next meeting?" stake="10,000" current="18,400" payout="18,400" status="win" />
        </div>
        <div>
          <span className="specimen-label">PositionCard · resolved loss</span>
          <PositionCard side="NO" market="Will the league title go to the favourite?" stake="5,000" current="0" payout="0" status="loss" />
        </div>
      </div>
      <div>
        <span className="specimen-label">ResolutionPanel · objection window</span>
        <ResolutionPanel resolved={false} />
      </div>
    </div>
  </div>
);

/* =================================================================
   Leaderboard
   ================================================================= */
const LeaderboardSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Leaderboard</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Ranked by ROI over a rolling window. Gold tint when positive; rose when negative. Follow disabled — deferred to v3.
    </div>
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 90px 90px',
        gap: 16, padding: '12px 18px',
        fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)',
      }}>
        <span>#</span><span>Predictor</span><span>ROI</span><span>Streak</span><span>Resolved</span><span></span>
      </div>
      {[
        [1, 'asha_m',   'diamond', 184.2, 12, 47],
        [2, 'koyo',     'gold',     96.8,  7, 31],
        [3, 'mwangi',   'gold',     71.4,  4, 28],
        [4, 'fatuma_s', 'silver',   42.1,  2, 19],
        [5, 'jk_dev',   'silver',  -12.4,  0, 14],
        [6, 'bongo',    'bronze',  -28.7,  0,  9],
      ].map(([rank, handle, tier, roi, streak, resolved]) => (
        <LeaderboardRow key={rank} rank={rank} handle={handle} tier={tier} roi={roi} streak={streak} resolved={resolved} />
      ))}
    </div>
  </div>
);

/* =================================================================
   Empty states
   ================================================================= */
const EmptySpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Empty states</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Line-art only — brand-teal stroke, gold accent. Never blames the user.
    </div>
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <EmptyState
        illustration={<EmptyMarketsArt />}
        title="No markets here yet"
        body="Hakuna soko hapa bado. New markets are curated and posted by the operations team — check back soon."
        action="Browse all markets"
      />
      <EmptyState
        illustration={<EmptyPositionsArt />}
        title="You haven't predicted yet"
        body="Bado hujabashiri. Pick a market, choose a side, and your positions will live here."
        action="Find a market"
      />
    </div>
  </div>
);

/* =================================================================
   Motion tokens
   ================================================================= */
const MotionSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Motion</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Three eases cover the system. Win-shimmer animates the ProbabilityBar at resolution.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px 24px', fontSize: 13 }}>
      <span className="mono" style={{ color: 'var(--teal-300)' }}>--ease-micro</span>
      <span style={{ color: 'var(--text-muted)' }}>100ms · hover, press, focus rings</span>
      <span className="mono" style={{ color: 'var(--teal-300)' }}>--ease-stage</span>
      <span style={{ color: 'var(--text-muted)' }}>240ms · sheets, modals, toasts, bar fills</span>
      <span className="mono" style={{ color: 'var(--teal-300)' }}>--ease-celebrate</span>
      <span style={{ color: 'var(--text-muted)' }}>600ms · resolve, payout reveal, gold-shimmer</span>
      <span className="mono" style={{ color: 'var(--teal-300)' }}>live-pulse</span>
      <span style={{ color: 'var(--text-muted)' }}>1.5s loop · live-volume markets only</span>
      <span className="mono" style={{ color: 'var(--teal-300)' }}>gold-shimmer</span>
      <span style={{ color: 'var(--text-muted)' }}>1.6s loop · resolved-winner ProbabilityBar overlay</span>
    </div>
    <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />
    <span className="specimen-label">Win-shimmer demo</span>
    <ProbabilityBar yesPct={73} size="large" showLabels resolved />
  </div>
);

/* =================================================================
   Light-mode parity
   ================================================================= */
const LightSpecimen = () => (
  <div data-theme="light" className="specimen specimen-light" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, color: 'oklch(20% 0.01 240)' }}>Light mode</div>
    <div style={{ fontSize: 13, color: 'oklch(42% 0.014 240)', marginBottom: 24 }}>
      Equal hierarchy, equal contrast. Same components — surfaces and borders re-mapped via tokens.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
      <Btn variant="primary">Primary</Btn>
      <Btn variant="ghost">Ghost</Btn>
      <Btn variant="yes">YES @ 62%</Btn>
      <Btn variant="no">NO @ 38%</Btn>
    </div>
    <div style={{ marginBottom: 16 }}>
      <ProbabilityBar yesPct={62} size="large" showLabels />
    </div>
    <MarketCard
      title="Will the league title go to the favourite?"
      titleSw="Ubingwa wa ligi utaenda kwa kipenzi cha mashabiki?"
      category="Sports" yesPct={48} volume="3.4M" predictors={812} timeLeft="11d" status="live"
    />
  </div>
);

/* =================================================================
   Canvas root
   ================================================================= */
const App = () => (
  <DesignCanvas title="50pick.tz · design kit · concept">
    <DCSection id="overview" title="Overview">
      <DCArtboard id="cover" label="Kit cover" width={880} height={520}>
        <Cover />
      </DCArtboard>
    </DCSection>

    <DCSection id="brand" title="Brand · 50pick.tz">
      <DCArtboard id="logo" label="Logo system · mark, wordmark, lockup, favicon" width={1200} height={1080}>
        <LogoSpecimen />
      </DCArtboard>
      <DCArtboard id="signature" label="Signature progress shapes · TippingBar + ConfidenceDial" width={1200} height={620}>
        <SignatureProgressSpecimen />
      </DCArtboard>
      <DCArtboard id="banners" label="Banners · web hero, social, app launch, regulator" width={1700} height={1980}>
        <BannerSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="foundations" title="Foundations">
      <DCArtboard id="color"  label="Color · OKLCH ramps" width={880} height={780}>
        <ColorSpecimen />
      </DCArtboard>
      <DCArtboard id="type"   label="Type · scale + roles" width={880} height={760}>
        <TypeSpecimen />
      </DCArtboard>
      <DCArtboard id="motion" label="Motion · easing tokens" width={880} height={460}>
        <MotionSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="atoms" title="Atoms">
      <DCArtboard id="button"   label="Button · all states" width={880} height={500}>
        <ButtonSpecimen />
      </DCArtboard>
      <DCArtboard id="chip"     label="Chip · status + tier" width={880} height={420}>
        <ChipSpecimen />
      </DCArtboard>
      <DCArtboard id="pbar"     label="ProbabilityBar + ProgressBar variants" width={880} height={1200}>
        <PBarSpecimen />
      </DCArtboard>
      <DCArtboard id="input"    label="Input · text, money, OTP" width={880} height={420}>
        <InputSpecimen />
      </DCArtboard>
      <DCArtboard id="avatar"   label="Avatar" width={880} height={260}>
        <AvatarSpecimen />
      </DCArtboard>
      <DCArtboard id="skeleton" label="Skeleton · market-row shape" width={880} height={360}>
        <SkeletonSpecimen />
      </DCArtboard>
      <DCArtboard id="toast"    label="Toast · 4 kinds" width={880} height={260}>
        <ToastSpecimen />
      </DCArtboard>
      <DCArtboard id="tooltip"  label="Tooltip" width={880} height={260}>
        <TooltipSpecimen />
      </DCArtboard>
      <DCArtboard id="icons"    label="Icons · 1.5px stroke" width={880} height={680}>
        <IconSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="market-objects" title="Market objects">
      <DCArtboard id="market-card" label="MarketCard · live, hover, resolved" width={1200} height={420}>
        <MarketCardSpecimen />
      </DCArtboard>
      <DCArtboard id="heart" label="BuyTray · PositionCard · ResolutionPanel" width={1200} height={780}>
        <HeartSpecimen />
      </DCArtboard>
      <DCArtboard id="leaderboard" label="Leaderboard" width={880} height={620}>
        <LeaderboardSpecimen />
      </DCArtboard>
      <DCArtboard id="empty" label="Empty states" width={880} height={400}>
        <EmptySpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="microstructure" title="Market microstructure">
      <DCArtboard id="price-chart" label="Price chart · YES probability over time" width={880} height={500}>
        <PriceChartSpecimen />
      </DCArtboard>
      <DCArtboard id="order-book" label="Order book · depth · payout calculator" width={1200} height={780}>
        <OrderBookSpecimen />
      </DCArtboard>
      <DCArtboard id="resolution-source" label="Resolution source · objection log" width={1100} height={620}>
        <ResolutionSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="screens" title="Full screens">
      <DCArtboard id="market-detail" label="Market detail · everything in context" width={1340} height={1700}>
        <MarketDetailSpecimen />
      </DCArtboard>
      <DCArtboard id="portfolio" label="Portfolio · P&L view" width={1340} height={1100}>
        <PortfolioSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="patterns" title="Patterns & flows">
      <DCArtboard id="appshell"  label="AppShell · mobile sketch" width={1200} height={900}>
        <AppShellSpecimen />
      </DCArtboard>
      <DCArtboard id="betslip"   label="Betslip bottom sheet"     width={880}  height={780}>
        <BetslipSpecimen />
      </DCArtboard>
      <DCArtboard id="kyc"       label="KYC wizard · phone OTP"    width={880}  height={520}>
        <KycSpecimen />
      </DCArtboard>
      <DCArtboard id="reality"   label="RealityCheck modal"        width={880}  height={460}>
        <RealitySpecimen />
      </DCArtboard>
      <DCArtboard id="win"       label="Win celebration"           width={880}  height={520}>
        <WinSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="admin" title="Admin">
      <DCArtboard id="admin-markets"  label="Markets curation queue" width={1200} height={520}>
        <AdminMarketsSpecimen />
      </DCArtboard>
      <DCArtboard id="admin-resolver" label="Resolver queue"         width={1200} height={460}>
        <AdminResolverSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="landing" title="Landing page">
      <DCArtboard id="landing-wire" label="Landing · wireframe drawing" width={1280} height={1900}>
        <LandingWireframeSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="spacing" title="Spacing">
      <DCArtboard id="spacing" label="Spacing & radius" width={880} height={400}>
        <SpacingSpecimen />
      </DCArtboard>
    </DCSection>

    <DCSection id="theme" title="Theme parity">
      <DCArtboard id="light" label="Light mode" width={880} height={620}>
        <LightSpecimen />
      </DCArtboard>
      <DCArtboard id="palettes" label="Color combinations · suggested chromes" width={1200} height={780}>
        <PaletteSpecimen />
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
