// app.jsx — assembles the Dark Glass canvas + live Tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "glassBlur": 16,
  "glassOpacity": 0.62,
  "glowMult": 1,
  "radius": 18,
  "lift": 4,
  "fieldIntensity": 1
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const r = document.documentElement.style;
  r.setProperty('--glass-blur', t.glassBlur + 'px');
  r.setProperty('--glass-opacity', String(t.glassOpacity));
  r.setProperty('--glow-mult', String(t.glowMult));
  r.setProperty('--r-glass', t.radius + 'px');
  r.setProperty('--lift', t.lift + 'px');
  r.setProperty('--bg-base', `oklch(${11 * t.fieldIntensity}% 0.035 268)`);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(t); }, [t]);

  return (
    <React.Fragment>
      <DesignCanvas>
        <DCSection id="s0" title="0 · Probability bar — exploration" subtitle="Pick the gold-needle treatment that defines us · all reinstate the needle, YES-left / NO-right locked">
          {BARS.map(([label, desc, Comp]) => (
            <DCArtboard key={label} id={'bar-' + label.slice(0, 1)} label={label} width={460} height={470} style={{ background: 'var(--bg-base)' }}>
              <BarVariantFrame label={label} desc={desc} Comp={Comp} />
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="s1" title="1 · Landing hero" subtitle="Frosted nav · live ticker · featured market with glowing chart">
          <DCArtboard id="landing" label="Landing — desktop 1280" width={1280} height={860} style={{ background: 'var(--bg-base)' }}>
            <LandingHero />
          </DCArtboard>
          <DCArtboard id="landing-spec" label="Spec" width={400} height={860} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Landing hero"
              anim={[
                'Live ticker copy <b>floats up + fades</b> every 2.8s (floatUp).',
                'Featured chart line <b>draws in</b> over 1.1s (ease-decel) with a soft bloom filter; end-node pulses (2.2s loop).',
                'Probability bar <b>fills from 0→64%</b> on mount, 600ms ease-decel.',
                'Hero CTA: <b>spring hover</b> translateY(-1.5px) + inner gold glow, 120ms ease-spring.',
                'Featured card sits on a permanent <b>gold soft-glow</b> to read as the focal surface.',
              ]}
              tokens={[
                'nav, ticker, featured card → <b>.glass</b>: blur(16px) + 1px gradient edge',
                '--glass-bg: oklch(20% .075 268 / .62)',
                '--glass-edge: 160° hairline (royal→gold)',
                '--glow-gold-soft on featured surface',
                '--r-glass: 18px (was ~10px sharp)',
                'shadows → --shadow-lift (deeper, softer)',
              ]}
              note="Headline gradient stays inside the gold ramp — hue 80 only. No new colors introduced." />
          </DCArtboard>
        </DCSection>

        <DCSection id="s2" title="2 · Market detail + bet confirmation" subtitle="Buy tray + frosted confirm modal, shown open">
          <DCArtboard id="detail" label="Market detail — modal open" width={1280} height={900} style={{ background: 'var(--bg-base)' }}>
            <MarketDetail />
          </DCArtboard>
          <DCArtboard id="detail-spec" label="Spec" width={400} height={900} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Market detail + modal"
              anim={[
                'Modal: backdrop <b>blurs in 0→16px</b> + dims, 280ms ease-smooth.',
                'Panel <b>scales 0.9→1.0</b> with spring overshoot, 280ms ease-spring.',
                'Big chart draws in; YES/NO segmented control glows on the active side.',
                'Confirm button springs on hover; <b>press = scale(0.975)</b> + inset shadow.',
                'Quick-stake chips micro-bounce on tap (spring).',
              ]}
              tokens={[
                'modal → --glass-bg-strong + --shadow-modal',
                'backdrop blur(16px) over oklch(8% .03 268 / .55)',
                'active YES tile → --glow-yes-soft, NO → --glow-no-soft',
                'payout value → --gold-300 (resolved/win accent)',
                'tray, stat tiles, chart frame → .glass',
                '--r-glass 18px on all panels',
              ]}
              note="YES stays left/emerald, NO right/rose. Gold reserved for the payout figure + confirm CTA only." />
          </DCArtboard>
        </DCSection>

        <DCSection id="s3" title="3 · Win celebration" subtitle="Signature moment — gold burst through frosted glass, rolling TZS counter">
          <DCArtboard id="win" label="Win modal — auto-plays, click Replay" width={920} height={640} style={{ background: 'var(--bg-base)' }}>
            <WinCelebration />
          </DCArtboard>
          <DCArtboard id="win-spec" label="Spec" width={400} height={640} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Win celebration"
              anim={[
                '1 — backdrop <b>blurs in</b> 0→16px (280ms).',
                '2 — panel <b>scales 0.9→1.0</b>, spring (280ms).',
                '3 — <b>~22 gold motes burst</b> radially from centre, 0.9–1.4s, fade + shrink (ease-decel). Light, not confetti.',
                '4 — a <b>gold radial bloom</b> swells behind the panel so the frosted glass visibly catches the glow (bloomPulse 1.2s).',
                '5 — check mark <b>stroke-draws</b> (420ms) inside an expanding ring.',
                '6 — <b>+TZS counter rolls up</b> 0→39,062 over 850ms (easeOutCubic).',
              ]}
              tokens={[
                'panel → --glass-bg-strong, border oklch(84% .12 82 / .5)',
                '--glow-gold-bloom on panel (amplified)',
                'counter + amount → --gold-300 + 30px text glow',
                '--dur-celebrate: 1200ms',
                'check disc → --btn-gold-glass + inner highlight',
              ]}
              note="Honors the handoff's no-casino rule: gold light motes + bloom, never chips/dice/multicolor confetti. Reduced-motion shows the end state instantly." />
          </DCArtboard>
        </DCSection>
        <DCSection id="s4" title="4 · Market grid + filter sidebar" subtitle="Frosted filter rail · gilt-bloom card hover lift">
          <DCArtboard id="grid" label="Market grid — desktop 1280" width={1280} height={940} style={{ background: 'var(--bg-base)' }}>
            <MarketGrid />
          </DCArtboard>
          <DCArtboard id="grid-spec" label="Spec" width={400} height={940} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Market grid"
              anim={[
                'Each card on hover: <b>lifts by --lift</b> + gilt border bloom (gold soft-glow), 280ms spring. This is the “card feels alive” moment.',
                'Category source icon warms to gold on hover.',
                'Probability bars stagger-fill on first paint.',
                'Filter checkboxes: gold glass fill + glow on check.',
                'Sticky frosted filter rail blurs content scrolling beneath it.',
              ]}
              tokens={[
                'cards + filter rail → .glass + --shadow-rest',
                'hover → border oklch(82% .10 82 / .55) + --glow-gold-soft',
                'checked box → --btn-gold-glass + --glow-gold-soft',
                'active filter chip → --gold-400 fill',
                '--lift: 4px (tweakable)',
              ]}
              note="Hover any card in the grid to feel the gilt bloom — the signature ‘alive’ lift." />
          </DCArtboard>
        </DCSection>

        <DCSection id="s5" title="5 · Loss modal" subtitle="Gentle glass dim — no harsh red, never punitive">
          <DCArtboard id="loss" label="Loss modal" width={920} height={640} style={{ background: 'var(--bg-base)' }}>
            <LossModal />
          </DCArtboard>
          <DCArtboard id="loss-spec" label="Spec" width={400} height={640} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Loss modal"
              anim={[
                'Backdrop blurs in gently (280ms ease-smooth) — <b>no spring overshoot</b>.',
                'Panel <b>fades + rises 10px→0</b>, calm ease-smooth.',
                'A faint rose border <b>settles to neutral</b> over 900ms — a soft acknowledgement, not an alarm.',
                'No particles, no flash, no rolling counter.',
              ]}
              tokens={[
                'panel → --glass-bg-strong + --shadow-modal',
                'icon disc → oklch(40% .10 22 / .18), muted rose',
                'NO label → --no-300 (semantic, soft)',
                'CTAs are ghost — gold withheld (no win here)',
              ]}
              note="Tone: a short pause is fine. Calm, dignified, bilingual — reuse for any settled-loss moment." />
          </DCArtboard>
        </DCSection>

        <DCSection id="s6" title="6 · Wallet" subtitle="Balance + transaction history">
          <DCArtboard id="wallet" label="Wallet — desktop 1280" width={1280} height={900} style={{ background: 'var(--bg-base)' }}>
            <Wallet />
          </DCArtboard>
          <DCArtboard id="wallet-spec" label="Spec" width={400} height={900} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Wallet"
              anim={[
                'Balance <b>rolls up</b> 0→184,500 on load (RollingCounter, mono).',
                'Balance sparkline draws in with a gold bloom edge.',
                'Deposit/withdraw buttons spring on hover.',
                'Transaction rows could stagger-reveal on scroll.',
              ]}
              tokens={[
                'balance card → .glass + --glow-gold-soft (focal)',
                'payout amounts → --gold-300 · stakes/out → --no-300 · deposits → --yes-300',
                'txn icon tiles → inset glass',
                'Deposit = the one gold CTA on this screen',
              ]}
              note="Gold marks money won/owed to you (payouts, net P/L, deposit CTA). Mono tabular figures throughout." />
          </DCArtboard>
        </DCSection>

        <DCSection id="s7" title="7 · Leaderboard" subtitle="Top predictors by ROI · tiered crests">
          <DCArtboard id="leader" label="Leaderboard — desktop 1280" width={1280} height={900} style={{ background: 'var(--bg-base)' }}>
            <Leaderboard />
          </DCArtboard>
          <DCArtboard id="leader-spec" label="Spec" width={400} height={900} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Leaderboard"
              anim={[
                '#1 podium card carries a permanent <b>gold bloom</b> + crown.',
                'Rows hover-highlight; ROI counts could roll on period change.',
                'Tier rings: gold/diamond crests glow softly.',
              ]}
              tokens={[
                'podium + table → .glass',
                'rank 1–3 + positive ROI → --gold-300 · negative → --no-300',
                'diamond tier ring → --aqua-300 (≤8% finishing accent)',
                'period toggle active → --gold-400',
              ]}
              note="Gold = winning. Aqua reserved as a rare finishing accent for the diamond tier only." />
          </DCArtboard>
        </DCSection>

        <DCSection id="s8" title="8 · Mobile · 393px" subtitle="Screens 1, 2 & 4 in Android frames">
          <DCArtboard id="m-landing" label="Mobile · Landing" width={409} height={864} style={{ background: 'transparent', boxShadow: 'none' }}>
            <MobileLanding />
          </DCArtboard>
          <DCArtboard id="m-grid" label="Mobile · Market grid" width={409} height={864} style={{ background: 'transparent', boxShadow: 'none' }}>
            <MobileGrid />
          </DCArtboard>
          <DCArtboard id="m-win" label="Mobile · Win (auto-plays)" width={409} height={864} style={{ background: 'transparent', boxShadow: 'none' }}>
            <MobileWin />
          </DCArtboard>
          <DCArtboard id="mobile-spec" label="Spec" width={400} height={864} style={{ background: 'oklch(15% 0.04 268)' }}>
            <SpecCard title="Mobile · 393px"
              anim={[
                'Same motion language as desktop — spring hovers become tap-springs.',
                'Win: <b>18 gold motes</b> (lighter for mobile GPU budget) + bloom + counter roll.',
                'Frosted top bar + bottom nav blur content scrolling beneath.',
                'Active bottom-nav icon glows gold.',
              ]}
              tokens={[
                'top bar + bottom nav → .glass (sticky)',
                'cards full-bleed with 16px gutter',
                'hit targets ≥ 44px · +30% string room kept',
                'blur budget trimmed on mobile per brief',
              ]}
              note="Tanzania is Android-first / OLED — deep field + glass reads great outdoors. 44px min targets, bilingual labels fit +30%." />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Frosted glass" />
        <TweakSlider label="Blur radius" value={t.glassBlur} min={0} max={32} step={1} unit="px" onChange={(v) => setTweak('glassBlur', v)} />
        <TweakSlider label="Glass opacity" value={t.glassOpacity} min={0.3} max={0.95} step={0.01} onChange={(v) => setTweak('glassOpacity', v)} />
        <TweakSlider label="Corner radius" value={t.radius} min={6} max={28} step={1} unit="px" onChange={(v) => setTweak('radius', v)} />
        <TweakSection label="Glow & depth" />
        <TweakSlider label="Glow intensity" value={t.glowMult} min={0} max={2.5} step={0.05} onChange={(v) => setTweak('glowMult', v)} />
        <TweakSlider label="Card hover lift" value={t.lift} min={0} max={12} step={0.5} unit="px" onChange={(v) => setTweak('lift', v)} />
        <TweakSection label="Background" />
        <TweakSlider label="Field brightness" value={t.fieldIntensity} min={0.7} max={1.5} step={0.05} onChange={(v) => setTweak('fieldIntensity', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
