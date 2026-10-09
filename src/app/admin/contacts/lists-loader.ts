/**
 * U33b-L · WHAT THE "LISTS" CARD IS HANDED — one row per contact list, with its basis standing and its coverage.
 *
 * ⛔ EVERY FIGURE IS THE DAL'S OWN. `coverageSplit` answers "how many of this list's members does its newest recording
 * reach", split by the account link, and this file does not recompute it: the gate decides who may be messaged from the
 * same read (`coveredCount`, the split's unlinked pair exactly), and a second count here is how the screen comes to
 * promise a reach the gate will not honour.
 *
 * 🔴 C8b (B5) · THE FIGURES ARE THE VIEWER'S (`listFiguresFor`, `src/lib/server/contacts/list-figures.ts` — the ONE rule the
 * importer's picker and result ask too). Until C8b every viewer read `coveredCount`'s pair, which leaves out the members
 * linked to an account, so a masked officer who put ONE number on a list read from the figure whether it was a player's
 * (the C8b survey's surface 5). Now a viewer who may not read a number is shown every live member, linked or not — the
 * campaign composer's count for that list — and the coverage over the same set, and no linked count; a reader is shown
 * today's exact figures plus how many members have a 50pick account. The list-basis COMPLIANCE audit row keeps the exact
 * figures it always recorded (`list-basis.ts` reads `coveredCount`).
 *
 * ⛔ AND IT CARRIES NO PHONE NUMBER. A list row is counts, names and instants — D19's masked viewer reads this card in
 * full, because there is nothing in it to mask.
 */
import { db } from "@/lib/server/store";
import { currentWording } from "@/lib/server/marketing/wordings";
import { listFiguresFor } from "@/lib/server/contacts/list-figures";

/** One list as the card renders it. */
export type ListRowView = {
  readonly id: string;
  readonly name: string;
  /** The list's live members as THIS viewer may count them (C8b · B5): for a reader, those linked to no account — a list
   *  basis never reaches an account's number; for anyone else, every live member, linked or not (the composer's count). */
  readonly live: number;
  /** Of those, the ones a recording in force covers. 0 when there is none, or when it was revoked. */
  readonly covered: number;
  /** ⭐ C8b (B5) · a READER's figure only: the live members linked to a 50pick account. Null for everyone else — absent,
   *  not hidden. */
  readonly withAccount: number | null;
  /** The newest recording, revoked or not — a list's ONE standing (U33a-L). */
  readonly basis: {
    readonly id: string;
    readonly recordedBy: string;
    readonly recordedAt: string;
    readonly revokedAt: string | null;
  } | null;
};

export type ListsCardView = {
  readonly rows: readonly ListRowView[];
  /** ⛔ False while the licence wording or its 18+ sentence is unsaved: the card says so and offers no Record button,
   *  because the writer would refuse anyway and a button that always fails is worse than none. */
  readonly wordingsSaved: boolean;
  /** The saved 18+ sentence, which LABELS the checkbox — the officer ticks the words they are attesting to, never a
   *  paraphrase this file invented. Null while unsaved. */
  readonly adultLabel: string | null;
  /** ⛔ 3b · That sentence's VERSION. The card holds its tick against it and posts it with a recording, so the writer
   *  records the confirmation against the words the officer read — or refuses words reworded since the page loaded
   *  (`attestation_stale`). Null while unsaved. */
  readonly adultVersion: number | null;
};

/** The card's rows for a viewer whose `identity.contact` cell is `read` (`viewerReads`) — or not. ⛔ Fails closed: the
 *  page passes the loader's own cell, false when it could not be read. */
export async function listsCardView(viewerReads = false): Promise<ListsCardView> {
  const wording = currentWording("basis.LICENCE_OUTREACH");
  const adult = currentWording("adult.list");
  const lists = await Promise.resolve(db.contactList.listAll());
  const rows: ListRowView[] = [];
  for (const l of lists) {
    const figures = listFiguresFor(await Promise.resolve(db.contactListBasis.coverageSplit(l.id)), viewerReads);
    const newest = (await Promise.resolve(db.contactListBasis.listForList(l.id)))[0] ?? null;
    rows.push({
      id: l.id,
      name: l.name,
      live: figures.live,
      covered: figures.covered,
      withAccount: figures.withAccount,
      basis: newest === null ? null : {
        id: newest.id, recordedBy: newest.recordedBy, recordedAt: newest.recordedAt, revokedAt: newest.revokedAt,
      },
    });
  }
  return {
    rows,
    wordingsSaved: wording !== null && adult !== null,
    adultLabel: adult?.text ?? null,
    adultVersion: adult?.v ?? null,
  };
}
