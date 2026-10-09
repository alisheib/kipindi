// R6-B · A4: which addresses does each matcher SKIP? Compiled with Next's own getMiddlewareMatchers (as test:proxy-scope).
const { getMiddlewareMatchers } = require("F:/kipindi-r6b/node_modules/next/dist/build/analysis/get-page-static-info.js");
const OLD = "/((?!_next/static|_next/image|favicon.ico|favicon.svg|icons/|brand/|pay/|og/|screenshots/|email-signatures/).*)";
// The new literal's VALUE (in the .ts source each backslash is written twice).
const NEW = "/((?!_next/static|_next/image|favicon\\.ico$|favicon\\.svg$|icons/|brand/|pay/|og/|screenshots/|email-signatures/).*)";
const runsOf = (m) => { const re = getMiddlewareMatchers([m], {}).map((x) => new RegExp(x.regexp)); return (p) => re.some((r) => r.test(p)); };
const oldRuns = runsOf(OLD), newRuns = runsOf(NEW);
console.log("NEW value:", NEW);
console.log("NEW regexp:", getMiddlewareMatchers([NEW], {})[0].regexp);
const probes = [
  "/", "/markets/x.png", "/admin/players/x.png",
  "/favicon.ico", "/favicon.svg", "/favicon.icon", "/favicon.ico/x", "/faviconXico", "/favicon.svgz", "/favicon.ico.json", "/favicon.ico/",
  "/favicon-x", "/favicon", "/faviconxsvg",
  "/icons/icon-192.png", "/icons/nope", "/brand/x", "/og/x", "/pay/x", "/screenshots/x", "/email-signatures/x",
  "/_next/static/chunks/x.js", "/_next/image", "/iconsx/a.png",
];
for (const p of probes) console.log(`${(oldRuns(p) ? "old RUNS   " : "old SKIPS  ")}${(newRuns(p) ? "new RUNS   " : "new SKIPS  ")} ${p}`);
