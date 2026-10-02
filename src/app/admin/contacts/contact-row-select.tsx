"use client";

/**
 * U23 · THE SELECT COLUMN — one row's tick box, and the header's tri-state box for the whole page.
 *                                                                                          (S10, 2026-10-02)
 *
 * ⛔ THE ROW IT IS HANDED IS THE SERVER'S PROJECTION (`{ id, name, masked }`, `contactSelectionRow`): no number reaches
 * this file, and the box's accessible name is the contact's name — or, for a nameless one, the MASKED number.
 * ⭐ THE HEADER HAS THREE STATES: none, some ("indeterminate" — a header that can only say checked or unchecked lies about
 * a partial selection) and the whole page. Ticking the page past U24's cap is refused by the provider, and said.
 * ⛔ NO SERVER ACTION IS IMPORTED HERE: these boxes tick, and ticking is a read affordance — a view-only officer may tick.
 * The act gate sits on the bar's actions, which submit (`contacts-bulk-bar.tsx`). The 44px hit area is the kit
 * Checkbox's own label (the real input is visually hidden), as on `/admin/resolver-queue`.
 */
import { Checkbox } from "@/components/ui/checkbox";
import type { ContactSelectionRow } from "@/lib/contacts/bulk-rules";
import { useContactsSelection } from "./contacts-selection-provider";
import { CONTACTS_BULK } from "./contacts-copy";

export function ContactRowSelect({ row }: { row: ContactSelectionRow }) {
  const s = useContactsSelection();
  return (
    <Checkbox
      checked={s.isOn(row.id)}
      onChange={() => s.toggle(row)}
      className="min-h-[44px] min-w-[44px] justify-center"
      ariaLabel={CONTACTS_BULK.selectRow(row.name ?? row.masked)}
    />
  );
}

export function ContactPageSelect() {
  const s = useContactsSelection();
  return (
    <Checkbox
      checked={s.allOnPage}
      indeterminate={s.someOnPage}
      onChange={(next) => s.setPage(next)}
      className="min-h-[44px] min-w-[44px] justify-center"
      ariaLabel={CONTACTS_BULK.selectPage}
    />
  );
}
