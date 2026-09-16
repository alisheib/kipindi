/**
 * test:blackball — the Blackball transport, driven against a stubbed gateway.
 *
 * 🔴 THE DEFECT THIS GUARDS, AND IT IS NOT HYPOTHETICAL. Every other HTTP client in
 * this repo may read `res.ok` as the verdict, because every other vendor answers a
 * refusal with a 4xx that MEANS refusal. Blackball does not: it answers
 * `{"status":false,"message":"Invalid credentials"}` with **HTTP 400**, the same
 * status it uses for "your sender ID is one character too long". Measured against
 * the live endpoint 2026-09-16. An adapter written the house way — `if (!res.ok)
 * throw` — therefore turns every distinguishable failure into one opaque network
 * error, and the operator reading the log learns nothing about which of the two
 * happened. §3 is the assertion that cannot pass if that shape comes back.
 *
 * ⭐ THE PARSER IS THE SUBJECT, SO THE PARSER IS DRIVEN DIRECTLY. `parseBlackballBody`
 * is exported and called with real captured bodies in §4-§6. A suite that could only
 * reach those paths through `fetch` would be asserting against its own stub.
 *
 * ⛔ EVERY REFUSAL HAS A CONTROL. §0 proves the stub is actually reached and the
 * happy path actually passes, so a suite that silently stopped exercising the
 * adapter goes red rather than green.
 *
 * Run: npm run test:blackball
 */
import {
  BATCH_MAX,
  REFERENCE_MIN_CHARS,
  SENDER_ID_MAX_CHARS,
  blackballConfigured,
  blackballEnv,
  blackballSend,
  describeBlackball,
  parseBlackballBody,
  senderIdProblem,
  type BlackballEnv,
} from "../src/lib/server/sms-blackball.ts";

let pass = 0,
  fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const REF = () => "sms_" + "a".repeat(REFERENCE_MIN_CHARS + 4);
const ENV: BlackballEnv = {
  clientId: "cid",
  clientSecret: "csec",
  senderId: "50PICK",
  endpoint: "https://gateway.example/api/sms/send",
  timeoutMs: 500,
};

type Captured = { url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> };

/** Capture the outbound request and answer with a canned reply. `card-deposit.test.mts:58` shape. */
function stubFetch(respond: (call: number) => { status: number; body: string }): {
  calls: Captured[];
  restore: () => void;
} {
  const calls: Captured[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>)),
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
    });
    const r = respond(calls.length);
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = real; } };
}

const OK_BODY = JSON.stringify({ status: true, message: "Queued", data: null, balance: 250.0 });

// ── §0 · CONTROLS — the stub is reached and the happy path is genuinely happy ──
{
  const s = stubFetch(() => ({ status: 200, body: OK_BODY }));
  const out = await blackballSend(ENV, [{ msisdn: "+255772619619", text: "hi", reference: REF() }]);
  s.restore();
  ok("§0 control: the stub was actually called", s.calls.length === 1, `calls=${s.calls.length}`);
  ok("§0 control: a status:true reply reads as OK", out.ok === true);
  ok("§0 control: the balance is read off the reply", out.balance === 250);
}

// ── §1 · THE REQUEST ON THE WIRE ──────────────────────────────────────────────
{
  const s = stubFetch(() => ({ status: 200, body: OK_BODY }));
  const ref = REF();
  await blackballSend(ENV, [{ msisdn: "+255772619619", text: "Msimbo 50pick: 123456", reference: ref }]);
  s.restore();
  const c = s.calls[0];
  const msgs = c.body.messages as Record<string, unknown>[];

  ok("§1 POST to the configured endpoint", c.method === "POST" && c.url === ENV.endpoint);
  ok("§1 Content-Type is application/json", c.headers["Content-Type"] === "application/json");
  ok(
    "§1 auth travels in the BODY, not a header",
    JSON.stringify(c.body.auth) === JSON.stringify({ clientId: "cid", clientSecret: "csec" }) &&
      !Object.keys(c.headers).some((h) => /^authorization$/i.test(h)),
  );
  ok(
    "§1 exactly the four documented message fields, no extras",
    JSON.stringify(Object.keys(msgs[0]).sort()) === JSON.stringify(["msisdn", "reference", "source", "text"]),
    Object.keys(msgs[0]).join(","),
  );
  ok("§1 the sender id is sent as `source`", msgs[0].source === "50PICK");

  // 🔴 THE FORMAT THE TWO RAILS DISAGREED ON. `sms.ts` used to post the stored
  // `+255…` straight through while the payments rail normalised. The gateway does
  // not validate msisdn at all, so nothing downstream would have complained.
  ok("§1 E.164 +255… is normalised to a bare 255…", msgs[0].msisdn === "255772619619", String(msgs[0].msisdn));
}
{
  const s = stubFetch(() => ({ status: 200, body: OK_BODY }));
  for (const raw of ["0772619619", "255772619619", "+255 772 619 619", "772619619"]) {
    await blackballSend(ENV, [{ msisdn: raw, text: "x", reference: REF() }]);
  }
  s.restore();
  const got = s.calls.map((c) => (c.body.messages as Record<string, unknown>[])[0].msisdn);
  ok(
    "§1 every accepted input shape lands on the same 12-digit msisdn",
    got.every((m) => m === "255772619619"),
    got.join(" "),
  );
}

// ── §2 · THE LOCAL GUARDS — conditions a retry could never clear ──────────────
{
  const s = stubFetch(() => ({ status: 200, body: OK_BODY }));
  let threw = "";
  try {
    await blackballSend(ENV, [{ msisdn: "+255772619619", text: "x", reference: "sms_tooshort" }]);
  } catch (e) {
    threw = String((e as Error).message);
  }
  ok(
    "§2 a reference under the 20-char floor is refused BEFORE the network call",
    /floor/.test(threw) && s.calls.length === 0,
    `threw="${threw}" calls=${s.calls.length}`,
  );

  // ⛔ THE SIZE IS A LITERAL, NOT `BATCH_MAX + 1`. Deriving the test batch from the
  // constant under test makes both sides move together: raise BATCH_MAX to 100 and a
  // derived test happily sends 101 and still sees a refusal, so the vendor's real
  // ceiling stops being guarded. `red:blackball` caught exactly that as NOT CAUGHT.
  // 50 is Blackball's documented maximum; it is pinned here as a fact about them.
  ok("§2 the batch ceiling is the vendor's documented 50", BATCH_MAX === 50, String(BATCH_MAX));
  threw = "";
  const over = Array.from({ length: 51 }, () => ({ msisdn: "255772619619", text: "x", reference: REF() }));
  try {
    await blackballSend(ENV, over);
  } catch (e) {
    threw = String((e as Error).message);
  }
  ok(
    "§2 a batch of 51 is refused before the network call",
    /ceiling/.test(threw) && s.calls.length === 0,
    `threw="${threw}"`,
  );

  threw = "";
  try {
    await blackballSend(ENV, []);
  } catch (e) {
    threw = String((e as Error).message);
  }
  ok("§2 an empty batch is refused", /empty/.test(threw));
  s.restore();
}

// ── §3 · 🔴 THE NAMED DEFECT: HTTP 400 IS NOT THE VERDICT ─────────────────────
{
  // Captured verbatim from the live gateway, 2026-09-16.
  const AUTH_FAIL = JSON.stringify({ status: false, message: "Invalid credentials", data: null, balance: 0.0 });
  const s = stubFetch(() => ({ status: 400, body: AUTH_FAIL }));
  // ⛔ THE THROW MUST BE OBSERVED, NOT ASSUMED. This block read `ok(label, true)` —
  // "reaching here is the assertion" — which is a HARDCODED PASS: when the adapter
  // throws, the rejection unwinds the whole script and the line never executes, so
  // the assertion could not print FAIL for the one defect it names. `red:blackball`
  // reported it as WRONG REASON / "(no FAIL lines)". Catching it is what makes the
  // claim measurable.
  let threw: string | null = null;
  let out: Awaited<ReturnType<typeof blackballSend>> | null = null;
  try {
    out = await blackballSend(ENV, [{ msisdn: "255772619619", text: "x", reference: REF() }]);
  } catch (e) {
    threw = String((e as Error)?.message ?? e);
  }
  s.restore();

  ok("§3 an HTTP 400 auth refusal does NOT throw", threw === null, threw ?? "");
  ok("§3 …and reads as a FAILURE", out?.ok === false);
  ok("§3 …carrying the gateway's own words, not 'HTTP 400'", out?.message === "Invalid credentials", out?.message ?? "(threw)");
  ok(
    "§3 …and the log line names the cause",
    !!out && /Invalid credentials/.test(describeBlackball(out)) && /status=false/.test(describeBlackball(out)),
    out ? describeBlackball(out) : "(threw)",
  );

  // The other half of the trap: a 200 that says status:false is ALSO a failure.
  const s2 = stubFetch(() => ({ status: 200, body: JSON.stringify({ status: false, message: "Rejected", balance: 5 }) }));
  const out2 = await blackballSend(ENV, [{ msisdn: "255772619619", text: "x", reference: REF() }]);
  s2.restore();
  ok("§3 a 200 carrying status:false is a FAILURE too", out2.ok === false && out2.balance === 5);
}

// ── §4 · `data` IN ALL THREE MEASURED SHAPES ──────────────────────────────────
{
  // Array — the commonest failure the gateway produces. Captured live.
  const arr = parseBlackballBody(
    JSON.stringify({
      status: false,
      message: "Validation errors",
      data: [{ source: " may only be 12 characters long" }, { reference: " must be at least 20 characters long" }],
      balance: 0.0,
    }),
    400,
  );
  ok(
    "§4 data as an ARRAY flattens to per-field complaints",
    arr.fieldErrors.source === "may only be 12 characters long" &&
      arr.fieldErrors.reference === "must be at least 20 characters long",
    JSON.stringify(arr.fieldErrors),
  );

  // Object — the shape the PDF claims. Must not crash, must read the same.
  const obj = parseBlackballBody(JSON.stringify({ status: false, message: "v", data: { text: " is required" } }), 400);
  ok("§4 data as an OBJECT reads the same way", obj.fieldErrors.text === "is required");

  // Null — the auth-failure shape.
  const nul = parseBlackballBody(JSON.stringify({ status: false, message: "Invalid credentials", data: null }), 400);
  ok("§4 data as NULL yields no field errors and does not throw", Object.keys(nul.fieldErrors).length === 0);
}

// ── §5 · A REPLY THAT IS NOT JSON ─────────────────────────────────────────────
{
  const html = parseBlackballBody("<html><body>502 Bad Gateway</body></html>", 502);
  ok(
    "§5 an HTML error page is a failure with its shape preserved, not a throw",
    html.ok === false && /unparseable body \(\d+ bytes\)/.test(html.message),
    html.message,
  );
  ok("§5 …and the body itself never reaches the summary line", !/html/i.test(describeBlackball(html)));
  const empty = parseBlackballBody("", 502);
  ok("§5 an empty body is a failure", empty.ok === false && empty.message === "empty body");
}

// ── §6 · BALANCE IS READ ON FAILURE TOO ───────────────────────────────────────
{
  // ⭐ This is the one that matters for the cost floor: the gateway reports credit
  // on a REFUSED send as well, so a rail that only reads it on success goes blind
  // exactly when the float is running out.
  const r = parseBlackballBody(JSON.stringify({ status: false, message: "Validation errors", data: [], balance: 117.5 }), 400);
  ok("§6 balance is read off a FAILED reply", r.balance === 117.5);
  const absent = parseBlackballBody(JSON.stringify({ status: true, message: "ok" }), 200);
  ok("§6 an absent balance is null, never 0", absent.balance === null);
  const bad = parseBlackballBody(JSON.stringify({ status: true, balance: "250" }), 200);
  ok("§6 a non-numeric balance is null, never NaN", bad.balance === null);
}

// ── §7 · TRANSPORT FAILURE IS AMBIGUOUS, NOT A REFUSAL ────────────────────────
{
  const real = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const out = await blackballSend(ENV, [{ msisdn: "255772619619", text: "x", reference: REF() }]);
  globalThis.fetch = real;
  ok("§7 a transport error does not throw out of the adapter", out.ok === false);
  ok("§7 …and is distinguishable from a gateway refusal", out.transport === "network down" && out.httpStatus === 0);
  ok("§7 …and says so in the log line", /transport=network down/.test(describeBlackball(out)));
}
{
  // ⛔ A HANG TEST THAT CAN ITSELF HANG PROVES NOTHING. The stub answers only the abort
  // signal, so with the signal removed this promise never settles — the suite stopped
  // dead and the assertion never ran, which `red:blackball` reported as "(no FAIL
  // lines)". The escape hatch below settles it regardless, well after the timeout
  // under test, so the assertion ALWAYS evaluates and a missing abort shows up as a
  // slow settle rather than as silence.
  const ESCAPE_MS = 3_000;
  const real = globalThis.fetch;
  globalThis.fetch = (async (_i: unknown, init?: RequestInit) =>
    new Promise((_res, rej) => {
      // ⛔ THE ESCAPE TIMER IS NOT `.unref()`ed, AND THAT IS THE WHOLE POINT. An unref'd
      // timer lets Node decide the event loop is empty and exit — with the top-level
      // await still unsettled — so the process died silently at exit code 13 and the
      // assertion below never ran. `red:blackball` reported it as "(no FAIL lines)"
      // twice. Holding the loop open is what guarantees the verdict gets printed.
      const escape = setTimeout(() => rej(new Error("escape hatch — no abort arrived")), ESCAPE_MS);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(escape);
        rej(new Error("The operation was aborted"));
      });
    })) as unknown as typeof fetch;
  const started = Date.now();
  const out = await blackballSend({ ...ENV, timeoutMs: 120 }, [{ msisdn: "255772619619", text: "x", reference: REF() }]);
  const elapsed = Date.now() - started;
  globalThis.fetch = real;
  ok(
    "§7 a hung gateway aborts at the timeout rather than never",
    out.ok === false && out.transport !== null && elapsed < 1_000,
    `elapsed=${elapsed}ms transport=${out.transport}`,
  );
}

// ── §8 · THE SENDER-ID CAP, CAUGHT AT BOOT AND NOT AT SEND ────────────────────
{
  ok("§8 a sender id within the cap is fine", senderIdProblem("50PICK") === null);
  ok(`§8 exactly ${SENDER_ID_MAX_CHARS} characters is allowed`, senderIdProblem("A".repeat(SENDER_ID_MAX_CHARS)) === null);
  ok(
    `§8 ${SENDER_ID_MAX_CHARS + 1} characters is refused, and the message says why`,
    /EVERY send would fail/.test(senderIdProblem("A".repeat(SENDER_ID_MAX_CHARS + 1)) ?? ""),
  );
  ok("§8 an unset sender id is refused", senderIdProblem(undefined) === "not set");
  ok("§8 whitespace is not a sender id", senderIdProblem("   ") === "not set");
}

// ── §9 · THE ENV READER — and the env it must NOT read ────────────────────────
{
  const saved = { ...process.env };
  const clear = () => {
    for (const k of ["BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET", "BLACKBALL_API_URL", "SMS_API_KEY", "SMS_SENDER_ID"])
      delete process.env[k];
  };

  clear();
  ok("§9 no credentials → not configured", blackballConfigured() === false && blackballEnv() === null);

  // 🔴 THE REGRESSION THIS PINS. `smsConfigured()` used to read `!!SMS_API_KEY`.
  // A real Blackball deployment sets neither that env nor anything like it, so the
  // old body reported a fully-working rail as dead — and `invite-service.ts`
  // answers "dead" by silently leaving every phone invite QUEUED.
  clear();
  process.env.SMS_API_KEY = "a-legacy-selcom-key";
  ok("§9 ⛔ SMS_API_KEY alone does NOT configure this rail", blackballConfigured() === false);

  clear();
  process.env.BLACKBALL_CLIENT_ID = "id";
  ok("§9 a client id without a secret is not configured", blackballConfigured() === false);

  clear();
  process.env.BLACKBALL_CLIENT_ID = "  ";
  process.env.BLACKBALL_CLIENT_SECRET = "s";
  ok("§9 whitespace is not a credential", blackballConfigured() === false);

  clear();
  process.env.BLACKBALL_CLIENT_ID = "id";
  process.env.BLACKBALL_CLIENT_SECRET = "secret";
  ok("§9 ⭐ both Blackball credentials and NO SMS_API_KEY → CONFIGURED", blackballConfigured() === true);
  ok("§9 the endpoint defaults to the live gateway", blackballEnv()?.endpoint === "https://blackballgw.co.tz/api/sms/send");

  process.env.BLACKBALL_API_URL = "https://override.example/send";
  ok("§9 BLACKBALL_API_URL overrides it", blackballEnv()?.endpoint === "https://override.example/send");

  process.env = saved;
}

// ── §10 · SOURCE-LEVEL: NOTHING HERE CAN PRINT A BODY OR A NUMBER ─────────────
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/lib/server/sms-blackball.ts", import.meta.url), "utf8");
  const consoleCalls = src.match(/console\.[a-z]+\([^)]*\)/g) ?? [];
  ok(
    "§10 the transport contains no console.* call at all",
    consoleCalls.length === 0,
    consoleCalls.join(" | ").slice(0, 200),
  );
  // Control for §10: prove the reader actually read the file it names.
  ok("§10 control: the source was actually loaded", /export async function blackballSend/.test(src));
}

console.log(`\nblackball-adapter: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
