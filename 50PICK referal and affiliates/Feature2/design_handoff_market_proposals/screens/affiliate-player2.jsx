/* 50pick.tz — Affiliate · PLAYER entry-point CONTENT (shell-agnostic)
   1.2 Profile row · 1.3 Registration ribbon · 1.4 Notifications + toasts. */

const cardB = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' };

// ── 1.2 PROFILE — Account grid with the new Invite & Earn row ───────────
const ProfileEntry = ({ wide = false }) => {
  const rows = [
    { icon: 'wallet', en: 'Wallet & deposits', sw: 'Pochi na amana' },
    { icon: 'gift', en: 'Invite & Earn', sw: 'Alika upate', highlight: true, badge: 'New' },
    { icon: 'shield', en: 'Verification (KYC)', sw: 'Uthibitisho' },
    { icon: 'history', en: 'Activity & limits', sw: 'Shughuli na vikomo' },
    { icon: 'bell', en: 'Notifications', sw: 'Arifa' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardB, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar initials="AM" size="lg" hue={268} />
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>Asha M.</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>+255 7•• ••• 412</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Cap>Balance</Cap>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-300)' }}>84,200</div>
        </div>
      </div>

      <div>
        <Cap style={{ marginBottom: 8 }}>Account · Akaunti</Cap>
        <div style={{ ...cardB, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative', background: r.highlight ? 'color-mix(in oklab, var(--gold-500) 8%, transparent)' : 'transparent', cursor: 'pointer' }}>
              {r.highlight && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))' }} />}
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: r.highlight ? 'linear-gradient(180deg, var(--gold-400), var(--gold-600))' : 'var(--bg-overlay)', color: r.highlight ? 'oklch(24% 0.06 85)' : 'var(--text-muted)' }}><Icon name={r.icon} size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>{r.en}{r.badge && <Chip variant="resolved">{r.badge}</Chip>}</div>
                <div className="sw" style={{ fontSize: 11.5 }}>{r.sw}</div>
              </div>
              <span style={{ color: 'var(--text-subtle)' }}><Icon name="chevron" size={18} /></span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>The Invite &amp; Earn row carries a subtle gold accent &amp; &ldquo;New&rdquo; tag &mdash; a growth surface, not a setting.</div>
      </div>
    </div>
  );
};

// ── 1.3 REGISTRATION — referral ribbon (degrades when no bonus) ─────────
const Registration = ({ bonusOn = true, wide = false }) => (
  <div style={{ maxWidth: wide ? 460 : 'none', margin: wide ? '0 auto' : 0 }}>
    <div style={{ marginBottom: 18, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid color-mix(in oklab, var(--gold-500) 36%, transparent)', background: 'linear-gradient(135deg, color-mix(in oklab, var(--gold-500) 16%, var(--bg-elevated)), var(--bg-elevated))' }}>
      <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
        <FiftyMark size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>You were invited by Asha M.</div>
          <div className="sw" style={{ fontSize: 11 }}>Umealikwa na rafiki</div>
          {bonusOn && <div style={{ fontSize: 12.5, color: 'var(--gold-300)', fontWeight: 600, marginTop: 5 }}>Sign up &amp; get TZS 2,000 to start · Pata TZS 2,000</div>}
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <Cap style={{ marginBottom: 6 }}>Phone number · Namba ya simu</Cap>
        <Input prefix="+255" mono placeholder="7•• ••• •••" />
      </div>
      <div>
        <Cap style={{ marginBottom: 6 }}>Full name · Jina kamili</Cap>
        <Input placeholder="Asha Mwangi" />
      </div>
      <div>
        <Cap style={{ marginBottom: 6 }}>Referral code · auto-filled</Cap>
        <div className="input-group">
          <span className="prefix" style={{ color: 'var(--gold-400)' }}><Icon name="check" size={14} /></span>
          <input className="input input-mono" readOnly value="ASHA7K" style={{ color: 'var(--gold-300)', fontWeight: 600 }} />
        </div>
      </div>
      <Btn variant="gold" size="lg" style={{ width: '100%', marginTop: 4 }}>Continue · Endelea</Btn>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', lineHeight: 1.5 }}>By continuing you confirm you are 18+ and accept the Terms.</div>
    </div>
  </div>
);

const NRow = ({ icon, gold, title, body, time, unread, last }) => (
  <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'flex-start', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
    <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: gold ? 'color-mix(in oklab, var(--gold-500) 18%, transparent)' : 'color-mix(in oklab, var(--indigo-500) 18%, transparent)', color: gold ? 'var(--gold-300)' : 'var(--indigo-200)' }}><Icon name={icon} size={17} /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{body}</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--text-subtle)' }}>{time}</span>
      {unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold-500)' }} />}
    </div>
  </div>
);

// ── 1.4 NOTIFICATIONS ───────────────────────────────────────────────────
const Notifications = ({ wide = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div>
      <Cap style={{ marginBottom: 8 }}>Today · Leo</Cap>
      <div style={{ ...cardB, overflow: 'hidden' }}>
        <NRow icon="coins" gold unread title="You earned TZS 8,400 from a referral" body="Commission from Ju***s M.&rsquo;s activity. · Tume kutoka kwa rafiki." time="2h" />
        <NRow icon="users" unread title="Your friend just joined" body="Ba***i R. signed up with your link. · Rafiki amejisajili." time="5h" />
        <NRow icon="ticket" gold unread title="Milestone reward · TZS 5,000" body="Ne***a K. placed their first bet. · Dau la kwanza." time="9h" last />
      </div>
    </div>
    <div>
      <Cap style={{ marginBottom: 8 }}>Earlier · Awali</Cap>
      <div style={{ ...cardB, overflow: 'hidden' }}>
        <NRow icon="megaphone" title="Invite 3 friends this week" body="A small streak bonus is live. · Bonasi ya wiki." time="2d" />
        <NRow icon="coins" gold title="You earned TZS 4,300 from a referral" body="Commission settled. · Tume imelipwa." time="3d" last />
      </div>
    </div>
    <div>
      <Cap style={{ marginBottom: 10 }}>Live toast styles · Mitindo</Cap>
      <div style={{ display: wide ? 'grid' : 'flex', gridTemplateColumns: wide ? '1fr 1fr' : 'none', flexDirection: wide ? undefined : 'column', gap: 10 }}>
        <Toast kind="success" title="Your friend just joined" body="Ba***i R. is now on 50pick" />
        <Toast kind="info" title="You earned TZS 8,400" body="From a friend's activity · Kutoka kwa rafiki" />
      </div>
    </div>
  </div>
);

Object.assign(window, { ProfileEntry, Registration, Notifications, NRow });
