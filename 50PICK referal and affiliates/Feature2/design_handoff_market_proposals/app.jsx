/* 50pick.tz — Affiliate + Proposals prototype harness + responsive shells.
   Player screens render in the kit Phone (mobile) or a responsive desktop web-app
   shell. Admin renders in a responsive operator console. Left rail toggles
   feature / screen / viewport / theme / program-state / data-state. */

const PLAYER_NAV = [['predict', 'Markets'], ['flag', 'Live'], ['history', 'Positions'], ['shield', 'Board'], ['lock', 'Profile']];

const FEATURES = {
  affiliate: {
    label: 'Affiliate', sub: 'Feature 1',
    screens: [
      ['invite', 'gift', 'Invite & Earn', '1.1 · the hero'],
      ['profile', 'user', 'Profile entry', '1.2 · Account row'],
      ['register', 'plus', 'Registration', '1.3 · referral ribbon'],
      ['notif', 'bell', 'Notifications', '1.4 · toasts & rows'],
      ['aff-admin', 'megaphone', 'Affiliate admin', '1.5 · /admin/affiliate'],
    ],
  },
  proposals: {
    label: 'Proposals', sub: 'Feature 2',
    screens: [
      ['board', 'asterisk', 'Proposals board', '2.1 · the hub'],
      ['create', 'plus', 'Create proposal', '2.2 · form'],
      ['detail', 'doc', 'Proposal detail', '2.3 · timeline'],
      ['entry', 'share', 'Entry points', '2.4 · in context'],
      ['pnotif', 'bell', 'Notifications', '2.4 · proposal alerts'],
      ['prop-admin', 'check', 'Review queue', '2.5 · /admin/proposals'],
    ],
  },
};

const META = {
  invite:   { title: 'Invite & Earn',     sw: 'Alika upate',     nav: 'Profile' },
  profile:  { title: 'Profile',           sw: 'Wasifu',          nav: 'Profile' },
  register: { title: 'Create account',    sw: 'Fungua akaunti',  nav: null, preAuth: true },
  notif:    { title: 'Notifications',     sw: 'Arifa',           nav: 'Profile' },
  board:    { title: 'Market Proposals',  sw: 'Mapendekezo',     nav: 'Markets' },
  create:   { title: 'Create proposal',   sw: 'Pendekeza soko',  nav: 'Markets' },
  detail:   { title: 'Proposal',          sw: 'Pendekezo',       nav: 'Markets' },
  entry:    { title: 'Markets',           sw: 'Soko',            nav: 'Markets' },
  pnotif:   { title: 'Notifications',     sw: 'Arifa',           nav: 'Profile' },
};

const ADMIN_SCREENS = { 'aff-admin': true, 'prop-admin': true };

const FitStage = ({ w, h, children }) => {
  const ref = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => { const s = Math.min(1, (el.clientWidth - 56) / w, (el.clientHeight - 56) / h); setScale(s > 0 ? s : 1); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [w, h]);
  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: w * scale, height: h * scale, flexShrink: 0 }}>
        <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  );
};

const statusFor = (screen, paused) => {
  if (screen === 'invite' || screen === 'board') return <StatusPill paused={paused} />;
  if (screen === 'profile') return <Chip variant="resolved">Gold tier</Chip>;
  if (screen === 'notif' || screen === 'pnotif') return <Chip variant="pending">3 new</Chip>;
  return null;
};

// Markets-page context for entry points (2.4)
const EntryContext = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Cap>Entry point on the Markets page</Cap>
    <ProposalEntryCard />
    <MarketCard title="Will the long rains begin before April 15?" titleSw="Mvua za masika zitaanza kabla ya tarehe 15?" category="Weather" yesPct={62} volume="1.2M" predictors={312} timeLeft="2d 14h" status="live" />
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-subtle)' }}>Public footer</div>
      <ProposalFooterLink />
    </div>
  </div>
);

const renderScreen = (screen, st) => {
  const { populated, paused, bonusOn, resolved, wide } = st;
  switch (screen) {
    case 'invite': return <InviteEarn populated={populated} paused={paused} wide={wide} />;
    case 'profile': return <ProfileEntry wide={wide} />;
    case 'register': return <Registration bonusOn={bonusOn} wide={wide} />;
    case 'notif': return <Notifications wide={wide} />;
    case 'board': return <ProposalsBoard populated={st.board3 !== 'empty'} loading={st.board3 === 'loading'} paused={paused} wide={wide} />;
    case 'create': return <CreateProposal wide={wide} />;
    case 'detail': return <ProposalDetail resolved={resolved} wide={wide} />;
    case 'entry': return <EntryContext />;
    case 'pnotif': return <ProposalNotifications wide={wide} />;
    default: return null;
  }
};

// ── Mobile player shell — kit Phone ─────────────────────────────────────
const MobilePlayer = ({ screen, state }) => {
  const m = META[screen];
  return (
    <Phone w={393} h={820}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: m.nav ? 74 : 16, background: 'var(--bg)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 6, background: 'color-mix(in oklab, var(--bg) 90%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', flexShrink: 0 }}><Icon name="arrow" size={16} style={{ transform: 'rotate(180deg)' }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{m.title}</div>
            <div className="sw" style={{ fontSize: 11 }}>{m.sw}</div>
          </div>
          {statusFor(screen, state.paused)}
        </div>
        <div style={{ padding: 14 }}>{renderScreen(screen, { ...state, wide: false })}</div>
      </div>
      {m.nav && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'center', zIndex: 5 }}>
          {PLAYER_NAV.map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: label === m.nav ? 'var(--gold-300)' : 'var(--text-subtle)' }}>
              <Icon name={icon} size={18} /><span style={{ fontSize: 10 }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </Phone>
  );
};

// ── Desktop player shell — responsive web app ───────────────────────────
const DesktopPlayer = ({ screen, state }) => {
  const m = META[screen];
  if (m.preAuth) {
    return (
      <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ width: 460 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><FiftyLockup size={24} color="var(--text)" /></div>
          {renderScreen(screen, { ...state, wide: true })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <aside style={{ width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ marginBottom: 14 }}><FiftyLockup size={20} color="var(--text)" /></div>
        {PLAYER_NAV.map(([icon, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: label === m.nav ? 'color-mix(in oklab, var(--gold-500) 12%, transparent)' : 'transparent', color: label === m.nav ? 'var(--gold-200)' : 'var(--text-muted)', fontWeight: label === m.nav ? 600 : 500, fontSize: 14, position: 'relative' }}>
            {label === m.nav && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))' }} />}
            <Icon name={icon} size={18} />{label}
          </div>
        ))}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <Avatar initials="AM" size="sm" hue={268} /><div style={{ fontSize: 13, fontWeight: 600 }}>Asha M.</div>
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 60, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px' }}>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{m.title}</div>
            <div className="sw" style={{ fontSize: 11.5 }}>{m.sw}</div>
          </div>
          {statusFor(screen, state.paused)}
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          <div style={{ maxWidth: screen === 'board' ? 880 : 680, margin: '0 auto' }}>{renderScreen(screen, { ...state, wide: true })}</div>
        </div>
      </div>
    </div>
  );
};

// ── Admin shell (responsive operator console) ───────────────────────────
const ADMIN_NAV = [
  ['Overview', [['asterisk', 'Dashboard', 'dash']]],
  ['Money', [['wallet', 'Wallet & rails', 'wallet'], ['coins', 'Ledger', 'ledger']]],
  ['Players', [['users', 'Players', 'players'], ['shield', 'KYC queue', 'kyc']]],
  ['Growth', [['megaphone', 'Affiliate', 'affiliate'], ['gift', 'Promotions', 'promos']]],
  ['Markets', [['predict', 'Markets', 'markets'], ['asterisk', 'AI candidates', 'ai'], ['doc', 'Proposals', 'proposals']]],
  ['Compliance', [['check', 'Resolver queue', 'resolver'], ['clock', 'Audit log', 'audit']]],
];

const AdminWrap = ({ screen, state, setPaused, wide }) => {
  const activeId = screen === 'prop-admin' ? 'proposals' : 'affiliate';
  const crumbGroup = screen === 'prop-admin' ? 'Markets' : 'Growth';
  const crumbItem = screen === 'prop-admin' ? 'Proposals' : 'Affiliate';
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-deep)', color: 'var(--text)' }}>
      {wide && (
        <aside style={{ width: 224, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg)', overflow: 'auto' }}>
          <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
            <FiftyLockup size={19} color="var(--text)" /><Cap style={{ marginTop: 8 }}>Operator console</Cap>
          </div>
          <nav style={{ padding: '10px 10px 20px' }}>
            {ADMIN_NAV.map(([group, items]) => (
              <div key={group} style={{ marginBottom: 10 }}>
                <Cap style={{ padding: '6px 10px' }}>{group}</Cap>
                {items.map(([icon, label, id]) => {
                  const active = id === activeId;
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', position: 'relative', background: active ? 'color-mix(in oklab, var(--gold-500) 12%, transparent)' : 'transparent', color: active ? 'var(--gold-200)' : 'var(--text-muted)', fontWeight: active ? 600 : 500, fontSize: 13.5 }}>
                      {active && <span style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 3, borderRadius: 3, background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))' }} />}
                      <Icon name={icon} size={17} />{label}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 54, flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px' }}>
          {!wide && <div style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}><Icon name="asterisk" size={18} /></div>}
          <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>{crumbGroup} <span style={{ margin: '0 6px' }}>/</span> <span style={{ color: 'var(--text)', fontWeight: 600 }}>{crumbItem}</span></div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="chip chip-active">ACTIVE</span><Avatar initials="NK" size="sm" hue={268} />
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: wide ? 24 : 16 }}>
          {screen === 'prop-admin'
            ? <AdminProposals paused={state.paused} setPaused={setPaused} wide={wide} />
            : <AdminAffiliate paused={state.paused} setPaused={setPaused} wide={wide} />}
        </div>
      </div>
    </div>
  );
};

// ── Control rail ────────────────────────────────────────────────────────
const Seg2 = ({ value, options, onChange }) => (
  <div style={{ display: 'flex', gap: 3, padding: 3, background: 'oklch(20% 0.04 268)', borderRadius: 9, border: '1px solid oklch(28% 0.04 268)' }}>
    {options.map(o => (
      <button key={o.v} onClick={() => onChange(o.v)} style={{ flex: 1, height: 30, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: value === o.v ? (o.gold ? 'linear-gradient(180deg,var(--gold-400),var(--gold-600))' : 'var(--indigo-500)') : 'transparent', color: value === o.v ? (o.gold ? 'oklch(24% 0.06 85)' : '#fff') : 'oklch(72% 0.03 268)' }}>{o.icon && <Icon name={o.icon} size={13} />}{o.l}</button>
    ))}
  </div>
);
const RailGroup = ({ label, children }) => (<div style={{ marginBottom: 16 }}><Cap style={{ marginBottom: 8 }}>{label}</Cap>{children}</div>);
const RailNav = ({ active, icon, label, sub, onClick }) => (
  <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, marginBottom: 4, cursor: 'pointer', textAlign: 'left', border: active ? '1px solid color-mix(in oklab, var(--gold-500) 40%, transparent)' : '1px solid transparent', background: active ? 'color-mix(in oklab, var(--gold-500) 12%, transparent)' : 'transparent', color: active ? 'var(--gold-200)' : 'oklch(80% 0.03 268)' }}>
    <Icon name={icon} size={17} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{label}</div><div style={{ fontSize: 10.5, color: 'oklch(56% 0.03 268)' }}>{sub}</div></div>
  </button>
);

const App = () => {
  const [feature, setFeature] = React.useState('affiliate');
  const [screen, setScreen] = React.useState('invite');
  const [view, setView] = React.useState('mobile');
  const [theme, setTheme] = React.useState('dark');
  const [populated, setPopulated] = React.useState(true);
  const [board3, setBoard3] = React.useState('populated');
  const [paused, setPaused] = React.useState(false);
  const [bonusOn, setBonusOn] = React.useState(true);
  const [resolved, setResolved] = React.useState(false);
  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const pickFeature = (f) => { setFeature(f); setScreen(FEATURES[f].screens[0][0]); };
  const isAdmin = ADMIN_SCREENS[screen];
  const wide = view === 'desktop';
  const state = { populated, paused, bonusOn, resolved, board3 };

  let stage;
  if (isAdmin) {
    stage = wide
      ? <FitStage w={1280} h={840}><Frame w={1280} h={840}><AdminWrap screen={screen} state={state} setPaused={setPaused} wide /></Frame></FitStage>
      : <FitStage w={393} h={820}><Frame w={393} h={820} radius={36}><AdminWrap screen={screen} state={state} setPaused={setPaused} wide={false} /></Frame></FitStage>;
  } else if (wide) {
    stage = <FitStage w={1280} h={840}><Frame w={1280} h={840}><DesktopPlayer screen={screen} state={state} /></Frame></FitStage>;
  } else {
    stage = <FitStage w={393} h={820}><MobilePlayer screen={screen} state={state} /></FitStage>;
  }

  const showData = screen === 'invite';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'oklch(12% 0.03 268)', overflow: 'hidden' }}>
      <div style={{ width: 282, flexShrink: 0, borderRight: '1px solid oklch(26% 0.04 268)', background: 'oklch(15% 0.035 268)', padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 14 }}><FiftyLockup size={22} color="oklch(97% 0.012 268)" /></div>

        <RailGroup label="Feature">
          <Seg2 value={feature} onChange={pickFeature} options={[{ v: 'affiliate', l: 'Affiliate' }, { v: 'proposals', l: 'Proposals' }]} />
        </RailGroup>

        <RailGroup label={FEATURES[feature].sub + ' · screens'}>
          {FEATURES[feature].screens.map(([id, icon, label, sub]) => (
            <RailNav key={id} active={screen === id} icon={icon} label={label} sub={sub} onClick={() => setScreen(id)} />
          ))}
        </RailGroup>

        <div style={{ height: 1, background: 'oklch(26% 0.04 268)', margin: '4px 0 16px' }} />
        <RailGroup label="Viewport"><Seg2 value={view} onChange={setView} options={[{ v: 'mobile', l: 'Mobile' }, { v: 'desktop', l: 'Desktop' }]} /></RailGroup>
        <RailGroup label="Theme"><Seg2 value={theme} onChange={setTheme} options={[{ v: 'dark', l: 'Dark', icon: 'moon' }, { v: 'light', l: 'Light', icon: 'sun' }]} /></RailGroup>
        <RailGroup label={isAdmin ? 'Program (master switch)' : 'Program state'}><Seg2 value={paused ? 'p' : 'a'} onChange={v => setPaused(v === 'p')} options={[{ v: 'a', l: 'Active' }, { v: 'p', l: 'Paused', icon: 'pause' }]} /></RailGroup>
        {showData && <RailGroup label="Data state"><Seg2 value={populated ? 'p' : 'e'} onChange={v => setPopulated(v === 'p')} options={[{ v: 'e', l: 'Empty' }, { v: 'p', l: 'Populated' }]} /></RailGroup>}
        {screen === 'board' && <RailGroup label="Data state"><Seg2 value={board3} onChange={setBoard3} options={[{ v: 'empty', l: 'Empty' }, { v: 'loading', l: 'Loading' }, { v: 'populated', l: 'Full' }]} /></RailGroup>}
        {screen === 'register' && <RailGroup label="Sign-up bonus"><Seg2 value={bonusOn ? 'on' : 'off'} onChange={v => setBonusOn(v === 'on')} options={[{ v: 'off', l: 'Off' }, { v: 'on', l: 'On', gold: true }]} /></RailGroup>}
        {screen === 'detail' && <RailGroup label="Proposal state"><Seg2 value={resolved ? 'r' : 'u'} onChange={v => setResolved(v === 'r')} options={[{ v: 'u', l: 'Under review' }, { v: 'r', l: 'Resolved', gold: true }]} /></RailGroup>}

        <div style={{ marginTop: 'auto', paddingTop: 16, fontSize: 10.5, color: 'oklch(56% 0.03 268)', lineHeight: 1.6 }}>
          <div style={{ color: 'oklch(70% 0.03 268)', fontWeight: 600, marginBottom: 6 }}>Brand rules</div>
          Gold = every primary CTA + money received · Indigo = chrome · Claret = danger/declined · YES-green / NO-red = betting only · vote arrows neutral/gold · mono TZS · EN + SW.
        </div>
      </div>
      {stage}
    </div>
  );
};

const Frame = ({ w, h, radius = 14, children }) => (
  <div style={{ width: w, height: h, borderRadius: radius, overflow: 'hidden', border: '1px solid oklch(28% 0.04 268)', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.7)' }}>{children}</div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
