/**
 * C2 SECOND TRANCHE · THE BANNER CHANNEL — a refusal that travels on the query string.
 *
 * ⛔ THE CHANNEL NOTHING WAS SCANNING. `test:failure-reasons` §10 reports **0** raw server
 * strings in front of a player, and that is true of the channel it scans and only that one:
 * its pattern matches an object PROPERTY (`title: r.error`), i.e. a toast or modal argument.
 * A form-action page does not report that way — it `redirect(...?error=<the server's English
 * sentence>)` and the server component renders `{sp.error}` as JSX TEXT. That form matched
 * nothing, so the whole channel sat outside the denominator, and five surfaces — one of them
 * the responsible-gambling console — showed a Swahili or Chinese player sentences like
 * *"Invalid value for dailyLossLimit."*
 *
 * ⭐ A REDIRECT CAN ONLY CARRY A STRING, SO CARRY THE REASON KEY, NOT THE PROSE. The page then
 * renders it through `renderFailure` — the SAME registry, the same copy and the same severity
 * every toast and modal already uses. ⛔ This is deliberately not a second renderer: the pure
 * function is imported, not forked, so a reason cannot say one thing in a toast and another in
 * a banner.
 *
 * 🔴 AND IT CLOSES A REFLECTION HOLE THAT HAD NOTHING TO DO WITH LANGUAGE. `?error=` rendered
 * whatever the query string said, so ANY text could be put in front of a signed-in player by
 * handing them a link:
 *
 *     /profile/account?error=Your%20account%20is%20suspended.%20Call%20%2B255...
 *
 * React escapes it, so it was never script injection — it was worse in the way that matters
 * on a licensed money platform: a plausible, styled, first-party alert box saying anything an
 * attacker chose, on the operator's own domain. Keying the channel closes it by construction —
 * an unrecognised `?reason=` renders NOTHING rather than echoing itself.
 */
import { renderFailure, hasReason, reasonForCode, type FailureReason, type FailureDetail } from "@/lib/failure-reasons";
import { formatTzs } from "@/lib/utils";

/**
 * The key a form action puts on the query string for a service refusal.
 *
 * ⭐ THIS IS WHAT MAKES THE CHANNEL CONVERTIBLE. Without a total function here, every action
 * would need a prose fallback for refusals the registry does not classify — and one prose
 * fallback anywhere keeps `{sp.error}` in the tree, so the ratchet could never reach zero.
 * Order matters: an explicit reason beats a code, and a code beats nothing.
 */
export function reasonKeyFor(r: { reason?: string; code?: string } | null | undefined): FailureReason {
  if (hasReason(r)) return r.reason;
  return reasonForCode(r?.code) ?? "unknown_failure";
}

/** What a banner needs to paint itself: the localized sentence and how loud to be. */
export interface FailureBanner {
  body: string;
  /** Maps `Severity` onto the kit's `CalloutTone`. */
  tone: "danger" | "warning" | "info";
}

/**
 * Resolve a `?reason=` query parameter into a localized banner, or `null`.
 *
 * @param reason the raw query-string value — untrusted, and validated against the registry.
 * @param dict   the player's `t.error` block.
 * @param detail figures the page recovered from its own numeric query params, as NUMBERS.
 */
export function bannerFor(
  reason: string | string[] | undefined,
  dict: Record<string, string>,
  detail?: FailureDetail,
): FailureBanner | null {
  const key = Array.isArray(reason) ? reason[0] : reason;
  // ⛔ VALIDATE BEFORE RENDERING, NOT AFTER. `renderFailure` falls back to the caller's generic
  // line for an unknown reason, which would turn a nonsense query param into a real-looking
  // error box. A key this registry does not know is not a refusal — it is noise, and the
  // honest response is to render no banner at all.
  if (!hasReason({ reason: key })) return null;
  const r = renderFailure(
    { ok: false, error: "", reason: key as FailureReason, detail },
    dict,
    "",
    formatTzs,
  );
  return { body: r.body, tone: r.severity === "error" ? "danger" : r.severity === "warning" ? "warning" : "info" };
}

/**
 * Read a numeric query param for a `detail` figure.
 *
 * ⛔ THE FIGURES STAY NUMBERS ALL THE WAY. The defect this tranche retires is `tzsFigures`,
 * which recovered money amounts by running a regex over an English sentence. Putting the
 * figure back into prose to cross the redirect and parsing it out again on the other side
 * would be the same mistake wearing a query string.
 */
export function numParam(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
