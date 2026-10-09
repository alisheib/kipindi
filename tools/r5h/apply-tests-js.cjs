// R5-H · journey-shell: the flag raised in a LAYOUT effect and mounted bare beside the journey's header and tabs (G-3).
const { once, edit } = require("./lib.cjs");
edit("scripts/journey-shell.test.mts", (s) => {
  s = once(s, 'const BARE_PARTS: readonly string[] = ["LazyJourneyTopBar", "LazyJourneyTabs"];\n',
    'const BARE_PARTS: readonly string[] = ["LazyJourneyTopBar", "LazyJourneyTabs"];\n'
    + "/** The journey flag stands bare too (round 5's follow-up, R5-H, G-3): beside the header and the tabs, so a refresh that\n"
    + " *  switches the journey on mounts it in the commit that first paints them. It is the `journeyShown &&` arm itself — it\n"
    + " *  has no classic twin — so 12.shell.flag holds it, not 12.shell.bare's ternaries. */\n"
    + 'const BARE_FLAG = "LazyJourneyFlag";\n', "BARE_FLAG");
  // 5.component — a layout effect.
  s = once(s, '  ok("5.component · JourneyFlag is a client file that renders nothing and raises the flag in an effect whose cleanup lowers it",\n'
    + '    isClient(comp) && comp.includes("useEffect(() => raiseJourneyFlag(), [])") && comp.includes("return null;"));\n',
    "  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-3): a LAYOUT effect — a passive one ran after the paint of the commit that\n"
    + "  // swapped the shell, one frame of the old answer (R5-D). `test:visual-pass-r5h` §3 runs both directions' phases.\n"
    + '  ok("5.component · JourneyFlag is a client file that renders nothing and raises the flag in a LAYOUT effect (before the paint of the commit that mounts it) whose cleanup lowers it",\n'
    + '    isClient(comp) && comp.includes("useLayoutEffect(() => raiseJourneyFlag(), [])") && !comp.includes("useEffect(") && comp.includes("return null;"));\n', "5.component");
  // 5.mount — bare.
  s = once(s, '  const flagMount = "{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}";\n',
    "  // ⚠️ BARE SINCE ROUND 5'S FOLLOW-UP (R5-H, G-3): 12.shell.flag holds why.\n"
    + '  const flagMount = "{journeyShown && <LazyJourneyFlag />}";\n', "5.mount");
  // 12.shell.wrapped excludes the flag; 12.shell.flag holds it bare.
  s = once(s, "  const unwrapped = table.filter((b) => !BARE_PARTS.includes(b) && [...flat.matchAll(wrappedPart(b))].length !== 1);\n"
    + "  ok(`12.shell.wrapped · every part but the journey's header and tabs is the one child of its own Suspense boundary in AppShell, as before WP6c: next/dynamic adds none, so without it the part's boundary markers leave the HTML and its chunk holds up the whole page's hydration (${table.length - BARE_PARTS.length})`,\n"
    + "    unwrapped.length === 0 && BARE_PARTS.every((b) => table.includes(b)), show({ unwrapped }));\n",
    "  const unwrapped = table.filter((b) => !BARE_PARTS.includes(b) && b !== BARE_FLAG && [...flat.matchAll(wrappedPart(b))].length !== 1);\n"
    + "  ok(`12.shell.wrapped · every part but the journey's header, tabs and flag is the one child of its own Suspense boundary in AppShell, as before WP6c: next/dynamic adds none, so without it the part's boundary markers leave the HTML and its chunk holds up the whole page's hydration (${table.length - BARE_PARTS.length - 1})`,\n"
    + "    unwrapped.length === 0 && BARE_PARTS.every((b) => table.includes(b)) && table.includes(BARE_FLAG), show({ unwrapped }));\n", "12.wrapped");
  s = once(s, "    chrome.every((r) => r.arm === 1 && r.boxed === 0) && emptyBox === 0, show({ chrome, emptyBox }));\n",
    "    chrome.every((r) => r.arm === 1 && r.boxed === 0) && emptyBox === 0, show({ chrome, emptyBox }));\n"
    + "  const flagArm = { arm: count(flat, `{journeyShown && <${BARE_FLAG} />}`), boxed: [...flat.matchAll(wrappedPart(BARE_FLAG))].length, tags: count(flat, `<${BARE_FLAG}`) };\n"
    + "  ok(\"12.shell.flag · the journey flag stands in NO Suspense boundary either (round 5's follow-up, R5-H · G-3): the journeyShown arm itself, beside the header and the tabs, so a refresh that switches the journey on waits for its chunk as for theirs and mounts it in the commit that first paints them — and its layout effect raises the flag before that paint\",\n"
    + "    flagArm.arm === 1 && flagArm.boxed === 0 && flagArm.tags === 1, show(flagArm));\n", "12.flag");
  // The red plants that named the old lines, and one for each new rule.
  s = once(s, '    const flagNoCleanup = withFile(WORLD, FLAG_COMPONENT, (s) => s.replace("useEffect(() => raiseJourneyFlag(), [])", "useEffect(() => { raiseJourneyFlag(); }, [])"));\n',
    '    const flagNoCleanup = withFile(WORLD, FLAG_COMPONENT, (s) => s.replace("useLayoutEffect(() => raiseJourneyFlag(), [])", "useLayoutEffect(() => { raiseJourneyFlag(); }, [])"));\n'
    + '    const flagPassive = withFile(WORLD, FLAG_COMPONENT, (s) => s.replace("useLayoutEffect(() => raiseJourneyFlag(), [])", "useEffect(() => raiseJourneyFlag(), [])").replace("import { useLayoutEffect } from \\"react\\";", "import { useEffect } from \\"react\\";"));\n'
    + '    const flagBoxed = withFile(WORLD, SHELL, (s) => s.replace("{journeyShown && <LazyJourneyFlag />}", "{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}"));\n', "plants");
  s = once(s, '    const flagForEveryone = withFile(WORLD, SHELL, (s) => s.replace("{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}", "<Suspense fallback={null}><LazyJourneyFlag /></Suspense>"));\n',
    '    const flagForEveryone = withFile(WORLD, SHELL, (s) => s.replace("{journeyShown && <LazyJourneyFlag />}", "<LazyJourneyFlag />"));\n', "plant everyone");
  s = once(s, '      { name: "JourneyFlag\'s effect loses its cleanup", expect: at("5.component ·"),\n'
    + '        world: flagNoCleanup, landed: changed(flagNoCleanup, FLAG_COMPONENT), landedAs: "unmounting leaves data-journey on the page" },\n',
    '      { name: "JourneyFlag\'s effect loses its cleanup", expect: at("5.component ·"),\n'
    + '        world: flagNoCleanup, landed: changed(flagNoCleanup, FLAG_COMPONENT), landedAs: "unmounting leaves data-journey on the page" },\n'
    + '      { name: "JourneyFlag raises in a passive effect again (R5-H, G-3)", expect: at("5.component ·"),\n'
    + '        world: flagPassive, landed: changed(flagPassive, FLAG_COMPONENT), landedAs: "a refresh that swaps the shell paints one frame of the old answer" },\n'
    + '      { name: "JourneyFlag back in a Suspense boundary of its own (R5-H, G-3)", expect: at("12.shell.flag ·"),\n'
    + '        world: flagBoxed, landed: changed(flagBoxed, SHELL), landedAs: "the flag can land a commit after the journey\'s header: its chrome painted while the overlays read the classic answer" },\n', "entries");
  return s;
});
