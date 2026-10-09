// Load keepNameEnd's CHARACTER pattern from a keep-words.tsx source (default: the worktree), by evaluating its block.
import { readFileSync } from "node:fs";
export function loadCharacter(path = "F:/kipindi-r5e/src/components/ui/keep-words.tsx"): RegExp {
  const src = readFileSync(path, "utf8");
  const from = src.indexOf("const PREPEND");
  const to = src.indexOf("const NAME_GAP");
  if (from < 0 || to < 0) throw new Error("block not found");
  return new Function(`${src.slice(from, to)}; return CHARACTER;`)() as RegExp;
}
