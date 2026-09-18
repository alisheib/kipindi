/**
 * MACHINE TRANSLATION vs REACT — the guard for the crash that actually took the Up & Down board
 * off Dhiresh Kaba's phone on 2026-09-18, captured off the handset itself:
 *
 *   NotFoundError: Failed to execute 'removeChild' on 'Node':
 *   The node to be removed is not a child of this node.     (Android 10, Chrome 152 Mobile)
 *
 *   npx tsx scripts/translation-safety.test.mts   (npm run test:translation-safety)
 *
 * Google Translate REPLACES text nodes, wrapping each in its own `<font>`. React's stored
 * references go stale, and the next re-render asks a parent to remove a child that is no longer
 * its child. It read as "only on one phone" for two sessions because **auto-translate is a
 * per-device browser setting** — invisible to our data, our status codes, our logs and every
 * suite in this repo.
 *
 * ⛔ THE FIX IS TWO LAYERS AND NEITHER IS SUFFICIENT ALONE, which is exactly why this exists:
 *   §1 PREVENT — `notranslate` meta + `translate="no"` + the `notranslate` class. Removes the
 *      common trigger. ⚠️ ADVISORY ONLY: an in-app webview (Facebook/Instagram), an extension or
 *      a vendor ROM translator need not honour it.
 *   §2/§3 SURVIVE — `installDomTranslationGuard()` makes `removeChild`/`insertBefore` tolerant of
 *      a node another agent re-parented. §3 proves the BEHAVIOUR, not the spelling.
 * Deleting either one silently restores a crash on a real-money surface.
 *
 * ⭐ The end-to-end proof, with a control that must crash, is
 * `node scripts/live/translate-crash-repro.mjs` — this file is the deterministic half.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/** ⛔ Code assertions read CODE. This repo has twice had a guard match its own prose. */
const readCode = (rel: string) => decomment(read(rel));

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && why ? ` — ${why}` : ""}`);
};

/* ── §1 · PREVENT — the page asks not to be translated ────────────────────────────────────── */
console.log("\n§1 · the document declares notranslate");
{
  const layout = readCode("src/app/layout.tsx");
  ok("§1a the `notranslate` meta is emitted", /google:\s*["']notranslate["']/.test(layout));
  ok("§1b `<html>` carries translate=\"no\"", /<html[^>]*translate=["']no["']/.test(layout));
  ok("§1c …and the `notranslate` class", /<html[^>]*notranslate/.test(layout));
  // ⚠️ All three are advisory. §2 is what makes the page survive being translated anyway.
}

/* ── §2 · SURVIVE — the guard is wired where it can work ──────────────────────────────────── */
console.log("\n§2 · the DOM guard is installed early enough to matter");
{
  const host = readCode("src/components/layout/dom-translation-guard.tsx");
  const layout = readCode("src/app/layout.tsx");
  ok("§2a the host is a client module", /["']use client["']/.test(read("src/components/layout/dom-translation-guard.tsx")));
  // ⭐ MODULE SCOPE, NOT AN EFFECT. An effect runs after the first commit — too late to protect
  //   hydration of markup a translator has already rewritten.
  ok("§2b ⭐ it installs at MODULE SCOPE, outside the component",
    /installDomTranslationGuard\(\);/.test(host) &&
    host.indexOf("installDomTranslationGuard();") < host.indexOf("export function"),
    "inside the component body it would run after React's first commit");
  ok("§2c …and it is not wrapped in useEffect", !/useEffect/.test(host));
  ok("§2d the layout renders it", /<DomTranslationGuard\s*\/>/.test(layout));
  // ⛔ FIRST IN THE BODY — load order is the whole reason it is placed there.
  ok("§2e ⭐ …as the FIRST child of <body>",
    layout.indexOf("<DomTranslationGuard") > layout.indexOf("<body") &&
    layout.indexOf("<DomTranslationGuard") < layout.indexOf("<GoogleTag"),
    "anything mounted before it is unprotected during hydration");
}

/* ── §3 · ⭐ THE BEHAVIOUR, EXERCISED — not the spelling ──────────────────────────────────── */
console.log("\n§3 · ⭐ the guard actually neutralises the throw");
{
  // A minimal DOM: `removeChild` throws exactly as a browser does when the node is not a child.
  class FakeNode {
    parentNode: FakeNode | null = null;
    children: FakeNode[] = [];
    removeChild(child: FakeNode): FakeNode {
      if (child.parentNode !== this) throw new Error("Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.");
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
      return child;
    }
    insertBefore(node: FakeNode, ref: FakeNode | null): FakeNode {
      if (ref && ref.parentNode !== this) throw new Error("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
      this.children.push(node); node.parentNode = this; return node;
    }
  }
  // ⚠️ `defineProperty`, not assignment: in Node 24 `navigator` is a getter-only global and a
  // plain `globalThis.navigator = {}` throws. The guard reads it, so it must exist.
  const def = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def("window", { location: { pathname: "/updown" } });
  def("navigator", {});                   // no sendBeacon → the reporter no-ops, as designed
  def("location", { pathname: "/updown" });
  def("Node", FakeNode);

  // ⭐ CONTROL FIRST: prove the fake DOM really does throw, or §3c proves nothing.
  const parent = new FakeNode(); const stolen = new FakeNode(); const thief = new FakeNode();
  stolen.parentNode = thief;              // exactly what a translator does: re-parent the node
  let threwBefore = false;
  try { parent.removeChild(stolen); } catch { threwBefore = true; }
  ok("§3a control · the unguarded DOM DOES throw", threwBefore);

  const { installDomTranslationGuard } = await import("../src/lib/client/dom-translation-guard.ts");
  installDomTranslationGuard();

  let threwAfter = false; let returned: unknown = null;
  try { returned = parent.removeChild(stolen); } catch { threwAfter = true; }
  ok("§3b 🔴 with the guard, removeChild no longer throws", !threwAfter);
  ok("§3c …and it returns the node, as the DOM contract requires", returned === stolen);

  // A LEGITIMATE removal must still work — a guard that neuters real removals is worse.
  const realChild = new FakeNode(); realChild.parentNode = parent; parent.children.push(realChild);
  let realOk = false;
  try { parent.removeChild(realChild); realOk = !parent.children.includes(realChild); } catch { realOk = false; }
  ok("§3d ⭐ a GENUINE removal still happens", realOk,
    "a guard that swallows real removals would leak dead nodes onto a money surface");

  // insertBefore: a stale reference must APPEND, never drop the content.
  const host2 = new FakeNode(); const staleRef = new FakeNode(); staleRef.parentNode = new FakeNode();
  const incoming = new FakeNode();
  let insThrew = false;
  try { host2.insertBefore(incoming, staleRef); } catch { insThrew = true; }
  ok("§3e insertBefore survives a stale reference", !insThrew);
  ok("§3f ⭐ …and the content is APPENDED, not lost", host2.children.includes(incoming),
    "dropping it would blank part of a board showing someone's money");

  // Idempotent: a second install must not nest the patches.
  installDomTranslationGuard();
  const parent2 = new FakeNode(); const stolen2 = new FakeNode(); stolen2.parentNode = new FakeNode();
  let doubleThrew = false;
  try { parent2.removeChild(stolen2); } catch { doubleThrew = true; }
  ok("§3g re-installing is a no-op", !doubleThrew);
}

/* ── §4 · it reports, so it can never be a silent mask ────────────────────────────────────── */
console.log("\n§4 · an interception is reported, not hidden");
{
  const guard = readCode("src/lib/client/dom-translation-guard.ts");
  ok("§4a it beacons to the client-error endpoint", /\/api\/client-error/.test(guard));
  ok("§4b …via sendBeacon", /sendBeacon/.test(guard));
  // ⚠️ Throttled: a translated page re-renders constantly.
  ok("§4c …throttled to once per load", /reported\s*=\s*true/.test(guard));
  ok("§4d the reporter cannot throw", /try\s*\{[\s\S]*sendBeacon[\s\S]*catch/.test(guard));
  ok("§4e the patch itself cannot throw", /try\s*\{[\s\S]*Node\.prototype\.removeChild[\s\S]*catch/.test(guard));
}

/* ── §5 · controls — every matcher must be able to fail ───────────────────────────────────── */
console.log("\n§5 · controls");
{
  ok("§5a control · a layout with no meta IS detected", !/google:\s*["']notranslate["']/.test('other: { "mobile-web-app-capable": "yes" },'));
  ok("§5b control · an <html> without translate IS detected", !/<html[^>]*translate=["']no["']/.test('<html lang={lang}>'));
  ok("§5c control · an effect-wrapped install IS detected",
    /useEffect/.test('useEffect(() => { installDomTranslationGuard(); }, []);'));
  ok("§5d control · a guard with no reporting IS detected", !/\/api\/client-error/.test("Node.prototype.removeChild = fn;"));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 22) { console.error(`!! only ${pass + fail} assertions ran — treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
