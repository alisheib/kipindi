/**
 * test:admin-overview-feed — ⛔ OD61 · THE /admin OVERVIEW'S LIVE ACTIVITY FEED SHOWS COMPLIANCE ROWS ONLY TO A VIEWER WHO
 * MAY READ COMPLIANCE (marketing tracker ◐ 3a (i); `src/lib/server/admin-overview-feed.ts`).
 *
 * The overview is open to every staff role, and its feed printed the newest audit rows whole, COMPLIANCE ones included —
 * so a `marketing.suppressed.rg · User#…` line written while a campaign sends would tell a GROWTH officer which number
 * belongs to a protected player (the D19 oracle). This suite owns the feed's rule.
 *
 * ⭐ DRIVEN, NOT READ, wherever a script can run it — over the MEMORY twin, in-process:
 *   §1 THE RULE — `overviewFeedRows` on a ring of mixed rows: a reader is shown the newest rows as read, COMPLIANCE
 *      included; anyone else no COMPLIANCE row and the SAME number of rows — the newest of every other category, in
 *      order, so the gap where a hidden row was can never be counted; a short ring shows what it may; nothing is nothing.
 *   §2 THE VIEWER — `viewerMayReadCompliance` on real accounts and the real grant matrix: the Owner, COMPLIANCE and
 *      AUDITOR may; GROWTH, FINANCE, MODERATOR and SUPPORT may not; a GROWTH officer the Owner grants the compliance view
 *      may, and stops with the grant; a player, an agent, an unknown id, null and "" may not; a row that cannot be read
 *      may not — it fails closed, and never throws.
 * Then the SOURCE, for what only the source can show (§3): the page asks the viewer once, reads the whole ring through
 * `houseAuditForConsole` and renders only what `overviewFeedRows` hands it; the scan covers the audit ring. §4 the wiring.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — the rule, the viewer's read, a store member
 * for the length of one call, or a COPY of a source string — and requires the MATCHING assertion to fail. This file makes
 * no file-modifying call of any kind.
 *
 * Run:  npm run test:admin-overview-feed
 * Red:  npm run red:admin-overview-feed
 */
process.exitCode = 1;
delete process.env.DATABASE_URL;

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredUser } from "../src/lib/server/store.ts";
import type { AuditCategory, AuditEntry } from "../src/lib/server/audit.ts";
import { isStaffRole } from "../src/lib/server/roles.ts";
import { __resetGrantsForTest, canView, setRoleGrant } from "../src/lib/server/rbac.ts";
import {
  COMPLIANCE_ONLY_CATEGORY, OVERVIEW_FEED_ROWS, OVERVIEW_FEED_SCAN, overviewFeedRows, viewerMayReadCompliance,
} from "../src/lib/server/admin-overview-feed.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).split(CR + LF).join(LF);
const rawRead = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF);

/* ═══ VERDICTS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence is computed by `fn` — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}

/* ═══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A ring of `n` rows, newest first, whose categories cycle so COMPLIANCE rows sit among every other kind. */
const CYCLE: readonly AuditCategory[] = ["COMPLIANCE", "BET", "WALLET", "COMPLIANCE", "AUTH", "ADMIN", "COMPLIANCE", "SYSTEM", "SECURITY", "KYC"];
function ring(n: number, prefix: string): AuditEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}_${String(i).padStart(4, "0")}`, category: CYCLE[i % CYCLE.length], action: `fixture.row_${i}`,
    actorId: null, targetType: "User", targetId: `usr_fixture_${i}`, createdAt: new Date(Date.UTC(2026, 9, 7, 12, 0, 0) - i * 1000).toISOString(),
  }) as AuditEntry);
}
const ids = (rows: readonly AuditEntry[]) => rows.map((r) => r.id).join(",");

let RUN = 0;
/** An account with a number no other run uses: the run in two digits, a three-digit slot. */
function account(id: string, role: StoredUser["role"], slot: number, o: Partial<StoredUser> = {}): StoredUser {
  const at = "2026-09-20T08:00:00.000Z";
  return {
    id, phoneE164: `+2557519${String(RUN).padStart(2, "0")}${String(slot).padStart(3, "0")}`, email: null,
    emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null, ...o,
  } as StoredUser;
}

/** One member of the user store swapped for the length of `fn` — in memory, never on disk — and put back. */
async function withUserMember<T>(name: "findById", planted: unknown, fn: () => Promise<T>): Promise<T> {
  const target = db.user as unknown as Record<string, unknown>;
  const real = target[name];
  target[name] = planted;
  try {
    return await fn();
  } finally {
    target[name] = real;
  }
}

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═════════════════════════════════ */

type Sources = { page: string; audit: string; pkg: string };
const REAL_SOURCES: Sources = {
  page: read("src/app/admin/page.tsx"),
  audit: read("src/lib/server/audit.ts"),
  pkg: rawRead("package.json"),
};
type Impl = {
  rows: typeof overviewFeedRows;
  mayRead: typeof viewerMayReadCompliance;
  scan: number;
  sources: Sources;
};
const REAL: Impl = { rows: overviewFeedRows, mayRead: viewerMayReadCompliance, scan: OVERVIEW_FEED_SCAN, sources: REAL_SOURCES };

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ══════════════════════════════════════════ */

const L = {
  r1: `1.1 · a viewer who may read compliance is shown the newest ${OVERVIEW_FEED_ROWS} rows exactly as read — COMPLIANCE rows included, in order`,
  r2: `1.2 · ⛔ OD61 · anyone else is shown NO COMPLIANCE row and the SAME number of rows — the newest ${OVERVIEW_FEED_ROWS} of every other category, in order, so the gap where a hidden row was can never be counted`,
  r3: "1.3 · a short ring shows what each may read (all of it to a reader, every non-compliance row to anyone else), and no rows is no rows",
  v1: "2.1 · ⛔ the STORED role decides: the Owner, COMPLIANCE and AUDITOR may read compliance; GROWTH, FINANCE, MODERATOR and SUPPORT may not; a player, an agent, an unknown id, null and an empty id may not",
  v2: "2.2 · the grant decides, live: a GROWTH officer the Owner grants the compliance view may read compliance, and may not once the grant is taken back",
  v3: "2.3 · ⛔ FAILS CLOSED: a viewer whose row cannot be read may not read compliance — and the answer is false, never a throw",
  s1: "3.1 · THE PAGE: /admin asks viewerMayReadCompliance(session?.userId ?? null) once, reads the feed ONCE through houseAuditForConsole(session?.userId ?? null, \"/admin\", getAuditPage({ limit: OVERVIEW_FEED_SCAN })), and renders only what overviewFeedRows(…, mayReadCompliance) hands it",
  s2: "3.2 · the scan covers the WHOLE audit ring (OVERVIEW_FEED_SCAN ≥ audit.ts MAX_IN_MEM), so a burst of compliance rows can never shorten anybody's feed",
  s3: "3.3 · the suite is wired: test:admin-overview-feed and red:admin-overview-feed (--prove-red, in-process) exist, and predeploy runs the suite exactly once",
} as const;

/* ═══ THE RUN ════════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  RUN++;
  const p = (n: string) => `${tag}${n}`;

  /* ── §1 · THE RULE ────────────────────────────────────────────────────────────────────────────────────────── */
  const big = ring(60, `r${RUN}`);
  await check(p(L.r1), () => {
    const got = impl.rows(big, true);
    const want = big.slice(0, OVERVIEW_FEED_ROWS);
    return [ids(got) === ids(want) && got.some((r) => r.category === COMPLIANCE_ONLY_CATEGORY),
      `${got.length} row(s) · ${got.filter((r) => r.category === "COMPLIANCE").length} compliance`];
  });
  await check(p(L.r2), () => {
    const got = impl.rows(big, false);
    const want = big.filter((r) => r.category !== "COMPLIANCE").slice(0, OVERVIEW_FEED_ROWS);
    return [got.length === OVERVIEW_FEED_ROWS && !got.some((r) => r.category === "COMPLIANCE") && ids(got) === ids(want),
      `${got.length} row(s) · ${got.filter((r) => r.category === "COMPLIANCE").length} compliance · ${ids(got) === ids(want) ? "the newest of the rest, in order" : `NOT the newest of the rest: ${ids(got)}`}`];
  });
  await check(p(L.r3), () => {
    const short = ring(7, `s${RUN}`);
    const reader = impl.rows(short, true);
    const other = impl.rows(short, false);
    const wantOther = short.filter((r) => r.category !== "COMPLIANCE");
    const none = impl.rows([], false).length === 0 && impl.rows(null, true).length === 0 && impl.rows(undefined, false).length === 0;
    return [ids(reader) === ids(short) && ids(other) === ids(wantOther) && none,
      `reader ${reader.length}/${short.length} · other ${other.length}/${wantOther.length} · empty reads ${none ? "empty" : "NOT EMPTY"}`];
  });

  /* ── §2 · THE VIEWER ──────────────────────────────────────────────────────────────────────────────────────── */
  const roles = ["ADMIN", "COMPLIANCE", "AUDITOR", "GROWTH", "FINANCE", "MODERATOR", "SUPPORT", "PLAYER", "AGENT"] as const;
  const people = new Map<string, string>();
  for (const [slot, role] of roles.entries()) {
    const id = `usr_aof${RUN}_${role.toLowerCase()}`;
    await Promise.resolve(db.user.create(account(id, role, slot)));
    people.set(role, id);
  }
  __resetGrantsForTest();
  await check(p(L.v1), async () => {
    const want: Record<string, boolean> = {
      ADMIN: true, COMPLIANCE: true, AUDITOR: true, GROWTH: false, FINANCE: false, MODERATOR: false, SUPPORT: false, PLAYER: false, AGENT: false,
    };
    const wrong: string[] = [];
    for (const role of roles) {
      const got = await impl.mayRead(people.get(role) ?? "");
      if (got !== want[role]) wrong.push(`${role} ${got}`);
    }
    for (const [name, id] of [["unknown id", `usr_aof${RUN}_nobody`], ["null", null], ["empty", ""]] as const) {
      const got = await impl.mayRead(id);
      if (got !== false) wrong.push(`${name} ${got}`);
    }
    return [wrong.length === 0, wrong.join(" · ") || "every role as its grant says, every non-viewer refused"];
  });
  await check(p(L.v2), async () => {
    const growth = people.get("GROWTH") ?? "";
    try {
      await setRoleGrant("GROWTH", "compliance", true, false, "usr_owner_aof");
      const granted = await impl.mayRead(growth);
      await setRoleGrant("GROWTH", "compliance", false, false, "usr_owner_aof");
      const revoked = await impl.mayRead(growth);
      return [granted === true && revoked === false, `granted ${granted} · taken back ${revoked}`];
    } finally {
      __resetGrantsForTest();
    }
  });
  await check(p(L.v3), async () => {
    let threw = "";
    let got: unknown = "unset";
    await withUserMember("findById", () => { throw new Error("planted by test:admin-overview-feed: the row cannot be read"); }, async () => {
      try { got = await impl.mayRead(people.get("COMPLIANCE") ?? ""); } catch (err) { threw = String((err as Error)?.message ?? err); }
    });
    return [threw === "" && got === false, threw ? `THREW ${threw}` : `answered ${String(got)}`];
  });

  /* ── §3 · THE SOURCE ─────────────────────────────────────────────────────────────────────────────────────── */
  const s = impl.sources;
  await check(p(L.s1), () => {
    const page = s.page;
    const asks = page.split("viewerMayReadCompliance(").length - 1;
    const askedOnce = asks === 1 && /const mayReadCompliance = await viewerMayReadCompliance\(session\?\.userId \?\? null\);/.test(page);
    const reads = page.split("getAuditPage(").length - 1;
    const gated = page.includes('const feedRead = await houseAuditForConsole(session?.userId ?? null, "/admin", getAuditPage({ limit: OVERVIEW_FEED_SCAN }));');
    const ruled = page.includes("const recent = overviewFeedRows(feedRead, mayReadCompliance);");
    const rendered = page.includes("{recent.map((e) => (") && !/feedRead\.map\(/.test(page);
    const imported = page.includes('from "@/lib/server/admin-overview-feed";');
    return [askedOnce && reads === 1 && gated && ruled && rendered && imported,
      `asked ${asks}× (${askedOnce ? "once, as the viewer" : "WRONG"}) · audit reads ${reads} · gated ${gated} · ruled ${ruled} · rendered ${rendered} · imported ${imported}`];
  });
  await check(p(L.s2), () => {
    const m = /const MAX_IN_MEM = ([0-9_]+);/.exec(s.audit);
    const ring = m ? Number(m[1].replace(/_/g, "")) : NaN;
    return [Number.isFinite(ring) && ring > 0 && impl.scan >= ring, `scan ${impl.scan} · ring ${ring}`];
  });
  await check(p(L.s3), () => {
    const scripts = (JSON.parse(s.pkg) as { scripts: Record<string, string> }).scripts;
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    const onChain = chain.filter((x) => x === "npm run test:admin-overview-feed").length;
    return [scripts["test:admin-overview-feed"] === "tsx scripts/admin-overview-feed.test.mts"
      && scripts["red:admin-overview-feed"] === "tsx scripts/admin-overview-feed.test.mts --prove-red" && onChain === 1,
      `test ${scripts["test:admin-overview-feed"] ?? "MISSING"} · red ${scripts["red:admin-overview-feed"] ?? "MISSING"} · on predeploy ×${onChain}`];
  });
}

/* ═══ RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}admin-overview-feed: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);
  /** A copy of one source with `from` replaced by `to` — a PROBLEM when `from` is not there exactly once. */
  const plant = (label: string, file: keyof Sources, from: string, to: string): Sources => {
    const src = REAL_SOURCES[file];
    const n = src.split(from).length - 1;
    if (n !== 1) problems.push(`PLANT MISSED (${label}): ${JSON.stringify(from)} is in ${file} ${n} times, not once`);
    return { ...REAL_SOURCES, [file]: src.replace(from, to) };
  };

  const CASES: Array<{ name: string; expect: string; impl: Impl }> = [
    {
      name: "the feed as it was before OD61 — the newest rows whole, whoever looks",
      expect: L.r2,
      impl: { ...REAL, rows: (rows) => (rows ?? []).slice(0, OVERVIEW_FEED_ROWS) },
    },
    {
      name: "the cut before the filter — a non-reader shown fewer rows exactly where compliance rows were",
      expect: L.r2,
      impl: {
        ...REAL,
        rows: (rows, may) => {
          const cut = (rows ?? []).slice(0, OVERVIEW_FEED_ROWS);
          return may ? cut : cut.filter((r) => r.category !== "COMPLIANCE");
        },
      },
    },
    {
      name: "the reader's feed filtered too — a compliance officer loses the rows they exist to read",
      expect: L.r1,
      impl: { ...REAL, rows: (rows) => (rows ?? []).filter((r) => r.category !== "COMPLIANCE").slice(0, OVERVIEW_FEED_ROWS) },
    },
    {
      name: "any staff role may read compliance — the overview's own view mistaken for the compliance view",
      expect: L.v1,
      impl: {
        ...REAL,
        mayRead: async (id) => {
          if (typeof id !== "string" || id === "") return false;
          const u = await Promise.resolve(db.user.findById(id));
          return !!u && isStaffRole(u.role);
        },
      },
    },
    {
      name: "the grant matrix ignored — the default roles hard-coded, so the Owner's grant never reaches the feed",
      expect: L.v2,
      impl: {
        ...REAL,
        mayRead: async (id) => {
          if (typeof id !== "string" || id === "") return false;
          const u = await Promise.resolve(db.user.findById(id));
          return !!u && ["ADMIN", "COMPLIANCE", "AUDITOR"].includes(u.role);
        },
      },
    },
    {
      name: "a row that cannot be read answers yes — the gate fails OPEN",
      expect: L.v3,
      impl: {
        ...REAL,
        mayRead: async (id) => {
          if (typeof id !== "string" || id === "") return false;
          try {
            const u = await Promise.resolve(db.user.findById(id));
            if (!u || !isStaffRole(u.role)) return false;
            return await canView(u.role, "compliance");
          } catch {
            return true;
          }
        },
      },
    },
    {
      name: "the page renders the raw read — every viewer handed the compliance rows again",
      expect: L.s1,
      impl: { ...REAL, sources: plant("raw", "page", "const recent = overviewFeedRows(feedRead, mayReadCompliance);", "const recent = feedRead;") },
    },
    {
      name: "the page hands the rule a hard-coded yes — the viewer asked, the answer thrown away",
      expect: L.s1,
      impl: { ...REAL, sources: plant("yes", "page", "overviewFeedRows(feedRead, mayReadCompliance)", "overviewFeedRows(feedRead, true)") },
    },
    {
      name: "the read cut back to the twelve the feed shows — a burst of compliance rows empties a non-reader's feed",
      expect: L.s2,
      impl: { ...REAL, scan: OVERVIEW_FEED_ROWS },
    },
    {
      name: "the suite drops out of predeploy — a gate outside the pipeline is not a gate",
      expect: L.s3,
      impl: { ...REAL, sources: plant("predeploy", "pkg", "npm run test:admin-overview-feed && ", "") },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}${LF}`);
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
