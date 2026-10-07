/**
 * U38b · /admin/campaigns/new — THE AUDIENCE CARD, counted: its rail, its keyed count, the D19 floor, and the words on the
 * campaign list's rows. Driven and MEASURED on a LOCAL in-memory server (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.4
 * "Drive"). `npm run qa:marketing-audience`.
 *
 * WHAT THIS PROVES, as GROWTH (a viewer who may NOT read a number — masked) and ADMIN (a reader), each at 1280x800 and
 * 360x780 with reduced motion, HeadlessChrome in the UA. Every capture asserts the page's heading and the sentence its
 * state is about BEFORE it photographs (`stateShot`), and frames the Audience card; long cards get extra tiles on the part
 * a framed capture cannot reach (`tileOn`). Viewport tiles only — never a full-page capture.
 *   · NOT CHOSEN — a new campaign: "Choose who receives it — the counts appear once you choose.", the rail is Who alone,
 *     nothing is counted (no count block at all), and the standing callout is there.
 *   · FILTERED, EVERY BUCKET — `?pop=players&op=TELXER,TTCL` is exactly the seeded thirteen accounts: 13 on the campaign,
 *     6 will receive, 6 not receiving, 1 can't be sent to; the five reasons as rows, dominant first, protected ONE row
 *     (2); five sample rows, every number masked; "Counted at HH:MM:SS EAT · took N.N s." — the figures against the seed's
 *     own expectation — for ADMIN. ⛔ D19 · OD65: GROWTH gets the COUNT ALONE even over ten people — "13" and the
 *     count-alone sentence, no will-receive figure, no reason, no sample — in the DOM and in the page's RSC payload
 *     (fetched as the router fetches it: no reason or figure word, no account id, no `contactPhone`, no detail attribute,
 *     while the sentence itself IS there — the card's own marker), while ADMIN's payload carries the sample's detail (the
 *     control that the check can see one).
 *   · COMPUTING — with every count held 4 s (dev switch), pressing the Operator axis's "Any" mounts the NEW filter's own
 *     fallback at once ("Counting who will receive it…"), and the old numbers are gone while it counts (the keyed
 *     Suspense, B5); then the new count lands.
 *   · THREE PEOPLE — "U38b floor list" (three contacts): GROWTH sees the count alone — "3" and "Your role sees how many
 *     people match, not who will receive it." — no will-receive figure, no reason, no sample, in the DOM or the RSC payload; ADMIN sees the whole
 *     breakdown of the same three.
 *   · EMPTY — a tag nobody carries: "Nobody matches this audience." with the rail kept (GROWTH: the count 0; ADMIN: real
 *     zeros in every figure).
 *   · REFUSED — `?pop=players&tag=vip`: the parser's own sentence (a book-only axis beside player accounts), "Remove the
 *     filter", no count, and a rail without the contact book's axes; Remove takes it back to nobody chosen.
 *   · ERROR — with the count made to throw (dev switch): "Couldn't count this audience — nothing is wrong with the
 *     campaign." with "Count again"; the fault cleared, "Count again" counts the same address.
 *   · THE LIST — a draft saved through the composer with that population reads "Player accounts · Operator: Telxer or
 *     TTCL" on /admin/campaigns for both roles; a seeded draft that asks consent reads "Audience hidden for your role." to
 *     GROWTH and "Consent: given" to ADMIN; no sideways scroll at 1280.
 *   · LOADING — the saved draft opened from the list with the composer's chunks held: the route's own ghost, its count
 *     block, then the page — the row linking to the draft's canonical address, so no redirect (STD-1) and the chunks really
 *     held (STD-3); the count block's ghost is GROWTH's real block, the count alone (OD65), within 2px at both widths,
 *     and the whole card's difference is RECORDED (the rail and the words depend on the role and on how pills wrap).
 *   · FIT — no sideways scroll and nothing past the Audience card's edge, at both widths, in every state; and no page
 *     threw an uncaught exception at any width or role (the dev overlay is hidden from the captures, so it is asserted).
 * ⚠️ DEPARTURES, recorded: (1) the whole card's ghost is NOT asserted equal to the page — only its count block (the spec
 * asks "delta 0"; the rail's pills wrap by label width and the words depend on the filter — recorded, as U36's rail
 * ghost records its own); (2) reduced motion at BOTH widths (the bars' grow-in would otherwise be photographed mid-way).
 *
 * Run (in-memory, zero prod risk; a FRESH server — the seed's counts assume no other player accounts on TTCL or Telxer,
 * and remove .next before the boot: a stale .next 404s every /api/dev-test route):
 *   SMS_PROVIDER=console SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3012
 *   BASE=http://localhost:3012 node scripts/live/marketing-u38b-audience-drive.mjs
 * ⛔ A PC whose `.env.local` holds REAL Blackball keys: pin `SMS_PROVIDER=console` — nothing in this drive sends, and the
 *   console stub reaches no phone even if something did. ⛔ No DATABASE_URL: the seeds write the in-memory store.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3012";
const SHOTS = join(".qa-shots", "marketing-setup", "u38b");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Whitespace runs, built from character codes (space, tab, LF, CR, no-break space) — no escape in this file. */
const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
const squash = (s) => (s || "").replace(WS, " ").trim();
const DOT4 = String.fromCharCode(0x2022).repeat(4);
const MASKED = new RegExp("^[+]255" + DOT4 + "[0-9]{2}");

/* ── the page's own words (audience-copy.ts, audience.ts, campaigns-copy.ts) — what each state must print ── */
const TITLE = "New SMS campaign";
const LIST_TITLE = "SMS campaigns";
const NOT_CHOSEN = "Choose who receives it — the counts appear once you choose.";
const COMPUTING = "Counting who will receive it…";
const COUNTED_RE = /^Counted at [0-9]{2}:[0-9]{2}:[0-9]{2} EAT · took [0-9]+[.][0-9] s[.] Every number is checked again when it is sent[.]$/;
/** The footer's opening words, in the case the page prints them (a figure's label is set in capitals by CSS). */
const COUNTED_AT = "Counted at ";
const FLOOR = "Your role sees how many people match, not who will receive it.";
const EMPTY = "Nobody matches this audience.";
const ERROR = "Couldn't count this audience — nothing is wrong with the campaign.";
const COUNT_AGAIN = "Count again";
const RECHECK = "Every number is checked again at the moment its message is sent — a stop, a withdrawn consent, self-exclusion, a break, age and the account's status all refuse it then.";
const BOOK_ONLY = "This narrows the contact book only — a player account has no such field. Choose the contact book as the audience, or take it off.";
const REMOVE_FILTER = "Remove the filter";
const HIDDEN_ROW = "Audience hidden for your role.";
const POP_WORDS = "Player accounts · Operator: Telxer or TTCL";
const REASON = {
  suppressed: "Stopped (on the stop list)",
  no_consent: "No consent or recorded basis",
  withdrawn: "Withdrew consent",
  age_unknown: "Age not confirmed",
  // U33r · the ONE protected line names the promised agent referee too (audience-copy.ts).
  protected: "Protected (responsible gambling, age, account status or agent referee)",
};
const FIGURE_LABEL = { onCampaign: "On this campaign", willReceive: "Will receive now (forecast)", notReceiving: "Not receiving", unsendable: "Can't be sent to" };
const nf = new Intl.NumberFormat("en-US");

const S = {
  card: '[data-block="compose-audience"]',
  state: "[data-audience]",
  rail: '[data-filter-rail="campaign-audience"]',
  notChosen: "[data-audience-not-chosen]",
  count: "[data-audience-count]",
  reasons: "[data-audience-reasons]",
  sampleRow: "[data-audience-sample-row]",
  sampleWho: "[data-audience-sample-who]",
  sampleStatus: "[data-audience-sample-status]",
  counted: "[data-audience-counted]",
  floor: "[data-audience-floor]",
  empty: "[data-audience-empty]",
  error: "[data-audience-error]",
  again: "[data-audience-count-again]",
  computing: "[data-audience-computing]",
  problem: "[data-audience-problem]",
  clear: "[data-audience-clear]",
  recheck: "[data-audience-recheck]",
  lines: "[data-audience-line]",
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  save: "[data-compose-save]",
  saved: "[data-compose-saved]",
  form: "[data-compose-form]",
  ghostCard: '[data-skeleton="compose-audience"]',
  ghostCount: '[data-skeleton="compose-audience-count"]',
};
const figureSel = (name) => `[data-audience-figure="${name}"]`;

const browser = await chromium.launch();
const runId = String(Date.now()).slice(-5);
const ROLE_CODE = { GROWTH: 2, ADMIN: 1 };

/** Every uncaught exception a page throws in the browser, with its role — the drive ends red on any. */
const pageErrors = [];

async function staffCtx(role, viewport, n = 1) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  // The dev server's own badge (a corner bubble production never has) is hidden from every capture — nothing else.
  await ctx.addInitScript(() => {
    const hide = () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal { display: none !important; }";
      document.head.appendChild(st);
    };
    if (document.head) hide(); else document.addEventListener("DOMContentLoaded", hide);
  });
  const page = await ctx.newPage();
  // ⛔ A dirty form asks before it unloads (UnsavedChangesGuard): every page in this drive answers "leave".
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  page.on("pageerror", (e) => { pageErrors.push(`${role} ${viewport.width}: ${String(e?.message ?? e).slice(0, 200)}`); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  // E.164, as every house drive seeds: +255, then 70, five run digits, the role's code and a slot.
  const phone = `+25570${runId}${ROLE_CODE[role]}${n}`;
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

/** A dev-only seed or switch; refuses to go on when it did not answer `ok`. */
async function seed(page, path) {
  const r = await page.request.post(`${BASE}/api/dev-test/${path}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok() || body.ok !== true) throw new Error(`seed ${path} failed: ${r.status()} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

const mainText = async (page) => squash(await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? ""));
const heading = async (page) => squash(await page.locator("main#main-content h1").first().innerText().catch(() => ""));
const textOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? squash(await page.locator(sel).first().innerText().catch(() => "")) : "");
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name).catch(() => null);
const countState = (page) => attr(page, S.count, "data-audience-count");
/** A figure tile's printed value — the kit Stat's second line. */
const figure = (page, name) => page.evaluate((sel) => document.querySelector(sel)?.querySelectorAll("p")[1]?.textContent?.trim() ?? null, figureSel(name));
/** The reason rows, as their own hover titles say them ("Withdrew consent: 1"), in the order drawn. */
const reasonTitles = (page) => page.$$eval(`${S.reasons} [title]`, (els) => els.map((e) => e.getAttribute("title") ?? ""));
/** The rail's group keys, in the order drawn. */
const railGroups = (page) => page.$$eval(`${S.rail} [data-rail-group]`, (els) => els.map((e) => e.getAttribute("data-rail-group") ?? ""));
const boxOf = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100 };
}, sel);

/** The composer at `query`, settled: the heading, the card, and no count still being counted. */
async function openComposer(page, query = "") {
  await page.goto(`${BASE}/admin/campaigns/new${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 120000 });
  await page.waitForSelector(S.state, { timeout: 90000 }).catch(() => {});
  await settle(page);
}
/** No keyed fallback on screen any more (the count landed, or there is none). */
async function settle(page, timeout = 45000) {
  await page.waitForFunction((s) => !document.querySelector(s), '[data-audience-count="computing"]', { timeout }).catch(() => {});
  await wait(600);
}
/** The page's RSC payload, fetched as the router fetches it — what reaches the browser, rendered or not. */
async function flightOf(page, pathAndQuery) {
  const r = await page.request.get(`${BASE}${pathAndQuery}`, { headers: { RSC: "1" } });
  return r.ok() ? await r.text() : "";
}

/** Viewport tiles only: the Audience card's top, scrolled into view. */
async function shoot(page, name, frame = S.card) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), frame);
  await wait(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}
/** A tile centred on one node itself — the parts of a long card a capture framed on its top cannot reach. */
async function tileOn(page, vp, name, sel) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center" }), sel);
  await wait(250);
  const inView = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0;
  }, sel);
  ok(`${vp} · ${name} · the tile frames ${sel}`, inView);
  await page.screenshot({ path: join(SHOTS, `${vp}-${name}.png`) });
}
/** ⛔ Every capture asserts what it photographs FIRST — the heading, and the sentence the state is about. */
async function stateShot(page, vp, name, wantText, frame = S.card, wantHeading = TITLE) {
  const h1 = await heading(page);
  const text = await mainText(page);
  ok(`${vp} · ${name} · the capture shows the "${wantHeading}" heading and "${wantText.slice(0, 70)}"`, h1 === wantHeading && text.includes(wantText),
    `h1="${h1}" text="${text.slice(0, 220)}"`);
  await shoot(page, `${vp}-${name}`, frame);
}
/** FIT: no sideways scroll, nothing past the Audience card's edge. */
async function fitCheck(page, vp, name) {
  const f = await page.evaluate((s) => {
    const card = document.querySelector(s);
    const box = card ? (card.querySelector(".glass-panel") ?? card) : null;
    const spill = [];
    if (box) {
      const br = box.getBoundingClientRect();
      for (const el of box.querySelectorAll("*")) {
        if (el.classList.contains("sr-only")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > br.right + 1 || r.left < br.left - 1) spill.push(el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30));
      }
    }
    return { overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), spill: spill.slice(0, 5), spillCount: spill.length };
  }, S.card);
  ok(`${vp} · ${name} · FIT — no sideways scroll, nothing past the Audience card's edge`, f.overflow === 0 && f.spillCount === 0, JSON.stringify(f));
}

const VPS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "360", width: 360, height: 780 },
];
const EVERY_BUCKET = "?pop=players&op=TELXER,TTCL";

/* ══ THE WORLD — through the dev seeds (404 in production), each through the platform's own writers ═══════════════ */
let world = null;
{
  const { ctx, page } = await staffCtx("ADMIN", VPS[0], 9);
  world = await seed(page, "marketing-audience-seed?world=1");
  await seed(page, "marketing-contacts-seed?count=45");
  await seed(page, "marketing-campaigns-seed?set=base");
  await seed(page, "marketing-audience-seed?delayMs=0");
  await seed(page, "marketing-audience-seed?fault=0");
  const e = world.expected;
  ok("WORLD · the audience seed answers its fixture: 13 accounts (6 will receive, 1 unsendable, 2 protected …) and a list of three",
    e.matching === 13 && e.willReceive === 6 && e.unsendable === 1 && e.notReceiving === 6 && e.reasons.protected === 2 && world.listMembers === 3,
    JSON.stringify({ expected: e, listMembers: world.listMembers, created: world.created }));
  await ctx.close();
}
const E = world.expected;
const savedDrafts = {};
const measured = {};

/* ══ EACH VIEWER, AT EACH WIDTH ═══════════════════════════════════════════════════════════════════════════════════ */
for (const role of ["GROWTH", "ADMIN"]) {
  const reads = role === "ADMIN";
  for (const vp of VPS) {
    const tag = `${vp.name}-${role.toLowerCase()}`;
    console.log(`\n── ${role} at ${vp.name} (reduced motion) ──`);
    const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, vp.width === 1280 ? 1 : 2);
    ok(`${tag} · UA carries HeadlessChrome`, /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));

    // ── NOT CHOSEN ──────────────────────────────────────────────────────────────────────────────────────────────
    await openComposer(page);
    ok(`${tag} · NOT CHOSEN · the card asks who receives it, counts nothing, the rail is Who alone, the callout stands`,
      (await attr(page, S.state, "data-audience")) === "not-chosen" && (await textOf(page, S.notChosen)) === NOT_CHOSEN
        && !(await has(page, S.count)) && (await railGroups(page)).join(",") === "pop" && (await textOf(page, S.recheck)) === RECHECK,
      `${await attr(page, S.state, "data-audience")} · groups ${(await railGroups(page)).join(",")}`);
    await stateShot(page, tag, "not-chosen", NOT_CHOSEN);
    await fitCheck(page, tag, "not-chosen");

    // ── FILTERED, EVERY BUCKET ──────────────────────────────────────────────────────────────────────────────────
    await openComposer(page, EVERY_BUCKET);
    const words = squash((await page.$$eval(S.lines, (els) => els.map((e) => e.textContent ?? ""))).join(" · "));
    const titles = await reasonTitles(page);
    const wantTitles = [
      `${REASON.protected}: 2`, `${REASON.suppressed}: 1`, `${REASON.no_consent}: 1`, `${REASON.withdrawn}: 1`, `${REASON.age_unknown}: 1`,
    ];
    ok(`${tag} · FILTERED · the words say who: "${POP_WORDS}"`, words === POP_WORDS, words);
    const flight = await flightOf(page, `/admin/campaigns/new${EVERY_BUCKET}`);
    const detailMarks = ["data-audience-sample-who", "data-audience-sample-status", "usr_u38b_p", "contactPhone"].filter((m) => flight.includes(m));
    if (reads) {
      ok(`${tag} · FILTERED · the figures are the seed's own: ${E.matching} on the campaign, ${E.willReceive} will receive, ${E.notReceiving} not receiving, ${E.unsendable} can't be sent to (a reader)`,
        (await countState(page)) === "full" && (await figure(page, "onCampaign")) === nf.format(E.matching)
          && (await figure(page, "willReceive")) === nf.format(E.willReceive) && (await figure(page, "notReceiving")) === nf.format(E.notReceiving)
          && (await figure(page, "unsendable")) === nf.format(E.unsendable) && !(await has(page, figureSel("unchecked"))),
        JSON.stringify({ state: await countState(page), on: await figure(page, "onCampaign"), will: await figure(page, "willReceive"), not: await figure(page, "notReceiving"), unsendable: await figure(page, "unsendable") }));
      ok(`${tag} · FILTERED · the five reasons, dominant first — protected ONE row (2) — each with its count`,
        JSON.stringify(titles) === JSON.stringify(wantTitles), JSON.stringify(titles));
      const sampleTexts = await page.$$eval(S.sampleRow, (els) => els.map((e) => e.textContent ?? ""));
      ok(`${tag} · FILTERED · five sample rows, every number masked`, sampleTexts.length === 5 && sampleTexts.every((t) => MASKED.test(squash(t))),
        sampleTexts.map(squash).join(" | "));
      ok(`${tag} · FILTERED · a reader's sample rows say what each row is and where the gate put it`,
        (await page.locator(S.sampleWho).count()) === 5 && (await page.locator(S.sampleStatus).count()) === 5);
      ok(`${tag} · FILTERED · the footer says when it was counted and how long it took`, COUNTED_RE.test(await textOf(page, S.counted)), await textOf(page, S.counted));
      ok(`${tag} · FILTERED · CONTROL · the reader's RSC payload carries the sample's detail — the masked check can see it`,
        flight.length > 1000 && detailMarks.includes("data-audience-sample-who"), `payload ${flight.length} chars · marks [${detailMarks.join(", ")}]`);
      // (A figure's label is set in capitals and innerText reads it so — the capture asserts the footer's sentence instead.)
      await stateShot(page, tag, "filtered-every-bucket", COUNTED_AT);
      await tileOn(page, tag, "filtered-reasons", S.reasons);
      await tileOn(page, tag, "filtered-sample", S.counted);
    } else {
      // ⛔ OD65 · OVER TEN PEOPLE TOO: a masked viewer is never shown the breakdown before the campaign sends.
      const leaks = [FIGURE_LABEL.willReceive, "Not receiving, by reason", "The first numbers in sending order", ...Object.values(REASON)].filter((w) => flight.includes(w));
      ok(`${tag} · FILTERED · ⛔ D19 · OD65 · ${E.matching} people (over E23's old floor of 10): the count alone, "${E.matching}", and why — no will-receive figure, no reason, no sample`,
        (await countState(page)) === "floor" && (await figure(page, "onCampaign")) === nf.format(E.matching) && (await textOf(page, S.floor)) === FLOOR
          && !(await has(page, figureSel("willReceive"))) && !(await has(page, S.reasons)) && (await page.locator(S.sampleRow).count()) === 0,
        `${await countState(page)} · ${await figure(page, "onCampaign")} · ${await textOf(page, S.floor)}`);
      ok(`${tag} · FILTERED · ⛔ OD65 · …and none of it is in the page's RSC payload, while the count-alone sentence is (the card's own marker)`,
        flight.length > 1000 && flight.includes(FLOOR) && leaks.length === 0 && detailMarks.length === 0,
        `leaked [${leaks.join(", ")}] · marks [${detailMarks.join(", ")}] · payload ${flight.length} chars`);
      await stateShot(page, tag, "filtered-count-alone", FLOOR);
    }
    await fitCheck(page, tag, "filtered-every-bucket");

    // ── COMPUTING — the keyed fallback, never the old numbers under the new words ───────────────────────────────
    await seed(page, "marketing-audience-seed?delayMs=4000");
    try {
      await page.locator(`${S.rail} [data-chip="op:"]`).first().click();
      await page.waitForSelector('[data-audience-count="computing"]', { timeout: 15000 }).catch(() => {});
      // The old numbers are gone while it counts — for a reader the full block, for a masked viewer the count alone.
      const fullDuring = await page.locator('[data-audience-count="full"], [data-audience-count="floor"]').count();
      const fallbackBox = await boxOf(page, '[data-audience-count="computing"]');
      ok(`${tag} · COMPUTING · a new filter shows its OWN fallback at once — "${COMPUTING}" — and the old numbers are gone while it counts`,
        (await textOf(page, S.computing)) === COMPUTING && fullDuring === 0, `computing "${await textOf(page, S.computing)}" · full blocks still on screen ${fullDuring}`);
      await stateShot(page, tag, "computing", COMPUTING);
      await settle(page);
      const everyPlayer = Number(String((await figure(page, "onCampaign")) ?? "").split(",").join(""));
      ok(`${tag} · COMPUTING · then the new count lands, for the new filter (every player account — at least the seeded ${E.matching})`,
        (await countState(page)) === (reads ? "full" : "floor") && everyPlayer >= E.matching && !new URL(page.url()).searchParams.has("op"),
        `${await countState(page)} · ${everyPlayer} · ${page.url()}`);
      // ⭐ OD65 · the keyed fallback is THIS viewer's shape: a masked viewer's is the count alone's height (within 2px).
      const landedBox = await boxOf(page, '[data-audience-count="floor"], [data-audience-count="full"]');
      if (!reads) {
        ok(`${tag} · COMPUTING · ⭐ OD65 · the masked viewer's fallback is the count alone's own height — the swap does not move the page (within 2px)`,
          fallbackBox !== null && landedBox !== null && Math.abs(fallbackBox.h - landedBox.h) <= 2, `${fallbackBox?.h} vs ${landedBox?.h}`);
      } else {
        console.log(`  · RECORDED · ${tag} · the reader's fallback ${fallbackBox?.h} → the full count ${landedBox?.h} (a reader's sample rows wrap at 360)`);
      }
    } finally {
      await seed(page, "marketing-audience-seed?delayMs=0");
    }

    // ── THE FLOOR — a list of three ─────────────────────────────────────────────────────────────────────────────
    const floorQuery = `?pop=book&list=${encodeURIComponent(world.listId)}`;
    await openComposer(page, floorQuery);
    if (!reads) {
      const floorFlight = await flightOf(page, `/admin/campaigns/new${floorQuery}`);
      const leaks = [FIGURE_LABEL.willReceive, "Not receiving, by reason", "The first numbers in sending order", ...Object.values(REASON)].filter((w) => floorFlight.includes(w));
      ok(`${tag} · FLOOR · ⛔ D19 · three people: the count alone, "3", and why — no will-receive figure, no reason, no sample`,
        (await countState(page)) === "floor" && (await figure(page, "onCampaign")) === "3" && (await textOf(page, S.floor)) === FLOOR
          && !(await has(page, figureSel("willReceive"))) && !(await has(page, S.reasons)) && (await page.locator(S.sampleRow).count()) === 0,
        `${await countState(page)} · ${await textOf(page, S.floor)}`);
      ok(`${tag} · FLOOR · ⛔ D19 · …and none of it is in the page's RSC payload either`, floorFlight.length > 1000 && floorFlight.includes(FLOOR) && leaks.length === 0,
        `leaked [${leaks.join(", ")}] · payload ${floorFlight.length} chars`);
      await stateShot(page, tag, "floor", FLOOR);
    } else {
      ok(`${tag} · FLOOR · a reader sees the whole breakdown of the same three`,
        (await countState(page)) === "full" && (await figure(page, "onCampaign")) === "3" && (await has(page, S.reasons)) && !(await has(page, S.floor)),
        `${await countState(page)} · ${await figure(page, "onCampaign")}`);
      await stateShot(page, tag, "floor-reader", COUNTED_AT);
    }
    await fitCheck(page, tag, "floor");

    // ── EMPTY — a tag nobody carries ────────────────────────────────────────────────────────────────────────────
    await openComposer(page, "?pop=book&tag=nobody");
    if (!reads) {
      ok(`${tag} · EMPTY · "${EMPTY}" — the count 0, the rail kept`,
        (await countState(page)) === "floor" && (await figure(page, "onCampaign")) === "0" && (await textOf(page, S.floor)) === EMPTY && (await has(page, S.rail)),
        `${await countState(page)} · ${await textOf(page, S.floor)}`);
    } else {
      ok(`${tag} · EMPTY · "${EMPTY}" — real zeros in every figure, the rail kept`,
        (await countState(page)) === "empty" && (await textOf(page, S.empty)) === EMPTY && (await figure(page, "onCampaign")) === "0"
          && (await figure(page, "willReceive")) === "0" && (await figure(page, "notReceiving")) === "0" && (await has(page, S.rail)),
        `${await countState(page)} · ${await textOf(page, S.empty)}`);
    }
    await stateShot(page, tag, "empty", EMPTY);

    // ── REFUSED — a book-only axis beside player accounts ───────────────────────────────────────────────────────
    await openComposer(page, "?pop=players&tag=vip");
    ok(`${tag} · REFUSED · the parser's own sentence, "${REMOVE_FILTER}", no count — and the rail without the contact book's axes`,
      (await textOf(page, S.problem)) === BOOK_ONLY && (await textOf(page, S.clear)) === REMOVE_FILTER && !(await has(page, S.count))
        && (await railGroups(page)).join(",") === "pop,op,range",
      `${await textOf(page, S.problem)} · groups ${(await railGroups(page)).join(",")}`);
    await stateShot(page, tag, "refused", BOOK_ONLY);
    await fitCheck(page, tag, "refused");
    await page.locator(S.clear).first().click().catch(() => {});
    await page.waitForSelector('[data-audience="not-chosen"]', { timeout: 30000 }).catch(() => {});
    ok(`${tag} · REFUSED · "${REMOVE_FILTER}" takes the filter out of the address — nobody chosen again`,
      (await attr(page, S.state, "data-audience")) === "not-chosen" && !new URL(page.url()).searchParams.has("tag"), page.url());

    // ── ERROR — the count throws ────────────────────────────────────────────────────────────────────────────────
    await seed(page, "marketing-audience-seed?fault=1");
    try {
      await openComposer(page, "?pop=book&op=AIRTEL");
      ok(`${tag} · ERROR · "${ERROR}" with "${COUNT_AGAIN}" — never a zero`,
        (await countState(page)) === "error" && (await textOf(page, S.error)) === ERROR && (await textOf(page, S.again)) === COUNT_AGAIN
          && !(await has(page, figureSel("onCampaign"))),
        `${await countState(page)} · ${await textOf(page, S.error)}`);
      await stateShot(page, tag, "error", ERROR);
    } finally {
      await seed(page, "marketing-audience-seed?fault=0");
    }
    await page.locator(S.again).first().click().catch(() => {});
    await page.waitForFunction((s) => {
      const el = document.querySelector(s);
      const v = el ? el.getAttribute("data-audience-count") : null;
      return v !== null && v !== "error" && v !== "computing";
    }, S.count, { timeout: 45000 }).catch(() => {});
    await wait(500);
    ok(`${tag} · ERROR · "${COUNT_AGAIN}" counts the same address once the read works`,
      ["full", "floor", "empty"].includes(String(await countState(page))) && new URL(page.url()).searchParams.get("op") === "AIRTEL",
      `${await countState(page)} · ${page.url()}`);

    // ── A DRAFT SAVED WITH THE POPULATION (once per role, at 1280) ─────────────────────────────────────────────
    if (vp.width === 1280) {
      await openComposer(page, EVERY_BUCKET);
      const name = `U38b drive ${role} ${runId}`;
      await page.locator(S.name).fill(name);
      await page.locator(S.bodySw).fill("50pick: Mechi kubwa leo.");
      await wait(300);
      await page.locator(S.save).click();
      await page.waitForSelector(S.saved, { timeout: 30000 }).catch(() => {});
      // The new draft's own address (?draft=…) is then sent on to the address that carries its stored audience (pop=…).
      await page.waitForFunction(() => {
        const u = new URL(location.href);
        return u.searchParams.has("draft") && u.searchParams.has("pop");
      }, null, { timeout: 30000 }).catch(() => {});
      await settle(page);
      const url = new URL(page.url());
      savedDrafts[role] = { id: url.searchParams.get("draft") ?? "", name };
      ok(`${tag} · SAVED · the draft is saved with its population, and its address carries the audience it holds`,
        /^cmp_[A-Za-z0-9_-]+$/.test(savedDrafts[role].id) && url.searchParams.get("pop") === "players"
          && (await countState(page)) === (reads ? "full" : "floor") && (await figure(page, "onCampaign")) === nf.format(E.matching)
          // ⭐ STD-1 · the saved line is STILL on screen at the new address — no redirect unmounted the composer on the way.
          && (await has(page, S.saved)),
        `${page.url()} · ${await countState(page)} · the saved line still shown ${await has(page, S.saved)}`);
    }

    // ── THE LIST — each row's audience in words ─────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/admin/campaigns`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("tr[data-campaign-row]", { timeout: 60000 }).catch(() => {});
    await wait(600);
    const own = savedDrafts[role];
    const ownWords = own ? await textOf(page, `tr[data-campaign-row][data-campaign-id="${own.id}"] [data-campaign-audience]`) : "";
    const seededWords = await textOf(page, 'tr[data-campaign-row][data-campaign-id="cmp_seed_22"] [data-campaign-audience]');
    ok(`${tag} · LIST · the saved draft's row says its audience in words: "${POP_WORDS}"`, ownWords === POP_WORDS, ownWords);
    ok(`${tag} · LIST · a seeded campaign that asks consent reads ${reads ? '"Consent: given" to a reader' : `"${HIDDEN_ROW}" to a masked viewer (D19)`}`,
      seededWords === (reads ? "Consent: given" : HIDDEN_ROW), seededWords);
    if (vp.width === 1280) {
      const over = await page.evaluate(() => {
        const table = document.querySelector('[data-block="campaigns-card"] table');
        const scroller = table?.parentElement;
        return table && scroller ? table.scrollWidth - scroller.clientWidth : null;
      });
      ok(`${tag} · LIST · the words never widen the table past its card at 1280`, over !== null && over <= 0, String(over));
    }
    await stateShot(page, tag, "list-rows", seededWords || HIDDEN_ROW, '[data-block="campaigns-card"]', LIST_TITLE);

    // ── LOADING — the saved draft opened from the list with the composer's chunks held ─────────────────────────
    if (own && own.id !== "") {
      let release = () => {};
      const gate = new Promise((r) => { release = r; });
      let held = 0;
      const HOLD = (url) => /src_app_admin_campaigns_new_(page_tsx|composer|audience)/.test(url.href);
      // ⭐ HOLD THE RESPONSE, NEVER THE REQUEST: fetched at once, handed over when the ghost has been measured.
      const holder = async (route) => {
        held++;
        const response = await route.fetch().catch(() => null);
        await gate;
        if (response) await route.fulfill({ response }).catch(() => {});
        else await route.continue().catch(() => {});
      };
      await page.route(HOLD, holder);
      const linkHref = await page.locator(`tr[data-campaign-row][data-campaign-id="${own.id}"] td:first-child a`).first().getAttribute("href").catch(() => null);
      await page.locator(`tr[data-campaign-row][data-campaign-id="${own.id}"] td:first-child a`).first().click().catch(() => {});
      await page.waitForSelector(S.ghostCount, { timeout: 90000 }).catch(() => {});
      // STD-3 · the row links straight to the draft's canonical address (STD-1), so the ghost is the navigation's own — never a
      // redirect's flash — and the chunks really were held while it was measured.
      ok(`${tag} · LOADING · ⭐ STD-1 · the list row links to the draft's canonical address (its population in the address) — no redirect on the way in`,
        typeof linkHref === "string" && new URL(linkHref, BASE).searchParams.get("pop") === "players" && held > 0, `${linkHref} · chunks held ${held}`);
      const ghostCard = await boxOf(page, S.ghostCard);
      const ghostCount = await boxOf(page, S.ghostCount);
      ok(`${tag} · LOADING · the composer's own ghost is up — the Audience card's ghost and its count block — and not yet the page (chunks held: ${held})`,
        ghostCard !== null && ghostCount !== null && !(await has(page, S.form)), JSON.stringify({ ghostCard, ghostCount, held }));
      await shoot(page, `${tag}-loading`, S.ghostCount);
      release();
      const landed = reads ? '[data-audience-count="full"]' : '[data-audience-count="floor"]';
      await page.waitForSelector(landed, { timeout: 90000 }).catch(() => {});
      await page.unroute(HOLD, holder).catch(() => {});
      await wait(900);
      const realCount = await boxOf(page, landed);
      const realCard = await boxOf(page, S.card);
      measured[tag] = { ghostCount, realCount, ghostCard, realCard };
      if (!reads) {
        ok(`${tag} · LOADING · ⭐ OD65 · the route ghost's count block is the masked viewer's real block — the count alone — to within 2px`,
          ghostCount !== null && realCount !== null && Math.abs(ghostCount.h - realCount.h) <= 2, `${ghostCount?.h} vs ${realCount?.h}`);
      }
      // ⚠️ RECORDED, NOT ASSERTED: the whole card (the rail's pills wrap by label width, the words follow the filter) and a
      // reader's count block (the route ghost is the count alone, OD65: a reader's card grows into the full figures).
      console.log(`  · RECORDED · ${tag} · count block ${ghostCount?.h} → ${realCount?.h} · card ${ghostCard?.h} → ${realCard?.h}`);
    }
    await ctx.close();
  }
}

console.log(`\n  · RECORDED · ${JSON.stringify(measured)}`);
ok("no page threw an uncaught exception in the browser, at any width or role", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

await browser.close();
console.log(`\nPASS=${pass} FAIL=${fail} · shots in ${SHOTS}`);
process.exit(fail === 0 ? 0 : 1);
