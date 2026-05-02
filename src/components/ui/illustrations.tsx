/**
 * Empty-state illustrations from spec §2.7 — abstract geometric, never literal.
 * 1 royal + 1 gold + 1 neutral max per illustration.
 */
import type { CSSProperties } from "react";

const baseProps = {
  viewBox: "0 0 200 160",
  xmlns: "http://www.w3.org/2000/svg",
  role: "img" as const,
};

const royal = "var(--royal)";
const gold = "var(--gold)";
const neutral = "var(--text-tertiary)";

export function NoBetsYet({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="No bets yet">
      <g transform="translate(100,80)">
        <path d="M -48 0 A 48 48 0 1 0 0 -48" stroke={royal} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.55} />
        <circle cx={28} cy={-28} r={6} fill={gold} />
      </g>
    </svg>
  );
}

export function WalletEmpty({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="Wallet empty">
      <g transform="translate(100,80)">
        <circle r={42} stroke={royal} strokeWidth={2} fill="none" opacity={0.5} />
        <path d="M -16 0 L 0 -16 L 16 0 L 0 16 Z" stroke={gold} strokeWidth={2} fill="none" />
        <circle r={3} fill={gold} />
      </g>
    </svg>
  );
}

export function KycPending({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="KYC pending">
      <g transform="translate(100,80)">
        <path d="M -36 -38 L 36 -38 L 36 14 Q 0 44 -36 14 Z" stroke={royal} strokeWidth={2} fill="none" opacity={0.5} />
        <circle r={18} stroke={gold} strokeWidth={2} fill="none" />
        <line x1={0} y1={-12} x2={0} y2={0} stroke={gold} strokeWidth={2} strokeLinecap="round" />
        <line x1={0} y1={0}   x2={9} y2={0} stroke={gold} strokeWidth={2} strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function NoLiveMatches({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="No live matches">
      <line x1={20} y1={120} x2={180} y2={120} stroke={neutral} strokeWidth={2} opacity={0.5} />
      <rect x={86}  y={56} width={8} height={64} rx={2} fill={royal} />
      <rect x={106} y={56} width={8} height={64} rx={2} fill={royal} />
      <circle cx={100} cy={36} r={6} fill={gold} />
    </svg>
  );
}

export function NoNotifications({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="No notifications">
      <g transform="translate(100,80)">
        <path d="M -22 -10 Q -22 -34 0 -34 Q 22 -34 22 -10 L 22 14 L -22 14 Z" stroke={royal} strokeWidth={2} fill="none" opacity={0.5} strokeLinejoin="round" />
        <circle cy={28} r={4} fill={gold} />
      </g>
    </svg>
  );
}

export function SearchEmpty({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="No results">
      <g transform="translate(100,80)">
        <circle r={32} stroke={royal} strokeWidth={2} fill="none" opacity={0.5} />
        <circle r={20} stroke={royal} strokeWidth={2} fill="none" opacity={0.7} />
        <circle cx={6} cy={6} r={3} fill={gold} />
        <line x1={22} y1={22} x2={42} y2={42} stroke={neutral} strokeWidth={2} strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function NoTransactions({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="No transactions">
      <line x1={30} y1={84} x2={170} y2={84} stroke={royal} strokeWidth={2} opacity={0.5} />
      <path d="M 92 80 L 100 88 L 116 72" stroke={gold} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Offline({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...baseProps} className={className} style={style} aria-label="Offline">
      <g transform="translate(100,90)" fill="none" strokeLinecap="round">
        <path d="M -36 -10 Q 0 -34 36 -10" stroke={royal} strokeWidth={2} opacity={0.4} />
        <path d="M -22 4   Q 0 -14 22 4"   stroke={royal} strokeWidth={2} opacity={0.6} strokeDasharray="2 4" />
        <path d="M -10 16  Q 0 8 10 16"   stroke={royal} strokeWidth={2} opacity={0.85} />
        <circle cy={26} r={3} fill={gold} />
      </g>
    </svg>
  );
}
