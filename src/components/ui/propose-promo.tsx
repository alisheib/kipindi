import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { getServerT } from "@/lib/i18n-server";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";
import { formatTzs } from "@/lib/utils";

/**
 * ProposePromo — the single gold-accented "propose markets & get paid" promo.
 * Whole card is the CTA; `href` sets the destination (markets → /proposals,
 * proposals board → /proposals/new).
 *
 * Feature-state aware:
 *   • DISABLED     → renders nothing (the entry point is removed everywhere).
 *   • ACTIVE       → normal CTA to `href`, prize amount shown.
 *   • COMING_SOON  → gilt "coming soon" badge, routes to the board (never the
 *                    composer, which is blocked); prize hidden until it opens.
 *   • MAINTENANCE  → amber "temporarily unavailable" badge, routes to the board.
 */
export async function ProposePromo({ href }: { href: string }) {
  const { t } = await getServerT();
  const cfg = getProposalsConfig();
  if (cfg.state === "DISABLED") return null;
  const active = isProposalsActive(cfg);
  // A non-active feature can't accept a submission, so send players to the board
  // (which carries the guided banner) rather than a composer that would refuse.
  const target = active ? href : "/proposals";
  return (
    <Link
      href={target as never}
      className="group flex items-center gap-3.5 rounded-xl border p-4 transition-colors hover:border-gold-500"
      style={{
        borderColor: "color-mix(in oklab, var(--gold-500) 30%, var(--border))",
        background: "color-mix(in oklab, var(--gold-500) 6%, var(--bg-elevated))",
      }}
    >
      <span
        className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] text-gold-fg"
        style={{ background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))" }}
      >
        <I.trophy s={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-display text-[14.5px] font-bold text-text">
          {t.market.proposeAndGetPaid}
          <ProposalsStateBadge state={cfg.state} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
        </p>
        <p className="font-display italic text-text-subtle text-[11.5px]">
          {t.common.proposeEarn}
          {active && cfg.prizeTzs > 0 ? ` · ${formatTzs(cfg.prizeTzs)}` : ""}
        </p>
      </div>
      <I.arrowRight s={18} />
    </Link>
  );
}
