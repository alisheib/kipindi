import Link from "next/link";
import { ArrowRight, Users, TrendingUp } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { MapigoMark } from "@/components/mapigo/mapigo-mark";
import { LivePill } from "@/components/betting/live-pill";
import { genWaveform } from "@/lib/mapigo-data";
import { formatTzsCompact } from "@/lib/utils";

export const metadata = { title: "Mapigo · Mini-game" };

export default function GamesPage() {
  const wave = genWaveform(80, 4);
  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-4 lg:py-6 space-y-5">
      <header className="space-y-1">
        <p className="text-caption uppercase tracking-[0.16em] text-text-tertiary font-bold">Mini-game · Mchezo mdogo</p>
        <h1 className="font-display text-title-lg text-text">Mapigo</h1>
      </header>

      {/* HERO TILE */}
      <Link href="/mapigo" className="block group">
        <Card interactive className="relative overflow-hidden border-gold-subtleHover/30 p-0">
          <div className="absolute inset-0 bg-g-brand" aria-hidden />
          <Pattern kind="sokoni" opacity={0.05} color="#FFFFFF" />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-20 h-72 w-96 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(222,188,84,0.32) 0%, rgba(222,188,84,0) 70%)" }}
          />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 p-5 lg:p-7 text-onBrand">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Chip variant="gold" size="sm">Signature game</Chip>
                <LivePill size="sm" />
              </div>
              <div className="flex items-center gap-2 -ml-1">
                <MapigoMark size={48} className="text-gold drop-shadow-[0_0_18px_rgba(222,188,84,0.55)]" />
                <h2 className="font-display font-bold text-display-3 lg:text-display-2 tabular leading-none">mapigo</h2>
              </div>
              <p className="text-body-lg opacity-85 max-w-prose">
                Feel the match. Bet the pulse. Every minute, a new round — predict <span className="text-gold font-bold">SPIKE</span>, <span className="text-gold font-bold">DRIFT</span>, or <span className="text-gold font-bold">CALM</span>. The pulse is real-time match intensity. Pool pays.
              </p>
              <p className="text-body-lg opacity-70 italic">Hisi mechi. Cheza mapigo.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="gold" size="xl" trailing={<ArrowRight size={18} />}>Play now · Cheza</Button>
                <Button size="xl" className="bg-white/10 border border-white/20 text-onBrand hover:bg-white/20 backdrop-blur-sm">How it works</Button>
              </div>
            </div>
            <div className="relative rounded-xl border border-gold/30 bg-black/25 backdrop-blur-md p-3 lg:p-4 self-stretch flex flex-col justify-between gap-3">
              <div>
                <p className="text-caption uppercase tracking-[0.18em] opacity-80 font-bold">Live pool</p>
                <p className="font-display font-bold text-display-3 tabular leading-none mt-1">
                  <span className="text-gold drop-shadow-[0_0_18px_rgba(222,188,84,0.5)]">{formatTzsCompact(740_000)}</span>
                </p>
              </div>
              <Sparkline data={wave.slice(-40)} color="#DEBC54" width={400} height={56} className="w-full" />
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15">
                <SmallStat label="Players" value="184" icon={<Users size={11} strokeWidth={2.5} />} />
                <SmallStat label="Round" value="#85" />
                <SmallStat label="Pace" value="60 BPM" icon={<TrendingUp size={11} strokeWidth={2.5} />} />
              </div>
            </div>
          </div>
        </Card>
      </Link>

      {/* HOW IT WORKS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <HowCard step="01" title="Watch the pulse" body="A real-time waveform tracks the intensity of the live match — shots, attacks, near-misses spike the line. Calm minutes flatten it." sub="Tazama mapigo ya mechi." />
        <HowCard step="02" title="Pick your call" body="Every 60 seconds a new round opens. Will the next minute SPIKE, DRIFT, or stay CALM? You have until the round band closes." sub="Chagua kati ya mwiba, tetemeka, au tulivu." />
        <HowCard step="03" title="Pool pays" body="Stakes for each call pool together. Winners share their pool — bigger stake, bigger share. Same fair math as the rest of Kipindi." sub="Madau hugawanywa kwa washindi." />
      </section>
    </div>
  );
}

function HowCard({ step, title, body, sub }: { step: string; title: string; body: string; sub: string }) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <p className="font-mono text-caption text-gold tracking-[0.18em] font-bold">{step}</p>
        <p className="font-display text-title-sm text-text leading-tight">{title}</p>
        <p className="text-body-sm text-text-secondary">{body}</p>
        <p className="text-caption text-text-tertiary italic">{sub}</p>
      </CardBody>
    </Card>
  );
}

function SmallStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 opacity-70">
        {icon}
        <p className="text-micro uppercase tracking-[0.14em] font-bold">{label}</p>
      </div>
      <p className="font-display font-bold text-body-lg tabular leading-tight mt-0.5">{value}</p>
    </div>
  );
}
