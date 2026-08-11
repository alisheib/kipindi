/**
 * `npm run test:admin-act-gate` — every admin control that ACTS must consult the act gate.
 *
 * ⛔ WHAT THIS IS FOR (finding A1). The gate itself is one line in the admin layout, and a
 * layout cannot reach inside a control component and disable its button. So "gated by
 * default" is not a property the mechanism can have on its own — **it is this guard.** A new
 * admin control that calls a server action and never asks `useMayAct()` is exactly the
 * regression that produced A1 in the first place, and it goes red here the moment it lands.
 *
 * THE RULE: a client component under `src/app/admin` that imports a server action must
 * consult the gate — `useMayAct()`, `useActContext()`, `useActDisabledReason()` or
 * `<ActGuard>`.
 *
 * ⚠️ ALLOWLIST, AND IT MAY ONLY SHRINK. `act-gate-allowlist.json` names the controls not yet
 * migrated, with a reason each. That is the same pattern `orphan-allowlist.json` uses in this
 * repo, and for the same reason: an undeclared gap reads as coverage, while a declared one is
 * a work item with a number on it. ⛔ **The count is the progress metric. Adding a name to
 * buy a green tick defeats the entire guard** — the file records the count at creation and
 * this suite fails if it grows.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ADMIN = join(ROOT, "src/app/admin");
const ALLOWLIST = join(import.meta.dirname, "act-gate-allowlist.json");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = ""): boolean => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
   .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, " "));

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Imports a server action from an `actions.ts` / `*-actions.ts` / `*-action.ts` module. */
const IMPORTS_ACTION = /from\s+["'][^"']*\/?[a-z0-9-]*actions?["']/i;
/** Consults the gate in any of its four forms. */
const CONSULTS_GATE = /\buseMayAct\s*\(|\buseActContext\s*\(|\buseActDisabledReason\s*\(|<ActGuard\b/;

console.log("\ntest:admin-act-gate — every acting control consults the gate\n");

// ── §1 · the mechanism is mounted in the shell ────────────────────────────────────
console.log("§1 the shell");
{
  const layout = decomment(readFileSync(join(ROOT, "src/app/admin/layout.tsx"), "utf8"));
  ok("§1 the layout computes canAct for the route's domain", /\bcanAct\s*\(\s*viewerRole\s*,\s*domain\s*\)/.test(layout));
  ok("§1 it mounts AdminActProvider", /<AdminActProvider\b/.test(layout));
  // ⛔ THE DOMAIN MUST BE THE SAME ONE THE VIEW GATE USES, or the two gates can disagree
  // about which domain a route belongs to — which is the drift control-gates.ts exists for.
  ok("§1 the act gate reads `domain` from the same domainForPath(path) as the view gate",
    /const domain = domainForPath\(path\)/.test(layout) && /canAct\(viewerRole, domain\)/.test(layout));
  ok("§1 a read-only viewer gets the banner", /<ActReadOnlyBanner\b/.test(layout));
  // Owner-only routes are ADMIN-gated ahead of the domain check; the act gate must agree.
  ok("§1 owner-only routes gate act on isAdmin, not on the ops grant",
    /ownerOnly \? isAdmin\(viewerRole\) : await canAct/.test(layout));
}

// ── §2 · the gate module keeps its default and its explanation ────────────────────
console.log("\n§2 the gate module");
{
  const src = decomment(readFileSync(join(ROOT, "src/components/admin/act-gate.tsx"), "utf8"));
  ok("§2 useMayAct is exported", /export function useMayAct\b/.test(src));
  ok("§2 ActGuard is exported", /export function ActGuard\b/.test(src));
  // ⭐ The refusal must NAME the role and the domain — "not allowed" leaves the officer with
  // no next step, and the next step is a grant the Owner can change.
  ok("§2 the disabled reason names the role and the domain",
    /role.*domainLabel|domainLabel.*role/s.test(src) && /useActDisabledReason/.test(src));
}

// ── §3 · every acting control consults it ─────────────────────────────────────────
console.log("\n§3 the controls");
{
  const allow: { count: number; entries: Record<string, string> } = existsSync(ALLOWLIST)
    ? JSON.parse(readFileSync(ALLOWLIST, "utf8"))
    : { count: 0, entries: {} };

  const acting: string[] = [];
  for (const f of walk(ADMIN)) {
    const raw = readFileSync(f, "utf8");
    if (!raw.includes('"use client"')) continue;
    const src = decomment(raw);
    if (!IMPORTS_ACTION.test(src)) continue;
    acting.push(relative(ROOT, f).replace(/\\/g, "/"));
  }

  const ungated = acting.filter((rel) => {
    const src = decomment(readFileSync(join(ROOT, rel), "utf8"));
    return !CONSULTS_GATE.test(src);
  });
  const undeclared = ungated.filter((r) => !(r in allow.entries));
  const staleDeclared = Object.keys(allow.entries).filter((r) => !ungated.includes(r));

  console.log(`    acting client components: ${acting.length}   gated: ${acting.length - ungated.length}   declared-ungated: ${ungated.length}`);

  ok("§3 every acting control either consults the gate or is DECLARED in the allowlist",
    undeclared.length === 0, undeclared.join(", "));

  // ⛔ THE ALLOWLIST MAY ONLY SHRINK. Without this, the guard is defeated by editing a JSON
  // file — which is easier than fixing the control, and would read as green forever.
  ok(`§3 the allowlist has not GROWN (recorded ${allow.count}, now ${ungated.length})`,
    ungated.length <= allow.count, `add a control to the gate, never a name to the list`);

  // A declared entry that is now gated must be REMOVED, or the count stops meaning anything.
  ok("§3 no stale allowlist entries (a migrated control must be struck off)",
    staleDeclared.length === 0, staleDeclared.join(", "));

  if (process.env.WRITE_ALLOWLIST === "1") {
    const entries: Record<string, string> = {};
    for (const u of ungated) entries[u] = allow.entries[u] ?? "not yet migrated to the act gate";
    writeFileSync(ALLOWLIST, JSON.stringify({ count: ungated.length, entries }, null, 2) + "\n");
    console.log(`    (WRITE_ALLOWLIST=1 — wrote ${ungated.length} entries)`);
  }
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
