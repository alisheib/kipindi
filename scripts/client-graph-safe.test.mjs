/**
 * NO CLIENT-REACHABLE MODULE MAY REACH THE PRISMA CLIENT THROUGH ITS IMPORT GRAPH.
 *
 *   npm run test:client-graph-safe
 *
 * ⛔ WHAT THIS EXISTS TO STOP (L17, ruling 526), measured on `main` 2026-09-20. `src/lib/utils.ts` is imported by
 * 216 files, many of them `"use client"` components, and it imported `getPlatformTimezone` from
 * `@/lib/server/platform-config`. That module imports `./config-store`, which imports `./prisma`
 * (`config-store.ts:11`), as does `./audit` (`audit.ts:40`). So a client component's dependency graph ran all the
 * way to the Prisma client, and the ONLY thing keeping every model name out of a public chunk was the bundler's
 * tree-shaking — a property of the build, not of the source.
 *
 * ⭐ AND THE EXISTING GUARD RUNS TOO RARELY TO DEFEND IT. `verify:house-bot-bundle` inspects the REAL built
 * artefact, which is stronger evidence — but only at a commit close and at REL-0. A refactor between two closes
 * (a re-export, a side-effecting import, anything that defeats tree-shaking) ships the names and nothing goes red
 * until the next close. Ruling 526: "a latent disclosure whose only defence is a bundler's current behaviour is
 * not defended." This is the cheap check that runs every time, beside the expensive one that runs rarely.
 *
 * ⛔ WHAT IT DOES NOT CLAIM. It walks the SOURCE graph, not the bundle. A module it calls clean can still be
 * pulled in by a path this walker cannot see (dynamic import, a barrel re-export it fails to resolve). It is a
 * ratchet against the obvious regression, not a substitute for the artefact check. §0 proves the walker works at
 * all before any verdict is read — a graph walker that silently resolves nothing reports everything as clean.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve as pres } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
let pass = 0;
const failures = [];
const ok = (l, c, x = "") => { c ? pass++ : failures.push((l + " " + x).trim()); console.log("  " + (c ? "\u2713" : "\u2717") + " " + l + (x ? " " + x : "")); };

const resolveSpec = (from, spec) => {
  let p = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? pres(dirname(from), spec) : null;
  if (!p) return null;
  for (const e of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const c = p + e;
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

/** Walk the VALUE-import graph. `import type` is erased at build and is deliberately not followed. */
const reaches = (startRel, targetRe) => {
  const start = join(SRC, startRel);
  if (!existsSync(start)) return { hit: null, walked: 0, missing: true };
  const seen = new Set(); const stack = [start];
  while (stack.length) {
    const f = stack.pop(); if (seen.has(f)) continue; seen.add(f);
    if (targetRe.test(f.split("\\").join("/"))) return { hit: f, walked: seen.size };
    let s; try { s = readFileSync(f, "utf8"); } catch { continue; }
    for (const m of s.matchAll(/^[ \t]*import\s+([^;]*?)from\s+["']([^"']+)["']/gm)) {
      if (/^\s*type\b/.test(m[1])) continue;
      const r = resolveSpec(f, m[2]); if (r) stack.push(r);
    }
  }
  return { hit: null, walked: seen.size };
};

const PRISMA = /lib\/server\/prisma\.ts$/;

console.log("\n[client-graph-safe] \u00a70 CONTROL \u00b7 the walker works, in BOTH directions");
{
  /**
   * ⛔ THIS SECTION IS NOT CEREMONY. The first version of this walker was written as a shell one-liner whose
   * escaping was mangled; it reported "not reachable" for `platform-config.ts`, a module that demonstrably
   * reaches prisma in two hops. A graph walker that resolves nothing calls the whole codebase clean, and its
   * output is indistinguishable from a real pass. So a positive control runs first, every time.
   */
  const pos = reaches("lib/server/config-store.ts", PRISMA);
  ok("\u00a70 POSITIVE \u00b7 config-store.ts REACHES prisma (it imports it directly)", !!pos.hit, "walked " + pos.walked);
  const neg = reaches("lib/platform-timezone.ts", PRISMA);
  ok("\u00a70 NEGATIVE \u00b7 a pure client-safe module does NOT", !neg.hit && !neg.missing, neg.hit || "clean");
  const srv = reaches("lib/server/platform-config.ts", PRISMA);
  ok("\u00a70 POSITIVE \u00b7 the server config module still reaches it, so the target is live", !!srv.hit, "walked " + srv.walked);
}

console.log("\n[client-graph-safe] \u00a71 client-reachable modules stay clear of the Prisma client");
{
  /**
   * The pinned set. `utils.ts` is the one the defect ran through (216 importers, many `"use client"`); the others
   * are the same shape — broadly-imported helpers with no business touching a database client.
   */
  const PINNED = [
    "lib/utils.ts",
    "lib/platform-timezone.ts",
    "lib/display-label.ts",
    "lib/status-tone.ts",
    // ⭐ ADDED 2026-09-25. Both are imported by `phone-input.tsx`, which is `"use client"`, and both
    // are also imported by server modules (`sms.ts`, `selcom.ts`, `wallet/withdraw/page.tsx`) — the
    // exact double-life this ratchet exists to police. They were NOT in this list, so the guard had
    // no opinion about them at all: a module can be client-reachable for months and this suite stay
    // green because it only ever walks what is named here.
    "lib/phone-normalize.ts",
    "lib/tz-msisdn.ts",
    // ⭐ The whole reason U3 exists: the GSM-7 table used to live in `lib/server/sms-blackball.ts`,
    // where a composer screen could not reach it without pulling the server graph into the browser.
    // It is pinned here from the commit that moved it, not from the commit that first imports it.
    "lib/sms-compose.ts",
    // ⭐ ADDED 2026-09-30 (Vodacom plan S1). The product's feature table, now also the new journey's rollout
    // ceiling and its one decision (`simpleJourneyFor`). Seven player routes import it, and its own header forbids a
    // server import; the database half lives in `lib/server/simple-journey-switch.ts` and must stay there.
    "lib/feature-state.ts",
    // The statutory footer a composer screen renders beside the body; it imports only app-url
    // and sms-compose, both zero-import, and must stay that way.
    "lib/marketing/footer.ts",
    // ⭐ ADDED 2026-09-30 (Vodacom plan S2). The short-title rules and the competition list lead the same double life:
    // the admin edit and the journey card (S7) render them in the browser, while `createMarket`, the narrow writer and
    // the AI generator read them on the server. `short-title.ts` imports only `localized.ts` and `sms-compose.ts`;
    // `competitions.ts` imports nothing; `competition-label.ts` is type-only. Pinned from the commit that adds them.
    "lib/markets/short-title.ts",
    "lib/markets/competitions.ts",
    "lib/markets/competition-label.ts",
    // ⭐ ADDED 2026-10-01 (Vodacom plan S3). The journey's estimate: the card and the sheet print it in the browser,
    // the sheet API prices it on the server. It imports only `payout.ts`, which imports nothing.
    "lib/markets/estimate.ts",
    // The card's close label: imports only `eat-day.ts`, which imports nothing.
    "lib/markets/card-close-label.ts",
    // The pending-bet link and the same-origin rule it shares with the login form: `safe-next.ts` imports nothing,
    // `pending-bet.ts` imports only it.
    "lib/safe-next.ts",
    "lib/journey/pending-bet.ts",
    // The referral-code rule (route audit 2026-10-06): imported by the client header and by server modules; imports nothing.
    "lib/referral-code.ts",
    // The doors' landing and header rules (2026-10-06): imported by the client header; imports only safe-next, referral-code and a type.
    "lib/auth-landing.ts",
    // The bet sheet's low-balance plan: imports only the deposit bounds from `validators.ts` (zod + id-documents),
    // which the deposit form already ships to the browser.
    "lib/journey/shortfall.ts",
    // The journey funnel's allow-list and wire body (S3b): the beacon builds with it, `/api/funnel` re-checks with it.
    "lib/journey/funnel.ts",
    // ⭐ ADDED 2026-10-01 (Vodacom plan S6 WP2). The new shell's client-side decisions. `surfaces.ts` was already
    // client-reachable (the Needle, the channels panel, the consent prompt and the install invitation import it) and is
    // pinned now; the tab table, the header's truth table and the flag hook are new, read by "use client" chrome and
    // overlays, and pinned from the commit that adds them. The first three import nothing; `journey-on.ts` imports only
    // React. ⛔ `lib/journey/viewer-doors.ts` is deliberately NOT here: it is server-only (it reads FEATURE_INVITE
    // through `inviteIsLiveFor`), and `test:journey-shell` §4 holds it out of every browser bundle instead.
    "lib/surfaces.ts",
    "lib/nav/active-tab.ts",
    "lib/journey/header-state.ts",
    "lib/journey/journey-on.ts",
    // ⭐ ADDED 2026-10-01 (Vodacom plan S6 WP3). The journey's unread counter: the rule its hook runs in the browser,
    // importing nothing. ⛔ The hook itself, `lib/journey/use-unread-count.ts`, is deliberately NOT pinned: it imports the
    // bell's own Server Action exactly as `notifications-panel.tsx` does, and this walker follows that import into the
    // server, where the bundler sends the browser only a reference.
    "lib/journey/unread-count.ts",
    // ⭐ ADDED 2026-10-01 (marketing U27a, decision M3: each unit pins its own src/lib/contacts files). The ONE parsed
    // shape every contacts-file reader returns, and the Excel cap, sniffer and refusal copy the import dialog shows
    // before posting. Both import nothing; `test:contacts-boundary` §2.4 fails if any src/lib/contacts module is missing here.
    "lib/contacts/parsed-file.ts",
    "lib/contacts/xlsx-limits.ts",
    // ⭐ ADDED 2026-10-01 (marketing U28a, pinned in U27a's integration pass under decision M3 — the U27a review
    // found them unpinned and `test:contacts-boundary` §2.4 red). The one field list and limits table every contacts
    // reader and writer shares, the CSV writer with its formula-guard pair, and the sample files. Each imports only
    // other src/lib/contacts modules and `tz-msisdn.ts`, both pinned here.
    "lib/contacts/contact-fields.ts",
    "lib/contacts/csv-write.ts",
    "lib/contacts/sample-sheet.ts",
    // Further src/lib/contacts modules present when U27a's integration pass ran (decision M3: every one is pinned).
    "lib/contacts/import-decide.ts",
    // ⭐ ADDED 2026-10-02 (marketing U26, decision M3). The vCard reader: OD29 parses a .vcf in the browser, and U25's
    // detectFormat will import its looksLikeVcard (C17). It imports only tz-msisdn.ts and contact-fields.ts (C20), both pinned.
    "lib/contacts/vcard.ts",
    // ⭐ ADDED 2026-10-02 (marketing U25, decision M3). The CSV reader: OD29 parses a CSV in the browser. It imports
    // only parsed-file.ts, vcard.ts and xlsx-limits.ts (C17: src/lib/contacts modules), all pinned here.
    "lib/contacts/import-parse.ts",
    // ⭐ ADDED 2026-10-02 (marketing U22, decision M3). The contact form's live number verdict: the Add a contact dialog
    // runs it in the browser on every keystroke. It imports only tz-msisdn.ts, phone-normalize.ts and (vb7, the paste's
    // length limit) contact-fields.ts, all pinned here.
    "lib/contacts/contact-number.ts",
    // ⭐ ADDED 2026-10-02 (marketing U23, decision M3). The bulk bar's rules — the ONE tier rule, the per-number cap,
    // the tag and list-name checks and the wire shapes — read by the "use client" bar and by the server's service alike.
    // It imports only contact-fields.ts, pinned here.
    "lib/contacts/bulk-rules.ts",
    // ⭐ ADDED 2026-10-02 (marketing U29b, decision M3). The staging caps and the ONE packer: the import dialog packs its
    // batches with it in the browser and the server measures each batch with it. It imports two constants from
    // xlsx-limits.ts and types from contact-fields.ts and parsed-file.ts, all pinned here.
    "lib/contacts/import-limits.ts",
    // ⭐ ADDED 2026-10-09 (S15, decision M3). The importer's ONE contract — every request and answer between the import
    // dialog and its server actions, and the refusal sentences the dialog shows verbatim. Types, constants and pure
    // helpers only; it imports types alone, from contact-fields.ts, parsed-file.ts and import-decide.ts, all pinned here.
    "lib/contacts/import-flow.ts",
    // ⭐ ADDED 2026-10-09 (S15, decision M3). The browser's reader (a file or a paste → the one parsed shape, streamed) and
    // the ONE loop driver (the upload and the commit, the actions handed in): the "use client" import dialog runs both.
    // They import only src/lib/contacts modules, tz-msisdn.ts and phone-normalize.ts, all pinned here.
    "lib/contacts/import-read.ts",
    "lib/contacts/import-loop.ts",
    // ⭐ ADDED 2026-10-09 (S15 · C3b, decision M3). The ONE phone-cell rule — the first Tanzanian mobile among the numbers a
    // cell holds: the browser's reader (the list paste, the first-mobile column) and the server's staging, check and commit
    // all ask it. It imports only tz-msisdn.ts, pinned here.
    "lib/contacts/phone-cell.ts",
    // ⭐ ADDED 2026-10-01 (marketing S10, the pure engines): client-safe src/lib/marketing modules the composer, the
    // estimate and the confirmation will import into client components — each must stay free of the Prisma client.
    "lib/marketing/erasure-mark.ts",
    "lib/marketing/consent-basis.ts",
    "lib/marketing/campaign-template.ts",
    "lib/marketing/segment-cost.ts",
    "lib/marketing/campaign-estimate.ts",
    "lib/marketing/campaign-confirm.ts",
    // ⭐ ADDED 2026-10-02 (marketing U36, decision M3). The campaign list's ONE status vocabulary — the rail, the
    // outstanding/settled split, progress, attention, the stop-reason words and the screen flags. It imports nothing at
    // runtime (types only, from the store); U37's composer and U47's live page will import it into the browser.
    "lib/marketing/campaign-status.ts",
    // ⭐ ADDED 2026-10-04 (marketing U33w, decision M3). The marketing wordings' keys, suggestions and rules: the
    // "use client" Marketing wordings card on /admin/system validates every box live with them, and the server's
    // verified setter runs the same functions before it writes. It imports only consent-basis.ts, campaign-template.ts
    // and contact-fields.ts, all pinned above; the persisted half lives in lib/server/marketing/wordings.ts and must stay there.
    "lib/marketing/marketing-wordings.ts",
    // ⭐ ADDED 2026-10-06 (marketing U49s, decision E14). The Marketing SMS settings' shape, defaults, bounds and the ONE
    // rule: the "use client" Marketing SMS tab on /admin/system validates every box live with it, and the server's verified
    // setter refuses with the same function. It imports nothing; the persisted half lives in
    // lib/server/marketing/sms-settings.ts and must stay there.
    "lib/marketing/sms-settings.ts",
    // ⭐ ADDED 2026-10-07 (marketing U13, decision D13 · OQ5). The send window's ONE rule: the send path, the officer's test
    // send and the composer's Test card read it, and the card's words come from it. It imports only sms-settings.ts (pinned
    // above) and eat-day.ts (which imports nothing); the window's live reader lives in lib/server/marketing/dispatch.ts.
    "lib/marketing/window.ts",
    // ⭐ ADDED 2026-10-04 (marketing U33p, decision M3). The public policy lines' keys, today's text as defaults, the rules,
    // the page versions, and the promises the code keeps: the "use client" Public policy lines card validates every box
    // live with them, and the server's verified setter runs the same functions before it writes. They import only each
    // other, contact-fields.ts (pinned above) and eat-day.ts (which imports nothing); the persisted half and the pages'
    // wrapper live in lib/server/legal/policy-lines.ts and must stay there.
    "lib/legal/policy-lines.ts",
    "lib/legal/kept-promises.ts",
    // ⭐ ADDED 2026-10-03 (marketing validation batch 8). The staff screen's ONE reason and phone rules: the "use client"
    // staff forms check a role change's reason and an add-by-phone number in the browser with them, and the server
    // actions refuse with the same functions. It lives under lib/server for history and must stay pure: it imports only
    // `./roles` and `./field-error` (nothing), `./validators` (zod) and `contact-fields.ts`, pinned above.
    "lib/server/staff-roles.ts",
    // ⭐ ADDED 2026-10-01 (Vodacom plan S6 WP6a). Which unread counter may mount at this width — the bell from lg, the
    // Akaunti dot below it: a hook over the browser's media query, importing only React, loaded by the journey chrome.
    "lib/journey/one-poller.ts",
  ];
  const offenders = [];
  let checked = 0;
  for (const rel of PINNED) {
    const r = reaches(rel, PRISMA);
    if (r.missing) continue;
    checked++;
    if (r.hit) offenders.push(rel + " -> " + r.hit.split("\\").join("/").replace(SRC.split("\\").join("/"), "src"));
  }
  ok("\u00a71 ratchet \u00b7 every pinned module exists and was walked", checked >= 2, checked + " of " + PINNED.length);
  ok("\u00a71 no pinned client-reachable module reaches the Prisma client", offenders.length === 0, offenders.join(" | "));
}

console.log("\n" + (failures.length === 0 ? "ALL PASS" : "FAILURES") + " \u2014 client-graph-safe: " + pass + " passed, " + failures.length + " failed");
if (failures.length) { for (const f of failures) console.log("  \u00b7 " + f); process.exit(1); }
