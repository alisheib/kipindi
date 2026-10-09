"use client";

/**
 * THE JOURNEY'S LOADING STATE, PAGE BY PAGE (2026-10-09, the Vodacom visual pass round 4, R4-J; E38) — what the ROOT
 * loading file draws for a journey reader: the ghost of the page being opened, in that page's own column, so the page
 * lands where its ghost stood.
 *
 * ⭐ WHY THE ROOT'S LOADING STATE IS THE ONE THAT SHOWS. The root loading file wraps every page below the root layout,
 * and it is the one a reader meets first: on a document load (React 19.2 sends a finished page AFTER the shell, so the
 * shell's fallback is what paints first; AppShell's note at the journey header has the mechanism), and on every move to
 * a page whose loading state the browser does not hold yet — always on a dev server, and on production until the link's
 * prefetch has landed. It was the generic SectionLoader for everybody: a 360px box with the logo, measured on the Slow
 * 3G tiles at y253–612 on a phone (277 280) and x32–1247 × y209–568 at 1280 (290 293 296) — where /positions and
 * /account land their h1 at y206–228 on a phone (278 281) and their column at x132–1147, h1 y162, at 1280 (294 297).
 * And /positions never showed the Tiketi zangu ghost its own loading file draws: the root's box stood in front of it.
 *
 * ⭐ WHAT EACH PAGE GETS, picked in the browser by the path (`RoutePick`: the root's loading element is drawn once, with
 * the document, and kept), every node drawn here — in the browser since round 5 (below), and on the server for the
 * document's own first paint:
 *   /           the hero's own band and grid, its claim, h1, lede and trust rows set in the page's own words (from
 *               `hero-intro.tsx`, the very components the page renders) but not shown — each line a bar — so every
 *               block stands where the page puts it in every language; the featured card and the act as blocks.
 *               ⛔ Not shown, because the hero's blocks rise in as they arrive (`kp-rise`): readable words in the
 *               ghost would vanish and fade back in, identical, the moment the page lands.
 *   /updown     Juu/Chini's ghost, the drawing `updown/loading.tsx` renders (`updown-ghost.tsx`: one drawing for both
 *               shells, and the tab's page), so a tap on the tab shows the board it opens, not a box.
 *   /positions  Tiketi zangu's ghost, the one `positions/loading.tsx` draws for a journey reader, so the two are one.
 *   /account    the hub's column, h1 and identity card (a guest's prompt instead, chosen by the header's own sign-in
 *               pills), and its cards cut into the page's two columns by the page's own rule (`hubColumnCut`), for the
 *               rows a plain signed-in player is shown (a guest's, for a guest).
 *   the journey's other pages — the ones `surfaces.ts` lists as the journey's own (`JOURNEY_ROUTE`): a question
 *               (`/markets/<id>`, the one pattern), Tiketi zangu's Up & Down list, the deposit screen and the provider's
 *               return — each the drawing its own loading file renders (the file itself where it reads nothing: the
 *               question's and the return's; the drawing it hands its words to where it reads them: the list's
 *               `history-ghost.tsx`, a journey reader's head, and the deposit's `deposit-ghost.tsx`), so the root's state
 *               and the page's are one drawing.
 *   any other   the brand's spinner in a block as tall as the classic box, and no frame: a framed box promises a
 *               column, and the pages behind this branch use several; each page's own loading file (if it has one)
 *               draws its column as soon as the page starts to arrive.
 *
 * ⭐ A CHUNK OF ITS OWN, DRAWN IN THE BROWSER (2026-10-09, the visual pass round 5, review G1). Drawn on the server, every
 * node of every ghost was written into the root loading element's data — 27,349 bytes of Flight JSON (3,083 gzipped; the
 * /account ghost 8,162, both its member and guest sets) — and Next 16 sends the root segment's loading element again with
 * every RSC payload rendered from the root: every journey document, and every `router.refresh()` (the RefreshPoller's
 * beat, 15 s on a question and on /live, 20 s on Tiketi zangu, Juu/Chini, the wallet and the round history, and after
 * each bet) — about 109 KB a minute of data to parse on a question page. So this module is client code, loaded by
 * `next/dynamic` from `route-ghost-lazy.tsx` (the shell's pattern, `shell-lazy.tsx`): the element's data is now one
 * reference and the rail names it is handed — 77 bytes of Flight JSON in every language, and one ~200-byte import row
 * naming the chunk (`test:visual-pass-r5d` §2 builds the element and holds it under 200 bytes). The words come from the
 * client dictionary (`useT`), which every page already carries, so a language changed in the browser is the ghost's
 * language too. The server still draws the ghost the document opens on, in its first HTML (the dynamic part renders on
 * the server; its chunk is preloaded in the head). The chunk itself is fetched once and kept: its size is a production
 * build's to measure (the lock turn's).
 * ⚠️ WHAT IT CANNOT DO IN THE BROWSER: read the server. The rails that pay out are read on the server (`heroRailNames`)
 * and handed in; nothing else here is read at all.
 * ⚠️ AND A THROW HERE STILL FAILS THE DOCUMENT (review G2). The server renders this ghost inside the root loading
 * boundary's fallback, which is part of the shell, and React's server renderer contains a throw only in a Suspense
 * boundary BELOW it — a boundary here would be outlined behind the shell (R4-J's E36), so there is none. It draws from
 * the words and the rail names alone, and `test:visual-pass-r5d` §2 renders every ghost in every language on React's
 * server renderer; a chunk that never arrives in the browser leaves the ghost out (`route-ghost-lazy.tsx`).
 * ⛔ A JOURNEY READER ONLY. `app/loading.tsx` returns this from its journey arm, which asks the shell's own two answers
 * (the console and the opt-out page are never the journey; the per-request resolver); everybody else is served the
 * classic SectionLoader, byte for byte. `/account` keeps no loading file of its own (A3): its ghost is here, behind the
 * same answer, so nothing streams to a classic visitor before the hub's gate.
 * `test:visual-pass-r4j` §3 holds every part of this file to the page it stands for.
 */
import type { ReactNode } from "react";
import { BrandSpinner } from "@/components/brand";
import { PageContainer } from "@/components/layout/page-container";
import { RoutePick } from "@/components/ui/route-pick";
import { TicketsGhost } from "@/components/journey/tickets/tickets-ghost";
import { UpDownGhost } from "@/app/updown/updown-ghost";
import { UpDownHistoryGhost } from "@/app/updown/history/history-ghost";
import MarketDetailLoading from "@/app/markets/[id]/loading";
import { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";
import DepositReturnLoading from "@/app/wallet/deposit/return/loading";
import { Ask, Claim, TrustLines } from "@/components/home/hero-intro";
import { hubColumnCut, hubRowsFor, wideRowCount, type HubGroup, type HubMember, type HubRow } from "@/components/journey/account/hub-rows";
import { useT } from "@/lib/i18n";
import type { Dict, Locale } from "@/lib/i18n-dict";

export function JourneyRouteGhost({ rails }: { rails: readonly string[] }) {
  const { t, locale } = useT();
  return (
    <RoutePick
      routes={{
        "/": <HomeGhost t={t} locale={locale} rails={rails} />,
        "/updown": <UpDownGhost t={t} />,
        "/positions": <TicketsGhost t={t} />,
        "/account": <AccountGhost t={t} />,
        "/updown/history": <UpDownHistoryGhost t={t} journey />,
        "/wallet/deposit": <DepositGhost t={t} />,
        "/wallet/deposit/return": <DepositReturnLoading />,
      }}
      patterns={[["^/markets/[^/]+$", <MarketDetailLoading />]]}
      other={<AnyPageGhost />}
    />
  );
}

/**
 * `/` — LandingHero's band, grid and intro (`landing-hero.tsx`), the words set but not shown. The lede is the page's two
 * spans as the page writes them; the trust rows name every rail that pays out (the page drops a paused one: a row a word
 * shorter, below the h1). The featured card is the live card's height (`--mcard-h`) and the act one control tall — enough
 * that from 1024 the left column stays the taller one, as on the page, so the intro sits on the band's padding there too.
 * The rails are the server's answer (`heroRailNames(null)`, read by `app/loading.tsx`): this module runs in the browser.
 */
function HomeGhost({ t, locale, rails }: { t: Dict; locale: Locale; rails: readonly string[] }) {
  return (
    <section className="kp-hero" aria-hidden="true">
      <div className="kp-hero__inner kp-hghost">
        <div className="kp-hero__intro">
          <hgroup className="kp-hero__lockup">
            <Claim t={t} />
            <Ask t={t} />
          </hgroup>
          <p className="kp-hero__lede">
            <span className="kp-hero__lede-l">{t.home.heroLedeAct}</span>{" "}
            <span className="kp-hero__lede-l kp-hero__lede-l--pay">{t.home.heroLedePay}</span>
          </p>
          <TrustLines t={t} locale={locale} rails={rails} />
        </div>
        <div className="kp-hero__card">
          <div className="kp-hghost__card kp-shimmer-track" />
        </div>
        <div className="kp-hero__act">
          <div className="kp-hghost__act kp-shimmer-track" />
        </div>
      </div>
    </section>
  );
}

/**
 * The rows a plain signed-in player is shown (tiles 281 297: the wallet and withdraw, play, the three safety rows, invite
 * and propose, profile and fairness, help and notifications, the settings, the agent door). Only the SHAPE is read from
 * it — which cards, how many rows, which rows hide at which width — never a name, a figure or a door.
 */
const A_PLAYER: HubMember = {
  signedIn: true, userId: "", name: "", initials: "", phone: "", balance: null, walletHeld: false, kycOffered: false,
  agentInStanding: false, proposalsState: "COMING_SOON",
  doors: { inviteVisible: true, invitePaid: false, agentDoorVisible: true, proposalsVisible: true, staffConsole: false },
};

/** `/account` — `app/account/page.tsx`'s column, hub, h1 and cards, each card cut where the page cuts it. */
function AccountGhost({ t }: { t: Dict }) {
  return (
    <PageContainer tier="reading">
      <div className="kp-hub">
        <h1 className="font-display text-title-lg font-bold leading-tight text-text">{t.journey.tabAccount}</h1>
        <div className="kp-hub__id kp-hubghost--member" aria-hidden="true">
          <span className="kp-hub__initials kp-shimmer-track" />
          <span className="kp-hub__who">
            <span className="kp-hubghost__name" />
            <span className="kp-hubghost__phone" />
          </span>
        </div>
        <p className="kp-hub__prompt kp-hubghost--guest">{t.journey.hubGuestPrompt}</p>
        <HubGhostCards groups={hubRowsFor(A_PLAYER)} who="member" />
        <HubGhostCards groups={hubRowsFor({ signedIn: false })} who="guest" />
      </div>
    </PageContainer>
  );
}

/** The hub's grid for one kind of reader: the page's two columns, cut by `hubColumnCut` over `wideRowCount`. */
function HubGhostCards({ groups, who }: { groups: HubGroup[]; who: "member" | "guest" }) {
  const cut = hubColumnCut(groups.map((g) => wideRowCount(g.rows)));
  const card = (g: HubGroup) => (
    <ul key={g.key} className="kp-hub__card">
      {g.rows.map((row) => <HubGhostRow key={row.id} row={row} />)}
    </ul>
  );
  return (
    <div className={`kp-hub__grid kp-hubghost--${who}`} aria-hidden="true">
      <div className="kp-hub__col">{groups.slice(0, cut).map(card)}</div>
      <div className="kp-hub__col">{groups.slice(cut).map(card)}</div>
    </div>
  );
}

/** A row as the page draws it: the hub row's own box (the 56px rung), a glyph's place and a label's; the language row
 *  hidden from 1024 and the card-size row from 640, as their own `<li>`s hide (`language-row.tsx`, `card-size-row.tsx`).
 *  The bars sit straight in the row (no glyph or text wrapper): the row's height is its rung's, whatever is in it. */
function HubGhostRow({ row }: { row: HubRow }) {
  const hide = row.kind === "language" ? "lg:hidden" : row.kind === "cardSize" ? "sm:hidden" : undefined;
  return (
    <li className={hide}>
      <div className="kp-hub__row">
        <span className="kp-hubghost__glyph" />
        <span className="kp-hubghost__label" />
      </div>
    </li>
  );
}

/** Any other page: the classic loader's spinner in a box as tall as the classic one, without the box's frame. */
function AnyPageGhost(): ReactNode {
  return (
    <PageContainer tier="board">
      <div className="grid h-[360px] place-items-center">
        <BrandSpinner size={56} />
      </div>
    </PageContainer>
  );
}
