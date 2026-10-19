/** Local acceptance uses the isolated demo player; public origins require the named QA player. */
export function landingSignInMode(base) {
  return /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base) ? "demo" : "mobile01";
}
