/**
 * DESIGNATE AN ACCOUNT — the desk's one way in, in four steps: find the account, read what the platform already
 * knows about it, state what its holder is agreeing to, and confirm with the holder's own password.
 *
 * ── THE LAW THIS PAGE IS BUILT ON ──────────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ **THE AUDIENCE IS DECIDED HERE, FIRST, ON THE STORED ROLE** (C7-SPEC rulings 259, 300, 324, 380). A layout's
 * verdict changes what is PAINTED, not what is SENT: a signed-in PLAYER who opens this route as a plain document is
 * served 200 and the page's whole server payload behind the redirect, and a flight request whose router state names
 * the admin layouts skips them altogether. So every read below is issued by a gated reader that resolves the viewer's
 * STORED row before it reads anything, and a refused viewer's payload carries no handle, no sentence and no id.
 *
 * ⛔ **THE READS ARE NOT HERE** (ruling 340). This file names no read module and no store. `houseCheckForConsole`
 * performs them inside `house-console-read.ts` after its own verdict and hands back a PAINTED view model. ⛔ It may
 * not name `eligibility.ts` or `designation.ts` either: both live under `src/lib/server/house-bot/`, which no console
 * file may import, which is precisely why the check card is served by a gated reader rather than assembled here.
 *
 * ⛔ **NO BALANCE, EVER** (owner-delegated ruling 459, amending 368; ruling 266). The check card shows a funded
 * STATE. The figure is a real person's wallet position — the one number on these screens that belongs to somebody
 * other than 50pick, and the one most likely to sit in a screenshot — and the decision this card supports, "can this
 * account fund anything at all", is answered by a state and not by a magnitude. An officer who wants the figure is
 * one link away on the platform's own money screen (456).
 *
 * ⛔ **THE PHONE IS RENDERED THROUGH THE PLATFORM'S OWN SERVER GATE** (ruling 359). `Sensitive` resolves the viewer's
 * stored role, calls `readCell`, renders nothing for `none`, the masked span for `masked`, and only then the reveal
 * control. A page handed a pre-masked triple and rendering `SensitiveReveal` itself would answer READ-TIERS in a
 * `.tsx`, which `sensitive.tsx` forbids in as many words — so the raw value arrives as a SERVER-ONLY field and the
 * mask is computed there, never here.
 *
 * ⛔ **THE COPY IS NEUTRAL** (owner-delegated ruling 453). Nothing here names the feature: an entry is an "account",
 * the section is "the desk", money moved is a "stake", a ceiling is a "limit".
 *
 * ⛔ **NO PENDING STATES** (Ali, standing). All four steps ship together. There is no control on this page that says
 * it is not ready, and no step that cannot be reached.
 *
 * @see src/lib/server/house-console-read.ts · src/lib/house-bot/console-routes.ts · plans/house-bots/C7-SPEC.md
 */
import type { Route } from "next";
import Link from "next/link";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminBody } from "@/components/admin/admin-body";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { FormColumn } from "@/components/ui/form-column";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sensitive } from "@/components/ui/sensitive";
import { currentSession } from "@/lib/server/auth-service";
import { houseCheckForConsole, type ConsoleCheckRow } from "@/lib/server/house-console-read";
import { CONSOLE_ROUTE, CONSOLE_WIZARD_STEPS, consoleWizardStep, type ConsoleWizardStep } from "@/lib/house-bot/console-routes";
/* ⛔ THE PAGE OWNS THE IMPORT OF THE ACTIONS AND HANDS THEM DOWN (ruling 422): a client component under
 * `src/app/admin` that imports an actions module joins `test:admin-act-gate`'s population and must consult the act
 * gate — and on an Owner-only route `mayAct` IS `mayView`, so that consultation would be a branch that can never be
 * false, which 1.422 refuses under this section by name. */
import { findDeskAccountsAction, designateDeskAccountAction } from "./actions";
import { DeskAccountPicker, DeskDesignateForm } from "./designate-wizard";

/** ⛔ A static neutral title (ruling 402). No route here exports a `generateMetadata` that reads a record. */
export const metadata = { title: "Admin · Desk" };
/** ⛔ Every answer on this page is a live check against live limits (rulings 302, 356, 380). */
export const dynamic = "force-dynamic";

/** What each step is called on screen, in the rail-free step line. ONE home, beside the closed list it indexes. */
const STEP_LABEL: Record<ConsoleWizardStep, string> = {
  find: "Find the account",
  check: "What we already know",
  consent: "What the holder agrees to",
  review: "Confirm with the holder",
};

type DeskNewProps = {
  searchParams: Promise<{ u?: string | string[]; step?: string | string[] }>;
};

/**
 * W25 BELT 2 — this page carries its OWN gate, on the viewer's STORED row.
 *
 * ⛔ `title="Desk"` is the section word, not this page's heading: the gate titles its restricted panel from the last
 * URL segment, and an explicit section title is what keeps that panel neutral for every path under the section.
 * ⛔ ADDITIVE. The page's own verdict below — the feature's audience rule, which is narrower than "is this a staff
 * member" — is awaited before any read and is kept verbatim. This gate answers the platform question.
 */
export default async function AdminDeskNewPage(props: DeskNewProps) {
  return <AdminPageGate title="Desk"><AdminDeskNewContent {...props} /></AdminPageGate>;
}

async function AdminDeskNewContent({ searchParams }: DeskNewProps) {
  const session = await currentSession();
  const sp = await searchParams;
  const uRaw = Array.isArray(sp.u) ? sp.u[0] : sp.u;
  const chosen = (uRaw ?? "").trim();
  /* ⛔ WITHOUT AN ACCOUNT THERE IS ONLY ONE STEP (432(a)). `?step=review` with no `?u=` would otherwise paint a
     form with nothing to designate — a control that could only ever refuse. */
  const step = consoleWizardStep(sp.step, chosen.length > 0);

  /* ⛔ THE VERDICT IS AWAITED FIRST, BEFORE ANY READ (300, 380), and it is the READER that awaits it: the find
     step performs no account read at all, so its own gate is the picker action's, which carries the identical
     verdict on the identical stored row. */
  const view = chosen.length > 0 ? await houseCheckForConsole(session?.userId ?? null, "/admin/desk", chosen) : null;
  if (chosen.length > 0 && !view) return null;

  const stepIndex = CONSOLE_WIZARD_STEPS.indexOf(step) + 1;

  return (
    <>
      <AdminPageHead
        title="Designate an account"
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
        <FormColumn measure="form">
          {/* ⛔ THE STEP LINE IS THE PAGE'S ONLY PROGRESS SIGNAL, and the bar keeps the kit's DEFAULT line (409):
              this is a position in a sequence, not usage against a limit, so it carries no caption of its own.
              ⚠️ `label` is `aria-label` only and paints nothing, which is why the words are written beside it. */}
          <div className="space-y-1.5">
            {/* ⛔ 432(n) · THE COUNT IS SAID ONCE. The eyebrow read "Step 2 of 4 · WHAT WE ALREADY KNOW" with the
                bar's own default line printing "2 OF 4 · 50%" 20px beneath it — one state saying one fact twice,
                read off the first render at both widths. The bar keeps the kit's line (409); the eyebrow names the
                step, which is the thing the bar cannot say. */}
            <p className="font-mono text-micro eyebrow uppercase text-text-subtle">{STEP_LABEL[step]}</p>
            <ProgressBar value={stepIndex} max={CONSOLE_WIZARD_STEPS.length} label="Designation step" />
          </div>

          {step === "find" && (
            <AdminCard title="Find the account">
              <p className="text-body-sm text-text-secondary mb-4 max-w-[60ch]">
                Search by handle, phone number or account ID. Only a player&apos;s own account can be used here, and
                only with their permission.
              </p>
              {/* ⛔ THE ACTION ARRIVES AS A PROP, never as an import in the client file (ruling 422). */}
              <DeskAccountPicker find={findDeskAccountsAction} />
            </AdminCard>
          )}

          {/* ⭐ NO ACCOUNT BEHIND THE `?u=` AT ALL — A STATE, NOT A CARD OF FACTS ABOUT NOTHING (355, 416). Read off
              the first render: the card painted a handle built out of the typed id, an EMPTY "Phone" term, and
              "Open positions 0" for an account that does not exist — a fabricated zero beside a labelled row with
              nothing under it. The only honest things here are the cause and the way back. */}
          {view !== null && step === "check" && view.accountMissing && (
            <AdminCard
              title="What we already know"
              action={
                <Link
                  href={view.findHref as Route}
                  className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"
                >
                  Search again
                </Link>
              }
            >
              <p className="text-body-sm text-text-secondary max-w-[60ch]">{view.blocking[0]?.text}</p>
            </AdminCard>
          )}

          {view !== null && step === "check" && !view.accountMissing && (
            <>
              <AdminCard
                title="What we already know"
                action={
                  <Link
                    href={view.findHref as Route}
                    className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"
                  >
                    Search again
                  </Link>
                }
              >
                {/* ⛔ ONE COLUMN AT 360, TWO FROM 640 — the measure is the form's, so no row can run wider than
                    `--w-form` and no value column can be squeezed to nothing. */}
                {/* ⛔ THE HANDLE, NEVER A DISPLAY NAME (346, 420). The officer searched by a name, a phone or an
                    id and already holds one of them; what this card has to say is WHICH account matched and what
                    the platform knows about it. A display name rendered here would put a real person's name on the
                    one screen most likely to end up in a screenshot, for no decision it supports. */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Handle</dt>
                    <dd className="font-mono text-body-sm text-text-subtle">{view.handle}</dd>
                  </div>
                  {/* ⛔ 359 · THE PLATFORM'S OWN SERVER GATE decides whether this viewer sees the number at all,
                      the mask, or the reveal control. Nothing here computes a mask and nothing here renders
                      `SensitiveReveal`.
                      ⛔ AND THE TERM IS NOT DRAWN WITH NOTHING UNDER IT. `Sensitive` renders NOTHING when the value
                      is absent or the viewer's read cell says `none`, so an unconditional `<dt>` is a labelled row
                      that says nothing — read off the first render of the missing-account state. */}
                  {view.phoneE164 !== null && (
                    <div>
                      <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Phone</dt>
                      <dd className="text-body-sm text-text">
                        <Sensitive field="phone" subjectId={view.userId} value={view.phoneE164} domainAllows />
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-mono text-micro eyebrow uppercase text-text-tertiary">Open positions</dt>
                    <dd className="font-mono text-body-sm text-text tabular-nums">{view.openPositions}</dd>
                  </div>
                </dl>

                {/* ⛔ 459 · A FUNDED STATE, NEVER A BALANCE. `null` means the wallet could not be read, and a
                    blocking row below says so — a failed read is never painted as a state (355). */}
                {view.funded !== null && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    <div className="flex items-start gap-3 flex-wrap">
                      <Chip size="sm" variant={view.funded.chip}>{view.funded.word}</Chip>
                      <p className="text-body-sm text-text-secondary min-w-0 max-w-[60ch]">{view.funded.sentence}</p>
                    </div>
                    <p className="text-body-sm text-text-subtle mt-1.5 max-w-[60ch]">{view.bonusCaption}</p>
                    <Link
                      href={view.holderHref as Route}
                      className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"
                    >
                      Open the holder&apos;s own money screen
                    </Link>
                  </div>
                )}

                {view.priorNote !== null && (
                  <p className="text-body-sm text-text-secondary mt-4 max-w-[60ch]">{view.priorNote}</p>
                )}
              </AdminCard>

              {/* ⛔ ONE CALLOUT PER ROW, EACH NAMING WHAT HAS TO CHANGE (416). A blocking row stops the
                  designation; a warning is something the officer should know and may proceed past. */}
              {view.blocking.map((r) => <CheckNotice key={`b-${r.code}`} row={r} tone="danger" />)}
              {view.warnings.map((r) => <CheckNotice key={`w-${r.code}`} row={r} tone="warning" />)}

              {/* ⛔ 432(j) · A CONTROL THAT IS NOT LIVE SAYS WHY, VISIBLY, and it says a fact the rows above do not
                  already carry — how many of them are stopping it (432(n)). */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                {view.continueReason !== null && (
                  <span className="text-body-sm text-text-secondary max-w-[38ch]">{view.continueReason}</span>
                )}
                {view.eligible
                  ? <Link href={view.consentHref as Route} className="btn btn-primary btn-md inline-flex items-center justify-center">Continue</Link>
                  : <Button size="md" variant="primary" disabled>Continue</Button>}
              </div>
            </>
          )}

          {/* ⛔ ONE JSX SITE FOR BOTH TYPED STEPS, AND IT IS LOAD-BEARING. The label and the purpose are held in the
              form's own React state and the step moves with `router.push`; two separate sites would remount the
              component on that push and throw away what the officer typed between one screen and the next. */}
          {view !== null && (step === "consent" || step === "review") && (
            <DeskDesignateForm
              phase={step}
              userId={view.userId}
              handle={view.handle}
              consentHref={view.consentHref}
              reviewHref={view.reviewHref}
              checkHref={view.checkHref}
              labelMax={view.labelMax}
              noteMax={view.noteMax}
              designate={designateDeskAccountAction}
            />
          )}
        </FormColumn>
      </AdminBody>
    </>
  );
}

/**
 * One check row as the kit's own Callout. ⛔ The sentence is the SERVER's, from the console's own table keyed by
 * code — never the service's, whose words name the feature (453).
 */
function CheckNotice({ row, tone }: { row: ConsoleCheckRow; tone: "danger" | "warning" }) {
  return (
    <Callout tone={tone} role={tone === "danger" ? "alert" : undefined}>
      {row.text}
      {row.href !== null && (
        <>
          {" "}
          <Link href={row.href as Route} className="underline hover:text-brand-300">Open it</Link>
        </>
      )}
    </Callout>
  );
}
