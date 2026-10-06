/**
 * THE AKAUNTI HUB'S ROWS — which doors a reader gets on `/account`, as data (the Vodacom plan S6, SJ-17;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP5, amendments A9, A10 and A17).
 *
 * Every door the classic More menu, avatar menu and phone header held, in the cards the S4 canvas draws (frames
 * s4-8-akaunti and s4-8-akaunti-guest) and in its order — with A17's change: the play-safe card sits above invite and
 * rewards, and "Pumzika / Jizuie" is two rows, each landing on its own section of the limits page.
 *
 * ⭐ PURE — nothing imported but erased types, and no directive — because `hubRowsFor` is one of the roots of S6's
 * route-entrance census (A9, WP6b): the census asks it, for each kind of reader, which routes the hub reaches. So a
 * door is here or nowhere. The page renders exactly these rows and adds only the two controls that must not be data:
 *   · the staff console — ONE plain document link written in the page itself (E-70: a row renders as a soft link, and
 *     a soft link into the console keeps the player chrome around it); `test:shell-boundary` §2b holds it;
 *   · sign-out — a POST behind the kit's confirm dialog: an act, not a door.
 * ⛔ Every gate is an answer the caller already resolved: `doors` is `viewerDoorsFor`'s (invite by standing, the agent
 * door by the footer's own rule, proposals by state). Nothing here re-spells a product rule.
 * ⛔ Every label is a dictionary path, never a literal: `hubWordProblems` holds each one to en, sw and zh, and
 * `test:journey-account` §3 holds every kind of reader's rows to the canvas.
 */
import type { ViewerDoors } from "@/lib/journey/viewer-doors";
import type { ProposalsState } from "@/lib/server/proposals-config";

/** A signed-in reader, as `loadHubViewer` (`src/lib/server/hub-viewer.ts`) composes one. */
export type HubMember = {
  signedIn: true;
  userId: string;
  name: string;
  initials: string;
  /** Already masked — the shared mask, never the stored number. */
  phone: string;
  /** The wallet's balance, or null when it could not be read: no figure rather than a wrong one. */
  balance: number | null;
  /** A frozen or closed wallet: Pochi says so, and no money door is offered — the wallet sheet's own rule. */
  walletHeld: boolean;
  /** "Verify ID" is offered: the KYC row was read, and it is neither approved nor a final refusal. */
  kycOffered: boolean;
  /** An approved agent in good standing, whose invite door is their commission dashboard. */
  agentInStanding: boolean;
  proposalsState: ProposalsState;
  doors: ViewerDoors;
};

/** Who the hub is drawn for. A guest is read nothing at all. */
export type HubViewer = { signedIn: false } | HubMember;

/** Every dictionary path a row or a card reads — `hubWordProblems` resolves each one in every language. */
export const HUB_WORDS = [
  "journey.hubGroupMoney", "journey.hubGroupPlay", "journey.hubGroupSafety", "journey.hubGroupInvite",
  "journey.hubGroupProfile", "journey.hubGroupHelp", "journey.hubGroupSettings", "journey.hubGroupAgent",
  "journey.hubGroupFairnessHelp", "journey.hubGroupLegal",
  "common.wallet", "common.balanceFrozen", "journey.withdrawAction",
  "common.results", "common.live", "common.leaderboard",
  "footer.setLimits", "journey.hubLimitsSub", "footer.takeABreak", "footer.selfExclude",
  "profile.inviteFriends", "agent.dashTitle", "common.proposeEarn",
  "common.profile", "common.verifyId", "profile.verifyIdSub", "footer.resolutionAttestation",
  "common.help", "journey.hubHelpSub", "common.notifications", "common.search", "agent.footerLink",
  "footer.privacyNotice", "footer.amlKyc", "footer.terms", "footer.gameRtp",
] as const;
export type HubWord = (typeof HUB_WORDS)[number];

/** A glyph of `I` (`components/ui/glyphs.tsx`). The row renderer indexes `I` with it, so a wrong name fails the build. */
export type HubGlyph =
  | "wallet" | "arrowUpFromLine" | "checkCircle" | "radio" | "podium" | "shield" | "pause" | "circleStop"
  | "users" | "sparkle" | "user" | "idCard" | "sealCheck" | "headset" | "search" | "shieldcheck"
  | "fileText" | "tippingScales" | "info";

export type HubLinkId =
  | "wallet" | "withdraw" | "results" | "live" | "leaderboard" | "limits" | "break" | "exclude" | "invite"
  | "proposals" | "profile" | "kyc" | "fairness" | "help" | "search" | "agent" | "privacy" | "aml" | "terms" | "rules";

/** A door to a page. `extra` adds the reader's balance ("balance") or the programme's state badge ("proposals"). */
export type HubLink = {
  id: HubLinkId;
  kind: "link";
  href: string;
  label: HubWord;
  sub?: HubWord;
  glyph: HubGlyph;
  extra?: "balance" | "proposals";
};

export type HubRow =
  | HubLink
  /** Arifa: a door that also carries the reader's unread count (the journey's own counter, read once — A1). */
  | { id: "notifications"; kind: "unread"; href: "/notifications"; label: "common.notifications" }
  /** The controls that are not doors: the language, the phone board's card size, the Needle's drawer. */
  | { id: "language"; kind: "language" }
  | { id: "cardSize"; kind: "cardSize" }
  | { id: "needle"; kind: "needle" };

export type HubGroupKey =
  | "money" | "play" | "safety" | "invite" | "profile" | "help" | "settings" | "agent" | "fairnessHelp" | "legal";

/** One card: a list named by its group word — never a navigation landmark (S6-PLAN WP5 step 2). */
export type HubGroup = { key: HubGroupKey; label: HubWord; rows: HubRow[] };

const RESULTS: HubRow = { id: "results", kind: "link", href: "/results", label: "common.results", glyph: "checkCircle" };
const LIVE: HubRow = { id: "live", kind: "link", href: "/live", label: "common.live", glyph: "radio" };
const LEADERBOARD: HubRow = { id: "leaderboard", kind: "link", href: "/leaderboard", label: "common.leaderboard", glyph: "podium" };
const FAIRNESS: HubRow = { id: "fairness", kind: "link", href: "/fairness", label: "footer.resolutionAttestation", glyph: "sealCheck" };
/** ⛔ Msaada's second line names no phone number (§0h point 10). */
const HELP: HubRow = { id: "help", kind: "link", href: "/help", label: "common.help", sub: "journey.hubHelpSub", glyph: "headset" };
const NOTIFICATIONS: HubRow = { id: "notifications", kind: "unread", href: "/notifications", label: "common.notifications" };
/** Shown below 1024 only (the row hides itself): from there the journey header carries the language menu. */
const LANGUAGE: HubRow = { id: "language", kind: "language" };
const CARD_SIZE: HubRow = { id: "cardSize", kind: "cardSize" };
const NEEDLE: HubRow = { id: "needle", kind: "needle" };
/** Tafuta lands on the board that owns search today; S7 re-points it when that board moves. */
const SEARCH: HubRow = { id: "search", kind: "link", href: "/markets", label: "common.search", glyph: "search" };

/**
 * Weka mipaka, Pumzika, Jizuie. A17: Pumzika and Jizuie are two rows, each landing on its own section of the limits
 * page — the reality check's own two doors. Signed out, all three land on the public policy page, because the limits
 * page is behind a sign-in (VODACOM-PLAN §3.8). ⛔ No helpline row since the owner's ruling of 2026-10-06.
 */
function safetyRows(signedIn: boolean): HubRow[] {
  if (!signedIn) {
    return [
      { id: "limits", kind: "link", href: "/legal/responsible-gambling", label: "footer.setLimits", glyph: "shield" },
      { id: "break", kind: "link", href: "/legal/responsible-gambling", label: "footer.takeABreak", glyph: "pause" },
      { id: "exclude", kind: "link", href: "/legal/responsible-gambling", label: "footer.selfExclude", glyph: "circleStop" },
    ];
  }
  return [
    { id: "limits", kind: "link", href: "/profile/responsible-gambling", label: "footer.setLimits", sub: "journey.hubLimitsSub", glyph: "shield" },
    { id: "break", kind: "link", href: "/profile/responsible-gambling#break", label: "footer.takeABreak", glyph: "pause" },
    { id: "exclude", kind: "link", href: "/profile/responsible-gambling#exclude", label: "footer.selfExclude", glyph: "circleStop" },
  ];
}

/** Signed out (frame s4-8-akaunti-guest). No sign-in pair here: the header carries Ingia and Jisajili (A17). */
function guestGroups(): HubGroup[] {
  return [
    { key: "play", label: "journey.hubGroupPlay", rows: [LANGUAGE, RESULTS, LIVE, LEADERBOARD] },
    { key: "fairnessHelp", label: "journey.hubGroupFairnessHelp", rows: [FAIRNESS, HELP] },
    { key: "safety", label: "journey.hubGroupSafety", rows: safetyRows(false) },
    {
      key: "legal",
      label: "journey.hubGroupLegal",
      rows: [
        { id: "privacy", kind: "link", href: "/legal/privacy", label: "footer.privacyNotice", glyph: "fileText" },
        { id: "aml", kind: "link", href: "/legal/aml", label: "footer.amlKyc", glyph: "shieldcheck" },
        { id: "terms", kind: "link", href: "/legal/terms", label: "footer.terms", glyph: "tippingScales" },
        { id: "rules", kind: "link", href: "/legal/rules", label: "footer.gameRtp", glyph: "info" },
      ],
    },
  ];
}

/** Signed in (frame s4-8-akaunti), with A17's order. A card with nothing for this reader is not drawn at all. */
function memberGroups(v: HubMember): HubGroup[] {
  const money: HubRow[] = [
    { id: "wallet", kind: "link", href: "/wallet", label: "common.wallet", sub: v.walletHeld ? "common.balanceFrozen" : undefined, glyph: "wallet", extra: "balance" },
  ];
  // A held wallet is offered no money door: the withdraw page renders no form for it, and the wallet sheet offers none.
  if (!v.walletHeld) money.push({ id: "withdraw", kind: "link", href: "/wallet/withdraw", label: "journey.withdrawAction", glyph: "arrowUpFromLine" });

  // Alika only where this reader may hold a link; Pendekeza unless the programme is switched off.
  const share: HubRow[] = [];
  if (v.doors.inviteVisible) {
    share.push({
      id: "invite", kind: "link", href: "/profile/invite", glyph: "users",
      label: v.agentInStanding ? "agent.dashTitle" : "profile.inviteFriends",
    });
  }
  if (v.doors.proposalsVisible) {
    share.push({ id: "proposals", kind: "link", href: "/proposals", label: "common.proposeEarn", glyph: "sparkle", extra: "proposals" });
  }

  const profile: HubRow[] = [{ id: "profile", kind: "link", href: "/profile", label: "common.profile", glyph: "user" }];
  if (v.kycOffered) profile.push({ id: "kyc", kind: "link", href: "/profile/kyc", label: "common.verifyId", sub: "profile.verifyIdSub", glyph: "idCard" });
  profile.push(FAIRNESS);

  // Kuwa wakala under the footer's own rule: the programme open, or the reader already inside it (§0h point 9).
  const agent: HubRow[] = [];
  if (v.doors.agentDoorVisible) agent.push({ id: "agent", kind: "link", href: "/agent", label: "agent.footerLink", glyph: "shieldcheck" });

  const groups: HubGroup[] = [
    { key: "money", label: "journey.hubGroupMoney", rows: money },
    { key: "play", label: "journey.hubGroupPlay", rows: [RESULTS, LIVE, LEADERBOARD] },
    { key: "safety", label: "journey.hubGroupSafety", rows: safetyRows(true) },
    { key: "invite", label: "journey.hubGroupInvite", rows: share },
    { key: "profile", label: "journey.hubGroupProfile", rows: profile },
    { key: "help", label: "journey.hubGroupHelp", rows: [HELP, NOTIFICATIONS] },
    { key: "settings", label: "journey.hubGroupSettings", rows: [LANGUAGE, CARD_SIZE, NEEDLE, SEARCH] },
    { key: "agent", label: "journey.hubGroupAgent", rows: agent },
  ];
  return groups.filter((g) => g.rows.length > 0);
}

/** THE rows for this reader, card by card — one of S6's census roots (A9). */
export function hubRowsFor(v: HubViewer): HubGroup[] {
  return v.signedIn ? memberGroups(v) : guestGroups();
}

/** A word from a dictionary (`t`), or "" when the path is missing — `hubWordProblems` keeps that from happening. */
export function hubWord(t: unknown, key: HubWord): string {
  let v: unknown = t;
  for (const part of key.split(".")) v = v !== null && typeof v === "object" ? (v as Record<string, unknown>)[part] : undefined;
  return typeof v === "string" ? v : "";
}

/** Every hub word missing from a dictionary, as sentences (empty = sound), for dictionaries keyed by locale. */
export function hubWordProblems(dicts: Readonly<Record<string, unknown>>): string[] {
  const problems: string[] = [];
  for (const [locale, t] of Object.entries(dicts)) {
    for (const w of HUB_WORDS) if (!hubWord(t, w).trim()) problems.push(`"${w}" is missing in ${locale}`);
  }
  return problems;
}
