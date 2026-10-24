import Link from "next/link";
import type { Route } from "next";
import { AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { dict } from "@/lib/i18n-server";
import { db } from "@/lib/server/store";
import { officerLabel } from "@/lib/server/actor-label";
import {
  readSecondOfficerPolicy, SECOND_OFFICER_REASON_MAX, SECOND_OFFICER_REASON_MIN,
} from "@/lib/server/second-officer-policy";
import { readRequireTwoOfficerResolution } from "@/lib/server/resolution-policy";
import { formatDateTimeSafe, formatTzs } from "@/lib/utils";
import { TWO_PERSON_THRESHOLD_TZS } from "../aml/constants";
import { SecondOfficerSwitch } from "./second-officer-switch";

/** The twelve checks the setting governs, in the order of `docs/FEE-TAX-PLAN.md` §4 R1 (`second-officer-policy.ts`). */
const CHECKS = ["check1", "check2", "check3", "check4", "check5", "check6", "check7", "check8", "check9", "check10", "check11", "check12"] as const;

/**
 * ⭐ FEE-TAX R1 · THE OWNER'S "SECOND-OFFICER CHECKS" CARD on /admin/system (ruling 6 of 2026-10-24; the setting:
 * `second-officer-policy.ts`). It says, in the officer's own language (`secondOfficer.*`): what the setting does, whether it
 * is ON or OFF and where that answer came from — the Owner's stored change with its name, time and reason; or nothing
 * stored, which is OFF by the Owner's ruling of 24 October 2026, turning the checks on being the Owner's act on this card;
 * or a read that failed, or a stored row it cannot understand, both ON — the twelve checks it governs in plain words, what
 * it never changes, and that two-officer approval of market results is a different switch, on the resolver queue — its
 * state shown read-only, with the way there.
 *
 * ⛔ VISIBLE TO EVERY OFFICER WHO OPENS THIS PAGE; CHANGED BY THE OWNER ALONE. Whether the viewer is the Owner is ONE read
 * of the STORED role (a role that cannot be read is not the Owner's); everyone else reads who can change it. The action
 * asks again, and so does the writer.
 * ⛔ READ FRESH ON EVERY RENDER, as every gated check reads it: the card never draws a position the checks do not obey.
 * ⭐ On the Platform tab, not above the rail: it is the Owner's setting for how officers work, not an alarm that something
 * is wrong right now (§K rule 7d) — every card above the rail answers that question, and this one does not.
 */
export async function SecondOfficerCard({ viewerId }: { viewerId: string | null }) {
  // ⛔ ENGLISH, never the viewer's cookie: the officer console's server copy is English (`i18n-parity`, "THE OFFICER
  // CONSOLE IS ENGLISH (2026-10-02)") — an officer whose player-site choice is Swahili must not get one Swahili card among
  // English ones. The Swahili title rides beside it as every console card's `sw` subtitle.
  const [policy, resolution] = await Promise.all([
    readSecondOfficerPolicy(),
    readRequireTwoOfficerResolution().catch(() => null),
  ]);
  const locale = "en" as const;
  const w = dict.en.secondOfficer;
  // ⛔ try/await, never `.catch` on the call: the in-memory store answers synchronously (the tax page's lesson).
  let viewerRole: string | null = null;
  try { viewerRole = viewerId ? ((await db.user.findById(viewerId))?.role ?? null) : null; } catch { viewerRole = null; }
  const isOwner = viewerRole === "ADMIN";

  const on = policy.on;
  const amount = formatTzs(TWO_PERSON_THRESHOLD_TZS);
  const reasonHint = w.reasonHint.replace("{min}", String(SECOND_OFFICER_REASON_MIN)).replace("{max}", String(SECOND_OFFICER_REASON_MAX));
  let provenance: string;
  if (policy.source === "stored") {
    const name = (await officerLabel(policy.changedBy, { fallback: () => w.ownerFallback })) ?? w.ownerFallback;
    provenance = (policy.on ? w.provenanceOn : w.provenanceOff)
      .replace("{name}", name).replace("{when}", formatDateTimeSafe(policy.changedAt)).replace("{reason}", policy.reason);
  } else {
    provenance = policy.source === "absent" ? w.provenanceAbsent : policy.source === "unreadable" ? w.provenanceUnreadable : w.provenanceMalformed;
  }
  const resolutionState = resolution === null ? w.resolutionUnread : resolution ? w.resolutionOn : w.resolutionOff;

  return (
    <AdminCard
      title={w.title}
      sw={locale === "en" ? dict.sw.secondOfficer.title : undefined}
      action={<Chip size="sm" variant={on ? "success" : "warning"}>{on ? w.stateOn : w.stateOff}</Chip>}
      data-second-officer={on ? "on" : "off"}
      data-second-officer-source={policy.source}
    >
      <div className="space-y-2">
        <p className="font-display text-body-lg font-bold text-text">{on ? w.onLine : w.offLine}</p>
        <p className="text-body-sm text-text-secondary">{w.intro}</p>
        <p className={policy.source === "unreadable" || policy.source === "malformed" ? "text-body-sm text-warning-fg" : "text-body-sm text-text-muted"}>
          {policy.source === "stored" ? <span data-operator-text="label">{provenance}</span> : provenance}
        </p>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-body-sm font-semibold text-text">{w.listTitle}</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-body-sm text-text-secondary">
          {CHECKS.map((k) => <li key={k}>{w[k].replace("{amount}", amount)}</li>)}
        </ol>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-3">
        <p className="text-body-sm font-semibold text-text">{w.keepsTitle}</p>
        <p className="text-body-sm text-text-secondary">{w.keeps}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
        <p className="text-body-sm text-text-muted" data-resolution-two-officer={resolution === null ? "unread" : resolution ? "on" : "off"}>
          {w.resolutionLine.replace("{state}", resolutionState)}
        </p>
        <Link href={"/admin/resolver-queue" as Route} className="inline-flex min-h-[44px] items-center gap-1 text-body-sm text-brand-300 hover:underline">
          {w.resolutionLink} <I.chevronRight s={12} />
        </Link>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {isOwner ? (
          <SecondOfficerSwitch
            /* ⭐ Keyed by direction, so a change that lands and flips the card starts the other dialog clean. */
            key={on ? "to-off" : "to-on"}
            to={!on}
            reasonMin={SECOND_OFFICER_REASON_MIN}
            reasonMax={SECOND_OFFICER_REASON_MAX}
            words={{
              trigger: on ? w.turnOff : w.turnOn,
              title: on ? w.offTitle : w.onTitle,
              body: on ? w.offBody : w.onBody,
              reasonLabel: w.reasonLabel,
              reasonHint,
              reasonLeft: w.reasonLeft,
              confirmLabel: on ? w.confirmOff : w.confirmOn,
              cancel: w.cancel,
              doneTitle: on ? w.doneOff : w.doneOn,
              unchanged: w.unchanged,
              failTitle: w.failTitle,
            }}
          />
        ) : (
          <p className="text-body-sm text-text-muted">{w.ownerOnly}</p>
        )}
      </div>
    </AdminCard>
  );
}
