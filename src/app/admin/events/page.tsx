/**
 * /admin/events (F8) — the event calendar.
 *
 * The calendar is OPERATOR-AUTHORED. We have no fixtures feed, so if the AI
 * invented the events it would be inventing real-world fixtures and dates on a
 * licensed real-money product. An officer enters each event with an official
 * source (validated against the trusted-domain allowlist), and the AI is only ever
 * STEERED by an event a human already vouched for. Officer approval of the
 * resulting poll is still mandatory before it can become a market.
 */
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { EmptyState } from "@/components/ui/empty-state";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, MARKET_OPS_ROLES } from "@/lib/server/roles";
import { listUpcomingEvents } from "@/lib/server/events-service";
import { listSources, listDisabledCategories, seedDefaultSources } from "@/lib/server/source-registry";
import { EventsClient } from "./events-client";

export const metadata = { title: "Admin · Events" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const session = await currentSession();
  if (!hasRole(session?.role, MARKET_OPS_ROLES)) {
    return <AdminRestricted title="Events" sw="Matukio" need="Admin, Compliance or Moderator" />;
  }

  // Make sure the trusted registry exists — an event can't be accepted without a
  // vetted source, so a never-seeded registry would leave the page with nothing
  // usable. Idempotent (same call the other publish paths make).
  await seedDefaultSources().catch(() => {});

  const [events, sources, disabled] = await Promise.all([
    listUpcomingEvents(200).catch(() => []),
    listSources({ enabledOnly: true }).catch(() => []),
    listDisabledCategories().catch(() => [] as string[]),
  ]);

  // Only offer categories that are (a) real market categories and (b) not disabled
  // by the operator, AND that have at least one enabled trusted source — otherwise
  // every event in that category would be rejected by the allowlist anyway.
  const withSources = new Set(sources.map((s) => s.category));
  const categories = (["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const)
    .filter((c) => !disabled.includes(c) && withSources.has(c));

  return (
    <>
      <AdminPageHead title="Events" sw="Matukio" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <AdminCard title="Why this exists" sw="Kwa nini">
          <p className="text-[12.5px] leading-relaxed text-text-muted">
            Markets scheduled around <strong className="text-text">real moments</strong> (a derby, the rains, a rate
            decision) draw natural two-sided interest — which is the honest fix for thin, one-sided pools.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-text-subtle">
            <strong className="text-text-muted">You</strong> enter the events, not the AI. We have no fixtures feed, so
            an AI-authored calendar could invent a match that does not exist. Each event needs an official source on the
            trusted registry. The AI is only <em>steered</em> by what you enter — and an officer must still approve the
            resulting poll before it becomes a market.
          </p>
        </AdminCard>

        {categories.length === 0 ? (
          <AdminCard title="No usable category" sw="Hakuna aina inayotumika">
            <p className="text-[13px] text-text-muted">
              Every category is either disabled or has no enabled trusted source. Add a source under{" "}
              <strong className="text-text">Sources &amp; categories</strong> first — an event without a vetted source
              cannot be accepted.
            </p>
          </AdminCard>
        ) : (
          <EventsClient categories={categories} />
        )}

        <AdminCard title={`Upcoming (${events.length})`} sw="Yajayo">
          {events.length === 0 ? (
            <EmptyState kind="markets" title="No upcoming events" body="Add a real, sourced event above to schedule a market around it." />
          ) : (
            <EventsClient categories={categories} events={events} listOnly />
          )}
        </AdminCard>
      </div>
    </>
  );
}
