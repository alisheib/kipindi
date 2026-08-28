/**
 * THE DIAL MUST NEVER OFFER A STAKE THE SERVER REFUSES.
 *
 * 🔴 THE DEFECT, found 2026-08-28 while auditing `conviction-dial.tsx` — the largest surface
 * on the platform with no suite that could fail on its arithmetic. The slider path was
 *
 *     Math.max(baseStake, Math.round(target / 100) * 100)
 *
 * with no upper clamp. `Math.round` rounds UP, so whenever `maxStake` did not land on a clean
 * hundred the far end of the dial offered a stake ABOVE the configured maximum — 249,950 became
 * 250,000. `market-service.ts` refuses `stake > maxStake` outright, so the maximum bet, reached
 * by the gesture the whole control exists for, produced a Place button the server rejects.
 *
 * ⛔ AND THE ASYMMETRY IS THE FINDING, more than the arithmetic: the typed multiplier and the
 * typed stake were BOTH already clamped. Only the DRAG was not — the default path, the one a
 * player actually uses, and the only one no test could reach.
 *
 * ⚠️ REACHABLE BY CONFIGURATION, NOT BY DEFAULT, and stated rather than glossed: `maxStake`
 * defaults to 1,000,000, a clean hundred, so the shipped platform never hit it. The admin door
 * validates only `Number.isFinite` and the platform range — a multiple of 100 is not required —
 * and Up & Down chains carry their own per-chain bounds. Latent, not theoretical.
 *
 * Run: npm run test:dial-stake
 */
import { maxMultiplierFor, stakeCeilingFor, stakeFromPosition, LEGACY_MAX_MULTIPLIER } from "../src/lib/dial-stake.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

console.log("Dial stake ladder\n");

// ── 1 · THE BOUND, over every position, at every awkward maximum ─────────────
/**
 * ⭐ SWEPT, NOT SAMPLED. The overshoot only appears in the last few percent of the track, so
 * three hand-picked positions could miss it entirely — and the first draft of this suite did,
 * because it checked the centre, a middle notch and `pos = 1` exactly. The sweep is what makes
 * "never above the maximum" a statement about the CONTROL rather than about three points on it.
 */
{
  const BASE = 1_000;
  // Every one of these is a legal `/admin/config` value. The three middle ones are the ones
  // that used to break: their last two digits are ≥ 50 and not 00, so the snap rounds up.
  const MAXES = [1_000_000, 250_050, 249_950, 50_050, 100_000, 1_999, 12_345, 999_999];
  let worst = { maxStake: 0, pos: 0, stake: 0, over: 0 };
  let checked = 0;
  for (const maxStake of MAXES) {
    const ceiling = stakeCeilingFor(BASE, maxStake);
    for (let i = 0; i <= 1000; i++) {
      const pos = i / 1000;
      const s = stakeFromPosition(pos, BASE, maxStake);
      checked++;
      if (s > ceiling && s - ceiling > worst.over) worst = { maxStake, pos, stake: s, over: s - ceiling };
    }
  }
  ok("1: 🔴 no position on the dial offers more than the configured maximum",
     worst.over === 0,
     worst.over === 0 ? `${checked} positions × ${MAXES.length} maxima`
       : `maxStake=${worst.maxStake} pos=${worst.pos} offered ${worst.stake} (+${worst.over})`);

  ok("1: …and never less than the configured minimum",
     MAXES.every((m) => [0, 0.25, 0.5, 0.75, 1].every((p) => stakeFromPosition(p, BASE, m) >= BASE)));

  ok("1: ⭐ the far end still REACHES the maximum — a clamp that just lowers the ceiling is a bug too",
     stakeFromPosition(1, BASE, 1_000_000) === 1_000_000,
     String(stakeFromPosition(1, BASE, 1_000_000)));

  /* ⛔ THE EXACT SHIPPED CASE, named so a future reader sees the number rather than a range. */
  ok("1: 🔴 maxStake 249,950 offers 249,950, not the 250,000 the server refuses",
     stakeFromPosition(1, BASE, 249_950) === 249_950,
     String(stakeFromPosition(1, BASE, 249_950)));
}

// ── 2 · POSITIVE CONTROL — the old formula must FAIL this suite ──────────────
/**
 * ⛔ WITHOUT THIS, §1 IS UNFALSIFIABLE FROM READING IT. A clamp that silently did nothing would
 * pass every assertion above. This reproduces the PREVIOUS implementation verbatim and asserts
 * it breaks the bound — so §1 is measuring the fix, not the absence of a problem.
 */
{
  const BASE = 1_000;
  const MAX = 249_950;
  const old = (pos: number) => {
    const d = Math.abs(pos - 0.5) * 2;
    const conviction = d * d;
    const mm = MAX > BASE ? MAX / BASE : 200;
    return Math.max(BASE, Math.round((BASE * (1 + conviction * (mm - 1))) / 100) * 100);
  };
  ok("2: ⭐ CONTROL — the OLD formula does exceed the maximum, so §1 can fail",
     old(1) > MAX, `old(1)=${old(1)} > maxStake=${MAX}`);
  ok("2: …and the current one does not, on the identical input",
     stakeFromPosition(1, BASE, MAX) <= MAX, `${stakeFromPosition(1, BASE, MAX)} ≤ ${MAX}`);
}

// ── 3 · THE CEILING IS AN INTEGER, because the server demands one ────────────
/**
 * `market-service.ts` refuses on `!Number.isInteger(stake)` as well as on the bounds, and the
 * admin door does not require `maxStake` to be whole. A fractional ceiling handed through would
 * be a different error behind the same dead button.
 */
{
  ok("3: a fractional maximum yields a whole-number ceiling",
     Number.isInteger(stakeCeilingFor(1_000, 250_000.5)) && stakeCeilingFor(1_000, 250_000.5) === 250_000,
     String(stakeCeilingFor(1_000, 250_000.5)));
  ok("3: …and every offered stake is a whole number",
     [0, 0.3, 0.61, 0.87, 1].every((p) => Number.isInteger(stakeFromPosition(p, 1_000, 250_000.5))));
}

// ── 4 · THE BAD-CONFIG GUARDS, which are the reason for the fallback ─────────
{
  ok("4: max ≤ min falls back to the legacy ceiling rather than a ≤0 range",
     maxMultiplierFor(1_000, 500) === LEGACY_MAX_MULTIPLIER && maxMultiplierFor(1_000, 1_000) === LEGACY_MAX_MULTIPLIER);
  ok("4: an absent maximum keeps old callers working",
     maxMultiplierFor(1_000, undefined) === LEGACY_MAX_MULTIPLIER);
  ok("4: ⛔ a non-finite maximum never reaches the Place button as NaN",
     Number.isFinite(stakeFromPosition(1, 1_000, Number.NaN))
       && Number.isFinite(stakeFromPosition(1, 1_000, Number.POSITIVE_INFINITY)),
     `NaN→${stakeFromPosition(1, 1_000, Number.NaN)} Inf→${stakeFromPosition(1, 1_000, Number.POSITIVE_INFINITY)}`);
}

// ── 5 · THE CENTRE IS THE MINIMUM, and the curve is monotonic outward ────────
{
  ok("5: the centre stakes exactly the minimum", stakeFromPosition(0.5, 1_000, 100_000) === 1_000);
  ok("5: both sides of the centre are symmetric",
     [0.1, 0.25, 0.4].every((d) => stakeFromPosition(0.5 - d, 1_000, 100_000) === stakeFromPosition(0.5 + d, 1_000, 100_000)),
     "left is YES and right is NO — the SIDE differs, the money must not");
  let mono = true;
  for (let i = 500; i < 1000; i++) {
    if (stakeFromPosition((i + 1) / 1000, 1_000, 100_000) < stakeFromPosition(i / 1000, 1_000, 100_000)) mono = false;
  }
  ok("5: moving away from the centre never LOWERS the stake", mono);
}

console.log(`\ndial-stake: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
