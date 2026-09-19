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
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { FormColumn } from "@/components/ui/form-column";
import { ScrollX } from "@/components/ui/scroll-x";
import { Tabs } from "@/components/ui/tabs";
import { currentSession } from "@/lib/server/auth-service";
import { houseDetailForConsole } from "@/lib/server/house-console-read";
import { CONSOLE_DETAIL_TABS, CONSOLE_LIMITS_FIRST_UNSET_HREF, CONSOLE_ROUTE, consoleBotTabHref, consoleDetailTab } from "@/lib/house-bot/console-routes";
import { UsageBar } from "../page";

/** ⛔ A static neutral title (ruling 402). The account's own label is a GATED value and never reaches the tab. */
export const metadata = { title: "Admin · Desk" };
/** ⛔ Every figure is live money against a live limit (rulings 302, 356, 380). */
export const dynamic = "force-dynamic";

const TAB_LABEL: Record<(typeof CONSOLE_DETAIL_TABS)[number], string> = { overview: "Overview", rules: "Rules", targets: "Targets" };

export default async function AdminDeskAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  /* ⛔ THE VERDICT IS AWAITED FIRST, BEFORE THE RECORD IS READ AND BEFORE `notFound()` CAN BE REACHED (399). */
  const session = await currentSession();
  const { id } = await params;
  const answer = await houseDetailForConsole(session?.userId ?? null, "/admin/desk", id);
  if (!answer) return null;
  if (!answer.found) notFound();
  const view = answer;

  const sp = await searchParams;
  const tab = consoleDetailTab(sp.tab);
  const rulesRows = view.rules;
  const targetRows = view.targets;
  const usageRows = view.usage;
  const countRows = view.counts;

  return (
    <>
      {/* ⛔ THE HEAD CARRIES THE ACCOUNT'S OWN LABEL, WHICH IS A GATED VALUE (rulings 313, 402, 453, 474). The
          section gate paints a NEUTRAL title on the restricted panel, so a viewer outside the audience never sees
          this string; the loader beside this file carries no title at all for the same reason. */}
      <AdminPageHead
        title={view.label}
        actions={
          <Link
            href={CONSOLE_ROUTE as Route}
            className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"
          >
            Back to the desk
          </Link>
        }
      />

      <AdminBody>
        {/* ⭐ THE ACCOUNT'S OWN STRIP, ABOVE THE RAIL ON EVERY TAB (DA §K 7d, ruling 406): its status, why it is
            stopped, and the one step that would move it. ⛔ The status word and the chip variant come from the ONE
            server map (rulings 311, 413) and are never typed beside the chip. */}
        <AdminCard padding="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <Chip size="sm" variant={view.statusChip}>{view.statusWord}</Chip>
              <div className="min-w-0">
                <div className="font-mono text-body-sm text-text-subtle">{view.handle}</div>
                {/* ⛔ THE WAY OUT IS A FINISHED SERVER STRING, IN THE CONSOLE'S OWN NEUTRAL WORDS (rulings 311,
                    432(f)). Seven of the shared table's twenty-two sentences name the feature; the console
                    overrides those in its copy home rather than rewriting the engine's own vocabulary. */}
                {view.wayOut && <p className="text-body-sm text-text-secondary mt-1 max-w-[60ch]">{view.wayOut}</p>}
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
              <Link
                href={view.holderHref as Route}
                className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"
              >
                Holder&apos;s transactions
              </Link>
            </div>
          </div>
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
          <AdminCard title="Saved rules">
            {rulesRows === null ? (
              <AdminLoadError what="the saved rules" />
            ) : (
              <FormColumn measure="form">
                <p className="text-body-sm text-text-tertiary mb-4">{view.rulesReason}</p>
                <dl className="space-y-3">
                  {rulesRows.map((r) => (
                    <div key={`${r.section}-${r.name}`} className="flex items-baseline justify-between gap-4 flex-wrap">
                      <dt className="text-body-sm text-text-secondary min-w-0">{r.name}</dt>
                      <dd className="text-body-sm text-text text-right min-w-0">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </FormColumn>
            )}
          </AdminCard>
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

        {tab === "rules" && (<>
          {/* ⛔ EVERY PANEL IS GUARDED BY `removed` FROM THE INSIDE, NEVER BY A SECOND TERM IN THE TAB TEST
              (ruling 433(e)): `test:tab-anchors` decides which tab owns a rendered id by the nearest
              `{tab === "x" && (<>` opener, and the served probe discovers this page's tabs with the same
              expression over the RAW file — so a second term would make a panel read as "above the rail", which is
              the strongest possible answer and a PASS that proves nothing. A removed account's panels are empty
              because the block above already shows the one thing it still holds. */}
          {!view.removed && (<>
          {/* 508 · the saved rules, as VALUES. ⛔ There is no per-account rules SAVE in this repository, so no typed
              control is drawn and the reason sits beside the card (432(a), 432(j)) — a field that silently discards
              what an officer types is worse than one that says it cannot be edited. */}
          <AdminCard title="Saved rules">
            {rulesRows === null ? (
              <AdminLoadError what="the saved rules" />
            ) : (
              <FormColumn measure="form">
                <p className="text-body-sm text-text-tertiary mb-4">{view.rulesReason}</p>
                <dl className="space-y-3">
                  {rulesRows.map((r) => (
                    <div key={`${r.section}-${r.name}`} className="flex items-baseline justify-between gap-4 flex-wrap">
                      <dt className="text-body-sm text-text-secondary min-w-0">{r.name}</dt>
                      <dd className="text-body-sm text-text text-right min-w-0">
                        {r.value}
                        {r.caption && <span className="block text-body-sm text-warning-fg">{r.caption}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </FormColumn>
            )}
          </AdminCard>
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
          </AdminCard>
          </>)}
        </>)}
      </AdminBody>
    </>
  );
}
