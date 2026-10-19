import ts from "typescript";
import { runInNewContext } from "node:vm";

const minute = 60_000;
const span = 6 * minute;

function executeHelper(source) {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(js, { exports, Date, Math, Number, Error });
  return exports.qaAlignedOpenAt;
}

export function alignedBoundaryIssues({ route, helper }) {
  const issues = [];
  const arm = route.slice(route.indexOf('if (phase === "arm")'), route.indexOf("// SETTLE."));
  if (!route.includes('if (process.env.NODE_ENV === "production")') || !route.includes('error: "Not available" }, { status: 404 }')) {
    issues.push("the dev door is closed in production");
  }
  if (!route.includes('import { qaAlignedOpenAt } from "./aligned-boundary";')
      || !route.includes('body?.alignedBoundary === true')
      || !route.includes('qaAlignedOpenAt(nowMs, spanMs)')) {
    issues.push("only an explicit QA request chooses whole-minute timing");
  }
  if (!route.includes('const leadSeconds = Number.isFinite(body?.leadSeconds) ? Math.max(5, Number(body.leadSeconds)) : 80;')
      || !route.includes('new Date(nowMs - spanMs + leadSeconds * 1_000).toISOString()')) {
    issues.push("the ordinary lead-seconds path remains intact");
  }
  if (!arm.includes('const spanMs = roundSpanMinutes(c.durationMinutes) * 60_000;')
      || !arm.includes('await chainStore.patch(c.id, { nextBoundaryAt: openAt });')
      || !arm.includes('await advanceChain(c.id, { now: Date.now() });')) {
    issues.push("the actual round span and production service create the round");
  }
  if (!helper.includes("export const QA_ALIGNED_MIN_LEAD_MS = 60_000;")) {
    issues.push("the aligned QA route keeps a one-minute minimum lead");
  }

  try {
    const openAt = executeHelper(helper);
    if (typeof openAt !== "function") throw new Error("no helper export");
    const samples = [
      Date.UTC(2026, 9, 19, 12, 34, 0, 0),
      Date.UTC(2026, 9, 19, 12, 34, 10, 500),
      Date.UTC(2026, 9, 19, 12, 34, 59, 999),
    ];
    for (const now of samples) {
      const opened = Date.parse(openAt(now, span));
      const close = opened + span;
      const lead = close - now;
      if (!Number.isFinite(opened) || opened % minute !== 0 || close % minute !== 0 || lead < minute || lead >= 2 * minute) {
        issues.push("an aligned close is a real minute boundary 60–120 seconds ahead");
        break;
      }
    }
    if (Date.parse(openAt(samples[1], span)) !== Date.UTC(2026, 9, 19, 12, 30, 0, 0)) {
      issues.push("the predecessor starts at the exact six-minute span before its 12:36 close");
    }
    for (const [now, badSpan] of [[NaN, span], [samples[0], 0], [samples[0], -span]]) {
      let refused = false;
      try { openAt(now, badSpan); } catch { refused = true; }
      if (!refused) { issues.push("invalid QA times and spans are refused"); break; }
    }
  } catch (error) {
    issues.push(`aligned helper does not execute: ${String(error).slice(0, 100)}`);
  }
  return issues;
}
