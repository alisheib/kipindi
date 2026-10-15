/** In-memory mutations only: no approval, payment or production write is made. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateS14Evidence } from "./lib/s14-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const original = JSON.parse(readFileSync(resolve(root, "docs/qa/vodacom-s14-evidence.json"), "utf8"));
const clone = () => structuredClone(original);
const errors = (record, opts = {}) => validateS14Evidence(record, { root, now: Date.parse("2026-10-15T12:00:00Z"), ...opts });
let passed = 0, failed = 0;
function proves(label, record, pattern, opts) {
  const found = errors(record, opts);
  if (found.some((error) => pattern.test(error))) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.error(`FAIL ${label} — ${JSON.stringify(found)}`); }
}
if (errors(original).length === 0) { passed++; console.log("PASS pending evidence has valid structure"); }
else { failed++; console.error(`FAIL pending evidence structure — ${JSON.stringify(errors(original))}`); }
proves("pending record cannot clear S14", original, /pending evidence/, { requireS14: true });
{
  const x = clone(); x.frames[0].checks.pop();
  proves("missing deck element is caught", x, /required per-element checks/, {});
}
{
  const x = clone(); [x.frames[0].checks[0], x.frames[0].checks[1]] = [x.frames[0].checks[1], x.frames[0].checks[0]];
  proves("deck element order is enforced", x, /reordered/, {});
}
{
  const x = clone(); x.frames[0].checks[0].checked = true;
  proves("a tick without a read record is caught", x, /home\.evidence: pending evidence/, {});
}
{
  const x = clone(); x.proofs[0].evidence = { path: "docs/qa/missing.md", checkedBy: "QA", checkedAt: "2026-10-15T11:00:00Z", commit: "a".repeat(40) };
  proves("an invented local proof path is caught", x, /local-e2e: evidence file does not exist/, {});
}
{
  const x = clone(); x.productionStaffJourney.evidence = { path: "docs/qa/vodacom-s14-evidence.json", checkedBy: "QA", checkedAt: "2026-10-15T11:00:00Z", commit: "a".repeat(40) };
  proves("a claimed money journey without bet reference is caught", x, /bet reference is missing/, {});
}
{
  const x = clone(); x.agencyDecision.decision = "signed"; x.agencyDecision.decidedBy = "Fred";
  proves("claimed agency sign-off without written evidence is caught", x, /agencyDecision\.evidence: pending evidence/, {});
}
{
  const x = clone(); x.agencyDecision.decision = "owner-override"; x.agencyDecision.decidedBy = "QA";
  proves("someone other than Ali cannot override agency sign-off", x, /only Ali/, {});
}
{
  const x = clone(); x.s15.ownerGo = { path: "docs/qa/vodacom-s14-evidence.json", checkedBy: "QA", checkedAt: "2026-10-15T11:00:00Z", commit: "a".repeat(40) };
  proves("a launch go cannot be attributed to QA", x, /launch go must come from Ali/, {});
}
{
  const x = clone(); x.s15.launchAt = "2026-10-15T11:00:00Z";
  proves("S16 cannot shelve before seven real days", x, /seven full days/, { requireS16: true });
}
console.log(`s14-evidence-red: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
