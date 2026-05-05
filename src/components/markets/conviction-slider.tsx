"use client";

/**
 * Conviction Slider — 50pick's signature buy gesture.
 *
 * Instead of a dropdown + amount-typed input, you drag a needle along
 * a TippingBar. Where you drop it expresses two things at once:
 *   1. SIDE — left of midpoint = YES, right = NO
 *   2. CONVICTION — distance from 50% maps to your stake
 *
 * Stake = base × (1 + |conviction|/50 × scale).  Default base 1,000.
 *
 * The needle visibly tilts toward your conviction, the side glows, and a
 * live payout calculation tracks under the bar. This is the gesture that
 * lives only on 50pick.
 *
 * Built entirely from kit tokens. No external libs.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { buyPositionAction } from "@/app/markets/actions";
import { BrandSpinner } from "@/components/brand";

type Side = "YES" | "NO";

const BASE_STAKE = 1_000;
const STAKE_CHIPS = [1, 2, 5, 10, 25, 50, 100]; // multipliers in thousands
const OPERATOR_MARGIN = 0.09;

function projectedPayout(yesPool: number, noPool: number, side: Side, stake: number): number {
  const winning = side === "YES" ? yesPool + stake : noPool + stake;
  const losing  = side === "YES" ? noPool : yesPool;
  if (winning === 0) return stake;
  return Math.round(stake + (stake / winning) * losing * (1 - OPERATOR_MARGIN));
}

const fmt = (n: number) => n.toLocaleString("en-US");

export function ConvictionSlider({
  marketId,
  yesPool,
  noPool,
  initialYesPct,
}: {
  marketId: string;
  yesPool: number;
  noPool: number;
  initialYesPct: number;
}) {
  // The needle position 0..100. Below 50 = YES side, above 50 = NO side.
  // Visual mapping: needle at 30% → YES, 70% strength.
  // We start neutral with a small lean toward whatever the crowd thinks.
  const start = Math.max(15, Math.min(85, initialYesPct < 50 ? 35 : 65));
  const [needle, setNeedle] = useState(start);
  const [stakeMult, setStakeMult] = useState(5); // 5k default
  const [pending, startTransition] = useTransition();
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const { toast } = useToast();
  const router = useRouter();

  // Map needle to side + conviction
  const side: Side = needle < 50 ? "YES" : "NO";
  const conviction = Math.round(Math.abs(needle - 50) * 2); // 0..100
  // Stake = base chip × (1 + conviction × scale)
  const stake = BASE_STAKE * stakeMult * (1 + conviction / 80);
  const stakeRounded = Math.max(100, Math.round(stake / 100) * 100);
  const payout = projectedPayout(yesPool, noPool, side, stakeRounded);

  // Animated tipping bar — render YES portion based on needle, NO from the other side
  const yesPortion = needle < 50 ? 50 + (50 - needle) : 50 - (needle - 50);

  // ── Pointer drag handling ──────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setNeedle(Math.max(2, Math.min(98, pct)));
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setNeedle(Math.max(2, Math.min(98, pct)));
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Keyboard accessibility — arrow keys nudge ±2, shift+arrow ±10
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft")  { e.preventDefault(); setNeedle((n) => Math.max(2, n - step)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setNeedle((n) => Math.min(98, n + step)); }
    if (e.key === "Home")       { e.preventDefault(); setNeedle(20); }
    if (e.key === "End")        { e.preventDefault(); setNeedle(80); }
  };

  const submit = () => {
    if (stakeRounded < 100) {
      toast({ title: "Stake must be at least TZS 100", variant: "warning" });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", side);
      fd.set("stake", String(stakeRounded));
      const r = await buyPositionAction(fd);
      if (!r.ok) {
        toast({ title: "Could not place", description: r.error, variant: "danger" });
      } else {
        toast({
          title: `${side} · TZS ${fmt(stakeRounded)}`,
          description: `If correct, you receive TZS ${fmt(r.data!.payoutIfWin)}`,
          variant: "success",
        });
        router.refresh();
      }
    });
  };

  // Tilt the needle visually — leaned in the direction of conviction
  const tilt = ((needle - 50) / 50) * 18;

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6">
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-subtle">Conviction · Imani</p>
          <p className="font-display text-[15px] font-semibold text-text">Drag the needle</p>
        </div>
        <p className="font-mono text-[10px] text-text-subtle italic">tap or drag · arrow keys</p>
      </div>
      <p className="text-[12px] text-text-muted mb-4 max-w-[40ch]">
        Where you drop it picks the side AND your stake. Closer to the edge = stronger conviction = bigger bet.
      </p>

      {/* The bar + needle */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Drag to set side and conviction"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(needle)}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="relative h-12 cursor-grab active:cursor-grabbing select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-pill"
      >
        {/* Track */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 rounded-pill border border-border bg-bg-overlay overflow-hidden"
        >
          {/* YES fill — left half */}
          <div
            className="absolute left-0 top-0 bottom-0 transition-[width] ease-stage rounded-l-pill"
            style={{
              width: `${needle < 50 ? yesPortion : 50}%`,
              background: "linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%)",
              boxShadow: "0 0 18px oklch(58% 0.16 152 / 0.4)",
              transition: "width 200ms cubic-bezier(.2,.8,.2,1)",
            }}
          />
          {/* NO fill — right half */}
          <div
            className="absolute right-0 top-0 bottom-0 transition-[width] ease-stage rounded-r-pill"
            style={{
              width: `${needle >= 50 ? yesPortion : 50}%`,
              background: "linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%)",
              boxShadow: "0 0 18px oklch(60% 0.18 22 / 0.4)",
              transition: "width 200ms cubic-bezier(.2,.8,.2,1)",
            }}
          />
          {/* Centre tick (50/50) */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-bg-elevated/60 pointer-events-none" />
        </div>
        {/* Needle */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `calc(${needle}% - 2px)`,
            width: 4,
            transition: "left 80ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <div
            className="h-full mx-auto rounded-pill"
            style={{
              width: 4,
              background: "oklch(96% 0.005 240)",
              transformOrigin: "50% 100%",
              transform: `rotate(${tilt}deg)`,
              boxShadow: "0 0 14px oklch(96% 0.005 240 / 0.7)",
            }}
          />
          {/* Grip handle */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-pill bg-bg-elevated border-2 border-text shadow-e4 pointer-events-none flex items-center justify-center"
            aria-hidden
          >
            <span className="block w-2 h-2 rounded-full" style={{ background: side === "YES" ? "oklch(70% 0.18 150)" : "oklch(65% 0.20 25)" }} />
          </div>
        </div>
      </div>

      {/* Side labels */}
      <div className="mt-2.5 flex items-baseline justify-between font-mono text-[11px]">
        <span className={`uppercase tracking-[0.16em] font-bold ${side === "YES" ? "text-yes-300" : "text-text-subtle"}`}>YES side</span>
        <span className="text-text-subtle italic">conviction {conviction}%</span>
        <span className={`uppercase tracking-[0.16em] font-bold ${side === "NO" ? "text-no-300" : "text-text-subtle"}`}>NO side</span>
      </div>

      {/* Stake multiplier chips */}
      <div className="mt-5 mb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">Base stake · Dau msingi</p>
        <div className="flex flex-wrap gap-1.5">
          {STAKE_CHIPS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setStakeMult(m)}
              className={`h-8 px-3 rounded-pill border font-mono text-[12px] transition-colors ${
                stakeMult === m ? "border-teal-300 bg-teal-500/15 text-text" : "border-border bg-bg-overlay text-text-muted hover:border-border-strong"
              }`}
            >
              {m}k
            </button>
          ))}
        </div>
      </div>

      {/* Output stack */}
      <div
        className="mt-4 rounded-md border p-4 transition-colors"
        style={{
          borderColor: side === "YES" ? "oklch(40% 0.10 152)" : "oklch(40% 0.12 22)",
          background: side === "YES" ? "oklch(18% 0.025 152)" : "oklch(18% 0.025 22)",
        }}
      >
        <p
          className="font-mono text-[9px] uppercase tracking-[0.14em] font-bold mb-1"
          style={{ color: side === "YES" ? "oklch(70% 0.10 152)" : "oklch(70% 0.13 22)" }}
        >
          You stake · Unaweka
        </p>
        <p className="font-mono text-[24px] font-bold tabular-nums leading-tight text-text" style={{ letterSpacing: "-0.02em" }}>
          TZS {fmt(stakeRounded)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-border-strong/40">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle">If {side} wins</p>
            <p className="font-mono text-[16px] font-bold tabular-nums text-gold-300" style={{ letterSpacing: "-0.01em" }}>
              TZS {fmt(payout)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle">Net if right</p>
            <p className="font-mono text-[16px] font-bold tabular-nums text-gold-300" style={{ letterSpacing: "-0.01em" }}>
              +TZS {fmt(payout - stakeRounded)}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-4 w-full h-14 rounded-lg font-display font-bold text-[16px] bg-gradient-to-b from-gold-400 to-gold-600 text-gold-fg border border-gold-700 hover:from-gold-300 hover:to-gold-500 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
      >
        {pending ? (
          <>
            <BrandSpinner size={24} />
            <span>Placing…</span>
          </>
        ) : (
          <>Confirm {side} · TZS {fmt(stakeRounded)}</>
        )}
      </button>
      <p className="mt-2.5 text-center text-[11px] text-text-subtle">
        Pool-share payout. Outcome may differ from the current odds.
      </p>
    </div>
  );
}
