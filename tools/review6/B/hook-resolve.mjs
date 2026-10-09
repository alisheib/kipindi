// Resolve hook (review 6, reviewer B): the two money confirms — today's and 118fc75c's — import `Modal` from
// "@/components/ui/modal"; for them only, that import is answered by `modal-shim.tsx`, which draws the panel's content
// synchronously (the real Modal draws nothing on a server: it waits for a mount effect and a portal). The 118fc75c copies
// live in this folder, so their one relative import ("./house-lean-warning") is pointed back at the repo, and every bare
// or "@/" import made from this folder is resolved as if it were made from inside the repo (node_modules, tsconfig paths).
// tsx may already have turned the "@/" alias into a file URL before this hook sees it, so both spellings are matched.
const SHIM = new URL("./modal-shim.tsx", import.meta.url).href;
const HERE = new URL("./", import.meta.url).href.toLowerCase();
const REPO_PARENT = "file:///F:/kipindi-rev/src/components/markets/sell-confirm-modal.tsx";
const CONFIRM = /(sell|bet)-confirm-modal(\.old)?\.tsx$/;
const MODAL = /^@\/components\/ui\/modal$|\/src\/components\/ui\/modal(\.tsx)?$/;
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? "";
  if (MODAL.test(specifier) && CONFIRM.test(parent)) return { url: SHIM, shortCircuit: true };
  const fromHere = parent.toLowerCase().startsWith(HERE);
  if (fromHere && /\.old\.tsx$/.test(parent) && specifier.startsWith("./")) {
    return nextResolve(`file:///F:/kipindi-rev/src/components/markets/${specifier.slice(2)}.tsx`, context);
  }
  if (fromHere && !specifier.startsWith(".") && !specifier.startsWith("file:") && !specifier.startsWith("node:")) {
    return nextResolve(specifier, { ...context, parentURL: REPO_PARENT });
  }
  return nextResolve(specifier, context);
}
