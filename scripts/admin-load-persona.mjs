/** Use the disposable local Owner fixture for a local admin load sweep. */
export function adminLoadPersona(base) {
  const { hostname, protocol } = new URL(base);
  if (protocol !== "http:" && protocol !== "https:") throw new Error("admin load target must be HTTP(S)");
  return /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(hostname) ? "local:ADMIN" : "admin";
}

export async function adminLoadSession(browser, base, loginOnce) {
  return loginOnce(browser, adminLoadPersona(base));
}
