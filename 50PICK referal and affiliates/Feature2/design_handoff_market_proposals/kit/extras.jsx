/* Final-kit additions: AppShell sketch, Betslip bottom sheet, KYC wizard step,
   Reality-check modal, Win celebration, Admin rows, and landing-page
   wireframe drawings. Concept system. */

const Phone = ({ children, w = 393, h = 760 }) => (
  <div style={{
    width: w, height: h,
    background: 'var(--bg)', border: '1px solid var(--border-strong)',
    borderRadius: 36, padding: 6, position: 'relative',
    boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6)',
  }}>
    <div style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
      width: 96, height: 26, borderRadius: 999, background: 'var(--slate-950)',
    }} />
    <div style={{
      width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden',
      background: 'var(--bg)', position: 'relative', paddingTop: 44,
    }}>
      {children}
    </div>
  </div>
);

/* ---------- AppShell sketch (mobile) ---------- */
const AppShellSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>AppShell · mobile</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
      Top bar with wordmark, search, theme toggle, bell, avatar. Live ticker below. Bottom nav: Markets / Live / Positions / Leaderboard / Profile.
    </div>
    <div style={{ display: 'flex', gap: 36, justifyContent: 'center' }}>
      <Phone>
        {/* Top bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiftyLockup size={14} color="var(--text)" />
          <div style={{
            flex: 1, height: 32, borderRadius: 999, background: 'var(--bg-overlay)',
            display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
            color: 'var(--text-subtle)', fontSize: 12,
          }}>
            <Icon name="search" size={14} /> Search markets…
          </div>
          <Icon name="bell" size={18} />
          <Avatar initials="JK" size="sm" hue={215} />
        </div>
        {/* Live ticker */}
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <LiveDot />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span className="mono">25,000</span> just predicted <span style={{ color: 'var(--yes-300)' }}>YES</span> on the rains question
          </span>
        </div>
        {/* Section header */}
        <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>Live markets</div>
          <Chip variant="neutral">All</Chip>
        </div>
        {/* Cards */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ transform: 'scale(0.94)', transformOrigin: 'top left', width: '108%' }}>
            <MarketCard title="Will the rains begin before April 15?" titleSw="Mvua zitaanza kabla ya tarehe 15 Aprili?" category="Weather" yesPct={62} volume="1.2M" predictors={312} timeLeft="2d 14h" status="live" />
          </div>
          <div style={{ transform: 'scale(0.94)', transformOrigin: 'top left', width: '108%' }}>
            <MarketCard title="Will the league title go to the favourite?" titleSw="Ubingwa wa ligi utaenda kwa kipenzi?" category="Sports" yesPct={48} volume="3.4M" predictors={812} timeLeft="11d" status="live" />
          </div>
        </div>
        {/* Bottom nav */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 64, background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'center',
        }}>
          {[
            ['predict', 'Markets', true],
            ['flag', 'Live', false],
            ['history', 'Positions', false],
            ['shield', 'Board', false],
            ['lock', 'Profile', false],
          ].map(([icon, label, active]) => (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? 'var(--indigo-300)' : 'var(--text-subtle)',
            }}>
              <Icon name={icon} size={18} />
              <span style={{ fontSize: 10 }}>{label}</span>
            </div>
          ))}
        </div>
      </Phone>
    </div>
  </div>
);

/* ---------- Betslip bottom sheet ---------- */
const BetslipSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Betslip bottom sheet · mobile</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
      Replaces BuyTray on &lt;768px. Swipe-down to dismiss; swipe-up-and-hold to confirm.
    </div>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Phone w={393} h={620}>
        {/* Dimmed market detail behind */}
        <div style={{ padding: 16, opacity: 0.35, filter: 'blur(2px)' }}>
          <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Will the rains begin before April 15?</div>
          <div style={{ height: 14 }} />
          <ProbabilityBar yesPct={62} size="large" showLabels />
        </div>
        {/* Sheet */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0', padding: '12px 18px 22px',
          boxShadow: '0 -20px 40px -10px rgba(0,0,0,0.4)',
        }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: 'var(--border-strong)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
            <button style={{ flex: 1, height: 32, border: 'none', cursor: 'pointer', background: 'var(--yes-500)', color: 'oklch(15% 0.04 150)', borderRadius: 'var(--r-sm)', fontWeight: 700, fontSize: 13 }}>YES</button>
            <button style={{ flex: 1, height: 32, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', borderRadius: 'var(--r-sm)', fontWeight: 700, fontSize: 13 }}>NO</button>
          </div>
          <Input prefix="TZS" mono value="25,000" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
            {['1k','5k','10k','25k','50k','100k'].map(c => (
              <span key={c} style={{ height: 26, padding: '0 10px', borderRadius: 999, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>{c}</span>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>If correct</span>
            <span className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--gold-300)' }}>TZS 40,322</span>
          </div>
          <Btn variant="gold" size="lg" style={{ width: '100%' }}>Hold to confirm</Btn>
        </div>
      </Phone>
    </div>
  </div>
);

/* ---------- KYC wizard step ---------- */
const KycSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>KYC wizard · phone-OTP step</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Multi-step sheet: phone OTP → ID → documents → review.
    </div>
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 28, width: 420,
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i === 0 ? 'var(--indigo-400)' : 'var(--bg-overlay)' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Step 1 of 4</div>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Verify your phone</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        We sent a 6-digit code to <span className="mono">+255 712 345 678</span>.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['7','3','9','2','•','•'].map((d, i) => (
          <div key={i} style={{
            width: 48, height: 56, borderRadius: 'var(--r-md)',
            border: `1px solid ${i < 4 ? 'var(--indigo-400)' : 'var(--border)'}`,
            background: 'var(--bg-overlay)', display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600,
            color: i < 4 ? 'var(--text)' : 'var(--text-subtle)',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 20 }}>
        Resend code in <span className="mono" style={{ color: 'var(--text-muted)' }}>0:42</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" size="md">Back</Btn>
        <Btn variant="primary" size="md" style={{ flex: 1 }}>Continue</Btn>
      </div>
    </div>
  </div>
);

/* ---------- Reality-check modal ---------- */
const RealitySpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>RealityCheck modal</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Surfaces session-time + net P/L. Calm tone — never punitive.
    </div>
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 28, width: 420,
      boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6)',
    }}>
      <Chip variant="pending">Reality check · Tafakari</Chip>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, marginTop: 14, marginBottom: 8 }}>
        You've been on for 30 minutes
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
        A short pause is a good idea. Here's where you stand this session.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
        <div style={{ padding: 14, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Staked</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>TZS 60,000</div>
        </div>
        <div style={{ padding: 14, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Net</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--no-400)' }}>−TZS 8,400</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" size="md">Take a break</Btn>
        <Btn variant="primary" size="md" style={{ flex: 1 }}>Continue session</Btn>
      </div>
    </div>
  </div>
);

/* ---------- Win celebration ---------- */
const WinSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Win celebration</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Gold shimmer overlay — no confetti, no slot-reel cliches.
    </div>
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--gold-700)',
      borderRadius: 'var(--r-lg)', padding: 32, width: 420, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 0 40px -8px color-mix(in oklab, var(--gold-500) 30%, transparent)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold-700) 18%, transparent))', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-700))', display: 'grid', placeItems: 'center', color: 'oklch(20% 0.05 80)' }}>
          <Icon name="check" size={28} stroke={2.5} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Resolved · YES</div>
        <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>You were right</div>
        <div className="mono" style={{ fontSize: 32, fontWeight: 600, color: 'var(--gold-300)', marginBottom: 8 }}>+ TZS 18,400</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>Imelipwa · Paid to your wallet</div>
        <Btn variant="primary" size="lg" style={{ width: '100%' }}>Continue</Btn>
      </div>
    </div>
  </div>
);

/* ---------- Admin: markets queue row ---------- */
const AdminMarketsSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Admin · markets curation queue</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Sortable, bulk-selectable. Source URL is a first-class column — required before publish.
    </div>
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 1fr 1fr 80px',
        gap: 12, padding: '10px 18px', alignItems: 'center',
        fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)',
      }}>
        <input type="checkbox" />
        <span>Title</span><span>Category</span><span>Source</span><span>Proposed</span><span>Status</span><span>Volume</span><span></span>
      </div>
      {[
        ['Will the rains begin before April 15?', 'Weather', 'meteo.tz', 'Asha M.', 'LIVE', 'TZS 1.2M'],
        ['Will the league title go to the favourite?', 'Sports', 'leagues.tz', 'Koyo K.', 'LIVE', 'TZS 3.4M'],
        ['Will the base rate change at the next meeting?', 'Macro', 'bot.go.tz', 'Mwangi N.', 'DRAFT', '—'],
        ['Will Bongo Star Search end on schedule?', 'Culture', 'bbc.co.tz', 'Fatuma S.', 'RESOLVED', 'TZS 820K'],
      ].map(([title, cat, src, who, status, vol], i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 1fr 1fr 80px',
          gap: 12, padding: '14px 18px', alignItems: 'center',
          borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize: 13,
        }}>
          <input type="checkbox" />
          <span style={{ fontWeight: 500 }}>{title}</span>
          <Chip variant="neutral">{cat}</Chip>
          <span className="mono" style={{ color: 'var(--indigo-300)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{src}<Icon name="external" size={12} /></span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{who}</span>
          <Chip variant={status === 'LIVE' ? 'live' : status === 'RESOLVED' ? 'resolved' : 'pending'} dot={status === 'LIVE'}>{status}</Chip>
          <span className="mono" style={{ fontSize: 12 }}>{vol}</span>
          <Btn variant="ghost" size="sm">Edit</Btn>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
      <Btn variant="primary" size="md" leadingIcon={<Icon name="plus" size={14} />}>New market</Btn>
      <Btn variant="ghost" size="md">Publish selected</Btn>
      <Btn variant="ghost" size="md">Retire</Btn>
    </div>
  </div>
);

/* ---------- Admin: resolver queue row ---------- */
const AdminResolverSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Admin · resolver queue</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Markets within 24h of resolutionAt. Two-officer status visible per row.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { title: 'Will the rains begin before April 15?', left: '47m', suggested: 'YES', conf: 92, stage: 'Awaiting Officer 2' },
        { title: 'Will the base rate change at the next meeting?', left: '3h 12m', suggested: 'NO', conf: 78, stage: 'Awaiting Officer 1' },
        { title: 'Will Bongo Star Search end on schedule?', left: '18h 24m', suggested: 'YES', conf: 64, stage: 'Objection window · 6h left' },
      ].map((r, i) => (
        <div key={i} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: 16,
          display: 'grid', gridTemplateColumns: '2fr 100px 1fr 1.4fr 130px', gap: 16, alignItems: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{r.title}</div>
          <span className="mono" style={{ fontSize: 13, color: r.left.includes('m') && !r.left.includes('h') ? 'var(--no-400)' : 'var(--text-muted)' }}>{r.left}</span>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Suggested</div>
            <span style={{ fontWeight: 700, color: r.suggested === 'YES' ? 'var(--yes-300)' : 'var(--no-300)' }}>
              {r.suggested} <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>· {r.conf}% conf</span>
            </span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Two-officer status</div>
            <Chip variant="objection">{r.stage}</Chip>
          </div>
          <Btn variant="primary" size="sm">Confirm outcome</Btn>
        </div>
      ))}
    </div>
  </div>
);

/* ---------- Landing page wireframe drawing ---------- */
const LandingWireframeSpecimen = () => {
  const wireText = (text, opts = {}) => (
    <text fill="var(--text-muted)" fontFamily="JetBrains Mono, monospace" fontSize={opts.size || 11} fontWeight={opts.weight || 400} {...opts.attrs}>
      {text}
    </text>
  );
  // Rough sketch in SVG with annotations
  return (
    <div className="specimen" style={{ width: 1280 }}>
      <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Landing page · wireframe drawing</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Hand-style wireframe sketch. Block-level structure for the consumer-facing landing surface, brief copy notes inline. Concept layout — not rendered with live components.
      </div>
      <svg viewBox="0 0 1200 1700" style={{ width: '100%', height: 'auto', background: 'var(--bg-elevated)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="1200" height="1700" fill="url(#grid)" />

        {/* Top nav */}
        <g stroke="var(--indigo-400)" strokeWidth="1.5" fill="none">
          <rect x="40" y="40" width="1120" height="56" rx="8" />
          <rect x="60" y="56" width="100" height="24" rx="4" />
          <text x="70" y="73" fill="var(--indigo-300)" fontFamily="Sora" fontSize="14" fontWeight="700">[wordmark]</text>
          <line x1="220" y1="68" x2="700" y2="68" strokeDasharray="4 4" opacity="0.4" />
          <circle cx="980" cy="68" r="6" />
          <circle cx="1010" cy="68" r="6" />
          <circle cx="1040" cy="68" r="6" />
          <rect x="1080" y="56" width="60" height="24" rx="999" />
          <text x="1093" y="72" fill="var(--text-subtle)" fontFamily="JetBrains Mono" fontSize="10">EN/SW/FR</text>
        </g>

        {/* Hero */}
        <g>
          <rect x="40" y="120" width="1120" height="420" rx="14" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x="80" y="170" fill="var(--text)" fontFamily="Sora" fontSize="14" fontWeight="700">HERO</text>

          {/* Title block */}
          <text x="80" y="240" fill="var(--text)" fontFamily="Sora" fontSize="48" fontWeight="700" letterSpacing="-1">Predict events.</text>
          <text x="80" y="290" fill="var(--indigo-400)" fontFamily="Sora" fontSize="48" fontWeight="700" letterSpacing="-1">Not chance.</text>
          <text x="80" y="328" fill="var(--text-muted)" fontFamily="Inter" fontSize="16">[secondary line · EN + SW italic underneath]</text>

          {/* Featured market preview block */}
          <rect x="80" y="356" width="500" height="140" rx="10" fill="var(--bg-overlay)" stroke="var(--border)" />
          <text x="100" y="386" fill="var(--text)" fontFamily="Inter" fontSize="13" fontWeight="600">Featured live market — title</text>
          <text x="100" y="406" fill="var(--text-subtle)" fontFamily="Inter" fontSize="11" fontStyle="italic">Mfano wa kichwa cha soko</text>
          <rect x="100" y="424" width="460" height="14" rx="999" fill="none" stroke="var(--yes-500)" />
          <rect x="100" y="424" width="290" height="14" rx="999" fill="var(--yes-700)" opacity="0.5" />
          <text x="100" y="464" fill="var(--yes-300)" fontFamily="JetBrains Mono" fontSize="11">YES 62%</text>
          <text x="540" y="464" fill="var(--no-300)" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end">NO 38%</text>
          <rect x="100" y="478" width="100" height="10" rx="2" fill="var(--bg)" />

          {/* CTA */}
          <rect x="620" y="380" width="220" height="56" rx="10" fill="var(--indigo-500)" />
          <text x="730" y="416" fill="white" fontFamily="Sora" fontSize="15" fontWeight="700" textAnchor="middle">Try the demo</text>
          <text x="620" y="460" fill="var(--text-subtle)" fontFamily="JetBrains Mono" fontSize="11">[no-promise framing · "predict events, not chance"]</text>
        </g>

        {/* Section: featured live markets */}
        <g>
          <rect x="40" y="580" width="1120" height="280" rx="14" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x="80" y="610" fill="var(--text)" fontFamily="Sora" fontSize="14" fontWeight="700">FEATURED LIVE MARKETS</text>
          <text x="80" y="628" fill="var(--text-subtle)" fontFamily="JetBrains Mono" fontSize="11">3-card carousel · mobile swipeable · desktop static</text>
          {[0, 1, 2].map(i => (
            <g key={i} transform={`translate(${80 + i * 360}, 660)`}>
              <rect width="320" height="180" rx="10" fill="var(--bg-overlay)" stroke="var(--border)" />
              <rect x="20" y="20" width="56" height="20" rx="999" fill="none" stroke="var(--no-500)" />
              <text x="48" y="34" fill="var(--no-300)" fontFamily="Inter" fontSize="10" fontWeight="700" textAnchor="middle">LIVE</text>
              <rect x="20" y="60" width="220" height="12" rx="2" fill="var(--text-subtle)" opacity="0.5" />
              <rect x="20" y="80" width="160" height="10" rx="2" fill="var(--text-subtle)" opacity="0.3" />
              <rect x="20" y="110" width="280" height="10" rx="999" fill="var(--bg)" stroke="var(--border)" />
              <rect x="20" y="110" width={120 + i * 40} height="10" rx="999" fill="var(--yes-600)" />
              <rect x="20" y="140" width="130" height="28" rx="6" fill="var(--yes-700)" />
              <rect x="170" y="140" width="130" height="28" rx="6" fill="var(--no-700)" />
            </g>
          ))}
        </g>

        {/* How it works */}
        <g>
          <rect x="40" y="900" width="1120" height="200" rx="14" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x="80" y="930" fill="var(--text)" fontFamily="Sora" fontSize="14" fontWeight="700">HOW IT WORKS · 3 STEPS</text>
          {[
            ['1', 'Pick a side', 'Chagua upande'],
            ['2', 'Stake TZS', 'Weka dau'],
            ['3', 'Get paid if right', 'Lipwa ukikadiria sahihi'],
          ].map(([n, en, sw], i) => (
            <g key={n} transform={`translate(${80 + i * 360}, 960)`}>
              <circle cx="32" cy="32" r="24" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" />
              <text x="32" y="40" fill="var(--indigo-300)" fontFamily="Sora" fontSize="22" fontWeight="700" textAnchor="middle">{n}</text>
              <text x="80" y="28" fill="var(--text)" fontFamily="Sora" fontSize="18" fontWeight="600">{en}</text>
              <text x="80" y="50" fill="var(--text-subtle)" fontFamily="Inter" fontSize="13" fontStyle="italic">{sw}</text>
              <text x="80" y="76" fill="var(--text-subtle)" fontFamily="Inter" fontSize="11">[one-line sublabel]</text>
            </g>
          ))}
        </g>

        {/* Why us */}
        <g>
          <rect x="40" y="1140" width="1120" height="200" rx="14" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x="80" y="1170" fill="var(--text)" fontFamily="Sora" fontSize="14" fontWeight="700">WHY US · 3 CARDS</text>
          {['[regulator badge]', '[fairness link]', '[mobile-money native]'].map((t, i) => (
            <g key={t} transform={`translate(${80 + i * 360}, 1200)`}>
              <rect width="320" height="120" rx="10" fill="var(--bg-overlay)" stroke="var(--border)" />
              <rect x="20" y="20" width="40" height="40" rx="6" fill="none" stroke="var(--gold-500)" strokeWidth="1.5" />
              <text x="20" y="90" fill="var(--text)" fontFamily="Sora" fontSize="13" fontWeight="600">{t}</text>
              <text x="20" y="108" fill="var(--text-subtle)" fontFamily="Inter" fontSize="11">[short copy]</text>
            </g>
          ))}
        </g>

        {/* Leaderboard preview */}
        <g>
          <rect x="40" y="1380" width="540" height="220" rx="14" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x="80" y="1410" fill="var(--text)" fontFamily="Sora" fontSize="14" fontWeight="700">LEADERBOARD · TOP 5 THIS WEEK</text>
          {[0,1,2,3,4].map(i => (
            <g key={i} transform={`translate(80, ${1430 + i * 30})`}>
              <text fontFamily="JetBrains Mono" fontSize="13" fill="var(--gold-400)" fontWeight="600">0{i+1}</text>
              <circle cx="44" cy="-5" r="10" fill="var(--bg-overlay)" stroke="var(--border)" />
              <rect x="62" y="-13" width="120" height="12" rx="2" fill="var(--text-subtle)" opacity="0.4" />
              <text x="380" fontFamily="JetBrains Mono" fontSize="12" fill="var(--gold-300)">+{(180 - i * 28)}%</text>
            </g>
          ))}
        </g>

        {/* Recent resolutions */}
        <g>
          <rect x="620" y="1380" width="540" height="220" rx="14" fill="none" stroke="var(--indigo-400)" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x="660" y="1410" fill="var(--text)" fontFamily="Sora" fontSize="14" fontWeight="700">RECENT RESOLUTIONS · 3 CARDS</text>
          {[0,1,2].map(i => (
            <g key={i} transform={`translate(${660 + i * 160}, 1430)`}>
              <rect width="140" height="140" rx="10" fill="var(--bg-overlay)" stroke="var(--border)" />
              <rect x="14" y="14" width="60" height="20" rx="999" fill="none" stroke="var(--gold-500)" />
              <text x="44" y="28" fill="var(--gold-300)" fontFamily="Inter" fontSize="9" fontWeight="700" textAnchor="middle">RESOLVED</text>
              <rect x="14" y="50" width="110" height="10" rx="2" fill="var(--text-subtle)" opacity="0.4" />
              <rect x="14" y="66" width="80" height="10" rx="2" fill="var(--text-subtle)" opacity="0.3" />
              <text x="14" y="118" fill="var(--gold-300)" fontFamily="JetBrains Mono" fontSize="13" fontWeight="600">+TZS …</text>
            </g>
          ))}
        </g>

        {/* Footer */}
        <g>
          <rect x="40" y="1640" width="1120" height="40" rx="8" fill="var(--bg-overlay)" stroke="var(--border)" />
          <text x="60" y="1665" fill="var(--text-subtle)" fontFamily="JetBrains Mono" fontSize="11">[footer slot · regulator info goes here once licensing confirmed]</text>
          <text x="1140" y="1665" fill="var(--text-subtle)" fontFamily="JetBrains Mono" fontSize="11" textAnchor="end">RG · Privacy · Terms · Help</text>
        </g>
      </svg>

      <div style={{
        marginTop: 24, padding: 18, borderRadius: 'var(--r-md)',
        background: 'color-mix(in oklab, var(--info-500) 12%, transparent)',
        border: '1px solid color-mix(in oklab, var(--info-500) 30%, transparent)',
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'oklch(78% 0.13 240)' }}>Note for the engineer.</strong> The footer slot intentionally leaves licensing/helpline details unfilled. They depend on the operating-entity's regulator status and should be wired from a runtime config the operator owns — not baked into the kit.
      </div>
    </div>
  );
};

/* ---------- Spacing & radius reference ---------- */
const SpacingSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Spacing & radius</div>
    <span className="specimen-label">Spacing scale (px)</span>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap' }}>
      {[['1',4],['2',8],['3',12],['4',16],['5',20],['6',24],['8',32],['10',40],['12',48],['16',64]].map(([t,n]) => (
        <div key={t} style={{ textAlign: 'center' }}>
          <div style={{ width: n, height: n, background: 'var(--indigo-500)', borderRadius: 4, margin: '0 auto 6px' }} />
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>sp-{t} · {n}</div>
        </div>
      ))}
    </div>
    <span className="specimen-label">Radius scale</span>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {[['xs',4],['sm',6],['md',10],['lg',14],['xl',20],['pill',999]].map(([t,n]) => (
        <div key={t} style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: n }} />
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>r-{t} · {n === 999 ? '∞' : n}</div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, {
  Phone,
  AppShellSpecimen, BetslipSpecimen, KycSpecimen, RealitySpecimen, WinSpecimen,
  AdminMarketsSpecimen, AdminResolverSpecimen, LandingWireframeSpecimen, SpacingSpecimen,
});
