/* 50pick — brand surfaces ("things that don't exist yet, but could").
   Sovereign membership card · social share card · push notification ·
   achievement seals · splash/loading · empty state · phone springboard. */

/* guilloché rosette path (hypotrochoid) */
function rosette(R, rr, dd, loops = 5, cx = 50, cy = 50) {
  const r = R * rr, d = R * dd, k = (R - r) / r, steps = 320, pts = [];
  for (let i = 0; i <= steps; i++) { const th = (i / steps) * Math.PI * 2 * loops; pts.push(`${(cx + (R - r) * Math.cos(th) + d * Math.cos(k * th)).toFixed(1)} ${(cy + (R - r) * Math.sin(th) - d * Math.sin(k * th)).toFixed(1)}`); }
  return "M " + pts.join(" L ");
}

/* ---- Sovereign membership card ---- */
function MembershipCard({ name = "Amani Juma", tier = "SOVEREIGN", seed = "amani-juma-7781", no = "50 · 0042 · 7781", since = "2024" }) {
  return (
    <div className="memcard">
      <svg className="guil" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path d={rosette(46, 0.52, 0.66, 7)} fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.7" />
        <path d={rosette(30, 0.42, 0.58, 5)} fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.55" />
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
      </svg>
      <div className="sheen" />
      <div className="memcard-pad">
        <div className="memcard-row">
          <span className="memcard-tier"><I.crown s={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{tier}</span>
          <LockupH size={15} />
        </div>
        <div className="memcard-row" style={{ alignItems: "flex-end" }}>
          <span className="memcard-chip" />
          <IdentityAvatar seed={seed} name={name} size={48} kind="tipping" tier={tier.toLowerCase()} ring />
        </div>
        <div className="memcard-row" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="memcard-cap">Member · Mwanachama</div>
            <div className="memcard-name">{name}</div>
            <div className="memcard-no">{no}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="memcard-cap">Since</div>
            <div className="memcard-no" style={{ letterSpacing: "0.1em" }}>{since}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Social share / OG card ---- */
function ShareCard({ titleEn = "Will Yanga win the 2025/26 Ligi Kuu Bara title?", titleSw = "Je, Yanga watatwaa ubingwa?", yesPct = 58, category = "Sports · Michezo" }) {
  return (
    <div className="sharecard">
      <div className="sharecard-pad">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <LockupH size={18} />
          <span className="chip chip-signal" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><I.football s={12} />{category}</span>
        </div>
        <div className="sharecard-q">{titleEn}<div style={{ fontStyle: "italic", fontWeight: 400, fontSize: "0.62em", color: "var(--text-subtle)", marginTop: 8, fontFamily: "var(--font-body)" }}>{titleSw}</div></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
          <div>
            <div className="sharecard-pct">{yesPct}<span className="u">%</span></div>
            <div className="mcardp-pctcap" style={{ marginTop: 4 }}>YES chance · nafasi</div>
          </div>
          <div style={{ flex: 1, paddingBottom: 8 }}><TippingBar yesPct={yesPct} height={18} showLabels={false} recastOnHover={false} animate={false} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---- push notification on a lockscreen ---- */
function PushNotif({ title = "Tipping point reached · Kufikia kilele", text = "Yanga title odds just crossed 50% — the market is live.", time = "now" }) {
  return (
    <div className="push">
      <AppIcon size={42} />
      <div className="push-body">
        <div className="push-head"><span className="push-app">50pick</span><span className="push-time">{time}</span></div>
        <div className="push-title">{title}</div>
        <div className="push-text">{text}</div>
      </div>
    </div>
  );
}
function Lockscreen({ children }) {
  return (
    <div className="lockwall">
      <div className="lockwall-clock"><div style={{ fontSize: 52, lineHeight: 1 }}>9:41</div><div style={{ fontFamily: "var(--font-body)", fontWeight: 500, opacity: 0.85, marginTop: 2 }}>Jumanne · 2 Juni</div></div>
      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

/* ---- achievement seals ---- */
function Seal({ size = 86, emblem = "crown", locked = false, scallops = 18 }) {
  const id = "sl" + emblem + size;
  const pts = [];
  for (let i = 0; i < scallops * 2; i++) { const a = (i / (scallops * 2)) * Math.PI * 2 - Math.PI / 2; const rad = i % 2 === 0 ? 47 : 41; pts.push(`${(50 + Math.cos(a) * rad).toFixed(1)},${(50 + Math.sin(a) * rad).toFixed(1)}`); }
  const Emblem = I[emblem] || I.crown;
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-grid", placeItems: "center" }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: "absolute", inset: 0, filter: locked ? "none" : "drop-shadow(0 4px 10px oklch(8% 0.06 268 / 0.5))" }} aria-hidden>
        <defs><radialGradient id={id} cx="40%" cy="32%" r="80%">
          {locked ? <><stop offset="0%" stopColor="oklch(40% 0.02 268)" /><stop offset="100%" stopColor="oklch(28% 0.02 268)" /></>
                  : <><stop offset="0%" stopColor="oklch(92% 0.09 88)" /><stop offset="58%" stopColor="oklch(80% 0.13 82)" /><stop offset="100%" stopColor="oklch(62% 0.13 76)" /></>}
        </radialGradient></defs>
        <polygon points={pts.join(" ")} fill={`url(#${id})`} stroke={locked ? "oklch(34% 0.02 268)" : "oklch(56% 0.12 74)"} strokeWidth="0.8" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="33" fill="none" stroke={locked ? "oklch(46% 0.02 268)" : "oklch(58% 0.11 76 / 0.8)"} strokeWidth="1.2" />
        <circle cx="50" cy="50" r="30" fill={locked ? "oklch(33% 0.02 268)" : "oklch(74% 0.12 80 / 0.35)"} />
      </svg>
      <span style={{ position: "relative", color: locked ? "oklch(60% 0.01 268)" : "oklch(44% 0.10 74)" }}><Emblem s={size * 0.34} /></span>
    </span>
  );
}
function SealCard({ emblem, title, sub, locked }) {
  return (
    <div className={`seal${locked ? " is-locked" : ""}`}>
      <Seal emblem={emblem} locked={locked} />
      <div className="seal-cap"><b>{title}</b>{sub}</div>
    </div>
  );
}

/* ---- splash / loading ---- */
function Splash() {
  return (
    <div className="splash">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ animation: "splash-tip 2.6s ease-in-out infinite", transformOrigin: "50% 60%" }}><FiftyMark size={84} /></div>
        <div style={{ marginTop: 18 }}><WordmarkOnly size={26} /></div>
        <div className="splash-bar"><i /></div>
      </div>
      <style>{`@keyframes splash-tip{0%,100%{transform:rotate(-7deg);}50%{transform:rotate(7deg);}}
        @media (prefers-reduced-motion: reduce){ .splash [style*="splash-tip"]{animation:none!important;} .splash-bar i{animation:none!important;transform:translateX(120%);} }`}</style>
    </div>
  );
}

/* ---- empty state ---- */
function EmptyState() {
  return (
    <div className="empty">
      <div style={{ opacity: 0.4 }}><FiftyMark size={64} mono /></div>
      <h4>No markets here yet · Hakuna soko bado</h4>
      <p>When a question opens in this category, it lands here first. Be the one who sets the line.</p>
      <button className="btn btn-gold btn-md" style={{ marginTop: 4 }}><I.plus s={15} /> Propose a market</button>
    </div>
  );
}

/* ---- phone springboard ---- */
function Springboard() {
  const ghosts = ["Soko", "Wallet", "Yanga", "Habari", "Forex", "Hali", "Bunge", "More"];
  return (
    <div className="springboard">
      <div className="springboard-time">9:41</div>
      <div className="springboard-grid">
        <div className="sb-app"><AppIcon size={46} /><span className="lbl">50pick</span></div>
        {ghosts.map((g) => <div className="sb-app" key={g}><span className="ghost" /><span className="lbl">{g}</span></div>)}
      </div>
      <div className="springboard-dock">
        <span className="ghost" style={{ borderRadius: "23%", background: "oklch(100% 0 0 / 0.12)" }} />
        <span className="ghost" style={{ borderRadius: "23%", background: "oklch(100% 0 0 / 0.12)" }} />
        <span className="ghost" style={{ borderRadius: "23%", background: "oklch(100% 0 0 / 0.12)" }} />
        <span className="ghost" style={{ borderRadius: "23%", background: "oklch(100% 0 0 / 0.12)" }} />
      </div>
    </div>
  );
}

Object.assign(window, { MembershipCard, ShareCard, PushNotif, Lockscreen, Seal, SealCard, Splash, EmptyState, Springboard, rosette });
