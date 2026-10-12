// Throwaway resolve hook: "playwright" → the stub beside this file.
export async function resolve(specifier, context, next) {
  if (specifier === "playwright") return { url: new URL("./stub-playwright.mjs", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
