/**
 * U23 · THE BULK BAR'S RULES — the ONE tier rule the screen shows and the server enforces, the per-number cap, the
 * parameters an officer types (a tag, a list name), and the wire shapes the bar and the server share.
 *                                                                                          (S10, 2026-10-02)
 *
 * ⭐ ONE FUNCTION DECIDES HOW A BULK IS CONFIRMED (`bulkConfirmTier`), and the bar never computes the answer itself: it
 * renders the tier the SERVER's preview returned, and the run recomputes it from the server's own recount (OD27/OD28).
 * Up to 50 TICKED rows enumerate (the preview names the first 20); above 50, or ANY filter audience — "select all N
 * matching", which can grow while the officer reads — the officer types the server's count in digits, so a confirmation
 * is bound to the scope it was given for and a moved audience is refused.
 * ⭐ THE PARAMETERS GO THROUGH U28's ONE RULE (`contact-fields.ts`, decisions C11/C12): a tag is `parseOneTag` — stored
 * lower case, a separator refused rather than split — so a bulk "VIP" is the "vip" the form stores; a new list's name is
 * cleaned like a name and held to `CONTACT_LIMITS.listName`.
 * ⛔ THE SELECTION'S ID CAP IS NOT HERE: it is U24's ONE cap (`MAX_AUDIENCE_IDS`, `audience.ts`, decision C6), which the
 * page hands the bar — a second copy of the number would be a second cap.
 * ⛔ PURE AND CLIENT-SAFE: it imports `./contact-fields` alone (pinned), nothing from `lib/server` or `app/` —
 * `test:contacts-boundary` §2 and `test:client-graph-safe` (it is pinned there) hold that.
 *
 * Guard: `test:contacts-bulk` · red: `red:contacts-bulk`.
 */
import { CONTACT_LIMITS, charCount, cleanDisplayName, parseOneTag } from "./contact-fields";

/** Up to this many TICKED rows, the confirmation names them (from the server's preview); above it, a typed count. */
export const BULK_ENUMERATE_MAX = 50;
/** How many rows the enumerated confirmation names before "and N more". */
export const BULK_SAMPLE = 20;
/**
 * ⛔ THE PER-NUMBER CAP. A withdrawal and a suppression each write evidence ONE NUMBER AT A TIME (a ledger row or a stop,
 * the book's cache, a player's switch), so a run takes at most this many contacts and REFUSES above it with the reason —
 * never truncated. ⚠️ An estimate (about five queries a number): re-measure p95 on production after the deploy.
 */
export const BULK_PER_ROW_MAX = 1000;

/**
 * The bar's six actions, in the order it draws them. ⛔ No "record consent": a lawful consent needs a recorded basis and an
 * 18+ attestation, which U33 builds and adds to this bar. No export either: U34 posts the same audience to its own route.
 */
export const CONTACT_BULK_ACTIONS = ["tag", "untag", "addToList", "withdraw", "suppress", "remove"] as const;
export type ContactBulkAction = (typeof CONTACT_BULK_ACTIONS)[number];
export function isContactBulkAction(v: unknown): v is ContactBulkAction {
  return typeof v === "string" && (CONTACT_BULK_ACTIONS as readonly string[]).includes(v);
}
/** The two that write evidence per number, capped at `BULK_PER_ROW_MAX`. */
export const PER_ROW_ACTIONS: readonly ContactBulkAction[] = ["withdraw", "suppress"];
export function isPerRowAction(a: ContactBulkAction): boolean {
  return PER_ROW_ACTIONS.includes(a);
}

/**
 * ⛔ WHAT A SELECTED ROW IS IN THE BROWSER — exactly three keys, projected on the SERVER (`contactSelectionRow`,
 * `contact-bulk.ts`): the id, the name, and the number MASKED, for every role. No raw number reaches the client.
 */
export type ContactSelectionRow = { id: string; name: string | null; masked: string };

export type BulkConfirmTier = { kind: "enumerate" } | { kind: "typed"; word: string };

/**
 * ⭐ THE ONE TIER RULE. `ticksOnly`: the audience is nothing but ticked rows — a filter ("select all N matching") is never
 * ticks, even at three rows, because it can grow while the officer reads. Typed when not ticks-only, or above
 * `BULK_ENUMERATE_MAX`; the word is the SERVER's count in plain digits ("2981").
 */
export function bulkConfirmTier(serverCount: number, ticksOnly: boolean): BulkConfirmTier {
  return ticksOnly && serverCount <= BULK_ENUMERATE_MAX ? { kind: "enumerate" } : { kind: "typed", word: String(serverCount) };
}

export type BulkTagVerdict = { ok: true; tag: string } | { ok: false; sentence: string };
/** The bulk Tag / Untag box: ONE tag, through U28's ONE rule (`parseOneTag`) — the browser and the server ask this. */
export function parseBulkTag(raw: unknown): BulkTagVerdict {
  const v = parseOneTag(typeof raw === "string" ? raw : "");
  return v.ok ? { ok: true, tag: v.tag } : { ok: false, sentence: v.sentence };
}

export const LIST_NAME_EMPTY = "Type a name for the new list.";
export const LIST_NAME_TOO_LONG = `A list name can be at most ${CONTACT_LIMITS.listName} characters.`;
export type ListNameVerdict = { ok: true; name: string } | { ok: false; sentence: string };
/** A new list's name: cleaned like a name (NFC, invisible characters out, spaces collapsed), 1–60 characters (C12). */
export function parseListName(raw: unknown): ListNameVerdict {
  const name = cleanDisplayName(typeof raw === "string" ? raw : "");
  if (name === null) return { ok: false, sentence: LIST_NAME_EMPTY };
  if (charCount(name) > CONTACT_LIMITS.listName) return { ok: false, sentence: LIST_NAME_TOO_LONG };
  return { ok: true, name };
}

/** ⭐ Two list names that differ only in case (or width) are ONE list to a person and two audiences to the store, whose
 *  unique index is case-sensitive — so a new name is compared with every list by this key, and a clash is refused. */
export function listNameKey(name: string): string {
  return name.normalize("NFKC").toLowerCase();
}

/* ═══ THE WIRE — what the bar posts, and what the server answers ═══════════════════════════════════ */

/**
 * What the bar posts to both actions. `audience` is U24's audience JSON (decision C6): `{ ids: [...] }` for ticked rows,
 * the page's canonical filter for "select all N matching". `typed` is the count the officer typed, when the preview's
 * tier asked for one. ⛔ Nothing else is read: the server's parser builds its request from these keys alone.
 */
export type ContactBulkPost = {
  action: ContactBulkAction;
  audience: Record<string, unknown>;
  typed: string | null;
  tag?: string;
  listId?: string;
  newListName?: string;
};

/** Why nothing was written. ⭐ `error` alone means a run may have STARTED before it failed; every other reason is a
 *  refusal that wrote nothing — the gate (`forbidden`), the per-officer rate rule (`rate_limited`) and the service's own. */
export type BulkRefusalReason =
  | "forbidden" | "rate_limited" | "bad_request" | "bad_audience" | "too_many_ids" | "role" | "empty"
  | "too_many_for_per_row" | "confirm_required" | "confirm_mismatch" | "bad_tag" | "bad_list" | "list_exists" | "error";

/** A refusal: a reason the bar can branch on, one sentence for the officer, the field it names, and — for the two
 *  confirmation refusals and the cap — the SERVER's count now. */
export type BulkRefusal = { ok: false; reason: BulkRefusalReason; error: string; field?: "tag" | "list"; expected?: number };

/** The server's preview — what the confirmation is built from. ⛔ `count` and `tier` are the server's; the bar shows them
 *  and never derives its own. `sample` is filled only for the enumerate tier. */
export type BulkPreview = {
  ok: true;
  action: ContactBulkAction;
  count: number;
  tier: BulkConfirmTier;
  sample: ContactSelectionRow[];
  /** The audience in words (`describeAudience`, U24's one describer) — a whole number masked. */
  described: string[];
  tag: string | null;
  listName: string | null;
  listIsNew: boolean;
};

/**
 * A run's answer, counted by the store. `changed` and `unchanged` are null when the split is not this viewer's to read:
 * whether a number's consent record already said WITHDRAWN is a player signal (D19 / A1.1), and so is whether it was
 * already under a stop (OD54), so a masked viewer's withdrawal and suppression are told the total only. A row in
 * `matched` that is in none of the counts was gone before the write.
 */
export type BulkOutcome = {
  ok: true;
  action: ContactBulkAction;
  matched: number;
  changed: number | null;
  unchanged: number | null;
  full: number;
  listName: string | null;
};
