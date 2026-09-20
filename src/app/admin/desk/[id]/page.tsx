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
import { CONSOLE_REFUSAL_TITLE, houseDetailForConsole, type ConsoleQuery, type ConsoleRuleRow } from "@/lib/server/house-console-read";
import { ActivityFilters } from "../activity-filters";
import { CONSOLE_DETAIL_TABS, CONSOLE_LIMITS_FIRST_UNSET_HREF, CONSOLE_ROUTE, consoleBotTabHref, consoleDetailTab } from "@/lib/house-bot/console-routes";
import { UsageBar } from "../page";
/* ⛔ THE PAGE OWNS THE IMPORT OF THE ACTION AND HANDS IT DOWN (ruling 422): a client component under
 * `src/app/admin` that imports an actions module is in `test:admin-act-gate`'s population and must consult the
 * act gate — and on an Owner-only route `mayAct` IS `mayView`, so that consultation would be a branch that can
 * never be false, which 1.422 refuses under this section by name. */
import { runDeskAccountAction } from "../actions";
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
                <dd className="text-body-sm text-text text-right min-w-0">
                  {r.value}
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
  if (!answer) return null;
  if (!answer.found) notFound();
  const view = answer;
  const rulesRows = view.rules;
  const targetRows = view.targets;
  const usageRows = view.usage;
  const countRows = view.counts;
  const feedRows = view.feed;
  const historyRows = view.history;

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
              <DeskAccountActions acts={view.acts} id={view.id} act={runDeskAccountAction} />
            </div>
          )}
        </AdminCard>

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
        {!view.removed && (
        /* 312 · the rail carries exactly the tabs whose panels exist. `activity` and `history` join it at C7 step 5
           with the readers behind them. */
        <Tabs
          variant="line"
          ariaLabel="Account sections"
          value={tab}
          tabs={CONSOLE_DETAIL_TABS.map((k) => ({
            value: k,
            labelEn: TAB_LABEL[k],
            href: consoleBotTabHref(view.id, k),
            count: k === "targets" ? (view.targetsActive ?? undefined) : undefined,
          }))}
        />
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
                  <table className="admin-tbl">
                    <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                      <tr>
                        <th scope="col" className="text-left p-3 min-w-[128px]">When</th>
                        <th scope="col" className="text-right p-3 !whitespace-normal">Stake</th>
                        <th scope="col" className="text-left p-3 min-w-[110px]">Outcome</th>
                        <th scope="col" className="text-left p-3">Type</th>
                        <th scope="col" className="text-left p-3">Product</th>
                        <th scope="col" className="text-left p-3 !whitespace-normal">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedRows.length === 0 ? (
                        <AdminTableEmpty colSpan={6} title={view.feedEmpty.title} body={view.feedEmpty.body} />
                      ) : (
                        feedRows.map((r, i) => (
                          /* ⛔ THE BELL'S OWN ROW IS MARKED BY A FLAG, NEVER BY ITS ID. An id in an attribute is
                             served markup, and a bounded record id is the one thing D19 says this section may
                             never put in a response. */
                          <tr key={`${r.whenTitle}-${i}`} className={`border-b border-border-subtle${r.anchored ? " bg-bg-overlay" : ""}`}>
                            <td className="p-3 text-text-secondary" title={r.whenTitle}>{r.when}</td>
                            <td className="p-3 tabular text-right"><span className="amount">{r.stake}</span></td>
                            <td className="p-3"><Chip size="sm" variant={r.statusChip}>{r.statusWord}</Chip></td>
                            <td className="p-3 text-text">{r.typeWord}</td>
                            <td className="p-3 text-text-secondary">{r.productWord}</td>
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
          {/* 508 · the saved rules, as VALUES. ⛔ There is no per-account rules SAVE in this repository, so no typed
              control is drawn and the reason sits beside the card (432(a), 432(j)) — a field that silently discards
              what an officer types is worse than one that says it cannot be edited. */}
          <SavedRulesCard rows={rulesRows} reason={view.rulesReason} captions />
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
                        body="A target points this account at one poll. Targets appear here, newest first."
                      />
                    ) : (
                      targetRows.map((t) => (
                        <tr key={t.id} className="border-b border-border-subtle">
                          <td className="p-3">
                            <div className="text-text">{t.title}</div>
                            {t.endCaption && <div className="text-body-sm text-text-subtle">{t.endCaption}</div>}
                          </td>
                          <td className="p-3"><Chip size="sm" variant={t.statusChip}>{t.statusWord}</Chip></td>
                          <td className="p-3 text-text-secondary" title={t.whenTitle}>{t.when}</td>
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
                        <th scope="col" className="text-left p-3 min-w-[128px]">When</th>
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
                            <td className="p-3 text-text-secondary" title={r.whenTitle}>{r.when}</td>
                            <td className="p-3 text-text">
                              {r.eventWord}
                              {r.moneyHref && (
                                <Link href={r.moneyHref as Route} className="block text-body-sm underline text-text-secondary">
                                  Find it on the transactions screen
                                </Link>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary">{r.change ?? "—"}</td>
                            <td className="p-3 font-mono text-body-sm text-text-subtle break-all">{r.who}</td>
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
