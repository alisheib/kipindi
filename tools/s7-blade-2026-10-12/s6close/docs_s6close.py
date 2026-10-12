"""S6 closes: the three plan docs (LF blobs from origin/main, edited in place). argv[1] = dir holding the LF copies,
argv[2] = JSON file with the measured results: {"parity": "...", "db": "...", "closed": "..."}."""
import sys, json, pathlib

NL = chr(10)
root = pathlib.Path(sys.argv[1])
R = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))


def load(name):
    t = (root / name).read_bytes().decode("utf-8")
    assert chr(13) not in t, name
    return t


def save(name, t):
    data = t.encode("utf-8")
    assert not [b for b in data if b < 32 and b not in (9, 10)], name
    (root / name).write_bytes(data)


def once(t, old, new, name):
    n = t.count(old)
    assert n == 1, f"{name}: {n} x {old[:70]!r}"
    return t.replace(old, new)


S6V = "design-system/v5-2026-09-29-simplified-journey/S6-VISUAL-PASS-STATE.md"
S7P = "design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md"

close = f"""**✅ S6 IS CLOSED ({R['closed']}) — the close record (the session law's three: `test:all` with the database suites,
classic parity, the tiles).** **`test:all`** on the live tree (`daf0e799`, 2026-10-12 02:05–02:19, `--jobs 2`): **501/525**,
every red read by its label — 17 database suites could not start their scratch cluster (this machine's PostgreSQL binaries
are a `--no-save` package, and the 2026-10-11 worktree-junction incident's `npm ci` had removed it: reinstalled and the 17
run again — {R['db']}); 5 need a running server (`test:responsive`, `test:motion`, `test:revoked-deadend`,
`test:admin-section-gate`, `test:needle-rest`, as at every close); `test:orphans` is main's own (two undeclared landing-v3
panels, `scripts/qa/landing-v3/panels/band-panel.js` and `hero-panel.js`); and **`test:visual-pass-r8d` 10.2 was round 10's
own** — a guard that compares app-shell.tsx with HEAD undid round 10's edit on the working side only, so it passed before
`177981c1` and failed once HEAD held the edit: fixed `eefc1eec` (both sides; 74/74, a planted code line caught). **Classic
parity** (rounds 9 and 10 together): baseline at `c2d9e156` (the live main before round 9), the tip `ca72fe15` compared
with `--allow-base` — {R['parity']} (A first compare at 02:05 was INVALID: Google Fonts was unreachable, so its server drew
fallback fonts and every header and footer line moved; it was re-run with a font check before and after.) **Tiles:**
round 10's 336, read by eight readers, and the follow-ups re-tiled (above). **Production** at `ca72fe15`: both hosts,
health, the service worker, the first-load chunks (01:37); `qa:live` 328/329 at 02:21 EAT — its one failure the QA
player's sign-in, which this machine has no password for, as on every push. The red twins the 2026-10-10 crash left owed
(`red:house-bot-c5`, `-money`, `-engine`, `red:campaign-visuals`, `red:contacts-import`) stay DROPPED by the efficiency
ruling: they prove other lanes' guards, which S6 never touched. The build plan was `S6-PLAN.md` (its Amendments
override its body); the visual pass's state, `S6-VISUAL-PASS-STATE.md`, and its reads, `S6-READ-TRIAGE.md`, stay as the
record. S7 starts (§0j).

"""

# ── VODACOM-PLAN.md ─────────────────────────────────────────────────────────────────────────────────────────────────
n = "VODACOM-PLAN.md"
t = load(n)
t = once(t, "**State (2026-10-11):** S6 (the flagged shell) is in progress (§0i): WP0–WP12 are live behind the flag, the S6 visual",
         f"**State (2026-10-12):** S6 (the flagged shell) is ✅ — CLOSED {R['closed']}, its close record the first ✅ paragraph\n"
         "below. S7 (home and cards, flagged) is in progress (§0j). S6's own history (§0i): WP0–WP12 are live behind the flag, the S6 visual", n)
t = once(t, "and its own read found no regression; ROUND 10 (S6-VISUAL-PASS-STATE\nappendix L) is the last S6 step.",
         "and its own read found no regression; round 10 (S6-VISUAL-PASS-STATE\nappendix L) is LIVE (`ca72fe15`, 2026-10-12 01:37 EAT).", n)
t = once(t, "**✅ ROUND 10 IS LIVE (2026-10-12 01:37 EAT, `ca72fe15`", close + "**✅ ROUND 10 IS LIVE (2026-10-12 01:37 EAT, `ca72fe15`", n)
old_next_start = "**Next:** (1) S6 — round 10 is LIVE; S6's close record runs now"
i = t.index(old_next_start)
j = t.index("Ali presses S1's preview switch.", i) + len("Ali presses S1's preview switch.")
assert t.count(old_next_start) == 1
new_next = ("**Next:** (1) S7 (§0j) — WP1's calibration on a fresh in-memory server under the lock (WP1 step 6): parity v3's\n"
            "`--prove-red` with its browser rows, the v3 baseline at WP1's commit (`9b18ea59`, branch `vodacom-s7-wp1b`), a null\n"
            "compare on a second fresh server; then WP1 lands on main; then WP2 (drafted on `vodacom-s7-wp2`) is rebased onto it,\n"
            "proven and pushed. OMEGA's own `vodacom-s7-wp1` (2026-10-07/08) was never pushed: on OMEGA push it only as\n"
            "`vodacom-s7-wp1-omega`, for reference, and never merge it (§0h point 66). S7's plan:\n"
            f"[`S7-PLAN.md`]({S7P}), whose Amendments override its body. (2) When\n"
            "Ali says so, and not before (nothing turns on until the plan is done): an officer approves the S2 short titles, and\n"
            "Ali presses S1's preview switch.")
t = t[:i] + new_next + t[j:]
t = once(t, "## §0i · S6 — the flagged shell (2026-10-01 →) 🔨",
         f"## §0i · S6 — the flagged shell (2026-10-01 → 2026-10-12) ✅\n\n"
         f"**✅ CLOSED {R['closed']}** — the close record is §0's first ✅ paragraph. S6's last v2 compare (S7-PLAN A2 item 3):\n"
         f"classic parity, baseline `parity-main-c2d9e156.json` captured at `c2d9e156`, the tip `ca72fe15` compared —\n"
         f"{R['parity']} From here on `qa:classic-shell-parity` may move to VERSION 3 (S7 WP1).", n)
s0j = f"""## §0j · S7 — home and cards (flagged) (2026-10-07 →) 🔨

**The plan:** [`S7-PLAN.md`]({S7P}) — WP0–WP12; its closing Amendments (A1–A23) override its
body. Owner-level calls: §0h point 58, and 65 on.

**Progress:**
- **Started 2026-10-07, before S6 closed, by Ali's choice** (S7-PLAN A2 item 4, the narrower overrule; §0h point 65):
  WP0 only, until §0i recorded S6's last v2 compares — it does since S6 closed ({R['closed']}).
- **WP0 · the start line.** (1) The precondition holds: S6 is closed (§0) and S7's trees are clean. (2) The scripts-only
  repairs are LIVE on main: `284f3bc7` (red:ticker-honesty's 28 cases declared in `scripts/anchors/ticker-honesty.anchors.mjs`
  and judged by the whole check id behind a control; test:stacking's primer checks renumbered 8.1–8.5;
  test:red-anchors' undeclared ceiling 65 → 64) and `ce2c3afa` (red:ops-provision-staff's six plants declared: 64
  against 64). Their proof, on OMEGA-COMPILE01 on 2026-10-08: red:ticker-honesty alone 28/28 with the tree unchanged
  after; test:red-anchors 4865/0; test:stacking 129/129; red:simple-journey-flag 37/37 (the twin as money doors'
  release left it, A3 item 3). (3) Today's reds, by label: S6's close `test:all` on `daf0e799` (§0's first ✅ paragraph)
  — {R['db']}; with `eefc1eec`, what stays red is the five suites that need a running server and main's own
  `test:orphans` (two landing-v3 panels). (4) **The bar budget (A5), measured on main `daf0e799`** (2026-10-12 02:44, a
  local in-memory server, Google Fonts checked before and after, 82 s, no problem): the journey header and the preview
  marker read on `/` for a pass holder; the announcement published through /admin/system by a seeded admin, as an
  operator would; the away summary from its ledger as `recordAway` writes it, then a reload; the session-ended notice
  after a second sign-in and a refresh flight on /live (the tabs stay up); the rail's top at 640, 740 and 844 tall; the
  headline (`headlineAsk` + `headlineSides`) in each A16 rung. Heights in px:

  | cell | header | marker | announcement | away summary | session ended | rail top 640 / 740 / 844 | rung holding two lines |
  |---|---|---|---|---|---|---|---|
  | 360 sw | 56 | 112.8 | 60.8 | 94.9 | 130.6 | 575 / 675 / 779 | text-display-3 (36/40), 80 |
  | 360 en | 56 | 112.8 | 60.8 | 94.9 | 130.6 | 575 / 675 / 779 | canvas (30/1.12), 67.2 |
  | 360 zh | 56 | 94.9 | 60.8 | 94.9 | 78.6 | 575 / 675 / 779 | --type-display-2 (44), 98.6 |
  | 390 sw | 56 | 112.8 | 60.8 | 94.9 | 78.6 | 575 / 675 / 779 | text-display-3 (36/40), 80 |
  | 390 en | 56 | 112.8 | 60.8 | 94.9 | 78.6 | 575 / 675 / 779 | canvas (30/1.12), 67.2 |
  | 390 zh | 56 | 94.9 | 60.8 | 109 | 69 | 575 / 675 / 779 | --type-display-2 (44), 98.6 |

  Card 1's picks against the rail's top (A5 item 1's stack: PageContainer's 32 top, the How-to card 72, the chips 44,
  the card's meta 18, its title 24 or 48, its picks 64 or the grown 74, the gaps), every combination: **GATED — every
  cell holds.** No transient bar (360×640, 360×740, 390×844; 36 combinations): least slack 44.4 (360 zh at 640, a
  two-line title and 74px picks). All bars at 390×844 (guest and signed in; 24): least 78.6 (zh, signed in). The How-to
  card's bottom: least 223.6. **RECORDED, never gated** — all bars at 360×640 and 360×740 (48 combinations): 31 are over
  the line, by up to 128.4 (360 sw, a guest at 640: the announcement and the two-line session-ended notice, 191.4
  together); the best +54.1. So no bar-budget point is raised before WP7 (§0h point 67). (5) **Every S7-PLAN citation
  re-read at `daf0e799`** (727 commits after the amendments' base): 439 line citations — 112 unchanged, 274 moved, 42
  changed, 11 gone — and 82 file checks; what changes a package is S7-PLAN's new amendment A24 (among it: `/` now has
  `generateMetadata` and asks the resolver itself; the root loading's journey ghost; dates through `formatEatDateTime`;
  the helpline's new names; a second `nothingIfLost` copy for A13; test:stacking 6.1 green). **WP0 is ✅** with this
  record.
- **WP1 · parity v3 and A9's three tools — branch `vodacom-s7-wp1b`** (worktree `C:\\kipindi-s7` on ALI-BLADE15). The
  version OMEGA-COMPILE01 wrote on 2026-10-07/08 (branch `vodacom-s7-wp1`) was never pushed, so no other machine had
  any of it (§0h point 66). The three tools are recovered from the broken copies OMEGA's mutation runs pushed to
  `origin/vodacom-visual-tools` (tools/s7a9a, tools/s7a9b) — each original is one copy with its one mutation reversed,
  and re-applying every mutation reproduces every other copy byte for byte — plus OMEGA's calibration patch
  (Turbopack's dev chunk hashes read as noise): `b0873185`. Two S6 markers had moved since: the offline banner is the
  kit NoticeBar since R4-G, and the shell mark's bare id is now in globals.css and a comment — each marker is its
  quoted string now. Proof: qa:served-skeleton self-test 78/78; qa:first-load 29 controls and the marker table (red on
  the two old markers); qa:chunks-prod 17/17, and production 6/6 routes (`ca72fe15`, GETs only). Parity v3 (VERSION 3,
  the BOOK, the classic bodies, A8's trace) is rebuilt from v2, the plan and OMEGA's surviving evidence: `9b18ea59`.
  Offline, with a stubbed browser: the 83 rows that need no browser pass, OMEGA's 87 surviving rows match byte for byte
  (details included), its 13 mutants and 20 more are all caught, and the compare refuses a v2 file and another
  normaliser set. Its calibration on a fresh in-memory server is next (WP1 step 6).
- **WP2 · the pure move — DRAFTED, NOT PROVEN: branch `vodacom-s7-wp2` (`f3afc43a`, marked WIP; do not merge).** The
  home body moves to `src/components/home/legacy-landing.tsx` byte for byte (a round trip of the two files rebuilds
  today's page.tsx exactly); page.tsx keeps `generateMetadata` (A24 item 1) and returns `<LegacyLanding … />`; 14 scripts
  name the route file and each is decided (body re-pointed, route kept, history left); `test:journey-home` (new, 8
  checks, 8 plants). Its gates run after WP1, ending with a parity v3 compare at 0 differences; then it is rebased onto
  WP1 and pushed.

"""
t = once(t, "## §0i · S6 — the flagged shell (2026-10-01 → 2026-10-12) ✅", s0j + "## §0i · S6 — the flagged shell (2026-10-01 → 2026-10-12) ✅", n)
points = """65. **S7's preparation started before S6 closed — Ali's choice, 2026-10-07 (S7-PLAN's narrower overrule).** A8i-2 and
    A8j were live and read back, so by S7-PLAN A2 item 4 S7 could start on origin/main before the A8 proof and WP12:
    WP0 only — the records, the reds, the scripts-only repairs (`284f3bc7`, `ce2c3afa`, live) and the bar measurements.
    WP1 (parity v3) waited for §0i to record S6's last v2 compares; it does since S6 closed (2026-10-12). Asked of Ali in
    plain words on 2026-10-07 ("May I start S7's preparation now? Nothing players see changes"): yes. (Filed
    2026-10-12: OMEGA-COMPILE01's draft of this point was never pushed.)
66. **S7 WP1 is rebuilt on ALI-BLADE15 instead of waiting for OMEGA (2026-10-12, under Ali's delegation).**
    OMEGA-COMPILE01 wrote WP1 on 2026-10-07/08 and never pushed it. Ali works from either machine and asked for every
    step to be pushed so the other can continue ("keep pushing live each progress because we could continue from
    another machine"); waiting would stop S7. So the three A9 tools are recovered byte for byte (§0j) and parity v3 is
    rebuilt from the plan, OMEGA's 13 mutants and its `--prove-red` listing, then calibrated here. OMEGA's branch is
    kept for reference only: push it as `vodacom-s7-wp1-omega` and never merge it. Overrule: tell the next session to
    take OMEGA's branch instead — it is then pushed and compared with the rebuild, check for check, before either lands.
67. **The bar budget (S7-PLAN A5, three parts) — measured on main `daf0e799`, every GATED cell holds (2026-10-12).**
    (a) POPULATION — the matrix measures the post-flip page: the preview marker is asserted present and its height
    recorded (112.8 in sw and en, 94.9 in zh, at 360 and 390), then hidden by a page-only style; figures with the marker
    on are recorded, never gated. (b) CELLS — GATED: the How-to card's bottom at or above the rail's top in every cell
    (least slack 223.6px); card 1's picks at or above it in every cell with no transient bar (360×640, 360×740, 390×844:
    least 44.4px) and in the all-bars cells at 390×844, guest and signed in (least 78.6px). RECORDED: card 1 in the
    all-bars cells at 360×640 and 360×740 (31 of 48 combinations over, by up to 128.4px). The figures are §0j's. (c)
    PADDING — the home keeps PageContainer's 32px top, as S6's journey pages do; the canvas's 8px top is a canvas
    deviation shared by every journey page. Overrule: (b)'s cells, or the 8px top. (OMEGA-COMPILE01's draft of this
    point, 2026-10-08, was never pushed; it is re-measured here on the tree S6 closed on.)

"""
t = once(t, "    closes after the pass.\n\n\n## §0g · S4", "    closes after the pass.\n" + points + "\n## §0g · S4", n)
row_old = "| S6 | Shell (flagged) | 🔨 | Plan filed 2026-10-01 (`S6-PLAN.md`, §0i)."
t = once(t, row_old, f"| S6 | Shell (flagged) | ✅ | CLOSED {R['closed']} at `ca72fe15` (round 10, the last S6 commit), its close record in §0 (test:all, classic parity, the tiles, production read back). Plan filed 2026-10-01 (`S6-PLAN.md`, §0i).", n)
t = once(t, "| S7 | Home and cards (flagged) | ⬜ | Plan filed 2026-10-07",
         "| S7 | Home and cards (flagged) | 🔨 | Started (§0j): WP0's scripts-only repairs live `ce2c3afa`; WP1 on branch `vodacom-s7-wp1b`. Plan filed 2026-10-07", n)
save(n, t)

# ── NEXT-PLAN.md ────────────────────────────────────────────────────────────────────────────────────────────────────
n = "NEXT-PLAN.md"
t = load(n)
t = once(t, "S6 (the flagged shell) 🔨 — WP0–WP12 live behind the flag;", f"S6 (the flagged shell) ✅ CLOSED {R['closed']} — WP0–WP12 live behind the flag;", n)
t = once(t, "; next S6's close record (parity + test:all), then S6 ✅ (VODACOM-PLAN §0) — §0i · Ali away: points in §0h** · 4/18 sessions ✅",
         "; the close record (test:all, classic parity, production) 2026-10-12 — §0i · S7 (home and cards) 🔨 — WP0's repairs live `ce2c3afa`, WP1 on `vodacom-s7-wp1b` — §0j · Ali away: points in §0h** · 5/18 sessions ✅", n)
save(n, t)

# ── S6-VISUAL-PASS-STATE.md ─────────────────────────────────────────────────────────────────────────────────────────
n = "S6-VISUAL-PASS-STATE.md"
t = load(n)
t = once(t, "**⭐ ROUND 10 IS LIVE (2026-10-12 01:37 EAT, `ca72fe15`",
         f"**✅ S6 IS CLOSED ({R['closed']}).** The close record (test:all with the database suites, classic parity at `c2d9e156` →\n"
         "`ca72fe15`, production) is VODACOM-PLAN §0's first ✅ paragraph. This file and `S6-READ-TRIAGE.md` stay as the record of\n"
         "the visual pass; the owner questions (appendix K) and the S12 list (appendix G) carry forward.\n\n"
         "**⭐ ROUND 10 IS LIVE (2026-10-12 01:37 EAT, `ca72fe15`", n)
t = once(t, "follow-ups); the reads' record is `S6-READ-TRIAGE.md`. Left for S6: its close record (classic parity at `c2d9e156` + the\ntip, test:all), then S6 ✅.",
         "follow-ups); the reads' record is `S6-READ-TRIAGE.md`. S6's close record ran after it (above): S6 ✅.", n)
save(n, t)
# ── S7-PLAN.md: A24, the base re-read ────────────────────────────────────────────────────────────────────────────────
n = "S7-PLAN.md"
t = load(n)
a24 = (pathlib.Path(sys.argv[2]).parent / "a24.md").read_text(encoding="utf-8").replace(chr(13), "")
t = once(t, "### Points for Ali (VODACOM-PLAN §0h point 58)", a24 + "### Points for Ali (VODACOM-PLAN §0h point 58)", n)
save(n, t)
print("ok")
