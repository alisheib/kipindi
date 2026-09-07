/**
 * The agent terms' version — ONE module, imported by the `/legal/agent-terms` page (which
 * prints it) AND by `submitForReview` (which stamps it on the application), so the version a
 * person read and the version recorded as accepted cannot diverge.
 *
 * ⛔ Bump it whenever the BINDING English text of `/legal/agent-terms` changes.
 */
export const AGENT_TERMS_VERSION = "2026-09-07";
