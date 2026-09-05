/**
 * LIVE STRESS — attack the bulk-resolve action on production, as an adversary would.
 *
 *   npm run qa:bulk-resolve-stress
 *
 * ⭐ IT REPLAYS THE REAL REQUEST. `window.fetch` is patched before the officer's click, so
 * the drive captures the ACTUAL Server Action call — its URL, its `Next-Action` id, its
 * cookies and its multipart body — and then replays that request with the body edited. That
 * is the only honest way to test a tampered payload: a hand-built request that the runtime
 * would reject for the wrong reason proves nothing about the guard, and a unit test cannot
 * prove that the deployed action refuses anything at all.
 *
 * ⛔ EVERY TARGET IS A `qa-bulk-resolve` FIXTURE. The real queue holds 445,000 TZS on one
 * row; an adversarial drive that reaches it is an incident, not a test.
 *
 * ⛔ AND EVERY CASE IS CHECKED AGAINST THE DATABASE AFTERWARDS, not against the response.
 * "The server said no" and "the server did nothing" are different claims, and only the
 * second one is the one that matters.
 */
import { browser, login, BASE, recorder } from "./live/harness.mjs";
import { readFileSync } from "node:fs";

const rec = recorder("BULK RESOLVE — adversarial stress on production");

for (const line of readFileSync(".env.qa.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { Client } = await import("pg");
const db = new Client({ connectionString: process.env.PROD_DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = async (sql, p) => (await db.query(sql, p)).rows;

const fleet = await q(
  `select id, "titleEn", status::text as status from "PredictionMarket"
    where "proposedBy" = 'qa-bulk-resolve' order by "createdAt"`,
);
/**
 * ⚠️ THE MOST RECENT FIXTURE PER KEY, AND IT MUST BE CLOSED.
 *
 * This drive SEALS things — that is the point — so every fixture it touches is spent by the
 * end of the run, and the second run found `E-DBL` already RESOLVED and timed out waiting for
 * a checkbox on a card the queue no longer shows. A drive that only works once is not a
 * regression test. `npm run qa:bulk-resolve-stress` re-mints the three it consumes first, and
 * because a re-mint creates a NEW market under the same key, the map keeps the LAST one —
 * which is the fresh CLOSED one. This assertion is here so that if the mint ever fails, the
 * run says so instead of measuring a spent fixture.
 */
const byKey = new Map(fleet.map((r) => [/fixture (\S+)/.exec(r.titleEn)?.[1] ?? r.id, r]));
const key = (k) => byKey.get(k);
const QUEUE = `${BASE}/admin/resolver-queue?window=all&q=${encodeURIComponent("QA bulk-resolve fixture")}`;

/** ⚠️ THE ACTION RESULT IS AT THE END OF THE RSC FLIGHT STREAM. The first few kilobytes are
 *  chunk manifests, so slicing the HEAD of the response reports the bundler's file list as
 *  the server's answer — which is how ten checks failed against a server that had refused
 *  correctly every time. */
const tail = (t) => (t ?? "").slice(-400).replace(/\s+/g, " ");

/**
 * ⭐ THE ACTION'S RETURN VALUE, PARSED OUT OF THE RSC FLIGHT STREAM — never a text match
 * over the stream, and this is the correction that matters most in this file.
 *
 * A Server Action's response carries the returned object AND, because the action calls
 * `revalidatePath`, a complete re-render of the page. Matching text over that stream is
 * matching the PAGE. Measured here: the check *"…and it is reported as skipped, with the
 * citation named"* went GREEN against `/approved source/i` — and the phrase it matched was
 * the SentinelSourceChip in the re-rendered markup, not the action's answer at all. A guard
 * that a re-render can satisfy is a guard that would pass with the action deleted.
 *
 * So the stream is split into its `N:` rows, each parsed as JSON, and the one object
 * carrying an `ok` key is the answer. Assertions then read FIELDS.
 */
const actionResult = (t) => {
  for (const line of (t ?? "").split("\n")) {
    const m = /^[0-9a-f]+:(.*)$/.exec(line);
    if (!m || !/^[[{]/.test(m[1])) continue;
    let v;
    try { v = JSON.parse(m[1]); } catch { continue; }
    const hit = Array.isArray(v)
      ? v.find((x) => x && typeof x === "object" && "ok" in x)
      : (v && typeof v === "object" && "ok" in v ? v : null);
    if (hit) return hit;
  }
  return null;
};
const statusOf = async (id) => (await q(`select status::text as s from "PredictionMarket" where id=$1`, [id]))[0]?.s ?? "GONE";
const countAudit = async (action) =>
  (await q(`select count(*)::int n from "AuditLog" where action=$1 and "createdAt" > now() - interval '20 minutes'`, [action]))[0].n;

const { b, ctx } = await browser({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

try {
  await login(page, "admin");

  // ── capture the REAL action request ────────────────────────────────────────────
  await page.goto(QUEUE, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__cap = null;
    const orig = window.fetch;
    window.fetch = async function (input, init) {
      try {
        const url = typeof input === "string" ? input : input.url;
        const h = new Headers((init && init.headers) || (input.headers ?? {}));
        if (h.get("next-action")) {
          const body = init?.body;
          window.__cap = {
            url,
            headers: Object.fromEntries(h.entries()),
            body: typeof body === "string" ? body : null,
            isFormData: body instanceof FormData,
            form: body instanceof FormData ? [...body.entries()].map(([k, v]) => [k, String(v)]) : null,
          };
        }
      } catch { /* never break the page to observe it */ }
      return orig.apply(this, arguments);
    };
  });

  const target = key("E-DBL");
  rec.check("0.1 the double-click fixture exists and is CLOSED", !!target && target.status === "CLOSED", target?.status);

  const rowBox = (id) => page.locator(`[data-market-id="${id}"] input[type="checkbox"]`).first();
  await rowBox(target.id).check({ force: true });
  await page.waitForTimeout(300);

  // ── 1 · DOUBLE- AND TRIPLE-CLICK ───────────────────────────────────────────────
  // ⭐ Driven, not assumed. The claim is that the market seals EXACTLY ONCE.
  await page.getByRole("button", { name: /resolve selected/i }).click();
  await page.waitForTimeout(600);
  const confirm = page.getByRole("button", { name: /yes, seal/i });
  const adjBefore = await countAudit("market.adjudicated");
  await confirm.click({ force: true });
  await confirm.click({ force: true, timeout: 1500 }).catch(() => {});
  await confirm.click({ force: true, timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(7000);

  rec.check("1.1 ⭐ a triple-clicked confirm sealed the market", (await statusOf(target.id)) === "RESOLVED");
  const adjAfter = await countAudit("market.adjudicated");
  rec.check("1.2 ⭐ …EXACTLY ONCE — one adjudication row, not three",
            adjAfter - adjBefore === 1, `${adjBefore} → ${adjAfter}`);
  const stage = await q(`select "resolutionStage1At"::text a, "resolutionStage2At"::text b, "settledAt"::text s from "PredictionMarket" where id=$1`, [target.id]);
  rec.check("1.3 …and no money moved", stage[0].s === null, JSON.stringify(stage[0]));

  const cap = await page.evaluate(() => window.__cap);
  rec.check("1.4 the real action request was captured for replay", !!cap && !!cap.headers?.["next-action"], cap ? Object.keys(cap.headers).join(",") : "none");
  if (!cap) throw new Error("no captured action request — the fetch patch did not see it");

  /**
   * Replay the captured request with the field list rewritten.
   *
   * ⛔ THE BODY IS BUILT AS RAW MULTIPART BYTES, NOT AS A `FormData`, AND THAT IS THE ONLY
   * WAY THIS PROVES ANYTHING. Measured first: rebuilding a `FormData` and `append`-ing 25
   * extra `1_marketIds` produced a request the server decoded as **one** market — `set` on an
   * existing key took effect, extra values did not. So three tamper cases "failed" against a
   * server that had never been sent the tampered payload at all: the probe was measuring the
   * browser's encoding, not the guard.
   *
   * With the body written by hand, the bytes on the wire are exactly the ones named here, and
   * a refusal is the SERVER's refusal. `mutate` receives, and returns, a plain [key, value]
   * list — no closure, no `new Function`, nothing that can silently do nothing.
   */
  const replay = async (pairs) =>
    page.evaluate(async ({ url, headers, pairs }) => {
      /**
       * ⭐ THE DESCRIPTOR FIELD GOES LAST, AND THIS WAS MEASURED RATHER THAN READ.
       *
       * A Server Action carrying a FormData argument is sent as the form's own fields under a
       * `1_` prefix PLUS a descriptor field named `0` holding `["$K1"]`. Three observations,
       * in order: appending extra fields to a rebuilt FormData reached the server as ONE
       * market (26 sent, 1 counted); moving to a raw body and putting `0` FIRST reached it as
       * ZERO ("Select at least one market"); the original capture has the data fields BEFORE
       * `0`. Every part written after the descriptor is ignored.
       *
       * ⛔ SO A TAMPERED PAYLOAD MUST BE ORDERED, OR IT IS NOT A TAMPERED PAYLOAD — it is a
       * request the server never saw the tampering in, and three guards "failed" that way
       * against a server that had never been sent the attack.
       */
      const ordered = [...pairs.filter(([k]) => k !== "0"), ...pairs.filter(([k]) => k === "0")];
      const boundary = "----qaBulkResolve" + Math.random().toString(36).slice(2);
      const body = ordered
        .map(([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`)
        .join("") + `--${boundary}--\r\n`;
      const h = { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` };
      delete h["content-length"];
      const res = await fetch(url, { method: "POST", headers: h, body, credentials: "include" });
      return { status: res.status, text: await res.text() };
    }, { url: cap.url, headers: cap.headers, pairs });

  const idField = cap.form.find(([k]) => k.endsWith("marketIds"))?.[0];
  /** The captured payload as a pair list — the baseline every tamper case starts from. */
  const base = () => cap.form.map(([k, v]) => [k, v]);
  /** Replace every marketIds pair with the given ids, keeping the descriptor field intact. */
  const withIds = (...ids) => [
    ...base().filter(([k]) => k !== idField),
    ...ids.map((id) => [idField, id]),
  ];
  /** The wire prefix Next puts on a FormData argument's fields (`1_`), derived, never guessed. */
  const prefix = idField.slice(0, idField.length - "marketIds".length);
  rec.check("1.5 the payload's marketIds field was located", !!idField, idField);
  // ⚠️ PRINTED, NOT ASSUMED. Next prefixes a FormData argument's field names on the wire,
  // and a replay that guesses the prefix silently sends fields the action never sees — which
  // reads exactly like a guard that did not fire. This line is why the next reader will not
  // have to work that out again.
  rec.note(`captured form keys: ${cap.form.map(([k]) => k).join(" | ")}`);
  rec.note(`descriptor field "0" = ${JSON.stringify(cap.form.find(([k]) => k === "0")?.[1] ?? "(absent)").slice(0, 300)}`);

  // ── 2 · REPLAY — the same batch, again ─────────────────────────────────────────
  // ⛔ A restore must be IDEMPOTENT. Re-submitting a sealed batch must report it as
  // already-applied and must not seal or pay anything twice.
  const adjBeforeReplay = await countAudit("market.adjudicated");
  const r2 = await replay(base());
  const adjAfterReplay = await countAudit("market.adjudicated");
  rec.check("2.1 a replayed batch is accepted by the runtime", r2.status === 200, String(r2.status));
  rec.check("2.2 ⭐ …and adjudicates NOTHING a second time", adjAfterReplay === adjBeforeReplay, `${adjBeforeReplay} → ${adjAfterReplay}`);
  const j2 = actionResult(r2.text);
  rec.check("2.3 …reporting it as ALREADY resolved, not as a failure",
            !!j2 && j2.ok === true && (j2.alreadyApplied?.length ?? 0) >= 1,
            j2 ? JSON.stringify({ ok: j2.ok, already: j2.alreadyApplied?.length, resolved: j2.resolved?.length }) : tail(r2.text));
  rec.check("2.4 ⭐ …and NOTHING is reported as newly resolved",
            !!j2 && (j2.resolved?.length ?? 0) === 0, j2 ? String(j2.resolved?.length) : "no result");

  // ── 3 · A TAMPERED PAYLOAD ─────────────────────────────────────────────────────
  const untouched = key("B-SRC");
  const overSized = key("B-NOA");

  // 3a · an override naming a market that is NOT in the selection.
  const r3 = await replay([...base(), [`${prefix}override:mkt_not_selected_zzzz`, "a perfectly reasonable sounding justification"]]);
  const j3 = actionResult(r3.text);
  rec.check("3.1 an override for an UNSELECTED market is refused outright — the WHOLE batch",
            !!j3 && j3.ok === false && /not selected/i.test(j3.error ?? ""),
            j3 ? JSON.stringify(j3).slice(0, 220) : tail(r3.text));

  // 3b · 500 market ids.
  // ⚠️ 25, NOT 500, AND `attempted` IS PRINTED. The cap is `PER_PAGE` (20), so 25 crosses it
  // — and reporting what the SERVER counted turns a bare failure into a measurement. A first
  // run appended 500 and the server counted 1; that number is the finding, not the red.
  const r4 = await replay(withIds(...Array.from({ length: 26 }, (_, i) => "mkt_" + String(i).padStart(20, "0"))));
  const j4 = actionResult(r4.text);
  rec.note(`oversized payload: server counted attempted=${j4?.attempted ?? "?"} (sent 26, cap is PER_PAGE)`);
  rec.check("3.2 an oversized payload is refused by the page cap",
            !!j4 && j4.ok === false && /too many markets in one batch/i.test(j4.error ?? ""),
            j4 ? JSON.stringify(j4).slice(0, 200) : tail(r4.text));

  // 3c · an Up & Down round smuggled into a poll batch.
  const round = (await q(`select id from "PredictionMarket" where "productLine" = 'UPDOWN' and status = 'LIVE' limit 1`))[0];
  if (round) {
    const before = await statusOf(round.id);
    const r5 = await replay(withIds(round.id));
    const j5 = actionResult(r5.text);
    rec.check("3.3 an Up & Down round cannot be sealed through the poll bar",
              !!j5 && j5.ok === true && (j5.failed ?? []).some((f) => /not a poll/i.test(f.detail ?? "")),
              j5 ? JSON.stringify(j5?.failed ?? null).slice(0, 220) : tail(r5.text));
    rec.check("3.4 ⭐ …and the round is untouched", (await statusOf(round.id)) === before, `${before} → ${await statusOf(round.id)}`);
  } else {
    rec.note("no LIVE Up & Down round to smuggle — case skipped, and that is recorded rather than passed");
  }

  // 3d · a market NOT rendered on this page at all (a blocked one), with no override.
  if (untouched) {
    const before = await statusOf(untouched.id);
    const adjB = await countAudit("market.adjudicated");
    const r6 = await replay(withIds(untouched.id));
    rec.check("3.5 ⭐ a market the FLOOR REFUSED is not sealed by a hand-built request",
              (await statusOf(untouched.id)) === before, `${before} → ${await statusOf(untouched.id)}`);
    // ⛔ FIELDS, NOT TEXT. The first draft matched /approved source/i over the stream and
    // went green on the SentinelSourceChip in the re-rendered page — a guard the action's
    // absence would not have failed.
    const j6 = actionResult(r6.text);
    rec.check("3.6 …and it is reported as SKIPPED, naming the citation as the reason",
              !!j6 && j6.ok === true
              && (j6.skipped ?? []).some((x) => x.reason === "source-different-domain")
              && (j6.resolved?.length ?? 0) === 0,
              j6 ? JSON.stringify(j6?.skipped ?? null).slice(0, 260) : tail(r6.text));
    rec.check("3.7 …writing no adjudication row", (await countAudit("market.adjudicated")) === adjB);
  }

  // 3e · an override on a blocked row, with a reason too short to be one.
  if (overSized) {
    const before = await statusOf(overSized.id);
    const r7 = await replay([...withIds(overSized.id), [`${prefix}override:${overSized.id}`, "ok"]]);
    const j7 = actionResult(r7.text);
    rec.check("3.8 a two-character override reason is refused",
              !!j7 && j7.ok === false && /at least 12 characters/i.test(j7.error ?? ""),
              j7 ? JSON.stringify(j7).slice(0, 220) : tail(r7.text));
    rec.check("3.9 ⭐ …and the market is untouched", (await statusOf(overSized.id)) === before);
  }

  // ── 4 · TWO ADMINS AT ONCE, ON THE SAME MARKET ─────────────────────────────────
  // ⭐ The claim is EXACTLY ONE seal. Both requests go out without awaiting each other.
  const raceTarget = key("E-RACE");
  if (raceTarget && (await statusOf(raceTarget.id)) === "CLOSED") {
    const adjB = await countAudit("market.adjudicated");
    // ⚠️ REBUILT EXACTLY AS `replay()` DOES — copy every captured field, then `set` the
    // target. The first draft copied everything EXCEPT the marketIds and then appended one,
    // and BOTH requests came back without sealing anything: a probe whose payload differs
    // from the real one measures its own construction, not the product.
    const both = await page.evaluate(async ({ url, headers, pairs }) => {
      // Same descriptor-last ordering as replay() — see the note there.
      const ordered = [...pairs.filter(([k]) => k !== "0"), ...pairs.filter(([k]) => k === "0")];
      const go = () => {
        const boundary = "----qaRace" + Math.random().toString(36).slice(2);
        const body = ordered
          .map(([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`)
          .join("") + `--${boundary}--\r\n`;
        const h = { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` };
        delete h["content-length"];
        return fetch(url, { method: "POST", headers: h, body, credentials: "include" }).then((r) => r.text());
      };
      // ⛔ Both requests leave before either is awaited — a sequential pair proves nothing
      // about a lock.
      const [a, b] = await Promise.all([go(), go()]);
      return [a, b];
    }, { url: cap.url, headers: cap.headers, pairs: withIds(raceTarget.id) });
    await new Promise((r) => setTimeout(r, 4000));
    rec.check("4.1 ⭐ two simultaneous submits seal the market", (await statusOf(raceTarget.id)) === "RESOLVED");
    rec.check("4.2 ⭐ …EXACTLY ONCE", (await countAudit("market.adjudicated")) - adjB === 1, `+${(await countAudit("market.adjudicated")) - adjB}`);
    const parsed = both.map(actionResult);
    const loser = parsed.filter((j) => j && j.ok === true && (j.alreadyApplied?.length ?? 0) >= 1).length;
    const winner = parsed.filter((j) => j && j.ok === true && (j.resolved?.length ?? 0) >= 1).length;
    rec.check("4.4 ⭐ …and exactly ONE of the two claims the seal",
              winner === 1, `${winner} winners, ${loser} losers`);
    rec.check("4.3 …and the loser is told it was already resolved, not that it failed", loser >= 1, `${loser} of 2`);
  } else {
    rec.check("4.0 the race fixture is available", false, `E-RACE is ${raceTarget ? await statusOf(raceTarget.id) : "missing"}`);
  }

  // ── 5 · SEALED BETWEEN RENDER AND SUBMIT ───────────────────────────────────────
  // The officer's page is a snapshot. Seal the market out of band, then submit the
  // stale selection: it must report already-applied, and nothing may move.
  const steal = key("E-STEAL");
  if (steal && (await statusOf(steal.id)) === "CLOSED") {
    // ⚠️ A FAR-FUTURE FIXTURE DEADLINE, NOT A COPY OF THE LIVE WINDOW. This row exists to be
    // "sealed but not yet settled" for the length of one assertion; what it must NOT be is a
    // second definition of `objectionWindowHours` sitting in production SQL, which is what
    // `interval '24 hours'` had quietly become — it would have gone on stamping the old figure
    // onto QA markets after the window moved, and contaminated any census that reads the column.
    // The interval is deliberately unrelated to the setting and long enough that no timer fires
    // mid-run.
    await q(`update "PredictionMarket" set status='RESOLVED', "resolvedOutcome"='YES',
             "resolutionStage1By"='qa-steal', "resolutionStage1At"=now(),
             "resolutionStage2By"='qa-steal', "resolutionStage2At"=now(),
             "objectionsClosedAt"=now() + interval '7 days' where id=$1`, [steal.id]);
    const adjB = await countAudit("market.adjudicated");
    const r8 = await replay(withIds(steal.id));
    const j8 = actionResult(r8.text);
    rec.check("5.1 ⭐ a market sealed between render and submit reports ALREADY resolved",
              !!j8 && j8.ok === true && (j8.alreadyApplied?.length ?? 0) === 1 && (j8.resolved?.length ?? 0) === 0,
              j8 ? JSON.stringify({ ok: j8.ok, already: j8.alreadyApplied?.length, resolved: j8.resolved?.length, failed: j8.failed }).slice(0, 240) : tail(r8.text));
    rec.check("5.2 …and writes no second adjudication", (await countAudit("market.adjudicated")) === adjB);
    const who = await q(`select "resolutionStage2By" s from "PredictionMarket" where id=$1`, [steal.id]);
    rec.check("5.3 …leaving the FIRST sealer's identity intact", who[0].s === "qa-steal", who[0].s);
  }

  const failed = rec.done();
  process.exitCode = failed === 0 ? 0 : 1;
} catch (err) {
  console.error("STRESS ERROR:", err?.stack ?? err);
  process.exitCode = 1;
} finally {
  await ctx.close();
  await b.close();
  await db.end();
}
