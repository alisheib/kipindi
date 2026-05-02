import { Card, CardBody } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";

const items = [
  { label: "Total paid out", labelSw: "Yamelipwa jumla", value: 184_300_000, format: "tzs", sub: "Last 30 days" },
  { label: "Active players",  labelSw: "Wachezaji hai",    value: 12_840,      format: "plain", sub: "This week" },
  { label: "Biggest pool",    labelSw: "Bwawa kubwa",      value: 24_200_000, format: "tzs", sub: "Yanga vs Simba · 25 Apr" },
  { label: "Average payout",  labelSw: "Wastani wa malipo", value: 4_280,       format: "tzs", sub: "Per winning ticket" },
] as const;

export function StatsPanel() {
  return (
    <section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <Card key={it.label} className="relative overflow-hidden">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
            <CardBody className="space-y-1">
              <p className="text-micro uppercase tracking-[0.16em] text-text-tertiary font-bold">{it.label}</p>
              <p className="font-display font-bold text-title-md lg:text-title-lg tabular text-text leading-none mt-1.5">
                {it.format === "tzs" && <span className="text-gold">TZS </span>}
                <CountUp value={it.value} format={it.format === "tzs" ? "number" : "plain"} durationMs={1400} />
              </p>
              <p className="text-micro text-text-tertiary uppercase tracking-wider mt-1">{it.sub}</p>
              <p className="text-micro text-text-tertiary italic mt-0.5">{it.labelSw}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
