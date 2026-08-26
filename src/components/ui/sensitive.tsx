/**
 * <Sensitive> — THE ONE PLACE A READ CELL IS RESOLVED (docs/READ-TIERS.md §3.3, §6).
 *
 * A SERVER component. It decides, from the matrix, whether the viewer gets nothing, the masked
 * form, or the masked form plus a reveal — and it is the only component in `src/` allowed to
 * import the resolver. `test:read-tiers` 4.4 enforces that: §6 says "if the ANSWER to 'can
 * support see X?' ever lives in a .tsx file, the matrix has stopped being the authority."
 * ⚠️ Naming WHICH class a field belongs to is a classification, not an answer, and belongs at
 * the call site — that is what the `field` prop is.
 *
 * ⭐ THE RAW VALUE NEVER REACHES THE CLIENT AT REST. This renders the masked string only; a
 * reveal is a server round trip that re-reads the value and writes an audit row (D4). §5.4 asks
 * the suite to assert the raw value is absent from the server's HTML rather than merely
 * invisible in the box, and this is the shape that makes that true instead of merely tested.
 *
 * ⛔ AND IT COMPOSES BY INTERSECTION, NEVER BY UNION (§1a). `domainAllows` is the caller's
 * existing domain gate. READ_TIERS may only ever SUBTRACT (§2.2): a `masked` cell is NOT
 * permission to render a masked value on a surface the domain would have hidden entirely. The
 * default is `true` because most call sites sit inside a block the domain has already gated —
 * pass it explicitly wherever the field is NOT already behind one.
 */
import { readCell } from "@/lib/server/rbac";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { SENSITIVE_FIELDS, type SensitiveFieldKey } from "@/lib/server/sensitive-fields";
import { SensitiveReveal } from "./sensitive-reveal";

export async function Sensitive({
  field,
  subjectId,
  value,
  domainAllows = true,
}: {
  field: SensitiveFieldKey;
  /** The player whose record this is — the reveal action re-reads by this id. */
  subjectId: string;
  /** The raw value, SERVER-SIDE ONLY. Used to compute the mask; never forwarded to the client. */
  value: string | null | undefined;
  /** The caller's existing domain gate. See the intersection rule above. */
  domainAllows?: boolean;
}) {
  if (!domainAllows) return null;
  if (value == null || value === "") return null;

  const session = await currentSession();
  const role = session ? (await db.user.findById(session.userId))?.role : null;
  // ⛔ No session, no role, no read. Fails closed, like the resolver it calls.
  if (!role) return null;

  const spec = SENSITIVE_FIELDS[field];
  const cell = await readCell(role, spec.readClass);
  if (cell === "none") return null;

  const masked = spec.mask(value);

  // The ceiling: masked, and no control to go further. ⭐ The refusal is the ABSENCE of the
  // reveal, which is why it cannot be reached by a modified client either — there is no request
  // for one to forge, and the action re-checks the same matrix regardless.
  if (cell === "masked") {
    return <span className="font-mono text-caption text-text-tertiary">{masked}</span>;
  }

  return (
    <SensitiveReveal field={field} subjectId={subjectId} masked={masked} label={spec.label} />
  );
}
