/**
 * A late client navigation can replace a page's JavaScript world between the
 * parity driver's two snapshots. Repeat the entire cell in a fresh context;
 * retaining its first snapshot would compare two different documents.
 */
export function isNavigationInterruption(error) {
  return /^(?:page\.evaluate|page\.waitForFunction): Execution context was destroyed, most likely because of a navigation/i
    .test(String(error?.message ?? error));
}

export async function retryNavigationCapture(take, onRetry = () => {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await take();
    } catch (error) {
      if (attempt === 2 || !isNavigationInterruption(error)) throw error;
      onRetry();
    }
  }
  throw new Error("navigation capture exhausted without a result");
}
