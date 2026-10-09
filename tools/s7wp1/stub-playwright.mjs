// Throwaway stub (outside the repo): stands in for "playwright" so qa-classic-shell-parity.mjs can run its synthetic
// --prove-red checks with no server and no browser. Every browser operation throws, so every browser check FAILS
// (as it must: nothing was measured), while the in-memory checks run on the real harness code.
const nope = async () => { throw new Error("stub browser: no server, no browser in this run"); };
const context = () => ({
  addCookies: nope, newPage: nope, cookies: async () => [], close: async () => {},
  request: { post: nope },
});
export const chromium = {
  launch: async () => ({ version: () => "stub-0", newContext: async () => context(), close: async () => {} }),
};
