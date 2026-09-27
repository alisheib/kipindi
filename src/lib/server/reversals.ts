/**
 * THE OBJECTION RULINGS THAT CHANGED A VERDICT — memoised, for every public surface that states a
 * sign-off (`signoffOf`, lib/markets/signoff.ts).
 *
 * `upholdObjection` flips a market's verdict (remedy REVERSE) or voids it (remedy VOID) and leaves the
 * resolution stamps as they were (objections-service.ts), so without this the landing strip, `/fairness`,
 * the public attestation feed and the market page would credit whoever signed the verdict that was
 * thrown out. ⚠️ An EMERGENCY void writes the same kind of row (UPHELD / VOID, `closeObjectionsForVoidedMarket`)
 * but re-stamps the market's seal with the voiding officer first — `signoffOf` tells the two apart.
 *
 * ⭐ ONE narrow read (four columns, no cap — `listUpheldRulings`), memoised 60s the way `getPlatformStats`
 * is: `/fairness` is signed-out and curl-able, and `/api/fairness/recent` is polled. A failed read returns
 * an empty map — the stamps, which is what every surface said before objections existed — never an
 * exception on a public page.
 */
import { db } from "./store";
import type { Ruling } from "@/lib/markets/signoff";

const TTL_MS = 60_000;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RULINGS: { at: number; value: Map<string, Ruling[]> } | undefined;
}

/** marketId → every upheld REVERSE / VOID ruling on it. */
export async function objectionRulings(): Promise<Map<string, Ruling[]>> {
  const now = Date.now();
  const cached = globalThis.__50PICK_RULINGS;
  if (cached && now - cached.at < TTL_MS) return cached.value;
  // `Promise.resolve().then(...)`: the in-memory store answers synchronously, Prisma asynchronously.
  const rows = await Promise.resolve().then(() => db.objection.listUpheldRulings()).catch(() => []);
  const value = new Map<string, Ruling[]>();
  for (const r of rows) {
    if (!r.reviewedAt || (r.remedy !== "REVERSE" && r.remedy !== "VOID")) continue;
    const list = value.get(r.marketId) ?? [];
    list.push({ remedy: r.remedy, by: r.reviewedBy, at: r.reviewedAt });
    value.set(r.marketId, list);
  }
  globalThis.__50PICK_RULINGS = { at: now, value };
  return value;
}
