/**
 * SSE EDGE PROBE — does the live-price stream survive whatever sits in front of the origin?
 *
 *   npm run qa:sse-edge                                   # www, 45s
 *   LIVE_BASE=https://50pick.tz npm run qa:sse-edge       # the apex
 *   SSE_RESOLVE=104.21.48.11 npm run qa:sse-edge          # force the edge IP (see below)
 *   SSE_WATCH_MS=90000 npm run qa:sse-edge
 *
 * 🔴 WHY THIS EXISTS. `docs/SESSION-PROMPT-INFRA-HARDENING.md` §3 offers
 *
 *     curl -N -s https://www.50pick.tz/api/events --max-time 40
 *
 * as the proof that Cloudflare has not broken the stream. Measured 2026-08-24, that command
 * returns `{"error":"Unauthorized"}` in 13 seconds and exits 0. `/api/events` validates the
 * session before it opens the stream, so an unauthenticated curl returns the SAME 24 bytes
 * whether the edge is proxied, buffering, terminating early, or absent altogether. It cannot
 * fail for the reason it is being run, which makes it worse than no check at all.
 *
 * ⛔ The failure this guards against is SILENT: the page still loads, live prices simply stop
 * moving. So the probe signs in, opens the real stream, and TIMES the bytes.
 *
 * WHAT IT ASSERTS — all four, or the run is RED:
 *   1. the response is 200 `text/event-stream` — not a 401, not an HTML error page
 *   2. at least MIN_BEATS heartbeats arrive (the route sends `:ping` every 15 s)
 *   3. no gap between heartbeats exceeds GAP_LIMIT_MS — a buffering proxy holds bytes and
 *      then releases them together, which reads as one long gap and a cluster
 *   4. the stream is STILL OPEN when the watch window ends — WE end it. If it ends on its
 *      own, something in front of the origin has an idle or response timeout.
 *
 * ⛔ A LOGIN FAILURE IS NOT AN SSE FAILURE. If sign-in produces no session cookie the probe
 * exits 3 with CANNOT CONCLUDE and says so. The QA personas have gone stale twice (2026-08-20
 * among them) and a probe that reported "the stream is broken" because it could not sign in
 * would send someone to revert a perfectly good edge record.
 *
 * ⚠️ `SSE_RESOLVE` EXISTS BECAUSE THE MACHINE YOU RUN THIS ON MAY NOT SEE THE FLIP YET.
 * `docs/LIVE-HOSTING-STATUS.md` already records it for this domain: a stale local or office
 * resolver keeps answering with the OLD address long after the record changed, and
 * `Clear-DnsClientCache` does not help because the cache upstream is the one holding it.
 * Measured 2026-08-24 — minutes after `www` was proxied, 1.1.1.1 returned the Cloudflare
 * anycast addresses while this laptop still returned Railway's 69.46.46.31. Without an
 * override the probe would have measured the DIRECT ORIGIN and reported a confident PASS
 * about a proxy it never touched. It forces the address for the stream request only; the
 * sign-in is a browser hop and any edge issues a valid cookie.
 *
 * Exit codes are distinct on purpose, so a runbook can branch on them:
 *   0 PASS · 1 the stream is broken · 2 the endpoint refused the session · 3 cannot conclude
 */
import { request as httpsRequest } from "node:https";
import { BASE, browser, loginOnce } from "./harness.mjs";

const WATCH_MS = Number(process.env.SSE_WATCH_MS ?? 45_000);
const GAP_LIMIT_MS = Number(process.env.SSE_GAP_LIMIT_MS ?? 25_000);
const WHO = process.env.SSE_WHO ?? "alpha";
const MIN_BEATS = Number(process.env.SSE_MIN_BEATS ?? 2);
const RESOLVE = process.env.SSE_RESOLVE ?? "";

const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(6, " ")}s`;
const say = (m) => console.log(`  ${at()}  ${m}`);

function die(code, headline, detail) {
  console.log("");
  console.log(`  ${code === 0 ? "PASS" : "FAIL"} — ${headline}`);
  if (detail) console.log(`  ${detail}`);
  process.exit(code);
}

/** The cookie header for BASE's origin, out of a Playwright storage state. */
function cookieHeader(state, base) {
  const host = new URL(base).hostname;
  const mine = state.cookies.filter((c) => {
    const d = c.domain.replace(/^\./, "");
    return host === d || host.endsWith(`.${d}`);
  });
  return mine.map((c) => `${c.name}=${c.value}`).join("; ");
}

console.log("");
console.log("  SSE EDGE PROBE");
console.log(
  `  base ${BASE} · persona ${WHO} · watching ${WATCH_MS / 1000}s · gap limit ${GAP_LIMIT_MS / 1000}s` +
    (RESOLVE ? ` · forced to ${RESOLVE}` : ""),
);
console.log("");

// ── 1 · a real session ────────────────────────────────────────────────────────
let cookie = "";
{
  const { b } = await browser();
  try {
    const state = await loginOnce(b, WHO);
    cookie = cookieHeader(state, BASE);
  } catch (e) {
    await b.close();
    die(
      3,
      `CANNOT CONCLUDE — sign-in as "${WHO}" failed, so the stream was never opened.`,
      `${e?.message ?? e}\n  This says nothing about the edge. Fix the persona first — docs/AGENT-ACCESS.md.`,
    );
  }
  await b.close();
}
if (!cookie) {
  die(3, `CANNOT CONCLUDE — sign-in as "${WHO}" returned no cookie for ${new URL(BASE).hostname}.`);
}
say(`signed in as ${WHO} · ${cookie.split(";").length} cookie(s) for ${new URL(BASE).hostname}`);

// ── 2 · open the real stream ──────────────────────────────────────────────────
// `node:https` rather than fetch(), for the `lookup` hook — see SSE_RESOLVE above. The URL
// keeps the real hostname, so SNI, the Host header and certificate validation are all
// unchanged; only the address the socket dials is forced.
const url = new URL("/api/events", BASE);
const res = await new Promise((resolve, reject) => {
  const req = httpsRequest(
    url,
    {
      method: "GET",
      headers: { cookie, accept: "text/event-stream", "cache-control": "no-cache" },
      // ⚠️ `lookup` is called with `{all:true}` by the agent, and then it wants an ARRAY of
      // {address,family} — handing it the (address, family) pair in that case fails with
      // "Invalid IP address: undefined", which reads like a bad SSE_RESOLVE and is not one.
      ...(RESOLVE
        ? {
            lookup: (_h, opts, cb) => {
              const family = RESOLVE.includes(":") ? 6 : 4;
              return opts?.all ? cb(null, [{ address: RESOLVE, family }]) : cb(null, RESOLVE, family);
            },
          }
        : {}),
    },
    resolve,
  );
  req.on("error", reject);
  req.end();
  // Hand the request object out so the watch timer can end the stream from our side.
  globalThis.__sseReq = req;
}).catch((e) => {
  die(1, `the request to ${url.href} never returned a response.`, String(e?.message ?? e));
});

// ⛔ EVERY GAP IS MEASURED FROM HERE, NOT FROM PROCESS START. The first cut of this probe
// took `beats[0]` as the first gap, so it charged the 13s sign-in and the walk to the origin
// against a 25s heartbeat limit and reported "the shape of a BUFFERING proxy" over a stream
// whose beats were 15.0s apart to the tenth. A guard that goes red on healthy behaviour gets
// switched off, and then it is not a guard.
const connectAt = Date.now() - t0;

const ctype = res.headers["content-type"] ?? "(none)";
const cfRay = res.headers["cf-ray"] ?? null;
const server = res.headers["server"] ?? "(none)";
say(`HTTP ${res.statusCode} · content-type ${ctype}`);
say(`edge: server=${server} · cf-ray=${cfRay ?? "ABSENT — the origin is NOT proxied"}`);

if (res.statusCode === 401 || res.statusCode === 403) {
  die(
    2,
    `the endpoint refused the session (HTTP ${res.statusCode}).`,
    `The cookie reached it and was rejected — a stale persona, not a broken edge.`,
  );
}
if (res.statusCode !== 200) die(1, `expected HTTP 200, got ${res.statusCode}.`);
if (!String(ctype).includes("text/event-stream")) {
  die(1, `the response is not a stream — content-type ${ctype}.`);
}

// ── 3 · time the bytes ────────────────────────────────────────────────────────
const beats = [];
const events = [];
let bytes = 0;
let weEndedIt = false;

const closedItself = await new Promise((resolve) => {
  const stop = setTimeout(() => {
    weEndedIt = true;
    res.destroy();
    globalThis.__sseReq?.destroy();
    resolve(false);
  }, WATCH_MS);

  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    bytes += Buffer.byteLength(chunk);
    for (const line of chunk.split("\n")) {
      if (line.startsWith(":ping")) {
        beats.push(Date.now() - t0);
        say(`heartbeat #${beats.length}`);
      } else if (line.startsWith("data: ")) {
        events.push(Date.now() - t0);
        say(`event ${line.slice(6, 90)}`);
      }
    }
  });
  const ended = () => {
    if (weEndedIt) return;
    clearTimeout(stop);
    resolve(true);
  };
  res.on("end", ended);
  res.on("close", ended);
  res.on("error", ended);
});

// ── 4 · the verdict ───────────────────────────────────────────────────────────
const gaps = beats.map((b, i) => (i === 0 ? b - connectAt : b - beats[i - 1]));
const worst = gaps.length ? Math.max(...gaps) : Infinity;
const openFor = (Date.now() - t0 - connectAt) / 1000;

console.log("");
console.log(`  connected  ${(connectAt / 1000).toFixed(1)}s after start — every gap below is measured from there`);
console.log(`  heartbeats ${beats.length} at [${beats.map((b) => ((b - connectAt) / 1000).toFixed(1)).join("s, ")}s]`);
console.log(`  events     ${events.length} · bytes ${bytes} · worst gap ${(worst / 1000).toFixed(1)}s`);
console.log(`  cf-ray     ${cfRay ?? "ABSENT"}`);

if (closedItself) {
  die(
    1,
    `the stream CLOSED ON ITS OWN ${openFor.toFixed(1)}s after it opened.`,
    `Something in front of the origin terminates a long-lived response. Live prices stop moving and\n  the page gives no sign of it. Revert that record to DNS-only.`,
  );
}
if (beats.length < MIN_BEATS) {
  die(
    1,
    `only ${beats.length} heartbeat(s) in ${WATCH_MS / 1000}s — expected at least ${MIN_BEATS}.`,
    `The route sends one every 15s. Too few means the bytes are being HELD, not that they were not sent.`,
  );
}
if (worst > GAP_LIMIT_MS) {
  die(
    1,
    `a ${(worst / 1000).toFixed(1)}s gap between heartbeats (limit ${GAP_LIMIT_MS / 1000}s).`,
    `That is the shape of a BUFFERING proxy: it holds bytes, then releases them together.`,
  );
}

die(
  0,
  `the stream stayed open ${openFor.toFixed(0)}s with ${beats.length} heartbeat(s), worst gap ${(worst / 1000).toFixed(1)}s.`,
  cfRay
    ? `Served through Cloudflare (cf-ray ${cfRay}) — the proxy is not breaking SSE.`
    : `⚠️ cf-ray ABSENT — this measured the DIRECT origin. It is a BEFORE reading, not proof about the proxy.`,
);
