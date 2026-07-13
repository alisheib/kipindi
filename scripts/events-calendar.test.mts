/**
 * F8 — event calendar + the two defects it exposed.
 *
 * THE CORE GUARANTEE: the AI must never be able to invent a real-world fixture.
 * The calendar is operator-authored and every event's source must clear the SAME
 * trusted-domain allowlist that gates market publish.
 *
 * Also locks the two live defects fixed in this batch:
 *  (1) the AI-poll → market publish path did NOT enforce the source allowlist
 *      (isSourceTrusted was imported and never called), so a hallucinated domain —
 *      and a DISABLED category — could reach a live market;
 *  (2) the AI credit meter was alert-only: nothing refused a call when the budget
 *      was exhausted. `assertAiBudget` now blocks BEFORE spending.
 *
 * Run: npx tsx scripts/events-calendar.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { addEvent, listUpcomingEvents, listPendingEvents, markEventGenerated, removeEvent, eventSteer, getEvent } from "../src/lib/server/events-service.ts";
import { seedDefaultSources, isSourceTrusted, setCategoryEnabled, addSource } from "../src/lib/server/source-registry.ts";
import { assertAiBudget, setCreditLimit, resetCreditCycle, recordAiUsage, getCreditConfig } from "../src/lib/server/ai-usage.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const future = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const OFFICER = "officer_f8";

await seedDefaultSources();

// ── 1. A trusted, real, future event is accepted ──────────────────────────
{
  // tff.or.tz is a seeded trusted source for `sports`.
  const r = await addEvent({
    title: "Simba SC vs Yanga — Kariakoo Derby",
    category: "sports",
    startsAt: future(72),
    sourceUrl: "https://tff.or.tz/fixtures/derby",
    note: "Result market, not scoreline",
  }, OFFICER);
  ok("trusted-source event accepted", r.ok, r.ok ? "" : r.error);
  if (r.ok) {
    ok("event stored with the operator's title", r.event.title.includes("Kariakoo"));
    ok("not yet generated", r.event.generatedAt === null);
  }
}

// ── 2. THE ANTI-FABRICATION GATE: an unvetted / hallucinated domain is refused
{
  const r = await addEvent({
    title: "Totally Real Fixture",
    category: "sports",
    startsAt: future(48),
    sourceUrl: "https://totally-real-fixtures.example.com/match/1", // plausible, not vetted
  }, OFFICER);
  ok("UNVETTED source domain is REFUSED", !r.ok && r.code === "UNTRUSTED_SOURCE", !r.ok ? r.error : "accepted!");
}

// ── 3. Past events and junk are refused ──────────────────────────────────
{
  const past = await addEvent({ title: "Yesterday's match", category: "sports", startsAt: new Date(Date.now() - 3600_000).toISOString(), sourceUrl: "https://tff.or.tz/x" }, OFFICER);
  ok("a PAST event is refused (can't bet on the settled past)", !past.ok && past.code === "INVALID");
  const short = await addEvent({ title: "ab", category: "sports", startsAt: future(24), sourceUrl: "https://tff.or.tz/x" }, OFFICER);
  ok("too-short title refused", !short.ok);
  const badDate = await addEvent({ title: "Valid title here", category: "sports", startsAt: "not-a-date", sourceUrl: "https://tff.or.tz/x" }, OFFICER);
  ok("invalid date refused", !badDate.ok);
}

// ── 4. A DISABLED category cannot sneak back in via the calendar ─────────
{
  await setCategoryEnabled("crypto", false, OFFICER);
  await addSource({ domain: "coingecko.com", label: "CoinGecko", category: "crypto", rationale: "price" }, OFFICER).catch(() => {});
  const r = await addEvent({
    title: "Bitcoin halving watch",
    category: "crypto",
    startsAt: future(96),
    sourceUrl: "https://coingecko.com/en/coins/bitcoin",
  }, OFFICER);
  ok("event in a DISABLED category is refused", !r.ok && r.code === "UNTRUSTED_SOURCE", !r.ok ? r.error : "accepted!");
  await setCategoryEnabled("crypto", true, OFFICER); // restore
}

// ── 5. Steering hands the model GROUND TRUTH, never a blank slate ─────────
{
  const list = await listUpcomingEvents();
  const derby = list.find((e) => e.title.includes("Kariakoo"))!;
  const steer = eventSteer(derby);
  ok("steer names the exact event", steer.includes("Kariakoo"));
  ok("steer pins the exact date", steer.includes(new Date(derby.startsAt).toISOString()));
  ok("steer carries the official source", steer.includes(derby.sourceUrl));
  ok("steer forbids substituting a fixture", /do not substitute a different fixture/i.test(steer));
  ok("steer forbids changing the date", /do not change its date/i.test(steer));
}

// ── 6. Queue mechanics: pending → generated (no duplicate drafts) ─────────
{
  const pendingBefore = await listPendingEvents();
  ok("derby is in the pending queue", pendingBefore.some((e) => e.title.includes("Kariakoo")));
  const derby = pendingBefore.find((e) => e.title.includes("Kariakoo"))!;

  await markEventGenerated(derby.id, "aipoll_test123", OFFICER);
  const after = await getEvent(derby.id);
  ok("event stamped as generated", !!after?.generatedAt);
  ok("event remembers its poll", after?.aiPollId === "aipoll_test123");

  const pendingAfter = await listPendingEvents();
  ok("generated event leaves the pending queue (no duplicate drafts)", !pendingAfter.some((e) => e.id === derby.id));

  await removeEvent(derby.id, OFFICER);
  ok("removed event is gone", (await getEvent(derby.id)) === null);
}

// ── 7. DEFECT 1 — the source allowlist that the AI publish path was skipping
// isSourceTrusted is the exact gate publishPollAction now calls. Prove it would
// have rejected a hallucinated domain and a disabled category.
{
  const halluc = await isSourceTrusted("https://tff-official-fixtures.example.org/x", "sports");
  ok("[defect-1] hallucinated sports domain is NOT trusted", !halluc.ok);
  const real = await isSourceTrusted("https://tff.or.tz/fixtures/1", "sports");
  ok("[defect-1] the real registry domain IS trusted", real.ok);
  await setCategoryEnabled("weather", false, OFFICER);
  const disabled = await isSourceTrusted("https://meteo.go.tz/forecast", "weather");
  ok("[defect-1] a DISABLED category is refused even with a good domain", !disabled.ok);
  await setCategoryEnabled("weather", true, OFFICER);
}

// ── 8. DEFECT 2 — the AI budget now BLOCKS, it doesn't just alert ─────────
{
  await setCreditLimit(1); // $1 cycle cap
  await resetCreditCycle();

  const before = await assertAiBudget("polls");
  ok("[defect-2] under budget → call allowed", before.ok);

  // Burn the budget: Sonnet at ~$3/MTok in — 1M input tokens ≈ $3 > $1 limit.
  await recordAiUsage({ feature: "polls", model: "claude-sonnet-4-6", inputTokens: 1_000_000, outputTokens: 0, webSearches: 0, actorId: OFFICER });

  const after = await assertAiBudget("polls");
  ok("[defect-2] OVER budget → call is BLOCKED (not merely alerted)", !after.ok, JSON.stringify(after));
  if (!after.ok) {
    ok("[defect-2] the block reports real spend vs limit", after.spentUsd > after.limitUsd);
  }

  // A zero limit means "no cap" — must not brick generation.
  await setCreditLimit(0);
  const uncapped = await assertAiBudget("polls");
  ok("[defect-2] limit 0 = uncapped (does not brick generation)", uncapped.ok);

  await setCreditLimit(20);
  await resetCreditCycle();
  const restored = await assertAiBudget("polls");
  ok("[defect-2] fresh cycle re-allows calls", restored.ok);
  const cfg = await getCreditConfig();
  ok("[defect-2] limit persisted", cfg.limitUsd === 20);
}

console.log(`\nevents-calendar: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
