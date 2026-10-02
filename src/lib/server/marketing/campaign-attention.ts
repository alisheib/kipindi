/**
 * U36 · THE "SMS campaigns" NAV BADGE — how many campaigns want an officer (OD39: a reachability signal that cannot go
 * stale and lie; the definition is `wantsAttention` in `campaign-status.ts`, asked by the store's `attentionCount`).
 *
 * 🔴 READ ONLY FOR A VIEWER WHO MAY SEE GROWTH. `getSidebarBadges` (admin-shell.tsx) runs on EVERY admin render for
 * EVERY staff role, and its whole result is serialised into the props of two client components — whatever
 * `filterNavGroups` hides. So a count computed for everyone ships to SUPPORT, FINANCE, MODERATOR, AUDITOR and
 * COMPLIANCE in their page payload. For a viewer without growth this returns undefined and READS NOTHING: privileged
 * data never fetched cannot leak (the `openRefusedFundsCases(canSeeMoney)` precedent, one function over).
 *
 * 🔴 B-28 · A SYNCHRONOUS THROW CANNOT TAKE THE CONSOLE DOWN. The memory twin's methods are SYNC: a throw from one,
 * evaluated inside `Promise.all`'s argument list, escapes before any `.catch` is attached and takes every /admin page
 * with it (admin-shell.tsx records the night it did). So the read runs inside an async function expression — a sync
 * throw becomes a rejection — and the rejection becomes "no badge". ⛔ Never `Promise.resolve(db…())`: the argument
 * is evaluated, and throws, before `Promise.resolve` is ever called.
 *
 * ⛔ A count of 0 — or a read that failed — is NO badge (undefined), never "0": `CountBadge` draws nothing at 0, and
 * a failed read must not claim the campaigns are idle.
 *
 * Guard: `npm run test:campaigns-page` §4 (the spy that proves nothing is read, the sync-throw case, the shell's two
 * callers).
 */
import { db } from "@/lib/server/store";

export async function campaignAttentionBadge(canSeeGrowth: boolean): Promise<string | undefined> {
  if (!canSeeGrowth) return undefined;
  const n = await (async () => db.smsCampaign.attentionCount())().catch(() => 0);
  return n > 0 ? String(n) : undefined;
}
