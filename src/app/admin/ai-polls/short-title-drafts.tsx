"use client";

/**
 * /admin/ai-polls → "Short titles" — where an officer reads, approves, edits or rejects the AI's short-title drafts
 * for open markets (the Vodacom plan S2; COMPLIANCE §6: "An admin approves every backfilled short title").
 *
 * ⛔ NOT ONE WORD OF A DRAFT IS DECIDED HERE. The server page hands every row over finished — the drafted words, the
 * rule sentences for each refused language, the sentinel's verdict in words — and this file decides WHEN, never
 * WHAT. The counters read the ONE budget (`SHORT_TITLE_MAX`); the server applies the rules again on every approval.
 *
 * ⛔ THE SENTINEL NEVER APPROVES. Its verdict is printed beside each language — "agrees", "does not agree: …" or
 * "not checked by the sentinel" — and the officer's press is the only approval there is.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast } from "@/components/ui/toast";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { SHORT_TITLE_MAX, codePoints } from "@/lib/markets/short-title";
import { draftShortTitlesAction, approveShortTitleDraftAction, rejectShortTitleDraftAction } from "./short-title-actions";

type Loc = "en" | "sw" | "zh";

/** One language of one draft, as the server page words it. */
export type ShortTitleDraftLanguageView = {
  loc: Loc;
  language: string;
  /** A short title already on the market. The draft leaves it as it is unless the officer edits it. */
  current: string | null;
  /** The market lacked this language when drafted — approving writes `drafted`. */
  missing: boolean;
  /** What approving writes (null: nothing — the card keeps the full question). */
  drafted: string | null;
  /** What the AI wrote when the rules refused it. Shown, never written. */
  refused: string | null;
  /** One sentence per rule the AI's words broke. */
  issues: string[];
  /** The sentinel's verdict on `drafted`, in words; null when nothing was drafted for this language. */
  verdict: { kind: "agrees" | "disagrees" | "unchecked"; text: string } | null;
};

export type ShortTitleDraftView = {
  marketId: string;
  question: string;
  questionSw: string;
  questionZh: string | null;
  draftedAtLabel: string;
  languages: ShortTitleDraftLanguageView[];
  competition: { current: string | null; currentLabel: string | null; drafted: string | null; draftedLabel: string | null };
  /** Why the sentinel did not check this draft, when it did not. */
  uncheckedReason: string | null;
};

export type CompetitionOption = { value: string; label: string };

export function ShortTitleDraftsPanel({
  rows,
  needing,
  readError,
  batchCap,
  competitionOptions,
}: {
  rows: ShortTitleDraftView[];
  needing: number;
  readError: string | null;
  batchCap: number;
  competitionOptions: CompetitionOption[];
}) {
  // A1 — read the gate as a hook at the top; the list stays readable for a view-only role, the buttons do not.
  const mayAct = useMayAct();
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);
  const [runNote, setRunNote] = useState<{ tone: "ok" | "warn" | "fail"; text: string } | null>(null);

  const run = () => {
    if (!mayAct || pending) return;
    setRunNote(null);
    start(async () => {
      const r = await runAdminAction(() => draftShortTitlesAction());
      if (!r.ok) {
        setRunNote({ tone: "fail", text: r.error });
        toast({ title: "No drafts were made", description: r.error, variant: "danger" });
        return;
      }
      const parts = [
        `${r.drafted} of ${r.considered} market${r.considered === 1 ? "" : "s"} drafted (at most ${r.clampedTo} per run).`,
        r.failed > 0 ? `${r.failed} could not be drafted.` : "",
        r.stopped ? `Stopped early: ${r.stopped}` : "",
        r.remaining > 0 ? `${r.remaining} still to draft.` : "",
      ].filter(Boolean);
      const text = parts.join(" ");
      setRunNote({ tone: r.failed > 0 || r.stopped ? "warn" : "ok", text });
      router.refresh();
      deferToast({
        title: r.drafted > 0 ? `${r.drafted} draft${r.drafted === 1 ? "" : "s"} ready for review` : "No new drafts",
        description: text,
        variant: r.failed > 0 || r.stopped ? "warning" : r.drafted > 0 ? "success" : "default",
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="glass-panel p-4 space-y-3">
        <div>
          <p className="font-display font-semibold text-body-sm text-text">Short titles for open markets</p>
          <p className="mt-1 text-body-sm text-text-secondary leading-relaxed">
            A short title is the question a phone card shows in two lines. The AI drafts them for open markets that
            have none; nothing reaches a market until you approve it here. Budgets: English and Swahili{" "}
            {SHORT_TITLE_MAX.en} characters, Chinese {SHORT_TITLE_MAX.zh}. The full question, the resolution criterion
            and the source stay on the market&apos;s page unchanged.
          </p>
          <p className="mt-1 text-body-sm text-text-tertiary">
            {needing === 0
              ? "Every open market has short titles or a draft waiting."
              : `${needing} open market${needing === 1 ? "" : "s"} without a short title and without a draft. One run drafts up to ${batchCap}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mayAct ? (
            <Button type="button" size="md" variant="primary" onClick={run} loading={pending} disabled={pending || needing === 0}>
              Draft short titles for open markets
            </Button>
          ) : (
            <ActReadOnly />
          )}
        </div>
        {runNote && (
          <p
            role={runNote.tone === "fail" ? "alert" : "status"}
            className={`text-body-sm ${runNote.tone === "fail" ? "text-danger-fg" : runNote.tone === "warn" ? "text-warning-fg" : "text-text-secondary"}`}
          >
            {runNote.text}
          </p>
        )}
        {readError && <p role="alert" className="text-body-sm text-danger-fg">{readError}</p>}
      </div>

      {rows.length === 0 ? (
        <div className="glass-panel p-4">
          <p className="text-body-sm text-text-secondary">No drafts are waiting for review.</p>
        </div>
      ) : (
        rows.map((v) => <DraftRow key={v.marketId} view={v} mayAct={mayAct} competitionOptions={competitionOptions} />)
      )}
    </div>
  );
}

function counterClass(n: number, max: number): string {
  return n > max ? "text-danger-fg" : "text-text-subtle";
}

function DraftRow({ view, mayAct, competitionOptions }: { view: ShortTitleDraftView; mayAct: boolean; competitionOptions: CompetitionOption[] }) {
  const [mode, setMode] = useState<"view" | "edit" | "reject">("view");
  /** The edit form opens on what approving would write: the drafted words, else what the market already has. */
  const seedFor = (l: ShortTitleDraftLanguageView) => (l.missing ? (l.drafted ?? "") : (l.current ?? ""));
  const seed = {
    en: seedFor(view.languages.find((l) => l.loc === "en")!),
    sw: seedFor(view.languages.find((l) => l.loc === "sw")!),
    zh: seedFor(view.languages.find((l) => l.loc === "zh")!),
    competition: view.competition.drafted ?? view.competition.current ?? "",
  };
  const [edit, setEdit] = useState(seed);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<{ field: string | null; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);

  const editDirty = edit.en !== seed.en || edit.sw !== seed.sw || edit.zh !== seed.zh || edit.competition !== seed.competition;
  const dirty = (mode === "edit" && editDirty) || (mode === "reject" && reason.trim().length > 0);
  const hasDrafted = view.languages.some((l) => l.missing && l.drafted) || !!view.competition.drafted;

  const reset = () => { setEdit(seed); setReason(""); setRefusal(null); };
  const close = () => { if (pending) return; setMode("view"); reset(); };

  const landed = (title: string, r: { changed: boolean; recorded: boolean; draftCleared: boolean }) => {
    const notes = [
      !r.changed ? "The market already had these words — nothing changed." : "",
      !r.recorded ? "The change landed but its audit row was not written — tell the Owner." : "",
      !r.draftCleared ? "The draft could not be cleared — reload the page." : "",
    ].filter(Boolean);
    setMode("view");
    reset();
    router.refresh();
    deferToast({ title, description: notes.join(" ") || undefined, variant: notes.length ? "warning" : "success" });
  };

  const approve = (withEdit: boolean) => {
    if (!mayAct || pending) return;
    setRefusal(null);
    const edited: Record<string, string> = {};
    if (withEdit) {
      if (edit.en !== seed.en) edited.shortTitleEn = edit.en;
      if (edit.sw !== seed.sw) edited.shortTitleSw = edit.sw;
      if (edit.zh !== seed.zh) edited.shortTitleZh = edit.zh;
      if (edit.competition !== seed.competition) edited.competition = edit.competition;
    }
    start(async () => {
      const r = await runAdminAction(() => approveShortTitleDraftAction({ marketId: view.marketId, edited: withEdit ? edited : undefined }));
      if (!r.ok) {
        setRefusal({ field: "field" in r && typeof r.field === "string" ? r.field : null, message: r.error });
        toast({ title: "Not approved", description: r.error, variant: "danger" });
        return;
      }
      landed("Short titles approved", r);
    });
  };

  const reject = () => {
    if (!mayAct || pending) return;
    setRefusal(null);
    start(async () => {
      const r = await runAdminAction(() => rejectShortTitleDraftAction({ marketId: view.marketId, reason }));
      if (!r.ok) {
        setRefusal({ field: "field" in r && typeof r.field === "string" ? r.field : null, message: r.error });
        toast({ title: "Not rejected", description: r.error, variant: "danger" });
        return;
      }
      landed("Draft rejected", r);
    });
  };

  const fieldFor: Record<Loc, "shortTitleEn" | "shortTitleSw" | "shortTitleZh"> = { en: "shortTitleEn", sw: "shortTitleSw", zh: "shortTitleZh" };

  return (
    <div className="glass-panel p-4 space-y-3">
      <div>
        <Link
          href={`/admin/markets/${view.marketId}` as Route}
          className="font-display font-semibold text-body-sm text-text underline-offset-2 hover:underline break-words"
        >
          {view.question}
        </Link>
        <p className="mt-0.5 text-body-sm text-text-tertiary break-words">{view.questionSw}</p>
        {view.questionZh && <p className="text-body-sm text-text-tertiary break-words">{view.questionZh}</p>}
        <p className="mt-1 text-body-sm text-text-subtle">Drafted {view.draftedAtLabel}</p>
      </div>

      <div className="space-y-2">
        {view.languages.map((l) => (
          <div key={l.loc} className="rounded-md border border-border p-3 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{l.language}</span>
              {l.missing && l.drafted && (
                <span className={`font-mono text-body-sm tabular-nums ${counterClass(codePoints(l.drafted), SHORT_TITLE_MAX[l.loc])}`}>
                  {codePoints(l.drafted)} / {SHORT_TITLE_MAX[l.loc]}
                </span>
              )}
            </div>
            {!l.missing ? (
              <p className="text-body-sm text-text-secondary break-words">
                Already approved: {l.current ?? "—"} <span className="text-text-subtle">(the draft leaves it as it is)</span>
              </p>
            ) : l.drafted ? (
              <p className="text-body-sm font-medium text-text break-words">{l.drafted}</p>
            ) : (
              <p className="text-body-sm text-text-secondary">No short title — the card keeps the full question.</p>
            )}
            {l.refused && <p className="text-body-sm text-text-tertiary break-words">The AI wrote: {l.refused}</p>}
            {l.issues.map((s, i) => (
              <p key={i} className="text-body-sm text-warning-fg">{s}</p>
            ))}
            {l.verdict && (
              <p className={`text-body-sm ${l.verdict.kind === "agrees" ? "text-success-fg" : l.verdict.kind === "disagrees" ? "text-danger-fg" : "text-warning-fg"}`}>
                Sentinel check: {l.verdict.text}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-body-sm text-text-secondary">
        Competition:{" "}
        {view.competition.draftedLabel
          ? <>{view.competition.draftedLabel} <span className="text-text-subtle">(drafted)</span></>
          : view.competition.currentLabel
            ? <>{view.competition.currentLabel} <span className="text-text-subtle">(already set)</span></>
            : "none"}
      </p>
      {view.uncheckedReason && (
        <p className="text-body-sm text-text-tertiary">Why the sentinel did not check it: {view.uncheckedReason}</p>
      )}

      {mayAct && mode === "view" && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="md" variant="primary" onClick={() => approve(false)} loading={pending} disabled={pending || !hasDrafted}>
            Approve
          </Button>
          <Button type="button" size="md" variant="ghost" onClick={() => { reset(); setMode("edit"); }} disabled={pending}>
            Edit, then approve
          </Button>
          <Button type="button" size="md" variant="ghost" onClick={() => { reset(); setMode("reject"); }} disabled={pending}>
            Reject
          </Button>
        </div>
      )}
      {mayAct && mode === "view" && refusal && (
        <p role="alert" className="text-body-sm text-danger-fg">{refusal.message}</p>
      )}

      {mayAct && mode === "edit" && (
        <div className="space-y-3 border-t border-border pt-3">
          {view.languages.map((l) => {
            const value = edit[l.loc];
            const n = codePoints(value);
            const f = fieldFor[l.loc];
            return (
              <Field
                key={l.loc}
                label={`${l.language} short title`}
                dataField={f}
                error={refusal?.field === f ? refusal.message : undefined}
                hint={`${n} / ${SHORT_TITLE_MAX[l.loc]} characters. Leave it empty and the card shows the full question.`}
              >
                <Input
                  size="sm"
                  value={value}
                  disabled={pending}
                  aria-invalid={refusal?.field === f || n > SHORT_TITLE_MAX[l.loc] || undefined}
                  onChange={(e) => { setEdit({ ...edit, [l.loc]: e.target.value }); if (refusal?.field === f) setRefusal(null); }}
                />
              </Field>
            );
          })}
          <Field label="Competition" dataField="competition" error={refusal?.field === "competition" ? refusal.message : undefined}>
            <Select
              size="sm"
              value={edit.competition}
              ariaLabel="Competition"
              disabled={pending}
              options={[{ value: "", label: "None" }, ...competitionOptions]}
              onChange={(v) => { setEdit({ ...edit, competition: v }); if (refusal?.field === "competition") setRefusal(null); }}
            />
          </Field>
          {refusal && refusal.field === null && <p role="alert" className="text-body-sm text-danger-fg">{refusal.message}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="button" size="md" variant="primary" onClick={() => approve(true)} loading={pending}>
              Approve these short titles
            </Button>
          </div>
        </div>
      )}

      {mayAct && mode === "reject" && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field
            label="Why — kept with the rejection"
            dataField="reason"
            error={refusal?.field === "reason" ? refusal.message : undefined}
            hint="The market is not changed. A later run may draft it again."
          >
            <Textarea
              value={reason}
              rows={2}
              maxLength={500}
              disabled={pending}
              aria-invalid={refusal?.field === "reason" || undefined}
              onChange={(e) => { setReason(e.target.value); if (refusal?.field === "reason") setRefusal(null); }}
            />
          </Field>
          {refusal && refusal.field === null && <p role="alert" className="text-body-sm text-danger-fg">{refusal.message}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="button" size="md" variant="primary" onClick={reject} loading={pending} disabled={pending || reason.trim().length < 3}>
              Reject this draft
            </Button>
          </div>
        </div>
      )}

      <UnsavedChangesGuard
        dirty={dirty}
        body="A short-title draft has been edited, or a rejection typed, but not sent. Leaving now discards it."
      />
    </div>
  );
}
