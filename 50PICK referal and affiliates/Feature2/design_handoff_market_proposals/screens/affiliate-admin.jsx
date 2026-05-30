/* 50pick.tz — Affiliate · ADMIN (/admin/affiliate).
   Presented as kit-style admin content cards (cf. AdminMarketsSpecimen).
   Master toggle · 3 reward-mode configs · KPIs · payout ledger · leaderboard ·
   compliance note. Primary actions = teal (kit). Money figures = gold. */

// Toggle switch — gold when on for the master money-lever, indigo for sub-toggles.
// Flagged: the only genuinely-new atom (kit has no switch).
const Toggle = ({ on, onClick, gold }) => (
  <button role="switch" aria-checked={on} onClick={onClick} style={{
    position: 'relative', width: 46, height: 26, borderRadius: 999, cursor: 'pointer', flexShrink: 0,
    border: '1px solid ' + (on ? (gold ? 'var(--gold-700)' : 'var(--indigo-500)') : 'var(--border-strong)'),
    background: on ? (gold ? 'linear-gradient(180deg, var(--gold-400), var(--gold-600))' : 'var(--indigo-500)') : 'var(--bg-overlay)', transition: 'all var(--ease-stage)',
  }}>
    <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: on ? (gold ? 'oklch(24% 0.06 85)' : 'white') : 'var(--text-subtle)', transition: 'all var(--ease-stage)' }} />
  </button>
);

const Field = ({ label, hint, prefix, suffix, value, w }) => (
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

const Seg = ({ options, value, onChange }) => (
  <div style={{ display: 'inline-flex', gap: 3, padding: 3, background: 'var(--bg-overlay)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
    {options.map(o => (
      <button key={o.v} onClick={() => onChange(o.v)} style={{ height: 28, padding: '0 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, background: value === o.v ? 'var(--indigo-500)' : 'transparent', color: value === o.v ? '#fff' : 'var(--text-muted)' }}>{o.l}</button>
    ))}
  </div>
);

const RewardCard = ({ icon, title, sw, desc, on, onToggle, disabled, children }) => (
  <div style={{ background: 'var(--bg-elevated)', border: '1px solid ' + (on && !disabled ? 'color-mix(in oklab, var(--indigo-500) 30%, var(--border))' : 'var(--border)'), borderRadius: 'var(--r-lg)', overflow: 'hidden', opacity: disabled ? 0.5 : 1, transition: 'opacity var(--ease-stage)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: on ? '1px solid var(--border)' : 'none', background: on && !disabled ? 'var(--bg-overlay)' : 'transparent' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: on && !disabled ? 'color-mix(in oklab, var(--indigo-500) 18%, transparent)' : 'var(--bg-overlay)', color: on && !disabled ? 'var(--indigo-300)' : 'var(--text-muted)' }}><Icon name={icon} size={19} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{title} <span style={{ fontStyle: 'italic', color: 'var(--text-subtle)', fontWeight: 400, fontSize: 12 }}>· {sw}</span></div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
      </div>
      <Toggle on={on} onClick={onToggle} />
    </div>
    {on && <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>{children}</div>}
  </div>
);

const AdminAffiliate = ({ paused = false, setPaused, wide = true }) => {
  const on = !paused;
  const [commission, setCommission] = React.useState(true);
  const [bonus, setBonus] = React.useState(true);
  const [prize, setPrize] = React.useState(true);
  const [who, setWho] = React.useState('both');
  const [trigger, setTrigger] = React.useState('first_deposit');
  const [milestone, setMilestone] = React.useState('first_bet');

  const kpis = [
    ['Total referrals', '1,284', '+96 this week', false],
    ['Active affiliates', '342', 'earned in last 30d', false],
    ['Commission paid', '4.82M', 'TZS · all-time', true],
    ['Top referrer', '@asha_m', '48 recruits', true],
  ];
  const ledger = [
    ['@asha_m', 'Ju***s M.', 'Commission', '8,400', '28 May', 'paid'],
    ['@bekka', 'Ne***a K.', 'Prize · first bet', '5,000', '28 May', 'paid'],
    ['@john_d', 'Em***l T.', 'Bonus · deposit', '2,000', '27 May', 'pending'],
    ['@asha_m', 'Ba***i R.', 'Commission', '12,600', '27 May', 'paid'],
    ['@fatma', 'Ra***d S.', 'Prize · first bet', '5,000', '26 May', 'paid'],
    ['@john_d', 'Wi***y O.', 'Bonus · sign-up', '2,000', '26 May', 'held'],
  ];
  const board = [['@asha_m', 48, '184,200'], ['@john_d', 31, '121,800'], ['@bekka', 27, '98,400'], ['@fatma', 19, '64,100']];
  const stChip = { paid: 'resolved', pending: 'pending', held: 'objection' };
  const C = { padding: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' };

  return (
    <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text)' }}>
      {/* Head */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="display" style={{ fontSize: 24, fontWeight: 700 }}>Affiliate Program</div>
            <StatusPill paused={paused} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Referral rewards · <span style={{ fontStyle: 'italic' }}>Mpango wa marafiki</span> · /admin/affiliate</div>
        </div>
        <Btn variant="gold" size="md" leadingIcon={<Icon name="check" size={15} />}>Save · Hifadhi</Btn>
      </div>

      {/* Master toggle */}
      <div style={{ ...C, display: 'flex', alignItems: 'center', gap: 16, borderColor: on ? 'color-mix(in oklab, var(--indigo-500) 28%, var(--border))' : 'color-mix(in oklab, var(--warning-500) 36%, var(--border))', background: on ? 'var(--bg-elevated)' : 'color-mix(in oklab, var(--warning-500) 8%, var(--bg-elevated))' }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center', background: on ? 'color-mix(in oklab, var(--indigo-500) 18%, transparent)' : 'color-mix(in oklab, var(--warning-500) 20%, transparent)', color: on ? 'var(--indigo-300)' : 'oklch(84% 0.15 80)' }}><Icon name={on ? 'megaphone' : 'pause'} size={23} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Program master switch · <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 13, color: 'var(--text-subtle)' }}>Swichi kuu</span></div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{on ? 'Live — every player has an active referral link and rewards are accruing.' : 'Paused — links still resolve, but no new rewards accrue. Players see a paused banner.'}</div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: on ? 'var(--gold-300)' : 'oklch(84% 0.15 80)' }}>{on ? 'ON' : 'PAUSED'}</span>
        <Toggle on={on} gold onClick={() => setPaused && setPaused(!paused)} />
      </div>

      {/* KPIs — shared <Kpi> tile (= existing AdminKpi) */}
      <div style={{ display: 'grid', gridTemplateColumns: wide ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 12 }}>
        {kpis.map(([l, v, s, g], i) => <Kpi key={i} label={l} value={v} sub={s} gold={g} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: wide ? '1.6fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Reward modes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>Reward modes · independently toggleable · Njia za zawadi</div>
          <RewardCard icon="percent" title="Commission" sw="Tume" desc="Referrer earns a share of the operator margin their recruits generate." on={commission} onToggle={() => setCommission(!commission)} disabled={!on}>
            <Field label="Commission rate" hint="Share of operator margin" prefix="%" value="50" w={140} />
            <Field label="Window" hint="How long it accrues" value="24" suffix="months" w={130} />
            <Field label="Per-recruit cap" hint="Max earnable per recruit" prefix="TZS" value="250,000" w={170} />
          </RewardCard>
          <RewardCard icon="gift" title="Bonus / discount" sw="Bonasi" desc="Sign-up or first-deposit credit to the new player and/or referrer." on={bonus} onToggle={() => setBonus(!bonus)} disabled={!on}>
            <div style={{ width: '100%' }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Who gets it</div><Seg value={who} onChange={setWho} options={[{ v: 'new', l: 'New player' }, { v: 'referrer', l: 'Referrer' }, { v: 'both', l: 'Both' }]} /></div>
            <Field label="New-player amount" prefix="TZS" value="2,000" w={160} />
            <Field label="Referrer amount" prefix="TZS" value="2,000" w={160} />
            <div style={{ width: '100%' }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Trigger</div><Seg value={trigger} onChange={setTrigger} options={[{ v: 'signup', l: 'Sign-up' }, { v: 'first_deposit', l: 'First deposit' }]} /></div>
          </RewardCard>
          <RewardCard icon="ticket" title="Prize" sw="Tuzo" desc="A fixed reward when a recruit hits a milestone." on={prize} onToggle={() => setPrize(!prize)} disabled={!on}>
            <div style={{ width: '100%' }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Milestone</div><Seg value={milestone} onChange={setMilestone} options={[{ v: 'first_bet', l: 'First bet' }, { v: 'deposit', l: 'Deposits ≥ threshold' }]} /></div>
            {milestone === 'deposit' && <Field label="Deposit threshold" prefix="TZS" value="10,000" w={170} />}
            <Field label="Fixed prize" prefix="TZS" value="5,000" w={150} />
            <Field label="Cap per player" hint="Max prizes a referrer can earn" value="20" suffix="prizes" w={180} />
          </RewardCard>
        </div>

        {/* Compliance + leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...C, borderColor: 'color-mix(in oklab, var(--no-500) 28%, var(--border))', background: 'color-mix(in oklab, var(--no-500) 6%, var(--bg-elevated))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: 'var(--no-300)' }}><Icon name="shield" size={16} /></span>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--no-300)' }}>Compliance note · Kumbuka</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>This is a regulated inducement. Surface any &ldquo;program is dark / limited&rdquo; messaging for staff here.</div>
            <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;Inducement caps apply per BMU guidance. Keep referrer commission &le; 50% of margin. Review quarterly.&rdquo;</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Referral leaderboard</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>Top affiliates</span>
            </div>
            {board.map(([h, n, e], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderBottom: i < board.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 700, width: 22, color: i === 0 ? 'var(--gold-400)' : 'var(--text-subtle)' }}>{String(i + 1).padStart(2, '0')}</span>
                <Avatar initials={h.slice(1, 3).toUpperCase()} size="sm" hue={(i * 50) % 360} />
                <div className="mono" style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{h}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{n} recruits</div>
                <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gold-300)', width: 80, textAlign: 'right' }}>{e}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div style={{ ...{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Payout ledger · <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 12, color: 'var(--text-subtle)' }}>Daftari la malipo</span></div>
          <Btn variant="ghost" size="sm" leadingIcon={<Icon name="external" size={13} />}>Export</Btn>
        </div>
        <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 620 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr 1fr 0.9fr 0.9fr', gap: 12, padding: '9px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
          <span>Referrer</span><span>Recruit</span><span>Type</span><span style={{ textAlign: 'right' }}>Amount</span><span>Date</span><span>Status</span>
        </div>
        {ledger.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr 1fr 0.9fr 0.9fr', gap: 12, padding: '12px 18px', borderBottom: i < ledger.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', fontSize: 12.5 }}>
            <span className="mono" style={{ fontWeight: 600 }}>{r[0]}</span>
            <span className="mono" style={{ color: 'var(--text-muted)' }}>{r[1]}</span>
            <span style={{ color: 'var(--text-muted)' }}>{r[2]}</span>
            <span className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold-300)' }}>{r[3]}</span>
            <span className="mono" style={{ color: 'var(--text-subtle)' }}>{r[4]}</span>
            <span><Chip variant={stChip[r[5]]}>{r[5]}</Chip></span>
          </div>
        ))}
        </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AdminAffiliate, Toggle });
