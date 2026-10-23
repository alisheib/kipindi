import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { deskScriptFigures } from "@/lib/server/maswali-support";
import { MILLIONEA_SUPPORT_SCRIPTS } from "@/lib/maswali-support-scripts";
import { LookupForm } from "./lookup-form";
import { ScriptBlock } from "./script-block";

export const metadata = { title: "Admin · Millionea · Ticket lookup" };
export const dynamic = "force-dynamic";

/**
 * /admin/maswali/lookup — THE SUPPORT DESK'S MILLIONEA PAGE (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 9, MB-64, MB-86,
 * MB-91).
 *
 * ⭐ THE SUPPORT DOMAIN (`roles.ts`, ABOVE the trading prefix): the desk, Compliance and the Owner open it; the trading
 *    officer who seals does not, and neither does anyone else by default.
 * ⛔ ONE TICKET PER REQUEST, NEVER A LIST. The desk types a serial and its holder's number; the answer is that ticket alone,
 *    recorded before it is shown, with its fifteen answers only once its week is final (`maswali-support.ts`). Nothing on
 *    this page counts tickets, sums a week or reads a pick aggregate (MB-34).
 * ⭐ The desk's scripts, en and sw, below the lookup — every figure filled in from where it lives, never typed.
 */
export default async function AdminMaswaliLookupPage() {
  return <AdminPageGate title="Millionea · Ticket lookup"><Content /></AdminPageGate>;
}

async function Content() {
  const figures = await deskScriptFigures().catch(() => null);
  return (
    <>
      <AdminPageHead title="Millionea · Ticket lookup" sw="Tafuta tiketi" />
      <AdminBody>
        <AdminCard title="One ticket" sw="Tiketi moja">
          <p className="mb-3 text-body-sm text-text-secondary">
            Type the serial on the player&apos;s ticket and the phone number on their account. Every lookup is recorded. A
            ticket&apos;s answers show once its week is final; before that, answer from its state.
          </p>
          <LookupForm />
        </AdminCard>

        <AdminCard title="What the desk says" sw="Maneno ya dawati">
          {figures === null ? (
            <p className="text-body-sm text-danger-fg">The figures the scripts quote could not be read, so the scripts are not shown.</p>
          ) : (
            <div className="space-y-6">
              <p className="text-body-sm text-text-secondary">
                Filled with the coming weeks&apos; rules and today&apos;s withdrawal limit and fee. A looked-up ticket&apos;s
                script is filled with its own week&apos;s rules.
              </p>
              {MILLIONEA_SUPPORT_SCRIPTS.map((s) => <ScriptBlock key={s.key} script={s} figures={figures} />)}
            </div>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
