"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Pattern } from "@/components/ui/pattern";
import { LeaderboardRow } from "@/components/betting/leaderboard-row";
import { Avatar } from "@/components/ui/avatar";
import { leaderboard } from "@/lib/mock-data";

export default function LeaderboardPage() {
  const [tab, setTab] = useState("week");
  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="mx-auto max-w-[960px] px-3 lg:px-6 py-4 lg:py-6 space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-title-lg text-text">Leaderboard · Ubora</h1>
        <p className="text-body text-text-secondary">Ranked by ROI across all settled bets.</p>
      </header>

      <Tabs
        variant="pill"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "today",   labelEn: "Today · Leo" },
          { value: "week",    labelEn: "Week · Wiki" },
          { value: "month",   labelEn: "Month · Mwezi" },
          { value: "alltime", labelEn: "All-time · Vyote" },
        ]}
      />

      {/* Podium */}
      <section className="relative rounded-2xl overflow-hidden border-0 text-onBrand">
        <div className="absolute inset-0 bg-g-aurora kp-aurora" aria-hidden />
        <Pattern kind="mfumo" opacity={0.05} color="#FFFFFF" />
        <div className="relative z-10 p-5 lg:p-7 grid grid-cols-3 items-end gap-3">
          <Podium row={top3[1]} place={2} h={72} />
          <Podium row={top3[0]} place={1} h={104} winner />
          <Podium row={top3[2]} place={3} h={56} />
        </div>
      </section>

      <Card>
        <CardBody className="divide-y divide-border-divider">
          {leaderboard.map((r) => <LeaderboardRow key={r.rank} row={r} isYou={r.name === "You"} />)}
        </CardBody>
      </Card>
    </div>
  );
}

function Podium({ row, place, h, winner }: { row: { name: string; initials: string; roi: number }; place: number; h: number; winner?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar
        initials={row.initials}
        size={winner ? "xl" : "lg"}
        color={winner ? "var(--gold)" : "rgba(255,255,255,0.18)"}
        className={winner ? "shadow-glow-gold" : ""}
      />
      <p className="text-label font-semibold text-onBrand truncate text-center">{row.name}</p>
      <p className="text-caption opacity-80 tabular">+{row.roi}% ROI</p>
      <div
        className="w-full rounded-t-md backdrop-blur-sm flex items-start justify-center pt-1.5"
        style={{
          height: `${h}px`,
          background: winner ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)",
          boxShadow: winner ? "inset 0 1px 0 rgba(255,255,255,0.4)" : undefined,
        }}
      >
        <span className={`font-display font-bold text-title-md ${winner ? "text-gold" : "text-onBrand"}`}>{place}</span>
      </div>
    </div>
  );
}
