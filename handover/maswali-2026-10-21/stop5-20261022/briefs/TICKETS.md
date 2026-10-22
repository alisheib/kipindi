# Lane TICKETS — S5 round 2 (`/millionea/tickets`, a ticket `/millionea/tickets/[serial]`, the receipts)

- Tree `C:/50pick-ssd/kipindi-mln-dtkt` · branch `claude/maswali-s5-r2-tickets` · head `9dcd6fc6e` (WIP: the kit EmptyState's
  opt-in `bodyPart` — `emptyStateBody(body, part?)` — and the client wrapper `tickets-empty.tsx` passing `numeralRuns`;
  11.2 byte-identity vs 7e9a314f0 for every empty/notice body + 2 plants; r4k/r3c re-pinned). tsc last ran at
  `908a261b6`, so `5e57b5867`, `c60894b88` and `9dcd6fc6e` are untyped.
- Step `S5-R2-TICKETS` · ports 3570–3579 · `KP_SCRATCH_PORT=5487` · scratch `$F/tickets/` · slots
  `bash $S/mln-slot-s5x.sh tickets …`.
- Critic report: `$S/critics/R1-tickets.md`. Read `$F/briefs/S5-R2-COMMON.md` first.

## LEFT (in order)
1. tsc (slot) on your head; fix what it finds.
2. Finish and verify the WIP: the kit EmptyState change is SHARED KIT — prove it byte-identical for every caller that
   does not pass `bodyPart` (every EmptyState/notice body in the app, three languages), guard + plants; run every reader of
   `src/components/ui/empty-state*` and the tickets files (`git grep -l`), the red twins; tickets (floor 41), ui, design,
   hub, journey-tickets, millionea-shell.
3. Targeted shots: `list-empty-*` (your shot script) at 320/360/1280 × sw/en/zh — read them.
4. Main's CI fails `test:visual-pass-r7c` 2.1 at `src/components/maswali/maswali-ticket.tsx:249` (a tracked label at the end
   of a justify-between keeps its trailing tracking). Run r7c on your branch; if it still fails there, fix it.
5. Your branch edits the CLASSIC `src/components/markets/win-celebration.tsx` (via the platform win seal: a 6–7-digit amount no
   longer wraps). Keep it minimal and intended; list it in your report as a classic-visible change so the parity compare
   names it.
6. In your report: what the hub must pass through `bodyPart` for its no-week clock (HUB waits on it).

The proof of REGISTER's ledger-note fix on `ticket-wonBig-sw-320` (your F row Visual 9 → 10) comes from the integrated render.
