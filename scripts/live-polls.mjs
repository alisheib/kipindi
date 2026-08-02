/**
 * PHASE A — admin AI POLL GENERATION, driven on LIVE PRODUCTION.
 *
 * generate → the candidate appears in the review queue → approve → publish → a LIVE market
 * a player can actually bet on. Driven as the QA TRADING officer, which is the domain every
 * one of these actions asks for (`requireStaff("trading")` in ai-polls/actions.ts) — NOT as
 * ADMIN, whose owner bypass would prove nothing about whether a real operator can do this.
 *
 * ⚠️ SPENDS REAL ANTHROPIC CREDIT (~$0.15–0.25 per generation) and PUBLISHES A REAL MARKET
 * on the live platform. That is the point — a probe is not a poll, and a green build is not
 * evidence. The market it creates is a genuine one; it is left live deliberately so Phase C
 * can bet on it.
 *
 * Every assertion is paired with the state it claims to reflect: the DOM says the queue
 * grew, and `scripts/live/verify-polls.cjs` re-reads the same claim from the database.
 */
import { BASE, bodyText, browser, clickByName, login, recorder, shot, waitForText } from "./live/harness.mjs";

const r = recorder("PHASE A — AI poll generation on production");
const { b, ctx } = await browser();
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") r.note(`[browser] ${m.text().slice(0, 160)}`); });

/** Read the "N of M" counter the admin grids print, so growth is a real comparison. */
const queueTotal = (t) => Number((t.match(/(\d+)\s+of\s+(\d+)/) ?? [])[2] ?? 0);

try {
  await login(page, "trading");
  r.check("signed in as the TRADING officer", true);

  // ── The console ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "networkidle", timeout: 60_000 });
  const before = await bodyText(page);
  r.check("the AI poll console renders for a trading officer",
    before.includes("generate") && !before.includes("you do not have access"), before.slice(0, 140));

  const beforeTotal = queueTotal(before);
  r.note(`queue holds ${beforeTotal} candidate(s) before the run`);
  await shot(page, "A1-polls-before");

  // Is generation even switched on? If not, say so plainly rather than "the button failed".
  const genOff = before.includes("ai generation is off") || before.includes("switched off");
  r.check("AI generation is switched ON", !genOff,
    genOff ? "the AI toolkit switch is off — turn it on before reading anything below" : "");

  // ── Generate ──────────────────────────────────────────────────────────────
  // `--skip-generate` drives only the review half, against the candidate already at the
  // top of the queue. Each generation costs ~$0.20 of real credit, so re-running the
  // whole script to re-test the officer verbs would burn money for nothing.
  const skipGen = process.argv.includes("--skip-generate");
  if (skipGen) r.note("--skip-generate: reviewing the candidate already at the top of the queue");
  else {
    await clickByName(page, /^generate poll$/i);
    r.note("clicked 'Generate poll' — the 4-layer pipeline takes ~30-90s");
  }

  // 🔴 DO NOT poll the whole page for "pending review". The queue holds 500+ rows, so any
  // terminal word matches SOME OTHER candidate and the check passes while the new one is
  // still in flight — which is exactly what the first version of this script did: it
  // reported 8/8 against a row that read `generating … $0.00 … in-flight`. Scope the wait
  // to the FIRST row of the table, which is the candidate this run just created.
  const newestRow = page.locator("table.admin-tbl tbody tr").first();
  const settled = await page.waitForFunction(
    () => {
      const tr = document.querySelector("table.admin-tbl tbody tr");
      return !!tr && !/generating|in-flight/i.test(tr.innerText);
    },
    undefined,
    { timeout: 240_000 },
  ).then(() => true).catch(() => false);
  r.check("the NEW candidate (top row) left GENERATING within 4 minutes", settled,
    settled ? "" : `still: ${(await newestRow.innerText()).replace(/\s+/g, " ").slice(0, 120)}`);
  const after = await bodyText(page);
  await shot(page, "A2-polls-after-generate");

  r.check("no hard failure on the generate action",
    !/could not generate|something went wrong|unexpected error/.test(after),
    after.match(/could not generate[^.]*/)?.[0] ?? "");

  // ── The queue must have grown — durable state, not a toast ────────────────
  await page.reload({ waitUntil: "networkidle" });
  const queued = await bodyText(page);
  const afterTotal = queueTotal(queued);
  if (!skipGen) r.check("the candidate queue grew", afterTotal > beforeTotal, `before ${beforeTotal}, after ${afterTotal}`);
  await shot(page, "A3-polls-queue");

  // ── Open the newest candidate and read what the AI actually produced ──────
  const firstRow = page.locator("table.admin-tbl tbody tr").first();
  const hasRow = (await firstRow.count()) > 0;
  r.check("the queue renders at least one candidate row", hasRow);

  if (hasRow) {
    const rowText = (await firstRow.innerText()).replace(/\s+/g, " ").toLowerCase();
    r.note(`newest row: ${rowText.slice(0, 150)}`);
    r.check("the candidate row carries a state, not a blank shell",
      /review|published|filtered|failed|approved/.test(rowText), rowText.slice(0, 120));
    r.check("the candidate is NOT still generating (a stuck row reads as in-flight forever)",
      !/generating|in-flight/.test(rowText), rowText.slice(0, 120));
  }

  // ── APPROVE → PUBLISH, so the poll becomes a market a player can bet on ───
  // Generation alone is not the product; the officer verbs are.
  //
  // ⚠️ Approve lives on the CONSOLE (the "Awaiting your review" card), but Publish lives
  // on the candidate's DETAIL page (`[id]/page.tsx` renders ReviewActions + PublishActions).
  // The first version of this script clicked a "View" link that silently did not navigate,
  // then asserted Publish was missing — and reported a working product as two failures.
  // Take the id from the row's own href and go there explicitly.
  const href = await firstRow.getByRole("link", { name: /view/i }).first()
    .getAttribute("href").catch(() => null);
  r.check("the row offers a link to the candidate", !!href, href ?? "no href");

  if (href) {
    await page.goto(new URL(href, BASE).toString(), { waitUntil: "networkidle", timeout: 60_000 });
    const detail = await bodyText(page);
    r.check("the candidate detail page opened",
      /overall quality|resolution|criterion/.test(detail), detail.slice(0, 140));
    await shot(page, "A4-candidate-detail");

    // Approve only if it is still awaiting review — re-runs must be idempotent.
    if (detail.includes("approve") && !detail.includes("publish as market")) {
      await clickByName(page, /^approve$/i);
      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
      await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    }

    const ready = await bodyText(page);
    r.check("a 'Publish as market' control is offered once approved",
      ready.includes("publish as market"), ready.slice(0, 200));

    if (ready.includes("publish as market")) {
      await clickByName(page, /publish as market/i);
      await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => {});
      await page.reload({ waitUntil: "networkidle" }).catch(() => {});
      const published = await bodyText(page);
      r.check("publishing raised no error",
        !/could not|failed to publish|went wrong/.test(published),
        published.match(/could not[^.]*|failed to publish[^.]*/)?.[0] ?? "");
      r.check("the candidate now reads PUBLISHED",
        /published/.test(published), published.slice(0, 200));
      await shot(page, "A5-published");
    }
  }

  r.note("screenshots: A1-polls-before · A2-polls-after-generate · A3-polls-queue · A4-candidate-detail · A5-published");
} catch (err) {
  r.check("the run completed without throwing", false, String(err).slice(0, 400));
  await shot(page, "A-error");
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
