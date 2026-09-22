# ▶ RESUME HERE — House Bots

**This file is the one stable address of the house-bots programme.** Whatever else changes, a session told
only *"continue the house bots development where it was"* starts here, and nothing else needs to be known.

---

## 0 · Do this first

```bash
git fetch
git checkout bot-flow-seal && git merge --ff-only origin/bot-flow-seal   # never rebase
git merge origin/main                                                     # if main has moved
```

- **Worktree:** `C:/kipindi-house-bots` on Ali-Blade15. ⚠️ Older prompts say `F:/…` — **there is no F: drive**;
  the trees are `C:/kipindi-house-bots` and `C:/kipindi-main`, and memory is `C:/Users/Ali/.claude/…`.
- **Branch:** `bot-flow-seal`. `main` is pushed from `C:/kipindi-main` as a **pure ref update**, never forced.
- **The live desk's master switch is OFF and no session ever turns it on** — that is the owner's own act.

## 1 · The current state, and what is next

👉 **`plans/house-bots/NEXT-SESSION-2026-09-23.md`** — what shipped with its proof, what the two audit
lenses MEASURED (register F is discharged), the five findings still open, and how to stand the instruments up.

Older sessions, kept as the record: `NEXT-SESSION-2026-09-22.md` (the 2026-09-22 register),
`00-NEXT-SESSION-PROMPT-2026-09-23.md` (the owner's brief for this session).

## 2 · The authorities — read these before changing behaviour

| What | Where |
|---|---|
| Every rule field, and the engine's own reading of it | `docs/HOUSE-BOTS.md` §5 |
| The console flow an officer walks | `docs/HOUSE-BOTS.md` §7 |
| The verification record — every suite number and its mutations | `docs/HOUSE-BOTS.md` §12 |
| What an officer types to switch the desk on | `plans/house-bots/SWITCH-ON-SHEET.md` |
| The long-running status board | `plans/house-bots/PROGRESS.md` |

## 3 · The rules that do not bend

1. The **production master switch is never touched**, and no production write is ever made.
2. A production READ is **SELECT-only**, ids redacted, ages computed in SQL.
3. The repository is **PUBLIC**: no account id, holder name, note text or switch-on reason in any file.
4. **No house vocabulary on any player surface**, and none on the console either (ruling 453 — the console's
   copy is lexicon-scanned; say "account", never "bot").
5. Never `git checkout --` / `restore` / `stash` / `reset --hard`; never `git add -A`.
6. A `red:*` gate **mutates tracked files in place**. It refuses a dirty tree, and two at once in one tree is
   how a live guard gets left disabled while the harness reports clean.
7. Heavy Node through the shared lock: `bash ~/heavy-node-lock.sh run <who> <cmd>` — this laptop's RAM is
   failing and two builds at once bluescreen it.

## 4 · The gates

```
npm run -s typecheck
npm run -s test:house-bot-rules          npm run -s test:house-bot-disclosure
npm run -s test:house-bot-surfaces       npm run -s red:house-bot-console
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-console   # DB-backed, both stores
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-engine
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-money
KP_SCRATCH_PORT=5453 npm run -s test:dal-parity
KP_SCRATCH_PORT=5453 npm run -s qa:house-bot-fleet       # lanes A–M; KP_FLEET_SILENT=1 is its meta-mutation
npm run build && npm run -s verify:house-bot-bundle
```
Browser gates need a served desk — the recipe is in `NEXT-SESSION-2026-09-23.md` §4.
