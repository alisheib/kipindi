/** BRIEF B1: the 360px open and locked round cards keep one visual footprint. */
export function sameCardFootprint(openHeight, lockedHeight) {
  if (!Number.isFinite(openHeight) || !Number.isFinite(lockedHeight)
    || openHeight <= 0 || lockedHeight <= 0) return false;
  return Math.abs(lockedHeight - openHeight) <= 1;
}
