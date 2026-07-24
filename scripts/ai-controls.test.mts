/**
 * AI toolkit controls — the on/off flags + the single aggregator the dropdown reads.
 *
 * Proves each switch is independent, defaults ON (today's behaviour), and that
 * getAiToolkitStatus() reflects EVERY AI control (chatbot + poll-gen here, resolution
 * pause from market-sentinel, auto-resolve mode from market-config) — the one read,
 * no duplication. In-memory store.
 *
 *   npx tsx scripts/ai-controls.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import {
  isChatbotEnabled, isPollGenEnabled, setChatbotEnabled, setPollGenEnabled, getAiToolkitStatus,
} from "../src/lib/server/ai-controls.ts";
import { setResolutionAiPaused } from "../src/lib/server/market-sentinel.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };

const prevKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "test-key"; // so hasKey + resolution "active" are observable

// 1. Defaults — both features ON (no config ⇒ today's behaviour).
ok("1.1 chatbot defaults ON", (await isChatbotEnabled()) === true);
ok("1.2 poll-gen defaults ON", (await isPollGenEnabled()) === true);

// 2. Independent toggling — one flag never moves the other.
await setChatbotEnabled(false, "officer");
ok("2.1 chatbot disabled", (await isChatbotEnabled()) === false);
ok("2.2 poll-gen untouched by chatbot toggle", (await isPollGenEnabled()) === true);
await setPollGenEnabled(false, "officer");
ok("2.3 poll-gen disabled", (await isPollGenEnabled()) === false);
ok("2.4 chatbot still disabled", (await isChatbotEnabled()) === false);
await setChatbotEnabled(true, "officer");
ok("2.5 chatbot re-enabled independently", (await isChatbotEnabled()) === true && (await isPollGenEnabled()) === false);

// 3. The aggregator reflects EVERY control — one read for the dropdown.
await setChatbotEnabled(true, "officer");
await setPollGenEnabled(true, "officer");
await setResolutionAiPaused(false, "officer");
await setGlobalConfig({ resolutionMode: "human" }, "officer");
let s = await getAiToolkitStatus();
ok("3.1 hasKey true", s.hasKey === true);
ok("3.2 chatbot+pollgen reflected", s.chatbotEnabled === true && s.pollGenEnabled === true);
ok("3.3 resolution active (key + not paused)", s.resolutionActive === true && s.resolutionPaused === false);
ok("3.4 auto-resolve reflects human mode", s.autoResolve === false);
ok("3.5 confidence threshold surfaced", typeof s.confidenceThreshold === "number" && s.confidenceThreshold >= 50);

// 4. Pausing resolution + enabling auto flow through the SAME aggregator.
await setResolutionAiPaused(true, "officer");
await setGlobalConfig({ resolutionMode: "auto" }, "officer");
s = await getAiToolkitStatus();
ok("4.1 resolution now paused in the aggregator", s.resolutionPaused === true && s.resolutionActive === false);
ok("4.2 auto-resolve now true in the aggregator", s.autoResolve === true);

// 5. No key ⇒ resolution inert regardless of the pause flag (deployment gate wins).
delete process.env.ANTHROPIC_API_KEY;
s = await getAiToolkitStatus();
ok("5.1 no key → hasKey false", s.hasKey === false);
ok("5.2 no key → resolution not active", s.resolutionActive === false);

// Restore.
await setResolutionAiPaused(false, "officer");
await setGlobalConfig({ resolutionMode: "human" }, "officer");
if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = prevKey;

console.log(`\n${fail === 0 ? "ALL AI-CONTROLS SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
