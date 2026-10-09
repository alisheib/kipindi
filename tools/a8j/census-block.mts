type DialogRow = {
  file: string; line: number; kind: string; component: string | null;
  submits: boolean; created: boolean; guarded: boolean; late: string[];
  actions: string[]; actionKeys: string[]; imported: string[]; unreadImports: string[]; why: string | null;
};
type FormRow = { file: string; line: number; component: string; reaches: string[]; why: string | null; asks: (opener: string) => string | null };
/** A `<form action={X}>` anywhere in src/ whose X is a server action: the cross-file host shape (4.3). */
type ActionForm = { file: string; line: number; component: string; key: string; name: string; attr: string };
type Found = { dialogs: DialogRow[]; forms: FormRow[]; actionForms: ActionForm[] };
type Census = { files: number } & Found;
function censusOfFile(rel: string, code: string, env: Env): Found {
  const sf = parse(rel, code);
  const ctx: Ctx = { sf, rel, env };
  const tags: Tag[] = [];
  walkTree(sf, (n) => { if (isTag(n)) tags.push(n); });
  const dialogs: DialogRow[] = [];
  /** What the confirms of this file confirm: their local functions, and the server actions those call themselves. */
  const targets = new Set<Fn>();
  const actionTargets = new Set<string>();
  for (const t of tags) {
    const kind = t.tagName.getText(sf);
    if (kind !== "ConfirmDialog" && kind !== "ConfirmModal") continue;
    const r = resolveHandler(attrExpr(attrOf(t, "onConfirm")), sf);
    let submits = false;
    let created = false;
    const late: string[] = [];
    const actions = new Map<string, string>();
    const imported = new Map<string, string>();
    for (const rr of r.runs) {
      for (const [k, v] of reach(rr.fn, ctx).imported) imported.set(k, v);
      const tgs = targetsOf(rr, ctx);
      for (const f of tgs) targets.add(f);
      for (const f of [rr.fn, ...tgs]) for (const [k, v] of directActions(f, ctx)) { actions.set(k, v); actionTargets.add(k); }
      for (const s of submitSites(rr.fn, ctx)) {
        if (s.created) { created = true; continue; }
        submits = true;
        if (s.late !== null) late.push(`${s.where}, ${s.how} ${s.late}`);
      }
    }
    // ⛔ (A8j review) Every imported function the confirm calls is READ ONE HOP DEEP (above, by submitSites). One the census
    // cannot read that way may submit a form on the confirm's behalf, unseen: the confirm is UNREAD unless IMPORTED_READ
    // names that function with the reason it submits nothing.
    const unreadImports: string[] = [];
    const unread: string[] = [];
    for (const [key, shown] of imported) {
      const at = key.indexOf("@");
      const hop = readImported(key.slice(0, at), key.slice(at + 1), env);
      if (hop.fn !== null) continue;
      unreadImports.push(key);
      if (!Object.hasOwn(IMPORTED_READ, key)) unread.push(`${shown} (${key}: ${hop.why})`);
    }
    const why = r.why ?? (unread.length > 0
      ? `it calls ${unread.join("; ")}, which this census cannot read one hop deep — read it, and if it submits no form, name it in IMPORTED_READ with that reason`
      : null);
    dialogs.push({ file: rel, line: lineOf(sf, t), kind, component: componentOf(t), submits, created, guarded: isOn(attrOf(t, "submitsForm")),
      late, actions: [...actions.values()], actionKeys: [...actions.keys()], imported: [...imported.keys()], unreadImports, why });
  }
  /** Whether a call reaches what a confirm of this file confirms: the call itself, or a function it hands on. */
  const saves = (c: ts.CallExpression): boolean => {
    for (const x of [c.expression, ...c.arguments]) {
      const k = calleeOf(x, ctx);
      if (k.kind === "action" && actionTargets.has(k.key)) return true;
      if (k.kind === "local") {
        const got = reach(k.fn, ctx);
        if ([...got.fns].some((f) => targets.has(f)) || [...got.actions.keys()].some((a) => actionTargets.has(a))) return true;
      }
    }
    return false;
  };
  const forms: FormRow[] = [];
  const actionForms: ActionForm[] = [];
  for (const t of tags) {
    if (t.tagName.getText(sf) !== "form") continue;
    // ⭐ `action={…}` is read the same way as onSubmit: an imported server action is the commit itself; a local function
    // or an arrow is what the submit runs; any other import is a function this census does not read, and says so.
    const actAttr = attrOf(t, "action");
    const act = attrExpr(actAttr);
    const actFn = act && !ts.isStringLiteral(strip(act)) && !ts.isNoSubstitutionTemplateLiteral(strip(act)) ? calleeOf(act, ctx) : null;
    // Every form in src/ whose action is a server action is written down, whether or not its file draws a confirm.
    if (actFn?.kind === "action") {
      actionForms.push({ file: rel, line: lineOf(sf, t), component: componentOf(t) ?? "(unnamed)", key: actFn.key, name: actFn.name, attr: actAttr!.initializer!.getText(sf) });
    }
    if (dialogs.length === 0) continue;
    const handlers: ts.Expression[] = [];
    const direct = new Map<string, string>();
    let why = null as string | null;
    const on = attrExpr(attrOf(t, "onSubmit"));
    if (on) handlers.push(on);
    if (act && actFn) {
      if (actFn.kind === "action") direct.set(actFn.key, actFn.name);
      else if (actFn.kind === "imported") why = `the form's action ${actFn.name} is a function of ${actFn.module} this census does not read`;
      else handlers.push(act);
    }
    if (handlers.length === 0 && direct.size === 0 && why === null) continue;
    const runs: Run[] = [];
    for (const h of handlers) {
      const r = resolveHandler(h, sf);
      runs.push(...r.runs);
      if (r.why) why = r.why;
    }
    const hits = new Set<string>();
    for (const rr of runs) {
      const got = reach(rr.fn, ctx);
      for (const f of got.fns) if (targets.has(f)) hits.add(fnName(f));
      for (const [k, v] of got.actions) if (actionTargets.has(k)) hits.add(v);
    }
    for (const [k, v] of direct) if (actionTargets.has(k)) hits.add(v);
    forms.push({ file: rel, line: lineOf(sf, t), component: componentOf(t) ?? "(unnamed)", reaches: [...hits], why,
      asks: (opener) => asksFirst(runs, opener, ctx, saves) });
  }
  return { dialogs, forms, actionForms };
}
const readOr = (w: World, rel: string): string | null => { try { return w.read(rel); } catch { return null; } };
const realCensus = new Map<string, { code: string; deps: Map<string, string | null>; found: Found }>();
/** The census over all of `src/`, reusing each file's result while its text, and the text of every module it read for
 *  it (a server action's module, an imported function's), are the ones already read. */
function census(w: World): Census {
  const out: Census = { files: 0, dialogs: [], forms: [], actionForms: [] };
  for (const rel of POPULATION) {
    const code = w.read(rel);
    if (!code.includes("<ConfirmDialog") && !code.includes("<ConfirmModal") && !code.includes("<form")) continue;
    out.files++;
    let hit = realCensus.get(rel);
    if (!hit || hit.code !== code || [...hit.deps].some(([dep, text]) => readOr(w, dep) !== text)) {
      const deps = new Map<string, string | null>();
      hit = { code, deps, found: censusOfFile(rel, code, tracking(envOf(w), deps)) };
      if (w === REAL) realCensus.set(rel, hit);
    }
    out.dialogs.push(...hit.found.dialogs);
    out.forms.push(...hit.found.forms);
    out.actionForms.push(...hit.found.actionForms);
  }
  return out;
}

