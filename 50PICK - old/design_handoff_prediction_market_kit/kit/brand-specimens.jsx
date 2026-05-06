/* Brand specimen page — shows logo system, banners, signature shapes
   on the canvas. Composes into specimens.jsx via <BrandSection />.
*/

const BrandTile = ({ label, bg = 'var(--bg-overlay)', minHeight = 120, children }) => (
  <div style={{
    background: bg,
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: 24,
    minHeight,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
  }}>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>{label}</div>
  </div>
);

const LogoSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>50pick.tz · Logo system</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 760, lineHeight: 1.6 }}>
      The mark encodes the platform's core idea: a circle split YES/NO at the tipping point. The dividing line tilts off-center so the shape reads as "a moment of decision," not a perfect halve. The "50" sits on the divider and is bisected by it — the slash of "50/50" doubled as the boundary. Wordmark in Sora; <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>.tz</span> set in mono and sized down — an editorial detail, not a TLD glued on.
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <BrandTile label="Primary mark · 96px"><FiftyMark size={96} /></BrandTile>
      <BrandTile label="Mark · 48px"><FiftyMark size={48} /></BrandTile>
      <BrandTile label="Favicon · 32px"><FiftyMark size={32} /></BrandTile>
      <BrandTile label="Favicon · 16px"><FiftyMark size={16} /></BrandTile>

      <BrandTile label="Wordmark"><FiftyWordmark size={36} color="var(--text)" /></BrandTile>
      <BrandTile label="Lockup · default" minHeight={120}><FiftyLockup size={32} color="var(--text)" /></BrandTile>
      <BrandTile label="Mono on light" bg="oklch(97% 0.012 80)"><FiftyLockup size={32} color="oklch(20% 0.01 240)" mono /></BrandTile>
      <BrandTile label="Mono on dark"><FiftyLockup size={32} color="oklch(96% 0.005 240)" mono inverted /></BrandTile>
    </div>

    <div style={{ marginTop: 28 }}>
      <div className="display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Construction</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <BrandTile label="Tilt · −14° from vertical" minHeight={180}>
          <div style={{ position: 'relative' }}>
            <FiftyMark size={140} />
            <svg viewBox="0 0 100 100" width={140} height={140} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <line x1="50" y1="0" x2="50" y2="100" stroke="oklch(70% 0.012 240)" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
              <circle cx="50" cy="50" r="2" fill="oklch(58% 0.16 152)" />
            </svg>
          </div>
        </BrandTile>
        <BrandTile label="Clear space · ½ × mark" minHeight={180}>
          <div style={{ position: 'relative', padding: 32, border: '1px dashed oklch(35% 0.013 240)', borderRadius: 'var(--r-sm)' }}>
            <FiftyMark size={64} />
          </div>
        </BrandTile>
        <BrandTile label="Min size · 16px" minHeight={180}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <FiftyMark size={64} />
            <FiftyMark size={32} />
            <FiftyMark size={16} />
          </div>
        </BrandTile>
      </div>
    </div>
  </div>
);

const SignatureProgressSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Signature progress shapes</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 760, lineHeight: 1.6 }}>
      Unique to 50pick. The <strong style={{ color: 'var(--text)' }}>TippingBar</strong> grows YES from center-left and NO from center-right, with a needle on the boundary that physically tilts as the market leans. <strong style={{ color: 'var(--text)' }}>ConfidenceDial</strong> applies the same tipping geometry as a circular data-viz reusing the logo's DNA. Both replace the generic horizontal progress bar across the product.
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
      <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 28, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>50/50 · Tipping</div>
          <TippingBar yesPct={50} animate={false} />
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>62/38 · Leans yes</div>
          <TippingBar yesPct={62} animate={false} />
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>22/78 · Leans no</div>
          <TippingBar yesPct={22} animate={false} />
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>91/9 · Resolved (with shimmer)</div>
          <TippingBar yesPct={91} animate={false} resolved />
        </div>
      </div>
      <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>ConfidenceDial · row of values</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <ConfidenceDial yesPct={18} label="Election" />
          <ConfidenceDial yesPct={42} label="Rains" />
          <ConfidenceDial yesPct={50} label="Sport" />
          <ConfidenceDial yesPct={71} label="Markets" />
          <ConfidenceDial yesPct={94} label="Resolved" />
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 14 }}>Live badge · PulseRing</div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <PulseRing size={56} color="oklch(58% 0.16 152)"><FiftyMark size={36} /></PulseRing>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.5 }}>Pulse ring around mark — used for <em>live now</em> markets and the splash screen.</div>
        </div>
      </div>
    </div>
  </div>
);

const BannerSpecimen = () => (
  <div className="specimen" style={{ width: 1700 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Banners &amp; brand applications</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 760, lineHeight: 1.6 }}>
      Standard sizes for marketing, social, app launch, and regulator hand-off. All carry the concept watermark.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Web hero · 1600 × 540</div>
        <BannerHero />
      </div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Social card · 1200 × 630 (OG / Twitter)</div>
          <BannerSocial />
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>App launch · 540 × 960</div>
          <BannerLaunch />
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Regulator letterhead strip · 1056 × 280</div>
        <BannerRegulator />
      </div>
    </div>
  </div>
);

Object.assign(window, { LogoSpecimen, SignatureProgressSpecimen, BannerSpecimen });
