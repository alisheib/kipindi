# Lane DOORS — S5 round 2 (the Millionea cards and their ghosts, `/markets` loading, /results' section, /positions row)

- Tree `C:/50pick-ssd/kipindi-mln-ddoor` · branch `claude/maswali-s5-r2-doors` · head `410997dc7` (WIP, unverified:
  maswali-player-shots clicks /^Buy ticket/ — SLIP renamed it "Cut ticket"; shootDoorPreview asserts /results' empty state when
  there are no weeks, because a STAFF_PREVIEW server's seed answers 409). `5849ce9e3` and `ed12bcf35` are verified.
- Step `S5-R2-DOORS` · ports 3530–3539 · `KP_SCRATCH_PORT=5483` · scratch `$F/doors/` · slots `bash $S/mln-slot-s5x.sh doors …`.
- Critic reports: `$S/critics/R1-doors.md` and the card row of `$S/critics/R1-motion.md`.
- Read `$F/briefs/S5-R2-COMMON.md` first. Your earlier jobs: `$S/s5ddoor/job-doors.sh`, `$S/s5ddoor/job-preview.sh`.

## LEFT (in order)
1. ⛔ THE DARK-SAFETY BLOCKER — first, before anything else. `src/app/markets/loading.tsx:16` (your `ebb6caa5f`) ALWAYS passes
   `millionea={millionea}` and `preview={…}` to the client `MarketsGhost`, so every visitor's /markets payload carries
   `"millionea":false`. qa:live's dark section fails it ("/markets carries no Millionea entry, and no Millionea prop in its
   payload, for a signed-out visitor …"), and that rule covers WITHDRAWN too, so PRODUCTION would trip it.
   - Fix with the root `src/app/loading.tsx:28` shape (D3's pattern): hand the props only when true —
     `{...(millionea ? { millionea: true as const, ...(preview ? { preview: true as const } : {}) } : {})}`.
   - The same rule for EVERY place a `millionea=` / `preview=` prop reaches a client component (8 places at `db563dd9b` —
     `git grep -n "millionea=" -- src`), including `src/components/journey/route-ghost.tsx:118` ("/", PLATFORM's D6 — fix the
     shape there too and tell the lead). Server-only components that never serialise the prop may stay; prove which is which.
   - Guard + plant: no Millionea prop in the RSC payload for a signed-out visitor while WITHDRAWN and while STAFF_PREVIEW, on
     every page those components render on (not only `/` and `/markets` — `scripts/live/millionea-dark.mjs:93` checks only those
     two signed out; extend the LOCAL door drive with signed-in `/positions` and `/updown/history` payloads).
   - Re-pin your markets-ghost / journey-question pins; run qa:live's dark section locally (a server on WITHDRAWN, one on
     STAFF_PREVIEW) and the door drive.
2. Release-only red you own: `test:maswali-fence` 5.1 — an `=== "UPDOWN"` branch in `src/app/results/millionea-results-view.tsx`
   (1) is not in the census → classify it with its reason (or remove the branch if it is not needed).
3. Verify the WIP `410997dc7`; then `job-doors.sh` (the ACTIVE door drive) and `job-preview.sh` (qa:maswali-door-preview —
   expect 100/0). Read the scripts first, re-point paths, run through your slot. Read every tile they produce.
4. Readers of every changed file + red twins; doors (floor 56), design, r9a, r4j, i18n, dead-css, guards-exist; tsc.
