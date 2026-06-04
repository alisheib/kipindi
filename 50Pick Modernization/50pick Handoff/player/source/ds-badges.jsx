// ds-badges.jsx — Achievement badge system (gilt-on-royal coins) + CountdownPill
// Ported from the user's badges/Badge.tsx + badges/icons.tsx (loved components).
const { useState: bgS, useEffect: bgE } = React;

const GOLD = 'var(--gold-400)';
const wrapB = (inner) => <svg viewBox="0 0 56 56" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{inner}</svg>;
const BADGE_ICONS = {
  'first-prediction': wrapB(<React.Fragment><circle cx="28" cy="28" r="18" /><line x1="20" y1="12" x2="36" y2="44" /><circle cx="28" cy="28" r="2.4" stroke="none" fill={GOLD} /></React.Fragment>),
  'first-win': wrapB(<React.Fragment><circle cx="28" cy="23" r="13" /><path d="M22 23 l4.5 5 l9 -11" stroke={GOLD} /><line x1="23" y1="35" x2="20" y2="47" /><line x1="33" y1="35" x2="36" y2="47" /><line x1="20" y1="47" x2="28" y2="42" /><line x1="36" y1="47" x2="28" y2="42" /></React.Fragment>),
  'sharp': wrapB(<React.Fragment><circle cx="28" cy="28" r="18" /><circle cx="28" cy="28" r="10.5" /><line x1="28" y1="6" x2="28" y2="13" /><line x1="28" y1="43" x2="28" y2="50" /><line x1="6" y1="28" x2="13" y2="28" /><line x1="43" y1="28" x2="50" y2="28" /><circle cx="28" cy="28" r="3" stroke="none" fill={GOLD} /></React.Fragment>),
  'market-maker': wrapB(<React.Fragment><g transform="rotate(-32 28 26)"><rect x="15" y="11" width="23" height="9" rx="2.5" /><line x1="26.5" y1="20" x2="26.5" y2="41" /></g><line x1="13" y1="47" x2="40" y2="47" stroke={GOLD} /></React.Fragment>),
  'connector': wrapB(<React.Fragment><line x1="18" y1="20" x2="38" y2="20" /><line x1="19" y1="23" x2="26" y2="38" /><line x1="37" y1="23" x2="30" y2="38" /><circle cx="16" cy="19" r="4.5" /><circle cx="28" cy="41" r="4.5" /><circle cx="40" cy="19" r="4.5" stroke={GOLD} /></React.Fragment>),
  'verified': wrapB(<React.Fragment><path d="M28 7 L44 13 V27 C44 37 37 44 28 48 C19 44 12 37 12 27 V13 Z" /><path d="M21 27 l5 6 l11 -13" stroke={GOLD} /></React.Fragment>),
  'hot-streak': wrapB(<React.Fragment><path d="M16 40 L28 30 L40 40" /><path d="M16 31 L28 21 L40 31" /><path d="M16 22 L28 12 L40 22" stroke={GOLD} /></React.Fragment>),
  'oracle': wrapB(<React.Fragment><path d="M9 28 Q28 13 47 28 Q28 43 9 28 Z" /><circle cx="28" cy="28" r="6" /><circle cx="28" cy="28" r="2.4" stroke="none" fill={GOLD} /></React.Fragment>),
  'high-roller': wrapB(<React.Fragment><ellipse cx="28" cy="40" rx="13" ry="4.5" /><ellipse cx="28" cy="32" rx="13" ry="4.5" /><line x1="15" y1="32" x2="15" y2="40" /><line x1="41" y1="32" x2="41" y2="40" /><ellipse cx="28" cy="22" rx="13" ry="4.5" stroke={GOLD} /></React.Fragment>),
  'day-one': wrapB(<React.Fragment><line x1="9" y1="39" x2="47" y2="39" /><path d="M18 39 A10 10 0 0 1 38 39" stroke={GOLD} /><line x1="28" y1="14" x2="28" y2="19" /><line x1="14" y1="22" x2="17" y2="25" /><line x1="42" y1="22" x2="39" y2="25" /></React.Fragment>),
  'default': wrapB(<React.Fragment><circle cx="28" cy="28" r="18" /><path d="M22 24 q6 -8 12 0" /><circle cx="38" cy="20" r="2.2" stroke="none" fill={GOLD} /></React.Fragment>),
};
const ACHIEVEMENTS = [
  { id: 'first-prediction', name: 'First Prediction', nameSw: 'Ubashiri wa Kwanza', rarity: 'Common' },
  { id: 'first-win', name: 'First Win', nameSw: 'Ushindi wa Kwanza', rarity: 'Common' },
  { id: 'sharp', name: 'Sharp', nameSw: 'Mahiri', rarity: 'Rare · skill' },
  { id: 'market-maker', name: 'Market Maker', nameSw: 'Mtengeneza Soko', rarity: 'Uncommon' },
  { id: 'connector', name: 'Connector', nameSw: 'Mwunganishi', rarity: 'Tiered' },
  { id: 'verified', name: 'Verified', nameSw: 'Umethibitishwa', rarity: 'Utility' },
  { id: 'hot-streak', name: 'Hot Streak', nameSw: 'Mfululizo', rarity: 'Rare' },
  { id: 'oracle', name: 'Oracle', nameSw: 'Nabii', rarity: 'Rare' },
  { id: 'high-roller', name: 'High Roller', nameSw: 'Mchezaji Mkubwa', rarity: 'Uncommon' },
  { id: 'day-one', name: 'Day One', nameSw: 'Siku ya Kwanza', rarity: 'Collectible' },
];

const BADGE_SZ = { sm: 46, md: 60, lg: 84 };
function Badge({ achievement, state = 'unlocked', progress, size = 'md', title }) {
  const d = BADGE_SZ[size];
  const locked = state === 'locked';
  const isProg = state === 'progress';
  const pct = progress && progress.max > 0 ? Math.min(1, Math.max(0, progress.value / progress.max)) : 0;
  const uid = React.useId().replace(/:/g, '');
  const hex = '50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5';
  const glyphCol = locked ? 'oklch(52% 0.03 268)' : isProg ? 'var(--yes-300)' : 'oklch(89% 0.11 86)';
  const rim = locked ? 'var(--border-strong)' : isProg ? 'var(--yes-500)' : `url(#bg${uid})`;
  return (
    <div role="img" aria-label={title || achievement} title={title} style={{ position: 'relative', width: d, height: d }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', filter: locked ? 'none' : 'drop-shadow(0 4px 12px oklch(8% 0.05 268 / 0.5))' }}>
        <defs>
          <radialGradient id={`bf${uid}`} cx="0.5" cy="0.28" r="0.85"><stop offset="0" stopColor="oklch(32% 0.08 268)" /><stop offset="1" stopColor="oklch(17% 0.05 268)" /></radialGradient>
          <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(91% 0.10 88)" /><stop offset="0.5" stopColor="oklch(80% 0.14 82)" /><stop offset="1" stopColor="oklch(63% 0.13 78)" /></linearGradient>
          <clipPath id={`bc${uid}`}><polygon points={hex} /></clipPath>
        </defs>
        <polygon points={hex} fill={locked ? 'oklch(16% 0.025 268)' : `url(#bf${uid})`} />
        {isProg && <g clipPath={`url(#bc${uid})`}><rect x="0" y={100 - pct * 100} width="100" height={pct * 100} fill="oklch(58% 0.16 152 / 0.30)" /></g>}
        <polygon points={hex} fill="none" stroke={rim} strokeWidth={locked ? 1.5 : 3} strokeLinejoin="round" />
        <polygon points="50,12 82,30.5 82,69.5 50,88 18,69.5 18,30.5" fill="none" stroke="oklch(98% 0.02 268 / 0.10)" strokeWidth="1" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: glyphCol }}><div style={{ width: '42%', height: '42%' }}>{BADGE_ICONS[achievement] || BADGE_ICONS.default}</div></div>
      {locked && <span aria-hidden style={{ position: 'absolute', bottom: '6%', left: '50%', transform: 'translateX(-50%)', width: d * 0.24, height: d * 0.24, borderRadius: 999, background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}><svg width="56%" height="56%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>}
    </div>
  );
}
const RARITY_COL = { 'Common': 'var(--text-subtle)', 'Uncommon': 'var(--yes-400)', 'Rare': 'var(--brand-300)', 'Rare · skill': 'var(--brand-300)', 'Tiered': 'var(--gold-400)', 'Utility': 'var(--accent-400)', 'Collectible': 'var(--gold-400)' };
function AchievementCard({ achievement, state, progress, name, nameSw, rarity }) {
  const locked = state === 'locked'; const isProg = state === 'progress';
  const rc = RARITY_COL[rarity] || 'var(--text-subtle)';
  return <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 'var(--r-lg)',
    background: state === 'unlocked' ? 'linear-gradient(135deg, oklch(22% 0.05 268), var(--bg-elevated))' : 'var(--bg-elevated)',
    border: `1px solid ${state === 'unlocked' ? 'oklch(78% 0.13 80 / 0.35)' : isProg ? 'oklch(70% 0.15 152 / 0.3)' : 'var(--border)'}`, opacity: locked ? 0.8 : 1 }}>
    <Badge achievement={achievement} state={state} progress={progress} size="md" title={name} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span className="disp" style={{ fontSize: 14.5, fontWeight: 600 }}>{name}</span>
        <span style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: rc, border: `1px solid ${rc}`, opacity: 0.85, borderRadius: 'var(--r-xs)', padding: '1px 5px' }}>{rarity}</span>
      </div>
      <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--text-subtle)', marginBottom: isProg ? 8 : 5 }}>{nameSw}</div>
      {isProg
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><ProgressBar value={Math.round(pctOf(progress))} tone="yes" size="sm" animate={false} /></div><span style={{ ...mono, fontSize: 11, color: 'var(--yes-400)' }}>{progress.value}/{progress.max}</span></div>
        : <div style={{ ...mono, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: locked ? 'var(--text-faint)' : 'var(--gold-300)' }}>{locked ? 'Locked · Imefungwa' : '✓ Earned · Imepatikana'}</div>}
    </div>
  </div>;
}
const pctOf = (p) => p && p.max > 0 ? (p.value / p.max) * 100 : 0;
function AchievementToast({ name = 'First Win', nameSw = 'Ushindi wa Kwanza', achievement = 'first-win' }) {
  return <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 16, width: 340, padding: 16, background: 'var(--bg-elevated2)', border: '1px solid oklch(78% 0.13 80 / 0.5)', borderRadius: 'var(--r-lg)', boxShadow: '0 16px 40px oklch(6% 0.06 264 / 0.55), 0 0 24px oklch(78% 0.13 80 / 0.12)' }}>
    <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
      <span aria-hidden style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent, oklch(80% 0.13 84 / 0.45), transparent 40%)', animation: 'spin 3.5s linear infinite' }} />
      <Badge achievement={achievement} state="unlocked" size="sm" title={name} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 3 }}>Achievement unlocked</div>
      <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-subtle)' }}>{nameSw}</div>
    </div>
  </div>;
}

/* CountdownPill — small mono countdown (rate-limit / cool-off) */
function CountdownPill({ seconds = 90, prefix, suffix }) {
  const [left, setLeft] = bgS(Math.max(0, Math.floor(seconds)));
  bgE(() => { if (left <= 0) return; const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000); return () => clearInterval(id); }, [left]);
  if (left <= 0) return <span style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>Ready · Tayari</span>;
  const m = Math.floor(left / 60), s = left % 60;
  const disp2 = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono, fontSize: 11.5 }}>{prefix && <span style={{ color: 'var(--text-subtle)' }}>{prefix}</span>}<span style={{ fontWeight: 700, color: 'var(--gold-400)' }}>{disp2}</span>{suffix && <span style={{ color: 'var(--text-subtle)' }}>{suffix}</span>}</span>;
}

/* Score / rank hero + tier medallion */
function TierMedallion({ tier = 'Gold', glyph = 'crown', size = 92 }) {
  return <div style={{ position: 'relative', width: size, height: size, borderRadius: 999, display: 'grid', placeItems: 'center',
    background: 'radial-gradient(circle at 50% 30%, oklch(35% 0.07 268), oklch(19% 0.05 268))', color: 'oklch(89% 0.11 86)',
    boxShadow: '0 0 0 3px oklch(80% 0.14 82), inset 0 1px 0 oklch(95% 0.05 84 / 0.4), 0 8px 20px oklch(8% 0.05 262 / 0.5)' }}>
    {Icon[glyph] ? Icon[glyph]({ s: size * 0.42 }) : null}
    <span style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-text)', background: 'linear-gradient(180deg, oklch(88% 0.13 84), oklch(76% 0.145 80))', borderRadius: 'var(--r-pill)', padding: '2px 9px', whiteSpace: 'nowrap', boxShadow: '0 2px 6px oklch(8% 0.05 264 / 0.5)' }}>{tier}</span>
  </div>;
}
function RankRing({ pct = 0.62, size = 86 }) {
  const R = 34, C = 2 * Math.PI * R;
  return <div style={{ position: 'relative', width: size, height: size }}>
    <svg viewBox="0 0 80 80" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--bg-inset)" strokeWidth="6" />
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--gold-400)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', ...mono, fontSize: 15, fontWeight: 700, color: 'var(--gold-300)' }}>{Math.round(pct * 100)}%</div>
  </div>;
}
function ScoreHero() {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '24px 26px', borderRadius: 'var(--r-xl)',
    background: 'linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))', border: '1px solid oklch(78% 0.13 80 / 0.3)',
    boxShadow: 'inset 0 1px 0 oklch(92% 0.06 84 / 0.15), 0 0 34px oklch(78% 0.13 80 / 0.10), 0 12px 34px oklch(8% 0.05 264 / 0.5)' }}>
    <TierMedallion tier="Gold" glyph="crown" />
    <div style={{ flex: 1 }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 4 }}>Season score · Alama za msimu</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span className="disp" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', ...mono }}>2,480</span><span style={{ ...mono, fontSize: 13, color: 'var(--text-subtle)' }}>pts</span><span style={{ ...mono, fontSize: 12, color: 'var(--yes-400)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>{Icon.arrowUp({ s: 13 })}+180 this week</span></div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
        {[['Rank', '#128'], ['Percentile', 'Top 4%'], ['Accuracy', '63%'], ['Streak', '5W']].map(([k, v]) => <div key={k}><div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{k}</div><div style={{ ...mono, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{v}</div></div>)}
      </div>
    </div>
    <div style={{ textAlign: 'center', paddingLeft: 20, borderLeft: '1px solid var(--border)' }}>
      <RankRing pct={0.62} />
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-muted)', marginTop: 8 }}>1,240 to <span style={{ color: 'var(--brand-300)' }}>Diamond</span></div>
    </div>
  </div>;
}
function BadgesBoard() {
  const states = { 'first-prediction': 'unlocked', 'first-win': 'unlocked', 'verified': 'unlocked', 'sharp': { progress: { value: 14, max: 20 } }, 'connector': { progress: { value: 3, max: 5 } }, 'day-one': 'unlocked', 'market-maker': 'locked', 'hot-streak': 'locked', 'oracle': 'locked', 'high-roller': 'locked' };
  const cards = ACHIEVEMENTS.map((a) => { const st = states[a.id]; const isProg = st && st.progress; return { ...a, achievement: a.id, state: isProg ? 'progress' : (st || 'locked'), progress: isProg ? st.progress : undefined }; });
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 8 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Achievements &amp; score</div></div>
    <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginBottom: 20, maxWidth: 680, lineHeight: 1.6 }}>Season score &amp; tier up top; gilt medallions earn out below. Locked &amp; in-progress stay visible as a goal set — refined coins, not greyed boxes.</div>
    <ScoreHero />
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', margin: '28px 0 14px' }}>ACHIEVEMENTS</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {cards.map((c) => <AchievementCard key={c.id} achievement={c.achievement} state={c.state} progress={c.progress} name={c.name} nameSw={c.nameSw} rarity={c.rarity} />)}
    </div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', margin: '28px 0 14px' }}>UNLOCK MOMENT · COUNTDOWN</div>
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <AchievementToast />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CountdownPill seconds={92} prefix="Try again in" suffix="· Subiri" />
        <CountdownPill seconds={5} prefix="Next round" />
      </div>
    </div>
  </div>;
}

Object.assign(window, { Badge, AchievementCard, ScoreHero, TierMedallion, RankRing, AchievementToast, CountdownPill, BadgesBoard, BADGE_ICONS, ACHIEVEMENTS });
