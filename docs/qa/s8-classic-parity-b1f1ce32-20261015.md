# S8 classic parity v4, frozen integrated source b1f1ce32 — engineering evidence

**Formal result: red.** The strict v4 comparison passed 62 of 67 checks. Its five failing checks are real baseline differences after later visual, copy, font, and A21 work. This record classifies them as a proposed narrow exception; it does **not** replace the baseline, turn the strict comparison green, or close S8. [S8 WP12](../design-system/v5-2026-09-29-simplified-journey/S8-PLAN.md) requires zero differences and says S8 remains pending the S14 real staff production bet.

## Frozen source and complete capture

- Current served source: `b1f1ce32b00c2af8b716642fc63c05dd7268a08a`, in-memory Next development server, Chromium 147.0.7727.15. `/api/health` reported `database.configured=false`. Its served source was pinned before capture; the server was stopped afterward.
- Unchanged baseline: `ff8c731e240ffa86f8b024bb963e7718c31fff88`, captured 2026-10-14T11:31:09.760Z. File: `C:\50pick-ssd\parity\baseline-ff8c731e2-omega-compile01-20261014\parity-v4-ff8c731e2-omega-compile01-20261014.json`.
- Command: `KP_BASE=http://localhost:3043 npm run qa:classic-shell-parity -- --compare <baseline-file> --allow-base`. The unflagged attempt refused 20 intervening merge commits with rendered files. `--allow-base` bypassed only that ancestry safety check, not the 332-cell comparison. The baseline and harness were not rebaselined or weakened.
- Current full capture: `C:\50pick-ssd\parity\baseline-ff8c731e2-omega-compile01-20261014\parity-v4-ff8c731e2-omega-compile01-20261014.json.current.json`. Source SHA is embedded. All 224 shell, 8 Sell, 44 book, and 56 question cells were captured. Population, route/settle, raw shell trace, first-paint capture, and page-error checks passed. Sell's last cell was reached at 47 seconds, within its five-minute free window.
- An in-process `--prove-red` attempt on source-equivalent `64beb54e5` stopped during the first browser cell after a Next development navigation destroyed its execution context. This is **not** a current-tip red-control pass. Prior pre-D04 `7b6d2b082` in-process red controls passed 247/247. The independent exact-value exception verifier below passed its own three red plants on the b1f capture.

## Five strict failed checks

| Check | Cells differing | Exact regions/fields | Classification |
| --- | ---: | --- | --- |
| `4.1` classic shell | 224/224 | Header HTML/layout and footer HTML/layout in 224; rail layout in 224; `/positions` main layout in 24 | F03/F09/F13/F21/F23/F26/F30 header/footer changes; local font CSS changes every font-family signature. Rail and `/positions` changes are font-family only, with identical element path and box. |
| `4.4` Sell | 8/8 | Strip layout 8, button layout 8, held confirmation HTML/layout 2 | Strip/button change is font-family only with identical boxes. The two confirmation cells include F15b Callout spacing and static modal CSS (`048449961`). |
| `4.4f` Sell first paint | 8/8 | Script-held served strip/button layout in all 8 | First-paint HTML, paths and geometry are unchanged; the exact computed font-family signature changes after `61f8b918c`/`a38863edc`. This is a value difference, not an uncaptured first paint. |
| `4.8` classic book | 44/44 | Main HTML/layout 36, ticker layout 32, similar rail HTML/layout 8 | F02/F05/F06/F11/F17/F31/F33/F38/F39/F52/F53, S12 WP3/WP5 copy and kit work. Ticker changes are font-family only with identical boxes. `/live` adds the approved F38/F39 counter and loader changes. |
| `4.11` question | 56/56 | Main HTML/layout 56, panel layout 56 and HTML 14, holder layout 40 and HTML 12 | F11/F15b/F38/F40/F42 and S12 WP2/WP3 question/notice/copy changes, plus local font signatures. |

The 36 book `cards` fixture ID differences are excluded by the strict harness's own `fieldsOf` comparison; this record does not grant them an exception. No status, landing route, overlay, journey trace, raw shell trace, page error, region count, or head difference was found.

## Exact-value exception boundary

The [ledger](s8-classic-parity-exceptions-b1f1ce32.json) lists **1,534** phase/cell/field exceptions. Each key holds the SHA-256 of the exact decoded baseline and current value plus its named class. [The verifier](../../scripts/qa-s8-parity-exceptions.mjs) asserts source SHAs, matrix shape, all 332 cell keys, exact changed-field set, exact value hashes, and classification. A new changed field, changed approved value, missing exception, capture error, or changed font-only geometry/style fails. Three red plants changed an approved HTML value, a previously unchanged status, and geometry in a font-only region; all were rejected. Run `npm run qa:s8-parity-exceptions -- --verify <baseline> <current> <ledger>` and `--prove-red` with the same three paths. `--draft` generates a proposal and requires review; it does not change the strict v4 gate.

| Exception class | Fields | Source/ruling |
| --- | ---: | --- |
| Classic header; footer | 448; 448 | Later [visual audit](visual-audit-20261015.md) F03/F13/F23 and F09/F21/F26/F30. |
| Local font CSS only | 312 | `61f8b918c` vendored the **same 15 emitted WOFF2 files** from a successful build; `a38863edc` retained typography token stacks. `scripts/vendored-fonts.test.mjs` locks 59 face definitions, 15 binaries, three Latin preloads, and fallback metrics. This class is admitted only when `font-family` is the sole changed style and every element path and box matches. |
| Sell confirm Callout/modal | 4 | F15/F15b in `src/components/ui/callout.tsx`; `048449961` moved modal animation CSS out of inline HTML into loaded `src/app/motion.css`. |
| Book home/markets/live/results/watchlist | 16/16/16/16/8 | Classic V2 board/card/CTA and later F38/F39 kit work, by route. The 8 `/live` main HTML changes added after pre-D04 are exactly counter class `text-[10.5px]` → `text-caption` and loader `gap-2.5` → `gap-2` (`0b1dc4991`). |
| Similar rail | 16 | F38 chip and S12 WP5. Swahili `Hai sasa` → `Mubashara sasa` came from `3aca1ebd5`, S12 WP5 accepted by Ali on 2026-10-14. |
| Question main/panel/holder | 112/70/52 | F11/F15b/F38/F40/F42 and S12 WP2/WP3. Swahili holder `Imefunguliwa` → `Imewekwa` came from `0c6567c96`, S12 WP3 approved review 2. |

Representative decoded changes: the compact header mark's tap box grows **26×44 → 40×44** (F03); at 768 the header gutter shrinks **24px → 16px** (F13); at 1024 the footer's top margin shrinks **128px → 48px** (F09). The question category chip grows **12px type/25px box → 13px/27px** (F11); the small Callout changes `gap-2.5 rounded-md px-3 py-2.5` → `gap-3 rounded-control px-4 py-3` (F15b). The local font CSS changes a computed stack from `Inter, system-ui, …` to `Inter, "Inter Fallback", Inter, system-ui, …` while keeping the source WOFF2 faces pinned. This is why unchanged regions can still fail a strict computed-layout hash.

The pre-D04 7b capture to b1f comparison isolates the late font/CSS/live layer: 91,942 of 91,962 changed layout element lines include `font-family`. Of the 212 changed boxes, 162 are `/live`, 40 `/watchlist`, 8 `/markets`, and 2 Sell confirmation. The book `/markets` and `/watchlist` text widths move a few pixels despite identical HTML and pinned WOFF2 faces; their exact visual read remains an **open check** rather than a silently accepted font regression.

## Current-tip screenshot scope and retry recipe

Six b1f home CTA images exist at `C:\50pick-ssd\logs\s8-classic-final-b1f1\classic-home-cta-{320,360,1280}-{en,sw}.png`, with matching viewport images. The 320 Sw, 360 En and 1280 Sw frames were independently read by two reviewers: both CTA labels and boxes are unclipped with clear primary/secondary hierarchy. The screenshot script later failed on a Next development same-URL navigation; its final `evidence.json` was overwritten with an empty row list. Treat these six PNGs only as **scoped home evidence**. Sell, question and admin notice frames are **not yet captured** at b1f.

During the next visual window, use a fresh in-memory development server and context per locale/width. Follow the strict parity driver's `open()` in `scripts/qa-classic-shell-parity.mjs`: `page.goto(..., {waitUntil:'load'})`, wait for `main`, hydrate, settle three seconds, and if client navigation changes URL, wait for the second `load` and settle again. Capture home CTA at 320/360/1280 en/sw; held Sell dialog at 360 en/sw; question small Callout at 360 en/sw; and admin tax fallback notice at 320/1280 en. The Sell dialog's final gold action must remain untouched. Dev-test fixture doors return 404 in production mode. Read every screenshot for clipping, hierarchy and focus/tap geometry, and record served SHA and page URL. The existing narrow draft recipe is `C:\50pick-ssd\logs\s8-classic-visual.mjs`; replace its `domcontentloaded`/separate `document.fonts.ready` opening with the parity-style settle before rerunning it.

## Decision still required

The unchanged v4 baseline **does not** show zero differences, and no exact-tip full screenshot pass or current-tip in-process red control is claimed. The exact-value ledger gives the owner a reviewable superseding exception proposal, including its unresolved visual cells. Until an explicit plan ruling, formal S8 parity remains red. Under S8 WP12, S8 also remains pending the S14 real staff production bet even if engineering release proceeds on a separately approved exception.
