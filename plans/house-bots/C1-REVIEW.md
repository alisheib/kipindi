# Commit 1 — review findings to fix

> **Delete this file in the commit that fixes the last finding** (PROGRESS RESUME AT step 7 points here).
>
> Source: the 3-lens adversarial review workflow `wf_b826fc45-41d`, 2026-09-14, on `house-bots` @ `2ed1e19b`, with one refuting verifier per lens. It raised 14 findings and confirmed 10. L1-02 and L3-02 are the same defect, so there are **9 fixes plus 1 comment cleanup**; 4 findings were refuted. The fixes below are the verifiers' corrected fixes, with build-session rulings marked **Ruling**. Line anchors are as of `dd16a420`; re-derive them before editing.
>
> **Order:** F1 first (it needs `test:house-bot-migrations` red, then green), then F2–F9 and the cleanup. Then the typecheck, `test:house-bot-rules`, `test:dal-parity`, `test:house-bot-migrations` and `red:dal-parity`, then `test:all --skip responsive,motion` (CI's invocation; see step 7.5). Record each result in PROGRESS.

## F1 · MAJOR (the reviewer said BLOCKER) · the markers migration's lock order can deadlock with a bet in flight — L1-01
- **Where:** `prisma/migrations/20260914120100_house_bot_markers/migration.sql` (header lines 8–15, the Position section at 42–56); `docs/HOUSE-BOTS.md:121`; `scripts/house-bot-migrations.test.mts` §b (header line 21, b.5 at about 784–788).
- **Defect:** `Position_placedAt_id_idx` is built first, taking SHARE on Position. `ALTER TABLE "Position" ADD COLUMN "houseBotId"` then asks for ACCESS EXCLUSIVE in the same transaction. A bet reads Position (ACCESS SHARE: `findByIdempotencyKey` and `listForUserAndMarket` under `withLock`) and then inserts into it (ROW EXCLUSIVE) in one transaction. If the bet's INSERT waits on the SHARE while the migration asks for ACCESS EXCLUSIVE against the bet's ACCESS SHARE, Postgres raises 40P01. Money stays atomic, and keyed bets retry 40P01. But the release apply fails: Prisma records a failed migration row, and R2's runbook (`migrate resolve --rolled-back`) is needed. §b cannot see this: its c1 only runs `SELECT … FOR UPDATE`, and its c3 inserts without reading first.
- **Fix:**
  1. Put the Position section in this order: `ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "houseBotId" TEXT;` first, then `Position_placedAt_id_idx`, then the three marker indexes. No table then goes from SHARE to ACCESS EXCLUSIVE. Postgres grants a bet that already holds ACCESS SHARE its ROW EXCLUSIVE ahead of a queued ACCESS EXCLUSIVE, because nothing granted conflicts.
  2. Rewrite header lines 8–13 and the comment at 43–44:
     - each table is locked ACCESS EXCLUSIVE once, before any other lock on it, because a bet reads and then writes Position, and a SHARE taken first deadlocks with it (40P01);
     - reads of that table wait while its small-table index builds run, and tables above the A23 thresholds are prepared by hand;
     - **Ruling, state the residual honestly:** a transaction that already holds a lock on a table later in this file (Transaction, PredictionMarket, User) and then needs an earlier one can still meet 40P01 while the file acquires its locks. The apply then rolls back whole, exactly as on 55P03, and R2's runbook retries.
  3. `docs/HOUSE-BOTS.md:121` → "built after the column, under the same ACCESS EXCLUSIVE lock (a SHARE taken first would deadlock with an in-flight bet)".
  4. §b:
     - b.5 wording → "the failed apply left nothing behind (no index, no column)".
     - Add **b.6** after b.c2. The file re-runs, and `ALTER TABLE` and `CREATE INDEX IF NOT EXISTS` still take their table locks on a replay.
     - b.6 steps: c1 runs `BEGIN; SELECT "id" FROM "Position" WHERE "id"='pos_hb_block';`. c2 starts `fileMarkers`. After 500 ms, c1 runs `INSERT INTO "Position" ("id","userId","marketId","side","stake","potentialPayout") VALUES ('pos_hb_block3','usr_hb_block','mkt_hb_block','NO',500,950)`, then `COMMIT`.
     - Assert: neither connection reports 40P01, c1's INSERT succeeds, and c2 either succeeds or fails with 55P03. Update the §b line in the header.
  5. ⭐ **Prove it by mutation:** add b.6 **before** reordering and run `test:house-bot-migrations`. b.6 must go red with 40P01. Then reorder and re-run: green. If b.6 does not go red on the old order, the case is not exercising the upgrade. Fix the case; never skip the red run.

## F2 · MAJOR · the memory positions twin can mark an unmarked position; Postgres cannot — L1-02 = L3-02
- **Where:** `src/lib/server/market-dal.ts:673-678`; `src/lib/server/market-service.ts:327-329` (comment); `scripts/lib/house-bot-dal-cases.mts` c21 (expected values at about 253–255, cases at about 941–956); `scripts/dal-parity.test.mts:547`.
- **Defect:** `positions.set(p.id, prev ? { ...p, houseBotId: prev.houseBotId ?? p.houseBotId ?? null } : p)` lets a marker go from NULL to an id. The Prisma update arm never writes `houseBotId`, so nothing tests NULL → id. 04 S3's remark fixes *Transaction* markers from their position through its own statement, never through `positionStore.set`.
- **Fix:**
  1. `market-dal.ts:677` → `positions.set(p.id, prev ? { ...p, houseBotId: prev.houseBotId ?? null } : p);`. Replace the comment with: "⛔ The house marker is create-only, exactly as the Prisma update arm: once a row exists, a full-row write never changes its marker, in either direction. The commit-7 remark uses its own statement, never set."
  2. `market-service.ts:327-329`, last sentence → "The remark script in build commit 7 fixes Transaction markers from their position, through its own statement, never through positionStore.set."
  3. Cases:
     - Expected: `"c21.c a full-row position write cannot mark an unmarked stake": "null:OPEN"`.
     - Case: `const p = position("pos_c21c", "2026-01-05T10:00:00.000Z", 1000, "OPEN", null); await positionStore.set(p); await positionStore.set({ ...p, houseBotId: "hb_1" }); const back = await positionStore.get("pos_c21c"); return \`${back?.houseBotId}:${back?.status}\`;`
     - `test:house-bot-migrations` §d then compares it on Postgres and on memory.
  4. dal-parity 9.memory → `/prev\.houseBotId/.test(memSet) && !/\bp\.houseBotId\b/.test(memSet)`, plus a CONTROL showing the old line `prev ? { ...p, houseBotId: prev.houseBotId ?? p.houseBotId ?? null } : p` is rejected.

## F3 · MAJOR · A.1e goes red on the next unrelated migration — L3-01
- **Where:** `scripts/house-bot-migrations.test.mts:224-225`, header line 12.
- **Defect:** it requires that exactly the two house folders sort after the KYC migration. That stops being true the day anyone adds a correct migration, and `test:all` runs this key for ever (the dead-schema lesson: a guard describing a temporary state).
- **Fix (Ruling):** A.1d already holds the sealed rule (both folders after KYC, tables before markers). Replace A.1e with a check that stays true: `const between = folders.filter((f) => f > tablesFolder && f < markersFolder); ok("A.1e · no other migration sorts between the two house migrations", between.length === 0, between.join(", "));`. Header line 12 → "the two folders sort after the KYC migration, tables before markers, with no other migration between them". Checking that the house folders are the newest belongs to REL-0 (S2 R0's `git diff`, the commit-8 preflight), never to a permanent `test:` key.
  - Why only the gap between the two: a KYC→house "between" check would also go red if `main` ever adds a migration dated inside that range. The two house folders are 100 seconds apart.

## F4 · MINOR · the staff-edge AlertOnce key carries the month the pass ran in, not the month it judged — L2-01
- **Sealed:** N1 §4.5 and TGT-39. An October run over September writes `staff-edge:<X>:2026-09`.
- **Where:** `src/lib/house-bot/constants.ts:693-697`; `src/lib/house-bot/clock.ts` (`EAT_SQL`, `EAT_KEY_UNITS`, `EAT_SQL_BY_UNIT`, `eatKeyFor`); `scripts/house-bot-rules.test.mts` 11.26 (about 1504–1513), 13.5 (about 1583–1589) and 13.6 (about 1590–1596); `scripts/lib/house-bot-dal-cases.mts` c18; `docs/HOUSE-BOTS.md:538`.
- **Fix:**
  1. `clock.ts` `EAT_SQL`: add `previousMonthKey: \`to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam') - interval '1 month', 'YYYY-MM')\``. It must be named `previousMonthKey`, because 13.6 looks fragments up as `${u}Key`.
  2. `EAT_KEY_UNITS = ["day", "hour", "month", "previousMonth", "minute"]`, and `EAT_SQL_BY_UNIT.previousMonth = EAT_SQL.previousMonthKey`.
  3. Add `export function eatPreviousMonthKey(atMs: number): string { const [y, m] = eatMonthKey(atMs).split("-").map(Number); return eatMonthKey(Date.UTC(y, m - 1, 1) - EAT_OFFSET_MS - 1); }` and `case "previousMonth": return eatPreviousMonthKey(atMs);` in `eatKeyFor`.
  4. `constants.ts`: `staffEdge: (officerId: string) => suffixed(\`staff-edge:${officerId}\`, "previousMonth")`. Comment: "The pass runs only on the first EAT day of a month and judges the month just ended; the key carries that judged month (N1 §4.5, TGT-39: an October run writes 2026-09)."
  5. Tests:
     - 11.26 expects unit `"previousMonth"`.
     - 13.5's list gains `"previousMonth"`, plus: `eatKeyFor("previousMonth", Date.UTC(2026, 8, 30, 21)) === "2026-09"`, `eatKeyFor("previousMonth", Date.UTC(2026, 9, 1, 20, 59, 59, 999)) === "2026-09"`, `eatKeyFor("previousMonth", Date.UTC(2026, 8, 30, 20, 59, 59, 999)) === "2026-08"`, and the year turn `eatKeyFor("previousMonth", Date.UTC(2026, 11, 31, 21)) === "2026-12"` (00:00 EAT on 1 Jan 2027).
     - 13.6 pins the new fragment string.
     - Keep 13.4 unchanged; it is correct for `eatMonthKey`.
  6. c18: add `c18.f a previous-month claim is one row per judged month`. Call `claimWithEatSuffix("case:c18:prev", "previousMonth")` twice and return `${a.claimed}:${b.claimed}:${a.key === b.key}:${/^case:c18:prev:\d{4}-\d{2}$/.test(a.key)}`, expected `"true:false:true:true"`.
  7. `docs/HOUSE-BOTS.md:538`: unit column "previous month", and the sentence → "…for the month just ended, and the key carries that month (an October run writes `staff-edge:<officerId>:2026-09`)." Grep HOUSE-BOTS.md for any other list of the EAT units.

## F5 · MINOR · the audit payload guard fails open deeper than 8 levels — L2-03
- **Where:** `src/lib/house-bot/constants.ts:822-828`, the docstring at about 841; `scripts/house-bot-rules.test.mts` after 11.11 (about 1458).
- **Fix:**
  ```ts
  function hasForbiddenKey(v: unknown, depth: number): boolean {
    if (v === null || typeof v !== "object") return false;
    if (depth > 8) return true; // fail closed: too deep to prove clean is refused (R7)
    if (Array.isArray(v)) return v.some((item) => hasForbiddenKey(item, depth + 1));
    return Object.entries(v as Record<string, unknown>).some(
      ([k, inner]) => (HOUSE_AUDIT_FORBIDDEN_KEYS as readonly string[]).includes(k) || hasForbiddenKey(inner, depth + 1),
    );
  }
  ```
  - Docstring → "no forbidden key appears at any depth, and a payload nested deeper than 8 levels is refused".
  - Tests:
    - 11.11b: `!isAllowedHouseAuditPayload({ counts: { a: { b: { c: { d: { e: { f: { g: { h: { label: "x" } } } } } } } } } })` (fails on today's code);
    - 11.11c: `isAllowedHouseAuditPayload({ counts: { a: { b: 1 } } })`;
    - 11.11d: `isAllowedHouseAuditPayload({ botId: "hb_1", cancelled: [{ intentId: "hbi_1", side: "YES", stakeTzs: 1000 }] })`.

## F6 · MINOR · the chain-purge NEVER list misses three house tables — L3-06
- **Sealed A20:** every house table is on the NEVER list, so `docs/HOUSE-BOTS.md:71` is right and the lists are incomplete.
- **Fix:**
  - `src/lib/server/chain-purge.ts:13` and `docs/DATA-RETENTION.md:345`: add `HouseBotControl`, `HouseBotRuntime` and `HouseBotAlertOnce`.
  - `docs/HOUSE-BOTS.md:71`: append "This is the chain purge only: `HouseBotAlertOnce` is still purged at 30 days by the retention pass, and per-instance `HouseBotRuntime` rows after 24 h."
  - A grep on 2026-09-14 found no suite pinning the NEVER line text; re-check before editing.

## F7 · MINOR · the F1 typecheck fixture never touches the real declaration — L3-07
- **Where:** `scripts/house-bot-rules.test.mts` §14 (about 1642–1697); `src/lib/house-bot/constants.ts:453-456`.
- **Defect:** `bad.ts` declares its own object. Deleting `satisfies Record<ProductLine, HouseProductPolicy>` from constants.ts leaves the typecheck and all of §14 green.
- **Fix:** keep the fixture that sealed 04 F1 requires, but build it from the real source:
  - read `src/lib/house-bot/constants.ts`;
  - `decl = src.match(/export const HOUSE_PRODUCT_POLICY = \{[\s\S]*?\} as const satisfies Record<ProductLine, HouseProductPolicy>;/)?.[0] ?? ""`;
  - add `14.0b` (`decl` found), plus a CONTROL showing the regex does not match the declaration with the `satisfies` clause removed;
  - write `bad.ts` as the two type imports + `decl.replace("Record<ProductLine, HouseProductPolicy>", "Record<ProductLine | \"JACKPOT\", HouseProductPolicy>")`;
  - keep 14.1–14.4.

## F8 · MINOR · the docs say CI records NOT MEASURED, but CI records FAIL — L3-03
- In CI, `db-scratch` exits 2 because `embedded-postgres` is installed `--no-save` and never in CI, so `test-all.mjs` counts the key as FAIL. `test:kyc-restart-docs` on `main` already does the same, per the verifier; this was not checked against a CI run.
- **Fix (docs only):**
  - `docs/HOUSE-BOTS.md:576`, "Where it runs" → "A machine with the embedded Postgres. In CI `db-scratch` exits 2 because `embedded-postgres` is not installed, so `test:all` records this key as FAIL, as it already does `test:kyc-restart-docs`."
  - Result → "NOT MEASURED; in CI a FAIL (no embedded Postgres), never a green".
  - Suite header line 9 → "with no database URL it prints NOT MEASURED and exits 3 (under `npm run`, db-scratch exits 2 first when the binaries are missing)".
  - Lines 31–32 → "CI's in-memory job has no embedded Postgres, so db-scratch exits 2 and test:all records this key as FAIL, as it does test:kyc-restart-docs. It is never green there."

## F9 · MINOR · the HOUSE-BOTS I4 row credits `test:dal-parity` with behavioural unique parity — L3-08
- **Fix:** in `docs/HOUSE-BOTS.md:39`, replace "`test:dal-parity` (commit 1): the memory twin throws the same unique violations by index name." with "`test:house-bot-migrations` §d (commit 1): the memory twin raises the same named unique violations as Postgres, case for case. `test:dal-parity` (commit 1): the twin's unique and CHECK name lists equal the migrations', at source level only."

## Cleanup · the label charset comment overclaims (from the refuted L2-02)
- `src/lib/house-bot/rules.ts:1118-1122` → "Letters, marks, digits, space and `- _ . # '`, tested on the normalised label (C2). Controls, the C2 zero-width characters (U+200B–200D, U+2060, U+FEFF) and bidi controls are not letters, marks or digits, so they fail. Emoji fail too; they stay valid in notes and reasons. Uniqueness is NFKC + lowercase only: cross-script look-alikes (Cyrillic А) are not detected."

## Refuted: no change
- **L1-03, the target veto reads a stale CTE snapshot.** Sealed N2 §6 step 2 makes every veto caller run `getForUpdate(targetId, tx)` first, in the same transaction. Commit 7's `cancelHouseBotIntentAction` and `removeHouseBotTargetAction` **must** keep that order.
- **L2-02, look-alike labels.** Sealed C2's charset admits L/M/N; cross-script look-alikes are a property of the sealed design. Only the comment is fixed (above).
- **L3-04, COMPLIANCE "condition 5 is built".** It copies PLAN §18 row CC-33, and the entry's "does NOT change" list disposes of conditions 2 and 3.
- **L3-05, RULES §1 row without a LANDING marker.** RULES puts LANDING markers at the §2 entries, and §2.11 is marked.
