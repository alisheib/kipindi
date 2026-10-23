"use client";

/**
 * /admin/maswali · the Owner's two forms beside the weeks (MASWALI-BUILD S7-F2; the S7 review, round 2): the rules of the
 * next week (`maswali.config`) and the public-holiday list the holiday review reads (MB-85).
 * ⛔ The page renders these only for a role the action accepts (`canUseControl`); any other role reads the same values
 *    on the page, read-only, beside the locked control — never a form that bounces.
 * ⛔ Nothing is judged here: the server validates every value with the config's or the store's own rule, in its words.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { ConfirmModal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { RULES_FIELDS, RULES_GROUPS, WEEKDAY_OPTIONS, rulesValueText, type RulesFieldKey, type RulesFormValues } from "./rules-form";
import { saveMaswaliConfigAction, saveMaswaliHolidaysAction } from "./actions";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

const Feedback = ({ error, note }: { error: string | null; note: string | null }) => (
  <>
    {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
    {note && <p role="status" className="text-body-sm text-success">{note}</p>}
  </>
);

export function RulesForm({ initial, policies }: { initial: RulesFormValues; policies: Array<{ value: string; label: string }> }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<RulesFormValues>(initial);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  const changed = RULES_FIELDS.filter((f) => values[f.key] !== initial[f.key]);
  const set = (key: RulesFieldKey, v: string) => { setNote(null); setValues((s) => ({ ...s, [key]: v })); };
  const save = () => {
    setError(null);
    setNote(null);
    start(async () => {
      const r = await saveMaswaliConfigAction(fd(values));
      setConfirm(false);
      if (!r.ok) { setError({ text: r.error, field: r.field }); return; }
      setNote("Saved. The next week to open freezes these rules; a week already open keeps its own.");
      router.refresh();
    });
  };
  return (
    <div className="space-y-3">
      {RULES_GROUPS.map((g) => (
        <section key={g.id} className="space-y-2">
          <h3 className="font-semibold text-body">{g.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RULES_FIELDS.filter((f) => f.group === g.id).map((f) => (
              <Field key={f.key} label={f.label} dataField={f.key} error={error?.field === f.key ? error.text : undefined}>
                {f.kind === "weekday" ? <Select size="sm" value={values[f.key]} onChange={(v) => set(f.key, v)} ariaLabel={f.label} options={WEEKDAY_OPTIONS} />
                  : f.kind === "policy" ? <Select size="sm" value={values[f.key]} onChange={(v) => set(f.key, v)} ariaLabel={f.label} options={policies} />
                  : f.kind === "clock" ? <TimeSelect size="sm" value={values[f.key]} onChange={(v) => set(f.key, v)} aria-label={f.label} />
                  : f.kind === "tzs" ? <Input size="sm" inputMode="numeric" grouped value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                  : f.kind === "percent" ? <Input size="sm" inputMode="decimal" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                  : <Input size="sm" inputMode="numeric" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
              </Field>
            ))}
          </div>
        </section>
      ))}
      <p className="text-body-sm text-text-secondary">A Millionea ticket has no paid early exit: that window is not a setting.{/* MB-50 */}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" disabled={pending || changed.length === 0} onClick={() => { setError(null); setConfirm(true); }}>Save the rules</Button>
        {changed.length > 0 && <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setValues(initial); setError(null); }}>Undo the changes</Button>}
      </div>
      {error && !error.field && <Feedback error={error.text} note={null} />}
      <Feedback error={null} note={note} />
      <UnsavedChangesGuard dirty={changed.length > 0} body="The Millionea rules have changes that were not saved. Leaving now discards them." />
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} loading={pending} tone="brand"
        title="Save the rules for the next week?" confirmLabel="Save the rules"
        body={
          <div className="space-y-2 text-left">
            <ul className="space-y-1">
              {/* The change's arrow is the family's (AGENTS.md §7, R-ONE-SOURCE: no typed mark draws an icon); a reader hears
                  "to" where the eye sees it. */}
              {changed.map((f) => (
                <li key={f.key} className="text-body-sm">
                  {f.label}: {rulesValueText(f.key, initial[f.key], policies)}{" "}
                  <I.arrowRight s={12} text="body-400" className="inline align-[-1px]" /><span className="sr-only">to</span>{" "}
                  {rulesValueText(f.key, values[f.key], policies)}
                </li>
              ))}
            </ul>
            <p className="text-body-sm">The next week to open freezes the rules as they stand then. A week already open keeps the rules it froze.{/* MB-75 */}</p>
          </div>
        }
        onConfirm={save} />
    </div>
  );
}

/** The holiday list, read: each date, or the sentence that none is recorded. */
export function HolidayList({ dates, onRemove, disabled }: { dates: string[]; onRemove?: (d: string) => void; disabled?: boolean }) {
  if (dates.length === 0) return <p className="text-body-sm text-text-secondary">No public holiday is recorded.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {dates.map((d) => (
        <li key={d} className="flex items-center gap-1.5 text-body-sm tabular">
          <span>{d}</span>
          {onRemove && <Button size="xs" variant="ghost" disabled={disabled} onClick={() => onRemove(d)}>Remove</Button>}
        </li>
      ))}
    </ul>
  );
}

export function HolidaysForm({ dates }: { dates: string[] }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [list, setList] = useState<string[]>(dates);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  const dirty = list.join(",") !== [...dates].sort().join(",");
  const save = () => {
    setError(null);
    setNote(null);
    start(async () => {
      const r = await saveMaswaliHolidaysAction(fd({ dates: JSON.stringify(list) }));
      setConfirm(false);
      if (!r.ok) { setError(r.error); return; }
      setNote("Saved. The holiday review reads this list from now on.");
      router.refresh();
    });
  };
  return (
    <div className="space-y-3">
      <HolidayList dates={list} disabled={pending} onRemove={(d) => { setNote(null); setList((l) => l.filter((x) => x !== d)); }} />
      <div className="flex items-end gap-2 flex-wrap">
        <Field label="Add a public holiday (EAT date)"><DateSelect size="sm" value={pick} onChange={setPick} /></Field>
        <Button size="sm" variant="ghost" disabled={pending || pick === "" || list.includes(pick)}
          onClick={() => { setNote(null); setList((l) => [...l, pick].sort()); setPick(""); }}>Add</Button>
      </div>
      <Button size="sm" disabled={pending || !dirty} onClick={() => { setError(null); setConfirm(true); }}>Save the list</Button>
      <Feedback error={error} note={note} />
      <UnsavedChangesGuard dirty={dirty || pick !== ""} body="The holiday list has changes that were not saved. Leaving now discards them." />
      {/* MB-85 · the holiday review warns; it never refuses. */}
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} loading={pending} tone="brand"
        title="Save the holiday list?" confirmLabel="Save the list"
        body={`The holiday review names a listed holiday a week's sales close falls on, as a warning while the close can still move — never a refusal. ${list.length === 0 ? "The list will be empty." : `${list.length} date${list.length === 1 ? "" : "s"} will be listed.`}`}
        onConfirm={save} />
    </div>
  );
}
