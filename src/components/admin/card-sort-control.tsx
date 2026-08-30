/**
 * CardSortControl — the SORT rail above a card queue, on `/admin/ai-polls` and `/admin/candidates`.
 *
 * 🔴 WHY THIS FILE EXISTS AT ALL, AND WHY IT IS ONE FILE (DG-A-06, 2026-08-30). Until this
 * commit there were TWO of it: fifty-two lines in `admin/ai-polls/page.tsx` and fifty-two lines
 * in `admin/candidates/page.tsx`, and a diff of the two definitions showed **exactly one line
 * differing** — the route inside `buildHref`. Converting them where they stood would have left
 * two copies of the corrected control, which is the same disease one generation on, so the hoist
 * comes FIRST and the conversion happens once.
 *
 * ⛔ AND IT SURVIVED AN AUDIT THAT WAS LOOKING STRAIGHT AT IT. S-07 converted the state and
 * category rails on these two pages on 2026-08-28 and guarded them. This rail was missed because
 * both call sites sit behind `{pendingSorted.length > 0 && …}` / `{approvedSorted.length > 0 && …}`
 * and an EMPTY PRODUCTION QUEUE RENDERS ZERO OF THEM. The drive's population was the defect, not
 * the drive. ⚠️ So verify this control with a NON-EMPTY queue or you have verified nothing.
 *
 * What it used to be: `px-2.5 py-1 rounded-pill text-micro font-mono uppercase tracking-[0.08em]
 * border`, outlined AND filled in BOTH states, selection additionally switching to `font-bold`
 * in a MONO face — S-07b's reflow defect verbatim, still shipping. It measured **24px**, eight
 * pixels UNDER `--h-control-xs` (32px), the dense-admin floor it was nominally claiming. It now
 * renders through `FilterPill` at the dense rank, so it is the same size and the same idiom as
 * the state and category rails a few pixels above it.
 *
 * ⭐ `data-filter-rail` IS LOAD-BEARING, NOT DECORATION. Its ABSENCE is precisely why this rail
 * was invisible to `test:filter-language` §0.3/§0.4 and to every live probe. Each call site
 * passes its own `railId`, because one page renders two of these (pending and approved) and two
 * rails answering to one name cannot be told apart by a driver.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import type { SortDir } from "@/components/admin/admin-sort";

export function CardSortControl({
  basePath,
  railId,
  prefix,
  current,
  dir,
  sp,
  options,
}: {
  /** The route the rail sorts — the ONE line that used to differ between the two copies. */
  basePath: string;
  /** Unique per rendered rail (`poll-sort-pending`, `candidate-sort-approved`, …). */
  railId: string;
  prefix: string;
  current: string;
  dir: SortDir;
  sp: Record<string, string | undefined>;
  options: { field: string; label: string }[];
}) {
  const sortKey = `${prefix}sort`;
  const dirKey = `${prefix}dir`;
  const pageKey = `${prefix}page`;
  const buildHref = (field: string) => {
    const isActive = current === field;
    const nextDir: SortDir = isActive && dir === "desc" ? "asc" : "desc";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== sortKey && k !== dirKey && k !== pageKey) params.set(k, v);
    }
    params.set(sortKey, field);
    params.set(dirKey, nextDir);
    return `${basePath}?${params.toString()}`;
  };
  return (
    <div className="flex items-center gap-1 flex-wrap px-4 lg:px-5 pt-3" data-filter-rail={railId}>
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle mr-1">
        Sort <span className="italic text-text-tertiary">· Panga</span>
      </span>
      {options.map((o) => {
        const isActive = current === o.field;
        return (
          <FilterPill
            key={o.field}
            href={buildHref(o.field)}
            /* ⚠️ THE ARROW STAYS AFTER THE WORD, so it is carried in `label` rather than in the
               primitive's leading `glyph` slot: "Date ↓" is the sort convention every table
               header on this console already uses, and "↓ Date" would read as a new one.
               ⛔ It no longer carries `text-brand-300` — a selected control's ink is the
               primitive's business (law 82), and the arrow inherits it. */
            label={
              <>
                {o.label}
                {isActive && <span className="ml-1" aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>}
              </>
            }
            on={isActive}
            rank="dense"
            semantics="tab"
            scroll={false}
            testId={`sort:${o.field}`}
          />
        );
      })}
    </div>
  );
}
