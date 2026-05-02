import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { MapigoMark } from "@/components/mapigo/mapigo-mark";
import { LivePill } from "@/components/betting/live-pill";
import { genWaveform } from "@/lib/mapigo-data";
import { formatTzsCompact } from "@/lib/utils";

export function MapigoShowcase() {
  const wave = genWaveform(80, 4);
  return (
    <section>
      <Link href="/mapigo" className="block group">
        <Card interactive className="relative overflow-hidden border-gold-subtleHover/40 p-0">
          <div className="absolute inset-0 bg-g-brand" aria-hidden />
          <Pattern kind="sokoni" opacity={0.05} color="#FFFFFF" />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-20 h-72 w-96 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(222,188,84,0.30) 0%, rgba(222,188,84,0) 70%)" }}
          />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 p-5 lg:p-7 text-onBrand">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Chip variant="gold" size="sm">Live in-play</Chip>
                <LivePill size="sm" />
              </div>
              <div className="flex items-center gap-2 -ml-1">
                <MapigoMark size={44} className="text-gold drop-shadow-[0_0_18px_rgba(222,188,84,0.55)]" />
                <h2 className="font-display font-bold text-display-3 lg:text-display-2 tabular leading-none text-white">mapigo</h2>
              </div>
              <p className="text-body-lg text-white/90 max-w-prose">
                Feel the match. Bet the pulse. Every minute, a new round — predict <span className="text-gold font-bold">SPIKE</span>, <span className="text-gold font-bold">DRIFT</span>, or <span className="text-gold font-bold">CALM</span>. The pulse is real-time match intensity. Pool pays.
              </p>
              <p className="text-body-lg text-white/75 italic">Hisi mechi. Cheza mapigo.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="gold" size="xl" trailing={<ArrowRight size={18} />}>Play now · Cheza</Button>
              </div>
            </div>
            <div className="relative rounded-xl border border-gold/30 bg-black/25 backdrop-blur-md p-3 lg:p-4 self-stretch flex flex-col justify-between gap-3 text-white">
              <div>
                <p className="text-caption uppercase tracking-[0.18em] text-white/80 font-bold">Live pool</p>
                <p className="font-display font-bold text-display-3 tabular leading-none mt-1">
                  <span className="text-gold drop-shadow-[0_0_18px_rgba(222,188,84,0.5)]">{formatTzsCompact(740_000)}</span>
                </p>
              </div>
              <Sparkline data={wave.slice(-40)} color="#DEBC54" width={400} height={56} className="w-full" />
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
                <div className="text-white">
                  <div className="flex items-center gap-1 text-white/75">
                    <Users size={11} strokeWidth={2.5} />
                    <p className="text-micro uppercase tracking-[0.14em] font-bold">Players</p>
                  </div>
                  <p className="font-display font-bold text-body-lg tabular leading-tight mt-0.5">184</p>
                </div>
                <div className="text-white">
                  <p className="text-micro text-white/75 uppercase tracking-[0.14em] font-bold">Round</p>
                  <p className="font-display font-bold text-body-lg tabular leading-tight mt-0.5">#85</p>
                </div>
                <div className="text-white">
                  <p className="text-micro text-white/75 uppercase tracking-[0.14em] font-bold">Pace</p>
                  <p className="font-display font-bold text-body-lg tabular leading-tight mt-0.5">60 BPM</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </section>
  );
}
