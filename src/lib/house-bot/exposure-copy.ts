/**
 * THE HOUSE STAKE IN AN OFFICER'S WORDS — every R2 phrase an admin reads beside a money decision (C5-SPEC rulings 192–197).
 *
 * ⭐ ONE HOME FOR THE WORDS. The platform's admin emitters, templates and pages never spell a house-stake phrase themselves:
 * they ask this module, the way house-bot alerts ask `alert-copy.ts` (C4 ruling 141). It holds the emergency-void notice's
 * house share (ruling 195), the house line on the resolver queue, the ceremony, the market page, the objections queue and
 * the Up & Down rounds (rulings 192–194), the held chip's title and the bulk bar's count (194), the free-text qualifier
 * (196) and the KYC card's line (197). One server component renders the structured parts (`components/admin/exposure-line.tsx`).
 *
 * ⛔ STAFF ONLY. Nothing here reaches a player, a holder or a client module (owner ruling D19). A client control receives
 * the rendered line as a neutral slot, or a neutral string, from a server page — never this module. The player's
 * cancellation notice and letter never call it; `test:house-bot-reports` §4 proves them byte-identical with and without
 * house stakes, and §0 pins that no player surface imports it (ruling 198).
 * ⛔ PURE, AND IT STAYS PURE. No store, no server import; the money formatter is injected by the caller (the house module
 * law, `test:house-bot-rules` §0). Side words come from the platform's one side vocabulary (`side-label.ts`, ruling 166).
 * ⛔ THE VIEWER COMPARISON LIVES HERE AND NOWHERE ELSE (ruling 193): a page hands over the viewer's id and never reads who
 * chose a stake itself. What it returns is display only — no refusal, no lock, no hidden control reads it (TGT-38, 191).
 *
 * ⚠️ Swahili and Chinese reuse the admin vocabulary already shipped in `alert-copy.ts` ("dau la nyumba", 平台投注) and are
 * marked for native review with every other house-bot string.
 */
import { sideWordIn, type LabelProductLine } from "@/lib/side-label";

/** Formats a whole-shilling amount the platform's way (the caller passes `formatTzs`). */
export type MoneyFormat = (tzs: number) => string;

/** What an emergency void refunded to house-marked positions, counted in its refund loop (ruling 195). */
export type VoidHouseShare = { houseRefundedTzs?: number | null; houseRefundedCount?: number | null };

const positionsEn = (n: number) => `${n} ${n === 1 ? "position" : "positions"}`;

/** The share's figures, or null when the void refunded no house stake — the notice and the letter then say exactly what they said before. */
function shareOf(share: VoidHouseShare | null | undefined): { tzs: number; count: number } | null {
  const tzs = Number(share?.houseRefundedTzs ?? 0);
  const count = Number(share?.houseRefundedCount ?? 0);
  return Number.isFinite(tzs) && tzs > 0 ? { tzs, count } : null;
}

/**
 * Ruling 195 · the one clause the emergency-void ADMIN bell adds after "… refunded to N players": the house share in the
 * bell's three languages, or null. English: ", of which house stakes TZS 8,000 on 2 positions".
 */
export function voidNoticeHouseClause(share: VoidHouseShare | null | undefined, money: MoneyFormat): { en: string; sw: string; zh: string } | null {
  const s = shareOf(share);
  if (!s) return null;
  const amount = money(s.tzs);
  return {
    en: `, of which house stakes ${amount} on ${positionsEn(s.count)}`,
    sw: `, ikiwemo dau la nyumba ${amount} kwenye nafasi ${s.count}`,
    zh: `，其中平台投注 ${amount}（${s.count} 笔）`,
  };
}

/** Ruling 195 · the one detail row the emergency-void ADMIN letter adds after "Total refunded", or null. */
export function voidEmailHouseRow(share: VoidHouseShare | null | undefined, money: MoneyFormat): { label: string; value: string } | null {
  const s = shareOf(share);
  return s ? { label: "Of which house stakes", value: `${money(s.tzs)} on ${positionsEn(s.count)}` } : null;
}

/* ═══ Rulings 192–194 · the house line beside a decision ═══════════════════════════════════════════════════════════ */

/**
 * The figures a display reads. `HouseStakeView` (`server/house-bot/exposure.ts`) satisfies it as it is: this module takes
 * the shape, never that server module, so the module law holds.
 */
export type ExposureFigures = {
  yes: number;
  no: number;
  openTzs: number;
  settledTzs: number;
  staffChosen: { yes: number; no: number; byRequester: Readonly<Record<string, number>> };
};

/**
 * What a page knows about one market after its ONE read (ruling 194): the figures; `"unread"` when the read threw (never a
 * zero, ruling 190); `null` when the market was not part of the read.
 */
export type ExposureRead = ExposureFigures | "unread" | null;

/**
 * One market's read out of the page's single `houseStakeByMarket` result. `stakes` is `null` when that read threw — every
 * market on the page is then unread, because the page cannot know which of them the house holds.
 */
export function exposureReadOf(stakes: ReadonlyMap<string, ExposureFigures> | null, marketId: string): ExposureRead {
  if (stakes === null) return "unread";
  return stakes.get(marketId) ?? null;
}

/** The surfaces that show a house line, and which clauses each carries (rulings 193 and 196). */
export type ExposureSurface =
  | "resolverQueue" | "ceremony" | "voidConfirm" | "objectionsRow" | "objectionDialog" | "marketPage" | "roundsLever" | "roundVoidDialog";

/**
 * ⛔ THE CLAUSES PER SURFACE, IN ONE TABLE.
 *   · `viewer` — "of which chosen by you" renders on exactly four surfaces: the resolver queue card, the ceremony, the
 *     emergency-void confirm, and the objections row with its decision dialog (ruling 193).
 *   · `staff` — the staff-chosen clause everywhere but the Up & Down rounds, which get the house line only (staff-chosen
 *     stakes are polls only, W9/W13).
 *   · `qualifier` — the X9 (a) words on the four surfaces whose free-text field reaches a player: the emergency-void reason,
 *     the objection decision's note and the ceremony's evidence (ruling 196; the KYC card's is `kycHouseBetsLine`'s caller).
 */
export const EXPOSURE_SURFACES: Readonly<Record<ExposureSurface, { staff: boolean; viewer: boolean; qualifier: boolean }>> = {
  resolverQueue: { staff: true, viewer: true, qualifier: false },
  ceremony: { staff: true, viewer: true, qualifier: true },
  voidConfirm: { staff: true, viewer: true, qualifier: true },
  objectionsRow: { staff: true, viewer: true, qualifier: false },
  objectionDialog: { staff: true, viewer: true, qualifier: true },
  marketPage: { staff: true, viewer: false, qualifier: false },
  roundsLever: { staff: false, viewer: false, qualifier: false },
  roundVoidDialog: { staff: false, viewer: false, qualifier: false },
};

/** One "SIDE TZS x" group of the house line; a renderer keeps each group on one line. */
export type ExposureGroup = { side: "YES" | "NO"; sideWord: string; amountText: string };
/** The house line as structured parts (ruling 192). `label` carries the whole unread line when `unread`. */
export type ExposureParts = { label: string; groups: ExposureGroup[]; staffClause: string | null; viewerClause: string | null; unread: boolean };

/** The unread line: the read threw, so the display says so and never shows a figure (ruling 190). */
export const EXPOSURE_UNREAD_LINE = "House stake: — couldn't read";
/** X9 (a) · the visible qualifier beside a field whose text reaches a player (ruling 196). */
export const EXPOSURE_QUALIFIER = "staff only — never sent to players";

/** True when the read found a marked stake that is not cashed out. */
const holdsHouse = (v: ExposureFigures) => v.yes + v.no > 0;

/**
 * Ruling 193 · "of which chosen by you: TZS X", where X is the stake THIS viewer chose — never the staff-chosen total (A's
 * NO 9,000 beside B's YES 6,000 gives A "TZS 9,000"). Null for a viewer who chose none, and for no viewer.
 */
export function viewerClause(view: ExposureFigures, viewerId: string | null | undefined, money: MoneyFormat): string | null {
  if (typeof viewerId !== "string" || viewerId.length === 0) return null;
  const own = Object.prototype.hasOwnProperty.call(view.staffChosen.byRequester, viewerId) ? view.staffChosen.byRequester[viewerId] : 0;
  return typeof own === "number" && Number.isFinite(own) && own > 0 ? `of which chosen by you: ${money(own)}` : null;
}

/**
 * Rulings 192–193 · the house line for one surface, as parts, or null when there is nothing to say: no read for this
 * market, or a successful read that found no house stake (the page then renders exactly what it rendered before).
 *   · "House stake: NO TZS 9,000 · of which chosen by staff TZS 9,000" — non-zero sides only, YES first;
 *   · "House stake settled: …" when nothing of it is open;
 *   · the staff clause only when staff chose some of it, and only where the surface carries it;
 *   · the viewer clause only on the four surfaces of ruling 193;
 *   · "House stake: — couldn't read" when the read threw.
 */
export function exposureParts(
  read: ExposureRead | undefined,
  o: { surface: ExposureSurface; viewerId: string | null | undefined; productLine: LabelProductLine; money: MoneyFormat },
): ExposureParts | null {
  if (read === "unread") return { label: EXPOSURE_UNREAD_LINE, groups: [], staffClause: null, viewerClause: null, unread: true };
  if (read == null || !holdsHouse(read)) return null;
  const surface = EXPOSURE_SURFACES[o.surface];
  const groups: ExposureGroup[] = [];
  if (read.yes > 0) groups.push({ side: "YES", sideWord: sideWordIn("en", "YES", o.productLine), amountText: o.money(read.yes) });
  if (read.no > 0) groups.push({ side: "NO", sideWord: sideWordIn("en", "NO", o.productLine), amountText: o.money(read.no) });
  const chosen = read.staffChosen.yes + read.staffChosen.no;
  return {
    label: read.openTzs > 0 ? "House stake:" : "House stake settled:",
    groups,
    staffClause: surface.staff && chosen > 0 ? `of which chosen by staff ${o.money(chosen)}` : null,
    viewerClause: surface.viewer ? viewerClause(read, o.viewerId, o.money) : null,
    unread: false,
  };
}

/** The X9 qualifier for a surface whose house line sits beside a field that reaches a player, or null (ruling 196). */
export function exposureQualifier(surface: ExposureSurface): string | null {
  return EXPOSURE_SURFACES[surface].qualifier ? EXPOSURE_QUALIFIER : null;
}

/** Today's title on the resolver queue's held chip — kept exactly for a market read successfully with no house stake (194). */
export const HELD_CHIP_TITLE_TODAY = "Player money held on this market until it resolves";

/**
 * Ruling 194 · the held chip's title in its three states: the house's open stake named when it holds one; the word "Player"
 * dropped when the read failed (the page cannot know whose money it is); today's exact title otherwise.
 */
export function heldChipTitle(read: ExposureRead | undefined, money: MoneyFormat): string {
  if (read === "unread") return "Money held on this market until it resolves";
  if (read != null && read.openTzs > 0) return `Money held on this market until it resolves, including house ${money(read.openTzs)}`;
  return HELD_CHIP_TITLE_TODAY;
}

/** The neutral state a bulk-bar row carries (ruling 192): the client counts it and never learns a figure or a word. */
export type ExposureState = "none" | "held" | "unread";

/** One market's neutral state for the bulk bar. */
export function exposureStateOf(read: ExposureRead | undefined): ExposureState {
  if (read === "unread") return "unread";
  return read != null && holdsHouse(read) ? "held" : "none";
}

/**
 * Ruling 192 · the bulk bar's count, as the ONE string the client receives: two sentences separated by `|` — the held
 * count, then the unread note — each with `{n}` for its count. The bar shows a sentence only when its count is above 0
 * (`exposureCountLines` in `bulk-resolve-types.ts`), so a page with no house stake renders the bar it rendered before.
 */
export const BULK_EXPOSURE_COUNT_TEMPLATE = "House stakes on {n} of these markets|House stake couldn't be read on {n} of these markets";

/** Ruling 194 · the positions-table row tag on a house-marked position: "House bot · <label>" (an erased bot's label reads as erasure left it). */
export function houseBotRowTag(label: string): string {
  return `House bot · ${label}`;
}

/**
 * Ruling 197 · the KYC card's "Bets placed" block line: "of which house stakes: N", then " · TZS X" only for a viewer who
 * may see money (the caller passes null otherwise). Null when the account has no house stake — the card is then today's.
 */
export function kycHouseBetsLine(houseCount: number, stakedTzs: number | null, money: MoneyFormat): string | null {
  if (!(Number.isFinite(houseCount) && houseCount > 0)) return null;
  const amount = stakedTzs != null && Number.isFinite(stakedTzs) ? ` · ${money(stakedTzs)}` : "";
  return `of which house stakes: ${houseCount}${amount}`;
}
