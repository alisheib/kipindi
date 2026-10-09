// F6: the money forms' spacing moves onto an inner wrapper (cwd = F:/kipindi-vis).
const fs = require("fs");
const ed = (p, f) => {
  let s = fs.readFileSync(p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  s = f(s);
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
};
const once = (s, a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`anchor ×${n}: ${a.slice(0, 80)}`);
  return s.replace(a, b);
};
/** Indent every line strictly between the form's opening tag end and `</form>` by two spaces, inside a wrapper. */
const wrap = (s, openEnd, closeLine, note) => {
  const a = s.indexOf(openEnd);
  if (a < 0 || s.split(openEnd).length !== 2) throw new Error("open anchor");
  const bodyStart = a + openEnd.length;
  const b = s.indexOf(closeLine, bodyStart);
  if (b < 0) throw new Error("close anchor");
  const body = s.slice(bodyStart, b).split("\n").map((l) => (l.length ? "  " + l : l)).join("\n");
  return s.slice(0, bodyStart) + note + `        <div className="space-y-5">\n` + body + `        </div>\n` + s.slice(b);
};
const NOTE = (what) => `        {/* ⭐ THE FORM'S RHYTHM LIVES ON THIS WRAPPER, NOT ON THE <form> (2026-10-08, the visual pass's round 3, tiles
            067–069 / 173–174). React's server renderer writes \`<input type="hidden" name="$ACTION_ID_…">\` straight after
            the <form> tag of a server-action form (react-dom-server: pushAdditionalFormField), with no \`hidden\`
            attribute, so Tailwind 3's \`space-y-5\` on the form counted it as a sibling and put 24px above ${what}: 51px
            from the card's border to its first line against the card's 24px sides. Inside this wrapper the first child has
            no sibling before it whatever React adds to the form. */}
`;

ed("src/app/wallet/deposit/page.tsx", (s) => {
  s = once(s, `<form action={depositAction} className="group/deposit rounded-xl glass-panel p-5 lg:p-6 space-y-5">`,
    `<form action={depositAction} className="group/deposit rounded-xl glass-panel p-5 lg:p-6">`);
  s = once(s, "            `hidden` keeps it out of the form's `space-y-5` sibling count, as on the key above (2026-10-08, WP12 tile 068):\n            without it a low-balance deposit put the 24px gap back above the method chooser. */}",
    "            `hidden` keeps it out of the wrapper's `space-y-5` sibling count, as on the key above (2026-10-08, WP12 tile 068):\n            without it a low-balance deposit put the 24px gap back above the method chooser. */}");
  s = wrap(s, `<form action={depositAction} className="group/deposit rounded-xl glass-panel p-5 lg:p-6">\n`, "      </form>\n",
    NOTE(`"CHAGUA NJIA YA KULIPA"`));
  return s;
});
ed("src/app/wallet/withdraw/page.tsx", (s) => {
  s = once(s, "className={`rounded-xl glass-panel p-5 lg:p-6 space-y-5 ${canSubmit ? \"\" : \"opacity-60\"}`}",
    "className={`rounded-xl glass-panel p-5 lg:p-6 ${canSubmit ? \"\" : \"opacity-60\"}`}");
  s = wrap(s, "className={`rounded-xl glass-panel p-5 lg:p-6 ${canSubmit ? \"\" : \"opacity-60\"}`}\n      >\n", "      </form>\n",
    NOTE(`"MAHALI"`));
  return s;
});
ed("src/components/wallet/idempotency-key-field.tsx", (s) => once(s,
  " * its first line. A `hidden` input is still submitted with its form; nothing else about it changes.\n */",
  " * its first line. A `hidden` input is still submitted with its form; nothing else about it changes.\n" +
  " * ⚠️ It was not the only such input: React writes its own `$ACTION_ID_…` hidden input first in every server-action form,\n" +
  " * so the two money forms now keep their rhythm on an inner wrapper (round 3, 2026-10-08). This attribute still keeps\n" +
  " * THIS input from counting inside that wrapper.\n */"));
console.log("ok");
