/**
 * U40b · THE CONFIRM CARD'S TWO SERVER DOORS — the read its trigger asks for (`readConfirmCardFor`), and the confirmation
 * behind its dialog (`runConfirmFor`). Each stands behind a "use server" file with exactly one action, whose FIRST
 * statement is the gate (`confirm-view-actions.ts`, `confirm-actions.ts`); everything after the gate lives here, so the
 * suite can drive it with its doors handed in (`test:campaign-gates` §UI). ENGINE-SPEC §4.6; OD27 · OD65 · OD67.
 *
 * ⭐ COUNTED ON DEMAND, NEVER ON A RENDER (the U40b review's MAJOR). A render of the composer counts nothing for this card:
 * the confirmation's view — the ONE walk's count, and for a reader the split door's gate over every number — is counted
 * only when the officer presses "Confirm audience…" (or asks again), so no rail pick, save, test or "Count again" waits on
 * it. And even then NOTHING IS COUNTED for a campaign past DRAFT, a draft revision the form is not showing (saved
 * elsewhere since), or an audience on screen that the draft does not store: the answer says which, and the card says what
 * to do. The fence's own count takes the split door's slots (`audienceWalkCount`, in `audience-fence.ts`).
 * ⛔ WHO IS LOOKING IS THE STORED ROLE'S (`confirmViewerFor`), never the browser's word — the very answer the confirmation
 * is judged by. A viewer who may not read a number gets the count alone and the typed tier, with no list and no members
 * key (OD65 · OD67), and the estimate's money reaches a money reader ONLY, as the service's words (`confirmMoneyLine`):
 * the figures are taken out of the view before it leaves, so no TZS rides along for anyone.
 * ⛔ THE BROWSER POSTS WHAT ITS FORM SHOWS — the campaign, its revision, its audience's address keys — and, for a
 * confirmation, the word the dialog armed on and the claim it was opened on. NEVER A COUNT (OD27: the server counts).
 * Every field is read by name, as text; anything else is never read.
 * ⭐ A CONFIRMATION SAYS WHAT HAPPENED: confirmed (with whether its record landed — ruling 543); refused, in the service's
 * one sentence; or failed — and only a row read back as still a draft (or gone) is "nothing was confirmed". A row that
 * moved, or a read that fails, may have been confirmed by this very press (the service's known residual), and the answer
 * says so. Trying again is safe either way: the write is conditional on a draft.
 * ⛔ CONFIRMED SENDS NOTHING: no recipient row, no token, no message. Start is a separate act on the campaign's own page.
 * ⛔ IT NEVER REACHES THE SEND WINDOW OR THE COMPOSER'S LOADER (`test:campaign-gates` §UI 9): an action's import walk stays
 * on the confirmation's own side.
 */
import { db } from "@/lib/server/store";
import type { SmsCampaignStatus, StoredSmsCampaign } from "@/lib/server/store";
import { CAMPAIGN_AUDIENCE_URL_KEYS, contactAudienceKey, parseCampaignAudienceParams } from "@/lib/server/marketing/audience";
import { readCampaignAudience } from "@/lib/server/marketing/audience-fence";
import {
  campaignConfirmView, confirmCampaign, confirmMoneyLine, confirmViewerFor,
} from "@/lib/server/marketing/campaign-confirm-service";
import type {
  CampaignConfirmView, ConfirmCampaignResult, ConfirmServiceRefusal, ConfirmViewer,
} from "@/lib/server/marketing/campaign-confirm-service";
import type { ConfirmOutcomeReason, ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { COMPOSE_CONFIRM_FAILED, COMPOSE_CONFIRM_UNFINISHED } from "./composer-copy";

/* ══ THE SHAPES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The service's view as the card is handed it: ⛔ the estimate's money taken OUT — it reaches a money reader as words only
 *  (`ConfirmCardData.money`), so no figure rides along for anyone. */
export type ConfirmCardView = Omit<CampaignConfirmView, "estimate"> & { estimate: { segments: number; perRecipient: number } | null };

/**
 * What the trigger's read answers. `read`:
 *   · `view` — counted now, for this officer (`view`; it may still be blocked, in its own words);
 *   · `closed` — the campaign is past DRAFT (`status` says what it is) — nothing counted;
 *   · `stale` — the draft was saved since the revision the form shows — nothing counted;
 *   · `unsaved` — the audience on screen is not the one the draft stores — nothing counted;
 *   · `gone` — no such campaign; `error` — a read failed (never a zero).
 * `money` — `confirmMoneyLine`'s words: null for anyone who may not read money.
 */
export type ConfirmCardData = {
  campaignId: string;
  /** The row's status as this read found it — null when it is gone, or could not be read. */
  status: SmsCampaignStatus | null;
  read: "view" | "closed" | "stale" | "unsaved" | "gone" | "error";
  view: ConfirmCardView | null;
  money: string | null;
};

/** The read action's answer: the card, or the gate's refusal in its own words. */
export type ConfirmReadAnswer = { ok: true; card: ConfirmCardData } | { ok: false; reason: "role"; error: string };

/** What the trigger posts: the campaign, the revision its form shows, and the address keys of the audience on screen —
 *  null when the address carries none (the stored audience is on screen). ⛔ Never a count. */
export type ConfirmReadRequest = { campaignId: string; draftRevision: number | null; audience: Record<string, string> | null };

/** What the dialog posts: the campaign, the word it armed on, and the signed claim it was opened on. ⛔ Never a count. */
export type ConfirmRequest = { campaignId: string; typed: string | null; watermark: string | null };

/**
 * What the dialog is answered. A refusal carries the service's reason and its sentence, and the count the server holds
 * now when it has one; `role` is the gate's, `failed` a failure that left the row a draft, and `unfinished` one that
 * cannot say whether the write landed.
 */
export type ConfirmActionResult =
  | { ok: true; count: number; tier: ConfirmTier; recorded: boolean }
  | {
      ok: false;
      reason: ConfirmOutcomeReason | ConfirmServiceRefusal | "role" | "failed" | "unfinished";
      error: string;
      freshCount: number | null;
    };

/* ══ WHAT THE BROWSER POSTED — by name, as text; anything else is never read ═════════════════════════════════════ */

/** One field of a posted form, by name, as text — anything else (a file, nothing, a body that is not a form) is null. */
function posted(formData: unknown, name: string): string | null {
  if (formData === null || typeof formData !== "object" || typeof (formData as { get?: unknown }).get !== "function") return null;
  const v = (formData as FormData).get(name);
  return typeof v === "string" ? v : null;
}

/** ⛔ The confirmation's three fields — the campaign, the typed word, the claim — and nothing else. */
export function confirmRequestOf(formData: unknown): ConfirmRequest {
  const typed = posted(formData, "typed");
  return {
    campaignId: (posted(formData, "campaignId") ?? "").trim(),
    typed: typed !== null && typed.trim() !== "" ? typed : null,
    watermark: posted(formData, "watermark"),
  };
}

/** The posted body as a bag of unknowns — never trusted to be the shape the card meant to send. */
const bag = (v: unknown): Record<string, unknown> => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** ⛔ The read's three fields — the campaign, the revision (a whole number, or none), the audience's campaign keys. */
export function confirmReadRequestOf(request: unknown): ConfirmReadRequest {
  const body = bag(request);
  const revision = body.draftRevision;
  const keys = bag(body.audience);
  const audience: Record<string, string> = {};
  for (const k of CAMPAIGN_AUDIENCE_URL_KEYS) {
    const v = keys[k];
    if (typeof v === "string" && v.trim() !== "") audience[k] = v;
  }
  return {
    campaignId: typeof body.campaignId === "string" ? body.campaignId.trim() : "",
    draftRevision: typeof revision === "number" && Number.isSafeInteger(revision) && revision >= 0 ? revision : null,
    audience: body.audience === null || body.audience === undefined || Object.keys(audience).length === 0 ? null : audience,
  };
}

/* ══ THE READ THE TRIGGER ASKS — counted on demand ═══════════════════════════════════════════════════════════════ */

/** The read's doors — swappable for the suite's in-process red plants; production never passes them. */
export type ConfirmReadDeps = {
  /** Who is looking — the stored role's two cells (`confirmViewerFor`). */
  viewer: (userId: string | null) => Promise<ConfirmViewer>;
  /** The draft as stored now — its status, revision and audience. */
  find: (id: string) => Promise<StoredSmsCampaign | null>;
  /** The view, counted now for that viewer (`campaignConfirmView`). */
  view: (campaignId: string, viewer: ConfirmViewer) => Promise<CampaignConfirmView | null>;
  /** The estimate's money in words, for a money reader (`confirmMoneyLine`). */
  money: typeof confirmMoneyLine;
};

/** Frozen: production's doors, by reference (`test:campaign-gates` §UI 6 holds them). */
export const CONFIRM_READ_DEPS: Readonly<ConfirmReadDeps> = Object.freeze({
  viewer: confirmViewerFor,
  find: async (id: string) => db.smsCampaign.find(id),
  view: campaignConfirmView,
  money: confirmMoneyLine,
});

/** ⛔ DEV ONLY (inert in production): U38b's two count switches (`/api/dev-test/marketing-audience-seed?delayMs=…|fault=1`)
 *  hold or fail this read too, so `qa:marketing-confirm` can photograph "Counting the audience…" and a read that failed. */
async function devReadHold(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const g = globalThis as { __50PICK_AUDIENCE_COUNT_DELAY_MS?: number; __50PICK_AUDIENCE_COUNT_FAULT?: boolean };
  const ms = Math.min(15_000, Math.max(0, Number(g.__50PICK_AUDIENCE_COUNT_DELAY_MS ?? 0) || 0));
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  if (g.__50PICK_AUDIENCE_COUNT_FAULT === true) throw new Error("confirmation count fault (dev drive)");
}

/** Is the audience on screen the one the draft stores? By the ONE key of each, the stored one read at the campaign scope.
 *  An address that cannot be read is not the stored audience; a stored one that cannot be read is the view's to say. */
function storesThis(shown: Record<string, string>, stored: string): boolean {
  const onScreen = parseCampaignAudienceParams(shown);
  if (!onScreen.ok) return false;
  const kept = readCampaignAudience(stored);
  if (!kept.ok) return true;
  return contactAudienceKey(onScreen.filter) === contactAudienceKey(kept.filter);
}

/** A read that failed: said in the log by the error's name alone (no number in a database error reaches the log). */
const logFailed = (what: string, err: unknown): void => {
  console.error(`[admin/campaigns/new] the confirmation's ${what} could not be read:`, (err as { name?: unknown })?.name ?? "error");
};

/**
 * ⭐ THE TRIGGER'S READ, for one officer — counted ON DEMAND. The draft is read first, and NOTHING IS COUNTED unless it is a
 * DRAFT at the revision the form shows, holding the audience the form shows; then who is looking (the stored role), and the
 * view counted NOW for exactly that viewer (OD65's count alone and OD67's typed tier for a viewer who may not read a number),
 * shaped for the browser: the estimate's money out, its words in for a money reader.
 */
export async function readConfirmCardFor(
  userId: string | null,
  req: ConfirmReadRequest,
  deps: ConfirmReadDeps = CONFIRM_READ_DEPS,
): Promise<ConfirmCardData> {
  const none = { view: null, money: null } as const;
  let row: StoredSmsCampaign | null;
  try {
    row = req.campaignId === "" ? null : await deps.find(req.campaignId);
  } catch (err) {
    logFailed("draft", err);
    return { campaignId: req.campaignId, status: null, read: "error", ...none };
  }
  if (row === null) return { campaignId: req.campaignId, status: null, read: "gone", ...none };
  const at = { campaignId: row.id, status: row.status };
  // ⛔ NOTHING IS COUNTED for a campaign past DRAFT, a revision the form is not showing, or an audience it does not store.
  if (row.status !== "DRAFT") return { ...at, read: "closed", ...none };
  if (req.draftRevision === null || req.draftRevision !== row.draftRevision) return { ...at, read: "stale", ...none };
  if (req.audience !== null && !storesThis(req.audience, row.audienceFilter)) return { ...at, read: "unsaved", ...none };
  const viewer = await deps.viewer(userId);
  let view: CampaignConfirmView | null;
  try {
    await devReadHold();
    view = await deps.view(row.id, viewer);
  } catch (err) {
    logFailed("view", err);
    return { ...at, read: "error", ...none };
  }
  if (view === null) return { campaignId: row.id, status: null, read: "gone", ...none };
  const { estimate, ...rest } = view;
  return {
    ...at,
    read: "view",
    view: { ...rest, estimate: estimate === null ? null : { segments: estimate.segments, perRecipient: estimate.perRecipient } },
    money: deps.money(estimate === null ? null : estimate.money),
  };
}

/* ══ THE CONFIRMATION — what the action does after its gate ══════════════════════════════════════════════════════ */

/** The confirmation's doors — swappable for the suite's in-process red plants; production never passes them. */
export type ConfirmRunDeps = {
  /** Who is confirming — the stored role's two cells (`confirmViewerFor`). */
  viewer: (userId: string | null) => Promise<ConfirmViewer>;
  /** U40a's ONE confirmation (`confirmCampaign`). */
  confirm: typeof confirmCampaign;
  /** The row read back after a failure — still a draft (or gone) is the only "nothing was confirmed". */
  find: (id: string) => Promise<StoredSmsCampaign | null>;
};

/** Frozen: production's doors, by reference. */
export const CONFIRM_RUN_DEPS: Readonly<ConfirmRunDeps> = Object.freeze({
  viewer: confirmViewerFor,
  confirm: confirmCampaign,
  find: async (id: string) => db.smsCampaign.find(id),
});

/**
 * ⭐ CONFIRM ONE DRAFT, for the officer the gate let through — the text the dialog armed on, against the server's own
 * count, on the claim it was opened on, judged as the officer's STORED role may see it. ⛔ A failure is said as what is
 * known: the row is read back once, and only a row still in DRAFT (or gone) is "nothing was confirmed"; a row that moved,
 * or a read that fails, may hold this very press's confirmation.
 */
export async function runConfirmFor(actorId: string, req: ConfirmRequest, deps: ConfirmRunDeps = CONFIRM_RUN_DEPS): Promise<ConfirmActionResult> {
  const viewer = await deps.viewer(actorId);
  let result: ConfirmCampaignResult;
  try {
    result = await deps.confirm({ campaignId: req.campaignId, typed: req.typed, watermark: req.watermark, actorId }, viewer);
  } catch {
    let draft = false;
    try {
      const row = req.campaignId === "" ? null : await deps.find(req.campaignId);
      draft = row === null || row.status === "DRAFT";
    } catch {
      draft = false;
    }
    return draft
      ? { ok: false, reason: "failed", error: COMPOSE_CONFIRM_FAILED, freshCount: null }
      : { ok: false, reason: "unfinished", error: COMPOSE_CONFIRM_UNFINISHED, freshCount: null };
  }
  if (!result.ok) return { ok: false, reason: result.reason, error: result.message, freshCount: result.freshCount };
  return { ok: true, count: result.count, tier: result.tier, recorded: result.recorded };
}
