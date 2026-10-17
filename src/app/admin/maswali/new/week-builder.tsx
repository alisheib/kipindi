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
import { createMaswaliWeekAction, editMaswaliQuestionAction } from "../actions";

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const;
const KINDS = ["SPORT", "PRICE", "WEATHER", "ANNOUNCEMENT"] as const;
/** The zones Millionea's sources publish in. Any IANA zone works server-side; these are the ones the form offers. */
const ZONES = ["Africa/Dar_es_Salaam", "Europe/London", "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "Europe/Rome", "America/New_York", "Asia/Shanghai", "UTC"] as const;
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

/**
 * `edit` opens the builder on an existing DRAFT: the week's start and line are fixed, and saving sends only the rows that
 * changed, one by one (`editDraftQuestion`; any edit clears the second reader's attestation, MB-79).
 */
export function WeekBuilder({ defaultMonday, edit }: { defaultMonday: string; edit?: { weekId: string; rows: Row[] } }) {
  const router = useRouter();
  const mayAct = useMayAct();
  const [weekStart, setWeekStart] = useState(defaultMonday);
  const [visibility, setVisibility] = useState<"PUBLIC" | "DRIVE">("PUBLIC");
  const [rows, setRows] = useState<Row[]>(() => edit ? edit.rows.map((r) => ({ ...r })) : Array.from({ length: 15 }, (_, i) => emptyRow(i)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = () => {
    setError(null);
    if (edit) {
      const changed = rows.map((r, i) => ({ r, i })).filter(({ r, i }) => JSON.stringify(r) !== JSON.stringify(edit.rows[i]));
      if (changed.length === 0) { setError("Nothing changed."); return; }
      start(async () => {
        for (const { r } of changed) {
          const { role: _role, ordinal: _ordinal, ...changes } = toQuestion(r);
          void _role; void _ordinal;
          const f = new FormData();
          f.set("weekId", edit.weekId);
          f.set("slot", String(r.role === "MAIN" ? r.ordinal : r.ordinal + 10));
          f.set("changes", JSON.stringify(changes));
          const res = await editMaswaliQuestionAction(f);
          if (!res.ok) { setError(`${label(r)}: ${res.error}`); return; }
        }
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
    <div className="space-y-4 max-w-[960px]">
      {!edit && (
        <div className="glass-panel p-4 grid gap-3 sm:grid-cols-2">
          <Field label="The Monday the week starts" hint="Sales open and close on the rules' template days, in East Africa Time.">
            <DateSelect value={weekStart} onChange={setWeekStart} size="sm" />
          </Field>
          <Field label="Line" hint="A drive week is private and never seeds a public week (OD-21).">
            <Select size="sm" value={visibility} onChange={(v) => setVisibility(v === "DRIVE" ? "DRIVE" : "PUBLIC")} ariaLabel="Line"
              options={[{ value: "PUBLIC", label: "Public" }, { value: "DRIVE", label: "Drive (private)" }]} />
          </Field>
        </div>
      )}

      {rows.map((r, i) => (
        <section key={i} className="glass-panel p-4 space-y-3" aria-label={`Question ${label(r)}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-semibold text-title-sm">{label(r)} <span className="text-text-tertiary text-caption">{r.role === "MAIN" ? "main" : "reserve · Akiba"}</span></h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category"><Select size="sm" value={r.category} onChange={(v) => set(i, { category: v })} ariaLabel={`${label(r)} category`} options={CATEGORIES.map((c) => ({ value: c, label: c }))} /></Field>
            <Field label="Kind of event"><Select size="sm" value={r.eventKind} onChange={(v) => set(i, { eventKind: v })} ariaLabel={`${label(r)} kind`} options={KINDS.map((k) => ({ value: k, label: k.toLowerCase() }))} /></Field>
          </div>
          {([["textEn", "Question · English"], ["textSw", "Question · Kiswahili"], ["textZh", "Question · 中文"]] as const).map(([k, l]) => (
            <Field key={k} label={l} hint={`${r[k].length} / ${TEXT_GUIDE}${r[k].length > TEXT_GUIDE ? " · long for the slip" : ""}`}>
              <Input size="sm" value={r[k]} onChange={(e) => set(i, { [k]: e.target.value } as Partial<Row>)} />
            </Field>
          ))}
          {([["criterionEn", "How it resolves · English"], ["criterionSw", "How it resolves · Kiswahili"], ["criterionZh", "How it resolves · 中文"]] as const).map(([k, l]) => (
            <Field key={k} label={l} hint={`${r[k].length} / ${CRITERION_GUIDE}`}>
              <Textarea rows={2} value={r[k]} onChange={(e) => set(i, { [k]: e.target.value } as Partial<Row>)} />
            </Field>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Event date (source's zone)"><DateSelect value={r.eventDate} onChange={(v) => set(i, { eventDate: v })} size="sm" /></Field>
            <Field label="Start time"><TimeSelect value={r.eventTime} onChange={(v) => set(i, { eventTime: v })} size="sm" aria-label={`${label(r)} start time`} /></Field>
            <Field label="The source's zone"><Select size="sm" value={r.eventZone} onChange={(v) => set(i, { eventZone: v })} ariaLabel={`${label(r)} zone`} options={ZONES.map((z) => ({ value: z, label: z }))} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source (the official result)"><Input size="sm" value={r.sourceUrl} onChange={(e) => set(i, { sourceUrl: e.target.value })} placeholder="https://" /></Field>
            <Field label="Fallback source" optional><Input size="sm" value={r.fallbackSourceUrl} onChange={(e) => set(i, { fallbackSourceUrl: e.target.value })} placeholder="https://" /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Estimated chance of YES (%)" hint="OD-14: inside the rules' band">
              <Input size="sm" inputMode="numeric" value={r.probabilityPct} onChange={(e) => set(i, { probabilityPct: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} />
            </Field>
            <Field label="Where the estimate comes from" className="sm:col-span-2"><Input size="sm" value={r.probabilitySource} onChange={(e) => set(i, { probabilitySource: e.target.value })} /></Field>
          </div>
          <Field label="Reading tolerance" optional hint="For a price or a reading: how close counts (e.g. two decimals as published)">
            <Input size="sm" value={r.readingTolerance} onChange={(e) => set(i, { readingTolerance: e.target.value })} />
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
