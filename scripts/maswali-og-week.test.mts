/** The week share card cannot be fetched or named before a PUBLIC week closes under an ACTIVE rollout. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPublishedOgWeek } from "../src/lib/server/millionea-og-week.ts";
import { renderMillioneaWeekOg } from "../src/app/api/og/millionea/[week]/og-view.tsx";
import type { RolloutState } from "../src/lib/millionea-rollout.ts";
import type { StoredWeek } from "../src/lib/server/maswali-dal.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n"));
const code = "MLN-2026-W45";
const closed = "2026-10-19T12:00:00.000Z";
const now = Date.parse("2026-10-20T12:00:00.000Z");
type OgRow = Pick<StoredWeek, "code" | "visibility" | "state" | "closedAt">;
const row: OgRow = { code, visibility: "PUBLIC", state: "SETTLED", closedAt: closed };
const check = (label: string, yes: boolean) => { if (!yes) throw new Error(label); console.log(`PASS ${label}`); };
const count = (s: string, x: string) => s.split(x).length - 1;
const world = {
  reader: read("src/lib/server/millionea-og-week.ts"),
  route: read("src/app/api/og/millionea/[week]/route.tsx"),
  view: read("src/app/api/og/millionea/[week]/og-view.tsx"),
  page: read("src/app/millionea/register/[week]/page.tsx"),
};
type World = typeof world;

function sourceChecks(w: World) {
  const { reader: r, route: a, view: v, page: p } = w;
  return {
    beforeRead: r.includes('if (!door.visible || door.state !== "ACTIVE" || code === null) return null;')
      && r.indexOf('if (!door.visible || door.state !== "ACTIVE" || code === null) return null;') < r.indexOf("await getByCode(code)"),
    publicTerminalClosed: r.includes('week.visibility !== "PUBLIC"')
      && r.includes('week.state !== "SETTLED" && week.state !== "VOIDED"')
      && r.includes("!Number.isFinite(closedMs) || closedMs > nowMs"),
    routeGate: a.includes('if (!door.visible || door.state !== "ACTIVE") return hidden();')
      && a.indexOf('if (!door.visible || door.state !== "ACTIVE") return hidden();') < a.indexOf("normalizeMillioneaWeekCode(rawCode)")
      && a.includes("loadPublishedOgWeek(door, code, weekStore.getByCode)")
      && a.includes('"Cache-Control": "no-store"')
      && a.includes('return week ? renderMillioneaWeekOg(week) : hidden();'),
    pageMetadata: p.includes("if (!(await millioneaDoor()).visible) return notFoundMetadata();")
      && p.includes('if (door.state !== "ACTIVE") return ordinary;')
      && p.includes('if (!week) return ordinary;')
      && p.includes("normalizeMillioneaWeekCode(rawCode)")
      && p.includes("loadPublishedOgWeek(door, code, weekStore.getByCode)")
      && p.includes("openGraph: { ...ROOT_OPEN_GRAPH")
      && p.includes("twitter: { card: \"summary_large_image\"")
      && p.includes('const image = `/api/og/millionea/${encodeURIComponent(week.code)}`;'),
    publicOnlyImage: v.includes("renderMillioneaWeekOg(week: PublishedOgWeek)")
      && v.includes("{t.millionea.productTitle}")
      && v.includes("{week.code}")
      && v.includes("{state}")
      && !/\b(?:tickets|questions|picks|selections|payout|player|share|jackpot)\b/i.test(v)
      && !v.includes("<svg"),
  };
}

async function runtimeChecks(loader: typeof loadPublishedOgWeek) {
  const cases: Array<{ name: string; state: RolloutState; visible: boolean; value: OgRow | null; shown: boolean; reads: number }> = [
    { name: "WITHDRAWN", state: "WITHDRAWN", visible: false, value: row, shown: false, reads: 0 },
    { name: "STAFF_PREVIEW", state: "STAFF_PREVIEW", visible: true, value: row, shown: false, reads: 0 },
    { name: "ACTIVE public settled", state: "ACTIVE", visible: true, value: row, shown: true, reads: 1 },
    { name: "ACTIVE drive", state: "ACTIVE", visible: true, value: { ...row, visibility: "DRIVE" }, shown: false, reads: 1 },
    { name: "ACTIVE unresolved", state: "ACTIVE", visible: true, value: { ...row, state: "RESOLVING" }, shown: false, reads: 1 },
    { name: "ACTIVE before close", state: "ACTIVE", visible: true, value: { ...row, closedAt: null }, shown: false, reads: 1 },
    { name: "ACTIVE future close", state: "ACTIVE", visible: true, value: { ...row, closedAt: "2026-10-21T00:00:00.000Z" }, shown: false, reads: 1 },
    { name: "ACTIVE wrong record", state: "ACTIVE", visible: true, value: { ...row, code: "MLN-2026-W44" }, shown: false, reads: 1 },
    { name: "ACTIVE missing", state: "ACTIVE", visible: true, value: null, shown: false, reads: 1 },
  ];
  const errors: string[] = [];
  for (const c of cases) {
    let reads = 0;
    const got = await loader({ visible: c.visible, state: c.state }, code, async () => { reads++; return c.value; }, now);
    if ((got !== null) !== c.shown || reads !== c.reads || (got && (got.code !== code || got.state !== "SETTLED"))) {
      errors.push(`${c.name}: shown=${got !== null}, reads=${reads}`);
    }
  }
  let absentReads = 0;
  const absent = await loader({ visible: true, state: "ACTIVE" }, null, async () => { absentReads++; return row; }, now);
  if (absent !== null || absentReads !== 0) errors.push("null code read");
  return errors;
}

const guards = sourceChecks(world);
for (const [name, okay] of Object.entries(guards)) check(`source ${name}`, okay);
const runtimeFailures = await runtimeChecks(loadPublishedOgWeek);
check(`rollout and week gate${runtimeFailures.length ? `: ${runtimeFailures.join(", ")}` : ""}`, runtimeFailures.length === 0);

const image = renderMillioneaWeekOg({ code, state: "SETTLED" });
const bytes = Buffer.from(await image.arrayBuffer());
check("rendered card is a 1200×630 PNG", bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  && bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630);
check("rendered card is not cacheable", image.headers.get("Cache-Control") === "no-store");
if (process.argv.includes("--prove-red")) {
  const plants: Array<{ name: string; file: keyof World; from: string; to: string; fails: keyof typeof guards }> = [
    { name: "read before rollout", file: "reader", from: 'if (!door.visible || door.state !== "ACTIVE" || code === null) return null;', to: 'if (code === null) return null;', fails: "beforeRead" },
    { name: "DRIVE images", file: "reader", from: 'week.visibility !== "PUBLIC"', to: "false", fails: "publicTerminalClosed" },
    { name: "unresolved image", file: "reader", from: 'week.state !== "SETTLED" && week.state !== "VOIDED"', to: 'week.state !== "OPEN"', fails: "publicTerminalClosed" },
    { name: "future close", file: "reader", from: "!Number.isFinite(closedMs) || closedMs > nowMs", to: "!Number.isFinite(closedMs)", fails: "publicTerminalClosed" },
    { name: "unguarded URL", file: "route", from: 'if (!door.visible || door.state !== "ACTIVE") return hidden();', to: "", fails: "routeGate" },
    { name: "metadata in preview", file: "page", from: 'if (door.state !== "ACTIVE") return ordinary;', to: "", fails: "pageMetadata" },
    { name: "metadata 404 on valid week without image", file: "page", from: 'if (!week) return ordinary;', to: 'if (!week) return notFoundMetadata();', fails: "pageMetadata" },
    { name: "root OG fields lost", file: "page", from: "openGraph: { ...ROOT_OPEN_GRAPH", to: "openGraph: {", fails: "pageMetadata" },
    { name: "private ticket in picture", file: "view", from: "{week.code}", to: "{week.code} {week.tickets}", fails: "publicOnlyImage" },
  ];
  for (const plant of plants) {
    check(`${plant.name} anchor unique`, count(world[plant.file], plant.from) === 1);
    check(`${plant.name} turns ${plant.fails} red`, sourceChecks({ ...world, [plant.file]: world[plant.file].replace(plant.from, plant.to) })[plant.fails] === false);
  }
  const eager: typeof loadPublishedOgWeek = async (door, c, get, clock) => {
    const record = c === null ? null : await get(c);
    return loadPublishedOgWeek(door, record?.code ?? null, get, clock);
  };
  check("eager record read turns runtime gate red", (await runtimeChecks(eager)).length > 0);
  const publicPreview: typeof loadPublishedOgWeek = async (door, c, get, clock) =>
    loadPublishedOgWeek({ ...door, state: "ACTIVE", visible: true }, c, get, clock);
  check("STAFF_PREVIEW leak turns runtime gate red", (await runtimeChecks(publicPreview)).length > 0);
}

console.log(`MASWALI OG WEEK ${process.argv.includes("--prove-red") ? "red proof" : "guard"} passed`);
