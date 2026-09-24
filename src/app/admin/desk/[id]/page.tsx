/**
 * ONE ACCOUNT ON THE DESK — what is stopping it, how close it is to the limits that would stop it, what it was
 * configured to do, and what it has been pointed at.
 *
 * ── THE LAW THIS PAGE IS BUILT ON ──────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **THE AUDIENCE IS DECIDED FIRST, AND THE NOT-FOUND ANSWER COMES AFTER IT** (C7-SPEC rulings 259, 300, 380, 399).
 * A layout's verdict changes what is PAINTED, not what is SENT, so a signed-in PLAYER reaches this route. If the
 * record check ran first, the honest `notFound()` would become an ORACLE: a player could enumerate every live record
 * id by status code, with no feature word anywhere in either body and therefore invisible to the probe's needle test,
 * which scans for words, labels and ids and not for a status pattern. The gated reader resolves the audience before
 * it reads the row and answers `null` for a refused viewer and `{ found: false }` for a missing record, so the
 * 404/200 difference is visible to the ADMIN alone. ⚠️ The measured counter-example is next door: `/admin/kyc/[id]`
 * answers `notFound()` for a missing record and 200 with the whole case for a refused viewer.
 *
 * ⛔ **THE READS ARE NOT HERE** (ruling 340). This file names no read module and no store. One gated reader,
 * `houseDetailForConsole`, performs them inside `house-console-read.ts` after its own verdict and hands back a
 * PAINTED view model — finished strings, numbers and booleans.
 *
 * ⛔ **NO BALANCE** (rulings 368, 459, 266). The holder's wallet is read once and what this page paints is a STATE:
 * which side of the configured floor the account is on. The floor is a limit and may be named; the balance is a real
 * person's money and is one link away on the platform's own transactions screen (456).
 *
 * ⛔ **THE COPY IS NEUTRAL** (owner-delegated ruling 453). Nothing here names the feature: an entry is an "account",
 * the section is "the desk", money moved is a "stake", a ceiling is a "limit". The one exception is the account's own
 * LABEL, which is operator data and is exempted by name (ruling 474).
 *
 * @see src/lib/server/house-console-read.ts · src/lib/house-bot/console-routes.ts · plans/house-bots/C7-SPEC.md
 */
import type { Route } from "next";
import { WayOutLink } from "../way-out-link";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { FormColumn } from "@/components/ui/form-column";
import { ScrollX } from "@/components/ui/scroll-x";
import { Tabs } from "@/components/ui/tabs";
import { currentSession } from "@/lib/server/auth-service";
import { CONSOLE_REFUSAL_TITLE, houseDetailForConsole, houseWhyIdleForConsole, type ConsoleDetailView, type ConsoleQuery, type ConsoleRuleRow } from "@/lib/server/house-console-read";
import { ActivityFilters } from "../activity-filters";
import { CONSOLE_DETAIL_TABS, CONSOLE_LIMITS_FIRST_UNSET_HREF, CONSOLE_ROUTE, consoleBotTabHref, consoleDetailTab, consoleWhyHref } from "@/lib/house-bot/console-routes";
import { UsageBar } from "../page";
/* ⛔ THE PAGE OWNS THE IMPORT OF THE ACTION AND HANDS IT DOWN (ruling 422): a client component under
 * `src/app/admin` that imports an actions module is in `test:admin-act-gate`'s population and must consult the
 * act gate — and on an Owner-only route `mayAct` IS `mayView`, so that consultation would be a branch that can
 * never be false, which 1.422 refuses under this section by name. */
import { runDeskAccountAction, saveBotRulesAction } from "../actions";
import { DeskRulesForm } from "./rules-form";
import { DeskAccountActions } from "./account-actions";

/** ⛔ A static neutral title (ruling 402). The account's own label is a GATED value and never reaches the tab. */
export const metadata = { title: "Admin · Desk" };
/** ⛔ Every figure is live money against a live limit (rulings 302, 356, 380). */
export const dynamic = "force-dynamic";

/** ⛔ ONE PER KEY OF THE CLOSED LIST, each the key in English sentence case (the rule 1.405 derives for the landing rail). */
const TAB_LABEL: Record<(typeof CONSOLE_DETAIL_TABS)[number], string> = {
  overview: "Overview", activity: "Activity", rules: "Rules", targets: "Targets", history: "History",
};

/**
 * WHAT EACH PANEL IS FOR, in one sentence — the same shape the desk's own tabs carry, because an officer
 * moving between the two should not meet two different conventions in one section.
 *
 * ⛔ EVERY LINE IS DERIVED FROM THE CODE IT DESCRIBES: the eleven caps from `REQUIRED_FOR_START`, "a product
 * and a mode" from `rulesStartProblems`'s two refusals, and the feed/history populations from the counting
 * readers the pagers share with their lists. ⛔ None restates a figure the panel renders — the Targets tab
 * already carries its own active count as a badge.
 * ⚠️ NEUTRAL WORDS ONLY (D19/453): rendered inside the console subtree that `qa:house-bots-visual` scans.
 */
const TAB_GUIDANCE: Record<(typeof CONSOLE_DETAIL_TABS)[number], string> = {
  overview: "This account's state, who designated it and when, and what it has used today of each of its own limits.",
  activity: "Every stake this one account has decided on, newest first — placed, queued, refused or failed.",
  rules: "What this account may do: which products and entry modes, the markets it is allowed to touch, how it sizes and times a stake, and its own eleven limits. All eleven must be set, and a product and an entry mode chosen, before Start will run it.",
  /* 🔴 THE SECOND SENTENCE USED TO READ "Each one can be stopped before it fires." — a control this build does
     not have, on a panel that renders no control at all, describing rows nothing in `src/` can create. Measured
     2026-09-21: of the five declared press purposes only the cancel has a screen, and nothing under `src/`
     inserts a target row, so this list is empty on every account and will stay empty. An officer reading the
     old line looked for a Stop button, found none, and concluded the page was broken. ⛔ The panel says what is
     true and what is missing, which is the whole of ruling 432(a) applied to a sentence rather than a button. */
  targets: "Stakes an officer has planned on a chosen poll, rather than left to the engine. No screen on this build can plan one yet, so this list stays empty until that is built.",
  history: "Every change made to this account — designated, verified, started, paused, removed, and each time its rules or limits were saved.",
};

/**
 * THE SAVED-RULES CARD, WRITTEN ONCE FOR BOTH STATES (C7 step 7 review, visual-8).
 *
 * It was two copies of one `<dl>` that differed in exactly one line, with nothing saying why — so the drift was
 * invisible and the next edit would have landed on one of them. One component, one difference, and the
 * difference is named:
 *
 * ⛔ A REMOVED ACCOUNT GETS NO CAPTIONS, DELIBERATELY (ruling 432(n), and this is the record of the decision).
 * A caption reads "Not set — this account cannot place a bet.", which is a LIVE consequence of an unset limit.
 * On a removed account the Callout two cards up already says "Nothing can be staked from this account and none
 * of its limits applies any more" — so printing the consequence beside each row would be the page saying two
 * things at once about the same account. The rows stay, because 358 keeps them as a RECORD of what it was
 * configured to do; only the live reading of them goes.
 */
function SavedRulesCard({ rows, reason, captions }: { rows: ConsoleRuleRow[] | null; reason: string; captions: boolean }) {
  return (
    <AdminCard title="Saved rules">
      {rows === null ? (
        <AdminLoadError what="the saved rules" />
      ) : (
        <FormColumn measure="form">
          <p className="text-body-sm text-text-tertiary mb-4">{reason}</p>
          <dl className="space-y-3">
            {rows.map((r) => (
              <div key={`${r.section}-${r.name}`} className="flex items-baseline justify-between gap-4 flex-wrap">
                <dt className="text-body-sm text-text-secondary min-w-0">{r.name}</dt>
                {/* ⛔ THE FIGURE WEARS THE FACE THE ROW NAMES (rulings 401, 409), and the page never decides it.
                    🔴 Measured by the render on 2026-09-20: this `<dd>` printed "TZS 900,000,000" as plain body
                    text while the limits panel one tab away printed the identical value through
                    `amount tabular-nums` — one section, one kind of value, two looks. `.amount` is also the class
                    `qa:house-bots-visual` §5.1 scans, so every cap here sat outside the money-clipping gate.
                    ⛔ A COUNT IS NOT MONEY (409): it gets the mono/tabular face without `.amount`'s `nowrap` and
                    without its money meaning. A word ("Polls", "Off", "Not set") stays body text — putting a state
                    on the money axis is the mislabelled-amount defect 266 struck. */}
                {/* ⛔ `ml-auto` KEEPS THE VALUE IN ITS COLUMN WHEN THE LABEL PUSHES IT ONTO A SECOND LINE, AND THAT
                    WAS READ OFF A 360 TILE. The row is `justify-between` + `flex-wrap`, which places the value at
                    the END of a shared line and at the START of its own — so on "Targeted and manual daily cap",
                    the one label too long to share a line at 360, **TZS 900,000,000 dropped below its label and
                    set flush LEFT**, one money figure out of the column the other seventeen rows keep. A figure
                    that leaves the money axis reads as a different kind of row (§A5/§A6), and `.amount`'s `nowrap`
                    cannot help: it is the whole value that wraps, not the digits. `ml-auto` is the end of the line
                    in BOTH cases, so nothing about the unwrapped rows changes. */}
                <dd className="text-body-sm text-text text-right min-w-0 ml-auto">
                  {r.face === "word" ? r.value : <span className={r.face === "money" ? "amount tabular-nums" : "font-mono tabular-nums"}>{r.value}</span>}
                  {captions && r.caption && <span className="block text-body-sm text-warning-fg">{r.caption}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </FormColumn>
      )}
    </AdminCard>
  );
}

/**
 * ⭐ "WHY THIS ACCOUNT IS NOT BETTING" — ONE COMPONENT FOR THE OVERVIEW AND FOR THE HEAD OF THE RULES FORM (prod
 * finding 2026-09-22). An ACTIVE account on a switched-ON desk had matched no market for days, and nothing on
 * any screen said why: both products ticked, both scope lists empty, and the engine's predicate refusing every
 * market before a cap or a probability was read. The model is the SERVER's (`rulesInertReasons`, the predicate
 * the engine decides with), so this panel and `decide.ts` cannot diverge; the page chooses only the skin.
 * ⛔ `linked` is false on the rules tab, where the form the link would open is directly below (432(a): a link
 * to the page it is on is a control that does nothing). ⛔ The empty sentence is about the RULES: the strip
 * above the rail already says whether the desk is off or the account is paused (432(n)).
 */
function WhyNotBettingCard({ model, linked }: { model: NonNullable<ConsoleDetailView["whyNotBetting"]>; linked: boolean }) {
  return (
    <AdminCard title={model.title}>
      <FormColumn measure="form">
        {model.items.length === 0 ? (
          <p className="text-body-sm text-text-secondary" data-why-empty>{model.empty}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {model.items.map((it) => (
                <li key={`${it.key}-${it.message}`} className="max-w-[72ch]" data-why-item={it.key}>
                  <span className="block text-body-sm text-text-secondary">{it.label}</span>
                  <span className="block text-body-sm text-warning-fg">{it.message}</span>
                </li>
              ))}
            </ul>
            {linked && (
              <p className="mt-3">
                <Link href={model.href as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline">
                  {model.hrefLabel} →
                </Link>
              </p>
            )}
          </>
        )}
      </FormColumn>
    </AdminCard>
  );
}

type DeskAccountProps = {
  params: Promise<{ id: string }>;
  /**
   * ⛔ THE WHOLE QUERY STRING GOES TO THE DOOR, UNREAD BY THIS FILE (rulings 259, 383, 387). This page is served 200
   * to any signed-in account and a crafted address is free, so every value is checked against a closed list or a
   * shape inside `houseDetailForConsole` — which also builds the rail's own links from that same parse, so the
   * control an officer clicks and the read the server takes cannot disagree.
   */
  searchParams: Promise<ConsoleQuery>;
};

/**
 * W25 BELT 2 — this page carries its OWN gate, on the viewer's STORED row.
 *
 * ⭐ IT ARRIVED UNGATED THROUGH A MERGE, AND THE RATCHET IS WHAT CAUGHT IT. This page did not exist when the 53-page
 * retrofit landed; it came in with `origin/main` `8416a37c` (C7 step 4a). `admin-section-gate.test.mjs` §0b named it
 * immediately — which is the entire argument for a ratchet over a sweep: a sweep is true on the day it is run, and a
 * ratchet is true afterwards.
 *
 * ⛔ `title="Desk"` IS LOAD-BEARING (C7-SPEC ruling 301). The gate titles its restricted panel from the LAST URL
 * SEGMENT, and this route's last segment is a house-bot record id — so without an explicit section title the panel's
 * heading would BE that raw id, printed in a body served to whoever asked. Under D19 that is the one thing this
 * section may never do.
 *
 * ⛔ ADDITIVE. The page's own verdict below (awaited before the record is read, ruling 399) is KEPT VERBATIM: it is
 * the feature's audience rule, which is narrower than "is a staff member". This gate answers the platform question.
 */
export default async function AdminDeskAccountPage(props: DeskAccountProps) {
  return <AdminPageGate title="Desk"><AdminDeskAccountContent {...props} /></AdminPageGate>;
}

async function AdminDeskAccountContent({
  params,
  searchParams,
}: DeskAccountProps) {
  /* ⛔ THE VERDICT IS AWAITED FIRST, BEFORE THE RECORD IS READ AND BEFORE `notFound()` CAN BE REACHED (399).
     ⚠️ `searchParams` is read ABOVE the gate only because the page's three pagers, its rail and its two bell
     anchors are all arguments to it. It is the REQUEST's own query string and no record is touched to obtain it,
     so the verdict still precedes every read of the record and `notFound()` still cannot be reached before the
     refusal — and this file VALIDATES none of it: the door does, once, for the read and for the rail alike. */
  const session = await currentSession();
  const { id } = await params;
  const sp = await searchParams;
  const tab = consoleDetailTab(sp.tab);
  const answer = await houseDetailForConsole(session?.userId ?? null, "/admin/desk", id, sp);
  /**
   * ⭐ "WHY IS IT NOT STAKING?" — ASKED FOR, NEVER ON EVERY LOAD (2026-09-23).
   *
   * The answer is a WALK of live markets through the planner's own ladder, so it costs real reads per
   * market. On a page an officer opens twenty times an hour that would be a tax paid mostly by officers
   * who were not asking. So it is behind its own flag and its own door, and an account nobody asks about
   * costs nothing. ⛔ READ AS A FLAG, never as a name off the URL, exactly as `?reverify=1` is below.
   */
  const why = sp.why === "1" ? await houseWhyIdleForConsole(session?.userId ?? null, "/admin/desk", id) : null;
  if (!answer) return null;
  if (!answer.found) notFound();
  const view = answer;
  const rulesRows = view.rules;
  const targetRows = view.targets;
  const usageRows = view.usage;
  const countRows = view.counts;
  const feedRows = view.feed;
  const historyRows = view.history;
  /**
   * ⭐ THE BLOCKERS ARE NAMED ONCE PER SCREEN (D9 minor M7, 432(n) · 2026-09-23) — and the rule is ONE
   * expression, read by the callout and by the overview's panel, so the two cannot both fall silent or both
   * speak. On the Rules tab the panel at the head of the form carries the same names WITH their remedies, so the
   * callout is not drawn there; everywhere else the panel is not on the screen, so it is.
   * ⚠️ It binds the READINESS, not a boolean, so the callout's own body narrows off the same expression the
   * panel's guard tests — a boolean would need `view.startReadiness!` beside it, and a `!` is where the two
   * would part company again.
   */
  const calloutReadiness = !view.removed && tab !== "rules" && view.startReadiness !== null && view.startReadiness.blockers > 0
    ? view.startReadiness
    : null;

  return (
    <>
      {/* ⛔ THE HEAD CARRIES THE ACCOUNT'S OWN LABEL, WHICH IS A GATED VALUE (rulings 313, 402, 453, 474). The
          section gate paints a NEUTRAL title on the restricted panel, so a viewer outside the audience never sees
          this string; the loader beside this file carries no title at all for the same reason. */}
      <AdminPageHead
        title={view.label}
        titleIsOperatorText
        actions={
          <WayOutLink href={CONSOLE_ROUTE}>
            Back to the desk
          </WayOutLink>
        }
      />

      <AdminBody>
        {/* ⭐ THE ACCOUNT'S OWN STRIP, ABOVE THE RAIL ON EVERY TAB (DA §K 7d, ruling 406): its status, why it is
            stopped, and the one step that would move it. ⛔ The status word and the chip variant come from the ONE
            server map (rulings 311, 413) and are never typed beside the chip. */}
        <AdminCard padding="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              {/* ⛔ `shrink-0`, AND IT IS THE ROSTER'S OWN LESSON APPLIED TO THE PAGE THAT PAINTS THE SAME CHIP
                  (C7 step 7 review, visual-1). In a flex row a `size="sm"` chip is a shrinkable item and the
                  kit leaves its `whiteSpace` normal, so at 360 "Auto-paused" broke at its hyphen into a two-line
                  pill — "AUTO-" over "PAUSED" — beside the one-line ACTIVE and PAUSED pills of the other states.
                  A status word on two lines is not a status word. The roster fixed the same break with a column
                  floor; here the chip is what must not shrink. The kit pins `flexShrink` itself for `size="xs"`
                  only, and says why at `chip.tsx`. */}
              <Chip size="sm" variant={view.statusChip} className="shrink-0">{view.statusWord}</Chip>
              <div className="min-w-0">
                <div className="font-mono text-body-sm text-text-subtle">{view.handle}</div>
                {/* ⛔ THE WAY OUT IS A FINISHED SERVER STRING, IN THE CONSOLE'S OWN NEUTRAL WORDS (rulings 311,
                    432(f)). Seven of the shared table's twenty-two sentences name the feature; the console
                    overrides those in its copy home rather than rewriting the engine's own vocabulary. */}
                {view.wayOut && <p className="text-body-sm text-text-secondary mt-1 max-w-[60ch]">{view.wayOut}</p>}
                {/* ⛔ 432(j) · THE STATE WITH NO REASON BESIDE IT, WHICH C7 STEP 4a MEASURED AND LEFT OPEN. The way
                    out comes from the account's LIVE causes (311's law), so an AUTO-PAUSED account whose cause has
                    since cleared painted a claret chip with NOTHING under it — and that account can be Started
                    right now. A state with no reason on screen reads as a broken page. ⛔ The two are never both
                    painted: this is what the chip means when there is no live cause left. */}
                {view.statusNote && <p className="text-body-sm text-text-secondary mt-1 max-w-[60ch]">{view.statusNote}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
              {/* ⭐ X6 (replan ruling 507) · A MISSING HOLDER WALLET STOPS SETTLEMENT FOR EVERY PLAYER ON THE
                  MARKETS THIS ACCOUNT HOLDS OPEN STAKES IN. The register says in as many words that a condition
                  which stops OTHER PEOPLE'S money must not live only in an alert: an alert is read once and then
                  it is gone, and this is a state an officer has to be able to come back to. */}
              {view.settlementBlocked && <Chip size="sm" variant="danger">Settlement blocked</Chip>}
              {/* 456 · the door to a holder's money is the PLATFORM's own transactions screen, where an admin may
                  legitimately read a player's money — never a money tab of this section, which D20 struck. */}
              <WayOutLink href={view.holderHref}>
                Holder&apos;s transactions
              </WayOutLink>
              {/* ⭐ 456's OTHER HALF (Ali, 2026-09-23) · READING a holder's money and CHANGING it are both platform
                  acts, and until now only the reading one had a door here. An account stakes from an ordinary
                  player's wallet, so an officer who needs to fund it had to know, unaided, that the control lives
                  on that player's own page. ⛔ THE DESK STILL MOVES NO MONEY: this is a link to the platform's
                  audited control — mandatory reason, one atomic wallet + transaction + ledger write,
                  overdraw-guarded, COMPLIANCE-logged, and gated on the accounting capability, so an officer
                  without it is TOLD rather than shown a dead button. A money control of this section's own would
                  be a second ledger story to reconcile, and D20 struck that tab already. */}
              <WayOutLink href={view.holderFundsHref}>
                Add or adjust funds
              </WayOutLink>
              {/* ⭐ THE ONE QUESTION THE DESK COULD NOT ANSWER (2026-09-23). A running account with no bets
                  painted the same row whether there was nothing to stake on or four hundred markets had been
                  considered and refused. This asks the engine, on the spot, and prints what it says. ⛔ Not
                  offered on a REMOVED account: there is nothing left for it to stake on (358). */}
              {!view.removed && (
                <WayOutLink href={consoleWhyHref(view.id, tab)}>
                  Why is it not staking?
                </WayOutLink>
              )}
            </div>
          </div>

          {/* ⭐ THE ACTION ROW (C7-SPEC ruling 415; replan 549's 4b) — the half that makes this page OPERABLE. The
              server decides which acts this account's CURRENT state allows and hands down every word each dialog
              paints; this site chooses only where the row sits. ⛔ A REMOVED account gets an empty list and the
              component renders nothing, which is ruling 358's read-only page rather than a row of dead buttons.
              ⛔ Start is offered on a stopped account even though its service may refuse it: the refusal, with the
              href it carries, IS the workflow — it names what has to change. That is not the control-that-can-only
              -refuse 432(a) forbids, which is why the switch three cards up is disabled in that state and this is
              not. */}
          {view.acts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-subtle">
              {/* ⭐ THE WAY OUT OPENS THE DIALOG IT NAMES (register A5, 2026-09-23). The Start refusal has
                  always answered a stale consent with `?reverify=1`, and nothing read it — the officer landed
                  on this page with no dialog and nothing saying what to press. ⛔ Read as a FLAG, never as an
                  act name off the URL: only this one parameter opens anything, so a crafted link cannot open
                  a removal. */}
              <DeskAccountActions acts={view.acts} id={view.id} act={runDeskAccountAction} openAct={sp.reverify === "1" ? "REVERIFY" : null} />
            </div>
          )}
        </AdminCard>

        {/* ⭐ THE ANSWER, IN THE CONSOLE'S OWN SENTENCES. Every line here is `CONSOLE_SKIP_SENTENCE` — the
            engine's outcomes in the officer's words, from the one copy home (rulings 370(c), 453) — so a screen
            and a feed never describe the same refusal two ways. ⛔ The count column is `shrink-0` beside a
            `min-w-0` sentence (432(b)): a long reason wraps, the number never does. */}
        {!view.removed && (
          /* ⛔ THE GUARD IS THE PANEL'S OWN FIRST TERM, IN THE FORM 1.435 COUNTS (433(e)) — and the fragment
             is what keeps it there. `{!view.removed && why && (` guards this card just as truly, but the pin
             reads a literal shape, and a guard the instrument cannot see is a guard nobody will notice the
             loss of. ⚠️ `why` is ALSO null on a removed account, because the door refuses one; that is a
             second, independent answer, not this one. */
          <>{why && (
            <Callout tone="neutral" title="Why is it not staking?">
              {why.headline}
              {why.reasons.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {why.reasons.map((r) => (
                    <li key={r.text} className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0">{r.text}</span>
                      <span className="tabular-nums shrink-0">{r.markets}</span>
                    </li>
                  ))}
                </ul>
              )}
              {why.scanned && <p className="text-caption mt-3">{why.scanned}</p>}
            </Callout>
          )}</>
        )}

        {/* 358 · A REMOVED ACCOUNT IS READ-ONLY, AND THE CALLOUT IS THE STATE — not a failure and not an empty page.
            No action row is rendered here at all, because there is no action left to take. */}
        {view.removed && view.removedNote && (
          <Callout tone="neutral" title="This account was removed from the desk">
            {view.removedNote}
          </Callout>
        )}

        {/* ⭐ A REMOVED ACCOUNT GETS NO RAIL AT ALL, AND THAT WAS READ OFF A TILE (clause (a) of this step's own
            ruling, second reading). The first fix stopped the removed page painting `AdminLoadError` for reads
            ruling 358 says it never takes — and left a rail whose Overview tab rendered 600px of NOTHING and whose
            Targets tab would have painted the same failure treatment one click away. Ruling 312's law is that a
            rail option with no panel is a dead control; on this route that is a property of the RECORD, not only of
            the build. A removed account has exactly one thing left to show — what it was configured to do — so the
            page shows it, with no rail to click through and no empty panel behind one. */}
        {/* ⭐ WHAT IS STILL MISSING, ABOVE THE RAIL — the owner's report from the live demo, 2026-09-21:
            "we don't know what to fully fill before we can generate things".
            ⛔ IT SITS ABOVE THE RAIL BECAUSE IT IS A STATE, NOT A DETAIL (§K rule 7d). An officer must be able
            to see that the account is unfinished from whichever tab they happen to be on — a panel inside
            `rules` would only be visible to someone who had already found the thing it is telling them about.
            ⛔ AND IT IS PLACED ABOVE THE KPI BAND DELIBERATELY. Measured at 360 today: this section's per-panel
            guidance line ends at y=999 in an 800px viewport, so a sentence added to explain a tab is never read
            on a phone without scrolling past the strip, the callouts and four tiles. The one thing an officer
            opening an unfinished account needs is the first thing on the page.
            ⚠️ It says "still to fill", never "ready" — see `ConsoleStartReadiness`: it reads what is EMPTY, and
            only the start service decides what is acceptable.
            ⛔ AND IT IS NOT DRAWN ON THE RULES TAB (D9 minor M7, 432(n) · 2026-09-23). There the why-panel sits at
            the head of the form with the SAME names — the same list, since both now read one `blockerItems` — and
            a remedy sentence under each. Read on a fresh account at 1280 before the fix: the box said "2 things
            stop this account from betting · Products · Entry modes" and eighty pixels below it the panel said
            "Products — Choose at least one product." and "Entry modes — Turn on at least one entry mode." Two
            statements of one fact, and the fuller one is the one beside the control that fixes it. On every other
            tab the panel is not on the screen, so the callout is the only carrier and it is drawn. */}
        {calloutReadiness !== null && (
          <Callout
            tone="warning"
            size="md"
            surface="panel"
            role="status"
            /* ⛔ NO DENOMINATOR (2026-09-22). "3 of 13" counted caps plus two flags; the list is now the caps still
               unset plus every scope reason the engine's own predicate raises, which has no fixed total to be "of".
               A count that cannot be honest is not painted; the count that can be is.
               ⛔ AND THE HEADLINE IS THE SERVER'S (review finding 2026-09-22): "before this account can start" was
               typed here and painted beside a green ACTIVE chip on the production-shaped account. The lifecycle
               decides the sentence, and the lifecycle is the server's to read. */
            title={calloutReadiness.title}
          >
            {/* ⛔ NO WAY-OUT LINK, AND BOTH REASONS WERE MEASURED RATHER THAN ARGUED.
                ① IT PUSHED THE NOTICE OFF A PHONE. With an "Open Rules" line the box ran y=578..850 in an
                800px viewport at 360 — the fix for a sentence below the fold, itself below the fold. Without
                it: 578..798. The whole point of placing this above the KPI band was that an officer opening an
                unfinished account READS it without scrolling.
                ② IT WAS THE SAME FACT TWICE (432(n)). The rail is the next thing on the page and its `rules`
                tab now carries the very count this box states; a tab IS a destination, so the badge already
                says both what is missing and where to go. A second way out 40px above it buys nothing.
                ⚠️ AND `action` WOULD NOT HAVE WORKED ANYWAY — recorded because the next person will reach for
                it: `Callout` renders `action` ONLY in its `layout="stack"` branch (callout.tsx:280). In the
                default `row` layout the prop is accepted and SILENTLY DROPPED. The first form of this passed
                `action` and the link never appeared — found by reading the render, not by the compiler, which
                types it happily. `layout="stack"` is not the answer either: it centres the notice behind a
                56px icon plate and caps the body at 42ch, a hero treatment for thirteen field names. */}
            <ul className="flex flex-wrap gap-x-2 gap-y-1 max-w-[72ch]">
              {calloutReadiness.items.map((it) => (
                <li key={it.label} className="after:content-['·'] after:ml-2 last:after:content-['']">{it.label}</li>
              ))}
            </ul>
          </Callout>
        )}

        {/* 312 · the rail carries exactly the tabs whose panels exist. `activity` and `history` join it at C7 step 5
            with the readers behind them.
            ⛔ THE COMMENT IS BRACED. Wrapping this conditional in a fragment moved it INSIDE JSX, where a bare
            block comment is not a comment at all but TEXT — it would have printed the words of a code comment
            onto the account page. Caught by reading the edit, not by the compiler, which accepts it happily.
            ⚠️ And the first attempt at THIS sentence quoted the delimiters, which closed the comment early. */}
        {!view.removed && (
        <Tabs
          variant="line"
          ariaLabel="Account sections"
          value={tab}
          tabs={CONSOLE_DETAIL_TABS.map((k) => ({
            value: k,
            labelEn: TAB_LABEL[k],
            href: consoleBotTabHref(view.id, k),
            /* ⛔ `rules` CARRIES WHAT IS STILL MISSING INSIDE IT (owner's report, 2026-09-21: "tabs don't have
               marker to tell us something is missing in it"). The desk's rail has badged `limits` with its
               unset count since C7; this rail badged only `targets`, so the one tab that decides whether Start
               works at all showed nothing while every field inside it was empty.
               ⚠️ `|| undefined` rather than `?? undefined`: at ZERO the badge must be ABSENT, not a "0" —
               `CountBadge` renders nothing for 0, and a badge that says nothing is left is noise on a rail. */
            count: k === "targets" ? (view.targetsActive ?? undefined)
              : k === "rules" ? (view.startReadiness?.blockers || undefined)
              : undefined,
          }))}
        />
        )}
        {/* ⭐ The desk's own convention, applied to the account page so one section reads one way.
            ⛔ IT CARRIES ITS OWN `removed` GUARD rather than riding inside the rail's. Two siblings inside one
            guard need a fragment, and a fragment between `&& (` and `<Tabs` breaks `1.435`'s pin on the rail —
            a pin whose claim (the rail is guarded) is correct and should not be loosened to fit a wrapper.
            A new guarded panel is a new guard, which is exactly what `1.435`'s own note records happening when
            SIX BECAME EIGHT at C7 step 5. Eight becomes nine here, in the same commit as the panel.
            ⛔ `text-body-sm`, NOT `text-caption`: `test:type-scale` §3 holds reading copy to a 12.5px floor
            and 11px is a LABEL, not prose — guidance an officer is meant to READ belongs above that floor. */}
        {!view.removed && (
        <p className="px-4 lg:px-6 pt-3 text-body-sm text-text-tertiary max-w-[72ch]">{TAB_GUIDANCE[tab as (typeof CONSOLE_DETAIL_TABS)[number]]}</p>
        )}

        {/* 358 · THE ONE THING A REMOVED ACCOUNT STILL HOLDS: what it was configured to do. Kept as a record, never
            editable, and named as such rather than left to a reader to infer from a disabled control. */}
        {view.removed && (
          <SavedRulesCard rows={rulesRows} reason={view.rulesReason} captions={false} />
        )}

        {/* ⚠️ THE `(<>` … `</>)}` FORM IS LOAD-BEARING, NOT A HABIT (ruling 433(e)). `test:tab-anchors` decides which
            tab owns a rendered `id` by the nearest opener above it, and the served probe discovers this page's tabs
            by the same expression over the RAW file — so a second term in the condition, or the same expression in a
            comment, invents a panel that does not exist. */}
        {tab === "overview" && (<>
          {/* ⭐ A REMOVED ACCOUNT'S OVERVIEW RENDERS NOTHING AT ALL, AND THAT WAS READ OFF A TILE (clause (a) of
              this step's own ruling). The first render of `acct-removed-360.png` showed three cards under the
              terminal Callout: `AdminLoadError` reading "Couldn't load limit usage — A data read failed — this may
              not be empty", an EMPTY "Balance floor" card, and a "Last bet —" card. Every one of them is a lie in
              its own way. Nothing failed: ruling 358 says a removed account reads no usage, no wallet and no rate,
              so there was never a read to fail — and ruling 355 reserves the kit's failure treatment for a read
              that FAILED, which is the same distinction 421 had to be corrected for one card over. The Callout
              above the rail owns the state; the panel says nothing a second time (432(n)). */}
          {/* 363 · ONE money card, five money rows in the seam's own order, and the two count rows beside them.
              ⛔ TWO LOSS ROWS AGAINST ONE CAP (366): the seam refuses a new stake on PROJECTED loss and a stop
              fires only on SETTLED loss, so collapsing them would hide the figure one of the two acts on.
              ⛔ THE EXPOSURE ROW IS SCOPED "open now", NOT "today" (363): its reader has no day filter, so an
              exposure figure under a "today" heading would be a mislabelled amount. */}
          {!view.removed && (
          <AdminCard title="Limit usage">
            {usageRows === null || countRows === null ? (
              <AdminLoadError what="limit usage" />
            ) : (
              <FormColumn measure="form">
                <div className="space-y-4">
                  {usageRows.map((r, i) => <UsageBar key={`${r.name}-${i}`} row={r} unsetHref={CONSOLE_LIMITS_FIRST_UNSET_HREF} />)}
                  {countRows.map((r, i) => <UsageBar key={`${r.name}-${i}`} row={r} unsetHref={CONSOLE_LIMITS_FIRST_UNSET_HREF} />)}
                </div>
              </FormColumn>
            )}
          </AdminCard>
          )}

          {!view.removed && (
          /* ⛔ 368/459 · THE FLOOR STATE, NEVER THE BALANCE. `balanceFloorTzs` is a configured limit and may be
              named; the holder's balance belongs to a real person and is one link away on a platform surface. When
              the floor is not set, 364's third caption is the state instead — this page is the first surface that
              reaches that branch, because every row of the limits tab falls in one of the other two. */
          <AdminCard title="Balance floor">
            <p className="text-body-sm text-text-secondary">{view.floorSentence ?? view.floorUnsetCaption}</p>
          </AdminCard>
          )}

          {!view.removed && (
          /* 432(g) · the last placement, relative, with the absolute EAT time in `title`. "—" when it has never
             staked — never a fabricated zero and never a date that is not one. */
          <AdminCard title="Last bet">
            {view.lastBet === null ? (
              <p className="text-body-sm text-text-tertiary">—</p>
            ) : (
              <p className="text-body-sm text-text-secondary" title={view.lastBet.title}>{view.lastBet.text}</p>
            )}
          </AdminCard>
          )}

          {/* ⭐ WHY THIS ACCOUNT IS NOT BETTING (prod finding 2026-09-22) — the rules' own reasons, linked to the
              tab that fixes them. Its OWN `removed` guard, for the reason the guidance line has one (1.435).
              ⛔ AND NOT WHILE THE CALLOUT ABOVE IS NAMING THE SAME THINGS (M7, 432(n)). One screen states the
              blockers once: above the rail where an officer cannot miss them, or here when there is no callout —
              which is also the ONLY way the all-clear sentence ("Nothing in the rules or limits stops this account
              from betting.") is ever read, because a callout is not drawn at zero. The remedies live one click
              away on Rules, where the form that applies them is. ⚠️ The test is `calloutShown`, never
              `blockers === 0`: the two lists are one list, but the callout is also absent on a REMOVED account and
              on a read that produced no readiness at all, and in both of those the panel must still speak. */}
          {!view.removed && (
            calloutReadiness === null && view.whyNotBetting !== null && <WhyNotBettingCard model={view.whyNotBetting} linked />
          )}
        </>)}

        {tab === "activity" && (<>
          {/* ⭐ C7 STEP 5 · WHAT THIS ACCOUNT HAS TRIED TO STAKE, NEWEST FIRST, WITH WHAT HAPPENED TO EACH.
              ⛔ THE RAIL IS A DUMB RENDERER AND EVERY LINK IN IT IS SERVER-BUILT (319, 453): it types no route,
              no closed list and no label, so the control an officer clicks is built from the SAME parse the read
              is taken with. ⛔ ONE `data-filter-rail` under this section and it is NOT on the `<Tabs>`.
              ⛔ THE MONEY IS ONE INTENT'S OWN STAKE, SECOND COLUMN, NEVER A SUM (266, 360 role C, 373) — and no
              row carries `why`, `decision` or a trigger player's id, for the reasons the reader states by name. */}
          {!view.removed && (<>
          <ActivityFilters groups={view.feedFilters} presets={view.feedPresets} presetDefault={view.feedPresetDefault} />
          {/* 387/432(j) · an address that was not taken at its word SAYS SO, naming each axis it dropped —
              silently narrowing to something nobody asked for is the defect this sentence exists against. */}
          {view.queryRefusal && (
            <Callout tone="warning" title={CONSOLE_REFUSAL_TITLE}>{view.queryRefusal}</Callout>
          )}
          <AdminCard padding="p-0">
            {/* ⛔ 355 · A FAILED READ IS NEVER AN EMPTY TABLE. `null` means nobody could tell; an empty array means
                there is nothing there, and the two paint different treatments and say different things. */}
            {feedRows === null ? (
              <div className="p-4"><AdminLoadError what="this account's activity" /></div>
            ) : (
              <>
                <div className="px-4 pt-4">
                  <p className="text-body-sm text-text-tertiary">{view.feedOrderNote}</p>
                </div>
                <ScrollX label="Account activity">
                  {/* ⭐ THE MONEY ANSWERS FIT ON A PHONE, AND THE LEVER IS PADDING — the whole argument is at the
                      desk-wide table's own activity table, which carries the same two classes for the same reason:
                      `.admin-tbl td`/`th` are (0,1,1) with 16px gutters, so the `p-3` below is DEAD, and halving
                      the gutter at phone width buys back more strip than the type could. `sm:` restores the kit's
                      own 16px, so every width that already read well is unchanged. */}
                  <table className="admin-tbl [&_td]:!px-1.5 [&_th]:!px-1.5 sm:[&_td]:!px-4 sm:[&_th]:!px-4 max-sm:!text-caption">
                    <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                      <tr>
                        {/* ⭐ LOWERED AT PHONE WIDTH ONLY so the second money answer reaches the strip. The
                            timestamp keeps its nowrap either way — 432(b) forbids clipping a time, and the
                            due sub-line under it is the one part allowed to wrap. */}
                        <th scope="col" className="text-left p-3 min-w-[104px] sm:min-w-[128px]">When (EAT)</th>
                        <th scope="col" className="text-right p-3 !whitespace-normal">Stake</th>
                        {/* ⭐ THE DAY'S BUDGET, FALLING (owner, 2026-09-24). The CEILING is named here and not in
                            the cell — ruling 373's own named fallback for a third money cell, and the reason it
                            exists: two figures in one narrow cell is what put the money off a 360 screen before.
                            ⛔ "Left" is this HEADER's word, not a usage caption's: 361 governs the `used X of Y`
                            sentence and that sentence is untouched — it is the cell's `title`, verbatim. */}
                        <th scope="col" className="text-right p-3 !whitespace-normal">Left today</th>
                        <th scope="col" className="text-left p-3 min-w-[110px]">Outcome</th>
                        <th scope="col" className="text-left p-3">Type</th>
                        <th scope="col" className="text-left p-3">Product</th>
                        {/* ⛔ BESIDE PRODUCT, NOT FIRST. The visual gate's §5.2 contract measures the first
                            THREE cells — today When · Stake · Outcome — and asserts the subject and the first
                            money answer are in the 360 strip without scrolling. Putting the game there would
                            push the OUTCOME out on a phone, and "did it land" outranks "which game" at a
                            glance. Here it reads with Product, the other fact about what was played on. */}
                        <th scope="col" className="text-left p-3 !whitespace-normal">Game</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedRows.length === 0 ? (
                        <AdminTableEmpty colSpan={8} title={view.feedEmpty.title} body={view.feedEmpty.body} />
                      ) : (
                        feedRows.map((r, i) => (
                          /* ⛔ THE BELL'S OWN ROW IS MARKED BY A FLAG, NEVER BY ITS ID. An id in an attribute is
                             served markup, and a bounded record id is the one thing D19 says this section may
                             never put in a response. */
                          <tr key={`${r.whenTitle}-${i}`} className={`border-b border-border-subtle${r.anchored ? " bg-bg-overlay" : ""}`}>
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
                            <td className="p-3 tabular text-right"><span className="amount">{r.stake}</span></td>
                            {/* ⛔ A DASH, NOT A ZERO, AND NOT A FULL BUDGET. A row that moved no money, one from an
                                earlier day, an account with no daily cap and a row past the scan window all arrive
                                here as `null` — and every one of them is "no answer", never "nothing was spent". */}
                            <td className="p-3 tabular text-right" title={r.leftTodayTitle ?? undefined}>
                              {r.leftToday === null
                                ? <span className="text-text-tertiary">—</span>
                                : <span className="amount">{r.leftToday}</span>}
                            </td>
                            <td className="p-3"><Chip size="sm" variant={r.statusChip}>{r.statusWord}</Chip></td>
                            <td className="p-3 text-text">{r.typeWord}</td>
                            <td className="p-3 text-text-secondary">{r.productWord}</td>
                            <td className="p-3 min-w-[22ch] max-w-[34ch]">
                              {r.marketHref === null ? (
                                <span className="text-text-tertiary">—</span>
                              ) : r.marketName === null ? (
                                /* ⚠️ NO NAME, BUT STILL A DOOR. An older row wrote no snapshot; the market is
                                   still reachable and the officer still needs it. This label is the CONSOLE's
                                   own copy, so it carries no operator-text mark and 453 keeps scanning it. */
                                <Link href={r.marketHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline">Open the market</Link>
                              ) : (
                                <Link href={r.marketHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline">
                                  <span data-operator-text="marketTitle">{r.marketName}</span>
                                </Link>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary">{r.note ?? "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              </>
            )}
            {/* ⛔ THE TOTAL IS THE COUNTING READER'S, NEVER `feedRows.length` (344): the house DAL clamps every
                list reader at 500 rows, so a total taken from the page would stop the pager short of the last
                page. `page` and not a panel-local name, because the window filter resets exactly that word. */}
            {feedRows !== null && view.feedTotal !== null && (
              <div className="p-4 pt-0">
                <AdminPagination
                  total={view.feedTotal}
                  page={view.feedPage}
                  perPage={view.feedPerPage}
                  param="page"
                  baseHref={buildBaseHref(`${CONSOLE_ROUTE}/${view.id}`, view.feedParams, "page")}
                />
              </div>
            )}
          </AdminCard>
          </>)}
        </>)}

        {tab === "rules" && (<>
          {/* ⛔ EVERY PANEL IS GUARDED BY `removed` FROM THE INSIDE, NEVER BY A SECOND TERM IN THE TAB TEST
              (ruling 433(e)): `test:tab-anchors` decides which tab owns a rendered id by the nearest panel opener
              above it, and the served probe discovers this page's tabs with the same expression over the RAW file
              — so a second term would make a panel read as "above the rail", which is the strongest possible
              answer and a PASS that proves nothing. A removed account's panels are empty because the block above
              already shows the one thing it still holds.
              ⚠️ AND THIS COMMENT MAY NOT SPELL THE OPENER, which is the other half of 433(e) and which the first
              draft of this very sentence broke: the probe reads the RAW file, so a comment quoting the idiom
              invents a tab key no panel answers and the probe then requests a page that does not exist. Measured
              here, on the day it was written. */}
          {!view.removed && (<>
          {/* ⭐ 508 · THE SAVED RULES, NOW AS INPUTS (2026-09-21). This drew VALUES and a sentence saying editing
              was not ready on this build — which was true, and was the reason no account on the live desk could
              be started at all: `Start` refused on the unset limits and the missing product and mode, and its
              refusal sent the officer to this tab to save, where there was nothing to save with.
              ⛔ ONE CARD, NOT TWO. The form shows every value the card showed, so keeping the read-only card
              beside it would be the page saying one fact twice (432(n)) — the record of a REMOVED account is the
              branch that still needs the card, and it is drawn above by the `removed` guard.
              ⛔ THE PAGE OWNS THE IMPORT OF THE ACTION AND HANDS IT DOWN (ruling 422), like the account actions. */}
          {/* ⛔ THE FALLBACK IS THE CARD, NOT A SECOND LOAD ERROR (1.435 · 355). `rulesForm` is null in exactly
              the two states no form may overwrite — a read that could not be taken, and a stored document that
              would not parse — and the card already tells those apart in its own words. Adding an
              `AdminLoadError` here would put a SIXTH one on a page whose count 355 pins, and would tell an
              officer to refresh over rules that refreshing cannot fix. */}
          {/* ⭐ THE SAME WHY-PANEL, ABOVE THE FORM THAT FIXES IT — unlinked, because the form is right below. */}
          {view.whyNotBetting !== null && (
            <WhyNotBettingCard model={view.whyNotBetting} linked={false} />
          )}
          {view.rulesForm === null ? (
            <SavedRulesCard rows={rulesRows} reason={view.rulesReason} captions />
          ) : (
            <AdminCard title="Saved rules">
              <FormColumn measure="form">
                <p className="text-body-sm text-text-tertiary mb-4">{view.rulesReason}</p>
              </FormColumn>
              <DeskRulesForm accountId={id} model={view.rulesForm} onSave={saveBotRulesAction} />
            </AdminCard>
          )}
          </>)}
        </>)}

        {tab === "targets" && (<>
          {!view.removed && (<>
          {/* 508 · what this account has been pointed at, newest first. ⛔ No money here at all (365): a target is a
              scope decision, and a per-market figure would be the per-market house line D20 struck. */}
          <AdminCard padding="p-0">
            {targetRows === null ? (
              <div className="p-4"><AdminLoadError what="the targets" /></div>
            ) : (
              <ScrollX label="Account targets">
                <table className="admin-tbl">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th scope="col" className="text-left p-3 min-w-[150px]">Poll</th>
                      <th scope="col" className="text-left p-3 min-w-[128px]">Status</th>
                      <th scope="col" className="text-left p-3 !whitespace-normal">Last change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetRows.length === 0 ? (
                      <AdminTableEmpty
                        colSpan={3}
                        title="No targets yet"
                        /* ⛔ AND THE EMPTY STATE SAYS WHY IT IS EMPTY. "Targets appear here, newest first" reads
                           as "none have been made yet", which invites an officer to go and make one — and there
                           is nowhere to do that. An empty state that implies a missing action the product does
                           not have is the same dead end as a disabled control with no reason beside it. */
                        body="A target points this account at one poll. No screen on this build can plan one yet, so none will appear here until that is built."
                      />
                    ) : (
                      targetRows.map((t) => (
                        <tr key={t.id} className="border-b border-border-subtle">
                          <td className="p-3">
                            {/* ⛔ MARKED AS OPERATOR TEXT (474, 2026-09-24). It always was operator text; it
                                just was not declared, so the 453 scan read a market's question as this
                                section's copy. The value is clamped in the reader on the same bound. */}
                            <div className="text-text" data-operator-text="marketTitle">{t.title}</div>
                            {t.endCaption && <div className="text-body-sm text-text-subtle">{t.endCaption}</div>}
                          </td>
                          <td className="p-3"><Chip size="sm" variant={t.statusChip}>{t.statusWord}</Chip></td>
                          <td className="p-3 tabular text-text-secondary" title={t.whenTitle}>{t.when}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollX>
            )}
            {/* ⛔ THE PAGER, AND WHY THE TOTAL IS NOT `targetRows.length` (grid-paging §2.2). Every target this
                account has ever had is kept, so the list grows with every poll it is pointed at — a grid that
                rendered one read whole would hide row 21 with nothing on the page to say so. `targetsTotal` is
                the console reader's own COUNTING read; the house DAL clamps list readers at 500, so a total
                taken from the page would stop the pager short of the last page. `tpage` and not `page` because
                this grid shares its URL with the tab rail (and, later, any other list on this route). */}
            {targetRows !== null && view.targetsTotal !== null && (
              <div className="p-4 pt-0">
                <AdminPagination
                  total={view.targetsTotal}
                  page={view.targetsPage}
                  perPage={view.targetsPerPage}
                  param="tpage"
                  baseHref={buildBaseHref(`${CONSOLE_ROUTE}/${view.id}`, { tab: "targets" }, "tpage")}
                />
              </div>
            )}
          </AdminCard>
          </>)}
        </>)}

        {tab === "history" && (<>
          {/* ⭐ C7 STEP 5 · EVERY CHANGE TO THIS ACCOUNT, NEWEST FIRST — the durable record of who did what.
              ⛔ NO AMOUNT AND NO BALANCE (266, 369(c), 456). `money-hook.ts` writes `amountTzs` and `balanceTzs` —
              the HOLDER'S OWN WALLET BALANCE — onto every OWNER_MONEY event; this panel carries neither, and a
              money row links instead to the platform's own transactions screen, where an admin may legitimately
              read a player's money. ⛔ The Event cell is the console's own TOTAL word map, never a raw enum: the
              lexicon cannot see `HOLDER_AGAINST_BOT` at all, because an underscore is a word character. */}
          {!view.removed && (<>
          <AdminCard padding="p-0">
            {historyRows === null ? (
              <div className="p-4"><AdminLoadError what="this account's history" /></div>
            ) : (
              <>
                <div className="px-4 pt-4">
                  <p className="text-body-sm text-text-tertiary">{view.historyOrderNote}</p>
                </div>
                <ScrollX label="Account history">
                  <table className="admin-tbl">
                    <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                      <tr>
                        <th scope="col" className="text-left p-3 min-w-[128px]">When (EAT)</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Event</th>
                        <th scope="col" className="text-left p-3">Change</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Who</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.length === 0 ? (
                        <AdminTableEmpty colSpan={4} title={view.historyEmpty.title} body={view.historyEmpty.body} />
                      ) : (
                        historyRows.map((r, i) => (
                          <tr key={`${r.whenTitle}-${i}`} className={`border-b border-border-subtle${r.anchored ? " bg-bg-overlay" : ""}`}>
                            <td className="p-3 tabular text-text-secondary" title={r.whenTitle}>{r.when}</td>
                            <td className="p-3 text-text">
                              {r.eventWord}
                              {r.moneyHref && (
                                <Link href={r.moneyHref as Route} className="block text-body-sm underline text-text-secondary">
                                  Find it on the transactions screen
                                </Link>
                              )}
                            </td>
                            {/* ⛔ The desk history's own decision, moved with it (§K5): a bounded PAIR does not
                                break across lines — see the note at that copy. */}
                            <td className="p-3 text-text-secondary whitespace-nowrap">{r.change ?? "—"}</td>
                            {/* ⛔ THE SAME CELL AS THE DESK-WIDE HISTORY, AND IT MOVES WITH IT (§K5: one shape for
                                one thing). It broke in two here and into six lines there — the difference was
                                only how much room was left, which is exactly why the class is not left to the
                                width to decide. See the note at the desk history's own copy. */}
                            <td className="p-3 font-mono text-body-sm text-text-subtle whitespace-nowrap">{r.who}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              </>
            )}
            {historyRows !== null && view.historyTotal !== null && (
              <div className="p-4 pt-0">
                <AdminPagination
                  total={view.historyTotal}
                  page={view.historyPage}
                  perPage={view.historyPerPage}
                  param="hpage"
                  baseHref={buildBaseHref(`${CONSOLE_ROUTE}/${view.id}`, view.historyParams, "hpage")}
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
