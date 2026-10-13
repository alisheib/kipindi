import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { Input as NewInput, Field as NewField } from "/tmp/rev-wp5/src/components/ui/input.tsx";
import { Input as OldInput, Field as OldField } from "../old-input.tsx";

const W = window as any;
W.__log = [] as any[];
const KITS: Record<string, { Input: any; Field: any }> = { old: { Input: OldInput, Field: OldField }, new: { Input: NewInput, Field: NewField } };

function Controlled({ kit, props, mode, inField }: { kit: string; props: any; mode: string; inField: boolean }) {
  const { Input, Field } = KITS[kit];
  const [v, setV] = React.useState<string>(props.initial ?? "");
  const [, setErr] = React.useState<string | null>("x");
  W.__state = v;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    W.__log.push({ ev: "onChange", value: e.target.value, caret: e.target.selectionEnd });
    if (mode === "functional") { setErr(null); setV(() => e.target.value); }
    else if (mode === "clamp") { const n = Number(e.target.value.replace(/[^0-9]/g, "")); setV(n > 100000 ? v : e.target.value); }
    else setV(e.target.value);
  };
  const { initial, ...rest } = props;
  const box = <Input {...rest} value={v} onChange={onChange} />;
  return inField ? <Field label="Amount" hint="h">{box}</Field> : box;
}
function Uncontrolled({ kit, props, inField }: { kit: string; props: any; inField: boolean }) {
  const { Input, Field } = KITS[kit];
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => { W.__log.push({ ev: "onChange", value: e.target.value, caret: e.target.selectionEnd }); };
  const box = <Input {...props} onChange={props.noOnChange ? undefined : onChange} />;
  return inField ? <Field label="Amount" hint="h">{box}</Field> : box;
}
let root: Root | null = null;
W.mount = (kit: string, kind: string, props: any, mode = "plain", inField = false) => {
  W.__log = [];
  W.__state = undefined;
  const host = document.getElementById("host")!;
  if (root) { root.unmount(); }
  host.innerHTML = "";
  const form = document.createElement("form");
  form.id = "f";
  form.onsubmit = (e) => e.preventDefault();
  host.appendChild(form);
  root = createRoot(form);
  flushSync(() => root!.render(kind === "controlled" ? <Controlled kit={kit} props={props} mode={mode} inField={inField} /> : <Uncontrolled kit={kit} props={props} inField={inField} />));
  return document.getElementById("host")!.innerHTML;
};
W.formData = () => [...new FormData(document.getElementById("f") as HTMLFormElement).entries()];
W.box = () => document.querySelector('#f input:not([type="hidden"])') as HTMLInputElement;
W.html = () => document.getElementById("host")!.innerHTML;
W.React = React;

/* re-render an uncontrolled grouped box with new props (a parent changing its default — e.g. a preset chip) */
let root2: Root | null = null;
function Host({ props }: { props: any }) { const { Input } = KITS.new; return <Input {...props} />; }
W.mount2 = (props: any) => {
  const host = document.getElementById("host")!;
  if (root) { root.unmount(); root = null; }
  host.innerHTML = "";
  const form = document.createElement("form"); form.id = "f"; form.onsubmit = (e) => e.preventDefault(); host.appendChild(form);
  root2 = createRoot(form);
  flushSync(() => root2!.render(<Host props={props} />));
};
W.rerender2 = (props: any) => { flushSync(() => root2!.render(<Host props={props} />)); };
