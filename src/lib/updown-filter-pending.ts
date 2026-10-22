/**
 * A pending asset can wear the selected pill only when its duration is known.
 * An asset-only URL means the server is choosing that asset's first available
 * duration. Until it arrives, the old board and its two selected pills agree.
 */
export function pendingAssetHasDuration(
  pendingAsset: string | null,
  pendingDuration: string | null,
  activeAsset: string | null,
): boolean {
  if (pendingAsset === null) return false;
  if (pendingAsset === activeAsset) return true;
  if (pendingDuration === null) return false;
  const minutes = Number(pendingDuration);
  return Number.isInteger(minutes) && minutes > 0;
}
