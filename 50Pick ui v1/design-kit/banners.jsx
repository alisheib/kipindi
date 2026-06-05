/* 50pick.tz banners and brand applications.

   Each banner is a fixed pixel size with the standard export ratio so
   marketing/social/regulator hand-off all live in one file.
*/

// Standard topographic backdrop reused across banners — Tanzanian highland
// contour pattern, very subtle.
const Topo = ({ id }) => (
  <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none' }}>
    <defs>
      <pattern id={`topo-${id}`} x="0" y="0" width="240" height="180" patternUnits="userSpaceOnUse">
        <path d="M 0 90 Q 60 60 120 90 T 240 90" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
        <path d="M 0 60 Q 80 30 160 60 T 320 60" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
        <path d="M 0 120 Q 40 100 100 120 T 220 120 T 340 120" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
        <path d="M -40 150 Q 60 130 140 150 T 280 150" fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.6" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#topo-${id})`} />
  </svg>
);

// ── Hero banner (web, 1600 × 540) ───────────────────────────────────────
const BannerHero = () => (
  <div style={{
    width: 1600, height: 540, position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, oklch(14% 0.012 240) 0%, oklch(18% 0.03 215) 100%)',
    borderRadius: 'var(--r-lg)',
    border: '1px solid var(--border)',
  }}>
    <Topo id="hero" />
    {/* Giant ghosted mark behind text */}
    <div style={{ position: 'absolute', right: -80, top: -60, opacity: 0.12 }}>
      <FiftyMark size={620} mono inverted />
    </div>
    <div style={{ position: 'relative', padding: '64px 80px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FiftyLockup size={28} color="oklch(96% 0.005 240)" />
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(70% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Tanzania · Concept platform · Not a live product
        </div>
      </div>

      <div style={{ maxWidth: 880 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'oklch(72% 0.10 152)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
          Soko la utabiri · Prediction markets
        </div>
        <h1 style={{
          fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 80, lineHeight: 1.0,
          color: 'oklch(96% 0.005 240)', margin: 0, letterSpacing: '-0.035em',
          textWrap: 'pretty',
        }}>
          The wisdom of <span style={{ color: 'oklch(72% 0.13 152)' }}>YES</span> &{' '}
          <span style={{ color: 'oklch(72% 0.16 22)' }}>NO</span>.
        </h1>
        <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 19, color: 'oklch(78% 0.012 240)', marginTop: 18, marginBottom: 0, maxWidth: 620, lineHeight: 1.5 }}>
          Pesa kidogo, ukweli mkubwa. Trade questions about Tanzania's weather,
          markets, sport and elections — settled by official sources.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
        <div style={{ flex: 1, maxWidth: 420 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(72% 0.04 240)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Will the long rains begin before March 15?
          </div>
          <TippingBar yesPct={62} height={22} animate={false} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ padding: '14px 22px', borderRadius: 999, background: 'oklch(58% 0.16 152)', color: 'oklch(15% 0.05 152)', fontWeight: 700, fontFamily: 'Sora, sans-serif', fontSize: 15 }}>
            Open the markets →
          </div>
          <div style={{ padding: '14px 22px', borderRadius: 999, background: 'transparent', color: 'oklch(96% 0.005 240)', fontWeight: 600, fontFamily: 'Sora, sans-serif', fontSize: 15, border: '1px solid oklch(35% 0.013 240)' }}>
            How it works
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Social card (1200 × 630, OG/Twitter) ────────────────────────────────
const BannerSocial = () => (
  <div style={{
    width: 1200, height: 630, position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(160deg, oklch(15% 0.03 215) 0%, oklch(20% 0.06 152) 50%, oklch(18% 0.05 22) 100%)',
    borderRadius: 'var(--r-lg)',
    border: '1px solid var(--border)',
  }}>
    <Topo id="social" />
    <div style={{ position: 'relative', padding: '60px 70px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <FiftyLockup size={26} color="oklch(96% 0.005 240)" />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28 }}>
          <FiftyMark size={140} />
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(72% 0.04 240)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
              Trade what's true
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 56, color: 'oklch(96% 0.005 240)', lineHeight: 1.0, letterSpacing: '-0.03em' }}>
              50/50 is where<br />the signal lives.
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 720 }}>
          <TippingBar yesPct={52} height={28} animate={false} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, color: 'oklch(80% 0.012 240)' }}>
          50pick.tz · soko la utabiri
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Concept · Not live
        </span>
      </div>
    </div>
  </div>
);

// ── App launch / splash (1170 × 720, ~iPhone 16 Pro portrait shrunk) ────
const BannerLaunch = () => (
  <div style={{
    width: 540, height: 960, position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(180deg, oklch(13% 0.012 240) 0%, oklch(20% 0.06 152) 100%)',
    borderRadius: 36,
    border: '1px solid var(--border)',
  }}>
    <Topo id="launch" />
    <div style={{ position: 'relative', padding: '60px 36px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(70% 0.012 240)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        Karibu · Welcome
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <PulseRing size={220} color="oklch(58% 0.16 152)">
          <FiftyMark size={180} />
        </PulseRing>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 42, color: 'oklch(96% 0.005 240)', letterSpacing: '-0.03em', marginBottom: 8 }}>
            50pick<span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 22, opacity: 0.7 }}>.tz</span>
          </div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, color: 'oklch(78% 0.012 240)', maxWidth: 320, lineHeight: 1.5, textWrap: 'pretty' }}>
            The wisdom of YES &amp; NO. Soko la utabiri la Tanzania.
          </div>
        </div>
      </div>
      <div style={{ width: '100%' }}>
        <div style={{
          background: 'oklch(58% 0.16 152)', color: 'oklch(15% 0.05 152)',
          fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17,
          padding: '18px 24px', borderRadius: 999, textAlign: 'center', marginBottom: 12,
        }}>
          Anza · Get started
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
          Concept design · Not a live product
        </div>
      </div>
    </div>
  </div>
);

// ── Regulator one-pager letterhead (816 × 320, US-letter top strip) ─────
const BannerRegulator = () => (
  <div style={{
    width: 1056, height: 280, position: 'relative', overflow: 'hidden',
    background: 'oklch(97% 0.012 80)', // light cream — print friendly
    borderRadius: 'var(--r-md)',
    border: '1px solid oklch(86% 0.012 80)',
  }}>
    <div style={{ position: 'absolute', right: 32, top: 32, opacity: 0.06 }}>
      <FiftyMark size={220} mono />
    </div>
    <div style={{ position: 'relative', padding: '32px 48px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FiftyLockup size={26} color="oklch(20% 0.01 240)" mono />
        <div style={{ textAlign: 'right', fontFamily: 'Sora, sans-serif', fontSize: 11, color: 'oklch(40% 0.01 240)', lineHeight: 1.5 }}>
          50pick Tanzania Limited<br />
          Plot 14, Bagamoyo Road, Dar es Salaam<br />
          legal@50pick.tz · +255 22 000 0000
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(40% 0.01 240)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
          Operator submission · Concept document
        </div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 26, color: 'oklch(20% 0.01 240)', letterSpacing: '-0.02em' }}>
          Prediction-market operating framework v0.1
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(45% 0.01 240)', letterSpacing: '0.08em' }}>
        <span>Doc · 50P-OPS-FRAMEWORK-001</span>
        <span>Page 1 of 12</span>
        <span>Confidential · Draft</span>
      </div>
    </div>
  </div>
);

Object.assign(window, { BannerHero, BannerSocial, BannerLaunch, BannerRegulator });
