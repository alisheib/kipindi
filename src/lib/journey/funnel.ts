/**
 * THE JOURNEY FUNNEL — what is counted, in ONE allow-list (the Vodacom plan S3b, `docs/VODACOM-PLAN.md` §3.10 and
 * §0f). Client-safe and pure: the beacon builds its body with it, `POST /api/funnel` re-checks every body against it,
 * and the server counters use the same names.
 *
 * ⛔ A FUNNEL EVENT CARRIES NO IDENTIFIER. Five short tags — the step, where it came from, which journey (old/new),
 * and the visit's first-touch campaign tags — and nothing that could single a person out: no user, no session, no
 * market, no amount, no path. They become daily totals (`JourneyFunnelDay`) and nothing else.
 *
 * ⭐ THE SAME STEPS FOR BOTH JOURNEYS. The old journey writes them from S3b (its analogues, `variant = old`) so the
 * new one, which writes `variant = new` from S7/S8, has a 14-day baseline to be compared with.
 */

/** The steps, and the origins each may carry. ⛔ Adding one is a change to this list, reviewed with the privacy notice. */
export const FUNNEL_STEPS = {
  /** A bet sheet opened (old journey: the market page's side picker revealed the dial). */
  sheet_open: ["home", "board", "market", "card"],
  /** The not-enough-money state was shown. */
  low_balance: ["dial", "updown", "sheet"],
  /** A bet was placed (server-side, after the money call succeeded). */
  bet: ["dial", "quick", "sheet", "deposit_return"],
  /** A deposit was confirmed (server-side). */
  deposit_confirmed: ["low_balance", "direct"],
} as const;

export type FunnelStep = keyof typeof FUNNEL_STEPS;
export type FunnelOrigin<S extends FunnelStep = FunnelStep> = (typeof FUNNEL_STEPS)[S][number];
export const FUNNEL_VARIANTS = ["old", "new"] as const;
export type FunnelVariant = (typeof FUNNEL_VARIANTS)[number];

/** The steps a BROWSER may report. Bets and confirmed deposits are counted only by the server, where the money moved. */
export const CLIENT_FUNNEL_STEPS: readonly FunnelStep[] = ["sheet_open", "low_balance"];

/** One tag's shape: lowercase letters, digits and `._~ -`, at most 64 characters (the visit counter's own tag rule). */
export const FUNNEL_TAG_MAX = 64;
const TAG = /^[a-z0-9._~ -]*$/;

/** A campaign tag as stored: trimmed, lowercased, "" when it is not in the safe shape. */
export function funnelTag(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim().toLowerCase();
  return t.length <= FUNNEL_TAG_MAX && TAG.test(t) ? t : "";
}

export type FunnelEvent = {
  step: FunnelStep;
  origin: string;
  variant: FunnelVariant;
  utmSource: string;
  utmCampaign: string;
};

/** Is this origin one the step allows? */
export function isFunnelOrigin(step: FunnelStep, origin: unknown): boolean {
  return typeof origin === "string" && (FUNNEL_STEPS[step] as readonly string[]).includes(origin);
}

/** The wire body the beacon sends — five short keys, nothing else. */
export function funnelBody(e: FunnelEvent): string {
  return JSON.stringify({ s: e.step, o: e.origin, v: e.variant, us: funnelTag(e.utmSource), uc: funnelTag(e.utmCampaign) });
}

/**
 * The event, if the body is EXACTLY what `funnelBody` produces for a CLIENT step; null otherwise. Never throws —
 * anyone can POST anything to a public endpoint, so nothing here is trusted from the browser.
 */
export function parseFunnelBody(text: unknown): FunnelEvent | null {
  if (typeof text !== "string" || text.length === 0 || text.length > 512) return null;
  let v: unknown;
  try { v = JSON.parse(text); } catch { return null; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (Object.keys(o).sort().join(",") !== "o,s,uc,us,v") return null;
  const step = o.s;
  if (typeof step !== "string" || !(CLIENT_FUNNEL_STEPS as readonly string[]).includes(step)) return null;
  if (!isFunnelOrigin(step as FunnelStep, o.o)) return null;
  if (typeof o.v !== "string" || !(FUNNEL_VARIANTS as readonly string[]).includes(o.v)) return null;
  if (typeof o.us !== "string" || typeof o.uc !== "string" || funnelTag(o.us) !== o.us || funnelTag(o.uc) !== o.uc) return null;
  return { step: step as FunnelStep, origin: o.o as string, variant: o.v as FunnelVariant, utmSource: o.us, utmCampaign: o.uc };
}

/* ─── The visit's first-touch campaign tags (sessionStorage, `kp-utm`) ────────────────────────────────────────── */

/** The sessionStorage key holding the visit's first-touch `utm_source` / `utm_campaign`. Named in Privacy §7. */
export const FUNNEL_UTM_KEY = "kp-utm";

/** The tags a landing URL carries, in the stored shape — or null when it carries neither. */
export function utmFromSearch(search: URLSearchParams): { s: string; c: string } | null {
  const s = funnelTag(search.get("utm_source")), c = funnelTag(search.get("utm_campaign"));
  return s || c ? { s, c } : null;
}

/** A stored `kp-utm` value, read defensively. */
export function readUtm(raw: string | null | undefined): { s: string; c: string } {
  if (typeof raw !== "string" || raw.length > 300) return { s: "", c: "" };
  try {
    const v = JSON.parse(raw) as { s?: unknown; c?: unknown };
    return { s: funnelTag(v?.s), c: funnelTag(v?.c) };
  } catch { return { s: "", c: "" }; }
}
