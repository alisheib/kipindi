/**
 * THE JOURNEY HEADER'S FIT — its rules, its matrix and its probes, defined ONCE and imported by the drive
 * (`qa:journey-header-fit`) and by its red twin (`red:journey-header-fit`), so a gate and its own proof cannot drift
 * apart (`live/clip.mjs`'s rule). The Vodacom plan S6, `S6-PLAN.md` WP6b step 6 as amended by A5 and A6.
 *
 * ── THE TWO PROBES (A5) ──────────────────────────────────────────────────────────────────────────────────────────
 *   RULE — every S4 fit rule (VODACOM-PLAN §0g design call 10, and from 640 the classic bar's own steps, A5's as-built
 *          note) read off the live page as a COMPUTED value and compared with a FIXED token: the gutter, the gaps, the
 *          home link's borrowed 9px, the "+", the pill's padding, the figure's size, the guest pills, the bar's 56px,
 *          the mark and the lockup. ⭐ A fixed token is the point: a probe that compared the rightmost control with the
 *          row's own computed padding moved with the very mutation it was meant to catch (critic G5). This is the red
 *          criterion — deterministic, whatever slack the real balances leave.
 *   FIT  — whether the header FITS, on the clean tree only: `CLIP_PROBE` (a control past the viewport edge with nothing
 *          that scrolls it into view), the row's and the bar's overflow, and the row's SLACK — the free px the spacer
 *          between the two clusters holds, i.e. how much wider the header's words could grow before something must
 *          shrink or clip. Slack is recorded, never a threshold: it is the number VODACOM-PLAN §0i keeps per cell.
 * Below 1024 the drive also reads the journey rail's labels (A17, owed to "WP6b's 320 drive"): none cut, and how many
 * lines each one takes.
 *
 * ── THE MATRIX ───────────────────────────────────────────────────────────────────────────────────────────────────
 * 320 · 360 · 390 · 768 · 1024 · 1150 · 1279 × sw · en · zh for a pass-holding guest and for a player at TZS 999,999 —
 * the widest figure a wallet can show, because `formatBalancePill` compacts from TZS 1,000,000 — and at 320 and 1024 the
 * widest COMPACT figure (TZS 9,940,000 reads "TZS 9.9M"), TZS 0, a held wallet and hidden balances. ⛔ The matrix is
 * never shrunk to make a mutation pass or a cell fit: a cell that does not fit is the finding.
 * ⭐ ONE PAGE PER STATE AND LANGUAGE, RESIZED THROUGH THE WIDTHS. Every rule here is a stylesheet rule, and the one width
 * the header decides in script (`useLgUp`, which mounts the bell from 1024) answers a resize as it answers a load.
 * ⭐ A RULE IS ASKED ONLY WHERE ITS ELEMENT IS DRAWN. The page measured is KP_ROUTE (default /), and the header hides
 * "+ Weka pesa" on the deposit screen and its return, so there the pill's rules are skipped, not failed. That is the
 * header's own rule (`journeyHeaderState`), copied here so both drives run on plain node — no TypeScript loader stands
 * between the red twin and the signal that must restore its file — and held to the original by `test:journey-shell`
 * §10 (10.rules.pill), so the copy cannot drift.
 */
import { CLIP_PROBE } from "./clip.mjs";
import { LOCALE_COOKIE, demoSession } from "./journey-pass.mjs";

export const JHF_WIDTHS = [320, 360, 390, 768, 1024, 1150, 1279];
export const JHF_LOCALES = ["sw", "en", "zh"];
/** The widths the extra states are measured at: the narrowest phone and the band where the desktop links arrive. */
const EDGES = [320, 1024];

/** The header, and only the journey's: a page that shows the classic bar has no pass that counts. */
export const JOURNEY_BAR = 'header[data-testid="journey-top-bar"]';

/**
 * The states, in the order they are set up — ONE demo account, so each state's session ends the last one's.
 * `figure` is what the capsule's name must carry once the state has landed (A11: its name is its visible words).
 */
export const STATES = [
  { id: "guest", what: "a guest holding a pass", signedIn: false, widths: JHF_WIDTHS },
  { id: "player-999999", what: "a player at TZS 999,999, the widest figure a wallet can show", signedIn: true, query: "?deposit=0", balance: 999_999, figure: "TZS 999,999", widths: JHF_WIDTHS },
  { id: "player-9.9M", what: "a player at TZS 9,940,000, the widest compact figure", signedIn: true, query: "?deposit=0", balance: 9_940_000, figure: "TZS 9.9M", widths: EDGES },
  { id: "zero", what: "a player at TZS 0", signedIn: true, query: "?deposit=0", balance: 0, figure: "TZS 0", widths: EDGES },
  { id: "held", what: "a player whose wallet an officer holds", signedIn: true, query: "?hold=officer", balance: null, held: true, widths: EDGES },
  { id: "masked", what: "a player at TZS 999,999 with balances hidden", signedIn: true, query: "?deposit=0", balance: 999_999, masked: true, widths: EDGES },
];

/**
 * ⭐ THE RED CRITERION (A5): each S4 rule as the computed value it must have at a width. `sel` is relative to the
 * journey header ("" is the header itself). `when` says who renders the element: everybody, a reader the gilt pill
 * shows for (signed in, not held, not on the deposit screen), a reader with a capsule (signed in), or a guest.
 */
export const RULES = [
  { id: "bar-height", sel: "", props: ["height"], want: () => "56px", when: "all" },
  { id: "gutter", sel: ".kp-jhdr__row", props: ["padding-left", "padding-right"], want: (w) => (w < 360 ? "12px" : w < 640 ? "16px" : "24px"), when: "all" },
  { id: "row-gap", sel: ".kp-jhdr__row", props: ["column-gap"], want: (w) => (w < 640 ? "6px" : w < 1024 ? "20px" : w < 1280 ? "12px" : "20px"), when: "all" },
  { id: "cluster-gap", sel: ".kp-jhdr__cluster", props: ["column-gap"], want: (w) => (w < 640 ? "6px" : "12px"), when: "all" },
  { id: "home-borrow", sel: ".kp-jhdr__home", props: ["margin-left", "margin-right"], want: () => "-9px", when: "all" },
  { id: "home-pad", sel: ".kp-jhdr__home", props: ["padding-left", "padding-right"], want: () => "9px", when: "all" },
  // ⚠️ "flex", not the "inline-flex" the classes say: both spans are flex ITEMS of the home link, and CSS blockifies a
  // flex item's outer display, so a shown span always computes "flex" (calibrated on the first clean run, 2026-10-02).
  { id: "brand-mark", sel: ".kp-jhdr__home > span:first-child", props: ["display"], want: (w) => (w < 1280 ? "flex" : "none"), when: "all" },
  { id: "brand-lockup", sel: ".kp-jhdr__home > span:last-child", props: ["display"], want: (w) => (w < 1280 ? "none" : "flex"), when: "all" },
  // the "+" is a flex item of the pill (a .btn), so it blockifies too: shown, it computes "flex"
  { id: "plus", sel: ".kp-jhdr__plus", props: ["display"], want: (w) => (w < 360 ? "none" : "flex"), when: "pill" },
  { id: "pill-left", sel: ".kp-jhdr__pill", props: ["padding-left"], want: (w) => (w < 360 ? "12px" : "10px"), when: "pill" },
  { id: "pill-right", sel: ".kp-jhdr__pill", props: ["padding-right"], want: () => "12px", when: "pill" },
  { id: "figure", sel: ".kp-jbal__fig", props: ["font-size"], want: (w) => (w < 360 ? "12px" : "14px"), when: "capsule" },
  { id: "auth-pad", sel: ".kp-jhdr__auth", props: ["padding-left", "padding-right"], want: () => "14px", when: "guest" },
  { id: "auth-type", sel: ".kp-jhdr__auth", props: ["font-size"], want: () => "13px", when: "guest" },
];

/** Where the header draws no "+ Weka pesa": the deposit screen and its return (`journeyHeaderState`, held by 10.rules.pill). */
export const NO_PILL_PREFIX = "/wallet/deposit";

/** Whether a state renders, on `route`, the element a rule reads. A rule whose element the route does not draw is skipped. */
export function applies(rule, state, route = "/") {
  if (rule.when === "all") return true;
  if (rule.when === "guest") return !state.signedIn;
  if (rule.when === "capsule") return state.signedIn;
  if (rule.when === "pill") return state.signedIn && !state.held && !route.startsWith(NO_PILL_PREFIX);
  return false;
}

/**
 * Runs IN THE PAGE: for each ask, how many elements match and each one's computed values. ⛔ A real function, never a
 * string (`live/clip.mjs` records what a string costs: E-191).
 */
export const RULE_PROBE = (asks) => {
  const bar = document.querySelector('header[data-testid="journey-top-bar"]');
  return asks.map(({ sel, props }) => {
    if (!bar) return { found: 0, values: [] };
    const els = sel ? Array.from(bar.querySelectorAll(sel)) : [bar];
    return {
      found: els.length,
      values: els.map((el) => {
        const cs = getComputedStyle(el);
        return props.map((p) => cs.getPropertyValue(p).trim());
      }),
    };
  });
};

/**
 * Every rule a state breaks at a width on `route`, as `{ rule, text }`. An element a rule expects there and cannot find
 * is a break; a rule whose element the route does not draw is not asked.
 */
export function ruleViolations(width, state, answers, route = "/") {
  const out = [];
  RULES.forEach((rule, i) => {
    if (!applies(rule, state, route)) return;
    const want = rule.want(width);
    const got = answers[i];
    if (!got || got.found === 0) {
      out.push({ rule: rule.id, text: `${rule.id}: no ${rule.sel || "header"} in the journey header` });
      return;
    }
    got.values.forEach((values) => values.forEach((v, j) => {
      if (v !== want) out.push({ rule: rule.id, text: `${rule.id}: ${rule.props[j]} ${v}, not ${want}` });
    }));
  });
  return out;
}

/** Runs IN THE PAGE: the row's free space (its slack), the rightmost control, and the row's and the bar's overflow. */
export const FIT_PROBE = () => {
  const bar = document.querySelector('header[data-testid="journey-top-bar"]');
  if (!bar) return null;
  const row = bar.querySelector(".kp-jhdr__row");
  const vw = document.documentElement.clientWidth;
  let right = 0;
  let rightmost = "";
  for (const el of Array.from(bar.querySelectorAll('a[href], button, [role="button"], summary'))) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.display === "none" || cs.visibility === "hidden") continue;
    if (el.tagName !== "SUMMARY" && el.closest("details:not([open])")) continue;
    if (r.right > right) {
      right = r.right;
      rightmost = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 32);
    }
  }
  // ⭐ THE SLACK IS THE ROW'S FREE SPACE, not the gap after the rightmost control: the cluster is pushed to the row's
  // end, so that gap is 0 in every cell whatever fits (calibrated on the first clean run, 2026-10-02). Free space =
  // the row's content width − every visible child's outer width − the gaps between them.
  let slack = null;
  if (row) {
    const rs = getComputedStyle(row);
    const inner = row.clientWidth - (Number.parseFloat(rs.paddingLeft) || 0) - (Number.parseFloat(rs.paddingRight) || 0);
    const kids = Array.from(row.children).filter((el) => getComputedStyle(el).display !== "none");
    let used = 0;
    for (const el of kids) {
      const cs = getComputedStyle(el);
      const grows = (Number.parseFloat(cs.flexGrow) || 0) > 0;
      // a growing child (a spacer, the desktop links' track) is free space by definition: count only its minimum
      const w = grows ? (Number.parseFloat(cs.minWidth) || 0) : el.getBoundingClientRect().width;
      used += w + (Number.parseFloat(cs.marginLeft) || 0) + (Number.parseFloat(cs.marginRight) || 0);
    }
    const gap = Number.parseFloat(rs.columnGap) || 0;
    slack = Math.round((inner - used - gap * Math.max(0, kids.length - 1)) * 10) / 10;
  }
  return {
    vw,
    rightmost,
    slack,
    rowOverflow: row ? row.scrollWidth - row.clientWidth : null,
    barOverflow: bar.scrollWidth - bar.clientWidth,
  };
};

/** Runs IN THE PAGE, below 1024: each journey tab label, how many lines it takes, and whether it is cut. */
export const RAIL_PROBE = () => {
  const rail = document.querySelector('nav[data-testid="journey-tabs"]');
  if (!rail) return null;
  const vw = document.documentElement.clientWidth;
  return Array.from(rail.querySelectorAll(".kp-jtab__label")).map((el) => {
    const cs = getComputedStyle(el);
    const line = Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.2;
    const r = el.getBoundingClientRect();
    return {
      text: (el.textContent || "").trim(),
      lines: line > 0 ? Math.round(r.height / line) : 0,
      cut: el.scrollWidth > el.clientWidth + 1,
      offscreen: r.left < -1 || r.right > vw + 1,
    };
  });
};

/**
 * Runs IN THE PAGE, for the red twin: every value of the custom property `property` the page's own stylesheets hold.
 * A mutation names itself there, so "the server serves it" is read from the stylesheet, independently of the rule it
 * breaks. The property's name is passed in — the anchors file spells it once (`WITNESS_PROPERTY`).
 */
export const WITNESS_PROBE = (property) => {
  const found = [];
  const walk = (rules) => {
    for (const rule of Array.from(rules)) {
      const v = rule.style ? rule.style.getPropertyValue(property).trim() : "";
      if (v) found.push(v);
      if (rule.cssRules) walk(rule.cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch {
      rules = null;
    }
    if (rules) walk(rules);
  }
  return found;
};

/** The cookies a state's contexts carry: the pass, and for a player the demo session set up for that state. */
export async function cookiesFor(browser, base, state, pass) {
  if (!state.signedIn) return [pass];
  const session = await demoSession(browser, base, { query: state.query, balance: state.balance });
  return [pass, session];
}

/** Two frames and a beat: a resize's layout, and the bell that mounts from 1024, have landed. */
async function settle(page) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
  await page.waitForTimeout(300);
}

/** Throws unless the page shows the state it was set up for: a guest's pair, a capsule, its hold, its mask, its figure. */
async function expectState(page, state) {
  if (!state.signedIn) {
    const pills = await page.locator(`${JOURNEY_BAR} .kp-jhdr__auth`).count();
    if (pills !== 2) throw new Error(`a guest's journey header shows ${pills} sign-in pills, not Ingia and Jisajili`);
    return;
  }
  const capsule = page.locator('[data-testid="journey-balance"]');
  await capsule.waitFor({ timeout: 60_000 }).catch(() => {});
  if ((await capsule.count()) !== 1) throw new Error("no balance capsule in a signed-in journey header — did the session count?");
  if (state.held && (await capsule.getAttribute("data-held")) === null) throw new Error("the capsule is not held — did ?hold=officer land?");
  if (state.masked) {
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-balance"]')?.hasAttribute("data-masked") === true, null, { timeout: 30_000 }).catch(() => {});
    if ((await capsule.getAttribute("data-masked")) === null) throw new Error("the capsule is not masked — did the hidden-balances flag land?");
  }
  if (state.figure && !state.masked) {
    const name = (await capsule.getAttribute("aria-label")) ?? "";
    if (!name.includes(state.figure)) throw new Error(`the capsule reads "${name}", not ${state.figure} — the balance did not land`);
  }
}

/**
 * Opens `route` for one state in one language and measures it at each of the state's widths: the RULE probe always,
 * and with `fit` the FIT and CLIP probes and, below 1024, the rail's labels. Resolves to one cell per width, or throws
 * naming the premise that failed — no journey header (the pass did not count), the wrong language, the wrong state.
 */
export async function measureState(browser, base, state, locale, cookies, { route = "/", fit = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: state.widths[0], height: 800 }, deviceScaleFactor: 1 });
  try {
    await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: locale, url: base }]);
    if (state.masked) {
      await ctx.addInitScript(() => {
        try {
          window.localStorage.setItem("cashHidden", "1");
        } catch {
          // A context without storage: the state check below reports it.
        }
      });
    }
    const page = await ctx.newPage();
    // What a page that never hydrates leaves behind, so the failure names its cause (a dev server's chunk that 404'd
    // or failed mid-compile, a script error) instead of a bare timeout — one such cell went unexplained, 2026-10-02.
    const trouble = [];
    page.on("pageerror", (e) => trouble.push(`script error: ${String(e?.message ?? e).slice(0, 160)}`));
    page.on("requestfailed", (r) => trouble.push(`request failed: ${r.url().replace(base, "")} (${r.failure()?.errorText ?? "?"})`));
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().includes("/_next/")) trouble.push(`${r.status()}: ${r.url().replace(base, "")}`);
    });
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
    const bar = page.locator(JOURNEY_BAR);
    await bar.waitFor({ timeout: 120_000 }).catch(() => {});
    if ((await bar.count()) !== 1) throw new Error(`no journey header on ${route} — the preview pass did not count, so the classic bar is shown`);
    await page.waitForFunction(() => {
      const el = document.querySelector('header[data-testid="journey-top-bar"]');
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
    }, null, { timeout: 120_000 }).catch((e) => {
      const seen = trouble.length ? trouble.slice(0, 6).join(" · ") : "no script error, failed request or failed chunk was seen";
      throw new Error(`the journey header never hydrated in 120 s (${seen}) — ${String(e?.message ?? e).split(String.fromCharCode(10))[0]}`);
    });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const lang = ((await page.getAttribute("html", "lang")) ?? "").toLowerCase();
    if (!lang.startsWith(locale)) throw new Error(`${route} rendered in "${lang}", not ${locale} — every reading would be about another language`);
    await expectState(page, state);
    const asks = RULES.map(({ sel, props }) => ({ sel, props }));
    const cells = [];
    for (const width of state.widths) {
      await page.setViewportSize({ width, height: 800 });
      await settle(page);
      const violations = ruleViolations(width, state, await page.evaluate(RULE_PROBE, asks), route);
      const cell = { state: state.id, locale, width, violations };
      if (fit) {
        cell.fit = await page.evaluate(FIT_PROBE);
        cell.clipped = await page.evaluate(CLIP_PROBE, JOURNEY_BAR);
        cell.rail = width < 1024 ? await page.evaluate(RAIL_PROBE) : null;
      }
      cells.push(cell);
    }
    return cells;
  } finally {
    await ctx.close().catch(() => {});
  }
}
