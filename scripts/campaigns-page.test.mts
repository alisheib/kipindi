/**
 * test:campaigns-page — U36's guard: the SMS campaign list at /admin/campaigns, its six doors, and the nav badge.
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: ten fixture campaigns go in through the REAL campaign
 * door (`db.smsCampaign.create` and its conditional `transition`s, `db.smsCampaignRecipient.createMany`) on the memory
 * twin, and the REAL loader (`campaigns-loader.ts`, the one the page calls), the REAL rail builder, the REAL badge
 * reader and the pure vocabulary (`campaign-status.ts`) run over them — the order and its id tiebreak, the rail's
 * filters, the clamp, the whole-table counts, the failed read, the single recipient read, HELD as outstanding, the
 * empty campaign with no bar, attention, the badge refused to a viewer without growth, and the sync throw. Then the
 * source, for what only the source can show: the doors' literal titles, no money, no timer, no pulse, the links behind
 * their flags, the rail file's shape and its declaration, the shell's two callers, the dev seed's refusal.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY (a nav copy, a crumb builder, a progress
 * function, a badge reader, a loader, a source string, a flag) and requires the MATCHING assertion to fail — each plant
 * on its OWN label. This file opens nothing for writing: §2f and §4c count a store read by wrapping the memory twin's
 * method for one call and putting it back in a `finally`, in memory.
 * ⛔ IT RUNS ON THE MEMORY TWIN ONLY. `DATABASE_URL` is removed BEFORE the store is imported (the store picks its twin at
 * import), and control 0 asserts the fixtures landed in the memory maps — so a machine with a database configured can
 * never have campaigns written into it by this suite.
 *
 * Run:  npm run test:campaigns-page
 * Red:  npm run red:campaigns-page
 */
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import type {
  StoredSmsCampaign, StoredSmsCampaignRecipient, SmsCampaignStatus, SmsCampaignRecipientStatus,
  SmsCampaignRecipientStatusCounts, SmsCampaignStatusCounts, SmsCampaignTransitionPatch,
} from "../src/lib/server/store.ts";
import type { CampaignsParams, CampaignsView } from "../src/app/admin/campaigns/campaigns-loader.ts";
import type { Role, AdminDomain } from "../src/lib/server/roles.ts";

// ⛔ BEFORE THE STORE IS IMPORTED — see the header.
delete process.env.DATABASE_URL;
const { db } = await import("../src/lib/server/store.ts");
const CS = await import("../src/lib/marketing/campaign-status.ts");
const { campaignAttentionBadge } = await import("../src/lib/server/marketing/campaign-attention.ts");
const { loadCampaigns, campaignsSort } = await import("../src/app/admin/campaigns/campaigns-loader.ts");
const { campaignRail, campaignsHref, campaignsLinkSp } = await import("../src/app/admin/campaigns/campaigns-rail.ts");
const COPY = await import("../src/app/admin/campaigns/campaigns-copy.ts");
const NAV = await import("../src/components/admin/admin-nav-groups.ts");
const { ADMIN_DOMAINS, defaultGrant, domainForPath } = await import("../src/lib/server/roles.ts");
const { PER_PAGE } = await import("../src/components/admin/admin-pagination.tsx");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROVE_RED = process.argv.includes("--prove-red");
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
/** Code only, line endings normalised — this checkout is CRLF and every needle here is written LF. */
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).split(CR).join("");
/** RAW, for the filter-language gate: its regex literals carry bare quotes the comment stripper could misread. */
const rawRead = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split(CR).join("");
const count = (s: string, needle: string) => s.split(needle).length - 1;

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence `fn` computes — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}

/* ══ THE FIXTURES — ten campaigns through the ONE door, on the memory twin ════════════════════════════════════════ */

const T0 = Date.parse("2026-09-30T06:00:00.000Z");
const HOUR = 3_600_000;
const at = (h: number, m = 0) => new Date(T0 + h * HOUR + m * 60_000).toISOString();
const OFFICER = "usr_u36_officer";
const idOf = (key: string) => `cmp_t_${key}`;

type Step = "CONFIRMED" | "PREPARING" | "RUNNING" | "PAUSED" | "DONE" | "CANCELLED";
type Mix = Partial<Record<SmsCampaignRecipientStatus, number>>;
type Fx = { key: string; name: string; created: number; last: number; path: Step[]; audience: number | null; mix: Mix; stopReason?: string };

/**
 * ⭐ Names are NOT in creation order (so the name sort cannot pass on the created order), c and d share one createdAt
 * (so the default order needs its id tiebreak), and every last activity is distinct and out of order. d is the plan's
 * Accept: RUNNING with 4 SENT and 6 HELD. g is PAUSED with every row settled (no attention); h is PAUSED before its list
 * finished (attention, no rows); e is RUNNING with no rows (attention, no bar); j is a stopped draft.
 */
const FX: Fx[] = [
  { key: "a", name: "Derby day", created: 1, last: 1, path: [], audience: null, mix: {} },
  { key: "b", name: "Asubuhi offer", created: 2, last: 20, path: ["CONFIRMED"], audience: 50, mix: {} },
  { key: "c", name: "Goal rush", created: 3, last: 12, path: ["CONFIRMED", "PREPARING"], audience: 10, mix: { PENDING: 4 } },
  { key: "d", name: "Bonus weekend", created: 3, last: 15, path: ["CONFIRMED", "PREPARING", "RUNNING"], audience: 10, mix: { SENT: 4, HELD: 6 } },
  { key: "e", name: "Jumamosi", created: 4, last: 11, path: ["CONFIRMED", "PREPARING", "RUNNING"], audience: 25, mix: {} },
  { key: "f", name: "Early bird", created: 5, last: 18, path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], audience: 4, mix: { SENT: 3, PENDING: 1 }, stopReason: "BALANCE_FLOOR" },
  { key: "g", name: "Champions night", created: 6, last: 13, path: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], audience: 4, mix: { SENT: 2, FAILED: 1, SKIPPED: 1 }, stopReason: "mystery_key" },
  { key: "h", name: "Ijumaa", created: 7, last: 16, path: ["CONFIRMED", "PREPARING", "PAUSED"], audience: 30, mix: {} },
  { key: "i", name: "Friday flash", created: 8, last: 19, path: ["CONFIRMED", "PREPARING", "RUNNING", "DONE"], audience: 2, mix: { DELIVERED: 2 } },
  { key: "j", name: "Halftime", created: 9, last: 10, path: ["CANCELLED"], audience: null, mix: {} },
];
const finalStatus = (fx: Fx): SmsCampaignStatus => (fx.path.length === 0 ? "DRAFT" : fx.path[fx.path.length - 1]);
const enqueuedOf = (fx: Fx): string | null => (fx.path.includes("RUNNING") ? at(fx.last) : null);
const countsOf = (mix: Mix): SmsCampaignRecipientStatusCounts => ({ ...CS.zeroRecipientStatusCounts(), ...mix });
const rowsOf = (mix: Mix) => Object.values(mix).reduce((n, k) => n + (k ?? 0), 0);

function draft(fx: Fx): StoredSmsCampaign {
  return {
    id: idOf(fx.key), name: fx.name, status: "DRAFT", bodySw: "50pick: Habari, soka leo.", bodyEn: null,
    codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null, nameFallbackSw: null, nameFallbackEn: null,
    sourcePhrase: null, draftRevision: 0, confirmTier: null, audienceFilter: '{"consent":["GIVEN"]}', audienceCount: null,
    audienceWatermark: null, estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null,
    enqueuedAt: null, stopReason: null, createdBy: OFFICER, confirmedBy: null, confirmedAt: null, startedAt: null,
    pausedAt: null, finishedAt: null, createdAt: at(fx.created), updatedAt: at(fx.created),
  };
}
function patchFor(step: Step, fx: Fx, stamp: string): SmsCampaignTransitionPatch {
  if (step === "CONFIRMED") {
    return {
      audienceCount: fx.audience ?? 1, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: fx.audience ?? 1,
      estimateTzs: null, budgetTzs: null, confirmedBy: OFFICER, confirmedAt: stamp,
    };
  }
  if (step === "PREPARING") return { startedAt: stamp };
  if (step === "RUNNING") return { enqueuedAt: stamp, enqueueCursor: "done" };
  if (step === "PAUSED") return { pausedAt: stamp, stopReason: fx.stopReason ?? null };
  return { finishedAt: stamp };
}

type MemMaps = { smsCampaigns: Map<string, StoredSmsCampaign>; smsCampaignRecipients: Map<string, StoredSmsCampaignRecipient> };
function mem(): MemMaps {
  const s = (globalThis as unknown as { __50PICK_STORE?: MemMaps }).__50PICK_STORE;
  if (!s || !s.smsCampaigns || !s.smsCampaignRecipients) throw new Error("the memory store has no campaign maps — this suite runs on the memory twin only");
  return s;
}

let fxIndex = 0;
for (const fx of FX) {
  fxIndex++;
  await db.smsCampaign.create(draft(fx));
  let from: SmsCampaignStatus = "DRAFT";
  for (let i = 0; i < fx.path.length; i++) {
    const step = fx.path[i];
    const stamp = at(fx.last, -(fx.path.length - 1 - i));
    const moved = await db.smsCampaign.transition(idOf(fx.key), {
      from: [from], to: step, patch: patchFor(step, fx, stamp), draftRevision: step === "CONFIRMED" ? 0 : null, at: stamp,
    });
    if (moved === null) throw new Error(`fixture ${fx.key}: ${from} → ${step} was refused`);
    from = step;
  }
  const entries = Object.entries(fx.mix) as Array<[SmsCampaignRecipientStatus, number]>;
  const seeds = Array.from({ length: rowsOf(fx.mix) }, (_, i) => ({
    id: `rcp_t_${fx.key}_${i}`, campaignId: idOf(fx.key), msisdn: `2557${String(fxIndex).padStart(2, "0")}${String(i).padStart(6, "0")}`,
    contactId: null, userId: null, optOutToken: null, createdAt: at(fx.created, 30),
  }));
  if (seeds.length > 0) await db.smsCampaignRecipient.createMany(seeds);
  // ⭐ The states a slice would have left (no DAL door settles a row before U43) — set in the memory map, in memory.
  let k = 0;
  for (const [status, n] of entries) {
    for (let j = 0; j < n; j++, k++) {
      const row = mem().smsCampaignRecipients.get(seeds[k].id);
      if (row) row.status = status;
    }
  }
}

/* ══ THE WORLD EACH RUN SEES — every part swappable by a red case ══════════════════════════════════════════════════ */

type Sources = {
  page: string; rail: string; railModel: string; loader: string; copy: string; layout: string; loading: string;
  shell: string; seed: string; gate: string;
};
const REAL_SOURCES: Sources = {
  page: read("src/app/admin/campaigns/page.tsx"),
  rail: read("src/app/admin/campaigns/campaign-status-rail.tsx"),
  railModel: read("src/app/admin/campaigns/campaigns-rail.ts"),
  loader: read("src/app/admin/campaigns/campaigns-loader.ts"),
  copy: read("src/app/admin/campaigns/campaigns-copy.ts"),
  layout: read("src/app/admin/campaigns/layout.tsx"),
  loading: read("src/app/admin/campaigns/loading.tsx"),
  shell: read("src/components/admin/admin-shell.tsx"),
  seed: read("src/app/api/dev-test/marketing-campaigns-seed/route.ts"),
  gate: rawRead("scripts/filter-language.test.mts"),
};

type Impl = {
  nav: typeof NAV.NAV_GROUPS;
  crumbs: (path: string) => string[];
  progress: typeof CS.campaignProgress;
  attention: typeof CS.wantsAttention;
  screens: { compose: boolean; detail: boolean };
  badge: (canSeeGrowth: boolean) => Promise<string | undefined>;
  load: (sp: CampaignsParams) => Promise<CampaignsView>;
  /** The order an address reads — §2g holds it to the order the page's own links re-read. */
  sortOf: typeof campaignsSort;
  /** The memory twin's attention count — §4b holds it to the pure predicate. */
  twinAttention: () => number | Promise<number>;
  sources: Sources;
};
const REAL: Impl = {
  nav: NAV.NAV_GROUPS,
  crumbs: NAV.crumbsFromPath,
  progress: CS.campaignProgress,
  attention: CS.wantsAttention,
  screens: CS.CAMPAIGN_SCREENS,
  badge: campaignAttentionBadge,
  load: (sp) => loadCampaigns(sp),
  sortOf: campaignsSort,
  twinAttention: () => db.smsCampaign.attentionCount(),
  sources: REAL_SOURCES,
};

/** The fixture letters a view lists, in order ("cmp_t_" stripped). */
const ids = (v: CampaignsView) => v.result.rows.map((c) => c.id.slice(6)).join(",");
/** The ADMIN_SURFACES array of the filter-language gate, as text. */
const adminSurfaces = (gate: string) => {
  const from = gate.indexOf("const ADMIN_SURFACES = [");
  const end = from < 0 ? -1 : gate.indexOf("];", from);
  return end < 0 ? "" : gate.slice(from, end);
};
function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkFiles(join(dir, e.name)) : [join(dir, e.name)]));
}
const viewOf = (role: Role): AdminDomain[] => ADMIN_DOMAINS.filter((d) => defaultGrant(role, d).canView);
const shownTo = (role: Role) => NAV.filterNavGroups(viewOf(role), false).some((g) => g.items.some((it) => it.key === "campaigns"));

/** Every label ONCE — the assertions and the red cases both read them, so a case can never expect a label the suite no
 *  longer prints. */
const L = {
  s0: "0 · CONTROL · the suite runs on the MEMORY twin — DATABASE_URL absent — and the ten fixture campaigns and every recipient row are in its maps",
  s1a: "1a · THE NAV DOOR: the Growth group holds exactly one SMS campaigns item — /admin/campaigns, key campaigns, domain growth, labelled 'SMS campaigns'",
  s1b: "1b · ⛔ NO SECOND 'Campaigns': no nav item anywhere is labelled 'Campaigns' in any case, and 'SMS campaigns' names exactly one item",
  s1c: "1c · /admin/campaigns, /admin/campaigns/new and /admin/campaigns/smc_0123 each highlight the campaigns item (ROUTE_KEYS), and every route key is owned",
  s1d: "1d · the same three paths resolve to growth (ROUTE_DOMAINS — never the ops fall-through), and the nav shows SMS campaigns to GROWTH and hides it from FINANCE, SUPPORT, MODERATOR, AUDITOR and COMPLIANCE",
  s1e: "1e · the crumb, and so the refusal heading, say 'SMS campaigns' (CRUMB_LABELS) — never the title-cased 'Campaigns'",
  s1f: "1f · the literal title in layout.tsx (AdminSectionGate), page.tsx (AdminPageGate, AdminPageHead, metadata) and loading.tsx (AdminPageHead) is CAMPAIGNS_TITLE, with the copied gloss 'Kampeni' — and no 'Campaigns' literal",
  s2a: "2a · EXECUTED · newest first by default; a tie on createdAt breaks on id in the same direction; name and last activity sort both ways",
  s2b: "2b · EXECUTED · ?status= narrows to its rail's statuses (drafts = DRAFT + CONFIRMED, sending = PREPARING + RUNNING, paused, finished = DONE + CANCELLED); an unknown key lists every row with All in force",
  s2c: "2c · ⭐ EXECUTED · page 9 of a short result renders page 1 with its rows — clamped, then read again — never 'no matches'",
  s2d: "2d · ⭐ EXECUTED · THE RAIL COUNTS ARE THE WHOLE TABLE: identical under every filter, page and sort; the four rail keys sum to All, which is the table",
  s2e: "2e · ⛔ EXECUTED · under the read fault the loader REJECTS — the page renders AdminLoadError, never a zero",
  s2f: "2f · EXECUTED · countsByCampaign is called exactly ONCE per load, with exactly the page's ids — no N+1, never the whole table",
  s2g: "2g · ⛔ ONE PARSE (U36 review F2): every address — a padded value, a repeated key, a case variant, a sort it does not offer — reads from its OWN links the order the page read, and a padded 'asc ' reads ascending",
  s3a: "3a · OUTSTANDING (PENDING + HELD) and SETTLED (SENT + DELIVERED + FAILED + SKIPPED) are disjoint and cover every recipient status; the rail partitions every campaign status exactly once",
  s3b: "3b · ⭐ HELD IS OUTSTANDING: a RUNNING campaign with 4 SENT and 6 HELD rows reads 4 of 10 — never 10 of 10 (a campaign that still owes people a message must not read as complete)",
  s3c: "3c · an empty campaign has NO progress — null for no rows, before its first row is written (confirmed then cancelled, paused, or preparing with none yet: U36 review F1), and for a list with no confirmed audience — so no 0 % bar is ever painted",
  s3d: "3d · PREPARING progress is rows written over the confirmed audience; a campaign paused or cancelled before its list finished stays in that phase once it has rows; after the list, rows settled over rows written",
  s3e: "3e · stopReasonLabel puts a known key in words and an unknown one as 'Engine reason: <key>' — never the raw key alone, never blank",
  s4a: "4a · wantsAttention: PREPARING and RUNNING yes; PAUSED with a PENDING or HELD row, or with its list unfinished, yes; PAUSED with every row settled, DRAFT, CONFIRMED, DONE and CANCELLED no",
  s4b: "4b · ⭐ ONE DEFINITION: the memory twin's attentionCount is exactly the fixtures wantsAttention accepts (5)",
  s4c: "4c · ⛔ the badge is read ONLY for a viewer who may see growth: campaignAttentionBadge(true) says '5'; campaignAttentionBadge(false) is undefined AND reads nothing (0 attentionCount calls)",
  s4d: "4d · ⛔ B-28 · with the store throwing SYNCHRONOUSLY, campaignAttentionBadge(true) neither throws nor rejects — it resolves to undefined (no badge)",
  s4e: "4e · the shell takes the growth answer: getSidebarBadges(canSeeMoney, canSeeGrowth) reads campaignAttentionBadge(canSeeGrowth), and BOTH callers pass the viewer's growth view beside the money one",
  s4f: "4f · every key getSidebarBadges returns is a nav key — the campaigns badge lands on the SMS campaigns item",
  s4g: "4g · an empty count is NO badge — undefined, never '0' — and the shell's object carries no campaigns key unless there is a count",
  s5a: "5a · ⛔ NO MONEY ON THE LIST (OD24): no formatTzs, no TZS, no budget and no estimate in the page, its rail, its loader or its copy",
  s5b: "5b · ⛔ no raw audienceFilter and no raw stop-reason key on the page — a PAUSED row's reason goes through stopReasonLabel",
  s5c: "5c · ⛔ the bar is the server's count: ProgressBar value and max from campaignProgress — no client directive, no timer and no clock in the page or the rail (OD34)",
  s5d: "5d · ⛔ no pulse and no animate-pulse in any file of the campaigns section (OD38)",
  s5e: "5e · a failed read renders AdminLoadError for the SMS campaigns with the rail still drawn — gated on the WHOLE table, never the page's rows — and a rail built without counts carries none",
  s5f: "5f · ⛔ LINKS ONLY TO PAGES THAT EXIST (432(h)): CAMPAIGN_SCREENS.compose and .detail are true exactly when their page files exist, the page renders each link only behind its flag, and its ghost reserves the head's action behind the same flag",
  s5g: "5g · the empty and no-match states read the copy module — no-match offers Show all, the rail stands outside the rows — the pager is AdminPagination, and a row in flight says when it was read beside a Refresh",
  s5h: "5h · ⛔ the dev seed refuses production FIRST (404 before any await) and touches no SMS path — no sendBatch, no SmsMessage, no SMS module",
  s5i: "5i · the rail file is a dumb server renderer — ONE data-filter-rail campaign-status, ONE FilterPill at the dense rank (tab semantics, replace, no scroll), a FilterGroupKey, no client directive, no route or label typed — and filter-language declares it in ADMIN_SURFACES",
  s5j: "5j · every rail href is the ONE builder's: it keeps the sort, never page or a stray parameter; exactly one pill is in force; counts are the whole table's, and absent when the read failed",
} as const;

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const S = impl.sources;

  // ── 0 · THE CONTROL ───────────────────────────────────────────────────────────────────────────────────────────
  await check(p(L.s0), () => {
    const m = mem();
    const campaigns = FX.filter((fx) => m.smsCampaigns.has(idOf(fx.key))).length;
    const recipients = [...m.smsCampaignRecipients.values()].filter((r) => r.campaignId.startsWith("cmp_t_")).length;
    const want = FX.reduce((n, fx) => n + rowsOf(fx.mix), 0);
    return [process.env.DATABASE_URL === undefined && campaigns === FX.length && recipients === want && want === 24,
      `${campaigns} campaigns · ${recipients} recipients (want ${want})`];
  });

  /* ══ 1 · THE DOORS ══════════════════════════════════════════════════════════════════════════════════════════════ */
  await check(p(L.s1a), () => {
    const growth = impl.nav.find((g) => g.group.en === "Growth");
    const items = (growth?.items ?? []).filter((it) => it.href === "/admin/campaigns");
    const it = items[0];
    return [items.length === 1 && it.label === COPY.CAMPAIGNS_TITLE && it.key === "campaigns" && it.domain === "growth" && !it.ownerOnly && !it.allStaff,
      JSON.stringify(items)];
  });
  await check(p(L.s1b), () => {
    const labels = impl.nav.flatMap((g) => g.items.map((it) => it.label));
    const bare = labels.filter((l) => l.trim().toLowerCase() === "campaigns");
    const named = labels.filter((l) => l === COPY.CAMPAIGNS_TITLE);
    return [labels.length > 30 && bare.length === 0 && named.length === 1, `bare 'Campaigns': ${bare.length} · 'SMS campaigns': ${named.length}`];
  });
  await check(p(L.s1c), () => {
    const paths = ["/admin/campaigns", "/admin/campaigns/new", "/admin/campaigns/smc_0123"];
    const keys = paths.map((x) => NAV.activeKeyFromPath(x));
    const problems = NAV.assertNavKeysResolve();
    return [keys.every((k) => k === "campaigns") && problems.length === 0, `${keys.join(",")} · ${problems.join(" | ")}`];
  });
  await check(p(L.s1d), () => {
    const paths = ["/admin/campaigns", "/admin/campaigns/new", "/admin/campaigns/smc_0123"];
    const domains = paths.map((x) => domainForPath(x));
    const others: Role[] = ["FINANCE", "SUPPORT", "MODERATOR", "AUDITOR", "COMPLIANCE"];
    const leaks = others.filter((r) => shownTo(r));
    return [domains.every((d) => d === "growth") && shownTo("GROWTH") && leaks.length === 0,
      `domains ${domains.join(",")} · GROWTH ${shownTo("GROWTH")} · shown to [${leaks.join(",")}]`];
  });
  await check(p(L.s1e), () => {
    const top = impl.crumbs("/admin/campaigns");
    const sub = impl.crumbs("/admin/campaigns/new");
    return [top.at(-1) === COPY.CAMPAIGNS_TITLE && sub[1] === COPY.CAMPAIGNS_TITLE, `${top.join(" / ")} · ${sub.join(" / ")}`];
  });
  await check(p(L.s1f), () => {
    const T = COPY.CAMPAIGNS_TITLE;
    const W = COPY.CAMPAIGNS_SW;
    const layoutOk = S.layout.includes(`<AdminSectionGate title="${T}">{children}</AdminSectionGate>`);
    const pageOk = S.page.includes(`<AdminPageGate title="${T}">`) && count(S.page, `title="${T}"`) === 2 && S.page.includes(`sw="${W}"`)
      && S.page.includes(`export const metadata = { title: "${T} · Admin" };`);
    // U37b · the ghost's head now carries the reserved action (5f holds it behind the flag), so its literal title and gloss
    // are read up to the closing of the gloss, not to the end of the tag.
    const loadingOk = S.loading.includes(`<AdminPageHead title="${T}" sw="${W}"`);
    const bareWord = [S.layout, S.page, S.loading].some((s) => s.includes('"Campaigns"'));
    return [T === "SMS campaigns" && W === "Kampeni" && layoutOk && pageOk && loadingOk && !bareWord,
      `layout ${layoutOk} · page ${pageOk} · loading ${loadingOk} · a bare 'Campaigns' ${bareWord}`];
  });

  /* ══ 2 · THE LOADER, EXECUTED ═══════════════════════════════════════════════════════════════════════════════════ */
  await check(p(L.s2a), async () => {
    const got = {
      byDefault: ids(await impl.load({})),
      createdAsc: ids(await impl.load({ sort: "created", dir: "asc" })),
      nameAsc: ids(await impl.load({ sort: "name", dir: "asc" })),
      nameDesc: ids(await impl.load({ sort: "name", dir: "desc" })),
      updatedDesc: ids(await impl.load({ sort: "updated", dir: "desc" })),
      updatedAsc: ids(await impl.load({ sort: "updated", dir: "asc" })),
    };
    const want = {
      byDefault: "j,i,h,g,f,e,d,c,b,a", createdAsc: "a,b,c,d,e,f,g,h,i,j", nameAsc: "b,d,g,a,f,i,c,j,h,e",
      nameDesc: "e,h,j,c,i,f,a,g,d,b", updatedDesc: "b,i,f,h,d,g,c,e,j,a", updatedAsc: "a,j,e,c,g,d,h,f,i,b",
    };
    return [JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got)];
  });
  await check(p(L.s2b), async () => {
    const drafts = await impl.load({ status: "drafts" });
    const sending = await impl.load({ status: "sending" });
    const paused = await impl.load({ status: "paused" });
    const finished = await impl.load({ status: "finished" });
    const bogus = await impl.load({ status: "bogus" });
    return [ids(drafts) === "b,a" && ids(sending) === "e,d,c" && sending.rail === "sending" && ids(paused) === "h,g,f"
      && ids(finished) === "j,i" && ids(bogus) === "j,i,h,g,f,e,d,c,b,a" && bogus.rail === "",
      `drafts ${ids(drafts)} · sending ${ids(sending)} · paused ${ids(paused)} · finished ${ids(finished)} · bogus ${ids(bogus)} (rail "${bogus.rail}")`];
  });
  await check(p(L.s2c), async () => {
    const nine = await impl.load({ page: "9" });
    const finished = await impl.load({ status: "finished", page: "3" });
    const nan = await impl.load({ page: "abc" });
    return [nine.page === 1 && ids(nine) === "j,i,h,g,f,e,d,c,b,a" && nine.result.total === 10
      && finished.page === 1 && ids(finished) === "j,i" && nan.page === 1 && PER_PAGE >= 10,
      `page ${nine.page} [${ids(nine)}] · finished page ${finished.page} [${ids(finished)}] · abc page ${nan.page}`];
  });
  await check(p(L.s2d), async () => {
    const WANT: SmsCampaignStatusCounts = { DRAFT: 1, CONFIRMED: 1, PREPARING: 1, RUNNING: 2, PAUSED: 3, DONE: 1, CANCELLED: 1 };
    const sps: CampaignsParams[] = [{}, { status: "paused" }, { status: "sending", page: "3" }, { sort: "name", dir: "asc" }, { status: "bogus" }];
    const views: CampaignsView[] = [];
    for (const sp of sps) views.push(await impl.load(sp));
    const same = views.every((v) => JSON.stringify(v.counts) === JSON.stringify(WANT));
    const c = views[1].counts;
    const keys = ["drafts", "sending", "paused", "finished"] as const;
    const sum = keys.reduce((n, k) => n + CS.railCount(c, k), 0);
    return [same && sum === CS.railCount(c, "") && CS.railCount(c, "") === FX.length,
      views.map((v) => JSON.stringify(v.counts)).join(" | ")];
  });
  await check(p(L.s2e), async () => {
    globalThis.__50PICK_CAMPAIGNS_READ_FAULT = true;
    try {
      let rejected = false;
      try { await impl.load({}); } catch { rejected = true; }
      return [rejected, rejected ? "the load rejected" : "the load RESOLVED under the read fault"];
    } finally {
      globalThis.__50PICK_CAMPAIGNS_READ_FAULT = false;
    }
  });
  await check(p(L.s2f), async () => {
    const twin = db.smsCampaignRecipient as unknown as { countsByCampaign: (ids: readonly string[]) => unknown };
    const real = twin.countsByCampaign;
    const calls: string[][] = [];
    twin.countsByCampaign = (list: readonly string[]) => { calls.push([...list]); return real(list); };
    try {
      const pageIds = (v: CampaignsView) => v.result.rows.map((c) => c.id).join(",");
      const all = await impl.load({});
      const allCalls = calls.splice(0);
      const paused = await impl.load({ status: "paused" });
      const pausedCalls = calls.splice(0);
      return [allCalls.length === 1 && allCalls[0].join(",") === pageIds(all) && pausedCalls.length === 1 && pausedCalls[0].join(",") === pageIds(paused),
        `${allCalls.length} call(s) for the whole list, ${pausedCalls.length} for paused · asked [${(pausedCalls[0] ?? []).join(",")}]`];
    } finally {
      twin.countsByCampaign = real;
    }
  });
  await check(p(L.s2g), () => {
    const addresses: CampaignsParams[] = [
      {}, { dir: "asc" }, { dir: "asc " }, { dir: " desc" }, { sort: "name " }, { sort: " updated", dir: " asc " },
      { sort: ["name ", "created"], dir: ["asc ", "desc"] }, { sort: "NAME", dir: "ASC" }, { sort: "budget", dir: "up" },
    ];
    const off = addresses.filter((sp) => JSON.stringify(impl.sortOf(sp)) !== JSON.stringify(impl.sortOf(campaignsLinkSp(sp))));
    const padded = impl.sortOf({ dir: "asc " });
    return [off.length === 0 && padded.dir === "asc", `disagree on ${JSON.stringify(off)} · a padded "asc " reads ${padded.dir}`];
  });

  /* ══ 3 · THE VOCABULARY ═════════════════════════════════════════════════════════════════════════════════════════ */
  await check(p(L.s3a), () => {
    const out = [...CS.OUTSTANDING_RECIPIENT_STATUSES];
    const settled = [...CS.SETTLED_RECIPIENT_STATUSES];
    const ALL: SmsCampaignRecipientStatus[] = ["PENDING", "HELD", "SENT", "DELIVERED", "FAILED", "SKIPPED"];
    const disjoint = out.every((s) => !settled.includes(s));
    const covers = ALL.every((s) => out.includes(s) || settled.includes(s)) && out.length + settled.length === ALL.length;
    const keys = ["drafts", "sending", "paused", "finished"];
    const homes = CS.CAMPAIGN_STATUSES.map((s) => keys.filter((k) => (CS.statusesForRail(k) ?? []).includes(s)).length);
    return [disjoint && covers && out.join(",") === "PENDING,HELD" && settled.join(",") === "SENT,DELIVERED,FAILED,SKIPPED"
      && CS.CAMPAIGN_STATUSES.length === 7 && homes.every((n) => n === 1),
      `outstanding [${out}] · settled [${settled}] · rail homes [${homes}]`];
  });
  await check(p(L.s3b), async () => {
    const v = await impl.load({});
    const d = v.result.rows.find((c) => c.id === idOf("d"));
    const counts = v.recipients[idOf("d")];
    const pr = d ? impl.progress(d, counts) : null;
    return [!!pr && pr.phase === "sending" && pr.value === 4 && pr.max === 10 && counts.SENT === 4 && counts.HELD === 6, JSON.stringify(pr)];
  });
  await check(p(L.s3c), async () => {
    const v = await impl.load({});
    const row = (k: string) => v.result.rows.find((c) => c.id === idOf(k));
    const zero = CS.zeroRecipientStatusCounts();
    const e = impl.progress(row("e")!, v.recipients[idOf("e")]);
    const j = impl.progress(row("j")!, v.recipients[idOf("j")]);
    const unconfirmed = impl.progress({ status: "PREPARING", audienceCount: null, enqueuedAt: null }, zero);
    // ⛔ U36 review F1: confirmed for 300, then cancelled before it started — no row was ever written.
    const cancelledUnstarted = impl.progress({ status: "CANCELLED", audienceCount: 300, enqueuedAt: null }, zero);
    const pausedNoRowYet = impl.progress({ status: "PAUSED", audienceCount: 30, enqueuedAt: null }, zero);
    const preparingNoRowYet = impl.progress({ status: "PREPARING", audienceCount: 2400, enqueuedAt: null }, zero);
    return [e === null && j === null && unconfirmed === null && cancelledUnstarted === null && pausedNoRowYet === null && preparingNoRowYet === null,
      JSON.stringify({ e, j, unconfirmed, cancelledUnstarted, pausedNoRowYet, preparingNoRowYet })];
  });
  await check(p(L.s3d), async () => {
    const v = await impl.load({});
    const pr = (k: string) => impl.progress(v.result.rows.find((c) => c.id === idOf(k))!, v.recipients[idOf(k)]);
    const twelve = { ...CS.zeroRecipientStatusCounts(), PENDING: 12 };
    const got = {
      a: pr("a"), b: pr("b"), c: pr("c"), h: pr("h"), f: pr("f"), i: pr("i"),
      pausedMid: impl.progress({ status: "PAUSED", audienceCount: 30, enqueuedAt: null }, twelve),
      cancelledMid: impl.progress({ status: "CANCELLED", audienceCount: 30, enqueuedAt: null }, twelve),
    };
    // h is paused before its list finished with NO row yet — null since U36's review (F1), the 3c rule.
    const want = {
      a: null, b: null,
      c: { phase: "preparing", value: 4, max: 10 }, h: null,
      f: { phase: "sending", value: 3, max: 4 }, i: { phase: "sending", value: 2, max: 2 },
      pausedMid: { phase: "preparing", value: 12, max: 30 }, cancelledMid: { phase: "preparing", value: 12, max: 30 },
    };
    return [JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got)];
  });
  await check(p(L.s3e), () => {
    const known = CS.stopReasonLabel("BALANCE_FLOOR");
    const unknown = CS.stopReasonLabel("mystery_key");
    const blank = CS.stopReasonLabel("  ");
    return [known.length > 20 && !known.includes("Engine reason") && !known.includes("BALANCE_FLOOR")
      && unknown === "Engine reason: mystery_key" && blank === "Engine reason: not recorded",
      `${known} · ${unknown} · ${blank}`];
  });

  /* ══ 4 · THE BADGE ══════════════════════════════════════════════════════════════════════════════════════════════ */
  await check(p(L.s4a), () => {
    const z = CS.zeroRecipientStatusCounts();
    const w = (o: Partial<SmsCampaignRecipientStatusCounts>) => ({ ...z, ...o });
    const ENQ = "2026-09-30T08:00:00.000Z";
    const A = (status: SmsCampaignStatus, enqueuedAt: string | null, counts = z) => impl.attention({ status, enqueuedAt }, counts);
    const yes = [A("RUNNING", ENQ), A("PREPARING", null), A("PAUSED", ENQ, w({ PENDING: 1 })), A("PAUSED", ENQ, w({ HELD: 1 })), A("PAUSED", null)];
    const no = [A("PAUSED", ENQ, w({ SENT: 2, FAILED: 1 })), A("DRAFT", null), A("CONFIRMED", null), A("DONE", ENQ, w({ PENDING: 3 })), A("CANCELLED", null, w({ HELD: 2 }))];
    return [yes.every(Boolean) && no.every((x) => !x), `yes [${yes}] · no [${no}]`];
  });
  await check(p(L.s4b), async () => {
    const expected = FX.filter((fx) => CS.wantsAttention({ status: finalStatus(fx), enqueuedAt: enqueuedOf(fx) }, countsOf(fx.mix))).length;
    const twin = await impl.twinAttention();
    return [expected === 5 && twin === expected, `the twin counts ${twin} · the fixtures wanting attention ${expected}`];
  });
  await check(p(L.s4c), async () => {
    const twin = db.smsCampaign as unknown as { attentionCount: () => unknown };
    const real = twin.attentionCount;
    let calls = 0;
    twin.attentionCount = () => { calls++; return real(); };
    try {
      const forGrowth = await impl.badge(true);
      const growthCalls = calls;
      calls = 0;
      const forOthers = await impl.badge(false);
      return [forGrowth === "5" && growthCalls === 1 && forOthers === undefined && calls === 0,
        `growth "${forGrowth}" (${growthCalls} read) · others ${String(forOthers)} (${calls} read)`];
    } finally {
      twin.attentionCount = real;
    }
  });
  await check(p(L.s4d), async () => {
    globalThis.__50PICK_CAMPAIGNS_READ_FAULT = true;
    try {
      // CONTROL inside the case: the memory twin really does throw synchronously under the fault, or this proves nothing.
      let twinThrows = false;
      try { (db.smsCampaign as unknown as { attentionCount: () => unknown }).attentionCount(); } catch { twinThrows = true; }
      let syncThrow = false, rejected = false;
      let value: unknown = "unset";
      let pending: Promise<string | undefined> | null = null;
      try { pending = impl.badge(true); } catch { syncThrow = true; }
      if (pending) { try { value = await pending; } catch { rejected = true; } }
      return [twinThrows && !syncThrow && !rejected && value === undefined,
        `the twin throws sync ${twinThrows} · the badge threw ${syncThrow} · rejected ${rejected} · resolved ${String(value)}`];
    } finally {
      globalThis.__50PICK_CAMPAIGNS_READ_FAULT = false;
    }
  });
  await check(p(L.s4e), () => {
    const shell = S.shell;
    const call = 'getSidebarBadges(isOwner || viewDomains.includes("accounting"), isOwner || viewDomains.includes("growth"))';
    const sig = shell.includes("export const getSidebarBadges = reactCache(async (canSeeMoney: boolean, canSeeGrowth: boolean) => {");
    const reads = shell.includes("campaignAttentionBadge(canSeeGrowth).catch(() => undefined),");
    const callers = count(shell, call);
    const allCalls = count(shell, "getSidebarBadges(");
    return [sig && reads && callers === 2 && allCalls === 2, `signature ${sig} · read ${reads} · two-argument callers ${callers} of ${allCalls}`];
  });
  await check(p(L.s4f), () => {
    const shell = S.shell;
    const from = shell.indexOf("export const getSidebarBadges");
    const ret = shell.indexOf("  return {", from);
    const end = shell.indexOf("  };", ret);
    const block = from >= 0 && ret > from && end > ret ? shell.slice(ret, end) : "";
    const keys = block.split(NL).map((l) => l.trim()).filter((l) => /^[a-z]+:/.test(l)).map((l) => l.slice(0, l.indexOf(":")));
    const spread = block.includes("...(campaigns === undefined ? {} : { campaigns }),");
    const all = spread ? [...keys, "campaigns"] : keys;
    const nav = NAV.navKeys();
    return [all.length === 5 && spread && all.every((k) => nav.has(k)), `keys [${all.join(",")}] · not a nav key: [${all.filter((k) => !nav.has(k)).join(",")}]`];
  });
  await check(p(L.s4g), async () => {
    const twin = db.smsCampaign as unknown as { attentionCount: () => unknown };
    const real = twin.attentionCount;
    twin.attentionCount = () => 0;
    try {
      const v = await impl.badge(true);
      const keyed = /^ *campaigns:/m.test(S.shell);
      return [v === undefined && !keyed, `an empty count gives ${JSON.stringify(v)} · a campaigns key in the object ${keyed}`];
    } finally {
      twin.attentionCount = real;
    }
  });

  /* ══ 5 · THE PAGE, READ ═════════════════════════════════════════════════════════════════════════════════════════ */
  await check(p(L.s5a), () => {
    const files = { page: S.page, rail: S.rail, railModel: S.railModel, loader: S.loader, copy: S.copy };
    const money = Object.entries(files).filter(([, s]) => /formatTzs|TZS|budgetTzs|estimateTzs|estimateSegments/.test(s)).map(([k]) => k);
    return [money.length === 0, `money read in: [${money.join(",")}]`];
  });
  await check(p(L.s5b), () => {
    const page = S.page;
    return [!page.includes("audienceFilter") && !page.includes("{c.stopReason}") && page.includes("stopReasonLabel(c.stopReason)")
      && CS.stopReasonLabel("mystery_key") === "Engine reason: mystery_key",
      `audienceFilter ${page.includes("audienceFilter")} · raw reason ${page.includes("{c.stopReason}")}`];
  });
  await check(p(L.s5c), () => {
    const TIMERS = ["setInterval", "setTimeout", "Date.now(", "requestAnimationFrame", '"use client"', "useEffect"];
    const found = TIMERS.filter((t) => S.page.includes(t) || S.rail.includes(t));
    return [S.page.includes("const p = campaignProgress(c, counts);") && S.page.includes("<ProgressBar value={p.value} max={p.max}") && found.length === 0,
      `found [${found.join(",")}]`];
  });
  await check(p(L.s5d), () => {
    const files = walkFiles(join(ROOT, "src", "app", "admin", "campaigns"));
    const pulsing = files.filter((f) => /pulse/.test(decomment(readFileSync(f, "utf8"))));
    return [files.length >= 7 && pulsing.length === 0, `${files.length} files · pulsing: [${pulsing.join(",")}]`];
  });
  await check(p(L.s5e), () => {
    const page = S.page;
    const bare = campaignRail({ sp: { status: "paused" }, counts: null }).options.every((o) => o.count === undefined);
    return [page.includes('<AdminLoadError what="the SMS campaigns" />') && count(page, "<CampaignStatusRail") === 1
      && page.includes("{!emptyTable && <CampaignStatusRail rail={rail} />}")
      && page.includes("const emptyTable = view !== null && campaignTotal(view.counts) === 0;")
      && page.includes("const rail = campaignRail({ sp, counts: view?.counts ?? null });") && bare,
      `rails ${count(page, "<CampaignStatusRail")} · bare rail without counts ${bare}`];
  });
  await check(p(L.s5f), () => {
    const exists = (route: string) => existsSync(join(ROOT, "src", "app", ...route.split("/").filter(Boolean), "page.tsx"));
    const composeExists = exists(CS.CAMPAIGN_SCREEN_ROUTES.compose);
    const detailExists = exists(CS.CAMPAIGN_SCREEN_ROUTES.detail);
    const page = S.page;
    const gated = page.includes("{CAMPAIGN_SCREENS.detail ? <Link href={campaignDetailHref(c.id) as Route}")
      && page.includes("actions={CAMPAIGN_SCREENS.compose ? <Link href={CAMPAIGN_SCREEN_ROUTES.compose as Route}")
      && !page.includes('"/admin/campaigns/new"') && !page.includes("`/admin/campaigns/")
      // U37b · and the ghost reserves the head's action behind the SAME flag, so the card's top edge holds at 360 too.
      && S.loading.includes('actions={CAMPAIGN_SCREENS.compose ? <div data-skeleton="campaigns-new">');
    return [impl.screens.compose === composeExists && impl.screens.detail === detailExists && gated,
      `compose flag ${impl.screens.compose} / page ${composeExists} · detail flag ${impl.screens.detail} / page ${detailExists} · gated ${gated}`];
  });
  await check(p(L.s5g), () => {
    const page = S.page;
    return [page.includes("title={CAMPAIGNS_EMPTY.title}") && page.includes("CAMPAIGNS_NO_MATCH[view.rail]") && page.includes("{CAMPAIGNS_SHOW_ALL}")
      && page.includes("campaignsHref(sp, { status: null })") && page.indexOf("<CampaignStatusRail") < page.indexOf("<ScrollX")
      && page.includes("<AdminPagination total={view.result.total} page={view.page} baseHref={campaignsHref(sp)} />")
      && page.includes("{view !== null && inFlight && (") && page.includes("<RefreshButton />")
      && COPY.CAMPAIGNS_EMPTY.title === "No SMS campaigns yet" && COPY.CAMPAIGNS_NO_MATCH.paused.title === "No paused campaigns"
      && COPY.campaignsAsOf("2026-10-02T11:03:00.000Z") === "As of 14:03 EAT — this list does not refresh by itself.",
      COPY.campaignsAsOf("2026-10-02T11:03:00.000Z")];
  });
  await check(p(L.s5h), () => {
    const seed = S.seed;
    const post = seed.slice(Math.max(0, seed.indexOf("export async function POST(")));
    const guardAt = post.indexOf('process.env.NODE_ENV === "production"');
    const awaitAt = post.indexOf("await ");
    const sms = ["sendBatch", "SmsMessage", "smsMessage", '"@/lib/server/sms"', "purpose:"].filter((t) => seed.includes(t));
    return [seed.length > 500 && guardAt >= 0 && (awaitAt === -1 || guardAt < awaitAt) && post.includes("status: 404") && sms.length === 0,
      `guard at ${guardAt}, first await at ${awaitAt} · SMS tokens [${sms.join(",")}]`];
  });
  await check(p(L.s5i), () => {
    const rail = S.rail;
    const tags = rail.split("<FilterPill").slice(1).map((s) => s.slice(0, s.indexOf("/>")));
    const lines = tags.length === 1 ? tags[0].split(NL).map((l) => l.trim()) : [];
    const declared = adminSurfaces(S.gate).split(NL).some((l) => l.trim().startsWith('"src/app/admin/campaigns/campaign-status-rail.tsx",'));
    return [count(rail, 'data-filter-rail="campaign-status"') === 1 && tags.length === 1
      && lines.includes('rank="dense"') && lines.includes('semantics="tab"') && lines.includes("replace") && lines.includes("scroll={false}")
      && lines.includes("testId={`status:${o.key}`}") && rail.includes("<FilterGroupKey>{rail.groupKey}</FilterGroupKey>")
      && !rail.includes('"use client"') && !rail.includes("/admin/campaigns") && !/"(All|Drafts|Sending|Paused|Finished|Status)"/.test(rail)
      && declared,
      `${tags.length} FilterPill tag(s) · declared ${declared}`];
  });
  await check(p(L.s5j), async () => {
    const counts = (await impl.load({})).counts;
    const sp = { status: "paused", sort: "name", dir: "asc", page: "3", utm_source: "x" };
    const r = campaignRail({ sp, counts });
    const q = (h: string) => new URL(h, "http://x").searchParams;
    const kept = r.options.every((o) => q(o.href).get("sort") === "name" && q(o.href).get("dir") === "asc" && !q(o.href).has("page") && !q(o.href).has("utm_source"));
    const statuses = r.options.map((o) => q(o.href).get("status") ?? "").join(",");
    const on = r.options.filter((o) => o.on).map((o) => o.key);
    const counted = r.options.map((o) => o.count).join(",");
    const bare = campaignRail({ sp, counts: null }).options.every((o) => o.count === undefined);
    const unknown = campaignRail({ sp: { status: "nope" }, counts }).options.filter((o) => o.on).map((o) => o.key);
    return [kept && statuses === ",drafts,sending,paused,finished" && on.length === 1 && on[0] === "paused" && counted === "10,2,3,3,2" && bare
      && unknown.length === 1 && unknown[0] === "" && JSON.stringify(campaignsLinkSp(sp)) === JSON.stringify({ status: "paused", sort: "name", dir: "asc" })
      && campaignsHref(sp, { page: "2" }) === "/admin/campaigns?status=paused&sort=name&dir=asc&page=2",
      `statuses [${statuses}] · on [${on}] · counts [${counted}] · ${campaignsHref(sp, { page: "2" })}`];
  });
}

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${NL}campaigns-page: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${NL}§0 baseline: ${pass} passed, ${fail} failed${NL}`);

  /* ── the plants: each one a nav, a function, a loader, a flag or a source string as somebody would write it wrongly ── */
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const relabel = (label: string) =>
    NAV.NAV_GROUPS.map((g) => ({ ...g, items: g.items.map((it) => (it.key === "campaigns" ? { ...it, label } : it)) })) as typeof NAV.NAV_GROUPS;
  /** The crumb as the title-caser builds it with no CRUMB_LABELS row. */
  const titleCased = (path: string) =>
    ["Admin", ...path.replace(/^[/]admin[/]?/, "").split("/").filter(Boolean).map((s) => s.replace(/-/g, " ").replace(/^./, (ch) => ch.toUpperCase()))];
  /** A loader that counts the rail from the page it just read. */
  const countsFromPage = async (sp: CampaignsParams): Promise<CampaignsView> => {
    const v = await loadCampaigns(sp);
    return { ...v, counts: CS.tallyCampaignStatuses(v.result.rows.map((c) => ({ status: c.status, count: 1 }))) };
  };
  /** A loader that reads the requested page as asked — no clamp, no second read. */
  const noClamp = async (sp: CampaignsParams): Promise<CampaignsView> => {
    const v = await loadCampaigns({ ...sp, page: undefined });
    const requested = Math.max(1, Number.parseInt(String(first(sp.page) ?? "1"), 10) || 1);
    const statuses = CS.statusesForRail(String(first(sp.status) ?? ""));
    const result = await db.smsCampaign.page({ statuses, sort: v.sort, dir: v.dir, offset: (requested - 1) * PER_PAGE, limit: PER_PAGE });
    return { ...v, result, page: requested };
  };
  const heldSettled: typeof CS.campaignProgress = (c, counts) => {
    const pr = CS.campaignProgress(c, counts);
    return pr !== null && pr.phase === "sending" ? { ...pr, value: pr.value + counts.HELD } : pr;
  };
  const zeroForEmpty: typeof CS.campaignProgress = (c, counts) => CS.campaignProgress(c, counts) ?? { phase: "sending", value: 0, max: 0 };
  /** U36 review F1, undone: the preparing phase asks only the audience, so a campaign with no row yet paints 0 of N. */
  const preparedFromNothing: typeof CS.campaignProgress = (c, counts) => {
    const pr = CS.campaignProgress(c, counts);
    const preparing = c.status === "PREPARING" || ((c.status === "PAUSED" || c.status === "CANCELLED") && c.enqueuedAt === null);
    const max = c.audienceCount ?? 0;
    return pr === null && preparing && max > 0 ? { phase: "preparing", value: 0, max } : pr;
  };
  /** U36 review F2, undone: the loader parses the raw value while every link trims it. */
  const untrimmedSort = (sp: CampaignsParams): ReturnType<typeof campaignsSort> => {
    const s = first(sp.sort);
    const d = first(sp.dir);
    return { sort: s === "name" || s === "updated" || s === "created" ? s : "created", dir: d === "asc" ? "asc" : "desc" };
  };
  const forEveryone = async (_canSeeGrowth: boolean): Promise<string | undefined> => {
    const n = await db.smsCampaign.attentionCount();
    return n > 0 ? String(n) : undefined;
  };
  /** B-28's shape exactly: the argument is evaluated — and throws — before Promise.resolve is ever called. */
  const promiseResolved = (canSeeGrowth: boolean): Promise<string | undefined> => {
    if (!canSeeGrowth) return Promise.resolve(undefined);
    return Promise.resolve(db.smsCampaign.attentionCount()).catch(() => 0).then((n) => (n > 0 ? String(n) : undefined));
  };
  const everyPaused = () =>
    [...mem().smsCampaigns.values()].filter((c) => c.status === "PREPARING" || c.status === "RUNNING" || c.status === "PAUSED").length;
  const timerPage = REAL_SOURCES.page.replace("value={p.value}", "value={Math.min(p.max, Math.floor((Date.now() - startedMs) / 1000))}");
  const moneyPage = REAL_SOURCES.page.replace(
    '<td className="whitespace-nowrap">{segmentsLine(c.segmentsSw, c.segmentsEn)}</td>',
    '<td className="whitespace-nowrap">{segmentsLine(c.segmentsSw, c.segmentsEn)}</td>' + NL + '      <td className="tabular-nums">{formatTzs(c.budgetTzs ?? 0)}</td>',
  );
  const oneArgShell = REAL_SOURCES.shell.replace(
    'getSidebarBadges(isOwner || viewDomains.includes("accounting"), isOwner || viewDomains.includes("growth"))',
    'getSidebarBadges(isOwner || viewDomains.includes("accounting"), false)',
  );
  const railOnRows = REAL_SOURCES.page.replace("{!emptyTable && <CampaignStatusRail rail={rail} />}", "{rows.length > 0 && !emptyTable && <CampaignStatusRail rail={rail} />}");
  // ⛔ A source plant that found nothing to replace proves nothing — each must differ from the shipped text.
  const sourcePlants: Array<[string, string, string]> = [
    ["a timer-driven bar", timerPage, REAL_SOURCES.page],
    ["formatTzs on the list", moneyPage, REAL_SOURCES.page],
    ["one shell caller drops the growth answer", oneArgShell, REAL_SOURCES.shell],
    ["the rail gated on the page's rows", railOnRows, REAL_SOURCES.page],
  ];
  for (const [name, planted, shipped] of sourcePlants) if (planted === shipped) problems.push(`PLANT "${name}" did not apply — its anchor is gone`);

  const CASES: Array<{ name: string; expect: string; impl: Impl }> = [
    /* ── the plan's RED line (§9 U36), each on its own label ── */
    { name: "a nav item labelled 'Campaigns'", expect: L.s1b, impl: { ...REAL, nav: relabel("Campaigns") } },
    { name: "HELD counted as settled — a campaign that still owes people a message reads as complete", expect: L.s3b, impl: { ...REAL, progress: heldSettled } },
    { name: "the badge read for a viewer without growth", expect: L.s4c, impl: { ...REAL, badge: forEveryone } },
    { name: "the rail counted from the filtered page", expect: L.s2d, impl: { ...REAL, load: countsFromPage } },
    { name: "a timer-driven bar", expect: L.s5c, impl: { ...REAL, sources: { ...REAL_SOURCES, page: timerPage } } },
    { name: "formatTzs on the list", expect: L.s5a, impl: { ...REAL, sources: { ...REAL_SOURCES, page: moneyPage } } },
    { name: "the detail flag on with no page", expect: L.s5f, impl: { ...REAL, screens: { compose: false, detail: true } } },
    /* ── and the rest of the spec's plants ── */
    { name: "the crumb title-cased from the segment (no CRUMB_LABELS row)", expect: L.s1e, impl: { ...REAL, crumbs: titleCased } },
    { name: "the requested page used as asked — page 9 of ten rows says 'no matches'", expect: L.s2c, impl: { ...REAL, load: noClamp } },
    { name: "an empty campaign painted as 0 of 0", expect: L.s3c, impl: { ...REAL, progress: zeroForEmpty } },
    { name: "a campaign confirmed then cancelled before its first row reads '0 of 300 prepared' (U36 review F1)", expect: L.s3c, impl: { ...REAL, progress: preparedFromNothing } },
    { name: "the loader reads an untrimmed sort while every link trims it — page 2 in the other order (U36 review F2)", expect: L.s2g, impl: { ...REAL, sortOf: untrimmedSort } },
    { name: "the memory twin carries its own predicate — every PAUSED campaign counted", expect: L.s4b, impl: { ...REAL, twinAttention: everyPaused } },
    { name: "Promise.resolve(db.smsCampaign.attentionCount()) over a synchronous throw (B-28)", expect: L.s4d, impl: { ...REAL, badge: promiseResolved } },
    { name: "one shell caller drops the growth answer", expect: L.s4e, impl: { ...REAL, sources: { ...REAL_SOURCES, shell: oneArgShell } } },
    { name: "the rail gated on the page's rows — a filter that matches nothing takes its own undo with it", expect: L.s5e, impl: { ...REAL, sources: { ...REAL_SOURCES, page: railOnRows } } },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}${NL}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${NL}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${NL}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
