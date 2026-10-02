"use client";

/**
 * U23 · THE BULK BAR — tick contacts, or select every one matching, then tag, untag, add to a list, record a withdrawal,
 * suppress or remove them, confirmed against the SERVER's count.                               (S10, 2026-10-02)
 *
 * ⭐ THE SERVER COUNTS, THE BAR NEVER DOES. Every action first asks the server for a PREVIEW of the selection: its count,
 * its tier and — up to fifty ticked rows — who they are (the first twenty, numbers masked for every role). The
 * confirmation is built from that answer alone: an enumerated list with "and N more", or — above fifty, or for ANY filter
 * — "Type N to confirm" with N the server's count (OD27/OD28). The typed word goes back with the run, and the server
 * RECOUNTS and refuses a moved audience with the new count, so a confirmation is bound to the scope it was given for.
 * ⭐ THE PARAMETERS ARE ASKED BEFORE THE COUNT: one tag (U28's ONE rule, `parseBulkTag`), or a list — an existing one, or
 * a new name (60 characters; a name differing only in capitals is refused by the server). The browser checks them in the
 * same words the server uses, and the server checks them again.
 * ⛔ AN ACT CONTROL: `useMayAct()` is read at the top and every action button carries its reason (`bulkActionState`) —
 * disabled WITH the act gate's sentence for a role that may view but not act, NEVER hidden. Ticking stays available: it
 * is a read affordance. Every action re-checks on the server (`softRequireStaff`).
 * ⛔ NO "RECORD CONSENT" (it needs a recorded basis and an 18+ attestation — U33 adds it here) and no export (U34): the
 * bar says the first in words.
 * ⛔ SUPPRESS IS PERMANENT, AND ITS CONFIRMATION SAYS SO IN WORDS (C23). A run that FAILED is not a run that did nothing:
 * the overlay's error card says some contacts may already have changed and never claims a count, and Retry asks the
 * server for a fresh preview, keeping the selection.
 *
 * Guard: `test:contacts-bulk` (this file's shape and the copy it renders) · red: `red:contacts-bulk`.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field-legend";
import { Field, Input } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useDeferredToast } from "@/components/ui/toast";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { adminCount } from "@/lib/utils";
import { BULK_PER_ROW_MAX, CONTACT_BULK_ACTIONS, parseBulkTag, parseListName } from "@/lib/contacts/bulk-rules";
import type { BulkPreview, ContactBulkAction, ContactBulkPost } from "@/lib/contacts/bulk-rules";
import { previewContactBulkAction, runContactBulkAction } from "./contact-bulk-actions";
import { useContactsSelection } from "./contacts-selection-provider";
import { BULK_COPY, CONTACTS_BULK, bulkActionState, bulkResultLine, enumerateTail } from "./contacts-copy";

/** The list picker's "name a new list" choice — `+` is outside every list id's alphabet, so no list can collide with it. */
const NEW_LIST = "+new";

type ParamAction = "tag" | "untag" | "addToList";
type ParamDraft = { action: ParamAction; tag: string; listChoice: string; newName: string; error: string | null };
type Confirming = { post: ContactBulkPost; preview: BulkPreview };

const needsParam = (a: ContactBulkAction): a is ParamAction => a === "tag" || a === "untag" || a === "addToList";

export function ContactsBulkBar({ lists }: { lists: Array<{ id: string; name: string }> }) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const s = useContactsSelection();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [param, setParam] = React.useState<ParamDraft | null>(null);
  const [paramOpen, setParamOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState<Confirming | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const overlay = useActionOverlay();
  const { toast, deferToast } = useDeferredToast(pending);
  const headingId = React.useId();
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const lastPost = React.useRef<ContactBulkPost | null>(null);

  const paramDirty = paramOpen && param !== null && (param.tag !== "" || param.newName !== "");
  // "Select all N matching" is offered once the whole page is ticked and the filter holds more than this page.
  const offerMatching = s.mode === "rows" && s.allOnPage && s.matching !== null && s.matching.total > s.count - s.offPage;
  const line = s.count === 0
    ? CONTACTS_BULK.none
    : s.mode === "matching" ? CONTACTS_BULK.allMatching(s.count) : CONTACTS_BULK.selected(s.count, s.offPage);

  /** Ask the server for the selection's count; open the confirmation from ITS answer. A refusal that names the tag or
   *  the list stays in the parameter dialog, beside what was typed. */
  const preview = (post: ContactBulkPost) => {
    lastPost.current = post;
    startTransition(async () => {
      const r = await runAdminAction(() => previewContactBulkAction(post));
      if (r.ok) {
        setParamOpen(false);
        setConfirming({ post, preview: r });
        setConfirmOpen(true);
        return;
      }
      if ("field" in r && (r.field === "tag" || r.field === "list")) {
        setParam((p) => (p === null ? p : { ...p, error: r.error }));
        return;
      }
      setParamOpen(false);
      toast({ title: CONTACTS_BULK.previewFailed, description: r.error, variant: "danger" });
    });
  };

  const begin = (action: ContactBulkAction) => {
    if (!mayAct || s.count === 0 || pending) return;
    if (needsParam(action)) {
      setParam({ action, tag: "", listChoice: lists[0]?.id ?? NEW_LIST, newName: "", error: null });
      setParamOpen(true);
      return;
    }
    preview({ action, audience: s.audience(), typed: null });
  };

  const closeParam = () => {
    if (!pending) setParamOpen(false);
  };

  const continueParam = () => {
    if (param === null || pending) return;
    if (param.action === "addToList") {
      if (param.listChoice !== NEW_LIST) {
        preview({ action: "addToList", audience: s.audience(), typed: null, listId: param.listChoice });
        return;
      }
      const named = parseListName(param.newName);
      if (!named.ok) {
        setParam({ ...param, error: named.sentence });
        return;
      }
      preview({ action: "addToList", audience: s.audience(), typed: null, newListName: named.name });
      return;
    }
    const tag = parseBulkTag(param.tag);
    if (!tag.ok) {
      setParam({ ...param, error: tag.sentence });
      return;
    }
    preview({ action: param.action, audience: s.audience(), typed: null, tag: tag.tag });
  };

  const run = () => {
    if (confirming === null) return;
    const { post, preview: p } = confirming;
    // ⭐ The typed count goes back as the SERVER's own word from the preview, for the server to hold against its recount.
    const confirmed: ContactBulkPost = { ...post, typed: p.tier.kind === "typed" ? p.tier.word : null };
    setConfirmOpen(false);
    // ⛔ No invented progress: one action returns once, so the overlay names what is being attempted and nothing more.
    overlay.run(BULK_COPY[p.action].running(adminCount(p.count, "contact")));
    startTransition(async () => {
      const r = await runAdminAction(() => runContactBulkAction(confirmed));
      if (r.ok) {
        overlay.dismiss();
        s.clear();
        router.refresh();
        deferToast({ title: BULK_COPY[r.action].done(r.listName), description: bulkResultLine(r), variant: "success" });
        return;
      }
      if ("reason" in r && r.reason !== undefined && r.reason !== "error") {
        // A refusal wrote nothing: the moved audience (with both counts), the cap, the gate — in the server's words.
        overlay.dismiss();
        toast({ title: CONTACTS_BULK.refused, description: r.error, variant: "warning" });
        return;
      }
      // ⛔ A RUN THAT FAILED IS NOT A RUN THAT DID NOTHING: a per-number loop may have written before it stopped. The card
      // never claims a count, and Retry asks for a fresh preview — the selection is kept.
      overlay.fail(CONTACTS_BULK.failedTitle, CONTACTS_BULK.failedBody);
    });
  };

  return (
    <>
      <div data-block="contacts-bulk-bar" data-bulk-mode={s.mode} data-bulk-count={s.count} className="flex flex-col gap-2 border-b border-border-subtle p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 flex-1 text-body-sm text-text-secondary" aria-live="polite" data-bulk-line>{line}</p>
          {(offerMatching || s.count > 0) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {offerMatching && s.matching !== null && (
                <Button type="button" size="sm" variant="ghost" onClick={s.selectAllMatching} disabled={pending} data-bulk-matching>
                  {CONTACTS_BULK.selectAllMatching(s.matching.total)}
                </Button>
              )}
              {s.count > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={s.clear} disabled={pending} data-bulk-clear>
                  {CONTACTS_BULK.clear}
                </Button>
              )}
            </div>
          )}
        </div>
        <div role="group" aria-label={CONTACTS_BULK.actionsLabel} className="flex flex-wrap items-center gap-2">
          {CONTACT_BULK_ACTIONS.map((a) => {
            const state = bulkActionState(a, { mayAct, actReason, count: s.count, perRowMax: BULK_PER_ROW_MAX, busy: pending });
            return (
              <Button key={a} type="button" size="sm" variant="ghost" disabled={state.disabled} title={state.title} onClick={() => begin(a)} data-bulk-action={a}>
                {BULK_COPY[a].label}
              </Button>
            );
          })}
        </div>
        {s.note !== null && <p role="status" className="text-body-sm text-warning-fg" data-bulk-note>{s.note}</p>}
        <p className="text-body-sm text-text-tertiary" data-bulk-consent-note>{CONTACTS_BULK.consentNote}</p>
      </div>

      {/* ⭐ THE PARAMETER — one tag, or a list. Scrim-close and Escape are refused once anything is typed (the form's own
          rule, `contact-form.tsx`), and nothing can dismiss it while the count is being asked. */}
      {param !== null && (
        <Modal
          open={paramOpen}
          onClose={closeParam}
          labelledBy={headingId}
          maxWidth={440}
          closeOnScrim={!paramDirty && !pending}
          closeOnEsc={!paramDirty && !pending}
          showClose={!pending}
          ariaBusy={pending}
          initialFocus={fieldRef}
        >
          <div>
            <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{CONTACTS_BULK.eyebrow}</p>
            <h2 id={headingId} className="mt-0.5 pr-8 font-display text-title-sm font-bold text-text leading-tight">
              {param.action === "addToList" ? CONTACTS_BULK.listTitle : param.action === "untag" ? CONTACTS_BULK.untagTitle : CONTACTS_BULK.tagTitle}
            </h2>
          </div>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continueParam();
            }}
            className="mt-4 space-y-4"
            data-bulk-param={param.action}
          >
            {param.action === "addToList" ? (
              <>
                <div data-field="list">
                  <FieldLegend className="block mb-1.5">{CONTACTS_BULK.listLabel}</FieldLegend>
                  <Select
                    value={param.listChoice}
                    onChange={(v) => setParam({ ...param, listChoice: v, error: null })}
                    options={[...lists.map((l) => ({ value: l.id, label: l.name })), { value: NEW_LIST, label: CONTACTS_BULK.listNew }]}
                    ariaLabel={CONTACTS_BULK.listLabel}
                    size="sm"
                    disabled={pending}
                  />
                  {param.listChoice !== NEW_LIST && param.error !== null && (
                    <p className="mt-1.5 text-body-sm text-danger-fg" role="alert">{param.error}</p>
                  )}
                </div>
                {param.listChoice === NEW_LIST && (
                  <Field label={CONTACTS_BULK.listNameLabel} hint={CONTACTS_BULK.listNameHint} error={param.error ?? undefined} dataField="newListName">
                    <Input
                      ref={fieldRef}
                      value={param.newName}
                      onChange={(e) => setParam({ ...param, newName: e.target.value, error: null })}
                      autoComplete="off"
                      disabled={pending}
                      error={param.error !== null}
                    />
                  </Field>
                )}
              </>
            ) : (
              <Field label={CONTACTS_BULK.tagLabel} hint={CONTACTS_BULK.tagHint} error={param.error ?? undefined} dataField="tag">
                <Input
                  ref={fieldRef}
                  value={param.tag}
                  onChange={(e) => setParam({ ...param, tag: e.target.value, error: null })}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={pending}
                  error={param.error !== null}
                />
              </Field>
            )}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" size="md" variant="ghost" onClick={closeParam} disabled={pending}>
                {CONTACTS_BULK.cancel}
              </Button>
              <Button type="submit" size="md" variant="primary" loading={pending} disabled={pending || !mayAct} title={mayAct ? undefined : actReason}>
                {CONTACTS_BULK.continue}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirming !== null && (
        <BulkConfirm open={confirmOpen} preview={confirming.preview} onCancel={() => setConfirmOpen(false)} onConfirm={run} />
      )}

      <ActionOverlay
        state={overlay.state}
        onDismiss={overlay.dismiss}
        onRetry={() => {
          if (lastPost.current !== null) preview(lastPost.current);
        }}
        retryLabel={CONTACTS_BULK.retry}
      />

      <UnsavedChangesGuard dirty={paramDirty} body={CONTACTS_BULK.unsavedBody} />
    </>
  );
}

/**
 * THE CONFIRMATION, FROM THE SERVER'S PREVIEW ALONE. ⛔ The tier and its typed word are ONE decision, spread together from
 * `p.tier` — never a word computed from the selection's size in the browser (the server would refuse it anyway). Up to
 * fifty ticked rows it names them (the first twenty, masked, then "and N more"); above that, or for a filter, the officer
 * types the server's count. The consequence sentence is always said — Suppress's permanence among them.
 */
function BulkConfirm({ open, preview: p, onCancel, onConfirm }: {
  open: boolean;
  preview: BulkPreview;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const words = BULK_COPY[p.action];
  // ⛔ "and N more" only BELOW a listed sample (review F3): the typed tier lists nobody, so a tail there read as N beyond
  // something that was never shown.
  const tail = p.sample.length > 0 ? enumerateTail(p.count, p.sample.length) : null;
  const grave = p.action === "suppress" || p.action === "remove" || p.action === "withdraw";
  return (
    <ConfirmModal
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      tone={grave ? "claret" : "brand"}
      maxWidth={520}
      {...(p.tier.kind === "typed" ? ({ tier: "hard", typedWord: p.tier.word } as const) : ({ tier: "medium" } as const))}
      eyebrow={CONTACTS_BULK.eyebrow}
      title={words.title(adminCount(p.count, "contact"), p)}
      confirmLabel={words.confirm(p.count)}
      cancelLabel={CONTACTS_BULK.cancel}
      body={(
        <div className="space-y-3" data-bulk-confirm={p.tier.kind}>
          <p data-bulk-consequence>{words.consequence}</p>
          {p.tier.kind === "typed" && (
            // An unfiltered "all matching" describes nothing — so it says, in words, that it is the whole book.
            <p className="text-body-sm text-text-secondary" data-bulk-described>
              {p.described.length > 0 ? p.described.join(" · ") : CONTACTS_BULK.wholeBook}
            </p>
          )}
          {p.sample.length > 0 && (
            // ⛔ A list, not a table, and its own scroll container: twenty names never push the dialog sideways at 360.
            <ul className="max-h-[38vh] overflow-y-auto rounded-md border border-border" data-bulk-sample>
              {p.sample.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border px-3 py-2 last:border-0">
                  <span className="min-w-0 break-words text-body-sm text-text">{r.name ?? CONTACTS_BULK.noName}</span>
                  <span className="font-mono text-body-sm text-text-secondary" data-masked>{r.masked}</span>
                </li>
              ))}
            </ul>
          )}
          {tail !== null && <p className="text-body-sm text-text-secondary" data-bulk-tail>{tail}</p>}
        </div>
      )}
    />
  );
}
