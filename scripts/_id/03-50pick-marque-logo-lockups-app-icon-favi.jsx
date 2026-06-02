/* 50pick — marque: logo lockups, app icon, favicon, prediction coin,
   and color/type specimen helpers. Reuses FiftyMark from brand.jsx. */

/* ---- wordmark lockups ---- */
function LockupH({ size = 26 }) {
  return (
    <span className="lockup" style={{ gap: size * 0.5 }}>
      <FiftyMark size={size * 1.5} />
      <span className="lockup-word" style={{ fontSize: size }}>
        <span className="ul">50pick</span><span className="tld" style={{ fontSize: size * 0.5 }}>.tz</span>
      </span>
    </span>
  );
}
function LockupStack({ size = 22 }) {
  return (
    <span className="lockup lockup--stack" style={{ gap: size * 0.45 }}>
      <FiftyMark size={size * 2.4} />
      <span className="lockup-word" style={{ fontSize: size }}>
        <span className="ul">50pick</span><span className="tld" style={{ fontSize: size * 0.5 }}>.tz</span>
      </span>
    </span>
  );
}
function WordmarkOnly({ size = 30, mono = false }) {
  return (
    <span className="lockup-word" style={{ fontSize: size, color: mono ? "currentColor" : undefined }}>
      <span className="ul" style={mono ? { borderColor: "currentColor" } : undefined}>50pick</span><span className="tld" style={{ fontSize: size * 0.5 }}>.tz</span>
    </span>
  );
}

/* ---- app icon (iOS squircle) ---- */
function AppIcon({ size = 96 }) {
  return (
    <span className="appicon" style={{ width: size, height: size }}>
      <span style={{ position: "relative", zIndex: 1, display: "grid", placeItems: "center" }}>
        <FiftyMark size={size * 0.62} />
      </span>
    </span>
  );
}

/* ---- favicon ---- */
function Favicon({ px = 32 }) {
  return (
    <span className="favchip">
      <span className="px" style={{ width: px + 12, height: px + 12 }}><FiftyMark size={px} /></span>
      <span className="cap">{px}px</span>
    </span>
  );
}

/* ---- prediction coin ("Pesa" credits) ---- */
function Coin({ size = 96, denom = "50", label = "PESA" }) {
  const id = "cn" + Math.round(size) + denom;
  const ticks = 60;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", filter: "drop-shadow(0 6px 14px oklch(8% 0.06 268 / 0.6))" }} aria-label={`${denom} ${label}`}>
      <defs>
        <radialGradient id={id + "f"} cx="38%" cy="32%" r="75%"><stop offset="0%" stopColor="oklch(94% 0.08 88)" /><stop offset="55%" stopColor="oklch(82% 0.13 82)" /><stop offset="100%" stopColor="oklch(66% 0.13 76)" /></radialGradient>
        <linearGradient id={id + "e"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(88% 0.11 86)" /><stop offset="100%" stopColor="oklch(60% 0.12 74)" /></linearGradient>
      </defs>
      {/* milled edge */}
      <circle cx="50" cy="50" r="48" fill={`url(#${id}e)`} />
      <g stroke="oklch(56% 0.11 74)" strokeWidth="0.8">
        {Array.from({ length: ticks }).map((_, i) => { const a = (i / ticks) * Math.PI * 2; return <line key={i} x1={50 + Math.cos(a) * 45} y1={50 + Math.sin(a) * 45} x2={50 + Math.cos(a) * 48} y2={50 + Math.sin(a) * 48} />; })}
      </g>
      <circle cx="50" cy="50" r="44" fill={`url(#${id}f)`} stroke="oklch(58% 0.12 76)" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="oklch(60% 0.10 78 / 0.7)" strokeWidth="0.8" />
      {/* relief number */}
      <text x="50" y="55.5" textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="700" fontSize="34" fill="oklch(52% 0.10 74)" style={{ letterSpacing: "-0.04em" }}>{denom}</text>
      <text x="50" y="54.5" textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="700" fontSize="34" fill="oklch(96% 0.06 90)" style={{ letterSpacing: "-0.04em" }}>{denom}</text>
      {/* legend arc */}
      <path id={id + "arc"} d="M22 50 A 28 28 0 0 1 78 50" fill="none" />
      <text fontFamily="'JetBrains Mono', monospace" fontSize="7.5" fontWeight="600" letterSpacing="3" fill="oklch(50% 0.10 74)"><textPath href={`#${id}arc`} startOffset="50%" textAnchor="middle">{label}</textPath></text>
    </svg>
  );
}

/* ---- color helpers ---- */
function Swatch({ name, token, color, fg }) {
  return (
    <div className="swatch">
      <div className="swatch-chip" style={{ background: color }} />
      <div className="swatch-meta"><div className="swatch-name">{name}</div><div className="swatch-tok">{token}</div></div>
    </div>
  );
}
function Ramp({ hue, stops, label }) {
  return (
    <div>
      <div className="tile-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="ramp">{stops.map((s, i) => <span key={i} style={{ background: s.c, color: i > 2 ? "oklch(20% 0.05 268)" : undefined }}>{s.l}</span>)}</div>
    </div>
  );
}

Object.assign(window, { LockupH, LockupStack, WordmarkOnly, AppIcon, Favicon, Coin, Swatch, Ramp });
