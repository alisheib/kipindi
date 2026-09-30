"use client";

/**
 * /admin/ai-polls → "Short titles" — where an officer reads, approves, edits or rejects the AI's short-title drafts
 * for open markets (the Vodacom plan S2; COMPLIANCE §6: "An admin approves every backfilled short title").
 *
 * ⛔ NOT ONE WORD OF A DRAFT IS DECIDED HERE. The server page hands every row over finished — the drafted words, the
 * rule sentences for each refused language, the sentinel's verdict in words — and the server action hands back every
 * sentence the officer reads after an act. This file decides WHEN, never WHAT. The counters read the ONE budget
 * (`SHORT_TITLE_MAX`) and count what the rule counts (`cleanShortTitle`, then code points); the server applies the
 * rules again on every approval.
 *
 * ⛔ THE SENTINEL NEVER APPROVES. Its verdict is printed beside each language — "agrees", "does not agree: …" or
 * "not checked", with WHY said once for the draft — and the officer's press is the only approval there is. In the edit
 * form a language whose words differ from the ones the sentinel read says so ("not checked yet — the sentinel reads
 * your words when you approve"): an old verdict is never shown against new words.
 *
 * The edit form REPLACES the read-only language blocks (each title and verdict would otherwise be on screen twice); what
 * the AI wrote and why the rules refused it stays under the box until the officer types. Its fields are the market
 * page's fields: the same labels (`SHORT_TITLE_LABEL`), sizes, counter and error state.
 *
 * ⛔ A STALE PAGE NEVER OVERWRITES. "Edit, then approve" sends what this page SHOWED as the market's current value per
 * field; the server refuses, naming the field, when the market has changed since. A plain "Approve" writes a drafted
 * value only where the market still has none.
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
import { SHORT_TITLE_LABEL, SHORT_TITLE_MAX, cleanShortTitle, codePoints } from "@/lib/markets/short-title";
import { cleanReason } from "@/lib/affiliate-rules";
import { draftShortTitlesAction, approveShortTitleDraftAction, rejectShortTitleDraftAction } from "./short-title-actions";

type Loc = "en" | "sw" | "zh";
type Verdict = { kind: "agrees" | "disagrees" | "unchecked"; text: string };

/** One language of one draft, as the server page words it. */
export type ShortTitleDraftLanguageView = {
  loc: Loc;
  language: string;
  /** A short title already on the market. The draft leaves it as it is unless the officer edits it. */
  current: string | null;
  /** The draft is for this language (the market lacks it) — approving writes `drafted`. */
  missing: boolean;
  /** What approving writes (null: nothing — the card keeps the full question). */
  drafted: string | null;
  /** What the AI wrote when the rules refused it. Shown, never written. */
  refused: string | null;
  /** One sentence per rule the AI's words broke. */
  issues: string[];
  /** The sentinel's verdict on `drafted`, in words; null when nothing was drafted for this language. */
  verdict: Verdict | null;
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
  /** The verdict line's words once a language is edited away from what the sentinel read. */
  editedVerdictText: string;
};

export type CompetitionOption = { value: string; label: string };

/** What the rule counts: the value as it would be stored (`cleanShortTitle`), in code points. */
const shortTitleLength = (loc: Loc, value: string | null) => codePoints(cleanShortTitle(loc, value ?? ""));

/**
 * The verdict line in the edit form, for the words in the box NOW: the sentinel's verdict only while they are the
 * words it read; once they differ, "not checked yet — …" (`EDITED_AFTER_CHECK`); nothing for an empty box, or for an
 * already-approved language left as it is.
 */
function editVerdict(l: ShortTitleDraftLanguageView, value: string, editedText: string): Verdict | null {
  const v = cleanShortTitle(l.loc, value);
  if (!v) return null;
  if (l.missing && l.drafted !== null && v === l.drafted) return l.verdict;
  if (!l.missing && v === (l.current ?? "")) return null;
  return { kind: "unchecked", text: editedText };
}

const verdictClass = (v: Verdict) =>
  v.kind === "agrees" ? "text-success-fg" : v.kind === "disagrees" ? "text-danger-fg" : "text-warning-fg";

export function ShortTitleDraftsPanel({
  rows,
  needing,
  readError,
  batchCap,
  competitionOptions,
  reasonMin,
  reasonMax,
}: {
  rows: ShortTitleDraftView[];
  needing: number;
  readError: string | null;
  batchCap: number;
  competitionOptions: CompetitionOption[];
  /** The rejection reason's bounds, as the server measures them (after `cleanReason`). */
  reasonMin: number;
  reasonMax: number;
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
            A short title is the question a phone card shows in two lines, instead of the full question. The AI drafts
            them for open markets that have none; nothing reaches a market until you approve it here — approve one only
            if it says exactly the same thing as the full question. Budgets: English and Swahili{" "}
            {SHORT_TITLE_MAX.en} characters, Chinese {SHORT_TITLE_MAX.zh}. The full question, the resolution criterion
            and the source stay unchanged on the market&apos;s page.
          </p>
          <p className="mt-1 text-body-sm text-text-tertiary">
            {needing === 0
              ? "Every open market has short titles, a draft waiting, or languages an officer declined."
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
        rows.map((v) => (
          <DraftRow key={v.marketId} view={v} mayAct={mayAct} competitionOptions={competitionOptions} reasonMin={reasonMin} reasonMax={reasonMax} />
        ))
      )}
    </div>
  );
}

function counterClass(n: number, max: number): string {
  return n > max ? "text-danger-fg" : "text-text-subtle";
}

function DraftRow({
  view,
  mayAct,
  competitionOptions,
  reasonMin,
  reasonMax,
}: {
  view: ShortTitleDraftView;
  mayAct: boolean;
  competitionOptions: CompetitionOption[];
  reasonMin: number;
  reasonMax: number;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "reject">("view");
  const lang = (loc: Loc) => view.languages.find((l) => l.loc === loc)!;
  /** The edit form opens on what approving would write: the drafted words, else what the market already has. */
  const seedFor = (l: ShortTitleDraftLanguageView) => (l.missing ? (l.drafted ?? "") : (l.current ?? ""));
  const seed = {
    en: seedFor(lang("en")),
    sw: seedFor(lang("sw")),
    zh: seedFor(lang("zh")),
    competition: view.competition.drafted ?? view.competition.current ?? "",
  };
  /** What this page SHOWED as the market's current value per field — sent with an edit, so a stale page is refused. */
  const baseline = {
    shortTitleEn: lang("en").current,
    shortTitleSw: lang("sw").current,
    shortTitleZh: lang("zh").current,
    competition: view.competition.current,
  };
  const [edit, setEdit] = useState(seed);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<{ field: string | null; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);

  /** Counted as the server counts it (`cleanReason`), so the figure the officer watches is the one applied. */
  const reasonLength = cleanReason(reason).length;
  const reasonOk = reasonLength >= reasonMin && reasonLength <= reasonMax;
  const editDirty = edit.en !== seed.en || edit.sw !== seed.sw || edit.zh !== seed.zh || edit.competition !== seed.competition;
  const dirty = (mode === "edit" && editDirty) || (mode === "reject" && reason.trim().length > 0);
  const hasDrafted = view.languages.some((l) => l.missing && l.drafted) || !!view.competition.drafted;
  /** A stored competition this build no longer lists stays selectable as itself, never silently shown as "None". */
  const competitionChoices = [
    { value: "", label: "None" },
    ...(view.competition.current && !competitionOptions.some((o) => o.value === view.competition.current)
      ? [{ value: view.competition.current, label: view.competition.currentLabel ?? view.competition.current }]
      : []),
    ...competitionOptions,
  ];

  const reset = () => { setEdit(seed); setReason(""); setRefusal(null); };
  const close = () => { if (pending) return; setMode("view"); reset(); };

  const landed = (title: string, notes: Array<{ tone: "ok" | "warn"; text: string }>) => {
    setMode("view");
    reset();
    router.refresh();
    deferToast({
      title,
      description: notes.map((n) => n.text).join(" ") || undefined,
      variant: notes.some((n) => n.tone === "warn") ? "warning" : "success",
    });
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
      const r = await runAdminAction(() => approveShortTitleDraftAction({
        marketId: view.marketId,
        edited: withEdit ? edited : undefined,
        baseline: withEdit ? baseline : undefined,
      }));
      if (!r.ok) {
        setRefusal({ field: "field" in r && typeof r.field === "string" ? r.field : null, message: r.error });
        toast({ title: "Not approved", description: r.error, variant: "danger" });
        return;
      }
      landed("Short titles approved", r.notes);
    });
  };

  const reject = () => {
    if (!mayAct || pending || !reasonOk) return;
    setRefusal(null);
    start(async () => {
      const r = await runAdminAction(() => rejectShortTitleDraftAction({ marketId: view.marketId, reason }));
      if (!r.ok) {
        setRefusal({ field: "field" in r && typeof r.field === "string" ? r.field : null, message: r.error });
        toast({ title: "Not rejected", description: r.error, variant: "danger" });
        return;
      }
      landed("Draft rejected", r.notes);
    });
  };

  const fieldFor: Record<Loc, "shortTitleEn" | "shortTitleSw" | "shortTitleZh"> = { en: "shortTitleEn", sw: "shortTitleSw", zh: "shortTitleZh" };

  return (
    <div className="glass-panel p-4 space-y-3">
      <div>
        <p className="font-display font-semibold text-body-sm text-text break-words">
          <Link href={`/admin/markets/${view.marketId}` as Route} className="underline-offset-2 hover:underline">
            {view.question}
          </Link>
        </p>
        <p className="mt-0.5 text-body-sm text-text-tertiary break-words">{view.questionSw}</p>
        {view.questionZh && <p className="text-body-sm text-text-tertiary break-words">{view.questionZh}</p>}
        <p className="mt-1 text-body-sm text-text-subtle">Drafted <span className="font-mono tabular-nums">{view.draftedAtLabel}</span></p>
      </div>

      {mode !== "edit" && (
        <div className="space-y-2">
          {view.languages.map((l) => (
            <div key={l.loc} className="rounded-md border border-border p-3 space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{l.language}</span>
                {l.missing && l.drafted && (
                  <span className={`font-mono text-body-sm tabular-nums ${counterClass(shortTitleLength(l.loc, l.drafted), SHORT_TITLE_MAX[l.loc])}`}>
                    {shortTitleLength(l.loc, l.drafted)} / {SHORT_TITLE_MAX[l.loc]}
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
                <p key={i} className="text-body-sm text-warning-fg break-words">{s}</p>
              ))}
              {l.verdict && (
                <p className={`text-body-sm ${verdictClass(l.verdict)}`}>
                  Sentinel check: {l.verdict.text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {/* WHY the sentinel did not check — once for the draft, directly under the verdicts it explains (every mode). */}
      {view.uncheckedReason && (
        <p className="text-body-sm text-text-tertiary break-words">Why the sentinel did not check them: {view.uncheckedReason}</p>
      )}
      {mode !== "edit" && (
        <p className="text-body-sm text-text-secondary">
          Competition:{" "}
          {view.competition.draftedLabel
            ? <>{view.competition.draftedLabel} <span className="text-text-subtle">(drafted)</span></>
            : view.competition.currentLabel
              ? <>{view.competition.currentLabel} <span className="text-text-subtle">(already set)</span></>
              : "None"}
        </p>
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
          <p className="text-body-sm text-text-subtle">Leave a language empty and its card shows the full question.</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {view.languages.map((l) => {
              const value = edit[l.loc];
              const n = shortTitleLength(l.loc, value);
              const max = SHORT_TITLE_MAX[l.loc];
              const f = fieldFor[l.loc];
              const verdict = editVerdict(l, value, view.editedVerdictText);
              // What the AI wrote and why it was refused describe the AI's words — shown until the officer types.
              const untouched = value === seedFor(l);
              return (
                <Field key={l.loc} label={SHORT_TITLE_LABEL[l.loc]} dataField={f} error={refusal?.field === f ? refusal.message : undefined}>
                  <Input
                    value={value}
                    disabled={pending}
                    error={refusal?.field === f || n > max}
                    onChange={(e) => { setEdit({ ...edit, [l.loc]: e.target.value }); if (refusal?.field === f) setRefusal(null); }}
                  />
                  <p className={`mt-1 font-mono text-body-sm tabular-nums ${counterClass(n, max)}`}>{n} / {max}</p>
                  {!l.missing && untouched && <p className="mt-1 text-body-sm text-text-subtle">Already approved — the draft leaves it as it is.</p>}
                  {untouched && l.refused && <p className="mt-1 text-body-sm text-text-tertiary break-words">The AI wrote: {l.refused}</p>}
                  {untouched && l.issues.map((s, i) => (
                    <p key={i} className="mt-1 text-body-sm text-warning-fg break-words">{s}</p>
                  ))}
                  {verdict && (
                    <p className={`mt-1 text-body-sm break-words ${verdictClass(verdict)}`}>Sentinel check: {verdict.text}</p>
                  )}
                </Field>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Field label="Competition" hint="Optional. Shown beside the category on the card." dataField="competition" error={refusal?.field === "competition" ? refusal.message : undefined}>
              <Select
                value={edit.competition}
                ariaLabel="Competition"
                disabled={pending}
                options={competitionChoices}
                onChange={(v) => { setEdit({ ...edit, competition: v }); if (refusal?.field === "competition") setRefusal(null); }}
              />
            </Field>
          </div>
          {refusal && refusal.field === null && <p role="alert" className="text-body-sm text-danger-fg">{refusal.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="md" variant="primary" onClick={() => approve(true)} loading={pending}>
              Approve these short titles
            </Button>
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
          </div>
        </div>
      )}

      {mayAct && mode === "reject" && (
        <div className="space-y-3 border-t border-border pt-3">
          <Field
            label="Reason for rejecting"
            dataField="reason"
            error={refusal?.field === "reason" ? refusal.message : undefined}
            hint={`Required — at least ${reasonMin} characters, kept with the rejection. The market is not changed and will not be drafted again; its short titles can still be set by hand on the market's page.`}
          >
            <Textarea
              value={reason}
              rows={2}
              maxLength={reasonMax}
              disabled={pending}
              aria-invalid={refusal?.field === "reason" || reasonLength > reasonMax || undefined}
              onChange={(e) => { setReason(e.target.value); if (refusal?.field === "reason") setRefusal(null); }}
            />
            <p className={`mt-1 font-mono text-body-sm tabular-nums ${counterClass(reasonLength, reasonMax)}`}>{reasonLength} / {reasonMax}</p>
          </Field>
          {refusal && refusal.field === null && <p role="alert" className="text-body-sm text-danger-fg">{refusal.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="md" variant="primary" onClick={reject} loading={pending} disabled={pending || !reasonOk}>
              Reject this draft
            </Button>
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
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
