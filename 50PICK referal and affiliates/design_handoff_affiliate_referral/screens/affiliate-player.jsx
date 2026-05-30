/* 50pick.tz — Affiliate · PLAYER screen CONTENT (shell-agnostic, responsive).
   Rendered by AppFrame inside either the kit Phone (mobile) or the desktop shell.
   Kit components only. Brand: GOLD = primary CTA + money received · INDIGO = chrome
   · CLARET = danger · YES/NO = betting only · Sora/Inter/JetBrains-Mono · EN+SW. */

const fmtN = (n) => n.toLocaleString('en-US');

const Bi = ({ en, sw, size = 15, weight = 600 }) => (
  <div>
    <div className="display" style={{ fontSize: size, fontWeight: weight, lineHeight: 1.25 }}>{en}</div>
    <div className="sw" style={{ fontSize: Math.round(size * 0.72), marginTop: 2 }}>{sw}</div>
  </div>
);

const Cap = ({ children, style }) => (
  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', ...style }}>{children}</div>
);

// Program status pill — proper kit Chip variant (indigo = chrome, NOT betting-green)
const StatusPill = ({ paused }) => (
  paused ? <Chip variant="paused">Paused</Chip> : <Chip variant="active">Active</Chip>
);

// Shared KPI tile — one component used by BOTH player tiles and the admin dashboard,
// so "KPI tile" is a single contract across the app (cf. existing AdminKpi).
const Kpi = ({ label, value, sub, gold, icon }) => (
  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Cap>{label}</Cap>{icon && <span style={{ color: 'var(--text-subtle)' }}><Icon name={icon} size={14} /></span>}
    </div>
    <div className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: gold ? 'var(--gold-300)' : 'var(--text)', lineHeight: 1 }}>{value}</div>
    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 5 }}>{sub}</div>
  </div>
);

const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' };

// ── 1.1 INVITE & EARN ───────────────────────────────────────────────────
const InviteEarn = ({ populated = true, paused = false, wide = false }) => {
  const recruits = [
    { name: 'Ju***s M.', date: '12 May', status: 'Earning', earned: 8400 },
    { name: 'Ba***i R.', date: '28 Apr', status: 'Earning', earned: 12600 },
    { name: 'Ne***a K.', date: '08 May', status: 'First bet', earned: 5000 },
    { name: 'Em***l T.', date: '03 May', status: 'Signed up', earned: 0 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hero — gold earnings ring + adaptive promise */}
      <div className="hero-dark" style={{ ...card, padding: 18, position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg, var(--bg-elevated), var(--indigo-950))' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--gold-500) 12%, transparent), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}>
          <CircularProgress value={populated ? 52 : 0} size={96} stroke={8} tone="gold" label={populated ? '31K' : '0'} />
          <div style={{ flex: 1 }}>
            <Cap style={{ color: 'var(--gold-300)', marginBottom: 7 }}>Refer &amp; earn</Cap>
            <Bi en="Invite friends. Earn together." sw="Alika marafiki. Pateni pamoja." size={19} weight={700} />
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
        <div style={{ display: wide ? 'grid' : 'block', gridTemplateColumns: wide ? '1fr 1fr' : 'none', gap: 12 }}>
          {[
            ['percent', 'Earn 50% of your friends’ fees for 24 months', 'Pata 50% ya ada za marafiki kwa miezi 24'],
            ['ticket', 'Get TZS 5,000 when a friend places their first bet', 'Pata TZS 5,000 rafiki anapoweka dau la kwanza'],
          ].map(([ic, en, sw], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: !wide && i === 0 ? 10 : 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'color-mix(in oklab, var(--gold-500) 16%, transparent)', color: 'var(--gold-300)' }}><Icon name={ic} size={14} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{en}</div>
                <div className="sw" style={{ fontSize: 10.5 }}>{sw}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {paused && (
        <div style={{ display: 'flex', gap: 10, padding: 12, borderRadius: 'var(--r-md)', background: 'color-mix(in oklab, var(--warning-500) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--warning-500) 30%, transparent)' }}>
          <span style={{ color: 'oklch(84% 0.15 80)', flexShrink: 0 }}><Icon name="info" size={16} /></span>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>The program is paused right now. Your link still works — rewards resume when it&rsquo;s back on. <span className="sw">Mpango umesimama kwa sasa.</span></div>
        </div>
      )}

      {/* Referral link + GOLD share CTA */}
      <div>
        <Cap style={{ marginBottom: 8 }}>Your referral link · Kiungo chako</Cap>
        <div className="input-group" style={{ marginBottom: 10 }}>
          <span className="prefix" style={{ color: 'var(--gold-400)' }}><Icon name="link" size={14} /></span>
          <input className="input input-mono" readOnly value="50pick.tz/r/ASHA7K" style={{ fontWeight: 500 }} />
          <button style={{ height: 38, margin: '0 5px', padding: '0 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}><Icon name="copy" size={14} />Copy</button>
        </div>
        <Btn variant="gold" size="lg" style={{ width: '100%' }} leadingIcon={<Icon name="share" size={17} />}>Share with Friends · Shiriki</Btn>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['copy', 'Copy link']].map(([ic, lb]) => (
            <Btn key={lb} variant="ghost" size="md" style={{ flex: 1, fontSize: 12 }} leadingIcon={<Icon name={ic} size={14} />}>{lb}</Btn>
          ))}
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Kpi label="Referrals" value={populated ? '4' : '0'} sub={populated ? '2 earning now' : 'none yet'} icon="users" />
        <Kpi label="Earned" value={populated ? '31,000' : '0'} sub="TZS · all-time" gold icon="coins" />
      </div>

      {/* How it works */}
      <div style={{ ...card, padding: 16 }}>
        <Bi en="How it works" sw="Inavyofanya kazi" size={15} weight={700} />
        <div style={{ display: wide ? 'grid' : 'flex', gridTemplateColumns: wide ? 'repeat(3,1fr)' : 'none', flexDirection: wide ? undefined : 'column', gap: 12, marginTop: 12 }}>
          {[['Share your link', 'Shiriki kiungo chako'], ['They sign up & play', 'Wanajisajili na kucheza'], ['You earn', 'Wewe unapata']].map(([en, sw], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="mono" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, color: i === 2 ? 'oklch(24% 0.06 85)' : 'var(--indigo-200)', background: i === 2 ? 'linear-gradient(180deg, var(--gold-400), var(--gold-600))' : 'color-mix(in oklab, var(--indigo-500) 18%, transparent)', border: i === 2 ? '1px solid var(--gold-700)' : '1px solid color-mix(in oklab, var(--indigo-500) 36%, transparent)' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{en}</div>
                <div className="sw" style={{ fontSize: 11 }}>{sw}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recruits — populated vs empty */}
      <Cap style={{ marginTop: 2 }}>Your referrals · Marafiki wako</Cap>
      {populated ? (
        <div style={{ ...card, overflow: 'hidden' }}>
          {recruits.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: i < recruits.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <Avatar initials={r.name.slice(0, 2)} size="sm" hue={268} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-subtle)' }}>joined {r.date}</div>
              </div>
              <Chip variant={r.earned ? 'resolved' : 'pending'}>{r.status}</Chip>
              <div className="mono" style={{ width: 64, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: r.earned ? 'var(--gold-300)' : 'var(--text-subtle)' }}>{r.earned ? '+' + fmtN(r.earned) : '—'}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 28, textAlign: 'center', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><EmptyPositionsArt /></div>
          <Bi en="No referrals yet" sw="Bado hakuna marafiki" size={15} weight={700} />
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '8px auto 16px', lineHeight: 1.5, maxWidth: 280 }}>Share your link to invite your first friend. They&rsquo;ll appear here once they join.</div>
          <Btn variant="gold" size="md" leadingIcon={<Icon name="share" size={14} />}>Share your link</Btn>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 6, lineHeight: 1.5 }}>Rewards are credited after a friend&rsquo;s activity clears. 18+. Terms apply.</div>
    </div>
  );
};

Object.assign(window, { InviteEarn, Bi, Cap, StatusPill, Kpi, fmtN, cardStyle: card });
