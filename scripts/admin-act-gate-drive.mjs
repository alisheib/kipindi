/**
 * `npm run qa:admin-act-gate` — does an admin page render DIFFERENTLY for a role that may
 * VIEW it but may not ACT on it?
 *
 * THE INVARIANT, AND IT IS WHY THIS NEEDS NO TAXONOMY OF "ACT CONTROLS".
 * `control-gates.ts` states the contract in as many words: the PAGE must ask the same
 * question the ACTION will ask, and render an explanatory read-only state instead of a
 * control that bounces — the precedent `admin/objections/page.tsx` set with `canDecide`.
 * So for any page, and any two roles A (canView, NO canAct) and B (canView AND canAct):
 *
 *     a page that GATES renders a DIFFERENT set of controls to A than to B.
 *     a page that renders the IDENTICAL set does not gate at all.
 *
 * ⭐ THE COMPARISON IS THE MEASUREMENT, so the admin chrome cancels out — the sidebar,
 * the topbar, the refresh glyph and the AI toolkit are present in both renders and drop
 * out of the diff. That removes the need to hand-maintain a list of "which buttons are
 * act controls", which would be a second definition of one truth and would go stale on
 * the first new control.
 *
 * ⛔ IT REPORTS, IT DOES NOT JUDGE SEVERITY. An identical render is a finding to be LOOKED
 * at, not automatically a defect: a page whose only controls are navigation legitimately
 * renders the same for everyone. Every cell writes a screenshot and the operator reads it.
 *
 * ⚠️ WHICH CELLS EXIST AT ALL is derived from DEFAULT_GRANTS, not invented. Only three
 * (role, domain) pairs in the shipped matrix are canView-without-canAct on a domain that
 * HAS act controls — COMPLIANCE/accounting, COMPLIANCE/support, AUDITOR/accounting,
 * AUDITOR/compliance — plus `overview`, which every role holds view-only and whose
 * DOMAIN_SUMMARY declares `act: "—"`, i.e. it should carry no act controls for anyone.
 *
 * ⛔ LOCALHOST ONLY — it signs in as the seeded local staff fixtures.
 *
 * Prereqs: npm run db:seed-admin-local && npm run db:seed-staff-local ; next build && next start
 */
import { mkdirSync } from "node:fs";
import { browser, loginOnce, recorder } from "./live/harness.mjs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3001";
const SHOT = process.env.SHOT_DIR ?? ".50pick-shots/act-gate";

if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got BASE=${BASE}`);
  process.exit(1);
}
mkdirSync(SHOT, { recursive: true });

/**
 * domain → { viewOnly: roles with canView && !canAct, actor: a role with canAct, pages }
 * Transcribed from DEFAULT_GRANTS (roles.ts:171-202) and ROUTE_DOMAINS (roles.ts:221-264).
 */
const DOMAINS = [
  {
    domain: "accounting",
    viewOnly: ["COMPLIANCE", "AUDITOR"],
    actor: "FINANCE",
    pages: ["/admin/insights", "/admin/settlement", "/admin/finance", "/admin/reports",
            "/admin/payments", "/admin/transactions", "/admin/config"],
  },
  {
    domain: "compliance",
    viewOnly: ["AUDITOR"],
    actor: "COMPLIANCE",
    pages: ["/admin/compliance", "/admin/objections", "/admin/aml", "/admin/self-exclusions",
            "/admin/privacy", "/admin/retention", "/admin/audit", "/admin/approvals"],
  },
  {
    domain: "support",
    viewOnly: ["COMPLIANCE"],
    actor: "SUPPORT",
    pages: ["/admin/players"],
  },
];

const r = recorder("qa:admin-act-gate — does the page gate its controls on canAct?");

/**
 * The set of controls in the page BODY, as `name|disabled` strings.
 *
 * ⚠️ The role badge in the topbar carries the viewer's own role, so it differs between the
 * two renders for a reason that is not the gate. Names matching a role label are dropped —
 * otherwise every page would report a phantom difference and the sweep would find nothing.
 */
const ROLE_WORDS = /^(owner|compliance|trading|finance|growth|auditor|support|admin|qa)$/i;

async function signature(page) {
  return page.evaluate((roleWordsSrc) => {
    const roleWords = new RegExp(roleWordsSrc.slice(1, roleWordsSrc.lastIndexOf("/")), "i");
    const main = document.querySelector("main");
    if (!main) return null;
    const out = [];
    for (const el of main.querySelectorAll('button, input[type="submit"], [role="button"]')) {
      const name = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
      if (!name || roleWords.test(name)) continue;
      const disabled = el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
      out.push(`${name}|${disabled ? "disabled" : "enabled"}`);
    }
    return out.sort();
  }, ROLE_WORDS.toString());
}

const { b } = await browser();
const states = {};
try {
  // Sign in ONCE per role and reuse the state — the harness documents why (a matrix that
  // logs in per cell trips attempt-limiting and reports product failures that are not).
  const roles = [...new Set(DOMAINS.flatMap((d) => [...d.viewOnly, d.actor]))];
  for (const role of roles) states[role] = await loginOnce(b, `local:${role}`);
  r.note(`signed in once each: ${roles.join(", ")}`);

  for (const { domain, viewOnly, actor, pages } of DOMAINS) {
    for (const path of pages) {
      // the ACTOR's render — the baseline this page is capable of
      const ctxA = await b.newContext({ storageState: states[actor], viewport: { width: 1280, height: 1000 } });
      const pA = await ctxA.newPage();
      await pA.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const onPageA = new URL(pA.url()).pathname === path;
      const sigA = onPageA ? await signature(pA) : null;
      await ctxA.close();

      if (!r.check(`${path} · CONTROL ${actor} (canAct) is on the page`, onPageA && sigA !== null, `url=${pA.url?.() ?? "?"}`)) continue;

      for (const role of viewOnly) {
        const ctxB = await b.newContext({ storageState: states[role], viewport: { width: 1280, height: 1000 } });
        const pB = await ctxB.newPage();
        await pB.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        const onPageB = new URL(pB.url()).pathname === path;

        if (!onPageB) {
          // Not a failure of THIS check — the view gate refused, which is a different
          // (and correct) outcome. Recorded so it is never read as "gated its controls".
          r.note(`${path} · ${role}: view-gated out entirely (${pB.url()}) — no act-gate question to ask`);
          await ctxB.close();
          continue;
        }

        const sigB = await signature(pB);
        const same = JSON.stringify(sigA) === JSON.stringify(sigB);
        const enabledB = sigB.filter((s) => s.endsWith("|enabled")).length;
        const enabledA = sigA.filter((s) => s.endsWith("|enabled")).length;

        const slug = `${path.replace(/\//g, "_")}__${role}`;
        await pB.screenshot({ path: `${SHOT}/${slug}.png`, fullPage: true });

        r.check(
          `${path} · ${role} (${domain}: view, NO act) sees a DIFFERENT control set than ${actor}`,
          !same,
          same
            ? `IDENTICAL render — ${enabledB} enabled control(s) offered to a role that cannot act. shot=${slug}.png`
            : `differs (${actor}=${enabledA} enabled, ${role}=${enabledB} enabled)`,
        );
        if (same && enabledB > 0) {
          r.note(`   controls offered to ${role}: ${sigB.filter((s) => s.endsWith("|enabled")).slice(0, 6).map((s) => s.split("|")[0]).join(" · ")}${enabledB > 6 ? ` … +${enabledB - 6}` : ""}`);
        }
        await ctxB.close();
      }
    }
  }
} finally {
  await b.close();
}

console.log(`\nshots → ${SHOT}/  ⛔ READ THEM. An identical render is a question, not a verdict.`);
process.exit(r.done() > 0 ? 1 : 0);
