/**
 * DSAR EXPORT SECRETS — nothing a player downloads may carry account credentials.
 *
 *   npx tsx scripts/dsar-export-secrets.test.mts   (npm run test:dsar-secrets)
 *
 * 🔴 WHY THIS TEST EXISTS (2026-08-20). The platform grants the same legal right through
 * two doors, and one of them was wrong:
 *
 *   · `buildDsarBundle` — officer-triggered, /admin/privacy and /admin/players. Field-picked
 *     the user row correctly and never carried a secret.
 *   · `exportUserData` — PLAYER-triggered, /profile/account → "Export my data". Returned
 *     `await db.user.findById(userId)` WHOLE. The downloaded JSON contained the account's
 *     scrypt `passwordHash` and `passwordSalt`. Measured, not inferred: both values were
 *     found in the serialised payload.
 *
 * That is the worse door to get wrong. The file goes to a phone's Downloads folder, gets
 * mailed to the player, syncs to consumer cloud storage — an offline cracking target for
 * their own account, and for every service where they reused the password.
 *
 * Neither door is trusted here. Both are called, both are serialised exactly as the product
 * serialises them, and the result is searched for the secret VALUES — not just the field
 * names, because a rename would defeat a name-only check.
 *
 * ⛔ The last section is the important one: it proves the projection is an ALLOWLIST. A fix
 * that merely deleted two known fields would pass everything above it and start leaking
 * again the day somebody adds a third secret column to `User`.
 *
 * Every negative assertion here has been broken on purpose and observed to go red.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db } from "../src/lib/server/store.ts";
import { exportUserData } from "../src/lib/server/user-service.ts";
import { buildDsarBundle, dsarUserView, dsarTxnView, DSAR_TXN_KEYS } from "../src/lib/server/privacy.ts";
// Owner ruling D19 · the absence vocabulary is the one module every absence proof imports (C5-SPEC ruling 175) — never
// `scripts/house-bot-disclosure.test.mts`, which runs top-level code.
import { houseHits } from "./lib/house-bot-vocabulary.mjs";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

// Distinctive sentinels — if any of these strings appears in an export, that value escaped.
const HASH = "SENTINEL-PASSWORD-HASH-93f1a7c4e2b8";
const SALT = "SENTINEL-PASSWORD-SALT-5d0e6b9a1c33";

const userId = "u_dsar_secrets";
await db.user.create({
  id: userId,
  phoneE164: "+255700000042",
  email: "probe@50pick.tz",
  passwordHash: HASH,
  passwordSalt: SALT,
  failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
  displayName: "DSAR Probe", dob: null, region: "Dar es Salaam",
  acceptedTermsVersion: "v3", acceptedTermsAt: new Date().toISOString(),
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
} as never);

type Any = any;

/**
 * An ordinary ACTIVE account with a wallet, in the shape the file's first user is written in. §6 and
 * §7 need more than one, and §7 needs TWO THAT DIFFER IN NOTHING — an equality between two documents
 * is only as good as the sameness of the accounts behind it, so every field here is fixed, never
 * generated.
 */
async function mkAccount(id: string, phone: string): Promise<void> {
  const at = new Date("2026-08-01T09:00:00.000Z").toISOString();
  await db.user.create({
    id, phoneE164: phone, email: null,
    passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Twin Probe", dob: null, region: "Dar es Salaam",
    acceptedTermsVersion: "v3", acceptedTermsAt: at,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: at, updatedAt: at, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 10_000, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at,
  } as never);
}

// ── 1 · CONTROL — the exports actually produce something ─────────────────────────────
// Without this, every negative assertion below could pass on an empty object.
section("1 · CONTROL: both doors return a populated bundle");

const playerExport = await exportUserData(userId);
const officerBundle = await buildDsarBundle(userId);
const playerJson = JSON.stringify(playerExport);
const officerJson = JSON.stringify(officerBundle);

ok("the PLAYER export carries the account it was asked for",
  playerExport.user?.id === userId, `got ${playerExport.user?.id}`);
ok("the OFFICER bundle carries the account it was asked for",
  officerBundle?.user?.id === userId, `got ${officerBundle?.user?.id}`);
ok("both are substantial documents, not stubs",
  playerJson.length > 200 && officerJson.length > 200,
  `player ${playerJson.length}B / officer ${officerJson.length}B`);
ok("the sentinels really are on the stored row (so searching for them is meaningful)",
  (await db.user.findById(userId))?.passwordHash === HASH,
  "If the DAL did not persist the sentinel, sections 2-3 prove nothing.");

// ── 2 · The player-facing door — the one that leaked ─────────────────────────────────
section("2 · the PLAYER export carries no credential");

ok("⛔ no password HASH VALUE in the downloaded JSON", !playerJson.includes(HASH));
ok("⛔ no password SALT VALUE in the downloaded JSON", !playerJson.includes(SALT));
ok("no `passwordHash` field name either", !playerJson.includes("passwordHash"));
ok("no `passwordSalt` field name either", !playerJson.includes("passwordSalt"));

// ── 3 · The officer-facing door — verified, not assumed ──────────────────────────────
section("3 · the OFFICER bundle carries no credential");

ok("⛔ no password HASH VALUE in the officer bundle", !officerJson.includes(HASH));
ok("⛔ no password SALT VALUE in the officer bundle", !officerJson.includes(SALT));
ok("no credential field names", !officerJson.includes("passwordHash") && !officerJson.includes("passwordSalt"));

// ── 4 · The projection is an ALLOWLIST, not a two-field patch ────────────────────────
section("4 · a NEW secret column would be excluded automatically");

/**
 * The real question is not "are these two fields gone" — it is "what happens to the THIRD
 * one". A denylist fix passes sections 2 and 3 and then leaks the next column somebody
 * adds. So: hand the projection a row carrying a field it has never heard of, and require
 * that it does not appear in the output.
 */
const rowWithFutureSecret = {
  ...(await db.user.findById(userId))!,
  // Pretend a later migration added these. The projection must not know or care.
  recoveryKeyHash: "SENTINEL-FUTURE-SECRET-a1b2c3d4",
  totpSecretEnc: "SENTINEL-FUTURE-TOTP-e5f6a7b8",
} as never;
const projected = JSON.stringify(dsarUserView(rowWithFutureSecret));

ok("⛔ an unknown future secret column does NOT reach the output",
  !projected.includes("SENTINEL-FUTURE-SECRET-a1b2c3d4") && !projected.includes("recoveryKeyHash"),
  "The projection is behaving like a denylist. It must name what it INCLUDES.");
ok("⛔ nor does a second one",
  !projected.includes("SENTINEL-FUTURE-TOTP-e5f6a7b8") && !projected.includes("totpSecretEnc"));
ok("CONTROL: the projection still emits the fields a player is entitled to",
  projected.includes(userId) && projected.includes("Dar es Salaam") && projected.includes("probe@50pick.tz"),
  "If this fails the projection is empty and the two assertions above are vacuous.");

// ── 5 · Both doors read the SAME projection ──────────────────────────────────────────
section("5 · one projection, so the two doors cannot drift again");

const playerKeys = Object.keys(playerExport.user ?? {}).sort().join(",");
const officerKeys = Object.keys(officerBundle?.user ?? {}).sort().join(",");
ok("the player export and the officer bundle expose an IDENTICAL user field set",
  playerKeys === officerKeys && playerKeys.length > 0,
  `player: ${playerKeys}\n       officer: ${officerKeys}`);
ok("and that set is exactly what dsarUserView returns",
  playerKeys === Object.keys(dsarUserView((await db.user.findById(userId))!)).sort().join(","));

// ── 6 · THE HOLDER'S OWN BET AUDIT (C5-SPEC rulings 154, 168, 170, 243) ──────────────────────────
section("6 · a holder's own bet audit keeps the row and loses the house keys");

/**
 * ⛔ THE ROW IS THE HOLDER'S BET RECORD AND IT STAYS. A house stake is placed on the holder's own
 * account, so `market.position.opened` names the HOLDER as actor and its payload carries the bot and
 * the intent. Owner ruling D19 leaves the row (removing it would leave a hole in a statutory
 * right-of-access export exactly where that account's money moved) and removes the house keys.
 *
 * ⚠️ §9 below proves the same absence on the money ROWS, where the nullable column lives. This section
 * is the AUDIT half, and it is separate because the two are stripped by different code: the money rows
 * by `dsarTxnView`'s allowlist, the audit rows by `withoutHouseAuditKeys`. A single assertion over the
 * whole document would pass while either one of them was doing nothing.
 */
const HOLDER = "u_dsar_holder";
const HOUSE_MARKER = "hb_00000000000000000000beef";
const HOUSE_INTENT = "hbi_00000000000000000000beef";
await mkAccount(HOLDER, "+255700000043");

const AUD = await import("../src/lib/server/audit.ts");
await AUD.audit({
  category: "BET", action: "market.position.opened", actorId: HOLDER,
  targetType: "Position", targetId: "pos_dsar_house",
  // Exactly what the seam writes for a house stake: the holder's own bet row, plus the two house keys.
  payload: { marketId: "mkt_dsar", side: "YES", stake: 5_000, houseBotId: HOUSE_MARKER, intentId: HOUSE_INTENT },
});
await AUD.auditFlush?.();

const durableHolder = (await AUD.getAuditForActorDurable(HOLDER, { limit: 100 })).entries as Array<Record<string, Any>>;
const durableBet = durableHolder.find((e) => e.action === "market.position.opened");
ok("6.CONTROL: the DURABLE row really carries both house keys, so their absence below is a measurement",
  !!durableBet && durableBet.payload?.houseBotId === HOUSE_MARKER && durableBet.payload?.intentId === HOUSE_INTENT,
  JSON.stringify(durableBet?.payload ?? null));

const holderExport = await exportUserData(HOLDER);
const holderBundle = await buildDsarBundle(HOLDER);
const holderBet = (holderExport.auditEntries?.entries as Array<Record<string, Any>> ?? []).find((e) => e.action === "market.position.opened");
ok("⛔ D19 · the holder's own export KEEPS the bet row — the stake, the side and the market are their money record",
  !!holderBet && holderBet.payload?.stake === 5_000 && holderBet.payload?.marketId === "mkt_dsar" && holderBet.payload?.side === "YES",
  JSON.stringify(holderBet?.payload ?? null));
ok("⛔ D19 · …and that row carries NEITHER house key, at any depth",
  !!holderBet && !("houseBotId" in (holderBet.payload ?? {})) && !("intentId" in (holderBet.payload ?? {})),
  JSON.stringify(Object.keys(holderBet?.payload ?? {})));
for (const [door, file] of [["player export", holderExport], ["officer bundle", holderBundle]] as Array<[string, unknown]>) {
  const json = JSON.stringify(file);
  ok(`⛔ D19 · HB-ACC-12 / CRA-04 · D20 · the holder's ${door} carries no marker, no intent id and no vocabulary word at any depth (the record half is struck; the absence half is the whole of it)`,
    !json.includes(HOUSE_MARKER) && !json.includes(HOUSE_INTENT) && !json.includes("houseBotId") && houseHits(json).length === 0,
    houseHits(json).slice(0, 5).join(", "));
}

// ── 7 · THE TRIGGER PLAYER'S TWO DOORS (C5-SPEC ruling 239, the absence half) ─────────────────────
section("7 · a trigger player's doors equal an identical account with no box and no counters");

/**
 * ⛔ WHAT A TRIGGER PLAYER IS, AND WHY THE CLAIM IS AN EQUALITY RATHER THAN AN ABSENCE. A player whose
 * bet the house answered has rows ABOUT them in two house tables: a `PENALTY_BOXED` HouseBotEvent
 * carrying their `userId`, and COUNTER intents carrying their `triggerUserId`. Neither releasable door
 * reads those tables — but "the door does not read that table" is a claim about code, and the claim
 * owner ruling D19 actually makes is about the DOCUMENT: what the player downloads must not be
 * distinguishable from what an identical player downloads.
 *
 * So this is measured as a TWIN COMPARISON, not as a word search. Two accounts are created with the
 * same fields, the same wallet and the same money row; one of them is then boxed and countered. Both
 * doors are opened on both accounts and compared twice over — key sets at every depth, and the whole
 * serialised document with ids, timestamps, phone numbers and addresses normalised away. A word search
 * would pass a document that differed in a COUNT, an ORDER or an extra empty section; an equality
 * cannot.
 *
 * ⚠️ AND THE CONTROL IS THE EXPENSIVE HALF: the comparison is run FIRST on two accounts that differ by
 * one ordinary fact (a second transaction), and must report them DIFFERENT. Without that, "the two
 * documents are equal" might only mean the normaliser erased everything.
 */
const HB_DAL = await import("../src/lib/server/house-bot-dal.ts");

/**
 * ISO instants, ids and contact details differ between any two accounts; nothing else may.
 *
 * ⛔ IT REPLACES NAMED LITERALS, NOT AN ID PATTERN, for two reasons. Ruling 175 forbids this file
 * declaring an identifier regex of its own — a per-file copy of the id shapes is exactly what that
 * ruling exists to stop. And a pattern is the weaker instrument here anyway: it would also erase an id
 * this comparison has never heard of, which is the one thing a leak would look like. Every id below is
 * one this section CREATED, so anything else survives normalisation and shows up as a difference.
 */
const KNOWN_IDS: string[] = [];
const normalise = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(normalise);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, normalise(x)]));
  if (typeof v !== "string") return v;
  let s = v;
  s = s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, "<TIME>");
  s = s.replace(/\+255\d+/g, "<PHONE>");
  for (const id of KNOWN_IDS) s = s.split(id).join("<ID>");
  return s;
};
/** Every key path in a document, sorted — so a section that exists on one side only is reported by name. */
const keyPaths = (v: unknown, at = "$"): string[] => {
  if (Array.isArray(v)) return v.flatMap((x, i) => keyPaths(x, `${at}[${i}]`));
  if (v && typeof v === "object") return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => [`${at}.${k}`, ...keyPaths(x, `${at}.${k}`)]);
  return [];
};

const TRIGGER = "u_dsar_trigger";
const TWIN = "u_dsar_twin";
KNOWN_IDS.push(TRIGGER, TWIN, `wal_${TRIGGER}`, `wal_${TWIN}`, "txn_trigger_1", "txn_twin_1", "txn_twin_extra");
await mkAccount(TRIGGER, "+255700000044");
await mkAccount(TWIN, "+255700000045");
for (const [uid, txnId] of [[TRIGGER, "txn_trigger_1"], [TWIN, "txn_twin_1"]] as Array<[string, string]>) {
  const t = new Date("2026-08-02T10:00:00.000Z").toISOString();
  await db.txn.create({
    id: txnId, walletId: `wal_${uid}`, userId: uid, type: "DEPOSIT", status: "CONFIRMED",
    amount: 10_000, fee: 0, taxWithheld: 0, balanceAfter: 10_000, currency: "TZS", provider: "MPESA",
    providerRef: "twin-ref", msisdn: null, description: "twin deposit", positionId: null, amlReason: null,
    createdAt: t, updatedAt: t, completedAt: t,
  } as never);
}

/* ⭐ THE CONTROL COMES FIRST. Give the twin one extra ordinary transaction and require the comparison
   to report the two accounts DIFFERENT — otherwise a normaliser that erased the document would let the
   real comparison below pass whatever happened. */
await db.txn.create({
  id: "txn_twin_extra", walletId: `wal_${TWIN}`, userId: TWIN, type: "DEPOSIT", status: "CONFIRMED",
  amount: 1, fee: 0, taxWithheld: 0, balanceAfter: 10_001, currency: "TZS", provider: "MPESA",
  providerRef: "twin-ref-2", msisdn: null, description: "the one ordinary difference", positionId: null, amlReason: null,
  createdAt: new Date("2026-08-02T11:00:00.000Z").toISOString(), updatedAt: new Date("2026-08-02T11:00:00.000Z").toISOString(),
  completedAt: new Date("2026-08-02T11:00:00.000Z").toISOString(),
} as never);
const skewed = JSON.stringify(normalise(await exportUserData(TRIGGER))) === JSON.stringify(normalise(await exportUserData(TWIN)));
ok("7.CONTROL: with ONE ordinary difference between the accounts the comparison reports them DIFFERENT — so the normaliser has not erased the document",
  skewed === false, "the two documents compared equal while one account had an extra transaction");
await db.txn.update("txn_twin_extra", { userId: "u_dsar_nobody" });

// The two house rows ABOUT the trigger player. Written straight to the house tables — the memory store
// has no foreign key, and the point of this section is precisely that no door joins them.
const boxed = await HB_DAL.houseBotEventStore.append({
  houseBotId: HOUSE_MARKER, userId: TRIGGER, marketId: "mkt_dsar", kind: "PENALTY_BOXED",
  fromStatus: null, toStatus: null, reason: null, actorId: null,
  payload: { day: "2026-08-02", cause: "CASHED_OUT_COUNTERED" },
} as never);
await HB_DAL.houseBotIntentStore.insert({
  id: "hbi_dsar_counter_000000000001", houseBotId: HOUSE_MARKER, botUserId: HOLDER, kind: "COUNTER",
  marketId: "mkt_dsar", productLine: "MARKET", anchorKey: "pos_trigger_1",
  triggerPositionId: "pos_trigger_1", triggerUserId: TRIGGER, targetId: null, requestedById: null,
  entryCondition: null, side: "NO", stakeTzs: 5_000,
  dueAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 3_600_000).toISOString(),
  staleAt: new Date(Date.now() + 600_000).toISOString(), status: "PLACED", reasonCode: null, why: null,
  decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null,
  positionId: "pos_house_1", finishedAt: null, alertedAt: null,
} as never);
const eventBack = await HB_DAL.houseBotEventStore.get(boxed.id);
const intentBack = await HB_DAL.houseBotIntentStore.get("hbi_dsar_counter_000000000001");
ok("7.CONTROL: the two house rows ABOUT this player really exist and really carry their id (the box's userId, the counter's triggerUserId)",
  eventBack?.userId === TRIGGER && eventBack?.kind === "PENALTY_BOXED" && intentBack?.triggerUserId === TRIGGER && intentBack?.status === "PLACED",
  JSON.stringify({ event: eventBack?.userId, kind: eventBack?.kind, intent: intentBack?.triggerUserId, status: intentBack?.status }));

/* ⭐ THE NEEDLE FOR AN ABSENCE, AND WITHOUT IT THE EQUALITY BELOW IS WORTH NOTHING. A document that
   never had a trigger section compares equal to a document that never had one — which is exactly what
   these two doors are. So the instrument is shown FINDING the shape ruling 239 struck: the
   `liquidityDecisions` section, and separately the single COUNT on its own, are each added to the
   trigger player's document and the comparison must report it different. A count alone is the harder
   of the two: it adds no section and no word, and a word search would pass it. */
{
  const base = await exportUserData(TRIGGER);
  const twinDoc = await exportUserData(TWIN);
  const withSection = { ...base, liquidityDecisions: {
    excludedDays: { rows: [{ day: "2026-08-02", cause: "CASHED_OUT_COUNTERED" }], total: 1, truncated: false },
    counteredPositionsCount: 1, note: "a box whose event write failed (ruling 117) is not listed",
  } };
  const withCountOnly = { ...base, counteredPositionsCount: 1 };
  const eq = (a: unknown, b: unknown) => JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
  ok("7.CONTROL: the comparison FINDS the struck trigger section when it is added to the trigger player's document — key set and shape both report it",
    !eq(withSection, twinDoc) && keyPaths(withSection).length > keyPaths(twinDoc).length,
    `paths ${keyPaths(withSection).length} vs ${keyPaths(twinDoc).length}`);
  ok("7.CONTROL: …and it finds the subtler half too — a bare COUNT, no section and no word, which a word search would pass",
    !eq(withCountOnly, twinDoc) && keyPaths(withCountOnly).sort().join() !== keyPaths(twinDoc).sort().join(),
    `paths ${keyPaths(withCountOnly).length} vs ${keyPaths(twinDoc).length}`);
  ok("7.CONTROL: …while the UNTOUCHED trigger document compares equal to the twin, so the two controls above measured the plant and not a difference that was already there",
    eq(base, twinDoc), "the two accounts already differed before anything was planted");
}

for (const door of ["exportUserData", "buildDsarBundle"] as const) {
  const open = door === "exportUserData" ? exportUserData : buildDsarBundle;
  const t = await open(TRIGGER);
  const n = await open(TWIN);
  const tPaths = keyPaths(t).sort().join("\n");
  const nPaths = keyPaths(n).sort().join("\n");
  ok(`⛔ D19 · ruling 239 · CRA-10 · D20 · the trigger player's ${door} has the SAME key set at every depth as the twin's — no trigger section, no extra field, nothing empty added`,
    tPaths === nPaths && tPaths.length > 0,
    `only on trigger: ${tPaths.split("\n").filter((p) => !nPaths.includes(p)).slice(0, 5).join(", ")} | only on twin: ${nPaths.split("\n").filter((p) => !tPaths.includes(p)).slice(0, 5).join(", ")}`);
  const tShape = JSON.stringify(normalise(t));
  const nShape = JSON.stringify(normalise(n));
  ok(`⛔ D19 · ruling 239 · CRA-10 · …and the whole ${door} document is IDENTICAL once ids, times and contact details are normalised — a box and a countered position change nothing a player can download`,
    tShape === nShape, tShape === nShape ? "" : `trigger ${tShape.length}B vs twin ${nShape.length}B`);
  ok(`⛔ D19 · CRA-10 · the trigger player's ${door} names nothing house at any depth (the belt beside the equality's braces)`,
    houseHits(JSON.stringify(t)).length === 0 && !JSON.stringify(t).includes(HOUSE_MARKER) && !JSON.stringify(t).includes("hbi_dsar"),
    houseHits(JSON.stringify(t)).slice(0, 5).join(", "));
}

// ── 9 · Transactions: one ALLOWLIST projection for both doors (C5-SPEC ruling 169) ──────
section("9 · a NEW Transaction column, and the house marker, reach neither door");

/**
 * The officer bundle returned `db.txn.findByUser` rows WHOLE, and the player door removed one known key — the same
 * denylist-versus-allowlist mistake section 4 exists for, on the money rows. So: a row carrying a column no projection has
 * heard of, and the house marker (owner ruling D19: a subject's file names nothing about house bots), through both doors.
 */
const FUTURE_TXN = "SENTINEL-FUTURE-TXN-COLUMN-7d1e9a";
const MARKER = "hb_0123456789abcdef01234567";
const txnNow = new Date().toISOString();
await db.txn.create({
  id: "txn_dsar_future_column", walletId: "wal_dsar_secrets", userId, type: "DEPOSIT", status: "CONFIRMED",
  amount: 5_000, fee: 0, taxWithheld: 0, balanceAfter: 5_000, currency: "TZS", provider: "MPESA", providerRef: "dsar-ref",
  msisdn: null, description: "probe deposit", positionId: null, amlReason: null,
  createdAt: txnNow, updatedAt: txnNow, completedAt: txnNow,
  // Pretend a later migration added this column, and the row is a house stake's.
  recoveryCodeHash: FUTURE_TXN,
  houseBotId: MARKER,
} as never);
const rawTxn = ((await db.txn.findByUser(userId, 100)) as Array<Record<string, unknown>>).find((t) => t.id === "txn_dsar_future_column");
ok("CONTROL: the raw stored row carries the future column and the house marker (so their absence below means something)",
  rawTxn?.recoveryCodeHash === FUTURE_TXN && rawTxn?.houseBotId === MARKER, JSON.stringify(rawTxn ?? null).slice(0, 160));

const playerAfter = await exportUserData(userId);
const officerAfter = await buildDsarBundle(userId);
// Ruling 175 · this consumer's planted-hit control: the absence checks below read `houseHits`, so it must be seen FINDING
// each family in a door-shaped file first — a word, an identifier and a bounded id.
const plantedDoor = houseHits(JSON.stringify({ ...playerAfter, planted: { note: "house bot", key: "houseBotId", id: MARKER } }));
ok("CONTROL: houseHits finds a planted word, identifier and bounded id in a door-shaped file (so a zero below means something)",
  ["house bot", "houseBotId", MARKER].every((s) => plantedDoor.includes(s)), plantedDoor.join(", "));
const doors: Array<[string, unknown]> = [["player export", playerAfter], ["officer bundle", officerAfter]];
for (const [door, file] of doors) {
  const json = JSON.stringify(file);
  ok(`⛔ the ${door} carries the row but not the future column's value or name`,
    json.includes("txn_dsar_future_column") && !json.includes(FUTURE_TXN) && !json.includes("recoveryCodeHash"));
  ok(`⛔ D19 · the ${door} carries no house marker, key or vocabulary word at any depth`,
    !json.includes(MARKER) && !json.includes("houseBotId") && houseHits(json).length === 0, houseHits(json).slice(0, 5).join(", "));
}

// ⛔ WRITTEN OUT, never imported from the module under test (C5-SPEC ruling 169): origin/main's 23 `StoredTxn` keys in
// `toStoredTxn`'s order at `b726cb7f`. A column added to the mapper, DSAR_TXN_KEYS and dsarTxnView together goes red here.
const MAIN_TXN_KEYS = "id,walletId,userId,type,status,amount,fee,taxWithheld,balanceAfter,currency,provider,providerRef,providerStatus,payoutRail,msisdn,description,positionId,amlReason,createdAt,updatedAt,completedAt,idempotencyKey,pendingNotifiedAt";
ok("DSAR_TXN_KEYS is exactly origin/main's 23 transaction keys, in order", DSAR_TXN_KEYS.join(",") === MAIN_TXN_KEYS, DSAR_TXN_KEYS.join(","));
const txnKeySets = (rows: Array<Record<string, unknown>>) => [...new Set(rows.map((r) => Object.keys(r).join(",")))];
const playerTxnKeys = txnKeySets(playerAfter.transactions as Array<Record<string, unknown>>);
const officerTxnKeys = txnKeySets((officerAfter?.transactions ?? []) as Array<Record<string, unknown>>);
ok("the player export and the officer bundle expose an IDENTICAL transaction field set — exactly origin/main's 23 keys, in order",
  playerTxnKeys.length === 1 && officerTxnKeys.length === 1 && playerTxnKeys[0] === officerTxnKeys[0] && playerTxnKeys[0] === MAIN_TXN_KEYS,
  `player: ${playerTxnKeys.join(" | ")}\n       officer: ${officerTxnKeys.join(" | ")}`);
const projectedTxn = JSON.stringify(dsarTxnView({ ...(rawTxn as never), anotherFutureSecret: "SENTINEL-TXN-b2" } as never));
ok("⛔ dsarTxnView itself drops a column it has never heard of", !projectedTxn.includes("SENTINEL-TXN-b2") && !projectedTxn.includes(FUTURE_TXN) && !projectedTxn.includes(MARKER));
ok("CONTROL: the projection still emits the money fields a subject is entitled to",
  projectedTxn.includes("txn_dsar_future_column") && projectedTxn.includes("5000") && projectedTxn.includes("dsar-ref"),
  "If this fails the projection is empty and the assertions above are vacuous.");

console.log("");
console.log("─".repeat(64));
console.log(`  DSAR EXPORT SECRETS: ${pass} passed, ${fail} failed`);
console.log(`  A data-subject export is a file the player keeps. It may hold everything`);
console.log(`  about them and nothing that authenticates them.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
