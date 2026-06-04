// ds-news-ai.jsx — news marquee banner + themed AI assistant
const { useState: naS, useEffect: naE, useRef: naR } = React;

/* ============================================================
   NEWS BANNER — continuous marquee, top of app
   ============================================================ */
function NewsBanner() {
  const news = [
    ['SPORTS', 'Simba SC name unchanged XI for the Kariakoo derby'],
    ['FOREX', 'BoT holds policy rate at 6.0% — TZS steady against USD'],
    ['CRYPTO', 'Bitcoin reclaims $88k as volatility cools'],
    ['WEATHER', 'TMA: Dar es Salaam heat advisory through the weekend'],
    ['MARKETS', 'New: 1-hour TZS spot markets now live'],
  ];
  const Item = ({ tag, text }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, paddingRight: 34 }}>
      <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gold-400)', border: '1px solid oklch(80% 0.13 84 / 0.35)', borderRadius: 'var(--r-xs)', padding: '2px 6px' }}>{tag}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{text}</span>
      <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
    </span>
  );
  const row = (k) => news.map((n, i) => <Item key={k + i} tag={n[0]} text={n[1]} />);
  return (
    <div style={{ height: 34, display: 'flex', alignItems: 'center', background: 'var(--panel)', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, height: '100%', padding: '0 16px 0 13px', background: 'linear-gradient(90deg, oklch(48% 0.20 25), oklch(58% 0.20 25))', color: '#fff', ...mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', flexShrink: 0, clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)', paddingRight: 22 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#fff', boxShadow: '0 0 6px oklch(99% 0.02 25 / 0.7)', animation: 'lpulse 1.5s ease-in-out infinite' }} /> LIVE
      </span>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'marquee 38s linear infinite', willChange: 'transform' }}>{row('a')}{row('b')}</div>
      </div>
    </div>
  );
}

/* ============================================================
   AI ASSISTANT — launcher bubble + chat panel (themed)
   ============================================================ */
function AiBubble({ onClick, open }) {
  return (
    <button onClick={onClick} aria-label="Open assistant" style={{ width: 56, height: 56, borderRadius: 999, border: '1px solid var(--border-strong)', cursor: 'pointer',
      background: 'linear-gradient(150deg, var(--brand-500), var(--brand-600))', boxShadow: '0 8px 24px oklch(8% 0.08 264 / 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'transform .15s var(--ease-micro)' }}>
      {open ? <Icon.x s={22} /> : <Icon.spark s={24} />}
    </button>
  );
}
function Bubble({ who, children }) {
  const ai = who === 'ai';
  return <div style={{ display: 'flex', justifyContent: ai ? 'flex-start' : 'flex-end' }}>
    <div style={{ maxWidth: '82%', padding: '9px 12px', borderRadius: ai ? '4px 12px 12px 12px' : '12px 4px 12px 12px', fontSize: 13, lineHeight: 1.5,
      background: ai ? 'var(--bg-elevated2)' : 'linear-gradient(180deg, var(--brand-500), var(--brand-600))', color: ai ? 'var(--text)' : '#fff', border: ai ? '1px solid var(--border)' : 'none' }}>{children}</div>
  </div>;
}
function Typing() {
  return <div style={{ display: 'flex', gap: 4, padding: '11px 13px', width: 'fit-content', borderRadius: '4px 12px 12px 12px', background: 'var(--bg-elevated2)', border: '1px solid var(--border)' }}>
    {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--text-subtle)', animation: `typing 1.2s ${i * 0.15}s infinite` }} />)}
  </div>;
}
function AiChat() {
  return (
    <div style={{ width: 360, height: 520, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: '0 24px 70px oklch(6% 0.06 264 / 0.6)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 999, background: 'linear-gradient(150deg, var(--brand-500), var(--brand-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon.spark s={18} /></div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Tabiri · AI guide</div><div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--live-400)' }}><LiveDot c="var(--live-400)" s={5} /> Online</div></div>
        <span style={{ color: 'var(--text-subtle)', cursor: 'pointer' }}><Icon.x s={18} /></span>
      </div>
      {/* messages */}
      <div className="ds-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center', ...mono, fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>TODAY</div>
        <Bubble who="ai">Habari! I can explain markets, odds and payouts. I never tell you what to predict.</Bubble>
        <Bubble who="user">Which markets close today?</Bubble>
        <Bubble who="ai">Three close within the hour: the Simba SC derby (2d… actually 11m), the 5-minute coin flip, and the 1-hour TZS spot. Want me to open them?</Bubble>
        <Bubble who="user">How is my payout calculated?</Bubble>
        <Typing />
      </div>
      {/* quick replies */}
      <div style={{ display: 'flex', gap: 7, padding: '0 14px 10px', flexWrap: 'wrap' }}>
        {['Explain pool-share', 'My open positions', 'Set a limit'].map((q) => <span key={q} style={{ fontSize: 12, color: 'var(--accent-400)', border: '1px solid oklch(72% 0.11 195 / 0.4)', borderRadius: 'var(--r-pill)', padding: '5px 11px', cursor: 'pointer' }}>{q}</span>)}
      </div>
      {/* input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 40, padding: '0 13px', borderRadius: 'var(--r-pill)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Ask anything · Uliza chochote</span></div>
        <button aria-label="Send" style={{ width: 40, height: 40, borderRadius: 999, border: 'none', cursor: 'pointer', background: 'linear-gradient(180deg, var(--brand-500), var(--brand-600))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.bolt s={17} /></button>
      </div>
      <div style={{ ...mono, fontSize: 9.5, color: 'var(--text-faint)', textAlign: 'center', paddingBottom: 8 }}>Informational only · Si ushauri wa kuweka dau</div>
    </div>
  );
}

function NewsAiBoard() {
  const [open, setOpen] = naS(true);
  return (
    <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }}>
      <NewsBanner />
      <div style={{ padding: 28 }}>
        <div style={{ marginBottom: 20 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>News banner &amp; AI assistant</div><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>Top news marquee (38s loop, pauses on hover in build). Tabiri AI guide — informational, never advises a pick.</div></div>
        <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <AiChat />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em' }}>LAUNCHER</div>
            <AiBubble open={open} onClick={() => setOpen(!open)} />
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', maxWidth: 160, textAlign: 'center', lineHeight: 1.5 }}>Floats bottom-right; toggles the panel.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NewsBanner, AiBubble, AiChat, NewsAiBoard });
