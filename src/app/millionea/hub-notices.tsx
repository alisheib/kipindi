"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { moneyRuns } from "@/lib/fill-nodes";
import { markMillioneaNoticeSeenAction } from "./actions";

/** One notice as the hub hands it over: its words already said in the reader's language, and where its door goes. */
export type HubNotice = {
  weekId: string;
  notice: "ROLLOVER" | "WEEK_VOID" | "RESULT";
  text: string;
  door: { href: string; label: string } | null;
};

/** The seen mark: through the instant the hub view was derived (`hub.asOf`, L7), never the server's clock at the mark. A
 *  mark is never load-bearing: one that fails records nothing, and the notice is said again next time. */
function markSeen(n: HubNotice, renderedAt: string): void {
  void markMillioneaNoticeSeenAction(n.weekId, n.notice, renderedAt).catch(() => {});
}

/**
 * THE HUB'S ONCE-PER-PLAYER-WEEK NOTICES (MASWALI-BUILD S5 composition; MASWALI-PLAN §10 §3.15–§3.16; DESIGN_AUTHORITY
 * §M8a item 10): the rollover in the past tense with no call to act, a week voided whole with every ticket back, and a
 * week's result — one line for the week, a figure only when every ticket the reader held shares one outcome (§F9.4).
 * ⭐ EACH PERFORMS ONCE, FOR ITS OWNER, THEN RESTS: it is marked seen as it is shown, and this island keeps the notices
 * it was first handed, so the hub's own refresh (which no longer carries them) never takes a line away mid-read.
 * ⛔ Neutral tone always: a void or a refund is never claret, red or an error (M8); a win's door opens the ticket, where
 * the seal plays on the reader's own tap (§F9: never from a poll).
 */
export function HubNotices({ notices, renderedAt }: {
  notices: readonly HubNotice[];
  /** The hub view's `asOf`: the instant these notices were derived and rendered (L7). */
  renderedAt: string;
}) {
  const [shown] = useState(notices);
  const marked = useRef(new Set<string>());
  useEffect(() => {
    for (const n of shown) {
      const key = `${n.weekId}|${n.notice}`;
      if (marked.current.has(key)) continue;
      marked.current.add(key);
      markSeen(n, renderedAt);
    }
  }, [shown, renderedAt]);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="millionea-hub-notices">
      {shown.map((n) => (
        <Callout key={`${n.weekId}|${n.notice}`} tone={n.notice === "RESULT" ? "info" : "neutral"} glyph="info" role="status">
          <span className="flex flex-col gap-1">
            <span>{moneyRuns(n.text)}</span>
            {n.door && (
              <Link href={n.door.href as never} className="inline-flex items-center gap-1 self-start text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }}>
                {n.door.label}
                <I.chevronRight s={14} edge="end" />
              </Link>
            )}
          </span>
        </Callout>
      ))}
    </div>
  );
}
