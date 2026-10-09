const { createRequire } = require("node:module");
const NodeModule = require("node:module");
const ROOT = "F:/kipindi-r5d";
const req = createRequire(ROOT + "/package.json");
const nh = req("next/headers");
nh.headers = async () => new Headers({ "x-pathname": "/" });
const jpPath = req.resolve(ROOT + "/src/lib/server/journey-preview.ts");
const stub = new NodeModule(jpPath); stub.filename = jpPath; stub.loaded = true;
stub.exports = { resolveSimpleJourney: async () => ({ journey: true }) };
req.cache[jpPath] = stub;
const RootLoading = req(ROOT + "/src/app/loading.tsx").default;
(async () => {
  const el = await RootLoading();
  const keys = Object.keys(req.cache).filter((k) => /route-ghost/.test(k));
  console.log("cache keys:", keys);
  for (const k of keys) { const m = req.cache[k]; console.log(k, Object.keys(m.exports || {}), m.exports && m.exports.LazyJourneyRouteGhost === el.type); }
  console.log("el.type keys", Object.keys(el.type));
})();
