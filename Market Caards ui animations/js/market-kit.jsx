/* 50pick kit components reused by the market surfaces.
   Faithful ports of the /kit references (TippingBar, Button, Avatar,
   TierBadge, SignalPip) adapted from Next/TS to in-browser JSX. No visual
   changes — same classes, same OKLCH literals the kit hard-codes. */

const { useState, useEffect, useRef } = React;

function cn(...a) { return a.filter(Boolean).join(" "); }

/* ── Button — composes kit .btn classes (button.reference.tsx) ───────────── */
const BTN_VARIANT = {
  primary: "btn-primary", yes: "btn-yes", no: "btn-no", ghost: "btn-ghost",
  danger: "btn-danger", gold: "btn-gold", claret: "btn-claret",
  "aqua-ghost": "btn-aqua-ghost", secondary: "btn-ghost",
};
const BTN_SIZE = { sm: "btn-sm", md: "btn-md", lg: "btn-lg", xl: "btn-xl" };

function Button({ variant = "primary", size = "md", leading, trailing, fullWidth, className, children, ...rest }) {
  return (
    <button
      className={cn("btn", BTN_VARIANT[variant], BTN_SIZE[size], fullWidth && "is-full", className)}
      style={fullWidth ? { width: "100%" } : undefined}
      {...rest}
    >
      {leading}{children}{trailing}
    </button>
  );
}

/* ── Avatar — royal gradient w/ deterministic hue nudge ──────────────────── */
function offsetFor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 41) - 20;
}
const AV_SIZE = { xs: 20, sm: 28, md: 40, lg: 48, xl: 56 };
function Avatar({ initials, size = "md", seed, className }) {
  const cleaned = (initials || "?").replace(/\s+/g, "").slice(0, 2).toUpperCase() || "?";
  const hue = 258 + offsetFor(seed || cleaned);
  const dim = AV_SIZE[size] || 40;
  return (
    <span
      className={cn("avatar-seed", className)}
      style={{
        width: dim, height: dim, fontSize: dim * 0.36, borderRadius: "50%",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontWeight: 600, flexShrink: 0,
        background: `linear-gradient(135deg, oklch(54% 0.18 ${hue}), oklch(28% 0.15 ${hue}))`,
        color: "var(--pearl-50)",
        boxShadow: "0 0 0 1px color-mix(in oklab, var(--gilt) 30%, transparent) inset",
      }}
    >
      {cleaned}
    </span>
  );
}

/* ── TierBadge ───────────────────────────────────────────────────────────── */
function TierBadge({ tier, className }) {
  const letter = { sovereign: "S", diamond: "D", gold: "G", silver: "S", bronze: "B" }[tier];
  return <span title={tier} className={cn("tier-badge", `tier-${tier}`, className)}>{letter}</span>;
}

/* ── SignalPip — aqua-pulsing finishing detail ───────────────────────────── */
function SignalPip({ size = 8, className }) {
  return (
    <span aria-hidden className={className} style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: "var(--aqua-300)", boxShadow: "0 0 0 0 var(--aqua-glow)",
      animation: "aqua-pulse 2.2s ease-in-out infinite",
    }} />
  );
}

/* ── TippingBar — signature progress with the tilting gilt needle ────────── */
function TippingBar({ yesPct = 50, height = 28, animate = true, showLabels = true, recastOnHover = true, className }) {
  const target = Math.max(0, Math.min(100, yesPct));
  const [animYes, setAnimYes] = useState(target);
  const [sweepKey, setSweepKey] = useState(0);
  const recastTimer = useRef(null);
  useEffect(() => { setAnimYes(target); }, [target]);
  useEffect(() => () => { if (recastTimer.current) clearTimeout(recastTimer.current); }, []);

  const handleEnter = () => {
    if (!recastOnHover) return;
    if (recastTimer.current) clearTimeout(recastTimer.current);
    setSweepKey((k) => k + 1);
    setAnimYes(50);
    recastTimer.current = setTimeout(() => { recastTimer.current = null; setAnimYes(target); }, 50);
  };

  const yes = animYes, no = 100 - yes;
  const inner = Math.max(6, Math.min(94, yes));
  const tilt = ((inner - 50) / 44) * 14;
  const ease = animate
    ? "width 540ms cubic-bezier(.34,1.56,.64,1), transform 540ms cubic-bezier(.34,1.56,.64,1), left 540ms cubic-bezier(.34,1.56,.64,1)"
    : "none";
  const r = height / 2;
  const yesRadii = target === 100 ? { borderRadius: r } : { borderTopLeftRadius: r, borderBottomLeftRadius: r };
  const noRadii = target === 0 ? { borderRadius: r } : { borderTopRightRadius: r, borderBottomRightRadius: r };

  return (
    <div className={cn(className)} style={{ width: "100%" }}>
      <div
        onMouseEnter={handleEnter}
        role="progressbar" aria-valuenow={target} aria-valuemin={0} aria-valuemax={100}
        aria-label={`YES probability ${target}%`}
        style={{ position: "relative", height, background: "oklch(50% 0.20 268)", borderRadius: r, overflow: "visible", boxShadow: "inset 0 0 0 1px oklch(58% 0.17 268)" }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${yes}%`, background: "linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%)", ...yesRadii, transition: ease, boxShadow: "0 0 18px oklch(58% 0.16 152 / 0.35)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${no}%`, background: "linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%)", ...noRadii, transition: ease, boxShadow: "0 0 18px oklch(60% 0.18 22 / 0.35)" }} />
        <div style={{ position: "absolute", left: `calc(${inner}% - 1.5px)`, top: -6, bottom: -6, width: 3, background: "oklch(86% 0.13 82)", borderRadius: 2, transformOrigin: "50% 100%", transform: `rotate(${tilt}deg)`, transition: ease, boxShadow: "0 0 12px oklch(86% 0.13 82 / 0.55)" }} />
        {recastOnHover && sweepKey > 0 && (
          <div key={sweepKey} aria-hidden style={{ position: "absolute", inset: 0, borderRadius: r, overflow: "hidden", pointerEvents: "none" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, oklch(78% 0.13 80 / 0) 20%, oklch(78% 0.13 80 / 0.90) 50%, oklch(78% 0.13 80 / 0) 80%, transparent 100%)", backgroundSize: "35% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "-35% 0", animation: "tb-pbar-sweep 540ms cubic-bezier(.22,1,.36,1) both", mixBlendMode: "screen" }} />
          </div>
        )}
      </div>
      {showLabels && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em" }}>
          <span style={{ color: "var(--bar-label-yes)" }}>YES <strong style={{ color: "var(--bar-label-yes-strong)", fontWeight: target >= 50 ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>{target}%</strong></span>
          <span style={{ color: "var(--bar-label-tipping)", fontStyle: "italic", textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.10em", opacity: 0.85 }}>
            {Math.abs(target - 50) < 3 ? "tipping" : target > 50 ? "leans yes" : "leans no"}
          </span>
          <span style={{ color: "var(--bar-label-no)" }}><strong style={{ color: "var(--bar-label-no-strong)", fontWeight: target < 50 ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>{100 - target}%</strong> NO</span>
        </div>
      )}
      <style>{`
        @keyframes tb-pbar-sweep { 0% { background-position: -35% 0; opacity: 0; } 15% { opacity: 0.9; } 100% { background-position: 135% 0; opacity: 0; } }
      `}</style>
    </div>
  );
}

Object.assign(window, { cn, Button, Avatar, TierBadge, SignalPip, TippingBar });
