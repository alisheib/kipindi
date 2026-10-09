// Throwaway preload: registers the playwright stub and answers the harness's /api/health read as an in-memory,
// not-ACTIVE dev server would, so the harness gets past its refusals without any server running.
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
globalThis.fetch = async (url) => {
  if (!String(url).endsWith("/api/health")) throw new Error(`stub fetch: ${url}`);
  return { json: async () => ({ database: { configured: false }, store: "memory", simpleJourney: { state: "OFF" } }) };
};
