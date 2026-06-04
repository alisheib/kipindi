/* Color combinations & palette suggestions for the host product. */

const Combo = ({ name, bg, fg, accent, hint }) => (
  <div style={{
    background: bg, color: fg,
    borderRadius: 'var(--r-lg)', padding: 22,
    border: '1px solid var(--border)', minHeight: 200,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  }}>
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', opacity: 0.65, textTransform: 'uppercase' }}>{name}</div>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>Will the rains begin early?</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, fontStyle: 'italic' }}>Mvua zitaanza mapema?</div>
    </div>
    <div>
      <div style={{
        height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden', display: 'flex', marginBottom: 12,
      }}>
        <div style={{ width: '62%', background: accent, height: '100%' }} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{hint}</div>
    </div>
  </div>
);

const PaletteSpecimen = () => (
  <div className="specimen" style={{ width: 1200 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Color combinations</div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 720 }}>
      Suggested chrome palettes for the host product. YES emerald and NO rose stay constant across all variants — only the chrome (background + brand accent) changes.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      <Combo name="A · Teal on slate (default)"   bg="oklch(14% 0.01 240)"  fg="oklch(96% 0.005 240)" accent="var(--teal-500)" hint="Calm, regulator-friendly. Brand teal reads distinct from any payments green." />
      <Combo name="B · Indigo deep"               bg="oklch(15% 0.04 270)"  fg="oklch(96% 0.01 270)"  accent="oklch(60% 0.16 270)" hint="More editorial, leans Polymarket. Pair with warm gold." />
      <Combo name="C · Forest"                    bg="oklch(18% 0.04 165)"  fg="oklch(95% 0.01 165)"  accent="oklch(58% 0.13 165)" hint="Earnest, organic. Caution: keep distinct from M-Pesa green." />
      <Combo name="D · Charcoal + amber accent"   bg="oklch(13% 0 0)"       fg="oklch(96% 0 0)"       accent="oklch(70% 0.16 65)"  hint="Neutral chrome, gold/amber accent. Most flexible." />
      <Combo name="E · Plum night"                bg="oklch(16% 0.05 320)"  fg="oklch(96% 0.01 320)"  accent="oklch(65% 0.18 320)" hint="Distinctive, harder to balance. Use sparingly." />
      <Combo name="F · Light cream (light mode)"  bg="oklch(97% 0.012 80)"  fg="oklch(20% 0.01 240)"  accent="var(--teal-600)" hint="Print-friendly. Use for documents, statements, regulator letters." />
    </div>
    <div style={{ marginTop: 28, padding: 18, borderRadius: 'var(--r-md)', background: 'var(--bg-overlay)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
      <strong style={{ color: 'var(--text)' }}>How to choose.</strong> A is the kit default. B is best if you want to match the global prediction-market vocabulary (Polymarket, Kalshi). D is the most flexible if you don't have a strong brand opinion yet. C is risky in any region where mobile-money green is the dominant payment chrome — keep at least 30° hue distance from your payment CTA.
      <br /><br />
      <strong style={{ color: 'var(--text)' }}>Constants regardless of palette.</strong> YES = emerald, NO = rose, gold for resolved-winner moments, mono for all numbers. Don't move these.
    </div>
  </div>
);

Object.assign(window, { PaletteSpecimen });
