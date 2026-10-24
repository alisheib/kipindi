/**
 * THE FEE LAW'S SWITCH RECORD — the audited instant from which the new law (programme FEE-TAX-2026-10) applies to every
 * NEW market, Up & Down round and Millionea week (`docs/FEE-TAX-PLAN.md` §5; Ali's go-live answers of 2026-10-24, item 1:
 * "You do it, under my ruling" — the release itself turns the law on, once, recorded in his name).
 *
 * ⭐ WHY A READER, AND WHY HERE. The binding texts state the moment the law changed — "a market or round created before
 * {that moment} keeps the rule it was created under" — and a date typed into SHA-pinned text would be a second record of a
 * fact the switch already records. So every text reads it from the switch's own row, through this one reader: the Terms
 * (§4, §5), both rulebooks, `/help` and the assistant. The SWITCH writes the row (release R5, the lead's act); nothing
 * here writes it.
 *
 * THE ROW. `SystemConfig[FEE_SWITCH_RECORD_KEY]`, a JSON object whose `at` is an ISO-8601 instant — the moment the three
 * saves (the polls' model and the winnings tax; every Up & Down chain; Millionea) were read back, from which a new market
 * freezes the new law. Any other fields the switch keeps beside it (who, why, the audit row's id) are its own business and
 * are not read here.
 *
 * ⛔ NEVER THROWS, NEVER GUESSES. Nothing stored, a malformed row, an unreadable instant, or a read that fails — each is
 *    `null`, and every text then says "from the date shown on the site banner" instead of a date (the brief's rule). A
 *    wrong date in a binding text is worse than no date: the banner is up from the switch onward (§5 step 4).
 * ⚠️ NO DATABASE (local development, the in-memory suites): the row lives in process memory on `globalThis`, as the
 *    second-officer setting's does (`second-officer-policy.ts`), so a page and a server action bundled apart read one row.
 *    A suite (or a local switch) sets it through `feeSwitchMemoryRow()`.
 */
import { loadConfigResult } from "./config-store";
import { hasDatabase } from "./prisma";

/** The SystemConfig key the switch writes once, at go-live. */
export const FEE_SWITCH_RECORD_KEY = "fee_law.switch";

/** The one field every text reads: the instant the new law applies from, as a canonical ISO-8601 string. */
export type FeeSwitchRecord = { at: string };

/** A stored value, understood — or null when it is not an object carrying a readable `at` instant. Pure. */
export function parseFeeSwitchRecord(v: unknown): FeeSwitchRecord | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const at = (v as Record<string, unknown>).at;
  if (typeof at !== "string" || at.trim() === "") return null;
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return null;
  return { at: new Date(ms).toISOString() };
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_FEE_SWITCH_MEM: { value: unknown } | undefined;
}

/** The in-process row used when there is no database — read by `readFeeSwitchRecord`, written by a local switch or a
 *  suite. ⛔ Never a production path: with a database the row is `SystemConfig`'s. */
export function feeSwitchMemoryRow(): { value: unknown } {
  return (globalThis.__50PICK_FEE_SWITCH_MEM ??= { value: null });
}

/** ⭐ THE SWITCH RECORD, READ NOW — `null` when there is none to read (see the header). Never rejects. */
export async function readFeeSwitchRecord(): Promise<FeeSwitchRecord | null> {
  try {
    if (!hasDatabase()) return parseFeeSwitchRecord(feeSwitchMemoryRow().value);
    const res = await loadConfigResult<unknown>(FEE_SWITCH_RECORD_KEY);
    return res.ok ? parseFeeSwitchRecord(res.value) : null;
  } catch {
    return null;
  }
}
