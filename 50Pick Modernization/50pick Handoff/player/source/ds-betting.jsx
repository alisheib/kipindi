// ds-betting.jsx — THE DIAL (main feature) in betting context + variants to keep/adjust
const { useState: btS, useEffect: btE, useRef: btR, useCallback: btCB } = React;

const ScreenB = ({ children, pad = 32 }) => <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: pad, boxSizing: 'border-box' }}>{children}</div>;
const HB = ({ children, sub }) => <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3, maxWidth: 620, lineHeight: 1.5 }}>{sub}</div>}</div>;
const SB = ({ children }) => <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '24px 0 14px' }}>{children}</div>;

/* ============================================================
   BetDial — the conviction dial, enhanced. Drag to set YES%,
   stake stays fixed; payout updates live. Gold handle + value bubble.
   Same core mechanic as the live platform, refined.
   ============================================================ */
function BetDial({ initial = 64, stake = 25000 }) {
  const [yes, setYes] = btS(initial);
  const [drag, setDrag] = btS(false);
  const ref = btR(null); const dragging = btR(false);
  const set = btCB((clientX) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); let p = Math.round(((clientX - r.left) / r.width) * 100); p = Math.max(1, Math.min(99, p)); setYes(p); if (navigator.vibrate) navigator.vibrate(4); }, []);
  btE(() => {
    const mv = (e) => { if (dragging.current) set(e.touches ? e.touches[0].clientX : e.clientX); };
    const up = () => { dragging.current = false; setDrag(false); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', mv, { passive: false }); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', mv); window.removeEventListener('touchend', up); };
  }, [set]);
  const price = yes / 100; const payout = Math.round(stake / price);
  return (
    <div style={{ width: 380, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}><Chip tone="live">Live</Chip><Chip tone="hot">Hot</Chip></div>
      <div className="disp" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 18 }}>Will Simba SC win the Kariakoo derby?</div>
      {/* readout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div><div style={{ ...mono, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--yes-400)' }}>YES</div><div style={{ ...mono, fontSize: 34, fontWeight: 700, color: 'var(--yes-400)', lineHeight: 1 }}>{yes}<span style={{ fontSize: 15, color: 'var(--text-subtle)' }}>%</span></div></div>
        <div style={{ textAlign: 'right' }}><div style={{ ...mono, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--no-400)' }}>NO</div><div style={{ ...mono, fontSize: 34, fontWeight: 700, color: 'var(--no-400)', lineHeight: 1 }}>{100 - yes}<span style={{ fontSize: 15, color: 'var(--text-subtle)' }}>%</span></div></div>
      </div>
      {/* the dial */}
      <div ref={ref} onMouseDown={(e) => { dragging.current = true; setDrag(true); set(e.clientX); }} onTouchStart={(e) => { dragging.current = true; setDrag(true); set(e.touches[0].clientX); }}
        style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center', cursor: 'grab', touchAction: 'none', userSelect: 'none', marginBottom: 6 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'flex' }}>
          <div style={{ width: `${yes}%`, background: 'linear-gradient(90deg, var(--yes-700), var(--yes-500))' }} /><div style={{ flex: 1, background: 'linear-gradient(90deg, var(--no-600), var(--no-500))', opacity: 0.5 }} />
        </div>
        {/* value bubble */}
        <div style={{ position: 'absolute', left: `${yes}%`, top: drag ? -30 : -26, transform: 'translateX(-50%)', ...mono, fontSize: 11, fontWeight: 600, color: 'var(--gold-text)', background: 'var(--gold-500)', borderRadius: 'var(--r-sm)', padding: '2px 7px', opacity: drag ? 1 : 0, transition: 'opacity .15s, top .15s' }}>{yes}%</div>
        {/* gold handle */}
        <div style={{ position: 'absolute', left: `${yes}%`, transform: `translateX(-50%) scale(${drag ? 1.12 : 1})`, width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))', border: '2px solid var(--bg)', boxShadow: drag ? '0 0 0 6px oklch(80% 0.13 84 / 0.18), 0 2px 8px oklch(8% 0.05 264 / 0.6)' : '0 2px 6px oklch(8% 0.05 264 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .12s var(--ease-micro), box-shadow .15s' }}><span style={{ width: 2, height: 10, background: 'var(--gold-text)', opacity: 0.5, borderRadius: 2 }} /></div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', marginBottom: 16 }}>Drag the conviction needle · Buruta sindano</div>
      {/* payout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Stake <b style={{ color: 'var(--text)' }} className="mono">TZS {stake.toLocaleString()}</b> · if right</span>
        <span style={{ ...mono, fontSize: 19, fontWeight: 700, color: 'var(--gold-400)' }}>TZS {payout.toLocaleString()}</span>
      </div>
      <SidePair price={String(yes)} live />
    </div>
  );
}

/* round draggable variant */
function BetDialRound({ initial = 64 }) {
  const [yes, setYes] = btS(initial); const ref = btR(null); const dragging = btR(false);
  const set = btCB((cx, cy) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); const mx = cx - (r.left + r.width / 2); const my = cy - (r.top + r.height / 2); let ang = Math.atan2(my, mx); let t = (ang - Math.PI * 0.75); if (t < 0) t += Math.PI * 2; let p = Math.round((t / (Math.PI * 1.5)) * 100); p = Math.max(0, Math.min(100, p)); setYes(p); }, []);
  btE(() => { const mv = (e) => { if (dragging.current) { const t = e.touches ? e.touches[0] : e; set(t.clientX, t.clientY); } }; const up = () => { dragging.current = false; }; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up); window.addEventListener('touchmove', mv, { passive: false }); window.addEventListener('touchend', up); return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', mv); window.removeEventListener('touchend', up); }; }, [set]);
  return <div ref={ref} onMouseDown={(e) => { dragging.current = true; set(e.clientX, e.clientY); }} onTouchStart={(e) => { dragging.current = true; set(e.touches[0].clientX, e.touches[0].clientY); }} style={{ cursor: 'grab', touchAction: 'none', userSelect: 'none', width: 'fit-content' }}><ConvictionDial value={yes} size={150} /></div>;
}

function BettingDialBoard() {
  return <ScreenB>
    <HB sub="Your signature mechanic — kept. Same idea: drag the conviction needle to set your side and price; stake stays, payout moves live. Adjustments: gold handle, value bubble on drag, snap haptic (4ms), grab cursor, larger 24px touch target. YES stays left / green, NO right / rose, gold needle.">The betting dial · main feature</HB>
    <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div><SB>In context (drag me)</SB><BetDial /></div>
      <div>
        <SB>Variants to keep / adjust</SB>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, width: 300 }}>
            <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-subtle)', marginBottom: 12 }}>A · LINEAR (recommended)</div>
            <ConvictionSlider initial={64} />
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, width: 300, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-subtle)', marginBottom: 6 }}>B · ROUND (drag)</div><div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Compact gauge for tight card layouts.</div></div>
            <BetDialRound initial={64} />
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, width: 300 }}>
            <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-subtle)', marginBottom: 12 }}>C · READ-ONLY (in cards)</div>
            <ConvictionBar yes={64} />
          </div>
        </div>
      </div>
    </div>
  </ScreenB>;
}

Object.assign(window, { BetDial, BetDialRound, BettingDialBoard });
