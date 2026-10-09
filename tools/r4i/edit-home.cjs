const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/app/page.tsx", [
  [`import { db } from "@/lib/server/store";`, `import { db } from "@/lib/server/store";
import { isLockedOut } from "@/lib/server/responsible-gambling";`],
  [`  const mine: LandingMine | null = session
    ? await Promise.all([
        landingPicks(session.userId, nowMs).catch(() => null),
        Promise.resolve().then(() => db.wallet.findByUserId(session.userId)).catch(() => undefined),
      ]).then(([picks, wallet]) => ({
        picks,
        balance: wallet === undefined ? null : (wallet?.balance ?? 0),
        held: !!wallet && wallet.status !== "ACTIVE",
      }))
    : null;`,
   `  // ⭐ R4-I (2026-10-09; edges E19, tiles 013 016 019 046 049 052 079 082 085) · AND WHETHER THE READER IS ON A BREAK, in
  // the same batch. It gates an INVITATION ("choose a side…"), so it fails OPEN: a failed read is "not on a break", the
  // shell's \`promoSuppressed\` rule (feature-state.ts LAW 1), and the bet path still refuses during a break.
  const mine: LandingMine | null = session
    ? await Promise.all([
        landingPicks(session.userId, nowMs).catch(() => null),
        Promise.resolve().then(() => db.wallet.findByUserId(session.userId)).catch(() => undefined),
        Promise.resolve().then(() => isLockedOut(session.userId)).then((l) => l.locked).catch(() => false),
      ]).then(([picks, wallet, onBreak]) => ({
        picks,
        balance: wallet === undefined ? null : (wallet?.balance ?? 0),
        held: !!wallet && wallet.status !== "ACTIVE",
        onBreak,
      }))
    : null;`],
]);
edit("src/components/home/landing-hero.tsx", [
  [`export type LandingMine = { picks: LandingPicks | null; balance: number | null; held: boolean };`,
   `export type LandingMine = {
  picks: LandingPicks | null; balance: number | null; held: boolean;
  /** R4-I · the reader is on a self-imposed break (fails open: a failed read is false). Optional, so a caller that does
   *  not know draws the block as before. */
  onBreak?: boolean;
};`],
  [`  const held = !!mine?.held;
  const noPicks =`, `  const held = !!mine?.held;
  const onBreak = !!mine?.onBreak;
  const noPicks =`],
  [`  // wallet (\`wallet-sheet.tsx\`, \`header-state.ts\`). No new words: the sentence is simply not shown.
  return (`, `  // wallet (\`wallet-sheet.tsx\`, \`header-state.ts\`). No new words: the sentence is simply not shown.
  // ⛔ …AND NEITHER IS A PLAYER ON A BREAK (R4-I, 2026-10-09; edges E19, tiles 013 016 019 046 049 052 079 082 085): "Bado
  // huna chaguo. Chagua upande…" asked a player who had just paused their own betting to bet now. The break gets the held
  // wallet's treatment — the sentence is not shown, no new words; the header already drops its deposit pill for a break.
  return (`],
  [`        held || emptyWallet ? null : <p className="kp-mine__lead">{t.home.picksNone}</p>`,
   `        held || emptyWallet || onBreak ? null : <p className="kp-mine__lead">{t.home.picksNone}</p>`],
]);
