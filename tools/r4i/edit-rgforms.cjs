const fs = require("fs");
function edit(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [o, n] of pairs) {
    const c = s.split(o).length - 1;
    if (c !== 1) { console.error(f, "anchor count", c, JSON.stringify(o.slice(0, 80))); process.exit(1); }
    s = s.replace(o, () => n);
  }
  if (crlf) s = s.replace(/\n/g, "\r\n");
  fs.writeFileSync(f, s);
  console.log("ok", f, crlf ? "crlf" : "lf");
}
edit("src/app/profile/responsible-gambling/page.tsx", [
  [`        <form action={coolOffAction} className="flex flex-wrap items-end gap-2">
          <div>
            <FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend>`,
   `        <form action={coolOffAction} className="flex flex-wrap items-end gap-2">
          {/* R4-I · the one width both period fields take (\`periodFieldPx\`), so this button and Jizuie's stand in line. */}
          <div style={{ width: periodFieldPx }}>
            <FieldLegend className="block mb-1.5">{t.rg.breakLength}</FieldLegend>`],
  [`          <RgConfirmSubmit label={t.common.startABreak} body={t.rg.breakDescription} icon={<I.pause s={13} />} buttonClass="btn btn-ghost btn-md" />`,
   `          <RgConfirmSubmit
            label={t.common.startABreak}
            body={t.rg.breakDescription}
            icon={<I.pause s={13} />}
            buttonClass="btn btn-ghost btn-md"
            choice={{ field: "period", label: t.rg.breakLength, options: COOLING_OFF_OPTIONS.map((o) => ({ value: o.id, label: o.label })) }}
          />`],
  [`        <form action={selfExcludeAction} className="flex flex-wrap items-end gap-2">
          <div>
            <FieldLegend className="block mb-1.5">{t.rg.exclusionPeriod}</FieldLegend>`,
   `        <form action={selfExcludeAction} className="flex flex-wrap items-end gap-2">
          <div style={{ width: periodFieldPx }}>
            <FieldLegend className="block mb-1.5">{t.rg.exclusionPeriod}</FieldLegend>`],
  [`          <RgConfirmSubmit label={t.common.selfExclude} body={t.rg.selfExcludeDescription} icon={<I.lock s={13} />} buttonClass="btn btn-claret btn-md" />`,
   `          <RgConfirmSubmit
            label={t.common.selfExclude}
            body={t.rg.selfExcludeDescription}
            icon={<I.lock s={13} />}
            buttonClass="btn btn-claret btn-md"
            choice={{ field: "period", label: t.rg.exclusionPeriod, options: SELF_EXCLUSION_OPTIONS.map((o) => ({ value: o.id, label: o.label })) }}
          />`],
]);
