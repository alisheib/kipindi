/** Reclaim a completed parity batch's browser without changing the server or its seeded store. */
export async function recycleParityBrowser(browser, launch, expectedVersion, label) {
  const openContexts = browser.contexts().length;
  if (openContexts !== 0) throw new Error(`${label}: ${openContexts} browser context(s) still open at a parity batch boundary`);
  await browser.close();
  const next = await launch();
  if (next.version() !== expectedVersion) {
    const actual = next.version();
    await next.close();
    throw new Error(`${label}: Chromium changed from ${expectedVersion} to ${actual} inside one capture`);
  }
  return next;
}
