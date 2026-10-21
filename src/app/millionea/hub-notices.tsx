"use client";

import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { useT } from "@/lib/i18n";
import { markMillioneaNoticeSeenAction } from "./actions";

/** One notice as the hub hands it over: its words already said in the reader's language, and where its door goes. */
export type HubNotice = {
  weekId: string;
  notice: "ROLLOVER" | "WEEK_VOID" | "RESULT";
  text: string;
  door: { href: string; label: string } | null;
  /** M7 · the carried figure as the words say it, and the id its money run takes: the origin of this week's carry into
   *  its ledger (R1-hub M10, R1-motion H6) — set only on the rollover whose carry the hub's own week holds. */
  carry?: { figure: string; id: string };
};

/** The seen mark: through the instant the hub view was derived (`hub.asOf`, L7), never the server's clock at the mark. A
 *  mark is never load-bearing: one that fails records nothing, and the notice is said again next time. */
function markSeen(n: HubNotice, renderedAt: string): void {
  void markMillioneaNoticeSeenAction(n.weekId, n.notice, renderedAt).catch(() => {});
}

/** The words with the carried figure's own money run marked by `id` — the first `.amount` run that says it, found in the
 *  nodes the fact line drew (`keepFact` sets every figure in one), so the words and their runs are never drawn twice. */
function markFigure(node: ReactNode, figure: string, id: string): ReactNode {
  let done = false;
  const walk = (n: ReactNode): ReactNode => {
    if (done) return n;
    if (Array.isArray(n)) return n.map(walk);
    if (!isValidElement(n)) return n;
    const el = n as ReactElement<{ className?: string; children?: ReactNode }>;
    if (typeof el.props.className === "string" && /\bamount\b/.test(el.props.className) && el.props.children === figure) {
      done = true;
      return cloneElement(el as ReactElement<{ id?: string }>, { id });
    }
    return el.props.children === undefined ? el : cloneElement(el, undefined, walk(el.props.children));
  };
  return walk(node);
}

/**
 * THE HUB'S ONCE-PER-PLAYER-WEEK NOTICES (MASWALI-BUILD S5 composition; MASWALI-PLAN §10 §3.15–§3.16; DESIGN_AUTHORITY
 * §M8a item 10): the rollover in the past tense with no call to act, a week voided whole with every ticket back, and a
 * week's result — one line for the week, a figure only when every ticket the reader held shares one outcome (§F9.4).
 * ⭐ S5-DESIGN-HUB M9 · THE CALM BAR, NOT A BOX (§F9; §M8a item 10: "a RETURNING player gets the calm bar"): each notice is
 * the kit's `NoticeBar` — the platform's away bar (`away-summary-bar.tsx`) — across the page under the header, its door
 * the bar's own action (`NoticeBarAction`), as the v6 delivery's band draws it; it was a boxed `Callout` in the column.
 * ⭐ EACH PERFORMS ONCE, FOR ITS OWNER, THEN RESTS: it is marked seen as it is shown, and this island keeps the notices
 * it was first handed, so the hub's own refresh (which no longer carries them) never takes a line away mid-read.
 * ⛔ The calm tone always (`info`, the away bar's): a void or a refund is never claret, red or an error (M8); a win's door
 * opens the ticket, where the seal plays on the reader's own tap (§F9: never from a poll).
 */
export function HubNotices({ notices, renderedAt }: {
  notices: readonly HubNotice[];
  /** The hub view's `asOf`: the instant these notices were derived and rendered (L7). */
  renderedAt: string;
}) {
  const { locale } = useT();
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
    <div data-testid="millionea-hub-notices">
      {shown.map((n) => {
        // A "·"-joined notice is a fact line (S5 VIS A1); its figures stay whole in the money face.
        const facts = factsOf(n.text).map((f) => keepFact(locale, f));
        const words = <MaswaliFacts facts={n.carry ? (markFigure(facts, n.carry.figure, n.carry.id) as ReactNode[]) : facts} />;
        return (
          <NoticeBar
            key={`${n.weekId}|${n.notice}`}
            tone="info"
            glyph="info"
            testId={`millionea-hub-notice-${n.notice.toLowerCase()}`}
            action={n.door ? <NoticeBarAction tone="info" href={n.door.href}>{n.door.label}</NoticeBarAction> : undefined}
          >
            {words}
          </NoticeBar>
        );
      })}
    </div>
  );
}
