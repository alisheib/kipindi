/* 50pick generative identity — JSX. Deterministic per-seed heraldic crests
   on the royal axis with the gilt soloist. Four directions; all circular so
   they slot into existing round Avatar contexts and stay legible 20→80px.
   Plus tier-ring integration + uploaded-photo fallback + reseed. */

/* ── deterministic PRNG ── */
function hashSeed(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function initialsFrom(name) { const parts = (name || "").trim().split(/\s+/).filter(Boolean); const a = parts[0]?.[0] || "?"; const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || ""); return (a + b).toUpperCase().slice(0, 2); }

/* derive per-seed params, all on the royal axis (hue 268 ± 22) */
function crestParams(seed) {
  const rnd = mulberry32(hashSeed(seed));
  const hue = 268 + Math.round((rnd() - 0.5) * 44);       // 246..290
  const tilt = -(8 + rnd() * 14);                          // -8..-22 (near brand -14)
  const charge = Math.floor(rnd() * 4);                    // glyph pick
  const petals = 3 + Math.floor(rnd() * 5);                // 3..7
  const rr = 0.30 + rnd() * 0.22;                          // guilloche ratio
  const dd = 0.30 + rnd() * 0.30;
  const stars = 5 + Math.floor(rnd() * 3);                 // 5..7
  const rot = rnd() * Math.PI * 2;
  const jitter = () => (rnd() - 0.5);
  return { rnd, hue, tilt, charge, petals, rr, dd, stars, rot, jitter };
}

/* ── Direction 1 · Tipping Sigil ── split YES/NO field + generative charge ── */
function CrestTipping({ seed, size = 80, initials }) {
  const p = crestParams(seed);
  const id = "ct" + hashSeed(seed).toString(36);
  const r = 50, cx = 50, cy = 50;
  const rad = (p.tilt * Math.PI) / 180, dx = Math.sin(rad) * 80, dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
  const small = size < 30;
  const charge = () => {
    if (small) return null;
    const g = "oklch(86% 0.13 82)";
    if (p.charge === 0) return <path d="M50 38 L53 47 L62 47 L55 52 L58 61 L50 55 L42 61 L45 52 L38 47 L47 47 Z" fill={g} opacity="0.95" />;        // mullet (star)
    if (p.charge === 1) return <path d="M50 39 L60 50 L50 61 L40 50 Z" fill="none" stroke={g} strokeWidth="2.4" />;                                    // lozenge
    if (p.charge === 2) return <g fill={g}><circle cx="50" cy="42" r="2.6"/><circle cx="44" cy="56" r="2.6"/><circle cx="56" cy="56" r="2.6"/></g>;   // three pips
    return <g fill="none" stroke={g} strokeWidth="2.4" strokeLinecap="round"><path d="M44 58 L50 40 L56 58"/><path d="M46 51 L54 51"/></g>;            // chevron
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-label="crest">
      <defs><clipPath id={id}><circle cx={cx} cy={cy} r={r - 1} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={`oklch(50% 0.10 152)`} />
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={`oklch(52% 0.11 22)`} />
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke="oklch(80% 0.13 84)" strokeWidth="2.4" strokeLinecap="round" />
        {charge()}
        {small && <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="34" fill="var(--pearl-50)">{initials}</text>}
      </g>
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="oklch(48% 0.20 268)" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={r - 3} fill="none" stroke="oklch(80% 0.13 84)" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

/* ── Direction 2 · Royal Monogram ── initials-forward, gilt chief w/ pips ── */
function CrestMonogram({ seed, size = 80, initials }) {
  const p = crestParams(seed);
  const id = "cm" + hashSeed(seed).toString(36);
  const small = size < 30;
  const chiefPips = 3 + (hashSeed(seed) % 3); // 3..5
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-label="crest">
      <defs>
        <radialGradient id={id} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor={`oklch(40% 0.165 ${p.hue})`} />
          <stop offset="100%" stopColor={`oklch(18% 0.130 ${p.hue})`} />
        </radialGradient>
        <clipPath id={id + "c"}><circle cx="50" cy="50" r="49" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id})`} />
      <g clipPath={`url(#${id}c)`}>
        {!small && <>
          <path d="M0 30 A 50 50 0 0 1 100 30 L100 22 L0 22 Z" fill="oklch(80% 0.13 84)" opacity="0.16" />
          <line x1="14" y1="30" x2="86" y2="30" stroke="oklch(82% 0.13 84)" strokeWidth="0.8" opacity="0.7" />
          {Array.from({ length: chiefPips }).map((_, i) => { const t = (i + 1) / (chiefPips + 1); return <circle key={i} cx={14 + t * 72} cy="25" r="1.5" fill="oklch(86% 0.13 82)" />; })}
        </>}
        <text x="50" y={small ? 52 : 60} textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize={small ? 38 : 34} fill="var(--pearl-50)" style={{ letterSpacing: "-0.02em" }}>{initials}</text>
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth="2" />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="oklch(80% 0.13 84)" strokeWidth="1" opacity="0.62" />
    </svg>
  );
}

/* ── Direction 3 · Guilloché Crest ── deterministic banknote rosette ── */
function CrestGuilloche({ seed, size = 80, initials }) {
  const p = crestParams(seed);
  const id = "cg" + hashSeed(seed).toString(36);
  const small = size < 30;
  // hypotrochoid rosette
  const R = 34, r = R * p.rr, d = R * (p.dd + 0.4);
  const k = (R - r) / r;
  const pts = [];
  const steps = 260;
  for (let i = 0; i <= steps; i++) { const th = (i / steps) * Math.PI * 2 * 3; const x = 50 + (R - r) * Math.cos(th) + d * Math.cos(k * th); const y = 50 + (R - r) * Math.sin(th) - d * Math.sin(k * th); pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`); }
  const path = "M " + pts.join(" L ");
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-label="crest">
      <defs><clipPath id={id}><circle cx="50" cy="50" r="49" /></clipPath></defs>
      <circle cx="50" cy="50" r="49" fill={`oklch(20% 0.135 ${p.hue})`} />
      <g clipPath={`url(#${id})`}>
        <circle cx="50" cy="50" r="49" fill="none" stroke={`oklch(34% 0.16 ${p.hue})`} strokeWidth="10" opacity="0.5" />
        {!small && <path d={path} fill="none" stroke="oklch(82% 0.13 84)" strokeWidth="0.7" opacity="0.62" />}
        {small
          ? <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="34" fill="var(--pearl-50)">{initials}</text>
          : <>
              <circle cx="50" cy="50" r="15" fill={`oklch(16% 0.12 ${p.hue})`} opacity="0.78" />
              <text x="50" y="51.5" textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="20" fill="var(--gilt)" style={{ letterSpacing: "-0.02em" }}>{initials}</text>
            </>}
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth="2" />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="oklch(80% 0.13 84)" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/* ── Direction 4 · Constellation Sigil ── deterministic star-chart ── */
function CrestConstellation({ seed, size = 80, initials }) {
  const p = crestParams(seed);
  const id = "cc" + hashSeed(seed).toString(36);
  const small = size < 30;
  const n = p.stars;
  const nodes = [];
  for (let i = 0; i < n; i++) { const a = p.rot + (i / n) * Math.PI * 2 + p.jitter() * 0.5; const rad = 22 + p.jitter() * 12; nodes.push([50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad]); }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-label="crest">
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor={`oklch(30% 0.15 ${p.hue})`} /><stop offset="100%" stopColor={`oklch(16% 0.125 ${p.hue})`} /></radialGradient>
        <clipPath id={id + "c"}><circle cx="50" cy="50" r="49" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id})`} />
      <g clipPath={`url(#${id}c)`}>
        {!small && <g stroke="oklch(80% 0.13 84)" strokeWidth="0.7" opacity="0.55" fill="none">
          {nodes.map((nd, i) => <line key={i} x1="50" y1="50" x2={nd[0].toFixed(1)} y2={nd[1].toFixed(1)} />)}
          <polygon points={nodes.map((nd) => `${nd[0].toFixed(1)},${nd[1].toFixed(1)}`).join(" ")} opacity="0.4" />
        </g>}
        {!small && nodes.map((nd, i) => <circle key={i} cx={nd[0].toFixed(1)} cy={nd[1].toFixed(1)} r={i === 0 ? 2.4 : 1.6} fill="oklch(86% 0.13 82)" />)}
        {small
          ? <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="34" fill="var(--pearl-50)">{initials}</text>
          : <circle cx="50" cy="50" r="6" fill="oklch(86% 0.13 82)" />}
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth="2" />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="oklch(80% 0.13 84)" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

const CREST_KINDS = {
  tipping: { C: CrestTipping, name: "Tipping Sigil", desc: "Split YES·NO field + a generative charge. The brand mark, personalised — the tipping metaphor as identity." },
  monogram: { C: CrestMonogram, name: "Royal Monogram", desc: "Initials over a seeded royal ground with a gilt chief of pips. The calm, most-legible default." },
  guilloche: { C: CrestGuilloche, name: "Guilloché Crest", desc: "A deterministic banknote rosette in gilt hairline. Reads ‘provably-fair / sovereign’ at any size." },
  constellation: { C: CrestConstellation, name: "Constellation Sigil", desc: "A unique star-chart per user — gilt nodes on royal night. Pure sigil, no letters needed." },
};

/* tier → ring + chip */
const TIER_RING = {
  bronze: "oklch(58% 0.09 70)", silver: "oklch(82% 0.018 268)", gold: "var(--gold-500)",
  diamond: "oklch(78% 0.13 80)", sovereign: "var(--gilt)",
};
function TierBadge({ tier }) {
  const letter = { sovereign: "S", diamond: "D", gold: "G", silver: "S", bronze: "B" }[tier];
  return <span title={tier} className={`tier-badge tier-${tier}`} style={{ width: 18, height: 18, fontSize: 9.5 }}>{letter}</span>;
}

/* unified identity avatar — crest | photo, optional tier ring + chip */
function IdentityAvatar({ seed, name, size = 80, kind = "tipping", src, tier, ring = false }) {
  const initials = initialsFrom(name || seed);
  const Crest = (CREST_KINDS[kind] || CREST_KINDS.tipping).C;
  const ringStyle = ring && tier ? { boxShadow: `0 0 0 2px var(--bg-elevated), 0 0 0 ${Math.max(2, size * 0.045)}px ${TIER_RING[tier]}${tier === "sovereign" ? ", 0 0 0 1px var(--gilt) inset" : ""}` } : undefined;
  return (
    <span className="crest-holder" style={{ width: size, height: size }}>
      <span style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "inline-grid", placeItems: "center", ...ringStyle }}>
        {src
          ? <img src={src} alt={name || "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <Crest seed={seed} size={size} initials={initials} />}
      </span>
      {ring && tier && <span className="crest-tier-chip" style={{ transform: size < 44 ? "scale(0.8)" : "none" }}><TierBadge tier={tier} /></span>}
    </span>
  );
}

Object.assign(window, { IdentityAvatar, TierBadge, CREST_KINDS, initialsFrom, hashSeed, crestParams, TIER_RING });
