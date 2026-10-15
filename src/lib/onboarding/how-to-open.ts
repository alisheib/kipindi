/**
 * WHEN HOW TO PLAY OPENS BY ITSELF — the one decision the How-to host asks, once per landing (the Vodacom plan S11 WP4;
 * VODACOM-PLAN §3.8 "Auto-open"; `S11-PLAN.md` WP4 step 1 and Open points 6-11).
 *
 * ⭐ PURE: no directive, and its only import is `primer-keys.ts` (pure too), so the host, `test:howto` and the graph walker
 * all read it as it is. The host gathers the facts in the browser (the address, the seen key, the open dialogs, the
 * automation test) and hands them in; nothing here touches a browser global.
 *
 * THE RULES, IN THIS ORDER — the first that applies decides:
 *   · ROUTE: only `/`, `/live`, `/results` and `/watchlist` (§3.8). Never a question, Up & Down, the wallet, the limits pages,
 *     Account, Help, sign-in or `/s`. HIDE_ON and SUPPRESS_ON (the primer's two rules) are tested after it anyway: they
 *     cannot match the four, and testing them keeps the host's parity with the primer pinned (`test:stacking` 8.6).
 *   · A BET LINK: `bet` or `side` anywhere in the address — that landing is a bet-intent moment and stays declined, the deep
 *     link included (Open point 9: a page that loads with either never auto-opens for the rest of its life).
 *   · ANOTHER DIALOG on screen at the decision — never over it, the deep link included (Open point 8: skipped, not retried).
 *   · A BREAK (`promoSuppressed`, decided on the server): nothing invites betting during a break (R4-I), the deep link
 *     included (Open point 11). The How-to card's own tap still opens the sheet then, as S8 WP9 kept the card.
 *   · THE DEEP LINK `?howto=1`: opens whatever the seen key or automation say (a campaign link is a request, Open point 11).
 *   · AUTOMATION, short of the explicit opt-in (`?primer=1` or `kp-primer-force`, Open point 6): never auto-opens.
 *   · SEEN, or storage that cannot say: never auto-opens (the primer's rule — a dismissal it could not remember).
 *   · Otherwise: it opens by itself.
 */
import { HIDE_ON, SUPPRESS_ON } from "./primer-keys";

/** The four routes it may open on by itself (VODACOM-PLAN §3.8). Exact paths: `/live/x` is not `/live`. */
export const HOWTO_ROUTES: readonly string[] = ["/", "/live", "/results", "/watchlist"];

/** The beat it waits after a landing before it decides — the first-visit primer's 700 ms (first-visit-primer.tsx). */
export const HOWTO_DELAY_MS = 700;

/** The address parameter of the deep link: `/?howto=1` (the canonical link; Open point 27). */
export const HOWTO_PARAM = "howto";

/** Why a landing opened the sheet, or why it did not — one word, so a drive and a test can name the rule that decided. */
export type HowToReason = "route" | "hidden" | "suppressed" | "bet-link" | "dialog" | "break" | "deep" | "automation" | "seen" | "auto";

export type HowToDecision = { open: "auto" | "deep" | null; reason: HowToReason };

/** The facts of one landing, as the host read them at the decision. */
export type HowToFacts = {
  /** The page's path, without its query. */
  pathname: string;
  /** The address's query (`?a=b…`, or empty). */
  search: string;
  /** `HOWTO_SEEN_KEY` reads "1" — or storage threw, which counts as seen (`seenOrUnreadable`). */
  seen: boolean;
  /** The reader is on a cooling-off or self-exclusion (AppShell's `promoSuppressed`). */
  onBreak: boolean;
  /** A modal dialog is on screen, or a layer is on the dialog stack. */
  dialogOpen: boolean;
  /** The browser is driven by automation (`automated`, primer-keys.ts). */
  automated: boolean;
  /** Automation asked for it (`primerForced`, primer-keys.ts). */
  forced: boolean;
};

/** Is this one of the four routes, and clear of the primer's two path rules? The host's render guard asks this too. */
export function howToRoute(pathname: string): boolean {
  return HOWTO_ROUTES.includes(pathname) && !HIDE_ON.test(pathname) && !SUPPRESS_ON.test(pathname);
}

export function howToDecision(f: HowToFacts): HowToDecision {
  if (!HOWTO_ROUTES.includes(f.pathname)) return { open: null, reason: "route" };
  if (HIDE_ON.test(f.pathname)) return { open: null, reason: "hidden" };
  if (SUPPRESS_ON.test(f.pathname)) return { open: null, reason: "suppressed" };
  const query = new URLSearchParams(f.search);
  if (query.has("bet") || query.has("side")) return { open: null, reason: "bet-link" };
  if (f.dialogOpen) return { open: null, reason: "dialog" };
  if (f.onBreak) return { open: null, reason: "break" };
  if (query.get(HOWTO_PARAM) === "1") return { open: "deep", reason: "deep" };
  if (f.automated && !f.forced) return { open: null, reason: "automation" };
  if (f.seen) return { open: null, reason: "seen" };
  return { open: "auto", reason: "auto" };
}

/**
 * The address once a deep link has opened the sheet: the same path, every other parameter kept in its order, `howto`
 * gone (all of its values), and the hash kept — so Back and a reload never open it again (WP4 step 4).
 */
export function withoutHowTo(pathname: string, search: string, hash: string): string {
  const query = new URLSearchParams(search);
  query.delete(HOWTO_PARAM);
  const rest = query.toString();
  return `${pathname}${rest ? `?${rest}` : ""}${hash}`;
}
