/**
 * Custom abstract tile art per mini-game — geometric, brand-aligned, never literal.
 * Each one is a 320×128 SVG that fills the tile header.
 */
import type { CSSProperties } from "react";

const royal = "var(--royal)";
const gold = "var(--gold)";
const goldHover = "var(--gold-hover)";

const baseProps = {
  viewBox: "0 0 320 128",
  xmlns: "http://www.w3.org/2000/svg",
  preserveAspectRatio: "xMidYMid slice",
  role: "img" as const,
};

const wrap = "absolute inset-0 w-full h-full";

export function ArtTribalClash({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={`${wrap} ${className ?? ""}`} style={style} aria-label="Tribal Clash">
      <defs>
        <linearGradient id="kp-tc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#102356" />
          <stop offset="55%" stopColor="#1E3E94" />
          <stop offset="100%" stopColor="#705210" />
        </linearGradient>
      </defs>
      <rect width={320} height={128} fill="url(#kp-tc-bg)" />
      {/* Left faction — three flame triangles */}
      {[0, 1, 2].map((i) => (
        <path key={`l${i}`} d={`M ${30 + i * 26} 100 L ${44 + i * 26} 60 L ${58 + i * 26} 100 Z`} fill={gold} opacity={0.85 - i * 0.15} />
      ))}
      {/* Right faction — three diamond shields */}
      {[0, 1, 2].map((i) => (
        <path key={`r${i}`} d={`M ${260 - i * 26} 64 L ${274 - i * 26} 44 L ${288 - i * 26} 64 L ${274 - i * 26} 84 Z`} fill="#FFFFFF" opacity={0.9 - i * 0.18} />
      ))}
      {/* Centre clash spark */}
      <circle cx={160} cy={64} r={3} fill={gold} />
      <circle cx={160} cy={64} r={10} fill="none" stroke={gold} strokeWidth={1} opacity={0.4} />
      <circle cx={160} cy={64} r={20} fill="none" stroke={gold} strokeWidth={1} opacity={0.2} />
    </svg>
  );
}

export function ArtLuckyInterval({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={`${wrap} ${className ?? ""}`} style={style} aria-label="Lucky Interval">
      <defs>
        <linearGradient id="kp-li-bg" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%"  stopColor="#705210" />
          <stop offset="50%" stopColor="#B58A21" />
          <stop offset="100%" stopColor="#DEBC54" />
        </linearGradient>
      </defs>
      <rect width={320} height={128} fill="url(#kp-li-bg)" />
      {/* Big dial */}
      <g transform="translate(160,64)">
        <circle r={48} fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.45} />
        <circle r={36} fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.25} />
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <line key={i} x1={0} y1={-48} x2={0} y2={-40} stroke="#FFFFFF" strokeWidth={2} transform={`rotate(${deg})`} opacity={0.85} />
        ))}
        {/* Pointer */}
        <line x1={0} y1={0} x2={0} y2={-30} stroke="#0A1838" strokeWidth={3} strokeLinecap="round" transform="rotate(40)" />
        <circle r={4} fill="#0A1838" />
      </g>
    </svg>
  );
}

export function ArtMomentumRush({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={`${wrap} ${className ?? ""}`} style={style} aria-label="Momentum Rush">
      <defs>
        <linearGradient id="kp-mr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#060F24" />
          <stop offset="100%" stopColor="#1E3E94" />
        </linearGradient>
        <linearGradient id="kp-mr-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"  stopColor="#705210" />
          <stop offset="60%" stopColor="#B58A21" />
          <stop offset="100%" stopColor="#DEBC54" />
        </linearGradient>
      </defs>
      <rect width={320} height={128} fill="url(#kp-mr-bg)" />
      {/* Vertical bars */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const heights = [40, 56, 72, 96, 80, 64];
        const x = 60 + i * 36;
        return (
          <rect key={i} x={x} y={128 - heights[i]} width={20} height={heights[i]} rx={4} fill={i === 3 ? "url(#kp-mr-bar)" : "rgba(255,255,255,0.18)"} />
        );
      })}
    </svg>
  );
}

export function ArtStreakChain({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={`${wrap} ${className ?? ""}`} style={style} aria-label="Streak Chain">
      <defs>
        <radialGradient id="kp-sc-bg" cx="0.5" cy="0" r="1">
          <stop offset="0%"  stopColor="#DEBC54" />
          <stop offset="40%" stopColor="#B58A21" />
          <stop offset="80%" stopColor="#4D380B" />
          <stop offset="100%" stopColor="#060F24" />
        </radialGradient>
      </defs>
      <rect width={320} height={128} fill="url(#kp-sc-bg)" />
      {/* Chain links */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse
          key={i}
          cx={50 + i * 44}
          cy={64}
          rx={16}
          ry={10}
          fill="none"
          stroke={i < 4 ? "#FFFFFF" : "rgba(255,255,255,0.35)"}
          strokeWidth={i < 4 ? 4 : 2}
          opacity={i < 4 ? 1 : 0.6}
        />
      ))}
    </svg>
  );
}

export function ArtVoiceBet({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={`${wrap} ${className ?? ""}`} style={style} aria-label="Voice Bet">
      <defs>
        <linearGradient id="kp-vb-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#1E3E94" />
          <stop offset="50%" stopColor="#4F70C2" />
          <stop offset="100%" stopColor="#B58A21" />
        </linearGradient>
      </defs>
      <rect width={320} height={128} fill="url(#kp-vb-bg)" />
      {/* Mic + waveform */}
      <g transform="translate(80,64)">
        <rect x={-12} y={-22} width={24} height={36} rx={12} fill={gold} />
        <path d="M -22 4 Q -22 28 0 28 Q 22 28 22 4" stroke={gold} strokeWidth={3} fill="none" strokeLinecap="round" />
        <line x1={0} y1={28} x2={0} y2={40} stroke={gold} strokeWidth={3} strokeLinecap="round" />
      </g>
      {/* Waveform bars */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const amps = [16, 28, 44, 36, 56, 32, 48, 24, 18];
        return (
          <rect key={i} x={140 + i * 16} y={64 - amps[i] / 2} width={6} height={amps[i]} rx={2} fill="#FFFFFF" opacity={0.85 - i * 0.06} />
        );
      })}
    </svg>
  );
}

export const ART: Record<string, (p: { className?: string; style?: CSSProperties }) => JSX.Element> = {
  tribal: ArtTribalClash,
  lucky: ArtLuckyInterval,
  momentum: ArtMomentumRush,
  streak: ArtStreakChain,
  voice: ArtVoiceBet,
};
