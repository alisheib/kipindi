/**
 * §3 · THE INSTALL INVITATION — the rules Ali set, asserted rather than remembered.
 *
 * Ali, 2026-08-27: *"If the user didn't add the web app to the home screen, invite them to do so,
 * but in a non-disturbing way. Make it visually perfect, consistent with our theme kit, 100%
 * functional, accurate. Responsive and visually and logically functional."*
 *
 * ⭐ *"NON-DISTURBING"* IS A SPECIFICATION, SO EVERY NUMBER IN IT IS PINNED HERE. A rule that
 * lives only in a component is a rule the next refactor is free to soften: the visit count, the
 * engagement delay, the re-ask window and the refusal ceiling are all asserted, and each one is a
 * decision somebody can argue with rather than a magic number nobody can find.
 *
 * ⛔ AND THE FIRST SECTION IS THE ONE THAT MATTERS MOST: **is the app actually installable?** An
 * invitation to install an app the browser will refuse is worse than silence, and the manifest's
 * icon list is a set of PATHS — every one of them is checked against the disk, because a manifest
 * that names a missing icon is exactly the shape that passes a JSON review and fails a real phone.
 *
 *   npm run test:install-invite
 */
import { readFileSync, existsSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/**
 * The same file with COMMENTS REMOVED, for checks that are about CODE.
 *
 * ⛔ CHECK 6.1 FAILED ON CORRECT SOURCE WITHOUT THIS. It forbids `truncate` in the card — and the
 * card carries a comment explaining that `truncate` is forbidden. That is the FOURTH time in one
 * session that one of my own checks matched a VOCABULARY instead of a control: a word is not a
 * control, and prose about a rule is not a breach of it.
 */
const code = (p: string) => decomment(read(p));

console.log("\n§3 · the install invitation — installable, non-disturbing, and out of the way\n");

// ── §1 · IS IT ACTUALLY INSTALLABLE? ────────────────────────────────────────────────────────
console.log("§1 · the manifest, and every file it names");
const mf = JSON.parse(read("public/manifest.json")) as {
  name?: string; short_name?: string; start_url?: string; display?: string;
  icons?: Array<{ src: string; sizes?: string; purpose?: string }>;
};
ok("1.1 name and short_name are set", !!mf.name && !!mf.short_name, `${mf.name} / ${mf.short_name}`);
ok("1.2 start_url is set", !!mf.start_url, String(mf.start_url));
ok("1.3 display is standalone — without it a browser will not offer to install",
   mf.display === "standalone", String(mf.display));
const icons = mf.icons ?? [];
const sizeSet = new Set(icons.flatMap((i) => (i.sizes ?? "").split(/\s+/)));
ok("1.4 a 192px and a 512px icon are declared — Chrome's install criteria",
   sizeSet.has("192x192") && sizeSet.has("512x512"), [...sizeSet].join(" "));
ok("1.5 a MASKABLE icon is declared — without one Android crops the mark into a circle",
   icons.some((i) => (i.purpose ?? "").includes("maskable")), JSON.stringify(icons.map((i) => i.purpose)));
// ⛔ THE CHECK A JSON REVIEW CANNOT DO. Every `src` is a path; a manifest naming a missing file
// installs an app with a broken icon, and nothing in a build catches it.
for (const i of icons) {
  const p = `public${i.src}`;
  ok(`1.6 the declared icon exists on disk — ${i.src}`, existsSync(p), `${p} is missing`);
}
ok("1.7 the manifest is LINKED from the root layout — an unlinked manifest is invisible",
   /manifest:\s*"\/manifest\.json"/.test(read("src/app/layout.tsx")), "app/layout.tsx metadata");
ok("1.8 a service worker exists and something registers it",
   existsSync("public/sw.js") && /navigator\.serviceWorker\.register\("\/sw\.js"/.test(read("src/lib/register-sw.ts")),
   "Chrome requires an active SW before it will offer an install");

// ── §2 · ALREADY INSTALLED IS CHECKED FIRST ─────────────────────────────────────────────────
console.log("\n§2 · the case a desktop dev browser never shows you");
const inv = read("src/components/pwa/install-invite.tsx");
ok("2.1 the standalone display-mode is checked (Chrome / Edge / Android / desktop)",
   /matchMedia\?\.\("\(display-mode: standalone\)"\)/.test(inv), "");
ok("2.2 ⛔ navigator.standalone is checked too — it is the ONLY signal on iOS",
   /navigator as Navigator & \{ standalone\?: boolean \}\)\.standalone === true/.test(inv), "");
ok("2.3 …and the answer gates the render, not merely the effect",
   /if \(installed \|\| !visible \|\| isCommitSurface\(pathname\)\) return null;/.test(inv), "");
ok("2.4 ⭐ it is RE-CHECKED on visibilitychange — a viewer can install from the browser menu without this document unmounting",
   /addEventListener\("visibilitychange", onVisible\)/.test(inv), "");
ok("2.5 the appinstalled event writes a PERMANENT stop",
   /addEventListener\("appinstalled", onInstalled\)/.test(inv) && /write\(K_DONE, "1"\)/.test(inv), "");

// ── §3 · iOS NEVER GETS A BUTTON THAT DOES NOTHING ──────────────────────────────────────────
console.log("\n§3 · iOS Safari never fires beforeinstallprompt, so it never gets a button");
ok("3.1 the browser's own offer is captured and its default prevented",
   /addEventListener\("beforeinstallprompt", onPrompt\)/.test(inv) && /e\.preventDefault\(\)/.test(inv), "");
ok("3.2 ⛔ prompt() is only called from a click handler — it is illegal without a user gesture",
   /const install = useCallback\(async \(\) => \{[\s\S]{0,400}?deferred\.prompt\(\)/.test(inv), "");
ok("3.3 ⛔ the CTA renders ONLY when the event actually arrived",
   /\{mode === "prompt" && \([\s\S]{0,300}?onClick=\{install\}/.test(inv),
   "a button that cannot install is a lie on iOS");
ok("3.4 …and iOS is given the real gesture instead",
   /installIosHow/.test(inv) && /iPad\|iPhone\|iPod/.test(inv), "");
ok("3.5 …and a menu-driven browser (Firefox Android) gets its own instruction",
   /installOtherHow/.test(inv), "");

// ── §4 · THE NUMBERS ────────────────────────────────────────────────────────────────────────
console.log("\n§4 · \"non-disturbing\" as numbers, each one arguable");
const num = (name: string) => {
  const m = new RegExp(`const ${name} = ([0-9_]+);`).exec(inv);
  return m ? Number(m[1].replace(/_/g, "")) : null;
};
ok("4.1 ⛔ never on a first-ever visit", num("MIN_VISITS") !== null && num("MIN_VISITS")! >= 2, `MIN_VISITS=${num("MIN_VISITS")}`);
ok("4.2 ⛔ never in the first 30 seconds of a session", (num("MIN_ENGAGE_MS") ?? 0) >= 30_000, `MIN_ENGAGE_MS=${num("MIN_ENGAGE_MS")}`);
ok("4.3 a dismissal is remembered for at least a week", (num("RE_ASK_DAYS") ?? 0) >= 7, `RE_ASK_DAYS=${num("RE_ASK_DAYS")}`);
ok("4.4 and it stops asking after a few refusals", (num("MAX_DISMISSALS") ?? 0) > 0 && (num("MAX_DISMISSALS") ?? 99) <= 5, `MAX_DISMISSALS=${num("MAX_DISMISSALS")}`);
ok("4.5 the dismissal is persisted, not just held in state",
   /write\(K_DISMISS_AT/.test(inv) && /write\(K_DISMISS_N/.test(inv), "");

// ── §5 · IT IS NEVER OVER A MONEY CONTROL ───────────────────────────────────────────────────
console.log("\n§5 · never over the bet button or the balance pill");
ok("5.1 the money-commit gate is applied at RENDER, so a soft navigation removes it",
   /isCommitSurface\(pathname\)/.test(inv), "");
const surf = read("src/lib/surfaces.ts");
ok("5.2 ⭐ ONE definition of a money surface — the Needle imports it rather than declaring its own",
   /export function isMoneySurface/.test(surf) && /import \{ isMoneySurface \} from "@\/lib\/surfaces"/.test(read("src/components/layout/needle.tsx")),
   "two definitions of \"money surface\" is the drift this repo has filed four times");
ok("5.3 the commit gate covers the poll bet card AND the Up & Down round card",
   /\/\^\\\/markets\\\/\[\^\/\]\+\//.test(surf) && /\/\^\\\/updown\\\/\[\^\/\]\+\//.test(surf), surf.match(/COMMIT_ROUTE[\s\S]{0,320}/)?.[0] ?? "");
ok("5.4 …and it clears the bottom nav rather than sitting on it",
   /bottom: "calc\(96px \+ env\(safe-area-inset-bottom\)\)"/.test(inv),
   "the nav owns 88px + the safe area");

// ── §6 · ALI'S CROSS-CUTTING RULE, ON THIS CARD ─────────────────────────────────────────────
console.log("\n§6 · no text may leave its box, no matter how many lines it needs");
ok("6.1 ⛔ no truncate / line-clamp / nowrap anywhere in the card — the box grows, the words stay whole",
   !/\btruncate\b|line-clamp|whitespace-nowrap/.test(code("src/components/pwa/install-invite.tsx")),
   "clipping player copy is the defect; wrapping is the fix");
ok("6.2 the flex child that holds the copy carries min-w-0, or `truncate` could never engage and the text runs past the card",
   /min-w-0 flex-1/.test(inv), "measured shape of every clipping bug on this platform");
// ⛔ A NEGATIVE MARGIN IS HOW A CONTROL LEAVES ITS BOX, and this card shipped with two of
// them for exactly one live run: `-mt-1 -mr-1` on the dismiss button put the row 4px past its
// own content box — `div 302x137 in 298x137`, at every width and in all three languages.
// A screenshot cannot see 4px; `qa:install-shown`'s arithmetic caught it on the first drive.
ok("6.4 ⛔ no negative margins in the card — that is how a control leaves its box",
   !/-m[trblxy]?-[0-9]/.test(code("src/components/pwa/install-invite.tsx")),
   "measured live: -mt-1 -mr-1 overflowed the row by exactly 4px");
// 🔴 THIS CHECK WAS ITSELF A GREEN MEASURING THE WRONG THING, and test:ui-consistency is what
// caught it. It pinned the SPELLING `h-11 w-11` and called it "the 44px tap floor" — but
// `tailwind.config.ts:204-219` overrides `theme.extend.spacing` and there are no height/width
// extend keys, so spacing feeds both and **`h-11` renders 96px, not 44px**. The label said 44,
// the assertion enforced 96, and it passed. At 360px in Swahili that stole 52px from the copy
// column of the one card whose stated purpose is that no text leaves its box.
// ⛔ LITERALS, NOT `h-11 w-11`. Twelve other call sites in src/ carry a comment recording this
// exact fix; this is the thirteenth.
ok("6.3 the dismiss control meets the 44px tap floor",
   /h-\[44px\] w-\[44px\]/.test(inv),
   "a dismiss a player cannot hit is a trap — and `h-11` is 96px here, not 44px");

// ── §7 · STORAGE MAY THROW, AND THE ABSENT CASE MUST RENDER CORRECTLY ───────────────────────
console.log("\n§7 · every localStorage touch is wrapped");
{
  // ⛔ COUNTED, NOT SPOT-CHECKED. Every raw access must be inside the two helpers; a single
  // unguarded one takes the whole signed-in app to the error page, because this mounts in the
  // root shell — the exact failure `reality-check.tsx` records for sessionStorage.
  const raw = [...inv.matchAll(/localStorage\.(getItem|setItem|removeItem)/g)];
  const guarded = [...inv.matchAll(/try \{ [^}]*localStorage\.(getItem|setItem)/g)];
  ok("7.1 ⛔ every localStorage access sits inside a try/catch", raw.length > 0 && raw.length === guarded.length,
     `${raw.length} access(es), ${guarded.length} guarded`);
  ok("7.2 …and with no stored value it behaves as a first-ever visit — it does not appear",
     /catch \{ return null; \}/.test(inv), "failing CLOSED is the right direction for something whose only job is to ask");
}

// ── §8 · COPY, IN THREE LANGUAGES, AND THE MOUNT ────────────────────────────────────────────
console.log("\n§8 · trilingual copy and a real mount");
{
  const dict = read("src/lib/i18n-dict.ts");
  for (const k of ["installTitle", "installBody", "installCta", "installLater", "installIosHow", "installOtherHow"]) {
    const n = (dict.match(new RegExp(`^\\s+${k}:`, "gm")) ?? []).length;
    ok(`8.1 ${k} exists in all THREE locales`, n === 3, `${n} definition(s)`);
  }
  const shell = read("src/components/layout/app-shell.tsx");
  // ⚠️ ASSERT THE MOUNT, NOT THE IMPORT. A component that exists and is never rendered is this
  // platform's most repeated defect — E-226, E-227, E-232 and E-224's DAL filter.
  ok("8.2 ⛔ it is RENDERED by the shell, not merely imported",
     /<Suspense fallback=\{null\}><LazyInstallInvite \/><\/Suspense>/.test(shell), "importing is not mounting");
  ok("8.3 …and it is NOT session-gated — a visitor who has not signed up is exactly who benefits",
     !/session && <Suspense fallback=\{null\}><LazyInstallInvite/.test(shell), "");
}

console.log(`\ninstall-invite: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error("\n✗ §3 — the install invitation is not installable, not non-disturbing, or not out of the way.\n");
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("install-invite: OK — the app is installable, the invitation asks quietly, and it never covers a money control");
