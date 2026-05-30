/* 50pick.tz — Feature 2 · Player · Create (2.2) + Detail (2.3) + Notifications (2.4). */

const cardC2 = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' };
const CATS = [['sports', 'Sports'], ['macro', 'Macro'], ['weather', 'Weather'], ['crypto', 'Crypto'], ['culture', 'Culture'], ['tech', 'Infrastructure']];

// OperationResultModal — kit win-crest pattern (gold). Success/failure confirmation.
const OperationResultModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in oklab, var(--bg-deep) 70%, transparent)', backdropFilter: 'blur(3px)' }}>
      <div style={{ ...cardC2, borderColor: 'var(--gold-700)', padding: 28, width: 340, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 0 40px -8px color-mix(in oklab, var(--gold-500) 30%, transparent)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold-700) 16%, transparent))', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-700))', display: 'grid', placeItems: 'center', color: 'oklch(20% 0.05 80)' }}><Icon name="check" size={28} stroke={2.6} /></div>
          <div className="caps" style={{ color: 'var(--gold-300)', marginBottom: 6 }}>Submitted · Imewasilishwa</div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Proposal received</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>An officer will review it shortly. If it&rsquo;s listed and resolved, you earn TZS {PRIZE.toLocaleString()}. <span className="sw">Tutakujulisha.</span></div>
          <Btn variant="gold" size="lg" style={{ width: '100%' }} onClick={onClose}>Done · Sawa</Btn>
        </div>
      </div>
    </div>
  );
};

// ── 2.2 CREATE A PROPOSAL ───────────────────────────────────────────────
const CreateProposal = ({ wide = false }) => {
  const [cat, setCat] = React.useState('sports');
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [crit, setCrit] = React.useState('');
  const [date, setDate] = React.useState('');
  const valid = title.trim().length > 6 && crit.trim().length > 8 && /\d{4}-\d{2}-\d{2}/.test(date);
  const req = <span style={{ color: 'var(--claret-300)' }}>*</span>;
  const ta = { width: '100%', minHeight: 76, padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, resize: 'none', lineHeight: 1.5 };
  return (
    <div style={{ maxWidth: wide ? 560 : 'none', margin: wide ? '0 auto' : 0, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
      {/* Guidelines panel */}
      <div style={{ ...cardC2, padding: 14, borderColor: 'color-mix(in oklab, var(--indigo-500) 30%, var(--border))', background: 'color-mix(in oklab, var(--indigo-500) 8%, var(--bg-elevated))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: 'var(--indigo-200)' }}><Icon name="info" size={16} /></span>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo-200)' }}>What makes a good proposal · Mwongozo</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Good proposals are specific, have a clear yes/no answer, and a trustworthy source. Politics and ambiguous outcomes are declined. <span className="sw">Maswali ya wazi yenye chanzo cha kuaminika.</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}><Icon name="info" size={13} style={{ color: 'var(--gold-400)' }} /><span className="mono">2 of 3</span> open proposals used · <span className="sw">mapendekezo 2 kati ya 3</span></div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><Cap>Title (EN) · Kichwa {req}</Cap><span className="mono" style={{ fontSize: 10, color: title.length > 80 ? 'var(--claret-300)' : 'var(--text-subtle)' }}>{title.length}/80</span></div>
        <Input placeholder="Will [event] happen by [date]?" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <Cap style={{ marginBottom: 6 }}>Title (SW, optional) · Kichwa kwa Kiswahili</Cap>
        <Input placeholder="Je, [tukio] litatokea kabla ya [tarehe]?" />
      </div>
      <div>
        <Cap style={{ marginBottom: 6 }}>Why it matters · Maelezo</Cap>
        <textarea style={ta} placeholder="One or two lines on why people would want to predict this." />
      </div>
      <div>
        <Cap style={{ marginBottom: 6 }}>Resolution criterion · Vigezo vya utatuzi {req}</Cap>
        <textarea style={ta} placeholder="How will we know the answer? Name the official source." value={crit} onChange={e => setCrit(e.target.value)} />
        <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 5, lineHeight: 1.4 }}>Be precise — e.g. &ldquo;Resolves YES if TMA records ≥35°C at the Dar station before 15 June.&rdquo;</div>
      </div>
      <div>
        <Cap style={{ marginBottom: 8 }}>Category · Aina</Cap>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATS.map(([id, label]) => (
            <button key={id} onClick={() => setCat(id)} style={{ height: 34, padding: '0 13px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid ' + (cat === id ? 'color-mix(in oklab, var(--gold-500) 40%, transparent)' : 'var(--border)'), background: cat === id ? 'color-mix(in oklab, var(--gold-500) 14%, transparent)' : 'transparent', color: cat === id ? 'var(--gold-200)' : 'var(--text-muted)' }}>
              <Icon name={id === 'tech' ? 'tech' : id} size={14} />{label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Cap style={{ marginBottom: 6 }}>Resolution date · Tarehe ya utatuzi {req}</Cap>
        <div className="input-group">
          <span className="prefix"><Icon name="calendar" size={14} /></span>
          <input className="input input-mono" placeholder="2026-06-15" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <Btn variant="gold" size="lg" style={{ width: '100%', marginTop: 2 }} disabled={!valid} onClick={() => setOpen(true)}>Submit proposal · Wasilisha</Btn>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', lineHeight: 1.5 }}>Submitting doesn&rsquo;t guarantee listing — an officer makes the final call.</div>

      <OperationResultModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

// Status timeline — Submitted → Under review → Listed → Resolved → Paid
const StatusTimeline = ({ current }) => {
  const steps = [['Submitted', 'Imewasilishwa'], ['Under review', 'Inakaguliwa'], ['Listed', 'Imeorodheshwa'], ['Resolved', 'Imetatuliwa'], ['Paid', 'Imelipwa']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map(([en, sw], i) => {
        const done = i < current, now = i === current;
        const c = done || now ? 'var(--gold-400)' : 'var(--bg-overlay)';
        return (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? 'linear-gradient(180deg, var(--gold-400), var(--gold-600))' : now ? 'color-mix(in oklab, var(--gold-500) 18%, transparent)' : 'var(--bg-overlay)', border: '1.5px solid ' + (done || now ? 'var(--gold-600)' : 'var(--border-strong)'), color: 'oklch(24% 0.06 85)' }}>
                {done && <Icon name="check" size={12} stroke={3} />}
                {now && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold-400)' }} />}
              </div>
              {i < steps.length - 1 && <div style={{ width: 2, height: 26, background: done ? 'var(--gold-600)' : 'var(--border)' }} />}
            </div>
            <div style={{ paddingTop: 1, paddingBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: now ? 700 : 600, color: done || now ? 'var(--text)' : 'var(--text-subtle)' }}>{en}</div>
              <div className="sw" style={{ fontSize: 11 }}>{sw}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── 2.3 PROPOSAL DETAIL ─────────────────────────────────────────────────
const ProposalDetail = ({ resolved = false, wide = false }) => {
  const [vote, setVote] = React.useState('up');
  const p = PROPOSALS[0];
  return (
    <div style={{ maxWidth: wide ? 620 : 'none', margin: wide ? '0 auto' : 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...cardC2, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <StatusBadge status={resolved ? 'resolved' : 'review'} />
          <span className="chip chip-neutral"><Icon name="sports" size={12} />Sports</span>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-subtle)' }}>2d ago · siku 2</span>
        </div>
        <div className="display" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>{p.title}</div>
        <div className="sw" style={{ fontSize: 12.5, marginTop: 3 }}>{p.titleSw}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <VoteControl score={p.score} vote={vote} onVote={setVote} horizontal />
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>by {p.by} · {p.score} votes</span>
        </div>
      </div>

      <div style={{ ...cardC2, padding: 16 }}>
        <Cap style={{ marginBottom: 8 }}>Resolution criterion · Vigezo</Cap>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Resolves from the official TPL final standings at season end. Source: tpl.co.tz.</div>
      </div>

      {resolved && (
        <div className="hero-dark" style={{ ...cardC2, borderColor: 'var(--gold-700)', padding: 20, textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, var(--bg-elevated), var(--indigo-950))' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold-700) 16%, transparent))', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ width: 48, height: 48, margin: '0 auto 12px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-700))', display: 'grid', placeItems: 'center', color: 'oklch(20% 0.05 80)' }}><Icon name="trophy" size={24} /></div>
            <div className="caps" style={{ color: 'var(--gold-300)', marginBottom: 6 }}>Your proposal resolved</div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>You earned a prize</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold-300)', margin: '6px 0' }}>+TZS {PRIZE.toLocaleString()}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Imelipwa · Paid to your wallet</div>
          </div>
        </div>
      )}

      <div style={{ ...cardC2, padding: 16 }}>
        <Cap style={{ marginBottom: 12 }}>Status · Hali</Cap>
        <StatusTimeline current={resolved ? 4 : 1} />
        {!resolved && <Btn variant="ghost" size="md" style={{ width: '100%', marginTop: 4 }}>Officer reviews next · Subiri ukaguzi</Btn>}
        {resolved && <Btn variant="gold" size="md" style={{ width: '100%', marginTop: 4 }} leadingIcon={<Icon name="arrowR" size={15} />}>View the resolved market</Btn>}
      </div>
    </div>
  );
};

// ── 2.4 Proposal notifications ──────────────────────────────────────────
const ProposalNotifications = ({ wide = false }) => (
  <div style={{ ...cardC2, overflow: 'hidden' }}>
    <NRow icon="clock" title="Your proposal is under review" body="&ldquo;Will Simba SC win the league?&rdquo; · Inakaguliwa." time="2h" unread />
    <NRow icon="check" title="Your proposal is now live" body="It&rsquo;s a market now — share it. · Sasa ni soko." time="1d" unread />
    <NRow icon="coins" gold title="Your proposal resolved — you earned TZS 20,000" body="Listed & resolved. Paid to your wallet. · Imelipwa." time="3d" last />
  </div>
);

Object.assign(window, { CreateProposal, ProposalDetail, ProposalNotifications, OperationResultModal, StatusTimeline });
