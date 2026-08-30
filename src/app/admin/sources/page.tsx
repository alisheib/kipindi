import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatDate, adminCount } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/lib/ai/poll-vocabulary";
import { listSources, listDisabledCategories, seedDefaultSources, getGeneratableCategories } from "@/lib/server/source-registry";
import type { MarketCategory } from "@/lib/server/market-service";
import { ToggleSource, RemoveSource, ToggleCategory, AddSourceForm } from "./source-controls";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

/* §L1, one name per destination: the sidebar and the h1 both say "Sources & categories";
   only the tab title said "Sources". The nav label is the canonical name. */
export const metadata = { title: "Admin · Sources & categories" };
export const dynamic = "force-dynamic";

const CATEGORIES: MarketCategory[] = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"];

export default async function AdminSourcesPage() {
  await seedDefaultSources();
  const all = await listSources();
  const enabled = all.filter((s) => s.enabled);
  const disabledCats = new Set(await listDisabledCategories());
  // A category is "generatable" (AI polls + markets can be created in it) only
  // when it is active AND has ≥1 enabled source. Surfacing this here closes the
  // gap where an operator enables a source but the AI still can't use its
  // category (or uses the wrong one).
  const generatable = new Set((await getGeneratableCategories()).map((g) => g.category));

  // Group by category for the table
  const grouped = CATEGORIES.map((c) => ({
    category: c,
    enabled: !disabledCats.has(c),
    sources: all.filter((s) => s.category === c),
  }));

  return (
    <>
      <AdminPageHead
        title="Sources & categories"
        sw="Vyanzo na aina"
        actions={<AddSourceForm />}
      />
      <AdminBody>
        <KpiGrid>
          <AdminKpi label="Trusted sources"     sw="Vyanzo vinavyoaminika" value={String(enabled.length)} delta={`${all.length} total`} />
          <AdminKpi label="Disabled sources"    sw="Vyanzo vimezimwa"      value={String(all.length - enabled.length)} delta="not in use" />
          <AdminKpi label="Generatable categories" sw="Aina zinazozalishwa" value={String(generatable.size)} delta={`of ${CATEGORIES.length} · AI can generate these`} />
          <AdminKpi label="Disabled categories" sw="Aina zilizozimwa"      value={String(disabledCats.size)} />
        </KpiGrid>

        {/* Categories */}
        <AdminCard
          title="Categories · global toggle"
          sw="Aina za soko"
          /* DG-A-14 · "click any to disable site-wide" is an instruction to the officer, not a
             microlabel naming the card. It sat 4px under the reading floor in eyebrow clothing
             (uppercase + 0.12em tracking at 10px), so the dressing is dropped and the size is
             text-body-sm — the smallest rung above the 12.5px floor (DESIGN_AUTHORITY §T4/§T7).
             The tertiary tone stays as it is; §A1's contrast gate owns that. */
          action={<span className="font-mono text-body-sm text-text-tertiary">click any to disable site-wide</span>}
        >
          <p className="text-body-sm text-text-tertiary mb-3 max-w-[72ch]">
            Disabling a category prevents officers from publishing new markets in it. Existing live markets continue
            until they resolve. Use this to e.g. ship "sports + crypto only" mode for a launch window.
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <ToggleCategory key={c} category={c} enabled={!disabledCats.has(c)} />
            ))}
          </div>
        </AdminCard>

        {/* Sources by category */}
        {grouped.map(({ category, enabled: catEnabled, sources }) => {
          const isGeneratable = generatable.has(category);
          /* ⛔ WAS `${category[0].toUpperCase()}${category.slice(1)}` — A SPELLING OPERATION
             STANDING IN FOR A LEXICON, the same move `test:labels` §11a already ruled on for
             `.replace(/_/g," ")`: "The fix is a lexicon entry, never a `.replace`."
             It happens to agree with `CATEGORY_LABEL` on all seven `MarketCategory` arms
             today, so this renders byte-identically; it would NOT agree the moment a
             multi-word arm exists (the rails already write `infrastructure` as "Infra").
             The count goes through the one count-line recipe (`adminCount`), which adds the
             platform's fixed grouping to a plural this line already had. */
          const cardTitle = `${CATEGORY_LABEL[category] ?? category} · ${adminCount(sources.length, "source")}`;
          return (
          <AdminCard
            key={category}
            title={cardTitle}
            sw={catEnabled ? "Hai" : "Imezimwa"}
            padding="p-0"
            className={catEnabled ? "" : "opacity-60"}
            action={
              <span className={`font-mono text-micro tracking-[0.12em] uppercase px-2 py-0.5 rounded-pill border ${
                isGeneratable
                  ? "border-yes-700/40 bg-yes-500/10 text-yes-300"
                  : "border-warning-border bg-warning-bg text-warning-fg"
              }`}>
                {isGeneratable ? "AI can generate" : catEnabled ? "No enabled source · not generatable" : "category disabled"}
              </span>
            }
          >
            <ScrollX label="Sources">
              <table className="admin-tbl">
                <thead className="border-b border-border-subtle bg-bg-sunken/50">
                  <tr className="font-mono text-micro uppercase eyebrow text-text-tertiary">
                    <th className="text-left p-3">Source</th>
                    <th className="text-left p-3">Domain</th>
                    <th className="text-left p-3">Rationale</th>
                    <th className="text-left p-3">Enabled</th>
                    <th className="text-right p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.length === 0 && (
                    <AdminTableEmpty
                      colSpan={5}
                      kind="admin"
                      title="No sources yet"
                      body={'No sources yet for this category. Use "+ Add source" above.'}
                    />
                  )}
                  {sources.map((s) => (
                    <tr key={s.id} className="border-b border-border-subtle/50 last:border-b-0 align-top">
                      <td className="p-3">
                        <p className="font-display font-semibold text-text">{s.label}</p>
                        {/* `addedAt` is a UTC ISO string; slicing its first ten characters
                            printed the UTC calendar day, which is the previous one for
                            anything added after 21:00 EAT. `formatDate` stamps the
                            platform timezone. */}
                        <p className="font-mono text-[10px] text-text-subtle">added {formatDate(s.addedAt)} · by {s.addedBy.slice(0, 14)}…</p>
                      </td>
                      <td className="p-3">
                        <a
                          href={`https://${s.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[12px] text-royal-300 hover:text-royal-200"
                        >
                          {s.domain}
                          <I.ext s={11} aria-hidden />
                        </a>
                      </td>
                      <td className="p-3 text-text-tertiary max-w-[420px]">{s.rationale}</td>
                      <td className="p-3">
                        <ToggleSource id={s.id} enabled={s.enabled} />
                      </td>
                      <td className="p-3 text-right">
                        <RemoveSource id={s.id} label={s.label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          </AdminCard>
          );
        })}

        <AdminCard className="border-info-border bg-info-bg">
          <div className="flex items-start gap-3">
            <I.shieldcheck s={18} />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Why source-gating matters</p>
              <p>
                Every market on 50pick resolves against a public source URL. The market-creation wizard at
                <code className="font-mono"> /admin/markets/new</code> only accepts URLs whose host matches an
                enabled source in this list. Disabling a source here prevents new markets from using it; existing
                live markets continue under the source they were already wired to.
              </p>
              <p>
                <strong className="text-text">AI poll generation is bound to this list too.</strong> The generator
                is told, up front, exactly which categories have an enabled source and which domains it may cite —
                so it only ever produces polls it can resolve. A category with <em>no</em> enabled source is not
                generatable, and adding a source under the wrong category won&apos;t let the AI use it there. Enable a
                source under the category you want the AI to generate in.
              </p>
            </div>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
