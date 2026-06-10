/**
 * AI POLL UI THEME KIT AUDIT
 *
 * Playwright-based test that:
 *   1. Registers an admin, seeds polls across categories/states
 *   2. Hits /admin/ai-polls and audits every element for kit compliance:
 *      - Glass panels, correct border-radius (rounded-xl / rounded-lg)
 *      - Brand-500 focus rings (no aqua/teal)
 *      - Correct fonts (Sora headings, Inter body, JetBrains Mono mono)
 *      - Gold primary CTAs, ghost secondary CTAs
 *      - Chips render with correct variant colours
 *      - Search bar, filter chips, pagination all render
 *   3. Tests filter interactions (date, state, category, search, clear)
 *   4. Tests clickable row navigation to /admin/ai-polls/[id]
 *   5. Tests /admin/candidates with same filter suite
 *   6. Takes screenshots for visual review
 *
 *   BASE=http://localhost:3000  node scripts/ai-poll-ui-theme-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
const failures = [];
function log(label, ok, detail = "") {
  const t = ok ? "\u2713" : "\u2717";
  console.log(`  ${t} ${label}${detail ? "  \u2192  " + detail : ""}`);
  if (ok) pass++; else { fail++; failures.push(`${label} ${detail}`); }
}

function section(title) {
  console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`);
}

const phoneTail = () =>
  "7" + String(Date.now() % 100_000_000).padStart(8, "0");

/* ─── Helpers ─── */

async function apiPost(path, body = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function registerAdmin(context, tail) {
  const password = "TestAdmin123!";
  const phone = `+255${tail}`;

  const page = await context.newPage();
  await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await page.fill("#phone", tail);

  // DateSelect component: hidden input + 3 visible text segments (DD, MM, YYYY)
  // Set the hidden input value via JS, then fill the visible segments to sync state
  await page.evaluate(() => {
    const hidden = document.querySelector('input[name="dob"]');
    if (hidden) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(hidden, '1990-01-15');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  // Also fill the visible segment inputs (DD/MM/YYYY) — they're the type="text" inputs inside the date container
  const dateSegments = page.locator('#dob').locator('..').locator("input[type='text']");
  const segCount = await dateSegments.count();
  if (segCount >= 3) {
    await dateSegments.nth(0).fill("15");
    await dateSegments.nth(1).fill("01");
    await dateSegments.nth(2).fill("1990");
  } else {
    // Fallback: try filling all text inputs near the DOB area by placeholder
    const ddInput = page.locator("input[placeholder='DD']").first();
    const mmInput = page.locator("input[placeholder='MM']").first();
    const yyyyInput = page.locator("input[placeholder='YYYY']").first();
    if (await ddInput.count() > 0) {
      await ddInput.fill("15");
      await mmInput.fill("01");
      await yyyyInput.fill("1990");
    }
  }

  await page.fill('input[name="password"]', password);
  await page.fill('input[name="passwordConfirm"]', password);
  await page.check('input[name="acceptAge"]', { force: true });
  await page.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    page.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  // Promote to admin
  await apiPost("/api/dev-test/promote-admin", { phone });
  // Re-login to pick up admin role
  await page.goto(`${BASE}/auth/logout`, { waitUntil: "networkidle" }).catch(() => {});
  await page.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await page.fill("#phone", tail);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(u => /admin/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  return page;
}

/* ─── Main ─── */

(async () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log("  AI POLL UI THEME KIT AUDIT");
  console.log(`  ${BASE}`);
  console.log(`${"=".repeat(60)}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  try {
    /* ─── Setup: register admin + seed polls ─── */
    section("SETUP: Register admin + seed polls");

    const tail = phoneTail();
    const page = await registerAdmin(context, tail);
    const url = page.url();
    log("Admin logged in", /admin/.test(url), url);

    // Seed AI poll fixtures
    const seedRes = await apiPost("/api/dev-test/seed-ai-polls");
    log("AI poll fixtures seeded", seedRes.ok, `${seedRes.seeded} polls`);

    /* ─── Navigate to AI Polls page ─── */
    section("AI POLLS PAGE: Layout + theme tokens");

    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Page title
    const h1 = await page.locator("h1").first().textContent();
    log("Page title renders", h1?.includes("AI poll generation"), h1);

    // Swahili subtitle
    const subtitle = await page.locator("header p.italic").first().textContent().catch(() => "");
    log("Swahili subtitle present", subtitle?.includes("Uzalishaji"), subtitle);

    // KPI cards — glass-panel class
    const kpiCards = page.locator(".glass-panel");
    const kpiCount = await kpiCards.count();
    log("Glass-panel KPI cards render", kpiCount >= 4, `${kpiCount} glass panels`);

    // Check KPI labels use font-mono
    const kpiLabels = page.locator(".glass-panel .font-mono");
    log("KPI labels use font-mono", await kpiLabels.count() > 0);

    // Headings use font-display
    const displayFonts = page.locator(".font-display");
    log("Headings use font-display (Sora)", await displayFonts.count() > 0);

    // Provider chip renders
    const providerChip = page.locator("text=mock").first();
    const hasProvider = await providerChip.count() > 0;
    log("Provider chip visible", hasProvider || await page.locator("text=claude").count() > 0);

    // Generate button — gold CTA
    const goldBtn = page.locator(".btn.btn-gold").first();
    log("Gold primary CTA button exists", await goldBtn.count() > 0);

    // Ghost buttons
    const ghostBtns = page.locator(".btn.btn-ghost");
    log("Ghost secondary buttons exist", await ghostBtns.count() > 0);

    // Chip component renders (state chips)
    const chips = page.locator(".rounded-pill.uppercase.font-bold");
    log("Chip components render with kit styling", await chips.count() > 0);

    /* ─── Filter toolbar ─── */
    section("FILTER TOOLBAR: Search + date + state + category chips");

    // Search input (the filter toolbar one, not the top-bar player search)
    const searchInput = page.locator('input[type="search"][placeholder*="polls"]').first();
    if (await searchInput.count() === 0) {
      // Fallback to any search input inside the main content area
      var searchInput2 = page.locator('main input[type="search"]').first();
    }
    const activeSearchInput = await searchInput.count() > 0 ? searchInput : searchInput2;
    log("Search input renders", await activeSearchInput.count() > 0);

    // Check search input has correct styling (bg-bg-overlay, rounded-md, border-border)
    const searchClass = await activeSearchInput.getAttribute("class") || "";
    log("Search input has bg-bg-overlay", searchClass.includes("bg-bg-overlay"));
    log("Search input has rounded-md", searchClass.includes("rounded-md"));
    log("Search input has border-border", searchClass.includes("border-border"));
    log("Search input has font-mono", searchClass.includes("font-mono"));
    log("Search input has brand-500 focus ring", searchClass.includes("brand-500"));

    // Search button
    const searchBtn = page.locator("button:has-text('Search')");
    log("Search button renders", await searchBtn.count() > 0);
    const searchBtnClass = await searchBtn.first().getAttribute("class") || "";
    log("Search button is btn-gold", searchBtnClass.includes("btn-gold"));

    // Date preset chips
    const dateChips = ["All time", "Today", "Yesterday", "Last 7 days", "Last 30 days"];
    for (const label of dateChips) {
      const chip = page.locator(`button:has-text("${label}")`).first();
      log(`Date chip "${label}" renders`, await chip.count() > 0);
    }

    // "All time" should be active by default (gold styling)
    const allTimeChip = page.locator('button:has-text("All time")').first();
    const allTimeClass = await allTimeChip.getAttribute("class") || "";
    log("'All time' chip is active (gold border)", allTimeClass.includes("border-gold") || allTimeClass.includes("gold"));

    // State filter chips
    const stateChips = ["All states", "Pending", "Approved", "Published", "Filtered", "Rejected", "Failed"];
    for (const label of stateChips) {
      const chip = page.locator(`button:has-text("${label}")`).first();
      log(`State chip "${label}" renders`, await chip.count() > 0);
    }

    // Category filter chips
    const catChips = ["All categories", "Sports", "Macro", "Weather", "Crypto", "Culture"];
    for (const label of catChips) {
      const chip = page.locator(`button:has-text("${label}")`).first();
      log(`Category chip "${label}" renders`, await chip.count() > 0);
    }

    // Result count label
    const resultCount = page.locator("text=/\\d+ polls/");
    log("Result count label visible", await resultCount.count() > 0);

    // Chip styling: all filter chips use rounded-pill + font-mono + uppercase
    const filterChips = page.locator("button.rounded-pill.font-mono.uppercase");
    log("Filter chips use rounded-pill + font-mono + uppercase", await filterChips.count() > 5);

    /* ─── Table rendering ─── */
    section("TABLE: Headers + rows + clickable links");

    // Table header
    const thead = page.locator("thead");
    log("Table thead renders", await thead.count() > 0);

    // Header uses font-mono + uppercase + tracking
    const thCells = page.locator("thead th");
    const thCount = await thCells.count();
    log("Table has 9 header columns", thCount === 9, `got ${thCount}`);

    // Table header styling
    const theadClass = await thead.first().getAttribute("class") || "";
    log("Table header has font-mono", theadClass.includes("font-mono"));
    log("Table header has uppercase", theadClass.includes("uppercase"));
    log("Table header has bg-bg-overlay", theadClass.includes("bg-bg-overlay"));

    // Table rows
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    log("Table has data rows", rowCount > 0, `${rowCount} rows`);

    // Rows have hover effect
    if (rowCount > 0) {
      const firstRowClass = await rows.first().getAttribute("class") || "";
      log("Rows have hover:bg-bg-overlay", firstRowClass.includes("hover:bg-bg-overlay"));
    }

    // Clickable title links in table
    const titleLinks = page.locator("tbody td a");
    const linkCount = await titleLinks.count();
    log("Title cells are clickable links", linkCount > 0, `${linkCount} links`);

    // Links have hover styling
    if (linkCount > 0) {
      const linkClass = await titleLinks.first().getAttribute("class") || "";
      log("Links have hover:text-brand-300", linkClass.includes("hover:text-brand-300"));
      log("Links have hover:underline", linkClass.includes("hover:underline"));
    }

    // State chips in table use correct Chip component
    const tableChips = page.locator("tbody .rounded-pill.uppercase");
    log("State chips in table use Chip component", await tableChips.count() > 0);

    // Tabular-nums on numeric cells
    const tabNums = page.locator("tbody .tabular-nums");
    log("Numeric cells use tabular-nums", await tabNums.count() > 0);

    // Take screenshot
    await page.screenshot({ path: "scripts/screenshots/ai-polls-page.png", fullPage: true });
    log("Screenshot saved", true, "scripts/screenshots/ai-polls-page.png");

    /* ─── Filter interactions ─── */
    section("FILTER INTERACTIONS: Click filters + verify URL params");

    // Test each filter independently (reset between each)

    // Click "Today" date filter
    await page.locator('button:has-text("Today")').first().click();
    await page.waitForURL(/date=today/, { timeout: 5000 }).catch(() => {});
    log("Date filter 'Today' updates URL", page.url().includes("date=today"));

    // Reset
    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });

    // Click "Sports" category filter — wait for hydration then click
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // ensure hydration
    const sportsChip = page.locator('button.rounded-pill:has-text("Sports")').first();
    await sportsChip.scrollIntoViewIfNeeded();
    await sportsChip.click({ force: true });
    // Next.js client nav: wait for URL to update
    for (let i = 0; i < 20; i++) {
      if (page.url().includes("category=sports")) break;
      await page.waitForTimeout(250);
    }
    log("Category filter 'Sports' updates URL", page.url().includes("category=sports"), page.url().split("?")[1] || "(no params)");

    // Add state filter on top
    const pendingChip = page.locator('button.rounded-pill:has-text("Pending")').first();
    await pendingChip.scrollIntoViewIfNeeded();
    await pendingChip.click({ force: true });
    for (let i = 0; i < 20; i++) {
      if (page.url().includes("state=PENDING_REVIEW")) break;
      await page.waitForTimeout(250);
    }
    log("State filter 'Pending' updates URL", page.url().includes("state=PENDING_REVIEW"));

    // Combined filters should be in URL
    const currentUrl = page.url();
    log("Multiple filters combine in URL",
      currentUrl.includes("category=") && currentUrl.includes("state="),
      currentUrl.split("?")[1]);

    await page.screenshot({ path: "scripts/screenshots/ai-polls-filtered.png", fullPage: true });

    // Type in search — add to existing filters
    const filterSearchInput = page.locator('input[type="search"][placeholder*="polls"]').first();
    if (await filterSearchInput.count() > 0) {
      await filterSearchInput.fill("Simba");
    } else {
      await page.locator('input[type="search"]').last().fill("Simba");
    }
    await page.locator("button:has-text('Search')").first().click();
    await page.waitForURL(/q=Simba/, { timeout: 5000 }).catch(() => {});
    log("Search updates URL with q param", page.url().includes("q=Simba"));

    // Clear all filters
    const clearBtn = page.locator("button:has-text('Clear all')");
    if (await clearBtn.count() > 0) {
      await clearBtn.first().click();
      await page.waitForURL(u => !u.toString().includes("q="), { timeout: 5000 }).catch(() => {});
      const cleanUrl = page.url();
      log("Clear all removes all filters", !cleanUrl.includes("q=") && !cleanUrl.includes("state=") && !cleanUrl.includes("category="));
    } else {
      log("Clear all button appears when filters active", false, "not found");
    }

    /* ─── Detail page navigation ─── */
    section("DETAIL PAGE: Click row \u2192 /admin/ai-polls/[id]");

    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Find first clickable link in table
    const firstLink = page.locator("tbody td a").first();
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute("href");
      log("First row has href to detail page", href?.startsWith("/admin/ai-polls/"), href);

      await firstLink.click();
      await page.waitForURL(/\/admin\/ai-polls\/aipoll_/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      const detailUrl = page.url();
      log("Navigated to detail page", /\/admin\/ai-polls\/aipoll_/.test(detailUrl), detailUrl);

      // Detail page elements
      const detailTitle = await page.locator("h2, .font-display.font-bold").first().textContent().catch(() => "");
      log("Detail page shows poll title", detailTitle.length > 0, detailTitle?.slice(0, 50));

      // Back button
      const backBtn = page.locator("a:has-text('Back to polls')");
      log("Back button renders", await backBtn.count() > 0);

      // State chip on detail page
      const detailChip = page.locator(".rounded-pill.uppercase.font-bold").first();
      log("State chip on detail page", await detailChip.count() > 0);

      // Metadata section
      const metaLabels = page.locator("text='Poll ID'");
      log("Metadata section renders", await metaLabels.count() > 0);

      // Resolution criterion card
      const resCrit = page.locator("text='Resolution criterion'");
      log("Resolution criterion section renders", await resCrit.count() > 0);

      // Detail page uses glass-panel cards
      const detailPanels = page.locator(".glass-panel");
      log("Detail page uses glass-panel cards", await detailPanels.count() >= 2, `${await detailPanels.count()} panels`);

      await page.screenshot({ path: "scripts/screenshots/ai-polls-detail.png", fullPage: true });

      // Navigate back
      await backBtn.first().click();
      await page.waitForTimeout(500);
      log("Back button navigates to poll list", page.url().includes("/admin/ai-polls"));
    } else {
      log("Table has clickable rows", false, "no links found");
    }

    /* ─── Pending review section ─── */
    section("PENDING REVIEW + APPROVED SECTIONS");

    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Check pending review section
    const pendingHeader = page.locator("text='Awaiting your review'");
    const hasPending = await pendingHeader.count() > 0;
    log("Pending review section renders", hasPending);

    if (hasPending) {
      // Pending section has Swahili subtitle
      const pendingSw = page.locator("text='Inasubiri uamuzi wako'");
      log("  - Swahili subtitle present", await pendingSw.count() > 0);

      // Approve button (gold)
      const approveBtn = page.locator("button:has-text('Approve')").first();
      if (await approveBtn.count() > 0) {
        const approveCls = await approveBtn.getAttribute("class") || "";
        log("  - Approve button is btn-gold", approveCls.includes("btn-gold"));
      }

      // Reject button (styled danger)
      const rejectBtn = page.locator("button:has-text('Reject')");
      log("  - Reject button renders", await rejectBtn.count() > 0);

      // Edit button (ghost)
      const editBtn = page.locator("button:has-text('Edit')");
      log("  - Edit button renders", await editBtn.count() > 0);

      // Regenerate button (ghost)
      const regenBtn = page.locator("button:has-text('Regenerate')");
      log("  - Regenerate button renders", await regenBtn.count() > 0);

      // Poll titles in pending section are clickable
      const pendingLinks = page.locator(".divide-y a.block");
      log("  - Poll titles are clickable links", await pendingLinks.count() > 0);
    }

    // Check approved section
    const approvedHeader = page.locator("text='Approved'");
    log("Approved section renders (if polls approved)", await approvedHeader.count() > 0);

    /* ─── Candidates page ─── */
    section("CANDIDATES PAGE: Filters + theme");

    await page.goto(`${BASE}/admin/candidates`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const candTitle = await page.locator("h1").first().textContent();
    log("Candidates page title renders", candTitle?.includes("Market candidates"), candTitle);

    // Search input on candidates page
    const candSearch = page.locator('input[type="search"]');
    log("Candidates page has search input", await candSearch.count() > 0);

    // Date chips on candidates page
    const candDateChips = page.locator('button:has-text("All time")');
    log("Candidates page has date filter chips", await candDateChips.count() > 0);

    // State chips on candidates page
    const candStateChips = page.locator('button:has-text("All states")');
    log("Candidates page has state filter chips", await candStateChips.count() > 0);

    // Category chips on candidates page
    const candCatChips = page.locator('button:has-text("All categories")');
    log("Candidates page has category filter chips", await candCatChips.count() > 0);

    // KPI cards
    const candKpis = page.locator(".glass-panel");
    log("Candidates page has glass-panel KPIs", await candKpis.count() >= 4);

    await page.screenshot({ path: "scripts/screenshots/candidates-page.png", fullPage: true });

    // Test filter interactions on candidates
    await page.locator('button:has-text("Today")').first().click();
    await page.waitForTimeout(500);
    log("Candidates date filter works", page.url().includes("date=today"));

    await page.locator('button:has-text("Sports")').first().click();
    await page.waitForTimeout(500);
    log("Candidates category filter works", page.url().includes("category=sports"));

    /* ─── Cross-cutting theme checks ─── */
    section("CROSS-CUTTING: No kit violations");

    // Go back to ai-polls for final checks
    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // No rounded-2xl (banned — all should be rounded-xl or smaller)
    const r2xl = await page.locator('[class*="rounded-2xl"]').count();
    log("No rounded-2xl (kit uses rounded-xl max)", r2xl === 0, `found ${r2xl}`);

    // No text-teal / text-aqua (banned)
    const pageHtml = await page.content();
    log("No teal colour tokens in HTML", !pageHtml.includes("teal-"), "grep teal-");
    log("No aqua colour tokens in HTML", !pageHtml.includes("aqua-"), "grep aqua-");

    // No native <select> (kit uses custom Select)
    const nativeSelects = await page.locator("select:not([data-kit])").count();
    log("No native <select> elements", nativeSelects === 0, `found ${nativeSelects}`);

    // No emojis in visible text (admin UI)
    const bodyText = await page.locator("body").innerText();
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/u;
    log("No emojis in UI copy", !emojiRegex.test(bodyText));

    // Focus ring check: verify brand-500 is referenced in focus styles
    log("Focus ring references brand-500", searchClass.includes("brand-500"));

    /* ─── Responsive: mobile viewport ─── */
    section("RESPONSIVE: Mobile viewport (393px)");

    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Page doesn't overflow
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    log("No horizontal overflow on mobile", !overflowX);

    // Filter chips wrap properly
    const filterSection = page.locator(".flex-wrap").first();
    log("Filter chips use flex-wrap", await filterSection.count() > 0);

    // Table has overflow-x-auto
    const tableWrap = page.locator(".overflow-x-auto");
    log("Table uses overflow-x-auto for mobile", await tableWrap.count() > 0);

    await page.screenshot({ path: "scripts/screenshots/ai-polls-mobile.png", fullPage: true });

    // Reset viewport
    await page.setViewportSize({ width: 1440, height: 900 });

  } catch (err) {
    console.error("\nFATAL:", err.message);
    fail++;
  } finally {
    await browser.close();
  }

  /* ─── Summary ─── */
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  RESULTS: ${pass} passed / ${fail} failed / ${pass + fail} total`);
  if (failures.length > 0) {
    console.log(`\n  FAILURES:`);
    failures.forEach(f => console.log(`    \u2717 ${f}`));
  }
  console.log(`${"=".repeat(60)}\n`);

  process.exit(fail > 0 ? 1 : 0);
})();
