/**
 * test:marketing-consent-ledger — U6's EXECUTED proof.
 *
 * ⭐ WHY THIS EXISTS BESIDE `test:dal-parity` §17. That gate is SOURCE-LEVEL: it reads the two
 * DALs as text and proves they agree in shape. It cannot run a single line of them. So it would
 * stay green through a ledger that normalises the phone key wrongly, resolves the wording from
 * the wrong language, or loses the second of two decisions — every one of which produces a record
 * that cannot answer the question it exists to answer (GN 478T reg 51(1)).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the defective implementations IN MEMORY and
 * requires the MATCHING assertion to fire — not merely "something failed". This file makes no
 * file-writing call of any kind, so it stays outside `test:red-anchors` §4's undeclared count.
 *
 * Run:  npm run test:marketing-consent-ledger
 * Red:  npm run red:marketing-consent-ledger
 */
import { appendMarketingConsent, marketingConsentWording } from "../src/lib/server/marketing/consent-ledger.ts";
import type { AppendMarketingConsentInput, MarketingConsentSite } from "../src/lib/server/marketing/consent-ledger.ts";
import { db } from "../src/lib/server/store.ts";
import type { StoredSuppression, MessagingLocale } from "../src/lib/server/store.ts";

/* ⛔ FAILURE IS THE DEFAULT AND IS SET BEFORE THE FIRST `await`. A suite whose verdict is written
 * only at the end scores GREEN when a promise never settles or the process exits early — the exit
 * code is 0 unless something set it. Cleared at the bottom, and only there. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");

type Impl = {
  append: (input: AppendMarketingConsentInput) => Promise<boolean>;
  wording: (site: MarketingConsentSite, locale: MessagingLocale) => string;
  suppress: (row: StoredSuppression) => Promise<StoredSuppression>;
};

const REAL: Impl = {
  append: appendMarketingConsent,
  wording: marketingConsentWording,
  suppress: async (row) => Promise.resolve(db.suppression.create(row)),
};

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

const SIGNUP_SW = "Nipe matangazo (hiari).";

/**
 * The whole sequence, against ONE implementation and ONE phone number.
 *
 * ⚠️ Each run takes its OWN number. The memory store is a process-global map, so a red case that
 * reused the green case's key would be asserting against rows the previous run left behind — and
 * a suite that reads another run's state is not measuring the thing it names.
 */
async function runAssertions(impl: Impl, phone: string, tag: string): Promise<void> {
  const id = phone.replace(/\D/g, "").replace(/^0/, "255");
  const KEY = { channel: "SMS" as const, identifier: id, category: "MARKETING" as const };
  const p = (n: string) => `${tag}${n}`;

  ok(p("0 · baseline · the ledger holds nothing for this number before anything runs"),
    (await Promise.resolve(db.messagingConsent.listFor(KEY))).length === 0);

  const wrote = await impl.append({
    phoneE164: phone, locale: "SW", status: "GIVEN",
    source: "REGISTRATION", site: "REGISTRATION", evidence: "v1", recordedBy: null,
  });
  ok(p("1 · the append reports success"), wrote === true);
  const rows1 = await Promise.resolve(db.messagingConsent.listFor(KEY));
  ok(p("1b · EXECUTED · exactly one row landed, found by the normalised phone key"), rows1.length === 1, `${rows1.length} rows`);
  ok(p("1c · the sign-up wording is the SWAHILI sentence, stored verbatim"),
    rows1[0]?.wording === SIGNUP_SW, JSON.stringify(rows1[0]?.wording ?? null));

  await impl.append({
    phoneE164: phone, locale: "SW", status: "WITHDRAWN",
    source: "PROFILE", site: "PROFILE", evidence: "/profile/notifications", recordedBy: null,
  });
  const rows2 = await Promise.resolve(db.messagingConsent.listFor(KEY));
  ok(p("2 · APPEND-ONLY · the withdrawal ADDED a row rather than replacing one"), rows2.length === 2, `${rows2.length} rows`);
  ok(p("2b · the original GIVEN row survives, with the wording it was written with"),
    rows2.some((r) => r.status === "GIVEN" && r.wording === SIGNUP_SW));
  const latest = await Promise.resolve(db.messagingConsent.latestFor(KEY));
  ok(p("2c · latestFor answers WITHDRAWN — the question U7's gate will ask"), latest?.status === "WITHDRAWN", String(latest?.status));
  ok(p("2d · the profile row carries the TOGGLE's copy, not the sign-up form's"),
    latest?.wording?.startsWith("Habari za bidhaa") === true, JSON.stringify(latest?.wording ?? null));

  // ⛔ THE WORDING MUST TRACK THE LANGUAGE AND THE SURFACE. A record that says the player read
  // English copy they were never shown is a FALSE record, not a harmless default.
  ok(p("3 · EN and SW wording differ"), impl.wording("REGISTRATION", "EN") !== impl.wording("REGISTRATION", "SW"));
  ok(p("3b · the two surfaces' wording differ"), impl.wording("PROFILE", "SW") !== impl.wording("REGISTRATION", "SW"));
  ok(p("3c · an unknown locale falls to SWAHILI, the platform default — never to English"),
    impl.wording("REGISTRATION", "XX" as MessagingLocale) === impl.wording("REGISTRATION", "SW"));

  ok(p("4 · an unusable identifier is REFUSED, not written as a row nobody can look up"),
    (await impl.append({
      phoneE164: "123", locale: "SW", status: "GIVEN",
      source: "REGISTRATION", site: "REGISTRATION", evidence: null, recordedBy: null,
    })) === false);

  const first = await impl.suppress({
    id: `${tag}sup-1`, channel: "SMS", identifier: id, category: "MARKETING",
    reason: "WITHDRAWN", evidence: null, recordedBy: null, createdAt: "2026-01-01T00:00:00.000Z",
  });
  const again = await impl.suppress({
    id: `${tag}sup-2`, channel: "SMS", identifier: id, category: "MARKETING",
    reason: "COMPLAINT", evidence: null, recordedBy: null, createdAt: "2026-09-25T00:00:00.000Z",
  });
  ok(p("5 · re-suppression returns the row ALREADY THERE"), again.id === first.id, `${again.id}`);
  ok(p("5b · ⛔ the original 'when did they say no' was NOT moved forward"),
    again.createdAt === "2026-01-01T00:00:00.000Z", again.createdAt);
  ok(p("5c · exactly one suppression row exists for the triple"),
    (await Promise.resolve(db.suppression.listFor(id))).length === 1);
  ok(p("5d · CONTROL · a DIFFERENT number still gets its own row — the rule is not 'refuse everything'"),
    (await impl.suppress({
      id: `${tag}sup-3`, channel: "SMS", identifier: `${id.slice(0, -1)}9`, category: "MARKETING",
      reason: "WITHDRAWN", evidence: null, recordedBy: null, createdAt: "2026-09-25T00:00:00.000Z",
    })).id === `${tag}sup-3`);
}

if (!PROVE_RED) {
  await runAssertions(REAL, "0712345678", "");
  console.log(`\nmarketing-consent-ledger: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  /* ══ THE RED PROOF ═══════════════════════════════════════════════════════════════════════
   * Each case plants ONE real defect in memory and names the assertion that must fire. A case
   * that goes red on some OTHER assertion is reported as a problem, not a success — a gate that
   * fails for the wrong reason is not a gate. */
  const problems: string[] = [];

  // §0 — THE SHIPPED CODE PASSES FIRST. Without this, "every proof held" could equally mean
  // "nothing works at all", and the whole run would be meaningless.
  await runAssertions(REAL, "0712345600", "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped implementation is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline · shipped code: ${pass} passed, ${fail} failed\n`);

  const CASES: Array<{ name: string; phone: string; impl: Impl; expect: string }> = [
    {
      name: "the wording is re-rendered from ENGLISH copy whatever the player read (§5.7)",
      phone: "0712345601",
      expect: "1c · the sign-up wording is the SWAHILI sentence, stored verbatim",
      impl: {
        ...REAL,
        wording: (site) => marketingConsentWording(site, "EN"),
        append: async (i) => appendMarketingConsent({ ...i, locale: "EN" }),
      },
    },
    {
      name: "the second decision is LOST — one row per person, which is D8 all over again",
      phone: "0712345602",
      expect: "2 · APPEND-ONLY · the withdrawal ADDED a row rather than replacing one",
      impl: {
        ...REAL,
        append: async (i) => {
          const key = {
            channel: "SMS" as const,
            identifier: i.phoneE164.replace(/\D/g, "").replace(/^0/, "255"),
            category: "MARKETING" as const,
          };
          const existing = await Promise.resolve(db.messagingConsent.listFor(key));
          if (existing.length > 0) return true; // silently drops the withdrawal
          return appendMarketingConsent(i);
        },
      },
    },
    {
      name: "an unusable identifier is accepted, as a row nobody can ever look up",
      phone: "0712345603",
      expect: "4 · an unusable identifier is REFUSED, not written as a row nobody can look up",
      impl: {
        ...REAL,
        append: async (i) => (i.phoneE164 === "123" ? true : appendMarketingConsent(i)),
      },
    },
    {
      name: "re-suppression REPLACES the row, walking 'when did they say no' forward on every re-import",
      phone: "0712345604",
      expect: "5b · ⛔ the original 'when did they say no' was NOT moved forward",
      impl: { ...REAL, suppress: async (row) => row },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, c.phone, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) {
      problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    } else {
      console.log(`   caught → ${c.expect}\n`);
    }
  }

  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
