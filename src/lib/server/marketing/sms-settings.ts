/**
 * U49s · THE MARKETING SMS SETTINGS RECORD — the SystemConfig row `marketing.sms.settings`, the readers every campaign
 * reads its money and its hours from, and the ONE verified setter the "Marketing SMS" tab on /admin/system saves through
 * (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s; decision E14). The shape, defaults, bounds and the rule are the
 * pure module's (`src/lib/marketing/sms-settings.ts`) — the card validates with the same function this file refuses with.
 *
 * ⭐ ONE SOURCE OF TRUTH FOR THE PRICE. It replaces the `SMS_PRICE_PER_SEGMENT_TZS` environment read the estimate used —
 * a variable that was never set on Railway (checked 2026-10-06 with `railway variables`, names only), so officers saw no
 * price at all. From this unit the estimate reads the price here (default TZS 6, G9), and still prefers a price MEASURED
 * from our own delivered sends.
 *
 * ⛔ THE ROW IS REPLACED WHOLE, NEVER SPREAD OVER (`mergeWhole`) — U33a §5's lesson: the factory's default merge is a
 * shallow spread, and a record the server rebuilds field by field must never keep a field the save did not write.
 *
 * ⛔ A ROW THIS PROCESS CANNOT READ IN FULL REFUSES EVERY SAVE (`unreadable`). The row reader (`readSettingsRow`, the
 * factory's `migrate`) keeps each field it can read and notes each it had to drop, filling those from the defaults so a
 * figure SHOWN is never blank — but a save writes the WHOLE record, and saving over a row we could not read would quietly
 * replace what the owner stored with defaults. A window is kept or dropped as a PAIR: a stored start beside a default end
 * could make a window nobody chose. ⛔ A caller that ACTS on a setting (the estimate, the confirmation, the engine) reads it
 * fresh (`reloadMarketingSmsSettings`) and refuses on `readable: false` — a default standing in for the owner's value is
 * never priced, confirmed or obeyed. Recovering such a row is a developer's job (the card says so).
 *
 * ⛔ A STALE PAGE IS REFUSED (`stale`): the form posts the fingerprint of the values it was rendered from
 * (`settingsFingerprint`), and a save whose fingerprint is not the record's NOW writes nothing (U33w's m1).
 *
 * ⚠️ KNOWN GAPS, recorded rather than hidden (the U49s review): (1) inherited from every `defineConfig` record (the U33w
 * review's m5), the factory's own `config.marketing_sms_settings_updated` ADMIN row is fire-and-forget — the WRITE is
 * verified (read back before it is believed), its audit row is not; (2) the stale check is check-then-write, so two owners
 * saving in the same instant can both pass it — the second save wins whole and both are audited (one owner account today);
 * (3) the U13 review's SP-3: a row whose stored JSON value is itself `null`, `false`, `0` or `""` (only an out-of-band
 * write could leave one — no writer here stores a non-object) reads as NO ROW, so the default hours are obeyed rather than
 * the closed window an unreadable row gives (`liveSendWindow`); the store does not yet tell "a row exists with a
 * non-object value" from "no row" (`loadConfigResult`'s `value`). The defaults are the documented rule (OQ5), never a
 * money or audience widening, so this is recorded, not fixed here.
 *
 * Guard: `npm run test:marketing-settings` (S8 · S9 · S10 drive THIS file through `__marketingSmsSettingsForTest`).
 */
import { defineConfig } from "../define-config";
import { smsBalanceThresholds } from "../sms";
import {
  MARKETING_SMS_SETTINGS_DEFAULTS, SETTINGS_FIELDS, marketingSmsSettingsProblems, settingsFingerprint,
  type MarketingSmsSettings, type SettingsField,
} from "@/lib/marketing/sms-settings";
import { namesATime, timesNamedIn } from "@/lib/legal/kept-promises";
import type { PublishedPolicyTexts } from "../legal/policy-lines";

/** The SystemConfig key. */
export const MARKETING_SMS_SETTINGS_KEY = "marketing.sms.settings";

/** The factory's ADMIN audit row for every save (spec §4.3 "Audit rows"): `{ before, after, changes }`. */
export const MARKETING_SMS_SETTINGS_AUDIT = { action: "config.marketing_sms_settings_updated", targetType: "MARKETING_SMS_SETTINGS" } as const;

/** Why a save was refused. Every refusal writes nothing and makes no audit row. */
export type SettingsRefusal =
  | "no_officer" | "not_understood" | "invalid" | "stale" | "unreadable" | "published_hours" | "published_unread" | "not_saved";

/** The console's sentence for each refusal (spec §4.3; `invalid` is the headline — each box carries its own problem). */
export const SETTINGS_REFUSAL_SENTENCE: Readonly<Record<Exclude<SettingsRefusal, "not_saved">, string>> = Object.freeze({
  no_officer: "Sign in again to change the Marketing SMS settings.",
  not_understood: "That save wasn't understood — reload the page and try again.",
  invalid: "Some settings can't be saved yet — each problem is shown under its box.",
  stale: "These settings were changed by someone else since you opened the page — reload, then save again.",
  unreadable: "The saved settings couldn't be read in full, so nothing was saved — reload the page.",
  published_hours: "The responsible-gambling page's marketing line names a time these hours would no longer keep, so nothing was saved — remove that time from the line on the Policy lines card first, then save the hours.",
  published_unread: "The public policy lines couldn't be read just now, so new hours weren't saved — try again in a moment.",
});

export type SettingsSaveResult =
  | { ok: true; value: MarketingSmsSettings; changed: SettingsField[] }
  | { ok: false; reason: SettingsRefusal; error: string; problems?: Partial<Record<SettingsField, string>> };

/** A fresh read: the record as the row holds it now, whether a row exists, and whether it could be read in full. */
export type SettingsReload =
  | { ok: true; settings: MarketingSmsSettings; stored: boolean; readable: boolean }
  | { ok: false; error: string };

/** What the row reader made of a stored row: the fields it could read, and every field (or `v`) it had to drop. */
export type SettingsRowReading = { settings: Partial<MarketingSmsSettings>; dropped: string[] };

/**
 * ⭐ THE ROW READER — every stored row is read through here (the factory's `migrate`). A row in another shape (`v` is not
 * 1) or holding a key this version does not know is read as far as it can be and its gaps NOTED; a field that breaks its
 * own bound is dropped to its default. The platform floor is NOT applied when reading: it may have risen since the save,
 * and the rail holds its own floor regardless — refusing to read a once-valid reserve would change the money silently.
 */
export function readSettingsRow(persisted: Record<string, unknown>): SettingsRowReading {
  const dropped: string[] = [];
  if (persisted.v !== 1) dropped.push("v");
  for (const k of Object.keys(persisted)) {
    if (k !== "v" && !(SETTINGS_FIELDS as readonly string[]).includes(k)) dropped.push(k);
  }
  const judged = marketingSmsSettingsProblems(persisted, 0);
  if (judged.ok) return { settings: judged.value, dropped };
  const bad = new Set(Object.keys(judged.problems) as SettingsField[]);
  // ⛔ The window is one decision: if either end cannot be read, both fall back together.
  if (bad.has("windowStartMinute") || bad.has("windowEndMinute")) {
    bad.add("windowStartMinute");
    bad.add("windowEndMinute");
  }
  const settings: Partial<MarketingSmsSettings> = {};
  for (const f of SETTINGS_FIELDS) {
    if (bad.has(f)) { dropped.push(f); continue; }
    const value = persisted[f];
    if (typeof value === "number") settings[f] = value;
    else dropped.push(f);
  }
  return { settings, dropped };
}

/** The record is replaced whole: the save hands the factory a complete, judged record. */
const mergeWhole = (_current: MarketingSmsSettings, next: MarketingSmsSettings): MarketingSmsSettings => ({ ...next });

/** The factory's guard on anything it is asked to store: exactly the shape, every field inside its bound (floor 0). */
function shapeProblem(c: MarketingSmsSettings): string | null {
  const keys = Object.keys(c).sort().join(",");
  const want = ["v", ...SETTINGS_FIELDS].sort().join(",");
  if (keys !== want || c.v !== 1) return "The settings are not in the shape this version stores.";
  const judged = marketingSmsSettingsProblems(c, 0);
  return judged.ok ? null : Object.values(judged.problems)[0] ?? "The settings are not valid.";
}

/** What a save request must be: the five boxes and the page's fingerprint, each once — nothing else. */
const REQUEST_KEYS: readonly string[] = [...SETTINGS_FIELDS, "base"];

function readRequest(input: unknown): { ok: true; fields: Record<string, unknown>; base: string } | { ok: false } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return { ok: false };
  const o = input as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!REQUEST_KEYS.includes(k)) return { ok: false };
  if (typeof o.base !== "string" || o.base.trim() === "") return { ok: false };
  const fields: Record<string, unknown> = {};
  for (const f of SETTINGS_FIELDS) {
    const v = o[f];
    // A box's text or a number; anything else (an object, an array, a file) is a request no card sends.
    if (v !== undefined && typeof v !== "string" && typeof v !== "number") return { ok: false };
    fields[f] = v;
  }
  return { ok: true, fields, base: o.base.trim() };
}

const sameSettings = (a: MarketingSmsSettings, b: MarketingSmsSettings): boolean =>
  settingsFingerprint(a) === settingsFingerprint(b);

type FactoryDeps = Parameters<typeof defineConfig>[0]["deps"];

export type SettingsStore = {
  get: () => MarketingSmsSettings;
  reload: () => Promise<SettingsReload>;
  save: (input: unknown, officerId: string) => Promise<SettingsSaveResult>;
};

type StoreOptions = {
  key: string;
  /** The platform's SMS floor — the least the credit kept for codes may be. Default: `smsBalanceThresholds().floorTzs`. */
  floorTzs?: () => number;
  /** ⚠️ Test seam: a merge other than the whole-replace (the shallow-spread plant). */
  merge?: (current: MarketingSmsSettings, next: MarketingSmsSettings) => MarketingSmsSettings;
  /** ⚠️ Test seam: a row reader other than `readSettingsRow` (the "reads everything, notes nothing" plant). */
  readRow?: (persisted: Record<string, unknown>) => SettingsRowReading;
  factoryDeps?: FactoryDeps;
  /** ⚠️ Test seam: what the public pages print from the policy lines (U13 · R1) — the live fresh read unless a suite
   *  hands in its own. */
  published?: () => Promise<PublishedPolicyTexts>;
};

/** The live read of the published policy lines — loaded on first use, never at import (the legal pages import neither). */
async function livePublishedTexts(): Promise<PublishedPolicyTexts> {
  try {
    const { publishedPolicyTexts } = await import("../legal/policy-lines");
    return await publishedPolicyTexts();
  } catch {
    return { ok: false };
  }
}

/**
 * ⛔ U13 · R1 (S13's ruling) · A PUBLISHED PROMISE HOLDS THE HOURS. A policy line may name the send window's opening or
 * closing time (the policy-lines save holds it to them); a change to the hours that would leave a printed time unkept is
 * refused until the line is re-worded first. Every time each printed text names (`timesNamedIn`) must be the NEW window's
 * opening or closing time; a time the clock patterns spot but cannot value is refused, never let through. Null when
 * nothing printed names a time these hours drop; otherwise the times, as the lines say them.
 */
export function hoursDroppedByPublished(texts: readonly string[], next: { windowStartMinute: number; windowEndMinute: number }): string[] | null {
  const edges = [next.windowStartMinute, next.windowEndMinute];
  const off: string[] = [];
  for (const text of texts) {
    const named = timesNamedIn(text);
    if (named.length === 0) {
      if (namesATime(text)) off.push("a time it names");
      continue;
    }
    for (const n of named) if (n.minutes.length === 0 || !n.minutes.every((m) => edges.includes(m))) off.push(n.said);
  }
  return off.length === 0 ? null : [...new Set(off)];
}

/**
 * ⭐ ONE BUILDER, TWO INSTANCES — the live record and the test seam are both made here, so a protection added here is
 * driven by `test:marketing-settings` by construction (the `support-config.ts` lesson).
 */
function makeStore(o: StoreOptions): SettingsStore {
  const seen: { dropped: string[] } = { dropped: [] };
  const floor = o.floorTzs ?? (() => smsBalanceThresholds().floorTzs);
  const cfg = defineConfig<MarketingSmsSettings, MarketingSmsSettings>({
    key: o.key,
    defaults: { ...MARKETING_SMS_SETTINGS_DEFAULTS },
    validate: (c) => {
      const problem = shapeProblem(c);
      return problem === null ? { ok: true } : { ok: false, reason: problem };
    },
    migrate: (persisted: Record<string, unknown>): Partial<MarketingSmsSettings> => {
      const reading = (o.readRow ?? readSettingsRow)(persisted);
      seen.dropped = reading.dropped;
      return reading.settings;
    },
    merge: o.merge ?? mergeWhole,
    audit: MARKETING_SMS_SETTINGS_AUDIT,
    deps: o.factoryDeps,
  });

  const get = (): MarketingSmsSettings => cfg.get();

  const reload = async (): Promise<SettingsReload> => {
    const r = await cfg.reload();
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, settings: r.config, stored: r.stored, readable: !(r.stored && seen.dropped.length > 0) };
  };

  const refusal = (reason: Exclude<SettingsRefusal, "not_saved" | "invalid">): SettingsSaveResult =>
    ({ ok: false, reason, error: SETTINGS_REFUSAL_SENTENCE[reason] });

  const save = async (input: unknown, officerId: string): Promise<SettingsSaveResult> => {
    // The server sets the author from the session, never from the request.
    if (typeof officerId !== "string" || officerId.trim() === "") return refusal("no_officer");
    const request = readRequest(input);
    if (!request.ok) return refusal("not_understood");
    // ⭐ Every problem at once, each against its own box — the same rule the card ran.
    const judged = marketingSmsSettingsProblems(request.fields, floor());
    if (!judged.ok) return { ok: false, reason: "invalid", error: SETTINGS_REFUSAL_SENTENCE.invalid, problems: judged.problems };
    // ⛔ Judged against the row AS IT IS NOW — a save another instance made since this one booted is never overwritten.
    const fresh = await cfg.reload();
    if (!fresh.ok) return refusal("unreadable");
    if (fresh.stored && seen.dropped.length > 0) return refusal("unreadable");
    if (request.base !== settingsFingerprint(fresh.config)) return refusal("stale");
    // ⛔ U13 · R1 · new hours are held to every time the public pages print — read fresh, failing closed.
    if (judged.value.windowStartMinute !== fresh.config.windowStartMinute || judged.value.windowEndMinute !== fresh.config.windowEndMinute) {
      const published = await (o.published ?? livePublishedTexts)();
      if (!published.ok) return refusal("published_unread");
      const dropped = hoursDroppedByPublished(published.texts, judged.value);
      if (dropped !== null) {
        return { ok: false, reason: "published_hours", error: `${SETTINGS_REFUSAL_SENTENCE.published_hours} It names: ${dropped.join(", ")}.` };
      }
    }
    // Nothing moved: nothing is written and nothing is audited.
    if (sameSettings(judged.value, fresh.config)) return { ok: true, value: fresh.config, changed: [] };
    const res = await cfg.setVerified(judged.value, officerId);
    if (!res.ok) return { ok: false, reason: "not_saved", error: res.error };
    const changed = SETTINGS_FIELDS.filter((f) => fresh.config[f] !== res.config[f]);
    return { ok: true, value: res.config, changed };
  };

  return { get, reload, save };
}

const live = makeStore({ key: MARKETING_SMS_SETTINGS_KEY });

/** ⭐ The settings as this process holds them — sync, cached. For a figure SHOWN (the card, the estimate). */
export function marketingSmsSettings(): MarketingSmsSettings {
  return live.get();
}

/**
 * ⭐ Re-read the row and replace the cache, then answer — for a caller that ACTS on a setting (the engine, once per
 * slice; the confirmation; Start). ⛔ `ok: false` (the read could not answer) and `readable: false` (a row it could not
 * read in full) are the caller's to refuse on — never a cue to act on the cached value.
 * (Spec §4.3 named it `Promise<MarketingSmsSettings>`; it answers whether the read landed instead, so no caller can act
 * on a stale or half-read value without seeing that it is one.)
 */
export function reloadMarketingSmsSettings(): Promise<SettingsReload> {
  return live.reload();
}

/** ⛔ THE ONE WRITER — the "Marketing SMS" tab's action is its only caller (`test:marketing-settings` S7). */
export function saveMarketingSmsSettings(input: unknown, officerId: string): Promise<SettingsSaveResult> {
  return live.save(input, officerId);
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code.
 *
 * A SECOND instance built by the same `makeStore`, so `test:marketing-settings` drives the code that ships (the row reader,
 * the whole-replace merge, the stale and unreadable refusals, the factory's read-back) against an in-memory row.
 */
export function __marketingSmsSettingsForTest(opts: Omit<StoreOptions, "key"> = {}): SettingsStore {
  return makeStore({ key: `${MARKETING_SMS_SETTINGS_KEY}.__test__${Math.random().toString(36).slice(2)}`, ...opts });
}
