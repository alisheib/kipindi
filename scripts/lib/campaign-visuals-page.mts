/**
 * test:campaign-visuals §page — U47b-2's claims: THE LIVE CAMPAIGN PAGE itself (ENGINE-SPEC §4.15; decisions 2–8).
 *
 * ⭐ WHY A LIBRARY BESIDE THE SUITE. `scripts/campaign-visuals.test.mts` is U47b-1's §svc (the services and the view-model, 30
 * claims); the page is the same unit's other half and its claims need their own world of imports — the client, the driver,
 * the actions' sources, the guards. They are written here, in the shape the repo gives a large case set (`scripts/lib/`), and
 * the suite runs them with its own harness (`claim`, the world, the viewers, the plants), so ONE run and ONE red run cover both.
 *   V1  ⛔ every figure on the page is a view-model field — no arithmetic on a count in the browser, executed on figures that do
 *       not add up (a derived number would show) and read in the source;
 *   V4  ⭐ the controls exist in every state — all five drawn in all seven statuses for three kinds of viewer, each disabled WITH
 *       its reason in `title`, enabled exactly where §4.15 says; never conditionally rendered;
 *   V5  ⭐ every action's guard is its FIRST statement, domain growth — the step takes `softCheckStaff` (a lapsed second factor is
 *       refused in words), the poll `softViewStaff` (the VIEW grant: a watcher is never an attempted escalation), the five
 *       presses `softRequireStaff` — and the view guard EXECUTED on the roles it must tell apart;
 *   V6  ⭐ the driver, executed: every gap, the stops, the mount's one step — a thrown call ends the loop and is never retried;
 *   V7  ⛔ E23 · the floor hides the split — rendered for a masked viewer under ten, nothing drawn for a figure that is null;
 *   V8  ⛔ OD24 · no money word on a GROWTH page, in its data, its markup or its source;
 *   V9  `CAMPAIGN_SCREENS.detail` is true exactly when the page exists;
 *   V10 the page's gate is its whole returned body (admin-section-gate §0b′), its title a literal, its head and ghost the same;
 *   V11 the first render and every act's answer — the load (ready · draft · missing, a failed read is not "missing"), an act's
 *       answer with the campaign beside it, a service that threw is `unfinished`, Resume asked once more after a `busy`;
 *   L2  the viewer is the STORED role's, failing closed — never the browser's word.
 * ⛔ This file holds no backslash (an editing tool decodes them): patterns are built from character classes and codes.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment } from "./decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CR = String.fromCharCode(13);
const NL = String.fromCharCode(10);
const DQ = String.fromCharCode(34);
const json = (v: unknown): string => JSON.stringify(v);
const rawRead = (rel: string): string => readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));

const DIR = "src/app/admin/campaigns/[id]/";
const DRIVER = await import("../../src/app/admin/campaigns/[id]/live-driver.tsx");
const RUN = await import("../../src/app/admin/campaigns/[id]/live-run.ts");
const LOADER = await import("../../src/app/admin/campaigns/[id]/live-loader.ts");
const VIEWER = await import("../../src/app/admin/campaigns/[id]/live-viewer.ts");
const CLIENT = await import("../../src/app/admin/campaigns/[id]/live-client.tsx");
const COPY = await import("../../src/app/admin/campaigns/[id]/live-copy.ts");
const GUARD = await import("../../src/lib/server/rbac-guard.ts");
const RBAC = await import("../../src/lib/server/rbac.ts");
const STATUS = await import("../../src/lib/marketing/campaign-status.ts");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { db } = await import("../../src/lib/server/store.ts");
const { getAuditPage, auditFlush } = await import("../../src/lib/server/audit.ts");

type CampaignLiveView = import("../../src/lib/server/marketing/campaign-live.ts").CampaignLiveView;
type LiveViewer = import("../../src/lib/server/marketing/campaign-live.ts").LiveViewer;
type StoredUser = import("../../src/lib/server/store.ts").StoredUser;
type LoopOptions = import("../../src/app/admin/campaigns/[id]/live-driver.tsx").LoopOptions;
type DriverStop = import("../../src/app/admin/campaigns/[id]/live-driver.tsx").DriverStop;

/* ══ THE LABELS — each once, so a red case names exactly the claims it must turn red ═════════════════════════════════ */

export const LABELS = {
  v1: "V1 · ⛔ EVERY FIGURE ON THE PAGE IS A VIEW-MODEL FIELD (OD26, OD34) — rendered over figures that do not add up (1,234 on the campaign, 100 + 20 + 5 + 1 + 9 beside them, a bar at 321 of 1,234) each tile, the bar and its caption print exactly their own field and no sum, difference or percentage appears; and no file that prints a figure (client, page, ghost) does arithmetic on a count, reads a clock for the bar or formats money",
  v4: "V4 · ⭐ THE CONTROLS EXIST IN EVERY STATE — all five drawn, in the spec's order, in all seven statuses for a reader, a GROWTH officer and a viewer who may not act; each disabled WITH its reason in title (the view's own words, the role's for a watcher), enabled exactly where §4.15 says (Start CONFIRMED · Pause PREPARING, RUNNING · Resume PAUSED · Stop any non-terminal · Make a copy any non-draft); drawn by one map over all five, never behind a condition",
  v5: "V5 · ⭐ EVERY ACTION'S GUARD IS ITS FIRST STATEMENT, DOMAIN GROWTH — seven exports and no other; the step takes softCheckStaff (a lapsed second factor is refused in words), the poll softViewStaff, the five presses softRequireStaff; each guard before any viewer, rate check or service; the view guard EXECUTED: a role with Growth VIEW alone passes and writes no security row (where the act guard refuses it and writes one), a role with no VIEW grant is refused with a SECURITY row, the Owner passes, a lapsed or never-set-up second factor is refused in words and never redirected to, the role is judged before the factor, a cookie's claim of ADMIN over a stored role is refused, and no session goes to the sign-in page",
  v6: "V6 · ⭐ THE DRIVER, EXECUTED — a page that may act on a running campaign steps at once and again after 2 s when work was done, after the wait's until (never under 5 s, never over 30 s) when the engine waits, after 5 s when another step held the flight; a viewer who may not act polls every 10 s and makes NO step call; the mount of a paused, stopped or finished campaign steps ONCE; the loop ends on a terminal status and when the status needs another mode; ⛔ a thrown call ends it with the out-of-date state and is NEVER retried (one call, no sleep); a lapsed second factor, a role that may not act, a view that may not be read and a campaign that is gone each stop it with their sentence; a cancelled loop makes no further call; never two calls at once",
  v7: "V7 · ⛔ E23 · THE FLOOR HIDES THE SPLIT, ON THE PAGE — a masked viewer on a campaign of 9 rows is drawn On campaign 9 and the floor's sentence and NOTHING else: no other tile, no reason, no chip; a reader of the same 9 is drawn all six tiles, the reasons and the chips and no sentence; the client draws a tile only for a figure that is not null (never a zero in its place)",
  v8: "V8 · ⛔ OD24 · NO 'TZS' ON A GROWTH PAGE — the view of a campaign with a frozen estimate and limit carries no money and no TZS for GROWTH, its page markup has none, and none of the page's files formats money or asks the decider; the reader's Start dialog says the cost and the limit (the control)",
  v9: "V9 · CAMPAIGN_SCREENS.detail is true exactly when /admin/campaigns/[id]/page.tsx exists (and compose exactly when the composer's does) — the list links only to a page that is there (test:campaigns-page 5f holds the list's side)",
  v10: "V10 · THE PAGE GATE'S SHAPE (admin-section-gate §0b′) — one return, a literal title 'SMS campaign' equal to LIVE_TITLE on a gate whose only child is self-closing; the head and the ghost draw the same literal title and the copied gloss 'Kampeni' (LIVE_SW); a static metadata title and no generateMetadata; the four inert spellings the gate suite plants are refused and the canonical one accepted",
  v11: "V11 · THE FIRST RENDER AND EVERY ACT'S ANSWER — the load: ready (carrying whether the viewer may act, from the stored role), a draft told apart, a campaign that is not there 'missing', and a read that FAILS rejected — never 'missing', never a zero; an act that landed invalidates the list ONCE and answers with the campaign as it is now, a refusal invalidates nothing; a service that THREW after it was handed the campaign answers 'unfinished' in LIVE_ACT_UNFINISHED's words with the campaign beside it (the log names the error's type alone); a view that cannot be read leaves the act's answer whole; Resume answered busy is asked ONCE more after a second, any other answer once, and a second busy is said",
  l2: "L2 · THE VIEWER IS THE STORED ROLE'S, FAILING CLOSED — liveViewerFor reads the officer's own row once and asks its three cells of THAT role (a stored GROWTH may act and may not read a number or money; the Owner may all three; a role with no growth grant may not act); no officer, no row, a role that cannot be read and each cell that throws or answers anything but true are the closed viewer; every action hands the services THAT viewer (never a field the browser posted — the actions take one parameter, the campaign's id)",
} as const;
export type PageLabel = (typeof LABELS)[keyof typeof LABELS];
/** The suite's own P1 label — R-P3 must turn exactly that claim red; the suite hands it over before the plants are built. */
let P1_LABEL = "P1";
export function setPhoneLabel(label: string): void { P1_LABEL = label; }

/* ══ THE SOURCES AND THE IMPLEMENTATION UNDER TEST — swapped piece by piece by the plants ════════════════════════════ */

export type PageSources = {
  actions: string; client: string; driver: string; page: string; loading: string; run: string; loader: string; viewer: string;
  copy: string; status: string;
};
const REAL_SOURCES: PageSources = {
  actions: code(`${DIR}actions.ts`), client: code(`${DIR}live-client.tsx`), driver: code(`${DIR}live-driver.tsx`),
  page: code(`${DIR}page.tsx`), loading: code(`${DIR}loading.tsx`), run: code(`${DIR}live-run.ts`), loader: code(`${DIR}live-loader.ts`),
  viewer: code(`${DIR}live-viewer.ts`), copy: code(`${DIR}live-copy.ts`), status: code("src/lib/marketing/campaign-status.ts"),
};

export type PageImpl = {
  /** The static markup of the page's three bodies (status · controls · figures) for a view and whether its viewer may act. */
  render: (view: CampaignLiveView, o: { mayAct: boolean }) => string;
  loop: typeof DRIVER.runLiveLoop;
  gap: typeof DRIVER.stepGap;
  mode: typeof DRIVER.driverMode;
  load: typeof LOADER.loadLive;
  runAct: typeof RUN.runAct;
  resumeRetry: typeof RUN.resumeWithRetry;
  viewerFor: typeof VIEWER.liveViewerFor;
  /** The VIEW guard (`softViewStaff`) — the poll's. */
  viewGuard: typeof GUARD.softViewStaff;
  screens: { compose: boolean; detail: boolean };
  sources: PageSources;
};

/** The three bodies in the page's own blocks, inside the client provider and the app router, exactly as the page composes them. */
function renderPage(view: CampaignLiveView, o: { mayAct: boolean }): string {
  const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router as never },
      createElement(CLIENT.LiveProvider, { initial: view, mayAct: o.mayAct, children: [
        createElement("div", { key: "s", "data-block": "live-status" }, createElement(CLIENT.LiveStatus)),
        createElement("div", { key: "c", "data-block": "live-controls" }, createElement(CLIENT.LiveControls)),
        createElement(CLIENT.LiveWhenListed, { key: "p" }, createElement("div", { "data-block": "live-progress" }, createElement(CLIENT.LiveProgress))),
      ] })));
}

export const REAL_PAGE: PageImpl = {
  render: renderPage,
  loop: DRIVER.runLiveLoop,
  gap: DRIVER.stepGap,
  mode: DRIVER.driverMode,
  load: LOADER.loadLive,
  runAct: RUN.runAct,
  resumeRetry: RUN.resumeWithRetry,
  viewerFor: VIEWER.liveViewerFor,
  viewGuard: GUARD.softViewStaff,
  screens: STATUS.CAMPAIGN_SCREENS,
  sources: REAL_SOURCES,
};

/* ══ THE PIECES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The harness the suite hands in: its claim runner, its world, its viewers. */
export type PageHarness = {
  claim: (label: string, body: () => Promise<[boolean, string]>) => Promise<void>;
  /** The campaign as this viewer may see it, through the implementation under test. */
  view: (id: string, viewer: LiveViewer) => Promise<CampaignLiveView>;
  /** A campaign walked through the one transition door (the suite's `campaign`). */
  campaign: (key: string, shape: { path: string[]; count?: number; name?: string; estimateTzs?: number | null; budgetTzs?: number | null }) => Promise<{ id: string }>;
  rows: (id: string, shapes: ReadonlyArray<{ status: string; skipReason?: string; failureClass?: string }>) => Promise<string[]>;
  many: (n: number, s: { status: string; skipReason?: string; failureClass?: string }) => Array<{ status: string; skipReason?: string; failureClass?: string }>;
  READER: LiveViewer; GROWTH: LiveViewer; WATCHER: LiveViewer;
  /** Keep a rendered page or an answer for the phone-number sweep (P1). */
  see: (text: string) => void;
  run: number;
};

const UNESCAPES: Array<[string, string]> = [["&#x27;", "'"], ["&quot;", DQ], ["&lt;", "<"], ["&gt;", ">"], ["&amp;", "&"]];
const unescapeHtml = (s: string): string => UNESCAPES.reduce((t, [from, to]) => t.split(from).join(to), s);
/** The opening tag that carries `needle`. */
function tagAt(html: string, needle: string): string | null {
  const at = html.indexOf(needle);
  if (at < 0) return null;
  const open = html.lastIndexOf("<", at);
  const close = html.indexOf(">", at);
  return open < 0 || close < 0 ? null : html.slice(open, close + 1);
}
/** An attribute's (unescaped) value, "" for a boolean one, null when it is not there. */
function attrOf(tag: string | null, name: string): string | null {
  if (tag === null) return null;
  const key = ` ${name}=${DQ}`;
  const at = tag.indexOf(key);
  if (at < 0) return null;
  const from = at + key.length;
  return unescapeHtml(tag.slice(from, tag.indexOf(DQ, from)));
}
/** The markup with every tag taken out. */
const textOfHtml = (html: string): string => html.split("<").map((p, i) => (i === 0 ? p : p.slice(p.indexOf(">") + 1))).join("");
/** The text of a control: from the end of its opening tag to the next closing button tag. */
function buttonText(html: string, act: string): string | null {
  const tag = tagAt(html, `data-live-control=${DQ}${act}${DQ}`);
  if (tag === null) return null;
  const from = html.indexOf(tag) + tag.length;
  return unescapeHtml(textOfHtml(html.slice(from, html.indexOf("</button>", from))));
}
const ACTS = ["start", "pause", "resume", "stop", "copy"] as const;
type Act = (typeof ACTS)[number];
const LABEL_OF: Record<Act, string> = { start: "Start…", pause: "Pause", resume: "Resume", stop: "Stop…", copy: "Make a copy" };

/** Enabled controls by status — §4.15 decision 4, written out. */
const ON: Record<string, Act[]> = {
  DRAFT: [], CONFIRMED: ["start", "stop", "copy"], PREPARING: ["pause", "stop", "copy"], RUNNING: ["pause", "stop", "copy"],
  PAUSED: ["resume", "stop", "copy"], DONE: ["copy"], CANCELLED: ["copy"],
};
const PATHS: Record<string, string[]> = {
  DRAFT: [], CONFIRMED: ["CONFIRMED"], PREPARING: ["CONFIRMED", "PREPARING"], RUNNING: ["CONFIRMED", "PREPARING", "RUNNING"],
  PAUSED: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], DONE: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], CANCELLED: ["CONFIRMED", "CANCELLED"],
};

/** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
export const plantIn = (src: string, from: string, to: string): string => {
  if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
  return src.replace(from, to);
};

/** The brace-matched body of `export async function name(` — null when it is not there. */
function bodyOf(src: string, name: string): string | null {
  const at = src.indexOf(`export async function ${name}(`);
  if (at < 0) return null;
  const open = src.indexOf("{", src.indexOf(")", at));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(open + 1, i); }
  }
  return null;
}

/** A fake view for the loop, which reads nothing of it but the status. */
const viewAt = (status: string): CampaignLiveView => ({ status } as unknown as CampaignLiveView);
const OK_STEP = (status: string, step: Record<string, unknown>, said: string | null = null) =>
  ({ ok: true as const, step: step as never, said, view: viewAt(status) });
const OK_VIEW = (status: string) => ({ ok: true as const, view: viewAt(status) });

/** One run of the loop with stand-in calls: every sleep recorded (and not slept), every call counted, every stop kept. */
async function loopRun(impl: PageImpl, o: {
  mode: "drive" | "watch" | "off"; mayAct: boolean; reap?: boolean; pollFirst?: boolean; now?: number;
  steps?: unknown[]; polls?: unknown[]; cancelAfterSleeps?: number;
}) {
  const sleeps: number[] = [];
  const stops: DriverStop[] = [];
  const said: Array<string | null> = [];
  const views: string[] = [];
  const calls: string[] = [];
  let inFlight = 0;
  let overlap = false;
  let reaped = 0;
  let stepped = 0;
  const steps = [...(o.steps ?? [])];
  const polls = [...(o.polls ?? [])];
  const answer = async (queue: unknown[], kind: string) => {
    calls.push(kind);
    if (++inFlight > 1) overlap = true;
    try {
      await Promise.resolve();
      const next = queue.shift();
      if (next instanceof Error) throw next;
      if (next === undefined) throw new Error(`the stand-in has no ${kind} answer left`);
      return next as never;
    } finally {
      inFlight--;
    }
  };
  const options: LoopOptions = {
    id: "cmp_x", mode: o.mode, mayAct: o.mayAct, reap: o.reap === true, pollFirst: o.pollFirst === true,
    step: () => answer(steps, "step"), poll: () => answer(polls, "poll"),
    sleep: async (ms) => { sleeps.push(ms); },
    now: () => o.now ?? 1_000_000,
    cancelled: () => o.cancelAfterSleeps !== undefined && sleeps.length > o.cancelAfterSleeps,
    onView: (v) => { views.push(v.status); },
    onSaid: (s) => { said.push(s); },
    onStop: (s) => { stops.push(s); },
    onCall: () => {},
    onStepped: () => { stepped++; },
    onReaped: () => { reaped++; },
  };
  let threw: string | null = null;
  try {
    await impl.loop(options);
  } catch (err) {
    threw = String((err as Error)?.message ?? err);
  }
  return { sleeps, stops, said, views, calls, overlap, reaped, stepped, threw };
}

/* ══ THE CLAIMS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export async function pageClaims(impl: PageImpl, h: PageHarness): Promise<void> {
  const L = LABELS;
  const P = impl;
  const S = P.sources;
  const { READER, GROWTH, WATCHER } = h;
  const viewerOf = (v: LiveViewer) => ({ mayAct: v.mayAct });

  /* ── V1 · every figure is a view field ── */
  await h.claim(L.v1, async () => {
    const base = await h.campaign("pv1", { path: PATHS.RUNNING, count: 1234 });
    await h.rows(base.id, [...h.many(3, { status: "SENT" }), ...h.many(2, { status: "PENDING" })]);
    const real = await h.view(base.id, READER);
    // Figures that do not add up: any number the browser derived would be one of the sums below.
    const odd: CampaignLiveView = {
      ...real,
      kpis: { onCampaign: 1234, handedOver: 100, failed: 20, notSent: 5, noAnswer: 1, waiting: 9 },
      progress: { phase: "sending", value: 321, max: 1234 },
    };
    const html = P.render(odd, viewerOf(READER));
    h.see(html);
    const tile = (name: string): string => {
      const tag = tagAt(html, `data-live-kpi=${DQ}${name}${DQ}`);
      if (tag === null) return "";
      const from = html.indexOf(tag);
      return textOfHtml(html.slice(from, html.indexOf("</div></div>", from) + 12));
    };
    const printed = { onCampaign: tile("onCampaign"), handedOver: tile("handedOver"), failed: tile("failed"), notSent: tile("notSent"), noAnswer: tile("noAnswer"), waiting: tile("waiting") };
    const own = printed.onCampaign.endsWith("1,234") && printed.handedOver.endsWith("100") && printed.failed.endsWith("20")
      && printed.notSent.endsWith("5") && printed.noAnswer.endsWith("1") && printed.waiting.endsWith("9");
    const barTag = tagAt(html, "role=" + DQ + "progressbar" + DQ);
    const bar = attrOf(barTag, "aria-valuenow") === "321" && attrOf(barTag, "aria-valuemax") === "1234" && attrOf(barTag, "aria-valuetext") === "321 of 1,234 processed";
    // no sum (135), no remainder (1,099), no percentage (26%) appears anywhere
    const derived = ["135", "1,099", "1,108", "26%", "26.0", "74%"].filter((d) => html.includes(d));
    // the source: no arithmetic on a figure in a file that PRINTS one; the driver holds no figure at all
    const PRINTS: Array<[string, string]> = [["live-client.tsx", S.client], ["page.tsx", S.page], ["loading.tsx", S.loading]];
    const BANNED = ["Math.", ".reduce(", "parseInt(", "parseFloat(", "Number(", ".toFixed(", ".toLocaleString(", "Intl.", "Date.now(", "new Date(", "setInterval", "setTimeout", "formatTzs"];
    const FIELD = "(?:value|max|count|onCampaign|handedOver|failed|notSent|noAnswer|waiting|length)";
    const OP = "[-+*/%]";
    const after = new RegExp("[.]" + FIELD + "[)]?[ ]*" + OP + "[ ]*[A-Za-z0-9_(]");
    const before = new RegExp("[A-Za-z0-9_)][ ]*" + OP + "[ ]*[A-Za-z0-9_.]*[.]" + FIELD + "(?![A-Za-z0-9_])");
    const worked = PRINTS.flatMap(([file, text]) => [
      ...BANNED.filter((b) => text.includes(b)).map((b) => `${file}: ${b}`),
      ...(after.test(text) || before.test(text) ? [`${file}: arithmetic on a figure`] : []),
    ]);
    const driverFigure = ["kpis", "progress", "chips", "notSentReasons", "formatNumber"].filter((t) => S.driver.includes(t));
    return [own && bar && derived.length === 0 && worked.length === 0 && driverFigure.length === 0,
      `tiles ${json(printed)} · bar ${barTag === null ? "none" : `${attrOf(barTag, "aria-valuenow")}/${attrOf(barTag, "aria-valuemax")}`} · derived [${derived.join(",")}] · source [${worked.join("; ")}] · driver [${driverFigure.join(",")}]`];
  });

  /* ── V4 · the controls exist in every state ── */
  await h.claim(L.v4, async () => {
    const wrong: string[] = [];
    let drawn = 0;
    const viewers: Array<[string, LiveViewer]> = [["reader", READER], ["growth", GROWTH], ["watcher", WATCHER]];
    for (const status of Object.keys(PATHS)) {
      const c = await h.campaign(`pv4${status.toLowerCase()}`, { path: PATHS[status], count: 12 });
      for (const [who, v] of viewers) {
        const view = await h.view(c.id, v);
        const html = P.render(view, viewerOf(v));
        h.see(html);
        const at = ACTS.map((a) => html.indexOf(`data-live-control=${DQ}${a}${DQ}`));
        const ordered = at.every((x, i) => x > 0 && (i === 0 || x > at[i - 1]));
        if (!ordered) wrong.push(`${status}/${who}: the five are not drawn in order`);
        for (const a of ACTS) {
          const tag = tagAt(html, `data-live-control=${DQ}${a}${DQ}`);
          if (tag === null) { wrong.push(`${status}/${who}/${a}: not drawn`); continue; }
          drawn++;
          const off = attrOf(tag, "disabled") !== null;
          const title = attrOf(tag, "title");
          const want = v.mayAct && ON[status].includes(a);
          if (off === want) wrong.push(`${status}/${who}/${a}: ${off ? "disabled" : "enabled"}`);
          if (off && (title === null || title === "")) wrong.push(`${status}/${who}/${a}: disabled with no reason in title`);
          if (off && title !== view.controls[a].reason) wrong.push(`${status}/${who}/${a}: title is not the view's reason`);
          if (!v.mayAct && title !== COPY.LIVE_DISABLED.role) wrong.push(`${status}/${who}/${a}: a watcher's reason is not the role's`);
          if (!off && title !== null) wrong.push(`${status}/${who}/${a}: enabled but carries a reason`);
          if (buttonText(html, a) !== LABEL_OF[a]) wrong.push(`${status}/${who}/${a}: its words are "${buttonText(html, a)}"`);
        }
      }
    }
    // the source: one map over all five, no condition around a control
    const mapAt = S.client.indexOf("{ACTS.map((act) => {");
    const mapEnd = mapAt < 0 ? -1 : S.client.indexOf("})}", mapAt);
    const map = mapAt < 0 || mapEnd < 0 ? "" : S.client.slice(mapAt, mapEnd);
    const unconditional = map.includes("<Button") && map.includes("disabled={!s.enabled}") && map.includes("title={s.reason ?? undefined}")
      && !map.includes("? <Button") && !map.includes("&& <Button") && !map.includes(".filter(");
    return [wrong.length === 0 && drawn === 7 * 3 * 5 && unconditional,
      `${drawn} controls drawn · wrong [${wrong.slice(0, 5).join("; ")}] · one unconditional map ${unconditional}`];
  });

  /* ── V5 · the guards ── */
  await h.claim(L.v5, async () => {
    const src = S.actions;
    const want: Array<[string, string, string]> = [
      ["campaignStepAction", "softCheckStaff", "step"], ["campaignViewAction", "softViewStaff", "view"],
      ["startCampaignAction", "softRequireStaff", "start"], ["pauseCampaignAction", "softRequireStaff", "pause"],
      ["resumeCampaignAction", "softRequireStaff", "resume"], ["stopCampaignAction", "softRequireStaff", "stop"],
      ["copyCampaignAction", "softRequireStaff", "copy"],
    ];
    const exported = Array.from(src.matchAll(/export async function ([A-Za-z0-9_]+)[(]/g), (m) => m[1]).sort();
    const only = json(exported) === json(want.map(([n]) => n).sort());
    const directive = rawRead(`${DIR}actions.ts`).trimStart().startsWith(`${DQ}use server${DQ}`);
    const wrong: string[] = [];
    for (const [name, guard, tag] of want) {
      const body = bodyOf(src, name);
      if (body === null) { wrong.push(`${name}: not found`); continue; }
      const head = `const g = await ${guard}(${DQ}growth${DQ}, ${DQ}marketing.campaign.${tag}${DQ}, `;
      if (!body.trimStart().startsWith(head)) wrong.push(`${name}: the first statement is not ${guard}("growth", "marketing.campaign.${tag}", …)`);
      const guardAt = body.indexOf(head);
      if (guardAt < 0) wrong.push(`${name}: no guard`);
      const later = ["liveViewerFor(", "rateCheckAsync(", "runAct(", "campaignStep(", "campaignLiveView(", "Campaign("].map((t) => body.indexOf(t)).filter((x) => x >= 0);
      if (later.some((x) => x < guardAt + head.length)) wrong.push(`${name}: a viewer, rate check or service comes before its guard ends`);
      if (name !== "campaignStepAction" && body.includes("refuseSecondFactor")) wrong.push(`${name}: a press must keep the step-up (no refuseSecondFactor)`);
    }
    const domainOk = VIEWER.LIVE_DOMAIN === "growth";
    // ── the view guard, EXECUTED on the roles it must tell apart ──
    const at = "2026-10-08T08:00:00.000Z";
    const user = async (id: string, role: StoredUser["role"], n: number) => {
      if (!(await db.user.findById(id))) {
        await db.user.create({
          id, phoneE164: `+255680${String(h.run).padStart(3, "0").slice(-3)}${String(n).padStart(3, "0")}`, email: null, passwordHash: null, passwordSalt: null,
          failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "SW", displayName: `V5 ${role}`, dob: "1990-01-01", region: null,
          acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
          createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
        } as StoredUser);
      }
      return id;
    };
    const ids = {
      aud: await user(`usr_u47b2_v5_aud_${h.run}`, "AUDITOR", 1), sup: await user(`usr_u47b2_v5_sup_${h.run}`, "SUPPORT", 2),
      adm: await user(`usr_u47b2_v5_adm_${h.run}`, "ADMIN", 3), grw: await user(`usr_u47b2_v5_grw_${h.run}`, "GROWTH", 4),
    };
    const session = (userId: string, role: string) => ({ userId, sessionId: `s_${userId}`, phoneE164: "+255680000000", role, kycStatus: "NOT_STARTED", iat: 0, exp: Date.now() + 3_600_000, lastSeenAt: 0 });
    const request = (s: ReturnType<typeof session> | null, factor: string, asked: string[]) =>
      ({ session: async () => s, secondFactor: async () => { asked.push("factor"); return factor; } }) as never;
    const REFUSAL = "v5 · this role may not look at campaigns.";
    const ACTION = `u47b2.view.${h.run}`;
    const blocked = async () => { await auditFlush(); return getAuditPage({ category: "SECURITY", limit: 10_000 }).filter((e) => e.action === "privilege_escalation_blocked" && e.targetId === ACTION).length; };
    const outcome = async (run: () => Promise<unknown>) => {
      try { return { verdict: (await run()) as { ok: boolean; error?: string; secondFactor?: true; userId?: string }, to: null as string | null }; }
      catch (err) {
        const digest = String((err as { digest?: unknown } | null)?.digest ?? "");
        return { verdict: null, to: digest.startsWith("NEXT_REDIRECT;") ? digest.split(";").slice(2, -2).join(";") : `threw ${(err as Error)?.message}` };
      }
    };
    const exec: string[] = [];
    try {
      await RBAC.setRoleGrant("AUDITOR", "growth", true, false, ids.adm);
      const before = await blocked();
      const askedA: string[] = [];
      const watcher = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(session(ids.aud, "AUDITOR"), "ok", askedA)));
      const afterWatcher = await blocked();
      const act = await outcome(() => GUARD.softCheckStaff("growth", ACTION, REFUSAL, request(session(ids.aud, "AUDITOR"), "ok", [])));
      const afterAct = await blocked();
      const askedS: string[] = [];
      const support = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(session(ids.sup, "SUPPORT"), "unverified", askedS)));
      const afterSupport = await blocked();
      const cookie = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(session(ids.sup, "ADMIN"), "ok", [])));
      const owner = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(session(ids.adm, "ADMIN"), "ok", [])));
      const lapsed = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(session(ids.grw, "GROWTH"), "unverified", [])));
      const unset = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(session(ids.adm, "ADMIN"), "not-enrolled", [])));
      const anon = await outcome(() => P.viewGuard("growth", ACTION, REFUSAL, request(null, "ok", [])));
      if (!(watcher.verdict?.ok === true && askedA.length === 1 && afterWatcher === before)) exec.push("a role with Growth VIEW alone is not let through quietly");
      if (!(act.verdict?.ok === false && act.verdict.error === REFUSAL && afterAct === afterWatcher + 1)) exec.push("the act guard does not refuse (and record) the same role");
      if (!(support.verdict?.ok === false && support.verdict.error === REFUSAL && afterSupport === afterAct + 1 && askedS.length === 0)) exec.push("a role with no VIEW grant is not refused first with a SECURITY row");
      if (!(cookie.verdict?.ok === false && cookie.verdict.error === REFUSAL)) exec.push("a cookie's claim of ADMIN beat the stored role");
      if (!(owner.verdict?.ok === true)) exec.push("the Owner is refused");
      if (!(lapsed.verdict?.ok === false && lapsed.verdict.secondFactor === true && lapsed.verdict.error === GUARD.SECOND_FACTOR_LAPSED && lapsed.to === null)) exec.push("a lapsed factor is not refused in words");
      if (!(unset.verdict?.ok === false && unset.verdict.secondFactor === true && unset.verdict.error === GUARD.SECOND_FACTOR_NOT_SET_UP && unset.to === null)) exec.push("a factor never set up is not refused in words");
      if (!(anon.verdict === null && anon.to === "/auth/admin")) exec.push(`no session did not go to the sign-in page (${anon.to})`);
    } finally {
      await RBAC.resetRoleGrantsToDefaults();
    }
    return [only && directive && wrong.length === 0 && domainOk && exec.length === 0,
      `exports ${only} · "use server" ${directive} · guards [${wrong.slice(0, 3).join("; ")}] · domain ${VIEWER.LIVE_DOMAIN} · executed [${exec.join("; ")}]`];
  });

  /* ── V6 · the driver, executed ── */
  await h.claim(L.v6, async () => {
    const NOW = 1_000_000;
    const at = (ms: number) => new Date(NOW + ms).toISOString();
    const wait = (until: string | null) => ({ kind: "waiting", busy: false, until });
    const busy = { kind: "waiting", busy: true, until: null };
    const wrote = { kind: "sent" };
    const wrong: string[] = [];
    // ── DRIVE: at once; 2 s after work; the wait's until, 5–30 s; 5 s busy; ends on the terminal status ──
    const d = await loopRun(P, {
      mode: "drive", mayAct: true, now: NOW,
      steps: [
        OK_STEP("RUNNING", wrote), OK_STEP("RUNNING", wait(at(12_000)), "Waiting for the send window."), OK_STEP("RUNNING", busy, "Another step."),
        OK_STEP("RUNNING", wait(at(120_000))), OK_STEP("RUNNING", wait(at(1_000))), OK_STEP("RUNNING", wait(null)), OK_STEP("RUNNING", wrote),
        OK_STEP("DONE", { kind: "finished" }),
      ],
    });
    if (json(d.sleeps) !== json([2_000, 12_000, 5_000, 30_000, 5_000, 5_000, 2_000])) wrong.push(`the gaps are ${json(d.sleeps)}`);
    if (d.calls.filter((c) => c === "step").length !== 8 || d.calls.includes("poll")) wrong.push(`calls ${d.calls.join(",")}`);
    if (d.stops.length !== 0 || d.threw !== null || d.overlap) wrong.push(`stops ${json(d.stops)} threw ${d.threw} overlap ${d.overlap}`);
    if (json(d.said.slice(0, 3)) !== json([null, "Waiting for the send window.", "Another step."])) wrong.push(`said ${json(d.said.slice(0, 3))}`);
    // ── WATCH: every 10 s, a poll — and not one step call ──
    const w = await loopRun(P, { mode: "watch", mayAct: false, now: NOW, polls: [OK_VIEW("RUNNING"), OK_VIEW("RUNNING"), OK_VIEW("DONE")] });
    if (json(w.sleeps) !== json([10_000, 10_000, 10_000]) || w.calls.some((c) => c === "step") || w.calls.length !== 3) wrong.push(`the watcher: sleeps ${json(w.sleeps)} calls ${w.calls.join(",")}`);
    if (P.mode("RUNNING", false) !== "watch" || P.mode("PREPARING", false) !== "watch" || P.mode("RUNNING", true) !== "drive" || P.mode("PAUSED", true) !== "watch"
      || P.mode("CONFIRMED", true) !== "watch" || P.mode("DONE", true) !== "off" || P.mode("CANCELLED", false) !== "off") wrong.push("the mode of a status is wrong");
    // ── MOUNT: one step for a paused, stopped or finished campaign — a paused one then watches, the others end ──
    const paused = await loopRun(P, { mode: "watch", mayAct: true, reap: true, now: NOW, steps: [OK_STEP("PAUSED", { kind: "reaped" })], polls: [OK_VIEW("DONE")] });
    if (json(paused.calls) !== json(["step", "poll"]) || paused.reaped !== 1 || json(paused.sleeps) !== json([10_000])) wrong.push(`mount of a paused campaign: ${paused.calls.join(",")} reaped ${paused.reaped} sleeps ${json(paused.sleeps)}`);
    for (const status of ["DONE", "CANCELLED"]) {
      const over = await loopRun(P, { mode: "off", mayAct: true, reap: true, now: NOW, steps: [OK_STEP(status, { kind: "reaped" })] });
      if (json(over.calls) !== json(["step"]) || over.reaped !== 1 || over.sleeps.length !== 0) wrong.push(`mount of a ${status} campaign: ${over.calls.join(",")}`);
    }
    const idle = await loopRun(P, { mode: "off", mayAct: true, now: NOW });
    if (idle.calls.length !== 0 || idle.sleeps.length !== 0) wrong.push("an off loop called something");
    // ── a status that needs another mode ends this loop (the hook starts the next) ──
    const flip = await loopRun(P, { mode: "drive", mayAct: true, now: NOW, steps: [OK_STEP("PAUSED", { kind: "paused" })] });
    if (json(flip.calls) !== json(["step"]) || flip.sleeps.length !== 0 || flip.stops.length !== 0) wrong.push(`a pause did not end the drive: ${flip.calls.join(",")} sleeps ${json(flip.sleeps)}`);
    // ── ⛔ a thrown call: ONE call, no sleep, the out-of-date stop — never retried ──
    const thrown = await loopRun(P, { mode: "drive", mayAct: true, now: NOW, steps: [new Error("a deploy's new action ids"), OK_STEP("RUNNING", wrote), OK_STEP("RUNNING", wrote)] });
    if (json(thrown.calls) !== json(["step"]) || thrown.sleeps.length !== 0 || json(thrown.stops) !== json([{ kind: "out_of_date" }])) wrong.push(`a thrown step: calls ${thrown.calls.join(",")} sleeps ${json(thrown.sleeps)} stops ${json(thrown.stops)}`);
    const thrownPoll = await loopRun(P, { mode: "watch", mayAct: false, pollFirst: true, now: NOW, polls: [new Error("offline"), OK_VIEW("RUNNING")] });
    if (json(thrownPoll.calls) !== json(["poll"]) || json(thrownPoll.stops) !== json([{ kind: "out_of_date" }])) wrong.push(`a thrown poll: calls ${thrownPoll.calls.join(",")} stops ${json(thrownPoll.stops)}`);
    // ── the refusals, each with its sentence ──
    const refuse = async (answer: unknown, mode: "drive" | "watch") =>
      loopRun(P, { mode, mayAct: mode === "drive", pollFirst: mode === "watch", now: NOW, steps: [answer, OK_STEP("RUNNING", wrote)], polls: [answer, OK_VIEW("RUNNING")] });
    const factor = await refuse({ ok: false, reason: "second_factor", error: "Your 2-step sign-in has lapsed.", href: "/admin/totp-verify" }, "drive");
    const role = await refuse({ ok: false, reason: "role", error: "Your role can't act." }, "drive");
    const looks = await refuse({ ok: false, reason: "role", error: "Your role can't look." }, "watch");
    const gone = await refuse({ ok: false, reason: "not_found", error: "This campaign was not found." }, "drive");
    const stopsOk = json(factor.stops) === json([{ kind: "second_factor", sentence: "Your 2-step sign-in has lapsed.", href: "/admin/totp-verify" }])
      && json(role.stops) === json([{ kind: "role", sentence: "Your role can't act." }])
      && json(looks.stops) === json([{ kind: "view_refused", sentence: "Your role can't look." }])
      && json(gone.stops) === json([{ kind: "gone", sentence: "This campaign was not found." }])
      && [factor, role, looks, gone].every((r) => r.calls.length === 1 && r.sleeps.length === 0);
    if (!stopsOk) wrong.push(`a refusal's stop: ${json([factor.stops, role.stops, looks.stops, gone.stops])}`);
    // ── cancelled: no call after it ──
    const cancelled = await loopRun(P, { mode: "drive", mayAct: true, now: NOW, cancelAfterSleeps: 1, steps: [OK_STEP("RUNNING", wrote), OK_STEP("RUNNING", wrote), OK_STEP("RUNNING", wrote)] });
    if (cancelled.calls.length !== 2) wrong.push(`a cancelled loop kept calling (${cancelled.calls.length} calls)`);
    // ── the gap function on its own: the spec's three ──
    const gaps = [P.gap({ kind: "sent" }, NOW), P.gap(wait(at(8_000)), NOW), P.gap(wait(at(500)), NOW), P.gap(wait(at(999_999)), NOW), P.gap(busy, NOW), P.gap(wait("not a date"), NOW)];
    if (json(gaps) !== json([2_000, 8_000, 5_000, 30_000, 5_000, 5_000])) wrong.push(`stepGap ${json(gaps)}`);
    const constants = DRIVER.STEP_GAP_MS === 2_000 && DRIVER.WAIT_MIN_MS === 5_000 && DRIVER.WAIT_MAX_MS === 30_000 && DRIVER.BUSY_GAP_MS === 5_000 && DRIVER.POLL_GAP_MS === 10_000;
    // ── the hook is keyed on the MODE: a status within a mode must not restart the loop and skip the gap after a step ──
    const keyed = S.driver.includes("[id, mode, mayAct, step, poll, attempt, stop]");
    return [wrong.length === 0 && constants && keyed,
      `wrong [${wrong.join(" | ")}] · constants ${constants} · hook keyed on the mode ${keyed} · ${d.calls.length + w.calls.length} stand-in calls`];
  });

  /* ── V7 · the floor, on the page ── */
  await h.claim(L.v7, async () => {
    const nine = await h.campaign("pv7a", { path: PATHS.RUNNING, count: 9 });
    await h.rows(nine.id, [...h.many(5, { status: "SENT" }), ...h.many(4, { status: "SKIPPED", skipReason: "rg_self_excluded" })]);
    const masked = await h.view(nine.id, GROWTH);
    const reader = await h.view(nine.id, READER);
    const htmlMasked = P.render(masked, viewerOf(GROWTH));
    const htmlReader = P.render(reader, viewerOf(READER));
    h.see(htmlMasked);
    h.see(htmlReader);
    const kpis = (html: string) => Array.from(html.matchAll(/data-live-kpi="([A-Za-z]+)"/g), (m) => m[1]);
    const maskedSaid = unescapeHtml(htmlMasked).includes(COPY.LIVE_FLOOR);
    const maskedDraws = json(kpis(htmlMasked)) === json(["onCampaign"]) && htmlMasked.includes("data-live-floor") && maskedSaid
      && !htmlMasked.includes("data-live-reasons") && !htmlMasked.includes("data-live-chips");
    const readerDraws = json(kpis(htmlReader)) === json(["onCampaign", "handedOver", "failed", "notSent", "noAnswer", "waiting"]) && htmlReader.includes("data-live-reasons")
      && htmlReader.includes("data-live-chips") && !htmlReader.includes("data-live-floor");
    // the source: a tile only for a figure that is not null — no zero in its place
    const guarded = ["handedOver", "failed", "notSent", "noAnswer", "waiting"].every((k) => S.client.includes(`k.${k} !== null && <Figure name=${DQ}${k}${DQ} value={k.${k}} />`))
      && !S.client.includes("?? 0") && !S.client.includes("|| 0");
    return [maskedDraws && readerDraws && guarded, `masked ${json(kpis(htmlMasked))} floor said ${maskedSaid} · reader ${json(kpis(htmlReader))} · guarded ${guarded}`];
  });

  /* ── V8 · no money word for GROWTH ── */
  await h.claim(L.v8, async () => {
    const money = await h.campaign("pv8", { path: PATHS.CONFIRMED, count: 1604, estimateTzs: 9624, budgetTzs: 10_000 });
    const growth = await h.view(money.id, GROWTH);
    const reader = await h.view(money.id, READER);
    const htmlGrowth = P.render(growth, viewerOf(GROWTH));
    h.see(htmlGrowth);
    const clean = !json(growth).includes("TZS") && growth.money === null && !htmlGrowth.includes("TZS");
    const control = json(reader.money) === json({ estimateTzs: 9624, budgetTzs: 10_000 }) && (reader.startDialog?.body ?? "").includes("TZS 9,624") && (reader.startDialog?.body ?? "").includes("TZS 10,000");
    const files: Array<[string, string]> = [["live-client.tsx", S.client], ["page.tsx", S.page], ["loading.tsx", S.loading], ["live-driver.tsx", S.driver], ["actions.ts", S.actions]];
    const moneyIn = files.filter(([, text]) => /formatTzs|formatTzsCompact|campaignMoneyVisible|loadEstimateInputsFor|TZS|budgetTzs|estimateTzs/.test(text)).map(([f]) => f);
    return [clean && control && moneyIn.length === 0, `GROWTH clean ${clean} · reader's dialog carries the cost and limit ${control} · money named in [${moneyIn.join(",")}]`];
  });

  /* ── V9 · the flag is the page ── */
  await h.claim(L.v9, async () => {
    const exists = (route: string) => existsSync(join(ROOT, "src", "app", ...route.split("/").filter(Boolean), "page.tsx"));
    const detail = exists("/admin/campaigns/[id]");
    const compose = exists("/admin/campaigns/new");
    return [P.screens.detail === detail && detail && P.screens.compose === compose, `detail flag ${P.screens.detail} / page ${detail} · compose flag ${P.screens.compose} / page ${compose}`];
  });

  /* ── V10 · the page gate's shape ── */
  await h.claim(L.v10, async () => {
    const WS = "[" + String.fromCharCode(32, 9, 10, 13) + "]*";
    const ID = "[A-Za-z0-9_]*";
    const gateRe = (gate: string) => new RegExp("return <" + gate + "(?: [a-zA-Z]+=" + DQ + "[^" + DQ + "{}$]*" + DQ + ")*>" + WS + "<[A-Z]" + ID + "(?:[ ][^<>]*)?/>" + WS + "</" + gate + ">;");
    const BODY = [gateRe("AdminPageGate"), gateRe("AdminSectionGate")];
    const accepted = (text: string) => BODY.some((re) => re.test(text));
    const page = S.page;
    const title = `<AdminPageGate title=${DQ}${COPY.LIVE_TITLE}${DQ}>`;
    const canon = `export default async function P(props: X) {${NL}  return <AdminPageGate title=${DQ}Affiliate${DQ}><C {...props} /></AdminPageGate>;${NL}}${NL}`;
    const planted: Record<string, string> = {
      comment: `export default async function P(props: X) {${NL}  return <C {...props} />;${NL}}${NL}`,
      string: `const GATE_TAG = ${DQ}<AdminPageGate>${DQ};${NL}export default async function P(props: X) {${NL}  return <C {...props} />;${NL}}${NL}`,
      conditional: `export default async function P(props: X) {${NL}  return off ? <C {...props} /> : <AdminPageGate title=${DQ}A${DQ}><C {...props} /></AdminPageGate>;${NL}}${NL}`,
      partial: `export default async function P(props: X) {${NL}  return (<>${NL}    <AdminPageHead title={p.displayName} />${NL}    <AdminPageGate title=${DQ}A${DQ}><C {...props} /></AdminPageGate>${NL}  </>);${NL}}${NL}`,
    };
    const refused = Object.entries(planted).filter(([, text]) => accepted(text)).map(([k]) => k);
    const head = `<AdminPageHead title=${DQ}${COPY.LIVE_TITLE}${DQ} sw=${DQ}${COPY.LIVE_SW}${DQ}`;
    const checks = {
      shape: accepted(page) && page.includes(title) && gateRe("AdminPageGate").test(page),
      title: COPY.LIVE_TITLE === "SMS campaign" && COPY.LIVE_SW === "Kampeni",
      head: page.includes(head) && S.loading.includes(head) && !page.includes("AdminPageHead title={") && !S.loading.includes("AdminPageHead title={"),
      metadata: page.includes(`export const metadata = { title: ${DQ}${COPY.LIVE_TITLE} · Admin${DQ} };`) && !page.includes("generateMetadata"),
      control: accepted(canon) && refused.length === 0,
    };
    return [Object.values(checks).every(Boolean), `${json(checks)} · inert spellings accepted [${refused.join(",")}]`];
  });

  /* ── V11 · the load, and every act's answer ── */
  await h.claim(L.v11, async () => {
    const wrong: string[] = [];
    const viewer = (mayAct: boolean): LiveViewer => ({ userId: "usr_x", mayAct, reads: false, money: false });
    const asked: Array<string | null> = [];
    const loadDeps = (view: CampaignLiveView | null | Error, mayAct = true) => ({
      userId: async () => "usr_x",
      viewer: async (id: string | null) => { asked.push(id); return viewer(mayAct); },
      view: async () => { if (view instanceof Error) throw view; return view; },
    });
    const ready = await P.load("cmp_x", loadDeps(viewAt("RUNNING")));
    const watcher = await P.load("cmp_x", loadDeps(viewAt("RUNNING"), false));
    const draft = await P.load("cmp_x", loadDeps(viewAt("DRAFT")));
    const missing = await P.load("cmp_x", loadDeps(null));
    let failed: string | null = null;
    try { await P.load("cmp_x", loadDeps(new Error("the read is down"))); } catch (err) { failed = String((err as Error).message); }
    const anon = await P.load("cmp_x", { ...loadDeps(viewAt("RUNNING")), userId: async () => null });
    if (!(ready.kind === "ready" && ready.mayAct === true && watcher.kind === "ready" && watcher.mayAct === false)) wrong.push("a ready load does not carry whether the viewer may act");
    if (draft.kind !== "draft") wrong.push("a draft is not told apart");
    if (missing.kind !== "missing") wrong.push("a campaign that is not there is not 'missing'");
    if (failed !== "the read is down") wrong.push(`a failed read was answered ${failed === null ? "(as a value — a zero)" : failed}`);
    if (!(anon.kind === "ready" && asked[asked.length - 1] === null)) wrong.push("no officer was not handed to the viewer read as null");
    // ── an act's answer ──
    const log: string[] = [];
    const revalidated = { n: 0 };
    const deps = (over: Record<string, unknown> = {}) => ({
      viewer: async () => viewer(true),
      view: async () => viewAt("PAUSED"),
      revalidate: () => { revalidated.n++; },
      log: (tag: string, err: unknown) => { log.push(`${tag}:${(err as Error).name}`); },
      sleep: async () => {},
      ...over,
    }) as never;
    const landed = await P.runAct("cmp_x", "usr_x", "pause", async () => ({ ok: true as const, message: "Paused — nobody more is messaged until you resume.", recorded: true }), deps());
    const landedOk = landed.ok === true && landed.recorded === true && landed.href === null && landed.view !== null && landed.view.status === "PAUSED" && revalidated.n === 1;
    const refusedA = await P.runAct("cmp_x", "usr_x", "pause", async () => ({ ok: false as const, reason: "already_paused", message: "This campaign is already paused." }), deps());
    const refusedOk = refusedA.ok === false && refusedA.reason === "already_paused" && refusedA.message === "This campaign is already paused." && revalidated.n === 1 && refusedA.view !== null;
    const boom = new TypeError("the database dropped the connection");
    const unfinished = await P.runAct("cmp_x", "usr_x", "stop", async () => { throw boom; }, deps());
    const unfinishedOk = unfinished.ok === false && unfinished.reason === "unfinished" && unfinished.message === COPY.LIVE_ACT_UNFINISHED && unfinished.view !== null
      && revalidated.n === 1 && json(log) === json(["stop:TypeError"]);
    const blind = await P.runAct("cmp_x", "usr_x", "start", async () => ({ ok: true as const, message: "Started.", recorded: false }), deps({ view: async () => { throw new Error("the read is down"); } }));
    const blindOk = blind.ok === true && blind.recorded === false && blind.view === null && revalidated.n === 2;
    const copied = await P.runAct("cmp_x", "usr_x", "copy", async () => ({ ok: true as const, id: "cmp_new", href: "/admin/campaigns/new?draft=cmp_new", message: "A copy was made as a new draft.", recorded: true }), deps());
    const copiedOk = copied.ok === true && copied.href === "/admin/campaigns/new?draft=cmp_new";
    if (!(landedOk && refusedOk && unfinishedOk && blindOk && copiedOk)) wrong.push(`acts: landed ${landedOk} refused ${refusedOk} unfinished ${unfinishedOk} unreadable view ${blindOk} copy ${copiedOk}`);
    // ── Resume, once more after a busy ──
    const resumeCalls = async (answers: Array<{ ok: boolean; reason?: string }>) => {
      const slept: number[] = [];
      let n = 0;
      const resume = async () => {
        const a = answers[Math.min(n++, answers.length - 1)];
        return (a.ok ? { ok: true, message: "Sending again.", recorded: true } : { ok: false, reason: a.reason ?? "busy", message: a.reason === "busy" || a.reason === undefined ? COPY.LIVE_CHANGED.resumeBusy : "No." }) as never;
      };
      const r = (await P.resumeRetry(resume, "cmp_x", viewer(true), async (ms: number) => { slept.push(ms); })) as { ok: boolean; reason?: string };
      return { r, calls: n, slept };
    };
    const once = await resumeCalls([{ ok: true }]);
    const heals = await resumeCalls([{ ok: false, reason: "busy" }, { ok: true }]);
    const stays = await resumeCalls([{ ok: false, reason: "busy" }, { ok: false, reason: "busy" }]);
    const other = await resumeCalls([{ ok: false, reason: "switch_closed" }, { ok: true }]);
    const resumeOk = once.calls === 1 && once.slept.length === 0 && once.r.ok === true
      && heals.calls === 2 && json(heals.slept) === json([1_000]) && heals.r.ok === true
      && stays.calls === 2 && stays.r.ok === false && stays.r.reason === "busy"
      && other.calls === 1 && other.slept.length === 0 && other.r.ok === false && other.r.reason === "switch_closed";
    if (!resumeOk) wrong.push(`resume: ok ${once.calls}/${once.slept.length} · busy→ok ${heals.calls}/${json(heals.slept)} · busy→busy ${stays.calls}/${stays.r.reason} · other ${other.calls}`);
    return [wrong.length === 0, wrong.length === 0 ? `ready/draft/missing/failed read · landed ${landedOk} · refused ${refusedOk} · unfinished ${unfinishedOk} · resume ${resumeOk}` : wrong.join(" | ")];
  });

  /* ── L2 · the viewer is the stored role's ── */
  await h.claim(L.l2, async () => {
    const wrong: string[] = [];
    const closed = (id: string): LiveViewer => ({ userId: id, mayAct: false, reads: false, money: false });
    const yes = async () => true;
    const allYes = { role: async () => "GROWTH" as never, mayAct: yes, reads: yes, money: yes };
    const table: Array<[string, unknown, unknown]> = [];
    const row = async (name: string, who: string | null | undefined, deps: unknown, want: LiveViewer) => { table.push([name, await P.viewerFor(who as never, deps as never), want]); };
    await row("no officer", undefined, allYes, closed(""));
    await row("a blank id", "  ", allYes, closed(""));
    await row("no row", "usr_a", { ...allYes, role: async () => null }, closed("usr_a"));
    await row("the role read throws", "usr_a", { ...allYes, role: async () => { throw new Error("down"); } }, closed("usr_a"));
    await row("a cell throws", "usr_a", { ...allYes, reads: async () => { throw new Error("down"); } }, { userId: "usr_a", mayAct: true, reads: false, money: true });
    await row("a cell answers something but true", "usr_a", { ...allYes, money: async () => 1 as never }, { userId: "usr_a", mayAct: true, reads: true, money: false });
    for (const [name, got, want] of table) if (json(got) !== json(want)) wrong.push(`${name}: ${json(got)}`);
    // the stored roles, through the real cells
    const at = "2026-10-08T08:00:00.000Z";
    const stored = async (id: string, role: StoredUser["role"], n: number) => {
      if (!(await db.user.findById(id))) {
        await db.user.create({
          id, phoneE164: `+255681${String(h.run).padStart(3, "0").slice(-3)}${String(n).padStart(3, "0")}`, email: null, passwordHash: null, passwordSalt: null,
          failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "SW", displayName: `L2 ${role}`, dob: "1990-01-01", region: null,
          acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
          createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
        } as StoredUser);
      }
      return id;
    };
    const adm = await stored(`usr_u47b2_l2_adm_${h.run}`, "ADMIN", 1);
    const grw = await stored(`usr_u47b2_l2_grw_${h.run}`, "GROWTH", 2);
    const aud = await stored(`usr_u47b2_l2_aud_${h.run}`, "AUDITOR", 3);
    const a = await P.viewerFor(adm);
    const g = await P.viewerFor(grw);
    const u = await P.viewerFor(aud);
    if (!(a.mayAct && a.reads && a.money)) wrong.push(`the Owner is ${json(a)}`);
    if (!(g.mayAct && !g.reads && !g.money)) wrong.push(`a stored GROWTH is ${json(g)}`);
    if (!(!u.mayAct && !u.reads)) wrong.push(`an AUDITOR with no growth grant is ${json(u)}`);
    // the actions: one parameter (the id), the viewer from the stored role
    const src = S.actions;
    const names = ["campaignStepAction", "campaignViewAction", "startCampaignAction", "pauseCampaignAction", "resumeCampaignAction", "stopCampaignAction", "copyCampaignAction"];
    const oneParam = names.every((n) => src.includes(`export async function ${n}(campaignId: string)`));
    const fromRole = ["campaignStepAction", "campaignViewAction"].every((n) => (bodyOf(src, n) ?? "").includes("const viewer = await liveViewerFor(g.userId);"))
      && ["startCampaignAction", "pauseCampaignAction", "resumeCampaignAction", "stopCampaignAction", "copyCampaignAction"].every((n) => (bodyOf(src, n) ?? "").includes("return runAct(id, g.userId,"))
      && S.run.includes("viewer: (userId: string) => liveViewerFor(userId),") && !src.includes("mayAct: true");
    if (!oneParam) wrong.push("an action takes more than the campaign's id");
    if (!fromRole) wrong.push("an action does not hand the services the stored role's viewer");
    return [wrong.length === 0, wrong.length === 0 ? "closed in six cases · Owner, GROWTH and AUDITOR from their stored rows · seven actions take one parameter and the stored viewer" : wrong.join(" | ")];
  });
}

/* ══ THE PLANTS — each defect IN MEMORY, each failing EXACTLY the claims it names ══════════════════════════════════ */

export type PagePlant = { name: string; expect: string[]; impl: { page: PageImpl } };

/** `softCheckStaff`, as the planted view guard calls it (the act grant). */
const GUARD_CHECK = (domain: Parameters<typeof GUARD.softViewStaff>[0], action: string, refusal: string, request?: Parameters<typeof GUARD.softViewStaff>[3]) =>
  GUARD.softCheckStaff(domain, action, refusal, request);

export function pagePlants(): PagePlant[] {
  const L = LABELS;
  const base = REAL_PAGE;
  const S = REAL_SOURCES;
  const withPage = (over: Partial<PageImpl>): { page: PageImpl } => ({ page: { ...base, ...over } });
  const withSources = (over: Partial<PageSources>): { page: PageImpl } => withPage({ sources: { ...S, ...over } });
  const startBody = bodyOf(S.actions, "startCampaignAction") ?? "";
  const stepGuard = 'softCheckStaff("growth", "marketing.campaign.step"';
  const viewGuard = 'softViewStaff("growth", "marketing.campaign.view"';
  const gateReturn = 'return <AdminPageGate title="SMS campaign"><AdminCampaignLiveContent params={props.params} /></AdminPageGate>;';
  const head = '<AdminPageHead title="SMS campaign" sw="Kampeni" />';
  const lateGuard = [
    "", "  const id = text(campaignId);",
    '  const late = await runAct(id, "x", "start", (actor) => startCampaign(id, actor));',
    '  const g = await softRequireStaff("growth", "marketing.campaign.start", LIVE_ROLE_REFUSAL);',
    '  if (!g.ok) return actRefused("role", g.error);', "  return late;", "",
  ].join(NL);
  const stepViewer = ["const viewer = await liveViewerFor(g.userId);", "  const r = await campaignStep("].join(NL + "  ").replace(NL + "    ", NL + "  ");
  return [
    { name: "R-V1 · a figure worked out in the browser — Waiting is the campaign's people less the ones handed over", expect: [L.v1],
      impl: withSources({ client: plantIn(S.client, '<Figure name="waiting" value={k.waiting} />', '<Figure name="waiting" value={k.onCampaign - (k.handedOver ?? 0)} />') }) },
    { name: "R-V1b · a timer-driven bar — the clock moves the bar on after the page opened (OD34)", expect: [L.v1],
      impl: withSources({ client: plantIn(S.client, "<ProgressBar value={p.value}", "<ProgressBar value={Math.min(p.max, p.value + Math.floor(Date.now() / 1000))}") }) },
    { name: "R-V4 · Stop hidden instead of disabled — the control is dropped from the row when it cannot be used", expect: [L.v4],
      impl: withSources({ client: plantIn(S.client, "{ACTS.map((act) => {", '{ACTS.filter((a) => a !== "stop" || view.controls.stop.enabled).map((act) => {') }) },
    { name: "R-V4b · the rendered row loses a disabled Stop", expect: [L.v4],
      impl: withPage({ render: (view, o) => {
        const html = base.render(view, o);
        const tag = tagAt(html, 'data-live-control="stop"');
        if (tag === null) return html;
        const from = html.indexOf(tag);
        return attrOf(tag, "disabled") === null ? html : html.slice(0, from) + html.slice(html.indexOf("</button>", from) + 9);
      } }) },
    { name: "R-V5 · the guard moved below the service call", expect: [L.v5],
      impl: withSources({ actions: plantIn(S.actions, startBody, lateGuard) }) },
    { name: "R-V5b · the poll takes the ACT grant — a watcher is refused on every poll and written up as an attempted escalation", expect: [L.v5],
      impl: withSources({ actions: plantIn(S.actions, viewGuard, 'softCheckStaff("growth", "marketing.campaign.view"') }) },
    { name: "R-V5c · the step without the non-redirecting second factor — a lapsed 2-step throws an open page away", expect: [L.v5],
      impl: withSources({ actions: plantIn(S.actions, stepGuard, 'softRequireStaff("growth", "marketing.campaign.step"') }) },
    { name: "R-V5d · the view guard asks the ACT grant (a copy of softCheckStaff)", expect: [L.v5],
      impl: withPage({ viewGuard: ((d, a, r, req) => GUARD_CHECK(d, a, r, req)) as PageImpl["viewGuard"] }) },
    { name: "R-V6 · the driver retries a thrown step — once more, blind", expect: [L.v6],
      impl: withPage({ loop: (o) => base.loop({ ...o, step: async (id) => { try { return await o.step(id); } catch { return o.step(id); } } }) }) },
    { name: "R-V6b · a wait is slept for as long as the engine says — no cap", expect: [L.v6],
      impl: withPage({ gap: (step, now) => (step.kind === "waiting" && step.busy !== true && typeof step.until === "string" ? Math.max(5_000, Date.parse(step.until) - now) : base.gap(step, now)) }) },
    { name: "R-V6c · a viewer who may not act is driven — the page steps for a watcher", expect: [L.v6],
      impl: withPage({ mode: (status, mayAct) => base.mode(status, true || mayAct) }) },
    { name: "R-V6d · a watcher polls every second, not every ten", expect: [L.v6],
      impl: withPage({ loop: (o) => base.loop({ ...o, sleep: (ms) => o.sleep(o.mode === "watch" ? Math.min(ms, 1_000) : ms) }) }) },
    { name: "R-V6e · the loop restarted on every status — the gap after the step that did the work is skipped", expect: [L.v6],
      impl: withSources({ driver: plantIn(S.driver, "[id, mode, mayAct, step, poll, attempt, stop]", "[id, mode, mayAct, step, poll, attempt, stop, view.status]") }) },
    { name: "R-V7 · the client draws a zero in place of a hidden figure", expect: [L.v7],
      impl: withSources({ client: plantIn(S.client, '{k.handedOver !== null && <Figure name="handedOver" value={k.handedOver} />}', '<Figure name="handedOver" value={k.handedOver ?? 0} />') }) },
    { name: "R-V8 · a money word in the client — the page formats a TZS figure", expect: [L.v8],
      impl: withSources({ client: `import { formatTzs } from "@/lib/utils";${NL}${S.client}` }) },
    { name: "R-V9 · the detail flag off while its page is on disk", expect: [L.v9],
      impl: withPage({ screens: { compose: true, detail: false } }) },
    { name: "R-V10 · the gate rendered conditionally — inert whenever the condition says so", expect: [L.v10],
      impl: withSources({ page: plantIn(S.page, gateReturn, 'return props ? <AdminCampaignLiveContent params={props.params} /> : <AdminPageGate title="SMS campaign"><AdminCampaignLiveContent params={props.params} /></AdminPageGate>;') }) },
    { name: "R-V10b · the head's title computed from the record", expect: [L.v10],
      impl: withSources({ page: plantIn(S.page, head, '<AdminPageHead title={load === null ? "SMS campaign" : "SMS campaign"} sw="Kampeni" />') }) },
    { name: "R-V11a · Resume never asked a second time after a busy", expect: [L.v11],
      impl: withPage({ resumeRetry: async (resume, id, actor) => resume(id, actor) }) },
    { name: "R-V11b · Resume asked again and again until it gives way", expect: [L.v11],
      impl: withPage({ resumeRetry: async (resume, id, actor, sleep) => {
        let r = await resume(id, actor);
        for (let i = 0; i < 5 && !r.ok && r.reason === "busy"; i++) { await (sleep ?? (async () => {}))(1_000); r = await resume(id, actor); }
        return r;
      } }) },
    { name: "R-V11c · a service that threw is answered as if nothing was done", expect: [L.v11],
      impl: withPage({ runAct: async (id, user, tag, run, deps) => base.runAct(id, user, tag, async (a) => { try { return await run(a); } catch { return { ok: false, reason: "refused", message: "Nothing was done." } as never; } }, deps) }) },
    { name: "R-V11d · the list invalidated after a refusal", expect: [L.v11],
      impl: withPage({ runAct: async (id, user, tag, run, deps) => { const r = await base.runAct(id, user, tag, run, deps); if (!r.ok) deps?.revalidate(); return r; } }) },
    { name: "R-V11e · a read that failed is told to the officer as 'not found'", expect: [L.v11],
      impl: withPage({ load: async (id, deps) => { try { return await base.load(id, deps); } catch { return { kind: "missing" }; } } }) },
    { name: "R-L2 · a step that trusts the browser — the viewer is whatever the request says it is", expect: [L.l2],
      impl: withSources({ actions: plantIn(S.actions, stepViewer, ["const viewer = { userId: g.userId, mayAct: true, reads: true, money: true };", "  const r = await campaignStep("].join(NL)) }) },
    { name: "R-L2b · a viewer that opens when its role cannot be read", expect: [L.l2],
      impl: withPage({ viewerFor: async (id, deps) => { const v = await base.viewerFor(id, deps); return v.userId !== "" && !v.mayAct && !v.reads && !v.money ? { ...v, mayAct: true } : v; } }) },
    { name: "R-P3 · a phone number reaches the page", expect: [P1_LABEL],
      impl: withPage({ render: (view, o) => `${base.render(view, o)}<p>+255712345678</p>` }) },
  ];
}
