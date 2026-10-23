import { fillSupportScript, type SupportFigures, type SupportScript } from "@/lib/maswali-support-scripts";

/**
 * One desk script (MASWALI-BUILD S6; MB-64, MB-86, MB-91): what the desk does first, then what it says in each language,
 * every figure filled in where it is read (`fillSupportScript`). Shared by the page's list and the lookup's answer, so
 * the two can never word one script two ways. No hooks: it renders on the server page and inside the client form alike.
 */
export function ScriptBlock({ script, figures }: { script: SupportScript; figures: SupportFigures }) {
  return (
    <section className="space-y-2" aria-label={script.title}>
      <h3 className="font-semibold text-body">{script.title}</h3>
      <ol className="list-decimal space-y-1 pl-5 text-body-sm text-text-secondary">
        {script.steps.map((step, i) => <li key={i}>{step}</li>)}
      </ol>
      <div className="grid gap-3 md:grid-cols-2">
        <div lang="en" className="rounded-md border border-border-subtle p-3">
          <p className="mb-1 font-mono text-micro uppercase eyebrow text-text-tertiary">English</p>
          <p className="text-body-sm">{fillSupportScript(script.en, "en", figures)}</p>
        </div>
        <div lang="sw" className="rounded-md border border-border-subtle p-3">
          <p className="mb-1 font-mono text-micro uppercase eyebrow text-text-tertiary">Kiswahili</p>
          <p className="text-body-sm">{fillSupportScript(script.sw, "sw", figures)}</p>
        </div>
      </div>
    </section>
  );
}
