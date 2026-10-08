/**
 * test:deposit-phone — the deposit's mobile-money number takes a number however a player writes it (the Vodacom plan
 * §2, S9: "the classic deposit page's phone field becomes the kit PhoneInput").
 *
 *   npm run test:deposit-phone   (in test:all)
 *   npm run red:deposit-phone    (--prove-red: wrong rules and the old markup are planted IN MEMORY and must be caught)
 *
 * 🔴 THE DEFECT (live until 2026-10-09): the box was a raw Input with `maxLength={9}` and `pattern="\d{9}"`. A player
 * who typed their number the way it is written in Tanzania, "0712 345 678", was stopped at nine characters —
 * "071234567" — which the server's `tzPhone` refuses. The kit PhoneInput, already the sign-up and sign-in box, takes
 * 07…, 7…, 255…, +255… and 00255…, shows "712 345 678", and posts the nine digits in a hidden field under the form's
 * name.
 *
 *   §1 every spelling a player types reduces, in the box, to nine digits the server accepts: the REAL
 *      `normalizeTzLocalDigits` (the box's rule) against the REAL `tzPhone` (the server's); and the old box's cut is
 *      refused (the control that shows this section can fail).
 *   §2 the deposit page draws its number box as the kit PhoneInput, and no raw nine-character box remains.
 *   §3 "Use another number" and "Use my registered number" set the box through the input's NATIVE value setter, so
 *      React hears the change and the hidden field that is posted follows what the player sees. With `el.value = …`
 *      alone, React's value tracker moves too, the input event reads as no change, and the hidden field keeps the OLD
 *      number: the player would see their own number while the prompt went to another. The browser half of this is
 *      `qa:deposit-phone`, which presses both buttons in Chromium, Firefox and WebKit.
 *   §4 the PhoneInput still posts the nine digits under the caller's name (a hidden field), from no visible box.
 *
 * ⛔ IN-PROCESS: no file is written.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { normalizeTzLocalDigits } from "../src/lib/phone-normalize.ts";
import { tzPhone } from "../src/lib/server/validators.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));

type Impl = { boxRule: (raw: string) => string; pageSrc: string; choiceSrc: string; phoneSrc: string };
const REAL: Impl = {
  boxRule: normalizeTzLocalDigits,
  pageSrc: read("src/app/wallet/deposit/page.tsx"),
  choiceSrc: read("src/components/wallet/deposit-number-choice.tsx"),
  phoneSrc: read("src/components/ui/phone-input.tsx"),
};

const accepted = (v: string) => tzPhone.safeParse(v).success;

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (!cond) failed.push(label);
    log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
  };

  // ── §1 every spelling → nine digits the server accepts ──────────────────────
  const spellings: Array<[string, string]> = [
    ["1.1", "0712 345 678"],
    ["1.2", "0712345678"],
    ["1.3", "+255 712 345 678"],
    ["1.4", "255712345678"],
    ["1.5", "00255 712 345 678"],
    ["1.6", "712 345 678"],
    ["1.7", "+255 0712 345 678"],
  ];
  for (const [n, typed] of spellings) {
    const box = impl.boxRule(typed);
    ok(`${n} "${typed}" becomes 712345678 in the box, and the server accepts it`, box === "712345678" && accepted(box), `box=${box}`);
  }
  ok("1.8 a Halotel/Yas 6-number reads whole too", impl.boxRule("0621 234 567") === "621234567" && accepted("621234567"));
  const oldCut = "0712 345 678".replace(/\D/g, "").slice(0, 9);
  ok("1.9 control: the old box's nine-character cut is a number the server refuses", oldCut === "071234567" && !accepted(oldCut), oldCut);

  // ── §2 the deposit page's number box is the kit PhoneInput ──────────────────
  const page = impl.pageSrc;
  const phoneEl = page.match(/<PhoneInput\b[^>]*\/>/)?.[0] ?? "";
  ok("2.1 the number box is the kit PhoneInput, id and name msisdn",
    /\bid="msisdn"/.test(phoneEl) && /\bname="msisdn"/.test(phoneEl), phoneEl || "no <PhoneInput … /> on the page");
  ok("2.2 it opens on the shared prefill (the account's number, or what was submitted)", /defaultValue=\{prevMsisdn\}/.test(phoneEl));
  ok('2.3 no raw nine-character box remains (no maxLength={9}, no pattern="\\d{9}")',
    !/maxLength=\{9\}/.test(page) && !/pattern="\\d\{9\}"/.test(page));
  ok("2.4 the page imports the kit PhoneInput", /import \{ PhoneInput \} from "@\/components\/ui\/phone-input";/.test(page));
  ok("2.5 the label still names the box", /htmlFor="msisdn"/.test(page));

  // ── §3 the two buttons move the posted number too ────────────────────────────
  const c = impl.choiceSrc;
  ok("3.1 the buttons write through the input's NATIVE value setter",
    /Object\.getOwnPropertyDescriptor\(HTMLInputElement\.prototype, "value"\)\?\.set/.test(c) && /nativeSet\.call\(el, next\)/.test(c));
  ok("3.2 and announce it with a bubbling input event", /dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/.test(c));
  ok("3.3 the plain assignment survives only as the no-setter fallback", !/el\.value = other \?/.test(c) && /else el\.value = next;/.test(c));
  ok("3.4 they find the box by the id the page gives it", /getElementById\("msisdn"\)/.test(c));

  // ── §4 the PhoneInput posts the nine digits, from a hidden field ─────────────
  const p = impl.phoneSrc;
  ok("4.1 the nine digits travel in a hidden field under the caller's name",
    /\{name && <input type="hidden" name=\{name\} value=\{v\} \/>\}/.test(p));
  ok("4.2 the visible box carries no name (it would post the spaced \"712 345 678\")",
    /\{ defaultValue, value, onChange, name, onPasteRaw, \.\.\.rest \}/.test(p));
  return failed;
}

if (!PROVE_RED) {
  console.log("deposit-phone — the deposit's number box takes a number however it is written");
  const failed = run(REAL, console.log);
  console.log(`\nDEPOSIT PHONE — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed: ${failed.join(" | ")}`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  const OLD_BOX = `<Input id="msisdn" name="msisdn" type="tel" inputMode="numeric" pattern="\\d{9}" maxLength={9} placeholder="712 345 678" prefix="+255" mono defaultValue={prevMsisdn} />`;
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "the box keeps the leading 0 and cuts at nine (the old box)", expect: /^1\.1 /,
      impl: { ...REAL, boxRule: (r) => r.replace(/\D/g, "").slice(0, 9) } },
    { name: "the box does not take off +255", expect: /^1\.3 /,
      impl: { ...REAL, boxRule: (r) => r.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9) } },
    { name: "the box does not take off the IDD 00", expect: /^1\.5 /,
      impl: { ...REAL, boxRule: (r) => { let d = r.replace(/\D/g, ""); if (d.startsWith("255")) d = d.slice(3); return d.replace(/^0+/, "").slice(0, 9); } } },
    { name: "the deposit page goes back to the raw nine-character box", expect: /^2\.1 /,
      impl: { ...REAL, pageSrc: REAL.pageSrc.replace(/<PhoneInput\b[^>]*\/>/, OLD_BOX) } },
    { name: "the raw box's cap comes back beside the PhoneInput", expect: /^2\.3 /,
      impl: { ...REAL, pageSrc: REAL.pageSrc.replace("<PhoneInput", "<PhoneInput maxLength={9}") } },
    { name: "the buttons assign el.value again (the posted number would not follow)", expect: /^3\.1 /,
      impl: { ...REAL, choiceSrc: REAL.choiceSrc.replace(/if \(nativeSet\) nativeSet\.call\(el, next\);\s*else el\.value = next;/, 'el.value = other ? "" : registered;') } },
    { name: "the PhoneInput drops its hidden field", expect: /^4\.1 /,
      impl: { ...REAL, phoneSrc: REAL.phoneSrc.replace("{name && <input type=\"hidden\" name={name} value={v} />}", "") } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL rule, page and buttons pass every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
