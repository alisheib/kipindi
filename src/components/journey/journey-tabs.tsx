"use client";

/**
 * THE JOURNEY'S FOUR TABS — SJ-16 (the Vodacom plan S6; `S6-PLAN.md` WP6a with amendments A12, A17 and A18).
 *
 * Maswali · Juu/Chini · Tiketi zangu · Akaunti, below 1024. Built beside the classic `BottomNav`, never inside it:
 * AppShell (WP6b) renders this for a journey request and the classic rail for every other one.
 *
 * ── WHAT IS THE SAME AS THE CLASSIC RAIL, AND WHY ──────────────────────────────────────────────────────────────
 * The surface, the slot, the 44×26 pip that wears `--pill-active` when current, and the label are the classic rail's
 * own classes, worn unchanged: one rail language on a phone, whichever shell drew it. The nav keeps the Needle's
 * keep-out, for the reason the classic rail gives (the fidget must never take a tap meant for a tab). Below 360 alone
 * the label may wrap (A17), and there the slots stack from the top so a two-line label cannot lift its pip above
 * its neighbours' (`globals.css`, the journey rail's rules).
 *
 * ── WHAT IS NOT, AND WHY ─────────────────────────────────────────────────────────────────────────────────────────
 *   · Four tabs, from `JOURNEY_TABS`, in equal tracks: no centre coin, no More, no Juu/Chini accent dot (shelved).
 *     What More carried lives in Akaunti, which is a tab.
 *   · Which tab is lit comes from `activeTabFor`, the one table the desktop links read too, and `aria-current` from
 *     `tabAriaCurrent` (A12): "page" on a tab's own page, "true" on the rest of its section.
 *   · A tab link carries no aria-label: its visible label is its name, and the Akaunti tab's unread words join it.
 *   · A guest's Tiketi zangu is a button that opens the guest sheet. ⛔ Never a link whose navigation is cancelled:
 *     the progress bar listens in the capture phase and would start for a tap that goes nowhere.
 *
 * ── ⛔ THE AKAUNTI DOT IS MOUNTED ONLY WHERE THE RAIL SHOWS ──────────────────────────────────────────────────────
 * It polls the bell's question every 30 s. From lg the header's bell does that instead, so the dot's counter is not
 * rendered there at all (`pollersAt`): one poller per width, never two.
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Dot } from "@/components/ui/dot";
import { TicketsGuestSheet } from "@/components/journey/tickets-guest-sheet";
import { useT } from "@/lib/i18n";
import { JOURNEY_TABS, activeTabFor, tabAriaCurrent, tabLabel } from "@/lib/nav/active-tab";
import { pollersAt, useLgUp } from "@/lib/journey/one-poller";
import { useUnreadCount } from "@/lib/journey/use-unread-count";

/** One slot class for a tab link and for a guest's tab button alike: the two must read as the same kind of thing. */
const RAIL_ITEM = "kp-rail__item min-w-0";

/** `userId` is the viewer's id, or null for a guest: the dot's counter is keyed by it (WP3). */
export function JourneyTabs({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const { t } = useT();
  const pollers = pollersAt(useLgUp());
  const [sheetOpen, setSheetOpen] = useState(false);
  // The rail outlives the page: a sheet left open would wait over the page the reader went to.
  useEffect(() => { setSheetOpen(false); }, [pathname]);
  const active = activeTabFor(pathname);

  return (
    <>
      <nav
        aria-label={t.nav.primary}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail kp-rail--journey"
        data-needle-keepout=""
        data-testid="journey-tabs"
      >
        <ul>
          {JOURNEY_TABS.map((d) => {
            const Ico = I[d.glyph];
            const on = active === d.key;
            const body = (unread: number | null) => (
              <>
                <span className="kp-rail__pip">
                  <Ico s={20} />
                  {unread !== null && unread > 0 && <Dot tone="brand" size={8} className="kp-rail__badge" />}
                </span>
                <span className="kp-rail__label kp-jtab__label">{tabLabel(t, d.label)}</span>
                {unread !== null && unread > 0 && (
                  <span className="sr-only">{`, ${unread === 1 ? t.notif.unreadOne : t.notif.unreadN.replace("{n}", String(unread))}`}</span>
                )}
              </>
            );
            const content = d.key === "account" && userId !== null && pollers.dot
              ? <TabUnread userId={userId}>{body}</TabUnread>
              : body(null);
            return (
              <li key={d.key} className="flex">
                {d.key === "tickets" && userId === null ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={sheetOpen}
                    onClick={() => setSheetOpen(true)}
                    className={RAIL_ITEM}
                    data-on={on ? "1" : undefined}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    href={d.href as never}
                    aria-current={tabAriaCurrent(pathname, d.key)}
                    className={RAIL_ITEM}
                    data-on={on ? "1" : undefined}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {userId === null && <TicketsGuestSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />}
    </>
  );
}

/**
 * The Akaunti tab's unread count, handed to the tab's own markup: an 8px brand dot on the pip's corner and, after
 * the label, the count in words for a screen reader, so the tab's name reads "Akaunti, 3 unread". Nothing while the
 * count is unknown or zero, and a count only ever for the viewer it was read for (`useUnreadCount`, WP3).
 * ⚠️ The counter lives in this component so that NOT rendering it is what stops the poll: the rail mounts it only
 * below lg, for a signed-in viewer.
 */
function TabUnread({ userId, children }: { userId: string; children: (unread: number | null) => ReactNode }) {
  const unread = useUnreadCount({ userId, mode: "poll" });
  return <>{children(unread)}</>;
}
