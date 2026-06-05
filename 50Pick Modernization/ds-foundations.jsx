// ds-foundations.jsx — foundations specimens + patterns (clean, basic, well-designed)
const { useState: foS } = React;

const Screen = ({ children, pad = 32, style }) => <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: pad, boxSizing: 'border-box', ...style }}>{children}</div>;
const Hd = ({ children, sub }) => <div style={{ marginBottom: 24 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>{sub}</div>}</div>;
const Sub = ({ children }) => <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '22px 0 12px' }}>{children}</div>;

/* ---------- COLOR ---------- */
function ColorRamp({ name, varBase, steps }) {
  return <div style={{ marginBottom: 16 }}>
    <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{name}</div>
    <div style={{ display: 'flex', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {steps.map((s) => <div key={s} style={{ flex: 1, height: 38, background: `var(--${varBase}-${s})`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}><span style={{ ...mono, fontSize: 8.5, color: s <= 400 ? 'oklch(20% 0.05 264)' : '#fff', opacity: 0.7 }}>{s}</span></div>)}
    </div>
  </div>;
}
function FoundationColor() {
  return <Screen>
    <Hd sub="Exact OKLCH ramps. Surface tokens drive components; YES / NO / gold are safety-critical and used directly.">Color</Hd>
    <Sub>Brand blue · chrome</Sub><ColorRamp name="--brand" varBase="brand" steps={[600, 500, 400, 300]} />
    <Sub>Green accent · YES</Sub><ColorRamp name="--yes" varBase="yes" steps={[700, 600, 500, 400, 300]} />
    <Sub>Rose · NO</Sub><ColorRamp name="--no" varBase="no" steps={[700, 600, 500, 400, 300]} />
    <Sub>Gold · resolved / payout</Sub><ColorRamp name="--gold" varBase="gold" steps={[600, 500, 400, 300]} />
    <Sub>Surfaces</Sub>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {[['--bg', 'bg'], ['--bg-elevated', 'elevated'], ['--bg-elevated2', 'elevated2'], ['--bg-inset', 'inset'], ['--panel', 'panel'], ['--border', 'border']].map(([v, n]) => <div key={v} style={{ width: 96 }}><div style={{ height: 44, borderRadius: 'var(--r-sm)', background: `var(${v})`, border: '1px solid var(--border)' }} /><div style={{ ...mono, fontSize: 9.5, color: 'var(--text-subtle)', marginTop: 5 }}>{n}</div></div>)}
    </div>
  </Screen>;
}

/* ---------- TYPE ---------- */
function FoundationType() {
  const rows = [['Display 1', 'disp', 44, 700, 'Predict events.'], ['H1', 'disp', 34, 700, 'Pick a side now'], ['H2', 'disp', 26, 700, 'Market detail'], ['H3', 'disp', 20, 600, 'Buy tray'], ['Body', 'body', 15, 400, 'Stake TZS on real outcomes and share the pool if you are right.'], ['Small', 'body', 13, 500, 'Je, Simba SC watashinda dabi ya Kariakoo?'], ['Mono / numbers', 'mono', 18, 600, 'TZS 48,200,000 · 64% · 2d 4h']];
  return <Screen>
    <Hd sub="Sora (display) · Inter (body, EN/SW/FR) · JetBrains Mono (every number, tabular).">Type</Hd>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {rows.map(([name, fam, size, weight, sample]) => <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div style={{ width: 110, flexShrink: 0, ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>{name}<br /><span style={{ color: 'var(--text-faint)' }}>{size}px</span></div>
        <div className={fam} style={{ fontSize: size, fontWeight: weight, color: 'var(--text)', lineHeight: 1.15 }}>{sample}</div>
      </div>)}
    </div>
  </Screen>;
}

/* ---------- SPACING / RADIUS / ELEVATION ---------- */
function FoundationScale() {
  const sp = [['1', 4], ['2', 8], ['3', 12], ['4', 16], ['5', 20], ['6', 24], ['8', 32], ['10', 40], ['12', 48], ['16', 64]];
  const rad = [['xs', 4], ['sm', 6], ['md', 10], ['lg', 14], ['xl', 20], ['pill', 28]];
  return <Screen>
    <Hd sub="4px base grid · radius scale · two elevation levels. Restrained by design.">Spacing · Radius · Elevation</Hd>
    <Sub>Spacing (px)</Sub>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>{sp.map(([n, v]) => <div key={n} style={{ textAlign: 'center' }}><div style={{ width: v, height: v, background: 'var(--brand-500)', borderRadius: 3, marginBottom: 6 }} /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)' }}>{v}</div></div>)}</div>
    <Sub>Radius</Sub>
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>{rad.map(([n, v]) => <div key={n} style={{ textAlign: 'center' }}><div style={{ width: 60, height: 48, background: 'var(--bg-elevated2)', border: '1px solid var(--border-strong)', borderRadius: v }} /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginTop: 6 }}>{n} · {v}</div></div>)}</div>
    <Sub>Elevation</Sub>
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ width: 150, height: 70, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', boxShadow: '0 1px 2px oklch(8% 0.07 264 / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>rest</div>
      <div style={{ width: 150, height: 70, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--brand-500)', boxShadow: '0 14px 34px oklch(8% 0.08 264 / 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>raised / hover</div>
    </div>
  </Screen>;
}

/* ---------- MOTION + HAPTICS ---------- */
function MotionDemo({ label, render }) {
  const [k, setK] = foS(0);
  return <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, cursor: 'pointer' }} onClick={() => setK((x) => x + 1)}>
    <div key={k}>{render(k)}</div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 12 }}>{label} · tap to replay</div>
  </div>;
}
function FoundationMotion() {
  return <Screen>
    <Hd sub="Three easings carry the whole system. Haptics map to mobile events. Reduced-motion collapses all to instant.">Motion · Haptics</Hd>
    <Sub>Easings</Sub>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
      {[['--ease-micro', '100ms', 'hover · press · focus'], ['--ease-stage', '240ms', 'sheets · modals · bar reveal'], ['--ease-celebrate', '600ms', 'resolve · payout reveal']].map(([v, t, use]) => <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ ...mono, fontSize: 12, color: 'var(--accent-400)', width: 130 }}>{v}</span><span style={{ ...mono, fontSize: 12, color: 'var(--text)', width: 56 }}>{t}</span><span style={{ fontSize: 12.5, color: 'var(--text-subtle)' }}>{use}</span></div>)}
    </div>
    <Sub>Live demos</Sub>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
      <MotionDemo label="bar reveal · 240ms stage" render={() => <ConvictionBar yes={64} h={10} />} />
      <MotionDemo label="hover lift · 200ms" render={() => <div style={{ height: 36, borderRadius: 8, background: 'var(--bg-elevated2)', border: '1px solid var(--brand-500)', animation: 'liftIn .4s var(--ease-stage)' }} />} />
      <MotionDemo label="spinner · 700ms loop" render={() => <div style={{ display: 'flex', justifyContent: 'center', padding: 6 }}><Spinner /></div>} />
    </div>
    <Sub>Haptics (mobile)</Sub>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[['Light (10ms)', 'side select · quick-chip tap · toggle'], ['Medium (20ms)', 'confirm pressed · sheet open'], ['Success (10·40·10)', 'prediction placed · payout received'], ['Warning (30·30)', 'reality-check · objection window <1h']].map(([h, use]) => <div key={h} style={{ display: 'flex', gap: 14, alignItems: 'center' }}><span style={{ ...mono, fontSize: 11.5, color: 'var(--gold-400)', width: 150 }}>{h}</span><span style={{ fontSize: 12.5, color: 'var(--text-subtle)' }}>{use}</span></div>)}
    </div>
  </Screen>;
}

/* ============================================================
   PATTERNS — betslip sheet · KYC step · reality check · empty state
   ============================================================ */
function Patterns() {
  return <Screen>
    <Hd sub="Mobile betslip bottom-sheet (hold-to-confirm), KYC step, reality check, empty state.">Patterns</Hd>
    <div style={{ display: 'grid', gridTemplateColumns: '300px 300px', gap: 18 }}>
      {/* betslip sheet */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '18px 18px var(--r-md) var(--r-md)', padding: 18 }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border-strong)', margin: '0 auto 16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}><SideButton side="yes" price="64" live /><SideButton side="no" price="36" live /></div>
        <Input prefix="TZS" value="25,000" />
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0', alignItems: 'center' }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>If correct</span><span style={{ ...mono, fontSize: 17, fontWeight: 700, color: 'var(--gold-400)' }}>TZS 39,062</span></div>
        <Btn variant="gold" size="lg" full live leading={<Icon.check s={16} sw={2.4} />}>Hold to confirm</Btn>
        <div style={{ marginTop: 8 }}><ProgressBar value={40} tone="gold" size="sm" /></div>
      </div>
      {/* KYC + reality + empty stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
          <SteppedProgress steps={4} current={1} />
          <div className="disp" style={{ fontSize: 15, fontWeight: 600, margin: '12px 0 12px' }}>Verify your phone · Step 1 of 4</div>
          <OtpBoxes filled={3} />
          <div style={{ ...mono, fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 10 }}>Resend code in 0:42</div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
          <Chip tone="soon">Pending</Chip>
          <div className="disp" style={{ fontSize: 15, fontWeight: 600, margin: '10px 0 12px' }}>You've been on for 30 minutes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="ghost" live>Take a break</Btn><Btn variant="primary" live>Continue</Btn></div>
        </div>
      </div>
    </div>
    <Sub>Empty state</Sub>
    <div style={{ width: 320, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, color: 'var(--text-faint)' }}><Icon.chart s={40} /></div>
      <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>No open positions yet</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', margin: '6px 0 16px' }}>Pick a side to get started · Chagua upande kuanza</div>
      <Btn variant="primary" live>Browse markets</Btn>
    </div>
  </Screen>;
}

Object.assign(window, { FoundationColor, FoundationType, FoundationScale, FoundationMotion, Patterns });
