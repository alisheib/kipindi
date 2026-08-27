/**
 * Mutation anchors for `red:layout-staleness` — E-70, the values that freeze across a soft
 * navigation, and the balance chain that had a perfect read path and no writer.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` re-resolves every anchor below on every
 * run WITHOUT executing the harness, so an anchor that rots against edited source is caught
 * statically in a second instead of surfacing later as a phantom catch.
 *
 * ── ⭐ WHAT THE FLEET IS AIMED AT, AND WHY THESE ONES ──────────────────────────────────────
 * Two families, because the finding was two bugs wearing one mechanism:
 *   1. A per-page decision moved BACK into a layout, or a client re-derivation removed. Each of
 *      these is a real regression somebody could make while "simplifying" — and three of the five
 *      instances originally in the tree looked exactly like tidy code.
 *   2. A LINK IN THE BALANCE CHAIN DELETED. This is the family that matters most, because the
 *      chain crosses FIVE files and no single file looks wrong on its own. Before this work the
 *      pill subscribed, the hook bridged, the route allow-listed and the bus fanned out — and
 *      nothing emitted. Every mutation below restores that exact silence from a different file.
 */
const LEGAL_LAYOUT = "src/app/legal/layout.tsx";
const LEGAL_NAV = "src/app/legal/legal-nav.tsx";
const CRUMBS = "src/components/admin/admin-crumbs.tsx";
const SHELL = "src/components/admin/admin-shell.tsx";
const LOGIN = "src/app/auth/login/page.tsx";
const MARKET = "src/lib/server/market-service.ts";
const PILL = "src/components/layout/wallet-balance-pill.tsx";
const EVENTS = "src/app/api/events/route.ts";
const HOOK = "src/lib/use-event-stream.ts";

export const MUTATIONS = [
  {
    name: "the-legal-nav-goes-back-into-the-layout",
    why: "⭐ ALI'S ITEM 4, RESTORED. The client re-derivation is removed and the layout renders "
       + "nothing where the nav was. This is the shape a 'simplification' takes: a client "
       + "component that only reads the pathname looks like an unnecessary boundary.",
    file: LEGAL_LAYOUT,
    from: `        <LegalNav`,
    to: `        <div data-nav-removed`,
    check: "3.2 legal/layout.tsx hands the nav server-resolved LABELS and no route decision",
  },
  {
    name: "the-legal-nav-stops-asking-the-client",
    why: "The nav survives but reads a PROP instead of `usePathname()` — which is precisely the "
       + "state the bug was in, one layer down. ⛔ The import is removed too, or TypeScript's "
       + "unused-import tolerance would leave the pattern matching and the guard green over a "
       + "component that no longer asks anybody where it is.",
    file: LEGAL_NAV,
    from: `import { usePathname } from "next/navigation";`,
    to: ``,
    combineInto: undefined,
    check: "3.1 the legal nav Ali reported is a client component that reads usePathname()",
  },
  {
    name: "the-admin-breadcrumb-goes-back-to-the-header",
    why: "🔴 THE INSTANCE NOBODY HAD REPORTED — the trail froze on 47 admin pages while the "
       + "sidebar beside it was correct. Reverting the shell to build the trail from the `crumbs` "
       + "prop restores it, and it is the most plausible regression here because the markup used "
       + "to live in this exact file.",
    file: SHELL,
    from: `      <AdminCrumbs fallback={crumbs} />`,
    to: `      <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2">{crumbs.map((c, i) => <span key={i}>{c}</span>)}</nav>`,
    check: "3.3 admin-shell renders <AdminCrumbs fallback=…> rather than building the trail itself",
  },
  {
    name: "the-crumbs-component-trusts-its-prop",
    why: "The component stays, the boundary stays, and it silently believes the server value — "
       + "the failure mode a `fallback` prop invites. ⛔ A guard that only checked the component "
       + "EXISTS would stay green through this.",
    file: CRUMBS,
    from: `  const crumbs = pathname ? crumbsFromPath(pathname) : fallback;`,
    to: `  const crumbs = fallback;`,
    check: "3.1b the admin breadcrumb trail — the pathname is what DECIDES",
  },
  {
    name: "the-authed-bounce-stops-being-called",
    why: "⚠️ ASSERT THE CALL SITE, NOT THE SYMBOL. The helper keeps existing, fully written and "
       + "fully documented, and the login page simply stops calling it — which is the exact shape "
       + "of E-226, E-227 and E-224's DAL filter. The import is left in place deliberately, "
       + "because that is what makes this invisible to a reader.",
    file: LOGIN,
    from: `  await bounceIfAuthed();`,
    to: ``,
    check: "4.2 src/app/auth/login/page.tsx CALLS bounceIfAuthed()",
  },
  {
    name: "the-bet-stops-publishing-the-balance",
    why: "🔴 ALI'S ITEM 1, RESTORED FROM THE WRITE END. The bet commits, the odds are pushed, and "
       + "the player's own balance is not — which is the state production was in: a complete, "
       + "hardened, cross-container live path with nothing feeding it. ⛔ Note the pill, the "
       + "hook, the route and the bus are all UNTOUCHED by this mutation and all still look "
       + "correct; that is why the guard has to assert the chain rather than its links.",
    file: MARKET,
    from: `    void emitWalletBalances([userId]);
    return { ok: true as const, data: { value: paid, balance: newBalance } };`,
    to: `    return { ok: true as const, data: { value: paid, balance: newBalance } };`,
    check: "5.7 ⛔ RATCHET · every function that moves Wallet.balance also publishes it",
  },
  {
    name: "the-pill-stops-listening",
    why: "The other end of the same chain: everything emits, nothing receives. A reader of "
       + "`market-service.ts` would see a correct publisher and conclude the feature works.",
    file: PILL,
    from: `    window.addEventListener("50pick:sse:wallet-balance", handler);`,
    to: `    window.addEventListener("50pick:sse:wallet-balance-DISABLED", handler);`,
    check: "5.1 the pill subscribes to the balance event",
  },
  {
    name: "the-transport-drops-the-event",
    why: "⭐ THE SILENT ONE, AND THE REASON §5 SPANS FIVE FILES. `/api/events` keeps ONE of its "
       + "two allow-lists and loses the other. Nothing throws, nothing logs, no test outside "
       + "this suite touches that file, and the balance simply never arrives — the same class of "
       + "defect as a guard whose POPULATION silently shrank.",
    file: EVENTS,
    // ⛔ THE ANCHOR CARRIES `ALL_EVENTS`'s OWN DECLARATION, AND IT HAD TO. Written without it,
    // the two lines matched BOTH allow-lists — `ALL_EVENTS` and `USER_SCOPED` hold the same two
    // event names in the same order — and `test:red-anchors` refused to inject, statically, in a
    // second. That is the gate doing its job: an ambiguous anchor would have edited whichever
    // list came first and left the harness reporting a catch it could not attribute.
    from: `const ALL_EVENTS: SseEventType[] = [
  "market:odds",
  "wallet:balance",`,
    to: `const ALL_EVENTS: SseEventType[] = [
  "market:odds",`,
    check: "5.3 /api/events forwards wallet:balance — it is in ALL_EVENTS",
  },
  {
    name: "the-bridge-renames-the-window-event",
    why: "The hook keeps forwarding, to a name nobody listens for. Both halves of the bridge live "
       + "in one line, which is exactly how a rename passes review.",
    file: HOOK,
    from: `  "wallet:balance":   "50pick:sse:wallet-balance",`,
    to: `  "wallet:balance":   "50pick:sse:balance",`,
    check: "5.2 the SSE hook bridges wallet:balance onto that window event",
  },
];
