/**
 * U38b · THE COMPOSER'S AUDIENCE RAIL — one rail, the shared filter language, at the admin density.
 *
 * ⛔ IT TYPES NO ROUTE, NO ENUM AND NO LABEL. Every pill's label, its href and whether it is the one in force are built in
 * `audience-rail-model.ts` — read by the campaign door's own parsers, every href the composer's ONE builder's
 * (`composeHref`: the draft kept, the other filters kept) — so the pill an officer presses cannot disagree with the
 * audience the card counts. This file reads the book's lists and tags (whole-book facts, a masked viewer's too — the
 * contact book's rail shows them alike) and draws.
 * ⛔ A SERVER COMPONENT, DELIBERATELY: `FilterPill` is a `<Link>` with its own client boundary, and the window is the
 * platform's ONE window control (`DateTimeRangeFilter`, `"use client"`), which reads and writes the address itself — at
 * `defaultPreset="all"`, so no window is ever applied that nobody chose ("never a hidden last 7 days"); the campaign
 * door resolves whatever it writes to ABSOLUTE instants, and a save stores those.
 * ⛔ THE COMPOSER'S ONE filter-rail FILE: `data-filter-rail` once, declared in `test:filter-language`'s ADMIN_SURFACES in
 * the same commit; every rank-taking control at the dense rank (32px — the console's rails' one size); `replace` and
 * `scroll={false}` on every pill and on the window control: a filter is not a navigation.
 * 🔴 D19 / A1.1 / OD54 · ROLE-SHAPED UPSTREAM: a viewer who may not read a number is handed no Consent, Stop list, Source
 * or Player axis (the model) — this file draws what it is given and cannot add one back. The read cell is decided in a
 * `.ts` (`viewerReadsContacts`), never here.
 *
 * @see ./audience-rail-model.ts · scripts/filter-language.test.mts
 */
import { FilterGroupKey, FilterPill } from "@/components/ui/filter-pill";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { db } from "@/lib/server/store";
import type { ContactTagCount, StoredContactList } from "@/lib/server/store";
import { contactTagCounts } from "@/lib/server/marketing/audience";
import { RAIL_TAG_READ } from "@/app/admin/contacts/contacts-rail";
import { viewerReadsContacts } from "@/app/admin/contacts/contacts-loader";
import { audienceRail } from "./audience-rail-model";
import type { ComposeParams } from "./composer-loader";

/** The window presets the rail offers — whole days and recent spans, and "all" (no window) as the default. */
const WINDOW_PRESETS: readonly string[] = ["today", "yesterday", "7d", "30d", "all"];

export async function AudienceRail({ sp }: { sp: ComposeParams }) {
  const reads = await viewerReadsContacts().catch(() => false);
  // ⭐ Read soft: a rail whose options cannot be read still draws what the address applies (the model's own rule) — the
  // card's count is unaffected.
  let lists: StoredContactList[] | null = null;
  let tags: ContactTagCount[] | null = null;
  try {
    [lists, tags] = await Promise.all([db.contactList.listAll(), contactTagCounts(RAIL_TAG_READ)]);
  } catch (err) {
    console.error("[admin/campaigns/new] the audience rail's lists and tags could not be read:", (err as { name?: unknown })?.name ?? "error");
  }
  const rail = audienceRail({ sp, reads, lists, tags });
  return (
    <div data-filter-rail="campaign-audience" data-keeps-form role="group" aria-label={rail.label} className="flex flex-col gap-2 border-b border-border-subtle pb-3">
      {rail.groups.map((g) => (
        <div key={g.param} role="group" aria-label={g.label} data-rail-group={g.param} className="flex items-center gap-1 flex-wrap gap-y-1.5">
          <FilterGroupKey>{g.label}</FilterGroupKey>
          {g.kind === "window" ? (
            <DateTimeRangeFilter rank="dense" replace defaultPreset="all" presetIds={WINDOW_PRESETS} />
          ) : (
            g.options.map((o) => (
              <FilterPill
                key={`${g.param}:${o.key}`}
                href={o.href}
                label={o.label}
                title={o.title}
                on={o.on}
                semantics={g.semantics}
                rank="dense"
                replace
                scroll={false}
                testId={`${g.param}:${o.key}`}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}
