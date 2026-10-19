"use client";

/**
 * THE JOURNEY'S TABS — SJ-16 (the Vodacom plan S6; `S6-PLAN.md` WP6a with amendments A12, A17 and A18).
 *
 * Maswali · Juu/Chini · Tiketi zangu · Akaunti, below 1024 — and Millionea right after Juu/Chini while Maswali Millionea
 * is visible to the reader (Ali, 2026-10-19; DESIGN_AUTHORITY §M8a item 11). Built beside the classic `BottomNav`, never
 * inside it: AppShell (WP6b) renders this for a journey request and the classic rail for every other one.
 *
 * ── WHAT IS THE SAME AS THE CLASSIC RAIL, AND WHY ──────────────────────────────────────────────────────────────
 * The surface, the slot, the pip and the label are the classic rail's own classes, worn unchanged: one rail language on a
 * phone, whichever shell drew it. Since PHOSPHOR-MIGRATION W3 the pip is 56×32 around a 24px glyph, and the lit tab
 * draws its Fill glyph on the opaque `--nav-pill` (`NavGlyph`; R-INDICATOR 3B, R-RAIL 4B). The nav keeps the Needle's
 * keep-out, for the reason the classic rail gives (the fidget must never take a tap meant for a tab). Below 360 alone
 * the label may wrap (A17), and there the slots stack from the top so a two-line label cannot lift its pip above
 * its neighbours' (`globals.css`, the journey rail's rules).
 *
 * ── WHAT IS NOT, AND WHY ─────────────────────────────────────────────────────────────────────────────────────────
 *   · Four tabs — five while Millionea shows — from `journeyTabsFor`, in equal tracks: no centre coin, no More, no
 *     Juu/Chini accent dot (shelved). What More carried lives in Akaunti, which is a tab.
 *   · Which tab is lit comes from `activeTabFor` over the very list this rail draws — the one table and the one list the
 *     desktop links read too — and `aria-current` from `tabAriaCurrent` (A12): "page" on a tab's own page, "true" on the
 *     rest of its section.
 *   · A tab link carries no aria-label: its visible label is its name, and the Akaunti tab's unread words join it.
 *   · A guest's Tiketi zangu is a button that opens the guest sheet. ⛔ Never a link whose navigation is cancelled:
 *     the progress bar listens in the capture phase and would start for a tap that goes nowhere.
 *
 * ── ⛔ THE AKAUNTI DOT IS MOUNTED ONLY WHERE THE RAIL SHOWS ──────────────────────────────────────────────────────
 * It polls the bell's question every 30 s. From lg the header's bell does that instead, so the dot's counter is not
 * rendered there at all (`pollersAt`): one poller per width, never two.
 *
 * ── ⭐ MILLIONEA'S TAB (MASWALI-BUILD S5-TAB; DESIGN_AUTHORITY §M8a item 11) ──────────────────────────────────────
 * Its siblings' own slot, pip, lit pill and label; only the label's ink differs (`kp-millionea-ink`, the platform's three
 * money colours as one still gradient) and its glyph rests in gold (`kp-millionea-glyph` on the pip), while a lit
 * Millionea tab takes the siblings' treatment, its Fill glyph on the pill (both in globals.css). Shown on the shell's own
 * answer (`millionea`, the one the classic chrome's Millionea doors take). While five tabs show, the nav says so
 * (`data-tabs`): five equal tracks with their own centring widths, and the tickets tab says its short rail label
 * (`railLabel`). Without Millionea the rail is today's, byte for byte.
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavGlyph } from "@/components/ui/nav-glyph";
import { formatNumber } from "@/lib/utils";
import { Dot } from "@/components/ui/dot";
import { TicketsGuestSheet } from "@/components/journey/tickets-guest-sheet";
import { useT } from "@/lib/i18n";
import { activeTabFor, journeyTabsFor, tabAriaCurrent, tabLabel } from "@/lib/nav/active-tab";
import { pollersAt, useLgUp } from "@/lib/journey/one-poller";
import { useUnreadCount } from "@/lib/journey/use-unread-count";
import { useNotFoundShown } from "@/lib/not-found-mark";

/** One slot class for a tab link and for a guest's tab button alike: the two must read as the same kind of thing. */
const RAIL_ITEM = "kp-rail__item min-w-0";

/**
 * `userId` is the viewer's id, or null for a guest: the dot's counter is keyed by it (WP3). `millionea`: Maswali
 * Millionea is visible to this reader (AppShell's one answer), so its tab is drawn.
 */
export function JourneyTabs({ userId, millionea = false }: { userId: string | null; millionea?: boolean }) {
  const route = usePathname();
  const { t } = useT();
  const pollers = pollersAt(useLgUp());
  // ⭐ R4-J (2026-10-09) · A NOT-FOUND PAGE IS NO PAGE OF OURS, whatever its address says (`lib/not-found-mark.ts`): the
  // rail reads no path there — no tab lit (the market not-found lit Maswali) — and mounts no unread dot.
  const notFoundShown = useNotFoundShown();
  const pathname = notFoundShown ? null : route;
  const [sheetOpen, setSheetOpen] = useState(false);
  // The rail outlives the page: a sheet left open would wait over the page the reader went to.
  useEffect(() => { setSheetOpen(false); }, [route]);
  const tabs = journeyTabsFor(millionea);
  const active = activeTabFor(pathname, tabs);

  return (
    <>
      <nav
        aria-label={t.nav.primary}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail kp-rail--journey"
        data-tabs={tabs.length === 4 ? undefined : tabs.length}
        data-needle-keepout=""
        data-testid="journey-tabs"
      >
        <ul>
          {tabs.map((d) => {
            const on = active === d.key;
            const ink = d.key === "millionea";
            const label = tabLabel(t, d.railLabel ?? d.label);
            const body = (unread: number | null) => (
              <>
                {/* PHOSPHOR-MIGRATION W3 (R-INDICATOR 3B, R-RAIL 4B): the tab's Fill glyph on the opaque royal pill when it
                    is lit, at 24px in the classic rail's 56×32 pip. */}
                <span className={ink ? "kp-rail__pip kp-millionea-glyph" : "kp-rail__pip"}>
                  <NavGlyph glyph={d.glyph} on={on} s={24} restsUnlit />
                  {unread !== null && unread > 0 && <Dot tone="brand" size={8} className="kp-rail__badge" />}
                </span>
                <span className="kp-rail__label kp-jtab__label">{ink ? <span className="kp-millionea-ink">{label}</span> : label}</span>
                {unread !== null && unread > 0 && (
                  <span className="sr-only">{`, ${unread === 1 ? t.notif.unreadOne : t.notif.unreadN.replace("{n}", formatNumber(unread))}`}</span>
                )}
              </>
            );
            const content = d.key === "account" && userId !== null && pollers.dot && !notFoundShown
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
                    aria-current={tabAriaCurrent(pathname, d.key, tabs)}
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
