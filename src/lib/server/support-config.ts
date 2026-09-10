/**
 * Support contact — the SERVER half: the reader E-226 said this config never had.
 *
 * 🔴 THE DEFECT. `SUPPORT_CONFIG_KEY` appeared three times in `src/`: a definition, an
 * import, and a WRITE. There was no reader anywhere, so the module cache started from
 * `DEFAULTS` in every process and all 21 surfaces rendered the fallbacks — including the
 * four statutory pages a Board reviewer opens first. Two code comments asserted a boot
 * hydration in `boot-checks.ts`, and one of them had been written AS THE FIX FOR THIS BUG;
 * `grep -n support src/lib/server/boot-checks.ts` returned nothing at all.
 *
 * Measured on production 2026-09-10, three weeks after filing: the saved row read
 * `msaada@50pick.tz` / `+255769777877`; `GET /help` served `support@50pick.tz` six times
 * and `+255 22 211 5811` four times. Five of five values wrong. An operator had saved the
 * form twice — 2026-08-19 and again 2026-09-08 — which is what noticing-and-retrying looks
 * like from the outside.
 *
 * ⭐ THE FIX IS A PORT, NOT A DESIGN. `define-config.ts` is the ONE factory: a globalThis
 * cache that survives hot-reloads, eager hydration that closes its gate only on a read that
 * ANSWERED, a sync `get()` that re-arms a failed hydration, and a `set()` that refuses to
 * persist from a de-hydrated process rather than overwriting a good row with code defaults.
 * Support-config simply never adopted it. Six configs already had.
 *
 * ⛔ THE HELPLINE IS NOT HERE, AND ITS ABSENCE IS THE POINT — see `@/lib/support-config`.
 * It is a pinned constant, so no persisted row and no admin form can move it.
 */
import { defineConfig } from "./define-config";
import { SUPPORT_CONFIG_KEY, SUPPORT_DEFAULTS, type SupportConfig } from "../support-config";

export { HELPLINE, HELPLINE_TEL, LICENCE_NUMBER, SUPPORT_CONFIG_KEY, type SupportConfig } from "../support-config";

/**
 * The persisted row predates the split and still carries `helpline` / `helplineTel`.
 * `defineConfig` merges `{ ...defaults, ...restored }`, so without this those two keys would
 * ride back into the live config object — inert today, but they are exactly the values E-328
 * exists to keep away from a player, and a later `set()` would write them out again. Drop
 * them on the way in: hydration takes the three fields it owns and nothing else.
 */
const migrate = (persisted: Record<string, unknown>): Partial<SupportConfig> => {
  const out: Partial<SupportConfig> = {};
  if (typeof persisted.email === "string") out.email = persisted.email;
  if (typeof persisted.phone === "string") out.phone = persisted.phone;
  if (typeof persisted.phoneTel === "string") out.phoneTel = persisted.phoneTel;
  return out;
};

const cfg = defineConfig<SupportConfig>({
  key: SUPPORT_CONFIG_KEY,
  defaults: SUPPORT_DEFAULTS,
  migrate,
  audit: { action: "config.support_updated", targetType: "SUPPORT_CONFIG" },
});

export function getSupportConfig(): SupportConfig {
  return cfg.get();
}

/** Officer save. Returns the factory's discriminated result — a de-hydrated process is
 *  REFUSED here rather than silently persisting defaults over the operator's row. */
export function setSupportConfig(patch: Partial<SupportConfig>, officerId: string) {
  const clean: Partial<SupportConfig> = {};
  if (patch.email !== undefined) clean.email = patch.email.trim();
  if (patch.phone !== undefined) clean.phone = patch.phone.trim();
  if (patch.phoneTel !== undefined) clean.phoneTel = patch.phoneTel.replace(/\s/g, "");
  return cfg.set(clean, officerId);
}

// Convenience getters — use these in server components and server-side modules.
export function SUPPORT_EMAIL() { return cfg.get().email; }
export function SUPPORT_PHONE() { return cfg.get().phone; }
export function SUPPORT_PHONE_TEL() { return cfg.get().phoneTel; }

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code.
 *
 * Builds a SECOND instance of the real factory against an injected store, so
 * `test:support-contact` can prove that a persisted row actually reaches the readers.
 * Without it §1 could only assert that a reader EXISTS, which is the assertion the two
 * false code comments already made for three weeks.
 */
export function __defineSupportConfigForTest(deps: Parameters<typeof defineConfig>[0]["deps"]) {
  return defineConfig<SupportConfig>({
    key: `${SUPPORT_CONFIG_KEY}.__test__${Math.random().toString(36).slice(2)}`,
    defaults: SUPPORT_DEFAULTS,
    migrate,
    deps,
  });
}
