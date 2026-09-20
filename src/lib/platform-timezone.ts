/**
 * THE PLATFORM TIMEZONE, ON THE CLIENT-SAFE SIDE OF THE FENCE (L17, ruling 526).
 *
 * ⛔ WHY THIS FILE EXISTS AT ALL. `src/lib/utils.ts` is imported by 216 files, many of them `"use client"`
 * components, and it imported `getPlatformTimezone` from `@/lib/server/platform-config`. That module imports
 * `./config-store`, which imports `./prisma` (`config-store.ts:11`), as does `./audit` (`audit.ts:40`). So the
 * dependency graph ran from a client component all the way to the Prisma client, and the ONLY thing keeping every
 * model name out of a public chunk was the bundler's tree-shaking — a property of the build, not of the source.
 *
 * ⭐ AND THE GUARD THAT WOULD CATCH IT RUNS TOO RARELY TO DEFEND IT. `verify:house-bot-bundle` inspects the real
 * built artefact, but only at a commit close and at REL-0. A single refactor of `utils.ts` between two closes —
 * anything that defeats tree-shaking, a re-export, a side-effecting import — ships the model names to every
 * browser and nothing goes red until the next close. Ruling 526's words: "a latent disclosure whose only defence
 * is a bundler's current behaviour is not defended."
 *
 * ⛔ THE FUNCTION NEVER NEEDED THE SERVER. It reads a global, then an env var, then a constant. No database, no
 * await, no import. It was server-side only because of where it was written, and that accident is what dragged
 * Prisma into the client graph. Moving it costs nothing and removes the chain entirely.
 *
 * ⚠️ BEHAVIOUR IS BYTE-IDENTICAL, deliberately: the same three fallbacks in the same order. `@/lib/server/platform-config`
 * re-exports this so every existing server caller keeps working and there is one implementation, not two that can drift.
 */

/**
 * ⛔ THE GLOBAL IS READ, NOT RE-DECLARED. `platform-config.ts:44` already declares
 * `__50PICK_PLATFORM_CONFIG` as `PlatformConfig | undefined`, and a second `declare global` here with a narrower
 * shape is a compile error (TS2403) — which is how the first version of this file failed, correctly. Narrowing it
 * locally reads the one field this module needs without asserting anything about the rest, and without importing
 * the server type that this file exists to stay away from.
 */
const platformConfigGlobal = () =>
  (globalThis as { __50PICK_PLATFORM_CONFIG?: { timezone?: string } }).__50PICK_PLATFORM_CONFIG;

/** Tanzania (EAT, UTC+3) — the platform's home market, and the value every date falls back to. */
export const DEFAULT_PLATFORM_TIMEZONE = "Africa/Dar_es_Salaam";

/**
 * Synchronous read of the admin-configured timezone. Returns the cached value once the server has hydrated it,
 * the env override if set, and the default otherwise.
 *
 * ⚠️ On the CLIENT the global is never hydrated, so this resolves to the env value inlined at build time or the
 * default. That is exactly what it did before this file existed — the import crossed the fence but the value did
 * not — so no rendered date changes.
 */
export function getPlatformTimezone(): string {
  return platformConfigGlobal()?.timezone
    ?? process.env.PLATFORM_TIMEZONE
    ?? DEFAULT_PLATFORM_TIMEZONE;
}
