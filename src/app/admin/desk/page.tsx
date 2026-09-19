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
import type { Route } from "next";
import Link from "next/link";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { Tabs } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { currentSession } from "@/lib/server/auth-service";
import { houseRosterForConsole, houseConsoleAudience, type ConsoleUsageCell } from "@/lib/server/house-console-read";
import { CONSOLE_TABS, LIMITS_TAB_READY, consoleTab, consoleTabHref } from "@/lib/house-bot/console-routes";

/** ⛔ A static neutral title (ruling 402). No route here exports a `generateMetadata` that reads a record. */
export const metadata = { title: "Admin · Desk" };
/** ⛔ Every figure is live money against a live limit, and a prerendered document would be a payload computed for one
 *  audience and served to another — the population the bundle scan reads (rulings 302, 356, 380). */
export const dynamic = "force-dynamic";

const TAB_LABEL: Record<(typeof CONSOLE_TABS)[number], string> = { roster: "Roster" };

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
function Usage({ cell }: { cell: ConsoleUsageCell }) {
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
    </>
  );
}

type DeskProps = { searchParams: Promise<{ tab?: string | string[] }> };

/**
 * W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 * request whose router state names it, so the gate the page cannot lose is the one it carries itself.
 *
 * ⛔ ADDITIVE, AND DELIBERATELY REDUNDANT HERE. `houseConsoleAudience` below already answers on the stored role and
 * is KEPT VERBATIM: it is this section's own audience rule (D19 — the feature is never named to anyone outside it),
 * which is narrower than "is a staff member". The gate answers the platform question; the audience answers the
 * feature's. Removing either would widen the other's blind spot.
 */
export default async function AdminDeskPage(props: DeskProps) {
  return <AdminPageGate title="Desk"><AdminDeskContent {...props} /></AdminPageGate>;
}

async function AdminDeskContent({ searchParams }: DeskProps) {
  /* ⛔ THE VERDICT IS AWAITED FIRST, BEFORE ANY READ (rulings 300, 380). */
  const session = await currentSession();
  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/desk"))) return null;

  const view = await houseRosterForConsole(session?.userId ?? null, "/admin/desk");
  if (!view) return null;

  /* An unknown `?tab=` resolves to the roster (ruling 302): a query string is not a resource, so it is never a 404
     and never a redirect, which would rewrite a bookmarked URL on every bare visit. */
  const sp = await searchParams;
  const tab = consoleTab(sp.tab);

  const rosterFull = view.rosterFullReason !== null;

  return (
    <>
      <AdminPageHead
        title="Desk"
        sw="Dawati"
        /* 403 · ONE control in the actions slot. 314 · when the roster is full it is rendered DISABLED with the
           reason VISIBLE beside it — never carried by a `title` alone, and never `hidden` on a `.btn`. The sentence is
           the server's own, with the CONFIGURED maximum interpolated, never the literal 5.
           ⛔ AND IT IS DISABLED AT THIS CHECKPOINT WHATEVER THE ROSTER HOLDS, because the wizard it opens is C7 step
           6's: `/admin/desk/new` has no page yet, so a live link here would be a primary action that answers 404 —
           a dead control, which is worse than a control that says it is not ready. It becomes a real link with the
           page it opens, in the same change. */
        actions={
          <span className="flex items-center gap-2 flex-wrap justify-end">
            {/* ⛔ `text-body-sm` (13px), NOT `text-caption` (11px). Ruling 310 wrote `text-caption` for the
                section's secondary lines, but §T4's reading floor is 12.5px and `test:type-scale` §3 counts every
                sub-floor prose site into a ratchet that may only shrink: 13px is the SMALLEST key above the floor,
                and this is a sentence an officer must read to know why a button is disabled.
                ⛔ THE WHOLE SENTENCE IS THE LINK ONCE THERE IS A PANEL TO LINK TO, and the first render is why: the
                server's sentence already ENDS "…raise the roster limit on Limits →", so appending a separate
                "Limits" link printed the word twice with the arrow orphaned between them ("on Limits → Limits").
                ⛔ AND IT IS NOT A LINK YET (ruling 432(i)): `?tab=limits` resolves BACK to the roster while the
                closed tab list holds only `roster`, so a live link here repaints the identical page with no limits
                form and no explanation — a dead control in the honest-looking half of 432(a).
                ⛔ WHEN THE ROSTER IS NOT FULL THERE IS STILL A REASON ON SCREEN (432(j)): a disabled primary action
                with nothing beside it reads as a broken page, and "0 of 5" is exactly when designation is
                legitimate. */}
            <span className="text-body-sm text-text-secondary max-w-[38ch]">
              {/* ⛔ THE INERT BRANCH PAINTS THE PLAIN FORM (ruling 432(i)). The server's sentence is written for a
                  LINK and ENDS "…on Limits →"; rendered as plain text that arrow promised a navigation to a tab
                  `consoleTab()` resolves straight back to this page, and named a rail option that is not on the rail
                  — the rail below carries "Roster" alone. The sibling forty lines down already drops its arrow when
                  inert; this site passed the linked string straight through. */}
              {rosterFull && LIMITS_TAB_READY
                ? <Link href={view.limitsHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] hover:text-brand-300 hover:underline">{view.rosterFullReason}</Link>
                : rosterFull ? view.rosterFullPlain : view.actionReason}
            </span>
            <Button size="md" variant="primary" disabled>Designate an account</Button>
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
              {view.unsetRequired > 0 && (
                LIMITS_TAB_READY ? (
                  <Link href={view.limitsHref as Route} className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-warning-fg hover:underline">
                    Set {view.unsetRequired} global limit{view.unsetRequired === 1 ? "" : "s"} first →
                  </Link>
                ) : (
                  <span className="text-body-sm text-warning-fg">
                    Set {view.unsetRequired} global limit{view.unsetRequired === 1 ? "" : "s"} first
                  </span>
                )
              )}
              {view.on !== null && (
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm font-semibold text-text">Master switch</span>
                  {/* ⛔ `tone="brand"` in BOTH states: gold is earned money only, and claret means ON MEANS STOPPED —
                      here ON means money can move. ⛔ DISABLED at this checkpoint, and that is a STATE, not a pending
                      control: the switch's own ceremony (the typed word, the Master-ON modal, the kill switch) is
                      C7 step 4's, and an operable-looking switch with nothing behind it would be a lie.
                      ⛔ AND ITS REASON IS ON SCREEN BESIDE IT (432(j)) — a disabled control with no reason reads as a
                      broken page, which is what the default OFF state showed on the first render. */}
                  <Toggle on={view.on} tone="brand" disabled aria-label="Desk master switch" />
                  <span className="text-body-sm text-text-tertiary">{view.switchReason}</span>
                </span>
              )}
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
          tabs={CONSOLE_TABS.map((k) => ({ value: k, labelEn: TAB_LABEL[k], href: consoleTabHref(k) }))}
        />

        {tab === "roster" && (
          <AdminCard padding="p-0">
            {view.rows === null ? (
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
                      <th scope="col" className="text-left p-3">Products</th>
                      {/* ⛔ NO WAY-OUT COLUMN AT THIS CHECKPOINT (ruling 432(h)) — `/admin/desk/[id]` has no page
                          until C7 step 4, so every row's "open →" answered the app-root 404. It is the same rule
                          432(a) applied to the head action and the master switch, and the same shape as 432(g)'s
                          deferred columns: the column arrives with the page it opens. */}
                    </tr>
                  </thead>
                  <tbody>
                    {view.empty ? (
                      /* 416 with 310's precedence — the state the table is in NAMES ITS CAUSE: the desk being off
                         beats "none designated yet", and a failed read beat both above. */
                      <AdminTableEmpty colSpan={6} title={view.empty.title} body={view.empty.body} />
                    ) : (
                      view.rows.map((r) => (
                        <tr key={r.id} className="border-b border-border-subtle">
                          <td className="p-3">
                            <div className="text-text">{r.label}</div>
                            {/* The holder, as a HANDLE and nothing else (04 R6) — never a name, a phone or an email,
                                because a row outlives the holder's erasure. 13px mono in a subdued tone is
                                /admin/agents' own shape for the same thing, and it clears §T4's 12.5px floor. */}
                            <div className="font-mono text-body-sm text-text-subtle">{r.handle}</div>
                          </td>
                          {/* Money SECOND and THIRD — the ANSWER columns. Each amount is one object (`.amount` is
                              `white-space: nowrap` in the kit), and the CELL may break between the used figure and its
                              limit — which is why it does NOT carry `.tabular`, whose nowrap would bind the pair into
                              one 243px line and push the second answer off a 360 screen (measured; see the reader). */}
                          <td className="p-3 text-right"><Usage cell={r.lossCell} /></td>
                          <td className="p-3 text-right"><Usage cell={r.exposureCell} /></td>
                          <td className="p-3"><Chip size="sm" variant={r.statusChip}>{r.statusWord}</Chip></td>
                          <td className="p-3 text-right text-text-secondary"><Usage cell={r.betsCell} /></td>
                          <td className="p-3 text-text-secondary">{r.products}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </AdminCard>
        )}
      </AdminBody>
    </>
  );
}
