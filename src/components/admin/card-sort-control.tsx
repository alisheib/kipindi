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
 *
 * ⭐ A THIRD HOME, AND THE ONE PROP IT COST (2026-09-27). The desk's two activity ledgers draw
 * this rail below `sm`, where each row is a stacked card and the table's header row — the sort
 * control from `sm` up — is not drawn (Ali: "on a phone, the two activity lists can't be
 * re-sorted … a phone sort button"). It is THIS rail and not a second control because its links
 * are built by the same lines as `SortTh`'s: the same prefixed words, the same page reset, the
 * same next-direction rule — so a chip and the header for the same column are one address, which
 * the desk's console suite renders both and compares.
 * ⛔ `rank` IS THE ONLY EXTENSION, AND IT DEFAULTS TO THE DENSE RANK, so the two consoles above
 * render exactly what they did. The desk passes the non-dense rank for a measured reason: its own
 * visual gate holds every control to `--tap-min` (40px), and the dense rank's 32px floor is the
 * documented MOUSE-only admin exception — a phone has no mouse. `activity-filters.tsx` left the
 * dense rank for the same gate on 2026-09-23. `test:filter-language` §6.6 follows the prop to its
 * default and §6.6c–e walk every call site — each parsed, no spread, the ones allowed to lift it
 * named and driven by their gate — so the default cannot drift and a caller cannot leave the
 * dense rank unseen.
 */
import { FilterPill, type FilterPillRank } from "@/components/ui/filter-pill";
import type { SortDir } from "@/components/admin/admin-sort";

export function CardSortControl({
  basePath,
  railId,
  prefix,
  current,
  dir,
  sp,
  options,
  rank = "dense",
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
  /** Every chip's rank, ONE value for the whole rail. The admin dense rank unless the call site's own visual gate
   *  holds its controls to `--tap-min` — see the header. */
  rank?: FilterPillRank;
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
               primitive's business (law 82), and the arrow inherits it.
               ⭐ THE DIRECTION IS ALSO SAID, IN WORDS A SCREEN READER READS (2026-09-27). The arrow is
               `aria-hidden` — a picture of the state, not the state — and `FilterPill` says only
               `aria-current`, so the chip announced WHICH column and never which WAY. A table's header
               says it through `aria-sort`, but this rail is the sort control exactly where there is no
               header to say it: above a card queue, and on the desk's two ledgers below `sm`, whose header
               row is `display: none` there. So the chip in force carries the same two words `aria-sort`
               uses, visually hidden. The kit's own `sr-only` is out of flow, so no chip moves a pixel; the
               leading space is inside the expression because JSX trims text that starts a line, and the
               name must read "Stake ascending", never "Stakeascending". English, like the rest of this
               admin-only rail. */
            label={
              <>
                {o.label}
                {isActive && <span className="ml-1" aria-hidden>{dir === "asc" ? "↑" : "↓"}</span>}
                {isActive && <span className="sr-only">{dir === "asc" ? " ascending" : " descending"}</span>}
              </>
            }
            on={isActive}
            rank={rank}
            semantics="tab"
            scroll={false}
            /* ⛔ `testId` IS THE REAL QUERY-PARAM NAME, NOT THE WORD "sort". `filter-pill.tsx`
               documents the prop as *"axis:value" using the REAL query-param name and value —
               drivers rebuild a URL from it*, and this page's params are PREFIXED
               (`pendingsort`, `approvedsort`). A bare `sort:date` would both lie about the
               param and be AMBIGUOUS: one page renders TWO of these rails, so the two would
               collide on identical ids and a driver could not tell which it had pressed —
               which is the same reason `railId` is a prop. */
            testId={`${sortKey}:${o.field}`}
          />
        );
      })}
    </div>
  );
}
