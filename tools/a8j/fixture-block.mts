/** A src/ tree of its own for the fixtures: a "use server" module, a helper module, and a barrel that re-exports. */
const FIXTURE = "src/fixture/fixture.tsx";
const FIXTURE_MODULES: Record<string, string> = {
  "src/fixture/actions.ts": [QUOTE + "use server" + QUOTE + ";",
    "export async function saveAction(fd) { return fd; }",
    "export async function dropAction(fd) { return fd; }",
    "export async function keepAction(fd) { return fd; }"].join(NL),
  "src/fixture/helpers.ts": [
    "export function submitClosestForm(el) { el.closest(" + QUOTE + "form" + QUOTE + ")?.requestSubmit(); }",
    "export async function submitLater(el) { await Promise.resolve(); el.requestSubmit(); }",
    "export const tidy = (s) => s.trim();"].join(NL),
  "src/fixture/barrel.ts": "export { submitClosestForm as relay } from " + QUOTE + "./helpers" + QUOTE + ";",
};
const FIXTURE_ENV: Env = {
  read: (rel) => { const t = FIXTURE_MODULES[rel]; if (t === undefined) throw new Error(`no fixture module ${rel}`); return t; },
  has: (rel) => Object.hasOwn(FIXTURE_MODULES, rel),
};
/** The census run over shapes it must tell apart, so its own discrimination is proven, not assumed. */
function fixtureCensus(): { pass: boolean; detail: string } {
  const src = [
    'import { saveAction, dropAction, keepAction } from "./actions";',
    'import { submitClosestForm, submitLater, tidy } from "@/fixture/helpers";',
    'import { relay } from "@/fixture/barrel";',
    'function Named() { const formRef = useRef(null); const go = () => formRef.current?.requestSubmit(); return <form ref={formRef}><ConfirmDialog onConfirm={go} trigger={<button />} title="" body="" /></form>; }',
    'function Made() { return <ConfirmDialog onConfirm={() => { const f = document.createElement("form"); f.submit(); }} trigger={<button />} title="" body="" />; }',
    'function Wrap({ onConfirm }) { return <ConfirmModal open onClose={() => {}} onConfirm={onConfirm} title="" body="" />; }',
    'function Host() { const ref = useRef(null); return <Wrap onConfirm={() => ref.current?.submit()} />; }',
    'function Quiet() { const go = () => {}; return <ConfirmDialog onConfirm={go} trigger={<button />} title="" body="" />; }',
    'function Unread({ handlers }) { return <ConfirmDialog onConfirm={handlers.go} trigger={<button />} title="" body="" />; }',
    'function Clicker() { const saveRef = useRef(null); return <form><Button ref={saveRef}>Save</Button><ConfirmDialog onConfirm={() => saveRef.current?.click()} trigger={<button />} title="" body="" /></form>; }',
    'function Plain() { const r = useRef(null); return <><button ref={r} type="button" /><ConfirmDialog onConfirm={() => r.current?.click()} trigger={<button />} title="" body="" /></>; }',
    'function Dispatcher() { const f = useRef(null); return <form ref={f}><ConfirmDialog onConfirm={() => f.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))} trigger={<button />} title="" body="" /></form>; }',
    'function Prompt() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => { f.current?.requestSubmit(); }} trigger={<button />} title="" body="" /></form>; }',
    'function Later() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => { Promise.resolve().then(() => f.current?.requestSubmit()); }} trigger={<button />} title="" body="" /></form>; }',
    'function Awaits() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={async () => { await check(); f.current?.requestSubmit(); }} trigger={<button />} title="" body="" /></form>; }',
    'function Handed() { const f = useRef(null); const go = () => f.current?.requestSubmit(); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => setTimeout(go, 0)} trigger={<button />} title="" body="" /></form>; }',
    'function Direct() { const run = () => saveAction(new FormData()); const onSubmit = (e) => { e.preventDefault(); saveAction(new FormData(e.currentTarget)); }; return <form onSubmit={onSubmit}><ConfirmModal open onClose={() => {}} onConfirm={run} title="" body="" /></form>; }',
    'function ActionForm() { return <form action={dropAction}><ConfirmDialog onConfirm={() => dropAction(new FormData())} trigger={<button />} title="" body="" /></form>; }',
    'function Other() { const onSubmit = (e) => { e.preventDefault(); keepAction(new FormData()); }; return <form onSubmit={onSubmit} />; }',
    'function Helped() { const b = useRef(null); return <ConfirmDialog onConfirm={() => submitClosestForm(b.current)} trigger={<button ref={b} />} title="" body="" />; }',
    'function HelpedLate() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => submitLater(f.current)} trigger={<button />} title="" body="" /></form>; }',
    'function Relayed() { const b = useRef(null); return <ConfirmDialog onConfirm={() => relay(b.current)} trigger={<button ref={b} />} title="" body="" />; }',
    'function Tidy() { return <ConfirmDialog onConfirm={() => { tidy(" x "); }} trigger={<button />} title="" body="" />; }',
    'function NamedHides() { const [open, setOpen] = useState(false); const runIt = () => {}; const confirmRun = () => { setOpen(false); runIt(); }; const onSubmit = (e) => { e.preventDefault(); runIt(); }; return <form onSubmit={onSubmit}><ConfirmModal open={open} onClose={() => {}} onConfirm={confirmRun} title="" body="" /></form>; }',
    'function Inverse({ changed }) { const [fd, setAsk] = useState(null); const save = (x) => saveAction(x); const onSubmit = (e) => { e.preventDefault(); const f = new FormData(); if (!changed) { save(f); return; } setAsk(f); }; return <form onSubmit={onSubmit}><ConfirmModal open onClose={() => {}} onConfirm={() => save(fd)} title="" body="" /></form>; }',
    'function Leaky({ changed }) { const [fd, setAsk] = useState(null); const store = (x) => dropAction(x); const onSubmit = (e) => { e.preventDefault(); const f = new FormData(); if (changed) { setAsk(f); } store(f); }; return <form onSubmit={onSubmit}><ConfirmModal open onClose={() => {}} onConfirm={() => store(fd)} title="" body="" /></form>; }',
  ].join(NL);
  const r = censusOfFile(FIXTURE, src, FIXTURE_ENV);
  const d = (name: string) => r.dialogs.find((x) => x.component === name);
  const f = (name: string) => r.forms.find((x) => x.component === name);
  const expect: [string, boolean][] = [
    ["a submit through a named local is found", !!d("Named")?.submits && d("Named")?.why === null],
    ["a form the confirm made itself is not one to guard", !!d("Made") && !d("Made")!.submits && d("Made")!.created],
    ["a submit through a wrapper's prop is found", d("Wrap")?.kind === "ConfirmModal" && !!d("Wrap")?.submits && d("Wrap")?.why === null],
    ["a same-named handler in another component is not mistaken for it", !!d("Quiet") && !d("Quiet")!.submits && d("Quiet")!.why === null],
    ["a handler it cannot read is reported, never passed", !!d("Unread")?.why],
    ["a click on a ref'd button of no type (a submit button) submits", !!d("Clicker")?.submits],
    ["a click on a type=button control does not", !!d("Plain") && !d("Plain")!.submits],
    ["a submit event dispatched by hand submits", !!d("Dispatcher")?.submits],
    ["a submit in the confirm's own turn is in time", !!d("Prompt")?.submits && d("Prompt")?.late.length === 0],
    ["a submit in a .then is late", !!d("Later")?.submits && (d("Later")?.late.length ?? 0) > 0],
    ["a submit after an await is late", !!d("Awaits")?.submits && (d("Awaits")?.late.length ?? 0) > 0],
    ["a submitting local handed to a timer is found, and late", !!d("Handed")?.submits && (d("Handed")?.late.length ?? 0) > 0],
    ["a confirm's server action is read through its import", JSON.stringify(d("Direct")?.actions) === JSON.stringify(["saveAction"])],
    ["a form whose submit calls the server action a confirm confirms reaches it", JSON.stringify(f("Direct")?.reaches) === JSON.stringify(["saveAction"])],
    ["a form whose action= is that server action reaches it", JSON.stringify(f("ActionForm")?.reaches) === JSON.stringify(["dropAction"])],
    ["a form whose action= is a server action is written down src-wide, by its key", r.actionForms.some((a) => a.component === "ActionForm" && a.key === "dropAction@src/fixture/actions.ts")],
    ["a form that calls an action no confirm confirms reaches nothing", !!f("Other") && f("Other")!.reaches.length === 0 && f("Other")!.why === null],
    ["a submit made inside an imported helper is read one hop deep and found", !!d("Helped")?.submits && d("Helped")?.why === null],
    ["…with its timing: a helper that submits after its own await is late", !!d("HelpedLate")?.submits && (d("HelpedLate")?.late.length ?? 0) > 0],
    ["an import it cannot read one hop deep (a re-export from a further module) leaves the confirm UNREAD", /relay/.test(d("Relayed")?.why ?? "")],
    ["a readable helper that submits nothing is read and passed", !!d("Tidy") && !d("Tidy")!.submits && d("Tidy")!.why === null],
    ["a NAMED confirm confirms the local functions it calls, one level: a submit calling one of them reaches it", !!f("NamedHides")?.reaches.includes("runIt")],
    ["a guard clause the other way round (the save in an if that returns, the question after it) asks first", (f("Inverse")?.reaches.length ?? 0) > 0 && f("Inverse")?.asks("setAsk(f)") === null],
    ["a question whose if does not return does not ask first", (f("Leaky")?.reaches.length ?? 0) > 0 && f("Leaky")?.asks("setAsk(f)") !== null],
  ];
  const missed = expect.filter(([, okay]) => !okay).map(([name]) => name);
  return { pass: missed.length === 0, detail: missed.length === 0 ? `${expect.length} shapes told apart` : `MISSED: ${missed.join("; ")}` };
}

