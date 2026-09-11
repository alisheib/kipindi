/**
 * The agent terms' version — ONE module, imported by the `/legal/agent-terms` page (which
 * prints it) AND by `submitForReview` (which stamps it on the application), so the version a
 * person read and the version recorded as accepted cannot diverge.
 *
 * ⛔ Bump it whenever the BINDING English text of `/legal/agent-terms` changes.
 *
 * 🔴 **AND IT WAS NOT BUMPED WHEN THE BINDING TEXT CHANGED — 2026-09-08, `cc946bbb`.**
 * That commit rewrote two clauses of the EN document this constant versions:
 *   §2 · the fee clause stopped saying "(VAT inclusive)" and now derives the treatment, so
 *        under management's flip to EXCLUSIVE it states a DIFFERENT price structure to the
 *        applicant — the net plus VAT on top, not a VAT-inclusive total.
 *   §3 · a clause that did not exist before: local withholding tax is deducted from the
 *        agent's commission and only the balance reaches their wallet. A new deduction on
 *        the counterparty's income, in the contract they are held to.
 * The constant went on reading `2026-09-07`, so an application submitted after that deploy
 * was stamped as having accepted a document that no longer existed. The whole reason this
 * module is shared by the page and the stamp is to make that impossible, and a stale value
 * defeats it just as completely as two separate constants would.
 *
 * ✅ **THAT PRODUCTION QUESTION IS NOW ANSWERED, AND THE ANSWER IS: NOTHING TO DO.** Read off
 * the live database 2026-09-09 — there is exactly ONE `AgentApplication`
 * (`agp_2031e6c2c4fd32545a18`, APPROVED), it accepted at **2026-09-07T13:05:49Z**, and
 * `cc946bbb` was authored 2026-09-08T02:37, nearly half a day LATER. The applicant was shown
 * `a783299f`'s text, which declared `2026-09-07`, and that is what the row records. The
 * acceptance record is accurate; no officer note and no rewrite are needed.
 * `MONEY-GATE-REMEDIATION.md` §7.2.
 *
 * 🔴 **BUMPED 2026-09-09 — the binding EN text moved again.** Ali set the registration fee
 * VAT-free (`feeVatRatePct` 18 → 0), and §2's fee clause is derived from the config: at a zero
 * rate the VAT parenthetical is now EMPTY where it previously read "(TZS 100,000 plus TZS
 * 18,000 VAT)". The price a signatory is quoted changed from 118,000 to 100,000, which is
 * exactly the kind of change this constant exists to version. `COMPLIANCE-DECISIONS.md`
 * § 2026-09-09.
 *
 * ⚠️ Nothing compares this to a stored value, so moving it forces NO re-acceptance. The one
 * existing row keeps `2026-09-07`, which is the correct record of what that person was shown.
 *
 * 🔴 **BUMPED 2026-09-11 — AND THIS TIME A CONTROL MAKES IT IMPOSSIBLE TO FORGET.** §2's fee
 * clause told every applicant, in all three locales, to *"pay the registration fee of TZS
 * 100,000 to Digital Selcom Bank, account 0769777877, uploading the receipt"* — measured on the
 * DEPLOYED page, not read from a brief. Under the wallet rail that is false, and false in the
 * most expensive place available: a person following the binding document wires 100,000 real
 * shillings to a bank account, and the wizard has no receipt upload left to record it with.
 *
 * ⭐ **THE INSTRUCTION ABOVE — "⛔ Bump it whenever the BINDING English text changes" — WAS
 * ALREADY IN THIS FILE ON 2026-09-08, AND THE BUMP WAS MISSED ANYWAY.** A note to a future
 * reader is not a control. `AGENT_TERMS_TEXT_SHA` now pins a hash of the binding bodies: the
 * text cannot move without the hash moving, and the hash cannot be updated without the editor
 * being in THIS file, with the version in front of them. `npm run test:agent-terms-binding` §3.
 */
export const AGENT_TERMS_VERSION = "2026-09-11";

/**
 * The first 12 hex of `sha256` over the whitespace-normalised binding bodies of
 * `/legal/agent-terms` — all three locales, extracted by `test:agent-terms-binding` §3.
 *
 * ⛔ **IT MOVES ONLY TOGETHER WITH `AGENT_TERMS_VERSION` ABOVE.** If §3.1 fails, do NOT paste
 * the new hash and move on: a failure means the binding text changed, which is exactly the
 * event the version exists to record. Change both, in one commit, or neither.
 */
export const AGENT_TERMS_TEXT_SHA = "3f81d40610a0";
