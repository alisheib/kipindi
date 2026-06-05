// directions.jsx — Clean (no-glass) direction comparison for 50pick.
// Four flat, crisp, Polymarket-inspired looks: Luxe & Sporty × Light & Dark.
// Locked: YES emerald (left) · NO rose (right) · gold accent + gold needle · royal indigo chrome.

const { useState: dS } = React;

/* ---- tiny inline icon set ---- */
const I = ({ d, s = 16, sw = 1.8, fill = 'none' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>
);
const IClock = (p) => <svg {...p} width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
const IBall = (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7l3 2-1 3.5h-4L9 9z"/></svg>;

/* ============================================================
   THEMES
   ============================================================ */
const THEMES = {
  luxeLight: {
    name: 'A · Luxe', mode: 'Light', vibe: 'luxe',
    blurb: 'Apple / Stripe restraint. Soft off-white, hairline borders, generous air, one confident accent. Premium through calm.',
    page: 'oklch(97.5% 0.004 268)', card: '#ffffff', cardAlt: 'oklch(98.5% 0.004 268)',
    border: 'oklch(91% 0.008 268)', borderStrong: 'oklch(86% 0.012 268)',
    text: 'oklch(26% 0.02 268)', muted: 'oklch(52% 0.02 268)', subtle: 'oklch(64% 0.018 268)',
    accent: 'oklch(47% 0.17 268)', accentSoft: 'oklch(95% 0.03 268)', onAccent: '#fff',
    yes: 'oklch(56% 0.15 152)', yesSoft: 'oklch(95% 0.05 152)', no: 'oklch(57% 0.19 22)', noSoft: 'oklch(95% 0.05 22)',
    gold: 'oklch(66% 0.14 80)', goldSoft: 'oklch(95% 0.05 84)',
    radius: 18, shadow: '0 1px 2px oklch(40% 0.03 268 / 0.06), 0 4px 16px oklch(40% 0.03 268 / 0.05)', shadowLg: '0 2px 6px oklch(40% 0.03 268 / 0.08), 0 12px 40px oklch(40% 0.03 268 / 0.08)',
  },
  luxeDark: {
    name: 'B · Luxe', mode: 'Dark', vibe: 'luxe',
    blurb: 'Same restraint, dark — but soft, not the heavy glass. Flat calm indigo, hairline borders, no glow. "Dark done nicely."',
    page: 'oklch(19% 0.028 268)', card: 'oklch(23% 0.034 268)', cardAlt: 'oklch(21% 0.03 268)',
    border: 'oklch(31% 0.04 268)', borderStrong: 'oklch(38% 0.05 268)',
    text: 'oklch(95% 0.01 268)', muted: 'oklch(72% 0.02 268)', subtle: 'oklch(60% 0.025 268)',
    accent: 'oklch(66% 0.16 268)', accentSoft: 'oklch(34% 0.07 268)', onAccent: 'oklch(16% 0.04 268)',
    yes: 'oklch(72% 0.15 152)', yesSoft: 'oklch(34% 0.07 152)', no: 'oklch(70% 0.17 22)', noSoft: 'oklch(34% 0.09 22)',
    gold: 'oklch(82% 0.14 82)', goldSoft: 'oklch(34% 0.07 82)',
    radius: 18, shadow: '0 1px 2px oklch(8% 0.03 268 / 0.4), 0 4px 18px oklch(8% 0.03 268 / 0.3)', shadowLg: '0 8px 32px oklch(8% 0.03 268 / 0.45)',
  },
  sportyLight: {
    name: 'C · Sporty', mode: 'Light', vibe: 'sporty',
    blurb: 'DraftKings / FanDuel energy. Bold type, chunky filled YES/NO, a royal header strip, big odds. Built for matchday.',
    page: 'oklch(96.5% 0.006 268)', card: '#ffffff', cardAlt: 'oklch(98% 0.005 268)',
    border: 'oklch(90% 0.01 268)', borderStrong: 'oklch(84% 0.014 268)',
    text: 'oklch(22% 0.025 268)', muted: 'oklch(48% 0.025 268)', subtle: 'oklch(60% 0.02 268)',
    accent: 'oklch(44% 0.19 268)', accentSoft: 'oklch(94% 0.035 268)', onAccent: '#fff',
    yes: 'oklch(57% 0.16 152)', yesSoft: 'oklch(93% 0.06 152)', no: 'oklch(56% 0.20 22)', noSoft: 'oklch(94% 0.06 22)',
    gold: 'oklch(64% 0.15 80)', goldSoft: 'oklch(94% 0.06 84)',
    radius: 12, shadow: '0 1px 2px oklch(40% 0.03 268 / 0.07), 0 6px 18px oklch(40% 0.03 268 / 0.07)', shadowLg: '0 3px 8px oklch(40% 0.03 268 / 0.1), 0 14px 44px oklch(40% 0.03 268 / 0.1)',
  },
  sportyDark: {
    name: 'D · Sporty', mode: 'Dark', vibe: 'sporty',
    blurb: 'Sporty, dark, electric-but-clean. Big bold odds, filled YES/NO, a royal accent edge. Stadium-at-night energy without the glow soup.',
    page: 'oklch(16% 0.03 268)', card: 'oklch(20.5% 0.038 268)', cardAlt: 'oklch(18.5% 0.034 268)',
    border: 'oklch(29% 0.045 268)', borderStrong: 'oklch(40% 0.06 268)',
    text: 'oklch(96% 0.01 268)', muted: 'oklch(72% 0.022 268)', subtle: 'oklch(58% 0.028 268)',
    accent: 'oklch(64% 0.17 268)', accentSoft: 'oklch(32% 0.08 268)', onAccent: 'oklch(15% 0.04 268)',
    yes: 'oklch(73% 0.16 152)', yesSoft: 'oklch(32% 0.08 152)', no: 'oklch(70% 0.18 22)', noSoft: 'oklch(32% 0.1 22)',
    gold: 'oklch(83% 0.14 82)', goldSoft: 'oklch(32% 0.08 82)',
    radius: 12, shadow: '0 1px 2px oklch(8% 0.03 268 / 0.45), 0 6px 20px oklch(8% 0.03 268 / 0.35)', shadowLg: '0 10px 36px oklch(8% 0.03 268 / 0.5)',
  },
};

/* ---- gold-needle probability bar (signature, themed) ---- */
function NeedleBar({ t, yes, h = 10 }) {
  return (
    <div style={{ position: 'relative', height: h, paddingTop: 3 }}>
      <div style={{ position: 'relative', height: h, borderRadius: 999, overflow: 'hidden', display: 'flex', background: t.cardAlt, border: `1px solid ${t.border}` }}>
        <div style={{ width: `${yes}%`, background: t.yes }} />
        <div style={{ flex: 1, background: t.no }} />
      </div>
      <div style={{ position: 'absolute', left: `${yes}%`, top: -1, bottom: -1, width: 2.5, transform: 'translateX(-50%)', background: t.gold, borderRadius: 2, boxShadow: `0 0 0 1px ${t.page}` }} />
      <div style={{ position: 'absolute', left: `${yes}%`, top: -2, width: 8, height: 8, transform: 'translate(-50%,-50%) rotate(45deg)', background: t.gold, borderRadius: 2, boxShadow: `0 0 0 1.5px ${t.page}` }} />
    </div>
  );
}

/* ---- buttons ---- */
function YNButtons({ t, big }) {
  const luxe = t.vibe === 'luxe';
  const base = { flex: 1, height: big ? 52 : 44, borderRadius: t.radius - 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'Inter, sans-serif', fontWeight: t.vibe === 'sporty' ? 700 : 600, fontSize: big ? 16 : 14, letterSpacing: t.vibe === 'sporty' ? '0.02em' : 0, transition: 'transform .12s, filter .15s' };
  const yesStyle = luxe
    ? { ...base, background: t.yesSoft, color: t.yes, border: `1px solid ${t.yes}33` }
    : { ...base, background: t.yes, color: '#fff', border: 'none', boxShadow: `0 2px 0 ${t.yes}` };
  const noStyle = luxe
    ? { ...base, background: t.noSoft, color: t.no, border: `1px solid ${t.no}33` }
    : { ...base, background: t.no, color: '#fff', border: 'none', boxShadow: `0 2px 0 ${t.no}` };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button style={yesStyle} onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.98)'} onMouseUp={(e)=>e.currentTarget.style.transform=''} onMouseLeave={(e)=>e.currentTarget.style.transform=''}>
        {t.vibe === 'sporty' ? 'YES' : 'Yes'} <span style={{ fontFamily: 'JetBrains Mono, monospace', opacity: 0.9 }}>0.64</span>
      </button>
      <button style={noStyle} onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.98)'} onMouseUp={(e)=>e.currentTarget.style.transform=''} onMouseLeave={(e)=>e.currentTarget.style.transform=''}>
        {t.vibe === 'sporty' ? 'NO' : 'No'} <span style={{ fontFamily: 'JetBrains Mono, monospace', opacity: 0.9 }}>0.36</span>
      </button>
    </div>
  );
}
function Chip({ t, tone = 'cat', children }) {
  const map = { live: [t.no, t.noSoft], cat: [t.muted, t.cardAlt], gold: [t.gold, t.goldSoft] };
  const [fg, bg] = map[tone];
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: fg, background: bg, border: `1px solid ${fg}22` }}>
    {tone === 'live' && <span style={{ width: 6, height: 6, borderRadius: 9, background: t.no }} />}{children}</span>;
}

/* ============================================================
   Core experience composition (market card + buy panel)
   ============================================================ */
function DirComposition({ t }) {
  const sporty = t.vibe === 'sporty';
  const mono = { fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' };
  const disp = { fontFamily: 'Sora, sans-serif', letterSpacing: '-0.02em' };
  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 24, background: t.page, color: t.text, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header label */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ ...disp, fontSize: 19, fontWeight: 700 }}>{t.name}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.subtle, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.mode}</div>
      </div>

      {/* MARKET CARD (list item) */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: t.radius, boxShadow: t.shadow, overflow: 'hidden' }}>
        {sporty && <div style={{ height: 4, background: `linear-gradient(90deg, ${t.accent}, ${t.gold})` }} />}
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 7 }}><Chip t={t} tone="live">Live</Chip><Chip t={t}><IBall s={12}/> Football</Chip></div>
            <span style={{ ...mono, fontSize: 11.5, color: t.subtle, display: 'flex', alignItems: 'center', gap: 4 }}><IClock s={13}/> 2d 4h</span>
          </div>
          <div style={{ ...disp, fontSize: sporty ? 17 : 17.5, fontWeight: sporty ? 700 : 600, lineHeight: 1.3 }}>Will Simba SC win the Kariakoo derby?</div>
          <div style={{ fontSize: 13, fontStyle: 'italic', color: t.subtle, margin: '3px 0 14px' }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12.5, ...mono, fontWeight: 600 }}>
            <span style={{ color: t.yes }}>YES 64%</span><span style={{ color: t.no }}>NO 36%</span>
          </div>
          <NeedleBar t={t} yes={64} />
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '13px 0', fontSize: 11.5, color: t.subtle, ...mono }}>
            <span>TZS 48.2M</span><span>1,284 predictors</span>
          </div>
          <YNButtons t={t} />
        </div>
      </div>

      {/* BUY PANEL (detail) */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: t.radius, boxShadow: t.shadowLg, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.subtle }}>YES probability</div>
            <div style={{ ...mono, fontSize: sporty ? 46 : 40, fontWeight: sporty ? 700 : 600, color: t.text, lineHeight: 1.05, marginTop: 4 }}>64<span style={{ fontSize: 22, color: t.subtle }}>%</span></div>
          </div>
          <span style={{ ...mono, fontSize: 13, color: t.yes, fontWeight: 600, display:'flex', alignItems:'center', gap: 4 }}><I d="M12 20V4M6 10l6-6 6 6" s={14} sw={2}/> +6 today</span>
        </div>
        <NeedleBar t={t} yes={64} h={sporty ? 14 : 12} />
        <div style={{ marginTop: 16 }}><YNButtons t={t} big /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 13, color: t.muted }}>If correct, you receive</span>
          <span style={{ ...mono, fontSize: 18, fontWeight: 700, color: t.gold }}>TZS 39,062</span>
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.5 }}>{t.blurb}</div>
    </div>
  );
}

function DirectionsApp() {
  const order = ['luxeLight', 'luxeDark', 'sportyLight', 'sportyDark'];
  return (
    <DesignCanvas>
      <DCSection id="dir" title="Pick a direction" subtitle="Flat & clean (no glass) · Polymarket-inspired · royal indigo + gold + our gold needle kept · YES-left / NO-right locked">
        {order.map((k) => (
          <DCArtboard key={k} id={k} label={THEMES[k].name + ' · ' + THEMES[k].mode} width={460} height={680} style={{ background: THEMES[k].page }}>
            <DirComposition t={THEMES[k]} />
          </DCArtboard>
        ))}
      </DCSection>
    </DesignCanvas>
  );
}

Object.assign(window, { THEMES, DirComposition, DirectionsApp });
