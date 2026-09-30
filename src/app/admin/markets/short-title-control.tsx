"use client";

/**
 * CARD SHORT TITLES AND THE COMPETITION — the Vodacom plan S2 (`docs/VODACOM-PLAN.md` §0c and §5 S2; ruling SJ-8;
 * COMPLIANCE-DECISIONS §6 "Short titles and competition labels").
 *
 * A market's short title is the question a card will show, at most two lines at 360 px, in the reader's language. It
 * is an AID to reading the market, never the market: the full question, the resolution criterion and the source stay
 * on the market's page unchanged. So the warning sits ABOVE the fields, where it is read before anything is typed.
 *
 * ⭐ THE BUDGET IS READ, NEVER TYPED. The counters come from `SHORT_TITLE_MAX` and `codePoints` over the value
 * `cleanShortTitle` will store (trimmed, folded onto GSM-7), so the number the officer watches is the number the server
 * counts. The server refuses anything the rules refuse (`applyShortTitles`), and the refusal is shown beside the field
 * it names; a warning (a number the full question does not contain) is shown after the save, in the server's words.
 *
 * ⛔ ONLY WHAT MOVED IS SENT. A field the form does not carry is "leave it as it is" on the server, so a stored value
 * the rules would now refuse can never block an edit to a different field — and an untouched field is never rewritten.
 *
 * A1 · `/admin/markets` is the `trading` domain and the action gates on it; a role with VIEW but not ACT reads the
 * values and cannot change them. Admin copy is English only.
 */
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FieldLegend } from "@/components/ui/field-legend";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { setMarketShortTitlesAction } from "@/app/markets/actions";
import { SHORT_TITLE_MAX, cleanShortTitle, codePoints } from "@/lib/markets/short-title";
import { COMPETITIONS } from "@/lib/markets/competitions";
import { competitionLabel } from "@/lib/markets/competition-label";
import { dict, type Locale } from "@/lib/i18n-dict";

type TitleKey = "shortTitleEn" | "shortTitleSw" | "shortTitleZh";
type Key = TitleKey | "competition";
type Values = Record<Key, string>;

const LANGS: ReadonlyArray<{ key: TitleKey; locale: Locale; label: string; placeholder: string }> = [
  { key: "shortTitleEn", locale: "en", label: "English short title", placeholder: "Will Simba beat Yanga on Saturday?" },
  { key: "shortTitleSw", locale: "sw", label: "Swahili short title", placeholder: "Je, Simba itaifunga Yanga Jumamosi?" },
  { key: "shortTitleZh", locale: "zh", label: "Chinese short title · 中文", placeholder: "辛巴周六会击败扬加吗？" },
];

/** The one list, with the dictionary's English labels (admin copy is English). Empty = no competition. */
const COMPETITION_OPTIONS = [
  { value: "", label: "None" },
  ...COMPETITIONS.map((c) => ({ value: c, label: competitionLabel(dict.en, c) })),
];

const KEYS: readonly Key[] = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"];

export function ShortTitleControl({
  marketId, current,
}: {
  marketId: string;
  current: { shortTitleEn: string | null; shortTitleSw: string | null; shortTitleZh: string | null; competition: string | null };
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const boxRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const initial: Values = {
    shortTitleEn: current.shortTitleEn ?? "",
    shortTitleSw: current.shortTitleSw ?? "",
    shortTitleZh: current.shortTitleZh ?? "",
    competition: current.competition ?? "",
  };
  /* ⭐ `saved` is what the server last confirmed, so `dirty` is a comparison against it — clearing a field back to
     what is stored stops being dirty, and a save is clean the moment it lands rather than when the refresh arrives. */
  const [saved, setSaved] = useState<Values>(initial);
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const moved = KEYS.filter((k) => values[k] !== saved[k]);
  const dirty = moved.length > 0;

  const edit = (k: Key, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = () => {
    const box = boxRef.current;
    const send = moved;
    start(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      for (const k of send) fd.set(k, values[k]);
      const r = await runAdminAction(() => setMarketShortTitlesAction(fd));
      if (!r.ok) {
        // ⛔ The refusal is shown VERBATIM beside the field it names: it says what to change.
        if (r.field) {
          setErrors({ [r.field as Key]: r.error });
          focusFirstInvalid(box, [r.field]);
        }
        toast({ title: "Couldn't save the short titles", description: r.error, variant: "danger" });
        return;
      }
      const next: Values = {
        shortTitleEn: r.after.shortTitleEn ?? "",
        shortTitleSw: r.after.shortTitleSw ?? "",
        shortTitleZh: r.after.shortTitleZh ?? "",
        competition: r.after.competition ?? "",
      };
      setSaved(next);
      setValues(next);
      setErrors({});
      setWarnings(r.warningSentences);
      if (!r.changed) {
        toast({ title: "Nothing to save", description: "The short titles and the competition are already these.", variant: "default" });
        return;
      }
      router.refresh();
      deferToast(
        r.recorded
          ? { title: "Short titles saved", description: "Card wording only — the full question, the criterion, the source, pools and stakes are untouched.", variant: "success" }
          : { title: "Saved — but its audit record was not written", description: "The change is saved. Tell compliance so the record can be completed.", variant: "warning" },
      );
    });
  };

  return (
    <div ref={boxRef} className="space-y-3">
      <FieldLegend as="h3" className="block">Card short titles</FieldLegend>
      <Callout tone="warning" title="Cards show this short question instead of the full one.">
        The full question, the criterion and the source stay unchanged on the market page — the short title must say exactly the same thing.
      </Callout>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {LANGS.map(({ key, locale, label, placeholder }) => {
          const n = codePoints(cleanShortTitle(locale, values[key]));
          const max = SHORT_TITLE_MAX[locale];
          const counterId = `stc-${uid}-${key}`;
          return (
            <Field key={key} label={label} dataField={key} error={errors[key]}>
              <Input
                value={values[key]}
                onChange={(e) => edit(key, e.target.value)}
                disabled={pending || !mayAct}
                placeholder={placeholder}
                error={!!errors[key]}
                aria-describedby={counterId}
              />
              <p id={counterId} className={`mt-1 text-body-sm tabular-nums ${n > max ? "text-danger-fg" : "text-text-subtle"}`}>
                {n} / {max}
              </p>
            </Field>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-3">
        <Field label="Competition" dataField="competition" error={errors.competition}>
          <Select
            ariaLabel="Competition"
            value={values.competition}
            onChange={(v) => edit("competition", v)}
            disabled={pending || !mayAct}
            options={COMPETITION_OPTIONS}
          />
        </Field>
        <div>
          <Button type="button" size="sm" onClick={save} loading={pending} disabled={!dirty || !mayAct} title={actReason}>
            Save short titles
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <Callout tone="warning" size="md" surface="panel" role="status" title="Check these">
          <ul className="space-y-1">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </Callout>
      )}

      <UnsavedChangesGuard
        dirty={dirty}
        body="The card short titles have been edited but not saved. Leaving now discards the edit."
      />
    </div>
  );
}
