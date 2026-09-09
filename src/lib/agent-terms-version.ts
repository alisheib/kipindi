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
 * ⚠️ Applications stamped `2026-09-07` **after** `cc946bbb` deployed were shown the 09-08
 * text. That is a production-data question, not a code one — see `docs/RULES.md` §2.10.
 */
export const AGENT_TERMS_VERSION = "2026-09-08";
