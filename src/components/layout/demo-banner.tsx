import { getSession } from "@/lib/server/session";
import { isDemoModeAllowed } from "@/lib/server/demo-mode";
import { FlaskConical, X } from "lucide-react";

/**
 * Banner shown at the very top of every page when the user is in demo mode.
 * Server-rendered; no client JS unless user clicks Exit (route-handler GET).
 *
 * REMOVAL FOR PRODUCTION:
 *  Set env DEMO_MODE_ENABLED=false. The link still works for legacy demo
 *  cookies (calls /auth/logout to clear them).
 */
export async function DemoBanner() {
  if (!isDemoModeAllowed()) return null;
  const session = await getSession();
  if (!session?.demoMode) return null;

  return (
    <div className="bg-gold-500 text-gold-fg border-b border-gold-700">
      <div className="mx-auto max-w-[1280px] flex h-9 items-center justify-between gap-3 px-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <FlaskConical size={14} strokeWidth={2.25} />
          <p className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
            Demo mode
            <span className="ml-2 hidden font-normal normal-case tracking-normal opacity-80 sm:inline">
              · sandbox account, TZS 500,000 fake balance · all bets virtual
            </span>
          </p>
        </div>
        <a
          href="/auth/logout"
          aria-label="Exit demo mode"
          className="inline-flex h-6 items-center gap-1 rounded-pill bg-gold-fg/10 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-gold-fg/20 transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
          Exit
        </a>
      </div>
    </div>
  );
}
