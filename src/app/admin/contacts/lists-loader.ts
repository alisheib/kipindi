/**
 * U33b-L · WHAT THE "LISTS" CARD IS HANDED — one row per contact list, with its basis standing and its coverage.
 *
 * ⛔ EVERY FIGURE IS THE DAL'S OWN. `coveredCount` answers "how many of this list's members does its newest recording
 * reach", and this file does not recompute it: the gate decides who may be messaged from the same read, and a second
 * count here is how the screen comes to promise a reach the gate will not honour.
 *
 * ⛔ AND IT CARRIES NO PHONE NUMBER. A list row is counts, names and instants — D19's masked viewer reads this card in
 * full, because there is nothing in it to mask.
 */
import { db } from "@/lib/server/store";
import { currentWording } from "@/lib/server/marketing/wordings";

/** One list as the card renders it. */
export type ListRowView = {
  readonly id: string;
  readonly name: string;
  /** Members whose book row is live and linked to no account — a list basis never reaches an account's number. */
  readonly live: number;
  /** Of those, the ones a recording in force covers. 0 when there is none, or when it was revoked. */
  readonly covered: number;
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

export async function listsCardView(): Promise<ListsCardView> {
  const wording = currentWording("basis.LICENCE_OUTREACH");
  const adult = currentWording("adult.list");
  const lists = await Promise.resolve(db.contactList.listAll());
  const rows: ListRowView[] = [];
  for (const l of lists) {
    const coverage = await Promise.resolve(db.contactListBasis.coveredCount(l.id));
    const newest = (await Promise.resolve(db.contactListBasis.listForList(l.id)))[0] ?? null;
    rows.push({
      id: l.id,
      name: l.name,
      live: coverage.live,
      covered: coverage.covered,
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
