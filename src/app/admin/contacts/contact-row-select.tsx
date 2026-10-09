"use client";

/**
 * U23 · THE SELECT COLUMN — one row's tick box, and the header's tri-state box for the whole page — and (C8b) the one
 * selection a whole-number search that lists no row offers (a masked officer's, or a reader's of a number the book
 * blocks): the number itself (`ContactNumberSelect`).
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ContactSelectionRow } from "@/lib/contacts/bulk-rules";
import { useContactsSelection } from "./contacts-selection-provider";
import { CONTACTS_BULK, CONTACTS_NUMBER_PRESENCE } from "./contacts-copy";

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

/**
 * ⭐ C8b · B3's ONE EXCEPTION — a masked officer's whole-number search lists no row, so a number the book holds is selected
 * here: the page hands the selection the whole number ALONE (counted one, the presence bit, `numberOnly`), and the bar's
 * Suppress and Record a withdrawal act on it — a stop given by phone is still honoured. The bar disables its other four
 * actions for that selection, and the server refuses them, in words (the re-review's MN-1). ⭐ (NIT 9) The same control
 * answers a READER's whole number that the book blocks, which lists no row either. No server action here either:
 * selecting is a read affordance.
 */
export function ContactNumberSelect() {
  const s = useContactsSelection();
  return (
    <Button type="button" size="sm" variant="ghost" onClick={s.selectAllMatching} disabled={s.mode === "matching"} data-number-select>
      {CONTACTS_NUMBER_PRESENCE.select}
    </Button>
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
