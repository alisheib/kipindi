# S14 integrated local frame diagnostic — 15 October 2026

This is a **local diagnostic of source `20c49f568834c4257d2fd671a9b148cab1ca66dc`**. The release branch advanced after capture. Rerun the frame matrix and focused closure on the final release commit before treating this as final source-bound release evidence. The disposable server used an in-memory store, synthetic players and markets, and mock payment rails. It made no production payment or bet.

## Reproduction and evidence

- With a clean Next dev cache and the synthetic staff preview server on `http://localhost:3054`, run `KP_BASE=http://localhost:3054`, `KP_SOURCE_SHA=<current full git SHA>`, and `KP_SHOTS=<external output directory>` with `npm run qa:s14-frame-matrix`. The exact run captured **201/201 tiles** at widths 320, 360, 390, 768, 1024, 1280 and 1440 in Swahili, English and Chinese for guest and signed-in journey states, including 320×640 short screens, 360×400 focused screens and 360×340 keyboard emulation. There were **0 missing selectors, 0 horizontal overflows and 0 page errors**. The 72 browser warnings were the expected pair of service worker registration warnings for 36 blocked registrations under Playwright.
- With `KP_S14_CLOSURE_OUT=<external output directory>` and the same source pin, `npm run qa:s14-frame-closure` passed **24/24** assertions. It exercised first-visit How-to, end-of-list footer order, two-sided funded estimates and commission copy, low-balance calculation, 360×400 payment control reach, personalized daily ceiling at TZS 1,500 and below-minimum TZS 500, one paused mock wallet rail, history return, focus, Escape and Back, a held bet action, and an inline refusal. One local `net::ERR_FAILED` console entry was caused by the test deliberately aborting the held action to exercise refusal; no closure assertion failed.
- The [redacted digest](s14-integrated-frame-diagnostic-digest-20261015.json) records every tile's viewport, file name and SHA-256, all 24 closure results, SHA-256 hashes for 16 contact sheets and 12 closure screenshots, and hashes of the complete local manifests. The full synthetic captures remain at `C:\50pick-ssd\s14-integrated-20c-matrix-v2\` and `C:\50pick-ssd\s14-integrated-20c-closure\`. Raw images are not committed.

## Visual read

I inspected all 16 contact sheets covering the home page, How-to sheet, guest bet sheet, low-balance sheet, deposit page and funded edit sheet at mobile and desktop widths, and representative short-height and keyboard frames at original resolution. The sheets retain a visible close control, legible hierarchy and reachable primary action. Deposit rails and amount chips remain in the page scroll at narrow widths. No new clipped text, colliding controls, or broken alignment was visible in these local fixtures.

At a simulated 360×340 keyboard viewport, the bet sheet scrolls part of the question beneath the top fade so the focused amount field and primary action remain visible. This is a compact-height behavior, not proof that every device keyboard behaves identically. The 320-pixel Swahili home card also ellipsizes the full fixture title; the question remains readable in the opened sheet. The Chinese fixture retains an English market title because that fixture has no translated question. **H09 remains open** until the approved production short-title card is rendered and read; this local fixture cannot close it.

## Remaining S14 gates

The final release SHA needs its own source-pinned frame read. Production short-title coverage (H09), the named staff TZS 1,000 production money journey, and written agency visual approval remain separate gates. This diagnostic does not assert production rendering, real provider callbacks, staff transaction proof or agency sign-off.
