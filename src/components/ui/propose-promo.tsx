import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { ComingSoonBadge } from "@/components/ui/coming-soon-badge";
import { getServerT } from "@/lib/i18n-server";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { formatTzs } from "@/lib/utils";

/**
 * ProposePromo — the single gold-accented "propose markets & get paid" promo.
 * Replaces the two hand-rolled variants (markets board entry card + proposals
 * board reward strip). Whole card is the CTA; `href` sets the destination
 * (markets → /proposals, proposals board → /proposals/new). Renders nothing
 * when proposals are disabled.
 */
export async function ProposePromo({ href }: { href: string }) {
  const { t } = await getServerT();
  const cfg = getProposalsConfig();
  if (!cfg.enabled) return null;
  return (
    <Link
      href={href as never}
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
          <ComingSoonBadge label={t.common.comingSoon} size="xs" />
        </p>
        <p className="font-display italic text-text-subtle text-[11.5px]">
          {t.common.proposeEarn}
          {cfg.prizeTzs > 0 ? ` · ${formatTzs(cfg.prizeTzs)}` : ""}
        </p>
      </div>
      <I.arrowRight s={18} />
    </Link>
  );
}
