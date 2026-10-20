/** Actual source reversals used by red:classic-shell-navigation and audited by test:red-anchors. */
export const MUTATIONS = [
  {
    name: "no retry after navigation",
    file: "scripts/lib/classic-shell-navigation.mjs",
    from: "if (attempt === 2 || !isNavigationInterruption(error)) throw error;",
    to: "if (attempt === 1 || !isNavigationInterruption(error)) throw error;",
    expect: "FAIL one interrupted snapshot is recaptured from a new attempt",
  },
  {
    name: "second interruption waived",
    file: "scripts/lib/classic-shell-navigation.mjs",
    from: "if (attempt === 2 || !isNavigationInterruption(error)) throw error;",
    to: "if (attempt === 3 || !isNavigationInterruption(error)) throw error;",
    expect: "FAIL a second navigation interruption is reported, never waived",
  },
  {
    name: "observed navigation error unrecognised",
    file: "scripts/lib/classic-shell-navigation.mjs",
    from: "Execution context was destroyed, most likely because of a navigation",
    to: "Some other Playwright error",
    expect: "FAIL the observed Playwright navigation interruption is recognised",
  },
  {
    name: "driver bypasses the retry",
    file: "scripts/qa-classic-shell-parity.mjs",
    from: "return await retryNavigationCapture(\n      () => captureOnce(jar, locale, width, route, plant),\n      () => console.log(`  ↻ ${locale}|${width}|${route} navigation interrupted; retrying the whole cell`),\n    );",
    to: "return await captureOnce(jar, locale, width, route, plant);",
    expect: "FAIL the actual cell capture uses the bounded retry around the fresh attempt",
  },
];
