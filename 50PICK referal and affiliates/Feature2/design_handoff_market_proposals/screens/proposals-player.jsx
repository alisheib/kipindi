/* 50pick.tz — Feature 2 · Player Market Proposals · BOARD (2.1) + entry helpers.
   Kit components + brand: GOLD = primary CTA + prize money · INDIGO = chrome ·
   CLARET = declined/danger · vote arrows are NEUTRAL/GOLD (not YES/NO betting colours). */

const PRIZE = 20000;
const cardP = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' };

// Status badge — kit chip system (gold / indigo / pending / claret); never betting-green/red
const StatusBadge = ({ status }) => {
  const map = {
    hot:      ['resolved', 'flame', 'Hot'],
    listed:   ['active', 'check', 'Listed'],
    resolved: ['resolved', 'trophy', 'Resolved'],
    review:   ['pending', 'clock', 'Under review'],
    declined: ['claret', 'xCircle', 'Declined'],
  };
  const [variant, icon, label] = map[status] || ['neutral', 'doc', status];
  return <span className={`chip chip-${variant}`}><Icon name={icon} size={12} />{label}</span>;
};

// Vote control — idle / up / down. Arrows neutral; up = gold, down = claret. Not a YES/NO bet.
const VoteControl = ({ score, vote, onVote, horizontal }) => {
  const upColor = vote === 'up' ? 'var(--gold-300)' : 'var(--text-subtle)';
  const downColor = vote === 'down' ? 'var(--claret-300)' : 'var(--text-subtle)';
  const scoreColor = vote === 'up' ? 'var(--gold-300)' : vote === 'down' ? 'var(--claret-300)' : 'var(--text)';
  const btn = (dir, color) => (
    <button onClick={(e) => { e.stopPropagation(); onVote(vote === dir ? null : dir); }}
      aria-label={dir === 'up' ? 'Upvote proposal' : 'Downvote proposal'} aria-pressed={vote === dir}
      style={{ width: 36, height: 34, display: 'grid', placeItems: 'center', border: 'none', background: (vote === dir) ? (dir === 'up' ? 'color-mix(in oklab, var(--gold-500) 18%, transparent)' : 'color-mix(in oklab, var(--claret-500) 18%, transparent)') : 'transparent', color, borderRadius: 7, cursor: 'pointer', transition: 'background var(--ease-micro), color var(--ease-micro)' }}>
      <Icon name={dir === 'up' ? 'caretUp' : 'caretDown'} size={18} stroke={2.2} />
    </button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', alignItems: 'center', gap: 2, padding: 3, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      {btn('up', upColor)}
      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: scoreColor, minWidth: 22, textAlign: 'center' }}>{score + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0)}</span>
      {btn('down', downColor)}
    </div>
  );
};

const ProposalCard = ({ p, vote, onVote }) => {
  const [hover, setHover] = React.useState(false);
  return (
  <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    style={{ ...cardP, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', borderColor: hover ? 'color-mix(in oklab, var(--indigo-500) 45%, var(--border))' : 'var(--border)', transform: hover ? 'translateY(-2px)' : 'none', boxShadow: hover ? '0 10px 28px -16px rgba(0,0,0,0.6)' : 'none', transition: 'transform var(--ease-stage), border-color var(--ease-stage), box-shadow var(--ease-stage)' }}>
    <VoteControl score={p.score} vote={vote} onVote={onVote} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
        <StatusBadge status={p.status} />
        <span className="chip chip-neutral"><Icon name={p.catIcon} size={12} />{p.category}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-subtle)' }}>{p.age}</span>
      </div>
      <div className="display" style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em' }}>{p.title}</div>
      <div className="sw" style={{ fontSize: 11.5, marginTop: 2 }}>{p.titleSw}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>{p.desc}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
        <span>by {p.by}</span>
        {p.status === 'listed' && <span style={{ color: 'var(--indigo-200)', display: 'flex', alignItems: 'center', gap: 4 }}>View market <Icon name="arrowR" size={12} /></span>}
        {p.status === 'resolved' && <span style={{ color: 'var(--gold-300)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="coins" size={12} /> +{PRIZE.toLocaleString()} earned</span>}
        <Icon name="chevron" size={14} style={{ marginLeft: 'auto', color: hover ? 'var(--indigo-200)' : 'var(--text-subtle)' }} />
      </div>
    </div>
  </div>
  );
};

const FILTERS = [['hot', 'Hot'], ['new', 'New'], ['listed', 'Listed'], ['mine', 'Mine']];

const PROPOSALS = [
  { id: 1, status: 'hot', category: 'Sports', catIcon: 'sports', age: '2d ago · siku 2', score: 312, by: 'Ju***s M.', title: 'Will Simba SC win the Mainland Premier League?', titleSw: 'Je, Simba SC watashinda Ligi Kuu?', desc: 'Resolves from the official TPL final standings at season end.' },
  { id: 2, status: 'hot', category: 'Weather', catIcon: 'weather', age: '1d ago · siku 1', score: 268, by: 'Ne***a K.', title: 'Will Dar es Salaam hit 35°C before 15 June?', titleSw: 'Je, Dar itafika 35°C kabla ya tarehe 15?', desc: 'Resolves YES if TMA records ≥35°C at the Dar station before the date.' },
  { id: 3, status: 'listed', category: 'Macro', catIcon: 'macro', age: '4d ago · siku 4', score: 154, by: 'Ba***i R.', title: 'Will the BoT hold the rate at the next MPC meeting?', titleSw: 'Je, BoT itashikilia riba?', desc: 'Now live as a market — resolves from the official BoT statement.' },
  { id: 4, status: 'review', category: 'Culture', catIcon: 'culture', age: '6h ago · saa 6', score: 47, by: 'You · Wewe', mine: true, title: 'Will Diamond release an album before December?', titleSw: 'Je, Diamond atatoa albamu kabla ya Desemba?', desc: 'Under officer review — needs a clear, sourceable resolution date.' },
  { id: 5, status: 'declined', category: 'Politics', catIcon: 'asterisk', age: '3d ago · siku 3', score: 12, by: 'You · Wewe', mine: true, title: 'Will a specific candidate win a local seat?', titleSw: 'Je, mgombea fulani atashinda?', desc: 'Declined — political outcomes are outside our jurisdiction.' },
];

// ── 2.1 PROPOSALS BOARD ─────────────────────────────────────────────────
const ProposalsBoard = ({ populated = true, loading = false, paused = false, wide = false }) => {
  const [filter, setFilter] = React.useState('hot');
  const [votes, setVotes] = React.useState({ 1: 'up', 2: null });
  const setVote = (id, v) => setVotes(s => ({ ...s, [id]: v }));
  const shown = PROPOSALS.filter(p => {
    if (filter === 'hot') return p.status === 'hot';
    if (filter === 'listed') return p.status === 'listed' || p.status === 'resolved';
    if (filter === 'mine') return p.mine;
    return true; // new = all, recency order
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Reward banner */}
      <div className="hero-dark" style={{ ...cardP, padding: 16, position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg, var(--bg-elevated), var(--indigo-950))' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--gold-500) 12%, transparent), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', gap: 13, alignItems: 'center', position: 'relative' }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))', color: 'oklch(24% 0.06 85)' }}><Icon name="trophy" size={23} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Propose & get paid · Pendekeza upate</div>
            <div style={{ fontSize: 12, color: 'var(--gold-300)', fontWeight: 600, marginTop: 2 }}>Earn TZS {PRIZE.toLocaleString()} for each proposal listed & resolved</div>
            <div className="sw" style={{ fontSize: 10.5 }}>Pata TZS {PRIZE.toLocaleString()} kwa kila pendekezo linalowekwa na kutatuliwa</div>
          </div>
          {wide && <Btn variant="gold" size="md" leadingIcon={<Icon name="plus" size={15} />}>Create · Pendekeza</Btn>}
        </div>
        {!wide && <Btn variant="gold" size="lg" style={{ width: '100%', marginTop: 12, position: 'relative' }} leadingIcon={<Icon name="plus" size={16} />}>Create proposal · Pendekeza</Btn>}
      </div>

      {/* Stats strip + filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{populated ? '128 proposals · 4,210 votes' : '0 proposals · 0 votes'}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{ height: 30, padding: '0 13px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, border: '1px solid ' + (filter === id ? 'color-mix(in oklab, var(--gold-500) 40%, transparent)' : 'var(--border)'), background: filter === id ? 'color-mix(in oklab, var(--gold-500) 14%, transparent)' : 'transparent', color: filter === id ? 'var(--gold-200)' : 'var(--text-muted)' }}>{label}</button>
          ))}
        </div>
      </div>

      {/* List / loading / empty */}
      {loading ? (
        <div style={{ display: wide ? 'grid' : 'flex', gridTemplateColumns: wide ? '1fr 1fr' : 'none', flexDirection: wide ? undefined : 'column', gap: 12 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ ...cardP, padding: 14, display: 'flex', gap: 12 }}>
              <Skeleton w={40} h={64} r={8} />
              <div style={{ flex: 1 }}>
                <Skeleton w="40%" h={12} /><div style={{ height: 8 }} />
                <Skeleton w="90%" h={14} /><div style={{ height: 6 }} />
                <Skeleton w="70%" h={12} />
              </div>
            </div>
          ))}
        </div>
      ) : populated ? (
        shown.length ? (
          <div style={{ display: wide ? 'grid' : 'flex', gridTemplateColumns: wide ? '1fr 1fr' : 'none', flexDirection: wide ? undefined : 'column', gap: 12 }}>
            {shown.map(p => <ProposalCard key={p.id} p={p} vote={votes[p.id] ?? null} onVote={(v) => setVote(p.id, v)} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-subtle)', fontSize: 13 }}>No proposals in <strong style={{ color: 'var(--text-muted)' }}>{FILTERS.find(f => f[0] === filter)[1]}</strong> yet · Hakuna bado</div>
        )
      ) : (
        <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 30, textAlign: 'center', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--indigo-300)' }}>
            <svg width="120" height="76" viewBox="0 0 120 76" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="14" y="14" width="92" height="20" rx="4"/><rect x="14" y="42" width="64" height="16" rx="4"/><path d="M96 40v16M88 48h16" stroke="var(--gold-400)"/></svg>
          </div>
          <Bi en="No proposals yet" sw="Bado hakuna mapendekezo" size={15} weight={700} />
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '8px auto 16px', lineHeight: 1.5, maxWidth: 300 }}>Be the first to propose a market. If it gets listed and resolved, you earn TZS {PRIZE.toLocaleString()}.</div>
          <Btn variant="gold" size="md" leadingIcon={<Icon name="plus" size={14} />}>Create proposal · Pendekeza</Btn>
        </div>
      )}
    </div>
  );
};

// ── 2.4 Entry points — Markets-page card + public footer link ───────────
const ProposalEntryCard = () => (
  <div style={{ ...cardP, padding: 16, display: 'flex', alignItems: 'center', gap: 14, borderColor: 'color-mix(in oklab, var(--gold-500) 30%, var(--border))', background: 'color-mix(in oklab, var(--gold-500) 6%, var(--bg-elevated))', cursor: 'pointer' }}>
    <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))', color: 'oklch(24% 0.06 85)' }}><Icon name="trophy" size={22} /></div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>Propose Markets & Get Paid</div>
      <div className="sw" style={{ fontSize: 11.5 }}>Pendekeza soko · pata TZS {PRIZE.toLocaleString()}</div>
    </div>
    <Icon name="arrowR" size={18} style={{ color: 'var(--gold-300)' }} />
  </div>
);

const ProposalFooterLink = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 16px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
    <Icon name="trophy" size={15} style={{ color: 'var(--gold-400)' }} />
    <span>Propose Markets & Get Paid · <span className="sw">Pendekeza soko</span></span>
  </div>
);

Object.assign(window, { ProposalsBoard, ProposalCard, VoteControl, StatusBadge, ProposalEntryCard, ProposalFooterLink, PROPOSALS, PRIZE });
