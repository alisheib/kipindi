/**
 * A cached App Router page can mount again with the same server timestamp. Its
 * first client render must still match the server HTML; elapsed time is applied
 * after hydration commits. This browser guard uses the real hook and React's
 * recoverable-error callback, so a text mismatch cannot silently pass.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { build } from "esbuild";
import { chromium } from "playwright";
import { useReplayAnchor } from "../src/lib/use-replay-anchor";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stamp = Date.now();
function Probe({ serverNowMs }: { serverNowMs: number }) {
  const anchor = useReplayAnchor(serverNowMs);
  return React.createElement("span", { "data-anchor": "" }, String(Math.floor(anchor - serverNowMs)));
}

const serverMarkup = renderToString(React.createElement(Probe, { serverNowMs: stamp }));
assert.match(serverMarkup, />0<\//, "the server starts at its own instant");

const browserSource = `
  import React from "react";
  import { hydrateRoot } from "react-dom/client";
  import { useReplayAnchor } from "./src/lib/use-replay-anchor";
  const stamp = ${stamp};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function Probe({ serverNowMs }) {
    const anchor = useReplayAnchor(serverNowMs);
    return React.createElement("span", { "data-anchor": "" }, String(Math.floor(anchor - serverNowMs)));
  }
  // Deliberately violate the first-render rule. This proves the same error
  // observer that judges the real replay does catch a shifted clock text.
  function Plant({ serverNowMs }) {
    const anchor = useReplayAnchor(serverNowMs);
    return React.createElement("span", { "data-anchor": "" }, String(Math.floor(anchor - serverNowMs) + 2000));
  }
  const errors = [];
  const report = (error) => errors.push(String(error?.message ?? error));
  (async () => {
    const firstRoot = hydrateRoot(document.querySelector("#first"), React.createElement(Probe, { serverNowMs: stamp }),
      { onRecoverableError: report });
    await wait(350);
    const first = document.querySelector("#first [data-anchor]")?.textContent;
    // The hook also supports a mounted caller receiving a fresh server stamp.
    // The displayed offset must reset to zero for an unseen stamp.
    firstRoot.render(React.createElement(Probe, { serverNowMs: stamp + 10000 }));
    await wait(350);
    const changed = document.querySelector("#first [data-anchor]")?.textContent;
    // The same server HTML is served again from the router cache after time has
    // elapsed. Hydrating it must not compare an advanced clock with old markup.
    await wait(2200);
    hydrateRoot(document.querySelector("#replay"), React.createElement(Probe, { serverNowMs: stamp }),
      { onRecoverableError: report });
    await wait(350);
    const replay = document.querySelector("#replay [data-anchor]")?.textContent;
    const plantErrors = [];
    hydrateRoot(document.querySelector("#plant"), React.createElement(Plant, { serverNowMs: stamp }),
      { onRecoverableError: (error) => plantErrors.push(String(error?.message ?? error)) });
    await wait(150);
    window.__anchorProbe = {
      first,
      changed,
      replay,
      errors,
      plantErrors,
    };
  })().catch((error) => { window.__anchorProbe = { fatal: String(error) }; });
`;

const bundle = await build({
  stdin: { contents: browserSource, resolveDir: root, sourcefile: "replay-anchor-browser.tsx", loader: "tsx" },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  logLevel: "silent",
});
const javascript = bundle.outputFiles[0].text;
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
  <div id="first">${serverMarkup}</div><div id="replay">${serverMarkup}</div><div id="plant">${serverMarkup}</div>
  <script src="/probe.js" defer></script></body></html>`;
const server = createServer((req, res) => {
  if (req.url === "/probe.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    res.end(javascript);
  } else {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
assert(address && typeof address !== "string");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as typeof window & { __anchorProbe?: object }).__anchorProbe != null,
    undefined, { timeout: 15000 });
  const result = await page.evaluate(() =>
    (window as typeof window & { __anchorProbe: { first?: string; changed?: string; replay?: string; errors?: string[]; plantErrors?: string[]; fatal?: string } }).__anchorProbe);
  assert.equal(result.fatal, undefined, `browser fixture: ${result.fatal}`);
  assert.equal(result.first, "0", "a fresh hydration keeps the server's text");
  assert.equal(result.changed, "0", "a new server stamp resets the anchor after a mounted update");
  assert.deepEqual(result.errors, [], "a replayed timestamp hydrates without React #418");
  assert(Number(result.replay) >= 2000, `replay advances after hydration; got ${result.replay}`);
  assert(result.plantErrors?.some((e) => /Hydration failed|#418/.test(e)),
    "the planted early clock shift must trigger React's hydration error");
  console.log("PASS — fresh SSR text matches; a new stamp resets; cached replay hydrates and advances; early-shift plant is red");
} finally {
  await browser.close();
  await new Promise<void>((closed) => server.close(() => closed()));
}
