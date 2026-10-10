/**
 * AKAUNTI — the journey's account hub, `/account` (the Vodacom plan S6, SJ-17; S6-PLAN WP5 as amended by A2, A3, A9,
 * A14 and A17; the S4 frames s4-8-akaunti, s4-8-akaunti-guest and s4-8-akaunti-staff, drawn in the kit's tokens).
 *
 * One page holding every door the classic More menu, avatar menu and phone header held, so that a journey phone — whose
 * header drops the language menu, the bell and the avatar — can still sign out, change language, read its
 * notifications, size its cards, open the Needle and reach the console (S6-PLAN Risks, "Unreachable doors on phones").
 *
 * ⛔ IT EXISTS ONLY FOR A JOURNEY REQUEST. The page's first act asks the one resolver (`resolveSimpleJourney`, the
 * shell's own answer for this request) and calls notFound() for everybody else — before a session, a word or a row is
 * read. A classic visitor who types the address gets today's not-found page; the root loader has streamed by then, so
 * the status is 200, not 404 — the served change S6 names for them (VODACOM-PLAN §0i, "account-streams-200").
 * ⛔ No loading file of its own (A3): a skeleton here would stream to every classic visitor before the gate.
 * ⭐ The reader is `loadHubViewer`'s, which composes every door through `viewerDoorsFor`; the rows are `hubRowsFor`'s, a
 * root of the route census (A9). This page reads no store and re-spells no rule — `test:journey-account` §1.
 * ⛔ THE CONSOLE IS ONE PLAIN DOCUMENT LINK, written once below and never in the rows data (E-70): a soft link into the
 * console would keep the player chrome around it. `test:shell-boundary` §2b and `red:shell-boundary` hold it.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { PageContainer } from "@/components/layout/page-container";
import { HubRowItem } from "@/components/journey/account/hub-row";
import { hubColumnCut, hubRowsFor, hubWord, wideRowCount, type HubGroup } from "@/components/journey/account/hub-rows";
import { SignOutRow } from "@/components/journey/account/sign-out-row";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { currentSession } from "@/lib/server/auth-service";
import { loadHubViewer } from "@/lib/server/hub-viewer";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { getServerT } from "@/lib/i18n-server";
import { keepNameEnd } from "@/components/ui/keep-words";
import { keepConnectives } from "@/components/ui/keep-run";
import { stemOf } from "@/lib/display-stem";

export const dynamic = "force-dynamic";

/**
 * ⭐ THE TAB TITLE OBEYS THE SAME SWITCH AS THE BODY (A2; the precedent is `profile/invite/page.tsx`). Metadata resolves
 * apart from the page, so without this a classic visitor who types the address would read "Akaunti" in the tab over a
 * not-found page. The resolver is asked first; anybody the journey is not shown to gets the not-found page's own
 * metadata (one home for its words) and noindex.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { journey } = await resolveSimpleJourney();
  if (!journey) return { ...(await notFoundMetadata()), robots: { index: false, follow: false } };
  const { t } = await getServerT();
  return { title: t.journey.tabAccount };
}

export default async function AccountHubPage() {
  const { journey } = await resolveSimpleJourney();
  if (!journey) notFound();
  const [{ t, locale }, session] = await Promise.all([getServerT(), currentSession()]);
  const viewer = await loadHubViewer(session?.userId ?? null);
  const groups = hubRowsFor(viewer);
  // ⭐ Two columns from 1024 that stack on their own (WP12's tiles, 2026-10-08): the cards in their one order, cut
  // once where the columns stand most nearly level (`hubColumnCut`). The staff card is always last, so it closes the
  // second column, weighed as the one row it is. Below 1024 the two columns stack into one, as before.
  const weights = groups.map((g) => wideRowCount(g.rows));
  if (viewer.signedIn && viewer.doors.staffConsole) weights.push(1);
  const cut = hubColumnCut(weights);
  const card = (g: HubGroup) => (
    <ul key={g.key} className="kp-hub__card" aria-label={hubWord(t, g.label)}>
      {g.rows.map((row) => <HubRowItem key={row.id} row={row} t={t} viewer={viewer} locale={locale} />)}
    </ul>
  );

  return (
    <PageContainer tier="reading">
      <div className="kp-hub" data-testid="journey-account-hub">
        {/* A display heading asks the one stem question every display heading asks (round 7, R7-C; `lib/display-stem.ts`). */}
        <h1 data-stem={stemOf(t.journey.tabAccount)} className="font-display text-title-lg font-bold leading-tight text-text">{t.journey.tabAccount}</h1>
        {viewer.signedIn ? (
          <div className="kp-hub__id">
            <span className="kp-hub__initials" aria-hidden>{viewer.initials}</span>
            <span className="kp-hub__who">
              {/* Balanced, and never one character alone on its last line (round 4, edges 236 240 244): `.kp-hub__name`. */}
              <span className="kp-hub__name">{keepNameEnd(viewer.name)}</span>
              <span className="kp-hub__phone">{viewer.phone}</span>
            </span>
          </div>
        ) : (
          <p className="kp-hub__prompt">{t.journey.hubGuestPrompt}</p>
        )}
        <div className="kp-hub__grid">
          <div className="kp-hub__col">{groups.slice(0, cut).map(card)}</div>
          <div className="kp-hub__col">
            {groups.slice(cut).map(card)}
            {viewer.signedIn && viewer.doors.staffConsole && (
              <ul className="kp-hub__card kp-hub__card--staff" aria-label={t.journey.hubGroupStaff}>
                <li>
                  <a href="/admin" className="kp-hub__row">
                    <span className="kp-hub__glyph" aria-hidden><I.server s={20} /></span>
                    <span className="kp-hub__text">
                      <span className="kp-hub__label">{keepConnectives(t.common.staffConsole)}</span>
                      <span className="kp-hub__sub">{t.journey.hubStaffSub}</span>
                    </span>
                    <I.externalLink s={18} className="kp-hub__chev" aria-hidden />
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>
        {viewer.signedIn && <SignOutRow />}
      </div>
    </PageContainer>
  );
}
