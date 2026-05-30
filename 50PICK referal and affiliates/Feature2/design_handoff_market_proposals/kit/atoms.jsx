/* Atoms: Button, Chip, LiveDot, ProbabilityBar, Input, Avatar, TierBadge,
   Skeleton, Toast, Tooltip. All states. Concept system. */

const Btn = ({ variant = 'primary', size = 'md', loading, leadingIcon, trailingIcon, children, disabled, style, ...rest }) => (
  <button
    className={`btn btn-${variant} btn-${size}`}
    disabled={disabled || loading}
    style={style}
    {...rest}
  >
    {loading && <Spinner />}
    {!loading && leadingIcon}
    <span>{children}</span>
    {!loading && trailingIcon}
  </button>
);

const Spinner = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Chip = ({ variant = 'neutral', children, dot }) => (
  <span className={`chip chip-${variant}`}>
    {dot && <span className="live-dot" style={{ width: 6, height: 6 }} />}
    {children}
  </span>
);

const LiveDot = () => <span className="live-dot" />;

const ProbabilityBar = ({ yesPct, size = 'micro', resolved, showLabels, variant = 'split' }) => {
  const noPct = 100 - yesPct;
  // variant: 'split' (yes left + no right meet at boundary), 'segmented' (gap between),
  // 'minimal' (single fill, neutral track), 'lean' (only the leading side fills)
  if (variant === 'minimal') {
    const lead = yesPct >= 50 ? 'yes' : 'no';
    const fill = lead === 'yes' ? yesPct : noPct;
    return (
      <div className={`pbar pbar-${size}`} role="progressbar" aria-valuenow={yesPct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{
          position: 'absolute', inset: 0, width: `${fill}%`,
          background: lead === 'yes'
            ? 'linear-gradient(90deg, var(--yes-600), var(--yes-400))'
            : 'linear-gradient(90deg, var(--no-600), var(--no-400))',
          transition: 'width var(--ease-stage)',
        }} />
        {size === 'large' && showLabels && (
          <span className="pbar-label" style={{ left: 12 }}>
            {lead === 'yes' ? 'YES' : 'NO'} {fill}%
          </span>
        )}
      </div>
    );
  }
  if (variant === 'segmented') {
    return (
      <div style={{ display: 'flex', gap: 4, height: size === 'large' ? 24 : 12 }} role="progressbar" aria-valuenow={yesPct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{
          width: `${yesPct}%`, height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg, var(--yes-600), var(--yes-500))',
          transition: 'width var(--ease-stage)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 10,
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'oklch(15% 0.04 150)',
          minWidth: showLabels ? 50 : 0,
        }}>{size === 'large' && showLabels && `${yesPct}%`}</div>
        <div style={{
          width: `${noPct}%`, height: '100%', borderRadius: 999,
          background: 'linear-gradient(270deg, var(--no-600), var(--no-500))',
          transition: 'width var(--ease-stage)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'white',
          minWidth: showLabels ? 50 : 0,
        }}>{size === 'large' && showLabels && `${noPct}%`}</div>
      </div>
    );
  }
  return (
    <div className={`pbar pbar-${size} ${resolved ? 'pbar-resolved' : ''}`} role="progressbar" aria-valuenow={yesPct} aria-valuemin={0} aria-valuemax={100} aria-label={`YES probability ${yesPct}%`}>
      <div className="pbar-yes" style={{ width: `${yesPct}%` }} />
      <div className="pbar-no"  style={{ width: `${noPct}%` }} />
      {size === 'large' && showLabels && (
        <>
          <span className="pbar-label pbar-label-yes">{yesPct}%</span>
          <span className="pbar-label pbar-label-no">{noPct}%</span>
        </>
      )}
      {/* Boundary tick */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${yesPct}%`,
        width: 2, background: 'var(--bg-elevated)', transform: 'translateX(-1px)',
        opacity: 0.6, pointerEvents: 'none',
      }} />
    </div>
  );
};

/* Generic progress bar — for KYC, resolution countdown, win-loss session bars */
const ProgressBar = ({ value, max = 100, tone = 'teal', size = 'md', label, showValue }) => {
  const pct = Math.min(100, (value / max) * 100);
  const h = { sm: 4, md: 8, lg: 12 }[size];
  const tones = {
    teal:    'linear-gradient(90deg, var(--indigo-600), var(--indigo-400))',
    yes:     'linear-gradient(90deg, var(--yes-700),  var(--yes-500))',
    no:      'linear-gradient(90deg, var(--no-700),   var(--no-500))',
    gold:    'linear-gradient(90deg, var(--gold-600), var(--gold-400))',
    warning: 'linear-gradient(90deg, oklch(60% 0.16 80), var(--warning-500))',
    danger:  'linear-gradient(90deg, oklch(50% 0.20 25), var(--danger-500))',
    info:    'linear-gradient(90deg, oklch(48% 0.13 240), var(--info-500))',
  };
  return (
    <div style={{ width: '100%' }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
          {label && <span style={{ color: 'var(--text-muted)' }}>{label}</span>}
          {showValue && <span className="mono" style={{ color: 'var(--text-muted)' }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{
        height: h, borderRadius: 999, background: 'var(--bg-overlay)',
        border: '1px solid var(--border)', overflow: 'hidden',
      }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div style={{
          width: `${pct}%`, height: '100%', background: tones[tone],
          borderRadius: 999, transition: 'width var(--ease-stage)',
          boxShadow: `0 0 12px -2px color-mix(in oklab, ${tone === 'teal' ? 'var(--indigo-500)' : tone === 'yes' ? 'var(--yes-500)' : tone === 'no' ? 'var(--no-500)' : 'var(--gold-500)'} 50%, transparent)`,
        }} />
      </div>
    </div>
  );
};

/* Stepped progress — KYC wizard, multi-step flows */
const SteppedProgress = ({ steps, current }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {Array.from({ length: steps }).map((_, i) => (
      <div key={i} style={{
        flex: 1, height: 4, borderRadius: 999,
        background: i < current ? 'var(--indigo-400)' : i === current ? 'var(--indigo-500)' : 'var(--bg-overlay)',
        boxShadow: i === current ? '0 0 8px -1px color-mix(in oklab, var(--indigo-400) 60%, transparent)' : 'none',
        transition: 'background var(--ease-stage)',
      }} />
    ))}
  </div>
);

/* Circular progress — for confidence rings, session-time clocks */
const CircularProgress = ({ value, size = 56, stroke = 5, tone = 'teal', label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const colorMap = {
    teal: 'var(--indigo-400)', yes: 'var(--yes-400)', no: 'var(--no-400)',
    gold: 'var(--gold-400)', warning: 'var(--warning-500)',
  };
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--bg-overlay)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={colorMap[tone]} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset var(--ease-stage)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: size > 60 ? 14 : 11, fontWeight: 600,
      }}>{label || `${value}%`}</div>
    </div>
  );
};

const Input = ({ prefix, mono, placeholder, value, error, ...rest }) => {
  if (prefix) {
    return (
      <div className="input-group" style={error ? { borderColor: 'var(--danger-500)' } : null}>
        <span className="prefix">{prefix}</span>
        <input
          className={`input ${mono ? 'input-mono' : ''}`}
          placeholder={placeholder}
          defaultValue={value}
          {...rest}
        />
      </div>
    );
  }
  return (
    <input
      className={`input ${mono ? 'input-mono' : ''}`}
      placeholder={placeholder}
      defaultValue={value}
      style={error ? { borderColor: 'var(--danger-500)' } : null}
      {...rest}
    />
  );
};

const Avatar = ({ initials = 'AM', size = 'md', src, hue = 215 }) => (
  <span
    className={`avatar avatar-${size}`}
    style={src ? { backgroundImage: `url(${src})`, backgroundSize: 'cover' }
                : { background: `linear-gradient(135deg, oklch(55% 0.10 ${hue}), oklch(35% 0.08 ${hue}))` }}
  >
    {!src && initials}
  </span>
);

const TierBadge = ({ tier }) => {
  const letter = { bronze: 'B', silver: 'S', gold: 'G', diamond: 'D' }[tier];
  return <span className={`tier-badge tier-${tier}`} title={tier}>{letter}</span>;
};

const Skeleton = ({ w = '100%', h = 12, r = 6 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
);

const Toast = ({ kind = 'success', title, body }) => {
  const icon = { success: '✓', warning: '!', danger: '×', info: 'i' }[kind];
  return (
    <div className={`toast toast-${kind}`}>
      <div className="toast-icon">{icon}</div>
      <div>
        <div className="toast-title">{title}</div>
        <div className="toast-body">{body}</div>
      </div>
    </div>
  );
};

const Tooltip = ({ label, children }) => (
  <span className="tooltip">
    <span className="tooltip-popover">{label}</span>
    {children}
  </span>
);

/* ---------- Icons (a curated subset; full set documented in canvas) ---------- */
const Icon = ({ name, size = 18, stroke = 1.5 }) => {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const map = {
    politics:   <svg viewBox="0 0 24 24" {...s}><rect x="3" y="9"  width="18" height="12" rx="1.5"/><path d="M3 13h18"/><path d="M8 9V5h8v4"/><path d="M12 13v3"/></svg>,
    sports:     <svg viewBox="0 0 24 24" {...s}><path d="M5 4l14 14"/><path d="M3 6c2-3 6-3 8 0"/><circle cx="6" cy="6" r="1.5"/></svg>,
    macro:      <svg viewBox="0 0 24 24" {...s}><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/></svg>,
    weather:    <svg viewBox="0 0 24 24" {...s}><circle cx="8" cy="9" r="3"/><path d="M8 5V3M3.5 9h-2M11.6 5.4l1.4-1.4M4.4 5.4L3 4M11.6 12.6L13 14"/><path d="M6 18a4 4 0 0 1 4-4h6a3 3 0 1 1 0 6H10a4 4 0 0 1-4-2z"/></svg>,
    crypto:     <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M9 8h5a2.5 2.5 0 0 1 0 5H9V8z"/><path d="M9 13h6a2.5 2.5 0 0 1 0 5H9v-5z"/></svg>,
    culture:    <svg viewBox="0 0 24 24" {...s}><rect x="9" y="3"  width="6" height="11" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/><path d="M12 19v3"/></svg>,
    tech:       <svg viewBox="0 0 24 24" {...s}><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>,
    asterisk:   <svg viewBox="0 0 24 24" {...s}><path d="M12 4v16M5 8l14 8M5 16l14-8"/></svg>,
    predict:    <svg viewBox="0 0 24 24" {...s}><path d="M12 4l8 4v6c0 4-3.5 6-8 8-4.5-2-8-4-8-8V8l8-4z"/><path d="M9 12l2 2 4-4"/></svg>,
    share:      <svg viewBox="0 0 24 24" {...s}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></svg>,
    flag:       <svg viewBox="0 0 24 24" {...s}><path d="M5 3v18"/><path d="M5 4h12l-2 4 2 4H5"/></svg>,
    deposit:    <svg viewBox="0 0 24 24" {...s}><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>,
    withdraw:   <svg viewBox="0 0 24 24" {...s}><path d="M12 20V8"/><path d="M7 13l5-5 5 5"/><path d="M5 4h14"/></svg>,
    history:    <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    lock:       <svg viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
    shield:     <svg viewBox="0 0 24 24" {...s}><path d="M12 3l8 3v6c0 4.5-3.5 7-8 9-4.5-2-8-4.5-8-9V6l8-3z"/></svg>,
    audit:      <svg viewBox="0 0 24 24" {...s}><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
    hammer:     <svg viewBox="0 0 24 24" {...s}><path d="M14 4l6 6-3 3-6-6 3-3z"/><path d="M11 7L4 14l3 3 7-7"/></svg>,
    backup:     <svg viewBox="0 0 24 24" {...s}><path d="M5 19h14"/><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/></svg>,
    chain:      <svg viewBox="0 0 24 24" {...s}><path d="M9 15l6-6"/><path d="M10 6h2a4 4 0 0 1 4 4M14 18h-2a4 4 0 0 1-4-4"/></svg>,
    sms:        <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>,
    search:     <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>,
    bell:       <svg viewBox="0 0 24 24" {...s}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>,
    arrow:      <svg viewBox="0 0 24 24" {...s}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
    external:   <svg viewBox="0 0 24 24" {...s}><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5H5V5h5"/></svg>,
    check:      <svg viewBox="0 0 24 24" {...s}><path d="M5 12l5 5 9-11"/></svg>,
    close:      <svg viewBox="0 0 24 24" {...s}><path d="M6 6l12 12M18 6L6 18"/></svg>,
    plus:       <svg viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14"/></svg>,
    sun:        <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>,
    moon:       <svg viewBox="0 0 24 24" {...s}><path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z"/></svg>,
    globe:      <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
    /* ── extended for the affiliate feature (same 1.5px stroke style) ── */
    gift:       <svg viewBox="0 0 24 24" {...s}><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 13h18M12 9v11"/><path d="M12 9S10.5 4 8 4a2 2 0 0 0 0 4M12 9s1.5-5 4-5a2 2 0 0 1 0 4"/></svg>,
    copy:       <svg viewBox="0 0 24 24" {...s}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>,
    link:       <svg viewBox="0 0 24 24" {...s}><path d="M9 15l6-6"/><path d="M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1M13.5 17.5l-1 1a4 4 0 0 1-6-6l1-1"/></svg>,
    users:      <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2.5-4.6"/></svg>,
    coins:      <svg viewBox="0 0 24 24" {...s}><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M15 11.5c2.8.2 6 1.4 6 3.5s-3.2 3.3-6 3.5c-3.3 0-6-1.3-6-3"/></svg>,
    percent:    <svg viewBox="0 0 24 24" {...s}><path d="M19 5L5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>,
    ticket:     <svg viewBox="0 0 24 24" {...s}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M14 6v12" strokeDasharray="2 3"/></svg>,
    trophy:     <svg viewBox="0 0 24 24" {...s}><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3"/><path d="M12 13v4M9 21h6M10 17h4"/></svg>,
    megaphone:  <svg viewBox="0 0 24 24" {...s}><path d="M3 11v2a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M18 8a4 4 0 0 1 0 8"/></svg>,
    wallet:     <svg viewBox="0 0 24 24" {...s}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16.5 14h1.5"/></svg>,
    clock:      <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    pause:      <svg viewBox="0 0 24 24" {...s}><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>,
    info:       <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
    user:       <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>,
    chevron:    <svg viewBox="0 0 24 24" {...s}><path d="M9 6l6 6-6 6"/></svg>,
    whatsapp:   <svg viewBox="0 0 24 24" {...s}><path d="M4 20l1.4-4A8 8 0 1 1 9 18.6L4 20z"/><path d="M9 10c0 3 2 5 5 5 .6 0 1-.6.7-1.1l-.8-1.2-1.6.6c-.8-.4-1.4-1-1.8-1.8l.6-1.6-1.2-.8C9.6 9 9 9.4 9 10z"/></svg>,
    caretUp:    <svg viewBox="0 0 24 24" {...s}><path d="M6 15l6-6 6 6"/></svg>,
    caretDown:  <svg viewBox="0 0 24 24" {...s}><path d="M6 9l6 6 6-6"/></svg>,
    flame:      <svg viewBox="0 0 24 24" {...s}><path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .4-1.8 1-2.5C9 11 12 9 12 3z"/><path d="M12 21a5 5 0 0 0 5-5c0-2-1-3.5-2-4.5"/></svg>,
    calendar:   <svg viewBox="0 0 24 24" {...s}><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg>,
    tag:        <svg viewBox="0 0 24 24" {...s}><path d="M4 4h7l9 9-7 7-9-9V4z"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>,
    edit:       <svg viewBox="0 0 24 24" {...s}><path d="M5 19h14"/><path d="M14 5l5 5-9 9H5v-5l9-9z"/></svg>,
    checkCircle:<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>,
    xCircle:    <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>,
    doc:        <svg viewBox="0 0 24 24" {...s}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/></svg>,
  };
  return map[name] || <span style={{ width: size, height: size, display: 'inline-block' }} />;
};

Object.assign(window, { Btn, Spinner, Chip, LiveDot, ProbabilityBar, ProgressBar, SteppedProgress, CircularProgress, Input, Avatar, TierBadge, Skeleton, Toast, Tooltip, Icon });
