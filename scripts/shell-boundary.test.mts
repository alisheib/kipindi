/**
 * E-70 — CROSSING BETWEEN THE PLAYER APP AND THE ADMIN CONSOLE MUST BE A HARD NAVIGATION.
 *
 * Ali, 2026-08-06: *"when i click back to app from admin, it redircwt to app but with no
 * navbar."* And 2026-08-04: *"when I move from admin to game to markets there is no navbar,
 * it's lost until I login as player or retry the URL as player."*
 *
 * ⭐ THE MECHANISM, and it explains BOTH directions with one cause.
 * `AppShell` is a SERVER component in the ROOT layout (`src/app/layout.tsx`). It reads the
 * request path from the `x-pathname` header and returns `<>{children}</>` — no player chrome —
 * for anything under `/admin`. In the Next.js App Router **a layout is NOT re-executed on a
 * client-side soft navigation**; it is preserved across route changes. So:
 *
 *   · `<Link href="/">` in the admin shell  → the shell-less layout rendered for `/admin` is
 *     kept, and the landing page renders inside it. **No navbar, no wallet, no way back.**
 *   · `<Link href="/admin">` in the avatar menu → the PLAYER layout is kept, and the console
 *     renders inside player chrome. That is session 21's unexplained observation, *"/admin/updown
 *     served the signed-out player shell to a freshly signed-in ADMIN"* — the same bug, mirrored.
 *
 * MEASURED ON PRODUCTION (`.qa-s30/repro-e70.mjs`), same URL, same session, same account:
 *   CLICK "Back to app" → `/` with **nav=0**  ·  hard load of `/` → **nav=2 ["Primary","Primary"]**
 * and after the click a `Markets` nav link is **not clickable at all** — the player is stranded
 * on a money surface, which is the harm this finding is about.
 *
 * ⛔ THE FIX IS A PLAIN `<a>`, DELIBERATELY, AND IT MUST NOT BE "OPTIMISED" BACK.
 * A soft navigation is an optimisation that assumes the layout above it still applies. Crossing
 * between two entirely different shells is exactly the case where that assumption is false, so a
 * full document load is the CORRECT primitive here, not a regression. This suite exists because
 * the change looks like an oversight to anyone who does not know the above.
 *
 * ⚠️ SCOPED TO THE CROSSING LINKS THEMSELVES. Asserting "the file contains `<a href`" would be
 * green over a file that also still contains the `<Link>`, and asserting "the file has no
 * `<Link>`" would fail over the dozen intra-shell links that SHOULD be soft. Both are the
 * class of check session 29 wrote six of. Every check below extracts the ELEMENT whose href
 * crosses the boundary and reports the tag it is written with.
 *
 *   npm run test:shell-boundary
 */
import { readFileSync } from "node:fs";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};

/** Read a file with line endings normalised — this repo is CRLF and anchors are written LF. */
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/**
 * Every JSX element in `src` whose `href` is `want` (exactly), returned with the tag it uses.
 *
 * ⛔ Returns [] when nothing matches, and every caller treats an EMPTY RESULT AS A FAILURE
 * rather than as "no violations found". A guard that cannot tell "the link is gone" from "the
 * link is correct" is the vacuity this campaign keeps paying for.
 */
function linksTo(src: string, want: string): Array<{ tag: string; snippet: string }> {
  const out: Array<{ tag: string; snippet: string }> = [];
  // Walk every opening tag and look at its attributes. Regexing the whole element would trip
  // over nested JSX; the opening tag alone carries the href and the tag name, which is all
  // this needs.
  for (const m of src.matchAll(/<([A-Za-z][A-Za-z0-9]*)\s([^>]*?)\/?>/gs)) {
    const [whole, tag, attrs] = m;
    const href = attrs.match(/\bhref=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
    const value = href?.[1] ?? href?.[2] ?? href?.[3];
    if (value !== want) continue;
    out.push({ tag, snippet: whole.replace(/\s+/g, " ").slice(0, 110) });
  }
  return out;
}

console.log("\nE-70 · the player↔admin shell boundary must be crossed with a hard navigation\n");

// ── §1. ADMIN → PLAYER: the "Back to app" control Ali named ────────────────────────────────
console.log("§1 · admin console → player app  (`Back to app`)");
const adminShell = read("src/components/admin/admin-shell.tsx");
const backLinks = linksTo(adminShell, "/");
ok("1.1 the `Back to app` control still exists (href=\"/\")", backLinks.length > 0,
   "no element with href=\"/\" in admin-shell.tsx — did the control move? this suite is now blind");
ok("1.2 …and there is exactly one of it", backLinks.length === 1, `${backLinks.length} found`);
for (const l of backLinks) {
  ok(`1.3 …written as a plain <a>, not <${l.tag}> — a soft nav keeps the shell-less admin layout`,
     l.tag === "a", l.snippet);
}

// ── §2. PLAYER → ADMIN: the "Staff console" jump (the mirrored half) ───────────────────────
console.log("\n§2 · player app → admin console  (`Staff console`)");
const avatarMenu = read("src/components/layout/avatar-menu.tsx");
const staffLinks = linksTo(avatarMenu, "/admin");
ok("2.1 the `Staff console` jump still exists (href=\"/admin\")", staffLinks.length > 0,
   "no element with href=\"/admin\" in avatar-menu.tsx — this suite is now blind");
ok("2.2 …and there is exactly one of it", staffLinks.length === 1, `${staffLinks.length} found`);
for (const l of staffLinks) {
  ok(`2.3 …written as a plain <a>, not <${l.tag}> — a soft nav keeps the PLAYER layout, and the console renders inside player chrome (session 21's observation)`,
     l.tag === "a", l.snippet);
}

// ── §3. THE CONTROL — prove this suite can still SEE a soft link ───────────────────────────
// ⛔ Without this, §1 and §2 could be passing because `linksTo` is broken and returns nothing
// useful. Ask for something that IS legitimately a <Link> and require the parser to find it.
console.log("\n§3 · CONTROL — the parser can still identify a soft <Link>, so §1/§2 are not vacuous");
const intraShell = linksTo(avatarMenu, "/results");
ok("3.1 an ordinary intra-shell destination is still found by the parser", intraShell.length > 0,
   "`linksTo` found nothing for href=\"/results\" — the parser is broken and §1/§2 prove nothing");
ok("3.2 …and it is (correctly) still a soft link, not an <a>",
   intraShell.every((l) => l.tag !== "a"), JSON.stringify(intraShell.map((l) => l.tag)));

// ── §4. THE ROOT CAUSE IS STILL WHERE THE COMMENT SAYS IT IS ───────────────────────────────
// If someone later restructures the layout into route groups, the <a> workaround stops being
// necessary — but this check will then fail and force a human to re-read the reasoning rather
// than leaving a stale mitigation in place forever.
console.log("\n§4 · the mechanism this mitigation exists for is still present");
const shell = read("src/components/layout/app-shell.tsx");
const gate = shell.slice(shell.indexOf("export async function AppShell"),
                         shell.indexOf("export async function AppShell") + 900);
ok("4.1 AppShell still decides the player chrome from the REQUEST PATH in the root layout",
   /x-pathname/.test(gate) && /startsWith\("\/admin"\)/.test(gate),
   "if this is now handled by route groups, the <a> mitigation can be reconsidered — re-read E-70 first");

console.log(`\nshell-boundary: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error("\n✗ E-70 — a shell boundary is crossed with a soft navigation, so the destination renders inside the WRONG layout: no navbar (admin→player) or player chrome around the console (player→admin).\n");
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("shell-boundary: OK — both crossings are hard navigations, so each destination gets its own shell");
