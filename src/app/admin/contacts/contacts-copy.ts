/**
 * The empty-state copy for /admin/contacts, in ONE place (U17, 2026-09-28).
 *
 * ⭐ WHY A MODULE FOR TWO SENTENCES. `loading.tsx` has to reserve exactly the height the real
 * block will take, and this body wraps to ONE line at 1280 and THREE at 360 — so a ghost built
 * from a fixed bar height can only ever be right at one width (measured: the real block is
 * 230.38px at 1280 and 272.63px at 360). The ghost therefore lays out these same strings with
 * the same typography classes and paints them transparent, which makes the wrap — and so the
 * height — identical at EVERY width by construction rather than by a number someone tuned.
 * ⛔ Change a sentence here and both sides move together. Never re-type either one.
 *
 * Admin chrome is English; the Swahili gloss for this section sits on `AdminPageHead`
 * ("Anwani", copied from `src/app/admin/invites/[id]/page.tsx:88`), not on the empty state —
 * `EmptyState`'s `titleSw`/`bodySw` props are accepted for back-compat and NEVER rendered.
 */
export const CONTACTS_EMPTY = {
  title: "No contacts yet",
  /** ⛔ States the present, promises nothing: there is no store until U18 and no importer until
   *  U25, and this programme does not publish a commitment with no code behind it (D12). */
  body: "The marketing address book is empty. Adding and importing contacts are not live yet.",
} as const;
