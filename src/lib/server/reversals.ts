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
 *
 * ⭐ AND NEVER BEHIND AN OBJECTION WRITE THIS PROCESS MADE (R9-D, 2026-10-11). The archive behind `/fairness`
 * now shows a reversed verdict the moment it is written (`listTerminalMarkets`), so a ruling read before the
 * reversal would, for up to a minute, credit the overturned verdict's officers with the one that stands —
 * on the regulator's page, and on `/markets/[id]`, which always read its market fresh. Every objection write
 * goes through `objections-service.ts`, and each one calls `noteObjectionWrite()` once it has landed; the memo
 * keeps the generation from BEFORE its read and is served only while no write has moved it since (the
 * switches' `gen` law, simple-journey-switch.ts). A write from another process is bounded by `TTL_MS`.
 * ⚠️ A Millionea objection (one question of a week, `maswali-objections.ts`) is never a ruling read here:
 * `listUpheldRulings` returns only rows without a question, on both stores, so its writes move nothing here.
 */
import { db } from "./store";
import type { Ruling } from "@/lib/markets/signoff";

const TTL_MS = 60_000;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RULINGS: { at: number; value: Map<string, Ruling[]>; gen: number } | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_RULINGS_GEN: number | undefined;
}

/** An objection row was created or changed — the next read of the rulings re-reads. Never throws. */
export function noteObjectionWrite(): void {
  globalThis.__50PICK_RULINGS_GEN = (globalThis.__50PICK_RULINGS_GEN ?? 0) + 1;
}

/** marketId → every upheld REVERSE / VOID ruling on it. */
export async function objectionRulings(): Promise<Map<string, Ruling[]>> {
  const now = Date.now();
  // ⛔ Taken BEFORE the read: a ruling written while it runs is read again by the next caller.
  const gen = globalThis.__50PICK_RULINGS_GEN ?? 0;
  const cached = globalThis.__50PICK_RULINGS;
  if (cached && cached.gen === gen && now - cached.at < TTL_MS) return cached.value;
  // `Promise.resolve().then(...)`: the in-memory store answers synchronously, Prisma asynchronously.
  const rows = await Promise.resolve().then(() => db.objection.listUpheldRulings()).catch(() => []);
  const value = new Map<string, Ruling[]>();
  for (const r of rows) {
    if (!r.reviewedAt || (r.remedy !== "REVERSE" && r.remedy !== "VOID")) continue;
    const list = value.get(r.marketId) ?? [];
    list.push({ remedy: r.remedy, by: r.reviewedBy, at: r.reviewedAt });
    value.set(r.marketId, list);
  }
  globalThis.__50PICK_RULINGS = { at: now, value, gen };
  return value;
}
