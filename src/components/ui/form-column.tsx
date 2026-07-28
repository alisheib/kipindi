import { cn } from "@/lib/utils";

/**
 * FormColumn — sets the measure for the fields inside it.   DESIGN_AUTHORITY B7
 *
 * The problem this solves: the `Input` atom has a height, a radius, a border and a
 * background — and no width rule at all. `size` controls height only. So every field
 * was exactly as wide as whatever container it landed in. On a 640px form page that
 * reads fine; on the 1080px profile pages it was already too wide; and inside the
 * admin console (which had no cap at all until B7) `/admin/markets/new` rendered a
 * single-column form with ~1,650px-wide text boxes at 1920. That is the "input fields
 * are too wide" half of the original report.
 *
 * Why a wrapper and not a cap on the atom itself:
 *
 *   A blanket `max-width` on `Input` would not break anything visually — max-width
 *   only stops growth — but it WOULD leave dead space in the ~13 admin filter
 *   toolbars where the field is `flex-1` and is SUPPOSED to fill its row. Silent
 *   asymmetry across every toolbar is a worse defect than the one being fixed.
 *
 * Why not derive it from the page tier:
 *
 *   Tempting, because it would cascade for free. But wrong: a form sitting on a
 *   1600px console page still wants ~460px fields. The measure is a property of the
 *   FORM COLUMN, not of the page.
 *
 * Mechanism: this sets `--field-max`, which `.field-measure` on each field atom
 * reads. The variable defaults to `none` in globals.css, so adding the class to an
 * atom changed nothing anywhere until a column opts in — the migration was a no-op
 * by construction.
 *
 * Only needed where a form sits on a tier WIDER than itself. The 12 player pages
 * already on the 640 form tier need nothing.
 */
export function FormColumn({
  measure = "field",
  className,
  children,
}: {
  /**
   * `field` — one control's measure (~460px). Right for a stacked single-column
   *           form of short values (an amount, a phone number, a rate).
   * `form`  — the form tier (640px). Right for sentence-length inputs, or for a
   *           two-up grid where each cell then lands around 310px.
   * `full`  — opt OUT. For a wide config table or grid that legitimately wants the
   *           whole column.
   */
  measure?: "field" | "form" | "full";
  className?: string;
  children: React.ReactNode;
}) {
  const value =
    measure === "full" ? "none" : measure === "form" ? "var(--w-form)" : "var(--w-field)";
  return (
    <div
      data-field-measure={measure}
      // Caps BOTH the column and the fields inside it. Capping only the fields was
      // not enough: /admin/config lays its rates out as a two-column grid, so on
      // the 1600px console each cell was ~780px and a "10.0" percentage sat in a
      // 780px box. Bounding the column makes each cell ~310px, which is what the
      // grid was designed for. Fields still read `--field-max` so a single-column
      // form inside a wider column is capped too.
      style={{ "--field-max": value, maxWidth: value === "none" ? undefined : value } as React.CSSProperties}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
