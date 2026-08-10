/**
 * 50pick generative identity — deterministic per-seed heraldic crests on the
 * royal axis with the gilt soloist. Ported from Claude Design's Identity Sprint.
 * Four directions, all circular + legible 20→80px (initials fallback < 30px),
 * with tier-ring integration + uploaded-photo fallback. Pure dependency-free
 * SVG and no hooks → renders on the server (leaderboard, admin) and client alike.
 */

export type CrestKind = "tipping" | "monogram" | "guilloche" | "constellation";
export type Tier = "bronze" | "silver" | "gold" | "diamond" | "sovereign";

/* ── deterministic PRNG ── */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function initialsFrom(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || "");
  return (a + b).toUpperCase().slice(0, 2);
}

/* derive per-seed params, all on the royal axis (hue 268 ± 22) */
function crestParams(seed: string) {
  const rnd = mulberry32(hashSeed(seed));
  const hue = 268 + Math.round((rnd() - 0.5) * 44);
  const tilt = -(8 + rnd() * 14);
  const charge = Math.floor(rnd() * 4);
  const petals = 3 + Math.floor(rnd() * 5);
  const rr = 0.3 + rnd() * 0.22;
  const dd = 0.3 + rnd() * 0.3;
  const stars = 5 + Math.floor(rnd() * 3);
  const rot = rnd() * Math.PI * 2;
  const jitter = () => rnd() - 0.5;
  return { rnd, hue, tilt, charge, petals, rr, dd, stars, rot, jitter };
}

/**
 * ⭐ A MINIMUM STROKE, IN REAL PIXELS — because a viewBox unit is not a pixel.
 *
 * 🔴 THE DEFECT THIS FIXES, measured rather than judged. Every crest draws into a
 * `viewBox="0 0 100 100"`, so a stroke of `w` units renders as `w × size / 100` CSS px. The
 * crests shipped with hairlines of **0.7–0.8u** and gilt rings of **1u**, and at the six sizes
 * this component is actually used at — 20 · 28 · 40 · 48 · 56 · 80px — that is:
 *
 *      0.8u →  0.16px (20) · 0.32px (40) · 0.45px (56) · 0.64px (80)
 *      1.0u →  0.20px (20) · 0.40px (40) · 0.56px (56) · 0.80px (80)
 *
 * **Not one stroke reaches a single CSS pixel at any size the product renders.** So the gilt
 * chief, its pips and the inner gilt ring — the whole heraldic layer — were drawn, shipped, and
 * invisible. What reached the screen was initials in a gradient circle, which is why a
 * deterministic four-direction crest system reads as a generic identicon.
 *
 * ⛔ THIS IS A FLOOR, NOT A REPLACEMENT. `Math.max(designed, su(minPx, size))` keeps the
 * intended weight at 80px — where the original values are close to right — and only lifts the
 * stroke where geometry would otherwise erase it. Changing the values outright would have made
 * the large sizes heavier than they were designed to be, which is a taste change; this is not.
 */
const su = (cssPx: number, size: number) => (cssPx * 100) / size;

type CrestProps = { seed: string; size?: number; initials: string };

/* ── Direction 1 · Tipping Sigil ── split YES/NO field + generative charge ── */
function CrestTipping({ seed, size = 80, initials }: CrestProps) {
  const p = crestParams(seed);
  const id = "ct" + hashSeed(seed).toString(36);
  const r = 50, cx = 50, cy = 50;
  const rad = (p.tilt * Math.PI) / 180, dx = Math.sin(rad) * 80, dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
  const small = size < 30;
  const charge = () => {
    if (small) return null;
    const g = "oklch(86% 0.13 82)";
    if (p.charge === 0) return <path d="M50 38 L53 47 L62 47 L55 52 L58 61 L50 55 L42 61 L45 52 L38 47 L47 47 Z" fill={g} opacity="0.95" />;
    if (p.charge === 1) return <path d="M50 39 L60 50 L50 61 L40 50 Z" fill="none" stroke={g} strokeWidth={Math.max(2.4, su(1.5, size))} />;
    if (p.charge === 2) return <g fill={g}><circle cx="50" cy="42" r="2.6" /><circle cx="44" cy="56" r="2.6" /><circle cx="56" cy="56" r="2.6" /></g>;
    return <g fill="none" stroke={g} strokeWidth={Math.max(2.4, su(1.5, size))} strokeLinecap="round"><path d="M44 58 L50 40 L56 58" /><path d="M46 51 L54 51" /></g>;
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-hidden>
      <defs><clipPath id={id}><circle cx={cx} cy={cy} r={r - 1} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(50% 0.10 152)" />
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(52% 0.11 22)" />
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke="oklch(80% 0.13 84)" strokeWidth={Math.max(2.4, su(1.5, size))} strokeLinecap="round" />
        {charge()}
        {small && <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="34" fill="var(--pearl-50)">{initials}</text>}
      </g>
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="oklch(48% 0.20 268)" strokeWidth={Math.max(2.5, su(1.5, size))} />
      <circle cx={cx} cy={cy} r={r - 3} fill="none" stroke="oklch(80% 0.13 84)" strokeWidth={Math.max(0.8, su(1, size))} opacity="0.6" />
    </svg>
  );
}

/* ── Direction 2 · Royal Monogram ── initials-forward, gilt chief w/ pips ── */
function CrestMonogram({ seed, size = 80, initials }: CrestProps) {
  const p = crestParams(seed);
  const id = "cm" + hashSeed(seed).toString(36);
  const small = size < 30;
  const chiefPips = 3 + (hashSeed(seed) % 3);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-hidden>
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
          <line x1="14" y1="30" x2="86" y2="30" stroke="oklch(82% 0.13 84)" strokeWidth={Math.max(0.8, su(1, size))} opacity="0.7" />
          {Array.from({ length: chiefPips }).map((_, i) => { const t = (i + 1) / (chiefPips + 1); return <circle key={i} cx={14 + t * 72} cy="25" r={Math.max(1.5, su(1, size))} fill="oklch(86% 0.13 82)" />; })}
        </>}
        <text x="50" y={small ? 52 : 60} textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize={small ? 38 : 34} fill="var(--pearl-50)" style={{ letterSpacing: "-0.02em" }}>{initials}</text>
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth={Math.max(2, su(1.5, size))} />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="oklch(80% 0.13 84)" strokeWidth={Math.max(1, su(1, size))} opacity="0.62" />
    </svg>
  );
}

/* ── Direction 3 · Guilloché Crest ── deterministic banknote rosette ── */
function CrestGuilloche({ seed, size = 80, initials }: CrestProps) {
  const p = crestParams(seed);
  const id = "cg" + hashSeed(seed).toString(36);
  const small = size < 30;
  const R = 34, r = R * p.rr, d = R * (p.dd + 0.4);
  const k = (R - r) / r;
  const pts: string[] = [];
  const steps = 260;
  for (let i = 0; i <= steps; i++) { const th = (i / steps) * Math.PI * 2 * 3; const x = 50 + (R - r) * Math.cos(th) + d * Math.cos(k * th); const y = 50 + (R - r) * Math.sin(th) - d * Math.sin(k * th); pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`); }
  const path = "M " + pts.join(" L ");
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-hidden>
      <defs><clipPath id={id}><circle cx="50" cy="50" r="49" /></clipPath></defs>
      <circle cx="50" cy="50" r="49" fill={`oklch(20% 0.135 ${p.hue})`} />
      <g clipPath={`url(#${id})`}>
        <circle cx="50" cy="50" r="49" fill="none" stroke={`oklch(34% 0.16 ${p.hue})`} strokeWidth="10" opacity="0.5" />
        {!small && <path d={path} fill="none" stroke="oklch(82% 0.13 84)" strokeWidth={Math.max(0.7, su(1, size))} opacity="0.62" />}
        {small
          ? <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="34" fill="var(--pearl-50)">{initials}</text>
          : <>
              <circle cx="50" cy="50" r="15" fill={`oklch(16% 0.12 ${p.hue})`} opacity="0.78" />
              {/* ⛔ Q5: a player's INITIALS are the purest identity there is, so they do not wear
                  `var(--gilt)` — the money ink — however well it looked. The crest keeps its
                  warm metal through the guilloché stroke and rim above/below, which are raw
                  oklch and not the money tokens; only the token reference goes. */}
              <text x="50" y="51.5" textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="20" fill="oklch(86% 0.10 84)" style={{ letterSpacing: "-0.02em" }}>{initials}</text>
            </>}
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth={Math.max(2, su(1.5, size))} />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="oklch(80% 0.13 84)" strokeWidth={Math.max(1, su(1, size))} opacity="0.6" />
    </svg>
  );
}

/* ── Direction 4 · Constellation Sigil ── deterministic star-chart ── */
function CrestConstellation({ seed, size = 80, initials }: CrestProps) {
  const p = crestParams(seed);
  const id = "cc" + hashSeed(seed).toString(36);
  const small = size < 30;
  const n = p.stars;
  const nodes: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = p.rot + (i / n) * Math.PI * 2 + p.jitter() * 0.5; const rad = 22 + p.jitter() * 12; nodes.push([50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad]); }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor={`oklch(30% 0.15 ${p.hue})`} /><stop offset="100%" stopColor={`oklch(16% 0.125 ${p.hue})`} /></radialGradient>
        <clipPath id={id + "c"}><circle cx="50" cy="50" r="49" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id})`} />
      <g clipPath={`url(#${id}c)`}>
        {!small && <g stroke="oklch(80% 0.13 84)" strokeWidth={Math.max(0.7, su(1, size))} opacity="0.55" fill="none">
          {nodes.map((nd, i) => <line key={i} x1="50" y1="50" x2={nd[0].toFixed(1)} y2={nd[1].toFixed(1)} />)}
          <polygon points={nodes.map((nd) => `${nd[0].toFixed(1)},${nd[1].toFixed(1)}`).join(" ")} opacity="0.4" />
        </g>}
        {!small && nodes.map((nd, i) => <circle key={i} cx={nd[0].toFixed(1)} cy={nd[1].toFixed(1)} r={i === 0 ? 2.4 : 1.6} fill="oklch(86% 0.13 82)" />)}
        {small
          ? <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="34" fill="var(--pearl-50)">{initials}</text>
          : <circle cx="50" cy="50" r="6" fill="oklch(86% 0.13 82)" />}
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth={Math.max(2, su(1.5, size))} />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="oklch(80% 0.13 84)" strokeWidth={Math.max(1, su(1, size))} opacity="0.6" />
    </svg>
  );
}

const CREST: Record<CrestKind, (p: CrestProps) => React.ReactElement> = {
  tipping: CrestTipping,
  monogram: CrestMonogram,
  guilloche: CrestGuilloche,
  constellation: CrestConstellation,
};

/**
 * tier → ring colour (matches the `.tier-*` chord).
 *
 * ⭐ Q5, RESOLVED 2026-08-10: **RANK IS NOT MONEY, SO RANK DOES NOT WEAR THE MONEY INK.**
 * `gold` used to be `var(--gold-500)` and `sovereign` `var(--gilt)` — the same tokens the
 * payout seal and the struck amount use. M3 reserves struck gold for money that was EARNED,
 * and a tier ring is an achievement badge, not a payment. The two highest tiers were quietly
 * teaching a player that gold means "status" on the very ink that elsewhere means "you were
 * paid". Ali's call, with the Gold ASSET chip in `updown-card.tsx` (same ruling, same day).
 *
 * ⛔ THE RULE THAT COMES OUT OF IT, AND IT IS NARROWER THAN "NO GOLD ANYWHERE": **a tier may
 * be metallic; it may not wear the tokens the money surfaces own** — `--gilt`, `--gilt-metal`,
 * `--gold-300/400/500`. Stripping the ladder of warmth entirely would make a ladder named
 * bronze → silver → gold → diamond → sovereign meaningless, which is not an improvement.
 *
 * So: `gold` becomes **antique brass** — warm, but at 0.068 chroma against money gold's 0.11,
 * so it reads as a rank, not as an amount. `sovereign` becomes **platinum**, cool and lighter
 * than everything below it. ⭐ And `diamond` moved the furthest: it was
 * `oklch(78% 0.13 80)` — *more saturated than money gold, at almost the same hue*, which made
 * the worst offender the one tier nobody had thought to question. It is now icy cyan, which
 * is both lawful and what a diamond actually looks like.
 *
 * ⚠️ These five values are mirrored by the `.tier-*` chord in `globals.css`. Change one, change
 * both — and `test:contrast` now carries the badge pairs, which it did not before.
 */
export const TIER_RING: Record<Tier, string> = {
  bronze: "oklch(58% 0.09 70)", silver: "oklch(82% 0.018 268)", gold: "oklch(76% 0.068 88)",
  diamond: "oklch(86% 0.090 210)", sovereign: "oklch(88% 0.022 250)",
};

/** Unified identity avatar — crest | photo, optional tier ring. */
export function IdentityAvatar({
  seed,
  name,
  initials,
  size = 80,
  kind = "monogram",
  src,
  tier,
  ring = false,
  className,
}: {
  seed: string;
  name?: string;
  initials?: string;
  size?: number;
  kind?: CrestKind;
  src?: string;
  tier?: Tier;
  ring?: boolean;
  className?: string;
}) {
  const ini = (initials || initialsFrom(name || seed)).toUpperCase().slice(0, 2) || "?";
  const Crest = CREST[kind] || CREST.monogram;
  const ringStyle: React.CSSProperties | undefined =
    ring && tier
      // 🔴 THE SOVEREIGN INSET WAS THE HALF Q5 MISSED, found by auditing the close-out. The
      // TIER_RING table and the `.tier-*` chord were both moved off the money tokens, and this
      // inline `var(--gilt)` — the money ink itself — survived both edits, because it is the
      // one place the ring is composed in TSX rather than read from the table. It made the
      // file's own law (see TIER_RING above) false in its own render.
      // ⛔ It now takes the sovereign tier's own colour, so there is ONE definition of what a
      // sovereign ring looks like instead of two that disagreed.
      ? { boxShadow: `0 0 0 2px var(--bg-elevated), 0 0 0 ${Math.max(2, size * 0.045)}px ${TIER_RING[tier]}${tier === "sovereign" ? `, 0 0 0 1px ${TIER_RING.sovereign} inset` : ""}` }
      : undefined;
  return (
    <span className={"crest-holder" + (className ? " " + className : "")} style={{ width: size, height: size }}>
      <span style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "inline-grid", placeItems: "center", flexShrink: 0, ...ringStyle }}>
        {src
          ? <img src={src} alt={name || "User avatar"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <Crest seed={seed} size={size} initials={ini} />}
      </span>
    </span>
  );
}
