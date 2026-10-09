const { edit } = require('./ed1.cjs');
edit('src/components/profile/name-editor.tsx', [
  [`import { useEffect, useRef, useState, useTransition } from "react";`, `import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";`],
  [`import { errorCopy } from "@/lib/error-copy";\n`, `import { errorCopy } from "@/lib/error-copy";\nimport { keepNameEnd } from "@/components/ui/keep-words";\n`],
  [`  const enter = () => {
    savingRef.current = false;
    setValue(currentName ?? "");
    setEditing(true);
    // \`autoFocus\` on the input owns FOCUS (deterministic, at mount); this deferred
    // call owns only the SELECTION, so tapping the name replaces it in one gesture.
    setTimeout(() => inputRef.current?.select(), 30);
  };`, `  const enter = () => {
    savingRef.current = false;
    setValue(currentName ?? "");
    setEditing(true);
  };

  /* 🔴 NO KEYSTROKE IS EVER LOST (round 4 of the visual pass, 2026-10-09, edges E27). The selection used to be made 30ms
     after the editor opened (\`setTimeout(select, 30)\`), so whatever was typed in those 30ms was selected and then replaced
     by the next key: the edge drive typed "Mwanaisha…" and saved "wanaisha…", "Mwanaishakhamis…" saved "anaishakhamis…",
     "欧阳慕容…" saved "阳慕容…" — a fast typist, or a slow phone, loses the first letters of their own name. Focus and
     selection now happen in the commit that mounts the field, before the browser handles another event: the next key
     replaces the whole name, as tapping the name always meant, and every key after it lands. Nothing selects again. */
  useLayoutEffect(() => {
    if (!editing) return;
    const field = inputRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [editing]);`],
  [`  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={enter}
      className="mt-1.5 inline-flex min-h-[40px] items-center gap-2 group text-left"
      aria-label={t.common.editDisplayName}
    >
      <span className="font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
        {currentName && currentName.trim() !== "" ? currentName : (`, `  /* ⭐ THE NAME BREAKS INSIDE ITS COLUMN (round 4 of the visual pass, 2026-10-09, edges tiles 218–220 233–235, E24 E25).
     An unbroken 40-letter name had no break rule: the button ran 141..722 at 360, its pencil off the card and its focus
     ring cut, while the hub breaks the same name cleanly. Now the name may break anywhere when it must
     (\`overflow-wrap: anywhere\`, which also lets the flex item shrink below its longest word — \`break-word\` would not),
     balances its lines, keeps its last two characters together (\`keepNameEnd\`), and the button never outgrows its
     column (\`max-w-full\`). With nothing wider than the column, returning focus here after a save has nothing to reveal,
     so the hero has nothing to scroll sideways (the hero is \`overflow-clip\` as well, profile/page.tsx). */
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={enter}
      className="mt-1.5 inline-flex min-h-[40px] max-w-full items-center gap-2 group text-left"
      aria-label={t.common.editDisplayName}
    >
      <span className="min-w-0 font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text text-balance [overflow-wrap:anywhere]">
        {currentName && currentName.trim() !== "" ? keepNameEnd(currentName) : (`],
]);
edit('src/app/profile/page.tsx', [
  [`      <section className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">`,
   `      {/* 🔴 \`overflow-clip\` OVER \`overflow-hidden\` (round 4 of the visual pass, 2026-10-09, edges tiles 233–235, E24). A box
          that hides its overflow is still a scroll container, and this one has overflow to scroll: the watermark below
          stands 32px past its right edge (\`-right-6\`), and an unbroken name ran 580px past it. Saving a name returns focus
          to the name's button (name-editor.tsx), the browser scrolled the hero sideways to reveal it, and the scroll stayed:
          the whole hero 32px left, the avatar ring cut, "ZS 50,000", a bare strip at the right. \`clip\` clips the same box
          and is no scroll container, so nothing can move it; \`hidden\` stays first for an engine without \`clip\` (Safari
          before 16), where the name's own break rule (E25) leaves nothing to reveal. */}
      <section className="relative overflow-hidden overflow-clip rounded-xl border border-border bg-bg-elevated">`],
]);
edit('src/app/account/page.tsx', [
  [`import { getServerT } from "@/lib/i18n-server";\n`, `import { getServerT } from "@/lib/i18n-server";\nimport { keepNameEnd } from "@/components/ui/keep-words";\n`],
  [`              <span className="kp-hub__name">{viewer.name}</span>`, `              {/* Balanced, and never one character alone on its last line (round 4, edges 236 240 244): \`.kp-hub__name\`. */}
              <span className="kp-hub__name">{keepNameEnd(viewer.name)}</span>`],
]);
