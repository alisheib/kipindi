/* 50pick.tz — Feature 2 · ADMIN proposal review queue (/admin/proposals).
   Lives in the Markets group beside "AI candidates" — same officer-review muscle.
   Votes only rank/sort; the officer always decides. Approve = gold. */

const C2 = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' };
const DECLINE_REASONS = ['Politics', 'Ambiguous outcome', 'No official source', 'Duplicate', 'Past resolution', 'Outside jurisdiction', 'Officer decision'];

const QUEUE = [
  { id: 1, title: 'Will Simba SC win the Mainland Premier League?', by: 'Ju***s M.', cat: 'Sports', up: 318, down: 6, age: '2d', status: 'review' },
  { id: 2, title: 'Will Dar es Salaam hit 35°C before 15 June?', by: 'Ne***a K.', cat: 'Weather', up: 274, down: 8, age: '1d', status: 'review' },
  { id: 3, title: 'Will BTC close above $90k on 30 June?', by: 'Ke***i L.', cat: 'Crypto', up: 142, down: 21, age: '3d', status: 'review' },
  { id: 4, title: 'Will Diamond release an album before December?', by: 'Em***l T.', cat: 'Culture', up: 47, down: 9, age: '6h', status: 'review' },
  { id: 5, title: 'Will a specific candidate win a local seat?', by: 'An***n', cat: 'Politics', up: 12, down: 40, age: '3d', status: 'flag' },
];

// compact config field
const AField = ({ label, hint, prefix, suffix, value, w }) => (
  <div style={{ width: w }}>
    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}</div>
    <div className="input-group" style={{ height: 38 }}>
      {prefix && <span className="prefix">{prefix}</span>}
      <input className="input input-mono" defaultValue={value} style={{ fontSize: 13 }} />
      {suffix && <span style={{ paddingRight: 12, color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{suffix}</span>}
    </div>
    {hint && <div style={{ fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 5 }}>{hint}</div>}
  </div>
);

const AdminProposals = ({ paused = false, setPaused, wide = true }) => {
  const on = !paused;
  const [sel, setSel] = React.useState(1);
  const [declining, setDeclining] = React.useState(false);
  const [reason, setReason] = React.useState(null);
  const p = QUEUE.find(q => q.id === sel) || QUEUE[0];
  const kpis = [['Proposals pending', '23', '+5 today', false], ['Listed from proposals', '41', 'all-time', false], ['Prizes paid', '820K', 'TZS · all-time', true], ['Top proposer', '@asha_m', '7 listed', true]];

  const ReviewPanel = () => (
    <div style={{ ...C2, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <StatusBadge status={p.status === 'flag' ? 'declined' : 'review'} />
          <span className="chip chip-neutral">{p.cat}</span>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-subtle)' }}>{p.age} ago · by {p.by}</span>
        </div>
        <div className="display" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{p.title}</div>
      </div>

      {/* Vote stats — rank only, officer decides */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[['Upvotes', p.up, 'var(--gold-300)', 'caretUp'], ['Downvotes', p.down, 'var(--claret-300)', 'caretDown'], ['Score', p.up - p.down, 'var(--text)', 'chart']].map(([l, v, c, ic]) => (
          <div key={l} style={{ flex: 1, padding: 12, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)' }}>
            <div className="caps" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name={ic} size={12} />{l}</div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: c, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="info" size={13} />Votes only rank the queue — the officer makes the final call.</div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {!declining ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="gold" size="md" leadingIcon={<Icon name="checkCircle" size={15} />}>Approve &amp; list · Orodhesha</Btn>
          <Btn variant="ghost" size="md" leadingIcon={<Icon name="edit" size={15} />}>Request changes</Btn>
          <Btn variant="ghost" size="md" style={{ color: 'var(--claret-300)', borderColor: 'color-mix(in oklab, var(--claret-500) 34%, transparent)' }} leadingIcon={<Icon name="xCircle" size={15} />} onClick={() => setDeclining(true)}>Decline</Btn>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Decline reason · Sababu</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {DECLINE_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{ height: 30, padding: '0 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, border: '1px solid ' + (reason === r ? 'color-mix(in oklab, var(--claret-500) 44%, transparent)' : 'var(--border)'), background: reason === r ? 'color-mix(in oklab, var(--claret-500) 16%, transparent)' : 'transparent', color: reason === r ? 'var(--claret-300)' : 'var(--text-muted)' }}>{r}</button>
            ))}
          </div>
          <textarea placeholder="Optional note to the proposer (logged) · Ujumbe kwa mtoa pendekezo" style={{ width: '100%', minHeight: 56, padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, resize: 'none', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="md" onClick={() => { setDeclining(false); setReason(null); }}>Cancel</Btn>
            <Btn variant="danger" size="md" style={{ flex: 1 }} disabled={!reason}>Confirm decline{reason ? ` · ${reason}` : ''}</Btn>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text)' }}>
      {/* Head */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="display" style={{ fontSize: 24, fontWeight: 700 }}>Market Proposals</div>
            <StatusPill paused={paused} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Review queue · <span className="sw">Foleni ya ukaguzi</span> · /admin/proposals</div>
        </div>
        <Btn variant="gold" size="md" leadingIcon={<Icon name="check" size={15} />}>Save · Hifadhi</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: wide ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 12 }}>
        {kpis.map(([l, v, s, g], i) => <Kpi key={i} label={l} value={v} sub={s} gold={g} />)}
      </div>

      {/* Queue + review */}
      <div style={{ display: 'grid', gridTemplateColumns: wide ? '1.3fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ ...C2, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Queue · sorted by votes</div>
            <div style={{ display: 'flex', gap: 6 }}>{['All', 'Review', 'Flagged'].map((f, i) => <span key={f} className={`chip ${i === 1 ? 'chip-pending' : 'chip-neutral'}`}>{f}</span>)}</div>
          </div>
          {[...QUEUE].sort((a, b) => (b.up - b.down) - (a.up - a.down)).map((q, i) => {
            const active = q.id === sel;
            return (
              <button key={q.id} onClick={() => { setSel(q.id); setDeclining(false); setReason(null); }} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: 'none', borderBottom: i < QUEUE.length - 1 ? '1px solid var(--border)' : 'none', borderLeft: '3px solid ' + (active ? 'var(--gold-500)' : 'transparent'), background: active ? 'color-mix(in oklab, var(--gold-500) 8%, transparent)' : 'transparent', cursor: 'pointer' }}>
                <div className="mono" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: q.up - q.down >= 0 ? 'var(--gold-300)' : 'var(--claret-300)' }}>{q.up - q.down}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-subtle)' }}>net</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 2 }}>{q.cat} · {q.by} · {q.age} ago</div>
                </div>
                <StatusBadge status={q.status === 'flag' ? 'declined' : 'review'} />
              </button>
            );
          })}
        </div>
        <ReviewPanel />
      </div>

      {/* Config block */}
      <div style={{ ...C2, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: on ? 'transparent' : 'color-mix(in oklab, var(--warning-500) 8%, transparent)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: on ? 'color-mix(in oklab, var(--gold-500) 16%, transparent)' : 'color-mix(in oklab, var(--warning-500) 20%, transparent)', color: on ? 'var(--gold-300)' : 'oklch(84% 0.15 80)' }}><Icon name={on ? 'trophy' : 'pause'} size={21} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Proposals feature · master switch</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{on ? 'Live — players can submit and vote on proposals.' : 'Paused — the board is read-only; no new submissions.'}</div>
          </div>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: on ? 'var(--gold-300)' : 'oklch(84% 0.15 80)' }}>{on ? 'ON' : 'PAUSED'}</span>
          <Toggle on={on} gold onClick={() => setPaused && setPaused(!paused)} />
        </div>
        <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <AField label="Listing + resolution prize" hint="Paid when listed AND resolved" prefix="TZS" value="20,000" w={190} />
          <AField label="“Hot” vote threshold" hint="Net votes to flag as Hot" value="200" suffix="votes" w={170} />
          <AField label="Rate limit" hint="Max open proposals per player" value="3" suffix="open" w={170} />
        </div>
      </div>
    </div>
  );
};

window.AdminProposals = AdminProposals;
