/**
 * THE DESK — the Owner's own roster, and how close each account is to the limit that would stop it.
 *
 * ── THE LAW THIS PAGE IS BUILT ON ──────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **THE AUDIENCE IS DECIDED HERE, FIRST, ON THE STORED ROLE** (C7-SPEC rulings 259, 300, 324, 380). A layout's
 * verdict changes what is PAINTED, not what is SENT: measured on this branch's production build, a signed-in PLAYER
 * who opened a console page as a plain document received 200 and the page's whole server payload behind the redirect,
 * and a flight request whose router state names the admin layouts skips them altogether. So the first statement below
 * resolves the session and awaits `houseConsoleAudience(…, "/admin/desk")` — the viewer's STORED role, never the
 * session cookie's photograph of it — and every read is issued only after it returns true.
 *
 * ⛔ **THE READS ARE NOT HERE** (ruling 340). This file names no read module and no store. One gated reader,
 * `houseRosterForConsole`, performs the reads inside `house-console-read.ts` after its own verdict and hands back a
 * PAINTED view model. A refused viewer's payload therefore carries no label, no id, no figure and no sentence.
 *
 * ⛔ **THE COPY IS NEUTRAL, AND THAT IS THE OWNER'S OWN RULING** (ruling 453). Nothing this page renders names the
 * feature, not even behind the gate: an entry is an "account", the section is "the desk", money moved is a "stake", a
 * ceiling is a "limit". A screenshot is the likeliest accidental disclosure channel this project has and the
 * repository is public, so a heading that named the feature would disclose it the moment one image left the screen.
 *
 * ⛔ **MONEY ONLY AS USAGE AGAINST A CONFIGURED LIMIT** (ruling 266). No result, no net, no book, no fee withheld and
 * no bare balance — here or anywhere on this section. An unset limit renders "Not set", never a zero: the seam's own
 * `over(cap, value)` is `cap == null || value > cap`, so an unset limit REFUSES every stake, and "TZS 0 of TZS 0"
 * would tell the reader the opposite of the truth. A FAILED read renders the kit's `unavailable` tile or
 * `AdminLoadError` — never a fabricated figure (ruling 355).
 *
 * @see src/lib/server/house-console-read.ts · src/lib/house-bot/console-routes.ts · plans/house-bots/C7-SPEC.md
 */
import { Fragment } from "react";
import { WayOutLink } from "./way-out-link";
import type { Route } from "next";
import Link from "next/link";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { FormColumn } from "@/components/ui/form-column";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScrollX } from "@/components/ui/scroll-x";
import { Tabs } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { currentSession } from "@/lib/server/auth-service";
import { CONSOLE_REFUSAL_TITLE, houseRosterForConsole, houseUsageForConsole, houseFeedForConsole, houseHistoryForConsole, houseConsoleAudience, type ConsoleDeskShell, type ConsoleQuery, type ConsoleUsageCell, type ConsoleUsageRow } from "@/lib/server/house-console-read";
import { CONSOLE_ROUTE, CONSOLE_TABS, LIMITS_TAB_READY, consoleTab, consoleTabHref } from "@/lib/house-bot/console-routes";
import { ActivityFilters } from "./activity-filters";
import { StopQueued } from "./stop-queued";
import { DeskLive } from "./desk-live";
import { DeskLimitsForm } from "./limits-form";
import { DeskSwitch } from "./switch-ceremony";
/* ⛔ THE PAGE OWNS THE IMPORT OF THE ACTION AND HANDS IT DOWN (ruling 422). A client component under
 * `src/app/admin` that imports an actions module is in `test:admin-act-gate`'s population and must consult the
 * act gate — and on an Owner-only route `mayAct` is `mayView`, so that consultation would be a branch that can
 * never be false, which 1.422 refuses under this section by name. A Server Component is outside that population
 * and is the right owner of the reference anyway.
 * ⚠️ AND THE DIRECTIVE IS NOT QUOTED HERE. `test:house-bot-console` decides which files of the section are
 * CLIENT files by reading each one RAW for that directive, comments included — so writing it in this sentence
 * put `page.tsx` into the client population and made four unrelated assertions red. Measured 2026-09-18. */
import { saveDeskLimitsAction, setDeskSwitchAction, cancelDeskIntentAction } from "./actions";

/** ⛔ A static neutral title (ruling 402). No route here exports a `generateMetadata` that reads a record. */
export const metadata = { title: "Admin · Desk" };
/** ⛔ Every figure is live money against a live limit, and a prerendered document would be a payload computed for one
 *  audience and served to another — the population the bundle scan reads (rulings 302, 356, 380). */
export const dynamic = "force-dynamic";

const TAB_LABEL: Record<(typeof CONSOLE_TABS)[number], string> = { roster: "Roster", activity: "Activity", limits: "Limits", history: "History" };

/**
 * WHAT EACH PANEL IS FOR, in one sentence an officer can act on.
 *
 * ⛔ EVERY LINE IS DERIVED FROM THE CODE IT DESCRIBES, never from a plan document, because a caption that
 * describes a behaviour the product no longer has is worse than no caption: the roster's population is
 * `houseBotStore.listNonRemoved()`; "all eight" is `REQUIRED_FOR_MASTER_ON.length`; "blank refuses" is how
 * the rules parser treats a null limit; "a queued stake can be stopped" is the Activity panel's own control.
 * ⛔ AND NONE OF THEM RESTATES A FIGURE THE PANEL RENDERS — the tab badges already carry the unset-limit and
 * queued-stake counts, and a sentence repeating a number beside it is the contradiction 432(n) refuses.
 * ⚠️ NEUTRAL WORDS ONLY (D19/453): these strings are rendered inside the console's own subtree, which
 * `qa:house-bots-visual` scans for the feature's vocabulary — so they say "the desk" and "accounts".
 */
const TAB_GUIDANCE: Record<(typeof CONSOLE_TABS)[number], string> = {
  roster: "The accounts the desk stakes from. Each row shows what that account has used today of its own limits, and Open leads to its rules, targets and history.",
  activity: "Every stake the desk has decided on, newest first — placed, queued, refused or failed. A stake that is still queued can be stopped from here.",
  /* ⛔ IT SAYS WHERE THE NUMBERS COME FROM AND THAT THEY STAY EDITABLE, because an officer who believes a
     filled form is a committed one presses nothing, and an officer who believes a saved ceiling is permanent
     works around it instead of changing it. Both are how a limit stops matching the policy it was set for.
     ⭐ "and saves nothing" is the whole promise of the fill control, proved by `qa:desk-recommend` 5. */
  limits: "The platform-wide ceilings every account is held to, on top of its own. All eight must be set before the master switch will turn on, and a blank limit refuses every stake rather than meaning no limit. Use recommended values fills only the empty ones with a suggested starting set and saves nothing — check the numbers, then press Save. Every limit can be changed here afterwards, at any time.",
  history: "Every change anyone has made to the desk — accounts designated, started, paused or removed, limits and rules saved, and every time the switch moved.",
};

/** The limits card's heading, in ONE home: it is also what the form suppresses so the page does not say it
 *  twice (432(n)) — read off the first render of the form, where the card's title and the form's first group
 *  printed the same two words 34px apart, at 1280 and at 360. */
const LIMITS_CARD_TITLE = "Global limits";

/**
 * One usage cell's two halves. The server owns the sentence (ruling 361's one grammar); this only lays it out, so the
 * used figure and its limit can sit on two lines in a narrow column while each half stays indivisible.
 *
 * ⛔ ONLY THE FIGURE IS IN `.amount` (ruling 409), and that is a width decision as much as a semantic one. `.amount`
 * means "this is a money figure" everywhere else in the kit and it is `white-space: nowrap`; wrapping the connective
 * words "used" and "of" inside it put prose in the money face AND made each unbreakable unit wider than the figure it
 * was protecting — the constraint 432(b) was solving. The half's own `whitespace-nowrap` keeps `used TZS 0` together;
 * the space BETWEEN halves is breakable, so the cell may wrap and the figures may not.
 * ⛔ `tabular-nums` on the FIGURE, not the cell: putting it on the `<td>` would re-bind the pair into one unbreakable
 * line through the kit's own `.admin-tbl td.tabular-nums` rule.
 * ⛔ A count is not money: `0` and `200 bets` get the mono/tabular face without `.amount`'s money meaning.
 * ⚠️ Every space is an explicit `{" "}`: SWC has been measured dropping the space before text that follows a
 * `{expression}` across a line break on this codebase's own served pages ("hour<!-- -->of").
 */
export function Usage({ cell }: { cell: ConsoleUsageCell }) {
  if (cell.halves.length === 0) return <span className="text-text-tertiary">{cell.text}</span>;
  const figure = cell.money ? "amount tabular-nums" : "font-mono tabular-nums";
  return (
    <>
      {cell.halves.map((h, i) => (
        /* ⛔ THE BREAKABLE SPACE IS OUTSIDE THE NOWRAP SPAN. Inside it, the cell could never break between the two
           halves at all, which is the whole point of splitting them (432(b)). */
        <Fragment key={h.word + h.figure}>
          {i > 0 ? " " : null}
          <span className="whitespace-nowrap">{h.word}{" "}<span className={figure}>{h.figure}</span>{h.suffix}</span>
        </Fragment>
      ))}
      {/* ⛔ RULING 367 — AND IN THIS CELL IT IS THE ONLY SIGNAL THERE IS. A roster cell has no bar, so nothing
          else can say that a cap has been reached; on a bar it is what separates 100% from 140%, which the geometry
          cannot. The clause carries its own leading space and is "" when the cap is not reached, so there is no
          branch here to forget. ⛔ The tone is `text-text-secondary`, not a warning colour: colour is never this
          signal (§A4), and the roster's own status chip is where a stopped account is coloured. */}
      {cell.edgeText ? <span className="text-text-secondary">{cell.edgeText}</span> : null}
    </>
  );
}

/**
 * ONE USAGE BAR ON THE LIMITS TAB (rulings 362, 364, 367, 409).
 *
 * ⛔ AN UNSET LIMIT RENDERS NO BAR. `over(cap, value)` in the seam is `cap == null || value > cap`, so an unset cap
 * REFUSES every stake — a bar at 0% would say "headroom" where the gate says "nothing at all". What renders instead
 * is ONE of ruling 364's three captions, chosen by the field's own membership in the reader, never a blanket sentence.
 * ⛔ A FAILED READ IS NOT A ZERO EITHER (372(c)): it says so, in words, and draws no bar.
 * ⛔ THE CAPTION OPENS WITH THE CAP'S NAME, because `ProgressBar`'s `label` is `aria-label` ONLY and paints nothing
 * — without it a card of five bars names its caps to a screen reader and to nobody else (409).
 * ⛔ ONLY THE FIGURES ARE `.amount`, at their own call site (401): that class is `white-space: nowrap`, so wrapping
 * the whole sentence in it would overflow a 360 card (§A6). The words wrap; the amounts do not.
 */
export function UsageBar({ row, unsetHref }: { row: ConsoleUsageRow; unsetHref: string }) {
  if (row.unreadable) {
    return (
      <div>
        <p className="text-body-sm text-text-secondary">{row.name}</p>
        <p className="text-body-sm text-warning-fg">Couldn&apos;t read — this is not zero.</p>
      </div>
    );
  }
  if (row.limitTzs === null) {
    return (
      <div>
        <p className="text-body-sm text-text-secondary">{row.name}</p>
        <p className="text-body-sm text-warning-fg">
          {row.unsetCaption}
          {row.unsetLinked ? (
            <>
              {" "}
              <Link href={unsetHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] hover:underline">Set it below →</Link>
            </>
          ) : null}
        </p>
      </div>
    );
  }
  return (
    <ProgressBar
      value={row.usedTzs ?? 0}
      max={row.limitTzs}
      tone="brand"
      label={row.name}
      captionText={row.captionText}
      caption={
        <>
          {row.name}
          {" · "}
          {row.halves.map((h, i) => (
            <Fragment key={h.word + h.figure}>
              {i > 0 ? " " : null}
              <span className="whitespace-nowrap">{h.word}{" "}<span className="amount tabular-nums">{h.figure}</span>{h.suffix}</span>
            </Fragment>
          ))}
          {/* ⭐ RULING 544 — READ OFF THE TILES, AND THE MEASUREMENT IS THE WHOLE ARGUMENT. The bar is
              `Math.min(100, …)`, so 100% and 185% paint the SAME full track: `limits-at-1280.png` and
              `limits-over-1280.png` are pixel-identical in the meter and differ only in this clause. Set in
              the sentence's own tone it is four words at the end of five near-identical grey lines, on the
              one card that says whether the gate is refusing every stake.
              ⛔ COLOUR IS NOT THE SIGNAL, IT IS THE SECOND ONE: the words "— at the limit" / "— over the
              limit" stay, and `captionText` (the `aria-valuetext`) is untouched, so nothing here is carried
              by colour alone. The tone is the one THIS CARD already spends on a cap that stops money — the
              unset caption two branches up — so no new colour enters the section.
              ⛔ THE ROSTER CELL IS DELIBERATELY NOT CHANGED. `Usage` states its own reason for staying
              `text-text-secondary` — a roster row has a status chip to colour — and a bar has none. */}
          {row.edgeText ? <span className="text-warning-fg">{row.edgeText}</span> : null}
        </>
      }
    />
  );
}

/**
 * ⛔ THE WHOLE QUERY STRING GOES TO THE DOOR, UNREAD BY THIS FILE (rulings 259, 383, 387). This page is served
 * 200 to any signed-in account and a crafted address is free, so every value is checked against a closed list or a
 * shape inside the gated reader — which also builds the rail's own links from that same parse, so the control an
 * officer clicks and the read the server takes cannot disagree.
 */
type DeskProps = { searchParams: Promise<ConsoleQuery> };

/**
 * W25 BELT 2 — this page carries its OWN gate, decided on the viewer's STORED row. A flight request whose router
 * state names the section layout skips that layout, so the only gate a page cannot lose is the one it holds itself.
 *
 * ⛔ ADDITIVE, AND DELIBERATELY REDUNDANT HERE. `houseConsoleAudience` inside the content already answers on the
 * stored role and is KEPT VERBATIM: it is this section's own audience rule (D19 — the feature is never named to
 * anyone outside it), which is NARROWER than "is a staff member". The gate answers the platform question; the
 * audience answers the feature's. Removing either would widen the other's blind spot.
 */
export default async function AdminDeskPage(props: DeskProps) {
  return <AdminPageGate title="Desk"><AdminDeskContent {...props} /></AdminPageGate>;
}

async function AdminDeskContent({ searchParams }: DeskProps) {
  /* ⛔ THE VERDICT IS AWAITED FIRST, BEFORE ANY READ (rulings 300, 380). */
  const session = await currentSession();
  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/desk"))) return null;

  /* An unknown `?tab=` resolves to the roster (ruling 302): a query string is not a resource, so it is never a 404
     and never a redirect, which would rewrite a bookmarked URL on every bare visit. */
  const sp = await searchParams;
  const tab = consoleTab(sp.tab);

  /* ⛔ EXACTLY ONE GATED READER PER RENDER PASS, AND THE PANEL DECIDES WHICH (rulings 346, 406).
   * Each reader returns the SAME shell — the strip, the auto-off Callout, the band and the rail's counts — built
   * from its own single read set, so the strip is identical on every tab and the "Set N global limits first →"
   * count beside the switch cannot disagree with the limits panel one click away. Calling both would put TWO control
   * reads in one render, and two reads of one question can disagree inside a render (346's own defect, and the
   * reason `countLive` is banned here). */
  const rosterView = tab === "roster" ? await houseRosterForConsole(session?.userId ?? null, "/admin/desk") : null;
  const feedView = tab === "activity" ? await houseFeedForConsole(session?.userId ?? null, "/admin/desk", sp) : null;
  const limitsView = tab === "limits" ? await houseUsageForConsole(session?.userId ?? null, "/admin/desk", { houseBotId: null }) : null;
  const historyView = tab === "history" ? await houseHistoryForConsole(session?.userId ?? null, "/admin/desk", sp) : null;
  const view: ConsoleDeskShell | null = rosterView ?? feedView ?? limitsView ?? historyView;
  if (!view) return null;

  const rosterFull = view.rosterFullReason !== null;
  /* ⚠️ HOISTED SO EACH TAB GROUP CAN BE WRITTEN IN THE SHIPPED IDIOM — a tab test opening its fragment, with NOTHING else in
     the condition. `test:tab-anchors` decides which tab OWNS a rendered `id` by that exact opener, and the served
     probe discovers a page's tabs by `tab === "…"`; a second term in the condition made the limits anchor read as
     "above the rail (every tab)", which is a PASS that proves nothing. Measured on this file, 2026-09-18.
     ⛔ `?? null` is not a lost failure state: the page returned `null` above when the gate refused, and exactly one
     of the two readers ran, so on each tab its own slice is the reader's own answer. */
  const rosterRows = rosterView?.rows ?? null;
  const rosterEmpty = rosterView?.empty ?? null;
  const usageRows = limitsView?.usage ?? null;
  const limitRows = limitsView?.limits ?? null;
  /* The CAS token the form carries back. `null` on the roster tab and in both states with no row to save. */
  const limitsVersion = limitsView?.limitsVersion ?? null;
  /* ⛔ Derived beside the rows it belongs to, and null-safe the same way: the form renders only when
     `limitRows` and `limitsVersion` are both non-null, so this is never read on a failed limits read. */
  const recommendCopy = limitsView?.recommendCopy ?? null;
  /* ⭐ C7 STEP 5's LANDING HALF — hoisted for the same reason every other slice above is: a tab group's condition
     carries NOTHING but the tab test, because `test:tab-anchors` and the served probe both read this file as TEXT.
     ⛔ `null` is a read that FAILED and `[]` is a list with nothing in it — two different treatments (355). */
  const feedRows = feedView?.feed ?? null;
  const historyRows = historyView?.history ?? null;

  return (
    <>
      <AdminPageHead
        title="Desk"
        sw="Dawati"
        /* 403 · ONE control in the actions slot. 314 · when the roster is full it is rendered DISABLED with the
           reason VISIBLE beside it — never carried by a `title` alone, and never `hidden` on a `.btn`. The sentence is
           the server's own, with the CONFIGURED maximum interpolated, never the literal 5.
           ⭐ C7 STEP 6 MADE IT A REAL LINK, IN THE SAME CHANGE AS THE PAGE IT OPENS (432(h)). It was rendered
           disabled whatever the roster held while `/admin/desk/new` had no page, because a primary action that
           answers the app-root 404 is the dead control 432(a) refuses. It is now disabled in exactly two states,
           each with ONE sentence beside it: the roster is full, or the desk has been withdrawn. */
        actions={
          <span className="flex items-center gap-2 flex-wrap justify-end">
            {/* ⛔ `text-body-sm` (13px), NOT `text-caption` (11px). Ruling 310 wrote `text-caption` for the
                section's secondary lines, but §T4's reading floor is 12.5px and `test:type-scale` §3 counts every
                sub-floor prose site into a ratchet that may only shrink: 13px is the SMALLEST key above the floor,
                and this is a sentence an officer must read to know why a button is disabled.
                ⛔ THE WHOLE SENTENCE IS THE LINK ONCE THERE IS A PANEL TO LINK TO, and the first render is why: the
                server's sentence already ENDS "…raise the roster limit on Limits →", so appending a separate
                "Limits" link printed the word twice with the arrow orphaned between them ("on Limits → Limits").
                ⛔ WHEN THE ROSTER IS NOT FULL THERE IS STILL A REASON ON SCREEN (432(j)): a disabled primary action
                with nothing beside it reads as a broken page, and "0 of 5" is exactly when designation is
                legitimate. */}
            <span className="text-body-sm text-text-secondary max-w-[38ch]">
              {rosterFull && LIMITS_TAB_READY
                ? <WayOutLink href={view.limitsHref}>{view.rosterFullReason}</WayOutLink>
                : rosterFull ? view.rosterFullPlain : view.actionReason}
              {/* ⭐ C7 STEP 3 TURNED THIS ON. `LIMITS_TAB_READY` is now true, so the whole sentence is the LINK and
                  its trailing arrow means what it says. ⛔ THE INERT BRANCH STAYS: the flag is derived from
                  `CONSOLE_TABS`, and steps 4 and 5 add `activity`, `history`, `rules` and `targets` under exactly
                  this rule — a rendered link may never name a `?tab=` value with no panel behind it. Its proof moved
                  to the FUNCTION level (`stripLinkedTail`, `rosterFullPlain`) rather than being deleted, because a
                  branch whose proof is deleted the day it stops executing is how the next dead control ships. */}
            </span>
            {/* ⛔ A LINK WHEN IT WORKS, THE KIT'S DISABLED BUTTON WHEN IT DOES NOT (432(a), 432(h)). `Button` takes
                no `href`, so the live form is the shipped `btn btn-primary btn-md` idiom on a `<Link>` — the same
                shape `/admin/markets` uses for its own head action — at `btn-md`, which is the 44px rung ruling
                412 fixes for this whole section. There is no `aria-disabled` link anywhere here: a disabled
                control is a `<button>`, so a keyboard reaches a real disabled state rather than a dead anchor. */}
            {view.designateLive
              ? <Link href={view.designateHref as Route} className="btn btn-primary btn-md inline-flex items-center">Designate an account</Link>
              : <Button size="md" variant="primary" disabled>Designate an account</Button>}
          </span>
        }
      />

      <AdminBody>
        {/* ⭐ THE MASTER-SWITCH STRIP, ABOVE THE RAIL ON EVERY TAB (ruling 306; DA §K 7d — a control that starts or
            stops something in production does not sit behind a click).
            ⛔ NOT RENDERED IN 421's SCHEMA STATE, and the first render is why: with no control row there is no chip and
            no Toggle, so the card became a lone sentence sitting directly above a Callout that said the same thing and
            an empty state that said it a third time. 421 asks for ONE Callout; the strip stands down and lets it be. */}
        {!view.schemaMissing && (
        <AdminCard padding="p-4">
          {view.controlUnreadable ? (
            /* ⛔ 421's OTHER HALF, AND IT IS THE KIT'S FAILURE TREATMENT, NOT A STATE (rulings 304, 355, 421). A
               rejection that is not a missing schema leaves the switch's state UNKNOWN. The first pass painted the OFF
               sentence here — "The desk is off. Nothing will be staked." — while the desk may have been ON and money
               moving, and dropped the whole band. A failed read is never a state and never a zero. */
            <AdminLoadError what={"the desk's own state"} />
          ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              {view.chip && <Chip size="sm" variant={view.chip.variant}>{view.chip.word}</Chip>}
              <p className="text-body-sm text-text-secondary min-w-0">{view.stateSentence}</p>
            </div>
            {/* ⛔ `justify-start sm:justify-end` — at 360 this group wraps onto its own line under a left-ragged
                sentence, and `justify-end` alone put its two lines on a third axis inside one small card. Above 640
                it is the card's right half and hangs right, as it should. */}
            <div className="flex items-center gap-3 flex-wrap justify-start sm:justify-end">
              {/* 306 · the count is DERIVED at render time over the limits the switch requires — never a typed
                  number and never a hand-copied list, because a typed count renders "Set 0" while the press fails
                  with no explanation on screen. ⛔ Not a link until the limits panel exists (432(i)). */}
              {/* ⛔ THE SENTENCE IS THE SERVER'S, AND IT IS `null` WHEN THE SWITCH IS ALREADY ON (ruling 306).
                  This read `view.unsetRequired > 0` with no reference to `view.on`, and the state is reachable — a
                  limit can be cleared after the desk is switched on. Read off the first 1280 tile: the chip said ON,
                  "On since 20:14:12 EAT …" sat beside it, and "Set 1 global limit first →" sat beside THAT. Two
                  opposite instructions on one screen, in the card that stops money — 432(m)/(n)'s class.
                  ⛔ AND THE WORDS HAVE ONE HOME. Both forms were spelled out here in JSX, so the only thing any suite
                  could assert was the NUMBER; the text itself was unproved. The server writes both, from the ONE
                  count the rail's badge also reads, and this site chooses only the SKIN. The badge keeps reading
                  `view.unsetRequired` directly, because a COUNT stays honest in either state. */}
              {view.limitsFirstReason !== null && (
                /* ⛔ THE LINK CARRIES THE FRAGMENT, NOT JUST THE TAB (rulings 306, 406). `#limits-first-unset` is
                   rendered on the FIRST unset required limit of the panel this href selects, and
                   `test:tab-anchors` holds the two together — the id and the builder landed in the same change,
                   because a fragment pointing at an anchor nothing renders is the defect that suite exists for. */
                LIMITS_TAB_READY ? (
                  <Link href={view.limitsFirstUnsetHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-warning-fg hover:underline">
                    {view.limitsFirstReason}
                  </Link>
                ) : (
                  <span className="text-body-sm text-warning-fg">{view.limitsFirstPlain}</span>
                )
              )}
              {view.on !== null && (
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm font-semibold text-text">Master switch</span>
                  {/* ⛔ `tone="brand"` in BOTH states: gold is earned money only, and claret means ON MEANS STOPPED —
                      here ON means money can move.
                      ⭐ C7 STEP 4b · THE SWITCH IS OPERABLE, AND THE CEREMONY IS WHAT MAKES IT SO (rulings 388, 415;
                      owner-delegated 454). The server decides whether there is an act to perform at all and hands
                      down every word of the dialog; this site chooses only the SKIN. ⛔ It ships OFF: the ceremony
                      is the act's machinery, and the row is `enabled = false` on every environment (owner ruling
                      D1, PLAN §11).
                      ⛔ AND WHERE THERE IS NO ACT, THE CONTROL IS DISABLED WITH ITS REASON BESIDE IT (432(a),
                      432(j)) — a withdrawn desk, or one whose required limits are unset, where the strip's own
                      "Set N global limits first →" three characters to the left is that reason (432(n)). A live
                      control the server could only ever refuse is the same lie one layer down. */}
                  {view.switchDialog
                    ? <DeskSwitch on={view.on} copy={view.switchDialog} act={setDeskSwitchAction} />
                    : <Toggle on={view.on} tone="brand" disabled aria-label="Desk master switch" />}
                  {view.switchReason !== null && <span className="text-body-sm text-text-tertiary">{view.switchReason}</span>}
                </span>
              )}
              {/* ⭐ THE PAGE'S ONE LIVE TRIGGER (rulings 316, 473), AND IT IS IN THE STRIP FOR A REASON: the strip
                  renders above the rail on EVERY tab, so a tab switch never remounts it and the page can never end
                  up with two timers. It paints nothing. */}
              <DeskLive live={view.live} />
            </div>
          </div>
          )}
        </AdminCard>
        )}

        {/* 421 · the feature's tables are not on this database. A STATE, not a crash and not a zero: no band, no
            switch, and the roster's empty state names this cause. */}
        {view.schemaMissing && (
          <Callout tone="neutral" title="The desk is not set up on this database">
            Its tables are not present here, so nothing can be staked and nothing can be designated. The database this
            server reads has not had the desk&apos;s migration applied.
          </Callout>
        )}

        {/* ⭐ THE ENGINE-HEALTH CALLOUT, ABOVE THE BAND ON EVERY TAB (rulings 309, 352, 353, 354, 414; replan
            435(e)). ⛔ The tone, the wording and WHETHER IT RENDERS AT ALL are the server's: 353's verdict needs the
            master switch, which the one reader already holds, so there is no second control read in this render.
            ⛔ `role="alert"` ONLY on the danger rows (414) — an alert that fires on every page load trains an
            officer to ignore the one that matters — and the Callout is stably KEYED so the strip's 20 s refresh
            does not re-announce a state that has not changed (309).
            ⛔ IT NEVER RENDERS WITH THE DESK OFF: the strip one card up already says "The desk is off. Nothing will
            be staked.", and 432(n) refuses one state saying one fact twice. */}
        {view.engine && (
          <Callout
            key={view.engine.noticeKey}
            tone={view.engine.tone}
            size="md"
            surface="panel"
            emphasis="strong"
            {...(view.engine.alert ? { role: "alert" as const } : {})}
            title={view.engine.title}
            meta={view.engine.meta ?? undefined}
          >
            {view.engine.body}
            {view.engine.caption && <span className="block text-body-sm text-text-tertiary mt-1">{view.engine.caption}</span>}
          </Callout>
        )}

        {/* 308 · one branch per auto-off cause. A stale cause left on the row while the switch is ON renders none.
            ⛔ AND NO BODY HERE REPEATS THE STRIP'S OWN SENTENCE (ruling 432(n)). The strip two cards up says "The desk
            is off. Nothing will be staked." — ruling 453 fixes those words verbatim for EVERY off cause — and all
            three bodies below said the same thing again about 60px lower at 1280 and about 150px lower at 360 (read
            off desk-sunset-full-1280.png and -360.png, where both sentences sit in one viewport). 453 governs the
            STRIP sentence and says nothing about these bodies, which are this commit's own copy: the strip owns "the
            desk is off", the Callout owns WHY, and neither has to say the other's sentence. */}
        {view.offCause === "GLOBAL_LOSS_STOP" && (
          <Callout tone="warning" title="Switched off by the daily loss limit">
            The day&apos;s loss reached the limit, so the desk stopped itself. It stays off until it is switched on
            again.
          </Callout>
        )}
        {(view.offCause === "ENGINE_FAULT" || view.offCause === "ENGINE_ERRORS") && (
          <Callout tone="danger" emphasis="strong" size="md" surface="panel" title="Switched off by a fault">
            The desk stopped itself after a fault it could not recover from. It stays off until the cause is
            understood and it is switched on again.
          </Callout>
        )}
        {view.offCause === "SUNSET" && (
          <Callout tone="neutral" title="Withdrawn">
            The desk has been withdrawn, and nothing can be designated.
          </Callout>
        )}

        {/* 303, 304, 404 · four readings of how close the desk is to a stop that would silence it. ONE compact amount
            in each value, the limit NAMED in the delta as a proportion with no second amount. */}
        {view.tiles.length > 0 && (
          <KpiGrid cols="4">
            {view.tiles.map((t) => (
              <AdminKpi key={t.label} label={t.label} value={t.value} delta={t.delta} unavailable={t.unavailable} />
            ))}
          </KpiGrid>
        )}

        {/* 312 · the rail carries exactly the tabs whose panels exist. A rail option with no panel is a dead control,
            so the closed list grows with the panels, and 302's fallback resolves every other value to the roster. */}
        <Tabs
          variant="line"
          ariaLabel="Desk sections"
          value={tab}
          /* ⛔ THE BADGE AND THE STRIP'S SENTENCE ARE THE SAME NUMBER FROM THE SAME READ (rulings 306, 312). It is
             one field of one object built from one control row, never counted twice: a badge that disagrees with the
             sentence 40px above it is the defect this is written against, and `CountBadge` renders nothing at zero,
             so a count may never stand in for a read's health. */
          /* ⭐ TWO BADGES, EACH ITS TAB'S OWN COUNTING READ, AND NEITHER STANDS IN FOR A READ'S HEALTH. `limits`
             carries the unset-global count; `activity` carries how many stakes are QUEUED across the whole desk.
             ⛔ `CountBadge` RENDERS NOTHING AT ZERO, so a FAILED count (`null`) paints no badge — and the panel
             below paints `AdminLoadError` for that subject instead, because a missing badge is not a state.
             ⛔ Roster and history carry none: a count of "how many accounts" is the table itself, and a count of
             "how many changes" is a number nothing on the page can act on (432(a)). */
          tabs={CONSOLE_TABS.map((k) => ({ value: k, labelEn: TAB_LABEL[k], href: consoleTabHref(k), count: k === "limits" ? view.unsetRequired : k === "activity" ? view.pendingIntents ?? undefined : undefined }))}
        />

        {/* ⭐ ONE LINE PER PANEL, SO AN OFFICER KNOWS WHAT THEY ARE LOOKING AT (owner ask, 2026-09-21).
            Every panel on this page was a table or a form with no statement of what it is FOR, so an officer who
            had not read the operator guide had to infer each one from its columns. ⛔ IT IS A SENTENCE, NOT A
            SECOND CONTROL: it names what the panel holds and the one rule that decides it, and nothing here
            duplicates a figure the panel already renders — a caption that restates a number is the defect
            432(n) refuses within one screen. The text is derived from the code it describes, not from a plan
            document: the roster from `listNonRemoved`, the eight from `REQUIRED_FOR_MASTER_ON`, and "blank
            refuses" from the rules parser's own treatment of a null limit. */}
        <p className="px-4 lg:px-6 pt-3 text-body-sm text-text-tertiary max-w-[72ch]">{TAB_GUIDANCE[tab as (typeof CONSOLE_TABS)[number]]}</p>

        {/* ⚠️ THE `(<>` … `</>)}` FORM IS LOAD-BEARING, NOT A HABIT. `test:tab-anchors` decides WHICH TAB owns a
            rendered `id` by finding the nearest tab-group opener above it with no `</>)}` in between; a panel whose
            opener does not take this exact form reads as ABOVE the rail, which is the strongest possible answer and
            would let the limits anchor pass while sitting on any tab at all. */}
        {tab === "roster" && (<>
          <AdminCard padding="p-0">
            {rosterRows === null ? (
              /* 355 · a FAILED read is never an empty state and never a zero. */
              <div className="p-4"><AdminLoadError what="the roster" /></div>
            ) : (
              <ScrollX label="Desk roster">
                {/* ⛔ NO `min-w-*` ON A MONEY TABLE (ruling 373): `.admin-tbl` is `width: 100%`, so a minimum width
                    stretches every column and pushes the answer column out of view at 360 — measured on
                    /admin/house, where 4 of 6 money cells left the viewport. `ScrollX` carries the width instead. */}
                <table className="admin-tbl">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      {/* ⛔ A FLOOR ON THE SUBJECT COLUMN, MEASURED. `.admin-tbl` is `width: 100%`, so without it the
                          account column absorbed the whole shortfall and laid out at 93px at 360 — the label and the
                          handle crushed together, which is the G-4/G-5 defect the kit documents one file over. */}
                      <th scope="col" className="text-left p-3 min-w-[150px]">Account</th>
                      {/* ⛔ `whitespace-normal`, AND IT IS THE FIX FOR A CLIPPED MONEY FIGURE (ruling 432(o)).
                          `.admin-tbl th` is `white-space: nowrap`, so "LOSS TODAY (PROJECTED)" — 22 characters of
                          tracked mono — set this column's minimum at ~210px, and because the cells are right-aligned
                          the figure was pinned to that far edge: READ off the 360 tile, the header's own ")" and the
                          row's "used TZS 0" were both SLICED by the card's right edge at x≈339. §A5 is "never clip
                          money", and a clipped number is a WRONG number (§M4a). Letting the HEADER wrap to two lines
                          costs one row of thead height and takes the column's minimum down to the cell's own
                          ~150px, which puts the first money answer inside the strip at 360.
                          ⛔ THE `!` IS LOAD-BEARING AND IT WAS MEASURED, NOT ASSUMED. `.admin-tbl th` is (0,1,1) and a
                          bare `whitespace-normal` utility is (0,1,0), so the class LOST to the stylesheet and the
                          header stayed on one line: the first fix compiled, passed every source pin, and changed
                          nothing on screen — read off the 360 tile, "used TZS 0" still sliced at x=339. `!` emits
                          `white-space: normal !important`, which the repo already uses for exactly this
                          (`!text-claret-300`, `!text-gold-300`). ⛔ The kit rule is NOT edited: it governs ~170
                          other headers.
                          ⛔ Ruling 373's "the basis is NAMED IN THE HEADER" is KEPT — "(projected)" still reads,
                          on the second line. */}
                      <th scope="col" className="text-right p-3 !whitespace-normal">Loss today (projected)</th>
                      {/* ⛔ "Open exposure", not "Exposure": the band's tile above measures the SAME figure and calls
                          it that, and the one thing a reader uses to tie a band to a column is the name (432(o)). */}
                      <th scope="col" className="text-right p-3 !whitespace-normal">Open exposure</th>
                      {/* ⛔ A FLOOR ON THE STATUS COLUMN, MEASURED (ruling 432(o)). Read off the 1280 tile: the
                          AUTO-PAUSED chip rendered as a TWO-LINE pill — "AUTO-" / "PAUSED", a ~34px box — beside
                          22px single-line ACTIVE and PAUSED pills in the same column, at 360, 640, 768, 1024 AND
                          1280, coming right only at 1920 where the same chip measures ~96px. A status word on two
                          lines is not a status word. ⛔ It CANNOT be fixed on the Chip: `chip.tsx` sets
                          `whiteSpace: "normal"` as an INLINE style, which beats any class, and the wrapping element
                          is the chip itself, so a nowrap parent does not reach it. 96px + the cell's 32px of
                          padding = 128. ⛔ This is a COLUMN floor, never the TABLE's (373): at 360 the table is
                          already wider than its card, so columns 1–3 keep their own minimums and nothing moves. */}
                      <th scope="col" className="text-left p-3 min-w-[128px]">Status</th>
                      {/* ⛔ RIGHT-ALIGNED like the two money usages beside it: same grammar, same shape, so three
                          adjacent usage figures read on ONE axis instead of two (432(o)). */}
                      <th scope="col" className="text-right p-3 !whitespace-normal">Bets today</th>
                      {/* ⭐ 432(g) · "LAST BET" ARRIVED WITH ITS READER. It needs a last-placement instant, and the
                          only reader that has one is `botRateUsage` — ruling 351's one new seam member, added at
                          this step because the account page's two count rows need it too. Left-aligned and not
                          `tabular`: it is a phrase, not a figure, and putting it on the money axis would read as a
                          third usage column. */}
                      <th scope="col" className="text-left p-3">Last bet</th>
                      <th scope="col" className="text-left p-3">Products</th>
                      {/* ⭐ THE WAY OUT ARRIVED WITH THE PAGE IT OPENS (ruling 432(h)). Until `/admin/desk/[id]`
                          had a page every row's "open →" answered the app-root 404 — the first control an officer
                          reaches on the deliverable. `test:house-bot-console` ties the column to that FILE in both
                          directions, so it could not ship early and could not be forgotten.
                          ⛔ THE HEADER HAS NO WORD, and that is the kit's own shape for a row-link column
                          (`/admin/kyc`, `/admin/approvals`): the link says what it does, and a header repeating it
                          would spend a column name on nothing. */}
                      <th scope="col" className="text-right p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rosterEmpty ? (
                      /* 416 with 310's precedence — the state the table is in NAMES ITS CAUSE: the desk being off
                         beats "none designated yet", and a failed read beat both above. */
                      <AdminTableEmpty colSpan={8} title={rosterEmpty.title} body={rosterEmpty.body} />
                    ) : (
                      rosterRows.map((r) => (
                        <tr key={r.id} className="border-b border-border-subtle">
                          <td className="p-3">
                            {/* ⛔ RULING 474 · THIS TEXT IS OPERATOR DATA, AND THE DOM SAYS SO. `bot.label` is what
                                the Owner typed to identify an account; 453's lexicon binds this section's COPY and may
                                not silently rewrite it, so it is exempted BY NAME — and an exemption a scanner cannot
                                SEE is one that gets applied to whatever happens to be nearby. MEASURED 2026-09-18: the
                                served gate had no such hook, so a fixture whose accounts were labelled "Bot 1–3" made
                                §5.6 red at all six widths — on a value 474 says must never fail it. */}
                            <div className="text-text" data-operator-text="label">{r.label}</div>
                            {/* The holder, as a HANDLE and nothing else (04 R6) — never a name, a phone or an email,
                                because a row outlives the holder's erasure. 13px mono in a subdued tone is
                                /admin/agents' own shape for the same thing, and it clears §T4's 12.5px floor. */}
                            <div className="font-mono text-body-sm text-text-subtle">{r.handle}</div>
                            {/* ⛔ THE ROW'S OWN REFUSAL, IN THE FIRST COLUMN (review finding 2026-09-22). It sat in the
                                Products cell, the seventh column of the scroller, so at 360 an officer saw "Desk
                                000102" and a loss figure and had to drag the table ~900px to learn the account
                                could not bet — and the docs called that "beside the status chip". Under the
                                handle it is on screen at every width, in the warning tone, with the Rules tab as
                                the way out. `max-w` so a long sentence wraps here instead of widening the column;
                                `inline-flex` at the tap floor like every other link. */}
                            {r.inert !== null && (
                              <Link href={r.inert.href as Route} className="inline-flex items-center min-h-[var(--tap-min)] max-w-[34ch] text-body-sm text-warning-fg hover:underline">
                                {r.inert.text}
                              </Link>
                            )}
                          </td>
                          {/* Money SECOND and THIRD — the ANSWER columns. Each amount is one object (`.amount` is
                              `white-space: nowrap` in the kit), and the CELL may break between the used figure and its
                              limit — which is why it does NOT carry `.tabular`, whose nowrap would bind the pair into
                              one 243px line and push the second answer off a 360 screen (measured; see the reader). */}
                          <td className="p-3 text-right"><Usage cell={r.lossCell} /></td>
                          <td className="p-3 text-right"><Usage cell={r.exposureCell} /></td>
                          <td className="p-3"><Chip size="sm" variant={r.statusChip}>{r.statusWord}</Chip></td>
                          <td className="p-3 text-right text-text-secondary"><Usage cell={r.betsCell} /></td>
                          {/* ⛔ AN ACCOUNT THAT HAS NEVER STAKED READS "—", never a fabricated date and never a zero
                              (§C2). The absolute EAT instant is in `title`, where the kit puts every exact time. */}
                          <td className="p-3 text-text-secondary" title={r.lastBet?.title}>{r.lastBet?.text ?? "—"}</td>
                          {/* ⛔ THE OPERATIVE SCOPE, ONE LINE PER TICKED PRODUCT, AS LABELS (prod finding 2026-09-22).
                              This cell printed "Up & Down · Polls" for an ACTIVE account whose two lists were
                              empty: true of the switches, false of the account, which had matched nothing since the
                              day it was started. The lines now name what each product can REACH; the account's own
                              refusal is in the FIRST column, where it is on screen without a sideways scroll.
                              ⛔ NO FLOOR AND NO NOWRAP ON THIS CELL (1.373): it is a words column, so it wraps inside
                              the scroller. */}
                          <td className="p-3 text-text-secondary">
                            {r.products.map((line) => <div key={line}>{line}</div>)}
                          </td>
                          <td className="p-3 text-right">
                            <Link href={r.href as Route} className="row-link whitespace-nowrap font-mono text-micro text-royal-300 hover:underline">open →</Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </AdminCard>
        </>)}

        {tab === "activity" && (<>
          {/* ⛔ THE PANEL IS GUARDED ONCE, INSIDE ITS OWN GROUP, AND NEVER BY A SECOND TERM IN THE TAB TEST
              (ruling 433(e)): `test:tab-anchors` decides which tab owns a rendered id by the nearest panel opener
              above it, and the served probe discovers this page's tabs with the same expression over the RAW file
              — so a second term would make a panel read as "above the rail", the strongest possible answer and a
              PASS that proves nothing. Exactly one reader ran this pass, so on this tab it is this one. */}
          {feedView !== null && (<>
          {/* ⭐ C7 STEP 5 · WHAT THE WHOLE DESK HAS TRIED TO STAKE, NEWEST FIRST, WITH WHAT HAPPENED TO EACH.
              ⛔ THE RAIL IS THE ACCOUNT PAGE'S RAIL, THE SAME FILE (§K5): two copies of one control is the defect
              this section was pulled up on, and the rail types no route, no closed list and no label — every
              option's link is built from the SAME parse the read is taken with.
              ⛔ ONE `data-filter-rail` under this section, and it is NOT on the `<Tabs>`.
              ⛔ THE SUBJECT COLUMN IS FIRST AND THE MONEY IS SECOND, which is the roster's own shape one card
              above: on a desk-wide list the subject is the ACCOUNT, and on the account page's own panel it is the
              instant. One rule, each panel's own subject — never two shapes for one table.
              ⛔ THE MONEY IS ONE STAKE, NEVER A SUM (266, 360 role C, 373), and no row carries `why`, `decision`
              or a trigger player's id, for the reasons the reader states by name. */}
          <ActivityFilters groups={feedView.feedFilters} presets={feedView.feedPresets} presetDefault={feedView.feedPresetDefault} />
          {/* 387/432(j) · an address that was not taken at its word SAYS SO, naming each axis it dropped —
              silently narrowing to something nobody asked for is the defect this sentence exists against. */}
          {feedView.queryRefusal && (
            <Callout tone="warning" title={CONSOLE_REFUSAL_TITLE}>{feedView.queryRefusal}</Callout>
          )}
          <AdminCard padding="p-0">
            {/* ⛔ 355 · A FAILED READ IS NEVER AN EMPTY TABLE. `null` means nobody could tell; an empty array means
                there is nothing there, and the two paint different treatments and say different things. */}
            {feedRows === null ? (
              <div className="p-4"><AdminLoadError what="the desk's activity" /></div>
            ) : (
              <>
                <div className="px-4 pt-4">
                  <p className="text-body-sm text-text-tertiary">{feedView.feedOrderNote}</p>
                </div>
                <ScrollX label="Desk activity">
                  {/* ⭐ THE MONEY ANSWERS FIT ON A PHONE, AND THE LEVER IS PADDING — NOT THE TYPE (owner asked
                      for the budget where he can see it, 2026-09-24). `.admin-tbl td` is `padding: 12px 16px` and
                      `.admin-tbl th` `10px 16px`, both (0,1,1) — so the `p-3` these cells already carry is DEAD,
                      losing on specificity, and 16px × 2 × 3 cells was 96px of the 318px strip spent on gutters
                      before a single figure. Halving it at phone width buys back 48px, which is more than the
                      type could give and costs nothing anyone reads.
                      ⛔ THE `!` IS LOAD-BEARING for exactly the reason the header below states, and the arbitrary
                      variant is what lets ONE class list reach every cell instead of nine hand-edited ones.
                      ⛔ PHONE ONLY — `sm:` restores the kit's own 16px, so every width that already read well is
                      byte-identical. Measured after, not assumed: see the 360 read in §12.3. */}
                  <table className="admin-tbl [&_td]:!px-2 [&_th]:!px-2 sm:[&_td]:!px-4 sm:[&_th]:!px-4">
                    <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                      <tr>
                        {/* ⛔ A FLOOR ON THE SUBJECT COLUMN, the roster's own measured one: without it the account
                            column absorbs the whole shortfall at 360 and the label and the handle crush together.
                            ⭐ LOWERED AT PHONE WIDTH ONLY so the second money answer reaches the strip; the label
                            wraps to two lines there, which it already does for every long account name. */}
                        <th scope="col" className="text-left p-3 min-w-[104px] sm:min-w-[150px]">Account</th>
                        <th scope="col" className="text-right p-3 !whitespace-normal">Stake</th>
                        {/* ⭐ THE DAY'S BUDGET, FALLING (owner, 2026-09-24) — 373's named fallback: the ceiling is
                            in the header so the cell carries ONE figure. ⛔ ON THE DESK-WIDE TABLE EACH ROW COUNTS
                            AGAINST ITS OWN ACCOUNT'S CAP, which is why the reader looks both up per account. */}
                        <th scope="col" className="text-right p-3 !whitespace-normal">Left today</th>
                        <th scope="col" className="text-left p-3 min-w-[128px]">When (EAT)</th>
                        <th scope="col" className="text-left p-3 min-w-[110px]">Outcome</th>
                        <th scope="col" className="text-left p-3">Type</th>
                        <th scope="col" className="text-left p-3">Product</th>
                        {/* ⛔ BESIDE PRODUCT, NOT FIRST — the account page says why in full. The
                            desk-wide table leads with Account and Stake, and neither may leave the 360 strip. */}
                        <th scope="col" className="text-left p-3 !whitespace-normal">Game</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Note</th>
                        {/* ⛔ THE CONTROL COLUMN CARRIES NO HEADER WORD — the kit's own shape for a per-row control
                            (`/admin/kyc`, `/admin/approvals`): the control says what it does, and a header
                            repeating it would spend a column name on nothing. */}
                        <th scope="col" className="text-right p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {feedRows.length === 0 ? (
                        <AdminTableEmpty colSpan={10} title={feedView.feedEmpty.title} body={feedView.feedEmpty.body} />
                      ) : (
                        feedRows.map((r, i) => (
                          /* ⛔ THE BELL'S OWN ROW IS MARKED BY A FLAG, NEVER BY ITS ID. An id in an attribute is
                             served markup, and a bounded record id is the one thing D19 says this section may
                             never put in a response it does not have to. */
                          <tr key={`${r.whenTitle}-${i}`} className={`border-b border-border-subtle${r.anchored ? " bg-bg-overlay" : ""}`}>
                            <td className="p-3">
                              {/* 🔴 AND IT IS NOT `.row-link`, WHICH IS THE POINT AND WAS FOUND ON A PHOTOGRAPH.
                                  `.row-link` is the platform's row-EXIT style and it carries
                                  `text-transform: uppercase` + `letter-spacing: .10em`; every one of its other call
                                  sites wraps a FIXED WORD — "open →", "manage →". These two cells wrapped the
                                  Owner's own typed label, and were the only two places in this repository where
                                  that class held operator data. MEASURED off the served page with computed styles:
                                  the roster painted `Evening desk - widest label yetX` with `text-transform: none`
                                  while these two painted `EVENING DESK - WIDEST LABEL YETX` — the SAME label, two
                                  looks, 40px apart on one screen, which is the exact defect this section was pulled
                                  up on. ⛔ And 474 says operator data is bounded, never REWRITTEN: a CSS transform
                                  rewrites it for every reader and into every screenshot.
                                  ⛔ THE SHARED RULE IS NOT EDITED — it governs ten other pages and their fixed
                                  words are right to be uppercase. The geometry that mattered is kept at the call
                                  site (`inline-flex` + the `--tap-min` floor, the repo's own idiom), and only the
                                  two declarations that rewrite the text are absent. */
                              }
                              {/* ⛔ RULING 474 · an account's label is OPERATOR DATA and the DOM says so — 453's
                                  lexicon binds this section's COPY and may not silently rewrite what the Owner
                                  typed. The console's own three subject words
                                  (`CONSOLE_ACCOUNT_WORD`) carry no hook, because they are not the Owner's text.
                                  ⛔ AND NONE OF THEM MAY BE AN EVENT WORD (M6): `gone` read "Removed from the desk",
                                  the event word for a removal, so this column stated what happened instead of who
                                  it happened to. A case compares the whole of both maps. */}
                              {r.accountIsOperatorText
                                ? <Link href={r.accountHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] font-medium text-royal-300 hover:underline" data-operator-text="label">{r.accountName}</Link>
                                : <span className="text-text-tertiary">{r.accountName}</span>}
                              {/* The holder, as a HANDLE and nothing else (04 R6) — never a name, a phone or an
                                  email, because a row outlives the holder's erasure. */}
                              {r.accountHandle && <div className="font-mono text-body-sm text-text-subtle">{r.accountHandle}</div>}
                            </td>
                            <td className="p-3 tabular text-right"><span className="amount">{r.stake}</span></td>
                            {/* ⛔ A DASH, NOT A ZERO, AND NOT A FULL BUDGET — the four cases the reader refuses to
                                answer for are "no answer", never "nothing was spent". */}
                            <td className="p-3 tabular text-right" title={r.leftTodayTitle ?? undefined}>
                              {r.leftToday === null
                                ? <span className="text-text-tertiary">—</span>
                                : <span className="amount">{r.leftToday}</span>}
                            </td>
                            <td className="p-3 tabular text-text-secondary" title={r.whenTitle}>
                              {r.when}
                              {/* ⭐ A QUEUED STAKE SAYS WHEN IT FIRES AND WHEN IT GIVES UP (register C8): the When
                                  column is the instant the engine DECIDED, which for a held COUNTER can be minutes
                                  before anything happens. The server owns every word of this line. */}
                              {/* ⛔ THE DUE LINE WRAPS; THE TIMESTAMP ABOVE IT STILL DOES NOT (measured 2026-09-24).
                                  🔴 `.admin-tbl td.tabular` is `white-space: nowrap`, and this sub-line is a SENTENCE —
                                  "fires in 3 min · 08:34:12 EAT · expires 08:43" — so it could not break and set the When
                                  column to 250px at 360. That pushed the STAKE cell to 271..405 while the scroll strip ends
                                  at 339: the money answer was off the phone, and `qa:house-bots-visual` §5.2 had been failing
                                  on this tab. ⛔ A15/432(b) forbids CLIPPING money or a timestamp; wrapping a sentence that
                                  mentions times is neither, and `{r.when}` above keeps the inherited nowrap that protects it. */}
                              {r.due !== null && <span className="block text-caption text-text-tertiary whitespace-normal">{r.due}</span>}
                            </td>
                            <td className="p-3"><Chip size="sm" variant={r.statusChip}>{r.statusWord}</Chip></td>
                            <td className="p-3 text-text">{r.typeWord}</td>
                            <td className="p-3 text-text-secondary">{r.productWord}</td>
                            {/* The same cell as the account page's Activity tab, and it must stay the same:
                                one reader builds both rows, so two renderings would be two truths. */}
                            <td className="p-3 min-w-[22ch] max-w-[34ch]">
                              {r.marketHref === null ? (
                                <span className="text-text-tertiary">—</span>
                              ) : r.marketName === null ? (
                                /* ⚠️ NO NAME, BUT STILL A DOOR — an older row wrote no snapshot. This
                                   label is the CONSOLE's own copy, so it carries no operator mark and 453 still reads it. */
                                <Link href={r.marketHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline">Open the market</Link>
                              ) : (
                                <Link href={r.marketHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline">
                                  <span data-operator-text="marketTitle">{r.marketName}</span>
                                </Link>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary">{r.note ?? "\u2014"}</td>
                            <td className="p-3 text-right">
                              {/* ⛔ 432(a) · THE CONTROL IS DRAWN ONLY WHERE IT CAN DO SOMETHING. A stake already in
                                  flight cannot be stopped — the service refuses it — so no button is offered over
                                  one, and the rows that carry the control are exactly the rows the badge counts. */}
                              {r.cancelId !== null && feedView.cancelCopy !== null && (
                                <StopQueued id={r.cancelId} copy={feedView.cancelCopy} act={cancelDeskIntentAction} />
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              </>
            )}
            {/* ⛔ THE TOTAL IS THE COUNTING READER'S, NEVER `feedRows.length` (344): the house DAL clamps every list
                reader at 500 rows, so a total taken from the page would stop the pager short of the last page.
                `page` and not a panel-local name, because the window filter resets exactly that word. */}
            {feedRows !== null && feedView.feedTotal !== null && (
              <div className="p-4 pt-0">
                <AdminPagination
                  total={feedView.feedTotal}
                  page={feedView.feedPage}
                  perPage={feedView.feedPerPage}
                  param="page"
                  baseHref={buildBaseHref(CONSOLE_ROUTE, feedView.feedParams, "page")}
                />
              </div>
            )}
          </AdminCard>
          </>)}
        </>)}

        {tab === "limits" && (<>
          {/* 364 · the all-bots twins of the per-account usage card: the daily stake cap, the daily loss cap read
              TWICE against ONE limit (366 — the seam refuses a new stake on PROJECTED loss and a stop fires only on
              SETTLED loss, so collapsing them would hide the figure one of the two controls acts on), the open
              exposure cap scoped "open now", and the targeted-and-manual daily cap.
              ⛔ NO ROW FOR THE PER-MARKET, PER-PLAYER OR COUNTERPARTY-SHARE CAPS (365): this console renders no
              per-market, per-player or per-officer money figure, so a usage bar for one would be a figure with no
              population an officer could act on. They appear in the list below as VALUES, which is not a usage. */}
          {/* ⛔ NOT RENDERED IN 421's SCHEMA STATE, FOR THE REASON THE STRIP IS NOT (432(e), 432(n)). With no
              control row this card and the one below it each painted an `AdminLoadError` — "limit usage" and "the
              global limits" — directly under the Callout that had already said the tables are not on this database.
              421 asks for ONE Callout; 355 reserves the kit's failure treatment for a read that FAILED, and a table
              that is not on the database has not failed to be read. The reader now answers `[]` in that state and
              `null` only for a real failure, so `AdminLoadError` below still means what it says. */}
          {!view.schemaMissing && (
          <AdminCard title="Limit usage">
            {usageRows === null ? (
              /* 372(c) · a whole-panel failure is the kit's own treatment — never a card of bars at zero. */
              <AdminLoadError what="limit usage" />
            ) : (
              /* ⛔ THE SAME 640 COLUMN THE LIMITS LIST BELOW IT USES, AND IT WAS READ OFF THE TILE. At 1280 the card
                 is the page's full width, so a 10px `ProgressBar` track ran 640→1228px with a 0% fill: five of them
                 read as horizontal RULES above their captions, indistinguishable from a divider, and the card sat at
                 a different width from the limits card directly beneath it. A meter that reads as a rule is not a
                 meter (§A4: the shape is the signal, never the colour). `FormColumn` is the kit's own measure token,
                 which is why no width is hand-typed here. */
              <FormColumn measure="form">
                <div className="space-y-4">
                  {usageRows.map((r) => <UsageBar key={r.name} row={r} unsetHref={view.limitsFirstUnsetHref} />)}
                </div>
              </FormColumn>
            )}
          </AdminCard>
          )}

          {/* ⭐ THE PANEL STOPS BEING READ-ONLY (replan ruling 537, which REVERSES ruling 433(a)).
              433(a) shipped this list read-only on the ground that "there is no limits-SAVE service in this
              repository". Measured since: `houseBotControlStore.saveLimits` EXISTS in both twins with CAS
              semantics, its whole validation surface is green, and `house_bot.limits_saved` is already classified
              — what was missing was ONE SERVER ACTION. 432(a) forbids a control with nothing behind it; it does
              not license leaving a control unbuilt when the thing behind it is built, tested and CAS-safe.
              ⛔ THE COLUMN STAYS `FormColumn measure="form"` (412), which is why the measure did not move when the
              inputs arrived — the read-only pass was already standing in the form's own column.
              ⛔ NO FORM WITHOUT A BASE VERSION. `limitsVersion` is null exactly when there is no row to save
              against, and a form whose base version is unknown could only ever clobber a second writer. */}
          {!view.schemaMissing && (
          <AdminCard title={LIMITS_CARD_TITLE}>
            {limitRows === null || limitsVersion === null ? (
              <AdminLoadError what="the global limits" />
            ) : (
              <FormColumn measure="form">
                {/* ⛔ THE `id` IS A LITERAL AND IT IS WRITTEN HERE, IN THE PAGE, NOT IN THE FORM.
                    `test:tab-anchors` reads THIS FILE as text for `id="limits-first-unset"` and decides which tab
                    owns it by the nearest tab-group opener above it: an `id={cond ? "limits-first-unset" :
                    undefined}` compiles, paints correctly and is INVISIBLE to it, and the same literal inside a
                    component sits ABOVE every tab group and reads as "above the rail". Both were measured on this
                    file. So the page NAMES the anchor and the form PLACES it, on the first unset required limit —
                    which is what the strip's "Set N global limits first →" promises the officer will find. */}
                <DeskLimitsForm rows={limitRows} baseVersion={limitsVersion} id="limits-first-unset" omitSection={LIMITS_CARD_TITLE} recommendCopy={recommendCopy ?? { label: "", filledTitle: "", filledBody: "" }} onSave={saveDeskLimitsAction} />
              </FormColumn>
            )}
          </AdminCard>
          )}
        </>)}

        {tab === "history" && (<>
          {historyView !== null && (<>
          {/* ⭐ C7 STEP 5 · EVERY CHANGE TO THE DESK AND TO THE ACCOUNTS ON IT, NEWEST FIRST — the durable record of
              who did what. ⛔ IT CARRIES THE CONTROL ROW'S OWN EVENTS and the account page's cannot: the switch, a
              limits save and the withdrawal belong to no account, so a per-account narrowing correctly drops them
              and this list must not.
              ⛔ NO AMOUNT AND NO BALANCE (266, 369(c), 456). `money-hook.ts` writes `amountTzs` and `balanceTzs`
              — the HOLDER'S OWN WALLET BALANCE — onto every OWNER_MONEY event; this panel carries neither, and a
              money row links instead to the platform's own transactions screen, where an admin may legitimately
              read a player's money. ⛔ The Event cell is the console's own TOTAL word map, never a raw enum: the
              lexicon cannot see `HOLDER_AGAINST_BOT` at all, because an underscore is a word character. */}
          <AdminCard padding="p-0">
            {historyRows === null ? (
              <div className="p-4"><AdminLoadError what="the desk's history" /></div>
            ) : (
              <>
                <div className="px-4 pt-4">
                  <p className="text-body-sm text-text-tertiary">{historyView.historyOrderNote}</p>
                </div>
                <ScrollX label="Desk history">
                  <table className="admin-tbl">
                    <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                      <tr>
                        <th scope="col" className="text-left p-3 min-w-[150px]">Account</th>
                        <th scope="col" className="text-left p-3 min-w-[128px]">When (EAT)</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Event</th>
                        <th scope="col" className="text-left p-3">Change</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Who</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.length === 0 ? (
                        <AdminTableEmpty colSpan={5} title={historyView.historyEmpty.title} body={historyView.historyEmpty.body} />
                      ) : (
                        historyRows.map((r, i) => (
                          <tr key={`${r.whenTitle}-${i}`} className={`border-b border-border-subtle${r.anchored ? " bg-bg-overlay" : ""}`}>
                            <td className="p-3">
                              {/* ⛔ THE SAME ACCOUNT CELL AS THE PANEL ABOVE (§K5, and the reason this section was
                                  pulled up on): one shape for one thing. A row the desk itself owns — the switch,
                                  a limits save, the withdrawal — belongs to no account and opens no page, so it is
                                  the console's own word in plain text and not a link to nowhere (432(a)). */}
                              {r.accountIsOperatorText
                                ? <Link href={r.accountHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] font-medium text-royal-300 hover:underline" data-operator-text="label">{r.accountName}</Link>
                                : <span className="text-text-tertiary">{r.accountName}</span>}
                            </td>
                            <td className="p-3 tabular text-text-secondary" title={r.whenTitle}>{r.when}</td>
                            <td className="p-3 text-text">
                              {r.eventWord}
                              {r.moneyHref && (
                                <Link href={r.moneyHref as Route} className="block text-body-sm underline text-text-secondary">
                                  Find it on the transactions screen
                                </Link>
                              )}
                            </td>
                            {/* \u26d4 A RELATION, NOT A SENTENCE \u2014 so it does not break across lines. This cell holds a
                                bounded PAIR ("Paused \u2192 Active") and at 360 it came apart into three line boxes
                                with the arrow alone on the middle one, which is not the relation any more. Same
                                decision, same reason and the same safety as the two cells around it: the table is
                                inside `ScrollX`. */}
                            <td className="p-3 text-text-secondary whitespace-nowrap">{r.change ?? "\u2014"}</td>
                            {/* 🔴 `break-all` IS GONE, AND IT WAS READ OFF A TILE AT 640. Ruling 420 paints the
                                actor as an ID on purpose — and `break-all` breaks INSIDE the word, so on THIS
                                table (the only one of the two carrying an Account column, which takes a 150px
                                floor) the Who column was squeezed to about 55px and `usr_ops_visual_officer`
                                shattered into SIX one-to-four-character lines: `usr_` `ops_` `visu` `al_o`
                                `ffic` `er`. The account page's copy of the same cell, one column lighter, broke
                                cleanly in two — one value, two treatments, which is the defect this section has
                                been pulled up on twice. At 360 it was worse than ugly: the shattered cell set
                                the ROW height, so the desk history showed four rows per screen of mostly empty
                                space, driven by a column that was off-screen inside the scroller.
                                ⛔ The floor and the single line are safe because this table is already inside
                                `ScrollX` — the id scrolls, exactly as the money and timestamp columns do, and
                                `.admin-tbl td.tabular`'s nowrap is the same decision for the same reason. */}
                            <td className="p-3 font-mono text-body-sm text-text-subtle whitespace-nowrap">{r.who}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              </>
            )}
            {historyRows !== null && historyView.historyTotal !== null && (
              <div className="p-4 pt-0">
                <AdminPagination
                  total={historyView.historyTotal}
                  page={historyView.historyPage}
                  perPage={historyView.historyPerPage}
                  param="hpage"
                  baseHref={buildBaseHref(CONSOLE_ROUTE, historyView.historyParams, "hpage")}
                />
              </div>
            )}
          </AdminCard>
          </>)}
        </>)}
      </AdminBody>
    </>
  );
}
