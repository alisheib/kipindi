"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { MapigoWaveform } from "@/components/mapigo/waveform";
import { genWaveform } from "@/lib/mapigo-data";

/**
 * Center "stage" of the Kinetic Stadium hero.
 * Animated waveform + hero copy + primary CTA.
 */
export function HeroStage() {
  const baseWave = genWaveform(120, 1);
  // simple sliding effect — re-roll a small seed every few seconds for the appearance of liveness
  const [seed, setSeed] = useState(1);
  const stale = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      stale.current = true;
      return;
    }
    const id = setInterval(() => setSeed((s) => (s + 1) % 8), 4_000);
    return () => clearInterval(id);
  }, []);
  const wave = stale.current ? baseWave : genWaveform(120, seed);

  return (
    <div className="relative flex flex-col gap-3 lg:gap-4">
      <div>
        <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Kipindi · Tanzania</p>
        <h1 className="font-display font-bold text-display-3 lg:text-display-2 leading-[1.02] tracking-tight text-text mt-2">
          Pick a window.<br />
          Pick a side.<br />
          <span className="text-gold drop-shadow-[0_0_24px_rgba(222,188,84,0.45)]">The pool pays.</span>
        </h1>
        <p className="font-display text-body-lg text-text-secondary italic mt-3 max-w-prose">
          Cheza kipindi chako · Hisi mechi · Bwawa la haki.
        </p>
      </div>
      <div className="relative rounded-xl border border-gold-subtleHover/30 bg-bg-elevated/40 backdrop-blur-sm overflow-hidden">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
        <MapigoWaveform data={wave} height={200} roundProgress={0.42} />
        <div className="px-3 py-2 flex items-center justify-between border-t border-border-divider/60">
          <div className="flex items-center gap-2">
            <span aria-hidden className="relative inline-flex">
              <span className="absolute h-2 w-2 rounded-pill bg-gold kp-ping" />
              <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
            </span>
            <p className="text-caption font-bold uppercase tracking-[0.16em] text-text">Mapigo · live signature game</p>
          </div>
          <p className="text-micro text-text-tertiary tabular font-mono">60 BPM · round #85</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <Link href="/auth/demo">
          <Button variant="gold" size="xl" trailing={<ArrowRight size={18} />}>Try demo · TZS 100,000</Button>
        </Link>
        <Link href="/live">
          <Button size="xl" className="border border-border-strong bg-surface/40 text-text hover:bg-surface backdrop-blur-sm">
            Browse matches · Tazama mechi
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <StageStat label="Live pool" value={<>TZS <CountUp value={10_520_000} format="number" durationMs={1500} /></>} accent />
        <StageStat label="Matches"   value={<CountUp value={4} format="plain" />} sub="live now" />
        <StageStat label="Players"   value="2.4k" sub="online" />
      </div>
    </div>
  );
}

function StageStat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface/50 backdrop-blur-sm px-3 py-2">
      <p className="text-micro uppercase tracking-[0.16em] text-text-tertiary font-bold">{label}</p>
      <p className={`font-display font-bold text-title-sm tabular leading-tight mt-0.5 ${accent ? "text-gold" : "text-text"}`}>{value}</p>
      {sub && <p className="text-micro text-text-tertiary uppercase tracking-wider mt-0.5">{sub}</p>}
    </div>
  );
}
