// Throwaway: which paths does next.config's "immutable" header rule match, with Next's own runtime matcher?
const { getPathMatch } = require("F:/kipindi-vis/node_modules/next/dist/shared/lib/router/utils/path-match.js");
const { modifyRouteRegex } = require("F:/kipindi-vis/node_modules/next/dist/lib/redirect-status.js");
const source = "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)";
let built = "";
const match = getPathMatch(source, {
  strict: true,
  removeUnnamedParams: true,
  regexModifier: (regex) => { built = modifyRouteRegex(regex, undefined); return built; },
  sensitive: false,
});
console.log("regex:", built);
for (const p of [
  "/markets/abc.png", "/markets/abcpng", "/markets/mexico", "/positions/pos_123.jpg", "/wallet/receipt/rc_1.svg",
  "/markets/cmg9x8y7z6w5v4u3t2s1r0ico", "/brand/mark-color.svg", "/_next/static/media/x.woff2", "/markets/abc", "/help",
  "/profile", "/admin/players/u_1.png",
]) console.log(String(!!match(p)).padEnd(6), p);
