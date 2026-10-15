/** Source contract for the five account/KYC touch targets and the existing Switch reach.
 * The browser still has to measure the rendered boxes at 320/360/390 before release.
 * `node scripts/profile-touch.test.mjs --prove-red` mutates each contract in memory. */
import { readFileSync } from "node:fs";

const sources = Object.fromEntries([
  "src/app/globals.css",
  "src/components/profile/email-editor.tsx",
  "src/components/profile/password-section.tsx",
  "src/app/profile/account/privacy-request-form.tsx",
  "src/app/profile/kyc/page.tsx",
  "src/components/settings/feedback-settings.tsx",
].map(path => [path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8")]));

const css = "src/app/globals.css";
const email = "src/components/profile/email-editor.tsx";
const password = "src/components/profile/password-section.tsx";
const privacy = "src/app/profile/account/privacy-request-form.tsx";
const kyc = "src/app/profile/kyc/page.tsx";
const feedback = "src/components/settings/feedback-settings.tsx";
const floor = "min-h-[var(--tap-min)]";

function verdicts(s) {
  const emailTrigger = s[email].match(/<button ref=\{triggerRef\} type="button" onClick=\{open\} className="([^"]+)"/s)?.[1] ?? "";
  const passwordTrigger = s[password].match(/<button\s+type="button"\s+onClick=\{\(\) => setOpen\(true\)\}\s+className="([^"]+)"/s)?.[1] ?? "";
  const radioLabel = s[privacy].match(/<label\s+key=\{value\}\s+className=\{\[\s*"([^"]+)"/s)?.[1] ?? "";
  const radio = s[privacy].match(/<input\s+type="radio"[\s\S]*?className="([^"]+)"/s)?.[1] ?? "";
  const back = s[kyc].match(/<Link\s+href=\{journey \? "\/account" : "\/profile"\}\s+className="([^"]+)"/s)?.[1] ?? "";
  const wallet = s[kyc].match(/<Link\s+href="\/wallet"\s+[\s\S]*?className="([^"]+)"/s)?.[1] ?? "";
  const switchReach = s[css].match(/\.toggle-switch::after\s*\{([^}]+)\}/s)?.[1] ?? "";
  return {
    "token is 40px": /--tap-min:\s*40px\s*;/.test(s[css]),
    "email edit button has an in-flow 40px hit box": emailTrigger.includes(floor) && emailTrigger.includes("inline-flex"),
    "password edit button has an in-flow 40px hit box": passwordTrigger.includes(floor) && !passwordTrigger.includes("h-[30px]"),
    "privacy choice label is at least 40px": radioLabel.includes(floor) && radioLabel.includes("relative") && radioLabel.includes("inline-flex"),
    "privacy native radio fills its hit box": ["peer", "absolute", "inset-0", "h-full", "w-full", "opacity-0"].every(token => radio.split(/\s+/).includes(token)) && s[privacy].includes('onChange={() => { setKind(value); setSent(false); }}'),
    "privacy radio has a visible keyboard focus cue": s[privacy].includes("peer-focus-visible:outline-2") && s[privacy].includes("aria-hidden=\"true\"") && s[privacy].includes("kind === value && <span"),
    "KYC profile link has an in-flow 40px hit box": back.includes(floor) && back.includes("inline-flex"),
    "KYC wallet link has an in-flow 40px hit box": wallet.includes(floor) && wallet.includes("inline-flex"),
    "feedback Switch keeps its existing 40px pseudo hit box": /height:\s*var\(--tap-min\)\s*;/.test(switchReach) && /left:\s*0\s*;/.test(switchReach) && /right:\s*0\s*;/.test(switchReach) && s[feedback].includes('<Toggle on={on} onClick={onToggle} aria-label={title} />'),
  };
}

const green = verdicts(sources);
for (const [label, pass] of Object.entries(green)) if (!pass) console.error(`FAIL ${label}`);
if (Object.values(green).some(pass => !pass)) process.exit(1);

if (process.argv.includes("--prove-red")) {
  const plants = [
    [email, floor, "", "email edit button has an in-flow 40px hit box"],
    [password, floor, "", "password edit button has an in-flow 40px hit box"],
    [privacy, `relative inline-flex ${floor}`, "relative inline-flex", "privacy choice label is at least 40px"],
    [privacy, "peer absolute inset-0 h-full w-full cursor-pointer opacity-0", "peer absolute inset-0 h-full cursor-pointer opacity-0", "privacy native radio fills its hit box"],
    [privacy, "peer-focus-visible:outline-2", "", "privacy radio has a visible keyboard focus cue"],
    [kyc, `className="inline-flex ${floor} items-center gap-1.5 font-mono`, 'className="inline-flex items-center gap-1.5 font-mono', "KYC profile link has an in-flow 40px hit box"],
    [kyc, `className="inline-flex ${floor} items-center gap-1.5 font-display`, 'className="inline-flex items-center gap-1.5 font-display', "KYC wallet link has an in-flow 40px hit box"],
    [css, ".toggle-switch::after {", ".toggle-switch::before {", "feedback Switch keeps its existing 40px pseudo hit box"],
  ];
  for (const [file, before, after, expected] of plants) {
    if (sources[file].split(before).length !== 2) throw new Error(`Plant anchor absent/ambiguous: ${file} ${before}`);
    const planted = { ...sources, [file]: sources[file].replace(before, after) };
    const red = Object.entries(verdicts(planted)).filter(([, pass]) => !pass).map(([label]) => label);
    if (red.length !== 1 || red[0] !== expected) throw new Error(`Plant did not isolate ${expected}: ${red.join(", ")}`);
    console.log(`RED ${expected}`);
  }
  console.log(`profile-touch: ${Object.keys(green).length} green, ${plants.length} in-memory red plants`);
} else console.log(`profile-touch: ${Object.keys(green).length} green`);
