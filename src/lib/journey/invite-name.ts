/**
 * ONE NAME FOR /profile/invite, PER READER (round 6 of the visual pass, 2026-10-09, review C1) — what the page calls itself
 * for the reader in front of it, and so what every door to it says.
 *
 * ⭐ THE PAGE SERVES THREE READERS, AND NAMES ITSELF FOR EACH:
 *   · an approved AGENT — the commission dashboard (`agent-dashboard.tsx`): "Dashibodi ya wakala / Agent dashboard / 代理面板";
 *   · a player while invites PAY (`invitePaysPlayersNow`, the Owner's switch, a reward armed): "Alika na upate zawadi /
 *     Invite & Earn / 邀请赚钱" — the paid wording COMPLIANCE-DECISIONS allows exactly while invites pay;
 *   · every other player: "Alika marafiki / Invite friends / 邀请朋友".
 * Before this module the doors disagreed with the page and with each other: for an agent the hub said the dashboard, the
 * journey's avatar menu "Invite & Earn" and its footer "Invite friends"; for a paid player the page and the menu said
 * "Invite & Earn" while the hub, the footer and /profile's row said "Invite friends" — three names for one page.
 * ⭐ THE CONVENTION IS THE PRODUCT'S OWN (R4-H's E4/E33, R5-A's F17): a door names its page as the page names itself; the
 * avatar menu's note ("so the row and its destination cannot disagree") and /profile's ("so the door and the room cannot
 * describe different programmes") say the same. Where "earn" may stand at all is the owner's question (owner item 53, D5):
 * if it is ruled out, the paid arm below changes, and every door and the page change with it.
 * ⛔ PURE — an erased type import only, no directive (the `money-names.ts` shape): the Akaunti hub's rows (`hub-rows.ts`,
 * itself pure), the avatar menu and the footer (client code) and the page (server) all read it. Who is an agent and whether
 * invites pay are answered by the caller, from what it already read; a failed read answers "no" to both, so a door never
 * promises money the page does not.
 */
import type { Dict } from "@/lib/i18n-dict";

/** Who is asking: an approved agent (whose page is the dashboard), and whether the PLAYER programme pays now. */
export type InviteReader = { agent: boolean; paid: boolean };

/** The dictionary path of the page's name for this reader — the shape the hub's rows carry (`hub-rows.ts`). */
export type InviteNameKey = "agent.dashTitle" | "profile.inviteEarn" | "profile.inviteFriends";

export function inviteNameKey(r: InviteReader): InviteNameKey {
  return r.agent ? "agent.dashTitle" : r.paid ? "profile.inviteEarn" : "profile.inviteFriends";
}

/** The page's name for this reader, in `t`'s language: its <title>, its h1, and every door's words. */
export function inviteName(t: Dict, r: InviteReader): string {
  return r.agent ? t.agent.dashTitle : r.paid ? t.profile.inviteEarn : t.profile.inviteFriends;
}

/** The line /profile's row carries under the name: what the dashboard holds, for an agent; for a player, the page's own
 *  call — the sentence its hero sets beside the dial. */
export function inviteLine(t: Dict, r: InviteReader): string {
  return r.agent ? t.agent.dashSubtitle : r.paid ? t.profile.inviteEarnSub : t.profile.inviteFriendsSub;
}
