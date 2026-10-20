/** The Rules browser drive must set the language on the origin it opens. */
export function localeCookieForOrigin(base, locale) {
  const url = new URL(base);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Rules QA needs an HTTP origin");
  if (!["en", "sw", "zh"].includes(locale)) throw new Error("Rules QA needs a supported locale");
  return { name: "kp-locale", value: locale, domain: url.hostname, path: "/" };
}
