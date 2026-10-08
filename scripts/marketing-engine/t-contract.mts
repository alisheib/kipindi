/**
 * test:marketing-engine §T — U43b-2's guard: THE U9 CONTRACT THROUGH THE ENGINE (ENGINE-SPEC §4.13 decision 4, tests §T;
 * dispatch.ts's header: "the loop is U43 — call it, do not rewrite it"). Somebody who opts out in minute two must not
 * receive minute four's message: the engine must ask the ONE gate per recipient IMMEDIATELY before the wire — inside
 * `dispatchSlice` — and never at the moment it claimed the list.
 *
 * ⚠️ A SECTION MODULE, run by `scripts/marketing-engine.test.mts`. ⭐ DRIVEN: `runCampaignSlice` over real recipient rows of
 * consenting players and the REAL acts that change a mind — U8's `stopMarketing` (fired while the slice prepares an
 * earlier person's message), `selfExclude` and `coolOff` between two slices — the REAL gate, a stub wire. T2 holds the
 * whole contract's second driver in `test:marketing-consent` (U9.0–U9.14 through `runCampaignSlice`) to its wiring.
 * ⛔ IN-PROCESS: every plant is a dependency or a source text swapped in memory; no SMS, no file, no database. ⛔ No backslash.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as ENGINE from "../../src/lib/server/marketing/engine.ts";
import type { EngineDeps } from "../../src/lib/server/marketing/engine.ts";
import { mayReceiveMarketingSms } from "../../src/lib/server/marketing/consent.ts";
import type { MarketingGateVerdict } from "../../src/lib/server/marketing/consent.ts";
import { MARKETING_RG_SUPPRESSED_ACTION } from "../../src/lib/server/marketing/dispatch.ts";
import { ensureOptOutToken, mintOptOutToken, stopMarketing } from "../../src/lib/server/marketing/optout-service.ts";
import { selfExclude, coolOff } from "../../src/lib/server/responsible-gambling.ts";
import {
  auditRows, campaignOf, claim, engineDeps, freshState, keyIn, nextRun, player, rowOf, runningCampaign, said, seat, stubWire,
} from "./engine-world.mts";
import type { Check } from "./engine-world.mts";
import type { EngineSection, EnginePlant } from "./f-credit.mts";

const L = {
  t1: "T1 · ⭐ THE U9 CONTRACT THROUGH runCampaignSlice — a number that opts out WHILE the slice prepares an earlier person's message never reaches the wire (SKIPPED suppressed); between two slices a self-exclusion and a break are SKIPPED rg_self_excluded and rg_cooling_off, never on the wire; the eligible players are SENT, the one number the wire refuses is the only FAILED (BAD_MSISDN) — every refusal SKIPPED, never FAILED — ONE wire call per slice, ONE RG line per RG refusal against the account, and the campaign DONE",
  t2: "T2 · THE SECOND DRIVER'S WIRING — test:marketing-consent runs U9's whole contract through runCampaignSlice over real recipient rows (its engineDriver, run in the main path under the engine: tag), and its red proves R-T1 — the gate asked when the list is claimed — on U9.1",
} as const;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CR = String.fromCharCode(13);
const CONSENT_SUITE = readFileSync(join(ROOT, "scripts", "marketing-consent.test.mts"), "utf8").split(CR).join("");

export type TImpl = {
  step: typeof ENGINE.runCampaignSlice;
  deps: (d: EngineDeps) => EngineDeps;
  consentSuite: string;
};
export const T_REAL: TImpl = { step: ENGINE.runCampaignSlice, deps: (d) => d, consentSuite: CONSENT_SUITE };

const pad = (n: number, w: number): string => String(n).padStart(w, "0");

async function runSectionT(impl: TImpl, ok: Check): Promise<void> {
  await claim(ok, L.t1, async () => {
    const run = nextRun();
    const key = (i: number) => keyIn("62", run * 1000 + i);
    const cid = `cmp_t1_${run}`;
    const rid = (i: number) => `rcp_t1_${pad(run, 5)}_${pad(i, 3)}`;
    await runningCampaign(cid, { count: 7 });
    const names = ["A", "X", "B", "Y", "Z", "C", "F"];
    const who = new Map<string, { id: string; key: string }>();
    for (const [i, n] of names.entries()) who.set(n, await player(`usr_t1_${run}_${n}`, key(i)));
    const at = (n: string) => who.get(n) as { id: string; key: string };
    const xToken = await mintOptOutToken(at("X").key);
    // ⭐ X opts out through U8's REAL act while the slice is preparing A's message — after A's gate, before X's.
    let fired = false;
    const ensureToken: EngineDeps["ensureToken"] = async (k) => {
      if (!fired && k === at("A").key && xToken !== null) {
        fired = true;
        await stopMarketing(xToken, "SW");
      }
      return ensureOptOutToken(k);
    };
    const wire = stubWire({ answer: (m) => (m.to === at("F").key ? "bad_msisdn" : "ok") });
    const d = impl.deps(engineDeps(freshState(), wire, { ensureToken }));
    const seatOf = (n: string, i: number) => ({ id: rid(i), key: at(n).key, userId: at(n).id });
    await seat(cid, [seatOf("A", 0), seatOf("X", 1), seatOf("B", 2)]);
    const s1 = await impl.step(cid, d);
    // between the slices: a self-exclusion and a break, through the REAL acts
    await selfExclude(at("Y").id, "24h");
    await coolOff(at("Z").id, "1h");
    await seat(cid, [seatOf("Y", 3), seatOf("Z", 4), seatOf("C", 5), seatOf("F", 6)]);
    const s2 = await impl.step(cid, d);
    const s3 = await impl.step(cid, d);
    const rows = new Map<string, Awaited<ReturnType<typeof rowOf>>>();
    for (const [i, n] of names.entries()) rows.set(n, await rowOf(rid(i)));
    const row = (n: string) => rows.get(n) ?? null;
    const onWire = (n: string) => wire.sent.some((m) => m.to === at(n).key);
    const rgY = await auditRows(MARKETING_RG_SUPPRESSED_ACTION, at("Y").id);
    const rgZ = await auditRows(MARKETING_RG_SUPPRESSED_ACTION, at("Z").id);
    const c = await campaignOf(cid);
    const failed = [...rows.entries()].filter(([, r]) => r?.status === "FAILED").map(([n]) => n);
    const holds = fired && !onWire("X") && !onWire("Y") && !onWire("Z")
      && row("X")?.status === "SKIPPED" && row("X")?.skipReason === "suppressed"
      && row("Y")?.status === "SKIPPED" && row("Y")?.skipReason === "rg_self_excluded"
      && row("Z")?.status === "SKIPPED" && row("Z")?.skipReason === "rg_cooling_off"
      && ["A", "B", "C"].every((n) => row(n)?.status === "SENT" && onWire(n))
      && failed.join() === "F" && row("F")?.failureClass === "BAD_MSISDN"
      && wire.calls === 2 && rgY.length === 1 && rgZ.length === 1 && s3.kind === "finished" && c?.status === "DONE";
    return [holds, `${said(s1)} → ${said(s2)} → ${said(s3)} · ${names.map((n) => `${n}:${row(n)?.status ?? "none"}${row(n)?.skipReason ? `/${row(n)?.skipReason}` : ""}`).join(" ")} · on the wire [${names.filter(onWire).join("")}] · calls ${wire.calls} · RG lines ${rgY.length}/${rgZ.length} · ${c?.status}`];
  });

  await claim(ok, L.t2, async () => {
    const s = impl.consentSuite;
    const defined = /const engineDriver = /.test(s) && /runCampaignSlice[(]/.test(s);
    const runAt = s.indexOf("if (!PROVE_RED) {");
    const elseAt = s.indexOf("} else {", runAt);
    const mainPath = runAt >= 0 && elseAt > runAt ? s.slice(runAt, elseAt) : "";
    const runsIt = /await runLoopContract[(]engineDriver[(][)], [0-9]+, "engine:"[)];/.test(mainPath);
    const redsIt = /R-T1/.test(s) && /driver: engineDriver[(][{] hoisted: true [}][)]/.test(s);
    return [defined && runsIt && redsIt, `defined ${defined} · runs in the main path ${runsIt} · red R-T1 ${redsIt}`];
  });
}

export const T_PLANTS: ReadonlyArray<EnginePlant<TImpl>> = [
  {
    // The list's verdicts taken when the rows are claimed, then the slice sent on them — X's stop, landing after the claim
    // and before X's turn, is never read.
    name: "R-T1 (the spec's) · the engine gating at claim time instead of in dispatchSlice — the opted-out number is sent (U9's own red)",
    expect: [L.t1],
    impl: () => ({
      deps: (d) => {
        const ask = d.gate ?? ((m: string) => mayReceiveMarketingSms(m));
        const verdicts = new Map<string, MarketingGateVerdict>();
        return {
          ...d,
          recipients: {
            ...d.recipients,
            claim: async (c, l, t, a) => {
              const won = await d.recipients.claim(c, l, t, a);
              for (const r of won) verdicts.set(r.msisdn, await ask(r.msisdn));
              return won;
            },
          },
          gate: async (m) => verdicts.get(m) ?? ask(m),
        };
      },
    }),
  },
  {
    name: "R-T2 · the second driver dropped from test:marketing-consent's main path (the contract no longer runs through the engine)",
    expect: [L.t2],
    impl: () => ({ consentSuite: CONSENT_SUITE.split("await runLoopContract(engineDriver(), ").join("// (dropped) ") }),
  },
];

/** ⭐ §T, as a host runs it. */
export const SECTION_T: EngineSection<TImpl> = {
  id: "T",
  title: "§T · U43b-2 · the U9 contract through the engine",
  labels: Object.values(L),
  real: T_REAL,
  run: runSectionT,
  plants: T_PLANTS,
};
