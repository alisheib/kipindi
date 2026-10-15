import { houseBotAlertOnceStore, houseBotStore } from "../house-bot-dal";
import { notifyAdminsDeskAmlFlag } from "../notification-service";

type FlagRef = { userId: string; txnId: string; type: "STAKE_SPIKE" | "VELOCITY" };

/** Mark designated accounts and claim one owner alert for each live finding. No account details enter copy or logs. */
export async function escalateDeskAmlFlags(flags: readonly FlagRef[]): Promise<ReadonlySet<string>> {
  const designated = new Set((await houseBotStore.listNonRemoved()).map((account) => account.userId));
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
