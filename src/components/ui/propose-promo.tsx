import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { getServerT } from "@/lib/i18n-server";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";
import { formatTzs } from "@/lib/utils";

/**
 * ProposePromo — the single "propose markets & get paid" promo.
 * Whole card is the CTA; `href` sets the destination (markets → /proposals,
 * proposals board → /proposals/new).
 *
 * ⛔ NOT GOLD (R5-C, the second gold audit, 2026-10-09). DESIGN_AUTHORITY §M3a D5: a promotional card "must not wear
 * the ink this platform uses to say *you won this* — on an inducement, a house colour becomes a marketing claim", and
 * Q5: gold is money, and nothing else. This card asks a player to propose for a prize nobody has won yet, so it is a
 * door like the profile's own rows: the neutral edge with the brand hover, and the brand plate those rows carry
 * (`profile/page.tsx` SettingRow). The prize figure keeps its words; it was never coloured.
 *
 * Feature-state aware:
 *   • DISABLED     → renders nothing (the entry point is removed everywhere).
 *   • ACTIVE       → normal CTA to `href`, prize amount shown.
 *   • COMING_SOON  → the quiet "coming soon" badge, routes to the board (never the
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
      className="group flex items-center gap-3.5 rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:border-brand-400"
    >
      <IconPlate
        size={42}
        className="bg-brand-500/10 text-brand-300 transition-colors group-hover:bg-brand-500/15"
      >
        <I.trophy s={22} />
      </IconPlate>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-display text-[14.5px] font-bold text-text">
          {t.market.proposeAndGetPaid}
          <ProposalsStateBadge state={cfg.state} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" />
        </p>
        <p className="font-display italic text-text-subtle text-body-sm">
          {t.common.proposeEarn}
          {active && cfg.prizeTzs > 0 ? ` · ${formatTzs(cfg.prizeTzs)}` : ""}
        </p>
      </div>
      <I.arrowRight s={18} />
    </Link>
  );
}
