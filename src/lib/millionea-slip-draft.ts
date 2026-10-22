import { SLOT_COUNT, type MaswaliPick } from "@/lib/maswali-score";

/** A week has one tab-local draft, but each ticket in it has its own fifteen answers. */
export type DraftPicks = (MaswaliPick | null)[];
export type MillioneaSlipDraft = { v: 2; active: number; slips: DraftPicks[] };

const validPick = (pick: unknown): pick is MaswaliPick | null => pick === null || pick === "YES" || pick === "NO";

export function emptySlip(hiddenSlots: readonly number[], hiddenPick: MaswaliPick): DraftPicks {
  const picks: DraftPicks = Array.from({ length: SLOT_COUNT }, () => null);
  for (const slot of hiddenSlots) if (Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT) picks[slot - 1] = hiddenPick;
  return picks;
}

export function newSlipDraft(hiddenSlots: readonly number[], hiddenPick: MaswaliPick): MillioneaSlipDraft {
  return { v: 2, active: 0, slips: [emptySlip(hiddenSlots, hiddenPick)] };
}

/** Accept the former single-ticket draft too, so a deposit return never loses answers across this release. */
export function parseSlipDraft(
  saved: unknown, hiddenSlots: readonly number[], hiddenPick: MaswaliPick, remaining: number,
): MillioneaSlipDraft | null {
  const old = Array.isArray(saved) && saved.length === SLOT_COUNT;
  const record = !old && saved !== null && typeof saved === "object" ? saved as Partial<MillioneaSlipDraft> : null;
  const rawSlips: unknown = old ? [saved] : record?.v === 2 ? record.slips : null;
  if (!Array.isArray(rawSlips) || rawSlips.length < 1 || rawSlips.length > remaining) return null;
  const slips: DraftPicks[] = [];
  for (const raw of rawSlips) {
    if (!Array.isArray(raw) || raw.length !== SLOT_COUNT || !raw.every(validPick)) return null;
    const picks = [...raw] as DraftPicks;
    for (const slot of hiddenSlots) if (Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT) picks[slot - 1] = hiddenPick;
    slips.push(picks);
  }
  const active = old ? 0 : record?.active;
  return { v: 2, active: typeof active === "number" && Number.isInteger(active) && active >= 0 && active < slips.length ? active : 0, slips };
}

export function pickInDraft(draft: MillioneaSlipDraft, slot: number, pick: MaswaliPick): MillioneaSlipDraft {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) return draft;
  return {
    ...draft,
    slips: draft.slips.map((slip, i) => i === draft.active
      ? slip.map((answer, j) => j === slot - 1 ? pick : answer)
      : slip),
  };
}

export function selectSlip(draft: MillioneaSlipDraft, index: number): MillioneaSlipDraft {
  return Number.isInteger(index) && index >= 0 && index < draft.slips.length ? { ...draft, active: index } : draft;
}

export function addSlip(
  draft: MillioneaSlipDraft, hiddenSlots: readonly number[], hiddenPick: MaswaliPick, remaining: number,
): MillioneaSlipDraft {
  if (draft.slips.length >= remaining) return draft;
  return { v: 2, active: draft.slips.length, slips: [...draft.slips, emptySlip(hiddenSlots, hiddenPick)] };
}

export function removeActiveSlip(draft: MillioneaSlipDraft): MillioneaSlipDraft {
  if (draft.slips.length <= 1) return draft;
  const slips = draft.slips.filter((_, i) => i !== draft.active);
  return { v: 2, active: Math.min(draft.active, slips.length - 1), slips };
}

export const slipComplete = (picks: readonly (MaswaliPick | null)[]): picks is MaswaliPick[] =>
  picks.length === SLOT_COUNT && picks.every((pick) => pick === "YES" || pick === "NO");

export const firstIncompleteSlip = (draft: MillioneaSlipDraft): number => draft.slips.findIndex((slip) => !slipComplete(slip));

/** A displayed total is only offered when it is an exact whole amount. The server recomputes it under the wallet lock. */
export function slipTotal(price: number, count: number): number | null {
  const total = price * count;
  return Number.isSafeInteger(price) && price > 0 && Number.isSafeInteger(count) && count > 0 && Number.isSafeInteger(total)
    ? total : null;
}
