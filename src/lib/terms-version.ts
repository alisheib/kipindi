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
 * ⛔ **MOVED TO 2026-09-14 (audit of the identity-at-withdrawal release) — the change is player-favourable.**
 *   · §2 no longer says a duplicate account "will be closed and balances forfeited per AML rules": a refusal because
 *     an identity is already used on another account now points to §3a, where an officer decides the balance and
 *     nothing closes or forfeits on its own.
 *   · §3a no longer says no money can be paid into or out of a refused account — settlements, void refunds and
 *     cash-outs still credit a frozen wallet (market-service.ts), and an officer's return pays out of it. It now names
 *     what stops (deposits, bets and withdrawals) and says bets already placed still settle into the account.
 *   · Riding in the same version: the §7 link's missing space (en, sw) and the Swahili §5/§6 body wording for
 *     settlement and resolution, aligned with the unchanged English.
 *   · Amended the same day, before the version was deployed (COMPLIANCE-DECISIONS.md 2026-09-14, amendment): §9 no
 *     longer refers disputes to a "Match Integrity Annex (B)" — no such document was ever published — in en, sw and
 *     zh. Translation and typography only, English words unchanged: zh §4 永不被动 became 分文不动 and YES/NO became
 *     是/否, zh §7 names the policy 负责任博彩, stray spaces after dashes in zh §3/§3a/§4, and the §5 cap is held on
 *     one line in all three languages.
 *
 * ⛔ **MOVED TO 2026-10-10 (owner ruling, Ali, 2026-10-10: a player verifies with typed details and no photographs;
 * an agent applicant keeps photographs and a selfie) — the change is player-favourable.**
 *   · §3 says what a player gives: the details of one document — its number, its expiry date where it has one, the
 *     full name as printed — with the date of birth on the account. "Photographic evidence" is gone; a request after
 *     that is a correction of those details; an agent applicant verifies with photographs and a selfie, and the Agent
 *     Terms (unchanged) carry the rest of the application. §3's anti-money-laundering paragraph asks for a
 *     source-of-funds declaration only: no screen asks for the "proof of address" it named.
 *   · §3a no longer lists "an unclear photo" among the reasons a player can fix (no new refusal uses it).
 *   · Nothing more is asked of anyone, so NO 14-day §10 notice (the 2026-09-13 and 2026-09-14 precedent) and no
 *     re-acceptance (below). `docs/COMPLIANCE-DECISIONS.md` 2026-10-10 records it.
 *   · §3's FIRST sentence is byte for byte what it was: `red:kyc-copy-truth` plants its regression there.
 *
 * ⛔ **MOVED TO 2026-10-14 (S12 WP2) — Swahili spelling and grammar only; the English, the Chinese and every right are
 * unchanged.**
 *   · §4 spelt the side "NDIYO" where every screen says "NDIO" (`common.yes`): "Madau yote — NDIO na HAPANA —
 *     yanakusanywa kwenye bwawa moja."
 *   · "dau" takes its class-6 plural, "madau", where the Swahili gave it class-10 agreement (S4-COPY-AUDIT review 2's
 *     rule): §3a "Madau yaliyokwisha kuwekwa … yanayotokana nayo"; §4 "Madau ya upande ulioshinda yanarudishwa yote na
 *     hayaguswi kamwe" and "Kama madau yote yako upande mmoja"; §6 "Madau yanaweza kufutwa".
 *   · Nothing is asked of anyone and nothing a player may do moved, so no 14-day §10 notice and no re-acceptance
 *     (below). Correcting now rather than with S11's flip-time version is S12-PLAN's Point for Ali 6 — accepted by
 *     Ali, 2026-10-14. Its COMPLIANCE-DECISIONS entry is filed with the release.
 *
 * ⛔ **2026-10-23 · A SECOND RENDERING, ABOVE THE MILLIONEA CEILING — `TERMS_VERSION_WITH_MILLIONEA` (MASWALI-BUILD
 * S6-INT; OD-18; the lead's order of 2026-10-23).** Maswali Millionea went ACTIVE in production on 2026-10-22 at 23:32 UTC,
 * so §4 gains the one paragraph OD-18 planned for the launch: Maswali Millionea is not a price-competition market; a
 * ticket is bought and settled under its own binding rules (/legal/rules/millionea), as published when it is bought; §4's
 * statements about the commission, a winning bet never paid less than it staked, one-sided markets and cash-out do not
 * apply to a ticket, and the rest of these terms do. It is drawn inside `MillioneaWording`: it prints — and with it this
 * version — only while the server's ceiling admits the product (`millioneaWordingPublished`), as the privacy notice's
 * Millionea paragraph does. Below the ceiling the page is `TERMS_VERSION`'s text, byte for byte: nothing anyone accepted
 * moves, and a Yes/No or Up & Down player's terms read as before.
 *   · No 14-day §10 notice and no re-acceptance: no right anyone holds, and nothing anyone may do, changes — the paragraph
 *     tells a new product's buyers which rules bind their ticket. COMPLIANCE-DECISIONS § "2026-10-23 · Terms
 *     v2026-10-23 …" records it, for Ali's confirmation. The Swahili and the Chinese await their native reading.
 *
 * ⭐ THE HASHES. `TERMS_TEXT_SHA` pins the binding bodies (`content()` in `/legal/terms/page.tsx`, all three locales) AS
 * THEY PRINT BELOW THE CEILING — every `MillioneaWording` wrapper removed with its children — and
 * `TERMS_TEXT_SHA_WITH_MILLIONEA` the bodies as they print above it (the wrappers' tags removed), each followed by
 * `LEGAL_BINDING_LANGUAGE`: the text cannot move without a hash moving, and a hash cannot be updated without the editor
 * being in THIS file, with that rendering's version in front of them. `npm run test:terms-binding` — the same control
 * `agent-terms-version.ts` carries for the agent terms; both renderings read through `scripts/lib/millionea-wording-source.mts`.
 *
 * ⚠️ Nothing compares this to a stored value, so moving it forces NO re-acceptance. Existing rows keep
 * the version they were stamped with.
 *
 * ⛔ PURE AND IMPORT-FREE: a server component (the page) and a server service (auth) both read it. The ceiling is asked
 *    by the caller (`termsVersionFor(millioneaWordingPublished())`), never here.
 */
export const TERMS_VERSION = "2026-10-14";

/** The version of the Terms as they print above the Millionea ceiling: §4 with its Maswali Millionea paragraph. */
export const TERMS_VERSION_WITH_MILLIONEA = "2026-10-23";

/** The version a reader is shown, and registration stamps: the rendering the server's ceiling draws. */
export function termsVersionFor(millioneaPublished: boolean): string {
  return millioneaPublished ? TERMS_VERSION_WITH_MILLIONEA : TERMS_VERSION;
}

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
// 2026-10-14 · re-pinned WITH `TERMS_VERSION` 2026-10-14 (S12 WP2: the Swahili side word and "madau" — §3a, §4, §6),
// measured by `test:terms-binding` §2 over the new binding text (was 06208a18691e at 2026-10-10).
// 2026-10-23 · unchanged, and now the rendering below the Millionea ceiling: the wrapped §4 paragraph removed, the bodies
// hash exactly as v2026-10-14's (`test:terms-binding` 2.1).
export const TERMS_TEXT_SHA = "bba4158e18c2";

/** The same hash over the bodies as they print above the Millionea ceiling (the wrappers' tags removed). It moves only
 *  together with `TERMS_VERSION_WITH_MILLIONEA`, as `TERMS_TEXT_SHA` does with `TERMS_VERSION`. */
// 2026-10-23 · first pinned WITH `TERMS_VERSION_WITH_MILLIONEA` 2026-10-23: §4's Maswali Millionea paragraph (OD-18).
export const TERMS_TEXT_SHA_WITH_MILLIONEA = "219c1dbcfa07";
