The four remaining empty-state findings are ownership errors in the heading-pairing audit. Watchlist, Notifications, Receipts and the Resolver queue replace a single collection, rather than a titled subsection of a page with several sections. Keep their existing boxed, centered layouts.

This follows the page/tab replacement ruling in `scripts/responsive-audit.mjs` (PV-03, lines 151–190), the re-derivation of Notifications in `docs/PLAYER-VISUAL-2026-09.md` (PV-03), and EmptyState's existing opt-in `fill` contract. The seven historical fallback exceptions remain exactly unchanged. No new route exception is added.

The enclosing content owner now declares `data-empty-state-owner="collection"`. PageContainer exposes a typed `emptyStateOwner="collection"` for the three player pages; Resolver queue declares the same relationship on its existing AdminBody. These are inert attributes: no width, padding, DOM wrapper or empty-state presentation changes.

The evaluator first looks for a closer local titled scope. That relationship keeps the existing 24px heading-alignment rule, even when an outer collection is declared. A PageContainer's page h1 does not introduce a local section. Other local headings, including a section h1, retain their ownership. Only an explicitly declared whole-collection replacement receives the following hard checks:

- Center against the owner's actual content box, subtracting its border and padding; at most 1px rounding difference.
- The existing boxed cap: width equals `min(360px, content width)`, within 1px.
- The entire empty box remains inside the owner's content box and is not cropped by intrinsic or nested clipping.
- The primitive still declares its boxed variant.

Failures of this contract are hard audit failures, including on a historically excepted route. Missing ownership is never synthesized as a successful centered relationship.

Before this amendment, all eight actual English app screenshots (four routes at 320/1280, exact commit `5f3ad45c0a1545b4f3ae217d919cc7126ad757e8`) were physically read with loaded project fonts and zero console/page errors. All measured true content-center deltas were 0px. Desktop false page-title deltas were respectively 428/328/328/320px. Evidence: `F:/50pick-work/generated/qa-whole-list-review/evidence.json` and its full-page originals. These screenshots establish the layout decision; they do not prove the new attributes are served.

The standalone actual Chromium DOM proof retains all 19 earlier hidden/scroll/association fixtures and nine evaluator mutants. It adds 15 collection geometry/ownership fixtures and seven evaluator mutants: 51 passed, zero failed, zero HTTP/asset requests. Off-center, oversized, undersized, stretched, clipped and out-of-content boxes fail; valid narrow and asymmetrically padded owners pass. Local titles, including an explicitly marked local h1 inside a PageContainer, defeat an incorrectly applied collection marker. The new fixture originals were physically read. Evidence: `F:/50pick-work/generated/qa-whole-list-ownership-controls/evidence.json`.

Status: IMPLEMENTED_AND_PURE_CONTROLS_VERIFIED; fresh app capture, integration and live release remain outstanding. Full typecheck passed with a bounded 2GB heap after memory became available. Measure-system (758 TSX files) and decomment (22 controls) passed. The earlier 1GB full-typecheck attempt exhausted its heap before reporting diagnostics; it is preserved as an invalid resource premise. No live claim is made.

The fresh app driver is `BASE=http://localhost:PORT node scripts/qa-whole-list-ownership.mjs` on an exclusively owned, empty in-memory server with local admin TOTP disabled. It reads eight real 320/1280 cells and applies three actual CSS negatives to each served empty (off-center, oversized, clipped), restoring each before the next. It refuses a configured database, verifies actual enclosing ownership, loaded project fonts, exact authenticated routes, and zero money/server actions; source hashes bind the evidence. This driver has not yet run on the amendment.
