"use client";

/**
 * /admin/journey — THE OWNER'S PREVIEW-LINK CONTROLS (the Vodacom plan S1; ruling SJ-23: "the agency gets a
 * signed, revocable 7-day visitor-preview link"). Three small controls the server page places for the Owner only:
 *   · `CreatePreviewLink` — who it is for and why, then the new link's address to copy;
 *   · `RevokePreviewLink` — one live link, with a reason;
 *   · `CopyLinkUrl`       — a live link's address, copied.
 *
 * ⛔ THE ADDRESS IS A KEY. Whoever holds it sees the new journey until it ends or is revoked, so the page hands a
 * link's address to the Owner's view alone, and only for a live link. It opens a view and nothing else — no
 * console, no account.
 * ⛔ THE REASON AND THE LABEL ARM THE BUTTON; THEY ARE NOT THE GATE. The ceremony checks the Owner's stored role,
 * the two-step status, the reason, the label and the record number this page was rendered on.
 */
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { I } from "@/components/ui/glyphs";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast, useToast } from "@/components/ui/toast";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { cleanReason } from "@/lib/affiliate-rules";
import { formatDateTime } from "@/lib/utils";
import { createJourneyPreviewLinkAction, revokeJourneyPreviewLinkAction } from "./actions";

type Bounds = { reasonMin: number; reasonMax: number };

/** A refusal, pinned to the field the server named — or to the dialog as a whole (`null`, e.g. a stale record). */
type Refusal = { field: "reason" | "label" | null; message: string };

const refusalField = (r: { field?: string }): Refusal["field"] => (r.field === "reason" || r.field === "label" ? r.field : null);

/** A live link's address, copied. ⛔ No action — nothing is written; the address already exists. */
export function CopyLinkUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast({ title: "Could not copy", description: "Select the address and copy it by hand.", variant: "warning" });
        }
      }}
      trailing={copied ? <I.check s={13} /> : <I.copy s={13} />}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

/** A link's address as text the Owner can select, beside its copy button. */
export function LinkAddress({ url }: { url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 max-w-full break-all rounded-md border border-border bg-bg-inset px-2 py-1 font-mono text-body-sm text-text select-all">
        {url}
      </code>
      <CopyLinkUrl url={url} />
    </div>
  );
}

/** The reason field and its live count — counted as the server counts it (`cleanReason`). */
function ReasonField({
  value, onChange, bounds, error, disabled, inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  bounds: Bounds;
  error: string | undefined;
  disabled: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <>
      <Field label="Why — kept with the change" hint={`${bounds.reasonMin} to ${bounds.reasonMax} characters.`} error={error} dataField="reason">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={bounds.reasonMax}
          rows={3}
          disabled={disabled}
          aria-invalid={error !== undefined || undefined}
        />
      </Field>
      <p className="text-body-sm text-text-subtle" aria-live="polite">
        <span className="font-mono tabular-nums">{bounds.reasonMax - cleanReason(value).length}</span> characters left
      </p>
    </>
  );
}

/**
 * ⭐ CREATE A PREVIEW LINK. On success the dialog closes and the new address stays on the card until the page is
 * left, with its copy button — the ceremony returns it once, and the list below shows it again from then on.
 */
export function CreatePreviewLink({
  expectSeq,
  reasonMin,
  reasonMax,
  labelMin,
  labelMax,
  linkDays,
  unavailable,
  liveLinkIds,
}: Bounds & {
  expectSeq: number;
  labelMin: number;
  labelMax: number;
  /** How long a link lasts (`PREVIEW_LINK_DAYS`), from the server — never a second copy of the number here. */
  linkDays: number;
  /** Why no link can be created right now (the server's sentence), or null. */
  unavailable: string | null;
  /** The ids of the links that are live now, from the server — the "Link created" box shows a link only while it is. */
  liveLinkIds: string[];
}) {
  const mayAct = useMayAct();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [created, setCreated] = useState<{ id: string; url: string | null; expiresAt: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);
  const headingId = useId();
  const labelRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  if (!mayAct) return <ActReadOnly />;

  const cleanLabel = cleanReason(label);
  const cleanWhy = cleanReason(reason);
  const armed = cleanLabel.length >= labelMin && cleanLabel.length <= labelMax && cleanWhy.length >= reasonMin && cleanWhy.length <= reasonMax;
  const dirty = label.length > 0 || reason.length > 0;
  const errorAt = (field: Refusal["field"]) => (refusal !== null && refusal.field === field ? refusal.message : undefined);

  const reset = () => { setLabel(""); setReason(""); setRefusal(null); };
  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const submit = () => {
    if (!armed || pending) return;
    setRefusal(null);
    startTransition(async () => {
      const result = await runAdminAction(() => createJourneyPreviewLinkAction({ label, reason, expectSeq }));
      if (!result.ok) {
        const field = refusalField(result);
        setRefusal({ field, message: result.error });
        toast({ title: "No link was created", description: result.error, variant: "danger" });
        if (field === "label") labelRef.current?.focus();
        else if (field === "reason") reasonRef.current?.focus();
        return;
      }
      setOpen(false);
      reset();
      if (result.link) setCreated({ id: result.link.id, url: result.link.url, expiresAt: result.link.expiresAt });
      router.refresh();
      deferToast({ title: "Preview link created", description: result.note ?? undefined, variant: result.warn ? "warning" : "success" });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="md"
          variant="primary"
          aria-haspopup="dialog"
          disabled={pending || unavailable !== null}
          onClick={() => { reset(); setOpen(true); }}
          leading={<I.link s={14} />}
        >
          Create a preview link
        </Button>
        {unavailable !== null && <p className="text-body-sm text-text-muted">{unavailable}</p>}
      </div>

      {/* ⛔ Only while that link is still live: after a revoke (or its end) the box would hand out a dead key. */}
      {created !== null && liveLinkIds.includes(created.id) && (
        <div className="rounded-md border border-border bg-bg-sunken p-3 space-y-2" role="status">
          <p className="text-body-sm font-semibold text-text">
            Link created — it works until {formatDateTime(created.expiresAt)}. Send it to them now:
          </p>
          {created.url !== null ? (
            <LinkAddress url={created.url} />
          ) : (
            <p className="text-body-sm text-text-muted">Its address cannot be shown: the server has no preview secret.</p>
          )}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        role="dialog"
        labelledBy={headingId}
        maxWidth={440}
        closeOnScrim={!pending && !dirty}
        closeOnEsc={!pending && !dirty}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={labelRef}
      >
        <div className="space-y-4">
          <h2 id={headingId} className="pr-8 font-display text-body-lg font-semibold text-text">Create a preview link</h2>
          <p className="text-body-sm text-text-secondary">
            Opens the new journey as a visitor would see it, for {linkDays} days. No admin access. Anyone who has the link can
            open it, so send it only to the person it is for.
          </p>
          <Field label="Who it is for" hint={`${labelMin} to ${labelMax} characters — for example “Agency — Fred”.`} error={errorAt("label")} dataField="label">
            <Input
              ref={labelRef}
              value={label}
              onChange={(e) => { setLabel(e.target.value); if (refusal?.field === "label") setRefusal(null); }}
              maxLength={labelMax}
              autoComplete="off"
              disabled={pending}
              error={errorAt("label") !== undefined}
            />
          </Field>
          <ReasonField
            value={reason}
            onChange={(v) => { setReason(v); if (refusal?.field === "reason") setRefusal(null); }}
            bounds={{ reasonMin, reasonMax }}
            error={errorAt("reason")}
            disabled={pending}
            inputRef={reasonRef}
          />
          {refusal !== null && refusal.field === null && <p className="text-body-sm text-danger-fg" role="alert">{refusal.message}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="button" size="md" variant="primary" onClick={submit} disabled={!armed} loading={pending}>
              Create the link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** ⭐ REVOKE ONE LIVE LINK — the link and every preview opened from it stop counting within the switch's refresh. */
export function RevokePreviewLink({
  linkId,
  label,
  expectSeq,
  reasonMin,
  reasonMax,
  seconds,
}: Bounds & {
  linkId: string;
  label: string;
  expectSeq: number;
  /** How soon every server sees the revoke (`JOURNEY_SWITCH_MAX_AGE_MS`), from the server. */
  seconds: number;
}) {
  const mayAct = useMayAct();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);
  const headingId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  if (!mayAct) return <ActReadOnly />;

  const cleanWhy = cleanReason(reason);
  const armed = cleanWhy.length >= reasonMin && cleanWhy.length <= reasonMax;
  const dirty = reason.length > 0;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setReason("");
    setRefusal(null);
  };

  const submit = () => {
    if (!armed || pending) return;
    setRefusal(null);
    startTransition(async () => {
      const result = await runAdminAction(() => revokeJourneyPreviewLinkAction({ linkId, reason, expectSeq }));
      if (!result.ok) {
        const field = refusalField(result);
        setRefusal({ field: field === "reason" ? "reason" : null, message: result.error });
        toast({ title: "The link was not revoked", description: result.error, variant: "danger" });
        if (field === "reason") reasonRef.current?.focus();
        return;
      }
      setOpen(false);
      setReason("");
      setRefusal(null);
      router.refresh();
      deferToast({
        title: result.changed ? "Link revoked" : "Nothing changed",
        description: result.note ?? undefined,
        variant: result.warn ? "warning" : result.changed ? "success" : "default",
      });
    });
  };

  return (
    <>
      <Button type="button" size="sm" variant="ghost" aria-haspopup="dialog" disabled={pending} onClick={() => setOpen(true)}>
        Revoke
      </Button>
      <Modal
        open={open}
        onClose={close}
        role="alertdialog"
        labelledBy={headingId}
        maxWidth={440}
        closeOnScrim={!pending && !dirty}
        closeOnEsc={!pending && !dirty}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <div className="space-y-4">
          <h2 id={headingId} className="pr-8 font-display text-body-lg font-semibold text-text">
            Revoke the link for <span data-operator-text="label">{label}</span>?
          </h2>
          <p className="text-body-sm text-text-secondary">
            The link, and every preview already opened from it, stop working within {seconds} seconds. It cannot be turned
            back on — create a new link if they need one again.
          </p>
          <ReasonField
            value={reason}
            onChange={(v) => { setReason(v); if (refusal?.field === "reason") setRefusal(null); }}
            bounds={{ reasonMin, reasonMax }}
            error={refusal?.field === "reason" ? refusal.message : undefined}
            disabled={pending}
            inputRef={reasonRef}
          />
          {refusal !== null && refusal.field === null && <p className="text-body-sm text-danger-fg" role="alert">{refusal.message}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Keep the link</Button>
            <Button type="button" size="md" variant="claret" onClick={submit} disabled={!armed} loading={pending}>
              Revoke the link
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
