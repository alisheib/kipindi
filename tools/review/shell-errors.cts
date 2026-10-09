/* Throwaway: how React 19.2's server renderer (the copy Next renders with) treats a render error
 *   A · in a part with NO Suspense boundary (the journey header/tabs after R4-J)
 *   B · in the same part inside a boundary (before R4-J)
 *   C · in the ROOT loading fallback, while the page content is still pending (every journey document after R4-J)
 * Run from F:\kipindi-vis:  npx tsx <this file> */
const { createRequire } = require("node:module");
const { Writable } = require("node:stream");
const req = createRequire("F:/kipindi-vis/package.json");
const React = req("react");
const { renderToPipeableStream } = req("react-dom/server");
const h = React.createElement;

function Boom(): never { throw new Error("header threw on the server"); }
function makePage() {
  let ready = false; let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => { resolve = () => { ready = true; r(); }; });
  function Page() { if (!ready) throw promise; return h("main", null, "page"); }
  return { Page, resolve };
}

function run(label: string, make: (P: any) => any): Promise<void> {
  const { Page, resolve } = makePage();
  const el = make(Page);
  return new Promise((done) => {
    let html = "";
    const sink = new Writable({ write(c: Buffer, _e: string, cb: () => void) { html += c.toString(); cb(); } });
    const events: string[] = [];
    const s = renderToPipeableStream(el, {
      onShellReady() { events.push("onShellReady"); s.pipe(sink); },
      onShellError(e: Error) { events.push(`onShellError(${e.message})`); },
      onAllReady() { events.push("onAllReady"); },
      onError(e: Error) { events.push(`onError(${e.message})`); },
    });
    setTimeout(() => resolve(), 30);
    setTimeout(() => {
      console.log(`${label}\n   events: ${events.join(" → ")}\n   client-render marker in HTML: ${html.includes("<!--$!-->")}; header fallback in HTML: ${html.includes('class="kp-jhdr"')}\n`);
      done();
    }, 120);
  });
}

(async () => {
  const doc = (...kids: any[]) => h("html", null, h("body", null, ...kids));
  await run("A · header in NO boundary throws", (Page: any) => doc(h(Boom), h(React.Suspense, { fallback: h("div", null, "ghost") }, h(Page))));
  await run("B · header in its own boundary throws", (Page: any) => doc(h(React.Suspense, { fallback: h("div", { className: "kp-jhdr" }) }, h(Boom)), h(React.Suspense, { fallback: h("div", null, "ghost") }, h(Page))));
  await run("C · the root loading fallback throws while the page is pending", (Page: any) => doc(h("header", null, "bar"), h(React.Suspense, { fallback: h(Boom) }, h(Page))));
})();
