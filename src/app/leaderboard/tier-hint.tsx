"use client";

import { useId, useState } from "react";
import { TierBadge as KitTierBadge } from "@/components/ui/avatar";
import { InfoHint, InfoHintPanel } from "@/components/ui/info-hint";

type Tier = "bronze" | "silver" | "gold" | "diamond" | "sovereign";

/** A tier's explanation belongs in document flow: the table and podium can grow
 *  when asked, while the closed control still meets the 40px tap floor. */
export function TierHint({ tier, description }: { tier: Tier; description: string }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className={`inline-flex min-w-[var(--tap-min)] max-w-full flex-col items-start ${open ? "w-full" : "w-[var(--tap-min)] shrink-0"}`}>
      <InfoHint panelId={panelId} open={open} onToggle={() => setOpen((v) => !v)} className="my-0 justify-center py-0">
        <span aria-hidden><KitTierBadge tier={tier} /></span>
        <span className="sr-only">{description}</span>
      </InfoHint>
      <InfoHintPanel id={panelId} open={open} className="w-full min-w-0 break-words">
        {description}
      </InfoHintPanel>
    </div>
  );
}
