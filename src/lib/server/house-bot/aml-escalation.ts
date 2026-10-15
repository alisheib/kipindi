import { houseBotAlertOnceStore, houseBotStore } from "../house-bot-dal";
import { notifyAdminsDeskAmlFlag } from "../notification-service";

type FlagRef = { userId: string; txnId: string; type: "STAKE_SPIKE" | "VELOCITY" };

/** Mark present and former desk accounts and claim one owner alert for each live finding.
 * Removal cannot erase a flag on a stake that was placed while the account was designated.
 * A later flag on the same account is also sent for review; this errs toward escalation.
 * No account details enter copy or logs. */
export async function escalateDeskAmlFlags(flags: readonly FlagRef[]): Promise<ReadonlySet<string>> {
  const designated = new Set(await houseBotStore.listEverDesignatedUserIds());
  const keys = new Set<string>();
  for (const flag of flags) {
    if (!designated.has(flag.userId)) continue;
    keys.add(`${flag.userId}:${flag.txnId}:${flag.type}`);
    const claim = `aml-owner:${flag.txnId}:${flag.type}`;
    if (!(await houseBotAlertOnceStore.claim(claim))) continue;
    try {
      if ((await notifyAdminsDeskAmlFlag({ type: flag.type })) === 0) {
        await houseBotAlertOnceStore.release(claim);
      }
    } catch {
      await houseBotAlertOnceStore.release(claim).catch(() => {});
      throw new Error("Owner review alert could not be sent");
    }
  }
  return keys;
}
