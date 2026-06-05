// ds-forms.jsx — form fields, controls, text, clauses, scroller
const { useState: frS } = React;

const ScreenF = ({ children, pad = 32 }) => <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: pad, boxSizing: 'border-box' }}>{children}</div>;
const HF = ({ children, sub }) => <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>{sub}</div>}</div>;
const SF = ({ children }) => <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '22px 0 12px' }}>{children}</div>;

/* ---- controls ---- */
function Switch({ on: o = true }) { const [on, setOn] = frS(o); return <button onClick={() => setOn(!on)} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'var(--accent-500)' : 'var(--bg-inset)', position: 'relative', transition: 'background .18s var(--ease-micro)' }}><span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left .18s var(--ease-micro)', boxShadow: '0 1px 3px oklch(10% 0.05 264 / 0.5)' }} /></button>; }
function Checkbox({ on: o = true, label }) { const [on, setOn] = frS(o); return <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13.5, color: 'var(--text)' }} onClick={() => setOn(!on)}><span style={{ width: 19, height: 19, borderRadius: 5, border: `1px solid ${on ? 'var(--accent-500)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-500)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>{on && <Icon.check s={13} sw={3} style={{ color: '#06130d' }} />}</span>{label}</label>; }
function Radio({ checked, label }) { return <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13.5, color: 'var(--text)' }}><span style={{ width: 19, height: 19, borderRadius: 999, border: `1px solid ${checked ? 'var(--accent-500)' : 'var(--border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{checked && <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--accent-500)' }} />}</span>{label}</label>; }
function Select({ value = 'Volume', items = ['Volume', 'Closing soon', 'Newest', 'Biggest movers'] }) {
  const [open, setOpen] = frS(false); const [v, setV] = frS(value);
  return <div style={{ position: 'relative', width: 200 }}>
    <button onClick={() => setOpen(!open)} style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: `1px solid ${open ? 'var(--brand-500)' : 'var(--border)'}`, color: 'var(--text)', font: '500 13.5px var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>Sort: <b>{v}</b><Icon.macro s={14} style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text-subtle)' }} /></button>
    {open && <div style={{ position: 'absolute', top: 46, left: 0, right: 0, background: 'var(--bg-elevated2)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: 5, zIndex: 5, boxShadow: '0 14px 34px oklch(8% 0.08 264 / 0.6)' }}>{items.map((it) => <div key={it} onClick={() => { setV(it); setOpen(false); }} style={{ padding: '9px 11px', borderRadius: 'var(--r-sm)', fontSize: 13.5, cursor: 'pointer', color: it === v ? 'var(--accent-400)' : 'var(--text)', background: it === v ? 'oklch(40% 0.08 264 / 0.4)' : 'transparent' }}>{it}</div>)}</div>}
  </div>;
}
function Stepper() { const [n, setN] = frS(25000); const step = (d) => setN((x) => Math.max(0, x + d)); const B = ({ d, c }) => <button onClick={() => step(d)} style={{ width: 38, height: 44, border: 'none', background: 'var(--bg-elevated2)', color: 'var(--text)', fontSize: 18, cursor: 'pointer' }}>{c}</button>;
  return <div style={{ display: 'flex', alignItems: 'center', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', width: 'fit-content' }}><B d={-5000} c="−" /><span style={{ ...mono, fontSize: 16, fontWeight: 600, padding: '0 16px', minWidth: 120, textAlign: 'center' }}>TZS {n.toLocaleString()}</span><B d={5000} c="+" /></div>; }

function FormsBoard() {
  return <ScreenF>
    <HF sub="Inputs, amount stepper, select, switch, checkbox, radio, textarea — all states, AA focus rings.">Form fields &amp; controls</HF>
    <SF>Text inputs</SF>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
      <Input icon={<Icon.search s={15} />} placeholder="Search markets… · Tafuta soko…" />
      <Input prefix="TZS" value="25,000" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 44, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--no-500)', boxShadow: '0 0 0 3px oklch(58% 0.2 25 / 0.2)' }}><Icon.info s={15} style={{ color: 'var(--no-400)' }} /><span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>00,00</span><span style={{ fontSize: 11.5, color: 'var(--no-400)' }}>Min TZS 100</span></div>
    </div>
    <SF>Amount stepper · quick chips</SF>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><Stepper />{['1k', '5k', '10k', '25k', '50k'].map((c, i) => <span key={c} style={{ ...mono, fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', color: i === 3 ? 'var(--gold-text)' : 'var(--text-muted)', background: i === 3 ? 'var(--gold-500)' : 'var(--bg-elevated2)', border: '1px solid var(--border)' }}>{c}</span>)}</div>
    <SF>Select · switch · checkbox · radio</SF>
    <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <Select />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}><Switch on={true} /> Notify on resolution</div>
        <Checkbox on={true} label="Remember my stake" />
        <Checkbox on={false} label="Auto-roll into next round" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Radio checked label="M-Pesa" /><Radio checked={false} label="Airtel Money" /><Radio checked={false} label="Tigo Pesa" /></div>
    </div>
    <SF>Textarea</SF>
    <textarea defaultValue="Flagging this resolution — the source URL shows a different outcome." style={{ width: '100%', maxWidth: 480, height: 76, resize: 'none', padding: 12, borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)', font: '400 13.5px var(--font-body)', outline: 'none' }} />
  </ScreenF>;
}

/* ============================================================
   TEXT + LEGAL CLAUSES (EN/SW), responsible-gaming copy
   ============================================================ */
function TextClauses() {
  const clauses = [
    ['Pool-share payout', 'Winners share the losing pool minus a 9% operator margin. Your payout depends on the final pool, not the odds shown now.', 'Washindi hugawana mfuko wa walioshindwa ukiondoa 9%. Malipo hutegemea mfuko wa mwisho.'],
    ['Outcome risk', 'Predictions can lose. Only stake what you can afford. This is not investment advice.', 'Utabiri unaweza kushindwa. Weka dau unaloweza kumudu.'],
    ['Two-officer resolution', 'Every market resolves against a public source URL, confirmed by two compliance officers.', 'Kila soko hutatuliwa kwa chanzo cha umma, kikithibitishwa na maafisa wawili.'],
    ['Objection window', 'You have 24 hours to flag a resolution before settlement is final.', 'Una saa 24 kupinga uamuzi kabla ya malipo kukamilika.'],
    ['18+ & responsible play', 'You must be 18+. Set limits, take breaks. Helpline available 24/7.', 'Lazima uwe na umri wa miaka 18+. Weka mipaka, pumzika.'],
  ];
  return <ScreenF>
    <HF sub="Body styles, links, and the standing legal / responsible-gaming clauses — EN primary, Swahili italic. Never promissory.">Text &amp; clauses</HF>
    <SF>Text styles</SF>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8, maxWidth: 540 }}>
      <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6 }}>Body — Stake TZS on real-world outcomes and share the pool if you're right.</div>
      <div style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--text-subtle)' }}>Swahili — Weka dau kwenye matukio halisi, shiriki mfuko ukiwa sahihi.</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Caption / meta · <span className="mono">TZS 48.2M pool · 1,284 predictors</span></div>
      <div style={{ fontSize: 14 }}>Inline <a href="#" style={{ color: 'var(--accent-400)', textDecoration: 'none', borderBottom: '1px solid oklch(72% 0.11 195 / 0.4)' }}>link to fairness page →</a></div>
    </div>
    <SF>Standing clauses</SF>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {clauses.map(([t, en, sw]) => <div key={t} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent-500)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
        <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-400)', marginBottom: 5 }}>{t}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{en}</div>
        <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-subtle)', marginTop: 3 }}>{sw}</div>
      </div>)}
    </div>
  </ScreenF>;
}

/* ============================================================
   SCROLLER — custom scroll area (chrome-styled thumb)
   ============================================================ */
function Scroller() {
  const rows = ['Simba SC derby', 'TZS/USD < 2,700', 'Bitcoin > $90k', 'Dar es Salaam heat', 'BoT policy rate', 'Taifa Stars AFCON', '5-minute coin flip', '1-hour TZS spot'];
  return <ScreenF>
    <HF sub="Scroll area with a slim brand-tinted thumb (8px). Hidden until hover on desktop; momentum on touch.">Scroller</HF>
    <div style={{ width: 360, height: 260, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <div className="ds-scroll" style={{ height: '100%', overflowY: 'auto', padding: 6 }}>
        {rows.concat(rows).map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px', borderRadius: 'var(--r-sm)', background: i % 2 ? 'transparent' : 'var(--bg-inset)' }}>
          <span style={{ fontSize: 13.5 }}>{r}</span><span style={{ ...mono, fontSize: 12.5, color: 'var(--yes-400)' }}>{50 + (i % 5) * 3}%</span>
        </div>)}
      </div>
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 12 }}>Track: <span className="mono">var(--bg-inset)</span> · thumb: <span className="mono">var(--border-strong)</span> → <span className="mono">var(--brand-500)</span> on hover.</div>
  </ScreenF>;
}

Object.assign(window, { FormsBoard, TextClauses, Scroller, Switch, Checkbox, Radio, Select, Stepper });
