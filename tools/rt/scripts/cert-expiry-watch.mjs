/**
 * `npm run qa:cert-expiry` — E-227 · THE ORIGIN-CERTIFICATE WATCH THAT ACTUALLY RUNS.
 *
 *   node scripts/cert-expiry-watch.mjs
 *   CERT_MIN_DAYS=60 node scripts/cert-expiry-watch.mjs      # drive it RED
 *   CERT_ORIGIN_HOST=www.50pick.tz node ...                  # drive the CONTROL red
 *
 * ── ⛔ WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────
 * FOUR tracked documents called `qa:live` §[F] "a gate and not a reminder". **It had never
 * executed once, and it could not have.** `predeploy` invokes `qa:live` with no `BASE`; `BASE`
 * defaults to `http://localhost:3009`; `LOCAL` is therefore true; and the whole certificate block
 * sits inside `if (!LOCAL)`. `qa:live` appears nowhere in `.github/`. Apply the house test —
 * *would this pass with an expired certificate?* **Yes, silently, every time.**
 *   · `docs/NEXT-PLAN.md:314-315` · `docs/SESSION-PROMPT-INFRA-HARDENING.md:44`
 *   · `docs/LIVE-HOSTING-STATUS.md:92,96` · `docs/SESSION-PROMPT-CLOSE-THE-BOARD.md:344-347`
 *
 * ⚠️ AND THE ONE DOCUMENTED PROD INVOCATION FAILED IT EVERY TIME. `CLAUDE.md:746` says to run
 * `BASE=https://kipindi-production.up.railway.app npm run qa:live` — a hostname that is not a key
 * in `ORIGIN_OF`, so `origin` came back undefined and §[F] failed on "no known origin", never on
 * the certificate. A check nobody could run correctly, in a file four documents cited as proof.
 *
 * ── WHAT IT CHECKS, AND WHY THE ORIGIN AND NOT THE EDGE ───────────────────────────────────
 * `www.50pick.tz` sits behind Cloudflare at `Full (strict)`. Reading the certificate at the
 * public hostname reads CLOUDFLARE's, which renews itself and can never be the outage. The one
 * that can silently fail is Railway's ORIGIN certificate, reachable only by dialling Railway's
 * domain target with the public hostname as SNI. That is what this does.
 *
 * ── ⭐ FOUR PROPERTIES THAT MAKE THIS A GATE RATHER THAN A REMINDER ────────────────────────
 * 1. IT ITERATES EVERY HOST. §[F] selected ONE origin by `new URL(BASE).hostname`, so a single
 *    run could structurally never cover both `www` and the apex, whatever it was pointed at.
 * 2. IT ASSERTS ITS OWN POPULATION. Fail if fewer than two hosts were checked, and PRINT the
 *    list. Otherwise deleting an entry from `ORIGIN_OF` silently reduces coverage toward zero
 *    while the script stays green — the "guard whose population is blind" shape, which is the
 *    same class of defect as the one that produced this finding.
 * 3. THE THRESHOLD IS A KNOB. §[F] hard-coded `daysLeft > 21`, so its own prescribed RED proof
 *    ("raise the threshold past the real value") required EDITING THE FILE. `CERT_MIN_DAYS`
 *    makes it provable red from the outside, which is the difference between a guard that has
 *    been proven and a guard that has been described. The shipped default is still 21.
 * 4. AN UNREADABLE CERTIFICATE IS A FAILURE, NEVER A SKIP. "Could not check" is not "fine".
 *
 * ⛔ NAMED `qa:` AND NOT `test:` ON PURPOSE. `scripts/test-all.mjs` enumerates every `test:*` in
 * package.json STRUCTURALLY, and `.github/workflows/ci.yml` runs that aggregator on every push to
 * main and every pull request. A `test:` prefix would therefore put a live TLS call to two Railway
 * hosts into every merge — making CI flaky on network reachability and blocking unrelated PRs on a
 * 21-day certificate condition. `qa:*` is not enumerated, which is why every other live/browser
 * script lives there.
 */
const MIN_DAYS = Number(process.env.CERT_MIN_DAYS ?? 21);

// ⚠️ Railway re-issues these targets whenever a custom domain is removed and re-added (it did on
// 2026-07-18). They are NOT discoverable from public DNS once a name is proxied — Cloudflare
// flattens it to its own anycast addresses — so they have to be written down. If this starts
// failing to CONNECT, re-read them from `railway domain status` before assuming a certificate
// problem. Lifted verbatim from `scripts/pre-deploy-live-check.mjs`.
const ORIGIN_OF = {
  "www.50pick.tz": "3hwa21jh.up.railway.app",
  "50pick.tz": "ggze9tup.up.railway.app",
};

let pass = 0;
const failures = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

async function readOriginCert(host, origin) {
  const { connect } = await import("node:tls");
  return new Promise((resolve, reject) => {
    const s = connect({ host: origin, port: 443, servername: host, timeout: 15_000 }, () => {
      const c = s.getPeerCertificate(); s.end(); resolve(c);
    });
    s.on("error", reject);
    s.on("timeout", () => { s.destroy(); reject(new Error("TLS timeout")); });
  });
}

console.log(`\ncert-expiry-watch — ORIGIN certificates behind the proxy · threshold ${MIN_DAYS} days`);
if (process.env.CERT_MIN_DAYS) console.log(`  ⚠️ CERT_MIN_DAYS override in effect (${MIN_DAYS}) — the shipped default is 21`);
if (process.env.CERT_ORIGIN_HOST) console.log(`  ⚠️ CERT_ORIGIN_HOST override in effect (${process.env.CERT_ORIGIN_HOST}) — every host will be dialled at that name`);
console.log("");

const hosts = Object.entries(ORIGIN_OF);
let checked = 0;

for (const [host, mapped] of hosts) {
  // The override dials a DIFFERENT target while keeping `host` as SNI — that is how the positive
  // control is driven red: point it at the PROXIED name and Cloudflare answers instead of Railway.
  const origin = process.env.CERT_ORIGIN_HOST || mapped;
  console.log(`── ${host}  →  ${origin}`);
  try {
    const cert = await readOriginCert(host, origin);
    if (!cert || !cert.valid_to) {
      ok(`${host} · a certificate was returned at ${origin}`, false, "empty peer certificate");
      continue;
    }
    const issuer = cert.issuer?.O ?? "?";
    const daysLeft = Math.floor((new Date(cert.valid_to) - Date.now()) / 86_400_000);

    // ⛔ THE POSITIVE CONTROL, IN THE SAME RUN. If this ever reads Cloudflare's certificate
    // again, the subject stops being the hostname and the whole check has silently changed
    // meaning — it would then be watching a certificate that renews itself.
    ok(`${host} · [control] ${origin} serves the ORIGIN cert, not the edge's (CN=${cert.subject?.CN}, ${issuer})`,
       cert.subject?.CN === host && !/cloudflare|google/i.test(issuer),
       "this is the edge certificate, not Railway's — the expiry below would be meaningless");

    ok(`${host} · ORIGIN certificate has more than ${MIN_DAYS} days left (${daysLeft}d, expires ${cert.valid_to})`,
       daysLeft > MIN_DAYS,
       daysLeft > 0
         ? "RENEWAL IS OVERDUE OR CLOSE. Under Cloudflare Full (strict) an expired ORIGIN cert takes the whole site down with no deploy to blame."
         : "EXPIRED — the site is down or about to be.");
    checked++;
  } catch (e) {
    // ⛔ Never pass on an unreadable certificate.
    ok(`${host} · ORIGIN certificate is readable at ${origin}`, false, String(e?.message ?? e));
  }
  console.log("");
}

// ⭐ THE POPULATION ASSERTION. Without this, emptying ORIGIN_OF makes the script exit 0 having
// checked nothing at all — green, fast, and worthless. This is the check that fails when the
// feature is ABSENT rather than when it is broken.
console.log("── population");
ok(`both origin hosts were checked (${checked} of ${hosts.length}: ${hosts.map(([h]) => h).join(", ")})`,
   checked >= 2 && checked === hosts.length,
   `only ${checked} host(s) produced a readable certificate — coverage is not what the file claims`);

console.log(`\n${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log("\nFAILED:\n" + failures.map((f) => "  - " + f).join("\n")); process.exit(1); }
