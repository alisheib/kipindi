# DA19 blank client-render boundary diagnostic

Result: the empty digest is the locked framework's new browser-render bailout serialization. The evidence supports a compatibility defect in qa-chunks-prod's legacy-only digest rule; it does not establish a broken chat/primer UI, and the existing live gate remains failed until a reviewed repair is actually proven.

## Bounded observed evidence

- Exact deployed identity: da19e5a21a4aae56c8f9dfa49eb18e74d97c6f09. Retained exact-build six classic/journey HTML documents all contain exactly two `<!--$!--><template data-dgst=""></template>` boundaries, two digest templates, no `$RX`, and chatbotEnabled=true.
- Two selected live documents (WWW `/`, apex `/help`) were read by GET, HTTP200, with the same DA script deployment identity and the same boundary shape. Evidence.json records SHA256s and saved HTML filenames. There were four public GETs over the two diagnostic invocations, no non-GET, no browser, no server started, no money operation.
- Installed Next16.4.0 compiled ReactDOM server is 19.3.0-canary-278794d7-20261002. Actual required-server-files metadata has reactBrowserBailout=true and deploymentId=DA19.
- An offline render through the actual installed Next dynamic bailout component and compiled App Router React aliases produced the blank digest, zero ordinary onError calls, and one onBrowserBailout callback whose reason is next/dynamic. The identical component with the new flag disabled produced the old BAILOUT_TO_CLIENT_SIDE_RENDERING digest. An ordinary error produced ORDINARY_ERROR; an ordinary error whose handler supplied no digest produced a template WITHOUT data-dgst, which remains invalid.
- A foreign ReactDOM.browser bailout also produced an empty digest. Thus the digest format alone cannot establish component ownership. Do not broaden the guard to accept arbitrary blank errors globally.
- Unmodified qa:chunks-prod --self-test: 26 passed, 0 failed (offline). Existing six-route live failures have not been reclassified or waived. No A21 run was performed.

The first disposable SSR invocation mistakenly loaded the unaliased app React19.2.5 inside Next's dynamic helper while using the compiled ReactDOM renderer. That invocation is an invalid App Router runtime premise, not an application result. It reported ORDINARY_ERROR for the modern helper; the preserved invalid-unaliased-probe.json records this. The final invocation uses the installed Next require-hook to alias React/ReactDOM only inside that disposable process, matching the precompiled App Router. It modifies no installed file or running server.

## Actual source anchors

- node_modules/next/dist/server/config-shared.js:209 defaults reactBrowserBailout to true.
- node_modules/next/dist/build/define-env.js:125 defines __NEXT_EXPERIMENTAL_REACT_BROWSER_BAILOUT from that configuration.
- node_modules/next/dist/shared/lib/lazy-dynamic/dynamic-bailout-to-csr.js:22 selects React.use(ReactDOM.browser(next/dynamic reason)); the old throwing path is retained below it.
- node_modules/next/dist/shared/lib/lazy-dynamic/react-browser-bailout.js:33 binds the reason using Symbol.for across separately bundled copies.
- node_modules/next/dist/compiled/react-dom/cjs/react-dom-server.edge.production.js:4740 logRecoverableError routes a recoverable browser request to onBrowserBailout and returns an empty string.
- Same compiled renderer:7094 writes data-dgst whenever the digest is non-null, including the empty string.
- src/components/layout/lazy-overlays.tsx:27–28 declares exactly the ChatRoot and FirstVisitPrimer ssr:false loaders; lines49–50 mount chat conditionally and primer always. The loss guard and error propagation stay unchanged.
- scripts/qa-chunks-prod.mjs:257–261 rejects every digest other than the old BAILOUT string; this is the rule causing the observed failure.

Primary upstream comparison: [Next16.2.4 helper](https://raw.githubusercontent.com/vercel/next.js/v16.2.4/packages/next/src/shared/lib/lazy-dynamic/dynamic-bailout-to-csr.tsx) always throws the legacy BailoutToCSRError. [Next16.4.0 helper](https://raw.githubusercontent.com/vercel/next.js/v16.4.0/packages/next/src/shared/lib/lazy-dynamic/dynamic-bailout-to-csr.tsx) adds the browser() branch. [Next16.4.0 config](https://raw.githubusercontent.com/vercel/next.js/v16.4.0/packages/next/src/server/config-shared.ts) supplies the new default. This confirms a framework change, not merely a guessed app digest.

## Concrete next repair proposal, not implemented

Repair the served-reader digest contract for an explicit, attested Next16.4 browser-bailout profile while preserving legacy support. Require the live deployment identity to match the inspected build's Next version and reactBrowserBailout flag. Unknown profiles remain unmeasured/fail; never infer the profile solely because the observed digest is blank.

For robust ownership, add invisible `<template data-csr-owner="chat-root">` and `first-visit-primer` fallbacks via the loading option of ONLY the two existing ssr:false dynamic declarations. Their existing Suspense boundaries do not increase; the fallback templates are inert and portal behavior stays intact. The reader can then parse each whole boundary and accept a blank digest only inside exactly the expected owned overlay slot. Keep the RSC chatbot boolean census: chat true must have exactly these two owners; chat false only primer. Reject duplicates, unknown owners, wrong placement or a missing owner. Bind the owner annotations to the exact source loaders and conditional mounts so renaming an unrelated bailout as chat is caught by controls. This changes a small amount of inert SSR markup and therefore requires the existing shell/skeleton parity authority and exact new golden review; do not silently normalize the new markup away.

Keep all 26 existing controls and file/status/classic-marker/journey-isolation rules. Add modern-profile positive fixtures and actual installed-renderer proof; same-verdict negatives must cover blank stray templates, extra browser bailout, missing data-dgst, wrong nonempty/404 digest, $RX, missing/unreadable chatbot, duplicate owner, and same-count foreign-owner substitution. A source plant that relabels a real unrelated bailout as an allowed owner must fail. Without ownership metadata, a compatibility-only empty-digest allowance must clearly disclose that same-count unrelated browser bailouts cannot be distinguished from the two overlays; it should not claim that stronger negative guarantee.

This is a next-session repair proposal. No product/QA source was edited, no check result waived, and no deployment made by this diagnostic.
