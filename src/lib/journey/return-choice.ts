import { parseSheetSeed } from "./sheet-seed";
import type { SheetSeed } from "./sheet-state";

/** A closed or removed target read only after the server has scoped the saved payment intent to this owner. */
export type ReturnChoice = {
  state: "closed" | "missing";
  seed: SheetSeed | null;
  title: string;
  walletBalance: number | null;
  similar: Array<{ id: string; title: string }>;
};

export function parseReturnChoice(raw: unknown, marketId: string): ReturnChoice | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.state !== "closed" && value.state !== "missing") return null;
  if (typeof value.title !== "string" || value.title.length > 240) return null;
  const seed = value.seed === null ? null : parseSheetSeed(value.seed);
  if (value.state === "closed" && (!seed || seed.id !== marketId || seed.bettable)) return null;
  if (value.state === "missing" && seed !== null) return null;
  const walletBalance = value.walletBalance === null ? null : value.walletBalance;
  if (walletBalance !== null && (typeof walletBalance !== "number" || !Number.isFinite(walletBalance) || walletBalance < 0)) return null;
  if (!Array.isArray(value.similar) || value.similar.length > 3) return null;
  const similar: Array<{ id: string; title: string }> = [];
  for (const item of value.similar) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !/^mkt_[A-Za-z0-9]{1,64}$/.test(row.id)
      || row.id === marketId || typeof row.title !== "string" || !row.title || row.title.length > 240) return null;
    similar.push({ id: row.id, title: row.title });
  }
  return { state: value.state, seed, title: value.title, walletBalance, similar };
}
