import Link from "next/link";
import { getSession } from "@/lib/server/session";
import { isDemoModeAllowed } from "@/lib/server/demo-mode";
import { FlaskConical, X } from "lucide-react";

/**
 * Banner shown at the very top of every page when the user is in demo mode.
 * Server-rendered; no client JS unless user clicks Exit (route-handler GET).
 *
 * REMOVAL FOR PRODUCTION:
 *  Set env DEMO_MODE_ENABLED=false. The banner's <Link> still works for any
 *  legacy demo cookies (calls /auth/logout to clear them).
 */
export async function DemoBanner() {
  if (!isDemoModeAllowed()) return null;
  const session = await getSession();
  if (!session?.demoMode) return null;

  return (
    <div className="bg-gold text-gold-fg border-b border-gold-active">
      <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-3 px-3 lg:px-6 h-9">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical size={14} strokeWidth={2.25} />
          <p className="text-caption font-bold uppercase tracking-[0.14em] truncate">
            Demo mode
            <span className="hidden sm:inline opacity-80 font-normal normal-case tracking-normal ml-2">
              · sandbox account, TZS 100,000 fake balance · all bets virtual
            </span>
          </p>
        </div>
        <Link
          href="/auth/logout"
          className="inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-gold-fg/10 hover:bg-gold-fg/20 transition-colors text-caption font-bold uppercase tracking-[0.14em]"
        >
          <X size={12} strokeWidth={2.5} />
          Exit
        </Link>
      </div>
    </div>
  );
}
