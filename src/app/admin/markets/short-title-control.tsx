"use client";

/**
 * CARD SHORT TITLES AND THE COMPETITION — the Vodacom plan S2 (`docs/VODACOM-PLAN.md` §0c and §5 S2; ruling SJ-8;
 * COMPLIANCE-DECISIONS §6 "Short titles and competition labels").
 *
 * A market's short title is the question a card will show, at most two lines at 360 px, in the reader's language. It
 * is an AID to reading the market, never the market: the full question, the resolution criterion and the source stay
 * on the market's page unchanged. So the rule sits ABOVE the fields, where it is read before anything is typed — in the
 * SAME words the wizard and the drafts tab use (`SHORT_TITLE_RULE_TITLE` / `_BODY`), as an info note: it explains, it
 * does not warn. Amber is kept for what needs a second look after a save.
 *
 * ⭐ THE BUDGET IS READ, NEVER TYPED. The counters come from `SHORT_TITLE_MAX` and `codePoints` over the value
 * `cleanShortTitle` will store (trimmed, folded onto GSM-7), so the number the officer watches is the number the server
 * counts. The server refuses anything the rules refuse (`applyShortTitles`), and the refusal is shown beside the field
 * it names — and, once the save has settled, that field takes the focus. A warning (a number the full question does not
 * contain) is shown after the save UNDER THE FIELD IT NAMES, in the server's words, and typing into that field clears it.
 *
 * ⛔ ONLY WHAT MOVED IS SENT. A field the form does not carry is "leave it as it is" on the server, so a stored value
 * the rules would now refuse can never block an edit to a different field — and an untouched field is never rewritten.
 * Each field sent carries the value this page showed (`expected.<field>`): if another officer changed it meanwhile,
 * the server refuses instead of overwriting their words.
 *
 * ⭐ THE SENTINEL'S VERDICT IS SHOWN BESIDE EACH LANGUAGE IT READ after a save — "agrees", "does not agree: …" or
 * "not checked" (never "agrees" for a check that did not run). When it did not run, WHY is said ONCE under the three
 * fields (the reason belongs to the save, not to a language) — the drafts tab's own sentence. A verdict describes the
 * SAVED words, so typing into the field clears it. A save the officer should look at again (a warning, or a verdict
 * that is not "agrees") says so in a warning toast, never a green one.
 *
 * A competition key this build does not know (stored before a list change) is SHOWN as such rather than as a blank,
 * and stays as it is unless the officer picks another. The button saves the competition too, so it is named for both:
 * "Save card wording".
 *
 * A1 · `/admin/markets` is the `trading` domain and the action gates on it; a role with VIEW but not ACT reads the
 * values and cannot change them. Admin copy is English only.
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { setMarketShortTitlesAction } from "@/app/markets/actions";
import {
  SHORT_TITLE_LABEL, SHORT_TITLE_MAX, SHORT_TITLE_RULE_BODY, SHORT_TITLE_RULE_TITLE, cleanShortTitle, codePoints,
  shortTitleAuditMissed,
} from "@/lib/markets/short-title";
import { COMPETITIONS, isCompetition } from "@/lib/markets/competitions";
import { competitionLabel } from "@/lib/markets/competition-label";
import { dict, type Locale } from "@/lib/i18n-dict";

type TitleKey = "shortTitleEn" | "shortTitleSw" | "shortTitleZh";
type Key = TitleKey | "competition";
type Values = Record<Key, string>;
type Verdict = { kind: "agrees" | "disagrees" | "unchecked"; text: string };

/* ⭐ The placeholders are EXAMPLES and say so ("e.g.", the console's convention): a full question about another market,
   shown bare in an empty box, reads as a stored value that does not match this one. Short enough to fit the box in a
   one-third column at 1280 (the first longer ones were cut off mid-word). */
const LANGS: ReadonlyArray<{ key: TitleKey; locale: Locale; placeholder: string }> = [
  { key: "shortTitleEn", locale: "en", placeholder: "e.g. Will Simba beat Yanga?" },
  { key: "shortTitleSw", locale: "sw", placeholder: "e.g. Je, Simba itaifunga Yanga?" },
  { key: "shortTitleZh", locale: "zh", placeholder: "e.g. 辛巴会击败扬加吗？" },
];

/** The one list, with the dictionary's English labels (admin copy is English). Empty = no competition. */
const COMPETITION_OPTIONS = [
  { value: "", label: "None" },
  ...COMPETITIONS.map((c) => ({ value: c, label: competitionLabel(dict.en, c) })),
];

/** The choices for what the market STORES: the one list — plus, when it holds a key this build does not know, that key,
 *  named as such, so the select shows what is stored instead of a blank. Picking anything else moves it off. */
function competitionOptions(stored: string) {
  if (!stored || isCompetition(stored)) return COMPETITION_OPTIONS;
  return [COMPETITION_OPTIONS[0], { value: stored, label: `${stored} — not a competition this build knows` }, ...COMPETITION_OPTIONS.slice(1)];
}

/** The same three inks the draft review uses for the sentinel's verdict. */
const VERDICT_INK: Record<Verdict["kind"], string> = { agrees: "text-success-fg", disagrees: "text-danger-fg", unchecked: "text-warning-fg" };

const KEYS: readonly Key[] = ["shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"];

/** What a save that landed says about the rest of the market. */
const CARD_ONLY = "Card wording only — the full question, the criterion, the source, pools and stakes are untouched.";

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
  const [warnings, setWarnings] = useState<Partial<Record<TitleKey, string[]>>>({});
  const [verdicts, setVerdicts] = useState<Partial<Record<TitleKey, Verdict>>>({});
  const [sentinelReason, setSentinelReason] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<Key | null>(null);
  const moved = KEYS.filter((k) => values[k] !== saved[k]);
  const dirty = moved.length > 0;
  // WHY is shown while a "not checked" verdict it explains is still on screen — typing clears the verdicts, and so this.
  const showReason = !!sentinelReason && Object.values(verdicts).some((v) => v?.kind === "unchecked");

  /* ⭐ THE REFUSED FIELD TAKES THE FOCUS ONCE THE SAVE HAS SETTLED. While `pending` every input is disabled, and a
     disabled control cannot take focus — a focus attempted inside the transition went nowhere. So the refusal only
     names the field here, and this effect moves the focus when the inputs are live again, once. */
  useEffect(() => {
    if (pending || !focusField) return;
    focusFirstInvalid(boxRef.current, [focusField]);
    setFocusField(null);
  }, [focusField, pending]);

  const edit = (k: Key, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    // A verdict describes the SAVED words; once the officer types, it no longer describes this field.
    if (k !== "competition") setVerdicts((s) => ({ ...s, [k]: undefined }));
    // …and neither does a warning about them.
    if (k !== "competition") setWarnings((s) => ({ ...s, [k]: undefined }));
  };

  const save = () => {
    const send = moved;
    const shown = saved;
    start(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      for (const k of send) fd.set(k, values[k]);
      // What this page showed for each field it sends — the server refuses if another officer has changed it since.
      for (const k of send) fd.set(`expected.${k}`, shown[k]);
      const r = await runAdminAction(() => setMarketShortTitlesAction(fd));
      if (!r.ok) {
        // ⛔ The refusal is shown VERBATIM beside the field it names: it says what to change.
        if (r.field) {
          setErrors({ [r.field as Key]: r.error });
          setFocusField(r.field as Key);
        }
        toast({ title: "Couldn't save the card wording", description: r.error, variant: "danger" });
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
      // Each warning goes under the field it names, in the server's words.
      const fieldWarnings: Partial<Record<TitleKey, string[]>> = {};
      for (const { key, locale } of LANGS) {
        const said = r.warningLines[locale];
        if (said && said.length > 0) fieldWarnings[key] = said;
      }
      setWarnings(fieldWarnings);
      // The languages this save gave new words get the sentinel's fresh verdict; a language it did not touch keeps the
      // verdict it had (its words did not change), and one the officer typed into had its verdict cleared by `edit`.
      const lines: Partial<Record<TitleKey, Verdict>> = {};
      for (const { key, locale } of LANGS) {
        const line = r.sentinelLines[locale];
        if (line) lines[key] = line;
      }
      setVerdicts((prev) => ({ ...prev, ...lines }));
      if (r.sentinelReason) setSentinelReason(r.sentinelReason);
      if (!r.changed) {
        toast({ title: "Nothing to save", description: "The short titles and the competition are already these.", variant: "default" });
        return;
      }
      router.refresh();
      const needsLook = Object.values(lines).some((l) => l && l.kind !== "agrees") || Object.keys(fieldWarnings).length > 0;
      deferToast(
        !r.recorded
          ? { title: "Saved — but its audit record was not written", description: shortTitleAuditMissed("change"), variant: "warning" }
          : needsLook
            ? { title: "Card wording saved — read the notes under the fields", description: CARD_ONLY, variant: "warning" }
            : { title: "Card wording saved", description: CARD_ONLY, variant: "success" },
      );
    });
  };

  return (
    <div ref={boxRef} className="space-y-3">
      <h3 className="font-display font-semibold text-body-sm text-text">Card short titles</h3>
      <Callout tone="info" title={SHORT_TITLE_RULE_TITLE}>{SHORT_TITLE_RULE_BODY}</Callout>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {LANGS.map(({ key, locale, placeholder }) => {
          const n = codePoints(cleanShortTitle(locale, values[key]));
          const max = SHORT_TITLE_MAX[locale];
          const counterId = `stc-${uid}-${key}`;
          const warningId = `stc-${uid}-${key}-warning`;
          const verdictId = `stc-${uid}-${key}-sentinel`;
          const verdict = verdicts[key];
          const said = warnings[key] ?? [];
          const describedBy = [counterId, said.length > 0 ? warningId : null, verdict ? verdictId : null].filter(Boolean).join(" ");
          return (
            <Field key={key} label={SHORT_TITLE_LABEL[locale]} dataField={key} error={errors[key]}>
              <Input
                value={values[key]}
                onChange={(e) => edit(key, e.target.value)}
                disabled={pending || !mayAct}
                placeholder={placeholder}
                error={!!errors[key] || n > max}
                aria-describedby={describedBy}
              />
              <p id={counterId} className={`mt-1 font-mono text-body-sm tabular-nums ${n > max ? "text-danger-fg" : "text-text-subtle"}`}>
                {n} / {max}
              </p>
              {said.length > 0 && (
                <div id={warningId} role="status">
                  {said.map((w) => <p key={w} className="mt-1 text-body-sm text-warning-fg break-words">{w}</p>)}
                </div>
              )}
              {verdict && (
                <p id={verdictId} className={`mt-1 text-body-sm break-words ${VERDICT_INK[verdict.kind]}`}>
                  Sentinel check: {verdict.text}
                </p>
              )}
            </Field>
          );
        })}
      </div>
      {showReason && (
        <p role="status" className="text-body-sm text-text-tertiary break-words">Why the sentinel did not check them: {sentinelReason}</p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Field label="Competition" hint="Optional. Shown beside the category on the card." dataField="competition" error={errors.competition}>
          <Select
            ariaLabel="Competition"
            value={values.competition}
            onChange={(v) => edit("competition", v)}
            disabled={pending || !mayAct}
            options={competitionOptions(saved.competition)}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="md" onClick={save} loading={pending} disabled={!dirty || !mayAct} title={actReason}>
          Save card wording
        </Button>
      </div>

      <UnsavedChangesGuard
        dirty={dirty}
        body="The card short titles have been edited but not saved. Leaving now discards the edit."
      />
    </div>
  );
}
