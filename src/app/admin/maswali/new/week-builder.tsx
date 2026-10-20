"use client";

/**
 * THE WEEK BUILDER — fifteen questions, ten mains and five reserves, each in English, Swahili and Chinese (MASWALI-BUILD
 * S4; MASWALI-PLAN §7b S4 item 1, MB-21).
 *
 * ⛔ THE SERVER DECIDES. This form only gathers the rows and posts them as one JSON field; `createWeek` validates every
 *    one (the slot, the event clock in its own zone, the sources) and the open's checklist runs on the week page, where
 *    the officer sees each reason in words before anything can open.
 * ⭐ The event start is typed in the SOURCE's zone, as the source prints it (a Premier League fixture in London time);
 *    the week page shows it in both that zone and EAT. A start in a clock change's repeated hour is refused, never
 *    guessed.
 * The counters are guidance for the player screens' line lengths; they do not block a save.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useDeferredToast } from "@/components/ui/toast";
import { utcToZonedLocal } from "@/lib/maswali-time";
import type { DraftSuggestion } from "@/lib/server/maswali-console";
import { createMaswaliWeekAction, editMaswaliQuestionsAction } from "../actions";

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const;
const KINDS = ["SPORT", "PRICE", "WEATHER", "ANNOUNCEMENT"] as const;
/** The zones Millionea's sources publish in. Any IANA zone works server-side; these are the ones the form offers. */
const ZONES = ["Africa/Dar_es_Salaam", "Europe/London", "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "Europe/Rome", "America/New_York", "Asia/Shanghai", "UTC"] as const;
/**
 * MB-21 · how a criterion is written, per kind of event — in English, the canonical text; the Swahili and Chinese are the
 * officer's and the translator's, and the second reader attests all three agree (MB-79). The braces are the officer's to
 * fill; a criterion still carrying one is not finished.
 */
const CRITERION_TEMPLATES: Record<string, string> = {
  SPORT: "YES if {home} beat {away} in regulation time (90 minutes plus stoppage), as the source's final score shows; NO for a draw or an {away} win.",
  PRICE: "YES if {asset} closes above {level} on {date}, as the source publishes its closing figure; NO otherwise. The reading is {tolerance}.",
  WEATHER: "YES if the source reports at least {amount} mm of rain at {station} on {date}; NO otherwise.",
  ANNOUNCEMENT: "YES if {body} announces {what} on its official channel by {time} EAT on {date}; NO otherwise.",
};
const kindFor = (category: string) => (category === "sports" ? "SPORT" : category === "macro" || category === "crypto" ? "PRICE" : category === "weather" ? "WEATHER" : "ANNOUNCEMENT");
const TEXT_GUIDE = 110;
const CRITERION_GUIDE = 240;

export type BuilderRow = Row;
type Row = {
  role: "MAIN" | "RESERVE"; ordinal: number; category: string; eventKind: string;
  textEn: string; textSw: string; textZh: string; criterionEn: string; criterionSw: string; criterionZh: string;
  sourceUrl: string; fallbackSourceUrl: string; readingTolerance: string;
  eventDate: string; eventTime: string; eventZone: string; probabilityPct: string; probabilitySource: string;
};

const emptyRow = (i: number): Row => ({
  role: i < 10 ? "MAIN" : "RESERVE", ordinal: i < 10 ? i + 1 : i - 9, category: "sports", eventKind: "SPORT",
  textEn: "", textSw: "", textZh: "", criterionEn: "", criterionSw: "", criterionZh: "",
  sourceUrl: "", fallbackSourceUrl: "", readingTolerance: "", eventDate: "", eventTime: "", eventZone: "Africa/Dar_es_Salaam",
  probabilityPct: "", probabilitySource: "",
});
const label = (r: Row) => (r.role === "MAIN" ? `M${r.ordinal}` : `A${r.ordinal}`);

/** The row as the server stores it: one question of the draft, in the builder's shape. */
const toQuestion = (r: Row) => ({
  role: r.role, ordinal: r.ordinal, category: r.category, eventKind: r.eventKind,
  textEn: r.textEn, textSw: r.textSw, textZh: r.textZh, criterionEn: r.criterionEn, criterionSw: r.criterionSw, criterionZh: r.criterionZh,
  sourceUrl: r.sourceUrl, fallbackSourceUrl: r.fallbackSourceUrl || null, readingTolerance: r.readingTolerance || null,
  eventLocalStart: r.eventDate && r.eventTime ? `${r.eventDate}T${r.eventTime}` : "", eventZone: r.eventZone,
  probabilityEstimate: r.probabilityPct === "" ? null : Number(r.probabilityPct) / 100, probabilitySource: r.probabilitySource || null,
});

/** `edit` opens a DRAFT: its start and line stay fixed, and the changed slots save as one batch (MB-79). */
export function WeekBuilder({ defaultMonday, edit, suggestions = [] }: { defaultMonday: string; edit?: { weekId: string; rows: Row[] }; suggestions?: DraftSuggestion[] }) {
  const router = useRouter();
  const mayAct = useMayAct();
  const [weekStart, setWeekStart] = useState(defaultMonday);
  const [visibility, setVisibility] = useState<"PUBLIC" | "DRIVE">("PUBLIC");
  const [rows, setRows] = useState<Row[]>(() => edit ? edit.rows.map((r) => ({ ...r })) : Array.from({ length: 15 }, (_, i) => emptyRow(i)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { deferToast } = useDeferredToast(pending);
  // The draft as it was first drawn: any change since is work the officer would lose by leaving (test:unsaved-changes).
  const [baseline] = useState(() => JSON.stringify([weekStart, visibility, rows]));
  const dirty = JSON.stringify([weekStart, visibility, rows]) !== baseline;
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  /** Fill a slot from a suggestion: its words, its source and its time in EAT. The officer edits from there. */
  const fillFrom = (slotIndex: number, sg: DraftSuggestion) => {
    const local = utcToZonedLocal(Date.parse(sg.startsAt), "Africa/Dar_es_Salaam");
    set(slotIndex, {
      category: sg.category, eventKind: kindFor(sg.category), textEn: sg.textEn, textSw: sg.textSw, textZh: sg.textZh,
      criterionEn: sg.criterionEn, criterionSw: sg.criterionSw, criterionZh: sg.criterionZh, sourceUrl: sg.sourceUrl,
      eventDate: local.slice(0, 10), eventTime: local.slice(11, 16), eventZone: "Africa/Dar_es_Salaam",
    });
  };

  const submit = () => {
    setError(null);
    if (edit) {
      const changed = rows.map((r, i) => ({ r, i })).filter(({ r, i }) => JSON.stringify(r) !== JSON.stringify(edit.rows[i]));
      if (changed.length === 0) { setError("Nothing changed."); return; }
      const edits = changed.map(({ r }) => {
        const { role: _role, ordinal: _ordinal, ...changes } = toQuestion(r);
        void _role; void _ordinal;
        return { slot: r.role === "MAIN" ? r.ordinal : r.ordinal + 10, changes };
      });
      const form = new FormData();
      form.set("weekId", edit.weekId);
      form.set("edits", JSON.stringify(edits));
      start(async () => {
        const res = await editMaswaliQuestionsAction(form);
        if (!res.ok) { setError(res.error); return; }
        deferToast(res.recorded === false
          ? { title: "Questions saved, but the audit record was not written", description: "Tell an administrator. The edits are already saved; do not repeat them.", variant: "warning", durationMs: 0 }
          : { title: "Questions saved", variant: "success" });
        router.push(`/admin/maswali/${edit.weekId}` as Route);
      });
      return;
    }
    const questions = rows.map(toQuestion);
    const fd = new FormData();
    fd.set("weekStart", weekStart);
    fd.set("visibility", visibility);
    fd.set("questions", JSON.stringify(questions));
    start(async () => {
      const r = await createMaswaliWeekAction(fd);
      if (!r.ok) { setError(r.error); return; }
      router.push(`/admin/maswali/${r.weekId}` as Route);
    });
  };

  return (
    <div className="space-y-4 max-w-form">
      <UnsavedChangesGuard dirty={dirty} body="This week's draft has changes that have not been saved. Leaving now discards them." />
      {!edit && (
        <div className="glass-panel p-4 grid gap-3 sm:grid-cols-2">
          <Field label="The Monday the week starts" hint="Sales open and close on the rules' template days, in East Africa Time.">
            <DateSelect value={weekStart} onChange={setWeekStart} size="md" />
          </Field>
          <Field label="Line" hint="A drive week is private and never seeds a public week (OD-21).">
            <Select size="md" value={visibility} onChange={(v) => setVisibility(v === "DRIVE" ? "DRIVE" : "PUBLIC")} ariaLabel="Line"
              options={[{ value: "PUBLIC", label: "Public" }, { value: "DRIVE", label: "Drive (private)" }]} />
          </Field>
        </div>
      )}

      {suggestions.length > 0 && (
        <details className="glass-panel p-4">
          <summary className="cursor-pointer font-semibold text-body">Start from the calendar · {suggestions.length}</summary>
          <p className="text-body-sm text-text-tertiary mt-1">Fixtures from the event calendar and AI-drafted polls in this week's window. Choosing one fills a slot; nothing is published, and every row still passes the open's checks.</p>
          <ul className="mt-3 space-y-2">
            {suggestions.map((sg) => (
              <li key={`${sg.kind}-${sg.id}`} className="flex items-center gap-3 flex-wrap text-body-sm">
                <span className="text-body-sm text-text-tertiary tabular min-w-[120px]">{utcToZonedLocal(Date.parse(sg.startsAt), "Africa/Dar_es_Salaam").replace("T", " ")} EAT</span>
                <span className="text-body-sm text-text-tertiary">{sg.kind === "ai" ? "AI draft" : "Fixture"} · {sg.category}</span>
                <span className="min-w-0 flex-1">{sg.textEn}</span>
                <Select size="md" value="" ariaLabel={`Fill a slot with ${sg.textEn}`} onChange={(v) => { if (v !== "") fillFrom(Number(v), sg); }}
                  options={[{ value: "", label: "Fill slot…" }, ...rows.map((r, j) => ({ value: String(j), label: label(r) }))]} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {rows.map((r, i) => (
        <section key={i} className="glass-panel p-4 space-y-3" aria-label={`Question ${label(r)}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-semibold text-title-sm">{label(r)} <span className="text-text-tertiary text-body-sm">{r.role === "MAIN" ? "main" : "reserve · Akiba"}</span></h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category"><Select size="md" value={r.category} onChange={(v) => set(i, { category: v })} ariaLabel={`${label(r)} category`} options={CATEGORIES.map((c) => ({ value: c, label: c }))} /></Field>
            <Field label="Kind of event"><Select size="md" value={r.eventKind} onChange={(v) => set(i, { eventKind: v })} ariaLabel={`${label(r)} kind`} options={KINDS.map((k) => ({ value: k, label: k.toLowerCase() }))} /></Field>
          </div>
          {([["textEn", "Question · English"], ["textSw", "Question · Kiswahili"], ["textZh", "Question · 中文"]] as const).map(([k, l]) => (
            <Field key={k} label={l} hint={`${r[k].length} / ${TEXT_GUIDE}${r[k].length > TEXT_GUIDE ? " · long for the slip" : ""}`}>
              <Textarea rows={5} value={r[k]} onChange={(e) => set(i, { [k]: e.target.value } as Partial<Row>)} />
            </Field>
          ))}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => set(i, { criterionEn: CRITERION_TEMPLATES[r.eventKind] ?? CRITERION_TEMPLATES.ANNOUNCEMENT })}>Use the {r.eventKind.toLowerCase()} template</Button>
            {/[{}]/.test(r.criterionEn) && <span className="text-body-sm text-warning">Fill every {"{…}"} before saving.</span>}
          </div>
          {([["criterionEn", "How it resolves · English"], ["criterionSw", "How it resolves · Kiswahili"], ["criterionZh", "How it resolves · 中文"]] as const).map(([k, l]) => (
            <Field key={k} label={l} hint={`${r[k].length} / ${CRITERION_GUIDE}`}>
              <Textarea rows={2} value={r[k]} onChange={(e) => set(i, { [k]: e.target.value } as Partial<Row>)} />
            </Field>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Event date (source's zone)"><DateSelect value={r.eventDate} onChange={(v) => set(i, { eventDate: v })} size="md" /></Field>
            <Field label="Start time"><TimeSelect value={r.eventTime} onChange={(v) => set(i, { eventTime: v })} size="md" aria-label={`${label(r)} start time`} /></Field>
            <Field label="The source's zone"><Select size="md" value={r.eventZone} onChange={(v) => set(i, { eventZone: v })} ariaLabel={`${label(r)} zone`} options={ZONES.map((z) => ({ value: z, label: z }))} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source (the official result)"><Input size="md" value={r.sourceUrl} onChange={(e) => set(i, { sourceUrl: e.target.value })} placeholder="https://" /></Field>
            <Field label="Fallback source" optional><Input size="md" value={r.fallbackSourceUrl} onChange={(e) => set(i, { fallbackSourceUrl: e.target.value })} placeholder="https://" /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Estimated chance of YES (%)" hint="OD-14: inside the rules' band">
              <Input size="md" inputMode="numeric" value={r.probabilityPct} onChange={(e) => set(i, { probabilityPct: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} />
            </Field>
            <Field label="Where the estimate comes from" className="sm:col-span-2"><Input size="md" value={r.probabilitySource} onChange={(e) => set(i, { probabilitySource: e.target.value })} /></Field>
          </div>
          <Field label="Reading tolerance" optional hint="For a price or a reading: how close counts (e.g. two decimals as published)">
            <Input size="md" value={r.readingTolerance} onChange={(e) => set(i, { readingTolerance: e.target.value })} />
          </Field>
        </section>
      ))}

      <div className="flex items-center gap-3 flex-wrap">
        {mayAct
          ? <Button size="md" onClick={submit} disabled={pending} loading={pending}>{edit ? "Save the changes" : "Save the draft"}</Button>
          : <ActReadOnly />}
        {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
      </div>
    </div>
  );
}
