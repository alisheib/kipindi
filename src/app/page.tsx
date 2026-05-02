import { PitchGraphic } from "@/components/landing/pitch-graphic";
import { HeroStage } from "@/components/landing/stage";
import { WinnersFeed } from "@/components/landing/winners-feed";
import { StatementBand } from "@/components/landing/statement-band";
import { StatsPanel } from "@/components/landing/stats-panel";
import { MapigoShowcase } from "@/components/landing/mapigo-showcase";
import { FixturesGrid } from "@/components/landing/fixtures-grid";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-5 lg:py-8 space-y-9 lg:space-y-12">

      {/* THREE-COLUMN HERO — Pitch · Stage · Winners */}
      <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4 lg:gap-6 items-stretch">
        {/* Left: pitch graphic */}
        <div className="order-2 lg:order-1 hidden md:block">
          <div className="sticky top-12 h-full max-h-[640px] flex">
            <PitchGraphic className="w-full h-full max-h-[640px]" />
          </div>
        </div>

        {/* Center: stage */}
        <div className="order-1 lg:order-2 self-center">
          <HeroStage />
        </div>

        {/* Right: winners feed */}
        <div className="order-3">
          <div className="sticky top-12">
            <WinnersFeed />
          </div>
        </div>
      </section>

      {/* DUAL-LANGUAGE STATEMENT */}
      <StatementBand />

      {/* MAPIGO SHOWCASE */}
      <MapigoShowcase />

      {/* STATS PANEL */}
      <StatsPanel />

      {/* FIXTURES */}
      <FixturesGrid />

      {/* CLOSING / FOOTER */}
      <footer className="pt-6 mt-8 border-t border-border-divider">
        <div className="flex flex-col items-center gap-1 text-caption text-text-tertiary text-center">
          <p>Licensed by the Gaming Board of Tanzania · License No. <span className="font-mono">TZ-GBT-2026-XXXX</span> · 18+ only</p>
          <p>Helpline · Msaada: <span className="font-mono">0800 11 0011</span> · Self-exclusion · Kujitenga in Profile.</p>
          <p className="font-mono mt-1.5 tracking-[0.18em] uppercase">Kipindi · Tanzania-built · Mapigo signature</p>
        </div>
      </footer>
    </div>
  );
}
