"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Pattern } from "@/components/ui/pattern";
import { CountUp } from "@/components/ui/count-up";
import { Share2 } from "lucide-react";

export function WinCelebration({
  open,
  onClose,
  amount,
  windowLabel,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  windowLabel: string;
}) {
  // Particle positions deterministic per render — quiet visually, never gaudy.
  const particles = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      id: i,
      dx: Math.cos((i / 36) * Math.PI * 2) * (80 + (i % 5) * 22),
      dy: Math.sin((i / 36) * Math.PI * 2) * (60 + (i % 5) * 18),
      size: 4 + ((i * 7) % 5),
      delay: (i % 12) * 18,
    })),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-celebration flex items-center justify-center p-3 kp-slide-up">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        role="alertdialog"
        aria-label="You won"
        className="relative max-w-md w-full rounded-2xl overflow-hidden border border-gold/40 kp-pop-in"
        style={{ background: "var(--g-jackpot)", boxShadow: "var(--glow-jackpot)" }}
      >
        <Pattern kind="sokoni" opacity={0.08} color="#FFFFFF" />
        <div className="relative z-10 p-7 text-center text-onBrand space-y-3">
          <p className="text-caption uppercase tracking-[0.22em] opacity-80">The {windowLabel} paid · Kimelipa</p>
          <div className="relative inline-flex flex-col items-center">
            {particles.map((p) => (
              <span
                key={p.id}
                aria-hidden
                className="absolute h-1 w-1 rounded-pill bg-gold kp-particle"
                style={{
                  ["--start-x" as string]: "0px",
                  ["--end-x" as string]: `${p.dx}px`,
                  ["--end-y" as string]: `${p.dy}px`,
                  height: `${p.size}px`,
                  width: `${p.size}px`,
                  animationDelay: `${p.delay}ms`,
                }}
              />
            ))}
            <p className="font-display font-bold text-display-1 tabular leading-none">
              <span className="text-gold drop-shadow-[0_0_24px_rgba(222,188,84,0.5)]">
                TZS <CountUp value={amount} format="number" durationMs={1400} />
              </span>
            </p>
          </div>
          <p className="text-body-lg opacity-90">You won · Umeshinda</p>
          <div className="flex gap-2 pt-3">
            <Button variant="gold" size="lg" leading={<Share2 size={16} />} fullWidth>Share · Shiriki</Button>
            <Button onClick={onClose} size="lg" className="bg-white/10 border border-white/20 text-onBrand hover:bg-white/20" fullWidth>
              Continue · Endelea
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
