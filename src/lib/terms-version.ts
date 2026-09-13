/**
 * The player Terms' version — ONE module, imported by `/legal/terms` (which prints it) AND by
 * `auth-service.ts` (which stamps it on `User.acceptedTermsVersion` at registration), so the version
 * a person read and the version recorded as accepted cannot diverge.
 *
 * 🔴 **THEY DIVERGED TWICE, AND THE SECOND TIME IT WAS LIVE (found 2026-09-13, audit session 95).**
 * Until this module the page and the stamp were two separate string literals:
 *   · 2026-09-09 (`46ace149`) rewrote §4's cash-out clause and moved the STAMP to `2026-09-09`, while
 *     the page went on printing "Version 2026-09-07";
 *   · 2026-09-13 (`ac411357`, identity at withdrawal) moved the PAGE to "Version 2026-09-13" — §2, §3,
 *     the new §3a, and that evening §3 and §5 again — while the stamp went on reading `2026-09-09`.
 * So a player who registered after `1699c17a` went live (2026-09-13 17:12 UTC) was shown Terms
 * v2026-09-13, including §3a (what happens if we cannot verify you), and was recorded as having
 * accepted a text that no longer existed. The comment above the old constant said "MOVE THIS WHENEVER
 * THE BINDING TEXT MOVES, IN THE SAME COMMIT" — and a note to a future reader is not a control.
 * ⚠️ The rows already written are not rewritten (no hand-applied SQL): a `2026-09-09` stamp with
 * `acceptedTermsAt` at or after 2026-09-13 17:12 UTC, and before the deploy of this module, is a
 * player shown v2026-09-13 (`docs/COMPLIANCE-DECISIONS.md`, 2026-09-13 fourth).
 *
 * ⭐ `TERMS_TEXT_SHA` pins a hash of the binding bodies (`content()` in `/legal/terms/page.tsx`, all
 * three locales): the text cannot move without the hash moving, and the hash cannot be updated
 * without the editor being in THIS file, with the version in front of them. `npm run
 * test:terms-binding` — the same control `agent-terms-version.ts` carries for the agent terms.
 *
 * ⚠️ Nothing compares this to a stored value, so moving it forces NO re-acceptance. Existing rows keep
 * the version they were stamped with.
 *
 * ⛔ PURE AND IMPORT-FREE: a server component (the page) and a server service (auth) both read it.
 */
export const TERMS_VERSION = "2026-09-13";

/**
 * The first 12 hex of `sha256` over the whitespace-normalised `content()` bodies of `/legal/terms` — all three
 * locales — followed by `LEGAL_BINDING_LANGUAGE` (`src/app/legal/_components.tsx`, the "English is binding"
 * sentence the page renders above them), extracted by `test:terms-binding` §2.
 * ⚠️ NOT covered, by design: values filled in at runtime from officer config — the §6 objection window and the
 * dispute address. They are rebuilt for any date from the `config.*` audit trail.
 *
 * ⛔ **IT MOVES ONLY TOGETHER WITH `TERMS_VERSION` ABOVE.** If §2.1 fails, do NOT paste the new hash and
 * move on: a failure means the binding text changed, which is exactly the event the version exists to
 * record. Change both in one commit — or, for a same-day player-favourable amendment inside a version
 * published that day, record it in `COMPLIANCE-DECISIONS.md` and move only the hash.
 */
export const TERMS_TEXT_SHA = "1e3724ce5d00";
