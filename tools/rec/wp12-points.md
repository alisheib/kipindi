61. **WP12 — the proof tools and records that close S6 (S6 WP12, for every player only through what it proves).** The
    calls taken: (a) THE CLASSIC BELL'S BYTES PUT BACK. A8i-2 (`586c5183`, this lane) corrected two lines of a comment in
    `notifications-panel.tsx`, which A1 keeps untouched until S15 and A8i-2's draft had only reported; `qa:bell-untouched`
    caught it, and WP12's first commit puts the file back byte for byte, its one stale clause ("`<Modal>` guards only
    Shift+Tab", untrue since A8i-2) owed to S15, when the bell is next touched. Overrule: keep the corrected comment and
    read the bell proof's TOUCHED as that comment. (b) RULE 8 DATED THE DAY IT LANDS: DESIGN_AUTHORITY §K rule 8 and its
    provenance entry carry 2026-10-07, not the drafting day (2026-10-04), the entry above A8i's of the same day.
    Overrule: the drafting date. (c) SIX STATEMENTS CORRECTED against today's code, by an independent read of about 165
    claims: rule 8c's helpline row (gone since the owner's ruling of 2026-10-06), "kept the classic components
    untouched" (their served markup is; the Wallet both looks open takes a journey prop), no overlay in a card, SHELVED's
    empty-state row and the performance link's real words, and CLAUDE.md's [E3] line. (d) THE PARITY BASELINES: the
    plan's v2 baseline (`parity-v2-7c859cdf.json`) lives only on ALI-BLADE15, so it was re-captured here from the same
    pre-S6 commit `7c859cdf` (package-lock unchanged since), calibrated by prove-red and a null compare; WP12's own claim,
    that it serves no new byte, is proven against a fresh baseline at its parent. Overrule: fetch the original file from
    ALI-BLADE15 and compare against it as well. (e) `qa:live` SIGNS IN ON PRODUCTION: from WP12 on, a production run
    signs the QA player mobile01 in once ([E3]) — its only production write (a session row that ends any other mobile01
    session, two audit rows, the last sign-in time, a "Signed in" email to an address that cannot deliver); it needs
    `.env.qa.local` at the worktree root, and two runs at once spoil each other. Overrule: [E3] local-only.
62. **The journey hub's sign-out confirm keeps the avatar menu's claret tone — OPEN, to be ruled before the flip (rule
    8c).** DESIGN_AUTHORITY licenses claret for §B4 (editorial) and §B4a (an irreversible operator ceremony); sign-out
    is neither — it is recoverable, and a player's own act. Until ruled, the confirm stays as built (nothing served
    changes). The choice: a neutral tone for sign-out in both looks (the avatar menu's too), or a licence for sign-out's
    claret written into DESIGN_AUTHORITY. Asked of Ali, before S15.
63. **Two shared tools could not be trusted on the shared PC — found proving WP12, fixed for every lane (one live, one
    waiting on its proof).** (a) `db:scratch`'s sweep matched a postgres process by the checkout's path in its command
    line, but a child's command line names only the binary, and in a worktree whose `node_modules` is a junction (most
    on OMEGA-COMPILE01) that is the OTHER checkout: the first database suite's leftover `io_worker` held the cluster's
    shared memory and the next twelve failed "with no reason"; run from the junction target, the same test matched the
    siblings' LIVE clusters. Now a cluster is known by its `-D` and its postmaster's pid, `--reset` and initdb sweep
    too, the stop is bounded (a dead postmaster made `--run` exit 0) and a failed start prints postgres's own reason
    (`4c1a8dff`, branch `vodacom-dbscratch`; an independent review's seven findings fixed; to main once turn A2 has run
    the database suites with it). (b) `red:all`'s timeout ends only npm's shell on Windows, so a timed-out harness ran
    on beside the next, still mutating: in WP12's turn A `red:house-bot-console` (TIME at 300 s) made eleven harnesses
    read DIRTY on its files and `red:house-bot-c5` refuse, until it was stopped through the status its restore guard
    reads as a console stop (every target then equal to HEAD), and `red:kyc-gate` did the same later. Now the runner
    waits for a timed-out harness before it reads the tree (a pid counts only with its exact start time; default
    `--orphan-wait` 4 h) and stops the fleet rather than run beside one; a DIRTY report no longer prints `src/` as
    `rc/` (LIVE `b2e9db81`; an independent review's five findings fixed). Overrule: none sought — both are defects.
    (c) Two WP12 pieces were stale against the ruling of 2026-10-07 and were fixed before their runs: the tile drive's
    §12 (its classic control expected the deleted email bar) and the shortfall test's header (a 300 shortfall offering
    [500, …], "the code comes first").
