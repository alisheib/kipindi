/**
 * RED harness for `npm run test:updown-admin-options`.
 *
 *   node scripts/updown-admin-options-red.mjs
 *
 * ⛔ THE ONE THAT MATTERS MOST is `hide-instead-of-grey`: filtering an unusable option out of
 * the list instead of greying it with its reason. It looks tidier, it passes any "the server
 * refuses it" test, and it produces exactly the question Ali asked this design to prevent —
 * *"why isn't gold in the list?"*
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; the result read from
 * the suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CONTROLS = new URL("../src/app/admin/updown/updown-controls.tsx", import.meta.url);
const SELECT = new URL("../src/components/ui/select.tsx", import.meta.url);
const SYMBOLS = new URL("../src/lib/server/updown-symbols.ts", import.meta.url);
const PAGE = new URL("../src/app/admin/updown/page.tsx", import.meta.url);

const MUTATIONS = [
  {
    name: "hide-instead-of-grey — the unusable option vanishes and the operator asks why",
    file: CONTROLS,
    from: `  const durationOptions = (readinessByAsset[assetId] ?? []).map((r) => ({`,
    to: `  const durationOptions = (readinessByAsset[assetId] ?? []).filter((r) => r.level !== 3).map((r) => ({`,
  },
  {
    name: "greyed-with-no-reason — an option is disabled and says nothing",
    file: CONTROLS,
    from: `    hint: r.reason || undefined,`,
    to: `    hint: undefined,`,
  },
  {
    // ⚠️ MUTATES THE JSX, NOT THE CONSTANT'S NAME. The first version renamed `MARGIN_CHOICES`
    // to `MARGIN_CHOICES_RENAMED` — which the guard's `/MARGIN_CHOICES/` still matched as a
    // SUBSTRING, so the mutation changed the file and falsified nothing and was honestly
    // reported as a MISS. A mutation has to remove the BEHAVIOUR, not rename the evidence.
    name: "margin-back-to-a-typed-field — an operator can type a band that voids every round",
    file: CONTROLS,
    // ⚠️ Anchor refreshed 2026-08-07: the band Field gained `className="lg:col-span-4"` when
    // the add-chain form moved to the 10-column grid (E-96 layout), which orphaned the old text.
    from: `        <Field label="Winning band" className="lg:col-span-4">
          <Select name="marginBpsChoice" value={marginChoice} onChange={setMarginChoice}
            options={MARGIN_CHOICES.map((m) => ({
              value: String(m.bps),
              label: m.label,
              hint: m.hint,
            }))} />
        </Field>`,
    to: `        <Field label="Margin % (optional)" className="lg:col-span-4">
          <Input name="marginPct" type="number" step="0.01" min="0" max="20"
            placeholder={\`inherit (\${(inherited / 100).toFixed(2)})\`} size="sm" />
        </Field>`,
  },
  {
    name: "console-imports-the-server-module — the symbol catalogue lands in the browser bundle",
    file: CONTROLS,
    from: `import { FEED_PROVIDERS, findProvider, type FeedProviderId } from "@/lib/updown-providers";`,
    to: `import { FEED_PROVIDERS, findProvider, type FeedProviderId } from "@/lib/updown-providers";
import { symbolReadiness } from "@/lib/server/updown-symbols";`,
  },
  {
    name: "disabled-option-becomes-clickable — the console offers what the server refuses",
    file: SELECT,
    from: `              onClick={() => { if (!o.disabled) pick(o.value); }}`,
    to: `              onClick={() => { pick(o.value); }}`,
  },
  {
    // The keyboard-only dead end — invisible to any screenshot sweep.
    name: "arrows-park-on-a-disabled-option — a keyboard dead end no screenshot would show",
    file: SELECT,
    from: `          if (!options[i]!.disabled) return i;`,
    to: `          if (true) return i;`,
  },
  {
    // The accessibility regression: the option and its reason leave the tree entirely.
    name: "disabled-attribute-instead-of-aria — the reason disappears for screen readers",
    file: SELECT,
    from: `              aria-disabled={o.disabled || undefined}`,
    to: `              disabled={o.disabled}`,
  },
  {
    // The console and the server drift apart — the failure this whole phase is built to
    // make impossible. Gold's minimum moves on ONE side only.
    name: "console-and-server-drift — the greying stops matching the refusal",
    file: SYMBOLS,
    // ⚠️ Anchor refreshed 2026-08-07: E-110 added the measured/movement axes to the signature.
    // ⚠️ AND AGAIN 2026-08-15 — it had been stale for five days. `b382f994` (2026-08-10, "The
    // Asset Playbook") added a FIFTH argument, `playbook`, so the four-argument form here
    // matched nothing and both mutations below reported ANCHOR NOT FOUND — `red:all` exiting 1
    // on a harness fault, not a product one. This is the same class as E-108 and as the two
    // other stale anchors repaired in this commit: a signature change silently disarms every
    // harness that spells the call out by hand.
    // The drift itself is unchanged — the server keeps accepting a pairing the console greys.
    from: `  const r = symbolReadiness(findSymbol(symbol), durationMinutes, measured, movement, playbook);
  return r.level === 3 ? r.reason : null;
}`,
    to: `  const r = symbolReadiness(findSymbol(symbol), durationMinutes, measured, movement, playbook);
  return r.level === 3 && durationMinutes < 3 ? r.reason : null;
}`,
  },
  {
    name: "page-stops-computing-readiness — the console has nothing to grey with",
    file: PAGE,
    // ⚠️ Anchor refreshed 2026-08-07: the page call now folds in the measured + movement records.
    // ⚠️ AND AGAIN 2026-08-15 — `b382f994` wrapped the call over two lines and appended the
    // playbook advice, so the single-line form matched nothing. Same stale-anchor class as the
    // mutation above; both are repaired against the live source rather than re-guessed.
    from: `                    const r = symbolReadiness(findSymbol(a.symbol), d, feed?.advise(a.key, d), feed?.movement(a.key, d),
                      toReadinessAdvice(book?.choice(a.symbol, d, findSymbol(a.symbol)?.minDurationMinutes ?? null)));`,
    to: `                    const r = { level: 1 as const, reason: "" };`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(from, to));
  try {
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-admin-options.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/updown-admin-options: \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 82)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
