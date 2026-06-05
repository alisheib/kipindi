// ds-overlays.jsx — notifications, popups, dialogs, rich avatars (polish pass)
const { useState: oS, useEffect: oE } = React;

/* ---------- Rich avatar: presence ring + online dot + stack ---------- */
function AvatarRich({ initials = 'JK', tier = 'gold', size = 44, online }) {
  return <span style={{ position: 'relative', display: 'inline-flex' }}>
    <Avatar initials={initials} tier={tier} size={size} />
    {online && <span style={{ position: 'absolute', right: 0, bottom: 0, width: size * 0.28, height: size * 0.28, borderRadius: 999, background: 'var(--live-400)', border: '2px solid var(--bg)', boxShadow: '0 0 6px var(--live-400)' }} />}
  </span>;
}
function AvatarStack({ items = [['AM', 'gold'], ['JK', 'silver'], ['RT', 'bronze'], ['+9', 'diamond']], size = 32 }) {
  return <div style={{ display: 'flex' }}>{items.map((it, i) => <span key={i} style={{ marginLeft: i ? -size * 0.34 : 0, borderRadius: 999, border: '2px solid var(--bg)', zIndex: items.length - i }}>{it[0].startsWith('+') ? <span style={{ display: 'inline-flex', width: size, height: size, borderRadius: 999, background: 'var(--bg-elevated2)', border: '1px solid var(--border-strong)', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: size * 0.34, fontWeight: 700, color: 'var(--text-muted)' }}>{it[0]}</span> : <Avatar initials={it[0]} tier={it[1]} size={size} />}</span>)}</div>;
}

/* ---------- Notification bell + dropdown panel ---------- */
function NotificationPanel() {
  const items = [
    ['win', 'You won TZS 39,062', 'Simba SC derby resolved YES', '2m', true],
    ['move', 'Bitcoin > $90k moved +4%', 'Now 58% YES', '18m', true],
    ['resolve', 'TZS/USD market resolves in 1h', 'Place or adjust your prediction', '1h', false],
    ['system', 'KYC verified', 'Withdrawals are now enabled', '3h', false],
  ];
  const ic = { win: ['var(--gold-400)', Icon.trophy], move: ['var(--yes-400)', Icon.chart], resolve: ['var(--brand-300)', Icon.clock], system: ['var(--accent-400)', Icon.shield] };
  return <div style={{ width: 340, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: '0 24px 60px oklch(6% 0.06 264 / 0.6)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>Notifications</span>
      <span style={{ ...mono, fontSize: 11, color: 'var(--accent-400)', cursor: 'pointer' }}>Mark all read</span>
    </div>
    {items.map((it, i) => { const [c, G] = ic[it[0]]; return <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 16px', borderTop: i ? '1px solid oklch(30% 0.05 264 / 0.4)' : 'none', background: it[4] ? 'oklch(40% 0.08 264 / 0.10)' : 'transparent', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c }}><G s={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it[1]}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 1 }}>{it[2]}</div></div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}><span style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)' }}>{it[3]}</span>{it[4] && <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--brand-400)' }} />}</div>
    </div>; })}
    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}><span style={{ fontSize: 12.5, color: 'var(--accent-400)', cursor: 'pointer', fontWeight: 500 }}>View all activity →</span></div>
  </div>;
}

/* ---------- Toast popups (success / gold / info / error) ---------- */
function Toast({ kind = 'success', title, body }) {
  const map = { success: ['var(--yes-400)', Icon.check], gold: ['var(--gold-400)', Icon.trophy], info: ['var(--brand-300)', Icon.info], error: ['var(--no-400)', Icon.x] };
  const [c, G] = map[kind];
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 320, padding: '12px 14px', background: 'var(--bg-elevated2)', border: '1px solid var(--border-strong)', borderLeft: `3px solid ${c}`, borderRadius: 'var(--r-md)', boxShadow: '0 12px 30px oklch(6% 0.06 264 / 0.5)' }}>
    <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c }}><G s={16} sw={2.2} /></span>
    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>{body && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 1 }}>{body}</div>}</div>
    <span style={{ color: 'var(--text-faint)', cursor: 'pointer' }}><Icon.x s={15} /></span>
  </div>;
}

/* ---------- Confirm dialog (popup) ---------- */
function ConfirmDialog() {
  return <div style={{ width: 360, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 22, boxShadow: '0 30px 80px oklch(5% 0.05 264 / 0.65)' }}>
    <div style={{ width: 42, height: 42, borderRadius: 999, background: 'oklch(58% 0.2 25 / 0.16)', border: '1px solid oklch(58% 0.2 25 / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--no-400)', marginBottom: 14 }}><Icon.info s={20} /></div>
    <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>Cancel this prediction?</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 18px', lineHeight: 1.5 }}>Your TZS 25,000 stake returns to your wallet. This can't be undone once the market closes. <span style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>Hii haiwezi kutenduliwa.</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="ghost" size="md" live>Keep it</Btn><Btn variant="no" size="md" live>Cancel prediction</Btn></div>
  </div>;
}

function OverlaysBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Notifications, popups &amp; avatars</div><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>Bell dropdown, toast stack, confirm dialog, presence avatars + stacks. Every state themed, nothing default.</div></div>
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>NOTIFICATION CENTER</div><NotificationPanel /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>TOAST POPUPS</div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Toast kind="success" title="Prediction placed" body="TZS 25,000 on YES · Simba SC derby" />
          <Toast kind="gold" title="You won TZS 39,062" body="Paid to your wallet" />
          <Toast kind="info" title="Market resolves in 1 hour" body="Bitcoin > $90k" />
          <Toast kind="error" title="Insufficient balance" body="Top up via M-Pesa to continue" />
        </div></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>CONFIRM DIALOG</div><ConfirmDialog /></div>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>AVATARS</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
            <AvatarRich initials="JK" tier="gold" online /><AvatarRich initials="AM" tier="silver" online /><AvatarRich initials="RT" tier="bronze" /><AvatarRich initials="DI" tier="diamond" online />
          </div>
          <AvatarStack />
        </div>
      </div>
    </div>
  </div>;
}

/* ---------- States: empty / loading / error / offline ---------- */
function StateCard({ icon, tone = 'var(--text-faint)', title, body, cta, children }) {
  return <div style={{ width: 300, minHeight: 188, background: 'var(--bg-elevated)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box' }}>
    {children || <React.Fragment>
      <span style={{ width: 46, height: 46, borderRadius: 999, background: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone, marginBottom: 14 }}>{icon}</span>
      <div className="disp" style={{ fontSize: 15.5, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', margin: '6px 0 16px', lineHeight: 1.5 }}>{body}</div>
      {cta}
    </React.Fragment>}
  </div>;
}
function StatesBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>States — empty · loading · error · offline</div><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>Every surface has a considered no-data, loading and failure state. Bilingual, never blames the user.</div></div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', margin: '0 0 12px' }}>EMPTY / NO DATA</div>
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
      <StateCard icon={<Icon.chart s={22} />} title="No open positions" body="Pick a side to get started · Chagua upande kuanza" cta={<Btn variant="primary" size="md" live>Browse markets</Btn>} />
      <StateCard icon={<Icon.search s={22} />} title="No markets found" body={'Nothing matches “netball” · Hakuna matokeo'} cta={<Btn variant="ghost" size="md" live>Clear filters</Btn>} />
      <StateCard icon={<Icon.trophy s={22} />} title="Leaderboard is warming up" body="Rankings update after the first round closes." />
    </div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', margin: '26px 0 12px' }}>LOADING (skeleton in context)</div>
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <SkeletonCard />
      <div style={{ width: 300, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid oklch(30% 0.05 264 / 0.4)' : 'none' }}><Skeleton w={30} h={30} r={999} /><div style={{ flex: 1 }}><Skeleton w="70%" h={11} /><div style={{ height: 6 }} /><Skeleton w="40%" h={9} /></div><Skeleton w={40} h={14} /></div>)}
      </div>
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', minHeight: 150, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <Spinner size={30} /><span style={{ fontSize: 12.5, color: 'var(--text-subtle)' }}>Loading markets… · Inapakia…</span>
      </div>
    </div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', margin: '26px 0 12px' }}>ERROR / OFFLINE</div>
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
      <StateCard icon={<Icon.info s={22} />} tone="var(--no-400)" title="Couldn't load markets" body="Something didn't work. Try again. · Hitilafu imetokea. Jaribu tena." cta={<Btn variant="primary" size="md" live leading={<Icon.bolt s={15} />}>Retry</Btn>} />
      <StateCard icon={<Icon.globe s={22} />} tone="var(--gold-400)" title="You're offline" body="We'll reconnect automatically · Hakuna mtandao" />
      <StateCard><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}><div style={{ position: 'relative', marginBottom: 14 }}><Spinner size={30} color="var(--no-400)" /></div><div className="disp" style={{ fontSize: 15.5, fontWeight: 600 }}>Reconnecting…</div><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 6 }}>Attempt 2 of 5 · Inajaribu tena</div></div></StateCard>
    </div>
  </div>;
}

/* ---------- Responsible-play & warning states (compliance-grade) ---------- */
function WarnModal({ tone = 'gold', icon, title, sw, body, actions, foot }) {
  const c = tone === 'no' ? 'var(--no-400)' : tone === 'gold' ? 'var(--gold-300)' : 'var(--brand-300)';
  return <div style={{ width: 330, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card, 0 10px 28px -10px oklch(4% 0.04 268 / 0.7))' }}>
    <div style={{ height: 2, background: c, opacity: 0.7 }} />
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
        <span style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: c, flexShrink: 0 }}>{icon}</span>
        <div style={{ minWidth: 0 }}><div className="disp" style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>{sw && <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--text-subtle)' }}>{sw}</div>}</div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.55 }}>{body}</div>
      {actions}
      {foot && <div style={{ ...mono, fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>{foot}</div>}
    </div>
  </div>;
}
function WarningsBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Responsible play &amp; warnings</div><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>Compliance-grade states a licensed operator must ship: session reality-check, limits, cooling-off, high-stake &amp; balance guards. Calm, never alarmist; bilingual.</div></div>
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <WarnModal tone="gold" icon={<Icon.clock s={20} />} title="You've been playing 1 hour" sw="Umekuwa ukicheza saa 1"
        body={<span>In this session: <b style={{ color: 'var(--text)' }}>14 predictions · TZS 180,000 staked · net −TZS 22,000</b>. Taking regular breaks keeps it fun.</span>}
        actions={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="ghost" size="md" live>Take a break</Btn><Btn variant="primary" size="md" live>Continue</Btn></div>}
        foot="Shown every 60 min · haptic: warning [30,30]" />
      <WarnModal tone="no" icon={<Icon.shield s={20} />} title="Daily stake limit reached" sw="Kikomo cha siku kimefikiwa"
        body={<span>You've staked your <b style={{ color: 'var(--text)' }}>TZS 200,000</b> daily limit. It resets at midnight EAT. You set this limit — raising it takes 24 hours.</span>}
        actions={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="primary" size="md" live>View wallet</Btn><Btn variant="ghost" size="md" live>Limit settings</Btn></div>} />
      <WarnModal tone="info" icon={<Icon.info s={20} />} title="Need a longer break?" sw="Unahitaji mapumziko marefu?"
        body="Set a cooling-off period (24h–6 weeks) or self-exclude. During this time you can't place predictions. Withdrawals stay open."
        actions={<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Btn variant="outline" size="md" full live>Cooling-off · 24h to 6 weeks</Btn><Btn variant="ghost" size="md" full live>Self-exclude · 6 months+</Btn></div>}
        foot="Helpline available 24/7 · Simu ya msaada" />
    </div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', margin: '26px 0 12px' }}>INLINE GUARDS &amp; BANNERS</div>
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* high stake */}
      <div style={{ width: 330, background: 'var(--bg-elevated)', border: '1px solid oklch(70% 0.13 82 / 0.4)', borderRadius: 'var(--r-lg)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ color: 'var(--gold-400)' }}><Icon.info s={16} /></span><span style={{ fontSize: 13, fontWeight: 600 }}>Large stake — please confirm</span></div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>TZS 500,000 is 38% of your balance. Only stake what you can afford to lose.</div>
        <Btn variant="gold" size="md" full live>I understand · confirm</Btn>
      </div>
      {/* low balance */}
      <div style={{ width: 330, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ color: 'var(--no-400)' }}><Icon.info s={16} /></span><span style={{ fontSize: 13, fontWeight: 600 }}>Low balance</span></div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>TZS 1,200 left. Top up via M-Pesa to keep predicting. <span style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>Ongeza salio.</span></div>
        <Btn variant="primary" size="md" full live>Top up</Btn>
      </div>
      {/* market closing */}
      <div style={{ width: 330, display: 'flex', alignItems: 'center', gap: 11, background: 'oklch(58% 0.2 25 / 0.10)', border: '1px solid oklch(58% 0.2 25 / 0.4)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
        <LiveDot c="var(--no-400)" s={8} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--no-300)' }}>Market closes in 2:00</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Last chance to place or adjust · Dakika 2 zimebaki</div></div>
      </div>
    </div>
  </div>;
}

Object.assign(window, { AvatarRich, AvatarStack, NotificationPanel, Toast, ConfirmDialog, OverlaysBoard, StateCard, StatesBoard, WarnModal, WarningsBoard });
