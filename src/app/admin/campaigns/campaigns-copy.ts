/**
 * U36 · THE SMS CAMPAIGN LIST'S WORDS, IN ONE PLACE — the page, its rail and `test:campaigns-page` read these, so a
 * state the suite asserts is the sentence the page prints.
 *
 * ⛔ "SMS campaigns", NEVER "Campaigns": /admin/invites already heads its page "Invite campaigns" and titles its own KPI
 * and card "Campaigns", so a second bare "Campaigns" in one console is two things under one word (§9 U36). The
 * section's three LITERAL titles (layout, page gate and page head, the ghost's head) must equal `CAMPAIGNS_TITLE` —
 * literals, because `test:layout-staleness` §1.0 and `test:admin-section-gate` §0b′ accept no computed prop there.
 * ⭐ The Swahili gloss is COPIED, never invented (§5.13): "Kampeni" is the shipped word beside "Campaigns" on
 * /admin/invites (its KPI tile).
 * ⛔ No money word here (OD24): GROWTH reads this list, and TZS renders only to a role holding the accounting tier.
 * ⭐ Every sentence renders at `text-body-sm` or larger — a sentence is reading copy, never a caption (`test:type-scale`
 * §3).
 */
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { adminCount, formatNumber } from "@/lib/utils";
import type { CampaignProgress, CampaignRailKey } from "@/lib/marketing/campaign-status";

export const CAMPAIGNS_TITLE = "SMS campaigns";
export const CAMPAIGNS_SW = "Kampeni";
/** The head's one action — rendered only once `CAMPAIGN_SCREENS.compose` is true (U37). */
export const CAMPAIGNS_NEW = "New campaign";

/** The table with no campaign in it at all. ⛔ No compose link until U37: the body says why there is none. */
export const CAMPAIGNS_EMPTY = {
  title: "No SMS campaigns yet",
  bodyComposeOff: "Nothing has been sent from here. Writing a campaign is not live yet.",
  bodyComposeOn: "Write one with New campaign.",
} as const;

/** A rail filter that matches nothing — one per rail key, so the sentence names what was asked for. */
export const CAMPAIGNS_NO_MATCH: Readonly<Record<CampaignRailKey, { title: string; body: string }>> = {
  drafts: { title: "No drafts", body: "No campaign is being written or waiting to start." },
  sending: { title: "Nothing is sending", body: "No campaign is preparing its list or sending right now." },
  paused: { title: "No paused campaigns", body: "No campaign is paused right now." },
  finished: { title: "No finished campaigns", body: "No campaign has finished or been stopped yet." },
};
/** The no-match row's one way out — the same list with the status filter removed. */
export const CAMPAIGNS_SHOW_ALL = "Show all";

/** The rail's group key and its accessible name. */
export const CAMPAIGNS_RAIL_KEY = "Status";
export const CAMPAIGNS_RAIL_LABEL = "Filter SMS campaigns by status";

export const CAMPAIGNS_NOT_CONFIRMED = "Not confirmed";
export const CAMPAIGNS_UNTITLED = "Untitled campaign";

/** The confirmed audience, as a count of people. */
export function audienceLine(n: number): string {
  return adminCount(n, "person", "people");
}

/** The saved per-variant segment counts (X15) — Swahili always, English when the campaign has an English body. */
export function segmentsLine(sw: number, en: number | null): string {
  return en === null ? `Swahili ${formatNumber(sw)}` : `Swahili ${formatNumber(sw)} · English ${formatNumber(en)}`;
}

/** The bar's caption and its announced text — ONE sentence from the server's counts ("1,847 of 5,912 processed"). */
export function progressCaption(p: CampaignProgress): string {
  return `${formatNumber(p.value)} of ${formatNumber(p.max)} ${p.phase === "preparing" ? "prepared" : "processed"}`;
}

/** What the bar measures, for a screen reader. */
export function progressLabel(name: string): string {
  return `Progress of ${name.trim() === "" ? CAMPAIGNS_UNTITLED : name}`;
}

/** "14:03" on the EAT wall clock, whatever the platform timezone says — the campaign engine's clock is EAT. */
export function eatClock(iso: string): string {
  return new Date(Date.parse(iso) + EAT_OFFSET_MS).toISOString().slice(11, 16);
}

/** ⭐ THE LIST IS A SNAPSHOT, AND SAYS SO: it is read once per request and never polls (no pump until U44, live
 *  movement is U47's), so a row in flight carries the time it was read beside a Refresh. */
export function campaignsAsOf(readAt: string): string {
  return `As of ${eatClock(readAt)} EAT — this list does not refresh by itself.`;
}
