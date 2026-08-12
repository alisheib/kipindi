# CLEANUP-MANIFEST — design-file reorganization, 2026-08-12

**Format per entry: path · why stale · what cited it · decision.**
Protections applied to every removal: archive copy first (verified), cite-check of markdown
links AND code-span paths, fix citers in the same commit. Archive root:
`F:\50pick-design-archive\2026-08-12-final\`.

## Context

Ali emptied `design-brief/` via Explorer at 18:58–18:59 on 2026-08-12 and dropped in the
returned round-2 kit zip. All deleted items were recovered from the Recycle Bin to
`…\2026-08-12-final\recovered-from-recycle-bin\` before any decision was taken
(v3 package verified complete: **267 files**, matching its own documented count).

## Entries

| Path (as it was) | Why stale | What cited it | Decision |
|---|---|---|---|
| `design-brief/handover-v2-2026-08-11/` (8 tracked .md + gitignored screenshots) | Round-2 commission SENT and its kit RETURNED + accepted — §0b's own rule: "when the round is sent, delete the folder and its .gitignore exception together" | `docs/DESIGN_AUTHORITY.md:85` (review banner) · `docs/README.md:55` (index row) — **both rewritten in this commit** | Deletion committed (Ali deleted on disk; archived at `recovered-from-recycle-bin\handover-v2-2026-08-11`) |
| `design-brief/handover-v3-total-2026-08-11/` (267 files, untracked) | Package for the ABANDONED total-replacement commission | nothing tracked cited it; its four live references were only copies there | Archived (recycle-bin recovery). Live references refiled: `docs/design-brief/handover-2026-08/{LAWS.md, INVENTORY.md, LANGUAGE-AND-CONTENT.md, integration-notes/INTEGRATION-REALITY.md}` |
| `design-brief/send/` (outbound tooling + 18MB commission zip, untracked) | Tooling for the abandoned total-replacement send | nothing | Archived (recycle-bin recovery), not restored to tree |
| `design-brief/00-NEXT-SESSION-PROMPT.md` (untracked, 13:03 version) | The superseded "assemble the total commission" brief — strategy abandoned same day | nothing tracked | Archived (recycle-bin recovery). Will be REPLACED at session end by the new next-session prompt (tracked, per new .gitignore exception) |
| `design-brief/50pick-design-handover-v2.zip` · `-v3.zip` (untracked) | Snapshots of the two packages above | nothing | Archived (recycle-bin recovery) |
| `design-brief/Reviewing shipping code files.zip` (the raw kit delivery) | Extracted and filed; a zip in the tree is a second copy | nothing | Archived as `kit-round2-raw-delivery-Reviewing-shipping-code-files.zip`, deleted from tree |
| `NEXT-SESSION-PROMPT.md` (repo root, untracked, 2026-08-10) | A stale brief two generations old, at a non-§0b path | nothing (root file, never tracked) | Archived as `stale-root-NEXT-SESSION-PROMPT-2026-08-10.md`, deleted |
| `scripts/build-design-handover.mts` (untracked) | One-shot generator for the abandoned total-replacement package: untracked, not an npm script, depends on `sharp` which is not in `package.json` (`test:orphans` would flag it) | only its own usage comments + the superseded brief | Archived as `build-design-handover.mts`, deleted from tree |
| `.gitignore` handover-v2 exception block | The review window it created is closed | — | Replaced with the plan-document exceptions + `design-brief/**/*.zip` ban |

## Where things now live (the clean structure)

```
docs/DESIGN_AUTHORITY.md                                  THE rulebook (unchanged role)
src/app/globals.css · motion.css                          the values (unchanged role)
docs/design-system/v2-2026-07-27/                         July delivery archive (frozen)
docs/design-system/v3-2026-08-11-landing-discovery/       round-2 kit, raw + ACCEPTANCE.md   ← NEW
docs/design-brief/                                        commission records (INTAKE, AUDIT…)
docs/design-brief/handover-2026-08/                       LAWS · language corpus · inventory ← NEW
design-brief/PLAN-OF-RECORD.md                            the living inheritance plan        ← NEW
design-brief/CLEANUP-MANIFEST.md                          this file                          ← NEW
F:\50pick-design-archive\2026-08-12-final\                everything removed, verified
```

## Round 2 of cleanup (same day, Ali's re-scope: "dedicate this session to cleaning")

| Path | Why stale | What cited it | Decision |
|---|---|---|---|
| `docs/design-system/v2-2026-07-27/03-glyphs/` (41 files: 39 SVGs + README + contact-sheet) | Describes a 39-glyph corpus at 1.5/1.85px stroke; the live corpus is `src/components/ui/glyphs.tsx` — 178 keys @ 1.9px. INVENTORY.md's own warning: "Do not hand that folder to the designer as the glyph inventory" | 4 prose citers: `docs/design-system/README.md:131` · `v2-2026-07-27/00-START-HERE.md:24` · `v2-2026-07-27/06-patterns-and-rules/RULES.md:48` · `docs/design-brief/handover-2026-08/INVENTORY.md:307` — **all four annotated in the same commit** | Archived to `…\2026-08-12-final\stale-glyph-archive-03-glyphs` — verified 41 files / 22,866 bytes both sides — then `git rm` |

**Old-version sweep results** (`*-old*` / `*-v1*` / `*backup*` / `*.zip` under `docs/` +
`design-brief/`): only false positives and out-of-scope items —
`docs/BACKUP-RUNBOOK.md` (a runbook *about* backups — live doc, kept) ·
`docs/runbooks/updown-assets/07-thresholds.png` (matched "old" inside "thresh**old**s" — kept) ·
`03-glyphs/svg/backup.svg` (a glyph *named* backup — went with its folder above).
Out of design scope, noted for an ops session, NOT touched here: root `_playbook-old.bundle`,
`tsconfig.backup.json`, `backups/` (ops scratch), `scripts/live/ops/house-money-census.cjs`
(another session's in-flight file). Zero stray zips remain under `docs/` or `design-brief/`.

## Protected, deliberately NOT touched

- `.dc.html` previews with sibling `theme/` folders (`v2-2026-07-27/05-pages/theme`,
  `…/09-needle/theme`) — wrongly deleted once before; never again.
- `.qa-*` scratch dirs (74 scripts cited by docs).
- The unreferenced 8-key glyph family inside `glyphs.tsx` — a design decision, not cleanup.
