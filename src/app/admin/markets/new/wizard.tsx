"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  criterionTranslationIssue, MIN_CRITERION_TRANSLATION,
  type CriterionTranslationIssue,
} from "@/lib/localized";
import { SteppedProgress } from "@/components/markets/stepped-progress";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { createMarketAction } from "@/app/markets/actions";
import { wallClockToUtcIso } from "@/lib/zoned-time";
// ⛔ The Vodacom plan S2: the SAME short-title rule `createMarketAction` refuses with — imported, never re-implemented.
import {
  HARD_ISSUES, SHORT_TITLE_MAX, cleanShortTitle, codePoints, normaliseShortTitleSet,
  type ShortTitleIssue,
} from "@/lib/markets/short-title";
import { COMPETITIONS, isCompetition } from "@/lib/markets/competitions";
import { competitionLabel } from "@/lib/markets/competition-label";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { dict, type Locale } from "@/lib/i18n-dict";

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const;

type ShortKey = "shortTitleEn" | "shortTitleSw" | "shortTitleZh";
const SHORT_FIELDS: ReadonlyArray<{ key: ShortKey; locale: Locale; label: string; placeholder: string }> = [
  { key: "shortTitleEn", locale: "en", label: "Short title (EN)", placeholder: "Will the TZS strengthen by month-end?" },
  { key: "shortTitleSw", locale: "sw", label: "Short title (SW)", placeholder: "Je, TZS itaimarika mwisho wa mwezi?" },
  { key: "shortTitleZh", locale: "zh", label: "Short title (ZH) · 中文", placeholder: "先令月底会走强吗？" },
];

/** The one list, with the dictionary's English labels (admin copy is English). Empty = no competition. */
const COMPETITION_OPTIONS = [
  { value: "", label: "None" },
  ...COMPETITIONS.map((c) => ({ value: c, label: competitionLabel(dict.en, c) })),
];

/**
 * What the officer is told about a short-title issue while typing. The RULE is the shared one; this is only its
 * wording on this screen (the criterion fields below do the same). `createMarketAction` refuses every hard issue in
 * its own words, so a value this screen lets through cannot be published as something else.
 */
function shortIssueText(locale: Locale, issue: ShortTitleIssue): string {
  switch (issue) {
    case "too_long":
      return `Too long for two lines on a card — keep it to ${SHORT_TITLE_MAX[locale]} characters.`;
    case "not_gsm7":
      return "It has a character a text message cannot carry. Use plain letters and punctuation.";
    case "form":
      return locale === "sw"
        ? "Write it as a question in the form “Je, …?”."
        : locale === "en"
          ? "Write it as a question ending in “?”."
          : "Write it as a question ending in ？.";
    // The rule compares on a key (case, spacing, curly quotes, the closing mark and a Swahili "Je, " do not hide a
    // copy), and a Chinese value with no Chinese character in it is refused the same way — so say what to do.
    case "copied_english":
      return locale === "zh"
        ? "This is not written in Chinese. Write it in Chinese, or leave it empty so the card shows the full question."
        : "This is the English text. Write it in Swahili, or leave it empty so the card shows the full question.";
    case "number_drift":
      return "It has a number the full question does not. Check it says the same thing.";
  }
}

type FeeInfo =
  | { model: "loser-share"; feePct: string; estMult: string; showEstimate: boolean }
  | { model: "capped-commission"; commissionPct: string; ceilingPct: string };

export function NewMarketWizard({ feeInfo, platformTz }: { feeInfo: FeeInfo; platformTz: string }) {
  const [step, setStep] = useState(0);
  const [titleEn, setTitleEn] = useState("");
  const [titleSw, setTitleSw] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("sports");
  const [sourceUrl, setSourceUrl] = useState("");
  const [resolutionAt, setResolutionAt] = useState("");
  const [criterion, setCriterion] = useState("");
  const [criterionSw, setCriterionSw] = useState("");
  const [criterionZh, setCriterionZh] = useState("");
  // The Vodacom plan S2 — optional. Empty means "no short title": the card shows the full question.
  const [shortInput, setShortInput] = useState<Record<ShortKey, string>>({ shortTitleEn: "", shortTitleSw: "", shortTitleZh: "" });
  const [competition, setCompetition] = useState("");
  /* A refusal from the server that names a field on step 1: shown beside it, and focused once the step is on screen. */
  const [serverField, setServerField] = useState<{ field: string; error: string } | null>(null);
  const focusRequest = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /* ⛔ CLEARED BEFORE THE REDIRECT. The success path calls router.push(), and although the
     guard intercepts anchor CLICKS rather than programmatic navigation, leaving `dirty` true
     through a redirect would keep the bar painted over the page the officer lands on. */
  const [published, setPublished] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  /**
   * What the officer is actually confirming: their wall clock, named with the zone it
   * will be read on, plus the UTC instant that gets stored. Display only — the binding
   * conversion happens server-side in `createMarketAction`, so this can never be the
   * thing that decides the money. If the two ever disagreed, they would both be visible.
   */
  const resolutionEcho = (() => {
    if (!resolutionAt) return "—";
    const iso = wallClockToUtcIso(resolutionAt, platformTz);
    if (!iso) return resolutionAt;
    const local = new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: platformTz, timeZoneName: "short",
    });
    // ⚠️ MINUTE PRECISION, AND IT IS A LEGIBILITY FIX FOUND BY LOOKING AT THE PAGE.
    // The full ISO (`…T11:30:00.000Z`) overflowed this row's measure and `break-all`
    // split it mid-token — `…T11:30:0` / `0.000Z` across two lines. An officer is
    // confirming the instant their poll's money settles; a timestamp broken through
    // the middle is the one thing on this screen that must read cleanly.
    // Nothing is lost: `datetime-local` only offers minutes, so the seconds are
    // always `:00` — this is the same instant, written to the precision it was typed.
    return `${local}   ·   stored as ${iso.replace(/:\d{2}\.\d{3}Z$/, "Z")}`;
  })();

  // ⛔ ONE POLICY, BOTH SIDES. `criterionTranslationIssue` is the SAME function
  // `createMarketAction` validates with — imported, not re-implemented. E-145 was
  // this exact shape from the other end: the proposal form enabled Submit on a
  // cutoff three hours later than the server's, so for a window every night it lit
  // up a value the server then refused. A client that accepts what the server
  // rejects is a defect even though the server wins.
  const swIssue = criterionTranslationIssue(criterionSw, criterion);
  const zhIssue = criterionTranslationIssue(criterionZh, criterion);
  const issueText = (i: CriterionTranslationIssue | null) =>
    i === "SAME_AS_ENGLISH"
      ? "This is the English text. Leave it blank — blank already shows the English and says so, and storing a copy makes “not translated” impossible to tell from “translated identically”."
      : i === "TOO_SHORT"
        ? `Too short to be a translation (minimum ${MIN_CRITERION_TRANSLATION} characters). Leave it blank instead.`
        : null;

  // ⛔ ONE POLICY, BOTH SIDES, for the short titles too: the rule `createMarketAction` refuses with, run as the
  // officer types, against the titles on this same step. A hard issue blocks Continue; a warning does not.
  const shorts = normaliseShortTitleSet({ titleEn, titleSw, titleZh, ...shortInput });
  const shortsHard = shorts.hard.en || shorts.hard.sw || shorts.hard.zh;
  const shortNote = (locale: Locale): { text: string; hard: boolean } | null => {
    const issues = shorts.issues[locale];
    const hard = issues.find((i) => HARD_ISSUES.has(i));
    if (hard) return { text: shortIssueText(locale, hard), hard: true };
    return issues.length ? { text: shortIssueText(locale, issues[0]), hard: false } : null;
  };

  /* The step that owns the field is rendered first; only then can the field be focused (§K rule 7d). */
  useEffect(() => {
    const field = focusRequest.current;
    if (!field || step !== 0) return;
    focusRequest.current = null;
    focusFirstInvalid(rootRef.current, [field]);
  }, [step, serverField]);

  const canNext = (() => {
    if (step === 0) return titleEn.length >= 10 && !shortsHard;
    if (step === 1) return /^https?:\/\//.test(sourceUrl) && resolutionAt;
    if (step === 2) return criterion.length >= 30 && !swIssue && !zhIssue;
    return true;
  })();

  const submit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("titleEn", titleEn);
      fd.set("titleSw", titleSw);
      fd.set("titleZh", titleZh);
      fd.set("category", category);
      fd.set("sourceUrl", sourceUrl);
      // ⛔ SENT RAW, ON PURPOSE. This is a bare wall clock with no zone; the server
      // reads it on the PLATFORM's clock (createMarketAction → toUtcIso). It used to
      // be `new Date(resolutionAt).toISOString()` here, which resolved it on the
      // officer's laptop — so the poll resolved at an instant their machine's
      // settings chose, not the one they confirmed on the review step.
      fd.set("resolutionAt", resolutionAt);
      fd.set("resolutionCriterion", criterion);
      fd.set("resolutionCriterionSw", criterionSw);
      fd.set("resolutionCriterionZh", criterionZh);
      fd.set("shortTitleEn", shortInput.shortTitleEn);
      fd.set("shortTitleSw", shortInput.shortTitleSw);
      fd.set("shortTitleZh", shortInput.shortTitleZh);
      fd.set("competition", competition);
      const r = await createMarketAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't create", description: r.error, variant: "danger" });
        // A short-title or competition refusal names its field: go back to the step that holds it, and focus it.
        if ("field" in r && r.field) {
          focusRequest.current = r.field;
          setServerField({ field: r.field, error: r.error });
          setStep(0);
        }
      } else {
        setPublished(true);
        toast({ title: "Market published", description: titleEn.slice(0, 50), variant: "success" });
        router.push("/admin/markets");
      }
    });
  };

  /**
   * ⭐ THE WIZARD IS WHERE LOSING WORK HURTS MOST, so `dirty` is spelled out rather than
   * approximated: four steps, trilingual titles and a resolution criterion of at least 30
   * characters. Losing it means retyping the whole thing in three languages.
   * ⛔ It is a comparison against the INITIAL values, not a `touched` flag — clearing a field
   * back to empty stops being dirty, and `category` counts because "sports" is a default the
   * officer may have deliberately changed and not yet saved.
   * ⛔ NO BAR HERE, ONLY THE GUARD. The wizard already owns its own Back/Next/Publish footer;
   * a second, fixed action bar would put two Publish affordances on one screen — and §K5 is
   * about not forking a recipe, which a duplicate primary action plainly does.
   */
  const dirty = !published && (
    titleEn !== "" || titleSw !== "" || titleZh !== "" ||
    sourceUrl !== "" || resolutionAt !== "" ||
    criterion !== "" || criterionSw !== "" || criterionZh !== "" ||
    shortInput.shortTitleEn !== "" || shortInput.shortTitleSw !== "" || shortInput.shortTitleZh !== "" ||
    competition !== "" ||
    category !== "sports"
  );

  const editShort = (key: ShortKey, v: string) => {
    setShortInput((s) => ({ ...s, [key]: v }));
    if (serverField?.field === key) setServerField(null);
  };

  return (
    <div ref={rootRef} className="space-y-6">
      <UnsavedChangesGuard
        dirty={dirty}
        body="This market has been part-written and not published. Leaving now discards every step, including the Swahili and Chinese text."
      />
      <SteppedProgress steps={4} current={step} />
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
        Step {step + 1} / 4
      </p>

      {/* What this market WILL freeze at creation (read-only). Change it at
          /admin/config → Fee model. A poll settles by the model it was created under. */}
      <div className="rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-[11.5px] text-text-muted">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">Fee model frozen at creation</span>
        {feeInfo.model === "loser-share" ? (
          <p className="mt-1">
            <strong className="text-text">Loser-share</strong> — fee = <strong className="text-text">{feeInfo.feePct}%</strong> of the losing pool.
            {feeInfo.showEstimate
              ? <> Players see a fixed <strong className="text-text">{feeInfo.estMult}×</strong> &ldquo;possible winnings&rdquo; estimate before betting.</>
              : <> The pre-bet estimate is hidden.</>}
          </p>
        ) : (
          <p className="mt-1">
            <strong className="text-text">Capped commission</strong> — fee = min({feeInfo.commissionPct}% of pool, {feeInfo.ceilingPct}% of the smaller side). No pre-bet estimate shown.
          </p>
        )}
      </div>

      {step === 0 && (
        <Section title="Question" sw="Swali">
          <Field label="Title (EN)" hint="≥10 chars. Phrase it so YES/NO answers are unambiguous.">
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} disabled={pending} placeholder="Will the TZS strengthen against the USD by month-end?" />
          </Field>
          <Field label="Title (SW)" hint="Optional Swahili translation.">
            <Input value={titleSw} onChange={(e) => setTitleSw(e.target.value)} disabled={pending} placeholder="Je, TZS itaimarika dhidi ya USD?" />
          </Field>
          <Field label="Title (ZH) · Chinese / 中文" hint="Optional Chinese translation.">
            <Input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} disabled={pending} placeholder="坦桑尼亚先令会在月底前对美元走强吗？" />
          </Field>
          {/* ⭐ The Vodacom plan S2 — the card's short question, OPTIONAL in every language. Empty is honest: the card
              shows the full question. The counters read the one budget (`SHORT_TITLE_MAX`), in code points of the
              value that will be stored, and the notes below each field come from the rule the server refuses with. */}
          <p className="text-body-sm text-text-muted">
            Cards show the short question instead of the full one. The full question, the criterion and the source stay unchanged on the market page — the short title must say exactly the same thing.
          </p>
          {SHORT_FIELDS.map(({ key, locale, label, placeholder }) => {
            const n = codePoints(cleanShortTitle(locale, shortInput[key]));
            const max = SHORT_TITLE_MAX[locale];
            const note = shortNote(locale);
            const refused = serverField?.field === key ? serverField.error : null;
            return (
              <Field key={key} label={label} dataField={key}>
                <Input value={shortInput[key]} onChange={(e) => editShort(key, e.target.value)} disabled={pending}
                  placeholder={placeholder} error={!!refused || !!note?.hard} />
                <p className={`mt-1 text-body-sm tabular-nums ${n > max ? "text-danger-fg" : "text-text-subtle"}`}>
                  {n} / {max} · optional
                </p>
                {refused
                  ? <p role="alert" className="mt-1.5 text-body-sm leading-snug text-no-300">{refused}</p>
                  : note && (
                    <p role={note.hard ? "alert" : undefined} className={`mt-1.5 text-body-sm leading-snug ${note.hard ? "text-no-300" : "text-warning-fg"}`}>
                      {note.text}
                    </p>
                  )}
              </Field>
            );
          })}
          <Field label="Category">
            <Select value={category} onChange={(v) => setCategory(v as typeof CATEGORIES[number])}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Competition" hint="Optional. Shown beside the category on the card." dataField="competition">
            <Select ariaLabel="Competition" value={competition}
              onChange={(v) => { setCompetition(v); if (serverField?.field === "competition") setServerField(null); }}
              options={COMPETITION_OPTIONS} />
            {serverField?.field === "competition" && (
              <p role="alert" className="mt-1.5 text-body-sm leading-snug text-no-300">{serverField.error}</p>
            )}
          </Field>
        </Section>
      )}

      {step === 1 && (
        <Section title="Resolution source" sw="Chanzo cha utatuzi">
          <Field label="Public source URL" hint="Officers + players resolve against this URL. Must be reachable and authoritative.">
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} disabled={pending} placeholder="https://www.bot.go.tz/exchangerates" />
          </Field>
          <Field label="Resolution timestamp" hint="When stage-1 officer can begin reviewing.">
            <Input type="datetime-local" value={resolutionAt} onChange={(e) => setResolutionAt(e.target.value)} disabled={pending} mono />
          </Field>
        </Section>
      )}

      {step === 2 && (
        <Section title="Resolution criterion" sw="Kigezo cha utatuzi">
          {/* ⚠️ The kit `Textarea`, not a hand-rolled one. Its docstring records that it
              "replaces 3 hand-rolled textareas that drifted on background, padding and
              font size" — this wizard held a FOURTH that the cleanup missed, on
              `bg-[var(--bg-inset)] px-3 py-2.5 text-[14px]` against the atom's
              `bg-bg-inset px-3.5 py-2.5 text-[16px]`. ⭐ The 16px matters: under 16px
              iOS Safari zooms the viewport on focus, so the officer typing the legal
              text of a money contract got the page jumping under them. */}
          <Field label="Written criterion (EN)" hint="≥30 chars. Be precise — this is the legal text resolvers and players will rely on. ENGLISH IS BINDING: officers resolve against this text, and it is what the player is told decides the outcome.">
            <Textarea value={criterion} onChange={(e) => setCriterion(e.target.value)} disabled={pending} rows={6}
              placeholder="Resolves YES if the BoT mid-rate on the last business day…" />
          </Field>
          {/* ⭐ F6b · COLLECTED HERE BECAUSE THIS IS THE SENTENCE THE PAYOUT TURNS ON.
              A player who cannot read it cannot check that the rule which took their
              stake is the rule they agreed to. Both are OPTIONAL — a poll with no
              translation renders the English and TELLS the player so, which is honest;
              what is not honest is English printed silently under a Swahili heading. */}
          <Field label="Criterion (SW) · Swahili" hint="Optional. Leave blank if you have no translation — the player is shown the English with a note saying why, which is better than a bad translation of the rule that decides their money.">
            <Textarea value={criterionSw} onChange={(e) => setCriterionSw(e.target.value)} disabled={pending} rows={5}
              aria-invalid={!!swIssue || undefined} className={swIssue ? "border-no-700" : undefined}
              placeholder="Inatatuliwa NDIYO iwapo kiwango cha katikati cha BoT…" />
            {swIssue && <p role="alert" className="mt-1.5 text-body-sm leading-snug text-no-300">{issueText(swIssue)}</p>}
          </Field>
          <Field label="Criterion (ZH) · Chinese / 中文" hint="Optional. Same rule as Swahili — blank is honest, a copy of the English is not.">
            <Textarea value={criterionZh} onChange={(e) => setCriterionZh(e.target.value)} disabled={pending} rows={5}
              aria-invalid={!!zhIssue || undefined} className={zhIssue ? "border-no-700" : undefined}
              placeholder="若坦桑尼亚银行最后一个营业日的中间价…" />
            {zhIssue && <p role="alert" className="mt-1.5 text-body-sm leading-snug text-no-300">{issueText(zhIssue)}</p>}
          </Field>
        </Section>
      )}

      {step === 3 && (
        <Section title="Review + publish" sw="Chunguza · chapisha">
          <div className="rounded-md border border-border bg-bg-overlay p-4 space-y-2 text-[13px]">
            <Row label="Title (EN)" value={titleEn} />
            <Row label="Title (SW)" value={titleSw || "—"} mono />
            <Row label="Title (ZH)" value={titleZh || "—"} mono />
            <Row label="Category"   value={category} />
            <Row label="Competition" value={isCompetition(competition) ? competitionLabel(dict.en, competition) : "—"} />
            {/* S2 · "— none" says what the card will do, so leaving one empty is a decision, not an omission. */}
            {SHORT_FIELDS.map(({ key, locale, label }) => (
              <Row key={key} label={label} value={cleanShortTitle(locale, shortInput[key]) || "— none · the card shows the full question"} />
            ))}
            <Row label="Source URL" value={sourceUrl} mono />
            {/* ⛔ THE ECHO NAMES ITS ZONE, AND SHOWS THE INSTANT THAT WILL BE STORED.
                This row used to print the raw `datetime-local` string — `2026-08-15T14:30`,
                which is the one value in the whole flow that CANNOT be checked, because it
                does not say which clock it was read off. An officer confirming a poll is
                confirming the moment its money settles; they have to be able to see it. */}
            <Row label="Resolves at" value={resolutionEcho} mono />
            <Row label="Criterion (EN)" value={criterion} />
            {/* ⭐ "— none, shows English" rather than an empty dash. A blank cell reads
                as "I forgot to look"; this says what the player will actually get, so
                publishing without a translation is a decision rather than an omission. */}
            <Row label="Criterion (SW)" value={criterionSw || "— none · players see the English, with a note saying so"} />
            <Row label="Criterion (ZH)" value={criterionZh || "— none · players see the English, with a note saying so"} />
          </div>
        </Section>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <Button
          variant="ghost"
          size="md"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canNext}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            disabled={pending}
            loading={pending}
          >
            {pending ? "Publishing…" : "Publish market"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({ title, sw, children }: { title: string; sw: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-[18px] font-semibold text-text">{title}</h3>
      <p className="text-body-sm italic text-text-subtle mb-4">{sw}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, dataField }: { label: string; hint?: string; children: React.ReactNode; dataField?: string }) {
  return (
    <label className="block" data-field={dataField}>
      <span className="block font-mono text-micro uppercase eyebrow font-semibold text-text-muted mb-1.5">{label}</span>
      {children}
      {hint && <p className="mt-1 text-body-sm text-text-subtle">{hint}</p>}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle w-32 shrink-0">{label}</span>
      <span className={`flex-1 ${mono ? "font-mono text-[12px] break-all" : "text-[13px]"} text-text`}>{value}</span>
    </div>
  );
}
