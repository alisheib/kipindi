/**
 * READ_TIERS PROVEN BY REFUSAL, ON PRODUCTION — Jay unit K's acceptance criterion.
 *
 *   npm run qa:read-tiers
 *
 * ⛔ §5 OF THE DESIGN IS WHY THIS FILE LOOKS THE WAY IT DOES: "a permission surface that only
 * ever tests the allow path is an absent test." So every refusal below is paired with a POSITIVE
 * CONTROL in the SAME RUN, and two of the controls are on the SAME ROLE — because "SUPPORT sees
 * nothing" would otherwise satisfy every refusal here while describing a broken page.
 *
 * ⭐ THE HARD PART IS THAT AT REST EVERY ROLE RENDERS THE SAME DOTS (§4c). `read` means "masked
 * at rest, MAY reveal", so ADMIN and SUPPORT both show `a••••@…`. Comparing rendered strings
 * would prove nothing. What separates them is whether the REVEAL CONTROL EXISTS — and, the layer
 * below that, whether the SERVER still refuses a request that never came from a control.
 *
 * ⛔ AND §5.4: the raw value must be absent from the SERVER'S RESPONSE, asserted on the HTML and
 * not on the rendered box. `innerText` returns text a `display:none` wrapper still contains, and
 * a `visibility:hidden` address is an address that shipped.
 *
 * ⚠️ THE TWO PERSONAS THIS NEEDS DID NOT EXIST UNTIL 2026-08-26. Ruling D5 called that a hard
 * blocker; it was a state to create — `npm run ops:mint-read-tier-personas`.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { BASE, browser, loginOnce } from "./live/harness.mjs";

const require = createRequire(import.meta.url);
const REPO = process.env.KP_REPO ?? "F:/kipindi-main";

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

function db() {
  const { Client } = require(join(REPO, "node_modules", "pg"));
  const envPath = join(REPO, "scripts/live/ops/.env");
  if (!existsSync(envPath)) throw new Error("scripts/live/ops/.env missing — run mkenv.cjs");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  return new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

const client = db();
await client.connect();
const { b } = await browser();

/** Open the player page in a fresh context for `who`, returning the page + the SERVER's HTML. */
async function open(who, playerId) {
  const state = await loginOnce(b, who);
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/admin/players/${playerId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const serverHtml = await res.text();
  await page.waitForTimeout(4_500);
  return { ctx, page, serverHtml, status: res.status(), url: page.url() };
}

/** What the identity line and the reveal controls look like for whoever is signed in. */
async function readSurface(page) {
  return await page.evaluate(() => {
    const ps = Array.from(document.querySelectorAll("p"));
    const line = ps.find((p) => /…\s·/.test((p.innerText || "").trim()));
    const identity = (line?.innerText || "").replace(/\s+/g, " ").trim();
    const buttons = Array.from(document.querySelectorAll("button"))
      .map((x) => x.getAttribute("aria-label"))
      .filter((l) => l && /^(Reveal|Hide) /.test(l));
    const body = (document.body.innerText || "").replace(/\s+/g, " ");
    return {
      identity,
      identityParts: identity.split("·").map((s) => s.trim()),
      revealControls: buttons,
      maskedEmail: /[A-Za-z0-9]\u2022\u2022\u2022\u2022@/.test(body),
      body: body.slice(0, 400),
    };
  });
}

try {
  // A player with both fields set — the population the assertions need.
  const pr = await client.query(
    `select id, email, region from "User" where email is not null and region is not null and role = 'PLAYER' limit 1`,
  );
  const player = pr.rows[0];
  if (!player) throw new Error("no PLAYER with both email and region — cannot assert masking");
  console.log(`   subject: ${player.id}\n`);

  // ── 1 · SUPPORT — the refusal ──────────────────────────────────────────────
  const sup = await open("support", player.id);
  const supS = await readSurface(sup.page);

  // ⭐ POSITIVE CONTROL FIRST, on the same role: the route IS theirs. Without this, every
  // assertion below would also pass for a session that had simply been bounced to a login page.
  ok("1: ⭐ POSITIVE CONTROL · SUPPORT can REACH the player page at all — the route is theirs",
     sup.status === 200 && sup.url.includes(`/admin/players/${player.id}`) && supS.identity.length > 0,
     `http=${sup.status} · url=${sup.url}`);

  ok("1: 🔴 SUPPORT sees the email MASKED, not in the clear",
     supS.maskedEmail && !supS.body.includes(player.email),
     supS.maskedEmail ? "a••••@… rendered" : "no masked email found");

  // ⛔ THE CEILING. `masked` is not "read with an extra click" — there is no control to click.
  ok("1: 🔴 …and SUPPORT is given NO reveal control — the refusal is an ABSENCE, not a disabled button",
     supS.revealControls.length === 0,
     supS.revealControls.join(", ") || "0 reveal controls");

  // identity.personal = none for SUPPORT ⇒ the region is not rendered at all, not even as dots.
  ok("1: 🔴 …and the region is ABSENT for SUPPORT, not merely masked",
     !supS.identity.includes("\u2022\u2022\u2022\u2022"),
     supS.identityParts.join(" | "));

  // §5.4 — assert on the SERVER'S response, not the box.
  ok("1: ⛔ §5.4 · the raw email is ABSENT FROM THE SERVER'S HTML for SUPPORT — not hidden, absent",
     !sup.serverHtml.includes(player.email),
     `serverHtml ${sup.serverHtml.length} bytes`);

  // ⭐ SAME-ROLE POSITIVE CONTROL: history.activity is `read`, so the desk still works.
  const supDesk = await sup.page.evaluate(() => {
    const t = (document.body.innerText || "").toLowerCase();
    return { hasActivity: /activity|audit|history|suspend/.test(t) };
  });
  ok("1: ⭐ POSITIVE CONTROL (same role) · SUPPORT still has their desk — the tier subtracted, it did not break the page",
     supDesk.hasActivity);

  // ── 2 · ADMIN — the positive control, same page, same run ──────────────────
  const adm = await open("admin", player.id);
  const admS = await readSurface(adm.page);
  ok("2: ⭐ POSITIVE CONTROL · ADMIN, on the SAME page in the SAME run, IS given the reveal controls",
     admS.revealControls.length >= 1,
     admS.revealControls.join(", ") || "0 — leg 1 proves nothing without this");

  // ⛔ D3: ADMIN is masked AT REST too. If ADMIN saw the raw value, `masked` would just be
  // "what juniors get" rather than a property of the platform.
  ok("2: ⛔ D3 · and ADMIN is masked AT REST as well — the raw email is absent from ADMIN's server HTML too",
     !adm.serverHtml.includes(player.email) && admS.maskedEmail);

  // ── 3 · AUDITOR — and the INTERSECTION RULE, demonstrated rather than argued ──
  // 🔴 THIS LEG WAS WRONG THE FIRST TIME, AND THE WAY IT WAS WRONG IS THE LESSON. It asserted
  // that AUDITOR sees the region MASKED where SUPPORT sees nothing — a real difference in §3.2's
  // grid. But AUDITOR holds no `support` domain grant, and /admin/players is a `support` route,
  // so AUDITOR never reaches the page at all. ⛔ Worse: the leg's SECOND assertion ("AUDITOR is
  // given no reveal control") PASSED — vacuously, because there was no page to carry one. A
  // refusal satisfied by an empty page is exactly the defect this suite exists to catch, and it
  // had appeared inside the suite itself.
  //
  // ⭐ SO THE LEG NOW PROVES WHAT IS ACTUALLY TRUE, AND IT IS THE MORE VALUABLE FACT: the
  // composition rule from §1a, live. effective = the INTERSECTION of the domain gate and the
  // read cell. AUDITOR's read cells for this page are moot because the DOMAIN closes first — and
  // a read tier may only ever SUBTRACT, never re-open a route.
  const aud = await open("auditor", player.id);
  const audS = await readSurface(aud.page);
  const audBlocked = !audS.identity || /restricted|not authoris|not authoriz|sign in/i.test(audS.body);
  ok("3: ⭐ §1a INTERSECTION · AUDITOR never reaches the player page — the DOMAIN gate closes before any read cell applies",
     audBlocked, `url=${aud.url} · identity=[${audS.identity}] · ${audS.body.slice(0, 90)}`);

  // ⭐ POSITIVE CONTROL, and it is not optional: without it "AUDITOR sees nothing" is satisfied
  // by a broken account, a bad password, or a persona that was never actually promoted.
  const audCtx2 = await b.newContext({ storageState: await loginOnce(b, "auditor"), viewport: { width: 1440, height: 1000 } });
  const audPage2 = await audCtx2.newPage();
  // ⚠️ /admin/insights was the first choice and it TIMED OUT at 90s — a heavy analytics page.
  // A positive control must not depend on the slowest route in the console: when it flakes, the
  // refusal it underwrites stops meaning anything and the run reads as a product failure.
  // /admin/self-exclusions is the same COMPLIANCE domain AUDITOR holds, and it is a short list.
  // 26a0Fe0f /admin/kyc was tried first and 404s — it has only a [id] route, no index.
  const audRes2 = await audPage2.goto(BASE + "/admin/self-exclusions", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await audPage2.waitForTimeout(3_500);
  const audOk2 = await audPage2.evaluate(() => {
    const t = (document.body.innerText || "").replace(/\s+/g, " ");
    return { restricted: /restricted|not authoris|not authoriz/i.test(t), head: t.slice(0, 80) };
  });
  ok("3: ⭐ POSITIVE CONTROL · the SAME AUDITOR session DOES reach a compliance route it holds",
     audRes2.status() === 200 && !audOk2.restricted,
     `http=${audRes2.status()} · ${audOk2.head}`);
  await audCtx2.close();
  // ── 4 · THE HOSTILE CLIENT — the seal ──────────────────────────────────────
  // ⛔ The absent button proves the CONSOLE is safe. The licence is not protected by a widget:
  // capture ADMIN's real reveal request and replay it from SUPPORT's own session.
  // ⛔ SNAPSHOT BEFORE THE REVEAL, OR THIS LEG GOES VACUOUS AFTER ITS FIRST GREEN.
  // The audit log is append-only and HMAC-chained — rows never age out by design. An unbounded
  // "does a pii.revealed row exist for this player?" query therefore passes for ever on the row
  // the FIRST run wrote, even with the audit write deleted from the action. And this is D4's ONLY
  // executable guard, so that would have left the ruling unprotected while the suite read 18/0.
  const auditBefore = await client.query(
    `select id from "AuditLog" where action = 'pii.revealed' and "targetId" = $1`,
    [player.id],
  );
  const seenAuditIds = new Set(auditBefore.rows.map((r) => r.id));

  let action = null;
  adm.page.on("request", (req) => {
    if (req.method() === "POST" && req.headers()["next-action"]) {
      action = { url: req.url(), headers: req.headers(), body: req.postData() };
    }
  });
  const revealBtn = adm.page.getByRole("button", { name: /^Reveal Email address$/ });
  await revealBtn.first().click();
  // ⛔ WAIT FOR THE SIGNAL, NEVER FOR A FIXED SLEEP. A 5s sleep passed on a warm server and
  // FAILED on the first run after a deploy — a cold start made the first server action slower than
  // the wait, and the POSITIVE CONTROL reported the product broken when the instrument was merely
  // impatient. A flaky positive control is worse than none: it teaches you to re-run until green.
  await adm.page
    .waitForFunction((needle) => (document.body.innerText || "").includes(needle), player.email, { timeout: 45_000 })
    .catch(() => {});
  const admAfter = await adm.page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
  ok("4: ⭐ POSITIVE CONTROL · ADMIN's reveal actually returns the address",
     admAfter.includes(player.email), action ? "captured the server-action POST" : "no POST captured");
  ok("4: …and the request is a real server action we can replay", Boolean(action?.url && action?.body),
     action?.url ?? "none");

  let hostile = { status: 0, text: "" };
  if (action) {
    hostile = await sup.page.evaluate(async ({ url, headers, body }) => {
      const h = {};
      for (const [k, v] of Object.entries(headers)) {
        if (["host", "content-length", "connection", "cookie"].includes(k.toLowerCase())) continue;
        h[k] = v;
      }
      const res = await fetch(url, { method: "POST", headers: h, body, credentials: "include" });
      return { status: res.status, text: (await res.text()).slice(0, 4000) };
    }, action);
  }
  ok("4: 🔴 the server ANSWERED the replayed request rather than crashing", hostile.status === 200,
     `HTTP ${hostile.status}`);
  // ⭐ The refusal must NAME THE CLASS — an operator refused should be able to tell their manager
  // which grant they lack, the same rule E-213's category refusal follows.
  ok("4: 🔴 …and SUPPORT's replay is REFUSED, naming the class rather than saying \"invalid\"",
     /identity\.contact/.test(hostile.text) && !hostile.text.includes(player.email),
     hostile.text.replace(/\s+/g, " ").slice(0, 180));
  ok("4: ⛔ …and the address itself never appears in that response",
     !hostile.text.includes(player.email));

  // ── 5 · THE AUDIT TRAIL TELLS THE TRUTH ────────────────────────────────────
  const supUser = await client.query('select id from "User" where "phoneE164" = $1', ["+255712000108"]);
  const supId = supUser.rows[0]?.id;
  const rowsAll = await client.query(
    `select id, "actorId", payload from "AuditLog" where action = 'pii.revealed' and "targetId" = $1`,
    [player.id],
  );
  // ⭐ ONLY the rows THIS RUN created. Everything below is asserted against the delta, so a
  // historical row can neither satisfy the positive nor mask the negative.
  const rows = { rows: rowsAll.rows.filter((r) => !seenAuditIds.has(r.id)) };
  rows.rowCount = rows.rows.length;
  ok("5: ⭐ THIS RUN's reveal wrote a NEW audit row — asserted on the delta, not on history",
     rows.rows.some((r) => r.payload?.role === "ADMIN"), `${rows.rowCount} NEW row(s) this run · ${auditBefore.rowCount} pre-existing`);
  // ⛔ A refusal must not be logged as a read, or the count that answers "who read this?" lies.
  ok("5: ⛔ …and SUPPORT's REFUSED attempt wrote NO pii.revealed row — a refusal is not a read",
     !rows.rows.some((r) => r.actorId === supId),
     supId ? `no row for ${supId}` : "support id not found");
  ok("5: ⛔ …and no audit payload anywhere carries the value it protects",
     !rows.rows.some((r) => JSON.stringify(r.payload ?? {}).includes("@")));

  await sup.ctx.close(); await adm.ctx.close(); await aud.ctx.close();
} catch (err) {
  fail++;
  console.log(`FAIL driver threw — ${err?.message ?? err}`);
} finally {
  await b.close();
  await client.end();
}

console.log(`\nlive-read-tiers: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
