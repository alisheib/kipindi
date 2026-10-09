// R5-L · sha-256 of every changed or new file in the worktree (to prove a red script restored what it planted).
const { execSync } = require("child_process"); const fs = require("fs"); const crypto = require("crypto");
const files = execSync("git -C F:/kipindi-r5l status --porcelain", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean)
  .filter((l) => !l.startsWith(" D")).map((l) => l.slice(3).replace(/^"|"$/g, ""));
const out = files.map((f) => `${crypto.createHash("sha256").update(fs.readFileSync("F:/kipindi-r5l/" + f)).digest("hex").slice(0, 16)}  ${f}`);
console.log(out.join("\n"));
