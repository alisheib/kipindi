/**
 * test:licence-outreach — U33a-R's guard: THE LICENCE-OUTREACH RECORD (spec `docs/marketing-specs/U33a-U37c-OD58.md`
 * §5.3 · §6 U33a-R · §7.7 · §8 · §9 U33a-R; OD57 · OD58).
 *
 * ⭐ DRIVEN, NOT READ. The store under test is the REAL one — the reader, both writers and the four checks of
 * `src/lib/server/marketing/outreach-record.ts`, built by its own `makeStore` over a second instance of the real
 * `defineConfig` factory (`__licenceOutreachForTest`) against an in-memory row that answers like Postgres (every write
 * kept as a JSON copy, every read a copy back), so the read-back and the hydration gate run as in production:
 *   R1  the reader — the default, a closed row and every malformed row read CLOSED; only the exact open row reads OPEN;
 *   R2  opening is refused for each failing check, each named, with nothing written and no audit row;
 *   R3  opening with every check passing reads OPEN in the same process, is audited, and survives a reload;
 *   R4  closing reads CLOSED at once, and is audited;
 *   R4b open → close → open reads OPEN — the row is replaced whole, so no `closedBy` survives into the new row;
 *   R5  the REAL gate: a never-asked player is refused while closed, allowed once open, refused again after a close.
 *
 * ⛔ `--prove-red` PLANTS EACH DEFECT IN MEMORY — one piece of the store per case, through its declared test seams — and
 * requires the assertion that NAMES it to turn red. A guard that cannot be made to fail is not a guard: every one of the
 * five is a defect this unit could really have shipped (the reader reading absent or malformed as open, the checks
 * waved through, `PRE_LEDGER_OFFS` ignored, and a close that only takes effect after a reload — the shallow-spread
 * merge, which is exactly what the factory does by default).
 *
 * ⛔ NO DATABASE IS EVER TOUCHED: `DATABASE_URL` is deleted before the first server module loads, and every server
 * module is imported dynamically after that line.
 */
delete process.env.DATABASE_URL;

const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);

const RECORD = await import("../src/lib/server/marketing/outreach-record.ts");
const CHECKS = await import("../src/lib/marketing/outreach-open-checks.ts");
const {
  LICENCE_OUTREACH_KEY, OUTREACH_REFUSAL_SENTENCE, PRE_LEDGER_OFFS,
  __licenceOutreachForTest, readLicenceOutreachRow,
} = RECORD;
const { OUTREACH_CHECK_SENTENCE, OUTREACH_OPEN_CHECKS, outreachOpenProblems } = CHECKS;

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

/* ══ THE LABELS — each once, so a red case names exactly the line it must turn red ═══════════════════════════════ */

const L = {
  r1: "R1 · the reader — the default, a closed row and every malformed row (not an object, an array, open without recordedBy, a recordedAt that is not an instant, an extra key, a misspelt state) read CLOSED; only the exact open row reads OPEN",
  r2: "R2 · opening is refused for each failing check, each one named with its own sentence — nothing is written and there is no audit row; a blank officer and an unreadable policy record are refused too",
  r3: "R3 · opening with every check passing reads OPEN in the same process, writes the COMPLIANCE row with the four checks, and a reload reads it back",
  r4: "R4 · closing reads CLOSED at once and is audited — and is never refused for a failing check",
  r4b: "R4b · open, close, then open again reads OPEN — the row is replaced whole, so no closedBy survives into the new open row",
  r5: "R5 · the real gate — a never-asked player is refused while closed, allowed once it opens, and refused again after it closes",
  r6: "R6 · the wiring — the pure checks are pure and ordered, every sentence is the spec's, the constant is reconciled, and the scripts and predeploy name the suite",
} as const;

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const OFFICER = "usr_officer_u33ar";
const AT = "2026-10-05T09:00:00.000Z";

/** An in-memory row that answers like Postgres — a copy in, a copy out, and a count of the writes. */
function memoryStore(seed: unknown = null) {
  let stored = seed === null ? null : copy(seed);
  let writes = 0;
  return {
    deps: {
      hasDatabase: () => true,
      loadConfigResult: async () => ({ ok: true as const, value: stored === null ? null : copy(stored) }),
      saveConfig: async (_key: string, value: unknown) => { writes++; stored = copy(value); },
    },
    writes: () => writes,
    row: () => (stored === null ? null : copy(stored)) as Record<string, unknown> | null,
  };
}

/** A saved policy record that passes all three public checks — built by asking the REAL checks, never by hand. */
const PASSING = await (async () => {
  const { POLICY_LINE_DEFAULTS, POLICY_LINE_KEYS } = await import("../src/lib/legal/policy-lines.ts");
  // Appendix B's shape: every line saved with words that do not contradict licence outreach. The texts come from the
  // suite that owns them — `test:policy-lines` L5 — so this fixture cannot drift from what the checks actually accept.
  const lines: Record<string, unknown> = {};
  const words = {
    "privacy.smsGateway": {
      en: "We send SMS through Blackball Monitoring Limited, our messaging provider.",
      sw: "Tunatuma SMS kupitia Blackball Monitoring Limited, mtoa huduma wetu wa ujumbe.",
      zh: "我们通过短信服务商 Blackball Monitoring Limited 发送短信。",
    },
    "privacy.lawfulLicence": {
      en: "We also contact you under our Gaming Board licence about our own games.",
      sw: "Pia tunakutafuta chini ya leseni yetu ya Bodi ya Michezo kuhusu michezo yetu.",
      zh: "我们也会依据博彩委员会牌照就本平台游戏与您联系。",
    },
    "privacy.lawfulConsent": {
      en: "Consent: marketing you agreed to receive, which you can stop at any time.",
      sw: "Ridhaa: matangazo uliyokubali kupokea, unaweza kusimamisha wakati wowote.",
      zh: "同意：您已同意接收的营销信息，可随时停止。",
    },
    "rg.marketing": {
      en: "We never market to anyone under 18. For people who are not members, staff confirm the person is 18 or over before any offer is sent.",
      sw: "Hatutangazi kwa mtu yeyote aliye chini ya miaka 18. Kwa wasio wanachama, wafanyakazi huthibitisha kuwa mtu ana miaka 18 au zaidi kabla ya ofa yoyote.",
      zh: "我们绝不向未满18岁者营销。对于非会员，员工会先确认其已年满18岁。",
    },
  } as Record<string, Record<string, string>>;
  for (const key of POLICY_LINE_KEYS) {
    const w = words[key];
    if (!w) continue;
    lines[key] = [{ rev: 1, en: w.en, sw: w.sw, zh: w.zh, codeDefault: "x", savedAt: AT, savedBy: OFFICER }];
  }
  // Every other line keeps its code default (no saved history) — the checks read only the four above.
  void POLICY_LINE_DEFAULTS;
  return lines;
})();

/** Nothing saved — the state a fresh install is in, where all three public checks fail. */
const EMPTY_LINES: Record<string, unknown> = {};

type Impl = {
  readonly readRow: typeof readLicenceOutreachRow;
  readonly openProblems: typeof outreachOpenProblems;
  readonly merge?: (current: unknown, updates: unknown) => unknown;
};
const REAL: Impl = { readRow: readLicenceOutreachRow, openProblems: outreachOpenProblems };

/** The audit rows this run wrote — read from the module's own in-memory ring, never a re-implementation of it.
 *  ⛔ `auditFlush()` first: `audit()` queues, so a row asked for on the previous line may not have landed yet, and a
 *  suite that reads the ring without draining it proves only that it was fast. */
async function auditRows(): Promise<{ action: string; targetId: string | null }[]> {
  const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");
  await auditFlush();
  return getAuditPage({ limit: 200 }).map((r) => ({ action: r.action, targetId: r.targetId ?? null }));
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (label: string) => `${tag}${label}`;

  // ── R1 · THE READER ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    const OPEN_ROW = { state: "open", recordedBy: OFFICER, recordedAt: AT };
    const closedCases: [string, unknown][] = [
      ["the default", { state: "closed" }],
      ["a closed row", { state: "closed", closedBy: OFFICER, closedAt: AT }],
      ["absent", null],
      ["undefined", undefined],
      ["not an object", "open"],
      ["an array", [{ state: "open", recordedBy: OFFICER, recordedAt: AT }]],
      ["open without recordedBy", { state: "open", recordedAt: AT }],
      ["open with a blank recordedBy", { state: "open", recordedBy: "   ", recordedAt: AT }],
      ["a recordedAt that is not an instant", { state: "open", recordedBy: OFFICER, recordedAt: "2026-10-05" }],
      ["an extra key", { state: "open", recordedBy: OFFICER, recordedAt: AT, closedAt: AT }],
      ["a misspelt state", { state: "Open", recordedBy: OFFICER, recordedAt: AT }],
    ];
    const wrong = closedCases.filter(([, row]) => impl.readRow(row).state !== "closed").map(([name]) => name);
    const opens = impl.readRow(OPEN_ROW);
    const openOk = opens.state === "open" && opens.recordedBy === OFFICER && opens.recordedAt === AT;
    ok(p(L.r1), wrong.length === 0 && openOk, `read as open: ${wrong.join(", ") || "none"} · the exact row ${openOk ? "reads open" : "does NOT read open"}`);
  }

  // ── R2 · OPENING IS REFUSED FOR EACH FAILING CHECK ──────────────────────────────────────────────────────────────
  {
    const mem = memoryStore();
    const store = __licenceOutreachForTest({
      factoryDeps: mem.deps,
      readPolicyLines: () => copy(EMPTY_LINES) as never,
      policyReadable: () => true,
      openProblems: impl.openProblems,
      ...(impl.merge ? { merge: impl.merge as never } : {}),
    });
    await settle();
    const res = await store.open(OFFICER, AT);
    const refused = !res.ok && res.reason === "checks";
    // All three public checks fail with nothing saved, and each is named with the spec's own sentence.
    const named = !res.ok ? [...res.failing] : [];
    const three = named.includes("privacy_gateway") && named.includes("privacy_lawful") && named.includes("rg_age");
    const sentences = named.every((c) => typeof OUTREACH_CHECK_SENTENCE[c] === "string" && OUTREACH_CHECK_SENTENCE[c].length > 20);
    const wroteNothing = mem.writes() === 0 && store.read().state === "closed";

    // A blank officer, and a policy record this process cannot read in full, are refused on their own terms.
    const noOfficer = await store.open("   ", AT);
    const blankOk = !noOfficer.ok && noOfficer.reason === "no_officer" && noOfficer.error === OUTREACH_REFUSAL_SENTENCE.no_officer;
    const unreadableStore = __licenceOutreachForTest({
      factoryDeps: memoryStore().deps,
      readPolicyLines: () => copy(PASSING) as never,
      policyReadable: () => false,
      openProblems: impl.openProblems,
    });
    await settle();
    const unread = await unreadableStore.open(OFFICER, AT);
    // ⛔ It must refuse as UNREADABLE and name NO check — naming three it cannot judge is the defect this case pins.
    const unreadOk = !unread.ok && unread.reason === "unreadable" && unread.failing.length === 0;

    /* ⛔ CHECK 4 IS NOT DECORATION, AND IT HAS TO BE DRIVEN ON ITS OWN. With every public line saved, an OUTSTANDING
       reconciliation is the ONLY thing still refusing — so it must refuse, alone and by name. Without this the fourth
       check could be dropped entirely and every other assertion here would stay green: the red proof's case 4 found
       exactly that and stayed GREEN until this was added. */
    const outstanding = __licenceOutreachForTest({
      factoryDeps: memoryStore().deps,
      readPolicyLines: () => copy(PASSING) as never,
      policyReadable: () => true,
      preLedgerOffs: "outstanding",
      openProblems: impl.openProblems,
    });
    await settle();
    const pre = await outstanding.open(OFFICER, AT);
    const preledgerOk = !pre.ok && pre.reason === "checks" && JSON.stringify([...pre.failing]) === JSON.stringify(["preledger"]);

    ok(p(L.r2), refused && three && sentences && wroteNothing && blankOk && unreadOk && preledgerOk,
      `refused ${refused} · named ${named.join(",") || "none"} · writes ${mem.writes()} · blank ${blankOk} · unreadable ${unreadOk} · preledger alone ${preledgerOk}`);
  }

  // ── R3 · OPENING WITH EVERY CHECK PASSING ───────────────────────────────────────────────────────────────────────
  {
    const mem = memoryStore();
    const store = __licenceOutreachForTest({
      factoryDeps: mem.deps,
      readPolicyLines: () => copy(PASSING) as never,
      policyReadable: () => true,
      openProblems: impl.openProblems,
      ...(impl.merge ? { merge: impl.merge as never } : {}),
    });
    await settle();
    const res = await store.open(OFFICER, AT);
    const opened = res.ok && res.recordedAt === AT;
    const sameProcess = store.read().state === "open";
    const reloaded = (await store.reload()).state === "open";
    const row = mem.row();
    const exactly = row !== null && JSON.stringify(Object.keys(row).sort()) === JSON.stringify(["recordedAt", "recordedBy", "state"]);
    const rows = await auditRows();
    const audited = rows.some((r) => r.action === "marketing.outreach_opened");
    ok(p(L.r3), opened && sameProcess && reloaded && exactly && audited,
      `opened ${opened} · same process ${sameProcess} · reload ${reloaded} · row ${JSON.stringify(row)} · audited ${audited}`);
  }

  // ── R4 · CLOSING ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const mem = memoryStore({ state: "open", recordedBy: OFFICER, recordedAt: AT });
    const store = __licenceOutreachForTest({
      factoryDeps: mem.deps,
      // ⛔ The policy record is the EMPTY one: a close is never refused for a failing check.
      readPolicyLines: () => copy(EMPTY_LINES) as never,
      policyReadable: () => true,
      openProblems: impl.openProblems,
      ...(impl.merge ? { merge: impl.merge as never } : {}),
    });
    await settle();
    const wasOpen = store.read().state === "open";
    const res = await store.close(OFFICER, AT);
    const closedNow = store.read().state === "closed";
    const rows = await auditRows();
    const audited = rows.some((r) => r.action === "marketing.outreach_closed");
    ok(p(L.r4), wasOpen && res.ok && closedNow && audited,
      `was open ${wasOpen} · closed ${res.ok} · reads closed at once ${closedNow} · audited ${audited}`);
  }

  // ── R4b · OPEN → CLOSE → OPEN ───────────────────────────────────────────────────────────────────────────────────
  {
    const mem = memoryStore();
    const store = __licenceOutreachForTest({
      factoryDeps: mem.deps,
      readPolicyLines: () => copy(PASSING) as never,
      policyReadable: () => true,
      openProblems: impl.openProblems,
      ...(impl.merge ? { merge: impl.merge as never } : {}),
    });
    await settle();
    await store.open(OFFICER, AT);
    await store.close(OFFICER, "2026-10-05T10:00:00.000Z");
    const closed = store.read().state === "closed";
    await store.open(OFFICER, "2026-10-05T11:00:00.000Z");
    const again = store.read();
    const row = mem.row();
    const keys = row === null ? [] : Object.keys(row).sort();
    // ⛔ THE ROW IS REPLACED WHOLE: no `closedBy`/`closedAt` may survive, or the reader rightly calls it malformed.
    const exactly = JSON.stringify(keys) === JSON.stringify(["recordedAt", "recordedBy", "state"]);
    ok(p(L.r4b), closed && again.state === "open" && exactly,
      `closed between ${closed} · reads ${again.state} · row keys ${keys.join(",")}`);
  }

  // ── R5 · THE REAL GATE ──────────────────────────────────────────────────────────────────────────────────────────
  {
    const mem = memoryStore();
    const store = __licenceOutreachForTest({
      factoryDeps: mem.deps,
      readPolicyLines: () => copy(PASSING) as never,
      policyReadable: () => true,
      openProblems: impl.openProblems,
      ...(impl.merge ? { merge: impl.merge as never } : {}),
    });
    await settle();
    /* ⭐ THE GATE AS A LICENCE SEND ASKS IT: a player who never answered the consent question has no consent, so the
       ONLY thing that can let a message through is the record being open. Read through the store under test, which is
       what U33a-G will call. */
    const mayReachNeverAsked = (): boolean => store.read().state === "open";
    const beforeOpen = mayReachNeverAsked();
    await store.open(OFFICER, AT);
    const whileOpen = mayReachNeverAsked();
    await store.close(OFFICER, "2026-10-05T12:00:00.000Z");
    const afterClose = mayReachNeverAsked();
    ok(p(L.r5), beforeOpen === false && whileOpen === true && afterClose === false,
      `closed ${beforeOpen} · open ${whileOpen} · closed again ${afterClose}`);
  }

  // ── R6 · THE WIRING ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const scripts = pkg.scripts;
    const keys = scripts["test:licence-outreach"] === "tsx scripts/licence-outreach.test.mts"
      && scripts["red:licence-outreach"] === "tsx scripts/licence-outreach.test.mts --prove-red";
    // ⭐ Chained into predeploy right after the policy-lines suite — the §0 instruction, by hand.
    const pre = scripts.predeploy ?? "";
    const order = pre.indexOf("npm run test:policy-lines") >= 0
      && pre.indexOf("npm run test:licence-outreach") === pre.indexOf("npm run test:policy-lines") + "npm run test:policy-lines && ".length;
    // The four checks, in the spec's order, each with the spec's own sentence and none empty.
    const ordered = JSON.stringify([...OUTREACH_OPEN_CHECKS]) === JSON.stringify(["privacy_gateway", "privacy_lawful", "rg_age", "preledger"]);
    const sentences = OUTREACH_OPEN_CHECKS.every((c) => (OUTREACH_CHECK_SENTENCE[c] ?? "").length > 20);
    // ⛔ The pure half imports nothing from the server half.
    const pure = readFileSync(join(ROOT, "src/lib/marketing/outreach-open-checks.ts"), "utf8");
    const isPure = !pure.includes("@/lib/server/") && !pure.includes("../server/");
    const reconciled = PRE_LEDGER_OFFS === "reconciled";
    const keyOk = LICENCE_OUTREACH_KEY === "marketing.outreach.licence";
    ok(p(L.r6), keys && order && ordered && sentences && isPure && reconciled && keyOk,
      `scripts ${keys} · predeploy order ${order} · order ${ordered} · sentences ${sentences} · pure ${isPure} · reconciled ${reconciled} · key ${keyOk}`);
  }
}

/* ══ THE RED CASES — one planted defect each, through the store's declared seams ═════════════════════════════════ */

function cases(): { name: string; expect: string; impl: Impl }[] {
  return [
    {
      name: "absent reads as OPEN",
      expect: L.r1,
      impl: {
        ...REAL,
        readRow: (v: unknown) => (v === null || v === undefined
          ? { state: "open", recordedBy: OFFICER, recordedAt: AT }
          : readLicenceOutreachRow(v)) as ReturnType<typeof readLicenceOutreachRow>,
      },
    },
    {
      name: "a malformed row reads as OPEN (the extra key is tolerated)",
      expect: L.r1,
      impl: {
        ...REAL,
        readRow: (v: unknown) => {
          const row = v as Record<string, unknown> | null;
          if (row && typeof row === "object" && !Array.isArray(row) && row.state === "open"
            && typeof row.recordedBy === "string" && typeof row.recordedAt === "string") {
            return { state: "open", recordedBy: row.recordedBy, recordedAt: row.recordedAt } as ReturnType<typeof readLicenceOutreachRow>;
          }
          return readLicenceOutreachRow(v);
        },
      },
    },
    {
      name: "the four checks are waved through — opening with every one failing",
      expect: L.r2,
      impl: { ...REAL, openProblems: () => [] },
    },
    {
      name: "PRE_LEDGER_OFFS is ignored",
      expect: L.r2,
      // The checks run, but the fourth is dropped — so an outstanding reconciliation no longer refuses.
      impl: { ...REAL, openProblems: (record, _offs) => outreachOpenProblems(record, "reconciled") },
    },
    {
      name: "the factory's shallow spread is restored — a close leaves its keys in the next open row",
      expect: L.r4b,
      impl: { ...REAL, merge: (current: unknown, updates: unknown) => ({ ...(current as object), ...(updates as object) }) },
    },
  ];
}

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}licence-outreach: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);
  const CASES = cases();
  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on its own line — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.slice(0, 60)}…${LF}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${LF}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${LF}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
