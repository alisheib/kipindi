import { cookies } from "next/headers";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  JOURNEY_LINK_LABEL_MAX,
  JOURNEY_LINK_LABEL_MIN,
  JOURNEY_REASON_MAX,
  JOURNEY_REASON_MIN,
  JOURNEY_SWITCH_MAX_AGE_MS,
  journeySwitchView,
  linkIsLive,
  type JourneyPreviewLink,
  type JourneySwitchView,
} from "@/lib/server/simple-journey-switch";
import { previewLinkUrl } from "@/lib/server/simple-journey-ceremony";
import {
  JOURNEY_PREVIEW_COOKIE,
  PREVIEW_LINK_DAYS,
  PREVIEW_PASS_HOURS,
  previewSecret,
  readPreviewPass,
  resolvePreviewPass,
  type PreviewPassClaim,
} from "@/lib/server/journey-preview";
import type { RolloutState } from "@/lib/feature-state";
import { formatDateTime } from "@/lib/utils";
import { RolloutControl, type RolloutPosition } from "./rollout-control";
import { CreatePreviewLink, LinkAddress, RevokePreviewLink } from "./preview-links";

export const metadata = { title: "New journey · Admin" };
export const dynamic = "force-dynamic";

/**
 * /admin/journey — THE NEW JOURNEY'S SWITCH AND PREVIEW (the Vodacom plan S1, `docs/VODACOM-PLAN.md`).
 *
 * Three cards, one read:
 *   · Rollout       — who sees the new journey right now, the ceiling the code and the server allow, and the Owner's
 *                     stored switch. The Owner alone may move it (Stop · Resume · players back to the old journey).
 *   · Your preview  — EVERY staff role, SUPPORT included (SJ-23): whether this browser holds a preview pass, and a
 *                     NATIVE form to turn one on or off. ⛔ Not a server action and not a client component: the pass
 *                     is set by `/preview`, answered by a 303, because only a document load re-runs the root layout
 *                     that paints the "Preview" bar (E-70). And not behind the act gate: previewing opens a view of
 *                     the site, it changes nothing, and every staff role may do it.
 *   · Preview links — the links the Owner issued for people outside 50pick. Everybody sees the list; only the Owner
 *                     sees a link's address (it is a key) and may create or revoke one.
 *
 * ⛔ THIS PAGE DECIDES NOTHING FOR THE PLAYER SITE. It reads the pass only to SAY what this browser holds (the
 * census in `test:simple-journey-flag` §10 allows exactly this page), sets nothing, and never asks
 * `simpleJourneyFor` — the one resolver answers that for every request.
 */
type JourneyProps = { searchParams: Promise<{ preview?: string | string[] }> };

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped by a flight
 *  request whose router state names it, so the gate the page cannot lose is the one it carries itself. */
export default async function AdminJourneyPage(props: JourneyProps) {
  return <AdminPageGate title="New journey"><JourneyAdminContent {...props} /></AdminPageGate>;
}

// ── THE WORDS ───────────────────────────────────────────────────────────────────────────────────────

const LEVEL: Record<RolloutState, string> = { WITHDRAWN: "Off", STAFF_PREVIEW: "Staff preview", ACTIVE: "Live" };

const STATE: Record<RolloutState, { variant: "paused" | "info" | "success"; line: string; body: string }> = {
  WITHDRAWN: {
    variant: "paused",
    line: "Off — nobody sees it",
    body: "Every player and every visitor gets the old journey. Preview passes and preview links are ignored.",
  },
  STAFF_PREVIEW: {
    variant: "info",
    line: "Staff preview — only browsers holding a preview pass",
    body: "Players and visitors get the old journey. A browser holding a preview pass gets the new one, under a “Preview” bar.",
  },
  ACTIVE: {
    variant: "success",
    line: "Live — everyone",
    body: "Every player and every visitor gets the new journey.",
  },
};

/** The Owner's stored cap, in words. ACTIVE is "no cap": the ceiling decides. */
const CAP_WORDS: Record<RolloutState, string> = {
  WITHDRAWN: "Stopped — nobody sees it",
  STAFF_PREVIEW: "Players held on the old journey — previews continue",
  ACTIVE: "No cap — the ceiling decides",
};

/** `/preview` sends a refused "turn on" back here with a code (`journey-preview-doors.ts`). One sentence each. */
const PREVIEW_REFUSAL: Record<string, string> = {
  "cross-site": "That request did not come from this page, so no pass was set. Use the button below.",
  "not-staff": "Only an open staff account can turn a preview on, so no pass was set.",
  withdrawn: "The rollout is Off, so no pass was set — previews are ignored while it is Off.",
  "no-secret": "The server has no JOURNEY_PREVIEW_SECRET, so previews are off and no pass was set.",
  unrecorded: "The record of your preview could not be written, so no pass was set. Try again.",
  who: "We could not confirm who you are, so no pass was set. Reload the page and try again.",
};

const SECONDS = Math.round(JOURNEY_SWITCH_MAX_AGE_MS / 1000);

/**
 * ⭐ THE POSITIONS THAT WOULD CHANGE SOMETHING — and only those. Stop while anybody sees the journey; Resume while
 * the Owner's own cap holds it back (or the record is unreadable); players back to the old journey only while it
 * is Live. ⛔ The server re-checks every one: this list decides which buttons exist, never what is allowed.
 */
function rolloutPositions(view: JourneySwitchView): RolloutPosition[] {
  const out: RolloutPosition[] = [];
  const malformed = view.stored.kind === "MALFORMED";
  /* An unread switch offers nothing: the page cannot know what a press would change. */
  if (view.stored.kind === "UNREAD") return out;
  const freshRecord = "The stored switch is unreadable and reads as Off; this writes a fresh record.";
  /* ⭐ STOP IS OFFERED WHENEVER THE OWNER'S OWN CAP IS NOT ALREADY STOP — also while the ceiling is Off, where it
     changes nothing on screen but is STORED, so lifting FEATURE_SIMPLEJOURNEY does not bring the journey straight
     back. ⛔ Primary, not claret: a Stop is undone by Resume, and §B4a keeps claret for acts that cannot be. */
  if (view.storedCap !== "WITHDRAWN") {
    const quiet = view.state === "WITHDRAWN";
    out.push({
      to: "WITHDRAWN",
      trigger: "Stop — nobody sees it",
      title: "Stop the new journey for everyone?",
      body: quiet
        ? [
          "Nothing changes on screen now: nobody sees the new journey already. The Stop is stored, so it stays off when the ceiling rises.",
          ...(malformed ? [freshRecord] : []),
        ]
        : [
          `Every player and every visitor gets the old journey within ${SECONDS} seconds.`,
          "Every preview pass and every preview link stops counting. The links are kept, and work again after a Resume if they have not ended.",
        ],
      confirmLabel: "Stop it now",
      tone: "primary",
      doneTitle: "Stopped — nobody sees the new journey",
    });
  }
  if (view.storedCap === "WITHDRAWN" || view.storedCap === "STAFF_PREVIEW" || malformed) {
    const after = view.ceiling; // no cap: the ceiling decides
    const effect = after === view.state
      ? `Nothing changes on screen: the ceiling is ${LEVEL[after]}${view.ceilingSource === "ENV" ? " (FEATURE_SIMPLEJOURNEY)" : ""}, and the rollout cannot rise above it. The Owner's cap is lifted from the record, so the rollout follows the ceiling from now on.`
      : after === "STAFF_PREVIEW"
        ? `Within ${SECONDS} seconds, browsers holding a preview pass see the new journey again, under the “Preview” bar. Players and visitors keep the old journey.`
        : `Within ${SECONDS} seconds, every player and every visitor gets the new journey.`;
    out.push({
      to: "ACTIVE",
      trigger: "Resume",
      title: "Resume the new journey?",
      body: malformed ? [effect, "The stored switch is unreadable and reads as Off; this writes a fresh record."] : [effect],
      confirmLabel: "Resume",
      tone: "primary",
      doneTitle: "Resumed",
    });
  }
  /* ⭐ STAFF PREVIEW ONLY, while the ceiling is Live — from Live (players back to the old journey) AND from a
     Stop, so a fix can be checked under the preview without first showing it to every player. */
  if (view.ceiling === "ACTIVE" && view.storedCap !== "STAFF_PREVIEW") {
    const fromLive = view.state === "ACTIVE";
    out.push({
      to: "STAFF_PREVIEW",
      trigger: fromLive ? "Players back to the old journey, previews continue" : "Staff preview only",
      title: fromLive ? "Take players back to the old journey?" : "Open the new journey to previews only?",
      body: fromLive
        ? [
          `Within ${SECONDS} seconds, every player and every visitor gets the old journey again.`,
          "Browsers holding a preview pass, and preview links, keep the new journey under the “Preview” bar.",
        ]
        : [
          `Within ${SECONDS} seconds, browsers holding a preview pass — and live preview links — see the new journey again, under the “Preview” bar. Players and visitors keep the old journey.`,
          ...(malformed ? [freshRecord] : []),
        ],
      confirmLabel: fromLive ? "Players back to the old journey" : "Staff preview only",
      tone: "primary",
      doneTitle: fromLive ? "Players are back on the old journey" : "Previews only — players keep the old journey",
    });
  }
  return out;
}

/** The display name each id in the link list has set for itself. ⛔ Never rejects — an unread name is "the Owner". */
async function staffNames(ids: Array<string | null>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const id of new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0))) {
    try {
      /* 🔴 `await`, never `.then` on a store call: with no DATABASE_URL `db` is the synchronous memory store. */
      const user = await db.user.findById(id);
      const chosen = typeof user?.displayName === "string" ? user.displayName.trim() : "";
      if (chosen.length > 0) out.set(id, chosen);
    } catch { /* the Owner, unnamed */ }
  }
  return out;
}

type LinkStatus = { word: "Live" | "Revoked" | "Ended"; variant: "success" | "paused" | "neutral" };
function linkStatus(link: JourneyPreviewLink, now: number): LinkStatus {
  if (link.revokedAt !== null) return { word: "Revoked", variant: "paused" };
  if (linkIsLive(link, now)) return { word: "Live", variant: "success" };
  return { word: "Ended", variant: "neutral" };
}

/** What this browser's pass is, in one sentence. */
function passSentence(pass: PreviewPassClaim | null, holdsCookie: boolean, viewerId: string | null): string {
  if (pass === null) {
    return holdsCookie
      ? "This browser holds a preview pass that no longer counts — it ended, its link was revoked, whoever turned it on is no longer staff, or the server's preview secret changed."
      : "This browser holds no preview pass.";
  }
  const until = formatDateTime(new Date(pass.exp).toISOString());
  if (pass.kind === "link") return `This browser holds a pass from a preview link, until ${until}.`;
  return pass.issuer === viewerId
    ? `This browser holds your staff preview pass, until ${until}.`
    : `This browser holds a staff preview pass another staff member turned on, until ${until}.`;
}

// ── THE PAGE ────────────────────────────────────────────────────────────────────────────────────────

async function JourneyAdminContent({ searchParams }: JourneyProps) {
  const sp = await searchParams;
  const session = await currentSession();
  const viewerId = session?.userId ?? null;
  /* ⭐ ONE FRESH READ, FOR THIS VIEWER — the ceremony's `expectSeq` comes from it, and whether the viewer is the
     Owner is decided on their STORED role, never on the session cookie. */
  const view = await journeySwitchView(viewerId);
  /* The pass is read only to SAY what this browser holds. ⛔ Nothing here sets it or decides the player site. */
  const passCookie = (await cookies()).get(JOURNEY_PREVIEW_COOKIE)?.value;
  const holdsCookie = typeof passCookie === "string" && passCookie.length > 0;
  /* ⭐ THE SAME QUESTION THE RESOLVER ASKS, minus the rollout (the card says that separately): sealed and in date
     (`readPreviewPass`), AND its issuer still staff on an open account, or its link still live
     (`resolvePreviewPass`). A pass that fails the second half is said to count for nothing, because it does. */
  const claim = readPreviewPass(passCookie);
  const pass = claim && (await resolvePreviewPass(passCookie, "STAFF_PREVIEW", view.stored)) ? claim : null;
  const secretSet = previewSecret() !== null;
  const refusalCode = typeof sp.preview === "string" ? sp.preview : null;
  /* A refusal the page's own state now contradicts (the rollout was Off then, it is not now; the secret was
     missing then, it is set now) is not repeated: the card beside it would say the opposite. */
  const contradicted = (refusalCode === "withdrawn" && view.state !== "WITHDRAWN") || (refusalCode === "no-secret" && secretSet);
  const refusal = refusalCode !== null && !contradicted && Object.prototype.hasOwnProperty.call(PREVIEW_REFUSAL, refusalCode) ? PREVIEW_REFUSAL[refusalCode] : null;

  const now = Date.now();
  const state = STATE[view.state];
  const positions = view.viewerIsOwner ? rolloutPositions(view) : [];
  const names = await staffNames(view.links.flatMap((l) => [l.issuedBy, l.revokedBy]));
  const nameOf = (id: string | null) => (id !== null ? names.get(id) : undefined) ?? "the Owner";

  /* The preview's own door is closed while the rollout is Off or the server has no secret — say which. */
  const cannotTurnOn = view.state === "WITHDRAWN"
    ? "The rollout is Off — previews are ignored."
    : !secretSet
      ? "The server has no JOURNEY_PREVIEW_SECRET, so previews are off."
      : null;
  const passCounts = pass !== null && view.state === "STAFF_PREVIEW";

  return (
    <>
      <AdminPageHead
        title="New journey"
        sw="Safari mpya"
        actions={<Chip size="sm" variant={state.variant}>{LEVEL[view.state]}</Chip>}
      />

      <AdminBody>
        {/* ── Rollout ───────────────────────────────────────────────────────────────────────────── */}
        <AdminCard
          title="Rollout"
          sw="Uzinduzi"
          action={<Chip size="sm" variant={state.variant}>{LEVEL[view.state]}</Chip>}
          data-journey-state={view.state}
        >
          <div className="space-y-2">
            <p className="font-display text-body-lg font-bold text-text">{state.line}</p>
            <p className="text-body-sm text-text-secondary">{state.body}</p>
            <p className="text-body-sm text-text-muted">
              Ceiling: <strong className="text-text">{LEVEL[view.ceiling]}</strong> —{" "}
              {view.ceilingSource === "ENV" ? "set by FEATURE_SIMPLEJOURNEY in the server's environment." : "set in the code."}
            </p>
            {view.stored.kind === "SET" ? (
              <>
                <p className="text-body-sm text-text-muted">
                  Owner&apos;s switch: <strong className="text-text">{CAP_WORDS[view.stored.cap]}</strong>
                </p>
                <p className="text-body-sm text-text-muted">
                  Last change {formatDateTime(view.stored.changedAt)} ·{" "}
                  <span data-operator-text="label">{view.changedByLabel ?? "the Owner"}</span> ·{" "}
                  <span data-operator-text="label">{view.stored.reason}</span> · record #{view.stored.seq}
                </p>
              </>
            ) : view.stored.kind === "ABSENT" ? (
              <p className="text-body-sm text-text-muted">No record yet — the ceiling decides</p>
            ) : (
              <p className="text-body-sm text-warning-fg">Stored switch unreadable — reads as Off</p>
            )}
            <p className="text-body-sm text-text-subtle">
              What anybody sees is the lower of the ceiling and the Owner&apos;s switch. A change reaches every server
              within {SECONDS} seconds.
            </p>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            {view.viewerIsOwner ? (
              positions.length > 0 ? (
                <RolloutControl positions={positions} expectSeq={view.seq} reasonMin={JOURNEY_REASON_MIN} reasonMax={JOURNEY_REASON_MAX} />
              ) : view.stored.kind === "UNREAD" ? (
                <p className="text-body-sm text-text-muted">The stored switch could not be read. Reload the page to try again.</p>
              ) : (
                /* Empty only while the ceiling itself is Off: the Owner's switch can lower the rollout, never raise it. */
                <p className="text-body-sm text-text-muted">
                  The ceiling is Off{view.ceilingSource === "ENV" ? " (FEATURE_SIMPLEJOURNEY)" : ""}, so there is nothing to
                  stop, and the Owner&apos;s switch cannot raise it.
                </p>
              )
            ) : (
              <p className="text-body-sm text-text-muted">Only the Owner can change the rollout.</p>
            )}
          </div>
        </AdminCard>

        {/* ── Your preview — every staff role ────────────────────────────────────────────────────── */}
        <AdminCard title="Your preview" sw="Onyesho lako" data-journey-pass={pass !== null ? pass.kind : holdsCookie ? "stale" : "none"}>
          <div className="space-y-3">
            {refusal !== null && (
              <Callout tone="warning" role="alert">{refusal}</Callout>
            )}
            <p className="text-body-sm font-semibold text-text">{passSentence(pass, holdsCookie, viewerId)}</p>
            {pass !== null && view.state === "WITHDRAWN" && (
              <p className="text-body-sm text-text-muted">The rollout is Off — previews are ignored.</p>
            )}
            {view.state === "ACTIVE" && (
              <p className="text-body-sm text-text-muted">The rollout is Live — everyone sees the new journey, so a pass changes nothing.</p>
            )}
            {passCounts && (
              <p className="text-body-sm text-text-muted">
                The console never shows the new journey —{" "}
                <a href="/" className="text-royal-300 hover:underline">open the site</a> to see it.
              </p>
            )}
            <p className="text-body-sm text-text-secondary">
              The pass lasts up to {PREVIEW_PASS_HOURS} hours and survives signing out, so you can preview as a guest or
              as a test player. While it counts, every page shows a “Preview” bar with an “Exit preview” button.
            </p>

            {holdsCookie ? (
              <form method="post" action="/preview">
                <input type="hidden" name="intent" value="off" />
                <input type="hidden" name="back" value="/admin/journey" />
                <Button type="submit" size="md" variant="ghost" leading={<I.eyeOff s={14} />}>
                  Turn my preview off
                </Button>
              </form>
            ) : (
              <form method="post" action="/preview" className="space-y-2">
                <input type="hidden" name="intent" value="on" />
                <Button type="submit" size="md" variant="primary" disabled={cannotTurnOn !== null} leading={<I.eye s={14} />}>
                  Turn my preview on
                </Button>
                {cannotTurnOn !== null && <p className="text-body-sm text-text-muted">{cannotTurnOn}</p>}
              </form>
            )}
          </div>
        </AdminCard>

        {/* ── Preview links ──────────────────────────────────────────────────────────────────────── */}
        <AdminCard title="Preview links" sw="Viungo vya onyesho">
          <div className="space-y-3">
            <p className="text-body-sm text-text-secondary">
              Opens the new journey as a visitor would see it, for {PREVIEW_LINK_DAYS} days. No admin access. A link
              opens the preview only while the rollout is Staff preview.
            </p>

            {view.viewerIsOwner ? (
              <CreatePreviewLink
                expectSeq={view.seq}
                reasonMin={JOURNEY_REASON_MIN}
                reasonMax={JOURNEY_REASON_MAX}
                labelMin={JOURNEY_LINK_LABEL_MIN}
                labelMax={JOURNEY_LINK_LABEL_MAX}
                linkDays={PREVIEW_LINK_DAYS}
                unavailable={secretSet ? null : "Preview links need the server's JOURNEY_PREVIEW_SECRET, which is not set."}
                liveLinkIds={view.links.filter((l) => linkIsLive(l, now)).map((l) => l.id)}
              />
            ) : (
              <p className="text-body-sm text-text-muted">Only the Owner can create or revoke preview links.</p>
            )}

            {view.links.length === 0 ? (
              <p className="text-body-sm text-text-muted">No preview links yet.</p>
            ) : (
              <ul className="space-y-2" aria-label="Preview links">
                {view.links.map((link) => {
                  const status = linkStatus(link, now);
                  /* ⛔ THE ADDRESS IS A KEY: the Owner's view alone, and only while the link is live. */
                  const url = view.viewerIsOwner && status.word === "Live" ? previewLinkUrl(link) : null;
                  return (
                    <li key={link.id} className="rounded-md border border-border p-3" data-journey-link={status.word.toLowerCase()}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 basis-[14rem] grow space-y-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-text" data-operator-text="label">{link.label}</span>
                            <Chip size="sm" variant={status.variant}>{status.word}</Chip>
                          </p>
                          <p className="text-body-sm text-text-muted">
                            Issued {formatDateTime(link.issuedAt)} by <span data-operator-text="label">{nameOf(link.issuedBy)}</span>
                            {" · "}
                            {link.revokedAt !== null
                              ? <>Revoked {formatDateTime(link.revokedAt)} by <span data-operator-text="label">{nameOf(link.revokedBy)}</span></>
                              : status.word === "Live"
                                ? <>Ends {formatDateTime(link.expiresAt)}</>
                                : <>Ended {formatDateTime(link.expiresAt)}</>}
                          </p>
                        </div>
                        {view.viewerIsOwner && status.word === "Live" && (
                          <RevokePreviewLink
                            linkId={link.id}
                            label={link.label}
                            expectSeq={view.seq}
                            reasonMin={JOURNEY_REASON_MIN}
                            reasonMax={JOURNEY_REASON_MAX}
                            seconds={SECONDS}
                          />
                        )}
                      </div>
                      {url !== null && <div className="mt-2"><LinkAddress url={url} /></div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
