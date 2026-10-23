/**
 * The Millionea rules READ — every field in the form's own groups and words (`rules-form.ts`, one label list): the rules
 * for the next week as any role but the Owner reads them on /admin/maswali, and the rules a week froze on its own page
 * (S6-ADMIN, the lead's ruling G2). ⛔ A value that cannot be read is printed "Cannot be read" — the console's one word for
 * a missing figure — never 0 and never blank.
 */
import { RULES_FIELDS, RULES_GROUPS, rulesValueText, type RulesFieldKey } from "./rules-form";

export const RULE_CANNOT_BE_READ = "Cannot be read";

export function RulesRead({ values, policies, groups = RULES_GROUPS }: {
  values: Partial<Record<RulesFieldKey, string>>;
  policies: ReadonlyArray<{ value: string; label: string }>;
  groups?: ReadonlyArray<{ id: string; title: string }>;
}) {
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <section key={g.id} className="space-y-2">
          <h3 className="font-semibold text-body">{g.title}</h3>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RULES_FIELDS.filter((f) => f.group === g.id && values[f.key] !== undefined).map((f) => {
              const value = values[f.key] ?? "";
              return (
                <div key={f.key} data-rule={f.key}>
                  <dt className="text-body-sm text-text-secondary">{f.label}</dt>
                  <dd className="text-body tabular">{value === "" ? RULE_CANNOT_BE_READ : rulesValueText(f.key, value, policies)}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
